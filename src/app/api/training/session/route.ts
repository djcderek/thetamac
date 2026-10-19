import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { completeTrainingSession } from "@/lib/training-session-completion";
import {
  trainingSessionResultSchema,
  trainingSessionStartSchema,
} from "@/lib/training-session-results";

// POST - Start a new training session
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const parsed = trainingSessionStartSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid session settings" },
        { status: 400 }
      );
    }

    const { gameMode, difficulty, operations, timeLimitSeconds, customRanges } = parsed.data;

    // Create new training session
    const trainingSession = await db.trainingSession.create({
      data: {
        userId,
        gameMode,
        difficulty,
        operations,
        timeLimitSeconds: gameMode === "timed" ? timeLimitSeconds : null,
        customRanges: customRanges ?? false,
      },
    });

    return NextResponse.json({
      sessionId: trainingSession.id,
      message: "Session started",
    });
  } catch (error) {
    console.error("Error starting training session:", error);
    return NextResponse.json(
      { error: "Failed to start session" },
      { status: 500 }
    );
  }
}

// PATCH - End a training session and update user stats
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const parsed = trainingSessionResultSchema.safeParse(await request.json().catch(() => null));

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid session results" },
        { status: 400 }
      );
    }

    const result = await completeTrainingSession(db, userId, parsed.data);
    if (result.status !== 200) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      message: "Session completed",
      session: result.session,
    });
  } catch (error) {
    console.error("Error ending training session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}




