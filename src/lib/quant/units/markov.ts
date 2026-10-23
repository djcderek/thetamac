import {
  add,
  div,
  formatDecimal,
  formatDollars,
  formatFraction,
  formatResult,
  mul,
  pow,
  q,
  sub,
  value,
  type Rational,
} from "../rational";
import { DIE_SIDES, frac, int, pick, problem, sup, type QuantLessonDef, type QuantProblem } from "../build";

// ─── Collecting every type ───────────────────────────────────────────────────────────────

const COLLECTIONS: { id: string; sides: number; prompt: string }[] = [
  {
    id: "coin",
    sides: 2,
    prompt: "You flip a fair coin until you've seen both heads and tails. How many flips do you expect it to take?",
  },
  ...[3, 4, 6, 8, 10, 12].map((sides) => ({
    id: `die-${sides}`,
    sides,
    prompt: `You roll a fair ${sides}-sided die until every face has come up at least once. How many rolls do you expect it to take?`,
  })),
  {
    id: "suits",
    sides: 4,
    prompt: "You draw a card, note its suit, and put it back, until you've seen all four suits. How many draws do you expect it to take?",
  },
  ...[3, 4, 5, 6].map((sides) => ({
    id: `prizes-${sides}`,
    sides,
    prompt: `Each cereal box holds one of ${sides} toys, all equally likely. How many boxes do you expect to open to get every toy?`,
  })),
  {
    id: "weekdays",
    sides: 7,
    prompt:
      "Each person you meet is equally likely to be born on any day of the week. How many people do you expect to meet before you've met someone born on every day?",
  },
];

function collectThemAll(params: { collection: string }): QuantProblem {
  const collection = COLLECTIONS.find((c) => c.id === params.collection)!;
  const n = collection.sides;
  let expected = q(0);
  for (let k = 1; k <= n; k++) expected = add(expected, q(n, k));
  const harmonic =
    n <= 6 ? Array.from({ length: n }, (_, i) => (i === 0 ? "1" : `1/${i + 1}`)).join(" + ") : `1 + 1/2 + … + 1/${n}`;
  return problem(
    `collect-${collection.id}`,
    collection.prompt,
    expected,
    "number",
    [
      { label: `With k of the ${n} seen, a new one takes`, work: `${n} ÷ (${n} − k) tries on average`, result: "" },
      { label: `Add the waits for k = 0 to ${n - 1}`, work: `${n} × (${harmonic})` },
    ],
    { collection: collection.id, sides: n },
  );
}

// ─── Patterns in a row ───────────────────────────────────────────────────────────────────

/** Lengths k where the pattern's first k symbols match its last k (the whole pattern counts). */
export function patternOverlaps(pattern: string[]) {
  return Array.from({ length: pattern.length }, (_, i) => i + 1).filter((k) =>
    pattern.slice(0, k).every((symbol, i) => symbol === pattern[pattern.length - k + i]),
  );
}

type PatternParams =
  | { type: "coin" | "die"; pattern: string }
  | { type: "biased"; pattern: string; headsN: number; headsD: number };

function patternWait(params: PatternParams): QuantProblem {
  const symbols = params.pattern.split(" ");
  const overlaps = patternOverlaps(symbols);
  const shown = (k: number) => symbols.slice(0, k).join(" ");
  const pieces = overlaps.map(shown).join(", ");

  if (params.type === "biased") {
    const heads = q(params.headsN, params.headsD);
    const tails = sub(q(1), heads);
    const chanceOf = (symbol: string) => (symbol === "H" ? heads : tails);
    // Expected wait: 1 ÷ P(piece), summed over the pieces where the start matches the end.
    const expected = overlaps.reduce((sum, k) => {
      const chance = symbols.slice(0, k).reduce((product, s) => mul(product, chanceOf(s)), q(1));
      return add(sum, div(q(1), chance));
    }, q(0));
    const pieceChance = (k: number) => {
      const factors = symbols.slice(0, k).map((s) => formatFraction(chanceOf(s)));
      return factors.length === 1 ? factors[0] : `(${factors.join(" × ")})`;
    };
    return problem(
      `pattern-biased-${params.headsN}-${params.headsD}-${symbols.join("")}`,
      `A coin lands heads with chance ${formatFraction(heads)}. You flip it until the last ${symbols.length} flips are ${params.pattern}. How many flips do you expect it to take?`,
      expected,
      "number",
      [
        { label: "Pieces where the start matches the end", work: pieces, result: "" },
        { label: "Add 1 ÷ the chance of each piece", work: overlaps.map((k) => `1 ÷ ${pieceChance(k)}`).join(" + ") },
      ],
      params,
    );
  }

  const base = params.type === "coin" ? 2 : 6;
  const expected = overlaps.reduce((sum, k) => sum + base ** k, 0);
  const prompt =
    params.type === "coin"
      ? `You flip a fair coin until the last ${symbols.length} flips are ${params.pattern}. How many flips do you expect it to take?`
      : `You roll a fair die until the last ${symbols.length} rolls are ${params.pattern}. How many rolls do you expect it to take?`;
  return problem(
    `pattern-${params.type}-${symbols.join("")}`,
    prompt,
    q(expected),
    "number",
    [
      { label: "Pieces where the start matches the end", work: pieces, result: "" },
      {
        // A piece of length k has chance 1 ÷ baseᵏ, so 1 ÷ its chance is baseᵏ.
        label: "Add 1 ÷ the chance of each piece",
        work: overlaps.map((k) => `${base}${sup(k)}`).join(" + "),
      },
    ],
    params,
  );
}

const COIN_PATTERNS = ["H H", "H T", "T T", "H H H", "H H T", "H T H", "H T T", "T H H", "H H H H", "H T H T", "H H T H", "H T T H"];
const DIE_PATTERNS = ["6 6", "6 1", "6 6 6", "6 1 6", "1 2 3"];
const BIASED_PATTERNS = ["T H", "H T", "H H", "T T", "H T H", "H H T", "H H H"];
const BIASED_HEADS = [[2, 3], [1, 3], [3, 4], [1, 4], [3, 5]] as const;

// ─── Random walks ────────────────────────────────────────────────────────────────────────

type WalkParams = {
  start: number;
  target: number;
  winN: number;
  winD: number;
  /** reach / broke: the chance of each end. bets: the average number of fair bets. walk: steps of a ±1 walk. */
  ask: "reach" | "broke" | "bets" | "walk";
};

function randomWalk(params: WalkParams): QuantProblem {
  const { start, target, ask } = params;

  if (ask === "walk") {
    // A walk from 0 to +up or −down is a fair game from $down to $(up + down).
    const down = start, up = target - start;
    return problem(
      `walk-${up}-${down}`,
      `A token starts at 0. Each turn it moves 1 step left or right with equal chance. How many turns do you expect until it reaches +${up} or −${down}?`,
      q(up * down),
      "number",
      [{ label: "Steps to the right end × steps to the left end", work: `${up} × ${down}` }],
      params,
    );
  }

  if (ask === "bets") {
    return problem(
      `bets-${start}-${target}`,
      `You have $${start} and bet $1 at a time on fair coin flips. You stop when you reach $${target} or go broke. How many bets do you expect to make?`,
      q(start * (target - start)),
      "number",
      [{ label: "Fair bets: start × (target − start)", work: `${start} × (${target} − ${start})` }],
      params,
    );
  }

  const win = q(params.winN, params.winD);
  const fair = win.n * 2 === win.d;
  const chanceText = fair ? "fair coin flips" : `bets that each win with chance ${formatFraction(win)}`;
  const prompt = `You have $${start} and bet $1 at a time on ${chanceText}. You stop when you reach $${target} or go broke. What's the chance you ${ask === "reach" ? `reach $${target}` : "go broke"}?`;
  let reach: Rational;
  const steps: { label: string; work: string; result?: string }[] = [];
  if (fair) {
    reach = q(start, target);
    steps.push({ label: "Fair bets: start ÷ target", work: `${start} ÷ ${target}`, result: formatFraction(reach) });
  } else {
    const r = div(sub(q(1), win), win);
    reach = div(sub(pow(r, start), q(1)), sub(pow(r, target), q(1)));
    steps.push({
      label: "r = lose chance ÷ win chance",
      work: `${formatFraction(sub(q(1), win))} ÷ ${formatFraction(win)}`,
      result: formatFraction(r),
    });
    steps.push({ label: `Chance to reach $${target}`, work: `(r${sup(start)} − 1) ÷ (r${sup(target)} − 1)`, result: formatFraction(reach) });
  }
  if (ask === "broke") steps.push({ label: "Chance to go broke", work: `1 − ${formatFraction(reach)}` });
  return problem(
    `ruin-${start}-${target}-${params.winN}-${params.winD}-${ask}`,
    prompt,
    ask === "reach" ? reach : sub(q(1), reach),
    "probability",
    steps,
    params,
  );
}

const RUIN_ODDS = [[1, 2], [1, 2], [2, 5], [3, 5], [1, 3], [2, 3], [9, 20]] as const;

// ─── Optimal stopping ────────────────────────────────────────────────────────────────────

export function rerollValue(sides: number, rerolls: number): Rational {
  let worth = q(sides + 1, 2);
  for (let i = 0; i < rerolls; i++) {
    // Keep a face only if it beats rolling again.
    let total = q(0);
    for (let face = 1; face <= sides; face++) total = add(total, value(q(face)) > value(worth) ? q(face) : worth);
    worth = div(total, q(sides));
  }
  return worth;
}

/** A uniform draw from 0 to 1 with `redraws` chances to draw again: keep x when it beats going on. */
export function redrawValue(redraws: number): Rational {
  let worth = q(1, 2);
  // Keeping above c is worth (1 − c²)/2 + c × c = (1 + c²)/2.
  for (let i = 0; i < redraws; i++) worth = div(add(q(1), mul(worth, worth)), q(2));
  return worth;
}

type StoppingParams = { type: "die"; sides: number; rerolls: number } | { type: "uniform"; redraws: number; scale: 1 | 100 };

function optimalStopping(params: StoppingParams): QuantProblem {
  if (params.type === "uniform") return redrawGame(params);
  const { sides, rerolls } = params;
  const fresh = rerollValue(sides, rerolls - 1);
  const keepFrom = Math.floor(value(fresh)) + 1;
  const keepCount = sides - keepFrom + 1;
  const keptAverage = q(keepFrom + sides, 2);
  const prompt =
    rerolls === 1
      ? `Roll a fair ${sides}-sided die and be paid the result in dollars. After the first roll you may roll once more, but then you must keep the second. Playing well, what's the game worth?`
      : `Roll a fair ${sides}-sided die and be paid the result in dollars. You may reroll up to twice, keeping the last roll. Playing well, what's the game worth?`;
  return problem(
    `reroll-${sides}-${rerolls}`,
    prompt,
    rerollValue(sides, rerolls),
    "dollars",
    [
      {
        label: rerolls === 1 ? "A fresh roll is worth" : "Rerolling is worth",
        work: rerolls === 1 ? `(1 + ${sides}) ÷ 2` : `the one-reroll game`,
        result: formatDollars(fresh),
      },
      {
        label: `Keep ${keepFrom} or more, since they beat ${formatDollars(fresh)}`,
        work: `${keepCount} of ${sides} faces, averaging ${formatResult(keptAverage, "number")}`,
      },
      {
        label: "The game is worth",
        work: `${frac(keepCount, sides)} × ${formatResult(keptAverage, "number")} + ${frac(sides - keepCount, sides)} × ${formatResult(fresh, "number")}`,
      },
    ],
    params,
  );
}

function redrawGame(params: { type: "uniform"; redraws: number; scale: 1 | 100 }): QuantProblem {
  const { redraws, scale } = params;
  const money = scale === 100;
  const fresh = redrawValue(redraws - 1);
  const keepShare = sub(q(1), fresh);
  const keptAverage = div(add(fresh, q(1)), q(2));
  const show = (x: Rational) => (money ? formatDollars(mul(x, q(100))) : formatDecimal(x, 4));
  const again = redraws === 1 ? "once" : "up to twice";
  const prompt = money
    ? `You're paid a random amount between $0 and $100, every amount equally likely. After seeing it you may redraw ${again}, but you must keep the last draw. Playing well, what's the game worth?`
    : `A computer picks a random number between 0 and 1, and you score that number. After seeing it you may ask for a new number ${again}, but you must keep the last one. Playing well, what's your average score?`;
  return problem(
    `redraw-${scale}-${redraws}`,
    prompt,
    mul(redrawValue(redraws), q(scale)),
    money ? "dollars" : "number",
    [
      {
        label: redraws === 1 ? "A fresh draw is worth" : "Redrawing is worth",
        work: redraws === 1 ? (money ? "($0 + $100) ÷ 2" : "(0 + 1) ÷ 2") : "the one-redraw game",
        result: show(fresh),
      },
      {
        label: `Keep anything above ${show(fresh)}`,
        work: `${formatFraction(keepShare)} of the time, averaging ${show(keptAverage)}`,
      },
      {
        label: money ? "The game is worth" : "Your average score",
        work: `${formatFraction(keepShare)} × ${show(keptAverage)} + ${formatFraction(fresh)} × ${show(fresh)}`,
      },
    ],
    params,
  );
}

export const STATES_LESSONS: QuantLessonDef[] = [
  {
    id: "coupon-collector",
    title: "Collecting every type",
    benefit: "Find how long until you’ve seen them all",
    idea: "Once you’ve seen k of the n types, a new one turns up with chance (n − k) ÷ n, so it takes n ÷ (n − k) tries on average. Add these waits up.",
    targetSeconds: 45,
    example: collectThemAll({ collection: "die-6" }),
    generate: (random) => collectThemAll({ collection: pick(random, COLLECTIONS).id }),
  },
  {
    id: "patterns",
    title: "Patterns in a row",
    benefit: "Find the wait for a run like HTH",
    idea: "Find every piece where the pattern’s start matches its end, including the whole pattern. The average wait is 1 ÷ the chance of each piece, added up. For a fair coin, a piece of length k adds 2ᵏ.",
    targetSeconds: 45,
    example: patternWait({ type: "coin", pattern: "H T H" }),
    generate: (random) => {
      const roll = random();
      if (roll < 0.5) return patternWait({ type: "coin", pattern: pick(random, COIN_PATTERNS) });
      if (roll < 0.7) return patternWait({ type: "die", pattern: pick(random, DIE_PATTERNS) });
      const [headsN, headsD] = pick(random, BIASED_HEADS);
      return patternWait({ type: "biased", pattern: pick(random, BIASED_PATTERNS), headsN, headsD });
    },
  },
  {
    id: "random-walks",
    title: "Random walks",
    benefit: "Find the chance and time to hit a target",
    idea: "With fair bets, the chance of reaching the target is start ÷ target, and the average number of bets is start × (target − start). With unfair bets, let r = lose chance ÷ win chance: starting with $a and aiming for $N, the chance is (rᵃ − 1) ÷ (rᴺ − 1).",
    targetSeconds: 60,
    example: randomWalk({ start: 3, target: 6, winN: 2, winD: 5, ask: "reach" }),
    generate: (random) => {
      const roll = random();
      if (roll < 0.25) {
        const target = int(random, 4, 10);
        return randomWalk({ start: int(random, 1, target - 1), target, winN: 1, winD: 2, ask: "bets" });
      }
      if (roll < 0.45) {
        const up = int(random, 1, 6), down = int(random, 1, 6);
        return randomWalk({ start: down, target: up + down, winN: 1, winD: 2, ask: "walk" });
      }
      // Redraw the rare long shots (under 1% or over 99%), which don't type cleanly.
      for (;;) {
        const [winN, winD] = pick(random, RUIN_ODDS);
        const target = int(random, 4, 8);
        const next = randomWalk({ start: int(random, 1, target - 1), target, winN, winD, ask: random() < 0.5 ? "reach" : "broke" });
        const chance = value(next.answer);
        if (chance >= 0.01 && chance <= 0.99) return next;
      }
    },
  },
  {
    id: "optimal-stopping",
    title: "Optimal stopping",
    benefit: "Decide when to stop and when to go on",
    idea: "Work back from the last turn. Keep a result if it beats what going on is worth on average; otherwise go on.",
    targetSeconds: 45,
    example: optimalStopping({ type: "die", sides: 6, rerolls: 1 }),
    generate: (random) => {
      const roll = random();
      if (roll < 0.25) return optimalStopping({ type: "uniform", redraws: random() < 0.6 ? 1 : 2, scale: random() < 0.5 ? 1 : 100 });
      if (roll < 0.75) return optimalStopping({ type: "die", sides: pick(random, DIE_SIDES), rerolls: 1 });
      return optimalStopping({ type: "die", sides: pick(random, [4, 6, 8] as const), rerolls: 2 });
    },
  },
];
