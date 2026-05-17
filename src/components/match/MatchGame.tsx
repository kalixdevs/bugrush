"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import CodeEditor from "@/components/CodeEditor";
import HintReveal from "@/components/HintReveal";
import { challenges } from "@/lib/challenges";
import { sfx } from "@/lib/sfx";
import type { MatchView } from "./types";

type Props = { match: MatchView; viewerId: string | null };

export default function MatchGame({ match, viewerId }: Props) {
  const router = useRouter();
  const challenge = challenges.find((c) => c.id === match.challengeId);
  const me = viewerId ? match.participants.find((p) => p.userId === viewerId) : null;
  const opponents = match.participants.filter((p) => p.userId !== viewerId);

  const [draft, setDraft] = useState(challenge?.broken ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const startedAtMs = match.startedAt ? new Date(match.startedAt).getTime() : 0;
  const endsAtMs = startedAtMs + match.roundSeconds * 1000;
  const [now, setNow] = useState(0);
  const startSoundedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    if (!startSoundedRef.current) {
      startSoundedRef.current = true;
      sfx.start();
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("in-round");
    return () => { document.body.classList.remove("in-round"); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.ceil((endsAtMs - now) / 1000));
  const isSpectator = !me;
  const alreadySubmitted = me?.submitted ?? false;

  const onSubmit = async () => {
    if (submitting || alreadySubmitted || isSpectator) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/match/${match.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submittedCode: draft, hintsRevealed }),
      });
      if (res.ok) {
        const data = await res.json() as { success?: boolean };
        if (data.success) { sfx.solve(); } else { sfx.fail(); }
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  if (!challenge) {
    return <div className="p-10 text-center text-zinc-400">Challenge not available.</div>;
  }

  const timeColor = remaining <= 5 ? "text-fuchsia-400" : remaining <= 15 ? "text-amber-400" : "text-indigo-400";

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <header className="border-b-2 border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="font-pixel text-xs text-indigo-400">{match.mode.toUpperCase()}</div>
          <div className="flex items-center gap-2">
            {opponents.map((o) => (
              <div key={o.userId} className="flex items-center gap-1">
                <Avatar src={o.image} name={o.name} size={24} />
                {o.submitted && (
                  <span className="font-pixel text-[9px] text-indigo-400">{o.score > 0 ? "SOLVED" : "FAIL"}</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className={`font-pixel text-2xl tabular-nums ${timeColor}`}>
          0:{String(remaining).padStart(2, "0")}
        </div>
      </header>

      <section className="px-6 py-3 border-b-2 border-zinc-800 bg-zinc-950">
        <div className="text-lg font-medium">{challenge.title}</div>
        <HintReveal text={challenge.hint} resetKey={challenge.id} onReveal={() => setHintsRevealed((n) => n + 1)} />
      </section>

      <main className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <CodeEditor value={draft} language={challenge.language} onChange={setDraft} />
        </div>
      </main>

      <footer className="border-t-2 border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center justify-between">
        <div className="font-pixel text-[10px] text-zinc-500">
          {alreadySubmitted ? "WAITING FOR OPPONENTS…" : isSpectator ? "SPECTATING" : "ONE SUBMIT"}
        </div>
        <button
          onClick={onSubmit}
          disabled={submitting || alreadySubmitted || isSpectator}
          className={`btn-press px-4 py-2 font-pixel text-[10px] border-2 border-zinc-950 ${
            submitting || alreadySubmitted || isSpectator
              ? "bg-zinc-800 text-zinc-500"
              : "bg-indigo-500 text-zinc-950"
          }`}
        >
          {submitting ? "···" : alreadySubmitted ? "SUBMITTED ✓" : "▶ SUBMIT"}
        </button>
      </footer>
    </div>
  );
}
