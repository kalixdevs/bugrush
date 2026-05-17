import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Seed = {
  id: string;
  category: "frame" | "title" | "name_effect";
  name: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  priceCoins: number | null;
  assetUrl?: string;
  cssClass?: string;
  textValue?: string;
};

const CATALOG: Seed[] = [
  // Frames
  { id: "frame-emerald", category: "frame", name: "Emerald Ring", description: "Classic emerald outline.",
    rarity: "common", priceCoins: 200, assetUrl: "/cosmetics/frames/frame-emerald.svg" },
  { id: "frame-amber",   category: "frame", name: "Amber Ring",   description: "Warm amber outline.",
    rarity: "common", priceCoins: 200, assetUrl: "/cosmetics/frames/frame-amber.svg" },
  { id: "frame-fuchsia", category: "frame", name: "Fuchsia Ring", description: "Loud fuchsia with corner dots.",
    rarity: "rare", priceCoins: 500, assetUrl: "/cosmetics/frames/frame-fuchsia.svg" },
  { id: "frame-rainbow", category: "frame", name: "Rainbow Ring", description: "The legend ring.",
    rarity: "legendary", priceCoins: 3000, assetUrl: "/cosmetics/frames/frame-rainbow.svg" },

  // Titles
  { id: "title-intern",              category: "title", name: "Intern",              description: "Where we all started.",
    rarity: "common", priceCoins: 100, textValue: "INTERN" },
  { id: "title-grinder",             category: "title", name: "Grinder",             description: "For those who don't stop.",
    rarity: "common", priceCoins: 200, textValue: "GRINDER" },
  { id: "title-bug-whisperer",       category: "title", name: "Bug Whisperer",       description: "They tell you where the bug is hiding.",
    rarity: "rare", priceCoins: 500, textValue: "BUG WHISPERER" },
  { id: "title-wordle-of-code",      category: "title", name: "Wordle of Code",      description: "Daily streak diehard.",
    rarity: "rare", priceCoins: 500, textValue: "WORDLE OF CODE" },
  { id: "title-programming-master",  category: "title", name: "Programming Master",  description: "It just compiles.",
    rarity: "epic", priceCoins: 1200, textValue: "PROGRAMMING MASTER" },
  { id: "title-hardcore-god",        category: "title", name: "Hardcore God",        description: "No mistakes. Ever.",
    rarity: "legendary", priceCoins: 3000, textValue: "HARDCORE GOD" },

  // Name effects
  { id: "name-glow-emerald", category: "name_effect", name: "Emerald Glow", description: "Soft phosphor glow.",
    rarity: "rare", priceCoins: 500, cssClass: "name-glow-emerald" },
  { id: "name-glow-fuchsia", category: "name_effect", name: "Fuchsia Glow", description: "Loud and proud.",
    rarity: "rare", priceCoins: 500, cssClass: "name-glow-fuchsia" },
  { id: "name-glitch",       category: "name_effect", name: "Glitch",       description: "Channel-mismatch effect.",
    rarity: "epic", priceCoins: 1200, cssClass: "name-glitch" },
  { id: "name-rainbow",      category: "name_effect", name: "Rainbow",      description: "A gradient name. Hard to miss.",
    rarity: "legendary", priceCoins: 3000, cssClass: "name-rainbow" },
];

async function main() {
  for (const item of CATALOG) {
    await prisma.cosmetic.upsert({
      where: { id: item.id },
      update: {
        category: item.category,
        name: item.name,
        description: item.description,
        rarity: item.rarity,
        priceCoins: item.priceCoins,
        assetUrl: item.assetUrl ?? null,
        cssClass: item.cssClass ?? null,
        textValue: item.textValue ?? null,
        enabled: true,
      },
      create: {
        id: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        rarity: item.rarity,
        priceCoins: item.priceCoins,
        assetUrl: item.assetUrl,
        cssClass: item.cssClass,
        textValue: item.textValue,
      },
    });
  }
  console.log(`Seeded ${CATALOG.length} cosmetics.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
