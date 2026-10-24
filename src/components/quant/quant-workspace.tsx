"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircleDashed, Clock, Lightbulb, List, Lock, Play, Puzzle, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter, settleSpring, snapSpring } from "@/lib/motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import {
  QUANT_GUIDED,
  QUANT_LESSONS,
  QUANT_MASTERY_FIRST_TRY,
  QUANT_SOLO,
  QUANT_TOPICS,
  createFamilyProblem,
  createQuantLessonProblems,
  getQuantLesson,
  isFreeQuantLesson,
  isQuantLessonMastered,
  type LessonPart,
  type QuantLessonId,
  type QuantProblem,
} from "@/lib/quant/lessons";
import { formatAnswer, isRightAnswer, type AnswerKind } from "@/lib/quant/rational";
import { useQuantProgress } from "@/components/quant/quant-list";
import { DifficultyLabel } from "@/components/quant/difficulty";
import { Walkthrough } from "@/components/quant/walkthrough";
import { QuantFigure } from "@/components/quant/visuals";
import { StepIcon } from "@/components/quant/step-icon";
import { AnswerBox } from "@/components/quant/answer-box";
import { LessonReader, RuleStatement } from "@/components/quant/lesson-reader";
import { recordQuantAttempt } from "@/components/quant/quant-attempts";
import { markPuzzle, markType, useLessonRead, usePuzzleMarks, useQuantAccountSync, useTypeMarks } from "@/components/quant/type-progress";
import { MathExpr, MathText } from "@/components/quant/math";

/** How long a right answer stays on screen before the next question. */
const RIGHT_PAUSE_MS = 900;
/** Wrong submits before the answer is shown. */
const WRONG_TRIES = 2;
const ANSWER_HINTS: Record<AnswerKind, string> = {
  probability: "a fraction, decimal or percent",
  percent: "a percent",
  number: "a number or fraction",
  dollars: "dollars",
  count: "a whole number",
};

type Phase = "answering" | "right" | "missed";
type Attempt = { problem: QuantProblem; result: "right" | "missed" | null; firstTry: boolean; seconds: number | null };
type Run = {
  problems: QuantProblem[];
  index: number;
  phase: Phase;
  wrongTries: number;
  lastWrong: string;
  attempts: Attempt[];
  /** Drilling one question type: endless fresh questions of it, not a scored set. */
  single?: string;
  /** The steps were opened for this question, so it doesn't count as right first time. */
  hinted?: boolean;
  /** Solving one classic puzzle. */
  puzzle?: string;
};

/** A lesson is read, then practised as a scored set, then drilled type by type. */
type Stage = "learn" | "practice" | "drill";
const STAGES: { id: Stage; label: string }[] = [
  { id: "learn", label: "Learn" },
  { id: "practice", label: "Practise" },
  { id: "drill", label: "Drill" },
];

// ─── Small pieces ────────────────────────────────────────────────────────────────────────

/** The three steps of a lesson, in order, each ticked once it's done. */
function StageBar({ stage, onChange, done, locked }: { stage: Stage; onChange: (stage: Stage) => void; done: Record<Stage, boolean>; locked: boolean }) {
  return (
    <nav aria-label="Lesson steps" className="flex items-center">
      {STAGES.map((s, i) => (
        <div key={s.id} className="flex items-center">
          {i > 0 && <span aria-hidden="true" className="mx-0.5 h-px w-3 bg-border sm:mx-1 sm:w-5" />}
          <button
            type="button"
            onClick={() => onChange(s.id)}
            aria-current={stage === s.id ? "step" : undefined}
            className={cn(
              "relative isolate flex h-9 items-center gap-2 rounded-full pl-1.5 pr-3.5 text-[14px] font-medium transition-colors",
              stage === s.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {stage === s.id && <motion.span layoutId="stage-pill" transition={snapSpring} aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-control" />}
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-300",
                done[s.id] ? "bg-success text-background" : stage === s.id ? "bg-foreground text-background" : "bg-control text-muted-foreground",
              )}
            >
              {done[s.id] ? (
                <Check aria-label="Done" className="size-3.5" strokeWidth={3} />
              ) : locked && s.id !== "learn" ? (
                <Lock aria-label="Pro" className="size-3" />
              ) : (
                i + 1
              )}
            </span>
            {s.label}
          </button>
        </div>
      ))}
    </nav>
  );
}

/** One line of working as a hint: its icon, label and sum, with the answer left as "?". */
function HintStep({ step, hideResult }: { step: QuantProblem["steps"][number]; hideResult: boolean }) {
  return (
    <li className="flex gap-3">
      <StepIcon name={step.icon} className="size-7" />
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{step.label}</p>
        <p className="text-[15px] font-medium leading-7">
          <MathExpr expr={step.result || hideResult ? `${step.work} = ${hideResult ? "?" : step.result}` : step.work} />
        </p>
      </div>
    </li>
  );
}

function StageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header>
      <p className="text-[13px] font-medium text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
      {children && <div className="mt-2 text-[17px] leading-7 text-muted-foreground">{children}</div>}
    </header>
  );
}

/** The lesson's rule beside the questions, so the method is in view while using it. */
function RuleAside({ rule, onReread }: { rule: Extract<LessonPart, { type: "rule" }> | undefined; onReread: () => void }) {
  return (
    <div className="space-y-3">
      {rule && (
        <>
          <p className="px-1 text-[13px] font-medium text-muted-foreground">From the lesson</p>
          <p className="px-1 text-[17px] font-semibold tracking-[-0.01em]">{rule.name}</p>
          <RuleStatement part={rule} compact />
        </>
      )}
      <Button variant="ghost" size="sm" onClick={onReread} className="text-muted-foreground">
        <BookOpen aria-hidden="true" />
        Reread the lesson
      </Button>
    </div>
  );
}

/** On a phone the rule folds away above the question. */
function RuleFold({ rule, onReread }: { rule: Extract<LessonPart, { type: "rule" }> | undefined; onReread: () => void }) {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  if (!rule) return null;
  return (
    <div className="rounded-[18px] bg-secondary md:hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block text-[12px] font-medium text-muted-foreground">From the lesson</span>
          <span className="block truncate text-[15px] font-semibold">{rule.name}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={settleSpring}
            className="overflow-hidden"
          >
            <div className="space-y-2 px-3 pb-3">
              <RuleStatement part={rule} compact />
              <Button variant="ghost" size="sm" onClick={onReread} className="text-muted-foreground">
                <BookOpen aria-hidden="true" />
                Reread the lesson
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── The lesson ──────────────────────────────────────────────────────────────────────────

/**
 * A lesson in three steps. Learn: read it, a section at a time. Practise: a scored set, the
 * first questions guided, with the rule kept beside them. Drill: any question type or puzzle
 * on its own. Each step leads into the next, and the steps are in the URL (?step=) so Back works.
 */
export function QuantWorkspace({ lessonId }: { lessonId: QuantLessonId }) {
  const lesson = getQuantLesson(lessonId)!;
  const reduceMotion = useReducedMotion();
  const { lessons, setLessons, locked, signedIn } = useQuantProgress();
  const typeMarks = useTypeMarks(lessonId);
  const puzzleMarks = usePuzzleMarks();
  const read = useLessonRead(lessonId);
  useQuantAccountSync();
  const params = useSearchParams();
  const initialPuzzle = params.get("puzzle");
  const step = params.get("step");
  const stage: Stage = step === "practice" || step === "drill" ? step : initialPuzzle ? "drill" : "learn";
  // One sample prompt per type, the same on every render (a fixed seed).
  const [familySamples] = useState(() =>
    lesson.families.map((family, i) => {
      let seed = 97 + i * 13;
      const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
      return family.generate(random).prompt;
    }),
  );
  const lessonLocked = locked && !isFreeQuantLesson(lesson.id);
  const topic = QUANT_TOPICS.find((t) => t.id === lesson.topic)!;
  const rule = lesson.parts.find((p): p is Extract<LessonPart, { type: "rule" }> => p.type === "rule");
  const position = QUANT_LESSONS.indexOf(lesson);
  const previous = QUANT_LESSONS[position - 1] ?? null;
  const next = QUANT_LESSONS[position + 1] ?? null;

  const [run, setRun] = useState<Run | null>(null);
  const [finished, setFinished] = useState<{ attempts: Attempt[]; mastered: boolean; newlyMastered: boolean; average: number | null } | null>(null);
  // The question whose solution is open, by key; a missed question opens its own.
  const [solutionFor, setSolutionFor] = useState<string | null>(null);
  const [openResult, setOpenResult] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [now, setNow] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const shownAt = useRef(0);
  // The same start time as state, for the on-screen timer.
  const [questionStart, setQuestionStart] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  // The question timer ticks while a question is open.
  useEffect(() => {
    if (run?.phase !== "answering") return;
    const timer = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(timer);
  }, [run?.phase, run?.index]);

  const goTo = useCallback(
    (to: Stage) => {
      if (to === stage && !initialPuzzle) return;
      // Next.js keeps useSearchParams in step with pushState, and Back returns to the last step.
      window.history.pushState(null, "", to === "learn" ? `/quant/${lesson.id}` : `/quant/${lesson.id}?step=${to}`);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [stage, initialPuzzle, lesson.id],
  );

  const reloadProgress = useCallback(() => {
    fetch("/api/lessons/progress", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setLessons(data))
      .catch(() => {});
  }, [setLessons]);

  const begin = (problems: QuantProblem[], extra: Pick<Run, "single" | "puzzle">) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setRun({ problems, index: 0, phase: "answering", wrongTries: 0, lastWrong: "", attempts: problems.map((problem) => ({ problem, result: null, firstTry: false, seconds: null })), ...extra });
    setFinished(null);
    setSolutionFor(null);
    setOpenResult(null);
    setInput("");
    shownAt.current = performance.now();
    setQuestionStart(shownAt.current);
    setNow(shownAt.current);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const start = (single?: string) => {
    begin(single ? [createFamilyProblem(lesson, single)] : createQuantLessonProblems(lesson), { single });
    goTo(single ? "drill" : "practice");
    captureAnalyticsEvent(ANALYTICS_EVENTS.quantLessonStarted, { lesson_id: lesson.id, topic: lesson.topic, signed_in: signedIn });
  };

  const startPuzzle = (puzzleId: string) => {
    const puzzle = lesson.puzzles.find((p) => p.id === puzzleId);
    if (!puzzle) return;
    begin([{ ...puzzle.problem, family: `puzzle:${puzzle.id}` }], { puzzle: puzzle.id });
  };

  // A link to a puzzle (from the Puzzles page) opens straight into it.
  const openedPuzzle = useRef(false);
  useEffect(() => {
    if (openedPuzzle.current || !initialPuzzle || lessonLocked) return;
    openedPuzzle.current = true;
    // Not cleared on re-render: the guard above makes this run once, and later renders
    // (the session arriving) mustn't cancel it.
    setTimeout(() => startPuzzle(initialPuzzle), 0);
  });

  const finish = (done: Run) => {
    const solo = done.attempts.slice(QUANT_GUIDED);
    const soloFirstTry = solo.filter((a) => a.firstTry).length;
    const times = solo.filter((a) => a.firstTry && a.seconds !== null).map((a) => a.seconds!);
    const average = times.length ? times.reduce((sum, t) => sum + t, 0) / times.length : null;
    const result = { soloCount: QUANT_SOLO, soloFirstTry, soloAverageSeconds: average };
    const mastered = isQuantLessonMastered(lesson, result);
    const wasMastered = !!lessons?.progress[lesson.id]?.mastered;
    setFinished({ attempts: done.attempts, mastered: mastered || wasMastered, newlyMastered: mastered && !wasMastered, average });
    setRun(null);
    setSolutionFor(null);
    window.scrollTo({ top: 0, behavior: reduceMotion ? "instant" : "smooth" });
    captureAnalyticsEvent(ANALYTICS_EVENTS.quantLessonCompleted, { lesson_id: lesson.id, topic: lesson.topic, solo_first_try: soloFirstTry, mastered, signed_in: signedIn });
    if (signedIn) {
      fetch("/api/lessons/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id, ...result }) })
        .then(() => reloadProgress())
        .catch(() => {});
    }
  };

  const advance = (current: Run) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setSolutionFor(null);
    // A puzzle: on to the lesson's next puzzle, or back to the list when it's the last.
    if (current.puzzle) {
      const at = lesson.puzzles.findIndex((p) => p.id === current.puzzle);
      const nextPuzzle = lesson.puzzles[at + 1];
      if (nextPuzzle) startPuzzle(nextPuzzle.id);
      else setRun(null);
      return;
    }
    // One type: another question of it, with numbers not seen yet this session.
    if (current.single) {
      const fresh = createFamilyProblem(lesson, current.single, new Set(current.problems.map((p) => p.key)));
      current = {
        ...current,
        problems: [...current.problems, fresh],
        attempts: [...current.attempts, { problem: fresh, result: null, firstTry: false, seconds: null }],
      };
    } else if (current.index + 1 >= current.problems.length) {
      finish(current);
      return;
    }
    setInput("");
    setRun({ ...current, index: current.index + 1, phase: "answering", wrongTries: 0, lastWrong: "", hinted: false });
    shownAt.current = performance.now();
    setQuestionStart(shownAt.current);
    setNow(shownAt.current);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const record = (current: Run, result: "right" | "missed"): Run => {
    const seconds = (performance.now() - shownAt.current) / 1000;
    const family = current.problems[current.index].family;
    const clean = result === "right" && current.wrongTries === 0 && !current.hinted;
    if (current.puzzle) markPuzzle(current.puzzle, clean);
    else if (family) markType(lesson.id, family, clean);
    // Saved for review; guided questions show the steps, so they say nothing either way.
    const isGuided = !current.single && !current.puzzle && current.index < QUANT_GUIDED;
    const reviewFamily = current.puzzle ? `puzzle:${current.puzzle}` : family;
    if (signedIn && !isGuided && reviewFamily) recordQuantAttempt({ lessonId: lesson.id, family: reviewFamily, correct: clean, seconds });
    const attempts = current.attempts.map((a, i) => (i === current.index ? { ...a, result, firstTry: clean, seconds } : a));
    if (result === "missed") setSolutionFor(current.problems[current.index].key);
    return { ...current, attempts, phase: result };
  };

  const markRight = (current: Run) => {
    const next = record(current, "right");
    setRun(next);
    // A set moves on by itself; a drill waits, so the working can be read.
    if (!current.single && !current.puzzle) advanceTimer.current = setTimeout(() => advance(next), RIGHT_PAUSE_MS);
  };

  const reveal = () => {
    if (!run || run.phase !== "answering") return;
    setRun(record(run, "missed"));
  };

  const openSolution = () => {
    if (!run) return;
    // Reading the working holds the set on this question until Next.
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setSolutionFor(run.problems[run.index].key);
  };

  const changeInput = (value: string) => {
    setInput(value);
    // Right answers go through as soon as they're typed; wrong ones wait for Submit.
    if (run?.phase === "answering" && isRightAnswer(value, run.problems[run.index].answer, run.problems[run.index].kind)) markRight(run);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!run || run.phase !== "answering" || !input.trim()) return;
    const problem = run.problems[run.index];
    if (isRightAnswer(input, problem.answer, problem.kind)) return markRight(run);
    const wrongTries = run.wrongTries + 1;
    if (wrongTries >= WRONG_TRIES) {
      setRun(record({ ...run, wrongTries, lastWrong: input }, "missed"));
    } else {
      setRun({ ...run, wrongTries, lastWrong: input });
      inputRef.current?.select();
    }
  };

  const nextPuzzleLabel = (puzzleId: string) =>
    lesson.puzzles.findIndex((p) => p.id === puzzleId) + 1 < lesson.puzzles.length ? "Next puzzle" : "Done";

  const saved = lessons?.progress[lesson.id];
  const typesSolved = lesson.families.filter((f) => typeMarks[f.id] === "solved").length;
  const done: Record<Stage, boolean> = {
    learn: read,
    practice: !!saved?.mastered,
    drill: typesSolved === lesson.families.length,
  };
  const practiceRun = run && !run.single && !run.puzzle ? run : null;
  const drillRun = run && (run.single || run.puzzle) ? run : null;

  // ── The upgrade panel, where practice would be ──
  const lockedPanel = (
    <div className="grid place-items-center gap-3 rounded-[22px] bg-secondary px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-background">
        <Lock aria-hidden="true" className="h-5 w-5" />
      </span>
      <p className="text-[19px] font-semibold tracking-tight">Practice is part of Pro</p>
      <p className="max-w-sm text-[15px] leading-6 text-muted-foreground">
        Every lesson is open to read. Pro opens practice and drills for all {QUANT_LESSONS.length} lessons.
      </p>
      <Link
        href={getUpgradeUrl({ feature: "quant", source: "quant_lesson", next: `/quant/${lesson.id}?step=${stage === "drill" ? "drill" : "practice"}` })}
        onClick={() => captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, { feature: "quant", surface: "quant_practice", action: "open_pricing", lesson_id: lesson.id })}
        className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-2")}
      >
        <Lock aria-hidden="true" className="h-4 w-4" />
        Unlock with Pro
      </Link>
    </div>
  );

  // ── Learn: the lesson, ending in the way into practice ──
  const setSize = QUANT_GUIDED + QUANT_SOLO;
  const learnNext = lessonLocked ? (
    lockedPanel
  ) : (
    <div className="rounded-[22px] bg-secondary p-5 sm:p-6">
      <p className="text-[13px] font-medium text-muted-foreground">Next · Practise</p>
      <p className="mt-1 text-[19px] font-semibold tracking-[-0.015em]">Try it on {setSize} questions</p>
      <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
        The first {QUANT_GUIDED} walk you through the steps. The other {QUANT_SOLO} are on your own, with the rule beside them.
      </p>
      <Button variant="brand" size="lg" onClick={() => start()} className="mt-4 w-full sm:w-auto">
        <Play aria-hidden="true" className="h-4 w-4 fill-current" />
        Start practice
      </Button>
    </div>
  );

  // ── A question being answered: the same card for the set, a drill and a puzzle ──
  const problem = run ? run.problems[run.index] : null;
  // Only the set guides its first questions; a drill or a puzzle shows the steps on request.
  const guided = run ? !run.single && !run.puzzle && run.index < QUANT_GUIDED : false;
  const seconds = run && run.phase === "answering" ? Math.max(0, Math.floor((now - questionStart) / 1000)) : null;
  const solutionOpen = !!problem && solutionFor === problem.key;

  const runner = run && problem && (
    <section className="overflow-clip rounded-[20px] border border-border bg-background">
      <div className="space-y-5 px-5 py-6 sm:px-6">
        <div className="flex min-h-8 items-center justify-between gap-3">
          {run.single || run.puzzle ? (
            <p className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
              {run.puzzle ? `Puzzle · ${lesson.puzzles.find((p) => p.id === run.puzzle)?.title}` : `Drill · ${lesson.families.find((f) => f.id === run.single)?.title}`}
            </p>
          ) : (
            // Where you are in the set: done ones in their result colour, the current one in ink.
            <div className="flex flex-wrap gap-1.5" aria-label={`Question ${run.index + 1} of ${run.problems.length}`}>
              {run.attempts.map((a, i) => (
                <span
                  key={a.problem.key}
                  className={cn(
                    "grid size-8 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors duration-300",
                    i === run.index ? "bg-foreground text-background" : a.result === "right" ? "bg-success/15 text-success" : a.result === "missed" ? "bg-destructive/15 text-destructive" : "bg-control text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
              ))}
            </div>
          )}
          <div className="flex shrink-0 items-center gap-1">
            {seconds !== null && (
              <span className="flex items-center gap-1 px-1 text-[14px] tabular-nums text-muted-foreground">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => { if (advanceTimer.current) clearTimeout(advanceTimer.current); setRun(null); }} className="text-muted-foreground">
              {run.single || run.puzzle ? (
                <>
                  <List aria-hidden="true" />
                  All
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-current" />
                  Stop
                </>
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={problem.key} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={runEnter} className="space-y-5">
            {run.single || run.puzzle ? (
              !run.hinted &&
              run.phase === "answering" && (
                <Button variant="ghost" size="sm" onClick={() => setRun({ ...run, hinted: true })} className="-ml-2 -mt-2 text-muted-foreground">
                  <Lightbulb aria-hidden="true" />
                  Show the steps
                </Button>
              )
            ) : (
              <p className="text-[13px] font-medium text-muted-foreground">{guided ? "Guided · the steps are shown" : "On your own"}</p>
            )}
            <p data-problem className="text-[19px] leading-8">
              <MathText text={problem.prompt} />
            </p>
            {problem.visual && (
              <div className="rounded-[18px] bg-secondary px-3 py-4">
                <QuantFigure visual={problem.visual} />
              </div>
            )}
            {(guided || run.hinted) && !solutionOpen && (
              <ol aria-label="Steps" className="space-y-3 rounded-[18px] border border-border px-4 py-4">
                {problem.steps.map((s, i) => (
                  <HintStep key={i} step={s} hideResult={i === problem.steps.length - 1 && run.phase === "answering"} />
                ))}
              </ol>
            )}
          </motion.div>
        </AnimatePresence>

        <AnswerBox kind={problem.kind} value={input} onChange={changeInput} onSubmit={submit} disabled={run.phase !== "answering"} inputRef={inputRef} />

        {/* The solution opens in place, under the answer. */}
        <AnimatePresence initial={false}>
          {solutionOpen && (
            <motion.div
              key={problem.key}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
              transition={settleSpring}
              className="overflow-hidden"
            >
              <div className="space-y-4 border-t border-border pt-5">
                <p className="text-[13px] font-medium text-muted-foreground">Solution</p>
                <Walkthrough problem={problem} startWithAll={run.phase === "missed"} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The result console, as on a coding judge. It stays in view at the bottom of the screen. */}
      <div className="sticky bottom-0 border-t border-border bg-background px-5 py-4 sm:px-6" role="status">
        {run.phase === "answering" ? (
          <div className="flex items-center justify-between gap-3">
            <p className={cn("text-[14px] leading-5", run.wrongTries > 0 ? "font-medium text-destructive" : "text-muted-foreground")}>
              {run.wrongTries > 0 ? `${run.lastWrong} isn’t right. One more try.` : `Answer as ${ANSWER_HINTS[problem.kind]}. Right answers go through as you type.`}
            </p>
            <Button variant="ghost" size="sm" onClick={reveal} className="shrink-0 text-muted-foreground">
              Show answer
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={cn("text-[17px] font-semibold", run.phase === "right" ? "text-success" : "text-destructive")}>
                {run.phase === "right" ? "Correct" : run.lastWrong ? "Wrong answer" : "Answer shown"}
              </p>
              <p className="text-[14px] tabular-nums text-muted-foreground">
                {run.phase === "right" ? (
                  <>
                    {formatAnswer(problem.answer, problem.kind)} · {run.attempts[run.index].seconds?.toFixed(1)}s
                  </>
                ) : (
                  <>
                    {run.lastWrong && <>You entered {run.lastWrong}. </>}Expected {formatAnswer(problem.answer, problem.kind)}.
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {!solutionOpen && (
                <Button variant="secondary" size="sm" onClick={openSolution}>
                  <Lightbulb aria-hidden="true" />
                  Solution
                </Button>
              )}
              {(run.phase === "missed" || run.single || run.puzzle || solutionOpen) && (
                <Button size="sm" onClick={() => advance(run)} autoFocus>
                  {run.puzzle ? nextPuzzleLabel(run.puzzle) : run.single ? "Another one" : run.index + 1 >= run.problems.length ? "Finish" : "Next"}
                  <ChevronRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );

  // The question with the rule beside it (desktop) or folded above it (phone).
  const withRule = (body: ReactNode) => (
    <div className="mx-auto w-full max-w-[1040px] md:grid md:grid-cols-[minmax(0,1fr)_300px] md:gap-8">
      <div className="min-w-0 space-y-3">
        <RuleFold rule={rule} onReread={() => goTo("learn")} />
        {body}
      </div>
      <aside className="max-md:hidden">
        <div className="sticky top-24">
          <RuleAside rule={rule} onReread={() => goTo("learn")} />
        </div>
      </aside>
    </div>
  );

  // ── Practise: the set's intro, the set, or how it went ──
  const missedTypes = finished
    ? [...new Set(finished.attempts.filter((a) => !a.firstTry && a.problem.family).map((a) => a.problem.family!))]
        .map((id) => lesson.families.find((f) => f.id === id))
        .filter((f): f is NonNullable<typeof f> => !!f)
    : [];

  const practiceStage = lessonLocked ? (
    <div className="mx-auto max-w-[680px] space-y-6">
      <StageHeader eyebrow={lesson.title} title="Practise" />
      {lockedPanel}
    </div>
  ) : practiceRun ? (
    withRule(runner)
  ) : finished ? (
    <div className="mx-auto max-w-[680px] space-y-6">
      <div className="pt-2 text-center">
        {finished.newlyMastered && (
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.45, duration: 0.6, delay: 0.1 }}
            className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-success text-background"
          >
            <Check aria-hidden="true" className="h-6 w-6" strokeWidth={3} />
          </motion.div>
        )}
        <p className="text-[15px] font-medium text-muted-foreground">{finished.newlyMastered ? `${lesson.title} mastered` : "Practice complete"}</p>
        <p className="mt-1 text-[64px] font-semibold leading-none tracking-[-0.05em] tabular-nums">
          {finished.attempts.slice(QUANT_GUIDED).filter((a) => a.firstTry).length}
          <span className="text-[28px] text-muted-foreground">/{QUANT_SOLO}</span>
        </p>
        <p className="mt-2 text-[15px] text-muted-foreground">on your own, right on the first try</p>
      </div>
      <dl className="divide-y divide-border rounded-[18px] bg-secondary px-5">
        <div className="flex items-center justify-between gap-4 py-3 text-[15px]">
          <dt className="text-muted-foreground">Mastery</dt>
          <dd className={cn("text-right font-semibold", finished.mastered && "text-success")}>
            {finished.mastered ? "Mastered" : `${QUANT_MASTERY_FIRST_TRY} of ${QUANT_SOLO} in under ${lesson.targetSeconds}s each`}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-3 text-[15px]">
          <dt className="text-muted-foreground">Average time</dt>
          <dd className="font-semibold tabular-nums">{finished.average === null ? "–" : `${finished.average.toFixed(1)}s`}</dd>
        </div>
      </dl>

      <div className="space-y-2">
        {next && finished.mastered && !(locked && !isFreeQuantLesson(next.id)) ? (
          <Link href={`/quant/${next.id}`} className={cn(buttonVariants({ variant: "brand", size: "lg" }), "w-full")}>
            Next lesson: {next.title}
            <ChevronRight aria-hidden="true" />
          </Link>
        ) : (
          <Button variant="brand" size="lg" onClick={() => start()} className="w-full">
            <RotateCcw aria-hidden="true" />
            Practise again
          </Button>
        )}
        {next && locked && !isFreeQuantLesson(next.id) && (
          <Link href={getUpgradeUrl({ feature: "quant", source: "quant_results", next: `/quant/${next.id}` })} className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}>
            <Lock aria-hidden="true" className="h-4 w-4" />
            Unlock the next lessons with Pro
          </Link>
        )}
        {!signedIn && (
          <p className="pt-1 text-center text-[15px] text-muted-foreground">
            <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/quant/${lesson.id}?step=practice`)}`} className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </Link>{" "}
            to save your progress.
          </p>
        )}
      </div>

      {/* What to do about the misses: drill those types. */}
      {missedTypes.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-[15px] font-semibold">Drill what you missed</p>
          <div className="flex flex-wrap gap-2">
            {missedTypes.map((family) => (
              <Button key={family.id} variant="secondary" size="sm" onClick={() => start(family.id)}>
                {family.title}
                <ChevronRight aria-hidden="true" />
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="px-1 text-[15px] font-semibold">Your answers</p>
        <ol className="space-y-1.5">
          {finished.attempts.map((a, i) => (
            <li key={a.problem.key} className={cn("rounded-2xl transition-colors", openResult === i && "bg-secondary")}>
              <button
                type="button"
                onClick={() => setOpenResult(openResult === i ? null : i)}
                aria-expanded={openResult === i}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-control-hover"
              >
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", a.result === "right" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                  {a.result === "right" ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> : <X aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px]">{a.problem.prompt}</span>
                <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300", openResult === i && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {openResult === i && (
                  <motion.div
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={settleSpring}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 px-4 pb-5 pt-2">
                      <p className="text-[17px] leading-7">
                        <MathText text={a.problem.prompt} />
                      </p>
                      <Walkthrough problem={a.problem} startWithAll />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ol>
      </div>
    </div>
  ) : (
    <div className="mx-auto max-w-[680px] space-y-6">
      <StageHeader eyebrow={lesson.title} title="Practise">
        {setSize} questions. The first {QUANT_GUIDED} show the steps, then {QUANT_SOLO} on your own. Get {QUANT_MASTERY_FIRST_TRY} of those right first time, in under{" "}
        {lesson.targetSeconds}s each, to master the lesson.
      </StageHeader>
      {saved && (
        <p className={cn("text-[15px] font-medium", saved.mastered ? "text-success" : "text-muted-foreground")}>
          {saved.mastered ? "Mastered" : `Best so far: ${saved.bestFirstTry} of ${QUANT_SOLO}`}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="brand" size="lg" onClick={() => start()} className="w-full sm:w-auto">
          <Play aria-hidden="true" className="h-4 w-4 fill-current" />
          Start practice
        </Button>
        {!read && (
          <Button variant="ghost" size="lg" onClick={() => goTo("learn")} className="w-full text-muted-foreground sm:w-auto">
            <BookOpen aria-hidden="true" />
            Read the lesson first
          </Button>
        )}
      </div>
      {rule && (
        <div className="space-y-3 pt-2">
          <p className="px-1 text-[13px] font-medium text-muted-foreground">You’ll use · {rule.name}</p>
          <RuleStatement part={rule} compact />
        </div>
      )}
    </div>
  );

  // ── Drill: every question type and puzzle in the lesson, each on its own ──
  const drillStage = drillRun ? (
    withRule(runner)
  ) : (
    <div className="mx-auto max-w-[680px] space-y-6">
      <StageHeader eyebrow={lesson.title} title="Drill">
        The {lesson.families.length} kinds of question in this lesson, one at a time, with new numbers every time.
      </StageHeader>
      {lessonLocked && lockedPanel}
      <ol className="divide-y divide-border">
        {lesson.families.map((family, index) => {
          const mark = typeMarks[family.id];
          return (
            <li key={family.id}>
              <button
                type="button"
                disabled={lessonLocked}
                onClick={() => start(family.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors enabled:hover:bg-secondary disabled:opacity-60",
                )}
              >
                <span className="grid size-7 shrink-0 place-items-center">
                  {mark === "solved" ? (
                    <Check aria-label="Solved" className="h-4 w-4 text-success" strokeWidth={2.5} />
                  ) : mark === "tried" ? (
                    <CircleDashed aria-label="Tried" className="h-4 w-4 text-warning" />
                  ) : (
                    <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{family.title}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{familySamples[index]}</span>
                </span>
                <span className="shrink-0 text-[13px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                  {lessonLocked ? <Lock aria-label="Pro" className="h-3.5 w-3.5" /> : "Drill"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {lesson.puzzles.length > 0 && (
        <div className="space-y-3 pt-4">
          <div className="px-1">
            <p className="text-[19px] font-semibold tracking-tight">Puzzles</p>
            <p className="mt-1 text-[15px] leading-6 text-muted-foreground">Classic one-off questions this lesson&apos;s method solves.</p>
          </div>
          <ol className="divide-y divide-border">
            {lesson.puzzles.map((puzzle) => {
              const mark = puzzleMarks[puzzle.id];
              return (
                <li key={puzzle.id}>
                  <button
                    type="button"
                    disabled={lessonLocked}
                    onClick={() => startPuzzle(puzzle.id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left transition-colors enabled:hover:bg-secondary disabled:opacity-60",
                        )}
                  >
                    <span className="grid size-7 shrink-0 place-items-center">
                      {mark === "solved" ? (
                        <Check aria-label="Solved" className="h-4 w-4 text-success" strokeWidth={2.5} />
                      ) : mark === "tried" ? (
                        <CircleDashed aria-label="Tried" className="h-4 w-4 text-warning" />
                      ) : (
                        <Puzzle aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{puzzle.title}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">{puzzle.problem.prompt}</span>
                    </span>
                    <span className="shrink-0 text-[13px]">
                      {lessonLocked ? <Lock aria-label="Pro" className="h-3.5 w-3.5 text-muted-foreground" /> : <DifficultyLabel difficulty={puzzle.difficulty} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );

  return (
    <div className="px-4 pb-16 md:px-6">
      {/* Top bar: the course, the lesson's steps, and the lessons either side (desktop). */}
      <div className="-mx-4 mb-4 flex items-center justify-between gap-2 border-b border-border px-4 py-2.5 md:mx-auto md:mb-0 md:max-w-[1040px] md:border-0 md:px-0 md:py-4">
        <Link href="/quant" aria-label="All lessons" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 px-2.5")}>
          <List aria-hidden="true" />
          <span className="max-md:hidden">
            Unit {topic.number} · {position + 1} of {QUANT_LESSONS.length}
          </span>
        </Link>
        <StageBar stage={stage} onChange={goTo} done={done} locked={lessonLocked} />
        <div className="flex items-center max-md:hidden">
          <Link
            href={previous ? `/quant/${previous.id}` : "#"}
            aria-disabled={!previous}
            aria-label={previous ? `Previous lesson: ${previous.title}` : "Previous lesson"}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2", !previous && "pointer-events-none opacity-40")}
          >
            <ChevronLeft aria-hidden="true" />
          </Link>
          <Link
            href={next ? `/quant/${next.id}` : "#"}
            aria-disabled={!next}
            aria-label={next ? `Next lesson: ${next.title}` : "Next lesson"}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mr-2 px-2", !next && "pointer-events-none opacity-40")}
          >
            <ChevronRight aria-hidden="true" />
          </Link>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stage}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={runEnter}
          className="md:pt-4"
        >
          {stage === "learn" ? (
            <div className="mx-auto max-w-[680px]">
              <LessonReader lesson={lesson} next={learnNext} />
            </div>
          ) : stage === "practice" ? (
            practiceStage
          ) : (
            drillStage
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
