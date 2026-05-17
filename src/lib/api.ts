import type { RoundConfig, EndReason } from "./store";

type RunPayload = {
  score: number;
  solves: number;
  difficulty: RoundConfig["difficulty"];
  languages: RoundConfig["languages"];
  roundSeconds: number | null;
  solveCap: number | null;
  endReason: Exclude<EndReason, null>;
  hintsRevealed: number;
};

export async function recordRun(payload: RunPayload): Promise<boolean> {
  try {
    const res = await fetch("/api/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPersonalBest(): Promise<number | null> {
  try {
    const res = await fetch("/api/runs", { credentials: "include" });
    if (!res.ok) return null;
    const data: { personalBest: number | null } = await res.json();
    return data.personalBest;
  } catch {
    return null;
  }
}
