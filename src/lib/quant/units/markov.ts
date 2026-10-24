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
import type { QuantVisual } from "../visual";

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

// ─── Collecting every type ───────────────────────────────────────────────────────────────

const COLLECTIONS: { id: string; sides: number; prompt: string; unit: string }[] = [
  {
    id: "coin",
    sides: 2,
    unit: "side",
    prompt: "You flip a fair coin until you’ve seen both heads and tails. How many flips do you expect it to take?",
  },
  ...[3, 4, 6, 8, 10, 12].map((sides) => ({
    id: `die-${sides}`,
    sides,
    unit: "face",
    prompt: `You roll a fair ${sides}-sided die until every face has come up at least once. How many rolls do you expect it to take?`,
  })),
  {
    id: "suits",
    sides: 4,
    unit: "suit",
    prompt: "You draw a card, note its suit, and put it back, until you’ve seen all four suits. How many draws do you expect it to take?",
  },
  ...[3, 4, 5, 6].map((sides) => ({
    id: `prizes-${sides}`,
    sides,
    unit: "toy",
    prompt: `Each cereal box holds one of ${sides} toys, all equally likely. How many boxes do you expect to open to get every toy?`,
  })),
  {
    id: "weekdays",
    sides: 7,
    unit: "day",
    prompt:
      "Each person you meet is equally likely to be born on any day of the week. How many people do you expect to meet before you’ve met someone born on every day?",
  },
];

function collectThemAll(params: { collection: string }): QuantProblem {
  const collection = COLLECTIONS.find((c) => c.id === params.collection)!;
  const n = collection.sides;
  let expected = q(0);
  for (let k = 1; k <= n; k++) expected = add(expected, q(n, k));
  const harmonic =
    n <= 6 ? Array.from({ length: n }, (_, i) => (i === 0 ? "1" : `1/${i + 1}`)).join(" + ") : `1 + 1/2 + … + 1/${n}`;
  const seen = Math.floor(n / 2);
  const one = collection.unit;
  // Each box stands for one type (a face, a toy, a suit).
  const types = (marks: { faces: number[]; tone: "known" | "hit" }[], caption: string): QuantVisual => ({
    type: "die-faces",
    sides: n,
    marks,
    caption,
  });
  const waits: QuantVisual = {
    type: "bars",
    bars: range(0, n - 1).map((k) => ({
      label: `${k + 1}${k === 0 ? "st" : k === 1 ? "nd" : k === 2 ? "rd" : "th"}`,
      value: n / (n - k),
      tone: "hit" as const,
      text: formatResult(q(n, n - k), "number"),
    })),
    caption: `Average tries to find each new ${one}. The last one is the slowest: ${n} tries on average.`,
  };
  return problem(
    `collect-${collection.id}`,
    collection.prompt,
    expected,
    "number",
    [
      {
        label: `With k of the ${n} seen, a new one takes`,
        work: `${n} ÷ (${n} − k) tries on average`,
        result: "",
        icon: "split",
        explain: `Split the wait into stages, one per new ${one}. With \`k\` already seen, \`${n} - k\` of the ${n} are new, so each try finds one with chance \`(${n} - k)/${n}\`.`,
        visual: types(
          [
            { faces: range(1, seen), tone: "known" },
            { faces: range(seen + 1, n), tone: "hit" },
          ],
          `With ${seen} of ${n} seen (grey), any of the other ${n - seen} is new: chance ${n - seen}/${n}, so ${formatResult(q(n, n - seen), "number")} tries on average.`,
        ),
      },
      {
        label: `Add the waits for k = 0 to ${n - 1}`,
        work: `${n} × (${harmonic})`,
        icon: "add",
        explain: "The total wait is the stage waits added up, and the average of a sum is the sum of the averages.",
        visual: waits,
      },
    ],
    { collection: collection.id, sides: n },
    types([], `Each box is one ${one}. You need to see all ${n}.`),
  );
}

// ─── Patterns in a row ───────────────────────────────────────────────────────────────────

/** Lengths k where the pattern’s first k symbols match its last k (the whole pattern counts). */
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
  const coinLike = params.type !== "die";
  const flipWord = coinLike ? "flip" : "roll";
  const question: QuantVisual | undefined = coinLike
    ? { type: "coins", flips: symbols as ("H" | "T")[], tones: symbols.map(() => "hit"), caption: `The pattern you’re waiting for.` }
    : undefined;
  /** States: how much of the pattern the last flips match. Overlap pieces are orange. */
  const chain = (chanceText: (symbol: string) => string): QuantVisual => ({
    type: "states",
    nodes: range(0, symbols.length).map((k) => ({
      id: `s${k}`,
      label: k === 0 ? "Start" : shown(k),
      tone: overlaps.includes(k) ? ("hit" as const) : k === 0 ? ("known" as const) : ("muted" as const),
    })),
    edges: range(1, symbols.length).map((k) => ({ from: `s${k - 1}`, to: `s${k}`, label: `${symbols[k - 1]} · ${chanceText(symbols[k - 1])}` })),
    caption: `Each state is how much of the pattern your last ${flipWord}s match. Orange ones are pieces where the start matches the end.`,
  });
  const piecesExplain = `Find each piece that is both how the pattern starts and how it ends. These are the places a new copy can begin inside the last one. The whole pattern always counts.`;

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
    const pieceValue = (k: number) => div(q(1), symbols.slice(0, k).reduce((product, s) => mul(product, chanceOf(s)), q(1)));
    return problem(
      `pattern-biased-${params.headsN}-${params.headsD}-${symbols.join("")}`,
      `A coin lands heads with chance ${formatFraction(heads)}. You flip it until the last ${symbols.length} flips are ${params.pattern}. How many flips do you expect it to take?`,
      expected,
      "number",
      [
        {
          label: "Pieces where the start matches the end",
          work: pieces,
          result: "",
          icon: "filter",
          explain: piecesExplain,
          visual: chain((symbol) => formatFraction(chanceOf(symbol))),
        },
        {
          label: "Add 1 ÷ the chance of each piece",
          work: overlaps.map((k) => `1 ÷ ${pieceChance(k)}`).join(" + "),
          icon: "add",
          explain: "Each piece adds 1 ÷ its chance to the wait. Rare pieces add a lot; a piece that comes up often adds little.",
          visual: {
            type: "bars",
            bars: overlaps.map((k) => ({ label: shown(k), value: value(pieceValue(k)), tone: "hit" as const, text: formatResult(pieceValue(k), "number") })),
            caption: "What each piece adds to the average wait.",
          },
        },
      ],
      params,
      question,
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
      {
        label: "Pieces where the start matches the end",
        work: pieces,
        result: "",
        icon: "filter",
        explain: piecesExplain,
        visual: chain(() => `1/${base}`),
      },
      {
        // A piece of length k has chance 1 ÷ baseᵏ, so 1 ÷ its chance is baseᵏ.
        label: "Add 1 ÷ the chance of each piece",
        work: overlaps.map((k) => `${base}${sup(k)}`).join(" + "),
        icon: "add",
        explain: `A piece of length \`k\` comes up with chance \`1/${base}^k\`, so it adds \`${base}^k\` ${flipWord}s to the wait.`,
        visual: {
          type: "bars",
          bars: overlaps.map((k) => ({ label: shown(k), value: base ** k, tone: "hit" as const, text: `${base ** k}` })),
          caption: "What each piece adds to the average wait.",
        },
      },
    ],
    params,
    question,
  );
}

const COIN_PATTERNS = ["H H", "H T", "T T", "H H H", "H H T", "H T H", "H T T", "T H H", "H H H H", "H T H T", "H H T H", "H T T H"];
const DIE_PATTERNS = ["6 6", "6 1", "6 6 6", "6 1 6", "1 2 3"];
const BIASED_PATTERNS = ["T H", "H T", "H H", "T T", "H T H", "H H T", "H H H"];
const BIASED_HEADS = [[2, 3], [1, 3], [3, 4], [1, 4], [3, 5]] as const;
const STREAK_CHANCES = [[1, 2], [3, 5], [2, 3], [3, 4], [4, 5]] as const;
const EVEN_FLIP_HEADS = [[1, 2], [2, 3], [1, 3], [3, 4], [1, 4], [3, 5]] as const;

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
    const line: QuantVisual = {
      type: "number-line",
      min: -down,
      max: up,
      ticks: range(-down, up),
      shade: [],
      points: [
        { at: 0, label: "Start", tone: "known" },
        { at: -down, label: `−${down}`, tone: "hit" },
        { at: up, label: `+${up}`, tone: "hit" },
      ],
      caption: `The token stops at either orange end.`,
    };
    return problem(
      `walk-${up}-${down}`,
      `A token starts at 0. Each turn it moves 1 step left or right with equal chance. How many turns do you expect until it reaches +${up} or −${down}?`,
      q(up * down),
      "number",
      [
        {
          label: "Steps to the right end × steps to the left end",
          work: `${up} × ${down}`,
          icon: "multiply",
          explain: "For a fair walk, the average time to reach either end is the distance to one end times the distance to the other.",
        },
      ],
      params,
      line,
    );
  }

  if (ask === "bets") {
    const line: QuantVisual = {
      type: "number-line",
      min: 0,
      max: target,
      ticks: range(0, target),
      shade: [],
      points: [
        { at: start, label: `$${start} start`, tone: "known" },
        { at: 0, label: "$0", tone: "hit" },
        { at: target, label: `$${target}`, tone: "hit" },
      ],
      caption: `You’re ${start} away from going broke and ${target - start} away from the target.`,
    };
    return problem(
      `bets-${start}-${target}`,
      `You have $${start} and bet $1 at a time on fair coin flips. You stop when you reach $${target} or go broke. How many bets do you expect to make?`,
      q(start * (target - start)),
      "number",
      [
        {
          label: "Fair bets: start × (target − start)",
          work: `${start} × (${target} − ${start})`,
          icon: "multiply",
          explain: "With fair bets, the average number of bets is your distance to $0 times your distance to the target.",
        },
      ],
      params,
      line,
    );
  }

  const win = q(params.winN, params.winD);
  const fair = win.n * 2 === win.d;
  const chanceText = fair ? "fair coin flips" : `bets that each win with chance ${formatFraction(win)}`;
  const prompt = `You have $${start} and bet $1 at a time on ${chanceText}. You stop when you reach $${target} or go broke. What’s the chance you ${ask === "reach" ? `reach $${target}` : "go broke"}?`;
  const lose = sub(q(1), win);
  const amounts: QuantVisual = {
    type: "states",
    nodes: range(0, target).map((amount) => ({
      id: `$${amount}`,
      label: `$${amount}`,
      tone:
        amount === start
          ? ("known" as const)
          : (ask === "reach" ? amount === target : amount === 0)
            ? ("hit" as const)
            : amount === 0 || amount === target
              ? ("muted" as const)
              : undefined,
    })),
    edges: [
      { from: `$${start}`, to: `$${start + 1}`, label: `win ${formatFraction(win)}` },
      { from: `$${start}`, to: `$${start - 1}`, label: `lose ${formatFraction(lose)}` },
    ],
    caption: `From every amount you go up $1 with chance ${formatFraction(win)} or down $1 with chance ${formatFraction(lose)}. The game ends at $0 or $${target}.`,
  };
  let reach: Rational;
  const steps: Parameters<typeof problem>[4] = [];
  if (fair) {
    reach = q(start, target);
    steps.push({
      label: "Fair bets: start ÷ target",
      work: `${start} ÷ ${target}`,
      result: formatFraction(reach),
      icon: "divide",
      explain: "A fair game doesn’t change your money on average, so you must end with $" + start + " on average: that happens when you reach the target with chance " + start + " ÷ " + target + ".",
    });
  } else {
    const r = div(lose, win);
    reach = div(sub(pow(r, start), q(1)), sub(pow(r, target), q(1)));
    steps.push({
      label: "r = lose chance ÷ win chance",
      work: `${formatFraction(lose)} ÷ ${formatFraction(win)}`,
      result: formatFraction(r),
      icon: "divide",
      explain: `\`r\` says how strongly the bets lean against you. Above 1, each bet is more likely to lose than win.`,
    });
    steps.push({
      label: `Chance to reach $${target}`,
      work: `(r${sup(start)} − 1) ÷ (r${sup(target)} − 1)`,
      result: formatFraction(reach),
      icon: "target",
      explain: `Raise \`r\` to your starting amount and to the target, take 1 off each, and divide. It comes from linking the chance at each amount to the amounts either side.`,
    });
  }
  if (ask === "broke") {
    steps.push({
      label: "Chance to go broke",
      work: `1 − ${formatFraction(reach)}`,
      icon: "subtract",
      explain: "The game always ends at one of the two ends, so going broke is everything that isn’t reaching the target.",
    });
  }
  return problem(
    `ruin-${start}-${target}-${params.winN}-${params.winD}-${ask}`,
    prompt,
    ask === "reach" ? reach : sub(q(1), reach),
    "probability",
    steps,
    params,
    amounts,
  );
}

const UNFAIR_ODDS = [[2, 5], [3, 5], [1, 3], [2, 3], [9, 20], [11, 20]] as const;
const DEUCE_CHANCES = [[3, 5], [2, 3], [3, 4], [2, 5], [1, 3], [4, 7], [5, 8]] as const;
const STAY_CHANCES = [[1, 2], [1, 3], [1, 4], [2, 3]] as const;

/** Redraws a problem until its chance is between 1% and 99%, which types cleanly. */
function withinTypingRange(make: () => QuantProblem) {
  for (;;) {
    const next = make();
    const chance = value(next.answer);
    if (chance >= 0.01 && chance <= 0.99) return next;
  }
}

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
      ? `Roll a fair ${sides}-sided die and be paid the result in dollars. After the first roll you may roll once more, but then you must keep the second. Playing well, what’s the game worth?`
      : `Roll a fair ${sides}-sided die and be paid the result in dollars. You may reroll up to twice, keeping the last roll. Playing well, what’s the game worth?`;
  const faces = (keep: boolean, caption: string): QuantVisual => ({
    type: "bars",
    bars: range(1, sides).map((face) => ({
      label: `${face}`,
      value: face,
      tone: keep && face >= keepFrom ? ("hit" as const) : ("muted" as const),
    })),
    caption,
  });
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
        icon: "idea",
        explain:
          rerolls === 1
            ? "Start from the end. A second roll must be kept, so rolling again is worth an average roll."
            : "Start from the end. After your first reroll, you’re playing the one-reroll game, so going on is worth what that game is worth.",
        visual: faces(false, `Each face pays its number. Going on is worth ${formatDollars(fresh)} on average.`),
      },
      {
        label: `Keep ${keepFrom} or more, since they beat ${formatDollars(fresh)}`,
        work: `${keepCount} of ${sides} faces, averaging ${formatResult(keptAverage, "number")}`,
        icon: "filter",
        explain: `Keep a roll only if it pays more than going on. ${keepFrom} and up beat ${formatDollars(fresh)}; anything lower, roll again.`,
        visual: faces(true, `Keep the orange faces (${keepFrom} and up). Roll again on the grey ones.`),
      },
      {
        label: "The game is worth",
        work: `${frac(keepCount, sides)} × ${formatResult(keptAverage, "number")} + ${frac(sides - keepCount, sides)} × ${formatResult(fresh, "number")}`,
        icon: "add",
        explain: "Weight each branch by its chance. Keeping pays the average of the kept faces, and rolling again pays what going on is worth.",
        visual: {
          type: "tree",
          root: {
            label: "First roll",
            children: [
              { label: `Keep: $${formatResult(keptAverage, "number")}`, edge: frac(keepCount, sides), tone: "hit" },
              { label: `Go on: ${formatDollars(fresh)}`, edge: frac(sides - keepCount, sides), tone: "muted" },
            ],
          },
          caption: "Each branch’s value times its chance, added up.",
        },
      },
    ],
    params,
    faces(false, `A fair ${sides}-sided die. Each face pays its number in dollars.`),
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
    ? `You’re paid a random amount between $0 and $100, every amount equally likely. After seeing it you may redraw ${again}, but you must keep the last draw. Playing well, what’s the game worth?`
    : `A computer picks a random number between 0 and 1, and you score that number. After seeing it you may ask for a new number ${again}, but you must keep the last one. Playing well, what’s your average score?`;
  const at = (x: Rational) => value(x) * scale;
  const line = (shade: { from: number; to: number; tone: "hit" | "muted"; text?: string }[], caption: string): QuantVisual => ({
    type: "number-line",
    min: 0,
    max: scale,
    ticks: scale === 1 ? [0, 0.25, 0.5, 0.75, 1] : [0, 25, 50, 75, 100],
    shade,
    points: [{ at: at(fresh), label: `Going on: ${show(fresh)}`, tone: "known" }],
    caption,
  });
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
        icon: "idea",
        explain:
          redraws === 1
            ? "Start from the end. A new draw must be kept, so drawing again is worth an average draw: the middle of the range."
            : "Start from the end. After one redraw you’re playing the one-redraw game, so going on is worth what that game is worth.",
        visual: line([], `Drawing again is worth ${show(fresh)} on average.`),
      },
      {
        label: `Keep anything above ${show(fresh)}`,
        work: `${formatFraction(keepShare)} of the time, averaging ${show(keptAverage)}`,
        icon: "filter",
        explain: `Keep a draw only if it beats going on. Draws above ${show(fresh)} land there ${formatFraction(keepShare)} of the time, and average the middle of that stretch.`,
        visual: line(
          [
            { from: 0, to: at(fresh), tone: "muted", text: "Draw again" },
            { from: at(fresh), to: scale, tone: "hit", text: "Keep" },
          ],
          `Keep anything in the orange stretch; draw again below ${show(fresh)}.`,
        ),
      },
      {
        label: money ? "The game is worth" : "Your average score",
        work: `${formatFraction(keepShare)} × ${show(keptAverage)} + ${formatFraction(fresh)} × ${show(fresh)}`,
        icon: "add",
        explain: "Weight each branch by its chance. Keeping pays the average of the kept stretch, and drawing again pays what going on is worth.",
      },
    ],
    params,
    line([], money ? "Every amount from $0 to $100 is equally likely." : "Every number from 0 to 1 is equally likely."),
  );
}

// ─── More collecting ─────────────────────────────────────────────────────────────────────

const ORDINAL = (k: number) => `${k}${k === 1 ? "st" : k === 2 ? "nd" : k === 3 ? "rd" : "th"}`;

/** Seeing k different types out of n (not all of them). */
function someTypes(params: { n: number; k: number; context: "die" | "stamps" }): QuantProblem {
  const { n, k, context } = params;
  let expected = q(0);
  for (let j = 0; j < k; j++) expected = add(expected, q(n, n - j));
  const one = context === "die" ? "face" : "type";
  const prompt =
    context === "die"
      ? `You roll a fair ${n}-sided die until ${k} different faces have come up. How many rolls do you expect it to take?`
      : `A collector finds stamps one at a time. Each stamp is equally likely to be any of ${n} types. How many stamps does she expect to find to have ${k} different types?`;
  const waits = range(0, k - 1).map((j) => q(n, n - j));
  return problem(
    `some-${context}-${n}-${k}`,
    prompt,
    expected,
    "number",
    [
      {
        label: `With j ${one}s seen, a new one takes`,
        work: `${n} ÷ (${n} − j) tries on average`,
        result: "",
        icon: "split",
        explain: `Split the wait into stages, one per new ${one}. With \`j\` seen, \`${n} - j\` of the ${n} are new, so a new one turns up with chance \`(${n} - j)/${n}\`.`,
        visual: {
          type: "die-faces",
          sides: n,
          marks: [
            { faces: range(1, Math.min(k - 1, n - 1)), tone: "known" },
            { faces: range(k, n), tone: "hit" },
          ],
          caption: `With ${k - 1} seen (grey), any of the other ${n - k + 1} is new.`,
        },
      },
      {
        label: `Add the waits for j = 0 to ${k - 1}`,
        work: waits.map((w) => formatFraction(w)).join(" + "),
        icon: "add",
        explain: `You only need ${k} of the ${n}, so stop after the ${ORDINAL(k)} new ${one}. The slow last stages never happen.`,
        visual: {
          type: "bars",
          bars: waits.map((w, j) => ({ label: ORDINAL(j + 1), value: value(w), tone: "hit" as const, text: formatResult(w, "number") })),
          caption: `Average tries for each new ${one}, up to the ${ORDINAL(k)}.`,
        },
      },
    ],
    params,
    { type: "die-faces", sides: n, marks: [], caption: `Each box is one ${one}. You need ${k} different ones.` },
  );
}

/** An urn where every draw is put back as a blue ball, until every ball is blue. */
function swapUrn(params: { red: number; blue: number }): QuantProblem {
  const { red, blue } = params;
  const n = red + blue;
  let expected = q(0);
  for (let k = 1; k <= red; k++) expected = add(expected, q(n, k));
  const waits = range(1, red).reverse().map((k) => ({ k, wait: q(n, k) }));
  const urn = (reds: number, caption: string): QuantVisual => ({
    type: "marbles",
    groups: [
      { count: reds, tone: "hit" as const, label: "red" },
      { count: n - reds, tone: "alt" as const, label: "blue" },
    ].filter((g) => g.count > 0),
    caption,
  });
  return problem(
    `swap-${red}-${blue}`,
    `An urn has ${red} red and ${blue} blue balls. Each turn you take out a ball at random and put a blue ball back in its place, whatever colour you took. How many turns do you expect until every ball is blue?`,
    expected,
    "number",
    [
      {
        label: `With k red left, a turn removes one with chance`,
        work: `k ÷ ${n}, so it takes ${n} ÷ k turns`,
        result: "",
        icon: "split",
        explain: "The number of red balls only goes down when you pick a red one. Each stage is a wait for one thing with a fixed chance.",
        visual: urn(Math.max(1, Math.ceil(red / 2)), `With ${Math.max(1, Math.ceil(red / 2))} red left, a turn picks red with chance ${Math.max(1, Math.ceil(red / 2))}/${n}.`),
      },
      {
        label: `Add the waits for ${red} red down to 1`,
        work: waits.map((w) => `${n}/${w.k}`).join(" + "),
        icon: "add",
        explain: "Add the wait for each red ball to go. The last red ball is the slowest to find.",
        visual: {
          type: "bars",
          bars: waits.map((w) => ({ label: `${w.k} red`, value: value(w.wait), tone: "hit" as const, text: formatResult(w.wait, "number") })),
          caption: "Average turns spent with each number of red balls left.",
        },
      },
    ],
    params,
    urn(red, `${red} red and ${blue} blue. Every ball you take is replaced by a blue one.`),
  );
}

// ─── More patterns ───────────────────────────────────────────────────────────────────────

/** k successes in a row, each with chance p: Σ 1 ÷ pⁱ. */
function streak(params: { pN: number; pD: number; k: number; context: "meter" | "throws" }): QuantProblem {
  const { k, context } = params;
  const p = q(params.pN, params.pD);
  const terms = range(1, k).map((i) => div(q(1), pow(p, i)));
  const expected = terms.reduce((sum, t) => add(sum, t), q(0));
  const pText = formatFraction(p);
  const prompt =
    context === "meter"
      ? `A parking meter needs ${k} real coins in a row. Each coin you put in is real with chance ${pText}, and a fake one resets the meter to zero. How many coins do you expect to put in?`
      : `You shoot free throws until you make ${k} in a row. Each shot goes in with chance ${pText}. How many shots do you expect to take?`;
  const one = context === "meter" ? "coin" : "shot";
  return problem(
    `streak-${context}-${params.pN}-${params.pD}-${k}`,
    prompt,
    expected,
    "number",
    [
      {
        label: "Pieces where the start matches the end",
        work: `every run of 1 to ${k} successes`,
        result: "",
        icon: "filter",
        explain: `A run of successes overlaps itself at every length: the first \`i\` ${one}s and the last \`i\` ${one}s are both \`i\` successes.`,
        visual: {
          type: "states",
          nodes: range(0, k).map((i) => ({ id: `r${i}`, label: i === 0 ? "0" : `${i} in a row`, tone: i === k ? ("hit" as const) : i === 0 ? ("known" as const) : undefined })),
          edges: [
            ...range(1, k).map((i) => ({ from: `r${i - 1}`, to: `r${i}`, label: pText })),
            { from: `r${Math.min(2, k)}`, to: "r0", label: `miss ${formatFraction(sub(q(1), p))}` },
          ],
          caption: `Each success moves you one step right; any miss sends you back to 0.`,
        },
      },
      {
        label: `Add 1 ÷ ${pText} to the power 1 to ${k}`,
        work: range(1, k).map((i) => `(1 ÷ ${pText})${sup(i)}`).join(" + "),
        icon: "add",
        explain: `A run of \`i\` successes has chance \`(${pText})^i\`, so it adds \`1/(${pText})^i\` to the wait. The longest run adds the most.`,
        visual: {
          type: "bars",
          bars: terms.map((t, i) => ({ label: `${i + 1}`, value: value(t), tone: "hit" as const, text: formatResult(t, "number") })),
          caption: "What each run length adds to the average wait.",
        },
      },
    ],
    params,
    { type: "coins", flips: range(1, k).map(() => "H" as const), tones: range(1, k).map(() => "hit" as const), caption: `You need ${k} successes in a row.` },
  );
}

/** Flipping until two in a row match: the chance it ends on an even (or odd) flip. */
function evenFlips(params: { headsN: number; headsD: number; ask: "even" | "odd" }): QuantProblem {
  const { ask } = params;
  const p = q(params.headsN, params.headsD);
  const qq = sub(q(1), p);
  const pq = mul(p, qq);
  const fair = p.n * 2 === p.d;
  const even = div(add(mul(p, p), mul(qq, qq)), sub(q(1), pq));
  const odd = div(pq, sub(q(1), pq));
  const answer = ask === "even" ? even : odd;
  // Chance the game stops on flip n, for the first few n.
  const stopAt = (n: number) => (n % 2 === 0 ? mul(add(mul(p, p), mul(qq, qq)), pow(pq, (n - 2) / 2)) : mul(pq, pow(pq, (n - 3) / 2)));
  const bars: QuantVisual = {
    type: "bars",
    bars: range(2, 7).map((n) => ({
      label: `${n}`,
      value: value(stopAt(n)),
      tone: (n % 2 === 0) === (ask === "even") ? ("hit" as const) : ("muted" as const),
      text: formatFraction(stopAt(n)),
    })),
    caption: `Chance the game stops on each flip. The ${ask} flips are orange.`,
  };
  const coinText = fair ? "a fair coin" : `a coin that lands heads with chance ${formatFraction(p)}`;
  const pText = formatFraction(p), qText = formatFraction(qq), pqText = formatFraction(pq);
  const steps: Parameters<typeof problem>[4] = [
    {
      label: "Flips switch until one repeats",
      work: "H T H T … until two match",
      result: "",
      icon: "flip",
      explain: "Every flip after the first either matches the one before, which ends the game, or switches. So the flips alternate until the stop.",
      visual: { type: "coins", flips: ["H", "T", "H", "H"], tones: ["known", "known", "known", "hit"], caption: "This run alternates, then stops on flip 4." },
    },
  ];
  if (fair) {
    steps.push({
      label: "Chance it stops on flip n",
      work: "(1/2)ⁿ⁻¹",
      result: "",
      icon: "repeat",
      explain: "The first flip can be anything. Each later flip matches the one before with chance 1/2, so stopping on flip `n` takes `n - 2` switches, then a match.",
      visual: bars,
    });
    steps.push({
      label: ask === "even" ? "Add the even flips" : "Add the odd flips",
      work: ask === "even" ? "1/2 + 1/8 + 1/32 + … = (1/2) ÷ (1 − 1/4)" : "1/4 + 1/16 + … = (1/4) ÷ (1 − 1/4)",
      icon: "add",
      explain: "Each term is 1/4 of the one before, so the series sums to the first term divided by `1 - 1/4`.",
    });
  } else {
    steps.push({
      label: "Two switches in a row",
      work: `${pText} × ${qText}`,
      result: pqText,
      icon: "multiply",
      explain: "Switching twice brings back the same kind of flip, two flips later. Each extra pair of flips before the stop has this chance.",
      visual: bars,
    });
    steps.push({
      label: ask === "even" ? "Stops on an even flip" : "Stops on an odd flip",
      work: ask === "even" ? `(${pText}² + ${qText}²) ÷ (1 − ${pqText})` : `${pqText} ÷ (1 − ${pqText})`,
      icon: "add",
      explain:
        ask === "even"
          ? "An even stop is H H or T T after some extra pairs: `(p^2 + q^2)(1 + pq + (pq)^2 + \\cdots)`."
          : "An odd stop needs one switch first, then a match (H T T or T H H, `pq` in total), then any number of extra pairs.",
    });
  }
  return problem(
    `even-flips-${params.headsN}-${params.headsD}-${ask}`,
    `You flip ${coinText} until two flips in a row are the same. What’s the chance it takes an ${ask} number of flips?`,
    answer,
    "probability",
    steps,
    params,
  );
}

// ─── More walks ──────────────────────────────────────────────────────────────────────────

/** From deuce, the first to lead by two points wins. */
function deuce(params: { pN: number; pD: number; ask: "win" | "points" }): QuantProblem {
  const p = q(params.pN, params.pD);
  const qq = sub(q(1), p);
  const both = mul(p, p), lose = mul(qq, qq);
  const decided = add(both, lose);
  const pText = formatFraction(p), qText = formatFraction(qq);
  const chain: QuantVisual = {
    type: "states",
    nodes: [
      { id: "lose", label: "Opponent wins", tone: params.ask === "win" ? "muted" : "hit" },
      { id: "behind", label: "Opp. ahead" },
      { id: "deuce", label: "Deuce", tone: "known" },
      { id: "ahead", label: "Ana ahead" },
      { id: "win", label: "Ana wins", tone: "hit" },
    ],
    edges: [
      { from: "deuce", to: "ahead", label: pText },
      { from: "ahead", to: "win", label: pText },
      { from: "ahead", to: "deuce", label: qText },
      { from: "deuce", to: "behind", label: qText },
      { from: "behind", to: "lose", label: qText },
      { from: "behind", to: "deuce", label: pText },
    ],
    caption: `Ana wins each point with chance ${pText}. Winning one and losing one puts you back at deuce.`,
  };
  const prompt =
    params.ask === "win"
      ? `A tennis game reaches deuce: from here, whoever first leads by two points wins. Ana wins each point with chance ${pText}. What’s the chance she wins the game?`
      : `A tennis game reaches deuce: from here, whoever first leads by two points wins. Ana wins each point with chance ${pText}. How many more points do you expect them to play?`;
  const pairStep = {
    label: "Next two points: Ana wins both / her opponent wins both",
    work: `(${pText})² and (${qText})²`,
    result: `${formatFraction(both)} and ${formatFraction(lose)}`,
    icon: "multiply" as const,
    explain: "Look at the points two at a time. Two wins for either player ends the game; a split puts you back at deuce, as if nothing happened.",
    visual: chain,
  };
  if (params.ask === "win") {
    return problem(
      `deuce-${params.pN}-${params.pD}-win`,
      prompt,
      div(both, decided),
      "probability",
      [
        pairStep,
        {
          label: "Ana’s share of the pairs that end the game",
          work: `${formatFraction(both)} ÷ (${formatFraction(both)} + ${formatFraction(lose)})`,
          icon: "divide",
          explain: "Splits change nothing, so only the deciding pairs matter. Ana wins if the first deciding pair is hers.",
        },
      ],
      params,
      chain,
    );
  }
  return problem(
    `deuce-${params.pN}-${params.pD}-points`,
    prompt,
    div(q(2), decided),
    "number",
    [
      pairStep,
      {
        label: "A pair ends the game with chance",
        work: `${formatFraction(both)} + ${formatFraction(lose)}`,
        result: formatFraction(decided),
        icon: "add",
        explain: "Either player winning both points ends it.",
      },
      {
        label: "Points: 2 × average pairs",
        work: `2 × (1 ÷ ${formatFraction(decided)})`,
        icon: "multiply",
        explain: "Waiting for a pair that ends the game takes 1 ÷ its chance pairs on average, and each pair is 2 points.",
      },
    ],
    params,
    chain,
  );
}

/** A fair walk that can also stay put: each move takes 1 ÷ (1 − s) turns. */
function lazyWalk(params: { start: number; target: number; sN: number; sD: number }): QuantProblem {
  const { start, target } = params;
  const s = q(params.sN, params.sD);
  const moves = start * (target - start);
  const perMove = div(q(1), sub(q(1), s));
  const step = div(sub(q(1), s), q(2));
  return problem(
    `lazy-${start}-${target}-${params.sN}-${params.sD}`,
    `A token starts at ${start} on a line from 0 to ${target}. Each turn it stays put with chance ${formatFraction(s)}, or moves 1 step left or right (each with chance ${formatFraction(step)}). It stops at 0 or ${target}. How many turns do you expect it to take?`,
    mul(q(moves), perMove),
    "number",
    [
      {
        label: "Moves needed, ignoring the pauses",
        work: `${start} × (${target} − ${start})`,
        result: `${moves}`,
        icon: "multiply",
        explain: "Left and right are equally likely, so the moves alone are a fair walk: distance to one end times distance to the other.",
      },
      {
        label: "Turns for each move",
        work: `1 ÷ (1 − ${formatFraction(s)})`,
        result: formatResult(perMove, "number"),
        icon: "divide",
        explain: `A turn makes a move with chance 1 − ${formatFraction(s)}, so each move takes 1 ÷ (1 − ${formatFraction(s)}) turns on average.`,
      },
      {
        label: "Turns in all",
        work: `${moves} × ${formatResult(perMove, "number")}`,
        icon: "multiply",
        explain: "Every move costs the same average number of turns, so multiply.",
      },
    ],
    params,
    {
      type: "number-line",
      min: 0,
      max: target,
      ticks: range(0, target),
      shade: [],
      points: [
        { at: start, label: "Start", tone: "known" },
        { at: 0, label: "0", tone: "hit" },
        { at: target, label: `${target}`, tone: "hit" },
      ],
      caption: "The token stops at either orange end.",
    },
  );
}

/** Ways to roll each total with `dice` six-sided dice. */
function totalWays(dice: number) {
  let ways = new Map([[0, 1]]);
  for (let d = 0; d < dice; d++) {
    const next = new Map<number, number>();
    for (const [total, count] of ways) for (let f = 1; f <= 6; f++) next.set(total + f, (next.get(total + f) ?? 0) + count);
    ways = next;
  }
  return ways;
}

/** A token game: one total moves a token to A, another moves one to B, until someone has them all. */
function diceTokens(params: { tokens: number; aTotal: number; bTotal: number; dice: number }): QuantProblem {
  const { tokens, aTotal, bTotal, dice } = params;
  const ways = totalWays(dice);
  const wa = ways.get(aTotal)!, wb = ways.get(bTotal)!;
  const win = q(wa, wa + wb);
  const r = q(wb, wa);
  const answer = div(q(1), add(q(1), pow(r, tokens)));
  const diceWord = dice === 2 ? "two dice" : "three dice";
  const cells: [number, number][] = [], other: [number, number][] = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) (a + b === aTotal ? cells : a + b === bTotal ? other : []).push([a, b]);
  const figure: QuantVisual =
    dice === 2
      ? { type: "dice-grid", sides: 6, marks: [{ cells, tone: "hit" }, { cells: other, tone: "alt" }], caption: `Orange: a total of ${aTotal} (${wa} ways). Blue: ${bTotal} (${wb} ways).` }
      : {
          type: "bars",
          bars: [...ways.entries()].map(([total, count]) => ({ label: `${total}`, value: count, tone: total === aTotal ? ("hit" as const) : total === bTotal ? ("alt" as const) : ("muted" as const) })),
          caption: `Ways to roll each total with three dice. Orange: ${aTotal} (${wa} ways). Blue: ${bTotal} (${wb} ways).`,
        };
  return problem(
    `tokens-${dice}-${aTotal}-${bTotal}-${tokens}`,
    `Two players each start with ${tokens} tokens and roll ${diceWord} again and again. A total of ${aTotal} means B gives A a token; a total of ${bTotal} means A gives B a token; anything else, nothing happens. They play until one player has all the tokens. What’s the chance A ends up with all of them?`,
    answer,
    "probability",
    [
      {
        label: `Only totals of ${aTotal} and ${bTotal} matter`,
        work: `${wa} ways ÷ (${wa} + ${wb} ways)`,
        result: formatFraction(win),
        icon: "filter",
        explain: `Other totals change nothing, so ignore them. When a token does move, it goes to A with chance ${wa} out of ${wa + wb}.`,
        visual: figure,
      },
      {
        label: "r = lose chance ÷ win chance",
        work: `${wb} ÷ ${wa}`,
        result: formatFraction(r),
        icon: "divide",
        explain: `From A’s side this is a walk from ${tokens} tokens to 0 or ${2 * tokens}, with each step a win with chance ${formatFraction(win)}.`,
      },
      {
        label: `Chance to reach ${2 * tokens} from ${tokens}`,
        work: `(r${sup(tokens)} − 1) ÷ (r${sup(2 * tokens)} − 1) = 1 ÷ (1 + r${sup(tokens)})`,
        icon: "target",
        explain: "Use the random-walk rule. Starting halfway, it simplifies to `1/(1 + r^t)`, where `t` is the number of tokens you start with.",
      },
    ],
    params,
    figure,
  );
}

const TOKEN_TOTALS: readonly (readonly [number, number, number])[] = [
  [2, 7, 11], [2, 6, 7], [2, 8, 11], [2, 3, 10], [2, 9, 12], [2, 5, 8], [2, 4, 7], [3, 11, 14], [3, 10, 13],
];

// ─── More stopping ───────────────────────────────────────────────────────────────────────

type BustParams = { type: "doubles"; sides: number } | { type: "total"; total: number } | { type: "pig"; sides: number };

/** Each roll adds to your score unless it busts, which wipes the score. Stop when the risk beats the gain. */
function bustGame(params: BustParams): QuantProblem {
  let bust: Rational, gain: Rational, prompt: string, key: string, figure: QuantVisual, bustText: string;
  if (params.type === "pig") {
    const n = params.sides;
    bust = q(1, n);
    gain = q(n + 2, 2);
    bustText = "a 1";
    key = `pig-${n}`;
    prompt = `You roll a fair ${n}-sided die again and again, adding each roll to your score. If you ever roll a 1, your score drops to 0 and the game ends. You can stop whenever you like and keep your score. Playing for the highest average score, what’s the lowest score at which you should stop?`;
    figure = { type: "die-faces", sides: n, marks: [{ faces: range(2, n), tone: "win" }, { faces: [1], tone: "lose" }], caption: `A 1 loses everything; anything else adds to your score.` };
  } else {
    const n = params.type === "doubles" ? params.sides : 6;
    const cells: [number, number][] = [], busts: [number, number][] = [];
    let sum = 0;
    for (let a = 1; a <= n; a++)
      for (let b = 1; b <= n; b++) {
        const isBust = params.type === "doubles" ? a === b : a + b === params.total;
        (isBust ? busts : cells).push([a, b]);
        if (!isBust) sum += a + b;
      }
    bust = q(busts.length, n * n);
    gain = q(sum, cells.length);
    bustText = params.type === "doubles" ? "a double" : `a total of ${params.total}`;
    key = params.type === "doubles" ? `bust-doubles-${n}` : `bust-total-${params.total}`;
    prompt = `You roll two fair ${n}-sided dice again and again, adding their total to your score each time. If they ever show ${bustText}, your score drops to 0 and the game ends. You can stop whenever you like and keep your score. Playing for the highest average score, what’s the lowest score at which you should stop?`;
    figure = { type: "dice-grid", sides: n, marks: [{ cells, tone: "win" }, { cells: busts, tone: "lose" }], caption: `Red rolls lose everything; green ones add their total.` };
  }
  const keep = sub(q(1), bust);
  const threshold = div(mul(keep, gain), bust);
  const stopAt = Math.ceil(value(threshold) - 1e-12);
  const exact = threshold.d === 1;
  return problem(
    key,
    prompt,
    q(stopAt),
    "count",
    [
      {
        label: "What one more roll gains on average",
        work: `${formatFraction(keep)} × ${formatResult(gain, "number")}`,
        result: formatResult(mul(keep, gain), "number"),
        icon: "multiply",
        explain: `If you don’t roll ${bustText}, you add the average of the safe rolls, ${formatResult(gain, "number")}.`,
        visual: figure,
      },
      {
        label: "What one more roll risks",
        work: `${formatFraction(bust)} × your score`,
        result: "",
        icon: "target",
        explain: `With chance ${formatFraction(bust)} you roll ${bustText} and lose your whole score, so the risk grows as your score grows.`,
      },
      {
        label: "Stop once the risk is at least the gain",
        work: `score ≥ ${formatResult(mul(keep, gain), "number")} ÷ ${formatFraction(bust)}${exact ? "" : ` = ${formatResult(threshold, "number")}, so`}`,
        icon: "check",
        explain: exact
          ? "Below this score, rolling again adds more than it risks. At exactly this score it’s even, so you can stop."
          : "Below this score, rolling again adds more than it risks. Round up to the first whole score where it doesn’t.",
        visual: {
          type: "number-line",
          min: 0,
          max: Math.ceil((stopAt * 1.5) / 10) * 10,
          shade: [
            { from: 0, to: stopAt, tone: "win", text: "Roll again" },
            { from: stopAt, to: Math.ceil((stopAt * 1.5) / 10) * 10, tone: "lose", text: "Stop" },
          ],
          points: [{ at: stopAt, label: `${stopAt}`, tone: "hit" }],
          caption: `Keep rolling below ${stopAt}; stop at ${stopAt} or more.`,
        },
      },
    ],
    params,
    figure,
  );
}

/** Unlimited rerolls at a cost: the value of keeping k or more, for each k. */
export function paidRerollValues(sides: number, cost: Rational) {
  return range(1, sides).map((k) => {
    const kept = sides - k + 1;
    const average = q(k + sides, 2);
    const rerolls = sub(q(sides, kept), q(1));
    return { k, kept, average, rerolls, value: sub(average, mul(cost, rerolls)) };
  });
}

function paidReroll(params: { sides: number; costN: number; costD: number; ask: "value" | "keep" }): QuantProblem {
  const { sides, ask } = params;
  const cost = q(params.costN, params.costD);
  const options = paidRerollValues(sides, cost);
  const best = options.reduce((a, b) => (value(b.value) > value(a.value) ? b : a));
  const costText = formatDollars(cost);
  const prompt =
    ask === "value"
      ? `Roll a fair ${sides}-sided die and be paid its number in dollars. You may reroll as many times as you like, but each reroll costs ${costText}. Playing well, what’s the game worth?`
      : `Roll a fair ${sides}-sided die and be paid its number in dollars. You may reroll as many times as you like, but each reroll costs ${costText}. Playing well, what’s the lowest roll you should keep?`;
  const shown = options.filter((o) => value(o.value) > 0);
  return problem(
    `paid-${sides}-${params.costN}-${params.costD}-${ask}`,
    prompt,
    ask === "value" ? best.value : q(best.k),
    ask === "value" ? "dollars" : "count",
    [
      {
        label: "If you keep k or more",
        work: `average kept − ${costText} × rerolls`,
        result: "",
        icon: "split",
        explain: `Keeping faces \`k\` and up, a roll is kept with chance \`(${sides} - k + 1)/${sides}\`, so you pay for \`${sides}/(${sides} - k + 1) - 1\` rerolls on average.`,
        visual: {
          type: "bars",
          bars: shown.map((o) => ({ label: `${o.k}+`, value: value(o.value), tone: o.k === best.k ? ("hit" as const) : ("muted" as const), text: formatDollars(o.value) })),
          caption: "What the game is worth for each cutoff. The best one is orange.",
        },
      },
      ask === "value"
        ? {
            label: `Best: keep ${best.k} or more`,
            work: `${formatDollars(best.average)} − ${costText} × ${formatResult(best.rerolls, "number")}`,
            icon: "check",
            explain: `Keeping ${best.k} and up gives the most: its kept rolls average ${formatDollars(best.average)}, less the cost of the rerolls.`,
          }
        : {
            label: "Best cutoff",
            work: `keep ${best.k} or more: ${formatDollars(best.average)} − ${costText} × ${formatResult(best.rerolls, "number")} = ${formatDollars(best.value)}`,
            icon: "check",
            explain: `Keeping ${best.k} and up is worth the most. A lower cutoff keeps worse rolls; a higher one pays for too many rerolls.`,
          },
    ],
    params,
    {
      type: "bars",
      bars: range(1, sides).map((face) => ({ label: `${face}`, value: face, tone: "muted" as const })),
      caption: `Each face pays its number. Each reroll costs ${costText}.`,
    },
  );
}

const PAID_COSTS: readonly (readonly [number, number])[] = [[1, 2], [1, 1], [2, 1], [3, 1]];

/** Whether two cutoffs tie for best, which would make "the lowest roll to keep" ambiguous. */
function paidRerollTies(sides: number, cost: Rational) {
  const values = paidRerollValues(sides, cost).map((o) => value(o.value));
  const best = Math.max(...values);
  return values.filter((v) => Math.abs(v - best) < 1e-12).length > 1;
}

export const STATES_LESSONS: QuantLessonDef[] = [
  {
    id: "coupon-collector",
    title: "Collecting every type",
    benefit: "Find how long until you’ve seen them all",
    summary: "How long it takes on average to see every face of a die or collect every toy in a set, found by splitting the wait into stages.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: [
          "Each box of a cereal holds one of 4 toys, and every toy is equally likely. You keep buying boxes until you own all 4.",
          "How many boxes do you expect to open?",
        ],
      },
      {
        type: "check",
        prompt: "How many boxes, on average?",
        choices: ["4", "About 6", "About 8.3", "16"],
        answer: 2,
        explain:
          "About 8.3 boxes. 4 would only be enough if you never got a repeat, and repeats get more common as your set fills up. The last toy alone takes 4 boxes on average.",
      },
      {
        type: "story",
        heading: "One stage per new toy",
        beats: [
          {
            text: "The first box always gives you a toy you don’t have. That stage takes 1 box.",
            visual: {
              type: "bars",
              bars: [
                { label: "1st toy", value: 1, tone: "hit", text: "1" },
                { label: "2nd", value: 4 / 3, tone: "muted" },
                { label: "3rd", value: 2, tone: "muted" },
                { label: "4th", value: 4, tone: "muted" },
              ],
              caption: "Average boxes to find each new toy",
            },
          },
          {
            text: "With 1 toy in hand, 3 of the 4 are new, so each box gives a new one with chance 3/4. A wait for something with chance `p` takes `1/p` tries on average, so this stage takes 4/3 boxes.",
            visual: {
              type: "bars",
              bars: [
                { label: "1st toy", value: 1, tone: "hit", text: "1" },
                { label: "2nd", value: 4 / 3, tone: "hit", text: "4/3" },
                { label: "3rd", value: 2, tone: "muted" },
                { label: "4th", value: 4, tone: "muted" },
              ],
              caption: "Average boxes to find each new toy",
            },
          },
          {
            text: "With 2 in hand, the chance of a new toy is 2/4, so 2 boxes on average.",
            visual: {
              type: "bars",
              bars: [
                { label: "1st toy", value: 1, tone: "hit", text: "1" },
                { label: "2nd", value: 4 / 3, tone: "hit", text: "4/3" },
                { label: "3rd", value: 2, tone: "hit", text: "2" },
                { label: "4th", value: 4, tone: "muted" },
              ],
              caption: "Average boxes to find each new toy",
            },
          },
          {
            text: "For the last toy the chance is 1/4, so 4 boxes. Add the four stages: {{1 + 4/3 + 2 + 4 = 25/3 ≈ 8.3}}",
            visual: {
              type: "bars",
              bars: [
                { label: "1st toy", value: 1, tone: "hit", text: "1" },
                { label: "2nd", value: 4 / 3, tone: "hit", text: "4/3" },
                { label: "3rd", value: 2, tone: "hit", text: "2" },
                { label: "4th", value: 4, tone: "hit", text: "4" },
              ],
              caption: "Average boxes to find each new toy",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why the stages add",
        body: [
          "Within a stage, every box has the same chance of giving a new toy, so each stage is a plain wait with average 1 ÷ chance. The total wait is the sum of the stages, and the average of a sum is the sum of the averages.",
          "The stages get slower as the set fills. With `n` types the last one alone takes `n` tries, and the total grows a little faster than `n`: about 14.7 rolls to see every face of a die, and about 236 draws, with replacement, to see every card in a deck.",
        ],
      },
      {
        type: "rule",
        name: "The coupon collector’s problem",
        lines: [
          { lead: "Each draw is independent and equally likely to be any of `n` types. Let `T` be the number of draws until every type has appeared. Then", tex: "E[T] = n \\left(1 + \\frac{1}{2} + \\cdots + \\frac{1}{n}\\right) = n H_n" },
          { lead: "More generally, the expected number of draws until `k` different types have appeared is", tex: "\\sum_{i=0}^{k-1} \\frac{n}{n - i}" },
        ],
        where: ["`H_n` is the `n`th harmonic number, about `\\ln n + 0.577` for large `n`"],
        plain: "Split the wait into one stage per new type. Each stage is a geometric wait, and the stage waits add.",
        note: "For `n = 4` toys: {{4 × (1 + 1/2 + 1/3 + 1/4) = 4 × 25/12 = 25/3}} Each term is one stage read backwards: 4 × 1 is the last toy, and 4 × 1/4 is the first.",
      },
      {
        type: "check",
        prompt: "How many boxes do you expect to open to get 2 different toys out of the 4?",
        choices: ["2", "About 2.3", "6", "About 8.3"],
        answer: 1,
        explain: "Only the first two stages happen, 1 box for the first toy and 4/3 for the second: {{1 + 4/3 = 7/3 ≈ 2.3}} The slow last stages are what make a full set take so long.",
      },
      {
        type: "example",
        lead: "The same stages for every face of a six-sided die.",
      },
      {
        type: "trap",
        body: "Answering `n`. Seeing all 6 faces of a die in 6 rolls means no repeats at all, which happens only 6!/6⁶ ≈ 1.5% of the time. The average is 14.7 rolls.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "You keep drawing until you’ve seen every face, toy, suit or type",
          "Each draw is equally likely to be any type, and repeats are allowed",
          "You’re asked how long until you’ve seen `k` different types out of `n`",
        ],
      },
    ],
    targetSeconds: 45,
    example: collectThemAll({ collection: "die-6" }),
    families: [
      {
        id: "every-face",
        title: "Every face of a die, or both sides of a coin",
        generate: (random) => collectThemAll({ collection: pick(random, COLLECTIONS.filter((c) => c.id === "coin" || c.id.startsWith("die"))).id }),
      },
      {
        id: "every-prize",
        title: "Every toy, suit or day of the week",
        generate: (random) => collectThemAll({ collection: pick(random, COLLECTIONS.filter((c) => !(c.id === "coin" || c.id.startsWith("die")))).id }),
      },
      {
        id: "some-types",
        title: "Seeing some of the types, not all",
        generate: (random) => {
          const n = int(random, 4, 8);
          return someTypes({ n, k: int(random, 2, n - 1), context: random() < 0.5 ? "die" : "stamps" });
        },
      },
      {
        id: "swap-urn",
        title: "Swapping balls until all are one colour",
        generate: (random) => swapUrn({ red: int(random, 1, 4), blue: int(random, 1, 4) }),
      },
    ],
  },
  {
    id: "patterns",
    title: "Patterns in a row",
    benefit: "Find the wait for a run like HTH",
    summary: "Why a fair coin takes 10 flips on average to show H T H but only 8 to show H H T, and a rule for the wait for any pattern.",
    difficulty: "Hard",
    parts: [
      {
        type: "text",
        body: [
          "You flip a fair coin until you see heads, tails, heads in a row. A friend flips another coin until they see heads, heads, tails.",
          "Each run of three flips has the same chance, 1/8. Who should expect to wait longer?",
        ],
      },
      {
        type: "check",
        prompt: "Pick one.",
        choices: ["You, waiting for H T H", "Your friend, waiting for H H T", "Neither, both wait 8 flips"],
        answer: 0,
        explain:
          "H T H takes 10 flips on average and H H T takes 8. A 1/8 chance at each spot is why 8 sounds right, but that only holds for a pattern that can’t overlap itself.",
      },
      {
        type: "story",
        heading: "What a wrong flip costs",
        beats: [
          {
            text: "Suppose you’ve flipped H T and need one more H.",
            visual: { type: "coins", flips: ["H", "T", "?"], tones: ["hit", "hit", "muted"], caption: "Two flips into H T H" },
          },
          {
            text: "If the next flip is T instead, you have H T T. No part of that is a start of H T H, so you’re back to nothing.",
            visual: { type: "coins", flips: ["H", "T", "T"], tones: ["muted", "muted", "muted"], caption: "A miss throws away both flips" },
          },
          {
            text: "Your friend has flipped H H and needs a T. If the next flip is H instead, the last two flips are still H H, so they’re one flip away again.",
            visual: { type: "coins", flips: ["H", "H", "H"], tones: ["muted", "hit", "hit"], caption: "A miss on H H T keeps the progress" },
          },
          {
            text: "A wrong flip can cost you two flips of progress, and it never costs your friend more than one. That is the whole gap between 10 and 8.",
            visual: { type: "coins", flips: ["H", "T", "H"], tones: ["hit", "hit", "hit"], caption: "H T H, 10 flips on average" },
          },
        ],
      },
      {
        type: "text",
        heading: "A rule for any pattern",
        body: [
          "Find each piece of the pattern that is both how it starts and how it ends. For H T H those pieces are H and the whole H T H. For H H T, only the whole pattern counts.",
          "With a fair coin, each piece of length `k` adds `2^k` flips to the wait. For H T H that’s {{2¹ + 2³ = 2 + 8 = 10}} H H T takes 2³ = 8. H H H overlaps itself at every length, so it takes {{2 + 4 + 8 = 14}}",
        ],
      },
      {
        type: "rule",
        name: "Waiting for a pattern",
        lines: [
          { lead: "Flip a fair coin until a pattern `w` of length `m` first appears, and let `T_w` be the number of flips. Then", tex: "E[T_w] = \\sum_{k \\in O(w)} 2^k" },
        ],
        where: ["`O(w)` is the set of lengths `k \\le m` for which the first `k` symbols of `w` match its last `k`. It always includes `m`", "With `s` equally likely symbols, such as the faces of a die, use `s^k` in place of `2^k`"],
        plain: "Add `2^k` for every length `k` at which the pattern’s start matches its end.",
        note: "For H T H, `O(w) = \\{1, 3\\}`: the first letter matches the last, and the whole pattern matches itself. So {{E[T] = 2¹ + 2³ = 10}} On a die, the pattern 6 6 has `O(w) = \\{1, 2\\}`, so the wait is {{6¹ + 6² = 42}}",
      },
      {
        type: "check",
        prompt: "How many flips of a fair coin do you expect until H H H?",
        choices: ["8", "14", "10", "6"],
        answer: 1,
        explain: "H, H H and H H H all both start and end H H H, so the wait is {{2¹ + 2² + 2³ = 14}}",
      },
      {
        type: "example",
        lead: "Here is H T H worked through with its pieces.",
      },
      {
        type: "trap",
        body: "Saying every three-flip pattern takes 8 flips. That’s true only for patterns with no overlap, like H H T or H T T. Check for pieces that both start and end the pattern before you use 2³.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "You flip or roll until a particular run appears",
          "Two patterns of the same length are compared, like H T H against H H T",
          "You need `k` successes in a row, which overlaps itself at every length",
        ],
      },
    ],
    targetSeconds: 45,
    example: patternWait({ type: "coin", pattern: "H T H" }),
    families: [
      { id: "fair-coin", title: "Fair coin patterns", generate: (random) => patternWait({ type: "coin", pattern: pick(random, COIN_PATTERNS) }) },
      { id: "die-runs", title: "Runs of die rolls", generate: (random) => patternWait({ type: "die", pattern: pick(random, DIE_PATTERNS) }) },
      {
        id: "biased-coin",
        title: "Patterns with a biased coin",
        generate: (random) => {
          const [headsN, headsD] = pick(random, BIASED_HEADS);
          return patternWait({ type: "biased", pattern: pick(random, BIASED_PATTERNS), headsN, headsD });
        },
      },
      {
        id: "streak",
        title: "k successes in a row",
        generate: (random) => {
          const [pN, pD] = pick(random, STREAK_CHANCES);
          return streak({ pN, pD, k: int(random, 2, 4), context: random() < 0.5 ? "meter" : "throws" });
        },
      },
      {
        id: "even-flips",
        title: "Even or odd number of flips",
        generate: (random) => {
          const [headsN, headsD] = pick(random, EVEN_FLIP_HEADS);
          return evenFlips({ headsN, headsD, ask: random() < 0.6 ? "even" : "odd" });
        },
      },
    ],
  },
  {
    id: "random-walks",
    title: "Random walks",
    benefit: "Find the chance and time to hit a target",
    summary: "The gambler’s ruin: the chance of reaching a target before going broke, and how many bets it takes, for fair and unfair bets.",
    difficulty: "Hard",
    parts: [
      {
        type: "text",
        body: [
          "You have $3 and bet $1 at a time on flips of a fair coin. You stop when you reach $5 or lose everything.",
          "What’s the chance you reach $5?",
        ],
      },
      {
        type: "check",
        prompt: "What’s the chance you reach $5?",
        choices: ["50%", "60%", "40%", "75%"],
        answer: 1,
        explain:
          "It’s 3/5, or 60%. You need a net 2 wins to reach $5 but a net 3 losses to go broke, so the target is the nearer end.",
      },
      {
        type: "story",
        heading: "The average can’t move",
        beats: [
          {
            text: "Each flip moves your money up or down $1, and the game ends at $0 or $5. A sequence of steps like this is called a random walk.",
            visual: {
              type: "states",
              nodes: [
                { id: "0", label: "$0", tone: "hit" },
                { id: "1", label: "$1" },
                { id: "2", label: "$2" },
                { id: "3", label: "$3", tone: "known" },
                { id: "4", label: "$4" },
                { id: "5", label: "$5", tone: "hit" },
              ],
              edges: [
                { from: "3", to: "4", label: "win 1/2" },
                { from: "3", to: "2", label: "lose 1/2" },
              ],
              caption: "You start at $3; the game stops at either orange end",
            },
          },
          {
            text: "A fair bet doesn’t change your money on average. Neither does a string of fair bets, so your average amount when the game stops is still $3.",
            visual: {
              type: "number-line",
              min: 0,
              max: 5,
              ticks: [0, 1, 2, 3, 4, 5],
              shade: [],
              points: [{ at: 3, label: "Average at the end: $3", tone: "known" }],
              caption: "The average stays where you started",
            },
          },
          {
            text: "The game stops with $5 or $0. If `p` is the chance of ending at $5, the average final amount is `5p`. It must equal the $3 you started with: {{5p = 3 → p = 3/5}}",
            visual: {
              type: "number-line",
              min: 0,
              max: 5,
              ticks: [0, 1, 2, 3, 4, 5],
              shade: [],
              points: [
                { at: 0, label: "$0: chance 2/5", tone: "lose" },
                { at: 5, label: "$5: chance 3/5", tone: "win" },
              ],
              caption: "3/5 × $5 + 2/5 × $0 = $3",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "When the bets aren’t fair",
        body: [
          "If each bet wins with chance 2/5, the walk drifts down and 3/5 is too high. Let `r` be the chance of losing a bet divided by the chance of winning it, here `r = 3/2`. Starting with `a` dollars and aiming for `N`, the chance of reaching `N` is {{(rᵃ − 1)/(rᴺ − 1)}}",
          "From $3 aiming for $5, that’s {{(1.5³ − 1)/(1.5⁵ − 1) ≈ 36%}} That’s down from 60% with fair bets. Fair bets also tell you how long the game lasts: `a(N - a)` bets on average, or 3 × 2 = 6 here.",
        ],
      },
      {
        type: "rule",
        name: "Gambler’s ruin",
        lines: [
          { lead: "Start with `a` and bet 1 at a time, winning each bet with probability `p` and losing with probability `q = 1 - p`, until you reach `N` or 0, where `0 < a < N`. With `r = q/p`,", tex: "P(\\text{reach } N) = \\begin{cases} \\dfrac{a}{N} & \\text{if } p = \\tfrac{1}{2} \\\\[2ex] \\dfrac{r^a - 1}{r^N - 1} & \\text{if } p \\ne \\tfrac{1}{2} \\end{cases}" },
          { lead: "For fair bets, the expected number of bets until the game ends is", tex: "E[T] = a\\,(N - a)" },
        ],
        plain: "With fair bets, your chance of reaching the target is your starting amount as a share of the target.",
        note: "With fair bets, `a = 3` and `N = 5`: {{P(reach 5) = 3/5 = 60%}} On average the game lasts this many bets: {{E[T] = 3 × (5 − 3) = 6}}",
      },
      {
        type: "check",
        prompt: "A token starts at 0 and steps left or right with equal chance each turn. How many turns do you expect until it reaches +4 or −2?",
        choices: ["8", "6", "16", "4"],
        answer: 0,
        explain: "It’s a fair walk with 4 steps to one end and 2 to the other, so the average is 4 × 2 = 8 turns. It’s the same game as starting with $2 and aiming for $6.",
      },
      {
        type: "example",
        lead: "Unfair bets: you start with $3, aim for $6, and each bet wins with chance 2/5.",
      },
      {
        type: "trap",
        body: "Using `a/N` when the bets aren’t fair. With a 2/5 chance per bet, starting at $3 and aiming for $6 succeeds only about 23% of the time, well below the 50% that 3 ÷ 6 suggests.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "You bet a fixed amount each round and stop at a target or at zero",
          "A token moves left or right until it hits one of two ends",
          "A game can return to the same score again and again, like deuce in tennis",
        ],
      },
    ],
    targetSeconds: 60,
    example: randomWalk({ start: 3, target: 6, winN: 2, winD: 5, ask: "reach" }),
    families: [
      {
        id: "fair-chance",
        title: "Fair bets: reach the target or go broke",
        generate: (random) => {
          // Up to $8, so every amount fits on the chain of states.
          const target = int(random, 4, 8);
          return randomWalk({ start: int(random, 1, target - 1), target, winN: 1, winD: 2, ask: random() < 0.5 ? "reach" : "broke" });
        },
      },
      {
        id: "unfair-chance",
        title: "Unfair bets: reach the target or go broke",
        generate: (random) =>
          // Redraw the rare long shots (under 1% or over 99%), which don’t type cleanly.
          withinTypingRange(() => {
            const [winN, winD] = pick(random, UNFAIR_ODDS);
            const target = int(random, 4, 8);
            return randomWalk({ start: int(random, 1, target - 1), target, winN, winD, ask: random() < 0.5 ? "reach" : "broke" });
          }),
      },
      {
        id: "fair-duration",
        title: "How long fair betting lasts",
        generate: (random) => {
          const target = int(random, 4, 10);
          return randomWalk({ start: int(random, 1, target - 1), target, winN: 1, winD: 2, ask: "bets" });
        },
      },
      {
        id: "token-walk",
        title: "A token stepping left or right",
        generate: (random) => {
          const up = int(random, 1, 6), down = int(random, 1, 6);
          return randomWalk({ start: down, target: up + down, winN: 1, winD: 2, ask: "walk" });
        },
      },
      {
        id: "deuce",
        title: "Winning from deuce in tennis",
        generate: (random) => {
          const [pN, pD] = pick(random, DEUCE_CHANCES);
          return deuce({ pN, pD, ask: random() < 0.6 ? "win" : "points" });
        },
      },
      {
        id: "lazy-walk",
        title: "A walk that can stay put",
        generate: (random) => {
          const target = int(random, 3, 8);
          const [sN, sD] = pick(random, STAY_CHANCES);
          return lazyWalk({ start: int(random, 1, target - 1), target, sN, sD });
        },
      },
      {
        id: "dice-tokens",
        title: "A token game decided by dice totals",
        generate: (random) =>
          withinTypingRange(() => {
            const [dice, aTotal, bTotal] = pick(random, TOKEN_TOTALS);
            return diceTokens({ tokens: int(random, 2, 4), aTotal, bTotal, dice });
          }),
      },
    ],
  },
  {
    id: "optimal-stopping",
    title: "Optimal stopping",
    benefit: "Decide when to stop and when to go on",
    summary: "How to play reroll and stop-or-continue games well by working back from the last turn, and how to find what those games are worth.",
    difficulty: "Hard",
    parts: [
      {
        type: "text",
        body: [
          "You roll a fair die and are paid its value in dollars. If you don’t like the roll, you may roll once more, but then you must keep the second roll.",
          "Which first rolls should you keep, and what is the game worth?",
        ],
      },
      {
        type: "check",
        prompt: "Which first rolls should you keep?",
        choices: ["4, 5 or 6", "5 or 6", "Only a 6", "3 or more"],
        answer: 0,
        explain: "A second roll is worth $3.50 on average. Keep any first roll that beats that, which means a 4, 5 or 6, and roll again on a 1, 2 or 3.",
      },
      {
        type: "story",
        heading: "Start from the end",
        beats: [
          {
            text: "If you roll again, you’re stuck with whatever comes up. A fresh roll averages {{(1 + 2 + 3 + 4 + 5 + 6)/6 = $3.50}}",
            visual: { type: "die-faces", sides: 6, marks: [], caption: "A fresh roll is worth $3.50" },
          },
          {
            text: "So on the first roll, keep anything worth more than $3.50: a 4, 5 or 6. Reroll the rest.",
            visual: { type: "die-faces", sides: 6, marks: [{ faces: [4, 5, 6], tone: "hit" }, { faces: [1, 2, 3], tone: "muted" }], caption: "Keep 4, 5 or 6" },
          },
          {
            text: "Half the time you keep, and the kept rolls average $5. The other half you reroll, which is worth $3.50. The game is worth {{1/2 × $5 + 1/2 × $3.50 = $4.25}}",
            visual: {
              type: "tree",
              root: {
                label: "First roll",
                children: [
                  { label: "Keep: $5", edge: "1/2", tone: "hit" },
                  { label: "Reroll: $3.50", edge: "1/2", tone: "muted" },
                ],
              },
              caption: "Each branch’s value times its chance",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Work backwards",
        body: [
          "You can put a value on the last decision first, because after it there are no choices left. Once you know what going on is worth, each earlier decision is a comparison: keep what’s in front of you if it beats that number. This method is called backward induction.",
          "With two rerolls, the one-reroll game becomes what rerolling is worth: $4.25. So on the first roll you keep only a 5 or 6, and the game is worth {{1/3 × $5.50 + 2/3 × $4.25 ≈ $4.67}}",
        ],
      },
      {
        type: "rule",
        name: "Backward induction",
        lines: [
          { lead: "Let `X` be the result of one draw, and `V_k` the value of the game with `k` draws left, played well. With one draw left you must keep it, so `V_1 = E[X]`. With more left, keep a draw `x` exactly when `x > V_{k-1}`, so", tex: "V_k = E\\big[\\max(X,\\, V_{k-1})\\big]" },
        ],
        plain: "Work out what going on is worth first, then keep any result that beats it.",
        note: "With one reroll left, `V_1 = E[X] = 3.5`, so you keep a first roll `x` when `x > 3.5`. Half the rolls are kept, and they average 5: {{V₂ = 1/2 × 5 + 1/2 × 3.5 = 4.25}}",
      },
      {
        type: "check",
        prompt: "A computer picks a random number between 0 and 1, and you score that number. You may ask for one new number, but then you must keep it. Above what value should you keep the first number?",
        choices: ["1/2", "3/4", "5/8", "1/3"],
        answer: 0,
        explain: "A new number is worth 1/2 on average, so keep anything above 1/2. Half the time you keep a number that averages 3/4, and half the time you take a new one worth 1/2, so the game is worth {{1/2 × 3/4 + 1/2 × 1/2 = 5/8}}",
      },
      {
        type: "example",
        lead: "Here is the one-reroll die game as a full solution you can step through.",
      },
      {
        type: "trap",
        body: "Keeping anything above the middle of the die, 3.5, however many turns are left. The cutoff is what going on is worth, and it rises with each extra turn: keep 4 or more with one reroll left, but only 5 or more with two.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "You may reroll, redraw or stop, and must keep the final result",
          "You’re asked what a game is worth if you play it well",
          "Each extra roll risks losing everything you’ve built up, and you choose when to stop",
        ],
      },
    ],
    targetSeconds: 45,
    example: optimalStopping({ type: "die", sides: 6, rerolls: 1 }),
    families: [
      { id: "one-reroll", title: "One reroll of a die", generate: (random) => optimalStopping({ type: "die", sides: pick(random, DIE_SIDES), rerolls: 1 }) },
      { id: "two-rerolls", title: "Up to two rerolls", generate: (random) => optimalStopping({ type: "die", sides: pick(random, [4, 6, 8] as const), rerolls: 2 }) },
      {
        id: "redraw-number",
        title: "Redrawing a random number",
        generate: (random) => optimalStopping({ type: "uniform", redraws: random() < 0.6 ? 1 : 2, scale: random() < 0.5 ? 1 : 100 }),
      },
      {
        id: "bust-game",
        title: "When to stop before a bust",
        generate: (random) =>
          pick(random, [
            () => bustGame({ type: "doubles", sides: pick(random, [4, 6, 8] as const) }),
            () => bustGame({ type: "total", total: pick(random, [5, 6, 7, 8, 9] as const) }),
            () => bustGame({ type: "pig", sides: pick(random, [4, 6, 8, 10, 12] as const) }),
          ])(),
      },
      {
        id: "paid-reroll",
        title: "Paying to reroll a die",
        generate: (random) => {
          for (;;) {
            const [costN, costD] = pick(random, PAID_COSTS);
            const sides = pick(random, [6, 8, 10, 12] as const);
            const ask = random() < 0.5 ? "value" : "keep";
            if (ask === "keep" && paidRerollTies(sides, q(costN, costD))) continue;
            return paidReroll({ sides, costN, costD, ask });
          }
        },
      },
    ],
  },
];
