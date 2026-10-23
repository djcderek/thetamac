"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  Info,
  Lock,
  Play,
  Settings,
  Target,
  Wand2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getLesson, isFreeLesson, type LessonId } from "@/lib/lessons";
import { LessonIntro, LessonList } from "@/components/training/lesson-picker";
import { TodayCard } from "@/components/training/today-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { closeSpring, morphContentIn, morphSpring } from "@/lib/motion";
import { Input } from "@/components/ui/input";
import { SectionLabel, SelectionPill, optionTileClass } from "@/components/ui/visual-system";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreDistributionCard } from "@/components/training/score-distribution-card";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import { getUpgradeUrl } from "@/lib/upgrade";
import type {
  DailySummary,
  Difficulty,
  DifficultySettings,
  GameMode,
  LessonsSummary,
  Operation,
  OperationRanges,
  ReviewSummary,
  ScoreDistribution,
  SubmitMode,
} from "@/components/training/training-types";

const tileClass = optionTileClass;

function inDays(days: number) {
  return days === 0 ? "later today" : days === 1 ? "tomorrow" : `in ${days} days`;
}

/**
 * Past misses due for review, as a detail row in the Practice card. Pro starts a review set;
 * a free account sees what is waiting for it and where to unlock it.
 */
function ReviewRow({ review, onStart }: { review: ReviewSummary; onStart: () => void }) {
  const { locked, dueCount, waitingCount, nextDueInDays, example } = review;
  if (locked && dueCount === 0) return null;

  let detail: string;
  if (locked) {
    const { a, operation, b } = example!.problem;
    detail = dueCount === 1 ? `${a} ${operation} ${b} to review` : `${a} ${operation} ${b} and ${dueCount - 1} more to review`;
  } else if (dueCount > 0) {
    detail = `${dueCount} past ${dueCount === 1 ? "miss" : "misses"} due`;
  } else if (waitingCount > 0 && nextDueInDays !== null) {
    detail = `All caught up · next ${inDays(nextDueInDays)}`;
  } else {
    detail = "Nothing yet. Misses land here.";
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-background py-2 pl-4 pr-2">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          Review past misses
          <span className="rounded-full bg-secondary px-1.5 text-[11px] font-semibold leading-4 text-foreground">Pro</span>
        </p>
        <p className="truncate text-[15px] font-medium tabular-nums">{detail}</p>
      </div>
      {locked ? (
        <Link
          href={getUpgradeUrl({ feature: "review", source: "practice_review" })}
          onClick={() =>
            captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
              feature: "review",
              surface: "practice_setup",
              action: "open_pricing",
              review_due_count: dueCount,
            })
          }
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "min-h-10 shrink-0")}
        >
          Unlock
        </Link>
      ) : (
        dueCount > 0 && (
          <Button variant="secondary" size="sm" onClick={onStart} className="min-h-10 shrink-0">
            Start review
          </Button>
        )
      )}
    </div>
  );
}

function modeDescription(mode: GameMode) {
  switch (mode) {
    case "timed":
      return "Go for volume. Your best single session counts for leaderboards (default settings).";
    case "practice":
      return "Work through a set. Anything you miss comes back a few problems later, with the trick for it, until you get it.";
    case "learning":
      return "Short lessons, one trick each. See it worked through, try a few with the steps, then do it on your own.";
  }
}

/**
 * A range bound the player can clear and retype. Committing `parseInt(v) || 1` on every
 * keystroke snapped a cleared field to 1, so typing "50" produced "150".
 */
function RangeInput({
  value,
  onCommit,
  label,
}: {
  value: number;
  onCommit: (value: number) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      aria-label={label}
      value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        const parsed = Number(next);
        if (Number.isInteger(parsed) && parsed >= 1) onCommit(parsed);
      }}
      onBlur={() => setDraft(String(value))}
      className="h-10 w-20 rounded-xl px-2 text-center text-[15px] tabular-nums"
      min={1}
    />
  );
}

export function TrainingSetup({
  scorePercentile,
  showLastRunPlacementCard,
  gameMode,
  setGameMode,
  lessonId,
  setLessonId,
  lessons,
  lessonsLocked,
  showAdvanced,
  setShowAdvanced,
  setCustomRangesTouched,
  operationRanges,
  updateRange,
  operations,
  selectedOperations,
  toggleOperation,
  difficulty,
  setDifficulty,
  difficultyConfig,
  timedModeLimits,
  timedModeLimit,
  setTimedModeLimit,
  practiceTimerOptions,
  practiceTimerLimit,
  setPracticeTimerLimit,
  practiceSetSizes,
  practiceSetSize,
  setPracticeSetSize,
  submitMode,
  setSubmitMode,
  formatTime,
  startTraining,
  review,
  onStartReview,
  daily,
  onStartDaily,
  preferencesReady,
}: {
  scorePercentile: ScoreDistribution | null;
  showLastRunPlacementCard: boolean;
  gameMode: GameMode;
  setGameMode: (m: GameMode) => void;
  lessonId: LessonId;
  setLessonId: (id: LessonId) => void;
  lessons: LessonsSummary | null;
  lessonsLocked: boolean;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  setCustomRangesTouched: (v: boolean) => void;
  operationRanges: OperationRanges;
  updateRange: (op: Operation, field: "min" | "max", value: number) => void;
  operations: { op: Operation; label: string }[];
  selectedOperations: Operation[];
  toggleOperation: (op: Operation) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  difficultyConfig: Record<Difficulty, DifficultySettings>;
  timedModeLimits: number[];
  timedModeLimit: number;
  setTimedModeLimit: (t: number) => void;
  practiceTimerOptions: number[];
  practiceTimerLimit: number;
  setPracticeTimerLimit: (t: number) => void;
  practiceSetSizes: number[];
  practiceSetSize: number;
  setPracticeSetSize: (size: number) => void;
  submitMode: SubmitMode;
  setSubmitMode: (m: SubmitMode) => void;
  formatTime: (seconds: number) => string;
  startTraining: () => void;
  review: ReviewSummary | null;
  onStartReview: () => void;
  /** Signed in: today's session, shown above the setup. */
  daily: DailySummary | null;
  onStartDaily: () => void;
  preferencesReady: boolean;
}) {
  const [settingsOpenState, setSettingsOpen] = useState(false);
  // Lessons have no session settings: the lesson sets the problems.
  const isLearning = gameMode === "learning";
  const settingsOpen = settingsOpenState && !isLearning;
  const lesson = getLesson(lessonId)!;
  const lessonLocked = lessonsLocked && !isFreeLesson(lesson.id);
  const introRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // Opening settings brings the whole panel into view: on desktop its bottom sits below the
  // fold, and on phones it stacks under the quick-start card. Scroll only as far as needed.
  useEffect(() => {
    if (!settingsOpen) return;
    const panel = settingsPanelRef.current;
    if (!panel) return;
    // Layout position (offsetTop ignores the morph's in-flight transforms).
    let top = 0;
    for (let node: HTMLElement | null = panel; node; node = node.offsetParent as HTMLElement | null) {
      top += node.offsetTop;
    }
    const headerHeight = window.matchMedia("(min-width: 768px)").matches ? 64 : 56;
    const bottomFits = top + panel.offsetHeight - window.innerHeight + 24;
    const topFits = top - headerHeight - 16;
    const target = Math.min(bottomFits, topFits);
    if (target > window.scrollY) {
      window.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }, [settingsOpen, reduceMotion]);
  const selectedOpsLabel = selectedOperations.join(" ");

  return (
    <LayoutGroup>
    {/* The quick-start column keeps one width (36rem) open or closed, so opening settings only
        slides it left; a resize would scale-distort its text mid-animation. */}
    <div className={cn("mx-auto grid gap-6", settingsOpen ? "max-w-5xl lg:grid-cols-[36rem_minmax(0,1fr)]" : "max-w-xl")}>
      {/* Left: Quick start — one grey grouped card, then the single orange action. */}
      <motion.div layout="position" transition={settingsOpen ? morphSpring : closeSpring} className="min-w-0 space-y-6">
        {daily && <TodayCard daily={daily} onStart={onStartDaily} />}
        <section aria-label="Quick start">
          <div className="space-y-5 rounded-[26px] bg-secondary p-4 sm:p-5">
            <Tabs value={gameMode} onValueChange={(v) => setGameMode(v as GameMode)}>
              <TabsList className="w-full">
                <TabsTrigger value="timed" className="flex-1">
                  Timed
                </TabsTrigger>
                <TabsTrigger value="practice" className="flex-1">
                  Practice
                </TabsTrigger>
                <TabsTrigger value="learning" className="flex-1">
                  Learning
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <p className="px-1 text-[15px] leading-6 text-muted-foreground">{modeDescription(gameMode)}</p>

            {isLearning && (
              <div ref={introRef} className="scroll-mt-20">
                <LessonIntro lesson={lesson} locked={lessonLocked} progress={lessons?.progress[lesson.id]} />
              </div>
            )}

            {/* Settings summary: a white row inside the grey group, like Kurb's detail rows. */}
            {!isLearning && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-background py-2 pl-4 pr-2">
              <div className="min-w-0">
                <p className="text-[13px] text-muted-foreground">Settings</p>
                <p className="truncate text-[15px] font-medium tabular-nums">
                  <span className="capitalize">{showAdvanced ? "Custom ranges" : difficulty}</span>
                  {" · "}
                  {gameMode === "timed"
                    ? formatTime(timedModeLimit)
                    : `${practiceSetSize} problems${practiceTimerLimit > 0 ? ` · ${practiceTimerLimit}s each` : ""}`}
                  {" · "}
                  {selectedOpsLabel}
                </p>
              </div>

              {/* One button that stays put; only its label swaps (Edit / Done). Closed, its
                  background is the morph anchor: the settings panel grows out of it and
                  shrinks back into it, so nothing is left over at the end of the close. */}
              <button
                type="button"
                onClick={() => setSettingsOpen((open) => !open)}
                aria-expanded={settingsOpen}
                aria-controls="training-session-settings"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "group relative isolate min-h-10 min-w-[4.75rem] shrink-0 overflow-visible bg-transparent hover:bg-transparent",
                )}
              >
                {settingsOpen ? (
                  <span aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-secondary transition-colors group-hover:bg-accent" />
                ) : (
                  <motion.span
                    aria-hidden="true"
                    layoutId="session-settings-morph"
                    layoutCrossfade={false}
                    transition={closeSpring}
                    style={{ borderRadius: 20 }}
                    className="absolute inset-0 -z-10 bg-secondary transition-colors group-hover:bg-accent"
                  />
                )}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={settingsOpen ? "done" : "edit"}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                  >
                    {settingsOpen ? "Done" : "Edit"}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
            )}

            {gameMode === "practice" && review && <ReviewRow review={review} onStart={onStartReview} />}

            <fieldset className="space-y-2" aria-describedby="answer-submission-help">
              <legend className="px-1 text-[13px] text-muted-foreground">Answer submission</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "auto", label: "Auto-submit", Icon: Wand2 },
                  { value: "manual", label: "Manual submit", Icon: CornerDownLeft },
                ] as const).map(({ value, label, Icon }) => (
                  <label key={value} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="answer-submission"
                      value={value}
                      checked={submitMode === value}
                      onChange={() => setSubmitMode(value)}
                      className="peer sr-only"
                    />
                    <span className={cn(
                      "relative isolate flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-background py-2 text-[15px] font-medium transition-colors duration-200 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                      submitMode === value ? "text-background" : "text-foreground hover:bg-accent",
                    )}>
                      {submitMode === value && <SelectionPill group="setup-answer-mode" />}
                      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                      {label}
                    </span>
                  </label>
                ))}
              </div>
              <p id="answer-submission-help" className="px-1 text-[13px] leading-5 text-muted-foreground">
                {submitMode === "manual"
                  ? "Press Enter or tap Submit. Correct and incorrect answers count toward accuracy."
                  : "Advances when correct. Choose Manual submit to measure accuracy."}
              </p>
            </fieldset>

          </div>

          {/* The one orange action on the page. */}
          <div className="mt-5 space-y-3">
            {isLearning && lessonLocked ? (
              <Link
                href={getUpgradeUrl({ feature: "lessons", source: "lesson_setup" })}
                onClick={() =>
                  captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
                    feature: "lessons",
                    surface: "lesson_setup",
                    action: "open_pricing",
                    lesson_id: lesson.id,
                  })
                }
                className={cn(buttonVariants({ variant: "brand", size: "lg" }), "h-14 w-full text-[17px]")}
              >
                <Lock aria-hidden="true" className="h-4 w-4" />
                Unlock this lesson with Pro
              </Link>
            ) : (
              <Button onClick={startTraining} disabled={!preferencesReady} variant="brand" size="lg" className="h-14 w-full text-[17px]">
                {isLearning ? "Start lesson" : "Start"}
                <Play aria-hidden="true" className="h-4 w-4 fill-current" />
              </Button>
            )}
            <Link
              href="/training/weak-points"
              className="flex items-center justify-center gap-1.5 py-1 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Target aria-hidden="true" className="h-4 w-4" />
              Train your weak points
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[12px] font-semibold text-foreground">Pro</span>
            </Link>

            {showLastRunPlacementCard && scorePercentile && (
              <ScoreDistributionCard
                data={scorePercentile}
                heading="Your placement (last run)"
                scoreLabel="Best score:"
              />
            )}
          </div>
        </section>

        {isLearning && (
          <LessonList
            selected={lessonId}
            onSelect={(id) => {
              setLessonId(id);
              // On phones the list sits below the lesson: bring the lesson back into view.
              const intro = introRef.current;
              if (intro && intro.getBoundingClientRect().top < 64) {
                intro.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
              }
            }}
            lessons={lessons}
            locked={lessonsLocked}
          />
        )}

        {/* The quant lessons live on their own page; Learning is where people look for lessons. */}
        {isLearning && (
          <Link
            href="/quant"
            className="flex items-center justify-between gap-3 rounded-[22px] bg-secondary px-4 py-3.5 transition-colors hover:bg-control-hover"
          >
            <span className="min-w-0">
              <span className="block text-[15px] font-medium">Quant lessons</span>
              <span className="block text-[13px] text-muted-foreground">Probability, expected value and betting maths</span>
            </span>
            <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}
      </motion.div>

      {/* Right: Settings — grows out of the Edit button's background (shared layoutId). On
          close it unmounts and that background shrinks back from the panel's box. */}
      {settingsOpen ? (
        <motion.section
          ref={settingsPanelRef}
          id="training-session-settings"
          layoutId="session-settings-morph"
          layoutCrossfade={false}
          transition={morphSpring}
          style={{ borderRadius: 26 }}
          className="min-w-0 overflow-hidden bg-secondary p-4 sm:p-5"
        >
        {/* `layout` counter-scales the content while the surface morphs; it fades in once the
            shape has mostly formed. */}
        <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={morphContentIn}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SectionLabel>Session settings</SectionLabel>
              <p className="mt-1 text-sm text-muted-foreground">
                {showAdvanced ? "Custom ranges enabled." : "Difficulty presets enabled."}{" "}
                <span className="font-mono tabular-nums">{selectedOpsLabel}</span>
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close session settings"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-5 space-y-6">
            {/* Operations */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-medium">Operations</div>
                <div className="text-xs text-muted-foreground">Select multiple</div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {operations.map(({ op, label }) => {
                  const isSelected = selectedOperations.includes(op);
                  return (
                    <button
                      key={op}
                      type="button"
                      onClick={() => toggleOperation(op)}
                      aria-pressed={isSelected}
                      // Multi-select: chosen operations lift to white; ink is for single choices.
                      className={cn(
                        "rounded-2xl px-3 py-3 text-center transition-colors",
                        isSelected
                          ? "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                          : "bg-control text-muted-foreground hover:bg-control-hover",
                      )}
                    >
                      <div className="font-mono text-2xl font-semibold">{op}</div>
                      <div className="text-xs text-muted-foreground">
                        {label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty */}
            {!showAdvanced && (
              <div className="space-y-2 border-t border-border pt-5">
                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-medium">Difficulty</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    Affects number range
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["easy", "medium", "hard", "expert"] as Difficulty[]).map((d) => {
                    const cfg = difficultyConfig[d];
                    const isSelected = difficulty === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        aria-pressed={isSelected}
                        className={tileClass(isSelected, "text-center", { slidingPill: true })}
                      >
                        {isSelected && <SelectionPill group="setup-difficulty" />}
                        <div className="text-sm font-medium capitalize">{d}</div>
                        <div className={cn("mt-0.5 text-[10px]", isSelected ? "text-background/70" : "text-muted-foreground")}>
                          +/− ≤{cfg.addSubMax}, × ≤{cfg.mulWideMax}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timers */}
            {gameMode === "timed" && (
              <div className="space-y-2 border-t border-border pt-5">
                <div className="text-sm font-medium">Session duration</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {timedModeLimits.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setTimedModeLimit(time)}
                      aria-pressed={timedModeLimit === time}
                      className={tileClass(timedModeLimit === time, "py-2 text-center font-mono text-sm", { slidingPill: true })}
                    >
                      {timedModeLimit === time && <SelectionPill group="setup-duration" />}
                      {formatTime(time)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameMode === "practice" && (
              <div className="space-y-2 border-t border-border pt-5">
                <div className="text-sm font-medium">Problems per set</div>
                <div className="grid grid-cols-3 gap-2">
                  {practiceSetSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPracticeSetSize(size)}
                      aria-pressed={practiceSetSize === size}
                      className={tileClass(practiceSetSize === size, "py-2 text-center text-sm tabular-nums", { slidingPill: true })}
                    >
                      {practiceSetSize === size && <SelectionPill group="setup-set-length" />}
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameMode === "practice" && (
              <div className="space-y-2 border-t border-border pt-5">
                <div className="text-sm font-medium">Time per question</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {practiceTimerOptions.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setPracticeTimerLimit(time)}
                      aria-pressed={practiceTimerLimit === time}
                      className={tileClass(practiceTimerLimit === time, "py-2 text-center font-mono text-sm", { slidingPill: true })}
                    >
                      {practiceTimerLimit === time && <SelectionPill group="setup-question-timer" />}
                      {time === 0 ? "Off" : `${time}s`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom ranges */}
            <div className="space-y-3 border-t border-border pt-5">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between text-left transition-colors hover:text-foreground"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Settings className="h-4 w-4" />
                  Custom ranges
                </span>
                {showAdvanced ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {showAdvanced && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">Overrides difficulty presets.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdvanced(false);
                        setCustomRangesTouched(false);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Use presets
                    </button>
                  </div>

                  <div className="space-y-3">
                    {operations.map(({ op, label }) => (
                      <div key={op} className="flex items-center gap-3">
                        <span className="w-20 text-sm font-medium">{label}</span>
                        <div className="flex items-center gap-2 flex-1">
                          <RangeInput
                            value={operationRanges[op].min}
                            onCommit={(value) => updateRange(op, "min", value)}
                            label={`${label} minimum`}
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <RangeInput
                            value={operationRanges[op].max}
                            onCommit={(value) => updateRange(op, "max", value)}
                            label={`${label} maximum`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
        </motion.section>
      ) : null}
    </div>
    </LayoutGroup>
  );
}
