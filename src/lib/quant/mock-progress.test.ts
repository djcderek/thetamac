import assert from "node:assert/strict";
import test from "node:test";
import { mockTopics, topicTrends } from "./mock-progress";
import { QUANT_LESSONS } from "./lessons";

const lessonIn = (topic: string) => QUANT_LESSONS.find((l) => l.topic === topic)!.id;
const counting = lessonIn("counting");
const conditional = lessonIn("conditional");

test("a mock's questions are added up by unit, and bad rows are skipped", () => {
  const topics = mockTopics([
    { lessonId: counting, correct: true },
    { lessonId: counting, correct: false },
    { lessonId: conditional, correct: true },
    { lessonId: "gone", correct: true },
    null,
  ]);
  assert.deepEqual(topics, { counting: { right: 1, total: 2 }, conditional: { right: 1, total: 1 } });
  assert.deepEqual(mockTopics("not a list"), {});
});

test("units are read over recent mocks, weakest first, with the latest mock's trend", () => {
  const mocks = [
    // Newest first: counting all right now after misses before; conditional slipping.
    { topics: { counting: { right: 2, total: 2 }, conditional: { right: 0, total: 1 } } },
    { topics: { counting: { right: 0, total: 2 }, conditional: { right: 1, total: 1 } } },
    { topics: { counting: { right: 1, total: 2 }, conditional: { right: 1, total: 1 } } },
  ];
  const rows = topicTrends(mocks);
  assert.deepEqual(rows.map((r) => [r.topic, r.right, r.total, r.trend]), [
    ["counting", 3, 6, "up"],
    ["conditional", 2, 3, "down"],
  ]);
});

test("one mock, or no change, gives no trend; only the last five mocks count", () => {
  assert.equal(topicTrends([{ topics: { counting: { right: 1, total: 2 } } }])[0].trend, null);
  const same = Array.from({ length: 7 }, () => ({ topics: { counting: { right: 1, total: 2 } } }));
  const row = topicTrends(same)[0];
  assert.equal(row.trend, null);
  assert.equal(row.total, 10);
});
