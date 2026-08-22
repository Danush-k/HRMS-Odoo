"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PURPOSE, consumeToken, cooldownRemaining } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/verification";
import { failure, success, type ActionState } from "@/lib/action-state";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Confirms an address from an emailed link.
 *
 * Deliberately a POST rather than a side effect of loading the page: mail
 * scanners and link previewers follow URLs, and a GET would let them burn the
 * token before the person ever clicked it.
 */
export async function verifyEmailAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const token = (form.get("token") as string | null)?.trim();
  if (!token) return failure("That link is missing its token. Request a new one below.");

  const result = await consumeToken(token, PURPOSE.emailVerification);

  if (!result.ok) {
    const message = {
      expired: "That link has expired. Request a new one below.",
      used: "That link has already been used. Try signing in.",
      unknown: "That link is not valid. Request a new one below.",
    }[result.reason];
    return failure(message);
  }

  await db.employee.update({
    where: { id: result.employeeId },
    data: { emailVerifiedAt: new Date() },
  });

  revalidatePath("/", "layout");
  return success("Email address confirmed.");
}

/** Sends a fresh link to the signed-in employee, behind a one-minute cooldown. */
export async function resendVerificationAction(_prev: ActionState, _form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return failure("Sign in first, then request a new link.");
  if (user.emailVerifiedAt) return success("That address is already confirmed.");

  const wait = await cooldownRemaining(user.id, PURPOSE.emailVerification, RESEND_COOLDOWN_SECONDS);
  if (wait > 0) return failure(`A link was just sent. Try again in ${wait} second${wait === 1 ? "" : "s"}.`);

  const { delivered } = await sendVerificationEmail(user);

  return success(
    delivered
      ? `A new link is on its way to ${user.email}.`
      : "Mail delivery is not configured, so the link was written to the server log.",
  );
}
