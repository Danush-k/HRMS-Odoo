"use client";

import { useState } from "react";
import { daysOfMonth, formatLongDate, isoDay, startOfMonth } from "@/lib/dates";
import { LeaveChip } from "@/components/ui";

type LeaveRequestItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: Date;
  endDate: Date;
  leaveTypeName: string;
  status: string;
  colour: string;
};

/** L10 — company public holiday shown as a highlighted day on the calendar. */
export type PublicHolidayItem = { id: string; name: string; date: Date | string };

export function TimeOffCalendarView({
  requests,
  publicHolidays = [],
}: {
  requests: LeaveRequestItem[];
  publicHolidays?: PublicHolidayItem[];
}) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  // isoDay -> holiday name
  const holidayMap = new Map<string, string>();
  for (const ph of publicHolidays) {
    holidayMap.set(isoDay(ph.date), ph.name);
  }

  const monthDays = daysOfMonth(currentMonth);
  const monthTitle = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() - 1);
    setCurrentMonth(next);
  };

  const nextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + 1);
    setCurrentMonth(next);
  };

  // Build day map: isoDay -> array of leave requests active on that day
  const dayMap = new Map<string, LeaveRequestItem[]>();

  for (const day of monthDays) {
    const key = isoDay(day);
    const dayTime = day.getTime();
    const active = requests.filter((req) => {
      const s = new Date(req.startDate).setHours(0, 0, 0, 0);
      const e = new Date(req.endDate).setHours(23, 59, 59, 999);
      return dayTime >= s && dayTime <= e;
    });
    if (active.length > 0) dayMap.set(key, active);
  }

  const firstDayIndex = (monthDays[0]?.getDay() ?? 0) === 0 ? 6 : (monthDays[0]?.getDay() ?? 1) - 1;
  const paddingDays = Array.from({ length: firstDayIndex }, (_, i) => i);

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-ink-900">{monthTitle}</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={prevMonth} className="btn-secondary btn-sm">
            ← Previous
          </button>
          <button type="button" onClick={nextMonth} className="btn-secondary btn-sm">
            Next →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-ink-500 border-b border-line pb-2">
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
        <span>Sun</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {paddingDays.map((i) => (
          <div key={`pad-${i}`} className="h-24 rounded bg-surface-soft p-1 opacity-30" />
        ))}

        {monthDays.map((day) => {
          const key = isoDay(day);
          const activeRequests = dayMap.get(key) ?? [];
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const holidayName = holidayMap.get(key);
          const isHoliday = Boolean(holidayName);

          return (
            <div
              key={key}
              className={`h-24 rounded border p-1 flex flex-col justify-between transition ${
                isHoliday
                  ? "bg-purple-50 border-purple-300"
                  : isWeekend
                    ? "bg-ink-50/50 border-line/50"
                    : "bg-surface border-line"
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`font-medium ${isHoliday ? "text-purple-700" : isWeekend ? "text-ink-400" : "text-ink-800"}`}>
                  {day.getDate()}
                </span>
                {activeRequests.length > 0 ? (
                  <span className="h-2 w-2 rounded-full bg-brand-600" title={`${activeRequests.length} request(s)`} />
                ) : null}
              </div>

              {isHoliday ? (
                <span
                  className="inline-flex items-center gap-1 self-start max-w-full truncate rounded bg-brand-700 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-2xs"
                  title={holidayName}
                >
                  <svg viewBox="0 0 20 20" width="10" height="10" fill="currentColor" className="shrink-0">
                    <path fillRule="evenodd" d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l1.122 1.12A1.5 1.5 0 0014.62 4H16.5A1.5 1.5 0 0118 5.5v7a1.5 1.5 0 01-1.5 1.5h-4.879a1.5 1.5 0 01-1.06-.44l-1.122-1.12A1.5 1.5 0 008.38 12H4.5A1.5 1.5 0 013 10.5v-7zM2.25 18a.75.75 0 01.75-.75h14a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate">{holidayName}</span>
                </span>
              ) : null}

              <div className="flex flex-col gap-1 overflow-y-auto max-h-16 scrollbar-thin">
                {activeRequests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded px-1 py-0.5 text-[10px] truncate leading-tight font-medium text-white shadow-xs"
                    style={{ backgroundColor: req.colour || "#7A3E8F" }}
                    title={`${req.employeeName}: ${req.leaveTypeName} (${req.status})`}
                  >
                    <span className="block truncate">{req.employeeName}</span>
                    <span className="block opacity-90 text-[9px] truncate">{req.leaveTypeName}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
