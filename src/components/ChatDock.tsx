"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRealtime } from "@/lib/realtimeClient";
import { useSession } from "@/lib/auth-client";
import Avatar from "./Avatar";
import BadgeIcon from "./BadgeIcon";
import { findBadge } from "@/lib/badges";
import { isOnline } from "@/lib/presence";
import { useMe } from "./MeProvider";

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

type DmMessage = {
  id: string;
  senderId: string;
  fromMe: boolean;
  body: string;
  meta?: Record<string, unknown> | null;
  createdAt: string;
};

type ThreadRow = {
  threadId: string;
  otherUserId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  lastSeenAt: string | null;
  lastMessageAt: string;
  lastMessage: { body: string; fromMe: boolean; createdAt: string; hasMeta: boolean } | null;
  myLastReadAt: string | null;
  unread: number;
};

type FriendRow = {
  id: string;
  userId: string;
  handle: string | null;
  name: string | null;
  image: string | null;
  lastSeenAt: string | null;
};

const LS_OPEN = "bugrush:chatOpen";
const ANNOUNCEMENT_POLL_MS = 30_000;
const TYPING_TTL_MS = 3_000;
const TYPING_THROTTLE_MS = 2_000;

function readInitialOpen(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(LS_OPEN);
  if (v === null) return window.innerWidth >= 1024;
  return v === "1";
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function isMatchMeta(meta: unknown): meta is MatchMeta {
  if (!meta || typeof meta !== "object") return false;
  const m = meta as Partial<MatchMeta>;
  return typeof m.matchId === "string" && typeof m.mode === "string";
}

const LANG_LABEL: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  typescript: "TypeScript",
  cpp: "C++",
  csharp: "C#",
  ruby: "Ruby",
};

const MUTE_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: "5m", minutes: 5 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "1d", minutes: 60 * 24 },
  { label: "PERM", minutes: 99 * 365 * 24 * 60 },
];

export default function ChatDock() {
  const rt = useRealtime();
  const { data: session, isPending } = useSession();
  const { me } = useMe();
  const loggedIn = !!session?.user;
  const myId = session?.user?.id ?? null;
  const isAdmin = me?.role === "admin";

  const [open, setOpen] = useState<boolean>(() => readInitialOpen());
  const [inRound, setInRound] = useState(false);
  const [tab, setTab] = useState<"general" | "friends">("general");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [announcement, setAnnouncement] = useState<string>("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // DM state
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<DmMessage[]>([]);
  const [dmOther, setDmOther] = useState<ThreadRow | null>(null);
  const [theirLastReadAt, setTheirLastReadAt] = useState<string | null>(null);
  const [typingByThread, setTypingByThread] = useState<Record<string, number>>({});
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const [hostedMatchId, setHostedMatchId] = useState<string | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_OPEN, open ? "1" : "0");
    }
  }, [open]);

  // body class for shift.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const cls = "chat-open";
    if (open && !inRound) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [open, inRound]);

  // in-round watcher.
  useEffect(() => {
    const sync = () => setInRound(document.body.classList.contains("in-round"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // General chat history.
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

  // Announcement.
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

  // Reload thread list (used after sending or receiving DMs to refresh ordering).
  const loadThreads = async () => {
    try {
      const r = await fetch("/api/dm/threads", { cache: "no-store" });
      if (r.ok) {
        const j = (await r.json()) as { threads: ThreadRow[] };
        setThreads(j.threads);
      }
    } catch { /* ignore */ }
  };
  useEffect(() => {
    if (tab !== "friends" || !loggedIn) return;
    let cancelled = false;
    fetch("/api/dm/threads", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setThreads(j.threads); })
      .catch(() => {});
    fetch("/api/friends", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setFriends(j.friends); })
      .catch(() => {});
    fetch("/api/match/mine", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setHostedMatchId(j.matchId ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tab, loggedIn]);

  // Load DM thread messages when opened.
  useEffect(() => {
    if (!activeThread) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/dm/${activeThread}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as {
          other: ThreadRow["lastMessage"] extends never ? never : {
            id: string; handle: string | null; name: string | null; image: string | null; lastSeenAt: string | null;
          };
          theirLastReadAt: string | null;
          messages: DmMessage[];
        };
        if (cancelled) return;
        setDmMessages(j.messages);
        setTheirLastReadAt(j.theirLastReadAt);
        const t = threads.find((x) => x.threadId === activeThread);
        if (t) {
          setDmOther(t);
          // optimistic unread clear
          setThreads((prev) => prev.map((x) => x.threadId === activeThread ? { ...x, unread: 0, myLastReadAt: new Date().toISOString() } : x));
        } else {
          setDmOther({
            threadId: activeThread,
            otherUserId: j.other.id,
            handle: j.other.handle,
            name: j.other.name,
            image: j.other.image,
            lastSeenAt: j.other.lastSeenAt,
            lastMessageAt: new Date().toISOString(),
            lastMessage: null,
            myLastReadAt: new Date().toISOString(),
            unread: 0,
          });
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [activeThread, threads]);

  // Realtime subscriber.
  useEffect(() => {
    return rt.subscribe((payload: unknown) => {
      const p = payload as Partial<Msg> & { kind?: string; type?: string };
      if (p.kind === "message" && p.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === p.id)) return prev;
          return [...prev, p as Msg].slice(-200);
        });
        return;
      }
      if (p.type === "message-deleted" && p.id) {
        setMessages((prev) => prev.filter((m) => m.id !== p.id));
        return;
      }
      if (p.type === "chat-cleared") {
        setMessages([]);
        return;
      }
      // DM events.
      if (p.type === "dm-received") {
        const ev = payload as {
          threadId: string; messageId: string; senderId: string;
          senderHandle: string | null; senderName: string | null;
          body: string; meta?: Record<string, unknown> | null; createdAt: string;
        };
        if (activeThread === ev.threadId) {
          setDmMessages((prev) => {
            if (prev.some((m) => m.id === ev.messageId)) return prev;
            return [...prev, {
              id: ev.messageId,
              senderId: ev.senderId,
              fromMe: false,
              body: ev.body,
              meta: ev.meta ?? null,
              createdAt: ev.createdAt,
            }];
          });
          // Auto-mark-read since the thread is open.
          void fetch(`/api/dm/${ev.threadId}`, { cache: "no-store" }).catch(() => {});
        } else {
          // Bump unread count on the thread row (create stub if needed).
          setThreads((prev) => {
            const idx = prev.findIndex((t) => t.threadId === ev.threadId);
            if (idx === -1) {
              // Trigger a refresh to pick up the new thread shape.
              void loadThreads();
              return prev;
            }
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              unread: updated[idx].unread + 1,
              lastMessage: { body: ev.body, fromMe: false, createdAt: ev.createdAt, hasMeta: !!ev.meta },
              lastMessageAt: ev.createdAt,
            };
            updated.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
            return updated;
          });
        }
        return;
      }
      if (p.type === "dm-typing") {
        const ev = payload as { threadId: string; senderId: string };
        setTypingByThread((prev) => ({ ...prev, [ev.threadId]: Date.now() + TYPING_TTL_MS }));
        return;
      }
      if (p.type === "dm-read") {
        const ev = payload as { threadId: string; readerId: string; readAt: string };
        if (activeThread === ev.threadId && ev.readerId !== myId) {
          setTheirLastReadAt(ev.readAt);
        }
        return;
      }
    });
  }, [rt, activeThread, myId]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, dmMessages.length, open, tab, activeThread]);

  // Typing TTL cleanup tick.
  useEffect(() => {
    const i = setInterval(() => {
      setNowTick(Date.now());
      setTypingByThread((prev) => {
        const now = Date.now();
        let changed = false;
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v > now) next[k] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);

  // Input change → typing ping (DM only).
  const onInputChange = (v: string) => {
    setInput(v);
    if (tab === "friends" && activeThread) {
      const now = Date.now();
      if (now - lastTypingSentRef.current > TYPING_THROTTLE_MS) {
        lastTypingSentRef.current = now;
        void fetch(`/api/dm/${activeThread}/typing`, { method: "POST" }).catch(() => {});
      }
    }
  };

  const sendGeneral = async (text: string) => {
    const res = await fetch("/api/chat/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "failed" }));
      if (j.error === "muted" && j.until) setErr(`muted until ${new Date(j.until).toLocaleString()}`);
      else if (j.error === "slow down" && typeof j.retryInMs === "number") setErr(`slow mode: ${Math.ceil(j.retryInMs / 1000)}s left`);
      else setErr(j.error ?? "failed");
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
  };

  const sendDm = async (text: string) => {
    if (!activeThread) return;
    let body = text;
    let meta: Record<string, unknown> | null = null;
    if (text.trim().toLowerCase() === "/invite") {
      if (!hostedMatchId) { setErr("you're not hosting a match"); return; }
      meta = { matchId: hostedMatchId };
      body = "▶ match invite";
    }
    const res = await fetch(`/api/dm/${activeThread}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, meta }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "failed" }));
      if (j.error === "slow down" && typeof j.retryInMs === "number") setErr(`slow mode: ${Math.ceil(j.retryInMs / 1000)}s left`);
      else setErr(j.error ?? "failed");
      return;
    }
    try {
      const data = (await res.json()) as { message?: DmMessage };
      if (data.message) {
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === data.message!.id)) return prev;
          return [...prev, data.message!];
        });
      }
    } catch { /* ignore */ }
    setInput("");
    // Refresh thread list ordering.
    void loadThreads();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true); setErr(null);
    try {
      if (tab === "general") await sendGeneral(text);
      else if (activeThread) await sendDm(text);
    } catch { setErr("failed"); } finally { setBusy(false); }
  };

  const selectThread = (id: string | null) => {
    setActiveThread(id);
    if (id === null) {
      setDmMessages([]);
      setDmOther(null);
      setTheirLastReadAt(null);
    }
  };

  const openThreadWithFriend = async (friend: FriendRow) => {
    if (!friend.handle) return;
    try {
      const r = await fetch("/api/dm/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: friend.handle }),
      });
      if (!r.ok) return;
      const j = (await r.json()) as { threadId: string };
      // Make sure a thread row exists in state.
      setThreads((prev) => {
        if (prev.some((t) => t.threadId === j.threadId)) return prev;
        return [
          {
            threadId: j.threadId,
            otherUserId: friend.userId,
            handle: friend.handle,
            name: friend.name,
            image: friend.image,
            lastSeenAt: friend.lastSeenAt,
            lastMessageAt: new Date().toISOString(),
            lastMessage: null,
            myLastReadAt: null,
            unread: 0,
          },
          ...prev,
        ];
      });
      setActiveThread(j.threadId);
    } catch { /* ignore */ }
  };

  // Once the friends tab has loaded threads, that's the live source of truth;
  // before then, fall back to the count from the shared /api/me/role poll.
  const totalUnread = useMemo(
    () => (threads.length > 0
      ? threads.reduce((a, t) => a + t.unread, 0)
      : me?.unreadDmCount ?? 0),
    [threads, me?.unreadDmCount],
  );

  // Friends-without-a-thread for START NEW section.
  const friendsWithoutThread = useMemo(() => {
    const have = new Set(threads.map((t) => t.otherUserId));
    return friends.filter((f) => !have.has(f.userId));
  }, [friends, threads]);

  if (isPending) return null;
  if (inRound) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="site-chrome fixed bottom-4 left-4 z-50 btn-press px-3 py-2 font-pixel text-[10px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
        title="Show chat"
      >
        ▶ CHAT
        {totalUnread > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 font-pixel text-[9px] bg-fuchsia-500 text-zinc-950 border-2 border-zinc-950 grid place-items-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>
    );
  }

  const placeholder = tab === "general"
    ? "Type a message..."
    : activeThread
      ? "Message... (/invite to share match)"
      : "Pick a friend";

  const inputDisabled = busy || (tab === "friends" && !activeThread);

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className="site-chrome fixed inset-0 z-30 bg-zinc-950/70 backdrop-blur-sm lg:hidden"
        aria-hidden="true"
      />
      <aside className="site-chrome fixed left-0 top-0 bottom-0 z-40 w-full sm:w-80 lg:w-72 border-r-2 border-zinc-800 bg-zinc-950 flex flex-col">
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

        {/* Tab switcher */}
        <div className="grid grid-cols-2 border-b-2 border-zinc-800">
          <button
            onClick={() => { setTab("general"); selectThread(null); }}
            className={`font-pixel text-[10px] py-2 tracking-widest transition ${
              tab === "general"
                ? "bg-indigo-500/10 text-indigo-300 border-b-2 border-indigo-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            GENERAL
          </button>
          <button
            onClick={() => setTab("friends")}
            className={`font-pixel text-[10px] py-2 tracking-widest transition relative ${
              tab === "friends"
                ? "bg-indigo-500/10 text-indigo-300 border-b-2 border-indigo-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            FRIENDS
            {totalUnread > 0 && (
              <span className="absolute top-1 right-3 min-w-[16px] h-[16px] px-1 font-pixel text-[9px] bg-fuchsia-500 text-zinc-950 grid place-items-center">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </button>
        </div>

        {announcement && tab === "general" && (
          <div className="mx-3 mt-3 px-3 py-2 border-2 border-indigo-500 bg-indigo-500/10 text-indigo-200 text-xs font-mono whitespace-pre-wrap break-words">
            📢 {announcement}
          </div>
        )}

        {/* Body */}
        {tab === "general" ? (
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
        ) : activeThread && dmOther ? (
          <>
            <button
              onClick={() => selectThread(null)}
              className="px-3 py-2 border-b-2 border-zinc-800 flex items-center gap-2 hover:bg-zinc-900 text-left"
              title="Back to friends"
            >
              <span className="text-zinc-500 text-sm">←</span>
              <Avatar src={dmOther.image} name={dmOther.handle ?? "anon"} size={24} />
              <span className="text-sm font-semibold text-zinc-100 truncate flex-1">
                {dmOther.handle ?? dmOther.name ?? "anon"}
              </span>
              <span
                className={`w-2 h-2 ${isOnline(dmOther.lastSeenAt) ? "bg-emerald-400" : "bg-zinc-600"}`}
                title={isOnline(dmOther.lastSeenAt) ? "online" : "offline"}
              />
            </button>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {dmMessages.length === 0 && (
                <div className="text-zinc-600 text-xs font-mono text-center pt-6">
                  say hi…
                </div>
              )}
              {dmMessages.map((m, i) => {
                const isLastOwn = m.fromMe && i === dmMessages.length - 1;
                const seen = isLastOwn && theirLastReadAt && new Date(m.createdAt) <= new Date(theirLastReadAt);
                return (
                  <DmBubble key={m.id} msg={m} other={dmOther} seen={!!seen} />
                );
              })}
              {typingByThread[activeThread] && typingByThread[activeThread] > nowTick && (
                <div className="text-[11px] text-zinc-500 font-mono italic">
                  {dmOther.handle ?? "friend"} is typing…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {threads.length === 0 && friendsWithoutThread.length === 0 && (
              <div className="text-zinc-600 text-xs font-mono text-center pt-6">
                no friends yet — add some on /friends.
              </div>
            )}
            {threads.length > 0 && (
              <h3 className="font-pixel text-[9px] tracking-widest text-zinc-500 px-1 pb-1">CONVERSATIONS</h3>
            )}
            {threads.map((t) => {
              const isTyping = typingByThread[t.threadId] && typingByThread[t.threadId] > nowTick;
              return (
                <button
                  key={t.threadId}
                  onClick={() => selectThread(t.threadId)}
                  className="w-full flex items-center gap-2 px-2 py-2 border-2 border-zinc-900 hover:border-zinc-700 bg-zinc-900/40 text-left"
                >
                  <div className="relative flex-shrink-0">
                    <Avatar src={t.image} name={t.handle ?? "anon"} size={28} />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-zinc-950 ${
                        isOnline(t.lastSeenAt) ? "bg-emerald-400" : "bg-zinc-600"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-zinc-100 truncate">
                      {t.handle ?? t.name ?? "anon"}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono truncate">
                      {isTyping ? (
                        <span className="text-indigo-300 italic">typing…</span>
                      ) : t.lastMessage ? (
                        <>
                          {t.lastMessage.fromMe ? "you: " : ""}
                          {t.lastMessage.hasMeta ? "▶ match invite" : t.lastMessage.body}
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                  {t.unread > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 font-pixel text-[9px] bg-fuchsia-500 text-zinc-950 grid place-items-center">
                      {t.unread > 9 ? "9+" : t.unread}
                    </span>
                  )}
                </button>
              );
            })}
            {friendsWithoutThread.length > 0 && (
              <>
                <h3 className="font-pixel text-[9px] tracking-widest text-zinc-500 px-1 pt-3 pb-1">START NEW</h3>
                {friendsWithoutThread.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => openThreadWithFriend(f)}
                    className="w-full flex items-center gap-2 px-2 py-2 border-2 border-zinc-900 hover:border-indigo-500 bg-zinc-900/20 text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar src={f.image} name={f.handle ?? "anon"} size={28} />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-zinc-950 ${
                          isOnline(f.lastSeenAt) ? "bg-emerald-400" : "bg-zinc-600"
                        }`}
                      />
                    </div>
                    <div className="text-sm text-zinc-300 truncate flex-1">
                      {f.handle ?? f.name ?? "anon"}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}

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
                  onChange={(e) => onInputChange(e.target.value)}
                  maxLength={tab === "general" ? 280 : 500}
                  disabled={inputDisabled}
                  placeholder={placeholder}
                  className="flex-1 px-3 py-2 bg-zinc-950 border-2 border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || inputDisabled}
                  className={`btn-press px-3 font-pixel text-[10px] border-2 border-zinc-950 ${
                    inputDisabled || !input.trim() ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500 text-zinc-950"
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

function DmBubble({ msg, other, seen }: { msg: DmMessage; other: ThreadRow; seen: boolean }) {
  const time = fmtTime(msg.createdAt);
  const matchMeta = isMatchMeta(msg.meta) ? msg.meta : null;
  const align = msg.fromMe ? "items-end" : "items-start";
  const bubbleColor = msg.fromMe
    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-100"
    : "bg-zinc-900 border-zinc-800 text-zinc-100";
  return (
    <div className={`flex flex-col gap-0.5 ${align}`}>
      <div className="flex items-end gap-2 max-w-[85%]">
        {!msg.fromMe && (
          <Avatar src={other.image} name={other.handle ?? "anon"} size={24} />
        )}
        <div className={`px-3 py-1.5 border-2 ${bubbleColor} text-sm leading-snug break-words`}>
          {matchMeta ? (
            <Link
              href={`/match/${matchMeta.matchId}`}
              className="inline-block px-2 py-1 border-2 border-indigo-500 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 font-pixel text-[10px] tracking-wider transition"
            >
              ▶ JOIN {matchMeta.mode.toUpperCase()} · {LANG_LABEL[matchMeta.language] ?? matchMeta.language} · {matchMeta.difficulty.toUpperCase()}
            </Link>
          ) : (
            msg.body
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[9px] text-zinc-600 font-mono">{time}</span>
        {msg.fromMe && seen && (
          <span className="text-[9px] text-indigo-400 font-mono">seen</span>
        )}
      </div>
    </div>
  );
}
