"use client";

import { useEffect, useState, useTransition } from "react";

import { checkInAction, checkOutAction } from "@/server/actions/attendance";

function elapsed(since: string) {
  const ms = Date.now() - new Date(since).getTime();
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

/** The check in / check out systray from the wireframes. */
export function AttendanceWidget({
  checkedInSince,
  onLeaveToday,
}: {
  checkedInSince: string | null;
  onLeaveToday: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(() => (checkedInSince ? elapsed(checkedInSince) : "00:00:00"));

  useEffect(() => {
    if (!checkedInSince) return;
    setTimer(elapsed(checkedInSince));
    const id = setInterval(() => setTimer(elapsed(checkedInSince)), 1000);
    return () => clearInterval(id);
  }, [checkedInSince]);

  if (onLeaveToday) {
    return (
      <span className="hidden rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 sm:inline-flex">
        On approved leave today
      </span>
    );
  }

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) =>
    start(async () => {
      const result = await action();
      setError(result.ok ? null : (result.message ?? "Something went wrong."));
    });

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="hidden text-xs text-absent-soft md:inline">{error}</span> : null}

      {checkedInSince ? (
        <div className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-2 py-1">
          <span className="hidden text-[11px] text-white/70 sm:inline">Since</span>
          <span className="mono text-xs font-semibold text-white tabular-nums">{timer}</span>
          <button
            type="button"
            onClick={() => run(checkOutAction)}
            disabled={pending}
            className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
          >
            Check Out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => run(checkInAction)}
          disabled={pending}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
        >
          {pending ? "Checking in…" : "Check In →"}
        </button>
      )}
    </div>
  );
}
