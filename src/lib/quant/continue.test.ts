import assert from "node:assert/strict";
import test from "node:test";
import { quantContinue } from "./continue";
import { QUANT_LESSONS } from "./lessons";

const [first, second, third] = QUANT_LESSONS;
const at = (day: number) => new Date(Date.UTC(2026, 9, day));

test("nothing to continue before any quant activity", () => {
  assert.equal(quantContinue([], new Set(), new Set()), null);
  assert.equal(quantContinue([{ lessonId: "not-a-lesson", at: at(1) }], new Set(), new Set()), null);
});

test("the latest lesson: learn it if unread, practise it if read", () => {
  const activity = [{ lessonId: first.id, at: at(1) }, { lessonId: second.id, at: at(3) }];
  assert.deepEqual(quantContinue(activity, new Set(), new Set()), { lessonId: second.id, step: "learn" });
  assert.deepEqual(quantContinue(activity, new Set([second.id]), new Set()), { lessonId: second.id, step: "practice" });
});

test("a mastered lesson points on to the next one not mastered", () => {
  const activity = [{ lessonId: first.id, at: at(5) }];
  assert.deepEqual(quantContinue(activity, new Set(), new Set([first.id, second.id])), { lessonId: third.id, step: "learn" });
  assert.equal(quantContinue(activity, new Set(), new Set(QUANT_LESSONS.map((l) => l.id))), null);
});
