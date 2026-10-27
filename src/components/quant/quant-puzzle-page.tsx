"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { QUANT_PUZZLES, QUANT_TOPICS, getQuantLesson, isFreeQuantLesson } from "@/lib/quant/lessons";
import { formatAnswer } from "@/lib/quant/rational";
import { DifficultyLabel } from "@/components/quant/difficulty";
import { MathText } from "@/components/quant/math";
import { QuantFigure } from "@/components/quant/visuals";
import { QuantQuestion } from "@/components/quant/quant-question";
import { Walkthrough } from "@/components/quant/walkthrough";
import { useQuantProgress } from "@/components/quant/quant-list";
import { markPuzzle, useQuantAccountSync } from "@/components/quant/type-progress";
import { recordQuantAttempt } from "@/components/quant/quant-attempts";
import { trackQuantUpgradeClick, useQuantGateViewed } from "@/components/quant/quant-analytics";

const SURFACE = "quant_puzzle_page";

/**
 * One classic puzzle on its own page: the question to answer, the worked solution (folded, but
 * in the page for search engines), and the lesson whose method solves it. Solving follows the
 * lesson's lock, as in its Drill step; the question and the solution are open to everyone.
 */
export function QuantPuzzlePage({ puzzleId }: { puzzleId: string }) {
  const router = useRouter();
  const { locked, signedIn, ready } = useQuantProgress();
  useQuantAccountSync();
  const index = QUANT_PUZZLES.findIndex((p) => p.id === puzzleId);
  const puzzle = QUANT_PUZZLES[index];
  const lesson = getQuantLesson(puzzle.lesson)!;
  const unit = QUANT_TOPICS.find((t) => t.id === lesson.topic)!;
  const previous = QUANT_PUZZLES[index - 1] ?? null;
  const next = QUANT_PUZZLES[index + 1] ?? null;
  const problem = { ...puzzle.problem, family: `puzzle:${puzzle.id}` };
  const isLocked = locked && !isFreeQuantLesson(lesson.id);
  useQuantGateViewed(SURFACE, ready && isLocked, signedIn, { lesson_id: lesson.id, puzzle_id: puzzle.id });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 md:px-6 md:pt-10">
      <Link href="/quant/puzzles" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-4 px-2.5")}>
        <ChevronLeft aria-hidden="true" />
        Puzzles
      </Link>
      <header className="mb-6 px-1">
        <p className="text-[13px] font-medium text-muted-foreground">
          Puzzle {index + 1} of {QUANT_PUZZLES.length} · <DifficultyLabel difficulty={puzzle.difficulty} />
        </p>
        <h1 className="mt-1.5 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[44px]">{puzzle.title}</h1>
      </header>

      {isLocked ? (
        <section className="overflow-hidden rounded-[20px] border border-border bg-background">
          <div className="space-y-5 px-5 py-6 sm:px-6">
            <p className="text-[19px] leading-8">
              <MathText text={problem.prompt} />
            </p>
            {problem.visual && (
              <div className="rounded-[18px] bg-secondary px-3 py-4">
                <QuantFigure visual={problem.visual} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
            <p className="text-[14px] leading-5 text-muted-foreground">Answering puzzles from {lesson.title} is part of Pro.</p>
            <Link
              href={getUpgradeUrl({ feature: "quant", source: SURFACE, next: `/quant/puzzles/${puzzle.id}` })}
              onClick={() => trackQuantUpgradeClick(SURFACE, { lesson_id: lesson.id, puzzle_id: puzzle.id })}
              className={buttonVariants({ variant: "brand", size: "sm" })}
            >
              <Lock aria-hidden="true" className="h-3.5 w-3.5" />
              Unlock with Pro
            </Link>
          </div>
        </section>
      ) : (
        <QuantQuestion
          lesson={lesson}
          typeTitle="Puzzle"
          problem={problem}
          label="Your answer"
          onFinish={({ clean, seconds }) => {
            markPuzzle(puzzle.id, clean);
            if (signedIn) recordQuantAttempt({ lessonId: lesson.id, family: problem.family, correct: clean, seconds });
          }}
          onNext={() => router.push(next ? `/quant/puzzles/${next.id}` : "/quant/puzzles")}
          nextLabel={next ? "Next puzzle" : "All puzzles"}
          solution={false}
        />
      )}

      {/* The solution, folded so it doesn't give the answer away. */}
      <details className="group mt-4 rounded-[20px] bg-secondary">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[15px] font-semibold sm:px-6 [&::-webkit-details-marker]:hidden">
          Show the solution
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="space-y-4 px-5 pb-6 sm:px-6">
          <p className="text-[15px]">
            <span className="text-muted-foreground">Answer: </span>
            <span className="font-semibold tabular-nums">{formatAnswer(problem.answer, problem.kind)}</span>
          </p>
          <Walkthrough problem={problem} startWithAll />
        </div>
      </details>

      {/* The method behind it. */}
      <Link href={`/quant/${lesson.id}`} className="mt-4 flex items-center justify-between gap-4 rounded-[20px] bg-secondary px-5 py-4 transition-colors hover:bg-control-hover sm:px-6">
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-muted-foreground">
            The method · Unit {unit.number}, {unit.title}
          </span>
          <span className="mt-0.5 block text-[17px] font-semibold tracking-[-0.015em]">{lesson.title}</span>
          <span className="mt-0.5 block text-[15px] leading-6 text-muted-foreground">{lesson.benefit}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Link>

      <nav aria-label="More puzzles" className="mt-8 grid grid-cols-2 gap-3 text-[15px]">
        {previous ? (
          <Link href={`/quant/puzzles/${previous.id}`} className="min-w-0 rounded-2xl px-3 py-2.5 transition-colors hover:bg-secondary">
            <span className="block text-[13px] text-muted-foreground">Previous</span>
            <span className="block truncate font-medium">{previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/quant/puzzles/${next.id}`} className="min-w-0 rounded-2xl px-3 py-2.5 text-right transition-colors hover:bg-secondary">
            <span className="block text-[13px] text-muted-foreground">Next</span>
            <span className="block truncate font-medium">{next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
