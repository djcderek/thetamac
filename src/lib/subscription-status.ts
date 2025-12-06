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
