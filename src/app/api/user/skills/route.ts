import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface OperationStats {
  total: number;
  correct: number;
  avgTime: number;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get user stats for operation-level data
    let userStats = await db.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) {
      userStats = await db.userStats.create({
        data: { userId },
      });
    }

    // Parse operation stats
    const parseStats = (stats: unknown): OperationStats => {
      if (typeof stats === "string") {
        return JSON.parse(stats);
      }
      return stats as OperationStats;
    };

    const additionStats = parseStats(userStats.additionStats);
    const subtractionStats = parseStats(userStats.subtractionStats);
    const multiplicationStats = parseStats(userStats.multiplicationStats);
    const divisionStats = parseStats(userStats.divisionStats);

    // Build skills overview
    const skillsOverview = [
      {
        name: "Addition",
        operation: "+",
        accuracy: additionStats.total > 0
          ? Math.round((additionStats.correct / additionStats.total) * 100)
          : 0,
        speed: Math.round(additionStats.avgTime * 10) / 10,
        problems: additionStats.total,
      },
      {
        name: "Subtraction",
        operation: "-",
        accuracy: subtractionStats.total > 0
          ? Math.round((subtractionStats.correct / subtractionStats.total) * 100)
          : 0,
        speed: Math.round(subtractionStats.avgTime * 10) / 10,
        problems: subtractionStats.total,
      },
      {
        name: "Multiplication",
        operation: "×",
        accuracy: multiplicationStats.total > 0
          ? Math.round((multiplicationStats.correct / multiplicationStats.total) * 100)
          : 0,
        speed: Math.round(multiplicationStats.avgTime * 10) / 10,
        problems: multiplicationStats.total,
      },
      {
        name: "Division",
        operation: "÷",
        accuracy: divisionStats.total > 0
          ? Math.round((divisionStats.correct / divisionStats.total) * 100)
          : 0,
        speed: Math.round(divisionStats.avgTime * 10) / 10,
        problems: divisionStats.total,
      },
    ];

    // Get weekly progress (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentAttempts = await db.problemAttempt.findMany({
      where: {
        userId,
        createdAt: { gte: fourWeeksAgo },
      },
      select: {
        operation: true,
        isCorrect: true,
        createdAt: true,
        timeTaken: true,
        operandA: true,
        operandB: true,
        correctAnswer: true,
        userAnswer: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by week and operation
    const weeklyData: Record<string, Record<string, { correct: number; total: number }>> = {};
    const now = new Date();

    for (let w = 0; w < 4; w++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (3 - w) * 7 - 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekKey = `W${w + 1}`;
      weeklyData[weekKey] = {
        "+": { correct: 0, total: 0 },
        "-": { correct: 0, total: 0 },
        "×": { correct: 0, total: 0 },
        "÷": { correct: 0, total: 0 },
      };
    }

    // Populate weekly data
    for (const attempt of recentAttempts) {
      const attemptDate = new Date(attempt.createdAt);
      const daysAgo = Math.floor((now.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysAgo / 7);
      
      if (weekIndex >= 0 && weekIndex < 4) {
        const weekKey = `W${4 - weekIndex}`;
        const op = attempt.operation;
        
        if (weeklyData[weekKey] && weeklyData[weekKey][op]) {
          weeklyData[weekKey][op].total++;
          if (attempt.isCorrect) {
            weeklyData[weekKey][op].correct++;
          }
        }
      }
    }

    // Convert to array format
    const weeklyProgress = {
      addition: Object.entries(weeklyData).map(([week, ops]) => ({
        week,
        accuracy: ops["+"].total > 0 ? Math.round((ops["+"].correct / ops["+"].total) * 100) : null,
      })),
      subtraction: Object.entries(weeklyData).map(([week, ops]) => ({
        week,
        accuracy: ops["-"].total > 0 ? Math.round((ops["-"].correct / ops["-"].total) * 100) : null,
      })),
      multiplication: Object.entries(weeklyData).map(([week, ops]) => ({
        week,
        accuracy: ops["×"].total > 0 ? Math.round((ops["×"].correct / ops["×"].total) * 100) : null,
      })),
      division: Object.entries(weeklyData).map(([week, ops]) => ({
        week,
        accuracy: ops["÷"].total > 0 ? Math.round((ops["÷"].correct / ops["÷"].total) * 100) : null,
      })),
    };

    // Calculate performance by number range (based on max operand)
    const numberRangeStats: Record<string, { correct: number; total: number }> = {
      "1-10": { correct: 0, total: 0 },
      "11-20": { correct: 0, total: 0 },
      "21-50": { correct: 0, total: 0 },
      "51-100": { correct: 0, total: 0 },
      "100+": { correct: 0, total: 0 },
    };

    // Get all attempts for number range analysis
    const allAttempts = await db.problemAttempt.findMany({
      where: { userId },
      select: {
        operandA: true,
        operandB: true,
        isCorrect: true,
        operation: true,
        correctAnswer: true,
        userAnswer: true,
      },
    });

    for (const attempt of allAttempts) {
      const maxOperand = Math.max(attempt.operandA, attempt.operandB);
      let rangeKey: string;
      
      if (maxOperand <= 10) rangeKey = "1-10";
      else if (maxOperand <= 20) rangeKey = "11-20";
      else if (maxOperand <= 50) rangeKey = "21-50";
      else if (maxOperand <= 100) rangeKey = "51-100";
      else rangeKey = "100+";

      numberRangeStats[rangeKey].total++;
      if (attempt.isCorrect) {
        numberRangeStats[rangeKey].correct++;
      }
    }

    const numberRangeData = Object.entries(numberRangeStats).map(([range, stats]) => ({
      range,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      problems: stats.total,
    }));

    // Find common mistakes (problems answered incorrectly multiple times)
    const incorrectAttempts = allAttempts.filter(a => !a.isCorrect && a.userAnswer !== null);
    
    // Group by problem signature
    const mistakeMap: Record<string, { 
      problem: string; 
      yourAnswer: string; 
      correct: string; 
      times: number;
      operation: string;
    }> = {};

    for (const attempt of incorrectAttempts) {
      const problemKey = `${attempt.operandA}${attempt.operation}${attempt.operandB}`;
      const answerKey = `${problemKey}=${attempt.userAnswer}`;
      
      if (!mistakeMap[answerKey]) {
        mistakeMap[answerKey] = {
          problem: `${attempt.operandA} ${attempt.operation} ${attempt.operandB}`,
          yourAnswer: String(attempt.userAnswer),
          correct: String(attempt.correctAnswer),
          times: 0,
          operation: attempt.operation,
        };
      }
      mistakeMap[answerKey].times++;
    }

    // Sort by frequency and take top 5
    const troubleSpots = Object.values(mistakeMap)
      .sort((a, b) => b.times - a.times)
      .slice(0, 5);

    // Calculate digit length performance
    const digitLengthStats: Record<string, { correct: number; total: number; totalTime: number }> = {
      "1×1 digit": { correct: 0, total: 0, totalTime: 0 },
      "2×1 digit": { correct: 0, total: 0, totalTime: 0 },
      "2×2 digit": { correct: 0, total: 0, totalTime: 0 },
      "3×1 digit": { correct: 0, total: 0, totalTime: 0 },
    };

    const attemptsWithTime = await db.problemAttempt.findMany({
      where: { userId },
      select: {
        operandA: true,
        operandB: true,
        isCorrect: true,
        timeTaken: true,
      },
    });

    for (const attempt of attemptsWithTime) {
      const digitsA = String(attempt.operandA).length;
      const digitsB = String(attempt.operandB).length;
      
      let key: string | null = null;
      if (digitsA === 1 && digitsB === 1) key = "1×1 digit";
      else if ((digitsA === 2 && digitsB === 1) || (digitsA === 1 && digitsB === 2)) key = "2×1 digit";
      else if (digitsA === 2 && digitsB === 2) key = "2×2 digit";
      else if ((digitsA === 3 && digitsB === 1) || (digitsA === 1 && digitsB === 3)) key = "3×1 digit";
      
      if (key && digitLengthStats[key]) {
        digitLengthStats[key].total++;
        digitLengthStats[key].totalTime += attempt.timeTaken;
        if (attempt.isCorrect) {
          digitLengthStats[key].correct++;
        }
      }
    }

    const digitLengthData = Object.entries(digitLengthStats).map(([type, stats]) => ({
      type,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      speed: stats.total > 0 ? Math.round((stats.totalTime / stats.total) * 10) / 10 : 0,
      count: stats.total,
    }));

    // Calculate trend for each skill (compare last 2 weeks)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const lastTwoWeeksAttempts = await db.problemAttempt.findMany({
      where: {
        userId,
        createdAt: { gte: twoWeeksAgo },
      },
      select: {
        operation: true,
        isCorrect: true,
        createdAt: true,
      },
    });

    const trendByOp: Record<string, { week1: { c: number; t: number }; week2: { c: number; t: number } }> = {
      "+": { week1: { c: 0, t: 0 }, week2: { c: 0, t: 0 } },
      "-": { week1: { c: 0, t: 0 }, week2: { c: 0, t: 0 } },
      "×": { week1: { c: 0, t: 0 }, week2: { c: 0, t: 0 } },
      "÷": { week1: { c: 0, t: 0 }, week2: { c: 0, t: 0 } },
    };

    for (const attempt of lastTwoWeeksAttempts) {
      const isLastWeek = new Date(attempt.createdAt) >= oneWeekAgo;
      const weekKey = isLastWeek ? "week2" : "week1";
      const op = attempt.operation;
      
      if (trendByOp[op]) {
        trendByOp[op][weekKey].t++;
        if (attempt.isCorrect) {
          trendByOp[op][weekKey].c++;
        }
      }
    }

    // Calculate trends
    const getTrend = (op: string): "up" | "down" | "same" => {
      const data = trendByOp[op];
      if (data.week1.t < 5 || data.week2.t < 5) return "same"; // Not enough data
      
      const acc1 = data.week1.c / data.week1.t;
      const acc2 = data.week2.c / data.week2.t;
      const diff = acc2 - acc1;
      
      if (diff > 0.03) return "up";
      if (diff < -0.03) return "down";
      return "same";
    };

    // Add trend to skills overview
    const skillsWithTrend = skillsOverview.map(skill => ({
      ...skill,
      trend: getTrend(skill.operation),
    }));

    // Generate recommendations
    const recommendations = [];
    
    // Find weakest skill
    const skillsWithProblems = skillsWithTrend.filter(s => s.problems > 0);
    if (skillsWithProblems.length > 0) {
      const weakest = skillsWithProblems.reduce((min, s) => s.accuracy < min.accuracy ? s : min);
      if (weakest.accuracy < 80) {
        recommendations.push({
          type: "focus",
          skill: weakest.name,
          message: `Your ${weakest.name.toLowerCase()} accuracy is ${weakest.accuracy}%. We recommend focusing on this area.`,
        });
      }
    }

    // Check for speed improvements needed
    const slowSkill = skillsWithProblems.find(s => s.speed > 3);
    if (slowSkill) {
      recommendations.push({
        type: "speed",
        skill: slowSkill.name,
        message: `Your ${slowSkill.name.toLowerCase()} speed is ${slowSkill.speed}s. Try speed training to get under 2s.`,
      });
    }

    // Praise for good performance
    const strongSkill = skillsWithProblems.find(s => s.accuracy >= 90 && s.trend === "up");
    if (strongSkill) {
      recommendations.push({
        type: "praise",
        skill: strongSkill.name,
        message: `Great progress on ${strongSkill.name.toLowerCase()}! You've achieved ${strongSkill.accuracy}% accuracy.`,
      });
    }

    return NextResponse.json({
      skillsOverview: skillsWithTrend,
      weeklyProgress,
      numberRangeData,
      digitLengthData,
      troubleSpots,
      recommendations,
      radarData: skillsWithTrend.map(s => ({
        skill: s.name,
        value: s.accuracy,
      })),
    });
  } catch (error) {
    console.error("Error fetching skills data:", error);
    return NextResponse.json(
      { error: "Failed to fetch skills data" },
      { status: 500 }
    );
  }
}


