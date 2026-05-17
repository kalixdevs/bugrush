"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CodeRow = {
  code: string;
  rewardJson: { points?: number; cosmeticIds?: string[] };
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
};

type CosmeticOpt = { id: string; name: string; rarity: string };

const labelCls = "font-pixel text-[10px] text-zinc-400 tracking-widest block mb-1";
const inputCls = "w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none";

export default function CodeAdminPanel({
  initialCodes,
  cosmetics,
}: {
  initialCodes: CodeRow[];
  cosmetics: CosmeticOpt[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "",
    points: 0,
    cosmeticIds: [] as string[],
    maxUses: "" as "" | number,
    expiresAt: "",
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const body: Record<string, unknown> = { code: form.code };
      if (form.points > 0) body.points = form.points;
      if (form.cosmeticIds.length > 0) body.cosmeticIds = form.cosmeticIds;
      if (form.maxUses !== "") body.maxUses = Number(form.maxUses);
      if (form.expiresAt) body.expiresAt = new Date(form.expiresAt).toISOString();
      const res = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "failed");
      }
      setForm({ code: "", points: 0, cosmeticIds: [], maxUses: "", expiresAt: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(code: string) {
    if (!confirm(`Delete code ${code}?`)) return;
    const res = await fetch(`/api/admin/codes/${encodeURIComponent(code)}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  function toggleCosmetic(id: string) {
    setForm((f) => ({
      ...f,
      cosmeticIds: f.cosmeticIds.includes(id)
        ? f.cosmeticIds.filter((x) => x !== id)
        : [...f.cosmeticIds, id],
    }));
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-pixel text-xl mb-4">CREATE CODE</h2>
        <form onSubmit={create} className="border-2 border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div>
            <label className={labelCls}>CODE</label>
            <input
              className={inputCls + " uppercase font-mono"}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="WELCOME"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>POINTS REWARD</label>
              <input type="number" min="0" className={inputCls} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>MAX USES (blank = unlimited)</label>
              <input type="number" min="1" className={inputCls} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value === "" ? "" : Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>EXPIRES AT (blank = never)</label>
            <input type="datetime-local" className={inputCls} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>COSMETIC REWARDS</label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border-2 border-zinc-800 bg-zinc-950 p-3">
              {cosmetics.map((c) => {
                const on = form.cosmeticIds.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleCosmetic(c.id)}
                    className={`px-2 py-1 border-2 text-[10px] font-pixel tracking-wider transition ${on ? "border-indigo-500 bg-indigo-500/20 text-indigo-200" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}
                  >
                    {c.name} <span className="text-zinc-500">·{c.rarity}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {error && <div className="text-fuchsia-400 text-xs font-mono">{error}</div>}
          <button type="submit" disabled={busy} className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-xs px-5 py-2 disabled:opacity-50">
            {busy ? "CREATING…" : "▶ CREATE CODE"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-pixel text-xl mb-4">CODES</h2>
        {initialCodes.length === 0 && (
          <div className="text-zinc-500 text-sm font-mono">No codes yet.</div>
        )}
        <div className="border-2 border-zinc-800 bg-zinc-900 divide-y-2 divide-zinc-800">
          {initialCodes.map((c) => {
            const reward: string[] = [];
            if (c.rewardJson.points) reward.push(`${c.rewardJson.points} P`);
            if (c.rewardJson.cosmeticIds?.length) reward.push(`${c.rewardJson.cosmeticIds.length} cosmetic(s)`);
            const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
            const maxed = c.maxUses != null && c.usedCount >= c.maxUses;
            return (
              <div key={c.code} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-indigo-300">{c.code}</span>
                    {expired && <span className="px-2 py-0.5 border-2 border-fuchsia-500 text-fuchsia-300 font-pixel text-[9px]">EXPIRED</span>}
                    {maxed && <span className="px-2 py-0.5 border-2 border-fuchsia-500 text-fuchsia-300 font-pixel text-[9px]">MAXED</span>}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-1">{reward.join(" + ")}</div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {c.usedCount}{c.maxUses != null ? `/${c.maxUses}` : ""} uses{c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleString()}` : ""}
                  </div>
                </div>
                <button onClick={() => remove(c.code)} className="font-pixel text-[10px] text-fuchsia-400 hover:text-fuchsia-300 border-2 border-fuchsia-500 px-3 py-1">DELETE</button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
