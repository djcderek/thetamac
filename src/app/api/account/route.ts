import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createDeletedUserId, DELETED_PLAYER_NAME } from "@/lib/deleted-user";
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
}): Promise<number> {
  if (!customerId && !subscriptionId) return 0;

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

  let canceled = 0;
  for (const id of subscriptionIds) {
    try {
      await stripe.subscriptions.cancel(id);
      canceled++;
    } catch (error) {
      if (!isMissingStripeResource(error)) throw error;
    }
  }
  return canceled;
}

export async function DELETE(request: Request) {
  let subscriptionCanceled = false;
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

    // Stripe is canceled first on purpose: if the account were deleted first and the
    // cancellation then failed, the user would keep being billed with no account left.
    const canceledCount = await cancelStripeSubscriptions({
      customerId: user.stripeCustomerId,
      subscriptionId: user.stripeSubscriptionId,
    });
    subscriptionCanceled = canceledCount > 0;

    // Matches and races are shared with other players, so they are kept and the deleted
    // user's ID is replaced with a tombstone instead of deleting opponents' history.
    const tombstoneId = createDeletedUserId();

    await db.$transaction([
      db.featureRequest.deleteMany({
        where: {
          OR: [{ userId: user.id }, { email }],
        },
      }),
      db.leaderboardEntry.deleteMany({ where: { userId: user.id } }),
      db.multiplayerMatch.updateMany({
        where: { player1Id: user.id },
        data: { player1Id: tombstoneId },
      }),
      db.multiplayerMatch.updateMany({
        where: { player2Id: user.id },
        data: { player2Id: tombstoneId },
      }),
      db.multiplayerMatch.updateMany({
        where: { winnerId: user.id },
        data: { winnerId: tombstoneId },
      }),
      db.multiplayerMatch.updateMany({
        where: { forfeitedBy: user.id },
        data: { forfeitedBy: tombstoneId },
      }),
      db.matchRound.updateMany({
        where: { winnerId: user.id },
        data: { winnerId: tombstoneId },
      }),
      db.racePlayer.updateMany({
        where: { userId: user.id },
        data: { userId: tombstoneId, username: DELETED_PLAYER_NAME },
      }),
      db.raceEvent.updateMany({
        where: { playerId: user.id },
        data: { playerId: tombstoneId },
      }),
      db.user.delete({ where: { id: user.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion failed", error);
    return NextResponse.json(
      {
        error: subscriptionCanceled
          ? "Your subscription was canceled, but we could not finish deleting your account. No account data was removed. Please try again or contact support."
          : "We could not delete your account safely. No account data was removed. Please try again or contact support.",
      },
      { status: 500 }
    );
  }
}
