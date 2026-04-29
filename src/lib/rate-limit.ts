// Simple in-memory rate limiter for API routes.
// Uses a Map that resets per function instance (Vercel Fluid Compute
// instances persist across requests, so this provides meaningful
// protection without external infrastructure).
//
// For production at scale, swap to Vercel KV / Upstash Redis.

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  { max = 20, windowMs = 60_000 }: { max?: number; windowMs?: number } = {}
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  entry.count += 1;
  if (entry.count > max) {
    return { ok: false, remaining: 0 };
  }
  return { ok: true, remaining: max - entry.count };
}

// Helper: extract a rate-limit key from a Next.js request
export function rateLimitKey(req: Request, prefix: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${prefix}:${ip}`;
}
