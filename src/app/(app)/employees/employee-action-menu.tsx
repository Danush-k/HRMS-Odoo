"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function EmployeeActionMenu({ employeeId }: { employeeId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-700 active:scale-95"
        title="Actions"
        aria-label="Actions"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-40 mt-1 w-48 rounded-xl border border-line bg-surface p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100 text-left">
          <Link
            href={`/employees/${employeeId}`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-800 hover:bg-brand-50 hover:text-brand-700 transition"
            onClick={() => setIsOpen(false)}
          >
            <svg className="h-4 w-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>View Profile</span>
          </Link>

          <Link
            href={`/employees/${employeeId}`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink-800 hover:bg-brand-50 hover:text-brand-700 transition"
            onClick={() => setIsOpen(false)}
          >
            <svg className="h-4 w-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Details / Resume</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
