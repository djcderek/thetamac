import type { Difficulty, GameMode, Operation } from "@/components/training/training-types";
import type { SkillId } from "@/lib/training-skills";

export type TrainingPresetId =
  | "arithmetic-speed-test"
  | "addition-drills"
  | "subtraction-drills"
  | "multiplication-practice"
  | "division-practice"
  | "interview-math"
  | "case-math";

export type TrainingPreset = {
  id: TrainingPresetId;
  label: string;
  gameMode: GameMode;
  difficulty: Difficulty;
  operations: Operation[];
  timedModeLimit: number;
  selectedSkill?: SkillId | null;
};

const TRAINING_PRESETS: Record<TrainingPresetId, TrainingPreset> = {
  "arithmetic-speed-test": {
    id: "arithmetic-speed-test",
    label: "Arithmetic Speed Test",
    gameMode: "timed",
    difficulty: "medium",
    operations: ["+", "-", "×", "÷"],
    timedModeLimit: 120,
  },
  "addition-drills": {
    id: "addition-drills",
    label: "Addition Drills",
    gameMode: "timed",
    difficulty: "medium",
    operations: ["+"],
    timedModeLimit: 120,
  },
  "subtraction-drills": {
    id: "subtraction-drills",
    label: "Subtraction Drills",
    gameMode: "timed",
    difficulty: "medium",
    operations: ["-"],
    timedModeLimit: 120,
  },
  "multiplication-practice": {
    id: "multiplication-practice",
    label: "Multiplication Practice",
    gameMode: "timed",
    difficulty: "medium",
    operations: ["×"],
    timedModeLimit: 120,
  },
  "division-practice": {
    id: "division-practice",
    label: "Division Practice",
    gameMode: "timed",
    difficulty: "medium",
    operations: ["÷"],
    timedModeLimit: 120,
  },
  "interview-math": {
    id: "interview-math",
    label: "Interview Math",
    gameMode: "timed",
    difficulty: "medium",
    operations: ["+", "-", "×", "÷"],
    timedModeLimit: 120,
  },
  "case-math": {
    id: "case-math",
    label: "Case Math",
    gameMode: "timed",
    difficulty: "medium",
    operations: ["×", "÷", "+", "-"],
    timedModeLimit: 120,
  },
};

export function isTrainingPresetId(value: string | null | undefined): value is TrainingPresetId {
  return Boolean(value && value in TRAINING_PRESETS);
}

export function getTrainingPreset(value: string | null | undefined): TrainingPreset | null {
  if (!isTrainingPresetId(value)) return null;
  return TRAINING_PRESETS[value];
}
