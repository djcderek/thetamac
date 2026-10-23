import { QUANT_LESSON_IDS, type QuantLessonId } from "./ids";
import type { QuantFamily, QuantLessonDef, QuantProblem, QuantPuzzle, Random } from "./build";
import { COUNTING_LESSONS } from "./units/counting";
import { BASICS_LESSONS } from "./units/basics";
import { CONDITIONAL_LESSONS } from "./units/conditional";
import { EXPECTED_VALUE_LESSONS } from "./units/expected-value";
import { DISTRIBUTIONS_LESSONS } from "./units/distributions";
import { BETTING_LESSONS } from "./units/betting";
import { STATES_LESSONS } from "./units/markov";
import { CONTINUOUS_LESSONS } from "./units/continuous";
import { CLASSIC_A_PUZZLES } from "./puzzles/classic-a";
import { CLASSIC_B_PUZZLES } from "./puzzles/classic-b";

export { QUANT_LESSON_IDS, type QuantLessonId };
export type { QuantFamily, QuantProblem, QuantPuzzle, QuantStep } from "./build";

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

export type QuantLesson = QuantLessonDef & {
  topic: QuantTopic;
  /** Classic one-off puzzles that this lesson's method solves. */
  puzzles: QuantPuzzle[];
  /** A question from any of the lesson's types, chosen at random. */
  generate: (random: Random) => QuantProblem;
};

/** Every puzzle, in course order of their lessons, easier first within a lesson. */
const DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 } as const;
const ALL_PUZZLES: QuantPuzzle[] = [...CLASSIC_A_PUZZLES, ...CLASSIC_B_PUZZLES];

/** A question of one type, tagged with that type. */
export function generateFromFamily(family: QuantFamily, random: Random): QuantProblem {
  return { ...family.generate(random), family: family.id };
}

export const QUANT_LESSONS: QuantLesson[] = UNITS.flatMap((unit) =>
  unit.lessons.map((lesson) => ({
    ...lesson,
    topic: unit.id,
    puzzles: ALL_PUZZLES.filter((puzzle) => puzzle.lesson === lesson.id).sort(
      (a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty],
    ),
    generate: (random: Random) => generateFromFamily(lesson.families[Math.floor(random() * lesson.families.length)], random),
  })),
);

export const QUANT_PUZZLES: QuantPuzzle[] = QUANT_LESSONS.flatMap((lesson) => lesson.puzzles);

export function getQuantPuzzle(id: string): QuantPuzzle | null {
  return QUANT_PUZZLES.find((puzzle) => puzzle.id === id) ?? null;
}

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

/**
 * A lesson's set: different problems, none the worked example, spread across its question
 * types (each type once, in a shuffled order, before any repeats).
 */
export function createQuantLessonProblems(lesson: QuantLesson, random: Random = Math.random): QuantProblem[] {
  const problems: QuantProblem[] = [];
  const seen = new Set<string>([lesson.example.key]);
  const order = [...lesson.families].sort(() => random() - 0.5);
  for (let tries = 0; problems.length < QUANT_SET_SIZE && tries < 1000; tries++) {
    const family = order[problems.length % order.length];
    // A type that keeps repeating gives way to a random one.
    const next = generateFromFamily(tries % 25 === 24 ? order[Math.floor(random() * order.length)] : family, random);
    if (seen.has(next.key)) continue;
    seen.add(next.key);
    problems.push(next);
  }
  return problems;
}

/** One fresh question of a type, avoiding keys already seen (for practising one type). */
export function createFamilyProblem(lesson: QuantLesson, familyId: string, avoid: ReadonlySet<string> = new Set(), random: Random = Math.random) {
  const family = lesson.families.find((f) => f.id === familyId) ?? lesson.families[0];
  let problem = generateFromFamily(family, random);
  for (let tries = 0; avoid.has(problem.key) && tries < 50; tries++) problem = generateFromFamily(family, random);
  return problem;
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
