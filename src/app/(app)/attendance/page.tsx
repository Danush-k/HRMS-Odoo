import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AttendanceLogo } from "@/components/brand-icons";
import { PeriodNav } from "@/components/period-nav";
import { SearchInput } from "@/components/search-input";
import { AttendanceChip, Avatar, EmptyState } from "@/components/ui";
import { EditAttendanceModal } from "./edit-attendance-modal";
import { EmployeeAttendanceCalendar } from "./calendar-view";
import { STANDARD_WORK_HOURS, extraMinutes } from "@/lib/attendance";
import { isManager, requireUser } from "@/lib/auth";
import {
  addDays,
  endOfMonth,
  formatDate,
  formatDuration,
  formatLongDate,
  formatTime,
  isoDay,
  parseDay,
  parseMonth,
  startOfMonth,
  workingDaysInMonth,
} from "@/lib/dates";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Attendance" };

type Search = { view?: string; date?: string; month?: string; week?: string; q?: string; display?: string };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const user = await requireUser();
  const manager = isManager(user.role);
  const currentView = params.view ?? (manager ? "day" : "me");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <AttendanceLogo size={36} className="shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-ink-900 tracking-tight">Attendance</h1>
            <p className="text-sm text-ink-500">
              {currentView === "week"
                ? "Weekly team attendance matrix."
                : currentView === "day"
                  ? "Daily check-in and check-out logs for all employees."
                  : "Your day-by-day attendance record."}
            </p>
          </div>
        </div>

        <div className="flex rounded-xl border border-line bg-surface p-1 text-xs shadow-2xs">
          {manager ? (
            <>
              <Link
                href="/attendance?view=day"
                className={`rounded-lg px-3.5 py-1.5 font-semibold transition ${
                  currentView === "day"
                    ? "bg-brand-600 text-white shadow-2xs"
                    : "text-ink-600 hover:bg-brand-50/60 hover:text-brand-700"
                }`}
              >
                Daily View
              </Link>
              <Link
                href="/attendance?view=week"
                className={`rounded-lg px-3.5 py-1.5 font-semibold transition ${
                  currentView === "week"
                    ? "bg-brand-600 text-white shadow-2xs"
                    : "text-ink-600 hover:bg-brand-50/60 hover:text-brand-700"
                }`}
              >
                Weekly View
              </Link>
            </>
          ) : null}
          <Link
            href="/attendance?view=me"
            className={`rounded-lg px-3.5 py-1.5 font-semibold transition ${
              currentView === "me"
                ? "bg-brand-600 text-white shadow-2xs"
                : "text-ink-600 hover:bg-brand-50/60 hover:text-brand-700"
            }`}
          >
            My Attendance
          </Link>
        </div>
      </div>

      {currentView === "week" && manager ? (
        <TeamWeek params={params} companyId={user.companyId} />
      ) : currentView === "day" && manager ? (
        <TeamDay params={params} companyId={user.companyId} />
      ) : (
        <MyMonth params={params} employeeId={user.id} />
      )}
    </div>
  );
}

async function TeamWeek({ params, companyId }: { params: Search; companyId: string }) {
  const refDate = parseDay(params.week ?? params.date);
  // Get Monday of current week
  const dayOfWeek = refDate.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const monday = addDays(refDate, diffToMonday);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sunday = weekDays[6]!;

  const q = params.q?.trim();
  const employees = await db.employee.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { loginId: { contains: q.toUpperCase() } }] } : {}),
    },
    orderBy: { firstName: "asc" },
  });

  const rows = await db.attendance.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      date: { gte: monday, lte: sunday },
    },
  });

  // Map employeeId -> isoDay -> attendance row
  const matrix = new Map<string, Map<string, (typeof rows)[number]>>();
  for (const row of rows) {
    const key = isoDay(row.date);
    if (!matrix.has(row.employeeId)) matrix.set(row.employeeId, new Map());
    matrix.get(row.employeeId)!.set(key, row);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={<div className="h-9 w-48 rounded-md bg-ink-100" />}>
          <PeriodNav value={isoDay(monday)} type="date" paramName="week" />
        </Suspense>
        <Suspense fallback={<div className="h-9 w-full max-w-sm rounded-md bg-ink-100" />}>
          <SearchInput placeholder="Search employees" />
        </Suspense>
      </div>

      <p className="text-xs text-ink-500 font-medium">
        Week of {formatLongDate(monday)} — {formatLongDate(sunday)}
      </p>

      {employees.length === 0 ? (
        <EmptyState title="No employees" description="Add employees before attendance can be recorded." />
      ) : (
        <div className="table-wrap overflow-x-auto">
          <table className="grid-table min-w-full text-xs">
            <thead>
              <tr>
                <th className="min-w-[160px]">Employee</th>
                {weekDays.map((d) => (
                  <th key={isoDay(d)} className="text-center">
                    <span className="block font-semibold">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span className="mono text-[10px] text-ink-400">{d.getDate()}</span>
                  </th>
                ))}
                <th className="text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const empMap = matrix.get(employee.id);
                let totalMinutes = 0;

                return (
                  <tr key={employee.id}>
                    <td>
                      <Link href={`/employees/${employee.id}`} className="flex items-center gap-2 hover:text-brand-700">
                        <Avatar src={employee.avatar} name={`${employee.firstName} ${employee.lastName}`} size={24} />
                        <span className="truncate font-medium">{employee.firstName} {employee.lastName}</span>
                      </Link>
                    </td>
                    {weekDays.map((d) => {
                      const row = empMap?.get(isoDay(d));
                      if (row) totalMinutes += row.workedMinutes;
                      return (
                        <td key={isoDay(d)} className="text-center py-2">
                          {row ? (
                            <div className="flex flex-col items-center">
                              <AttendanceChip status={row.status} />
                              <span className="mono text-[10px] text-ink-500 mt-0.5">
                                {formatDuration(row.workedMinutes)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-ink-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="mono text-right font-semibold">{formatDuration(totalMinutes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

async function TeamDay({ params, companyId }: { params: Search; companyId: string }) {
  const day = parseDay(params.date);
  const q = params.q?.trim();

  const employees = await db.employee.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      ...(q ? { OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { loginId: { contains: q.toUpperCase() } }] } : {}),
    },
    orderBy: { firstName: "asc" },
  });

  const rows = await db.attendance.findMany({
    where: { date: day, employeeId: { in: employees.map((e) => e.id) } },
  });
  const byEmployee = new Map(rows.map((row) => [row.employeeId, row]));

  const present = rows.filter((row) => row.status === "PRESENT" || row.status === "HALF_DAY").length;
  const onLeave = rows.filter((row) => row.status === "LEAVE").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={<div className="h-9 w-48 rounded-md bg-ink-100" />}>
          <PeriodNav value={isoDay(day)} type="date" paramName="date" />
        </Suspense>
        <Suspense fallback={<div className="h-9 w-full max-w-sm rounded-md bg-ink-100" />}>
          <SearchInput placeholder="Search employees" />
        </Suspense>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Date" value={formatLongDate(day)} />
        <Stat label="Checked in" value={String(present)} tone="present" />
        <Stat label="On leave" value={String(onLeave)} tone="leave" />
        <Stat label="No record" value={String(employees.length - rows.length)} tone="absent" />
      </div>

      {employees.length === 0 ? (
        <EmptyState title="No employees" description="Add employees before attendance can be recorded." />
      ) : (
        <div className="table-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Work Hours</th>
                <th>Extra Hours</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const row = byEmployee.get(employee.id);
                return (
                  <tr key={employee.id}>
                    <td>
                      <Link href={`/employees/${employee.id}`} className="flex items-center gap-2.5 hover:text-brand-700">
                        <Avatar src={employee.avatar} name={`${employee.firstName} ${employee.lastName}`} size={28} />
                        <span>
                          <span className="block font-medium">
                            {employee.firstName} {employee.lastName}
                          </span>
                          <span className="mono block text-[11px] text-ink-400">{employee.loginId}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="mono">{formatTime(row?.checkIn)}</td>
                    <td className="mono">{formatTime(row?.checkOut)}</td>
                    <td className="mono">{formatDuration(row?.workedMinutes ?? 0)}</td>
                    <td className="mono">{formatDuration(extraMinutes(row?.workedMinutes ?? 0))}</td>
                    <td>
                      <AttendanceChip status={row?.status ?? "ABSENT"} />
                    </td>
                    <td className="text-right">
                      {row ? (
                        <EditAttendanceModal
                          record={{
                            id: row.id,
                            employeeName: `${employee.firstName} ${employee.lastName}`,
                            checkIn: row.checkIn,
                            checkOut: row.checkOut,
                            status: row.status,
                            note: row.note,
                          }}
                        />
                      ) : (
                        <span className="text-xs text-ink-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

async function MyMonth({ params, employeeId }: { params: Search; employeeId: string }) {
  const month = parseMonth(params.month);
  const from = startOfMonth(month);
  const to = endOfMonth(month);
  const activeDisplay = params.display ?? "table";

  const rows = await db.attendance.findMany({
    where: { employeeId, date: { gte: from, lt: addDays(to, 1) } },
    orderBy: { date: "asc" },
  });

  const daysPresent = rows.filter((row) => row.status === "PRESENT").length;
  const halfDays = rows.filter((row) => row.status === "HALF_DAY").length;
  const leaves = rows.filter((row) => row.status === "LEAVE").length;
  const totalMinutes = rows.reduce((sum, row) => sum + row.workedMinutes, 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={<div className="h-9 w-48 rounded-md bg-ink-100" />}>
          <PeriodNav value={isoDay(month).slice(0, 7)} type="month" paramName="month" />
        </Suspense>

        {/* View Toggle: Table View vs Calendar View */}
        <div className="flex rounded-md border border-line bg-surface p-0.5 text-sm">
          <Link
            href={`/attendance?view=me&display=table${params.month ? `&month=${params.month}` : ""}`}
            className={`rounded px-3 py-1.5 font-medium transition ${
              activeDisplay === "table" ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-brand-50"
            }`}
          >
            Table View
          </Link>
          <Link
            href={`/attendance?view=me&display=calendar${params.month ? `&month=${params.month}` : ""}`}
            className={`rounded px-3 py-1.5 font-medium transition ${
              activeDisplay === "calendar" ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-brand-50"
            }`}
          >
            Calendar View
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Days present" value={`${daysPresent}${halfDays ? ` + ${halfDays} half` : ""}`} tone="present" />
        <Stat label="Leaves count" value={String(leaves)} tone="leave" />
        <Stat label="Total working days" value={String(workingDaysInMonth(month))} />
        <Stat label="Hours worked" value={formatDuration(totalMinutes)} />
      </div>

      {activeDisplay === "calendar" ? (
        <EmployeeAttendanceCalendar rows={rows} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing recorded this month"
          description="Use Check In at the top of the page to start recording your day."
        />
      ) : (
        <div className="table-wrap">
          <table className="grid-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Work Hours</th>
                <th>Extra Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="num font-medium">{formatDate(row.date)}</td>
                  <td className="mono">{formatTime(row.checkIn)}</td>
                  <td className="mono">{formatTime(row.checkOut)}</td>
                  <td className="mono">{formatDuration(row.workedMinutes)}</td>
                  <td className="mono">{formatDuration(extraMinutes(row.workedMinutes))}</td>
                  <td>
                    <AttendanceChip status={row.status} />
                    {row.note ? <span className="ml-2 text-xs text-ink-400">{row.note}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="hint">
        A day counts as present at {STANDARD_WORK_HOURS} hours or more. Anything beyond that is recorded as extra hours,
        and payroll pays for present days plus approved paid leave.
      </p>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "present" | "leave" | "absent" }) {
  const toneClass =
    tone === "present"
      ? "text-present"
      : tone === "leave"
        ? "text-leave"
        : tone === "absent"
          ? "text-absent"
          : "text-ink-900";

  return (
    <div className="card px-4 py-3">
      <p className="label">{label}</p>
      <p className={`num mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
