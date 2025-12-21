export type Operation = "+" | "-" | "×" | "÷";
export type Difficulty = "easy" | "medium" | "hard" | "expert";
export type GameMode = "timed" | "practice" | "learning";
export type SubmitMode = "manual" | "auto";

export type ScoreBucket = {
  from: number;
  to: number;
  count: number;
};

export type ScoreDistribution = {
  percentile: number | null;
  bucket: string | null;
  total: number | null;
  score: number | null;
  buckets: ScoreBucket[];
  maxCount: number;
  userBucketIndex: number | null;
};

export interface Problem {
  a: number;
  b: number;
  operation: Operation;
  answer: number;
}

export interface OperationRange {
  min: number;
  max: number;
}

export interface MathTip {
  title: string;
  description: string;
  steps: string[];
  technique: string;
}

export type OperationRanges = Record<Operation, OperationRange>;

export interface DifficultySettings {
  label: string;
  addSubMax: number;
  mulTableMax: number;
  mulWideMax: number;
  timeLimit: number;
  description: string;
}


