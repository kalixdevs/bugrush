"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRealtime } from "@/lib/realtimeClient";
import { useSession } from "@/lib/auth-client";
import Avatar from "./Avatar";
import BadgeIcon from "./BadgeIcon";
import { findBadge } from "@/lib/badges";

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
  senderRole?: string;
  senderFrame?: string | null;
  senderTitle?: string | null;
  senderNameEffect?: string | null;
  senderShowcaseBadgeId?: string | null;
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
  // First-ever visit: default closed on small viewports so the drawer
  // doesn't cover the whole page on phones.
  if (v === null) return window.innerWidth >= 1024;
  return v === "1";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch viewer role once we know they're logged in.
  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    fetch("/api/me/role").then((r) => r.json()).then((j) => {
      if (!cancelled) setIsAdmin(j.role === "admin");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [loggedIn]);

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

  // Realtime appends + delete + clear handling.
  useEffect(() => {
    return rt.subscribe((payload: unknown) => {
      const p = payload as Partial<Msg> & { kind?: string; type?: string };
      if (p.kind === "message" && p.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === p.id)) return prev;
          return [...prev, p as Msg].slice(-200);
        });
      } else if (p.type === "message-deleted" && p.id) {
        setMessages((prev) => prev.filter((m) => m.id !== p.id));
      } else if (p.type === "chat-cleared") {
        setMessages([]);
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
        if (j.error === "muted" && j.until) {
          setErr(`muted until ${new Date(j.until).toLocaleString()}`);
        } else if (j.error === "slow down" && typeof j.retryInMs === "number") {
          setErr(`slow mode: ${Math.ceil(j.retryInMs / 1000)}s left`);
        } else {
          setErr(j.error ?? "failed");
        }
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
    <>
      {/* Backdrop for mobile drawer — only visible below lg. */}
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-30 bg-zinc-950/70 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
      />
      <aside className="fixed left-0 top-0 bottom-0 z-40 w-full sm:w-80 lg:w-72 border-r-2 border-zinc-800 bg-zinc-950 flex flex-col">
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
          <Message key={m.id} m={m} isAdmin={isAdmin} />
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
    </>
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

const MUTE_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: "5m", minutes: 5 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "1d", minutes: 60 * 24 },
  { label: "PERM", minutes: 99 * 365 * 24 * 60 },
];

function Message({ m, isAdmin }: { m: Msg; isAdmin: boolean }) {
  const isAchievement = m.chatKind === "achievement";
  const matchMeta = isMatchMeta(m.meta) ? m.meta : null;
  const time = fmtTime(m.createdAt);
  const isSenderAdmin = m.senderRole === "admin";
  const [showMute, setShowMute] = useState(false);

  const deleteMsg = async () => {
    await fetch(`/api/admin/chat/${m.id}`, { method: "DELETE" });
  };
  const muteUser = async (minutes: number | null) => {
    setShowMute(false);
    await fetch(`/api/admin/users/${m.userId}/mute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
  };

  if (isAchievement) {
    const meta = (m.meta ?? {}) as { badgeId?: string; badgeName?: string };
    const badge = meta.badgeId ? findBadge(meta.badgeId) : undefined;
    const badgeName = badge?.name ?? meta.badgeName ?? "achievement";
    return (
      <div className="group relative border-2 border-amber-400 bg-amber-400/10 px-3 py-2 flex items-center gap-3">
        {badge && (
          <div className="flex-shrink-0">
            <BadgeIcon badge={badge} size={36} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-pixel text-[9px] tracking-widest text-amber-400">
            ACHIEVEMENT UNLOCKED
          </div>
          <div className="text-sm text-amber-100 font-semibold leading-snug">
            <span className="text-amber-200">{m.name}</span>{" "}
            <span className="text-amber-100/70">earned</span>{" "}
            <span className="text-amber-100">{badgeName}</span>
          </div>
        </div>
        <span className="text-[10px] text-amber-400/60 font-mono self-start">{time}</span>
        {isAdmin && (
          <button
            onClick={deleteMsg}
            className="absolute top-1 right-8 opacity-0 group-hover:opacity-100 text-fuchsia-400 hover:text-fuchsia-300 text-xs px-1 transition"
            title="Delete message"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group flex gap-2.5 relative">
      <div className="flex-shrink-0">
        <Avatar src={m.image} name={m.name} size={32} frameSrc={m.senderFrame} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span
            className={`text-sm font-semibold truncate ${isSenderAdmin ? "name-admin" : m.senderNameEffect ?? ""} ${
              isAchievement ? "text-amber-300" : isSenderAdmin ? "text-purple-400" : "text-zinc-100"
            }`}
          >
            {m.name}
          </span>
          {isSenderAdmin && (
            <span className="font-pixel text-[8px] tracking-widest px-1.5 py-0.5 border-2 border-purple-400 text-purple-300 leading-none">
              ADMIN
            </span>
          )}
          {m.senderTitle && (
            <span className="font-pixel text-[8px] tracking-widest px-1.5 py-0.5 border-2 border-amber-400 text-amber-300 leading-none">
              {m.senderTitle}
            </span>
          )}
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

      {isAdmin && (
        <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition bg-zinc-950/90 px-1">
          <button
            onClick={deleteMsg}
            className="text-fuchsia-400 hover:text-fuchsia-300 text-xs px-1"
            title="Delete message"
          >
            ✕
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMute((v) => !v)}
              className="text-amber-400 hover:text-amber-300 text-xs px-1"
              title="Mute user"
            >
              ⏱
            </button>
            {showMute && (
              <div className="absolute right-0 top-5 z-10 border-2 border-zinc-700 bg-zinc-950 p-1 flex flex-col gap-1 min-w-[80px]">
                {MUTE_OPTIONS.map((o) => (
                  <button
                    key={o.label}
                    onClick={() => muteUser(o.minutes)}
                    className="font-pixel text-[10px] text-fuchsia-300 hover:bg-fuchsia-500/10 px-2 py-1 text-left"
                  >
                    {o.label}
                  </button>
                ))}
                <button
                  onClick={() => muteUser(null)}
                  className="font-pixel text-[10px] text-zinc-400 hover:bg-zinc-800 px-2 py-1 text-left border-t border-zinc-800"
                >
                  UNMUTE
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
