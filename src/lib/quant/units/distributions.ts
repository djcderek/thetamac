import { add, div, formatFraction, formatPercent, mul, pow, q, sub, value, type Rational } from "../rational";
import { choose, int, pick, problem, sup, type QuantLessonDef, type QuantProblem, type Random } from "../build";

// ─── Binomial ────────────────────────────────────────────────────────────────────────────

/** "(4/5)³", "4/5" for a power of 1, "" for a power of 0. */
function power(base: Rational, exponent: number) {
  if (exponent === 0) return "";
  const text = formatFraction(base);
  return exponent === 1 ? text : `(${text})${sup(exponent)}`;
}

const timesTerms = (...terms: string[]) => terms.filter(Boolean).join(" × ");

/** Repeated tries with the same chance, in the words of each setting. */
const TRIALS: {
  id: string;
  chance: [number, number];
  /** The tries, for "which 3 of the 5 days". */
  noun: string;
  minTries: number;
  maxTries: number;
  /** `count` is "exactly 3" or "at least 3"; `k` picks "head" or "heads". */
  prompt: (n: number, count: string, k: number) => string;
}[] = [
  {
    id: "heads",
    chance: [1, 2],
    noun: "flips",
    minTries: 3,
    maxTries: 8,
    prompt: (n, count, k) => `You flip a fair coin ${n} times. What's the chance of ${count} ${k === 1 ? "head" : "heads"}?`,
  },
  {
    id: "sixes",
    chance: [1, 6],
    noun: "rolls",
    minTries: 2,
    maxTries: 5,
    prompt: (n, count, k) => `You roll a fair die ${n} times. What's the chance of ${count} ${k === 1 ? "six" : "sixes"}?`,
  },
  {
    id: "sunny",
    chance: [4, 5],
    noun: "days",
    minTries: 3,
    maxTries: 5,
    prompt: (n, count) =>
      `Each day at a beach town is sunny with chance 80%, independently. What's the chance ${count} of the next ${n} days are sunny?`,
  },
  {
    id: "free-throws",
    chance: [7, 10],
    noun: "shots",
    minTries: 3,
    maxTries: 5,
    prompt: (n, count) => `A player makes each free throw with chance 70%. Taking ${n} shots, what's the chance they make ${count}?`,
  },
  {
    id: "guessing",
    chance: [1, 4],
    noun: "questions",
    minTries: 3,
    maxTries: 6,
    prompt: (n, count) =>
      `A quiz has ${n} questions, each with 4 choices. If you guess every answer, what's the chance you get ${count} right?`,
  },
  {
    id: "biased-coin",
    chance: [2, 3],
    noun: "flips",
    minTries: 3,
    maxTries: 6,
    prompt: (n, count, k) =>
      `A coin lands heads with chance 2/3. Flipping it ${n} times, what's the chance of ${count} ${k === 1 ? "head" : "heads"}?`,
  },
];

const exactlyChance = (n: number, k: number, p: Rational) =>
  mul(q(choose(n, k)), mul(pow(p, k), pow(sub(q(1), p), n - k)));

function binomial(params: { trial: string; tries: number; successes: number; ask: "exactly" | "at-least" }): QuantProblem {
  const trial = TRIALS.find((t) => t.id === params.trial)!;
  const { tries: n, successes: k, ask } = params;
  const p = q(...trial.chance);
  const miss = sub(q(1), p);
  const count = ask === "exactly" ? `exactly ${k}` : `at least ${k}`;
  const key = `${trial.id}-${n}-${k}-${ask}`;
  if (ask === "exactly") {
    const ways = choose(n, k);
    const oneOrder = mul(pow(p, k), pow(miss, n - k));
    return problem(
      key,
      trial.prompt(n, count, k),
      exactlyChance(n, k, p),
      "probability",
      [
        { label: `Ways to pick which ${k} of the ${n} ${trial.noun}`, work: `C(${n}, ${k})`, result: `${ways}` },
        { label: "Chance of one such order", work: timesTerms(power(p, k), power(miss, n - k)), result: formatFraction(oneOrder) },
        { label: `Chance of exactly ${k}`, work: `${ways} × ${formatFraction(oneOrder)}` },
      ],
      params,
    );
  }
  // At least k: add the exact chances from k up to n.
  const terms = Array.from({ length: n - k + 1 }, (_, i) => k + i);
  let total = q(0);
  for (const j of terms) total = add(total, exactlyChance(n, j, p));
  return problem(
    key,
    trial.prompt(n, count, k),
    total,
    "probability",
    [
      ...terms.map((j) => ({
        label: `Exactly ${j}`,
        work: timesTerms(j === n ? "" : `C(${n}, ${j})`, power(p, j), power(miss, n - j)),
        result: formatFraction(exactlyChance(n, j, p)),
      })),
      { label: `At least ${k}`, work: terms.map((j) => formatFraction(exactlyChance(n, j, p))).join(" + ") },
    ],
    params,
  );
}

/** A binomial question whose answer types cleanly (between 1% and 99%). */
function randomBinomial(random: Random): QuantProblem {
  for (;;) {
    const trial = pick(random, TRIALS);
    const n = int(random, trial.minTries, trial.maxTries);
    // "At least" sums at most three exact chances, so the working stays short.
    const ask = random() < 0.5 ? "exactly" : "at-least";
    const k = ask === "exactly" ? int(random, 1, n - 1) : int(random, Math.max(1, n - 2), n - 1);
    const made = binomial({ trial: trial.id, tries: n, successes: k, ask });
    const v = value(made.answer);
    if (v >= 0.01 && v <= 0.99) return made;
  }
}

// ─── Geometric ───────────────────────────────────────────────────────────────────────────

const WAITS: { id: string; label: string; ways: number; outOf: number; each: string }[] = [
  { id: "six", label: "you roll a six with one die", ways: 1, outOf: 6, each: "1 of 6 faces" },
  { id: "five-six", label: "you roll a 5 or 6 with one die", ways: 2, outOf: 6, each: "2 of 6 faces" },
  { id: "double", label: "two dice show a double", ways: 6, outOf: 36, each: "6 of 36 pairs" },
  { id: "eleven-up", label: "two dice total 11 or 12", ways: 3, outOf: 36, each: "3 of 36 pairs" },
  { id: "ten-up", label: "two dice total 10 or more", ways: 6, outOf: 36, each: "6 of 36 pairs" },
  { id: "ace", label: "you draw an ace (putting each card back and reshuffling)", ways: 4, outOf: 52, each: "4 of 52 cards" },
  { id: "heart", label: "you draw a heart (putting each card back and reshuffling)", ways: 13, outOf: 52, each: "13 of 52 cards" },
  { id: "two-heads", label: "two coins both land heads", ways: 1, outOf: 4, each: "1 of 4 outcomes" },
];

/** Repeated tries for the "k successes" and "first success on try k" questions. */
const HITS: {
  id: string;
  chance: [number, number];
  /** One try and several: "flip", "flips". */
  tryWord: string;
  tries: string;
  /** One success: "head". */
  hit: string;
  /** "You flip a fair coin until you have 3 heads". */
  untilCount: (k: number) => string;
  /** "You flip a fair coin until you get a head". */
  untilFirst: string;
}[] = [
  {
    id: "coin",
    chance: [1, 2],
    tryWord: "flip",
    tries: "flips",
    hit: "head",
    untilCount: (k) => `You flip a fair coin until you have ${k} heads`,
    untilFirst: "You flip a fair coin until you get a head",
  },
  {
    id: "die",
    chance: [1, 6],
    tryWord: "roll",
    tries: "rolls",
    hit: "six",
    untilCount: (k) => `You roll a fair die until you've rolled ${k} sixes`,
    untilFirst: "You roll a fair die until you roll a six",
  },
  {
    id: "biased",
    chance: [2, 3],
    tryWord: "flip",
    tries: "flips",
    hit: "head",
    untilCount: (k) => `A coin lands heads with chance 2/3. You flip it until you have ${k} heads`,
    untilFirst: "A coin lands heads with chance 2/3. You flip it until you get a head",
  },
  {
    id: "free-throws",
    chance: [3, 4],
    tryWord: "shot",
    tries: "shots",
    hit: "make",
    untilCount: (k) => `A player makes each free throw with chance 3/4 and shoots until they've made ${k}`,
    untilFirst: "A player makes each free throw with chance 3/4 and shoots until they make one",
  },
];

const ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth"];

type GeometricParams =
  | { type: "wait"; event: string }
  | { type: "k-hits"; hit: string; hits: number }
  | { type: "first-on"; hit: string; on: number }
  | { type: "both-sides"; headsN: number; headsD: number }
  | { type: "roll-total"; sides: number; target: number; last: "with" | "without" };

function geometric(params: GeometricParams): QuantProblem {
  switch (params.type) {
    case "wait": {
      const wait = WAITS.find((w) => w.id === params.event)!;
      const chance = q(wait.ways, wait.outOf);
      return problem(
        `wait-${wait.id}`,
        `You keep trying until ${wait.label}. How many tries do you expect it to take, counting the last?`,
        div(q(1), chance),
        "number",
        [
          { label: "Chance each try", work: wait.each, result: formatFraction(chance) },
          { label: "Average tries", work: `1 ÷ ${formatFraction(chance)}` },
        ],
        params,
      );
    }
    case "k-hits": {
      const hit = HITS.find((h) => h.id === params.hit)!;
      const chance = q(...hit.chance);
      const { hits } = params;
      return problem(
        `k-hits-${hit.id}-${hits}`,
        `${hit.untilCount(hits)}. How many ${hit.tries} do you expect it to take?`,
        div(q(hits), chance),
        "number",
        [
          { label: `Average ${hit.tries} for each ${hit.hit}`, work: `1 ÷ ${formatFraction(chance)}`, result: formatFraction(div(q(1), chance)) },
          { label: `For ${hits}`, work: `${hits} × ${formatFraction(div(q(1), chance))}` },
        ],
        params,
      );
    }
    case "first-on": {
      const hit = HITS.find((h) => h.id === params.hit)!;
      const chance = q(...hit.chance);
      const miss = sub(q(1), chance);
      const { on } = params;
      return problem(
        `first-on-${hit.id}-${on}`,
        `${hit.untilFirst}. What's the chance the first ${hit.hit} comes on the ${ORDINALS[on]} ${hit.tryWord}?`,
        mul(pow(miss, on - 1), chance),
        "probability",
        [
          { label: `Miss the first ${on - 1}`, work: power(miss, on - 1), result: formatFraction(pow(miss, on - 1)) },
          { label: `Then a ${hit.hit}`, work: `${formatFraction(pow(miss, on - 1))} × ${formatFraction(chance)}` },
        ],
        params,
      );
    }
    case "both-sides": {
      const heads = q(params.headsN, params.headsD);
      const tails = sub(q(1), heads);
      const fair = params.headsN * 2 === params.headsD;
      // After the first flip, wait for the other side: 1 ÷ its chance.
      const afterFirst = add(mul(heads, div(q(1), tails)), mul(tails, div(q(1), heads)));
      return problem(
        `both-${params.headsN}-${params.headsD}`,
        fair
          ? "You flip a fair coin until you've seen both heads and tails. How many flips do you expect it to take?"
          : `A coin lands heads with chance ${formatFraction(heads)}. You flip it until you've seen both heads and tails. How many flips do you expect it to take?`,
        add(q(1), afterFirst),
        "number",
        [
          { label: "The first flip shows one side", work: "1 flip", result: "" },
          {
            label: "Then wait for the other side",
            work: `${formatFraction(heads)} × ${formatFraction(div(q(1), tails))} + ${formatFraction(tails)} × ${formatFraction(div(q(1), heads))}`,
            result: formatFraction(afterFirst),
          },
          { label: "Average flips", work: `1 + ${formatFraction(afterFirst)}` },
        ],
        params,
      );
    }
    case "roll-total": {
      const { sides, target, last } = params;
      // Average rolls × average roll (Wald's identity); drop the final roll if it isn't counted.
      const averageRoll = q(sides + 1, 2);
      const withLast = mul(q(sides), averageRoll);
      const answer = last === "with" ? withLast : sub(withLast, q(target));
      return problem(
        `total-${sides}-${target}-${last}`,
        `You roll a fair ${sides}-sided die until it lands on ${sides === 6 && target === 6 ? "a six" : target}, adding up every roll ${last === "with" ? "including" : "except"} the last one. What total do you expect?`,
        answer,
        "number",
        [
          { label: "Average rolls", work: `1 ÷ 1/${sides}`, result: `${sides}` },
          { label: "Average roll", work: `(1 + ${sides}) ÷ 2`, result: `${value(averageRoll)}` },
          ...(last === "with"
            ? [{ label: "Average total", work: `${sides} × ${value(averageRoll)}` }]
            : [
                { label: "Average total with the last roll", work: `${sides} × ${value(averageRoll)}`, result: `${value(withLast)}` },
                { label: "Without the last roll", work: `${value(withLast)} − ${target}` },
              ]),
        ],
        params,
      );
    }
  }
}

function randomGeometric(random: Random): QuantProblem {
  return pick(random, [
    () => geometric({ type: "wait", event: pick(random, WAITS).id }),
    () => geometric({ type: "k-hits", hit: pick(random, HITS).id, hits: int(random, 2, 5) }),
    () => {
      const hit = pick(random, HITS);
      // Keep the chance above 1%: likely hits stop at the fourth try (a die's sixth roll is still 6.7%).
      return geometric({ type: "first-on", hit: hit.id, on: int(random, 2, hit.id === "free-throws" || hit.id === "biased" ? 4 : 6) });
    },
    () => {
      const [headsN, headsD] = pick(random, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]] as const);
      return geometric({ type: "both-sides", headsN, headsD });
    },
    () => {
      const sides = pick(random, [4, 6, 8, 10, 12] as const);
      return geometric({ type: "roll-total", sides, target: int(random, 1, sides), last: random() < 0.5 ? "with" : "without" });
    },
  ])();
}

// ─── Normal ──────────────────────────────────────────────────────────────────────────────

/** Share within k standard deviations of the mean, by the 68–95–99.7 rule, in hundredths of a percent. */
const WITHIN: Record<number, number> = { 1: 6800, 2: 9500, 3: 9970 };
/** A z-score of ±9 stands for "no limit" on that side. */
const OPEN = 9;

/** Share between two z-scores, from the rule. */
function shareBetween(lo: number, hi: number): Rational {
  // Share from the mean out to z on one side.
  const half = (z: number) => (Math.abs(z) === OPEN ? 5000 : Math.abs(z) === 0 ? 0 : WITHIN[Math.abs(z)] / 2) * Math.sign(z);
  return q(half(hi) - half(lo), 10000);
}

const SCALES: {
  id: string;
  setup: string;
  mean: number;
  sd: number;
  show: (x: number) => string;
  /** "what share of people are". */
  share: string;
  /** "a person's height", for "given" questions. */
  one: string;
  above: string;
  below: string;
}[] = [
  {
    id: "heights",
    setup: "Adult heights in a town are normal with mean 175 cm and standard deviation 7 cm.",
    mean: 175,
    sd: 7,
    show: (x) => `${x} cm`,
    share: "what share of people are",
    one: "a person's height",
    above: "taller than",
    below: "shorter than",
  },
  {
    id: "scores",
    setup: "Test scores are normal with mean 500 and standard deviation 100.",
    mean: 500,
    sd: 100,
    show: (x) => `${x}`,
    share: "what share of scores are",
    one: "a score",
    above: "above",
    below: "below",
  },
  {
    id: "returns",
    setup: "A stock's daily return is normal with mean 0% and standard deviation 2%.",
    mean: 0,
    sd: 2,
    show: (x) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x)}%`,
    share: "what share of days are",
    one: "a day's return",
    above: "above",
    below: "below",
  },
  {
    id: "exam",
    setup: "Exam marks are normal with mean 70 and standard deviation 8.",
    mean: 70,
    sd: 8,
    show: (x) => `${x}`,
    share: "what share of marks are",
    one: "a mark",
    above: "above",
    below: "below",
  },
];

const RULE = "Using the 68–95–99.7 rule";

/** One line of working for a share on one side of the mean (both z-scores the same sign or 0). */
function sideStep(lo: number, hi: number, scale: (typeof SCALES)[number]): { label: string; work: string; result: string } {
  const at = (z: number) => scale.show(scale.mean + z * scale.sd);
  const share = formatPercent(shareBetween(lo, hi));
  const w = (z: number) => `${WITHIN[Math.abs(z)] / 100}%`;
  const outer = Math.max(Math.abs(lo), Math.abs(hi));
  const inner = Math.min(Math.abs(lo), Math.abs(hi));
  if (outer === OPEN && inner === 0) return { label: hi > 0 ? "Above the mean" : "Below the mean", work: "half of 100%", result: share };
  if (outer === OPEN) {
    return { label: `${hi > 0 ? "Above" : "Below"} ${at(hi > 0 ? lo : hi)}`, work: `(100% − ${w(inner)}) ÷ 2`, result: share };
  }
  if (inner === 0) return { label: `From the mean to ${at(hi > 0 ? hi : lo)}`, work: `${w(outer)} ÷ 2`, result: share };
  return { label: `From ${at(lo)} to ${at(hi)}`, work: `(${w(outer)} − ${w(inner)}) ÷ 2`, result: share };
}

type NormalParams =
  | { type: "range"; scale: string; lo: number; hi: number }
  | { type: "given"; scale: string; condition: "beyond-1" | "above-1" | "above-mean"; event: "beyond-2" | "above-2" | "above-1" };

function normal(params: NormalParams): QuantProblem {
  const scale = SCALES.find((s) => s.id === params.scale)!;
  const at = (z: number) => scale.show(scale.mean + z * scale.sd);
  if (params.type === "range") {
    const { lo, hi } = params;
    const question =
      lo === -OPEN ? `${scale.below} ${at(hi)}` : hi === OPEN ? `${scale.above} ${at(lo)}` : `between ${at(lo)} and ${at(hi)}`;
    // Split the range at the mean so each piece is a share on one side.
    const pieces = lo < 0 && hi > 0 ? [[lo, 0], [0, hi]] : [[lo, hi]];
    const steps = pieces.map(([a, b]) => sideStep(a, b, scale));
    if (pieces.length > 1) steps.push({ label: "Total", work: steps.map((s) => s.result).join(" + "), result: "" });
    return problem(
      `range-${scale.id}-${lo}-${hi}`,
      `${scale.setup} ${RULE}, ${scale.share} ${question}?`,
      shareBetween(lo, hi),
      "percent",
      steps,
      params,
    );
  }
  const { condition, event } = params;
  const chanceOf = (name: string) =>
    name === "beyond-1"
      ? sub(q(1), shareBetween(-1, 1))
      : name === "beyond-2"
        ? sub(q(1), shareBetween(-2, 2))
        : name === "above-1"
          ? shareBetween(1, OPEN)
          : name === "above-2"
            ? shareBetween(2, OPEN)
            : shareBetween(0, OPEN);
  const describe = (name: string) =>
    name === "beyond-1"
      ? `more than 1 standard deviation from the mean (outside ${at(-1)} to ${at(1)})`
      : name === "beyond-2"
        ? `more than 2 standard deviations from the mean (outside ${at(-2)} to ${at(2)})`
        : name === "above-1"
          ? `above ${at(1)}`
          : name === "above-2"
            ? `above ${at(2)}`
            : `above the mean of ${at(0)}`;
  const given = chanceOf(condition);
  const both = chanceOf(event);
  return problem(
    `given-${scale.id}-${condition}-${event}`,
    `${scale.setup} ${RULE}: ${scale.one} is ${describe(condition)}. What's the chance it's ${describe(event)}?`,
    div(both, given),
    "percent",
    [
      { label: "Chance of what you know", work: describe(condition).replace(/ \(.*\)$/, ""), result: formatPercent(given) },
      { label: "Chance of what you're asked", work: describe(event).replace(/ \(.*\)$/, ""), result: formatPercent(both) },
      { label: "Share of the first that's also the second", work: `${formatPercent(both)} ÷ ${formatPercent(given)}` },
    ],
    params,
  );
}

/** Ranges (in standard deviations) whose share types cleanly: between 1% and 99%. */
const NORMAL_RANGES: [number, number][] = [
  [1, OPEN], [2, OPEN], [-OPEN, -1], [-OPEN, -2], [-1, OPEN], [-2, OPEN], [-OPEN, 1], [-OPEN, 2],
  [-1, 1], [-2, 2], [-1, 2], [-2, 1], [1, 2], [-2, -1], [0, 1], [0, 2], [-1, 0], [2, 3], [-3, -2],
];

const NORMAL_GIVENS = [
  { condition: "beyond-1", event: "beyond-2" },
  { condition: "above-1", event: "above-2" },
  { condition: "above-mean", event: "above-1" },
  { condition: "above-mean", event: "above-2" },
] as const;

export const DISTRIBUTIONS_LESSONS: QuantLessonDef[] = [
  {
    id: "binomial",
    title: "Binomial distribution",
    benefit: "Find the chance of k wins in n tries",
    idea: "The chance of exactly k successes in n tries is C(n, k) × pᵏ × (1 − p)ⁿ⁻ᵏ: the ways to pick which tries succeed, times the chance of one such order. For “at least”, add up the exact chances.",
    targetSeconds: 45,
    example: binomial({ trial: "sunny", tries: 4, successes: 3, ask: "at-least" }),
    generate: randomBinomial,
  },
  {
    id: "geometric",
    title: "Geometric distribution",
    benefit: "Find how long until the first success",
    idea: "If each try works with chance p, it takes 1 ÷ p tries on average, and k ÷ p tries to get k successes. The chance the first success comes on try k is (1 − p)ᵏ⁻¹ × p.",
    targetSeconds: 30,
    example: geometric({ type: "wait", event: "five-six" }),
    generate: randomGeometric,
  },
  {
    id: "normal",
    title: "Normal distribution",
    benefit: "Use the 68–95–99.7 rule",
    idea: "In a normal distribution, about 68% of values are within 1 standard deviation of the mean, 95% within 2 and 99.7% within 3. What's left splits evenly between the two sides.",
    targetSeconds: 30,
    example: normal({ type: "range", scale: "heights", lo: 2, hi: OPEN }),
    generate: (random) =>
      random() < 0.75
        ? (() => {
            const [lo, hi] = pick(random, NORMAL_RANGES);
            return normal({ type: "range", scale: pick(random, SCALES).id, lo, hi });
          })()
        : normal({ type: "given", scale: pick(random, SCALES).id, ...pick(random, NORMAL_GIVENS) }),
  },
];
