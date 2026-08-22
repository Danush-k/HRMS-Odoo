"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { idle } from "@/lib/action-state";
import { signInAction } from "@/server/actions/auth";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, idle);
  const [reveal, setReveal] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Login ID / Email" name="identifier" error={state.errors?.identifier} required>
        <Input name="identifier" autoComplete="username" placeholder="OIJODO20220001" error={state.errors?.identifier} />
      </Field>

      <Field label="Password" name="password" error={state.errors?.password} required>
        <div className="relative">
          <Input
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            className="field pr-16"
            error={state.errors?.password}
          />
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-[11px] font-semibold text-ink-500 hover:text-brand-600"
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </div>
      </Field>

      <SubmitButton className="btn-primary mt-1 w-full" pendingLabel="Signing in…">
        Sign In
      </SubmitButton>

      <Link href="/forgot-password" className="self-center text-sm font-medium text-brand-600 hover:underline">
        Forgot your password?
      </Link>
    </form>
  );
}
