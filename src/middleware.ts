import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "dayflow_session";
/** Reachable without a session. Emailed links land here, often signed out. */
const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/verify-email", "/forgot-password", "/reset-password"];

/** Pointless once signed in, so a signed-in visitor is sent onward instead. */
const SIGNED_OUT_ONLY = ["/sign-in", "/sign-up"];

/**
 * A coarse gate that keeps signed-out visitors off the application shell.
 * It is not the authorisation boundary — every page and server action checks
 * the session and the role again on the server.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isSignedOutOnly = SIGNED_OUT_ONLY.some((path) => pathname.startsWith(path));

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (hasSession && isSignedOutOnly) {
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
