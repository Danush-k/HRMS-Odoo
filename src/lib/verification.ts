import "server-only";

import { appUrl, sendMail } from "./mail";
import { PURPOSE, issueToken } from "./tokens";

type Recipient = { id: string; email: string; firstName: string; loginId: string };

/**
 * Issues a verification link and emails it.
 *
 * Never throws: an employee must still be created, and a company must still be
 * registered, if the mail provider is having a bad day. The caller is told
 * whether delivery happened so it can say so on screen.
 */
export async function sendVerificationEmail(employee: Recipient, options?: { newAccount?: boolean }) {
  const token = await issueToken(employee.id, PURPOSE.emailVerification);
  const url = appUrl(`/verify-email?token=${token}`);

  const result = await sendMail({
    to: employee.email,
    subject: "Confirm your email address",
    heading: `Confirm your email address, ${employee.firstName}`,
    lines: options?.newAccount
      ? [
          `An account has been created for you on Dayflow. Your Login ID is ${employee.loginId}.`,
          "Confirm this address to activate the account.",
        ]
      : ["Confirm this address so we know we can reach you."],
    actionLabel: "Confirm email address",
    actionUrl: url,
    footer: "The link is valid for 24 hours. If you were not expecting this, ignore it.",
  });

  return { ...result, url };
}

export async function sendPasswordResetEmail(employee: Recipient) {
  const token = await issueToken(employee.id, PURPOSE.passwordReset);
  const url = appUrl(`/reset-password?token=${token}`);

  const result = await sendMail({
    to: employee.email,
    subject: "Reset your Dayflow password",
    heading: "Reset your password",
    lines: [
      `A password reset was requested for ${employee.loginId}.`,
      "Choose a new password using the link below. Every device currently signed in as you will be signed out.",
    ],
    actionLabel: "Choose a new password",
    actionUrl: url,
    footer: "The link is valid for one hour and can be used once. If you did not ask for this, ignore it — nothing has changed.",
  });

  return { ...result, url };
}
