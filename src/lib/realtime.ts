export type Channel = "lfm" | `user:${string}` | `match:${string}`;

export type StreamEvent = {
  channel: Channel;
  data: unknown;
};

type Handler = (e: StreamEvent) => void;

const globalForRealtime = globalThis as unknown as {
  __devraceRealtime?: Map<Channel, Set<Handler>>;
};

function bus(): Map<Channel, Set<Handler>> {
  if (!globalForRealtime.__devraceRealtime) {
    globalForRealtime.__devraceRealtime = new Map();
  }
  return globalForRealtime.__devraceRealtime;
}

export function publish(channel: Channel, data: unknown): void {
  const subs = bus().get(channel);
  if (!subs) return;
  for (const fn of subs) {
    try { fn({ channel, data }); } catch { /* swallow */ }
  }
}

export function subscribe(channels: Channel[], onEvent: Handler): () => void {
  const b = bus();
  for (const c of channels) {
    if (!b.has(c)) b.set(c, new Set());
    b.get(c)!.add(onEvent);
  }
  return () => {
    for (const c of channels) b.get(c)?.delete(onEvent);
  };
}
