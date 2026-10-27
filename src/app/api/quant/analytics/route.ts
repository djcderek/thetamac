import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { QUANT_LESSONS, QUANT_LESSON_IDS, QUANT_TOPICS } from "@/lib/quant/lessons";
import { MOCK_RATINGS, mockRating } from "@/lib/quant/mock";
import { checkPremiumAccess } from "@/lib/subscription";

export const dynamic = "force-dynamic";

/** Mocks sent for the dashboard chart, newest kept. */
const MOCK_HISTORY = 20;

/**
 * The quant course in numbers, for the Pro dashboard: lessons mastered and read, questions
 * answered and how many were right first time (in practice, drills, review and Shuffle), the
 * same split by unit, and the mock scores over time.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { isPremium } = await checkPremiumAccess(userId);
    if (!isPremium) {
      return NextResponse.json({ error: "Quant analytics are part of Pro", locked: true }, { status: 403 });
    }

    const quantIds = [...QUANT_LESSON_IDS];
    const [all, right, mastered, read, mocks, mockStats] = await Promise.all([
      db.quantAttempt.groupBy({ by: ["lessonId"], where: { userId }, _count: { _all: true } }),
      db.quantAttempt.groupBy({ by: ["lessonId"], where: { userId, correct: true }, _count: { _all: true } }),
      db.lessonProgress.count({ where: { userId, lessonId: { in: quantIds }, masteredAt: { not: null } } }),
      db.quantRead.count({ where: { userId, lessonId: { in: quantIds } } }),
      db.quantMock.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: MOCK_HISTORY, select: { score: true, createdAt: true } }),
      db.quantMock.aggregate({ where: { userId }, _count: { _all: true }, _max: { score: true } }),
    ]);

    const topicOf = new Map<string, string>(QUANT_LESSONS.map((lesson) => [lesson.id, lesson.topic]));
    const units = QUANT_TOPICS.map((topic) => ({ id: topic.id, number: topic.number, title: topic.title, right: 0, total: 0 }));
    const unitOf = (lessonId: string) => units.find((unit) => unit.id === topicOf.get(lessonId));
    for (const row of all) {
      const unit = unitOf(row.lessonId);
      if (unit) unit.total += row._count._all;
    }
    for (const row of right) {
      const unit = unitOf(row.lessonId);
      if (unit) unit.right += row._count._all;
    }
    const answered = units.reduce((sum, unit) => sum + unit.total, 0);
    const firstTry = units.reduce((sum, unit) => sum + unit.right, 0);
    // Oldest to newest, for the chart.
    const history = mocks.reverse().map((mock) => ({ score: mock.score, at: mock.createdAt }));
    const latest = history[history.length - 1] ?? null;

    return NextResponse.json({
      mastered,
      read,
      total: quantIds.length,
      answered,
      firstTry,
      units,
      mocks: {
        count: mockStats._count._all,
        history,
        latest: latest && { score: latest.score, rating: mockRating(latest.score).label },
        best: mockStats._max.score,
        pass: MOCK_RATINGS.find((rating) => rating.label === "Pass")!.min,
      },
    });
  } catch (error) {
    console.error("Error loading quant analytics:", error);
    return NextResponse.json({ error: "Failed to load quant analytics" }, { status: 500 });
  }
}
