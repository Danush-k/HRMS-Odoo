"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(str: string): Date {
  const parts = str.split("-").map(Number);
  return new Date(parts[0]!, parts[1]! - 1, parts[2] ?? 1);
}

/** Previous / next stepper plus a date or month picker, shared by the attendance views. */
export function PeriodNav({
  value,
  type,
  paramName,
}: {
  value: string;
  type: "date" | "month";
  paramName: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isAttendance = pathname.includes("/attendance");

  const go = (next: string) => {
    // If attendance, enforce future date restriction
    if (isAttendance && type === "date") {
      const targetDate = parseLocalDate(next);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      if (targetDate > today) {
        showToast("Future dates cannot be selected or viewed for attendance.");
        return;
      }
    }

    const query = new URLSearchParams(params.toString());
    query.set(paramName, next);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const step = (direction: -1 | 1) => {
    if (type === "date") {
      const date = parseLocalDate(value);
      date.setDate(date.getDate() + direction);
      go(formatLocalDate(date));
      return;
    }
    const parts = value.split("-").map(Number);
    const date = new Date(parts[0]!, parts[1]! - 1 + direction, 1);
    go(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="relative inline-flex items-center">
      {toastMessage ? (
        <div className="absolute left-0 bottom-full mb-2 z-50 flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl animate-in fade-in zoom-in-95">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="#FFC145">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      ) : null}

      <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
          aria-label="Previous period"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>

        <input
          type={type}
          value={value}
          onChange={(event) => event.target.value && go(event.target.value)}
          className="field font-semibold mono text-center py-1 px-3 text-xs border-0 bg-transparent text-ink-900 shadow-none focus:ring-0 focus:outline-none cursor-pointer"
          aria-label={type === "date" ? "Choose a day" : "Choose a month"}
        />

        <button
          type="button"
          onClick={() => step(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
          aria-label="Next period"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
