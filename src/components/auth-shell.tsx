import Link from "next/link";
import type { ReactNode } from "react";
import { DayflowLogoMark } from "./brand-icons";

/** The centred, branded frame shared by every page outside the application shell. */
export function AuthShell({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-brand-100),transparent_65%)]"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-7 text-center flex flex-col items-center">
          <Link href="/sign-in" className="inline-flex flex-col items-center gap-2 group">
            <DayflowLogoMark size={48} className="rounded-2xl shadow-md transition-transform group-hover:scale-105" />
            <span
              style={{ fontFamily: "var(--font-display)" }}
              className="text-4xl leading-none tracking-tight text-brand-700 mt-1"
            >
              Dayflow
            </span>
          </Link>
          <p className="mt-1.5 text-sm text-ink-500">{subtitle ?? "Every workday, perfectly aligned."}</p>
        </div>

        {children}
      </div>
    </main>
  );
}
