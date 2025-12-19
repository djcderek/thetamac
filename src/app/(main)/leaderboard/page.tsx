"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
} from "lucide-react";

type Mode = "duel" | "racing" | "training";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  image?: string | null;
  level: number;
  score: number;
  accuracy: number | null;
  change: "up" | "down" | "same";
  isYou?: boolean;
}

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("all");
  const [mode, setMode] = useState<Mode>("training");
  const [view, setView] = useState<"board" | "distribution">("distribution");
  const [distribution, setDistribution] = useState<
    { from: number; to: number; count: number }[]
  >([]);
  const [isDistributionLoading, setIsDistributionLoading] = useState(false);

  useEffect(() => {
    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?period=${period}&mode=${mode}`);
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
  }, [period, mode]);

  useEffect(() => {
    if (mode !== "training") {
      setView("board");
      return;
    }
    if (view !== "distribution") return;

    async function fetchDistribution() {
      setIsDistributionLoading(true);
      try {
        const res = await fetch("/api/leaderboard/training/distribution");
        if (res.ok) {
          const data = await res.json();
          setDistribution(data.buckets || []);
        }
      } catch (error) {
        console.error("Failed to fetch distribution", error);
      } finally {
        setIsDistributionLoading(false);
      }
    }

    fetchDistribution();
  }, [mode, view]);

  const topThree = leaderboardData.slice(0, 3);
  // Reorder top 3 for visual display: 2nd, 1st, 3rd
  const visualTopThree = [
    topThree.length > 1 ? topThree[1] : null, // 2nd
    topThree.length > 0 ? topThree[0] : null, // 1st
    topThree.length > 2 ? topThree[2] : null, // 3rd
  ];

  const restOfLeaderboard = leaderboardData.slice(3);

  const getScoreLabel = () => {
    if (mode === "training") return "Problems Solved";

    const base = mode === "racing" ? "Race Rating" : "Rating";
    switch (period) {
      case "all": return base;
      case "weekly": return "Rating Gain";
      case "daily": return "Rating Gain";
      default: return "Score";
    }
  };

  const getScoreUnit = () => (mode === "training" ? "solved" : "pts");

  const formatScoreValue = (value: number) => {
    if (mode === "training") return value.toLocaleString();
    const prefix = value > 0 && period !== "all" ? "+" : "";
    return `${prefix}${value.toLocaleString()}`;
  };

  const getRankLabel = () => {
    if (mode === "training") return "Timed Training Rank";
    return mode === "duel" ? "Duel Rank" : "Racing Rank";
  };

  const formatAccuracy = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "—";
    return `${value}%`;
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Global rankings across duels, racing, and timed training (default settings)
            </p>
          </div>
          {userRank && (
            <Badge variant="outline">
              Your {getRankLabel()}: #{userRank.rank}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Mode Tabs */}
          <Tabs
            defaultValue="training"
            value={mode}
            className="w-full"
            onValueChange={(value) => setMode(value as Mode)}
          >
            <TabsList>
              <TabsTrigger value="training">Timed Training</TabsTrigger>
              <TabsTrigger value="duel">Duel Mode</TabsTrigger>
              <TabsTrigger value="racing">Racing Mode</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "training" && (
            <p className="text-xs text-muted-foreground px-1">
              Ranked on timed mode sessions using default settings: medium difficulty, all operations, standard timer.
            </p>
          )}

          {/* Period Tabs */}
          <Tabs defaultValue="all" className="w-full" onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="all">All Time</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "training" && (
            <Tabs
              defaultValue="distribution"
              value={view}
              className="w-full"
              onValueChange={(value) => setView(value as "board" | "distribution")}
            >
              <TabsList>
                <TabsTrigger value="distribution">Score Distribution</TabsTrigger>
                <TabsTrigger value="board">Leaderboard</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {isLoading && view === "board" ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : view === "distribution" && mode === "training" ? (
            <Card>
              <CardContent className="p-4 md:p-6">
                {isDistributionLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : distribution.length === 0 ? (
                  <div className="text-center text-muted-foreground py-6">
                    No runs yet for default timed training.
                  </div>
                ) : (
                  (() => {
                    const maxCount = Math.max(...distribution.map((b) => b.count));
                    const userBucketIndex =
                      typeof userRank?.score === "number"
                        ? distribution.findIndex(
                            (b) => userRank.score >= b.from && userRank.score <= b.to
                          )
                        : -1;
                    return (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-border bg-background/40 p-3">
                          <div className="flex gap-[3px] overflow-x-auto px-1 pb-2">
                            {distribution.map((bucket, idx) => {
                              const isUserBucket = idx === userBucketIndex;
                              const heightPctRaw =
                                maxCount > 0
                                  ? Math.round((bucket.count / maxCount) * 100)
                                  : 0;
                              const heightPct =
                                bucket.count === 0 && !isUserBucket
                                  ? 0
                                  : Math.max(4, heightPctRaw);
                              const showTickLabel =
                                isUserBucket ||
                                idx === 0 ||
                                idx === distribution.length - 1 ||
                                bucket.from % 10 === 0;

                              return (
                                <Tooltip key={`${bucket.from}-${bucket.to}`}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={[
                                        "flex w-[18px] flex-none flex-col items-center",
                                        "cursor-default select-none",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0",
                                      ].join(" ")}
                                      tabIndex={0}
                                      aria-label={`${bucket.from}–${bucket.to}: ${bucket.count} runs${
                                        isUserBucket ? ", you are here" : ""
                                      }`}
                                    >
                                      <div className="flex h-28 w-full items-end sm:h-36">
                                        <div
                                          className={[
                                            "w-full rounded-sm transition-[height,background-color] duration-300",
                                            bucket.count === 0 && !isUserBucket
                                              ? "min-h-0"
                                              : "min-h-[2px]",
                                            isUserBucket
                                              ? "bg-blue-600 shadow-sm dark:bg-blue-500"
                                              : "bg-muted-foreground/25 dark:bg-muted-foreground/35",
                                            isUserBucket ? "ring-2 ring-blue-500/40" : "",
                                          ].join(" ")}
                                          style={{ height: `${heightPct}%` }}
                                        />
                                      </div>

                                      {showTickLabel ? (
                                        <span
                                          className={[
                                            "mt-2 text-[10px] font-mono tabular-nums leading-none",
                                            isUserBucket
                                              ? "font-semibold text-blue-600 dark:text-blue-400"
                                              : "text-muted-foreground",
                                          ].join(" ")}
                                        >
                                          {bucket.from}
                                        </span>
                                      ) : (
                                        <span className="mt-2 h-[10px]" aria-hidden="true" />
                                      )}

                                      {isUserBucket ? (
                                        <span
                                          className="mt-1 h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-500"
                                          aria-hidden="true"
                                        />
                                      ) : null}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" sideOffset={8}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono tabular-nums">
                                        {bucket.from}–{bucket.to}
                                      </span>
                                      <span className="opacity-80">
                                        {bucket.count} run{bucket.count === 1 ? "" : "s"}
                                      </span>
                                      {isUserBucket ? (
                                        <span className="font-semibold">You</span>
                                      ) : null}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Distribution of best single-session scores (default timed settings)
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
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
                            {formatScoreValue(entry.score)} {getScoreUnit()}
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
                                {formatScoreValue(entry.score)}
                              </span>
                              {mode === "training" && (
                                <span className="text-[11px] text-muted-foreground ml-1">
                                  {getScoreUnit()}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <span className="font-mono text-sm">{formatAccuracy(entry.accuracy)}</span>
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
                                  {formatScoreValue(userRank.score)}
                                </span>
                                {mode === "training" && (
                                  <span className="text-[11px] text-muted-foreground ml-1">
                                    {getScoreUnit()}
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-right">
                              <span className="font-mono text-sm">{formatAccuracy(userRank.accuracy)}</span>
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
