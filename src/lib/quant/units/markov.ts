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
    prompt: "You flip a fair coin until you've seen both heads and tails. How many flips do you expect it to take?",
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
    prompt: "You draw a card, note its suit, and put it back, until you've seen all four suits. How many draws do you expect it to take?",
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
        explain: `Split the wait into stages, one per new ${one}. With k already seen, ${n} − k of the ${n} are new, so each try finds one with chance (${n} − k) ÷ ${n}.`,
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
        explain: "The total wait is the waits for each stage added together.",
        visual: waits,
      },
    ],
    { collection: collection.id, sides: n },
    types([], `Each box is one ${one}. You need to see all ${n}.`),
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
  const piecesExplain = `The pattern can restart inside itself. Look for each piece that is both how the pattern starts and how it ends; the whole pattern always counts.`;

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
        explain: `A piece of length k comes up with chance 1 ÷ ${base}ᵏ, so it adds ${base}ᵏ ${flipWord}s to the wait.`,
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
  const prompt = `You have $${start} and bet $1 at a time on ${chanceText}. You stop when you reach $${target} or go broke. What's the chance you ${ask === "reach" ? `reach $${target}` : "go broke"}?`;
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
      explain: `r says how strongly the bets lean against you. Above 1, each bet is more likely to lose than win.`,
    });
    steps.push({
      label: `Chance to reach $${target}`,
      work: `(r${sup(start)} − 1) ÷ (r${sup(target)} − 1)`,
      result: formatFraction(reach),
      icon: "target",
      explain: `Raise r to your starting amount and to the target, take 1 off each, and divide. This comes from solving the chance from every amount at once.`,
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
            ? "Start from the end. If you roll again you must keep it, so rolling again is worth an average roll."
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
        explain: "Split by what the first roll does: keep it (average of the kept faces) or go on (what going on is worth), each times its chance.",
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
    ? `You're paid a random amount between $0 and $100, every amount equally likely. After seeing it you may redraw ${again}, but you must keep the last draw. Playing well, what's the game worth?`
    : `A computer picks a random number between 0 and 1, and you score that number. After seeing it you may ask for a new number ${again}, but you must keep the last one. Playing well, what's your average score?`;
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
        explain: "Split by what the first draw does: keep it (its average in the keep stretch) or go on (what going on is worth), each times its chance.",
      },
    ],
    params,
    line([], money ? "Every amount from $0 to $100 is equally likely." : "Every number from 0 to 1 is equally likely."),
  );
}

export const STATES_LESSONS: QuantLessonDef[] = [
  {
    id: "coupon-collector",
    title: "Collecting every type",
    benefit: "Find how long until you’ve seen them all",
    idea: "Once you’ve seen k of the n types, a new one turns up with chance (n − k) ÷ n, so it takes n ÷ (n − k) tries on average. Add these waits up.",
    difficulty: "Medium",
    intro:
      "Split the wait into stages: waiting for the 1st new type, then the 2nd, and so on. Each stage is a simple wait for one thing with a fixed chance, so it takes 1 ÷ that chance tries. The early stages are quick; the last few are slow, because almost every try shows something you’ve already seen.",
    formula: "Average tries = n × (1 + 1/2 + 1/3 + … + 1/n)",
    cues: [
      "The question asks how long until you’ve seen every face, toy or type",
      "Each try gives one of n equally likely types, with repeats allowed",
    ],
    mistake: "Answering n tries. You only need n tries if you never see a repeat; repeats make the real wait much longer.",
    targetSeconds: 45,
    example: collectThemAll({ collection: "die-6" }),
    generate: (random) => collectThemAll({ collection: pick(random, COLLECTIONS).id }),
  },
  {
    id: "patterns",
    title: "Patterns in a row",
    benefit: "Find the wait for a run like HTH",
    idea: "Find every piece where the pattern’s start matches its end, including the whole pattern. The average wait is 1 ÷ the chance of each piece, added up. For a fair coin, a piece of length k adds 2ᵏ.",
    difficulty: "Hard",
    intro:
      "Every 3-flip run has the same chance, 1/8, at any spot. But a pattern that overlaps itself, like H T H, comes in clumps: one H T H can share its last H with the next. Clumps leave longer gaps between them, so the wait for the first one is longer. Each overlap adds to the wait.",
    formula: "Average wait = sum of 1 ÷ P(piece) for each piece that is both start and end",
    cues: [
      "You flip or roll until a run of results comes up in a row",
      "Two patterns of the same length are compared, like HTH and HHT",
    ],
    mistake: "Thinking every 3-flip pattern takes 8 flips. Only patterns with no overlap, like H H T, take 8; H T H takes 10 and H H H takes 14.",
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
    difficulty: "Hard",
    intro:
      "In a fair game your money stays the same on average, even at the end. The game ends at $0 or the target, so the chance of reaching the target has to make the average ending amount equal what you started with. Unfair bets drag you towards one end, and r measures how hard.",
    formula: "Fair: P(reach N from a) = a ÷ N, average bets = a × (N − a)",
    cues: [
      "You bet $1 at a time and stop at a target or at $0",
      "A token steps left or right until it hits one of two ends",
    ],
    mistake: "Using a ÷ N when the bets aren’t fair. Even a small edge against you makes the target much less likely than a ÷ N.",
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
    difficulty: "Hard",
    intro:
      "On the last turn you have no choice, so that turn is worth an average result. Knowing that, the turn before has a clear rule: keep anything better than the average of going on, and go on otherwise. Work backwards one turn at a time until you reach the first.",
    formula: "Value = P(keep) × average kept result + P(go on) × value of going on",
    cues: [
      "You may reroll, redraw or stop, and must keep the last result",
      "The question asks what the game is worth if you play well",
    ],
    mistake: "Keeping anything above the middle face. The cutoff is what going on is worth, which rises when you have more turns left.",
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
