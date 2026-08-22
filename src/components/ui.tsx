"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import type { ActionState } from "@/lib/action-state";
import { ATTENDANCE_LABEL, type AttendanceStatus, type LeaveStatus } from "@/lib/constants";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel,
  disabled = false,
  form,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  /** For a client-side check that must block submission even before the pending state exists. */
  disabled?: boolean;
  form?: string;
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      form={form}
      onClick={onClick}
      className={className}
      disabled={pending || disabled}
      aria-busy={pending}
      suppressHydrationWarning
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
  required,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="label" htmlFor={name}>
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="hint">{hint}</p> : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  name,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { name: string; error?: string }) {
  return (
    <input
      id={name}
      name={name}
      className={`field ${error ? "field-error" : ""}`}
      aria-invalid={error ? true : undefined}
      suppressHydrationWarning
      {...props}
    />
  );
}

export function Select({
  name,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { name: string; error?: string }) {
  return (
    <select
      id={name}
      name={name}
      className={`field ${error ? "field-error" : ""}`}
      suppressHydrationWarning
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  name,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string; error?: string }) {
  return (
    <textarea
      id={name}
      name={name}
      className={`field ${error ? "field-error" : ""}`}
      suppressHydrationWarning
      {...props}
    />
  );
}

export function FormMessage({ state }: { state: ActionState | null | undefined }) {
  if (!state?.message && !state?.notice) return null;

  const tone = state?.ok
    ? "border-present/30 bg-present-soft text-present"
    : "border-danger/30 bg-danger-soft text-danger";

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-2xs ${tone}`} role="status">
      {state.message}
      {state.notice ? <p className="mt-1 font-mono text-xs font-normal break-all">{state.notice}</p> : null}
    </div>
  );
}

export const FormNotice = FormMessage;

const ATTENDANCE_TONE: Record<AttendanceStatus, string> = {
  PRESENT: "border-present/30 bg-present-soft text-present",
  ABSENT: "border-absent/30 bg-absent-soft text-absent",
  HALF_DAY: "border-brand-300 bg-brand-50 text-brand-700",
  LEAVE: "border-leave/30 bg-leave-soft text-leave",
};

export function AttendanceChip({ status }: { status: string }) {
  const key = (status in ATTENDANCE_TONE ? status : "ABSENT") as AttendanceStatus;
  return (
    <span className={`chip border shadow-2xs ${ATTENDANCE_TONE[key]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-currentColor opacity-80" />
      <span>{ATTENDANCE_LABEL[key]}</span>
    </span>
  );
}

const LEAVE_TONE: Record<LeaveStatus, string> = {
  PENDING: "border-absent/30 bg-absent-soft text-absent",
  APPROVED: "border-present/30 bg-present-soft text-present",
  REJECTED: "border-danger/30 bg-danger-soft text-danger",
  CANCELLED: "border-line bg-ink-100/60 text-ink-500",
};

export function LeaveChip({ status }: { status: string }) {
  const key = (status in LEAVE_TONE ? status : "PENDING") as LeaveStatus;
  return (
    <span className={`chip border shadow-2xs ${LEAVE_TONE[key]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-currentColor opacity-80" />
      <span>{key.charAt(0) + key.slice(1).toLowerCase()}</span>
    </span>
  );
}

/** Green present, blue on leave, amber absent — the indicator from the wireframes. */
export function StatusDot({ status }: { status: string }) {
  if (status === "LEAVE") {
    return (
      <span title="On leave" className="inline-flex text-leave">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
        </svg>
        <span className="sr-only">On leave</span>
      </span>
    );
  }

  if (status === "HALF_DAY") {
    return (
      <span
        title="Half day in office"
        className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 ring-1 ring-amber-300"
      >
        <span className="sr-only">Half day</span>
      </span>
    );
  }

  const present = status === "PRESENT";
  return (
    <span
      title={present ? "In the office" : "Absent"}
      className={`inline-block h-2.5 w-2.5 rounded-full ${present ? "bg-present" : "bg-absent"}`}
    >
      <span className="sr-only">{present ? "In the office" : "Absent"}</span>
    </span>
  );
}

export function Avatar({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover ring-1 ring-line"
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 ring-1 ring-brand-200"
      aria-hidden="true"
    >
      {initials || "—"}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-2xs">
      <h3 className="text-base font-bold text-ink-900">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-xs text-ink-500 leading-relaxed">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
