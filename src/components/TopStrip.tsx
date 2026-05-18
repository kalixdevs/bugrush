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
          <div className="flex items-center">
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
