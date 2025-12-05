import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Period = "all" | "weekly" | "daily";
type Mode = "duel" | "racing";

const DEFAULT_RATING = 1000;

interface BaseEntry {
  userId: string;
  score: number;
  accuracy: number | null;
}

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  image?: string | null;
  level: number;
  score: number;
  accuracy: number | null;
  change: "up" | "down" | "same";
  isYou?: boolean;
}

function getPeriodStart(period: Period): Date | null {
  if (period === "weekly") {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }
  if (period === "daily") {
    return new Date(Date.now() - 24 * 60 * 60 * 1000);
  }
  return null;
}

function getLevel(totalProblems?: number | null) {
  const total = totalProblems ?? 0;
  return Math.floor(total / 50) + 1;
}

function toLeaderboardEntry(
  entry: BaseEntry,
  rankIndex: number,
  userMap: Map<
    string,
    {
      id: string;
      name: string | null;
      username: string | null;
      image: string | null;
      stats: { totalProblems: number | null } | null;
    }
  >,
  currentUserId?: string | null
): LeaderboardEntry {
  const user = userMap.get(entry.userId);
  const displayName = user?.username || user?.name || "Anonymous";
  const avatar = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : displayName.substring(0, 2).toUpperCase();

  return {
    rank: rankIndex + 1,
    id: entry.userId,
    name: displayName,
    avatar,
    image: user?.image,
    level: getLevel(user?.stats?.totalProblems),
    score: Math.round(entry.score),
    accuracy: entry.accuracy !== null ? Math.round(entry.accuracy * 10) / 10 : null,
    change: "same",
    isYou: currentUserId === entry.userId,
  };
}

async function buildDuelLeaderboard(period: Period, currentUserId?: string | null) {
  const startTime = getPeriodStart(period);

  const matches = await db.multiplayerMatch.findMany({
    where: {
      status: "completed",
      ...(startTime ? { completedAt: { gte: startTime } } : {}),
    },
    select: {
      player1Id: true,
      player2Id: true,
      player1RatingChange: true,
      player2RatingChange: true,
      rounds: {
        select: {
          player1Answer: true,
          player2Answer: true,
          correctAnswer: true,
        },
      },
    },
  });

  const stats = new Map<
    string,
    {
      ratingChange: number;
      total: number;
      correct: number;
    }
  >();

  const ensureEntry = (userId: string) => {
    if (!stats.has(userId)) {
      stats.set(userId, { ratingChange: 0, total: 0, correct: 0 });
    }
  };

  for (const match of matches) {
    ensureEntry(match.player1Id);
    ensureEntry(match.player2Id);

    const p1 = stats.get(match.player1Id)!;
    const p2 = stats.get(match.player2Id)!;

    p1.ratingChange += match.player1RatingChange ?? 0;
    p2.ratingChange += match.player2RatingChange ?? 0;

    for (const round of match.rounds) {
      p1.total += 1;
      if (round.player1Answer === round.correctAnswer) p1.correct += 1;

      p2.total += 1;
      if (round.player2Answer === round.correctAnswer) p2.correct += 1;
    }
  }

  const entries: BaseEntry[] = Array.from(stats.entries())
    .map(([userId, data]) => {
      const accuracy =
        data.total > 0 ? (data.correct / data.total) * 100 : null;
      const score =
        period === "all" ? DEFAULT_RATING + data.ratingChange : data.ratingChange;

      return { userId, score, accuracy };
    })
    .sort((a, b) => b.score - a.score);

  if (entries.length === 0) {
    return { leaderboard: [] as LeaderboardEntry[], userRank: null };
  }

  const userIndex =
    currentUserId !== undefined && currentUserId !== null
      ? entries.findIndex((entry) => entry.userId === currentUserId)
      : -1;

  const topEntries = entries.slice(0, 50);
  const userIds = new Set(topEntries.map((e) => e.userId));
  if (userIndex !== -1 && currentUserId) {
    userIds.add(currentUserId);
  }

  const users = await db.user.findMany({
    where: {
      id: { in: Array.from(userIds) },
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      stats: {
        select: {
          totalProblems: true,
        },
      },
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard = topEntries.map((entry, index) =>
    toLeaderboardEntry(entry, index, userMap, currentUserId)
  );

  const userRank =
    userIndex !== -1 && currentUserId
      ? toLeaderboardEntry(entries[userIndex], userIndex, userMap, currentUserId)
      : null;

  return { leaderboard, userRank };
}

async function buildRaceLeaderboard(period: Period, currentUserId?: string | null) {
  const startTime = getPeriodStart(period);

  const racePlayers = await db.racePlayer.findMany({
    where: {
      race: {
        status: "finished",
        ...(startTime ? { finishedAt: { gte: startTime } } : {}),
      },
    },
    select: {
      userId: true,
      ratingChange: true,
      problemsSolved: true,
    },
  });

  const stats = new Map<
    string,
    {
      ratingChange: number;
      problemsSolved: number;
    }
  >();

  for (const player of racePlayers) {
    if (!stats.has(player.userId)) {
      stats.set(player.userId, { ratingChange: 0, problemsSolved: 0 });
    }
    const entry = stats.get(player.userId)!;
    entry.ratingChange += player.ratingChange ?? 0;
    entry.problemsSolved += player.problemsSolved ?? 0;
  }

  const entries: BaseEntry[] = Array.from(stats.entries())
    .map(([userId, data]) => {
      const score =
        period === "all" ? DEFAULT_RATING + data.ratingChange : data.ratingChange;
      // Accuracy isn't tracked in racing yet; show as null/placeholder
      return { userId, score, accuracy: null };
    })
    .sort((a, b) => b.score - a.score);

  if (entries.length === 0) {
    return { leaderboard: [] as LeaderboardEntry[], userRank: null };
  }

  const userIndex =
    currentUserId !== undefined && currentUserId !== null
      ? entries.findIndex((entry) => entry.userId === currentUserId)
      : -1;

  const topEntries = entries.slice(0, 50);
  const userIds = new Set(topEntries.map((e) => e.userId));
  if (userIndex !== -1 && currentUserId) {
    userIds.add(currentUserId);
  }

  const users = await db.user.findMany({
    where: {
      id: { in: Array.from(userIds) },
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      stats: {
        select: {
          totalProblems: true,
        },
      },
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  const leaderboard = topEntries.map((entry, index) =>
    toLeaderboardEntry(entry, index, userMap, currentUserId)
  );

  const userRank =
    userIndex !== -1 && currentUserId
      ? toLeaderboardEntry(entries[userIndex], userIndex, userMap, currentUserId)
      : null;

  return { leaderboard, userRank };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    const { searchParams } = new URL(request.url);

    const periodParam = searchParams.get("period");
    const modeParam = searchParams.get("mode");

    const period: Period =
      periodParam === "weekly" || periodParam === "daily" ? periodParam : "all";
    const mode: Mode = modeParam === "racing" ? "racing" : "duel";

    const result =
      mode === "racing"
        ? await buildRaceLeaderboard(period, currentUserId)
        : await buildDuelLeaderboard(period, currentUserId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
