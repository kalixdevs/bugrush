"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Slot = { seed: number; userId: string | null; handle: string | null; name: string | null };
type Tournament = {
  id: string;
  name: string;
  size: number;
  status: string;
  difficulty: string;
  language: string;
  roundSeconds: number;
  createdAt: string;
  slots: Slot[];
};

const inputCls = "bg-zinc-900 border-2 border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none";
const labelCls = "font-pixel text-[10px] text-zinc-400 tracking-widest block mb-1";

export default function TournamentAdminPanel({ initial }: { initial: Tournament[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Bug Bash",
    size: 4 as 4 | 8 | 16,
    difficulty: "normal" as "easy" | "normal" | "hard" | "hardcore",
    language: "javascript" as "javascript" | "python" | "typescript" | "cpp" | "csharp" | "ruby",
    roundSeconds: 60 as 30 | 60 | 120,
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "failed");
      router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this tournament?")) return;
    const res = await fetch(`/api/admin/tournaments/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-pixel text-xl mb-4">CREATE TOURNAMENT</h2>
        <form onSubmit={create} className="border-2 border-zinc-800 bg-zinc-900 p-5 space-y-4">
          <div>
            <label className={labelCls}>NAME</label>
            <input className={inputCls + " w-full"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>SIZE</label>
              <select className={inputCls + " w-full"} value={form.size} onChange={(e) => setForm({ ...form, size: Number(e.target.value) as 4 | 8 | 16 })}>
                {[4, 8, 16].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>DIFFICULTY</label>
              <select className={inputCls + " w-full"} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as typeof form.difficulty })}>
                {["easy", "normal", "hard", "hardcore"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>LANGUAGE</label>
              <select className={inputCls + " w-full"} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as typeof form.language })}>
                {["javascript", "python", "typescript", "cpp", "csharp", "ruby"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>ROUND SECONDS</label>
              <select className={inputCls + " w-full"} value={form.roundSeconds} onChange={(e) => setForm({ ...form, roundSeconds: Number(e.target.value) as 30 | 60 | 120 })}>
                {[30, 60, 120].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {err && <div className="text-fuchsia-400 text-xs font-mono">{err}</div>}
          <button type="submit" disabled={busy} className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-xs px-5 py-2 disabled:opacity-50">
            {busy ? "CREATING…" : "▶ CREATE TOURNAMENT"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-pixel text-xl">TOURNAMENTS</h2>
        {initial.length === 0 && (
          <div className="text-zinc-500 text-sm font-mono">No tournaments yet.</div>
        )}
        {initial.map((t) => (
          <TournamentRow key={t.id} t={t} onDelete={() => remove(t.id)} />
        ))}
      </section>
    </div>
  );
}

function TournamentRow({ t, onDelete }: { t: Tournament; onDelete: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function setSlot(seed: number, handle: string | null) {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${t.id}/slot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed, handle }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "failed");
      router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  async function start() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "failed");
      router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  }

  const filled = t.slots.filter((s) => s.userId).length;
  const live = t.status === "in_progress" || t.status === "finished";

  return (
    <div className="border-2 border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-pixel text-sm text-zinc-100">{t.name}</div>
          <div className="text-xs text-zinc-500 font-mono mt-1">
            {t.size} · {t.difficulty} · {t.language} · {t.roundSeconds}s · <span className={t.status === "in_progress" ? "text-indigo-300" : t.status === "finished" ? "text-amber-300" : "text-zinc-400"}>{t.status.toUpperCase()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {live && (
            <Link
              href={`/tournament/${t.id}`}
              className="font-pixel text-[10px] text-indigo-300 hover:text-indigo-200 border-2 border-indigo-500 px-3 py-1"
            >
              ▶ VIEW BRACKET
            </Link>
          )}
          {t.status === "draft" && filled === t.size && (
            <button
              onClick={start}
              disabled={busy}
              className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-[10px] px-3 py-1"
            >
              ▶ START
            </button>
          )}
          {t.status !== "in_progress" && (
            <button
              onClick={onDelete}
              disabled={busy}
              className="font-pixel text-[10px] text-fuchsia-400 hover:text-fuchsia-300 border-2 border-fuchsia-500 px-2 py-1"
            >
              DELETE
            </button>
          )}
        </div>
      </div>

      {err && <div className="text-fuchsia-400 text-xs font-mono">{err}</div>}

      {t.status === "draft" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t-2 border-zinc-800">
          {t.slots.map((s) => (
            <SlotInput key={s.seed} slot={s} onSet={setSlot} disabled={busy} />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotInput({ slot, onSet, disabled }: { slot: Slot; onSet: (seed: number, handle: string | null) => void; disabled: boolean }) {
  const [value, setValue] = useState(slot.handle ?? "");
  return (
    <div className="flex items-center gap-1">
      <span className="font-pixel text-[10px] text-zinc-500 w-6 text-right">#{slot.seed + 1}</span>
      <input
        className="flex-1 bg-zinc-950 border-2 border-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 outline-none"
        placeholder="handle"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const next = value.trim();
          const cur = slot.handle ?? "";
          if (next === cur) return;
          onSet(slot.seed, next.length === 0 ? null : next);
        }}
        disabled={disabled}
      />
    </div>
  );
}
