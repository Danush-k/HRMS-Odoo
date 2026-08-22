"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Field, FormMessage, Input, SubmitButton } from "@/components/ui";
import { idle } from "@/lib/action-state";
import { resetPasswordAction } from "@/server/actions/password";

const RULES = [
  { test: (v: string) => v.length >= 8, label: "8 characters" },
  { test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v), label: "Upper and lowercase" },
  { test: (v: string) => /[0-9]/.test(v), label: "A number" },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: "A symbol" },
];

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, idle);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealNew, setRevealNew] = useState(false);
  const [revealConfirm, setRevealConfirm] = useState(false);

  if (state.ok) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <Link href="/sign-in" className="btn-primary self-start">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />

      <Field label="New Password" name="newPassword" error={state.errors?.newPassword} required>
        <div className="relative">
          <Input
            name="newPassword"
            type={revealNew ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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

      <ul className="-mt-1 flex flex-wrap gap-x-4 gap-y-1">
        {RULES.map((rule) => {
          const met = rule.test(password);
          return (
            <li key={rule.label} className={`text-[11px] font-medium ${met ? "text-present" : "text-ink-400"}`}>
              {met ? "✓" : "○"} {rule.label}
            </li>
          );
        })}
      </ul>

      <Field label="Confirm Password" name="confirmPassword" error={state.errors?.confirmPassword} required>
        <div className="relative">
          <Input
            name="confirmPassword"
            type={revealConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
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

      <SubmitButton className="btn-primary w-full" pendingLabel="Updating…">
        Set new password
      </SubmitButton>
    </form>
  );
}
