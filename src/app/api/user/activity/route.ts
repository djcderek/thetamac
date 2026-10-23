import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayKey, queryStartFor, weekdayName } from "@/lib/local-days";
import { localDayNumber, resolveTimeZone } from "@/lib/streak";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const timeZone = resolveTimeZone(new URL(request.url).searchParams.get("tz"));

    // The last 7 days on the player's calendar, ending today.
    const firstDay = localDayNumber(new Date(), timeZone) - 6;

    const attempts = await db.problemAttempt.findMany({
      where: {
        userId,
        createdAt: {
          gte: queryStartFor(firstDay),
        },
      },
      select: {
        createdAt: true,
      },
    });

    const counts = new Array<number>(7).fill(0);
    for (const attempt of attempts) {
      const index = localDayNumber(attempt.createdAt, timeZone) - firstDay;
      if (index >= 0 && index < 7) counts[index]++;
    }

    const activityData = counts.map((problems, index) => {
      const day = firstDay + index;
      return {
        // One letter: the chart is narrow.
        day: weekdayName(day).charAt(0),
        date: dayKey(day),
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
