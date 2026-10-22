import type { Problem } from "@/components/training/training-types";
import { LESSONS, type LessonId } from "./lessons";
import { answerFor, buildReviewSchedule, factKey, type ReviewAttempt } from "./review-schedule";

/**
 * The daily session (Pro): about five minutes built from the player's own history. Past
 * misses that are due come first, then a check on a few mastered lessons, then the facts
 * they answer right but slowly. Anything short of DAILY_SIZE is filled with a general mix.
 */

export const DAILY_SIZE = 20;
const REVIEW_MAX = 8;
const LESSON_CHECKS = 3;
const WEAK_MAX = 6;
/** Slow means this much slower than the player's usual time for the operation. */
const SLOW_RATIO = 1.3;
const WEAK_MIN_ATTEMPTS = 2;
/** The comparison on results: today against the first few daily sessions. */
const BASELINE_SESSIONS = 3;

export type DailySection = "review" | "lesson" | "weak" | "mix";

export type DailyItem = { problem: Problem; section: DailySection; lessonId?: LessonId };

export type DailyAttempt = ReviewAttempt & { timeTaken: number };

function median(values: number[]) {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Facts the player gets right but slowly: their average correct time is well above their
 * usual time for that operation. Slowest (relative to usual) first.
 */
export function findWeakSpots(attempts: DailyAttempt[], exclude: Set<string>, max = WEAK_MAX): Problem[] {
  const byOperation = new Map<string, number[]>();
  const facts = new Map<string, { latest: DailyAttempt; times: number[]; attempts: number }>();
  for (const attempt of attempts) {
    if (answerFor(attempt.operandA, attempt.operandB, attempt.operation) === null) continue;
    const key = factKey(attempt.operandA, attempt.operandB, attempt.operation);
    const fact = facts.get(key) ?? { latest: attempt, times: [], attempts: 0 };
    fact.attempts += 1;
    if (attempt.createdAt >= fact.latest.createdAt) fact.latest = attempt;
    if (attempt.isCorrect && attempt.timeTaken > 0) {
      fact.times.push(attempt.timeTaken);
      byOperation.set(attempt.operation, [...(byOperation.get(attempt.operation) ?? []), attempt.timeTaken]);
    }
    facts.set(key, fact);
  }

  const usual = new Map([...byOperation].map(([operation, times]) => [operation, median(times)]));
  return [...facts]
    .filter(([key, fact]) => !exclude.has(key) && fact.attempts >= WEAK_MIN_ATTEMPTS && fact.times.length > 0)
    .map(([, fact]) => ({
      fact,
      ratio: fact.times.reduce((a, b) => a + b, 0) / fact.times.length / usual.get(fact.latest.operation)!,
    }))
    .filter(({ ratio }) => ratio >= SLOW_RATIO)
    .sort((x, y) => y.ratio - x.ratio)
    .slice(0, max)
    .map(({ fact: { latest } }) => ({
      a: latest.operandA,
      b: latest.operandB,
      operation: latest.operation as Problem["operation"],
      answer: answerFor(latest.operandA, latest.operandB, latest.operation)!,
    }));
}

/** The lessons to check today: a few mastered ones, rotating through them day by day. */
export function pickLessonChecks(mastered: LessonId[], day: number, count = LESSON_CHECKS): LessonId[] {
  const ordered = LESSONS.map((lesson) => lesson.id).filter((id) => mastered.includes(id));
  if (ordered.length <= count) return ordered;
  const start = (day * count) % ordered.length;
  return Array.from({ length: count }, (_, index) => ordered[(start + index) % ordered.length]);
}

/** Today's session, before any general mix is added to fill it up. */
export function buildDailyPlan({
  attempts,
  mastered,
  day,
  now,
  random = Math.random,
}: {
  attempts: DailyAttempt[];
  mastered: LessonId[];
  /** The player's local day number, which rotates the lesson checks. */
  day: number;
  now: Date;
  random?: () => number;
}): DailyItem[] {
  const due = buildReviewSchedule(attempts, now).due;
  const review = due.slice(0, REVIEW_MAX).map(({ problem }): DailyItem => ({ problem, section: "review" }));
  // Facts already due for review aren't also weak spots.
  const taken = new Set(due.map(({ problem }) => factKey(problem.a, problem.b, problem.operation)));
  const lessons = pickLessonChecks(mastered, day).map((lessonId): DailyItem => ({
    problem: LESSONS.find((lesson) => lesson.id === lessonId)!.generate(random),
    section: "lesson",
    lessonId,
  }));
  for (const { problem } of lessons) taken.add(factKey(problem.a, problem.b, problem.operation));
  const weak = findWeakSpots(attempts, taken).map((problem): DailyItem => ({ problem, section: "weak" }));
  return [...review, ...lessons, ...weak].slice(0, DAILY_SIZE);
}

/** Consecutive days with a daily session, ending today (or yesterday, if today isn't done yet). */
export function dailyStreak(days: number[], today: number): number {
  const done = new Set(days);
  let day = done.has(today) ? today : today - 1;
  let streak = 0;
  while (done.has(day)) {
    streak += 1;
    day -= 1;
  }
  return streak;
}

/** The last seven days, oldest first: whether each had a daily session. */
export function lastSevenDays(days: number[], today: number): boolean[] {
  const done = new Set(days);
  return Array.from({ length: 7 }, (_, index) => done.has(today - 6 + index));
}

/**
 * What today is compared with: the average time of the player's first few daily sessions,
 * once they have that many before today.
 */
export function dailyBaseline(sessions: { day: number; averageSeconds: number | null }[], today: number) {
  const earlier = sessions
    .filter((session) => session.day < today && session.averageSeconds !== null)
    .sort((x, y) => x.day - y.day)
    .slice(0, BASELINE_SESSIONS);
  if (earlier.length < BASELINE_SESSIONS) return null;
  return earlier.reduce((sum, session) => sum + session.averageSeconds!, 0) / earlier.length;
}
