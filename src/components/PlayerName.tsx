import BadgeIcon from "./BadgeIcon";
import { findBadge } from "@/lib/badges";

type Props = {
  name: string;
  title?: string | null;
  nameEffectClass?: string | null;
  showcaseBadgeId?: string | null;
  className?: string;
  titleClassName?: string;
};

export default function PlayerName({
  name,
  title,
  nameEffectClass,
  showcaseBadgeId,
  className,
  titleClassName,
}: Props) {
  const badge = showcaseBadgeId ? findBadge(showcaseBadgeId) : undefined;
  return (
    <span className="inline-flex items-center gap-2">
      {badge && <BadgeIcon badge={badge} size={18} />}
      <span className={`${className ?? ""} ${nameEffectClass ?? ""}`.trim()}>
        {name}
      </span>
      {title && (
        <span
          className={
            titleClassName ??
            "font-pixel text-[9px] px-1.5 py-0.5 border-2 border-amber-400 text-amber-300 bg-zinc-950"
          }
        >
          {title}
        </span>
      )}
    </span>
  );
}
