"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LANGUAGES, challenges, type PlayableLanguage } from "@/lib/challenges";
import { useGame, type RoundConfig, type RoundDifficulty } from "@/lib/store";
import { sfx } from "@/lib/sfx";
import AuthNav from "./AuthNav";

const LS_KEY = "devrace:lastConfig";

const DEFAULT_CONFIG: RoundConfig = {
  languages: ["javascript", "python"],
  difficulty: "normal",
  roundSeconds: 60,
  solveCap: null,
};

const DIFFICULTY_TIERS: Array<{
  id: RoundDifficulty;
  label: string;
  selectedCls: string;
  sub?: string;
}> = [
  { id: "easy",     label: "EASY",     selectedCls: "border-indigo-500 bg-indigo-500 text-zinc-950" },
  { id: "normal",   label: "NORMAL",   selectedCls: "border-amber-400 bg-amber-400 text-zinc-950" },
  { id: "hard",     label: "HARD",     selectedCls: "border-orange-500 bg-orange-500 text-zinc-950" },
  { id: "hardcore", label: "HARDCORE", selectedCls: "border-fuchsia-500 bg-fuchsia-500 text-zinc-950", sub: "1 MISTAKE = OVER" },
];

const TIME_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: 30,   label: "30s" },
  { value: 60,   label: "60s" },
  { value: 120,  label: "120s" },
  { value: null, label: "∞ Practice" },
];

const CAP_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "Endless" },
  { value: 5,    label: "5" },
  { value: 10,   label: "10" },
  { value: 20,   label: "20" },
];

function loadConfig(): RoundConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as RoundConfig;
    if (!Array.isArray(parsed.languages) || parsed.languages.length === 0) {
      return DEFAULT_CONFIG;
    }
    return parsed;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default function Lobby() {
  const start = useGame((s) => s.start);
  const loadPersonalBest = useGame((s) => s.loadPersonalBest);
  const personalBest = useGame((s) => s.personalBest);
  const [cfg, setCfg] = useState<RoundConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    // Hydrate from localStorage post-mount to avoid SSR mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCfg(loadConfig());
    loadPersonalBest();
  }, [loadPersonalBest]);

  const toggleLang = (id: PlayableLanguage) => {
    setCfg((c) => {
      const has = c.languages.includes(id);
      const next = has
        ? c.languages.filter((l) => l !== id)
        : [...c.languages, id];
      return { ...c, languages: next.length ? next : c.languages };
    });
  };

  const pickDifficulty = (d: RoundDifficulty) => {
    setCfg((c) => {
      // Hardcore + Practice are mutually exclusive
      if (d === "hardcore" && c.roundSeconds == null) {
        return { ...c, difficulty: d, roundSeconds: 60 };
      }
      return { ...c, difficulty: d };
    });
  };

  const pickTime = (v: number | null) => {
    setCfg((c) => {
      if (v == null && c.difficulty === "hardcore") {
        return { ...c, roundSeconds: v, difficulty: "hard" };
      }
      return { ...c, roundSeconds: v };
    });
  };

  const pickCap = (v: number | null) => setCfg((c) => ({ ...c, solveCap: v }));

  const effectiveDiff = cfg.difficulty === "hardcore" ? "hard" : cfg.difficulty;
  const poolSize = challenges.filter(
    (c) => cfg.languages.includes(c.language) && c.difficulty === effectiveDiff,
  ).length;

  const noLangs = cfg.languages.length === 0;
  const emptyPool = !noLangs && poolSize === 0;
  const canStart = !noLangs && !emptyPool;

  const handleStart = () => {
    if (!canStart) return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    } catch {}
    start(cfg);
  };

  return (
    <div className="min-h-screen text-zinc-100 grid place-items-center px-6 py-12">
      <div className="w-full max-w-3xl border-2 border-zinc-800 bg-zinc-900 p-8">
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/home"
            className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition"
          >
            ← HOME
          </Link>
          <div className="flex items-center gap-5">
            {personalBest != null && (
              <span className="font-pixel text-[10px] text-zinc-500">
                BEST <span className="text-indigo-400 tabular-nums">{personalBest}</span>
              </span>
            )}
            <SoundToggle />
            <AuthNav />
          </div>
        </div>

        <h1 className="font-pixel text-lg sm:text-xl mb-3 leading-relaxed">
          CONFIGURE<br />YOUR ROUND
        </h1>
        <p className="text-zinc-400 text-sm mb-10">
          Pick your stack and how brutal you want it.
        </p>

        <Section title="LANGUAGE" hint="Pick one or more">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const isPlayable = l.available;
              const selected = isPlayable && cfg.languages.includes(l.id as PlayableLanguage);
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={!isPlayable}
                  onClick={() => isPlayable && toggleLang(l.id as PlayableLanguage)}
                  className={`relative px-4 py-2 font-pixel text-[11px] border-2 transition ${
                    !isPlayable
                      ? "border-zinc-800 bg-zinc-950 text-zinc-700 cursor-not-allowed"
                      : selected
                      ? "border-indigo-500 bg-indigo-500 text-zinc-950"
                      : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {l.label}
                  {!isPlayable && (
                    <span className="ml-2 text-[10px] tracking-widest text-zinc-500">
                      SOON
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="DIFFICULTY">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIFFICULTY_TIERS.map((d) => {
              const selected = cfg.difficulty === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => pickDifficulty(d.id)}
                  className={`relative border-2 px-3 py-3 text-left transition ${
                    selected
                      ? d.selectedCls
                      : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
                  }`}
                >
                  <div className="font-pixel text-xs">{d.label}</div>
                  {d.sub && (
                    <div className="font-pixel text-[8px] mt-2 opacity-90">⚡ {d.sub}</div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="ROUND LENGTH">
          <PillRow
            options={TIME_OPTIONS.map((o) => ({
              key: String(o.value),
              label: o.label,
              selected: cfg.roundSeconds === o.value,
              onClick: () => pickTime(o.value),
            }))}
          />
          {cfg.roundSeconds == null && (
            <p className="text-xs text-zinc-500 mt-2">
              Practice: no timer, no time penalties. Hardcore disabled.
            </p>
          )}
        </Section>

        <Section title="CHALLENGE CAP">
          <PillRow
            options={CAP_OPTIONS.map((o) => ({
              key: String(o.value),
              label: o.label,
              selected: cfg.solveCap === o.value,
              onClick: () => pickCap(o.value),
            }))}
          />
        </Section>

        <div className="mt-8 flex flex-col items-center">
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            className={`btn-press px-10 py-3 font-pixel text-xs border-2 border-zinc-950 ${
              canStart
                ? "bg-indigo-500 text-zinc-950"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            ▶ START GAME
          </button>
          {noLangs && (
            <p className="font-pixel text-[10px] text-fuchsia-400 mt-3">SELECT A LANGUAGE</p>
          )}
          {emptyPool && (
            <p className="text-xs text-fuchsia-400 mt-3 max-w-sm text-center">
              No {cfg.difficulty === "hardcore" ? "hard" : cfg.difficulty} challenges available for your language pick yet. Try a different difficulty or add JS.
            </p>
          )}
          {cfg.difficulty === "hardcore" && (
            <p className="font-pixel text-[10px] text-fuchsia-400 mt-4">
              ONE WRONG SUBMIT = GAME OVER
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-pixel text-[11px] text-indigo-400">
          {title}
        </h2>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SoundToggle() {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMuted(sfx.isMuted());
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        const next = !muted;
        sfx.setMuted(next);
        setMuted(next);
      }}
      className="font-pixel text-[10px] text-zinc-400 hover:text-indigo-400 transition"
      aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
    >
      {muted ? "SFX OFF" : "SFX ON"}
    </button>
  );
}

function PillRow({
  options,
}: {
  options: Array<{ key: string; label: string; selected: boolean; onClick: () => void }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={o.onClick}
          className={`px-3.5 py-2 font-pixel text-[11px] border-2 transition ${
            o.selected
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
