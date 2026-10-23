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
      `You roll a fair ${sides}-sided die. What's the chance of rolling ${atLeast} or higher?`,
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
    `You draw one card from a shuffled 52-card deck. What's the chance it's ${event.label}?`,
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

/** Card events made of two groups, so the figure can colour the second group's extra cards. */
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
      "You roll two fair dice. What's the chance they show the same number?",
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
    `You roll two fair dice. What's the chance the total is ${type === "exactly" ? total : `${total} or more`}?`,
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
        `You roll a fair die ${timesWord(rolls)}. What's the chance of at least one roll showing ${target}?`,
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
        `You flip a fair coin ${flips} times. What's the chance of at least one head?`,
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
        `You deal ${cards} cards from a shuffled deck. What's the chance at least one is an ace?`,
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
      `A bag has ${red} red and ${blue} blue marbles. You take out ${numberWord(draws)} without putting any back. What's the chance they're ${draws === 2 ? "both" : "all"} red?`,
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
    `You deal two cards from a shuffled deck. What's the chance both are ${event.label}?`,
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
      `You roll a fair ${sides}-sided die twice. What's the chance the first roll is lower than the second?`,
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
    `You roll a fair ${sides}-sided die twice. What's the chance the two rolls differ by exactly ${gap}?`,
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
      `You draw one card from a shuffled 52-card deck. What's the chance it's ${event.a} or ${event.b}?`,
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
      `You roll two fair dice. What's the chance ${event.a}, or ${event.b}?`,
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
    `The chance ${pair.a} is ${aPercent}%, and the chance ${pair.b} is ${bPercent}%. They don’t affect each other. What's the chance at least one of them happens?`,
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
    `The chance ${pair.a} is ${aPercent}%, and the chance ${pair.b} is ${bPercent}%. They don’t affect each other. What's the chance both happen?`,
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
      `You're dealt ${cards} cards from a shuffled deck. What's the chance exactly ${hearts} ${hearts === 1 ? "is a heart" : "are hearts"}?`,
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
    `A team of ${size} is picked at random from ${men} men and ${women} women. What's the chance it has exactly ${picked} ${picked === 1 ? "woman" : "women"}?`,
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

export const BASICS_LESSONS: QuantLessonDef[] = [
  {
    id: "equally-likely",
    title: "Equally likely outcomes",
    benefit: "Find a chance by counting outcomes",
    idea: "If every outcome is equally likely, the chance is the outcomes you want divided by all the outcomes. When there are too many to list, count both with combinations.",
    difficulty: "Easy",
    intro:
      "When no outcome is more likely than another, each one carries the same share of the chance. So the chance of an event is just the share of outcomes where it happens. The hard part is counting both lists carefully.",
    formula: "Chance = outcomes you want ÷ all outcomes",
    cues: [
      "Fair dice, shuffled cards, or a random pick where every result is equally likely",
      "You can list or count every possible outcome",
      "Two dice: count pairs, where 3+6 and 6+3 are different",
    ],
    mistake: "Counting outcomes that aren’t equally likely, like the totals 2 to 12 on two dice, instead of the 36 pairs of rolls.",
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
            // Dice up to 8 sides, so every pair fits on the grid figure.
            ? compareRolls({ type: "compare", sides: pick(random, [4, 5, 6, 7, 8]), ask: "less", gap: 0 })
            : compareRolls({ type: "compare", sides: pick(random, [5, 6, 7, 8]), ask: "apart", gap: int(random, 1, 3) }),
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
    difficulty: "Easy",
    intro:
      "Every outcome either has the event or doesn’t, so the two chances add up to 1. “At least one six” covers many cases, but “no six” is only one: miss every time. Work out the simple side and take it from 1.",
    formula: "Chance it happens = 1 − chance it doesn’t",
    cues: [
      "The question says “at least one”",
      "Counting the ways it happens means many cases, but it fails in only one way",
      "Repeated tries: rolls, flips or cards dealt",
    ],
    mistake: "Adding the chance for each try, like 1/6 + 1/6 + 1/6 for three rolls. That counts overlaps twice and can go over 1.",
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
    difficulty: "Medium",
    intro:
      "Adding the chance of A and the chance of B counts the outcomes where both happen twice. Taking the “both” chance off once leaves every outcome counted once. If A and B can never happen together, there’s nothing to take off.",
    formula: "P(A or B) = P(A) + P(B) − P(A and B)",
    cues: [
      "The question says “or” or “at least one of”",
      "Two conditions that can both be true, like a spade that’s also a face card",
      "Two separate events with given chances",
    ],
    mistake: "Just adding the two chances when they can both happen, so the overlap is counted twice.",
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
    difficulty: "Medium",
    intro:
      "If the first thing happens in 5 of 8 cases, the second has to happen inside those 5. So you take a share of a share, which is multiplying. Without replacement, the second share changes because the first draw is gone.",
    formula: "P(A and B) = P(A) × P(B, given A happened)",
    cues: [
      "The question says “both”, “all” or “and”",
      "Draws one after another, with or without putting things back",
      "Separate events that don’t affect each other",
    ],
    mistake: "Forgetting that a draw without replacement changes what’s left, and using 5/8 × 5/8 instead of 5/8 × 4/7.",
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
