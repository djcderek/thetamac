import { Prisma } from "@prisma/client";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "./training-settings";

export const STANDARD_TIMED_LIMIT_SECONDS = 120;
/**
 * The most correct answers a real default run can have: 1.25 a second over 2:00. The best
 * genuine runs are around 130; anything above this is treated as forged and left out of
 * rankings, distributions and placements.
 */
export const MAX_STANDARD_SCORE = 150;
/** Correct answers per second above which a run on any other timed setup is treated as forged. */
export const MAX_CORRECT_PER_SECOND = 2;

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
