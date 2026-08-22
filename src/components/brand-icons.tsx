import type { SVGProps } from "react";

/**
 * Modern geometric translucent vector logos in Dayflow's Teal & Plum palette
 * Inspired by modern Odoo 17/18 enterprise design language.
 */

export function DayflowLogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Dayflow Brand Mark"
    >
      <rect x="16" y="16" width="46" height="46" rx="14" fill="#00C4B4" />
      <rect x="38" y="38" width="46" height="46" rx="14" fill="#7A3E6E" />
      {/* Intersection blend */}
      <rect x="38" y="38" width="24" height="24" rx="6" fill="#0E6070" opacity="0.9" />
    </svg>
  );
}

/**
 * Employees / Team Logo: Handshake geometric badge (Teal & Plum)
 */
export function EmployeesLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Employees / Organization Module Logo"
    >
      {/* Top right plum wing */}
      <path
        d="M52 26C52 26 58 18 68 18L84 18C89.5 18 93 23.5 90 28.5L66 68C63 73 57 73 54 68L48 58L52 26Z"
        fill="#7A3E6E"
      />
      {/* Top left teal wing */}
      <path
        d="M10 28.5C7 23.5 10.5 18 16 18L56 18C61.5 18 65 22.5 62 27.5L42 62C39 67 33 67 30 62L10 28.5Z"
        fill="#00C4B4"
      />
      {/* Interlocking rounded clasp (Plum) */}
      <rect
        x="32"
        y="42"
        width="22"
        height="44"
        rx="11"
        transform="rotate(-45 32 42)"
        fill="#7A3E6E"
      />
      {/* Interlocking rounded clasp (Teal) */}
      <rect
        x="44"
        y="22"
        width="22"
        height="44"
        rx="11"
        transform="rotate(-45 44 22)"
        fill="#00C4B4"
      />
      {/* Intersection shadow / depth */}
      <rect
        x="38"
        y="32"
        width="16"
        height="24"
        rx="8"
        transform="rotate(-45 38 32)"
        fill="#0E6070"
        opacity="0.85"
      />
    </svg>
  );
}

/**
 * Time Off / Leaves Logo: Overlapping Bookmark Ribbons (Teal & Plum)
 */
export function TimeOffLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Time Off Module Logo"
    >
      {/* Back/Right Ribbon (Teal) */}
      <path
        d="M38 12H72C75.3137 12 78 14.6863 78 18V70L58 58L38 70V12Z"
        fill="#00C4B4"
      />
      {/* Front/Left Ribbon (Plum) */}
      <path
        d="M22 28H56C59.3137 28 62 30.6863 62 34V86L42 74L22 86V28Z"
        fill="#7A3E6E"
      />
      {/* Overlapping translucent intersection */}
      <path
        d="M38 28H56C59.3137 28 62 30.6863 62 34V70L58 58L38 70V28Z"
        fill="#0E6070"
        opacity="0.9"
      />
    </svg>
  );
}

/**
 * Attendance Logo: Overlapping Badge with Time/Presence Indicator
 */
export function AttendanceLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Attendance Module Logo"
    >
      {/* Back Shield (Teal) */}
      <rect x="22" y="16" width="46" height="56" rx="16" fill="#00C4B4" />
      {/* Front Shield (Plum) */}
      <rect x="36" y="28" width="46" height="56" rx="16" fill="#7A3E6E" />
      {/* Translucent Overlap */}
      <rect x="36" y="28" width="32" height="44" rx="12" fill="#0E6070" opacity="0.9" />
      {/* Clock Hands in White */}
      <circle cx="52" cy="50" r="14" fill="white" opacity="0.9" />
      <path
        d="M52 42V50L57 54"
        stroke="#7A3E6E"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Payroll Logo: Overlapping Currency & Ledger Cards (Teal & Plum)
 */
export function PayrollLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Payroll Module Logo"
    >
      {/* Back Card (Teal) */}
      <rect
        x="18"
        y="26"
        width="54"
        height="38"
        rx="10"
        transform="rotate(-8 18 26)"
        fill="#00C4B4"
      />
      {/* Front Card (Plum) */}
      <rect
        x="28"
        y="36"
        width="54"
        height="38"
        rx="10"
        transform="rotate(6 28 36)"
        fill="#7A3E6E"
      />
      {/* Currency Center Emblem */}
      <circle cx="52" cy="54" r="13" fill="#0E6070" opacity="0.9" />
      <circle cx="52" cy="54" r="10" fill="white" opacity="0.95" />
      <text
        x="52"
        y="58.5"
        textAnchor="middle"
        fontSize="11"
        fontWeight="bold"
        fontFamily="sans-serif"
        fill="#7A3E6E"
      >
        ₹
      </text>
    </svg>
  );
}

/**
 * Audit Logs Logo: Overlapping Security Shield & Log Document (Teal & Plum)
 */
export function AuditLogsLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Audit Logs Module Logo"
    >
      <rect x="20" y="18" width="46" height="58" rx="12" fill="#00C4B4" />
      <rect x="36" y="28" width="46" height="58" rx="12" fill="#7A3E6E" />
      <rect x="36" y="28" width="30" height="48" rx="8" fill="#0E6070" opacity="0.9" />
      {/* Document Lines */}
      <rect x="42" y="40" width="18" height="3" rx="1.5" fill="white" opacity="0.9" />
      <rect x="42" y="48" width="24" height="3" rx="1.5" fill="white" opacity="0.9" />
      <rect x="42" y="56" width="14" height="3" rx="1.5" fill="white" opacity="0.9" />
    </svg>
  );
}
