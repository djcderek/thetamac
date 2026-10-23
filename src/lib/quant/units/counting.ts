import { q } from "../rational";
import { choose, commas, factorial, int, pick, problem, sup, type QuantLessonDef, type QuantProblem } from "../build";
import type { CardId, QuantVisual, Tone } from "../visual";

/** "5 × 4 × 3": the falling product n × (n − 1) × … for k terms. */
const falling = (n: number, k: number) => Array.from({ length: k }, (_, i) => n - i);
const product = (values: number[]) => values.reduce((acc, v) => acc * v, 1);
const times = (values: number[]) => values.join(" × ");

/**
 * A row of boxes, one per choice, joined by ×. Long rows keep the first three and last two
 * boxes with a "…" between, so a phone can still show them.
 */
function slots(boxes: { label: string; value: string | number; tone?: Tone }[], result?: string, caption?: string): QuantVisual {
  const all = boxes.map((box) => ({ label: box.label, value: String(box.value), tone: box.tone ?? ("hit" as Tone) }));
  const shown = all.length > 7 ? [...all.slice(0, 3), { label: "…", value: "…", tone: "muted" as Tone }, ...all.slice(-2)] : all;
  return { type: "slots", slots: shown, op: "×", ...(result ? { result } : {}), ...(caption ? { caption } : {}) };
}

const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const SUIT_LETTER = { spades: "S", hearts: "H", diamonds: "D", clubs: "C" } as const;
const ALL_CARDS: { rank: number; suit: keyof typeof SUIT_LETTER }[] = (["spades", "hearts", "diamonds", "clubs"] as const).flatMap((suit) =>
  Array.from({ length: 13 }, (_, i) => ({ rank: i + 1, suit })),
);
const cardsWhere = (test: (card: { rank: number; suit: keyof typeof SUIT_LETTER }) => boolean): CardId[] =>
  ALL_CARDS.filter(test).map((card) => `${card.rank}${SUIT_LETTER[card.suit]}` as CardId);

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
          {
            label: "Options at each step",
            work: `${shirts} shirts, ${trousers} trousers, ${shoes} shoes`,
            icon: "count",
            explain: "Count the options for each part of the outfit: the shirt, then the trousers, then the shoes.",
          },
          {
            label: "Multiply them",
            work: times([shirts, trousers, shoes]),
            icon: "multiply",
            explain: "Every shirt goes with every pair of trousers, and each of those with every pair of shoes, so the counts multiply.",
            visual: slots(
              [{ label: "Shirts", value: shirts }, { label: "Trousers", value: trousers }, { label: "Shoes", value: shoes }],
              String(shirts * trousers * shoes),
            ),
          },
        ],
        params,
        slots([{ label: "Shirts", value: shirts }, { label: "Trousers", value: trousers }, { label: "Shoes", value: shoes }]),
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
          {
            label: "Options for each digit",
            work: "0 to 9",
            result: "10",
            icon: "count",
            explain: "Each digit can be any of the ten digits 0 to 9, whatever the other digits are.",
          },
          {
            label: `Multiply for ${digits} digits`,
            work: `10${sup(digits)}`,
            icon: "multiply",
            explain: `There are ${digits} digits, each with 10 options, so multiply 10 by itself ${digits} times.`,
            visual: slots(
              Array.from({ length: digits }, (_, i) => ({ label: `Digit ${i + 1}`, value: 10 })),
              commas(10 ** digits),
            ),
          },
        ],
        params,
        slots(Array.from({ length: digits }, (_, i) => ({ label: `Digit ${i + 1}`, value: 10 }))),
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
          {
            label: "Options for each letter, then each digit",
            work: "26, then 10",
            icon: "count",
            explain: "Each letter spot has 26 options, A to Z, and each digit spot has 10, 0 to 9.",
          },
          {
            label: "Multiply them",
            work: `26${sup(letters)} × 10${sup(digits)} = ${commas(26 ** letters)} × ${commas(10 ** digits)}`,
            icon: "multiply",
            explain: "Each spot is filled independently of the others, so multiply the options for every spot.",
            visual: slots(
              [
                ...Array.from({ length: letters }, (_, i) => ({ label: `Letter ${i + 1}`, value: 26 })),
                ...Array.from({ length: digits }, (_, i) => ({ label: `Digit ${i + 1}`, value: 10, tone: "alt" as Tone })),
              ],
              commas(26 ** letters * 10 ** digits),
            ),
          },
        ],
        params,
        slots([
          ...Array.from({ length: letters }, (_, i) => ({ label: `Letter ${i + 1}`, value: 26 })),
          ...Array.from({ length: digits }, (_, i) => ({ label: `Digit ${i + 1}`, value: 10, tone: "alt" as Tone })),
        ]),
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
          {
            label: "Options for each roll",
            work: `${sides} faces`,
            result: `${sides}`,
            icon: "count",
            explain: `Each roll can land on any of the ${sides} faces, whatever the other rolls did.`,
          },
          {
            label: `Multiply for ${dice} rolls`,
            work: `${sides}${sup(dice)}`,
            icon: "multiply",
            explain: `A sequence is one result for each of the ${dice} rolls, so multiply ${sides} by itself ${dice} times.`,
            visual: slots(
              Array.from({ length: dice }, (_, i) => ({ label: `Roll ${i + 1}`, value: sides })),
              commas(sides ** dice),
            ),
          },
        ],
        params,
        slots(Array.from({ length: dice }, (_, i) => ({ label: `Roll ${i + 1}`, value: sides }))),
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
          {
            label: "Options for each flip",
            work: "heads or tails",
            result: "2",
            icon: "flip",
            explain: "Each flip has 2 options, heads or tails.",
          },
          {
            label: `Multiply for ${flips} flips`,
            work: `2${sup(flips)}`,
            icon: "multiply",
            explain: `Each extra flip doubles the number of sequences, so there are 2 multiplied by itself ${flips} times.`,
            visual: {
              type: "coins",
              flips: Array.from({ length: flips }, (_, i) => (i % 3 === 1 ? "T" : "H")),
              caption: `One of the ${commas(2 ** flips)} possible sequences`,
            },
          },
        ],
        params,
        { type: "coins", flips: Array.from({ length: flips }, () => "?"), caption: "Each flip: heads or tails" },
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
          {
            label: "Starter options, counting “none”",
            work: `${starters} + 1`,
            result: `${starters + 1}`,
            icon: "add",
            explain: "Skipping the starter is one more way to choose, so add 1 to the number of starters.",
          },
          {
            label: "Dessert options, counting “none”",
            work: `${desserts} + 1`,
            result: `${desserts + 1}`,
            icon: "add",
            explain: "The same goes for dessert: no dessert is one more option.",
          },
          {
            label: "Multiply with the mains",
            work: times([starters + 1, mains, desserts + 1]),
            icon: "multiply",
            explain: "Every starter choice goes with every main and every dessert choice, so multiply the three counts.",
            visual: slots(
              [
                { label: "Starter or none", value: starters + 1 },
                { label: "Main", value: mains },
                { label: "Dessert or none", value: desserts + 1 },
              ],
              String((starters + 1) * mains * (desserts + 1)),
            ),
          },
        ],
        params,
        slots([
          { label: "Starter or none", value: `${starters} + 1` },
          { label: "Main", value: mains },
          { label: "Dessert or none", value: `${desserts} + 1` },
        ]),
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
          {
            label: "Options for each spot, left to right",
            work: times(falling(books, books)),
            icon: "count",
            explain: `Any of the ${books} books can go first, then any of the ${books - 1} left, and so on down to the last book.`,
            visual: slots(falling(books, books).map((value, i) => ({ label: `${ordinal(i + 1)} spot`, value }))),
          },
          {
            label: `That’s ${books}!`,
            work: `${books}!`,
            icon: "multiply",
            explain: `Multiplying every whole number from ${books} down to 1 is written ${books}!, said “${books} factorial”.`,
            visual: slots(
              falling(books, books).map((value, i) => ({ label: `${ordinal(i + 1)} spot`, value })),
              commas(factorial(books)),
            ),
          },
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
          {
            label: `Options for each of the ${places} places`,
            work: picks.join(", then "),
            icon: "count",
            explain: "Any runner can come first. Whoever is first can’t also be second, so each place has one fewer option.",
            visual: slots(picks.map((value, i) => ({ label: places === 3 ? ["Gold", "Silver", "Bronze"][i] : `${ordinal(i + 1)} place`, value }))),
          },
          {
            label: "Multiply them",
            work: times(picks),
            icon: "multiply",
            explain: "Each choice for one place goes with every choice for the next, so multiply.",
            visual: slots(
              picks.map((value, i) => ({ label: places === 3 ? ["Gold", "Silver", "Bronze"][i] : `${ordinal(i + 1)} place`, value })),
              commas(product(picks)),
            ),
          },
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
          {
            label: "Options for each digit, one fewer each time",
            work: picks.join(", then "),
            icon: "count",
            explain: "The first digit has 10 options. A digit can’t be used twice, so each later digit has one fewer.",
            visual: slots(picks.map((value, i) => ({ label: `Digit ${i + 1}`, value }))),
          },
          {
            label: "Multiply them",
            work: times(picks),
            icon: "multiply",
            explain: "Each choice for one digit goes with every choice for the next, so multiply.",
            visual: slots(
              picks.map((value, i) => ({ label: `Digit ${i + 1}`, value })),
              commas(product(picks)),
            ),
          },
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
          {
            label: `Arrange all ${word.length} letters as if they were different`,
            work: `${word.length}!`,
            result: commas(all),
            icon: "count",
            explain: `If every letter were different, there would be ${word.length}! orders, one for each way to fill the ${word.length} spots.`,
            visual: slots(falling(word.length, word.length).map((value, i) => ({ label: `${ordinal(i + 1)} letter`, value }))),
          },
          {
            label: "Letters that repeat",
            work: repeats.map(([letter, count]) => `${letter} ${count} times`).join(", "),
            icon: "filter",
            explain: "Swapping two copies of the same letter gives the same word, so those orders were counted more than once.",
            visual: letterBars(word),
          },
          {
            label: "Divide by the ways to shuffle each repeat",
            work: `${commas(all)} ÷ (${repeats.map(([, count]) => `${count}!`).join(" × ")})`,
            icon: "divide",
            explain: "A letter that appears `k` times can be shuffled `k!` ways without changing the word, so divide by that for each repeat.",
          },
        ],
        params,
        letterBars(word),
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
          {
            label: "Fix one person’s seat",
            work: `the other ${people - 1} fill the rest`,
            icon: "target",
            explain: "Turning everyone round gives the same seating, so seat one person first and count seatings around them.",
            visual: slots([
              { label: "First person", value: 1, tone: "known" },
              ...falling(people - 1, people - 1).map((value, i) => ({ label: `Seat ${i + 2}`, value })),
            ]),
          },
          {
            label: `Arrange the other ${people - 1}`,
            work: `${people - 1}!`,
            icon: "multiply",
            explain: `Once one seat is fixed, the other ${people - 1} people fill the other seats in a row of choices: ${people - 1}, then ${people - 2}, and so on.`,
            visual: slots(
              [
                { label: "First person", value: 1, tone: "known" },
                ...falling(people - 1, people - 1).map((value, i) => ({ label: `Seat ${i + 2}`, value })),
              ],
              commas(factorial(people - 1)),
            ),
          },
        ],
        params,
      );
    }
  }
}

/** How often each letter appears, with the repeated letters coloured. */
function letterBars(word: string): QuantVisual {
  return {
    type: "bars",
    bars: [...letterCounts(word)].map(([letter, count]) => ({ label: letter, value: count, tone: count > 1 ? "hit" : "muted", text: `${count}` })),
    caption: `Letters in ${word}`,
  };
}

// ─── Combinations ──────────────────────────────────────────────────────────────────────

/** A group of people for teams and committees, with the picked ones coloured. */
function teamPeople(women: number, men: number, pickedWomen: number, pickedMen: number, caption?: string): QuantVisual {
  return {
    type: "people",
    groups: [
      ...(pickedWomen > 0 ? [{ count: pickedWomen, tone: "hit" as Tone, label: "Women picked" }] : []),
      ...(women - pickedWomen > 0 ? [{ count: women - pickedWomen, tone: "muted" as Tone, label: "Other women" }] : []),
      ...(pickedMen > 0 ? [{ count: pickedMen, tone: "alt" as Tone, label: "Men picked" }] : []),
      ...(men - pickedMen > 0 ? [{ count: men - pickedMen, tone: "known" as Tone, label: "Other men" }] : []),
    ],
    ...(caption ? { caption } : {}),
  };
}

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
          {
            label: "Ordered picks",
            work: times(falling(from, k)),
            result: commas(ordered),
            icon: "count",
            explain: "First count as if order mattered: any book first, then any of the rest, and so on.",
            visual: slots(falling(from, k).map((value, i) => ({ label: `${ordinal(i + 1)} pick`, value })), commas(ordered)),
          },
          {
            label: `Divide by the ${k}! orders of the same ${k}`,
            work: `${commas(ordered)} ÷ ${k}!`,
            icon: "divide",
            explain: `The same ${k} books picked in a different order make the same set. Each set was counted ${k}! = ${factorial(k)} times, so divide.`,
            visual: slots(
              falling(k, k).map((value, i) => ({ label: `${ordinal(i + 1)} spot`, value, tone: "alt" as Tone })),
              `${factorial(k)} orders`,
              `Each set of ${k} can be ordered ${factorial(k)} ways`,
            ),
          },
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
          {
            label: `Ways to pick the ${picked} ${picked === 1 ? "woman" : "women"}`,
            work: `C(${women}, ${picked})`,
            result: `${womenWays}`,
            icon: "count",
            explain: `Choose which ${picked} of the ${women} women join. Order doesn’t matter, so it’s “${women} choose ${picked}”.`,
            visual: teamPeople(women, men, picked, 0),
          },
          {
            label: `Ways to pick the ${size - picked} ${size - picked === 1 ? "man" : "men"}`,
            work: `C(${men}, ${size - picked})`,
            result: `${menWays}`,
            icon: "count",
            explain: `The other ${size - picked} ${size - picked === 1 ? "place goes" : "places go"} to men: choose them from the ${men} men.`,
            visual: teamPeople(women, men, picked, size - picked),
          },
          {
            label: "Multiply them",
            work: `${womenWays} × ${menWays}`,
            icon: "multiply",
            explain: "Any choice of women goes with any choice of men, so multiply the two counts.",
          },
        ],
        params,
        teamPeople(women, men, 0, 0),
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
          {
            label: "Blocks in every route",
            work: `${east} + ${north}`,
            result: `${east + north}`,
            icon: "add",
            explain: `Every route is ${east + north} blocks long: ${east} going east and ${north} going north, in some order.`,
          },
          {
            label: "Choose which of them go north",
            work: `C(${east + north}, ${north})`,
            icon: "count",
            explain: `A route is fixed by which ${north} of the ${east + north} blocks go north; the rest go east. So choose ${north} of ${east + north}.`,
          },
        ],
        params,
        { type: "grid-path", across: east, up: north, caption: `One route: ${east} east and ${north} north` },
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
            icon: "split",
            explain: "Put the sweets in a row and drop in dividers: sweets before the first divider go to child 1, and so on.",
          },
          {
            label: "Choose where the dividers go",
            work: `C(${spots}, ${children - 1})`,
            icon: "count",
            explain: `Every way to share is one way to place the ${children - 1} dividers among the ${spots} spots, so choose their spots.`,
          },
        ],
        params,
        { type: "stars-bars", stars: sweets, bars: children - 1, caption: `${sweets} sweets, ${children - 1} dividers between ${children} children` },
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
          {
            label: `Ways to pick ${hearts} of the 13 hearts`,
            work: `C(13, ${hearts})`,
            result: commas(heartWays),
            icon: "count",
            explain: `Choose which ${hearts} hearts are in the hand. Order doesn’t matter in a hand, so it’s “13 choose ${hearts}”.`,
            visual: { type: "cards", marks: [{ cards: cardsWhere((c) => c.suit === "hearts"), tone: "hit" }], caption: "The 13 hearts" },
          },
          {
            label: `Ways to pick ${5 - hearts} of the 39 other cards`,
            work: `C(39, ${5 - hearts})`,
            result: commas(otherWays),
            icon: "count",
            explain: `The other ${5 - hearts} ${5 - hearts === 1 ? "card comes" : "cards come"} from the 39 cards that aren’t hearts.`,
            visual: {
              type: "cards",
              marks: [
                { cards: cardsWhere((c) => c.suit === "hearts"), tone: "hit" },
                { cards: cardsWhere((c) => c.suit !== "hearts"), tone: "alt" },
              ],
              caption: "13 hearts and 39 other cards",
            },
          },
          {
            label: "Multiply them",
            work: `${commas(heartWays)} × ${commas(otherWays)}`,
            icon: "multiply",
            explain: "Any choice of hearts goes with any choice of other cards, so multiply.",
          },
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
          {
            label: "Ways to pick 5 cards of one suit",
            work: "C(13, 5)",
            result: commas(choose(13, 5)),
            icon: "count",
            explain: "Within one suit, a hand is any 5 of its 13 cards: “13 choose 5”.",
            visual: { type: "cards", marks: [{ cards: cardsWhere((c) => c.suit === "spades"), tone: "hit" }], caption: "One suit: 13 cards" },
          },
          {
            label: "Times the 4 suits",
            work: `4 × ${commas(choose(13, 5))}`,
            icon: "multiply",
            explain: "The hand can be in any of the 4 suits, and no hand is in two suits, so multiply by 4.",
            visual: {
              type: "cards",
              marks: [
                { cards: cardsWhere((c) => c.suit === "spades" || c.suit === "diamonds"), tone: "hit" },
                { cards: cardsWhere((c) => c.suit === "hearts" || c.suit === "clubs"), tone: "alt" },
              ],
              caption: "The same count for each of the 4 suits",
            },
          },
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
          {
            label: "Red cards to pick from",
            work: "13 hearts + 13 diamonds",
            result: "26",
            icon: "add",
            explain: "Only red cards can be in the hand: the hearts and the diamonds.",
            visual: {
              type: "cards",
              marks: [{ cards: cardsWhere((c) => c.suit === "hearts" || c.suit === "diamonds"), tone: "hit" }],
              caption: "The 26 red cards",
            },
          },
          {
            label: "Ways to pick 5 of them",
            work: "C(26, 5)",
            icon: "count",
            explain: "A hand is any 5 of those 26 cards, in any order: “26 choose 5”.",
          },
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
          {
            label: "Each handshake is a pair of people",
            work: `C(${people}, 2)`,
            icon: "idea",
            explain: "A handshake is one pair of people, and each pair shakes once, so count the pairs.",
          },
          {
            label: "Pairs",
            work: `${people} × ${people - 1} ÷ 2`,
            icon: "divide",
            explain: `Each person shakes ${people - 1} hands, giving ${people} × ${people - 1}. That counts every handshake twice, once from each side, so halve it.`,
          },
        ],
        params,
        { type: "people", groups: [{ count: people, tone: "hit", label: "People" }], caption: `${people} people, each pair shakes once` },
      );
    }
  }
}

// ─── Inclusion–exclusion ───────────────────────────────────────────────────────────────

/** Two overlapping groups; counts are per region, and labels carry each group’s total. */
function venn(
  a: { label: string; total: number },
  b: { label: string; total: number },
  both: number,
  outside: number | null,
  highlight: ("a" | "b" | "both" | "outside")[],
  caption?: string,
): QuantVisual {
  // With nothing highlighted it's the question's own figure, so it can't show the counts.
  const blank = highlight.length === 0;
  const show = (n: number) => (blank ? "?" : String(n));
  return {
    type: "venn",
    a: { label: blank ? a.label : `${a.label} (${a.total})`, count: show(a.total - both) },
    b: { label: blank ? b.label : `${b.label} (${b.total})`, count: show(b.total - both) },
    both: show(both),
    ...(outside !== null ? { outside: show(outside) } : {}),
    highlight,
    ...(caption ? { caption } : {}),
  };
}

const capitalise = (text: string) => text[0].toUpperCase() + text.slice(1);

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
      const sets = (highlight: ("a" | "b" | "both" | "outside")[]) =>
        venn({ label: `By ${a}`, total: na }, { label: `By ${b}`, total: nb }, nboth, upTo - either, highlight);
      return problem(
        `divisible-${upTo}-${a}-${b}-${ask}`,
        `How many whole numbers from 1 to ${upTo} are divisible by ${ask === "either" ? `${a} or ${b}` : `neither ${a} nor ${b}`}?`,
        q(ask === "either" ? either : upTo - either),
        "count",
        [
          {
            label: `Divisible by ${a}`,
            work: `${upTo} ÷ ${a}, rounded down`,
            result: `${na}`,
            icon: "count",
            explain: `One number in every ${a} is divisible by ${a}, so there are ${upTo} ÷ ${a} of them, ignoring any remainder.`,
            visual: sets(["a", "both"]),
          },
          {
            label: `Divisible by ${b}`,
            work: `${upTo} ÷ ${b}, rounded down`,
            result: `${nb}`,
            icon: "count",
            explain: `Count the multiples of ${b} the same way.`,
            visual: sets(["b", "both"]),
          },
          {
            label: `Divisible by both (by ${both})`,
            work: `${upTo} ÷ ${both}, rounded down`,
            result: `${nboth}`,
            icon: "filter",
            explain: `A number divisible by both ${a} and ${b} is a multiple of ${both}. These were counted in both lists above.`,
            visual: sets(["both"]),
          },
          {
            label: `Divisible by ${a} or ${b}`,
            work: `${na} + ${nb} − ${nboth}`,
            result: `${either}`,
            icon: "subtract",
            explain: "Add the two lists, then take off the overlap once, so no number is counted twice.",
            visual: sets(["a", "b", "both"]),
          },
          ...(ask === "neither"
            ? [
                {
                  label: "Neither",
                  work: `${upTo} − ${either}`,
                  icon: "subtract" as const,
                  explain: `Every other number from 1 to ${upTo} is divisible by neither.`,
                  visual: sets(["outside"]),
                },
              ]
            : []),
        ],
        params,
        sets([]),
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
          {
            label: "Divisible by 2, by 3, by 5",
            work: singles.join(", "),
            icon: "count",
            explain: `Count the multiples of each: ${upTo} ÷ 2, ${upTo} ÷ 3 and ${upTo} ÷ 5, ignoring remainders.`,
            visual: divisorBars(upTo, 1),
          },
          {
            label: "Divisible by two of them (by 6, 10, 15)",
            work: pairs.join(", "),
            icon: "filter",
            explain: "A number divisible by two of them is counted twice above. Find those: multiples of 6, 10 and 15.",
            visual: divisorBars(upTo, 2),
          },
          {
            label: "Divisible by all three (by 30)",
            work: `${n(30)}`,
            icon: "filter",
            explain: "Multiples of 30 are counted 3 times as singles and taken off 3 times as pairs, so they need adding back once.",
            visual: divisorBars(upTo, 3),
          },
          {
            label: "Add singles, subtract pairs, add back the triple",
            work: `${singles.join(" + ")} − ${pairs.join(" − ")} + ${n(30)}`,
            icon: "add",
            explain: "This way every number divisible by 2, 3 or 5 is counted exactly once.",
          },
        ],
        params,
      );
    }
    case "survey": {
      const { total, a, b, both, ask } = params;
      const survey = SURVEYS[(total + a + b) % SURVEYS.length];
      const either = a + b - both;
      const sets = (highlight: ("a" | "b" | "both" | "outside")[]) =>
        venn({ label: capitalise(survey.a), total: a }, { label: capitalise(survey.b), total: b }, both, total - either, highlight);
      return problem(
        `survey-${survey.id}-${total}-${a}-${b}-${both}-${ask}`,
        `In a ${survey.group} of ${total} ${survey.members}, ${a} ${survey.a}, ${b} ${survey.b} and ${both} ${survey.both}. How many ${ask === "either" ? `${survey.a.split(" ")[0]} at least one` : "do neither"}?`,
        q(ask === "either" ? either : total - either),
        "count",
        [
          {
            label: "At least one",
            work: `${a} + ${b} − ${both}`,
            result: `${either}`,
            icon: "subtract",
            explain: `The ${both} who ${survey.both} are in both groups, so adding ${a} and ${b} counts them twice. Take them off once.`,
            visual: sets(["a", "b", "both"]),
          },
          ...(ask === "neither"
            ? [
                {
                  label: "Neither",
                  work: `${total} − ${either}`,
                  icon: "subtract" as const,
                  explain: `Everyone else in the ${survey.group} is in neither group.`,
                  visual: sets(["outside"]),
                },
              ]
            : []),
        ],
        { ...params, survey: survey.id },
        sets([]),
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
          {
            label: event.a,
            work: `${event.aCount}`,
            icon: "count",
            explain: `Count the ${event.a.toLowerCase()} in the deck.`,
            visual: { type: "cards", marks: [{ cards: cardsWhere(OVERLAP_TESTS[event.id].a), tone: "hit" }] },
          },
          {
            label: event.b,
            work: `${event.bCount}`,
            icon: "count",
            explain: `Count the ${event.b.toLowerCase()}.`,
            visual: { type: "cards", marks: [{ cards: cardsWhere(OVERLAP_TESTS[event.id].b), tone: "alt" }] },
          },
          {
            label: `${event.both}, counted twice`,
            work: `${event.bothCount}`,
            icon: "filter",
            explain: `${event.both} are in both counts, so each of them was counted twice.`,
            visual: overlapCards(event.id),
          },
          {
            label: "Add, then take off the double count",
            work: `${event.aCount} + ${event.bCount} − ${event.bothCount}`,
            icon: "subtract",
            explain: "Add the two counts, then take off the cards counted twice, so each card counts once.",
          },
        ],
        params,
        venn({ label: event.a, total: event.aCount }, { label: event.b, total: event.bCount }, event.bothCount, 52 - (event.aCount + event.bCount - event.bothCount), []),
      );
    }
  }
}

type CardTest = (card: { rank: number; suit: keyof typeof SUIT_LETTER }) => boolean;
const isRedSuit: CardTest = (c) => c.suit === "hearts" || c.suit === "diamonds";
/** The two groups behind each CARD_OVERLAPS event, for drawing the deck. */
const OVERLAP_TESTS: Record<string, { a: CardTest; b: CardTest }> = {
  "heart-face": { a: (c) => c.suit === "hearts", b: (c) => c.rank >= 11 },
  "red-ace": { a: isRedSuit, b: (c) => c.rank === 1 },
  "spade-low": { a: (c) => c.suit === "spades", b: (c) => c.rank >= 2 && c.rank <= 5 },
  "black-king": { a: (c) => !isRedSuit(c), b: (c) => c.rank === 13 },
  "club-high": { a: (c) => c.suit === "clubs", b: (c) => c.rank >= 10 || c.rank === 1 },
};

function overlapCards(id: string): QuantVisual {
  const { a, b } = OVERLAP_TESTS[id];
  return {
    type: "cards",
    marks: [
      { cards: cardsWhere((c) => a(c) && !b(c)), tone: "hit" },
      { cards: cardsWhere((c) => b(c) && !a(c)), tone: "alt" },
      { cards: cardsWhere((c) => a(c) && b(c)), tone: "both" },
    ],
  };
}

/** Multiples of 2, 3, 5 and their combinations, colouring the ones a step counts. */
function divisorBars(upTo: number, level: 1 | 2 | 3): QuantVisual {
  const groups: { d: number; size: 1 | 2 | 3 }[] = [
    { d: 2, size: 1 }, { d: 3, size: 1 }, { d: 5, size: 1 },
    { d: 6, size: 2 }, { d: 10, size: 2 }, { d: 15, size: 2 },
    { d: 30, size: 3 },
  ];
  return {
    type: "bars",
    bars: groups.map(({ d, size }) => ({
      label: `By ${d}`,
      value: Math.floor(upTo / d),
      tone: size === level ? (size === 2 ? "alt" : "hit") : "muted",
      text: `${Math.floor(upTo / d)}`,
    })),
    caption: `Multiples up to ${upTo}`,
  };
}

// ─── More question types ───────────────────────────────────────────────────────────────

type SubsetParams = { type: "subsets" | "toppings" | "nested"; items: number };

/** Subsets: each item is in or out (2 options), or for A inside B, one of 3 options. */
function subsetsProblem(params: SubsetParams): QuantProblem {
  const { type, items } = params;
  const per = type === "nested" ? 3 : 2;
  const total = per ** items;
  const boxes = (label: string) => Array.from({ length: items }, (_, i) => ({ label: `${label} ${i + 1}`, value: per }));
  if (type === "nested") {
    return problem(
      `nested-${items}`,
      `A set has ${items} different items. How many ways can you pick two subsets A and B of it, where every item in A is also in B?`,
      q(total),
      "count",
      [
        {
          label: "Options for each item",
          work: "in A and B, in B only, or in neither",
          result: "3",
          icon: "count",
          explain: "An item can’t be in `A` without also being in `B`, so each item has exactly 3 options.",
          visual: slots(boxes("Item")),
        },
        {
          label: `Multiply for all ${items} items`,
          work: `3${sup(items)}`,
          icon: "multiply",
          explain: "Each item’s option goes with every option for the other items, so multiply the 3s.",
          visual: slots(boxes("Item"), commas(total)),
        },
      ],
      params,
    );
  }
  const what = type === "toppings" ? "topping" : "item";
  const steps: Parameters<typeof problem>[4] = [
    {
      label: `Each ${what}: ${type === "toppings" ? "on or off" : "in or out"}`,
      work: `2 options for each of the ${items} ${what}s`,
      icon: "count",
      explain: `A ${type === "toppings" ? "choice of toppings" : "subset"} is fixed by deciding, ${what} by ${what}, whether it’s ${type === "toppings" ? "on" : "in"}.`,
      visual: slots(boxes(type === "toppings" ? "Topping" : "Item")),
    },
    {
      label: "Multiply them",
      work: `2${sup(items)}`,
      ...(type === "toppings" ? { result: commas(total) } : {}),
      icon: "multiply",
      explain: `Each ${what}’s choice goes with every choice for the others, so multiply the 2s.`,
      visual: slots(boxes(type === "toppings" ? "Topping" : "Item"), commas(total)),
    },
  ];
  if (type === "toppings") {
    steps.push({
      label: "Take away “no toppings”",
      work: `${commas(total)} − 1`,
      icon: "subtract",
      explain: "One of those choices has every topping off, which isn’t allowed, so take it away.",
    });
  }
  return problem(
    `${type}-${items}`,
    type === "toppings"
      ? `An ice-cream shop has ${items} toppings. You can add any number of them, but at least one. How many different sets of toppings can you choose?`
      : `A set has ${items} different items. How many subsets does it have, counting the empty set and the whole set?`,
    q(type === "toppings" ? total - 1 : total),
    "count",
    steps,
    params,
  );
}

type ArrangeParams =
  | { type: "together"; people: number; ask: "together" | "apart" }
  | { type: "gaps"; boys: number; girls: number }
  | { type: "mirror"; people: number }
  | { type: "seat-some"; from: number; seats: number; mirror: number }
  | { type: "heights"; students: number };

/** Heights in an example photo line-up: tallest two in the middle, shorter going outwards. */
function heightBars(students: number): QuantVisual {
  const half = (students - 2) / 2;
  // An example split: alternate the others left and right, tallest first.
  const others = Array.from({ length: students - 2 }, (_, i) => students - 2 - i);
  const left = others.filter((_, i) => i % 2 === 0);
  const right = others.filter((_, i) => i % 2 === 1);
  const order = [...[...left].reverse(), students, students - 1, ...right];
  return {
    type: "bars",
    bars: order.map((h, i) => ({ label: `${i + 1}`, value: h, tone: (h >= students - 1 ? "hit" : "muted") as Tone })),
    caption: `One possible line-up: ${half} on each side, getting shorter away from the middle`,
  };
}

function arrangements(params: ArrangeParams): QuantProblem {
  switch (params.type) {
    case "together": {
      const { people, ask } = params;
      const glued = 2 * factorial(people - 1);
      const all = factorial(people);
      const gluedSteps: Parameters<typeof problem>[4] = [
        {
          label: "Glue Ana and Ben into one block",
          work: `${people - 1} things to line up`,
          icon: "target",
          explain: `Treat the pair as one block. Then there are ${people - 1} things to order: the block and the ${people - 2} other people.`,
          visual: slots([
            { label: "Ana + Ben", value: "1", tone: "hit" },
            ...Array.from({ length: people - 2 }, (_, i) => ({ label: `Person ${i + 3}`, value: "1", tone: "muted" as Tone })),
          ]),
        },
        {
          label: "Orders of the blocks",
          work: `${people - 1}!`,
          result: commas(factorial(people - 1)),
          icon: "count",
          explain: `The block and the other people are ${people - 1} things in a row, and any order of them works.`,
        },
        {
          label: "Ana and Ben can swap inside the block",
          work: `${commas(factorial(people - 1))} × 2`,
          ...(ask === "apart" ? { result: commas(glued) } : {}),
          icon: "multiply",
          explain: "Inside the block, Ana can stand on the left or the right, so double the count.",
          visual: slots([{ label: "Block orders", value: `${people - 1}!` }, { label: "Inside the block", value: "2" }], ask === "together" ? commas(glued) : undefined),
        },
      ];
      if (ask === "together") {
        return problem(
          `together-${people}`,
          `${people} people, including Ana and Ben, line up in a row. In how many orders are Ana and Ben next to each other?`,
          q(glued),
          "count",
          gluedSteps,
          params,
        );
      }
      return problem(
        `apart-${people}`,
        `${people} people, including Ana and Ben, line up in a row. In how many orders are Ana and Ben NOT next to each other?`,
        q(all - glued),
        "count",
        [
          {
            label: "All orders",
            work: `${people}!`,
            result: commas(all),
            icon: "count",
            explain: `Without any rule, the ${people} people can line up in ${people}! orders.`,
          },
          ...gluedSteps,
          {
            label: "Take away the orders where they’re together",
            work: `${commas(all)} − ${commas(glued)}`,
            icon: "subtract",
            explain: "Every order has them either together or apart, so apart is all orders minus together.",
          },
        ],
        params,
      );
    }
    case "gaps": {
      const { boys, girls } = params;
      const boyOrders = factorial(boys);
      const gapPicks = falling(boys + 1, girls);
      const girlWays = product(gapPicks);
      return problem(
        `gaps-${boys}-${girls}`,
        `${boys} boys and ${girls} girls, all different people, stand in a row. In how many orders are no two girls next to each other?`,
        q(boyOrders * girlWays),
        "count",
        [
          {
            label: "Line up the boys first",
            work: `${boys}!`,
            result: commas(boyOrders),
            icon: "count",
            explain: "Place the boys in any order. The girls will go in the spaces around them.",
            visual: slots([{ label: "Boys’ orders", value: `${boys}!` }]),
          },
          {
            label: "Spaces around the boys",
            work: `${boys} boys leave ${boys + 1} spaces`,
            icon: "split",
            explain: "There’s a space before the first boy, between each pair of boys, and after the last. Girls in different spaces are never side by side.",
          },
          {
            label: "Put each girl in a different space",
            work: times(gapPicks),
            result: commas(girlWays),
            icon: "count",
            explain: `The first girl has ${boys + 1} spaces to choose from, the next has one fewer, and so on.`,
            visual: slots(gapPicks.map((value, i) => ({ label: `Girl ${i + 1}`, value }))),
          },
          {
            label: "Multiply",
            work: `${commas(boyOrders)} × ${commas(girlWays)}`,
            icon: "multiply",
            explain: "Every order of the boys goes with every way to place the girls.",
            visual: slots([{ label: "Boys’ orders", value: commas(boyOrders) }, { label: "Girls’ places", value: commas(girlWays) }], commas(boyOrders * girlWays)),
          },
        ],
        params,
      );
    }
    case "mirror": {
      const { people } = params;
      const turned = factorial(people - 1);
      return problem(
        `mirror-${people}`,
        `${people} people sit around a round table. Two seatings count as the same if everyone has the same two neighbours, even with left and right swapped. How many different seatings are there?`,
        q(turned / 2),
        "count",
        [
          {
            label: "Fix one person’s seat",
            work: `the other ${people - 1} in ${people - 1}! orders`,
            result: commas(turned),
            icon: "target",
            explain: "Turning everyone round changes nothing, so seat one person first and order the rest around them.",
            visual: slots([
              { label: "First person", value: 1, tone: "known" },
              ...falling(people - 1, people - 1).map((value, i) => ({ label: `Seat ${i + 2}`, value })),
            ]),
          },
          {
            label: "A seating and its mirror image are the same",
            work: `${commas(turned)} ÷ 2`,
            icon: "divide",
            explain: "Reading the seats the other way round gives everyone the same two neighbours, so each seating was counted twice.",
          },
        ],
        params,
      );
    }
    case "seat-some": {
      const { from, seats, mirror } = params;
      const who = choose(from, seats);
      const around = factorial(seats - 1) / (mirror ? 2 : 1);
      return problem(
        `seat-${from}-${seats}-${mirror}`,
        mirror
          ? `${seats} of a group of ${from} people sit around a round table. Seatings count as the same if everyone has the same two neighbours, whichever side they’re on. How many different seatings are there?`
          : `${seats} of a group of ${from} people sit around a round table. Seatings count as the same if everyone has the same person on their left and on their right. How many different seatings are there?`,
        q(who * around),
        "count",
        [
          {
            label: `Choose who sits down`,
            work: `C(${from}, ${seats})`,
            result: commas(who),
            icon: "count",
            explain: `First pick which ${seats} of the ${from} people sit. Order doesn’t matter yet.`,
            visual: { type: "people", groups: [{ count: seats, tone: "hit", label: "Sitting" }, { count: from - seats, tone: "muted", label: "Not sitting" }] },
          },
          {
            label: "Seat them around the table",
            work: mirror ? `${seats - 1}! ÷ 2` : `${seats - 1}!`,
            result: commas(around),
            icon: mirror ? "divide" : "target",
            explain: mirror
              ? `Fix one person’s seat and order the other ${seats - 1} around them. A seating and its mirror image give everyone the same neighbours, so halve it.`
              : `Fix one person’s seat so turning the table doesn’t make a new seating, then order the other ${seats - 1} around them.`,
          },
          {
            label: "Multiply",
            work: `${commas(who)} × ${commas(around)}`,
            icon: "multiply",
            explain: "Every choice of people goes with every way to seat them.",
            visual: slots([{ label: "Who sits", value: commas(who) }, { label: "Seatings", value: commas(around) }], commas(who * around)),
          },
        ],
        params,
      );
    }
    case "heights": {
      const { students } = params;
      const half = (students - 2) / 2;
      const left = choose(students - 2, half);
      return problem(
        `heights-${students}`,
        `${students} students of different heights line up for a photo. The two tallest stand in the two middle spots, and on each side heights go down moving away from the middle. How many line-ups are possible?`,
        q(2 * left),
        "count",
        [
          {
            label: "The two tallest take the middle",
            work: "in either order",
            result: "2",
            icon: "target",
            explain: "The two middle spots go to the two tallest students, and they can stand either way round.",
            visual: heightBars(students),
          },
          {
            label: "Choose who goes on the left",
            work: `C(${students - 2}, ${half})`,
            result: commas(left),
            icon: "count",
            explain: `Pick which ${half} of the other ${students - 2} go on the left. Their order is then fixed, tallest nearest the middle, and the rest go on the right in the same way.`,
          },
          {
            label: "Multiply",
            work: `2 × ${commas(left)}`,
            icon: "multiply",
            explain: "Each order of the middle pair goes with each choice of who stands on the left.",
          },
        ],
        params,
        heightBars(students),
      );
    }
  }
}

type GroupParams =
  | { type: "named-groups"; a: number; b: number; c: number }
  | { type: "through"; east: number; north: number; viaEast: number; viaNorth: number }
  | { type: "poker"; hand: string }
  | { type: "range"; low: number; high: number; count: number; context: string }
  | { type: "sweets-min"; sweets: number; children: number };

const POKER_HANDS: { id: string; name: string; rule: string; example: CardId[] }[] = [
  { id: "four", name: "four of a kind", rule: "four cards of one rank and any fifth card", example: ["9S", "9H", "9D", "9C", "4H"] },
  { id: "full", name: "a full house", rule: "three cards of one rank and two of another", example: ["13S", "13H", "13D", "5C", "5S"] },
  { id: "three", name: "three of a kind", rule: "three cards of one rank and two cards of two other ranks", example: ["7S", "7H", "7D", "12C", "2S"] },
  { id: "two-pair", name: "two pair", rule: "two cards of one rank, two of another, and a fifth card of a third rank", example: ["11S", "11H", "3D", "3C", "8S"] },
  { id: "one-pair", name: "one pair", rule: "two cards of one rank and three cards of three other ranks", example: ["1S", "1H", "6D", "10C", "13S"] },
];

/** The steps that count a poker hand: rank choices, suit choices, then multiply. */
function pokerSteps(hand: string): { steps: { label: string; work: string; value: number; explain: string }[] } {
  switch (hand) {
    case "four":
      return {
        steps: [
          { label: "Rank of the four", work: "13 ranks, all 4 suits", value: 13, explain: "Pick which rank the four cards share. All four suits of it are in the hand." },
          { label: "The fifth card", work: "any of the other 48", value: 48, explain: "The last card can be any card that isn’t one of the four." },
        ],
      };
    case "full":
      return {
        steps: [
          { label: "The three of a kind", work: "13 ranks × C(4, 3) suits", value: 52, explain: "Pick the rank for the three cards, then which 3 of its 4 suits." },
          { label: "The pair", work: "12 other ranks × C(4, 2) suits", value: 72, explain: "Pick a different rank for the pair, then which 2 of its 4 suits." },
        ],
      };
    case "three":
      return {
        steps: [
          { label: "The three of a kind", work: "13 ranks × C(4, 3) suits", value: 52, explain: "Pick the rank for the three cards, then which 3 of its 4 suits." },
          { label: "Ranks of the other two", work: "C(12, 2)", value: 66, explain: "Pick two different ranks from the other 12, so the hand doesn’t become a full house." },
          { label: "A suit for each of them", work: "4 × 4", value: 16, explain: "Each of those two cards can be any of the 4 suits." },
        ],
      };
    case "two-pair":
      return {
        steps: [
          { label: "Ranks of the two pairs", work: "C(13, 2)", value: 78, explain: "Pick two ranks together, so pair order doesn’t count twice." },
          { label: "Suits for each pair", work: "C(4, 2) × C(4, 2)", value: 36, explain: "Each pair uses 2 of its rank’s 4 suits." },
          { label: "The fifth card", work: "11 other ranks × 4 suits", value: 44, explain: "The last card must be a third rank, or the hand would be a full house." },
        ],
      };
    default:
      return {
        steps: [
          { label: "The pair", work: "13 ranks × C(4, 2) suits", value: 78, explain: "Pick the pair’s rank, then which 2 of its 4 suits." },
          { label: "Ranks of the other three", work: "C(12, 3)", value: 220, explain: "Pick three different ranks from the other 12, so nothing else pairs up." },
          { label: "A suit for each of them", work: "4 × 4 × 4", value: 64, explain: "Each of those three cards can be any of the 4 suits." },
        ],
      };
  }
}

function groups(params: GroupParams): QuantProblem {
  switch (params.type) {
    case "named-groups": {
      const { a, b, c } = params;
      const n = a + b + c;
      const first = choose(n, a);
      const second = choose(n - a, b);
      return problem(
        `named-${a}-${b}-${c}`,
        `${n} new hires are split into ${a} researchers, ${b} traders and ${c} developers. How many different ways can the split be made?`,
        q(first * second),
        "count",
        [
          {
            label: "Choose the researchers",
            work: `C(${n}, ${a})`,
            result: commas(first),
            icon: "count",
            explain: `Pick which ${a} of the ${n} people become researchers.`,
            visual: { type: "people", groups: [{ count: a, tone: "hit", label: "Researchers" }, { count: n - a, tone: "muted", label: "Not picked yet" }] },
          },
          {
            label: "Then the traders",
            work: `C(${n - a}, ${b})`,
            result: commas(second),
            icon: "count",
            explain: `Pick ${b} traders from the ${n - a} people left. Everyone still left becomes a developer, so that’s fixed.`,
            visual: {
              type: "people",
              groups: [
                { count: a, tone: "hit", label: "Researchers" },
                { count: b, tone: "alt", label: "Traders" },
                { count: c, tone: "known", label: "Developers" },
              ],
            },
          },
          {
            label: "Multiply",
            work: `${commas(first)} × ${commas(second)}`,
            icon: "multiply",
            explain: `Every choice of researchers goes with every choice of traders. The product equals {{${n}!/(${a}! × ${b}! × ${c}!)}}`,
          },
        ],
        params,
      );
    }
    case "through": {
      const { east, north, viaEast, viaNorth } = params;
      const toCorner = choose(viaEast + viaNorth, viaNorth);
      const fromCorner = choose(east - viaEast + north - viaNorth, north - viaNorth);
      return problem(
        `through-${east}-${north}-${viaEast}-${viaNorth}`,
        `You walk ${east} blocks east and ${north} blocks north on a street grid, only ever going east or north. How many routes pass through the corner ${viaEast} ${viaEast === 1 ? "block" : "blocks"} east and ${viaNorth} ${viaNorth === 1 ? "block" : "blocks"} north of the start?`,
        q(toCorner * fromCorner),
        "count",
        [
          {
            label: "Routes from the start to that corner",
            work: `C(${viaEast + viaNorth}, ${viaNorth})`,
            result: commas(toCorner),
            icon: "count",
            explain: `Reaching the corner takes ${viaEast} east and ${viaNorth} north blocks in some order: choose which ${viaNorth} go north.`,
            visual: { type: "grid-path", across: viaEast, up: Math.max(1, viaNorth), caption: "First leg: start to the corner" },
          },
          {
            label: "Routes from that corner to the end",
            work: `C(${east - viaEast + north - viaNorth}, ${north - viaNorth})`,
            result: commas(fromCorner),
            icon: "count",
            explain: `From the corner there are ${east - viaEast} east and ${north - viaNorth} north blocks left, in some order.`,
            visual: { type: "grid-path", across: Math.max(1, east - viaEast), up: Math.max(1, north - viaNorth), caption: "Second leg: corner to the end" },
          },
          {
            label: "Multiply",
            work: `${commas(toCorner)} × ${commas(fromCorner)}`,
            icon: "multiply",
            explain: "Any first leg can be followed by any second leg, so multiply.",
          },
        ],
        params,
        { type: "grid-path", across: east, up: north, caption: `${east} east and ${north} north` },
      );
    }
    case "poker": {
      const hand = POKER_HANDS.find((h) => h.id === params.hand)!;
      const { steps } = pokerSteps(hand.id);
      const total = product(steps.map((s) => s.value));
      return problem(
        `poker-${hand.id}`,
        `How many 5-card hands from a standard deck are ${hand.name}: ${hand.rule}?`,
        q(total),
        "count",
        [
          ...steps.map((s, i) => ({
            label: s.label,
            work: s.work,
            result: commas(s.value),
            icon: "count" as const,
            explain: s.explain,
            ...(i === 0 ? { visual: { type: "cards" as const, marks: [{ cards: hand.example, tone: "hit" as Tone }], caption: `One ${hand.name.replace(/^an? /, "")} hand` } } : {}),
          })),
          {
            label: "Multiply",
            work: steps.map((s) => commas(s.value)).join(" × "),
            icon: "multiply",
            explain: "Each choice goes with every other choice, so multiply them.",
          },
        ],
        params,
      );
    }
    case "range": {
      const { low, high, count, context } = params;
      const values = high - low + 1;
      const prompt =
        context === "ages"
          ? `A neighbour’s ${count} children are all different ages, in whole years. The youngest is at least ${low} and the oldest at most ${high}. How many different sets of ages are possible?`
          : `A lottery ticket is ${count} different numbers from ${low} to ${high}, and the order you pick them in doesn’t matter. How many different tickets are there?`;
      return problem(
        `range-${context}-${low}-${high}-${count}`,
        prompt,
        q(choose(values, count)),
        "count",
        [
          {
            label: "Possible values",
            work: `${low} to ${high}`,
            result: `${values}`,
            icon: "count",
            explain: `Count the whole numbers from ${low} to ${high}: ${high} − ${low} + 1.`,
            visual: { type: "number-line", min: low, max: high, shade: [{ from: low, to: high, tone: "known" }] },
          },
          {
            label: `Pick ${count} different ones`,
            work: `C(${values}, ${count})`,
            icon: "count",
            explain: "The numbers are all different and their order doesn’t matter, so this is choosing a set.",
          },
        ],
        params,
      );
    }
    case "sweets-min": {
      const { sweets, children } = params;
      const left = sweets - children;
      return problem(
        `sweets-min-${sweets}-${children}`,
        `You share ${sweets} identical sweets among ${children} children, and every child gets at least one. How many different ways can you share them?`,
        q(choose(left + children - 1, children - 1)),
        "count",
        [
          {
            label: "Give every child one sweet first",
            work: `${sweets} − ${children}`,
            result: `${left} left`,
            icon: "subtract",
            explain: "Handing out one each meets the rule. What’s left can be shared freely, with none allowed.",
          },
          {
            label: "Share the rest with dividers",
            work: `C(${left} + ${children - 1}, ${children - 1})`,
            icon: "count",
            explain: `Line up the ${left} sweets with ${children - 1} ${children - 1 === 1 ? "divider" : "dividers"}. Choosing where ${children - 1 === 1 ? "it goes" : "they go"} fixes each child’s share.`,
            visual: { type: "stars-bars", stars: Math.max(1, left), bars: children - 1, caption: `${left} sweets and ${children - 1} dividers` },
          },
        ],
        params,
      );
    }
  }
}

type MoreInclusionParams =
  | { type: "onto"; people: number; options: number; context: string }
  | { type: "capped"; parts: number; low: number; high: number; total: number; context: string }
  | { type: "derange"; n: number };

const ONTO_CONTEXTS: Record<string, { who: string; pick: string; option: string; options: string }> = {
  lunch: { who: "friends", pick: "pick one of", option: "restaurant", options: "restaurants" },
  meals: { who: "friends", pick: "choose one of", option: "mealtime", options: "mealtimes" },
  balls: { who: "balls", pick: "land in one of", option: "box", options: "boxes" },
};

function moreInclusion(params: MoreInclusionParams): QuantProblem {
  switch (params.type) {
    case "onto": {
      const { people, options, context } = params;
      const c = ONTO_CONTEXTS[context];
      const terms = Array.from({ length: options }, (_, j) => ({ j, value: choose(options, j) * (options - j) ** people }));
      const answer = terms.reduce((sum, t) => sum + (t.j % 2 ? -t.value : t.value), 0);
      const missing = (j: number) => (j === 1 ? `missing a given ${c.option}` : `missing ${j} given ${c.options}`);
      return problem(
        `onto-${context}-${people}-${options}`,
        `${people} ${c.who} each ${c.pick} ${options} ${c.options}, at random. Of all the possible results, in how many does every ${c.option} get at least one?`,
        q(answer),
        "count",
        [
          {
            label: "All possible results",
            work: `${options}${sup(people)}`,
            result: commas(terms[0].value),
            icon: "count",
            explain: `Each of the ${people} has ${options} options, so multiply.`,
          },
          ...terms.slice(1).map((t) => ({
            label: `${t.j % 2 ? "Take off" : "Add back"} results ${missing(t.j)}`,
            work: `C(${options}, ${t.j}) × ${options - t.j}${sup(people)}`,
            result: commas(t.value),
            icon: (t.j % 2 ? "subtract" : "add") as "subtract" | "add",
            explain:
              t.j === 1
                ? `Pick a ${c.option} to leave empty, and every choice falls in the other ${options - 1}.${options > 2 ? ` A result missing two ${c.options} is taken off twice this way.` : ""}`
                : `Results missing ${t.j} ${c.options} were ${t.j % 2 ? "added back too often" : "taken off too often"}, so ${t.j % 2 ? "take them off" : "add them back"} once.`,
          })),
          {
            label: `Every ${c.option} used`,
            work: terms.map((t, i) => (i === 0 ? commas(t.value) : `${t.j % 2 ? "−" : "+"} ${commas(t.value)}`)).join(" "),
            icon: "check",
            explain: options > 2 ? `Start from all results, take off those missing a ${c.option}, add back those missing two, and so on.` : `Every result either uses both ${c.options} or misses one, so take those off.`,
            visual: {
              type: "bars",
              bars: terms.map((t) => ({ label: t.j === 0 ? "All" : `Miss ${t.j}`, value: t.value, tone: (t.j % 2 ? "lose" : "win") as Tone, text: commas(t.value) })),
              caption: "Added terms in green, taken-off terms in red",
            },
          },
        ],
        params,
      );
    }
    case "capped": {
      const { parts, low, high, total, context } = params;
      const width = high - low + 1;
      const shifted = total - parts * low;
      const terms: { j: number; value: number }[] = [];
      for (let j = 0; j <= parts && shifted - j * width >= 0; j++) terms.push({ j, value: choose(parts, j) * choose(shifted - j * width + parts - 1, parts - 1) });
      const answer = terms.reduce((sum, t) => sum + (t.j % 2 ? -t.value : t.value), 0);
      const prompt =
        context === "dice"
          ? `You roll ${parts} fair ${high}-sided dice, one after another. In how many of the possible results do they add up to ${total}?`
          : `A code is ${parts} digits, each from ${low} to ${high}. How many codes have digits that add up to ${total}?`;
      const name = context === "dice" ? "die" : "digit";
      const plural = context === "dice" ? "dice" : "digits";
      return problem(
        `capped-${context}-${parts}-${low}-${high}-${total}`,
        prompt,
        q(answer),
        "count",
        [
          ...(low > 0
            ? [
                {
                  label: `Count from 0 instead of ${low}`,
                  work: `${total} − ${parts} × ${low}`,
                  result: `${shifted}`,
                  icon: "subtract" as const,
                  explain: `Take ${low} off each ${name}, so every ${name} goes from 0 to ${high - low} and the total to share is ${shifted}.`,
                },
              ]
            : []),
          {
            label: "Ignore the cap: stars and bars",
            work: `C(${shifted} + ${parts - 1}, ${parts - 1})`,
            result: commas(terms[0].value),
            icon: "count",
            explain: `Share ${shifted} among the ${parts} ${plural} with dividers, as if there were no top limit.`,
            visual: { type: "stars-bars", stars: Math.max(1, Math.min(20, shifted)), bars: parts - 1, caption: `${shifted} to share among ${parts} ${plural}` },
          },
          ...terms.slice(1).map((t) => ({
            label: `${t.j % 2 ? "Take off" : "Add back"} results with ${t.j} ${t.j > 1 ? plural : name} over the top`,
            work: `C(${parts}, ${t.j}) × C(${shifted - t.j * width} + ${parts - 1}, ${parts - 1})`,
            result: commas(t.value),
            icon: (t.j % 2 ? "subtract" : "add") as "subtract" | "add",
            explain: `Pick ${t.j === 1 ? "a" : t.j} ${t.j > 1 ? plural : name} to go over ${high - low}: give ${t.j === 1 ? "it" : "each"} ${width} first, then share the rest freely.`,
          })),
          {
            label: "Results within the limits",
            work: terms.map((t, i) => (i === 0 ? commas(t.value) : `${t.j % 2 ? "−" : "+"} ${commas(t.value)}`)).join(" "),
            icon: "check",
            explain: terms.length > 2 ? "Start from all the results, take off those with one over the top, and add back those with two, which were taken off twice." : "All the results, minus those with one over the top.",
          },
        ],
        params,
      );
    }
    case "derange": {
      const { n } = params;
      const terms = Array.from({ length: n + 1 }, (_, j) => ({ j, value: factorial(n) / factorial(j) }));
      const answer = terms.reduce((sum, t) => sum + (t.j % 2 ? -t.value : t.value), 0);
      return problem(
        `derange-${n}`,
        `${n} friends each bring a gift. The gifts are shuffled and each friend takes one at random. In how many of the possible results does nobody get their own gift back?`,
        q(answer),
        "count",
        [
          {
            label: "All the ways to hand out the gifts",
            work: `${n}!`,
            result: commas(factorial(n)),
            icon: "count",
            explain: `The gifts can go out in ${n}! orders.`,
          },
          {
            label: "Results where a chosen j people get their own",
            work: `C(${n}, j) × (${n} − j)! = ${n}! ÷ j!`,
            icon: "filter",
            explain: "Fix `j` people with their own gifts; the rest go out in any order. Inclusion–exclusion adds and takes these off in turn.",
          },
          {
            label: "Nobody gets their own",
            work: terms.map((t, i) => (i === 0 ? commas(t.value) : `${t.j % 2 ? "−" : "+"} ${commas(t.value)}`)).join(" "),
            icon: "check",
            explain: "Take off results with at least one match, add back those with two, and keep swapping the sign.",
            visual: {
              type: "bars",
              bars: terms.map((t) => ({ label: `${t.j}`, value: t.value, tone: (t.j % 2 ? "lose" : "win") as Tone, text: commas(t.value) })),
              caption: "Each bar is n! ÷ j!; green ones are added, red ones taken off",
            },
          },
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
    summary: "How to count everything you can make by choosing one thing after another: multiply the number of options at each step.",
    difficulty: "Easy",
    parts: [
      {
        type: "text",
        body: [
          "A café’s lunch deal is one of 4 sandwiches, one of 3 drinks, and either a cookie or an apple. How many different lunches can you order?",
        ],
      },
      {
        type: "check",
        prompt: "How many different lunches?",
        choices: ["9", "14", "24", "36"],
        answer: 2,
        explain: "It’s {{4 × 3 × 2 = 24}} The answer 9 adds the options, 4 + 3 + 2, which counts items on the menu rather than lunches.",
      },
      {
        type: "story",
        heading: "Build the lunch one step at a time",
        beats: [
          {
            text: "Start with the sandwich. There are 4 to choose from.",
            visual: {
              type: "tree",
              root: {
                label: "Lunch",
                children: [
                  { label: "Ham", tone: "hit" },
                  { label: "Egg", tone: "hit" },
                  { label: "Tuna", tone: "hit" },
                  { label: "Brie", tone: "hit" },
                ],
              },
            },
          },
          {
            text: "Any sandwich can go with any of the 3 drinks, so each branch splits into 3. That makes 4 × 3 = 12 sandwich and drink pairs.",
            visual: {
              type: "tree",
              root: {
                label: "Lunch",
                children: ["Ham", "Egg", "Tuna", "Brie"].map((label) => ({
                  label,
                  children: ["Tea", "Juice", "Water"].map((drink) => ({ label: drink, tone: "hit" as Tone })),
                })),
              },
            },
          },
          {
            text: "Each of those 12 pairs splits again, cookie or apple. That gives 12 × 2 = 24 lunches.",
            visual: {
              type: "slots",
              op: "×",
              slots: [
                { label: "Sandwich", value: "4", tone: "hit" },
                { label: "Drink", value: "3", tone: "hit" },
                { label: "Side", value: "2", tone: "hit" },
              ],
              result: "24",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why you multiply",
        body: [
          "Every sandwich pairs with every drink, so the pairs come in 4 groups of 3, which is 4 × 3. Every pair then pairs with every side, which doubles the count.",
          "This only works if each step has the same number of options whatever you chose before. If the egg sandwich came without a side, you’d have to count it separately.",
        ],
      },
      {
        type: "rule",
        name: "The multiplication principle",
        lines: [
          { lead: "Suppose an outcome is built in `k` steps, and step `i` can be done in `n_i` ways however the earlier steps went. Then the number of possible outcomes is", tex: "n_1 \\times n_2 \\times \\cdots \\times n_k" },
        ],
        plain: "Multiply the number of options at each step.",
        note: "The lunch has `k = 3` steps, with `n_1 = 4` sandwiches, `n_2 = 3` drinks and `n_3 = 2` sides: {{4 × 3 × 2 = 24}} Leaving something out counts as an option. If the side were cookie, apple or none, then `n_3 = 3` and the count would be {{4 × 3 × 3 = 36}}",
      },
      {
        type: "check",
        prompt: "A PIN has 4 digits, each from 0 to 9, and digits can repeat. How many PINs are there?",
        choices: ["40", "5,040", "9,999", "10,000"],
        answer: 3,
        explain:
          "Each of the 4 digits has 10 options, so the count is {{10 × 10 × 10 × 10 = 10,000}} The answer 5,040 would be right if no digit could be used twice: {{10 × 9 × 8 × 7 = 5,040}} That case is the next lesson.",
      },
      { type: "example", lead: "The same count for outfits: a shirt, then trousers, then shoes." },
      {
        type: "trap",
        body: "Adding instead of multiplying: {{4 + 3 + 2 = 9}} That’s how many items are on the menu. A lunch is one of each, and every sandwich can go with every drink and every side.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "Something is built in stages, like an outfit, a meal or a password",
          "Each position is filled on its own, like the digits of a PIN or a number plate",
          "You’re asked how many sequences of rolls, flips or answers are possible",
        ],
      },
    ],
    targetSeconds: 20,
    example: multiplyingChoices({ type: "outfits", shirts: 5, trousers: 3, shoes: 2 }),
    families: [
      {
        id: "outfits-meals",
        title: "Outfits and meals",
        generate: (random) =>
          random() < 0.5
            ? multiplyingChoices({ type: "outfits", shirts: int(random, 3, 8), trousers: int(random, 2, 5), shoes: int(random, 2, 4) })
            : multiplyingChoices({ type: "menu", starters: int(random, 2, 5), mains: int(random, 3, 8), desserts: int(random, 2, 4) }),
      },
      {
        id: "codes",
        title: "PINs and number plates",
        generate: (random) =>
          random() < 0.5
            ? multiplyingChoices({ type: "pin", digits: int(random, 3, 6) })
            : multiplyingChoices({ type: "plate", letters: int(random, 2, 3), digits: int(random, 2, 3) }),
      },
      {
        id: "sequences",
        title: "Sequences of rolls or flips",
        generate: (random) =>
          random() < 0.5
            ? multiplyingChoices({ type: "dice", dice: int(random, 2, 4), sides: pick(random, [4, 6, 8]) })
            : multiplyingChoices({ type: "coins", flips: int(random, 3, 10) }),
      },
      {
        id: "subsets",
        title: "Subsets and toppings",
        generate: (random) =>
          random() < 0.5 ? subsetsProblem({ type: "subsets", items: int(random, 3, 10) }) : subsetsProblem({ type: "toppings", items: int(random, 3, 10) }),
      },
      {
        id: "nested-subsets",
        title: "Two subsets, one inside the other",
        generate: (random) => subsetsProblem({ type: "nested", items: int(random, 2, 8) }),
      },
    ],
  },
  {
    id: "permutations",
    title: "Permutations",
    benefit: "Count arrangements when order matters",
    summary: "How to count orderings: lining people up, filling ranked places, and arranging letters when some of them repeat.",
    difficulty: "Easy",
    parts: [
      {
        type: "text",
        body: ["Five friends line up for a photo. How many different orders can they stand in?"],
      },
      {
        type: "check",
        prompt: "How many orders?",
        choices: ["15", "25", "120", "3,125"],
        answer: 2,
        explain:
          "It’s {{5 × 4 × 3 × 2 × 1 = 120}} The answer 3,125 is 5⁵, which would let the same friend stand in more than one spot.",
      },
      {
        type: "story",
        heading: "Fill the spots from left to right",
        beats: [
          {
            text: "The leftmost spot can go to any of the 5 friends.",
            visual: { type: "slots", op: "×", slots: [{ label: "1st", value: "5", tone: "hit" }] },
          },
          {
            text: "Whoever stands there can’t stand anywhere else, so the second spot has 4 options.",
            visual: {
              type: "slots",
              op: "×",
              slots: [
                { label: "1st", value: "5", tone: "hit" },
                { label: "2nd", value: "4", tone: "hit" },
              ],
            },
          },
          {
            text: "Then 3 for the third spot, 2 for the fourth, and the last friend takes the last spot. That’s 120 orders.",
            visual: {
              type: "slots",
              op: "×",
              slots: [
                { label: "1st", value: "5", tone: "hit" },
                { label: "2nd", value: "4", tone: "hit" },
                { label: "3rd", value: "3", tone: "hit" },
                { label: "4th", value: "2", tone: "hit" },
                { label: "5th", value: "1", tone: "hit" },
              ],
              result: "120",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why the options shrink",
        body: [
          "This is the multiplying rule from the last lesson with one change: each pick uses someone up, so every step has one fewer option. An ordering of things is called a permutation.",
          "The product of the whole numbers from 5 down to 1 is written `5!` and read “5 factorial”. If only some spots are filled, stop when they’re full. Choosing a president, a secretary and a treasurer from 10 people gives {{10 × 9 × 8 = 720}}",
        ],
      },
      {
        type: "rule",
        name: "Permutations",
        lines: [
          { lead: "The number of ways to arrange `n` distinct objects in a row is", tex: "n! = n \\times (n-1) \\times \\cdots \\times 2 \\times 1" },
          { lead: "The number of ways to fill `k` ordered places from `n` distinct objects is", tex: "\\frac{n!}{(n-k)!} = n \\times (n-1) \\times \\cdots \\times (n-k+1)" },
          { lead: "If the `n` objects fall into groups of identical ones, of sizes `n_1, \\dots, n_r`, the number of distinct arrangements is", tex: "\\frac{n!}{n_1!\\, n_2! \\cdots n_r!}" },
        ],
        where: ["`0! = 1`, so the second formula also holds when `k = n`"],
        plain: "Each place you fill has one fewer option than the one before. Divide out the orders of identical objects.",
        note: "Five friends in a row is `n = 5`: {{5! = 120}} A bench with room for 2 of them is `k = 2` ordered places: {{5!/(5 − 2)! = 5 × 4 = 20}}",
      },
      {
        type: "text",
        heading: "When some things are the same",
        body: [
          "Swapping two identical things doesn’t make a new order. If the two O’s in BOOK were different letters, there’d be 4! = 24 arrangements. They’re the same, so each word was counted twice, and there are 24 ÷ 2 = 12.",
        ],
      },
      {
        type: "check",
        prompt: "How many different arrangements are there of the letters in LEVEL?",
        choices: ["20", "30", "60", "120"],
        answer: 1,
        explain:
          "Told apart, the 5 letters have 5! = 120 orders. Swapping the two L’s or the two E’s gives the same word, so divide by the orders of each pair: {{5!/(2! × 2!) = 120/4 = 30}} The answer 60 only allows for one of the repeated letters.",
      },
      { type: "example", lead: "When only the top places matter, stop once they’re filled. Here 8 runners race for 3 medals." },
      {
        type: "trap",
        body: "Using 5⁵ = 3,125, as if a friend could stand in two spots at once. Once someone is placed, they’re out of the running for the other spots, so each step has one fewer option.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "Order matters: first, second and third place are different results",
          "Each thing can be used once, like people in seats or runners on a podium",
          "You’re asked how many ways to line up, seat or rank, or how many words some letters make",
        ],
      },
    ],
    targetSeconds: 30,
    example: permutations({ type: "podium", runners: 8, places: 3 }),
    families: [
      { id: "arrange-all", title: "Arranging everything in a row", generate: (random) => permutations({ type: "shelf", books: int(random, 4, 8) }) },
      {
        id: "fill-places",
        title: "Filling a few places in order",
        generate: (random) =>
          random() < 0.6
            ? permutations({ type: "podium", runners: int(random, 5, 12), places: int(random, 2, 4) })
            : permutations({ type: "pin", digits: int(random, 3, 5) }),
      },
      { id: "repeated-letters", title: "Words with repeated letters", generate: (random) => permutations({ type: "anagram", word: pick(random, ANAGRAM_WORDS) }) },
      {
        id: "side-by-side",
        title: "Two people side by side, or apart",
        generate: (random) => arrangements({ type: "together", people: int(random, 4, 8), ask: random() < 0.6 ? "together" : "apart" }),
      },
      {
        id: "no-two-together",
        title: "No two of a kind next to each other",
        generate: (random) => {
          const boys = int(random, 3, 5);
          return arrangements({ type: "gaps", boys, girls: int(random, 2, Math.min(boys + 1, 4)) });
        },
      },
      {
        id: "round-tables",
        title: "Round tables",
        generate: (random) =>
          random() < 0.5 ? permutations({ type: "table", people: int(random, 4, 8) }) : arrangements({ type: "mirror", people: int(random, 4, 8) }),
      },
      {
        id: "seat-some",
        title: "Choosing who sits at a round table",
        generate: (random) => arrangements({ type: "seat-some", from: int(random, 6, 10), seats: int(random, 3, 5), mirror: random() < 0.5 ? 1 : 0 }),
      },
      { id: "fixed-positions", title: "Line-ups with a fixed pattern", generate: (random) => arrangements({ type: "heights", students: pick(random, [4, 6, 8, 10]) }) },
    ],
  },
  {
    id: "combinations",
    title: "Combinations",
    benefit: "Count groups when order doesn’t matter",
    summary: "How to count groups where order doesn’t matter: count the ordered picks, then divide by the number of orders of each group.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: ["A club of 6 members sends 2 of them to a conference. How many different pairs could it send?"],
      },
      {
        type: "check",
        prompt: "How many pairs?",
        choices: ["12", "15", "30", "36"],
        answer: 1,
        explain: "It’s 15. The answer 30 is 6 × 5, which counts each pair twice: once with each member picked first.",
      },
      {
        type: "story",
        heading: "Count ordered picks, then remove the orders",
        beats: [
          {
            text: "Count as if order mattered. The first pick can be any of the 6 members and the second any of the other 5, giving 30 ordered picks.",
            visual: {
              type: "slots",
              op: "×",
              slots: [
                { label: "1st pick", value: "6", tone: "hit" },
                { label: "2nd pick", value: "5", tone: "hit" },
              ],
              result: "30",
            },
          },
          {
            text: "Ana then Ben is the same pair as Ben then Ana. Every pair appears twice in those 30.",
            visual: {
              type: "slots",
              op: "",
              slots: [
                { label: "1st", value: "Ana", tone: "hit" },
                { label: "2nd", value: "Ben", tone: "hit" },
                { label: "1st", value: "Ben", tone: "alt" },
                { label: "2nd", value: "Ana", tone: "alt" },
              ],
              caption: "One pair, counted twice",
            },
          },
          {
            text: "Divide by the 2 orders each pair comes in: 30 ÷ 2 = 15 pairs.",
            visual: {
              type: "slots",
              op: "",
              slots: [
                { label: "Ordered picks", value: "30", tone: "muted" },
                { label: "Orders of a pair", value: "÷ 2", tone: "known" },
              ],
              result: "15",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why you divide",
        body: [
          "A group of 3 can be picked in 3! = 6 orders, so counting ordered picks counts each group of 3 six times. In general a group of `k` can be ordered `k!` ways, and dividing by `k!` leaves each group counted once.",
          "The number of ways to choose `k` things from `n` is written `\\binom{n}{k}` and read “`n` choose `k`”. A group chosen this way, with no order, is called a combination.",
        ],
      },
      {
        type: "rule",
        name: "Combinations",
        lines: [
          { lead: "For `0 \\le k \\le n`, the number of ways to choose `k` of `n` distinct objects, when order doesn’t matter, is", tex: "\\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!}" },
          { lead: "Choosing the `k` to take is the same as choosing the `n - k` to leave, so", tex: "\\binom{n}{k} = \\binom{n}{n-k}" },
        ],
        where: ["`\\binom{n}{k}` is read “`n` choose `k`”, and is also written `C(n, k)`"],
        plain: "Count the ordered picks, then divide by the number of orders each group can be picked in.",
        note: "For the club, `n = 6` and `k = 2`: {{C(6, 2) = (6 × 5)/2! = 15}} Sending 3 of the 6 would be {{C(6, 3) = (6 × 5 × 4)/3! = 20}}",
      },
      {
        type: "check",
        prompt: "The club now sends 4 of its 6 members. How many groups of 4 could it send?",
        choices: ["15", "24", "30", "360"],
        answer: 0,
        explain:
          "Picking 4 to go is the same as picking 2 to stay home, so {{C(6, 4) = C(6, 2) = 15}} The long way gives the same: {{(6 × 5 × 4 × 3)/4! = 360/24 = 15}}",
      },
      { type: "example", lead: "The same count for packing 3 books out of 10, where each set can be packed in 3! = 6 orders." },
      {
        type: "trap",
        body: "Stopping at the ordered count. 6 × 5 = 30 treats Ana then Ben and Ben then Ana as different pairs. If the question is about a group, a team or a hand of cards, divide by the orders.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "You pick a group, team, committee or hand of cards, and the order of picking doesn’t matter",
          "The question asks how many ways to choose some things from a larger set",
          "You count paths on a grid, where a path is a choice of which steps go up",
        ],
      },
    ],
    targetSeconds: 40,
    example: combinations({ type: "choose", from: 10, pick: 3 }),
    families: [
      {
        id: "choose-a-group",
        title: "Choosing a group",
        generate: (random) =>
          random() < 0.65
            ? combinations({ type: "choose", from: int(random, 5, 12), pick: int(random, 2, 4) })
            : combinations({ type: "handshakes", people: int(random, 5, 30) }),
      },
      {
        id: "committees",
        title: "Teams with a mix of people",
        generate: (random) => {
          const men = int(random, 3, 7), women = int(random, 3, 7), size = int(random, 3, 5);
          return combinations({ type: "committee", men, women, size, picked: int(random, Math.max(1, size - men), Math.min(size - 1, women)) });
        },
      },
      {
        id: "named-groups",
        title: "Splitting people into named groups",
        generate: (random) => groups({ type: "named-groups", a: int(random, 2, 4), b: int(random, 2, 4), c: int(random, 1, 3) }),
      },
      {
        id: "distinct-numbers",
        title: "Different numbers from a range",
        generate: (random) => {
          if (random() < 0.5) {
            const low = int(random, 3, 8);
            return groups({ type: "range", low, high: low + int(random, 5, 9), count: 3, context: "ages" });
          }
          return groups({ type: "range", low: 1, high: pick(random, [10, 15, 20, 30]), count: int(random, 3, 5), context: "lottery" });
        },
      },
      {
        id: "grid-routes",
        title: "Routes on a grid",
        generate: (random) => {
          const east = int(random, 2, 6), north = int(random, 2, 5);
          if (random() < 0.5) return combinations({ type: "grid", east, north });
          return groups({ type: "through", east, north, viaEast: int(random, 1, east - 1), viaNorth: int(random, 1, north - 1) });
        },
      },
      {
        id: "sharing",
        title: "Sharing identical items",
        generate: (random) => {
          const children = int(random, 2, 4);
          return random() < 0.5
            ? combinations({ type: "sweets", sweets: int(random, 3, 10), children })
            : groups({ type: "sweets-min", sweets: int(random, children + 1, 12), children });
        },
      },
      {
        id: "card-hands",
        title: "Counting card hands",
        generate: (random) =>
          random() < 0.6
            ? groups({ type: "poker", hand: pick(random, POKER_HANDS).id })
            : random() < 0.6
              ? combinations({ type: "hearts", hearts: int(random, 1, 4) })
              : combinations(random() < 0.5 ? { type: "flush" } : { type: "red" }),
      },
    ],
  },
  {
    id: "inclusion-exclusion",
    title: "Inclusion–exclusion",
    benefit: "Count things that fall in either group",
    summary: "How to count things in either of two overlapping groups without counting the overlap twice, and how the rule extends to three groups.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: [
          "In a class of 30 students, 18 play football, 12 play tennis and 5 play both. How many students play at least one of the two?",
        ],
      },
      {
        type: "check",
        prompt: "How many play at least one sport?",
        choices: ["20", "25", "30", "35"],
        answer: 1,
        explain: "It’s 25. Adding 18 + 12 = 30 counts the 5 who play both sports twice, once in each group. Take them off once and you get 25.",
      },
      {
        type: "story",
        heading: "Count each circle, then fix the overlap",
        beats: [
          {
            text: "18 students play football. That circle includes the 5 who also play tennis.",
            visual: venn({ label: "Football", total: 18 }, { label: "Tennis", total: 12 }, 5, 5, ["a", "both"]),
          },
          {
            text: "12 play tennis, and that circle includes the same 5.",
            visual: venn({ label: "Football", total: 18 }, { label: "Tennis", total: 12 }, 5, 5, ["b", "both"]),
          },
          {
            text: "Adding 18 + 12 = 30 counts those 5 students twice, once in each circle.",
            visual: venn({ label: "Football", total: 18 }, { label: "Tennis", total: 12 }, 5, 5, ["both"]),
          },
          {
            text: "Take them off once: 30 − 5 = 25 students play at least one sport. The other 5 play neither.",
            visual: venn({ label: "Football", total: 18 }, { label: "Tennis", total: 12 }, 5, 5, ["a", "b", "both"], "25 play at least one"),
          },
        ],
      },
      {
        type: "text",
        heading: "Why it works",
        body: [
          "A student in the overlap sits inside both circles, so adding the circles counts them twice. Taking the overlap off once leaves everyone counted exactly once. The name describes the steps: include both groups, then exclude what you counted twice.",
          "With three groups, add all three, take off each of the three overlaps between two groups, then add back anyone in all three. They were added three times and taken off three times, so they need adding back once.",
        ],
      },
      {
        type: "rule",
        name: "Inclusion–exclusion",
        lines: [
          { lead: "For finite sets `A` and `B`,", tex: "|A \\cup B| = |A| + |B| - |A \\cap B|" },
          { lead: "For three sets,", tex: "\\begin{aligned} |A \\cup B \\cup C| &= |A| + |B| + |C| \\\\ &\\quad - |A \\cap B| - |A \\cap C| - |B \\cap C| \\\\ &\\quad + |A \\cap B \\cap C| \\end{aligned}" },
        ],
        where: ["`|A|` is the number of elements in `A`", "`A \\cup B` means in `A` or `B` or both, and `A \\cap B` means in both"],
        plain: "Add the sizes of the groups, then take off what was counted twice.",
        note: "For the class, `|A| = 18` play football, `|B| = 12` play tennis and `|A \\cap B| = 5` play both, so the number who play at least one is {{18 + 12 − 5 = 25}}",
      },
      {
        type: "check",
        prompt: "Of 40 people, 20 drink tea, 15 drink coffee and 10 drink neither. How many drink both?",
        choices: ["0", "5", "10", "15"],
        answer: 1,
        explain:
          "The rule works backwards too. 40 − 10 = 30 people drink at least one, so {{20 + 15 − both = 30}} That makes both equal to 5.",
      },
      { type: "example", lead: "The same count with numbers. Here the two groups are the multiples of 2 and the multiples of 3 up to 100." },
      {
        type: "trap",
        body: "Adding the two groups and stopping. 18 + 12 = 30 would mean every student in the class plays a sport, but the 5 who play both were counted twice.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The question says “or”, “at least one of” or “neither”",
          "Two groups share members, like students who play both sports",
          "You count numbers divisible by one value or another",
        ],
      },
    ],
    targetSeconds: 40,
    example: inclusionExclusion({ type: "divisible", upTo: 100, a: 2, b: 3, ask: "either" }),
    families: [
      {
        id: "two-divisors",
        title: "Numbers divisible by one or another",
        generate: (random) => {
          const [a, b] = pick(random, DIVISOR_PAIRS);
          return inclusionExclusion({ type: "divisible", upTo: pick(random, [50, 60, 100, 120, 200]), a, b, ask: random() < 0.6 ? "either" : "neither" });
        },
      },
      { id: "three-divisors", title: "Numbers divisible by 2, 3 or 5", generate: (random) => inclusionExclusion({ type: "divisible3", upTo: pick(random, [30, 50, 60, 100, 120]) }) },
      {
        id: "surveys",
        title: "Overlapping groups of people",
        generate: (random) => {
          const total = int(random, 20, 40);
          const both = int(random, 2, 8);
          const a = int(random, both + 3, Math.floor(total * 0.6));
          const b = int(random, both + 2, Math.min(total - a + both - 1, Math.floor(total * 0.6)));
          return inclusionExclusion({ type: "survey", total, a, b, both, ask: random() < 0.5 ? "either" : "neither" });
        },
      },
      { id: "card-groups", title: "Cards in either of two groups", generate: (random) => inclusionExclusion({ type: "cards", event: pick(random, CARD_OVERLAPS).id }) },
      {
        id: "every-option",
        title: "Every option gets picked",
        generate: (random) => {
          const options = int(random, 2, 4);
          return moreInclusion({ type: "onto", people: int(random, options + 1, 6), options, context: pick(random, ["lunch", "meals", "balls"]) });
        },
      },
      {
        id: "capped-sums",
        title: "Totals with a top limit",
        generate: (random) => {
          if (random() < 0.5) {
            const parts = 3, high = pick(random, [4, 6]);
            return moreInclusion({ type: "capped", parts, low: 1, high, total: int(random, high + 2, 3 * high - 2), context: "dice" });
          }
          const parts = int(random, 3, 4);
          return moreInclusion({ type: "capped", parts, low: 1, high: 9, total: int(random, 11, parts * 5 + 2), context: "digits" });
        },
      },
      { id: "nobody-own", title: "Nobody gets their own back", generate: (random) => moreInclusion({ type: "derange", n: int(random, 3, 6) }) },
    ],
  },
];
