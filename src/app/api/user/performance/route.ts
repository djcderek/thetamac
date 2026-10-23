import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  dayKey,
  lastMonthKeys,
  monthKey,
  monthName,
  monthStartDay,
  queryStartFor,
  weekdayName,
} from "@/lib/local-days";
import { localDayNumber, resolveTimeZone } from "@/lib/streak";
import { checkPremiumAccess } from "@/lib/subscription";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "@/lib/training-settings";


export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "weekly";

    // The free dashboard uses the weekly view; longer ranges belong to Pro analytics.
    if (range === "monthly" || range === "yearly") {
      const { isPremium } = await checkPremiumAccess(userId);
      if (!isPremium) {
        return NextResponse.json(
          { error: "Premium subscription required." },
          { status: 402 }
        );
      }
    }

    // Buckets follow the player's calendar, not UTC or the server's time zone.
    const timeZone = resolveTimeZone(searchParams.get("tz"));
    const today = localDayNumber(new Date(), timeZone);
    const months = lastMonthKeys(today, 12);
    const firstDay =
      range === "yearly" ? monthStartDay(months[0]) : range === "monthly" ? today - 27 : today - 6;
    const startDate = queryStartFor(firstDay);

    // Find training sessions that match default timed mode settings
    const matchingSessions = await db.trainingSession.findMany({
      where: {
        userId,
        gameMode: DEFAULT_TIMED_TRAINING_SETTINGS.gameMode,
        difficulty: DEFAULT_TIMED_TRAINING_SETTINGS.difficulty,
        operations: {
          hasEvery: [...DEFAULT_TIMED_TRAINING_SETTINGS.operations],
        },
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        id: true,
      },
    });

    const sessionIds = matchingSessions.map((s) => s.id);

    // Fetch problem attempts for matching sessions
    const attempts = await db.problemAttempt.findMany({
      where: {
        userId,
        sessionId: {
          in: sessionIds,
        },
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        isCorrect: true,
        timeTaken: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const days = attempts.map((attempt) => ({ ...attempt, day: localDayNumber(attempt.createdAt, timeZone) }));
    if (range === "yearly") {
      return handleYearlyData(days, months);
    } else if (range === "monthly") {
      return handleMonthlyData(days, firstDay);
    } else {
      return handleWeeklyData(days, firstDay);
    }
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance data" },
      { status: 500 }
    );
  }
}

interface Attempt {
  isCorrect: boolean;
  timeTaken: number;
  /** The player's local day number (see localDayNumber). */
  day: number;
}

function handleWeeklyData(allAttempts: Attempt[], firstDay: number) {
  // The query starts a day early to cover every time zone; drop what falls before the week.
  const attempts = allAttempts.filter((attempt) => attempt.day >= firstDay);
  const performanceByDay = Array.from({ length: 7 }, () => ({ correct: 0, total: 0, totalTime: 0 }));

  // Aggregate attempts by day
  for (const attempt of attempts) {
    const data = performanceByDay[attempt.day - firstDay];
    if (data) {
      data.total++;
      data.totalTime += attempt.timeTaken;
      if (attempt.isCorrect) {
        data.correct++;
      }
    }
  }

  // Convert to array format for chart
  const performanceData = performanceByDay.map((data, index) => {
    const dateStr = dayKey(firstDay + index);
    const dayName = weekdayName(firstDay + index);
    const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : null;
    const avgSpeed = data.total > 0 ? Math.round((data.totalTime / data.total) * 10) / 10 : null;
    
    return {
      day: dayName,
      date: dateStr,
      correct: data.correct,
      total: data.total,
      accuracy,
      speed: avgSpeed,
    };
  });

  // Calculate summary stats
  const totalCorrect = performanceData.reduce((sum, d) => sum + d.correct, 0);
  const totalProblems = performanceData.reduce((sum, d) => sum + d.total, 0);
  const daysWithData = performanceData.filter((d) => d.correct > 0);
  const avgCorrect = daysWithData.length > 0 ? Math.round(totalCorrect / daysWithData.length) : 0;
  const avgAccuracy = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0;
  const totalTime = attempts.reduce((sum, a) => sum + a.timeTaken, 0);
  const avgSpeed = attempts.length > 0 ? Math.round((totalTime / attempts.length) * 10) / 10 : 0;
  const peakDay = performanceData.reduce((max, d) => (d.correct > max.correct ? d : max));

  // Calculate improvement (compare first half to second half)
  const midpoint = Math.floor(performanceData.length / 2);
  const firstHalfCorrect = performanceData.slice(0, midpoint).reduce((sum, d) => sum + d.correct, 0);
  const secondHalfCorrect = performanceData.slice(midpoint).reduce((sum, d) => sum + d.correct, 0);
  // No activity in the first half means there is no baseline to compare against; reporting
  // +100% made every new player's first day look like a breakthrough.
  const improvement = firstHalfCorrect > 0
    ? Math.round(((secondHalfCorrect - firstHalfCorrect) / firstHalfCorrect) * 100)
    : null;

  return NextResponse.json({
    data: performanceData,
    summary: {
      totalCorrect,
      totalProblems,
      average: avgCorrect,
      avgAccuracy,
      avgSpeed,
      improvement,
      peak: peakDay.correct > 0 ? { correct: peakDay.correct, day: peakDay.day } : null,
      totalAttempts: attempts.length,
    },
  });
}

function handleMonthlyData(allAttempts: Attempt[], firstDay: number) {
  const attempts = allAttempts.filter((attempt) => attempt.day >= firstDay);
  const performanceByWeek: Record<string, { correct: number; total: number; totalTime: number }> = {};

  // Initialize 4 weeks
  for (let i = 0; i < 4; i++) {
    const weekKey = `Week ${i + 1}`;
    performanceByWeek[weekKey] = { correct: 0, total: 0, totalTime: 0 };
  }

  // Aggregate attempts by week
  for (const attempt of attempts) {
    const daysSinceStart = attempt.day - firstDay;
    const weekIndex = Math.min(Math.floor(daysSinceStart / 7), 3);
    const weekKey = `Week ${weekIndex + 1}`;
    
    if (performanceByWeek[weekKey]) {
      performanceByWeek[weekKey].total++;
      performanceByWeek[weekKey].totalTime += attempt.timeTaken;
      if (attempt.isCorrect) {
        performanceByWeek[weekKey].correct++;
      }
    }
  }

  // Convert to array format for chart
  const performanceData = Object.entries(performanceByWeek).map(([week, data]) => {
    const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : null;
    const avgSpeed = data.total > 0 ? Math.round((data.totalTime / data.total) * 10) / 10 : null;
    
    return {
      week,
      correct: data.correct,
      total: data.total,
      accuracy,
      speed: avgSpeed,
    };
  });

  // Calculate summary stats
  const totalCorrect = performanceData.reduce((sum, d) => sum + d.correct, 0);
  const totalProblems = performanceData.reduce((sum, d) => sum + d.total, 0);
  const avgAccuracy = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0;
  const totalTime = attempts.reduce((sum, a) => sum + a.timeTaken, 0);
  const avgSpeed = attempts.length > 0 ? Math.round((totalTime / attempts.length) * 10) / 10 : 0;

  return NextResponse.json({
    data: performanceData,
    summary: {
      totalCorrect,
      totalProblems,
      avgAccuracy,
      avgSpeed,
      totalAttempts: attempts.length,
    },
  });
}

function handleYearlyData(allAttempts: Attempt[], months: string[]) {
  const attempts = allAttempts.filter((attempt) => attempt.day >= monthStartDay(months[0]));
  const performanceByMonth: Record<string, { correct: number; total: number }> = Object.fromEntries(
    months.map((key) => [key, { correct: 0, total: 0 }]),
  );

  // Aggregate attempts by month
  for (const attempt of attempts) {
    const data = performanceByMonth[monthKey(attempt.day)];
    if (data) {
      data.total++;
      if (attempt.isCorrect) {
        data.correct++;
      }
    }
  }

  // Convert to array format for chart
  const performanceData = Object.entries(performanceByMonth).map(([key, data]) => {
    const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : null;
    
    return {
      month: monthName(key),
      monthKey: key,
      correct: data.correct,
      total: data.total,
      accuracy,
    };
  });

  // Calculate summary stats
  const totalCorrect = performanceData.reduce((sum, d) => sum + d.correct, 0);
  const totalProblems = performanceData.reduce((sum, d) => sum + d.total, 0);
  const avgAccuracy = totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0;

  return NextResponse.json({
    data: performanceData,
    summary: {
      totalCorrect,
      totalProblems,
      avgAccuracy,
      totalAttempts: attempts.length,
    },
  });
}


