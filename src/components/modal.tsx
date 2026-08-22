"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

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
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // Save previous active element to restore focus on close
    const previousActive = document.activeElement as HTMLElement | null;

    // Move focus into the modal
    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ");

    const timer = setTimeout(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(focusableSelectors);
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 30);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key === "Tab" && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";

      // Restore focus to triggering button
      if (triggerRef.current) {
        triggerRef.current.focus();
      } else if (previousActive && typeof previousActive.focus === "function") {
        previousActive.focus();
      }
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {trigger}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-start overflow-y-auto bg-brand-900/40 px-4 py-10 backdrop-blur-[2px]"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="mx-auto w-full max-w-2xl overflow-hidden rounded-[10px] border border-line bg-surface shadow-2xl shadow-brand-900/25 focus:outline-hidden"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 id={titleId} className="text-sm font-semibold text-ink-900">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-800 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
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
