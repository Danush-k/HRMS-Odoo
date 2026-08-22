"use client";

import { useState, useTransition } from "react";

import { checkInAction, checkOutAction } from "@/server/actions/attendance";

function formatCheckInTime(since: string) {
  const date = new Date(since);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/** The check in / check out systray matching wireframe Screenshot 102947. */
export function AttendanceWidget({
  checkedInSince,
  onLeaveToday,
}: {
  checkedInSince: string | null;
  onLeaveToday: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
      setShowConfirmModal(false);
    });

  return (
    <div className="flex items-center gap-2">
      {error ? <span className="hidden text-xs text-absent-soft md:inline">{error}</span> : null}

      {checkedInSince ? (
        <div className="flex items-center gap-2.5 rounded-lg border border-white/25 bg-white/12 px-2.5 py-1 backdrop-blur-xs">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-xs font-medium text-white/95 mono">
              Since {formatCheckInTime(checkedInSince)}
            </span>
          </div>
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setShowConfirmModal(true)}
            disabled={pending}
            className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-2xs transition hover:bg-brand-50 active:scale-95 disabled:opacity-60"
          >
            Check Out
          </button>
        </div>
      ) : (
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => run(checkInAction)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-2xs transition hover:bg-brand-50 active:scale-95 disabled:opacity-60"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          <span>{pending ? "Checking in…" : "Check In"}</span>
        </button>
      )}

      {/* Checkout Confirmation Centered Modal */}
      {showConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-ink-900/50 backdrop-blur-[3px] transition-opacity animate-in fade-in duration-150"
            onClick={() => !pending && setShowConfirmModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-line bg-surface p-5 text-ink-900 shadow-2xl shadow-ink-900/25 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-danger border border-danger/20">
                <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-900">Confirm Check Out</h3>
                <p className="text-xs text-ink-500 mt-0.5">End your work session for today</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-600 leading-relaxed">
              Are you sure you want to check out now? This will finalize your daily attendance record and calculate your total worked hours.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={pending}
                className="btn-secondary btn-sm rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => run(checkOutAction)}
                disabled={pending}
                className="btn-danger btn-sm rounded-lg"
              >
                {pending ? "Checking out…" : "Confirm Check Out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
