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
import type { DistributionBucket } from "@/lib/training-distribution";
import type {
  LeaderboardEntry,
  LeaderboardResult,
  Mode,
  Period,
} from "@/lib/leaderboard";
import { PageHeader, SectionLabel } from "@/components/ui/visual-system";

interface LeaderboardClientProps {
  initialLeaderboard: LeaderboardResult;
  initialDistribution: DistributionBucket[];
  initialDistributionMedian: number | null;
  initialDistributionMean: number | null;
  initialDistributionStdDev: number | null;
  initialMode: Mode;
  initialPeriod: Period;
}

function formatPerformance(metric: LeaderboardEntry["performance"]): string {
  if (metric.kind === "bestRun") return `${metric.value.toLocaleString()} solved`;
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
    return <span className="text-xs font-medium text-brand" aria-label={`New to these standings. ${comparisonLabel}.`}>New</span>;
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

export function LeaderboardClient({
  initialLeaderboard,
  initialDistribution,
  initialDistributionMedian,
  initialDistributionMean,
  initialDistributionStdDev,
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
  const [view, setView] = useState<"board" | "distribution">("distribution");
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

  // Track if we've changed from initial values (to know when to fetch)
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    if (!hasInteracted) return;

    async function fetchLeaderboard() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?period=${period}&mode=${mode}`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboardData(data.leaderboard);
          setUserRank(data.userRank);
          setTrendComparisonLabel(data.trendComparisonLabel);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [period, mode, hasInteracted]);

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
        }
      } catch (error) {
        console.error("Failed to fetch distribution", error);
      } finally {
        setIsDistributionLoading(false);
      }
    }

    fetchDistribution();
  }, [mode, view, hasInteracted]);

  const handleModeChange = (newMode: string) => {
    setHasInteracted(true);
    setMode(newMode as Mode);
  };

  const handlePeriodChange = (newPeriod: string) => {
    setHasInteracted(true);
    setPeriod(newPeriod as Period);
  };

  const handleViewChange = (newView: string) => {
    setHasInteracted(true);
    setView(newView as "board" | "distribution");
  };

  const topThree = leaderboardData.slice(0, 3);
  const visualTopThree = [
    topThree.length > 1 ? topThree[1] : null,
    topThree.length > 0 ? topThree[0] : null,
    topThree.length > 2 ? topThree[2] : null,
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

  const getPerformanceLabel = () => {
    if (mode === "training") return "Best Run";
    if (mode === "duel") return "W–L–D";
    return "Wins / Races";
  };

  const formatPercentile = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    return `P${clamped.toFixed(1)}`;
  };

  const formatStatValue = (value: number | null) =>
    typeof value === "number" ? value.toFixed(1) : "—";

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Leaderboard"
        description="Global rankings across duels, racing, and timed training using default settings."
        action={userRank ? <Badge variant="outline" className="bg-card">Your {getRankLabel()}: #{userRank.rank}</Badge> : undefined}
      />

      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <section aria-label="Leaderboard controls" className="space-y-4 border-b border-border pb-5">
            <div>
              <div className="space-y-2">
                <SectionLabel>Competition</SectionLabel>
                <Tabs
                  defaultValue={initialMode}
                  value={mode}
                  className="w-full sm:w-auto"
                  onValueChange={handleModeChange}
                >
                  <TabsList className="grid w-full grid-cols-3 rounded-[3px] sm:w-auto">
                    <TabsTrigger className="rounded-[2px] px-4" value="training">
                      Timed Training
                    </TabsTrigger>
                    <TabsTrigger className="rounded-[2px] px-4" value="duel">
                      Duel
                    </TabsTrigger>
                    <TabsTrigger className="rounded-[2px] px-4" value="racing">
                      Racing
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {mode === "training" && (
                  <p className="text-xs leading-5 text-muted-foreground">
                    Default setup: Medium · All operations · Standard timer
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
              <div className="space-y-2">
                <SectionLabel>Timeframe</SectionLabel>
                <Tabs
                  defaultValue={initialPeriod}
                  value={period}
                  className="w-full sm:w-auto"
                  onValueChange={handlePeriodChange}
                >
                  <TabsList className="min-h-9 rounded-[3px] p-0.5">
                    <TabsTrigger className="h-7 rounded-[2px] px-3" value="all">
                      All time
                    </TabsTrigger>
                    <TabsTrigger className="h-7 rounded-[2px] px-3" value="weekly">
                      Weekly
                    </TabsTrigger>
                    <TabsTrigger className="h-7 rounded-[2px] px-3" value="daily">
                      Daily
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {mode === "training" && (
                <div className="space-y-2">
                  <SectionLabel>View</SectionLabel>
                  <Tabs
                    defaultValue="distribution"
                    value={view}
                    className="w-full sm:w-auto"
                    onValueChange={handleViewChange}
                  >
                    <TabsList className="min-h-9 rounded-[3px] p-0.5">
                      <TabsTrigger className="h-7 rounded-[2px] px-3" value="distribution">
                        Distribution
                      </TabsTrigger>
                      <TabsTrigger className="h-7 rounded-[2px] px-3" value="board">
                        Rankings
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </div>
          </section>

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
                      typeof userRank?.score === "number"
                        ? distribution.findIndex(
                            (b) => userRank.score >= b.from && userRank.score <= b.to
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
                              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
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
                            <span>
                              {totalRuns.toLocaleString()} run{totalRuns === 1 ? "" : "s"}
                            </span>
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
                          <p
                            className="mt-1 text-xs text-muted-foreground"
                            aria-label={getPerformanceDescription(entry.performance)}
                          >
                            {getPerformanceLabel()}: {formatPerformance(entry.performance)}
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
                    <table className="w-full table-fixed sm:table-auto">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="w-12 p-3 text-left text-xs font-medium text-muted-foreground sm:w-16 sm:p-4 sm:text-sm">Rank</th>
                          <th className="p-3 text-left text-xs font-medium text-muted-foreground sm:p-4 sm:text-sm">Player</th>
                          <th className="w-24 p-3 text-right text-xs font-medium text-muted-foreground sm:w-auto sm:p-4 sm:text-sm">{getScoreLabel()}</th>
                          <th className="hidden p-4 text-right text-sm font-medium text-muted-foreground sm:table-cell">{getPerformanceLabel()}</th>
                          <th className="hidden w-20 p-4 text-right text-sm font-medium text-muted-foreground sm:table-cell">
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
                        {restOfLeaderboard.map((entry) => (
                          <tr
                            key={entry.id}
                            className={`border-b border-border last:border-0 ${
                              entry.isYou ? "bg-secondary/50" : ""
                            }`}
                          >
                            <td className="p-3 sm:p-4">
                              <span className="font-mono text-muted-foreground">{entry.rank}</span>
                            </td>
                            <td className="min-w-0 p-3 sm:p-4">
                              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarImage src={entry.image || undefined} />
                                  <AvatarFallback className="text-xs">{entry.avatar}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {entry.name}
                                    {entry.isYou && <span className="text-muted-foreground ml-1">(You)</span>}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Level {entry.level}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-right sm:p-4">
                              <span className="font-mono text-sm tabular-nums">
                                {formatScoreValue(entry.score)}
                              </span>
                              {mode === "training" && (
                                <span className="ml-1 hidden text-[11px] text-muted-foreground md:inline">
                                  {getScoreUnit()}
                                </span>
                              )}
                              <div className="mt-1 flex items-center justify-end gap-2 sm:hidden">
                                <span
                                  className="text-[11px] text-muted-foreground"
                                  aria-label={getPerformanceDescription(entry.performance)}
                                >
                                  {formatPerformance(entry.performance)}
                                </span>
                                <TrendIndicator trend={entry.trend} comparisonLabel={trendComparisonLabel} />
                              </div>
                            </td>
                            <td className="hidden p-4 text-right sm:table-cell">
                              <span
                                className="font-mono text-sm tabular-nums"
                                aria-label={getPerformanceDescription(entry.performance)}
                              >
                                {formatPerformance(entry.performance)}
                              </span>
                            </td>
                            <td className="hidden p-4 text-right sm:table-cell">
                              <TrendIndicator trend={entry.trend} comparisonLabel={trendComparisonLabel} />
                            </td>
                          </tr>
                        ))}
                        
                        {userRank && userRank.rank > leaderboardData.length && (
                          <>
                            <tr>
                              <td colSpan={5} className="p-2 text-center text-muted-foreground text-xs">...</td>
                            </tr>
                            <tr className="bg-secondary/50 border-t border-border">
                              <td className="p-3 sm:p-4">
                                <span className="font-mono text-muted-foreground">{userRank.rank}</span>
                              </td>
                              <td className="min-w-0 p-3 sm:p-4">
                                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={userRank.image || undefined} />
                                    <AvatarFallback className="text-xs">{userRank.avatar}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                      {userRank.name}
                                      <span className="text-muted-foreground ml-1">(You)</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">Level {userRank.level}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-right sm:p-4">
                                <span className="font-mono text-sm tabular-nums">
                                  {formatScoreValue(userRank.score)}
                                </span>
                                {mode === "training" && (
                                  <span className="ml-1 hidden text-[11px] text-muted-foreground md:inline">
                                    {getScoreUnit()}
                                  </span>
                                )}
                                <div className="mt-1 flex items-center justify-end gap-2 sm:hidden">
                                  <span
                                    className="text-[11px] text-muted-foreground"
                                    aria-label={getPerformanceDescription(userRank.performance)}
                                  >
                                    {formatPerformance(userRank.performance)}
                                  </span>
                                  <TrendIndicator trend={userRank.trend} comparisonLabel={trendComparisonLabel} />
                                </div>
                              </td>
                              <td className="hidden p-4 text-right sm:table-cell">
                                <span
                                  className="font-mono text-sm tabular-nums"
                                  aria-label={getPerformanceDescription(userRank.performance)}
                                >
                                  {formatPerformance(userRank.performance)}
                                </span>
                              </td>
                              <td className="hidden p-4 text-right sm:table-cell">
                                <TrendIndicator trend={userRank.trend} comparisonLabel={trendComparisonLabel} />
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
