import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Start a new training session
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { gameMode, difficulty, operations } = body;

    // Validate input
    if (!gameMode || !difficulty || !operations || operations.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create new training session
    const trainingSession = await db.trainingSession.create({
      data: {
        userId,
        gameMode,
        difficulty,
        operations,
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
    const body = await request.json();
    const { sessionId, totalProblems, correctAnswers, duration, averageTime, bestStreak } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    // Update the training session
    const trainingSession = await db.trainingSession.update({
      where: { id: sessionId, userId },
      data: {
        totalProblems,
        correctAnswers,
        duration,
        averageTime,
        bestStreak,
        completedAt: new Date(),
      },
    });

    // Update user stats
    const userStats = await db.userStats.findUnique({
      where: { userId },
    });

    if (userStats) {
      // Calculate new streak
      const lastSession = await db.trainingSession.findFirst({
        where: {
          userId,
          completedAt: { not: null },
          id: { not: sessionId },
        },
        orderBy: { completedAt: "desc" },
      });

      let newCurrentStreak = userStats.currentStreak;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (lastSession?.completedAt) {
        const lastSessionDate = new Date(lastSession.completedAt);
        lastSessionDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
          // Same day, keep streak
          newCurrentStreak = userStats.currentStreak;
        } else if (daysDiff === 1) {
          // Next day, increment streak
          newCurrentStreak = userStats.currentStreak + 1;
        } else {
          // More than a day gap, reset streak
          newCurrentStreak = 1;
        }
      } else {
        // First session ever
        newCurrentStreak = 1;
      }

      const newLongestStreak = Math.max(userStats.longestStreak, newCurrentStreak);

      await db.userStats.update({
        where: { userId },
        data: {
          totalProblems: userStats.totalProblems + totalProblems,
          totalCorrect: userStats.totalCorrect + correctAnswers,
          totalTimePlayed: userStats.totalTimePlayed + duration,
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
        },
      });
    }

    return NextResponse.json({
      message: "Session completed",
      session: trainingSession,
    });
  } catch (error) {
    console.error("Error ending training session:", error);
    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}




