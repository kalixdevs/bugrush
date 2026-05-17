"use client";

type Ctor = typeof AudioContext;
const Ctx: Ctor | undefined =
  typeof window !== "undefined"
    ? (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext)
    : undefined;

const LS_KEY = "devrace:muted";

let ctx: AudioContext | null = null;
let muted: boolean = false;

if (typeof window !== "undefined") {
  try {
    muted = window.localStorage.getItem(LS_KEY) === "1";
  } catch {}
}

function ensureCtx(): AudioContext | null {
  if (!Ctx) return null;
  if (!ctx) {
    try {
      ctx = new Ctx();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

function blip(freq: number, durMs: number, type: OscillatorType = "square", peak = 0.12) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = c.currentTime;
    const dur = durMs / 1000;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {}
}

function sequence(notes: Array<{ freq: number; dur: number; type?: OscillatorType }>) {
  let delay = 0;
  for (const n of notes) {
    const f = n.freq;
    const d = n.dur;
    const t = n.type ?? "square";
    setTimeout(() => blip(f, d, t), delay);
    delay += d * 0.9;
  }
}

export const sfx = {
  start: () => blip(523.25, 80, "square", 0.1), // C5
  solve: () => sequence([
    { freq: 659.25, dur: 70 },  // E5
    { freq: 880.0,  dur: 110 }, // A5
  ]),
  fail: () => sequence([
    { freq: 392.0, dur: 80 },   // G4
    { freq: 369.99, dur: 140 }, // F#4
  ]),
  finish: (kind: "win" | "lose") => {
    if (kind === "win") {
      sequence([
        { freq: 523.25, dur: 90 },  // C5
        { freq: 659.25, dur: 90 },  // E5
        { freq: 783.99, dur: 180 }, // G5
      ]);
    } else {
      sequence([
        { freq: 440.0, dur: 100, type: "sawtooth" }, // A4
        { freq: 349.23, dur: 100, type: "sawtooth" }, // F4
        { freq: 261.63, dur: 260, type: "sawtooth" }, // C4
      ]);
    }
  },
  isMuted: () => muted,
  setMuted: (m: boolean) => {
    muted = m;
    try {
      window.localStorage.setItem(LS_KEY, m ? "1" : "0");
    } catch {}
    if (m && ctx) {
      try { void ctx.close(); } catch {}
      ctx = null;
    }
  },
};
