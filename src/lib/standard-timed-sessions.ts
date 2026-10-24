import { Prisma } from "@prisma/client";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "./training-settings";

export const STANDARD_TIMED_LIMIT_SECONDS = 120;
/**
 * The most correct answers a real 2:00 run can have at each difficulty. Above this a run is
 * treated as forged and left out of rankings, distributions and placements; other time limits
 * scale in proportion. The best genuine default (Medium) runs are around 130.
 */
export const MAX_SCORE_PER_TWO_MINUTES = { easy: 250, medium: 200, hard: 175, expert: 175 } as const;

/** The most correct answers a real run can have at this difficulty and time limit. */
export function maxPlausibleScore(difficulty: keyof typeof MAX_SCORE_PER_TWO_MINUTES, timeLimitSeconds: number): number {
  return Math.round((MAX_SCORE_PER_TWO_MINUTES[difficulty] * timeLimitSeconds) / 120);
}

/** The default setup is Medium at 2:00. */
export const MAX_STANDARD_SCORE = MAX_SCORE_PER_TWO_MINUTES.medium;

/**
 * Signed-in sessions that rank on the timed leaderboard: Medium, all operations, 2:00, preset
 * ranges. Sessions recorded before the time limit and range mode were stored (both null)
 * still count, since their settings are unknown.
 */
export const standardTimedSessionWhere: Prisma.TrainingSessionWhereInput = {
  gameMode: DEFAULT_TIMED_TRAINING_SETTINGS.gameMode,
  difficulty: DEFAULT_TIMED_TRAINING_SETTINGS.difficulty,
  operations: { hasEvery: [...DEFAULT_TIMED_TRAINING_SETTINGS.operations] },
  correctAnswers: { lte: MAX_STANDARD_SCORE },
  OR: [
    { timeLimitSeconds: STANDARD_TIMED_LIMIT_SECONDS, customRanges: false },
    { timeLimitSeconds: null, customRanges: null },
  ],
};

/**
 * standardTimedSessionWhere as SQL, for the leaderboard queries that total runs in the
 * database. Keep the two in step.
 */
export const standardTimedSessionSql = Prisma.sql`
  s."gameMode" = ${DEFAULT_TIMED_TRAINING_SETTINGS.gameMode}
  AND s."difficulty" = ${DEFAULT_TIMED_TRAINING_SETTINGS.difficulty}
  AND s."operations" @> ${[...DEFAULT_TIMED_TRAINING_SETTINGS.operations]}::text[]
  AND s."correctAnswers" <= ${MAX_STANDARD_SCORE}
  AND (
    (s."timeLimitSeconds" = ${STANDARD_TIMED_LIMIT_SECONDS} AND s."customRanges" = false)
    OR (s."timeLimitSeconds" IS NULL AND s."customRanges" IS NULL)
  )
`;
