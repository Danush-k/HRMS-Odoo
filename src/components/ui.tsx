"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import type { ActionState } from "@/lib/action-state";
import { ATTENDANCE_LABEL, type AttendanceStatus, type LeaveStatus } from "@/lib/constants";

export function SubmitButton({
  children,
  className = "btn-primary",
  pendingLabel,
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
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
    <select id={name} name={name} className={`field ${error ? "field-error" : ""}`} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  name,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string; error?: string }) {
  return <textarea id={name} name={name} className={`field ${error ? "field-error" : ""}`} {...props} />;
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message && !state.notice) return null;

  const tone = state.ok
    ? "border-present/30 bg-present-soft text-present"
    : "border-danger/25 bg-danger-soft text-danger";

  return (
    <div className={`rounded-md border px-3 py-2 text-sm font-medium ${tone}`} role="status">
      {state.message}
      {state.notice ? <p className="mt-1 font-mono text-xs font-normal break-all">{state.notice}</p> : null}
    </div>
  );
}

const ATTENDANCE_TONE: Record<AttendanceStatus, string> = {
  PRESENT: "bg-present-soft text-present",
  ABSENT: "bg-absent-soft text-absent",
  HALF_DAY: "bg-brand-100 text-brand-700",
  LEAVE: "bg-leave-soft text-leave",
};

export function AttendanceChip({ status }: { status: string }) {
  const key = (status in ATTENDANCE_TONE ? status : "ABSENT") as AttendanceStatus;
  return <span className={`chip ${ATTENDANCE_TONE[key]}`}>{ATTENDANCE_LABEL[key]}</span>;
}

const LEAVE_TONE: Record<LeaveStatus, string> = {
  PENDING: "bg-absent-soft text-absent",
  APPROVED: "bg-present-soft text-present",
  REJECTED: "bg-danger-soft text-danger",
  CANCELLED: "bg-ink-100 text-ink-500",
};

export function LeaveChip({ status }: { status: string }) {
  const key = (status in LEAVE_TONE ? status : "PENDING") as LeaveStatus;
  return <span className={`chip ${LEAVE_TONE[key]}`}>{key.charAt(0) + key.slice(1).toLowerCase()}</span>;
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

  const present = status === "PRESENT" || status === "HALF_DAY";
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
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      <p className="max-w-sm text-sm text-ink-500">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
