import assert from "node:assert/strict";
import { after, test } from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";
import { placementCohortSummarySql, placementSessionCandidatesSql } from "./placement-cohort";
import type { TimedSetup } from "./run-placement";

// Opt-in PostgreSQL integration checks. The fixtures exist only inside SELECT CTEs;
// the transaction is READ ONLY, so these never create or modify database records.
const url = process.env.PLACEMENT_SQL_TEST_URL;
const database = url ? new PrismaClient({ datasources: { db: { url } }, log: [] }) : null;
after(async () => { await database?.$disconnect(); });

const setup: TimedSetup = { difficulty: "hard", operations: ["+", "-", "×", "÷"], timeLimitSeconds: 120 };
const session = (overrides: Record<string, unknown> = {}) => ({
  userId: "fixture-player", gameMode: "timed", difficulty: "hard",
  operations: ["+", "-", "×", "÷"], completedAt: "2026-10-24T00:00:00Z",
  totalProblems: 100, correctAnswers: 10, duration: 120,
  timeLimitSeconds: null, customRanges: null, ...overrides,
});

async function query(rows: ReturnType<typeof session>[], config = setup) {
  assert.ok(database);
  return database.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    return tx.$queryRaw<{ score: number; count: number; players: number; historicalRuns: number; guestRuns: number }[]>`
      WITH fixture_sessions AS (
        SELECT * FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS r(
          "userId" text, "gameMode" text, difficulty text, operations text[],
          "completedAt" timestamp, "totalProblems" int, "correctAnswers" int,
          duration int, "timeLimitSeconds" int, "customRanges" boolean
        )
      ), candidates AS (${placementSessionCandidatesSql(config, Prisma.sql`fixture_sessions`)})
      ${placementCohortSummarySql()}
    `;
  });
}

test("historical fallback matches non-default difficulty, exact operations and bounded duration", { skip: !url }, async () => {
  const rows = await query([
    session({ userId: "a", duration: 117, correctAnswers: 12 }),
    session({ userId: "b", duration: 123, correctAnswers: 14 }),
    session({ userId: "c", timeLimitSeconds: 120, customRanges: false, correctAnswers: 21 }),
    session({ duration: 116 }), session({ duration: 124 }),
    session({ timeLimitSeconds: 60, customRanges: false }),
    session({ difficulty: "medium" }), session({ operations: ["+"] }),
    session({ customRanges: true }), session({ timeLimitSeconds: 120 }),
    session({ customRanges: false }), session({ gameMode: "practice" }),
    session({ completedAt: null }), session({ totalProblems: 0 }), session({ correctAnswers: 101 }),
  ]);
  assert.deepEqual(rows.map(({ score, count }) => ({ score, count })), [
    { score: 12, count: 1 }, { score: 14, count: 1 }, { score: 21, count: 1 },
  ]);
  assert.ok(rows.every((r) => r.players === 3 && r.historicalRuns === 2 && r.guestRuns === 0));
});

test("historical duration follows the selected timer, including five-minute runs", { skip: !url }, async () => {
  const rows = await query([
    session({ duration: 297 }), session({ duration: 303 }),
    session({ duration: 296 }), session({ duration: 304 }),
    session({ timeLimitSeconds: 120, customRanges: false, duration: 300 }),
  ], { ...setup, timeLimitSeconds: 300 });
  assert.equal(rows.reduce((sum, r) => sum + r.count, 0), 2);
  assert.equal(rows[0].historicalRuns, 2);
});

test("enough exact runs and distinct players exclude historical estimates", { skip: !url }, async () => {
  const rows = await query([
    ...Array.from({ length: 30 }, (_, i) => session({ userId: `exact-${i % 8}`, timeLimitSeconds: 120, customRanges: false })),
    ...Array.from({ length: 40 }, (_, i) => session({ userId: `legacy-${i}`, correctAnswers: 99 })),
  ]);
  assert.deepEqual(rows, [{ score: 10, count: 30, players: 8, historicalRuns: 0, guestRuns: 0 }]);
});

test("many exact runs from one player still need the historical cohort", { skip: !url }, async () => {
  const rows = await query([
    ...Array.from({ length: 30 }, () => session({ timeLimitSeconds: 120, customRanges: false })),
    ...Array.from({ length: 8 }, (_, i) => session({ userId: `legacy-${i}`, correctAnswers: 20 })),
  ]);
  assert.equal(rows.reduce((sum, r) => sum + r.count, 0), 38);
  assert.ok(rows.every((r) => r.players === 9 && r.historicalRuns === 8));
});
