import assert from "node:assert/strict";
import test from "node:test";
import { MIN_PLAYERS, MIN_RUNS, canonicalOperations, parseTimedSetup, percentileOf, placeRun, projectScore, setupKey } from "./run-placement";

// 100 runs, one at each score from 1 to 100.
const flat = Array.from({ length: 100 }, (_, i) => ({ score: i + 1, count: 1 }));

test("settings parse into one canonical setup, and bad ones are refused", () => {
  const setup = parseTimedSetup({ difficulty: "medium", operations: "÷,+,×,-", timeLimitSeconds: "120" })!;
  assert.deepEqual(setup.operations, ["+", "-", "×", "÷"]);
  assert.equal(setupKey(setup), "medium:+-×÷:120");
  assert.equal(parseTimedSetup({ difficulty: "medium", operations: "+", timeLimitSeconds: "90" }), null);
  assert.equal(parseTimedSetup({ difficulty: "silly", operations: "+", timeLimitSeconds: "120" }), null);
  assert.equal(parseTimedSetup({ difficulty: "easy", operations: "", timeLimitSeconds: "60" }), null);
  assert.equal(parseTimedSetup({ difficulty: "easy", operations: "+,%", timeLimitSeconds: "60" }), null);
  assert.deepEqual(canonicalOperations(["×", "+"]), ["+", "×"]);
});

test("the percentile counts runs below, and half the runs level with it", () => {
  assert.equal(percentileOf(flat, 50), 49.5);
  assert.equal(percentileOf(flat, 0), 0);
  assert.equal(percentileOf(flat, 101), 100);
  assert.equal(percentileOf([{ score: 10, count: 4 }], 10), 50);
});

test("a finished run is placed by its score", () => {
  const placement = placeRun(flat, 20, { correct: 80, elapsedSeconds: 120, timeLimitSeconds: 120 });
  assert.ok(placement.available);
  assert.equal(placement.basis, "score");
  assert.equal(placement.score, 80);
  assert.equal(placement.percentile, 79.5);
  assert.ok(placement.buckets[placement.userBucketIndex].from <= 80 && placement.buckets[placement.userBucketIndex].to >= 80);
});

test("a stopped run is placed by its pace over the full time", () => {
  assert.equal(projectScore(15, 30, 120), 60);
  const placement = placeRun(flat, 20, { correct: 15, elapsedSeconds: 30, timeLimitSeconds: 120 });
  assert.ok(placement.available);
  assert.equal(placement.basis, "pace");
  assert.equal(placement.score, 60);
  // Stopped a moment before the end counts as finished.
  const nearEnd = placeRun(flat, 20, { correct: 40, elapsedSeconds: 118, timeLimitSeconds: 120 });
  assert.ok(nearEnd.available && nearEnd.basis === "score" && nearEnd.score === 40);
});

test("no placement on too little data, or from a very short stopped run", () => {
  const few = flat.slice(0, MIN_RUNS - 1);
  assert.deepEqual(placeRun(few, 20, { correct: 10, elapsedSeconds: null, timeLimitSeconds: 60 }), { available: false, reason: "not_enough_runs", runs: MIN_RUNS - 1, players: 20 });
  assert.equal(placeRun(flat, MIN_PLAYERS - 1, { correct: 10, elapsedSeconds: null, timeLimitSeconds: 60 }).available, false);
  const short = placeRun(flat, 20, { correct: 5, elapsedSeconds: 10, timeLimitSeconds: 120 });
  assert.ok(!short.available && short.reason === "too_short");
});
