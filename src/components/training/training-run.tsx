"use client";

import type { FormEvent, RefObject } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { GameMode, MathTip, Problem, SubmitMode } from "@/components/training/training-types";
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lightbulb,
  RotateCcw,
  Square,
  Timer,
  Zap,
  ChevronDown,
  ChevronUp,
  Sparkles,
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
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Status strip (mode + difficulty + timer) */}
      <div ref={timerAndProblemRef} className="scroll-mt-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {gameMode === "learning" ? (
                <GraduationCap className="w-4 h-4 text-amber-500" />
              ) : gameMode === "timed" ? (
                <Zap className="w-4 h-4 text-primary" />
              ) : (
                <Timer className="w-4 h-4 text-primary" />
              )}
              <span className="text-sm font-medium">
                {gameMode === "learning" ? "Learning" : gameMode === "timed" ? "Timed" : "Practice"}
              </span>

              {!showAdvanced ? (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${difficultyBadgeClassName}`}
                >
                  {difficultyLabel}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-border bg-background/40 text-muted-foreground">
                  Custom ranges
                </span>
              )}

              {submitMode === "auto" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-border bg-background/40 text-muted-foreground">
                  Auto-submit
                </span>
              ) : null}
            </div>

            {gameMode === "learning" ? (
              <button
                onClick={() => setShowTip(!showTip)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showTip ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showTip ? "Hide tips" : "Show tips"}
              </button>
            ) : (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Time remaining</div>
                <div
                  className={cn(
                    "font-mono text-lg font-semibold tabular-nums",
                    gameMode === "timed" && overallTimeLeft <= 10 ? "text-destructive" : ""
                  )}
                >
                  {gameMode === "practice" ? `${timeLeft}s` : formatTime(overallTimeLeft)}
                </div>
              </div>
            )}
          </div>

          {gameMode === "practice" ? (
            <div className="mt-3">
              <Progress value={(timeLeft / practiceTimerLimit) * 100} className="h-1.5" />
            </div>
          ) : gameMode === "timed" ? (
            <div className="mt-3">
              <Progress value={(overallTimeLeft / timedModeLimit) * 100} className="h-2" />
            </div>
          ) : (
            <div className="mt-3 text-xs text-muted-foreground">No timer in learning mode</div>
          )}
        </div>
      </div>

      {/* Tip Card - Before problem in Learning mode */}
      {gameMode === "learning" && showTip && currentTip && !hasAnswered && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <button
              onClick={() => setTipExpanded(!tipExpanded)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-amber-900 dark:text-amber-100">
                  {currentTip.title}
                </span>
              </div>
              {tipExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {tipExpanded && (
              <div className="mt-3 space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-amber-800 dark:text-amber-200 font-medium">{currentTip.technique}</p>
                </div>
                <p className="text-sm text-muted-foreground pl-6">{currentTip.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Problem Display */}
      <Card
        key={feedbackKey}
        className={cn(
          "transition-all duration-200",
          isCorrect === true && "border-success animate-pulse-success",
          isCorrect === false && "border-destructive animate-shake"
        )}
      >
        <CardContent className="p-6 sm:p-12">
          {problem && (
            <div className="text-center">
              <div className="text-4xl sm:text-6xl font-mono font-semibold tracking-wide mb-5 sm:mb-8">
                {problem.a} {problem.operation} {problem.b}
              </div>

              <form onSubmit={onSubmit}>
                {useCustomKeypad ? (
                  <div
                    role="textbox"
                    aria-label="Answer"
                    aria-readonly="true"
                    className={`h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono max-w-[200px] mx-auto rounded-md border border-input bg-background px-3 flex items-center justify-center ${
                      answerInputDisabled ? "opacity-50" : ""
                    }`}
                  >
                    {userAnswer.length > 0 ? userAnswer : "?"}
                  </div>
                ) : (
                  <Input
                    ref={inputRef}
                    type="number"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value.replace(/[^0-9\-]/g, ""))}
                    placeholder="?"
                    className="h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono max-w-[200px] mx-auto"
                    autoFocus
                    disabled={gameMode === "learning" && hasAnswered}
                  />
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

      {/* Solution Breakdown - After answering in Learning mode */}
      {gameMode === "learning" && hasAnswered && currentTip && (
        <Card className={`${isCorrect ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}`}>
          <CardContent className="p-5">
            <div className="space-y-4">
              {/* Result header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCorrect ? (
                    <>
                      <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                        <span className="text-success text-sm">✓</span>
                      </div>
                      <span className="font-medium text-success">Correct!</span>
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                        <span className="text-destructive text-sm">✗</span>
                      </div>
                      <span className="font-medium text-destructive">
                        Incorrect — Answer: <span className="font-mono">{problem?.answer}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Step-by-step breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Step-by-Step: {currentTip.title}
                </h4>
                <div className="space-y-2 pl-6">
                  {currentTip.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs font-medium shrink-0">
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

      {/* Stats */}
      <div
        className={`grid gap-4 ${
          submitMode === "auto"
            ? "grid-cols-2 sm:grid-cols-3"
            : gameMode === "learning"
              ? "grid-cols-3"
              : gameMode === "timed"
                ? "grid-cols-2 sm:grid-cols-3"
                : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <p className="text-2xl font-mono font-semibold">{totalSolved}</p>
          <p className="text-xs text-muted-foreground">Solved</p>
        </div>

        {gameMode !== "timed" && (
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-2xl font-mono font-semibold">{streak}</p>
            <p className="text-xs text-muted-foreground">Streak</p>
          </div>
        )}

        {submitMode === "manual" && (
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-2xl font-mono font-semibold">{accuracy}%</p>
            <p className="text-xs text-muted-foreground">Accuracy</p>
          </div>
        )}

        {gameMode !== "learning" && (
          <div className="text-center p-3 rounded-lg bg-secondary/50">
            <p className="text-2xl font-mono font-semibold">
              {avgTimeSeconds > 0 ? avgTimeSeconds.toFixed(1) : "0"}s
            </p>
            <p className="text-xs text-muted-foreground">Avg Time</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onStop}>
          <Square className="w-4 h-4 mr-2" />
          Stop
        </Button>
        {!hasAnswered && gameMode !== "timed" && (
          <Button variant="outline" onClick={onSkip}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Skip
          </Button>
        )}
      </div>
    </div>
  );
}


