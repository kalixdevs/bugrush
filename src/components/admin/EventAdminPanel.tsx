"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EventRow = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  pointsMultiplier: number;
  rankPointsMultiplier: number;
  exclusiveDrops: string[];
};

type CosmeticOpt = {
  id: string;
  name: string;
  rarity: string;
  category: string;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventAdminPanel({
  initialEvents,
  cosmetics,
}: {
  initialEvents: EventRow[];
  cosmetics: CosmeticOpt[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const nowPlus = (h: number) => {
    const d = new Date(now);
    d.setHours(d.getHours() + h);
    return d.toISOString();
  };
  const [form, setForm] = useState({
    name: "DOUBLE POINTS",
    startsAt: toLocalInput(nowPlus(0)),
    endsAt: toLocalInput(nowPlus(24)),
    pointsMultiplier: 2,
    rankPointsMultiplier: 2,
    exclusiveDrops: [] as string[],
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          pointsMultiplier: Number(form.pointsMultiplier),
          rankPointsMultiplier: Number(form.rankPointsMultiplier),
          exclusiveDrops: form.exclusiveDrops,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "create failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  function toggleDrop(id: string) {
    setForm((f) => ({
      ...f,
      exclusiveDrops: f.exclusiveDrops.includes(id)
        ? f.exclusiveDrops.filter((x) => x !== id)
        : [...f.exclusiveDrops, id],
    }));
  }

  const labelCls = "font-pixel text-[10px] text-zinc-400 tracking-widest block mb-1";
  const inputCls = "w-full bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none";

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-pixel text-xl mb-4">CREATE EVENT</h2>
        <form onSubmit={create} className="border-2 border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div>
            <label className={labelCls}>NAME</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>STARTS AT</label>
              <input type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>ENDS AT</label>
              <input type="datetime-local" className={inputCls} value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>POINTS MULTIPLIER</label>
              <input type="number" step="0.1" min="0" max="10" className={inputCls} value={form.pointsMultiplier} onChange={(e) => setForm({ ...form, pointsMultiplier: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelCls}>RANK POINTS MULTIPLIER</label>
              <input type="number" step="0.1" min="0" max="10" className={inputCls} value={form.rankPointsMultiplier} onChange={(e) => setForm({ ...form, rankPointsMultiplier: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>EXCLUSIVE DROPS (cosmetics)</label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border-2 border-zinc-800 bg-zinc-950 p-3">
              {cosmetics.map((c) => {
                const on = form.exclusiveDrops.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => toggleDrop(c.id)}
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
            {busy ? "CREATING…" : "▶ CREATE EVENT"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-pixel text-xl mb-4">EVENTS</h2>
        {initialEvents.length === 0 && (
          <div className="text-zinc-500 text-sm font-mono">No events yet.</div>
        )}
        <div className="space-y-3">
          {initialEvents.map((e) => {
            const live = new Date(e.startsAt) <= now && new Date(e.endsAt) > now;
            return (
              <div key={e.id} className="border-2 border-zinc-800 bg-zinc-900 p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-sm">{e.name}</span>
                    {live && <span className="px-2 py-0.5 border-2 border-indigo-500 text-indigo-300 font-pixel text-[9px]">LIVE</span>}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono mt-1">
                    {new Date(e.startsAt).toLocaleString()} → {new Date(e.endsAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-500 font-mono">
                    {e.pointsMultiplier}× P · {e.rankPointsMultiplier}× RP · {e.exclusiveDrops.length} drops
                  </div>
                </div>
                <button onClick={() => remove(e.id)} className="font-pixel text-[10px] text-fuchsia-400 hover:text-fuchsia-300 border-2 border-fuchsia-500 px-3 py-1">DELETE</button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
