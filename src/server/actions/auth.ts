"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { DEFAULT_LEAVE_TYPES } from "@/lib/constants";
import { db } from "@/lib/db";
import { generateLoginId, generateToken, uniqueCompanyCode } from "@/lib/ids";
import { createSession, destroySession } from "@/lib/session";
import { changePasswordSchema, fieldErrors, signInSchema, signUpSchema } from "@/lib/validations";
import { failure, success, type ActionState } from "@/lib/action-state";

const read = (form: FormData, key: string) => (form.get(key) as string | null) ?? undefined;

/**
 * A real bcrypt hash of a value nobody can supply, compared against when no
 * account matches. Comparing against a malformed hash returns in microseconds
 * while a genuine comparison costs tens of milliseconds, and that gap is enough
 * to enumerate valid Login IDs by response time alone.
 */
const ABSENT_ACCOUNT_HASH = bcrypt.hashSync(generateToken(16), 10);

/**
 * Registers a company and its first administrator.
 * This is the only self-service registration path — employees are created by
 * an administrator or HR officer and receive a system-generated Login ID.
 */
export async function signUpAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    companyName: read(form, "companyName"),
    logo: read(form, "logo"),
    firstName: read(form, "firstName"),
    lastName: read(form, "lastName"),
    email: read(form, "email"),
    phone: read(form, "phone"),
    password: read(form, "password"),
    confirmPassword: read(form, "confirmPassword"),
  });

  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));
  const data = parsed.data;

  if (await db.employee.findUnique({ where: { email: data.email } })) {
    return failure("That email is already registered.", { email: "This email already has an account" });
  }

  const code = await uniqueCompanyCode(db, data.companyName);
  const joinedAt = new Date();

  const company = await db.company.create({
    data: {
      name: data.companyName,
      code,
      logo: data.logo || null,
      leaveTypes: { create: DEFAULT_LEAVE_TYPES.map((type) => ({ ...type })) },
    },
    include: { leaveTypes: true },
  });

  const loginId = await generateLoginId(db, {
    companyId: company.id,
    companyCode: company.code,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfJoining: joinedAt,
  });

  const admin = await db.employee.create({
    data: {
      companyId: company.id,
      loginId,
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, 10),
      mustChangePassword: false,
      role: "ADMIN",
      firstName: data.firstName,
      lastName: data.lastName,
      jobPosition: "Administrator",
      mobile: data.phone,
      dateOfJoining: joinedAt,
      empCode: loginId,
      salary: { create: {} },
    },
  });

  const year = joinedAt.getFullYear();
  await db.leaveBalance.createMany({
    data: company.leaveTypes.map((type) => ({
      employeeId: admin.id,
      leaveTypeId: type.id,
      year,
      allocated: type.defaultDays,
    })),
  });

  await createSession({
    employeeId: admin.id,
    companyId: company.id,
    role: "ADMIN",
    loginId: admin.loginId,
  });

  redirect("/employees");
}

export async function signInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({
    identifier: read(form, "identifier"),
    password: read(form, "password"),
  });

  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));
  const { identifier, password } = parsed.data;

  const employee = await db.employee.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { loginId: identifier.toUpperCase() }],
    },
  });

  // One message for both branches so the form cannot be used to discover valid
  // accounts, and one comparison either way so the timing cannot either.
  const invalid = failure("Incorrect Login ID or password.");
  const matches = await bcrypt.compare(password, employee?.passwordHash ?? ABSENT_ACCOUNT_HASH);
  if (!employee || !matches) return invalid;
  if (employee.status !== "ACTIVE") {
    return failure("This account is inactive. Contact your HR officer.");
  }

  await createSession({
    employeeId: employee.id,
    companyId: employee.companyId,
    role: employee.role as "ADMIN" | "HR" | "EMPLOYEE",
    loginId: employee.loginId,
  });

  redirect(employee.mustChangePassword ? "/first-login" : "/employees");
}

export async function signOutAction() {
  await destroySession();
  redirect("/sign-in");
}

export async function changePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: read(form, "currentPassword"),
    newPassword: read(form, "newPassword"),
    confirmPassword: read(form, "confirmPassword"),
  });

  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return failure("That is not your current password.", { currentPassword: "Incorrect password" });
  }

  await db.employee.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.newPassword, 10),
      mustChangePassword: false,
    },
  });

  revalidatePath("/profile");
  return success("Password updated.");
}
