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
  /** "pace": a stopped run, placed by its pace over the full time. */
  basis?: "score" | "pace";
  /** Different players behind the runs compared against. */
  players?: number;
  /** The settings the runs share, e.g. "Medium · 2:00 · + − × ÷". */
  setupLabel?: string;
  comparison?: "exact" | "historical";
  historicalRuns?: number;
  guestRuns?: number;
  unavailableReason?: "not_enough_runs" | "too_short" | "custom_ranges";
};

export interface Problem {
  a: number;
  b: number;
  operation: Operation;
  answer: number;
}

/** What the run and results screens show of a Practice set. */
export type PracticeProgress = {
  size: number;
  cleared: number;
  firstTry: number;
  /** Missed problems still to come back. */
  waiting: number;
  /** The current problem is one coming back after a miss. */
  isReturn: boolean;
  missed: Problem[];
};

/** Past misses due for review, from /api/training/review. */
export type ReviewSummary = {
  /** Free accounts see the counts and an example, not the set. */
  locked: boolean;
  dueCount: number;
  waitingCount: number;
  /** Whole days until the next waiting problem is due (0 = later today); null if none. */
  nextDueInDays: number | null;
  problems: Problem[];
  example: { problem: Problem; misses: number } | null;
};

/** "lesson" is a Learning lesson played through, the only kind that is scored for mastery. */
export type PracticeKind = "set" | "retry" | "review" | "lesson" | "daily";

export type DailySectionId = "review" | "lesson" | "weak" | "mix";

/** Today's session for a signed-in player, from /api/training/daily. */
export type DailySummary = {
  /** Free accounts see what it would hold, not the problems. */
  locked: boolean;
  doneToday: boolean;
  streak: number;
  /** The last seven days, oldest first: whether each had a daily session. */
  week: boolean[];
  counts: { review: number; lesson: number; weak: number };
  items: { problem: Problem; section: DailySectionId; lessonId?: string }[];
  /** Quant question types due in review; they run on /quant/review, not in the session. */
  quantDue: number;
  /** The next lesson in the latest quant mock's plan that the player can practise; null when none is left. */
  quantPlan: { lessonId: string; title: string; read: boolean; done: number; total: number } | null;
  /** Recent sessions' average seconds, oldest first (local day numbers). */
  history: { day: number; averageSeconds: number }[];
  /** The latest session's average against the first few; null until there are enough. */
  trend: { latestSeconds: number; baselineSeconds: number } | null;
};

/** How today's session went, for the results screen. */
export type DailyOutcome = {
  streak: number;
  week: boolean[];
  /** First-try results per part of the session, in order; empty parts left out. */
  sections: { section: DailySectionId; firstTry: number; total: number }[];
  averageSeconds: number | null;
  /** The average of the player's first daily sessions, once there are a few. */
  baselineSeconds: number | null;
  /** Already done earlier today, so this one didn't add to the streak. */
  repeat: boolean;
};

export type LessonProgressSummary = {
  plays: number;
  bestFirstTry: number;
  bestAverageSeconds: number | null;
  mastered: boolean;
};

/** A signed-in player's lessons, from /api/lessons/progress. */
export type LessonsSummary = {
  /** The Pro lessons are closed to this account. */
  locked: boolean;
  progress: Partial<Record<string, LessonProgressSummary>>;
};

/** How a lesson went, for the results screen. */
export type LessonOutcome = {
  lessonId: string;
  title: string;
  soloCount: number;
  soloFirstTry: number;
  soloAverageSeconds: number | null;
  targetSeconds: number;
  mastered: boolean;
  /** Mastered for the first time on this run. */
  newlyMastered: boolean;
  /** The lesson after this one, if any. */
  next: { id: string; title: string; locked: boolean } | null;
};

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


