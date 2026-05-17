"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserRow = {
  id: string;
  handle: string | null;
  name: string | null;
  email: string;
  role: string;
  points: number;
  rankPoints: number;
  createdAt: string;
};

type CosmeticOpt = { id: string; name: string; rarity: string };

const inputCls = "bg-zinc-950 border-2 border-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:border-indigo-500 outline-none";

function UserDrawer({
  user,
  cosmetics,
  selfId,
  onClose,
}: {
  user: UserRow;
  cosmetics: CosmeticOpt[];
  selfId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pointsAmt, setPointsAmt] = useState(0);
  const [rankAmt, setRankAmt] = useState(0);
  const [cosmeticId, setCosmeticId] = useState(cosmetics[0]?.id ?? "");

  async function call(endpoint: string, body: unknown) {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "failed");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  const isSelf = user.id === selfId;
  const targetRole = user.role === "admin" ? "user" : "admin";

  return (
    <div className="border-2 border-indigo-500 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-pixel text-sm text-indigo-300">{user.handle ?? user.name ?? user.email}</div>
          <div className="text-xs font-mono text-zinc-400">{user.email}</div>
          <div className="text-xs font-mono text-zinc-500">id: {user.id}</div>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100 text-xs font-pixel">CLOSE ✕</button>
      </div>

      {err && <div className="text-fuchsia-400 text-xs font-mono">{err}</div>}

      <div className="grid grid-cols-2 gap-4">
        <div className="border-2 border-zinc-800 p-3 space-y-2">
          <div className="font-pixel text-[10px] text-zinc-400 tracking-widest">ROLE</div>
          <div className="text-sm font-mono text-zinc-300">{user.role}</div>
          <button
            disabled={busy || isSelf}
            onClick={() => call(`/api/admin/users/${user.id}/role`, { role: targetRole })}
            className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-[10px] px-3 py-1 disabled:opacity-50"
          >
            {isSelf ? "CAN'T DEMOTE SELF" : `▶ MAKE ${targetRole.toUpperCase()}`}
          </button>
        </div>

        <div className="border-2 border-zinc-800 p-3 space-y-2">
          <div className="font-pixel text-[10px] text-zinc-400 tracking-widest">GRANT COSMETIC</div>
          <select className={inputCls + " w-full"} value={cosmeticId} onChange={(e) => setCosmeticId(e.target.value)}>
            {cosmetics.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.rarity}</option>
            ))}
          </select>
          <button
            disabled={busy || !cosmeticId}
            onClick={() => call(`/api/admin/users/${user.id}/grant`, { kind: "cosmetic", cosmeticId })}
            className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-[10px] px-3 py-1 disabled:opacity-50"
          >
            ▶ GRANT
          </button>
        </div>

        <div className="border-2 border-zinc-800 p-3 space-y-2">
          <div className="font-pixel text-[10px] text-zinc-400 tracking-widest">GRANT POINTS (current: {user.points})</div>
          <input type="number" className={inputCls + " w-full"} value={pointsAmt} onChange={(e) => setPointsAmt(Number(e.target.value))} />
          <button
            disabled={busy || pointsAmt === 0}
            onClick={() => call(`/api/admin/users/${user.id}/grant`, { kind: "points", amount: pointsAmt })}
            className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-[10px] px-3 py-1 disabled:opacity-50"
          >
            ▶ APPLY
          </button>
        </div>

        <div className="border-2 border-zinc-800 p-3 space-y-2">
          <div className="font-pixel text-[10px] text-zinc-400 tracking-widest">GRANT RANK POINTS (current: {user.rankPoints})</div>
          <input type="number" className={inputCls + " w-full"} value={rankAmt} onChange={(e) => setRankAmt(Number(e.target.value))} />
          <button
            disabled={busy || rankAmt === 0}
            onClick={() => call(`/api/admin/users/${user.id}/grant`, { kind: "rankPoints", amount: rankAmt })}
            className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-[10px] px-3 py-1 disabled:opacity-50"
          >
            ▶ APPLY
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserAdminPanel({
  initialUsers,
  cosmetics,
  selfId,
}: {
  initialUsers: UserRow[];
  cosmetics: CosmeticOpt[];
  selfId: string;
}) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const j = await res.json();
        setUsers(j.users);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <input
        className={inputCls + " w-full text-sm"}
        placeholder="Search handle / email / name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {selected && (
        <UserDrawer
          user={selected}
          cosmetics={cosmetics}
          selfId={selfId}
          onClose={() => setSelectedId(null)}
        />
      )}

      <div className="border-2 border-zinc-800 bg-zinc-900 divide-y-2 divide-zinc-800">
        <div className="px-4 py-2 grid grid-cols-[1fr_1fr_2fr_70px_80px_80px_70px] gap-3 font-pixel text-[10px] text-zinc-500 tracking-widest">
          <div>NAME</div><div>HANDLE</div><div>EMAIL</div><div>ROLE</div><div>POINTS</div><div>RANK</div><div></div>
        </div>
        {users.map((u) => (
          <div key={u.id} className="px-4 py-2 grid grid-cols-[1fr_1fr_2fr_70px_80px_80px_70px] gap-3 items-center text-xs">
            <div className="text-zinc-300 truncate">{u.name ?? "—"}</div>
            <div className="text-indigo-300 font-mono truncate">{u.handle ?? "—"}</div>
            <div className="text-zinc-400 font-mono truncate">{u.email}</div>
            <div className={`font-pixel text-[10px] ${u.role === "admin" ? "text-amber-300" : "text-zinc-500"}`}>{u.role.toUpperCase()}</div>
            <div className="font-mono text-zinc-300">{u.points}</div>
            <div className="font-mono text-zinc-300">{u.rankPoints}</div>
            <button
              onClick={() => setSelectedId(u.id === selectedId ? null : u.id)}
              className="font-pixel text-[10px] text-indigo-300 hover:text-indigo-200 border-2 border-indigo-500 px-2 py-0.5"
            >
              {u.id === selectedId ? "HIDE" : "EDIT"}
            </button>
          </div>
        ))}
        {users.length === 0 && (
          <div className="px-4 py-6 text-center text-zinc-500 text-sm font-mono">No users match.</div>
        )}
      </div>
    </div>
  );
}
