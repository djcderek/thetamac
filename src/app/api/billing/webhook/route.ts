import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { isPremiumStatus, updateUserSubscription } from "@/lib/subscription";
import { decideSubscriptionSync } from "@/lib/subscription-status";
import { db } from "@/lib/db";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { captureServerAnalyticsEvent } from "@/lib/posthog-server";
import { ANALYTICS_EVENTS, getAnalyticsInsertId } from "@/lib/analytics";
import { getTrialUsage, recordTrialUsage } from "@/lib/trial-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findUserIdByCustomer(customerId: string) {
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

const PRO_SIGNUP_BONUS = 500;

async function findLiveSubscription(
  stripe: Stripe,
  customerId: string,
  excludeId: string
) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });
  return (
    subscriptions.data.find(
      (candidate) => candidate.id !== excludeId && isPremiumStatus(candidate.status)
    ) ?? null
  );
}

/**
 * Syncs the user from Stripe's current view of a subscription. `subscription` must be
 * freshly retrieved, not a webhook snapshot: retried or out-of-order deliveries would
 * otherwise apply stale states (e.g. an old "active" after the subscription was deleted).
 */
async function syncSubscription(stripe: Stripe, freshSubscription: Stripe.Subscription) {
  let subscription = freshSubscription;
  const customerId = subscription.customer as string;
  const userId =
    subscription.metadata?.userId ||
    (await findUserIdByCustomer(customerId));

  if (!userId) {
    console.warn(
      "Stripe webhook: unable to match subscription to user",
      subscription.id
    );
    return null;
  }

  const previousUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      subscriptionStatus: true,
      subscriptionPlan: true,
      stripeSubscriptionId: true,
    },
  });

  if (!previousUser) {
    console.warn("Stripe webhook: user no longer exists", userId, subscription.id);
    return null;
  }

  const decision = decideSubscriptionSync({
    currentSubscriptionId: previousUser.stripeSubscriptionId,
    incomingSubscriptionId: subscription.id,
    incomingStatus: subscription.status,
  });

  if (decision === "ignore") {
    console.info(
      "Stripe webhook: ignoring non-current subscription",
      subscription.id,
      subscription.status
    );
    return null;
  }

  if (decision === "find-replacement") {
    const replacement = await findLiveSubscription(stripe, customerId, subscription.id);
    if (replacement) {
      console.info(
        "Stripe webhook: current subscription ended; switching to live subscription",
        subscription.id,
        replacement.id
      );
      subscription = replacement;
    }
  } else if (
    previousUser.stripeSubscriptionId &&
    previousUser.stripeSubscriptionId !== subscription.id &&
    isPremiumStatus(previousUser.subscriptionStatus)
  ) {
    console.warn(
      "Stripe webhook: customer has more than one live subscription",
      previousUser.stripeSubscriptionId,
      subscription.id
    );
  }

  await updateUserSubscription({
    userId,
    customerId,
    subscriptionId: subscription.id,
    status: subscription.status,
    plan:
      subscription.metadata?.plan ||
      subscription.items.data[0]?.price?.nickname ||
      subscription.items.data[0]?.price?.metadata?.plan ||
      null,
    currentPeriodEnd: subscription.current_period_end,
  });

  // Mark free trial as used once a user actually enters a premium/trialing state.
  // (We keep this flag persistent even if the subscription later cancels.)
  const usedTrial =
    isPremiumStatus(subscription.status) ||
    Boolean(subscription.trial_start || subscription.trial_end);
  if (usedTrial) {
    await db.user.updateMany({
      where: { id: userId, proTrialUsed: false },
      data: { proTrialUsed: true },
    });
  }

  // Grant one-time signup credits when a user becomes premium for the first time, once per
  // person: an earlier account for the same inbox that already received them doesn't
  // get them again.
  const email = (await db.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email;
  let grantedCredit = false;
  if (isPremiumStatus(subscription.status)) {
    const alreadyCredited = Boolean((await getTrialUsage(email))?.signupCreditAt);
    const result = await db.user.updateMany({
      where: { id: userId, proSignupCreditGranted: false },
      data: {
        coins: alreadyCredited ? undefined : { increment: PRO_SIGNUP_BONUS },
        proSignupCreditGranted: true,
      },
    });
    grantedCredit = result.count > 0 && !alreadyCredited;

    if (grantedCredit) {
      console.info(
        `Granted ${PRO_SIGNUP_BONUS} signup credits to user`,
        userId
      );
    }
  }

  // Kept apart from the account, so deleting it and signing up again doesn't reset these.
  await recordTrialUsage(email, { trial: usedTrial, signupCredit: grantedCredit });

  return {
    userId,
    subscription,
    previousStatus: previousUser?.subscriptionStatus ?? null,
    previousPremium:
      Boolean(previousUser?.isPremium) ||
      isPremiumStatus(previousUser?.subscriptionStatus ?? null),
    plan:
      subscription.metadata?.plan ||
      subscription.items.data[0]?.price?.metadata?.plan ||
      previousUser?.subscriptionPlan ||
      null,
  };
}

async function captureSubscriptionTransition(
  event: Stripe.Event,
  subscription: Stripe.Subscription,
  synced: Awaited<ReturnType<typeof syncSubscription>>
) {
  if (!synced) return;

  const properties = {
    plan: synced.plan,
    previous_status: synced.previousStatus,
    status: subscription.status,
    is_trial: subscription.status === "trialing",
    currency: subscription.currency,
    price_amount_minor: subscription.items.data[0]?.price?.unit_amount ?? undefined,
  };

  if (synced.previousStatus !== subscription.status) {
    await captureServerAnalyticsEvent({
      distinctId: synced.userId,
      event: ANALYTICS_EVENTS.subscriptionStatusChanged,
      properties,
      insertId: getAnalyticsInsertId(event.id, "status"),
    });
  }

  if (subscription.status === "trialing" && synced.previousStatus !== "trialing") {
    await captureServerAnalyticsEvent({
      distinctId: synced.userId,
      event: ANALYTICS_EVENTS.trialStarted,
      properties,
      insertId: getAnalyticsInsertId(event.id, "trial"),
    });
  }

  if (isPremiumStatus(subscription.status) && !synced.previousPremium) {
    await captureServerAnalyticsEvent({
      distinctId: synced.userId,
      event: ANALYTICS_EVENTS.subscriptionActivated,
      properties,
      insertId: getAnalyticsInsertId(event.id, "activated"),
    });
  }

  if (subscription.status === "canceled" && synced.previousStatus !== "canceled") {
    await captureServerAnalyticsEvent({
      distinctId: synced.userId,
      event: ANALYTICS_EVENTS.subscriptionCancelled,
      properties,
      insertId: getAnalyticsInsertId(event.id, "cancelled"),
    });
  }

  const previousAttributes = event.data.previous_attributes as
    | { cancel_at_period_end?: boolean }
    | undefined;
  if (
    subscription.cancel_at_period_end &&
    previousAttributes?.cancel_at_period_end === false
  ) {
    await captureServerAnalyticsEvent({
      distinctId: synced.userId,
      event: ANALYTICS_EVENTS.subscriptionCancelled,
      properties: {
        ...properties,
        cancellation_effective_at_period_end: true,
      },
      insertId: getAnalyticsInsertId(event.id, "cancel_scheduled"),
    });
  }

  if (
    subscription.status === "incomplete_expired" &&
    synced.previousStatus !== "incomplete_expired"
  ) {
    await captureServerAnalyticsEvent({
      distinctId: synced.userId,
      event: ANALYTICS_EVENTS.subscriptionExpired,
      properties,
      insertId: getAnalyticsInsertId(event.id, "expired"),
    });
  }
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 400 }
    );
  }

  // Read the raw body as a Buffer to preserve exact bytes for signature verification
  const buf = await request.arrayBuffer();
  const payload = Buffer.from(buf).toString("utf8");
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed.", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = session.subscription as string | null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          const synced = await syncSubscription(stripe, subscription);
          if (synced) {
            await captureServerAnalyticsEvent({
              distinctId: synced.userId,
              event: ANALYTICS_EVENTS.checkoutCompleted,
              properties: {
                plan: synced.plan,
                status: synced.subscription.status,
                currency: session.currency ?? synced.subscription.currency,
                price_amount_minor: session.amount_total ?? undefined,
              },
              insertId: getAnalyticsInsertId(event.id),
            });
            await captureSubscriptionTransition(event, synced.subscription, synced);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const snapshot = event.data.object as Stripe.Subscription;
        const subscription = await stripe.subscriptions.retrieve(snapshot.id);
        const synced = await syncSubscription(stripe, subscription);
        if (synced) {
          await captureSubscriptionTransition(event, synced.subscription, synced);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        const userId = customerId ? await findUserIdByCustomer(customerId) : null;
        if (userId && invoice.paid && invoice.amount_paid > 0) {
          await captureServerAnalyticsEvent({
            distinctId: userId,
            event: ANALYTICS_EVENTS.subscriptionPaymentSucceeded,
            properties: {
              price_amount_minor: invoice.amount_paid,
              currency: invoice.currency,
              billing_reason: invoice.billing_reason ?? "unknown",
              paid: invoice.paid,
            },
            insertId: getAnalyticsInsertId(event.id),
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler error." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
