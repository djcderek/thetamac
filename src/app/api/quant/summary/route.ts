import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { QUANT_LESSON_IDS } from "@/lib/quant/lessons";
import { quantContinue } from "@/lib/quant/continue";
import { mockRating } from "@/lib/quant/mock";

export const dynamic = "force-dynamic";

/**
 * The quant course at a glance, for the dashboard: where to pick it up, lessons mastered and
 * the last mock. `started` is false until the player has done anything in it.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const quantIds = [...QUANT_LESSON_IDS];
    const [attempt, reads, progress, mock] = await Promise.all([
      db.quantAttempt.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { lessonId: true, createdAt: true } }),
      db.quantRead.findMany({ where: { userId }, select: { lessonId: true, readAt: true } }),
      db.lessonProgress.findMany({ where: { userId, lessonId: { in: quantIds } }, select: { lessonId: true, lastPlayedAt: true, masteredAt: true } }),
      db.quantMock.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { score: true, createdAt: true } }),
    ]);

    const activity = [
      ...(attempt ? [{ lessonId: attempt.lessonId, at: attempt.createdAt }] : []),
      ...reads.map((r) => ({ lessonId: r.lessonId, at: r.readAt })),
      ...progress.map((p) => ({ lessonId: p.lessonId, at: p.lastPlayedAt })),
    ];
    const mastered = new Set(progress.filter((p) => p.masteredAt).map((p) => p.lessonId));
    const next = quantContinue(activity, new Set(reads.map((r) => r.lessonId)), mastered);

    return NextResponse.json({
      started: activity.length > 0 || mock !== null,
      next,
      mastered: mastered.size,
      total: quantIds.length,
      lastMock: mock ? { score: mock.score, rating: mockRating(mock.score).label, at: mock.createdAt } : null,
    });
  } catch (error) {
    console.error("Error loading quant summary:", error);
    return NextResponse.json({ error: "Failed to load quant summary" }, { status: 500 });
  }
}
