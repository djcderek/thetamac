-- Add persistent "free trial used" flag to prevent granting multiple trials per user.
ALTER TABLE "users"
ADD COLUMN "proTrialUsed" BOOLEAN NOT NULL DEFAULT FALSE;


