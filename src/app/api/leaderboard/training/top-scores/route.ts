import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTrainingTopScores } from "@/lib/leaderboard";

export async function GET() {
  try {
    const session = await auth();
    return NextResponse.json(
      await getTrainingTopScores(session?.user?.id)
    );
  } catch (error) {
    console.error("Error fetching timed training top scores:", error);
    return NextResponse.json(
      { error: "Failed to fetch timed training top scores" },
      { status: 500 }
    );
  }
}
