import { add, div, formatFraction, formatPercent, mul, pow, q, sub, value, type Rational } from "../rational";
import { choose, int, pick, problem, sup, timesWord, type QuantLessonDef, type QuantProblem, type Random } from "../build";
import type { CardId, QuantVisual } from "../visual";

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
  /** One try, for figure labels: "Day 1". */
  one: string;
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
    one: "Flip",
    chance: [1, 2],
    noun: "flips",
    minTries: 3,
    maxTries: 8,
    prompt: (n, count, k) => `You flip a fair coin ${n} times. What’s the chance of ${count} ${k === 1 ? "head" : "heads"}?`,
  },
  {
    id: "sixes",
    one: "Roll",
    chance: [1, 6],
    noun: "rolls",
    minTries: 2,
    maxTries: 5,
    prompt: (n, count, k) => `You roll a fair die ${n} times. What’s the chance of ${count} ${k === 1 ? "six" : "sixes"}?`,
  },
  {
    id: "sunny",
    one: "Day",
    chance: [4, 5],
    noun: "days",
    minTries: 3,
    maxTries: 5,
    prompt: (n, count) =>
      `Each day at a beach town is sunny with chance 80%, independently. What’s the chance ${count} of the next ${n} days are sunny?`,
  },
  {
    id: "free-throws",
    one: "Shot",
    chance: [7, 10],
    noun: "shots",
    minTries: 3,
    maxTries: 5,
    prompt: (n, count) => `A player makes each free throw with chance 70%. Taking ${n} shots, what’s the chance they make ${count}?`,
  },
  {
    id: "guessing",
    one: "Question",
    chance: [1, 4],
    noun: "questions",
    minTries: 3,
    maxTries: 6,
    prompt: (n, count) =>
      `A quiz has ${n} questions, each with 4 choices. If you guess every answer, what’s the chance you get ${count} right?`,
  },
  {
    id: "biased-coin",
    one: "Flip",
    chance: [2, 3],
    noun: "flips",
    minTries: 3,
    maxTries: 6,
    prompt: (n, count, k) =>
      `A coin lands heads with chance 2/3. Flipping it ${n} times, what’s the chance of ${count} ${k === 1 ? "head" : "heads"}?`,
  },
];

const exactlyChance = (n: number, k: number, p: Rational) =>
  mul(q(choose(n, k)), mul(pow(p, k), pow(sub(q(1), p), n - k)));

/** Every count of successes from 0 to n, with the asked counts picked out (and labelled, once worked out). */
function distributionBars(n: number, p: Rational, asked: number[], noun: string, labelled = true): QuantVisual {
  return {
    type: "bars",
    bars: Array.from({ length: n + 1 }, (_, j) => {
      const isAsked = asked.includes(j);
      return {
        label: `${j}`,
        value: value(exactlyChance(n, j, p)),
        tone: isAsked ? "hit" : "muted",
        ...(isAsked && labelled ? { text: formatPercent(exactlyChance(n, j, p)) } : {}),
      };
    }),
    caption: `Chance of each number of successes in ${n} ${noun}`,
  };
}

/** One order of k successes then n − k misses: coins for coin flips, multiplied boxes otherwise. */
function oneOrderVisual(trial: (typeof TRIALS)[number], n: number, k: number): QuantVisual {
  const p = q(...trial.chance);
  if (trial.id === "heads" || trial.id === "biased-coin") {
    return {
      type: "coins",
      flips: Array.from({ length: n }, (_, i) => (i < k ? "H" : "T")),
      tones: Array.from({ length: n }, (_, i) => (i < k ? "hit" : "muted")),
      caption: `One order: ${k} ${k === 1 ? "head" : "heads"}, then ${n - k} ${n - k === 1 ? "tail" : "tails"}`,
    };
  }
  return {
    type: "slots",
    op: "×",
    slots: Array.from({ length: n }, (_, i) => ({
      label: `${trial.one} ${i + 1}`,
      value: formatFraction(i < k ? p : sub(q(1), p)),
      tone: i < k ? "hit" : "muted",
    })),
    result: formatFraction(mul(pow(p, k), pow(sub(q(1), p), n - k))),
    caption: `One order: ${k} ${k === 1 ? "success" : "successes"} first, then ${n - k} ${n - k === 1 ? "miss" : "misses"}`,
  };
}

function binomial(params: { trial: string; tries: number; successes: number; ask: "exactly" | "at-least" }): QuantProblem {
  const trial = TRIALS.find((t) => t.id === params.trial)!;
  const { tries: n, successes: k, ask } = params;
  const p = q(...trial.chance);
  const miss = sub(q(1), p);
  const count = ask === "exactly" ? `exactly ${k}` : `at least ${k}`;
  const key = `${trial.id}-${n}-${k}-${ask}`;
  const terms = ask === "exactly" ? [k] : Array.from({ length: n - k + 1 }, (_, i) => k + i);
  const question = distributionBars(n, p, terms, trial.noun, false);
  if (ask === "exactly") {
    const ways = choose(n, k);
    const oneOrder = mul(pow(p, k), pow(miss, n - k));
    return problem(
      key,
      trial.prompt(n, count, k),
      exactlyChance(n, k, p),
      "probability",
      [
        {
          label: `Ways to pick which ${k} of the ${n} ${trial.noun}`,
          work: `C(${n}, ${k})`,
          result: `${ways}`,
          icon: "count",
          explain: `Any ${k} of the ${n} ${trial.noun} can be the successes, and there are \`\\binom{${n}}{${k}}\` ways to choose them.`,
          visual: oneOrderVisual(trial, n, k),
        },
        {
          label: "Chance of one such order",
          work: timesTerms(power(p, k), power(miss, n - k)),
          result: formatFraction(oneOrder),
          icon: "multiply",
          explain: `The ${trial.noun} don’t affect each other, so multiply: ${formatFraction(p)} for each success and ${formatFraction(miss)} for each miss.`,
        },
        {
          label: `Chance of exactly ${k}`,
          work: `${ways} × ${formatFraction(oneOrder)}`,
          icon: "multiply",
          explain: "Every order has the same chance, so multiply one order’s chance by the number of orders.",
          visual: distributionBars(n, p, [k], trial.noun),
        },
      ],
      params,
      question,
    );
  }
  // At least k: add the exact chances from k up to n.
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
        icon: "multiply" as const,
        explain:
          j === n
            ? `All ${n} succeed: there’s only one order, so multiply ${formatFraction(p)} by itself ${n} times.`
            : `\`\\binom{${n}}{${j}}\` counts which ${j} of the ${n} succeed, and each of those orders has the same chance.`,
        visual: distributionBars(n, p, [j], trial.noun),
      })),
      {
        label: `At least ${k}`,
        work: terms.map((j) => formatFraction(exactlyChance(n, j, p))).join(" + "),
        icon: "add",
        explain: "These counts can’t happen at the same time, so add their chances.",
        visual: distributionBars(n, p, terms, trial.noun),
      },
    ],
    params,
    question,
  );
}

/** A binomial question of one kind ("exactly" or "at least") whose answer types cleanly. */
function randomBinomialOf(random: Random, ask: "exactly" | "at-least"): QuantProblem {
  for (;;) {
    const trial = pick(random, TRIALS);
    const n = int(random, trial.minTries, trial.maxTries);
    // "At least" sums at most three exact chances, so the working stays short.
    const k = ask === "exactly" ? int(random, 1, n - 1) : int(random, Math.max(1, n - 2), n - 1);
    const made = binomial({ trial: trial.id, tries: n, successes: k, ask });
    const v = value(made.answer);
    if (v >= 0.01 && v <= 0.99) return made;
  }
}

/** An odd number of heads: P(even) − P(odd) = (1 − 2p)ⁿ, so P(odd) = (1 − (1 − 2p)ⁿ) ÷ 2. */
function oddHeads(params: { type: "odd"; flips: number; headsN: number; headsD: number }): QuantProblem {
  const { flips: n } = params;
  const p = q(params.headsN, params.headsD);
  const fair = params.headsN * 2 === params.headsD;
  const r = sub(q(1), mul(q(2), p));
  const diff = pow(r, n);
  const odds = Array.from({ length: n + 1 }, (_, j) => j).filter((j) => j % 2 === 1);
  const bars = (labelled: boolean) => distributionBars(n, p, odds, "flips", labelled);
  return problem(
    `odd-${n}-${params.headsN}-${params.headsD}`,
    fair
      ? `You flip a fair coin ${n} times. What’s the chance of an odd number of heads?`
      : `A coin lands heads with chance ${formatFraction(p)}. You flip it ${n} times. What’s the chance of an odd number of heads?`,
    div(sub(q(1), diff), q(2)),
    "probability",
    fair
      ? [
          {
            label: "Pair outcomes up by the last flip",
            work: "change the last flip: odd ↔ even",
            result: "",
            icon: "flip",
            explain: "Changing only the last flip turns an odd number of heads into an even one, and back. Both versions are equally likely with a fair coin.",
            visual: bars(false),
          },
          {
            label: "An odd number of heads",
            work: "half of all outcomes",
            icon: "split",
            explain: "So the outcomes split into equal odd and even halves.",
            visual: bars(true),
          },
        ]
      : [
          {
            label: "Even minus odd",
            work: `(1 − 2 × ${formatFraction(p)})${sup(n)} = (${formatFraction(r)})${sup(n)}`,
            result: formatFraction(diff),
            icon: "idea",
            explain: "Expand `((1-p) - p)^n` like `(a + b)^n`. Outcomes with an even number of heads add their chance and odd ones take it away, giving `P(\\text{even}) - P(\\text{odd})`.",
          },
          {
            label: "An odd number of heads",
            work: `(1 − ${formatFraction(diff)}) ÷ 2`,
            icon: "divide",
            explain: "The two chances add up to 1, and their difference is the number above. Take that difference from 1 and halve.",
            visual: bars(true),
          },
        ],
    params,
    bars(false),
  );
}

/** Heads in the first `first` flips equal heads in the last `last`: count the ways for each number of heads. */
function equalGroups(params: { type: "groups"; first: number; last: number }): QuantProblem {
  const { first: a, last: b } = params;
  const n = a + b;
  const ks = Array.from({ length: Math.min(a, b) + 1 }, (_, k) => k);
  const ways = ks.map((k) => choose(a, k) * choose(b, k));
  const total = ways.reduce((sum, w) => sum + w, 0);
  const waysBars: QuantVisual = {
    type: "bars",
    bars: ks.map((k, i) => ({ label: `${k} each`, value: ways[i], tone: "hit", text: `${ways[i]}` })),
    caption: "Ways for each number of heads in both groups",
  };
  return problem(
    `groups-${a}-${b}`,
    `You flip a fair coin ${n} times. What’s the chance the number of heads in the first ${a} flips equals the number in the ${b === 1 ? "last flip" : `last ${b}`}?`,
    q(total, 2 ** n),
    "probability",
    [
      {
        label: "Ways for each number of heads k",
        work: ks.map((k) => `${choose(a, k)}×${choose(b, k)}`).join(" + "),
        result: `${total}`,
        icon: "count",
        explain: `For \`k\` heads in each group, choose which of the first ${a} and which of the last ${b} are heads, and multiply. Then add over every \`k\`.`,
        visual: waysBars,
      },
      {
        label: "All outcomes",
        work: `2${sup(n)}`,
        result: `${2 ** n}`,
        icon: "multiply",
        explain: `Each flip has 2 sides, so ${n} flips give ${2 ** n} equally likely outcomes.`,
      },
      {
        label: "Chance",
        work: `${total} ÷ ${2 ** n}`,
        icon: "divide",
        explain: "Every outcome is equally likely, so divide the ways that match by all the ways.",
      },
    ],
    params,
    {
      type: "coins",
      flips: Array.from({ length: n }, () => "?" as const),
      tones: Array.from({ length: n }, (_, i) => (i < a ? "alt" : "hit")),
      caption: `The first ${a} flips (blue) and the last ${b === 1 ? "flip" : b} (orange)`,
    },
  );
}

/** A jury of three by majority: two careful jurors and a coin-flipper, or three alike. */
function majorityVote(params: { type: "vote"; jury: "coin" | "three"; percent: number }): QuantProblem {
  const { jury, percent } = params;
  const p = q(percent, 100);
  const miss = sub(q(1), p);
  const pct = `${percent}%`;
  const missPct = formatPercent(miss);
  if (jury === "coin") {
    const both = mul(p, p);
    const oneRight = mul(q(2), mul(p, miss));
    const coinAgrees = div(oneRight, q(2));
    return problem(
      `vote-coin-${percent}`,
      `A jury of three decides by majority. Two jurors each reach the right verdict with chance ${pct}, independently, and the third flips a coin. What’s the chance the jury gets it right?`,
      add(both, coinAgrees),
      "percent",
      [
        {
          label: "Both careful jurors right",
          work: `${pct} × ${pct}`,
          result: formatPercent(both),
          icon: "multiply",
          explain: "If both careful jurors are right, they’re a majority, whatever the coin says.",
        },
        {
          label: "Exactly one careful juror right",
          work: `2 × ${pct} × ${missPct}`,
          result: formatPercent(oneRight),
          icon: "multiply",
          explain: "Either careful juror can be the right one, so there are 2 ways. Then the coin decides.",
        },
        {
          label: "…and the coin sides with them",
          work: `${formatPercent(oneRight)} × 1/2`,
          result: formatPercent(coinAgrees),
          icon: "flip",
          explain: "The coin agrees with the right juror half the time.",
        },
        {
          label: "Jury right",
          work: `${formatPercent(both)} + ${formatPercent(coinAgrees)}`,
          icon: "add",
          explain: "Add the two ways the majority can be right. It comes out the same as one careful juror alone.",
        },
      ],
      params,
      {
        type: "tree",
        root: {
          label: "Careful jurors",
          children: [
            { label: "Both right", edge: formatPercent(both), tone: "win" },
            {
              label: "One right",
              edge: formatPercent(oneRight),
              tone: "alt",
              children: [
                { label: "Coin agrees", edge: "1/2", tone: "win" },
                { label: "Coin disagrees", edge: "1/2", tone: "lose" },
              ],
            },
            { label: "Both wrong", edge: formatPercent(mul(miss, miss)), tone: "lose" },
          ],
        },
        caption: "The jury is right on the green branches",
      },
    );
  }
  const all = pow(p, 3);
  const two = mul(q(3), mul(pow(p, 2), miss));
  return problem(
    `vote-three-${percent}`,
    `A jury of three decides by majority. Each juror reaches the right verdict with chance ${pct}, independently. What’s the chance the jury gets it right?`,
    add(all, two),
    "percent",
    [
      {
        label: "All three right",
        work: `${pct}³`,
        result: formatPercent(all),
        icon: "multiply",
        explain: "The jurors don’t affect each other, so multiply their chances.",
      },
      {
        label: "Exactly two right",
        work: `3 × ${pct}² × ${missPct}`,
        result: formatPercent(two),
        icon: "multiply",
        explain: "Any of the 3 jurors can be the wrong one, so there are 3 ways, each with the same chance.",
      },
      {
        label: "Jury right",
        work: `${formatPercent(all)} + ${formatPercent(two)}`,
        icon: "add",
        explain: "Two or three right jurors make a right majority. Those can’t both happen, so add.",
      },
    ],
    params,
    distributionBars(3, p, [2, 3], "jurors", false),
  );
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
    untilCount: (k) => `You roll a fair die until you’ve rolled ${k} sixes`,
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
    untilCount: (k) => `A player makes each free throw with chance 3/4 and shoots until they’ve made ${k}`,
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

/** What ends the wait, drawn: the faces, pairs, cards or coins that count. */
function waitVisual(id: string): QuantVisual {
  const pairs = (test: (a: number, b: number) => boolean) => {
    const cells: [number, number][] = [];
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (test(a, b)) cells.push([a, b]);
    return cells;
  };
  switch (id) {
    case "six":
      return { type: "die-faces", sides: 6, marks: [{ faces: [6], tone: "hit" }], caption: "1 of the 6 faces ends the wait" };
    case "five-six":
      return { type: "die-faces", sides: 6, marks: [{ faces: [5, 6], tone: "hit" }], caption: "2 of the 6 faces end the wait" };
    case "double":
      return { type: "dice-grid", sides: 6, marks: [{ cells: pairs((a, b) => a === b), tone: "hit" }], caption: "6 of the 36 pairs are doubles" };
    case "eleven-up":
      return { type: "dice-grid", sides: 6, marks: [{ cells: pairs((a, b) => a + b >= 11), tone: "hit" }], caption: "3 of the 36 pairs total 11 or 12" };
    case "ten-up":
      return { type: "dice-grid", sides: 6, marks: [{ cells: pairs((a, b) => a + b >= 10), tone: "hit" }], caption: "6 of the 36 pairs total 10 or more" };
    case "ace":
      return { type: "cards", marks: [{ cards: ["1S", "1H", "1D", "1C"], tone: "hit" }], caption: "4 of the 52 cards are aces" };
    case "heart":
      return {
        type: "cards",
        marks: [{ cards: Array.from({ length: 13 }, (_, i) => `${i + 1}H` as CardId), tone: "hit" }],
        caption: "13 of the 52 cards are hearts",
      };
    default:
      return { type: "coins", flips: ["H", "H"], tones: ["hit", "hit"], caption: "Only 1 of the 4 outcomes is two heads" };
  }
}

/** The chance the first success lands on each try, 1 to `count`. */
function firstSuccessBars(chance: Rational, highlight?: number, count = 8): QuantVisual {
  const miss = sub(q(1), chance);
  return {
    type: "bars",
    bars: Array.from({ length: count }, (_, i) => {
      const on = i + 1;
      const share = mul(pow(miss, on - 1), chance);
      return {
        label: `${on}`,
        value: value(share),
        tone: highlight === undefined ? "alt" : on === highlight ? "hit" : "muted",
      };
    }),
    caption: "Chance the first success comes on each try",
  };
}

const capitalise = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`;

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
          {
            label: "Chance each try",
            work: wait.each,
            result: formatFraction(chance),
            icon: "count",
            explain: "Count the outcomes that end the wait, out of all the equally likely outcomes of one try.",
          },
          {
            label: "Average tries",
            work: `1 ÷ ${formatFraction(chance)}`,
            icon: "divide",
            explain: `A ${formatFraction(chance)} chance each try means 1 success every ${formatFraction(div(q(1), chance))} tries on average, counting the try that works.`,
            visual: firstSuccessBars(chance),
          },
        ],
        params,
        waitVisual(wait.id),
      );
    }
    case "k-hits": {
      const hit = HITS.find((h) => h.id === params.hit)!;
      const chance = q(...hit.chance);
      const each = div(q(1), chance);
      const { hits } = params;
      return problem(
        `k-hits-${hit.id}-${hits}`,
        `${hit.untilCount(hits)}. How many ${hit.tries} do you expect it to take?`,
        div(q(hits), chance),
        "number",
        [
          {
            label: `Average ${hit.tries} for each ${hit.hit}`,
            work: `1 ÷ ${formatFraction(chance)}`,
            result: formatFraction(each),
            icon: "divide",
            explain: `Each ${hit.hit} has chance ${formatFraction(chance)}, so waiting for one takes 1 ÷ ${formatFraction(chance)} ${hit.tries} on average.`,
            visual: firstSuccessBars(chance),
          },
          {
            label: `For ${hits}`,
            work: `${hits} × ${formatFraction(each)}`,
            icon: "repeat",
            explain: `After each ${hit.hit} the wait starts fresh, so the ${hits} waits add up.`,
            visual: {
              type: "slots",
              op: "+",
              slots: Array.from({ length: hits }, (_, i) => ({
                label: `${capitalise(hit.hit)} ${i + 1}`,
                value: formatFraction(each),
                tone: "alt",
              })),
              result: formatFraction(div(q(hits), chance)),
              caption: `One wait for each of the ${hits}`,
            },
          },
        ],
        params,
      );
    }
    case "first-on": {
      const hit = HITS.find((h) => h.id === params.hit)!;
      const chance = q(...hit.chance);
      const miss = sub(q(1), chance);
      const { on } = params;
      const tries = (withHit: boolean): QuantVisual => ({
        type: "slots",
        op: "×",
        slots: Array.from({ length: withHit ? on : on - 1 }, (_, i) => ({
          label: `${capitalise(hit.tryWord)} ${i + 1}`,
          value: formatFraction(i === on - 1 ? chance : miss),
          tone: i === on - 1 ? "hit" : "muted",
        })),
        result: formatFraction(withHit ? mul(pow(miss, on - 1), chance) : pow(miss, on - 1)),
        caption: withHit ? `${on - 1} ${on - 1 === 1 ? "miss" : "misses"}, then a ${hit.hit}` : `${on - 1} ${on - 1 === 1 ? "miss" : "misses"} in a row`,
      });
      return problem(
        `first-on-${hit.id}-${on}`,
        `${hit.untilFirst}. What’s the chance the first ${hit.hit} comes on the ${ORDINALS[on]} ${hit.tryWord}?`,
        mul(pow(miss, on - 1), chance),
        "probability",
        [
          {
            label: `Miss the first ${on - 1}`,
            work: power(miss, on - 1),
            result: formatFraction(pow(miss, on - 1)),
            icon: "multiply",
            explain: `For the first ${hit.hit} to come on ${hit.tryWord} ${on}, every ${hit.tryWord} before it must miss. Each miss has chance ${formatFraction(miss)}, so multiply them.`,
            visual: tries(false),
          },
          {
            label: `Then a ${hit.hit}`,
            work: `${formatFraction(pow(miss, on - 1))} × ${formatFraction(chance)}`,
            icon: "target",
            explain: `Then ${hit.tryWord} ${on} must work, which has chance ${formatFraction(chance)}.`,
            visual: tries(true),
          },
        ],
        params,
        firstSuccessBars(chance, on, Math.max(6, on)),
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
          ? "You flip a fair coin until you’ve seen both heads and tails. How many flips do you expect it to take?"
          : `A coin lands heads with chance ${formatFraction(heads)}. You flip it until you’ve seen both heads and tails. How many flips do you expect it to take?`,
        add(q(1), afterFirst),
        "number",
        [
          {
            label: "The first flip shows one side",
            work: "1 flip",
            result: "",
            icon: "flip",
            explain: "Whatever the first flip shows, you’ve seen one side. Now you only need the other.",
            visual: { type: "coins", flips: ["H", "?"], tones: ["alt", "muted"], caption: "One side seen; waiting for the other" },
          },
          {
            label: "Then wait for the other side",
            work: `${formatFraction(heads)} × ${formatFraction(div(q(1), tails))} + ${formatFraction(tails)} × ${formatFraction(div(q(1), heads))}`,
            result: formatFraction(afterFirst),
            icon: "split",
            explain: "If the first flip was heads, waiting for tails takes `1/P(T)` flips, and if it was tails, `1/P(H)`. Weight each case by its chance.",
            visual: {
              type: "tree",
              root: {
                label: "First flip",
                children: [
                  {
                    label: "Heads",
                    edge: formatFraction(heads),
                    tone: "alt",
                    children: [{ label: `${formatFraction(div(q(1), tails))} more`, edge: "wait for T", tone: "hit" }],
                  },
                  {
                    label: "Tails",
                    edge: formatFraction(tails),
                    tone: "alt",
                    children: [{ label: `${formatFraction(div(q(1), heads))} more`, edge: "wait for H", tone: "hit" }],
                  },
                ],
              },
              caption: "The wait for the other side, by what the first flip showed",
            },
          },
          {
            label: "Average flips",
            work: `1 + ${formatFraction(afterFirst)}`,
            icon: "add",
            explain: "Add the first flip to the average wait for the other side.",
          },
        ],
        params,
      );
    }
    case "roll-total": {
      const { sides, target, last } = params;
      // Average rolls × average roll (Wald’s identity); drop the final roll if it isn’t counted.
      const averageRoll = q(sides + 1, 2);
      const withLast = mul(q(sides), averageRoll);
      const answer = last === "with" ? withLast : sub(withLast, q(target));
      const product: QuantVisual = {
        type: "slots",
        op: "×",
        slots: [
          { label: "Rolls", value: `${sides}` },
          { label: "Each roll", value: `${value(averageRoll)}`, tone: "alt" },
        ],
        result: `${value(withLast)}`,
        caption: "Average rolls times the average roll",
      };
      return problem(
        `total-${sides}-${target}-${last}`,
        `You roll a fair ${sides}-sided die until it lands on ${sides === 6 && target === 6 ? "a six" : target}, adding up every roll ${last === "with" ? "including" : "except"} the last one. What total do you expect?`,
        answer,
        "number",
        [
          {
            label: "Average rolls",
            work: `1 ÷ 1/${sides}`,
            result: `${sides}`,
            icon: "divide",
            explain: `Each roll lands on ${target} with chance 1/${sides}, so it takes ${sides} rolls on average, counting the last.`,
            visual: { type: "die-faces", sides, marks: [{ faces: [target], tone: "hit" }], caption: `The roll that stops you: ${target}` },
          },
          {
            label: "Average roll",
            work: `(1 + ${sides}) ÷ 2`,
            result: `${value(averageRoll)}`,
            icon: "add",
            explain: "Every face is equally likely, so one roll averages the middle of 1 and the top face.",
            visual: {
              type: "die-faces",
              sides,
              marks: [{ faces: Array.from({ length: sides }, (_, i) => i + 1), tone: "alt" }],
              caption: `Faces 1 to ${sides}, each equally likely`,
            },
          },
          ...(last === "with"
            ? [
                {
                  label: "Average total",
                  work: `${sides} × ${value(averageRoll)}`,
                  icon: "multiply" as const,
                  explain: "The average total is the average number of rolls times the average roll.",
                  visual: product,
                },
              ]
            : [
                {
                  label: "Average total with the last roll",
                  work: `${sides} × ${value(averageRoll)}`,
                  result: `${value(withLast)}`,
                  icon: "multiply" as const,
                  explain: "The average total is the average number of rolls times the average roll.",
                  visual: product,
                },
                {
                  label: "Without the last roll",
                  work: `${value(withLast)} − ${target}`,
                  icon: "subtract" as const,
                  explain: `The last roll is always ${target}, so take it off.`,
                },
              ]),
        ],
        params,
      );
    }
  }
}

const ORDINAL = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh"];

/** Settings for "the k-th success lands on try n". */
const KTH: {
  id: string;
  chance: [number, number];
  /** One try, for figure labels: "Fish". */
  one: string;
  hit: string;
  prompt: (k: number, n: number) => string;
}[] = [
  {
    id: "coin",
    chance: [1, 2],
    one: "Flip",
    hit: "head",
    prompt: (k, n) => `You flip a fair coin until you have ${k} heads. What’s the chance the ${ORDINAL[k]} head comes on flip ${n}?`,
  },
  {
    id: "fish",
    chance: [1, 2],
    one: "Fish",
    hit: "catch",
    prompt: (k, n) =>
      `A bear catches each fish that swims past with chance 1/2, and leaves once it has caught ${k}. What’s the chance its ${ORDINAL[k]} catch is the ${ORDINAL[n]} fish?`,
  },
  {
    id: "die",
    chance: [1, 6],
    one: "Roll",
    hit: "six",
    prompt: (k, n) => `You roll a fair die until you’ve rolled ${k} sixes. What’s the chance the ${ORDINAL[k]} six comes on roll ${n}?`,
  },
  {
    id: "free-throws",
    chance: [3, 4],
    one: "Shot",
    hit: "make",
    prompt: (k, n) =>
      `A player makes each free throw with chance 3/4 and stops after making ${k}. What’s the chance the ${ORDINAL[k]} make comes on shot ${n}?`,
  },
];

function kthOnN(params: { type: "kth"; setting: string; k: number; n: number }): QuantProblem {
  const setting = KTH.find((s) => s.id === params.setting)!;
  const { k, n } = params;
  const p = q(...setting.chance);
  const miss = sub(q(1), p);
  const ways = choose(n - 1, k - 1);
  const oneOrder = mul(pow(p, k), pow(miss, n - k));
  const order: QuantVisual = {
    type: "slots",
    op: "×",
    slots: Array.from({ length: n }, (_, i) => {
      const success = i < k - 1 || i === n - 1;
      return { label: `${setting.one} ${i + 1}`, value: formatFraction(success ? p : miss), tone: success ? "hit" : "muted" };
    }),
    result: formatFraction(oneOrder),
    caption: `One order: the other ${k - 1} first, then the misses, then the last ${setting.hit}`,
  };
  return problem(
    `kth-${setting.id}-${k}-${n}`,
    setting.prompt(k, n),
    mul(q(ways), oneOrder),
    "probability",
    [
      {
        label: `The ${ORDINAL[n]} must be a ${setting.hit}`,
        work: `${setting.one.toLowerCase()} ${n} succeeds, and ${k - 1} of the ${n - 1} before it`,
        result: "",
        icon: "target",
        explain: `For the ${ORDINAL[k]} ${setting.hit} to land on try ${n}, that try must succeed, with exactly ${k - 1} of the ${n - 1} before it succeeding too.`,
      },
      {
        label: `Ways to place the other ${k - 1}`,
        work: `C(${n - 1}, ${k - 1})`,
        result: `${ways}`,
        icon: "count",
        explain: `The earlier ${k - 1 === 1 ? "success" : `${k - 1} successes`} can be on any ${k - 1} of the first ${n - 1} tries.`,
      },
      {
        label: "Chance of one such order",
        work: timesTerms(power(p, k), power(miss, n - k)),
        result: formatFraction(oneOrder),
        icon: "multiply",
        explain: `The tries don’t affect each other: ${formatFraction(p)} for each success and ${formatFraction(miss)} for each miss.`,
        visual: order,
      },
      {
        label: "Chance",
        work: `${ways} × ${formatFraction(oneOrder)}`,
        icon: "multiply",
        explain: "Every order has the same chance, so multiply by the number of orders.",
      },
    ],
    params,
    order,
  );
}

/** Faces you’re told never came up before the 6. */
const FORBIDDEN: { id: string; faces: number[]; text: string }[] = [
  { id: "no-5", faces: [5], text: "you never rolled a 5" },
  { id: "no-1", faces: [1], text: "you never rolled a 1" },
  { id: "no-4-5", faces: [4, 5], text: "you never rolled a 4 or a 5" },
  { id: "no-1-2", faces: [1, 2], text: "you never rolled a 1 or a 2" },
  { id: "even", faces: [1, 3, 5], text: "every roll was even" },
  { id: "four-up", faces: [1, 2, 3], text: "every roll was 4 or more" },
  { id: "five-up", faces: [1, 2, 3, 4], text: "every roll was a 5 or a 6" },
];

/** Waiting for a 6, given some faces never came up: the wait for the first of the 6 or those faces. */
function waitGiven(params: { type: "given"; forbidden: string }): QuantProblem {
  const rule = FORBIDDEN.find((f) => f.id === params.forbidden)!;
  const stopping = 1 + rule.faces.length;
  const chance = q(stopping, 6);
  const listed = rule.faces.join(", ");
  return problem(
    `given-${rule.id}`,
    `You roll a fair die until you get a 6. You’re told ${rule.text}. On average, how many rolls did it take, counting the 6?`,
    div(q(1), chance),
    "number",
    [
      {
        label: "Faces that end the run or break the rule",
        work: `the 6, or ${listed}: ${stopping} of 6 faces`,
        result: formatFraction(chance),
        icon: "filter",
        explain: "Only the 6 and the faces you’re told never came up matter. Any other face just means roll again.",
      },
      {
        label: "Knowing it ended on the 6 changes nothing",
        work: `the first of these ${stopping} faces comes just as fast, whichever it is`,
        result: "",
        icon: "idea",
        explain: "How long it takes to hit one of these faces doesn’t depend on which one it hits. So the runs that end on the 6 wait just as long as the rest.",
      },
      {
        label: "Average rolls",
        work: `1 ÷ ${formatFraction(chance)}`,
        icon: "divide",
        explain: "So it’s a plain wait for any of those faces. The average is 1 divided by their chance, counting the last roll.",
      },
    ],
    params,
    {
      type: "die-faces",
      sides: 6,
      marks: [
        { faces: [6], tone: "hit" },
        { faces: rule.faces, tone: "lose" },
      ],
      caption: "The 6 ends the run; the red faces never came up",
    },
  );
}

/** Die size and the multiple the running total must hit (the multiple divides the die size). */
const MULTIPLES: [number, number][] = [
  [6, 6], [6, 3], [6, 2], [4, 4], [4, 2], [8, 8], [8, 4], [10, 5], [12, 6], [12, 4], [12, 3],
];

/** Adding rolls until the total is a multiple of m: from any total, the same share of faces gets there. */
function multipleOf(params: { type: "multiple"; sides: number; m: number }): QuantProblem {
  const { sides, m } = params;
  const good = sides / m;
  const hits = Array.from({ length: sides }, (_, i) => i + 1).filter((f) => f % m === 0);
  return problem(
    `multiple-${sides}-${m}`,
    `You roll a fair ${sides}-sided die, adding up the rolls, until the total is a multiple of ${m}. How many rolls do you expect it to take?`,
    q(m),
    "number",
    [
      {
        label: `Chance a roll makes the total a multiple of ${m}`,
        work: `${good} of the ${sides} faces`,
        result: `1/${m}`,
        icon: "count",
        explain: `Whatever the total so far, exactly ${good} of the ${sides} faces ${good === 1 ? "brings" : "bring"} it to a multiple of ${m}. So every roll does it with chance 1/${m}.`,
        visual: {
          type: "die-faces",
          sides,
          marks: [{ faces: hits, tone: "hit" }],
          caption: `From a multiple of ${m}, these faces land on the next one; from any other total, ${good} other faces do`,
        },
      },
      {
        label: "Average rolls",
        work: `1 ÷ 1/${m}`,
        icon: "divide",
        explain: "The chance is the same on every roll, so it’s a plain wait. The average is 1 divided by the chance, counting the last roll.",
      },
    ],
    params,
  );
}

/** Couples who have children until a girl (or two girls, or a girl or three children). */
function untilGirl(params: { type: "family"; stop: "girl" | "two-girls" | "girl-or-three"; ask: "children" | "boys" }): QuantProblem {
  const { stop, ask } = params;
  const rule =
    stop === "girl" ? "until they have a girl" : stop === "two-girls" ? "until they have two girls" : "until they have a girl or 3 children, whichever comes first";
  const prompt = `In a town, every couple keeps having children ${rule}, then stops. Each child is a girl or a boy with equal chance. On average, how many ${ask} does a couple have?`;
  const half = q(1, 2);
  if (stop === "girl-or-three") {
    const tree: QuantVisual = {
      type: "tree",
      root: {
        label: "1st child",
        children: [
          { label: "Girl: stop", edge: "1/2", tone: "win" },
          {
            label: "Boy",
            edge: "1/2",
            tone: "alt",
            children: [
              { label: "Girl: stop", edge: "1/2", tone: "win" },
              {
                label: "Boy",
                edge: "1/2",
                tone: "alt",
                children: [
                  { label: "Girl", edge: "1/2", tone: "win" },
                  { label: "Boy", edge: "1/2", tone: "alt" },
                ],
              },
            ],
          },
        ],
      },
      caption: "A 2nd child only after a boy; a 3rd only after two boys",
    };
    return problem(
      `family-${stop}-${ask}`,
      prompt,
      ask === "children" ? q(7, 4) : q(7, 8),
      "number",
      ask === "children"
        ? [
            {
              label: "Chance each child is born",
              work: "1st: 1, 2nd: 1/2, 3rd: 1/4",
              result: "",
              icon: "split",
              explain: "There’s always a 1st child. A 2nd comes only if the 1st is a boy, and a 3rd only if the first two are boys.",
              visual: tree,
            },
            {
              label: "Average children",
              work: "1 + 1/2 + 1/4",
              icon: "add",
              explain: "The average number of children is the chance each one is born, added up.",
            },
          ]
        : [
            {
              label: "Chance each child is born and a boy",
              work: "1st: 1/2, 2nd: 1/4, 3rd: 1/8",
              result: "",
              icon: "split",
              explain: "Each child that’s born is a boy half the time: the 1st always, the 2nd half the time, the 3rd a quarter of the time.",
              visual: tree,
            },
            {
              label: "Average boys",
              work: "1/2 + 1/4 + 1/8",
              icon: "add",
              explain: "The average number of boys is the chance each child is a boy, added up.",
            },
          ],
      params,
    );
  }
  const girls = stop === "girl" ? 1 : 2;
  const children = q(2 * girls);
  const steps: (Omit<QuantProblem["steps"][number], "result"> & { result?: string })[] = [
    {
      label: "Average children for each girl",
      work: "1 ÷ 1/2",
      result: "2",
      icon: "divide",
      explain: "Waiting for a girl is a wait for a 1/2 chance, which takes 2 children on average, counting the girl.",
      visual: firstSuccessBars(half, undefined, 6),
    },
  ];
  if (girls === 2) {
    steps.push({
      label: "For two girls",
      work: "2 × 2",
      result: "4",
      icon: "repeat",
      explain: "After the first girl the wait starts again, so the two waits add up.",
    });
  }
  if (ask === "boys") {
    steps.push({
      label: "Average boys",
      work: `${2 * girls} − ${girls} ${girls === 1 ? "girl" : "girls"}`,
      icon: "subtract",
      explain: `Every couple ends with exactly ${girls === 1 ? "one girl" : "two girls"}, so the rest of the children are boys.`,
    });
  }
  return problem(`family-${stop}-${ask}`, prompt, ask === "children" ? children : q(girls), "number", steps, params);
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
  /** "a person’s height", for "given" questions. */
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
    one: "a person’s height",
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
    setup: "A stock’s daily return is normal with mean 0% and standard deviation 2%.",
    mean: 0,
    sd: 2,
    show: (x) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x)}%`,
    share: "what share of days are",
    one: "a day’s return",
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

/** The figure spans −3 to 3 standard deviations; "no limit" draws to the edge. */
const edge = (z: number) => Math.max(-3, Math.min(3, z));

type Band = [number, number];

/** A bell curve with bands shaded, ticks at the mean and each whole SD in the question’s units. */
function bellCurve(
  scale: (typeof SCALES)[number],
  layers: { bands: Band[]; tone: "hit" | "known"; text?: (band: Band) => string }[],
  caption: string,
): QuantVisual {
  return {
    type: "normal",
    shade: layers.flatMap((layer) =>
      layer.bands.map((band) => ({
        from: edge(band[0]),
        to: edge(band[1]),
        tone: layer.tone,
        ...(layer.text ? { text: layer.text(band) } : {}),
      })),
    ),
    ticks: [-3, -2, -1, 0, 1, 2, 3].map((z) => ({ at: z, label: scale.show(scale.mean + z * scale.sd) })),
    caption,
  };
}

const bandShare = ([lo, hi]: Band) => formatPercent(shareBetween(lo, hi));

/** One line of working for a share on one side of the mean (both z-scores the same sign or 0). */
function sideStep(lo: number, hi: number, scale: (typeof SCALES)[number]) {
  const at = (z: number) => scale.show(scale.mean + z * scale.sd);
  const share = formatPercent(shareBetween(lo, hi));
  const w = (z: number) => `${WITHIN[Math.abs(z)] / 100}%`;
  const outer = Math.max(Math.abs(lo), Math.abs(hi));
  const inner = Math.min(Math.abs(lo), Math.abs(hi));
  const sd = (k: number) => `${k} standard deviation${k === 1 ? "" : "s"}`;
  const visual = bellCurve(scale, [{ bands: [[lo, hi]], tone: "hit", text: bandShare }], "The share you want, shaded");
  if (outer === OPEN && inner === 0) {
    return {
      label: hi > 0 ? "Above the mean" : "Below the mean",
      work: "half of 100%",
      result: share,
      icon: "split" as const,
      explain: "The curve is the same on both sides of the mean, so half of all values are on each side.",
      visual,
    };
  }
  if (outer === OPEN) {
    return {
      label: `${hi > 0 ? "Above" : "Below"} ${at(hi > 0 ? lo : hi)}`,
      work: `(100% − ${w(inner)}) ÷ 2`,
      result: share,
      icon: "split" as const,
      explain: `${w(inner)} of values are within ${sd(inner)} of the mean. The rest are outside, split evenly between the two sides, so take half.`,
      visual,
    };
  }
  if (inner === 0) {
    return {
      label: `From the mean to ${at(hi > 0 ? hi : lo)}`,
      work: `${w(outer)} ÷ 2`,
      result: share,
      icon: "split" as const,
      explain: `${w(outer)} of values are within ${sd(outer)} of the mean, half on each side, so take half.`,
      visual,
    };
  }
  return {
    label: `From ${at(lo)} to ${at(hi)}`,
    work: `(${w(outer)} − ${w(inner)}) ÷ 2`,
    result: share,
    icon: "subtract" as const,
    explain: `Take the share within ${sd(inner)} away from the share within ${sd(outer)}. That leaves two equal strips, one on each side, so take half.`,
    visual,
  };
}

type NormalParams =
  | { type: "range"; scale: string; lo: number; hi: number }
  | { type: "given"; scale: string; condition: "beyond-1" | "above-1" | "above-mean"; event: "beyond-2" | "above-2" | "above-1" };

/** The parts of the curve each named region covers, in standard deviations. */
const REGION_BANDS: Record<string, Band[]> = {
  "beyond-1": [[-OPEN, -1], [1, OPEN]],
  "beyond-2": [[-OPEN, -2], [2, OPEN]],
  "above-1": [[1, OPEN]],
  "above-2": [[2, OPEN]],
  "above-mean": [[0, OPEN]],
};

function normal(params: NormalParams): QuantProblem {
  const scale = SCALES.find((s) => s.id === params.scale)!;
  const at = (z: number) => scale.show(scale.mean + z * scale.sd);
  if (params.type === "range") {
    const { lo, hi } = params;
    const question =
      lo === -OPEN ? `${scale.below} ${at(hi)}` : hi === OPEN ? `${scale.above} ${at(lo)}` : `between ${at(lo)} and ${at(hi)}`;
    // Split the range at the mean so each piece is a share on one side.
    const pieces: Band[] = lo < 0 && hi > 0 ? [[lo, 0], [0, hi]] : [[lo, hi]];
    const steps: (Omit<QuantProblem["steps"][number], "result"> & { result?: string })[] = pieces.map(([a, b]) => sideStep(a, b, scale));
    if (pieces.length > 1) {
      steps.push({
        label: "Total",
        work: steps.map((s) => s.result).join(" + "),
        result: "",
        icon: "add",
        explain: "The two pieces sit on opposite sides of the mean and don’t overlap, so add them.",
        visual: bellCurve(scale, [{ bands: pieces, tone: "hit", text: bandShare }], "Both pieces together"),
      });
    }
    return problem(
      `range-${scale.id}-${lo}-${hi}`,
      `${scale.setup} ${RULE}, ${scale.share} ${question}?`,
      shareBetween(lo, hi),
      "percent",
      steps,
      params,
      bellCurve(scale, [{ bands: [[lo, hi]], tone: "hit" }], `The values ${question}`),
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
  const known = { bands: REGION_BANDS[condition], tone: "known" as const, text: bandShare };
  const asked = { bands: REGION_BANDS[event], tone: "hit" as const, text: bandShare };
  return problem(
    `given-${scale.id}-${condition}-${event}`,
    `${scale.setup} ${RULE}: ${scale.one} is ${describe(condition)}. What’s the chance it’s ${describe(event)}?`,
    div(both, given),
    "percent",
    [
      {
        label: "Chance of what you know",
        work: describe(condition).replace(/ \(.*\)$/, ""),
        result: formatPercent(given),
        icon: "filter",
        explain: "This is the part of the curve you’re told the value is in. Only this part counts now.",
        visual: bellCurve(scale, [known], "What you’re told"),
      },
      {
        label: "Chance of what you’re asked",
        work: describe(event).replace(/ \(.*\)$/, ""),
        result: formatPercent(both),
        icon: "target",
        explain: "This is the part you’re asked about. It sits inside what you’re told.",
        visual: bellCurve(scale, [known, asked], "What you’re asked, inside what you’re told"),
      },
      {
        label: "Share of the first that’s also the second",
        work: `${formatPercent(both)} ÷ ${formatPercent(given)}`,
        icon: "divide",
        explain: "Given what you know, the chance is the asked share as a fraction of the known share.",
      },
    ],
    params,
    bellCurve(scale, [{ bands: REGION_BANDS[condition], tone: "known" }], "What you’re told"),
  );
}

/** A scale for figures and working, from a mean, an SD and how to show a value. */
function scaleOf(mean: number, sd: number, show: (x: number) => string): (typeof SCALES)[number] {
  return { id: "custom", setup: "", mean, sd, show, share: "", one: "", above: "", below: "" };
}

type Region = "above-1" | "above-2" | "below-1" | "below-2" | "within-1" | "within-2";
const REGIONS: Region[] = ["above-1", "above-2", "below-1", "below-2", "within-1", "within-2"];

/** A region as a band of z-scores. */
function regionBand(region: Region): Band {
  const k = Number(region.split("-")[1]);
  return region.startsWith("above") ? [k, OPEN] : region.startsWith("below") ? [-OPEN, -k] : [-k, k];
}

/** The rule’s last step for a region: one side via sideStep, or "within k" read straight off the rule. */
function ruleStep(region: Region, scale: (typeof SCALES)[number]) {
  const [lo, hi] = regionBand(region);
  if (region.startsWith("within")) {
    const k = hi;
    return {
      label: `Within ${k} standard deviation${k === 1 ? "" : "s"} of the mean`,
      work: "the 68–95–99.7 rule",
      icon: "check" as const,
      explain: `The rule gives this share directly: ${WITHIN[k] / 100}% of values are within ${k} standard deviation${k === 1 ? "" : "s"} of the mean.`,
      visual: bellCurve(scale, [{ bands: [[lo, hi]], tone: "hit", text: bandShare }], "The share you want, shaded"),
    };
  }
  return sideStep(lo, hi, scale);
}

/** The question’s words for a region, given how to show a value and the verbs for each side. */
function regionWords(region: Region, at: (z: number) => string, words: { above: string; below: string; within: string }) {
  const k = Number(region.split("-")[1]);
  if (region.startsWith("above")) return `${words.above} ${at(k)}`;
  if (region.startsWith("below")) return `${words.below} ${at(-k)}`;
  return `${words.within} ${at(-k)} and ${at(k)}`;
}

/** Threshold values for the region, in the question’s units, so tests can work the z-scores out again. */
function regionValues(region: Region, mean: number, sd: number) {
  const k = Number(region.split("-")[1]);
  if (region.startsWith("above")) return { x1: mean + k * sd, x2: "none" };
  if (region.startsWith("below")) return { x1: mean - k * sd, x2: "none" };
  return { x1: mean - k * sd, x2: mean + k * sd };
}

/** Independent normals centred on 0: questions symmetry answers on its own. */
const SYMMETRY: {
  id: string;
  prompt: string;
  answer: [number, number];
  /** "flip both", "flip one", "swap": the move that pairs each outcome with its opposite. */
  move: "both" | "one" | "swap" | "product";
  claim?: string;
  opposite?: string;
  count?: number;
}[] = [
  ...[2, 3, 4].flatMap((k) =>
    [
      [1, 1],
      [1, 3],
    ].map(([sx, sy]) => ({
      id: `ratio-${k}-${sx}-${sy}`,
      prompt:
        sx === sy
          ? `X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What’s the chance Y > ${k}X?`
          : `X and Y are independent normal random numbers with mean 0. X has standard deviation ${sx} and Y has standard deviation ${sy}. What’s the chance Y > ${k}X?`,
      answer: [1, 2] as [number, number],
      move: "both" as const,
      claim: `Y > ${k}X`,
      opposite: `Y < ${k}X`,
    })),
  ),
  {
    id: "sum",
    prompt: "X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What’s the chance X + Y > 0?",
    answer: [1, 2],
    move: "both",
    claim: "X + Y > 0",
    opposite: "X + Y < 0",
  },
  {
    id: "same-sign",
    prompt: "X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What’s the chance X and Y have the same sign?",
    answer: [1, 2],
    move: "one",
    claim: "same sign",
    opposite: "opposite signs",
  },
  {
    id: "further",
    prompt: "X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What’s the chance Y is further from 0 than X is?",
    answer: [1, 2],
    move: "swap",
    claim: "Y further from 0",
    opposite: "X further from 0",
  },
  {
    id: "both-positive",
    prompt: "X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What’s the chance both are positive?",
    answer: [1, 4],
    move: "product",
    count: 2,
  },
  {
    id: "three-positive",
    prompt: "X, Y and Z are independent normal random numbers, each with mean 0 and standard deviation 1. What’s the chance all three are positive?",
    answer: [1, 8],
    move: "product",
    count: 3,
  },
];

function symmetry(params: { type: "symmetry"; variant: string }): QuantProblem {
  const variant = SYMMETRY.find((v) => v.id === params.variant)!;
  const answer = q(...variant.answer);
  if (variant.move === "product") {
    const n = variant.count!;
    const signs = n === 2 ? ["+ +", "+ −", "− +", "− −"] : ["+ + +", "+ + −", "+ − +", "+ − −", "− + +", "− + −", "− − +", "− − −"];
    return problem(
      `symmetry-${variant.id}`,
      variant.prompt,
      answer,
      "probability",
      [
        {
          label: "Each is positive with chance 1/2",
          work: "mean 0: as likely below 0 as above",
          result: "1/2",
          icon: "split",
          explain: "A normal with mean 0 is symmetric about 0, so it’s positive half the time.",
        },
        {
          label: `All ${n} positive`,
          work: Array.from({ length: n }, () => "1/2").join(" × "),
          icon: "multiply",
          explain: "They’re independent, so multiply the chances.",
          visual: {
            type: "bars",
            bars: signs.map((label, i) => ({ label, value: 1, tone: i === 0 ? "hit" : "muted", text: `1/${signs.length}` })),
            caption: "Every pattern of signs is equally likely",
          },
        },
      ],
      params,
    );
  }
  const move =
    variant.move === "both"
      ? { label: "Flip the sign of both", work: "(X, Y) → (−X, −Y)", explain: "With mean 0, each normal is as likely to be `-x` as `x`, so `(-X, -Y)` has exactly the same chances as `(X, Y)`." }
      : variant.move === "one"
        ? { label: "Flip the sign of Y", work: "(X, Y) → (X, −Y)", explain: "With mean 0, `Y` is as likely to be `-y` as `y`, so `(X, -Y)` has exactly the same chances as `(X, Y)`." }
        : { label: "Swap X and Y", work: "(X, Y) → (Y, X)", explain: "`X` and `Y` have the same distribution and are independent, so swapping them changes no chances." };
  return problem(
    `symmetry-${variant.id}`,
    variant.prompt,
    answer,
    "probability",
    [
      { ...move, result: "", icon: "flip" as const },
      {
        label: "That swaps the two cases",
        work: `${variant.claim} ↔ ${variant.opposite}`,
        result: "",
        icon: "split",
        explain: "The move turns every outcome where it happens into one where it doesn’t, and back. A tie has chance 0.",
      },
      {
        label: "Chance",
        work: "two equal halves",
        icon: "divide",
        explain: "So the two cases have the same chance, and between them they cover everything: half each.",
        visual: {
          type: "bars",
          bars: [
            { label: variant.claim!, value: 1, tone: "hit", text: "1/2" },
            { label: variant.opposite!, value: 1, tone: "alt", text: "1/2" },
          ],
          caption: "Each case has the same chance",
        },
      },
    ],
    params,
  );
}

/** Two independent normal parts of a total, with SDs from a Pythagorean triple. */
const SUM_SETTINGS: {
  id: string;
  means: [number, number];
  setup: (a: number, b: number) => string;
  show: (x: number) => string;
  /** "what share of commutes" */
  share: string;
  words: { above: string; below: string; within: string };
}[] = [
  {
    id: "commute",
    means: [30, 10],
    setup: (a, b) =>
      `A commute is a train ride, normal with mean 30 min and standard deviation ${a} min, then a walk, normal with mean 10 min and standard deviation ${b} min. The two are independent.`,
    show: (x) => `${x} min`,
    share: "what share of commutes",
    words: { above: "take longer than", below: "take less than", within: "take between" },
  },
  {
    id: "parcels",
    means: [200, 300],
    setup: (a, b) =>
      `A box holds two items: one weighs a normal amount with mean 200 g and standard deviation ${a} g, the other with mean 300 g and standard deviation ${b} g, independently.`,
    show: (x) => `${x} g`,
    share: "what share of boxes",
    words: { above: "weigh more than", below: "weigh less than", within: "weigh between" },
  },
  {
    id: "stocks",
    means: [0, 0],
    setup: (a, b) =>
      `You hold two independent stocks. Each day one makes a normal profit with mean $0 and standard deviation $${a}, the other with mean $0 and standard deviation $${b}.`,
    show: (x) => (x < 0 ? `−$${-x}` : `$${x}`),
    share: "on what share of days does your total profit",
    words: { above: "come to more than", below: "come to less than", within: "land between" },
  },
];

const TRIPLES: [number, number, number][] = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]];

function sumOfNormals(params: { type: "sum"; setting: string; a: number; b: number; region: Region }): QuantProblem {
  const setting = SUM_SETTINGS.find((s) => s.id === params.setting)!;
  const { a, b, region } = params;
  const c = Math.round(Math.hypot(a, b));
  const mean = setting.means[0] + setting.means[1];
  const scale = scaleOf(mean, c, setting.show);
  const at = (z: number) => setting.show(mean + z * c);
  const [lo, hi] = regionBand(region);
  const k = Number(region.split("-")[1]);
  const edgeValue = region.startsWith("below") ? mean - k * c : mean + k * c;
  return problem(
    `sum-${setting.id}-${a}-${b}-${region}`,
    `${setting.setup(a, b)} ${RULE}, ${setting.share} ${regionWords(region, at, setting.words)}?`,
    shareBetween(lo, hi),
    "percent",
    [
      {
        label: "Means add",
        work: `${setting.means[0]} + ${setting.means[1]}`,
        result: `${mean}`,
        icon: "add",
        explain: "The average of a total is the averages of its parts added up.",
      },
      {
        label: "SDs combine as √(a² + b²)",
        work: `√(${a}² + ${b}²) = √${a * a + b * b}`,
        result: `${c}`,
        icon: "idea",
        explain: "For independent parts the variances add, so SDs of `a` and `b` give the total an SD of `\\sqrt{a^2 + b^2}`, which is less than `a + b`.",
      },
      {
        label: "How far out, in standard deviations",
        work: `(${edgeValue} − ${mean}) ÷ ${c}`,
        result: `${region.startsWith("below") ? -k : k}`,
        icon: "divide",
        explain: "Measure the distance from the total’s mean in the total’s standard deviations.",
        visual: bellCurve(scale, [{ bands: [[lo, hi]], tone: "hit" }], "The total’s bell curve"),
      },
      ruleStep(region, scale),
    ],
    { ...params, m1: setting.means[0], m2: setting.means[1], ...regionValues(region, mean, c) },
  );
}

/** Settings for the average of n independent normal values. */
const AVERAGE_SETTINGS: {
  id: string;
  mean: number;
  setup: (sd: number, n: number) => string;
  show: (x: number) => string;
  share: string;
  words: { above: string; below: string; within: string };
}[] = [
  {
    id: "bags",
    mean: 500,
    setup: (sd, n) => `A machine fills bags of flour with weights that are normal with mean 500 g and standard deviation ${sd} g. A box holds ${n} bags.`,
    show: (x) => `${x} g`,
    share: "what share of boxes have an average bag weight",
    words: { above: "above", below: "below", within: "between" },
  },
  {
    id: "trades",
    mean: 20,
    setup: (sd, n) => `A trader’s profit per trade is normal with mean $20 and standard deviation $${sd}, independently. They make ${n} trades a day.`,
    show: (x) => (x < 0 ? `−$${-x}` : `$${x}`),
    share: "on what share of days is the average profit per trade",
    words: { above: "above", below: "below", within: "between" },
  },
  {
    id: "commute",
    mean: 40,
    setup: (sd, n) => `A daily commute is normal with mean 40 min and standard deviation ${sd} min, independently each day. Look at the average over ${n} days.`,
    show: (x) => `${x} min`,
    share: "what share of the time is that average",
    words: { above: "above", below: "below", within: "between" },
  },
];

function averageOfNormals(params: { type: "average"; setting: string; sd: number; n: number; region: Region }): QuantProblem {
  const setting = AVERAGE_SETTINGS.find((s) => s.id === params.setting)!;
  const { sd, n, region } = params;
  const root = Math.round(Math.sqrt(n));
  const s = sd / root;
  const scale = scaleOf(setting.mean, s, setting.show);
  const at = (z: number) => setting.show(setting.mean + z * s);
  const [lo, hi] = regionBand(region);
  const k = Number(region.split("-")[1]);
  const edgeValue = region.startsWith("below") ? setting.mean - k * s : setting.mean + k * s;
  return problem(
    `average-${setting.id}-${sd}-${n}-${region}`,
    `${setting.setup(sd, n)} ${RULE}, ${setting.share} ${regionWords(region, at, setting.words)}?`,
    shareBetween(lo, hi),
    "percent",
    [
      {
        label: "SD of the average",
        work: `${sd} ÷ √${n}`,
        result: `${s}`,
        icon: "divide",
        explain: `An average of ${n} independent values keeps the same mean, but its SD shrinks by a factor of \`\\sqrt{${n}}\`: the ups and downs partly cancel out.`,
      },
      {
        label: "How far out, in standard deviations",
        work: `(${edgeValue} − ${setting.mean}) ÷ ${s}`,
        result: `${region.startsWith("below") ? -k : k}`,
        icon: "divide",
        explain: "Measure the distance from the mean in the average’s standard deviations, not a single value’s.",
        visual: bellCurve(scale, [{ bands: [[lo, hi]], tone: "hit" }], "The average’s bell curve"),
      },
      ruleStep(region, scale),
    ],
    { ...params, mean: setting.mean, ...regionValues(region, setting.mean, s) },
  );
}

/** Sizes whose square root is whole, and the averaged SD they give with a whole-number value SD. */
const AVERAGE_SIZES = [4, 9, 16, 25, 36];

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

// ─── Mock questions ──────────────────────────────────────────────────────────────────────
// The mock test’s own question types: each mirrors a practice type above, in a setting
// practice never uses.

/** Settings for the mock’s “exactly k” questions. */
const MOCK_TRIALS: {
  id: string;
  /** One try, for figure labels: "Spin". */
  one: string;
  chance: [number, number];
  noun: string;
  minTries: number;
  maxTries: number;
  prompt: (n: number, k: number) => string;
}[] = [
  {
    id: "spinner",
    one: "Spin",
    chance: [1, 5],
    noun: "spins",
    minTries: 3,
    maxTries: 6,
    prompt: (n, k) => `A spinner has 5 equal sectors, one of them red. You spin it ${n} times. What’s the chance it stops on red exactly ${timesWord(k)}?`,
  },
  {
    id: "seeds",
    one: "Seed",
    chance: [3, 4],
    noun: "seeds",
    minTries: 3,
    maxTries: 6,
    prompt: (n, k) =>
      `Each seed in a packet sprouts with chance 3/4, independently of the rest. You plant ${n} of them. What’s the chance exactly ${k} ${k === 1 ? "sprouts" : "sprout"}?`,
  },
  {
    id: "drum",
    one: "Draw",
    chance: [3, 10],
    noun: "draws",
    minTries: 3,
    maxTries: 6,
    prompt: (n, k) =>
      `A drum holds 10 balls numbered 1 to 10. You draw one at random, note it and put it back, ${n} times in all. What’s the chance exactly ${k} of the draws ${k === 1 ? "shows" : "show"} an 8, 9 or 10?`,
  },
  {
    id: "trades",
    one: "Trade",
    chance: [3, 5],
    noun: "trades",
    minTries: 3,
    maxTries: 5,
    prompt: (n, k) =>
      `A strategy’s trades each make money with chance 60%, independently. Over its next ${n} trades, what’s the chance exactly ${k} ${k === 1 ? "makes" : "make"} money?`,
  },
];

function mockExactly(params: { type: "mock-exactly"; setting: string; tries: number; successes: number }): QuantProblem {
  const setting = MOCK_TRIALS.find((s) => s.id === params.setting)!;
  const { tries: n, successes: k } = params;
  const p = q(...setting.chance);
  const miss = sub(q(1), p);
  const ways = choose(n, k);
  const oneOrder = mul(pow(p, k), pow(miss, n - k));
  return problem(
    `mock-exactly-${setting.id}-${n}-${k}`,
    setting.prompt(n, k),
    exactlyChance(n, k, p),
    "probability",
    [
      {
        label: `Which ${k} of the ${n} ${setting.noun}`,
        work: `C(${n}, ${k})`,
        result: `${ways}`,
        icon: "count",
        explain: `The successes can fall on any ${k} of the ${n} ${setting.noun}. Choosing which gives \`\\binom{${n}}{${k}}\` orders.`,
        visual: {
          type: "slots",
          op: "×",
          slots: Array.from({ length: n }, (_, i) => ({
            label: `${setting.one} ${i + 1}`,
            value: formatFraction(i < k ? p : miss),
            tone: i < k ? "hit" : "muted",
          })),
          result: formatFraction(oneOrder),
          caption: `One order: ${k} ${k === 1 ? "success" : "successes"} first, then ${n - k} ${n - k === 1 ? "miss" : "misses"}`,
        },
      },
      {
        label: "Chance of one order",
        work: timesTerms(power(p, k), power(miss, n - k)),
        result: formatFraction(oneOrder),
        icon: "multiply",
        explain: `Each of the ${setting.noun} is independent, so multiply along the order: ${formatFraction(p)} for a success, ${formatFraction(miss)} for a miss.`,
      },
      {
        label: `Exactly ${k}`,
        work: `${ways} × ${formatFraction(oneOrder)}`,
        icon: "multiply",
        explain: "No two orders can both happen, and each has the same chance, so multiply that chance by the number of orders.",
        visual: distributionBars(n, p, [k], setting.noun),
      },
    ],
    params,
    distributionBars(n, p, [k], setting.noun, false),
  );
}

/** Three independent voters, decided by majority: forecasting models or safety sensors. */
const MOCK_PANELS: {
  id: string;
  /** "models", for labels. */
  noun: string;
  prompt: (pct: string, third: "same" | "random") => string;
}[] = [
  {
    id: "models",
    noun: "models",
    prompt: (pct, third) =>
      third === "same"
        ? `You go with the majority of three weather models on whether it will rain tomorrow. Each model calls it correctly with chance ${pct}, independently. What’s the chance the majority call is correct?`
        : `You go with the majority of three weather models on whether it will rain tomorrow. Two of them call it correctly with chance ${pct} each, independently, and the third is no better than a coin toss. What’s the chance the majority call is correct?`,
  },
  {
    id: "sensors",
    noun: "sensors",
    prompt: (pct, third) =>
      third === "same"
        ? `A safety system acts on the majority reading of three sensors. Each sensor reads correctly with chance ${pct}, independently of the others. What’s the chance the system acts on a correct reading?`
        : `A safety system acts on the majority reading of three sensors. Two read correctly with chance ${pct} each, independently, and the third is faulty and reads at random, right half the time. What’s the chance the system acts on a correct reading?`,
  },
];

function mockMajority(params: { type: "mock-majority"; setting: string; third: "same" | "random"; percent: number }): QuantProblem {
  const setting = MOCK_PANELS.find((s) => s.id === params.setting)!;
  const { third, percent } = params;
  const p = q(percent, 100);
  const miss = sub(q(1), p);
  const pct = `${percent}%`;
  const missPct = formatPercent(miss);
  const prompt = setting.prompt(pct, third);
  const key = `mock-majority-${setting.id}-${third}-${percent}`;
  if (third === "random") {
    const both = mul(p, p);
    const oneRight = mul(q(2), mul(p, miss));
    const thirdAgrees = div(oneRight, q(2));
    return problem(
      key,
      prompt,
      add(both, thirdAgrees),
      "percent",
      [
        {
          label: "Both reliable ones right",
          work: `${pct} × ${pct}`,
          result: formatPercent(both),
          icon: "multiply",
          explain: "Two right answers out of three are already a majority, so the random one doesn’t matter here.",
        },
        {
          label: "Exactly one reliable one right",
          work: `2 × ${pct} × ${missPct}`,
          result: formatPercent(oneRight),
          icon: "multiply",
          explain: `Either of the two reliable ${setting.noun} can be the right one, so there are 2 ways. Now the random one breaks the tie.`,
        },
        {
          label: "…and the random one agrees",
          work: `${formatPercent(oneRight)} × 1/2`,
          result: formatPercent(thirdAgrees),
          icon: "flip",
          explain: "The random one is right half the time, whatever the others say.",
        },
        {
          label: "Majority right",
          work: `${formatPercent(both)} + ${formatPercent(thirdAgrees)}`,
          icon: "add",
          explain: `These are the only two ways to a right majority, and they can’t both happen, so add. It matches one reliable ${setting.noun.slice(0, -1)} on its own.`,
        },
      ],
      params,
      {
        type: "tree",
        root: {
          label: `Reliable ${setting.noun}`,
          children: [
            { label: "Both right", edge: formatPercent(both), tone: "win" },
            {
              label: "One right",
              edge: formatPercent(oneRight),
              tone: "alt",
              children: [
                { label: "Third agrees", edge: "1/2", tone: "win" },
                { label: "Third disagrees", edge: "1/2", tone: "lose" },
              ],
            },
            { label: "Both wrong", edge: formatPercent(mul(miss, miss)), tone: "lose" },
          ],
        },
        caption: "The majority is right on the green branches",
      },
    );
  }
  const all = pow(p, 3);
  const two = mul(q(3), mul(pow(p, 2), miss));
  return problem(
    key,
    prompt,
    add(all, two),
    "percent",
    [
      {
        label: "All three right",
        work: `${pct}³`,
        result: formatPercent(all),
        icon: "multiply",
        explain: `The ${setting.noun} are independent, so the chance all three are right is the product.`,
      },
      {
        label: "Exactly two right",
        work: `3 × ${pct}² × ${missPct}`,
        result: formatPercent(two),
        icon: "multiply",
        explain: "The one that’s wrong can be any of the 3, and each of those cases has the same chance.",
      },
      {
        label: "Majority right",
        work: `${formatPercent(all)} + ${formatPercent(two)}`,
        icon: "add",
        explain: "Two or three right make a right majority. The cases don’t overlap, so add them.",
      },
    ],
    params,
    distributionBars(3, p, [2, 3], setting.noun, false),
  );
}

/** Settings for the mock’s “first success on try k” questions. */
const MOCK_FIRSTS: {
  id: string;
  chance: [number, number];
  /** One try, for figure labels: "Call". */
  one: string;
  /** The last try it can reasonably ask about. */
  maxOn: number;
  prompt: (on: number) => string;
}[] = [
  {
    id: "calls",
    chance: [1, 4],
    one: "Call",
    maxOn: 5,
    prompt: (on) =>
      `A salesperson rings one customer after another until someone buys. Each call ends in a sale with chance 1/4, independently. What’s the chance the ${ORDINALS[on]} call is the first to make a sale?`,
  },
  {
    id: "spinner",
    chance: [1, 3],
    one: "Spin",
    maxOn: 5,
    prompt: (on) =>
      `A spinner has three equal sectors: red, green and blue. You spin it until it stops on red. What’s the chance that takes exactly ${on} spins?`,
  },
  {
    id: "archer",
    chance: [2, 5],
    one: "Arrow",
    maxOn: 4,
    prompt: (on) =>
      `An archer hits the bullseye with chance 2/5 on each arrow, independently, and stops at her first bullseye. What’s the chance she shoots exactly ${on} arrows?`,
  },
];

function mockFirstOn(params: { type: "mock-first-on"; setting: string; on: number }): QuantProblem {
  const setting = MOCK_FIRSTS.find((s) => s.id === params.setting)!;
  const chance = q(...setting.chance);
  const miss = sub(q(1), chance);
  const { on } = params;
  const tries = (withHit: boolean): QuantVisual => ({
    type: "slots",
    op: "×",
    slots: Array.from({ length: withHit ? on : on - 1 }, (_, i) => ({
      label: `${setting.one} ${i + 1}`,
      value: formatFraction(i === on - 1 ? chance : miss),
      tone: i === on - 1 ? "hit" : "muted",
    })),
    result: formatFraction(withHit ? mul(pow(miss, on - 1), chance) : pow(miss, on - 1)),
    caption: withHit ? `${on - 1} ${on - 1 === 1 ? "miss" : "misses"}, then a success` : `${on - 1} ${on - 1 === 1 ? "miss" : "misses"} in a row`,
  });
  return problem(
    `mock-first-on-${setting.id}-${on}`,
    setting.prompt(on),
    mul(pow(miss, on - 1), chance),
    "probability",
    [
      {
        label: `${on - 1} ${on - 1 === 1 ? "miss" : "misses"} first`,
        work: power(miss, on - 1),
        result: formatFraction(pow(miss, on - 1)),
        icon: "multiply",
        explain: `${setting.one} ${on} can only be the first success if every one before it fails. Each fails with chance ${formatFraction(miss)}, independently, so multiply.`,
        visual: tries(false),
      },
      {
        label: `Then ${setting.one.toLowerCase()} ${on} succeeds`,
        work: `${formatFraction(pow(miss, on - 1))} × ${formatFraction(chance)}`,
        icon: "target",
        explain: `Then ${setting.one.toLowerCase()} ${on} has to work, with chance ${formatFraction(chance)}.`,
        visual: tries(true),
      },
    ],
    params,
    firstSuccessBars(chance, on, Math.max(6, on)),
  );
}

/** Repeated draws with two colours, until both have come up. */
const MOCK_COLOURS: { id: string; prompt: (red: number, blue: number) => string; one: string; tries: string }[] = [
  {
    id: "bag",
    one: "draw",
    tries: "draws",
    prompt: (red, blue) =>
      `A bag holds ${red} red and ${blue} blue ${red + blue === 2 ? "marble" : "marbles"}. You draw one at random, note its colour and put it back, until you’ve drawn both colours. How many draws do you expect to make?`,
  },
  {
    id: "spinner",
    one: "spin",
    tries: "spins",
    prompt: (red, blue) =>
      `A spinner has ${red} red and ${blue} blue sectors, all the same size. You spin it until it has stopped on each colour at least once. How many spins do you expect?`,
  },
];

function mockColours(params: { type: "mock-colours"; setting: string; red: number; blue: number }): QuantProblem {
  const setting = MOCK_COLOURS.find((s) => s.id === params.setting)!;
  const { red, blue } = params;
  const pr = q(red, red + blue);
  const pb = q(blue, red + blue);
  const afterFirst = add(mul(pr, div(q(1), pb)), mul(pb, div(q(1), pr)));
  return problem(
    `mock-colours-${setting.id}-${red}-${blue}`,
    setting.prompt(red, blue),
    add(q(1), afterFirst),
    "number",
    [
      {
        label: `The first ${setting.one} shows a colour`,
        work: `1 ${setting.one}`,
        result: "",
        icon: "flip",
        explain: "Whatever comes up first, one colour is now seen. From here you’re waiting only for the other one.",
      },
      {
        label: "Then wait for the other colour",
        work: `${formatFraction(pr)} × ${formatFraction(div(q(1), pb))} + ${formatFraction(pb)} × ${formatFraction(div(q(1), pr))}`,
        result: formatFraction(afterFirst),
        icon: "split",
        explain: "After a red, waiting for blue takes `1/P(\\text{blue})` more on average, and after a blue, `1/P(\\text{red})`. Weight each by how likely that first colour is.",
        visual: {
          type: "tree",
          root: {
            label: "First colour",
            children: [
              {
                label: "Red",
                edge: formatFraction(pr),
                tone: "alt",
                children: [{ label: `${formatFraction(div(q(1), pb))} more`, edge: "wait for blue", tone: "hit" }],
              },
              {
                label: "Blue",
                edge: formatFraction(pb),
                tone: "alt",
                children: [{ label: `${formatFraction(div(q(1), pr))} more`, edge: "wait for red", tone: "hit" }],
              },
            ],
          },
          caption: "The wait for the second colour, by which came first",
        },
      },
      {
        label: `Average ${setting.tries}`,
        work: `1 + ${formatFraction(afterFirst)}`,
        icon: "add",
        explain: `Add the first ${setting.one} to the average wait for the other colour.`,
      },
    ],
    params,
    setting.id === "bag"
      ? {
          type: "marbles",
          groups: [
            { count: red, tone: "hit", label: "Red" },
            { count: blue, tone: "alt", label: "Blue" },
          ],
          caption: "Each marble goes back after it’s drawn",
        }
      : {
          type: "bars",
          bars: [
            { label: "Red", value: red, tone: "hit", text: `${red} of ${red + blue}` },
            { label: "Blue", value: blue, tone: "alt", text: `${blue} of ${red + blue}` },
          ],
          caption: "The spinner’s sectors, by colour",
        },
  );
}

/** Normal measurements for the mock’s “between two values” questions. */
const MOCK_SCALES: { id: string; setup: string; mean: number; sd: number; show: (x: number) => string; share: string }[] = [
  {
    id: "battery",
    setup: "The battery in a phone model lasts a normal number of hours, with mean 20 hours and standard deviation 2 hours.",
    mean: 20,
    sd: 2,
    show: (x) => `${x} hours`,
    share: "about what share of phones last",
  },
  {
    id: "coffee",
    setup: "A coffee machine pours cups whose volume is normal, with mean 250 ml and standard deviation 5 ml.",
    mean: 250,
    sd: 5,
    show: (x) => `${x} ml`,
    share: "about what share of cups hold",
  },
  {
    id: "pizza",
    setup: "Pizza delivery times in a city are normal, with mean 30 min and standard deviation 6 min.",
    mean: 30,
    sd: 6,
    show: (x) => `${x} min`,
    share: "about what share of deliveries take",
  },
  {
    id: "apples",
    setup: "Apples from an orchard have normal weights, with mean 150 g and standard deviation 20 g.",
    mean: 150,
    sd: 20,
    show: (x) => `${x} g`,
    share: "about what share of the apples weigh",
  },
];

function mockBetween(params: { type: "mock-between"; scale: string; lo: number; hi: number }): QuantProblem {
  const setting = MOCK_SCALES.find((s) => s.id === params.scale)!;
  const scale = scaleOf(setting.mean, setting.sd, setting.show);
  const at = (z: number) => setting.show(setting.mean + z * setting.sd);
  const { lo, hi } = params;
  const pieces: Band[] = lo < 0 && hi > 0 ? [[lo, 0], [0, hi]] : [[lo, hi]];
  const steps: (Omit<QuantProblem["steps"][number], "result"> & { result?: string })[] = pieces.map(([a, b]) => sideStep(a, b, scale));
  if (pieces.length > 1) {
    steps.push({
      label: "Total",
      work: steps.map((s) => s.result).join(" + "),
      result: "",
      icon: "add",
      explain: "One piece is below the mean and the other above it, so they don’t overlap. Add them.",
      visual: bellCurve(scale, [{ bands: pieces, tone: "hit", text: bandShare }], "Both pieces together"),
    });
  }
  return problem(
    `mock-between-${setting.id}-${lo}-${hi}`,
    `${setting.setup} By the 68–95–99.7 rule, ${setting.share} between ${at(lo)} and ${at(hi)}?`,
    shareBetween(lo, hi),
    "percent",
    steps,
    { ...params, mean: setting.mean, sd: setting.sd, x1: setting.mean + lo * setting.sd, x2: setting.mean + hi * setting.sd },
    bellCurve(scale, [{ bands: [[lo, hi]], tone: "hit" }], `Between ${at(lo)} and ${at(hi)}`),
  );
}

/** Two independent normal parts of a total, for the mock. */
const MOCK_SUM_SETTINGS: (typeof SUM_SETTINGS)[number][] = [
  {
    id: "relay",
    means: [50, 52],
    setup: (a, b) =>
      `A relay team has two runners. The first leg takes a normal time with mean 50 s and standard deviation ${a} s. The second, independently, has mean 52 s and standard deviation ${b} s.`,
    show: (x) => `${x} s`,
    share: "in what share of races does the team",
    words: { above: "take longer than", below: "finish in under", within: "finish between" },
  },
  {
    id: "pumps",
    means: [300, 200],
    setup: (a, b) =>
      `Two pumps fill a tank, independently. In an hour the first delivers a normal volume with mean 300 L and standard deviation ${a} L, and the second a normal volume with mean 200 L and standard deviation ${b} L.`,
    show: (x) => `${x} L`,
    share: "in what share of hours does the tank take in",
    words: { above: "more than", below: "less than", within: "between" },
  },
];

function mockSum(params: { type: "mock-sum"; setting: string; a: number; b: number; region: Region }): QuantProblem {
  const setting = MOCK_SUM_SETTINGS.find((s) => s.id === params.setting)!;
  const { a, b, region } = params;
  const c = Math.round(Math.hypot(a, b));
  const mean = setting.means[0] + setting.means[1];
  const scale = scaleOf(mean, c, setting.show);
  const at = (z: number) => setting.show(mean + z * c);
  const [lo, hi] = regionBand(region);
  const k = Number(region.split("-")[1]);
  const edgeValue = region.startsWith("below") ? mean - k * c : mean + k * c;
  return problem(
    `mock-sum-${setting.id}-${a}-${b}-${region}`,
    `${setting.setup(a, b)} By the 68–95–99.7 rule, ${setting.share} ${regionWords(region, at, setting.words)}?`,
    shareBetween(lo, hi),
    "percent",
    [
      {
        label: "Mean of the total",
        work: `${setting.means[0]} + ${setting.means[1]}`,
        result: `${mean}`,
        icon: "add",
        explain: "The mean of a total is the sum of the parts’ means.",
      },
      {
        label: "SD of the total",
        work: `√(${a}² + ${b}²) = √${a * a + b * b}`,
        result: `${c}`,
        icon: "idea",
        explain: "Variances of independent parts add, so the SDs combine as `\\sqrt{a^2 + b^2}`. That’s smaller than `a + b`, because the parts partly cancel.",
      },
      {
        label: "Distance in standard deviations",
        work: `(${edgeValue} − ${mean}) ÷ ${c}`,
        result: `${region.startsWith("below") ? -k : k}`,
        icon: "divide",
        explain: "Measure how far the cut-off is from the total’s mean, in the total’s SDs.",
        visual: bellCurve(scale, [{ bands: [[lo, hi]], tone: "hit" }], "The total’s bell curve"),
      },
      ruleStep(region, scale),
    ],
    { ...params, m1: setting.means[0], m2: setting.means[1], ...regionValues(region, mean, c) },
  );
}

export const DISTRIBUTIONS_LESSONS: QuantLessonDef[] = [
  {
    id: "binomial",
    title: "Binomial distribution",
    benefit: "Find the chance of k wins in n tries",
    summary: "The chance of exactly k successes in n independent tries: count the orders with C(n, k), then multiply by the chance of one order.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: [
          "You roll a die 4 times. What’s the chance you get exactly two sixes?",
          "Start smaller. Before counting every way it can happen, work out the chance of one particular way: six, six, then two rolls that aren’t sixes.",
        ],
      },
      {
        type: "check",
        prompt: "What’s the chance of exactly this sequence: six, six, not six, not six?",
        choices: ["(1/6)² × (5/6)²", "2 × 1/6", "(1/6)²", "6 × (1/6)²"],
        answer: 0,
        explain:
          "The rolls don’t affect each other, so multiply 1/6 for each six by 5/6 for each roll that isn’t one: {{1/6 × 1/6 × 5/6 × 5/6 = 25/1296 ≈ 1.9%}} The choice (1/6)² leaves out the two rolls that must miss.",
      },
      {
        type: "story",
        heading: "From one order to all of them",
        beats: [
          {
            text: "Six, six, other, other has chance {{1/6 × 1/6 × 5/6 × 5/6 = 25/1296}}",
            visual: {
              type: "slots",
              slots: [
                { label: "Six", value: "1/6", tone: "hit" },
                { label: "Six", value: "1/6", tone: "hit" },
                { label: "Not six", value: "5/6" },
                { label: "Not six", value: "5/6" },
              ],
              op: "×",
              result: "25/1296",
            },
          },
          {
            text: "Six, other, six, other uses the same four numbers in a different order, so it has the same chance. Every order with two sixes does.",
            visual: {
              type: "slots",
              slots: [
                { label: "Six", value: "1/6", tone: "hit" },
                { label: "Not six", value: "5/6" },
                { label: "Six", value: "1/6", tone: "hit" },
                { label: "Not six", value: "5/6" },
              ],
              op: "×",
              result: "25/1296",
            },
          },
          {
            text: "The two sixes can be on any 2 of the 4 rolls. There are `\\binom{4}{2} = 6` ways to choose which.",
            visual: {
              type: "bars",
              bars: [
                { label: "1, 2", value: 1, tone: "hit" },
                { label: "1, 3", value: 1, tone: "hit" },
                { label: "1, 4", value: 1, tone: "hit" },
                { label: "2, 3", value: 1, tone: "hit" },
                { label: "2, 4", value: 1, tone: "hit" },
                { label: "3, 4", value: 1, tone: "hit" },
              ],
              caption: "Which two rolls are the sixes. Each order has chance 25/1296",
            },
          },
          {
            text: "The six orders can’t happen together, so add their chances: {{6 × 25/1296 = 25/216 ≈ 11.6%}}",
            visual: {
              type: "bars",
              bars: [
                { label: "0", value: 0.4823, tone: "muted" },
                { label: "1", value: 0.3858, tone: "muted" },
                { label: "2", value: 0.1157, tone: "hit", text: "11.6%" },
                { label: "3", value: 0.0154, tone: "muted" },
                { label: "4", value: 0.0008, tone: "muted" },
              ],
              caption: "Chance of each number of sixes in 4 rolls",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why it works",
        body: [
          "Every roll has the same chance of a six, and no roll changes the next. So any order with `k` sixes and `n - k` other numbers has the same chance, `p^k (1-p)^{n-k}`, and you only have to count the orders.",
          "The number of successes in tries like these has a binomial distribution. Here `n` is the number of tries and `p` is the chance of success on each one.",
        ],
      },
      {
        type: "rule",
        name: "The binomial distribution",
        lines: [
          { lead: "Let `X` be the number of successes in `n` independent trials, each a success with probability `p`. Then `X \\sim \\operatorname{Bin}(n, p)`, and for `k = 0, 1, \\dots, n`,", tex: "P(X = k) = \\binom{n}{k}\\, p^k (1-p)^{n-k}" },
          { lead: "Its mean and variance are", tex: "\\begin{aligned} E[X] &= np \\\\ \\operatorname{Var}(X) &= np(1-p) \\end{aligned}" },
        ],
        where: ["`\\binom{n}{k}` counts the ways to choose which `k` trials are the successes", "`p^k (1-p)^{n-k}` is the probability of any one of those orders"],
        plain: "Count the orders, then multiply by the chance of one order.",
        note: "For two sixes in four rolls, `n = 4`, `k = 2` and `p = 1/6`: {{P(X = 2) = C(4, 2) × (1/6)² × (5/6)² = 25/216}} For “at least `k`”, add `P(X = j)` for every `j` from `k` up to `n`.",
      },
      {
        type: "check",
        prompt: "Same 4 rolls. What’s the chance of at least one six?",
        choices: ["1 − (5/6)⁴ ≈ 52%", "4 × 1/6 = 2/3", "`\\binom{4}{1} \\times 1/6 \\times (5/6)^3 \\approx 39\\%`", "1/6"],
        answer: 0,
        explain:
          "“At least one” is every count except zero, so take the chance of no sixes away from 1: {{1 − (5/6)⁴ = 1 − 625/1296 ≈ 52%}} The 39% choice is the chance of exactly one six. Adding 4 × 1/6 counts a roll with two sixes twice.",
      },
      {
        type: "example",
        lead: "Here the chance each day is 80%, and the question asks for at least 3 sunny days out of 4, so you add two exact chances.",
      },
      {
        type: "trap",
        body: "Leaving out `\\binom{n}{k}`. This is the chance of one order, such as six, six, other, other: {{(1/6)² × (5/6)² ≈ 1.9%}} Two sixes can come in 6 different orders, so the answer is 6 times that.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "There’s a fixed number of flips, rolls, shots or days, each with the same chance",
          "The question asks for exactly `k`, at least `k` or at most `k` successes",
          "Nothing about one try changes the chance on the next",
        ],
      },
    ],
    targetSeconds: 45,
    example: binomial({ trial: "sunny", tries: 4, successes: 3, ask: "at-least" }),
    families: [
      { id: "exactly", title: "Exactly k successes in n tries", generate: (random) => randomBinomialOf(random, "exactly") },
      { id: "at-least", title: "At least k successes in n tries", generate: (random) => randomBinomialOf(random, "at-least") },
      {
        id: "odd-heads",
        title: "An odd number of heads",
        generate: (random) => {
          const [headsN, headsD] = pick(random, [[1, 2], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]] as const);
          return oddHeads({ type: "odd", flips: int(random, 2, 6), headsN, headsD });
        },
      },
      {
        id: "equal-groups",
        title: "Equal heads in two groups of flips",
        generate: (random) => {
          const first = int(random, 2, 4);
          return equalGroups({ type: "groups", first, last: int(random, 1, first) });
        },
      },
      {
        id: "majority-vote",
        title: "A majority vote of three",
        generate: (random) =>
          majorityVote({ type: "vote", jury: random() < 0.5 ? "coin" : "three", percent: pick(random, [55, 60, 65, 70, 75, 80, 85, 90]) }),
      },
    ],
    mockFamilies: [
      {
        id: "mock-exactly",
        practice: "exactly",
        title: "Exactly k of n independent tries",
        generate: (random) => {
          for (;;) {
            const setting = pick(random, MOCK_TRIALS);
            const n = int(random, setting.minTries, setting.maxTries);
            const made = mockExactly({ type: "mock-exactly", setting: setting.id, tries: n, successes: int(random, 1, n - 1) });
            const v = value(made.answer);
            if (v >= 0.01 && v <= 0.99) return made;
          }
        },
      },
      {
        id: "mock-majority",
        practice: "majority-vote",
        title: "The majority of three models or sensors",
        generate: (random) =>
          mockMajority({
            type: "mock-majority",
            setting: pick(random, MOCK_PANELS).id,
            third: random() < 0.5 ? "random" : "same",
            percent: pick(random, [55, 60, 65, 70, 75, 80, 85, 90, 95]),
          }),
      },
    ],
  },
  {
    id: "geometric",
    title: "Geometric distribution",
    benefit: "Find how long until the first success",
    summary: "How long you wait for the first success when each try has the same chance: the chance it comes on try k, and why the average wait is 1 ÷ p.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: [
          "You roll a die until a 6 comes up, then stop. What’s the chance the first 6 comes on the fourth roll? And how many rolls do you need on average?",
          "In the binomial lesson the number of tries was fixed and the number of successes varied. Here it’s the other way round: you stop at the first success, and the number of tries varies.",
        ],
      },
      {
        type: "check",
        prompt: "What has to happen for the first 6 to come on roll 4?",
        choices: ["Rolls 1 to 3 all miss, then roll 4 is a 6", "Roll 4 is a 6", "At least one of rolls 1 to 4 is a 6", "Exactly one of rolls 1 to 4 is a 6"],
        answer: 0,
        explain:
          "“First” means no 6 before it. Rolls 1, 2 and 3 each miss with chance 5/6, and roll 4 hits with chance 1/6: {{(5/6)³ × 1/6 = 125/1296 ≈ 9.6%}}",
      },
      {
        type: "story",
        heading: "When the first 6 comes",
        beats: [
          {
            text: "The first 6 is on roll 1 with chance 1/6, about 16.7%.",
            visual: {
              type: "bars",
              bars: [
                { label: "1", value: 0.1667, tone: "hit", text: "1/6" },
                { label: "2", value: 0.1389, tone: "muted" },
                { label: "3", value: 0.1157, tone: "muted" },
                { label: "4", value: 0.0965, tone: "muted" },
                { label: "5", value: 0.0804, tone: "muted" },
                { label: "6", value: 0.067, tone: "muted" },
                { label: "7", value: 0.0558, tone: "muted" },
                { label: "8", value: 0.0465, tone: "muted" },
                { label: "9", value: 0.0388, tone: "muted" },
                { label: "10", value: 0.0323, tone: "muted" },
              ],
              caption: "Chance the first 6 is on roll k",
            },
          },
          {
            text: "For roll 2 you need a miss, then a 6: 5/6 × 1/6 = 5/36. Each roll after that needs one more miss first, so each bar is 5/6 of the one before it.",
            visual: {
              type: "bars",
              bars: [
                { label: "1", value: 0.1667, tone: "muted" },
                { label: "2", value: 0.1389, tone: "hit", text: "5/36" },
                { label: "3", value: 0.1157, tone: "muted" },
                { label: "4", value: 0.0965, tone: "muted" },
                { label: "5", value: 0.0804, tone: "muted" },
                { label: "6", value: 0.067, tone: "muted" },
                { label: "7", value: 0.0558, tone: "muted" },
                { label: "8", value: 0.0465, tone: "muted" },
                { label: "9", value: 0.0388, tone: "muted" },
                { label: "10", value: 0.0323, tone: "muted" },
              ],
              caption: "Chance the first 6 is on roll k",
            },
          },
          {
            text: "Roll 4 needs three misses and then a 6: {{(5/6)³ × 1/6 ≈ 9.6%}} The bars keep shrinking but never reach zero, and all of them together add up to 1.",
            visual: {
              type: "bars",
              bars: [
                { label: "1", value: 0.1667, tone: "muted" },
                { label: "2", value: 0.1389, tone: "muted" },
                { label: "3", value: 0.1157, tone: "muted" },
                { label: "4", value: 0.0965, tone: "hit", text: "9.6%" },
                { label: "5", value: 0.0804, tone: "muted" },
                { label: "6", value: 0.067, tone: "muted" },
                { label: "7", value: 0.0558, tone: "muted" },
                { label: "8", value: 0.0465, tone: "muted" },
                { label: "9", value: 0.0388, tone: "muted" },
                { label: "10", value: 0.0323, tone: "muted" },
              ],
              caption: "Chance the first 6 is on roll k",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "The average wait",
        body: [
          "Call the average number of rolls `E`, and look at the first roll. With chance 1/6 it’s a 6 and you’re done after 1 roll. With chance 5/6 it isn’t, and you’ve used one roll and are back where you started, still expecting `E` more.",
          "That gives an equation for `E`: {{E = 1 + 5/6 × E}} Solving it gives `E = 6`. With any chance `p` the same argument gives `E = 1 + (1 - p)E`, so the average wait is `1/p`.",
        ],
      },
      {
        type: "rule",
        name: "The geometric distribution",
        lines: [
          { lead: "Let `X` be the number of independent trials up to and including the first success, where each trial succeeds with probability `p`. Then for `k = 1, 2, 3, \\dots`,", tex: "P(X = k) = (1-p)^{k-1}\\, p" },
          { lead: "Its mean and variance are", tex: "\\begin{aligned} E[X] &= \\frac{1}{p} \\\\[1ex] \\operatorname{Var}(X) &= \\frac{1-p}{p^2} \\end{aligned}" },
        ],
        where: ["Some books count only the failures before the first success. That count is `X - 1`, with mean `(1-p)/p`"],
        plain: "The first success on try `k` needs `k - 1` misses and then a hit. On average it takes `1/p` tries.",
        note: "For a die and a 6, `p = 1/6`, so the first 6 comes on roll 4 with chance {{P(X = 4) = (5/6)³ × 1/6 ≈ 9.6%}} On average you need `E[X] = 1/p = 6` rolls.",
      },
      {
        type: "check",
        prompt: "You flip a fair coin until you’ve seen 3 heads in total. How many flips do you expect?",
        choices: ["6", "3", "8", "4"],
        answer: 0,
        explain:
          "Each head takes 2 flips on average, and once one arrives the wait for the next starts over. Three waits of 2 flips each make 6. The answer 3 would only be right if every flip were a head.",
      },
      {
        type: "example",
        lead: "When more than one outcome ends the wait, add their chances first to get `p`.",
      },
      {
        type: "trap",
        body: "Mixing up tries and misses. A 1/6 chance means 6 rolls on average, counting the roll that shows the 6, so you see 5 misses before it on average. Check which one the question asks for.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The question says “keep rolling until” or “how many tries until”",
          "Each try has the same chance and doesn’t depend on the ones before",
          "It asks when the first success comes, or how many tries it takes",
        ],
      },
    ],
    targetSeconds: 30,
    example: geometric({ type: "wait", event: "five-six" }),
    families: [
      { id: "wait", title: "Tries until the first success", generate: (random) => geometric({ type: "wait", event: pick(random, WAITS).id }) },
      {
        id: "first-on",
        title: "The first success on try k",
        generate: (random) => {
          const hit = pick(random, HITS);
          // Keep the chance above 1%: likely hits stop at the fourth try (a die’s sixth roll is still 6.7%).
          return geometric({ type: "first-on", hit: hit.id, on: int(random, 2, hit.id === "free-throws" || hit.id === "biased" ? 4 : 6) });
        },
      },
      {
        id: "k-hits",
        title: "Tries to get k successes",
        generate: (random) => geometric({ type: "k-hits", hit: pick(random, HITS).id, hits: int(random, 2, 5) }),
      },
      {
        id: "kth-on-n",
        title: "The k-th success on try n",
        generate: (random) => {
          for (;;) {
            const setting = pick(random, KTH);
            const k = int(random, 2, 3);
            const made = kthOnN({ type: "kth", setting: setting.id, k, n: int(random, k + 1, 7) });
            const v = value(made.answer);
            if (v >= 0.01 && v <= 0.99) return made;
          }
        },
      },
      {
        id: "both-sides",
        title: "Flips to see both heads and tails",
        generate: (random) => {
          const [headsN, headsD] = pick(random, [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]] as const);
          return geometric({ type: "both-sides", headsN, headsD });
        },
      },
      {
        id: "roll-total",
        title: "The total of rolls until a stop",
        generate: (random) => {
          const sides = pick(random, [4, 6, 8, 10, 12] as const);
          return geometric({ type: "roll-total", sides, target: int(random, 1, sides), last: random() < 0.5 ? "with" : "without" });
        },
      },
      {
        id: "running-multiple",
        title: "Rolling until the total is a multiple",
        generate: (random) => {
          const [sides, m] = pick(random, MULTIPLES);
          return multipleOf({ type: "multiple", sides, m });
        },
      },
      {
        id: "until-girl",
        title: "Families who stop at a girl",
        generate: (random) =>
          untilGirl({
            type: "family",
            stop: pick(random, ["girl", "two-girls", "girl-or-three"] as const),
            ask: random() < 0.5 ? "children" : "boys",
          }),
      },
      {
        id: "wait-given",
        title: "Waiting for a 6, given what you didn’t see",
        generate: (random) => waitGiven({ type: "given", forbidden: pick(random, FORBIDDEN).id }),
      },
    ],
    mockFamilies: [
      {
        id: "mock-first-on",
        practice: "first-on",
        title: "The first success on a given try",
        generate: (random) => {
          const setting = pick(random, MOCK_FIRSTS);
          return mockFirstOn({ type: "mock-first-on", setting: setting.id, on: int(random, 2, setting.maxOn) });
        },
      },
      {
        id: "mock-colours",
        practice: "both-sides",
        title: "Draws until both colours appear",
        generate: (random) => {
          const [x, y] = pick(random, [[1, 1], [2, 2], [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]] as const);
          const [red, blue] = random() < 0.5 ? [x, y] : [y, x];
          return mockColours({ type: "mock-colours", setting: pick(random, MOCK_COLOURS).id, red, blue });
        },
      },
    ],
  },
  {
    id: "normal",
    title: "Normal distribution",
    benefit: "Use the 68–95–99.7 rule",
    summary: "The bell curve and the 68–95–99.7 rule: turn a value into standard deviations from the mean, then read off the share above, below or between.",
    difficulty: "Easy",
    parts: [
      {
        type: "text",
        body: [
          "Heights, test scores and measurement errors tend to pile up around an average and thin out evenly on both sides. That bell shape is the normal distribution.",
          "A normal distribution is fixed by two numbers. The mean `\\mu` is its centre. The standard deviation `\\sigma`, or SD, measures spread: most values are within one or two SDs of the mean.",
          "Scores on a test are normal with mean 500 and SD 100. What share of people score between 400 and 700?",
        ],
      },
      {
        type: "check",
        prompt: "Start with part of it. Roughly what share score between 400 and 600, within one SD of the mean?",
        choices: ["About 68%", "About 50%", "About 95%", "About 34%"],
        answer: 0,
        explain:
          "About 68% of values in any normal distribution are within 1 SD of the mean. 34% is the half of that on one side.",
      },
      {
        type: "story",
        heading: "Read it off the curve",
        beats: [
          {
            text: "About 68% of scores are within 1 SD of the mean, between 400 and 600.",
            visual: {
              type: "normal",
              shade: [{ from: -1, to: 1, tone: "hit", text: "68%" }],
              ticks: [
                { at: -3, label: "200" },
                { at: -2, label: "300" },
                { at: -1, label: "400" },
                { at: 0, label: "500" },
                { at: 1, label: "600" },
                { at: 2, label: "700" },
                { at: 3, label: "800" },
              ],
            },
          },
          {
            text: "About 95% are within 2 SDs, between 300 and 700. Almost all of them, 99.7%, are within 3 SDs.",
            visual: {
              type: "normal",
              shade: [{ from: -2, to: 2, tone: "hit", text: "95%" }],
              ticks: [
                { at: -3, label: "200" },
                { at: -2, label: "300" },
                { at: -1, label: "400" },
                { at: 0, label: "500" },
                { at: 1, label: "600" },
                { at: 2, label: "700" },
                { at: 3, label: "800" },
              ],
            },
          },
          {
            text: "The curve is the same on both sides of the mean, so each of those shares splits in half there. From 400 to 500 is half of 68%, which is 34%. From 500 to 700 is half of 95%, which is 47.5%.",
            visual: {
              type: "normal",
              shade: [
                { from: -1, to: 0, tone: "alt", text: "34%" },
                { from: 0, to: 2, tone: "hit", text: "47.5%" },
              ],
              ticks: [
                { at: -3, label: "200" },
                { at: -2, label: "300" },
                { at: -1, label: "400" },
                { at: 0, label: "500" },
                { at: 1, label: "600" },
                { at: 2, label: "700" },
                { at: 3, label: "800" },
              ],
            },
          },
          {
            text: "Add the two halves to get the share who score between 400 and 700: {{34% + 47.5% = 81.5%}}",
            visual: {
              type: "normal",
              shade: [{ from: -1, to: 2, tone: "hit", text: "81.5%" }],
              ticks: [
                { at: -3, label: "200" },
                { at: -2, label: "300" },
                { at: -1, label: "400" },
                { at: 0, label: "500" },
                { at: 1, label: "600" },
                { at: 2, label: "700" },
                { at: 3, label: "800" },
              ],
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Count in standard deviations",
        body: [
          "First turn each value into its z-score, the number of SDs it sits from the mean: {{z = (700 − 500)/100 = 2}} So 700 is 2 SDs above the mean, and 400, with `z = -1`, is 1 SD below.",
          "After that the question depends only on the shape, and every normal distribution has the same shape. That’s why the same three percentages work for every normal distribution, whatever it measures.",
        ],
      },
      {
        type: "rule",
        name: "The normal distribution",
        lines: [
          { lead: "If `X \\sim N(\\mu, \\sigma^2)`, with mean `\\mu` and standard deviation `\\sigma`, its z-score", tex: "Z = \\frac{X - \\mu}{\\sigma}" },
          { lead: "has the standard normal distribution `N(0, 1)`, and", tex: "\\begin{aligned} P(|Z| \\le 1) &\\approx 0.68 \\\\ P(|Z| \\le 2) &\\approx 0.95 \\\\ P(|Z| \\le 3) &\\approx 0.997 \\end{aligned}" },
          { lead: "If `X` and `Y` are independent and normal, `X + Y` is normal with", tex: "\\begin{aligned} E[X + Y] &= \\mu_X + \\mu_Y \\\\ \\operatorname{SD}(X + Y) &= \\sqrt{\\sigma_X^2 + \\sigma_Y^2} \\end{aligned}" },
          { lead: "and the average `\\bar{X}` of `n` independent values with standard deviation `\\sigma` has", tex: "\\operatorname{SD}(\\bar{X}) = \\frac{\\sigma}{\\sqrt{n}}" },
        ],
        plain: "Turn each value into a number of standard deviations from the mean, then use 68%, 95% and 99.7%.",
        note: "For the test, `\\mu = 500` and `\\sigma = 100`, so a score between 400 and 700 means `-1 \\le Z \\le 2`: {{P(−1 ≤ Z ≤ 2) ≈ 34% + 47.5% = 81.5%}} What lies outside a range splits evenly between the two ends, so 2.5% score above 700.",
      },
      {
        type: "check",
        prompt: "Same test. What share of people score above 600?",
        choices: ["16%", "32%", "34%", "84%"],
        answer: 0,
        explain:
          "68% score between 400 and 600, so 32% are outside that range. Half of them are on the high side, which is 16%. The answer 32% counts both ends.",
      },
      {
        type: "text",
        heading: "Sums and averages",
        body: [
          "Add two independent normal values and the total is normal too. The means add, and so do the squares of the SDs. Two trips with SDs of 3 and 4 minutes give a total with SD {{√(3² + 4²) = √25 = 5}} That’s 5 minutes, not 7.",
          "An average of `n` independent values has the same mean, but its SD is divided by `\\sqrt{n}`. Average 25 values with SD 10, and the average has SD {{10 ÷ √25 = 2}}",
        ],
      },
      {
        type: "example",
        lead: "Heights work the same way. Turn the cut-off into SDs from the mean, then use the rule.",
      },
      {
        type: "trap",
        body: "Forgetting to halve. 95% of values are within 2 SDs, so 5% are outside, but those 5% are split between the two ends. Only 2.5% are more than 2 SDs above the mean.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The question says the values are normal and gives a mean and an SD",
          "The cut-offs sit a whole number of SDs from the mean",
          "It asks about a sum or an average of independent normal values",
        ],
      },
    ],
    targetSeconds: 30,
    example: normal({ type: "range", scale: "heights", lo: 2, hi: OPEN }),
    families: [
      {
        id: "one-side",
        title: "Share above or below a value",
        generate: (random) => {
          const [lo, hi] = pick(random, NORMAL_RANGES.filter(([a, b]) => a === -OPEN || b === OPEN));
          return normal({ type: "range", scale: pick(random, SCALES).id, lo, hi });
        },
      },
      {
        id: "between",
        title: "Share between two values",
        generate: (random) => {
          const [lo, hi] = pick(random, NORMAL_RANGES.filter(([a, b]) => a !== -OPEN && b !== OPEN));
          return normal({ type: "range", scale: pick(random, SCALES).id, lo, hi });
        },
      },
      {
        id: "given",
        title: "A chance given where a value lies",
        generate: (random) => normal({ type: "given", scale: pick(random, SCALES).id, ...pick(random, NORMAL_GIVENS) }),
      },
      {
        id: "sum",
        title: "The sum of two independent normals",
        generate: (random) => {
          const [a, b] = pick(random, TRIPLES);
          const [x, y] = random() < 0.5 ? [a, b] : [b, a];
          return sumOfNormals({ type: "sum", setting: pick(random, SUM_SETTINGS).id, a: x, b: y, region: pick(random, REGIONS) });
        },
      },
      {
        id: "average",
        title: "The average of several values",
        generate: (random) => {
          const n = pick(random, AVERAGE_SIZES);
          const s = int(random, 1, 5);
          return averageOfNormals({ type: "average", setting: pick(random, AVERAGE_SETTINGS).id, sd: s * Math.round(Math.sqrt(n)), n, region: pick(random, REGIONS) });
        },
      },
      {
        id: "symmetry",
        title: "Symmetry of normals centred on 0",
        generate: (random) => symmetry({ type: "symmetry", variant: pick(random, SYMMETRY).id }),
      },
    ],
    mockFamilies: [
      {
        id: "mock-between",
        practice: "between",
        title: "Share between two cut-offs",
        generate: (random) => {
          const [lo, hi] = pick(random, NORMAL_RANGES.filter(([a, b]) => a !== -OPEN && b !== OPEN));
          return mockBetween({ type: "mock-between", scale: pick(random, MOCK_SCALES).id, lo, hi });
        },
      },
      {
        id: "mock-sum",
        practice: "sum",
        title: "A total of two independent normal parts",
        generate: (random) => {
          const [a, b] = pick(random, TRIPLES);
          const [x, y] = random() < 0.5 ? [a, b] : [b, a];
          return mockSum({ type: "mock-sum", setting: pick(random, MOCK_SUM_SETTINGS).id, a: x, b: y, region: pick(random, REGIONS) });
        },
      },
    ],
  },
];
