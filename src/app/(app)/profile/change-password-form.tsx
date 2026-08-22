"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { Field, FormMessage, Input, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { changePasswordAction } from "@/server/actions/auth";

export function ChangePasswordForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action] = useActionState(changePasswordAction, idle);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && redirectTo) router.replace(redirectTo);
  }, [state.ok, redirectTo, router]);

  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <FormMessage state={state} />

      <Field label="Current Password" name="currentPassword" error={state.errors?.currentPassword} required>
        <Input name="currentPassword" type="password" autoComplete="current-password" error={state.errors?.currentPassword} />
      </Field>

      <Field
        label="New Password"
        name="newPassword"
        error={state.errors?.newPassword}
        hint="At least 8 characters, with upper and lowercase, a number and a symbol."
        required
      >
        <Input name="newPassword" type="password" autoComplete="new-password" error={state.errors?.newPassword} />
      </Field>

      <Field label="Confirm Password" name="confirmPassword" error={state.errors?.confirmPassword} required>
        <Input name="confirmPassword" type="password" autoComplete="new-password" error={state.errors?.confirmPassword} />
      </Field>

      <SubmitButton className="btn-primary self-start" pendingLabel="Updating…">
        Update password
      </SubmitButton>
    </form>
  );
}
