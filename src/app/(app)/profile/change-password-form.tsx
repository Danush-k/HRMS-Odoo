"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { Field, FormMessage, Input, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { changePasswordAction } from "@/server/actions/auth";

export function ChangePasswordForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action] = useActionState(changePasswordAction, idle);
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [revealCurrent, setRevealCurrent] = useState(false);
  const [revealNew, setRevealNew] = useState(false);
  const [revealConfirm, setRevealConfirm] = useState(false);

  useEffect(() => {
    if (state.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (redirectTo) router.replace(redirectTo);
    }
  }, [state.ok, redirectTo, router]);

  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <FormMessage state={state} />

      <Field label="Current Password" name="currentPassword" error={state.errors?.currentPassword} required>
        <div className="relative">
          <Input
            name="currentPassword"
            type={revealCurrent ? "text" : "password"}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={state.errors?.currentPassword}
            className="pr-14"
          />
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setRevealCurrent((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-[11px] font-semibold text-ink-500 hover:text-brand-600"
          >
            {revealCurrent ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <Field
        label="New Password"
        name="newPassword"
        error={state.errors?.newPassword}
        hint="At least 8 characters, with upper and lowercase, a number and a symbol."
        required
      >
        <div className="relative">
          <Input
            name="newPassword"
            type={revealNew ? "text" : "password"}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={state.errors?.newPassword}
            className="pr-14"
          />
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setRevealNew((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-[11px] font-semibold text-ink-500 hover:text-brand-600"
          >
            {revealNew ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <Field label="Confirm Password" name="confirmPassword" error={state.errors?.confirmPassword} required>
        <div className="relative">
          <Input
            name="confirmPassword"
            type={revealConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={state.errors?.confirmPassword}
            className="pr-14"
          />
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setRevealConfirm((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-[11px] font-semibold text-ink-500 hover:text-brand-600"
          >
            {revealConfirm ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <SubmitButton className="btn-primary self-start" pendingLabel="Updating…">
        Update password
      </SubmitButton>
    </form>
  );
}

