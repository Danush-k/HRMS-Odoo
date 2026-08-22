"use client";

import { Avatar } from "./ui";

/**
 * ProfileAvatar implements the display priority:
 * 1. Uploaded Profile Photo / Custom Avatar (data URL)
 * 2. Selected Predefined Vector Avatar
 * 3. User Initials fallback
 */
export function ProfileAvatar({
  src,
  name,
  size = 40,
  className = "",
  onClick,
  interactive = false,
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const content = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full object-cover ring-1 ring-line ${className}`}
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-1 ring-brand-200 ${className}`}
      aria-hidden="true"
    >
      {initials || "—"}
    </span>
  );

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group relative cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        aria-label={`Change profile photo for ${name}`}
      >
        {content}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-900/40 opacity-0 transition-opacity group-hover:opacity-100">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
      </button>
    );
  }

  return content;
}
