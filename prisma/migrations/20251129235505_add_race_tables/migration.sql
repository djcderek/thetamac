-- CreateTable
CREATE TABLE "race_matches" (
    "id" TEXT NOT NULL,
    "trackLength" INTEGER NOT NULL DEFAULT 50,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "maxPlayers" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "race_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_players" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "ratingBefore" INTEGER NOT NULL,
    "lane" INTEGER NOT NULL DEFAULT 3,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isStunned" BOOLEAN NOT NULL DEFAULT false,
    "stunUntil" TIMESTAMP(3),
    "finishPosition" INTEGER,
    "finishTime" INTEGER,
    "ratingChange" INTEGER NOT NULL DEFAULT 0,
    "problemsSolved" INTEGER NOT NULL DEFAULT 0,
    "bumpsGiven" INTEGER NOT NULL DEFAULT 0,
    "bumpsReceived" INTEGER NOT NULL DEFAULT 0,
    "boostsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "race_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_events" (
    "id" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "operandA" INTEGER,
    "operandB" INTEGER,
    "operation" TEXT,
    "correctAnswer" INTEGER,
    "userAnswer" INTEGER,
    "timeTaken" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "race_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "race_matches_status_idx" ON "race_matches"("status");

-- CreateIndex
CREATE INDEX "race_matches_createdAt_idx" ON "race_matches"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "race_players_raceId_idx" ON "race_players"("raceId");

-- CreateIndex
CREATE INDEX "race_players_userId_idx" ON "race_players"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "race_players_raceId_userId_key" ON "race_players"("raceId", "userId");

-- CreateIndex
CREATE INDEX "race_events_raceId_idx" ON "race_events"("raceId");

-- CreateIndex
CREATE INDEX "race_events_playerId_idx" ON "race_events"("playerId");

-- AddForeignKey
ALTER TABLE "race_players" ADD CONSTRAINT "race_players_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "race_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_events" ADD CONSTRAINT "race_events_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "race_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
