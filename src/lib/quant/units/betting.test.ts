import test from "node:test";
import { BETTING_LESSONS } from "./betting";
import type { QuantProblem } from "../build";
import { checkAgainstIndependentWorking, faces, sequences } from "../test-helpers";

/** Average profit over equally likely outcomes, each paying `profit(outcome)`. */
const averageProfit = <T>(outcomes: T[], profit: (outcome: T) => number) =>
  outcomes.reduce((sum, outcome) => sum + profit(outcome), 0) / outcomes.length;

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "implied-probability": {
      if (p.type === "against") return +p.for / (+p.against + +p.for);
      // "a to b on" turned round into "b to a against", then 1 − the underdog's share.
      if (p.type === "on") return 1 - +p.against / (+p.on + +p.against);
      if (p.type === "margin") {
        const implied = [1 / (+p.a / 100), 1 / (+p.b / 100)];
        const total = implied[0] + implied[1];
        return p.ask === "margin" ? total - 1 : implied[0] / total;
      }
      if (p.type === "decimal") return 1 / (+p.hundredths / 100);
      // American odds as decimal odds, then 1 / decimal.
      const line = +p.line;
      const decimal = line > 0 ? 1 + line / 100 : 1 + 100 / -line;
      return 1 / decimal;
    }
    case "bet-ev": {
      if (p.type === "odds") {
        const stake = +p.stake;
        const bet = String(p.bet);
        if (bet.startsWith("die-")) return averageProfit(faces(6), (f) => (f === 6 ? stake * +bet.split("-")[1] : -stake));
        if (bet === "seven") return averageProfit(sequences(faces(6), 2), ([a, b]) => (a + b === 7 ? stake * 4 : -stake));
        // "odds-win-risk-percent": 100 equally likely outcomes, `percent` of them wins.
        const [, win, risk, percent] = bet.split("-").map(Number);
        return averageProfit(faces(100), (i) => (i <= percent ? (stake * win) / risk : -stake));
      }
      if (p.type === "call") {
        return averageProfit(faces(100), (i) => (i <= +p.winPercent ? +p.pot + +p.bet : -p.bet));
      }
      // The win chance where calling has zero expected value.
      const pot = +p.pot, bet = +p.bet;
      const evCall = (e: number) => e * (pot + bet) - (1 - e) * bet;
      let low = 0, high = 1;
      for (let i = 0; i < 200; i++) {
        const mid = (low + high) / 2;
        if (evCall(mid) < 0) low = mid;
        else high = mid;
      }
      return low;
    }
    case "house-edge": {
      if (p.type === "die") return -(faces(6).reduce((sum, f) => sum + (f === 1 ? +p.pays : -1), 0) / 6);
      if (p.type === "dice") {
        // Every roll of two dice, re-listing what each bet wins on.
        const bets: Record<string, [number, (a: number, b: number) => boolean]> = {
          seven: [4, (a, b) => a + b === 7],
          double: [4, (a, b) => a === b],
          twelve: [30, (a, b) => a + b === 12],
          eleven: [15, (a, b) => a + b === 11],
          craps: [7, (a, b) => a + b === 2 || a + b === 3 || a + b === 12],
          "two-or-twelve": [15, (a, b) => a + b === 2 || a + b === 12],
        };
        const [payout, wins] = bets[p.bet as string];
        return -averageProfit(sequences(faces(6), 2), ([a, b]) => (wins(a, b) ? payout : -1));
      }
      if (p.type === "raffle") {
        // Average over every ticket that could be drawn: one wins the prize, the rest win nothing.
        const tickets = +p.tickets, price = +p.price, prize = +p.prize;
        return -averageProfit(faces(tickets), (ticket) => (ticket === 1 ? prize - price : -price)) / price;
      }
      const covered: Record<string, number> = { straight: 1, split: 2, street: 3, corner: 4, dozen: 12, column: 12, red: 18, low: 18 };
      const pays: Record<string, number> = { straight: 35, split: 17, street: 11, corner: 8, dozen: 2, column: 2, red: 1, low: 1 };
      const pockets = Array.from({ length: +p.wheel }, (_, i) => i);
      const bet = p.bet as string;
      return -(pockets.reduce((sum, pocket) => sum + (pocket < covered[bet] ? pays[bet] : -1), 0) / pockets.length);
    }
    case "kelly": {
      // The stake that maximizes expected log growth, by golden-section search.
      const win = +p.winPercent / 100, b = p.type === "decimal" ? +p.hundredths / 100 - 1 : +p.pays;
      const growth = (f: number) => win * Math.log(1 + b * f) + (1 - win) * Math.log(1 - f);
      let low = 0, high = 0.999;
      for (let i = 0; i < 300; i++) {
        const a = low + (high - low) * 0.382, c = low + (high - low) * 0.618;
        if (growth(a) < growth(c)) low = a;
        else high = c;
      }
      const full = (low + high) / 2;
      return +p.half ? full / 2 : full;
    }
  }
  throw new Error(`No check for ${lessonId}`);
}

test("betting answers agree with an independent working", () => {
  checkAgainstIndependentWorking(BETTING_LESSONS, independentAnswer, { tolerance: { kelly: 1e-6 } });
});
