import test from "node:test";
import assert from "node:assert/strict";
import { STATES_LESSONS, patternOverlaps } from "./markov";
import { checkAgainstIndependentWorking, choose, faces, sequences, solve } from "../test-helpers";
import type { QuantProblem } from "../build";

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "coupon-collector": {
      // E[T] = sum over t of P(not every face seen after t rolls), by inclusion–exclusion.
      const n = +p.sides;
      let expected = 0;
      for (let t = 0; t < 3000; t++) {
        let notAll = 0;
        for (let j = 1; j <= n; j++) notAll += (j % 2 ? 1 : -1) * choose(n, j) * (1 - j / n) ** t;
        expected += notAll;
      }
      return expected;
    }
    case "patterns": {
      // Solve the waiting-time equations over "how much of the pattern is matched" states.
      const pattern = String(p.pattern).split(" ");
      const alphabet = p.type === "die" ? faces(6).map(String) : ["H", "T"];
      const heads = p.type === "biased" ? +p.headsN / +p.headsD : 1 / 2;
      const chance = (symbol: string) => (p.type === "die" ? 1 / 6 : symbol === "H" ? heads : 1 - heads);
      const step = (matched: number, symbol: string) => {
        const seen = [...pattern.slice(0, matched), symbol];
        for (let k = Math.min(seen.length, pattern.length); k > 0; k--) {
          if (seen.slice(seen.length - k).every((s, i) => s === pattern[i])) return k;
        }
        return 0;
      };
      const size = pattern.length;
      // E[m] = 1 + average of E[next]; E[size] = 0. As a linear system A·E = b.
      const a = Array.from({ length: size }, () => Array(size).fill(0));
      const b = Array(size).fill(1);
      for (let m = 0; m < size; m++) {
        a[m][m] += 1;
        for (const symbol of alphabet) {
          const next = step(m, symbol);
          if (next < size) a[m][next] -= chance(symbol);
        }
      }
      return solve(a, b)[0];
    }
    case "random-walks": {
      // Chances: solve P[i] = win·P[i+1] + lose·P[i−1], P[0] = 0, P[target] = 1.
      // Durations: solve E[i] = 1 + win·E[i+1] + lose·E[i−1], E[0] = E[target] = 0.
      const target = +p.target, win = +p.winN / +p.winD;
      const duration = p.ask === "bets" || p.ask === "walk";
      const size = target + 1;
      const a = Array.from({ length: size }, () => Array(size).fill(0));
      const b = Array(size).fill(0);
      a[0][0] = 1;
      a[target][target] = 1;
      if (!duration) b[target] = 1;
      for (let i = 1; i < target; i++) {
        a[i][i] = 1;
        a[i][i + 1] = -win;
        a[i][i - 1] = -(1 - win);
        if (duration) b[i] = 1;
      }
      const result = solve(a, b)[+p.start];
      return p.ask === "broke" ? 1 - result : result;
    }
    case "optimal-stopping": {
      if (p.type === "uniform") {
        // Numerically integrate max(x, value of going on) over x, one redraw at a time.
        const steps = 200000;
        const average = (f: (x: number) => number) => {
          let sum = 0;
          for (let i = 0; i < steps; i++) sum += f((i + 0.5) / steps);
          return sum / steps;
        };
        let worth = average((x) => x);
        for (let i = 0; i < +p.redraws; i++) {
          const goOn = worth;
          worth = average((x) => Math.max(x, goOn));
        }
        return worth * +p.scale;
      }
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
  }
  throw new Error(`No check for ${lessonId}`);
}

test("markov answers agree with an independent working", () => {
  checkAgainstIndependentWorking(STATES_LESSONS, independentAnswer, {
    samples: { "optimal-stopping": 60 },
    tolerance: { "coupon-collector": 1e-7, patterns: 1e-7, "random-walks": 1e-7, "optimal-stopping": 1e-6 },
  });
});

test("pattern overlaps are the lengths where the start matches the end", () => {
  assert.deepEqual(patternOverlaps(["H", "T", "H"]), [1, 3]);
  assert.deepEqual(patternOverlaps(["H", "H"]), [1, 2]);
  assert.deepEqual(patternOverlaps(["H", "T"]), [2]);
  assert.deepEqual(patternOverlaps(["H", "T", "H", "T"]), [2, 4]);
});
