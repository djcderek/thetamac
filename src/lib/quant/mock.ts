import type { QuantDifficulty, QuantProblem, Random } from "./build";
import { QUANT_LESSONS, QUANT_TOPICS, generateFromFamily, getQuantLesson, type QuantLesson, type QuantTopic } from "./lessons";

/**
 * The mock test: a timed set from across the course, like a first-round quant screen. Answers
 * aren't marked until the end. Harder questions are worth more, and the points add up to 100.
 * Its questions come from each lesson's mock types, which practice never uses.
 */

export const MOCK_MINUTES = 20;
export const MOCK_POINTS: Record<QuantDifficulty, number> = { Easy: 7, Medium: 10, Hard: 12 };
/** How many questions of each difficulty: 2 × 7 + 5 × 10 + 3 × 12 = 100. */
export const MOCK_BLUEPRINT: Record<QuantDifficulty, number> = { Easy: 2, Medium: 5, Hard: 3 };
export const MOCK_QUESTIONS = MOCK_BLUEPRINT.Easy + MOCK_BLUEPRINT.Medium + MOCK_BLUEPRINT.Hard;
export const MOCK_TOTAL = (Object.keys(MOCK_BLUEPRINT) as QuantDifficulty[]).reduce((sum, d) => sum + MOCK_BLUEPRINT[d] * MOCK_POINTS[d], 0);
/** Mocks a free account can take before it needs Pro. */
export const MOCK_FREE = 1;

export type MockQuestion = { lessonId: string; family: string; difficulty: QuantDifficulty; points: number; problem: QuantProblem };
export type MockAnswer = { lessonId: string; family: string; correct: boolean; seconds: number };

const ORDER: QuantDifficulty[] = ["Easy", "Medium", "Hard"];

/**
 * Whether a type can be a mock answer: one of the lesson's mock types, or a practice type from
 * mocks started before the mock types existed.
 */
const isMockType = (lesson: QuantLesson, family: string) => lesson.mockFamilies.some((f) => f.id === family) || lesson.families.some((f) => f.id === family);

/** The practice type a mock answer counts towards, for review; a practice type is its own. */
export function practiceTypeOf(lessonId: string, family: string): string {
  return getQuantLesson(lessonId)?.mockFamilies.find((f) => f.id === family)?.practice ?? family;
}
const unitNumber = (topic: QuantTopic) => QUANT_TOPICS.find((t) => t.id === topic)!.number;

function shuffle<T>(values: T[], random: Random): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A fresh mock: each question from a different lesson, spread over as many units as the
 * blueprint allows (no unit twice until every unit with a lesson of that level has one), and
 * a random mock type within each lesson. Easier questions come first, as in most screens.
 */
export function buildMock(random: Random = Math.random): MockQuestion[] {
  const picked: MockQuestion[] = [];
  const perUnit = new Map<QuantTopic, number>();
  for (const difficulty of ORDER) {
    const pool = shuffle(QUANT_LESSONS.filter((lesson) => lesson.difficulty === difficulty), random);
    for (let n = 0; n < MOCK_BLUEPRINT[difficulty]; n++) {
      const used = new Set(picked.map((q) => q.lessonId));
      const open = pool.filter((lesson) => !used.has(lesson.id));
      // The lesson from the least-used unit; the pool is shuffled, so ties fall at random.
      const lesson = open.reduce((best, l) => ((perUnit.get(l.topic) ?? 0) < (perUnit.get(best.topic) ?? 0) ? l : best), open[0]);
      perUnit.set(lesson.topic, (perUnit.get(lesson.topic) ?? 0) + 1);
      const family = lesson.mockFamilies[Math.floor(random() * lesson.mockFamilies.length)];
      picked.push({ lessonId: lesson.id, family: family.id, difficulty, points: MOCK_POINTS[difficulty], problem: generateFromFamily(family, random) });
    }
  }
  return picked.sort((a, b) => ORDER.indexOf(a.difficulty) - ORDER.indexOf(b.difficulty) || unitNumber(getQuantLesson(a.lessonId)!.topic) - unitNumber(getQuantLesson(b.lessonId)!.topic));
}

/** What a score means, in the terms interviewers use, highest first. */
export const MOCK_RATINGS = [
  { min: 85, label: "Strong pass", note: "Accurate and quick across the course. This is the standard first-round screens look for." },
  { min: 70, label: "Pass", note: "Solid, with a weak spot or two. Drill the topics marked below before the real thing." },
  { min: 55, label: "Borderline", note: "Some topics are there and some aren’t yet. Start with the lowest below." },
  { min: 0, label: "Not yet", note: "Work through the lessons for the topics below, then take another mock." },
] as const;

export const mockRating = (score: number) => MOCK_RATINGS.find((rating) => score >= rating.min)!;

export type MockTopicResult = { topic: QuantTopic; title: string; right: number; total: number };

/** Points for each right answer, by its lesson's difficulty; null if an answer isn't from the course. */
export function scoreMock(answers: MockAnswer[]): { score: number; correct: number; total: number; byTopic: MockTopicResult[] } | null {
  let score = 0;
  const byTopic = new Map<QuantTopic, MockTopicResult>();
  for (const answer of answers) {
    const lesson = getQuantLesson(answer.lessonId);
    if (!lesson || !isMockType(lesson, answer.family)) return null;
    if (answer.correct) score += MOCK_POINTS[lesson.difficulty];
    const unit = QUANT_TOPICS.find((t) => t.id === lesson.topic)!;
    const row = byTopic.get(unit.id) ?? { topic: unit.id, title: unit.title, right: 0, total: 0 };
    row.total++;
    if (answer.correct) row.right++;
    byTopic.set(unit.id, row);
  }
  return {
    score,
    correct: answers.filter((a) => a.correct).length,
    total: answers.length,
    byTopic: [...byTopic.values()].sort((a, b) => unitNumber(a.topic) - unitNumber(b.topic)),
  };
}

/** Whether a set of answers has the mock's shape: the blueprint's mix, each lesson once. */
export function isMockShape(answers: MockAnswer[]): boolean {
  if (answers.length !== MOCK_QUESTIONS || new Set(answers.map((a) => a.lessonId)).size !== answers.length) return false;
  const counts: Record<QuantDifficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const answer of answers) {
    const lesson = getQuantLesson(answer.lessonId);
    if (!lesson) return false;
    counts[lesson.difficulty]++;
  }
  return ORDER.every((d) => counts[d] === MOCK_BLUEPRINT[d]);
}
