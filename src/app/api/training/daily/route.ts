import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPremiumAccess } from "@/lib/subscription";
import { trainingRatelimit, checkRateLimit } from "@/lib/rate-limit";
import { localDayNumber, resolveTimeZone } from "@/lib/streak";
import { REVIEW_LOOKBACK_DAYS } from "@/lib/review-schedule";
import { isLessonId } from "@/lib/lessons";
import { buildQuantReview } from "@/lib/quant/review";
import {
  DAILY_SIZE,
  buildDailyPlan,
  dailyBaseline,
  dailyStreak,
  dailyTrend,
  lastSevenDays,
} from "@/lib/daily-session";

export const dynamic = "force-dynamic";

// Enough history for a heavy player's lookback window, as in the review.
// Sessions drawn on the dashboard's speed chart.
const HISTORY_SHOWN = 14;
const MAX_ATTEMPTS = 20000;
const MAX_QUANT_ATTEMPTS = 5000;

async function loadDays(userId: string) {
  return db.dailySession.findMany({
    where: { userId },
    select: { day: true, averageSeconds: true },
    orderBy: { day: "asc" },
  });
}

/**
 * Today's session. Pro gets the problems; free accounts get what it would hold, for the
 * upgrade prompt. Both get the streak and the last week.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const timeZone = resolveTimeZone(new URL(request.url).searchParams.get("tz"));
    const now = new Date();
    const today = localDayNumber(now, timeZone);

    const since = new Date(now.getTime() - REVIEW_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const [{ isPremium }, attempts, lessons, days, quantRows] = await Promise.all([
      checkPremiumAccess(userId),
      db.problemAttempt.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: MAX_ATTEMPTS,
        select: { operandA: true, operandB: true, operation: true, isCorrect: true, timeTaken: true, createdAt: true },
      }),
      db.lessonProgress.findMany({ where: { userId, masteredAt: { not: null } }, select: { lessonId: true } }),
      loadDays(userId),
      db.quantAttempt.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: MAX_QUANT_ATTEMPTS,
        select: { lessonId: true, family: true, correct: true, createdAt: true },
      }),
    ]);

    const plan = buildDailyPlan({
      attempts,
      mastered: lessons.map((row) => row.lessonId).filter(isLessonId),
      day: today,
      now,
    });
    const dayNumbers = days.map((row) => row.day);

    return NextResponse.json({
      locked: !isPremium,
      doneToday: dayNumbers.includes(today),
      streak: dailyStreak(dayNumbers, today),
      week: lastSevenDays(dayNumbers, today),
      counts: {
        review: plan.filter((item) => item.section === "review").length,
        lesson: plan.filter((item) => item.section === "lesson").length,
        weak: plan.filter((item) => item.section === "weak").length,
      },
      items: isPremium ? plan : [],
      // Quant question types due in review, which Today points to (they run on /quant/review).
      quantDue: buildQuantReview(quantRows, now).due.length,
      // Recent sessions' average time, oldest first, and the latest against the first days.
      history: days
        .filter((row) => row.averageSeconds !== null)
        .slice(-HISTORY_SHOWN)
        .map((row) => ({ day: row.day, averageSeconds: row.averageSeconds! })),
      trend: dailyTrend(days),
    });
  } catch (error) {
    console.error("Error building daily session:", error);
    return NextResponse.json({ error: "Failed to load today's session" }, { status: 500 });
  }
}

const resultSchema = z
  .object({
    timeZone: z.string().max(64).optional(),
    problems: z.number().int().min(1).max(DAILY_SIZE),
    firstTry: z.number().int().min(0),
    averageSeconds: z.number().positive().max(600).nullable(),
  })
  .refine((result) => result.firstTry <= result.problems);

/** Marks today's session done (the first finish of the day counts) and returns the streak. */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rateLimit = await checkRateLimit(trainingRatelimit, userId);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: rateLimit.headers },
      );
    }

    const parsed = resultSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid session result" }, { status: 400 });
    }
    if (!(await checkPremiumAccess(userId)).isPremium) {
      return NextResponse.json({ error: "The daily session is part of Pro" }, { status: 402 });
    }

    const { timeZone, problems, firstTry, averageSeconds } = parsed.data;
    const today = localDayNumber(new Date(), resolveTimeZone(timeZone));
    await db.dailySession.upsert({
      where: { userId_day: { userId, day: today } },
      create: { userId, day: today, problems, firstTry, averageSeconds },
      update: {},
    });

    const days = await loadDays(userId);
    const dayNumbers = days.map((row) => row.day);
    return NextResponse.json({
      streak: dailyStreak(dayNumbers, today),
      week: lastSevenDays(dayNumbers, today),
      baselineSeconds: dailyBaseline(days, today),
    });
  } catch (error) {
    console.error("Error saving daily session:", error);
    return NextResponse.json({ error: "Failed to save today's session" }, { status: 500 });
  }
}
