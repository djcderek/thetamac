import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Default timed training mode settings
const DEFAULT_TIMED_SETTINGS = {
  gameMode: "timed",
  difficulty: "medium",
  operations: ["+", "-", "×", "÷"],
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "weekly";

    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case "monthly":
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 27); // ~4 weeks
        startDate.setHours(0, 0, 0, 0);
        break;
      case "yearly":
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 11);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default: // weekly
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
    }

    // Find training sessions that match default timed mode settings
    const matchingSessions = await db.trainingSession.findMany({
      where: {
        userId,
        gameMode: DEFAULT_TIMED_SETTINGS.gameMode,
        difficulty: DEFAULT_TIMED_SETTINGS.difficulty,
        operations: {
          hasEvery: DEFAULT_TIMED_SETTINGS.operations,
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

    if (range === "yearly") {
      return handleYearlyData(attempts, now);
    } else if (range === "monthly") {
      return handleMonthlyData(attempts, startDate);
    } else {
      return handleWeeklyData(attempts, startDate);
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
  createdAt: Date;
}

function handleWeeklyData(attempts: Attempt[], startDate: Date) {
  const performanceByDay: Record<string, { correct: number; total: number; totalTime: number }> = {};

  // Initialize all 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayKey = date.toISOString().split("T")[0];
    performanceByDay[dayKey] = { correct: 0, total: 0, totalTime: 0 };
  }

  // Aggregate attempts by day
  for (const attempt of attempts) {
    const dayKey = attempt.createdAt.toISOString().split("T")[0];
    if (performanceByDay[dayKey]) {
      performanceByDay[dayKey].total++;
      performanceByDay[dayKey].totalTime += attempt.timeTaken;
      if (attempt.isCorrect) {
        performanceByDay[dayKey].correct++;
      }
    }
  }

  // Convert to array format for chart
  const performanceData = Object.entries(performanceByDay).map(([dateStr, data]) => {
    const date = new Date(dateStr);
    const dayName = dayNames[date.getDay()];
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
  const improvement = firstHalfCorrect > 0 
    ? Math.round(((secondHalfCorrect - firstHalfCorrect) / firstHalfCorrect) * 100) 
    : secondHalfCorrect > 0 ? 100 : 0;

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

function handleMonthlyData(attempts: Attempt[], startDate: Date) {
  const performanceByWeek: Record<string, { correct: number; total: number; totalTime: number }> = {};

  // Initialize 4 weeks
  for (let i = 0; i < 4; i++) {
    const weekKey = `Week ${i + 1}`;
    performanceByWeek[weekKey] = { correct: 0, total: 0, totalTime: 0 };
  }

  // Aggregate attempts by week
  for (const attempt of attempts) {
    const daysSinceStart = Math.floor((attempt.createdAt.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
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

function handleYearlyData(attempts: Attempt[], now: Date) {
  const performanceByMonth: Record<string, { correct: number; total: number }> = {};

  // Initialize 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    performanceByMonth[monthKey] = { correct: 0, total: 0 };
  }

  // Aggregate attempts by month
  for (const attempt of attempts) {
    const monthKey = `${attempt.createdAt.getFullYear()}-${String(attempt.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (performanceByMonth[monthKey]) {
      performanceByMonth[monthKey].total++;
      if (attempt.isCorrect) {
        performanceByMonth[monthKey].correct++;
      }
    }
  }

  // Convert to array format for chart
  const performanceData = Object.entries(performanceByMonth).map(([monthKey, data]) => {
    const [year, month] = monthKey.split("-");
    const monthName = monthNames[parseInt(month) - 1];
    const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : null;
    
    return {
      month: monthName,
      monthKey,
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



