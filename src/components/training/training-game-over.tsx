"use client";

import Link from "next/link";
import { RotateCcw, LogIn, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AsciiMorph } from "@/components/ui/ascii-morph";
import type { DifficultySettings, ScoreDistribution } from "@/components/training/training-types";
import { ScoreDistributionCard } from "@/components/training/score-distribution-card";
import { trackEvent } from "@/lib/telemetry-client";

export function TrainingGameOver({
  difficultyLabel,
  difficultyBadgeClassName,
  totalSolved,
  accuracy,
  avgTimeSeconds,
  bestStreak,
  showAccuracyCard,
  showBestStreakCard,
  onPlayAgain,
  onChangeSettings,
  scorePercentile,
  showAuthCallout,
}: {
  difficultyLabel: DifficultySettings["label"];
  difficultyBadgeClassName: string;
  totalSolved: number;
  accuracy: number;
  avgTimeSeconds: number;
  bestStreak: number;
  showAccuracyCard: boolean;
  showBestStreakCard: boolean;
  onPlayAgain: () => void;
  onChangeSettings: () => void;
  scorePercentile: ScoreDistribution | null;
  showAuthCallout: boolean;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Time&apos;s up</CardTitle>
            <CardDescription>Session summary</CardDescription>
          </div>
          <div
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${difficultyBadgeClassName}`}
          >
            {difficultyLabel}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <AsciiMorph shapes={["trophy"]} accent className="mx-auto w-28" />
        <div
          className={`grid grid-cols-2 gap-3 ${
            showAccuracyCard
              ? showBestStreakCard
                ? "sm:grid-cols-4"
                : "sm:grid-cols-3"
              : showBestStreakCard
                ? "sm:grid-cols-3"
                : "sm:grid-cols-2"
          }`}
        >
          <div className="border-t-2 border-foreground/80 pt-3">
            <div className="text-xs text-muted-foreground">Solved</div>
            <div className="mt-1 text-3xl font-semibold font-mono tabular-nums">{totalSolved}</div>
          </div>
          {showAccuracyCard && (
            <div className="border-t-2 border-foreground/80 pt-3">
              <div className="text-xs text-muted-foreground">Accuracy</div>
              <div className="mt-1 text-3xl font-semibold font-mono tabular-nums">{accuracy}%</div>
            </div>
          )}
          {showBestStreakCard && (
            <div className="border-t-2 border-foreground/80 pt-3">
              <div className="text-xs text-muted-foreground">Best streak</div>
              <div className="mt-1 text-3xl font-semibold font-mono tabular-nums">{bestStreak}</div>
            </div>
          )}
          <div className="border-t-2 border-foreground/80 pt-3">
            <div className="text-xs text-muted-foreground">Avg time</div>
            <div className="mt-1 text-3xl font-semibold font-mono tabular-nums">
              {avgTimeSeconds > 0 ? avgTimeSeconds.toFixed(1) : "0"}s
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onChangeSettings}>
            Change settings
          </Button>
          <Button onClick={onPlayAgain}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Play again
          </Button>
        </div>

        {scorePercentile && (
          <ScoreDistributionCard data={scorePercentile} heading="Your placement" scoreLabel="Best score this run:" />
        )}

        {showAuthCallout && (
          <div className="border-t border-border pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium">Save your runs</div>
                <div className="text-sm text-muted-foreground">
                  Sign in to keep history, streaks, and leaderboard entries.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin?callbackUrl=%2Fdashboard"
                  onClick={() =>
                    trackEvent("signup_cta_click", {
                      landingPath: "/",
                      source: "training-game-over",
                      pageType: "training",
                      ctaLabel: "Sign in",
                    })
                  }
                >
                  <Button variant="outline" size="sm">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign in
                  </Button>
                </Link>
                <Link
                  href="/auth/signup?callbackUrl=%2Fdashboard"
                  onClick={() =>
                    trackEvent("signup_cta_click", {
                      landingPath: "/",
                      source: "training-game-over",
                      pageType: "training",
                      ctaLabel: "Create account",
                    })
                  }
                >
                  <Button size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

