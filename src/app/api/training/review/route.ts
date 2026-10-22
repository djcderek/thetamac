import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPremiumAccess } from "@/lib/subscription";
import { REVIEW_LOOKBACK_DAYS, REVIEW_SET_MAX, buildReviewSchedule } from "@/lib/review-schedule";

export const dynamic = "force-dynamic";

// Enough history for a heavy player's lookback window; older attempts beyond it are dropped.
const MAX_ATTEMPTS = 20000;

/**
 * Past misses due for review. Pro gets the problems to run as a set; free accounts get the
 * counts and one example, for the upgrade prompt.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const since = new Date(Date.now() - REVIEW_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const [{ isPremium }, attempts] = await Promise.all([
      checkPremiumAccess(userId),
      db.problemAttempt.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: MAX_ATTEMPTS,
        select: {
          operandA: true,
          operandB: true,
          operation: true,
          isCorrect: true,
          createdAt: true,
        },
      }),
    ]);

    const now = new Date();
    const { due, waiting } = buildReviewSchedule(attempts, now);

    return NextResponse.json({
      locked: !isPremium,
      dueCount: due.length,
      waitingCount: waiting.length,
      nextDueAt: waiting[0]?.dueAt.toISOString() ?? null,
      problems: isPremium ? due.slice(0, REVIEW_SET_MAX).map((item) => item.problem) : [],
      example: !isPremium && due[0] ? { problem: due[0].problem, misses: due[0].misses } : null,
    });
  } catch (error) {
    console.error("Error building review:", error);
    return NextResponse.json({ error: "Failed to load review" }, { status: 500 });
  }
}
