-- CreateIndex
CREATE INDEX "training_sessions_userId_createdAt_idx" ON "training_sessions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "training_sessions_completedAt_idx" ON "training_sessions"("completedAt");

