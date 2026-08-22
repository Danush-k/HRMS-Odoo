export const ROLES = ["ADMIN", "HR", "EMPLOYEE"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrator",
  HR: "HR Officer",
  EMPLOYEE: "Employee",
};

/** Roles allowed to manage employees, approve time off and see salary data. */
export const MANAGER_ROLES: Role[] = ["ADMIN", "HR"];

export const ATTENDANCE_STATUS = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  HALF_DAY: "Half day",
  LEAVE: "On leave",
};

export const LEAVE_STATUS = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type LeaveStatus = (typeof LEAVE_STATUS)[number];

export const DEFAULT_LEAVE_TYPES = [
  { code: "PAID", name: "Paid Time Off", isPaid: true, defaultDays: 24, requiresAttachment: false, colour: "#7A3E8F" },
  { code: "SICK", name: "Sick Leave", isPaid: true, defaultDays: 7, requiresAttachment: true, colour: "#0E7490" },
  { code: "UNPAID", name: "Unpaid Leave", isPaid: false, defaultDays: 0, requiresAttachment: false, colour: "#B45309" },
] as const;

/** A day below this many worked hours counts as a half day rather than present. */
export const HALF_DAY_THRESHOLD_HOURS = 4;
