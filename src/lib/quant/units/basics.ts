import { add, formatFraction, formatPercent, mul, pow, q, sub } from "../rational";
import {
  CARD_EVENTS,
  DECK,
  DIE_SIDES,
  DRAW_EVENTS,
  choose,
  commas,
  frac,
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
import type { CardId, QuantVisual, Tone, TreeNode } from "../visual";

const SUIT_LETTER = { spades: "S", hearts: "H", diamonds: "D", clubs: "C" } as const;
const idOf = (card: Card) => `${card.rank}${SUIT_LETTER[card.suit]}` as CardId;
const cardsWhere = (test: (card: Card) => boolean): CardId[] => DECK.filter(test).map(idOf);

/** A deck figure: each mark colours the cards that pass its test. */
function deck(marks: { test: (card: Card) => boolean; tone: Tone }[], caption?: string): QuantVisual {
  return { type: "cards", marks: marks.map((m) => ({ cards: cardsWhere(m.test), tone: m.tone })), ...(caption ? { caption } : {}) };
}

/** Every pair of two dice; each mark colours the pairs that pass its test. */
function diceGrid(sides: number, marks: { test: (first: number, second: number) => boolean; tone: Tone }[], caption?: string): QuantVisual {
  const cells = (test: (a: number, b: number) => boolean) => {
    const found: [number, number][] = [];
    for (let a = 1; a <= sides; a++) for (let b = 1; b <= sides; b++) if (test(a, b)) found.push([a, b]);
    return found;
  };
  return { type: "dice-grid", sides, marks: marks.map((m) => ({ cells: cells(m.test), tone: m.tone })), ...(caption ? { caption } : {}) };
}

/** Two independent events as a tree: A or not, then B or not. Leaves are coloured by `tone`. */
function twoEventTree(
  aText: string,
  aPercent: number,
  bText: string,
  bPercent: number,
  tone: (a: boolean, b: boolean) => Tone,
): QuantVisual {
  const branch = (a: boolean): TreeNode => ({
    label: a ? aText : `Not ${aText.toLowerCase()}`,
    edge: `${a ? aPercent : 100 - aPercent}%`,
    tone: "muted",
    children: [true, false].map((b) => ({
      label: b ? bText : `Not ${bText.toLowerCase()}`,
      edge: `${b ? bPercent : 100 - bPercent}%`,
      tone: tone(a, b),
    })),
  });
  return { type: "tree", root: { label: "Start", children: [branch(true), branch(false)] } };
}

function countOutcomes(params: { type: "die"; sides: number; atLeast: number } | { type: "card"; event: string }) {
  if (params.type === "die") {
    const { sides, atLeast } = params;
    const ways = sides - atLeast + 1;
    return problem(
      `die-${sides}-${atLeast}`,
      `You roll a fair ${sides}-sided die. What’s the chance of rolling ${atLeast} or higher?`,
      q(ways, sides),
      "probability",
      [
        {
          label: `Faces from ${atLeast} to ${sides}`,
          work: `${sides} − ${atLeast} + 1`,
          result: `${ways}`,
          icon: "count",
          explain: `Count the faces you want: every face from ${atLeast} up to ${sides}.`,
          visual: { type: "die-faces", sides, marks: [{ faces: Array.from({ length: ways }, (_, i) => atLeast + i), tone: "hit" }] },
        },
        {
          label: "Chance",
          work: `${ways} of ${sides} faces`,
          icon: "divide",
          explain: `All ${sides} faces are equally likely, so the chance is the faces you want out of all ${sides}.`,
        },
      ],
      params,
      { type: "die-faces", sides, marks: [] },
    );
  }
  const event = CARD_EVENTS.find((e) => e.id === params.event)!;
  const ways = DECK.filter(event.test).length;
  return problem(
    `card-${event.id}`,
    `You draw one card from a shuffled 52-card deck. What’s the chance it’s ${event.label}?`,
    q(ways, 52),
    "probability",
    [
      {
        label: "Cards that count",
        work: event.breakdown,
        result: `${ways}`,
        icon: "count",
        explain: CARD_PARTS[event.id]
          ? "Count each group once: the first group, then only the cards of the second group not already counted."
          : `Count the cards that are ${event.label}.`,
        visual: CARD_PARTS[event.id]
          ? deck([
              { test: CARD_PARTS[event.id].first, tone: "hit" },
              { test: (c) => !CARD_PARTS[event.id].first(c) && event.test(c), tone: "alt" },
            ])
          : deck([{ test: event.test, tone: "hit" }]),
      },
      {
        label: "Chance",
        work: `${ways} of 52 cards`,
        icon: "divide",
        explain: "Every card is equally likely to be drawn, so the chance is the cards that count out of all 52.",
      },
    ],
    params,
    deck([], "A shuffled 52-card deck"),
  );
}

/** Card events made of two groups, so the figure can colour the second group’s extra cards. */
const CARD_PARTS: Record<string, { first: (card: Card) => boolean }> = {
  "heart-or-king": { first: (c) => c.suit === "hearts" },
  "spade-or-ace": { first: (c) => c.suit === "spades" },
  "red-or-face": { first: (c) => c.suit === "hearts" || c.suit === "diamonds" },
  "club-or-face": { first: (c) => c.suit === "clubs" },
};

function twoDice(params: { type: "exactly" | "at-least" | "double"; total: number }) {
  const { type, total } = params;
  if (type === "double") {
    return problem(
      "double",
      "You roll two fair dice. What’s the chance they show the same number?",
      q(6, 36),
      "probability",
      [
        {
          label: "Doubles",
          work: "1+1, 2+2, … 6+6",
          result: "6",
          icon: "count",
          explain: "List the pairs where both dice match: one for each number from 1 to 6.",
          visual: diceGrid(6, [{ test: (a, b) => a === b, tone: "hit" }]),
        },
        {
          label: "Ways in all",
          work: "6 × 6",
          result: "36",
          icon: "multiply",
          explain: "The first die has 6 results and the second has 6 for each of them, so there are 36 equally likely pairs.",
          visual: diceGrid(6, [{ test: () => true, tone: "known" }, { test: (a, b) => a === b, tone: "hit" }]),
        },
        { label: "Chance", work: "6/36", icon: "divide", explain: "The chance is the pairs you want out of all 36 pairs." },
      ],
      params,
      diceGrid(6, []),
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
    `You roll two fair dice. What’s the chance the total is ${type === "exactly" ? total : `${total} or more`}?`,
    q(ways, 36),
    "probability",
    [
      {
        label: type === "exactly" ? `Ways to make ${total}` : `Ways to make ${total} or more`,
        work: listing,
        result: `${ways}`,
        icon: "count",
        explain:
          type === "exactly"
            ? `List the pairs that add to ${total}. 3+6 and 6+3 are different pairs: the first die differs.`
            : `Count the pairs for each total from ${total} to 12, then add them up.`,
        visual: diceGrid(6, [{ test: (a, b) => totals.includes(a + b), tone: "hit" }]),
      },
      {
        label: "Ways in all",
        work: "6 × 6",
        result: "36",
        icon: "multiply",
        explain: "The first die has 6 results and the second has 6 for each, so there are 36 equally likely pairs.",
        visual: diceGrid(6, [{ test: () => true, tone: "known" }, { test: (a, b) => totals.includes(a + b), tone: "hit" }]),
      },
      { label: "Chance", work: `${ways}/36`, icon: "divide", explain: "The chance is the pairs you want out of all 36 pairs." },
    ],
    params,
    diceGrid(6, []),
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
      const targetFaces = params.type === "sixes" ? [6] : [1, 2];
      return problem(
        `${params.type}-${rolls}`,
        `You roll a fair die ${timesWord(rolls)}. What’s the chance of at least one roll showing ${target}?`,
        sub(q(1), none),
        "probability",
        [
          {
            label: `No ${params.type === "sixes" ? "six" : "1 or 2"} on one roll`,
            work: params.type === "sixes" ? "1 − 1/6" : "1 − 2/6",
            result: formatFraction(miss),
            icon: "flip",
            explain: "Flip the question: work out the chance of missing on one roll, which is easier than counting every way to hit.",
            visual: {
              type: "die-faces",
              sides: 6,
              marks: [
                { faces: [1, 2, 3, 4, 5, 6].filter((f) => !targetFaces.includes(f)), tone: "alt" },
                { faces: targetFaces, tone: "hit" },
              ],
              caption: `${params.type === "sixes" ? "5" : "4"} of 6 faces miss`,
            },
          },
          {
            label: `No ${params.type === "sixes" ? "six" : "1 or 2"} in ${rolls} rolls`,
            work: `(${formatFraction(miss)})${sup(rolls)}`,
            result: formatFraction(none),
            icon: "repeat",
            explain: `The rolls don’t affect each other, so the chance of missing every time is the one-roll chance multiplied ${rolls} times.`,
            visual: missChain(rolls, params.type === "sixes" ? "No 6" : "No 1 or 2", formatFraction(miss), params.type === "sixes" ? "6" : "1 or 2", formatFraction(sub(q(1), miss))),
          },
          {
            label: "At least one",
            work: `1 − ${formatFraction(none)}`,
            icon: "subtract",
            explain: "Either you miss every time or you hit at least once, so the chance of at least one is 1 minus the chance of missing every time.",
          },
        ],
        params,
      );
    }
    case "heads": {
      const { flips } = params;
      const none = pow(q(1, 2), flips);
      return problem(
        `heads-${flips}`,
        `You flip a fair coin ${flips} times. What’s the chance of at least one head?`,
        sub(q(1), none),
        "probability",
        [
          {
            label: "Tails every time",
            work: `(1/2)${sup(flips)}`,
            result: formatFraction(none),
            icon: "flip",
            explain: "The only way to get no head is tails on every flip. Each flip is tails with chance 1/2, and they multiply.",
            visual: { type: "coins", flips: Array.from({ length: flips }, () => "T"), tones: Array.from({ length: flips }, () => "alt"), caption: "The one sequence with no head" },
          },
          {
            label: "At least one head",
            work: `1 − ${formatFraction(none)}`,
            icon: "subtract",
            explain: "Every other sequence has at least one head, so take the all-tails chance away from 1.",
          },
        ],
        params,
        { type: "coins", flips: Array.from({ length: flips }, () => "?"), caption: `${flips} flips` },
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
        `You deal ${cards} cards from a shuffled deck. What’s the chance at least one is an ace?`,
        sub(q(1), none),
        "probability",
        [
          {
            label: "No ace in any of them",
            work: factors.join(" × "),
            result: formatFraction(none),
            icon: "flip",
            explain: "Work out the chance of no ace: the first card misses with 48 of 52, then 47 of the 51 left, and so on.",
            visual: deck([{ test: (c) => c.rank !== 1, tone: "alt" }, { test: (c) => c.rank === 1, tone: "hit" }], "48 cards that aren’t aces, 4 aces"),
          },
          {
            label: "At least one ace",
            work: `1 − ${formatFraction(none)}`,
            icon: "subtract",
            explain: "Either no card is an ace or at least one is, so take the no-ace chance away from 1.",
          },
        ],
        params,
      );
    }
  }
}

/** "No hit yet" as a chain: each roll either hits (a leaf) or misses and rolls again. */
function missChain(rolls: number, missText: string, missChance: string, hitText: string, hitChance: string): QuantVisual {
  let node: TreeNode = { label: missText, edge: missChance, tone: "alt" };
  for (let i = rolls - 1; i >= 1; i--) {
    node = { label: missText, edge: missChance, tone: "muted", children: [node, { label: hitText, edge: hitChance, tone: "hit" }] };
  }
  return {
    type: "tree",
    root: { label: "Roll 1", children: [node, { label: hitText, edge: hitChance, tone: "hit" }] },
    caption: `Missing on all ${rolls} rolls is the one path that never hits`,
  };
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
      `A bag has ${red} red and ${blue} blue marbles. You take out ${numberWord(draws)} without putting any back. What’s the chance they’re ${draws === 2 ? "both" : "all"} red?`,
      chance,
      "probability",
      [
        ...factors.map((factor, i) => ({
          label: i === 0 ? "First is red" : `${i === 1 ? "Second" : "Third"} is red too`,
          work: `${red - i} red of ${red + blue - i} left`,
          result: factor,
          icon: (i === 0 ? "count" : "repeat") as "count" | "repeat",
          explain:
            i === 0
              ? `${red} of the ${red + blue} marbles are red, so the first is red with chance ${factor}.`
              : `One red marble is out and not put back, so ${red - i} red are left out of ${red + blue - i}.`,
          visual: {
            type: "marbles" as const,
            groups: [
              { count: red, tone: "hit" as Tone, label: "Red" },
              { count: blue, tone: "alt" as Tone, label: "Blue" },
            ],
            taken: Array.from({ length: i + 1 }, () => "hit" as Tone),
          },
        })),
        {
          label: draws === 2 ? "Both" : "All three",
          work: factors.join(" × "),
          icon: "multiply",
          explain: "Each draw must be red, so multiply the chance for each draw.",
        },
      ],
      params,
      {
        type: "marbles",
        groups: [
          { count: red, tone: "hit", label: "Red" },
          { count: blue, tone: "alt", label: "Blue" },
        ],
      },
    );
  }
  const event = DRAW_EVENTS.find((e) => e.id === params.event)!;
  const chance = mul(q(event.count, 52), q(event.count - 1, 51));
  return problem(
    `cards-${event.id}`,
    `You deal two cards from a shuffled deck. What’s the chance both are ${event.label}?`,
    chance,
    "probability",
    [
      {
        label: "First card",
        work: `${event.count} of 52`,
        result: `${event.count}/52`,
        icon: "count",
        explain: `${event.count} of the 52 cards are ${event.label}, so that’s the chance for the first card.`,
        visual: deck([{ test: DRAW_TESTS[event.id], tone: "hit" }]),
      },
      {
        label: "Second card",
        work: `${event.count - 1} of the 51 left`,
        result: `${event.count - 1}/51`,
        icon: "repeat",
        explain: "The first card isn’t put back, so one fewer card that counts is left, out of 51 cards.",
        visual: deck(
          [
            { test: DRAW_TESTS[event.id], tone: "hit" },
            { test: (c) => idOf(c) === firstOf(event.id), tone: "muted" },
          ],
          "One is gone",
        ),
      },
      {
        label: "Both",
        work: `${event.count}/52 × ${event.count - 1}/51`,
        icon: "multiply",
        explain: "Both cards must count, so multiply the chance for the first by the chance for the second.",
      },
    ],
    params,
  );
}

const DRAW_TESTS: Record<string, (card: Card) => boolean> = {
  aces: (c) => c.rank === 1,
  hearts: (c) => c.suit === "hearts",
  face: (c) => c.rank >= 11,
  red: (c) => c.suit === "hearts" || c.suit === "diamonds",
};
const firstOf = (id: string) => idOf(DECK.find(DRAW_TESTS[id])!);


/** Two rolls of one fair die, compared. */
function compareRolls(params: { type: "compare"; sides: number; ask: "less" | "apart"; gap: number }): QuantProblem {
  const { sides, ask, gap } = params;
  const all = sides * sides;
  if (ask === "less") {
    const ways = (all - sides) / 2;
    return problem(
      `compare-less-${sides}`,
      `You roll a fair ${sides}-sided die twice. What’s the chance the first roll is lower than the second?`,
      q(ways, all),
      "probability",
      [
        {
          label: "Pairs in all",
          work: `${sides} × ${sides}`,
          result: `${all}`,
          icon: "multiply",
          explain: `Each roll has ${sides} results, so there are ${all} equally likely pairs of rolls.`,
          visual: diceGrid(sides, [{ test: () => true, tone: "known" }]),
        },
        {
          label: "Pairs that tie",
          work: `1-1 up to ${sides}-${sides}`,
          result: `${sides}`,
          icon: "filter",
          explain: "Set aside the pairs where both rolls are the same: one for each face.",
          visual: diceGrid(sides, [{ test: (a, b) => a === b, tone: "muted" }]),
        },
        {
          label: "The rest split evenly: first lower, or first higher",
          work: `(${all} − ${sides}) ÷ 2`,
          result: `${ways}`,
          icon: "split",
          explain: "Swapping the two rolls turns every “first lower” pair into a “first higher” one, so the other pairs split in half.",
          visual: diceGrid(sides, [
            { test: (a, b) => a < b, tone: "hit" },
            { test: (a, b) => a > b, tone: "alt" },
            { test: (a, b) => a === b, tone: "muted" },
          ]),
        },
        { label: "Chance", work: `${ways}/${all}`, icon: "divide", explain: `The chance is the “first lower” pairs out of all ${all} pairs.` },
      ],
      params,
      diceGrid(sides, [], "Rows: first roll. Columns: second roll."),
    );
  }
  const ways = 2 * (sides - gap);
  return problem(
    `compare-apart-${sides}-${gap}`,
    `You roll a fair ${sides}-sided die twice. What’s the chance the two rolls differ by exactly ${gap}?`,
    q(ways, all),
    "probability",
    [
      {
        label: `Pairs with the first ${gap} lower`,
        work: `1-${1 + gap} up to ${sides - gap}-${sides}`,
        result: `${sides - gap}`,
        icon: "count",
        explain: `The first roll can be anything from 1 to ${sides - gap}, with the second exactly ${gap} higher.`,
        visual: diceGrid(sides, [{ test: (a, b) => b - a === gap, tone: "hit" }]),
      },
      {
        label: `Pairs with the first ${gap} higher`,
        work: "the same pairs reversed",
        result: `${sides - gap}`,
        icon: "flip",
        explain: "Swap the two rolls in each of those pairs to get the pairs where the first is higher.",
        visual: diceGrid(sides, [
          { test: (a, b) => b - a === gap, tone: "hit" },
          { test: (a, b) => a - b === gap, tone: "alt" },
        ]),
      },
      {
        label: "Chance",
        work: `${ways}/${all}`,
        icon: "divide",
        explain: `Add both kinds of pair and divide by all ${all} equally likely pairs.`,
      },
    ],
    params,
    diceGrid(sides, [], "Rows: first roll. Columns: second roll."),
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
      `You draw one card from a shuffled 52-card deck. What’s the chance it’s ${event.a} or ${event.b}?`,
      q(either, 52),
      "probability",
      [
        {
          label: `Chance it’s ${event.a}`,
          work: `${event.aCount}/52`,
          icon: "count",
          explain: `Count the cards that are ${event.a}.`,
          visual: deck([{ test: OR_CARD_TESTS[event.id].a, tone: "hit" }]),
        },
        {
          label: `Chance it’s ${event.b}`,
          work: `${event.bCount}/52`,
          icon: "count",
          explain: `Count the cards that are ${event.b}.`,
          visual: deck([{ test: OR_CARD_TESTS[event.id].b, tone: "alt" }]),
        },
        {
          label: "Chance it’s both",
          work: `${event.bothCount}/52`,
          icon: "filter",
          explain:
            event.bothCount === 0
              ? "No card is both, so nothing is counted twice."
              : "These cards are in both counts, so adding the two counts would count them twice.",
          visual: orDeck(event.id),
        },
        {
          label: "Either: add, then take off both",
          work: `(${event.aCount} + ${event.bCount} − ${event.bothCount}) ÷ 52`,
          icon: "subtract",
          explain: "Add the two counts, take off the overlap once, then divide by the 52 cards.",
        },
      ],
      params,
      deck([], "A shuffled 52-card deck"),
    );
  }
  if (params.type === "dice") {
    const event = OR_DICE_EVENTS.find((e) => e.id === params.event)!;
    const a = countPairs(event.testA);
    const b = countPairs(event.testB);
    const both = countPairs((x, y) => event.testA(x, y) && event.testB(x, y));
    return problem(
      `dice-${event.id}`,
      `You roll two fair dice. What’s the chance ${event.a}, or ${event.b}?`,
      q(a + b - both, 36),
      "probability",
      [
        {
          label: `Pairs where ${event.a}`,
          work: `${a} of 36`,
          icon: "count",
          explain: `Count the pairs of rolls where ${event.a}.`,
          visual: diceGrid(6, [{ test: event.testA, tone: "hit" }]),
        },
        {
          label: `Pairs where ${event.b}`,
          work: `${b} of 36`,
          icon: "count",
          explain: `Count the pairs where ${event.b}.`,
          visual: diceGrid(6, [{ test: event.testB, tone: "alt" }]),
        },
        {
          label: "Pairs where both happen",
          work: `${both} of 36`,
          icon: "filter",
          explain: "These pairs are in both counts, so adding the two counts would count them twice.",
          visual: diceGrid(6, [
            { test: (x, y) => event.testA(x, y) && !event.testB(x, y), tone: "hit" },
            { test: (x, y) => event.testB(x, y) && !event.testA(x, y), tone: "alt" },
            { test: (x, y) => event.testA(x, y) && event.testB(x, y), tone: "both" },
          ]),
        },
        {
          label: "Either: add, then take off both",
          work: `(${a} + ${b} − ${both}) ÷ 36`,
          icon: "subtract",
          explain: "Add the two counts, take off the overlap once, then divide by the 36 pairs.",
        },
      ],
      params,
      diceGrid(6, [], "Rows: first die. Columns: second die."),
    );
  }
  const pair = INDEPENDENT_PAIRS.find((p) => p.id === params.pair)!;
  const { aPercent, bPercent } = params;
  const pa = q(aPercent, 100), pb = q(bPercent, 100);
  const both = mul(pa, pb);
  return problem(
    `independent-${pair.id}-${aPercent}-${bPercent}`,
    `The chance ${pair.a} is ${aPercent}%, and the chance ${pair.b} is ${bPercent}%. They don’t affect each other. What’s the chance at least one of them happens?`,
    sub(add(pa, pb), both),
    "percent",
    [
      {
        label: "Chance both happen",
        work: `${aPercent}% × ${bPercent}%`,
        result: formatPercent(both),
        icon: "multiply",
        explain: "They don’t affect each other, so the chance both happen is their chances multiplied.",
        visual: twoEventTree(capitalise(pair.a), aPercent, capitalise(pair.b), bPercent, (a, b) => (a && b ? "both" : "muted")),
      },
      {
        label: "At least one: add, then take off both",
        work: `${aPercent}% + ${bPercent}% − ${formatPercent(both)}`,
        icon: "subtract",
        explain: "Adding the two chances counts the “both” case twice, so take it off once.",
        visual: twoEventTree(capitalise(pair.a), aPercent, capitalise(pair.b), bPercent, (a, b) => (a && b ? "both" : a || b ? "hit" : "muted")),
      },
    ],
    params,
    twoEventTree(capitalise(pair.a), aPercent, capitalise(pair.b), bPercent, () => "muted"),
  );
}

const capitalise = (text: string) => text[0].toUpperCase() + text.slice(1);

/** The two groups behind each OR_CARD_EVENTS event, for drawing the deck. */
const OR_CARD_TESTS: Record<string, { a: (card: Card) => boolean; b: (card: Card) => boolean }> = {
  "spade-face": { a: (c) => c.suit === "spades", b: (c) => c.rank >= 11 },
  "red-ace": { a: (c) => c.suit === "hearts" || c.suit === "diamonds", b: (c) => c.rank === 1 },
  "king-queen": { a: (c) => c.rank === 13, b: (c) => c.rank === 12 },
  "club-low": { a: (c) => c.suit === "clubs", b: (c) => c.rank >= 2 && c.rank <= 4 },
  "heart-high": { a: (c) => c.suit === "hearts", b: (c) => c.rank >= 10 || c.rank === 1 },
  "black-even": { a: (c) => c.suit === "spades" || c.suit === "clubs", b: (c) => c.rank <= 10 && c.rank % 2 === 0 },
};

function orDeck(id: string): QuantVisual {
  const { a, b } = OR_CARD_TESTS[id];
  return deck([
    { test: (c) => a(c) && !b(c), tone: "hit" },
    { test: (c) => b(c) && !a(c), tone: "alt" },
    { test: (c) => a(c) && b(c), tone: "both" },
  ]);
}

/** Independent events that must all happen: multiply. */
function allIndependent(params: { type: "independent"; pair: string; aPercent: number; bPercent: number }): QuantProblem {
  const pair = INDEPENDENT_PAIRS.find((p) => p.id === params.pair)!;
  const { aPercent, bPercent } = params;
  return problem(
    `independent-${pair.id}-${aPercent}-${bPercent}`,
    `The chance ${pair.a} is ${aPercent}%, and the chance ${pair.b} is ${bPercent}%. They don’t affect each other. What’s the chance both happen?`,
    mul(q(aPercent, 100), q(bPercent, 100)),
    "percent",
    [
      {
        label: "They don’t affect each other, so multiply",
        work: `${aPercent}% × ${bPercent}%`,
        icon: "multiply",
        explain: `Out of every 100 times, the first happens ${aPercent} times, and in ${bPercent}% of those the second happens too.`,
        visual: twoEventTree(capitalise(pair.a), aPercent, capitalise(pair.b), bPercent, (a, b) => (a && b ? "hit" : "muted")),
      },
    ],
    params,
    twoEventTree(capitalise(pair.a), aPercent, capitalise(pair.b), bPercent, () => "muted"),
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
      `You’re dealt ${cards} cards from a shuffled deck. What’s the chance exactly ${hearts} ${hearts === 1 ? "is a heart" : "are hearts"}?`,
      q(good, all),
      // Hand counts reduce to unwieldy fractions (9139/33320), so these ask for a percentage.
      "percent",
      [
        {
          label: `Hands with ${hearts} ${hearts === 1 ? "heart" : "hearts"}`,
          work: `C(13, ${hearts}) × C(39, ${cards - hearts}) = ${commas(choose(13, hearts))} × ${commas(choose(39, cards - hearts))}`,
          result: commas(good),
          icon: "count",
          explain: `Choose ${hearts} of the 13 hearts and ${cards - hearts} of the 39 other cards, then multiply the two counts.`,
          visual: deck(
            [
              { test: (c) => c.suit === "hearts", tone: "hit" },
              { test: (c) => c.suit !== "hearts", tone: "alt" },
            ],
            `${hearts} from the hearts, ${cards - hearts} from the rest`,
          ),
        },
        {
          label: `All ${cards}-card hands`,
          work: `C(52, ${cards})`,
          result: commas(all),
          icon: "count",
          explain: `Every hand is any ${cards} of the 52 cards, and each is equally likely.`,
          visual: deck([{ test: () => true, tone: "known" }], `Any ${cards} of the 52`),
        },
        {
          label: "Chance",
          work: `${commas(good)} ÷ ${commas(all)}`,
          icon: "divide",
          explain: "The chance is the hands you want out of all the hands.",
        },
      ],
      params,
    );
  }
  const { men, women, size, picked } = params;
  const good = choose(women, picked) * choose(men, size - picked);
  const all = choose(men + women, size);
  return problem(
    `team-${men}-${women}-${size}-${picked}`,
    `A team of ${size} is picked at random from ${men} men and ${women} women. What’s the chance it has exactly ${picked} ${picked === 1 ? "woman" : "women"}?`,
    q(good, all),
    "probability",
    [
      {
        label: `Teams with ${picked} ${picked === 1 ? "woman" : "women"}`,
        work: `C(${women}, ${picked}) × C(${men}, ${size - picked}) = ${choose(women, picked)} × ${choose(men, size - picked)}`,
        result: `${good}`,
        icon: "count",
        explain: `Choose ${picked} of the ${women} women and ${size - picked} of the ${men} men, then multiply the two counts.`,
        visual: teamFigure(women, men, picked, size - picked),
      },
      {
        label: "All teams",
        work: `C(${men + women}, ${size})`,
        result: `${all}`,
        icon: "count",
        explain: `A team is any ${size} of the ${men + women} people, and each team is equally likely.`,
        visual: {
          type: "people",
          groups: [{ count: men + women, tone: "known", label: "Everyone" }],
          caption: `Any ${size} of the ${men + women}`,
        },
      },
      { label: "Chance", work: `${good}/${all}`, icon: "divide", explain: "The chance is the teams you want out of all the teams." },
    ],
    params,
    teamFigure(women, men, 0, 0),
  );
}

function teamFigure(women: number, men: number, pickedWomen: number, pickedMen: number): QuantVisual {
  return {
    type: "people",
    groups: [
      ...(pickedWomen > 0 ? [{ count: pickedWomen, tone: "hit" as Tone, label: "Women picked" }] : []),
      ...(women - pickedWomen > 0 ? [{ count: women - pickedWomen, tone: "muted" as Tone, label: pickedWomen > 0 ? "Other women" : "Women" }] : []),
      ...(pickedMen > 0 ? [{ count: pickedMen, tone: "alt" as Tone, label: "Men picked" }] : []),
      ...(men - pickedMen > 0 ? [{ count: men - pickedMen, tone: "known" as Tone, label: pickedMen > 0 ? "Other men" : "Men" }] : []),
    ],
  };
}

// ─── More question types ───────────────────────────────────────────────────────────────

const factorialOf = (n: number): number => (n <= 1 ? 1 : n * factorialOf(n - 1));
const percentText = (n: number) => `${n}%`;

type MoreLikelyParams =
  | { type: "increasing"; sides: number; rolls: number }
  | { type: "bigger-die"; big: number; small: number }
  | { type: "poker-chance"; hand: string }
  | { type: "shuffle-order"; order: string }
  | { type: "exact-faces"; sides: number; rolls: number };

const POKER_CHANCES: Record<string, { name: string; ways: number; work: string; example: CardId[] }> = {
  three: { name: "three of a kind (three cards of one rank, the other two of two other ranks)", ways: 54912, work: "13 × C(4, 3) × C(12, 2) × 4 × 4", example: ["7S", "7H", "7D", "12C", "2S"] },
  "two-pair": { name: "two pair (two of one rank, two of another, and a fifth card of a third rank)", ways: 123552, work: "C(13, 2) × C(4, 2)² × 44", example: ["11S", "11H", "3D", "3C", "8S"] },
  "one-pair": { name: "exactly one pair (two of one rank, three cards of three other ranks)", ways: 1098240, work: "13 × C(4, 2) × C(12, 3) × 4³", example: ["1S", "1H", "6D", "10C", "13S"] },
  "all-ranks": { name: "five cards of five different ranks", ways: 1317888, work: "C(13, 5) × 4⁵", example: ["2S", "5H", "8D", "11C", "13S"] },
};

/** Named cards in a shuffle: does the target come after all of them? */
const SHUFFLE_ORDERS: Record<string, { cards: CardId[]; text: string; target: CardId; targetText: string }> = {
  "ace-before-king": { cards: ["1S"], text: "the ace of spades", target: "13H", targetText: "the king of hearts" },
  "black-aces": { cards: ["1S", "1C"], text: "both black aces", target: "13H", targetText: "the king of hearts" },
  "royals-before-joker": { cards: ["13H", "12H", "11H"], text: "the king, queen and jack of hearts", target: "1S", targetText: "the ace of spades" },
  "all-aces": { cards: ["1S", "1H", "1D", "1C"], text: "all four aces", target: "13H", targetText: "the king of hearts" },
};

const SPINNER_NAME = (sides: number) => (sides === 2 ? "coin" : sides === 3 ? "fair 3-sided spinner" : `fair ${sides}-sided die`);

function moreLikely(params: MoreLikelyParams): QuantProblem {
  switch (params.type) {
    case "increasing": {
      const { sides, rolls } = params;
      const ways = choose(sides, rolls);
      const all = sides ** rolls;
      return problem(
        `increasing-${sides}-${rolls}`,
        `You roll a fair ${sides}-sided die ${timesWord(rolls)}. What’s the chance each roll is higher than the one before?`,
        q(ways, all),
        "probability",
        [
          {
            label: "Results that go up every time",
            work: `C(${sides}, ${rolls})`,
            result: `${ways}`,
            icon: "count",
            explain: `Any ${rolls} different numbers can be put in rising order in exactly one way, so count the sets of ${rolls} different faces.`,
            visual:
              rolls === 2 && sides <= 8
                ? diceGrid(sides, [{ test: (a, b) => a < b, tone: "hit" }], "Second roll higher than the first")
                : { type: "die-faces", sides, marks: [{ faces: Array.from({ length: rolls }, (_, i) => i + 2), tone: "hit" }], caption: `One rising set: ${Array.from({ length: rolls }, (_, i) => i + 2).join(", ")}` },
          },
          {
            label: "All results",
            work: `${sides}${sup(rolls)}`,
            result: commas(all),
            icon: "multiply",
            explain: `Each roll has ${sides} faces, so there are ${sides}${sup(rolls)} equally likely sequences.`,
          },
          { label: "Chance", work: `${ways} ÷ ${commas(all)}`, icon: "divide", explain: "The chance is the rising sequences out of all sequences." },
        ],
        params,
      );
    }
    case "bigger-die": {
      const { big, small } = params;
      const wins = big * small - (small * (small + 1)) / 2;
      const all = big * small;
      return problem(
        `bigger-${big}-${small}`,
        `Ann rolls a fair ${big}-sided die and Ben rolls a fair ${small}-sided die. Ann wins if her number is higher; Ben wins ties. What’s the chance Ann wins?`,
        q(wins, all),
        "probability",
        [
          {
            label: "Ann’s winning numbers for each of Ben’s rolls",
            work: `if Ben rolls b, Ann needs b + 1 to ${big}: ${big} − b numbers`,
            icon: "count",
            explain: "Fix Ben’s roll first. Ann wins with any number above it.",
            visual: {
              type: "bars",
              bars: Array.from({ length: small }, (_, i) => ({ label: `${i + 1}`, value: big - i - 1, tone: "hit" as Tone, text: `${big - i - 1}` })),
              caption: "Ann’s winning numbers, for each roll Ben could make",
            },
          },
          {
            label: "Add them up",
            work: Array.from({ length: small }, (_, i) => big - i - 1).join(" + "),
            result: `${wins}`,
            icon: "add",
            explain: "Each of Ben’s rolls is a separate case, so add the winning pairs.",
          },
          {
            label: "Chance",
            work: `${wins} ÷ (${big} × ${small})`,
            icon: "divide",
            explain: `All ${all} pairs of rolls are equally likely.`,
          },
        ],
        params,
      );
    }
    case "poker-chance": {
      const hand = POKER_CHANCES[params.hand];
      const all = choose(52, 5);
      return problem(
        `poker-${params.hand}`,
        `You’re dealt 5 cards from a shuffled deck. What’s the chance of ${hand.name}?`,
        q(hand.ways, all),
        "percent",
        [
          {
            label: "Hands of that kind",
            work: hand.work,
            result: commas(hand.ways),
            icon: "count",
            explain: "Count rank choices first, then the suits for each card, and multiply.",
            visual: { type: "cards", marks: [{ cards: hand.example, tone: "hit" }], caption: "One hand of this kind" },
          },
          {
            label: "All 5-card hands",
            work: "C(52, 5)",
            result: commas(all),
            icon: "count",
            explain: "Every hand is any 5 of the 52 cards, all equally likely.",
          },
          { label: "Chance", work: `${commas(hand.ways)} ÷ ${commas(all)}`, icon: "divide", explain: "The chance is the hands you want out of all hands." },
        ],
        params,
      );
    }
    case "shuffle-order": {
      const order = SHUFFLE_ORDERS[params.order];
      const group = order.cards.length + 1;
      return problem(
        `order-${params.order}`,
        `You shuffle a standard deck and turn the cards over one at a time. What’s the chance ${order.text} ${order.cards.length === 1 ? "comes" : order.text.startsWith("all") || order.text.startsWith("both") ? "come" : "all come"} before ${order.targetText}?`,
        q(1, group),
        "probability",
        [
          {
            label: "Only these cards matter",
            work: `${group} cards: ${order.text} and ${order.targetText}`,
            icon: "filter",
            explain: "The other cards don’t change which of these comes last, so ignore them.",
            visual: {
              type: "cards",
              marks: [
                { cards: order.cards, tone: "hit" },
                { cards: [order.target], tone: "alt" },
              ],
            },
          },
          {
            label: `${order.targetText[0].toUpperCase()}${order.targetText.slice(1)} must be last of the ${group}`,
            work: `1 of ${group} equally likely spots`,
            icon: "divide",
            explain: `In a fair shuffle each of the ${group} cards is equally likely to be the last of them, so the chance is 1 ÷ ${group}.`,
          },
        ],
        params,
      );
    }
    case "exact-faces": {
      const { sides, rolls } = params;
      const each = rolls / sides;
      const orders = factorialOf(rolls) / factorialOf(each) ** sides;
      const all = sides ** rolls;
      const thing = SPINNER_NAME(sides);
      return problem(
        `exact-${sides}-${rolls}`,
        sides === 2
          ? `You flip a fair coin ${rolls} times. What’s the chance of exactly ${each} heads and ${each} tails?`
          : `You ${sides === 3 ? "spin" : "roll"} a ${thing} ${rolls} times. What’s the chance each of the ${sides} results comes up exactly ${timesWord(each)}?`,
        q(orders, all),
        "probability",
        [
          {
            label: `Orders with each result ${timesWord(each)}`,
            work: `${rolls}! ÷ (${each}!)${sup(sides)}`,
            result: commas(orders),
            icon: "count",
            explain: `Arrange the ${rolls} results as if all different, then divide by the ways to shuffle each result’s ${each} copies among themselves.`,
            visual: { type: "bars", bars: Array.from({ length: sides }, (_, i) => ({ label: sides === 2 ? ["H", "T"][i] : `${i + 1}`, value: each, tone: "hit" as Tone, text: `${each}` })), caption: "Each result the same number of times" },
          },
          {
            label: "All sequences",
            work: `${sides}${sup(rolls)}`,
            result: commas(all),
            icon: "multiply",
            explain: `Each of the ${rolls} tries has ${sides} equally likely results.`,
          },
          { label: "Chance", work: `${commas(orders)} ÷ ${commas(all)}`, icon: "divide", explain: "The chance is the sequences you want out of all sequences." },
        ],
        params,
      );
    }
  }
}

type MoreComplementParams =
  | { type: "shared"; things: string; people: number; ask: "share" | "different" }
  | { type: "yours"; things: string; people: number };

const BIRTH_THINGS: Record<string, { size: number; prompt: (n: number) => string; one: string; many: string }> = {
  months: { size: 12, prompt: (n) => `${n} people each have a birth month, every month equally likely`, one: "month", many: "months" },
  weekdays: { size: 7, prompt: (n) => `${n} people were each born on a day of the week, every day equally likely`, one: "day", many: "days" },
  dice: { size: 6, prompt: (n) => `You roll ${n} fair dice`, one: "number", many: "numbers" },
};

function moreComplements(params: MoreComplementParams): QuantProblem {
  const thing = BIRTH_THINGS[params.things];
  const { size } = thing;
  if (params.type === "yours") {
    const { people } = params;
    const miss = q(size - 1, size);
    const none = pow(miss, people);
    return problem(
      `yours-${params.things}-${people}`,
      params.things === "dice"
        ? `You roll a die and get a 6. Then you roll ${people} more dice. What’s the chance at least one of them is also a 6?`
        : `${thing.prompt(people)}. What’s the chance at least one of them shares your ${thing.one}?`,
      sub(q(1), none),
      "probability",
      [
        {
          label: `One person misses your ${thing.one}`,
          work: `${size - 1} of ${size}`,
          result: formatFraction(miss),
          icon: "flip",
          explain: `Work out the chance nobody matches. One person lands on another ${thing.one} with chance ${size - 1}/${size}.`,
        },
        {
          label: `All ${people} miss it`,
          work: `(${formatFraction(miss)})${sup(people)}`,
          result: formatFraction(none),
          icon: "repeat",
          explain: "Each person is independent of the others, so multiply the miss chance for every one.",
          ...(people <= 4 ? { visual: missChain(people, "Miss", formatFraction(miss), "Match", frac(1, size)) } : {}),
        },
        { label: "At least one matches", work: `1 − ${formatFraction(none)}`, icon: "subtract", explain: "Either everyone misses or at least one matches, so take the all-miss chance from 1." },
      ],
      params,
      {
        type: "people",
        groups: [
          { count: 1, tone: "hit", label: params.things === "dice" ? "Your first roll" : "You" },
          { count: people, tone: "muted", label: params.things === "dice" ? "Other rolls" : "Others" },
        ],
      },
    );
  }
  const { people, ask } = params;
  const factors = Array.from({ length: people }, (_, i) => size - i);
  const different = q(product(factors), size ** people);
  const steps: Parameters<typeof problem>[4] = [
    {
      label: "Each new one avoids all the earlier ones",
      work: factors.map((f) => `${f}/${size}`).join(" × "),
      result: formatFraction(different),
      icon: "multiply",
      explain: `The first can be anything. The second must avoid 1 ${thing.one}, the third must avoid 2, and so on.`,
      visual: { type: "slots", slots: factors.slice(0, 7).map((f, i) => ({ label: `${i + 1}${["st", "nd", "rd"][i] ?? "th"}`, value: `${f}/${size}`, tone: "hit" as Tone })), op: "×" },
    },
  ];
  if (ask === "share") {
    steps.push({ label: "At least two share", work: `1 − ${formatFraction(different)}`, icon: "subtract", explain: "Either all are different or at least two match, so take “all different” from 1." });
  }
  return problem(
    `shared-${params.things}-${people}-${ask}`,
    `${thing.prompt(people)}. What’s the chance ${ask === "share" ? `at least two ${params.things === "dice" ? "show the same number" : `share a ${thing.one}`}` : `they’re all different`}?`,
    ask === "share" ? sub(q(1), different) : different,
    "probability",
    steps,
    params,
  );
}

const product = (values: number[]) => values.reduce((acc, v) => acc * v, 1);

const THREE_EVENTS = [
  { id: "friends", text: (a: number, b: number, c: number) => `You text three friends. They reply with chances ${a}%, ${b}% and ${c}%, independently. What’s the chance at least one replies?`, what: "No one replies" },
  { id: "alarms", text: (a: number, b: number, c: number) => `You set three alarms. They go off with chances ${a}%, ${b}% and ${c}%, independently. What’s the chance at least one goes off?`, what: "None go off" },
  { id: "shots", text: (a: number, b: number, c: number) => `Three players each take one shot. They score with chances ${a}%, ${b}% and ${c}%, independently. What’s the chance at least one scores?`, what: "Nobody scores" },
];

function threeIndependent(params: { type: "three"; event: string; a: number; b: number; c: number }): QuantProblem {
  const event = THREE_EVENTS.find((e) => e.id === params.event)!;
  const { a, b, c } = params;
  const none = mul(mul(q(100 - a, 100), q(100 - b, 100)), q(100 - c, 100));
  return problem(
    `three-${event.id}-${a}-${b}-${c}`,
    event.text(a, b, c),
    sub(q(1), none),
    "percent",
    [
      {
        label: event.what,
        work: `${100 - a}% × ${100 - b}% × ${100 - c}%`,
        result: formatPercent(none),
        icon: "multiply",
        explain: "With three events, adding and taking off overlaps needs seven terms. The complement needs one: multiply the three chances of missing.",
        visual: { type: "slots", slots: [100 - a, 100 - b, 100 - c].map((m, i) => ({ label: `Miss ${i + 1}`, value: percentText(m), tone: "alt" as Tone })), op: "×", result: formatPercent(none) },
      },
      { label: "At least one", work: `100% − ${formatPercent(none)}`, icon: "subtract", explain: "Either none happen or at least one does, so take the none chance from 100%." },
    ],
    params,
  );
}

const TRIES = [
  { id: "free-throws", text: (n: number, p: number) => `A player makes each free throw with chance ${p}%, independently. What’s the chance they make all ${n} of their next ${n}?`, one: "Each throw" },
  { id: "flights", text: (n: number, p: number) => `Each of ${n} connecting flights is on time with chance ${p}%, independently. What’s the chance all ${n} are on time?`, one: "Each flight" },
  { id: "parts", text: (n: number, p: number) => `A machine has ${n} parts, and each works with chance ${p}%, independently. It runs only if every part works. What’s the chance it runs?`, one: "Each part" },
];

function allTries(params: { type: "all-tries"; context: string; tries: number; percent: number }): QuantProblem {
  const context = TRIES.find((t) => t.id === params.context)!;
  const { tries, percent } = params;
  const chance = pow(q(percent, 100), tries);
  return problem(
    `tries-${context.id}-${tries}-${percent}`,
    context.text(tries, percent),
    chance,
    "percent",
    [
      {
        label: `${context.one} succeeds`,
        work: `${percent}%`,
        icon: "target",
        explain: "Every one of them has to succeed, and they don’t affect each other.",
      },
      {
        label: tries === 2 ? "Both succeed" : `All ${tries} succeed`,
        work: `(${percent}%)${sup(tries)}`,
        icon: "multiply",
        explain: `Multiply the chance once for each of the ${tries}, since each success has to follow all the ones before it.`,
        visual: { type: "slots", slots: Array.from({ length: tries }, (_, i) => ({ label: `${i + 1}`, value: percentText(percent), tone: "hit" as Tone })), op: "×" },
      },
    ],
    params,
  );
}

const THREE_CARD_TESTS: Record<string, { text: string; count: number; test: (card: Card) => boolean }> = {
  red: { text: "red", count: 26, test: (c) => c.suit === "hearts" || c.suit === "diamonds" },
  black: { text: "black", count: 26, test: (c) => c.suit === "spades" || c.suit === "clubs" },
  hearts: { text: "hearts", count: 13, test: (c) => c.suit === "hearts" },
  spades: { text: "spades", count: 13, test: (c) => c.suit === "spades" },
  "low": { text: "numbered 2 to 9", count: 32, test: (c) => c.rank >= 2 && c.rank <= 9 },
};

function threeCards(params: { type: "three-cards"; event: string }): QuantProblem {
  const event = THREE_CARD_TESTS[params.event];
  const factors = [0, 1, 2].map((i) => q(event.count - i, 52 - i));
  const chance = factors.reduce((acc, f) => mul(acc, f), q(1));
  return problem(
    `three-cards-${params.event}`,
    `You deal three cards from a shuffled deck. What’s the chance all three are ${event.text}?`,
    chance,
    "probability",
    [
      ...[0, 1, 2].map((i) => ({
        label: ["First card", "Second card", "Third card"][i],
        work: i === 0 ? `${event.count} of 52` : `${event.count - i} of the ${52 - i} left`,
        result: `${event.count - i}/${52 - i}`,
        icon: (i === 0 ? "count" : "repeat") as "count" | "repeat",
        explain: i === 0 ? `${event.count} of the 52 cards are ${event.text}.` : "One matching card is gone and not put back, so there’s one fewer of them and one fewer card.",
        ...(i === 0 ? { visual: deck([{ test: event.test, tone: "hit" }]) } : {}),
      })),
      {
        label: "All three",
        work: `${event.count}/52 × ${event.count - 1}/51 × ${event.count - 2}/50`,
        icon: "multiply",
        explain: "Each card must match, so multiply the chance for each draw.",
      },
    ],
    params,
  );
}

export const BASICS_LESSONS: QuantLessonDef[] = [
  {
    id: "equally-likely",
    title: "Equally likely outcomes",
    benefit: "Find a chance by counting outcomes",
    summary: "How to find a chance by counting: the outcomes you want divided by all the outcomes, when every outcome is equally likely.",
    difficulty: "Easy",
    parts: [
      {
        type: "text",
        body: ["You roll two fair dice. What’s the chance the total is 7?"],
      },
      {
        type: "check",
        prompt: "What’s the chance of a 7?",
        choices: ["1/12", "1/11", "1/6", "7/36"],
        answer: 2,
        explain:
          "It’s 6/36 = 1/6. The answer 1/11 treats the 11 totals from 2 to 12 as equally likely, but a 7 can be rolled six ways and a 2 only one way.",
      },
      {
        type: "story",
        heading: "Count the pairs",
        beats: [
          {
            text: "Paint one die red and the other blue. Each has 6 faces, so the pair can land 6 × 6 = 36 ways, and every way is equally likely.",
            visual: diceGrid(6, [], "Rows: red die. Columns: blue die."),
          },
          {
            text: "Mark the rolls that total 7: 1 and 6, 2 and 5, 3 and 4, and each of those the other way round. That’s 6 of the 36.",
            visual: diceGrid(6, [{ test: (a, b) => a + b === 7, tone: "hit" }]),
          },
          {
            text: "Each roll has chance 1/36, so a total of 7 has chance 6/36 = 1/6. A total of 2 needs both dice to show 1. That’s a single roll, with chance 1/36.",
            visual: diceGrid(6, [
              { test: (a, b) => a + b === 7, tone: "hit" },
              { test: (a, b) => a + b === 2, tone: "alt" },
            ]),
          },
        ],
      },
      {
        type: "text",
        heading: "Why it works",
        body: [
          "An event is any set of outcomes you care about, such as “the total is 7”. When every outcome is equally likely, each carries the same share of the chance, so an event’s chance is its share of the outcomes.",
          "The outcomes really do have to be equally likely. The 11 totals aren’t, which is why you count the 36 ordered pairs instead.",
        ],
      },
      {
        type: "rule",
        rule: "P(event) = outcomes in the event ÷ all outcomes",
        note: "For a total of 7: 6 outcomes in the event out of 36, so P(total is 7) = 6/36 = 1/6. P(…) is shorthand for “the chance of”.",
      },
      {
        type: "check",
        prompt: "Two dice again. What’s the chance the red die shows a higher number than the blue one?",
        choices: ["1/3", "5/12", "1/2", "7/12"],
        answer: 1,
        explain:
          "6 of the 36 rolls are doubles. The other 30 split evenly between red higher and blue higher, so the chance is 15/36 = 5/12. The answer 1/2 forgets the doubles, where neither die is higher.",
      },
      { type: "example", lead: "With one card from a shuffled deck, the 52 cards are the equally likely outcomes. Here you count the cards that are a heart or a king." },
      {
        type: "trap",
        body: "Counting outcomes that aren’t equally likely. Two dice give 11 possible totals, but a 7 is six times as likely as a 2, so 1/11 is wrong. Count the 36 ordered pairs instead.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The setup is fair: dice, coins, a shuffled deck or a random pick from a list",
          "You can list or count every outcome, and each is as likely as any other",
          "Two dice are rolled, where you count the 36 ordered pairs rather than the totals",
        ],
      },
    ],
    targetSeconds: 30,
    example: countOutcomes({ type: "card", event: "heart-or-king" }),
    families: [
      { id: "one-card", title: "One card from a deck", generate: (random) => countOutcomes({ type: "card", event: pick(random, CARD_EVENTS).id }) },
      {
        id: "one-die",
        title: "One roll of a die",
        generate: (random) => {
          const sides = pick(random, DIE_SIDES);
          return countOutcomes({ type: "die", sides, atLeast: int(random, 2, sides - 1) });
        },
      },
      {
        id: "two-dice-total",
        title: "Two dice: a total or a double",
        generate: (random) => {
          const roll = random();
          if (roll < 0.2) return twoDice({ type: "double", total: 0 });
          if (roll < 0.6) return twoDice({ type: "exactly", total: int(random, 3, 11) });
          return twoDice({ type: "at-least", total: int(random, 8, 11) });
        },
      },
      {
        id: "two-rolls-compared",
        title: "Two rolls compared",
        generate: (random) =>
          random() < 0.5
            // Dice up to 8 sides, so every pair fits on the grid figure.
            ? compareRolls({ type: "compare", sides: pick(random, [4, 5, 6, 7, 8]), ask: "less", gap: 0 })
            : compareRolls({ type: "compare", sides: pick(random, [5, 6, 7, 8]), ask: "apart", gap: int(random, 1, 3) }),
      },
      {
        id: "bigger-die",
        title: "A bigger die against a smaller one",
        generate: (random) => {
          const [big, small] = pick(random, [[6, 4], [8, 6], [10, 6], [12, 8], [20, 12], [30, 20], [8, 4], [12, 6]] as const);
          return moreLikely({ type: "bigger-die", big, small });
        },
      },
      {
        id: "rising-rolls",
        title: "Rolls that keep going up",
        generate: (random) => {
          const [sides, rolls] = pick(random, [[6, 2], [6, 3], [8, 2], [8, 3], [4, 2], [4, 3], [10, 3], [10, 4], [12, 3]] as const);
          return moreLikely({ type: "increasing", sides, rolls });
        },
      },
      {
        id: "each-face-equally",
        title: "Each result an exact number of times",
        generate: (random) => {
          const [sides, rolls] = pick(random, [[2, 4], [2, 6], [2, 8], [3, 3], [3, 6], [4, 4], [4, 8], [6, 6]] as const);
          return moreLikely({ type: "exact-faces", sides, rolls });
        },
      },
      {
        id: "hands-teams",
        title: "Card hands and random teams",
        generate: (random) => {
          if (random() < 0.55) {
            const cards = int(random, 3, 6);
            // At most 3 hearts, so the chance stays above 1% and types cleanly.
            return handsAndTeams({ type: "hearts", cards, hearts: int(random, 1, Math.min(cards - 1, 3)) });
          }
          const men = int(random, 3, 7), women = int(random, 3, 7), size = int(random, 3, 5);
          return handsAndTeams({ type: "team", men, women, size, picked: int(random, Math.max(1, size - men), Math.min(size - 1, women)) });
        },
      },
      { id: "poker-hands", title: "Poker hands", generate: (random) => moreLikely({ type: "poker-chance", hand: pick(random, Object.keys(POKER_CHANCES)) }) },
      { id: "shuffle-order", title: "Which card comes first in a shuffle", generate: (random) => moreLikely({ type: "shuffle-order", order: pick(random, Object.keys(SHUFFLE_ORDERS)) }) },
    ],
  },
  {
    id: "complements",
    title: "Complements",
    benefit: "Use 1 minus the chance it doesn’t happen",
    summary: "How to find the chance of “at least one” by working out the chance of none and taking it away from 1.",
    difficulty: "Easy",
    parts: [
      {
        type: "text",
        body: ["You roll a fair die 4 times. What’s the chance of at least one six?"],
      },
      {
        type: "check",
        prompt: "Which is closest?",
        choices: ["1/6", "About 48%", "About 52%", "2/3"],
        answer: 2,
        explain:
          "It’s about 52%. The answer 2/3 adds 1/6 four times, which counts rolls with two or more sixes more than once. Carry on to six rolls and the sum reaches 1, a certain six, which can’t be right.",
      },
      {
        type: "story",
        heading: "Count the rolls with no six",
        beats: [
          {
            text: "“At least one six” covers many cases: a six on the first roll, on the third, on two of the rolls, and so on. Its opposite, no six at all, is one case. On a single roll it means one of these 5 faces.",
            visual: { type: "die-faces", sides: 6, marks: [{ faces: [1, 2, 3, 4, 5], tone: "known" }], caption: "The 5 faces that aren’t a six" },
          },
          {
            text: "By the multiplying rule, 4 rolls have 6 × 6 × 6 × 6 = 1,296 possible sequences. Of those, 5 × 5 × 5 × 5 = 625 have no six, a chance of 625/1296, about 48%.",
            visual: {
              type: "slots",
              op: "×",
              slots: [
                { label: "Roll 1", value: "5", tone: "known" },
                { label: "Roll 2", value: "5", tone: "known" },
                { label: "Roll 3", value: "5", tone: "known" },
                { label: "Roll 4", value: "5", tone: "known" },
              ],
              result: "625",
              caption: "Sequences with no six, out of 1,296",
            },
          },
          {
            text: "Every sequence has either no six or at least one, so the two chances add up to 1. The chance of at least one six is 1 − 625/1296 = 671/1296, about 52%.",
            visual: {
              type: "bars",
              bars: [
                { label: "No six", value: 625, tone: "known", text: "48%" },
                { label: "At least one six", value: 671, tone: "hit", text: "52%" },
              ],
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why it works",
        body: [
          "The complement of an event is everything outside it: the complement of “at least one six” is “no six”. An event and its complement share out all the outcomes between them, so their chances add up to 1.",
          "When an event can happen in many ways but fails in only one, work out the chance it fails and take that from 1.",
        ],
      },
      {
        type: "rule",
        rule: "P(event) = 1 − P(not the event)",
        note: "For four rolls: P(at least one six) = 1 − P(no six) = 1 − (5/6)⁴ ≈ 0.52.",
      },
      {
        type: "check",
        prompt: "Three people each pick a whole number from 1 to 10 at random. What’s the chance at least two of them pick the same number?",
        choices: ["27%", "28%", "30%", "72%"],
        answer: 1,
        explain:
          "The complement is “all three different”: 10 × 9 × 8 = 720 of the 10 × 10 × 10 = 1,000 possible picks, or 72%. So the chance of a match is 1 − 0.72 = 28%. This is the birthday problem with 10 days instead of 365.",
      },
      { type: "example", lead: "The same working for three rolls instead of four." },
      {
        type: "trap",
        body: "Adding the chance for each try. 1/6 + 1/6 + 1/6 + 1/6 = 2/3 counts rolls with two or more sixes more than once, and with seven rolls the sum would go over 1.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The question says “at least one”",
          "The event happens in many ways but fails in only one, like missing on every try",
          "You’re asked whether any two of several random picks match",
        ],
      },
    ],
    targetSeconds: 30,
    example: atLeastOne({ type: "sixes", rolls: 3 }),
    families: [
      {
        id: "repeated-rolls",
        title: "At least one in repeated rolls",
        generate: (random) =>
          random() < 0.5 ? atLeastOne({ type: "sixes", rolls: int(random, 2, 4) }) : atLeastOne({ type: "low", rolls: int(random, 2, 4) }),
      },
      // Up to 6 flips, so the chance stays under 99% and types cleanly.
      { id: "at-least-one-head", title: "At least one head", generate: (random) => atLeastOne({ type: "heads", flips: int(random, 3, 6) }) },
      { id: "at-least-one-ace", title: "At least one ace in a few cards", generate: (random) => atLeastOne({ type: "ace", cards: int(random, 2, 5) }) },
      {
        id: "shared-birthdays",
        title: "Shared birth months, days or numbers",
        generate: (random) => {
          const things = pick(random, ["months", "weekdays", "dice"]);
          const people = things === "months" ? int(random, 2, 7) : int(random, 2, 4);
          return moreComplements({ type: "shared", things, people, ask: random() < 0.7 ? "share" : "different" });
        },
      },
      {
        id: "shares-yours",
        title: "Someone matches yours",
        generate: (random) => {
          const things = pick(random, ["months", "weekdays", "dice"]);
          return moreComplements({ type: "yours", things, people: int(random, 2, things === "months" ? 8 : 5) });
        },
      },
    ],
  },
  {
    id: "or-events",
    title: "“Or” events",
    benefit: "Add chances without double counting",
    summary: "How to find the chance that one thing or another happens: add the two chances and take off the chance of both once.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: ["You roll two fair dice, one red and one blue. What’s the chance you roll a double, or the red die shows a 6?"],
      },
      {
        type: "check",
        prompt: "What’s the chance of a double or a red 6?",
        choices: ["1/36", "1/6", "11/36", "1/3"],
        answer: 2,
        explain: "It’s 11/36. There are 6 doubles and 6 rolls with a red 6, but double six is in both lists. That leaves 6 + 6 − 1 = 11 rolls. The answer 1/3 is 12/36, which counts double six twice.",
      },
      {
        type: "story",
        heading: "Mark both events on the grid",
        beats: [
          {
            text: "Mark the 6 doubles.",
            visual: diceGrid(6, [{ test: (a, b) => a === b, tone: "hit" }], "Rows: red die. Columns: blue die."),
          },
          {
            text: "Now mark the 6 rolls where the red die shows a 6. One of them, double six, is already marked.",
            visual: diceGrid(6, [
              { test: (a, b) => a === b, tone: "hit" },
              { test: (a) => a === 6, tone: "alt" },
              { test: (a, b) => a === 6 && b === 6, tone: "both" },
            ]),
          },
          {
            text: "Count the marked cells: 6 + 6 − 1 = 11 of the 36. The chance is 11/36.",
            visual: diceGrid(
              6,
              [
                { test: (a, b) => a === b, tone: "hit" },
                { test: (a) => a === 6, tone: "alt" },
                { test: (a, b) => a === 6 && b === 6, tone: "both" },
              ],
              "11 of 36 rolls",
            ),
          },
        ],
      },
      {
        type: "text",
        heading: "Why it works",
        body: [
          "This is inclusion–exclusion from the counting unit, written with chances instead of counts. Dividing each count by 36 gives P(double) = 6/36, P(red 6) = 6/36 and P(both) = 1/36.",
          "Some pairs of events can’t happen together, like a total of 2 and a total of 12. Such events are called mutually exclusive. There’s no overlap to take off, so their chances add.",
        ],
      },
      {
        type: "rule",
        rule: "P(A or B) = P(A) + P(B) − P(A and B)",
        note: "For the dice: 6/36 + 6/36 − 1/36 = 11/36. If A and B can’t both happen, P(A and B) = 0 and the chances add.",
      },
      {
        type: "check",
        prompt: "You draw one card from a shuffled deck. What’s the chance it’s red or a king?",
        choices: ["2/13", "1/2", "15/26", "7/13"],
        answer: 3,
        explain:
          "26 red cards plus 4 kings counts the king of hearts and the king of diamonds twice. 26 + 4 − 2 = 28 cards, and 28/52 = 7/13. The answer 15/26 is 30/52, which forgets the overlap.",
      },
      { type: "example", lead: "With one card the overlap is the cards that meet both conditions. Here those are the spade face cards." },
      {
        type: "trap",
        body: "Adding the two chances when the events overlap. 6/36 + 6/36 = 12/36 counts double six twice. Before adding, ask whether one roll or one card can meet both conditions.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The question says “or” or “at least one of” two named things",
          "One draw can meet both conditions, like a red king",
          "Two events can’t both happen, like a total of 2 and a total of 12, so their chances add",
        ],
      },
    ],
    targetSeconds: 30,
    example: orEvents({ type: "cards", event: "spade-face" }),
    families: [
      { id: "or-cards", title: "One card: this or that", generate: (random) => orEvents({ type: "cards", event: pick(random, OR_CARD_EVENTS).id }) },
      { id: "or-dice", title: "Two dice: this or that", generate: (random) => orEvents({ type: "dice", event: pick(random, OR_DICE_EVENTS).id }) },
      {
        id: "or-two-chances",
        title: "Two separate chances",
        generate: (random) =>
          orEvents({
            type: "independent",
            pair: pick(random, INDEPENDENT_PAIRS).id,
            aPercent: pick(random, [10, 20, 25, 30, 40, 50, 60]),
            bPercent: pick(random, [10, 20, 30, 40, 50, 70]),
          }),
      },
      {
        id: "or-three-chances",
        title: "At least one of three",
        generate: (random) =>
          threeIndependent({
            type: "three",
            event: pick(random, THREE_EVENTS).id,
            a: pick(random, [10, 20, 30, 40, 50]),
            b: pick(random, [10, 20, 25, 40, 60]),
            c: pick(random, [10, 30, 50, 70]),
          }),
      },
    ],
  },
  {
    id: "and-events",
    title: "“And” events",
    benefit: "Multiply chances when all must happen",
    summary: "How to find the chance that several things all happen: multiply each chance, given the ones that came before it.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: ["A drawer holds 6 black socks and 4 white socks. You pull out two in the dark. What’s the chance both are black?"],
      },
      {
        type: "check",
        prompt: "What’s the chance both are black?",
        choices: ["1/3", "9/25", "1/2", "3/5"],
        answer: 0,
        explain: "It’s 6/10 × 5/9 = 1/3. The answer 9/25 is 6/10 × 6/10, which would be right only if you put the first sock back before taking the second.",
      },
      {
        type: "story",
        heading: "One sock at a time",
        beats: [
          {
            text: "6 of the 10 socks are black, so the first sock is black with chance 6/10.",
            visual: {
              type: "marbles",
              groups: [
                { count: 6, tone: "hit", label: "Black" },
                { count: 4, tone: "alt", label: "White" },
              ],
            },
          },
          {
            text: "Suppose it was. The drawer now holds 5 black socks out of 9, so the second is black with chance 5/9.",
            visual: {
              type: "marbles",
              groups: [
                { count: 6, tone: "hit", label: "Black" },
                { count: 4, tone: "alt", label: "White" },
              ],
              taken: ["hit"],
            },
          },
          {
            text: "Both are black in 5/9 of the 6/10 of cases where the first one is. A fraction of a fraction is a product: 6/10 × 5/9 = 1/3.",
            visual: {
              type: "marbles",
              groups: [
                { count: 6, tone: "hit", label: "Black" },
                { count: 4, tone: "alt", label: "White" },
              ],
              taken: ["hit", "hit"],
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why it works",
        body: [
          "You can check it by counting. There are 10 × 9 = 90 ways to pull two socks in order, and 6 × 5 = 30 of them give two blacks. That’s 30/90 = 1/3 again.",
          "The 5/9 is a conditional chance: the chance the second sock is black, given the first was. When one result doesn’t change the other, as with a coin flip and a die roll, the events are called independent and you multiply their plain chances.",
        ],
      },
      {
        type: "rule",
        rule: "P(A and B) = P(A) × P(B given A)",
        note: "For the socks: P(first black) × P(second black given the first was) = 6/10 × 5/9 = 1/3. With replacement, or for independent events, P(B given A) is the same as P(B).",
      },
      {
        type: "check",
        prompt: "From the same drawer of 6 black and 4 white socks, you pull out three. What’s the chance all three are black?",
        choices: ["1/6", "1/5", "27/125", "1/3"],
        answer: 0,
        explain:
          "Each black sock you take leaves one fewer black and one fewer sock: 6/10 × 5/9 × 4/8 = 1/6. The answer 27/125 is (6/10)³, which assumes you put each sock back.",
      },
      { type: "example", lead: "The same working with marbles: 5 red and 3 blue in a bag, two drawn without putting any back." },
      {
        type: "trap",
        body: "Using the same chance for every draw. Without putting things back, the second draw has one fewer to pick from: 6/10 × 5/9, not 6/10 × 6/10.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The question says “both”, “all” or “every”",
          "Draws happen one after another, with or without putting things back",
          "Separate events don’t affect each other, like a coin flip and a die roll",
        ],
      },
    ],
    targetSeconds: 30,
    example: inARow({ type: "bag", red: 5, blue: 3, draws: 2 }),
    families: [
      {
        id: "marbles",
        title: "Marbles without putting back",
        generate: (random) => {
          const red = int(random, 3, 7);
          return inARow({ type: "bag", red, blue: int(random, 2, 6), draws: int(random, 2, 3) });
        },
      },
      // Not two aces: 1 in 221 is too small to type cleanly.
      { id: "two-cards", title: "Two cards, both alike", generate: (random) => inARow({ type: "cards", event: pick(random, DRAW_EVENTS.filter((e) => e.id !== "aces")).id }) },
      { id: "three-cards", title: "Three cards, all alike", generate: (random) => threeCards({ type: "three-cards", event: pick(random, Object.keys(THREE_CARD_TESTS)) }) },
      {
        id: "two-chances",
        title: "Two separate chances, both",
        generate: (random) =>
          allIndependent({
            type: "independent",
            pair: pick(random, INDEPENDENT_PAIRS).id,
            aPercent: pick(random, [20, 30, 40, 50, 60, 70, 80, 90]),
            bPercent: pick(random, [20, 25, 50, 60, 75, 80, 90]),
          }),
      },
      {
        id: "every-try",
        title: "Every try succeeds",
        generate: (random) =>
          allTries({ type: "all-tries", context: pick(random, TRIES).id, tries: int(random, 2, 5), percent: pick(random, [60, 70, 75, 80, 90, 95]) }),
      },
    ],
  },
];
