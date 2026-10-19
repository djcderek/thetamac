import { z } from "zod";

// Generous ceiling on solve rate; the best timed runs stay well under 2 problems per second.
export const MAX_PROBLEMS_PER_SECOND = 4;
// Allowance for request latency between the client's run clock and the session's createdAt.
const ELAPSED_SLACK_SECONDS = 5;

const count = z.number().int().nonnegative();

export const trainingSessionResultSchema = z.object({
  sessionId: z.string().min(1),
  totalProblems: count,
  correctAnswers: count,
  duration: count,
  averageTime: z.number().nonnegative(),
  bestStreak: count,
});

export type TrainingSessionResult = z.infer<typeof trainingSessionResultSchema>;

/**
 * Checks submitted results against what is possible in the time the session has existed
 * on the server. Returns a reason when the results are implausible, otherwise null.
 */
export function getImplausibleResultReason(
  result: TrainingSessionResult,
  elapsedSeconds: number
): string | null {
  const allowedSeconds = Math.max(0, elapsedSeconds) + ELAPSED_SLACK_SECONDS;

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
