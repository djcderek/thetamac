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
    generate: randomBinomial,
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
    generate: randomGeometric,
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
    generate: (random) =>
      random() < 0.75
        ? (() => {
            const [lo, hi] = pick(random, NORMAL_RANGES);
            return normal({ type: "range", scale: pick(random, SCALES).id, lo, hi });
          })()
        : normal({ type: "given", scale: pick(random, SCALES).id, ...pick(random, NORMAL_GIVENS) }),
  },
];
