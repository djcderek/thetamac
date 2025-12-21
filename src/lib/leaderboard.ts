import { db } from "@/lib/db";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "@/lib/training-settings";

export type Period = "all" | "weekly" | "daily";
export type Mode = "duel" | "racing" | "training";

const DEFAULT_RATING = 1000;

interface BaseEntry {
  userId: string;
  score: number;
  accuracy: number | null;
}

export interface LeaderboardEntry {
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

export interface LeaderboardResult {
  leaderboard: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
}

export interface DistributionBucket {
  from: number;
  to: number;
  count: number;
}

export interface DistributionResult {
  buckets: DistributionBucket[];
  total: number;
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

async function buildDuelLeaderboard(period: Period, currentUserId?: string | null): Promise<LeaderboardResult> {
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
    return { leaderboard: [], userRank: null };
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

async function buildRaceLeaderboard(period: Period, currentUserId?: string | null): Promise<LeaderboardResult> {
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
      return { userId, score, accuracy: null };
    })
    .sort((a, b) => b.score - a.score);

  if (entries.length === 0) {
    return { leaderboard: [], userRank: null };
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

async function buildTrainingLeaderboard(
  period: Period,
  currentUserId?: string | null
): Promise<LeaderboardResult> {
  const startTime = getPeriodStart(period);

  const sessions = await db.trainingSession.findMany({
    where: {
      gameMode: DEFAULT_TIMED_TRAINING_SETTINGS.gameMode,
      difficulty: DEFAULT_TIMED_TRAINING_SETTINGS.difficulty,
      operations: {
        hasEvery: [...DEFAULT_TIMED_TRAINING_SETTINGS.operations],
      },
      completedAt: {
        not: null,
        ...(startTime ? { gte: startTime } : {}),
      },
    },
    select: {
      userId: true,
      totalProblems: true,
      correctAnswers: true,
      averageTime: true,
      bestStreak: true,
    },
  });

  const guestScores = await db.guestTrainingScore.findMany({
    where: {
      ...(startTime ? { createdAt: { gte: startTime } } : {}),
    },
  });

  const stats = new Map<
    string,
    { correct: number; attempts: number; totalTime: number; bestStreak: number; isGuest?: boolean; name?: string }
  >();

  for (const session of sessions) {
    const attempts = Math.max(session.totalProblems ?? 0, session.correctAnswers ?? 0);
    const correct = session.correctAnswers ?? 0;
    const averageTime = session.averageTime ?? 0;

    if (!stats.has(session.userId)) {
      stats.set(session.userId, { correct: 0, attempts: 0, totalTime: 0, bestStreak: 0 });
    }

    const entry = stats.get(session.userId)!;
    entry.correct += correct;
    entry.attempts += attempts;
    entry.bestStreak = Math.max(entry.bestStreak, session.bestStreak ?? 0);
    if (attempts > 0 && averageTime > 0) {
      entry.totalTime += averageTime * attempts;
    }
  }

  for (const score of guestScores) {
    if (!stats.has(score.guestId)) {
      stats.set(score.guestId, { correct: 0, attempts: 0, totalTime: 0, bestStreak: 0, isGuest: true, name: score.displayName });
    }
    const entry = stats.get(score.guestId)!;
    entry.correct += score.correctAnswers ?? 0;
    entry.attempts += score.totalProblems ?? 0;
    entry.bestStreak = Math.max(entry.bestStreak, score.bestStreak ?? 0);
    if (score.totalProblems > 0 && score.averageTime > 0) {
      entry.totalTime += score.averageTime * score.totalProblems;
    }
  }

  const entries: BaseEntry[] = Array.from(stats.entries())
    .map(([userId, data]) => {
      const accuracy =
        data.attempts > 0 ? (data.correct / data.attempts) * 100 : null;
      return {
        userId,
        score: data.correct,
        accuracy,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const accA = a.accuracy ?? -1;
      const accB = b.accuracy ?? -1;
      return accB - accA;
    });

  if (entries.length === 0) {
    return { leaderboard: [], userRank: null };
  }

  const userIndex =
    currentUserId !== undefined && currentUserId !== null
      ? entries.findIndex((entry) => entry.userId === currentUserId)
      : -1;

  const topEntries = entries.slice(0, 50);
  const userIds = new Set(
    topEntries
      .filter((e) => !(stats.get(e.userId)?.isGuest))
      .map((e) => e.userId)
  );
  if (userIndex !== -1 && currentUserId && !(stats.get(currentUserId)?.isGuest)) {
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

  const leaderboard = topEntries.map((entry, index) => {
    const meta = stats.get(entry.userId);
    if (meta?.isGuest) {
      const displayName = meta.name || "Guest";
      const avatar = displayName.substring(0, 2).toUpperCase();
      return {
        rank: index + 1,
        id: entry.userId,
        name: displayName,
        avatar,
        image: null,
        level: 1,
        score: Math.round(entry.score),
        accuracy: entry.accuracy !== null ? Math.round(entry.accuracy * 10) / 10 : null,
        change: "same" as const,
        isYou: currentUserId === entry.userId,
      };
    }
    return toLeaderboardEntry(entry, index, userMap, currentUserId);
  });

  const userRank =
    userIndex !== -1 && currentUserId
      ? (() => {
          const meta = stats.get(entries[userIndex].userId);
          if (meta?.isGuest) {
            const displayName = meta.name || "Guest";
            const avatar = displayName.substring(0, 2).toUpperCase();
            return {
              rank: userIndex + 1,
              id: entries[userIndex].userId,
              name: displayName,
              avatar,
              image: null,
              level: 1,
              score: Math.round(entries[userIndex].score),
              accuracy:
                entries[userIndex].accuracy !== null
                  ? Math.round(entries[userIndex].accuracy * 10) / 10
                  : null,
              change: "same" as const,
              isYou: true,
            };
          }
          return toLeaderboardEntry(entries[userIndex], userIndex, userMap, currentUserId);
        })()
      : null;

  return { leaderboard, userRank };
}

export async function getLeaderboard(
  mode: Mode,
  period: Period,
  currentUserId?: string | null
): Promise<LeaderboardResult> {
  if (mode === "racing") {
    return buildRaceLeaderboard(period, currentUserId);
  }
  if (mode === "training") {
    return buildTrainingLeaderboard(period, currentUserId);
  }
  return buildDuelLeaderboard(period, currentUserId);
}

const BUCKET_SIZE = 2;

function bucketize(scores: number[]): DistributionBucket[] {
  if (scores.length === 0) return [];
  const countsByFrom = new Map<number, { from: number; to: number; count: number }>();
  let minFrom = Number.POSITIVE_INFINITY;
  let maxFrom = 0;
  for (const score of scores) {
    const clamped = Math.max(0, Math.floor(score));
    const from = Math.floor(clamped / BUCKET_SIZE) * BUCKET_SIZE;
    const to = from + BUCKET_SIZE - 1;
    minFrom = Math.min(minFrom, from);
    maxFrom = Math.max(maxFrom, from);
    const existing = countsByFrom.get(from) ?? { from, to, count: 0 };
    existing.count += 1;
    countsByFrom.set(from, existing);
  }

  const buckets: DistributionBucket[] = [];
  for (let from = minFrom; from <= maxFrom; from += BUCKET_SIZE) {
    const to = from + BUCKET_SIZE - 1;
    buckets.push(countsByFrom.get(from) ?? { from, to, count: 0 });
  }

  return buckets;
}

export async function getTrainingDistribution(): Promise<DistributionResult> {
  const sessions = await db.trainingSession.findMany({
    where: {
      gameMode: DEFAULT_TIMED_TRAINING_SETTINGS.gameMode,
      difficulty: DEFAULT_TIMED_TRAINING_SETTINGS.difficulty,
      operations: { hasEvery: [...DEFAULT_TIMED_TRAINING_SETTINGS.operations] },
      completedAt: { not: null },
    },
    select: {
      correctAnswers: true,
      totalProblems: true,
    },
  });

  const guestSessions = await db.guestTrainingScore.findMany({
    select: {
      correctAnswers: true,
    },
  });

  const scores: number[] = [];

  for (const session of sessions) {
    const score = session.correctAnswers ?? session.totalProblems ?? 0;
    scores.push(score);
  }

  for (const guest of guestSessions) {
    const score = guest.correctAnswers ?? 0;
    scores.push(score);
  }

  if (scores.length === 0) {
    return { buckets: [], total: 0 };
  }

  const buckets = bucketize(scores);
  return { buckets, total: scores.length };
}

