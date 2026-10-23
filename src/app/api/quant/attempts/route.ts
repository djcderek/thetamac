import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingRatelimit, checkRateLimit } from "@/lib/rate-limit";
import { isQuantFamily } from "@/lib/quant/review";

const AttemptSchema = z.object({
  lessonId: z.string().max(64),
  family: z.string().max(96),
  correct: z.boolean(),
  seconds: z.number().min(0).max(3600).nullable().optional(),
});

/**
 * One answered quant question, for review. Saved for every signed-in player, so history is
 * there when they upgrade; reviewing it is Pro.
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

    const parsed = AttemptSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !isQuantFamily(parsed.data.lessonId, parsed.data.family)) {
      return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
    }
    const { lessonId, family, correct, seconds } = parsed.data;
    await db.quantAttempt.create({ data: { userId, lessonId, family, correct, seconds: seconds ?? null } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving quant attempt:", error);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}
