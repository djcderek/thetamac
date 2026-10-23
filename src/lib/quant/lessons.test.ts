import assert from "node:assert/strict";
import test from "node:test";
import {
  DECK,
  FREE_QUANT_LESSON_IDS,
  QUANT_LESSONS,
  QUANT_SET_SIZE,
  QUANT_SOLO,
  createQuantLessonProblems,
  getQuantLesson,
  isQuantLessonMastered,
  type QuantProblem,
} from "./lessons";
import { formatAnswer, formatResult, isRightAnswer, value } from "./rational";
import { LESSON_IDS } from "../lessons";

// A seeded random, so a failure can be replayed.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Every problem a lesson makes over many seeds, plus its worked example. */
function sample(lessonId: string, count = 300) {
  const lesson = getQuantLesson(lessonId)!;
  const random = seeded(lessonId.length * 97 + 11);
  return [lesson.example, ...Array.from({ length: count }, () => lesson.generate(random))];
}

const close = (a: number, b: number, label: string) => assert.ok(Math.abs(a - b) < 1e-9, `${label}: ${a} vs ${b}`);

/** All sequences of `length` picks from `values` (with repeats). */
function sequences<T>(values: T[], length: number): T[][] {
  if (length === 0) return [[]];
  return sequences(values, length - 1).flatMap((rest) => values.map((v) => [...rest, v]));
}

/** All ordered draws of `length` distinct items. */
function draws<T>(items: T[], length: number): T[][] {
  if (length === 0) return [[]];
  return items.flatMap((item, i) => draws([...items.slice(0, i), ...items.slice(i + 1)], length - 1).map((rest) => [item, ...rest]));
}

const faces = (sides: number) => Array.from({ length: sides }, (_, i) => i + 1);
const share = <T>(all: T[], test: (x: T) => boolean) => all.filter(test).length / all.length;

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "count-outcomes": {
      if (p.type === "die") return share(faces(+p.sides), (f) => f >= +p.atLeast);
      const counts: Record<string, number> = {
        heart: 13, face: 12, ace: 4, "heart-or-king": 16, "red-face": 6, "spade-or-ace": 16, "two-to-four": 12,
        "red-or-face": 32, "club-or-face": 22, "black-king": 2,
      };
      return counts[p.event as string] / 52;
    }
    case "two-dice": {
      const pairs = sequences(faces(6), 2);
      if (p.type === "double") return share(pairs, ([a, b]) => a === b);
      return share(pairs, ([a, b]) => (p.type === "exactly" ? a + b === +p.total : a + b >= +p.total));
    }
    case "at-least-one": {
      if (p.type === "sixes") return share(sequences(faces(6), +p.rolls), (rolls) => rolls.includes(6));
      if (p.type === "low") return share(sequences(faces(6), +p.rolls), (rolls) => rolls.some((r) => r <= 2));
      if (p.type === "heads") return share(sequences(["H", "T"], +p.flips), (flips) => flips.includes("H"));
      return share(draws(DECK.map((c) => c.rank), +p.cards), (hand) => hand.includes(1));
    }
    case "in-a-row": {
      if (p.type === "bag") {
        const bag = [...Array(+p.red).fill("r"), ...Array(+p.blue).fill("b")].map((colour, i) => ({ colour, i }));
        return share(draws(bag, +p.draws), (drawn) => drawn.every((m) => m.colour === "r"));
      }
      const tests: Record<string, (c: (typeof DECK)[number]) => boolean> = {
        aces: (c) => c.rank === 1,
        hearts: (c) => c.suit === "hearts",
        face: (c) => c.rank >= 11,
        red: (c) => c.suit === "hearts" || c.suit === "diamonds",
      };
      return share(draws(DECK, 2), (pair) => pair.every(tests[p.event as string]));
    }
    case "picture-the-crowd": {
      if (p.type === "test") {
        // Bayes' rule from rates, rather than counting the crowd.
        const prior = +p.sick / +p.people;
        const sensitivity = +p.caught / +p.sick;
        const falsePositive = +p.falseAlarms / (+p.people - +p.sick);
        return (prior * sensitivity) / (prior * sensitivity + (1 - prior) * falsePositive);
      }
      const coins = [...Array(+p.fair).fill("fair"), ...Array(+p.rigged).fill("rigged")];
      const outcomes = coins.flatMap((coin) =>
        sequences(["H", "T"], +p.flips).map((flips) => ({ coin, flips: coin === "rigged" ? flips.map(() => "H") : flips })),
      );
      const allHeads = outcomes.filter((o) => o.flips.every((f) => f === "H"));
      return share(allHeads, (o) => o.coin === "rigged");
    }
    case "weigh-the-payouts": {
      const pay = (face: number) => (p.type === "face" ? face : face === 6 ? +p.six : face === 5 ? +p.five : -p.cost);
      const all = faces(p.type === "face" ? +p.sides : 6);
      return all.reduce((sum, face) => sum + pay(face), 0) / all.length;
    }
    case "add-the-averages": {
      if (p.type === "dice-total") {
        // Exact distribution of the total, built up one die at a time.
        let dist = new Map([[0, 1]]);
        for (let i = 0; i < +p.dice; i++) {
          const next = new Map<number, number>();
          for (const [total, chance] of dist) for (const f of faces(6)) next.set(total + f, (next.get(total + f) ?? 0) + chance / 6);
          dist = next;
        }
        return [...dist].reduce((sum, [total, chance]) => sum + total * chance, 0);
      }
      if (p.type === "sixes") {
        const n = +p.rolls;
        let expected = 0;
        for (let k = 0; k <= n; k++) expected += k * choose(n, k) * (1 / 6) ** k * (5 / 6) ** (n - k);
        return expected;
      }
      if (p.type === "hearts" || p.type === "aces") {
        // Hypergeometric: k of the target cards among the dealt ones.
        const target = p.type === "hearts" ? 13 : 4;
        const n = +p.cards;
        let expected = 0;
        for (let k = 0; k <= Math.min(n, target); k++) expected += (k * choose(target, k) * choose(52 - target, n - k)) / choose(52, n);
        return expected;
      }
      // Envelopes: average fixed points over every arrangement (rencontres numbers).
      const n = +p.letters;
      let expected = 0;
      for (let k = 0; k <= n; k++) expected += (k * choose(n, k) * derangements(n - k)) / factorial(n);
      return expected;
    }
    case "reroll-or-keep": {
      // Try every keep-threshold and take the best, by brute force over the roll sequences.
      const sides = +p.sides;
      const rolls = sequences(faces(sides), +p.rerolls + 1);
      let best = -Infinity;
      for (const thresholds of sequences(faces(sides + 1), +p.rerolls)) {
        const worth =
          rolls.reduce((sum, seq) => {
            const stop = seq.findIndex((roll, i) => i === seq.length - 1 || roll >= thresholds[i]);
            return sum + seq[stop];
          }, 0) / rolls.length;
        best = Math.max(best, worth);
      }
      return best;
    }
    case "wait-for-it": {
      const pairs = sequences(faces(6), 2);
      const chance: Record<string, number> = {
        six: share(faces(6), (f) => f === 6),
        "five-six": share(faces(6), (f) => f >= 5),
        double: share(pairs, ([a, b]) => a === b),
        "eleven-up": share(pairs, ([a, b]) => a + b >= 11),
        "ten-up": share(pairs, ([a, b]) => a + b >= 10),
        ace: share(DECK, (c) => c.rank === 1),
        heart: share(DECK, (c) => c.suit === "hearts"),
        "two-heads": share(sequences(["H", "T"], 2), (f) => f.every((x) => x === "H")),
      };
      // Sum the series k × P(first success on try k), rather than using 1/p.
      const q = chance[p.event as string];
      let expected = 0;
      for (let k = 1; k < 5000; k++) expected += k * q * (1 - q) ** (k - 1);
      return expected;
    }
    case "odds-to-chance": {
      if (p.type === "against") return +p.for / (+p.against + +p.for);
      if (p.type === "decimal") return 1 / (+p.hundredths / 100);
      // American odds as decimal odds, then 1 / decimal.
      const line = +p.line;
      const decimal = line > 0 ? 1 + line / 100 : 1 + 100 / -line;
      return 1 / decimal;
    }
    case "pot-odds": {
      // The win chance where calling has zero expected value.
      const pot = +p.pot, bet = +p.bet;
      const evCall = (e: number) => e * (pot + bet) - (1 - e) * bet;
      let low = 0, high = 1;
      for (let i = 0; i < 200; i++) {
        const mid = (low + high) / 2;
        if (evCall(mid) < 0) low = mid;
        else high = mid;
      }
      return low;
    }
    case "house-edge": {
      if (p.type === "die") return -(faces(6).reduce((sum, f) => sum + (f === 1 ? +p.pays : -1), 0) / 6);
      const covered: Record<string, number> = { straight: 1, split: 2, street: 3, corner: 4, dozen: 12, red: 18 };
      const pays: Record<string, number> = { straight: 35, split: 17, street: 11, corner: 8, dozen: 2, red: 1 };
      const pockets = Array.from({ length: +p.wheel }, (_, i) => i);
      const bet = p.bet as string;
      return -(pockets.reduce((sum, pocket) => sum + (pocket < covered[bet] ? pays[bet] : -1), 0) / pockets.length);
    }
    case "kelly": {
      // The stake that maximizes expected log growth, by golden-section search.
      const win = +p.winPercent / 100, b = +p.pays;
      const growth = (f: number) => win * Math.log(1 + b * f) + (1 - win) * Math.log(1 - f);
      let low = 0, high = 0.999;
      for (let i = 0; i < 300; i++) {
        const a = low + (high - low) * 0.382, c = low + (high - low) * 0.618;
        if (growth(a) < growth(c)) low = a;
        else high = c;
      }
      return (low + high) / 2;
    }
  }
  throw new Error(`No check for ${lessonId}`);
}

function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}
function derangements(n: number): number {
  return n === 0 ? 1 : n === 1 ? 0 : (n - 1) * (derangements(n - 1) + derangements(n - 2));
}

test("every lesson's answers agree with an independent working", () => {
  for (const lesson of QUANT_LESSONS) {
    const seen = new Set<string>();
    for (const problem of sample(lesson.id, lesson.id === "reroll-or-keep" ? 60 : 300)) {
      if (seen.has(problem.key)) continue;
      seen.add(problem.key);
      const expected = independentAnswer(lesson.id, problem);
      const tolerance = lesson.id === "kelly" ? 1e-6 : 1e-9;
      assert.ok(Math.abs(value(problem.answer) - expected) < tolerance, `${lesson.id} ${problem.key}: ${value(problem.answer)} vs ${expected}`);
    }
  }
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
  for (const problem of sample("count-outcomes", 200).filter((p) => p.params.type === "card")) {
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

test("the first lesson of each topic is free", () => {
  assert.deepEqual([...FREE_QUANT_LESSON_IDS], ["count-outcomes", "weigh-the-payouts", "odds-to-chance"]);
});

test("mastery needs four of the five solo problems right first time, within the target", () => {
  const lesson = getQuantLesson("pot-odds")!;
  const at = lesson.targetSeconds;
  assert.ok(isQuantLessonMastered(lesson, { soloCount: QUANT_SOLO, soloFirstTry: 4, soloAverageSeconds: at }));
  assert.ok(!isQuantLessonMastered(lesson, { soloCount: QUANT_SOLO, soloFirstTry: 3, soloAverageSeconds: 1 }));
  assert.ok(!isQuantLessonMastered(lesson, { soloCount: QUANT_SOLO, soloFirstTry: 5, soloAverageSeconds: at + 1 }));
  assert.ok(!isQuantLessonMastered(lesson, { soloCount: 3, soloFirstTry: 3, soloAverageSeconds: 1 }));
});
