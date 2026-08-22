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
        className="flex items-center rounded-full ring-2 ring-transparent transition hover:ring-white/40"
      >
        <Avatar src={avatar} name={name} size={32} />
        <span className="sr-only">Open the account menu</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-2xl shadow-ink-900/15 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="border-b border-line px-3.5 py-3 mb-1">
            <p className="truncate text-sm font-bold text-ink-900">{name}</p>
            <p className="mono mt-0.5 text-xs text-ink-500">{loginId}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-800 border border-brand-200/80 uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
          </div>

          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-brand-50 hover:text-brand-800"
          >
            <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" className="text-ink-400">
              <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
            </svg>
            <span>My Profile</span>
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger-soft hover:text-danger"
            >
              <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" className="text-danger/70">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l2.47-2.47a.75.75 0 10-1.06-1.06l-3.75 3.75a.75.75 0 000 1.06l3.75 3.75a.75.75 0 101.06-1.06l-2.47-2.47H18.25A.75.75 0 0019 10z" clipRule="evenodd" />
              </svg>
              <span>Log Out</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
