import assert from "node:assert/strict";
import test from "node:test";
import {
  FREE_QUANT_LESSON_IDS,
  QUANT_LESSONS,
  QUANT_LESSON_IDS,
  QUANT_SET_SIZE,
  QUANT_SOLO,
  QUANT_TOPICS,
  createQuantLessonProblems,
  getQuantLesson,
  isQuantLessonMastered,
} from "./lessons";
import { formatAnswer, formatResult, isRightAnswer, value } from "./rational";
import { LESSON_IDS } from "../lessons";
import { sample, seeded } from "./test-helpers";

test("the course has every lesson once, in the order of its IDs", () => {
  assert.deepEqual(
    QUANT_LESSONS.map((lesson) => lesson.id),
    [...QUANT_LESSON_IDS],
  );
});

test("units run Foundations, then Core, then Advanced", () => {
  const order = ["Foundations", "Core", "Advanced"];
  const stages = QUANT_TOPICS.map((unit) => order.indexOf(unit.stage));
  assert.deepEqual(stages, [...stages].sort((a, b) => a - b));
  for (const unit of QUANT_TOPICS) assert.ok(QUANT_LESSONS.some((lesson) => lesson.topic === unit.id), unit.id);
});

test("problems read cleanly, and their working ends on the answer", () => {
  for (const lesson of QUANT_LESSONS) {
    for (const problem of sample(lesson.id, 100)) {
      const label = `${lesson.id} ${problem.key}`;
      assert.ok(!/undefined|NaN|Infinity|\[object/.test(problem.prompt + JSON.stringify(problem.steps)), label);
      assert.ok(problem.prompt.endsWith("?"), label);
      assert.ok(problem.steps.length >= 1, label);
      assert.equal(problem.steps.at(-1)!.result, formatResult(problem.answer, problem.kind), label);
      const v = value(problem.answer);
      if (problem.kind === "probability" || problem.kind === "percent") assert.ok(v > 0 && v < 1, label);
      // The answer as shown is accepted as typed.
      assert.ok(isRightAnswer(formatResult(problem.answer, problem.kind), problem.answer, problem.kind), label);
      const rounded = formatAnswer(problem.answer, problem.kind).split(/[≈=]/).at(-1)!.trim();
      assert.ok(isRightAnswer(rounded, problem.answer, problem.kind), `${label}: ${rounded}`);
    }
  }
});

test("the card-count breakdowns add up", () => {
  for (const problem of sample("equally-likely", 200).filter((p) => p.params.type === "card")) {
    const [ways] = problem.steps;
    const expression = ways.work.replace(/[^0-9+×]/g, "");
    const total = expression.split("+").reduce((sum, term) => sum + term.split("×").reduce((product, n) => product * Number(n), 1), 0);
    assert.equal(String(total), ways.result, problem.key);
  }
});

test("a lesson set is seven different problems, none the worked example", () => {
  for (const lesson of QUANT_LESSONS) {
    for (const seed of [1, 2, 3]) {
      const problems = createQuantLessonProblems(lesson, seeded(seed));
      assert.equal(problems.length, QUANT_SET_SIZE, lesson.id);
      assert.equal(new Set(problems.map((p) => p.key)).size, QUANT_SET_SIZE, lesson.id);
      assert.ok(!problems.some((p) => p.key === lesson.example.key), lesson.id);
    }
  }
});

test("quant lesson IDs never collide with Learning's, since they share the progress table", () => {
  const quantIds: readonly string[] = QUANT_LESSONS.map((lesson) => lesson.id);
  assert.deepEqual(LESSON_IDS.filter((id) => quantIds.includes(id)), []);
});

test("the Foundations units are free, and nothing after them", () => {
  const foundations = QUANT_TOPICS.filter((unit) => unit.stage === "Foundations").map((unit) => unit.id);
  assert.deepEqual(
    [...FREE_QUANT_LESSON_IDS],
    QUANT_LESSONS.filter((lesson) => (foundations as string[]).includes(lesson.topic)).map((lesson) => lesson.id),
  );
  assert.ok(FREE_QUANT_LESSON_IDS.includes("and-events"));
  assert.ok(!FREE_QUANT_LESSON_IDS.includes("conditional-probability"));
});

test("mastery needs four of the five solo problems right first time, within the target", () => {
  const lesson = getQuantLesson("bet-ev")!;
  const at = lesson.targetSeconds;
  assert.ok(isQuantLessonMastered(lesson, { soloCount: QUANT_SOLO, soloFirstTry: 4, soloAverageSeconds: at }));
  assert.ok(!isQuantLessonMastered(lesson, { soloCount: QUANT_SOLO, soloFirstTry: 3, soloAverageSeconds: 1 }));
  assert.ok(!isQuantLessonMastered(lesson, { soloCount: QUANT_SOLO, soloFirstTry: 5, soloAverageSeconds: at + 1 }));
  assert.ok(!isQuantLessonMastered(lesson, { soloCount: 3, soloFirstTry: 3, soloAverageSeconds: 1 }));
});

test("every lesson says what it's for in one short line", () => {
  for (const lesson of QUANT_LESSONS) {
    assert.ok(lesson.benefit.length > 0 && lesson.benefit.length <= 40, `${lesson.id}: "${lesson.benefit}"`);
    assert.ok(!lesson.benefit.endsWith("."), `${lesson.id}: a list line, not a sentence`);
  }
});
