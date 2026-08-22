"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Field, FormMessage, Input, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { requestPasswordResetAction } from "@/server/actions/password";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, idle);

  if (state.ok) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <p className="hint">
          No email? Check your spam folder, or ask your HR officer to issue a new temporary password directly.
        </p>
        <Link href="/sign-in" className="btn-primary self-start">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />

      <Field label="Login ID / Email" name="identifier" error={state.errors?.identifier} required>
        <Input name="identifier" autoComplete="username" placeholder="OIJODO20220001" error={state.errors?.identifier} />
      </Field>

      <SubmitButton className="btn-primary w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
