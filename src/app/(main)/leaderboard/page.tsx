import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { getLeaderboard, getTrainingDistribution } from "@/lib/leaderboard";
import { LeaderboardClient } from "./leaderboard-client";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "See the top mental math players worldwide. Compare your timed training scores, duel ratings, and racing rankings on the global leaderboard.",
  openGraph: {
    title: "Leaderboard | thetamac",
    description:
      "See the top mental math players worldwide. Compare your timed training scores, duel ratings, and racing rankings.",
  },
};

export default async function LeaderboardPage() {
  const session = await auth();
  const currentUserId = session?.user?.id;

  // Fetch initial data server-side for SSR
  const [initialLeaderboard, distributionResult] = await Promise.all([
    getLeaderboard("training", "all", currentUserId),
    getTrainingDistribution(),
  ]);

  return (
    <LeaderboardClient
      initialLeaderboard={initialLeaderboard}
      initialDistribution={distributionResult.buckets}
      initialDistributionMedian={distributionResult.median}
      initialMode="training"
      initialPeriod="all"
    />
  );
}
