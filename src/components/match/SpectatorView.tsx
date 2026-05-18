"use client";

import { useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import { challenges } from "@/lib/challenges";
import type { MatchView } from "./types";

type Props = { match: MatchView };

export default function SpectatorView({ match }: Props) {
  const challenge = challenges.find((c) => c.id === match.challengeId);
  const startedAtMs = match.startedAt ? new Date(match.startedAt).getTime() : 0;
  const endsAtMs = startedAtMs + match.roundSeconds * 1000;
  const [now, setNow] = useState(() => (typeof window === "undefined" ? 0 : Date.now()));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.ceil((endsAtMs - now) / 1000));
  const timeColor = remaining <= 5 ? "text-fuchsia-400" : remaining <= 15 ? "text-amber-400" : "text-indigo-400";

  // Group by team for the panel layout.
  const teams = new Map<number, typeof match.participants>();
  for (const p of match.participants) {
    if (!teams.has(p.team)) teams.set(p.team, []);
    teams.get(p.team)!.push(p);
  }
  const teamEntries = Array.from(teams.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <header className="border-b-2 border-zinc-800 bg-zinc-950 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="font-pixel text-xs text-indigo-400">
          ● SPECTATING · {match.mode.toUpperCase()}
        </div>
        <div className={`font-pixel text-2xl tabular-nums ${timeColor}`}>
          0:{String(remaining).padStart(2, "0")}
        </div>
      </header>

      {challenge && (
        <section className="px-6 py-3 border-b-2 border-zinc-800 bg-zinc-950">
          <div className="text-lg font-medium text-zinc-100">{challenge.title}</div>
          <p className="text-sm text-zinc-500 mt-1">{challenge.hint}</p>
          <div className="flex flex-wrap gap-2 mt-3 text-[10px] font-pixel tracking-widest">
            <span className="px-2 py-1 border-2 border-zinc-700 text-zinc-300">
              {challenge.language.toUpperCase()}
            </span>
            <span className="px-2 py-1 border-2 border-zinc-700 text-zinc-300">
              {match.difficulty.toUpperCase()}
            </span>
          </div>
        </section>
      )}

      <main className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
        <div className={`grid gap-6 ${teamEntries.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} max-w-4xl mx-auto`}>
          {teamEntries.map(([team, players]) => (
            <div key={team} className="border-2 border-zinc-800 bg-zinc-900 p-4">
              <div className="font-pixel text-[10px] text-zinc-500 tracking-widest mb-3">
                TEAM {team + 1}
              </div>
              <div className="space-y-2">
                {players.map((p) => {
                  const submitted = p.submitted;
                  const won = submitted && p.score > 0;
                  return (
                    <div
                      key={p.userId}
                      className={`flex items-center gap-3 px-3 py-2 border-2 transition ${
                        submitted
                          ? won
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-fuchsia-500 bg-fuchsia-500/10"
                          : "border-zinc-800 bg-zinc-950"
                      }`}
                    >
                      <Avatar src={p.image} name={p.name} size={28} />
                      <span className="text-sm text-zinc-100 font-semibold truncate">{p.name}</span>
                      <span className="ml-auto font-mono text-xs">
                        {submitted ? (
                          won ? (
                            <span className="text-emerald-300">
                              {(p.solveTimeMs! / 1000).toFixed(1)}s · {p.score}
                            </span>
                          ) : (
                            <span className="text-fuchsia-300">FAIL</span>
                          )
                        ) : (
                          <span className="text-zinc-500">typing…</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] font-mono text-zinc-600 mt-6">
          you are watching · code is hidden until the match ends
        </p>
      </main>
    </div>
  );
}
