import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to calculate accuracy from stats
const calculateAccuracy = (stats: any) => {
  let accuracy = 0;
  if (stats.totalProblems > 0) {
    accuracy = (stats.totalCorrect / stats.totalProblems) * 100;
  } else {
    // Try to parse JSONs if top level are 0
    try {
      const add = typeof stats.additionStats === 'string' ? JSON.parse(stats.additionStats) : stats.additionStats;
      const sub = typeof stats.subtractionStats === 'string' ? JSON.parse(stats.subtractionStats) : stats.subtractionStats;
      const mul = typeof stats.multiplicationStats === 'string' ? JSON.parse(stats.multiplicationStats) : stats.multiplicationStats;
      const div = typeof stats.divisionStats === 'string' ? JSON.parse(stats.divisionStats) : stats.divisionStats;
      
      const total = (add?.total || 0) + (sub?.total || 0) + (mul?.total || 0) + (div?.total || 0);
      const correct = (add?.correct || 0) + (sub?.correct || 0) + (mul?.correct || 0) + (div?.correct || 0);
      
      if (total > 0) {
        accuracy = (correct / total) * 100;
      }
    } catch (e) {
      // ignore json parse errors
    }
  }
  return accuracy;
};

export async function GET(request: Request) {
  try {
    const session = await auth();
    const currentUserId = session?.user?.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all";

    let leaderboard = [];
    
    if (period === "all") {
      // Fetch top 50 users by rating
      const topUsers = await db.userStats.findMany({
        take: 50,
        orderBy: {
          rating: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      });

      leaderboard = topUsers.map((stats, index) => {
        const accuracy = calculateAccuracy(stats);

        return {
          rank: index + 1,
          id: stats.userId,
          name: stats.user.username || stats.user.name || "Anonymous",
          avatar: stats.user.username ? stats.user.username.substring(0, 2).toUpperCase() : "AN", // Fallback avatar text
          image: stats.user.image,
          level: Math.floor(stats.totalProblems / 50) + 1, // Mock level calculation
          score: stats.rating,
          accuracy: Math.round(accuracy * 10) / 10,
          change: "same", // We don't track history yet
          isYou: currentUserId === stats.userId,
        };
      });
    } else {
      // Weekly or Daily - Calculate based on MultiplayerMatch activity (Rating Gained)
      const now = new Date();
      let startTime = new Date(0);
      
      if (period === "weekly") {
        startTime = new Date(now.setDate(now.getDate() - 7));
      } else if (period === "daily") {
        startTime = new Date(now.setDate(now.getDate() - 1));
      }

      // Fetch matches in period
      const matches = await db.multiplayerMatch.findMany({
        where: {
          completedAt: {
            gte: startTime,
          },
          status: "completed",
        },
        select: {
          player1Id: true,
          player2Id: true,
          player1RatingChange: true,
          player2RatingChange: true,
          rounds: {
            select: {
              player1Answer: true,
              player2Answer: true,
              correctAnswer: true,
            }
          }
        },
      });

      // Aggregate stats
      const userStats = new Map<string, { 
        ratingChange: number, 
        total: number, 
        correct: number,
        userId: string 
      }>();

      for (const match of matches) {
        // Player 1
        if (!userStats.has(match.player1Id)) {
          userStats.set(match.player1Id, { ratingChange: 0, total: 0, correct: 0, userId: match.player1Id });
        }
        const p1 = userStats.get(match.player1Id)!;
        p1.ratingChange += match.player1RatingChange;

        // Player 2
        if (!userStats.has(match.player2Id)) {
          userStats.set(match.player2Id, { ratingChange: 0, total: 0, correct: 0, userId: match.player2Id });
        }
        const p2 = userStats.get(match.player2Id)!;
        p2.ratingChange += match.player2RatingChange;

        // Process rounds for accuracy
        for (const round of match.rounds) {
          // Player 1 accuracy
          p1.total++;
          if (round.player1Answer === round.correctAnswer) p1.correct++;
          
          // Player 2 accuracy
          p2.total++;
          if (round.player2Answer === round.correctAnswer) p2.correct++;
        }
      }

      // Convert to array and sort
      const sortedStats = Array.from(userStats.values())
        .sort((a, b) => b.ratingChange - a.ratingChange)
        .slice(0, 50);

      // Fetch user details
      const userIds = sortedStats.map(s => s.userId);
      const users = await db.user.findMany({
        where: {
          id: { in: userIds }
        },
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          stats: {
            select: {
              totalProblems: true
            }
          }
        }
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      leaderboard = sortedStats.map((stat, index) => {
        const user = userMap.get(stat.userId);
        const accuracy = stat.total > 0 ? (stat.correct / stat.total) * 100 : 0;
        
        return {
          rank: index + 1,
          id: stat.userId,
          name: user?.username || user?.name || "Anonymous",
          avatar: user?.username ? user.username.substring(0, 2).toUpperCase() : "AN",
          image: user?.image,
          level: user?.stats ? Math.floor((user.stats.totalProblems || 0) / 50) + 1 : 1,
          score: stat.ratingChange, // Display Rating Gain
          accuracy: Math.round(accuracy * 10) / 10,
          change: "same",
          isYou: currentUserId === stat.userId,
        };
      });
    }

    let userRankEntry = null;
    if (currentUserId) {
      const userInList = leaderboard.find(entry => entry.id === currentUserId);
      if (userInList) {
        userRankEntry = userInList;
      } else if (period === "all") {
        // Fetch user stats if not in top 50 (only implemented for 'all' for now for simplicity)
        const userStats = await db.userStats.findUnique({
          where: { userId: currentUserId },
          include: { user: true }
        });
        
        if (userStats) {
          const count = await db.userStats.count({
            where: {
              rating: {
                gt: userStats.rating
              }
            }
          });
          
           const accuracy = calculateAccuracy(userStats);
           
           userRankEntry = {
             rank: count + 1,
             id: currentUserId,
             name: userStats.user.username || userStats.user.name || "Anonymous",
             avatar: "ME",
             image: userStats.user.image,
             level: Math.floor(userStats.totalProblems / 50) + 1,
             score: userStats.rating,
             accuracy: Math.round(accuracy * 10) / 10,
             change: "same",
             isYou: true
           };
        }
      }
      // For weekly/daily, if user not in list (meaning inactive), we don't show rank or show as unranked
    }

    return NextResponse.json({
      leaderboard,
      userRank: userRankEntry
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
