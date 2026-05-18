"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "none" | "outgoing" | "incoming" | "accepted" | "self" | "loading";

export default function AddFriendButton({ handle }: { handle: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await fetch("/api/friends", { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as {
        friends: { id: string; handle: string | null }[];
        outgoing: { id: string; handle: string | null }[];
        incoming: { id: string; handle: string | null }[];
      };
      const lc = handle.toLowerCase();
      const f = j.friends.find((x) => x.handle?.toLowerCase() === lc);
      if (f) { setStatus("accepted"); setFriendshipId(f.id); return; }
      const o = j.outgoing.find((x) => x.handle?.toLowerCase() === lc);
      if (o) { setStatus("outgoing"); setFriendshipId(o.id); return; }
      const i = j.incoming.find((x) => x.handle?.toLowerCase() === lc);
      if (i) { setStatus("incoming"); setFriendshipId(i.id); return; }
      setStatus("none");
      setFriendshipId(null);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    let cancelled = false;
    fetch("/api/friends", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        const lc = handle.toLowerCase();
        const f = (j.friends as { id: string; handle: string | null }[]).find((x) => x.handle?.toLowerCase() === lc);
        if (f) { setStatus("accepted"); setFriendshipId(f.id); return; }
        const o = (j.outgoing as { id: string; handle: string | null }[]).find((x) => x.handle?.toLowerCase() === lc);
        if (o) { setStatus("outgoing"); setFriendshipId(o.id); return; }
        const i = (j.incoming as { id: string; handle: string | null }[]).find((x) => x.handle?.toLowerCase() === lc);
        if (i) { setStatus("incoming"); setFriendshipId(i.id); return; }
        setStatus("none");
        setFriendshipId(null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [handle]);

  const send = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      if (r.ok) await load();
    } finally { setBusy(false); }
  };
  const accept = async () => {
    if (!friendshipId) return;
    setBusy(true);
    try {
      await fetch(`/api/friends/${friendshipId}/accept`, { method: "POST" });
      await load();
      router.refresh();
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!friendshipId) return;
    setBusy(true);
    try {
      await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      await load();
      router.refresh();
    } finally { setBusy(false); }
  };

  if (status === "loading") return null;
  if (status === "self") return null;

  if (status === "accepted") {
    return (
      <button
        onClick={remove}
        disabled={busy}
        className="font-pixel text-[10px] px-3 py-1.5 border-2 border-emerald-500 text-emerald-300 hover:border-fuchsia-500 hover:text-fuchsia-300 transition"
        title="Unfriend"
      >
        ✓ FRIENDS
      </button>
    );
  }
  if (status === "outgoing") {
    return (
      <button
        onClick={remove}
        disabled={busy}
        className="font-pixel text-[10px] px-3 py-1.5 border-2 border-zinc-700 text-zinc-400 hover:border-zinc-500"
      >
        PENDING…
      </button>
    );
  }
  if (status === "incoming") {
    return (
      <button
        onClick={accept}
        disabled={busy}
        className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-[10px] px-3 py-1.5"
      >
        ▶ ACCEPT REQUEST
      </button>
    );
  }
  return (
    <button
      onClick={send}
      disabled={busy}
      className="btn-press bg-indigo-500 text-zinc-950 font-pixel text-[10px] px-3 py-1.5"
    >
      ▶ ADD FRIEND
    </button>
  );
}
