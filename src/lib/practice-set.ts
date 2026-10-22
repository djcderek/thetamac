import type { Problem } from "@/components/training/training-types";

export const PRACTICE_SET_SIZES = [10, 20, 30] as const;
export const DEFAULT_PRACTICE_SET_SIZE = 20;
// A missed problem comes back after this many other problems, so it is recalled rather
// than reread straight off the screen.
const RETURN_GAP_MIN = 3;
const RETURN_GAP_MAX = 5;
// After this many returns a problem leaves the set (it stays on the review list) instead of
// looping until the player gives up.
export const MAX_RETURNS = 2;

export type PracticeCard = {
  problem: Problem;
  /** How many times this problem has already come back after a miss. */
  returns: number;
};

type WaitingCard = PracticeCard & { dueAt: number };

export type PracticeSetState = {
  size: number;
  /** Problems chosen up front (a retry of earlier misses); otherwise new ones are generated. */
  planned: Problem[];
  /** New problems dealt so far. */
  dealt: number;
  /** Problems shown so far, returns included. */
  presented: number;
  waiting: WaitingCard[];
  current: PracticeCard | null;
  /** Set problems finished: answered without a miss, or retired after their last return. */
  cleared: number;
  /** New problems answered right the first time they were shown. */
  firstTry: number;
  /** Each problem missed at least once, in the order it was first missed. */
  missed: Problem[];
};

export function problemKey(problem: Problem) {
  return `${problem.a}${problem.operation}${problem.b}`;
}

export function createPracticeSet(size: number, planned: Problem[] = []): PracticeSetState {
  return {
    size: planned.length > 0 ? planned.length : size,
    planned,
    dealt: 0,
    presented: 0,
    waiting: [],
    current: null,
    cleared: 0,
    firstTry: 0,
    missed: [],
  };
}

/**
 * Picks the next problem: a missed one that is due, else a new one, else (once every new
 * problem is out) the next missed one early. Returns null when the set is finished.
 */
export function drawPracticeProblem(
  state: PracticeSetState,
  generate: () => Problem,
): { state: PracticeSetState; card: PracticeCard } | null {
  const soonest = state.waiting.reduce<number>(
    (best, card, index) => (best === -1 || card.dueAt < state.waiting[best].dueAt ? index : best),
    -1,
  );
  const due = soonest !== -1 && state.waiting[soonest].dueAt <= state.presented;

  let card: PracticeCard;
  let waiting = state.waiting;
  let dealt = state.dealt;
  if (due || (soonest !== -1 && state.dealt >= state.size)) {
    const { problem, returns } = state.waiting[soonest];
    card = { problem, returns };
    waiting = state.waiting.filter((_, index) => index !== soonest);
  } else if (state.dealt < state.size) {
    card = { problem: state.planned[state.dealt] ?? generate(), returns: 0 };
    dealt += 1;
  } else {
    return null;
  }

  return {
    state: { ...state, waiting, dealt, presented: state.presented + 1, current: card },
    card,
  };
}

/** Scores the current problem. A miss sends it back a few problems later, up to MAX_RETURNS. */
export function resolvePracticeProblem(
  state: PracticeSetState,
  missed: boolean,
  random: () => number = Math.random,
): PracticeSetState {
  const card = state.current;
  if (!card) return state;

  if (!missed) {
    return {
      ...state,
      current: null,
      cleared: state.cleared + 1,
      firstTry: state.firstTry + (card.returns === 0 ? 1 : 0),
    };
  }

  const key = problemKey(card.problem);
  const missedList = state.missed.some((problem) => problemKey(problem) === key)
    ? state.missed
    : [...state.missed, card.problem];

  if (card.returns >= MAX_RETURNS) {
    return { ...state, current: null, cleared: state.cleared + 1, missed: missedList };
  }

  const gap = RETURN_GAP_MIN + Math.floor(random() * (RETURN_GAP_MAX - RETURN_GAP_MIN + 1));
  return {
    ...state,
    current: null,
    missed: missedList,
    waiting: [...state.waiting, { problem: card.problem, returns: card.returns + 1, dueAt: state.presented + gap }],
  };
}
