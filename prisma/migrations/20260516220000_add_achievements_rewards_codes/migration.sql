-- Achievement
CREATE TABLE "achievement" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "badgeId"    TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "achievement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "achievement_userId_badgeId_key" ON "achievement"("userId", "badgeId");
CREATE INDEX "achievement_userId_idx" ON "achievement"("userId");
ALTER TABLE "achievement"
  ADD CONSTRAINT "achievement_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- DailyReward
CREATE TABLE "daily_reward" (
  "userId"        TEXT NOT NULL,
  "dayKey"        TEXT NOT NULL,
  "cosmeticId"    TEXT,
  "pointsAwarded" INTEGER NOT NULL,
  "rarity"        TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_reward_pkey" PRIMARY KEY ("userId", "dayKey")
);
ALTER TABLE "daily_reward"
  ADD CONSTRAINT "daily_reward_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- PromoCode
CREATE TABLE "promo_code" (
  "code"       TEXT NOT NULL,
  "rewardJson" JSONB NOT NULL,
  "maxUses"    INTEGER,
  "usedCount"  INTEGER NOT NULL DEFAULT 0,
  "expiresAt"  TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promo_code_pkey" PRIMARY KEY ("code")
);

-- PromoRedemption
CREATE TABLE "promo_redemption" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "code"       TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promo_redemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "promo_redemption_userId_code_key" ON "promo_redemption"("userId", "code");
CREATE INDEX "promo_redemption_code_idx" ON "promo_redemption"("code");
ALTER TABLE "promo_redemption"
  ADD CONSTRAINT "promo_redemption_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promo_redemption"
  ADD CONSTRAINT "promo_redemption_code_fkey"
  FOREIGN KEY ("code") REFERENCES "promo_code"("code")
  ON DELETE CASCADE ON UPDATE CASCADE;
