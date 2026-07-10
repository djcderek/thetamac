-- CreateTable
CREATE TABLE "daily_challenges" (
    "id" TEXT NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "theme" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "promptSet" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_challenge_attempts" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "challengeDate" VARCHAR(10) NOT NULL,
    "userId" TEXT,
    "guestId" TEXT,
    "displayName" TEXT NOT NULL,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "totalQuestions" INTEGER NOT NULL DEFAULT 8,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "resultPattern" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_challenge_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenges_date_key" ON "daily_challenges"("date");

-- CreateIndex
CREATE INDEX "daily_challenges_date_idx" ON "daily_challenges"("date");

-- CreateIndex
CREATE INDEX "daily_challenge_attempts_challengeDate_correctAnswers_durationMs_idx" ON "daily_challenge_attempts"("challengeDate", "correctAnswers", "durationMs");

-- CreateIndex
CREATE INDEX "daily_challenge_attempts_userId_challengeDate_idx" ON "daily_challenge_attempts"("userId", "challengeDate");

-- CreateIndex
CREATE INDEX "daily_challenge_attempts_guestId_challengeDate_idx" ON "daily_challenge_attempts"("guestId", "challengeDate");

-- CreateIndex
CREATE INDEX "daily_challenge_attempts_completedAt_idx" ON "daily_challenge_attempts"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenge_attempts_user_official_date_key" ON "daily_challenge_attempts"("challengeDate", "userId") WHERE "userId" IS NOT NULL AND "isOfficial" = true;

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenge_attempts_guest_official_date_key" ON "daily_challenge_attempts"("challengeDate", "guestId") WHERE "guestId" IS NOT NULL AND "isOfficial" = true;

-- AddForeignKey
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "daily_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_challenge_attempts" ADD CONSTRAINT "daily_challenge_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
