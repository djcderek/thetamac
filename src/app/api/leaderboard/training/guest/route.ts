import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "@/lib/training-settings";

function isDefaultSettings(payload: {
  gameMode?: string;
  difficulty?: string;
  operations?: unknown;
  timedModeLimit?: number;
  showAdvanced?: boolean;
}) {
  const defaultOps = DEFAULT_TIMED_TRAINING_SETTINGS.operations;
  const hasDefaultOperations =
    Array.isArray(payload.operations) &&
    payload.operations.length === defaultOps.length &&
    payload.operations.every(
      (op): op is (typeof defaultOps)[number] =>
        typeof op === "string" && defaultOps.includes(op as (typeof defaultOps)[number])
    );

  return (
    payload.gameMode === DEFAULT_TIMED_TRAINING_SETTINGS.gameMode &&
    payload.difficulty === DEFAULT_TIMED_TRAINING_SETTINGS.difficulty &&
    hasDefaultOperations &&
    payload.timedModeLimit === 120 &&
    payload.showAdvanced === false
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      guestId,
      displayName,
      totalProblems,
      correctAnswers,
      averageTime,
      bestStreak,
      gameMode,
      difficulty,
      operations,
      timedModeLimit,
      showAdvanced,
    } = body;

    if (!guestId || typeof guestId !== "string" || guestId.length < 8) {
      return NextResponse.json(
        { error: "guestId required" },
        { status: 400 }
      );
    }

    if (!isDefaultSettings({ gameMode, difficulty, operations, timedModeLimit, showAdvanced })) {
      return NextResponse.json(
        { error: "Only default timed training settings are eligible" },
        { status: 400 }
      );
    }

    const total = Number(totalProblems) || 0;
    const correct = Number(correctAnswers) || 0;
    const avgTime = Number(averageTime) || 0;
    const streak = Number(bestStreak) || 0;

    if (total <= 0 || correct < 0 || correct > total) {
      return NextResponse.json(
        { error: "Invalid score payload" },
        { status: 400 }
      );
    }

    await db.guestTrainingScore.create({
      data: {
        guestId,
        displayName: (displayName || "Guest").toString().trim().slice(0, 24) || "Guest",
        totalProblems: total,
        correctAnswers: correct,
        averageTime: avgTime > 0 ? avgTime : 0,
        bestStreak: streak > 0 ? streak : 0,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error recording guest training score:", error);
    return NextResponse.json(
      { error: "Failed to save guest score" },
      { status: 500 }
    );
  }
}
