import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="card p-7 shadow-sm">
      <h1 className="text-lg font-semibold text-ink-900">Sign in</h1>
      <p className="mt-1 text-sm text-ink-500">Use the Login ID issued by your HR officer, or your email address.</p>

      <div className="mt-6">
        <SignInForm />
      </div>

      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-500">
        Registering a company?{" "}
        <Link href="/sign-up" className="font-semibold text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
