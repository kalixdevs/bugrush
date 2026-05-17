"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGame } from "@/lib/store";
import { useSession } from "@/lib/auth-client";
import CodeEditor from "./CodeEditor";
import Lobby from "./Lobby";

export default function Game() {
  const {
    status, config, current, failedOn, draft, score, solves, timeLeft,
    lastResult, endReason, personalBest, isNewBest,
    setDraft, submit, skip, tick, endRound, toLobby, reset,
  } = useGame();
  const { data: session } = useSession();

  const [confirmEnd, setConfirmEnd] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const armEndRound = () => {
    if (confirmEnd) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirmEnd(false);
      endRound();
      return;
    }
    setConfirmEnd(true);
    confirmTimer.current = setTimeout(() => setConfirmEnd(false), 2000);
  };

  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    document.body.classList.add("in-round");
    return () => { document.body.classList.remove("in-round"); };
  }, [status]);

  const isTimed = config?.roundSeconds != null;

  useEffect(() => {
    if (status !== "playing" || !isTimed) return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [status, isTimed, tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submit]);

  if (status === "idle") {
    return <Lobby />;
  }

  if (status === "finished") {
    const showNewBest = isNewBest && session?.user;
    const headline =
      showNewBest ? "HIGH SCORE"
      : endReason === "hardcore-fail" ? "ELIMINATED"
      : endReason === "cap" ? "ROUND COMPLETE"
      : endReason === "manual" ? "ROUND ENDED"
      : "TIME'S UP";
    const headlineColor =
      showNewBest ? "text-amber-400"
      : endReason === "hardcore-fail" ? "text-fuchsia-500"
      : "text-zinc-400";
    return (
      <div className="min-h-screen grid place-items-center text-zinc-100">
        <div className="text-center px-6 max-w-md border-2 border-zinc-800 bg-zinc-900 py-10">
          <div className={`font-pixel text-base sm:text-lg mb-6 leading-relaxed ${headlineColor}`}>
            {headline}
          </div>
          <div className="font-mono text-6xl font-bold mb-3 tabular-nums">{score}</div>
          <div className="text-zinc-400 mb-2 text-sm">
            {solves} bug{solves === 1 ? "" : "s"} squashed
            {endReason === "cap" && config?.solveCap
              ? ` · cleared ${config.solveCap}`
              : ""}
          </div>
          {endReason === "hardcore-fail" && failedOn && (
            <div className="text-sm text-fuchsia-300 mb-2">
              Got you: <span className="font-mono">{failedOn.title}</span>
            </div>
          )}

          {session?.user ? (
            <div className="text-sm text-zinc-400 mt-3">
              {isNewBest ? (
                <span className="font-pixel text-[11px] text-amber-400">★ NEW PERSONAL BEST</span>
              ) : personalBest != null ? (
                <>Personal best: <span className="text-zinc-200 tabular-nums font-mono">{personalBest}</span></>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-zinc-400 mt-3">
              <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">
                Sign up
              </Link>{" "}
              to save runs and hit the leaderboard.
            </div>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/home"
              onClick={reset}
              className="px-4 py-2 font-pixel text-[10px] border-2 border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 transition"
            >
              ← HOME
            </Link>
            <button
              onClick={toLobby}
              className="px-4 py-2 font-pixel text-[10px] border-2 border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 transition"
            >
              SETTINGS
            </button>
            <button
              onClick={() => config && useGame.getState().start(config)}
              className="btn-press px-5 py-2 font-pixel text-[10px] bg-indigo-500 text-zinc-950 border-2 border-zinc-950"
            >
              ▶ PLAY AGAIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const timeColor =
    timeLeft <= 10 ? "text-red-400" : timeLeft <= 20 ? "text-amber-400" : "text-indigo-400";

  const isHardcore = config?.difficulty === "hardcore";
  const penaltyLabel = isTimed ? "Skip (−5s)" : "Skip";
  const badTimeLabel = isTimed ? "Not quite — −3s." : "Not quite.";

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b-2 border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-6">
          <div className="font-pixel text-xs text-indigo-400 tracking-widest">DEVRACE</div>
          <div className="font-pixel text-[10px] text-zinc-500">
            SOLVES{" "}
            <span className="text-zinc-200 font-mono tabular-nums">
              {solves}
              {config?.solveCap ? <span className="text-zinc-500">/{config.solveCap}</span> : null}
            </span>
          </div>
          <div className="font-pixel text-[10px] text-zinc-500">
            SCORE <span className="text-zinc-200 font-mono tabular-nums">{score}</span>
          </div>
          {isHardcore && (
            <span className="font-pixel text-[9px] px-2 py-1 border-2 border-fuchsia-500 bg-fuchsia-500 text-zinc-950">
              HARDCORE
            </span>
          )}
        </div>
        {isTimed ? (
          <div className={`font-pixel text-2xl tabular-nums ${timeColor}`}>
            {String(Math.floor(timeLeft / 60)).padStart(1, "0")}:
            {String(timeLeft % 60).padStart(2, "0")}
          </div>
        ) : (
          <span className="font-pixel text-[10px] px-2 py-1 border-2 border-zinc-700 bg-zinc-950 text-zinc-300">
            PRACTICE
          </span>
        )}
      </header>

      <section className="px-6 py-4 border-b-2 border-zinc-800 bg-zinc-950">
        <div className="text-lg font-medium">{current.title}</div>
        <div className="text-sm text-zinc-500 mt-1">{current.hint}</div>
      </section>

      <main className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <CodeEditor value={draft} language={current.language} onChange={setDraft} />
        </div>
      </main>

      <footer className="border-t-2 border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-950">
        <div className="text-sm h-5 font-mono">
          {lastResult === "bad" && (
            <span className="text-fuchsia-400">{badTimeLabel}</span>
          )}
          {lastResult === "ok" && (
            <span className="text-indigo-400">Fixed. Next bug loaded.</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={skip}
            className="px-3 py-2 font-pixel text-[10px] border-2 border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500 transition"
          >
            {penaltyLabel.toUpperCase()}
          </button>
          <button
            onClick={armEndRound}
            className={`px-3 py-2 font-pixel text-[10px] border-2 transition ${
              confirmEnd
                ? "border-fuchsia-500 bg-fuchsia-500 text-zinc-950"
                : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {confirmEnd ? "END ROUND?" : "END ROUND"}
          </button>
          <button
            onClick={submit}
            className="btn-press px-4 py-2 font-pixel text-[10px] bg-indigo-500 text-zinc-950 border-2 border-zinc-950"
          >
            ▶ SUBMIT
          </button>
        </div>
      </footer>
    </div>
  );
}
