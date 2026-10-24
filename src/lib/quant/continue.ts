import { QUANT_LESSONS, getQuantLesson } from "./lessons";

/**
 * Where to pick the course up: the lesson touched last, and its next step. Read but not
 * mastered means practise; mastered means the next lesson, from its start.
 */
export type QuantContinue = { lessonId: string; step: "learn" | "practice" };

export type QuantActivity = { lessonId: string; at: Date };

export function quantContinue(activity: QuantActivity[], read: ReadonlySet<string>, mastered: ReadonlySet<string>): QuantContinue | null {
  const latest = activity.filter((a) => getQuantLesson(a.lessonId)).sort((a, b) => b.at.getTime() - a.at.getTime())[0];
  if (!latest) return null;
  if (!mastered.has(latest.lessonId)) return { lessonId: latest.lessonId, step: read.has(latest.lessonId) ? "practice" : "learn" };
  // Mastered: the first lesson after it that isn't, or nothing when the course is done.
  const from = QUANT_LESSONS.findIndex((l) => l.id === latest.lessonId);
  const next = [...QUANT_LESSONS.slice(from + 1), ...QUANT_LESSONS.slice(0, from)].find((l) => !mastered.has(l.id));
  return next ? { lessonId: next.id, step: read.has(next.id) ? "practice" : "learn" } : null;
}
