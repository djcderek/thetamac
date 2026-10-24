import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MAX_STANDARD_SCORE, standardTimedSessionSql } from "@/lib/standard-timed-sessions";
import { GUEST_FULL_RUN_SHARE, MAX_LEGACY_GUEST_TOTAL, type TimedSetup } from "@/lib/run-placement";
import { isStandardSetup, placementCohortSummarySql, placementSessionCandidatesSql } from "@/lib/placement-cohort";

/**
 * The timed leaderboard's totals, worked out in the database. Loading every run and adding
 * them up in the server grew with every game played; these return one row per player (or
 * per score, for the distribution) instead.
 */

/** Unverified guest runs above this (correct answers, or problems) are old forged scores. */
export const MAX_LEGACY_GUEST_SCORE_PER_RUN = 500;

/** A time window. `from` and `until` are inclusive, `before` is exclusive. */
export type RunWindow = { from?: Date | null; until?: Date; before?: Date };

export type PlayerTotals = { userId: string; total: number; bestRun: number; bestStreak: number };

export type PersonalBestRow = { userId: string; score: number; bestStreak: number; achievedAt: Date };

function windowSql(column: Prisma.Sql, window: RunWindow) {
  const conditions: Prisma.Sql[] = [];
  if (window.from) conditions.push(Prisma.sql`${column} >= ${window.from}`);
  if (window.until) conditions.push(Prisma.sql`${column} <= ${window.until}`);
  if (window.before) conditions.push(Prisma.sql`${column} < ${window.before}`);
  return conditions.length ? Prisma.sql`AND ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
}

/**
 * Guest runs that may rank, as a CTE named "guest_runs".
 * - The guest ID must be a UUID, as signed guest IDs always are; anything else came through
 *   the old body-supplied fallback and could merge into a user's entry.
 * - Unverified runs must be plausible, and a guest whose unverified runs add up to more than
 *   `unverifiedLimit` correct answers in the window loses all of their unverified runs.
 * - Verified runs always count.
 */
function guestRunsCte(window: RunWindow, unverifiedLimit: number) {
  return Prisma.sql`
    WITH plausible AS (
      SELECT g."guestId", g."displayName", g."identityVerified", g."correctAnswers", g."bestStreak", g."averageTime", g."createdAt"
      FROM guest_training_scores g
      WHERE g."guestId" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        -- Guest runs are always on the default setup; past this a score isn't humanly possible.
        AND g."correctAnswers" <= ${MAX_STANDARD_SCORE}
        AND (
          g."identityVerified"
          OR (
            g."totalProblems" BETWEEN 0 AND ${MAX_LEGACY_GUEST_SCORE_PER_RUN}
            AND g."correctAnswers" BETWEEN 0 AND ${MAX_LEGACY_GUEST_SCORE_PER_RUN}
            AND g."correctAnswers" <= g."totalProblems"
          )
        )
        ${windowSql(Prisma.sql`g."createdAt"`, window)}
    ),
    unverified AS (
      SELECT "guestId", SUM("correctAnswers") AS total
      FROM plausible
      WHERE NOT "identityVerified"
      GROUP BY "guestId"
    ),
    guest_runs AS (
      SELECT p.*
      FROM plausible p
      LEFT JOIN unverified u ON u."guestId" = p."guestId"
      WHERE p."identityVerified" OR u.total <= ${unverifiedLimit}
    )
  `;
}

/** Each player's total correct answers, best run and best streak over standard timed runs. */
export async function loadTrainingTotals(window: RunWindow, guestLimit: number): Promise<PlayerTotals[]> {
  const [sessions, guests] = await Promise.all([
    db.$queryRaw<PlayerTotals[]>`
      SELECT s."userId",
        SUM(s."correctAnswers")::int AS total,
        MAX(s."correctAnswers") AS "bestRun",
        MAX(s."bestStreak") AS "bestStreak"
      FROM training_sessions s
      WHERE ${standardTimedSessionSql}
        AND s."completedAt" IS NOT NULL
        ${windowSql(Prisma.sql`s."completedAt"`, window)}
      GROUP BY s."userId"
    `,
    db.$queryRaw<PlayerTotals[]>`
      ${guestRunsCte(window, guestLimit)}
      SELECT "guestId" AS "userId",
        SUM(GREATEST("correctAnswers", 0))::int AS total,
        MAX(GREATEST("correctAnswers", 0)) AS "bestRun",
        MAX(GREATEST("bestStreak", 0)) AS "bestStreak"
      FROM guest_runs
      GROUP BY "guestId"
    `,
  ]);
  return [...sessions, ...guests];
}

/**
 * Each player's single best run: most correct, then the longer streak, then the earlier
 * one. Guest IDs are UUIDs and user IDs are cuids, so the two never collide.
 */
export async function loadPersonalBests(guestLimit: number): Promise<PersonalBestRow[]> {
  const [sessions, guests] = await Promise.all([
    db.$queryRaw<PersonalBestRow[]>`
      SELECT DISTINCT ON (s."userId") s."userId",
        s."correctAnswers" AS score,
        s."bestStreak" AS "bestStreak",
        s."completedAt" AS "achievedAt"
      FROM training_sessions s
      WHERE ${standardTimedSessionSql}
        AND s."completedAt" IS NOT NULL
      ORDER BY s."userId", s."correctAnswers" DESC, s."bestStreak" DESC, s."completedAt" ASC
    `,
    db.$queryRaw<PersonalBestRow[]>`
      ${guestRunsCte({}, guestLimit)}
      SELECT DISTINCT ON ("guestId") "guestId" AS "userId",
        GREATEST("correctAnswers", 0) AS score,
        GREATEST("bestStreak", 0) AS "bestStreak",
        "createdAt" AS "achievedAt"
      FROM guest_runs
      ORDER BY "guestId", GREATEST("correctAnswers", 0) DESC, GREATEST("bestStreak", 0) DESC, "createdAt" ASC
    `,
  ]);
  return [...sessions, ...guests];
}

/**
 * The name to show for each guest: from their latest verified run if they have one, else
 * their latest run. Only the runs that rank in the window count.
 */
export async function loadGuestNames(
  guestIds: string[],
  window: RunWindow,
  guestLimit: number,
): Promise<Map<string, string>> {
  if (guestIds.length === 0) return new Map();
  const rows = await db.$queryRaw<{ guestId: string; displayName: string }[]>`
    ${guestRunsCte(window, guestLimit)}
    SELECT DISTINCT ON ("guestId") "guestId", "displayName"
    FROM guest_runs
    WHERE "guestId" IN (${Prisma.join(guestIds)}) AND "displayName" <> ''
    ORDER BY "guestId", "identityVerified" DESC, "createdAt" DESC
  `;
  return new Map(rows.map((row) => [row.guestId, row.displayName]));
}

/**
 * Prefer runs with recorded matching settings. If that cohort is too small, supplement it
 * with legacy runs on the same difficulty and operations whose recorded duration is within
 * three seconds of this limit. Their timer/range settings are unknown, so the response must
 * label that comparison as estimated. Never mix other explicitly recorded settings in.
 * Eligible guest scores belong only to the default setup and use the existing full-run
 * answering-time heuristic because guest records do not contain elapsed duration.
 */
export async function loadSetupScoreCounts(setup: TimedSetup): Promise<{
  counts: { score: number; count: number }[];
  players: number;
  historicalRuns: number;
  guestRuns: number;
}> {
  const isStandard = isStandardSetup(setup);
  const sessions = placementSessionCandidatesSql(setup);
  const runs = isStandard
    ? Prisma.sql`
        ${guestRunsCte({}, MAX_LEGACY_GUEST_TOTAL)},
        candidates AS (
          ${sessions}
          UNION ALL
          SELECT "guestId" AS player, "correctAnswers" AS score, false AS historical, true AS guest
          FROM guest_runs
          WHERE "correctAnswers" > 0
            AND "averageTime" * "correctAnswers" >= ${setup.timeLimitSeconds * GUEST_FULL_RUN_SHARE}
        )
      `
    : Prisma.sql`WITH candidates AS (${sessions})`;
  // One statement keeps the histogram, distinct-player threshold and source counts on
  // the same database snapshot. A prolific player cannot meet the player threshold alone.
  const rows = await db.$queryRaw<{
    score: number; count: number; players: number; historicalRuns: number; guestRuns: number;
  }[]>`
    ${runs} ${placementCohortSummarySql()}
  `;
  return {
    counts: rows.map(({ score, count }) => ({ score, count })),
    players: rows[0]?.players ?? 0,
    historicalRuns: rows[0]?.historicalRuns ?? 0,
    guestRuns: rows[0]?.guestRuns ?? 0,
  };
}

/**
 * Correct answers across every default timed run, signed-in and guest. Stopped runs count
 * (their answers were solved); scores too high to be real, and the leaderboard's implausible
 * guest runs, don't.
 */
export async function loadProblemsSolved(): Promise<number> {
  const [{ total }] = await db.$queryRaw<{ total: bigint | number | null }[]>`
    ${guestRunsCte({}, MAX_LEGACY_GUEST_TOTAL)}
    SELECT
      (SELECT COALESCE(SUM(s."correctAnswers"), 0) FROM training_sessions s
        WHERE ${standardTimedSessionSql} AND s."completedAt" IS NOT NULL)
      + (SELECT COALESCE(SUM("correctAnswers"), 0) FROM guest_runs) AS total
  `;
  return Number(total ?? 0);
}

