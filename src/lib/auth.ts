import "server-only";

import { redirect } from "next/navigation";

import { MANAGER_ROLES, type Role } from "./constants";
import { db } from "./db";
import { readSession } from "./session";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * Signs every device out for one employee by moving their session cut-off
 * forward. Callers that want to keep the current device signed in must issue a
 * fresh session afterwards.
 */
export async function revokeSessions(employeeId: string) {
  await db.employee.update({ where: { id: employeeId }, data: { sessionsValidFrom: new Date() } });
}

export async function getCurrentUser() {
  const session = await readSession();
  if (!session) return null;

  const employee = await db.employee.findUnique({
    where: { id: session.employeeId },
    include: { company: true },
  });

  if (!employee || employee.status !== "ACTIVE") return null;

  // A session older than the cut-off was issued before a password change or an
  // explicit revocation. Compared at second precision because that is all the
  // JWT issued-at claim carries.
  if (Math.floor(employee.sessionsValidFrom.getTime() / 1000) > session.issuedAt) return null;

  return { ...employee, role: employee.role as Role };
}

/** Use in every protected page and server action. Middleware alone is not authorisation. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireManager() {
  const user = await requireUser();
  if (!MANAGER_ROLES.includes(user.role)) redirect("/employees?denied=1");
  return user;
}

export function isManager(role: Role) {
  return MANAGER_ROLES.includes(role);
}

/**
 * Salary is visible to managers for anyone, and to an employee for themselves only
 * (SRS 3.6.1 — read only). No employee ever sees a colleague's figures.
 */
export function canViewSalary(viewer: { id: string; role: Role }, targetId: string) {
  return isManager(viewer.role) || viewer.id === targetId;
}

/** Only managers may change a salary structure (SRS 3.6.2). */
export function canEditSalary(viewerRole: Role) {
  return isManager(viewerRole);
}

export function canEditEmployee(viewer: { id: string; role: Role }, targetId: string) {
  return isManager(viewer.role) || viewer.id === targetId;
}
