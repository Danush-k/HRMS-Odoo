"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";

import type { EmployeeNavigationMeta } from "@/lib/employee-navigation";

export function EmployeeProfileNav({
  nav,
}: {
  nav: EmployeeNavigationMeta;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Combine server metadata queryParams with any dynamic client search params (e.g. active tab)
  const currentTab = searchParams.get("tab") || nav.activeTab || "";

  const buildUrl = (targetId: string) => {
    const params = new URLSearchParams(nav.queryParams);
    if (currentTab) {
      params.set("tab", currentTab);
    } else {
      params.delete("tab");
    }
    const qs = params.toString();
    return `/employees/${targetId}${qs ? `?${qs}` : ""}`;
  };

  const prevUrl = nav.previous ? buildUrl(nav.previous.id) : null;
  const nextUrl = nav.next ? buildUrl(nav.next.id) : null;

  // Prefetch previous and next employee pages in the background
  useEffect(() => {
    if (prevUrl) router.prefetch(prevUrl);
    if (nextUrl) router.prefetch(nextUrl);
  }, [prevUrl, nextUrl, router]);

  // Keyboard navigation: Left/Right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in a form input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowLeft" && prevUrl) {
        e.preventDefault();
        startTransition(() => {
          router.push(prevUrl);
        });
      } else if (e.key === "ArrowRight" && nextUrl) {
        e.preventDefault();
        startTransition(() => {
          router.push(nextUrl);
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevUrl, nextUrl, router]);

  if (nav.total <= 1) return null;

  return (
    <div
      aria-label="Employee profile pagination"
      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface/90 px-3.5 py-2.5 shadow-xs backdrop-blur-xs transition-all"
    >
      {/* Previous Employee Button */}
      <div className="flex items-center">
        {prevUrl && nav.previous ? (
          <Link
            href={prevUrl}
            className={`group inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98] ${
              isPending ? "opacity-70" : ""
            }`}
            title={`Go to ${nav.previous.name} (← Left Arrow)`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="transition-transform group-hover:-translate-x-0.5"
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden sm:inline font-normal text-ink-500 group-hover:text-brand-600">
              Previous:
            </span>
            <span className="truncate max-w-[130px] font-bold text-ink-900 group-hover:text-brand-700">
              {nav.previous.name}
            </span>
          </Link>
        ) : (
          <div
            className="inline-flex items-center gap-1.5 rounded-lg border border-line/50 bg-canvas/40 px-2.5 py-1.5 text-xs font-medium text-ink-300 cursor-not-allowed opacity-60 select-none"
            aria-disabled="true"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden sm:inline">Previous</span>
          </div>
        )}
      </div>

      {/* Center: Position Indicator */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200/80 px-3 py-0.5 text-xs font-bold text-brand-800 mono shadow-2xs">
          <span>{nav.current}</span>
          <span className="text-brand-400">of</span>
          <span>{nav.total}</span>
        </div>
        {nav.hasFilter ? (
          <span className="text-[10px] font-medium text-ink-400 mt-0.5 tracking-tight">
            Filtered Roster
          </span>
        ) : null}
      </div>

      {/* Next Employee Button */}
      <div className="flex items-center justify-end">
        {nextUrl && nav.next ? (
          <Link
            href={nextUrl}
            className={`group inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98] ${
              isPending ? "opacity-70" : ""
            }`}
            title={`Go to ${nav.next.name} (→ Right Arrow)`}
          >
            <span className="hidden sm:inline font-normal text-ink-500 group-hover:text-brand-600">
              Next:
            </span>
            <span className="truncate max-w-[130px] font-bold text-ink-900 group-hover:text-brand-700">
              {nav.next.name}
            </span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        ) : (
          <div
            className="inline-flex items-center gap-1.5 rounded-lg border border-line/50 bg-canvas/40 px-2.5 py-1.5 text-xs font-medium text-ink-300 cursor-not-allowed opacity-60 select-none"
            aria-disabled="true"
          >
            <span className="hidden sm:inline">Next</span>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
