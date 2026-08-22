import "server-only";

import { payableDays as derivePayableDays } from "./attendance";
import { db } from "./db";
import { eachWorkingDay, workingDaysInMonth } from "./dates";
import { computeSalary, prorate, round2, type SalaryInput } from "./salary";

/**
 * The calendar gives every company the same Monday-to-Friday count. An
 * employee configured for a different week is scaled proportionally against
 * that baseline rather than redefining which calendar days count as working
 * days — there is no per-employee calendar in this system, only a per-employee
 * multiplier on the shared one.
 */
export function totalWorkingDaysFor(monthStart: Date, employeeWorkingDaysPerWeek: number) {
  const baseline = workingDaysInMonth(monthStart);
  return round2((baseline * employeeWorkingDaysPerWeek) / 5);
}

/**
 * Paid days off in [start, end], clipped to the period and counted only on
 * days that would otherwise be working days — a leave request spanning a
 * month boundary must not credit days outside the month being paid, and a
 * weekend inside the request was never a working day to begin with.
 *
 * Unpaid leave is deliberately excluded: it still marks the day LEAVE on the
 * attendance calendar (SRS 3.5.2), but Attendance alone cannot tell paid and
 * unpaid apart, so this reads the leave type directly.
 */
async function paidLeaveDaysIn(employeeId: string, monthStart: Date, monthEnd: Date) {
  const requests = await db.leaveRequest.findMany({
    where: {
      employeeId,
      status: "APPROVED",
      leaveType: { isPaid: true },
      startDate: { lt: monthEnd },
      endDate: { gte: monthStart },
    },
    select: { startDate: true, endDate: true },
  });

  return requests.reduce((total, request) => {
    const clippedStart = request.startDate < monthStart ? monthStart : request.startDate;
    const clippedEnd = request.endDate >= monthEnd ? new Date(monthEnd.getTime() - 1) : request.endDate;
    return total + eachWorkingDay(clippedStart, clippedEnd).length;
  }, 0);
}

export type PayrollComputation = {
  totalWorkingDays: number;
  payableDays: number;
  paidLeaveDays: number;
  netPay: number;
  breakdown: ReturnType<typeof computeSalary>;
};

/**
 * Attendance and approved leave, turned into an amount actually payable for
 * one employee for one calendar month. Read-only — generatePayslip is what
 * commits the result.
 */
export async function computePayrollFor(
  employeeId: string,
  salary: SalaryInput & { workingDaysPerWeek: number },
  year: number,
  month: number,
): Promise<PayrollComputation> {
  // monthEnd is the first instant of the following month — an exclusive
  // upper bound, matching how the rest of the codebase queries a month of
  // midnight-normalised dates (see the attendance page).
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const attendanceRows = await db.attendance.findMany({
    where: { employeeId, date: { gte: monthStart, lt: monthEnd } },
    select: { status: true },
  });

  const paidLeaveDays = await paidLeaveDaysIn(employeeId, monthStart, monthEnd);
  const totalWorkingDays = totalWorkingDaysFor(monthStart, salary.workingDaysPerWeek);
  const payable = derivePayableDays(attendanceRows, paidLeaveDays);

  const breakdown = computeSalary(salary);
  const netPay = prorate(breakdown.netMonthly, payable, totalWorkingDays);

  return { totalWorkingDays, payableDays: payable, paidLeaveDays, netPay, breakdown };
}

/**
 * Computes and writes the frozen record for one employee, one month.
 * Idempotent by design (see the Payslip model) — regenerating the same period
 * overwrites it, so correcting attendance and re-running payroll is always
 * safe.
 */
export async function generatePayslip(employeeId: string, year: number, month: number, generatedById: string) {
  const employee = await db.employee.findUniqueOrThrow({ where: { id: employeeId }, include: { salary: true } });
  if (!employee.salary) throw new Error(`${employee.firstName} ${employee.lastName} has no salary structure configured.`);

  const result = await computePayrollFor(employeeId, employee.salary, year, month);
  const { breakdown } = result;

  return db.payslip.upsert({
    where: { employeeId_periodYear_periodMonth: { employeeId, periodYear: year, periodMonth: month } },
    create: {
      employeeId,
      periodYear: year,
      periodMonth: month,
      monthlyWage: breakdown.monthlyWage,
      basic: breakdown.basic,
      grossMonthly: breakdown.grossMonthly,
      pfEmployee: breakdown.pfEmployee,
      pfEmployer: breakdown.pfEmployer,
      professionalTax: breakdown.professionalTax,
      totalDeductions: breakdown.totalDeductions,
      componentsJson: JSON.stringify(breakdown.components),
      totalWorkingDays: result.totalWorkingDays,
      payableDays: result.payableDays,
      paidLeaveDays: result.paidLeaveDays,
      netPay: result.netPay,
      generatedById,
    },
    update: {
      monthlyWage: breakdown.monthlyWage,
      basic: breakdown.basic,
      grossMonthly: breakdown.grossMonthly,
      pfEmployee: breakdown.pfEmployee,
      pfEmployer: breakdown.pfEmployer,
      professionalTax: breakdown.professionalTax,
      totalDeductions: breakdown.totalDeductions,
      componentsJson: JSON.stringify(breakdown.components),
      totalWorkingDays: result.totalWorkingDays,
      payableDays: result.payableDays,
      paidLeaveDays: result.paidLeaveDays,
      netPay: result.netPay,
      generatedById,
      generatedAt: new Date(),
    },
  });
}
