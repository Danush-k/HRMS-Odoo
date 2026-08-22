import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getCurrentUser();

  // Nothing to do: already confirmed and no link to act on.
  if (user?.emailVerifiedAt && !token) redirect("/employees");

  return (
    <AuthShell subtitle={user ? `Signed in as ${user.loginId}` : "Every workday, perfectly aligned."}>
      <div className="card p-7 shadow-sm">
        <h1 className="text-lg font-semibold text-ink-900">
          {token ? "Confirm your email address" : "Check your inbox"}
        </h1>

        <p className="mt-1 text-sm text-ink-500">
          {token
            ? "Confirm the address on this account to finish setting it up."
            : user
              ? `We sent a confirmation link to ${user.email}. Open it to unlock Dayflow.`
              : "Open the confirmation link we emailed you."}
        </p>

        <div className="mt-6">
          <VerifyEmailForm token={token} signedIn={Boolean(user)} verified={Boolean(user?.emailVerifiedAt)} />
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
