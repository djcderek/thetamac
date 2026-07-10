import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { accountDeletionRatelimit, checkRateLimit } from "@/lib/rate-limit";

function isMissingStripeResource(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "resource_missing"
  );
}

async function cancelStripeSubscriptions({
  customerId,
  subscriptionId,
}: {
  customerId: string | null;
  subscriptionId: string | null;
}) {
  if (!customerId && !subscriptionId) return;

  const stripe = getStripeClient();
  const subscriptionIds = new Set<string>();

  if (subscriptionId) {
    subscriptionIds.add(subscriptionId);
  }

  if (customerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });

      for (const subscription of subscriptions.data) {
        if (
          subscription.status !== "canceled" &&
          subscription.status !== "incomplete_expired"
        ) {
          subscriptionIds.add(subscription.id);
        }
      }
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
    }
  }

  for (const id of subscriptionIds) {
    try {
      await stripe.subscriptions.cancel(id);
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
    }
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const email = session?.user?.email;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (body?.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: 'Type "DELETE" to confirm account deletion.' },
        { status: 400 }
      );
    }

    const rateLimit = await checkRateLimit(accountDeletionRatelimit, email);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many deletion attempts. Please try again later." },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    await cancelStripeSubscriptions({
      customerId: user.stripeCustomerId,
      subscriptionId: user.stripeSubscriptionId,
    });

    const races = await db.racePlayer.findMany({
      where: { userId: user.id },
      select: { raceId: true },
    });
    const raceIds = [...new Set(races.map((race) => race.raceId))];

    await db.$transaction([
      db.featureRequest.deleteMany({
        where: {
          OR: [{ userId: user.id }, { email }],
        },
      }),
      db.leaderboardEntry.deleteMany({ where: { userId: user.id } }),
      db.multiplayerMatch.deleteMany({
        where: {
          OR: [{ player1Id: user.id }, { player2Id: user.id }],
        },
      }),
      ...(raceIds.length > 0
        ? [db.raceMatch.deleteMany({ where: { id: { in: raceIds } } })]
        : []),
      db.user.delete({ where: { id: user.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion failed", error);
    return NextResponse.json(
      {
        error:
          "We could not delete your account safely. No account data was removed. Please try again or contact support.",
      },
      { status: 500 }
    );
  }
}
