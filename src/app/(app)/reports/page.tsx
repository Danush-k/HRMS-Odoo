import type { Metadata } from "next";
import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReportsClientView } from "./reports-client-view";

export const metadata: Metadata = { title: "Analytics & Reports" };

type SearchParams = Promise<{ year?: string; month?: string }>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requireManager();
  const params = await searchParams;

  const now = new Date();
  const selectedYear = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const selectedMonth = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;

  // 1. Fetch Company Employees
  const employees = await db.employee.findMany({
    where: { companyId: actor.companyId },
    select: { id: true, department: true, status: true },
  });

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "ACTIVE").length;

  // 2. Compute Real Payroll Metrics from DB
  const payslips = await db.payslip.findMany({
    where: {
      employee: { companyId: actor.companyId },
      periodYear: selectedYear,
      periodMonth: selectedMonth,
    },
    include: { employee: true },
  });

  let totalPayrollGross = 0;
  let totalPayrollNet = 0;
  let totalPayrollDeductions = 0;

  const deptPayrollMap = new Map<string, { headcount: number; grossTotal: number; netTotal: number; deductionsTotal: number }>();

  for (const p of payslips) {
    totalPayrollGross += p.grossMonthly;
    totalPayrollNet += p.netPay;
    totalPayrollDeductions += p.totalDeductions;

    const dept = p.employee.department || "General";
    const curr = deptPayrollMap.get(dept) || { headcount: 0, grossTotal: 0, netTotal: 0, deductionsTotal: 0 };
    curr.headcount += 1;
    curr.grossTotal += p.grossMonthly;
    curr.netTotal += p.netPay;
    curr.deductionsTotal += p.totalDeductions;
    deptPayrollMap.set(dept, curr);
  }

  // Add default departments if no payslips generated yet
  const departmentsList = Array.from(new Set(employees.map((e) => e.department || "General")));
  for (const d of departmentsList) {
    if (!deptPayrollMap.has(d)) {
      const count = employees.filter((e) => (e.department || "General") === d).length;
      deptPayrollMap.set(d, { headcount: count, grossTotal: 0, netTotal: 0, deductionsTotal: 0 });
    }
  }

  const departmentPayrolls = Array.from(deptPayrollMap.entries()).map(([dept, val]) => ({
    department: dept,
    ...val,
  }));

  // 3. Compute Real Attendance Metrics from DB
  const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
  const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

  const attendances = await db.attendance.findMany({
    where: {
      employee: { companyId: actor.companyId },
      date: { gte: monthStart, lte: monthEnd },
    },
    include: { employee: true },
  });

  const deptAttMap = new Map<string, { totalCheckIns: number; presentDays: number; halfDays: number; leaveDays: number; absentDays: number }>();

  for (const a of attendances) {
    const dept = a.employee.department || "General";
    const curr = deptAttMap.get(dept) || { totalCheckIns: 0, presentDays: 0, halfDays: 0, leaveDays: 0, absentDays: 0 };
    curr.totalCheckIns += 1;
    if (a.status === "PRESENT") curr.presentDays += 1;
    else if (a.status === "HALF_DAY") curr.halfDays += 1;
    else if (a.status === "LEAVE") curr.leaveDays += 1;
    else if (a.status === "ABSENT") curr.absentDays += 1;
    deptAttMap.set(dept, curr);
  }

  for (const d of departmentsList) {
    if (!deptAttMap.has(d)) {
      deptAttMap.set(d, { totalCheckIns: 0, presentDays: 0, halfDays: 0, leaveDays: 0, absentDays: 0 });
    }
  }

  const departmentAttendances = Array.from(deptAttMap.entries()).map(([dept, val]) => {
    const total = val.presentDays + val.halfDays * 0.5;
    const expected = Math.max(val.totalCheckIns, 1);
    const rate = Math.round((total / expected) * 100);
    return {
      department: dept,
      ...val,
      attendanceRate: Math.min(rate, 100),
    };
  });

  const totalPresentLogs = attendances.filter((a) => a.status === "PRESENT" || a.status === "HALF_DAY").length;
  const overallAttendanceRate = attendances.length > 0 ? Math.round((totalPresentLogs / attendances.length) * 100) : 100;

  // 4. Compute Real Time Off Metrics from DB
  const leaveRequests = await db.leaveRequest.findMany({
    where: {
      employee: { companyId: actor.companyId },
      startDate: { gte: new Date(selectedYear, 0, 1), lte: new Date(selectedYear, 11, 31) },
    },
    include: { leaveType: true },
  });

  const totalLeaveRequests = leaveRequests.length;
  const approvedLeaves = leaveRequests.filter((r) => r.status === "APPROVED").length;
  const pendingLeaves = leaveRequests.filter((r) => r.status === "PENDING").length;
  const rejectedLeaves = leaveRequests.filter((r) => r.status === "REJECTED").length;

  const leaveTypes = await db.leaveType.findMany({ where: { companyId: actor.companyId } });
  const leaveTypeDistributions = leaveTypes.map((type) => {
    const matching = leaveRequests.filter((r) => r.leaveTypeId === type.id && r.status === "APPROVED");
    const totalDays = matching.reduce((sum, r) => sum + r.days, 0);
    return {
      name: type.name,
      code: type.code,
      isPaid: type.isPaid,
      totalDays,
      requestCount: matching.length,
    };
  });

  // Available Months dropdown options
  const availableMonths = [
    { label: "August 2026", year: 2026, month: 8 },
    { label: "July 2026", year: 2026, month: 7 },
    { label: "June 2026", year: 2026, month: 6 },
    { label: "May 2026", year: 2026, month: 5 },
  ];

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-4 sm:p-6">
      <ReportsClientView
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        overview={{
          totalEmployees,
          activeEmployees,
          totalPayrollGross,
          totalPayrollNet,
          totalPayrollDeductions,
          overallAttendanceRate,
          totalLeaveRequests,
          approvedLeaves,
          pendingLeaves,
          rejectedLeaves,
        }}
        departmentPayrolls={departmentPayrolls}
        departmentAttendances={departmentAttendances}
        leaveTypeDistributions={leaveTypeDistributions}
      />
    </div>
  );
}
