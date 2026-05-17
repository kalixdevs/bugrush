"use client";

import { useState } from "react";

type Props = {
  text: string;
  /** When true, hint is free (e.g. practice mode). */
  free?: boolean;
  /** Stable key that changes per challenge so we re-gate by remounting. */
  resetKey: string;
  onReveal?: () => void;
};

const HINT_COST = 5;

export default function HintReveal(props: Props) {
  // Remount-on-change pattern: cleaner than syncing state via useEffect.
  return <HintRevealInner key={props.resetKey} {...props} />;
}

function HintRevealInner({ text, free, onReveal }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (free) {
    return <p className="text-sm text-zinc-500 mt-1">{text}</p>;
  }

  if (revealed) {
    return (
      <p className="text-sm text-amber-300 mt-1 flex items-start gap-2">
        <span aria-hidden>💡</span>
        <span>{text}</span>
      </p>
    );
  }

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/hint/reveal", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 402) setErr("insufficient");
        else if (res.status === 401) setErr("log in to use hints");
        else if (j.error === "rate_limited") setErr("slow down");
        else setErr(j.error ?? "failed");
        setBusy(false);
        return;
      }
      setRevealed(true);
      onReveal?.();
    } catch {
      setErr("failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1 flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="font-pixel text-[10px] tracking-wider px-3 py-1.5 border-2 border-amber-400 text-amber-300 hover:bg-amber-400/10 transition disabled:opacity-50"
      >
        💡 REVEAL HINT ({HINT_COST}P)
      </button>
      {err && <span className="text-[10px] font-mono text-fuchsia-400">{err}</span>}
    </div>
  );
}
