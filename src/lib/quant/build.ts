import { formatFraction, formatResult, q, type AnswerKind, type Rational } from "./rational";
import type { QuantLessonId } from "./ids";

/** Shared pieces for building quant problems: types, randomness, cards, dice and text helpers. */

/** One line of working: "Pot after your call: 60 + 20 + 20 = 100". */
export type QuantStep = { label: string; work: string; result: string };

export type QuantProblem = {
  /** Identifies the problem, so a set never repeats one. */
  key: string;
  prompt: string;
  answer: Rational;
  kind: AnswerKind;
  steps: QuantStep[];
  /** The numbers the problem was built from, so tests can work the answer out again. */
  params: Record<string, number | string>;
};

export type Random = () => number;

/** A lesson as a unit defines it; the course adds its unit. */
export type QuantLessonDef = {
  id: QuantLessonId;
  /** The concept's name, as interviewers and textbooks say it. */
  title: string;
  /** What the player learns to do, short enough for one line of a phone list. */
  benefit: string;
  /** The method in a sentence or two. */
  idea: string;
  /** Average seconds per solo problem to master it. */
  targetSeconds: number;
  example: QuantProblem;
  generate: (random: Random) => QuantProblem;
};

export function int(random: Random, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function pick<T>(random: Random, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)];
}

export const frac = (n: number, d = 1) => formatFraction(q(n, d));

export function problem(
  key: string,
  prompt: string,
  answer: Rational,
  kind: AnswerKind,
  steps: { label: string; work: string; result?: string }[],
  params: QuantProblem["params"],
): QuantProblem {
  // The last step's result is the answer, in the form the question asks for.
  const withResult = steps.map((step, index) => ({
    label: step.label,
    work: step.work,
    result: index === steps.length - 1 ? formatResult(answer, kind) : (step.result ?? ""),
  }));
  return { key, prompt, answer, kind, steps: withResult, params };
}

/** 2598960 → "2,598,960". */
export const commas = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export const sup = (n: number) => String(n).replace(/\d/g, (digit) => SUPERSCRIPTS[Number(digit)]);

export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

export function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// ─── Cards ───────────────────────────────────────────────────────────────────────────────

export type Card = { rank: number; suit: "hearts" | "diamonds" | "clubs" | "spades" };
const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
export const DECK: Card[] = SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ rank: i + 1, suit })));
export const isRed = (card: Card) => card.suit === "hearts" || card.suit === "diamonds";
export const isFace = (card: Card) => card.rank >= 11;

/** Single-card events, with how the count is made up (tests check the breakdown adds up). */
export const CARD_EVENTS: { id: string; label: string; test: (card: Card) => boolean; breakdown: string }[] = [
  { id: "heart", label: "a heart", test: (c) => c.suit === "hearts", breakdown: "13 hearts" },
  { id: "face", label: "a face card (J, Q or K)", test: isFace, breakdown: "3 faces × 4 suits" },
  { id: "ace", label: "an ace", test: (c) => c.rank === 1, breakdown: "4 aces" },
  { id: "heart-or-king", label: "a heart or a king", test: (c) => c.suit === "hearts" || c.rank === 13, breakdown: "13 hearts + 3 other kings" },
  { id: "red-face", label: "a red face card", test: (c) => isRed(c) && isFace(c), breakdown: "3 faces × 2 red suits" },
  { id: "spade-or-ace", label: "a spade or an ace", test: (c) => c.suit === "spades" || c.rank === 1, breakdown: "13 spades + 3 other aces" },
  { id: "two-to-four", label: "a 2, 3 or 4", test: (c) => c.rank >= 2 && c.rank <= 4, breakdown: "3 ranks × 4 suits" },
  { id: "red-or-face", label: "red or a face card", test: (c) => isRed(c) || isFace(c), breakdown: "26 red + 6 black faces" },
  { id: "club-or-face", label: "a club or a face card", test: (c) => c.suit === "clubs" || isFace(c), breakdown: "13 clubs + 9 other faces" },
  { id: "black-king", label: "a black king", test: (c) => !isRed(c) && c.rank === 13, breakdown: "2 black kings" },
];

/** Two-card draws (in order, no replacement). */
export const DRAW_EVENTS: { id: string; label: string; count: number }[] = [
  { id: "aces", label: "aces", count: 4 },
  { id: "hearts", label: "hearts", count: 13 },
  { id: "face", label: "face cards", count: 12 },
  { id: "red", label: "red", count: 26 },
];

// ─── Dice ────────────────────────────────────────────────────────────────────────────────

export const DIE_SIDES = [4, 6, 8, 10, 12, 20] as const;
/** Ordered pairs of two six-sided dice making a total. */
export const waysToTotal = (total: number) => Math.max(0, 6 - Math.abs(total - 7));
export const pairsFor = (total: number) =>
  Array.from({ length: 6 }, (_, i) => i + 1)
    .filter((a) => total - a >= 1 && total - a <= 6)
    .map((a) => `${a}+${total - a}`);

export const timesWord = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
export const numberWord = (n: number) => ["no", "one", "two", "three", "four", "five", "six"][n] ?? String(n);
