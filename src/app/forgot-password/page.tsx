import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="card p-7 shadow-sm">
        <h1 className="text-lg font-semibold text-ink-900">Forgot your password</h1>
        <p className="mt-1 text-sm text-ink-500">
          Enter your Login ID or email address and we will send you a link to choose a new password.
        </p>

        <div className="mt-6">
          <ForgotPasswordForm />
        </div>

        <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-500">
          Remembered it?{" "}
          <Link href="/sign-in" className="font-semibold text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
