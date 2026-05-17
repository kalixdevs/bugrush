-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "pointsMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rankPointsMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "exclusiveDrops" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_startsAt_endsAt_idx" ON "event"("startsAt", "endsAt");
