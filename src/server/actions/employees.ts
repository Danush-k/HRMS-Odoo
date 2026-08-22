"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { canEditEmployee, isManager, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateLoginId, generateTemporaryPassword } from "@/lib/ids";
import { employeeCreateSchema, fieldErrors, managerProfileSchema, selfProfileSchema } from "@/lib/validations";
import { failure, success, type ActionState } from "@/lib/action-state";

const read = (form: FormData, key: string) => (form.get(key) as string | null) ?? undefined;

const clean = <T extends Record<string, unknown>>(input: T) =>
  Object.fromEntries(Object.entries(input).map(([key, value]) => [key, value === "" ? null : value]));

/**
 * Creates an employee. The Login ID and the first password are both issued by the
 * system; the employee is forced to replace the password at first sign-in.
 */
export async function createEmployeeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only an administrator or HR officer can add employees.");

  const parsed = employeeCreateSchema.safeParse({
    firstName: read(form, "firstName"),
    lastName: read(form, "lastName"),
    email: read(form, "email"),
    role: read(form, "role"),
    jobPosition: read(form, "jobPosition"),
    department: read(form, "department"),
    location: read(form, "location"),
    mobile: read(form, "mobile"),
    managerId: read(form, "managerId"),
    dateOfJoining: read(form, "dateOfJoining"),
    monthlyWage: read(form, "monthlyWage") || 0,
  });

  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));
  const data = parsed.data;

  if (await db.employee.findUnique({ where: { email: data.email } })) {
    return failure("That email is already registered.", { email: "This email already has an account" });
  }

  const dateOfJoining = new Date(data.dateOfJoining);
  const loginId = await generateLoginId(db, {
    companyId: actor.companyId,
    companyCode: actor.company.code,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfJoining,
  });

  const temporaryPassword = generateTemporaryPassword();

  const employee = await db.employee.create({
    data: {
      companyId: actor.companyId,
      loginId,
      empCode: loginId,
      email: data.email,
      passwordHash: await bcrypt.hash(temporaryPassword, 10),
      mustChangePassword: true,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
      jobPosition: data.jobPosition || null,
      department: data.department || null,
      location: data.location || null,
      mobile: data.mobile || null,
      managerId: data.managerId || null,
      dateOfJoining,
      salary: { create: { monthlyWage: data.monthlyWage } },
    },
  });

  const types = await db.leaveType.findMany({ where: { companyId: actor.companyId } });
  await db.leaveBalance.createMany({
    data: types.map((type) => ({
      employeeId: employee.id,
      leaveTypeId: type.id,
      year: dateOfJoining.getFullYear(),
      allocated: type.defaultDays,
    })),
  });

  revalidatePath("/employees");
  return success(
    `${employee.firstName} ${employee.lastName} added.`,
    `Login ID ${loginId} · temporary password ${temporaryPassword} — share these once, they are not shown again.`,
  );
}

/**
 * Updates a profile. An employee may change a small set of fields on their own
 * record; a manager may change everything. The permitted set is decided here on
 * the server, never by which inputs the browser happened to send.
 */
export async function updateProfileAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  const targetId = read(form, "employeeId");
  if (!targetId) return failure("No employee selected.");

  if (!canEditEmployee(actor, targetId)) {
    return failure("You can only edit your own profile.");
  }

  const target = await db.employee.findFirst({ where: { id: targetId, companyId: actor.companyId } });
  if (!target) return failure("That employee no longer exists.");

  // Only the keys the section actually submitted are written, so saving one tab
  // can never blank out fields that live on another.
  const raw = Object.fromEntries(form.entries());
  delete raw.employeeId;

  if (!isManager(actor.role)) {
    const parsed = selfProfileSchema.partial().safeParse(raw);
    if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));
    await db.employee.update({ where: { id: targetId }, data: clean(parsed.data) });
    revalidatePath(`/employees/${targetId}`);
    revalidatePath("/employees");
    return success("Profile updated.");
  }

  const parsed = managerProfileSchema.partial().safeParse(raw);
  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));

  const { managerId, ...rest } = parsed.data;
  if (managerId && managerId === targetId) {
    return failure("An employee cannot manage themselves.", { managerId: "Choose a different manager" });
  }

  if (rest.email && rest.email !== target.email) {
    const clash = await db.employee.findUnique({ where: { email: rest.email } });
    if (clash) return failure("That email is already registered.", { email: "This email already has an account" });
  }

  // An administrator must not remove their own last route back in.
  if (targetId === actor.id && (rest.role === "EMPLOYEE" || rest.status === "INACTIVE")) {
    return failure("You cannot remove your own administrator access.");
  }

  await db.employee.update({
    where: { id: targetId },
    data: {
      ...clean(rest),
      ...("managerId" in raw ? { managerId: managerId || null } : {}),
    },
  });

  revalidatePath(`/employees/${targetId}`);
  revalidatePath("/employees");
  return success("Profile updated.");
}

export async function updateAvatarAction(employeeId: string, dataUrl: string) {
  const actor = await requireUser();
  if (!canEditEmployee(actor, employeeId)) return;
  await db.employee.update({ where: { id: employeeId }, data: { avatar: dataUrl || null } });
  revalidatePath(`/employees/${employeeId}`);
}
