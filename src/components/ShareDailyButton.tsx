"use client";

import { useState } from "react";

type Props = {
  dayKey: string;
  success: boolean;
  timeMs: number;
  score: number;
};

function buildShareText({ dayKey, success, timeMs, score }: Props): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://bugrush.lol";
  const line2 = success
    ? `✅ ${(timeMs / 1000).toFixed(1)}s · ${score} pts`
    : `❌ missed`;
  return `bugrush daily ${dayKey}\n${line2}\n${origin}/daily`;
}

export default function ShareDailyButton(props: Props) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const onClick = async () => {
    const text = buildShareText(props);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={onClick}
        className="btn-press px-5 py-2 font-pixel text-[10px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
      >
        {copied ? "COPIED ✓" : "▶ SHARE"}
      </button>
      {failed && (
        <div className="mt-3">
          <p className="text-xs text-fuchsia-400 font-mono mb-1">
            Copy failed. Select and copy manually:
          </p>
          <textarea
            readOnly
            value={buildShareText(props)}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full px-3 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-100 font-mono text-xs"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
