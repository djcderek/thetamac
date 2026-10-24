import assert from "node:assert/strict";
import test from "node:test";
import { MOCK_BLUEPRINT, MOCK_QUESTIONS, MOCK_TOTAL, buildMock, isMockShape, mockRating, scoreMock } from "./mock";
import { getQuantLesson } from "./lessons";

function seeded(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

test("the points add up to 100", () => {
  assert.equal(MOCK_TOTAL, 100);
});

test("a mock follows the blueprint, one question per lesson, easier first, across many units", () => {
  for (let s = 1; s <= 40; s++) {
    const mock = buildMock(seeded(s));
    assert.equal(mock.length, MOCK_QUESTIONS);
    assert.equal(new Set(mock.map((q) => q.lessonId)).size, MOCK_QUESTIONS);
    for (const d of ["Easy", "Medium", "Hard"] as const) assert.equal(mock.filter((q) => q.difficulty === d).length, MOCK_BLUEPRINT[d]);
    assert.deepEqual(mock.map((q) => q.difficulty), [...mock.map((q) => q.difficulty)].sort((a, b) => ["Easy", "Medium", "Hard"].indexOf(a) - ["Easy", "Medium", "Hard"].indexOf(b)));
    const units = new Set(mock.map((q) => getQuantLesson(q.lessonId)!.topic));
    assert.ok(units.size >= 6, `only ${units.size} units`);
    for (const q of mock) assert.equal(q.problem.family, q.family);
    assert.ok(isMockShape(mock.map((q) => ({ lessonId: q.lessonId, family: q.family, correct: true, seconds: 10 }))));
  }
});

test("a mock is scored by difficulty and broken down by unit", () => {
  const mock = buildMock(seeded(7));
  const all = scoreMock(mock.map((q) => ({ lessonId: q.lessonId, family: q.family, correct: true, seconds: 30 })))!;
  assert.equal(all.score, 100);
  assert.equal(all.correct, MOCK_QUESTIONS);
  assert.equal(all.byTopic.reduce((sum, t) => sum + t.total, 0), MOCK_QUESTIONS);
  const hardOnly = scoreMock(mock.map((q) => ({ lessonId: q.lessonId, family: q.family, correct: q.difficulty === "Hard", seconds: 30 })))!;
  assert.equal(hardOnly.score, 36);
  assert.equal(scoreMock([{ lessonId: mock[0].lessonId, family: "made-up", correct: true, seconds: 1 }]), null);
});

test("ratings follow the score", () => {
  assert.equal(mockRating(100).label, "Strong pass");
  assert.equal(mockRating(85).label, "Strong pass");
  assert.equal(mockRating(84).label, "Pass");
  assert.equal(mockRating(55).label, "Borderline");
  assert.equal(mockRating(0).label, "Not yet");
});

test("answers that don't match the blueprint aren't a mock", () => {
  const mock = buildMock(seeded(3)).map((q) => ({ lessonId: q.lessonId, family: q.family, correct: true, seconds: 5 }));
  assert.equal(isMockShape(mock.slice(1)), false);
  assert.equal(isMockShape([...mock.slice(1), mock[1]]), false);
});
