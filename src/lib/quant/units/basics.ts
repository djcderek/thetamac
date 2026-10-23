import { add, formatFraction, formatPercent, mul, pow, q, sub } from "../rational";
import {
  CARD_EVENTS,
  DECK,
  DIE_SIDES,
  DRAW_EVENTS,
  choose,
  commas,
  int,
  numberWord,
  pairsFor,
  pick,
  problem,
  sup,
  timesWord,
  waysToTotal,
  type Card,
  type QuantLessonDef,
  type QuantProblem,
} from "../build";

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
          { label: `No ${params.type === "sixes" ? "six" : "1 or 2"} in ${rolls} rolls`, work: `(${formatFraction(miss)})${sup(rolls)}`, result: formatFraction(none) },
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
          { label: "Tails every time", work: `(1/2)${sup(flips)}`, result: formatFraction(none) },
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


/** Two rolls of one fair die, compared. */
function compareRolls(params: { type: "compare"; sides: number; ask: "less" | "apart"; gap: number }): QuantProblem {
  const { sides, ask, gap } = params;
  const all = sides * sides;
  if (ask === "less") {
    const ways = (all - sides) / 2;
    return problem(
      `compare-less-${sides}`,
      `You roll a fair ${sides}-sided die twice. What's the chance the first roll is lower than the second?`,
      q(ways, all),
      "probability",
      [
        { label: "Pairs in all", work: `${sides} × ${sides}`, result: `${all}` },
        { label: "Pairs that tie", work: `1-1 up to ${sides}-${sides}`, result: `${sides}` },
        { label: "The rest split evenly: first lower, or first higher", work: `(${all} − ${sides}) ÷ 2`, result: `${ways}` },
        { label: "Chance", work: `${ways}/${all}` },
      ],
      params,
    );
  }
  const ways = 2 * (sides - gap);
  return problem(
    `compare-apart-${sides}-${gap}`,
    `You roll a fair ${sides}-sided die twice. What's the chance the two rolls differ by exactly ${gap}?`,
    q(ways, all),
    "probability",
    [
      { label: `Pairs with the first ${gap} lower`, work: `1-${1 + gap} up to ${sides - gap}-${sides}`, result: `${sides - gap}` },
      { label: `Pairs with the first ${gap} higher`, work: "the same pairs reversed", result: `${sides - gap}` },
      { label: "Chance", work: `${ways}/${all}` },
    ],
    params,
  );
}

/** Two card groups and their overlap, for “A or B” chances. */
export const OR_CARD_EVENTS: { id: string; a: string; b: string; aCount: number; bCount: number; bothCount: number; test: (card: Card) => boolean }[] = [
  { id: "spade-face", a: "a spade", b: "a face card (J, Q or K)", aCount: 13, bCount: 12, bothCount: 3, test: (c) => c.suit === "spades" || c.rank >= 11 },
  { id: "red-ace", a: "red", b: "an ace", aCount: 26, bCount: 4, bothCount: 2, test: (c) => c.suit === "hearts" || c.suit === "diamonds" || c.rank === 1 },
  { id: "king-queen", a: "a king", b: "a queen", aCount: 4, bCount: 4, bothCount: 0, test: (c) => c.rank === 13 || c.rank === 12 },
  { id: "club-low", a: "a club", b: "a 2, 3 or 4", aCount: 13, bCount: 12, bothCount: 3, test: (c) => c.suit === "clubs" || (c.rank >= 2 && c.rank <= 4) },
  { id: "heart-high", a: "a heart", b: "a 10 or higher (10, J, Q, K, ace)", aCount: 13, bCount: 20, bothCount: 5, test: (c) => c.suit === "hearts" || c.rank >= 10 || c.rank === 1 },
  { id: "black-even", a: "black", b: "an even number (2, 4, 6, 8 or 10)", aCount: 26, bCount: 20, bothCount: 10, test: (c) => c.suit === "spades" || c.suit === "clubs" || (c.rank <= 10 && c.rank % 2 === 0) },
];

/** Events on two fair dice (first, second), for “A or B” chances. */
export const OR_DICE_EVENTS: { id: string; a: string; b: string; testA: (x: number, y: number) => boolean; testB: (x: number, y: number) => boolean }[] = [
  { id: "six-ten", a: "the first die shows a 6", b: "the total is 10 or more", testA: (x) => x === 6, testB: (x, y) => x + y >= 10 },
  { id: "one-seven", a: "the first die shows a 1", b: "the total is 7", testA: (x) => x === 1, testB: (x, y) => x + y === 7 },
  { id: "double-eight", a: "the dice show a double", b: "the total is 8", testA: (x, y) => x === y, testB: (x, y) => x + y === 8 },
  { id: "even-high", a: "the total is even", b: "the first die shows 5 or more", testA: (x, y) => (x + y) % 2 === 0, testB: (x) => x >= 5 },
  { id: "both-low-two", a: "both dice are below 4", b: "the second die shows a 2", testA: (x, y) => x <= 3 && y <= 3, testB: (_x, y) => y === 2 },
];

const INDEPENDENT_PAIRS = [
  { id: "rain", a: "it rains on Saturday", b: "it rains on Sunday" },
  { id: "late", a: "your train is late", b: "your bus is late" },
  { id: "pass", a: "Alice passes her test", b: "Ben passes his test" },
  { id: "hit", a: "your first free throw goes in", b: "your second one goes in" },
];

const countPairs = (test: (x: number, y: number) => boolean) => {
  let n = 0;
  for (let x = 1; x <= 6; x++) for (let y = 1; y <= 6; y++) if (test(x, y)) n++;
  return n;
};

type OrParams =
  | { type: "cards"; event: string }
  | { type: "dice"; event: string }
  | { type: "independent"; pair: string; aPercent: number; bPercent: number };

function orEvents(params: OrParams): QuantProblem {
  if (params.type === "cards") {
    const event = OR_CARD_EVENTS.find((e) => e.id === params.event)!;
    const either = event.aCount + event.bCount - event.bothCount;
    return problem(
      `cards-${event.id}`,
      `You draw one card from a shuffled 52-card deck. What's the chance it's ${event.a} or ${event.b}?`,
      q(either, 52),
      "probability",
      [
        { label: `Chance it’s ${event.a}`, work: `${event.aCount}/52` },
        { label: `Chance it’s ${event.b}`, work: `${event.bCount}/52` },
        { label: "Chance it’s both", work: `${event.bothCount}/52` },
        { label: "Either: add, then take off both", work: `(${event.aCount} + ${event.bCount} − ${event.bothCount}) ÷ 52` },
      ],
      params,
    );
  }
  if (params.type === "dice") {
    const event = OR_DICE_EVENTS.find((e) => e.id === params.event)!;
    const a = countPairs(event.testA);
    const b = countPairs(event.testB);
    const both = countPairs((x, y) => event.testA(x, y) && event.testB(x, y));
    return problem(
      `dice-${event.id}`,
      `You roll two fair dice. What's the chance ${event.a}, or ${event.b}?`,
      q(a + b - both, 36),
      "probability",
      [
        { label: `Pairs where ${event.a}`, work: `${a} of 36` },
        { label: `Pairs where ${event.b}`, work: `${b} of 36` },
        { label: "Pairs where both happen", work: `${both} of 36` },
        { label: "Either: add, then take off both", work: `(${a} + ${b} − ${both}) ÷ 36` },
      ],
      params,
    );
  }
  const pair = INDEPENDENT_PAIRS.find((p) => p.id === params.pair)!;
  const { aPercent, bPercent } = params;
  const pa = q(aPercent, 100), pb = q(bPercent, 100);
  const both = mul(pa, pb);
  return problem(
    `independent-${pair.id}-${aPercent}-${bPercent}`,
    `The chance ${pair.a} is ${aPercent}%, and the chance ${pair.b} is ${bPercent}%. They don’t affect each other. What's the chance at least one of them happens?`,
    sub(add(pa, pb), both),
    "percent",
    [
      { label: "Chance both happen", work: `${aPercent}% × ${bPercent}%`, result: formatPercent(both) },
      { label: "At least one: add, then take off both", work: `${aPercent}% + ${bPercent}% − ${formatPercent(both)}` },
    ],
    params,
  );
}

/** Independent events that must all happen: multiply. */
function allIndependent(params: { type: "independent"; pair: string; aPercent: number; bPercent: number }): QuantProblem {
  const pair = INDEPENDENT_PAIRS.find((p) => p.id === params.pair)!;
  const { aPercent, bPercent } = params;
  return problem(
    `independent-${pair.id}-${aPercent}-${bPercent}`,
    `The chance ${pair.a} is ${aPercent}%, and the chance ${pair.b} is ${bPercent}%. They don’t affect each other. What's the chance both happen?`,
    mul(q(aPercent, 100), q(bPercent, 100)),
    "percent",
    [
      { label: "They don’t affect each other, so multiply", work: `${aPercent}% × ${bPercent}%` },
    ],
    params,
  );
}

type HandsAndTeamsParams =
  | { type: "hearts"; cards: number; hearts: number }
  | { type: "team"; men: number; women: number; size: number; picked: number };

/** Chances where both counts come from combinations: card hands and random teams. */
function handsAndTeams(params: HandsAndTeamsParams): QuantProblem {
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

export const BASICS_LESSONS: QuantLessonDef[] = [
  {
    id: "equally-likely",
    title: "Equally likely outcomes",
    benefit: "Find a chance by counting outcomes",
    idea: "If every outcome is equally likely, the chance is the outcomes you want divided by all the outcomes. When there are too many to list, count both with combinations.",
    targetSeconds: 30,
    example: countOutcomes({ type: "card", event: "heart-or-king" }),
    generate: (random) =>
      pick(random, [
        () => countOutcomes({ type: "card", event: pick(random, CARD_EVENTS).id }),
        () => {
          const sides = pick(random, DIE_SIDES);
          return countOutcomes({ type: "die", sides, atLeast: int(random, 2, sides - 1) });
        },
        () => {
          const roll = random();
          if (roll < 0.2) return twoDice({ type: "double", total: 0 });
          if (roll < 0.6) return twoDice({ type: "exactly", total: int(random, 3, 11) });
          return twoDice({ type: "at-least", total: int(random, 8, 11) });
        },
        () =>
          random() < 0.5
            ? compareRolls({ type: "compare", sides: pick(random, [4, 6, 8, 10, 12, 20]), ask: "less", gap: 0 })
            : compareRolls({ type: "compare", sides: pick(random, [6, 8, 10]), ask: "apart", gap: int(random, 1, 3) }),
        () => {
          if (random() < 0.55) {
            const cards = int(random, 3, 6);
            // At most 3 hearts, so the chance stays above 1% and types cleanly.
            return handsAndTeams({ type: "hearts", cards, hearts: int(random, 1, Math.min(cards - 1, 3)) });
          }
          const men = int(random, 3, 7), women = int(random, 3, 7), size = int(random, 3, 5);
          return handsAndTeams({ type: "team", men, women, size, picked: int(random, Math.max(1, size - men), Math.min(size - 1, women)) });
        },
      ])(),
  },
  {
    id: "complements",
    title: "Complements",
    benefit: "Use 1 minus the chance it doesn’t happen",
    idea: "The chance something happens is 1 minus the chance it doesn’t. It’s the quick way to find “at least one”.",
    targetSeconds: 30,
    example: atLeastOne({ type: "sixes", rolls: 3 }),
    generate: (random) =>
      pick(random, [
        () => atLeastOne({ type: "sixes", rolls: int(random, 2, 4) }),
        () => atLeastOne({ type: "low", rolls: int(random, 2, 4) }),
        // Up to 6 flips, so the chance stays under 99% and types cleanly.
        () => atLeastOne({ type: "heads", flips: int(random, 3, 6) }),
        () => atLeastOne({ type: "ace", cards: int(random, 2, 3) }),
      ])(),
  },
  {
    id: "or-events",
    title: "“Or” events",
    benefit: "Add chances without double counting",
    idea: "The chance of A or B is the chance of A plus the chance of B, minus the chance of both. If A and B can’t both happen, just add.",
    targetSeconds: 30,
    example: orEvents({ type: "cards", event: "spade-face" }),
    generate: (random) =>
      pick(random, [
        () => orEvents({ type: "cards", event: pick(random, OR_CARD_EVENTS).id }),
        () => orEvents({ type: "dice", event: pick(random, OR_DICE_EVENTS).id }),
        () =>
          orEvents({
            type: "independent",
            pair: pick(random, INDEPENDENT_PAIRS).id,
            aPercent: pick(random, [10, 20, 25, 30, 40, 50, 60]),
            bPercent: pick(random, [10, 20, 30, 40, 50, 70]),
          }),
      ])(),
  },
  {
    id: "and-events",
    title: "“And” events",
    benefit: "Multiply chances when all must happen",
    idea: "For several things to all happen, multiply their chances. Without replacement, each draw has fewer left to pick from.",
    targetSeconds: 30,
    example: inARow({ type: "bag", red: 5, blue: 3, draws: 2 }),
    generate: (random) => {
      const roll = random();
      if (roll < 0.25) {
        return allIndependent({
          type: "independent",
          pair: pick(random, INDEPENDENT_PAIRS).id,
          aPercent: pick(random, [20, 30, 40, 50, 60, 70, 80, 90]),
          bPercent: pick(random, [20, 25, 50, 60, 75, 80, 90]),
        });
      }
      // Not two aces: 1 in 221 is too small to type cleanly.
      if (roll < 0.5) return inARow({ type: "cards", event: pick(random, DRAW_EVENTS.filter((e) => e.id !== "aces")).id });
      const red = int(random, 3, 7);
      return inARow({ type: "bag", red, blue: int(random, 2, 6), draws: int(random, 2, 3) });
    },
  },
];
