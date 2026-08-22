"use client";

import { useActionState, useState } from "react";

import { idle } from "@/lib/action-state";
import { signUpAction } from "@/server/actions/auth";
import { ImageField } from "@/components/image-field";
import { Field, FormMessage, Input, SubmitButton } from "@/components/ui";

const RULES = [
  { test: (v: string) => v.length >= 8, label: "8 characters" },
  { test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v), label: "Upper and lowercase" },
  { test: (v: string) => /[0-9]/.test(v), label: "A number" },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: "A symbol" },
];

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, idle);
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [companyName, setCompanyName] = useState("");

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />

      <Field label="Company Name" name="companyName" error={state.errors?.companyName} required>
        <Input
          name="companyName"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Odoo India"
          error={state.errors?.companyName}
        />
      </Field>

      <div className="rounded-md border border-line bg-canvas p-3">
        <ImageField name="logo" label="Upload Logo" fallbackName={companyName || "Company"} size={56} round={false} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First Name" name="firstName" error={state.errors?.firstName} required>
          <Input name="firstName" autoComplete="given-name" error={state.errors?.firstName} />
        </Field>
        <Field label="Last Name" name="lastName" error={state.errors?.lastName} required>
          <Input name="lastName" autoComplete="family-name" error={state.errors?.lastName} />
        </Field>
      </div>

      <Field label="Email" name="email" error={state.errors?.email} required>
        <Input name="email" type="email" autoComplete="email" error={state.errors?.email} />
      </Field>

      <Field label="Phone" name="phone" error={state.errors?.phone} required>
        <Input name="phone" type="tel" autoComplete="tel" error={state.errors?.phone} />
      </Field>

      <Field label="Password" name="password" error={state.errors?.password} required>
        <div className="relative">
          <Input
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            className="field pr-16"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
        <Input
          name="confirmPassword"
          type={reveal ? "text" : "password"}
          autoComplete="new-password"
          error={state.errors?.confirmPassword}
        />
      </Field>

      <SubmitButton className="btn-primary mt-1 w-full" pendingLabel="Creating your company…">
        Sign Up
      </SubmitButton>
    </form>
  );
}
