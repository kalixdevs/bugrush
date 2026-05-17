import Link from "next/link";
import AuthNav from "@/components/AuthNav";
import Leaderboard from "@/components/Leaderboard";

const HERO_SNIPPET = `function getUser(users, id) {
  return users.find(u => u.id = id);
}`;

const VALID_BOARDS = ["easy", "normal", "hard", "hardcore"] as const;
type Board = (typeof VALID_BOARDS)[number];

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<{ board?: string }>;
}) {
  const { board } = await searchParams;
  const difficulty: Board | undefined =
    board && (VALID_BOARDS as readonly string[]).includes(board)
      ? (board as Board)
      : undefined;

  return (
    <div className="min-h-screen text-zinc-100 selection:bg-indigo-500 selection:text-zinc-950">
      <Nav />
      <Hero />
      <HowItWorks />
      <Modes />
      <Leaderboard difficulty={difficulty} />
      <ClosingCta />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="border-b-2 border-zinc-800 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-pixel text-indigo-400 text-xs tracking-widest"
        >
          BUGRUSH
        </Link>
        <div className="flex items-center gap-6 text-xs font-pixel">
          <a href="#modes" className="text-zinc-400 hover:text-indigo-400 transition">MODES</a>
          <Link href="/leaderboard" className="text-zinc-400 hover:text-indigo-400 transition">
            LEADERBOARD
          </Link>
          <Link href="/daily" className="text-zinc-400 hover:text-indigo-400 transition">
            DAILY
          </Link>
          <Link href="/home" className="text-zinc-400 hover:text-indigo-400 transition">
            ▶ HOME
          </Link>
          <AuthNav />
          <Link
            href="/home"
            className="btn-press px-3 py-2 bg-indigo-500 text-zinc-950 border-2 border-zinc-950"
          >
            ▶ PLAY
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <div className="font-mono text-xs text-indigo-400 mb-6">
          &gt; a competitive debugging game
        </div>
        <h1 className="font-pixel text-3xl sm:text-4xl leading-[1.4] text-zinc-50">
          DIAGNOSE
          <br />
          CHAOS
          <br />
          FASTER<span className="blink text-indigo-400">_</span>
        </h1>
        <p className="mt-8 text-base text-zinc-400 max-w-md leading-relaxed">
          60 seconds on the clock. Broken code on the screen. Patch it, ship it, move on —
          and beat your last run.
        </p>
        <div className="mt-10 flex items-center gap-6">
          <Link
            href="/home"
            className="btn-press inline-block px-6 py-3 bg-indigo-500 text-zinc-950 border-2 border-zinc-950 font-pixel text-xs"
          >
            ▶ START GAME
          </Link>
          <a
            href="#how"
            className="font-pixel text-xs text-zinc-500 hover:text-zinc-200 transition"
          >
            --HELP
          </a>
        </div>
      </div>

      <HeroPreview />
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="border-2 border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-zinc-700 bg-zinc-950 font-mono text-xs">
        <div className="text-zinc-500">[ x ][ - ][ + ]</div>
        <div className="text-zinc-500">speed-fix · round 03</div>
        <div className="text-indigo-400 font-pixel text-[10px]">00:47</div>
      </div>
      <div className="px-5 py-4 border-b-2 border-zinc-800">
        <div className="text-sm font-medium">Lookup returns the wrong user</div>
        <div className="text-xs text-zinc-500 mt-1">
          users.find never matches — every call returns the first user.
        </div>
      </div>
      <pre className="px-5 py-5 font-mono text-sm leading-relaxed text-zinc-200 bg-zinc-950">
{HERO_SNIPPET}
      </pre>
      <div className="px-5 py-3 border-t-2 border-zinc-800 flex items-center justify-between text-xs font-mono">
        <span className="text-fuchsia-400">NOT QUITE · −3s</span>
        <span className="text-zinc-500">CTRL+ENTER</span>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Get a bug", d: "A real-world snippet drops in front of you. Stack traces, hints, the works." },
    { n: "02", t: "Patch it", d: "Edit inline in a full IDE. Submit when you think you've nailed the fix." },
    { n: "03", t: "Beat the clock", d: "Score climbs with speed. Wrong answers cost seconds. One more round." },
  ];
  return (
    <section id="how" className="border-y-2 border-zinc-800 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="font-mono text-xs text-indigo-400 mb-3">{"// how it works"}</div>
        <h2 className="font-pixel text-xl sm:text-2xl mb-12 leading-relaxed">
          THREE STEPS.<br />NO TUTORIALS.
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="border-2 border-zinc-800 bg-zinc-900 p-6">
              <div className="font-pixel text-indigo-400 text-xs">{s.n}</div>
              <div className="text-lg font-semibold mt-3">{s.t}</div>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Modes() {
  const modes = [
    {
      t: "SPEED FIX",
      d: "60-second arcade rounds. Patch syntax-and-logic bugs as fast as your fingers move.",
      live: true,
    },
    {
      t: "ROOT CAUSE",
      d: "Only symptoms. Logs, output, failing tests. Identify what broke before you touch the code.",
      live: false,
    },
    {
      t: "PRODUCTION PANIC",
      d: "A simulated outage. Dashboards, traces, commits. Figure out what shipped and shipped wrong.",
      live: false,
    },
  ];
  return (
    <section id="modes" className="max-w-6xl mx-auto px-6 py-24">
      <div className="font-mono text-xs text-indigo-400 mb-3">{"// modes"}</div>
      <h2 className="font-pixel text-xl sm:text-2xl mb-12 leading-relaxed">
        FROM ARCADE TO<br />INCIDENT RESPONSE.
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {modes.map((m) => (
          <div
            key={m.t}
            className={`border-2 p-6 ${
              m.live
                ? "border-indigo-500 bg-indigo-500/5"
                : "border-zinc-800 bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-pixel text-sm">{m.t}</div>
              {m.live ? (
                <span className="font-pixel text-[9px] px-1.5 py-1 bg-indigo-500 text-zinc-950 border-2 border-zinc-950">
                  LIVE
                </span>
              ) : (
                <span className="font-pixel text-[9px] px-1.5 py-1 bg-zinc-800 text-amber-400 border-2 border-zinc-900">
                  SOON
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-4 leading-relaxed">{m.d}</p>
            {m.live && (
              <Link
                href="/home"
                className="inline-block mt-5 font-pixel text-[10px] text-indigo-400 hover:text-indigo-300 transition"
              >
                ▶ PLAY NOW
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="border-t-2 border-zinc-800">
      <div className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="font-pixel text-xl sm:text-2xl leading-relaxed">
          THE CLOCK<br />IS ALREADY RUNNING.
        </h2>
        <p className="mt-5 text-zinc-400">Your first round is free. They&apos;re all free.</p>
        <Link
          href="/home"
          className="btn-press inline-block mt-8 px-7 py-3 bg-indigo-500 text-zinc-950 border-2 border-zinc-950 font-pixel text-xs"
        >
          ▶ START GAME
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t-2 border-zinc-800">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between font-pixel text-[10px] text-zinc-500">
        <div>© {new Date().getFullYear()} BUGRUSH</div>
        <div className="flex gap-5">
          <a href="#" className="hover:text-indigo-400 transition">TWITTER</a>
          <a href="#" className="hover:text-indigo-400 transition">DISCORD</a>
          <a href="#" className="hover:text-indigo-400 transition">GITHUB</a>
        </div>
      </div>
    </footer>
  );
}
