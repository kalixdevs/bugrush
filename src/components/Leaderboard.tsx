import Link from "next/link";
import { prisma } from "@/lib/db";
import { getEquippedForUsers, getShowcaseBadgesForUsers } from "@/lib/cosmetics";
import Avatar from "./Avatar";
import PlayerName from "./PlayerName";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";
import MaybeLink from "./MaybeLink";

type DiffKey = "easy" | "normal" | "hard" | "hardcore";

const TABS: Array<{ id: "all" | DiffKey; label: string }> = [
  { id: "all",      label: "ALL" },
  { id: "easy",     label: "EASY" },
  { id: "normal",   label: "NORMAL" },
  { id: "hard",     label: "HARD" },
  { id: "hardcore", label: "HARDCORE" },
];

type Row = {
  userId: string;
  name: string;
  handle: string | null;
  image: string | null;
  all: number;
  easy: number | null;
  normal: number | null;
  hard: number | null;
  hardcore: number | null;
};

type Props = {
  difficulty?: DiffKey;
  baseHref?: string;
};

export default async function Leaderboard({ difficulty, baseHref = "/" }: Props) {
  const activeTab: "all" | DiffKey = difficulty ?? "all";

  let rows: Row[] = [];

  try {
    const grouped = await prisma.run.groupBy({
      by: ["userId", "difficulty"],
      _max: { score: true },
    });

    const byUser = new Map<string, Map<string, number>>();
    for (const g of grouped) {
      const score = g._max.score ?? 0;
      if (!byUser.has(g.userId)) byUser.set(g.userId, new Map());
      byUser.get(g.userId)!.set(g.difficulty, score);
    }

    const userIds = Array.from(byUser.keys());
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, image: true, handle: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const built: Row[] = userIds.map((uid) => {
        const m = byUser.get(uid)!;
        const easy = m.get("easy") ?? null;
        const normal = m.get("normal") ?? null;
        const hard = m.get("hard") ?? null;
        const hardcore = m.get("hardcore") ?? null;
        const all = Math.max(easy ?? 0, normal ?? 0, hard ?? 0, hardcore ?? 0);
        const u = userMap.get(uid);
        const name = u?.name ?? u?.email?.split("@")[0] ?? "anon";
        return { userId: uid, name, handle: u?.handle ?? null, image: u?.image ?? null, all, easy, normal, hard, hardcore };
      });

      const filtered = difficulty
        ? built.filter((r) => r[difficulty] != null)
        : built;

      filtered.sort((a, b) => {
        if (difficulty) {
          return (b[difficulty] ?? -1) - (a[difficulty] ?? -1);
        }
        return b.all - a.all;
      });

      rows = filtered.slice(0, 10);
    }
  } catch {
    rows = [];
  }

  const rowIds = rows.map((r) => r.userId);
  const [cosmeticsMap, showcasesMap] = await Promise.all([
    getEquippedForUsers(rowIds),
    getShowcaseBadgesForUsers(rowIds),
  ]);

  const subtitle = difficulty
    ? `${difficulty.toUpperCase()} board`
    : "All-time best scores";

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <PageHeader eyebrow="// leaderboard" title="HIGH SCORES" subtitle={subtitle} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const selected = t.id === activeTab;
          const href = t.id === "all" ? baseHref : `${baseHref}?board=${t.id}`;
          return (
            <Link
              key={t.id}
              href={href}
              className={`px-3.5 py-2 font-pixel text-[11px] border-2 transition ${
                selected
                  ? "border-indigo-500 bg-indigo-500 text-zinc-950"
                  : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="NO RUNS YET" hint="Be the first." />
      ) : (
        <div className="border-2 border-zinc-800 bg-zinc-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 border-b-2 border-zinc-800">
              <tr className="font-pixel text-[10px] text-zinc-400">
                <th className="text-left px-3 py-3 w-12"></th>
                <th className="text-left px-3 py-3">PLAYER</th>
                <ColHead label="ALL" diff={null} active={activeTab} accent="text-indigo-400" />
                <ColHead label="EASY" diff="easy" active={activeTab} />
                <ColHead label="NORMAL" diff="normal" active={activeTab} />
                <ColHead label="HARD" diff="hard" active={activeTab} />
                <ColHead label="HARDCORE" diff="hardcore" active={activeTab} accent="text-fuchsia-400" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const profileHref = r.handle ? `/u/${r.handle}` : null;
                const cos = cosmeticsMap.get(r.userId);
                const showcaseBadgeId = showcasesMap.get(r.userId) ?? null;
                return (
                  <tr
                    key={r.userId}
                    className={i % 2 === 0 ? "bg-zinc-900" : "bg-zinc-950/60"}
                  >
                    <td className="px-3 py-2.5">
                      <MaybeLink href={profileHref} className="inline-block">
                        <Avatar src={r.image} name={r.name} size={36} frameSrc={cos?.frame?.assetUrl} />
                      </MaybeLink>
                    </td>
                    <td className="px-3 py-2.5">
                      <MaybeLink
                        href={profileHref}
                        className="flex items-center gap-2 hover:text-indigo-400 transition"
                      >
                        <span className="font-pixel text-[10px] text-indigo-400 tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <PlayerName
                          name={r.name}
                          title={cos?.title?.textValue}
                          nameEffectClass={cos?.nameEffect?.cssClass}
                          showcaseBadgeId={showcaseBadgeId}
                          className="font-medium"
                        />
                      </MaybeLink>
                    </td>
                    <Cell value={r.all} active={activeTab === "all"} accent="text-indigo-400" bold />
                    <Cell value={r.easy} active={activeTab === "easy"} />
                    <Cell value={r.normal} active={activeTab === "normal"} />
                    <Cell value={r.hard} active={activeTab === "hard"} />
                    <Cell value={r.hardcore} active={activeTab === "hardcore"} accent="text-fuchsia-400" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function ColHead({
  label, diff, active, accent,
}: {
  label: string;
  diff: DiffKey | null;
  active: "all" | DiffKey;
  accent?: string;
}) {
  const isActive = diff === null ? active === "all" : active === diff;
  return (
    <th
      className={`text-right px-3 py-3 ${accent ?? ""} ${isActive ? "border-b-2 border-indigo-500" : ""}`}
    >
      {label}
    </th>
  );
}

function Cell({
  value, active, accent, bold,
}: {
  value: number | null;
  active: boolean;
  accent?: string;
  bold?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2.5 text-right font-mono tabular-nums ${
        accent ?? "text-zinc-300"
      } ${bold ? "font-semibold" : ""} ${active ? "bg-indigo-500/5" : ""}`}
    >
      {value ?? "—"}
    </td>
  );
}
