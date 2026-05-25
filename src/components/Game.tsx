"use client";

import { useEffect, useRef, useState } from "react";
import { useGame, problemView } from "@/lib/store";
import CodeEditor from "./CodeEditor";
import Lobby from "./Lobby";
import HintReveal from "./HintReveal";
import TraceView from "./TraceView";
import RoundResult from "./RoundResult";

export default function Game() {
  const {
    status, config, current, draft, score, solves, timeLeft,
    lastResult,
    setDraft, submit, skip, tick, endRound, bumpHints,
  } = useGame();

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
    return <RoundResult />;
  }

  if (!current) return null;
  const view = problemView(current);
  const isFix = current.kind === "fix";

  const timeColor =
    timeLeft <= 10 ? "text-red-400" : timeLeft <= 20 ? "text-amber-400" : "text-indigo-400";

  const isHardcore = config?.difficulty === "hardcore";
  const penaltyLabel = isTimed ? "Skip (−5s)" : "Skip";
  const badTimeLabel = isTimed ? "Not quite — −3s." : "Not quite.";
  const okLabel = isFix ? "Fixed. Next bug loaded." : "Correct. Next snippet loaded.";

  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <header className="border-b-2 border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-6">
          <div className="font-pixel text-xs text-indigo-400 tracking-widest">BUGRUSH</div>
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
        <div className="text-lg font-medium">{view.title}</div>
        {isFix && view.hint && (
          <HintReveal text={view.hint} free={!isTimed} resetKey={view.id} onReveal={bumpHints} />
        )}
      </section>

      <main className="flex-1 min-h-0 relative">
        {current.kind === "fix" ? (
          <div className="absolute inset-0">
            <CodeEditor value={draft} language={view.language} onChange={setDraft} />
          </div>
        ) : (
          <TraceView trace={current.trace} draft={draft} onChange={setDraft} onSubmit={submit} />
        )}
      </main>

      <footer className="border-t-2 border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-950">
        <div className="text-sm h-5 font-mono">
          {lastResult === "bad" && (
            <span className="text-fuchsia-400">{badTimeLabel}</span>
          )}
          {lastResult === "ok" && (
            <span className="text-indigo-400">{okLabel}</span>
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
