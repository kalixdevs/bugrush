"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRealtime } from "@/lib/realtimeClient";
import { useSession } from "@/lib/auth-client";
import Avatar from "./Avatar";

type MatchMeta = {
  matchId: string;
  mode: string;
  language: string;
  difficulty: string;
  status: string;
};

type Msg = {
  kind: "message";
  id: string;
  userId: string;
  name: string;
  handle: string | null;
  image: string | null;
  chatKind: string;
  body: string;
  meta?: MatchMeta | Record<string, unknown> | null;
  createdAt: string;
};

const LS_OPEN = "bugrush:chatOpen";
const ANNOUNCEMENT_POLL_MS = 30_000;

function readInitialOpen(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(LS_OPEN);
  return v === null ? true : v === "1";
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function ChatDock() {
  const rt = useRealtime();
  const { data: session, isPending } = useSession();
  const loggedIn = !!session?.user;

  const [open, setOpen] = useState<boolean>(() => readInitialOpen());
  const [inRound, setInRound] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [announcement, setAnnouncement] = useState<string>("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_OPEN, open ? "1" : "0");
    }
  }, [open]);

  // Reflect chat-open state on body so page content can shift left.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const cls = "chat-open";
    if (open && !inRound) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [open, inRound]);

  // Watch body.in-round so we hide during gameplay.
  useEffect(() => {
    const sync = () => setInRound(document.body.classList.contains("in-round"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Initial history.
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

  // Announcement: fetch initial + poll every 30s.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const res = await fetch("/api/announcement", { cache: "no-store" });
        if (res.ok && !cancelled) {
          const j = (await res.json()) as { value: string };
          setAnnouncement(j.value ?? "");
        }
      } catch { /* ignore */ }
      if (!cancelled) timer = setTimeout(tick, ANNOUNCEMENT_POLL_MS);
    };
    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  // Realtime appends.
  useEffect(() => {
    return rt.subscribe((payload: unknown) => {
      const p = payload as Partial<Msg> & { kind?: string };
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
  }, [messages.length, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true); setErr(null);
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

  if (isPending) return null;
  if (inRound) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 btn-press px-3 py-2 font-pixel text-[10px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
        title="Show chat"
      >
        ▶ CHAT
      </button>
    );
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-40 w-72 border-r-2 border-zinc-800 bg-zinc-900 flex flex-col">
      <div className="px-4 py-3 border-b-2 border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-pixel text-sm text-zinc-100">Chat</h2>
          <div
            className={`w-2 h-2 ${rt.connected ? "bg-indigo-400" : "bg-zinc-600"}`}
            title={rt.connected ? "connected" : "reconnecting…"}
          />
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-zinc-500 hover:text-zinc-100 text-lg leading-none px-2"
          title="Hide chat"
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {announcement && (
        <div className="mx-3 mt-3 px-3 py-2 border-2 border-indigo-500 bg-indigo-500/10 text-indigo-200 text-xs font-mono whitespace-pre-wrap break-words">
          📢 {announcement}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="text-zinc-600 text-xs font-mono text-center pt-6">
            quiet in here…
          </div>
        )}
        {messages.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t-2 border-zinc-800 p-3">
        {!loggedIn ? (
          <p className="text-[11px] text-zinc-500 font-mono text-center">
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
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                className={`btn-press px-3 font-pixel text-[10px] border-2 border-zinc-950 ${
                  busy || !input.trim() ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500 text-zinc-950"
                }`}
              >
                ▶
              </button>
            </div>
            {err && <p className="text-[10px] text-fuchsia-400 font-mono mt-2">{err}</p>}
          </>
        )}
      </form>
    </aside>
  );
}

const LANG_LABEL: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  typescript: "TypeScript",
  cpp: "C++",
  csharp: "C#",
  ruby: "Ruby",
};

function isMatchMeta(meta: unknown): meta is MatchMeta {
  if (!meta || typeof meta !== "object") return false;
  const m = meta as Partial<MatchMeta>;
  return typeof m.matchId === "string" && typeof m.mode === "string";
}

function Message({ m }: { m: Msg }) {
  const isAchievement = m.chatKind === "achievement";
  const matchMeta = isMatchMeta(m.meta) ? m.meta : null;
  const time = fmtTime(m.createdAt);

  return (
    <div className="flex gap-2.5">
      <div className="flex-shrink-0">
        <Avatar src={m.image} name={m.name} size={32} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={`text-sm font-semibold truncate ${isAchievement ? "text-amber-300" : "text-zinc-100"}`}>
            {m.name}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono ml-auto flex-shrink-0">{time}</span>
        </div>
        {matchMeta ? (
          <Link
            href={`/match/${matchMeta.matchId}`}
            className="inline-block px-2.5 py-1.5 border-2 border-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-pixel text-[10px] tracking-wider transition"
          >
            ▶ JOIN {matchMeta.mode.toUpperCase()} · {LANG_LABEL[matchMeta.language] ?? matchMeta.language} · {matchMeta.difficulty.toUpperCase()}
          </Link>
        ) : (
          <div className={`text-sm leading-snug break-words ${isAchievement ? "text-amber-200" : "text-zinc-200"}`}>
            {m.body}
          </div>
        )}
      </div>
    </div>
  );
}
