import test from "node:test";
import { CONTINUOUS_LESSONS } from "./continuous";
import { checkAgainstIndependentWorking, faces, sequences } from "../test-helpers";

/** Exact integral of a piecewise-linear f over [0, width]: trapezoids between its kinks. */
function integrateLinearPieces(f: (x: number) => number, width: number, kinks: number[]) {
  const cuts = [...new Set([0, width, ...kinks.filter((k) => k > 0 && k < width)])].sort((a, b) => a - b);
  let total = 0;
  for (let i = 0; i < cuts.length - 1; i++) total += ((f(cuts[i]) + f(cuts[i + 1])) / 2) * (cuts[i + 1] - cuts[i]);
  return total;
}

/** Simpson's rule, plenty accurate for the smooth polynomials here. */
function simpson(f: (x: number) => number, from: number, to: number, steps = 2000) {
  const h = (to - from) / steps;
  let sum = f(from) + f(to);
  for (let i = 1; i < steps; i++) sum += f(from + i * h) * (i % 2 ? 4 : 2);
  return (sum * h) / 3;
}
import type { QuantProblem } from "../build";

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "uniform": {
      // Integrate the uniform density directly with Simpson's rule.
      const low = +(p.low ?? 0), high = +p.high;
      const density = 1 / (high - low);
      if (p.type === "between") return simpson(() => density, +p.from, +p.to);
      if (p.type === "above" || p.type === "wait") return simpson(() => density, +p.from, high);
      const mean = simpson((x) => x * density, low, high);
      if (p.type === "average") return mean;
      if (p.type === "average-above") return simpson((x) => x * density, +p.from, high) / simpson(() => density, +p.from, high);
      return simpson((x) => (x - mean) ** 2 * density, low, high);
    }
    case "area": {
      if (p.type === "meet" || p.type === "stick") {
        // Integrate the closeness chance over the first point, piece by linear piece.
        const window = +p.window, wait = +p.wait;
        const meetLength = (x: number) => Math.min(window, x + wait) - Math.max(0, x - wait);
        return integrateLinearPieces(meetLength, window, [wait, window - wait]) / (window * window);
      }
      if (p.type === "sum") {
        // For each x, the y in [0, 1] with x + y < t.
        const t = +p.tN / +p.tD;
        return integrateLinearPieces((x) => Math.min(1, Math.max(0, t - x)), 1, [t - 1, t]);
      }
      // For each x, the y in [0, 1] with y < x ÷ k.
      const k = +p.kN / +p.kD;
      return integrateLinearPieces((x) => Math.min(1, x / k), 1, [k]);
    }
    case "highest-lowest": {
      if (p.type === "max" || p.type === "min") {
        // E[max] = ∫ P(max > x) dx = ∫ (1 − xⁿ) dx; E[min] = ∫ P(min > x) dx = ∫ (1 − x)ⁿ dx.
        const n = +p.n;
        const tail = p.type === "max" ? (x: number) => 1 - x ** n : (x: number) => (1 - x) ** n;
        return simpson(tail, 0, 1) * +p.scale;
      }
      if (p.side === "below" || p.side === "above") {
        // Integrate the density of the max (n·tⁿ⁻¹) or of the min (n·(1 − t)ⁿ⁻¹).
        const n = +p.n, x = +p.xN / +p.xD;
        return p.side === "below"
          ? simpson((t) => n * t ** (n - 1), 0, x)
          : simpson((t) => n * (1 - t) ** (n - 1), x, 1);
      }
      const rolls = sequences(faces(+p.sides), +p.dice);
      const pickRoll = (r: number[]) => (p.type === "highest" ? Math.max(...r) : Math.min(...r));
      return rolls.reduce((sum, r) => sum + pickRoll(r), 0) / rolls.length;
    }
  }
  throw new Error(`No check for ${lessonId}`);
}

test("continuous answers agree with an independent working", () => {
  checkAgainstIndependentWorking(CONTINUOUS_LESSONS, independentAnswer, { tolerance: { uniform: 1e-9, "highest-lowest": 1e-9 } });
});
