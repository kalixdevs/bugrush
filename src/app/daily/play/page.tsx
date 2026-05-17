import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDailyChallenge, todayKey } from "@/lib/daily";
import DailyGame from "@/components/DailyGame";

export const metadata = { title: "Today's Bug — Bugrush" };

export default async function DailyPlayPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login?next=/daily");
  }

  const dayKey = todayKey();
  const existing = await prisma.dailyAttempt.findUnique({
    where: { userId_dayKey: { userId: session.user.id, dayKey } },
  });
  if (existing) redirect("/daily");

  const challenge = getDailyChallenge(dayKey);
  return <DailyGame challenge={challenge} />;
}
