import Link from "next/link";
import type { ReactNode } from "react";

/** The centred, branded frame shared by pages outside the application shell. */
export function AuthShell({
  children,
  className = "max-w-md",
  hideHeader = false,
}: {
  children: ReactNode;
  subtitle?: string;
  className?: string;
  hideHeader?: boolean;
}) {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-x-hidden bg-[#F6F3F7] px-4 py-8 sm:px-6 sm:py-12">
      {/* Odoo Signature Arch Curve Background with soft shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 top-[220px] sm:top-[240px] z-0 overflow-hidden"
      >
        {/* Soft curve drop shadow */}
        <div
          className="absolute inset-x-0 top-0 h-16 w-full -translate-y-2 bg-gradient-to-b from-brand-900/5 to-transparent blur-md pointer-events-none"
        />
        {/* SVG Signature Convex Arch */}
        <svg
          viewBox="0 0 1440 180"
          fill="none"
          preserveAspectRatio="none"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[160vw] max-w-none h-28 sm:h-36 text-white drop-shadow-[0_-14px_28px_rgba(113,75,103,0.08)]"
        >
          <path
            d="M0,180 Q720,0 1440,180 L1440,180 L0,180 Z"
            fill="currentColor"
          />
        </svg>
        {/* White bottom fill below arch */}
        <div className="absolute inset-x-0 top-24 sm:top-32 bottom-0 bg-white" />
      </div>

      {/* Ambient top radial brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_30rem_at_50%_0%,rgba(113,75,103,0.09),transparent_70%)] z-0"
      />

      <div className={`relative z-10 w-full ${className}`}>
        {!hideHeader ? (
          <div className="mb-6 text-center">
            {/* Capitalized DayFlow Wordmark */}
            <Link href="/sign-in" className="inline-block group mb-3">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-brand-700 font-['Space_Grotesk',sans-serif] group-hover:text-brand-800 transition-colors">
                DayFlow
              </span>
            </Link>

            {/* Odoo Style Playful Handwritten Headline */}
            <div className="font-['Caveat',cursive] leading-tight select-none">
              <h2 className="text-2xl sm:text-3xl font-bold text-ink-900">
                All your workforce on{" "}
                <span className="relative inline-block px-2.5 py-0.5 bg-[#FFC145] text-ink-950 rounded-md -rotate-1 shadow-2xs font-extrabold">
                  one platform.
                </span>
              </h2>
              <p className="text-xl sm:text-2xl font-bold text-ink-800 mt-1">
                Simple, efficient, yet{" "}
                <span className="relative inline-block text-ink-950 font-extrabold">
                  affordable!
                  {/* Sky blue doodle underline */}
                  <svg
                    className="absolute -bottom-1.5 left-0 w-full h-2 text-[#00A8FF]"
                    viewBox="0 0 100 20"
                    preserveAspectRatio="none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  >
                    <path d="M 2,12 Q 50,18 98,8" />
                  </svg>
                </span>
              </p>
            </div>
          </div>
        ) : null}

        <div className="relative">
          {children}

          {/* Odoo-style bottom right curved handwritten note & sketch arrow */}
          <div className="hidden sm:flex absolute -bottom-10 -right-28 sm:-right-36 lg:-right-44 items-center gap-1.5 pointer-events-none select-none -rotate-6">
            <svg
              viewBox="0 0 100 80"
              className="w-12 h-10 text-brand-700 shrink-0 stroke-current -scale-y-100"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Curved hand-drawn arrow */}
              <path d="M 10,70 Q 50,20 85,35" />
              <path d="M 72,25 L 85,35 L 78,50" />
            </svg>
            <span className="font-['Caveat',cursive] text-lg sm:text-xl font-bold text-brand-800 whitespace-nowrap">
              HR, Attendance & Payroll in sync!
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
