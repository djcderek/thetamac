import { z } from "zod";
import { TIMED_MODE_LIMITS } from "./training-settings";

// Generous ceiling on solve rate; the best timed runs stay well under 2 problems per second.
export const MAX_PROBLEMS_PER_SECOND = 4;
// Allowance for request latency between the client's run clock and the session's createdAt.
const ELAPSED_SLACK_SECONDS = 5;

const count = z.number().int().nonnegative();

export const trainingSessionStartSchema = z
  .object({
    gameMode: z.enum(["timed", "practice", "learning"]),
    difficulty: z.enum(["easy", "medium", "hard", "expert"]),
    operations: z.array(z.enum(["+", "-", "×", "÷"])).min(1).max(4),
    // Recorded so only standard timed runs (2:00, preset ranges) rank on the leaderboard.
    timeLimitSeconds: z
      .number()
      .int()
      .refine((value) => TIMED_MODE_LIMITS.includes(value))
      .optional(),
    customRanges: z.boolean().optional(),
  })
  .refine((start) => start.gameMode !== "timed" || start.timeLimitSeconds !== undefined, {
    message: "Timed sessions need a time limit",
  });

export type TrainingSessionStart = z.infer<typeof trainingSessionStartSchema>;

export const trainingSessionResultSchema = z.object({
  sessionId: z.string().min(1),
  totalProblems: count,
  correctAnswers: count,
  duration: count,
  averageTime: z.number().nonnegative(),
  bestStreak: count,
  // IANA time zone of the player, used to count streak days locally.
  timeZone: z.string().max(64).optional(),
});

export type TrainingSessionResult = z.infer<typeof trainingSessionResultSchema>;

/**
 * Checks submitted results against what is possible in the time the session has existed
 * on the server. Returns a reason when the results are implausible, otherwise null.
 */
export function getImplausibleResultReason(
  result: TrainingSessionResult,
  elapsedSeconds: number,
  timeLimitSeconds?: number | null
): string | null {
  // A timed run can't use more time than its limit, however late its results arrive.
  const sessionSeconds =
    typeof timeLimitSeconds === "number"
      ? Math.min(Math.max(0, elapsedSeconds), timeLimitSeconds)
      : Math.max(0, elapsedSeconds);
  const allowedSeconds = sessionSeconds + ELAPSED_SLACK_SECONDS;

  if (result.correctAnswers > result.totalProblems) {
    return "Correct answers cannot exceed total problems";
  }
  if (result.bestStreak > result.correctAnswers) {
    return "Best streak cannot exceed correct answers";
  }
  if (result.duration > allowedSeconds) {
    return "Duration exceeds the session length";
  }
  if (result.averageTime > allowedSeconds) {
    return "Average time exceeds the session length";
  }
  if (result.totalProblems > Math.ceil(allowedSeconds * MAX_PROBLEMS_PER_SECOND)) {
    return "Too many problems for the session length";
  }
  return null;
}
