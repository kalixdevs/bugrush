import { Redis } from "@upstash/redis";

export type Channel = "lfm" | `user:${string}` | `match:${string}`;

export type PolledEvent = {
  channel: Channel;
  ts: number;
  data: unknown;
};

const HAS_REDIS = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis: Redis | null = HAS_REDIS ? Redis.fromEnv() : null;

// Local dev fallback: in-memory ring per channel.
type Entry = { ts: number; data: unknown };
const globalForRealtime = globalThis as unknown as {
  __devraceRealtime?: Map<Channel, Entry[]>;
};
function memBus(): Map<Channel, Entry[]> {
  if (!globalForRealtime.__devraceRealtime) {
    globalForRealtime.__devraceRealtime = new Map();
  }
  return globalForRealtime.__devraceRealtime;
}

const MAX_ENTRIES = 100;
const TTL_SECONDS = 3600;

function key(channel: Channel): string {
  return `rt:${channel}`;
}

export async function publish(channel: Channel, data: unknown): Promise<void> {
  const ts = Date.now();
  if (redis) {
    const k = key(channel);
    // Member must be unique so identical payloads aren't collapsed.
    const member = JSON.stringify({ ts, data, n: Math.random() });
    await redis.zadd(k, { score: ts, member });
    await redis.zremrangebyrank(k, 0, -MAX_ENTRIES - 1);
    await redis.expire(k, TTL_SECONDS);
  } else {
    const arr = memBus().get(channel) ?? [];
    arr.push({ ts, data });
    if (arr.length > MAX_ENTRIES) arr.splice(0, arr.length - MAX_ENTRIES);
    memBus().set(channel, arr);
  }
}

export async function poll(
  channels: Channel[],
  since: number,
): Promise<PolledEvent[]> {
  if (channels.length === 0) return [];
  if (redis) {
    const min = since + 1;
    const results = await Promise.all(
      channels.map((c) =>
        redis.zrange<string[]>(key(c), min, "+inf", { byScore: true }),
      ),
    );
    const out: PolledEvent[] = [];
    results.forEach((entries, i) => {
      const c = channels[i];
      for (const raw of entries ?? []) {
        try {
          const parsed =
            typeof raw === "string"
              ? (JSON.parse(raw) as { ts: number; data: unknown })
              : (raw as { ts: number; data: unknown });
          out.push({ channel: c, ts: parsed.ts, data: parsed.data });
        } catch { /* skip malformed */ }
      }
    });
    return out.sort((a, b) => a.ts - b.ts);
  }
  const out: PolledEvent[] = [];
  for (const c of channels) {
    const arr = memBus().get(c) ?? [];
    for (const e of arr) {
      if (e.ts > since) out.push({ channel: c, ts: e.ts, data: e.data });
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}
