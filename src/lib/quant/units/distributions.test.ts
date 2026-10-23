import test from "node:test";
import { DISTRIBUTIONS_LESSONS } from "./distributions";
import { DECK, type QuantProblem } from "../build";
import { checkAgainstIndependentWorking, faces, sequences, share } from "../test-helpers";

/** Chance of each repeated-try setting, by counting outcomes rather than reading the fraction. */
const TRY_CHANCES: Record<string, number> = {
  heads: share(["H", "T"], (f) => f === "H"),
  sixes: share(faces(6), (f) => f === 6),
  sunny: 0.8,
  "free-throws": 0.7,
  guessing: share(["a", "b", "c", "d"], (choice) => choice === "a"),
  "biased-coin": 2 / 3,
};

/** The geometric lesson's settings (its free throws go in 3 of 4). */
const HIT_CHANCES: Record<string, number> = {
  coin: share(["H", "T"], (f) => f === "H"),
  die: share(faces(6), (f) => f === 6),
  biased: 2 / 3,
  "free-throws": 3 / 4,
};

/** Every sequence of hits (1) and misses (0) over `n` tries, with its chance. */
function weightedSequences(n: number, chance: number) {
  return sequences([1, 0], n).map((seq) => ({
    seq,
    weight: seq.reduce((w, hit) => w * (hit ? chance : 1 - chance), 1),
  }));
}

/** One-sided bands of the 68–95–99.7 rule, in hundredths of a percent (±9 = no limit). */
const BANDS = [
  { a: -9, b: -3, share: 15 },
  { a: -3, b: -2, share: 235 },
  { a: -2, b: -1, share: 1350 },
  { a: -1, b: 0, share: 3400 },
  { a: 0, b: 1, share: 3400 },
  { a: 1, b: 2, share: 1350 },
  { a: 2, b: 3, share: 235 },
  { a: 3, b: 9, share: 15 },
];
const bandShare = (inside: (band: (typeof BANDS)[number]) => boolean) =>
  BANDS.filter(inside).reduce((sum, band) => sum + band.share, 0) / 10000;
const NORMAL_EVENTS: Record<string, (band: (typeof BANDS)[number]) => boolean> = {
  "beyond-1": (band) => band.a >= 1 || band.b <= -1,
  "beyond-2": (band) => band.a >= 2 || band.b <= -2,
  "above-1": (band) => band.a >= 1,
  "above-2": (band) => band.a >= 2,
  "above-mean": (band) => band.a >= 0,
};

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "binomial": {
      // Add up the chance of every hit/miss sequence with the right number of hits.
      const n = +p.tries, k = +p.successes;
      return weightedSequences(n, TRY_CHANCES[p.trial as string])
        .filter(({ seq }) => {
          const hits = seq.reduce((sum, hit) => sum + hit, 0);
          return p.ask === "exactly" ? hits === k : hits >= k;
        })
        .reduce((sum, { weight }) => sum + weight, 0);
    }
    case "geometric": {
      if (p.type === "wait") {
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
        const c = chance[p.event as string];
        let expected = 0;
        for (let k = 1; k < 5000; k++) expected += k * c * (1 - c) ** (k - 1);
        return expected;
      }
      if (p.type === "k-hits") {
        // Sum t × P(the k-th hit lands on try t).
        const c = HIT_CHANCES[p.hit as string], k = +p.hits;
        let expected = 0;
        for (let t = k; t < 3000; t++) {
          let ways = 1;
          for (let i = 1; i <= k - 1; i++) ways = (ways * (t - k + i)) / i;
          expected += t * ways * c ** k * (1 - c) ** (t - k);
        }
        return expected;
      }
      if (p.type === "first-on") {
        // Of every hit/miss sequence over that many tries, the ones whose first hit is last.
        const on = +p.on;
        return weightedSequences(on, HIT_CHANCES[p.hit as string])
          .filter(({ seq }) => seq.indexOf(1) === on - 1)
          .reduce((sum, { weight }) => sum + weight, 0);
      }
      if (p.type === "both-sides") {
        // E[N] = sum over t of P(N > t); after t ≥ 1 flips you're still waiting only if all match.
        const heads = +p.headsN / +p.headsD;
        let expected = 1;
        for (let t = 1; t < 3000; t++) expected += heads ** t + (1 - heads) ** t;
        return expected;
      }
      // First-step analysis: V = (counted part of the target) + every other face, once on average.
      const sides = +p.sides, target = +p.target;
      const others = faces(sides).filter((f) => f !== target).reduce((sum, f) => sum + f, 0);
      return (p.last === "with" ? target : 0) + others;
    }
    case "normal": {
      if (p.type === "range") return bandShare((band) => band.a >= +p.lo && band.b <= +p.hi);
      const condition = NORMAL_EVENTS[p.condition as string], event = NORMAL_EVENTS[p.event as string];
      return bandShare((band) => condition(band) && event(band)) / bandShare(condition);
    }
  }
  throw new Error(`No check for ${lessonId}`);
}

test("distributions answers agree with an independent working", () => {
  checkAgainstIndependentWorking(DISTRIBUTIONS_LESSONS, independentAnswer, { tolerance: { geometric: 1e-7 } });
});
