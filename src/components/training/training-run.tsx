"use client";

import type { FormEvent, RefObject } from "react";
import { useLayoutEffect } from "react";
import { motion, useAnimate } from "motion/react";
import { runEnter } from "@/lib/motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MetricTile } from "@/components/ui/visual-system";
import { cn } from "@/lib/utils";
import type { GameMode, MathTip, PracticeProgress, Problem, SubmitMode } from "@/components/training/training-types";
import type { LessonStep } from "@/lib/lessons";
import { ArrowRight, Eye } from "lucide-react";

export function TrainingRun({
  gameMode,
  submitMode,
  showAdvanced,
  difficultyLabel,
  difficultyBadgeClassName,
  currentTip,
  lessonTitle,
  lessonSteps,
  hasAnswered,
  totalSolved,
  streak,
  accuracy,
  avgTimeSeconds,
  timeLeft,
  practiceTimerLimit,
  practiceProgress,
  practiceMissed,
  onRevealAnswer,
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
  onNextProblem,
}: {
  gameMode: GameMode;
  submitMode: SubmitMode;
  showAdvanced: boolean;
  difficultyLabel: string;
  difficultyBadgeClassName: string;
  currentTip: MathTip | null;
  /** In a lesson: its title, and on guided problems the steps (the last result left out). */
  lessonTitle: string | null;
  lessonSteps: LessonStep[] | null;
  hasAnswered: boolean;
  totalSolved: number;
  streak: number;
  accuracy: number;
  avgTimeSeconds: number;
  timeLeft: number;
  practiceTimerLimit: number;
  practiceProgress: PracticeProgress | null;
  practiceMissed: boolean;
  onRevealAnswer: () => void;
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
  onNextProblem: () => void;
}) {
  const metricClass = "pt-2 sm:pt-3 [&>div]:mt-1 [&>div]:text-xl sm:[&>div]:mt-2 sm:[&>div]:text-3xl";
  // Practice and lessons run as sets: progress through the set, misses coming back.
  const isSet = practiceProgress !== null;
  const metricCount = isSet ? 3 : 2 + Number(submitMode === "manual");
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
      // Leaving (Stop or time up): the run sinks back and fades before the results arrive.
      exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
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
            {/* On phones the coming-back count replaces the difficulty, so it isn't truncated. */}
            <span className={cn(isSet && (practiceProgress?.waiting ?? 0) > 0 && "hidden sm:inline")}>
              {" · "}
              {lessonTitle ?? (!showAdvanced ? (
                <span className={difficultyBadgeClassName}>{difficultyLabel}</span>
              ) : (
                "Custom ranges"
              ))}
            </span>
            {isSet && practiceProgress && practiceProgress.waiting > 0 ? (
              <span> · {practiceProgress.waiting} coming back</span>
            ) : (
              submitMode === "auto" && <span className="hidden sm:inline"> · Auto-submit</span>
            )}
          </p>

          <div className="flex shrink-0 items-center gap-2">
            {isSet ? (
              <>
                {practiceTimerLimit > 0 && (
                  <div
                    role="timer"
                    aria-label="Time left for this problem"
                    className={cn(
                      "min-w-[3.5rem] rounded-full bg-secondary px-3 py-1.5 text-center text-[19px] font-semibold tabular-nums tracking-tight",
                      !practiceMissed && timeLeft <= 3 && "bg-destructive/10 text-destructive",
                    )}
                  >
                    {practiceMissed ? "–" : `${timeLeft}s`}
                  </div>
                )}
                {practiceProgress && (
                  <div
                    aria-label={`${practiceProgress.cleared} of ${practiceProgress.size} done`}
                    className="rounded-full bg-secondary px-4 py-1.5 text-center text-[19px] font-semibold tabular-nums tracking-tight"
                  >
                    {practiceProgress.cleared}
                    <span className="text-muted-foreground">/{practiceProgress.size}</span>
                  </div>
                )}
              </>
            ) : (
              <div
                role="timer"
                aria-label="Time left"
                className={cn(
                  "min-w-[4.5rem] rounded-full bg-secondary px-4 py-1.5 text-center text-[19px] font-semibold tabular-nums tracking-tight",
                  overallTimeLeft <= 10 && "bg-destructive/10 text-destructive",
                )}
              >
                {formatTime(overallTimeLeft)}
              </div>
            )}
            {/* Stop fills with ink on hover (it ends the run) and its square tightens on press. */}
            <Button
              variant="secondary"
              size="sm"
              onClick={onStop}
              className="group min-h-10 hover:bg-foreground hover:text-background active:scale-95"
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-[3px] bg-current transition-[transform,border-radius] duration-200 ease-out group-hover:rounded-[4px] group-active:scale-75"
              />
              Stop
            </Button>
          </div>
        </div>

        {isSet ? (
          <Progress value={practiceProgress ? (practiceProgress.cleared / practiceProgress.size) * 100 : 0} className="mt-3 h-1" />
        ) : gameMode === "timed" ? (
          <Progress value={(overallTimeLeft / timedModeLimit) * 100} className="mt-3 h-1" />
        ) : null}
      </div>

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
              {isSet && (practiceProgress?.isReturn || lessonSteps) && (
                <p className="mb-3 text-[13px] font-medium text-muted-foreground sm:mb-5">
                  {practiceProgress?.isReturn ? "Back again" : "With the steps"}
                </p>
              )}
              {/* A new problem lifts in fast enough to read straight away (this is a speed
                  drill); see the effect above. */}
              <div
                ref={problemScope}
                data-problem
                className="mb-5 break-words font-mono text-[44px] font-semibold leading-none tracking-[-0.04em] sm:mb-10 sm:text-[80px]"
              >
                {problem.a} {problem.operation} {problem.b}
              </div>

              {/* A guided lesson problem: the trick worked through, with the last step left
                  for the player. */}
              {lessonSteps && (
                <ol
                  aria-label="Steps"
                  className="mx-auto mb-5 max-w-sm space-y-1.5 rounded-2xl bg-background px-4 py-3 text-left sm:mb-8"
                >
                  {lessonSteps.map((step, index) => (
                    <motion.li
                      key={`${problemKey}-${index}`}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...runEnter, delay: 0.05 + index * 0.07 }}
                      className="flex items-baseline justify-between gap-3 text-[15px]"
                    >
                      <span className="min-w-0 text-muted-foreground">{step.label}</span>
                      <span className="shrink-0 font-mono font-semibold tabular-nums">
                        {step.work} = {index === lessonSteps.length - 1 ? "?" : step.result}
                      </span>
                    </motion.li>
                  ))}
                </ol>
              )}

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
                  />
                )}
                {submitMode === "manual" && !useCustomKeypad && (
                  <Button type="submit" variant="brand" size="lg" disabled={hasAnswered || !userAnswer || userAnswer === "-"} className="w-full">
                    Submit
                  </Button>
                )}
              </form>

              {/* A miss shows the answer and how to get it; typing it moves on. */}
              {isSet && practiceMissed && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={runEnter}
                  className="mx-auto mt-4 max-w-sm rounded-2xl bg-background px-4 py-3 text-left sm:mt-6"
                >
                  <p className="text-[15px]">
                    Answer <span className="font-mono font-semibold">{problem.answer}</span>
                    <span className="text-muted-foreground"> · type it to continue</span>
                  </p>
                  {currentTip && (
                    <>
                      <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                        <span className="font-medium text-foreground">{currentTip.title}.</span> {currentTip.technique}
                      </p>
                      {currentTip.steps.length > 1 && (
                        <ol className="mt-2 space-y-1 font-mono text-[13px] leading-5 text-muted-foreground">
                          {currentTip.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {hasAnswered && (
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
        {isSet ? (
          <MetricTile label="First try" value={practiceProgress?.firstTry ?? 0} className={metricClass} />
        ) : (
          <MetricTile label="Solved" value={totalSolved} className={metricClass} />
        )}

        {isSet && <MetricTile label="Streak" value={streak} className={metricClass} />}

        {!isSet && submitMode === "manual" && <MetricTile label="Accuracy" value={`${accuracy}%`} className={metricClass} />}

        <MetricTile label="Avg time" value={`${avgTimeSeconds > 0 ? avgTimeSeconds.toFixed(1) : "0"}s`} className={metricClass} />
      </motion.div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        {/* Not knowing it counts as a miss: the answer shows and the problem comes back. */}
        {!hasAnswered && isSet && !practiceMissed && (
          <Button variant="outline" onClick={onRevealAnswer} className="min-h-11">
            <Eye className="w-4 h-4 mr-2" />
            Show answer
          </Button>
        )}
      </div>
    </motion.div>
  );
}
