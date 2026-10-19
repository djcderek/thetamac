import { db } from "@/lib/db";
import { standardTimedSessionWhere } from "@/lib/standard-timed-sessions";
import { getCached } from "@/lib/server-cache";
import { isGuestLeaderboardId } from "@/lib/leaderboard-ranking";

const MAX_BUCKET_COUNT = 48;
const MAX_LEGACY_GUEST_SCORE_PER_RUN = 500;
const MAX_LEGACY_GUEST_TOTAL = 5000;

type GuestScoreRow = {
  guestId: string;
  identityVerified: boolean;
  totalProblems: number;
  correctAnswers: number;
};

export interface DistributionBucket {
  from: number;
  to: number;
  count: number;
}

export interface DistributionResult {
  buckets: DistributionBucket[];
  total: number;
  median: number | null;
  mean: number | null;
  stdDev: number | null;
}

function isImplausibleLegacyGuestRun(score: GuestScoreRow): boolean {
  if (score.identityVerified) return false;
  if (score.totalProblems < 0 || score.correctAnswers < 0) return true;
  if (score.totalProblems > MAX_LEGACY_GUEST_SCORE_PER_RUN) return true;
  if (score.correctAnswers > MAX_LEGACY_GUEST_SCORE_PER_RUN) return true;
  return score.correctAnswers > score.totalProblems;
}

function getBucketSize(scores: number[]): number {
  if (scores.length === 0) return 1;
  const range = Math.max(...scores) - Math.min(...scores) + 1;
  return Math.max(1, Math.ceil(range / MAX_BUCKET_COUNT));
}

function bucketize(scores: number[], bucketSize: number): DistributionBucket[] {
  if (scores.length === 0) return [];
  const countsByFrom = new Map<number, DistributionBucket>();
  let minFrom = Number.POSITIVE_INFINITY;
  let maxFrom = 0;
  for (const score of scores) {
    const from = Math.floor(Math.max(0, Math.floor(score)) / bucketSize) * bucketSize;
    const to = from + bucketSize - 1;
    minFrom = Math.min(minFrom, from);
    maxFrom = Math.max(maxFrom, from);
    const existing = countsByFrom.get(from) ?? { from, to, count: 0 };
    existing.count += 1;
    countsByFrom.set(from, existing);
  }

  const buckets: DistributionBucket[] = [];
  for (let from = minFrom; from <= maxFrom; from += bucketSize) {
    const to = from + bucketSize - 1;
    buckets.push(countsByFrom.get(from) ?? { from, to, count: 0 });
  }
  return buckets;
}

function getMedian(scores: number[]): number | null {
  if (scores.length === 0) return null;
  const sorted = [...scores].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[midpoint]
    : (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function getMean(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

function getStdDev(scores: number[], mean: number | null): number | null {
  if (scores.length === 0 || mean === null) return null;
  const variance =
    scores.reduce((total, score) => total + (score - mean) ** 2, 0) / scores.length;
  return Math.sqrt(variance);
}

// The distribution is the same for every viewer and scans every timed run, so it is cached
// briefly. A new score shifts it by at most one run, which the placement card tolerates.
const DISTRIBUTION_TTL_SECONDS = 30;

export function getTrainingDistribution(): Promise<DistributionResult> {
  return getCached("training-distribution", DISTRIBUTION_TTL_SECONDS, loadTrainingDistribution);
}

async function loadTrainingDistribution(): Promise<DistributionResult> {
  const [sessions, guestSessions] = await Promise.all([
    db.trainingSession.findMany({
      where: {
        ...standardTimedSessionWhere,
        completedAt: { not: null },
      },
      select: { correctAnswers: true, totalProblems: true },
    }),
    db.guestTrainingScore.findMany({
      select: {
        guestId: true,
        identityVerified: true,
        totalProblems: true,
        correctAnswers: true,
      },
    }),
  ]);

  const legacyGuestTotals = new Map<string, number>();
  for (const guest of guestSessions) {
    if (!isImplausibleLegacyGuestRun(guest) && !guest.identityVerified) {
      legacyGuestTotals.set(
        guest.guestId,
        (legacyGuestTotals.get(guest.guestId) ?? 0) + guest.correctAnswers
      );
    }
  }

  const scores = sessions.map(
    (session) => session.correctAnswers ?? session.totalProblems ?? 0
  );
  for (const guest of guestSessions) {
    if (!isGuestLeaderboardId(guest.guestId) || isImplausibleLegacyGuestRun(guest)) continue;
    if (
      !guest.identityVerified &&
      (legacyGuestTotals.get(guest.guestId) ?? 0) > MAX_LEGACY_GUEST_TOTAL
    ) {
      continue;
    }
    scores.push(guest.correctAnswers ?? 0);
  }

  if (scores.length === 0) {
    return { buckets: [], total: 0, median: null, mean: null, stdDev: null };
  }
  const mean = getMean(scores);
  return {
    buckets: bucketize(scores, getBucketSize(scores)),
    total: scores.length,
    median: getMedian(scores),
    mean,
    stdDev: getStdDev(scores, mean),
  };
}
