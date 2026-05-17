import { prisma } from "@/lib/db";
import ChatModerationPanel from "@/components/admin/ChatModerationPanel";

export const metadata = { title: "Admin · Chat — Bugrush" };

export default async function AdminChatPage() {
  const [setting, messages] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "chat.slowMode" } }),
    prisma.chatMessage.findMany({
      where: { channel: "lfm" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true, handle: true } } },
    }),
  ]);

  const slowModeSeconds = setting ? Number(setting.value) : 10;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <div className="font-mono text-xs text-indigo-400">{"// chat moderation"}</div>
        <h1 className="font-pixel text-3xl mt-2">CHAT</h1>
      </div>

      <ChatModerationPanel
        initialSlowMode={isFinite(slowModeSeconds) ? slowModeSeconds : 10}
        initialMessages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          authorName: m.user.handle ?? m.user.name ?? "anon",
        }))}
      />
    </div>
  );
}
