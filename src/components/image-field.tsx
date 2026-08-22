"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { AvatarPickerModal } from "./avatar-picker-modal";
import { ProfileAvatar } from "./profile-avatar";
import { updateAvatarAction } from "@/server/actions/employees";

const MAX_BYTES = 1_500_000;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg"];

/**
 * Enhanced ImageField supporting:
 * 1. Dropdown menu with "Upload photo", "Choose an avatar", and "Remove photo"
 * 2. System file picker with 1.5 MB and JPG/PNG validation
 * 3. Predefined professional vector avatar modal selection
 * 4. Priority: Uploaded Photo -> Selected Avatar -> Initials
 * 5. Instant persistence via hidden form input, server action, and local cache
 */
export function ImageField({
  name,
  label = "Upload photo",
  initial,
  fallbackName,
  size = 84,
  round = true,
  employeeId,
}: {
  name: string;
  label?: string;
  initial?: string | null;
  fallbackName: string;
  size?: number;
  round?: boolean;
  employeeId?: string;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync with initial if changed externally
  useEffect(() => {
    if (initial !== undefined && initial !== null) {
      setValue(initial);
    }
  }, [initial]);

  // Local storage backup & instant server persistence
  const updateValue = (newValue: string) => {
    setValue(newValue);
    setError(null);
    if (employeeId && typeof window !== "undefined") {
      try {
        localStorage.setItem(`dayflow_avatar_${employeeId}`, newValue);
      } catch {
        // Ignore storage quota errors
      }
      // Trigger instant background sync to DB
      startTransition(async () => {
        try {
          await updateAvatarAction(employeeId, newValue);
        } catch {
          // Fallback to form submit
        }
      });
    }
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase()) && !file.type.startsWith("image/")) {
      setError("Please upload a PNG or JPG image.");
      return;
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      setError("That image is over 1.5 MB. Choose a smaller one.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      updateValue(dataUrl);
    };
    reader.onerror = () => {
      setError("Failed to read image file. Please try another.");
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    setMenuOpen(false);
    fileInputRef.current?.click();
  };

  const handleChooseAvatarClick = () => {
    setMenuOpen(false);
    setPickerOpen(true);
  };

  const handleRemoveClick = () => {
    setMenuOpen(false);
    updateValue("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasCustomAvatar = Boolean(value && value.trim().length > 0);

  return (
    <div className="flex items-center gap-4">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={value} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(event) => {
          handleFileChange(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {/* Avatar Preview */}
      {round ? (
        <ProfileAvatar
          src={value || null}
          name={fallbackName}
          size={size}
          interactive
          onClick={() => setMenuOpen((prev) => !prev)}
        />
      ) : value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          style={{ height: size, width: size }}
          className="rounded-md border border-line object-cover"
        />
      ) : (
        <span
          style={{ height: size, width: size }}
          className="grid place-items-center rounded-md border border-dashed border-ink-300 text-[11px] text-ink-400"
        >
          No logo
        </span>
      )}

      {/* Controls & Popover Dropdown */}
      <div className="relative flex flex-col items-start gap-1.5">
        <div className="relative inline-block">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="btn-secondary btn-sm flex items-center gap-1.5"
          >
            <span>{hasCustomAvatar ? "Change photo" : label}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-ink-400 transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute left-0 top-full z-40 mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-xl transition-all animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleUploadClick}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-ink-800 transition hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-100/70 text-brand-700">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                <span>{hasCustomAvatar ? "Upload new photo" : "Upload photo"}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleChooseAvatarClick}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-ink-800 transition hover:bg-brand-50 hover:text-brand-700"
              >
                <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-100/70 text-brand-700">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span>{hasCustomAvatar ? "Choose another avatar" : "Choose an avatar"}</span>
              </button>

              {hasCustomAvatar && (
                <>
                  <div className="my-1 border-t border-line" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleRemoveClick}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-danger transition hover:bg-danger-soft hover:text-danger"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-danger-soft text-danger">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </span>
                    <span>Remove current photo</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {error ? (
          <p className="error-text text-xs" role="alert">
            {error}
          </p>
        ) : (
          <p className="hint text-xs">PNG or JPG, up to 1.5 MB.</p>
        )}
      </div>

      {/* Predefined Avatar Selector Modal */}
      <AvatarPickerModal
        isOpen={pickerOpen}
        currentValue={value}
        onClose={() => setPickerOpen(false)}
        onSelect={(avatarDataUrl) => updateValue(avatarDataUrl)}
      />
    </div>
  );
}
