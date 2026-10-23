import type { Operation, Problem } from "@/components/training/training-types";

/** Misses older than this drop out of review. */
export const REVIEW_LOOKBACK_DAYS = 60;
/**
 * A right answer only counts toward clearing a miss this long after it: a separate sitting,
 * not the same set's return or an immediate retry with the answer still in mind.
 */
const RECALL_GAP_MS = 6 * 60 * 60 * 1000;
/** After a problem is answered right in a later sitting, it is checked once more this much later. */
export const REVIEW_CHECK_DAYS = 3;
/** Most problems in one review set. */
export const REVIEW_SET_MAX = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const ANSWERS: Record<string, (a: number, b: number) => number> = {
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => a / b,
};

export type ReviewAttempt = {
  operandA: number;
  operandB: number;
  operation: string;
  isCorrect: boolean;
  createdAt: Date;
};

export type ReviewItem = {
  problem: Problem;
  misses: number;
  lastMissedAt: Date;
  /** When the problem is (or was) next due. */
  dueAt: Date;
};

export type ReviewSchedule = {
  /** Due now: most-missed first, then most recently missed. */
  due: ReviewItem[];
  /** Answered right since the miss, waiting for the later check, soonest first. */
  waiting: ReviewItem[];
};

// 7 × 8 and 8 × 7 are the same fact, as in Weak Points.
export function factKey(a: number, b: number, operation: string) {
  if (operation === "+" || operation === "×") {
    const [low, high] = a <= b ? [a, b] : [b, a];
    return `${low}${operation}${high}`;
  }
  return `${a}${operation}${b}`;
}

/** The answer to a stored attempt's problem, or null if the trainer can't ask it again. */
export function answerFor(operandA: number, operandB: number, operation: string): number | null {
  const answer = ANSWERS[operation]?.(operandA, operandB);
  return answer === undefined || !Number.isInteger(answer) ? null : answer;
}

/** One answer to something that can be reviewed, under a key that says what it was. */
export type KeyedAttempt<T> = { key: string; isCorrect: boolean; createdAt: Date; item: T };

export type ScheduledMiss<T> = {
  /** The item as it was last asked. */
  item: T;
  misses: number;
  lastMissedAt: Date;
  /** When it is (or was) next due. */
  dueAt: Date;
};

type Track<T> = {
  latest: KeyedAttempt<T>;
  misses: number;
  lastMiss: KeyedAttempt<T>;
  /** missed: due now. checking: answered right in a later sitting, due again at dueAt. */
  stage: "missed" | "checking" | "cleared";
  dueAt: Date;
};

/**
 * Works out which past misses are due for review. A miss is due straight away. Answering it
 * right in a later sitting (RECALL_GAP_MS after the miss) moves it to a check
 * REVIEW_CHECK_DAYS later, and answering it right at or after that clears it. Missing it
 * again at any point puts it back to due. Shared by arithmetic facts and quant question types.
 */
export function scheduleMisses<T>(attempts: KeyedAttempt<T>[], now: Date): { due: ScheduledMiss<T>[]; waiting: ScheduledMiss<T>[] } {
  const sorted = [...attempts].sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime());
  const tracks = new Map<string, Track<T>>();

  for (const attempt of sorted) {
    const track = tracks.get(attempt.key);
    if (!attempt.isCorrect) {
      tracks.set(attempt.key, {
        latest: attempt,
        misses: (track?.misses ?? 0) + 1,
        lastMiss: attempt,
        stage: "missed",
        dueAt: attempt.createdAt,
      });
      continue;
    }
    // A right answer only matters for something that has been missed.
    if (!track) continue;
    track.latest = attempt;
    const sinceMiss = attempt.createdAt.getTime() - track.lastMiss.createdAt.getTime();
    if (track.stage === "missed" && sinceMiss >= RECALL_GAP_MS) {
      track.stage = "checking";
      track.dueAt = new Date(attempt.createdAt.getTime() + REVIEW_CHECK_DAYS * DAY_MS);
    } else if (track.stage === "checking" && attempt.createdAt >= track.dueAt) {
      track.stage = "cleared";
    }
  }

  const due: ScheduledMiss<T>[] = [];
  const waiting: ScheduledMiss<T>[] = [];
  for (const track of tracks.values()) {
    if (track.stage === "cleared") continue;
    const entry = { item: track.latest.item, misses: track.misses, lastMissedAt: track.lastMiss.createdAt, dueAt: track.dueAt };
    if (track.stage === "missed" || track.dueAt <= now) due.push(entry);
    else waiting.push(entry);
  }
  due.sort((x, y) => y.misses - x.misses || y.lastMissedAt.getTime() - x.lastMissedAt.getTime());
  waiting.sort((x, y) => x.dueAt.getTime() - y.dueAt.getTime());
  return { due, waiting };
}

/** Past arithmetic misses due for review, by fact (7 × 8 and 8 × 7 together). */
export function buildReviewSchedule(attempts: ReviewAttempt[], now: Date): ReviewSchedule {
  const keyed = attempts
    // Only problems the trainer can ask again: a known operation with a whole-number answer.
    .filter((attempt) => answerFor(attempt.operandA, attempt.operandB, attempt.operation) !== null)
    .map((attempt) => ({ key: factKey(attempt.operandA, attempt.operandB, attempt.operation), isCorrect: attempt.isCorrect, createdAt: attempt.createdAt, item: attempt }));
  const { due, waiting } = scheduleMisses(keyed, now);
  const toItem = (entry: ScheduledMiss<ReviewAttempt>): ReviewItem => ({
    // The way round it was last asked.
    problem: {
      a: entry.item.operandA,
      b: entry.item.operandB,
      operation: entry.item.operation as Operation,
      answer: ANSWERS[entry.item.operation](entry.item.operandA, entry.item.operandB),
    },
    misses: entry.misses,
    lastMissedAt: entry.lastMissedAt,
    dueAt: entry.dueAt,
  });
  return { due: due.map(toItem), waiting: waiting.map(toItem) };
}
