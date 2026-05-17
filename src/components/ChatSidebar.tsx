"use client";

import { useEffect, useRef, useState } from "react";
import { useRealtime } from "@/lib/realtimeClient";
import Avatar from "./Avatar";

type Msg = {
  kind: "message";
  id: string;
  userId: string;
  name: string;
  handle: string | null;
  image: string | null;
  chatKind: string;
  body: string;
  createdAt: string;
};

type Props = { loggedIn: boolean };

export default function ChatSidebar({ loggedIn }: Props) {
  const rt = useRealtime();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat");
        if (!res.ok) return;
        const data = (await res.json()) as { messages: Msg[] };
        if (!cancelled) setMessages(data.messages);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return rt.subscribe((payload: unknown) => {
      const p = payload as Partial<Msg> & { kind?: string; type?: string };
      if (p.kind === "message" && p.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === p.id)) return prev;
          return [...prev, p as Msg].slice(-200);
        });
      }
    });
  }, [rt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/chat/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "failed" }));
        setErr(j.error ?? "failed");
        setBusy(false);
        return;
      }
      try {
        const data = (await res.json()) as { message?: Msg };
        if (data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.message!.id)) return prev;
            return [...prev, data.message!].slice(-200);
          });
        }
      } catch { /* ignore */ }
      setInput("");
    } catch { setErr("failed"); } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b-2 border-zinc-800 flex items-center justify-between">
        <div className="font-pixel text-xs text-indigo-400">LIVE CHAT</div>
        <div
          className={`w-2 h-2 ${rt.connected ? "bg-indigo-400" : "bg-zinc-600"}`}
          title={rt.connected ? "connected" : "reconnecting…"}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <div className="text-zinc-600 text-xs font-mono text-center pt-6">
            quiet in here…
          </div>
        )}
        {messages.map((m) => {
          const isAchievement = m.chatKind === "achievement";
          return (
            <div
              key={m.id}
              className={`flex gap-2 ${
                isAchievement ? "border-l-2 border-amber-400 pl-2 bg-amber-400/5" : ""
              }`}
            >
              <div className="flex-shrink-0 pt-0.5">
                <Avatar src={m.image} name={m.name} size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-pixel text-[9px] text-zinc-500 truncate">
                  {m.name.toLowerCase()}
                </div>
                <div className={`text-xs leading-snug break-words ${isAchievement ? "text-amber-300" : "text-zinc-200"}`}>
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t-2 border-zinc-800 p-3">
        {!loggedIn ? (
          <p className="text-[10px] text-zinc-500 font-mono text-center">
            Log in to chat
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={280}
                disabled={busy}
                placeholder="type a message"
                className="flex-1 px-2 py-1.5 bg-zinc-950 border-2 border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className={`btn-press px-3 py-1.5 font-pixel text-[10px] border-2 border-zinc-950 ${
                  busy || !input.trim() ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500 text-zinc-950"
                }`}
              >
                SEND
              </button>
            </div>
            {err && <p className="text-[10px] text-fuchsia-400 font-mono mt-2">{err}</p>}
          </>
        )}
      </form>
    </div>
  );
}
