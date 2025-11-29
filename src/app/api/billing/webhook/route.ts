import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { updateUserSubscription } from "@/lib/subscription";
import { db } from "@/lib/db";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findUserIdByCustomer(customerId: string) {
  const user = await db.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

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
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

