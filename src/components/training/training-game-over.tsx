"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { animate, motion, useReducedMotion } from "motion/react";
import { morphLabelIn, morphSpring, settleSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { DifficultySettings, ScoreDistribution } from "@/components/training/training-types";
import { ScoreDistributionCard } from "@/components/training/score-distribution-card";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

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
  trainingRunId,
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
  trainingRunId: string | null;
}) {
  useEffect(() => {
    if (!showAuthCallout) return;
    captureAnalyticsEvent(ANALYTICS_EVENTS.signupPromptViewed, {
      surface: "training_game_over",
      auth_state: "guest",
      training_run_id: trainingRunId ?? undefined,
      total_solved: totalSolved,
      accuracy,
    });
  }, [accuracy, showAuthCallout, totalSolved, trainingRunId]);

  // Secondary stats read as receipt rows (Kurb's "Hourly rate · $10" detail list).
  const detailRows = [
    showAccuracyCard ? { label: "Accuracy", value: `${accuracy}%` } : null,
    { label: "Average time", value: `${avgTimeSeconds > 0 ? avgTimeSeconds.toFixed(1) : "0"}s` },
    showBestStreakCard ? { label: "Best streak", value: String(bestStreak) } : null,
    { label: "Difficulty", value: difficultyLabel, className: difficultyBadgeClassName },
  ].filter((row): row is { label: string; value: string; className?: string } => row !== null);

  return (
    <div className="mx-auto max-w-xl pt-4 sm:pt-10">
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-[15px] font-medium text-muted-foreground">Time&apos;s up</p>
          <p className="mt-2 text-[88px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[112px]">
            <CountUp value={totalSolved} />
          </p>
          <p className="mt-2 text-[17px] text-muted-foreground">
            {totalSolved === 1 ? "problem solved" : "problems solved"}
          </p>
        </div>

        <dl className="divide-y divide-border rounded-[22px] bg-secondary px-5">
          {detailRows.map((row, index) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...settleSpring, delay: 0.25 + index * 0.06 }}
              className="flex items-center justify-between py-3.5 text-[15px]"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className={`font-semibold tabular-nums ${row.className ?? ""}`}>{row.value}</dd>
            </motion.div>
          ))}
        </dl>

        <div className="space-y-2">
          {/* The run's card collapses into this pill, and expands back out of it on Play again. */}
          <motion.button
            type="button"
            layoutId="run-surface"
            transition={morphSpring}
            style={{ borderRadius: 28 }}
            onClick={onPlayAgain}
            className={cn(buttonVariants({ variant: "brand", size: "lg" }), "h-14 w-full text-[17px]")}
          >
            <motion.span layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={morphLabelIn} className="inline-flex items-center gap-2">
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              Play again
            </motion.span>
          </motion.button>
          <Button variant="secondary" size="lg" onClick={onChangeSettings} className="w-full">
            Change settings
          </Button>
        </div>

        {scorePercentile && (
          <ScoreDistributionCard data={scorePercentile} heading="Your placement" scoreLabel="Best score this run:" />
        )}

        {showAuthCallout && (
          <div className="rounded-[22px] bg-secondary p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[17px] font-semibold tracking-tight">Keep your runs</div>
                <div className="mt-0.5 text-[15px] text-muted-foreground">
                  Sign in to keep history, streaks, and leaderboard entries.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin?callbackUrl=%2Fdashboard"
                  onClick={() =>
                    captureAnalyticsEvent(ANALYTICS_EVENTS.signupCtaClicked, {
                      surface: "training_game_over",
                      entry_source: "training_game_over",
                      auth_intent: "sign_in",
                      training_run_id: trainingRunId ?? undefined,
                    })
                  }
                >
                  <Button variant="outline" size="sm" className="bg-background">
                    Sign in
                  </Button>
                </Link>
                <Link
                  href="/auth/signup?callbackUrl=%2Fdashboard"
                  onClick={() =>
                    captureAnalyticsEvent(ANALYTICS_EVENTS.signupCtaClicked, {
                      surface: "training_game_over",
                      entry_source: "training_game_over",
                      auth_intent: "sign_up",
                      training_run_id: trainingRunId ?? undefined,
                    })
                  }
                >
                  <Button size="sm">Create account</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// The score counts up once, easing out, so the result lands rather than just appearing.
function CountUp({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(0, value, {
      duration: Math.min(1.1, 0.45 + value * 0.012),
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [value, reduceMotion]);
  // Reduced motion shows the final score straight away.
  return <>{reduceMotion ? value : shown}</>;
}
