import { safeImageSrc } from "@/lib/safe";

type Props = {
  src?: string | null;
  name: string;
  size?: number;
  frameSrc?: string | null;
};

const HUES = [
  "bg-indigo-500",
  "bg-fuchsia-500",
  "bg-amber-400",
  "bg-sky-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-teal-400",
  "bg-violet-500",
];

function hueFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

export default function Avatar({ src, name, size = 40, frameSrc }: Props) {
  const dim = `${size}px`;
  const safeSrc = safeImageSrc(src);
  const safeFrame = safeImageSrc(frameSrc);
  const inner = safeSrc ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={safeSrc}
      alt={name}
      width={size}
      height={size}
      className="border-2 border-zinc-700 object-cover bg-zinc-900"
      style={{ width: dim, height: dim }}
    />
  ) : (
    <div
      className={`border-2 border-zinc-700 grid place-items-center text-zinc-950 font-pixel ${hueFor(name)}`}
      style={{ width: dim, height: dim, fontSize: Math.floor(size * 0.4) }}
      aria-label={name}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </div>
  );

  if (!safeFrame) return inner;

  return (
    <div className="relative inline-block" style={{ width: dim, height: dim }}>
      {inner}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={safeFrame}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ width: dim, height: dim }}
      />
    </div>
  );
}
