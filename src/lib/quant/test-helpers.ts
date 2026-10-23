import assert from "node:assert/strict";
import { getQuantLesson, type QuantLesson, type QuantProblem } from "./lessons";
import { value } from "./rational";

/** Shared pieces for the quant tests: seeded sampling and brute-force tools. */

// A seeded random, so a failure can be replayed.
export function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Every problem a lesson makes over many seeds, plus its worked example. */
export function sample(lessonId: string, count = 300) {
  const lesson = getQuantLesson(lessonId)!;
  const random = seeded(lessonId.length * 97 + 11);
  return [lesson.example, ...Array.from({ length: count }, () => lesson.generate(random))];
}

/** All sequences of `length` picks from `values` (with repeats). */
export function sequences<T>(values: T[], length: number): T[][] {
  if (length === 0) return [[]];
  return sequences(values, length - 1).flatMap((rest) => values.map((v) => [...rest, v]));
}

/** All ordered draws of `length` distinct items. */
export function draws<T>(items: T[], length: number): T[][] {
  if (length === 0) return [[]];
  return items.flatMap((item, i) => draws([...items.slice(0, i), ...items.slice(i + 1)], length - 1).map((rest) => [item, ...rest]));
}

export const faces = (sides: number) => Array.from({ length: sides }, (_, i) => i + 1);
export const share = <T>(all: T[], test: (x: T) => boolean) => all.filter(test).length / all.length;

export function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}
export function derangements(n: number): number {
  return n === 0 ? 1 : n === 1 ? 0 : (n - 1) * (derangements(n - 1) + derangements(n - 2));
}

/** Gaussian elimination with partial pivoting. */
export function solve(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = m[r][col] / m[col][col];
      for (let c = col; c <= n; c++) m[r][c] -= factor * m[col][c];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/**
 * Checks every problem a unit's lessons make against an independent working (brute force or
 * a different formula). `check` returns the expected value, or throws for a lesson it lacks.
 */
export function checkAgainstIndependentWorking(
  lessons: readonly Pick<QuantLesson, "id">[],
  check: (lessonId: string, problem: QuantProblem) => number,
  options: { samples?: Partial<Record<string, number>>; tolerance?: Partial<Record<string, number>> } = {},
) {
  for (const lesson of lessons) {
    const seen = new Set<string>();
    for (const problem of sample(lesson.id, options.samples?.[lesson.id] ?? 300)) {
      if (seen.has(problem.key)) continue;
      seen.add(problem.key);
      const expected = check(lesson.id, problem);
      const tolerance = options.tolerance?.[lesson.id] ?? 1e-9;
      assert.ok(
        Math.abs(value(problem.answer) - expected) < tolerance,
        `${lesson.id} ${problem.key}: ${value(problem.answer)} vs ${expected}`,
      );
    }
  }
}
