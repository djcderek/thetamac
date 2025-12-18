-- CreateTable
CREATE TABLE "guest_training_scores" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "totalProblems" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "averageTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_training_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_training_scores_guestId_idx" ON "guest_training_scores"("guestId");

-- CreateIndex
CREATE INDEX "guest_training_scores_createdAt_idx" ON "guest_training_scores"("createdAt");
