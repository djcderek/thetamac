import { div, formatFraction, formatResult, mul, pow, q, sub, type Rational } from "../rational";
import { int, pick, problem, sup, type QuantLessonDef, type QuantProblem } from "../build";
import type { QuantVisual, Tone } from "../visual";

type Band = { from: number; to: number; tone: Tone; text?: string };

/** A number line over a range, with what's asked shaded. */
function line(low: number, high: number, shade: Band[], caption: string, extra: Partial<Extract<QuantVisual, { type: "number-line" }>> = {}): QuantVisual {
  return { type: "number-line", min: low, max: high, ticks: [low, high], shade, caption, ...extra };
}

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
          {
            label: "Length you want",
            work: `${to} − ${from}`,
            result: `${to - from}`,
            icon: "subtract",
            explain: `Every value is equally likely, so only the length of the stretch matters: from ${from} to ${to}.`,
            visual: line(low, high, [{ from, to, tone: "hit", text: `${to - from}` }], `The stretch you want, ${from} to ${to}.`, { ticks: [low, from, to, high] }),
          },
          {
            label: "Length of the whole range",
            work: `${high} − ${low}`,
            result: `${high - low}`,
            icon: "subtract",
            explain: "The whole range is every value the number could take.",
            visual: line(low, high, [{ from: low, to: high, tone: "known", text: `${high - low}` }, { from, to, tone: "hit" }], `The whole range is ${high - low} long.`, { ticks: [low, from, to, high] }),
          },
          {
            label: "Chance",
            work: `${to - from} ÷ ${high - low}`,
            icon: "divide",
            explain: "The chance is the share of the range you want: the length you want divided by the whole length.",
          },
        ],
        params,
        line(low, high, [{ from: low, to: high, tone: "known" }], `Every value from ${low} to ${high} is equally likely.`),
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
          {
            label: "Length you want",
            work: `${high} − ${from}`,
            result: `${high - from}`,
            icon: "subtract",
            explain: `More than ${from} means anywhere from ${from} up to the top of the range, ${high}.`,
            visual: line(low, high, [{ from, to: high, tone: "hit", text: `${high - from}` }], `The stretch above ${from}.`, { ticks: [low, from, high] }),
          },
          {
            label: "Length of the whole range",
            work: `${high} − ${low}`,
            result: `${high - low}`,
            icon: "subtract",
            explain: "The whole range is every value the number could take.",
            visual: line(low, high, [{ from: low, to: high, tone: "known", text: `${high - low}` }, { from, to: high, tone: "hit" }], `The whole range is ${high - low} long.`, { ticks: [low, from, high] }),
          },
          {
            label: "Chance",
            work: `${high - from} ÷ ${high - low}`,
            icon: "divide",
            explain: "The chance is the length you want divided by the whole length.",
          },
        ],
        params,
        line(low, high, [{ from: low, to: high, tone: "known" }], `Every value from ${low} to ${high} is equally likely.`),
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
          {
            label: "Minutes the bus could come after that",
            work: `${high} − ${from}`,
            result: `${high - from}`,
            icon: "subtract",
            explain: `You wait more than ${from} minutes exactly when the bus comes after minute ${from}.`,
            visual: line(0, high, [{ from, to: high, tone: "hit", text: `${high - from} min` }], `The bus comes after minute ${from}.`, { ticks: [0, from, high] }),
          },
          {
            label: "Chance",
            work: `${high - from} ÷ ${high}`,
            icon: "divide",
            explain: `Every moment is equally likely, so the chance is those minutes out of all ${high}.`,
          },
        ],
        params,
        line(0, high, [{ from: 0, to: high, tone: "known" }], `The bus is equally likely to come at any moment in ${high} minutes.`),
      );
    }
    case "average": {
      const { low, high } = params;
      return problem(
        `average-${low}-${high}`,
        `${picked(low, high)} What's its average?`,
        q(low + high, 2),
        "number",
        [
          {
            label: "The average is the midpoint",
            work: `(${low} + ${high}) ÷ 2`,
            icon: "divide",
            explain: "Values are spread evenly, so every value above the middle is balanced by one the same distance below it.",
            visual: line(low, high, [{ from: low, to: high, tone: "known" }], "The average sits in the middle.", {
              points: [{ at: (low + high) / 2, label: `Average ${formatResult(q(low + high, 2), "number")}`, tone: "hit" }],
            }),
          },
        ],
        params,
        line(low, high, [{ from: low, to: high, tone: "known" }], `Every value from ${low} to ${high} is equally likely.`),
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
          {
            label: "Now it’s equally likely anywhere from",
            work: `${from} to ${high}`,
            result: "",
            icon: "filter",
            explain: `Knowing it’s above ${from} rules out everything below. What’s left is still spread evenly.`,
            visual: line(low, high, [{ from: low, to: from, tone: "muted" }, { from, to: high, tone: "known" }], `Only ${from} to ${high} is still possible.`, { ticks: [low, from, high] }),
          },
          {
            label: "The average is the new midpoint",
            work: `(${from} + ${high}) ÷ 2`,
            icon: "divide",
            explain: "An even spread averages its midpoint, so take the middle of what’s left.",
            visual: line(low, high, [{ from: low, to: from, tone: "muted" }, { from, to: high, tone: "known" }], "The new average is the middle of what’s left.", {
              ticks: [low, from, high],
              points: [{ at: (from + high) / 2, label: `Average ${formatResult(q(from + high, 2), "number")}`, tone: "hit" }],
            }),
          },
        ],
        params,
        line(low, high, [{ from: low, to: high, tone: "known" }], `Every value from ${low} to ${high} is equally likely.`),
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
          {
            label: "Length of the range",
            work: `${high} − ${low}`,
            result: `${length}`,
            icon: "subtract",
            explain: "How spread out the values are depends only on the length of the range, not where it starts.",
            visual: line(low, high, [{ from: low, to: high, tone: "hit", text: `${length}` }], `The range is ${length} long.`),
          },
          {
            label: "Variance is length² ÷ 12",
            work: `${length}² ÷ 12`,
            icon: "divide",
            explain: "For an even spread, the variance (the average squared distance from the middle) is always length² ÷ 12.",
          },
        ],
        params,
        line(low, high, [{ from: low, to: high, tone: "known" }], `Every value from ${low} to ${high} is equally likely.`),
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
    const d = wait / window;
    const axis = params.type === "meet" ? { xLabel: "First friend arrives", yLabel: "Second friend arrives", max: `${window} min` } : { xLabel: "First point", yLabel: "Second point", max: `${window} cm` };
    const below: [number, number][] = [[d, 0], [1, 0], [1, 1 - d]];
    const above: [number, number][] = [[0, d], [0, 1], [1 - d, 1]];
    const band: [number, number][] = [[0, 0], [d, 0], [1, 1 - d], [1, 1], [1 - d, 1], [0, d]];
    return problem(
      `${params.type}-${window}-${wait}`,
      prompt,
      sub(q(1), miss),
      "probability",
      [
        {
          label: `Two corner triangles: more than ${apart} apart`,
          work: `(${gap}/${window})²`,
          result: formatFraction(miss),
          icon: "split",
          explain: `Points where the two are more than ${apart} apart form two corner triangles. Together they make a square ${gap} by ${gap}, out of ${window} by ${window}.`,
          visual: {
            type: "square",
            ...axis,
            regions: [
              { points: below, tone: "alt", text: "too far apart" },
              { points: above, tone: "alt" },
            ],
            caption: `Each triangle has sides ${gap} long. Put together, they fill (${gap}/${window})² of the square.`,
          },
        },
        {
          label: params.type === "meet" ? "Chance they meet" : "Chance they’re close",
          work: `1 − ${formatFraction(miss)}`,
          icon: "subtract",
          explain: "Everything outside the two triangles is the band where they’re close enough, so take the triangles away from 1.",
          visual: {
            type: "square",
            ...axis,
            regions: [
              { points: band, tone: "hit", text: params.type === "meet" ? "meet" : "close" },
              { points: below, tone: "muted" },
              { points: above, tone: "muted" },
            ],
            caption: "The orange band is where they’re within " + apart + " of each other.",
          },
        },
      ],
      params,
      { type: "square", ...axis, regions: [], caption: "Each point in the square is one pair of random values." },
    );
  }

  const picked = "Two numbers are picked at random between 0 and 1, every value equally likely.";
  const unitAxis = { xLabel: "First number", yLabel: "Second number", max: "1" };
  const emptySquare: QuantVisual = { type: "square", ...unitAxis, regions: [], caption: "Each point in the square is one pair of numbers." };
  if (params.type === "sum") {
    const t = q(params.tN, params.tD);
    const tText = formatFraction(t);
    const key = `sum-${params.tN}-${params.tD}`;
    const prompt = `${picked} What's the chance their sum is less than ${tText}?`;
    if (params.tN <= params.tD) {
      const tv = params.tN / params.tD;
      return problem(
        key,
        prompt,
        div(mul(t, t), q(2)),
        "probability",
        [
          {
            label: `Triangle below the line x + y = ${tText}`,
            work: `(${tText})² ÷ 2`,
            icon: "target",
            explain: `Points with a sum under ${tText} sit below the line x + y = ${tText}: a triangle with both sides ${tText} long.`,
            visual: {
              type: "square",
              ...unitAxis,
              regions: [{ points: [[0, 0], [tv, 0], [0, tv]], tone: "hit", text: `sum < ${tText}` }],
              caption: `A right triangle with sides ${tText}: area ${tText} × ${tText} ÷ 2.`,
            },
          },
        ],
        params,
        emptySquare,
      );
    }
    const corner = div(pow(sub(q(2), t), 2), q(2));
    const c = params.tN / params.tD - 1;
    const cornerPoints: [number, number][] = [[c, 1], [1, 1], [1, c]];
    return problem(
      key,
      prompt,
      sub(q(1), corner),
      "probability",
      [
        {
          label: `Corner triangle where the sum is over ${tText}`,
          work: `(2 − ${tText})² ÷ 2`,
          result: formatFraction(corner),
          icon: "split",
          explain: `Above the line x + y = ${tText} is only a small top-right corner: a triangle with sides 2 − ${tText}. It’s easier to find that and take it away.`,
          visual: {
            type: "square",
            ...unitAxis,
            regions: [{ points: cornerPoints, tone: "alt", text: `sum > ${tText}` }],
            caption: `The corner triangle has both sides 2 − ${tText} long.`,
          },
        },
        {
          label: `Chance it’s under ${tText}`,
          work: `1 − ${formatFraction(corner)}`,
          icon: "subtract",
          explain: "Everything else in the square has a sum under the limit, so take the corner away from 1.",
          visual: {
            type: "square",
            ...unitAxis,
            regions: [
              { points: [[0, 0], [1, 0], [1, c], [c, 1], [0, 1]], tone: "hit", text: `sum < ${tText}` },
              { points: cornerPoints, tone: "muted" },
            ],
            caption: "The orange area is everything but the corner.",
          },
        },
      ],
      params,
      emptySquare,
    );
  }

  const k = q(params.kN, params.kD);
  const height = div(q(1), k);
  const h = params.kD / params.kN;
  const wedge: QuantVisual = {
    type: "square",
    ...unitAxis,
    regions: [{ points: [[0, 0], [1, 0], [1, h]], tone: "hit", text: `x > ${multiple(k)}y` }],
    caption: `Below the line y = x ÷ ${multiple(k)}, the first number is more than ${multiple(k)} times the second.`,
  };
  return problem(
    `ratio-${params.kN}-${params.kD}`,
    `${picked} What's the chance the first is more than ${multiple(k)} times the second?`,
    div(height, q(2)),
    "probability",
    [
      {
        label: `Where x > ${multiple(k)}y: a triangle, base 1, height`,
        work: `1 ÷ ${multiple(k)}`,
        result: formatFraction(height),
        icon: "target",
        explain: `x > ${multiple(k)}y means y is less than x ÷ ${multiple(k)}. That’s a thin triangle along the bottom, reaching height 1 ÷ ${multiple(k)} at the right edge.`,
        visual: wedge,
      },
      {
        label: "Its area",
        work: `1 × ${formatFraction(height)} ÷ 2`,
        icon: "multiply",
        explain: "The square has area 1, so the triangle’s area is the chance: base × height ÷ 2.",
      },
    ],
    params,
    emptySquare,
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
  // An example value of k to picture: the middle face.
  const k = Math.ceil(sides / 2) + (type === "highest" ? 0 : -1 + (sides % 2));
  const cells: [number, number][] = [];
  for (let a = 1; a <= sides; a++) for (let b = 1; b <= sides; b++) if ((type === "highest" ? Math.max(a, b) : Math.min(a, b)) === k) cells.push([a, b]);
  const gridFits = dice === 2 && sides <= 8;
  const bars: QuantVisual = {
    type: "bars",
    bars: ways.map((w, i) => ({ label: `${i + 1}`, value: w, tone: "hit" as const, text: `${w}` })),
    caption: `Ways the ${type} roll is each value, out of ${total} equally likely rolls.`,
  };
  return problem(
    `${type}-${dice}-${sides}`,
    `You roll ${dice === 2 ? "two" : "three"} fair ${sides}-sided dice. What's the ${type} roll on average?`,
    q(sum, total),
    "number",
    [
      {
        label: `Ways the ${type} is k`,
        work: type === "highest" ? `k${power} − (k − 1)${power}` : `(${sides + 1} − k)${power} − (${sides} − k)${power}`,
        icon: "count",
        explain:
          type === "highest"
            ? `The highest is at most k when every die is k or less: k${power} ways. Take away the ways where all are k − 1 or less, and the highest is exactly k.`
            : `The lowest is at least k when every die is k or more. Take away the ways where all are k + 1 or more, and the lowest is exactly k.`,
        ...(gridFits
          ? {
              visual: {
                type: "dice-grid" as const,
                sides,
                marks: [{ cells, tone: "hit" as const }],
                caption: `The ${cells.length} rolls where the ${type} is ${k}.`,
              },
            }
          : {}),
      },
      {
        label: `Ways for k = 1 to ${sides}`,
        work: ways.join(", "),
        result: "",
        icon: "repeat",
        explain: `Do the same count for every value from 1 to ${sides}. Together they cover all ${total} rolls.`,
        visual: bars,
      },
      {
        label: "Average",
        work: `(${ways.map((w, i) => `${i + 1}×${w}`).join(" + ")}) ÷ ${total}`,
        icon: "divide",
        explain: "Multiply each value by its ways, add them up, and divide by all the rolls: that’s the average.",
      },
    ],
    params,
    gridFits
      ? { type: "dice-grid", sides, marks: [], caption: `All ${total} rolls of two ${sides}-sided dice: first die down, second across.` }
      : { type: "die-faces", sides, marks: [], caption: `Each of the ${dice} dice lands on one of these faces.` },
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
  const spots = Array.from({ length: n }, (_, i) => ((i + 1) * scale) / (n + 1));
  const asked = type === "max" ? n - 1 : 0;
  const gapsLine = (highlight: boolean, caption: string): QuantVisual => ({
    type: "number-line",
    min: 0,
    max: scale,
    // A tick at every gap boundary, so the n + 1 equal gaps show.
    ticks: Array.from({ length: n + 2 }, (_, i) => (i * scale) / (n + 1)),
    shade: highlight ? [{ from: 0, to: spots[asked], tone: "hit", text: `${gaps} gap${gaps === 1 ? "" : "s"}` }] : [],
    points: spots.map((at, i) => ({ at, label: highlight && i === asked ? formatResult(answer, "number") : "", tone: highlight && i === asked ? ("hit" as const) : ("known" as const) })),
    caption,
  });
  return problem(
    `uniform-${type}-${n}-${scale}`,
    prompt,
    answer,
    "number",
    [
      {
        label: "Gaps between the points and the ends, equal on average",
        work: `${n} points make ${n + 1} gaps`,
        result: "",
        icon: "split",
        explain: `${n} random points cut the range into ${n + 1} pieces. No piece is special, so on average they’re all the same size: 1/${n + 1} of the range.`,
        visual: gapsLine(false, `On average, the ${n} points sit evenly, making ${n + 1} equal gaps.`),
      },
      {
        label: type === "max" ? `The ${scale === 1 ? "largest" : "last"} is ${n} gaps up` : `The ${scale === 1 ? "smallest" : "first"} is 1 gap up`,
        work: scale === 1 ? `${gaps} ÷ ${n + 1}` : `${gaps} ÷ ${n + 1} × 60`,
        icon: "multiply",
        explain:
          type === "max"
            ? `The largest has every gap but the last one below it: ${n} of the ${n + 1}.`
            : `The smallest has just the first gap below it: 1 of the ${n + 1}.`,
        visual: gapsLine(true, `The ${type === "max" ? "largest" : "smallest"} sits ${gaps} gap${gaps === 1 ? "" : "s"} up.`),
      },
    ],
    params,
    line(0, scale, [{ from: 0, to: scale, tone: "known" }], scale === 1 ? `${n} numbers, each anywhere from 0 to 1.` : `${n} arrival times, each anywhere in the hour.`),
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
      {
        label: `Each one is ${side === "below" ? `under ${xText}` : `over ${xText}`} with chance`,
        work: formatFraction(each),
        result: "",
        icon: "target",
        explain:
          side === "below"
            ? `The largest is under ${xText} exactly when every number is. One number lands under ${xText} with chance ${xText}.`
            : `The smallest is over ${xText} exactly when every number is. One number lands over ${xText} with chance 1 − ${xText}.`,
        visual: line(
          0,
          1,
          [side === "below" ? { from: 0, to: params.xN / params.xD, tone: "hit", text: formatFraction(each) } : { from: params.xN / params.xD, to: 1, tone: "hit", text: formatFraction(each) }],
          `Where one number must land.`,
          { ticks: [0, params.xN / params.xD, 1] },
        ),
      },
      {
        label: `All ${n} must be`,
        work: `(${formatFraction(each)})${sup(n)}`,
        icon: "multiply",
        explain: `The numbers are picked independently, so multiply the chance for each of the ${n}.`,
      },
    ],
    params,
    line(0, 1, [{ from: 0, to: 1, tone: "known" }], `${COUNT_WORDS[n][0].toUpperCase()}${COUNT_WORDS[n].slice(1)} numbers, each anywhere from 0 to 1.`),
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
    difficulty: "Easy",
    intro:
      "A uniform number is like a dart that’s equally likely to land anywhere along a line. Equal stretches of the line get equal chances, so a chance is just a share of the length. Being told it landed in some part leaves a smaller line where it’s still even.",
    formula: "Chance = length you want ÷ whole length; average = (low + high) ÷ 2",
    cues: [
      "A number or time is picked at random in a range, every value equally likely",
      "The question asks a chance, an average or a spread for that one number",
    ],
    mistake: "Dividing by the top of the range when it doesn’t start at 0. Divide by the range’s length: high − low.",
    targetSeconds: 25,
    example: uniformNumber({ type: "between", low: 0, high: 20, from: 3, to: 11 }),
    generate: randomUniform,
  },
  {
    id: "area",
    title: "Probability as area",
    benefit: "Solve two-number questions with a square",
    idea: "Picture the two random numbers as a point in a square. The chance is the share of the square where the condition holds, often 1 minus a triangle or two.",
    difficulty: "Medium",
    intro:
      "Two random numbers make one random point in a square: the first number across, the second up. Every spot in the square is equally likely, so a chance is the share of the square’s area where the condition holds. Lines like x + y = 1 or y = x cut the square into triangles, whose areas are easy.",
    formula: "Chance = area where it happens ÷ area of the square",
    cues: [
      "Two times or numbers are each picked at random in a range",
      "The question compares them: their gap, their sum, or one being bigger",
    ],
    mistake: "Working with the gap as if it were one uniform number. Small gaps are more likely than big ones, which the square shows.",
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
    difficulty: "Hard",
    intro:
      "The highest of several rolls is hard to count directly, but “every roll is k or less” is easy: k ways per die, multiplied. The highest is exactly k when everything is at most k but not everything is at most k − 1. For random numbers, the n points cut the range into n + 1 gaps that are equal on average.",
    formula: "Ways the highest is k = kⁿ − (k − 1)ⁿ; average max of n uniforms = n ÷ (n + 1)",
    cues: [
      "The question asks for the largest, smallest, first or last of several results",
      "You need the chance every result is below or above some value",
    ],
    mistake: "Thinking the highest of two dice averages 3.5 like one die. Taking the higher one pulls the average up, to about 4.47.",
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
