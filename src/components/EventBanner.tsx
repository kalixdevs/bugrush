import { getActiveEvent } from "@/lib/events";
import EventCountdown from "./EventCountdown";

export default async function EventBanner() {
  const event = await getActiveEvent();
  if (!event) return null;

  const parts: string[] = [];
  if (event.pointsMultiplier !== 1) parts.push(`${event.pointsMultiplier}× POINTS`);
  if (event.rankPointsMultiplier !== 1) parts.push(`${event.rankPointsMultiplier}× RANK`);
  if (event.exclusiveDrops.length > 0) parts.push(`LIMITED DROPS`);
  const effects = parts.length > 0 ? parts.join(" · ") : "EVENT ACTIVE";

  return (
    <div className="site-chrome border-b-2 border-indigo-500 bg-indigo-500/10 px-4 py-2 font-pixel text-[11px] tracking-widest text-indigo-300 flex items-center justify-center gap-3">
      <span className="text-indigo-400">EVENT</span>
      <span>{event.name.toUpperCase()}</span>
      <span className="text-indigo-400">·</span>
      <span>{effects}</span>
      <span className="text-indigo-400">·</span>
      <EventCountdown endsAtIso={event.endsAt.toISOString()} />
    </div>
  );
}
