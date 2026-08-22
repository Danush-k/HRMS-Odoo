"use client";

import { useActionState, useState } from "react";

import { FormMessage, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { resetEmployeePasswordAction } from "@/server/actions/password";

/**
 * The in-person reset: for an employee who cannot reach the inbox their reset
 * link would be sent to. Requires an explicit confirmation because it signs the
 * person out of every device.
 */
export function ResetPasswordPanel({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [state, action] = useActionState(resetEmployeePasswordAction, idle);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  if (state.ok && state.notice) {
    return (
      <div className="flex flex-col gap-3">
        <FormMessage state={state} />
        <pre className="mono overflow-x-auto rounded-md border border-line bg-canvas px-4 py-3 text-sm text-ink-900">
          {state.notice}
        </pre>
        <button
          type="button"
          className="btn-secondary btn-sm self-start"
          onClick={() => {
            navigator.clipboard?.writeText(state.notice ?? "");
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy credentials"}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="employeeId" value={employeeId} />
      <FormMessage state={state} />

      <p className="text-sm text-ink-500">
        Issues a new temporary password for {employeeName} and signs them out everywhere. They must replace it the next
        time they sign in. Use this only when they cannot reach their email; otherwise send them to{" "}
        <span className="font-medium text-ink-700">Forgot your password</span> on the sign-in page.
      </p>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-absent/30 bg-absent-soft px-3 py-2.5">
          <span className="text-sm font-medium text-absent">
            Reset {employeeName}&apos;s password and sign them out of every device?
          </span>
          <div className="ml-auto flex gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <SubmitButton className="btn-danger btn-sm" pendingLabel="Resetting…">
              Yes, reset it
            </SubmitButton>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-secondary self-start" onClick={() => setConfirming(true)}>
          Reset password
        </button>
      )}
    </form>
  );
}
