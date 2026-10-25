import assert from "node:assert/strict";
import test from "node:test";
import { PLAN_RIGHT, buildMockPlan, missedLessonIds, planDuration, planStepHref } from "./plan";
import { QUANT_LESSONS, isFreeQuantLesson } from "./lessons";

const free = QUANT_LESSONS.find((l) => isFreeQuantLesson(l.id))!;
const pro = QUANT_LESSONS.filter((l) => !isFreeQuantLesson(l.id));
const [late, early] = [pro.at(-1)!, pro[0]];
const questions = [
  { lessonId: late.id, correct: false },
  { lessonId: free.id, correct: true },
  { lessonId: early.id, correct: false },
  { lessonId: "no-such-lesson", correct: false },
];

test("a plan is the lessons behind the misses, in course order", () => {
  assert.deepEqual(missedLessonIds(questions), [late.id, early.id]);
  const plan = buildMockPlan({ id: "m", score: 48, questions }, new Map(), new Set())!;
  assert.deepEqual(plan.steps.map((s) => s.lessonId), [early.id, late.id]);
  assert.deepEqual(plan.goal, { label: "Pass", min: 70 });
  assert.equal(plan.done, 0);
  assert.ok(plan.steps.every((s) => !s.free && !s.read && s.minutes > 5));
  assert.equal(plan.minutesLeft, plan.steps.reduce((sum, s) => sum + s.minutes, 0));
});

test("a step is done after enough right answers, and reading it shortens it", () => {
  const plan = buildMockPlan({ id: "m", score: 72, questions }, new Map([[early.id, PLAN_RIGHT + 3], [late.id, 1]]), new Set([late.id]))!;
  const [first, second] = plan.steps;
  assert.equal(first.done, true);
  assert.equal(first.right, PLAN_RIGHT);
  assert.equal(second.done, false);
  assert.equal(second.right, 1);
  assert.equal(plan.done, 1);
  assert.equal(plan.minutesLeft, second.minutes);
  assert.equal(plan.goal?.label, "Strong pass");
  assert.equal(planStepHref(second), `/quant/${late.id}?step=practice`);
  assert.equal(planStepHref(first), `/quant/${early.id}`);
});

test("no plan without misses, and no goal past a Strong pass", () => {
  assert.equal(buildMockPlan({ id: "m", score: 100, questions: [{ lessonId: free.id, correct: true }] }, new Map(), new Set()), null);
  assert.equal(buildMockPlan({ id: "m", score: 90, questions: [{ lessonId: free.id, correct: false }] }, new Map(), new Set())!.goal, null);
  assert.deepEqual(missedLessonIds("not a list"), []);
});

test("durations read naturally", () => {
  assert.equal(planDuration(25), "25 min");
  assert.equal(planDuration(60), "1 hr");
  assert.equal(planDuration(72), "1 hr 10 min");
});
