CREATE TABLE "match" (
  "id"           TEXT NOT NULL,
  "hostId"       TEXT NOT NULL,
  "mode"         TEXT NOT NULL,
  "privacy"      TEXT NOT NULL,
  "difficulty"   TEXT NOT NULL,
  "language"     TEXT NOT NULL,
  "roundSeconds" INTEGER NOT NULL,
  "status"       TEXT NOT NULL,
  "challengeId"  TEXT,
  "startedAt"    TIMESTAMP(3),
  "finishedAt"   TIMESTAMP(3),
  "winnerTeam"   INTEGER,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "match_status_createdAt_idx" ON "match"("status", "createdAt");
ALTER TABLE "match"
  ADD CONSTRAINT "match_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "match_participant" (
  "id"            TEXT NOT NULL,
  "matchId"       TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "team"          INTEGER NOT NULL,
  "ready"         BOOLEAN NOT NULL DEFAULT false,
  "score"         INTEGER NOT NULL DEFAULT 0,
  "solveTimeMs"   INTEGER,
  "submittedCode" TEXT,
  "joinedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_participant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "match_participant_matchId_userId_key"
  ON "match_participant"("matchId", "userId");
CREATE INDEX "match_participant_matchId_idx" ON "match_participant"("matchId");
ALTER TABLE "match_participant"
  ADD CONSTRAINT "match_participant_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "match"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "match_participant"
  ADD CONSTRAINT "match_participant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
