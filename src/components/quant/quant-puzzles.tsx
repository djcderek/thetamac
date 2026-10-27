"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, CircleDashed, Lock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { QUANT_PUZZLES, getQuantLesson, isFreeQuantLesson } from "@/lib/quant/lessons";
import type { QuantDifficulty } from "@/lib/quant/build";
import { DifficultyLabel } from "@/components/quant/difficulty";
import { useQuantProgress } from "@/components/quant/quant-list";
import { usePuzzleMarks, useQuantAccountSync } from "@/components/quant/type-progress";

const DIFFICULTIES: QuantDifficulty[] = ["Easy", "Medium", "Hard"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full px-3.5 text-[14px] font-medium transition-colors",
        active ? "bg-foreground text-background" : "bg-control text-foreground hover:bg-control-hover",
      )}
    >
      {children}
    </button>
  );
}

/** Every classic puzzle as one problem list, each opening on its own page. */
export function QuantPuzzles() {
  const { locked } = useQuantProgress();
  const marks = usePuzzleMarks();
  useQuantAccountSync();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<QuantDifficulty | null>(null);
  const [todo, setTodo] = useState(false);
  const solved = QUANT_PUZZLES.filter((p) => marks[p.id] === "solved").length;

  const rows = useMemo(() => {
    const words = query.trim().toLowerCase();
    return QUANT_PUZZLES.map((puzzle, index) => ({ puzzle, number: index + 1 })).filter(({ puzzle }) => {
      if (difficulty && puzzle.difficulty !== difficulty) return false;
      if (todo && marks[puzzle.id] === "solved") return false;
      if (words && !`${puzzle.title} ${puzzle.problem.prompt}`.toLowerCase().includes(words)) return false;
      return true;
    });
  }, [query, difficulty, todo, marks]);

  return (
    <div className="px-4 pt-8 pb-16 md:px-6 md:pt-12">
      <Link href="/quant" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-4 px-2.5")}>
        <ChevronLeft aria-hidden="true" />
        Lessons
      </Link>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 px-1">
        <div className="max-w-2xl">
          <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[44px]">Puzzles</h1>
          <p className="mt-3 text-[17px] leading-7 text-muted-foreground">
            Classic one-off interview puzzles, each with a step-by-step solution and the lesson whose method solves it.
          </p>
        </div>
        <p className="text-[15px] tabular-nums text-muted-foreground">
          <span className="text-[22px] font-semibold text-foreground">{solved}</span>/{QUANT_PUZZLES.length} solved
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">Search puzzles</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search puzzles"
            className="h-11 w-full rounded-full bg-secondary pl-10 pr-4 text-[15px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
          <Chip active={!difficulty} onClick={() => setDifficulty(null)}>
            All levels
          </Chip>
          {DIFFICULTIES.map((d) => (
            <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>
              {d}
            </Chip>
          ))}
          <span aria-hidden="true" className="mx-1 w-px shrink-0 bg-border" />
          <Chip active={todo} onClick={() => setTodo(!todo)}>
            Unsolved
          </Chip>
        </div>
      </div>

      <div role="table" aria-label="Puzzles" className="mt-5">
        <div role="row" className="hidden grid-cols-[40px_minmax(0,1fr)_200px_80px] gap-3 px-3 pb-2 text-[13px] font-medium text-muted-foreground sm:grid">
          <span role="columnheader">Status</span>
          <span role="columnheader">Puzzle</span>
          <span role="columnheader">Lesson</span>
          <span role="columnheader">Level</span>
        </div>
        {rows.length === 0 && <p className="rounded-[22px] bg-secondary px-5 py-8 text-center text-[15px] text-muted-foreground">No puzzles match.</p>}
        <div className="divide-y divide-border border-t border-border">
          {rows.map(({ puzzle, number }) => {
            const lesson = getQuantLesson(puzzle.lesson)!;
            const isLocked = locked && !isFreeQuantLesson(lesson.id);
            const mark = marks[puzzle.id];
            return (
              <Link
                key={puzzle.id}
                role="row"
                href={`/quant/puzzles/${puzzle.id}`}
                className={cn(
                  "grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 px-3 py-3.5 transition-colors hover:bg-secondary sm:grid-cols-[40px_minmax(0,1fr)_200px_80px]",
                )}
              >
                <span role="cell" className="grid place-items-center sm:place-items-start sm:pl-1">
                  {mark === "solved" ? (
                    <Check aria-label="Solved" className="h-4 w-4 text-success" strokeWidth={2.5} />
                  ) : mark === "tried" ? (
                    <CircleDashed aria-label="Tried" className="h-4 w-4 text-warning" />
                  ) : isLocked ? (
                    <Lock aria-label="Pro" className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : null}
                </span>
                <span role="cell" className="min-w-0">
                  <span className="block truncate text-[15px] font-medium">
                    <span className="tabular-nums">{number}.</span> {puzzle.title}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">{puzzle.problem.prompt}</span>
                  <span className="mt-0.5 block text-[13px] sm:hidden">
                    <DifficultyLabel difficulty={puzzle.difficulty} />
                    <span className="text-muted-foreground"> · {lesson.title}</span>
                  </span>
                </span>
                <span role="cell" className="hidden truncate text-[14px] text-muted-foreground sm:block">
                  {lesson.title}
                </span>
                <span role="cell" className="hidden text-[14px] sm:block">
                  <DifficultyLabel difficulty={puzzle.difficulty} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
