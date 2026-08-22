import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import type { Role } from "./constants";
import { env } from "./env";

const COOKIE_NAME = "dayflow_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // one working day

export type SessionPayload = {
  employeeId: string;
  companyId: string;
  role: Role;
  loginId: string;
};

const key = new TextEncoder().encode(env.SESSION_SECRET);

function secret() {
  return key;
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
