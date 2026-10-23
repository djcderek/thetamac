import { add, div, formatDollars, formatFraction, formatResult, mul, pow, q, sub } from "../rational";
import { DIE_SIDES, int, pick, problem, sup, type QuantLessonDef } from "../build";

// ─── Expected value ──────────────────────────────────────────────────────────────────────

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

/** Expected sum or product of two fair n-sided dice. */
function twoDiceAverage(params: { type: "sum" | "product"; sides: number }) {
  const { type, sides } = params;
  const one = q(sides + 1, 2);
  const oneText = formatResult(one, "number");
  return problem(
    `${type}-${sides}`,
    `You roll two fair ${sides}-sided dice. What's the ${type === "sum" ? "total" : "product of the two numbers"} on average?`,
    type === "sum" ? add(one, one) : mul(one, one),
    "number",
    [
      { label: "One die averages", work: `(1 + ${sides}) ÷ 2`, result: oneText },
      type === "sum"
        ? { label: "Averages add", work: `${oneText} + ${oneText}` }
        : { label: "Independent dice: averages multiply", work: `${oneText} × ${oneText}` },
    ],
    params,
  );
}

const HEAD_CHANCES = [q(1, 2), q(1, 2), q(2, 3), q(3, 4), q(1, 3), q(3, 5)] as const;

/** Flip until tails, paid per head: heads before the first tails average p ÷ (1 − p). */
function flipUntilTails(params: { headsN: number; headsD: number; pay: number }) {
  const heads = q(params.headsN, params.headsD);
  const tails = sub(q(1), heads);
  const fair = heads.n * 2 === heads.d;
  const perHead = div(heads, tails);
  return problem(
    `tails-${params.headsN}-${params.headsD}-${params.pay}`,
    `You flip ${fair ? "a fair coin" : `a coin that lands heads with chance ${formatFraction(heads)}`} until it lands tails, and win $${params.pay} for each head before that. What's the game worth on average?`,
    mul(perHead, q(params.pay)),
    "dollars",
    [
      { label: "Average heads before tails: heads ÷ tails chance", work: `${formatFraction(heads)} ÷ ${formatFraction(tails)}`, result: formatResult(perHead, "number") },
      { label: `$${params.pay} for each`, work: `$${params.pay} × ${formatResult(perHead, "number")}` },
    ],
    params,
  );
}

/** A card game's fair price: what it pays on average. */
function cardPrice(params: { ace: number; face: number }) {
  const { ace, face } = params;
  return problem(
    `price-${ace}-${face}`,
    `You draw one card from a shuffled deck. An ace pays $${ace}, a face card (J, Q or K) pays $${face}, and anything else pays nothing. What's a fair price to play?`,
    q(4 * ace + 12 * face, 52),
    "dollars",
    [
      { label: "Ace", work: `$${ace} × 4/52`, result: formatDollars(q(4 * ace, 52)) },
      { label: "Face card", work: `$${face} × 12/52`, result: formatDollars(q(12 * face, 52)) },
      { label: "Fair price is the average payout", work: `(${4 * ace} + ${12 * face}) ÷ 52` },
    ],
    params,
  );
}

// ─── Linearity of expectation ────────────────────────────────────────────────────────────

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

const FIRST_CARDS = [
  { id: "ace", one: "ace", many: "aces", count: 4 },
  { id: "king", one: "king", many: "kings", count: 4 },
  { id: "heart", one: "heart", many: "hearts", count: 13 },
  { id: "face", one: "face card", many: "face cards", count: 12 },
  { id: "spade", one: "spade", many: "spades", count: 13 },
];

/** Where the first of t target cards turns up: each other card comes before all of them 1 time in t + 1. */
function firstCard(params: { card: string }) {
  const card = FIRST_CARDS.find((c) => c.id === params.card)!;
  const t = card.count;
  const before = q(52 - t, t + 1);
  return problem(
    `first-${card.id}`,
    `You turn over the cards of a shuffled deck one at a time. On average, at which card does the first ${card.one} appear?`,
    add(q(1), before),
    "number",
    [
      { label: `Each other card comes before all ${t} ${card.many}`, work: `1 time in ${t + 1}`, result: `1/${t + 1}` },
      { label: `Other cards before the first ${card.one}`, work: `${52 - t} × 1/${t + 1}`, result: formatResult(before, "number") },
      { label: `The first ${card.one}’s position`, work: `1 + ${formatResult(before, "number")}` },
    ],
    params,
  );
}

/** Distinct picks among n equally likely options in k tries: n × (1 − (1 − 1/n)^k). */
function distinctPicks(params: { type: "elevator" | "faces"; options: number; tries: number }) {
  const { type, options: n, tries: k } = params;
  const none = pow(q(n - 1, n), k);
  const hit = sub(q(1), none);
  const prompt =
    type === "elevator"
      ? `${k} people get into an elevator. Each picks one of ${n} floors at random. How many different floors do you expect it to stop at?`
      : `You roll a fair ${n}-sided die ${k} times. How many different numbers do you expect to see?`;
  const one = type === "elevator" ? "floor" : "number";
  const picked = type === "elevator" ? "picked" : "rolled";
  return problem(
    `${type}-${n}-${k}`,
    prompt,
    mul(q(n), hit),
    "number",
    [
      // Exact fractions, so each line's arithmetic matches the answer.
      { label: `A given ${one} is never ${picked}`, work: `(${n - 1}/${n})${sup(k)}`, result: formatFraction(none) },
      { label: `A given ${one} is ${picked} at least once`, work: `1 − ${formatFraction(none)}`, result: formatFraction(hit) },
      { label: `Across all ${n} ${one}s`, work: `${n} × ${formatFraction(hit)}` },
    ],
    params,
  );
}

// ─── Variance and standard deviation ─────────────────────────────────────────────────────

function variance(
  params:
    | { type: "die"; sides: number }
    | { type: "dice-sum"; dice: number }
    | { type: "heads"; flips: number; headsN: number; headsD: number }
    | { type: "heads-sd"; flips: number }
    | { type: "bet"; win: number; lose: number; chanceN: number; chanceD: number },
) {
  switch (params.type) {
    case "die": {
      const n = params.sides;
      const squares = q((n + 1) * (2 * n + 1), 6);
      const mean = q(n + 1, 2);
      return problem(
        `die-${n}`,
        `You roll a fair ${n}-sided die once. What's the variance of the number rolled?`,
        sub(squares, mul(mean, mean)),
        "number",
        [
          { label: "Average of the squares", work: `(1² + 2² + … + ${n}²) ÷ ${n}`, result: formatResult(squares, "number") },
          { label: "Square of the average", work: `${formatResult(mean, "number")}²`, result: formatResult(mul(mean, mean), "number") },
          { label: "Variance", work: `${formatResult(squares, "number")} − ${formatResult(mul(mean, mean), "number")}` },
        ],
        params,
      );
    }
    case "dice-sum": {
      const one = q(35, 12);
      return problem(
        `dice-sum-${params.dice}`,
        `You roll ${params.dice} fair dice. What's the variance of the total?`,
        mul(q(params.dice), one),
        "number",
        [
          { label: "One die’s variance", work: "91/6 − 3.5²", result: "35/12" },
          { label: "Variances of independent dice add", work: `${params.dice} × 35/12` },
        ],
        params,
      );
    }
    case "heads": {
      const p = q(params.headsN, params.headsD);
      const one = mul(p, sub(q(1), p));
      const fair = p.n * 2 === p.d;
      return problem(
        `heads-${params.flips}-${params.headsN}-${params.headsD}`,
        fair
          ? `You flip a fair coin ${params.flips} times. What's the variance of the number of heads?`
          : `A coin lands heads with chance ${formatFraction(p)}. You flip it ${params.flips} times. What's the variance of the number of heads?`,
        mul(q(params.flips), one),
        "number",
        [
          { label: "One flip’s variance", work: `${formatFraction(p)} × ${formatFraction(sub(q(1), p))}`, result: formatFraction(one) },
          { label: `${params.flips} independent flips add`, work: `${params.flips} × ${formatFraction(one)}` },
        ],
        params,
      );
    }
    case "heads-sd": {
      const n = params.flips;
      return problem(
        `heads-sd-${n}`,
        `You flip a fair coin ${n} times. What's the standard deviation of the number of heads?`,
        q(Math.sqrt(n) / 2),
        "number",
        [
          { label: "Variance", work: `${n} × 1/2 × 1/2`, result: `${n / 4}` },
          { label: "Standard deviation is its square root", work: `√${n / 4}` },
        ],
        params,
      );
    }
    case "bet": {
      const { win, lose } = params;
      const p = q(params.chanceN, params.chanceD);
      const miss = sub(q(1), p);
      const mean = sub(mul(p, q(win)), mul(miss, q(lose)));
      const squares = add(mul(p, q(win * win)), mul(miss, q(lose * lose)));
      return problem(
        `bet-${win}-${lose}-${params.chanceN}-${params.chanceD}`,
        `A bet wins $${win} with chance ${formatFraction(p)} and loses $${lose} otherwise. What's the variance of what you make, in squared dollars?`,
        sub(squares, mul(mean, mean)),
        "number",
        [
          { label: "Average", work: `${formatFraction(p)} × ${win} − ${formatFraction(miss)} × ${lose}`, result: formatResult(mean, "number") },
          { label: "Average of the squares", work: `${formatFraction(p)} × ${win}² + ${formatFraction(miss)} × ${lose}²`, result: formatResult(squares, "number") },
          { label: "Variance", work: `${formatResult(squares, "number")} − (${formatResult(mean, "number")})²` },
        ],
        params,
      );
    }
  }
}


export const EXPECTED_VALUE_LESSONS: QuantLessonDef[] = [
  {
    id: "expected-value",
    title: "Expected value",
    benefit: "Find the average result of a game",
    idea: "Multiply each result by its chance and add them up. That’s what the game pays on average, and a fair price to play it.",
    targetSeconds: 30,
    example: weighThePayouts({ type: "game", six: 12, five: 6, cost: 2 }),
    generate: (random) =>
      pick(random, [
        () => weighThePayouts({ type: "face", sides: pick(random, DIE_SIDES) }),
        () =>
          weighThePayouts({
            type: "game",
            six: pick(random, [6, 8, 10, 12, 15, 18, 20]),
            five: pick(random, [1, 2, 3, 4, 5, 6]),
            cost: int(random, 1, 4),
          }),
        () => twoDiceAverage({ type: random() < 0.5 ? "sum" : "product", sides: pick(random, DIE_SIDES) }),
        () => {
          const heads = pick(random, HEAD_CHANCES);
          return flipUntilTails({ headsN: heads.n, headsD: heads.d, pay: pick(random, [1, 2, 5, 10]) });
        },
        () => cardPrice({ ace: pick(random, [5, 10, 13, 20, 26]), face: pick(random, [1, 2, 3, 5]) }),
      ])(),
  },
  {
    id: "linearity",
    title: "Linearity of expectation",
    benefit: "Find an average by adding simple parts",
    idea: "The average of a total is the averages of its parts added up, even when the parts affect each other. Split a count into yes-or-no pieces and add their chances.",
    targetSeconds: 30,
    example: addTheAverages({ type: "aces", cards: 5 }),
    generate: (random) =>
      pick(random, [
        () => addTheAverages({ type: "dice-total", dice: int(random, 3, 12) }),
        () => addTheAverages({ type: "sixes", rolls: pick(random, [9, 10, 15, 20, 30, 50]) }),
        () => addTheAverages({ type: "hearts", cards: int(random, 3, 13) }),
        () => addTheAverages({ type: "aces", cards: int(random, 3, 13) }),
        () => addTheAverages({ type: "envelopes", letters: int(random, 4, 20) }),
        () => firstCard({ card: pick(random, FIRST_CARDS).id }),
        () => distinctPicks({ type: "elevator", options: int(random, 3, 6), tries: int(random, 2, 4) }),
        () => distinctPicks({ type: "faces", options: pick(random, [4, 6]), tries: int(random, 2, 4) }),
      ])(),
  },
  {
    id: "variance",
    title: "Variance and standard deviation",
    benefit: "Measure how spread out results are",
    idea: "Variance is the average of the squares minus the square of the average. For independent parts, variances add. The standard deviation is the square root of the variance.",
    targetSeconds: 45,
    example: variance({ type: "die", sides: 6 }),
    generate: (random) =>
      pick(random, [
        () => variance({ type: "die", sides: pick(random, DIE_SIDES) }),
        () => variance({ type: "dice-sum", dice: int(random, 2, 10) }),
        () => {
          const p = pick(random, [q(1, 2), q(1, 3), q(1, 4), q(2, 3), q(3, 4)]);
          return variance({ type: "heads", flips: pick(random, [10, 12, 20, 30, 36, 48, 60]), headsN: p.n, headsD: p.d });
        },
        () => variance({ type: "heads-sd", flips: pick(random, [16, 36, 64, 100, 144, 400]) }),
        () => {
          const p = pick(random, [q(1, 2), q(1, 3), q(1, 4), q(2, 5)]);
          return variance({ type: "bet", win: pick(random, [1, 2, 3, 5]), lose: pick(random, [1, 2]), chanceN: p.n, chanceD: p.d });
        },
      ])(),
  },
];
