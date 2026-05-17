import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AuthNav from "@/components/AuthNav";
import AvatarUploader from "@/components/AvatarUploader";
import ProfileEditor from "@/components/ProfileEditor";
import PlayerName from "@/components/PlayerName";
import PlayerProfile, { getProfileData } from "@/components/profile/PlayerProfile";
import { getEquippedForUser } from "@/lib/cosmetics";

export const metadata = { title: "Profile — Devrace" };

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login?next=/profile");
  }
  const userId = session.user.id;

  const [user, data, cos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, createdAt: true, image: true, handle: true, showcaseBadgeId: true },
    }),
    getProfileData(userId),
    getEquippedForUser(userId),
  ]);

  if (!user) redirect("/login?next=/profile");

  const memberSince = user.createdAt.toISOString().slice(0, 10);
  const label = user.name ?? user.email.split("@")[0];

  return (
    <div className="min-h-screen text-zinc-100">
      <nav className="border-b-2 border-zinc-800 px-6 h-14 flex items-center justify-between bg-zinc-950">
        <Link href="/home" className="font-pixel text-xs text-zinc-400 hover:text-indigo-400 transition">
          ← HOME
        </Link>
        <div className="font-pixel text-xs text-indigo-400 tracking-widest">PROFILE</div>
        <AuthNav />
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <section className="border-2 border-zinc-800 bg-zinc-900 p-6">
          <div className="font-pixel text-xs text-indigo-400 mb-4">PLAYER</div>
          <AvatarUploader initialSrc={user.image ?? null} name={label} />
          <div className="text-3xl font-bold mt-6">
            <PlayerName
              name={label}
              title={cos.title?.textValue}
              nameEffectClass={cos.nameEffect?.cssClass}
              showcaseBadgeId={user.showcaseBadgeId}
            />
          </div>
          <div className="text-sm text-zinc-500 font-mono mt-1">{user.email}</div>
          <div className="font-pixel text-[10px] text-zinc-500 mt-4">
            MEMBER SINCE {memberSince}
          </div>
        </section>

        <ProfileEditor
          initialHandle={user.handle ?? ""}
          initialName={user.name ?? label}
        />

        <PlayerProfile data={data} ownProfile showcaseBadgeId={user.showcaseBadgeId} />
      </main>
    </div>
  );
}
