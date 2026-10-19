import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPremiumAccess } from "@/lib/subscription";

export const dynamic = "force-dynamic";

interface ProblemStats {
  key: string;
  operandA: number;
  operandB: number;
  operation: string;
  attempts: number;
  correct: number;
  accuracy: number;
  avgTime: number;
  lastAttempt: Date;
  commonWrongAnswers: { answer: number; count: number }[];
}

interface OperationWeakness {
  operation: string;
  operationSymbol: string;
  accuracy: number;
  avgTime: number;
  totalAttempts: number;
  weakestCombinations: ProblemStats[];
}

interface WeakPointsResponse {
  overallAccuracy: number;
  totalAttempts: number;
  operationWeaknesses: OperationWeakness[];
  topWeakProblems: ProblemStats[];
  slowestProblems: ProblemStats[];
  recentMistakes: ProblemStats[];
  improvementAreas: {
    type: "accuracy" | "speed" | "consistency";
    operation: string;
    message: string;
    priority: "high" | "medium" | "low";
  }[];
  trainingPack: {
    problems: { operandA: number; operandB: number; operation: string }[];
    focusAreas: string[];
    estimatedTime: number;
  };
}

const operationSymbols: Record<string, string> = {
  "+": "+",
  "-": "−",
  "×": "×",
  "÷": "÷",
};

const operationNames: Record<string, string> = {
  "+": "Addition",
  "-": "Subtraction",
  "×": "Multiplication",
  "÷": "Division",
};

function getProblemKey(operandA: number, operandB: number, operation: string): string {
  // Normalize commutative operations (+ and ×)
  if (operation === "+" || operation === "×") {
    const [a, b] = [operandA, operandB].sort((x, y) => x - y);
    return `${a}${operation}${b}`;
  }
  return `${operandA}${operation}${operandB}`;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const { isPremium } = await checkPremiumAccess(userId);
    if (!isPremium) {
      return NextResponse.json(
        { error: "Premium subscription required." },
        { status: 402 }
      );
    }

    // Fetch all problem attempts for the user (last 90 days for relevance)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const attempts = await db.problemAttempt.findMany({
      where: {
        userId,
        createdAt: { gte: ninetyDaysAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (attempts.length === 0) {
      return NextResponse.json({
        overallAccuracy: 0,
        totalAttempts: 0,
        operationWeaknesses: [],
        topWeakProblems: [],
        slowestProblems: [],
        recentMistakes: [],
        improvementAreas: [],
        trainingPack: {
          problems: [],
          focusAreas: [],
          estimatedTime: 0,
        },
      });
    }

    // Aggregate stats by problem
    const problemStatsMap = new Map<string, {
      operandA: number;
      operandB: number;
      operation: string;
      attempts: number;
      correct: number;
      totalTime: number;
      lastAttempt: Date;
      wrongAnswers: Map<number, number>;
    }>();

    // Aggregate stats by operation
    const operationStatsMap = new Map<string, {
      attempts: number;
      correct: number;
      totalTime: number;
    }>();

    for (const attempt of attempts) {
      const key = getProblemKey(attempt.operandA, attempt.operandB, attempt.operation);
      
      // Problem-level stats
      if (!problemStatsMap.has(key)) {
        problemStatsMap.set(key, {
          operandA: attempt.operandA,
          operandB: attempt.operandB,
          operation: attempt.operation,
          attempts: 0,
          correct: 0,
          totalTime: 0,
          lastAttempt: attempt.createdAt,
          wrongAnswers: new Map(),
        });
      }
      
      const stats = problemStatsMap.get(key)!;
      stats.attempts++;
      if (attempt.isCorrect) {
        stats.correct++;
      } else if (attempt.userAnswer !== null) {
        const wrongCount = stats.wrongAnswers.get(attempt.userAnswer) || 0;
        stats.wrongAnswers.set(attempt.userAnswer, wrongCount + 1);
      }
      stats.totalTime += attempt.timeTaken;
      if (attempt.createdAt > stats.lastAttempt) {
        stats.lastAttempt = attempt.createdAt;
      }

      // Operation-level stats
      if (!operationStatsMap.has(attempt.operation)) {
        operationStatsMap.set(attempt.operation, {
          attempts: 0,
          correct: 0,
          totalTime: 0,
        });
      }
      
      const opStats = operationStatsMap.get(attempt.operation)!;
      opStats.attempts++;
      if (attempt.isCorrect) {
        opStats.correct++;
      }
      opStats.totalTime += attempt.timeTaken;
    }

    // Convert to ProblemStats array
    const allProblemStats: ProblemStats[] = Array.from(problemStatsMap.entries()).map(
      ([key, stats]) => ({
        key,
        operandA: stats.operandA,
        operandB: stats.operandB,
        operation: stats.operation,
        attempts: stats.attempts,
        correct: stats.correct,
        accuracy: Math.round((stats.correct / stats.attempts) * 100),
        avgTime: Math.round((stats.totalTime / stats.attempts) * 100) / 100,
        lastAttempt: stats.lastAttempt,
        commonWrongAnswers: Array.from(stats.wrongAnswers.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([answer, count]) => ({ answer, count })),
      })
    );

    // Calculate overall accuracy
    const totalCorrect = attempts.filter((a) => a.isCorrect).length;
    const overallAccuracy = Math.round((totalCorrect / attempts.length) * 100);

    // Find weakest problems - include ANY problem with less than 100% accuracy
    // Sort by: accuracy (lower = weaker), then by attempts (more attempts = more confident)
    const topWeakProblems = allProblemStats
      .filter((p) => p.accuracy < 100) // Any problem they've gotten wrong at least once
      .sort((a, b) => {
        // Primary sort: accuracy (lower first)
        if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
        // Secondary sort: more attempts = more confident weakness
        return b.attempts - a.attempts;
      })
      .slice(0, 15);

    // Find slowest problems - compare against operation-specific average
    const slowestProblems = allProblemStats
      .filter((p) => {
        const opStats = operationStatsMap.get(p.operation);
        if (!opStats || opStats.attempts === 0) return false;
        
        const opAvgTime = opStats.totalTime / opStats.attempts;
        return p.avgTime > opAvgTime * 1.2; // 20% slower than operation average
      })
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);

    // Recent mistakes - any incorrect attempt in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentMistakes = allProblemStats
      .filter((p) => p.lastAttempt >= sevenDaysAgo && p.accuracy < 100)
      .sort((a, b) => b.lastAttempt.getTime() - a.lastAttempt.getTime())
      .slice(0, 15);

    // Build operation weaknesses - include ALL operations the user has attempted
    const operationWeaknesses: OperationWeakness[] = Array.from(operationStatsMap.entries())
      .map(([operation, stats]) => {
        // Include any problem with less than 100% accuracy
        const weakestCombinations = allProblemStats
          .filter((p) => p.operation === operation && p.accuracy < 100)
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 5);

        return {
          operation: operationNames[operation] || operation,
          operationSymbol: operationSymbols[operation] || operation,
          accuracy: Math.round((stats.correct / stats.attempts) * 100),
          avgTime: Math.round((stats.totalTime / stats.attempts) * 100) / 100,
          totalAttempts: stats.attempts,
          weakestCombinations,
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy);

    // Generate improvement areas - be more aggressive about identifying weaknesses
    const improvementAreas: WeakPointsResponse["improvementAreas"] = [];

    for (const opWeakness of operationWeaknesses) {
      // Show improvement area for any operation below 90% accuracy
      if (opWeakness.accuracy < 90) {
        improvementAreas.push({
          type: "accuracy",
          operation: opWeakness.operation,
          message: `Your ${opWeakness.operation.toLowerCase()} accuracy is ${opWeakness.accuracy}%. Focus on this operation to improve.`,
          priority: opWeakness.accuracy < 60 ? "high" : opWeakness.accuracy < 80 ? "medium" : "low",
        });
      }
      // Show speed improvement for slow operations
      if (opWeakness.avgTime > 3) {
        improvementAreas.push({
          type: "speed",
          operation: opWeakness.operation,
          message: `You're averaging ${opWeakness.avgTime}s for ${opWeakness.operation.toLowerCase()}. Practice for faster recall.`,
          priority: opWeakness.avgTime > 5 ? "high" : "medium",
        });
      }
    }

    // Check for consistency issues (high variance in performance)
    for (const problem of topWeakProblems.slice(0, 3)) {
      if (problem.accuracy > 0 && problem.accuracy < 80 && problem.attempts >= 5) {
        improvementAreas.push({
          type: "consistency",
          operation: operationNames[problem.operation] || problem.operation,
          message: `${problem.operandA} ${operationSymbols[problem.operation]} ${problem.operandB} needs more practice (${problem.accuracy}% accuracy over ${problem.attempts} attempts).`,
          priority: problem.accuracy < 50 ? "high" : "medium",
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    improvementAreas.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Generate training pack
    const trainingProblems: { operandA: number; operandB: number; operation: string }[] = [];
    const focusAreas: Set<string> = new Set();

    // Add weak problems (priority)
    for (const problem of topWeakProblems.slice(0, 15)) {
      trainingProblems.push({
        operandA: problem.operandA,
        operandB: problem.operandB,
        operation: problem.operation,
      });
      focusAreas.add(operationNames[problem.operation] || problem.operation);
    }

    // Add slow problems
    for (const problem of slowestProblems.slice(0, 10)) {
      const exists = trainingProblems.some(
        (p) =>
          p.operandA === problem.operandA &&
          p.operandB === problem.operandB &&
          p.operation === problem.operation
      );
      if (!exists) {
        trainingProblems.push({
          operandA: problem.operandA,
          operandB: problem.operandB,
          operation: problem.operation,
        });
        focusAreas.add(operationNames[problem.operation] || problem.operation);
      }
    }

    // Add recent mistakes
    for (const problem of recentMistakes.slice(0, 5)) {
      const exists = trainingProblems.some(
        (p) =>
          p.operandA === problem.operandA &&
          p.operandB === problem.operandB &&
          p.operation === problem.operation
      );
      if (!exists) {
        trainingProblems.push({
          operandA: problem.operandA,
          operandB: problem.operandB,
          operation: problem.operation,
        });
      }
    }

    // Estimate time (3 seconds per problem average for focused practice)
    const estimatedTime = Math.ceil((trainingProblems.length * 3) / 60); // in minutes

    const response: WeakPointsResponse = {
      overallAccuracy,
      totalAttempts: attempts.length,
      operationWeaknesses,
      topWeakProblems,
      slowestProblems,
      recentMistakes,
      improvementAreas: improvementAreas.slice(0, 5),
      trainingPack: {
        problems: trainingProblems,
        focusAreas: Array.from(focusAreas),
        estimatedTime,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching weak points:", error);
    return NextResponse.json(
      { error: "Failed to analyze weak points" },
      { status: 500 }
    );
  }
}

