"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { FormMessage, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { resendVerificationAction, verifyEmailAction } from "@/server/actions/verification";

export function VerifyEmailForm({
  token,
  signedIn,
  verified,
}: {
  token?: string;
  signedIn: boolean;
  verified: boolean;
}) {
  const [verifyState, verify] = useActionState(verifyEmailAction, idle);
  const [resendState, resend] = useActionState(resendVerificationAction, idle);
  const router = useRouter();

  // Once confirmed, the layout gate stops redirecting and the app opens up.
  useEffect(() => {
    if (verifyState.ok) router.refresh();
  }, [verifyState.ok, router]);

  if (verified || verifyState.ok) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-md border border-present/30 bg-present-soft px-3 py-2 text-sm font-medium text-present">
          Email address confirmed.
        </p>
        <Link href={signedIn ? "/employees" : "/sign-in"} className="btn-primary self-start">
          {signedIn ? "Continue to Dayflow" : "Sign in"}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {token ? (
        <form action={verify} className="flex flex-col gap-4">
          <FormMessage state={verifyState} />
          <input type="hidden" name="token" value={token} />
          <SubmitButton className="btn-primary w-full" pendingLabel="Confirming…">
            Confirm email address
          </SubmitButton>
        </form>
      ) : null}

      {signedIn ? (
        <form action={resend} className="flex flex-col gap-3 border-t border-line pt-5">
          <FormMessage state={resendState} />
          <p className="hint">Nothing arrived? Check your spam folder, or send it again.</p>
          <SubmitButton className="btn-secondary self-start" pendingLabel="Sending…">
            Send a new link
          </SubmitButton>
        </form>
      ) : (
        <p className="hint border-t border-line pt-5">
          Sign in to have a new link sent to you.
        </p>
      )}
    </div>
  );
}
