import { QUANT_TOPICS, getQuantLesson, type QuantTopic } from "./lessons";

/**
 * How mock tests are going over time: each mock's results by unit, and each unit's trend
 * across recent mocks. A unit gets a question or two per mock, so trends are read over
 * several mocks, not one.
 */

/** Mocks a unit's results are read over. */
export const TOPIC_WINDOW = 5;
/** How much better or worse the latest mock must be than the ones before to count as a trend. */
const TREND_STEP = 0.2;

export type TopicResult = { right: number; total: number };
export type MockTopics = Partial<Record<QuantTopic, TopicResult>>;

/** One mock's right and total by unit, from its saved questions. */
export function mockTopics(questions: unknown): MockTopics {
  const topics: MockTopics = {};
  if (!Array.isArray(questions)) return topics;
  for (const q of questions as { lessonId?: unknown; correct?: unknown }[]) {
    const lesson = typeof q?.lessonId === "string" ? getQuantLesson(q.lessonId) : null;
    if (!lesson) continue;
    const row = (topics[lesson.topic] ??= { right: 0, total: 0 });
    row.total++;
    if (q.correct === true) row.right++;
  }
  return topics;
}

export type TopicTrend = {
  topic: QuantTopic;
  number: number;
  title: string;
  right: number;
  total: number;
  /** The latest mock against the earlier ones in the window; null when there's too little to say. */
  trend: "up" | "down" | null;
};

/** Each unit over the last TOPIC_WINDOW mocks (newest first in), weakest first. */
export function topicTrends(mocks: { topics: MockTopics }[]): TopicTrend[] {
  const recent = mocks.slice(0, TOPIC_WINDOW);
  const rows: TopicTrend[] = [];
  for (const unit of QUANT_TOPICS) {
    const results = recent.map((m) => m.topics[unit.id]).filter((r): r is TopicResult => !!r && r.total > 0);
    if (!results.length) continue;
    const right = results.reduce((sum, r) => sum + r.right, 0);
    const total = results.reduce((sum, r) => sum + r.total, 0);
    const latest = recent[0]?.topics[unit.id];
    const earlier = recent.slice(1).map((m) => m.topics[unit.id]).filter((r): r is TopicResult => !!r && r.total > 0);
    let trend: TopicTrend["trend"] = null;
    if (latest && latest.total > 0 && earlier.length) {
      const before = earlier.reduce((sum, r) => sum + r.right, 0) / earlier.reduce((sum, r) => sum + r.total, 0);
      const now = latest.right / latest.total;
      if (now - before >= TREND_STEP) trend = "up";
      else if (before - now >= TREND_STEP) trend = "down";
    }
    rows.push({ topic: unit.id, number: unit.number, title: unit.title, right, total, trend });
  }
  return rows.sort((a, b) => a.right / a.total - b.right / b.total || a.number - b.number);
}
