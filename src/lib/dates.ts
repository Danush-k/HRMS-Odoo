import {
  addDays,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  format,
  isWeekend,
  startOfDay,
  startOfMonth,
} from "date-fns";

export { addDays, endOfMonth, format, isWeekend, startOfDay, startOfMonth };

/** Normalises any timestamp to midnight so it can key an attendance row. */
export function dayKey(date: Date | string) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function isoDay(date: Date | string) {
  return format(new Date(date), "yyyy-MM-dd");
}

/**
 * Weekdays between two dates, inclusive. Weekends and company public holidays
 * (L10) are never charged to a leave balance.
 */
export function countWorkingDays(start: Date, end: Date, publicHolidays: Date[] = []) {
  if (end < start) return 0;

  const holidaySet = new Set(publicHolidays.map((h) => isoDay(h)));

  return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) })
    .filter((d) => !isWeekend(d) && !holidaySet.has(isoDay(d)))
    .length;
}

export function workingDaysInMonth(reference: Date) {
  return countWorkingDays(startOfMonth(reference), endOfMonth(reference));
}

export function daysOfMonth(reference: Date) {
  return eachDayOfInterval({ start: startOfMonth(reference), end: endOfMonth(reference) });
}

export function minutesBetween(from: Date, to: Date) {
  return Math.max(0, differenceInMinutes(to, from));
}

/** 512 -> "08:32" */
export function formatDuration(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatTime(value: Date | null | undefined) {
  return value ? format(new Date(value), "HH:mm") : "—";
}

export function formatDate(value: Date | string | null | undefined) {
  return value ? format(new Date(value), "dd/MM/yyyy") : "—";
}

export function formatLongDate(value: Date | string) {
  return format(new Date(value), "d MMMM yyyy");
}

export function inputDate(value: Date | string | null | undefined) {
  return value ? format(new Date(value), "yyyy-MM-dd") : "";
}

export function parseMonth(value: string | undefined, fallback = new Date()) {
  if (!value) return startOfMonth(fallback);
  const parsed = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? startOfMonth(fallback) : startOfMonth(parsed);
}

export function parseDay(value: string | undefined, fallback = new Date()) {
  if (!value) return startOfDay(fallback);
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? startOfDay(fallback) : startOfDay(parsed);
}

/** Every weekday in a range, normalised to midnight — the days a leave actually consumes (L10: holidays excluded). */
export function eachWorkingDay(start: Date, end: Date, publicHolidays: Date[] = []) {
  if (end < start) return [];
  const holidaySet = new Set(publicHolidays.map((h) => isoDay(h)));

  return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) }).filter(
    (d) => !isWeekend(d) && !holidaySet.has(isoDay(d)),
  );
}
