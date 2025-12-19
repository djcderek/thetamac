import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "@/lib/training-settings";

const BUCKET_SIZE = 2;

function bucketize(scores: number[]) {
  if (scores.length === 0) return [];
  const countsByFrom = new Map<number, { from: number; to: number; count: number }>();
  let minFrom = Number.POSITIVE_INFINITY;
  let maxFrom = 0;
  for (const score of scores) {
    const clamped = Math.max(0, Math.floor(score));
    const from = Math.floor(clamped / BUCKET_SIZE) * BUCKET_SIZE;
    const to = from + BUCKET_SIZE - 1;
    minFrom = Math.min(minFrom, from);
    maxFrom = Math.max(maxFrom, from);
    const existing = countsByFrom.get(from) ?? { from, to, count: 0 };
    existing.count += 1;
    countsByFrom.set(from, existing);
  }

  // Emit a continuous sequence of buckets so the client can render proportional gaps.
  const buckets: { from: number; to: number; count: number }[] = [];
  for (let from = minFrom; from <= maxFrom; from += BUCKET_SIZE) {
    const to = from + BUCKET_SIZE - 1;
    buckets.push(countsByFrom.get(from) ?? { from, to, count: 0 });
  }

  return buckets;
}

export async function GET() {
  try {
    const sessions = await db.trainingSession.findMany({
      where: {
        gameMode: DEFAULT_TIMED_TRAINING_SETTINGS.gameMode,
        difficulty: DEFAULT_TIMED_TRAINING_SETTINGS.difficulty,
        operations: { hasEvery: [...DEFAULT_TIMED_TRAINING_SETTINGS.operations] },
        completedAt: { not: null },
      },
      select: {
        correctAnswers: true,
        totalProblems: true,
      },
    });

    const guestSessions = await db.guestTrainingScore.findMany({
      select: {
        correctAnswers: true,
      },
    });

    const scores: number[] = [];

    for (const session of sessions) {
      const score = session.correctAnswers ?? session.totalProblems ?? 0;
      scores.push(score);
    }

    for (const guest of guestSessions) {
      const score = guest.correctAnswers ?? 0;
      scores.push(score);
    }

    if (scores.length === 0) {
      return NextResponse.json({ buckets: [], total: 0 });
    }

    const buckets = bucketize(scores);
    return NextResponse.json({ buckets, total: scores.length });
  } catch (error) {
    console.error("Error building training score distribution:", error);
    return NextResponse.json(
      { error: "Failed to load distribution" },
      { status: 500 }
    );
  }
}
