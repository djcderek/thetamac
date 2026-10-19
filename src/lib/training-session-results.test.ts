import assert from "node:assert/strict";
import test from "node:test";
import {
  getImplausibleResultReason,
  trainingSessionResultSchema,
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
