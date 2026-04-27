import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const accessCookie = "clockhub_access";
const refreshCookie = "clockhub_refresh";

// Redirect unauthenticated users away from dashboard and keep signed-in users out of login.
export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has(accessCookie) || request.cookies.has(refreshCookie);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (pathname.startsWith("/auth/login") && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/login"],
};
