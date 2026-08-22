import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { env } from "@/lib/env";

const SESSION_COOKIE = "dayflow_session";
/** Reachable without a session. Emailed links land here, often signed out. */
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/verify-email", "/forgot-password", "/reset-password"];

/** Pointless once signed in, so a signed-in visitor is sent onward instead. */
const SIGNED_OUT_ONLY = ["/sign-in", "/sign-up"];

const secret = new TextEncoder().encode(env.SESSION_SECRET);

/**
 * Signature and expiry only — cheap enough for every request at the edge.
 * Revocation (a password change or an HR reset elsewhere) needs the database,
 * which is not reachable from here, so a token can pass this check and still
 * turn out invalid once `getCurrentUser` looks it up. That gap is closed at
 * /api/session/clear, not here.
 */
async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

/**
 * A coarse gate that keeps signed-out visitors off the application shell.
 * It is not the authorisation boundary — every page and server action checks
 * the session and the role again on the server.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const valid = await hasValidSession(request);
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isSignedOutOnly = SIGNED_OUT_ONLY.some((path) => pathname.startsWith(path));

  if (!valid && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    const response = NextResponse.redirect(url);
    // A token that failed verification (tampered, expired, signed with an
    // old secret) is worth clearing here: otherwise the browser keeps
    // presenting it and this branch keeps firing on every single request.
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (valid && isSignedOutOnly) {
    const url = request.nextUrl.clone();
    url.pathname = "/employees";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
