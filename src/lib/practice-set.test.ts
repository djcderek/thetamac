import assert from "node:assert/strict";
import test from "node:test";
import type { Problem } from "@/components/training/training-types";
import {
  MAX_RETURNS,
  createPracticeSet,
  drawPracticeProblem,
  problemKey,
  resolvePracticeProblem,
  type PracticeSetState,
} from "./practice-set";

function counter() {
  let n = 0;
  return (): Problem => {
    n += 1;
    return { a: n, b: 1, operation: "+", answer: n + 1 };
  };
}

/** Plays a set to the end, missing a problem whenever `miss` says so. Returns the keys shown. */
function play(state: PracticeSetState, miss: (problem: Problem, returns: number) => boolean, random = () => 0) {
  const generate = counter();
  const shown: string[] = [];
  for (let guard = 0; guard < 500; guard++) {
    const drawn = drawPracticeProblem(state, generate);
    if (!drawn) return { state, shown };
    shown.push(problemKey(drawn.card.problem));
    state = resolvePracticeProblem(drawn.state, miss(drawn.card.problem, drawn.card.returns), random);
  }
  throw new Error("set never finished");
}

test("a clean set ends after its size, every problem right first time", () => {
  const { state, shown } = play(createPracticeSet(10), () => false);
  assert.equal(shown.length, 10);
  assert.equal(state.cleared, 10);
  assert.equal(state.firstTry, 10);
  assert.deepEqual(state.missed, []);
});

test("a missed problem comes back three to five problems later", () => {
  for (const [random, gap] of [[0, 3], [0.99, 5]] as const) {
    const { shown } = play(createPracticeSet(10), (problem, returns) => problem.a === 2 && returns === 0, () => random);
    const first = shown.indexOf("2+1");
    const second = shown.indexOf("2+1", first + 1);
    assert.equal(second - first - 1, gap);
  }
});

test("a problem missed every time is retired after its last return, and the set still ends", () => {
  const { state, shown } = play(createPracticeSet(5), (problem) => problem.a === 1);
  assert.equal(shown.filter((key) => key === "1+1").length, 1 + MAX_RETURNS);
  assert.equal(state.cleared, 5);
  assert.equal(state.firstTry, 4);
  assert.deepEqual(state.missed.map(problemKey), ["1+1"]);
});

test("misses left at the end of a set are asked before it finishes", () => {
  const { state, shown } = play(createPracticeSet(3), (problem, returns) => problem.a === 3 && returns === 0);
  assert.deepEqual(shown, ["1+1", "2+1", "3+1", "3+1"]);
  assert.equal(state.cleared, 3);
  assert.equal(state.firstTry, 2);
});

test("a problem answered after coming back clears it but is not a first-try answer", () => {
  const { state } = play(createPracticeSet(6), (problem, returns) => problem.a <= 2 && returns === 0);
  assert.equal(state.cleared, 6);
  assert.equal(state.firstTry, 4);
  assert.deepEqual(state.missed.map(problemKey), ["1+1", "2+1"]);
});

test("a retry set asks the planned problems in order and sizes itself to them", () => {
  const planned: Problem[] = [
    { a: 7, b: 8, operation: "×", answer: 56 },
    { a: 63, b: 9, operation: "÷", answer: 7 },
  ];
  const { state, shown } = play(createPracticeSet(20, planned), () => false);
  assert.equal(state.size, 2);
  assert.deepEqual(shown, ["7×8", "63÷9"]);
});
