import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { isPremiumStatus, updateUserSubscription } from "@/lib/subscription";
import { db } from "@/lib/db";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { getPostHogClient } from "@/lib/posthog-server";

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
    return;
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

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: userId,
      event: "subscription_activated",
      properties: {
        plan: subscription.metadata?.plan ?? null,
        status: subscription.status,
        is_trial: Boolean(subscription.trial_start || subscription.trial_end),
      },
    });
    await posthog.flush();
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
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
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

