import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Register a company" };

export default function SignUpPage() {
  return (
    <AuthShell className="max-w-xl">
      <div className="card rounded-2xl border border-line/80 p-7 sm:p-9 shadow-lg shadow-brand-900/5 backdrop-blur-xs transition-all">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight text-ink-900">Register your company</h1>
          <p className="mt-1.5 text-xs text-ink-500 max-w-sm mx-auto leading-relaxed">
            Create your organization and primary admin account. Employees receive login credentials upon onboarding.
          </p>
        </div>

        <div className="mt-6">
          <SignUpForm />
        </div>

        <div className="mt-6 border-t border-line/70 pt-5 text-center">
          <p className="text-xs text-ink-500">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-brand-700 hover:text-brand-800 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
