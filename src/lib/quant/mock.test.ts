import assert from "node:assert/strict";
import test from "node:test";
import { MOCK_BLUEPRINT, MOCK_QUESTIONS, MOCK_TOTAL, buildMock, isMockShape, mockRating, practiceTypeOf, scoreMock } from "./mock";
import { QUANT_LESSONS, generateFromFamily, getQuantLesson } from "./lessons";

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
    for (const q of mock) {
      assert.equal(q.problem.family, q.family);
      assert.ok(getQuantLesson(q.lessonId)!.mockFamilies.some((f) => f.id === q.family), `${q.lessonId}/${q.family} isn't a mock type`);
    }
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

/** A prompt with its numbers taken out, so two questions of one type read the same. */
const template = (prompt: string) => prompt.replace(/[\d.,]+/g, "#").replace(/\s+/g, " ").trim();

test("every lesson has mock types of its own, each mirroring a practice type", () => {
  for (const lesson of QUANT_LESSONS) {
    assert.ok(lesson.mockFamilies.length >= 2, `${lesson.id}: ${lesson.mockFamilies.length} mock types`);
    const ids = [...lesson.families, ...lesson.mockFamilies].map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length, `${lesson.id}: a mock type shares an id`);
    for (const family of lesson.mockFamilies) {
      const label = `${lesson.id}/${family.id}`;
      assert.ok(lesson.families.some((f) => f.id === family.practice), `${label} mirrors no practice type`);
      assert.equal(practiceTypeOf(lesson.id, family.id), family.practice);
      assert.ok(family.title.length > 0 && family.title.length <= 48, `${label}: "${family.title}"`);
      const random = seeded(family.id.length * 31 + 7);
      const keys = new Set(Array.from({ length: 200 }, () => generateFromFamily(family, random).key));
      assert.ok(keys.size >= 3, `${label}: only ${keys.size} different questions`);
    }
  }
});

test("mock questions are never practice questions", () => {
  for (const lesson of QUANT_LESSONS) {
    const random = seeded(lesson.id.length * 13 + 5);
    const practice = [lesson.example, ...lesson.families.flatMap((f) => Array.from({ length: 150 }, () => generateFromFamily(f, random)))];
    const keys = new Set(practice.map((p) => p.key));
    const templates = new Set(practice.map((p) => template(p.prompt)));
    for (const family of lesson.mockFamilies) {
      for (let i = 0; i < 100; i++) {
        const problem = generateFromFamily(family, random);
        assert.ok(!keys.has(problem.key), `${lesson.id}/${family.id}: ${problem.key} is also a practice key`);
        assert.ok(!templates.has(template(problem.prompt)), `${lesson.id}/${family.id} reads like practice: ${problem.prompt}`);
      }
    }
  }
});

test("a mock answer counts towards the practice type it mirrors", () => {
  const lesson = QUANT_LESSONS[0];
  const [mockType] = lesson.mockFamilies;
  assert.equal(practiceTypeOf(lesson.id, mockType.id), mockType.practice);
  // Answers from mocks started before the mock types still score, and stand for themselves.
  assert.equal(practiceTypeOf(lesson.id, lesson.families[0].id), lesson.families[0].id);
  const old = buildMock(seeded(2)).map((q) => ({ lessonId: q.lessonId, family: getQuantLesson(q.lessonId)!.families[0].id, correct: true, seconds: 5 }));
  assert.equal(scoreMock(old)!.score, 100);
});
