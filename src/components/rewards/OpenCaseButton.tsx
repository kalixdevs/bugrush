"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OpenCaseButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const open = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/rewards/open", { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "failed" }));
        setErr(j.error ?? "failed");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setErr("failed");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className={`btn-press px-10 py-4 font-pixel text-sm border-2 border-zinc-950 ${
          busy ? "bg-zinc-800 text-zinc-500" : "bg-amber-400 text-zinc-950"
        }`}
      >
        {busy ? "···" : "▶ OPEN TODAY'S CASE"}
      </button>
      {err && <p className="text-xs text-fuchsia-400 font-mono">{err}</p>}
    </div>
  );
}
