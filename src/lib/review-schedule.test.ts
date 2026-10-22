import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_CHECK_DAYS, buildReviewSchedule, type ReviewAttempt } from "./review-schedule";

const DAY = 24 * 60 * 60 * 1000;
const start = new Date("2026-10-01T12:00:00Z").getTime();

function attempt(
  day: number,
  isCorrect: boolean,
  { a = 7, b = 8, operation = "×" }: Partial<{ a: number; b: number; operation: string }> = {},
): ReviewAttempt {
  return { operandA: a, operandB: b, operation, isCorrect, createdAt: new Date(start + day * DAY) };
}

const keys = (items: { problem: { a: number; operation: string; b: number } }[]) =>
  items.map(({ problem }) => `${problem.a}${problem.operation}${problem.b}`);

test("problems never missed are not reviewed", () => {
  const schedule = buildReviewSchedule([attempt(0, true), attempt(1, true)], new Date(start + 2 * DAY));
  assert.deepEqual(schedule, { due: [], waiting: [] });
});

test("a miss is due straight away, even if answered right again soon after (a return or a retry)", () => {
  const hours = (n: number) => ({ ...attempt(0, true), createdAt: new Date(start + n * 60 * 60_000) });
  const schedule = buildReviewSchedule([attempt(0, false), hours(0.05), hours(5)], new Date(start + DAY));
  assert.deepEqual(keys(schedule.due), ["7×8"]);
  assert.equal(schedule.due[0].misses, 1);
  assert.deepEqual(keys(buildReviewSchedule([attempt(0, false), hours(6)], new Date(start + DAY)).waiting), ["7×8"]);
});

test("right in a later sitting waits for the check, then clears when right again after it", () => {
  const history = [attempt(0, false), attempt(1, true)];
  const waiting = buildReviewSchedule(history, new Date(start + 2 * DAY));
  assert.deepEqual(keys(waiting.due), []);
  assert.deepEqual(keys(waiting.waiting), ["7×8"]);
  assert.equal(waiting.waiting[0].dueAt.getTime(), start + (1 + REVIEW_CHECK_DAYS) * DAY);

  assert.deepEqual(keys(buildReviewSchedule(history, new Date(start + 5 * DAY)).due), ["7×8"]);
  assert.deepEqual(buildReviewSchedule([...history, attempt(5, true)], new Date(start + 6 * DAY)), { due: [], waiting: [] });
});

test("a right answer before the check is due does not clear it", () => {
  const schedule = buildReviewSchedule([attempt(0, false), attempt(1, true), attempt(2, true)], new Date(start + 3 * DAY));
  assert.deepEqual(keys(schedule.waiting), ["7×8"]);
});

test("missing it again at any stage puts it back to due and counts the miss", () => {
  const schedule = buildReviewSchedule([attempt(0, false), attempt(1, true), attempt(2, false)], new Date(start + 3 * DAY));
  assert.deepEqual(keys(schedule.due), ["7×8"]);
  assert.equal(schedule.due[0].misses, 2);
});

test("7 × 8 and 8 × 7 are one fact, shown the way it was last asked", () => {
  const schedule = buildReviewSchedule([attempt(0, false), attempt(1, false, { a: 8, b: 7 })], new Date(start + 2 * DAY));
  assert.deepEqual(keys(schedule.due), ["8×7"]);
  assert.equal(schedule.due[0].misses, 2);
  assert.equal(schedule.due[0].problem.answer, 56);
});

test("subtraction and division keep their order", () => {
  const schedule = buildReviewSchedule(
    [attempt(0, false, { a: 12, b: 5, operation: "-" }), attempt(1, true, { a: 5, b: 12, operation: "-" })],
    new Date(start + 2 * DAY),
  );
  assert.deepEqual(keys(schedule.due), ["12-5"]);
});

test("most-missed problems come first, then the most recent", () => {
  const schedule = buildReviewSchedule(
    [
      attempt(0, false, { a: 3, b: 4 }),
      attempt(1, false, { a: 6, b: 9 }),
      attempt(2, false, { a: 6, b: 9 }),
      attempt(3, false, { a: 2, b: 13 }),
    ],
    new Date(start + 4 * DAY),
  );
  assert.deepEqual(keys(schedule.due), ["6×9", "2×13", "3×4"]);
});

test("unknown operations and divisions without a whole answer are ignored", () => {
  const schedule = buildReviewSchedule(
    [attempt(0, false, { operation: "%" }), attempt(0, false, { a: 7, b: 2, operation: "÷" })],
    new Date(start + DAY),
  );
  assert.deepEqual(schedule, { due: [], waiting: [] });
});
