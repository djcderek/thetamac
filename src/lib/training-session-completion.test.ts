import assert from "node:assert/strict";
import test from "node:test";

import { completeTrainingSession } from "./training-session-completion";
import type { TrainingSessionResult } from "./training-session-results";

const result: TrainingSessionResult = {
  sessionId: "test-session",
  totalProblems: 3,
  correctAnswers: 2,
  duration: 4,
  averageTime: 1,
  bestStreak: 2,
  timeZone: "America/Los_Angeles",
};

function createDatabase() {
  const state = {
    session: {
      id: result.sessionId,
      userId: "test-user",
      createdAt: new Date(Date.now() - 10_000),
      completedAt: null as Date | null,
      gameMode: "timed",
      timeLimitSeconds: 60,
    },
    stats: { totalProblems: 0, totalCorrect: 0, totalTimePlayed: 0, currentStreak: 0, longestStreak: 0 },
  };
  let failStats = false;
  const tx = {
    trainingSession: {
      findFirst: async ({ where }: { where: { id: string | object; userId: string } }) =>
        typeof where.id === "string" && where.userId === state.session.userId
          ? { ...state.session }
          : null,
      updateMany: async ({ data }: { data: { completedAt: Date } }) => {
        if (state.session.completedAt) return { count: 0 };
        Object.assign(state.session, data);
        return { count: 1 };
      },
      findUnique: async () => ({ ...state.session }),
    },
    userStats: {
      findUnique: async () => ({ ...state.stats }),
      update: async ({ data }: { data: {
        totalProblems: { increment: number };
        totalCorrect: { increment: number };
        totalTimePlayed: { increment: number };
        currentStreak: number;
        longestStreak: number;
      } }) => {
        if (failStats) throw new Error("Stats unavailable");
        state.stats.totalProblems += data.totalProblems.increment;
        state.stats.totalCorrect += data.totalCorrect.increment;
        state.stats.totalTimePlayed += data.totalTimePlayed.increment;
        state.stats.currentStreak = data.currentStreak;
        state.stats.longestStreak = data.longestStreak;
      },
    },
  };
  const database = {
    $transaction: async (run: (client: typeof tx) => Promise<unknown>) => {
      const before = structuredClone(state);
      try {
        return await run(tx);
      } catch (error) {
        state.session = before.session;
        state.stats = before.stats;
        throw error;
      }
    },
  } as unknown as Parameters<typeof completeTrainingSession>[0];
  return { database, state, failStats: (fail: boolean) => { failStats = fail; } };
}

test("a failed stats update rolls back completion so retry credits the run once", async () => {
  const fixture = createDatabase();
  fixture.failStats(true);
  await assert.rejects(completeTrainingSession(fixture.database, "test-user", result), /Stats unavailable/);
  assert.equal(fixture.state.session.completedAt, null);
  assert.equal(fixture.state.stats.totalProblems, 0);

  fixture.failStats(false);
  assert.equal((await completeTrainingSession(fixture.database, "test-user", result)).status, 200);
  assert.equal(fixture.state.stats.totalProblems, 3);
  assert.equal(fixture.state.stats.totalCorrect, 2);
  assert.equal(fixture.state.stats.totalTimePlayed, 4);
  assert.equal(fixture.state.stats.currentStreak, 1);
  assert.equal((await completeTrainingSession(fixture.database, "test-user", result)).status, 409);
  assert.equal(fixture.state.stats.totalProblems, 3);
});

test("another user's session cannot be completed or credited", async () => {
  const fixture = createDatabase();
  assert.equal((await completeTrainingSession(fixture.database, "other-user", result)).status, 404);
  assert.equal(fixture.state.session.completedAt, null);
  assert.equal(fixture.state.stats.totalProblems, 0);
});

test("implausible results do not complete the session or change stats", async () => {
  const fixture = createDatabase();
  assert.equal((await completeTrainingSession(fixture.database, "test-user", {
    ...result, totalProblems: 10_000,
  })).status, 400);
  assert.equal(fixture.state.session.completedAt, null);
  assert.equal(fixture.state.stats.totalProblems, 0);
});
