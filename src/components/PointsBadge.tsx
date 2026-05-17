"use client";

import { useState } from "react";

type Props = {
  value: number;
  size?: number;
};

export default function PointsBadge({ value, size = 20 }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const dim = `${size}px`;
  return (
    <span className="flex items-center gap-2">
      {imgFailed ? (
        <span
          className="inline-block bg-amber-400 border-2 border-zinc-950 text-zinc-950 grid place-items-center font-pixel text-[9px]"
          style={{ width: dim, height: dim }}
        >
          P
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/points-icon.svg"
          alt="points"
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
          style={{ width: dim, height: dim }}
        />
      )}
      <span className="text-amber-400 tabular-nums">{value}</span>
    </span>
  );
}
