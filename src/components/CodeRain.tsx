const DROPS = 60;

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export default function CodeRain() {
  return (
    <div className="rain" aria-hidden="true">
      {Array.from({ length: DROPS }, (_, i) => {
        const left = pseudoRandom(i + 1) * 100;
        const duration = 0.6 + pseudoRandom(i * 3 + 7) * 0.8; // 0.6–1.4s
        const delay = -pseudoRandom(i * 5 + 13) * 3;
        const length = 12 + Math.floor(pseudoRandom(i * 7 + 17) * 14); // 12–26px
        const opacity = 0.18 + pseudoRandom(i * 11 + 19) * 0.25;     // 0.18–0.43
        return (
          <span
            key={i}
            className="rain__drop"
            style={{
              left: `${left}%`,
              height: `${length}px`,
              opacity,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
