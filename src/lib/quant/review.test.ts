import assert from "node:assert/strict";
import test from "node:test";
import { buildQuantReview, isQuantFamily, quantFamilyTitle } from "./review";
import { QUANT_LESSONS } from "./lessons";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const start = new Date("2026-10-01T09:00:00Z");
const at = (ms: number) => new Date(start.getTime() + ms);
const lesson = QUANT_LESSONS.find((l) => l.puzzles.length > 0)!;
const family = lesson.families[0].id;
const other = lesson.families[1].id;
const puzzle = `puzzle:${lesson.puzzles[0].id}`;

test("only question types and puzzles that exist are reviewable", () => {
  assert.ok(isQuantFamily(lesson.id, family));
  assert.ok(isQuantFamily(lesson.id, puzzle));
  assert.ok(!isQuantFamily(lesson.id, "no-such-type"));
  assert.ok(!isQuantFamily("no-such-lesson", family));
  assert.ok(!isQuantFamily(lesson.id, "puzzle:no-such-puzzle"));
  assert.equal(quantFamilyTitle(lesson.id, family), lesson.families[0].title);
  assert.equal(quantFamilyTitle(lesson.id, puzzle), lesson.puzzles[0].title);
});

test("a missed type is due, clears after a later right answer and a check three days on", () => {
  const miss = { lessonId: lesson.id, family, correct: false, createdAt: at(0) };
  assert.equal(buildQuantReview([miss], at(HOUR)).due.length, 1);

  // Right again in the same sitting doesn't count.
  const soon = { ...miss, correct: true, createdAt: at(HOUR) };
  assert.equal(buildQuantReview([miss, soon], at(2 * HOUR)).due.length, 1);

  // Right the next day moves it to a check, waiting three days.
  const nextDay = { ...miss, correct: true, createdAt: at(DAY) };
  const checking = buildQuantReview([miss, nextDay], at(DAY + HOUR));
  assert.equal(checking.due.length, 0);
  assert.equal(checking.waiting.length, 1);
  assert.equal(buildQuantReview([miss, nextDay], at(4 * DAY + HOUR)).due.length, 1);

  // Right at the check clears it.
  const check = { ...miss, correct: true, createdAt: at(4 * DAY + HOUR) };
  const cleared = buildQuantReview([miss, nextDay, check], at(5 * DAY));
  assert.equal(cleared.due.length + cleared.waiting.length, 0);
});

test("types are kept apart, ordered by misses, and unknown types are dropped", () => {
  const rows = [
    { lessonId: lesson.id, family, correct: false, createdAt: at(0) },
    { lessonId: lesson.id, family: other, correct: false, createdAt: at(HOUR) },
    { lessonId: lesson.id, family: other, correct: false, createdAt: at(2 * HOUR) },
    { lessonId: lesson.id, family: "retired-type", correct: false, createdAt: at(3 * HOUR) },
    { lessonId: lesson.id, family: puzzle, correct: true, createdAt: at(3 * HOUR) },
  ];
  const { due } = buildQuantReview(rows, at(DAY));
  assert.deepEqual(
    due.map((entry) => [entry.item.family, entry.misses]),
    [
      [other, 2],
      [family, 1],
    ],
  );
});
