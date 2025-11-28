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
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by day
    const shortDayNames = ["S", "M", "T", "W", "T", "F", "S"];
    const activityByDay: Record<string, number> = {};

    // Initialize all 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const dayKey = date.toISOString().split("T")[0];
      activityByDay[dayKey] = 0;
    }

    // Count attempts by day
    for (const attempt of attempts) {
      const dayKey = attempt.createdAt.toISOString().split("T")[0];
      if (activityByDay[dayKey] !== undefined) {
        activityByDay[dayKey]++;
      }
    }

    // Convert to array format for chart
    const activityData = Object.entries(activityByDay).map(([dateStr, problems]) => {
      const date = new Date(dateStr);
      const dayName = shortDayNames[date.getDay()];
      
      return {
        day: dayName,
        date: dateStr,
        problems,
      };
    });

    // Calculate totals
    const totalProblems = activityData.reduce((sum, d) => sum + d.problems, 0);
    const dailyAvg = Math.round(totalProblems / 7);

    return NextResponse.json({
      data: activityData,
      summary: {
        total: totalProblems,
        dailyAverage: dailyAvg,
      },
    });
  } catch (error) {
    console.error("Error fetching activity data:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity data" },
      { status: 500 }
    );
  }
}

