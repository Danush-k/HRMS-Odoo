"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/server/actions/auth";
import { Avatar } from "./ui";

export function UserMenu({
  name,
  loginId,
  roleLabel,
  avatar,
}: {
  name: string;
  loginId: string;
  roleLabel: string;
  avatar: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="group relative flex items-center rounded-full ring-2 ring-white/20 transition-all duration-150 hover:ring-white/80 active:scale-95 focus:outline-none focus:ring-white"
      >
        <Avatar src={avatar} name={name} size={34} />
        <span className="sr-only">Open the account menu</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2.5 w-64 overflow-hidden rounded-2xl border border-line/90 bg-surface p-1.5 shadow-2xl shadow-ink-950/15 backdrop-blur-xs transition-all animate-in fade-in zoom-in-95 duration-100"
        >
          {/* User Details Header Card */}
          <div className="rounded-xl bg-gradient-to-br from-brand-50/80 via-surface to-canvas px-3.5 py-3 border border-brand-100/70 mb-1">
            <div className="flex items-center gap-2.5">
              <Avatar src={avatar} name={name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink-900 leading-snug">{name}</p>
                <p className="mono mt-0.5 text-[10.5px] text-ink-500 font-medium">{loginId}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-brand-100/60">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Role</span>
              <span className="inline-flex items-center rounded-full bg-brand-100/80 px-2 py-0.5 text-[11px] font-bold text-brand-800 border border-brand-200/50">
                {roleLabel}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-1">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-ink-800 transition hover:bg-brand-50 hover:text-brand-700 active:bg-brand-100/60"
            >
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-50 text-brand-700 border border-brand-100">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span>My Profile</span>
            </Link>
          </div>

          {/* Divider */}
          <div className="my-1 border-t border-line" />

          {/* Log Out Button in Danger/Red */}
          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-danger transition hover:bg-danger-soft hover:text-danger active:bg-danger-soft/80"
            >
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-danger-soft text-danger border border-danger/20">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span>Log Out</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
