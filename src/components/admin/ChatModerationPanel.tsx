"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type MsgRow = { id: string; body: string; createdAt: string; authorName: string };

const SLOW_OPTIONS = [0, 5, 10, 30, 60];

export default function ChatModerationPanel({
  initialSlowMode,
  initialMessages,
}: {
  initialSlowMode: number;
  initialMessages: MsgRow[];
}) {
  const router = useRouter();
  const [slow, setSlow] = useState<number>(initialSlowMode);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  const saveSlow = async (seconds: number) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/chat/slowmode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }),
      });
      if (res.ok) {
        setSlow(seconds);
        router.refresh();
      }
    } finally { setBusy(false); }
  };

  const clearChat = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      confirmTimer.current = setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmClear(false);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/chat/clear", { method: "POST" });
      if (res.ok) router.refresh();
    } finally { setBusy(false); }
  };

  const deleteOne = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/chat/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-pixel text-lg mb-3">SLOW MODE</h2>
        <div className="flex flex-wrap gap-2">
          {SLOW_OPTIONS.map((s) => {
            const on = s === slow;
            return (
              <button
                key={s}
                disabled={busy}
                onClick={() => saveSlow(s)}
                className={`px-3 py-2 border-2 font-pixel text-xs tracking-wider transition ${
                  on ? "border-indigo-500 bg-indigo-500 text-zinc-950" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {s === 0 ? "OFF" : `${s}s`}
              </button>
            );
          })}
        </div>
        <p className="text-zinc-500 text-xs font-mono mt-2">
          Per-user cooldown between messages. Affects all non-admin users.
        </p>
      </section>

      <section>
        <h2 className="font-pixel text-lg mb-3">CLEAR CHAT</h2>
        <button
          onClick={clearChat}
          disabled={busy}
          className={`btn-press font-pixel text-xs px-5 py-2 border-2 ${
            confirmClear
              ? "border-zinc-950 bg-fuchsia-500 text-zinc-950"
              : "border-zinc-950 bg-zinc-800 text-zinc-100"
          }`}
        >
          {confirmClear ? "▶ CONFIRM CLEAR ALL" : "▶ CLEAR ALL CHAT"}
        </button>
        <p className="text-zinc-500 text-xs font-mono mt-2">
          Wipes every chat message for every user. Two-step.
        </p>
      </section>

      <section>
        <h2 className="font-pixel text-lg mb-3">RECENT MESSAGES</h2>
        {initialMessages.length === 0 ? (
          <div className="text-zinc-500 text-sm font-mono">Chat is empty.</div>
        ) : (
          <div className="border-2 border-zinc-800 bg-zinc-900 divide-y-2 divide-zinc-800">
            {initialMessages.map((m) => (
              <div key={m.id} className="px-4 py-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono text-zinc-500">
                    {m.authorName} · {new Date(m.createdAt).toLocaleTimeString()}
                  </div>
                  <div className="text-sm text-zinc-200 break-words">{m.body}</div>
                </div>
                <button
                  onClick={() => deleteOne(m.id)}
                  disabled={busy}
                  className="font-pixel text-[10px] text-fuchsia-400 hover:text-fuchsia-300 border-2 border-fuchsia-500 px-2 py-1"
                >
                  DELETE
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
