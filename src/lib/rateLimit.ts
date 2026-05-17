import { Redis } from "@upstash/redis";

const HAS_REDIS = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis: Redis | null = HAS_REDIS ? Redis.fromEnv() : null;

// In-memory fallback for local dev (single Node process only).
const globalForRL = globalThis as unknown as {
  __bugrushRateLimit?: Map<string, number[]>;
};
function memStore(): Map<string, number[]> {
  if (!globalForRL.__bugrushRateLimit) {
    globalForRL.__bugrushRateLimit = new Map();
  }
  return globalForRL.__bugrushRateLimit;
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryInMs: number;
};

/**
 * Sliding-window rate limit. `windowMs` is the window, `max` is the cap.
 * Key is composed by the caller: e.g. "redeem:user:abc123".
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (redis) {
    const k = `rl:${key}`;
    const member = `${now}:${Math.random()}`;
    const pipe = redis.pipeline();
    pipe.zadd(k, { score: now, member });
    pipe.zremrangebyscore(k, 0, windowStart);
    pipe.zcard(k);
    pipe.expire(k, Math.ceil(windowMs / 1000) + 1);
    const result = await pipe.exec<[unknown, unknown, number, unknown]>();
    const count = Number(result[2]) || 1;
    if (count > max) {
      const oldest = await redis.zrange<string[]>(k, 0, 0, { withScores: false });
      const earliestTs = oldest && oldest.length
        ? Number(String(oldest[0]).split(":")[0])
        : now;
      const retryInMs = Math.max(0, earliestTs + windowMs - now);
      return { ok: false, remaining: 0, retryInMs };
    }
    return { ok: true, remaining: Math.max(0, max - count), retryInMs: 0 };
  }

  // In-memory fallback.
  const store = memStore();
  const arr = store.get(key) ?? [];
  const fresh = arr.filter((ts) => ts > windowStart);
  fresh.push(now);
  store.set(key, fresh);
  if (fresh.length > max) {
    const retryInMs = Math.max(0, fresh[0] + windowMs - now);
    return { ok: false, remaining: 0, retryInMs };
  }
  return { ok: true, remaining: Math.max(0, max - fresh.length), retryInMs: 0 };
}

/**
 * Convenience: pull the requester key (user id if logged in, else IP).
 */
export function rlKey(scope: string, identifier: string): string {
  return `${scope}:${identifier}`;
}

export function ipFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
