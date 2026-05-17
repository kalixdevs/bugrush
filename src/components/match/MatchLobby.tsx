"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { maxPlayers, teamSize, type MatchMode } from "@/lib/match";
import type { MatchView, MatchParticipantView } from "./types";

type Props = { match: MatchView; viewerId: string | null };

export default function MatchLobby({ match, viewerId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isCancelled = match.status === "cancelled";
  const me = viewerId ? match.participants.find((p) => p.userId === viewerId) ?? null : null;
  const isHost = viewerId === match.hostId;
  const cap = maxPlayers(match.mode as MatchMode);
  const tSize = teamSize(match.mode as MatchMode);
  const allReady = match.participants.length === cap && match.participants.every((p) => p.ready);

  const call = async (path: string) => {
    setBusy(true);
    try { await fetch(path, { method: "POST" }); router.refresh(); }
    finally { setBusy(false); }
  };

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/match/${match.id}` : "";
  const copyInvite = async () => {
    if (!inviteUrl) return;
    try { await navigator.clipboard.writeText(inviteUrl); } catch {}
  };

  const team0 = match.participants.filter((p) => p.team === 0);
  const team1 = match.participants.filter((p) => p.team === 1);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="text-center">
        <div className="font-mono text-xs text-indigo-400 mb-2">{`> ${match.id.slice(0, 12)}`}</div>
        <h1 className="font-pixel text-3xl">{match.mode.toUpperCase()} · {match.language.toUpperCase()} · {match.difficulty.toUpperCase()}</h1>
        <div className="font-pixel text-[11px] text-zinc-500 mt-2">
          {isCancelled ? "MATCH CANCELLED" : "WAITING ROOM"} · {match.roundSeconds}s
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TeamPanel label="TEAM 1" tone="indigo" players={team0} slots={tSize} />
        <TeamPanel label="TEAM 2" tone="fuchsia" players={team1} slots={tSize} />
      </div>

      {!isCancelled && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {me ? (
            <>
              <button
                onClick={() => call(`/api/match/${match.id}/ready`)}
                disabled={busy}
                className={`px-4 py-2 font-pixel text-[11px] border-2 transition ${
                  me.ready
                    ? "border-indigo-500 bg-indigo-500 text-zinc-950"
                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
                }`}
              >
                {me.ready ? "READY ✓" : "▶ READY UP"}
              </button>
              {isHost && (
                <button
                  onClick={() => call(`/api/match/${match.id}/start`)}
                  disabled={!allReady || busy}
                  className={`btn-press px-5 py-2 font-pixel text-[11px] border-2 border-zinc-950 ${
                    allReady ? "bg-indigo-500 text-zinc-950" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  ▶ START MATCH
                </button>
              )}
              <button
                onClick={() => call(`/api/match/${match.id}/leave`)}
                disabled={busy}
                className="px-4 py-2 font-pixel text-[11px] border-2 border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-fuchsia-500 transition"
              >
                LEAVE
              </button>
            </>
          ) : (
            <button
              onClick={() => call(`/api/match/${match.id}/join`)}
              disabled={busy || match.participants.length >= cap}
              className={`btn-press px-5 py-2 font-pixel text-[11px] border-2 border-zinc-950 ${
                match.participants.length >= cap ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500 text-zinc-950"
              }`}
            >
              ▶ JOIN BATTLE
            </button>
          )}
        </div>
      )}

      {!isCancelled && (
        <div className="text-center">
          <button
            onClick={copyInvite}
            className="font-pixel text-[10px] text-zinc-400 hover:text-indigo-400 transition border-2 border-zinc-800 px-3 py-2 bg-zinc-900"
          >
            📋 COPY INVITE LINK
          </button>
        </div>
      )}
    </main>
  );
}

function TeamPanel({
  label, tone, players, slots,
}: {
  label: string;
  tone: "indigo" | "fuchsia";
  players: MatchParticipantView[];
  slots: number;
}) {
  const borderClass = tone === "indigo" ? "border-indigo-500" : "border-fuchsia-500";
  return (
    <div className={`border-2 ${borderClass} bg-zinc-900 p-5`}>
      <div className={`font-pixel text-xs mb-4 ${tone === "indigo" ? "text-indigo-400" : "text-fuchsia-400"}`}>{label}</div>
      <div className="space-y-3">
        {Array.from({ length: slots }).map((_, i) => {
          const p = players[i];
          if (!p) {
            return (
              <div key={`s-${i}`} className="flex items-center gap-3 border-2 border-dashed border-zinc-700 px-3 py-2">
                <div className="w-8 h-8 border-2 border-dashed border-zinc-700" />
                <span className="font-pixel text-[10px] text-zinc-600">EMPTY SLOT</span>
              </div>
            );
          }
          return (
            <div key={p.userId} className="flex items-center gap-3 border-2 border-zinc-800 bg-zinc-950 px-3 py-2">
              <Avatar src={p.image} name={p.name} size={32} />
              <span className="font-medium flex-1 truncate">{p.name}</span>
              {p.ready && (
                <span className="font-pixel text-[9px] text-indigo-400">READY</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
