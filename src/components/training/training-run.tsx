"use client";

import type { FormEvent, RefObject } from "react";
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
      {/* Status ledger (mode + difficulty + timer) */}
      <div ref={timerAndProblemRef} className="scroll-mt-4">
        <div className="border-t-2 border-foreground pt-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SectionLabel className="text-foreground">
                {gameMode === "learning" ? "Learning" : gameMode === "timed" ? "Timed" : "Practice"}
              </SectionLabel>
              <p className="editorial-label mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 normal-case tracking-[0.14em]">
                {!showAdvanced ? (
                  <span className={cn("uppercase", difficultyBadgeClassName)}>{difficultyLabel}</span>
                ) : (
                  <span className="uppercase">Custom ranges</span>
                )}
                {submitMode === "auto" && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="uppercase">Auto-submit</span>
                  </>
                )}
              </p>
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
                <SectionLabel>Time</SectionLabel>
                <div
                  className={cn(
                    "mt-1 font-mono text-2xl font-semibold tracking-tight tabular-nums",
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
              <Progress value={(timeLeft / practiceTimerLimit) * 100} className="h-1" />
            </div>
          ) : gameMode === "timed" ? (
            <div className="mt-3">
              <Progress value={(overallTimeLeft / timedModeLimit) * 100} className="h-1" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Technique - Before problem in Learning mode */}
      {gameMode === "learning" && showTip && currentTip && !hasAnswered && (
        <div className="border-t-2 border-foreground pt-3">
          <button
            onClick={() => setTipExpanded(!tipExpanded)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <SectionLabel className="text-brand">Technique</SectionLabel>
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
                    className={`h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono max-w-[200px] mx-auto rounded-[3px] border border-input bg-background px-3 flex items-center justify-center ${
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
        <Card className={isCorrect ? "border-success" : "border-destructive"}>
          <CardContent className="p-5">
            <div className="space-y-4">
              {/* Result header */}
              <div className="flex items-center gap-2.5">
                {isCorrect ? (
                  <>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[3px] border-2 border-success font-mono text-sm font-semibold text-success">
                      =
                    </span>
                    <span className="font-medium text-success">Correct!</span>
                  </>
                ) : (
                  <>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[3px] border-2 border-destructive font-mono text-sm font-semibold text-destructive">
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
                <SectionLabel className="text-brand">Step-by-step</SectionLabel>
                <h4 className="text-sm font-medium">{currentTip.title}</h4>
                <div className="space-y-2">
                  {currentTip.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[3px] border border-border font-mono text-xs font-medium">
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
        <MetricTile label="Solved" value={totalSolved} />

        {gameMode !== "timed" && <MetricTile label="Streak" value={streak} />}

        {submitMode === "manual" && <MetricTile label="Accuracy" value={`${accuracy}%`} />}

        {gameMode !== "learning" && (
          <MetricTile label="Avg time" value={`${avgTimeSeconds > 0 ? avgTimeSeconds.toFixed(1) : "0"}s`} />
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

