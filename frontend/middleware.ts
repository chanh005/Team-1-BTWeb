import { NextRequest, NextResponse } from "next/server";

/**
 * Route-protection PREPARATION for Phase 2.
 *
 * The access token lives only in browser memory (Zustand, not persisted),
 * so middleware — which runs on the edge, outside the page's JS — has no
 * way to inspect it. What it CAN see is the httpOnly refresh-token cookie,
 * whose mere presence is a reasonable signal of "was logged in".
 *
 * This is a heuristic, not real authorization: the cookie could be
 * expired or already revoked server-side. Real enforcement happens when
 * the page actually calls the API (which verifies the access token, and
 * transparently refreshes if needed). Once account/dashboard routes exist
 * in a later phase, add their path prefix to PROTECTED_PREFIXES below.
 */

const REFRESH_COOKIE_NAME =
  process.env.REFRESH_COOKIE_NAME_PUBLIC ?? "refreshToken";

const AUTH_PAGES = ["/login", "/register"];
const PROTECTED_PREFIXES: string[] = [
  // e.g. "/account" — added once the account dashboard exists.
];

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(REFRESH_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register"],
};
