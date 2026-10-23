import { QUANT_LESSON_IDS, type QuantLessonId } from "./ids";
import type { QuantLessonDef, QuantProblem, Random } from "./build";
import { COUNTING_LESSONS } from "./units/counting";
import { BASICS_LESSONS } from "./units/basics";
import { CONDITIONAL_LESSONS } from "./units/conditional";
import { EXPECTED_VALUE_LESSONS } from "./units/expected-value";
import { DISTRIBUTIONS_LESSONS } from "./units/distributions";
import { BETTING_LESSONS } from "./units/betting";
import { STATES_LESSONS } from "./units/markov";
import { CONTINUOUS_LESSONS } from "./units/continuous";

export { QUANT_LESSON_IDS, type QuantLessonId };
export type { QuantProblem, QuantStep } from "./build";

/**
 * The quant course: probability and expected value, the way trading interviews ask it. Units
 * run in order, each building on the ones before, and lessons within a unit run easier to
 * harder. Each lesson is one concept. Its set opens with QUANT_GUIDED problems that show the
 * working, then QUANT_SOLO on the player's own.
 */

export const QUANT_GUIDED = 2;
export const QUANT_SOLO = 5;
export const QUANT_SET_SIZE = QUANT_GUIDED + QUANT_SOLO;
/** Solo problems right first time (within the target time) to master a lesson. */
export const QUANT_MASTERY_FIRST_TRY = QUANT_SOLO - 1;

export type QuantStage = "Foundations" | "Core" | "Advanced";

export type QuantTopic =
  | "counting"
  | "basics"
  | "conditional"
  | "expected-value"
  | "distributions"
  | "betting"
  | "states"
  | "continuous";

export type QuantUnit = { id: QuantTopic; number: number; stage: QuantStage; title: string; blurb: string };

const UNITS: (Omit<QuantUnit, "number"> & { lessons: QuantLessonDef[] })[] = [
  { id: "counting", stage: "Foundations", title: "Counting", blurb: "How many ways something can happen.", lessons: COUNTING_LESSONS },
  { id: "basics", stage: "Foundations", title: "Probability basics", blurb: "The rules every chance follows.", lessons: BASICS_LESSONS },
  { id: "conditional", stage: "Core", title: "Conditional probability", blurb: "Chances when you already know something.", lessons: CONDITIONAL_LESSONS },
  { id: "expected-value", stage: "Core", title: "Expected value", blurb: "Averages, and how much results spread.", lessons: EXPECTED_VALUE_LESSONS },
  { id: "distributions", stage: "Core", title: "Distributions", blurb: "The patterns behind repeated tries.", lessons: DISTRIBUTIONS_LESSONS },
  { id: "betting", stage: "Core", title: "Betting", blurb: "Whether a bet is good, and how much to bet.", lessons: BETTING_LESSONS },
  { id: "states", stage: "Advanced", title: "Thinking in states", blurb: "Waits, walks and games that depend on what’s happened so far.", lessons: STATES_LESSONS },
  { id: "continuous", stage: "Advanced", title: "Continuous probability", blurb: "Random numbers in a range, and chances as areas.", lessons: CONTINUOUS_LESSONS },
];

export const QUANT_TOPICS: QuantUnit[] = UNITS.map((unit, index) => ({
  id: unit.id,
  number: index + 1,
  stage: unit.stage,
  title: unit.title,
  blurb: unit.blurb,
}));

export type QuantLesson = QuantLessonDef & { topic: QuantTopic };

export const QUANT_LESSONS: QuantLesson[] = UNITS.flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, topic: unit.id })));

/** The Foundations units are free; everything after them is Pro. */
export const FREE_QUANT_LESSON_IDS: readonly QuantLessonId[] = QUANT_LESSONS.filter(
  (lesson) => QUANT_TOPICS.find((topic) => topic.id === lesson.topic)!.stage === "Foundations",
).map((lesson) => lesson.id);

export function isFreeQuantLesson(id: string) {
  return (FREE_QUANT_LESSON_IDS as readonly string[]).includes(id);
}

export function getQuantLesson(id: string): QuantLesson | null {
  return QUANT_LESSONS.find((lesson) => lesson.id === id) ?? null;
}

/** A lesson's set: different problems, starting from ones unlike the worked example. */
export function createQuantLessonProblems(lesson: QuantLesson, random: Random = Math.random): QuantProblem[] {
  const problems: QuantProblem[] = [];
  const seen = new Set<string>([lesson.example.key]);
  for (let tries = 0; problems.length < QUANT_SET_SIZE && tries < 500; tries++) {
    const next = lesson.generate(random);
    if (seen.has(next.key)) continue;
    seen.add(next.key);
    problems.push(next);
  }
  return problems;
}

export function isQuantLessonMastered(
  lesson: QuantLesson,
  result: { soloCount: number; soloFirstTry: number; soloAverageSeconds: number | null },
) {
  return (
    result.soloCount >= QUANT_SOLO &&
    result.soloFirstTry >= QUANT_MASTERY_FIRST_TRY &&
    result.soloAverageSeconds !== null &&
    result.soloAverageSeconds <= lesson.targetSeconds
  );
}
