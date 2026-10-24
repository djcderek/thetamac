import { db } from "@/lib/db";
import { buildMockPlan, missedLessonIds, type MockPlan } from "./plan";

/**
 * The plan from a player's latest mock, with what they've got right since. A newer mock
 * replaces it. The mock's own answers to those lessons were misses, so they never count.
 */
export async function loadMockPlan(userId: string): Promise<MockPlan | null> {
  const mock = await db.quantMock.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, score: true, createdAt: true, questions: true },
  });
  if (!mock) return null;
  const missed = missedLessonIds(mock.questions);
  if (missed.length === 0) return null;
  const [reads, rights] = await Promise.all([
    db.quantRead.findMany({ where: { userId, lessonId: { in: missed } }, select: { lessonId: true } }),
    db.quantAttempt.groupBy({
      by: ["lessonId"],
      where: { userId, lessonId: { in: missed }, correct: true, createdAt: { gte: mock.createdAt } },
      _count: { _all: true },
    }),
  ]);
  return buildMockPlan(
    mock,
    new Map(rights.map((r) => [r.lessonId, r._count._all])),
    new Set(reads.map((r) => r.lessonId)),
  );
}
