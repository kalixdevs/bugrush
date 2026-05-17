"use client";

import { useEffect, useState } from "react";

function format(ms: number): string {
  if (ms <= 0) return "ENDED";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `ENDS IN ${d}d ${h}h ${m}m`;
  if (h > 0) return `ENDS IN ${h}h ${m}m ${sec}s`;
  return `ENDS IN ${m}m ${sec}s`;
}

export default function EventCountdown({ endsAtIso }: { endsAtIso: string }) {
  const endsAt = new Date(endsAtIso).getTime();
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => setRemaining(endsAt - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return <span>{format(remaining)}</span>;
}
