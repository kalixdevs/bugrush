import { prisma } from "@/lib/db";
import AnnouncementEditor from "@/components/admin/AnnouncementEditor";

export const metadata = { title: "Admin · Announcement — Bugrush" };

export default async function AdminAnnouncementPage() {
  const row = await prisma.setting.findUnique({ where: { key: "chat.announcement" } });
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// chat announcement"}</div>
        <h1 className="font-pixel text-3xl mt-2">ANNOUNCEMENT</h1>
        <p className="text-zinc-500 text-xs font-mono mt-2">
          Shows at the top of the chat sidebar for every player. Leave empty to hide.
        </p>
      </div>
      <AnnouncementEditor initial={row?.value ?? ""} />
    </div>
  );
}
