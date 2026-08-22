"use server";

import bcrypt from "bcryptjs";

import { isManager, requireUser, revokeSessions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateTemporaryPassword } from "@/lib/ids";
import { checkLockout, clientIp, lockoutMessage, recordAttempt } from "@/lib/rate-limit";
import { PURPOSE, consumeToken, cooldownRemaining } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/verification";
import { fieldErrors, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations";
import { failure, success, type ActionState } from "@/lib/action-state";

const read = (form: FormData, key: string) => (form.get(key) as string | null) ?? undefined;

/** Identical whatever happens, so the form cannot be used to test which addresses exist. */
const SAME_ANSWER =
  "If that account exists, a reset link is on its way. The link is valid for one hour.";

export async function requestPasswordResetAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ identifier: read(form, "identifier") });
  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));

  const { identifier } = parsed.data;
  const ip = await clientIp();

  // Shares the sign-in limiter, so this form cannot be used to sidestep it or
  // to send an unbounded number of emails to one address.
  const lockout = await checkLockout(identifier, ip);
  if (lockout.locked) return failure(lockoutMessage(lockout));

  const employee = await db.employee.findFirst({
    where: {
      OR: [{ email: identifier.toLowerCase() }, { loginId: identifier.toUpperCase() }],
    },
  });

  if (!employee || employee.status !== "ACTIVE") {
    await recordAttempt(identifier, ip, false);
    return success(SAME_ANSWER);
  }

  // A recent link is still valid; sending another would only invalidate it.
  const wait = await cooldownRemaining(employee.id, PURPOSE.passwordReset, 60);
  if (wait > 0) return success(SAME_ANSWER);

  await sendPasswordResetEmail(employee);
  return success(SAME_ANSWER);
}

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: read(form, "token"),
    newPassword: read(form, "newPassword"),
    confirmPassword: read(form, "confirmPassword"),
  });

  if (!parsed.success) return failure("Check the highlighted fields.", fieldErrors(parsed.error));

  const result = await consumeToken(parsed.data.token, PURPOSE.passwordReset);
  if (!result.ok) {
    const message = {
      expired: "That link has expired. Request a new one.",
      used: "That link has already been used. Request a new one.",
      unknown: "That link is not valid. Request a new one.",
    }[result.reason];
    return failure(message);
  }

  await db.employee.update({
    where: { id: result.employeeId },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.newPassword, 10),
      mustChangePassword: false,
      // Following the link proves control of the address, so it counts as confirmation.
      emailVerifiedAt: new Date(),
    },
  });

  // Anyone holding a session for this account, including whoever prompted the
  // reset, is signed out.
  await revokeSessions(result.employeeId);

  // Clears the lockout so the person is not locked out by the attempts that
  // sent them here in the first place.
  const employee = await db.employee.findUnique({ where: { id: result.employeeId } });
  if (employee) {
    await db.loginAttempt.deleteMany({
      where: { identifier: { in: [employee.email.toLowerCase(), employee.loginId.toLowerCase()] } },
    });
  }

  return success("Password updated. Sign in with your new password.");
}

/**
 * The counter path: an employee who cannot reach their inbox asks HR, who issues
 * a fresh temporary password in person.
 */
export async function resetEmployeePasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const actor = await requireUser();
  if (!isManager(actor.role)) return failure("Only an administrator or HR officer can reset a password.");

  const employeeId = read(form, "employeeId");
  if (!employeeId) return failure("No employee selected.");

  const target = await db.employee.findFirst({ where: { id: employeeId, companyId: actor.companyId } });
  if (!target) return failure("That employee no longer exists.");
  if (target.id === actor.id) return failure("Use the Security tab to change your own password.");

  const temporaryPassword = generateTemporaryPassword();

  await db.employee.update({
    where: { id: target.id },
    data: {
      passwordHash: await bcrypt.hash(temporaryPassword, 10),
      mustChangePassword: true,
    },
  });

  await revokeSessions(target.id);
  await db.verificationToken.deleteMany({ where: { employeeId: target.id, purpose: PURPOSE.passwordReset } });
  await db.loginAttempt.deleteMany({
    where: { identifier: { in: [target.email.toLowerCase(), target.loginId.toLowerCase()] } },
  });

  return success(
    `Password reset for ${target.firstName} ${target.lastName}. They have been signed out everywhere.`,
    `Login ID ${target.loginId} · temporary password ${temporaryPassword} — hand this over directly. They must replace it at next sign-in.`,
  );
}
