import { Prisma } from "@prisma/client";
import { FULL_RUN_SLACK_SECONDS, MIN_PLAYERS, MIN_RUNS, type TimedSetup } from "./run-placement";

/** A recorded setup is exact; legacy settings are estimates bounded by elapsed duration. */
export function placementSessionCandidatesSql(
  setup: TimedSetup,
  source: Prisma.Sql = Prisma.sql`training_sessions`,
): Prisma.Sql {
  return Prisma.sql`
    SELECT s."userId" AS player, s."correctAnswers" AS score,
      (s."timeLimitSeconds" IS NULL AND s."customRanges" IS NULL) AS historical,
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
          AND s."duration" <= ${setup.timeLimitSeconds + FULL_RUN_SLACK_SECONDS})
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
