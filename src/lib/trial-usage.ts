import { createHmac } from "crypto";
import { db } from "./db";
import { env } from "./env";

/**
 * The free trial and the Pro sign-up bonus are once per person. Using either is recorded
 * against a keyed hash of the normalized email, in a table that outlives the account, so
 * deleting the account and signing up again (or using an alias of the same inbox) doesn't
 * grant them again. Only the hash is kept, not the address.
 */

// Gmail ignores dots and treats both domains as one inbox.
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/** One inbox, one key: case, "+tag" suffixes and Gmail dots don't make a new person. */
export function normalizeEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;
  let local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1);
  local = local.split("+")[0];
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

export function emailKey(email: string, secret: string) {
  return createHmac("sha256", secret).update(`trial-usage:${normalizeEmail(email)}`).digest("hex");
}

export type TrialUsage = { trialUsedAt: Date | null; signupCreditAt: Date | null };

export async function getTrialUsage(email: string | null | undefined): Promise<TrialUsage | null> {
  if (!email) return null;
  return db.trialUsage.findUnique({
    where: { emailHash: emailKey(email, env.AUTH_SECRET) },
    select: { trialUsedAt: true, signupCreditAt: true },
  });
}

/** Records that this person has used the trial and/or received the sign-up bonus. */
export async function recordTrialUsage(
  email: string | null | undefined,
  used: { trial?: boolean; signupCredit?: boolean },
) {
  if (!email || (!used.trial && !used.signupCredit)) return;
  const now = new Date();
  const emailHash = emailKey(email, env.AUTH_SECRET);
  const existing = await db.trialUsage.findUnique({ where: { emailHash } });
  await db.trialUsage.upsert({
    where: { emailHash },
    create: {
      emailHash,
      trialUsedAt: used.trial ? now : null,
      signupCreditAt: used.signupCredit ? now : null,
    },
    update: {
      // The first use is the one that counts.
      trialUsedAt: used.trial ? existing?.trialUsedAt ?? now : undefined,
      signupCreditAt: used.signupCredit ? existing?.signupCreditAt ?? now : undefined,
    },
  });
}
