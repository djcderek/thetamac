"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  Copy,
  Divide,
  Info,
  LayoutGrid,
  Play,
  Settings,
  Shuffle,
  Square,
  Target,
  Wand2,
  Zap,
  Circle,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TRAINING_SKILLS, type SkillId } from "@/lib/training-skills";
import { Button, buttonVariants } from "@/components/ui/button";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { morphContentIn, morphContentOut, morphLabelIn, morphSpring } from "@/lib/motion";
import { Input } from "@/components/ui/input";
import { SectionLabel, SelectionPill, optionTileClass } from "@/components/ui/visual-system";
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
  preferencesReady,
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
  preferencesReady: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedOpsLabel = selectedOperations.join(" ");

  return (
    <LayoutGroup>
    {/* The quick-start column keeps one width (36rem) open or closed, so opening settings only
        slides it left; a resize would scale-distort its text mid-animation. */}
    <div className={cn("mx-auto grid gap-6", settingsOpen ? "max-w-5xl lg:grid-cols-[36rem_minmax(0,1fr)]" : "max-w-xl")}>
      {/* Left: Quick start — one grey grouped card, then the single orange action. */}
      <motion.div layout="position" transition={morphSpring} className="min-w-0 space-y-6">
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

            {/* Settings summary: a white row inside the grey group, like Kurb's detail rows. */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-background py-2 pl-4 pr-2">
              <div className="min-w-0">
                <p className="text-[13px] text-muted-foreground">Settings</p>
                <p className="truncate text-[15px] font-medium tabular-nums">
                  <span className="capitalize">{showAdvanced ? "Custom ranges" : difficulty}</span>
                  {" · "}
                  {gameMode === "timed"
                    ? formatTime(timedModeLimit)
                    : gameMode === "practice"
                      ? `${practiceTimerLimit}s per problem`
                      : "No timer"}
                  {" · "}
                  {selectedOpsLabel}
                </p>
              </div>

              {/* Edit is the same element as the settings panel (shared layoutId): it grows out
                  into the panel like a blob, and the panel shrinks back into it on close. */}
              <AnimatePresence initial={false}>
              {settingsOpen ? (
                <motion.span key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: morphContentOut }} transition={morphContentIn}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSettingsOpen(false)}
                    className="min-h-10 shrink-0"
                    aria-expanded
                    aria-controls="training-session-settings"
                  >
                    Done
                  </Button>
                </motion.span>
              ) : (
                <motion.button
                  key="edit"
                  type="button"
                  layoutId="session-settings-morph"
                  exit={{ opacity: 0, transition: morphContentOut }}
                  transition={morphSpring}
                  style={{ borderRadius: 18 }}
                  onClick={() => setSettingsOpen(true)}
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "min-h-10 shrink-0")}
                  aria-expanded={false}
                  aria-controls="training-session-settings"
                >
                  {/* `layout` (not "position") also counter-scales the label while the pill shrinks. */}
                  <motion.span layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={morphLabelIn}>
                    Edit
                  </motion.span>
                </motion.button>
              )}
              </AnimatePresence>
            </div>

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
            <Button onClick={startTraining} disabled={!preferencesReady} variant="brand" size="lg" className="h-14 w-full text-[17px]">
              Start
              <Play aria-hidden="true" className="h-4 w-4 fill-current" />
            </Button>
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
                className={tileClass(selectedSkill === null, "text-left", { slidingPill: true })}
              >
                {selectedSkill === null && <SelectionPill group="setup-skill" />}
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
                    className={tileClass(isSelected, "text-left", { slidingPill: true })}
                  >
                    {isSelected && <SelectionPill group="setup-skill" />}
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
      </motion.div>

      {/* Right: Settings — morphs out of the Edit pill. AnimatePresence keeps it mounted on close
          so it shrinks back into the pill instead of vanishing. */}
      <AnimatePresence initial={false}>
      {settingsOpen ? (
        <motion.section
          key="session-settings"
          id="training-session-settings"
          layoutId="session-settings-morph"
          transition={morphSpring}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: "easeIn" } }}
          style={{ borderRadius: 26 }}
          className="min-w-0 overflow-hidden bg-secondary p-4 sm:p-5"
        >
        {/* `layout` counter-scales the content while the surface morphs; it fades in once the
            shape has mostly formed. */}
        <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: morphContentOut }} transition={morphContentIn}>
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
                <div className="text-sm font-medium">Time per question</div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {practiceTimerOptions.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setPracticeTimerLimit(time)}
                      aria-pressed={practiceTimerLimit === time}
                      className={tileClass(practiceTimerLimit === time, "py-2 text-center font-mono text-sm", { slidingPill: true })}
                    >
                      {practiceTimerLimit === time && <SelectionPill group="setup-question-timer" />}
                      {time}s
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
      </AnimatePresence>
    </div>
    </LayoutGroup>
  );
}
