"use client";

import { useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtimeClient";
import { findBadge, type BadgeTone } from "@/lib/badges";
import BadgeIcon from "./BadgeIcon";

type Toast = {
  id: number;
  badgeId: string;
  badgeName: string;
  letter: string;
  tone: BadgeTone;
};

export default function AchievementToast() {
  const rt = useRealtime();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return rt.subscribe((payload: unknown) => {
      const p = payload as {
        type?: string;
        badgeId?: string;
        badgeName?: string;
        letter?: string;
        tone?: BadgeTone;
      };
      if (p.type !== "achievement-unlocked") return;
      if (!p.badgeId || !p.badgeName) return;
      const id = Date.now() + Math.random();
      setToasts((prev) =>
        [
          ...prev,
          {
            id,
            badgeId: p.badgeId!,
            badgeName: p.badgeName!,
            letter: p.letter ?? "★",
            tone: (p.tone ?? "emerald") as BadgeTone,
          },
        ].slice(-3),
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    });
  }, [rt]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const badge = findBadge(t.badgeId);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="pointer-events-auto flex items-center gap-3 border-2 border-zinc-950 bg-zinc-900 pl-2 pr-4 py-2 min-w-[260px] text-left transition-opacity"
            style={{ animation: "toastFade 0.3s ease-out" }}
          >
            {badge && <BadgeIcon badge={badge} size={40} />}
            <div className="flex-1">
              <div className="font-pixel text-[9px] text-indigo-400">ACHIEVEMENT UNLOCKED</div>
              <div className="text-sm font-medium text-zinc-100">{t.badgeName}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
