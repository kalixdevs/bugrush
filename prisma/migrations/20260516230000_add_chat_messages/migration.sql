CREATE TABLE "chat_message" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "channel"   TEXT NOT NULL,
  "kind"      TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "meta"      JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_message_channel_createdAt_idx"
  ON "chat_message"("channel", "createdAt");

ALTER TABLE "chat_message"
  ADD CONSTRAINT "chat_message_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
