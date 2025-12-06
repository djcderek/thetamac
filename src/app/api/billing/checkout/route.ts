import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { userHasPremiumAccess } from "@/lib/subscription";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let plan: "monthly" | "yearly" = "monthly";

  try {
    const body = await request.json();
    if (body?.plan === "yearly") {
      plan = "yearly";
    }
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

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: {
          userId: user.id,
        },
      });

      customerId = customer.id;

      await db.user.update({
        where: { id: user.id },
        data: {
          stripeCustomerId: customerId,
        },
      });
    } else {
      // Double-check Stripe for any active subscriptions (handles DB sync issues)
      // Check for active, trialing, and past_due statuses
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 10,
      });

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
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      success_url: `${baseUrl}/stats/performance?upgraded=1`,
      cancel_url: `${baseUrl}/stats/performance`,
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId: user.id,
          plan,
        },
      },
      metadata: {
        userId: user.id,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Unable to start checkout session." },
      { status: 500 }
    );
  }
}

