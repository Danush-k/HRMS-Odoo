import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AttendanceWidget } from "@/components/attendance-widget";
import { SearchInput } from "@/components/search-input";
import { AttendanceChip, Avatar, EmptyState, LeaveChip, SubmitButton } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { signOutAction } from "@/server/actions/auth";
import { ReviewButtons } from "@/app/(app)/time-off/review-buttons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; denied?: string; status?: string; view?: string }>;
}) {
  const { q, denied, status = "ALL", view = "grid" } = await searchParams;
  const user = await requireUser();
  const isAdminOrHr = user.role === "ADMIN" || user.role === "HR";

  const currentDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-6 md:p-8 text-white shadow-xl shadow-brand-900/10">
          <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute right-1/3 -bottom-10 h-40 w-40 rounded-full bg-brand-400/15 blur-2xl" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <Avatar src={user.avatar} name={`${user.firstName} ${user.lastName}`} size={72} />
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-surface text-xs font-bold ring-2 ring-brand-700 text-brand-700">
                  ✓
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                    Welcome back, {user.firstName}! 👋
                  </h1>
                  <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-md">
                    {user.role}
                  </span>
                </div>

                <p className="mt-1.5 text-sm text-white/80">
                  {employee?.jobPosition || "Team Member"} • {employee?.department || user.company.name}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-white/70">
                  <span className="mono rounded bg-white/10 px-2 py-0.5 font-medium text-white/90">
                    ID: {user.loginId}
                  </span>
                  <span>•</span>
                  <span>{currentDateFormatted}</span>
                </div>
              </div>
            </div>

            {/* Attendance Quick Badge */}
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-md min-w-[220px]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
                Today's Shift Status
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="badge-pulse">
                    <span className={`badge-pulse-dot ${checkedInSince ? "bg-present" : onLeaveToday ? "bg-leave" : "bg-absent"}`} />
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${checkedInSince ? "bg-present" : onLeaveToday ? "bg-leave" : "bg-absent"}`} />
                  </span>
                  <span className="text-sm font-bold text-white">
                    {checkedInSince ? "In Office" : onLeaveToday ? "On Leave" : "Not Checked In"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3.2.1 QUICK ACCESS CARDS GRID */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">Quick Access Hub</h2>
            <span className="text-xs text-ink-400">Core HR Operations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* CARD 1: PROFILE */}
            <div className="card group stat-card-glow flex flex-col justify-between p-5 border-t-4 border-t-brand-500">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-600">01. Profile</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
                  My Profile
                </h3>
                <p className="mt-1 text-xs text-ink-500 leading-relaxed">
                  Personal details, bank info, skills, and reporting structure.
                </p>

                {employee?.manager ? (
                  <div className="mt-4 rounded-lg bg-ink-100/60 p-2.5 text-[11px] text-ink-600">
                    Reports to: <strong className="font-semibold text-ink-900">{employee.manager.firstName} {employee.manager.lastName}</strong>
                  </div>
                ) : null}
              </div>

              <Link
                href="/profile"
                className="btn-secondary mt-5 w-full justify-between text-xs font-semibold group-hover:border-brand-300 group-hover:bg-brand-50 group-hover:text-brand-700 transition-all"
              >
                <span>View Full Profile</span>
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            {/* CARD 2: ATTENDANCE */}
            <div className="card group stat-card-glow flex flex-col justify-between p-5 border-t-4 border-t-present">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-present">02. Attendance</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-present-soft text-present transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-bold text-ink-900 group-hover:text-present transition-colors">
                  Daily Clock-In
                </h3>
                <p className="mt-1 text-xs text-ink-500 leading-relaxed">
                  Log your daily attendance and monitor active working hours.
                </p>

                <div className="mt-4">
                  <AttendanceWidget checkedInSince={checkedInSince} onLeaveToday={onLeaveToday} />
                </div>
              </div>

              <Link
                href="/attendance"
                className="btn-secondary mt-5 w-full justify-between text-xs font-semibold group-hover:border-present/40 group-hover:bg-present-soft/60 group-hover:text-present transition-all"
              >
                <span>Attendance Log</span>
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            {/* CARD 3: LEAVE REQUESTS */}
            <div className="card group stat-card-glow flex flex-col justify-between p-5 border-t-4 border-t-leave">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-leave">03. Time Off</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-leave-soft text-leave transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-bold text-ink-900 group-hover:text-leave transition-colors">
                  Leave Balances
                </h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {leaveBalances.map((bal) => (
                    <div key={bal.id} className="rounded-md bg-leave-soft/50 border border-leave/20 px-2.5 py-1 text-[11px]">
                      <span className="font-semibold text-ink-800">{bal.leaveType.name}: </span>
                      <span className="font-bold text-leave">{bal.allocated - bal.used} days left</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/time-off"
                className="btn-primary mt-5 w-full justify-between text-xs font-semibold shadow-xs"
              >
                <span>Apply for Time Off</span>
                <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.16 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            {/* CARD 4: LOGOUT */}
            <div className="card group stat-card-glow flex flex-col justify-between p-5 border-t-4 border-t-danger">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-danger">04. Session</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-danger transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </div>
                </div>

                <h3 className="mt-4 text-lg font-bold text-ink-900 group-hover:text-danger transition-colors">
                  Sign Out
                </h3>
                <p className="mt-1 text-xs text-ink-500">
                  Signed in as <strong className="font-semibold text-ink-800">{user.loginId}</strong>
                </p>
              </div>

              <form action={signOutAction} className="mt-5">
                <button type="submit" className="btn-danger w-full justify-center text-xs font-semibold shadow-xs">
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
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-present" />
                <h3 className="text-xs font-bold text-ink-900 uppercase tracking-wider">Recent Attendance</h3>
              </div>
              <Link href="/attendance" className="text-xs font-semibold text-brand-600 hover:underline">View History →</Link>
            </div>
            {recentAttendance.length === 0 ? (
              <p className="text-xs text-ink-400 py-6 text-center">No attendance logs recorded yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {recentAttendance.map((row) => (
                  <div key={row.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-ink-800">
                        {new Date(row.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <p className="text-[11px] text-ink-500 mt-0.5">
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
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-leave" />
                <h3 className="text-xs font-bold text-ink-900 uppercase tracking-wider">My Leave Applications</h3>
              </div>
              <Link href="/time-off" className="text-xs font-semibold text-brand-600 hover:underline">Apply New →</Link>
            </div>
            {recentLeaveRequests.length === 0 ? (
              <p className="text-xs text-ink-400 py-6 text-center">No leave requests submitted yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {recentLeaveRequests.map((req) => (
                  <div key={req.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-ink-800">{req.leaveType.name} ({req.days} days)</p>
                      <p className="text-[11px] text-ink-500 mt-0.5">
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

  const presentPercentage = totalEmployees ? Math.round((inOfficeCount / totalEmployees) * 100) : 0;

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

      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 p-6 md:p-8 text-white shadow-xl shadow-brand-900/10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 -bottom-10 h-40 w-40 rounded-full bg-brand-400/15 blur-2xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar src={user.avatar} name={`${user.firstName} ${user.lastName}`} size={64} />
              <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-present text-[10px] font-bold ring-2 ring-brand-800 text-white">
                ✓
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  {user.role === "ADMIN" ? "Executive Dashboard" : "HR Operations Dashboard"}
                </h1>
                <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-md">
                  {user.role === "ADMIN" ? "Administrator" : "HR Officer"}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-white/80">
                Welcome back, <strong className="font-semibold text-white">{user.firstName}</strong>. Real-time workforce operations for <strong className="font-semibold text-white">{user.company.name}</strong>.
              </p>
              <div className="mt-2.5 flex items-center gap-3 text-xs text-white/70">
                <span>{currentDateFormatted}</span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-white/90 font-medium">
                  <span className="badge-pulse">
                    <span className="badge-pulse-dot" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-present" />
                  </span>
                  System Operations Normal
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/employees/new"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-900 shadow-md transition-all hover:bg-brand-50 hover:scale-105 active:scale-95 shrink-0"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Employee
          </Link>
        </div>
      </div>

      {/* Stats Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        
        {/* TOTAL TEAM */}
        <div className="card stat-card-glow p-5 border-t-4 border-t-brand-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-500">Total Workforce</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
                <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-.572zM14.5 16h-.187.002c.322-.452.544-.96.643-1.5a4.5 4.5 0 00-7.858-3.003c.277-.04.558-.06.843-.06a7.5 7.5 0 016.92 4.563h-.363z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink-900 num">{totalEmployees}</span>
            <span className="text-xs text-ink-500">active roster</span>
          </div>
          <div className="mt-3 w-full bg-brand-100 rounded-full h-1.5">
            <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>

        {/* IN OFFICE */}
        <div className="card stat-card-glow p-5 border-t-4 border-t-present">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-present">In Office Today</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-present-soft text-present">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink-900 num">{inOfficeCount}</span>
            <span className="text-xs font-bold text-present">{presentPercentage}% present</span>
          </div>
          <div className="mt-3 w-full bg-present-soft rounded-full h-1.5">
            <div className="bg-present h-1.5 rounded-full" style={{ width: `${presentPercentage}%` }} />
          </div>
        </div>

        {/* ON LEAVE */}
        <div className="card stat-card-glow p-5 border-t-4 border-t-leave">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-leave">On Leave</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-leave-soft text-leave">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink-900 num">{onLeaveCount}</span>
            <span className="text-xs text-ink-500">approved requests</span>
          </div>
          <div className="mt-3 w-full bg-leave-soft rounded-full h-1.5">
            <div
              className="bg-leave h-1.5 rounded-full"
              style={{ width: `${totalEmployees ? (onLeaveCount / totalEmployees) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* ABSENT */}
        <div className="card stat-card-glow p-5 border-t-4 border-t-absent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-absent">Absent / Away</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-absent-soft text-absent">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-ink-900 num">{absentCount}</span>
            <span className="text-xs text-ink-500">not checked in</span>
          </div>
          <div className="mt-3 w-full bg-absent-soft rounded-full h-1.5">
            <div
              className="bg-absent h-1.5 rounded-full"
              style={{ width: `${totalEmployees ? (absentCount / totalEmployees) * 100 : 0}%` }}
            />
          </div>
        </div>

      </div>

      {/* PENDING LEAVE APPROVALS WIDGET (SRS 3.2.2) */}
      {pendingLeaveRequests.length > 0 ? (
        <div className="card p-5 border-l-4 border-l-absent shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="badge-pulse">
                <span className="badge-pulse-dot bg-absent" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-absent" />
              </span>
              <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
                Pending Leave Approvals
              </h2>
              <span className="rounded-full bg-absent-soft px-2.5 py-0.5 text-xs font-extrabold text-absent">
                {pendingLeaveRequests.length} Needs Action
              </span>
            </div>
            <Link href="/time-off" className="text-xs font-semibold text-brand-600 hover:underline">
              View All Requests →
            </Link>
          </div>

          <div className="divide-y divide-line">
            {pendingLeaveRequests.map((req) => (
              <div key={req.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    src={req.employee.avatar}
                    name={`${req.employee.firstName} ${req.employee.lastName}`}
                    size={42}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-ink-900">
                        {req.employee.firstName} {req.employee.lastName}
                      </p>
                      <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 border border-brand-200">
                        {req.employee.jobPosition || "Employee"}
                      </span>
                    </div>
                    <p className="text-xs text-ink-500 mt-0.5">
                      <span className="font-semibold text-ink-700">{req.leaveType.name}</span> • {req.days} {req.days === 1 ? "day" : "days"} (
                      {new Date(req.startDate).toLocaleDateString()} – {new Date(req.endDate).toLocaleDateString()})
                    </p>
                    {req.remarks ? (
                      <p className="mt-1 text-xs italic text-ink-600 bg-ink-100/50 rounded px-2 py-1 inline-block">
                        "{req.remarks}"
                      </p>
                    ) : null}
                  </div>
                </div>

                <ReviewButtons requestId={req.id} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Toolbar & Filter Control Bar */}
      <div className="card p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "ALL" }).toString()}`}
            className={`rounded-lg px-3.5 py-1.5 transition-all ${
              status === "ALL"
                ? "bg-brand-600 font-semibold text-white shadow-xs"
                : "bg-surface text-ink-600 hover:bg-ink-100"
            }`}
          >
            All Members ({totalEmployees})
          </Link>
          <Link
            href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), ...(view ? { view } : {}), status: "PRESENT" }).toString()}`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
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
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
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
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition-all ${
              status === "ABSENT"
                ? "bg-absent font-semibold text-white shadow-xs"
                : "bg-surface text-ink-600 hover:bg-absent-soft hover:text-absent"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "ABSENT" ? "bg-white" : "bg-absent"}`} />
            Absent ({absentCount})
          </Link>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex flex-1 items-center justify-end gap-3 min-w-[280px]">
          <Suspense fallback={<div className="h-9 w-full max-w-sm rounded-md bg-ink-100" />}>
            <SearchInput placeholder="Search by name, position or Login ID..." />
          </Suspense>

          <div className="flex items-center rounded-lg border border-line bg-ink-100/70 p-1">
            <Link
              href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), status, view: "grid" }).toString()}`}
              title="Grid Cards View"
              className={`rounded-md p-1.5 transition-colors ${
                view === "grid" ? "bg-surface text-brand-600 shadow-xs font-bold" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm9-9A2.25 2.25 0 0011 4.25v2.5A2.25 2.25 0 0013.25 9h2.5A2.25 2.25 0 0018 6.75v-2.5A2.25 2.25 0 0015.75 2h-2.5zm0 9A2.25 2.25 0 0011 13.25v2.5A2.25 2.25 0 0013.25 18h2.5A2.25 2.25 0 0018 15.75v-2.5A2.25 2.25 0 0015.75 11h-2.5z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href={`/employees?${new URLSearchParams({ ...(q ? { q } : {}), status, view: "table" }).toString()}`}
              title="Table Roster View"
              className={`rounded-md p-1.5 transition-colors ${
                view === "table" ? "bg-surface text-brand-600 shadow-xs font-bold" : "text-ink-500 hover:text-ink-900"
              }`}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
                <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm0-5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Roster Display */}
      {employees.length === 0 ? (
        <EmptyState
          title={q || status !== "ALL" ? "No matching team members found" : "No employees registered yet"}
          description={
            q || status !== "ALL"
              ? "Try adjusting your search criteria or reset filters to see all employees."
              : "Add your first employee to Dayflow to start managing profiles, attendance, and leave."
          }
          action={
            !q && status === "ALL" ? (
              <Link href="/employees/new" className="btn-primary">
                Add an employee
              </Link>
            ) : (
              <Link href="/employees" className="btn-secondary">
                Reset All Filters
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
                <th>Employee Profile</th>
                <th>Login ID</th>
                <th>Department & Position</th>
                <th>Access Role</th>
                <th>Today's Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const st = statusOf.get(emp.id) ?? "ABSENT";
                return (
                  <tr key={emp.id} className="group hover:bg-brand-50/40 transition-colors">
                    <td>
                      <Link href={`/employees/${emp.id}`} className="flex items-center gap-3">
                        <Avatar src={emp.avatar} name={`${emp.firstName} ${emp.lastName}`} size={38} />
                        <div>
                          <p className="font-semibold text-ink-900 group-hover:text-brand-600 transition-colors">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-ink-400">{emp.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className="mono rounded-md bg-brand-50 border border-brand-200/80 px-2.5 py-1 text-xs font-semibold text-brand-700">
                        {emp.loginId}
                      </span>
                    </td>
                    <td>
                      <p className="text-xs font-bold text-ink-800">{emp.jobPosition || "—"}</p>
                      <p className="text-[11px] text-ink-500">{emp.department || "General Department"}</p>
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          emp.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : emp.role === "HR"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-ink-100 text-ink-700 border border-ink-200"
                        }`}
                      >
                        {emp.role}
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
                        href={`/employees/${emp.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800 hover:underline"
                      >
                        <span>Inspect Record</span>
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
        /* Grid View Cards */
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {employees.map((emp) => {
            const st = statusOf.get(emp.id) ?? "ABSENT";
            const isPresent = st === "PRESENT" || st === "HALF_DAY";
            const isLeave = st === "LEAVE";

            const borderAccent = isPresent
              ? "border-t-present"
              : isLeave
              ? "border-t-leave"
              : "border-t-absent";

            return (
              <li key={emp.id}>
                <Link
                  href={`/employees/${emp.id}`}
                  className={`card group stat-card-glow relative flex flex-col justify-between overflow-hidden border-t-4 ${borderAccent} p-5 h-full`}
                >
                  <div>
                    {/* Top Row: Avatar + Role Badge + Status Indicator */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="relative">
                        <Avatar src={emp.avatar} name={`${emp.firstName} ${emp.lastName}`} size={56} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface ${
                            isPresent ? "bg-present" : isLeave ? "bg-leave" : "bg-absent"
                          }`}
                        />
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            emp.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : emp.role === "HR"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-ink-100 text-ink-600 border border-ink-200"
                          }`}
                        >
                          {emp.role}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            isPresent ? "text-present" : isLeave ? "text-leave" : "text-absent"
                          }`}
                        >
                          {isPresent ? "In Office" : isLeave ? "On Leave" : "Absent"}
                        </span>
                      </div>
                    </div>

                    {/* Employee Info */}
                    <div className="mt-4">
                      <h3 className="truncate text-base font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
                        {emp.firstName} {emp.lastName}
                      </h3>
                      <p className="truncate text-xs font-semibold text-ink-700 mt-0.5">
                        {emp.jobPosition || "No Position Assigned"}
                      </p>
                      <p className="truncate text-xs text-ink-500 mt-0.5">
                        {emp.department || "General Department"}
                      </p>
                    </div>
                  </div>

                  {/* Footer Info: Login ID & Email */}
                  <div className="mt-5 border-t border-line/70 pt-3 flex items-center justify-between gap-2">
                    <span className="mono rounded-md bg-brand-50 border border-brand-200/80 px-2 py-0.5 text-[11px] font-bold text-brand-700">
                      {emp.loginId}
                    </span>
                    <span className="truncate text-[11px] font-medium text-ink-400 max-w-[130px]" title={emp.email}>
                      {emp.email}
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

