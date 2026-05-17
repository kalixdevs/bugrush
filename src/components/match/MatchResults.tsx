"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import type { MatchView, MatchParticipantView } from "./types";

type Props = { match: MatchView; viewerId: string | null };

export default function MatchResults({ match, viewerId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const me = viewerId ? match.participants.find((p) => p.userId === viewerId) : null;

  const isCancelled = match.status === "cancelled";
  const isDraw = match.winnerTeam == null && !isCancelled;
  const isMyWin = me != null && match.winnerTeam != null && me.team === match.winnerTeam;

  const headline = isCancelled ? "CANCELLED"
    : isDraw ? "DRAW"
    : !me ? `TEAM ${(match.winnerTeam ?? 0) + 1} WINS`
    : isMyWin ? "VICTORY" : "DEFEAT";

  const headColor = isCancelled ? "text-zinc-400"
    : isDraw ? "text-zinc-300"
    : isMyWin || !me ? "text-indigo-400"
    : "text-fuchsia-400";

  const team0 = match.participants.filter((p) => p.team === 0);
  const team1 = match.participants.filter((p) => p.team === 1);

  const rematch = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: match.mode,
          privacy: match.privacy,
          difficulty: match.difficulty,
          language: match.language,
          roundSeconds: match.roundSeconds,
        }),
      });
      if (res.ok) {
        const data = await res.json() as { id: string };
        router.push(`/match/${data.id}`);
      }
    } finally { setBusy(false); }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-12 text-center space-y-8">
      <div>
        <div className="font-mono text-xs text-indigo-400 mb-2">{`> ${match.id.slice(0, 12)}`}</div>
        <h1 className={`font-pixel text-4xl sm:text-5xl ${headColor}`}>{headline}</h1>
        <div className="text-zinc-500 text-sm mt-3">
          {match.mode.toUpperCase()} · {match.language.toUpperCase()} · {match.difficulty.toUpperCase()}
        </div>
      </div>

      {!isCancelled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TeamScore label="TEAM 1" tone="indigo" players={team0} winner={match.winnerTeam === 0} />
          <TeamScore label="TEAM 2" tone="fuchsia" players={team1} winner={match.winnerTeam === 1} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/home"
          className="px-4 py-2 font-pixel text-[10px] border-2 border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 transition"
        >
          ← HOME
        </Link>
        <Link
          href="/matchmaking"
          className="px-4 py-2 font-pixel text-[10px] border-2 border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 transition"
        >
          MATCHMAKING
        </Link>
        {me && (
          <button
            onClick={rematch}
            disabled={busy}
            className="btn-press px-5 py-2 font-pixel text-[10px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
          >
            {busy ? "···" : "▶ REMATCH"}
          </button>
        )}
      </div>
    </main>
  );
}

function TeamScore({
  label, tone, players, winner,
}: {
  label: string;
  tone: "indigo" | "fuchsia";
  players: MatchParticipantView[];
  winner: boolean;
}) {
  const borderClass = winner ? (tone === "indigo" ? "border-indigo-500" : "border-fuchsia-500") : "border-zinc-800";
  const total = players.reduce((n, p) => n + p.score, 0);
  return (
    <div className={`border-2 ${borderClass} bg-zinc-900 p-5`}>
      <div className="flex items-baseline justify-between mb-3">
        <span className={`font-pixel text-xs ${tone === "indigo" ? "text-indigo-400" : "text-fuchsia-400"}`}>
          {label} {winner && "★"}
        </span>
        <span className="font-mono text-2xl tabular-nums">{total}</span>
      </div>
      <div className="space-y-2">
        {players.map((p) => (
          <div key={p.userId} className="flex items-center gap-3 border-2 border-zinc-800 bg-zinc-950 px-3 py-2">
            <Avatar src={p.image} name={p.name} size={28} />
            <span className="flex-1 font-medium truncate">{p.name}</span>
            <span className="font-mono tabular-nums text-zinc-300 text-sm">
              {p.score > 0 ? p.score : "—"}
            </span>
            <span className="font-mono text-xs text-zinc-500 w-14 text-right">
              {p.solveTimeMs != null && p.score > 0 ? `${(p.solveTimeMs / 1000).toFixed(1)}s` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
