"use client";

import { create } from "zustand";
import {
  challenges,
  type Challenge,
  type Difficulty,
  type PlayableLanguage,
} from "./challenges";
import { traceChallenges, type TraceChallenge } from "./traceChallenges";
import { isCorrect, matchOutput } from "./validate";
import { recordRun, fetchPersonalBest } from "./api";
import { sfx } from "./sfx";

export type RoundDifficulty = Difficulty | "hardcore";
export type GameMode = "fix" | "trace";

export type RoundConfig = {
  mode: GameMode;              // "fix" = solve bugs, "trace" = predict output
  languages: PlayableLanguage[];
  difficulty: RoundDifficulty;
  roundSeconds: number | null; // null = practice
  solveCap: number | null;     // null = endless
};

export type EndReason = "time" | "manual" | "cap" | "hardcore-fail" | null;

type Status = "idle" | "playing" | "finished";

export type Problem =
  | { kind: "fix"; challenge: Challenge }
  | { kind: "trace"; trace: TraceChallenge };

/** Normalised fields shared by both problem kinds — for read-only UI access. */
export function problemView(p: Problem): {
  id: string;
  title: string;
  language: PlayableLanguage;
  hint: string | null;
} {
  if (p.kind === "fix") {
    return {
      id: p.challenge.id,
      title: p.challenge.title,
      language: p.challenge.language,
      hint: p.challenge.hint,
    };
  }
  return {
    id: p.trace.id,
    title: p.trace.title,
    language: p.trace.language,
    hint: null,
  };
}

type State = {
  status: Status;
  config: RoundConfig | null;
  queue: Problem[];
  current: Problem | null;
  failedOn: Problem | null;
  draft: string;
  score: number;
  solves: number;
  timeLeft: number;
  hintsRevealed: number;
  lastResult: "ok" | "bad" | null;
  endReason: EndReason;
  personalBest: number | null;
  isNewBest: boolean;
};

type Actions = {
  start: (cfg: RoundConfig) => void;
  setDraft: (v: string) => void;
  submit: () => void;
  skip: () => void;
  tick: () => void;
  endRound: () => void;
  toLobby: () => void;
  reset: () => void;
  bumpHints: () => void;
  loadPersonalBest: () => Promise<void>;
};

function shuffled<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function filterFor(cfg: RoundConfig): Problem[] {
  const diff: Difficulty = cfg.difficulty === "hardcore" ? "hard" : cfg.difficulty;
  if (cfg.mode === "trace") {
    return traceChallenges
      .filter((c) => cfg.languages.includes(c.language) && c.difficulty === diff)
      .map((trace) => ({ kind: "trace" as const, trace }));
  }
  return challenges
    .filter((c) => cfg.languages.includes(c.language) && c.difficulty === diff)
    .map((challenge) => ({ kind: "fix" as const, challenge }));
}

function initialDraft(p: Problem): string {
  return p.kind === "fix" ? p.challenge.broken : "";
}

function finishSideEffects(
  cfg: RoundConfig,
  score: number,
  solves: number,
  endReason: Exclude<EndReason, null>,
  hintsRevealed: number,
  setBest: (next: { personalBest: number; isNewBest: boolean }) => void,
  currentBest: number | null,
) {
  void recordRun({
    score,
    solves,
    difficulty: cfg.difficulty,
    languages: cfg.languages,
    roundSeconds: cfg.roundSeconds,
    solveCap: cfg.solveCap,
    endReason,
    hintsRevealed,
  }).then((ok) => {
    if (!ok) return;
    if (currentBest == null || score > currentBest) {
      setBest({ personalBest: score, isNewBest: true });
    }
  });
}

export const useGame = create<State & Actions>((set, get) => ({
  status: "idle",
  config: null,
  queue: [],
  current: null,
  failedOn: null,
  draft: "",
  score: 0,
  solves: 0,
  timeLeft: 0,
  hintsRevealed: 0,
  lastResult: null,
  endReason: null,
  personalBest: null,
  isNewBest: false,

  start: (cfg) => {
    const pool = filterFor(cfg);
    if (pool.length === 0) return;
    const queue = shuffled(pool);
    const [first, ...rest] = queue;
    set({
      status: "playing",
      config: cfg,
      queue: rest,
      current: first,
      failedOn: null,
      draft: initialDraft(first),
      score: 0,
      solves: 0,
      timeLeft: cfg.roundSeconds ?? 0,
      hintsRevealed: 0,
      lastResult: null,
      endReason: null,
      isNewBest: false,
    });
    sfx.start();
  },

  setDraft: (v) => set({ draft: v, lastResult: null }),

  submit: () => {
    const { current, draft, queue, score, solves, timeLeft, config } = get();
    if (!current || !config) return;

    const correct =
      current.kind === "fix"
        ? isCorrect(draft, current.challenge.solution)
        : matchOutput(draft, current.trace.expectedOutput);

    if (!correct) {
      if (config.difficulty === "hardcore") {
        set({
          status: "finished",
          endReason: "hardcore-fail",
          failedOn: current,
          lastResult: "bad",
        });
        finishSideEffects(
          config, score, solves, "hardcore-fail",
          get().hintsRevealed, (n) => set(n), get().personalBest,
        );
        sfx.fail();
        sfx.finish("lose");
        return;
      }
      const penalty = config.roundSeconds == null ? 0 : 3;
      set({
        lastResult: "bad",
        timeLeft: Math.max(0, timeLeft - penalty),
      });
      sfx.fail();
      return;
    }

    const isTimed = config.roundSeconds != null;
    const bonus = isTimed ? 100 + Math.floor(timeLeft * 2) : 100;
    const nextSolves = solves + 1;

    if (config.solveCap != null && nextSolves >= config.solveCap) {
      const finalScore = score + bonus;
      set({
        score: finalScore,
        solves: nextSolves,
        lastResult: "ok",
        status: "finished",
        endReason: "cap",
      });
      finishSideEffects(
        config, finalScore, nextSolves, "cap",
        get().hintsRevealed, (n) => set(n), get().personalBest,
      );
      sfx.solve();
      sfx.finish("win");
      return;
    }

    const pool = queue.length ? queue : shuffled(filterFor(config));
    const [next, ...rest] = pool;
    set({
      score: score + bonus,
      solves: nextSolves,
      lastResult: "ok",
      current: next,
      draft: initialDraft(next),
      queue: rest,
    });
    sfx.solve();
  },

  skip: () => {
    const { queue, timeLeft, config } = get();
    if (!config) return;
    const pool = queue.length ? queue : shuffled(filterFor(config));
    const [next, ...rest] = pool;
    const penalty = config.roundSeconds == null ? 0 : 5;
    set({
      current: next,
      draft: initialDraft(next),
      queue: rest,
      lastResult: null,
      timeLeft: Math.max(0, timeLeft - penalty),
    });
  },

  tick: () => {
    const { timeLeft, status, config, score, solves, personalBest, hintsRevealed } = get();
    if (status !== "playing" || !config || config.roundSeconds == null) return;
    if (timeLeft <= 1) {
      set({ timeLeft: 0, status: "finished", endReason: "time" });
      finishSideEffects(config, score, solves, "time", hintsRevealed, (n) => set(n), personalBest);
      sfx.finish("win");
      return;
    }
    set({ timeLeft: timeLeft - 1 });
  },

  endRound: () => {
    const { status, config, score, solves, personalBest, hintsRevealed } = get();
    if (status !== "playing" || !config) return;
    set({ status: "finished", endReason: "manual" });
    finishSideEffects(config, score, solves, "manual", hintsRevealed, (n) => set(n), personalBest);
    sfx.finish("win");
  },

  bumpHints: () => set((s) => ({ hintsRevealed: s.hintsRevealed + 1 })),

  toLobby: () =>
    set({
      status: "idle",
      queue: [],
      current: null,
      failedOn: null,
      draft: "",
      score: 0,
      solves: 0,
      timeLeft: 0,
      hintsRevealed: 0,
      lastResult: null,
      endReason: null,
    }),

  reset: () =>
    set({
      status: "idle",
      config: null,
      queue: [],
      current: null,
      failedOn: null,
      draft: "",
      score: 0,
      solves: 0,
      timeLeft: 0,
      hintsRevealed: 0,
      lastResult: null,
      endReason: null,
      isNewBest: false,
    }),

  loadPersonalBest: async () => {
    const best = await fetchPersonalBest();
    set({ personalBest: best });
  },
}));
