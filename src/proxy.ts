import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

const PUBLIC_PATHS = ["/login", "/register", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiPath = pathname.startsWith("/api/");
  if (isApiPath) {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if (!origin || origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
      }
    }
    return NextResponse.next();
  }
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(token && verifyAccessToken(token));
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
