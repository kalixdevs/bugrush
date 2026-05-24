"use client";

import CodeEditor from "./CodeEditor";
import type { TraceChallenge } from "@/lib/traceChallenges";

type Props = {
  trace: TraceChallenge;
  draft: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
};

/** In-round body for TRACE mode: read-only snippet + output input. */
export default function TraceView({ trace, draft, onChange, onSubmit }: Props) {
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="absolute inset-0 grid grid-rows-[1fr_auto] md:grid-rows-1 md:grid-cols-2">
      <div className="relative border-b-2 md:border-b-0 md:border-r-2 border-zinc-800 min-h-0">
        <div className="absolute top-2 left-3 z-10 font-pixel text-[9px] tracking-widest text-zinc-500 pointer-events-none">
          SNIPPET
        </div>
        <CodeEditor value={trace.code} language={trace.language} readOnly />
      </div>
      <div className="flex flex-col bg-zinc-950 min-h-0">
        <div className="px-4 pt-3 pb-2 font-pixel text-[9px] tracking-widest text-indigo-400 flex items-center justify-between">
          <span>EXPECTED OUTPUT</span>
          <span className="text-zinc-600 font-mono normal-case">⌘/Ctrl + Enter to submit</span>
        </div>
        <textarea
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          placeholder="type the printed output…"
          className="flex-1 m-3 mt-0 p-3 bg-zinc-950 border-2 border-zinc-800 focus:border-indigo-500 outline-none font-mono text-sm text-zinc-100 resize-none whitespace-pre tabular-nums"
        />
      </div>
    </div>
  );
}
