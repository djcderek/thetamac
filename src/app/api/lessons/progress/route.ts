import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPremiumAccess } from "@/lib/subscription";
import { trainingRatelimit, checkRateLimit } from "@/lib/rate-limit";
import { LESSON_IDS, LESSON_SOLO, getLesson, isFreeLesson, mergeLessonProgress } from "@/lib/lessons";

export const dynamic = "force-dynamic";

/** Each lesson's saved progress, and whether the Pro lessons are open. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const [{ isPremium }, rows] = await Promise.all([
      checkPremiumAccess(userId),
      db.lessonProgress.findMany({ where: { userId } }),
    ]);
    return NextResponse.json({
      locked: !isPremium,
      progress: Object.fromEntries(
        rows.map((row) => [
          row.lessonId,
          {
            plays: row.plays,
            bestFirstTry: row.bestFirstTry,
            bestAverageSeconds: row.bestAverageSeconds,
            mastered: row.masteredAt !== null,
          },
        ]),
      ),
    });
  } catch (error) {
    console.error("Error loading lesson progress:", error);
    return NextResponse.json({ error: "Failed to load lessons" }, { status: 500 });
  }
}

const resultSchema = z
  .object({
    lessonId: z.enum(LESSON_IDS),
    // Only a finished lesson is saved: every solo problem was answered.
    soloCount: z.literal(LESSON_SOLO),
    soloFirstTry: z.number().int().min(0).max(LESSON_SOLO),
    soloAverageSeconds: z.number().positive().max(600).nullable(),
  })
  .refine((result) => (result.soloFirstTry === 0) === (result.soloAverageSeconds === null));

/** Saves a finished lesson: the best run so far, and mastery once it's reached. */
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
      return NextResponse.json({ error: "Invalid lesson result" }, { status: 400 });
    }
    const result = parsed.data;
    const lesson = getLesson(result.lessonId)!;

    if (!isFreeLesson(lesson.id) && !(await checkPremiumAccess(userId)).isPremium) {
      return NextResponse.json({ error: "This lesson is part of Pro" }, { status: 402 });
    }

    const where = { userId_lessonId: { userId, lessonId: lesson.id } };
    const saved = await db.lessonProgress.findUnique({ where });
    const next = mergeLessonProgress(lesson, saved, result, new Date());
    await db.lessonProgress.upsert({
      where,
      create: { userId, lessonId: lesson.id, ...next, lastPlayedAt: new Date() },
      update: { ...next, lastPlayedAt: new Date() },
    });

    return NextResponse.json({
      mastered: next.masteredAt !== null,
      newlyMastered: next.masteredAt !== null && !saved?.masteredAt,
      bestFirstTry: next.bestFirstTry,
      bestAverageSeconds: next.bestAverageSeconds,
    });
  } catch (error) {
    console.error("Error saving lesson progress:", error);
    return NextResponse.json({ error: "Failed to save lesson" }, { status: 500 });
  }
}
