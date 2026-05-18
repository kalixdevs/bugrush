"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { isOnline } from "@/lib/presence";
import { useRealtime } from "@/lib/realtimeClient";

type FriendRow = {
  id: string;
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  lastSeenAt: string | null;
};

type FriendsState = {
  friends: FriendRow[];
  incoming: FriendRow[];
  outgoing: FriendRow[];
};

const EMPTY: FriendsState = { friends: [], incoming: [], outgoing: [] };

export default function FriendsHub() {
  const rt = useRealtime();
  const [state, setState] = useState<FriendsState>(EMPTY);
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "err" } | null>(null);

  const load = async () => {
    try {
      const r = await fetch("/api/friends", { cache: "no-store" });
      if (r.ok) setState(await r.json());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/friends", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setState(j); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Reload on relevant realtime events.
  useEffect(() => {
    return rt.subscribe((p: unknown) => {
      const ev = p as { type?: string };
      if (!ev?.type) return;
      if (
        ev.type === "friend-request-received" ||
        ev.type === "friend-request-accepted"
      ) {
        void load();
      }
    });
  }, [rt]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = handle.trim();
    if (!target || busy) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: target }),
      });
      if (res.ok) {
        const j = await res.json();
        setMsg({ text: j.status === "accepted" ? "Mutual accept — you're friends." : "Request sent.", tone: "ok" });
        setHandle("");
        await load();
      } else {
        const j = await res.json().catch(() => ({}));
        setMsg({ text: j.error ?? "failed", tone: "err" });
      }
    } finally { setBusy(false); }
  };

  const accept = async (id: string) => {
    setBusy(true);
    try {
      await fetch(`/api/friends/${id}/accept`, { method: "POST" });
      await load();
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await fetch(`/api/friends/${id}`, { method: "DELETE" });
      await load();
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-8">
      <section className="border-2 border-zinc-800 bg-zinc-900 p-4">
        <form onSubmit={send} className="flex flex-wrap gap-2">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="add by handle"
            className="flex-1 min-w-[180px] bg-zinc-950 border-2 border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 outline-none font-mono"
          />
          <button
            type="submit"
            disabled={busy || handle.trim().length === 0}
            className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-xs px-4 py-2 disabled:opacity-50"
          >
            ▶ SEND REQUEST
          </button>
        </form>
        {msg && (
          <p className={`mt-2 text-xs font-mono ${msg.tone === "ok" ? "text-emerald-300" : "text-fuchsia-400"}`}>
            {msg.text}
          </p>
        )}
      </section>

      {state.incoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-pixel text-sm text-amber-300 tracking-widest">INCOMING ({state.incoming.length})</h2>
          {state.incoming.map((r) => (
            <Row key={r.id} row={r} right={(
              <div className="flex gap-2">
                <button
                  onClick={() => accept(r.id)}
                  disabled={busy}
                  className="font-pixel text-[10px] px-3 py-1.5 border-2 border-indigo-500 text-indigo-300 hover:bg-indigo-500/10"
                >
                  ACCEPT
                </button>
                <button
                  onClick={() => remove(r.id)}
                  disabled={busy}
                  className="font-pixel text-[10px] px-3 py-1.5 border-2 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                >
                  IGNORE
                </button>
              </div>
            )} />
          ))}
        </section>
      )}

      {state.outgoing.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-pixel text-sm text-zinc-400 tracking-widest">OUTGOING ({state.outgoing.length})</h2>
          {state.outgoing.map((r) => (
            <Row key={r.id} row={r} right={(
              <button
                onClick={() => remove(r.id)}
                disabled={busy}
                className="font-pixel text-[10px] px-3 py-1.5 border-2 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              >
                CANCEL
              </button>
            )} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-pixel text-sm text-indigo-300 tracking-widest">FRIENDS ({state.friends.length})</h2>
        {state.friends.length === 0 ? (
          <div className="border-2 border-zinc-800 bg-zinc-900 p-6 text-center text-sm text-zinc-500">
            no friends yet — add someone by handle above.
          </div>
        ) : (
          state.friends.map((r) => (
            <Row key={r.id} row={r} right={(
              <button
                onClick={() => {
                  if (!confirm("Unfriend?")) return;
                  remove(r.id);
                }}
                disabled={busy}
                className="font-pixel text-[10px] px-3 py-1.5 border-2 border-zinc-700 text-zinc-400 hover:border-fuchsia-500 hover:text-fuchsia-300"
              >
                UNFRIEND
              </button>
            )} showOnline />
          ))
        )}
      </section>
    </div>
  );
}

function Row({
  row, right, showOnline,
}: {
  row: FriendRow;
  right: React.ReactNode;
  showOnline?: boolean;
}) {
  const label = row.handle ?? row.name ?? "anon";
  const online = showOnline && isOnline(row.lastSeenAt);
  return (
    <div className="flex items-center gap-3 border-2 border-zinc-800 bg-zinc-900 px-3 py-2">
      <div className="relative flex-shrink-0">
        <Avatar src={row.image} name={label} size={32} />
        {showOnline && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-zinc-900 ${
              online ? "bg-emerald-400" : "bg-zinc-600"
            }`}
            title={online ? "online" : "offline"}
          />
        )}
      </div>
      <Link
        href={row.handle ? `/u/${row.handle}` : "#"}
        className="text-sm font-semibold text-zinc-100 hover:text-indigo-300 transition truncate flex-1"
      >
        {label}
      </Link>
      {right}
    </div>
  );
}
