import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirects based on the presence of the refresh cookie (httpOnly, so this is
 * the one place the server can see it). Actual token validation happens on the
 * API — this only avoids flashing app pages to signed-out visitors.
 */
export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("emp_rt")?.value);
  const { pathname } = request.nextUrl;

  const isAuthPage = ["/login", "/onboarding", "/forgot-password", "/reset-password"].some(
    (p) => pathname === p
  );

  if (!hasSession && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
