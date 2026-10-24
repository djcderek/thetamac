import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { GUEST_COOKIE_NAME, verifyGuestToken } from "@/lib/guest";
import { checkRateLimit, guestLeaderboardRatelimit } from "@/lib/rate-limit";
import { MAX_STANDARD_SCORE } from "@/lib/standard-timed-sessions";
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

const MAX_PROBLEMS_PER_SUBMISSION = 500;
const MAX_AVERAGE_TIME_SECONDS = 30;
const REPLAY_THROTTLE_MS = 90_000;
const DUPLICATE_WINDOW_MS = 120_000;

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return firstForwarded || realIp || "unknown";
}

function sanitizeDisplayName(value: unknown, fallback: string): string {
  const normalized = (typeof value === "string" ? value : fallback).trim().slice(0, 24);
  return normalized || fallback;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
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

    const guestCookie = (await cookies()).get(GUEST_COOKIE_NAME)?.value;
    const verifiedGuest = guestCookie ? await verifyGuestToken(guestCookie) : null;

    // Identity comes only from the server-signed guest cookie. Accepting a guestId from the
    // body let anyone write scores under another player's ID, including signed-in users.
    if (!verifiedGuest) {
      return NextResponse.json({ error: "Guest session required" }, { status: 401 });
    }
    const resolvedGuestId = verifiedGuest.guestId;
    const identityVerified = true;
    const resolvedDisplayName = sanitizeDisplayName(verifiedGuest.guestName, "Guest");

    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(
      guestLeaderboardRatelimit,
      `${resolvedGuestId}:${clientIp}`
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many submissions. Please slow down." },
        { status: 429, headers: rateLimit.headers }
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

    if (
      total <= 0 ||
      total > MAX_PROBLEMS_PER_SUBMISSION ||
      correct < 0 ||
      correct > total ||
      correct > MAX_STANDARD_SCORE ||
      avgTime < 0 ||
      avgTime > MAX_AVERAGE_TIME_SECONDS ||
      streak < 0 ||
      streak > total
    ) {
      return NextResponse.json(
        { error: "Invalid score payload" },
        { status: 400 }
      );
    }

    const now = Date.now();
    const latestSubmission = await db.guestTrainingScore.findFirst({
      where: { guestId: resolvedGuestId },
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
      },
    });

    if (latestSubmission) {
      const msSinceLatest = now - latestSubmission.createdAt.getTime();
      if (msSinceLatest < REPLAY_THROTTLE_MS) {
        return NextResponse.json(
          { error: "Please wait before submitting another score." },
          { status: 429 }
        );
      }
    }

    const duplicate = await db.guestTrainingScore.findFirst({
      where: {
        guestId: resolvedGuestId,
        createdAt: { gte: new Date(now - DUPLICATE_WINDOW_MS) },
        totalProblems: total,
        correctAnswers: correct,
        averageTime: avgTime > 0 ? avgTime : 0,
        bestStreak: streak > 0 ? streak : 0,
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "Duplicate score submission ignored." },
        { status: 409 }
      );
    }

    await db.guestTrainingScore.create({
      data: {
        guestId: resolvedGuestId,
        displayName: resolvedDisplayName,
        identityVerified,
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
