"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Handler = (data: unknown) => void;

type Ctx = {
  subscribe: (handler: Handler) => () => void;
  connected: boolean;
};

const RealtimeCtx = createContext<Ctx | null>(null);

const POLL_INTERVAL_MS = 1500;

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef(new Set<Handler>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let since = 0;

    const hidden = () =>
      typeof document !== "undefined" && document.visibilityState === "hidden";

    const tick = async () => {
      if (stopped) return;
      // Skip the request while the tab is backgrounded — reschedule a check.
      if (hidden()) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      try {
        const res = await fetch(`/api/poll?since=${since}`, { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as {
            events: Array<{ channel: string; ts: number; data: unknown }>;
            now: number;
          };
          if (!stopped) {
            setConnected(true);
            for (const ev of json.events) {
              if (ev.ts > since) since = ev.ts;
              for (const fn of handlersRef.current) {
                try { fn(ev.data); } catch { /* swallow */ }
              }
            }
            if (json.now > since) since = json.now;
          }
        } else if (!stopped) {
          setConnected(false);
        }
      } catch {
        if (!stopped) setConnected(false);
      }
      if (!stopped) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    // Returning to the tab: poll immediately instead of waiting out the timer.
    const onVisible = () => {
      if (stopped || hidden()) return;
      if (timer) clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const ctx = useMemo<Ctx>(
    () => ({
      subscribe: (handler) => {
        handlersRef.current.add(handler);
        return () => { handlersRef.current.delete(handler); };
      },
      connected,
    }),
    [connected],
  );

  return <RealtimeCtx.Provider value={ctx}>{children}</RealtimeCtx.Provider>;
}

export function useRealtime(): Ctx {
  const ctx = useContext(RealtimeCtx);
  if (!ctx) throw new Error("useRealtime must be used inside RealtimeProvider");
  return ctx;
}

/**
 * Per-match polling. Polls /api/poll?match=<id> and surfaces events for that match.
 */
export function useMatchRealtime(
  matchId: string | null,
  onEvent: (payload: unknown) => void,
): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!matchId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let since = 0;

    const hidden = () =>
      typeof document !== "undefined" && document.visibilityState === "hidden";

    const tick = async () => {
      if (stopped) return;
      if (hidden()) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      try {
        const res = await fetch(
          `/api/poll?match=${encodeURIComponent(matchId)}&since=${since}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const json = (await res.json()) as {
            events: Array<{ channel: string; ts: number; data: unknown }>;
            now: number;
          };
          if (!stopped) {
            setConnected(true);
            for (const ev of json.events) {
              if (ev.ts > since) since = ev.ts;
              try { handlerRef.current(ev.data); } catch { /* swallow */ }
            }
            if (json.now > since) since = json.now;
          }
        } else if (!stopped) {
          setConnected(false);
        }
      } catch {
        if (!stopped) setConnected(false);
      }
      if (!stopped) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    const onVisible = () => {
      if (stopped || hidden()) return;
      if (timer) clearTimeout(timer);
      tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    tick();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [matchId]);

  return { connected };
}
