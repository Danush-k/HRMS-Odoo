"use server";

import { requireManager } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/salary";

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/** Export CSV report for Payroll for a given month */
export async function exportPayrollCsvAction(periodYear: number, periodMonth: number) {
  const actor = await requireManager();

  const payslips = await db.payslip.findMany({
    where: {
      employee: { companyId: actor.companyId },
      periodYear,
      periodMonth,
    },
    include: {
      employee: true,
    },
    orderBy: { employee: { firstName: "asc" } },
  });

  const headers = [
    "Employee Code",
    "Employee Name",
    "Department",
    "Pay Period",
    "Payable Days",
    "Gross Monthly",
    "PF Employee",
    "Professional Tax",
    "Total Deductions",
    "Net Pay",
  ];

  const rows = payslips.map((p) => [
    p.employee.loginId,
    `${p.employee.firstName} ${p.employee.lastName}`,
    p.employee.department || "General",
    `${periodYear}-${String(periodMonth).padStart(2, "0")}`,
    p.payableDays,
    p.grossMonthly,
    p.pfEmployee,
    p.professionalTax,
    p.totalDeductions,
    p.netPay,
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ].join("\n");

  return { ok: true, filename: `payroll_report_${periodYear}_${periodMonth}.csv`, content: csvContent };
}

/** Export CSV report for Attendance */
export async function exportAttendanceCsvAction(year: number, month: number) {
  const actor = await requireManager();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const records = await db.attendance.findMany({
    where: {
      employee: { companyId: actor.companyId },
      date: { gte: startDate, lte: endDate },
    },
    include: { employee: true },
    orderBy: [{ date: "asc" }, { employee: { firstName: "asc" } }],
  });

  const headers = [
    "Date",
    "Employee Code",
    "Employee Name",
    "Department",
    "Check In",
    "Check Out",
    "Worked Minutes",
    "Status",
    "Note",
  ];

  const rows = records.map((r) => [
    r.date.toISOString().slice(0, 10),
    r.employee.loginId,
    `${r.employee.firstName} ${r.employee.lastName}`,
    r.employee.department || "General",
    r.checkIn ? r.checkIn.toLocaleTimeString("en-IN") : "—",
    r.checkOut ? r.checkOut.toLocaleTimeString("en-IN") : "—",
    r.workedMinutes,
    r.status,
    r.note || "",
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ].join("\n");

  return { ok: true, filename: `attendance_report_${year}_${month}.csv`, content: csvContent };
}

/** Export CSV report for Time Off Requests */
export async function exportTimeOffCsvAction(year: number) {
  const actor = await requireManager();

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const requests = await db.leaveRequest.findMany({
    where: {
      employee: { companyId: actor.companyId },
      startDate: { gte: startDate, lte: endDate },
    },
    include: { employee: true, leaveType: true },
    orderBy: { startDate: "desc" },
  });

  const headers = [
    "Employee Code",
    "Employee Name",
    "Department",
    "Leave Type",
    "Start Date",
    "End Date",
    "Days",
    "Status",
    "Remarks",
    "Review Comment",
  ];

  const rows = requests.map((r) => [
    r.employee.loginId,
    `${r.employee.firstName} ${r.employee.lastName}`,
    r.employee.department || "General",
    r.leaveType.name,
    r.startDate.toISOString().slice(0, 10),
    r.endDate.toISOString().slice(0, 10),
    r.days,
    r.status,
    r.remarks || "",
    r.reviewComment || "",
  ]);

  const csvContent = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((r) => r.map(escapeCsvCell).join(",")),
  ].join("\n");

  return { ok: true, filename: `leave_requests_report_${year}.csv`, content: csvContent };
}
