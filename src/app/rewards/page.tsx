import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/daily";
import OpenCaseButton from "@/components/rewards/OpenCaseButton";
import Avatar from "@/components/Avatar";
import PlayerName from "@/components/PlayerName";
import PageHeader from "@/components/PageHeader";

export const metadata = { title: "Daily Rewards — Bugrush" };

const RARITY_TONE: Record<string, { border: string; text: string; label: string }> = {
  common:    { border: "border-zinc-600",    text: "text-zinc-300",    label: "COMMON" },
  rare:      { border: "border-sky-500",     text: "text-sky-300",     label: "RARE" },
  epic:      { border: "border-fuchsia-500", text: "text-fuchsia-300", label: "EPIC" },
  legendary: { border: "border-amber-400",   text: "text-amber-300",   label: "LEGENDARY" },
};

export default async function RewardsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login?next=/rewards");
  }
  const userId = session.user.id;
  const dayKey = todayKey();

  const [reward, me] = await Promise.all([
    prisma.dailyReward.findUnique({
      where: { userId_dayKey: { userId, dayKey } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, handle: true, points: true },
    }),
  ]);

  let cosmetic = null;
  if (reward?.cosmeticId) {
    cosmetic = await prisma.cosmetic.findUnique({
      where: { id: reward.cosmeticId },
    });
  }

  const previewName = me?.name ?? me?.handle ?? "you";
  const tone = reward ? RARITY_TONE[reward.rarity] : null;

  return (
    <div className="text-zinc-100">
      <main className="max-w-2xl mx-auto px-6 py-16 text-center space-y-8">
        <PageHeader
          eyebrow={`> ${dayKey}`}
          title={reward ? "OPENED FOR TODAY" : "OPEN TODAY'S CASE"}
          subtitle={
            reward
              ? undefined
              : "One case per UTC day. Common cosmetic, coin payout, or — rarely — a legendary drop."
          }
          align="center"
        />

        {!reward ? (
          <OpenCaseButton />
        ) : (
          <div className={`border-2 ${tone?.border} bg-zinc-900 p-8 inline-block`}>
            <div className={`font-pixel text-xs ${tone?.text} mb-4`}>{tone?.label}</div>
            {cosmetic ? (
              <>
                <div className="h-28 grid place-items-center bg-zinc-950 border-2 border-zinc-800 mb-4">
                  {cosmetic.category === "frame" && (
                    <Avatar name={previewName} size={80} frameSrc={cosmetic.assetUrl} />
                  )}
                  {cosmetic.category === "title" && (
                    <PlayerName name={previewName} title={cosmetic.textValue} className="font-medium" />
                  )}
                  {cosmetic.category === "name_effect" && (
                    <PlayerName name={previewName} nameEffectClass={cosmetic.cssClass} className="text-xl font-medium" />
                  )}
                </div>
                <div className="font-pixel text-sm">{cosmetic.name}</div>
                <p className="text-xs text-zinc-400 mt-2 max-w-xs">{cosmetic.description}</p>
                <div className="mt-4 text-[10px] font-pixel text-zinc-500">
                  ADDED TO INVENTORY · <Link href="/shop" className="text-indigo-400">VIEW IN SHOP</Link>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl font-mono tabular-nums text-amber-400">+{reward.pointsAwarded}</div>
                <div className="text-zinc-500 text-sm mt-2">coins added to your balance</div>
              </>
            )}
          </div>
        )}

        <p className="font-pixel text-[10px] text-zinc-500 pt-8">
          {reward ? "COMES BACK TOMORROW · UTC MIDNIGHT" : "ONE OPEN PER DAY"}
        </p>
      </main>
    </div>
  );
}
