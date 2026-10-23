import { div, formatFraction, formatResult, mul, pow, q, sub, type Rational } from "../rational";
import { int, pick, problem, sup, type QuantLessonDef, type QuantProblem } from "../build";

// ─── Uniform random numbers ──────────────────────────────────────────────────────────────

type UniformParams =
  | { type: "between"; low: number; high: number; from: number; to: number }
  | { type: "above"; low: number; high: number; from: number }
  | { type: "wait"; high: number; from: number }
  | { type: "average"; low: number; high: number }
  | { type: "average-above"; low: number; high: number; from: number }
  | { type: "variance"; low: number; high: number };

function uniformNumber(params: UniformParams): QuantProblem {
  const picked = (low: number, high: number) => `A number is picked at random between ${low} and ${high}, every value equally likely.`;
  switch (params.type) {
    case "between": {
      const { low, high, from, to } = params;
      return problem(
        `between-${low}-${high}-${from}-${to}`,
        `${picked(low, high)} What's the chance it's between ${from} and ${to}?`,
        q(to - from, high - low),
        "probability",
        [
          { label: "Length you want", work: `${to} − ${from}`, result: `${to - from}` },
          { label: "Length of the whole range", work: `${high} − ${low}`, result: `${high - low}` },
          { label: "Chance", work: `${to - from} ÷ ${high - low}` },
        ],
        params,
      );
    }
    case "above": {
      const { low, high, from } = params;
      return problem(
        `above-${low}-${high}-${from}`,
        `${picked(low, high)} What's the chance it's more than ${from}?`,
        q(high - from, high - low),
        "probability",
        [
          { label: "Length you want", work: `${high} − ${from}`, result: `${high - from}` },
          { label: "Length of the whole range", work: `${high} − ${low}`, result: `${high - low}` },
          { label: "Chance", work: `${high - from} ÷ ${high - low}` },
        ],
        params,
      );
    }
    case "wait": {
      const { high, from } = params;
      return problem(
        `wait-${high}-${from}`,
        `A bus comes at a random time in the next ${high} minutes, every moment equally likely. What's the chance you wait more than ${from} minutes?`,
        q(high - from, high),
        "probability",
        [
          { label: "Minutes the bus could come after that", work: `${high} − ${from}`, result: `${high - from}` },
          { label: "Chance", work: `${high - from} ÷ ${high}` },
        ],
        params,
      );
    }
    case "average": {
      const { low, high } = params;
      return problem(
        `average-${low}-${high}`,
        `${picked(low, high)} What's its average?`,
        q(low + high, 2),
        "number",
        [{ label: "The average is the midpoint", work: `(${low} + ${high}) ÷ 2` }],
        params,
      );
    }
    case "average-above": {
      const { low, high, from } = params;
      return problem(
        `average-above-${low}-${high}-${from}`,
        `${picked(low, high)} You're told it's more than ${from}. What's its average now?`,
        q(from + high, 2),
        "number",
        [
          { label: "Now it’s equally likely anywhere from", work: `${from} to ${high}`, result: "" },
          { label: "The average is the new midpoint", work: `(${from} + ${high}) ÷ 2` },
        ],
        params,
      );
    }
    case "variance": {
      const { low, high } = params;
      const length = high - low;
      return problem(
        `variance-${low}-${high}`,
        `${picked(low, high)} What's its variance?`,
        q(length * length, 12),
        "number",
        [
          { label: "Length of the range", work: `${high} − ${low}`, result: `${length}` },
          { label: "Variance is length² ÷ 12", work: `${length}² ÷ 12` },
        ],
        params,
      );
    }
  }
}

const RANGES = [[0, 10], [0, 20], [0, 12], [0, 30], [2, 12], [5, 25], [10, 40], [4, 16]] as const;

function randomUniform(random: () => number): QuantProblem {
  const [low, high] = pick(random, RANGES);
  const inside = () => int(random, low + 1, high - 1);
  switch (pick(random, ["between", "above", "wait", "average", "average-above", "variance"] as const)) {
    case "between": {
      const a = inside();
      let b = inside();
      while (b === a) b = inside();
      return uniformNumber({ type: "between", low, high, from: Math.min(a, b), to: Math.max(a, b) });
    }
    case "above":
      return uniformNumber({ type: "above", low, high, from: inside() });
    case "wait": {
      const total = pick(random, [10, 12, 15, 20, 30]);
      return uniformNumber({ type: "wait", high: total, from: int(random, 1, total - 1) });
    }
    case "average":
      return uniformNumber({ type: "average", low, high });
    case "average-above":
      return uniformNumber({ type: "average-above", low, high, from: inside() });
    case "variance":
      return uniformNumber({ type: "variance", low, high });
  }
}

// ─── Probability as area ─────────────────────────────────────────────────────────────────

type AreaParams =
  | { type: "meet"; window: number; wait: number }
  | { type: "stick"; window: number; wait: number }
  | { type: "sum"; tN: number; tD: number }
  | { type: "ratio"; kN: number; kD: number };

/** "3/2" as "1.5", for multiples in prose. */
const multiple = (x: Rational) => (x.d === 1 ? `${x.n}` : formatResult(x, "number"));

function areaProblem(params: AreaParams): QuantProblem {
  if (params.type === "meet" || params.type === "stick") {
    const { window, wait } = params;
    const gap = window - wait;
    const miss = q(gap * gap, window * window);
    const prompt =
      params.type === "meet"
        ? `Two friends each arrive at a random time ${window === 60 ? "within the same hour" : "within the same half hour"}. Whoever comes first waits ${wait} minutes, then leaves. What's the chance they meet?`
        : `Two points are dropped at random on a ${window} cm stick. What's the chance they're less than ${wait} cm apart?`;
    const apart = params.type === "meet" ? `${wait} min` : `${wait} cm`;
    return problem(
      `${params.type}-${window}-${wait}`,
      prompt,
      sub(q(1), miss),
      "probability",
      [
        { label: `Two corner triangles: more than ${apart} apart`, work: `(${gap}/${window})²`, result: formatFraction(miss) },
        { label: params.type === "meet" ? "Chance they meet" : "Chance they’re close", work: `1 − ${formatFraction(miss)}` },
      ],
      params,
    );
  }

  const picked = "Two numbers are picked at random between 0 and 1, every value equally likely.";
  if (params.type === "sum") {
    const t = q(params.tN, params.tD);
    const tText = formatFraction(t);
    const key = `sum-${params.tN}-${params.tD}`;
    const prompt = `${picked} What's the chance their sum is less than ${tText}?`;
    if (params.tN <= params.tD) {
      return problem(
        key,
        prompt,
        div(mul(t, t), q(2)),
        "probability",
        [{ label: `Triangle below the line x + y = ${tText}`, work: `(${tText})² ÷ 2` }],
        params,
      );
    }
    const corner = div(pow(sub(q(2), t), 2), q(2));
    return problem(
      key,
      prompt,
      sub(q(1), corner),
      "probability",
      [
        { label: `Corner triangle where the sum is over ${tText}`, work: `(2 − ${tText})² ÷ 2`, result: formatFraction(corner) },
        { label: `Chance it’s under ${tText}`, work: `1 − ${formatFraction(corner)}` },
      ],
      params,
    );
  }

  const k = q(params.kN, params.kD);
  const height = div(q(1), k);
  return problem(
    `ratio-${params.kN}-${params.kD}`,
    `${picked} What's the chance the first is more than ${multiple(k)} times the second?`,
    div(height, q(2)),
    "probability",
    [
      { label: `Where x > ${multiple(k)}y: a triangle, base 1, height`, work: `1 ÷ ${multiple(k)}`, result: formatFraction(height) },
      { label: "Its area", work: `1 × ${formatFraction(height)} ÷ 2` },
    ],
    params,
  );
}

const SUM_LIMITS = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [5, 4], [4, 3], [3, 2], [5, 3], [7, 4]] as const;
const RATIOS = [[3, 2], [2, 1], [5, 2], [3, 1], [4, 1], [5, 1]] as const;

// ─── Highest and lowest values ───────────────────────────────────────────────────────────

function highestOrLowest(params: { type: "highest" | "lowest"; dice: number; sides: number }): QuantProblem {
  const { type, dice, sides } = params;
  // Ways the highest is k: all dice ≤ k, minus all dice ≤ k − 1 (the lowest mirrors it).
  const ways = Array.from({ length: sides }, (_, i) => i + 1).map((k) => {
    const atMost = type === "highest" ? k : sides - k + 1;
    return atMost ** dice - (atMost - 1) ** dice;
  });
  const total = sides ** dice;
  const sum = ways.reduce((acc, w, i) => acc + (i + 1) * w, 0);
  const power = sup(dice);
  return problem(
    `${type}-${dice}-${sides}`,
    `You roll ${dice === 2 ? "two" : "three"} fair ${sides}-sided dice. What's the ${type} roll on average?`,
    q(sum, total),
    "number",
    [
      {
        label: `Ways the ${type} is k`,
        work: type === "highest" ? `k${power} − (k − 1)${power}` : `(${sides + 1} − k)${power} − (${sides} − k)${power}`,
      },
      { label: `Ways for k = 1 to ${sides}`, work: ways.join(", "), result: "" },
      { label: "Average", work: `(${ways.map((w, i) => `${i + 1}×${w}`).join(" + ")}) ÷ ${total}` },
    ],
    params,
  );
}

const COUNT_WORDS = ["", "one", "two", "three", "four", "five", "six"];

/** n random numbers split their range into n + 1 gaps of the same average size. */
function uniformExtreme(params: { type: "max" | "min"; n: number; scale: 1 | 60 }): QuantProblem {
  const { type, n, scale } = params;
  const gaps = type === "max" ? n : 1;
  const answer = q(gaps * scale, n + 1);
  const prompt =
    scale === 1
      ? `You pick ${COUNT_WORDS[n]} random numbers between 0 and 1. What's the ${type === "max" ? "largest" : "smallest"} one on average?`
      : `${COUNT_WORDS[n][0].toUpperCase()}${COUNT_WORDS[n].slice(1)} people each arrive at a random time in the same hour. On average, how many minutes after the hour does the ${type === "max" ? "last" : "first"} one arrive?`;
  return problem(
    `uniform-${type}-${n}-${scale}`,
    prompt,
    answer,
    "number",
    [
      { label: "Gaps between the points and the ends, equal on average", work: `${n} points make ${n + 1} gaps`, result: "" },
      {
        label: type === "max" ? `The ${scale === 1 ? "largest" : "last"} is ${n} gaps up` : `The ${scale === 1 ? "smallest" : "first"} is 1 gap up`,
        work: scale === 1 ? `${gaps} ÷ ${n + 1}` : `${gaps} ÷ ${n + 1} × 60`,
      },
    ],
    params,
  );
}

function allBelow(params: { n: number; xN: number; xD: number; side: "below" | "above" }): QuantProblem {
  const { n, side } = params;
  const x = q(params.xN, params.xD);
  const each = side === "below" ? x : sub(q(1), x);
  const xText = formatFraction(x);
  return problem(
    `all-${side}-${n}-${params.xN}-${params.xD}`,
    side === "below"
      ? `You pick ${COUNT_WORDS[n]} random numbers between 0 and 1. What's the chance the largest is less than ${xText}?`
      : `You pick ${COUNT_WORDS[n]} random numbers between 0 and 1. What's the chance the smallest is more than ${xText}?`,
    pow(each, n),
    "probability",
    [
      { label: `Each one is ${side === "below" ? `under ${xText}` : `over ${xText}`} with chance`, work: formatFraction(each), result: "" },
      { label: `All ${n} must be`, work: `(${formatFraction(each)})${sup(n)}` },
    ],
    params,
  );
}

// Kept so every answer stays above 1%: the largest under 1/3, or the smallest over 1/2, at most four numbers.
const HIGH_CUTOFFS: readonly (readonly [number, number])[] = [[1, 3], [1, 2], [2, 3], [3, 4], [4, 5], [9, 10]];
const LOW_CUTOFFS: readonly (readonly [number, number])[] = [[1, 10], [1, 5], [1, 4], [1, 3], [1, 2]];

export const CONTINUOUS_LESSONS: QuantLessonDef[] = [
  {
    id: "uniform",
    title: "Uniform random numbers",
    benefit: "Work with a random number in a range",
    idea: "Every value in the range is equally likely, so a chance is the length you want ÷ the whole length. The average is the midpoint, and the variance is length² ÷ 12.",
    targetSeconds: 25,
    example: uniformNumber({ type: "between", low: 0, high: 20, from: 3, to: 11 }),
    generate: randomUniform,
  },
  {
    id: "area",
    title: "Probability as area",
    benefit: "Solve two-number questions with a square",
    idea: "Picture the two random numbers as a point in a square. The chance is the share of the square where the condition holds, often 1 minus a triangle or two.",
    targetSeconds: 45,
    example: areaProblem({ type: "meet", window: 60, wait: 15 }),
    generate: (random) => {
      const roll = random();
      if (roll < 0.35) {
        return random() < 0.7
          ? areaProblem({ type: "meet", window: 60, wait: pick(random, [5, 10, 12, 20, 24, 30, 36, 40, 45]) })
          : areaProblem({ type: "meet", window: 30, wait: pick(random, [5, 6, 10, 12, 15, 20]) });
      }
      if (roll < 0.5) return areaProblem({ type: "stick", window: pick(random, [10, 20]), wait: pick(random, [1, 2, 4, 5]) });
      if (roll < 0.8) {
        const [tN, tD] = pick(random, SUM_LIMITS);
        return areaProblem({ type: "sum", tN, tD });
      }
      const [kN, kD] = pick(random, RATIOS);
      return areaProblem({ type: "ratio", kN, kD });
    },
  },
  {
    id: "highest-lowest",
    title: "Highest and lowest values",
    benefit: "Find the average max or min of a sample",
    idea: "For dice, count the ways the highest roll is each value, then average. For n random numbers in a range, they split it into n + 1 equal gaps on average, so the highest sits n gaps up and the lowest 1 gap up.",
    targetSeconds: 60,
    example: highestOrLowest({ type: "highest", dice: 2, sides: 6 }),
    generate: (random) => {
      const roll = random();
      if (roll < 0.4) {
        const dice = random() < 0.6 ? 2 : 3;
        const sides = pick(random, dice === 2 ? [4, 6, 8, 10] : [4, 6, 8]);
        return highestOrLowest({ type: random() < 0.6 ? "highest" : "lowest", dice, sides });
      }
      if (roll < 0.75) {
        return uniformExtreme({ type: random() < 0.6 ? "max" : "min", n: int(random, 2, 5), scale: random() < 0.5 ? 1 : 60 });
      }
      const side = random() < 0.6 ? "below" : "above";
      const [xN, xD] = pick(random, side === "below" ? HIGH_CUTOFFS : LOW_CUTOFFS);
      return allBelow({ n: int(random, 2, 4), xN, xD, side });
    },
  },
];
