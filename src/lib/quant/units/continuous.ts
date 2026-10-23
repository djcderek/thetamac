import { add, div, formatFraction, formatResult, mul, pow, q, sub, value, type Rational } from "../rational";
import { int, pick, problem, sup, type QuantLessonDef, type QuantProblem } from "../build";
import type { QuantVisual, Tone } from "../visual";

type Band = { from: number; to: number; tone: Tone; text?: string };

/** A number line over a range, with what’s asked shaded. */
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
        `${picked(low, high)} What’s the chance it’s between ${from} and ${to}?`,
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
        `${picked(low, high)} What’s the chance it’s more than ${from}?`,
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
        `A bus comes at a random time in the next ${high} minutes, every moment equally likely. What’s the chance you wait more than ${from} minutes?`,
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
        `${picked(low, high)} What’s its average?`,
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
        `${picked(low, high)} You’re told it’s more than ${from}. What’s its average now?`,
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
        `${picked(low, high)} What’s its variance?`,
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
            explain: "For an even spread from `a` to `b`, the variance (the average squared distance from the middle) is always `(b - a)^2/12`.",
          },
        ],
        params,
        line(low, high, [{ from: low, to: high, tone: "known" }], `Every value from ${low} to ${high} is equally likely.`),
      );
    }
  }
}

const RANGES = [[0, 10], [0, 20], [0, 12], [0, 30], [2, 12], [5, 25], [10, 40], [4, 16]] as const;

function randomUniform(random: () => number, types: readonly UniformParams["type"][]): QuantProblem {
  const [low, high] = pick(random, RANGES);
  const inside = () => int(random, low + 1, high - 1);
  switch (pick(random, types)) {
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
        ? `Two friends each arrive at a random time ${window === 60 ? "within the same hour" : "within the same half hour"}. Whoever comes first waits ${wait} minutes, then leaves. What’s the chance they meet?`
        : `Two points are dropped at random on a ${window} cm stick. What’s the chance they’re less than ${wait} cm apart?`;
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
    const prompt = `${picked} What’s the chance their sum is less than ${tText}?`;
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
            explain: `Points with a sum under ${tText} sit below the line \`x + y = ${tText}\`: a triangle with both sides ${tText} long.`,
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
          explain: `Above the line \`x + y = ${tText}\` is only a small top-right corner: a triangle with sides 2 − ${tText}. It’s easier to find that and take it away.`,
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
    `${picked} What’s the chance the first is more than ${multiple(k)} times the second?`,
    div(height, q(2)),
    "probability",
    [
      {
        label: `Where x > ${multiple(k)}y: a triangle, base 1, height`,
        work: `1 ÷ ${multiple(k)}`,
        result: formatFraction(height),
        icon: "target",
        explain: `\`x > ${multiple(k)}y\` means \`y < x/${multiple(k)}\`. That’s a thin triangle along the bottom, reaching height \`1/${multiple(k)}\` at the right edge.`,
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
    `You roll ${dice === 2 ? "two" : "three"} fair ${sides}-sided dice. What’s the ${type} roll on average?`,
    q(sum, total),
    "number",
    [
      {
        label: `Ways the ${type} is k`,
        work: type === "highest" ? `k${power} − (k − 1)${power}` : `(${sides + 1} − k)${power} − (${sides} − k)${power}`,
        icon: "count",
        explain:
          type === "highest"
            ? `The highest is at most \`k\` when every die is \`k\` or less: \`k^${dice}\` ways. Take away the ways where all are \`k - 1\` or less, leaving exactly \`k\`.`
            : `The lowest is at least \`k\` when every die is \`k\` or more. Take away the ways where all are \`k + 1\` or more, leaving exactly \`k\`.`,
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

const COUNT_WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight"];
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** n random numbers split their range into n + 1 gaps of the same average size. */
function uniformExtreme(params: { type: "max" | "min"; n: number; scale: 1 | 60 }): QuantProblem {
  const { type, n, scale } = params;
  const gaps = type === "max" ? n : 1;
  const answer = q(gaps * scale, n + 1);
  const prompt =
    scale === 1
      ? `You pick ${COUNT_WORDS[n]} random numbers between 0 and 1. What’s the ${type === "max" ? "largest" : "smallest"} one on average?`
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
      ? `You pick ${COUNT_WORDS[n]} random numbers between 0 and 1. What’s the chance the largest is less than ${xText}?`
      : `You pick ${COUNT_WORDS[n]} random numbers between 0 and 1. What’s the chance the smallest is more than ${xText}?`,
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
        label: n === 2 ? "Both must be" : `All ${n} must be`,
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

// ─── More continuous questions ───────────────────────────────────────────────────────────

type StickParams =
  | { type: "short" | "long"; length: number }
  | { type: "under"; length: number; under: number }
  | { type: "ratio"; length: number; k: number };

/** A stick broken at one random point. */
function brokenStick(params: StickParams): QuantProblem {
  const L = params.length;
  const half = L / 2;
  const intro = `A stick ${L} cm long is broken at a random point, every point equally likely.`;
  const stick = (shade: Band[], caption: string, ticks: number[] = [0, half, L]): QuantVisual => line(0, L, shade, caption, { ticks });
  const nearer = {
    label: "The shorter piece runs from the break to the nearer end",
    work: `anywhere from 0 to ${formatResult(q(L, 2), "number")} cm`,
    result: "",
    icon: "idea" as const,
    explain: `A break in the left half leaves the short piece on the left, and in the right half on the right. Either way its length is spread evenly from 0 to half the stick.`,
    visual: stick([{ from: 0, to: half, tone: "known", text: "break here: short piece on the left" }], `The shorter piece is the distance from the break to the nearer end.`),
  };
  switch (params.type) {
    case "short":
    case "long": {
      const short = q(L, 4);
      return problem(
        `stick-${params.type}-${L}`,
        `${intro} What’s the average length of the ${params.type === "short" ? "shorter" : "longer"} piece, in cm?`,
        params.type === "short" ? short : sub(q(L), short),
        "number",
        [
          nearer,
          {
            label: "Average shorter piece: half of half the stick",
            work: `${formatResult(q(L, 2), "number")} ÷ 2`,
            result: formatResult(short, "number"),
            icon: "divide",
            explain: "A length spread evenly from 0 to half the stick averages the middle of that: a quarter of the stick.",
          },
          ...(params.type === "long"
            ? [
                {
                  label: "The longer piece is the rest",
                  work: `${L} − ${formatResult(short, "number")}`,
                  icon: "subtract" as const,
                  explain: "The two pieces always add up to the whole stick, so their averages do too.",
                },
              ]
            : []),
        ],
        params,
        stick([{ from: 0, to: L, tone: "known" }], `The break is equally likely anywhere along the ${L} cm.`),
      );
    }
    case "under": {
      const x = params.under;
      return problem(
        `stick-under-${L}-${x}`,
        `${intro} What’s the chance the shorter piece is less than ${x} cm long?`,
        q(2 * x, L),
        "probability",
        [
          {
            label: `The shorter piece is under ${x} cm when the break is within ${x} cm of an end`,
            work: `${x} cm at each end`,
            result: `${2 * x} cm`,
            icon: "target",
            explain: "A break close to either end leaves a short stub at that end.",
            visual: stick(
              [
                { from: 0, to: x, tone: "hit", text: `${x}` },
                { from: L - x, to: L, tone: "hit", text: `${x}` },
              ],
              `Breaks in the orange ends leave a piece under ${x} cm.`,
              [0, x, L - x, L],
            ),
          },
          {
            label: "Chance",
            work: `${2 * x} ÷ ${L}`,
            icon: "divide",
            explain: "Every break point is equally likely, so the chance is the shaded length out of the whole stick.",
          },
        ],
        params,
        stick([{ from: 0, to: L, tone: "known" }], `The break is equally likely anywhere along the ${L} cm.`),
      );
    }
    case "ratio": {
      const { k } = params;
      const cut = q(L, k + 1);
      return problem(
        `stick-ratio-${L}-${k}`,
        `${intro} What’s the chance the longer piece is more than ${k} times as long as the shorter one?`,
        q(2, k + 1),
        "probability",
        [
          {
            label: `Longer > ${k} × shorter when the shorter piece is under`,
            work: `${L} ÷ (${k} + 1)`,
            result: `${formatResult(cut, "number")} cm`,
            icon: "divide",
            explain: `If the short piece is \`s\`, the long one is \`${L} - s\`, and \`${L} - s > ${k}s\` means \`s < ${L}/${k + 1}\`.`,
            visual: stick(
              [
                { from: 0, to: value(cut), tone: "hit" },
                { from: L - value(cut), to: L, tone: "hit" },
              ],
              `Breaks in the orange ends make the long piece more than ${k} times the short one.`,
              [0, L],
            ),
          },
          {
            label: "Chance: both ends, out of the whole stick",
            work: `2 × ${formatResult(cut, "number")} ÷ ${L}`,
            icon: "divide",
            explain: "The break must fall that close to one end or the other.",
          },
        ],
        params,
        stick([{ from: 0, to: L, tone: "known" }], `The break is equally likely anywhere along the ${L} cm.`),
      );
    }
  }
}

/** Landing in a ring of a target: areas, where π cancels. */
function targetRing(params: { r1: number; r2: number; r3: number; ring: "inner" | "middle" | "outer" }): QuantProblem {
  const { r1, r2, r3, ring } = params;
  const areas = [r1 * r1, r2 * r2 - r1 * r1, r3 * r3 - r2 * r2];
  const index = ring === "inner" ? 0 : ring === "middle" ? 1 : 2;
  const names = ["the bullseye", "the middle ring", "the outer ring"];
  const ringWork = ring === "inner" ? `${r1}²` : ring === "middle" ? `${r2}² − ${r1}²` : `${r3}² − ${r2}²`;
  const bars = (highlight: boolean): QuantVisual => ({
    type: "bars",
    bars: ["Bullseye", "Middle", "Outer"].map((label, i) => ({
      label,
      value: areas[i],
      tone: highlight && i === index ? ("hit" as const) : ("muted" as const),
      text: `${areas[i]}π`,
    })),
    caption: "The area of each part of the target, in units of π square inches.",
  });
  return problem(
    `ring-${r1}-${r2}-${r3}-${ring}`,
    `A target has a bullseye of radius ${r1} inch${r1 === 1 ? "" : "es"}, a middle ring out to ${r2} inches and an outer ring out to ${r3} inches. An arrow lands at a random point on the target, every point equally likely. What’s the chance it lands in ${names[index]}?`,
    q(areas[index], r3 * r3),
    "probability",
    [
      {
        label: `Area of ${names[index]}`,
        work: `π × (${ringWork})`,
        result: `${areas[index]}π`,
        icon: "subtract",
        explain: "A circle of radius `r` has area `\\pi r^2`. A ring is the bigger circle minus the smaller one inside it.",
        visual: bars(true),
      },
      {
        label: "Area of the whole target",
        work: `π × ${r3}²`,
        result: `${r3 * r3}π`,
        icon: "count",
        explain: "The whole target is the biggest circle.",
      },
      {
        label: "Chance: its share of the area, π cancels",
        work: `${areas[index]} ÷ ${r3 * r3}`,
        icon: "divide",
        explain: "Every point is equally likely, so the chance is the area you want divided by the whole area. The `\\pi` is on both, so it cancels.",
      },
    ],
    params,
    bars(false),
  );
}

const TARGETS: readonly (readonly [number, number, number])[] = [[4, 8, 12], [1, 2, 3], [2, 3, 5], [3, 6, 9], [2, 4, 5], [1, 3, 4], [2, 5, 6]];

/** Chance a ÷ b is below k, for two uniforms on [0, 1]. */
const ratioBelow = (k: Rational) => (value(k) <= 1 ? div(k, q(2)) : sub(q(1), div(q(1), mul(q(2), k))));

function ratioRange(params: { mN: number; mD: number; MN: number; MD: number }): QuantProblem {
  const m = q(params.mN, params.mD), M = q(params.MN, params.MD);
  const mv = value(m), Mv = value(M);
  const below = (k: Rational) => ratioBelow(k);
  const answer = sub(below(M), below(m));
  const show = (k: Rational) => formatResult(k, "number");
  const lowerEnd: [number, number] = Mv >= 1 ? [1, 1 / Mv] : [Mv, 1];
  const upperEnd: [number, number] = mv >= 1 ? [1, 1 / mv] : [mv, 1];
  const points: [number, number][] = [[0, 0], lowerEnd];
  if (Mv >= 1 && mv < 1) points.push([1, 1]);
  points.push(upperEnd);
  const unitAxis = { xLabel: "a", yLabel: "b", max: "1" };
  const belowWork = (k: Rational) => (value(k) <= 1 ? `${show(k)} ÷ 2` : `1 − 1 ÷ (2 × ${show(k)})`);
  const belowExplain = (k: Rational) =>
    value(k) <= 1
      ? `\`a/b < ${show(k)}\` means \`b > a \\div ${show(k)}\`: above that line is a triangle of area ${show(k)} ÷ 2.`
      : `\`a/b < ${show(k)}\` means \`b > a \\div ${show(k)}\`. Only a thin triangle below that line is left out, with area \`1/(2 \\times ${show(k)})\`.`;
  return problem(
    `ratio-range-${params.mN}-${params.mD}-${params.MN}-${params.MD}`,
    `Two numbers a and b are picked at random between 0 and 1, every value equally likely. What’s the chance a ÷ b is between ${show(m)} and ${show(M)}?`,
    answer,
    "probability",
    [
      {
        label: `Chance a ÷ b is less than ${show(M)}`,
        work: belowWork(M),
        result: formatFraction(below(M)),
        icon: "target",
        explain: belowExplain(M),
      },
      {
        label: `Chance a ÷ b is less than ${show(m)}`,
        work: belowWork(m),
        result: formatFraction(below(m)),
        icon: "target",
        explain: belowExplain(m),
      },
      {
        label: "Between the two",
        work: `${formatFraction(below(M))} − ${formatFraction(below(m))}`,
        icon: "subtract",
        explain: `Less than ${show(M)} but not less than ${show(m)}: the wedge between the two lines.`,
        visual: {
          type: "square",
          ...unitAxis,
          regions: [{ points, tone: "hit", text: `${show(m)} < a/b < ${show(M)}` }],
          caption: `Between the lines b = a ÷ ${show(M)} and b = a ÷ ${show(m)}.`,
        },
      },
    ],
    params,
    { type: "square", ...unitAxis, regions: [], caption: "Each point in the square is one pair (a, b)." },
  );
}

const RATIO_RANGES: readonly (readonly [number, number, number, number])[] = [
  [1, 1, 3, 1], [1, 1, 2, 1], [2, 1, 4, 1], [1, 2, 2, 1], [1, 3, 3, 1], [1, 2, 1, 1], [2, 1, 3, 1], [1, 4, 1, 1], [1, 2, 3, 1],
];

/** n random points on a circle: all within some half (or the centre inside their shape). */
function halfCircle(params: { n: number; ask: "half" | "centre" }): QuantProblem {
  const { n, ask } = params;
  const inHalf = q(n, 2 ** (n - 1));
  const prompt =
    ask === "half"
      ? `${COUNT_WORDS[n][0].toUpperCase()}${COUNT_WORDS[n].slice(1)} points are placed at random on a circle. What’s the chance all of them lie within some half of the circle?`
      : `A round table gets ${COUNT_WORDS[n]} legs, each placed at a random point on its edge. It stands only if its centre is inside the shape the legs make. What’s the chance it stands?`;
  const others = range(1, n - 1).map((i) => (i * 180) / n);
  const halfLine: QuantVisual = {
    type: "number-line",
    min: 0,
    max: 360,
    ticks: [0, 90, 180, 270, 360],
    shade: [{ from: 0, to: 180, tone: "hit", text: "the half after it" }],
    points: [{ at: 0, label: "start", tone: "known" }, ...others.map((at) => ({ at, label: "", tone: "hit" as const }))],
    caption: "The circle unrolled into 0° to 360°. Every other point must fall in the half after the starting point.",
  };
  const steps: Parameters<typeof problem>[4] = [
    {
      label: "Pick which point starts the half",
      work: `${n} choices`,
      result: "",
      icon: "split",
      explain: "If they all fit in a half circle, exactly one of them is first going clockwise. Split by which point that is.",
    },
    {
      label: "The others all fall in the half after it",
      work: `(1/2)${sup(n - 1)}`,
      result: formatFraction(pow(q(1, 2), n - 1)),
      icon: "multiply",
      explain: `Each of the other ${n - 1} points lands in that half with chance 1/2, independently.`,
      visual: halfLine,
    },
    {
      label: "Add the cases",
      work: `${n} × ${formatFraction(pow(q(1, 2), n - 1))}`,
      result: ask === "half" ? undefined : formatFraction(inHalf),
      icon: "add",
      explain: "Only one point can be the first, so the cases don’t overlap and you can add them.",
    },
  ];
  if (ask === "centre") {
    steps.push({
      label: "The table stands unless all legs are in one half",
      work: `1 − ${formatFraction(inHalf)}`,
      icon: "subtract",
      explain: "The centre is outside the legs’ shape exactly when all the legs fit in one half of the circle.",
    });
  }
  return problem(`circle-${ask}-${n}`, prompt, ask === "half" ? inHalf : sub(q(1), inHalf), "probability", steps, params, halfLine);
}

/** The middle of three uniforms on [0, L] is above x when at least 2 of the 3 are. */
function medianThree(params: { length: number; x: number; side: "above" | "below" }): QuantProblem {
  const { length: L, x, side } = params;
  const each = side === "above" ? q(L - x, L) : q(x, L);
  const notEach = sub(q(1), each);
  const two = mul(q(3), mul(mul(each, each), notEach));
  const three = pow(each, 3);
  const eText = formatFraction(each);
  const word = side === "above" ? "more" : "less";
  const counts = [pow(notEach, 3), mul(q(3), mul(each, mul(notEach, notEach))), two, three];
  return problem(
    `median-${L}-${x}-${side}`,
    `Three numbers are picked at random between 0 and ${L}, every value equally likely. What’s the chance the middle one is ${word} than ${x}?`,
    add(two, three),
    "probability",
    [
      {
        label: `Each number is ${word} than ${x} with chance`,
        work: side === "above" ? `(${L} − ${x}) ÷ ${L}` : `${x} ÷ ${L}`,
        result: eText,
        icon: "target",
        explain: `One number lands ${side === "above" ? `above ${x}` : `below ${x}`} with chance equal to that share of the range.`,
        visual: line(0, L, [side === "above" ? { from: x, to: L, tone: "hit", text: eText } : { from: 0, to: x, tone: "hit", text: eText }], "Where one number must land.", { ticks: [0, x, L] }),
      },
      {
        label: `The middle one is ${word} than ${x} when at least 2 of the 3 are`,
        work: `3 × (${eText})² × ${formatFraction(notEach)} + (${eText})³`,
        icon: "add",
        explain: "Sort the three numbers. The middle one passes the line exactly when two or all three of them do. Add those two binomial cases.",
        visual: {
          type: "bars",
          bars: counts.map((c, i) => ({ label: `${i} of 3`, value: value(c), tone: i >= 2 ? ("hit" as const) : ("muted" as const), text: formatFraction(c) })),
          caption: `How many of the three are ${word} than ${x}. Orange: at least 2.`,
        },
      },
    ],
    params,
    line(0, L, [{ from: 0, to: L, tone: "known" }], `Three numbers, each anywhere from 0 to ${L}.`),
  );
}

const MEDIAN_CUTS: readonly (readonly [number, number])[] = [[4, 1], [4, 2], [4, 3], [3, 1], [3, 2], [10, 3], [10, 5], [10, 7], [12, 3], [12, 8]];

export const CONTINUOUS_LESSONS: QuantLessonDef[] = [
  {
    id: "uniform",
    title: "Uniform random numbers",
    benefit: "Work with a random number in a range",
    summary: "A number picked evenly from a range: a chance is a share of the length, the average is the midpoint, and the variance is length² ÷ 12.",
    difficulty: "Easy",
    parts: [
      {
        type: "text",
        body: [
          "A bus comes every 12 minutes. You turn up at the stop at a random moment, not knowing the timetable. What’s the chance you wait more than 9 minutes?",
          "Your wait could be anything from 0 to 12 minutes, and no part of that range is more likely than another. A random number like this is called uniform.",
        ],
      },
      {
        type: "check",
        prompt: "What’s the chance you wait exactly 6 minutes, to the split second?",
        choices: ["0", "1/12", "1/6", "1/2"],
        answer: 0,
        explain:
          "There are infinitely many possible waits between 0 and 12, so any single one has chance 0. Only stretches of time have a chance above 0, which is why uniform questions ask about ranges.",
      },
      {
        type: "story",
        heading: "Measure the stretch",
        beats: [
          {
            text: "Your wait lands somewhere on this line, from 0 to 12 minutes. Stretches of the same length are equally likely.",
            visual: {
              type: "number-line",
              min: 0,
              max: 12,
              ticks: [0, 3, 6, 9, 12],
              shade: [{ from: 0, to: 12, tone: "known" }],
              caption: "Minutes you wait",
            },
          },
          {
            text: "Waiting more than 9 minutes means landing between 9 and 12. That stretch is 3 minutes long.",
            visual: {
              type: "number-line",
              min: 0,
              max: 12,
              ticks: [0, 3, 6, 9, 12],
              shade: [
                { from: 0, to: 9, tone: "known" },
                { from: 9, to: 12, tone: "hit", text: "3 min" },
              ],
              caption: "Minutes you wait",
            },
          },
          {
            text: "It’s 3 minutes out of 12, so the chance is 3 ÷ 12 = 1/4. Any 3-minute stretch would give the same answer, wherever it sits.",
            visual: {
              type: "number-line",
              min: 0,
              max: 12,
              ticks: [0, 3, 6, 9, 12],
              shade: [
                { from: 0, to: 9, tone: "known" },
                { from: 9, to: 12, tone: "hit", text: "1/4" },
              ],
              caption: "Minutes you wait",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Averages and spread",
        body: [
          "The average of a uniform number is the midpoint of its range. Your average wait is 6 minutes.",
          "If you learn something about the number, the range shrinks and the number is still uniform on what’s left. Told you’ve already waited 9 minutes, your total wait is now uniform from 9 to 12, with average 10.5.",
          "The variance, the average squared distance from the mean, is the length squared over 12. For the bus that’s 12² ÷ 12 = 12.",
        ],
      },
      {
        type: "rule",
        name: "The uniform distribution",
        lines: [
          { lead: "`X \\sim U(a, b)` has density `f(x) = 1/(b - a)` for `a \\le x \\le b`, so for `a \\le c \\le d \\le b`,", tex: "P(c \\le X \\le d) = \\frac{d - c}{b - a}" },
          { lead: "Its mean and variance are", tex: "\\begin{aligned} E[X] &= \\frac{a + b}{2} \\\\[1ex] \\operatorname{Var}(X) &= \\frac{(b - a)^2}{12} \\end{aligned}" },
        ],
        where: ["Every single value has probability 0, so `<` and `\\le` give the same answers", "Given `X \\ge c`, `X` is uniform on `[c, b]`"],
        plain: "A chance is the length of the stretch divided by the length of the whole range.",
        note: "For the bus, the wait `X` is `U(0, 12)`, so the chance of waiting more than 9 minutes is {{P(X > 9) = (12 − 9)/(12 − 0) = 1/4}} The average wait is `E[X] = (0 + 12)/2 = 6` minutes.",
      },
      {
        type: "check",
        prompt: "A number is uniform between 5 and 25. What’s the chance it’s below 10?",
        choices: ["1/4", "2/5", "1/2", "1/5"],
        answer: 0,
        explain:
          "The stretch from 5 to 10 is 5 long and the whole range is 20 long, so the chance is 5 ÷ 20 = 1/4. The answer 2/5 comes from dividing 10 by 25, as if the range started at 0.",
      },
      {
        type: "example",
        lead: "A stretch in the middle of the range works the same way. Only its length matters.",
      },
      {
        type: "trap",
        body: "Dividing by the top of the range when it doesn’t start at 0. A number between 5 and 25 has a range 20 long, so divide lengths by 20, not 25.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "A time or number is picked at random in a range, with no part more likely",
          "The question says someone arrives at a random time or a stick breaks at a random point",
          "It asks for a chance, an average or a variance of that one number",
        ],
      },
    ],
    targetSeconds: 25,
    example: uniformNumber({ type: "between", low: 0, high: 20, from: 3, to: 11 }),
    families: [
      { id: "chance-range", title: "Chance a number lands in a range", generate: (random) => randomUniform(random, ["between", "above"]) },
      { id: "bus-wait", title: "Waiting for a bus", generate: (random) => randomUniform(random, ["wait"]) },
      { id: "average", title: "The average, and the average once you know more", generate: (random) => randomUniform(random, ["average", "average-above"]) },
      { id: "variance", title: "Variance of a random number", generate: (random) => randomUniform(random, ["variance"]) },
      {
        id: "broken-stick",
        title: "Breaking a stick at a random point",
        generate: (random) => {
          const length = pick(random, [12, 20, 30, 60, 100]);
          return pick(random, [
            () => brokenStick({ type: random() < 0.5 ? "short" : "long", length }),
            () => brokenStick({ type: "under", length, under: int(random, 1, length / 2 - 1) }),
            () => brokenStick({ type: "ratio", length, k: int(random, 2, 5) }),
          ])();
        },
      },
    ],
  },
  {
    id: "area",
    title: "Probability as area",
    benefit: "Solve two-number questions with a square",
    summary: "Two random numbers as one point in a square: a chance becomes a share of the square’s area, usually a triangle or strip cut off by a line.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: [
          "You pick two numbers, each uniform between 0 and 1 and independent of each other. What’s the chance their sum is less than 1?",
          "One uniform number lives on a line, and a chance is a share of its length. Two of them live in a square, and a chance is a share of its area.",
        ],
      },
      {
        type: "check",
        prompt: "What’s the chance the sum is under 1?",
        choices: ["1/2", "1/4", "1/3", "3/4"],
        answer: 0,
        explain: "It’s 1/2. The square below shows why: one straight line cuts it into two equal halves.",
      },
      {
        type: "story",
        heading: "Draw the square",
        beats: [
          {
            text: "Plot the pair as a point: the first number across, the second up. Every point in the square is equally likely.",
            visual: {
              type: "square",
              xLabel: "First number",
              yLabel: "Second number",
              max: "1",
              regions: [{ points: [[0, 0], [1, 0], [1, 1], [0, 1]], tone: "known" }],
              caption: "Each point is one pair of numbers",
            },
          },
          {
            text: "Pairs that add up to exactly 1 lie on the diagonal from the top left to the bottom right. Below it, the sum is less than 1.",
            visual: {
              type: "square",
              xLabel: "First number",
              yLabel: "Second number",
              max: "1",
              regions: [{ points: [[0, 0], [1, 0], [0, 1]], tone: "hit", text: "sum < 1" }],
              caption: "Each point is one pair of numbers",
            },
          },
          {
            text: "That triangle is half the square, so the chance is 1/2.",
            visual: {
              type: "square",
              xLabel: "First number",
              yLabel: "Second number",
              max: "1",
              regions: [{ points: [[0, 0], [1, 0], [0, 1]], tone: "hit", text: "1/2" }],
              caption: "Each point is one pair of numbers",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why area works",
        body: [
          "Two independent uniform numbers make a point that’s equally likely to be anywhere in the square. So the chance of a condition is the share of the square where it holds.",
          "Most questions draw one or two lines: `x + y = 1` for a sum, `y = x` for which number is bigger, or `y = x \\pm 0.25` for a gap. The pieces they cut off are triangles and strips, and a triangle’s area is half its base times its height.",
        ],
      },
      {
        type: "rule",
        name: "Probability as area",
        lines: [
          { lead: "If `X` and `Y` are independent and each uniform on `[0, 1]`, the point `(X, Y)` is uniform on the unit square. For any region `R` of the square,", tex: "P\\big((X, Y) \\in R\\big) = \\operatorname{area}(R)" },
        ],
        where: ["For ranges other than `[0, 1]`, divide the region’s area by the area of the whole rectangle"],
        plain: "Draw the square, shade where the condition holds, and measure the shaded area.",
        note: "For a sum below 1, `R` is the triangle under the line `x + y = 1`: {{P(X + Y < 1) = 1/2 × 1 × 1 = 1/2}} The square has area 1, so the chance is the area itself.",
      },
      {
        type: "check",
        prompt: "Same two numbers. What’s the chance their sum is less than 1/2?",
        choices: ["1/8", "1/4", "1/2", "1/16"],
        answer: 0,
        explain:
          "The region is the triangle under `x + y = 1/2`, with both short sides 1/2 long, so its area is {{1/2 × 1/2 × 1/2 = 1/8}} Moving the line from 1 to 1/2 halves the triangle in both directions, so its area is a quarter of 1/2, not half of it.",
      },
      {
        type: "example",
        lead: "Meeting problems are the classic case. Two arrival times are close enough when the point lands in a band along the diagonal `y = x`.",
      },
      {
        type: "trap",
        body: "Treating the gap between two random times as one uniform number. Small gaps are more likely than large ones: lots of pairs are close together, and pairs far apart only fill the two corners of the square.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "Two times or numbers are each picked at random in a range",
          "The question compares them: their gap, their sum, their ratio or which is bigger",
          "Someone waits a fixed time for someone else who arrives at random",
        ],
      },
    ],
    targetSeconds: 45,
    example: areaProblem({ type: "meet", window: 60, wait: 15 }),
    families: [
      {
        id: "meeting",
        title: "Two people meeting",
        generate: (random) =>
          random() < 0.7
            ? areaProblem({ type: "meet", window: 60, wait: pick(random, [5, 10, 12, 20, 24, 30, 36, 40, 45]) })
            : areaProblem({ type: "meet", window: 30, wait: pick(random, [5, 6, 10, 12, 15, 20]) }),
      },
      { id: "close-points", title: "Two points close together on a stick", generate: (random) => areaProblem({ type: "stick", window: pick(random, [10, 20]), wait: pick(random, [1, 2, 4, 5]) }) },
      {
        id: "sum-below",
        title: "The sum of two random numbers",
        generate: (random) => {
          const [tN, tD] = pick(random, SUM_LIMITS);
          return areaProblem({ type: "sum", tN, tD });
        },
      },
      {
        id: "one-bigger",
        title: "One number k times the other",
        generate: (random) => {
          const [kN, kD] = pick(random, RATIOS);
          return areaProblem({ type: "ratio", kN, kD });
        },
      },
      {
        id: "ratio-range",
        title: "A ratio falling in a range",
        generate: (random) => {
          const [mN, mD, MN, MD] = pick(random, RATIO_RANGES);
          return ratioRange({ mN, mD, MN, MD });
        },
      },
      {
        id: "target-ring",
        title: "Hitting a ring of a target",
        generate: (random) => {
          const [r1, r2, r3] = pick(random, TARGETS);
          return targetRing({ r1, r2, r3, ring: pick(random, ["inner", "middle", "outer"] as const) });
        },
      },
      {
        id: "half-circle",
        title: "Random points on a circle",
        generate: (random) => halfCircle({ n: int(random, 3, 7), ask: random() < 0.5 ? "half" : "centre" }),
      },
    ],
  },
  {
    id: "highest-lowest",
    title: "Highest and lowest values",
    benefit: "Find the average max or min of a sample",
    summary: "The largest or smallest of several dice or random numbers: count “all at most k”, take away “all at most k − 1”, and use equal gaps for averages.",
    difficulty: "Hard",
    parts: [
      {
        type: "text",
        body: [
          "You roll three dice and look at the highest number showing. What’s the chance it’s exactly 4?",
          "Counting this head-on is messy. The 4 could be on one die, two or all three, with the others anywhere below it. It’s easier to start from the rolls where every die is at most 4.",
        ],
      },
      {
        type: "check",
        prompt: "What’s the chance all three dice show 4 or less?",
        choices: ["(4/6)³ = 8/27", "4/6 = 2/3", "3 × 4/6", "(1/6)³ = 1/216"],
        answer: 0,
        explain:
          "Each die shows 4 or less with chance 4/6, and the dice don’t affect each other, so multiply: (2/3)³ = 8/27. That’s the chance the highest is 4 or less.",
      },
      {
        type: "story",
        heading: "Take one count from another",
        beats: [
          {
            text: "“Every die is at most 4” covers 64 of the 216 rolls: {{4 × 4 × 4 = 64}}",
            visual: {
              type: "bars",
              bars: [
                { label: "1", value: 1, tone: "muted" },
                { label: "2", value: 8, tone: "muted" },
                { label: "3", value: 27, tone: "muted" },
                { label: "4", value: 64, tone: "hit", text: "64" },
                { label: "5", value: 125, tone: "muted" },
                { label: "6", value: 216, tone: "muted" },
              ],
              caption: "Rolls of three dice where every die is at most k",
            },
          },
          {
            text: "“Every die is at most 3” covers 27 rolls: {{3 × 3 × 3 = 27}} Those are inside the 64, and in each of them the highest is 3 or less.",
            visual: {
              type: "bars",
              bars: [
                { label: "1", value: 1, tone: "muted" },
                { label: "2", value: 8, tone: "muted" },
                { label: "3", value: 27, tone: "alt", text: "27" },
                { label: "4", value: 64, tone: "hit", text: "64" },
                { label: "5", value: 125, tone: "muted" },
                { label: "6", value: 216, tone: "muted" },
              ],
              caption: "Rolls of three dice where every die is at most k",
            },
          },
          {
            text: "Take them away. The 37 rolls left are the ones whose highest is exactly 4, so the chance is {{(64 − 27)/216 = 37/216 ≈ 17%}}",
            visual: {
              type: "bars",
              bars: [
                { label: "1", value: 1, tone: "muted" },
                { label: "2", value: 7, tone: "muted" },
                { label: "3", value: 19, tone: "muted" },
                { label: "4", value: 37, tone: "hit", text: "37" },
                { label: "5", value: 61, tone: "muted" },
                { label: "6", value: 91, tone: "muted" },
              ],
              caption: "Rolls of three dice where the highest is exactly k",
            },
          },
        ],
      },
      {
        type: "rule",
        name: "The maximum and minimum",
        lines: [
          { lead: "Let `X_1, \\dots, X_n` be independent with distribution function `F(x) = P(X_i \\le x)`. Then", tex: "\\begin{aligned} P(\\max_i X_i \\le x) &= F(x)^n \\\\ P(\\min_i X_i > x) &= \\big(1 - F(x)\\big)^n \\end{aligned}" },
          { lead: "For `n` fair dice with `s` sides each,", tex: "P(\\max = k) = \\frac{k^n - (k-1)^n}{s^n}" },
          { lead: "For `n` independent uniforms on `[0, 1]`,", tex: "\\begin{aligned} E[\\max] &= \\frac{n}{n + 1} \\\\[1ex] E[\\min] &= \\frac{1}{n + 1} \\end{aligned}" },
        ],
        plain: "“All at most `k`” minus “all at most `k - 1`” leaves “the highest is exactly `k`”.",
        note: "For three six-sided dice, `n = 3`, `s = 6` and `k = 4`: {{P(max = 4) = (4³ − 3³)/6³ = 37/216}} For the lowest, count the rolls where every die is at least `k` instead.",
      },
      {
        type: "text",
        heading: "Random numbers in a range",
        body: [
          "The same idea works for uniform numbers. For `n` numbers between 0 and 1, the largest is below `x` only if every one of them is, which has chance `x^n`.",
          "There’s a shortcut for averages: `n` random points cut the range into `n + 1` gaps, and on average the gaps are equal. So the largest sits `n` gaps up, at `n/(n + 1)`, and the smallest sits one gap up, at `1/(n + 1)`.",
        ],
      },
      {
        type: "check",
        prompt: "Four numbers are picked uniformly between 0 and 60. What’s the average of the smallest?",
        choices: ["12", "15", "30", "48"],
        answer: 0,
        explain:
          "Four points cut the range into five gaps of 12 on average, and the smallest sits one gap up. The answer 15 divides by the number of points instead of the number of gaps, and 48 is the average of the largest.",
      },
      {
        type: "example",
        lead: "To find the average of the highest of two dice, find the chance of each value with the count above, then weight each value by its chance.",
      },
      {
        type: "trap",
        body: "Assuming the highest of two dice averages 3.5, like one die. Keeping the higher roll pulls the average up to 161/36, about 4.47. The lowest is pulled down by the same amount, to about 2.53.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The question asks for the largest, smallest, first or last of several results",
          "“Every result is below `x`” is easier to count than “the largest is `x`”",
          "Several times, prices or points are picked at random in a range",
        ],
      },
    ],
    targetSeconds: 60,
    example: highestOrLowest({ type: "highest", dice: 2, sides: 6 }),
    families: [
      {
        id: "dice",
        title: "Highest or lowest of several dice",
        generate: (random) => {
          const dice = random() < 0.6 ? 2 : 3;
          const sides = pick(random, dice === 2 ? [4, 6, 8, 10] : [4, 6, 8]);
          return highestOrLowest({ type: random() < 0.6 ? "highest" : "lowest", dice, sides });
        },
      },
      {
        id: "uniform-extreme",
        title: "Largest or smallest of random numbers",
        generate: (random) => uniformExtreme({ type: random() < 0.6 ? "max" : "min", n: int(random, 2, 5), scale: random() < 0.5 ? 1 : 60 }),
      },
      {
        id: "all-past",
        title: "Chance the largest or smallest passes a value",
        generate: (random) => {
          const side = random() < 0.6 ? "below" : "above";
          const [xN, xD] = pick(random, side === "below" ? HIGH_CUTOFFS : LOW_CUTOFFS);
          return allBelow({ n: int(random, 2, 4), xN, xD, side });
        },
      },
      {
        id: "median",
        title: "The middle of three random numbers",
        generate: (random) => {
          const [length, x] = pick(random, MEDIAN_CUTS);
          return medianThree({ length, x, side: random() < 0.6 ? "above" : "below" });
        },
      },
    ],
  },
];
