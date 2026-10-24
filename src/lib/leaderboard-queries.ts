import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { STANDARD_TIMED_LIMIT_SECONDS, standardTimedSessionSql } from "@/lib/standard-timed-sessions";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "@/lib/training-settings";
import { FULL_RUN_SLACK_SECONDS, RUNS_PER_PLAYER, type TimedSetup } from "@/lib/run-placement";

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
      SELECT g."guestId", g."displayName", g."identityVerified", g."correctAnswers", g."bestStreak", g."createdAt"
      FROM guest_training_scores g
      WHERE g."guestId" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
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

/** How many standard timed runs (signed-in and guest) ended on each score. */
export async function loadScoreCounts(guestLimit: number): Promise<{ score: number; count: number }[]> {
  return db.$queryRaw<{ score: number; count: number }[]>`
    ${guestRunsCte({}, guestLimit)}
    SELECT score, COUNT(*)::int AS count
    FROM (
      SELECT s."correctAnswers" AS score
      FROM training_sessions s
      WHERE ${standardTimedSessionSql} AND s."completedAt" IS NOT NULL
      UNION ALL
      SELECT "correctAnswers" FROM guest_runs
    ) runs
    GROUP BY score
    ORDER BY score
  `;
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
 * Scores of full-length timed runs on one setup (difficulty, the exact set of operations,
 * time limit, preset ranges), with each player's latest RUNS_PER_PLAYER runs at most. A
 * stopped run is saved like a finished one, so runs shorter than their limit are left out.
 * Guest runs carry no settings and aren't counted.
 */
export async function loadSetupScoreCounts(setup: TimedSetup): Promise<{ counts: { score: number; count: number }[]; players: number }> {
  const isStandard =
    setup.difficulty === DEFAULT_TIMED_TRAINING_SETTINGS.difficulty &&
    setup.timeLimitSeconds === STANDARD_TIMED_LIMIT_SECONDS &&
    setup.operations.length === DEFAULT_TIMED_TRAINING_SETTINGS.operations.length;
  const runs = Prisma.sql`
    WITH runs AS (
      SELECT s."userId", s."correctAnswers" AS score,
        ROW_NUMBER() OVER (PARTITION BY s."userId" ORDER BY s."completedAt" DESC) AS n
      FROM training_sessions s
      WHERE s."gameMode" = 'timed'
        AND s."completedAt" IS NOT NULL
        AND s."totalProblems" > 0
        AND s."difficulty" = ${setup.difficulty}
        AND s."operations" @> ${setup.operations}::text[]
        AND s."operations" <@ ${setup.operations}::text[]
        AND s."duration" >= ${setup.timeLimitSeconds - FULL_RUN_SLACK_SECONDS}
        AND (
          (s."timeLimitSeconds" = ${setup.timeLimitSeconds} AND s."customRanges" = false)
          ${isStandard ? Prisma.sql`OR (s."timeLimitSeconds" IS NULL AND s."customRanges" IS NULL)` : Prisma.empty}
        )
    )
  `;
  const [counts, [{ players }]] = await Promise.all([
    db.$queryRaw<{ score: number; count: number }[]>`
      ${runs}
      SELECT score, COUNT(*)::int AS count FROM runs WHERE n <= ${RUNS_PER_PLAYER} GROUP BY score ORDER BY score
    `,
    db.$queryRaw<{ players: number }[]>`${runs} SELECT COUNT(DISTINCT "userId")::int AS players FROM runs`,
  ]);
  return { counts, players };
}
