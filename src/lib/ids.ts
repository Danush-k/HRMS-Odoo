import { randomInt } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

const ALPHA = /[^A-Z]/g;

/**
 * Two-letter company code taken from the initials of the company name.
 * "Odoo India" -> "OI", "Dayflow" -> "DA".
 */
export function deriveCompanyCode(companyName: string) {
  const words = companyName.toUpperCase().replace(/[^A-Z\s]/g, "").split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).padEnd(2, "X");
  const single = (words[0] ?? "CO").padEnd(2, "X");
  return single.slice(0, 2);
}

/** Appends a digit until the code is free, so two "Odoo India" tenants cannot collide. */
export async function uniqueCompanyCode(db: PrismaClient, companyName: string) {
  const base = deriveCompanyCode(companyName);
  let candidate = base;
  let suffix = 1;
  while (await db.company.findUnique({ where: { code: candidate } })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Login ID format: [company code][first 2 of first name][first 2 of last name][joining year][serial]
 * Example: Odoo India + John Doe + 2022 + first hire -> OIJODO20220001
 */
export function buildLoginId(input: {
  companyCode: string;
  firstName: string;
  lastName: string;
  joiningYear: number;
  serial: number;
}) {
  const initials = (name: string) => name.toUpperCase().replace(ALPHA, "").padEnd(2, "X").slice(0, 2);
  return [
    input.companyCode,
    initials(input.firstName),
    initials(input.lastName),
    String(input.joiningYear),
    String(input.serial).padStart(4, "0"),
  ].join("");
}

/** Next serial for a company in a given joining year. */
export async function nextSerial(db: PrismaClient, companyId: string, year: number) {
  const from = new Date(year, 0, 1);
  const to = new Date(year + 1, 0, 1);
  const count = await db.employee.count({
    where: { companyId, dateOfJoining: { gte: from, lt: to } },
  });
  return count + 1;
}

export async function generateLoginId(
  db: PrismaClient,
  input: { companyId: string; companyCode: string; firstName: string; lastName: string; dateOfJoining: Date },
) {
  const year = input.dateOfJoining.getFullYear();
  let serial = await nextSerial(db, input.companyId, year);
  let loginId = buildLoginId({ ...input, joiningYear: year, serial });

  // Guard against gaps left by deleted records.
  while (await db.employee.findUnique({ where: { loginId } })) {
    serial += 1;
    loginId = buildLoginId({ ...input, joiningYear: year, serial });
  }
  return loginId;
}

// Ambiguous characters are left out so the password survives being read aloud
// or copied off a screen: no O/0, no I/l/1.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * First-time password issued by the system. The employee is forced to replace it
 * on first sign-in, so it only has to survive one handover.
 *
 * Uses node:crypto rather than the global Web Crypto object, which is only
 * guaranteed from Node 19, and randomInt rather than a modulo of random bytes,
 * which would bias the first few characters of the alphabet.
 */
export function generateTemporaryPassword(length = 10) {
  const body = Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join("");
  return `${body}@1`;
}

/** URL-safe random token for verification and password reset links. */
export function generateToken(bytes = 32) {
  return Array.from({ length: bytes }, () => randomInt(256))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
