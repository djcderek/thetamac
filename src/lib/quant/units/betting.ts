import { div, formatDollars, formatFraction, formatPercent, mul, q, sub, type Rational } from "../rational";
import { int, pick, problem, type QuantLessonDef, type QuantProblem } from "../build";

function oddsToChance(
  params:
    | { type: "against"; against: number; for: number }
    | { type: "decimal"; hundredths: number }
    | { type: "american"; line: number },
) {
  switch (params.type) {
    case "against": {
      const { against, for: forOdds } = params;
      return problem(
        `against-${against}-${forOdds}`,
        `A horse is ${against} to ${forOdds} against. What chance of winning do those odds imply?`,
        q(forOdds, against + forOdds),
        "percent",
        [
          { label: "Wins", work: `${forOdds} in every ${against} + ${forOdds}`, result: `${forOdds}/${against + forOdds}` },
          { label: "Chance", work: `${forOdds} ÷ ${against + forOdds}` },
        ],
        params,
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
          { label: "Decimal odds are 1 ÷ chance", work: `${odds} = 1 ÷ chance` },
          { label: "Chance", work: `1 ÷ ${odds}` },
        ],
        params,
      );
    }
    case "american": {
      const { line } = params;
      const favourite = line < 0;
      const stake = Math.abs(line);
      const chance = favourite ? q(stake, stake + 100) : q(100, line + 100);
      return problem(
        `american-${line}`,
        favourite
          ? `A team is −${stake}: you bet $${stake} to win $100. What chance does that imply?`
          : `A team is +${line}: a $100 bet wins $${line}. What chance does that imply?`,
        chance,
        "percent",
        [
          { label: "You risk", work: favourite ? `$${stake} to win $100` : `$100 to win $${line}` },
          { label: "Chance is risk ÷ (risk + win)", work: favourite ? `${stake} ÷ ${stake + 100}` : `100 ÷ ${line + 100}` },
        ],
        params,
      );
    }
  }
}

/** "40%" when the chance is a whole percent, else "1/6". */
const chanceText = (chance: Rational) => ((chance.n * 100) % chance.d === 0 ? formatPercent(chance) : formatFraction(chance));

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
        { label: "Win times its chance", work: `${formatDollars(winAmount)} × ${chanceText(chance)}`, result: formatDollars(gain) },
        { label: "Loss times its chance", work: `$${stake} × ${chanceText(lose)}`, result: formatDollars(loss) },
        { label: "Expected profit", work: `${formatDollars(gain)} − ${formatDollars(loss)}` },
      ],
      params,
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
        { label: "Win the pot and their bet", work: `$${pot + bet} × ${winPercent}%`, result: formatDollars(gain) },
        { label: "Lose your call", work: `$${bet} × ${100 - winPercent}%`, result: formatDollars(loss) },
        { label: "Expected profit", work: `${formatDollars(gain)} − ${formatDollars(loss)}` },
      ],
      params,
    );
  }
  const { pot, bet } = params;
  const total = pot + 2 * bet;
  return problem(
    `pot-${pot}-${bet}`,
    `There's $${pot} in the pot and your opponent bets $${bet}. What's the least chance of winning that makes calling the $${bet} break even?`,
    q(bet, total),
    "percent",
    [
      { label: "Pot after you call", work: `${pot} + ${bet} + ${bet}`, result: `$${total}` },
      { label: "Your call ÷ that pot", work: `${bet} ÷ ${total}` },
    ],
    params,
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

function houseEdge(params: { type: "roulette"; wheel: 37 | 38; bet: string } | { type: "die"; pays: number }) {
  if (params.type === "die") {
    const { pays } = params;
    const edge = q(5 - pays, 6);
    return problem(
      `die-${pays}`,
      `A dice game pays ${pays} to 1 if you call the number a fair die lands on. What's the house edge, as a share of each bet?`,
      edge,
      "percent",
      [
        { label: "Win times its chance", work: `$${pays} × 1/6`, result: formatDollars(q(pays, 6)) },
        { label: "Loss times its chance", work: "$1 × 5/6", result: formatDollars(q(5, 6)) },
        { label: "Average loss per $1", work: `(5 − ${pays}) ÷ 6` },
      ],
      params,
    );
  }
  const { wheel, bet: betId } = params;
  const bet = ROULETTE_BETS.find((b) => b.id === betId)!;
  const losing = wheel - bet.numbers;
  const edge = q(losing - bet.numbers * bet.pays, wheel);
  return problem(
    `roulette-${wheel}-${bet.id}`,
    `${wheel === 38 ? "An American" : "A European"} roulette wheel has ${wheel} pockets. You bet $1 on ${bet.label}. What's the house edge?`,
    edge,
    "percent",
    [
      { label: "Win times its chance", work: `$${bet.pays} × ${bet.numbers}/${wheel}`, result: formatDollars(q(bet.pays * bet.numbers, wheel)) },
      { label: "Loss times its chance", work: `$1 × ${losing}/${wheel}`, result: formatDollars(q(losing, wheel)) },
      { label: "Average loss per $1", work: `(${losing} − ${bet.pays * bet.numbers}) ÷ ${wheel}` },
    ],
    params,
  );
}

function kelly(params: { winPercent: number; pays: number; half: 0 | 1 }) {
  const { winPercent, pays, half } = params;
  const p = q(winPercent, 100);
  const lose = sub(q(1), p);
  const full = sub(p, div(lose, q(pays)));
  const steps =
    pays === 1
      ? [
          // Even money: p − (1 − p) = 2p − 1.
          { label: "Even money: chance to win − chance to lose", work: `${winPercent}% − ${formatPercent(lose)}`, result: formatPercent(full) },
        ]
      : [
          { label: "Chance to lose", work: `100% − ${winPercent}%`, result: formatPercent(lose) },
          { label: "Chance to lose ÷ payout", work: `${formatPercent(lose)} ÷ ${pays}`, result: formatPercent(div(lose, q(pays))) },
          { label: "Kelly stake: chance to win − that", work: `${winPercent}% − ${formatPercent(div(lose, q(pays)))}`, result: formatPercent(full) },
        ];
  if (half) steps.push({ label: "Half Kelly", work: `${formatPercent(full)} ÷ 2`, result: "" });
  return problem(
    `kelly-${winPercent}-${pays}-${half ? "half" : "full"}`,
    `A bet wins ${winPercent}% of the time and pays ${pays} to 1. What share of your bankroll does ${half ? "half Kelly (half the Kelly stake)" : "the Kelly rule"} say to stake?`,
    half ? div(full, q(2)) : full,
    "percent",
    steps,
    params,
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
    targetSeconds: 30,
    example: kelly({ winPercent: 60, pays: 2, half: 0 }),
    generate: (random) => {
      const [winPercent, pays] = pick(random, KELLY_BETS);
      return kelly({ winPercent, pays, half: random() < 0.3 ? 1 : 0 });
    },
  },
];
