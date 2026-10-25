import { QUANT_LESSONS, QUANT_MASTERY_FIRST_TRY, QUANT_SET_SIZE, QUANT_TOPICS, getQuantLesson, isFreeQuantLesson } from "./lessons";
import { MOCK_POINTS, MOCK_RATINGS } from "./mock";

/**
 * The plan after a mock: the lessons behind the questions it missed, in course order (later
 * units build on earlier ones). A lesson is ticked off once the player gets PLAN_RIGHT of its
 * questions right first time after the mock; then the plan ends on another mock.
 */

export const PLAN_RIGHT = QUANT_MASTERY_FIRST_TRY;
/** Rough minutes to read a lesson, and how much slower than its target a learner answers. */
const READ_MINUTES = 5;
const PRACTICE_PACE = 2;
const PASS = MOCK_RATINGS.find((rating) => rating.label === "Pass")!.min;

export type MockPlanStep = {
  lessonId: string;
  title: string;
  unit: string;
  /** Points the miss cost in the mock. */
  points: number;
  /** Right first time since the mock, up to PLAN_RIGHT. */
  right: number;
  done: boolean;
  read: boolean;
  /** Open on the free plan. */
  free: boolean;
  minutes: number;
};

export type MockPlan = {
  mockId: string;
  score: number;
  /** The rating to aim for next (Pass, then Strong pass) and its score; null from a Strong pass. */
  goal: { label: string; min: number } | null;
  steps: MockPlanStep[];
  done: number;
  /** Minutes for the steps not yet done. */
  minutesLeft: number;
};

type SavedQuestion = { lessonId?: unknown; correct?: unknown };

/** The lessons a mock's answers missed, each once. Questions are saved as JSON, so checked here. */
export function missedLessonIds(questions: unknown): string[] {
  if (!Array.isArray(questions)) return [];
  const ids = (questions as SavedQuestion[])
    .filter((q) => q?.correct === false && typeof q.lessonId === "string" && getQuantLesson(q.lessonId))
    .map((q) => q.lessonId as string);
  return [...new Set(ids)];
}

export function buildMockPlan(
  mock: { id: string; score: number; questions: unknown },
  rightSince: ReadonlyMap<string, number>,
  read: ReadonlySet<string>,
): MockPlan | null {
  const missed = new Set(missedLessonIds(mock.questions));
  if (missed.size === 0) return null;
  const steps = QUANT_LESSONS.filter((lesson) => missed.has(lesson.id)).map((lesson): MockPlanStep => {
    const right = Math.min(PLAN_RIGHT, rightSince.get(lesson.id) ?? 0);
    const practice = Math.ceil((QUANT_SET_SIZE * lesson.targetSeconds * PRACTICE_PACE) / 60);
    return {
      lessonId: lesson.id,
      title: lesson.title,
      unit: QUANT_TOPICS.find((t) => t.id === lesson.topic)!.title,
      points: MOCK_POINTS[lesson.difficulty],
      right,
      done: right >= PLAN_RIGHT,
      read: read.has(lesson.id),
      free: isFreeQuantLesson(lesson.id),
      minutes: (read.has(lesson.id) ? 0 : READ_MINUTES) + practice,
    };
  });
  // Aim for a Pass, and past that a Strong pass; Borderline isn't a goal.
  const goal = [...MOCK_RATINGS].reverse().find((rating) => rating.min > mock.score && rating.min >= PASS) ?? null;
  return {
    mockId: mock.id,
    score: mock.score,
    goal: goal && { label: goal.label, min: goal.min },
    steps,
    done: steps.filter((s) => s.done).length,
    minutesLeft: steps.filter((s) => !s.done).reduce((sum, s) => sum + s.minutes, 0),
  };
}

/** Where a step starts: the lesson if it hasn't been read, else straight into its practice. */
export const planStepHref = (step: Pick<MockPlanStep, "lessonId" | "read">) =>
  step.read ? `/quant/${step.lessonId}?step=practice` : `/quant/${step.lessonId}`;

/** 70 → "1 hr 10 min", 25 → "25 min". */
export function planDuration(minutes: number) {
  const rounded = minutes >= 60 ? Math.round(minutes / 5) * 5 : minutes;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return hours ? `${hours} hr${rest ? ` ${rest} min` : ""}` : `${rest} min`;
}
