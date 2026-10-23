import test from "node:test";
import { COUNTING_LESSONS } from "./counting";
import { DECK, type QuantProblem } from "../build";
import { checkAgainstIndependentWorking, draws, faces, sequences } from "../test-helpers";

/** Distinct orderings of a multiset, by building them one letter at a time (no factorials). */
function arrangements(counts: Map<string, number>, memo = new Map<string, number>()): number {
  const key = [...counts].map(([letter, n]) => `${letter}${n}`).join();
  if (memo.has(key)) return memo.get(key)!;
  const left = [...counts.values()].reduce((a, b) => a + b, 0);
  if (left === 0) return 1;
  let total = 0;
  for (const [letter, n] of counts) {
    if (n === 0) continue;
    const next = new Map(counts);
    next.set(letter, n - 1);
    total += arrangements(next, memo);
  }
  memo.set(key, total);
  return total;
}

/** Subsets of `size` from `n` items with a property, by walking every bitmask. */
function subsets(n: number, size: number, keep: (members: number[]) => boolean = () => true) {
  let count = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    const members: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) members.push(i);
    if (members.length === size && keep(members)) count++;
  }
  return count;
}

/** Ways to deal an unordered hand from groups, by a Pascal-style table over the cards. */
function hands(groupOf: (cardIndex: number) => number, cards: number, wanted: (counts: number[]) => boolean, groups: number) {
  // ways[size][counts…] as a map keyed by the per-group counts.
  let ways = new Map<string, number>([[Array(groups).fill(0).join(), 1]]);
  for (let card = 0; card < 52; card++) {
    const next = new Map(ways);
    for (const [key, n] of ways) {
      const counts = key.split(",").map(Number);
      if (counts.reduce((a, b) => a + b, 0) >= cards) continue;
      counts[groupOf(card)]++;
      const k = counts.join();
      next.set(k, (next.get(k) ?? 0) + n);
    }
    ways = next;
  }
  let total = 0;
  for (const [key, n] of ways) {
    const counts = key.split(",").map(Number);
    if (counts.reduce((a, b) => a + b, 0) === cards && wanted(counts)) total += n;
  }
  return total;
}

/** Strings of the given per-position option counts, counted by adding one position at a time. */
function strings(options: number[]) {
  let count = 1;
  for (const n of options) {
    let next = 0;
    for (let i = 0; i < n; i++) next += count;
    count = next;
  }
  return count;
}

function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "multiplying-choices": {
      if (p.type === "outfits") return countTuples([+p.shirts, +p.trousers, +p.shoes]);
      if (p.type === "pin") return strings(Array(+p.digits).fill(10));
      if (p.type === "plate") return strings([...Array(+p.letters).fill(26), ...Array(+p.digits).fill(10)]);
      if (p.type === "dice") return sequences(faces(+p.sides), +p.dice).length;
      if (p.type === "coins") return sequences(["H", "T"], +p.flips).length;
      // Menu: list every meal, with 0 standing for "none".
      let meals = 0;
      for (let s = 0; s <= +p.starters; s++) for (let m = 1; m <= +p.mains; m++) for (let d = 0; d <= +p.desserts; d++) meals++;
      return meals;
    }
    case "permutations": {
      if (p.type === "shelf") return draws(faces(+p.books), +p.books).length;
      if (p.type === "podium") return draws(faces(+p.runners), +p.places).length;
      if (p.type === "pin") return draws(faces(10), +p.digits).length;
      if (p.type === "anagram") {
        const counts = new Map<string, number>();
        for (const letter of String(p.word)) counts.set(letter, (counts.get(letter) ?? 0) + 1);
        return arrangements(counts);
      }
      // Round table: every seating, with rotations made the same by starting from person 1.
      const seen = new Set<string>();
      for (const order of draws(faces(+p.people), +p.people)) {
        const start = order.indexOf(1);
        seen.add([...order.slice(start), ...order.slice(0, start)].join());
      }
      return seen.size;
    }
    case "combinations": {
      if (p.type === "choose") return subsets(+p.from, +p.pick);
      if (p.type === "committee") {
        // People 0 … women−1 are the women.
        return subsets(+p.men + +p.women, +p.size, (members) => members.filter((i) => i < +p.women).length === +p.picked);
      }
      if (p.type === "grid") {
        // Routes to each corner = routes from the west + routes from the south.
        const routes = Array.from({ length: +p.east + 1 }, () => Array(+p.north + 1).fill(0));
        for (let e = 0; e <= +p.east; e++) {
          for (let n = 0; n <= +p.north; n++) routes[e][n] = e === 0 && n === 0 ? 1 : (e > 0 ? routes[e - 1][n] : 0) + (n > 0 ? routes[e][n - 1] : 0);
        }
        return routes[+p.east][+p.north];
      }
      if (p.type === "sweets") {
        // Every way to give each child a number of sweets adding up to the total.
        const share = (sweets: number, children: number): number =>
          children === 1 ? 1 : Array.from({ length: sweets + 1 }, (_, give) => share(sweets - give, children - 1)).reduce((a, b) => a + b, 0);
        return share(+p.sweets, +p.children);
      }
      if (p.type === "handshakes") {
        let shakes = 0;
        for (let i = 0; i < +p.people; i++) for (let j = i + 1; j < +p.people; j++) shakes++;
        return shakes;
      }
      const suit = (card: number) => ["hearts", "diamonds", "clubs", "spades"].indexOf(DECK[card].suit);
      if (p.type === "hearts") return hands((card) => (suit(card) === 0 ? 0 : 1), 5, ([h]) => h === +p.hearts, 2);
      if (p.type === "flush") return hands(suit, 5, (counts) => counts.includes(5), 4);
      return hands((card) => (suit(card) <= 1 ? 0 : 1), 5, ([red]) => red === 5, 2);
    }
    case "inclusion-exclusion": {
      const upTo = faces(+p.upTo || 0);
      if (p.type === "divisible") {
        const either = upTo.filter((n) => n % +p.a === 0 || n % +p.b === 0).length;
        return p.ask === "either" ? either : upTo.length - either;
      }
      if (p.type === "divisible3") return upTo.filter((n) => n % 2 === 0 || n % 3 === 0 || n % 5 === 0).length;
      if (p.type === "survey") {
        // Lay the people out: the first `a` do A, and B is a run overlapping it by `both`.
        const people = faces(+p.total).map((i) => i - 1);
        const inA = (i: number) => i < +p.a;
        const inB = (i: number) => i >= +p.a - +p.both && i < +p.a - +p.both + +p.b;
        const either = people.filter((i) => inA(i) || inB(i)).length;
        return p.ask === "either" ? either : people.length - either;
      }
      const tests: Record<string, (c: (typeof DECK)[number]) => boolean> = {
        "heart-face": (c) => c.suit === "hearts" || c.rank >= 11,
        "red-ace": (c) => c.suit === "hearts" || c.suit === "diamonds" || c.rank === 1,
        "spade-low": (c) => c.suit === "spades" || (c.rank >= 2 && c.rank <= 5),
        "black-king": (c) => c.suit === "spades" || c.suit === "clubs" || c.rank === 13,
        "club-high": (c) => c.suit === "clubs" || c.rank >= 10 || c.rank === 1,
      };
      return DECK.filter(tests[p.event as string]).length;
    }
  }
  throw new Error(`No check for ${lessonId}`);
}

/** Every tuple with one pick from each group, counted by listing them. */
function countTuples(sizes: number[]): number {
  let tuples: number[][] = [[]];
  for (const size of sizes) tuples = tuples.flatMap((t) => faces(size).map((v) => [...t, v]));
  return tuples.length;
}

test("counting answers agree with an independent working", () => {
  checkAgainstIndependentWorking(COUNTING_LESSONS, independentAnswer, { samples: { permutations: 120 } });
});
