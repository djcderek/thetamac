"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  Copy,
  Divide,
  GraduationCap,
  Info,
  LayoutGrid,
  Play,
  Settings,
  Shuffle,
  Square,
  Target,
  Timer,
  Wand2,
  Zap,
  Circle,
  Lightbulb,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TRAINING_SKILLS, type SkillId } from "@/lib/training-skills";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreDistributionCard } from "@/components/training/score-distribution-card";
import type {
  Difficulty,
  DifficultySettings,
  GameMode,
  Operation,
  OperationRanges,
  ScoreDistribution,
  SubmitMode,
} from "@/components/training/training-types";

function modeDescription(mode: GameMode) {
  switch (mode) {
    case "timed":
      return "Go for volume. Your best single session counts for leaderboards (default settings).";
    case "practice":
      return "Per-question timer. Great for building consistency without the session pressure.";
    case "learning":
      return "Slower pace with step-by-step explanations after you answer.";
  }
}

export function TrainingSetup({
  scorePercentile,
  showLastRunPlacementCard,
  gameMode,
  setGameMode,
  selectedSkill,
  setSelectedSkill,
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
  getDifficultyColor,
  timedModeLimits,
  timedModeLimit,
  setTimedModeLimit,
  practiceTimerOptions,
  practiceTimerLimit,
  setPracticeTimerLimit,
  submitMode,
  setSubmitMode,
  formatTime,
  startTraining,
}: {
  scorePercentile: ScoreDistribution | null;
  showLastRunPlacementCard: boolean;
  gameMode: GameMode;
  setGameMode: (m: GameMode) => void;
  selectedSkill: SkillId | null;
  setSelectedSkill: (s: SkillId | null) => void;
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
  getDifficultyColor: (d: Difficulty) => string;
  timedModeLimits: number[];
  timedModeLimit: number;
  setTimedModeLimit: (t: number) => void;
  practiceTimerOptions: number[];
  practiceTimerLimit: number;
  setPracticeTimerLimit: (t: number) => void;
  submitMode: SubmitMode;
  setSubmitMode: (m: SubmitMode) => void;
  formatTime: (seconds: number) => string;
  startTraining: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedOpsLabel = selectedOperations.join(" ");

  const modeIcon = useMemo(() => {
    switch (gameMode) {
      case "timed":
        return <Zap className="h-4 w-4 text-primary" />;
      case "practice":
        return <Timer className="h-4 w-4 text-primary" />;
      case "learning":
        return <GraduationCap className="h-4 w-4 text-primary" />;
    }
  }, [gameMode]);

  return (
    <div className={cn("grid gap-6", settingsOpen ? "lg:grid-cols-12" : "")}>
      {/* Left: Quick start */}
      <div className={cn("space-y-6", settingsOpen ? "lg:col-span-5" : "lg:col-span-12")}>
        <Card className="overflow-hidden border-brand/20">
          <CardHeader>
            <CardTitle className="editorial-label text-brand">Quick start</CardTitle>
            <CardDescription>Pick a mode, then hit start.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="rounded-xl border border-border bg-secondary/20 px-3 py-3">
              <div className="flex items-center gap-2 text-sm">
                {modeIcon}
                <span className="font-medium capitalize">{gameMode}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground font-mono">{selectedOpsLabel}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{modeDescription(gameMode)}</p>
            </div>

            <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Session settings</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    {!showAdvanced ? (
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", getDifficultyColor(difficulty))}>
                        {difficulty}
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Custom ranges
                      </span>
                    )}

                    {gameMode === "timed" ? (
                      <span className="rounded-full border border-border bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {formatTime(timedModeLimit)}
                      </span>
                    ) : gameMode === "practice" ? (
                      <span className="rounded-full border border-border bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {practiceTimerLimit}s
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        No timer
                      </span>
                    )}

                    <span className="rounded-full border border-border bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {submitMode === "auto" ? "Auto-submit" : "Enter"}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen((v) => !v)}
                  className="shrink-0"
                >
                  {settingsOpen ? "Hide" : "Edit"}
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={startTraining} size="lg" className="w-full bg-brand text-brand-foreground hover:bg-brand/85">
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/training/weak-points" className="justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Weak Points
                  </span>
                  <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    PRO
                  </span>
                </Link>
              </Button>
            </div>

            {showLastRunPlacementCard && scorePercentile && (
              <ScoreDistributionCard
                data={scorePercentile}
                heading="Your placement (last run)"
                scoreLabel="Best score:"
              />
            )}
          </CardContent>
        </Card>

        {/* Learning focus */}
        {gameMode === "learning" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Learning focus</CardTitle>
              <CardDescription>Pick a specific technique or do mixed practice.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Tips show up before the problem. After answering, you’ll get a breakdown.
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedSkill(null)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left transition-colors",
                    selectedSkill === null
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-secondary/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "rounded-md p-1.5",
                        selectedSkill === null ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                      )}
                    >
                      <Shuffle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">Mixed practice</div>
                      <div className="text-xs text-muted-foreground">Random problems with tips as you go</div>
                    </div>
                  </div>
                </button>

                {TRAINING_SKILLS.map((skill) => {
                  const Icon =
                    skill.iconName === "Zap"
                      ? Zap
                      : skill.iconName === "Circle"
                        ? Circle
                        : skill.iconName === "Box"
                          ? Square
                          : skill.iconName === "Copy"
                            ? Copy
                            : skill.iconName === "Divide"
                              ? Divide
                              : LayoutGrid;
                  const isSelected = selectedSkill === skill.id;

                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => setSelectedSkill(skill.id)}
                      className={cn(
                        "rounded-lg border px-3 py-3 text-left transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "rounded-md p-1.5",
                            isSelected ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{skill.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{skill.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Settings */}
      {settingsOpen ? (
      <div className="lg:col-span-7">
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-sm">Session settings</CardTitle>
                <CardDescription>
                  {showAdvanced ? "Custom ranges enabled." : "Difficulty presets enabled."}{" "}
                  <span className="font-mono tabular-nums">{selectedOpsLabel}</span>
                </CardDescription>
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
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Operations */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
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
                      className={cn(
                        "rounded-lg border px-3 py-3 text-center transition-colors",
                        isSelected ? "border-primary bg-primary/10" : "border-border hover:bg-secondary/30"
                      )}
                    >
                      <div className={cn("text-2xl font-mono", isSelected && "text-primary")}>{op}</div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Difficulty */}
            {!showAdvanced && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
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
                        className={cn(
                          "rounded-lg border px-3 py-3 text-center transition-colors",
                          isSelected ? `border-2 ${getDifficultyColor(d)}` : "border-border hover:bg-secondary/30"
                        )}
                      >
                        <div className="text-sm font-medium capitalize">{d}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
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
              <div className="space-y-2">
                <div className="text-sm font-medium">Session duration</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {timedModeLimits.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setTimedModeLimit(time)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm transition-colors",
                        timedModeLimit === time
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border hover:bg-secondary/30"
                      )}
                    >
                      {formatTime(time)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameMode === "practice" && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Time per question</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {practiceTimerOptions.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setPracticeTimerLimit(time)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm transition-colors",
                        practiceTimerLimit === time
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border hover:bg-secondary/30"
                      )}
                    >
                      {time}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submission */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Answer submission</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitMode("manual")}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left transition-colors",
                    submitMode === "manual"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <CornerDownLeft className={cn("h-4 w-4", submitMode === "manual" && "text-primary")} />
                    <div className="text-sm font-medium">Press Enter</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Submit with Enter key</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitMode("auto")}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left transition-colors",
                    submitMode === "auto"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-secondary/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className={cn("h-4 w-4", submitMode === "auto" && "text-primary")} />
                    <div className="text-sm font-medium">Auto-submit</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Submit when correct</div>
                </button>
              </div>
              {submitMode === "auto" && (
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-amber-800 dark:text-amber-200">
                      <span className="font-medium">Note:</span> Accuracy isn’t recorded in auto-submit mode.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Custom ranges */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/10 px-3 py-2 text-left transition-colors hover:bg-secondary/20"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Settings className="h-4 w-4" />
                  Custom ranges
                </span>
                {showAdvanced ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {showAdvanced && (
                <div className="rounded-lg border border-border bg-secondary/15 p-4 space-y-4">
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
                          <Input
                            type="number"
                            value={operationRanges[op].min}
                            onChange={(e) => updateRange(op, "min", parseInt(e.target.value) || 1)}
                            className="w-20 h-8 text-center text-sm"
                            min={1}
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <Input
                            type="number"
                            value={operationRanges[op].max}
                            onChange={(e) => updateRange(op, "max", parseInt(e.target.value) || 1)}
                            className="w-20 h-8 text-center text-sm"
                            min={1}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      ) : null}
    </div>
  );
}
