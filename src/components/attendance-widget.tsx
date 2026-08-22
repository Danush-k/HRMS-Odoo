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
        <div className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-2 py-1">
          <span className="text-xs font-medium text-white/90">
            Since {formatCheckInTime(checkedInSince)}
          </span>
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setShowConfirmModal(true)}
            disabled={pending}
            className="rounded bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
          >
            Check Out →
          </button>
        </div>
      ) : (
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => run(checkInAction)}
          disabled={pending}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
        >
          {pending ? "Checking in…" : "Check IN →"}
        </button>
      )}

      {/* Checkout Confirmation Modal */}
      {showConfirmModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-900/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-5 text-ink-900 shadow-xl">
            <h3 className="text-base font-semibold">Confirm Check Out</h3>
            <p className="mt-2 text-sm text-ink-600">
              Are you sure you want to check out for today? This will finalize your attendance record.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => run(checkOutAction)}
                disabled={pending}
                className="btn-primary btn-sm bg-danger text-white hover:bg-danger/90"
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
