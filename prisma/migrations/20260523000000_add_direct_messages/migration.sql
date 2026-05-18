-- DmThread
CREATE TABLE "dm_thread" (
  "id" TEXT NOT NULL,
  "userAId" TEXT NOT NULL,
  "userBId" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReadAtA" TIMESTAMP(3),
  "lastReadAtB" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dm_thread_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dm_thread_userAId_userBId_key" ON "dm_thread"("userAId", "userBId");
CREATE INDEX "dm_thread_userAId_lastMessageAt_idx" ON "dm_thread"("userAId", "lastMessageAt");
CREATE INDEX "dm_thread_userBId_lastMessageAt_idx" ON "dm_thread"("userBId", "lastMessageAt");

ALTER TABLE "dm_thread" ADD CONSTRAINT "dm_thread_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dm_thread" ADD CONSTRAINT "dm_thread_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DmMessage
CREATE TABLE "dm_message" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" VARCHAR(500) NOT NULL,
  "meta" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "dm_message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dm_message_threadId_createdAt_idx" ON "dm_message"("threadId", "createdAt");

ALTER TABLE "dm_message" ADD CONSTRAINT "dm_message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "dm_thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dm_message" ADD CONSTRAINT "dm_message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
