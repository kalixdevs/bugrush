-- AlterTable
ALTER TABLE "user" ADD COLUMN "points"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "rankPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "role"       TEXT    NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "transaction" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "kind"      TEXT NOT NULL,
  "amount"    INTEGER NOT NULL,
  "reason"    TEXT NOT NULL,
  "refId"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_userId_kind_createdAt_idx"
  ON "transaction"("userId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "transaction"
  ADD CONSTRAINT "transaction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
