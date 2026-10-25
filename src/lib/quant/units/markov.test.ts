import test from "node:test";
import assert from "node:assert/strict";
import { STATES_LESSONS, patternOverlaps } from "./markov";
import { checkAgainstIndependentWorking, choose, faces, sequences, solve } from "../test-helpers";
import type { QuantProblem } from "../build";

/** An independent answer for each problem, worked out by brute force or a different formula. */
function independentAnswer(lessonId: string, problem: QuantProblem): number {
  const p = problem.params;
  switch (lessonId) {
    case "coupon-collector": {
      if (p.type === "mock-full-set") {
        // P(T > t) = P(some type still missing after t tries), by inclusion–exclusion; E[T] = Σ P(T > t).
        const n = +p.n;
        let expected = 0;
        for (let t = 0; t < 4000; t++) {
          let missing = 0;
          for (let j = 1; j <= n; j++) missing += (j % 2 ? 1 : -1) * choose(n, j) * (1 - j / n) ** t;
          expected += missing;
        }
        return expected;
      }
      if (p.type === "mock-some-types") {
        // Push the chance of each "different ones seen" count forward one try at a time.
        const n = +p.n, k = +p.k;
        let dist = Array(k + 1).fill(0);
        dist[0] = 1;
        let expected = 0;
        for (let t = 0; t < 4000; t++) {
          const next = Array(k + 1).fill(0);
          for (let seen = 0; seen < k; seen++) {
            expected += dist[seen];
            next[seen] += dist[seen] * (seen / n);
            next[seen + 1] += dist[seen] * ((n - seen) / n);
          }
          dist = next;
        }
        return expected;
      }
      if (p.k !== undefined || p.red !== undefined) {
        // Push the distribution of the state forward turn by turn; E[T] = sum of P(not done yet).
        // some-types: state = types seen (done at k). swap-urn: state = red balls left (done at 0).
        const swap = p.red !== undefined;
        const n = swap ? +p.red + +p.blue : +p.n;
        const start = swap ? +p.red : 0;
        const done = (state: number) => (swap ? state === 0 : state === +p.k);
        const moveChance = (state: number) => (swap ? state / n : (n - state) / n);
        let dist = new Map([[start, 1]]);
        let expected = 0;
        for (let t = 0; t < 6000; t++) {
          let alive = 0;
          const next = new Map<number, number>();
          for (const [state, chance] of dist) {
            if (done(state)) continue;
            alive += chance;
            const moved = swap ? state - 1 : state + 1;
            next.set(moved, (next.get(moved) ?? 0) + chance * moveChance(state));
            next.set(state, (next.get(state) ?? 0) + chance * (1 - moveChance(state)));
          }
          expected += alive;
          dist = next;
        }
        return expected;
      }
      // E[T] = sum over t of P(not every face seen after t rolls), by inclusion–exclusion.
      const n = +p.sides;
      let expected = 0;
      for (let t = 0; t < 3000; t++) {
        let notAll = 0;
        for (let j = 1; j <= n; j++) notAll += (j % 2 ? 1 : -1) * choose(n, j) * (1 - j / n) ** t;
        expected += notAll;
      }
      return expected;
    }
    case "patterns": {
      if (p.type === "mock-streak") {
        // Closed form for k in a row: (1 − pᵏ) ÷ ((1 − p) pᵏ).
        const chance = +p.pN / +p.pD, k = +p.k;
        return (1 - chance ** k) / ((1 - chance) * chance ** k);
      }
      if (p.type === "mock-fair-pattern" || p.type === "mock-weather") {
        // Matched-so-far states, solved as a linear system: E[m] = 1 + Σ chance × E[next], E[full] = 0.
        const pattern = String(p.pattern).split(" ");
        const alphabet = p.type === "mock-weather" ? ["W", "D"] : ["0", "1"];
        const wet = p.type === "mock-weather" ? +p.wetN / +p.wetD : 1 / 2;
        const chance = (symbol: string) => (p.type === "mock-weather" ? (symbol === "W" ? wet : 1 - wet) : 1 / 2);
        const size = pattern.length;
        const next = (matched: number, symbol: string) => {
          const text = [...pattern.slice(0, matched), symbol].join("");
          for (let k = Math.min(text.length, size); k > 0; k--) if (text.endsWith(pattern.slice(0, k).join(""))) return k;
          return 0;
        };
        const a = Array.from({ length: size }, () => Array(size).fill(0));
        const b = Array(size).fill(1);
        for (let m = 0; m < size; m++) {
          a[m][m] += 1;
          for (const symbol of alphabet) {
            const to = next(m, symbol);
            if (to < size) a[m][to] -= chance(symbol);
          }
        }
        return solve(a, b)[0];
      }
      if (p.k !== undefined) {
        // Run-length states 0..k−1: a success moves up one, a miss drops to 0. Solve the equations.
        const k = +p.k, chance = +p.pN / +p.pD;
        const a = Array.from({ length: k }, () => Array(k).fill(0));
        const b = Array(k).fill(1);
        for (let m = 0; m < k; m++) {
          a[m][m] += 1;
          if (m + 1 < k) a[m][m + 1] -= chance;
          a[m][0] -= 1 - chance;
        }
        return solve(a, b)[0];
      }
      if (p.ask === "even" || p.ask === "odd") {
        // Track (last flip, flip count) forward and add up where the game stops, by parity.
        const heads = +p.headsN / +p.headsD;
        const chance = { H: heads, T: 1 - heads };
        let alive: Record<"H" | "T", number> = { ...chance };
        let even = 0, odd = 0;
        for (let n = 2; n < 400; n++) {
          const next: Record<"H" | "T", number> = { H: 0, T: 0 };
          for (const last of ["H", "T"] as const) {
            const stop = alive[last] * chance[last];
            if (n % 2 === 0) even += stop;
            else odd += stop;
            const other = last === "H" ? "T" : "H";
            next[other] += alive[last] * chance[other];
          }
          alive = next;
        }
        return p.ask === "even" ? even : odd;
      }
      // Solve the waiting-time equations over "how much of the pattern is matched" states.
      const pattern = String(p.pattern).split(" ");
      const alphabet = p.type === "die" ? faces(6).map(String) : ["H", "T"];
      const heads = p.type === "biased" ? +p.headsN / +p.headsD : 1 / 2;
      const chance = (symbol: string) => (p.type === "die" ? 1 / 6 : symbol === "H" ? heads : 1 - heads);
      const step = (matched: number, symbol: string) => {
        const seen = [...pattern.slice(0, matched), symbol];
        for (let k = Math.min(seen.length, pattern.length); k > 0; k--) {
          if (seen.slice(seen.length - k).every((s, i) => s === pattern[i])) return k;
        }
        return 0;
      };
      const size = pattern.length;
      // E[m] = 1 + average of E[next]; E[size] = 0. As a linear system A·E = b.
      const a = Array.from({ length: size }, () => Array(size).fill(0));
      const b = Array(size).fill(1);
      for (let m = 0; m < size; m++) {
        a[m][m] += 1;
        for (const symbol of alphabet) {
          const next = step(m, symbol);
          if (next < size) a[m][next] -= chance(symbol);
        }
      }
      return solve(a, b)[0];
    }
    case "random-walks": {
      if (p.type === "mock-stock") {
        // Solve P[x] = up·P[x+1] + down·P[x−1] over prices from the low order to the high one.
        const size = +p.target + 1, up = +p.upN / +p.upD;
        const a = Array.from({ length: size }, () => Array(size).fill(0));
        const b = Array(size).fill(0);
        a[0][0] = 1;
        a[size - 1][size - 1] = 1;
        b[size - 1] = 1;
        for (let i = 1; i < size - 1; i++) {
          a[i][i] = 1;
          a[i][i + 1] = -up;
          a[i][i - 1] = -(1 - up);
        }
        const high = solve(a, b)[+p.start];
        return p.ask === "high" ? high : 1 - high;
      }
      if (p.type === "mock-frog") {
        // Track where the frog might be, jump by jump; E[T] = Σ P(still on a stone in the stream).
        const stones = +p.stones;
        let where = Array(stones + 1).fill(0);
        where[+p.start] = 1;
        let expected = 0;
        for (let t = 0; t < 20000; t++) {
          const next = Array(stones + 1).fill(0);
          for (let i = 1; i < stones; i++) {
            expected += where[i];
            next[i - 1] += where[i] / 2;
            next[i + 1] += where[i] / 2;
          }
          where = next;
        }
        return expected;
      }
      if (p.type === "mock-two-clear") {
        // Sum over the number of split pairs m before the deciding pair: chance (2pq)ᵐ each.
        const win = +p.pN / +p.pD, split = 2 * win * (1 - win);
        const settle = win * win + (1 - win) * (1 - win);
        let total = 0;
        for (let m = 0; m < 2000; m++) total += split ** m * (p.ask === "win" ? win * win : settle * (2 * m + 2));
        return total;
      }
      if (p.ask === "win" || p.ask === "points") {
        // States −2..2 (Ana's lead). Solve for the win chance or the expected points from deuce.
        const win = +p.pN / +p.pD;
        const a = Array.from({ length: 5 }, () => Array(5).fill(0));
        const b = Array(5).fill(0);
        a[0][0] = 1;
        a[4][4] = 1;
        if (p.ask === "win") b[4] = 1;
        for (let i = 1; i < 4; i++) {
          a[i][i] = 1;
          a[i][i + 1] = -win;
          a[i][i - 1] = -(1 - win);
          if (p.ask === "points") b[i] = 1;
        }
        return solve(a, b)[2];
      }
      if (p.sN !== undefined) {
        // E[i] = 1 + s·E[i] + u·E[i+1] + u·E[i−1], E[0] = E[N] = 0.
        const target = +p.target, stay = +p.sN / +p.sD, move = (1 - stay) / 2;
        const a = Array.from({ length: target + 1 }, () => Array(target + 1).fill(0));
        const b = Array(target + 1).fill(0);
        a[0][0] = 1;
        a[target][target] = 1;
        for (let i = 1; i < target; i++) {
          a[i][i] = 1 - stay;
          a[i][i + 1] = -move;
          a[i][i - 1] = -move;
          b[i] = 1;
        }
        return solve(a, b)[+p.start];
      }
      if (p.tokens !== undefined) {
        // Count dice outcomes for each total directly, then solve the token walk from t to 0 or 2t.
        const rolls = sequences(faces(6), +p.dice);
        const toA = rolls.filter((r) => r.reduce((x, y) => x + y, 0) === +p.aTotal).length;
        const toB = rolls.filter((r) => r.reduce((x, y) => x + y, 0) === +p.bTotal).length;
        const size = 2 * +p.tokens + 1;
        const a = Array.from({ length: size }, () => Array(size).fill(0));
        const b = Array(size).fill(0);
        a[0][0] = 1;
        a[size - 1][size - 1] = 1;
        b[size - 1] = 1;
        for (let i = 1; i < size - 1; i++) {
          // Rolls that move nothing leave you where you are, so they're part of the equation too.
          const stayChance = 1 - (toA + toB) / rolls.length;
          a[i][i] = 1 - stayChance;
          a[i][i + 1] = -toA / rolls.length;
          a[i][i - 1] = -toB / rolls.length;
        }
        return solve(a, b)[+p.tokens];
      }
      // Chances: solve P[i] = win·P[i+1] + lose·P[i−1], P[0] = 0, P[target] = 1.
      // Durations: solve E[i] = 1 + win·E[i+1] + lose·E[i−1], E[0] = E[target] = 0.
      const target = +p.target, win = +p.winN / +p.winD;
      const duration = p.ask === "bets" || p.ask === "walk";
      const size = target + 1;
      const a = Array.from({ length: size }, () => Array(size).fill(0));
      const b = Array(size).fill(0);
      a[0][0] = 1;
      a[target][target] = 1;
      if (!duration) b[target] = 1;
      for (let i = 1; i < target; i++) {
        a[i][i] = 1;
        a[i][i + 1] = -win;
        a[i][i - 1] = -(1 - win);
        if (duration) b[i] = 1;
      }
      const result = solve(a, b)[+p.start];
      return p.ask === "broke" ? 1 - result : result;
    }
    case "optimal-stopping": {
      if (p.type === "mock-ticket") {
        // Try every keep-threshold for the first ticket, averaging over both draws, and take the best.
        const n = +p.tickets, step = +p.step;
        let best = -Infinity;
        for (let keepFrom = 1; keepFrom <= n + 1; keepFrom++) {
          let sum = 0;
          for (const first of faces(n)) for (const second of faces(n)) sum += step * (first >= keepFrom ? first : second);
          best = Math.max(best, sum / (n * n));
        }
        return best;
      }
      if (p.type === "mock-wheel") {
        // List the slices and find the first total where one more spin doesn't gain on average.
        const n = +p.slices, busts = +p.busts, step = +p.step;
        const slices = faces(n).map((s) => (s > n - busts ? null : step * s));
        for (let points = 0; points < 1000; points++) {
          const change = slices.reduce((sum: number, s) => sum + (s === null ? -points : s), 0) / n;
          if (change <= 1e-9) return points;
        }
        throw new Error("no stopping total");
      }
      if (p.type === "mock-paid-machine") {
        // Value iteration: V = average of max(payout, V − fee), from V = 0 until it settles.
        const top = +p.top, fee = +p.costN / +p.costD;
        let worth = 0;
        for (let i = 0; i < 20000; i++) worth = faces(top).reduce((sum, x) => sum + Math.max(x, worth - fee), 0) / top;
        if (p.ask === "value") return worth;
        return faces(top).find((x) => x >= worth - fee - 1e-9)!;
      }
      if (p.type === "doubles" || p.type === "total" || p.type === "pig") {
        // For each score, list every outcome of one more roll and find the first score where it doesn't pay.
        const outcomes: { bust: boolean; add: number }[] = [];
        if (p.type === "pig") for (const f of faces(+p.sides)) outcomes.push({ bust: f === 1, add: f });
        else {
          const n = p.type === "doubles" ? +p.sides : 6;
          for (const [x, y] of sequences(faces(n), 2)) outcomes.push({ bust: p.type === "doubles" ? x === y : x + y === +p.total, add: x + y });
        }
        for (let score = 0; score < 1000; score++) {
          const gain = outcomes.reduce((sum, o) => sum + (o.bust ? -score : o.add), 0) / outcomes.length;
          if (gain <= 1e-9) return score;
        }
        throw new Error("no stopping score");
      }
      if (p.costN !== undefined) {
        // Value iteration: V = average of max(face, V − cost), from V = 0 until it settles.
        const sides = +p.sides, cost = +p.costN / +p.costD;
        let worth = 0;
        for (let i = 0; i < 20000; i++) worth = faces(sides).reduce((sum, f) => sum + Math.max(f, worth - cost), 0) / sides;
        if (p.ask === "value") return worth;
        return faces(sides).find((f) => f >= worth - cost - 1e-9)!;
      }
      if (p.type === "uniform") {
        // Numerically integrate max(x, value of going on) over x, one redraw at a time.
        const steps = 200000;
        const average = (f: (x: number) => number) => {
          let sum = 0;
          for (let i = 0; i < steps; i++) sum += f((i + 0.5) / steps);
          return sum / steps;
        };
        let worth = average((x) => x);
        for (let i = 0; i < +p.redraws; i++) {
          const goOn = worth;
          worth = average((x) => Math.max(x, goOn));
        }
        return worth * +p.scale;
      }
      // Try every keep-threshold and take the best, by brute force over the roll sequences.
      const sides = +p.sides;
      const rolls = sequences(faces(sides), +p.rerolls + 1);
      let best = -Infinity;
      for (const thresholds of sequences(faces(sides + 1), +p.rerolls)) {
        const worth =
          rolls.reduce((sum, seq) => {
            const stop = seq.findIndex((roll, i) => i === seq.length - 1 || roll >= thresholds[i]);
            return sum + seq[stop];
          }, 0) / rolls.length;
        best = Math.max(best, worth);
      }
      return best;
    }
  }
  throw new Error(`No check for ${lessonId}`);
}

test("markov answers agree with an independent working", () => {
  checkAgainstIndependentWorking(STATES_LESSONS, independentAnswer, {
    samples: { "optimal-stopping": 60 },
    tolerance: { "coupon-collector": 1e-7, patterns: 1e-7, "random-walks": 1e-7, "optimal-stopping": 1e-6 },
  });
});

test("pattern overlaps are the lengths where the start matches the end", () => {
  assert.deepEqual(patternOverlaps(["H", "T", "H"]), [1, 3]);
  assert.deepEqual(patternOverlaps(["H", "H"]), [1, 2]);
  assert.deepEqual(patternOverlaps(["H", "T"]), [2]);
  assert.deepEqual(patternOverlaps(["H", "T", "H", "T"]), [2, 4]);
});
