"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter } from "@/lib/motion";
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
      <span className={cn("tabular-nums sm:text-right", last ? "font-semibold text-foreground" : "text-foreground/80")}>
        {work}
        {(result || hideResult) && <> = {hideResult ? "?" : result}</>}
      </span>
    </div>
  );
}

/** Every lesson as a plain grouped list, one card per topic. */
export function QuantLessonList({
  onSelect,
  lessons,
  locked,
  footer,
}: {
  onSelect: (id: QuantLessonId) => void;
  lessons: LessonsSummary | null;
  locked: boolean;
  footer?: ReactNode;
}) {
  return (
    <div className="space-y-10">
      {QUANT_TOPICS.map((topic, topicIndex) => {
        const inTopic = QUANT_LESSONS.filter((lesson) => lesson.topic === topic.id);
        const masteredCount = inTopic.filter((lesson) => lessons?.progress[lesson.id]?.mastered).length;
        const startsStage = QUANT_TOPICS[topicIndex - 1]?.stage !== topic.stage;
        return (
          <section key={topic.id} aria-labelledby={`quant-topic-${topic.id}`}>
            {/* Each stage opens with its name; for free accounts it also says what's included. */}
            {startsStage && (
              <p className={cn("mb-4 px-1 text-[15px] font-medium text-muted-foreground", topicIndex > 0 && "mt-14")}>
                {topic.stage}
                {locked && <> · {topic.stage === "Foundations" ? "Free" : "Pro"}</>}
              </p>
            )}
            <div className="mb-3 px-1">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id={`quant-topic-${topic.id}`} className="text-[22px] font-semibold tracking-[-0.02em]">
                  <span className="mr-2 tabular-nums text-muted-foreground">{topic.number}</span>
                  {topic.title}
                </h2>
                {masteredCount > 0 && (
                  <span className="text-[15px] tabular-nums text-muted-foreground">
                    {masteredCount} of {inTopic.length} mastered
                  </span>
                )}
              </div>
              <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{topic.blurb}</p>
            </div>
            <ul className="overflow-hidden rounded-[22px] bg-secondary">
              {inTopic.map((lesson, index) => {
                const progress = lessons?.progress[lesson.id];
                const isLocked = locked && !isFreeQuantLesson(lesson.id);
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(lesson.id)}
                      className="group flex w-full items-center pl-5 text-left transition-colors hover:bg-control-hover active:bg-control-hover"
                    >
                      <span
                        className={cn(
                          "flex min-h-[68px] flex-1 items-center gap-3 py-3.5 pr-4",
                          index > 0 && "border-t border-border/70",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[17px] font-medium leading-6">{lesson.title}</span>
                          <span className="block text-[15px] leading-5 text-muted-foreground">{lesson.benefit}</span>
                        </span>
                        {progress?.mastered ? (
                          <span className="flex items-center gap-1 text-[15px] font-medium text-success">
                            <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
                            Mastered
                          </span>
                        ) : (
                          progress && (
                            <span className="text-[15px] tabular-nums text-muted-foreground">{quantLessonStatus(progress)}</span>
                          )
                        )}
                        {isLocked ? (
                          <Lock aria-label="Pro" className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight
                            aria-hidden="true"
                            className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                          />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {footer}
    </div>
  );
}

/**
 * One lesson's page: the idea in a sentence, then a worked example whose working
 * writes itself out line by line, then the one action.
 */
export function QuantLessonDetail({
  lesson,
  progress,
  onBack,
  action,
  note,
}: {
  lesson: QuantLesson;
  progress: LessonProgressSummary | undefined;
  onBack: () => void;
  action: ReactNode;
  note: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const topic = QUANT_TOPICS.find((t) => t.id === lesson.topic)!;
  const inTopic = QUANT_LESSONS.filter((l) => l.topic === lesson.topic);
  const status = quantLessonStatus(progress);
  const { example } = lesson;
  const stepDelay = (index: number) => ({ ...runEnter, delay: 0.12 + index * 0.16 });

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="All lessons"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary transition-[background-color,transform] hover:bg-control-hover active:scale-95"
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <p className="text-[15px] text-muted-foreground">
          Unit {topic.number} · {topic.title} · {inTopic.indexOf(lesson) + 1} of {inTopic.length}
        </p>
      </div>

      <h1 className="mt-8 text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[44px]">{lesson.title}</h1>
      <p className="mt-3 text-[17px] leading-7 text-muted-foreground">{lesson.idea}</p>
      {status && (
        <p
          className={cn(
            "mt-3 flex items-center gap-1 text-[15px] font-medium",
            progress?.mastered ? "text-success" : "text-muted-foreground",
          )}
        >
          {progress?.mastered && <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />}
          {status}
        </p>
      )}

      <section aria-label="Example" className="mt-8 rounded-[22px] bg-secondary p-5 sm:p-6">
        <p className="text-[13px] font-medium text-muted-foreground">Example</p>
        <p className="mt-2 text-[17px] leading-7">{example.prompt}</p>
        <ol className="mt-4 space-y-2.5">
          {example.steps.map((step, index) => (
            <motion.li
              key={index}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stepDelay(index)}
            >
              <StepRow {...step} />
            </motion.li>
          ))}
        </ol>
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stepDelay(example.steps.length)}
          className="mt-5 border-t border-border/70 pt-4 text-[24px] font-semibold tracking-[-0.02em] tabular-nums"
        >
          {formatAnswer(example.answer, example.kind)}
        </motion.p>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        {action}
        <p className="text-[15px] leading-6 text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
