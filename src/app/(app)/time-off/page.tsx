import type { Metadata } from "next";
import Link from "next/link";

import { Avatar, EmptyState, LeaveChip } from "@/components/ui";
import { isManager, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { CancelButton, ReviewButtons } from "./review-buttons";
import { RequestLeaveButton, type LeaveTypeOption } from "./request-form";

export const metadata: Metadata = { title: "Time Off" };

export default async function TimeOffPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const user = await requireUser();
  const manager = isManager(user.role);
  const year = new Date().getFullYear();

  const [leaveTypes, balances, colleagues] = await Promise.all([
    db.leaveType.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } }),
    db.leaveBalance.findMany({ where: { employeeId: user.id, year } }),
    manager
      ? db.employee.findMany({
          where: { companyId: user.companyId, status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const balanceOf = new Map(balances.map((balance) => [balance.leaveTypeId, balance]));

  const options: LeaveTypeOption[] = leaveTypes.map((type) => {
    const balance = balanceOf.get(type.id);
    return {
      id: type.id,
      name: type.name,
      isPaid: type.isPaid,
      requiresAttachment: type.requiresAttachment,
      available: Math.max(0, (balance?.allocated ?? type.defaultDays) - (balance?.used ?? 0)),
    };
  });

  const filter = status?.toUpperCase();
  const requests = await db.leaveRequest.findMany({
    where: {
      ...(manager ? { employee: { companyId: user.companyId } } : { employeeId: user.id }),
      ...(filter && filter !== "ALL" ? { status: filter } : {}),
    },
    include: { employee: true, leaveType: true, reviewer: true },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    take: 100,
  });

  const pendingCount = await db.leaveRequest.count({
    where: { status: "PENDING", ...(manager ? { employee: { companyId: user.companyId } } : { employeeId: user.id }) },
  });

  const employeeOptions = manager
    ? colleagues.map((person) => ({ id: person.id, name: `${person.firstName} ${person.lastName}` }))
    : [{ id: user.id, name: `${user.firstName} ${user.lastName}` }];

  const filters = ["ALL", "PENDING", "APPROVED", "REJECTED"];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Time Off</h1>
          <p className="text-sm text-ink-500">
            {manager
              ? `Every request across ${user.company.name}. ${pendingCount} awaiting your decision.`
              : "Your requests and remaining allocation."}
          </p>
        </div>
        <RequestLeaveButton
          leaveTypes={options}
          employees={employeeOptions}
          defaultEmployeeId={user.id}
          canFileForOthers={manager}
        />
      </div>

      <section aria-label="Your allocation" className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <div key={option.id} className="card px-4 py-3">
            <p className="text-sm font-semibold text-brand-700">{option.name}</p>
            <p className="num mt-1 text-lg font-semibold text-ink-900">
              {option.isPaid ? `${option.available.toFixed(0)} Days Available` : "Unpaid"}
            </p>
            {option.isPaid ? (
              <p className="hint mt-0.5">
                {(balanceOf.get(option.id)?.used ?? 0).toFixed(0)} used of{" "}
                {(balanceOf.get(option.id)?.allocated ?? 0).toFixed(0)} allocated in {year}
              </p>
            ) : (
              <p className="hint mt-0.5">Does not consume a balance; the days are unpaid.</p>
            )}
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-1.5">
        {filters.map((value) => {
          const active = (filter ?? "ALL") === value;
          return (
            <Link
              key={value}
              href={value === "ALL" ? "/time-off" : `/time-off?status=${value.toLowerCase()}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                active ? "bg-brand-600 text-white" : "border border-line bg-surface text-ink-600 hover:bg-brand-50"
              }`}
            >
              {value.charAt(0) + value.slice(1).toLowerCase()}
            </Link>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="No requests"
          description={
            manager
              ? "Nothing to review under this filter."
              : "Use New to request paid, sick or unpaid time off."
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="grid-table min-w-[820px]">
            <thead>
              <tr>
                <th>{manager ? "Name" : "Requested"}</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Time Off Type</th>
                <th>Days</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    {manager ? (
                      <Link href={`/employees/${request.employeeId}`} className="flex items-center gap-2.5 hover:text-brand-700">
                        <Avatar
                          src={request.employee.avatar}
                          name={`${request.employee.firstName} ${request.employee.lastName}`}
                          size={28}
                        />
                        <span className="font-medium">
                          {request.employee.firstName} {request.employee.lastName}
                        </span>
                      </Link>
                    ) : (
                      <span className="num text-ink-500">{formatDate(request.createdAt)}</span>
                    )}
                  </td>
                  <td className="num">{formatDate(request.startDate)}</td>
                  <td className="num">{formatDate(request.endDate)}</td>
                  <td>
                    {request.leaveType.name}
                    {request.attachment ? <span className="ml-2 text-[11px] text-brand-600">certificate</span> : null}
                  </td>
                  <td className="num">{request.days}</td>
                  <td>
                    <LeaveChip status={request.status} />
                    {request.reviewComment ? (
                      <p className="mt-1 max-w-56 text-[11px] text-ink-500">
                        {request.reviewer ? `${request.reviewer.firstName}: ` : ""}
                        {request.reviewComment}
                      </p>
                    ) : null}
                    {request.remarks && !request.reviewComment ? (
                      <p className="mt-1 max-w-56 text-[11px] text-ink-400">{request.remarks}</p>
                    ) : null}
                  </td>
                  <td className="text-right">
                    {request.status === "PENDING" && manager ? (
                      <ReviewButtons requestId={request.id} />
                    ) : request.status === "PENDING" && request.employeeId === user.id ? (
                      <CancelButton requestId={request.id} />
                    ) : (
                      <span className="text-xs text-ink-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="hint">
        Approving a request writes the days onto the employee&apos;s attendance calendar and reduces their balance in the
        same transaction, so the two can never disagree.
      </p>
    </div>
  );
}
