"use client";

import { useEffect, useState, type ReactNode } from "react";

export function Modal({
  trigger,
  title,
  children,
  triggerClassName = "btn-primary",
}: {
  trigger: ReactNode;
  title: string;
  children: (close: () => void) => ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", escape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        {trigger}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-start overflow-y-auto bg-brand-900/40 px-4 py-10 backdrop-blur-[2px]"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="mx-auto w-full max-w-2xl overflow-hidden rounded-[10px] border border-line bg-surface shadow-2xl shadow-brand-900/25"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-800"
                aria-label="Close"
              >
                <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-5">{children(() => setOpen(false))}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
