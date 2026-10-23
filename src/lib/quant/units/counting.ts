import { q } from "../rational";
import { choose, commas, factorial, int, pick, problem, sup, type QuantLessonDef, type QuantProblem } from "../build";

/** "5 × 4 × 3": the falling product n × (n − 1) × … for k terms. */
const falling = (n: number, k: number) => Array.from({ length: k }, (_, i) => n - i);
const product = (values: number[]) => values.reduce((acc, v) => acc * v, 1);
const times = (values: number[]) => values.join(" × ");

// ─── Multiplying choices ───────────────────────────────────────────────────────────────

type ChoicesParams =
  | { type: "outfits"; shirts: number; trousers: number; shoes: number }
  | { type: "pin"; digits: number }
  | { type: "plate"; letters: number; digits: number }
  | { type: "dice"; dice: number; sides: number }
  | { type: "coins"; flips: number }
  | { type: "menu"; starters: number; mains: number; desserts: number };

function multiplyingChoices(params: ChoicesParams): QuantProblem {
  switch (params.type) {
    case "outfits": {
      const { shirts, trousers, shoes } = params;
      return problem(
        `outfits-${shirts}-${trousers}-${shoes}`,
        `You have ${shirts} shirts, ${trousers} pairs of trousers and ${shoes} pairs of shoes. How many different outfits of one of each can you make?`,
        q(shirts * trousers * shoes),
        "count",
        [
          { label: "Options at each step", work: `${shirts} shirts, ${trousers} trousers, ${shoes} shoes` },
          { label: "Multiply them", work: times([shirts, trousers, shoes]) },
        ],
        params,
      );
    }
    case "pin": {
      const { digits } = params;
      return problem(
        `pin-${digits}`,
        `A PIN is ${digits} digits, each from 0 to 9, and digits can repeat. How many different PINs are there?`,
        q(10 ** digits),
        "count",
        [
          { label: "Options for each digit", work: "0 to 9", result: "10" },
          { label: `Multiply for ${digits} digits`, work: `10${sup(digits)}` },
        ],
        params,
      );
    }
    case "plate": {
      const { letters, digits } = params;
      return problem(
        `plate-${letters}-${digits}`,
        `A licence plate is ${letters} letters followed by ${digits} digits. Letters and digits can repeat. How many different plates are possible?`,
        q(26 ** letters * 10 ** digits),
        "count",
        [
          { label: "Options for each letter, then each digit", work: "26, then 10" },
          { label: "Multiply them", work: `26${sup(letters)} × 10${sup(digits)} = ${commas(26 ** letters)} × ${commas(10 ** digits)}` },
        ],
        params,
      );
    }
    case "dice": {
      const { dice, sides } = params;
      return problem(
        `dice-${dice}-${sides}`,
        `You roll ${dice} fair ${sides}-sided dice, one after another. How many different sequences of results are possible?`,
        q(sides ** dice),
        "count",
        [
          { label: "Options for each roll", work: `${sides} faces`, result: `${sides}` },
          { label: `Multiply for ${dice} rolls`, work: `${sides}${sup(dice)}` },
        ],
        params,
      );
    }
    case "coins": {
      const { flips } = params;
      return problem(
        `coins-${flips}`,
        `You flip a coin ${flips} times. How many different sequences of heads and tails are possible?`,
        q(2 ** flips),
        "count",
        [
          { label: "Options for each flip", work: "heads or tails", result: "2" },
          { label: `Multiply for ${flips} flips`, work: `2${sup(flips)}` },
        ],
        params,
      );
    }
    case "menu": {
      const { starters, mains, desserts } = params;
      return problem(
        `menu-${starters}-${mains}-${desserts}`,
        `A menu has ${starters} starters, ${mains} mains and ${desserts} desserts. A meal is one main, with or without a starter, and with or without a dessert. How many different meals are there?`,
        q((starters + 1) * mains * (desserts + 1)),
        "count",
        [
          { label: "Starter options, counting “none”", work: `${starters} + 1`, result: `${starters + 1}` },
          { label: "Dessert options, counting “none”", work: `${desserts} + 1`, result: `${desserts + 1}` },
          { label: "Multiply with the mains", work: times([starters + 1, mains, desserts + 1]) },
        ],
        params,
      );
    }
  }
}

// ─── Permutations ──────────────────────────────────────────────────────────────────────

/** Words with repeated letters, and how many times each letter appears. */
const ANAGRAM_WORDS = ["LEVEL", "TOOTH", "ADDED", "BANANA", "LETTER", "COFFEE", "MAMMAL", "BALLOON", "STATISTICS", "BOOKKEEPER"];

export function letterCounts(word: string) {
  const counts = new Map<string, number>();
  for (const letter of word) counts.set(letter, (counts.get(letter) ?? 0) + 1);
  return counts;
}

type PermutationsParams =
  | { type: "shelf"; books: number }
  | { type: "podium"; runners: number; places: number }
  | { type: "pin"; digits: number }
  | { type: "anagram"; word: string }
  | { type: "table"; people: number };

const PLACE_NAMES = ["first", "second", "third", "fourth"];

function permutations(params: PermutationsParams): QuantProblem {
  switch (params.type) {
    case "shelf": {
      const { books } = params;
      return problem(
        `shelf-${books}`,
        `How many different ways can you arrange ${books} different books in a row on a shelf?`,
        q(factorial(books)),
        "count",
        [
          { label: "Options for each spot, left to right", work: times(falling(books, books)) },
          { label: `That’s ${books}!`, work: `${books}!` },
        ],
        params,
      );
    }
    case "podium": {
      const { runners, places } = params;
      const picks = falling(runners, places);
      const placeText =
        places === 3
          ? "the gold, silver and bronze medals be given out"
          : `the ${PLACE_NAMES.slice(0, places).join(", ").replace(/, (?=[^,]*$)/, " and ")} places be filled`;
      return problem(
        `podium-${runners}-${places}`,
        `In a race of ${runners} runners, how many different ways can ${placeText}?`,
        q(product(picks)),
        "count",
        [
          { label: `Options for each of the ${places} places`, work: picks.join(", then ") },
          { label: "Multiply them", work: times(picks) },
        ],
        params,
      );
    }
    case "pin": {
      const { digits } = params;
      const picks = falling(10, digits);
      return problem(
        `pin-${digits}`,
        `A PIN is ${digits} digits from 0 to 9, with no digit used twice. How many different PINs are there?`,
        q(product(picks)),
        "count",
        [
          { label: "Options for each digit, one fewer each time", work: picks.join(", then ") },
          { label: "Multiply them", work: times(picks) },
        ],
        params,
      );
    }
    case "anagram": {
      const { word } = params;
      const repeats = [...letterCounts(word)].filter(([, count]) => count > 1);
      const divisor = product(repeats.map(([, count]) => factorial(count)));
      const all = factorial(word.length);
      return problem(
        `anagram-${word}`,
        `How many different ways can you arrange the letters of ${word}?`,
        q(all / divisor),
        "count",
        [
          { label: `Arrange all ${word.length} letters as if they were different`, work: `${word.length}!`, result: commas(all) },
          { label: "Letters that repeat", work: repeats.map(([letter, count]) => `${letter} ${count} times`).join(", ") },
          {
            label: "Divide by the ways to shuffle each repeat",
            work: `${commas(all)} ÷ (${repeats.map(([, count]) => `${count}!`).join(" × ")})`,
          },
        ],
        params,
      );
    }
    case "table": {
      const { people } = params;
      return problem(
        `table-${people}`,
        `How many ways can ${people} people sit around a round table, if turning everyone round by the same number of seats doesn’t count as a new seating?`,
        q(factorial(people - 1)),
        "count",
        [
          { label: "Fix one person’s seat", work: `the other ${people - 1} fill the rest` },
          { label: `Arrange the other ${people - 1}`, work: `${people - 1}!` },
        ],
        params,
      );
    }
  }
}

// ─── Combinations ──────────────────────────────────────────────────────────────────────

type CombinationsParams =
  | { type: "choose"; from: number; pick: number }
  | { type: "committee"; men: number; women: number; size: number; picked: number }
  | { type: "grid"; east: number; north: number }
  | { type: "sweets"; sweets: number; children: number }
  | { type: "hearts"; hearts: number }
  | { type: "flush" }
  | { type: "red" }
  | { type: "handshakes"; people: number };

function combinations(params: CombinationsParams): QuantProblem {
  switch (params.type) {
    case "choose": {
      const { from, pick: k } = params;
      const ordered = product(falling(from, k));
      return problem(
        `choose-${from}-${k}`,
        `You pack ${k} of your ${from} books for a holiday. How many different sets of ${k} books could you take?`,
        q(choose(from, k)),
        "count",
        [
          { label: "Ordered picks", work: times(falling(from, k)), result: commas(ordered) },
          { label: `Divide by the ${k}! orders of the same ${k}`, work: `${commas(ordered)} ÷ ${k}!` },
        ],
        params,
      );
    }
    case "committee": {
      const { men, women, size, picked } = params;
      const womenWays = choose(women, picked);
      const menWays = choose(men, size - picked);
      return problem(
        `committee-${men}-${women}-${size}-${picked}`,
        `A committee of ${size} is chosen from ${men} men and ${women} women. How many different committees have exactly ${picked} ${picked === 1 ? "woman" : "women"}?`,
        q(womenWays * menWays),
        "count",
        [
          { label: `Ways to pick the ${picked} ${picked === 1 ? "woman" : "women"}`, work: `C(${women}, ${picked})`, result: `${womenWays}` },
          { label: `Ways to pick the ${size - picked} ${size - picked === 1 ? "man" : "men"}`, work: `C(${men}, ${size - picked})`, result: `${menWays}` },
          { label: "Multiply them", work: `${womenWays} × ${menWays}` },
        ],
        params,
      );
    }
    case "grid": {
      const { east, north } = params;
      return problem(
        `grid-${east}-${north}`,
        `You walk ${east} blocks east and ${north} blocks north on a street grid, one block at a time, only ever going east or north. How many different routes are there?`,
        q(choose(east + north, north)),
        "count",
        [
          { label: "Blocks in every route", work: `${east} + ${north}`, result: `${east + north}` },
          { label: "Choose which of them go north", work: `C(${east + north}, ${north})` },
        ],
        params,
      );
    }
    case "sweets": {
      const { sweets, children } = params;
      const spots = sweets + children - 1;
      return problem(
        `sweets-${sweets}-${children}`,
        `You share ${sweets} identical sweets among ${children} children. A child can get none. How many different ways can you share them?`,
        q(choose(spots, children - 1)),
        "count",
        [
          {
            label: `Line up the sweets with ${children - 1} dividers between children`,
            work: `${sweets} sweets + ${children - 1} dividers`,
            result: `${spots} spots`,
          },
          { label: "Choose where the dividers go", work: `C(${spots}, ${children - 1})` },
        ],
        params,
      );
    }
    case "hearts": {
      const { hearts } = params;
      const heartWays = choose(13, hearts);
      const otherWays = choose(39, 5 - hearts);
      return problem(
        `hearts-${hearts}`,
        `How many different 5-card hands have exactly ${hearts} ${hearts === 1 ? "heart" : "hearts"}?`,
        q(heartWays * otherWays),
        "count",
        [
          { label: `Ways to pick ${hearts} of the 13 hearts`, work: `C(13, ${hearts})`, result: commas(heartWays) },
          { label: `Ways to pick ${5 - hearts} of the 39 other cards`, work: `C(39, ${5 - hearts})`, result: commas(otherWays) },
          { label: "Multiply them", work: `${commas(heartWays)} × ${commas(otherWays)}` },
        ],
        params,
      );
    }
    case "flush":
      return problem(
        "flush",
        "How many different 5-card hands have all five cards in the same suit?",
        q(4 * choose(13, 5)),
        "count",
        [
          { label: "Ways to pick 5 cards of one suit", work: "C(13, 5)", result: commas(choose(13, 5)) },
          { label: "Times the 4 suits", work: `4 × ${commas(choose(13, 5))}` },
        ],
        params,
      );
    case "red":
      return problem(
        "red",
        "How many different 5-card hands are all red cards?",
        q(choose(26, 5)),
        "count",
        [
          { label: "Red cards to pick from", work: "13 hearts + 13 diamonds", result: "26" },
          { label: "Ways to pick 5 of them", work: "C(26, 5)" },
        ],
        params,
      );
    case "handshakes": {
      const { people } = params;
      return problem(
        `handshakes-${people}`,
        `${people} people meet, and everyone shakes hands with everyone else once. How many handshakes are there?`,
        q(choose(people, 2)),
        "count",
        [
          { label: "Each handshake is a pair of people", work: `C(${people}, 2)` },
          { label: "Pairs", work: `${people} × ${people - 1} ÷ 2` },
        ],
        params,
      );
    }
  }
}

// ─── Inclusion–exclusion ───────────────────────────────────────────────────────────────

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

/** Card groups as how many cards each has, and how many are in both. */
export const CARD_OVERLAPS: { id: string; label: string; a: string; aCount: number; b: string; bCount: number; both: string; bothCount: number }[] = [
  { id: "heart-face", label: "hearts or face cards (J, Q, K)", a: "Hearts", aCount: 13, b: "Face cards", bCount: 12, both: "Face cards that are hearts", bothCount: 3 },
  { id: "red-ace", label: "red or an ace", a: "Red cards", aCount: 26, b: "Aces", bCount: 4, both: "Red aces", bothCount: 2 },
  { id: "spade-low", label: "spades or a 2, 3, 4 or 5", a: "Spades", aCount: 13, b: "2s to 5s", bCount: 16, both: "Spades from 2 to 5", bothCount: 4 },
  { id: "black-king", label: "black or a king", a: "Black cards", aCount: 26, b: "Kings", bCount: 4, both: "Black kings", bothCount: 2 },
  { id: "club-high", label: "clubs or a 10, J, Q, K or ace", a: "Clubs", aCount: 13, b: "10s to aces", bCount: 20, both: "Clubs from 10 to ace", bothCount: 5 },
];

type InclusionParams =
  | { type: "divisible"; upTo: number; a: number; b: number; ask: "either" | "neither" }
  | { type: "divisible3"; upTo: number }
  | { type: "survey"; total: number; a: number; b: number; both: number; ask: "either" | "neither" }
  | { type: "cards"; event: string };

const SURVEYS = [
  { id: "sports", group: "class", members: "students", a: "play football", b: "play tennis", both: "play both" },
  { id: "languages", group: "office", members: "people", a: "speak French", b: "speak Spanish", both: "speak both" },
  { id: "pets", group: "street", members: "households", a: "have a dog", b: "have a cat", both: "have both" },
];

function inclusionExclusion(params: InclusionParams): QuantProblem {
  switch (params.type) {
    case "divisible": {
      const { upTo, a, b, ask } = params;
      const both = lcm(a, b);
      const [na, nb, nboth] = [Math.floor(upTo / a), Math.floor(upTo / b), Math.floor(upTo / both)];
      const either = na + nb - nboth;
      return problem(
        `divisible-${upTo}-${a}-${b}-${ask}`,
        `How many whole numbers from 1 to ${upTo} are divisible by ${ask === "either" ? `${a} or ${b}` : `neither ${a} nor ${b}`}?`,
        q(ask === "either" ? either : upTo - either),
        "count",
        [
          { label: `Divisible by ${a}`, work: `${upTo} ÷ ${a}, rounded down`, result: `${na}` },
          { label: `Divisible by ${b}`, work: `${upTo} ÷ ${b}, rounded down`, result: `${nb}` },
          { label: `Divisible by both (by ${both})`, work: `${upTo} ÷ ${both}, rounded down`, result: `${nboth}` },
          { label: `Divisible by ${a} or ${b}`, work: `${na} + ${nb} − ${nboth}`, result: `${either}` },
          ...(ask === "neither" ? [{ label: "Neither", work: `${upTo} − ${either}` }] : []),
        ],
        params,
      );
    }
    case "divisible3": {
      const { upTo } = params;
      const n = (d: number) => Math.floor(upTo / d);
      const singles = [n(2), n(3), n(5)];
      const pairs = [n(6), n(10), n(15)];
      return problem(
        `divisible3-${upTo}`,
        `How many whole numbers from 1 to ${upTo} are divisible by 2, 3 or 5?`,
        q(singles[0] + singles[1] + singles[2] - pairs[0] - pairs[1] - pairs[2] + n(30)),
        "count",
        [
          { label: "Divisible by 2, by 3, by 5", work: singles.join(", ") },
          { label: "Divisible by two of them (by 6, 10, 15)", work: pairs.join(", ") },
          { label: "Divisible by all three (by 30)", work: `${n(30)}` },
          { label: "Add singles, subtract pairs, add back the triple", work: `${singles.join(" + ")} − ${pairs.join(" − ")} + ${n(30)}` },
        ],
        params,
      );
    }
    case "survey": {
      const { total, a, b, both, ask } = params;
      const survey = SURVEYS[(total + a + b) % SURVEYS.length];
      const either = a + b - both;
      return problem(
        `survey-${survey.id}-${total}-${a}-${b}-${both}-${ask}`,
        `In a ${survey.group} of ${total} ${survey.members}, ${a} ${survey.a}, ${b} ${survey.b} and ${both} ${survey.both}. How many ${ask === "either" ? `${survey.a.split(" ")[0]} at least one` : "do neither"}?`,
        q(ask === "either" ? either : total - either),
        "count",
        [
          { label: "At least one", work: `${a} + ${b} − ${both}`, result: `${either}` },
          ...(ask === "neither" ? [{ label: "Neither", work: `${total} − ${either}` }] : []),
        ],
        { ...params, survey: survey.id },
      );
    }
    case "cards": {
      const event = CARD_OVERLAPS.find((e) => e.id === params.event)!;
      return problem(
        `cards-${event.id}`,
        `How many cards in a 52-card deck are ${event.label}?`,
        q(event.aCount + event.bCount - event.bothCount),
        "count",
        [
          { label: event.a, work: `${event.aCount}` },
          { label: event.b, work: `${event.bCount}` },
          { label: `${event.both}, counted twice`, work: `${event.bothCount}` },
          { label: "Add, then take off the double count", work: `${event.aCount} + ${event.bCount} − ${event.bothCount}` },
        ],
        params,
      );
    }
  }
}

const DIVISOR_PAIRS = [[2, 3], [2, 5], [3, 5], [3, 4], [4, 6], [2, 7], [3, 7], [6, 10]] as const;

export const COUNTING_LESSONS: QuantLessonDef[] = [
  {
    id: "multiplying-choices",
    title: "Multiplying choices",
    benefit: "Count outcomes of choices made in steps",
    idea: "When you make one choice after another, multiply the number of options at each step. An option like “no dessert” counts as one more choice.",
    targetSeconds: 20,
    example: multiplyingChoices({ type: "outfits", shirts: 5, trousers: 3, shoes: 2 }),
    generate: (random) =>
      pick(random, [
        () => multiplyingChoices({ type: "outfits", shirts: int(random, 3, 8), trousers: int(random, 2, 5), shoes: int(random, 2, 4) }),
        () => multiplyingChoices({ type: "pin", digits: int(random, 3, 6) }),
        () => multiplyingChoices({ type: "plate", letters: int(random, 2, 3), digits: int(random, 2, 3) }),
        () => multiplyingChoices({ type: "dice", dice: int(random, 2, 4), sides: pick(random, [4, 6, 8]) }),
        () => multiplyingChoices({ type: "coins", flips: int(random, 3, 10) }),
        () => multiplyingChoices({ type: "menu", starters: int(random, 2, 5), mains: int(random, 3, 8), desserts: int(random, 2, 4) }),
      ])(),
  },
  {
    id: "permutations",
    title: "Permutations",
    benefit: "Count arrangements when order matters",
    idea: "Arranging n different things gives n × (n − 1) × … × 1 ways, written n!. To fill only some spots, stop when they’re full. If some things are the same, divide by the ways to shuffle each repeat.",
    targetSeconds: 30,
    example: permutations({ type: "podium", runners: 8, places: 3 }),
    generate: (random) =>
      pick(random, [
        () => permutations({ type: "shelf", books: int(random, 4, 8) }),
        () => permutations({ type: "podium", runners: int(random, 5, 12), places: int(random, 2, 4) }),
        () => permutations({ type: "pin", digits: int(random, 3, 5) }),
        () => permutations({ type: "anagram", word: pick(random, ANAGRAM_WORDS) }),
        () => permutations({ type: "table", people: int(random, 4, 8) }),
      ])(),
  },
  {
    id: "combinations",
    title: "Combinations",
    benefit: "Count groups when order doesn’t matter",
    idea: "To choose k things from n when order doesn’t matter, count the ordered picks, then divide by k! to remove the orders. This is C(n, k), said “n choose k”.",
    targetSeconds: 40,
    example: combinations({ type: "choose", from: 10, pick: 3 }),
    generate: (random) =>
      pick(random, [
        () => combinations({ type: "choose", from: int(random, 5, 12), pick: int(random, 2, 4) }),
        () => {
          const men = int(random, 3, 7), women = int(random, 3, 7), size = int(random, 3, 5);
          return combinations({ type: "committee", men, women, size, picked: int(random, Math.max(1, size - men), Math.min(size - 1, women)) });
        },
        () => combinations({ type: "grid", east: int(random, 2, 6), north: int(random, 2, 5) }),
        () => combinations({ type: "sweets", sweets: int(random, 3, 10), children: int(random, 2, 4) }),
        () =>
          random() < 0.6
            ? combinations({ type: "hearts", hearts: int(random, 1, 4) })
            : combinations(random() < 0.5 ? { type: "flush" } : { type: "red" }),
        () => combinations({ type: "handshakes", people: int(random, 5, 30) }),
      ])(),
  },
  {
    id: "inclusion-exclusion",
    title: "Inclusion–exclusion",
    benefit: "Count things that fall in either group",
    idea: "To count things in A or B, add the count of A and the count of B, then take away the ones in both, since they were counted twice.",
    targetSeconds: 40,
    example: inclusionExclusion({ type: "divisible", upTo: 100, a: 2, b: 3, ask: "either" }),
    generate: (random) =>
      pick(random, [
        () => {
          const [a, b] = pick(random, DIVISOR_PAIRS);
          return inclusionExclusion({ type: "divisible", upTo: pick(random, [50, 60, 100, 120, 200]), a, b, ask: random() < 0.6 ? "either" : "neither" });
        },
        () => inclusionExclusion({ type: "divisible3", upTo: pick(random, [30, 50, 60, 100, 120]) }),
        () => {
          const total = int(random, 20, 40);
          const both = int(random, 2, 8);
          const a = int(random, both + 3, Math.floor(total * 0.6));
          const b = int(random, both + 2, Math.min(total - a + both - 1, Math.floor(total * 0.6)));
          return inclusionExclusion({ type: "survey", total, a, b, both, ask: random() < 0.5 ? "either" : "neither" });
        },
        () => inclusionExclusion({ type: "cards", event: pick(random, CARD_OVERLAPS).id }),
      ])(),
  },
];
