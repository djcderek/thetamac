"use client";

import { useRouter } from "next/navigation";
import { getQuantLesson, getQuantPuzzle } from "@/lib/quant/lessons";
import { QuantQuestion } from "@/components/quant/quant-question";

/**
 * One classic puzzle to try on a landing page, in the course's own question card: answer it,
 * see the worked solution, then carry on into the lesson it comes from.
 */
export function QuantSampleQuestion({ puzzleId }: { puzzleId: string }) {
  const router = useRouter();
  const puzzle = getQuantPuzzle(puzzleId)!;
  const lesson = getQuantLesson(puzzle.lesson)!;

  return (
    <QuantQuestion
      lesson={lesson}
      typeTitle={puzzle.title}
      problem={puzzle.problem}
      label="Sample question"
      nextLabel="Open the lesson"
      onFinish={() => {}}
      onNext={() => router.push(`/quant/${lesson.id}`)}
    />
  );
}
