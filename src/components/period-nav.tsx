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
        <div className="absolute left-0 bottom-full mb-2 z-50 whitespace-nowrap rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg animate-in fade-in zoom-in-95">
          ⚠️ {toastMessage}
        </div>
      ) : null}

      <div className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface p-1 shadow-xs">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
          aria-label="Previous period"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <input
          type={type}
          value={value}
          onChange={(event) => event.target.value && go(event.target.value)}
          className="field font-semibold text-center py-1 px-3 text-xs border-0 bg-transparent text-ink-900 shadow-none focus:ring-0 focus:outline-none cursor-pointer"
          aria-label={type === "date" ? "Choose a day" : "Choose a month"}
        />

        <button
          type="button"
          onClick={() => step(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
          aria-label="Next period"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
