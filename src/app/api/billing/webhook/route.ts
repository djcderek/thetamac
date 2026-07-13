import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { isPremiumStatus, updateUserSubscription } from "@/lib/subscription";
import { db } from "@/lib/db";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { captureServerAnalyticsEvent } from "@/lib/posthog-server";
import { ANALYTICS_EVENTS, getAnalyticsInsertId } from "@/lib/analytics";

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

async function syncSubscription(subscription: Stripe.Subscription) {
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
    },
  });

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
  if (
    isPremiumStatus(subscription.status) ||
    Boolean(subscription.trial_start || subscription.trial_end)
  ) {
    await db.user.updateMany({
      where: { id: userId, proTrialUsed: false },
      data: { proTrialUsed: true },
    });
  }

  // Grant one-time signup credits when a user becomes premium for the first time.
  if (isPremiumStatus(subscription.status)) {
    const result = await db.user.updateMany({
      where: { id: userId, proSignupCreditGranted: false },
      data: {
        coins: { increment: PRO_SIGNUP_BONUS },
        proSignupCreditGranted: true,
      },
    });

    if (result.count > 0) {
      console.info(
        `Granted ${PRO_SIGNUP_BONUS} signup credits to user`,
        userId
      );
    }

  }

  return {
    userId,
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
          const synced = await syncSubscription(subscription);
          if (synced) {
            await captureServerAnalyticsEvent({
              distinctId: synced.userId,
              event: ANALYTICS_EVENTS.checkoutCompleted,
              properties: {
                plan: synced.plan,
                status: subscription.status,
                currency: session.currency ?? subscription.currency,
                price_amount_minor: session.amount_total ?? undefined,
              },
              insertId: getAnalyticsInsertId(event.id),
            });
            await captureSubscriptionTransition(event, subscription, synced);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const synced = await syncSubscription(subscription);
        await captureSubscriptionTransition(event, subscription, synced);
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
