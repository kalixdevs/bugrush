import { prisma } from "./db";

export const COSMETIC_CATEGORIES = ["frame", "title", "name_effect"] as const;
export type CosmeticCategory = (typeof COSMETIC_CATEGORIES)[number];

export type Rarity = "common" | "rare" | "epic" | "legendary";

export const RARITY_TONE: Record<Rarity, { border: string; text: string; label: string }> = {
  common:    { border: "border-zinc-600",   text: "text-zinc-300",   label: "COMMON" },
  rare:      { border: "border-sky-500",    text: "text-sky-300",    label: "RARE" },
  epic:      { border: "border-fuchsia-500",text: "text-fuchsia-300",label: "EPIC" },
  legendary: { border: "border-amber-400",  text: "text-amber-300",  label: "LEGENDARY" },
};

export type CosmeticView = {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  rarity: Rarity;
  priceCoins: number | null;
  assetUrl: string | null;
  cssClass: string | null;
  textValue: string | null;
};

export type EquippedSet = {
  frame: CosmeticView | null;
  title: CosmeticView | null;
  nameEffect: CosmeticView | null;
};

const EMPTY: EquippedSet = { frame: null, title: null, nameEffect: null };

export async function getEquippedForUsers(
  userIds: string[],
): Promise<Map<string, EquippedSet>> {
  const result = new Map<string, EquippedSet>();
  for (const id of userIds) result.set(id, { ...EMPTY });
  if (userIds.length === 0) return result;

  const rows = await prisma.equippedCosmetic.findMany({
    where: { userId: { in: userIds }, cosmeticId: { not: null } },
    include: { },
  });
  const cosmeticIds = rows.map((r) => r.cosmeticId).filter(Boolean) as string[];
  if (cosmeticIds.length === 0) return result;

  const cosmetics = await prisma.cosmetic.findMany({
    where: { id: { in: cosmeticIds } },
  });
  const cosmeticMap = new Map(cosmetics.map((c) => [c.id, c]));

  for (const r of rows) {
    if (!r.cosmeticId) continue;
    const c = cosmeticMap.get(r.cosmeticId);
    if (!c) continue;
    const view: CosmeticView = {
      id: c.id,
      category: c.category as CosmeticCategory,
      name: c.name,
      description: c.description,
      rarity: c.rarity as Rarity,
      priceCoins: c.priceCoins,
      assetUrl: c.assetUrl,
      cssClass: c.cssClass,
      textValue: c.textValue,
    };
    const slot = result.get(r.userId)!;
    if (r.category === "frame")        slot.frame = view;
    else if (r.category === "title")    slot.title = view;
    else if (r.category === "name_effect") slot.nameEffect = view;
  }
  return result;
}

export async function getEquippedForUser(userId: string): Promise<EquippedSet> {
  const map = await getEquippedForUsers([userId]);
  return map.get(userId) ?? { ...EMPTY };
}

export async function getShowcaseBadgesForUsers(
  userIds: string[],
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (userIds.length === 0) return out;
  const rows = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, showcaseBadgeId: true },
  });
  for (const r of rows) out.set(r.id, r.showcaseBadgeId ?? null);
  return out;
}
