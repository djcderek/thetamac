import assert from "node:assert/strict";
import test from "node:test";
import { buildQuantMarks } from "./progress";
import { QUANT_LESSONS } from "./lessons";

const lesson = QUANT_LESSONS.find((l) => l.puzzles.length > 0)!;
const [a, b] = lesson.families;
const puzzle = lesson.puzzles[0];

test("a right answer marks a type solved, whatever order the answers came in", () => {
  const marks = buildQuantMarks([
    { lessonId: lesson.id, family: a.id, correct: true },
    { lessonId: lesson.id, family: a.id, correct: false },
    { lessonId: lesson.id, family: b.id, correct: false },
  ]);
  assert.deepEqual(marks.types[lesson.id], { [a.id]: "solved", [b.id]: "tried" });
});

test("puzzles are kept apart, and types no longer in the course drop out", () => {
  const marks = buildQuantMarks([
    { lessonId: lesson.id, family: `puzzle:${puzzle.id}`, correct: false },
    { lessonId: lesson.id, family: "gone", correct: true },
    { lessonId: "gone", family: a.id, correct: true },
  ]);
  assert.deepEqual(marks.puzzles, { [puzzle.id]: "tried" });
  assert.deepEqual(marks.types, {});
});
