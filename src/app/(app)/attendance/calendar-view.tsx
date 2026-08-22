"use client";

import { useState } from "react";
import { daysOfMonth, formatDuration, isoDay, startOfMonth } from "@/lib/dates";
import { AttendanceChip } from "@/components/ui";

type AttendanceRow = {
  id: string;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  workedMinutes: number;
  status: string;
  note: string | null;
};

export function EmployeeAttendanceCalendar({ rows }: { rows: AttendanceRow[] }) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

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

  // Map isoDay -> AttendanceRow
  const dayMap = new Map<string, AttendanceRow>();
  for (const row of rows) {
    dayMap.set(isoDay(row.date), row);
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
          <div key={`pad-${i}`} className="h-20 rounded bg-surface-soft p-1 opacity-30" />
        ))}

        {monthDays.map((day) => {
          const key = isoDay(day);
          const row = dayMap.get(key);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={key}
              className={`h-20 rounded border p-1.5 flex flex-col justify-between transition ${
                isWeekend ? "bg-ink-50/50 border-line/50" : "bg-surface border-line"
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`font-medium ${isWeekend ? "text-ink-400" : "text-ink-800"}`}>
                  {day.getDate()}
                </span>
                {row ? <AttendanceChip status={row.status} /> : null}
              </div>

              {row ? (
                <div className="flex flex-col text-[10px] text-ink-500 font-mono">
                  <span>Worked: {formatDuration(row.workedMinutes)}</span>
                  {row.note ? <span className="truncate opacity-75">{row.note}</span> : null}
                </div>
              ) : (
                <span className="text-[10px] text-ink-300">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
