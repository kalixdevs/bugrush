-- Match: add finishedAt index for sort.
CREATE INDEX "match_finishedAt_idx" ON "match"("finishedAt");

-- Tournament
CREATE TABLE "tournament" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'single_elim',
  "difficulty" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "roundSeconds" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "winnerUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tournament_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tournament_status_createdAt_idx" ON "tournament"("status", "createdAt");

-- TournamentSlot
CREATE TABLE "tournament_slot" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "seed" INTEGER NOT NULL,
  "userId" TEXT,
  CONSTRAINT "tournament_slot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tournament_slot_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tournament_slot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "tournament_slot_tournamentId_seed_key" ON "tournament_slot"("tournamentId", "seed");

-- BracketMatch
CREATE TABLE "bracket_match" (
  "id" TEXT NOT NULL,
  "tournamentId" TEXT NOT NULL,
  "matchId" TEXT,
  "round" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "player1Id" TEXT,
  "player2Id" TEXT,
  "winnerUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bracket_match_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bracket_match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bracket_match_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "match"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "bracket_match_matchId_key" ON "bracket_match"("matchId");
CREATE UNIQUE INDEX "bracket_match_tournamentId_round_position_key" ON "bracket_match"("tournamentId", "round", "position");
