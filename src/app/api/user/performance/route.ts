import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Fetch problem attempts for the last 7 days
    const attempts = await db.problemAttempt.findMany({
      where: {
        userId,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        isCorrect: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by day and calculate accuracy
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const performanceByDay: Record<string, { correct: number; total: number }> = {};

    // Initialize all 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const dayKey = date.toISOString().split("T")[0];
      performanceByDay[dayKey] = { correct: 0, total: 0 };
    }

    // Aggregate attempts by day
    for (const attempt of attempts) {
      const dayKey = attempt.createdAt.toISOString().split("T")[0];
      if (performanceByDay[dayKey]) {
        performanceByDay[dayKey].total++;
        if (attempt.isCorrect) {
          performanceByDay[dayKey].correct++;
        }
      }
    }

    // Convert to array format for chart
    const performanceData = Object.entries(performanceByDay).map(([dateStr, data]) => {
      const date = new Date(dateStr);
      const dayName = dayNames[date.getDay()];
      const score = data.total > 0 ? Math.round((data.correct / data.total) * 100) : null;
      
      return {
        day: dayName,
        date: dateStr,
        score,
        total: data.total,
        correct: data.correct,
      };
    });

    // Calculate averages (only for days with data)
    const daysWithData = performanceData.filter((d) => d.score !== null);
    const avgScore =
      daysWithData.length > 0
        ? Math.round(daysWithData.reduce((sum, d) => sum + (d.score || 0), 0) / daysWithData.length)
        : 0;
    const peakDay = daysWithData.length > 0
      ? daysWithData.reduce((max, d) => ((d.score || 0) > (max.score || 0) ? d : max))
      : null;

    return NextResponse.json({
      data: performanceData,
      summary: {
        average: avgScore,
        peak: peakDay ? { score: peakDay.score, day: peakDay.day } : null,
        totalAttempts: attempts.length,
      },
    });
  } catch (error) {
    console.error("Error fetching performance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance data" },
      { status: 500 }
    );
  }
}


