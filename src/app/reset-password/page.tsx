import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell>
      <div className="card p-7 shadow-sm">
        <h1 className="text-lg font-semibold text-ink-900">Choose a new password</h1>
        <p className="mt-1 text-sm text-ink-500">
          Every device currently signed in as you will be signed out.
        </p>

        <div className="mt-6">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
                This link is missing its token.
              </p>
              <Link href="/forgot-password" className="btn-primary self-start">
                Request a new link
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-500">
          <Link href="/sign-in" className="font-semibold text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
