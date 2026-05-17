export type Rarity = "common" | "rare" | "epic" | "legendary";

export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary"];

const PROBS: Record<Rarity, number> = {
  common: 0.70,
  rare: 0.20,
  epic: 0.08,
  legendary: 0.02,
};

export const COIN_FALLBACK: Record<Rarity, number> = {
  common: 25,
  rare: 75,
  epic: 200,
  legendary: 600,
};

export function rollRarity(rng: () => number = Math.random): Rarity {
  const r = rng();
  let acc = 0;
  for (const k of RARITY_ORDER) {
    acc += PROBS[k];
    if (r < acc) return k;
  }
  return "common";
}
