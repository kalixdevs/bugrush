type Props = {
  /** Mono eyebrow text, e.g. "// pvp" or "> 2026-05-23". */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  /** Optional action slot, rendered to the right of the title (left align only). */
  right?: React.ReactNode;
};

/** Consistent page header used across all content pages. */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  right,
}: Props) {
  const centered = align === "center";

  const heading = (
    <div className={centered ? "text-center" : undefined}>
      {eyebrow && (
        <div className="font-mono text-xs text-indigo-400">{eyebrow}</div>
      )}
      <h1 className="font-pixel text-2xl sm:text-3xl mt-2">{title}</h1>
      {subtitle && (
        <p className="text-sm text-zinc-400 mt-3">{subtitle}</p>
      )}
    </div>
  );

  if (right && !centered) {
    return (
      <div className="flex flex-wrap items-end justify-between gap-4">
        {heading}
        <div className="flex-shrink-0">{right}</div>
      </div>
    );
  }

  return heading;
}
