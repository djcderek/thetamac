import { Prisma } from "@prisma/client";
import { FULL_RUN_SLACK_SECONDS, MIN_PLAYERS, MIN_RUNS, type TimedSetup } from "./run-placement";
import { STANDARD_TIMED_LIMIT_SECONDS } from "./standard-timed-sessions";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "./training-settings";

/** The default setup (Medium, all operations, 2:00): the one the leaderboard ranks. */
export function isStandardSetup(setup: TimedSetup): boolean {
  return (
    setup.difficulty === DEFAULT_TIMED_TRAINING_SETTINGS.difficulty &&
    setup.timeLimitSeconds === STANDARD_TIMED_LIMIT_SECONDS &&
    setup.operations.length === DEFAULT_TIMED_TRAINING_SETTINGS.operations.length
  );
}

/**
 * A recorded setup is exact; legacy settings are estimates bounded by elapsed duration. On the
 * default setup, legacy runs always count as default runs, as they do on the leaderboard,
 * with only the full-length bound.
 */
export function placementSessionCandidatesSql(
  setup: TimedSetup,
  source: Prisma.Sql = Prisma.sql`training_sessions`,
): Prisma.Sql {
  const standard = isStandardSetup(setup);
  return Prisma.sql`
    SELECT s."userId" AS player, s."correctAnswers" AS score,
      ${standard ? Prisma.sql`false` : Prisma.sql`(s."timeLimitSeconds" IS NULL AND s."customRanges" IS NULL)`} AS historical,
      false AS guest
    FROM ${source} s
    WHERE s."gameMode" = 'timed'
      AND s."completedAt" IS NOT NULL
      AND s."totalProblems" > 0
      AND s."correctAnswers" BETWEEN 0 AND s."totalProblems"
      AND s."difficulty" = ${setup.difficulty}
      AND s."operations" @> ${setup.operations}::text[]
      AND s."operations" <@ ${setup.operations}::text[]
      AND s."duration" >= ${setup.timeLimitSeconds - FULL_RUN_SLACK_SECONDS}
      AND (
        (s."timeLimitSeconds" = ${setup.timeLimitSeconds} AND s."customRanges" = false)
        OR (s."timeLimitSeconds" IS NULL AND s."customRanges" IS NULL
          ${standard ? Prisma.empty : Prisma.sql`AND s."duration" <= ${setup.timeLimitSeconds + FULL_RUN_SLACK_SECONDS}`})
      )
  `;
}

/** Append to a WITH clause defining candidates(player, score, historical, guest). */
export function placementCohortSummarySql(): Prisma.Sql {
  return Prisma.sql`, exact_coverage AS (
    SELECT COUNT(*) AS runs, COUNT(DISTINCT player) AS players
    FROM candidates WHERE NOT historical
  ), selected AS (
    SELECT c.* FROM candidates c CROSS JOIN exact_coverage e
    WHERE NOT c.historical OR e.runs < ${MIN_RUNS} OR e.players < ${MIN_PLAYERS}
  )
  SELECT score, COUNT(*)::int AS count,
    (SELECT COUNT(DISTINCT player)::int FROM selected) AS players,
    (SELECT COUNT(*)::int FROM selected WHERE historical) AS "historicalRuns",
    (SELECT COUNT(*)::int FROM selected WHERE guest) AS "guestRuns"
  FROM selected GROUP BY score ORDER BY score`;
}
