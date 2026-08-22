import Link from "next/link";
import type { ReactNode } from "react";

/** The centred, branded frame shared by pages outside the application shell. */
export function AuthShell({
  children,
  subtitle,
  className = "max-w-md",
  hideHeader = false,
}: {
  children: ReactNode;
  subtitle?: string;
  className?: string;
  hideHeader?: boolean;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12 bg-canvas">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-brand-100),transparent_65%)]"
      />

      <div className={`relative w-full ${className}`}>
        {!hideHeader ? (
          <div className="mb-7 text-center">
            <Link href="/sign-in" className="inline-block group">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand-700 font-sans group-hover:text-brand-800 transition-colors">
                Dayflow
              </span>
            </Link>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-ink-500">{subtitle ?? "Every workday, perfectly aligned."}</p>
          </div>
        ) : null}

        {children}
      </div>
    </main>
  );
}
