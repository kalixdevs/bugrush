"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CosmeticRow = {
  id: string;
  category: string;
  name: string;
  description: string;
  rarity: string;
  priceCoins: number | null;
  enabled: boolean;
};

const RARITIES = ["common", "rare", "epic", "legendary"] as const;
const inputCls = "bg-zinc-950 border-2 border-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 outline-none";

function Row({ initial }: { initial: CosmeticRow }) {
  const router = useRouter();
  const [row, setRow] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function patch<K extends keyof CosmeticRow>(key: K, value: CosmeticRow[K]) {
    setRow((r) => ({ ...r, [key]: value }));
    setDirty(true);
  }

  async function save() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/cosmetics/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: row.name,
          description: row.description,
          priceCoins: row.priceCoins,
          rarity: row.rarity,
          enabled: row.enabled,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "failed");
      setDirty(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-3 grid grid-cols-[160px_1fr_2fr_100px_120px_70px_auto] gap-3 items-center text-xs">
      <div className="font-mono text-zinc-500 truncate" title={row.id}>{row.id}</div>
      <input className={inputCls} value={row.name} onChange={(e) => patch("name", e.target.value)} />
      <input className={inputCls} value={row.description} onChange={(e) => patch("description", e.target.value)} />
      <input
        type="number"
        min="0"
        className={inputCls}
        value={row.priceCoins ?? ""}
        onChange={(e) => patch("priceCoins", e.target.value === "" ? null : Number(e.target.value))}
      />
      <select className={inputCls} value={row.rarity} onChange={(e) => patch("rarity", e.target.value)}>
        {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label className="flex items-center gap-2 font-pixel text-[10px] text-zinc-400">
        <input type="checkbox" checked={row.enabled} onChange={(e) => patch("enabled", e.target.checked)} />
        ON
      </label>
      <button
        onClick={save}
        disabled={!dirty || busy}
        className={`font-pixel text-[10px] px-3 py-1 border-2 transition ${
          dirty ? "border-indigo-500 bg-indigo-500/20 text-indigo-200" : "border-zinc-800 text-zinc-600"
        }`}
      >
        {busy ? "…" : err ? "RETRY" : dirty ? "SAVE" : "SAVED"}
      </button>
    </div>
  );
}

export default function CosmeticAdminPanel({ cosmetics }: { cosmetics: CosmeticRow[] }) {
  const byCat = new Map<string, CosmeticRow[]>();
  for (const c of cosmetics) {
    if (!byCat.has(c.category)) byCat.set(c.category, []);
    byCat.get(c.category)!.push(c);
  }
  return (
    <div className="space-y-10">
      {Array.from(byCat.entries()).map(([cat, items]) => (
        <section key={cat}>
          <h2 className="font-pixel text-lg mb-3">{cat.toUpperCase()}</h2>
          <div className="border-2 border-zinc-800 bg-zinc-900 divide-y-2 divide-zinc-800">
            <div className="px-4 py-2 grid grid-cols-[160px_1fr_2fr_100px_120px_70px_auto] gap-3 font-pixel text-[10px] text-zinc-500 tracking-widest">
              <div>ID</div><div>NAME</div><div>DESCRIPTION</div><div>PRICE</div><div>RARITY</div><div>ENABLED</div><div></div>
            </div>
            {items.map((c) => <Row key={c.id} initial={c} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
