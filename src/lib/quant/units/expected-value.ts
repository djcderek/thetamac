import { add, div, formatDollars, formatFraction, formatResult, mul, pow, q, sub, value } from "../rational";
import { DECK, DIE_SIDES, choose, int, pick, problem, sup, type Card, type QuantLessonDef } from "../build";
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


/** Flip until tails; n flips pay 2ⁿ dollars, but never more than the cap. */
function cappedDoubling(params: { cap: number }) {
  const { cap } = params;
  // m = the most flips that still pay in full (2^m ≤ cap).
  const m = Math.floor(Math.log2(cap) + 1e-9);
  const tail = mul(q(cap), pow(q(1, 2), m));
  const answer = add(q(m), tail);
  const bars: QuantVisual = {
    type: "bars",
    bars: range(1, m + 2).map((n) => ({
      label: `${n}`,
      value: Math.min(2 ** n, cap),
      tone: (2 ** n <= cap ? "win" : "alt") as Tone,
      ...(m + 2 <= 8 ? { text: `$${Math.min(2 ** n, cap)}` } : {}),
    })),
    caption: "Prize by number of flips (the last flip is the tails)",
  };
  return problem(
    `capped-${cap}`,
    `You flip a fair coin until it lands tails. If that takes n flips, counting the tails, you win $2ⁿ, but never more than $${cap}. What's the game worth on average?`,
    answer,
    "dollars",
    [
      {
        label: `Games that pay in full: n = 1 to ${m}`,
        work: `${m} × (1/2ⁿ × $2ⁿ)`,
        result: `$${m}`,
        icon: "multiply",
        explain: `A game of n flips happens with chance 1/2ⁿ and pays $2ⁿ, so each of these ${m} lengths adds exactly $1 to the average.`,
        visual: bars,
      },
      {
        label: `Longer games pay the $${cap} cap`,
        work: `$${cap} × (1/2)${sup(m)}`,
        result: formatDollars(tail),
        icon: "multiply",
        explain: `The game lasts more than ${m} flips only if the first ${m} are all heads, chance (1/2)${sup(m)}. Every one of those pays $${cap}.`,
        visual: bars,
      },
      {
        label: "Average prize",
        work: `$${m} + ${formatDollars(tail)}`,
        icon: "add",
        explain: "Every game is either short enough to pay in full or long enough to hit the cap, so add the two parts.",
        visual: bars,
      },
    ],
    params,
    { type: "coins", flips: ["H", "H", "T"], tones: ["muted", "muted", "lose"], caption: "For example, H H T is 3 flips: $8" },
  );
}

/** One of n boxes holds the prize; open them in turn, paying each time, until you find it. */
function openBoxes(params: { boxes: number; prize: number; ask: "boxes" | "price" }) {
  const { boxes: n, prize, ask } = params;
  const average = q(n + 1, 2);
  const figure: QuantVisual = {
    type: "bars",
    bars: range(1, n).map((k) => ({ label: `${k}`, value: k, tone: "alt" as Tone, ...(n <= 10 ? { text: `1/${n}` } : {}) })),
    caption: `Boxes opened if the prize is in box k, each equally likely`,
  };
  const steps: Parameters<typeof problem>[4] = [
    {
      label: "Average boxes opened",
      work: `(1 + 2 + … + ${n}) ÷ ${n} = (${n} + 1) ÷ 2`,
      result: formatResult(average, "number"),
      icon: "divide",
      explain: `The prize is equally likely to be in the 1st, 2nd, … or ${n}th box you open, and you stop there. So you open the middle position on average.`,
      visual: figure,
    },
  ];
  if (ask === "price") {
    steps.push({
      label: "Break even: price × boxes = prize",
      work: `$${prize} ÷ ${formatResult(average, "number")}`,
      icon: "divide",
      explain: `You always win $${prize} in the end. You break even when what you pay on average, price × ${formatResult(average, "number")} boxes, equals that.`,
      visual: figure,
    });
  }
  return problem(
    `boxes-${n}-${prize}-${ask}`,
    ask === "boxes"
      ? `There are ${n} closed boxes and one holds $${prize}. You open them one at a time, in a random order, until you find the money. How many boxes do you expect to open?`
      : `There are ${n} closed boxes and one holds $${prize}. You pay the same price to open each box, one at a time, until you find the money. What price per box makes the game fair?`,
    ask === "boxes" ? average : div(q(prize), average),
    ask === "boxes" ? "number" : "dollars",
    steps,
    params,
    figure,
  );
}

/** What it's worth to know the outcome before choosing. */
function valueOfInformation(params: { type: "box"; high: number; low: number; sure: number } | { type: "doors"; doors: number; prize: number }) {
  if (params.type === "doors") {
    const { doors, prize } = params;
    const blind = q(prize, doors);
    return problem(
      `doors-${doors}-${prize}`,
      `On a game show, $${prize} is behind one of ${doors} doors and the rest are empty. You pick one door and win what's behind it. How much would goggles that let you see through the doors first be worth to you?`,
      sub(q(prize), blind),
      "dollars",
      [
        {
          label: "Without the goggles",
          work: `$${prize} × 1/${doors}`,
          result: formatDollars(blind),
          icon: "multiply",
          explain: `You guess, so you find the money 1 time in ${doors}.`,
          visual: { type: "bars", bars: [{ label: "Without", value: value(blind), tone: "muted", text: formatDollars(blind) }, { label: "With", value: prize, tone: "muted" }] },
        },
        {
          label: "With the goggles",
          work: `$${prize} every time`,
          result: `$${prize}`,
          icon: "check",
          explain: "You see the money, so you always pick the right door.",
          visual: { type: "bars", bars: [{ label: "Without", value: value(blind), tone: "muted", text: formatDollars(blind) }, { label: "With", value: prize, tone: "win", text: `$${prize}` }] },
        },
        {
          label: "What knowing is worth",
          work: `$${prize} − ${formatDollars(blind)}`,
          icon: "subtract",
          explain: "The goggles are worth the extra you win on average by using them.",
          visual: { type: "bars", bars: [{ label: "Without", value: value(blind), tone: "muted", text: formatDollars(blind) }, { label: "With", value: prize, tone: "win", text: `$${prize}` }] },
        },
      ],
      params,
      { type: "bars", bars: range(1, doors).map((d) => ({ label: `Door ${d}`, value: 1, tone: "muted" as Tone })) },
    );
  }
  const { high, low, sure } = params;
  const blindBox = q(high + low, 2);
  const blind = value(blindBox) >= sure ? blindBox : q(sure);
  const informed = q(Math.max(high, sure) + Math.max(low, sure), 2);
  const tree = (tones: [Tone, Tone]): QuantVisual => ({
    type: "tree",
    root: {
      label: "The box",
      children: [
        { label: `$${high}: take the box`, edge: "1/2", tone: tones[0] },
        { label: `$${low}: take $${sure}`, edge: "1/2", tone: tones[1] },
      ],
    },
  });
  return problem(
    `info-${high}-${low}-${sure}`,
    `A box holds $${high} or $${low}, equally likely. You can take the box, or take a sure $${sure} instead. How much would it be worth to see inside the box before you choose?`,
    sub(informed, blind),
    "dollars",
    [
      {
        label: "Choosing blind",
        work: `the better of $${formatResult(blindBox, "number")} (box on average) and $${sure}`,
        result: formatDollars(blind),
        icon: "target",
        explain: `Without looking, the box is worth (${high} + ${low}) ÷ 2 on average. Take whichever is worth more.`,
        visual: tree(["muted", "muted"]),
      },
      {
        label: "Choosing after looking",
        work: `1/2 × $${Math.max(high, sure)} + 1/2 × $${Math.max(low, sure)}`,
        result: formatDollars(informed),
        icon: "split",
        explain: `If you see $${high}, take the box. If you see $${low}, take the sure $${sure}. Average the two cases.`,
        visual: tree(["win", "win"]),
      },
      {
        label: "What seeing is worth",
        work: `${formatDollars(informed)} − ${formatDollars(blind)}`,
        icon: "subtract",
        explain: "Looking is worth the extra you make on average by choosing with it.",
        visual: tree(["win", "win"]),
      },
    ],
    params,
    tree(["muted", "muted"]),
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


/** Couples seated at random: each couple sits together with a chance, and those chances add. */
function couples(params: { couples: number; seating: "round" | "row" }) {
  const { couples: n, seating } = params;
  const seats = 2 * n;
  const together = seating === "round" ? q(2, seats - 1) : q(1, n);
  const bars: QuantVisual = {
    type: "bars",
    bars: range(1, n).map((c) => ({ label: `Couple ${c}`, value: value(together), tone: "hit" as Tone, text: formatFraction(together) })),
    caption: "Each couple’s chance of sitting together",
  };
  return problem(
    `couples-${n}-${seating}`,
    seating === "round"
      ? `${n} couples sit at random around a round table with ${seats} seats. How many couples do you expect to sit side by side?`
      : `${n} couples sit at random in a row of ${seats} seats. How many couples do you expect to sit side by side?`,
    mul(q(n), together),
    "number",
    [
      {
        label: "One couple sits together",
        work:
          seating === "round"
            ? `2 of the ${seats - 1} other seats`
            : `${seats - 1} neighbouring pairs × 2 orders ÷ (${seats} × ${seats - 1}) seatings of the two`,
        result: formatFraction(together),
        icon: "split",
        explain:
          seating === "round"
            ? `Sit one partner anywhere. The other is equally likely to be in any of the ${seats - 1} other seats, and 2 of them are next door.`
            : `The two partners take 2 of the ${seats} seats in one of ${seats} × ${seats - 1} equally likely ways; ${seats - 1} pairs of seats are side by side, in either order.`,
        visual: bars,
      },
      {
        label: `Add over ${n} couples`,
        work: `${n} × ${formatFraction(together)}`,
        icon: "add",
        explain: "The couples affect each other, but averages still add: one chance per couple.",
        visual: bars,
      },
    ],
    params,
    {
      type: "people",
      groups: range(1, n).map((c) => ({ count: 2, tone: (["hit", "alt", "known", "win", "lose", "muted"] as Tone[])[(c - 1) % 6], label: `Couple ${c}` })),
    },
  );
}

/** Runs of one colour in a shuffled row: 1 + the number of neighbouring pairs that differ. */
function colourRuns(params: { red: number; black: number }) {
  const { red, black } = params;
  const n = red + black;
  const differ = q(2 * red * black, n * (n - 1));
  const answer = add(q(1), mul(q(n - 1), differ));
  const bag: QuantVisual = {
    type: "marbles",
    groups: [
      { count: red, tone: "hit", label: "Red cards" },
      { count: black, tone: "both", label: "Black cards" },
    ],
  };
  return problem(
    `runs-${red}-${black}`,
    `You shuffle ${red} red and ${black} black cards and lay them in a row. A run is a block of cards of one colour, so R R B R has 3 runs. How many runs do you expect?`,
    answer,
    "number",
    [
      {
        label: "Neighbouring pairs",
        work: `${n} − 1`,
        result: `${n - 1}`,
        icon: "count",
        explain: "Every new run starts where two neighbours differ. So count the places where that could happen.",
        visual: bag,
      },
      {
        label: "A pair of neighbours differs",
        work: `2 × ${red}/${n} × ${black}/${n - 1}`,
        result: formatFraction(differ),
        icon: "multiply",
        explain: "Red then black, or black then red. Any two neighbours are like two cards drawn from the shuffled pack.",
        visual: bag,
      },
      {
        label: "Runs = 1 + places the colour changes",
        work: `1 + ${n - 1} × ${formatFraction(differ)}`,
        icon: "add",
        explain: "The first card starts a run, and each change starts another. Averages add, so add one chance per neighbouring pair.",
        visual: bag,
      },
    ],
    params,
    bag,
  );
}

/** s sets of k pieces; m pieces removed at random. Each set survives if none of its pieces went. */
function completeSets(params: { sets: number; size: number; removed: number }) {
  const { sets, size, removed } = params;
  const pieces = sets * size;
  const survive = q(choose(pieces - size, removed), choose(pieces, removed));
  const bars: QuantVisual = {
    type: "bars",
    bars: range(1, sets).map((s) => ({ label: `Set ${s}`, value: value(survive), tone: "hit" as Tone, text: formatFraction(survive) })),
    caption: "Each set’s chance of keeping all its pieces",
  };
  return problem(
    `sets-${sets}-${size}-${removed}`,
    `There are ${sets} sets of ${size} matching pieces, ${pieces} pieces in all. You remove ${removed} pieces at random. How many complete sets do you expect are left?`,
    mul(q(sets), survive),
    "number",
    [
      {
        label: "One set keeps all its pieces",
        work: `C(${pieces - size}, ${removed}) ÷ C(${pieces}, ${removed})`,
        result: formatFraction(survive),
        icon: "split",
        explain: `A set stays complete when all ${removed} removed pieces come from the other ${pieces - size}. Count those choices out of all choices.`,
        visual: bars,
      },
      {
        label: `Add over ${sets} sets`,
        work: `${sets} × ${formatFraction(survive)}`,
        icon: "add",
        explain: "Whether one set survives affects the others, but averages still add: one chance per set.",
        visual: bars,
      },
    ],
    params,
    {
      type: "marbles",
      groups: range(1, sets).map((s) => ({ count: size, tone: (["hit", "alt", "both", "win", "lose", "known"] as Tone[])[(s - 1) % 6], label: `Set ${s}` })),
    },
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


const WITHOUT_REPLACEMENT = [
  { id: "clubs", one: "clubs", total: 52, target: 13, setup: (n: number) => `You deal ${n} cards from a shuffled deck`, test: (c: Card) => c.suit === "clubs" },
  { id: "aces", one: "aces", total: 52, target: 4, setup: (n: number) => `You deal ${n} cards from a shuffled deck`, test: (c: Card) => c.rank === 1 },
  { id: "red", one: "red cards", total: 52, target: 26, setup: (n: number) => `You deal ${n} cards from a shuffled deck`, test: (c: Card) => c.suit === "hearts" || c.suit === "diamonds" },
  { id: "balls", one: "red balls", total: 10, target: 4, setup: (n: number) => `A bag has 4 red and 6 blue balls. You take out ${n} without putting any back` },
  { id: "balls-12", one: "red balls", total: 12, target: 6, setup: (n: number) => `A bag has 6 red and 6 blue balls. You take out ${n} without putting any back` },
] as const;

/** A count drawn without replacement: n × p × (1 − p), shrunk by (N − n) ÷ (N − 1). */
function withoutReplacement(params: { pool: string; draws: number }) {
  const pool = WITHOUT_REPLACEMENT.find((w) => w.id === params.pool)!;
  const n = params.draws;
  const { total: N, target: K } = pool;
  const p = q(K, N);
  const withRep = mul(q(n), mul(p, sub(q(1), p)));
  const correction = q(N - n, N - 1);
  const figure: QuantVisual =
    "test" in pool
      ? { type: "cards", marks: [{ cards: cardsWhere(pool.test), tone: "hit" }] }
      : { type: "marbles", groups: [{ count: K, tone: "hit", label: "Red" }, { count: N - K, tone: "alt", label: "Blue" }] };
  return problem(
    `without-${pool.id}-${n}`,
    `${pool.setup(n)}. What's the variance of the number of ${pool.one}?`,
    mul(withRep, correction),
    "number",
    [
      {
        label: "If you put each back: n × p × (1 − p)",
        work: `${n} × ${formatFraction(p)} × ${formatFraction(sub(q(1), p))}`,
        result: formatResult(withRep, "number"),
        icon: "multiply",
        explain: `Each draw is a yes-or-no count with chance ${formatFraction(p)}. With replacement, the ${n} draws would add their variances.`,
        visual: figure,
      },
      {
        label: "Without replacement: × (N − n) ÷ (N − 1)",
        work: `${formatResult(withRep, "number")} × ${N - n}/${N - 1}`,
        icon: "multiply",
        explain: `Not putting cards back makes the count steadier: a draw of one kind makes the next less likely to match. The factor (${N} − ${n}) ÷ (${N} − 1) shrinks the spread.`,
        visual: figure,
      },
    ],
    params,
    figure,
  );
}

const TOTALS = [
  { id: "bakers", many: "bakers", each: "Each baker’s daily output of loaves", what: "their total output", unit: "loaves" },
  { id: "days", many: "days", each: "A trader’s profit each day, in dollars,", what: "the total profit", unit: "dollars" },
  { id: "machines", many: "machines", each: "Each machine’s hourly output of parts", what: "their total output", unit: "parts" },
] as const;

/** The standard deviation of a total of n independent parts is σ × √n. */
function sdOfTotal(params: { kind: string; parts: number; sd: number }) {
  const kind = TOTALS.find((t) => t.id === params.kind)!;
  const { parts: n, sd } = params;
  const root = Math.sqrt(n);
  const prompt =
    kind.id === "days"
      ? `${kind.each} has a standard deviation of $${sd}, and days don’t affect each other. What's the standard deviation of the total profit over ${n} days, in dollars?`
      : `${kind.each} has a standard deviation of ${sd}, independently of the others. What's the standard deviation of ${kind.what} across ${n} ${kind.many}?`;
  return problem(
    `sd-total-${kind.id}-${n}-${sd}`,
    prompt,
    q(sd * root),
    "number",
    [
      {
        label: "One part’s variance",
        work: `${sd}²`,
        result: `${sd * sd}`,
        icon: "multiply",
        explain: "Standard deviations don’t add, but variances do. Square to get the variance.",
        visual: times({ label: "SD", value: `${sd}` }, { label: "SD", value: `${sd}` }),
      },
      {
        label: `Variances add over ${n} ${kind.many}`,
        work: `${n} × ${sd * sd}`,
        result: `${n * sd * sd}`,
        icon: "add",
        explain: `The ${kind.many} are independent, so the total’s variance is the ${n} variances added up.`,
        visual: times({ label: "One variance", value: `${sd * sd}` }, { label: kind.many[0].toUpperCase() + kind.many.slice(1), value: `${n}` }),
      },
      {
        label: "Standard deviation is the square root",
        work: `√${n * sd * sd} = ${sd} × √${n}`,
        icon: "check",
        explain: `Take the square root to get back to ${kind.unit}. The spread grows with √${n}, not ${n}, because ups and downs partly cancel.`,
        visual: times({ label: "One SD", value: `${sd}` }, { label: `√${n}`, value: `${root}` }),
      },
    ],
    params,
    { type: "bars", bars: range(1, Math.min(n, 12)).map((i) => ({ label: `${i}`, value: sd, tone: "alt" as Tone })), caption: n > 12 ? `The first 12 of ${n} ${kind.many}, each with SD ${sd}` : `${n} ${kind.many}, each with SD ${sd}` },
  );
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
    families: [
      { id: "paid-face", title: "Paid the number you roll", generate: (random) => weighThePayouts({ type: "face", sides: pick(random, DIE_SIDES) }) },
      {
        id: "die-game",
        title: "A die game with prizes and a cost",
        generate: (random) =>
          weighThePayouts({
            type: "game",
            six: pick(random, [6, 8, 10, 12, 15, 18, 20]),
            five: pick(random, [1, 2, 3, 4, 5, 6]),
            cost: int(random, 1, 4),
          }),
      },
      {
        id: "two-dice",
        title: "Average total or product of two dice",
        generate: (random) => twoDiceAverage({ type: random() < 0.5 ? "sum" : "product", sides: pick(random, DIE_SIDES) }),
      },
      {
        id: "card-price",
        title: "A fair price for a card game",
        generate: (random) => cardPrice({ ace: pick(random, [5, 10, 13, 20, 26]), face: pick(random, [1, 2, 3, 5]) }),
      },
      {
        id: "flip-until-tails",
        title: "Flip until tails, paid per head",
        generate: (random) => {
          const heads = pick(random, HEAD_CHANCES);
          return flipUntilTails({ headsN: heads.n, headsD: heads.d, pay: pick(random, [1, 2, 5, 10]) });
        },
      },
      {
        id: "open-boxes",
        title: "Open boxes until you find the prize",
        generate: (random) =>
          openBoxes({ boxes: int(random, 3, 10), prize: pick(random, [60, 100, 150, 200, 300]), ask: random() < 0.4 ? "boxes" : "price" }),
      },
      { id: "capped-doubling", title: "A doubling prize with a cap", generate: (random) => cappedDoubling({ cap: pick(random, [10, 20, 50, 64, 100, 128, 500, 1000]) }) },
      {
        id: "value-of-information",
        title: "What it’s worth to know first",
        generate: (random) => {
          if (random() < 0.35) return valueOfInformation({ type: "doors", doors: int(random, 2, 6), prize: pick(random, [100, 600, 1000, 10000]) });
          // A sure amount between the box's two values, so looking changes the choice.
          const high = pick(random, [40, 60, 80, 100, 120]);
          const low = pick(random, [0, 10, 20]);
          const sure = pick(random, [25, 30, 35, 45, 50, 55].filter((x) => x > low && x < high && x * 2 !== high + low));
          return valueOfInformation({ type: "box", high, low, sure });
        },
      },
    ],
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
    families: [
      { id: "dice-total", title: "The total of several dice", generate: (random) => addTheAverages({ type: "dice-total", dice: int(random, 3, 12) }) },
      { id: "count-sixes", title: "How many sixes in many rolls", generate: (random) => addTheAverages({ type: "sixes", rolls: pick(random, [9, 10, 15, 20, 30, 50]) }) },
      {
        id: "cards-in-a-hand",
        title: "How many hearts or aces in a hand",
        generate: (random) => addTheAverages({ type: random() < 0.5 ? "hearts" : "aces", cards: int(random, 3, 13) }),
      },
      { id: "letters", title: "Letters in the right envelope", generate: (random) => addTheAverages({ type: "envelopes", letters: int(random, 4, 20) }) },
      { id: "first-card", title: "Where the first ace turns up", generate: (random) => firstCard({ card: pick(random, FIRST_CARDS).id }) },
      {
        id: "elevator",
        title: "Floors an elevator stops at",
        generate: (random) => distinctPicks({ type: "elevator", options: int(random, 3, 6), tries: int(random, 2, 4) }),
      },
      {
        id: "distinct-faces",
        title: "Different numbers seen in rolls",
        generate: (random) => distinctPicks({ type: "faces", options: pick(random, [4, 6]), tries: int(random, 2, 4) }),
      },
      { id: "couples", title: "Couples sitting side by side", generate: (random) => couples({ couples: int(random, 2, 4), seating: random() < 0.6 ? "round" : "row" }) },
      { id: "colour-runs", title: "Runs of one colour in a row", generate: (random) => colourRuns({ red: int(random, 2, 6), black: int(random, 2, 6) }) },
      {
        id: "complete-sets",
        title: "Complete sets left after removing pieces",
        generate: (random) => {
          const [sets, size] = pick(random, [[3, 2], [4, 2], [5, 2], [6, 2], [3, 3], [4, 3], [5, 3]] as const);
          return completeSets({ sets, size, removed: int(random, 2, Math.floor((sets * size) / 2)) });
        },
      },
    ],
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
    families: [
      { id: "one-die", title: "Variance of one die", generate: (random) => variance({ type: "die", sides: pick(random, DIE_SIDES) }) },
      { id: "dice-total", title: "Variance of a total of dice", generate: (random) => variance({ type: "dice-sum", dice: int(random, 2, 10) }) },
      {
        id: "count-heads",
        title: "Variance of a count of heads",
        generate: (random) => {
          const p = pick(random, [q(1, 2), q(1, 3), q(1, 4), q(2, 3), q(3, 4)]);
          return variance({ type: "heads", flips: pick(random, [10, 12, 20, 30, 36, 48, 60]), headsN: p.n, headsD: p.d });
        },
      },
      { id: "heads-sd", title: "Standard deviation of heads", generate: (random) => variance({ type: "heads-sd", flips: pick(random, [16, 36, 64, 100, 144, 400]) }) },
      {
        id: "bet",
        title: "Variance of a win-or-lose bet",
        generate: (random) => {
          const p = pick(random, [q(1, 2), q(1, 3), q(1, 4), q(2, 5)]);
          return variance({ type: "bet", win: pick(random, [1, 2, 3, 5]), lose: pick(random, [1, 2]), chanceN: p.n, chanceD: p.d });
        },
      },
      {
        id: "without-replacement",
        title: "Variance when drawing without replacement",
        generate: (random) => {
          const pool = pick(random, WITHOUT_REPLACEMENT);
          return withoutReplacement({ pool: pool.id, draws: int(random, 2, pool.total === 52 ? 13 : pool.total - 2) });
        },
      },
      {
        id: "sd-of-total",
        title: "Standard deviation of a total",
        generate: (random) =>
          sdOfTotal({ kind: pick(random, TOTALS).id, parts: pick(random, [4, 9, 16, 25, 36, 49, 64, 100]), sd: pick(random, [2, 3, 5, 10, 20]) }),
      },
    ],
  },
];
