"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

  const go = (next: string) => {
    const query = new URLSearchParams(params.toString());
    query.set(paramName, next);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const step = (direction: -1 | 1) => {
    if (type === "date") {
      const date = new Date(`${value}T00:00:00`);
      date.setDate(date.getDate() + direction);
      go(date.toISOString().slice(0, 10));
      return;
    }
    const date = new Date(`${value}-01T00:00:00`);
    date.setMonth(date.getMonth() + direction);
    go(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center rounded-lg border border-line bg-surface p-0.5 shadow-2xs">
        <button
          type="button"
          onClick={() => step(-1)}
          className="rounded-md p-1.5 text-ink-600 hover:bg-brand-50 hover:text-brand-700 transition active:scale-95"
          aria-label="Previous period"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          className="rounded-md p-1.5 text-ink-600 hover:bg-brand-50 hover:text-brand-700 transition active:scale-95"
          aria-label="Next period"
        >
          <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <input
        type={type}
        value={value}
        onChange={(event) => event.target.value && go(event.target.value)}
        className="field w-auto py-1 px-2.5 text-xs font-semibold mono rounded-lg"
        aria-label={type === "date" ? "Choose a day" : "Choose a month"}
      />
    </div>
  );
}
