import { add, div, formatFraction, formatPercent, mul, pow, q, sub, value, type Rational } from "../rational";
import { choose, int, pick, problem, sup, type QuantLessonDef, type QuantProblem, type Random } from "../build";
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
    prompt: (n, count, k) => `You flip a fair coin ${n} times. What's the chance of ${count} ${k === 1 ? "head" : "heads"}?`,
  },
  {
    id: "sixes",
    one: "Roll",
    chance: [1, 6],
    noun: "rolls",
    minTries: 2,
    maxTries: 5,
    prompt: (n, count, k) => `You roll a fair die ${n} times. What's the chance of ${count} ${k === 1 ? "six" : "sixes"}?`,
  },
  {
    id: "sunny",
    one: "Day",
    chance: [4, 5],
    noun: "days",
    minTries: 3,
    maxTries: 5,
    prompt: (n, count) =>
      `Each day at a beach town is sunny with chance 80%, independently. What's the chance ${count} of the next ${n} days are sunny?`,
  },
  {
    id: "free-throws",
    one: "Shot",
    chance: [7, 10],
    noun: "shots",
    minTries: 3,
    maxTries: 5,
    prompt: (n, count) => `A player makes each free throw with chance 70%. Taking ${n} shots, what's the chance they make ${count}?`,
  },
  {
    id: "guessing",
    one: "Question",
    chance: [1, 4],
    noun: "questions",
    minTries: 3,
    maxTries: 6,
    prompt: (n, count) =>
      `A quiz has ${n} questions, each with 4 choices. If you guess every answer, what's the chance you get ${count} right?`,
  },
  {
    id: "biased-coin",
    one: "Flip",
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
          explain: `Any ${k} of the ${n} ${trial.noun} can be the successes. C(${n}, ${k}) counts the ways to choose them.`,
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
            : `The ways to pick which ${j} of the ${n} succeed, times the chance of one such order.`,
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
      ? `You flip a fair coin ${n} times. What's the chance of an odd number of heads?`
      : `A coin lands heads with chance ${formatFraction(p)}. You flip it ${n} times. What's the chance of an odd number of heads?`,
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
            explain: "Multiply out ((1 − p) − p)ⁿ: outcomes with an even number of heads count plus, odd ones count minus. So it’s P(even) − P(odd).",
          },
          {
            label: "An odd number of heads",
            work: `(1 − ${formatFraction(diff)}) ÷ 2`,
            icon: "divide",
            explain: "P(even) + P(odd) = 1, and P(even) − P(odd) is the number above. Take it from 1 and halve.",
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
    `You flip a fair coin ${n} times. What's the chance the number of heads in the first ${a} flips equals the number in the ${b === 1 ? "last flip" : `last ${b}`}?`,
    q(total, 2 ** n),
    "probability",
    [
      {
        label: "Ways for each number of heads k",
        work: ks.map((k) => `${choose(a, k)}×${choose(b, k)}`).join(" + "),
        result: `${total}`,
        icon: "count",
        explain: `For k heads in each group, choose which of the first ${a} and which of the last ${b} are heads, and multiply. Then add over every k.`,
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
      `A jury of three decides by majority. Two jurors each reach the right verdict with chance ${pct}, independently, and the third flips a coin. What's the chance the jury gets it right?`,
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
    `A jury of three decides by majority. Each juror reaches the right verdict with chance ${pct}, independently. What's the chance the jury gets it right?`,
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
        `${hit.untilFirst}. What's the chance the first ${hit.hit} comes on the ${ORDINALS[on]} ${hit.tryWord}?`,
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
          ? "You flip a fair coin until you've seen both heads and tails. How many flips do you expect it to take?"
          : `A coin lands heads with chance ${formatFraction(heads)}. You flip it until you've seen both heads and tails. How many flips do you expect it to take?`,
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
            explain: "If the first flip was heads, waiting for tails takes 1 ÷ P(tails) flips; if tails, 1 ÷ P(heads). Weight each case by its chance.",
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
      // Average rolls × average roll (Wald's identity); drop the final roll if it isn't counted.
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
    prompt: (k, n) => `You flip a fair coin until you have ${k} heads. What's the chance the ${ORDINAL[k]} head comes on flip ${n}?`,
  },
  {
    id: "fish",
    chance: [1, 2],
    one: "Fish",
    hit: "catch",
    prompt: (k, n) =>
      `A bear catches each fish that swims past with chance 1/2, and leaves once it has caught ${k}. What's the chance its ${ORDINAL[k]} catch is the ${ORDINAL[n]} fish?`,
  },
  {
    id: "die",
    chance: [1, 6],
    one: "Roll",
    hit: "six",
    prompt: (k, n) => `You roll a fair die until you've rolled ${k} sixes. What's the chance the ${ORDINAL[k]} six comes on roll ${n}?`,
  },
  {
    id: "free-throws",
    chance: [3, 4],
    one: "Shot",
    hit: "make",
    prompt: (k, n) =>
      `A player makes each free throw with chance 3/4 and stops after making ${k}. What's the chance the ${ORDINAL[k]} make comes on shot ${n}?`,
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
        explain: `Any ${k - 1} of the first ${n - 1} tries can hold the earlier successes.`,
      },
      {
        label: "Chance of one such order",
        work: timesTerms(power(p, k), power(miss, n - k)),
        result: formatFraction(oneOrder),
        icon: "multiply",
        explain: `The tries don’t affect each other: ${formatFraction(p)} for each of the ${k} successes and ${formatFraction(miss)} for each of the ${n - k} misses.`,
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

/** Faces you're told never came up before the 6. */
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
    `You roll a fair die until you get a 6. You're told ${rule.text}. On average, how many rolls did it take, counting the 6?`,
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
        label: "Being told it was the 6 doesn’t change the wait",
        work: `the first of these ${stopping} faces comes just as fast, whichever it is`,
        result: "",
        icon: "idea",
        explain: "How long it takes to hit one of these faces doesn’t depend on which one it hits. So the runs that end on the 6 wait just as long as the rest.",
      },
      {
        label: "Average rolls",
        work: `1 ÷ ${formatFraction(chance)}`,
        icon: "divide",
        explain: "So it’s a plain wait for any of those faces: 1 ÷ their chance, counting the last roll.",
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
        explain: `Whatever the total so far, exactly ${good} of the ${sides} faces bring it to a multiple of ${m}. So every roll does it with chance 1/${m}.`,
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
        explain: "The chance is the same on every roll, so it’s a plain wait: 1 ÷ the chance, counting the last roll.",
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

/** The figure spans −3 to 3 standard deviations; "no limit" draws to the edge. */
const edge = (z: number) => Math.max(-3, Math.min(3, z));

type Band = [number, number];

/** A bell curve with bands shaded, ticks at the mean and each whole SD in the question's units. */
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
      explain: `${w(inner)} of values are within ${sd(inner)} of the mean. The rest are outside, split evenly between the two tails, so take half.`,
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
    `${scale.setup} ${RULE}: ${scale.one} is ${describe(condition)}. What's the chance it's ${describe(event)}?`,
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
        label: "Chance of what you're asked",
        work: describe(event).replace(/ \(.*\)$/, ""),
        result: formatPercent(both),
        icon: "target",
        explain: "This is the part you’re asked about. It sits inside what you’re told.",
        visual: bellCurve(scale, [known, asked], "What you’re asked, inside what you’re told"),
      },
      {
        label: "Share of the first that's also the second",
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

/** The rule's last step for a region: one side via sideStep, or "within k" read straight off the rule. */
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

/** The question's words for a region, given how to show a value and the verbs for each side. */
function regionWords(region: Region, at: (z: number) => string, words: { above: string; below: string; within: string }) {
  const k = Number(region.split("-")[1]);
  if (region.startsWith("above")) return `${words.above} ${at(k)}`;
  if (region.startsWith("below")) return `${words.below} ${at(-k)}`;
  return `${words.within} ${at(-k)} and ${at(k)}`;
}

/** Threshold values for the region, in the question's units, so tests can work the z-scores out again. */
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
          ? `X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What's the chance Y > ${k}X?`
          : `X and Y are independent normal random numbers with mean 0. X has standard deviation ${sx} and Y has standard deviation ${sy}. What's the chance Y > ${k}X?`,
      answer: [1, 2] as [number, number],
      move: "both" as const,
      claim: `Y > ${k}X`,
      opposite: `Y < ${k}X`,
    })),
  ),
  {
    id: "sum",
    prompt: "X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What's the chance X + Y > 0?",
    answer: [1, 2],
    move: "both",
    claim: "X + Y > 0",
    opposite: "X + Y < 0",
  },
  {
    id: "same-sign",
    prompt: "X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What's the chance X and Y have the same sign?",
    answer: [1, 2],
    move: "one",
    claim: "same sign",
    opposite: "opposite signs",
  },
  {
    id: "further",
    prompt: "X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What's the chance Y is further from 0 than X is?",
    answer: [1, 2],
    move: "swap",
    claim: "Y further from 0",
    opposite: "X further from 0",
  },
  {
    id: "both-positive",
    prompt: "X and Y are independent normal random numbers, each with mean 0 and standard deviation 1. What's the chance both are positive?",
    answer: [1, 4],
    move: "product",
    count: 2,
  },
  {
    id: "three-positive",
    prompt: "X, Y and Z are independent normal random numbers, each with mean 0 and standard deviation 1. What's the chance all three are positive?",
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
      ? { label: "Flip the sign of both", work: "(X, Y) → (−X, −Y)", explain: "With mean 0, each normal is as likely to be −x as x, so (−X, −Y) has exactly the same chances as (X, Y)." }
      : variant.move === "one"
        ? { label: "Flip the sign of Y", work: "(X, Y) → (X, −Y)", explain: "With mean 0, Y is as likely to be −y as y, so (X, −Y) has exactly the same chances as (X, Y)." }
        : { label: "Swap X and Y", work: "(X, Y) → (Y, X)", explain: "X and Y have the same distribution and are independent, so swapping them changes no chances." };
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
        explain: "For independent parts the variances (SD²) add, so the total’s SD is √(a² + b²), which is less than a + b.",
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
    setup: (sd, n) => `A trader's profit per trade is normal with mean $20 and standard deviation $${sd}, independently. They make ${n} trades a day.`,
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
        explain: `An average of ${n} independent values keeps the same mean, but its SD shrinks by √${n}: the ups and downs partly cancel out.`,
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

export const DISTRIBUTIONS_LESSONS: QuantLessonDef[] = [
  {
    id: "binomial",
    title: "Binomial distribution",
    benefit: "Find the chance of k wins in n tries",
    idea: "The chance of exactly k successes in n tries is C(n, k) × pᵏ × (1 − p)ⁿ⁻ᵏ: the ways to pick which tries succeed, times the chance of one such order. For “at least”, add up the exact chances.",
    difficulty: "Medium",
    intro:
      "Each try has the same chance p and doesn’t affect the others. One particular order of k successes and n − k misses has chance pᵏ × (1 − p)ⁿ⁻ᵏ, and every order has that same chance. So count the orders with C(n, k) and multiply.",
    formula: "P(exactly k) = C(n, k) × pᵏ × (1 − p)ⁿ⁻ᵏ",
    cues: [
      "A fixed number of tries, each with the same chance",
      "It asks for exactly k or at least k successes",
      "The tries don’t affect each other",
    ],
    mistake: "Leaving out C(n, k): pᵏ × (1 − p)ⁿ⁻ᵏ is the chance of one order, not of k successes in any order.",
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
  },
  {
    id: "geometric",
    title: "Geometric distribution",
    benefit: "Find how long until the first success",
    idea: "If each try works with chance p, it takes 1 ÷ p tries on average, and k ÷ p tries to get k successes. The chance the first success comes on try k is (1 − p)ᵏ⁻¹ × p.",
    difficulty: "Medium",
    intro:
      "If each try works with chance p, successes turn up at a rate of p per try, so on average one comes every 1 ÷ p tries. For the first success to land exactly on try k, the k − 1 tries before it must all miss, and then one must work.",
    formula: "Average tries = 1 ÷ p;  P(first success on try k) = (1 − p)ᵏ⁻¹ × p",
    cues: [
      "“Keep trying until…” or “how many tries until…”",
      "Each try has the same chance and doesn’t depend on the last",
      "“The first success comes on try k”",
    ],
    mistake: "Mixing up the chance and the wait: a 1/6 chance means 6 tries on average, and the try that works counts as one of them.",
    targetSeconds: 30,
    example: geometric({ type: "wait", event: "five-six" }),
    families: [
      { id: "wait", title: "Tries until the first success", generate: (random) => geometric({ type: "wait", event: pick(random, WAITS).id }) },
      {
        id: "first-on",
        title: "The first success on try k",
        generate: (random) => {
          const hit = pick(random, HITS);
          // Keep the chance above 1%: likely hits stop at the fourth try (a die's sixth roll is still 6.7%).
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
  },
  {
    id: "normal",
    title: "Normal distribution",
    benefit: "Use the 68–95–99.7 rule",
    idea: "In a normal distribution, about 68% of values are within 1 standard deviation of the mean, 95% within 2 and 99.7% within 3. What's left splits evenly between the two sides.",
    difficulty: "Easy",
    intro:
      "A normal distribution is the bell curve: most values sit near the mean, and fewer the further out you go. Distance from the mean is measured in standard deviations. The 68–95–99.7 rule gives the share within 1, 2 and 3 of them, and the curve is the same on both sides, so each side gets half.",
    formula: "Within 1 SD: 68%; within 2 SD: 95%; within 3 SD: 99.7%; the rest splits evenly",
    cues: [
      "It says the values are normal and gives a mean and a standard deviation",
      "The values asked about are a whole number of standard deviations from the mean",
      "It asks for a share above, below or between two values",
    ],
    mistake: "Forgetting to halve: 95% are within 2 standard deviations, so 5% are outside, but only 2.5% are above.",
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
  },
];
