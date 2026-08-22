import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Register a company" };

export default function SignUpPage() {
  return (
    <div className="card p-7 shadow-sm">
      <h1 className="text-lg font-semibold text-ink-900">Register your company</h1>
      <p className="mt-1 text-sm text-ink-500">
        This creates the company and its first administrator. Employees do not register themselves — you add them, and
        Dayflow issues each one a Login ID and a first password.
      </p>

      <div className="mt-6">
        <SignUpForm />
      </div>

      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
