-- CreateTable
CREATE TABLE "daily_attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_attempt_dayKey_score_idx" ON "daily_attempt"("dayKey", "score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_attempt_userId_dayKey_key" ON "daily_attempt"("userId", "dayKey");

-- AddForeignKey
ALTER TABLE "daily_attempt" ADD CONSTRAINT "daily_attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
