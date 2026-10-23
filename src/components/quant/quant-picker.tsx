"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter, settleSpring, snapSpring } from "@/lib/motion";
import {
  QUANT_LESSONS,
  QUANT_SOLO,
  QUANT_TOPICS,
  isFreeQuantLesson,
  type QuantLesson,
  type QuantLessonId,
} from "@/lib/quant/lessons";
import { formatAnswer } from "@/lib/quant/rational";
import type { LessonProgressSummary, LessonsSummary } from "@/components/training/training-types";

export function quantLessonStatus(progress: LessonProgressSummary | undefined) {
  if (!progress) return null;
  return progress.mastered ? "Mastered" : `Best ${progress.bestFirstTry} of ${QUANT_SOLO}`;
}

function ProPill({ className }: { className?: string }) {
  return (
    <span className={cn("rounded-full bg-secondary px-1.5 text-[11px] font-semibold leading-4 text-foreground", className)}>
      Pro
    </span>
  );
}

/** One line of working, as a row: label on the left, the sum on the right. */
export function StepRow({ label, work, result, hideResult, last }: {
  label: string;
  work: string;
  result: string;
  hideResult?: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 text-[15px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span className={cn("font-mono tabular-nums sm:text-right", last ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {work}
        {(result || hideResult) && <> = {hideResult ? "?" : result}</>}
      </span>
    </div>
  );
}

/**
 * The selected lesson, as a white detail row: the idea, then a worked example whose
 * working writes itself out line by line. Switching lessons crossfades it.
 */
export function QuantIntro({
  lesson,
  locked,
  progress,
}: {
  lesson: QuantLesson;
  locked: boolean;
  progress: LessonProgressSummary | undefined;
}) {
  const reduceMotion = useReducedMotion();
  const topic = QUANT_TOPICS.find((t) => t.id === lesson.topic)!;
  const inTopic = QUANT_LESSONS.filter((l) => l.topic === lesson.topic);
  const status = quantLessonStatus(progress);
  const { example } = lesson;

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
              {topic.title} · {inTopic.indexOf(lesson) + 1} of {inTopic.length}
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
          <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{lesson.idea}</p>

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[13px] font-medium text-muted-foreground">Worked example</p>
            <p className="mt-1.5 text-[17px] leading-7">{example.prompt}</p>
            <ol className="mt-3 space-y-2">
              {example.steps.map((step, index) => (
                <motion.li
                  key={index}
                  initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...runEnter, delay: 0.15 + index * 0.18 }}
                >
                  <StepRow {...step} last={index === example.steps.length - 1} />
                </motion.li>
              ))}
            </ol>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...runEnter, delay: 0.15 + example.steps.length * 0.18 }}
              className="mt-3 text-[15px] font-semibold"
            >
              Answer: <span className="font-mono tabular-nums">{formatAnswer(example.answer, example.kind)}</span>
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Every lesson, grouped by topic, with progress; picking one shows it in the intro. */
export function QuantLessonList({
  selected,
  onSelect,
  lessons,
  locked,
}: {
  selected: QuantLessonId;
  onSelect: (id: QuantLessonId) => void;
  lessons: LessonsSummary | null;
  locked: boolean;
}) {
  return (
    <div className="space-y-5">
      {QUANT_TOPICS.map((topic) => {
        const inTopic = QUANT_LESSONS.filter((lesson) => lesson.topic === topic.id);
        const masteredCount = inTopic.filter((lesson) => lessons?.progress[lesson.id]?.mastered).length;
        return (
          <section key={topic.id} aria-labelledby={`quant-topic-${topic.id}`} className="space-y-2">
            <div className="px-1">
              <h2 id={`quant-topic-${topic.id}`} className="flex items-baseline justify-between text-[15px] font-semibold">
                <span>{topic.title}</span>
                {masteredCount > 0 && (
                  <span className="text-[13px] font-normal tabular-nums text-muted-foreground">
                    {masteredCount} of {inTopic.length} mastered
                  </span>
                )}
              </h2>
              <p className="text-[13px] text-muted-foreground">{topic.blurb}</p>
            </div>
            <ul className="rounded-[22px] bg-secondary p-1.5">
              {inTopic.map((lesson, index) => {
                const isSelected = lesson.id === selected;
                const progress = lessons?.progress[lesson.id];
                const isLocked = locked && !isFreeQuantLesson(lesson.id);
                const status = quantLessonStatus(progress);
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(lesson.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        "relative isolate flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                        !isSelected && "hover:bg-control-hover",
                      )}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="quant-lesson-selected"
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
                        <span className="block truncate text-[13px] text-muted-foreground">{lesson.idea}</span>
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
      })}
    </div>
  );
}
