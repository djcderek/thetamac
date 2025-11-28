"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
} from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  image?: string | null;
  level: number;
  score: number;
  accuracy: number;
  change: "up" | "down" | "same";
  isYou?: boolean;
}

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?period=${period}`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboardData(data.leaderboard);
          setUserRank(data.userRank);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [period]);

  const topThree = leaderboardData.slice(0, 3);
  // Reorder top 3 for visual display: 2nd, 1st, 3rd
  const visualTopThree = [
    topThree.length > 1 ? topThree[1] : null, // 2nd
    topThree.length > 0 ? topThree[0] : null, // 1st
    topThree.length > 2 ? topThree[2] : null, // 3rd
  ];

  const restOfLeaderboard = leaderboardData.slice(3);

  const getScoreLabel = () => {
    switch (period) {
      case "all": return "Rating";
      case "weekly": return "Rating Gain";
      case "daily": return "Rating Gain";
      default: return "Score";
    }
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Global rankings
            </p>
          </div>
          {userRank && (
            <Badge variant="outline">Your Rank: #{userRank.rank}</Badge>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Period Tabs */}
          <Tabs defaultValue="all" className="w-full" onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="all">All Time</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Top 3 */}
              {leaderboardData.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {visualTopThree.map((entry, index) => {
                    if (!entry) return <div key={index} className="hidden sm:block" />;
                    
                    // Determine visual order (index 1 is 1st place in array logic above)
                    const isFirst = index === 1;
                    
                    return (
                      <Card 
                        key={entry.id} 
                        className={`text-center ${isFirst ? "border-primary/50 bg-primary/5" : ""}`}
                      >
                        <CardContent className="pt-6">
                          <div className={`text-2xl font-mono mb-2 ${isFirst ? "" : "text-muted-foreground"}`}>
                            {entry.rank}
                          </div>
                          <Avatar className={`${isFirst ? "h-14 w-14" : "h-12 w-12"} mx-auto mb-2`}>
                            <AvatarImage src={entry.image || undefined} />
                            <AvatarFallback>{entry.avatar}</AvatarFallback>
                          </Avatar>
                          <p className="font-medium truncate px-2">{entry.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.score > 0 && period !== "all" ? "+" : ""}
                            {entry.score.toLocaleString()} pts
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Rankings Table */}
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  {leaderboardData.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {period === "all" 
                        ? "No data available yet." 
                        : "No activity in this period yet."}
                    </div>
                  ) : (
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground w-16">Rank</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">Player</th>
                          <th className="text-right p-4 text-sm font-medium text-muted-foreground">{getScoreLabel()}</th>
                          <th className="text-right p-4 text-sm font-medium text-muted-foreground">Accuracy</th>
                          <th className="text-right p-4 text-sm font-medium text-muted-foreground w-16">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restOfLeaderboard.map((entry) => (
                          <tr
                            key={entry.id}
                            className={`border-b border-border last:border-0 ${
                              entry.isYou ? "bg-secondary/50" : ""
                            }`}
                          >
                            <td className="p-4">
                              <span className="font-mono text-muted-foreground">{entry.rank}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={entry.image || undefined} />
                                  <AvatarFallback className="text-xs">{entry.avatar}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {entry.name}
                                    {entry.isYou && <span className="text-muted-foreground ml-1">(You)</span>}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm">
                                {entry.score > 0 && period !== "all" ? "+" : ""}
                                {entry.score.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm">{entry.accuracy}%</span>
                            </td>
                            <td className="p-4 text-right">
                              {entry.change === "up" && <ArrowUp className="w-4 h-4 text-success inline" />}
                              {entry.change === "down" && <ArrowDown className="w-4 h-4 text-destructive inline" />}
                              {entry.change === "same" && <Minus className="w-4 h-4 text-muted-foreground inline" />}
                            </td>
                          </tr>
                        ))}
                        
                        {/* If user is ranked below top 50, show them at bottom */}
                        {userRank && userRank.rank > leaderboardData.length && (
                          <>
                            <tr>
                              <td colSpan={5} className="p-2 text-center text-muted-foreground text-xs">...</td>
                            </tr>
                            <tr className="bg-secondary/50 border-t border-border">
                              <td className="p-4">
                                <span className="font-mono text-muted-foreground">{userRank.rank}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={userRank.image || undefined} />
                                    <AvatarFallback className="text-xs">{userRank.avatar}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {userRank.name}
                                      <span className="text-muted-foreground ml-1">(You)</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">Level {userRank.level}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-mono text-sm">
                                  {userRank.score > 0 && period !== "all" ? "+" : ""}
                                  {userRank.score.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <span className="font-mono text-sm">{userRank.accuracy}%</span>
                              </td>
                              <td className="p-4 text-right">
                                <Minus className="w-4 h-4 text-muted-foreground inline" />
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
