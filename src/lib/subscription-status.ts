const PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isPremiumStatus(status?: string | null) {
  if (!status) return false;
  return PREMIUM_STATUSES.has(status);
}

export function userHasPremiumAccess(
  user?:
    | {
        isPremium?: boolean | null;
        subscriptionStatus?: string | null;
      }
    | null
) {
  if (!user) return false;
  return Boolean(user.isPremium || isPremiumStatus(user.subscriptionStatus));
}

// Subscriptions that must be resolved in the billing portal rather than with a new checkout.
const STATUSES_NEEDING_ATTENTION = new Set(["unpaid", "incomplete", "paused"]);

export function subscriptionNeedsAttention(status?: string | null) {
  return Boolean(status && STATUSES_NEEDING_ATTENTION.has(status));
}

export function isTrialEligible(
  user?:
    | {
        proTrialUsed?: boolean | null;
        proSignupCreditGranted?: boolean | null;
        stripeSubscriptionId?: string | null;
        subscriptionStatus?: string | null;
      }
    | null
) {
  // Signed-out visitors would sign up as a new account, which gets a trial.
  if (!user) return true;
  return !(
    user.proTrialUsed ||
    user.proSignupCreditGranted ||
    user.stripeSubscriptionId ||
    user.subscriptionStatus
  );
}

export type SubscriptionSyncDecision = "apply" | "ignore" | "find-replacement";

/**
 * Decides how a subscription from a Stripe webhook should affect the user's stored
 * subscription. Only the user's current subscription, or a live one, may change it.
 */
export function decideSubscriptionSync({
  currentSubscriptionId,
  incomingSubscriptionId,
  incomingStatus,
}: {
  currentSubscriptionId: string | null;
  incomingSubscriptionId: string;
  incomingStatus: string;
}): SubscriptionSyncDecision {
  const incomingIsLive = isPremiumStatus(incomingStatus);
  const isCurrent = !currentSubscriptionId || currentSubscriptionId === incomingSubscriptionId;

  if (isCurrent) {
    // The current subscription ended: another live one may still be billing the customer.
    return incomingIsLive ? "apply" : "find-replacement";
  }
  // A different subscription only takes over when it is live; an older one ending is ignored.
  return incomingIsLive ? "apply" : "ignore";
}
