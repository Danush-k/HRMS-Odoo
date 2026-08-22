"use client";

import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { cancelLeaveAction, reviewLeaveAction } from "@/server/actions/timeoff";

/** Approve is one click; rejecting requires a reason before it will submit. */
export function ReviewButtons({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(reviewLeaveAction, idle);
  const [rejecting, setRejecting] = useState(false);

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="requestId" value={requestId} />

      {rejecting ? (
        <div className="flex w-64 flex-col gap-2">
          <textarea
            name="comment"
            rows={2}
            required
            autoFocus
            placeholder="Why is this rejected?"
            className="field text-sm"
            aria-label="Rejection comment"
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={() => setRejecting(false)}>
              Cancel
            </button>
            <SubmitButton className="btn-danger btn-sm" pendingLabel="Rejecting…">
              Confirm reject
            </SubmitButton>
          </div>
          <input type="hidden" name="decision" value="REJECTED" />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary btn-sm rounded-lg hover:border-danger/40 hover:bg-danger-soft hover:text-danger transition-all active:scale-[0.98]"
            onClick={() => setRejecting(true)}
            aria-label="Reject this request"
          >
            Reject
          </button>
          <button
            type="submit"
            name="decision"
            value="APPROVED"
            className="btn-primary btn-sm rounded-lg transition-all active:scale-[0.98]"
            aria-label="Approve this request"
          >
            Approve
          </button>
        </div>
      )}

      {state.message && !state.ok ? <p className="error-text max-w-56 text-right">{state.message}</p> : null}
    </form>
  );
}

export function CancelButton({ requestId }: { requestId: string }) {
  const [state, action] = useActionState(cancelLeaveAction, idle);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton className="btn-secondary btn-sm" pendingLabel="Cancelling…">
        Cancel
      </SubmitButton>
      {state.message && !state.ok ? <p className="error-text">{state.message}</p> : null}
    </form>
  );
}
