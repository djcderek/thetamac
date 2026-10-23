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

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "equally-likely": {
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
      if (p.type === "sixes") return share(sequences(faces(6), +p.rolls), (rolls) => rolls.includes(6));
      if (p.type === "low") return share(sequences(faces(6), +p.rolls), (rolls) => rolls.some((r) => r <= 2));
      if (p.type === "heads") return share(sequences(["H", "T"], +p.flips), (flips) => flips.includes("H"));
      return share(draws(DECK.map((c) => c.rank), +p.cards), (hand) => hand.includes(1));
    }
    case "or-events": {
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
