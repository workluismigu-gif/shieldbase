import { NextRequest, NextResponse } from "next/server";

// Auth is handled client-side via useOrg/getSession.
// Server-side cookie detection is unreliable with Supabase's localStorage-based sessions.
// This proxy is intentionally a pass-through — keep it for future server-side auth if needed.
export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
