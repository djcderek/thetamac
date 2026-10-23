import test from "node:test";
import { EXPECTED_VALUE_LESSONS } from "./expected-value";
import { DECK } from "../build";
import { checkAgainstIndependentWorking, choose, derangements, factorial, faces, sequences } from "../test-helpers";

/** Mean and variance of a distribution given as [value, chance] pairs. */
function moments(dist: [number, number][]) {
  const mean = dist.reduce((s, [x, c]) => s + x * c, 0);
  return { mean, variance: dist.reduce((s, [x, c]) => s + (x - mean) ** 2 * c, 0) };
}

/** The distribution of the total of `dice` six-sided dice, one die at a time. */
function diceTotal(dice: number): [number, number][] {
  let dist = new Map([[0, 1]]);
  for (let i = 0; i < dice; i++) {
    const next = new Map<number, number>();
    for (const [total, chance] of dist) for (const f of faces(6)) next.set(total + f, (next.get(total + f) ?? 0) + chance / 6);
    dist = next;
  }
  return [...dist];
}

const binomial = (n: number, p: number): [number, number][] =>
  Array.from({ length: n + 1 }, (_, k) => [k, choose(n, k) * p ** k * (1 - p) ** (n - k)]);
import type { QuantProblem } from "../build";

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "expected-value": {
      const key = String(problem.key);
      if (key.startsWith("sum-") || key.startsWith("product-")) {
        const rolls = sequences(faces(+p.sides), 2);
        const value = (r: number[]) => (p.type === "sum" ? r[0] + r[1] : r[0] * r[1]);
        return rolls.reduce((s, r) => s + value(r), 0) / rolls.length;
      }
      if (key.startsWith("tails-")) {
        // Sum k heads × P(exactly k heads, then tails).
        const h = +p.headsN / +p.headsD;
        let expected = 0;
        for (let k = 1; k < 4000; k++) expected += k * h ** k * (1 - h);
        return expected * +p.pay;
      }
      if (key.startsWith("price-")) {
        return DECK.reduce((s, c) => s + (c.rank === 1 ? +p.ace : c.rank >= 11 ? +p.face : 0), 0) / DECK.length;
      }
      const pay = (face: number) => (p.type === "face" ? face : face === 6 ? +p.six : face === 5 ? +p.five : -p.cost);
      const all = faces(p.type === "face" ? +p.sides : 6);
      return all.reduce((sum, face) => sum + pay(face), 0) / all.length;
    }
    case "linearity": {
      if (p.type === "dice-total") return moments(diceTotal(+p.dice)).mean;
      if (String(problem.key).startsWith("first-")) {
        // E[position] = sum over j of P(the first j cards hold no target card).
        const t = { ace: 4, king: 4, heart: 13, face: 12, spade: 13 }[String(p.card)]!;
        let expected = 0;
        for (let j = 0; j <= 52 - t; j++) expected += choose(52 - t, j) / choose(52, j);
        return expected;
      }
      if (p.type === "elevator" || p.type === "faces") {
        // Distribution of how many different options have been picked, one try at a time.
        const n = +p.options;
        let dist = new Map([[0, 1]]);
        for (let i = 0; i < +p.tries; i++) {
          const next = new Map<number, number>();
          for (const [seen, chance] of dist) {
            next.set(seen, (next.get(seen) ?? 0) + (chance * seen) / n);
            next.set(seen + 1, (next.get(seen + 1) ?? 0) + (chance * (n - seen)) / n);
          }
          dist = next;
        }
        return moments([...dist]).mean;
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
    case "variance": {
      if (p.type === "die") return moments(faces(+p.sides).map((f) => [f, 1 / +p.sides])).variance;
      if (p.type === "dice-sum") return moments(diceTotal(+p.dice)).variance;
      if (p.type === "heads") return moments(binomial(+p.flips, +p.headsN / +p.headsD)).variance;
      if (p.type === "heads-sd") return Math.sqrt(moments(binomial(+p.flips, 1 / 2)).variance);
      const c = +p.chanceN / +p.chanceD;
      return moments([[+p.win, c], [-p.lose, 1 - c]]).variance;
    }
  }
  throw new Error(`No check for ${lessonId}`);
}

test("expected-value answers agree with an independent working", () => {
  checkAgainstIndependentWorking(EXPECTED_VALUE_LESSONS, independentAnswer);
});
