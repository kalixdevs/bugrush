"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnnouncementEditor({ initial }: { initial: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true); setErr(null); setSaved(false);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "failed");
      setSaved(true);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        maxLength={280}
        rows={3}
        placeholder="e.g. working on a bug rn — back in 10"
        className="w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none resize-none font-mono"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-xs px-5 py-2 disabled:opacity-50"
        >
          {busy ? "SAVING…" : saved ? "SAVED ✓" : "▶ SAVE"}
        </button>
        <span className="text-zinc-500 text-xs font-mono">{value.length}/280</span>
        {err && <span className="text-fuchsia-400 text-xs font-mono">{err}</span>}
      </div>
    </div>
  );
}
