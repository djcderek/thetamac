import test from "node:test";
import { DISTRIBUTIONS_LESSONS } from "./distributions";
import { DECK, type QuantProblem } from "../build";
import { checkAgainstIndependentWorking, faces, sequences, share, solve } from "../test-helpers";

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

/** The k-th-success settings' chances. */
const KTH_CHANCES: Record<string, number> = { coin: 0.5, fish: 0.5, die: 1 / 6, "free-throws": 3 / 4 };

/** Faces you're told never came up, re-listed here. */
const FORBIDDEN_FACES: Record<string, number[]> = {
  "no-5": [5],
  "no-1": [1],
  "no-4-5": [4, 5],
  "no-1-2": [1, 2],
  even: [1, 3, 5],
  "four-up": [1, 2, 3],
  "five-up": [1, 2, 3, 4],
};

/** Standard normal density, and its integral from a to b by Simpson's rule. */
const phi = (x: number) => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
function integrate(f: (x: number) => number, a: number, b: number, steps = 4000) {
  const h = (b - a) / steps;
  let sum = f(a) + f(b);
  for (let i = 1; i < steps; i++) sum += f(a + i * h) * (i % 2 ? 4 : 2);
  return (sum * h) / 3;
}
/** P(Z < z), by integrating the density (no symmetry shortcuts). */
const Phi = (z: number) => integrate(phi, -10, z, 2000);

/** Expected children or boys for couples who stop at a girl (or two, or a girl or three children), by exploring every family. */
function familyAverage(stop: string, ask: string) {
  let expected = 0;
  const explore = (girls: number, boys: number, chance: number) => {
    const done = stop === "girl" ? girls >= 1 : stop === "two-girls" ? girls >= 2 : girls >= 1 || girls + boys >= 3;
    if (done || girls + boys > 80) {
      expected += chance * (ask === "children" ? girls + boys : boys);
      return;
    }
    explore(girls + 1, boys, chance / 2);
    explore(girls, boys + 1, chance / 2);
  };
  explore(0, 0, 1);
  return expected;
}

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "binomial": {
      if (p.type === "odd") {
        return weightedSequences(+p.flips, +p.headsN / +p.headsD)
          .filter(({ seq }) => seq.reduce((sum, hit) => sum + hit, 0) % 2 === 1)
          .reduce((sum, { weight }) => sum + weight, 0);
      }
      if (p.type === "groups") {
        const a = +p.first;
        return share(sequences(["H", "T"], a + +p.last), (flips) => {
          const heads = (part: string[]) => part.filter((f) => f === "H").length;
          return heads(flips.slice(0, a)) === heads(flips.slice(a));
        });
      }
      if (p.type === "vote") {
        // Every way the three jurors can vote, with its chance; count the right majorities.
        const careful = +p.percent / 100;
        const chances = p.jury === "coin" ? [careful, careful, 0.5] : [careful, careful, careful];
        return sequences([1, 0], 3)
          .filter((votes) => votes.reduce((sum, v) => sum + v, 0) >= 2)
          .reduce((sum, votes) => sum + votes.reduce((w, v, i) => w * (v ? chances[i] : 1 - chances[i]), 1), 0);
      }
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
      if (p.type === "kth") {
        // Every hit/miss sequence of n tries whose last try is the k-th hit.
        const n = +p.n, k = +p.k;
        return weightedSequences(n, KTH_CHANCES[p.setting as string])
          .filter(({ seq }) => seq[n - 1] === 1 && seq.reduce((sum, hit) => sum + hit, 0) === k)
          .reduce((sum, { weight }) => sum + weight, 0);
      }
      if (p.type === "given") {
        // E[rolls | no forbidden face before the 6] = Σ t P(stop at t, none seen) ÷ P(none seen), as series.
        const allowed = (5 - FORBIDDEN_FACES[p.forbidden as string].length) / 6;
        let top = 0, bottom = 0;
        for (let t = 1; t < 2000; t++) {
          const chance = allowed ** (t - 1) / 6;
          top += t * chance;
          bottom += chance;
        }
        return top / bottom;
      }
      if (p.type === "multiple") {
        // Solve the expected-rolls equations over the total's remainder (1 … m − 1), then take one roll from 0.
        const sides = +p.sides, m = +p.m;
        const size = m - 1;
        const a = Array.from({ length: size }, () => Array(size).fill(0));
        const b = Array(size).fill(1);
        for (let r = 1; r < m; r++) {
          a[r - 1][r - 1] += 1;
          for (const f of faces(sides)) {
            const next = (r + f) % m;
            if (next !== 0) a[r - 1][next - 1] -= 1 / sides;
          }
        }
        const e = size ? solve(a, b) : [];
        return 1 + faces(sides).reduce((sum, f) => sum + (f % m === 0 ? 0 : e[(f % m) - 1] / sides), 0);
      }
      if (p.type === "family") return familyAverage(p.stop as string, p.ask as string);
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
      if (p.type === "symmetry") {
        const v = String(p.variant);
        const positive = integrate(phi, 0, 10);
        if (v.startsWith("ratio-")) {
          // X = sx·u: P(Y > kX) = ∫ φ(u) P(Y/sy > k·sx·u/sy) du.
          const [, k, sx, sy] = v.split("-").map(Number);
          return integrate((u) => phi(u) * (1 - Phi((k * sx * u) / sy)), -10, 10, 2000);
        }
        if (v === "sum") return integrate((u) => phi(u) * (1 - Phi(-u)), -10, 10, 2000);
        if (v === "same-sign") return 2 * positive * positive;
        if (v === "further") return integrate((u) => phi(u) * 2 * (1 - Phi(Math.abs(u))), -10, 10, 2000);
        if (v === "both-positive") return positive ** 2;
        return positive ** 3;
      }
      if (p.type === "sum" || p.type === "average") {
        // Work the z-scores out again from the thresholds in the question's units.
        const mean = p.type === "sum" ? +p.m1 + +p.m2 : +p.mean;
        const sd = p.type === "sum" ? Math.hypot(+p.a, +p.b) : +p.sd / Math.sqrt(+p.n);
        const z = (x: number) => {
          const raw = (x - mean) / sd;
          if (Math.abs(raw - Math.round(raw)) > 1e-9) throw new Error(`${problem.key}: threshold isn't a whole number of SDs`);
          return Math.round(raw);
        };
        const region = String(p.region);
        const z1 = z(+p.x1);
        if (region.startsWith("above")) return bandShare((band) => band.a >= z1);
        if (region.startsWith("below")) return bandShare((band) => band.b <= z1);
        const z2 = z(+p.x2);
        return bandShare((band) => band.a >= z1 && band.b <= z2);
      }
      if (p.type === "range") return bandShare((band) => band.a >= +p.lo && band.b <= +p.hi);
      const condition = NORMAL_EVENTS[p.condition as string], event = NORMAL_EVENTS[p.event as string];
      return bandShare((band) => condition(band) && event(band)) / bandShare(condition);
    }
  }
  throw new Error(`No check for ${lessonId}`);
}

test("distributions answers agree with an independent working", () => {
  checkAgainstIndependentWorking(DISTRIBUTIONS_LESSONS, independentAnswer, { tolerance: { geometric: 1e-7, normal: 1e-7 } });
});
