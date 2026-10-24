import { summarizeScoreCounts, type DistributionBucket } from "./score-summary";
import { TIMED_MODE_LIMITS } from "./training-settings";

/**
 * Where a timed run places among everyone else's runs on the same settings: difficulty,
 * operations and time limit. Custom ranges differ run to run, so those runs aren't compared.
 * A stopped run is placed by its pace: its score scaled up to the full time limit.
 */

export const OPERATIONS = ["+", "-", "×", "÷"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
export type Operation = (typeof OPERATIONS)[number];
export type TimedSetup = { difficulty: (typeof DIFFICULTIES)[number]; operations: Operation[]; timeLimitSeconds: number };

/** Runs needed before a placement means much, and how many different players they come from. */
export const MIN_RUNS = 30;
export const MIN_PLAYERS = 8;
/** Each player counts for at most this many of their latest runs, so heavy players don't set the curve. */
export const RUNS_PER_PLAYER = 20;
/** A stopped run needs this long, and this many answers, before its pace says anything. */
export const MIN_PACE_SECONDS = 20;
export const MIN_PACE_ANSWERS = 3;
/** A run counts as played to the end when it lasted at least its limit less this. */
export const FULL_RUN_SLACK_SECONDS = 3;

/** Operations in a fixed order, so the same set is always the same setup. */
export function canonicalOperations(operations: readonly string[]): Operation[] {
  return OPERATIONS.filter((op) => operations.includes(op));
}

export function parseTimedSetup(input: { difficulty?: string | null; operations?: string | null; timeLimitSeconds?: string | null }): TimedSetup | null {
  const difficulty = DIFFICULTIES.find((d) => d === input.difficulty);
  const limit = Number(input.timeLimitSeconds);
  const listed = (input.operations ?? "").split(",").filter(Boolean);
  const operations = canonicalOperations(listed);
  if (!difficulty || !TIMED_MODE_LIMITS.includes(limit) || operations.length === 0 || operations.length !== new Set(listed).size) return null;
  return { difficulty, operations, timeLimitSeconds: limit };
}

export const setupKey = (setup: TimedSetup) => `${setup.difficulty}:${setup.operations.join("")}:${setup.timeLimitSeconds}`;

/** A stopped run's score, scaled up to the full time limit at the same pace. */
export function projectScore(correct: number, elapsedSeconds: number, timeLimitSeconds: number): number {
  return Math.round((correct * timeLimitSeconds) / Math.max(elapsedSeconds, 1));
}

export type ScoreCount = { score: number; count: number };

export type Placement =
  | {
      available: true;
      /** Share of runs this one beats, counting ties as half: 0 to 100. */
      percentile: number;
      /** The score placed: the run's own, or its pace scaled to the full time. */
      score: number;
      basis: "score" | "pace";
      runs: number;
      players: number;
      median: number | null;
      buckets: DistributionBucket[];
      maxCount: number;
      userBucketIndex: number;
    }
  | { available: false; reason: "not_enough_runs" | "too_short"; runs: number; players: number };

/** The percentile of `score` among the counted runs: runs below it, plus half of those level with it. */
export function percentileOf(counts: ScoreCount[], score: number): number {
  let below = 0;
  let level = 0;
  let total = 0;
  for (const { score: s, count } of counts) {
    total += count;
    if (s < score) below += count;
    else if (s === score) level += count;
  }
  return total ? ((below + level / 2) / total) * 100 : 0;
}

export function placeRun(
  counts: ScoreCount[],
  players: number,
  run: { correct: number; elapsedSeconds: number | null; timeLimitSeconds: number },
): Placement {
  const runs = counts.reduce((sum, { count }) => sum + count, 0);
  if (runs < MIN_RUNS || players < MIN_PLAYERS) return { available: false, reason: "not_enough_runs", runs, players };

  const stopped = run.elapsedSeconds !== null && run.elapsedSeconds < run.timeLimitSeconds - FULL_RUN_SLACK_SECONDS;
  if (stopped && (run.elapsedSeconds! < MIN_PACE_SECONDS || run.correct < MIN_PACE_ANSWERS)) {
    return { available: false, reason: "too_short", runs, players };
  }
  const score = stopped ? projectScore(run.correct, run.elapsedSeconds!, run.timeLimitSeconds) : run.correct;
  const summary = summarizeScoreCounts(counts);
  const index = summary.buckets.findIndex((bucket) => score <= bucket.to);
  return {
    available: true,
    percentile: Math.round(percentileOf(counts, score) * 10) / 10,
    score,
    basis: stopped ? "pace" : "score",
    runs,
    players,
    median: summary.median,
    buckets: summary.buckets,
    maxCount: summary.buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0),
    userBucketIndex: index === -1 ? summary.buckets.length - 1 : index,
  };
}

export type PlacementResponse = Placement;

const LIMIT_LABELS: Record<number, string> = { 60: "1:00", 120: "2:00", 180: "3:00", 300: "5:00" };
const OPERATION_LABELS: Record<Operation, string> = { "+": "+", "-": "−", "×": "×", "÷": "÷" };

/** The settings a placement is for, as the results screen names them: "Medium · 2:00 · + − × ÷". */
export function describeTimedSetup(difficulty: string, operations: readonly string[], timeLimitSeconds: number): string {
  const level = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  return `${level} · ${LIMIT_LABELS[timeLimitSeconds] ?? `${timeLimitSeconds}s`} · ${canonicalOperations(operations).map((op) => OPERATION_LABELS[op]).join(" ")}`;
}
