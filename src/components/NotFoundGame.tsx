"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A tiny Snake game — the 404 easter egg. Nothing to do with debugging.
const SIZE = 17;
const TICK_MS = 125;
const LS_BEST = "bugrush:snakeBest";

type Pt = { x: number; y: number };
type Game = { snake: Pt[]; food: Pt; score: number };
type Status = "idle" | "playing" | "dead";

const START_SNAKE: Pt[] = [
  { x: 8, y: 8 },
  { x: 7, y: 8 },
  { x: 6, y: 8 },
];

const INITIAL: Game = { snake: START_SNAKE, food: { x: 12, y: 8 }, score: 0 };

function randomFood(snake: Pt[]): Pt {
  const taken = new Set(snake.map((p) => `${p.x},${p.y}`));
  let p: Pt;
  do {
    p = {
      x: Math.floor(Math.random() * SIZE),
      y: Math.floor(Math.random() * SIZE),
    };
  } while (taken.has(`${p.x},${p.y}`));
  return p;
}

export default function NotFoundGame() {
  const [game, setGame] = useState<Game>(INITIAL);
  const [status, setStatus] = useState<Status>("idle");
  // Hydrated from localStorage post-mount to avoid SSR mismatch — initial
  // render outputs BEST 0 on both server and client; the effect below
  // updates it once mounted.
  const [best, setBest] = useState<number>(0);
  useEffect(() => {
    const v = Number(window.localStorage.getItem(LS_BEST));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Number.isFinite(v) && v > 0) setBest(v);
  }, []);

  const gameRef = useRef(game);
  const statusRef = useRef(status);
  const dirRef = useRef<Pt>({ x: 1, y: 0 });
  const nextDirRef = useRef<Pt>({ x: 1, y: 0 });

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => {
    if (best > 0) window.localStorage.setItem(LS_BEST, String(best));
  }, [best]);

  const start = useCallback(() => {
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    setGame({ snake: START_SNAKE, food: randomFood(START_SNAKE), score: 0 });
    setStatus("playing");
  }, []);

  const steer = useCallback((nd: Pt) => {
    if (statusRef.current === "idle") start();
    const cur = dirRef.current;
    if (nd.x === -cur.x && nd.y === -cur.y) return; // no 180° reversal
    nextDirRef.current = nd;
  }, [start]);

  // Keyboard controls.
  useEffect(() => {
    const MAP: Record<string, Pt> = {
      arrowup: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 },
      w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
      a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
    };
    const onKey = (e: KeyboardEvent) => {
      const nd = MAP[e.key.toLowerCase()];
      if (!nd) return;
      e.preventDefault();
      steer(nd);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steer]);

  // Game loop.
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => {
      const g = gameRef.current;
      const queued = nextDirRef.current;
      const cur = dirRef.current;
      if (!(queued.x === -cur.x && queued.y === -cur.y)) {
        dirRef.current = queued;
      }
      const dir = dirRef.current;
      const head = { x: g.snake[0].x + dir.x, y: g.snake[0].y + dir.y };

      if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE) {
        setStatus("dead");
        return;
      }
      const ate = head.x === g.food.x && head.y === g.food.y;
      const body = ate ? g.snake : g.snake.slice(0, -1);
      if (body.some((p) => p.x === head.x && p.y === head.y)) {
        setStatus("dead");
        return;
      }
      const snake = [head, ...body];
      if (ate) {
        const score = g.score + 1;
        setGame({ snake, food: randomFood(snake), score });
        setBest((b) => (score > b ? score : b));
      } else {
        setGame({ snake, food: g.food, score: g.score });
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [status]);

  // Build the grid.
  const headKey = `${game.snake[0].x},${game.snake[0].y}`;
  const bodyKeys = new Set(game.snake.slice(1).map((p) => `${p.x},${p.y}`));
  const foodKey = `${game.food.x},${game.food.y}`;
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const k = `${x},${y}`;
      let cls = "bg-zinc-900/50";
      if (k === headKey) cls = "bg-indigo-300";
      else if (bodyKeys.has(k)) cls = "bg-indigo-500";
      else if (k === foodKey) cls = "bg-fuchsia-500 animate-pulse";
      cells.push(<div key={k} className={cls} />);
    }
  }

  const newBest = status === "dead" && game.score > 0 && game.score >= best;

  return (
    <div className="mt-6 flex flex-col items-center">
      <div className="flex items-center gap-3 font-pixel text-[10px] mb-3">
        <span className="text-zinc-400">
          SCORE <span className="text-indigo-300 tabular-nums">{game.score}</span>
        </span>
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-400">
          BEST <span className="text-amber-300 tabular-nums">{best}</span>
        </span>
      </div>

      <div className="relative border-2 border-zinc-800 bg-zinc-950 p-1.5">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${SIZE}, 1fr)`,
            width: "min(78vw, 320px)",
            height: "min(78vw, 320px)",
          }}
        >
          {cells}
        </div>

        {status !== "playing" && (
          <div className="absolute inset-0 grid place-items-center bg-zinc-950/85">
            <div className="text-center px-4">
              {status === "idle" ? (
                <>
                  <div className="font-pixel text-sm text-indigo-300">SNAKE</div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-2">
                    arrow keys / WASD
                  </p>
                </>
              ) : (
                <>
                  <div className="font-pixel text-sm text-fuchsia-400">GAME OVER</div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-2">
                    score {game.score}
                    {newBest && <span className="text-amber-300"> · new best!</span>}
                  </p>
                </>
              )}
              <button
                onClick={start}
                className="btn-press mt-4 px-4 py-2 font-pixel text-[10px] border-2 border-zinc-950 bg-indigo-500 text-zinc-950"
              >
                {status === "idle" ? "▶ START" : "▶ RETRY"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5 w-36 mt-4">
        <span />
        <DPadButton label="▲" onPress={() => steer({ x: 0, y: -1 })} />
        <span />
        <DPadButton label="◀" onPress={() => steer({ x: -1, y: 0 })} />
        <DPadButton label="▼" onPress={() => steer({ x: 0, y: 1 })} />
        <DPadButton label="▶" onPress={() => steer({ x: 1, y: 0 })} />
      </div>
    </div>
  );
}

function DPadButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="btn-press aspect-square grid place-items-center border-2 border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-indigo-500 hover:text-indigo-300 transition text-sm"
    >
      {label}
    </button>
  );
}
