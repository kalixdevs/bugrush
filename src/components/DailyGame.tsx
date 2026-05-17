"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Challenge } from "@/lib/challenges";
import { DAILY_DURATION_MS } from "@/lib/daily";
import { isCorrect } from "@/lib/validate";
import { sfx } from "@/lib/sfx";
import CodeEditor from "./CodeEditor";
import HintReveal from "./HintReveal";

type Props = { challenge: Challenge };

const DURATION_S = DAILY_DURATION_MS / 1000;

export default function DailyGame({ challenge }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(challenge.broken);
  const [timeLeft, setTimeLeft] = useState(DURATION_S);
  const [submitting, setSubmitting] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const startedAtRef = useRef<number>(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    sfx.start();
    startedAtRef.current = Date.now();
  }, []);

  const finish = async (success: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    const timeMs = Math.min(DAILY_DURATION_MS, Date.now() - startedAtRef.current);
    if (success) { sfx.solve(); sfx.finish("win"); }
    else { sfx.fail(); sfx.finish("lose"); }
    try {
      await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success, timeMs, submittedCode: success ? draft : undefined, hintsRevealed }),
        credentials: "include",
      });
    } catch {}
    router.push("/daily");
    router.refresh();
  };

  useEffect(() => {
    if (finishedRef.current) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          void finish(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = () => {
    if (finishedRef.current || submitting) return;
    void finish(isCorrect(draft, challenge.solution));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const timeColor =
    timeLeft <= 10 ? "text-fuchsia-400"
    : timeLeft <= 20 ? "text-amber-400"
    : "text-indigo-400";

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b-2 border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-6">
          <div className="font-pixel text-xs text-indigo-400 tracking-widest">BUGRUSH</div>
          <span className="font-pixel text-[10px] px-2 py-1 border-2 border-amber-400 bg-amber-400 text-zinc-950">
            TODAY&apos;S BUG
          </span>
        </div>
        <div className={`font-pixel text-2xl tabular-nums ${timeColor}`}>
          {String(Math.floor(timeLeft / 60)).padStart(1, "0")}:
          {String(timeLeft % 60).padStart(2, "0")}
        </div>
      </header>

      <section className="px-6 py-4 border-b-2 border-zinc-800 bg-zinc-950">
        <div className="text-lg font-medium">{challenge.title}</div>
        <HintReveal text={challenge.hint} resetKey={challenge.id} onReveal={() => setHintsRevealed((n) => n + 1)} />
      </section>

      <main className="flex-1 min-h-0 relative">
        <div className="absolute inset-0">
          <CodeEditor value={draft} language={challenge.language} onChange={setDraft} />
        </div>
      </main>

      <footer className="border-t-2 border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-950">
        <div className="font-pixel text-[10px] text-zinc-500">
          ONE ATTEMPT · WRONG ANSWER ENDS IT
        </div>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className={`btn-press px-4 py-2 font-pixel text-[10px] border-2 border-zinc-950 ${
            submitting ? "bg-zinc-800 text-zinc-500" : "bg-indigo-500 text-zinc-950"
          }`}
        >
          {submitting ? "···" : "▶ SUBMIT"}
        </button>
      </footer>
    </div>
  );
}
