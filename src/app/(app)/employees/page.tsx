import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SearchInput } from "@/components/search-input";
import { Avatar, EmptyState } from "@/components/ui";
import { isManager, requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; denied?: string; status?: string; view?: string }>;
}) {
  const { q, denied, status = "ALL", view = "grid" } = await searchParams;
  const user = await requireUser();
  const manager = isManager(user.role);

  // Fetch all company employees to compute total statistics
  const allCompanyEmployees = await db.employee.findMany({
    where: { companyId: user.companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      jobPosition: true,
      department: true,
      loginId: true,
      email: true,
      role: true,
      status: true,
      avatar: true,
      mobile: true,
      location: true,
    },
    orderBy: [{ status: "asc" }, { firstName: "asc" }],
  });

  // Fetch today's attendance for status calculation
  const attendance = await db.attendance.findMany({
    where: {
      date: dayKey(new Date()),
      employeeId: { in: allCompanyEmployees.map((e) => e.id) },
    },
    select: { employeeId: true, status: true, checkIn: true, checkOut: true },
  });

  const statusOf = new Map<string, "PRESENT" | "LEAVE" | "ABSENT" | "HALF_DAY">(
    allCompanyEmployees.map((emp) => {
      const row = attendance.find((a) => a.employeeId === emp.id);
      if (!row) return [emp.id, "ABSENT"];
      if (row.status === "LEAVE") return [emp.id, "LEAVE"];
      if (row.checkIn && !row.checkOut) return [emp.id, "PRESENT"];
      return [emp.id, (row.status as "PRESENT" | "LEAVE" | "ABSENT" | "HALF_DAY") || "ABSENT"];
    })
  );

  // Compute metrics
  const totalEmployees = allCompanyEmployees.length;
  let inOfficeCount = 0;
  let onLeaveCount = 0;
  let absentCount = 0;

  allCompanyEmployees.forEach((emp) => {
    const st = statusOf.get(emp.id);
    if (st === "PRESENT" || st === "HALF_DAY") inOfficeCount++;
    else if (st === "LEAVE") onLeaveCount++;
    else absentCount++;
  });

  // Filter employees based on search query `q` and status filter `status`
  const employees = allCompanyEmployees.filter((emp) => {
    const empStatus = statusOf.get(emp.id) || "ABSENT";

    // Status filter
    if (status === "PRESENT" && empStatus !== "PRESENT" && empStatus !== "HALF_DAY") return false;
    if (status === "LEAVE" && empStatus !== "LEAVE") return false;
    if (status === "ABSENT" && empStatus !== "ABSENT") return false;

    // Search query filter
    if (q) {
      const query = q.toLowerCase();
      const matchName = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(query);
      const matchPosition = emp.jobPosition?.toLowerCase().includes(query);
      const matchDept = emp.department?.toLowerCase().includes(query);
      const matchLogin = emp.loginId.toLowerCase().includes(query);
      const matchEmail = emp.email.toLowerCase().includes(query);
      return matchName || matchPosition || matchDept || matchLogin || matchEmail;
    }

    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {denied ? (
        <div className="flex items-center gap-2 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm font-medium text-danger shadow-xs">
          <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" className="shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <span>That area is limited to administrators and HR officers.</span>
        </div>
      ) : null}

      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Employee Directory</h1>
            <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {totalEmployees} {totalEmployees === 1 ? "Member" : "Members"}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Manage roles, view attendance status, and explore team profiles for <strong className="font-semibold text-ink-700">{user.company.name}</strong>
          </p>
        </div>

        {manager ? (
          <Link
            href="/employees/new"
            className="btn-primary inline-flex items-center gap-2 shadow-xs transition-transform active:scale-[0.98]"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Employee
          </Link>
        ) : null}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="card relative overflow-hidden p-4 transition-all hover:border-ink-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Team</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
                <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-.572zM14.5 16h-.187.002c.322-.452.544-.96.643-1.5a4.5 4.5 0 00-7.858-3.003c.277-.04.558-.06.843-.06a7.5 7.5 0 016.92 4.563h-.363z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-900 num">{totalEmployees}</span>
            <span className="text-xs text-ink-500">active roster</span>
          </div>
        </div>

        <div className="card relative overflow-hidden p-4 transition-all hover:border-present/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-present">In Office</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-present-soft text-present">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-900 num">{inOfficeCount}</span>
            <span className="text-xs font-medium text-present">
              {totalEmployees ? Math.round((inOfficeCount / totalEmployees) * 100) : 0}% present
            </span>
          </div>
        </div>

        <div className="card relative overflow-hidden p-4 transition-all hover:border-leave/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-leave">On Leave</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-leave-soft text-leave">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-900 num">{onLeaveCount}</span>
            <span className="text-xs text-ink-500">approved leave</span>
          </div>
        </div>

        <div className="card relative overflow-hidden p-4 transition-all hover:border-absent/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-absent">Absent</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-absent-soft text-absent">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-900 num">{absentCount}</span>
            <span className="text-xs text-ink-500">not checked in</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "ALL" }).toString()}`}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              status === "ALL"
                ? "bg-brand-600 font-semibold text-white shadow-xs"
                : "bg-surface text-ink-600 hover:bg-ink-100"
            }`}
          >
            All ({totalEmployees})
          </Link>
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "PRESENT" }).toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              status === "PRESENT"
                ? "bg-present font-semibold text-white shadow-xs"
                : "bg-surface text-ink-600 hover:bg-present-soft hover:text-present"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "PRESENT" ? "bg-white" : "bg-present"}`} />
            In Office ({inOfficeCount})
          </Link>
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "LEAVE" }).toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              status === "LEAVE"
                ? "bg-leave font-semibold text-white shadow-xs"
                : "bg-surface text-ink-600 hover:bg-leave-soft hover:text-leave"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "LEAVE" ? "bg-white" : "bg-leave"}`} />
            On Leave ({onLeaveCount})
          </Link>
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "ABSENT" }).toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              status === "ABSENT"
                ? "bg-absent font-semibold text-white shadow-xs"
                : "bg-surface text-ink-600 hover:bg-absent-soft hover:text-absent"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "ABSENT" ? "bg-white" : "bg-absent"}`} />
            Absent ({absentCount})
          </Link>
        </div>

        {/* Search & View Toggle */}
        <div className="flex flex-1 items-center justify-end gap-2.5 min-w-[260px]">
          <Suspense fallback={<div className="h-9 w-full max-w-sm rounded-md bg-ink-100" />}>
            <SearchInput placeholder="Search by name, position or ID..." />
          </Suspense>

          <div className="flex items-center rounded-md border border-line bg-ink-100/60 p-0.5">
            <Link
              href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), status, view: "grid" }).toString()}`}
              title="Grid View"
              className={`rounded p-1.5 transition-colors ${
                view === "grid" ? "bg-surface text-brand-600 shadow-xs" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), status, view: "table" }).toString()}`}
              title="Table View"
              className={`rounded p-1.5 transition-colors ${
                view === "table" ? "bg-surface text-brand-600 shadow-xs" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0-5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {employees.length === 0 ? (
        <EmptyState
          title={q || status !== "ALL" ? "No matching employees" : "No employees added yet"}
          description={
            q || status !== "ALL"
              ? "Try adjusting your search keywords or switching filters to see more results."
              : "Add your first employee to Dayflow to start managing profiles, attendance, and leave."
          }
          action={
            manager && !q && status === "ALL" ? (
              <Link href="/employees/new" className="btn-primary">
                Add an employee
              </Link>
            ) : (
              <Link href="/employees" className="btn-secondary">
                Clear Filters
              </Link>
            )
          }
        />
      ) : view === "table" ? (
        /* Table View */
        <div className="table-wrap border border-line shadow-xs">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Login ID</th>
                <th>Department & Position</th>
                <th>Role</th>
                <th>Today's Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const st = statusOf.get(employee.id) ?? "ABSENT";
                return (
                  <tr key={employee.id} className="group">
                    <td>
                      <Link href={`/employees/${employee.id}`} className="flex items-center gap-3">
                        <Avatar src={employee.avatar} name={`${employee.firstName} ${employee.lastName}`} size={36} />
                        <div>
                          <p className="font-semibold text-ink-900 group-hover:text-brand-600 transition-colors">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-xs text-ink-400">{employee.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className="mono rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 border border-brand-200">
                        {employee.loginId}
                      </span>
                    </td>
                    <td>
                      <p className="text-xs font-medium text-ink-800">{employee.jobPosition || "—"}</p>
                      <p className="text-[11px] text-ink-500">{employee.department || "General"}</p>
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          employee.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : employee.role === "HR"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-ink-100 text-ink-700"
                        }`}
                      >
                        {employee.role}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          st === "PRESENT" || st === "HALF_DAY"
                            ? "bg-present-soft text-present"
                            : st === "LEAVE"
                            ? "bg-leave-soft text-leave"
                            : "bg-absent-soft text-absent"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            st === "PRESENT" || st === "HALF_DAY"
                              ? "bg-present"
                              : st === "LEAVE"
                              ? "bg-leave"
                              : "bg-absent"
                          }`}
                        />
                        {st === "PRESENT" ? "In Office" : st === "HALF_DAY" ? "Half Day" : st === "LEAVE" ? "On Leave" : "Absent"}
                      </span>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/employees/${employee.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:underline"
                      >
                        View Profile
                        <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {employees.map((employee) => {
            const st = statusOf.get(employee.id) ?? "ABSENT";
            const isPresent = st === "PRESENT" || st === "HALF_DAY";
            const isLeave = st === "LEAVE";

            const borderAccent = isPresent
              ? "border-t-present"
              : isLeave
              ? "border-t-leave"
              : "border-t-absent";

            return (
              <li key={employee.id}>
                <Link
                  href={`/employees/${employee.id}`}
                  className={`card group relative flex flex-col justify-between overflow-hidden border-t-4 ${borderAccent} p-4 transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-md hover:shadow-brand-900/5 h-full`}
                >
                  <div>
                    {/* Top Row: Avatar + Role Badge + Status Indicator */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="relative">
                        <Avatar src={employee.avatar} name={`${employee.firstName} ${employee.lastName}`} size={52} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface ${
                            isPresent ? "bg-present" : isLeave ? "bg-leave" : "bg-absent"
                          }`}
                        />
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            employee.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800"
                              : employee.role === "HR"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          {employee.role}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            isPresent ? "text-present" : isLeave ? "text-leave" : "text-absent"
                          }`}
                        >
                          {isPresent ? "In Office" : isLeave ? "On Leave" : "Absent"}
                        </span>
                      </div>
                    </div>

                    {/* Employee Info */}
                    <div className="mt-3">
                      <h3 className="truncate text-base font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="truncate text-xs font-medium text-ink-600 mt-0.5">
                        {employee.jobPosition || "No Position Assigned"}
                      </p>
                      <p className="truncate text-xs text-ink-400">
                        {employee.department || "General Department"}
                      </p>
                    </div>
                  </div>

                  {/* Footer Info: Login ID & Email */}
                  <div className="mt-4 border-t border-line/60 pt-3 flex items-center justify-between gap-2">
                    <span className="mono rounded bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 border border-brand-200/80">
                      {employee.loginId}
                    </span>
                    <span className="truncate text-[11px] text-ink-400 max-w-[130px]" title={employee.email}>
                      {employee.email}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

