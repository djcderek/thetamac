"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Lightbulb, Lock, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter, settleSpring } from "@/lib/motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { QUANT_LESSONS, QUANT_TOPICS, generateFromFamily, isFreeQuantLesson, type QuantLesson, type QuantProblem } from "@/lib/quant/lessons";
import type { QuantFamily, QuantTopic } from "@/lib/quant/lessons";
import { formatAnswer, isRightAnswer } from "@/lib/quant/rational";
import { useQuantProgress } from "@/components/quant/quant-list";
import { AnswerBox } from "@/components/quant/answer-box";
import { Walkthrough } from "@/components/quant/walkthrough";
import { QuantFigure } from "@/components/quant/visuals";
import { markType } from "@/components/quant/type-progress";

/** Wrong submits before the answer is shown, as in a lesson. */
const WRONG_TRIES = 2;
/** Question types that can't come up again straight away. */
const RECENT = 4;

type Draw = { lesson: QuantLesson; family: QuantFamily; problem: QuantProblem };
type Phase = "answering" | "right" | "missed";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium transition-colors",
        active ? "bg-foreground text-background" : "bg-control text-foreground hover:bg-control-hover",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Mixed practice: one random question at a time from any question type in the course, the way
 * an interviewer asks them. The lesson it came from is shown only after you answer, since
 * spotting which method fits is part of the skill.
 */
export function QuantShuffle() {
  const reduceMotion = useReducedMotion();
  const { locked } = useQuantProgress();
  const [unit, setUnit] = useState<QuantTopic | null>(null);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [input, setInput] = useState("");
  const [wrongTries, setWrongTries] = useState(0);
  const [lastWrong, setLastWrong] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const [tally, setTally] = useState({ right: 0, done: 0 });
  const recent = useRef<string[]>([]);
  const seen = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef(0);
  const [seconds, setSeconds] = useState<number | null>(null);

  // The types you can draw from: the chosen unit, and only free lessons without Pro.
  const pool = useMemo(
    () =>
      QUANT_LESSONS.filter((lesson) => (!unit || lesson.topic === unit) && (!locked || isFreeQuantLesson(lesson.id))).flatMap((lesson) =>
        lesson.families.map((family) => ({ lesson, family })),
      ),
    [unit, locked],
  );

  const next = () => {
    if (!pool.length) return;
    const fresh = pool.filter((entry) => !recent.current.includes(`${entry.lesson.id}/${entry.family.id}`));
    const choices = fresh.length ? fresh : pool;
    const { lesson, family } = choices[Math.floor(Math.random() * choices.length)];
    let problem = generateFromFamily(family, Math.random);
    for (let tries = 0; seen.current.has(problem.key) && tries < 30; tries++) problem = generateFromFamily(family, Math.random);
    seen.current.add(problem.key);
    recent.current = [...recent.current, `${lesson.id}/${family.id}`].slice(-RECENT);
    setDraw({ lesson, family, problem });
    setPhase("answering");
    setInput("");
    setWrongTries(0);
    setLastWrong("");
    setShowSteps(false);
    setSeconds(null);
    startedAt.current = performance.now();
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // The first question, and a fresh one whenever the pool changes (a unit picked, Pro loaded).
  useEffect(() => {
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

  const finish = (result: "right" | "missed") => {
    if (!draw) return;
    setPhase(result);
    setSeconds((performance.now() - startedAt.current) / 1000);
    setTally((t) => ({ right: t.right + (result === "right" ? 1 : 0), done: t.done + 1 }));
    markType(draw.lesson.id, draw.family.id, result === "right" && wrongTries === 0);
  };

  const change = (value: string) => {
    setInput(value);
    // Right answers go through as they're typed, as in lessons.
    if (draw && phase === "answering" && isRightAnswer(value, draw.problem.answer, draw.problem.kind)) finish("right");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draw || phase !== "answering" || !input.trim()) return;
    if (isRightAnswer(input, draw.problem.answer, draw.problem.kind)) return finish("right");
    const tries = wrongTries + 1;
    setWrongTries(tries);
    setLastWrong(input);
    if (tries >= WRONG_TRIES) finish("missed");
    else inputRef.current?.select();
  };

  const unitOf = (lesson: QuantLesson) => QUANT_TOPICS.find((t) => t.id === lesson.topic)!;
  const problem = draw?.problem;
  const answered = phase !== "answering";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 md:px-6 md:pt-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/quant" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 px-2.5")}>
          <ChevronLeft aria-hidden="true" />
          Lessons
        </Link>
        {tally.done > 0 && (
          <p className="text-[14px] tabular-nums text-muted-foreground" aria-live="polite">
            {tally.right} of {tally.done} right
          </p>
        )}
      </div>

      <header className="mt-4 px-1">
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em]">Shuffle</h1>
        <p className="mt-2 text-[17px] leading-7 text-muted-foreground">
          Random questions from across the course. You see which lesson a question comes from after you answer.
        </p>
      </header>

      <div className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
        <Chip active={!unit} onClick={() => setUnit(null)}>
          {locked ? "All free units" : "All units"}
        </Chip>
        {QUANT_TOPICS.map((topic) => {
          const topicLocked = locked && topic.stage !== "Foundations";
          return topicLocked ? (
            <Link
              key={topic.id}
              href={getUpgradeUrl({ feature: "quant", source: "quant_shuffle" })}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-control px-3.5 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-control-hover"
            >
              <Lock aria-hidden="true" className="size-3.5" />
              {topic.title}
            </Link>
          ) : (
            <Chip key={topic.id} active={unit === topic.id} onClick={() => setUnit(unit === topic.id ? null : topic.id)}>
              {topic.title}
            </Chip>
          );
        })}
      </div>

      {problem && draw && (
        <section className="mt-5 overflow-hidden rounded-[20px] border border-border bg-background">
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
                    Unit {unitOf(draw.lesson).number} ·{" "}
                    <Link href={`/quant/${draw.lesson.id}`} className="text-foreground underline-offset-2 hover:underline">
                      {draw.lesson.title}
                    </Link>{" "}
                    · {draw.family.title}
                  </motion.p>
                ) : (
                  <motion.p key="ask" initial={false} className="text-[13px] font-medium text-muted-foreground">
                    Question {tally.done + 1}
                  </motion.p>
                )}
              </AnimatePresence>
              {!answered && (
                <Button variant="ghost" size="sm" onClick={next} className="shrink-0 text-muted-foreground">
                  <Shuffle aria-hidden="true" />
                  Skip
                </Button>
              )}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={problem.key}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={runEnter}
                className="space-y-5"
              >
                <p className="text-[19px] leading-8">{problem.prompt}</p>
                {problem.visual && (
                  <div className="rounded-[18px] bg-secondary px-3 py-4">
                    <QuantFigure visual={problem.visual} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

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
                  <Button size="sm" onClick={next} autoFocus>
                    Next
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {locked && (
        <p className="mt-5 px-1 text-[15px] leading-6 text-muted-foreground">
          Free covers the two Foundations units.{" "}
          <Link href={getUpgradeUrl({ feature: "quant", source: "quant_shuffle" })} className="font-medium text-foreground underline-offset-2 hover:underline">
            Pro adds all {QUANT_LESSONS.length} lessons
          </Link>
          .
        </p>
      )}
    </div>
  );
}
