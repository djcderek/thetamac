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

/** Subsets of `size` from `n` items with a property, listing each group of that size once. */
function subsets(n: number, size: number, keep: (members: number[]) => boolean = () => true) {
  let count = 0;
  const members: number[] = [];
  const walk = (from: number) => {
    if (members.length === size) {
      if (keep(members)) count++;
      return;
    }
    for (let i = from; i <= n - (size - members.length); i++) {
      members.push(i);
      walk(i + 1);
      members.pop();
    }
  };
  walk(0);
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

// Every ordering of 1…n, built once per n: the checks list them for many problems.
const orderCache = new Map<number, number[][]>();
function orders(n: number): number[][] {
  if (!orderCache.has(n)) orderCache.set(n, draws(faces(n), n));
  return orderCache.get(n)!;
}

function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "multiplying-choices": {
      if (p.type === "subsets" || p.type === "toppings") {
        let count = 0;
        for (let mask = 0; mask < 1 << +p.items; mask++) if (p.type === "subsets" || mask !== 0) count++;
        return count;
      }
      if (p.type === "nested") {
        // Every pair of bitmasks, keeping those where A's items are all in B.
        let count = 0;
        for (let a = 0; a < 1 << +p.items; a++) for (let b = 0; b < 1 << +p.items; b++) if ((a & b) === a) count++;
        return count;
      }
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
      if (p.type === "together") {
        // Person 1 is Ana and person 2 is Ben.
        const together = orders(+p.people).filter((o) => Math.abs(o.indexOf(1) - o.indexOf(2)) === 1).length;
        return p.ask === "together" ? together : orders(+p.people).length - together;
      }
      if (p.type === "gaps") {
        // People 1…girls are the girls; keep orders with no two girls side by side.
        const girl = (x: number) => x <= +p.girls;
        return orders(+p.boys + +p.girls).filter((o) => o.every((x, i) => i === 0 || !(girl(x) && girl(o[i - 1])))).length;
      }
      if (p.type === "mirror" || p.type === "seat-some") {
        // Every seating as a ring; make rotations (and for mirror, reflections) the same.
        const from = p.type === "mirror" ? +p.people : +p.from;
        const seats = p.type === "mirror" ? +p.people : +p.seats;
        const mirror = p.type === "mirror" || +p.mirror === 1;
        const seen = new Set<string>();
        for (const order of draws(faces(from), seats)) {
          const forms: string[] = [];
          for (const ring of mirror ? [order, [...order].reverse()] : [order]) {
            for (let r = 0; r < ring.length; r++) forms.push([...ring.slice(r), ...ring.slice(0, r)].join());
          }
          seen.add(forms.sort()[0]);
        }
        return seen.size;
      }
      if (p.type === "heights") {
        // Place students tallest first: each goes to the next free spot on the left or the right of the middle.
        const half = (+p.students - 2) / 2;
        const ways = (left: number, right: number): number =>
          left === half && right === half ? 1 : (left < half ? ways(left + 1, right) : 0) + (right < half ? ways(left, right + 1) : 0);
        return 2 * ways(0, 0);
      }
      if (p.type === "shelf") return orders(+p.books).length;
      if (p.type === "podium") return draws(faces(+p.runners), +p.places).length;
      if (p.type === "pin") return draws(faces(10), +p.digits).length;
      if (p.type === "anagram") {
        const counts = new Map<string, number>();
        for (const letter of String(p.word)) counts.set(letter, (counts.get(letter) ?? 0) + 1);
        return arrangements(counts);
      }
      // Round table: every seating, with rotations made the same by starting from person 1.
      const seen = new Set<string>();
      for (const order of orders(+p.people)) {
        const start = order.indexOf(1);
        seen.add([...order.slice(start), ...order.slice(0, start)].join());
      }
      return seen.size;
    }
    case "combinations": {
      if (p.type === "named-groups") {
        // Every way to give each person one of the three jobs, keeping the right group sizes.
        const n = +p.a + +p.b + +p.c;
        return sequences([0, 1, 2], n).filter((jobs) => jobs.filter((j) => j === 0).length === +p.a && jobs.filter((j) => j === 1).length === +p.b).length;
      }
      if (p.type === "through") {
        // Every route as a sequence of E and N steps, keeping those that visit the corner.
        const steps = +p.east + +p.north;
        let count = 0;
        for (let mask = 0; mask < 1 << steps; mask++) {
          let e = 0, n = 0, visits = +p.viaEast === 0 && +p.viaNorth === 0, ok = true;
          for (let i = 0; i < steps; i++) {
            if (mask & (1 << i)) n++;
            else e++;
            if (e === +p.viaEast && n === +p.viaNorth) visits = true;
          }
          if (e !== +p.east || n !== +p.north) ok = false;
          if (ok && visits) count++;
        }
        return count;
      }
      if (p.type === "poker") {
        const rank = (card: number) => DECK[card].rank - 1;
        const shape = (counts: number[]) => counts.filter((c) => c > 0).sort((a, b) => b - a).join();
        const wanted: Record<string, string> = { four: "4,1", full: "3,2", three: "3,1,1", "two-pair": "2,2,1", "one-pair": "2,1,1,1" };
        return hands(rank, 5, (counts) => shape(counts) === wanted[p.hand as string], 13);
      }
      if (p.type === "range") return subsets(+p.high - +p.low + 1, +p.count);
      if (p.type === "sweets-min") {
        const share = (sweets: number, children: number): number =>
          children === 1 ? (sweets >= 1 ? 1 : 0) : Array.from({ length: sweets }, (_, give) => give + 1).reduce((acc, give) => acc + share(sweets - give, children - 1), 0);
        return share(+p.sweets, +p.children);
      }
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
      if (p.type === "onto") return sequences(faces(+p.options), +p.people).filter((picks) => new Set(picks).size === +p.options).length;
      if (p.type === "capped") {
        const values = Array.from({ length: +p.high - +p.low + 1 }, (_, i) => +p.low + i);
        return sequences(values, +p.parts).filter((xs) => xs.reduce((a, b) => a + b, 0) === +p.total).length;
      }
      if (p.type === "derange") return orders(+p.n).filter((o) => o.every((x, i) => x !== i + 1)).length;
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
