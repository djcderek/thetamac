"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { animate, motion, useReducedMotion } from "motion/react";
import { settleSpring } from "@/lib/motion";
import type { DifficultySettings, PracticeKind, Problem, ScoreDistribution } from "@/components/training/training-types";
import { getUpgradeUrl } from "@/lib/upgrade";

/** A Practice set's results: how many were right first time, and what to go over. */
export type PracticeSummary = {
  kind: PracticeKind;
  /** False when the player stopped before the set was done. */
  complete: boolean;
  size: number;
  firstTry: number;
  seconds: number | null;
  misses: MissedProblem[];
};

type MissedProblem = { problem: Problem; technique: string };

// A long Timed run can miss a lot; the rest are still saved.
const MISSES_SHOWN = 8;

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
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
  practice,
  runMisses,
  onRetryMisses,
  onOpenReview,
  reviewPrompt,
  stoppedAt,
  runSeconds,
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
  practice: PracticeSummary | null;
  /** Outside Practice: every problem missed this run. */
  runMisses: MissedProblem[];
  onRetryMisses: () => void;
  /** Pro outside Practice: go to Practice, where the review is. */
  onOpenReview: () => void;
  /** Signed in: "pro" notes misses are saved for review, "locked" offers it. */
  reviewPrompt: "pro" | "locked" | null;
  /** Time into the run when the player pressed Stop (e.g. "0:42"); null when it ran its course. */
  stoppedAt: string | null;
  /** How long the run lasted, for the pace row; null when there was no overall clock. */
  runSeconds: number | null;
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

  const misses = practice ? practice.misses : runMisses;
  const shownMisses = misses.slice(0, MISSES_SHOWN);

  // Secondary stats read as receipt rows (Kurb's "Hourly rate · $10" detail list).
  const detailRows = [
    practice?.seconds != null ? { label: "Time", value: formatDuration(practice.seconds) } : null,
    showAccuracyCard ? { label: "Accuracy", value: `${accuracy}%` } : null,
    runSeconds !== null && runSeconds >= 5
      ? { label: "Pace", value: `${Math.round((totalSolved / runSeconds) * 60)} per minute` }
      : null,
    { label: "Average time", value: `${avgTimeSeconds > 0 ? avgTimeSeconds.toFixed(1) : "0"}s` },
    showBestStreakCard ? { label: "Best streak", value: String(bestStreak) } : null,
    // A review mixes problems from every difficulty.
    practice?.kind === "review" ? null : { label: "Difficulty", value: difficultyLabel, className: difficultyBadgeClassName },
  ].filter((row): row is { label: string; value: string; className?: string } => row !== null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={settleSpring}
      className="mx-auto max-w-xl pt-4 sm:pt-10"
    >
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-[15px] font-medium text-muted-foreground">
            {stoppedAt
              ? `Stopped after ${stoppedAt}`
              : practice ? (practice.kind === "review" ? "Review complete" : "Set complete") : "Time\u2019s up"}
          </p>
          <p className="mt-2 text-[88px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[112px]">
            <CountUp value={practice ? practice.firstTry : totalSolved} />
          </p>
          <p className="mt-2 text-[17px] text-muted-foreground">
            {practice
              ? practice.complete ? `of ${practice.size} right first time` : "right first time"
              : totalSolved === 1 ? "problem solved" : "problems solved"}
          </p>
        </div>

        <dl className="divide-y divide-border rounded-[22px] bg-secondary px-5">
          {detailRows.map((row, index) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...settleSpring, delay: 0.08 + index * 0.05 }}
              className="flex items-center justify-between py-3.5 text-[15px]"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className={`font-semibold tabular-nums ${row.className ?? ""}`}>{row.value}</dd>
            </motion.div>
          ))}
        </dl>

        {/* What was missed, with the trick for each (in Practice, ready to retry). */}
        {misses.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...settleSpring, delay: 0.08 + detailRows.length * 0.05 }}
            aria-labelledby="practice-review-heading"
            className="space-y-2"
          >
            <h2 id="practice-review-heading" className="px-1 text-[13px] text-muted-foreground">
              To go over · {misses.length}
            </h2>
            <ul className="divide-y divide-border rounded-[22px] bg-secondary px-5">
              {shownMisses.map(({ problem, technique }) => (
                <li
                  key={`${problem.a}${problem.operation}${problem.b}`}
                  className="flex items-baseline justify-between gap-4 py-3 text-[15px]"
                >
                  <span className="shrink-0 font-mono font-semibold tabular-nums">
                    {problem.a} {problem.operation} {problem.b} = {problem.answer}
                  </span>
                  <span className="min-w-0 truncate text-right text-muted-foreground">{technique}</span>
                </li>
              ))}
              {misses.length > shownMisses.length && (
                <li className="py-3 text-[15px] text-muted-foreground">
                  and {misses.length - shownMisses.length} more
                </li>
              )}
            </ul>
            {reviewPrompt === "pro" && (
              <p className="px-1 text-[13px] leading-5 text-muted-foreground">
                Saved to your review. They come back in a later session until they stick.
                {!practice && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={onOpenReview}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      Open review
                    </button>
                  </>
                )}
              </p>
            )}
          </motion.section>
        )}

        <div className="space-y-2">
          {practice && practice.misses.length > 0 ? (
            <>
              <Button variant="brand" size="lg" onClick={onRetryMisses} className="h-14 w-full text-[17px]">
                <RotateCcw aria-hidden="true" />
                Retry {practice.misses.length === 1 ? "this one" : `these ${practice.misses.length}`}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="lg" onClick={onPlayAgain} className="w-full">
                  New set
                </Button>
                <Button variant="secondary" size="lg" onClick={onChangeSettings} className="w-full">
                  Change settings
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="brand" size="lg" onClick={onPlayAgain} className="h-14 w-full text-[17px]">
                <RotateCcw aria-hidden="true" />
                {practice ? "New set" : "Play again"}
              </Button>
              <Button variant="secondary" size="lg" onClick={onChangeSettings} className="w-full">
                Change settings
              </Button>
            </>
          )}
        </div>

        {/* Free accounts: the misses are already saved; Pro is what brings them back. */}
        {misses.length > 0 && reviewPrompt === "locked" && (
          <div className="flex flex-col gap-4 rounded-[22px] bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[17px] font-semibold tracking-tight">Make these stick</div>
              <div className="mt-0.5 text-[15px] text-muted-foreground">
                Pro brings your misses back in later sessions until you get them every time.
              </div>
            </div>
            <Link
              href={getUpgradeUrl({ feature: "review", source: practice ? "practice_results" : "run_results" })}
              onClick={() =>
                captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
                  feature: "review",
                  surface: "training_game_over",
                  action: "open_pricing",
                  training_run_id: trainingRunId ?? undefined,
                  review_miss_count: misses.length,
                })
              }
              className="shrink-0"
            >
              <Button size="sm">Unlock review</Button>
            </Link>
          </div>
        )}

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
    </motion.div>
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
