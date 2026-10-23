import { add, div, formatFraction, formatPercent, mul, q, sub } from "../rational";
import { DECK, int, isFace, isRed, pick, problem, type Card, type QuantLessonDef } from "../build";
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
  { id: "all-heads", text: "they're all heads", test: (f) => f.every((x) => x === "H") },
  { id: "exactly-two", text: "exactly two are heads", test: (f) => heads(f) === 2 },
  { id: "two-up", text: "at least two are heads", test: (f) => heads(f) >= 2 },
];

// Children listed oldest first; each is equally likely a boy or a girl.
const CHILDREN: Space<string[]>[] = [2, 3].map((n) => ({
  id: `children-${n}`,
  outcomes: flips(n).map((f) => f.map((x) => (x === "H" ? "B" : "G"))),
  setup: `A family has ${n} children, each equally likely a boy or a girl. You're told`,
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
  { id: "red", text: "it's red", test: isRed, label: "Red cards" },
  { id: "face", text: "it's a face card (J, Q or K)", test: isFace, label: "Face cards" },
  { id: "heart", text: "it's a heart", test: (c) => c.suit === "hearts", label: "Hearts" },
  { id: "not-heart", text: "it's not a heart", test: (c) => c.suit !== "hearts", label: "Cards that aren’t hearts" },
  { id: "high", text: "it's a 10 or higher (10, J, Q, K)", test: (c) => c.rank >= 10, label: "Cards 10 or higher" },
];
const CARDS_ASKED: Filter<Card>[] = [
  { id: "heart", text: "it's a heart", test: (c) => c.suit === "hearts", label: "Of those, hearts" },
  { id: "king", text: "it's a king", test: (c) => c.rank === 13, label: "Of those, kings" },
  { id: "face", text: "it's a face card", test: isFace, label: "Of those, face cards" },
  { id: "red-face", text: "it's a red face card", test: (c) => isRed(c) && isFace(c), label: "Of those, red face cards" },
];

function conditional<T>(space: Space<T>, known: Filter<T>, asked: Filter<T>) {
  const fit = space.outcomes.filter(known.test);
  const both = fit.filter(asked.test).length;
  const isChildren = space.id.startsWith("children");
  const prompt = isChildren
    ? `${space.setup} ${known.text}. What's the chance ${asked.text}?`
    : `${space.setup} and are told ${known.text}. What's the chance ${asked.text}?`;
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
        explain: `You’re told ${known.text.replace(/^it's /, "it’s ")}, so only these ${fit.length} of the ${space.outcomes.length} equally likely ${space.unit} are still possible.`,
        visual: space.figure([{ items: fit, tone: "known" }]),
      },
      {
        label: asked.label ?? `Of those, ${asked.text}`,
        work: `${both} of ${fit.length}`,
        icon: "count",
        explain: `Count the ones that also fit the question. The chance is that count out of the ${fit.length}, not out of all ${space.outcomes.length}.`,
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

const CONDITIONAL_PROBLEMS = [
  ...conditionalPairs(DICE, DICE_KNOWN, DICE_ASKED),
  ...COINS.flatMap((space) => conditionalPairs(space, COINS_KNOWN, COINS_ASKED)),
  ...CHILDREN.flatMap((space) => conditionalPairs(space, CHILDREN_KNOWN, childrenAsked(space.outcomes[0].length))),
  ...conditionalPairs(CARD_SPACE, CARDS_KNOWN, CARDS_ASKED),
];

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
    `Bag A has ${redA} red and ${blueA} blue balls. Bag B has ${redB} red and ${blueB} blue. ${how}, then take one ball from it. What's the chance it's red?`,
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
    `Two cards are dealt from a shuffled deck. What's the chance the second card is ${card.one}?`,
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
        explain: `The first card either is or isn’t, so add the two cases. It equals ${t}/52: the second card is just as likely as the first.`,
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

function takeTurns(params: { event: string; who: "first" | "second" }) {
  const event = TURN_EVENTS.find((e) => e.id === params.event)!;
  const p = event.chance;
  const miss = sub(q(1), p);
  const round = mul(miss, miss);
  const first = div(p, sub(q(1), round));
  const chance = formatFraction(p);
  const missText = formatFraction(miss);
  // One round: A goes, then B; if both miss, the game is back where it started.
  const round1 = (aWins: Tone, bWins: Tone, again: Tone): QuantVisual => ({
    type: "tree",
    root: {
      label: "A round",
      children: [
        { label: "A wins", edge: chance, tone: aWins },
        {
          label: "A misses",
          edge: missText,
          children: [
            { label: "B wins", edge: chance, tone: bWins },
            { label: "Both miss: start again", edge: missText, tone: again },
          ],
        },
      ],
    },
  });
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
      explain: "Every round that gets played, A wins its first turn with the same chance. Dividing by 1 − (both miss) adds up all those rounds.",
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
    `A and B take turns ${event.activity}, A first. The first to ${event.goal} wins. What's the chance ${params.who === "first" ? "A" : "B"} wins?`,
    params.who === "first" ? first : sub(q(1), first),
    "probability",
    steps,
    params,
    round1("muted", "muted", "muted"),
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
    `Machine A makes ${shareA}% of a factory’s parts and ${faultA}% of its parts are faulty. Machine B makes the rest, and ${faultB}% of its parts are faulty. What's the chance a random part is faulty?`,
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
      `Of ${people} people, ${sick} have a condition. A test flags ${caught} of the ${sick} who have it, and wrongly flags ${falseAlarms} of the ${healthy} who don't. Someone tests positive. What's the chance they have it?`,
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
          explain: `The test also flags ${falseAlarms} of the ${healthy} who don’t have it. Because that group is so big, these false alarms add up.`,
          visual: crowd(true, true),
        },
        {
          label: "Chance they have it",
          work: `${caught}/(${caught} + ${falseAlarms})`,
          icon: "divide",
          explain: `You only know the person tested positive, so look at all ${caught + falseAlarms} positives. The share who really have it is the answer.`,
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
    `A bag has ${coins} and ${riggedText}. You pick one at random and flip it ${flips === 1 ? "once" : `${flips} times`}: ${flips === 1 ? "heads" : "heads every time"}. What's the chance it's two-headed?`,
    q(riggedHeads, riggedHeads + fairHeads),
    "probability",
    [
      {
        label: `Picture ${runs * (fair + rigged)} picks`,
        work: `${runs} of each coin`,
        result: "",
        icon: "idea",
        explain: `Imagine doing this ${runs * (fair + rigged)} times, picking each coin ${runs} times. Whole numbers are easier to count than chances.`,
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

export const CONDITIONAL_LESSONS: QuantLessonDef[] = [
  {
    id: "conditional-probability",
    title: "Conditional probability",
    benefit: "Find a chance given something happened",
    idea: "Keep only the outcomes that fit what you’re told. The chance is how many of those fit the question, divided by how many there are.",
    difficulty: "Medium",
    intro:
      "Being told something rules out every outcome that doesn’t fit it. The outcomes that are left are still equally likely, so you just count again inside that smaller group.",
    formula: "P(A given B) = outcomes in both A and B ÷ outcomes in B",
    cues: ["The question says “given that” or “you’re told”", "Part of the result is revealed before you answer"],
    mistake: "Dividing by all the outcomes instead of only the ones that fit what you’re told.",
    targetSeconds: 30,
    example: conditional(DICE, DICE_KNOWN[0], DICE_ASKED[0]),
    generate: (random) => pick(random, CONDITIONAL_PROBLEMS)(),
  },
  {
    id: "splitting-cases",
    title: "Splitting into cases",
    benefit: "Find a chance by adding up every case",
    idea: "Split into cases that can’t both happen and cover everything. For each, multiply its chance by the chance of the event in it, then add them up.",
    difficulty: "Medium",
    intro:
      "When the answer depends on something you don’t know yet, like which bag was picked, work out each possibility on its own. Weight each one by how likely it is, then add: together the cases cover everything exactly once.",
    formula: "P(A) = P(case 1) × P(A in case 1) + P(case 2) × P(A in case 2) + …",
    cues: [
      "Something is chosen first (a bag, a machine, a card), then the event happens",
      "Players take turns until someone wins",
      "The answer would be easy if you knew one more thing",
    ],
    mistake: "Adding the chances inside each case without first multiplying each by how likely that case is.",
    targetSeconds: 40,
    example: twoBags({ redA: 3, blueA: 2, redB: 1, blueB: 4, chanceA: "coin" }),
    generate: (random) =>
      pick(random, [
        () =>
          twoBags({
            redA: int(random, 1, 6),
            blueA: int(random, 1, 6),
            redB: int(random, 1, 6),
            blueB: int(random, 1, 6),
            chanceA: random() < 0.6 ? "coin" : "die",
          }),
        () => secondCard({ card: pick(random, SECOND_CARDS).id }),
        () => takeTurns({ event: pick(random, TURN_EVENTS).id, who: random() < 0.7 ? "first" : "second" }),
        () =>
          twoMachines({
            shareA: pick(random, [50, 60, 70, 75, 80]),
            faultA: pick(random, [1, 2, 3, 4, 5]),
            faultB: pick(random, [2, 5, 6, 8, 10]),
          }),
      ])(),
  },
  {
    id: "bayes-rule",
    title: "Bayes’ rule",
    benefit: "Work back from evidence to its cause",
    idea: "Picture a big group. Count everyone who shows the evidence, split by cause. The chance of a cause is its share of that count.",
    difficulty: "Hard",
    intro:
      "Evidence like a positive test can come from more than one cause. Picture a big group, count everyone who shows the evidence, and split that count by cause. A rare cause can stay unlikely even after strong evidence, because so few people had it to begin with.",
    formula: "P(cause given evidence) = (cause and evidence) ÷ (everyone with the evidence)",
    cues: [
      "You’re told a result (a positive test, heads) and asked what caused it",
      "You’re given the chance of the evidence given the cause, and asked the reverse",
    ],
    mistake: "Answering with the test’s accuracy (the chance of a positive if you have it) instead of the chance you have it given a positive.",
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
];
