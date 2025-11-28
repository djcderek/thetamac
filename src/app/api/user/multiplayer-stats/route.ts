import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get or create user stats to get rating
    let userStats = await db.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) {
      userStats = await db.userStats.create({
        data: { userId },
      });
    }

    // Get multiplayer match statistics
    const matches = await db.multiplayerMatch.findMany({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
        status: "completed",
      },
      include: {
        rounds: true,
      },
    });

    // Calculate stats
    let wins = 0;
    let totalMatches = matches.length;
    let totalTimeMs = 0;
    let totalRoundsWithTime = 0;

    for (const match of matches) {
      // Count wins
      if (match.winnerId === userId) {
        wins++;
      }

      // Calculate average time from rounds
      for (const round of match.rounds) {
        const isPlayer1 = match.player1Id === userId;
        const timeMs = isPlayer1 ? round.player1TimeMs : round.player2TimeMs;
        if (timeMs !== null) {
          totalTimeMs += timeMs;
          totalRoundsWithTime++;
        }
      }
    }

    // Calculate average time in seconds
    const avgTime = totalRoundsWithTime > 0 
      ? Math.round((totalTimeMs / totalRoundsWithTime / 1000) * 100) / 100 
      : null;

    return NextResponse.json({
      wins,
      matches: totalMatches,
      rating: userStats.rating,
      avgTime,
    });
  } catch (error) {
    console.error("Error fetching multiplayer stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch multiplayer stats" },
      { status: 500 }
    );
  }
}

