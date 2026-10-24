import test from "node:test";
import { BASICS_LESSONS } from "./basics";
import { DECK, type QuantProblem } from "../build";
import { checkAgainstIndependentWorking, draws, faces, sequences, share } from "../test-helpers";

/** Hearts in a dealt hand, by dealing card by card and tracking how many hearts are out (no counting formulas). */
function heartsDealt(cards: number, hearts: number) {
  let dist = new Map([[0, 1]]);
  for (let dealt = 0; dealt < cards; dealt++) {
    const next = new Map<number, number>();
    for (const [out, chance] of dist) {
      const left = 52 - dealt, heartsLeft = 13 - out;
      next.set(out + 1, (next.get(out + 1) ?? 0) + (chance * heartsLeft) / left);
      next.set(out, (next.get(out) ?? 0) + (chance * (left - heartsLeft)) / left);
    }
    dist = next;
  }
  return dist.get(hearts) ?? 0;
}

/** A team of `size` with `picked` women, by walking every subset of the people. */
function teamShare(men: number, women: number, size: number, picked: number) {
  const people = [...Array(women).fill("w"), ...Array(men).fill("m")];
  const teams: string[][] = [];
  for (let mask = 0; mask < 1 << people.length; mask++) {
    const team = people.filter((_, i) => mask & (1 << i));
    if (team.length === size) teams.push(team);
  }
  return share(teams, (team) => team.filter((x) => x === "w").length === picked);
}

/** Two independent chances as tickets: of every pair of tickets 0–99, the share where both (or either) win. */
function tickets(aPercent: number, bPercent: number, want: "both" | "either") {
  const all = sequences(faces(100), 2);
  return share(all, ([x, y]) => (want === "both" ? x <= aPercent && y <= bPercent : x <= aPercent || y <= bPercent));
}

/** Hands by rank shape, built rank by rank (0–4 cards of each, C(4, k) suit choices), with no hand formulas. */
function pokerShares() {
  const suitWays = [1, 4, 6, 4, 1];
  let shapes = new Map<string, number>([["", 1]]);
  for (let rank = 0; rank < 13; rank++) {
    const next = new Map<string, number>();
    for (const [shape, ways] of shapes) {
      const used = shape ? shape.split(",").map(Number).reduce((a, b) => a + b, 0) : 0;
      for (let k = 0; k <= 4 && used + k <= 5; k++) {
        const key = k === 0 ? shape : [...(shape ? shape.split(",") : []), String(k)].map(Number).sort((a, b) => b - a).join(",");
        next.set(key, (next.get(key) ?? 0) + ways * suitWays[k]);
      }
    }
    shapes = next;
  }
  const five = [...shapes].filter(([shape]) => shape.split(",").map(Number).reduce((a, b) => a + b, 0) === 5);
  const total = five.reduce((sum, [, ways]) => sum + ways, 0);
  const of = (shape: string) => (shapes.get(shape) ?? 0) / total;
  return { three: of("3,1,1"), "two-pair": of("2,2,1"), "one-pair": of("2,1,1,1"), "all-ranks": of("1,1,1,1,1") } as Record<string, number>;
}

/** Strings of `length` from `size` values with no repeats, counted by a used-values bitmask table. */
function distinctStrings(size: number, length: number) {
  let ways = new Map<number, number>([[0, 1]]);
  for (let step = 0; step < length; step++) {
    const next = new Map<number, number>();
    for (const [mask, n] of ways) for (let v = 0; v < size; v++) if (!(mask & (1 << v))) next.set(mask | (1 << v), (next.get(mask | (1 << v)) ?? 0) + n);
    ways = next;
  }
  return [...ways.values()].reduce((a, b) => a + b, 0);
}

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "equally-likely": {
      if (p.type === "mock-drum") return share(faces(+p.balls), (n) => (p.ask === "least" ? n >= +p.cut : n <= +p.cut));
      if (p.type === "mock-tiles") {
        const pairs = sequences(faces(+p.tiles), 2);
        if (p.ask === "same") return share(pairs, ([a, b]) => a === b);
        return share(pairs, ([a, b]) => (p.ask === "exactly" ? a + b === +p.total : a + b >= +p.total));
      }
      if (p.type === "increasing") return share(sequences(faces(+p.sides), +p.rolls), (r) => r.every((x, i) => i === 0 || x > r[i - 1]));
      if (p.type === "bigger-die") return share(sequences(faces(Math.max(+p.big, +p.small)), 2).filter(([a, b]) => a <= +p.big && b <= +p.small), ([a, b]) => a > b);
      if (p.type === "poker-chance") return pokerShares()[p.hand as string];
      if (p.type === "shuffle-order") {
        // A small deck: the named cards (1…k), the target (0), and two other cards (−1, −2). Every order of it.
        const named = { "ace-before-king": 1, "black-aces": 2, "royals-before-joker": 3, "all-aces": 4 }[p.order as string]!;
        const cards = [0, -1, -2, ...faces(named)];
        return share(draws(cards, cards.length), (order) => faces(named).every((c) => order.indexOf(c) < order.indexOf(0)));
      }
      if (p.type === "exact-faces") {
        const each = +p.rolls / +p.sides;
        return share(sequences(faces(+p.sides), +p.rolls), (r) => faces(+p.sides).every((f) => r.filter((x) => x === f).length === each));
      }
      if (p.type === "compare") {
        const pairs = sequences(faces(+p.sides), 2);
        return p.ask === "less" ? share(pairs, ([a, b]) => a < b) : share(pairs, ([a, b]) => Math.abs(a - b) === +p.gap);
      }
      if (p.type === "hearts") return heartsDealt(+p.cards, +p.hearts);
      if (p.type === "team") return teamShare(+p.men, +p.women, +p.size, +p.picked);
      if (p.type === "exactly" || p.type === "at-least" || p.type === "double") {
      const pairs = sequences(faces(6), 2);
      if (p.type === "double") return share(pairs, ([a, b]) => a === b);
      return share(pairs, ([a, b]) => (p.type === "exactly" ? a + b === +p.total : a + b >= +p.total));
      }
      if (p.type === "die") return share(faces(+p.sides), (f) => f >= +p.atLeast);
      const counts: Record<string, number> = {
        heart: 13, face: 12, ace: 4, "heart-or-king": 16, "red-face": 6, "spade-or-ace": 16, "two-to-four": 12,
        "red-or-face": 32, "club-or-face": 22, "black-king": 2,
      };
      return counts[p.event as string] / 52;
    }
    case "complements": {
      if (p.type === "mock-spins") return share(sequences(faces(+p.sections), +p.spins), (spins) => spins.some((s) => s <= +p.gold));
      if (p.type === "mock-shared") {
        const different = distinctStrings(+p.size, +p.people) / sequences(faces(+p.size), +p.people).length;
        return p.ask === "share" ? 1 - different : different;
      }
      const sizes: Record<string, number> = { months: 12, weekdays: 7, dice: 6 };
      if (p.type === "shared") {
        const size = sizes[p.things as string];
        const different = distinctStrings(size, +p.people) / size ** +p.people;
        return p.ask === "share" ? 1 - different : different;
      }
      if (p.type === "yours") {
        // Chance someone has matched by each person, one person at a time.
        const size = sizes[p.things as string];
        let matched = 0;
        for (let i = 0; i < +p.people; i++) matched += (1 - matched) / size;
        return matched;
      }
      if (p.type === "sixes") return share(sequences(faces(6), +p.rolls), (rolls) => rolls.includes(6));
      if (p.type === "low") return share(sequences(faces(6), +p.rolls), (rolls) => rolls.some((r) => r <= 2));
      if (p.type === "heads") return share(sequences(["H", "T"], +p.flips), (flips) => flips.includes("H"));
      // Deal card by card, tracking how many aces are out, then take the chance at least one is.
      let dist = new Map([[0, 1]]);
      for (let dealt = 0; dealt < +p.cards; dealt++) {
        const next = new Map<number, number>();
        for (const [out, chance] of dist) {
          const left = 52 - dealt, acesLeft = 4 - out;
          next.set(out + 1, (next.get(out + 1) ?? 0) + (chance * acesLeft) / left);
          next.set(out, (next.get(out) ?? 0) + (chance * (left - acesLeft)) / left);
        }
        dist = next;
      }
      return 1 - (dist.get(0) ?? 0);
    }
    case "or-events": {
      if (p.type === "mock-or-percent") return tickets(+p.aPercent, +p.bPercent, "either");
      if (p.type === "mock-or-ticket") {
        const tests: Record<string, (n: number) => boolean> = {
          "even-three": (n) => n % 2 === 0 || n % 3 === 0,
          "three-five": (n) => n % 3 === 0 || n % 5 === 0,
          "four-six": (n) => n % 4 === 0 || n % 6 === 0,
          "odd-five": (n) => n % 2 === 1 || n % 5 === 0,
          "square-even": (n) => [1, 4, 9, 16, 25, 36, 49].includes(n) || n % 2 === 0,
        };
        return share(faces(+p.tickets), tests[p.event as string]);
      }
      if (p.type === "three") {
        // Every triple of tickets 1–100, counting those where at least one wins.
        let wins = 0;
        for (let x = 1; x <= 100; x++) for (let y = 1; y <= 100; y++) for (let z = 1; z <= 100; z++) if (x <= +p.a || y <= +p.b || z <= +p.c) wins++;
        return wins / 1e6;
      }
      if (p.type === "independent") return tickets(+p.aPercent, +p.bPercent, "either");
      if (p.type === "dice") {
        const tests: Record<string, (x: number, y: number) => boolean> = {
          "six-ten": (x, y) => x === 6 || x + y >= 10,
          "one-seven": (x, y) => x === 1 || x + y === 7,
          "double-eight": (x, y) => x === y || x + y === 8,
          "even-high": (x, y) => (x + y) % 2 === 0 || x >= 5,
          "both-low-two": (x, y) => (x <= 3 && y <= 3) || y === 2,
        };
        return share(sequences(faces(6), 2), ([x, y]) => tests[p.event as string](x, y));
      }
      const tests: Record<string, (c: (typeof DECK)[number]) => boolean> = {
        "spade-face": (c) => c.suit === "spades" || c.rank >= 11,
        "red-ace": (c) => c.suit === "hearts" || c.suit === "diamonds" || c.rank === 1,
        "king-queen": (c) => c.rank === 12 || c.rank === 13,
        "club-low": (c) => c.suit === "clubs" || [2, 3, 4].includes(c.rank),
        "heart-high": (c) => c.suit === "hearts" || [1, 10, 11, 12, 13].includes(c.rank),
        "black-even": (c) => c.suit === "clubs" || c.suit === "spades" || [2, 4, 6, 8, 10].includes(c.rank),
      };
      return share(DECK, tests[p.event as string]);
    }
    case "and-events": {
      if (p.type === "mock-stages") {
        // The chance of failing somewhere, stage by stage: a new failure can only come from runs still clean.
        const each = +p.percent / 100;
        let failed = 0;
        for (let stage = 0; stage < +p.stages; stage++) failed += (1 - failed) * (1 - each);
        return 1 - failed;
      }
      if (p.type === "mock-draws") {
        const box = [...Array(+p.good).fill("good"), ...Array(+p.bad).fill("bad")].map((kind, i) => ({ kind, i }));
        return share(draws(box, +p.draws), (drawn) => drawn.every((x) => x.kind === "good"));
      }
      if (p.type === "all-tries") {
        // The distribution of successes, built one try at a time; take the chance all succeed.
        const each = +p.percent / 100;
        let dist = [1];
        for (let t = 0; t < +p.tries; t++) dist = [...dist, 0].map((_, k) => (k < dist.length ? dist[k] * (1 - each) : 0) + (k > 0 ? dist[k - 1] * each : 0));
        return dist[+p.tries];
      }
      if (p.type === "three-cards") {
        const tests: Record<string, (c: (typeof DECK)[number]) => boolean> = {
          red: (c) => c.suit === "hearts" || c.suit === "diamonds",
          black: (c) => c.suit === "spades" || c.suit === "clubs",
          hearts: (c) => c.suit === "hearts",
          spades: (c) => c.suit === "spades",
          low: (c) => c.rank >= 2 && c.rank <= 9,
        };
        return share(draws(DECK, 3), (hand) => hand.every(tests[p.event as string]));
      }
      if (p.type === "independent") return tickets(+p.aPercent, +p.bPercent, "both");
      if (p.type === "bag") {
        const bag = [...Array(+p.red).fill("r"), ...Array(+p.blue).fill("b")].map((colour, i) => ({ colour, i }));
        return share(draws(bag, +p.draws), (drawn) => drawn.every((m) => m.colour === "r"));
      }
      const tests: Record<string, (c: (typeof DECK)[number]) => boolean> = {
        aces: (c) => c.rank === 1,
        hearts: (c) => c.suit === "hearts",
        face: (c) => c.rank >= 11,
        red: (c) => c.suit === "hearts" || c.suit === "diamonds",
      };
      return share(draws(DECK, 2), (pair) => pair.every(tests[p.event as string]));
    }
  }
  throw new Error(`No check for ${lessonId}`);
}

test("basics answers agree with an independent working", () => {
  checkAgainstIndependentWorking(BASICS_LESSONS, independentAnswer);
});
