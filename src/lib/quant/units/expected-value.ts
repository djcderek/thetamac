import { add, div, formatDollars, formatFraction, formatResult, mul, pow, q, sub, value } from "../rational";
import { DECK, DIE_SIDES, int, pick, problem, sup, type Card, type QuantLessonDef } from "../build";
import type { CardId, QuantVisual, Tone } from "../visual";

const SUIT_LETTER = { hearts: "H", spades: "S", diamonds: "D", clubs: "C" } as const;
const cardId = (card: Card) => `${card.rank}${SUIT_LETTER[card.suit]}` as CardId;
const cardsWhere = (test: (card: Card) => boolean) => DECK.filter(test).map(cardId);
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const faces = (sides: number, marks: { faces: number[]; tone: Tone }[], caption?: string): QuantVisual => ({
  type: "die-faces",
  sides,
  marks,
  ...(caption ? { caption } : {}),
});

// ─── Expected value ──────────────────────────────────────────────────────────────────────

function weighThePayouts(
  params: { type: "face"; sides: number } | { type: "game"; six: number; five: number; cost: number },
) {
  if (params.type === "face") {
    const { sides } = params;
    const total = (sides * (sides + 1)) / 2;
    const payouts: QuantVisual = {
      type: "bars",
      bars: range(1, sides).map((f) => ({ label: `${f}`, value: f, tone: "win" as Tone, text: `$${f}` })),
      caption: `Each face pays its number, and each comes up 1 time in ${sides}`,
    };
    return problem(
      `face-${sides}`,
      `You roll a fair ${sides}-sided die and are paid the number rolled, in dollars. What's the game worth on average?`,
      q(sides + 1, 2),
      "dollars",
      [
        {
          label: "Each face pays its number",
          work: `1 + 2 + … + ${sides}`,
          result: `${total}`,
          icon: "add",
          explain: `Add up what every face pays: that’s what ${sides} rolls would pay if each face came up once.`,
          visual: payouts,
        },
        {
          label: "Average",
          work: `${total} ÷ ${sides}`,
          icon: "divide",
          explain: `Every face is equally likely, so the average payout is the total ÷ ${sides}.`,
          visual: payouts,
        },
      ],
      params,
      faces(sides, []),
    );
  }
  const { six, five, cost } = params;
  const ev = q(six + five - 4 * cost, 6);
  const game = (sixTone: Tone, fiveTone: Tone, restTone: Tone) =>
    faces(6, [
      { faces: [6], tone: sixTone },
      { faces: [5], tone: fiveTone },
      { faces: [1, 2, 3, 4], tone: restTone },
    ]);
  return problem(
    `game-${six}-${five}-${cost}`,
    `Roll a die: a six wins $${six}, a five wins $${five}, anything else loses $${cost}. What's one roll worth to you on average?`,
    ev,
    "dollars",
    [
      {
        label: "Six",
        work: `$${six} × 1/6`,
        result: formatDollars(q(six, 6)),
        icon: "multiply",
        explain: `A six comes up 1 time in 6 and pays $${six}, so it adds $${six} × 1/6 to the average.`,
        visual: game("win", "muted", "muted"),
      },
      {
        label: "Five",
        work: `$${five} × 1/6`,
        result: formatDollars(q(five, 6)),
        icon: "multiply",
        explain: `A five also comes up 1 time in 6 and pays $${five}.`,
        visual: game("known", "win", "muted"),
      },
      {
        label: "One to four",
        work: `−$${cost} × 4/6`,
        result: formatDollars(q(-4 * cost, 6)),
        icon: "multiply",
        explain: `The other 4 faces each lose $${cost}. Losses count as negative amounts.`,
        visual: game("known", "known", "lose"),
      },
      {
        label: "Average per roll",
        work: `(${six} + ${five} − ${4 * cost}) ÷ 6`,
        icon: "add",
        explain: "Add the three parts. This is what one roll is worth on average, and so a fair price to play.",
        visual: game("win", "win", "lose"),
      },
    ],
    params,
    game("win", "win", "lose"),
  );
}

/** Expected sum or product of two fair n-sided dice. */
function twoDiceAverage(params: { type: "sum" | "product"; sides: number }) {
  const { type, sides } = params;
  const one = q(sides + 1, 2);
  const oneText = formatResult(one, "number");
  const line: QuantVisual = {
    type: "number-line",
    min: 1,
    max: sides,
    ticks: [1, sides],
    shade: [],
    points: [{ at: value(one), label: `Average ${oneText}`, tone: "hit" }],
    caption: `One die lands anywhere from 1 to ${sides}, equally likely`,
  };
  return problem(
    `${type}-${sides}`,
    `You roll two fair ${sides}-sided dice. What's the ${type === "sum" ? "total" : "product of the two numbers"} on average?`,
    type === "sum" ? add(one, one) : mul(one, one),
    "number",
    [
      {
        label: "One die averages",
        work: `(1 + ${sides}) ÷ 2`,
        result: oneText,
        icon: "divide",
        explain: `The faces 1 to ${sides} are spread evenly, so one die averages the midpoint of the lowest and highest.`,
        visual: line,
      },
      type === "sum"
        ? {
            label: "Averages add",
            work: `${oneText} + ${oneText}`,
            icon: "add",
            explain: "The average of a total is the sum of the averages, so add one die’s average twice.",
            visual: { type: "slots", slots: [{ label: "Die 1", value: oneText }, { label: "Die 2", value: oneText }], op: "+" },
          }
        : {
            label: "Independent dice: averages multiply",
            work: `${oneText} × ${oneText}`,
            icon: "multiply",
            explain: "The dice don’t affect each other, so the average of their product is the product of their averages.",
            visual: { type: "slots", slots: [{ label: "Die 1", value: oneText }, { label: "Die 2", value: oneText }], op: "×" },
          },
    ],
    params,
    faces(sides, []),
  );
}

const HEAD_CHANCES = [q(1, 2), q(1, 2), q(2, 3), q(3, 4), q(1, 3), q(3, 5)] as const;

/** Flip until tails, paid per head: heads before the first tails average p ÷ (1 − p). */
function flipUntilTails(params: { headsN: number; headsD: number; pay: number }) {
  const heads = q(params.headsN, params.headsD);
  const tails = sub(q(1), heads);
  const fair = heads.n * 2 === heads.d;
  const perHead = div(heads, tails);
  const run: QuantVisual = {
    type: "coins",
    flips: ["H", "H", "T"],
    tones: ["win", "win", "lose"],
    caption: `For example, H H T pays for 2 heads: $${2 * params.pay}`,
  };
  return problem(
    `tails-${params.headsN}-${params.headsD}-${params.pay}`,
    `You flip ${fair ? "a fair coin" : `a coin that lands heads with chance ${formatFraction(heads)}`} until it lands tails, and win $${params.pay} for each head before that. What's the game worth on average?`,
    mul(perHead, q(params.pay)),
    "dollars",
    [
      {
        label: "Average heads before tails: heads ÷ tails chance",
        work: `${formatFraction(heads)} ÷ ${formatFraction(tails)}`,
        result: formatResult(perHead, "number"),
        icon: "divide",
        explain: `Each flip ends the game with chance ${formatFraction(tails)}. On average you get heads ÷ tails chance heads before that happens.`,
        visual: run,
      },
      {
        label: `$${params.pay} for each`,
        work: `$${params.pay} × ${formatResult(perHead, "number")}`,
        icon: "multiply",
        explain: `Each head pays $${params.pay}, so multiply the average number of heads by $${params.pay}.`,
        visual: run,
      },
    ],
    params,
    run,
  );
}

/** A card game's fair price: what it pays on average. */
function cardPrice(params: { ace: number; face: number }) {
  const { ace, face } = params;
  const aces = cardsWhere((c) => c.rank === 1);
  const faceCards = cardsWhere((c) => c.rank >= 11);
  const deck = (aceTone: Tone, faceTone: Tone): QuantVisual => ({
    type: "cards",
    marks: [
      { cards: aces, tone: aceTone },
      { cards: faceCards, tone: faceTone },
    ],
  });
  return problem(
    `price-${ace}-${face}`,
    `You draw one card from a shuffled deck. An ace pays $${ace}, a face card (J, Q or K) pays $${face}, and anything else pays nothing. What's a fair price to play?`,
    q(4 * ace + 12 * face, 52),
    "dollars",
    [
      {
        label: "Ace",
        work: `$${ace} × 4/52`,
        result: formatDollars(q(4 * ace, 52)),
        icon: "multiply",
        explain: `4 of the 52 cards are aces, each paying $${ace}.`,
        visual: deck("hit", "muted"),
      },
      {
        label: "Face card",
        work: `$${face} × 12/52`,
        result: formatDollars(q(12 * face, 52)),
        icon: "multiply",
        explain: `12 of the 52 cards are face cards, each paying $${face}. The other 36 cards pay nothing, so they add $0.`,
        visual: deck("known", "alt"),
      },
      {
        label: "Fair price is the average payout",
        work: `(${4 * ace} + ${12 * face}) ÷ 52`,
        icon: "add",
        explain: "A fair price is one where you break even on average, which is the average payout.",
        visual: deck("hit", "alt"),
      },
    ],
    params,
    deck("hit", "alt"),
  );
}

// ─── Linearity of expectation ────────────────────────────────────────────────────────────

function addTheAverages(
  params:
    | { type: "dice-total"; dice: number }
    | { type: "sixes"; rolls: number }
    | { type: "hearts"; cards: number }
    | { type: "aces"; cards: number }
    | { type: "envelopes"; letters: number },
) {
  switch (params.type) {
    case "dice-total": {
      const parts: QuantVisual = {
        type: "bars",
        bars: range(1, params.dice).map((d) => ({ label: `Die ${d}`, value: 3.5, tone: "hit" as Tone, text: "3.5" })),
        caption: "Each die adds 3.5 to the average total",
      };
      return problem(
        `total-${params.dice}`,
        `You roll ${params.dice} fair dice. What's the expected total?`,
        q(7 * params.dice, 2),
        "number",
        [
          {
            label: "One die averages",
            work: "(1 + 2 + … + 6) ÷ 6",
            result: "3.5",
            icon: "divide",
            explain: "One die’s faces add up to 21, and each is equally likely, so one die averages 21 ÷ 6.",
            visual: faces(6, [{ faces: range(1, 6), tone: "hit" }]),
          },
          {
            label: `${params.dice} dice`,
            work: `${params.dice} × 3.5`,
            icon: "add",
            explain: "The total is the dice added up, so its average is the dice’s averages added up.",
            visual: parts,
          },
        ],
        params,
        faces(6, []),
      );
    }
    case "sixes": {
      const six = faces(6, [{ faces: [6], tone: "hit" }], "Each roll is a six 1 time in 6");
      return problem(
        `sixes-${params.rolls}`,
        `You roll a fair die ${params.rolls} times. How many sixes do you expect?`,
        q(params.rolls, 6),
        "number",
        [
          {
            label: "Each roll is a six",
            work: "1 time in 6",
            result: "1/6",
            icon: "split",
            explain: "Split the count into one yes-or-no piece per roll: “was this roll a six?” Each piece averages its chance, 1/6.",
            visual: six,
          },
          {
            label: `${params.rolls} rolls`,
            work: `${params.rolls} × 1/6`,
            icon: "add",
            explain: `Add the ${params.rolls} pieces: the number of sixes is their total.`,
            visual: six,
          },
        ],
        params,
        faces(6, []),
      );
    }
    case "hearts":
    case "aces": {
      const share = params.type === "hearts" ? q(13, 52) : q(4, 52);
      const one = params.type === "hearts" ? "a heart" : "an ace";
      const deck: QuantVisual = {
        type: "cards",
        marks: [{ cards: cardsWhere(params.type === "hearts" ? (c) => c.suit === "hearts" : (c) => c.rank === 1), tone: "hit" }],
      };
      return problem(
        `${params.type}-${params.cards}`,
        `You deal ${params.cards} cards from a shuffled deck. How many ${params.type} do you expect?`,
        mul(q(params.cards), share),
        "number",
        [
          {
            label: `Each card is ${one}`,
            work: params.type === "hearts" ? "13 of 52" : "4 of 52",
            result: formatFraction(share),
            icon: "split",
            explain: `Ask of each dealt card: “is it ${one}?” Any single card is ${one} with chance ${formatFraction(share)}, whatever the others are.`,
            visual: deck,
          },
          {
            label: `In ${params.cards} cards`,
            work: `${params.cards} × ${formatFraction(share)}`,
            icon: "add",
            explain: "The cards depend on each other, but averages still add. Add one chance per card.",
            visual: deck,
          },
        ],
        params,
        deck,
      );
    }
    case "envelopes": {
      const letters: QuantVisual = {
        type: "bars",
        bars: range(1, params.letters).map((l) => ({ label: `${l}`, value: 1, tone: "hit" as Tone })),
        caption: `Each of the ${params.letters} letters lands in its own envelope with chance 1/${params.letters}`,
      };
      return problem(
        `envelopes-${params.letters}`,
        `${params.letters} letters go into their ${params.letters} addressed envelopes at random, one each. How many do you expect in the right envelope?`,
        q(1),
        "number",
        [
          {
            label: "Each letter is right",
            work: `1 time in ${params.letters}`,
            result: `1/${params.letters}`,
            icon: "split",
            explain: `Ask of each letter: “is it in its own envelope?” Any one letter is equally likely to be in any of the ${params.letters} envelopes.`,
            visual: letters,
          },
          {
            label: `${params.letters} letters`,
            work: `${params.letters} × 1/${params.letters}`,
            icon: "add",
            explain: "Add one chance per letter. The answer is 1 however many letters there are.",
            visual: letters,
          },
        ],
        params,
        letters,
      );
    }
  }
}

const FIRST_CARDS = [
  { id: "ace", one: "ace", many: "aces", count: 4, test: (c: Card) => c.rank === 1 },
  { id: "king", one: "king", many: "kings", count: 4, test: (c: Card) => c.rank === 13 },
  { id: "heart", one: "heart", many: "hearts", count: 13, test: (c: Card) => c.suit === "hearts" },
  { id: "face", one: "face card", many: "face cards", count: 12, test: (c: Card) => c.rank >= 11 },
  { id: "spade", one: "spade", many: "spades", count: 13, test: (c: Card) => c.suit === "spades" },
];

/** Where the first of t target cards turns up: each other card comes before all of them 1 time in t + 1. */
function firstCard(params: { card: string }) {
  const card = FIRST_CARDS.find((c) => c.id === params.card)!;
  const t = card.count;
  const before = q(52 - t, t + 1);
  const deck = (otherTone: Tone): QuantVisual => ({
    type: "cards",
    marks: [
      { cards: cardsWhere((c) => !card.test(c)), tone: otherTone },
      { cards: cardsWhere(card.test), tone: "hit" },
    ],
  });
  return problem(
    `first-${card.id}`,
    `You turn over the cards of a shuffled deck one at a time. On average, at which card does the first ${card.one} appear?`,
    add(q(1), before),
    "number",
    [
      {
        label: `Each other card comes before all ${t} ${card.many}`,
        work: `1 time in ${t + 1}`,
        result: `1/${t + 1}`,
        icon: "split",
        explain: `The ${t} ${card.many} split the deck into ${t + 1} gaps. Any other card is equally likely to be in each gap, and only the first gap is before them all.`,
        visual: deck("known"),
      },
      {
        label: `Other cards before the first ${card.one}`,
        work: `${52 - t} × 1/${t + 1}`,
        result: formatResult(before, "number"),
        icon: "add",
        explain: `Add one chance for each of the ${52 - t} other cards to count how many come first, on average.`,
        visual: deck("known"),
      },
      {
        label: `The first ${card.one}’s position`,
        work: `1 + ${formatResult(before, "number")}`,
        icon: "add",
        explain: `The first ${card.one} comes right after those cards, so add 1 for the ${card.one} itself.`,
        visual: deck("muted"),
      },
    ],
    params,
    deck("muted"),
  );
}

/** Distinct picks among n equally likely options in k tries: n × (1 − (1 − 1/n)^k). */
function distinctPicks(params: { type: "elevator" | "faces"; options: number; tries: number }) {
  const { type, options: n, tries: k } = params;
  const none = pow(q(n - 1, n), k);
  const hit = sub(q(1), none);
  const prompt =
    type === "elevator"
      ? `${k} people get into an elevator. Each picks one of ${n} floors at random. How many different floors do you expect it to stop at?`
      : `You roll a fair ${n}-sided die ${k} times. How many different numbers do you expect to see?`;
  const one = type === "elevator" ? "floor" : "number";
  const picked = type === "elevator" ? "picked" : "rolled";
  const each = (chance: typeof none, tone: Tone, caption: string): QuantVisual => ({
    type: "bars",
    bars: range(1, n).map((i) => ({
      label: type === "elevator" ? `Floor ${i}` : `${i}`,
      value: value(chance),
      tone,
      text: formatFraction(chance),
    })),
    caption,
  });
  return problem(
    `${type}-${n}-${k}`,
    prompt,
    mul(q(n), hit),
    "number",
    [
      // Exact fractions, so each line's arithmetic matches the answer.
      {
        label: `A given ${one} is never ${picked}`,
        work: `(${n - 1}/${n})${sup(k)}`,
        result: formatFraction(none),
        icon: "multiply",
        explain: `Each of the ${k} ${type === "elevator" ? "people" : "rolls"} misses a given ${one} with chance ${n - 1}/${n}, so multiply that ${k} times.`,
        visual: each(none, "muted", `Chance each ${one} is never ${picked}`),
      },
      {
        label: `A given ${one} is ${picked} at least once`,
        work: `1 − ${formatFraction(none)}`,
        result: formatFraction(hit),
        icon: "subtract",
        explain: `Either a ${one} is never ${picked} or it is ${picked} at least once, so take the first chance away from 1.`,
        visual: each(hit, "hit", `Chance each ${one} is ${picked} at least once`),
      },
      {
        label: `Across all ${n} ${one}s`,
        work: `${n} × ${formatFraction(hit)}`,
        icon: "add",
        explain: `The number of different ${one}s is one yes-or-no piece per ${one}. Add the ${n} equal chances.`,
        visual: each(hit, "hit", `Add one chance per ${one}`),
      },
    ],
    params,
    type === "faces" ? faces(n, []) : each(q(1, n), "muted", `${n} floors, each equally likely for each person`),
  );
}

// ─── Variance and standard deviation ─────────────────────────────────────────────────────

/** A slot line: "One flip 3/16 × 48 flips". */
const times = (a: { label: string; value: string }, b: { label: string; value: string }): QuantVisual => ({
  type: "slots",
  slots: [a, b],
  op: "×",
});

function variance(
  params:
    | { type: "die"; sides: number }
    | { type: "dice-sum"; dice: number }
    | { type: "heads"; flips: number; headsN: number; headsD: number }
    | { type: "heads-sd"; flips: number }
    | { type: "bet"; win: number; lose: number; chanceN: number; chanceD: number },
) {
  switch (params.type) {
    case "die": {
      const n = params.sides;
      const squares = q((n + 1) * (2 * n + 1), 6);
      const mean = q(n + 1, 2);
      const result = sub(squares, mul(mean, mean));
      const sd = Math.sqrt(value(result));
      const squareBars: QuantVisual = {
        type: "bars",
        bars: range(1, n).map((f) => ({ label: `${f}`, value: f * f, tone: "alt" as Tone, ...(n <= 12 ? { text: `${f * f}` } : {}) })),
        caption: "The square of each face",
      };
      return problem(
        `die-${n}`,
        `You roll a fair ${n}-sided die once. What's the variance of the number rolled?`,
        result,
        "number",
        [
          {
            label: "Average of the squares",
            work: `(1² + 2² + … + ${n}²) ÷ ${n}`,
            result: formatResult(squares, "number"),
            icon: "multiply",
            explain: "Square every face, then average the squares. Each face is equally likely.",
            visual: squareBars,
          },
          {
            label: "Square of the average",
            work: `${formatResult(mean, "number")}²`,
            result: formatResult(mul(mean, mean), "number"),
            icon: "multiply",
            explain: `The average face is ${formatResult(mean, "number")}. Square it.`,
            visual: {
              type: "number-line",
              min: 1,
              max: n,
              ticks: [1, n],
              shade: [],
              points: [{ at: value(mean), label: `Average ${formatResult(mean, "number")}`, tone: "hit" }],
            },
          },
          {
            label: "Variance",
            work: `${formatResult(squares, "number")} − ${formatResult(mul(mean, mean), "number")}`,
            icon: "subtract",
            explain: "The variance is the average of the squares minus the square of the average. Its square root, the standard deviation, is the typical distance from the average.",
            visual: {
              type: "number-line",
              min: 1,
              max: n,
              ticks: [1, n],
              shade: [{ from: value(mean) - sd, to: value(mean) + sd, tone: "hit", text: "1 SD each side" }],
              points: [{ at: value(mean), label: `Average ${formatResult(mean, "number")}`, tone: "hit" }],
            },
          },
        ],
        params,
        faces(n, []),
      );
    }
    case "dice-sum": {
      const one = q(35, 12);
      const parts: QuantVisual = {
        type: "bars",
        bars: range(1, params.dice).map((d) => ({ label: `Die ${d}`, value: value(one), tone: "hit" as Tone, text: "35/12" })),
        caption: "Independent dice: their variances add",
      };
      return problem(
        `dice-sum-${params.dice}`,
        `You roll ${params.dice} fair dice. What's the variance of the total?`,
        mul(q(params.dice), one),
        "number",
        [
          {
            label: "One die’s variance",
            work: "91/6 − 3.5²",
            result: "35/12",
            icon: "subtract",
            explain: "For one die, the squares 1, 4, … 36 average 91/6 and the average is 3.5. Subtract the squared average.",
            visual: faces(6, [{ faces: range(1, 6), tone: "alt" }]),
          },
          {
            label: "Variances of independent dice add",
            work: `${params.dice} × 35/12`,
            icon: "add",
            explain: "The dice don’t affect each other, so the variance of the total is one die’s variance added for each die.",
            visual: parts,
          },
        ],
        params,
        faces(6, []),
      );
    }
    case "heads": {
      const p = q(params.headsN, params.headsD);
      const one = mul(p, sub(q(1), p));
      const fair = p.n * 2 === p.d;
      return problem(
        `heads-${params.flips}-${params.headsN}-${params.headsD}`,
        fair
          ? `You flip a fair coin ${params.flips} times. What's the variance of the number of heads?`
          : `A coin lands heads with chance ${formatFraction(p)}. You flip it ${params.flips} times. What's the variance of the number of heads?`,
        mul(q(params.flips), one),
        "number",
        [
          {
            label: "One flip’s variance",
            work: `${formatFraction(p)} × ${formatFraction(sub(q(1), p))}`,
            result: formatFraction(one),
            icon: "multiply",
            explain: "One flip counts 1 head or 0. For a yes-or-no count, the variance is the chance of yes times the chance of no.",
            visual: { type: "coins", flips: ["H"], tones: ["hit"], caption: `Heads with chance ${formatFraction(p)}` },
          },
          {
            label: `${params.flips} independent flips add`,
            work: `${params.flips} × ${formatFraction(one)}`,
            icon: "add",
            explain: "The flips don’t affect each other, so their variances add: one flip’s variance for each flip.",
            visual: times({ label: "One flip", value: formatFraction(one) }, { label: "Flips", value: `${params.flips}` }),
          },
        ],
        params,
        { type: "coins", flips: ["?", "?", "?", "?", "?", "?"], caption: `${params.flips} flips` },
      );
    }
    case "heads-sd": {
      const n = params.flips;
      return problem(
        `heads-sd-${n}`,
        `You flip a fair coin ${n} times. What's the standard deviation of the number of heads?`,
        q(Math.sqrt(n) / 2),
        "number",
        [
          {
            label: "Variance",
            work: `${n} × 1/2 × 1/2`,
            result: `${n / 4}`,
            icon: "multiply",
            explain: "Each fair flip has variance 1/2 × 1/2 = 1/4, and independent flips add their variances.",
            visual: times({ label: "One flip", value: "1/4" }, { label: "Flips", value: `${n}` }),
          },
          {
            label: "Standard deviation is its square root",
            work: `√${n / 4}`,
            icon: "check",
            explain: "The standard deviation is the square root of the variance, which puts it back in heads rather than heads squared.",
            visual: {
              type: "number-line",
              min: 0,
              max: n,
              ticks: [0, n / 2, n],
              shade: [{ from: n / 2 - Math.sqrt(n) / 2, to: n / 2 + Math.sqrt(n) / 2, tone: "hit", text: "1 SD each side" }],
              points: [{ at: n / 2, label: `Average ${n / 2}`, tone: "hit" }],
            },
          },
        ],
        params,
        { type: "coins", flips: ["?", "?", "?", "?", "?", "?"], caption: `${n} fair flips` },
      );
    }
    case "bet": {
      const { win, lose } = params;
      const p = q(params.chanceN, params.chanceD);
      const miss = sub(q(1), p);
      const mean = sub(mul(p, q(win)), mul(miss, q(lose)));
      const squares = add(mul(p, q(win * win)), mul(miss, q(lose * lose)));
      const outcomes = (squared: boolean): QuantVisual => ({
        type: "bars",
        bars: [
          { label: `Win $${win}`, value: squared ? win * win : win, tone: "win", text: squared ? `${win}², chance ${formatFraction(p)}` : `chance ${formatFraction(p)}` },
          { label: `Lose $${lose}`, value: squared ? lose * lose : lose, tone: "lose", text: squared ? `${lose}², chance ${formatFraction(miss)}` : `chance ${formatFraction(miss)}` },
        ],
        caption: squared ? "Each outcome squared" : `Average result: ${formatResult(mean, "number")}`,
      });
      return problem(
        `bet-${win}-${lose}-${params.chanceN}-${params.chanceD}`,
        `A bet wins $${win} with chance ${formatFraction(p)} and loses $${lose} otherwise. What's the variance of what you make, in squared dollars?`,
        sub(squares, mul(mean, mean)),
        "number",
        [
          {
            label: "Average",
            work: `${formatFraction(p)} × ${win} − ${formatFraction(miss)} × ${lose}`,
            result: formatResult(mean, "number"),
            icon: "multiply",
            explain: "Weight each result by its chance and add, counting the loss as negative.",
            visual: outcomes(false),
          },
          {
            label: "Average of the squares",
            work: `${formatFraction(p)} × ${win}² + ${formatFraction(miss)} × ${lose}²`,
            result: formatResult(squares, "number"),
            icon: "multiply",
            explain: "Square each result first, then weight by its chance. Squares are never negative.",
            visual: outcomes(true),
          },
          {
            label: "Variance",
            work: `${formatResult(squares, "number")} − (${formatResult(mean, "number")})²`,
            icon: "subtract",
            explain: "The variance is the average of the squares minus the square of the average.",
            visual: outcomes(true),
          },
        ],
        params,
        outcomes(false),
      );
    }
  }
}

export const EXPECTED_VALUE_LESSONS: QuantLessonDef[] = [
  {
    id: "expected-value",
    title: "Expected value",
    benefit: "Find the average result of a game",
    idea: "Multiply each result by its chance and add them up. That’s what the game pays on average, and a fair price to play it.",
    difficulty: "Easy",
    intro:
      "If you played a game many times, each result would come up in proportion to its chance. Multiplying each result by its chance and adding them gives what you’d make per game on average. That average is also the fair price to play.",
    formula: "Expected value = sum of (each result × its chance)",
    cues: ["The question asks what a game is “worth” or a “fair price”", "It asks for an average or expected amount"],
    mistake: "Leaving out the losing results, or adding the payouts without multiplying each by its chance.",
    targetSeconds: 30,
    example: weighThePayouts({ type: "game", six: 12, five: 6, cost: 2 }),
    generate: (random) =>
      pick(random, [
        () => weighThePayouts({ type: "face", sides: pick(random, DIE_SIDES) }),
        () =>
          weighThePayouts({
            type: "game",
            six: pick(random, [6, 8, 10, 12, 15, 18, 20]),
            five: pick(random, [1, 2, 3, 4, 5, 6]),
            cost: int(random, 1, 4),
          }),
        () => twoDiceAverage({ type: random() < 0.5 ? "sum" : "product", sides: pick(random, DIE_SIDES) }),
        () => {
          const heads = pick(random, HEAD_CHANCES);
          return flipUntilTails({ headsN: heads.n, headsD: heads.d, pay: pick(random, [1, 2, 5, 10]) });
        },
        () => cardPrice({ ace: pick(random, [5, 10, 13, 20, 26]), face: pick(random, [1, 2, 3, 5]) }),
      ])(),
  },
  {
    id: "linearity",
    title: "Linearity of expectation",
    benefit: "Find an average by adding simple parts",
    idea: "The average of a total is the averages of its parts added up, even when the parts affect each other. Split a count into yes-or-no pieces and add their chances.",
    difficulty: "Medium",
    intro:
      "To find the average of a count, split it into yes-or-no pieces: is this card an ace, does the elevator stop at this floor. A yes-or-no piece averages its own chance, and averages simply add, even when the pieces depend on each other. So you never need the full distribution.",
    formula: "Average total = sum of the parts’ averages; a yes-or-no part averages its chance",
    cues: [
      "The question asks “how many … do you expect”",
      "The parts depend on each other, so listing every outcome would be hard",
    ],
    mistake: "Thinking you can’t add averages when the parts affect each other. You can: it always works.",
    targetSeconds: 30,
    example: addTheAverages({ type: "aces", cards: 5 }),
    generate: (random) =>
      pick(random, [
        () => addTheAverages({ type: "dice-total", dice: int(random, 3, 12) }),
        () => addTheAverages({ type: "sixes", rolls: pick(random, [9, 10, 15, 20, 30, 50]) }),
        () => addTheAverages({ type: "hearts", cards: int(random, 3, 13) }),
        () => addTheAverages({ type: "aces", cards: int(random, 3, 13) }),
        () => addTheAverages({ type: "envelopes", letters: int(random, 4, 20) }),
        () => firstCard({ card: pick(random, FIRST_CARDS).id }),
        () => distinctPicks({ type: "elevator", options: int(random, 3, 6), tries: int(random, 2, 4) }),
        () => distinctPicks({ type: "faces", options: pick(random, [4, 6]), tries: int(random, 2, 4) }),
      ])(),
  },
  {
    id: "variance",
    title: "Variance and standard deviation",
    benefit: "Measure how spread out results are",
    idea: "Variance is the average of the squares minus the square of the average. For independent parts, variances add. The standard deviation is the square root of the variance.",
    difficulty: "Medium",
    intro:
      "Variance measures how far results land from the average, by averaging the squared distances. The quick way to work it out is the average of the squares minus the square of the average. Parts that don’t affect each other add their variances, and the square root, the standard deviation, is back in the original units.",
    formula: "Variance = average of the squares − (the average)²; SD = √variance",
    cues: ["The question asks for a variance or standard deviation", "It asks how spread out or how risky a result is"],
    mistake: "Adding the standard deviations of independent parts. Add their variances, then take the square root.",
    targetSeconds: 45,
    example: variance({ type: "die", sides: 6 }),
    generate: (random) =>
      pick(random, [
        () => variance({ type: "die", sides: pick(random, DIE_SIDES) }),
        () => variance({ type: "dice-sum", dice: int(random, 2, 10) }),
        () => {
          const p = pick(random, [q(1, 2), q(1, 3), q(1, 4), q(2, 3), q(3, 4)]);
          return variance({ type: "heads", flips: pick(random, [10, 12, 20, 30, 36, 48, 60]), headsN: p.n, headsD: p.d });
        },
        () => variance({ type: "heads-sd", flips: pick(random, [16, 36, 64, 100, 144, 400]) }),
        () => {
          const p = pick(random, [q(1, 2), q(1, 3), q(1, 4), q(2, 5)]);
          return variance({ type: "bet", win: pick(random, [1, 2, 3, 5]), lose: pick(random, [1, 2]), chanceN: p.n, chanceD: p.d });
        },
      ])(),
  },
];
