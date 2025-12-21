import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLeaderboard, type Period, type Mode } from "@/lib/leaderboard";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    const { searchParams } = new URL(request.url);

    const periodParam = searchParams.get("period");
    const modeParam = searchParams.get("mode");

    const period: Period =
      periodParam === "weekly" || periodParam === "daily" ? periodParam : "all";
    const mode: Mode =
      modeParam === "racing"
        ? "racing"
        : modeParam === "training"
        ? "training"
        : "duel";

    const result = await getLeaderboard(mode, period, currentUserId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
