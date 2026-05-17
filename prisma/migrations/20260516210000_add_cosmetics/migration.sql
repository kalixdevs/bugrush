-- CreateTable
CREATE TABLE "cosmetic" (
  "id"          TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "rarity"      TEXT NOT NULL,
  "priceCoins"  INTEGER,
  "assetUrl"    TEXT,
  "cssClass"    TEXT,
  "textValue"   TEXT,
  "enabled"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cosmetic" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "cosmeticId"  TEXT NOT NULL,
  "acquiredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acquiredVia" TEXT NOT NULL,

  CONSTRAINT "user_cosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_cosmetic_userId_cosmeticId_key"
  ON "user_cosmetic"("userId", "cosmeticId");
CREATE INDEX "user_cosmetic_userId_idx" ON "user_cosmetic"("userId");

-- CreateTable
CREATE TABLE "equipped_cosmetic" (
  "userId"     TEXT NOT NULL,
  "category"   TEXT NOT NULL,
  "cosmeticId" TEXT,

  CONSTRAINT "equipped_cosmetic_pkey" PRIMARY KEY ("userId", "category")
);

-- AddForeignKey
ALTER TABLE "user_cosmetic"
  ADD CONSTRAINT "user_cosmetic_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_cosmetic"
  ADD CONSTRAINT "user_cosmetic_cosmeticId_fkey"
  FOREIGN KEY ("cosmeticId") REFERENCES "cosmetic"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "equipped_cosmetic"
  ADD CONSTRAINT "equipped_cosmetic_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
