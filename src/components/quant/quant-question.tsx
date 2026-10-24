"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter, settleSpring } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { QUANT_TOPICS, type QuantLesson, type QuantProblem } from "@/lib/quant/lessons";
import { formatAnswer, isRightAnswer } from "@/lib/quant/rational";
import { AnswerBox } from "@/components/quant/answer-box";
import { Walkthrough } from "@/components/quant/walkthrough";
import { QuantFigure } from "@/components/quant/visuals";
import { MathText } from "@/components/quant/math";

/** Wrong submits before the answer is shown, as in a lesson. */
const WRONG_TRIES = 2;

export type QuantQuestionResult = {
  result: "right" | "missed";
  /** Right first time, without the answer shown. */
  clean: boolean;
  seconds: number;
};

/**
 * One question on its own, outside a lesson: the prompt and figure, the answer box, and a
 * result console with the solution. The lesson and question type it came from are shown only
 * once it's answered, since spotting the method is part of the question. Give it a `key` per
 * question so each starts fresh.
 */
export function QuantQuestion({
  lesson,
  typeTitle,
  problem,
  label,
  onFinish,
  onNext,
  nextLabel = "Next",
  aside,
}: {
  lesson: QuantLesson;
  typeTitle: string;
  problem: QuantProblem;
  /** Shown before answering, e.g. "Question 3". */
  label: string;
  onFinish: (outcome: QuantQuestionResult) => void;
  onNext: () => void;
  nextLabel?: string;
  /** Beside the label while answering, e.g. a Skip button. */
  aside?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"answering" | "right" | "missed">("answering");
  const [input, setInput] = useState("");
  const [wrongTries, setWrongTries] = useState(0);
  const [lastWrong, setLastWrong] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const [seconds, setSeconds] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  const finish = (result: "right" | "missed", tries = wrongTries) => {
    const taken = (performance.now() - startedAt.current) / 1000;
    setPhase(result);
    setSeconds(taken);
    onFinish({ result, clean: result === "right" && tries === 0, seconds: taken });
  };

  const change = (value: string) => {
    setInput(value);
    // Right answers go through as they're typed, as in lessons.
    if (phase === "answering" && isRightAnswer(value, problem.answer, problem.kind)) finish("right");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (phase !== "answering" || !input.trim()) return;
    if (isRightAnswer(input, problem.answer, problem.kind)) return finish("right");
    const tries = wrongTries + 1;
    setWrongTries(tries);
    setLastWrong(input);
    if (tries >= WRONG_TRIES) finish("missed", tries);
    else inputRef.current?.select();
  };

  const unit = QUANT_TOPICS.find((t) => t.id === lesson.topic)!;
  const answered = phase !== "answering";

  return (
    <section className="overflow-hidden rounded-[20px] border border-border bg-background">
      <div className="space-y-5 px-5 py-6 sm:px-6">
        <div className="flex min-h-8 items-center justify-between gap-3">
          <AnimatePresence mode="wait" initial={false}>
            {answered ? (
              <motion.p
                key="from"
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={runEnter}
                className="min-w-0 truncate text-[13px] font-medium text-muted-foreground"
              >
                Unit {unit.number} ·{" "}
                <Link href={`/quant/${lesson.id}`} className="text-foreground underline-offset-2 hover:underline">
                  {lesson.title}
                </Link>{" "}
                · {typeTitle}
              </motion.p>
            ) : (
              <motion.p key="ask" initial={false} className="text-[13px] font-medium text-muted-foreground">
                {label}
              </motion.p>
            )}
          </AnimatePresence>
          {!answered && aside}
        </div>

        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={runEnter} className="space-y-5">
          <p className="text-[19px] leading-8">
            <MathText text={problem.prompt} />
          </p>
          {problem.visual && (
            <div className="rounded-[18px] bg-secondary px-3 py-4">
              <QuantFigure visual={problem.visual} />
            </div>
          )}
        </motion.div>

        <AnswerBox kind={problem.kind} value={input} onChange={change} onSubmit={submit} disabled={answered} inputRef={inputRef} />

        <AnimatePresence initial={false}>
          {showSteps && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={settleSpring}
              className="overflow-hidden"
            >
              <div className="border-t border-border pt-5">
                <Walkthrough problem={problem} startWithAll />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The result, as on a coding judge. */}
      <div className="border-t border-border px-5 py-4 sm:px-6" role="status">
        {phase === "answering" ? (
          <div className="flex items-center justify-between gap-3">
            <p className={cn("text-[14px] leading-5", wrongTries > 0 ? "font-medium text-destructive" : "text-muted-foreground")}>
              {wrongTries > 0 ? `${lastWrong} isn’t right. One more try.` : "Right answers go through as you type."}
            </p>
            <Button variant="ghost" size="sm" onClick={() => finish("missed")} className="shrink-0 text-muted-foreground">
              Show answer
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={cn("text-[17px] font-semibold", phase === "right" ? "text-success" : "text-destructive")}>
                {phase === "right" ? "Correct" : lastWrong ? "Wrong answer" : "Answer shown"}
              </p>
              <p className="text-[14px] tabular-nums text-muted-foreground">
                {phase === "right" ? (
                  <>
                    {formatAnswer(problem.answer, problem.kind)}
                    {seconds !== null && <> · {seconds.toFixed(1)}s</>}
                  </>
                ) : (
                  <>
                    {lastWrong && <>You entered {lastWrong}. </>}Expected {formatAnswer(problem.answer, problem.kind)}.
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {!showSteps && (
                <Button variant="secondary" size="sm" onClick={() => setShowSteps(true)}>
                  <Lightbulb aria-hidden="true" />
                  Solution
                </Button>
              )}
              <Button size="sm" onClick={onNext} autoFocus>
                {nextLabel}
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
