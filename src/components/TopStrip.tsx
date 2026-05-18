"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AuthNav from "./AuthNav";
import PointsBadge from "./PointsBadge";

type MeState = {
  loggedIn: boolean;
  role: string | null;
  points: number;
  frameSrc: string | null;
  incomingFriendCount?: number;
};

const HIDDEN_PREFIXES = [
  "/admin", // has its own header
  "/play",  // game chrome owns the top bar
  "/match", // match view is its own thing
  "/daily/play",
];

function shouldHide(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function TopStrip() {
  const pathname = usePathname();
  const [me, setMe] = useState<MeState | null>(null);
  const [inRound, setInRound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/role", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setMe(j); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);

  useEffect(() => {
    const sync = () => setInRound(document.body.classList.contains("in-round"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  if (shouldHide(pathname) || inRound) return null;

  return (
    <nav className="border-b-2 border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/home" className="font-pixel text-indigo-400 text-xs tracking-widest">
          BUGRUSH
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 text-xs">
          {me?.loggedIn && <PointsBadge value={me.points} />}
          <div className="flex items-center gap-2">
            {me?.loggedIn && (
              <Link
                href="/friends"
                title="Friends"
                className="relative flex items-center opacity-80 hover:opacity-100 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/friends.svg" alt="Friends" className="h-8 sm:h-10 w-auto -mx-1" />
                {!!me.incomingFriendCount && me.incomingFriendCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 font-pixel text-[9px] bg-fuchsia-500 text-zinc-950 border-2 border-zinc-950 grid place-items-center">
                    {me.incomingFriendCount > 9 ? "9+" : me.incomingFriendCount}
                  </span>
                )}
              </Link>
            )}
            <Link href="/leaderboard" title="Leaderboard" className="opacity-80 hover:opacity-100 transition flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/trophy.svg" alt="Leaderboard" className="h-8 sm:h-10 w-auto -mx-1" />
            </Link>
            <Link href="/daily" title="Daily challenge" className="opacity-80 hover:opacity-100 transition flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/dailychallange.svg" alt="Daily" className="h-8 sm:h-10 w-auto -mx-1" />
            </Link>
          </div>
          <AuthNav />
        </div>
      </div>
    </nav>
  );
}
