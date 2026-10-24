"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter, settleSpring, snapSpring } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { QUANT_TOPICS, isFreeQuantLesson, type LessonPart, type QuantLesson } from "@/lib/quant/lessons";
import type { QuantVisual } from "@/lib/quant/visual";
import { DifficultyPill } from "@/components/quant/difficulty";
import { Walkthrough } from "@/components/quant/walkthrough";
import { QuantFigure } from "@/components/quant/visuals";
import { MathText, Tex } from "@/components/quant/math";
import { setLessonRead, useLessonReadHere } from "@/components/quant/type-progress";

// ─── Parts ───────────────────────────────────────────────────────────────────────────────

function FigureCard({ visual, children }: { visual: QuantVisual; children?: ReactNode }) {
  return (
    <div className="rounded-[22px] bg-secondary px-3 py-4 sm:px-5">
      <QuantFigure visual={visual} />
      {children}
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-[19px] font-semibold tracking-[-0.015em]">{children}</h2>;
}

function Paragraphs({ body }: { body: string[] }) {
  return (
    <div className="space-y-3">
      {body.map((paragraph) => (
        <p key={paragraph} className="text-[17px] leading-7">
          <MathText text={paragraph} />
        </p>
      ))}
    </div>
  );
}

/**
 * An explanation in beats over one figure. The figure stays put and changes with each beat
 * (colours sweep, groups regroup), and the beats so far stay readable underneath.
 */
function Story({ part, onDone }: { part: Extract<LessonPart, { type: "story" }>; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const [beat, setBeat] = useState(0);
  const total = part.beats.length;
  const last = beat === total - 1;
  const visual = part.beats[beat].visual;

  return (
    <div className="space-y-4">
      {part.heading && <Heading>{part.heading}</Heading>}
      <motion.div layout={!reduceMotion} transition={settleSpring} className="overflow-hidden rounded-[22px] bg-secondary px-3 py-4 sm:px-5">
        <AnimatePresence mode="popLayout" initial={false}>
          {/* The same kind of figure stays mounted so it morphs; a new kind crossfades in. */}
          <motion.div
            key={visual.type}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={runEnter}
          >
            <QuantFigure visual={visual} />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <ol className="space-y-2" aria-label="Steps">
        {part.beats.slice(0, beat + 1).map((b, i) => (
          <motion.li
            key={i}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={runEnter}
            className={cn("flex gap-3 text-[17px] leading-7 transition-colors duration-300", i === beat ? "text-foreground" : "text-muted-foreground")}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-300",
                i === beat ? "bg-primary text-primary-foreground" : "bg-control text-muted-foreground",
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <MathText text={b.text} />
            </span>
          </motion.li>
        ))}
      </ol>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {part.beats.map((_, i) => (
            <motion.span
              key={i}
              animate={{ width: i === beat ? 18 : 6 }}
              transition={snapSpring}
              className={cn("h-1.5 rounded-full", i <= beat ? "bg-foreground/70" : "bg-control")}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setBeat(beat - 1)} disabled={beat === 0} aria-label="Previous step">
            <ArrowLeft aria-hidden="true" />
          </Button>
          {last ? (
            <Button variant="secondary" size="sm" onClick={() => setBeat(0)}>
              <RotateCcw aria-hidden="true" />
              Replay
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setBeat(beat + 1);
                if (beat + 1 === total - 1) onDone();
              }}
            >
              Next
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A quick question inside the lesson: pick once, then see which is right and why. */
function CheckQuestion({ part, picked, onPick }: { part: Extract<LessonPart, { type: "check" }>; picked: number | null; onPick: (choice: number) => void }) {
  const reduceMotion = useReducedMotion();
  const answered = picked !== null;
  const right = picked === part.answer;
  return (
    <div className="space-y-4">
      <p className="text-[17px] font-semibold leading-7">
        <MathText text={part.prompt} />
      </p>
      {part.visual && <FigureCard visual={part.visual} />}
      <div className="grid gap-2" role="group" aria-label="Choices">
        {part.choices.map((choice, i) => {
          const isAnswer = i === part.answer;
          const isPicked = i === picked;
          return (
            <motion.button
              key={choice}
              type="button"
              disabled={answered}
              onClick={() => onPick(i)}
              whileTap={answered || reduceMotion ? undefined : { scale: 0.98 }}
              animate={answered && isPicked && !right && !reduceMotion ? { x: [0, -5, 5, -3, 3, 0] } : { x: 0 }}
              transition={{ duration: 0.36 }}
              className={cn(
                "flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[16px] font-medium tabular-nums transition-[background-color,border-color,color,opacity] duration-200",
                !answered && "border-border bg-background hover:border-foreground/25 hover:bg-secondary",
                answered && isAnswer && "border-success/50 bg-success/10 text-foreground",
                answered && isPicked && !isAnswer && "border-destructive/45 bg-destructive/10",
                answered && !isAnswer && !isPicked && "border-border bg-background opacity-50",
              )}
            >
              <span className="min-w-0">
                <MathText text={choice} />
              </span>
              {answered && isAnswer && <Check aria-hidden="true" className="size-5 shrink-0 text-success" strokeWidth={2.5} />}
              {answered && isPicked && !isAnswer && <X aria-hidden="true" className="size-5 shrink-0 text-destructive" strokeWidth={2.5} />}
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence initial={false}>
        {answered && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={settleSpring}
            className="overflow-hidden"
          >
            <div role="status" className={cn("rounded-[18px] px-5 py-4", right ? "bg-success/10" : "bg-secondary")}>
              <p className={cn("text-[15px] font-semibold", right ? "text-success" : "text-foreground")}>{right ? "Correct" : "Not quite"}</p>
              <p className="mt-1 text-[15px] leading-6">
                <MathText text={part.explain} />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * A rule stated twice: formally, set like a textbook's boxed result, then in words. `compact`
 * is the smaller version beside practice questions.
 */
export function RuleStatement({ part, compact = false }: { part: Extract<LessonPart, { type: "rule" }>; compact?: boolean }) {
  return (
    <div className="space-y-3">
      <div className={cn("rounded-[18px] border border-border bg-background leading-7", compact ? "px-4 py-3 text-[15px]" : "px-5 py-4 text-[16px]")}>
        {part.lines.map((line, i) => (
          <div key={i}>
            {line.lead && (
              <p>
                <MathText text={line.lead} />
              </p>
            )}
            <Tex tex={line.tex} display />
          </div>
        ))}
        {part.where && !compact && (
          <ul className="mt-1 space-y-1.5 border-t border-border pt-3 text-[15px] leading-6 text-muted-foreground">
            {part.where.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="mt-[11px] size-1 shrink-0 rounded-full bg-current" />
                <span>
                  <MathText text={item} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={cn("rounded-[18px] bg-secondary", compact ? "px-4 py-3" : "px-5 py-4")}>
        <p className="text-[13px] font-medium text-muted-foreground">In words</p>
        <p className={cn("mt-1 font-medium", compact ? "text-[15px] leading-6" : "text-[17px] leading-7")}>
          <MathText text={part.plain} />
        </p>
        {part.note && !compact && (
          <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
            <MathText text={part.note} />
          </p>
        )}
      </div>
    </div>
  );
}

function Part({
  part,
  lesson,
  picked,
  onPick,
  onStoryDone,
}: {
  part: LessonPart;
  lesson: QuantLesson;
  picked: number | null;
  onPick: (choice: number) => void;
  onStoryDone: () => void;
}) {
  switch (part.type) {
    case "text":
      return (
        <div className="space-y-4">
          {part.heading && <Heading>{part.heading}</Heading>}
          <Paragraphs body={part.body} />
          {part.visual && <FigureCard visual={part.visual} />}
        </div>
      );
    case "story":
      return <Story part={part} onDone={onStoryDone} />;
    case "rule":
      return (
        <div className="space-y-4">
          <Heading>{part.name}</Heading>
          <RuleStatement part={part} />
        </div>
      );
    case "check":
      return <CheckQuestion part={part} picked={picked} onPick={onPick} />;
    case "example":
      return (
        <div className="space-y-4">
          <Heading>Worked example</Heading>
          {part.lead && (
            <p className="text-[17px] leading-7">
              <MathText text={part.lead} />
            </p>
          )}
          <p className="text-[17px] font-semibold leading-7">
            <MathText text={lesson.example.prompt} />
          </p>
          <Walkthrough problem={lesson.example} />
        </div>
      );
    case "list":
      return (
        <div className="space-y-3">
          <Heading>{part.heading}</Heading>
          <ul className="space-y-2">
            {part.items.map((item) => (
              <li key={item} className="flex gap-2.5 text-[16px] leading-6">
                <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-success" strokeWidth={2.5} />
                <span>
                  <MathText text={item} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "trap":
      return (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.015em]">
            <AlertTriangle aria-hidden="true" className="size-[18px] text-warning" />
            Watch out
          </h2>
          <p className="rounded-[18px] bg-secondary px-5 py-4 text-[16px] leading-6">
            <MathText text={part.body} />
          </p>
        </div>
      );
  }
}

// ─── The reader ──────────────────────────────────────────────────────────────────────────

/**
 * A lesson read one section at a time: each Continue adds the next section below and scrolls
 * to it, and a question waits for an answer before moving on. Someone who has read it before
 * sees the whole lesson at once.
 */
export function LessonReader({ lesson, next }: { lesson: QuantLesson; /** What comes after the lesson: the way into practice. */ next: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const topic = QUANT_TOPICS.find((t) => t.id === lesson.topic)!;
  const free = isFreeQuantLesson(lesson.id);
  const parts = lesson.parts;
  const done = useLessonReadHere(lesson.id);
  const [revealed, setRevealed] = useState(1);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const shown = done ? parts.length : revealed;
  const lastShown = parts[shown - 1];
  const waiting = !done && lastShown.type === "check" && picks[shown - 1] === undefined;
  const finished = shown >= parts.length;
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTo = useRef<number | null>(null);

  useEffect(() => {
    if (scrollTo.current === null) return;
    const el = refs.current[scrollTo.current];
    scrollTo.current = null;
    el?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, [revealed, reduceMotion]);

  const advance = () => {
    const next = revealed + 1;
    scrollTo.current = revealed;
    setRevealed(next);
    if (next >= parts.length) setLessonRead(lesson.id, true);
  };

  return (
    <article className="relative">
      {/* How far through the lesson you are. */}
      <div className="sticky top-14 z-10 bg-background pb-3 pt-3 md:top-16" aria-hidden="true">
        <div className="h-1 overflow-hidden rounded-full bg-control">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${(shown / parts.length) * 100}%` }}
            transition={settleSpring}
          />
        </div>
      </div>

      <div className="space-y-9 pb-8 pt-3">
        <header>
          <p className="text-[13px] font-medium text-muted-foreground">
            Unit {topic.number} · {topic.title}
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.03em]">{lesson.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DifficultyPill difficulty={lesson.difficulty} />
            <span className="rounded-full bg-control px-2.5 py-0.5 text-[13px] font-medium text-muted-foreground">{free ? "Free" : "Pro"}</span>
            {!done && (
              <button
                type="button"
                onClick={() => setLessonRead(lesson.id, true)}
                className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Show it all
                <ChevronDown aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
        </header>

        {parts.slice(0, shown).map((part, i) => (
          <motion.div
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="scroll-mt-24 md:scroll-mt-28"
            initial={reduceMotion || done ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={runEnter}
          >
            <Part
              part={part}
              lesson={lesson}
              picked={picks[i] ?? null}
              onPick={(choice) => setPicks((p) => ({ ...p, [i]: choice }))}
              onStoryDone={() => {}}
            />
          </motion.div>
        ))}

        <AnimatePresence mode="wait" initial={false}>
          {finished ? (
            <motion.div
              key="end"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={runEnter}
              className="space-y-3"
            >
              {next}
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={() => {
                  setLessonRead(lesson.id, false);
                  setRevealed(1);
                  setPicks({});
                  window.scrollTo({ top: 0 });
                }}
              >
                <RotateCcw aria-hidden="true" />
                Read from the start
              </Button>
            </motion.div>
          ) : (
            <motion.div key="continue" initial={false} animate={{ opacity: waiting ? 0.4 : 1 }} transition={{ duration: 0.2 }}>
              <Button onClick={advance} disabled={waiting} className="w-full rounded-full" size="lg">
                {waiting ? "Pick an answer" : "Continue"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}
