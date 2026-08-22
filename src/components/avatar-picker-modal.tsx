"use client";

import { useEffect, useRef } from "react";
import { AVATAR_PRESETS, type AvatarPreset } from "@/lib/avatar-presets";

export function AvatarPickerModal({
  isOpen,
  currentValue,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  currentValue?: string | null;
  onClose: () => void;
  onSelect: (dataUrl: string) => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  // Focus trap, Escape key, and focus restoration
  useEffect(() => {
    if (!isOpen) return;

    previousActiveRef.current = document.activeElement as HTMLElement | null;

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
        if (firstFocusable) firstFocusable.focus();
        else modalRef.current.focus();
      }
    }, 30);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (previousActiveRef.current && typeof previousActiveRef.current.focus === "function") {
        previousActiveRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-picker-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-2xl transition-all animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="avatar-picker-title" className="text-base font-semibold text-ink-900 sm:text-lg">
              Choose your avatar
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              Select a professional photo for your Dayflow profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close avatar picker"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Grid of Avatars - 2 options (Male & Female) */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {AVATAR_PRESETS.map((preset: AvatarPreset) => {
              const isSelected = currentValue === preset.dataUrl;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelect(preset.dataUrl);
                    onClose();
                  }}
                  className={`group relative flex flex-col items-center rounded-xl border p-4 text-center transition-all focus:outline-none ${
                    isSelected
                      ? "border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/30 shadow-sm"
                      : "border-line bg-surface hover:border-brand-300 hover:bg-brand-50/20 hover:shadow-xs"
                  }`}
                >
                  <div className="relative mb-3 h-24 w-24 overflow-hidden rounded-full ring-2 ring-line transition-transform duration-150 group-hover:scale-105 sm:h-28 sm:w-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.dataUrl}
                      alt={preset.name}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center bg-brand-900/20">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white shadow-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-ink-900 group-hover:text-brand-700">
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-line bg-canvas/40 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary btn-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
