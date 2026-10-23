/**
 * Exact fractions for quant answers. Every answer is rational (dice, cards, odds), so it is
 * kept exact and only rounded for display; a typed answer is compared against the exact value.
 */

export type Rational = { n: number; d: number };

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function q(n: number, d = 1): Rational {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error(`Bad fraction ${n}/${d}`);
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return { n: (sign * n) / g, d: (sign * d) / g };
}

export const add = (x: Rational, y: Rational) => q(x.n * y.d + y.n * x.d, x.d * y.d);
export const sub = (x: Rational, y: Rational) => q(x.n * y.d - y.n * x.d, x.d * y.d);
export const mul = (x: Rational, y: Rational) => q(x.n * y.n, x.d * y.d);
export const div = (x: Rational, y: Rational) => q(x.n * y.d, x.d * y.n);
export const pow = (x: Rational, k: number) => q(x.n ** k, x.d ** k);
export const value = (x: Rational) => x.n / x.d;
export const equals = (x: Rational, y: Rational) => x.n === y.n && x.d === y.d;

/** Whether the decimal ends within `places` digits (1/8 = 0.125 does, 1/6 doesn't). */
function terminatesWithin(x: Rational, places: number) {
  return (x.n * 10 ** places) % x.d === 0;
}

/** "3/8", "5", "−1/6". */
export function formatFraction(x: Rational) {
  const sign = x.n < 0 ? "−" : "";
  const n = Math.abs(x.n);
  return x.d === 1 ? `${sign}${n}` : `${sign}${n}/${x.d}`;
}

/** A plain decimal with at most `maxPlaces` places and no trailing zeros: 4.25, 0.385, 13. */
export function formatDecimal(x: Rational, maxPlaces = 3) {
  const v = value(x);
  // Three significant figures for small values, so 1/221 doesn't round to 0.
  const places = Math.abs(v) >= 1 || v === 0 ? maxPlaces : Math.max(maxPlaces, 2 - Math.floor(Math.log10(Math.abs(v))));
  const text = v.toFixed(places).replace(/\.?0+$/, "");
  return text.replace("-", "−");
}

/** 25%, 16.7%, 5.26%: three significant figures, at most two decimal places. */
export function formatPercent(x: Rational) {
  const p = value(x) * 100;
  const places = Math.abs(p) >= 100 ? 0 : Math.abs(p) >= 10 ? 1 : 2;
  return `${p.toFixed(places).replace(/\.?0+$/, "").replace("-", "−")}%`;
}

export function formatDollars(x: Rational) {
  const v = value(x);
  const cents = Math.round(Math.abs(v) * 100);
  const text = cents % 100 === 0 ? `${cents / 100}` : (cents / 100).toFixed(2);
  return `${v < 0 ? "−" : ""}$${text}`;
}

/** How an answer is asked for and typed. */
export type AnswerKind = "probability" | "percent" | "number" | "dollars";

/** The answer as shown after a miss: exact where that's clearer, with the rounded value. */
export function formatAnswer(x: Rational, kind: AnswerKind) {
  switch (kind) {
    case "probability":
      return x.d === 1 ? formatFraction(x) : `${formatFraction(x)} ${terminatesWithin(x, 4) ? "=" : "≈"} ${formatPercent(x)}`;
    case "percent":
      return `${terminatesWithin(x, 4) ? "" : "≈ "}${formatPercent(x)}`;
    case "dollars":
      return `${terminatesWithin(x, 2) ? "" : "≈ "}${formatDollars(x)}`;
    case "number":
      return terminatesWithin(x, 3) ? formatDecimal(x) : `${formatFraction(x)} ≈ ${formatDecimal(x)}`;
  }
}

/** The answer in its shortest form, as a step result: 4/13, 25%, $1.67, 4.25. */
export function formatResult(x: Rational, kind: AnswerKind) {
  switch (kind) {
    case "probability":
      return formatFraction(x);
    case "percent":
      return formatPercent(x);
    case "dollars":
      return formatDollars(x);
    case "number":
      return terminatesWithin(x, 3) ? formatDecimal(x) : formatFraction(x);
  }
}

/**
 * The values a typed answer could mean. "1/6" is exact; "16.7%" is a percentage. A plain
 * number in a percent question is read as a percentage, or as a decimal if that fits
 * (20% typed as 0.2). Spaces, "$" and thousands commas are ignored.
 */
export function readAnswer(input: string, kind: AnswerKind): number[] {
  const text = input.replace(/[\s$,]/g, "").replace(/[−–]/g, "-");
  const fraction = text.match(/^(-?\d+)\/(\d+)$/);
  if (fraction) {
    const d = Number(fraction[2]);
    return d === 0 ? [] : [Number(fraction[1]) / d];
  }
  const percent = text.match(/^(-?(?:\d+\.?\d*|\.\d+))%$/);
  if (percent) return [Number(percent[1]) / 100];
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(text)) return [];
  const number = Number(text);
  return kind === "percent" ? [number / 100, number] : [number];
}

// Rounding to three significant figures is at most 0.5% off; this leaves a little room.
const RELATIVE_TOLERANCE = 0.006;

/** Whether a typed answer is right: exact, or a decimal that rounds to it. */
export function isRightAnswer(input: string, answer: Rational, kind: AnswerKind) {
  const target = value(answer);
  // Money is right to the nearest cent, however small the amount.
  const tolerance = Math.max(RELATIVE_TOLERANCE * Math.abs(target), kind === "dollars" ? 0.005 + 1e-9 : 0);
  return readAnswer(input, kind).some((typed) => Math.abs(typed - target) < 1e-9 || Math.abs(typed - target) <= tolerance);
}
