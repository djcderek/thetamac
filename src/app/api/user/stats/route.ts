import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDisplayedStreak, resolveTimeZone } from "@/lib/streak";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get or create user stats
    let userStats = await db.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) {
      userStats = await db.userStats.create({
        data: { userId },
      });
    }

    // Parse operation stats - handle both string and object formats
    const parseStats = (stats: unknown): { total: number; correct: number; avgTime: number } => {
      if (typeof stats === 'string') {
        return JSON.parse(stats);
      }
      return stats as { total: number; correct: number; avgTime: number };
    };

    const additionStats = parseStats(userStats.additionStats);
    const subtractionStats = parseStats(userStats.subtractionStats);
    const multiplicationStats = parseStats(userStats.multiplicationStats);
    const divisionStats = parseStats(userStats.divisionStats);

    // Calculate totals from per-operation stats (most accurate, updated per-attempt)
    const totalAttempts =
      additionStats.total +
      subtractionStats.total +
      multiplicationStats.total +
      divisionStats.total;

    const totalCorrectFromOps =
      additionStats.correct +
      subtractionStats.correct +
      multiplicationStats.correct +
      divisionStats.correct;

    // Calculate accuracy from per-operation stats
    const accuracy =
      totalAttempts > 0
        ? (totalCorrectFromOps / totalAttempts) * 100
        : 0;

    // Calculate average time across all operations (weighted average)
    const weightedAvgTime =
      totalAttempts > 0
        ? (additionStats.avgTime * additionStats.total +
            subtractionStats.avgTime * subtractionStats.total +
            multiplicationStats.avgTime * multiplicationStats.total +
            divisionStats.avgTime * divisionStats.total) /
          totalAttempts
        : 0;

    // Calculate skill accuracies
    const skills = [
      {
        name: "Addition",
        value: additionStats.total > 0 ? Math.round((additionStats.correct / additionStats.total) * 100) : 0,
        total: additionStats.total,
      },
      {
        name: "Subtraction",
        value: subtractionStats.total > 0 ? Math.round((subtractionStats.correct / subtractionStats.total) * 100) : 0,
        total: subtractionStats.total,
      },
      {
        name: "Multiplication",
        value: multiplicationStats.total > 0 ? Math.round((multiplicationStats.correct / multiplicationStats.total) * 100) : 0,
        total: multiplicationStats.total,
      },
      {
        name: "Division",
        value: divisionStats.total > 0 ? Math.round((divisionStats.correct / divisionStats.total) * 100) : 0,
        total: divisionStats.total,
      },
    ];

    // The stored streak only changes when a session completes; show it as lapsed once a
    // local day has passed without one.
    const lastSession = await db.trainingSession.findFirst({
      where: { userId, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    // Find weakest skill for suggestions
    const weakestSkill = skills
      .filter((s) => s.total > 0)
      .sort((a, b) => a.value - b.value)[0];

    return NextResponse.json({
      totalProblems: totalAttempts,
      totalCorrect: totalCorrectFromOps,
      accuracy: Math.round(accuracy * 10) / 10,
      avgTime: Math.round(weightedAvgTime * 10) / 10,
      currentStreak: getDisplayedStreak({
        currentStreak: userStats.currentStreak,
        lastCompletedAt: lastSession?.completedAt ?? null,
        now: new Date(),
        timeZone: resolveTimeZone(new URL(request.url).searchParams.get("tz")),
      }),
      longestStreak: userStats.longestStreak,
      rating: userStats.rating,
      skills,
      weakestSkill: weakestSkill || null,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

