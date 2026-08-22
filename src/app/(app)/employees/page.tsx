import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SearchInput } from "@/components/search-input";
import { Avatar, EmptyState, StatusDot } from "@/components/ui";
import { isManager, requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; denied?: string }>;
}) {
  const { q, denied } = await searchParams;
  const user = await requireUser();
  const manager = isManager(user.role);

  const employees = await db.employee.findMany({
    where: {
      companyId: user.companyId,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { jobPosition: { contains: q } },
              { department: { contains: q } },
              { loginId: { contains: q.toUpperCase() } },
              { email: { contains: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { firstName: "asc" }],
  });

  const attendance = await db.attendance.findMany({
    where: { date: dayKey(new Date()), employeeId: { in: employees.map((e) => e.id) } },
    select: { employeeId: true, status: true, checkIn: true, checkOut: true },
  });

  const statusOf = new Map(
    attendance.map((row) => [
      row.employeeId,
      row.status === "LEAVE" ? "LEAVE" : row.checkIn && !row.checkOut ? "PRESENT" : row.status,
    ]),
  );

  return (
    <div className="flex flex-col gap-5">
      {denied ? (
        <p className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          That area is limited to administrators and HR officers.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Employees</h1>
          <p className="text-sm text-ink-500">
            {employees.length} {employees.length === 1 ? "person" : "people"} at {user.company.name}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-end gap-3">
          <Suspense fallback={<div className="h-9 w-full max-w-sm rounded-md bg-ink-100" />}>
            <SearchInput placeholder="Search by name, role or Login ID" />
          </Suspense>
          {manager ? (
            <Link href="/employees/new" className="btn-primary shrink-0">
              New
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-present" /> In the office
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot status="LEAVE" /> On leave
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-absent" /> Absent
        </span>
      </div>

      {employees.length === 0 ? (
        <EmptyState
          title={q ? "No matches" : "No employees yet"}
          description={
            q
              ? "Try a different name, job position or Login ID."
              : "Add your first employee and Dayflow will issue their Login ID and first password."
          }
          action={manager && !q ? <Link href="/employees/new" className="btn-primary">Add an employee</Link> : null}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {employees.map((employee) => (
            <li key={employee.id}>
              <Link
                href={`/employees/${employee.id}`}
                className="card group flex h-full gap-3 p-4 transition hover:border-brand-300 hover:shadow-md hover:shadow-brand-900/5"
              >
                <Avatar src={employee.avatar} name={`${employee.firstName} ${employee.lastName}`} size={48} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900 group-hover:text-brand-700">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <StatusDot status={statusOf.get(employee.id) ?? "ABSENT"} />
                  </div>
                  <p className="truncate text-xs text-ink-500">{employee.jobPosition || "—"}</p>
                  <p className="truncate text-xs text-ink-400">{employee.department || employee.email}</p>
                  <p className="mono mt-2 text-[11px] text-brand-600">{employee.loginId}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
