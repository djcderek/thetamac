import assert from "node:assert/strict";
import test from "node:test";
import { MAX_STANDARD_SCORE, maxPlausibleScore } from "./standard-timed-sessions";

test("the score cap is set per difficulty for 2:00 and scales with the time limit", () => {
  assert.equal(maxPlausibleScore("easy", 120), 250);
  assert.equal(maxPlausibleScore("medium", 120), 200);
  assert.equal(maxPlausibleScore("hard", 120), 175);
  assert.equal(maxPlausibleScore("expert", 120), 175);
  assert.equal(maxPlausibleScore("easy", 60), 125);
  assert.equal(maxPlausibleScore("medium", 300), 500);
  assert.equal(MAX_STANDARD_SCORE, 200);
});
