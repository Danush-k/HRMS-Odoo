"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { idle } from "@/lib/action-state";
import { signInAction } from "@/server/actions/auth";
import { FormMessage, SubmitButton } from "@/components/ui";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, idle);
  const [reveal, setReveal] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate suppressHydrationWarning>
      <FormMessage state={state} />
      {next ? <input type="hidden" name="next" value={next} suppressHydrationWarning /> : null}

      {/* Login ID or Email */}
      <div>
        <label
          htmlFor="identifier-input"
          className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5"
        >
          Login ID / Email <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-400">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            id="identifier-input"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="Enter your Login ID or email"
            suppressHydrationWarning
            className={`field w-full pl-9 text-sm transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-200/50 ${
              state.errors?.identifier ? "border-danger ring-danger/20" : "border-line"
            }`}
            required
          />
        </div>
        {state.errors?.identifier ? (
          <p className="mt-1 text-xs text-danger font-medium">{state.errors.identifier}</p>
        ) : null}
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="password-input"
          className="block text-xs font-semibold uppercase tracking-wider text-ink-700 mb-1.5"
        >
          Password <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-400">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            id="password-input"
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            suppressHydrationWarning
            className={`field w-full pl-9 pr-10 text-sm transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-200/50 ${
              state.errors?.password ? "border-danger ring-danger/20" : "border-line"
            }`}
            required
          />
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setReveal((value) => !value)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-700 focus:outline-none"
          >
            {reveal ? (
              /* Eye-off icon */
              <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                  clipRule="evenodd"
                />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            ) : (
              /* Eye icon */
              <svg viewBox="0 0 20 20" width="17" height="17" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
        {state.errors?.password ? (
          <p className="mt-1 text-xs text-danger font-medium">{state.errors.password}</p>
        ) : null}
      </div>

      {/* Remember me & Forgot password */}
      <div className="flex items-center justify-between pt-0.5 text-xs">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none text-ink-600 hover:text-ink-800">
          <input
            type="checkbox"
            name="remember"
            suppressHydrationWarning
            className="h-4 w-4 rounded border-line text-brand-700 focus:ring-brand-500 accent-brand-700 cursor-pointer"
          />
          <span className="font-medium">Remember me</span>
        </label>
        <Link
          href="/forgot-password"
          className="font-semibold text-brand-700 hover:text-brand-800 hover:underline transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit Button */}
      <SubmitButton
        className="btn-primary mt-2 w-full py-2.5 text-sm font-semibold shadow-xs hover:shadow-sm active:scale-[0.99] transition-all"
        pendingLabel="Signing in…"
      >
        Sign In
      </SubmitButton>
    </form>
  );
}
