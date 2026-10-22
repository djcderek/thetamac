import { db } from "@/lib/db";
import { isDeletedUserId } from "@/lib/deleted-user";
import { getCached } from "@/lib/server-cache";
import { leaderboardInitials } from "@/lib/leaderboard-initials";
import {
  loadGuestNames,
  loadPersonalBests,
  loadTrainingTotals,
  type RunWindow,
} from "@/lib/leaderboard-queries";
import {
  DAY_MS,
  aggregateDuelResults,
  aggregateRaceResults,
  calculateRankTrends,
  getCurrentPeriodStart,
  getPersonalBestTrainingScores,
  getQueryStart,
  getTrendComparisonLabel,
  isGuestLeaderboardId,
  isInComparisonPeriod,
  isInCurrentPeriod,
  rankTrainingTotals,
  sortRankedItems,
  type PerformanceMetric,
  type RankedItem,
  type RankTrend,
} from "@/lib/leaderboard-ranking";

export type Period = "all" | "weekly" | "daily";
export type Mode = "duel" | "racing" | "training";

// A guest whose unverified runs in the window add up to more correct answers than this
// loses those runs: they are left over from before guest scores were signed.
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
  isGuest?: boolean;
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
  isGuest?: boolean;
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
};

function getLevel(totalProblems?: number | null) {
  return Math.floor((totalProblems ?? 0) / 50) + 1;
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
  const avatar = leaderboardInitials(displayName);

  return {
    rank: rankIndex + 1,
    id: item.userId,
    name: displayName,
    avatar,
    image: guest ? null : user?.image,
    level: guest ? 1 : getLevel(user?.stats?.totalProblems),
    isGuest: Boolean(guest),
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
  const avatar = leaderboardInitials(displayName);
  return {
    rank: rankIndex + 1,
    id: score.userId,
    name: displayName,
    avatar,
    image: guest ? null : user?.image,
    level: guest ? 1 : getLevel(user?.stats?.totalProblems),
    isGuest: Boolean(guest),
    score: Math.round(score.score),
    isYou: currentUserId === score.userId,
  };
}

// Standings total every run in the window, so they are cached briefly and shared by every
// viewer; only the per-viewer parts (your rank, profiles) are computed per request.
const STANDINGS_TTL_SECONDS = 30;
const TOP_ENTRIES = 50;

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
  const topEntries = rankedCurrent.slice(0, TOP_ENTRIES);
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
  const guestLimit = LEGACY_GUEST_OUTLIER_BY_PERIOD[period];
  // The same windows as isInCurrentPeriod and isInComparisonPeriod.
  const currentStart = getCurrentPeriodStart(period, now);
  const currentWindow: RunWindow = { from: currentStart, until: now };
  const comparisonWindow: RunWindow =
    period === "all"
      ? { before: new Date(now.getTime() - 7 * DAY_MS) }
      : { from: getQueryStart(period, now), before: currentStart! };

  const [current, comparison] = await Promise.all([
    loadTrainingTotals(currentWindow, guestLimit),
    loadTrainingTotals(comparisonWindow, guestLimit),
  ]);
  const currentItems = rankTrainingTotals(current);

  // Names only for the guests who will be shown, in the order finalizeLeaderboard ranks.
  const shownGuests = sortRankedItems(currentItems.filter((item) => !isDeletedUserId(item.userId)))
    .slice(0, TOP_ENTRIES)
    .map((item) => item.userId)
    .filter(isGuestLeaderboardId);
  const names = await loadGuestNames(shownGuests, currentWindow, guestLimit);

  return {
    current: currentItems,
    comparison: rankTrainingTotals(comparison),
    guests: shownGuests.map((id) => [id, { name: names.get(id) ?? "Guest" }]),
  };
}

type TopScoreStandings = {
  ranked: { userId: string; score: number }[];
  guests: [string, GuestMeta][];
};

async function loadTrainingTopScoreStandings(): Promise<TopScoreStandings> {
  const guestLimit = LEGACY_GUEST_OUTLIER_BY_PERIOD.all;
  const bests = await loadPersonalBests(guestLimit);
  const rankedScores = getPersonalBestTrainingScores(
    bests.map((best) => ({
      userId: best.userId,
      correctAnswers: best.score,
      bestStreak: best.bestStreak,
      achievedAt: best.achievedAt,
    }))
  );
  const shownGuests = rankedScores
    .slice(0, TOP_ENTRIES)
    .map((score) => score.userId)
    .filter(isGuestLeaderboardId);
  const names = await loadGuestNames(shownGuests, {}, guestLimit);
  return {
    ranked: rankedScores.map(({ userId, score }) => ({ userId, score })),
    guests: shownGuests.map((id) => [id, { name: names.get(id) ?? "Guest" }]),
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
  const topScores = rankedScores.slice(0, TOP_ENTRIES);
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
