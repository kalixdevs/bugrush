"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type Me = {
  loggedIn: boolean;
  role: string | null;
  points: number;
  frameSrc: string | null;
  incomingFriendCount: number;
  unreadDmCount: number;
};

type Ctx = {
  me: Me | null;
  refresh: () => void;
};

const EMPTY: Me = {
  loggedIn: false,
  role: null,
  points: 0,
  frameSrc: null,
  incomingFriendCount: 0,
  unreadDmCount: 0,
};

const MeCtx = createContext<Ctx | null>(null);

export function MeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [nonce, setNonce] = useState(0);

  // One fetch per navigation (or explicit refresh), shared by all consumers.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/role", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        setMe(j ? { ...EMPTY, ...j } : EMPTY);
      })
      .catch(() => { if (!cancelled) setMe(EMPTY); });
    return () => { cancelled = true; };
  }, [pathname, nonce]);

  const ctx = useMemo<Ctx>(
    () => ({ me, refresh: () => setNonce((n) => n + 1) }),
    [me],
  );

  return <MeCtx.Provider value={ctx}>{children}</MeCtx.Provider>;
}

/** Returns the shared `/api/me/role` state. `me` is null until the first fetch resolves. */
export function useMe(): Ctx {
  const ctx = useContext(MeCtx);
  if (!ctx) throw new Error("useMe must be used inside MeProvider");
  return ctx;
}
