import type { Metadata } from "next";
import Link from "next/link";

import { TimeOffLogo } from "@/components/brand-icons";
import { Avatar, EmptyState, LeaveChip } from "@/components/ui";
import { isManager, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { CancelButton, ReviewButtons } from "./review-buttons";
import { RequestLeaveButton, type LeaveTypeOption } from "./request-form";
import { AllocationForm } from "./allocation-form";
import { TimeOffCalendarView } from "./calendar-view";
import { HolidayManager } from "./holiday-manager";
import { EmployeeFilterSelect } from "./employee-filter-select";

export const metadata: Metadata = { title: "Time Off" };

type SearchParams = {
  tab?: string;
  view?: string;
  status?: string;
  empId?: string;
  page?: string;
};

export default async function TimeOffPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const user = await requireUser();
  const manager = isManager(user.role);
  const year = new Date().getFullYear();

  const activeTab = params.tab ?? "timeoff";
  const activeView = params.view ?? "table";
  const statusFilter = params.status?.toUpperCase();
  const selectedEmpId = params.empId;
  const page = parseInt(params.page ?? "1", 10);
  const pageSize = 20;

  const [leaveTypes, balances, colleagues, publicHolidays] = await Promise.all([
    db.leaveType.findMany({ where: { companyId: user.companyId }, orderBy: { name: "asc" } }),
    db.leaveBalance.findMany({ where: { employeeId: user.id, year } }),
    manager
      ? db.employee.findMany({
          where: { companyId: user.companyId, status: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
    // L10 — company public holidays, newest first.
    db.publicHoliday.findMany({
      where: { companyId: user.companyId },
      orderBy: { date: "asc" },
    }),
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

  const filterWhere = {
    ...(manager
      ? { employee: { companyId: user.companyId }, ...(selectedEmpId ? { employeeId: selectedEmpId } : {}) }
      : { employeeId: user.id }),
    ...(statusFilter && statusFilter !== "ALL" ? { status: statusFilter } : {}),
  };

  const [totalRequests, requests] = await Promise.all([
    db.leaveRequest.count({ where: filterWhere }),
    db.leaveRequest.findMany({
      where: filterWhere,
      include: { employee: true, leaveType: true, reviewer: true },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalPages = Math.ceil(totalRequests / pageSize);

  const pendingCount = await db.leaveRequest.count({
    where: { status: "PENDING", ...(manager ? { employee: { companyId: user.companyId } } : { employeeId: user.id }) },
  });

  const employeeOptions = manager
    ? colleagues.map((person) => ({ id: person.id, name: `${person.firstName} ${person.lastName}` }))
    : [{ id: user.id, name: `${user.firstName} ${user.lastName}` }];

  const filters = ["ALL", "PENDING", "APPROVED", "REJECTED"];

  const calendarItems = requests.map((req) => ({
    id: req.id,
    employeeId: req.employeeId,
    employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
    startDate: req.startDate,
    endDate: req.endDate,
    leaveTypeName: req.leaveType.name,
    status: req.status,
    colour: req.leaveType.colour || "#7A3E8F",
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <TimeOffLogo size={36} className="shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-ink-900 tracking-tight">Time Off</h1>
            <p className="text-sm text-ink-500">
              {manager
                ? `Every request across ${user.company.name}. ${pendingCount} awaiting your decision.`
                : "Your requests and remaining allocation."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin / HR Tab Navigation: Time Off vs Allocation */}
          {manager ? (
            <div className="flex rounded-xl border border-line bg-surface p-1 text-xs shadow-2xs">
              <Link
                href={`/time-off?tab=timeoff&view=${activeView}`}
                className={`rounded-lg px-3.5 py-1.5 font-semibold transition ${
                  activeTab === "timeoff"
                    ? "bg-brand-600 text-white shadow-2xs"
                    : "text-ink-600 hover:bg-brand-50/60 hover:text-brand-700"
                }`}
              >
                Time Off
              </Link>
              <Link
                href="/time-off?tab=allocation"
                className={`rounded-lg px-3.5 py-1.5 font-semibold transition ${
                  activeTab === "allocation"
                    ? "bg-brand-600 text-white shadow-2xs"
                    : "text-ink-600 hover:bg-brand-50/60 hover:text-brand-700"
                }`}
              >
                Allocation
              </Link>
            </div>
          ) : null}

          {/* View Toggle: Table View vs Calendar View */}
          {activeTab === "timeoff" ? (
            <div className="flex rounded-xl border border-line bg-surface p-1 text-xs shadow-2xs">
              <Link
                href={`/time-off?tab=timeoff&view=table${statusFilter ? `&status=${statusFilter.toLowerCase()}` : ""}`}
                className={`rounded-lg px-3.5 py-1.5 font-semibold transition ${
                  activeView === "table"
                    ? "bg-brand-600 text-white shadow-2xs"
                    : "text-ink-600 hover:bg-brand-50/60 hover:text-brand-700"
                }`}
              >
                Table View
              </Link>
              <Link
                href={`/time-off?tab=timeoff&view=calendar${statusFilter ? `&status=${statusFilter.toLowerCase()}` : ""}`}
                className={`rounded-lg px-3.5 py-1.5 font-semibold transition ${
                  activeView === "calendar"
                    ? "bg-brand-600 text-white shadow-2xs"
                    : "text-ink-600 hover:bg-brand-50/60 hover:text-brand-700"
                }`}
              >
                Calendar View
              </Link>
            </div>
          ) : null}

          {user.role !== "ADMIN" ? (
            <RequestLeaveButton
              leaveTypes={options}
              employees={employeeOptions}
              defaultEmployeeId={user.id}
              canFileForOthers={manager}
              publicHolidayDates={publicHolidays.map((h) => h.date.toISOString().slice(0, 10))}
            />
          ) : null}
        </div>
      </div>

      {/* Allocation Management Tab for Admin/HR (L7) */}
      {activeTab === "allocation" && manager ? (
        <div className="flex flex-col gap-6">
          <AllocationForm
            employees={colleagues.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))}
            leaveTypes={leaveTypes.map((t) => ({ id: t.id, name: t.name }))}
          />
          <HolidayManager
            holidays={publicHolidays.map((h) => ({ id: h.id, name: h.name, date: h.date, isRecurring: h.isRecurring }))}
            isHR={manager}
          />
        </div>
      ) : (
        <>
          {/* Allocation Cards Header */}
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

          {/* Status & Employee Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {filters.map((value) => {
                const active = (statusFilter ?? "ALL") === value;
                return (
                  <Link
                    key={value}
                    href={`/time-off?tab=timeoff&view=${activeView}${value === "ALL" ? "" : `&status=${value.toLowerCase()}`}${selectedEmpId ? `&empId=${selectedEmpId}` : ""}`}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active ? "bg-brand-600 text-white" : "border border-line bg-surface text-ink-600 hover:bg-brand-50"
                    }`}
                  >
                    {value.charAt(0) + value.slice(1).toLowerCase()}
                  </Link>
                );
              })}
            </div>

            {manager ? (
              <EmployeeFilterSelect
                employees={employeeOptions}
                selectedEmpId={selectedEmpId}
              />
            ) : null}
          </div>

          {/* Render Calendar View or Table View */}
          {activeView === "calendar" ? (
            <TimeOffCalendarView
              requests={calendarItems}
              publicHolidays={publicHolidays.map((h) => ({ id: h.id, name: h.name, date: h.date }))}
            />
          ) : requests.length === 0 ? (
            <EmptyState
              title="No requests"
              description={
                manager ? "Nothing to review under this filter." : "Use New to request paid, sick or unpaid time off."
              }
            />
          ) : (
            <div className="table-wrap flex flex-col gap-3">
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
                        {request.attachment ? (
                          <a
                            href={request.attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 hover:underline"
                            title="View uploaded certificate"
                          >
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Certificate
                          </a>
                        ) : null}
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
                        {request.status === "PENDING" && request.employee.role === "HR" && user.role !== "ADMIN" ? (
                          <span className="inline-flex rounded bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                            Sent to Admin for Review
                          </span>
                        ) : request.status === "PENDING" && manager ? (
                          <ReviewButtons requestId={request.id} />
                        ) : request.status === "PENDING" && request.employeeId === user.id ? (
                          <CancelButton requestId={request.id} />
                        ) : request.status === "APPROVED" && (manager || request.employeeId === user.id) ? (
                          <CancelButton requestId={request.id} />
                        ) : (
                          <span className="text-xs text-ink-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 ? (
                <div className="flex items-center justify-between px-2 py-2 text-xs text-ink-600 border-t border-line">
                  <span>
                    Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalRequests)} of {totalRequests}
                  </span>
                  <div className="flex items-center gap-2">
                    {page > 1 ? (
                      <Link
                        href={`/time-off?tab=${activeTab}&view=${activeView}&page=${page - 1}${statusFilter ? `&status=${statusFilter.toLowerCase()}` : ""}`}
                        className="btn-secondary btn-sm"
                      >
                        Previous
                      </Link>
                    ) : null}
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    {page < totalPages ? (
                      <Link
                        href={`/time-off?tab=${activeTab}&view=${activeView}&page=${page + 1}${statusFilter ? `&status=${statusFilter.toLowerCase()}` : ""}`}
                        className="btn-secondary btn-sm"
                      >
                        Next
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      <p className="hint">
        Approving a request writes the days onto the employee&apos;s attendance calendar and reduces their balance in the
        same transaction, so the two can never disagree.
      </p>
    </div>
  );
}
