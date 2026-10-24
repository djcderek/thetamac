import test from "node:test";
import { CONDITIONAL_LESSONS } from "./conditional";
import { DECK } from "../build";
import { checkAgainstIndependentWorking, draws, faces, sequences, share, solve } from "../test-helpers";
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
      if (p.type === "mock-pairs") {
        // Every ordered pair written out (no doubles when the first tile stays out), then P(both) ÷ P(clue).
        const n = +p.sides;
        const pairs = p.draw === "tiles" ? draws(faces(n), 2) : sequences(faces(n), 2);
        const tests: Record<string, (r: number[]) => boolean> = {
          "has-top": (r) => Math.max(...r) === n,
          "has-one": (r) => Math.min(...r) === 1,
          "first-odd": (r) => r[0] % 2 !== 0,
          "total-high": (r) => sum(r) > n + 2,
          "both-low": (r) => Math.max(...r) < 5,
          "both-odd": (r) => (r[0] * r[1]) % 2 === 1,
          "even-total": (r) => r[0] % 2 === r[1] % 2,
          "first-bigger": (r) => r[0] - r[1] > 0,
          same: (r) => r[0] - r[1] === 0,
          "even-product": (r) => r[0] % 2 === 0 || r[1] % 2 === 0,
          "next-door": (r) => (r[0] - r[1]) ** 2 === 1,
        };
        const test = (id: string) => (/^total-\d+$/.test(id) ? (r: number[]) => sum(r) === Number(id.slice(6)) : tests[id]);
        return conditionalShare(pairs, test(String(p.known)), test(String(p.asked)));
      }
      if (p.type === "mock-drawer") {
        // Every ordered draw of the first three or four items from the full drawer, kept when the first two match.
        const counts = String(p.counts).split("-").map(Number);
        const items = counts.flatMap((c, kind) => Array<number>(c).fill(kind));
        const d = +p.drawn;
        const asked: Record<string, (s: number[]) => boolean> = {
          next: (s) => s[2] === d,
          pair: (s) => s[2] === s[3],
          both: (s) => s[2] === d && s[3] === d,
        };
        return conditionalShare(draws(items, p.ask === "next" ? 3 : 4), (s) => s[0] === d && s[1] === d, asked[String(p.ask)]);
      }
      if (String(problem.key).startsWith("next-")) {
        // Brute force: remove a concrete first two cards, then look at every ordered next draw.
        const draw = String(p.draw);
        const gone =
          draw.startsWith("pair") ? ["13hearts", "13spades"] : draw.startsWith("suit") ? ["2hearts", "7hearts"] : ["5hearts", "9diamonds"];
        const left = DECK.filter((c) => !gone.includes(`${c.rank}${c.suit}`));
        const red = (c: Card) => c.suit === "hearts" || c.suit === "diamonds";
        if (draw.endsWith("match")) {
          const same = draw.startsWith("pair") ? (c: Card) => c.rank === 13 : (c: Card) => c.suit === "hearts";
          return share(left, same);
        }
        const fits: Record<string, (a: Card, b: Card) => boolean> = {
          "pair-pair": (a, b) => a.rank === b.rank,
          "suit-suit": (a, b) => a.suit === b.suit,
          "red-red": (a, b) => red(a) && red(b),
          "red-same": (a, b) => red(a) === red(b),
        };
        return share(draws(left, 2), ([a, b]) => fits[draw](a, b));
      }
      const space = String(p.space);
      const known = String(p.known), asked = String(p.asked);
      if (space === "dice") return conditionalShare(sequences(faces(6), 2), DICE[known], DICE[asked]);
      if (space === "card") return conditionalShare(DECK, CARDS[known], CARDS[asked]);
      const n = Number(space.split("-")[1]);
      if (space.startsWith("coins")) return conditionalShare(sequences(["H", "T"], n), COINS[known], COINS[asked]);
      return conditionalShare(sequences(["B", "G"], n), CHILDREN[known], CHILDREN[asked]);
    }
    case "splitting-cases": {
      const key = String(problem.key);
      if (p.type === "mock-sources") {
        // Line up 10,000 items, the first share × 100 from the first source, and count the bad ones.
        const fromA = +p.share * 100;
        let bad = 0;
        for (let i = 0; i < 10000; i++) {
          const a = i < fromA;
          const place = a ? i : i - fromA;
          const size = a ? fromA : 10000 - fromA;
          if (place < (size * (a ? +p.rateA : +p.rateB)) / 100) bad++;
        }
        return bad / 10000;
      }
      if (p.type === "mock-shots") {
        // Two states: Ana to shoot (x) or Ben to shoot (y), each Ana's chance of winning from there.
        const c = +p.chanceN / +p.chanceD;
        const [x] = solve([[1, -(1 - c)], [-(1 - c), 1]], [c, 0]);
        return p.who === "first" ? x : 1 - x;
      }
      if (p.totalA !== undefined) {
        // Sum A's chance of winning in round 1, 2, 3, … from the dice directly.
        const rolls = sequences(faces(6), 2);
        const a = share(rolls, (r) => r[0] + r[1] === +p.totalA);
        const b = share(rolls, (r) => r[0] + r[1] === +p.totalB);
        let aWins = 0;
        for (let round = 0; round < 3000; round++) aWins += ((1 - a) * (1 - b)) ** round * a;
        return p.who === "first" ? aWins : 1 - aWins;
      }
      if (key.startsWith("random-")) {
        // Add P(N = n) × P(at least one hit in n tries) over n, term by term.
        const trial = String(p.trial);
        const stop = ["coin-heads", "die-ace"].includes(trial) ? 1 / 6 : 1 / 2;
        const hit = { "die-one": 1 / 6, "die-high": 2 / 6, "die-even": 3 / 6, "card-ace": 4 / 52, "coin-heads": 1 / 2, "die-ace": 4 / 52 }[trial]!;
        let chance = 0;
        for (let n = 1; n < 3000; n++) chance += (1 - stop) ** (n - 1) * stop * (1 - (1 - hit) ** n);
        return chance;
      }
      if (key.startsWith("race-")) {
        // Sum over the try that settles it: k tries with neither, then A.
        const race = String(p.race);
        const rolls = sequences(faces(6), 2);
        const odds: Record<string, [number, number]> = {
          "seven-six": [share(rolls, (r) => r[0] + r[1] === 7), share(rolls, (r) => r[0] + r[1] === 6)],
          "eight-seven": [share(rolls, (r) => r[0] + r[1] === 8), share(rolls, (r) => r[0] + r[1] === 7)],
          "double-seven": [share(rolls, (r) => r[0] === r[1]), share(rolls, (r) => r[0] + r[1] === 7)],
          "ten-four": [share(rolls, (r) => r[0] + r[1] > 9), share(rolls, (r) => r[0] + r[1] < 5)],
          "eleven-two": [share(rolls, (r) => r[0] + r[1] === 11), share(rolls, (r) => r[0] + r[1] < 4)],
          "five-four-six": [1 / 6, 2 / 6],
          "six-odd": [1 / 6, 3 / 6],
          "low-six": [2 / 6, 1 / 6],
          "ace-face": [share(DECK, (c) => c.rank === 1), share(DECK, (c) => c.rank > 10)],
          "heart-black-ace": [share(DECK, (c) => c.suit === "hearts"), share(DECK, (c) => (c.suit === "spades" || c.suit === "clubs") && c.rank === 1)],
        };
        const [a, b] = odds[race];
        let first = 0;
        for (let k = 0; k < 5000; k++) first += (1 - a - b) ** k * a;
        return first;
      }
      if (key.startsWith("bags")) {
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
      if (p.type === "mock-flagged") {
        // One entry per item, then the share of the flagged ones that are bad.
        const items = Array.from({ length: +p.total }, (_, i) => {
          const bad = i < +p.bad;
          return { bad, flagged: bad ? i < +p.caught : i - +p.bad < +p.wrong };
        });
        return share(items.filter((x) => x.flagged), (x) => x.bad);
      }
      if (p.type === "mock-trick") {
        // Every die and every sequence of its faces, all equally likely; keep the runs of all sixes.
        const dice = [...Array(+p.ordinary).fill(faces(6)), ...Array(+p.trick).fill([6, 6, 6, 6, 6, 6])] as number[][];
        const outcomes = dice.flatMap((die, i) => sequences(die, +p.rolls).map((rolls) => ({ trick: i >= +p.ordinary, rolls })));
        return share(outcomes.filter((o) => o.rolls.every((r) => r === 6)), (o) => o.trick);
      }
      if (p.type === "mock-bags") {
        // Every bag and every run of k + 1 marbles drawn with replacement, weighted, then condition on k reds.
        const sets: Record<string, [number, number][]> = {
          quarters: [[1, 4], [2, 4], [3, 4]],
          thirds: [[1, 3], [2, 3]],
          fifths: [[1, 5], [3, 5], [5, 5]],
          sixths: [[2, 6], [3, 6], [4, 6]],
          "half-or-more": [[1, 2], [3, 4]],
        };
        const bags = sets[String(p.set)].map(([red, all]) => [...Array(red).fill("r"), ...Array(all - red).fill("w")] as string[]);
        const k = +p.draws;
        let seen = 0, next = 0;
        for (const bag of bags) {
          const weight = 1 / bags.length / bag.length ** (k + 1);
          for (const run of sequences(bag, k + 1)) {
            if (run.slice(0, k).some((m) => m !== "r")) continue;
            seen += weight;
            if (run[k] === "r") next += weight;
          }
        }
        return next / seen;
      }
      if (String(problem.key).startsWith("bag-")) {
        // Enumerate every coin and every sequence of k + 1 flips, weighted, then condition on the first k.
        const sets: Record<string, number[]> = {
          "third-sure": [1 / 3, 2 / 3, 1],
          quarters: [1 / 4, 1 / 2, 3 / 4],
          "third-half": [1 / 3, 1 / 2],
          "half-sure": [1 / 2, 3 / 4, 1],
          "three-coins": [1, 0, 1 / 2],
        };
        const coins = sets[String(p.set)];
        const k = +p.flips;
        let seen = 0, target = 0, nextHeads = 0;
        coins.forEach((c, i) => {
          for (const flips of sequences(["H", "T"], k + 1)) {
            const weight = flips.reduce((w, f) => w * (f === "H" ? c : 1 - c), 1 / coins.length);
            if (flips.slice(0, k).some((f) => f === "T")) continue;
            seen += weight;
            if (i === +p.target) target += weight;
            if (flips[k] === "H") nextHeads += weight;
          }
        });
        return p.ask === "which" ? target / seen : nextHeads / seen;
      }
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
