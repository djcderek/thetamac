"use client";

import type { FormEvent, RefObject } from "react";
import { useLayoutEffect } from "react";
import { motion, useAnimate } from "motion/react";
import { runEnter } from "@/lib/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MetricTile, SectionLabel } from "@/components/ui/visual-system";
import { cn } from "@/lib/utils";
import type { GameMode, MathTip, Problem, SubmitMode } from "@/components/training/training-types";
import {
  ArrowRight,
  Eye,
  EyeOff,
  RotateCcw,
  Square,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function TrainingRun({
  gameMode,
  submitMode,
  showAdvanced,
  difficultyLabel,
  difficultyBadgeClassName,
  showTip,
  setShowTip,
  tipExpanded,
  setTipExpanded,
  currentTip,
  hasAnswered,
  totalSolved,
  streak,
  accuracy,
  avgTimeSeconds,
  timeLeft,
  practiceTimerLimit,
  overallTimeLeft,
  timedModeLimit,
  formatTime,
  timerAndProblemRef,
  feedbackKey,
  correctFlashKey,
  isCorrect,
  problem,
  useCustomKeypad,
  answerInputDisabled,
  userAnswer,
  setUserAnswer,
  inputRef,
  onSubmit,
  onStop,
  onSkip,
  onNextProblem,
}: {
  gameMode: GameMode;
  submitMode: SubmitMode;
  showAdvanced: boolean;
  difficultyLabel: string;
  difficultyBadgeClassName: string;
  showTip: boolean;
  setShowTip: (v: boolean) => void;
  tipExpanded: boolean;
  setTipExpanded: (v: boolean) => void;
  currentTip: MathTip | null;
  hasAnswered: boolean;
  totalSolved: number;
  streak: number;
  accuracy: number;
  avgTimeSeconds: number;
  timeLeft: number;
  practiceTimerLimit: number;
  overallTimeLeft: number;
  timedModeLimit: number;
  formatTime: (seconds: number) => string;
  timerAndProblemRef: RefObject<HTMLDivElement | null>;
  feedbackKey: number;
  correctFlashKey: number;
  isCorrect: boolean | null;
  problem: Problem | null;
  useCustomKeypad: boolean;
  answerInputDisabled: boolean;
  userAnswer: string;
  setUserAnswer: (v: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (e: FormEvent) => void;
  onStop: () => void;
  onSkip: () => void;
  onNextProblem: () => void;
}) {
  const metricClass = "pt-2 sm:pt-3 [&>div]:mt-1 [&>div]:text-xl sm:[&>div]:mt-2 sm:[&>div]:text-3xl";
  const metricCount = 1 + Number(gameMode !== "timed") + Number(submitMode === "manual") + Number(gameMode !== "learning");
  // Fade the problem in only when it changes. The card remounts on every answer (to replay
  // the correct/wrong feedback), so a mount animation would also replay on the old problem.
  const [problemScope, animateProblem] = useAnimate<HTMLDivElement>();
  const problemKey = problem ? `${problem.a}${problem.operation}${problem.b}` : "";
  // Layout effect: start from opacity 0 before the new text is painted, so it can't flash.
  useLayoutEffect(() => {
    if (!problemKey || !problemScope.current) return;
    animateProblem(problemScope.current, { opacity: [0, 1], y: [6, 0] }, { duration: 0.09, ease: "easeOut" });
  }, [problemKey, animateProblem, problemScope]);

  return (
    // Entering a run: the screen rises in quickly and the problem card lands a beat after,
    // with no overshoot. Short enough that the first problem is readable almost at once.
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={runEnter}
      className="space-y-3 sm:space-y-6"
    >
      {/* Status row: mode in plain text, time and Stop as grey pills. */}
      <div ref={timerAndProblemRef} className="scroll-mt-16 pt-1 sm:pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[15px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              {gameMode === "learning" ? "Learning" : gameMode === "timed" ? "Timed" : "Practice"}
            </span>
            {" · "}
            {!showAdvanced ? (
              <span className={difficultyBadgeClassName}>{difficultyLabel}</span>
            ) : (
              "Custom ranges"
            )}
            {submitMode === "auto" && <span className="hidden sm:inline"> · Auto-submit</span>}
          </p>

          <div className="flex shrink-0 items-center gap-2">
            {gameMode === "learning" ? (
              <Button variant="ghost" size="sm" onClick={() => setShowTip(!showTip)} className="min-h-10">
                {showTip ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                {showTip ? "Hide tips" : "Show tips"}
              </Button>
            ) : (
              <div
                role="timer"
                aria-label="Time left"
                className={cn(
                  "min-w-[4.5rem] rounded-full bg-secondary px-4 py-1.5 text-center text-[19px] font-semibold tabular-nums tracking-tight",
                  gameMode === "timed" && overallTimeLeft <= 10 && "bg-destructive/10 text-destructive",
                )}
              >
                {gameMode === "practice" ? `${timeLeft}s` : formatTime(overallTimeLeft)}
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={onStop} className="min-h-10">
              <Square aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
              Stop
            </Button>
          </div>
        </div>

        {gameMode === "practice" ? (
          <Progress value={(timeLeft / practiceTimerLimit) * 100} className="mt-3 h-1" />
        ) : gameMode === "timed" ? (
          <Progress value={(overallTimeLeft / timedModeLimit) * 100} className="mt-3 h-1" />
        ) : null}
      </div>

      {/* Technique - Before problem in Learning mode */}
      {gameMode === "learning" && showTip && currentTip && !hasAnswered && (
        <div className="rounded-[22px] bg-secondary p-4">
          <button
            onClick={() => setTipExpanded(!tipExpanded)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <SectionLabel>Technique</SectionLabel>
              <span className="mt-1 block font-medium">{currentTip.title}</span>
            </div>
            {tipExpanded ? (
              <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
            )}
          </button>

          {tipExpanded && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium">{currentTip.technique}</p>
              <p className="text-sm leading-6 text-muted-foreground">{currentTip.description}</p>
            </div>
          )}
        </div>
      )}

      {/* Problem Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={runEnter}
      >
      <Card
        key={feedbackKey}
        className={cn(
          // Feedback as an inset ring: the grouped surface has no border to color.
          "relative rounded-[28px] py-6 transition-shadow duration-200 sm:py-10",
          isCorrect === true && "ring-2 ring-inset ring-success/50 animate-pulse-success",
          isCorrect === false && "ring-2 ring-inset ring-destructive/50 animate-shake"
        )}
      >
        {correctFlashKey > 0 && (
          <span
            key={correctFlashKey}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[28px] ring-2 ring-inset ring-success/50 animate-flash-out"
          />
        )}
        <CardContent className="p-3 sm:p-12">
          {problem && (
            <div className="text-center">
              {/* A new problem lifts in fast enough to read straight away (this is a speed
                  drill); see the effect above. */}
              <div
                ref={problemScope}
                data-problem
                className="mb-5 break-words font-mono text-[44px] font-semibold leading-none tracking-[-0.04em] sm:mb-10 sm:text-[80px]"
              >
                {problem.a} {problem.operation} {problem.b}
              </div>

              {/* Answer and Submit stack in one column at the same width. */}
              <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-[280px] flex-col gap-2">
                {useCustomKeypad ? (
                  <div
                    role="textbox"
                    aria-label="Answer"
                    aria-readonly="true"
                    className={`flex h-16 w-full items-center justify-center rounded-2xl bg-background px-3 text-center font-mono text-3xl font-semibold ${
                      answerInputDisabled ? "opacity-50" : ""
                    }`}
                  >
                    {userAnswer.length > 0 ? userAnswer : "?"}
                  </div>
                ) : (
                  <Input
                    ref={inputRef}
                    type="number"
                    aria-label="Answer"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value.replace(/[^0-9\-]/g, ""))}
                    placeholder="?"
                    className="h-16 w-full rounded-2xl bg-background text-center font-mono text-3xl font-semibold focus:placeholder:text-transparent md:text-3xl"
                    autoFocus
                    disabled={gameMode === "learning" && hasAnswered}
                  />
                )}
                {submitMode === "manual" && !useCustomKeypad && (
                  <Button type="submit" variant="brand" size="lg" disabled={hasAnswered || !userAnswer || userAnswer === "-"} className="w-full">
                    Submit
                  </Button>
                )}
              </form>

              {isCorrect === false && gameMode === "practice" && (
                <p className="text-sm text-muted-foreground mt-4">
                  Answer: <span className="font-mono font-medium text-foreground">{problem.answer}</span>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Solution Breakdown - After answering in Learning mode */}
      {gameMode === "learning" && hasAnswered && currentTip && (
        <Card className={isCorrect ? "ring-2 ring-success/40" : "ring-2 ring-destructive/40"}>
          <CardContent className="p-5">
            <div className="space-y-4">
              {/* Result header */}
              <div className="flex items-center gap-2.5">
                {isCorrect ? (
                  <>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-2xl border-2 border-success font-mono text-sm font-semibold text-success">
                      =
                    </span>
                    <span className="font-medium text-success">Correct!</span>
                  </>
                ) : (
                  <>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-2xl border-2 border-destructive font-mono text-sm font-semibold text-destructive">
                      ≠
                    </span>
                    <span className="font-medium text-destructive">
                      Incorrect — Answer: <span className="font-mono">{problem?.answer}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Step-by-step breakdown */}
              <div className="space-y-2">
                <SectionLabel>Step-by-step</SectionLabel>
                <h4 className="text-sm font-medium">{currentTip.title}</h4>
                <div className="space-y-2">
                  {currentTip.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-2xl border border-border font-mono text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="font-mono text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next button */}
              <Button onClick={onNextProblem} className="w-full mt-2">
                Next Problem
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {gameMode !== "learning" && hasAnswered && (
        <Button onClick={onNextProblem} className="w-full">
          Next Problem
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}

      {/* Stats arrive just after the card, so the screen builds top-down. */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...runEnter, delay: 0.08 }}
        className={`grid gap-4 ${
          metricCount === 4 ? "grid-cols-4" : metricCount === 3 ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <MetricTile label="Solved" value={totalSolved} className={metricClass} />

        {gameMode !== "timed" && <MetricTile label="Streak" value={streak} className={metricClass} />}

        {submitMode === "manual" && <MetricTile label="Accuracy" value={`${accuracy}%`} className={metricClass} />}

        {gameMode !== "learning" && (
          <MetricTile label="Avg time" value={`${avgTimeSeconds > 0 ? avgTimeSeconds.toFixed(1) : "0"}s`} className={metricClass} />
        )}
      </motion.div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {!hasAnswered && gameMode !== "timed" && (
          <Button variant="outline" onClick={onSkip} className="min-h-11">
            <RotateCcw className="w-4 h-4 mr-2" />
            Skip
          </Button>
        )}
      </div>
    </motion.div>
  );
}
