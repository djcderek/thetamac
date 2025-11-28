import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Map frontend operations to database format
const operationMap: Record<string, string> = {
  "+": "+",
  "-": "-",
  "×": "×",
  "÷": "÷",
};

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { sessionId, operandA, operandB, operation, correctAnswer, userAnswer, isCorrect, timeTaken } = body;

    // Validate input
    if (
      operandA === undefined ||
      operandB === undefined ||
      !operation ||
      correctAnswer === undefined ||
      isCorrect === undefined ||
      timeTaken === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create problem attempt
    const attempt = await db.problemAttempt.create({
      data: {
        userId,
        sessionId: sessionId || null,
        operandA,
        operandB,
        operation: operationMap[operation] || operation,
        correctAnswer,
        userAnswer: userAnswer !== undefined ? userAnswer : null,
        isCorrect,
        timeTaken,
      },
    });

    // Update operation-specific stats in user stats
    let userStats = await db.userStats.findUnique({
      where: { userId },
    });

    // Create user stats if they don't exist
    if (!userStats) {
      userStats = await db.userStats.create({
        data: { userId },
      });
    }

    const statsKey = getStatsKey(operation);
    if (statsKey) {
      // Parse the JSON stats - handle both string and object formats
      let currentStats = userStats[statsKey] as { total: number; correct: number; avgTime: number } | string;
      
      // If it's a string (from default value), parse it
      if (typeof currentStats === 'string') {
        currentStats = JSON.parse(currentStats);
      }
      
      const stats = currentStats as { total: number; correct: number; avgTime: number };
      
      const newTotal = stats.total + 1;
      const newCorrect = stats.correct + (isCorrect ? 1 : 0);
      // Calculate running average for time
      const newAvgTime = newTotal > 0 
        ? (stats.avgTime * stats.total + timeTaken) / newTotal 
        : timeTaken;

      await db.userStats.update({
        where: { userId },
        data: {
          [statsKey]: {
            total: newTotal,
            correct: newCorrect,
            avgTime: Math.round(newAvgTime * 100) / 100,
          },
        },
      });
    }

    return NextResponse.json({
      attemptId: attempt.id,
      message: "Attempt recorded",
    });
  } catch (error) {
    console.error("Error recording attempt:", error);
    return NextResponse.json(
      { error: "Failed to record attempt" },
      { status: 500 }
    );
  }
}

function getStatsKey(operation: string): "additionStats" | "subtractionStats" | "multiplicationStats" | "divisionStats" | null {
  switch (operation) {
    case "+":
      return "additionStats";
    case "-":
      return "subtractionStats";
    case "×":
      return "multiplicationStats";
    case "÷":
      return "divisionStats";
    default:
      return null;
  }
}

