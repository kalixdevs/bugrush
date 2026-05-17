"use client";

import { create } from "zustand";
import {
  challenges,
  type Challenge,
  type Difficulty,
  type PlayableLanguage,
} from "./challenges";
import { isCorrect } from "./validate";
import { recordRun, fetchPersonalBest } from "./api";
import { sfx } from "./sfx";

export type RoundDifficulty = Difficulty | "hardcore";

export type RoundConfig = {
  languages: PlayableLanguage[];
  difficulty: RoundDifficulty;
  roundSeconds: number | null; // null = practice
  solveCap: number | null;     // null = endless
};

export type EndReason = "time" | "manual" | "cap" | "hardcore-fail" | null;

type Status = "idle" | "playing" | "finished";

type State = {
  status: Status;
  config: RoundConfig | null;
  queue: Challenge[];
  current: Challenge | null;
  failedOn: Challenge | null;
  draft: string;
  score: number;
  solves: number;
  timeLeft: number;
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

function filterFor(cfg: RoundConfig): Challenge[] {
  const diff: Difficulty = cfg.difficulty === "hardcore" ? "hard" : cfg.difficulty;
  return challenges.filter(
    (c) => cfg.languages.includes(c.language) && c.difficulty === diff,
  );
}

function finishSideEffects(
  cfg: RoundConfig,
  score: number,
  solves: number,
  endReason: Exclude<EndReason, null>,
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
      draft: first.broken,
      score: 0,
      solves: 0,
      timeLeft: cfg.roundSeconds ?? 0,
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

    if (!isCorrect(draft, current.solution)) {
      if (config.difficulty === "hardcore") {
        set({
          status: "finished",
          endReason: "hardcore-fail",
          failedOn: current,
          lastResult: "bad",
        });
        finishSideEffects(
          config, score, solves, "hardcore-fail",
          (n) => set(n), get().personalBest,
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
        (n) => set(n), get().personalBest,
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
      draft: next.broken,
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
      draft: next.broken,
      queue: rest,
      lastResult: null,
      timeLeft: Math.max(0, timeLeft - penalty),
    });
  },

  tick: () => {
    const { timeLeft, status, config, score, solves, personalBest } = get();
    if (status !== "playing" || !config || config.roundSeconds == null) return;
    if (timeLeft <= 1) {
      set({ timeLeft: 0, status: "finished", endReason: "time" });
      finishSideEffects(config, score, solves, "time", (n) => set(n), personalBest);
      sfx.finish("win");
      return;
    }
    set({ timeLeft: timeLeft - 1 });
  },

  endRound: () => {
    const { status, config, score, solves, personalBest } = get();
    if (status !== "playing" || !config) return;
    set({ status: "finished", endReason: "manual" });
    finishSideEffects(config, score, solves, "manual", (n) => set(n), personalBest);
    sfx.finish("win");
  },

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
      lastResult: null,
      endReason: null,
      isNewBest: false,
    }),

  loadPersonalBest: async () => {
    const best = await fetchPersonalBest();
    set({ personalBest: best });
  },
}));
