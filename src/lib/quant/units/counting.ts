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
            explain: "A letter that appears k times can be shuffled k! ways without changing the word, so divide by that for each repeat.",
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

/** Two overlapping groups; counts are per region, and labels carry each group's total. */
function venn(
  a: { label: string; total: number },
  b: { label: string; total: number },
  both: number,
  outside: number | null,
  highlight: ("a" | "b" | "both" | "outside")[],
  caption?: string,
): QuantVisual {
  return {
    type: "venn",
    a: { label: `${a.label} (${a.total})`, count: String(a.total - both) },
    b: { label: `${b.label} (${b.total})`, count: String(b.total - both) },
    both: String(both),
    ...(outside !== null ? { outside: String(outside) } : {}),
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
            explain: `${event.both} are in both counts, so they have been counted twice.`,
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

const DIVISOR_PAIRS = [[2, 3], [2, 5], [3, 5], [3, 4], [4, 6], [2, 7], [3, 7], [6, 10]] as const;

export const COUNTING_LESSONS: QuantLessonDef[] = [
  {
    id: "multiplying-choices",
    title: "Multiplying choices",
    benefit: "Count outcomes of choices made in steps",
    idea: "When you make one choice after another, multiply the number of options at each step. An option like “no dessert” counts as one more choice.",
    difficulty: "Easy",
    intro:
      "Picture the choices as a tree. With 5 shirts there are 5 branches, and each one splits again for every pair of trousers, so the branches multiply. That’s true whatever you pick first, as long as each step has the same number of options.",
    formula: "Ways = options at step 1 × options at step 2 × …",
    cues: [
      "Something is built in steps: a shirt, then trousers, then shoes",
      "Each spot is filled separately, like the digits of a PIN",
      "The question asks “how many different” outfits, codes or sequences",
    ],
    mistake: "Adding the options (5 + 3 + 2) instead of multiplying them. Adding counts one choice; multiplying counts whole combinations.",
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
    difficulty: "Easy",
    intro:
      "An arrangement is choices in steps where each pick uses something up. The first spot has n options, the next has one fewer, and so on. That’s multiplying choices again, with a shrinking count each time.",
    formula: "Arrangements of n things = n × (n − 1) × … × 1 = n!",
    cues: [
      "Order matters: first, second and third are different",
      "Nothing can be used twice, like runners or digits that can’t repeat",
      "The question asks how many ways to arrange, line up or seat",
    ],
    mistake: "Forgetting that each pick leaves one fewer option, and using n × n × n as if things could repeat.",
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
    difficulty: "Medium",
    intro:
      "Picking books A, B, C is the same set as C, B, A. If you count ordered picks, every set shows up once for each of its k! orders. Dividing by k! leaves each set counted once.",
    formula: "C(n, k) = n × (n − 1) × … (k terms) ÷ k!",
    cues: [
      "A group, team, hand or set, where the order of picking doesn’t matter",
      "“How many ways to choose” some of a larger group",
      "Routes on a grid, or identical items shared out",
    ],
    mistake: "Not dividing by k!, which counts the same group several times, once for each order it could be picked in.",
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
    difficulty: "Medium",
    intro:
      "When two groups overlap, adding their sizes counts the shared part twice. Taking the overlap off once fixes it. For three groups, the triple overlap gets added, taken off and needs adding back once.",
    formula: "Count of A or B = count of A + count of B − count of both",
    cues: [
      "The question says “or”, “at least one of” or “neither”",
      "Two groups share members, like students who play both sports",
      "Numbers divisible by one value or another",
    ],
    mistake: "Adding the two groups and forgetting to take off the ones in both, so the overlap is counted twice.",
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
