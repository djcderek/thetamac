import assert from "node:assert/strict";
import test from "node:test";
import { formatAnswer, formatDollars, formatPercent, formatResult, isRightAnswer, q, readAnswer } from "./rational";

test("fractions stay reduced and signed on top", () => {
  assert.deepEqual(q(6, 36), { n: 1, d: 6 });
  assert.deepEqual(q(3, -9), { n: -1, d: 3 });
  assert.throws(() => q(1, 0));
});

test("a sixth can be typed as a fraction, a decimal or a percentage", () => {
  const sixth = q(1, 6);
  for (const typed of ["1/6", "2/12", "0.167", ".1667", "16.7%", "16.67 %"]) assert.ok(isRightAnswer(typed, sixth, "probability"), typed);
  // Two figures is too rough to count.
  for (const typed of ["0.17", "17%", "1/5", "", "1/0", "abc"]) assert.ok(!isRightAnswer(typed, sixth, "probability"), typed);
});

test("percent questions take 20, 20%, 0.2 or 1/5", () => {
  for (const typed of ["20", "20%", "0.2", "1/5"]) assert.ok(isRightAnswer(typed, q(1, 5), "percent"), typed);
  assert.ok(!isRightAnswer("2", q(1, 5), "percent"));
});

test("dollar answers ignore the sign and the dollar mark", () => {
  assert.ok(isRightAnswer("$1.67", q(5, 3), "dollars"));
  assert.ok(isRightAnswer("−0.33", q(-1, 3), "dollars"));
  assert.ok(isRightAnswer("-$0.33", q(-1, 3), "dollars"));
  assert.ok(!isRightAnswer("0.33", q(-1, 3), "dollars"));
  assert.deepEqual(readAnswer("1,000", "number"), [1000]);
});

test("answers are shown exact, with the rounded value where it helps", () => {
  assert.equal(formatAnswer(q(4, 13), "probability"), "4/13 ≈ 30.8%");
  assert.equal(formatAnswer(q(1, 4), "probability"), "1/4 = 25%");
  assert.equal(formatAnswer(q(17, 4), "dollars"), "$4.25");
  assert.equal(formatAnswer(q(5, 6), "dollars"), "≈ $0.83");
  assert.equal(formatAnswer(q(5, 13), "number"), "5/13 ≈ 0.385");
  assert.equal(formatAnswer(q(2, 38), "percent"), "≈ 5.26%");
  assert.equal(formatResult(q(7, 2), "number"), "3.5");
  assert.equal(formatPercent(q(1, 37)), "2.7%");
  assert.equal(formatDollars(q(-4, 3)), "−$1.33");
});
