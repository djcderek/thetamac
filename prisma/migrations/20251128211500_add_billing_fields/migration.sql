-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "username" TEXT,
    "image" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "subscriptionPlan" "SubscriptionPlan",
    "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
    "premiumSince" TIMESTAMP(3),
    "isPremium" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoAdvance" BOOLEAN NOT NULL DEFAULT true,
    "defaultDifficulty" TEXT NOT NULL DEFAULT 'Medium',
    "defaultTimer" TEXT NOT NULL DEFAULT '10s',
    "theme" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "user_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalProblems" INTEGER NOT NULL DEFAULT 0,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalTimePlayed" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "additionStats" JSONB NOT NULL DEFAULT '{"total": 0, "correct": 0, "avgTime": 0}',
    "subtractionStats" JSONB NOT NULL DEFAULT '{"total": 0, "correct": 0, "avgTime": 0}',
    "multiplicationStats" JSONB NOT NULL DEFAULT '{"total": 0, "correct": 0, "avgTime": 0}',
    "divisionStats" JSONB NOT NULL DEFAULT '{"total": 0, "correct": 0, "avgTime": 0}',
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameMode" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "operations" TEXT[],
    "totalProblems" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problem_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "operandA" INTEGER NOT NULL,
    "operandB" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "userAnswer" INTEGER,
    "isCorrect" BOOLEAN NOT NULL,
    "timeTaken" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problem_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "image" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "totalProblems" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multiplayer_matches" (
    "id" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "player1Score" INTEGER NOT NULL DEFAULT 0,
    "player2Score" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "isDraw" BOOLEAN NOT NULL DEFAULT false,
    "player1RatingBefore" INTEGER NOT NULL,
    "player2RatingBefore" INTEGER NOT NULL,
    "player1RatingChange" INTEGER NOT NULL DEFAULT 0,
    "player2RatingChange" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL DEFAULT 10,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "forfeitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "multiplayer_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_rounds" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "operandA" INTEGER NOT NULL,
    "operandB" INTEGER NOT NULL,
    "operation" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "player1Answer" INTEGER,
    "player2Answer" INTEGER,
    "player1TimeMs" INTEGER,
    "player2TimeMs" INTEGER,
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_userId_key" ON "user_settings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_userId_key" ON "user_stats"("userId");

-- CreateIndex
CREATE INDEX "problem_attempts_userId_operation_idx" ON "problem_attempts"("userId", "operation");

-- CreateIndex
CREATE INDEX "problem_attempts_userId_createdAt_idx" ON "problem_attempts"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_userId_key" ON "leaderboard"("userId");

-- CreateIndex
CREATE INDEX "leaderboard_rating_idx" ON "leaderboard"("rating" DESC);

-- CreateIndex
CREATE INDEX "leaderboard_rank_idx" ON "leaderboard"("rank");

-- CreateIndex
CREATE INDEX "multiplayer_matches_player1Id_idx" ON "multiplayer_matches"("player1Id");

-- CreateIndex
CREATE INDEX "multiplayer_matches_player2Id_idx" ON "multiplayer_matches"("player2Id");

-- CreateIndex
CREATE INDEX "multiplayer_matches_createdAt_idx" ON "multiplayer_matches"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "match_rounds_matchId_idx" ON "match_rounds"("matchId");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_attempts" ADD CONSTRAINT "problem_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "problem_attempts" ADD CONSTRAINT "problem_attempts_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "multiplayer_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
