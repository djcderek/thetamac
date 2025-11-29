import { SubscriptionPlan } from "@prisma/client";
import { db } from "./db";
import { auth } from "./auth";

const PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);

export function isPremiumStatus(status?: string | null) {
  if (!status) return false;
  return PREMIUM_STATUSES.has(status);
}

export function userHasPremiumAccess(user?: {
  isPremium?: boolean | null;
  subscriptionStatus?: string | null;
}) {
  if (!user) return false;
  return Boolean(user.isPremium || isPremiumStatus(user.subscriptionStatus));
}

/**
 * Server-side check for premium access.
 * Always queries the database directly - no caching.
 * Use this for authoritative premium checks in server components and API routes.
 */
export async function checkPremiumAccess(userId?: string | null): Promise<{
  isPremium: boolean;
  subscriptionStatus: string | null;
  subscriptionPlan: SubscriptionPlan | null;
  subscriptionCurrentPeriodEnd: Date | null;
}> {
  if (!userId) {
    return {
      isPremium: false,
      subscriptionStatus: null,
      subscriptionPlan: null,
      subscriptionCurrentPeriodEnd: null,
    };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      subscriptionStatus: true,
      subscriptionPlan: true,
      subscriptionCurrentPeriodEnd: true,
    },
  });

  if (!user) {
    return {
      isPremium: false,
      subscriptionStatus: null,
      subscriptionPlan: null,
      subscriptionCurrentPeriodEnd: null,
    };
  }

  const hasPremium = user.isPremium || isPremiumStatus(user.subscriptionStatus);

  return {
    isPremium: hasPremium,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd,
  };
}

/**
 * Convenience function that gets the current user's premium status.
 * Combines auth() and database check in one call.
 */
export async function getCurrentUserPremiumStatus() {
  const session = await auth();
  if (!session?.user?.id) {
    return { userId: null, ...await checkPremiumAccess(null) };
  }
  
  const premiumStatus = await checkPremiumAccess(session.user.id);
  return { userId: session.user.id, user: session.user, ...premiumStatus };
}

export function normalizePlan(
  plan?: string | null
): SubscriptionPlan | null {
  if (!plan) return null;
  const normalized = plan.toLowerCase();
  if (normalized === "monthly") return SubscriptionPlan.MONTHLY;
  if (normalized === "yearly") return SubscriptionPlan.YEARLY;
  return null;
}

interface SubscriptionUpdateInput {
  userId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  status?: string | null;
  plan?: string | null;
  currentPeriodEnd?: number | null;
}

export async function updateUserSubscription({
  userId,
  customerId,
  subscriptionId,
  status,
  plan,
  currentPeriodEnd,
}: SubscriptionUpdateInput) {
  if (!userId) return null;

  const planValue = normalizePlan(plan);
  const shouldBePremium = status ? isPremiumStatus(status) : false;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { premiumSince: true },
  });

  return db.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscriptionId ?? undefined,
      subscriptionStatus: status ?? undefined,
      subscriptionPlan: planValue ?? undefined,
      subscriptionCurrentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : undefined,
      isPremium: status ? shouldBePremium : undefined,
      premiumSince: shouldBePremium
        ? user?.premiumSince ?? new Date()
        : shouldBePremium === false
        ? null
        : undefined,
    },
  });
}

