import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Avatar from "@/components/Avatar";
import PlayerName from "@/components/PlayerName";
import PlayerProfile, { getProfileData } from "@/components/profile/PlayerProfile";
import { getEquippedForUser } from "@/lib/cosmetics";
import AddFriendButton from "@/components/friends/AddFriendButton";

export const metadata = { title: "Player — Bugrush" };

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where: { handle: handle.toLowerCase() },
      select: { id: true, name: true, email: true, image: true, createdAt: true, handle: true, showcaseBadgeId: true },
    }),
    auth.api.getSession({ headers: await headers() }),
  ]);
  if (!user) notFound();
  const viewerId = session?.user?.id ?? null;
  const isOwnProfile = viewerId === user.id;

  const [data, cos] = await Promise.all([
    getProfileData(user.id),
    getEquippedForUser(user.id),
  ]);

  const label = user.name ?? user.email.split("@")[0];
  const memberSince = user.createdAt.toISOString().slice(0, 10);

  return (
    <div className="text-zinc-100">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <section className="border-2 border-zinc-800 bg-zinc-900 p-6 flex items-center gap-5">
          <Avatar src={user.image} name={label} size={80} frameSrc={cos.frame?.assetUrl} />
          <div>
            <div className="text-3xl font-bold">
              <PlayerName
                name={label}
                title={cos.title?.textValue}
                nameEffectClass={cos.nameEffect?.cssClass}
                showcaseBadgeId={user.showcaseBadgeId}
              />
            </div>
            <div className="font-mono text-xs text-zinc-500 mt-1">@{user.handle}</div>
            <div className="font-pixel text-[10px] text-zinc-500 mt-3">
              MEMBER SINCE {memberSince}
            </div>
            {viewerId && !isOwnProfile && user.handle && (
              <div className="mt-3">
                <AddFriendButton handle={user.handle} />
              </div>
            )}
          </div>
        </section>

        <PlayerProfile data={data} ownProfile={false} showcaseBadgeId={user.showcaseBadgeId} />
      </main>
    </div>
  );
}
