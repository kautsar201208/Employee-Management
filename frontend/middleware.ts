import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_COOKIE = "pusbanglin_role";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get(ROLE_COOKIE)?.value ?? "";

  const isLoggedIn = role !== "";

  // ── Jika belum login & mencoba akses area protected, redirect ke login ──
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/Homepage");

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ── Biarkan halaman login bisa dibuka meskipun cookie sesi masih tersimpan ──
  const isRegisterPage = pathname.startsWith("/auth/register");

  if (isRegisterPage && isLoggedIn) {
    const dest = role === "admin" ? "/dashboard" : "/Homepage/Profile";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── Cegah user biasa masuk ke /dashboard ──
  if (pathname.startsWith("/dashboard") && role !== "admin") {
    return NextResponse.redirect(new URL("/Homepage/Profile", request.url));
  }

  // ── Cegah admin masuk ke /Homepage ──
  if (pathname.startsWith("/Homepage") && role === "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/Homepage/:path*",
    "/auth/login",
    "/auth/register",
  ],
};
