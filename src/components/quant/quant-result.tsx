"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, Lock, RotateCcw } from "lucide-react";
import { settleSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import { FREE_QUANT_LESSON_IDS, QUANT_LESSONS, QUANT_MASTERY_FIRST_TRY, QUANT_SOLO, type QuantProblem } from "@/lib/quant/lessons";
import { formatAnswer } from "@/lib/quant/rational";
import { StepRow } from "@/components/quant/quant-picker";

export type QuantOutcome = {
  lessonId: string;
  title: string;
  soloFirstTry: number;
  soloAverageSeconds: number | null;
  targetSeconds: number;
  mastered: boolean;
  newlyMastered: boolean;
  next: { id: string; title: string; locked: boolean } | null;
  misses: QuantProblem[];
  /** Signed out: the run isn't saved. */
  guest: boolean;
};

export function QuantResult({
  outcome,
  onNext,
  onAgain,
  onAllLessons,
}: {
  outcome: QuantOutcome;
  onNext: () => void;
  onAgain: () => void;
  onAllLessons: () => void;
}) {
  const primary = "h-14 w-full text-[17px]";
  const rows = [
    {
      label: "Mastery",
      value: outcome.mastered ? "Mastered" : `${QUANT_MASTERY_FIRST_TRY} of ${QUANT_SOLO} under ${outcome.targetSeconds}s to master`,
      className: outcome.mastered ? "text-success" : undefined,
    },
    {
      label: "Average on your own",
      value: outcome.soloAverageSeconds === null ? "–" : `${outcome.soloAverageSeconds.toFixed(1)}s`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={settleSpring}
      className="mx-auto max-w-xl space-y-6 px-4 pt-8 pb-16 md:px-6 md:pt-14"
    >
      <div className="text-center">
        {outcome.newlyMastered && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.45, duration: 0.6, delay: 0.15 }}
            className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-success text-background"
          >
            <Check aria-hidden="true" className="h-6 w-6" strokeWidth={3} />
          </motion.div>
        )}
        <p className="text-[15px] font-medium text-muted-foreground">
          {outcome.newlyMastered ? `${outcome.title} mastered` : `${outcome.title} complete`}
        </p>
        <p className="mt-2 text-[88px] font-semibold leading-none tracking-[-0.05em] tabular-nums sm:text-[112px]">
          {outcome.soloFirstTry}
        </p>
        <p className="mt-2 text-[17px] text-muted-foreground">of {QUANT_SOLO} on your own, right first time</p>
      </div>

      <dl className="divide-y divide-border rounded-[22px] bg-secondary px-5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 py-3.5 text-[15px]">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className={cn("text-right font-semibold tabular-nums", row.className)}>{row.value}</dd>
          </div>
        ))}
      </dl>

      {outcome.mastered && outcome.next && !outcome.next.locked ? (
        <div className="space-y-2">
          <Button variant="brand" size="lg" onClick={onNext} className={primary}>
            Next lesson: {outcome.next.title}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={onAgain} className="w-full">
              Go again
            </Button>
            <Button variant="secondary" size="lg" onClick={onAllLessons} className="w-full">
              All lessons
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button variant="brand" size="lg" onClick={onAgain} className={primary}>
            <RotateCcw aria-hidden="true" />
            {outcome.mastered ? "Go again" : "Try the lesson again"}
          </Button>
          <Button variant="secondary" size="lg" onClick={onAllLessons} className="w-full">
            All lessons
          </Button>
        </div>
      )}

      {/* The next lesson is Pro: say what's there and open pricing. */}
      {outcome.next?.locked && (
        <div className="flex flex-col gap-4 rounded-[22px] bg-secondary p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[17px] font-semibold tracking-tight">
              {QUANT_LESSONS.length - FREE_QUANT_LESSON_IDS.length} more quant lessons with Pro
            </div>
            <div className="mt-0.5 text-[15px] text-muted-foreground">
              Up next: {outcome.next.title}. Pro opens every probability, expected value and betting lesson.
            </div>
          </div>
          <Link
            href={getUpgradeUrl({ feature: "quant", source: "quant_results" })}
            onClick={() =>
              captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
                feature: "quant",
                surface: "quant_results",
                action: "open_pricing",
                lesson_id: outcome.lessonId,
              })
            }
            className={cn(buttonVariants({ size: "sm" }), "shrink-0")}
          >
            <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            Unlock Pro
          </Link>
        </div>
      )}

      {outcome.guest && (
        <p className="text-center text-[15px] text-muted-foreground">
          <Link href="/auth/signin?callbackUrl=%2Fquant" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>{" "}
          to keep your progress and mastery.
        </p>
      )}

      {outcome.misses.length > 0 && (
        <section aria-labelledby="quant-misses" className="space-y-2">
          <h2 id="quant-misses" className="px-1 text-[15px] font-semibold">
            Worth another look
          </h2>
          <ul className="space-y-2">
            {outcome.misses.map((problem) => (
              <li key={problem.key} className="rounded-[22px] bg-secondary p-4">
                <p className="text-[15px] leading-6">{problem.prompt}</p>
                <div className="mt-3 space-y-2.5 border-t border-border/70 pt-3">
                  {problem.steps.map((step, i) => (
                    <StepRow key={i} {...step} last={i === problem.steps.length - 1} />
                  ))}
                  <p className="pt-1 text-[15px] font-semibold">
                    Answer <span className="tabular-nums">{formatAnswer(problem.answer, problem.kind)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </motion.div>
  );
}
