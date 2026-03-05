-- AlterTable
ALTER TABLE "guest_training_scores" ADD COLUMN     "identityVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "guest_training_scores_identityVerified_createdAt_idx" ON "guest_training_scores"("identityVerified", "createdAt");
