import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import {
  isTrialEligible,
  subscriptionNeedsAttention,
  userHasPremiumAccess,
} from "@/lib/subscription";
import { env } from "@/lib/env";
import { checkoutRatelimit, checkRateLimit } from "@/lib/rate-limit";
import Stripe from "stripe";
import { captureServerAnalyticsEvent } from "@/lib/posthog-server";
import { ANALYTICS_EVENTS, getAnalyticsInsertId } from "@/lib/analytics";

function normalizeReturnPath(
  baseUrl: string,
  returnUrl: unknown
): string | null {
  if (typeof returnUrl !== "string") return null;
  const trimmed = returnUrl.trim();
  if (!trimmed) return null;

  // Allow same-origin absolute URLs
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const base = new URL(baseUrl);
      if (parsed.origin !== base.origin) return null;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return null;
    }
  }

  // Allow only relative paths to prevent open redirects.
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  return trimmed;
}

/**
 * Only the newest open Checkout session may be completed, so two tabs can't both
 * start a subscription. Sessions created before `current` are expired.
 */
async function expireEarlierOpenCheckouts(
  stripe: Stripe,
  customerId: string,
  current: Stripe.Checkout.Session
) {
  try {
    const open = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      limit: 20,
    });
    const earlier = open.data.filter(
      (candidate) =>
        candidate.id !== current.id &&
        (candidate.created < current.created ||
          (candidate.created === current.created && candidate.id < current.id))
    );
    await Promise.all(
      earlier.map((candidate) => stripe.checkout.sessions.expire(candidate.id))
    );
  } catch (error) {
    // Failing to expire older sessions must not block this checkout.
    console.error("Unable to expire earlier checkout sessions", error);
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit by user ID
  const rateLimit = await checkRateLimit(checkoutRatelimit, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please try again later." },
      { status: 429, headers: rateLimit.headers }
    );
  }

  let plan: "monthly" | "yearly" = "monthly";
  let returnPath: string | null = null;

  try {
    const body = await request.json();
    if (body?.plan === "yearly") {
      plan = "yearly";
    }
    returnPath = normalizeReturnPath(env.NEXT_PUBLIC_APP_URL, body?.returnUrl);
  } catch {
    plan = "monthly";
  }

  const priceId =
    plan === "yearly" ? env.STRIPE_YEARLY_PRICE_ID : env.STRIPE_MONTHLY_PRICE_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: "Requested plan is not configured." },
      { status: 500 }
    );
  }

  const baseUrl = env.NEXT_PUBLIC_APP_URL;
  // Backwards-compatible default: older paywalls expect to return to stats.
  const resolvedReturnPath = returnPath ?? "/stats/performance";
  const returnContextUrl = new URL(resolvedReturnPath, baseUrl);
  const analyticsSource = returnContextUrl.searchParams.get("source") ?? "upgrade";
  const analyticsFeature = returnContextUrl.searchParams.get("feature") ?? undefined;

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "Add an email to your account before subscribing." },
        { status: 400 }
      );
    }

    // Check our database first
    if (userHasPremiumAccess(user)) {
      return NextResponse.json(
        { error: "You already have an active subscription." },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();

    let customerId = user.stripeCustomerId;
    let eligibleForTrial = isTrialEligible(user);

    if (!customerId) {
      // The idempotency key makes concurrent first checkouts (two tabs, double click)
      // resolve to the same Stripe customer instead of creating two.
      const customer = await stripe.customers.create(
        {
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          metadata: {
            userId: user.id,
          },
        },
        { idempotencyKey: `checkout-customer-${user.id}` }
      );

      const { count } = await db.user.updateMany({
        where: { id: user.id, stripeCustomerId: null },
        data: { stripeCustomerId: customer.id },
      });

      if (count > 0) {
        customerId = customer.id;
      } else {
        const latest = await db.user.findUnique({
          where: { id: user.id },
          select: { stripeCustomerId: true },
        });
        customerId = latest?.stripeCustomerId ?? customer.id;
      }
    } else {
      // Double-check Stripe for existing subscriptions (handles DB sync issues).
      // `status: "all"` includes canceled ones, which still count as trial history.
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
      });

      // If Stripe already has *any* subscription history for this customer, don't offer a trial.
      // This also backfills `proTrialUsed` for older users before this flag existed.
      const hasAnySubscriptionHistory = existingSubscriptions.data.length > 0;
      if (hasAnySubscriptionHistory) {
        eligibleForTrial = false;
        if (!user.proTrialUsed) {
          await db.user.update({
            where: { id: user.id },
            data: { proTrialUsed: true },
          });
        }
      }

      const activeSubscription = existingSubscriptions.data.find(
        (sub) => ["active", "trialing", "past_due"].includes(sub.status)
      );

      if (activeSubscription) {
        // Sync our database with Stripe's state
        await db.user.update({
          where: { id: user.id },
          data: {
            isPremium: true,
            stripeSubscriptionId: activeSubscription.id,
            subscriptionStatus: activeSubscription.status,
          },
        });

        return NextResponse.json(
          { error: "You already have an active subscription." },
          { status: 400 }
        );
      }

      // A subscription awaiting payment or paused must be resolved in the billing portal;
      // a new checkout would create a second subscription.
      const subscriptionNeedingAttention = existingSubscriptions.data.find((sub) =>
        subscriptionNeedsAttention(sub.status)
      );
      if (subscriptionNeedingAttention) {
        return NextResponse.json(
          {
            error:
              "Your existing subscription needs attention. Use Manage billing on the pricing page to update payment or resume it.",
            manageBilling: true,
          },
          { status: 409 }
        );
      }
    }

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData =
      {
      metadata: {
        userId: user.id,
        plan,
      },
    };

    if (eligibleForTrial) {
      subscriptionData.trial_period_days = 7;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: (() => {
        const url = new URL(resolvedReturnPath, baseUrl);
        url.searchParams.set("upgraded", "1");
        return url.toString();
      })(),
      cancel_url: (() => {
        const url = new URL(resolvedReturnPath, baseUrl);
        url.searchParams.set("cancelled", "1");
        return url.toString();
      })(),
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: subscriptionData,
      metadata: {
        userId: user.id,
        plan,
      },
    });

    await expireEarlierOpenCheckouts(stripe, customerId, checkoutSession);

    await captureServerAnalyticsEvent({
      distinctId: session.user.id,
      event: ANALYTICS_EVENTS.checkoutInitiated,
      properties: {
        plan,
        eligible_for_trial: eligibleForTrial,
        entry_source: analyticsSource,
        feature: analyticsFeature,
        price_amount_minor: plan === "yearly" ? 599 : 99,
        currency: "usd",
      },
      insertId: getAnalyticsInsertId(checkoutSession.id),
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    await captureServerAnalyticsEvent({
      distinctId: session.user.id,
      event: ANALYTICS_EVENTS.checkoutFailed,
      properties: {
        plan,
        entry_source: analyticsSource,
        feature: analyticsFeature,
        failure_stage: "session_creation",
      },
    });
    return NextResponse.json(
      { error: "Unable to start checkout session." },
      { status: 500 }
    );
  }
}
