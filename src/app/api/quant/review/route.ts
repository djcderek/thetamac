import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPremiumAccess } from "@/lib/subscription";
import { REVIEW_LOOKBACK_DAYS } from "@/lib/review-schedule";
import { QUANT_REVIEW_MAX, buildQuantReview, quantFamilyTitle } from "@/lib/quant/review";

export const dynamic = "force-dynamic";

// Enough history for a heavy player's lookback window, as in arithmetic review.
const MAX_ATTEMPTS = 5000;

/**
 * Quant question types due for review. Pro gets the types to run; free accounts get the counts
 * and one example, for the upgrade prompt.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const since = new Date(Date.now() - REVIEW_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const [{ isPremium }, rows] = await Promise.all([
      checkPremiumAccess(userId),
      db.quantAttempt.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: MAX_ATTEMPTS,
        select: { lessonId: true, family: true, correct: true, createdAt: true },
      }),
    ]);

    const { due, waiting } = buildQuantReview(rows, new Date());
    const describe = (entry: (typeof due)[number]) => ({
      lessonId: entry.item.lessonId,
      family: entry.item.family,
      title: quantFamilyTitle(entry.item.lessonId, entry.item.family),
      misses: entry.misses,
    });

    return NextResponse.json({
      locked: !isPremium,
      dueCount: due.length,
      waitingCount: waiting.length,
      nextDueAt: waiting[0]?.dueAt.toISOString() ?? null,
      due: isPremium ? due.slice(0, QUANT_REVIEW_MAX).map(describe) : [],
      example: !isPremium && due[0] ? describe(due[0]) : null,
    });
  } catch (error) {
    console.error("Error building quant review:", error);
    return NextResponse.json({ error: "Failed to load review" }, { status: 500 });
  }
}
