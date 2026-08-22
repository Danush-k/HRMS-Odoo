import "server-only";

import { createHash } from "node:crypto";

import { db } from "./db";
import { generateToken } from "./ids";

export const PURPOSE = {
  emailVerification: "EMAIL_VERIFICATION",
  passwordReset: "PASSWORD_RESET",
} as const;

export type Purpose = (typeof PURPOSE)[keyof typeof PURPOSE];

const TTL_MINUTES: Record<Purpose, number> = {
  EMAIL_VERIFICATION: 60 * 24, // a day
  PASSWORD_RESET: 60, // an hour
};

/** Only the digest is stored, so a database copy yields no working links. */
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Issues a link token. Any outstanding token for the same employee and purpose
 * is dropped first, so the most recent email is the only one that works.
 */
export async function issueToken(employeeId: string, purpose: Purpose) {
  await db.verificationToken.deleteMany({ where: { employeeId, purpose } });

  const token = generateToken(32);
  await db.verificationToken.create({
    data: {
      employeeId,
      purpose,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + TTL_MINUTES[purpose] * 60_000),
    },
  });

  return token;
}

export type ConsumeResult =
  | { ok: true; employeeId: string }
  | { ok: false; reason: "unknown" | "expired" | "used" };

/** Validates and burns a token in one step. A token is good for exactly one use. */
export async function consumeToken(token: string, purpose: Purpose): Promise<ConsumeResult> {
  const record = await db.verificationToken.findUnique({ where: { tokenHash: digest(token) } });

  if (!record || record.purpose !== purpose) return { ok: false, reason: "unknown" };
  if (record.consumedAt) return { ok: false, reason: "used" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };

  await db.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true, employeeId: record.employeeId };
}

/** Seconds until another token may be issued, for the resend cooldown. */
export async function cooldownRemaining(employeeId: string, purpose: Purpose, seconds = 60) {
  const latest = await db.verificationToken.findFirst({
    where: { employeeId, purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!latest) return 0;
  const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(seconds - elapsed));
}

export async function pruneExpiredTokens() {
  await db.verificationToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
