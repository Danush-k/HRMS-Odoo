import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/app/(app)/profile/change-password-form";

export const metadata: Metadata = { title: "Set your password" };

/** Employees created by HR arrive here once, to replace the system-issued password. */
export default async function FirstLoginPage() {
  const user = await requireUser();
  if (!user.mustChangePassword) redirect("/employees");

  return (
    <AuthShell subtitle={`Welcome, ${user.firstName}.`}>
      <div className="card p-7 shadow-sm">
        <h1 className="text-lg font-semibold text-ink-900">Choose your own password</h1>
        <p className="mt-1 text-sm text-ink-500">
          Your Login ID is <span className="mono font-semibold text-brand-700">{user.loginId}</span>. Replace the
          temporary password before you continue.
        </p>
        <div className="mt-6">
          <ChangePasswordForm redirectTo="/employees" />
        </div>
      </div>
    </AuthShell>
  );
}
