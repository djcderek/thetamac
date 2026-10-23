import assert from "node:assert/strict";
import test from "node:test";

// training-distribution imports the db; these are only the pure parts.
process.env.DATABASE_URL ??= "postgresql://localhost:5432/test";

// The summary before scores were counted in the database: one entry per run.
function fromEveryRun(scores: number[]) {
  const sorted = [...scores].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return {
    total: scores.length,
    median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    mean,
    stdDev: Math.sqrt(scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length),
  };
}

function counts(scores: number[]) {
  const map = new Map<number, number>();
  for (const score of scores) map.set(score, (map.get(score) ?? 0) + 1);
  return [...map].map(([score, count]) => ({ score, count })).sort((a, b) => a.score - b.score);
}

test("scores counted per value give the same summary as every run listed", async () => {
  const { summarizeScoreCounts } = await import("./training-distribution");
  for (const scores of [[7], [3, 9], [0, 0, 5, 5, 5, 12, 40, 41, 41, 200], [10, 10, 10, 11]]) {
    const result = summarizeScoreCounts(counts(scores));
    const expected = fromEveryRun(scores);
    assert.equal(result.total, expected.total);
    assert.equal(result.median, expected.median);
    assert.ok(Math.abs(result.mean! - expected.mean) < 1e-9);
    assert.ok(Math.abs(result.stdDev! - expected.stdDev) < 1e-9);
    assert.equal(result.buckets.reduce((sum, bucket) => sum + bucket.count, 0), scores.length);
  }
});

test("a wide spread is split into at most 48 buckets with no gaps", async () => {
  const { summarizeScoreCounts } = await import("./training-distribution");
  const { buckets } = summarizeScoreCounts(counts([0, 3, 50, 99, 150]));
  assert.ok(buckets.length <= 48);
  assert.equal(buckets[0].from, 0);
  for (let i = 1; i < buckets.length; i++) assert.equal(buckets[i].from, buckets[i - 1].to + 1);
  assert.deepEqual(summarizeScoreCounts([]), { buckets: [], total: 0, median: null, mean: null, stdDev: null });
});
