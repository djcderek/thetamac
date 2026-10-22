-- CreateTable
CREATE TABLE "trial_usage" (
    "emailHash" TEXT NOT NULL,
    "trialUsedAt" TIMESTAMP(3),
    "signupCreditAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trial_usage_pkey" PRIMARY KEY ("emailHash")
);

