"use client";

import { useActionState, useState } from "react";

import { FormMessage, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { runPayrollAction } from "@/server/actions/payroll";

/**
 * Generates every active employee's payslip for the month shown by the page
 * above it. Confirmed explicitly because running it again for a month already
 * generated overwrites what's there — see Payslip in the schema for why that's
 * the intended behaviour, not a hazard to hide.
 */
export function RunPayrollForm({ year, month, label }: { year: number; month: number; label: string }) {
  const [state, action] = useActionState(runPayrollAction, idle);
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />

      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-600">Run payroll for {label}?</span>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirming(false)}>
            Cancel
          </button>
          <SubmitButton className="btn-primary btn-sm" pendingLabel="Running…">
            Confirm
          </SubmitButton>
        </div>
      ) : (
        <button type="button" className="btn-primary" onClick={() => setConfirming(true)}>
          Run payroll for {label}
        </button>
      )}

      <div className="max-w-sm text-right">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
