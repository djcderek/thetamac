import { add, div, formatFraction, formatPercent, mul, q, sub } from "../rational";
import { DECK, int, isFace, isRed, pick, problem, type Card, type QuantLessonDef } from "../build";

// ─── Conditional probability ─────────────────────────────────────────────────────────────

type Space<T> = { id: string; outcomes: T[]; setup: string; unit: string };
/** `label` names the step when "<unit> where <text>" would read badly. */
type Filter<T> = { id: string; text: string; test: (outcome: T) => boolean; label?: string };

const faces6 = [1, 2, 3, 4, 5, 6];
const DICE: Space<number[]> = {
  id: "dice",
  outcomes: faces6.flatMap((a) => faces6.map((b) => [a, b])),
  setup: "You roll two fair dice",
  unit: "rolls",
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
const COINS: Space<string[]>[] = [3, 4].map((n) => ({ id: `coins-${n}`, outcomes: flips(n), setup: `You flip ${n} fair coins`, unit: "outcomes" }));
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

const CARD_SPACE: Space<Card> = { id: "card", outcomes: DECK, setup: "You draw one card from a shuffled deck", unit: "cards" };
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
      },
      { label: asked.label ?? `Of those, ${asked.text}`, work: `${both} of ${fit.length}` },
    ],
    { space: space.id, known: known.id, asked: asked.id },
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
  return problem(
    `bags-${redA}-${blueA}-${redB}-${blueB}-${params.chanceA}`,
    `Bag A has ${redA} red and ${blueA} blue balls. Bag B has ${redB} red and ${blueB} blue. ${how}, then take one ball from it. What's the chance it's red?`,
    add(caseA, caseB),
    "probability",
    [
      { label: "Bag A, then red", work: `${formatFraction(pickA)} × ${redA}/${redA + blueA}`, result: formatFraction(caseA) },
      { label: "Bag B, then red", work: `${formatFraction(pickB)} × ${redB}/${redB + blueB}`, result: formatFraction(caseB) },
      { label: "Add the cases", work: `${formatFraction(caseA)} + ${formatFraction(caseB)}` },
    ],
    params,
  );
}

const SECOND_CARDS = [
  { id: "ace", one: "an ace", count: 4 },
  { id: "king", one: "a king", count: 4 },
  { id: "heart", one: "a heart", count: 13 },
  { id: "face", one: "a face card", count: 12 },
  { id: "red", one: "red", count: 26 },
];

function secondCard(params: { card: string }) {
  const card = SECOND_CARDS.find((c) => c.id === params.card)!;
  const t = card.count;
  const firstIs = mul(q(t, 52), q(t - 1, 51));
  const firstNot = mul(q(52 - t, 52), q(t, 51));
  return problem(
    `second-${card.id}`,
    `Two cards are dealt from a shuffled deck. What's the chance the second card is ${card.one}?`,
    add(firstIs, firstNot),
    "probability",
    [
      { label: `First is ${card.one}, then second too`, work: `${t}/52 × ${t - 1}/51`, result: formatFraction(firstIs) },
      { label: `First isn’t, then second is`, work: `${52 - t}/52 × ${t}/51`, result: formatFraction(firstNot) },
      { label: "Add the cases", work: `${formatFraction(firstIs)} + ${formatFraction(firstNot)}` },
    ],
    params,
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
  const steps = [
    { label: "A wins on the first turn", work: formatFraction(p) },
    { label: "Both miss, and it starts again", work: `(${formatFraction(miss)})²`, result: formatFraction(round) },
    {
      label: "A’s chance",
      work: `${formatFraction(p)} ÷ (1 − ${formatFraction(round)})`,
      result: formatFraction(first),
    },
  ];
  if (params.who === "second") steps.push({ label: "B’s chance", work: `1 − ${formatFraction(first)}`, result: "" });
  return problem(
    `turns-${event.id}-${params.who}`,
    `A and B take turns ${event.activity}, A first. The first to ${event.goal} wins. What's the chance ${params.who === "first" ? "A" : "B"} wins?`,
    params.who === "first" ? first : sub(q(1), first),
    "probability",
    steps,
    params,
  );
}

function twoMachines(params: { shareA: number; faultA: number; faultB: number }) {
  const { shareA, faultA, faultB } = params;
  const shareB = 100 - shareA;
  const caseA = q(shareA * faultA, 10000);
  const caseB = q(shareB * faultB, 10000);
  return problem(
    `machines-${shareA}-${faultA}-${faultB}`,
    `Machine A makes ${shareA}% of a factory’s parts and ${faultA}% of its parts are faulty. Machine B makes the rest, and ${faultB}% of its parts are faulty. What's the chance a random part is faulty?`,
    add(caseA, caseB),
    "percent",
    [
      { label: "From A and faulty", work: `${shareA}% × ${faultA}%`, result: formatPercent(caseA) },
      { label: "From B and faulty", work: `${shareB}% × ${faultB}%`, result: formatPercent(caseB) },
      { label: "Add the cases", work: `${formatPercent(caseA)} + ${formatPercent(caseB)}` },
    ],
    params,
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
    return problem(
      `test-${people}-${sick}-${caught}-${falseAlarms}`,
      `Of ${people} people, ${sick} have a condition. A test flags ${caught} of the ${sick} who have it, and wrongly flags ${falseAlarms} of the ${healthy} who don't. Someone tests positive. What's the chance they have it?`,
      q(caught, caught + falseAlarms),
      "probability",
      [
        { label: "Positive and have it", work: `${caught} of the ${sick}`, result: `${caught}` },
        { label: "Positive but don’t", work: `${falseAlarms} of the ${healthy}`, result: `${falseAlarms}` },
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
      { label: `Picture ${runs * (fair + rigged)} picks`, work: `${runs} of each coin`, result: "" },
      { label: `Two-headed and ${flips === 1 ? "heads" : "all heads"}`, work: `${rigged} × ${runs}`, result: `${riggedHeads}` },
      { label: `Fair and ${flips === 1 ? "heads" : "all heads"}`, work: `${fair * runs} × 1/${runs}`, result: `${fairHeads}` },
      { label: "Chance it’s two-headed", work: `${riggedHeads}/(${riggedHeads} + ${fairHeads})` },
    ],
    params,
  );
}

export const CONDITIONAL_LESSONS: QuantLessonDef[] = [
  {
    id: "conditional-probability",
    title: "Conditional probability",
    benefit: "Find a chance given something happened",
    idea: "Keep only the outcomes that fit what you’re told. The chance is how many of those fit the question, divided by how many there are.",
    targetSeconds: 30,
    example: conditional(DICE, DICE_KNOWN[0], DICE_ASKED[0]),
    generate: (random) => pick(random, CONDITIONAL_PROBLEMS)(),
  },
  {
    id: "splitting-cases",
    title: "Splitting into cases",
    benefit: "Find a chance by adding up every case",
    idea: "Split into cases that can’t both happen and cover everything. For each, multiply its chance by the chance of the event in it, then add them up.",
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
