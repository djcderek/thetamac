-- CreateTable
CREATE TABLE "feature_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feature_requests_userId_idx" ON "feature_requests"("userId");

-- CreateIndex
CREATE INDEX "feature_requests_createdAt_idx" ON "feature_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
