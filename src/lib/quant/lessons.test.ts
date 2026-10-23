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
import type { QuantVisual, TreeNode } from "./visual";

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

test("every lesson teaches: difficulty, why it works, the rule, cues and the common mistake", () => {
  for (const lesson of QUANT_LESSONS) {
    assert.ok(["Easy", "Medium", "Hard"].includes(lesson.difficulty), lesson.id);
    assert.ok(lesson.intro.length >= 60 && lesson.intro.length <= 420, `${lesson.id} intro: ${lesson.intro.length}`);
    assert.ok(lesson.formula.length > 0 && lesson.formula.length <= 90, `${lesson.id} formula: ${lesson.formula}`);
    assert.ok(lesson.cues.length >= 2 && lesson.cues.length <= 3, `${lesson.id} cues`);
    for (const cue of lesson.cues) assert.ok(cue.length <= 90, `${lesson.id} cue: ${cue}`);
    assert.ok(lesson.mistake.length > 0 && lesson.mistake.length <= 170, `${lesson.id} mistake: ${lesson.mistake}`);
  }
});

/** Problems in figures stay drawable: indices in range, sizes a phone can show. */
function checkVisual(visual: QuantVisual, label: string) {
  const inRange = (n: number, lo: number, hi: number) => assert.ok(n >= lo && n <= hi, `${label}: ${n} not in ${lo}..${hi}`);
  switch (visual.type) {
    case "dice-grid":
      inRange(visual.sides, 2, 8);
      for (const mark of visual.marks) for (const [a, b] of mark.cells) { inRange(a, 1, visual.sides); inRange(b, 1, visual.sides); }
      break;
    case "die-faces":
      inRange(visual.sides, 2, 20);
      for (const mark of visual.marks) for (const face of mark.faces) inRange(face, 1, visual.sides);
      break;
    case "cards":
      for (const mark of visual.marks) for (const card of mark.cards) assert.match(card, /^(1[0-3]|[1-9])[SHDC]$/, label);
      break;
    case "coins":
      inRange(visual.flips.length, 1, 12);
      break;
    case "marbles":
      inRange(visual.groups.reduce((sum, g) => sum + g.count, 0), 1, 30);
      break;
    case "people":
      inRange(visual.groups.reduce((sum, g) => sum + g.count, 0) / (visual.each ?? 1), 1, 200);
      break;
    case "slots":
      inRange(visual.slots.length, 1, 7);
      break;
    case "stars-bars":
      { inRange(visual.stars, 1, 20); inRange(visual.bars, 1, 8); }
      break;
    case "grid-path":
      { inRange(visual.across, 1, 10); inRange(visual.up, 1, 10); }
      break;
    case "tree": {
      const depth = (node: TreeNode): number => 1 + Math.max(0, ...(node.children ?? []).map(depth));
      const leaves = (node: TreeNode): number => (node.children?.length ? node.children.reduce((sum, c) => sum + leaves(c), 0) : 1);
      { inRange(depth(visual.root), 2, 5); inRange(leaves(visual.root), 2, 16); }
      break;
    }
    case "bars":
      inRange(visual.bars.length, 1, 24);
      break;
    case "normal":
      for (const band of visual.shade) { inRange(band.from, -4, 4); inRange(band.to, -4, 4); }
      break;
    case "square":
      for (const region of visual.regions) for (const [x, y] of region.points) { inRange(x, 0, 1); inRange(y, 0, 1); }
      break;
    case "number-line":
      for (const band of visual.shade) { inRange(band.from, visual.min, visual.max); inRange(band.to, visual.min, visual.max); }
      break;
    case "states":
      inRange(visual.nodes.length, 2, 9);
      for (const edge of visual.edges) assert.ok(visual.nodes.some((n) => n.id === edge.from) && visual.nodes.some((n) => n.id === edge.to), label);
      break;
  }
}

test("every walkthrough step says what it does, and every problem has a figure", () => {
  for (const lesson of QUANT_LESSONS) {
    for (const problem of sample(lesson.id, 60)) {
      const label = `${lesson.id} ${problem.key}`;
      for (const step of problem.steps) {
        assert.ok(step.icon, `${label}: step "${step.label}" has no icon`);
        assert.ok(step.explain && step.explain.length <= 170, `${label}: step "${step.label}" explain`);
      }
      const visuals = [problem.visual, ...problem.steps.map((s) => s.visual)].filter((v): v is QuantVisual => !!v);
      assert.ok(visuals.length > 0, `${label}: no figure`);
      for (const visual of visuals) checkVisual(visual, label);
    }
  }
});
