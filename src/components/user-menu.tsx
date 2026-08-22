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
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-[10px] border border-line bg-surface shadow-lg shadow-brand-900/10"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
            <p className="mono mt-0.5 text-[11px] text-ink-500">{loginId}</p>
            <p className="mt-1 text-[11px] font-medium text-brand-600">{roleLabel}</p>
          </div>

          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-ink-800 transition hover:bg-brand-50"
          >
            My Profile
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="w-full px-4 py-2.5 text-left text-sm text-ink-800 transition hover:bg-brand-50"
            >
              Log Out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
