import { db } from "@/lib/db";
import { standardTimedSessionWhere } from "@/lib/standard-timed-sessions";
import { isDeletedUserId } from "@/lib/deleted-user";
import { getCached } from "@/lib/server-cache";
import {
  aggregateDuelResults,
  aggregateRaceResults,
  aggregateTrainingRuns,
  calculateRankTrends,
  getPersonalBestTrainingScores,
  getQueryStart,
  getTrendComparisonLabel,
  isGuestLeaderboardId,
  isInComparisonPeriod,
  isInCurrentPeriod,
  sortRankedItems,
  type PerformanceMetric,
  type RankedItem,
  type RankTrend,
} from "@/lib/leaderboard-ranking";

export type Period = "all" | "weekly" | "daily";
export type Mode = "duel" | "racing" | "training";

const MAX_LEGACY_GUEST_SCORE_PER_RUN = 500;
const LEGACY_GUEST_OUTLIER_BY_PERIOD: Record<Period, number> = {
  all: 5000,
  weekly: 1500,
  daily: 500,
};

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  image?: string | null;
  level: number;
  score: number;
  performance: PerformanceMetric;
  trend: RankTrend;
  isYou?: boolean;
}

export interface LeaderboardResult {
  leaderboard: LeaderboardEntry[];
  userRank: LeaderboardEntry | null;
  trendComparisonLabel: string;
}

export interface TrainingTopScoreEntry {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  image?: string | null;
  level: number;
  score: number;
  isYou?: boolean;
}

export interface TrainingTopScoresResult {
  leaderboard: TrainingTopScoreEntry[];
  userRank: TrainingTopScoreEntry | null;
}

type UserProfile = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  stats: { totalProblems: number | null } | null;
};

type GuestMeta = {
  name: string;
  verified: boolean;
};

type GuestScore = {
  guestId: string;
  displayName: string;
  identityVerified: boolean;
  totalProblems: number;
  correctAnswers: number;
  bestStreak: number;
  createdAt: Date;
};

function getLevel(totalProblems?: number | null) {
  return Math.floor((totalProblems ?? 0) / 50) + 1;
}

function isImplausibleLegacyGuestRun(score: GuestScore): boolean {
  if (score.identityVerified) return false;
  if (score.totalProblems < 0 || score.correctAnswers < 0) return true;
  if (score.totalProblems > MAX_LEGACY_GUEST_SCORE_PER_RUN) return true;
  if (score.correctAnswers > MAX_LEGACY_GUEST_SCORE_PER_RUN) return true;
  return score.correctAnswers > score.totalProblems;
}

function filterGuestRuns(
  scores: GuestScore[],
  period: Period
): GuestScore[] {
  const plausible = scores.filter(
    (score) => isGuestLeaderboardId(score.guestId) && !isImplausibleLegacyGuestRun(score)
  );
  const unverifiedTotals = new Map<string, number>();
  for (const score of plausible) {
    if (!score.identityVerified) {
      unverifiedTotals.set(
        score.guestId,
        (unverifiedTotals.get(score.guestId) ?? 0) + score.correctAnswers
      );
    }
  }
  const threshold = LEGACY_GUEST_OUTLIER_BY_PERIOD[period];
  return plausible.filter(
    (score) =>
      score.identityVerified || (unverifiedTotals.get(score.guestId) ?? 0) <= threshold
  );
}

function buildGuestMeta(scores: GuestScore[]): Map<string, GuestMeta> {
  const result = new Map<string, GuestMeta>();
  for (const score of [...scores].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const current = result.get(score.guestId);
    if (!current || score.identityVerified || !current.verified) {
      result.set(score.guestId, {
        name: score.displayName || current?.name || "Guest",
        verified: Boolean(current?.verified || score.identityVerified),
      });
    }
  }
  return result;
}

function createEntry(
  item: RankedItem,
  rankIndex: number,
  users: Map<string, UserProfile>,
  guests: Map<string, GuestMeta>,
  trends: Map<string, RankTrend>,
  currentUserId?: string | null
): LeaderboardEntry {
  const guest = guests.get(item.userId);
  const user = users.get(item.userId);
  const displayName = guest?.name || user?.username || user?.name || "Anonymous";
  const avatar = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : displayName.substring(0, 2).toUpperCase();

  return {
    rank: rankIndex + 1,
    id: item.userId,
    name: displayName,
    avatar,
    image: guest ? null : user?.image,
    level: guest ? 1 : getLevel(user?.stats?.totalProblems),
    score: Math.round(item.score),
    performance: item.performance,
    trend: trends.get(item.userId) ?? { kind: "unavailable" },
    isYou: currentUserId === item.userId,
  };
}

function createTopScoreEntry(
  score: { userId: string; score: number },
  rankIndex: number,
  users: Map<string, UserProfile>,
  guests: Map<string, GuestMeta>,
  currentUserId?: string | null
): TrainingTopScoreEntry {
  const guest = guests.get(score.userId);
  const user = users.get(score.userId);
  const displayName = guest?.name || user?.username || user?.name || "Anonymous";
  const avatar = user?.username
    ? user.username.substring(0, 2).toUpperCase()
    : displayName.substring(0, 2).toUpperCase();
  return {
    rank: rankIndex + 1,
    id: score.userId,
    name: displayName,
    avatar,
    image: guest ? null : user?.image,
    level: guest ? 1 : getLevel(user?.stats?.totalProblems),
    score: Math.round(score.score),
    isYou: currentUserId === score.userId,
  };
}

// Standings are recomputed from full table scans, so they are cached briefly and shared by
// every viewer; only the per-viewer parts (your rank, profiles) are computed per request.
const STANDINGS_TTL_SECONDS = 30;

type Standings = {
  current: RankedItem[];
  comparison: RankedItem[];
  guests: [string, GuestMeta][];
};

function getStandings(mode: Mode, period: Period, load: () => Promise<Standings>) {
  return getCached(`leaderboard:${mode}:${period}`, STANDINGS_TTL_SECONDS, load);
}

async function finalizeStandings(
  standings: Standings,
  period: Period,
  currentUserId?: string | null
) {
  return finalizeLeaderboard(
    standings.current,
    standings.comparison,
    period,
    currentUserId,
    new Map(standings.guests)
  );
}

async function finalizeLeaderboard(
  currentItems: RankedItem[],
  comparisonItems: RankedItem[],
  period: Period,
  currentUserId?: string | null,
  guests = new Map<string, GuestMeta>()
): Promise<LeaderboardResult> {
  // Deleted accounts keep their place in opponents' match history but are never ranked.
  const rankedCurrent = sortRankedItems(
    currentItems.filter((item) => !isDeletedUserId(item.userId))
  );
  const rankedComparison = sortRankedItems(
    comparisonItems.filter((item) => !isDeletedUserId(item.userId))
  );
  const trends = calculateRankTrends(rankedCurrent, rankedComparison);
  const comparisonLabel = getTrendComparisonLabel(period);

  if (rankedCurrent.length === 0) {
    return {
      leaderboard: [],
      userRank: null,
      trendComparisonLabel: comparisonLabel,
    };
  }

  const userIndex = currentUserId
    ? rankedCurrent.findIndex((entry) => entry.userId === currentUserId)
    : -1;
  const topEntries = rankedCurrent.slice(0, 50);
  const userIds = new Set(
    topEntries.filter((entry) => !guests.has(entry.userId)).map((entry) => entry.userId)
  );
  if (userIndex !== -1 && currentUserId && !guests.has(currentUserId)) {
    userIds.add(currentUserId);
  }

  const profiles = userIds.size
    ? await db.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          stats: { select: { totalProblems: true } },
        },
      })
    : [];
  const userMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return {
    leaderboard: topEntries.map((entry, index) =>
      createEntry(entry, index, userMap, guests, trends, currentUserId)
    ),
    userRank:
      userIndex === -1
        ? null
        : createEntry(
            rankedCurrent[userIndex],
            userIndex,
            userMap,
            guests,
            trends,
            currentUserId
          ),
    trendComparisonLabel: comparisonLabel,
  };
}

async function buildDuelLeaderboard(
  period: Period,
  currentUserId?: string | null
): Promise<LeaderboardResult> {
  const standings = await getStandings("duel", period, () => loadDuelStandings(period));
  return finalizeStandings(standings, period, currentUserId);
}

async function loadDuelStandings(period: Period): Promise<Standings> {
  const now = new Date();
  const queryStart = getQueryStart(period, now);
  const matches = await db.multiplayerMatch.findMany({
    where: {
      status: "completed",
      completedAt: { not: null, ...(queryStart ? { gte: queryStart } : {}) },
    },
    select: {
      player1Id: true,
      player2Id: true,
      player1RatingChange: true,
      player2RatingChange: true,
      winnerId: true,
      isDraw: true,
      completedAt: true,
    },
  });
  const current = matches.filter(
    (match) => match.completedAt && isInCurrentPeriod(match.completedAt, period, now)
  );
  const comparison = matches.filter(
    (match) => match.completedAt && isInComparisonPeriod(match.completedAt, period, now)
  );
  const mapMatch = (match: (typeof matches)[number]) => ({
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    player1RatingChange: match.player1RatingChange ?? 0,
    player2RatingChange: match.player2RatingChange ?? 0,
    winnerId: match.winnerId,
    isDraw: match.isDraw,
  });
  return {
    current: aggregateDuelResults(current.map(mapMatch), period === "all"),
    comparison: aggregateDuelResults(comparison.map(mapMatch), period === "all"),
    guests: [],
  };
}

async function buildRaceLeaderboard(
  period: Period,
  currentUserId?: string | null
): Promise<LeaderboardResult> {
  const standings = await getStandings("racing", period, () => loadRaceStandings(period));
  return finalizeStandings(standings, period, currentUserId);
}

async function loadRaceStandings(period: Period): Promise<Standings> {
  const now = new Date();
  const queryStart = getQueryStart(period, now);
  const racePlayers = await db.racePlayer.findMany({
    where: {
      race: {
        status: "finished",
        ...(queryStart ? { finishedAt: { gte: queryStart } } : {}),
      },
    },
    select: {
      userId: true,
      ratingChange: true,
      finishPosition: true,
      race: { select: { finishedAt: true } },
    },
  });
  const current = racePlayers.filter(
    (player) =>
      player.race.finishedAt && isInCurrentPeriod(player.race.finishedAt, period, now)
  );
  const comparison = racePlayers.filter(
    (player) =>
      player.race.finishedAt && isInComparisonPeriod(player.race.finishedAt, period, now)
  );
  const mapResult = (player: (typeof racePlayers)[number]) => ({
    userId: player.userId,
    ratingChange: player.ratingChange ?? 0,
    finishPosition: player.finishPosition,
  });
  return {
    current: aggregateRaceResults(current.map(mapResult), period === "all"),
    comparison: aggregateRaceResults(comparison.map(mapResult), period === "all"),
    guests: [],
  };
}

async function buildTrainingLeaderboard(
  period: Period,
  currentUserId?: string | null
): Promise<LeaderboardResult> {
  const standings = await getStandings("training", period, () => loadTrainingStandings(period));
  return finalizeStandings(standings, period, currentUserId);
}

async function loadTrainingStandings(period: Period): Promise<Standings> {
  const now = new Date();
  const queryStart = getQueryStart(period, now);
  const [sessions, guestScores] = await Promise.all([
    db.trainingSession.findMany({
      where: {
        ...standardTimedSessionWhere,
        completedAt: { not: null, ...(queryStart ? { gte: queryStart } : {}) },
      },
      select: {
        userId: true,
        correctAnswers: true,
        bestStreak: true,
        completedAt: true,
      },
    }),
    db.guestTrainingScore.findMany({
      where: queryStart ? { createdAt: { gte: queryStart } } : undefined,
      select: {
        guestId: true,
        displayName: true,
        identityVerified: true,
        totalProblems: true,
        correctAnswers: true,
        bestStreak: true,
        createdAt: true,
      },
    }),
  ]);

  const sessionRuns = sessions.map((session) => ({
    userId: session.userId,
    correctAnswers: session.correctAnswers ?? 0,
    bestStreak: session.bestStreak ?? 0,
    occurredAt: session.completedAt!,
  }));
  const currentGuestScores = filterGuestRuns(
    guestScores.filter((score) => isInCurrentPeriod(score.createdAt, period, now)),
    period
  );
  const comparisonGuestScores = filterGuestRuns(
    guestScores.filter((score) => isInComparisonPeriod(score.createdAt, period, now)),
    period
  );
  const mapGuestRun = (score: GuestScore) => ({
    userId: score.guestId,
    correctAnswers: score.correctAnswers,
    bestStreak: score.bestStreak,
  });

  const currentRuns = [
    ...sessionRuns
      .filter((run) => isInCurrentPeriod(run.occurredAt, period, now))
      .map((run) => ({
        userId: run.userId,
        correctAnswers: run.correctAnswers,
        bestStreak: run.bestStreak,
      })),
    ...currentGuestScores.map(mapGuestRun),
  ];
  const comparisonRuns = [
    ...sessionRuns
      .filter((run) => isInComparisonPeriod(run.occurredAt, period, now))
      .map((run) => ({
        userId: run.userId,
        correctAnswers: run.correctAnswers,
        bestStreak: run.bestStreak,
      })),
    ...comparisonGuestScores.map(mapGuestRun),
  ];

  return {
    current: aggregateTrainingRuns(currentRuns),
    comparison: aggregateTrainingRuns(comparisonRuns),
    guests: Array.from(buildGuestMeta(currentGuestScores)),
  };
}

type TopScoreStandings = {
  ranked: { userId: string; score: number }[];
  guests: [string, GuestMeta][];
};

async function loadTrainingTopScoreStandings(): Promise<TopScoreStandings> {
  const [sessions, guestScores] = await Promise.all([
    db.trainingSession.findMany({
      where: {
        ...standardTimedSessionWhere,
        completedAt: { not: null },
      },
      select: {
        userId: true,
        correctAnswers: true,
        bestStreak: true,
        completedAt: true,
      },
    }),
    db.guestTrainingScore.findMany({
      select: {
        guestId: true,
        displayName: true,
        identityVerified: true,
        totalProblems: true,
        correctAnswers: true,
        bestStreak: true,
        createdAt: true,
      },
    }),
  ]);

  const validGuestScores = filterGuestRuns(guestScores, "all");
  const rankedScores = getPersonalBestTrainingScores([
    ...sessions.map((session) => ({
      userId: session.userId,
      correctAnswers: session.correctAnswers ?? 0,
      bestStreak: session.bestStreak ?? 0,
      achievedAt: session.completedAt!,
    })),
    ...validGuestScores.map((score) => ({
      userId: score.guestId,
      correctAnswers: score.correctAnswers,
      bestStreak: score.bestStreak,
      achievedAt: score.createdAt,
    })),
  ]);
  return {
    ranked: rankedScores.map(({ userId, score }) => ({ userId, score })),
    guests: Array.from(buildGuestMeta(validGuestScores)),
  };
}

export async function getTrainingTopScores(
  currentUserId?: string | null
): Promise<TrainingTopScoresResult> {
  const standings = await getCached(
    "leaderboard:training-top-scores",
    STANDINGS_TTL_SECONDS,
    loadTrainingTopScoreStandings
  );
  const rankedScores = standings.ranked;
  const guests = new Map(standings.guests);
  const userIndex = currentUserId
    ? rankedScores.findIndex((score) => score.userId === currentUserId)
    : -1;
  const topScores = rankedScores.slice(0, 50);
  const userIds = new Set(
    topScores.filter((score) => !guests.has(score.userId)).map((score) => score.userId)
  );
  if (userIndex !== -1 && currentUserId && !guests.has(currentUserId)) {
    userIds.add(currentUserId);
  }
  const profiles = userIds.size
    ? await db.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          stats: { select: { totalProblems: true } },
        },
      })
    : [];
  const userMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return {
    leaderboard: topScores.map((score, index) =>
      createTopScoreEntry(score, index, userMap, guests, currentUserId)
    ),
    userRank:
      userIndex === -1
        ? null
        : createTopScoreEntry(
            rankedScores[userIndex],
            userIndex,
            userMap,
            guests,
            currentUserId
          ),
  };
}

export async function getLeaderboard(
  mode: Mode,
  period: Period,
  currentUserId?: string | null
): Promise<LeaderboardResult> {
  if (mode === "racing") return buildRaceLeaderboard(period, currentUserId);
  if (mode === "training") return buildTrainingLeaderboard(period, currentUserId);
  return buildDuelLeaderboard(period, currentUserId);
}
