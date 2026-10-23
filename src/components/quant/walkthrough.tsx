"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import type { QuantProblem } from "@/lib/quant/build";
import type { QuantVisual } from "@/lib/quant/visual";
import { formatAnswer } from "@/lib/quant/rational";
import { QuantFigure } from "@/components/quant/visuals";
import { StepIcon } from "@/components/quant/step-icon";

/**
 * A problem worked out one step at a time: the figure on top changes with each step, and the
 * steps below build up with what each one does and why. "All steps" shows the whole working.
 */
export function Walkthrough({ problem, startWithAll = false }: { problem: QuantProblem; startWithAll?: boolean }) {
  const reduceMotion = useReducedMotion();
  const total = problem.steps.length;
  // How many steps are showing (1 to total).
  const [shown, setShown] = useState(startWithAll ? total : 1);
  const current = shown - 1;
  const done = shown >= total;

  // The figure for the current step: its own, or the latest one before it, or the question's.
  let visual: QuantVisual | undefined = problem.visual;
  let visualAt = -1;
  problem.steps.slice(0, shown).forEach((step, index) => {
    if (step.visual) {
      visual = step.visual;
      visualAt = index;
    }
  });

  const go = (next: number) => setShown(Math.min(total, Math.max(1, next)));

  return (
    <div
      className="space-y-5"
      // Arrow keys step through the working when the walkthrough has focus.
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(shown + 1);
        if (event.key === "ArrowLeft") go(shown - 1);
      }}
    >
      {visual && (
        <div className="rounded-[22px] bg-secondary px-3 py-4 sm:px-5">
          <AnimatePresence mode="popLayout" initial={false}>
            {/* Same kind of figure: it stays mounted and its colours animate. A new kind crossfades. */}
            <motion.div
              key={`${(visual as QuantVisual).type}-${visualAt === -1 ? "q" : "s"}`}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={runEnter}
            >
              <QuantFigure visual={visual} />
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      <ol aria-label="Steps" className="space-y-1">
        {problem.steps.map((step, index) => {
          if (index >= shown) return null;
          const active = index === current && !done;
          const last = index === total - 1;
          return (
            <motion.li
              key={index}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={runEnter}
              className={cn(
                "flex gap-3 rounded-2xl px-3 py-3 transition-colors duration-200",
                active ? "bg-secondary" : "bg-transparent",
              )}
            >
              <StepIcon name={step.icon} active={active || (done && last)} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-muted-foreground">
                  Step {index + 1} · {step.label}
                </p>
                <p className={cn("mt-0.5 text-[17px] leading-7 tabular-nums", last ? "font-semibold" : "font-medium")}>
                  {step.work}
                  {step.result && <> = {step.result}</>}
                </p>
                {step.explain && <p className="mt-1 text-[15px] leading-6 text-muted-foreground">{step.explain}</p>}
              </div>
            </motion.li>
          );
        })}
      </ol>

      {done && (
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={runEnter}
          className="border-t border-border/70 px-3 pt-4 text-[22px] font-semibold tracking-[-0.02em] tabular-nums"
        >
          <span className="mr-2 text-[15px] font-medium tracking-normal text-muted-foreground">Answer</span>
          {formatAnswer(problem.answer, problem.kind)}
        </motion.p>
      )}

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[15px] tabular-nums text-muted-foreground">
          Step {shown} of {total}
        </p>
        <div className="flex items-center gap-2">
          {!done && shown === 1 && total > 2 && (
            <Button variant="ghost" size="sm" onClick={() => go(total)} className="text-muted-foreground">
              <ListOrdered aria-hidden="true" />
              All steps
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => go(shown - 1)} disabled={shown <= 1} aria-label="Previous step">
            <ArrowLeft aria-hidden="true" />
          </Button>
          {done ? (
            <Button variant="secondary" size="sm" onClick={() => go(1)}>
              Start over
            </Button>
          ) : (
            <Button size="sm" onClick={() => go(shown + 1)}>
              Next step
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
