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
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TRAINING_SKILLS, type SkillId } from "@/lib/training-skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel, optionTileClass } from "@/components/ui/visual-system";
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

const tileClass = optionTileClass;

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
      <div className={cn("space-y-8", settingsOpen ? "lg:col-span-5" : "lg:col-span-12")}>
        <section className="border-t-2 border-foreground pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <SectionLabel className="text-brand">Quick start</SectionLabel>
            <span className="font-mono text-xs text-muted-foreground">{selectedOpsLabel}</span>
          </div>

          <div className="mt-4 space-y-5">
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

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              {modeIcon}
              <p className="leading-6">{modeDescription(gameMode)}</p>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="editorial-label">Settings</span>
                <span className={cn("font-mono text-xs capitalize", !showAdvanced && "font-medium")}>
                  {showAdvanced ? "custom ranges" : difficulty}
                </span>
                <span className="text-border">/</span>
                <span className="font-mono text-xs">
                  {gameMode === "timed"
                    ? formatTime(timedModeLimit)
                    : gameMode === "practice"
                      ? `${practiceTimerLimit}s`
                      : "no timer"}
                </span>
                <span className="text-border">/</span>
                <span className="font-mono text-xs">{submitMode === "auto" ? "auto-submit" : "enter"}</span>
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
          </div>
        </section>

        {/* Learning focus */}
        {gameMode === "learning" && (
          <section className="border-t border-border pt-5">
            <SectionLabel>Learning focus</SectionLabel>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a specific technique or do mixed practice. Tips show up before the problem;
              after answering, you&apos;ll get a breakdown.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedSkill(null)}
                className={tileClass(selectedSkill === null, "text-left")}
              >
                <div className="flex items-center gap-2.5">
                  <Shuffle className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">Mixed practice</div>
                    <div className={cn("text-xs", selectedSkill === null ? "text-background/70" : "text-muted-foreground")}>
                      Random problems with tips as you go
                    </div>
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
                    className={tileClass(isSelected, "text-left")}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{skill.name}</div>
                        <div className={cn("truncate text-xs", isSelected ? "text-background/70" : "text-muted-foreground")}>
                          {skill.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Right: Settings */}
      {settingsOpen ? (
      <div className="lg:col-span-7">
        <section className="border-t-2 border-foreground pt-5">
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
                      className={tileClass(isSelected, "text-center")}
                    >
                      <div className="font-mono text-2xl">{op}</div>
                      <div className={cn("text-xs", isSelected ? "text-background/70" : "text-muted-foreground")}>
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
                        className={tileClass(isSelected, "text-center")}
                      >
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
                      className={tileClass(timedModeLimit === time, "py-2 text-center font-mono text-sm")}
                    >
                      {formatTime(time)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {gameMode === "practice" && (
              <div className="space-y-2 border-t border-border pt-5">
                <div className="text-sm font-medium">Time per question</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {practiceTimerOptions.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setPracticeTimerLimit(time)}
                      className={tileClass(practiceTimerLimit === time, "py-2 text-center font-mono text-sm")}
                    >
                      {time}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submission */}
            <div className="space-y-2 border-t border-border pt-5">
              <div className="text-sm font-medium">Answer submission</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSubmitMode("manual")}
                  className={tileClass(submitMode === "manual", "text-left")}
                >
                  <div className="flex items-center gap-2">
                    <CornerDownLeft className="h-4 w-4" />
                    <div className="text-sm font-medium">Press Enter</div>
                  </div>
                  <div className={cn("mt-1 text-xs", submitMode === "manual" ? "text-background/70" : "text-muted-foreground")}>
                    Submit with Enter key
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitMode("auto")}
                  className={tileClass(submitMode === "auto", "text-left")}
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    <div className="text-sm font-medium">Auto-submit</div>
                  </div>
                  <div className={cn("mt-1 text-xs", submitMode === "auto" ? "text-background/70" : "text-muted-foreground")}>
                    Submit when correct
                  </div>
                </button>
              </div>
              {submitMode === "auto" && (
                <div className="flex items-start gap-2 border-l-2 border-warning pl-3 pt-1 text-xs">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Note:</span> Accuracy isn&apos;t recorded in auto-submit mode.
                  </p>
                </div>
              )}
            </div>

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
                <div className="space-y-4 border-l-2 border-border pl-4">
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
          </div>
        </section>
      </div>
      ) : null}
    </div>
  );
}
