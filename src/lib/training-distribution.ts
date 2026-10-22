import { getCached } from "@/lib/server-cache";
import { loadScoreCounts } from "@/lib/leaderboard-queries";

const MAX_BUCKET_COUNT = 48;
// Same as the all-time leaderboard: past this, a guest's unverified runs are left out.
const MAX_LEGACY_GUEST_TOTAL = 5000;

type ScoreCount = { score: number; count: number };

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

// Scores arrive as (score, how many runs ended on it), sorted by score.

function getBucketSize(counts: ScoreCount[]): number {
  if (counts.length === 0) return 1;
  const range = counts[counts.length - 1].score - counts[0].score + 1;
  return Math.max(1, Math.ceil(range / MAX_BUCKET_COUNT));
}

function bucketize(counts: ScoreCount[], bucketSize: number): DistributionBucket[] {
  if (counts.length === 0) return [];
  const countsByFrom = new Map<number, DistributionBucket>();
  let minFrom = Number.POSITIVE_INFINITY;
  let maxFrom = 0;
  for (const { score, count } of counts) {
    const from = Math.floor(Math.max(0, Math.floor(score)) / bucketSize) * bucketSize;
    const to = from + bucketSize - 1;
    minFrom = Math.min(minFrom, from);
    maxFrom = Math.max(maxFrom, from);
    const existing = countsByFrom.get(from) ?? { from, to, count: 0 };
    existing.count += count;
    countsByFrom.set(from, existing);
  }

  const buckets: DistributionBucket[] = [];
  for (let from = minFrom; from <= maxFrom; from += bucketSize) {
    const to = from + bucketSize - 1;
    buckets.push(countsByFrom.get(from) ?? { from, to, count: 0 });
  }
  return buckets;
}

/** The score at a 0-based position in the sorted list of every run. */
function scoreAt(counts: ScoreCount[], position: number): number {
  let seen = 0;
  for (const { score, count } of counts) {
    seen += count;
    if (position < seen) return score;
  }
  return counts[counts.length - 1].score;
}

export function summarizeScoreCounts(counts: ScoreCount[]): DistributionResult {
  const total = counts.reduce((sum, { count }) => sum + count, 0);
  if (total === 0) {
    return { buckets: [], total: 0, median: null, mean: null, stdDev: null };
  }
  const midpoint = Math.floor(total / 2);
  const median =
    total % 2 === 1 ? scoreAt(counts, midpoint) : (scoreAt(counts, midpoint - 1) + scoreAt(counts, midpoint)) / 2;
  const mean = counts.reduce((sum, { score, count }) => sum + score * count, 0) / total;
  const variance = counts.reduce((sum, { score, count }) => sum + (score - mean) ** 2 * count, 0) / total;
  return {
    buckets: bucketize(counts, getBucketSize(counts)),
    total,
    median,
    mean,
    stdDev: Math.sqrt(variance),
  };
}

// The distribution is the same for every viewer and counts every timed run, so it is cached
// briefly. A new score shifts it by at most one run, which the placement card tolerates.
const DISTRIBUTION_TTL_SECONDS = 30;

export function getTrainingDistribution(): Promise<DistributionResult> {
  return getCached("training-distribution", DISTRIBUTION_TTL_SECONDS, loadTrainingDistribution);
}

async function loadTrainingDistribution(): Promise<DistributionResult> {
  return summarizeScoreCounts(await loadScoreCounts(MAX_LEGACY_GUEST_TOTAL));
}
