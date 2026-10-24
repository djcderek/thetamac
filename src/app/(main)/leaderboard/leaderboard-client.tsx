"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { settleSpring } from "@/lib/motion";
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
import type { DistributionBucket } from "@/lib/training-distribution";
import type {
  LeaderboardEntry,
  LeaderboardResult,
  Mode,
  Period,
  TrainingTopScoreEntry,
  TrainingTopScoresResult,
} from "@/lib/leaderboard";
import { PageHeader } from "@/components/ui/visual-system";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

interface LeaderboardClientProps {
  initialLeaderboard: LeaderboardResult;
  initialDistribution: DistributionBucket[];
  initialDistributionMedian: number | null;
  initialDistributionMean: number | null;
  initialDistributionStdDev: number | null;
  /** Correct answers across every default timed run, stopped ones included. */
  initialProblemsSolved: number;
  initialTopScores: TrainingTopScoresResult;
  initialMode: Mode;
  initialPeriod: Period;
}

type TrainingView = "distribution" | "board" | "topScores";

function formatPerformance(metric: LeaderboardEntry["performance"]): string {
  if (metric.kind === "bestRun") return metric.value.toLocaleString();
  if (metric.kind === "duelRecord") {
    return `${metric.wins}–${metric.losses}–${metric.draws}`;
  }
  return `${metric.wins} / ${metric.races}`;
}

function getPerformanceDescription(metric: LeaderboardEntry["performance"]): string {
  if (metric.kind === "bestRun") return `Best run: ${metric.value} problems solved`;
  if (metric.kind === "duelRecord") {
    return `${metric.wins} wins, ${metric.losses} losses, ${metric.draws} draws`;
  }
  return `${metric.wins} wins across ${metric.races} races`;
}

function TrendIndicator({
  trend,
  comparisonLabel,
}: {
  trend: LeaderboardEntry["trend"];
  comparisonLabel: string;
}) {
  const commonClass = "inline-flex items-center justify-end gap-1 font-mono text-xs tabular-nums";
  if (trend.kind === "up") {
    return (
      <span className={`${commonClass} text-success`} aria-label={`Moved up ${trend.places} places. ${comparisonLabel}.`}>
        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
        {trend.places}
      </span>
    );
  }
  if (trend.kind === "down") {
    return (
      <span className={`${commonClass} text-muted-foreground`} aria-label={`Moved down ${trend.places} places. ${comparisonLabel}.`}>
        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
        {trend.places}
      </span>
    );
  }
  if (trend.kind === "new") {
    return (
      <span
        className="inline-flex h-6 items-center rounded-full bg-background px-2.5 text-[12px] font-medium text-muted-foreground"
        aria-label={`New to these standings. ${comparisonLabel}.`}
      >
        New
      </span>
    );
  }
  return (
    <span
      className={`${commonClass} text-muted-foreground`}
      aria-label={trend.kind === "same" ? `Rank unchanged. ${comparisonLabel}.` : `Rank comparison unavailable. ${comparisonLabel}.`}
    >
      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

function ordinal(rank: number): string {
  const tens = rank % 100;
  if (tens >= 11 && tens <= 13) return `${rank}th`;
  return `${rank}${{ 1: "st", 2: "nd", 3: "rd" }[rank % 10] ?? "th"}`;
}

type PlayerLike = Pick<LeaderboardEntry, "name" | "avatar" | "image" | "level" | "isYou" | "isGuest">;

function PlayerAvatar({ entry, className }: { entry: PlayerLike; className?: string }) {
  return (
    <Avatar className={cn("h-9 w-9 shrink-0", className)}>
      <AvatarImage src={entry.image || undefined} alt="" />
      <AvatarFallback className="bg-background text-[13px] font-semibold text-muted-foreground">{entry.avatar}</AvatarFallback>
    </Avatar>
  );
}

// Avatar, name, and level. Guests have no level (it is always 1), so theirs is left out.
function PlayerCell({ entry, mobileExtra }: { entry: PlayerLike; mobileExtra?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <PlayerAvatar entry={entry} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium">
          {entry.name}
          {entry.isYou && <span className="ml-1 font-normal text-muted-foreground">(You)</span>}
        </p>
        {(!entry.isGuest || mobileExtra) && (
          <div className="mt-0.5 flex items-center gap-2 text-[13px] text-muted-foreground">
            {!entry.isGuest && <span>Level {entry.level}</span>}
            {mobileExtra && <span className="sm:hidden">{mobileExtra}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function LeaderboardClient({
  initialLeaderboard,
  initialDistribution,
  initialDistributionMedian,
  initialDistributionMean,
  initialDistributionStdDev,
  initialProblemsSolved,
  initialTopScores,
  initialMode,
  initialPeriod,
}: LeaderboardClientProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(
    initialLeaderboard.leaderboard
  );
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(
    initialLeaderboard.userRank
  );
  const [trendComparisonLabel, setTrendComparisonLabel] = useState(
    initialLeaderboard.trendComparisonLabel
  );
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [view, setView] = useState<TrainingView>("distribution");
  const [distribution, setDistribution] = useState<DistributionBucket[]>(
    initialDistribution
  );
  const [distributionMedian, setDistributionMedian] = useState<number | null>(
    initialDistributionMedian
  );
  const [distributionMean, setDistributionMean] = useState<number | null>(
    initialDistributionMean
  );
  const [distributionStdDev, setDistributionStdDev] = useState<number | null>(
    initialDistributionStdDev
  );
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [isDistributionLoading, setIsDistributionLoading] = useState(false);
  const [problemsSolved, setProblemsSolved] = useState(initialProblemsSolved);
  const [topScores, setTopScores] = useState<TrainingTopScoreEntry[]>(
    initialTopScores.leaderboard
  );
  const [topScoreUserRank, setTopScoreUserRank] = useState<TrainingTopScoreEntry | null>(
    initialTopScores.userRank
  );
  const [isTopScoresLoading, setIsTopScoresLoading] = useState(false);

  // Track if we've changed from initial values (to know when to fetch)
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (!hasInteracted || view === "topScores") return;
    // Switching tabs quickly could let an older, slower response overwrite the tab now shown.
    let superseded = false;

    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?period=${period}&mode=${mode}`);
        if (res.ok) {
          const data = await res.json();
          if (superseded) return;
          setLeaderboardData(data.leaderboard);
          setUserRank(data.userRank);
          setTrendComparisonLabel(data.trendComparisonLabel);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      } finally {
        if (!superseded) setIsLoading(false);
      }
    }

    fetchLeaderboard();
    return () => {
      superseded = true;
    };
  }, [period, mode, view, hasInteracted]);

  useEffect(() => {
    if (mode !== "training") {
      setView("board");
      return;
    }
    if (view !== "distribution") return;
    if (!hasInteracted) return;

    async function fetchDistribution() {
      setIsDistributionLoading(true);
      try {
        const res = await fetch("/api/leaderboard/training/distribution");
        if (res.ok) {
          const data = await res.json();
          setDistribution(data.buckets || []);
          setDistributionMedian(typeof data.median === "number" ? data.median : null);
          setDistributionMean(typeof data.mean === "number" ? data.mean : null);
          setDistributionStdDev(typeof data.stdDev === "number" ? data.stdDev : null);
          if (typeof data.problemsSolved === "number") setProblemsSolved(data.problemsSolved);
        }
      } catch (error) {
        console.error("Failed to fetch distribution", error);
      } finally {
        setIsDistributionLoading(false);
      }
    }

    fetchDistribution();
  }, [mode, view, hasInteracted]);

  useEffect(() => {
    if (mode !== "training" || view !== "topScores" || !hasInteracted) return;

    async function fetchTopScores() {
      setIsTopScoresLoading(true);
      try {
        const res = await fetch("/api/leaderboard/training/top-scores");
        if (res.ok) {
          const data: TrainingTopScoresResult = await res.json();
          setTopScores(data.leaderboard);
          setTopScoreUserRank(data.userRank);
        }
      } catch (error) {
        console.error("Failed to fetch timed training top scores", error);
      } finally {
        setIsTopScoresLoading(false);
      }
    }

    fetchTopScores();
  }, [mode, view, hasInteracted]);

  const handleModeChange = (newMode: string) => {
    setHasInteracted(true);
    setMode(newMode as Mode);
    captureAnalyticsEvent(ANALYTICS_EVENTS.leaderboardFilterChanged, {
      surface: "leaderboard",
      filter_name: "mode",
      filter_value: newMode,
      period,
      view,
    });
  };

  const handlePeriodChange = (newPeriod: string) => {
    setHasInteracted(true);
    setPeriod(newPeriod as Period);
    captureAnalyticsEvent(ANALYTICS_EVENTS.leaderboardFilterChanged, {
      surface: "leaderboard",
      filter_name: "period",
      filter_value: newPeriod,
      mode,
      view,
    });
  };

  const handleViewChange = (newView: string) => {
    setHasInteracted(true);
    const nextView = newView as TrainingView;
    if (nextView === "topScores") setPeriod("all");
    setView(nextView);
    captureAnalyticsEvent(ANALYTICS_EVENTS.leaderboardFilterChanged, {
      surface: "leaderboard",
      filter_name: "view",
      filter_value: nextView,
      mode,
      period: nextView === "topScores" ? "all" : period,
    });
  };

  const activeUserRank = view === "topScores" ? topScoreUserRank : userRank;

  const topThree = leaderboardData.slice(0, 3);
  const visualTopThree = [
    topThree.length > 1 ? topThree[1] : null,
    topThree.length > 0 ? topThree[0] : null,
    topThree.length > 2 ? topThree[2] : null,
  ];

  const restOfLeaderboard = leaderboardData.slice(3);

  const getScoreLabel = () => {
    if (mode === "training") return "Total solved";
    const base = mode === "racing" ? "Race rating" : "Rating";
    switch (period) {
      case "all": return base;
      case "weekly": return "Rating gain";
      case "daily": return "Rating gain";
      default: return "Score";
    }
  };

  const formatScoreValue = (value: number) => {
    if (mode === "training") return value.toLocaleString();
    const prefix = value > 0 && period !== "all" ? "+" : "";
    return `${prefix}${value.toLocaleString()}`;
  };

  const getRankLabel = () => {
    if (mode === "training" && view === "topScores") return "Top Score Rank";
    if (mode === "training") return "Timed Training Rank";
    return mode === "duel" ? "Duel Rank" : "Racing Rank";
  };

  const getPerformanceLabel = () => {
    if (mode === "training") return "Best run";
    if (mode === "duel") return "W–L–D";
    return "Wins / Races";
  };

  const formatPercentile = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    return `P${clamped.toFixed(1)}`;
  };

  const formatStatValue = (value: number | null) =>
    typeof value === "number" ? value.toFixed(1) : "—";

  const showDetachedUserRow = !!userRank && userRank.rank > leaderboardData.length;

  // One row of the rankings table. Score and best run drop their unit (the column headers
  // carry it), so a row doesn't read "73 solved · 73 solved".
  const renderRankingRow = (entry: LeaderboardEntry) => (
    <tr key={entry.id} className={cn("border-t border-border", entry.isYou && "bg-background/70")}>
      <td className="py-3 pl-5 pr-2 text-[15px] tabular-nums text-muted-foreground">{entry.rank}</td>
      <td className="min-w-0 px-2 py-3 sm:max-w-0">
        {/* Phones have no Change column, so the change sits under the name. */}
        <PlayerCell
          entry={entry}
          mobileExtra={<TrendIndicator trend={entry.trend} comparisonLabel={trendComparisonLabel} />}
        />
      </td>
      <td className="py-3 pl-2 pr-5 text-right sm:pr-2">
        <span className="text-[15px] font-semibold tabular-nums">{formatScoreValue(entry.score)}</span>
      </td>
      <td className="hidden px-2 py-3 text-right text-[15px] tabular-nums text-muted-foreground sm:table-cell">
        <span aria-label={getPerformanceDescription(entry.performance)}>{formatPerformance(entry.performance)}</span>
      </td>
      <td className="hidden py-3 pl-2 pr-5 text-right sm:table-cell">
        <TrendIndicator trend={entry.trend} comparisonLabel={trendComparisonLabel} />
      </td>
    </tr>
  );

  const resultsKey = `${mode}-${period}-${view}-${isLoading ? "loading" : "ready"}`;
  const [shownResultsKey, setShownResultsKey] = useState(resultsKey);
  const [resultsChanged, setResultsChanged] = useState(false);
  if (resultsKey !== shownResultsKey) {
    setShownResultsKey(resultsKey);
    setResultsChanged(true);
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Leaderboard"
        description="Global rankings across duels, racing, and timed training using default settings."
        action={activeUserRank ? <Badge variant="secondary">Your {getRankLabel()}: #{activeUserRank.rank}</Badge> : undefined}
      />

      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <section aria-label="Leaderboard controls" className="space-y-5">
            {/* Main choice: a segmented control. Secondary filters: chips. */}
            <div className="space-y-2">
              <Tabs value={mode} className="w-full" onValueChange={handleModeChange}>
                <TabsList aria-label="Competition" className="w-full">
                  <TabsTrigger value="training">Timed training</TabsTrigger>
                  <TabsTrigger value="duel">Duel</TabsTrigger>
                  <TabsTrigger value="racing">Racing</TabsTrigger>
                </TabsList>
              </Tabs>
              {mode === "training" && (
                <p className="px-1 text-[13px] text-muted-foreground">
                  Default setup: Medium · All operations · 2:00
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Top scores are personal bests across all time, so the other periods don't apply. */}
              <Tabs value={mode === "training" && view === "topScores" ? "all" : period} onValueChange={handlePeriodChange}>
                <TabsList variant="chips" aria-label="Timeframe">
                  <TabsTrigger value="all">All time</TabsTrigger>
                  <TabsTrigger value="weekly" disabled={mode === "training" && view === "topScores"}>
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger value="daily" disabled={mode === "training" && view === "topScores"}>
                    Daily
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {mode === "training" && (
                <Tabs value={view} onValueChange={handleViewChange}>
                  <TabsList variant="chips" aria-label="View">
                    <TabsTrigger value="distribution">Distribution</TabsTrigger>
                    <TabsTrigger value="board">Rankings</TabsTrigger>
                    <TabsTrigger value="topScores">Top scores</TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          </section>

          {/* Each filter change settles the results in, instead of swapping them in place.
              The first render stays static (an initial opacity would ship invisible). */}
          <motion.div
            key={resultsKey}
            initial={resultsChanged ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={settleSpring}
          >
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
                    const totalRuns = distribution.reduce((sum, bucket) => sum + bucket.count, 0);
                    const userBucketIndex =
                      typeof topScoreUserRank?.score === "number"
                        ? distribution.findIndex(
                            (b) => topScoreUserRank.score >= b.from && topScoreUserRank.score <= b.to
                          )
                        : -1;
                    let runningCount = 0;
                    const bucketPercentiles = distribution.map((bucket) => {
                      const startCount = runningCount;
                      runningCount += bucket.count;
                      const endCount = runningCount;
                      return {
                        start: totalRuns > 0 ? (startCount / totalRuns) * 100 : 0,
                        end: totalRuns > 0 ? (endCount / totalRuns) * 100 : 0,
                      };
                    });
                    const resolveBucketIndex = (value: number) => {
                      const exactIdx = distribution.findIndex(
                        (b) => value >= b.from && value <= b.to
                      );
                      if (exactIdx !== -1) return exactIdx;
                      const floorValue = Math.floor(value);
                      return distribution.findIndex(
                        (b) => floorValue >= b.from && floorValue <= b.to
                      );
                    };
                    const markers: Array<{
                      key: string;
                      label: string;
                      value: number;
                      color: string;
                      bucketIndex: number;
                    }> = [];

                    if (typeof distributionMedian === "number") {
                      markers.push({
                        key: "median",
                        label: "Median",
                        value: distributionMedian,
                        color: "var(--brand)",
                        bucketIndex: resolveBucketIndex(distributionMedian),
                      });
                    }

                    if (typeof distributionMean === "number") {
                      markers.push({
                        key: "mean",
                        label: "Mean",
                        value: distributionMean,
                        color: "var(--foreground)",
                        bucketIndex: resolveBucketIndex(distributionMean),
                      });
                    }

                    if (
                      showAdvancedStats &&
                      typeof distributionMean === "number" &&
                      typeof distributionStdDev === "number" &&
                      distributionStdDev > 0
                    ) {
                      const advancedMarkers = [
                        { key: "minus-1sigma", label: "-1σ", value: distributionMean - distributionStdDev, color: "var(--muted-foreground)" },
                        { key: "plus-1sigma", label: "+1σ", value: distributionMean + distributionStdDev, color: "var(--muted-foreground)" },
                        { key: "minus-2sigma", label: "-2σ", value: distributionMean - distributionStdDev * 2, color: "color-mix(in oklab, var(--muted-foreground) 55%, transparent)" },
                        { key: "plus-2sigma", label: "+2σ", value: distributionMean + distributionStdDev * 2, color: "color-mix(in oklab, var(--muted-foreground) 55%, transparent)" },
                      ];
                      for (const marker of advancedMarkers) {
                        markers.push({
                          ...marker,
                          bucketIndex: resolveBucketIndex(marker.value),
                        });
                      }
                    }

                    return (
                      <div className="space-y-3">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="h-8 rounded-full bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
                              onClick={() => setShowAdvancedStats((prev) => !prev)}
                            >
                              {showAdvancedStats ? "Hide advanced stats" : "Show advanced stats"}
                            </button>
                            <span className="text-xs text-muted-foreground">
                              Median + Mean are always shown.
                            </span>
                          </div>
                          <div
                            className="grid gap-[3px] px-1 pb-2"
                            style={{
                              gridTemplateColumns: `repeat(${distribution.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {distribution.map((bucket, idx) => {
                              const isUserBucket = idx === userBucketIndex;
                              const markersInBucket = markers.filter((marker) => marker.bucketIndex === idx);
                              const percentile = bucketPercentiles[idx];
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
                                markersInBucket.length > 0 ||
                                idx === 0 ||
                                idx === distribution.length - 1 ||
                                bucket.from % 10 === 0;

                              return (
                                <Tooltip key={`${bucket.from}-${bucket.to}`}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={[
                                        "flex min-w-0 flex-col items-center",
                                        "cursor-default select-none",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-0",
                                      ].join(" ")}
                                      tabIndex={0}
                                      aria-label={`${bucket.from}–${bucket.to}: ${bucket.count} runs${
                                        isUserBucket ? ", you are here" : ""
                                      }`}
                                    >
                                      <div className="relative flex h-28 w-full items-end sm:h-36">
                                        {markersInBucket.map((marker) => {
                                          const bucketSpan = Math.max(1, bucket.to - bucket.from + 1);
                                          const markerOffsetPct = Math.max(
                                            0,
                                            Math.min(
                                              100,
                                              ((marker.value - bucket.from + 0.5) / bucketSpan) * 100
                                            )
                                          );
                                          return (
                                            <div
                                              key={marker.key}
                                              className="pointer-events-none absolute inset-y-0 z-10 w-px"
                                              style={{
                                                left: `${markerOffsetPct}%`,
                                                backgroundColor: marker.color,
                                              }}
                                              aria-hidden="true"
                                            />
                                          );
                                        })}
                                        <div
                                          className={[
                                            "w-full rounded-sm transition-[height,background-color] duration-300",
                                            bucket.count === 0 && !isUserBucket
                                              ? "min-h-0"
                                              : "min-h-[2px]",
                                            isUserBucket
                                              ? "bg-brand"
                                              : "bg-muted-foreground/25 dark:bg-muted-foreground/35",
                                                                                      ].join(" ")}
                                          style={{ height: `${heightPct}%` }}
                                        />
                                      </div>

                                      {showTickLabel ? (
                                        <span
                                          className={[
                                            "mt-2 text-[10px] font-mono tabular-nums leading-none",
                                            isUserBucket
                                              ? "font-semibold text-brand"
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
                                          className="mt-1 h-1 w-1 bg-brand"
                                          aria-hidden="true"
                                        />
                                      ) : null}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" sideOffset={8}>
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono tabular-nums">
                                          {bucket.from}–{bucket.to}
                                        </span>
                                        <span className="opacity-80">
                                          {bucket.count} run{bucket.count === 1 ? "" : "s"}
                                        </span>
                                        <span className="opacity-80">
                                          {formatPercentile(percentile.start)}–{formatPercentile(percentile.end)}
                                        </span>
                                        {isUserBucket ? (
                                          <span className="font-semibold">You</span>
                                        ) : null}
                                      </div>
                                      {markersInBucket.length > 0 ? (
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/50 pt-1">
                                          {markersInBucket.map((marker) => (
                                            <span key={marker.key} className="inline-flex items-center gap-1 text-xs">
                                              <span
                                                className="h-2 w-2"
                                                style={{ backgroundColor: marker.color }}
                                                aria-hidden="true"
                                              />
                                              {marker.label}: {formatStatValue(marker.value)}
                                            </span>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {typeof distributionMedian === "number" ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-3 w-px bg-brand" aria-hidden="true" />
                                Median: {formatStatValue(distributionMedian)}
                              </span>
                            ) : null}
                            {typeof distributionMean === "number" ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-3 w-px bg-foreground" aria-hidden="true" />
                                Mean: {formatStatValue(distributionMean)}
                              </span>
                            ) : null}
                            {showAdvancedStats && typeof distributionStdDev === "number" ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-3 w-px bg-muted-foreground" aria-hidden="true" />
                                σ: {formatStatValue(distributionStdDev)}
                              </span>
                            ) : null}
                            <span>{problemsSolved.toLocaleString()} problems solved</span>
                          </div>
                          {showAdvancedStats &&
                          typeof distributionMean === "number" &&
                          typeof distributionStdDev === "number" ? (
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <span className="h-3 w-px bg-muted-foreground" aria-hidden="true" />
                                ±1σ: {formatStatValue(distributionMean - distributionStdDev)} to{" "}
                                {formatStatValue(distributionMean + distributionStdDev)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <span className="h-3 w-px bg-muted-foreground/55" aria-hidden="true" />
                                ±2σ: {formatStatValue(distributionMean - distributionStdDev * 2)} to{" "}
                                {formatStatValue(distributionMean + distributionStdDev * 2)}
                              </span>
                            </div>
                          ) : null}
                          <div className="text-xs text-muted-foreground">
                            Scores from every full timed run on the default settings
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          ) : view === "topScores" && mode === "training" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Each player appears once with their best all-time score using the default timed setup.
              </p>
              <Card>
                <CardContent className="p-0">
                  {isTopScoresLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    </div>
                  ) : topScores.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No qualifying timed training scores yet.
                    </div>
                  ) : (
                    <table className="w-full table-fixed">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="w-14 p-3 text-left text-xs font-medium text-muted-foreground sm:w-20 sm:p-4 sm:text-sm">Rank</th>
                          <th className="p-3 text-left text-xs font-medium text-muted-foreground sm:p-4 sm:text-sm">Player</th>
                          <th className="w-24 p-3 text-right text-xs font-medium text-muted-foreground sm:w-32 sm:p-4 sm:text-sm">Best Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topScores.map((entry) => (
                          <tr
                            key={entry.id}
                            className={`border-b border-border last:border-0 ${entry.isYou ? "bg-secondary/50" : ""}`}
                          >
                            <td className="p-3 sm:p-4">
                              <span className="font-mono text-sm tabular-nums text-muted-foreground">{entry.rank}</span>
                            </td>
                            <td className="min-w-0 p-3 sm:p-4">
                              <PlayerCell entry={entry} />
                            </td>
                            <td className="p-3 text-right sm:p-4">
                              <span className="font-mono text-sm font-medium tabular-nums">
                                {entry.score.toLocaleString()}
                              </span>
                              <span className="ml-1 hidden text-[11px] text-muted-foreground sm:inline">solved</span>
                            </td>
                          </tr>
                        ))}
                        {topScoreUserRank && topScoreUserRank.rank > topScores.length && (
                          <>
                            <tr>
                              <td colSpan={3} className="p-2 text-center text-xs text-muted-foreground">...</td>
                            </tr>
                            <tr className="border-t border-border bg-secondary/50">
                              <td className="p-3 sm:p-4">
                                <span className="font-mono text-sm tabular-nums text-muted-foreground">{topScoreUserRank.rank}</span>
                              </td>
                              <td className="min-w-0 p-3 sm:p-4">
                                <PlayerCell entry={{ ...topScoreUserRank, isYou: true }} />
                              </td>
                              <td className="p-3 text-right sm:p-4">
                                <span className="font-mono text-sm font-medium tabular-nums">
                                  {topScoreUserRank.score.toLocaleString()}
                                </span>
                                <span className="ml-1 hidden text-[11px] text-muted-foreground sm:inline">solved</span>
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top 3: equal cards, 2-1-3 on wide screens and 1-2-3 when stacked on phones. */}
              {leaderboardData.length > 0 && (
                <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {visualTopThree.map((entry, index) => {
                    if (!entry) return <li key={index} aria-hidden="true" className="hidden sm:block" />;
                    const isFirst = entry.rank === 1;
                    return (
                      // Phones: a compact row (rank, avatar, name, score). Wider: a centered card.
                      <li
                        key={entry.id}
                        className={cn(
                          "grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[22px] bg-secondary p-4",
                          "sm:flex sm:flex-col sm:gap-0 sm:rounded-[26px] sm:px-4 sm:py-6 sm:text-center",
                          isFirst && "order-first sm:order-none",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-flex h-7 items-center justify-self-start rounded-full px-3 text-[13px] font-semibold tabular-nums",
                            isFirst ? "bg-brand text-white" : "bg-background text-muted-foreground",
                          )}
                        >
                          {ordinal(entry.rank)}
                        </span>
                        <PlayerAvatar entry={entry} className="h-10 w-10 sm:mt-4 sm:h-14 sm:w-14 sm:text-base" />
                        <div className="min-w-0 sm:mt-3 sm:max-w-full">
                          <p className="truncate text-[15px] font-semibold">
                            {entry.name}
                            {entry.isYou && <span className="font-normal text-muted-foreground"> (You)</span>}
                          </p>
                          <p className="text-[13px] text-muted-foreground sm:hidden" aria-label={getPerformanceDescription(entry.performance)}>
                            {getPerformanceLabel()} {formatPerformance(entry.performance)}
                          </p>
                        </div>
                        <div className="text-right sm:mt-3 sm:text-center">
                          <p className="text-[22px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[34px]">
                            {formatScoreValue(entry.score)}
                          </p>
                          <p className="mt-1 text-[12px] text-muted-foreground sm:mt-1.5 sm:text-[13px]">{getScoreLabel().toLowerCase()}</p>
                        </div>
                        <p
                          className="mt-4 hidden text-[13px] text-muted-foreground sm:block"
                          aria-label={getPerformanceDescription(entry.performance)}
                        >
                          {getPerformanceLabel()}{" "}
                          <span className="font-semibold tabular-nums text-foreground">{formatPerformance(entry.performance)}</span>
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}

              {/* Everyone after the podium, as rows on one grey grouped surface. */}
              {leaderboardData.length === 0 ? (
                <div className="rounded-[26px] bg-secondary p-8 text-center text-muted-foreground">
                  {period === "all" ? "No data available yet." : "No activity in this period yet."}
                </div>
              ) : (restOfLeaderboard.length > 0 || showDetachedUserRow) && (
                <div className="overflow-hidden rounded-[26px] bg-secondary">
                  <table className="w-full table-fixed sm:table-auto">
                    <thead>
                      <tr className="text-[13px] text-muted-foreground">
                        <th className="w-14 py-3.5 pl-5 pr-2 text-left font-medium sm:w-16">Rank</th>
                        <th className="px-2 py-3.5 text-left font-medium sm:w-full">Player</th>
                        <th className="w-20 whitespace-nowrap py-3.5 pl-2 pr-5 text-right font-medium sm:w-auto sm:pr-2">
                          {mode === "training" ? (
                            <>
                              <span className="sm:hidden">Solved</span>
                              <span className="hidden sm:inline">{getScoreLabel()}</span>
                            </>
                          ) : (
                            getScoreLabel()
                          )}
                        </th>
                        <th className="hidden px-2 py-3.5 text-right font-medium sm:table-cell">{getPerformanceLabel()}</th>
                        <th className="hidden w-24 py-3.5 pl-2 pr-5 text-right font-medium sm:table-cell">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted underline-offset-4">Change</span>
                            </TooltipTrigger>
                            <TooltipContent side="top">{trendComparisonLabel}</TooltipContent>
                          </Tooltip>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {restOfLeaderboard.map((entry) => renderRankingRow(entry))}
                      {showDetachedUserRow && userRank && (
                        <>
                          <tr aria-hidden="true">
                            <td colSpan={5} className="border-t border-border py-1.5 text-center text-xs text-muted-foreground">···</td>
                          </tr>
                          {renderRankingRow({ ...userRank, isYou: true })}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
