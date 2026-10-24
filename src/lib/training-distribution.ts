import { getCached } from "@/lib/server-cache";
import { loadScoreCounts } from "@/lib/leaderboard-queries";
import { summarizeScoreCounts, type DistributionResult } from "@/lib/score-summary";
import { MAX_LEGACY_GUEST_TOTAL } from "@/lib/run-placement";

export { summarizeScoreCounts, type DistributionBucket, type DistributionResult } from "@/lib/score-summary";


// The distribution is the same for every viewer and counts every timed run, so it is cached
// briefly. A new score shifts it by at most one run, which the placement card tolerates.
const DISTRIBUTION_TTL_SECONDS = 30;

export function getTrainingDistribution(): Promise<DistributionResult> {
  return getCached("training-distribution", DISTRIBUTION_TTL_SECONDS, loadTrainingDistribution);
}

async function loadTrainingDistribution(): Promise<DistributionResult> {
  return summarizeScoreCounts(await loadScoreCounts(MAX_LEGACY_GUEST_TOTAL));
}
