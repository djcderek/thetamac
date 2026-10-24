-- CreateTable
CREATE TABLE "quant_reads" (
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quant_reads_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "quant_mocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "seconds" INTEGER NOT NULL,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quant_mocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quant_mocks_userId_createdAt_idx" ON "quant_mocks"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "quant_reads" ADD CONSTRAINT "quant_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quant_mocks" ADD CONSTRAINT "quant_mocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

