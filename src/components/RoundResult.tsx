"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGame, problemView, type Problem } from "@/lib/store";
import { useSession } from "@/lib/auth-client";

const COUNT_MS = 600;

/** Eases the score number up from 0 over a few hundred ms. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(0);
    if (target <= 0) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

export default function RoundResult() {
  const {
    score, solves, timeLeft, config, hintsRevealed,
    failedOn, current, endReason,
    personalBest, isNewBest,
    reset, toLobby,
  } = useGame();
  const { data: session } = useSession();

  const displayedScore = useCountUp(score);

  const mode = config?.mode ?? "fix";
  const solveWord = mode === "trace" ? "snippet" : "bug";
  const isTimed = config?.roundSeconds != null;
  const elapsed = isTimed ? Math.max(0, (config?.roundSeconds ?? 0) - timeLeft) : null;

  const headline =
    isNewBest && session?.user ? "★ NEW HIGH SCORE"
    : endReason === "hardcore-fail" ? "ELIMINATED"
    : endReason === "cap" ? "ROUND COMPLETE"
    : endReason === "manual" ? "ROUND ENDED"
    : "TIME'S UP";

  const headlineColor =
    isNewBest && session?.user ? "text-amber-400"
    : endReason === "hardcore-fail" ? "text-fuchsia-400"
    : "text-zinc-400";

  const borderCls =
    isNewBest && session?.user ? "border-amber-400"
    : endReason === "hardcore-fail" ? "border-fuchsia-500"
    : "border-zinc-800";

  const showProblem = failedOn ?? current;

  const replay = () => { if (config) useGame.getState().start(config); };

  return (
    <div className="min-h-screen grid place-items-center text-zinc-100 py-8 px-4">
      <div className={`relative w-full max-w-2xl border-2 ${borderCls} bg-zinc-900 py-10 px-6 sm:px-10 overflow-hidden`}>
        {isNewBest && session?.user && (
          <div
            aria-hidden
            className="absolute -top-16 -right-16 w-64 h-64 bg-amber-400/15 blur-3xl pointer-events-none"
          />
        )}

        <div className="relative text-center">
          <div className={`font-pixel text-sm sm:text-base ${headlineColor}`}>
            {headline}
          </div>

          <div className="font-mono text-6xl sm:text-8xl font-bold mt-4 tabular-nums leading-none">
            {displayedScore}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <Chip>
              SOLVES{" "}
              <span className="text-zinc-100 tabular-nums">{solves}</span>{" "}
              <span className="text-zinc-500">
                {solves === 1 ? solveWord : `${solveWord}s`}
              </span>
            </Chip>
            {hintsRevealed > 0 && (
              <Chip>
                HINTS{" "}
                <span className="text-zinc-100 tabular-nums">{hintsRevealed}</span>
              </Chip>
            )}
            {isTimed ? (
              <Chip>
                TIME{" "}
                <span className="text-zinc-100 tabular-nums">{elapsed}s</span>
              </Chip>
            ) : (
              <Chip>PRACTICE</Chip>
            )}
            {isNewBest && session?.user ? (
              <Chip tone="amber">▲ NEW BEST</Chip>
            ) : personalBest != null && session?.user ? (
              <Chip>
                BEST{" "}
                <span className="text-zinc-100 tabular-nums">{personalBest}</span>
              </Chip>
            ) : null}
          </div>

          {!session?.user && (
            <p className="text-sm text-zinc-400 mt-5">
              <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">
                Sign up
              </Link>{" "}
              to save runs and hit the leaderboard.
            </p>
          )}
        </div>

        {showProblem && <Recap problem={showProblem} />}

        <div className="relative mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={replay}
            className="btn-press w-full sm:w-auto px-8 py-3 font-pixel text-xs bg-indigo-500 text-zinc-950 border-2 border-zinc-950"
          >
            ▶ PLAY AGAIN
          </button>
          <button
            onClick={toLobby}
            className="font-pixel text-[10px] text-zinc-400 hover:text-indigo-400 transition px-3 py-2"
          >
            ← LOBBY
          </button>
          <Link
            href="/home"
            onClick={reset}
            className="font-pixel text-[10px] text-zinc-400 hover:text-indigo-400 transition px-3 py-2"
          >
            HOME
          </Link>
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "amber";
}) {
  const cls = tone === "amber"
    ? "border-amber-400 bg-amber-400/10 text-amber-300"
    : "border-zinc-800 bg-zinc-950 text-zinc-400";
  return (
    <span className={`font-pixel text-[9px] tracking-widest px-2.5 py-1 border-2 ${cls}`}>
      {children}
    </span>
  );
}

function Recap({ problem }: { problem: Problem }) {
  const view = problemView(problem);
  const isFix = problem.kind === "fix";
  return (
    <div className="relative mt-8 text-left">
      <div className="font-pixel text-[10px] tracking-widest text-zinc-500 mb-2">
        {isFix ? "THE BUG" : "THE OUTPUT"} ·{" "}
        <span className="text-zinc-400">{view.title}</span>
      </div>
      {view.hint && (
        <p className="text-xs text-zinc-500 mb-3 font-mono">{view.hint}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="font-pixel text-[9px] tracking-widest text-fuchsia-400 mb-1">
            {isFix ? "BROKEN" : "CODE"}
          </div>
          <pre className="border-2 border-fuchsia-500/40 bg-zinc-950 p-3 text-[11px] sm:text-[12px] leading-snug font-mono text-zinc-200 overflow-x-auto whitespace-pre">
{problem.kind === "fix" ? problem.challenge.broken : problem.trace.code}
          </pre>
        </div>
        <div>
          <div className="font-pixel text-[9px] tracking-widest text-emerald-400 mb-1">
            {isFix ? "FIX" : "EXPECTED"}
          </div>
          <pre className="border-2 border-emerald-500/40 bg-zinc-950 p-3 text-[11px] sm:text-[12px] leading-snug font-mono text-zinc-200 overflow-x-auto whitespace-pre">
{problem.kind === "fix" ? problem.challenge.solution : problem.trace.expectedOutput}
          </pre>
        </div>
      </div>
    </div>
  );
}
