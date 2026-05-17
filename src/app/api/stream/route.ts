import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { subscribe, type Channel, type StreamEvent } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;

  const url = new URL(req.url);
  const matchParam = url.searchParams.get("match");

  const channels: Channel[] = ["lfm"];
  if (userId) channels.push(`user:${userId}`);

  if (matchParam && userId) {
    const participant = await prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId: matchParam, userId } },
    });
    if (participant) channels.push(`match:${matchParam}` as Channel);
  }

  const encoder = new TextEncoder();

  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (e: StreamEvent | { type: "ping" } | { type: "ready" }) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch { /* closed */ }
      };

      // Defeat proxy buffering: pad the initial response with a comment
      // (>= 2KB) so the first flush happens immediately.
      try {
        controller.enqueue(
          encoder.encode(`: ${" ".repeat(2048)}\n\n`),
        );
      } catch { /* ignore */ }
      send({ type: "ready" });

      const unsubscribe = subscribe(channels, (event) => send(event));
      const keepalive = setInterval(() => send({ type: "ping" }), 15_000);

      cleanup = () => {
        clearInterval(keepalive);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      };
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
    },
  });
}
