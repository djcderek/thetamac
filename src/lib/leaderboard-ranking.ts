export type PerformanceMetric =
  | { kind: "bestRun"; value: number }
  | { kind: "duelRecord"; wins: number; losses: number; draws: number }
  | { kind: "raceRecord"; wins: number; races: number };

export type RankTrend =
  | { kind: "up"; places: number }
  | { kind: "down"; places: number }
  | { kind: "same" }
  | { kind: "new" }
  | { kind: "unavailable" };

export interface RankedItem {
  userId: string;
  score: number;
  performance: PerformanceMetric;
  tieBreakers: number[];
}

export interface TrainingRun {
  userId: string;
  correctAnswers: number;
  bestStreak: number;
}

export interface TimedTrainingScore extends TrainingRun {
  achievedAt: Date;
}

export interface PersonalBestScore {
  userId: string;
  score: number;
  bestStreak: number;
  achievedAt: Date;
}

export interface DuelResult {
  player1Id: string;
  player2Id: string;
  player1RatingChange: number;
  player2RatingChange: number;
  winnerId: string | null;
  isDraw: boolean;
}

export interface RaceResult {
  userId: string;
  ratingChange: number;
  finishPosition: number | null;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function getCurrentPeriodStart(
  period: "all" | "weekly" | "daily",
  now: Date
): Date | null {
  if (period === "weekly") return new Date(now.getTime() - 7 * DAY_MS);
  if (period === "daily") return new Date(now.getTime() - DAY_MS);
  return null;
}

export function getQueryStart(
  period: "all" | "weekly" | "daily",
  now: Date
): Date | null {
  if (period === "weekly") return new Date(now.getTime() - 14 * DAY_MS);
  if (period === "daily") return new Date(now.getTime() - 2 * DAY_MS);
  return null;
}

export function getTrendComparisonLabel(
  period: "all" | "weekly" | "daily"
): string {
  if (period === "daily") return "Compared with the previous 24 hours";
  if (period === "weekly") return "Compared with the previous 7 days";
  return "Compared with the all-time standings 7 days ago";
}

export function isInCurrentPeriod(
  date: Date,
  period: "all" | "weekly" | "daily",
  now: Date
): boolean {
  const start = getCurrentPeriodStart(period, now);
  return date <= now && (!start || date >= start);
}

export function isInComparisonPeriod(
  date: Date,
  period: "all" | "weekly" | "daily",
  now: Date
): boolean {
  const currentStart = getCurrentPeriodStart(period, now);
  if (period === "all") {
    return date < new Date(now.getTime() - 7 * DAY_MS);
  }
  const comparisonStart = getQueryStart(period, now);
  return Boolean(
    currentStart &&
      comparisonStart &&
      date >= comparisonStart &&
      date < currentStart
  );
}

export function aggregateTrainingRuns(runs: TrainingRun[]): RankedItem[] {
  const stats = new Map<string, { score: number; bestRun: number; bestStreak: number }>();
  for (const run of runs) {
    const current = stats.get(run.userId) ?? { score: 0, bestRun: 0, bestStreak: 0 };
    current.score += Math.max(0, run.correctAnswers);
    current.bestRun = Math.max(current.bestRun, Math.max(0, run.correctAnswers));
    current.bestStreak = Math.max(current.bestStreak, Math.max(0, run.bestStreak));
    stats.set(run.userId, current);
  }

  return Array.from(stats, ([userId, value]) => ({
    userId,
    score: value.score,
    performance: { kind: "bestRun" as const, value: value.bestRun },
    tieBreakers: [value.bestRun, value.bestStreak],
  }));
}

export function getPersonalBestTrainingScores(
  runs: TimedTrainingScore[]
): PersonalBestScore[] {
  const personalBests = new Map<string, PersonalBestScore>();
  for (const run of runs) {
    const candidate: PersonalBestScore = {
      userId: run.userId,
      score: Math.max(0, run.correctAnswers),
      bestStreak: Math.max(0, run.bestStreak),
      achievedAt: run.achievedAt,
    };
    const current = personalBests.get(run.userId);
    const shouldReplace =
      !current ||
      candidate.score > current.score ||
      (candidate.score === current.score && candidate.bestStreak > current.bestStreak) ||
      (candidate.score === current.score &&
        candidate.bestStreak === current.bestStreak &&
        candidate.achievedAt < current.achievedAt);
    if (shouldReplace) personalBests.set(run.userId, candidate);
  }

  return Array.from(personalBests.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
    const achievedDifference = a.achievedAt.getTime() - b.achievedAt.getTime();
    if (achievedDifference !== 0) return achievedDifference;
    return a.userId.localeCompare(b.userId);
  });
}

export function aggregateDuelResults(
  matches: DuelResult[],
  useBaseRating: boolean
): RankedItem[] {
  const stats = new Map<
    string,
    { ratingChange: number; wins: number; losses: number; draws: number }
  >();
  const ensure = (userId: string) => {
    if (!stats.has(userId)) {
      stats.set(userId, { ratingChange: 0, wins: 0, losses: 0, draws: 0 });
    }
    return stats.get(userId)!;
  };

  for (const match of matches) {
    const player1 = ensure(match.player1Id);
    const player2 = ensure(match.player2Id);
    player1.ratingChange += match.player1RatingChange;
    player2.ratingChange += match.player2RatingChange;

    if (match.isDraw) {
      player1.draws += 1;
      player2.draws += 1;
    } else if (match.winnerId === match.player1Id) {
      player1.wins += 1;
      player2.losses += 1;
    } else if (match.winnerId === match.player2Id) {
      player2.wins += 1;
      player1.losses += 1;
    }
  }

  return Array.from(stats, ([userId, value]) => ({
    userId,
    score: (useBaseRating ? 1000 : 0) + value.ratingChange,
    performance: {
      kind: "duelRecord" as const,
      wins: value.wins,
      losses: value.losses,
      draws: value.draws,
    },
    tieBreakers: [value.wins, -value.losses],
  }));
}

export function aggregateRaceResults(
  results: RaceResult[],
  useBaseRating: boolean
): RankedItem[] {
  const stats = new Map<
    string,
    { ratingChange: number; wins: number; races: number; podiums: number }
  >();
  for (const result of results) {
    const current = stats.get(result.userId) ?? {
      ratingChange: 0,
      wins: 0,
      races: 0,
      podiums: 0,
    };
    current.ratingChange += result.ratingChange;
    current.races += 1;
    if (result.finishPosition === 1) current.wins += 1;
    if (result.finishPosition !== null && result.finishPosition <= 3) current.podiums += 1;
    stats.set(result.userId, current);
  }

  return Array.from(stats, ([userId, value]) => ({
    userId,
    score: (useBaseRating ? 1000 : 0) + value.ratingChange,
    performance: {
      kind: "raceRecord" as const,
      wins: value.wins,
      races: value.races,
    },
    tieBreakers: [value.wins, value.podiums],
  }));
}

export function sortRankedItems(items: RankedItem[]): RankedItem[] {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const tieBreakerCount = Math.max(a.tieBreakers.length, b.tieBreakers.length);
    for (let index = 0; index < tieBreakerCount; index += 1) {
      const difference = (b.tieBreakers[index] ?? 0) - (a.tieBreakers[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return a.userId.localeCompare(b.userId);
  });
}

export function calculateRankTrends(
  currentItems: RankedItem[],
  comparisonItems: RankedItem[]
): Map<string, RankTrend> {
  const trends = new Map<string, RankTrend>();
  if (comparisonItems.length === 0) {
    for (const item of currentItems) trends.set(item.userId, { kind: "unavailable" });
    return trends;
  }

  const comparisonRanks = new Map(
    comparisonItems.map((item, index) => [item.userId, index + 1])
  );
  currentItems.forEach((item, index) => {
    const previousRank = comparisonRanks.get(item.userId);
    if (previousRank === undefined) {
      trends.set(item.userId, { kind: "new" });
      return;
    }
    const places = previousRank - (index + 1);
    if (places > 0) trends.set(item.userId, { kind: "up", places });
    else if (places < 0) trends.set(item.userId, { kind: "down", places: Math.abs(places) });
    else trends.set(item.userId, { kind: "same" });
  });
  return trends;
}
