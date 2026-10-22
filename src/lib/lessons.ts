import type { MathTip, Operation, Problem } from "@/components/training/training-types";

/**
 * Learning lessons: one mental-math trick each. A lesson is a short set: the first
 * LESSON_GUIDED problems show the trick's steps with the last one left to the player, the
 * rest are on their own. Getting most of those right first time, fast, masters the lesson.
 */

export const LESSON_SET_SIZE = 10;
/** Problems at the start of a lesson that show the steps. */
export const LESSON_GUIDED = 3;
export const LESSON_SOLO = LESSON_SET_SIZE - LESSON_GUIDED;
/** Of the problems done on their own, how many must be right first time to master a lesson. */
export const LESSON_MASTERY_FIRST_TRY = LESSON_SOLO - 1;
/** Lessons open to everyone; the rest are Pro. */
export const FREE_LESSON_COUNT = 4;

export const LESSON_IDS = [
  "make-ten",
  "count-up",
  "times-9",
  "times-11",
  "pairs-of-ten",
  "round-up-add",
  "round-up-subtract",
  "times-5",
  "times-4",
  "break-apart",
  "divide-5",
  "square-5",
] as const;

export type LessonId = (typeof LESSON_IDS)[number];

/** One line of working: "Fill up to 50: 47 + 3 = 50". */
export type LessonStep = { label: string; work: string; result: number };

export type Lesson = {
  id: LessonId;
  title: string;
  /** The trick in one sentence. */
  trick: string;
  operation: Operation;
  /** Average seconds per problem, done on their own, to master it. */
  targetSeconds: number;
  /** The worked example the lesson opens with. */
  example: Problem;
  generate: (random: () => number) => Problem;
  /** Whether this trick is the one to use for a problem (for tips elsewhere in the app). */
  matches: (problem: Problem) => boolean;
  /** The trick worked through for a problem; the last step's result is the answer. */
  steps: (problem: Problem) => LessonStep[];
};

function int(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)];
}

const add = (a: number, b: number): Problem => ({ a, b, operation: "+", answer: a + b });
const subtract = (a: number, b: number): Problem => ({ a, b, operation: "-", answer: a - b });
const multiply = (a: number, b: number): Problem => ({ a, b, operation: "×", answer: a * b });
const divide = (a: number, b: number): Problem => ({ a, b, operation: "÷", answer: a / b });

/** The larger and smaller operand, for tricks that work either way round. */
function bigSmall({ a, b }: Problem) {
  return a >= b ? [a, b] : [b, a];
}

/** For "× n" tricks: the other number, or null when neither operand is n. */
function timesOperand({ a, b, operation }: Problem, n: number) {
  if (operation !== "×") return null;
  return b === n ? a : a === n ? b : null;
}

const endsInEightOrNine = (n: number) => n % 10 >= 8;
/** For "round up and add": the operand just under a ten (b first), or null. */
function roundable({ a, b }: Problem) {
  return [b, a].find((n) => n >= 18 && endsInEightOrNine(n)) ?? null;
}
const nextTen = (n: number) => Math.ceil(n / 10) * 10;

export const LESSONS: Lesson[] = [
  {
    id: "make-ten",
    title: "Make a ten",
    trick: "Fill up to the next ten, then add what is left.",
    operation: "+",
    targetSeconds: 3,
    example: add(47, 8),
    generate: (random) => {
      const ones = int(random, 3, 9);
      const a = int(random, 1, 8) * 10 + ones;
      return add(a, int(random, 11 - ones, 9));
    },
    matches: (p) => {
      if (p.operation !== "+") return false;
      const [big, small] = bigSmall(p);
      return big >= 10 && small >= 2 && small <= 9 && (big % 10) + small > 10;
    },
    steps: (p) => {
      const [big, small] = bigSmall(p);
      const ten = nextTen(big);
      const fill = ten - big;
      return [
        { label: `Fill up to ${ten}`, work: `${big} + ${fill}`, result: ten },
        { label: `Add the other ${small - fill}`, work: `${ten} + ${small - fill}`, result: p.answer },
      ];
    },
  },
  {
    id: "count-up",
    title: "Count up",
    trick: "Count up from the smaller number to the next ten, then on to the bigger one.",
    operation: "-",
    targetSeconds: 5,
    example: subtract(83, 47),
    generate: (random) => {
      const bOnes = int(random, 2, 9);
      const b = int(random, 1, 6) * 10 + bOnes;
      // At least a ten past b's next ten, so both jumps are real.
      const aTens = int(random, Math.floor(b / 10) + 2, 9);
      return subtract(aTens * 10 + int(random, 0, bOnes - 1), b);
    },
    matches: ({ a, b, operation }) =>
      operation === "-" && b >= 10 && a < 1000 && b % 10 !== 0 && a % 10 < b % 10 && a > nextTen(b),
    steps: ({ a, b, answer }) => {
      const ten = nextTen(b);
      return [
        { label: `Count up to ${ten}`, work: `${ten} − ${b}`, result: ten - b },
        { label: `Then on to ${a}`, work: `${a} − ${ten}`, result: a - ten },
        { label: "Add the two jumps", work: `${ten - b} + ${a - ten}`, result: answer },
      ];
    },
  },
  {
    id: "times-9",
    title: "Times 9",
    trick: "Multiply by 10, then take the number away once.",
    operation: "×",
    targetSeconds: 4,
    example: multiply(47, 9),
    generate: (random) => multiply(int(random, 12, 99), 9),
    matches: (p) => (timesOperand(p, 9) ?? 0) >= 11,
    steps: (p) => {
      const n = timesOperand(p, 9)!;
      return [
        { label: "Times 10", work: `${n} × 10`, result: n * 10 },
        { label: `Take away one ${n}`, work: `${n * 10} − ${n}`, result: p.answer },
      ];
    },
  },
  {
    id: "times-11",
    title: "Times 11",
    trick: "Add the two digits and put the sum between them.",
    operation: "×",
    targetSeconds: 4,
    example: multiply(43, 11),
    // Not a multiple of 10: 50 × 11 has nothing to put in the middle.
    generate: (random) => multiply(int(random, 1, 9) * 10 + int(random, 1, 9), 11),
    matches: (p) => {
      const n = timesOperand(p, 11);
      return n !== null && n >= 10 && n <= 99;
    },
    steps: (p) => {
      const n = timesOperand(p, 11)!;
      const [tens, ones] = [Math.floor(n / 10), n % 10];
      const sum = tens + ones;
      return [
        { label: "Add the digits", work: `${tens} + ${ones}`, result: sum },
        sum < 10
          ? { label: `Put ${sum} between ${tens} and ${ones}`, work: `${tens}, ${sum}, ${ones}`, result: p.answer }
          : {
              label: `Put ${sum % 10} between them and carry the 1`,
              work: `${tens + 1}, ${sum % 10}, ${ones}`,
              result: p.answer,
            },
      ];
    },
  },
  {
    id: "pairs-of-ten",
    title: "Pairs that make ten",
    trick: "When the ones digits add to 10, add the tens and one more ten.",
    operation: "+",
    targetSeconds: 4,
    example: add(47, 33),
    generate: (random) => {
      const ones = int(random, 1, 9);
      return add(int(random, 1, 7) * 10 + ones, int(random, 1, 7) * 10 + (10 - ones));
    },
    matches: ({ a, b, operation }) => operation === "+" && a >= 10 && b >= 10 && (a % 10) + (b % 10) === 10,
    steps: ({ a, b, answer }) => {
      const tens = a - (a % 10) + (b - (b % 10));
      return [
        { label: "The ones make ten", work: `${a % 10} + ${b % 10}`, result: 10 },
        { label: "Add the tens", work: `${a - (a % 10)} + ${b - (b % 10)}`, result: tens },
        { label: "Plus that ten", work: `${tens} + 10`, result: answer },
      ];
    },
  },
  {
    id: "round-up-add",
    title: "Round up and add",
    trick: "Round the number up to a ten, add, then take back the extra.",
    operation: "+",
    targetSeconds: 4,
    example: add(56, 29),
    generate: (random) => add(int(random, 21, 89), int(random, 1, 7) * 10 + pick(random, [8, 9])),
    matches: (p) => p.operation === "+" && Math.min(p.a, p.b) >= 10 && roundable(p) !== null,
    steps: (p) => {
      const round = roundable(p)!;
      const other = round === p.b ? p.a : p.b;
      const ten = nextTen(round);
      return [
        { label: `Add ${ten} instead`, work: `${other} + ${ten}`, result: other + ten },
        { label: `Take back the extra ${ten - round}`, work: `${other + ten} − ${ten - round}`, result: p.answer },
      ];
    },
  },
  {
    id: "round-up-subtract",
    title: "Round up and take away",
    trick: "Take away the next ten up, then give back the extra.",
    operation: "-",
    targetSeconds: 4,
    example: subtract(82, 29),
    generate: (random) => {
      const b = int(random, 1, 6) * 10 + pick(random, [8, 9]);
      return subtract(int(random, b + 11, 99), b);
    },
    matches: ({ a, b, operation }) => operation === "-" && b >= 18 && endsInEightOrNine(b) && a > nextTen(b),
    steps: ({ a, b, answer }) => {
      const ten = nextTen(b);
      return [
        { label: `Take away ${ten}`, work: `${a} − ${ten}`, result: a - ten },
        { label: `Give back the extra ${ten - b}`, work: `${a - ten} + ${ten - b}`, result: answer },
      ];
    },
  },
  {
    id: "times-5",
    title: "Times 5",
    trick: "Halve the number, then multiply by 10.",
    operation: "×",
    targetSeconds: 4,
    example: multiply(68, 5),
    generate: (random) => multiply(int(random, 6, 49) * 2, 5),
    matches: (p) => {
      const n = timesOperand(p, 5);
      return n !== null && n >= 11 && n % 2 === 0;
    },
    steps: (p) => {
      const n = timesOperand(p, 5)!;
      return [
        { label: "Halve it", work: `${n} ÷ 2`, result: n / 2 },
        { label: "Times 10", work: `${n / 2} × 10`, result: p.answer },
      ];
    },
  },
  {
    id: "times-4",
    title: "Double, double",
    trick: "To multiply by 4, double the number, then double it again.",
    operation: "×",
    targetSeconds: 4,
    example: multiply(37, 4),
    generate: (random) => multiply(int(random, 13, 99), 4),
    matches: (p) => (timesOperand(p, 4) ?? 0) >= 11,
    steps: (p) => {
      const n = timesOperand(p, 4)!;
      return [
        { label: "Double it", work: `${n} × 2`, result: n * 2 },
        { label: "Double again", work: `${n * 2} × 2`, result: p.answer },
      ];
    },
  },
  {
    id: "break-apart",
    title: "Break it apart",
    trick: "Multiply the tens and the ones separately, then add them.",
    operation: "×",
    targetSeconds: 6,
    example: multiply(34, 7),
    generate: (random) => {
      const tens = int(random, 1, 9) * 10;
      return multiply(tens + int(random, 1, 9), pick(random, [3, 6, 7, 8]));
    },
    matches: (p) => {
      if (p.operation !== "×") return false;
      const [big, small] = bigSmall(p);
      return small >= 2 && small <= 9 && big >= 11 && big <= 99 && big % 10 !== 0;
    },
    steps: (p) => {
      const [big, small] = bigSmall(p);
      const tens = big - (big % 10);
      return [
        { label: "Tens", work: `${tens} × ${small}`, result: tens * small },
        { label: "Ones", work: `${big % 10} × ${small}`, result: (big % 10) * small },
        { label: "Add them", work: `${tens * small} + ${(big % 10) * small}`, result: p.answer },
      ];
    },
  },
  {
    id: "divide-5",
    title: "Divide by 5",
    trick: "Double the number, then divide by 10.",
    operation: "÷",
    targetSeconds: 4,
    example: divide(345, 5),
    generate: (random) => divide(int(random, 12, 99) * 5, 5),
    matches: ({ a, b, operation }) => operation === "÷" && b === 5 && a >= 20 && a % 5 === 0,
    steps: ({ a, answer }) => [
      { label: "Double it", work: `${a} × 2`, result: a * 2 },
      { label: "Divide by 10", work: `${a * 2} ÷ 10`, result: answer },
    ],
  },
  {
    id: "square-5",
    title: "Squares ending in 5",
    trick: "Multiply the tens digit by the next number up, then put 25 on the end.",
    operation: "×",
    targetSeconds: 5,
    example: multiply(65, 65),
    generate: (random) => {
      // Up to 115², so a set of ten has no repeats (105² is 10 × 11, then 25).
      const n = int(random, 1, 11) * 10 + 5;
      return multiply(n, n);
    },
    matches: ({ a, b, operation }) => operation === "×" && a === b && a % 10 === 5 && a >= 15 && a <= 195,
    steps: ({ a, answer }) => {
      const tens = Math.floor(a / 10);
      return [
        { label: `${tens} times the next number up`, work: `${tens} × ${tens + 1}`, result: tens * (tens + 1) },
        { label: "Put 25 on the end", work: `${tens * (tens + 1)} then 25`, result: answer },
      ];
    },
  },
];

export function getLesson(id: string): Lesson | null {
  return LESSONS.find((lesson) => lesson.id === id) ?? null;
}

export function isFreeLesson(id: LessonId) {
  return LESSON_IDS.indexOf(id) < FREE_LESSON_COUNT;
}

export function isLessonId(id: unknown): id is LessonId {
  return typeof id === "string" && (LESSON_IDS as readonly string[]).includes(id);
}

/** The problems for one lesson set, all different. */
export function createLessonProblems(lesson: Lesson, random: () => number = Math.random): Problem[] {
  const problems: Problem[] = [];
  const seen = new Set<string>();
  for (let tries = 0; problems.length < LESSON_SET_SIZE && tries < 500; tries++) {
    const problem = lesson.generate(random);
    const key = `${problem.a}${problem.operation}${problem.b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    problems.push(problem);
  }
  return problems;
}

// Most specific first: 45 × 45 is a square ending in 5 before it is "break it apart".
const MATCH_ORDER: LessonId[] = [
  "square-5",
  "times-11",
  "times-9",
  "times-5",
  "times-4",
  "divide-5",
  "break-apart",
  "pairs-of-ten",
  "make-ten",
  "round-up-add",
  "round-up-subtract",
  "count-up",
];

/** The lesson whose trick fits a problem, if any. */
export function findLessonFor(problem: Problem): Lesson | null {
  for (const id of MATCH_ORDER) {
    const lesson = getLesson(id)!;
    if (lesson.matches(problem)) return lesson;
  }
  return null;
}

export function formatStep(step: LessonStep) {
  return `${step.label}: ${step.work} = ${step.result}`;
}

/** A lesson's trick as a tip, for the explanations shown when a problem is missed. */
export function lessonTip(lesson: Lesson, problem: Problem): MathTip {
  const steps = lesson.steps(problem).map(formatStep);
  return { title: lesson.title, technique: lesson.trick, description: steps.join(". "), steps };
}

export type LessonResult = {
  /** Problems done on their own (not guided, not coming back after a miss). */
  soloCount: number;
  soloFirstTry: number;
  /** Average seconds for the solo problems answered right first time; null if none. */
  soloAverageSeconds: number | null;
};

export function isLessonMastered(lesson: Lesson, result: LessonResult) {
  return (
    result.soloCount >= LESSON_SOLO &&
    result.soloFirstTry >= LESSON_MASTERY_FIRST_TRY &&
    result.soloAverageSeconds !== null &&
    result.soloAverageSeconds <= lesson.targetSeconds
  );
}

export type StoredLessonProgress = {
  plays: number;
  bestFirstTry: number;
  bestAverageSeconds: number | null;
  masteredAt: Date | null;
};

/** A finished lesson folded into the saved progress: the best run, and mastered once, for good. */
export function mergeLessonProgress(
  lesson: Lesson,
  saved: StoredLessonProgress | null,
  result: LessonResult,
  now: Date,
): StoredLessonProgress {
  const better =
    !saved ||
    result.soloFirstTry > saved.bestFirstTry ||
    (result.soloFirstTry === saved.bestFirstTry &&
      result.soloAverageSeconds !== null &&
      (saved.bestAverageSeconds === null || result.soloAverageSeconds < saved.bestAverageSeconds));
  return {
    plays: (saved?.plays ?? 0) + 1,
    bestFirstTry: better ? result.soloFirstTry : saved.bestFirstTry,
    bestAverageSeconds: better ? result.soloAverageSeconds : saved.bestAverageSeconds,
    masteredAt: saved?.masteredAt ?? (isLessonMastered(lesson, result) ? now : null),
  };
}
