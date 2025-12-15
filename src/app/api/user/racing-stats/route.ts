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

    // Ensure we have a rating source
    let userStats = await db.userStats.findUnique({
      where: { userId },
      select: { rating: true },
    });

    if (!userStats) {
      userStats = await db.userStats.create({
        data: { userId },
      });
    }

    // Gather finished races for this user
    const races = await db.racePlayer.findMany({
      where: {
        userId,
        race: { status: "finished" },
      },
      select: {
        finishPosition: true,
        problemsSolved: true,
      },
    });

    const racesPlayed = races.length;
    const wins = races.filter((race) => race.finishPosition === 1).length;
    const podiums = races.filter(
      (race) =>
        race.finishPosition !== null &&
        race.finishPosition !== undefined &&
        race.finishPosition <= 3
    ).length;

    const completedFinishes = races
      .map((race) => race.finishPosition)
      .filter((pos): pos is number => pos !== null && pos !== undefined);

    const avgFinish =
      completedFinishes.length > 0
        ? Math.round(
            (completedFinishes.reduce((sum, pos) => sum + pos, 0) /
              completedFinishes.length) *
              100
          ) / 100
        : null;

    const problemsSolved = races.reduce(
      (sum, race) => sum + (race.problemsSolved ?? 0),
      0
    );

    return NextResponse.json({
      rating: userStats.rating,
      races: racesPlayed,
      wins,
      podiums,
      avgFinish,
      problemsSolved,
    });
  } catch (error) {
    console.error("Error fetching racing stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch racing stats" },
      { status: 500 }
    );
  }
}

