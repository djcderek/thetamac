/**
 * Every quant lesson, in course order. Lesson progress is stored under these IDs, so an ID
 * never changes once shipped.
 */
export const QUANT_LESSON_IDS = [
  // 1 Counting
  "multiplying-choices",
  "permutations",
  "combinations",
  "inclusion-exclusion",
  // 2 Probability basics
  "equally-likely",
  "complements",
  "or-events",
  "and-events",
  // 3 Conditional probability
  "conditional-probability",
  "splitting-cases",
  "bayes-rule",
  // 4 Expected value
  "expected-value",
  "linearity",
  "variance",
  // 5 Distributions
  "binomial",
  "geometric",
  "normal",
  // 6 Betting
  "implied-probability",
  "bet-ev",
  "house-edge",
  "kelly",
  // 7 Thinking in states
  "coupon-collector",
  "patterns",
  "random-walks",
  "optimal-stopping",
  // 8 Continuous probability
  "uniform",
  "area",
  "highest-lowest",
] as const;

export type QuantLessonId = (typeof QUANT_LESSON_IDS)[number];
