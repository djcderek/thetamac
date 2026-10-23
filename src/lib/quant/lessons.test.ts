import assert from "node:assert/strict";
import test from "node:test";
import {
  FREE_QUANT_LESSON_IDS,
  QUANT_LESSONS,
  QUANT_LESSON_IDS,
  QUANT_PUZZLES,
  QUANT_SET_SIZE,
  QUANT_SOLO,
  QUANT_TOPICS,
  createQuantLessonProblems,
  generateFromFamily,
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

test("every lesson teaches: a problem first, the rule, checks, the worked example and the usual mistake", () => {
  for (const lesson of QUANT_LESSONS) {
    const id = lesson.id;
    const count = (type: string) => lesson.parts.filter((part) => part.type === type).length;
    assert.ok(["Easy", "Medium", "Hard"].includes(lesson.difficulty), id);
    assert.ok(lesson.summary.length >= 40 && lesson.summary.length <= 200, `${id} summary: ${lesson.summary.length}`);
    assert.equal(lesson.parts[0].type, "text", `${id} opens with a problem`);
    assert.equal(count("example"), 1, `${id} example`);
    assert.ok(count("rule") >= 1, `${id} rule`);
    assert.ok(count("check") >= 2, `${id} checks`);
    assert.equal(count("trap"), 1, `${id} trap`);
    for (const part of lesson.parts) {
      if (part.type === "check") {
        assert.ok(part.choices.length >= 2 && part.choices.length <= 4, `${id} check choices: ${part.prompt}`);
        assert.equal(new Set(part.choices).size, part.choices.length, `${id} choices repeat: ${part.prompt}`);
        assert.ok(Number.isInteger(part.answer) && part.answer >= 0 && part.answer < part.choices.length, `${id} answer: ${part.prompt}`);
        assert.ok(part.explain.length > 0, `${id} explain: ${part.prompt}`);
        for (const choice of part.choices) assert.ok(choice.length <= 60, `${id} long choice: ${choice}`);
      }
      if (part.type === "story") assert.ok(part.beats.length >= 2, `${id} story beats`);
      if (part.type === "text") for (const paragraph of part.body) assert.ok(paragraph.length <= 340, `${id} long paragraph: ${paragraph}`);
      if (part.type === "rule") assert.ok(part.rule.length <= 90, `${id} rule: ${part.rule}`);
      if (part.type === "list") assert.ok(part.items.length >= 2 && part.items.length <= 4, `${id} list`);
    }
  }
});

/** Every piece of a lesson's copy, for the style checks. */
function lessonCopy(lesson: (typeof QUANT_LESSONS)[number]): string[] {
  return [
    lesson.title,
    lesson.benefit,
    lesson.summary,
    ...lesson.parts.flatMap((part) => {
      switch (part.type) {
        case "text":
          return [part.heading ?? "", ...part.body];
        case "story":
          return [part.heading ?? "", ...part.beats.map((beat) => beat.text)];
        case "rule":
          return [part.rule, part.note ?? ""];
        case "check":
          return [part.prompt, ...part.choices, part.explain];
        case "example":
          return [part.lead ?? ""];
        case "list":
          return [part.heading, ...part.items];
        case "trap":
          return [part.body];
      }
    }),
  ];
}

// Phrases that make writing sound generated or padded rather than taught.
const BANNED = [
  "—",
  "Let’s",
  "Let's",
  "delve",
  "dive",
  "crucial",
  "key insight",
  "powerful",
  "In this lesson",
  "simply",
  "unlock",
  "Picture ",
  "Imagine ",
  "Think of it as",
  "It’s important",
  "Here’s the",
  "the trick",
  "not just",
  "game-changer",
  "journey",
  "seamless",
];

test("lesson copy avoids filler and stock phrases", () => {
  for (const lesson of QUANT_LESSONS) {
    for (const text of lessonCopy(lesson)) {
      for (const phrase of BANNED) assert.ok(!text.includes(phrase), `${lesson.id}: "${phrase}" in "${text}"`);
      assert.ok(!/\.\./.test(text) && !/ {2}/.test(text), `${lesson.id}: stray punctuation in "${text}"`);
    }
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

test("lesson figures are drawable", () => {
  for (const lesson of QUANT_LESSONS) {
    for (const part of lesson.parts) {
      if ((part.type === "text" || part.type === "check") && part.visual) checkVisual(part.visual, `${lesson.id} ${part.type}`);
      if (part.type === "story") for (const beat of part.beats) checkVisual(beat.visual, `${lesson.id} story`);
    }
  }
});

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

test("every lesson has several named question types, each with its own variety", () => {
  for (const lesson of QUANT_LESSONS) {
    assert.ok(lesson.families.length >= 4, `${lesson.id}: ${lesson.families.length} types`);
    const ids = lesson.families.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length, `${lesson.id}: duplicate type ids`);
    for (const family of lesson.families) {
      assert.ok(family.title.length > 0 && family.title.length <= 48, `${lesson.id}/${family.id}: "${family.title}"`);
      const random = seeded(family.id.length * 31 + 7);
      const keys = new Set(Array.from({ length: 200 }, () => generateFromFamily(family, random).key));
      assert.ok(keys.size >= 3, `${lesson.id}/${family.id}: only ${keys.size} different questions`);
    }
  }
});

test("a practice set spreads across question types", () => {
  for (const lesson of QUANT_LESSONS) {
    const problems = createQuantLessonProblems(lesson, seeded(5));
    const types = new Set(problems.map((p) => p.family));
    assert.ok(types.size >= Math.min(lesson.families.length, QUANT_SET_SIZE) - 1, `${lesson.id}: ${types.size} types in a set`);
  }
});

test("puzzles read cleanly, have unique ids, a figure, and working that ends on the answer", () => {
  const ids = QUANT_PUZZLES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate puzzle ids");
  assert.ok(QUANT_PUZZLES.length >= 20, `${QUANT_PUZZLES.length} puzzles`);
  for (const puzzle of QUANT_PUZZLES) {
    const { problem } = puzzle;
    const label = `puzzle ${puzzle.id}`;
    assert.match(puzzle.id, /^[a-z0-9-]+$/, label);
    assert.ok(puzzle.title.length > 0 && puzzle.title.length <= 48, label);
    assert.ok(QUANT_LESSON_IDS.includes(puzzle.lesson), label);
    assert.ok(problem.prompt.endsWith("?"), label);
    assert.ok(!/undefined|NaN|Infinity|\[object/.test(problem.prompt + JSON.stringify(problem.steps)), label);
    assert.equal(problem.steps.at(-1)!.result, formatResult(problem.answer, problem.kind), label);
    assert.ok(isRightAnswer(formatResult(problem.answer, problem.kind), problem.answer, problem.kind), label);
    const rounded = formatAnswer(problem.answer, problem.kind).split(/[≈=]/).at(-1)!.trim();
    assert.ok(isRightAnswer(rounded, problem.answer, problem.kind), `${label}: ${rounded}`);
    for (const step of problem.steps) {
      assert.ok(step.icon, `${label}: step "${step.label}" has no icon`);
      assert.ok(step.explain && step.explain.length <= 170, `${label}: step "${step.label}" explain`);
    }
    const visuals = [problem.visual, ...problem.steps.map((s) => s.visual)].filter((v): v is QuantVisual => !!v);
    assert.ok(visuals.length > 0, `${label}: no figure`);
    for (const visual of visuals) checkVisual(visual, label);
  }
});
