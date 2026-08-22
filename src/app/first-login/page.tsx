import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/app/(app)/profile/change-password-form";

export const metadata: Metadata = { title: "Set your password" };

/** Employees created by HR arrive here once, to replace the system-issued password. */
export default async function FirstLoginPage() {
  const user = await requireUser();
  if (!user.mustChangePassword) redirect("/employees");

  return (
    <main className="relative grid min-h-screen place-items-center px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-brand-100),transparent_65%)]"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center">
          <span style={{ fontFamily: "var(--font-display)" }} className="text-4xl leading-none text-brand-700">
            Dayflow
          </span>
          <p className="mt-1.5 text-sm text-ink-500">Welcome, {user.firstName}.</p>
        </div>

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
      </div>
    </main>
  );
}
