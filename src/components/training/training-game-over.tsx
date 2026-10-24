"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Flame, RotateCcw } from "lucide-react";
import { WeekDots, compareToBaseline } from "@/components/training/today-card";
import { Button } from "@/components/ui/button";
import { animate, motion, useReducedMotion } from "motion/react";
import { settleSpring } from "@/lib/motion";
import type {
  DailyOutcome,
  DailySectionId,
  DifficultySettings,
  LessonOutcome,
  PracticeKind,
  Problem,
  ScoreDistribution,
} from "@/components/training/training-types";
import { LESSONS, LESSON_MASTERY_FIRST_TRY, LESSON_SOLO, FREE_LESSON_COUNT } from "@/lib/lessons";
import { getUpgradeUrl } from "@/lib/upgrade";
import { cn } from "@/lib/utils";
import { RunPlacement } from "@/components/training/run-placement";

/** A Practice set's results: how many were right first time, and what to go over. */
export type PracticeSummary = {
  kind: PracticeKind;
  /** False when the player stopped before the set was done. */
  complete: boolean;
  size: number;
  firstTry: number;
  seconds: number | null;
  misses: MissedProblem[];
  /** In Learning: the lesson these problems came from. */
  lessonTitle: string | null;
};

type MissedProblem = { problem: Problem; technique: string };

// A long Timed run can miss a lot; the rest are still saved.
const MISSES_SHOWN = 8;

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
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
  lesson,
  daily,
  onOpenLesson,
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
  /** A lesson played to the end: how it went and what comes next. */
  lesson: LessonOutcome | null;
  /** Today's session played to the end: the streak and how each part went. */
  daily: DailyOutcome | null;
  /** Back to the lesson picker on a lesson (the next one, or this one again). */
  onOpenLesson: (id: string) => void;
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
  // After the free lessons, the next one is where Pro starts.
  const nextLocked = lesson?.next?.locked ?? false;
  const shownMisses = misses.slice(0, MISSES_SHOWN);

  // Secondary stats read as receipt rows (Kurb's "Hourly rate · $10" detail list).
  const dailyComparison =
    daily?.averageSeconds != null && daily.baselineSeconds != null
      ? compareToBaseline(daily.averageSeconds, daily.baselineSeconds)
      : null;

  const detailRows = [
    ...(daily?.sections.map((part) => ({
      label: DAILY_SECTION_LABELS[part.section],
      value: `${part.firstTry} of ${part.total}`,
      className: undefined as string | undefined,
    })) ?? []),
    daily
      ? {
          label: "Average time",
          value: `${daily.averageSeconds === null ? "–" : `${daily.averageSeconds.toFixed(1)}s`}${dailyComparison ? ` · ${dailyComparison}` : ""}`,
        }
      : null,
    lesson
      ? {
          label: "Mastery",
          value: lesson.mastered
            ? "Mastered"
            : `${LESSON_MASTERY_FIRST_TRY} of ${LESSON_SOLO} under ${lesson.targetSeconds}s to master`,
          className: lesson.mastered ? "text-success" : undefined,
        }
      : null,
    lesson
      ? {
          label: "Average on your own",
          value: lesson.soloAverageSeconds === null ? "–" : `${lesson.soloAverageSeconds.toFixed(1)}s`,
        }
      : null,
    practice?.seconds != null ? { label: "Time", value: formatDuration(practice.seconds) } : null,
    showAccuracyCard ? { label: "Accuracy", value: `${accuracy}%` } : null,
    runSeconds !== null && runSeconds >= 5
      ? { label: "Pace", value: `${Math.round((totalSolved / runSeconds) * 60)} per minute` }
      : null,
    lesson || daily ? null : { label: "Average time", value: `${avgTimeSeconds > 0 ? avgTimeSeconds.toFixed(1) : "0"}s` },
    showBestStreakCard ? { label: "Best streak", value: String(bestStreak) } : null,
    // A review mixes problems from every difficulty, and a lesson's problems are its own.
    practice?.kind === "review" || practice?.kind === "daily" || practice?.lessonTitle
      ? null
      : { label: "Difficulty", value: difficultyLabel, className: difficultyBadgeClassName },
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
          {/* Mastering a lesson lands with a check that springs in. */}
          {lesson?.newlyMastered && (
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.45, duration: 0.6, delay: 0.15 }}
              className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-success text-background"
            >
              <Check aria-hidden="true" className="h-6 w-6" strokeWidth={3} />
            </motion.div>
          )}
          <p className="text-[15px] font-medium text-muted-foreground">
            {stoppedAt
              ? `Stopped after ${stoppedAt}`
              : daily
                ? daily.repeat ? "Today, again" : "Today done"
              : lesson
                ? lesson.newlyMastered ? `${lesson.title} mastered` : `${lesson.title} complete`
                : practice ? (practice.kind === "review" ? "Review complete" : "Set complete") : "Time\u2019s up"}
          </p>
          <p className="mt-2 text-[88px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[112px]">
            <CountUp value={lesson ? lesson.soloFirstTry : practice ? practice.firstTry : totalSolved} />
          </p>
          <p className="mt-2 text-[17px] text-muted-foreground">
            {lesson
              ? `of ${lesson.soloCount} on your own, right first time`
              : practice
                ? practice.complete ? `of ${practice.size} right first time` : "right first time"
                : totalSolved === 1 ? "problem solved" : "problems solved"}
          </p>
          {/* How the run ranks against everyone's on the same settings, when there's enough to say. */}
          {!lesson && !practice && !daily && scorePercentile?.percentile != null && (
            <RunPlacement data={{ ...scorePercentile, percentile: scorePercentile.percentile }} />
          )}
          {daily && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...settleSpring, delay: 0.1 }}
              className="mx-auto mt-5 flex w-fit items-center gap-4 rounded-full bg-secondary py-2 pl-4 pr-5"
            >
              <p className="flex items-center gap-1 text-[15px] font-semibold tabular-nums">
                <Flame aria-hidden="true" className="h-4 w-4 text-brand" />
                {daily.streak} {daily.streak === 1 ? "day" : "days"}
              </p>
              <WeekDots week={daily.week} />
            </motion.div>
          )}
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
          {daily && misses.length === 0 ? (
            <Button variant="brand" size="lg" onClick={onChangeSettings} className="h-14 w-full text-[17px]">
              Done
            </Button>
          ) : daily ? (
            <>
              <Button variant="brand" size="lg" onClick={onRetryMisses} className="h-14 w-full text-[17px]">
                <RotateCcw aria-hidden="true" />
                Retry {misses.length === 1 ? "this one" : `these ${misses.length}`}
              </Button>
              <Button variant="secondary" size="lg" onClick={onChangeSettings} className="w-full">
                Done
              </Button>
            </>
          ) : lesson ? (
            <LessonActions
              lesson={lesson}
              missCount={misses.length}
              onNext={() => lesson.next && onOpenLesson(lesson.next.id)}
              onAgain={onPlayAgain}
              onRetryMisses={onRetryMisses}
              onAllLessons={() => onOpenLesson(lesson.lessonId)}
            />
          ) : practice && practice.misses.length > 0 ? (
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

        {/* Done with the free lessons: the rest are Pro. */}
        {lesson && nextLocked && (
          <div className="flex flex-col gap-4 rounded-[22px] bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[17px] font-semibold tracking-tight">
                {LESSONS.length - FREE_LESSON_COUNT} more lessons with Pro
              </div>
              <div className="mt-0.5 text-[15px] text-muted-foreground">
                Up next: {lesson.next!.title}. Pro opens all {LESSONS.length}.
              </div>
            </div>
            <Link
              href={getUpgradeUrl({ feature: "lessons", source: "lesson_results" })}
              onClick={() =>
                captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
                  feature: "lessons",
                  surface: "training_game_over",
                  action: "open_pricing",
                  training_run_id: trainingRunId ?? undefined,
                  lesson_id: lesson.lessonId,
                })
              }
              className="shrink-0"
            >
              <Button size="sm">Unlock lessons</Button>
            </Link>
          </div>
        )}

        {/* Free accounts: the misses are already saved; Pro is what brings them back. (After a
            lesson, the lessons prompt above is the one offer.) */}
        {misses.length > 0 && reviewPrompt === "locked" && !nextLocked && (
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

const DAILY_SECTION_LABELS: Record<DailySectionId, string> = {
  review: "Past misses",
  lesson: "Lesson checks",
  weak: "Weak spots",
  mix: "Mix",
};

/** After a lesson: on to the next one once it's mastered, otherwise another go. */
function LessonActions({
  lesson,
  missCount,
  onNext,
  onAgain,
  onRetryMisses,
  onAllLessons,
}: {
  lesson: LessonOutcome;
  missCount: number;
  onNext: () => void;
  onAgain: () => void;
  onRetryMisses: () => void;
  onAllLessons: () => void;
}) {
  const primary = "h-14 w-full text-[17px]";
  if (lesson.mastered && lesson.next && !lesson.next.locked) {
    return (
      <>
        <Button variant="brand" size="lg" onClick={onNext} className={primary}>
          Next lesson: {lesson.next.title}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="lg" onClick={onAgain} className="w-full">
            Go again
          </Button>
          <Button variant="secondary" size="lg" onClick={onAllLessons} className="w-full">
            All lessons
          </Button>
        </div>
      </>
    );
  }
  return (
    <>
      <Button variant="brand" size="lg" onClick={onAgain} className={primary}>
        <RotateCcw aria-hidden="true" />
        {lesson.mastered ? "Go again" : "Try the lesson again"}
      </Button>
      <div className={cn("grid gap-2", missCount > 0 && "grid-cols-2")}>
        {missCount > 0 && (
          <Button variant="secondary" size="lg" onClick={onRetryMisses} className="w-full">
            Retry {missCount === 1 ? "the miss" : `${missCount} misses`}
          </Button>
        )}
        <Button variant="secondary" size="lg" onClick={onAllLessons} className="w-full">
          All lessons
        </Button>
      </div>
    </>
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
