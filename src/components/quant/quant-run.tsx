"use client";

import type { FormEvent, RefObject } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check, Eye } from "lucide-react";
import { runEnter } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { QuantLesson, QuantProblem } from "@/lib/quant/lessons";
import { formatAnswer, type AnswerKind } from "@/lib/quant/rational";
import { StepRow } from "@/components/quant/quant-picker";

export type QuantPhase = "answering" | "right" | "missed";

const PLACEHOLDERS: Record<AnswerKind, string> = {
  probability: "Fraction, decimal or %",
  percent: "Percent",
  dollars: "Dollars",
  number: "Number or fraction",
};

// Keys a phone's number pad doesn't have, for fractions, percentages and losses.
const HELPER_KEYS: Record<AnswerKind, string[]> = {
  probability: ["/", "%", "."],
  percent: ["/", "."],
  dollars: ["−", "."],
  number: ["/", "."],
};

export function QuantRun({
  lesson,
  problem,
  index,
  total,
  guided,
  phase,
  wrongTries,
  feedbackKey,
  firstTry,
  input,
  setInput,
  inputRef,
  onSubmit,
  onReveal,
  onContinue,
  onStop,
}: {
  lesson: QuantLesson;
  problem: QuantProblem;
  /** 0-based position in the set. */
  index: number;
  total: number;
  /** The working is shown, with its last result left to the player. */
  guided: boolean;
  phase: QuantPhase;
  wrongTries: number;
  /** Changes on every wrong submit, to replay the shake. */
  feedbackKey: number;
  firstTry: number;
  input: string;
  setInput: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onSubmit: (event: FormEvent) => void;
  onReveal: () => void;
  onContinue: () => void;
  onStop: () => void;
}) {
  const answered = phase !== "answering";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
      transition={runEnter}
      className="mx-auto max-w-2xl space-y-4 px-4 pt-6 sm:space-y-6 md:px-6 md:pt-10"
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[15px] text-muted-foreground">
            <span className="font-semibold text-foreground">Quant</span> · {lesson.title}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <div
              aria-label={`Problem ${index + 1} of ${total}`}
              className="rounded-full bg-secondary px-4 py-1.5 text-center text-[19px] font-semibold tabular-nums tracking-tight"
            >
              {index + 1}
              <span className="text-muted-foreground">/{total}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onStop}
              className="group min-h-10 hover:bg-foreground hover:text-background active:scale-95"
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-[3px] bg-current transition-[transform,border-radius] duration-200 ease-out group-hover:rounded-[4px] group-active:scale-75"
              />
              Stop
            </Button>
          </div>
        </div>
        <Progress value={(index / total) * 100} className="mt-3 h-1" />
      </div>

      <div
        key={feedbackKey}
        className={cn(
          "relative rounded-[28px] bg-secondary p-5 sm:p-8",
          phase === "right" && "ring-2 ring-inset ring-success/50 animate-pulse-success",
          feedbackKey > 0 && phase === "answering" && "animate-shake",
        )}
      >
        <motion.div key={problem.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={runEnter}>
          {guided && <p className="mb-3 text-[13px] font-medium text-muted-foreground">With the working</p>}
          <p data-problem className="text-[19px] leading-8 sm:text-[22px] sm:leading-9">
            {problem.prompt}
          </p>

          {guided && (
            <ol aria-label="Working" className="mt-4 space-y-2 rounded-2xl bg-background px-4 py-3">
              {problem.steps.map((step, i) => (
                <motion.li
                  key={`${problem.key}-${i}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...runEnter, delay: 0.05 + i * 0.07 }}
                >
                  <StepRow {...step} last={i === problem.steps.length - 1} hideResult={i === problem.steps.length - 1 && !answered} />
                </motion.li>
              ))}
            </ol>
          )}
        </motion.div>

        <form onSubmit={onSubmit} className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-2">
          <div className="relative">
            {problem.kind === "dollars" && (
              <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-muted-foreground">
                $
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Answer"
              value={input}
              disabled={answered}
              onChange={(e) => setInput(e.target.value)}
              placeholder={PLACEHOLDERS[problem.kind]}
              className={cn(
                "h-16 w-full rounded-2xl bg-background px-10 text-center font-mono text-2xl font-semibold outline-none transition-shadow placeholder:text-[15px] placeholder:font-normal placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60",
              )}
              autoFocus
            />
            {problem.kind === "percent" && (
              <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-2xl text-muted-foreground">
                %
              </span>
            )}
          </div>
          {!answered && (
            <div className="flex gap-2">
              {HELPER_KEYS[problem.kind].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setInput(input + key);
                    inputRef.current?.focus();
                  }}
                  className="min-h-11 flex-1 rounded-full bg-control font-mono text-lg font-semibold transition-colors hover:bg-control-hover active:scale-95"
                  aria-label={key === "/" ? "Fraction bar" : key === "%" ? "Percent" : key === "−" ? "Minus" : "Decimal point"}
                >
                  {key}
                </button>
              ))}
              <Button type="submit" disabled={!input.trim()} className="min-h-11 flex-[2] rounded-full">
                Check
              </Button>
            </div>
          )}
        </form>

        {phase === "answering" && wrongTries > 0 && (
          <p role="status" className="mt-3 text-center text-[15px] text-muted-foreground">
            Not quite. Try again, or show the answer.
          </p>
        )}

        {phase === "right" && (
          <p role="status" className="mt-4 flex items-center justify-center gap-1.5 text-[15px] font-medium text-success">
            <Check aria-hidden="true" className="h-4 w-4" strokeWidth={3} />
            {formatAnswer(problem.answer, problem.kind)}
          </p>
        )}

        {/* A miss shows the answer and the whole working. */}
        {phase === "missed" && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={runEnter}
            className="mt-5 rounded-2xl bg-background px-4 py-3"
          >
            <p className="text-[15px]">
              Answer <span className="font-mono font-semibold tabular-nums">{formatAnswer(problem.answer, problem.kind)}</span>
            </p>
            {!guided && (
              <ol aria-label="Working" className="mt-2 space-y-2">
                {problem.steps.map((step, i) => (
                  <li key={i}>
                    <StepRow {...step} last={i === problem.steps.length - 1} />
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">{firstTry}</span> right first time
        </p>
        {phase === "missed" ? (
          <Button onClick={onContinue} autoFocus className="min-h-11">
            Continue
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        ) : (
          phase === "answering" && (
            <Button variant="outline" onClick={onReveal} className="min-h-11">
              <Eye aria-hidden="true" className="h-4 w-4" />
              Show answer
            </Button>
          )
        )}
      </div>
    </motion.div>
  );
}
