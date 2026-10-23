import { scheduleMisses, type ScheduledMiss } from "../review-schedule";
import { getQuantLesson } from "./lessons";

/**
 * Quant review: question types a player has missed, scheduled like arithmetic review. Questions
 * are generated, so a type comes back with fresh numbers; a classic puzzle comes back as itself.
 */

/** Most question types in one review set. */
export const QUANT_REVIEW_MAX = 12;
const PUZZLE = "puzzle:";

export type QuantAttemptRow = { lessonId: string; family: string; correct: boolean; createdAt: Date };
export type QuantReviewEntry = { lessonId: string; family: string };

/** Whether a lesson has this question type (or puzzle), so stored attempts stay askable. */
export function isQuantFamily(lessonId: string, family: string): boolean {
  const lesson = getQuantLesson(lessonId);
  if (!lesson) return false;
  if (family.startsWith(PUZZLE)) return lesson.puzzles.some((puzzle) => puzzle.id === family.slice(PUZZLE.length));
  return lesson.families.some((f) => f.id === family);
}

/** Due and waiting question types, most-missed first. Types no longer in the course drop out. */
export function buildQuantReview(rows: QuantAttemptRow[], now: Date): { due: ScheduledMiss<QuantReviewEntry>[]; waiting: ScheduledMiss<QuantReviewEntry>[] } {
  const keyed = rows
    .filter((row) => isQuantFamily(row.lessonId, row.family))
    .map((row) => ({
      key: `${row.lessonId}/${row.family}`,
      isCorrect: row.correct,
      createdAt: row.createdAt,
      item: { lessonId: row.lessonId, family: row.family },
    }));
  return scheduleMisses(keyed, now);
}

/** A question type's name for lists: the type's title, or the puzzle's. */
export function quantFamilyTitle(lessonId: string, family: string): string {
  const lesson = getQuantLesson(lessonId);
  if (!lesson) return family;
  if (family.startsWith(PUZZLE)) return lesson.puzzles.find((p) => p.id === family.slice(PUZZLE.length))?.title ?? family;
  return lesson.families.find((f) => f.id === family)?.title ?? family;
}
