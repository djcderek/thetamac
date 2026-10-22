import assert from "node:assert/strict";
import test from "node:test";
import {
  FREE_LESSON_COUNT,
  LESSONS,
  LESSON_IDS,
  LESSON_SET_SIZE,
  createLessonProblems,
  findLessonFor,
  getLesson,
  isFreeLesson,
  isLessonMastered,
  mergeLessonProgress,
} from "./lessons";

// A seeded random, so a failure can be replayed.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const OPS: Record<string, (a: number, b: number) => number> = {
  "+": (a, b) => a + b,
  "−": (a, b) => a - b,
  "×": (a, b) => a * b,
  "÷": (a, b) => a / b,
};

test("every lesson's problems fit its trick, and its steps add up to the answer", () => {
  const random = seeded(7);
  for (const lesson of LESSONS) {
    for (let i = 0; i < 400; i++) {
      const problem = lesson.generate(random);
      const label = `${lesson.id}: ${problem.a} ${problem.operation} ${problem.b}`;
      assert.equal(problem.operation, lesson.operation, label);
      assert.ok(Number.isInteger(problem.answer) && problem.answer > 0, label);
      assert.ok(lesson.matches(problem), label);
      const steps = lesson.steps(problem);
      assert.equal(steps.at(-1)!.result, problem.answer, label);
      for (const step of steps) {
        // Each "x op y" line of working is itself right.
        const m = step.work.match(/^(\d+) ([+−×÷]) (\d+)$/);
        if (m) assert.equal(OPS[m[2]](+m[1], +m[3]), step.result, `${label} / ${step.work}`);
        assert.ok(step.result > 0, `${label} / ${step.work}`);
      }
    }
  }
});

test("the worked examples are lesson problems too", () => {
  for (const lesson of LESSONS) {
    assert.ok(lesson.matches(lesson.example), lesson.id);
    assert.equal(lesson.steps(lesson.example).at(-1)!.result, lesson.example.answer, lesson.id);
  }
});

test("a lesson set is ten different problems", () => {
  for (const lesson of LESSONS) {
    const problems = createLessonProblems(lesson, seeded(3));
    assert.equal(problems.length, LESSON_SET_SIZE, lesson.id);
    assert.equal(new Set(problems.map((p) => `${p.a}${p.operation}${p.b}`)).size, LESSON_SET_SIZE, lesson.id);
  }
});

test("problems from anywhere find the trick that fits, most specific first", () => {
  const find = (a: number, operation: "+" | "-" | "×" | "÷", b: number) =>
    findLessonFor({ a, b, operation, answer: OPS[operation === "-" ? "−" : operation](a, b) })?.id ?? null;
  assert.equal(find(47, "+", 8), "make-ten");
  assert.equal(find(8, "+", 47), "make-ten");
  assert.equal(find(83, "-", 47), "count-up");
  assert.equal(find(82, "-", 29), "round-up-subtract");
  assert.equal(find(9, "×", 47), "times-9");
  assert.equal(find(45, "×", 45), "square-5");
  assert.equal(find(43, "×", 11), "times-11");
  assert.equal(find(34, "×", 7), "break-apart");
  assert.equal(find(345, "÷", 5), "divide-5");
  // Times tables and easy sums have no trick to teach.
  assert.equal(find(7, "×", 8), null);
  assert.equal(find(3, "+", 4), null);
  assert.equal(find(56, "÷", 8), null);
});

test("the first lessons are free and the rest are Pro", () => {
  assert.deepEqual(LESSON_IDS.filter(isFreeLesson), LESSON_IDS.slice(0, FREE_LESSON_COUNT));
  assert.equal(getLesson("nope"), null);
});

test("mastery needs nearly all of the solo problems right first time, within the target", () => {
  const lesson = getLesson("times-9")!;
  assert.ok(isLessonMastered(lesson, { soloCount: 7, soloFirstTry: 6, soloAverageSeconds: lesson.targetSeconds }));
  assert.ok(!isLessonMastered(lesson, { soloCount: 7, soloFirstTry: 5, soloAverageSeconds: 1 }));
  assert.ok(!isLessonMastered(lesson, { soloCount: 7, soloFirstTry: 7, soloAverageSeconds: lesson.targetSeconds + 0.1 }));
  // A lesson stopped early can't be mastered.
  assert.ok(!isLessonMastered(lesson, { soloCount: 4, soloFirstTry: 4, soloAverageSeconds: 1 }));
  assert.ok(!isLessonMastered(lesson, { soloCount: 7, soloFirstTry: 0, soloAverageSeconds: null }));
});

test("saved progress keeps the best run and stays mastered", () => {
  const lesson = getLesson("times-9")!;
  const day = (n: number) => new Date(Date.UTC(2026, 9, n));
  const first = mergeLessonProgress(lesson, null, { soloCount: 7, soloFirstTry: 5, soloAverageSeconds: 3 }, day(1));
  assert.deepEqual(first, { plays: 1, bestFirstTry: 5, bestAverageSeconds: 3, masteredAt: null });

  const mastered = mergeLessonProgress(lesson, first, { soloCount: 7, soloFirstTry: 7, soloAverageSeconds: 3.5 }, day(2));
  assert.deepEqual(mastered, { plays: 2, bestFirstTry: 7, bestAverageSeconds: 3.5, masteredAt: day(2) });

  // A worse run counts as a play but changes nothing else; a faster equal run improves the time.
  const worse = mergeLessonProgress(lesson, mastered, { soloCount: 7, soloFirstTry: 2, soloAverageSeconds: 9 }, day(3));
  assert.deepEqual(worse, { ...mastered, plays: 3 });
  const faster = mergeLessonProgress(lesson, worse, { soloCount: 7, soloFirstTry: 7, soloAverageSeconds: 2.1 }, day(4));
  assert.deepEqual(faster, { ...worse, plays: 4, bestAverageSeconds: 2.1 });
});
