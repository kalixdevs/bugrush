const DROPS = 90;
const GLITCHES = 6;

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Bias toward the center: maps uniform [0,1) to a left% with higher density
// in the middle third by mixing two distributions.
function biasedLeft(u: number): number {
  // Triangle distribution centred on 0.5, blended 70/30 with uniform.
  const tri = (u < 0.5 ? Math.sqrt(2 * u) : 2 - Math.sqrt(2 * (1 - u))) / 2;
  const blend = 0.7 * tri + 0.3 * u;
  return blend * 100;
}

export default function CodeRain() {
  return (
    <div className="rain" aria-hidden="true">
      {Array.from({ length: DROPS }, (_, i) => {
        const left = biasedLeft(pseudoRandom(i + 1));
        const duration = 0.6 + pseudoRandom(i * 3 + 7) * 0.8; // 0.6–1.4s
        const delay = -pseudoRandom(i * 5 + 13) * 3;
        const length = 12 + Math.floor(pseudoRandom(i * 7 + 17) * 14); // 12–26px
        const opacity = 0.18 + pseudoRandom(i * 11 + 19) * 0.25;     // 0.18–0.43
        return (
          <span
            key={`d${i}`}
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
      {Array.from({ length: GLITCHES }, (_, i) => {
        const left = biasedLeft(pseudoRandom(i * 13 + 101));
        const duration = 4 + pseudoRandom(i * 17 + 103) * 6; // 4–10s
        const delay = -pseudoRandom(i * 19 + 107) * 8;
        const length = 60 + Math.floor(pseudoRandom(i * 23 + 109) * 80); // 60–140px
        return (
          <span
            key={`g${i}`}
            className="rain__glitch"
            style={{
              left: `${left}%`,
              height: `${length}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
