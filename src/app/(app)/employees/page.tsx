import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@prisma/client";

import { AttendanceWidget } from "@/components/attendance-widget";
import { SearchInput } from "@/components/search-input";
import { AttendanceChip, Avatar, EmptyState, LeaveChip } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { signOutAction } from "@/server/actions/auth";
import { ReviewButtons } from "@/app/(app)/time-off/review-buttons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; denied?: string; status?: string; view?: string; page?: string }>;
}) {
  const searchParamsData = await searchParams;
  const { q, denied, status = "ALL", view = "grid", page = "1" } = searchParamsData;
  const user = await requireUser();
  const isAdminOrHr = user.role === "ADMIN" || user.role === "HR";

  if (!isAdminOrHr) {
    // ------------------------------------------------------------------------
    // EMPLOYEE DASHBOARD (SRS 3.2.1)
    // ------------------------------------------------------------------------
    const today = dayKey(new Date());

    const employee = await db.employee.findUnique({
      where: { id: user.id },
      include: {
        manager: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const todayAttendance = await db.attendance.findFirst({
      where: { employeeId: user.id, date: today },
    });

    const leaveBalances = await db.leaveBalance.findMany({
      where: { employeeId: user.id, year: today.getFullYear() },
      include: { leaveType: true },
    });

    const recentLeaveRequests = await db.leaveRequest.findMany({
      where: { employeeId: user.id },
      include: { leaveType: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentAttendance = await db.attendance.findMany({
      where: { employeeId: user.id },
      orderBy: { date: "desc" },
      take: 5,
    });

    const checkedInSince =
      todayAttendance?.checkIn && !todayAttendance?.checkOut
        ? todayAttendance.checkIn.toISOString()
        : null;
    const onLeaveToday = todayAttendance?.status === "LEAVE";

    return (
      <div className="flex flex-col gap-6">
        {/* Welcome Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-200/80 bg-gradient-to-r from-brand-50 to-surface p-6 shadow-xs">
          <div className="flex items-center gap-4">
            <Avatar src={user.avatar} name={`${user.firstName} ${user.lastName}`} size={64} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-ink-900">Welcome back, {user.firstName}!</h1>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {user.role}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-600">
                {employee?.jobPosition || "Team Member"} • {employee?.department || user.company.name}
              </p>
              <p className="mono mt-1 text-xs text-brand-600 font-semibold">ID: {user.loginId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-surface p-3 border border-line shadow-2xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Attendance Status</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${checkedInSince ? "bg-present animate-pulse" : onLeaveToday ? "bg-leave" : "bg-absent"}`} />
                <span className="text-xs font-bold text-ink-900">
                  {checkedInSince ? "Checked In" : onLeaveToday ? "On Leave" : "Not Checked In"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3.2.1 QUICK ACCESS CARDS GRID */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">Quick Access Dashboard</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* CARD 1: PROFILE */}
            <div className="card group relative flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">01. Profile</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-3 text-lg font-bold text-ink-900 group-hover:text-brand-600 transition-colors">My Profile</h3>
                <p className="mt-1 text-xs text-ink-500">
                  View personal details, bank info, resume, and manager information.
                </p>
                {employee?.manager ? (
                  <div className="mt-3 rounded bg-ink-100/60 px-2.5 py-1.5 text-[11px] text-ink-600">
                    Manager: <strong className="font-semibold text-ink-800">{employee.manager.firstName} {employee.manager.lastName}</strong>
                  </div>
                ) : null}
              </div>
              <Link
                href="/profile"
                className="btn-secondary mt-5 w-full justify-between text-xs font-semibold"
              >
                View Full Profile
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            {/* CARD 2: ATTENDANCE */}
            <div className="card group relative flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:border-present/60 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-present">02. Attendance</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-present-soft text-present">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-3 text-lg font-bold text-ink-900 group-hover:text-present transition-colors">Daily Clock-In</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Track your daily work hours, check-in timestamps and logs.
                </p>
                <div className="mt-3">
                  <AttendanceWidget checkedInSince={checkedInSince} onLeaveToday={onLeaveToday} />
                </div>
              </div>
              <Link
                href="/attendance"
                className="btn-secondary mt-5 w-full justify-between text-xs font-semibold"
              >
                Attendance History
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            {/* CARD 3: LEAVE REQUESTS */}
            <div className="card group relative flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:border-leave/60 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-leave">03. Time Off</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-leave-soft text-leave">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-3 text-lg font-bold text-ink-900 group-hover:text-leave transition-colors">Leave Balances</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {leaveBalances.map((bal) => (
                    <div key={bal.id} className="rounded bg-brand-50/70 border border-brand-200 px-2 py-1 text-[11px]">
                      <span className="font-semibold text-brand-800">{bal.leaveType.name}: </span>
                      <span className="font-bold text-brand-600">{bal.allocated - bal.used} days left</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href="/time-off"
                className="btn-primary mt-5 w-full justify-between text-xs font-semibold"
              >
                Apply for Time Off
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            {/* CARD 4: LOGOUT */}
            <div className="card group relative flex flex-col justify-between p-5 transition-all hover:-translate-y-0.5 hover:border-danger/60 hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-danger">04. Session</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger-soft text-danger">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-3 text-lg font-bold text-ink-900 group-hover:text-danger transition-colors">Sign Out</h3>
                <p className="mt-1 text-xs text-ink-500">
                  Signed in as <strong className="font-semibold text-ink-700">{user.loginId}</strong>
                </p>
              </div>
              <form action={signOutAction} className="mt-5">
                <button type="submit" className="btn-danger w-full justify-center text-xs font-semibold">
                  Logout Session
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* RECENT ACTIVITY & ALERTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Attendance */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider">Recent Attendance Activity</h3>
              <Link
                href="/attendance"
                className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs hover:shadow-sm transition-all active:scale-[0.98]"
              >
                View All
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
            {recentAttendance.length === 0 ? (
              <p className="text-xs text-ink-400 py-4 text-center">No attendance recorded recently.</p>
            ) : (
              <div className="divide-y divide-line">
                {recentAttendance.map((row) => (
                  <div key={row.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-ink-800">
                        {new Date(row.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        {row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} to{" "}
                        {row.checkOut ? new Date(row.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </p>
                    </div>
                    <AttendanceChip status={row.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Leave Requests */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider">My Leave Requests</h3>
              <Link
                href="/time-off"
                className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs hover:shadow-sm transition-all active:scale-[0.98]"
              >
                Apply New
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
            {recentLeaveRequests.length === 0 ? (
              <p className="text-xs text-ink-400 py-4 text-center">No leave requests submitted yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {recentLeaveRequests.map((req) => (
                  <div key={req.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-ink-800">{req.leaveType.name} ({req.days} days)</p>
                      <p className="text-[11px] text-ink-500">
                        {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <LeaveChip status={req.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // ADMIN / HR DASHBOARD (SRS 3.2.2)
  // ------------------------------------------------------------------------

  const today = dayKey(new Date());

  // Fast count of total company employees
  const totalEmployees = await db.employee.count({
    where: { companyId: user.companyId },
  });

  // Fetch today's attendance for status metric calculation
  const allTodayAttendance = await db.attendance.findMany({
    where: {
      date: today,
      employee: { companyId: user.companyId },
    },
    select: { employeeId: true, status: true, checkIn: true, checkOut: true },
  });

  // Calculate quick metrics for the stat summary cards
  let inOfficeCount = 0;
  let onLeaveCount = 0;
  let halfDayCount = 0;

  const statusMap = new Map<string, "PRESENT" | "LEAVE" | "ABSENT" | "HALF_DAY">();
  for (const row of allTodayAttendance) {
    if (row.status === "LEAVE") {
      statusMap.set(row.employeeId, "LEAVE");
      onLeaveCount++;
    } else if (row.status === "HALF_DAY") {
      statusMap.set(row.employeeId, "HALF_DAY");
      halfDayCount++;
    } else if (row.checkIn && !row.checkOut) {
      statusMap.set(row.employeeId, "PRESENT");
      inOfficeCount++;
    } else if (row.status === "PRESENT") {
      statusMap.set(row.employeeId, "PRESENT");
      inOfficeCount++;
    } else {
      statusMap.set(row.employeeId, "ABSENT");
    }
  }
  const absentCount = Math.max(0, totalEmployees - inOfficeCount - onLeaveCount - halfDayCount);

  // Fetch pending leave requests for Admin approval widget (SRS 3.2.2)
  const pendingLeaveRequests = await db.leaveRequest.findMany({
    where: {
      employee: { companyId: user.companyId },
      status: "PENDING",
    },
    include: {
      employee: { select: { firstName: true, lastName: true, avatar: true, jobPosition: true } },
      leaveType: { select: { name: true, colour: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Construct database WHERE filter (P7: Full name, partial name, ID, email search)
  const trimmedQ = (q ?? "").trim();
  const pageNum = Math.max(1, parseInt(page || "1", 10) || 1);
  const pageSize = 12;

  const where: Prisma.EmployeeWhereInput = {
    companyId: user.companyId,
  };

  if (trimmedQ) {
    const words = trimmedQ.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      const w = words[0];
      where.OR = [
        { firstName: { contains: w } },
        { lastName: { contains: w } },
        { loginId: { contains: w } },
        { email: { contains: w } },
        { jobPosition: { contains: w } },
        { department: { contains: w } },
      ];
    } else {
      const firstWord = words[0];
      const lastWord = words.slice(1).join(" ");
      where.OR = [
        {
          AND: [
            { firstName: { contains: firstWord } },
            { lastName: { contains: lastWord } },
          ],
        },
        {
          AND: [
            { firstName: { contains: lastWord } },
            { lastName: { contains: firstWord } },
          ],
        },
        { firstName: { contains: trimmedQ } },
        { lastName: { contains: trimmedQ } },
        { loginId: { contains: trimmedQ } },
        { email: { contains: trimmedQ } },
        { jobPosition: { contains: trimmedQ } },
        { department: { contains: trimmedQ } },
      ];
    }
  }

  // Attendance status filter
  if (status === "PRESENT") {
    const presentEmpIds = Array.from(statusMap.entries())
      .filter(([_, st]) => st === "PRESENT" || st === "HALF_DAY")
      .map(([id]) => id);
    where.id = { in: presentEmpIds };
  } else if (status === "LEAVE") {
    const leaveEmpIds = Array.from(statusMap.entries())
      .filter(([_, st]) => st === "LEAVE")
      .map(([id]) => id);
    where.id = { in: leaveEmpIds };
  } else if (status === "ABSENT") {
    const nonAbsentEmpIds = Array.from(statusMap.entries())
      .filter(([_, st]) => st === "PRESENT" || st === "HALF_DAY" || st === "LEAVE")
      .map(([id]) => id);
    where.id = { notIn: nonAbsentEmpIds };
  } else if (status === "HALF_DAY") {
    const halfDayEmpIds = Array.from(statusMap.entries())
      .filter(([_, st]) => st === "HALF_DAY")
      .map(([id]) => id);
    where.id = { in: halfDayEmpIds };
  }

  // P6: Database-level total count and pagination calculation
  const totalMatching = await db.employee.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalMatching / pageSize));
  const safePage = Math.min(pageNum, totalPages);

  // P5: Explicitly select only necessary fields, absolutely excluding passwordHash and sensitive personal data
  const employees = await db.employee.findMany({
    where,
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
    skip: (safePage - 1) * pageSize,
    take: pageSize,
  });

  const statusOf = new Map<string, "PRESENT" | "LEAVE" | "ABSENT" | "HALF_DAY">(
    employees.map((emp) => [emp.id, statusMap.get(emp.id) || "ABSENT"])
  );

  const userAttendanceStatus = statusMap.get(user.id) ?? "ABSENT";
  const userCheckedIn = userAttendanceStatus === "PRESENT" || userAttendanceStatus === "HALF_DAY";
  const userOnLeave = userAttendanceStatus === "LEAVE";

  const profileHref = (empId: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status && status !== "ALL") params.set("status", status);
    const qs = params.toString();
    return `/employees/${empId}${qs ? `?${qs}` : ""}`;
  };

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

      {/* Welcome Header Card for Admin & HR */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-200/80 bg-gradient-to-r from-brand-50 to-surface p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <Avatar src={user.avatar} name={`${user.firstName} ${user.lastName}`} size={64} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-ink-900">Welcome back, {user.firstName}!</h1>
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {user.role}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-600">
              {user.jobPosition || (user.role === "ADMIN" ? "Administrator" : "HR Officer")} • {user.department || user.company.name}
            </p>
            <p className="mono mt-1 text-xs text-brand-600 font-semibold">ID: {user.loginId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-surface p-3 border border-line shadow-2xs">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Attendance Status</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${userCheckedIn ? "bg-present animate-pulse" : userOnLeave ? "bg-leave" : "bg-absent"
                  }`}
              />
              <span className="text-xs font-bold text-ink-900">
                {userCheckedIn ? "Checked In" : userOnLeave ? "On Leave" : "Not Checked In"}
              </span>
            </div>
          </div>

          <Link
            href="/employees/new"
            className="btn-primary inline-flex items-center gap-2 shadow-xs transition-transform active:scale-[0.98] h-[50px] px-4"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Employee
          </Link>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="card relative overflow-hidden p-4 transition-all hover:border-brand-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Total Team</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
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

        <div className="card relative overflow-hidden p-4 transition-all hover:border-brand-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">In Office</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <svg viewBox="0 20 20" width="18" height="18" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-900 num">{inOfficeCount}</span>
            <span className="text-xs font-medium text-ink-500">
              {totalEmployees ? Math.round((inOfficeCount / totalEmployees) * 100) : 0}% present
            </span>
          </div>
        </div>

        <div className="card relative overflow-hidden p-4 transition-all hover:border-brand-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">On Leave</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink-900 num">{onLeaveCount}</span>
            <span className="text-xs font-medium text-ink-500">approved leaves</span>
          </div>
        </div>

        <div className="card relative overflow-hidden p-4 transition-all hover:border-brand-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Absent</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
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

      {/* Leave Approval Widget */}
      {pendingLeaveRequests.length > 0 ? (
        <div className="card p-5 border-l-4 border-l-brand-600 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink-900">
                Action Required: Pending Leave Approvals
              </h2>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
                {pendingLeaveRequests.length}
              </span>
            </div>
            <Link href="/time-off" className="text-xs font-semibold text-brand-600 hover:underline">
              View All Leaves →
            </Link>
          </div>

          <div className="divide-y divide-line">
            {pendingLeaveRequests.map((req) => (
              <div key={req.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={req.employee.avatar}
                    name={`${req.employee.firstName} ${req.employee.lastName}`}
                    size={36}
                  />
                  <div>
                    <p className="text-xs font-bold text-ink-900">
                      {req.employee.firstName} {req.employee.lastName}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      {req.leaveType.name} • {req.days} {req.days === 1 ? "day" : "days"} (
                      {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()})
                    </p>
                    {req.remarks ? (
                      <p className="mt-0.5 text-[11px] italic text-ink-600">"{req.remarks}"</p>
                    ) : null}
                  </div>
                </div>

                <ReviewButtons requestId={req.id} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Toolbar & Filters */}
      <div className="card p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs rounded-xl">
        {/* Status Filter Segmented Control */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-ink-100/60 p-1 border border-line/60 text-xs font-medium">
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "ALL" }).toString()}`}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              status === "ALL"
                ? "bg-surface font-semibold text-brand-700 shadow-2xs border border-line/80"
                : "text-ink-600 hover:text-ink-900 hover:bg-surface/50"
            }`}
          >
            All ({totalEmployees})
          </Link>
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "PRESENT" }).toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              status === "PRESENT"
                ? "bg-surface font-semibold text-present shadow-2xs border border-line/80"
                : "text-ink-600 hover:text-present hover:bg-surface/50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-present" />
            In Office ({inOfficeCount})
          </Link>
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "LEAVE" }).toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              status === "LEAVE"
                ? "bg-surface font-semibold text-leave shadow-2xs border border-line/80"
                : "text-ink-600 hover:text-leave hover:bg-surface/50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-leave" />
            On Leave ({onLeaveCount})
          </Link>
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "ABSENT" }).toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              status === "ABSENT"
                ? "bg-surface font-semibold text-absent shadow-2xs border border-line/80"
                : "text-ink-600 hover:text-absent hover:bg-surface/50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-absent" />
            Absent ({absentCount})
          </Link>
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "HALF_DAY" }).toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
              status === "HALF_DAY"
                ? "bg-surface font-semibold text-brand-700 shadow-2xs border border-line/80"
                : "text-ink-600 hover:text-brand-700 hover:bg-surface/50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-brand-600" />
            Half Day ({halfDayCount})
          </Link>
        </div>

        {/* Search & View Toggle */}
        <div className="flex flex-1 items-center justify-end gap-2.5 min-w-[260px]">
          <Suspense fallback={<div className="h-9 w-full max-w-sm rounded-md bg-ink-100" />}>
            <SearchInput placeholder="Search by name, position or ID..." />
          </Suspense>

          <div className="flex items-center rounded-lg border border-line bg-ink-100/60 p-1">
            <Link
              href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), status, view: "grid", ...(page && page !== "1" ? { page } : {}) }).toString()}`}
              title="Grid View"
              className={`rounded-md p-1.5 transition-colors ${
                view === "grid" ? "bg-surface text-brand-700 shadow-2xs border border-line/80" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), status, view: "table", ...(page && page !== "1" ? { page } : {}) }).toString()}`}
              title="Table View"
              className={`rounded-md p-1.5 transition-colors ${
                view === "table" ? "bg-surface text-brand-700 shadow-2xs border border-line/80" : "text-ink-500 hover:text-ink-900"
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
            !q && status === "ALL" ? (
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
        <div className="flex flex-col gap-4">
          <div className="table-wrap border border-line shadow-xs">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Login ID</th>
                  <th>Department & Position</th>
                  <th>Role</th>
                  <th>Employment Status</th>
                  <th>Today's Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const st = statusOf.get(emp.id) ?? "ABSENT";
                  const isActive = emp.status === "ACTIVE";
                  return (
                    <tr key={emp.id} className={`group ${!isActive ? "bg-ink-50/40 opacity-85" : ""}`}>
                      <td>
                        <Link href={profileHref(emp.id)} className="flex items-center gap-3">
                          <Avatar src={emp.avatar} name={`${emp.firstName} ${emp.lastName}`} size={36} />
                          <div>
                            <p className="font-semibold text-ink-900 group-hover:text-brand-600 transition-colors">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-xs text-ink-400">{emp.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <span className="mono rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 border border-brand-200">
                          {emp.loginId}
                        </span>
                      </td>
                      <td>
                        <p className="text-xs font-medium text-ink-800">{emp.jobPosition || "—"}</p>
                        <p className="text-[11px] text-ink-500">{emp.department || "General"}</p>
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${emp.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800"
                              : emp.role === "HR"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-ink-100 text-ink-700"
                            }`}
                        >
                          {emp.role}
                        </span>
                      </td>
                      <td>
                        {/* P8: Visual Status Indicator */}
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-800 border border-orange-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${st === "PRESENT" || st === "HALF_DAY"
                              ? "bg-present-soft text-present"
                              : st === "LEAVE"
                                ? "bg-leave-soft text-leave"
                                : "bg-absent-soft text-absent"
                            }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${st === "PRESENT" || st === "HALF_DAY"
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
                          href={profileHref(emp.id)}
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

          {/* P6: Pagination Controls for Table View */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-xs shadow-2xs">
              <p className="text-ink-500">
                Showing <span className="font-semibold text-ink-900">{(safePage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-semibold text-ink-900">{Math.min(safePage * pageSize, totalMatching)}</span> of{" "}
                <span className="font-semibold text-ink-900">{totalMatching}</span> employees
              </p>

              <div className="flex items-center gap-1">
                {safePage > 1 ? (
                  <Link
                    href={`/employees?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(status !== "ALL" ? { status } : {}),
                      ...(view ? { view } : {}),
                      page: String(safePage - 1),
                    }).toString()}`}
                    className="btn-secondary btn-xs inline-flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                    Previous
                  </Link>
                ) : (
                  <span className="btn-secondary btn-xs opacity-50 cursor-not-allowed inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                    Previous
                  </span>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isCurrent = p === safePage;
                  return (
                    <Link
                      key={p}
                      href={`/employees?${new URLSearchParams({
                        ...(q ? { q } : {}),
                        ...(status !== "ALL" ? { status } : {}),
                        ...(view ? { view } : {}),
                        page: String(p),
                      }).toString()}`}
                      className={`grid h-7 w-7 place-items-center rounded-md text-xs font-semibold transition ${isCurrent
                          ? "bg-brand-600 text-white shadow-xs"
                          : "bg-surface text-ink-700 hover:bg-ink-100 border border-line"
                        }`}
                    >
                      {p}
                    </Link>
                  );
                })}

                {safePage < totalPages ? (
                  <Link
                    href={`/employees?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(status !== "ALL" ? { status } : {}),
                      ...(view ? { view } : {}),
                      page: String(safePage + 1),
                    }).toString()}`}
                    className="btn-secondary btn-xs inline-flex items-center gap-1"
                  >
                    Next
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Link>
                ) : (
                  <span className="btn-secondary btn-xs opacity-50 cursor-not-allowed inline-flex items-center gap-1">
                    Next
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="flex flex-col gap-5">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {employees.map((emp) => {
              const st = statusOf.get(emp.id) ?? "ABSENT";
              const isPresent = st === "PRESENT" || st === "HALF_DAY";
              const isLeave = st === "LEAVE";
              const isActive = emp.status === "ACTIVE";

              return (
                <li key={emp.id}>
                  <Link
                    href={profileHref(emp.id)}
                    className="card group relative flex flex-col justify-between overflow-hidden rounded-xl border border-line bg-surface p-4 transition-colors duration-150 hover:border-brand-400 hover:bg-brand-50/15 shadow-2xs h-full"
                  >
                    <div>
                      {/* Top Row: Avatar with presence dot + Role and Active badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="relative">
                          <Avatar src={emp.avatar} name={`${emp.firstName} ${emp.lastName}`} size={46} />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${
                              isPresent ? "bg-present" : isLeave ? "bg-leave" : "bg-absent"
                            }`}
                            title={`Today: ${isPresent ? "In Office" : isLeave ? "On Leave" : "Absent"}`}
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/70">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600 border border-line">
                              <span className="h-1.5 w-1.5 rounded-full bg-ink-400" />
                              Inactive
                            </span>
                          )}

                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              emp.role === "ADMIN"
                                ? "bg-brand-50 text-brand-800 border border-brand-200/80"
                                : emp.role === "HR"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200/80"
                                  : "bg-ink-100 text-ink-700 border border-line"
                            }`}
                          >
                            {emp.role}
                          </span>
                        </div>
                      </div>

                      {/* Employee Info */}
                      <div className="mt-3">
                        <h3 className="truncate text-sm font-bold text-ink-900 group-hover:text-brand-700 transition-colors">
                          {emp.firstName} {emp.lastName}
                        </h3>
                        <p className="truncate text-xs font-medium text-ink-700 mt-0.5">
                          {emp.jobPosition || "No Position Assigned"}
                        </p>
                        <p className="truncate text-[11px] text-ink-500">
                          {emp.department || "General Department"}
                        </p>
                      </div>
                    </div>

                    {/* Footer Info: Login ID & Email */}
                    <div className="mt-3.5 border-t border-line/60 pt-2.5 flex items-center justify-between gap-2">
                      <span className="mono rounded-md bg-brand-50/80 px-2 py-0.5 text-[11px] font-semibold text-brand-800 border border-brand-200/60">
                        {emp.loginId}
                      </span>
                      <span className="truncate text-[11px] text-ink-500 font-normal max-w-[140px]" title={emp.email}>
                        {emp.email}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* P6: Pagination Controls for Grid View */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-xs shadow-2xs">
              <p className="text-ink-500">
                Showing <span className="font-semibold text-ink-900">{(safePage - 1) * pageSize + 1}</span> to{" "}
                <span className="font-semibold text-ink-900">{Math.min(safePage * pageSize, totalMatching)}</span> of{" "}
                <span className="font-semibold text-ink-900">{totalMatching}</span> employees
              </p>

              <div className="flex items-center gap-1">
                {safePage > 1 ? (
                  <Link
                    href={`/employees?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(status !== "ALL" ? { status } : {}),
                      ...(view ? { view } : {}),
                      page: String(safePage - 1),
                    }).toString()}`}
                    className="btn-secondary btn-xs inline-flex items-center gap-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                    Previous
                  </Link>
                ) : (
                  <span className="btn-secondary btn-xs opacity-50 cursor-not-allowed inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                    Previous
                  </span>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isCurrent = p === safePage;
                  return (
                    <Link
                      key={p}
                      href={`/employees?${new URLSearchParams({
                        ...(q ? { q } : {}),
                        ...(status !== "ALL" ? { status } : {}),
                        ...(view ? { view } : {}),
                        page: String(p),
                      }).toString()}`}
                      className={`grid h-7 w-7 place-items-center rounded-md text-xs font-semibold transition ${isCurrent
                          ? "bg-brand-600 text-white shadow-xs"
                          : "bg-surface text-ink-700 hover:bg-ink-100 border border-line"
                        }`}
                    >
                      {p}
                    </Link>
                  );
                })}

                {safePage < totalPages ? (
                  <Link
                    href={`/employees?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(status !== "ALL" ? { status } : {}),
                      ...(view ? { view } : {}),
                      page: String(safePage + 1),
                    }).toString()}`}
                    className="btn-secondary btn-xs inline-flex items-center gap-1"
                  >
                    Next
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Link>
                ) : (
                  <span className="btn-secondary btn-xs opacity-50 cursor-not-allowed inline-flex items-center gap-1">
                    Next
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
