import {
  add,
  div,
  formatDollars,
  formatFraction,
  formatPercent,
  formatResult,
  mul,
  pow,
  q,
  sub,
  value,
  type AnswerKind,
  type Rational,
} from "./rational";

/**
 * Quant lessons: probability, expected value and betting maths, asked the way trading
 * interviews and card rooms ask it. Each lesson is one idea. Its set opens with
 * QUANT_GUIDED problems that show the working, then QUANT_SOLO on the player's own.
 */

export const QUANT_GUIDED = 2;
export const QUANT_SOLO = 5;
export const QUANT_SET_SIZE = QUANT_GUIDED + QUANT_SOLO;
/** Solo problems right first time (within the target time) to master a lesson. */
export const QUANT_MASTERY_FIRST_TRY = QUANT_SOLO - 1;

export type QuantTopic = "probability" | "expected-value" | "betting" | "harder";

export const QUANT_TOPICS: { id: QuantTopic; title: string; blurb: string }[] = [
  { id: "probability", title: "Probability", blurb: "How likely something is to happen." },
  { id: "expected-value", title: "Expected value", blurb: "What something is worth on average." },
  { id: "betting", title: "Betting maths", blurb: "Whether a bet is good, and how much to bet." },
  { id: "harder", title: "Harder problems", blurb: "Multi-step questions from trading interviews." },
];

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

export const QUANT_LESSON_IDS = [
  "count-outcomes",
  "two-dice",
  "at-least-one",
  "in-a-row",
  "picture-the-crowd",
  "weigh-the-payouts",
  "add-the-averages",
  "reroll-or-keep",
  "wait-for-it",
  "odds-to-chance",
  "pot-odds",
  "house-edge",
  "kelly",
  "combinations",
  "meeting-problem",
  "highest-lowest",
  "coupon-collector",
  "pattern-wait",
  "gamblers-ruin",
] as const;

export type QuantLessonId = (typeof QUANT_LESSON_IDS)[number];

export type QuantLesson = {
  id: QuantLessonId;
  topic: QuantTopic;
  /** The name interviewers and textbooks use, so players recognise what they're learning. */
  title: string;
  /** What it lets the player do, short enough for one line of a phone list. */
  benefit: string;
  /** The idea in one sentence. */
  idea: string;
  /** Average seconds per solo problem to master it. */
  targetSeconds: number;
  example: QuantProblem;
  generate: (random: () => number) => QuantProblem;
};

type Random = () => number;

function int(random: Random, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick<T>(random: Random, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)];
}

const frac = (n: number, d = 1) => formatFraction(q(n, d));

function problem(
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

// ─── Cards ───────────────────────────────────────────────────────────────────────────────

export type Card = { rank: number; suit: "hearts" | "diamonds" | "clubs" | "spades" };
const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
export const DECK: Card[] = SUITS.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ rank: i + 1, suit })));
const isRed = (card: Card) => card.suit === "hearts" || card.suit === "diamonds";
const isFace = (card: Card) => card.rank >= 11;

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
const DRAW_EVENTS: { id: string; label: string; count: number }[] = [
  { id: "aces", label: "aces", count: 4 },
  { id: "hearts", label: "hearts", count: 13 },
  { id: "face", label: "face cards", count: 12 },
  { id: "red", label: "red", count: 26 },
];

// ─── Dice ────────────────────────────────────────────────────────────────────────────────

const DIE_SIDES = [4, 6, 8, 10, 12, 20] as const;
/** Ordered pairs of two six-sided dice making a total. */
const waysToTotal = (total: number) => Math.max(0, 6 - Math.abs(total - 7));
const pairsFor = (total: number) =>
  Array.from({ length: 6 }, (_, i) => i + 1)
    .filter((a) => total - a >= 1 && total - a <= 6)
    .map((a) => `${a}+${total - a}`);

const timesWord = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
const numberWord = (n: number) => ["no", "one", "two", "three", "four", "five", "six"][n] ?? String(n);

// ─── Lessons ─────────────────────────────────────────────────────────────────────────────

function countOutcomes(params: { type: "die"; sides: number; atLeast: number } | { type: "card"; event: string }) {
  if (params.type === "die") {
    const { sides, atLeast } = params;
    const ways = sides - atLeast + 1;
    return problem(
      `die-${sides}-${atLeast}`,
      `You roll a fair ${sides}-sided die. What's the chance of rolling ${atLeast} or higher?`,
      q(ways, sides),
      "probability",
      [
        { label: `Faces from ${atLeast} to ${sides}`, work: `${sides} − ${atLeast} + 1`, result: `${ways}` },
        { label: "Chance", work: `${ways} of ${sides} faces` },
      ],
      params,
    );
  }
  const event = CARD_EVENTS.find((e) => e.id === params.event)!;
  const ways = DECK.filter(event.test).length;
  return problem(
    `card-${event.id}`,
    `You draw one card from a shuffled 52-card deck. What's the chance it's ${event.label}?`,
    q(ways, 52),
    "probability",
    [
      { label: "Cards that count", work: event.breakdown, result: `${ways}` },
      { label: "Chance", work: `${ways} of 52 cards` },
    ],
    params,
  );
}

function twoDice(params: { type: "exactly" | "at-least" | "double"; total: number }) {
  const { type, total } = params;
  if (type === "double") {
    return problem(
      "double",
      "You roll two fair dice. What's the chance they show the same number?",
      q(6, 36),
      "probability",
      [
        { label: "Doubles", work: "1+1, 2+2, … 6+6", result: "6" },
        { label: "Ways in all", work: "6 × 6", result: "36" },
        { label: "Chance", work: "6/36" },
      ],
      params,
    );
  }
  const totals = type === "exactly" ? [total] : Array.from({ length: 13 - total }, (_, i) => total + i);
  const ways = totals.reduce((sum, t) => sum + waysToTotal(t), 0);
  const listing =
    type === "exactly"
      ? pairsFor(total).join(", ")
      : totals.map((t) => `${waysToTotal(t)} (${t})`).join(" + ");
  return problem(
    `${type}-${total}`,
    `You roll two fair dice. What's the chance the total is ${type === "exactly" ? total : `${total} or more`}?`,
    q(ways, 36),
    "probability",
    [
      { label: type === "exactly" ? `Ways to make ${total}` : `Ways to make ${total} or more`, work: listing, result: `${ways}` },
      { label: "Ways in all", work: "6 × 6", result: "36" },
      { label: "Chance", work: `${ways}/36` },
    ],
    params,
  );
}

function atLeastOne(
  params:
    | { type: "sixes"; rolls: number }
    | { type: "heads"; flips: number }
    | { type: "low"; rolls: number }
    | { type: "ace"; cards: number },
) {
  switch (params.type) {
    case "sixes":
    case "low": {
      const { rolls } = params;
      const miss = params.type === "sixes" ? q(5, 6) : q(2, 3);
      const target = params.type === "sixes" ? "a six" : "a 1 or a 2";
      const none = pow(miss, rolls);
      return problem(
        `${params.type}-${rolls}`,
        `You roll a fair die ${timesWord(rolls)}. What's the chance of at least one roll showing ${target}?`,
        sub(q(1), none),
        "probability",
        [
          { label: `No ${params.type === "sixes" ? "six" : "1 or 2"} on one roll`, work: params.type === "sixes" ? "1 − 1/6" : "1 − 2/6", result: formatFraction(miss) },
          { label: `No ${params.type === "sixes" ? "six" : "1 or 2"} in ${rolls} rolls`, work: `(${formatFraction(miss)})^${rolls}`, result: formatFraction(none) },
          { label: "At least one", work: `1 − ${formatFraction(none)}` },
        ],
        params,
      );
    }
    case "heads": {
      const { flips } = params;
      const none = pow(q(1, 2), flips);
      return problem(
        `heads-${flips}`,
        `You flip a fair coin ${flips} times. What's the chance of at least one head?`,
        sub(q(1), none),
        "probability",
        [
          { label: "Tails every time", work: `(1/2)^${flips}`, result: formatFraction(none) },
          { label: "At least one head", work: `1 − ${formatFraction(none)}` },
        ],
        params,
      );
    }
    case "ace": {
      const { cards } = params;
      let none = q(1);
      const factors: string[] = [];
      for (let i = 0; i < cards; i++) {
        none = mul(none, q(48 - i, 52 - i));
        factors.push(`${48 - i}/${52 - i}`);
      }
      return problem(
        `ace-${cards}`,
        `You deal ${cards} cards from a shuffled deck. What's the chance at least one is an ace?`,
        sub(q(1), none),
        "probability",
        [
          { label: "No ace in any of them", work: factors.join(" × "), result: formatFraction(none) },
          { label: "At least one ace", work: `1 − ${formatFraction(none)}` },
        ],
        params,
      );
    }
  }
}

function inARow(params: { type: "bag"; red: number; blue: number; draws: number } | { type: "cards"; event: string }) {
  if (params.type === "bag") {
    const { red, blue, draws } = params;
    let chance = q(1);
    const factors: string[] = [];
    for (let i = 0; i < draws; i++) {
      chance = mul(chance, q(red - i, red + blue - i));
      factors.push(`${red - i}/${red + blue - i}`);
    }
    return problem(
      `bag-${red}-${blue}-${draws}`,
      `A bag has ${red} red and ${blue} blue marbles. You take out ${numberWord(draws)} without putting any back. What's the chance they're ${draws === 2 ? "both" : "all"} red?`,
      chance,
      "probability",
      [
        ...factors.map((factor, i) => ({
          label: i === 0 ? "First is red" : `${i === 1 ? "Second" : "Third"} is red too`,
          work: `${red - i} red of ${red + blue - i} left`,
          result: factor,
        })),
        { label: draws === 2 ? "Both" : "All three", work: factors.join(" × ") },
      ],
      params,
    );
  }
  const event = DRAW_EVENTS.find((e) => e.id === params.event)!;
  const chance = mul(q(event.count, 52), q(event.count - 1, 51));
  return problem(
    `cards-${event.id}`,
    `You deal two cards from a shuffled deck. What's the chance both are ${event.label}?`,
    chance,
    "probability",
    [
      { label: "First card", work: `${event.count} of 52`, result: `${event.count}/52` },
      { label: "Second card", work: `${event.count - 1} of the 51 left`, result: `${event.count - 1}/51` },
      { label: "Both", work: `${event.count}/52 × ${event.count - 1}/51` },
    ],
    params,
  );
}

function pictureTheCrowd(
  params:
    | { type: "test"; people: number; sick: number; caught: number; falseAlarms: number }
    | { type: "coins"; fair: number; rigged: number; flips: number },
) {
  if (params.type === "test") {
    const { people, sick, caught, falseAlarms } = params;
    const healthy = people - sick;
    return problem(
      `test-${people}-${sick}-${caught}-${falseAlarms}`,
      `Of ${people} people, ${sick} have a condition. A test flags ${caught} of the ${sick} who have it, and wrongly flags ${falseAlarms} of the ${healthy} who don't. Someone tests positive. What's the chance they have it?`,
      q(caught, caught + falseAlarms),
      "probability",
      [
        { label: "Positive and have it", work: `${caught} of the ${sick}`, result: `${caught}` },
        { label: "Positive but don't", work: `${falseAlarms} of the ${healthy}`, result: `${falseAlarms}` },
        { label: "Chance they have it", work: `${caught}/(${caught} + ${falseAlarms})` },
      ],
      params,
    );
  }
  const { fair, rigged, flips } = params;
  // Picture 2^flips × (coins) picks: every rigged pick shows all heads, a fair one 1 in 2^flips.
  const runs = 2 ** flips;
  const riggedHeads = rigged * runs;
  const fairHeads = fair;
  const coins = fair === 1 ? "1 fair coin" : `${fair} fair coins`;
  const riggedText = rigged === 1 ? "1 two-headed coin" : `${rigged} two-headed coins`;
  return problem(
    `coins-${fair}-${rigged}-${flips}`,
    `A bag has ${coins} and ${riggedText}. You pick one at random and flip it ${flips === 1 ? "once" : `${flips} times`}: ${flips === 1 ? "heads" : "heads every time"}. What's the chance it's two-headed?`,
    q(riggedHeads, riggedHeads + fairHeads),
    "probability",
    [
      { label: `Out of ${runs * (fair + rigged)} picks`, work: `${runs} of each coin`, result: "" },
      { label: `Two-headed and ${flips === 1 ? "heads" : "all heads"}`, work: `${rigged} × ${runs}`, result: `${riggedHeads}` },
      { label: `Fair and ${flips === 1 ? "heads" : "all heads"}`, work: `${fair * runs} × 1/${runs}`, result: `${fairHeads}` },
      { label: "Chance it’s two-headed", work: `${riggedHeads}/(${riggedHeads} + ${fairHeads})` },
    ],
    params,
  );
}

function weighThePayouts(
  params: { type: "face"; sides: number } | { type: "game"; six: number; five: number; cost: number },
) {
  if (params.type === "face") {
    const { sides } = params;
    return problem(
      `face-${sides}`,
      `You roll a fair ${sides}-sided die and are paid the number rolled, in dollars. What's the game worth on average?`,
      q(sides + 1, 2),
      "dollars",
      [
        { label: "Each face pays its number", work: `1 + 2 + … + ${sides}`, result: `${(sides * (sides + 1)) / 2}` },
        { label: "Average", work: `${(sides * (sides + 1)) / 2} ÷ ${sides}` },
      ],
      params,
    );
  }
  const { six, five, cost } = params;
  const ev = q(six + five - 4 * cost, 6);
  return problem(
    `game-${six}-${five}-${cost}`,
    `Roll a die: a six wins $${six}, a five wins $${five}, anything else loses $${cost}. What's one roll worth to you on average?`,
    ev,
    "dollars",
    [
      { label: "Six", work: `$${six} × 1/6`, result: formatDollars(q(six, 6)) },
      { label: "Five", work: `$${five} × 1/6`, result: formatDollars(q(five, 6)) },
      { label: "One to four", work: `−$${cost} × 4/6`, result: formatDollars(q(-4 * cost, 6)) },
      { label: "Average per roll", work: `(${six} + ${five} − ${4 * cost}) ÷ 6` },
    ],
    params,
  );
}

function addTheAverages(
  params:
    | { type: "dice-total"; dice: number }
    | { type: "sixes"; rolls: number }
    | { type: "hearts"; cards: number }
    | { type: "aces"; cards: number }
    | { type: "envelopes"; letters: number },
) {
  switch (params.type) {
    case "dice-total":
      return problem(
        `total-${params.dice}`,
        `You roll ${params.dice} fair dice. What's the expected total?`,
        q(7 * params.dice, 2),
        "number",
        [
          { label: "One die averages", work: "(1 + 2 + … + 6) ÷ 6", result: "3.5" },
          { label: `${params.dice} dice`, work: `${params.dice} × 3.5` },
        ],
        params,
      );
    case "sixes":
      return problem(
        `sixes-${params.rolls}`,
        `You roll a fair die ${params.rolls} times. How many sixes do you expect?`,
        q(params.rolls, 6),
        "number",
        [
          { label: "Each roll is a six", work: "1 time in 6", result: "1/6" },
          { label: `${params.rolls} rolls`, work: `${params.rolls} × 1/6` },
        ],
        params,
      );
    case "hearts":
    case "aces": {
      const share = params.type === "hearts" ? q(13, 52) : q(4, 52);
      return problem(
        `${params.type}-${params.cards}`,
        `You deal ${params.cards} cards from a shuffled deck. How many ${params.type} do you expect?`,
        mul(q(params.cards), share),
        "number",
        [
          { label: `Each card is ${params.type === "hearts" ? "a heart" : "an ace"}`, work: params.type === "hearts" ? "13 of 52" : "4 of 52", result: formatFraction(share) },
          { label: `In ${params.cards} cards`, work: `${params.cards} × ${formatFraction(share)}` },
        ],
        params,
      );
    }
    case "envelopes":
      return problem(
        `envelopes-${params.letters}`,
        `${params.letters} letters go into their ${params.letters} addressed envelopes at random, one each. How many do you expect in the right envelope?`,
        q(1),
        "number",
        [
          { label: "Each letter is right", work: `1 time in ${params.letters}`, result: `1/${params.letters}` },
          { label: `${params.letters} letters`, work: `${params.letters} × 1/${params.letters}` },
        ],
        params,
      );
  }
}

/** The value of a fair n-sided die paid at face value, with `rerolls` rerolls left. */
export function rerollValue(sides: number, rerolls: number): Rational {
  let worth = q(sides + 1, 2);
  for (let i = 0; i < rerolls; i++) {
    // Keep a face only if it beats rolling again.
    let total = q(0);
    for (let face = 1; face <= sides; face++) total = add(total, value(q(face)) > value(worth) ? q(face) : worth);
    worth = div(total, q(sides));
  }
  return worth;
}

function rerollOrKeep(params: { sides: number; rerolls: number }) {
  const { sides, rerolls } = params;
  const fresh = rerollValue(sides, rerolls - 1);
  const keepFrom = Math.floor(value(fresh)) + 1;
  const keepCount = sides - keepFrom + 1;
  const keptAverage = q(keepFrom + sides, 2);
  const prompt =
    rerolls === 1
      ? `Roll a fair ${sides}-sided die and be paid the result in dollars. After the first roll you may roll once more, but then you must keep the second. Playing well, what's the game worth?`
      : `Roll a fair ${sides}-sided die and be paid the result in dollars. You may reroll up to twice, keeping the last roll. Playing well, what's the game worth?`;
  return problem(
    `reroll-${sides}-${rerolls}`,
    prompt,
    rerollValue(sides, rerolls),
    "dollars",
    [
      {
        label: rerolls === 1 ? "A fresh roll is worth" : "Rolling again is worth",
        work: rerolls === 1 ? `(1 + ${sides}) ÷ 2` : `the one-reroll game`,
        result: formatDollars(fresh),
      },
      { label: `Keep ${keepFrom} or more, since they beat ${formatDollars(fresh)}`, work: `${keepCount} of ${sides} faces, averaging ${formatResult(keptAverage, "number")}` },
      {
        label: "The game is worth",
        work: `${frac(keepCount, sides)} × ${formatResult(keptAverage, "number")} + ${frac(sides - keepCount, sides)} × ${formatResult(fresh, "number")}`,
      },
    ],
    params,
  );
}

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

function waitForIt(params: { event: string }) {
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

function oddsToChance(
  params:
    | { type: "against"; against: number; for: number }
    | { type: "decimal"; hundredths: number }
    | { type: "american"; line: number },
) {
  switch (params.type) {
    case "against": {
      const { against, for: forOdds } = params;
      return problem(
        `against-${against}-${forOdds}`,
        `A horse is ${against} to ${forOdds} against. What chance of winning do those odds imply?`,
        q(forOdds, against + forOdds),
        "percent",
        [
          { label: "Wins", work: `${forOdds} in every ${against} + ${forOdds}`, result: `${forOdds}/${against + forOdds}` },
          { label: "Chance", work: `${forOdds} ÷ ${against + forOdds}` },
        ],
        params,
      );
    }
    case "decimal": {
      const { hundredths } = params;
      const odds = (hundredths / 100).toFixed(2);
      return problem(
        `decimal-${hundredths}`,
        `A bookmaker offers decimal odds of ${odds}: a $1 bet returns $${odds} in total if it wins. What chance does that imply?`,
        q(100, hundredths),
        "percent",
        [
          { label: "Decimal odds are 1 ÷ chance", work: `${odds} = 1 ÷ chance` },
          { label: "Chance", work: `1 ÷ ${odds}` },
        ],
        params,
      );
    }
    case "american": {
      const { line } = params;
      const favourite = line < 0;
      const stake = Math.abs(line);
      const chance = favourite ? q(stake, stake + 100) : q(100, line + 100);
      return problem(
        `american-${line}`,
        favourite
          ? `A team is −${stake}: you bet $${stake} to win $100. What chance does that imply?`
          : `A team is +${line}: a $100 bet wins $${line}. What chance does that imply?`,
        chance,
        "percent",
        [
          { label: "You risk", work: favourite ? `$${stake} to win $100` : `$100 to win $${line}` },
          { label: "Chance is risk ÷ (risk + win)", work: favourite ? `${stake} ÷ ${stake + 100}` : `100 ÷ ${line + 100}` },
        ],
        params,
      );
    }
  }
}

function potOdds(params: { pot: number; bet: number }) {
  const { pot, bet } = params;
  const total = pot + 2 * bet;
  return problem(
    `pot-${pot}-${bet}`,
    `There's $${pot} in the pot and your opponent bets $${bet}. What's the least chance of winning that makes calling the $${bet} break even?`,
    q(bet, total),
    "percent",
    [
      { label: "Pot after you call", work: `${pot} + ${bet} + ${bet}`, result: `$${total}` },
      { label: "Your call ÷ that pot", work: `${bet} ÷ ${total}` },
    ],
    params,
  );
}

const ROULETTE_BETS: { id: string; label: string; numbers: number; pays: number }[] = [
  { id: "straight", label: "a single number, which pays 35 to 1", numbers: 1, pays: 35 },
  { id: "split", label: "a split (two numbers), which pays 17 to 1", numbers: 2, pays: 17 },
  { id: "street", label: "a street (three numbers), which pays 11 to 1", numbers: 3, pays: 11 },
  { id: "corner", label: "a corner (four numbers), which pays 8 to 1", numbers: 4, pays: 8 },
  { id: "dozen", label: "a dozen (12 numbers), which pays 2 to 1", numbers: 12, pays: 2 },
  { id: "red", label: "red (18 numbers), which pays 1 to 1", numbers: 18, pays: 1 },
];

function houseEdge(params: { type: "roulette"; wheel: 37 | 38; bet: string } | { type: "die"; pays: number }) {
  if (params.type === "die") {
    const { pays } = params;
    const edge = q(5 - pays, 6);
    return problem(
      `die-${pays}`,
      `A dice game pays ${pays} to 1 if you call the number a fair die lands on. What's the house edge, as a share of each bet?`,
      edge,
      "percent",
      [
        { label: "Win", work: `$${pays} × 1/6`, result: formatDollars(q(pays, 6)) },
        { label: "Lose", work: "$1 × 5/6", result: formatDollars(q(5, 6)) },
        { label: "Average loss per $1", work: `(5 − ${pays}) ÷ 6` },
      ],
      params,
    );
  }
  const { wheel, bet: betId } = params;
  const bet = ROULETTE_BETS.find((b) => b.id === betId)!;
  const losing = wheel - bet.numbers;
  const edge = q(losing - bet.numbers * bet.pays, wheel);
  return problem(
    `roulette-${wheel}-${bet.id}`,
    `${wheel === 38 ? "An American" : "A European"} roulette wheel has ${wheel} pockets. You bet $1 on ${bet.label}. What's the house edge?`,
    edge,
    "percent",
    [
      { label: "Win", work: `$${bet.pays} × ${bet.numbers}/${wheel}`, result: `$${bet.pays * bet.numbers}/${wheel}` },
      { label: "Lose", work: `$1 × ${losing}/${wheel}`, result: `$${losing}/${wheel}` },
      { label: "Average loss per $1", work: `(${losing} − ${bet.pays * bet.numbers}) ÷ ${wheel}` },
    ],
    params,
  );
}

function kelly(params: { winPercent: number; pays: number }) {
  const { winPercent, pays } = params;
  const p = q(winPercent, 100);
  const lose = sub(q(1), p);
  const fraction = sub(p, div(lose, q(pays)));
  return problem(
    `kelly-${winPercent}-${pays}`,
    `A bet wins ${winPercent}% of the time and pays ${pays} to 1. What share of your bankroll does the Kelly rule say to stake?`,
    fraction,
    "percent",
    [
      { label: "Chance to lose", work: `100% − ${winPercent}%`, result: formatPercent(lose) },
      { label: "Chance to lose ÷ payout", work: `${formatPercent(lose)} ÷ ${pays}`, result: formatPercent(div(lose, q(pays))) },
      { label: "Bet: chance to win − that", work: `${winPercent}% − ${formatPercent(div(lose, q(pays)))}` },
    ],
    params,
  );
}

// Kelly bets worth making: the edge is positive.
const KELLY_BETS = [
  [55, 1], [60, 1], [65, 1], [70, 1], [75, 1], [40, 2], [50, 2], [60, 2], [30, 3], [40, 3], [25, 4], [30, 4], [20, 5],
] as const;

// ─── Harder problems ────────────────────────────────────────────────────────────────────

/** 2598960 → "2,598,960". */
const commas = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => String(n).replace(/\d/g, (digit) => SUPERSCRIPTS[Number(digit)]);

export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

type CombinationsParams =
  | { type: "hearts"; cards: number; hearts: number }
  | { type: "heads"; flips: number; heads: number }
  | { type: "team"; men: number; women: number; size: number; picked: number };

function combinations(params: CombinationsParams): QuantProblem {
  if (params.type === "hearts") {
    const { cards, hearts } = params;
    const good = choose(13, hearts) * choose(39, cards - hearts);
    const all = choose(52, cards);
    return problem(
      `hearts-${cards}-${hearts}`,
      `You're dealt ${cards} cards from a shuffled deck. What's the chance exactly ${hearts} ${hearts === 1 ? "is a heart" : "are hearts"}?`,
      q(good, all),
      // Hand counts reduce to unwieldy fractions (9139/33320), so these ask for a percentage.
      "percent",
      [
        {
          label: `Hands with ${hearts} ${hearts === 1 ? "heart" : "hearts"}`,
          work: `C(13, ${hearts}) × C(39, ${cards - hearts}) = ${commas(choose(13, hearts))} × ${commas(choose(39, cards - hearts))}`,
          result: commas(good),
        },
        { label: `All ${cards}-card hands`, work: `C(52, ${cards})`, result: commas(all) },
        { label: "Chance", work: `${commas(good)} ÷ ${commas(all)}` },
      ],
      params,
    );
  }
  if (params.type === "heads") {
    const { flips, heads } = params;
    const ways = choose(flips, heads);
    return problem(
      `heads-${flips}-${heads}`,
      `You flip a fair coin ${flips} times. What's the chance of exactly ${heads} ${heads === 1 ? "head" : "heads"}?`,
      q(ways, 2 ** flips),
      "probability",
      [
        { label: `Ways to place ${heads} ${heads === 1 ? "head" : "heads"}`, work: `C(${flips}, ${heads})`, result: `${ways}` },
        { label: "All outcomes", work: `2${sup(flips)}`, result: `${2 ** flips}` },
        { label: "Chance", work: `${ways}/${2 ** flips}` },
      ],
      params,
    );
  }
  const { men, women, size, picked } = params;
  const good = choose(women, picked) * choose(men, size - picked);
  const all = choose(men + women, size);
  return problem(
    `team-${men}-${women}-${size}-${picked}`,
    `A team of ${size} is picked at random from ${men} men and ${women} women. What's the chance it has exactly ${picked} ${picked === 1 ? "woman" : "women"}?`,
    q(good, all),
    "probability",
    [
      {
        label: `Teams with ${picked} ${picked === 1 ? "woman" : "women"}`,
        work: `C(${women}, ${picked}) × C(${men}, ${size - picked}) = ${choose(women, picked)} × ${choose(men, size - picked)}`,
        result: `${good}`,
      },
      { label: "All teams", work: `C(${men + women}, ${size})`, result: `${all}` },
      { label: "Chance", work: `${good}/${all}` },
    ],
    params,
  );
}

function meetingProblem(params: { window: number; wait: number }): QuantProblem {
  const { window, wait } = params;
  const gap = window - wait;
  const miss = q(gap * gap, window * window);
  const span = window === 60 ? "within the same hour" : "within the same half hour";
  return problem(
    `meet-${window}-${wait}`,
    `Two friends each arrive at a random time ${span}. Whoever comes first waits ${wait} minutes, then leaves. What's the chance they meet?`,
    sub(q(1), miss),
    "probability",
    [
      { label: `Chance they arrive over ${wait} min apart`, work: `(${gap}/${window})²`, result: formatFraction(miss) },
      { label: "Chance they meet", work: `1 − ${formatFraction(miss)}` },
    ],
    params,
  );
}

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

const COLLECTIONS: { id: string; sides: number; prompt: string }[] = [
  ...[3, 4, 6, 8, 10, 12].map((sides) => ({
    id: `die-${sides}`,
    sides,
    prompt: `You roll a fair ${sides}-sided die until every face has come up at least once. How many rolls do you expect it to take?`,
  })),
  {
    id: "suits",
    sides: 4,
    prompt: "You draw a card, note its suit, and put it back, until you've seen all four suits. How many draws do you expect it to take?",
  },
  ...[3, 5].map((sides) => ({
    id: `prizes-${sides}`,
    sides,
    prompt: `Each cereal box holds one of ${sides} toys, all equally likely. How many boxes do you expect to open to get every toy?`,
  })),
];

function collectThemAll(params: { collection: string }): QuantProblem {
  const collection = COLLECTIONS.find((c) => c.id === params.collection)!;
  const n = collection.sides;
  let expected = q(0);
  for (let k = 1; k <= n; k++) expected = add(expected, q(n, k));
  const harmonic = n <= 6
    ? Array.from({ length: n }, (_, i) => (i === 0 ? "1" : `1/${i + 1}`)).join(" + ")
    : `1 + 1/2 + … + 1/${n}`;
  return problem(
    `collect-${collection.id}`,
    collection.prompt,
    expected,
    "number",
    [
      { label: `With k of ${n} seen, a new one takes`, work: `${n} ÷ (${n} − k) tries on average`, result: "" },
      { label: `Add them for k = 0 to ${n - 1}`, work: `${n} × (${harmonic})` },
    ],
    params,
  );
}

/** Lengths k where the pattern's first k symbols match its last k (the whole pattern counts). */
export function patternOverlaps(pattern: string[]) {
  return Array.from({ length: pattern.length }, (_, i) => i + 1).filter((k) =>
    pattern.slice(0, k).every((symbol, i) => symbol === pattern[pattern.length - k + i]),
  );
}

function patternWait(params: { type: "coin" | "die"; pattern: string }): QuantProblem {
  const symbols = params.pattern.split(" ");
  const base = params.type === "coin" ? 2 : 6;
  const overlaps = patternOverlaps(symbols);
  const expected = overlaps.reduce((sum, k) => sum + base ** k, 0);
  const shown = (k: number) => symbols.slice(0, k).join(" ");
  const prompt =
    params.type === "coin"
      ? `You flip a fair coin until the last ${symbols.length} flips are ${params.pattern}. How many flips do you expect it to take?`
      : `You roll a fair die until the last ${symbols.length} rolls are ${params.pattern}. How many rolls do you expect it to take?`;
  return problem(
    `pattern-${params.type}-${symbols.join("")}`,
    prompt,
    q(expected),
    "number",
    [
      { label: "Where the start matches the end", work: overlaps.map((k) => `${shown(k)}`).join(", "), result: "" },
      { label: `Add ${base} to the power of each length`, work: overlaps.map((k) => `${base}${sup(k)}`).join(" + ") },
    ],
    params,
  );
}

function gamblersRuin(params: { start: number; target: number; winN: number; winD: number; ask: "reach" | "broke" }): QuantProblem {
  const { start, target, ask } = params;
  const win = q(params.winN, params.winD);
  const fair = win.n * 2 === win.d;
  const chanceText = fair ? "fair coin flips" : `bets that each win with chance ${formatFraction(win)}`;
  const prompt = `You have $${start} and bet $1 at a time on ${chanceText}. You stop when you reach $${target} or go broke. What's the chance you ${ask === "reach" ? `reach $${target}` : "go broke"}?`;
  let reach: Rational;
  const steps: { label: string; work: string; result?: string }[] = [];
  if (fair) {
    reach = q(start, target);
    steps.push({ label: "Fair bets: start ÷ target", work: `${start} ÷ ${target}`, result: formatFraction(reach) });
  } else {
    const r = div(sub(q(1), win), win);
    reach = div(sub(pow(r, start), q(1)), sub(pow(r, target), q(1)));
    const rText = formatFraction(r);
    steps.push({ label: "r = lose chance ÷ win chance", work: `${formatFraction(sub(q(1), win))} ÷ ${formatFraction(win)}`, result: rText });
    steps.push({
      label: `Chance to reach $${target}`,
      work: `(r${sup(start)} − 1) ÷ (r${sup(target)} − 1)`,
      result: formatFraction(reach),
    });
  }
  if (ask === "broke") steps.push({ label: "Chance to go broke", work: `1 − ${formatFraction(reach)}` });
  return problem(
    `ruin-${start}-${target}-${params.winN}-${params.winD}-${ask}`,
    prompt,
    ask === "reach" ? reach : sub(q(1), reach),
    "probability",
    steps,
    params,
  );
}

const COIN_PATTERNS = ["H H", "H T", "T T", "H H H", "H H T", "H T H", "H T T", "T H H", "H H H H", "H T H T", "H H T H", "H T T H"];
const DIE_PATTERNS = ["6 6", "6 1", "6 6 6", "6 1 6", "1 2 3"];
const RUIN_ODDS = [[1, 2], [1, 2], [2, 5], [3, 5], [1, 3], [2, 3], [9, 20]] as const;

export const QUANT_LESSONS: QuantLesson[] = [
  {
    id: "count-outcomes",
    topic: "probability",
    title: "Basic probability",
    benefit: "Find the chance of a card, roll or flip",
    idea: "If every outcome is equally likely, the chance is the outcomes you want divided by all the outcomes.",
    targetSeconds: 15,
    example: countOutcomes({ type: "card", event: "heart-or-king" }),
    generate: (random) =>
      random() < 0.5
        ? countOutcomes({ type: "card", event: pick(random, CARD_EVENTS).id })
        : (() => {
            const sides = pick(random, DIE_SIDES);
            return countOutcomes({ type: "die", sides, atLeast: int(random, 2, sides - 1) });
          })(),
  },
  {
    id: "two-dice",
    topic: "probability",
    title: "Two-dice totals",
    benefit: "Find the chance of a total on two dice",
    idea: "Two dice can land 36 ways. Count the ways that make your total, then divide by 36.",
    targetSeconds: 20,
    example: twoDice({ type: "exactly", total: 9 }),
    generate: (random) => {
      const roll = random();
      if (roll < 0.1) return twoDice({ type: "double", total: 0 });
      if (roll < 0.6) return twoDice({ type: "exactly", total: int(random, 3, 11) });
      return twoDice({ type: "at-least", total: int(random, 8, 11) });
    },
  },
  {
    id: "at-least-one",
    topic: "probability",
    title: "The complement rule",
    benefit: "Find the chance of “at least one”",
    idea: "The chance of at least one is 1 minus the chance of none.",
    targetSeconds: 30,
    example: atLeastOne({ type: "sixes", rolls: 3 }),
    generate: (random) =>
      pick(random, [
        () => atLeastOne({ type: "sixes", rolls: int(random, 2, 4) }),
        () => atLeastOne({ type: "low", rolls: int(random, 2, 4) }),
        () => atLeastOne({ type: "heads", flips: int(random, 3, 7) }),
        () => atLeastOne({ type: "ace", cards: int(random, 2, 3) }),
      ])(),
  },
  {
    id: "in-a-row",
    topic: "probability",
    title: "Draws in a row",
    benefit: "Find the chance two cards are both aces",
    idea: "Multiply the chance of each draw. If you don’t put things back, there are fewer left each time.",
    targetSeconds: 30,
    example: inARow({ type: "bag", red: 5, blue: 3, draws: 2 }),
    generate: (random) => {
      if (random() < 0.3) return inARow({ type: "cards", event: pick(random, DRAW_EVENTS).id });
      const red = int(random, 3, 7);
      return inARow({ type: "bag", red, blue: int(random, 2, 6), draws: int(random, 2, 3) });
    },
  },
  {
    id: "picture-the-crowd",
    topic: "probability",
    title: "Bayes’ theorem",
    benefit: "Update a chance with new information",
    idea: "Count every case that fits what you know. The answer is the share of those cases you’re asked about.",
    targetSeconds: 40,
    example: pictureTheCrowd({ type: "coins", fair: 1, rigged: 1, flips: 1 }),
    generate: (random) => {
      if (random() < 0.45) {
        return pictureTheCrowd({ type: "coins", fair: int(random, 1, 4), rigged: int(random, 1, 2), flips: int(random, 1, 3) });
      }
      const people = pick(random, [100, 200, 500, 1000]);
      const sick = pick(random, [5, 10, 20, 50].filter((n) => n * 4 <= people));
      const caught = Math.round(sick * pick(random, [0.8, 0.9, 1]));
      const falseAlarms = Math.round((people - sick) * pick(random, [0.02, 0.05, 0.1]));
      return pictureTheCrowd({ type: "test", people, sick, caught, falseAlarms });
    },
  },
  {
    id: "weigh-the-payouts",
    topic: "expected-value",
    title: "Pricing a game",
    benefit: "Find what a game pays on average",
    idea: "Multiply each payout by its chance and add them up. That’s what the game pays on average.",
    targetSeconds: 30,
    example: weighThePayouts({ type: "game", six: 12, five: 6, cost: 2 }),
    generate: (random) =>
      random() < 0.3
        ? weighThePayouts({ type: "face", sides: pick(random, DIE_SIDES) })
        : weighThePayouts({ type: "game", six: pick(random, [6, 8, 10, 12, 15, 18, 20]), five: pick(random, [1, 2, 3, 4, 5, 6]), cost: int(random, 1, 4) }),
  },
  {
    id: "add-the-averages",
    topic: "expected-value",
    title: "Linearity of expectation",
    benefit: "Find the average of a total by parts",
    idea: "The average of a total is the averages of its parts added up, even when the parts affect each other.",
    targetSeconds: 25,
    example: addTheAverages({ type: "aces", cards: 5 }),
    generate: (random) =>
      pick(random, [
        () => addTheAverages({ type: "dice-total", dice: int(random, 3, 12) }),
        () => addTheAverages({ type: "sixes", rolls: pick(random, [9, 10, 15, 20, 30, 50]) }),
        () => addTheAverages({ type: "hearts", cards: int(random, 3, 13) }),
        () => addTheAverages({ type: "aces", cards: int(random, 3, 13) }),
        () => addTheAverages({ type: "envelopes", letters: int(random, 4, 20) }),
      ])(),
  },
  {
    id: "reroll-or-keep",
    topic: "expected-value",
    title: "Optimal stopping",
    benefit: "Decide when to keep a roll or reroll",
    idea: "Keep a roll if it’s higher than what a reroll pays on average. Otherwise, reroll.",
    targetSeconds: 45,
    example: rerollOrKeep({ sides: 6, rerolls: 1 }),
    generate: (random) =>
      random() < 0.75
        ? rerollOrKeep({ sides: pick(random, DIE_SIDES), rerolls: 1 })
        : rerollOrKeep({ sides: pick(random, [4, 6] as const), rerolls: 2 }),
  },
  {
    id: "wait-for-it",
    topic: "expected-value",
    title: "Expected waiting time",
    benefit: "Find how many tries it takes on average",
    idea: "If each try works with chance p, it takes 1 ÷ p tries on average.",
    targetSeconds: 20,
    example: waitForIt({ event: "five-six" }),
    generate: (random) => waitForIt({ event: pick(random, WAITS).id }),
  },
  {
    id: "odds-to-chance",
    topic: "betting",
    title: "Implied probability",
    benefit: "Turn betting odds into a chance",
    idea: "Odds are another way to write a chance. 3 to 1 against means you win 1 time in every 4.",
    targetSeconds: 20,
    example: oddsToChance({ type: "against", against: 3, for: 1 }),
    generate: (random) =>
      pick(random, [
        () => {
          const [against, forOdds] = pick(random, [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [9, 1], [3, 2], [5, 2], [7, 2], [5, 4], [7, 4]] as const);
          return oddsToChance({ type: "against", against, for: forOdds });
        },
        () => oddsToChance({ type: "decimal", hundredths: pick(random, [125, 150, 200, 250, 400, 500, 800]) }),
        () => oddsToChance({ type: "american", line: pick(random, [-400, -300, -200, -150, 150, 200, 300, 400]) }),
      ])(),
  },
  {
    id: "pot-odds",
    topic: "betting",
    title: "Pot odds",
    benefit: "Decide if a poker call is worth it",
    idea: "A call is worth it if your chance of winning is more than your call divided by the pot after you call.",
    targetSeconds: 25,
    example: potOdds({ pot: 60, bet: 20 }),
    generate: (random) => potOdds({ pot: pick(random, [20, 40, 50, 60, 80, 100, 150, 200]), bet: pick(random, [10, 20, 25, 30, 40, 50, 100]) }),
  },
  {
    id: "house-edge",
    topic: "betting",
    title: "House edge",
    benefit: "Find how much a casino bet costs you",
    idea: "The house edge is how much you lose, on average, for every $1 you bet.",
    targetSeconds: 30,
    example: houseEdge({ type: "roulette", wheel: 38, bet: "straight" }),
    generate: (random) =>
      random() < 0.2
        ? houseEdge({ type: "die", pays: int(random, 3, 4) })
        : houseEdge({ type: "roulette", wheel: pick(random, [37, 38] as const), bet: pick(random, ROULETTE_BETS).id }),
  },
  {
    id: "kelly",
    topic: "betting",
    title: "The Kelly criterion",
    benefit: "Find how much of your money to bet",
    idea: "Bet this share of your money: your chance of winning, minus your chance of losing divided by the payout.",
    targetSeconds: 30,
    example: kelly({ winPercent: 60, pays: 1 }),
    generate: (random) => {
      const [winPercent, pays] = pick(random, KELLY_BETS);
      return kelly({ winPercent, pays });
    },
  },
  {
    id: "combinations",
    topic: "harder",
    title: "Combinations",
    benefit: "Find the chance of a hand or a team",
    idea: "C(n, k), said “n choose k”, is the number of ways to pick k things from n. The chance is the good picks ÷ all picks.",
    targetSeconds: 60,
    example: combinations({ type: "hearts", cards: 5, hearts: 2 }),
    generate: (random) =>
      pick(random, [
        () => {
          const cards = int(random, 3, 6);
          // At most 3 hearts, so the chance stays above 1% and types cleanly.
          return combinations({ type: "hearts", cards, hearts: int(random, 1, Math.min(cards - 1, 3)) });
        },
        () => {
          const flips = int(random, 4, 10);
          const edge = flips >= 8 ? 2 : 1;
          return combinations({ type: "heads", flips, heads: int(random, edge, flips - edge) });
        },
        () => {
          const men = int(random, 3, 7), women = int(random, 3, 7), size = int(random, 3, 5);
          return combinations({ type: "team", men, women, size, picked: int(random, Math.max(1, size - men), Math.min(size - 1, women)) });
        },
      ])(),
  },
  {
    id: "meeting-problem",
    topic: "harder",
    title: "The meeting problem",
    benefit: "Find the chance two people meet",
    idea: "Draw both arrival times as a square. They miss when they arrive too far apart, which is two corner triangles. Chance they meet = 1 − the triangles’ share.",
    targetSeconds: 45,
    example: meetingProblem({ window: 60, wait: 15 }),
    generate: (random) =>
      random() < 0.7
        ? meetingProblem({ window: 60, wait: pick(random, [5, 10, 12, 20, 24, 30, 36, 40, 45]) })
        : meetingProblem({ window: 30, wait: pick(random, [5, 6, 10, 12, 15, 20]) }),
  },
  {
    id: "highest-lowest",
    topic: "harder",
    title: "Highest and lowest rolls",
    benefit: "Find the average highest or lowest roll",
    idea: "Count the ways the highest roll is each value k. The average is each value times its ways, added up, then divided by all the ways.",
    targetSeconds: 60,
    example: highestOrLowest({ type: "highest", dice: 2, sides: 6 }),
    generate: (random) => {
      const dice = random() < 0.6 ? 2 : 3;
      const sides = pick(random, dice === 2 ? [4, 6, 8, 10] : [4, 6, 8]);
      return highestOrLowest({ type: random() < 0.6 ? "highest" : "lowest", dice, sides });
    },
  },
  {
    id: "coupon-collector",
    topic: "harder",
    title: "The coupon collector",
    benefit: "Find the rolls needed to see every face",
    idea: "Once you’ve seen k of n faces, a new one comes up with chance (n − k) ÷ n, so it takes n ÷ (n − k) rolls on average. Add these up.",
    targetSeconds: 45,
    example: collectThemAll({ collection: "die-6" }),
    generate: (random) => collectThemAll({ collection: pick(random, COLLECTIONS).id }),
  },
  {
    id: "pattern-wait",
    topic: "harder",
    title: "Waiting for a pattern",
    benefit: "Find the average flips until HTH shows",
    idea: "Find every length where the pattern’s start matches its end, including the whole pattern. For a coin, add 2 to the power of each length; for a die, 6.",
    targetSeconds: 45,
    example: patternWait({ type: "coin", pattern: "H T H" }),
    generate: (random) =>
      random() < 0.75
        ? patternWait({ type: "coin", pattern: pick(random, COIN_PATTERNS) })
        : patternWait({ type: "die", pattern: pick(random, DIE_PATTERNS) }),
  },
  {
    id: "gamblers-ruin",
    topic: "harder",
    title: "Gambler’s ruin",
    benefit: "Find the chance a gambler goes broke",
    idea: "With fair bets, the chance of reaching the target is start ÷ target. With unfair bets, let r = lose chance ÷ win chance. Starting with $a and aiming for $N, the chance is (rᵃ − 1) ÷ (rᴺ − 1).",
    targetSeconds: 60,
    example: gamblersRuin({ start: 3, target: 6, winN: 2, winD: 5, ask: "reach" }),
    generate: (random) => {
      const [winN, winD] = pick(random, RUIN_ODDS);
      const target = int(random, 4, 8);
      return gamblersRuin({ start: int(random, 1, target - 1), target, winN, winD, ask: random() < 0.5 ? "reach" : "broke" });
    },
  },
];

/** The first lesson of each topic is free; the rest are Pro. */
export const FREE_QUANT_LESSON_IDS: readonly QuantLessonId[] = QUANT_TOPICS.map(
  (topic) => QUANT_LESSONS.find((lesson) => lesson.topic === topic.id)!.id,
);

export function isFreeQuantLesson(id: string) {
  return (FREE_QUANT_LESSON_IDS as readonly string[]).includes(id);
}

export function getQuantLesson(id: string): QuantLesson | null {
  return QUANT_LESSONS.find((lesson) => lesson.id === id) ?? null;
}

/** A lesson's set: different problems, starting from ones unlike the worked example. */
export function createQuantLessonProblems(lesson: QuantLesson, random: Random = Math.random): QuantProblem[] {
  const problems: QuantProblem[] = [];
  const seen = new Set<string>([lesson.example.key]);
  for (let tries = 0; problems.length < QUANT_SET_SIZE && tries < 500; tries++) {
    const next = lesson.generate(random);
    if (seen.has(next.key)) continue;
    seen.add(next.key);
    problems.push(next);
  }
  return problems;
}

export function isQuantLessonMastered(
  lesson: QuantLesson,
  result: { soloCount: number; soloFirstTry: number; soloAverageSeconds: number | null },
) {
  return (
    result.soloCount >= QUANT_SOLO &&
    result.soloFirstTry >= QUANT_MASTERY_FIRST_TRY &&
    result.soloAverageSeconds !== null &&
    result.soloAverageSeconds <= lesson.targetSeconds
  );
}
