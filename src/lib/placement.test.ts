import assert from "node:assert/strict";
import test from "node:test";
import { formatPlacement } from "./placement";

test("placement uses correct ordinals and calls out the top", () => {
  assert.equal(formatPlacement(null), "Not enough data yet");
  assert.equal(formatPlacement(100), "Top 1%");
  assert.equal(formatPlacement(99.2), "Top 1%");
  assert.equal(formatPlacement(21), "21st percentile");
  assert.equal(formatPlacement(22.4), "22nd percentile");
  assert.equal(formatPlacement(23), "23rd percentile");
  assert.equal(formatPlacement(11), "11th percentile");
  assert.equal(formatPlacement(12.6), "13th percentile");
  assert.equal(formatPlacement(38.5), "39th percentile");
  assert.equal(formatPlacement(0), "1st percentile");
});
