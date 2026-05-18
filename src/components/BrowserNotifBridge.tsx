"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRealtime } from "@/lib/realtimeClient";
import { fire } from "@/lib/browserNotif";

type Event =
  | { type: "achievement-unlocked"; badgeName: string }
  | { type: "friend-request-received"; fromHandle?: string | null; fromName?: string | null }
  | { type: "friend-request-accepted"; byHandle?: string | null; byName?: string | null }
  | {
      type: "match-invite-received";
      matchId: string;
      mode: string;
      language: string;
      difficulty: string;
      fromHandle?: string | null;
      fromName?: string | null;
    };

export default function BrowserNotifBridge() {
  const rt = useRealtime();
  const router = useRouter();

  useEffect(() => {
    return rt.subscribe((payload: unknown) => {
      const p = payload as Partial<Event> & { type?: string };
      if (!p?.type) return;
      switch (p.type) {
        case "achievement-unlocked":
          fire("Achievement unlocked", (p as { badgeName?: string }).badgeName ?? "Tap to view", "achievement");
          break;
        case "friend-request-received": {
          const ev = p as Extract<Event, { type: "friend-request-received" }>;
          const who = ev.fromHandle ?? ev.fromName ?? "someone";
          fire("New friend request", `${who} wants to be friends`, "friend-request");
          break;
        }
        case "friend-request-accepted": {
          const ev = p as Extract<Event, { type: "friend-request-accepted" }>;
          const who = ev.byHandle ?? ev.byName ?? "someone";
          fire("Friend request accepted", `${who} is now your friend`, "friend-accept");
          break;
        }
        case "match-invite-received": {
          const ev = p as Extract<Event, { type: "match-invite-received" }>;
          const who = ev.fromHandle ?? ev.fromName ?? "a friend";
          fire(
            "Match invite",
            `${who} is hosting a ${ev.mode.toUpperCase()} match`,
            `match-invite-${ev.matchId}`,
          );
          // Pre-fetch the match page so clicking is fast.
          try { router.prefetch(`/match/${ev.matchId}`); } catch { /* ignore */ }
          break;
        }
      }
    });
  }, [rt, router]);

  return null;
}
