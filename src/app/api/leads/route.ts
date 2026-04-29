import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Tight rate limit: 3 submissions per 10 min per IP
  const rl = rateLimit(rateLimitKey(req, "lead-capture"), { max: 3, windowMs: 600_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = (body.email ?? "").trim().toLowerCase();

  if (!email || !email.includes("@") || email.length < 5 || email.length > 254) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase.from("leads").insert({ email, source: "landing_page" });
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
