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
      <button type="button" onClick={() => step(-1)} className="btn-secondary btn-sm" aria-label="Previous period">
        ←
      </button>
      <button type="button" onClick={() => step(1)} className="btn-secondary btn-sm" aria-label="Next period">
        →
      </button>
      <input
        type={type}
        value={value}
        onChange={(event) => event.target.value && go(event.target.value)}
        className="field w-auto py-1.5 text-sm"
        aria-label={type === "date" ? "Choose a day" : "Choose a month"}
      />
    </div>
  );
}
