import { add, div, formatFraction, formatPercent, mul, pow, q, sub, value, type Rational } from "../rational";
import { DECK, choose, int, isFace, isRed, pick, problem, sup, type Card, type QuantLessonDef, type QuantProblem, type Random } from "../build";
import type { CardId, QuantVisual, Tone, TreeNode } from "../visual";

const SUIT_LETTER = { hearts: "H", spades: "S", diamonds: "D", clubs: "C" } as const;
const cardId = (card: Card) => `${card.rank}${SUIT_LETTER[card.suit]}` as CardId;

// ─── Conditional probability ─────────────────────────────────────────────────────────────

type Marks<T> = { items: T[]; tone: Tone }[];
/** `figure` draws the space with some outcomes marked (the last mark that includes one wins). */
type Space<T> = { id: string; outcomes: T[]; setup: string; unit: string; figure: (marks: Marks<T>) => QuantVisual };
/** `label` names the step when "<unit> where <text>" would read badly. */
type Filter<T> = { id: string; text: string; test: (outcome: T) => boolean; label?: string };

const faces6 = [1, 2, 3, 4, 5, 6];
const DICE: Space<number[]> = {
  id: "dice",
  outcomes: faces6.flatMap((a) => faces6.map((b) => [a, b])),
  setup: "You roll two fair dice",
  unit: "rolls",
  figure: (marks) => ({
    type: "dice-grid",
    sides: 6,
    marks: marks.map((m) => ({ cells: m.items.map((r) => [r[0], r[1]] as [number, number]), tone: m.tone })),
  }),
};
const DICE_KNOWN: Filter<number[]>[] = [
  { id: "one-six", text: "at least one is a 6", test: (r) => r.includes(6) },
  { id: "one-one", text: "at least one is a 1", test: (r) => r.includes(1) },
  ...[6, 7, 8, 9, 10].map((total) => ({ id: `total-${total}`, text: `the total is ${total}`, test: (r: number[]) => r[0] + r[1] === total })),
  { id: "total-9-up", text: "the total is at least 9", test: (r) => r[0] + r[1] >= 9 },
  { id: "different", text: "they show different numbers", test: (r) => r[0] !== r[1] },
  { id: "first-even", text: "the first die is even", test: (r) => r[0] % 2 === 0 },
];
const DICE_ASKED: Filter<number[]>[] = [
  { id: "both-six", text: "both are 6s", test: (r) => r[0] === 6 && r[1] === 6 },
  { id: "has-six", text: "at least one is a 6", test: (r) => r.includes(6) },
  { id: "double", text: "they show the same number", test: (r) => r[0] === r[1] },
  { id: "total-10-up", text: "the total is at least 10", test: (r) => r[0] + r[1] >= 10 },
  { id: "first-higher", text: "the first die is higher than the second", test: (r) => r[0] > r[1] },
  { id: "total-even", text: "the total is even", test: (r) => (r[0] + r[1]) % 2 === 0 },
];

const flips = (n: number) =>
  Array.from({ length: 2 ** n }, (_, mask) => Array.from({ length: n }, (_, i) => ((mask >> (n - 1 - i)) & 1 ? "H" : "T")));
const heads = (f: string[]) => f.filter((x) => x === "H").length;

/** Every sequence of two-way outcomes as a tree, each branch 1/2; leaves show the whole sequence. */
function sequenceTree(n: number, symbols: [string, string], marks: Marks<string[]>, start: string): QuantVisual {
  const toneOf = (seq: string[]) => {
    let tone: Tone = "muted";
    for (const mark of marks) if (mark.items.some((s) => s.join("") === seq.join(""))) tone = mark.tone;
    return tone;
  };
  const grow = (seq: string[]): TreeNode[] =>
    symbols.map((symbol) => {
      const next = [...seq, symbol];
      return next.length === n
        ? { label: next.join(""), edge: "1/2", tone: toneOf(next) }
        : { label: symbol, edge: "1/2", children: grow(next) };
    });
  return { type: "tree", root: { label: start, children: grow([]) } };
}

const COINS: Space<string[]>[] = [3, 4].map((n) => ({
  id: `coins-${n}`,
  outcomes: flips(n),
  setup: `You flip ${n} fair coins`,
  unit: "outcomes",
  figure: (marks) => sequenceTree(n, ["H", "T"], marks, "Flips"),
}));
const COINS_KNOWN: Filter<string[]>[] = [
  { id: "one-head", text: "at least one is heads", test: (f) => heads(f) >= 1 },
  { id: "two-heads", text: "at least two are heads", test: (f) => heads(f) >= 2 },
  { id: "first-heads", text: "the first is heads", test: (f) => f[0] === "H" },
];
const COINS_ASKED: Filter<string[]>[] = [
  { id: "all-heads", text: "they’re all heads", test: (f) => f.every((x) => x === "H") },
  { id: "exactly-two", text: "exactly two are heads", test: (f) => heads(f) === 2 },
  { id: "two-up", text: "at least two are heads", test: (f) => heads(f) >= 2 },
];

// Children listed oldest first; each is equally likely a boy or a girl.
const CHILDREN: Space<string[]>[] = [2, 3].map((n) => ({
  id: `children-${n}`,
  outcomes: flips(n).map((f) => f.map((x) => (x === "H" ? "B" : "G"))),
  setup: `A family has ${n} children, each equally likely a boy or a girl. You’re told`,
  unit: "families",
  figure: (marks: Marks<string[]>) => sequenceTree(n, ["B", "G"], marks, "Oldest first"),
}));
const boys = (c: string[]) => c.filter((x) => x === "B").length;
const CHILDREN_KNOWN: Filter<string[]>[] = [
  { id: "one-boy", text: "at least one is a boy", test: (c) => boys(c) >= 1 },
  { id: "oldest-boy", text: "the oldest is a boy", test: (c) => c[0] === "B" },
  { id: "two-boys", text: "at least two are boys", test: (c) => boys(c) >= 2 },
];
const childrenAsked = (n: number): Filter<string[]>[] => [
  { id: "all-boys", text: n === 2 ? "both are boys" : "all three are boys", test: (c) => boys(c) === c.length },
];

const CARD_SPACE: Space<Card> = {
  id: "card",
  outcomes: DECK,
  setup: "You draw one card from a shuffled deck",
  unit: "cards",
  figure: (marks) => ({ type: "cards", marks: marks.map((m) => ({ cards: m.items.map(cardId), tone: m.tone })) }),
};
const CARDS_KNOWN: Filter<Card>[] = [
  { id: "red", text: "it’s red", test: isRed, label: "Red cards" },
  { id: "face", text: "it’s a face card (J, Q or K)", test: isFace, label: "Face cards" },
  { id: "heart", text: "it’s a heart", test: (c) => c.suit === "hearts", label: "Hearts" },
  { id: "not-heart", text: "it’s not a heart", test: (c) => c.suit !== "hearts", label: "Cards that aren’t hearts" },
  { id: "high", text: "it’s a 10 or higher (10, J, Q, K)", test: (c) => c.rank >= 10, label: "Cards 10 or higher" },
];
const CARDS_ASKED: Filter<Card>[] = [
  { id: "heart", text: "it’s a heart", test: (c) => c.suit === "hearts", label: "Of those, hearts" },
  { id: "king", text: "it’s a king", test: (c) => c.rank === 13, label: "Of those, kings" },
  { id: "face", text: "it’s a face card", test: isFace, label: "Of those, face cards" },
  { id: "red-face", text: "it’s a red face card", test: (c) => isRed(c) && isFace(c), label: "Of those, red face cards" },
];

function conditional<T>(space: Space<T>, known: Filter<T>, asked: Filter<T>) {
  const fit = space.outcomes.filter(known.test);
  const both = fit.filter(asked.test).length;
  const isChildren = space.id.startsWith("children");
  const prompt = isChildren
    ? `${space.setup} ${known.text}. What’s the chance ${asked.text}?`
    : `${space.setup} and are told ${known.text}. What’s the chance ${asked.text}?`;
  return problem(
    `${space.id}-${known.id}-${asked.id}`,
    prompt,
    q(both, fit.length),
    "probability",
    [
      {
        label: known.label ?? `${space.unit[0].toUpperCase()}${space.unit.slice(1)} where ${known.text}`,
        work: `${fit.length} of ${space.outcomes.length}`,
        icon: "filter",
        explain: `You’re told ${known.text.replace(/^it’s /, "it’s ")}, so only these ${fit.length} of the ${space.outcomes.length} equally likely ${space.unit} are still possible.`,
        visual: space.figure([{ items: fit, tone: "known" }]),
      },
      {
        label: asked.label ?? `Of those, ${asked.text}`,
        work: `${both} of ${fit.length}`,
        icon: "count",
        explain: `Of the ${fit.length} that are left, ${both} also ${both === 1 ? "fits" : "fit"} the question. Divide by ${fit.length}, not by all ${space.outcomes.length}.`,
        visual: space.figure([
          { items: fit, tone: "known" },
          { items: fit.filter(asked.test), tone: "hit" },
        ]),
      },
    ],
    { space: space.id, known: known.id, asked: asked.id },
    space.figure([]),
  );
}

/** Every (known, asked) pair in a space whose answer is a real question: not 0, 1 or near them. */
function conditionalPairs<T>(space: Space<T>, known: Filter<T>[], asked: Filter<T>[]) {
  return known.flatMap((k) =>
    asked
      .filter((a) => a.text !== k.text)
      .filter((a) => {
        const fit = space.outcomes.filter(k.test);
        const share = fit.filter(a.test).length / fit.length;
        return share > 0.02 && share < 0.98;
      })
      .map((a) => () => conditional(space, k, a)),
  );
}

const DICE_PROBLEMS = conditionalPairs(DICE, DICE_KNOWN, DICE_ASKED);
const COIN_PROBLEMS = COINS.flatMap((space) => conditionalPairs(space, COINS_KNOWN, COINS_ASKED));
const CHILDREN_PROBLEMS = CHILDREN.flatMap((space) => conditionalPairs(space, CHILDREN_KNOWN, childrenAsked(space.outcomes[0].length)));
const CARD_PROBLEMS = conditionalPairs(CARD_SPACE, CARDS_KNOWN, CARDS_ASKED);

/** What the first two cards had in common, and what’s asked about the next draw. */
const NEXT_DRAWS = [
  { id: "pair-pair", after: "pair", ask: "pair" },
  { id: "pair-match", after: "pair", ask: "match" },
  { id: "suit-suit", after: "suit", ask: "pair" },
  { id: "suit-match", after: "suit", ask: "match" },
  { id: "red-red", after: "red", ask: "both-red" },
  { id: "red-same", after: "red", ask: "same-colour" },
] as const;

/** A card’s class for each kind of match: its rank, its suit, or its colour. */
const classOf = { pair: (c: Card) => `${c.rank}`, suit: (c: Card) => c.suit, red: (c: Card) => (isRed(c) ? "red" : "black") };

/**
 * The first two cards share something (a rank, a suit, a colour); what’s the chance the next
 * draw does too? Two cards are gone, so the groups they came from are smaller.
 */
function nextDraw(params: { draw: string }) {
  const draw = NEXT_DRAWS.find((d) => d.id === params.draw)!;
  // A concrete first two cards; any with the same shared property give the same answer.
  const gone: Card[] =
    draw.after === "pair"
      ? [{ rank: 13, suit: "hearts" }, { rank: 13, suit: "spades" }]
      : draw.after === "suit"
        ? [{ rank: 2, suit: "hearts" }, { rank: 7, suit: "hearts" }]
        : [{ rank: 5, suit: "hearts" }, { rank: 9, suit: "diamonds" }];
  const left = DECK.filter((c) => !gone.some((g) => g.rank === c.rank && g.suit === c.suit));
  const kind = classOf[draw.after];
  const theirs = left.filter((c) => kind(c) === kind(gone[0]));
  const what = draw.after === "pair" ? "share a rank" : draw.after === "suit" ? "are the same suit" : "are both red";
  const thing = draw.after === "pair" ? "rank" : "suit";
  const deck = (marks: { cards: Card[]; tone: Tone }[]): QuantVisual => ({
    type: "cards",
    marks: [{ cards: gone.map(cardId), tone: "known" as Tone }, ...marks.map((m) => ({ cards: m.cards.map(cardId), tone: m.tone }))],
  });
  const goneStep = {
    label: "Cards left",
    work: "52 − 2",
    result: "50",
    icon: "subtract" as const,
    explain: `Two cards are already out, so the next draws come from the 50 left. The ${draw.after === "red" ? "red cards" : `cards of their ${thing}`} are short by two.`,
    visual: deck([]),
  };

  if (draw.ask === "match") {
    return problem(
      `next-${draw.id}`,
      `You draw two cards from a shuffled deck and they ${what}. What’s the chance the next card is that ${thing} too?`,
      q(theirs.length, 50),
      "probability",
      [
        goneStep,
        {
          label: `Cards left of their ${thing}`,
          work: `${draw.after === "pair" ? 4 : 13} − 2`,
          result: `${theirs.length}`,
          icon: "count",
          explain: `Their ${thing} had ${draw.after === "pair" ? 4 : 13} cards and 2 are gone.`,
          visual: deck([{ cards: theirs, tone: "hit" }]),
        },
        {
          label: "Chance",
          work: `${theirs.length} of 50`,
          icon: "divide",
          explain: "Each of the 50 cards left is equally likely to come next.",
          visual: deck([{ cards: theirs, tone: "hit" }]),
        },
      ],
      params,
      deck([]),
    );
  }

  // Pairs of the next two cards that fit, counted group by group.
  const groups = new Map<string, number>();
  for (const c of left) groups.set(kind(c), (groups.get(kind(c)) ?? 0) + 1);
  const all = choose(50, 2);
  let fitting: number;
  let work: string;
  let label: string;
  let marked: Card[];
  if (draw.ask === "pair") {
    const full = [...groups.values()].filter((n) => n === (draw.after === "pair" ? 4 : 13)).length;
    const size = draw.after === "pair" ? 4 : 13;
    fitting = full * choose(size, 2) + choose(size - 2, 2);
    work = `${full} × C(${size}, 2) + C(${size - 2}, 2) = ${full * choose(size, 2)} + ${choose(size - 2, 2)}`;
    label = draw.after === "pair" ? "Pairs that share a rank" : "Pairs from one suit";
    marked = theirs;
  } else if (draw.ask === "both-red") {
    fitting = choose(24, 2);
    work = "C(24, 2)";
    label = "Pairs that are both red";
    marked = theirs;
  } else {
    fitting = choose(24, 2) + choose(26, 2);
    work = `C(24, 2) + C(26, 2) = ${choose(24, 2)} + ${choose(26, 2)}`;
    label = "Pairs of one colour";
    marked = theirs;
  }
  const next =
    draw.ask === "pair"
      ? draw.after === "pair"
        ? "share a rank too"
        : "are the same suit as each other"
      : draw.ask === "both-red"
        ? "are both red too"
        : "are the same colour as each other";
  return problem(
    `next-${draw.id}`,
    `You draw two cards from a shuffled deck and they ${what}. You then draw two more. What’s the chance those two ${next}?`,
    q(fitting, all),
    "probability",
    [
      goneStep,
      {
        label,
        work,
        result: `${fitting}`,
        icon: "count",
        explain:
          draw.ask === "pair"
            ? `Count pairs ${thing} by ${thing}: the untouched ${thing}s still have ${draw.after === "pair" ? 4 : 13} cards, but theirs has only ${draw.after === "pair" ? 2 : 11}.`
            : draw.ask === "both-red"
              ? "With 2 red cards gone, 24 red are left. Count the ways to pick 2 of them."
              : "Both red (24 left) or both black (26 left): count each and add.",
        visual: deck([{ cards: marked, tone: "alt" }]),
      },
      {
        label: "Pairs from the 50 left",
        work: "C(50, 2)",
        result: `${all}`,
        icon: "count",
        explain: "The next two cards are any 2 of the 50 left, each pair equally likely.",
        visual: deck([{ cards: marked, tone: "alt" }]),
      },
      {
        label: "Chance",
        work: `${fitting} ÷ ${all}`,
        icon: "divide",
        explain: "The pairs that fit, out of all pairs.",
        visual: deck([{ cards: marked, tone: "alt" }]),
      },
    ],
    params,
    deck([]),
  );
}

// ─── Splitting into cases ────────────────────────────────────────────────────────────────

/** A two-level tree: each case, then whether the event happens in it. `tones` colours the leaves. */
function caseTree(
  root: string,
  cases: { label: string; edge: string; yes: { label: string; edge: string }; no: { label: string; edge: string } }[],
  tones: Tone[],
): QuantVisual {
  return {
    type: "tree",
    root: {
      label: root,
      children: cases.map((c, i) => ({
        label: c.label,
        edge: c.edge,
        children: [
          { ...c.yes, tone: tones[i] ?? "muted" },
          { ...c.no, tone: "muted" as Tone },
        ],
      })),
    },
  };
}

function twoBags(params: { redA: number; blueA: number; redB: number; blueB: number; chanceA: "coin" | "die" }) {
  const { redA, blueA, redB, blueB } = params;
  const pickA = params.chanceA === "coin" ? q(1, 2) : q(1, 3);
  const pickB = sub(q(1), pickA);
  const caseA = mul(pickA, q(redA, redA + blueA));
  const caseB = mul(pickB, q(redB, redB + blueB));
  const how =
    params.chanceA === "coin"
      ? "You flip a coin to pick a bag"
      : "You roll a die: a 1 or 2 picks bag A, anything else picks bag B";
  const cases = [
    {
      label: "Bag A",
      edge: formatFraction(pickA),
      yes: { label: "Red", edge: `${redA}/${redA + blueA}` },
      no: { label: "Blue", edge: `${blueA}/${redA + blueA}` },
    },
    {
      label: "Bag B",
      edge: formatFraction(pickB),
      yes: { label: "Red", edge: `${redB}/${redB + blueB}` },
      no: { label: "Blue", edge: `${blueB}/${redB + blueB}` },
    },
  ];
  const tree = (tones: Tone[]) => caseTree("Pick a bag", cases, tones);
  return problem(
    `bags-${redA}-${blueA}-${redB}-${blueB}-${params.chanceA}`,
    `Bag A has ${redA} red and ${blueA} blue balls. Bag B has ${redB} red and ${blueB} blue. ${how}, then take one ball from it. What’s the chance it’s red?`,
    add(caseA, caseB),
    "probability",
    [
      {
        label: "Bag A, then red",
        work: `${formatFraction(pickA)} × ${redA}/${redA + blueA}`,
        result: formatFraction(caseA),
        icon: "multiply",
        explain: `Bag A is picked with chance ${formatFraction(pickA)}, and then ${redA} of its ${redA + blueA} balls ${redA === 1 ? "is" : "are"} red. Multiply along that path.`,
        visual: tree(["hit", "muted"]),
      },
      {
        label: "Bag B, then red",
        work: `${formatFraction(pickB)} × ${redB}/${redB + blueB}`,
        result: formatFraction(caseB),
        icon: "multiply",
        explain: `Bag B is picked with chance ${formatFraction(pickB)}, and then ${redB} of its ${redB + blueB} balls ${redB === 1 ? "is" : "are"} red. Multiply along that path too.`,
        visual: tree(["known", "hit"]),
      },
      {
        label: "Add the cases",
        work: `${formatFraction(caseA)} + ${formatFraction(caseB)}`,
        icon: "add",
        explain: "Exactly one bag gets picked, so the two red paths can’t both happen and are the only ways to get red. Add them.",
        visual: tree(["hit", "hit"]),
      },
    ],
    params,
    tree([]),
  );
}

const SECOND_CARDS = [
  { id: "ace", one: "an ace", short: "Ace", count: 4 },
  { id: "king", one: "a king", short: "King", count: 4 },
  { id: "heart", one: "a heart", short: "Heart", count: 13 },
  { id: "face", one: "a face card", short: "Face card", count: 12 },
  { id: "red", one: "red", short: "Red", count: 26 },
];

function secondCard(params: { card: string }) {
  const card = SECOND_CARDS.find((c) => c.id === params.card)!;
  const t = card.count;
  const firstIs = mul(q(t, 52), q(t - 1, 51));
  const firstNot = mul(q(52 - t, 52), q(t, 51));
  const not = card.id === "red" ? "Black" : `Not ${card.short.toLowerCase()}`;
  const cases = [
    {
      label: `1st: ${card.short}`,
      edge: `${t}/52`,
      yes: { label: `2nd: ${card.short}`, edge: `${t - 1}/51` },
      no: { label: `2nd: ${not}`, edge: `${52 - t}/51` },
    },
    {
      label: `1st: ${not}`,
      edge: `${52 - t}/52`,
      yes: { label: `2nd: ${card.short}`, edge: `${t}/51` },
      no: { label: `2nd: ${not}`, edge: `${51 - t}/51` },
    },
  ];
  const tree = (tones: Tone[]) => caseTree("Deal two cards", cases, tones);
  return problem(
    `second-${card.id}`,
    `Two cards are dealt from a shuffled deck. What’s the chance the second card is ${card.one}?`,
    add(firstIs, firstNot),
    "probability",
    [
      {
        label: `First is ${card.one}, then second too`,
        work: `${t}/52 × ${t - 1}/51`,
        result: formatFraction(firstIs),
        icon: "multiply",
        explain: `If the first card is ${card.one} (${t} of 52), only ${t - 1} like it are left among the 51 cards remaining.`,
        visual: tree(["hit", "muted"]),
      },
      {
        label: `First isn’t, then second is`,
        work: `${52 - t}/52 × ${t}/51`,
        result: formatFraction(firstNot),
        icon: "multiply",
        explain: `If the first card isn’t (${52 - t} of 52), all ${t} are still among the 51 cards left.`,
        visual: tree(["known", "hit"]),
      },
      {
        label: "Add the cases",
        work: `${formatFraction(firstIs)} + ${formatFraction(firstNot)}`,
        icon: "add",
        explain: `The first card either is or isn’t, so add the two cases. The total, ${t}/52, is the same as for the first card: a card you haven’t seen tells you nothing.`,
        visual: tree(["hit", "hit"]),
      },
    ],
    params,
    tree([]),
  );
}

const TURN_EVENTS = [
  { id: "six", activity: "rolling a die", goal: "roll a 6", chance: q(1, 6) },
  { id: "five-six", activity: "rolling a die", goal: "roll a 5 or 6", chance: q(1, 3) },
  { id: "one-two-three", activity: "rolling a die", goal: "roll a 1, 2 or 3", chance: q(1, 2) },
  { id: "heads", activity: "flipping a coin", goal: "flip heads", chance: q(1, 2) },
  { id: "double", activity: "rolling two dice", goal: "roll a double", chance: q(1, 6) },
  { id: "seven", activity: "rolling two dice", goal: "roll a total of 7", chance: q(1, 6) },
  { id: "eleven-up", activity: "rolling two dice", goal: "roll a total of 11 or 12", chance: q(1, 12) },
  { id: "ace", activity: "drawing a card and putting it back", goal: "draw an ace", chance: q(1, 13) },
];

/** One round of a turn-taking game: A goes, then B; if both miss, it’s back where it started. */
function roundTree(a: Rational, b: Rational) {
  return (aWins: Tone, bWins: Tone, again: Tone): QuantVisual => ({
    type: "tree",
    root: {
      label: "A round",
      children: [
        { label: "A wins", edge: formatFraction(a), tone: aWins },
        {
          label: "A misses",
          edge: formatFraction(sub(q(1), a)),
          children: [
            { label: "B wins", edge: formatFraction(b), tone: bWins },
            { label: "Both miss: start again", edge: formatFraction(sub(q(1), b)), tone: again },
          ],
        },
      ],
    },
  });
}

function takeTurns(params: { event: string; who: "first" | "second" }) {
  const event = TURN_EVENTS.find((e) => e.id === params.event)!;
  const p = event.chance;
  const miss = sub(q(1), p);
  const round = mul(miss, miss);
  const first = div(p, sub(q(1), round));
  const chance = formatFraction(p);
  const missText = formatFraction(miss);
  const round1 = roundTree(p, p);
  const steps: Parameters<typeof problem>[4] = [
    {
      label: "A wins on the first turn",
      work: chance,
      icon: "target",
      explain: `A goes first, so A wins straight away with chance ${chance}.`,
      visual: round1("hit", "muted", "muted"),
    },
    {
      label: "Both miss, and it starts again",
      work: `(${missText})²`,
      result: formatFraction(round),
      icon: "repeat",
      explain: "If A misses and then B misses, nobody has won and it’s A’s turn again: the game is back where it started.",
      visual: round1("muted", "muted", "known"),
    },
    {
      label: "A’s chance",
      work: `${chance} ÷ (1 − ${formatFraction(round)})`,
      result: formatFraction(first),
      icon: "divide",
      explain: `Call A’s chance p. A wins at once with chance ${chance}, or both miss and A is back to chance p: p = ${chance} + ${formatFraction(round)} × p. Solving for p gives this division.`,
      visual: round1("hit", "muted", "known"),
    },
  ];
  if (params.who === "second") {
    steps.push({
      label: "B’s chance",
      work: `1 − ${formatFraction(first)}`,
      icon: "subtract",
      explain: "The game goes on until someone wins, so B wins whenever A doesn’t.",
      visual: round1("muted", "hit", "known"),
    });
  }
  return problem(
    `turns-${event.id}-${params.who}`,
    `A and B take turns ${event.activity}, A first. The first to ${event.goal} wins. What’s the chance ${params.who === "first" ? "A" : "B"} wins?`,
    params.who === "first" ? first : sub(q(1), first),
    "probability",
    steps,
    params,
    round1("muted", "muted", "muted"),
  );
}

const twoDiceTotal = (total: number) => q(6 - Math.abs(total - 7), 36);

/** Turns with different targets: A needs one total, B another. */
function turnsDifferent(params: { totalA: number; totalB: number; who: "first" | "second" }) {
  const { totalA, totalB } = params;
  const a = twoDiceTotal(totalA);
  const b = twoDiceTotal(totalB);
  const bothMiss = mul(sub(q(1), a), sub(q(1), b));
  const first = div(a, sub(q(1), bothMiss));
  const round1 = roundTree(a, b);
  const steps: Parameters<typeof problem>[4] = [
    {
      label: `A rolls a total of ${totalA}`,
      work: `${6 - Math.abs(totalA - 7)} of 36`,
      result: formatFraction(a),
      icon: "target",
      explain: `${6 - Math.abs(totalA - 7)} of the 36 equally likely rolls make ${totalA}, so A wins on any one turn with this chance.`,
      visual: round1("hit", "muted", "muted"),
    },
    {
      label: "A misses, then B misses",
      work: `${formatFraction(sub(q(1), a))} × ${formatFraction(sub(q(1), b))}`,
      result: formatFraction(bothMiss),
      icon: "repeat",
      explain: `B needs a total of ${totalB}, which comes up ${6 - Math.abs(totalB - 7)} times in 36. If both miss, it’s A’s turn again with nothing changed.`,
      visual: round1("muted", "muted", "known"),
    },
    {
      label: "A’s chance",
      work: `${formatFraction(a)} ÷ (1 − ${formatFraction(bothMiss)})`,
      result: formatFraction(first),
      icon: "divide",
      explain: `Call A’s chance p. A wins at once with chance ${formatFraction(a)}, or both miss and A is back to chance p: p = ${formatFraction(a)} + ${formatFraction(bothMiss)} × p. Solving for p gives this division.`,
      visual: round1("hit", "muted", "known"),
    },
  ];
  if (params.who === "second") {
    steps.push({
      label: "B’s chance",
      work: `1 − ${formatFraction(first)}`,
      icon: "subtract",
      explain: "Someone wins in the end, so B wins whenever A doesn’t.",
      visual: round1("muted", "hit", "known"),
    });
  }
  return problem(
    `turns-${totalA}-${totalB}-${params.who}`,
    `A and B take turns rolling two dice, A first. A wins by rolling a total of ${totalA} on A’s turn, and B wins by rolling a total of ${totalB} on B’s turn. What’s the chance ${params.who === "first" ? "A" : "B"} wins?`,
    params.who === "first" ? first : sub(q(1), first),
    "probability",
    steps,
    params,
    round1("muted", "muted", "muted"),
  );
}

/** The first part of a game sets how many times the second part is played. */
const RANDOM_SOURCES = [
  { id: "coin", text: "You flip a fair coin until it lands heads", unit: "flips", chance: q(1, 2), short: "Flips until heads" },
  { id: "die", text: "You roll a die until it shows a 6", unit: "rolls", chance: q(1, 6), short: "Rolls until a 6" },
] as const;
const RANDOM_TRIALS = [
  { id: "die-one", source: "coin", then: "roll a die", what: "a 1 comes up", short: "No 1", hit: q(1, 6) },
  { id: "die-high", source: "coin", then: "roll a die", what: "a 5 or 6 comes up", short: "No 5 or 6", hit: q(1, 3) },
  { id: "die-even", source: "coin", then: "roll a die", what: "an even number comes up", short: "No even", hit: q(1, 2) },
  { id: "card-ace", source: "coin", then: "draw a card from a shuffled deck, putting it back each time,", what: "you draw an ace", short: "No ace", hit: q(1, 13) },
  { id: "coin-heads", source: "die", then: "flip a coin", what: "heads comes up", short: "No heads", hit: q(1, 2) },
  { id: "die-ace", source: "die", then: "draw a card from a shuffled deck, putting it back each time,", what: "you draw an ace", short: "No ace", hit: q(1, 13) },
] as const;

/** A random number N of tries (a geometric wait), then N tries at an event: chance it happens at least once. */
function randomRolls(params: { trial: string }) {
  const trial = RANDOM_TRIALS.find((t) => t.id === params.trial)!;
  const source = RANDOM_SOURCES.find((s) => s.id === trial.source)!;
  const p = source.chance;
  const stay = sub(q(1), p);
  const miss = sub(q(1), trial.hit);
  // E[miss^N] for N geometric on 1, 2, 3, …: p × miss ÷ (1 − (1 − p) × miss).
  const none = div(mul(p, miss), sub(q(1), mul(stay, miss)));
  const pText = formatFraction(p);
  const missText = formatFraction(miss);
  const nChance = (n: number) => mul(pow(stay, n - 1), p);
  const tree = (tones: Tone[]): QuantVisual => ({
    type: "tree",
    root: {
      label: source.short,
      children: [
        ...[1, 2, 3].map((n, i) => ({
          label: `n = ${n}`,
          edge: formatFraction(nChance(n)),
          children: [{ label: `${trial.short}: ${n === 1 ? missText : `(${missText})${sup(n)}`}`, tone: tones[i] ?? ("muted" as Tone) }],
        })),
        { label: "n = 4 or more", edge: formatFraction(pow(stay, 3)), tone: tones[3] ?? ("muted" as Tone) },
      ],
    },
  });
  return problem(
    `random-${trial.id}`,
    `${source.text}. If that takes n ${source.unit}, you then ${trial.then} n times. What’s the chance ${trial.what} at least once?`,
    sub(q(1), none),
    "probability",
    [
      {
        label: `Chance it takes n ${source.unit}`,
        work: `(${formatFraction(stay)})ⁿ⁻¹ × ${pText}`,
        icon: "split",
        explain: `Split into cases by n. It takes n ${source.unit} when the first n − 1 miss and the next one hits.`,
        visual: tree([]),
      },
      {
        label: `Given n, chance of none in n tries`,
        work: `(${missText})ⁿ`,
        icon: "multiply",
        explain: `In each case the n tries are independent, and each misses with chance ${missText}.`,
        visual: tree(["known", "known", "known"]),
      },
      {
        label: "None at all: add every case",
        work: `${pText} × ${missText} ÷ (1 − ${formatFraction(stay)} × ${missText})`,
        result: formatFraction(none),
        icon: "add",
        explain: "Multiply the two chances for each n and add them all up. They form a geometric series, which adds up to this.",
        visual: tree(["known", "known", "known", "known"]),
      },
      {
        label: "At least once",
        work: `1 − ${formatFraction(none)}`,
        icon: "subtract",
        explain: "Either it never comes up or it comes up at least once, so take the chance of never from 1.",
        visual: tree(["hit", "hit", "hit", "hit"]),
      },
    ],
    params,
    tree([]),
  );
}

/** Two events race on repeated tries: tries with neither don’t matter, so A wins with P(A) ÷ (P(A) + P(B)). */
const RACES = [
  { id: "seven-six", setup: "You roll two dice again and again", a: "a total of 7", b: "a total of 6", aCells: (r: number[]) => r[0] + r[1] === 7, bCells: (r: number[]) => r[0] + r[1] === 6, kind: "dice" },
  { id: "eight-seven", setup: "You roll two dice again and again", a: "a total of 8", b: "a total of 7", aCells: (r: number[]) => r[0] + r[1] === 8, bCells: (r: number[]) => r[0] + r[1] === 7, kind: "dice" },
  { id: "double-seven", setup: "You roll two dice again and again", a: "a double", b: "a total of 7", aCells: (r: number[]) => r[0] === r[1], bCells: (r: number[]) => r[0] + r[1] === 7, kind: "dice" },
  { id: "ten-four", setup: "You roll two dice again and again", a: "a total of 10 or more", b: "a total of 4 or less", aCells: (r: number[]) => r[0] + r[1] >= 10, bCells: (r: number[]) => r[0] + r[1] <= 4, kind: "dice" },
  { id: "eleven-two", setup: "You roll two dice again and again", a: "a total of 11", b: "a total of 2 or 3", aCells: (r: number[]) => r[0] + r[1] === 11, bCells: (r: number[]) => r[0] + r[1] <= 3, kind: "dice" },
  { id: "five-four-six", setup: "You roll a die again and again", a: "a 5", b: "a 4 or a 6", aCells: (r: number[]) => r[0] === 5, bCells: (r: number[]) => r[0] === 4 || r[0] === 6, kind: "die" },
  { id: "six-odd", setup: "You roll a die again and again", a: "a 6", b: "an odd number", aCells: (r: number[]) => r[0] === 6, bCells: (r: number[]) => r[0] % 2 === 1, kind: "die" },
  { id: "low-six", setup: "You roll a die again and again", a: "a 1 or 2", b: "a 6", aCells: (r: number[]) => r[0] <= 2, bCells: (r: number[]) => r[0] === 6, kind: "die" },
  { id: "ace-face", setup: "You draw a card from a shuffled deck again and again, putting it back each time", a: "an ace", b: "a face card", aCards: (c: Card) => c.rank === 1, bCards: (c: Card) => c.rank >= 11, kind: "cards" },
  { id: "heart-black-ace", setup: "You draw a card from a shuffled deck again and again, putting it back each time", a: "a heart", b: "a black ace", aCards: (c: Card) => c.suit === "hearts", bCards: (c: Card) => !isRed(c) && c.rank === 1, kind: "cards" },
] as const;

function whichFirst(params: { race: string }) {
  const race = RACES.find((r) => r.id === params.race)!;
  let a: Rational;
  let b: Rational;
  let figure: (aTone: Tone, bTone: Tone) => QuantVisual;
  if (race.kind === "cards") {
    const aCards = DECK.filter(race.aCards);
    const bCards = DECK.filter(race.bCards);
    a = q(aCards.length, 52);
    b = q(bCards.length, 52);
    figure = (aTone, bTone) => ({ type: "cards", marks: [{ cards: aCards.map(cardId), tone: aTone }, { cards: bCards.map(cardId), tone: bTone }] });
  } else if (race.kind === "dice") {
    const rolls = faces6.flatMap((x) => faces6.map((y) => [x, y]));
    const aCells = rolls.filter(race.aCells);
    const bCells = rolls.filter(race.bCells);
    a = q(aCells.length, 36);
    b = q(bCells.length, 36);
    figure = (aTone, bTone) => ({
      type: "dice-grid",
      sides: 6,
      marks: [
        { cells: aCells.map((r) => [r[0], r[1]] as [number, number]), tone: aTone },
        { cells: bCells.map((r) => [r[0], r[1]] as [number, number]), tone: bTone },
      ],
    });
  } else {
    const aFaces = faces6.filter((f) => race.aCells([f]));
    const bFaces = faces6.filter((f) => race.bCells([f]));
    a = q(aFaces.length, 6);
    b = q(bFaces.length, 6);
    figure = (aTone, bTone) => ({ type: "die-faces", sides: 6, marks: [{ faces: aFaces, tone: aTone }, { faces: bFaces, tone: bTone }] });
  }
  const unit = race.kind === "cards" ? "draw" : "roll";
  return problem(
    `race-${race.id}`,
    `${race.setup}. What’s the chance ${race.a} comes up before ${race.b}?`,
    div(a, add(a, b)),
    "probability",
    [
      {
        label: `Chance of ${race.a} on one ${unit}`,
        work: formatFraction(a),
        icon: "count",
        explain: `The chance that a single ${unit} gives ${race.a}.`,
        visual: figure("hit", "muted"),
      },
      {
        label: `Chance of ${race.b} on one ${unit}`,
        work: formatFraction(b),
        icon: "count",
        explain: `The chance that a single ${unit} gives ${race.b}.`,
        visual: figure("hit", "alt"),
      },
      {
        label: `${race.a[0].toUpperCase()}${race.a.slice(1)} first`,
        work: `${formatFraction(a)} ÷ (${formatFraction(a)} + ${formatFraction(b)})`,
        icon: "divide",
        explain: `A ${unit} that gives neither leaves you where you started, so only the ${unit} that settles it matters. On that ${unit}, ${race.a} has its share of the two chances.`,
        visual: figure("hit", "alt"),
      },
    ],
    params,
    figure("muted", "muted"),
  );
}

function twoMachines(params: { shareA: number; faultA: number; faultB: number }) {
  const { shareA, faultA, faultB } = params;
  const shareB = 100 - shareA;
  const caseA = q(shareA * faultA, 10000);
  const caseB = q(shareB * faultB, 10000);
  const cases = [
    {
      label: "Machine A",
      edge: `${shareA}%`,
      yes: { label: "Faulty", edge: `${faultA}%` },
      no: { label: "Fine", edge: `${100 - faultA}%` },
    },
    {
      label: "Machine B",
      edge: `${shareB}%`,
      yes: { label: "Faulty", edge: `${faultB}%` },
      no: { label: "Fine", edge: `${100 - faultB}%` },
    },
  ];
  const tree = (tones: Tone[]) => caseTree("A random part", cases, tones);
  return problem(
    `machines-${shareA}-${faultA}-${faultB}`,
    `Machine A makes ${shareA}% of a factory’s parts and ${faultA}% of its parts are faulty. Machine B makes the rest, and ${faultB}% of its parts are faulty. What’s the chance a random part is faulty?`,
    add(caseA, caseB),
    "percent",
    [
      {
        label: "From A and faulty",
        work: `${shareA}% × ${faultA}%`,
        result: formatPercent(caseA),
        icon: "multiply",
        explain: `${shareA}% of parts come from A, and ${faultA}% of those are faulty. Multiply to get the share of all parts that are both.`,
        visual: tree(["hit", "muted"]),
      },
      {
        label: "From B and faulty",
        work: `${shareB}% × ${faultB}%`,
        result: formatPercent(caseB),
        icon: "multiply",
        explain: `The other ${shareB}% come from B, and ${faultB}% of those are faulty.`,
        visual: tree(["known", "hit"]),
      },
      {
        label: "Add the cases",
        work: `${formatPercent(caseA)} + ${formatPercent(caseB)}`,
        icon: "add",
        explain: "Every part comes from exactly one machine, so add the two faulty shares.",
        visual: tree(["hit", "hit"]),
      },
    ],
    params,
    tree([]),
  );
}

// ─── Bayes’ rule ─────────────────────────────────────────────────────────────────────────

function pictureTheCrowd(
  params:
    | { type: "test"; people: number; sick: number; caught: number; falseAlarms: number }
    | { type: "coins"; fair: number; rigged: number; flips: number },
) {
  if (params.type === "test") {
    const { people, sick, caught, falseAlarms } = params;
    const healthy = people - sick;
    // Small groups as one icon per person; big ones as a tree of counts, which stays exact.
    const crowd = (showCaught: boolean, showFalse: boolean): QuantVisual =>
      people <= 200
        ? {
            type: "people",
            groups: (showCaught
              ? [
                  { count: caught, tone: "hit" as Tone, label: "Have it, test positive" },
                  { count: sick - caught, tone: "muted" as Tone, label: "Have it, test negative" },
                  ...(showFalse
                    ? [
                        { count: falseAlarms, tone: "known" as Tone, label: "Don’t have it, test positive" },
                        { count: healthy - falseAlarms, tone: "muted" as Tone, label: "Don’t have it, test negative" },
                      ]
                    : [{ count: healthy, tone: "muted" as Tone, label: "Don’t have it" }]),
                ]
              : [
                  { count: sick, tone: "alt" as Tone, label: "Have it" },
                  { count: healthy, tone: "muted" as Tone, label: "Don’t have it" },
                ]
            ).filter((g) => g.count > 0),
          }
        : {
            type: "tree",
            root: {
              label: `${people} people`,
              children: [
                {
                  label: "Have it",
                  edge: `${sick}`,
                  children: [
                    { label: "Positive", edge: `${caught}`, tone: showCaught ? "hit" : "muted" },
                    { label: "Negative", edge: `${sick - caught}`, tone: "muted" },
                  ],
                },
                {
                  label: "Don’t have it",
                  edge: `${healthy}`,
                  children: [
                    { label: "Positive", edge: `${falseAlarms}`, tone: showFalse ? "known" : "muted" },
                    { label: "Negative", edge: `${healthy - falseAlarms}`, tone: "muted" },
                  ],
                },
              ],
            },
          };
    return problem(
      `test-${people}-${sick}-${caught}-${falseAlarms}`,
      `Of ${people} people, ${sick} have a condition. A test flags ${caught} of the ${sick} who have it, and wrongly flags ${falseAlarms} of the ${healthy} who don’t. Someone tests positive. What’s the chance they have it?`,
      q(caught, caught + falseAlarms),
      "probability",
      [
        {
          label: "Positive and have it",
          work: `${caught} of the ${sick}`,
          result: `${caught}`,
          icon: "count",
          explain: `Of the ${sick} people who have it, the test flags ${caught}. These are the true positives.`,
          visual: crowd(true, false),
        },
        {
          label: "Positive but don’t",
          work: `${falseAlarms} of the ${healthy}`,
          result: `${falseAlarms}`,
          icon: "count",
          explain: `The test also flags ${falseAlarms} of the ${healthy} who don’t have it. There are far more people without it, so even a low error rate adds a lot of positives.`,
          visual: crowd(true, true),
        },
        {
          label: "Chance they have it",
          work: `${caught}/(${caught} + ${falseAlarms})`,
          icon: "divide",
          explain: `All you know is that the person tested positive, so they’re one of these ${caught + falseAlarms}. ${caught} of the ${caught + falseAlarms} have it.`,
          visual: crowd(true, true),
        },
      ],
      params,
      crowd(false, false),
    );
  }
  const { fair, rigged, flips } = params;
  // Picture 2^flips × (coins) picks: every rigged pick shows all heads, a fair one 1 in 2^flips.
  const runs = 2 ** flips;
  const riggedHeads = rigged * runs;
  const fairHeads = fair;
  const coins = fair === 1 ? "1 fair coin" : `${fair} fair coins`;
  const riggedText = rigged === 1 ? "1 two-headed coin" : `${rigged} two-headed coins`;
  const allHeads = flips === 1 ? "Heads" : "All heads";
  const picks = (riggedTone: Tone, fairTone: Tone): QuantVisual => ({
    type: "tree",
    root: {
      label: "Pick a coin",
      children: [
        {
          label: "Two-headed",
          edge: `${rigged}/${fair + rigged}`,
          children: [{ label: allHeads, edge: "1", tone: riggedTone }],
        },
        {
          label: "Fair",
          edge: `${fair}/${fair + rigged}`,
          children: [
            { label: allHeads, edge: `1/${runs}`, tone: fairTone },
            { label: "Some tails", edge: `${runs - 1}/${runs}`, tone: "muted" },
          ],
        },
      ],
    },
  });
  return problem(
    `coins-${fair}-${rigged}-${flips}`,
    `A bag has ${coins} and ${riggedText}. You pick one at random and flip it ${flips === 1 ? "once" : `${flips} times`}: ${flips === 1 ? "heads" : "heads every time"}. What’s the chance it’s two-headed?`,
    q(riggedHeads, riggedHeads + fairHeads),
    "probability",
    [
      {
        label: `Count ${runs * (fair + rigged)} picks`,
        work: `${runs} of each coin`,
        result: "",
        icon: "idea",
        explain: `Say you did this ${runs * (fair + rigged)} times and picked each coin ${runs} times. Counting picks keeps every number whole.`,
        visual: picks("muted", "muted"),
      },
      {
        label: `Two-headed and ${flips === 1 ? "heads" : "all heads"}`,
        work: `${rigged} × ${runs}`,
        result: `${riggedHeads}`,
        icon: "count",
        explain: "A two-headed coin always shows heads, so every one of its picks fits what you saw.",
        visual: picks("hit", "muted"),
      },
      {
        label: `Fair and ${flips === 1 ? "heads" : "all heads"}`,
        work: `${fair * runs} × 1/${runs}`,
        result: `${fairHeads}`,
        icon: "count",
        explain: `A fair coin shows ${flips === 1 ? "heads" : `heads ${flips} times running`} only 1 time in ${runs}, so only ${fair} of its ${fair * runs} picks fit.`,
        visual: picks("hit", "alt"),
      },
      {
        label: "Chance it’s two-headed",
        work: `${riggedHeads}/(${riggedHeads} + ${fairHeads})`,
        icon: "divide",
        explain: `Of the ${riggedHeads + fairHeads} picks that match what you saw, ${riggedHeads} used the two-headed coin.`,
        visual: picks("hit", "alt"),
      },
    ],
    params,
    picks("muted", "muted"),
  );
}

/** Bags of coins with different chances of heads. */
const COIN_SETS = [
  { id: "third-sure", chances: [q(1, 3), q(2, 3), q(1)] },
  { id: "quarters", chances: [q(1, 4), q(1, 2), q(3, 4)] },
  { id: "third-half", chances: [q(1, 3), q(1, 2)] },
  { id: "half-sure", chances: [q(1, 2), q(3, 4), q(1)] },
  { id: "three-coins", chances: [q(1), q(0), q(1, 2)] },
] as const;

const coinName = (c: Rational) =>
  c.n === c.d ? "always lands heads" : c.n === 0 ? "always lands tails" : c.n * 2 === c.d ? "is fair" : `lands heads with chance ${formatFraction(c)}`;
const coinShort = (c: Rational) => (c.n === c.d ? "Always heads" : c.n === 0 ? "Always tails" : c.n * 2 === c.d ? "Fair" : `Heads ${formatFraction(c)}`);

/**
 * Pick a coin from a bag, flip it k times, see heads every time. Ask which coin it was, or the
 * chance the next flip is heads.
 */
function coinBag(params: { set: string; flips: number; ask: "which" | "next"; target: number }) {
  const set = COIN_SETS.find((c) => c.id === params.set)!;
  const coins = set.chances as readonly Rational[];
  const n = coins.length;
  const k = params.flips;
  const joint = coins.map((c) => mul(q(1, n), pow(c, k)));
  const total = joint.reduce((sum, j) => add(sum, j), q(0));
  const target = coins[params.target];
  const seen = k === 1 ? "heads" : k === 2 ? "heads both times" : `heads all ${k} times`;
  const headsText = k === 1 ? "heads" : `${k} heads`;
  const describe = coins.map((c, i) => `${i === n - 1 ? "and " : ""}one ${coinName(c)}`).join(n === 2 ? " " : ", ");
  const tree = (tones: Tone[]): QuantVisual => ({
    type: "tree",
    root: {
      label: "Pick a coin",
      children: coins.map((c, i) => ({
        label: coinShort(c),
        edge: `1/${n}`,
        children: [{ label: headsText, edge: k === 1 ? formatFraction(c) : `(${formatFraction(c)})${sup(k)}`, tone: tones[i] ?? ("muted" as Tone) }],
      })),
    },
  });
  const steps: Parameters<typeof problem>[4] = coins.map((c, i) => ({
    label: `${coinShort(c)}, then ${headsText}`,
    work: `1/${n} × ${k === 1 ? formatFraction(c) : `(${formatFraction(c)})${sup(k)}`}`,
    result: formatFraction(joint[i]),
    icon: "multiply" as const,
    explain:
      c.n === 0
        ? "This coin can’t show heads, so it’s ruled out."
        : `Pick this coin (1 in ${n}), then it shows heads ${k === 1 ? "once" : `${k} times running`}. Multiply along the branch.`,
    visual: tree(coins.map((_, j) => (j <= i ? "known" : "muted"))),
  }));
  steps.push({
    label: `Every way to see ${headsText}`,
    work: joint.map(formatFraction).join(" + "),
    result: formatFraction(total),
    icon: "add",
    explain: "Add the branches that end in what you saw. Only these are still possible.",
    visual: tree(coins.map(() => "known")),
  });
  let answer: Rational;
  if (params.ask === "which") {
    answer = div(joint[params.target], total);
    steps.push({
      label: `Chance it’s the coin that ${coinName(target)}`,
      work: `${formatFraction(joint[params.target])} ÷ ${formatFraction(total)}`,
      icon: "divide",
      explain: "Divide its branch by the total: its share of all the ways to see these flips.",
      visual: tree(coins.map((_, j) => (j === params.target ? "hit" : "known"))),
    });
  } else {
    const weighted = joint.reduce((sum, j, i) => add(sum, mul(j, coins[i])), q(0));
    answer = div(weighted, total);
    steps.push({
      label: "Chance the next flip is heads",
      work: `(${joint.map((j, i) => `${formatFraction(j)} × ${formatFraction(coins[i])}`).join(" + ")}) ÷ ${formatFraction(total)}`,
      icon: "multiply",
      explain: "Weight each coin’s chance of heads by how likely it is now, given the flips you saw.",
      visual: tree(coins.map(() => "hit")),
    });
  }
  const question =
    params.ask === "which" ? `What’s the chance you picked the coin that ${coinName(target)}?` : "What’s the chance the next flip of the same coin is heads?";
  return problem(
    `bag-${set.id}-${k}-${params.ask}-${params.ask === "which" ? params.target : "x"}`,
    `A bag holds ${n === 2 ? "two" : "three"} coins: ${describe}. You pick one at random and flip it ${k === 1 ? "once" : k === 2 ? "twice" : `${k} times`}: ${seen}. ${question}`,
    answer,
    "probability",
    steps,
    params,
    tree([]),
  );
}

/** Retries a builder until its answer is a real question: between 1% and 99%. */
function realChance(make: () => QuantProblem) {
  let problem = make();
  for (let tries = 0; tries < 20 && (value(problem.answer) < 0.01 || value(problem.answer) > 0.99); tries++) problem = make();
  return problem;
}

function coinBagFamily(random: Random, sets: string[], ask: "which" | "next") {
  return realChance(() => {
    const id = pick(random, sets);
    const set = COIN_SETS.find((c) => c.id === id)!;
    // Ask about a coin that could have shown heads.
    const able = set.chances.map((c, i) => ({ c, i })).filter(({ c }) => c.n > 0);
    return coinBag({ set: set.id, flips: int(random, 1, 3), ask, target: pick(random, able).i });
  });
}

const TOTAL_PAIRS = [
  [6, 7],
  [7, 6],
  [8, 7],
  [6, 8],
  [5, 9],
  [9, 4],
  [10, 7],
  [7, 11],
] as const;

export const CONDITIONAL_LESSONS: QuantLessonDef[] = [
  {
    id: "conditional-probability",
    title: "Conditional probability",
    benefit: "Find a chance given something happened",
    summary: "How being told something changes a chance: keep only the outcomes that fit what you know, and count again inside them.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: [
          "You roll two dice without looking. A friend checks them and tells you the total is 8.",
          "What’s the chance at least one of the dice is a 6?",
        ],
      },
      {
        type: "check",
        prompt: "Given the total is 8, what’s the chance of a 6?",
        choices: ["2/5", "11/36", "1/6", "1/3"],
        answer: 0,
        explain:
          "It’s 2/5. Before you heard anything, the chance of at least one 6 was 11/36, about 31%. Knowing the total is 8 raises it, because a 6 is one of the few ways to make 8.",
      },
      {
        type: "story",
        heading: "Count it out",
        beats: [
          {
            text: "Two dice give 36 results, all equally likely. Each square is one of them: the row is the first die, the column the second.",
            visual: { type: "dice-grid", sides: 6, marks: [] },
          },
          {
            text: "A total of 8 rules out all but 5 squares: 2 and 6, 3 and 5, 4 and 4, 5 and 3, 6 and 2.",
            visual: {
              type: "dice-grid",
              sides: 6,
              marks: [{ cells: [[2, 6], [3, 5], [4, 4], [5, 3], [6, 2]], tone: "known" }],
            },
          },
          {
            text: "Two of those 5 have a 6 in them. So the chance is 2 out of 5.",
            visual: {
              type: "dice-grid",
              sides: 6,
              marks: [
                { cells: [[2, 6], [3, 5], [4, 4], [5, 3], [6, 2]], tone: "known" },
                { cells: [[2, 6], [6, 2]], tone: "hit" },
              ],
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why counting again works",
        body: [
          "The 5 squares that are left were equally likely before your friend spoke, and a total of 8 doesn’t favour any one of them. So they’re still equally likely, and you can count inside them as if they were the whole set.",
          "The chance of A given B is written P(A | B), and the bar is read “given”. Here A is “at least one 6” and B is “the total is 8”.",
        ],
      },
      {
        type: "rule",
        rule: "P(A | B) = P(A and B) ÷ P(B)",
        note: "With the dice, P(a 6 and a total of 8) = 2/36 and P(a total of 8) = 5/36. Dividing gives 2/5. The 36s cancel, which is why counting inside the smaller set gives the same answer.",
      },
      {
        type: "check",
        prompt: "This time your friend tells you the first die is a 6. What’s the chance the total is 8?",
        choices: ["1/6", "2/5", "1/36", "5/36"],
        answer: 0,
        explain:
          "Knowing the first die is a 6 leaves 6 results, one for each value of the second die, and only a 2 makes 8. P(total is 8 | first is 6) and P(a 6 | total is 8) ask different questions, so their answers differ.",
      },
      {
        type: "example",
        lead: "In the example the clue is “at least one die is a 6”. It leaves more results than most people expect.",
      },
      {
        type: "trap",
        body: "Dividing by all 36 results. For the total of 8, that gives 2/36 = 1/18, which is the chance of rolling an 8 with a 6 in it before you know anything. Once you know the total is 8, only 5 results are possible, so divide by 5.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The question says “given that”, “you’re told” or “someone looks and says”",
          "Part of the result is shown before you answer, like one card turned face up",
          "Cards are dealt one after another, so the earlier ones change what’s left",
        ],
      },
    ],
    targetSeconds: 30,
    example: conditional(DICE, DICE_KNOWN[0], DICE_ASKED[0]),
    families: [
      { id: "dice-clue", title: "Two dice, given a clue", generate: (random) => pick(random, DICE_PROBLEMS)() },
      { id: "coins-clue", title: "Coin flips, given a clue", generate: (random) => pick(random, COIN_PROBLEMS)() },
      { id: "card-clue", title: "One card, given a clue", generate: (random) => pick(random, CARD_PROBLEMS)() },
      { id: "children", title: "Boys and girls in a family", generate: (random) => pick(random, CHILDREN_PROBLEMS)() },
      { id: "next-draw", title: "The next cards, after a pair or a suit", generate: (random) => nextDraw({ draw: pick(random, NEXT_DRAWS).id }) },
    ],
  },
  {
    id: "splitting-cases",
    title: "Splitting into cases",
    benefit: "Find a chance by adding up every case",
    summary: "The law of total probability: split a problem into cases that cover everything, weight each case by its chance, and add.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: [
          "A factory has two machines. Machine A makes 60% of the parts, and 2% of its parts are faulty. Machine B makes the other 40%, and 5% of its parts are faulty.",
          "You pick a part at random. What’s the chance it’s faulty?",
        ],
      },
      {
        type: "check",
        prompt: "What’s the chance the part is faulty?",
        choices: ["3.2%", "3.5%", "7%", "2%"],
        answer: 0,
        explain:
          "It’s 3.2%. Averaging 2% and 5% gives 3.5%, but that treats the machines as if they made equal numbers of parts. A makes more of them, so its lower rate counts for more.",
      },
      {
        type: "story",
        heading: "Split on the machine",
        beats: [
          {
            text: "Every part comes from exactly one machine: A with chance 0.6, B with chance 0.4. Those two cases cover every part.",
            visual: {
              type: "tree",
              root: {
                label: "A part",
                children: [
                  { label: "Machine A", edge: "0.6" },
                  { label: "Machine B", edge: "0.4" },
                ],
              },
            },
          },
          {
            text: "Inside each case you know the fault rate. Multiply along each path: 0.6 × 0.02 = 0.012 for A, and 0.4 × 0.05 = 0.02 for B.",
            visual: {
              type: "tree",
              root: {
                label: "A part",
                children: [
                  {
                    label: "Machine A",
                    edge: "0.6",
                    children: [
                      { label: "Faulty", edge: "0.02", tone: "hit" },
                      { label: "Fine", edge: "0.98", tone: "muted" },
                    ],
                  },
                  {
                    label: "Machine B",
                    edge: "0.4",
                    children: [
                      { label: "Faulty", edge: "0.05", tone: "hit" },
                      { label: "Fine", edge: "0.95", tone: "muted" },
                    ],
                  },
                ],
              },
            },
          },
          {
            text: "A faulty part came from A or from B, never both. Add the two paths: 0.012 + 0.02 = 0.032, or 3.2%. Out of 1,000 parts, that’s 12 faulty ones from A and 20 from B.",
            visual: {
              type: "tree",
              root: {
                label: "A part",
                children: [
                  {
                    label: "Machine A",
                    edge: "0.6",
                    children: [
                      { label: "Faulty: 0.012", edge: "0.02", tone: "hit" },
                      { label: "Fine", edge: "0.98", tone: "muted" },
                    ],
                  },
                  {
                    label: "Machine B",
                    edge: "0.4",
                    children: [
                      { label: "Faulty: 0.02", edge: "0.05", tone: "hit" },
                      { label: "Fine", edge: "0.95", tone: "muted" },
                    ],
                  },
                ],
              },
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why it works",
        body: [
          "The cases must cover every possibility and must not overlap. Then each faulty part is counted once, in the branch it came from.",
          "Each case is weighted by how often it happens. That’s why A’s 2% pulls the answer down more than B’s 5% pulls it up. This method is called the law of total probability.",
        ],
      },
      {
        type: "rule",
        rule: "P(A) = P(case 1) × P(A | case 1) + P(case 2) × P(A | case 2) + …",
        note: "For the machines: 0.6 × 0.02 + 0.4 × 0.05 = 0.032. Use as many cases as you need, as long as exactly one of them always happens.",
      },
      {
        type: "check",
        prompt: "You and a friend take turns rolling a die, you first. The first to roll a 6 wins. What’s the chance you win?",
        choices: ["6/11", "1/2", "1/6", "5/11"],
        answer: 0,
        explain:
          "Split on the first round. You win at once with chance 1/6. With chance 5/6 × 5/6 = 25/36 nobody rolls a 6 and the game starts over, so you win with the same chance p as before. p = 1/6 + 25/36 × p gives p = 6/11.",
      },
      {
        type: "example",
        lead: "In the example a coin flip picks one of two bags, and then you draw a ball. Split on the bag.",
      },
      {
        type: "trap",
        body: "Adding the chances inside the cases without weighting them. For the machines, 2% + 5% = 7% is far too high, and averaging them to 3.5% assumes the machines make equal shares. Multiply each rate by the chance of its case first.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "Something is chosen first, like a bag, a machine or a coin, and then the event happens",
          "Players take turns, or you repeat something until one of two things happens",
          "The question would be easy if you knew one more fact, so split on that fact",
        ],
      },
    ],
    targetSeconds: 40,
    example: twoBags({ redA: 3, blueA: 2, redB: 1, blueB: 4, chanceA: "coin" }),
    families: [
      {
        id: "two-bags",
        title: "Pick a bag, then a ball",
        generate: (random) =>
          twoBags({
            redA: int(random, 1, 6),
            blueA: int(random, 1, 6),
            redB: int(random, 1, 6),
            blueB: int(random, 1, 6),
            chanceA: random() < 0.6 ? "coin" : "die",
          }),
      },
      {
        id: "two-machines",
        title: "Two machines, some parts faulty",
        generate: (random) =>
          twoMachines({
            shareA: pick(random, [50, 60, 70, 75, 80]),
            faultA: pick(random, [1, 2, 3, 4, 5]),
            faultB: pick(random, [2, 5, 6, 8, 10]),
          }),
      },
      { id: "second-card", title: "The second card dealt", generate: (random) => secondCard({ card: pick(random, SECOND_CARDS).id }) },
      {
        id: "take-turns",
        title: "Take turns until someone wins",
        generate: (random) => takeTurns({ event: pick(random, TURN_EVENTS).id, who: random() < 0.7 ? "first" : "second" }),
      },
      {
        id: "different-targets",
        title: "Take turns with different targets",
        generate: (random) => {
          const [totalA, totalB] = pick(random, TOTAL_PAIRS);
          return turnsDifferent({ totalA, totalB, who: random() < 0.7 ? "first" : "second" });
        },
      },
      { id: "which-first", title: "Which comes first", generate: (random) => whichFirst({ race: pick(random, RACES).id }) },
      { id: "random-rolls", title: "A random number of tries", generate: (random) => randomRolls({ trial: pick(random, RANDOM_TRIALS).id }) },
    ],
  },
  {
    id: "bayes-rule",
    title: "Bayes’ rule",
    benefit: "Work back from evidence to its cause",
    summary: "How to turn the chance of a result given a cause into the chance of the cause given the result, with the medical-test problem worked out.",
    difficulty: "Hard",
    parts: [
      {
        type: "text",
        body: [
          "A disease affects 5% of people. A test for it comes back positive for 90% of the people who have it, and also for 10% of the people who don’t.",
          "You take the test and it’s positive. How likely is it that you have the disease?",
        ],
      },
      {
        type: "check",
        prompt: "Roughly how likely is it that you have it?",
        choices: ["About 90%", "About 60%", "About 30%", "About 5%"],
        answer: 2,
        explain:
          "It’s about 32%. The popular answer is 90%, but that’s the chance a sick person tests positive. You want the chance a positive person is sick, which is a different number.",
      },
      {
        type: "story",
        heading: "Count it out",
        beats: [
          {
            text: "Take 200 people. 5% of them, 10 people, have the disease.",
            visual: {
              type: "people",
              groups: [
                { count: 10, tone: "hit", label: "Have it" },
                { count: 190, tone: "muted", label: "Don’t have it" },
              ],
            },
          },
          {
            text: "The test is positive for 90% of those 10, so 9 of them test positive.",
            visual: {
              type: "people",
              groups: [
                { count: 9, tone: "hit", label: "Have it, positive" },
                { count: 1, tone: "known", label: "Have it, negative" },
                { count: 190, tone: "muted", label: "Don’t have it" },
              ],
            },
          },
          {
            text: "It’s also positive for 10% of the 190 healthy people. That’s 19 more positives.",
            visual: {
              type: "people",
              groups: [
                { count: 9, tone: "hit", label: "Have it, positive" },
                { count: 1, tone: "known", label: "Have it, negative" },
                { count: 19, tone: "alt", label: "Don’t have it, positive" },
                { count: 171, tone: "muted", label: "Don’t have it, negative" },
              ],
            },
          },
          {
            text: "Now keep only the people who tested positive. There are 28, and 9 of them have the disease. Your chance is 9 in 28, about 32%.",
            visual: {
              type: "people",
              groups: [
                { count: 9, tone: "hit", label: "Have it" },
                { count: 19, tone: "alt", label: "Don’t have it" },
              ],
              caption: "Everyone who tested positive",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why it’s so low",
        body: [
          "Healthy people outnumber sick people 19 to 1. A 10% error rate on that many people gives more false positives than the disease gives true ones: 19 against 9.",
          "The 5% you started with is called the prior. The test moves it up to 32%, which is a big jump, but a rare disease is still more likely to be absent than present.",
        ],
      },
      {
        type: "rule",
        rule: "P(A | B) = P(A and B) ÷ P(B)",
        note: "Here A is “has the disease” and B is “tests positive”. The top is the share of people who are sick and positive: 0.05 × 0.9 = 0.045. The bottom is everyone positive, from both groups: 0.045 + 0.95 × 0.1 = 0.14. So the answer is 0.045 ÷ 0.14 ≈ 0.32.",
      },
      {
        type: "check",
        prompt: "Same test, but now only people with symptoms get tested, and half of them have the disease. What’s the chance a positive result is right?",
        choices: ["90%", "50%", "32%", "45%"],
        answer: 0,
        explain:
          "Take 200 people again: 100 are sick and 90 of them test positive. Of the 100 healthy, 10 test positive. That’s 90 sick out of 100 positives. The test didn’t change. The prior did.",
      },
      {
        type: "example",
        lead: "The same counting works whenever something hidden produces what you see. Here the hidden thing is which coin you picked.",
      },
      {
        type: "trap",
        body: "Giving the test’s accuracy as the answer. “Positive for 90% of sick people” is P(positive | sick). The question asks for P(sick | positive). They’re only equal when the prior is 50%.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "A test, a witness or a sensor gives a signal and you’re asked how far to trust it",
          "You pick one of several coins, dice or bags at random, see a result, and are asked which one you have",
          "You’ve seen some flips and are asked about the next one, which depends on the coin you likely hold",
        ],
      },
    ],
    targetSeconds: 40,
    example: pictureTheCrowd({ type: "coins", fair: 1, rigged: 1, flips: 1 }),
    families: [
      {
        id: "medical-test",
        title: "A positive test",
        generate: (random) => {
          const people = pick(random, [100, 200, 500, 1000]);
          const sick = pick(random, [5, 10, 20, 50].filter((n) => n * 4 <= people));
          const caught = Math.round(sick * pick(random, [0.8, 0.9, 1]));
          const falseAlarms = Math.round((people - sick) * pick(random, [0.02, 0.05, 0.1]));
          return pictureTheCrowd({ type: "test", people, sick, caught, falseAlarms });
        },
      },
      {
        id: "two-headed",
        title: "Fair coin or two-headed coin",
        generate: (random) => pictureTheCrowd({ type: "coins", fair: int(random, 1, 4), rigged: int(random, 1, 2), flips: int(random, 1, 3) }),
      },
      {
        id: "biased-coins",
        title: "Coins with different chances of heads",
        generate: (random) => coinBagFamily(random, ["third-sure", "quarters", "third-half", "half-sure"], "which"),
      },
      {
        id: "three-coins",
        title: "Always heads, always tails, or fair",
        generate: (random) => coinBagFamily(random, ["three-coins"], random() < 0.5 ? "which" : "next"),
      },
      {
        id: "next-flip",
        title: "The chance the next flip is heads",
        generate: (random) => coinBagFamily(random, ["third-sure", "quarters", "third-half", "half-sure"], "next"),
      },
    ],
  },
];
