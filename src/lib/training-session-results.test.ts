import assert from "node:assert/strict";
import test from "node:test";
import {
  getImplausibleResultReason,
  trainingSessionResultSchema,
  trainingSessionStartSchema,
  type TrainingSessionResult,
} from "./training-session-results";

const timedRun: TrainingSessionResult = {
  sessionId: "session-1",
  totalProblems: 90,
  correctAnswers: 90,
  duration: 121,
  averageTime: 1.1,
  bestStreak: 90,
};

test("accepts a realistic two-minute timed run", () => {
  assert.equal(getImplausibleResultReason(timedRun, 121), null);
});

test("rejects more problems than the session length allows", () => {
  assert.match(
    getImplausibleResultReason({ ...timedRun, totalProblems: 99999, correctAnswers: 99999 }, 121) ?? "",
    /Too many problems/
  );
});

test("rejects a duration longer than the server-side session", () => {
  assert.match(getImplausibleResultReason({ ...timedRun, duration: 300 }, 121) ?? "", /Duration/);
});

test("rejects inconsistent counts", () => {
  assert.match(
    getImplausibleResultReason({ ...timedRun, correctAnswers: 91 }, 121) ?? "",
    /Correct answers/
  );
  assert.match(
    getImplausibleResultReason({ ...timedRun, correctAnswers: 10, bestStreak: 11 }, 121) ?? "",
    /Best streak/
  );
});

test("schema rejects non-integer and negative counts", () => {
  assert.equal(trainingSessionResultSchema.safeParse({ ...timedRun, correctAnswers: "90" }).success, false);
  assert.equal(trainingSessionResultSchema.safeParse({ ...timedRun, totalProblems: -1 }).success, false);
  assert.equal(trainingSessionResultSchema.safeParse({ ...timedRun, bestStreak: 1.5 }).success, false);
  assert.equal(trainingSessionResultSchema.safeParse(timedRun).success, true);
});

test("a timed run's results are bounded by its time limit, not by when they arrive", () => {
  // Results for a 2:00 run sent 10 minutes later can't claim 10 minutes of solving.
  assert.match(
    getImplausibleResultReason({ ...timedRun, totalProblems: 1500, correctAnswers: 1500, bestStreak: 10, duration: 120 }, 600, 120) ?? "",
    /Too many problems/
  );
  assert.equal(getImplausibleResultReason(timedRun, 600, 120), null);
});

test("session start requires a known mode, operations, and a time limit for timed runs", () => {
  const ok = { gameMode: "timed", difficulty: "medium", operations: ["+", "-", "×", "÷"], timeLimitSeconds: 120, customRanges: false };
  assert.equal(trainingSessionStartSchema.safeParse(ok).success, true);
  assert.equal(trainingSessionStartSchema.safeParse({ ...ok, timeLimitSeconds: undefined }).success, false);
  assert.equal(trainingSessionStartSchema.safeParse({ ...ok, timeLimitSeconds: 7 }).success, false);
  assert.equal(trainingSessionStartSchema.safeParse({ ...ok, operations: "+" }).success, false);
  assert.equal(trainingSessionStartSchema.safeParse({ ...ok, gameMode: "practice", timeLimitSeconds: undefined }).success, true);
});
