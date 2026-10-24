import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPremiumAccess } from "@/lib/subscription";
import { trainingRatelimit, checkRateLimit } from "@/lib/rate-limit";
import { LESSON_IDS, LESSON_SOLO, getLesson, isFreeLesson, isLessonMastered, mergeLessonProgress } from "@/lib/lessons";
import {
  QUANT_LESSON_IDS,
  QUANT_SOLO,
  getQuantLesson,
  isFreeQuantLesson,
  isQuantLessonMastered,
} from "@/lib/quant/lessons";

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
    // Arithmetic lessons (Learning) and quant lessons share the progress table; their IDs differ.
    lessonId: z.enum([...LESSON_IDS, ...QUANT_LESSON_IDS]),
    soloCount: z.number().int(),
    soloFirstTry: z.number().int().min(0),
    soloAverageSeconds: z.number().positive().max(600).nullable(),
  })
  .refine((result) => (result.soloFirstTry === 0) === (result.soloAverageSeconds === null))
  // Only a finished lesson is saved: every solo problem was answered.
  .refine((result) => {
    const solo = getQuantLesson(result.lessonId) ? QUANT_SOLO : LESSON_SOLO;
    return result.soloCount === solo && result.soloFirstTry <= solo;
  });

/** The lesson's free/Pro status and mastery rule, whichever kind it is. */
function lessonRules(lessonId: string) {
  const quant = getQuantLesson(lessonId);
  if (quant) {
    return { free: isFreeQuantLesson(quant.id), mastered: (r: z.infer<typeof resultSchema>) => isQuantLessonMastered(quant, r) };
  }
  const lesson = getLesson(lessonId)!;
  return { free: isFreeLesson(lesson.id), mastered: (r: z.infer<typeof resultSchema>) => isLessonMastered(lesson, r) };
}

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
    const rules = lessonRules(result.lessonId);

    if (!rules.free && !(await checkPremiumAccess(userId)).isPremium) {
      return NextResponse.json({ error: "This lesson is part of Pro" }, { status: 402 });
    }

    const where = { userId_lessonId: { userId, lessonId: result.lessonId } };
    const saved = await db.lessonProgress.findUnique({ where });
    const next = mergeLessonProgress(saved, result, rules.mastered(result), new Date());
    await db.lessonProgress.upsert({
      where,
      create: { userId, lessonId: result.lessonId, ...next, lastPlayedAt: new Date() },
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
