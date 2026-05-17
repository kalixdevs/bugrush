"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ pointsAwarded: number; cosmeticsGranted: number } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "failed" }));
        setErr(j.error ?? "failed");
        setBusy(false);
        return;
      }
      const data = await res.json();
      setResult(data);
      setCode("");
      router.refresh();
    } catch {
      setErr("failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="border-2 border-zinc-800 bg-zinc-900 p-6 space-y-4"
    >
      <label className="block">
        <span className="block font-pixel text-[10px] text-zinc-400 mb-2">CODE</span>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={40}
          className="w-full px-3 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-100 font-mono uppercase tracking-widest focus:outline-none focus:border-indigo-500 transition"
          placeholder="BUGRUSH2026"
        />
      </label>

      {err && <p className="text-xs text-fuchsia-400 font-mono">{err}</p>}
      {result && (
        <div className="text-xs font-mono text-indigo-400 space-y-1">
          <div>REDEEMED ✓</div>
          {result.pointsAwarded > 0 && <div>+{result.pointsAwarded} P</div>}
          {result.cosmeticsGranted > 0 && (
            <div>{result.cosmeticsGranted} cosmetic{result.cosmeticsGranted === 1 ? "" : "s"} granted</div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={!code.trim() || busy}
        className={`btn-press w-full px-5 py-2.5 font-pixel text-[11px] border-2 border-zinc-950 ${
          busy || !code.trim() ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500 text-zinc-950"
        }`}
      >
        {busy ? "···" : "▶ REDEEM"}
      </button>
    </form>
  );
}
