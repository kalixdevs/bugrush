import { TONE_CLASSES, BADGE_SHEET, type Badge } from "@/lib/badges";

type Props = {
  badge: Badge;
  owned?: boolean;
  size?: number;
  withLabel?: boolean;
  className?: string;
};

function spritePos(col: number, row: number) {
  const xPct = (col / (BADGE_SHEET.cols - 1)) * 100;
  const yPct = (row / (BADGE_SHEET.rows - 1)) * 100;
  return {
    backgroundImage: `url(${BADGE_SHEET.src})`,
    backgroundSize: `${BADGE_SHEET.cols * 100}% ${BADGE_SHEET.rows * 100}%`,
    backgroundPosition: `${xPct}% ${yPct}%`,
    backgroundRepeat: "no-repeat" as const,
  };
}

export default function BadgeIcon({
  badge,
  owned = true,
  size = 64,
  withLabel = false,
  className,
}: Props) {
  const dim = `${size}px`;

  let icon;
  if (badge.sprite) {
    icon = (
      <div
        style={{
          width: dim,
          height: dim,
          ...spritePos(badge.sprite.col, badge.sprite.row),
          filter: owned ? undefined : "grayscale(1)",
          opacity: owned ? 1 : 0.35,
        }}
        title={withLabel ? undefined : `${badge.name} — ${badge.desc}`}
      />
    );
  } else if (owned && badge.iconUrl) {
    icon = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={badge.iconUrl}
        alt={badge.name}
        width={size}
        height={size}
        style={{ width: dim, height: dim }}
        title={withLabel ? undefined : `${badge.name} — ${badge.desc}`}
      />
    );
  } else {
    const tone = TONE_CLASSES[badge.tone];
    const fontSize = Math.max(10, Math.floor(size * 0.4));
    icon = (
      <div
        className={`rounded-full grid place-items-center border-[3px] ${tone.ring} ${
          owned ? tone.bg : "bg-zinc-800"
        } ${owned ? tone.text : "text-zinc-600"} font-pixel transition`}
        style={{
          width: dim,
          height: dim,
          fontSize,
          filter: owned ? undefined : "grayscale(0.6)",
          opacity: owned ? 1 : 0.5,
        }}
        title={withLabel ? undefined : `${badge.name} — ${badge.desc}`}
      >
        {badge.letter}
      </div>
    );
  }

  if (!withLabel) {
    return <span className={className}>{icon}</span>;
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className ?? ""}`}
      style={{ width: dim + 16 }}
    >
      {icon}
      <div
        className={`font-pixel text-[10px] text-center leading-tight ${
          owned ? "text-zinc-200" : "text-zinc-600"
        }`}
        style={{ width: size + 16 }}
      >
        {badge.name}
      </div>
    </div>
  );
}
