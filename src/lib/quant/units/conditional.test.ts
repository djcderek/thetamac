import test from "node:test";
import { CONDITIONAL_LESSONS } from "./conditional";
import { DECK } from "../build";
import { checkAgainstIndependentWorking, draws, faces, sequences, share } from "../test-helpers";
import type { QuantProblem } from "../build";

// The conditions and questions, written again here so a slip in either copy shows up.
const sum = (r: number[]) => r[0] + r[1];
const DICE: Record<string, (r: number[]) => boolean> = {
  "one-six": (r) => r[0] === 6 || r[1] === 6,
  "one-one": (r) => r[0] === 1 || r[1] === 1,
  "total-6": (r) => sum(r) === 6,
  "total-7": (r) => sum(r) === 7,
  "total-8": (r) => sum(r) === 8,
  "total-9": (r) => sum(r) === 9,
  "total-10": (r) => sum(r) === 10,
  "total-9-up": (r) => sum(r) > 8,
  different: (r) => r[0] - r[1] !== 0,
  "first-even": (r) => [2, 4, 6].includes(r[0]),
  "both-six": (r) => sum(r) === 12,
  "has-six": (r) => Math.max(...r) === 6,
  double: (r) => new Set(r).size === 1,
  "total-10-up": (r) => sum(r) > 9,
  "first-higher": (r) => r[0] - r[1] > 0,
  "total-even": (r) => r[0] % 2 === r[1] % 2,
};
const countOf = (f: string[], x: string) => f.reduce((n, y) => n + (y === x ? 1 : 0), 0);
const COINS: Record<string, (f: string[]) => boolean> = {
  "one-head": (f) => f.includes("H"),
  "two-heads": (f) => countOf(f, "H") > 1,
  "first-heads": (f) => f[0] === "H",
  "all-heads": (f) => !f.includes("T"),
  "exactly-two": (f) => countOf(f, "H") === 2,
  "two-up": (f) => countOf(f, "H") > 1,
};
const CHILDREN: Record<string, (c: string[]) => boolean> = {
  "one-boy": (c) => c.includes("B"),
  "oldest-boy": (c) => c[0] === "B",
  "two-boys": (c) => countOf(c, "B") > 1,
  "all-boys": (c) => !c.includes("G"),
};
type Card = (typeof DECK)[number];
const CARDS: Record<string, (c: Card) => boolean> = {
  red: (c) => ["hearts", "diamonds"].includes(c.suit),
  face: (c) => [11, 12, 13].includes(c.rank),
  heart: (c) => c.suit === "hearts",
  "not-heart": (c) => c.suit !== "hearts",
  high: (c) => c.rank > 9,
  king: (c) => c.rank === 13,
  "red-face": (c) => ["hearts", "diamonds"].includes(c.suit) && c.rank > 10,
};

/** P(asked | known) as P(both) ÷ P(known), over the whole outcome space. */
function conditionalShare<T>(outcomes: T[], known: (x: T) => boolean, asked: (x: T) => boolean) {
  return share(outcomes, (x) => known(x) && asked(x)) / share(outcomes, known);
}

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "conditional-probability": {
      const space = String(p.space);
      const known = String(p.known), asked = String(p.asked);
      if (space === "dice") return conditionalShare(sequences(faces(6), 2), DICE[known], DICE[asked]);
      if (space === "card") return conditionalShare(DECK, CARDS[known], CARDS[asked]);
      const n = Number(space.split("-")[1]);
      if (space.startsWith("coins")) return conditionalShare(sequences(["H", "T"], n), COINS[known], COINS[asked]);
      return conditionalShare(sequences(["B", "G"], n), CHILDREN[known], CHILDREN[asked]);
    }
    case "splitting-cases": {
      if (String(problem.key).startsWith("bags")) {
        // Every (bag, ball) pair, weighted by the chance of picking that bag.
        const pickA = p.chanceA === "coin" ? 1 / 2 : 2 / 6;
        const bagA = [...Array(+p.redA).fill("r"), ...Array(+p.blueA).fill("b")];
        const bagB = [...Array(+p.redB).fill("r"), ...Array(+p.blueB).fill("b")];
        return pickA * share(bagA, (b) => b === "r") + (1 - pickA) * share(bagB, (b) => b === "r");
      }
      if (String(problem.key).startsWith("second")) {
        const tests: Record<string, (c: Card) => boolean> = { ...CARDS, ace: (c) => c.rank === 1, spade: (c) => c.suit === "spades" };
        return share(draws(DECK, 2), ([, second]) => tests[String(p.card)](second));
      }
      if (String(problem.key).startsWith("turns")) {
        // Sum A's chance of winning on turn 1, 3, 5, … directly.
        const chances: Record<string, number> = {
          six: 1 / 6,
          "five-six": 2 / 6,
          "one-two-three": 3 / 6,
          heads: 1 / 2,
          double: share(sequences(faces(6), 2), (r) => r[0] === r[1]),
          seven: share(sequences(faces(6), 2), (r) => r[0] + r[1] === 7),
          "eleven-up": share(sequences(faces(6), 2), (r) => r[0] + r[1] >= 11),
          ace: share(DECK, (c) => c.rank === 1),
        };
        const c = chances[String(p.event)];
        let a = 0;
        for (let turn = 0; turn < 4000; turn++) if (turn % 2 === 0) a += c * (1 - c) ** turn;
        return p.who === "first" ? a : 1 - a;
      }
      // Machines: count faulty parts in 10,000.
      const fromA = +p.shareA * 100, fromB = 10000 - fromA;
      return ((fromA * +p.faultA) / 100 + (fromB * +p.faultB) / 100) / 10000;
    }
    case "bayes-rule": {
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
  }
  throw new Error(`No check for ${lessonId}`);
}

test("conditional answers agree with an independent working", () => {
  checkAgainstIndependentWorking(CONDITIONAL_LESSONS, independentAnswer, { tolerance: { "splitting-cases": 1e-9 } });
});
