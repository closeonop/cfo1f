import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap pre-filter only: the cookie's mere presence is NOT proof of a live
 * session, so the middleware never uses it to push a user from one page to
 * another — a dead cookie here would cause a /dashboard ↔ /login redirect
 * loop (the API correctly rejects the dead token, the middleware can't
 * validate it without rotating it). Real auth decisions happen client-side:
 * (app)/layout redirects anonymous users to /login, and the login page
 * redirects authenticated users to /dashboard.
 */
export function middleware(request: NextRequest) {
  const hasSessionCookie = Boolean(request.cookies.get("emp_rt")?.value);
  const { pathname } = request.nextUrl;

  // no cookie at all → straight to /login without flashing the app shell
  if (!hasSessionCookie) {
    const isAuthPage = ["/login", "/onboarding", "/forgot-password", "/reset-password"].some(
      (p) => pathname === p
    );
    if (!isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
