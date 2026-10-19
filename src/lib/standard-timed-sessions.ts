import type { Prisma } from "@prisma/client";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "./training-settings";

export const STANDARD_TIMED_LIMIT_SECONDS = 120;

/**
 * Signed-in sessions that rank on the timed leaderboard: Medium, all operations, 2:00, preset
 * ranges. Sessions recorded before the time limit and range mode were stored (both null)
 * still count, since their settings are unknown.
 */
export const standardTimedSessionWhere: Prisma.TrainingSessionWhereInput = {
  gameMode: DEFAULT_TIMED_TRAINING_SETTINGS.gameMode,
  difficulty: DEFAULT_TIMED_TRAINING_SETTINGS.difficulty,
  operations: { hasEvery: [...DEFAULT_TIMED_TRAINING_SETTINGS.operations] },
  OR: [
    { timeLimitSeconds: STANDARD_TIMED_LIMIT_SECONDS, customRanges: false },
    { timeLimitSeconds: null, customRanges: null },
  ],
};
