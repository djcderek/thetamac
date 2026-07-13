import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateDuelResults,
  aggregateRaceResults,
  aggregateTrainingRuns,
  calculateRankTrends,
  getPersonalBestTrainingScores,
  getQueryStart,
  isInComparisonPeriod,
  isInCurrentPeriod,
  sortRankedItems,
  type RankedItem,
} from "./leaderboard-ranking";

test("training rankings use total solved with best run and streak tie-breakers", () => {
  const entries = sortRankedItems(
    aggregateTrainingRuns([
      { userId: "a", correctAnswers: 30, bestStreak: 18 },
      { userId: "a", correctAnswers: 20, bestStreak: 20 },
      { userId: "b", correctAnswers: 50, bestStreak: 15 },
    ])
  );

  assert.deepEqual(entries.map((entry) => entry.userId), ["b", "a"]);
  assert.deepEqual(entries[0].performance, { kind: "bestRun", value: 50 });
  assert.deepEqual(entries[1].performance, { kind: "bestRun", value: 30 });
});

test("top scores keep one personal best per player", () => {
  const scores = getPersonalBestTrainingScores([
    { userId: "a", correctAnswers: 30, bestStreak: 20, achievedAt: new Date("2026-07-10T00:00:00Z") },
    { userId: "a", correctAnswers: 35, bestStreak: 22, achievedAt: new Date("2026-07-11T00:00:00Z") },
    { userId: "b", correctAnswers: 35, bestStreak: 18, achievedAt: new Date("2026-07-09T00:00:00Z") },
  ]);

  assert.deepEqual(scores.map((entry) => entry.userId), ["a", "b"]);
  assert.equal(scores[0].score, 35);
  assert.equal(scores.filter((entry) => entry.userId === "a").length, 1);
});

test("duel rankings expose W-L-D records without answer accuracy", () => {
  const entries = aggregateDuelResults(
    [
      {
        player1Id: "a",
        player2Id: "b",
        player1RatingChange: 12,
        player2RatingChange: -12,
        winnerId: "a",
        isDraw: false,
      },
      {
        player1Id: "a",
        player2Id: "b",
        player1RatingChange: 0,
        player2RatingChange: 0,
        winnerId: null,
        isDraw: true,
      },
    ],
    true
  );
  const playerA = entries.find((entry) => entry.userId === "a");
  const playerB = entries.find((entry) => entry.userId === "b");

  assert.equal(playerA?.score, 1012);
  assert.deepEqual(playerA?.performance, {
    kind: "duelRecord",
    wins: 1,
    losses: 0,
    draws: 1,
  });
  assert.deepEqual(playerB?.performance, {
    kind: "duelRecord",
    wins: 0,
    losses: 1,
    draws: 1,
  });
  assert.equal("accuracy" in (playerA ?? {}), false);
});

test("racing rankings expose wins and race participation", () => {
  const entries = aggregateRaceResults(
    [
      { userId: "a", ratingChange: 10, finishPosition: 1 },
      { userId: "a", ratingChange: -2, finishPosition: null },
      { userId: "b", ratingChange: 4, finishPosition: 2 },
    ],
    false
  );
  const playerA = entries.find((entry) => entry.userId === "a");

  assert.equal(playerA?.score, 8);
  assert.deepEqual(playerA?.performance, {
    kind: "raceRecord",
    wins: 1,
    races: 2,
  });
});

function item(userId: string, score: number): RankedItem {
  return {
    userId,
    score,
    performance: { kind: "bestRun", value: score },
    tieBreakers: [score],
  };
}

test("rank trends report movement, unchanged ranks, and new entrants", () => {
  const previous = [item("a", 100), item("b", 90), item("c", 80)];
  const current = [item("b", 110), item("a", 100), item("c", 80), item("d", 70)];
  const trends = calculateRankTrends(current, previous);

  assert.deepEqual(trends.get("b"), { kind: "up", places: 1 });
  assert.deepEqual(trends.get("a"), { kind: "down", places: 1 });
  assert.deepEqual(trends.get("c"), { kind: "same" });
  assert.deepEqual(trends.get("d"), { kind: "new" });
});

test("rank trends are unavailable when there is no comparison cohort", () => {
  const trends = calculateRankTrends([item("a", 100)], []);
  assert.deepEqual(trends.get("a"), { kind: "unavailable" });
});

test("daily and weekly windows separate current and previous activity", () => {
  const now = new Date("2026-07-12T20:00:00.000Z");
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  assert.equal(isInCurrentPeriod(twelveHoursAgo, "daily", now), true);
  assert.equal(isInComparisonPeriod(thirtyHoursAgo, "daily", now), true);
  assert.equal(isInComparisonPeriod(tenDaysAgo, "weekly", now), true);
  assert.equal(getQueryStart("daily", now)?.toISOString(), "2026-07-10T20:00:00.000Z");
  assert.equal(getQueryStart("all", now), null);
});
