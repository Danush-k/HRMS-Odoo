"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Complete the loader when navigation completes
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Listen to in-app link clicks to start the loader immediately
  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("/#") &&
        !target.hasAttribute("download") &&
        target.target !== "_blank" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        const currentUrl = window.location.pathname + window.location.search;
        if (href !== currentUrl) {
          setLoading(true);
          setProgress(25);
          const t1 = setTimeout(() => setProgress((p) => (p < 70 ? 70 : p)), 120);
          const t2 = setTimeout(() => setProgress((p) => (p < 88 ? 88 : p)), 280);
          return () => {
            clearTimeout(t1);
            clearTimeout(t2);
          };
        }
      }
    };

    document.addEventListener("click", handleAnchorClick, true);
    return () => document.removeEventListener("click", handleAnchorClick, true);
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 top-0 z-[99999] h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-brand-700 via-brand-500 to-brand-400 shadow-[0_0_12px_rgba(122,62,110,0.8),0_0_6px_rgba(166,115,154,0.9)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? "width 0.2s ease-out, opacity 0.35s ease-out 0.1s"
              : "width 0.35s cubic-bezier(0.1, 0.9, 0.2, 1)",
        }}
      />
    </div>
  );
}
