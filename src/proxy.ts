import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /dashboard routes
  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  // Check for Supabase auth token in cookies
  const token =
    req.cookies.get("sb-lbptlxxqfhfqywufdfdu-auth-token") ??
    req.cookies.get("sb-access-token");

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/auth";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
