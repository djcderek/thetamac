import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trainingRatelimit, checkRateLimit } from "@/lib/rate-limit";
import { getQuantLesson } from "@/lib/quant/lessons";
import { buildQuantMarks } from "@/lib/quant/progress";

export const dynamic = "force-dynamic";

/** The lessons read, and the question types and puzzles solved or tried, on this account. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const [reads, groups] = await Promise.all([
      db.quantRead.findMany({ where: { userId }, select: { lessonId: true } }),
      // At most two rows per type (right, wrong), however many answers there are.
      db.quantAttempt.groupBy({ by: ["lessonId", "family", "correct"], where: { userId } }),
    ]);
    return NextResponse.json({ read: reads.map((r) => r.lessonId), ...buildQuantMarks(groups) });
  } catch (error) {
    console.error("Error loading quant progress:", error);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}

const ReadSchema = z.object({ lessonId: z.string().max(64) });

/** Marks a lesson as read to the end. */
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
    const parsed = ReadSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !getQuantLesson(parsed.data.lessonId)) {
      return NextResponse.json({ error: "Invalid lesson" }, { status: 400 });
    }
    const { lessonId } = parsed.data;
    await db.quantRead.upsert({ where: { userId_lessonId: { userId, lessonId } }, create: { userId, lessonId }, update: {} });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving quant read:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
