import "server-only";

import { headers } from "next/headers";

import { db } from "./db";

/** Failed attempts against one Login ID or email before it locks. */
const MAX_PER_IDENTIFIER = 5;

/** Failed attempts from one address before it locks, whatever it is aiming at. */
const MAX_PER_IP = 20;

const WINDOW_MINUTES = 15;
const RETENTION_HOURS = 72;

export type Lockout = { locked: boolean; retryAfterSeconds: number; scope: "identifier" | "ip" | null };

const windowStart = () => new Date(Date.now() - WINDOW_MINUTES * 60_000);

/** Best-effort client address. Proxies vary, so this is a signal, not an identity. */
export async function clientIp() {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return store.get("x-real-ip") ?? null;
}

export const normaliseIdentifier = (value: string) => value.trim().toLowerCase();

/**
 * Whether this identifier or address is currently locked out.
 *
 * Deliberately keyed on what was typed rather than on a matched account, so a
 * lockout message reveals nothing about whether the account exists.
 */
export async function checkLockout(identifier: string, ip: string | null): Promise<Lockout> {
  const since = windowStart();
  const key = normaliseIdentifier(identifier);

  const [byIdentifier, byIp] = await Promise.all([
    db.loginAttempt.findMany({
      where: { identifier: key, successful: false, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    ip
      ? db.loginAttempt.findMany({
          where: { ip, successful: false, createdAt: { gte: since } },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const expiry = (oldest: Date) =>
    Math.max(1, Math.ceil((oldest.getTime() + WINDOW_MINUTES * 60_000 - Date.now()) / 1000));

  if (byIdentifier.length >= MAX_PER_IDENTIFIER) {
    return { locked: true, retryAfterSeconds: expiry(byIdentifier[0]!.createdAt), scope: "identifier" };
  }
  if (byIp.length >= MAX_PER_IP) {
    return { locked: true, retryAfterSeconds: expiry(byIp[0]!.createdAt), scope: "ip" };
  }

  return { locked: false, retryAfterSeconds: 0, scope: null };
}

/**
 * Records the outcome. A success clears the identifier's failures so a person
 * who mistypes twice and then succeeds is not left one slip from a lockout.
 */
export async function recordAttempt(identifier: string, ip: string | null, successful: boolean) {
  const key = normaliseIdentifier(identifier);

  await db.loginAttempt.create({ data: { identifier: key, ip, successful } });

  if (successful) {
    await db.loginAttempt.deleteMany({ where: { identifier: key, successful: false } });
  }

  // Occasional prune; the table is write-heavy and nothing reads beyond the window.
  if (Math.random() < 0.02) {
    await db.loginAttempt.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_HOURS * 3_600_000) } },
    });
  }
}

export function lockoutMessage(lockout: Lockout) {
  const minutes = Math.ceil(lockout.retryAfterSeconds / 60);
  const wait = minutes <= 1 ? "a minute" : `${minutes} minutes`;
  return lockout.scope === "ip"
    ? `Too many sign-in attempts from this network. Try again in ${wait}.`
    : `Too many failed attempts. This account is locked for ${wait}. Contact your HR officer if you need it sooner.`;
}
