import { add, div, formatDollars, formatFraction, formatPercent, mul, q, sub, value, type Rational } from "../rational";
import { int, pick, problem, type QuantLessonDef, type QuantProblem } from "../build";
import type { QuantVisual } from "../visual";

/** A 0–100% line split into the chance of winning and the rest. */
function chanceLine(chance: Rational, label = "implied chance"): QuantVisual {
  const percent = value(chance) * 100;
  return {
    type: "number-line",
    min: 0,
    max: 100,
    ticks: [0, 25, 50, 75, 100],
    shade: [
      { from: 0, to: percent, tone: "win", text: `${formatPercent(chance)} ${label}` },
      { from: percent, to: 100, tone: "muted" },
    ],
    caption: "Out of 100%",
  };
}

function oddsToChance(
  params:
    | { type: "against"; against: number; for: number }
    | { type: "on"; on: number; against: number }
    | { type: "decimal"; hundredths: number }
    | { type: "american"; line: number },
) {
  switch (params.type) {
    case "against": {
      const { against, for: forOdds } = params;
      const total = against + forOdds;
      return problem(
        `against-${against}-${forOdds}`,
        `A horse is ${against} to ${forOdds} against. What chance of winning do those odds imply?`,
        q(forOdds, total),
        "percent",
        [
          {
            label: "Wins",
            work: `${forOdds} in every ${against} + ${forOdds}`,
            result: `${forOdds}/${total}`,
            icon: "count",
            explain: `${against} to ${forOdds} against means ${against} losses for every ${forOdds} ${forOdds === 1 ? "win" : "wins"}, so ${forOdds} ${forOdds === 1 ? "win" : "wins"} in every ${total} races.`,
          },
          {
            label: "Chance",
            work: `${forOdds} ÷ ${total}`,
            icon: "divide",
            explain: "Wins divided by all the races is the chance of winning.",
            visual: chanceLine(q(forOdds, total)),
          },
        ],
        params,
        {
          type: "number-line",
          min: 0,
          max: total,
          ticks: Array.from({ length: total + 1 }, (_, i) => i),
          shade: [
            { from: 0, to: forOdds, tone: "win", text: `${forOdds} ${forOdds === 1 ? "win" : "wins"}` },
            { from: forOdds, to: total, tone: "lose", text: `${against} losses` },
          ],
          caption: `Every ${total} races, on average`,
        },
      );
    }
    case "on": {
      // "a to b on" is b to a against: the favourite wins a times for every b losses.
      const { on, against } = params;
      const total = on + against;
      return problem(
        `on-${on}-${against}`,
        `A favourite is ${on} to ${against} on (the same as ${against} to ${on} against). What chance of winning do those odds imply?`,
        q(on, total),
        "percent",
        [
          {
            label: "Wins",
            work: `${on} in every ${on} + ${against}`,
            result: `${on}/${total}`,
            icon: "count",
            explain: `“On” means the odds favour it: ${on} wins for every ${against} ${against === 1 ? "loss" : "losses"}, so ${on} wins in every ${total} races.`,
          },
          {
            label: "Chance",
            work: `${on} ÷ ${total}`,
            icon: "divide",
            explain: "Wins divided by all the races is the chance of winning.",
            visual: chanceLine(q(on, total)),
          },
        ],
        params,
        {
          type: "number-line",
          min: 0,
          max: total,
          ticks: Array.from({ length: total + 1 }, (_, i) => i),
          shade: [
            { from: 0, to: on, tone: "win", text: `${on} wins` },
            { from: on, to: total, tone: "lose", text: `${against} ${against === 1 ? "loss" : "losses"}` },
          ],
          caption: `Every ${total} races, on average`,
        },
      );
    }
    case "decimal": {
      const { hundredths } = params;
      const odds = (hundredths / 100).toFixed(2);
      return problem(
        `decimal-${hundredths}`,
        `A bookmaker offers decimal odds of ${odds}: a $1 bet returns $${odds} in total if it wins. What chance does that imply?`,
        q(100, hundredths),
        "percent",
        [
          {
            label: "Decimal odds are 1 ÷ chance",
            work: `${odds} = 1 ÷ chance`,
            icon: "idea",
            explain: "At a fair price, a $1 bet that wins with chance p pays back 1 ÷ p in total, so the odds are 1 ÷ chance.",
          },
          {
            label: "Chance",
            work: `1 ÷ ${odds}`,
            icon: "divide",
            explain: "Turn it round: the chance is 1 ÷ the decimal odds.",
            visual: chanceLine(q(100, hundredths)),
          },
        ],
        params,
        {
          type: "slots",
          op: "+",
          slots: [
            { label: "Your $1 back", value: "$1" },
            { label: "Profit", value: formatDollars(q(hundredths - 100, 100)), tone: "win" },
          ],
          result: `$${odds}`,
          caption: "What a winning $1 bet returns",
        },
      );
    }
    case "american": {
      const { line } = params;
      const favourite = line < 0;
      const stake = Math.abs(line);
      const chance = favourite ? q(stake, stake + 100) : q(100, line + 100);
      const risk = favourite ? stake : 100;
      const win = favourite ? 100 : line;
      return problem(
        `american-${line}`,
        favourite
          ? `A team is −${stake}: you bet $${stake} to win $100. What chance does that imply?`
          : `A team is +${line}: a $100 bet wins $${line}. What chance does that imply?`,
        chance,
        "percent",
        [
          {
            label: "You risk",
            work: favourite ? `$${stake} to win $100` : `$100 to win $${line}`,
            icon: "count",
            explain: `A winning bet gives back the $${risk} you risked plus the $${win} you win.`,
          },
          {
            label: "Chance is risk ÷ (risk + win)",
            work: favourite ? `${stake} ÷ ${stake + 100}` : `100 ÷ ${line + 100}`,
            icon: "divide",
            explain: "At a fair price, your chance of winning equals what you risk as a share of risk plus win.",
            visual: chanceLine(chance),
          },
        ],
        params,
        {
          type: "slots",
          op: "+",
          slots: [
            { label: "You risk", value: `$${risk}` },
            { label: "You win", value: `$${win}`, tone: "win" },
          ],
          result: `$${risk + win}`,
          caption: "What a winning bet gives back",
        },
      );
    }
  }
}

/** Decimal odds as text: 190 → "1.90". */
const decimalText = (hundredths: number) => (hundredths / 100).toFixed(2);

/** A two-way market: implied chances add to more than 100%, and the extra is the bookmaker’s margin. */
function bookmakerMargin(params: { type: "margin"; a: number; b: number; ask: "margin" | "fair" }) {
  const { a, b, ask } = params;
  const pa = q(100, a);
  const pb = q(100, b);
  const sum = add(pa, pb);
  const bars = (withTotal: boolean): QuantVisual => ({
    type: "bars",
    bars: [
      { label: "Team A", value: value(pa), tone: "hit", text: formatPercent(pa) },
      { label: "Team B", value: value(pb), tone: "alt", text: formatPercent(pb) },
      ...(withTotal
        ? [
            { label: "Together", value: value(sum), tone: "lose" as const, text: formatPercent(sum) },
            { label: "A fair book", value: 1, tone: "muted" as const, text: "100%" },
          ]
        : []),
    ],
    caption: "Implied chances from the two prices",
  });
  return problem(
    `margin-${a}-${b}-${ask}`,
    `A bookmaker offers decimal odds of ${decimalText(a)} on Team A and ${decimalText(b)} on Team B, and one of them must win. ${
      ask === "margin"
        ? "The implied chances add up to more than 100%, and the extra is the bookmaker’s margin. What is the margin?"
        : "Taking out the bookmaker’s margin, what’s the fair chance Team A wins?"
    }`,
    ask === "margin" ? sub(sum, q(1)) : div(pa, sum),
    "percent",
    [
      {
        label: "Implied chance of Team A",
        work: `1 ÷ ${decimalText(a)}`,
        result: formatPercent(pa),
        icon: "divide",
        explain: "Decimal odds are 1 ÷ the chance the price implies.",
      },
      {
        label: "Implied chance of Team B",
        work: `1 ÷ ${decimalText(b)}`,
        result: formatPercent(pb),
        icon: "divide",
        explain: "The same for the other side.",
        visual: bars(false),
      },
      {
        label: "Together",
        work: `${formatPercent(pa)} + ${formatPercent(pb)}`,
        result: formatPercent(sum),
        icon: "add",
        explain: "One team must win, so fair prices would add up to exactly 100%. Anything over that is the bookmaker’s margin.",
        visual: bars(true),
      },
      ask === "margin"
        ? {
            label: "Margin",
            work: `${formatPercent(sum)} − 100%`,
            icon: "subtract" as const,
            explain: "The extra above 100% is the bookmaker’s cut, spread across both prices.",
          }
        : {
            label: "Team A’s fair chance",
            work: `${formatPercent(pa)} ÷ ${formatPercent(sum)}`,
            icon: "divide" as const,
            explain: "Scale both chances down so they add to 100%: divide each one by the total.",
          },
    ],
    params,
  );
}

/** "40%" when the chance is a whole percent, else "1/6". */
const chanceText = (chance: Rational) => ((chance.n * 100) % chance.d === 0 ? formatPercent(chance) : formatFraction(chance));

/** Average winnings and average losses as bars, with the difference once it’s worked out. */
function profitBars(gain: Rational, loss: Rational, show: "win" | "both" | "net"): QuantVisual {
  const net = sub(gain, loss);
  return {
    type: "bars",
    bars: [
      { label: "Average win", value: value(gain), tone: "win", text: formatDollars(gain) },
      { label: "Average loss", value: value(loss), tone: show === "win" ? "muted" : "lose", ...(show === "win" ? {} : { text: formatDollars(loss) }) },
      ...(show === "net"
        ? [{ label: "Difference", value: Math.abs(value(net)), tone: "hit" as const, text: formatDollars(net) }]
        : []),
    ],
    caption: "Per bet, on average",
  };
}

/** Bets with a stated payout and chance of winning, in the words of each setting. */
const ODDS_BETS: { id: string; setup: (stake: number) => string; pays: [number, number]; chance: [number, number] }[] = [
  ...([
    [2, 1, 40], [3, 1, 30], [3, 1, 20], [1, 1, 55], [1, 1, 45], [4, 1, 25], [5, 1, 15], [3, 2, 45], [5, 2, 30], [2, 1, 30],
  ] as const).map(([win, risk, percent]) => ({
    id: `odds-${win}-${risk}-${percent}`,
    setup: (stake: number) => `A bet pays ${win} to ${risk} and wins with chance ${percent}%. What’s your expected profit on a $${stake} bet?`,
    pays: [win, risk] as [number, number],
    chance: [percent, 100] as [number, number],
  })),
  ...([4, 5, 6] as const).map((pays) => ({
    id: `die-${pays}`,
    setup: (stake: number) =>
      `You bet $${stake} that a fair die lands on 6, and a win pays ${pays} to 1. What’s your expected profit on the bet?`,
    pays: [pays, 1] as [number, number],
    chance: [1, 6] as [number, number],
  })),
  {
    id: "seven",
    setup: (stake: number) => `You bet $${stake} that two dice total 7, and a win pays 4 to 1. What’s your expected profit on the bet?`,
    pays: [4, 1],
    chance: [1, 6],
  },
];

type BetParams =
  | { type: "odds"; bet: string; stake: number }
  | { type: "call"; pot: number; bet: number; winPercent: number }
  | { type: "break-even"; pot: number; bet: number };

function betEv(params: BetParams): QuantProblem {
  if (params.type === "odds") {
    const bet = ODDS_BETS.find((b) => b.id === params.bet)!;
    const { stake } = params;
    const chance = q(...bet.chance);
    const lose = sub(q(1), chance);
    const winAmount = q(stake * bet.pays[0], bet.pays[1]);
    const gain = mul(winAmount, chance);
    const loss = mul(q(stake), lose);
    return problem(
      `odds-${bet.id}-${stake}`,
      bet.setup(stake),
      sub(gain, loss),
      "dollars",
      [
        {
          label: "Win times its chance",
          work: `${formatDollars(winAmount)} × ${chanceText(chance)}`,
          result: formatDollars(gain),
          icon: "multiply",
          explain: `A win at ${bet.pays[0]} to ${bet.pays[1]} makes ${formatDollars(winAmount)} on $${stake}. Weight it by how often you win.`,
          visual: profitBars(gain, loss, "win"),
        },
        {
          label: "Loss times its chance",
          work: `$${stake} × ${chanceText(lose)}`,
          result: formatDollars(loss),
          icon: "multiply",
          explain: `A loss costs your $${stake}. Weight it by how often you lose.`,
          visual: profitBars(gain, loss, "both"),
        },
        {
          label: "Expected profit",
          work: `${formatDollars(gain)} − ${formatDollars(loss)}`,
          icon: "subtract",
          explain: "Average winnings minus average losses is what the bet makes per bet in the long run. Above zero, it makes money.",
          visual: profitBars(gain, loss, "net"),
        },
      ],
      params,
      chanceLine(chance, "chance to win"),
    );
  }
  if (params.type === "call") {
    const { pot, bet, winPercent } = params;
    const chance = q(winPercent, 100);
    const gain = mul(q(pot + bet), chance);
    const loss = mul(q(bet), sub(q(1), chance));
    return problem(
      `call-${pot}-${bet}-${winPercent}`,
      `There’s $${pot} in the pot and your opponent bets $${bet}. If you call, you win ${winPercent}% of the time. What’s your expected profit from calling?`,
      sub(gain, loss),
      "dollars",
      [
        {
          label: "Win the pot and their bet",
          work: `$${pot + bet} × ${winPercent}%`,
          result: formatDollars(gain),
          icon: "multiply",
          explain: `If you win, you take the $${pot} pot and their $${bet} bet. Weight that by your ${winPercent}% chance.`,
          visual: profitBars(gain, loss, "win"),
        },
        {
          label: "Lose your call",
          work: `$${bet} × ${100 - winPercent}%`,
          result: formatDollars(loss),
          icon: "multiply",
          explain: `If you lose, you lose the $${bet} you called. Weight that by the ${100 - winPercent}% chance of losing.`,
          visual: profitBars(gain, loss, "both"),
        },
        {
          label: "Expected profit",
          work: `${formatDollars(gain)} − ${formatDollars(loss)}`,
          icon: "subtract",
          explain: "Average winnings minus average losses is what calling makes, on average. Above zero, call.",
          visual: profitBars(gain, loss, "net"),
        },
      ],
      params,
      {
        type: "slots",
        op: "+",
        slots: [
          { label: "Pot", value: `$${pot}` },
          { label: "Their bet", value: `$${bet}` },
        ],
        result: `$${pot + bet}`,
        caption: "What you win if you call and win",
      },
    );
  }
  const { pot, bet } = params;
  const total = pot + 2 * bet;
  const finalPot: QuantVisual = {
    type: "slots",
    op: "+",
    slots: [
      { label: "Pot", value: `$${pot}` },
      { label: "Their bet", value: `$${bet}` },
      { label: "Your call", value: `$${bet}`, tone: "hit" },
    ],
    result: `$${total}`,
    caption: "The pot after you call",
  };
  return problem(
    `pot-${pot}-${bet}`,
    `There’s $${pot} in the pot and your opponent bets $${bet}. What’s the least chance of winning that makes calling the $${bet} break even?`,
    q(bet, total),
    "percent",
    [
      {
        label: "Pot after you call",
        work: `${pot} + ${bet} + ${bet}`,
        result: `$${total}`,
        icon: "add",
        explain: "After you call, the pot holds what was there, their bet and your call.",
        visual: finalPot,
      },
      {
        label: "Your call ÷ that pot",
        work: `${bet} ÷ ${total}`,
        icon: "divide",
        explain: "Calling breaks even when your chance of winning equals your share of the final pot: what you put in ÷ the whole pot.",
        visual: {
          type: "number-line",
          min: 0,
          max: total,
          ticks: [0, bet, total],
          shade: [
            { from: 0, to: bet, tone: "hit", text: "your call" },
            { from: bet, to: total, tone: "known", text: "the rest of the pot" },
          ],
          caption: `Your $${bet} out of the $${total} pot`,
        },
      },
    ],
    params,
    finalPot,
  );
}

const ROULETTE_BETS: { id: string; label: string; numbers: number; pays: number }[] = [
  { id: "straight", label: "a single number, which pays 35 to 1", numbers: 1, pays: 35 },
  { id: "split", label: "a split (two numbers), which pays 17 to 1", numbers: 2, pays: 17 },
  { id: "street", label: "a street (three numbers), which pays 11 to 1", numbers: 3, pays: 11 },
  { id: "corner", label: "a corner (four numbers), which pays 8 to 1", numbers: 4, pays: 8 },
  { id: "dozen", label: "a dozen (12 numbers), which pays 2 to 1", numbers: 12, pays: 2 },
  { id: "red", label: "red (18 numbers), which pays 1 to 1", numbers: 18, pays: 1 },
  { id: "low", label: "1 to 18 (18 numbers), which pays 1 to 1", numbers: 18, pays: 1 },
  { id: "column", label: "a column (12 numbers), which pays 2 to 1", numbers: 12, pays: 2 },
];

/** Average win and loss per $1, then the house’s share once it’s worked out. */
function edgeBars(win: Rational, lose: Rational, show: "win" | "both" | "edge"): QuantVisual {
  return {
    type: "bars",
    bars: [
      { label: "Average win", value: value(win), tone: "win", text: formatDollars(win) },
      { label: "Average loss", value: value(lose), tone: show === "win" ? "muted" : "lose", ...(show === "win" ? {} : { text: formatDollars(lose) }) },
      ...(show === "edge"
        ? [{ label: "House keeps", value: value(sub(lose, win)), tone: "hit" as const, text: formatPercent(sub(lose, win)) }]
        : []),
    ],
    caption: "Per $1 bet, on average",
  };
}

function houseEdge(params: { type: "roulette"; wheel: 37 | 38; bet: string } | { type: "die"; pays: number }) {
  if (params.type === "die") {
    const { pays } = params;
    const edge = q(5 - pays, 6);
    const win = q(pays, 6);
    const lose = q(5, 6);
    return problem(
      `die-${pays}`,
      `A dice game pays ${pays} to 1 if you call the number a fair die lands on. What’s the house edge, as a share of each bet?`,
      edge,
      "percent",
      [
        {
          label: "Win times its chance",
          work: `$${pays} × 1/6`,
          result: formatDollars(win),
          icon: "multiply",
          explain: `You win $${pays} on 1 of the 6 faces. Weight it by that 1/6 chance.`,
          visual: edgeBars(win, lose, "win"),
        },
        {
          label: "Loss times its chance",
          work: "$1 × 5/6",
          result: formatDollars(lose),
          icon: "multiply",
          explain: "You lose your $1 on the other 5 faces.",
          visual: edgeBars(win, lose, "both"),
        },
        {
          label: "Average loss per $1",
          work: `(5 − ${pays}) ÷ 6`,
          icon: "subtract",
          explain: "Average loss minus average win is what the house keeps from each $1 you bet.",
          visual: edgeBars(win, lose, "edge"),
        },
      ],
      params,
      { type: "die-faces", sides: 6, marks: [{ faces: [6], tone: "win" }], caption: "Call a number, say 6: you win on 1 face of 6" },
    );
  }
  const { wheel, bet: betId } = params;
  const bet = ROULETTE_BETS.find((b) => b.id === betId)!;
  const losing = wheel - bet.numbers;
  const edge = q(losing - bet.numbers * bet.pays, wheel);
  const win = q(bet.pays * bet.numbers, wheel);
  const lose = q(losing, wheel);
  return problem(
    `roulette-${wheel}-${bet.id}`,
    `${wheel === 38 ? "An American" : "A European"} roulette wheel has ${wheel} pockets. You bet $1 on ${bet.label}. What’s the house edge?`,
    edge,
    "percent",
    [
      {
        label: "Win times its chance",
        work: `$${bet.pays} × ${bet.numbers}/${wheel}`,
        result: formatDollars(win),
        icon: "multiply",
        explain: `You win $${bet.pays} when the ball lands in ${bet.numbers === 1 ? "your pocket" : `one of your ${bet.numbers} pockets`}, out of ${wheel}.`,
        visual: edgeBars(win, lose, "win"),
      },
      {
        label: "Loss times its chance",
        work: `$1 × ${losing}/${wheel}`,
        result: formatDollars(lose),
        icon: "multiply",
        explain: `You lose your $1 in the other ${losing} pockets, including the green zero${wheel === 38 ? "s" : ""}.`,
        visual: edgeBars(win, lose, "both"),
      },
      {
        label: "Average loss per $1",
        work: `(${losing} − ${bet.pays * bet.numbers}) ÷ ${wheel}`,
        icon: "subtract",
        explain: "Average loss minus average win is what the house keeps from each $1 you bet.",
        visual: edgeBars(win, lose, "edge"),
      },
    ],
    params,
    {
      type: "bars",
      bars: [
        { label: "Your pockets", value: bet.numbers, tone: "win", text: `${bet.numbers}` },
        { label: "Other pockets", value: losing, tone: "lose", text: `${losing}` },
      ],
      caption: `Pockets out of ${wheel}`,
    },
  );
}

/** Casino bets on one roll of two dice. */
const DICE_BETS: { id: string; label: string; pays: number; wins: (a: number, b: number) => boolean }[] = [
  { id: "seven", label: "two dice total 7", pays: 4, wins: (a, b) => a + b === 7 },
  { id: "double", label: "two dice show a double", pays: 4, wins: (a, b) => a === b },
  { id: "twelve", label: "two dice total 12", pays: 30, wins: (a, b) => a + b === 12 },
  { id: "eleven", label: "two dice total 11", pays: 15, wins: (a, b) => a + b === 11 },
  { id: "craps", label: "two dice total 2, 3 or 12", pays: 7, wins: (a, b) => [2, 3, 12].includes(a + b) },
  { id: "two-or-twelve", label: "two dice total 2 or 12", pays: 15, wins: (a, b) => a + b === 2 || a + b === 12 },
];

function diceHouseEdge(params: { type: "dice"; bet: string }) {
  const bet = DICE_BETS.find((d) => d.id === params.bet)!;
  const cells: [number, number][] = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (bet.wins(a, b)) cells.push([a, b]);
  const w = cells.length;
  const win = q(bet.pays * w, 36);
  const lose = q(36 - w, 36);
  return problem(
    `dice-${bet.id}`,
    `A casino bet pays ${bet.pays} to 1 if ${bet.label} on the next roll. What’s the house edge, as a share of each bet?`,
    q(36 - w - bet.pays * w, 36),
    "percent",
    [
      {
        label: "Win times its chance",
        work: `$${bet.pays} × ${w}/36`,
        result: formatDollars(win),
        icon: "multiply",
        explain: `${w} of the 36 equally likely rolls win, and each pays $${bet.pays} on a $1 bet.`,
        visual: edgeBars(win, lose, "win"),
      },
      {
        label: "Loss times its chance",
        work: `$1 × ${36 - w}/36`,
        result: formatDollars(lose),
        icon: "multiply",
        explain: `The other ${36 - w} rolls lose your $1.`,
        visual: edgeBars(win, lose, "both"),
      },
      {
        label: "Average loss per $1",
        work: `(${36 - w} − ${bet.pays * w}) ÷ 36`,
        icon: "subtract",
        explain: "Average loss minus average win is what the house keeps from each $1 you bet.",
        visual: edgeBars(win, lose, "edge"),
      },
    ],
    params,
    { type: "dice-grid", sides: 6, marks: [{ cells, tone: "win" }], caption: `${w} of the 36 rolls win` },
  );
}

/** A raffle: the house keeps whatever the prize doesn’t pay back. */
function raffle(params: { type: "raffle"; tickets: number; price: number; prize: number }) {
  const { tickets, price, prize } = params;
  const average = q(prize, tickets);
  const loss = sub(q(price), average);
  return problem(
    `raffle-${tickets}-${price}-${prize}`,
    `A raffle sells ${tickets} tickets at $${price} each, and one ticket wins a $${prize} prize. If you buy a ticket, what’s the house edge, as a share of what you pay?`,
    div(loss, q(price)),
    "percent",
    [
      {
        label: "Chance your ticket wins",
        work: `1 in ${tickets}`,
        result: `1/${tickets}`,
        icon: "count",
        explain: `Every ticket is equally likely to be drawn, so yours wins 1 time in ${tickets}.`,
      },
      {
        label: "Average prize per ticket",
        work: `$${prize} × 1/${tickets}`,
        result: formatDollars(average),
        icon: "multiply",
        explain: "Weight the prize by your chance of winning it.",
      },
      {
        label: "Average loss per ticket",
        work: `$${price} − ${formatDollars(average)}`,
        result: formatDollars(loss),
        icon: "subtract",
        explain: "You pay for the ticket either way, and get the average prize back.",
        visual: {
          type: "bars",
          bars: [
            { label: "Ticket", value: price, tone: "lose", text: `$${price}` },
            { label: "Average prize", value: value(average), tone: "win", text: formatDollars(average) },
            { label: "House keeps", value: value(loss), tone: "hit", text: formatDollars(loss) },
          ],
          caption: "Per ticket, on average",
        },
      },
      {
        label: "House edge",
        work: `${formatDollars(loss)} ÷ $${price}`,
        icon: "divide",
        explain: "As a share of what you pay, that’s the house edge.",
      },
    ],
    params,
  );
}

/** Raffles: tickets, price, and the share of ticket money the prize pays back. */
const RAFFLES = [100, 200, 500, 1000].flatMap((tickets) =>
  [1, 2, 5].flatMap((price) => [50, 60, 70, 80].map((back) => ({ tickets, price, prize: (tickets * price * back) / 100 }))),
);

/** Kelly with the payout given as decimal odds: the payout per $1 is the decimal odds minus 1. */
function kellyDecimal(params: { type: "decimal"; winPercent: number; hundredths: number }) {
  const { winPercent, hundredths } = params;
  const p = q(winPercent, 100);
  const lose = sub(q(1), p);
  const b = q(hundredths - 100, 100);
  const bText = `${(hundredths - 100) / 100}`;
  const full = sub(p, div(lose, b));
  return problem(
    `kelly-decimal-${winPercent}-${hundredths}`,
    `A bet wins ${winPercent}% of the time at decimal odds of ${decimalText(hundredths)}: a winning $1 returns $${decimalText(hundredths)} in total. What share of your bankroll does the Kelly rule say to stake?`,
    full,
    "percent",
    [
      {
        label: "Payout per $1",
        work: `${decimalText(hundredths)} − 1`,
        result: bText,
        icon: "subtract",
        explain: "Decimal odds include your $1 back. The payout Kelly uses is only the profit, so take off the $1.",
      },
      {
        label: "Chance to lose",
        work: `100% − ${winPercent}%`,
        result: formatPercent(lose),
        icon: "subtract",
        explain: "The bet either wins or loses, so the two chances add to 100%.",
      },
      {
        label: "Chance to lose ÷ payout",
        work: `${formatPercent(lose)} ÷ ${bText}`,
        result: formatPercent(div(lose, b)),
        icon: "divide",
        explain: `A win pays ${bText} times your stake, so divide the lose chance by the payout.`,
      },
      {
        label: "Kelly stake: chance to win − that",
        work: `${winPercent}% − ${formatPercent(div(lose, b))}`,
        icon: "subtract",
        explain: "Take that from your win chance. What remains is the share of your bankroll to stake.",
        visual: {
          type: "number-line",
          min: 0,
          max: 100,
          ticks: [0, 25, 50, 75, 100],
          shade: [
            { from: 0, to: value(full) * 100, tone: "hit", text: `${formatPercent(full)} staked` },
            { from: value(full) * 100, to: 100, tone: "known", text: "kept back" },
          ],
          caption: "Share of your bankroll",
        },
      },
    ],
    params,
    {
      type: "bars",
      bars: [
        { label: "Win", value: value(p), tone: "win", text: `${winPercent}%` },
        { label: "Lose", value: value(lose), tone: "lose", text: formatPercent(lose) },
      ],
      caption: `Decimal odds of ${decimalText(hundredths)}`,
    },
  );
}

/** Decimal-odds Kelly bets with an edge: win chance and odds in hundredths. */
const KELLY_DECIMAL = [[50, 250], [40, 300], [60, 200], [45, 250], [55, 220], [30, 400], [35, 350], [70, 175]] as const;

function kelly(params: { winPercent: number; pays: number; half: 0 | 1 }) {
  const { winPercent, pays, half } = params;
  const p = q(winPercent, 100);
  const lose = sub(q(1), p);
  const full = sub(p, div(lose, q(pays)));
  const stakeLine = (stake: Rational, text: string): QuantVisual => ({
    type: "number-line",
    min: 0,
    max: 100,
    ticks: [0, 25, 50, 75, 100],
    shade: [
      { from: 0, to: value(stake) * 100, tone: "hit", text: `${formatPercent(stake)} ${text}` },
      { from: value(stake) * 100, to: 100, tone: "known", text: "kept back" },
    ],
    caption: "Share of your bankroll",
  });
  const steps: (Omit<QuantProblem["steps"][number], "result"> & { result?: string })[] =
    pays === 1
      ? [
          // Even money: p − (1 − p) = 2p − 1.
          {
            label: "Even money: chance to win − chance to lose",
            work: `${winPercent}% − ${formatPercent(lose)}`,
            result: formatPercent(full),
            icon: "subtract",
            explain: "At 1 to 1 a win and a loss are the same size, so the stake is your edge: win chance minus lose chance.",
            visual: stakeLine(full, "staked"),
          },
        ]
      : [
          {
            label: "Chance to lose",
            work: `100% − ${winPercent}%`,
            result: formatPercent(lose),
            icon: "subtract",
            explain: "The bet either wins or loses, so the two chances add to 100%.",
          },
          {
            label: "Chance to lose ÷ payout",
            work: `${formatPercent(lose)} ÷ ${pays}`,
            result: formatPercent(div(lose, q(pays))),
            icon: "divide",
            explain: `A win pays ${pays} times your stake, so each loss counts for less against it. Divide the lose chance by the payout.`,
          },
          {
            label: "Kelly stake: chance to win − that",
            work: `${winPercent}% − ${formatPercent(div(lose, q(pays)))}`,
            result: formatPercent(full),
            icon: "subtract",
            explain: "Take that from your win chance. What remains is the share of your bankroll to stake.",
            visual: stakeLine(full, "staked"),
          },
        ];
  if (half) {
    steps.push({
      label: "Half Kelly",
      work: `${formatPercent(full)} ÷ 2`,
      result: "",
      icon: "divide",
      explain: "Half Kelly bets half as much: your money grows a little slower, with much smaller swings.",
      visual: stakeLine(div(full, q(2)), "staked"),
    });
  }
  return problem(
    `kelly-${winPercent}-${pays}-${half ? "half" : "full"}`,
    `A bet wins ${winPercent}% of the time and pays ${pays} to 1. What share of your bankroll does ${half ? "half Kelly (half the Kelly stake)" : "the Kelly rule"} say to stake?`,
    half ? div(full, q(2)) : full,
    "percent",
    steps,
    params,
    {
      type: "bars",
      bars: [
        { label: "Win", value: value(p), tone: "win", text: `${winPercent}%` },
        { label: "Lose", value: value(lose), tone: "lose", text: formatPercent(lose) },
      ],
      caption: `Each bet pays ${pays} to 1`,
    },
  );
}

// Kelly bets worth making: the edge is positive.
const KELLY_BETS = [
  [55, 1], [60, 1], [65, 1], [70, 1], [75, 1], [40, 2], [50, 2], [60, 2], [30, 3], [40, 3], [25, 4], [30, 4], [20, 5],
] as const;

export const BETTING_LESSONS: QuantLessonDef[] = [
  {
    id: "implied-probability",
    title: "Odds and implied probability",
    benefit: "Turn odds and prices into chances",
    summary: "How to read odds against, odds on, decimal odds and American odds as chances, and how to spot the margin a bookmaker builds into its prices.",
    difficulty: "Easy",
    parts: [
      {
        type: "text",
        body: [
          "A bookmaker lists a horse at 4 to 1 against. Odds against compare losses with wins: at those odds the horse is expected to lose 4 races for every 1 it wins.",
          "What chance of winning do the odds describe?",
        ],
      },
      {
        type: "check",
        prompt: "Pick the chance that 4 to 1 against implies.",
        choices: ["20%", "25%", "80%", "40%"],
        answer: 0,
        explain:
          "4 losses and 1 win make 5 races, and the horse wins 1 of them: 1/5 = 20%. The tempting answer is 25%, which reads 4 to 1 as 1 in 4.",
      },
      {
        type: "story",
        heading: "Count the races",
        beats: [
          {
            text: "Lay out 5 races, the smallest number that fits the odds: 4 losses and 1 win.",
            visual: {
              type: "number-line",
              min: 0,
              max: 5,
              ticks: [0, 1, 2, 3, 4, 5],
              shade: [
                { from: 0, to: 1, tone: "win", text: "1 win" },
                { from: 1, to: 5, tone: "lose", text: "4 losses" },
              ],
              caption: "Every 5 races, on average",
            },
          },
          {
            text: "The horse wins 1 race in 5, which is a 20% chance.",
            visual: {
              type: "number-line",
              min: 0,
              max: 100,
              ticks: [0, 25, 50, 75, 100],
              shade: [
                { from: 0, to: 20, tone: "win", text: "20% chance" },
                { from: 20, to: 100, tone: "muted" },
              ],
              caption: "Out of 100%",
            },
          },
          {
            text: "The odds also set the payout. A winning $1 bet at 4 to 1 makes $4. Over 5 races you’d win $4 once and lose $1 four times, which comes to $0. That’s what makes 4 to 1 the fair price for a 20% chance.",
            visual: {
              type: "bars",
              bars: [
                { label: "Won in 1 race", value: 4, tone: "win", text: "+$4" },
                { label: "Lost in 4 races", value: 4, tone: "lose", text: "−$4" },
              ],
              caption: "A $1 bet on each of 5 races",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Decimal and American odds",
        body: [
          "Many bookmakers quote decimal odds: the total a winning $1 bet pays back, your $1 included. The 4 to 1 horse is 5.00 in decimal odds, since a win returns $4 profit plus your $1. A fair decimal price is 1 ÷ chance, so the chance is 1 ÷ 5.00 = 20%.",
          "American odds are written per $100. +300 means a $100 bet wins $300, and −150 means you bet $150 to win $100. Either way, the implied chance is what you risk ÷ (what you risk + what you win): 100 ÷ 400 = 25% for +300, and 150 ÷ 250 = 60% for −150.",
        ],
      },
      {
        type: "rule",
        rule: "a to b against: chance = b ÷ (a + b). Decimal odds d: chance = 1 ÷ d",
        note: "For the horse at 4 to 1 against, b = 1 and a + b = 5, so the chance is 1/5. Its decimal price is 5.00, and 1 ÷ 5.00 gives the same 20%.",
      },
      {
        type: "check",
        prompt: "Two teams play a match, and a bookmaker offers decimal odds of 1.80 on each. What do the two implied chances add up to?",
        choices: ["100%", "About 111%", "90%", "180%"],
        answer: 1,
        explain:
          "1 ÷ 1.80 is about 55.6% for each team, so together they come to about 111%. Fair prices on two outcomes would add to exactly 100%. The extra 11% is the bookmaker’s margin, built in so the book profits whichever team wins.",
      },
      {
        type: "example",
        lead: "Here is a horse at 3 to 1 against, worked through the same way.",
      },
      {
        type: "trap",
        body: "Reading 3 to 1 against as a 1 in 3 chance. The 3 counts losses and the 1 counts wins, so there are 4 races in all and the chance is 1 in 4, or 25%.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "The question gives odds like 5 to 2 against, a decimal price like 2.50, or a line like −150",
          "You’re asked what chance a price implies, or whether a price is fair",
          "The prices on every outcome of one event add up to more than 100%",
        ],
      },
    ],
    targetSeconds: 20,
    example: oddsToChance({ type: "against", against: 3, for: 1 }),
    families: [
      {
        id: "against",
        title: "Odds against",
        generate: (random) => {
          const [against, forOdds] = pick(random, [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [9, 1], [3, 2], [5, 2], [7, 2], [5, 4], [7, 4]] as const);
          return oddsToChance({ type: "against", against, for: forOdds });
        },
      },
      {
        id: "on",
        title: "Odds on a favourite",
        generate: (random) => {
          const [on, against] = pick(random, [[2, 1], [3, 1], [4, 1], [9, 1], [3, 2], [5, 2], [7, 4], [5, 4]] as const);
          return oddsToChance({ type: "on", on, against });
        },
      },
      {
        id: "decimal",
        title: "Decimal odds",
        generate: (random) => oddsToChance({ type: "decimal", hundredths: pick(random, [125, 150, 200, 250, 400, 500, 800]) }),
      },
      {
        id: "american",
        title: "American odds (+200, −150)",
        generate: (random) => oddsToChance({ type: "american", line: pick(random, [-400, -300, -200, -150, 150, 200, 300, 400]) }),
      },
      {
        id: "margin",
        title: "A bookmaker’s margin",
        generate: (random) => {
          const [a, b] = pick(random, [[190, 190], [150, 250], [125, 400], [200, 180], [160, 230], [140, 280], [110, 600]] as const);
          return bookmakerMargin({ type: "margin", a, b, ask: random() < 0.5 ? "margin" : "fair" });
        },
      },
    ],
  },
  {
    id: "bet-ev",
    title: "Expected value of a bet",
    benefit: "Decide whether a bet makes money",
    summary: "How to find the average profit of a bet from what it pays and how often it wins, including whether to call a bet in poker.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: [
          "A friend offers you a bet on one roll of a die. You put down $1. If the die shows a 6, you win $4 and keep your $1. Any other number, you lose the $1.",
          "A 4 to 1 payout sounds generous. Should you take the bet?",
        ],
      },
      {
        type: "check",
        prompt: "If you took this bet over and over, what would it make on average per roll?",
        choices: ["About +$0.67", "$0", "About −$0.17", "About −$0.83"],
        answer: 2,
        explain:
          "You win $4 on one roll in six and lose $1 on the other five: (4 − 5) ÷ 6 = −$1/6, about 17 cents lost per roll. The bet would need to pay 5 to 1 just to break even.",
      },
      {
        type: "story",
        heading: "Play it six times",
        beats: [
          {
            text: "Take the bet 6 times, and suppose each face comes up once, which is what happens on average.",
            visual: { type: "die-faces", sides: 6, marks: [{ faces: [6], tone: "win" }, { faces: [1, 2, 3, 4, 5], tone: "lose" }], caption: "A 6 wins; anything else loses" },
          },
          {
            text: "The roll of 6 wins you $4.",
            visual: {
              type: "bars",
              bars: [
                { label: "Won", value: 4, tone: "win", text: "+$4" },
                { label: "Lost", value: 5, tone: "muted" },
              ],
              caption: "Over 6 rolls",
            },
          },
          {
            text: "The other five rolls each cost $1, so $5 in all.",
            visual: {
              type: "bars",
              bars: [
                { label: "Won", value: 4, tone: "win", text: "+$4" },
                { label: "Lost", value: 5, tone: "lose", text: "−$5" },
              ],
              caption: "Over 6 rolls",
            },
          },
          {
            text: "Over the 6 rolls you’re down $1, which is −$1/6 a roll. That average per bet is the bet’s expected value.",
            visual: {
              type: "bars",
              bars: [
                { label: "Won", value: 4, tone: "win", text: "+$4" },
                { label: "Lost", value: 5, tone: "lose", text: "−$5" },
                { label: "Per roll", value: 1 / 6, tone: "hit", text: "−$0.17" },
              ],
              caption: "Over 6 rolls",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why the average is the number to use",
        body: [
          "Any one roll wins $4 or loses $1, and you can’t say which in advance. Over hundreds of rolls, though, each face turns up close to one time in six, and your total settles near −$1/6 per roll.",
          "So a bet with positive expected value makes money if you can repeat it, even if it loses most of the time. A bet with negative expected value loses money in the long run, however often it pays out along the way.",
        ],
      },
      {
        type: "rule",
        rule: "Expected profit = win × P(win) − stake × P(lose)",
        note: "For the die bet: 4 × 1/6 − 1 × 5/6 = −1/6. The win here is your profit only. The $1 you get back on a win was yours already, so it isn’t counted.",
      },
      {
        type: "check",
        prompt: "There’s $80 in a poker pot and your opponent bets $20. Calling costs you $20, and you expect to win 30% of the time. What does calling make on average?",
        choices: ["+$16", "+$10", "+$22"],
        answer: 0,
        explain:
          "A win collects the $80 pot and their $20 bet: $100 × 0.3 = $30. A loss costs your $20 call: $20 × 0.7 = $14. $30 − $14 = +$16, so you should call. Counting your own $20 as part of the win gives the wrong +$22.",
      },
      {
        type: "example",
        lead: "A bet that pays 2 to 1 and wins 40% of the time, on a $10 stake.",
      },
      {
        type: "trap",
        body: "Counting the stake you get back as winnings. At 2 to 1, a winning $10 bet hands you $30, but $10 of that was already yours. The profit is $20, and that’s the number to multiply by the chance of winning.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "You’re given what a bet pays and how often it wins",
          "You’re asked whether to take a bet, call a raise or buy a ticket",
          "A poker hand gives the pot, a bet to call and your chance of winning",
        ],
      },
    ],
    targetSeconds: 30,
    example: betEv({ type: "odds", bet: "odds-2-1-40", stake: 10 }),
    families: [
      {
        id: "stated-odds",
        title: "A bet with a stated payout and chance",
        generate: (random) =>
          betEv({ type: "odds", bet: pick(random, ODDS_BETS.filter((b) => b.id.startsWith("odds-"))).id, stake: pick(random, [5, 10, 20, 50, 100]) }),
      },
      {
        id: "dice-bet",
        title: "A bet on dice",
        generate: (random) =>
          betEv({ type: "odds", bet: pick(random, ODDS_BETS.filter((b) => !b.id.startsWith("odds-"))).id, stake: pick(random, [5, 10, 20, 50, 100]) }),
      },
      {
        id: "poker-call",
        title: "Is a poker call profitable?",
        generate: (random) =>
          betEv({
            type: "call",
            pot: pick(random, [40, 60, 80, 100, 150]),
            bet: pick(random, [10, 20, 30, 50]),
            winPercent: pick(random, [15, 20, 25, 30, 35, 40]),
          }),
      },
      {
        id: "pot-odds",
        title: "The chance you need to call",
        generate: (random) =>
          betEv({ type: "break-even", pot: pick(random, [20, 40, 50, 60, 80, 100, 150, 200]), bet: pick(random, [10, 20, 25, 30, 40, 50, 100]) }),
      },
    ],
  },
  {
    id: "house-edge",
    title: "House edge",
    benefit: "Find what a casino bet costs per $1",
    summary: "How to work out what a casino keeps from each dollar you bet, for roulette, dice games and raffles.",
    difficulty: "Easy",
    parts: [
      {
        type: "text",
        body: [
          "An American roulette wheel has 38 pockets: the numbers 1 to 36, half red and half black, plus a green 0 and a green 00. A bet on red pays 1 to 1.",
          "You bet $1 on red. On average, how much do you lose per spin?",
        ],
      },
      {
        type: "check",
        prompt: "Pick the average loss per $1 bet on red.",
        choices: ["Nothing, red is a 50–50 bet", "About 5 cents", "About 10 cents", "About 50 cents"],
        answer: 1,
        explain:
          "Red wins in 18 of the 38 pockets and loses in the other 20. Over 38 spins you win $18 and lose $20, a net loss of $2, or about 5.3 cents a spin. The two green pockets are what tip it.",
      },
      {
        type: "story",
        heading: "Spin it 38 times",
        beats: [
          {
            text: "Spin the wheel 38 times and suppose each pocket comes up once.",
            visual: {
              type: "bars",
              bars: [
                { label: "Red", value: 18, tone: "win", text: "18" },
                { label: "Black", value: 18, tone: "lose", text: "18" },
                { label: "Green", value: 2, tone: "lose", text: "2" },
              ],
              caption: "Pockets on an American wheel",
            },
          },
          {
            text: "The 18 red spins win you $18, and the 18 black spins cost you $18. So far you’re even.",
            visual: {
              type: "bars",
              bars: [
                { label: "Won on red", value: 18, tone: "win", text: "+$18" },
                { label: "Lost on black", value: 18, tone: "lose", text: "−$18" },
                { label: "Lost on green", value: 2, tone: "muted" },
              ],
              caption: "Over 38 spins of $1",
            },
          },
          {
            text: "The 2 green spins cost $2 more. Over 38 spins you’re down $2, which is 2/38 ≈ 5.26% of every dollar you bet. That share is the house edge.",
            visual: {
              type: "bars",
              bars: [
                { label: "Won on red", value: 18, tone: "win", text: "+$18" },
                { label: "Lost on black", value: 18, tone: "lose", text: "−$18" },
                { label: "Lost on green", value: 2, tone: "hit", text: "−$2" },
              ],
              caption: "Over 38 spins of $1",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Where the edge comes from",
        body: [
          "A fair payout would make your average profit zero. A single number on this wheel loses 37 times for every win, so a fair price would be 37 to 1. The casino pays 35 to 1 and keeps the difference.",
          "Nearly every bet on an American wheel works out to the same 2/38, about 5.26%. A European wheel has a single green 0 and 37 pockets, which cuts the edge to 1/37, about 2.70%.",
        ],
      },
      {
        type: "rule",
        rule: "House edge = P(lose) × $1 − P(win) × payout, per $1 bet",
        note: "For red: 20/38 × $1 − 18/38 × $1 = 2/38, about 5.3 cents of every dollar. The payout is profit, so a 1 to 1 bet that wins pays $1.",
      },
      {
        type: "check",
        prompt: "A carnival game pays 4 to 1 if you call the number a fair die lands on. What’s the house edge?",
        choices: ["About 16.7%", "About 33.3%", "0%", "About 20%"],
        answer: 0,
        explain:
          "Per $1, you win $4 on 1 face in 6 and lose $1 on the other 5: 4/6 won against 5/6 lost. The house keeps 1/6 of each dollar, about 16.7%. A fair game would pay 5 to 1.",
      },
      {
        type: "example",
        lead: "Here is the 35 to 1 bet on a single number, on the same 38-pocket wheel.",
      },
      {
        type: "trap",
        body: "Treating red as an even bet. Red wins 18 times in 38, which is less than half, because the two green pockets are neither red nor black. Leave them out and you’ll find an edge of zero.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "A casino game has a stated payout, like 35 to 1 or 2 to 1",
          "You’re asked what a bet costs on average, per dollar or as a percent",
          "A raffle or lottery pays out less in prizes than it takes in tickets",
        ],
      },
    ],
    targetSeconds: 30,
    example: houseEdge({ type: "roulette", wheel: 38, bet: "straight" }),
    families: [
      {
        id: "die-call",
        title: "Calling the number on one die",
        generate: (random) => houseEdge({ type: "die", pays: int(random, 2, 4) }),
      },
      {
        id: "roulette-numbers",
        title: "Roulette: one to four numbers",
        generate: (random) =>
          houseEdge({ type: "roulette", wheel: pick(random, [37, 38] as const), bet: pick(random, ["straight", "split", "street", "corner"] as const) }),
      },
      {
        id: "roulette-groups",
        title: "Roulette: red, 1 to 18, dozens and columns",
        generate: (random) =>
          houseEdge({ type: "roulette", wheel: pick(random, [37, 38] as const), bet: pick(random, ["red", "low", "dozen", "column"] as const) }),
      },
      {
        id: "two-dice",
        title: "Casino bets on two dice",
        generate: (random) => diceHouseEdge({ type: "dice", bet: pick(random, DICE_BETS).id }),
      },
      {
        id: "raffle",
        title: "A raffle ticket",
        generate: (random) => raffle({ type: "raffle", ...pick(random, RAFFLES) }),
      },
    ],
  },
  {
    id: "kelly",
    title: "Kelly criterion",
    benefit: "Find how much of your bankroll to bet",
    summary: "How to size repeated bets so your money grows fastest, using the Kelly rule, and why betting more than that costs you.",
    difficulty: "Medium",
    parts: [
      {
        type: "text",
        body: [
          "You’re offered a bet on a coin that lands heads 60% of the time, at even money: if you win you gain what you staked, and if you lose you lose it. You start with $100 and can bet on as many flips as you like.",
          "What share of your money should you stake on each flip?",
        ],
      },
      {
        type: "check",
        prompt: "What share should you stake?",
        choices: ["All of it", "60%", "20%", "1%"],
        answer: 2,
        explain:
          "The Kelly rule says 20%: your chance of winning minus your chance of losing, 60% − 40%. Staking everything has the highest expected value on each flip, but your first loss takes you to zero, and over many flips that loss is certain to come.",
      },
      {
        type: "story",
        heading: "Ten flips, four ways",
        beats: [
          {
            text: "Over 10 flips, expect about 6 wins and 4 losses. Stake everything each time and the first loss leaves you with nothing.",
            visual: {
              type: "bars",
              bars: [
                { label: "Stake 10%", value: 116.2, tone: "muted" },
                { label: "20%", value: 122.3, tone: "muted" },
                { label: "50%", value: 71.2, tone: "muted" },
                { label: "100%", value: 0, tone: "lose", text: "$0" },
              ],
              caption: "Money left after 6 wins and 4 losses, from $100",
            },
          },
          {
            text: "Stake half each time and you end with about $71. Each loss halves your money, and the 50% gain from a win doesn’t make it back: 1.5 × 0.5 is 0.75.",
            visual: {
              type: "bars",
              bars: [
                { label: "Stake 10%", value: 116.2, tone: "muted" },
                { label: "20%", value: 122.3, tone: "muted" },
                { label: "50%", value: 71.2, tone: "lose", text: "$71" },
                { label: "100%", value: 0, tone: "lose", text: "$0" },
              ],
              caption: "Money left after 6 wins and 4 losses, from $100",
            },
          },
          {
            text: "Stake 10% and you end with about $116. You never come close to going broke, but the money grows slowly.",
            visual: {
              type: "bars",
              bars: [
                { label: "Stake 10%", value: 116.2, tone: "alt", text: "$116" },
                { label: "20%", value: 122.3, tone: "muted" },
                { label: "50%", value: 71.2, tone: "lose", text: "$71" },
                { label: "100%", value: 0, tone: "lose", text: "$0" },
              ],
              caption: "Money left after 6 wins and 4 losses, from $100",
            },
          },
          {
            text: "Stake 20% and you end with about $122, more than any other fixed share gives. That share is the Kelly stake.",
            visual: {
              type: "bars",
              bars: [
                { label: "Stake 10%", value: 116.2, tone: "alt", text: "$116" },
                { label: "20%", value: 122.3, tone: "hit", text: "$122" },
                { label: "50%", value: 71.2, tone: "lose", text: "$71" },
                { label: "100%", value: 0, tone: "lose", text: "$0" },
              ],
              caption: "Money left after 6 wins and 4 losses, from $100",
            },
          },
        ],
      },
      {
        type: "text",
        heading: "Why the middle wins",
        body: [
          "At a 20% stake, a win multiplies your money by 1.2 and a loss by 0.8. After many bets your money is the product of all those factors, in any order, and a loss shrinks a product more than an equal win grows it.",
          "The Kelly stake is the share that makes your money grow fastest over many bets. Stake more and you grow slower while taking bigger swings; at about twice Kelly, your money stops growing at all. Many traders stake half Kelly, which keeps about three quarters of the growth with half the swings.",
        ],
      },
      {
        type: "rule",
        rule: "Kelly stake = P(win) − P(lose) ÷ payout",
        note: "The payout is the profit per $1 staked. At even money it’s 1, so the stake is 0.6 − 0.4 = 20%. If the same coin paid 3 to 1, you’d stake 0.6 − 0.4 ÷ 3 ≈ 47%.",
      },
      {
        type: "check",
        prompt: "A bet wins 40% of the time and pays 2 to 1. What share of your bankroll does the Kelly rule say to stake?",
        choices: ["10%", "40%", "−20%", "20%"],
        answer: 0,
        explain:
          "0.4 − 0.6 ÷ 2 = 0.4 − 0.3 = 10%. Forgetting to divide by the payout gives 0.4 − 0.6 = −20%, which would wrongly turn down a bet that makes +$0.20 per $1 on average.",
      },
      {
        type: "example",
        lead: "A bet that wins 60% of the time and pays 2 to 1.",
      },
      {
        type: "trap",
        body: "Taking off the whole lose chance when the bet isn’t at even money. At 2 to 1, a win pays twice what a loss costs, so divide the lose chance by 2 before you subtract it. If the result is negative, the bet has no edge and Kelly says to stake nothing.",
      },
      {
        type: "list",
        heading: "Use it when",
        items: [
          "You’re asked what share of a bankroll to stake",
          "A bet with a known chance and payout can be repeated many times",
          "The question mentions Kelly, half Kelly or the growth rate of your money",
        ],
      },
    ],
    targetSeconds: 30,
    example: kelly({ winPercent: 60, pays: 2, half: 0 }),
    families: [
      {
        id: "even-money",
        title: "Kelly at even money",
        generate: (random) => kelly({ winPercent: pick(random, KELLY_BETS.filter(([, pays]) => pays === 1))[0], pays: 1, half: 0 }),
      },
      {
        id: "longer-odds",
        title: "Kelly at odds of 2 to 1 or longer",
        generate: (random) => {
          const [winPercent, pays] = pick(random, KELLY_BETS.filter(([, b]) => b > 1));
          return kelly({ winPercent, pays, half: 0 });
        },
      },
      {
        id: "half-kelly",
        title: "Half Kelly",
        generate: (random) => {
          const [winPercent, pays] = pick(random, KELLY_BETS);
          return kelly({ winPercent, pays, half: 1 });
        },
      },
      {
        id: "decimal-odds",
        title: "Kelly from decimal odds",
        generate: (random) => {
          const [winPercent, hundredths] = pick(random, KELLY_DECIMAL);
          return kellyDecimal({ type: "decimal", winPercent, hundredths });
        },
      },
    ],
  },
];
