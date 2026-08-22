import { NextResponse } from "next/server";

import { destroySession } from "@/lib/session";

/**
 * The other half of closing the stale-cookie loop (see middleware.ts).
 *
 * `getCurrentUser` can find a session that passed the edge signature check but
 * the server has since revoked — a password change or an HR reset from
 * another device. `requireUser` discovers that inside a Server Component
 * render, where Next.js does not allow mutating cookies, so it cannot clear
 * the cookie itself; it can only redirect, and a redirect that leaves the
 * cookie in place lands back on the signed-in gate, which bounces it straight
 * back. Sending that redirect here instead, a Route Handler, is what actually
 * clears it before the browser is sent on.
 */
export async function GET(request: Request) {
  await destroySession();
  const next = new URL(request.url).searchParams.get("next") || "/sign-in";
  return NextResponse.redirect(new URL(next, request.url));
}
