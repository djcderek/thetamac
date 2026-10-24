-- CreateTable
CREATE TABLE "quant_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "seconds" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quant_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quant_attempts_userId_createdAt_idx" ON "quant_attempts"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "quant_attempts" ADD CONSTRAINT "quant_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
