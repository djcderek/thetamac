import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPremiumAccess } from "@/lib/subscription";
import { trainingRatelimit, checkRateLimit } from "@/lib/rate-limit";
import { MOCK_FREE, MOCK_MINUTES, isMockShape, scoreMock } from "@/lib/quant/mock";
import { mockTopics } from "@/lib/quant/mock-progress";

export const dynamic = "force-dynamic";

/** Past mocks sent: enough for the progress chart; the list shows the latest few. */
const HISTORY_SIZE = 20;

/** Past mocks, newest first, and whether another can be taken (Pro, or a free one left). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const [{ isPremium }, count, history] = await Promise.all([
      checkPremiumAccess(userId),
      db.quantMock.count({ where: { userId } }),
      db.quantMock.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: HISTORY_SIZE,
        select: { id: true, score: true, correct: true, total: true, seconds: true, createdAt: true, questions: true },
      }),
    ]);
    const freeLeft = isPremium ? null : Math.max(0, MOCK_FREE - count);
    return NextResponse.json({
      locked: !isPremium && count >= MOCK_FREE,
      pro: isPremium,
      freeLeft,
      // Each mock's right and total by unit, for the progress chart; the questions stay here.
      history: history.map(({ questions, ...mock }) => ({ ...mock, topics: mockTopics(questions) })),
    });
  } catch (error) {
    console.error("Error loading quant mocks:", error);
    return NextResponse.json({ error: "Failed to load mocks" }, { status: 500 });
  }
}

const MockSchema = z.object({
  seconds: z.number().min(0).max(MOCK_MINUTES * 60 + 30),
  questions: z
    .array(
      z.object({
        lessonId: z.string().max(64),
        family: z.string().max(96),
        correct: z.boolean(),
        seconds: z.number().min(0).max(MOCK_MINUTES * 60 + 30),
      }),
    )
    .max(20),
});

/**
 * Saves a finished mock. The score is worked out here from the questions, and each answer is
 * also saved as an attempt, so a missed type comes back in review.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const rateLimit = await checkRateLimit(trainingRatelimit, userId);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429, headers: rateLimit.headers });
    }

    const parsed = MockSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !isMockShape(parsed.data.questions)) {
      return NextResponse.json({ error: "Invalid mock" }, { status: 400 });
    }
    const result = scoreMock(parsed.data.questions);
    if (!result) {
      return NextResponse.json({ error: "Invalid mock" }, { status: 400 });
    }

    const { isPremium } = await checkPremiumAccess(userId);
    if (!isPremium && (await db.quantMock.count({ where: { userId } })) >= MOCK_FREE) {
      return NextResponse.json({ error: "Mock tests are part of Pro" }, { status: 402 });
    }

    const { questions, seconds } = parsed.data;
    const [mock] = await db.$transaction([
      db.quantMock.create({
        data: { userId, score: result.score, correct: result.correct, total: result.total, seconds: Math.round(seconds), questions },
        select: { id: true },
      }),
      db.quantAttempt.createMany({
        data: questions.map((q) => ({ userId, lessonId: q.lessonId, family: q.family, correct: q.correct, seconds: q.seconds })),
      }),
    ]);
    return NextResponse.json({ id: mock.id, score: result.score });
  } catch (error) {
    console.error("Error saving quant mock:", error);
    return NextResponse.json({ error: "Failed to save mock" }, { status: 500 });
  }
}
