ALTER TABLE "user" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE TABLE "friendship" (
  "id" TEXT NOT NULL,
  "fromUserId" TEXT NOT NULL,
  "toUserId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "friendship_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "friendship_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "friendship_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "friendship_fromUserId_toUserId_key" ON "friendship"("fromUserId", "toUserId");
CREATE INDEX "friendship_toUserId_status_idx" ON "friendship"("toUserId", "status");
