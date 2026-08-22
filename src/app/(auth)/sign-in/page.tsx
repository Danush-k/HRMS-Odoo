import type { Metadata } from "next";

import { AuthShell } from "@/components/auth-shell";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell className="max-w-md">
      <div className="card rounded-2xl border border-line/80 p-7 sm:p-9 shadow-lg shadow-brand-900/5 backdrop-blur-xs transition-all">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Welcome back</h1>
         
          <p className="mt-2 text-xs leading-relaxed text-ink-500 max-w-xs mx-auto">
            Use the Login ID issued by your HR officer, or your email address.
          </p>
        </div>

        {/* Form */}
        <SignInForm next={next} />
      </div>
    </AuthShell>
  );
}
