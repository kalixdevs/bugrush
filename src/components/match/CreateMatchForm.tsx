"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES } from "@/lib/challenges";
import { MATCH_MODES, MATCH_ROUND_SECONDS, type MatchMode } from "@/lib/match";

const DIFFICULTIES = ["easy", "normal", "hard", "hardcore"] as const;

export default function CreateMatchForm() {
  const router = useRouter();
  const [mode, setMode] = useState<MatchMode>("1v1");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [language, setLanguage] = useState<string>("javascript");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("normal");
  const [roundSeconds, setRoundSeconds] = useState<30 | 60 | 120>(60);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const playable = LANGUAGES.filter((l) => l.available);

  const create = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, privacy, language, difficulty, roundSeconds }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "failed" }));
        setErr(j.error ?? "failed");
        setBusy(false);
        return;
      }
      const data = await res.json() as { id: string };
      router.push(`/match/${data.id}`);
    } catch { setErr("failed"); setBusy(false); }
  };

  return (
    <div className="border-2 border-zinc-800 bg-zinc-900 p-6 space-y-6">
      <h1 className="font-pixel text-2xl">CREATE A MATCH</h1>

      <Section label="MODE">
        <Pills
          options={MATCH_MODES.map((m) => ({ value: m, label: m.toUpperCase() }))}
          value={mode}
          onPick={(v) => setMode(v as MatchMode)}
        />
      </Section>

      <Section label="PRIVACY">
        <Pills
          options={[
            { value: "public", label: "PUBLIC" },
            { value: "private", label: "PRIVATE" },
          ]}
          value={privacy}
          onPick={(v) => setPrivacy(v as "public" | "private")}
        />
      </Section>

      <Section label="LANGUAGE">
        <Pills
          options={playable.map((l) => ({ value: l.id, label: l.label.toUpperCase() }))}
          value={language}
          onPick={setLanguage}
        />
      </Section>

      <Section label="DIFFICULTY">
        <Pills
          options={DIFFICULTIES.map((d) => ({ value: d, label: d.toUpperCase() }))}
          value={difficulty}
          onPick={(v) => setDifficulty(v as (typeof DIFFICULTIES)[number])}
        />
      </Section>

      <Section label="ROUND LENGTH">
        <Pills
          options={MATCH_ROUND_SECONDS.map((s) => ({ value: String(s), label: `${s}s` }))}
          value={String(roundSeconds)}
          onPick={(v) => setRoundSeconds(Number(v) as 30 | 60 | 120)}
        />
      </Section>

      {err && <p className="text-xs font-mono text-fuchsia-400">{err}</p>}

      <button
        onClick={create}
        disabled={busy}
        className="btn-press w-full px-6 py-3 font-pixel text-xs border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
      >
        {busy ? "···" : "▶ CREATE"}
      </button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-pixel text-[11px] text-indigo-400 mb-2">{label}</div>
      {children}
    </div>
  );
}

function Pills({
  options, value, onPick,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onPick(o.value)}
          className={`px-3.5 py-2 font-pixel text-[11px] border-2 transition ${
            value === o.value
              ? "border-indigo-500 bg-indigo-500 text-zinc-950"
              : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
