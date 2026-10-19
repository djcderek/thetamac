import type { TrainingSession } from "@prisma/client";

import type { db } from "./db";
import { getNextStreak, resolveTimeZone } from "./streak";
import { getImplausibleResultReason, type TrainingSessionResult } from "./training-session-results";

type CompletionDatabase = Pick<typeof db, "$transaction">;

type CompletionResult =
  | { status: 200; session: TrainingSession | null }
  | { status: 400 | 404 | 409; error: string };

/** Complete once and credit the run in the same transaction, so failed saves can be retried. */
export function completeTrainingSession(
  database: CompletionDatabase,
  userId: string,
  result: TrainingSessionResult
): Promise<CompletionResult> {
  return database.$transaction(async (tx): Promise<CompletionResult> => {
    const { sessionId, totalProblems, correctAnswers, duration, averageTime, bestStreak } = result;
    const existing = await tx.trainingSession.findFirst({
      where: { id: sessionId, userId },
      select: { createdAt: true, completedAt: true, gameMode: true, timeLimitSeconds: true },
    });

    if (!existing) return { status: 404, error: "Session not found" };
    if (existing.completedAt) return { status: 409, error: "Session already completed" };

    const now = new Date();
    const implausibleReason = getImplausibleResultReason(
      result,
      (now.getTime() - existing.createdAt.getTime()) / 1000,
      existing.gameMode === "timed" ? existing.timeLimitSeconds : null
    );
    if (implausibleReason) return { status: 400, error: implausibleReason };

    const { count } = await tx.trainingSession.updateMany({
      where: { id: sessionId, userId, completedAt: null },
      data: { totalProblems, correctAnswers, duration, averageTime, bestStreak, completedAt: now },
    });
    if (count === 0) return { status: 409, error: "Session already completed" };

    const trainingSession = await tx.trainingSession.findUnique({ where: { id: sessionId } });
    const userStats = await tx.userStats.findUnique({ where: { userId } });
    if (userStats) {
      const lastSession = await tx.trainingSession.findFirst({
        where: { userId, completedAt: { not: null }, id: { not: sessionId } },
        orderBy: { completedAt: "desc" },
      });
      const currentStreak = getNextStreak({
        currentStreak: userStats.currentStreak,
        lastCompletedAt: lastSession?.completedAt ?? null,
        now,
        timeZone: resolveTimeZone(result.timeZone),
      });
      await tx.userStats.update({
        where: { userId },
        data: {
          totalProblems: { increment: totalProblems },
          totalCorrect: { increment: correctAnswers },
          totalTimePlayed: { increment: duration },
          currentStreak,
          longestStreak: Math.max(userStats.longestStreak, currentStreak),
        },
      });
    }

    return { status: 200, session: trainingSession };
  });
}
