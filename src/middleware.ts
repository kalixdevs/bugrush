import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, rlKey, ipFromRequest } from "@/lib/rateLimit";

/**
 * Baseline per-IP rate-limit floor for every /api/* route. Sensitive routes
 * keep their own tighter per-user limits — this is a blunt anti-flood guard
 * that catches scripted abuse before it reaches a handler. Generous enough
 * (600/min) that no legitimate client, even with several tabs open, is hit.
 */
const API_LIMIT = 600;
const API_WINDOW_MS = 60_000;

export async function middleware(req: NextRequest) {
  const ip = ipFromRequest(req);
  try {
    const rl = await rateLimit(rlKey("api-floor", ip), API_LIMIT, API_WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "rate_limited", retryInMs: rl.retryInMs },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryInMs / 1000)) } },
      );
    }
  } catch {
    // Fail open: never block legitimate traffic on a rate-limiter outage.
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
