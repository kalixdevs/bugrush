"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const POLL_MS = 30_000;
const ROTATE_MS = 6_000;

const HIDDEN_PREFIXES = ["/admin", "/play", "/match", "/daily/play"];

function shouldHide(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function SystemAlerts() {
  const pathname = usePathname();
  const [alerts, setAlerts] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const r = await fetch("/api/pulse", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { alerts: string[] };
        if (!cancelled && Array.isArray(j.alerts) && j.alerts.length > 0) {
          setAlerts(j.alerts);
        }
      } catch { /* ignore */ }
      if (!cancelled) pollTimer = setTimeout(fetchOnce, POLL_MS);
    };
    fetchOnce();
    return () => { cancelled = true; if (pollTimer) clearTimeout(pollTimer); };
  }, []);

  useEffect(() => {
    if (alerts.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % alerts.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [alerts.length]);

  if (shouldHide(pathname) || alerts.length === 0) return null;
  const current = alerts[idx % alerts.length];

  return (
    <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 h-7 flex items-center justify-center gap-3 text-[10px] font-pixel tracking-widest text-zinc-500">
        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse flex-shrink-0" />
        <span className="text-indigo-300 truncate">{current}</span>
      </div>
    </div>
  );
}
