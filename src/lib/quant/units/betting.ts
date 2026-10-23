import { div, formatDollars, formatFraction, formatPercent, mul, q, sub, value, type Rational } from "../rational";
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

/** "40%" when the chance is a whole percent, else "1/6". */
const chanceText = (chance: Rational) => ((chance.n * 100) % chance.d === 0 ? formatPercent(chance) : formatFraction(chance));

/** Average winnings and average losses as bars, with the difference once it's worked out. */
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
    setup: (stake: number) => `A bet pays ${win} to ${risk} and wins with chance ${percent}%. What's your expected profit on a $${stake} bet?`,
    pays: [win, risk] as [number, number],
    chance: [percent, 100] as [number, number],
  })),
  ...([4, 5, 6] as const).map((pays) => ({
    id: `die-${pays}`,
    setup: (stake: number) =>
      `You bet $${stake} that a fair die lands on 6, and a win pays ${pays} to 1. What's your expected profit on the bet?`,
    pays: [pays, 1] as [number, number],
    chance: [1, 6] as [number, number],
  })),
  {
    id: "seven",
    setup: (stake: number) => `You bet $${stake} that two dice total 7, and a win pays 4 to 1. What's your expected profit on the bet?`,
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
          explain: "Average winnings minus average losses is what the bet makes each time, on average. Above zero, it makes money.",
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
      `There's $${pot} in the pot and your opponent bets $${bet}. If you call, you win ${winPercent}% of the time. What's your expected profit from calling?`,
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
    `There's $${pot} in the pot and your opponent bets $${bet}. What's the least chance of winning that makes calling the $${bet} break even?`,
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
];

/** Average win and loss per $1, then the house's share once it's worked out. */
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
      `A dice game pays ${pays} to 1 if you call the number a fair die lands on. What's the house edge, as a share of each bet?`,
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
    `${wheel === 38 ? "An American" : "A European"} roulette wheel has ${wheel} pockets. You bet $1 on ${bet.label}. What's the house edge?`,
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
            explain: "At 1 to 1 a win and a loss are the same size, so the stake is just your edge: win chance minus lose chance.",
            visual: stakeLine(full, "staked"),
          },
        ]
      : [
          {
            label: "Chance to lose",
            work: `100% − ${winPercent}%`,
            result: formatPercent(lose),
            icon: "subtract",
            explain: "Whatever doesn’t win, loses.",
          },
          {
            label: "Chance to lose ÷ payout",
            work: `${formatPercent(lose)} ÷ ${pays}`,
            result: formatPercent(div(lose, q(pays))),
            icon: "divide",
            explain: `A win pays ${pays} times your stake, so losses weigh less against you. Divide the lose chance by the payout.`,
          },
          {
            label: "Kelly stake: chance to win − that",
            work: `${winPercent}% − ${formatPercent(div(lose, q(pays)))}`,
            result: formatPercent(full),
            icon: "subtract",
            explain: "What’s left of your win chance is the share of your bankroll to bet.",
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
    idea: "Odds are another way to write a chance. 3 to 1 against means you win 1 time in every 4, and decimal odds of 2.50 mean a chance of 1 ÷ 2.50.",
    difficulty: "Easy",
    intro:
      "Odds compare how often you lose with how often you win. 3 to 1 against means 3 losses for every 1 win, so 1 win in every 4. Decimal odds are what a winning $1 bet pays back in total, and a fair price pays back 1 ÷ chance.",
    formula: "a to b against: chance = b ÷ (a + b);  decimal odds d: chance = 1 ÷ d",
    cues: [
      "It gives odds like 3 to 1, a price like 2.50, or a line like −150",
      "It asks what chance the odds imply",
    ],
    mistake: "Reading 3 to 1 against as a 1 in 3 chance: it’s 1 win for every 3 losses, so 1 in 4.",
    targetSeconds: 20,
    example: oddsToChance({ type: "against", against: 3, for: 1 }),
    generate: (random) =>
      pick(random, [
        () => {
          const [against, forOdds] = pick(random, [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [9, 1], [3, 2], [5, 2], [7, 2], [5, 4], [7, 4]] as const);
          return oddsToChance({ type: "against", against, for: forOdds });
        },
        () => oddsToChance({ type: "decimal", hundredths: pick(random, [125, 150, 200, 250, 400, 500, 800]) }),
        () => oddsToChance({ type: "american", line: pick(random, [-400, -300, -200, -150, 150, 200, 300, 400]) }),
      ])(),
  },
  {
    id: "bet-ev",
    title: "Expected value of a bet",
    benefit: "Decide whether a bet makes money",
    idea: "Multiply what you could win by its chance, and subtract what you could lose times its chance. A bet makes money when that’s above zero, so a call breaks even when your chance of winning equals your call ÷ the pot after you call.",
    difficulty: "Medium",
    intro:
      "Picture making the same bet many times. You win the payout with chance p and lose your stake otherwise, so on average each bet makes (win × p) − (stake × (1 − p)). If that’s above zero, the bet makes money over time, even though any one bet can lose.",
    formula: "Expected profit = win × P(win) − stake × P(lose)",
    cues: [
      "A payout and a chance of winning are both given",
      "It asks whether a bet or a call is worth it, or what it makes on average",
      "A poker pot and a bet you could call",
    ],
    mistake: "Counting your returned stake as winnings: at 2 to 1, a winning $1 bet makes $2, not $3.",
    targetSeconds: 30,
    example: betEv({ type: "odds", bet: "odds-2-1-40", stake: 10 }),
    generate: (random) =>
      pick(random, [
        () => betEv({ type: "odds", bet: pick(random, ODDS_BETS).id, stake: pick(random, [5, 10, 20, 50, 100]) }),
        () =>
          betEv({
            type: "call",
            pot: pick(random, [40, 60, 80, 100, 150]),
            bet: pick(random, [10, 20, 30, 50]),
            winPercent: pick(random, [15, 20, 25, 30, 35, 40]),
          }),
        () => betEv({ type: "break-even", pot: pick(random, [20, 40, 50, 60, 80, 100, 150, 200]), bet: pick(random, [10, 20, 25, 30, 40, 50, 100]) }),
      ])(),
  },
  {
    id: "house-edge",
    title: "House edge",
    benefit: "Find what a casino bet costs per $1",
    idea: "The house edge is how much you lose, on average, for every $1 you bet.",
    difficulty: "Easy",
    intro:
      "Casinos pay a little less than a fair price. A fair payout would make your average profit zero; the house edge is how far below zero it falls, for every $1 you bet. That’s why the casino wins over many bets even though players win some.",
    formula: "House edge = P(lose) × $1 − P(win) × payout, per $1 bet",
    cues: [
      "A casino bet with a stated payout, like 35 to 1",
      "It asks for the house edge or the average loss per $1",
    ],
    mistake: "Forgetting the green zero pockets: on a 38-pocket wheel, red wins 18 times in 38, not half the time.",
    targetSeconds: 30,
    example: houseEdge({ type: "roulette", wheel: 38, bet: "straight" }),
    generate: (random) =>
      random() < 0.2
        ? houseEdge({ type: "die", pays: int(random, 3, 4) })
        : houseEdge({ type: "roulette", wheel: pick(random, [37, 38] as const), bet: pick(random, ROULETTE_BETS).id }),
  },
  {
    id: "kelly",
    title: "Kelly criterion",
    benefit: "Find how much of your bankroll to bet",
    idea: "Bet this share of your money: your chance of winning, minus your chance of losing divided by the payout. At even money that’s just win chance − lose chance. Half Kelly bets half of it, for smaller swings.",
    difficulty: "Medium",
    intro:
      "Bet too little and your money grows slowly; bet too much and a run of losses wipes you out. The Kelly stake is the share of your bankroll that makes it grow fastest over many bets. It’s bigger when your edge is bigger, and smaller when the payout is long.",
    formula: "Kelly stake = P(win) − P(lose) ÷ payout",
    cues: [
      "“What share of your bankroll should you bet?”",
      "A bet with a known chance of winning and a payout",
      "It mentions Kelly or half Kelly",
    ],
    mistake: "Subtracting the whole lose chance at long odds: at 2 to 1, divide the lose chance by 2 before taking it off.",
    targetSeconds: 30,
    example: kelly({ winPercent: 60, pays: 2, half: 0 }),
    generate: (random) => {
      const [winPercent, pays] = pick(random, KELLY_BETS);
      return kelly({ winPercent, pays, half: random() < 0.3 ? 1 : 0 });
    },
  },
];
