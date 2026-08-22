import { HALF_DAY_THRESHOLD_HOURS, type AttendanceStatus } from "./constants";

export const STANDARD_WORK_HOURS = Number(process.env.STANDARD_WORK_HOURS ?? 8);

/**
 * Derives the day's status from hours actually worked (SRS 3.4.1).
 * A day already marked LEAVE by an approved request is never recomputed.
 */
export function deriveStatus(workedMinutes: number, standardHours = STANDARD_WORK_HOURS): AttendanceStatus {
  const hours = workedMinutes / 60;
  if (hours >= standardHours) return "PRESENT";
  if (hours >= HALF_DAY_THRESHOLD_HOURS) return "HALF_DAY";
  return "ABSENT";
}

/** Minutes beyond the standard day. Never negative. */
export function extraMinutes(workedMinutes: number, standardHours = STANDARD_WORK_HOURS) {
  return Math.max(0, workedMinutes - standardHours * 60);
}

/** Days that payroll should actually pay for: worked days plus paid leave. */
export function payableDays(rows: { status: string }[], paidLeaveDays: number) {
  const worked = rows.reduce((total, row) => {
    if (row.status === "PRESENT") return total + 1;
    if (row.status === "HALF_DAY") return total + 0.5;
    return total;
  }, 0);
  return worked + paidLeaveDays;
}
