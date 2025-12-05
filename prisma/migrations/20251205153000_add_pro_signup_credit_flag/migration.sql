-- Grant one-time pro signup credit tracking
ALTER TABLE "users"
ADD COLUMN "proSignupCreditGranted" BOOLEAN NOT NULL DEFAULT false;
