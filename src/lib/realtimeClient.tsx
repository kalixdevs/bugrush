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

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef(new Set<Handler>());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const open = () => {
      if (closed) return;
      es = new EventSource("/api/stream");
      es.onopen = () => setConnected(true);
      es.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          for (const fn of handlersRef.current) {
            try { fn(payload); } catch { /* swallow */ }
          }
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
        es = null;
        if (closed) return;
        retryTimer = setTimeout(open, 5000);
      };
    };

    open();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
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
 * Per-match EventSource. Opens a dedicated stream with ?match=<id> so the
 * server subscribes us to that match's channel.
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
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const open = () => {
      if (closed) return;
      es = new EventSource(`/api/stream?match=${encodeURIComponent(matchId)}`);
      es.onopen = () => setConnected(true);
      es.onmessage = (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          try { handlerRef.current(payload); } catch { /* swallow */ }
        } catch { /* ignore */ }
      };
      es.onerror = () => {
        setConnected(false);
        es?.close();
        es = null;
        if (closed) return;
        retryTimer = setTimeout(open, 5000);
      };
    };

    open();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [matchId]);

  return { connected };
}
