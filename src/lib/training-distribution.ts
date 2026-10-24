import { getCached } from "@/lib/server-cache";
import { loadProblemsSolved, loadSetupScoreCounts } from "@/lib/leaderboard-queries";
import { summarizeScoreCounts, type DistributionResult } from "@/lib/score-summary";
import { canonicalOperations, type TimedSetup } from "@/lib/run-placement";
import { STANDARD_TIMED_LIMIT_SECONDS } from "@/lib/standard-timed-sessions";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "@/lib/training-settings";

export { summarizeScoreCounts, type DistributionBucket, type DistributionResult } from "@/lib/score-summary";


// The default setup's distribution: the same full-length runs a placement on it compares
// against (signed-in, older and guest runs; stopped runs left out), so the leaderboard chart
// and a player's percentile always agree. It's the same for every viewer, so it's cached
// briefly; a new score shifts it by at most one run.
const DISTRIBUTION_TTL_SECONDS = 30;

/** The distribution, plus correct answers across every default timed run (stopped ones too). */
export type TrainingDistribution = DistributionResult & { problemsSolved: number };

export function getTrainingDistribution(): Promise<TrainingDistribution> {
  return getCached("training-distribution:v2", DISTRIBUTION_TTL_SECONDS, loadTrainingDistribution);
}

const DEFAULT_SETUP: TimedSetup = {
  difficulty: DEFAULT_TIMED_TRAINING_SETTINGS.difficulty,
  operations: canonicalOperations(DEFAULT_TIMED_TRAINING_SETTINGS.operations),
  timeLimitSeconds: STANDARD_TIMED_LIMIT_SECONDS,
};

async function loadTrainingDistribution(): Promise<TrainingDistribution> {
  const [{ counts }, problemsSolved] = await Promise.all([loadSetupScoreCounts(DEFAULT_SETUP), loadProblemsSolved()]);
  return { ...summarizeScoreCounts(counts), problemsSolved };
}
