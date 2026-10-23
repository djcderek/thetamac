import assert from "node:assert/strict";
import test from "node:test";
import { CLASSIC_B_PUZZLES } from "./classic-b";
import { value } from "../rational";

/** The share of an n × n grid of midpoints in the unit square where `inside` holds. */
function gridShare(inside: (x: number, y: number) => boolean, n = 1500) {
  let hits = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (inside((i + 0.5) / n, (j + 0.5) / n)) hits++;
  return hits / (n * n);
}

/** Each puzzle's answer worked out a different way, with the tolerance that method allows. */
const CHECKS: Record<string, { answer: () => number; tolerance: number }> = {
  // Draw marble by marble, tracking what's left, and stop when the reds run out.
  "last-colour-standing": {
    tolerance: 1e-12,
    answer: () => {
      const memo = new Map<string, number>();
      const go = (r: number, b: number, g: number): number => {
        if (r === 0) return b > 0 && g > 0 ? 1 : 0;
        const key = `${r},${b},${g}`;
        if (memo.has(key)) return memo.get(key)!;
        const n = r + b + g;
        const result = (r / n) * go(r - 1, b, g) + (b ? (b / n) * go(r, b - 1, g) : 0) + (g ? (g / n) * go(r, b, g - 1) : 0);
        memo.set(key, result);
        return result;
      };
      return go(3, 2, 2);
    },
  },
  // Push the chance of each goal count forward kick by kick.
  "polya-urn": {
    tolerance: 1e-12,
    answer: () => {
      let dist = new Map([[0, 1]]); // goals among the next kicks
      for (let kick = 0; kick < 10; kick++) {
        const next = new Map<number, number>();
        for (const [goals, chance] of dist) {
          const scoreChance = (1 + goals) / (2 + kick);
          next.set(goals + 1, (next.get(goals + 1) ?? 0) + chance * scoreChance);
          next.set(goals, (next.get(goals) ?? 0) + chance * (1 - scoreChance));
        }
        dist = next;
      }
      return dist.get(6) ?? 0;
    },
  },
  // Value iteration over (corners visited, where the ant is).
  "ant-on-a-tetrahedron": {
    tolerance: 1e-9,
    answer: () => {
      const full = 0b1111;
      const e = Array.from({ length: 16 }, () => Array(4).fill(0));
      for (let sweep = 0; sweep < 5000; sweep++) {
        for (let mask = 0; mask < 16; mask++) {
          for (let pos = 0; pos < 4; pos++) {
            if (!(mask & (1 << pos))) continue;
            if (mask === full && pos === 0) {
              e[mask][pos] = 0;
              continue;
            }
            let sum = 0;
            for (let to = 0; to < 4; to++) if (to !== pos) sum += e[mask | (1 << to)][to];
            e[mask][pos] = 1 + sum / 3;
          }
        }
      }
      return e[1][0];
    },
  },
  // Solve for the expected final highest from each running highest.
  "highest-roll-before-a-four": {
    tolerance: 1e-9,
    answer: () => {
      const v = Array(7).fill(0);
      for (let sweep = 0; sweep < 5000; sweep++) {
        for (let m = 0; m <= 6; m++) {
          let sum = Math.max(m, 4);
          for (const f of [1, 2, 3, 5, 6]) sum += v[Math.max(m, f)];
          v[m] = sum / 6;
        }
      }
      return v[0];
    },
  },
  // Double sum over Alice's and Bob's flip counts.
  "two-coin-waits": {
    tolerance: 1e-12,
    answer: () => {
      let both = 0, weighted = 0;
      for (let a = 1; a < 80; a++) for (let b = a + 1; b < 160; b++) {
        const chance = 0.5 ** a * 0.5 ** b;
        both += chance;
        weighted += a * chance;
      }
      return weighted / both;
    },
  },
  // The chance of stopping on each roll, times that roll.
  "rolling-until-a-repeat": {
    tolerance: 1e-12,
    answer: () => {
      let expected = 0, allDifferent = 1;
      for (let r = 1; r <= 7; r++) {
        // Stop on roll r: the first r − 1 differ, then roll r repeats one of them.
        expected += r * allDifferent * ((r - 1) / 6);
        allDifferent *= (6 - (r - 1)) / 6;
      }
      return expected;
    },
  },
  // Compute every place's winning chance and take the best.
  "free-ice-cream-line": {
    tolerance: 0,
    answer: () => {
      let best = 1, bestChance = 0, differ = 1;
      for (let n = 1; n <= 366; n++) {
        const chance = differ * ((n - 1) / 365);
        if (chance > bestChance) [best, bestChance] = [n, chance];
        differ *= (365 - (n - 1)) / 365;
      }
      return best;
    },
  },
  // Every one of the 6⁶ sequences of spins, with its profit.
  "gambler-and-friend": {
    tolerance: 1e-12,
    answer: () => {
      let behind = 0;
      for (let code = 0; code < 6 ** 6; code++) {
        let wins = 0;
        for (let c = code, i = 0; i < 6; i++, c = Math.floor(c / 6)) if (c % 6 === 0) wins++;
        if (5 * wins - (6 - wins) < 0) behind++;
      }
      return behind / 6 ** 6;
    },
  },
  // Push the chance of each running total forward until it passes the target.
  "running-total-past-a-target": {
    tolerance: 1e-12,
    answer: () => {
      let open = new Map([[0, 1]]);
      let expected = 0;
      while (open.size) {
        const next = new Map<number, number>();
        for (const [total, chance] of open) {
          for (let f = 1; f <= 4; f++) {
            const t = total + f;
            if (t >= 10) expected += (chance / 4) * t;
            else next.set(t, (next.get(t) ?? 0) + chance / 4);
          }
        }
        open = next;
      }
      return expected;
    },
  },
  // Count grid points where the three pieces make a triangle.
  "broken-stick-triangle": {
    tolerance: 2e-3,
    answer: () =>
      gridShare((x, y) => {
        const [a, b] = x < y ? [x, y] : [y, x];
        const pieces = [a, b - a, 1 - b];
        return pieces.every((p) => p < 1 - p);
      }),
  },
  // Count grid points where the shortest piece is 20 cm or less.
  "shortest-piece": {
    tolerance: 2e-3,
    answer: () =>
      gridShare((x, y) => {
        const [a, b] = x < y ? [x, y] : [y, x];
        return Math.min(a, b - a, 1 - b) <= 0.2;
      }),
  },
  // Fix one point at 0°, put the others on a grid, and test the triangle's angles directly.
  "acute-triangle-on-a-circle": {
    tolerance: 3e-3,
    answer: () =>
      gridShare((x, y) => {
        const point = (t: number) => [Math.cos(2 * Math.PI * t), Math.sin(2 * Math.PI * t)];
        const [A, B, C] = [point(0), point(x), point(y)];
        const dot = (p: number[], q: number[], r: number[]) => (q[0] - p[0]) * (r[0] - p[0]) + (q[1] - p[1]) * (r[1] - p[1]);
        // Acute when every angle's two sides have a positive dot product.
        return dot(A, B, C) > 0 && dot(B, A, C) > 0 && dot(C, A, B) > 0;
      }, 1200),
  },
};

test("every second-batch puzzle has an independent check, and agrees with it", () => {
  for (const puzzle of CLASSIC_B_PUZZLES) {
    const check = CHECKS[puzzle.id];
    assert.ok(check, `no check for ${puzzle.id}`);
    const expected = check.answer();
    const got = value(puzzle.problem.answer);
    assert.ok(Math.abs(got - expected) <= check.tolerance + 1e-12, `${puzzle.id}: ${got} vs ${expected}`);
  }
});
