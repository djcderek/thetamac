"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter, settleSpring, snapSpring } from "@/lib/motion";
import { LESSONS, LESSON_SOLO, isFreeLesson, type Lesson, type LessonId } from "@/lib/lessons";
import type { LessonProgressSummary, LessonsSummary } from "@/components/training/training-types";

export function lessonStatus(progress: LessonProgressSummary | undefined) {
  if (!progress) return null;
  return progress.mastered ? "Mastered" : `Best ${progress.bestFirstTry} of ${LESSON_SOLO}`;
}

function ProPill({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-full bg-secondary px-1.5 text-[11px] font-semibold leading-4 text-foreground", className)}>
      Pro
    </span>
  );
}

/**
 * The selected lesson, as a white detail row in the Learning card: the trick, then a worked
 * example that writes itself out step by step. Switching lessons crossfades it.
 */
export function LessonIntro({
  lesson,
  locked,
  progress,
}: {
  lesson: Lesson;
  locked: boolean;
  progress: LessonProgressSummary | undefined;
}) {
  const reduceMotion = useReducedMotion();
  const number = LESSONS.indexOf(lesson) + 1;
  const steps = lesson.steps(lesson.example);
  const status = lessonStatus(progress);

  return (
    <div className="overflow-hidden rounded-2xl bg-background">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={lesson.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
          transition={settleSpring}
          className="p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              Lesson {number} of {LESSONS.length}
              {locked && <ProPill />}
            </p>
            {status && (
              <p className={cn("flex items-center gap-1 text-[13px] font-medium", progress?.mastered ? "text-success" : "text-muted-foreground")}>
                {progress?.mastered && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                {status}
              </p>
            )}
          </div>
          <h3 className="mt-1 text-[20px] font-semibold tracking-tight">{lesson.title}</h3>
          <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{lesson.trick}</p>

          <div className="mt-4 border-t border-border pt-4">
            <p className="font-mono text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
              {lesson.example.a} {lesson.example.operation} {lesson.example.b}
            </p>
            <ol className="mt-3 space-y-1.5">
              {steps.map((step, index) => (
                <motion.li
                  key={index}
                  // The working writes itself out, one line after another.
                  initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...runEnter, delay: 0.15 + index * 0.18 }}
                  className="flex items-baseline justify-between gap-3 text-[15px]"
                >
                  <span className="min-w-0 text-muted-foreground">{step.label}</span>
                  <span
                    className={cn(
                      "shrink-0 font-mono tabular-nums",
                      index === steps.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.work} = {step.result}
                  </span>
                </motion.li>
              ))}
            </ol>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Every lesson in order, with progress; picking one shows it above. */
export function LessonList({
  selected,
  onSelect,
  lessons,
  locked,
}: {
  selected: LessonId;
  onSelect: (id: LessonId) => void;
  lessons: LessonsSummary | null;
  locked: boolean;
}) {
  const masteredCount = LESSONS.filter((lesson) => lessons?.progress[lesson.id]?.mastered).length;

  return (
    <section aria-labelledby="lesson-list-heading" className="space-y-2">
      <h2 id="lesson-list-heading" className="flex items-baseline justify-between px-1 text-[13px] text-muted-foreground">
        <span>All lessons</span>
        {masteredCount > 0 && (
          <span className="tabular-nums">
            {masteredCount} of {LESSONS.length} mastered
          </span>
        )}
      </h2>
      <ul className="rounded-[22px] bg-secondary p-1.5">
        {LESSONS.map((lesson, index) => {
          const isSelected = lesson.id === selected;
          const progress = lessons?.progress[lesson.id];
          const isLocked = locked && !isFreeLesson(lesson.id);
          const status = lessonStatus(progress);
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => onSelect(lesson.id)}
                aria-pressed={isSelected}
                className={cn(
                  "relative isolate flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                  !isSelected && "hover:bg-control-hover",
                )}
              >
                {isSelected && (
                  <motion.span
                    layoutId="lesson-selected"
                    layoutDependency={selected}
                    transition={snapSpring}
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 rounded-2xl bg-background shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums",
                    progress?.mastered ? "bg-success text-background" : "bg-control text-muted-foreground",
                  )}
                >
                  {progress?.mastered ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{lesson.title}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{lesson.trick}</span>
                </span>
                {isLocked ? (
                  <ProPill className={isSelected ? undefined : "bg-background"} />
                ) : (
                  status && !progress?.mastered && (
                    <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{status}</span>
                  )
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
