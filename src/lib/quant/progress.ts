import { isQuantFamily } from "./review";

/**
 * Per-type and per-puzzle progress, read from saved answers: a type is solved once any answer
 * of it was right first time, and tried once it has any answer at all.
 */

export type QuantMark = "solved" | "tried";
export type QuantMarks = {
  /** By lesson, then question type. */
  types: Record<string, Record<string, QuantMark>>;
  /** By puzzle id. */
  puzzles: Record<string, QuantMark>;
};

const PUZZLE = "puzzle:";

export function buildQuantMarks(rows: { lessonId: string; family: string; correct: boolean }[]): QuantMarks {
  const marks: QuantMarks = { types: {}, puzzles: {} };
  for (const row of rows) {
    if (!isQuantFamily(row.lessonId, row.family)) continue;
    const mark: QuantMark = row.correct ? "solved" : "tried";
    if (row.family.startsWith(PUZZLE)) {
      const id = row.family.slice(PUZZLE.length);
      if (marks.puzzles[id] !== "solved") marks.puzzles[id] = mark;
    } else {
      const lesson = (marks.types[row.lessonId] ??= {});
      if (lesson[row.family] !== "solved") lesson[row.family] = mark;
    }
  }
  return marks;
}
