import assert from "node:assert/strict";
import test from "node:test";
import {
  DAILY_SIZE,
  buildDailyPlan,
  dailyBaseline,
  dailyStreak,
  findWeakSpots,
  lastSevenDays,
  pickLessonChecks,
  type DailyAttempt,
} from "./daily-session";

const DAY = 24 * 60 * 60 * 1000;
const start = new Date("2026-10-01T12:00:00Z").getTime();

function attempt(
  day: number,
  a: number,
  operation: string,
  b: number,
  { isCorrect = true, timeTaken = 2 }: Partial<{ isCorrect: boolean; timeTaken: number }> = {},
): DailyAttempt {
  return { operandA: a, operandB: b, operation, isCorrect, timeTaken, createdAt: new Date(start + day * DAY) };
}

const keys = (problems: { a: number; operation: string; b: number }[]) =>
  problems.map((p) => `${p.a}${p.operation}${p.b}`);

test("weak spots are facts answered right but well above the usual time for the operation", () => {
  const attempts = [
    ...[3, 4, 5, 6].map((n) => attempt(0, n, "×", 3, { timeTaken: 2 })),
    attempt(0, 7, "×", 8, { timeTaken: 5 }),
    attempt(1, 8, "×", 7, { timeTaken: 6 }),
    // Slow but only seen once: not enough to call it a weak spot.
    attempt(1, 9, "×", 6, { timeTaken: 9 }),
    // Additions are compared with additions, not with multiplication.
    attempt(0, 40, "+", 3, { timeTaken: 1 }),
    attempt(1, 40, "+", 3, { timeTaken: 1 }),
  ];
  assert.deepEqual(keys(findWeakSpots(attempts, new Set())), ["8×7"]);
  assert.deepEqual(findWeakSpots(attempts, new Set(["7×8"])), []);
});

test("lesson checks rotate through mastered lessons, a few a day", () => {
  const mastered = ["make-ten", "count-up", "times-9", "times-11", "times-5"] as const;
  assert.deepEqual(pickLessonChecks([...mastered], 0), ["make-ten", "count-up", "times-9"]);
  assert.deepEqual(pickLessonChecks([...mastered], 1), ["times-11", "times-5", "make-ten"]);
  assert.deepEqual(pickLessonChecks(["times-9"], 4), ["times-9"]);
  assert.deepEqual(pickLessonChecks([], 4), []);
});

test("the plan puts due misses first, then lesson checks, then weak spots, without repeats", () => {
  const attempts = [
    attempt(0, 12, "-", 5, { isCorrect: false }),
    ...[3, 4, 5, 6].map((n) => attempt(0, n, "×", 3)),
    attempt(0, 7, "×", 8, { timeTaken: 6 }),
    attempt(1, 7, "×", 8, { timeTaken: 6 }),
    // Missed and slow: it is due for review, so it isn't a weak spot as well.
    attempt(1, 6, "×", 9, { isCorrect: false }),
    attempt(1, 6, "×", 9, { timeTaken: 9 }),
  ];
  const plan = buildDailyPlan({ attempts, mastered: ["times-9"], day: 3, now: new Date(start + 2 * DAY), random: () => 0.5 });
  assert.deepEqual(plan.map((item) => item.section), ["review", "review", "lesson", "weak"]);
  assert.deepEqual(keys(plan.filter((item) => item.section === "review").map((item) => item.problem)).sort(), ["12-5", "6×9"]);
  assert.equal(plan[2].lessonId, "times-9");
  assert.deepEqual(keys([plan[3].problem]), ["7×8"]);
});

test("a long history still makes one session", () => {
  const attempts = Array.from({ length: 60 }, (_, n) => attempt(0, n + 2, "+", 13, { isCorrect: false }));
  assert.ok(buildDailyPlan({ attempts, mastered: [], day: 1, now: new Date(start + DAY) }).length <= DAILY_SIZE);
});

test("the streak counts back from today, or from yesterday while today is still to do", () => {
  assert.equal(dailyStreak([10, 11, 12], 12), 3);
  assert.equal(dailyStreak([10, 11, 12], 13), 3);
  assert.equal(dailyStreak([10, 11, 12], 14), 0);
  assert.equal(dailyStreak([8, 10, 11], 11), 2);
  assert.deepEqual(lastSevenDays([10, 12], 12), [false, false, false, false, true, false, true]);
});

test("today is compared with the first three daily sessions once there are three before it", () => {
  const sessions = [
    { day: 1, averageSeconds: 3 },
    { day: 2, averageSeconds: null },
    { day: 3, averageSeconds: 2 },
    { day: 5, averageSeconds: 4 },
    { day: 9, averageSeconds: 1 },
  ];
  assert.equal(dailyBaseline(sessions, 5), null);
  assert.equal(dailyBaseline(sessions, 9), 3);
});
