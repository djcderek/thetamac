"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BookOpen, ListChecks, Puzzle, Check, ChevronLeft, CircleDashed, ChevronRight, Clock, Lightbulb, List, Lock, Play, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter, snapSpring } from "@/lib/motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import {
  QUANT_GUIDED,
  QUANT_LESSONS,
  QUANT_MASTERY_FIRST_TRY,
  QUANT_SOLO,
  createFamilyProblem,
  createQuantLessonProblems,
  getQuantLesson,
  isFreeQuantLesson,
  isQuantLessonMastered,
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
import { LessonReader } from "@/components/quant/lesson-reader";
import { markPuzzle, markType, usePuzzleMarks, useTypeMarks } from "@/components/quant/type-progress";

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
  /** Practising one question type: endless fresh questions of it, not a scored set. */
  single?: string;
  /** The steps were opened for this question, so it doesn't count as right first time. */
  hinted?: boolean;
  /** Solving one classic puzzle. */
  puzzle?: string;
};
type LeftTab = "lesson" | "questions" | "walkthrough";

const noSubscribe = () => () => {};
function readSplit() {
  try {
    const saved = Number(localStorage.getItem("quant-split"));
    return saved >= 30 && saved <= 70 ? saved : 50;
  } catch {
    return 50;
  }
}
type MobileTab = LeftTab | "practice";

// ─── Small pieces ────────────────────────────────────────────────────────────────────────

function Tabs<T extends string>({ tabs, value, onChange, id }: { tabs: { id: T; label: string; icon: ReactNode }[]; value: T; onChange: (tab: T) => void; id: string }) {
  return (
    <div role="tablist" className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative isolate flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium transition-colors sm:px-3.5",
            value === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === tab.id && (
            <motion.span layoutId={`${id}-tab`} transition={snapSpring} aria-hidden="true" className="absolute inset-0 -z-10 rounded-full bg-control" />
          )}
          {/* Phones show four tabs, so labels only. */}
          <span className="max-sm:hidden">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function Pane({ header, children, className, style }: { header: ReactNode; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section style={style} className={cn("flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-border bg-background", className)}>
      {/* Phones use the shared tab bar above the panes instead of each pane's header. */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-2 max-md:hidden">{header}</div>
      <div className="min-h-0 flex-1 md:overflow-y-auto">{children}</div>
    </section>
  );
}

/** One line of working as a hint: its icon, label and sum, with the answer left as "?". */
function HintStep({ step, hideResult }: { step: QuantProblem["steps"][number]; hideResult: boolean }) {
  return (
    <li className="flex gap-3">
      <StepIcon name={step.icon} className="size-7" />
      <div className="min-w-0">
        <p className="text-[13px] text-muted-foreground">{step.label}</p>
        <p className="text-[15px] font-medium tabular-nums">
          {step.work}
          {(step.result || hideResult) && <> = {hideResult ? "?" : step.result}</>}
        </p>
      </div>
    </li>
  );
}

// ─── The workspace ───────────────────────────────────────────────────────────────────────

/**
 * A lesson as a two-pane workspace, like a coding problem page: the lesson and walkthroughs
 * on the left, practice on the right with a result console. Phones switch between them with tabs.
 */
export function QuantWorkspace({ lessonId }: { lessonId: QuantLessonId }) {
  const lesson = getQuantLesson(lessonId)!;
  const reduceMotion = useReducedMotion();
  const { lessons, setLessons, locked, signedIn } = useQuantProgress();
  const typeMarks = useTypeMarks(lessonId);
  const initialPuzzle = useSearchParams().get("puzzle");
  const puzzleMarks = usePuzzleMarks();
  // One sample prompt per type, the same on every render (a fixed seed).
  const [familySamples] = useState(() =>
    lesson.families.map((family, i) => {
      let seed = 97 + i * 13;
      const random = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
      return family.generate(random).prompt;
    }),
  );
  const lessonLocked = locked && !isFreeQuantLesson(lesson.id);
  const position = QUANT_LESSONS.indexOf(lesson);
  const previous = QUANT_LESSONS[position - 1] ?? null;
  const next = QUANT_LESSONS[position + 1] ?? null;

  const [leftTab, setLeftTab] = useState<LeftTab>("lesson");
  const [mobileTab, setMobileTab] = useState<MobileTab>("lesson");
  const [run, setRun] = useState<Run | null>(null);
  const [finished, setFinished] = useState<{ attempts: Attempt[]; mastered: boolean; newlyMastered: boolean; average: number | null } | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [input, setInput] = useState("");
  const [now, setNow] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const shownAt = useRef(0);
  // The same start time as state, for the on-screen timer.
  const [questionStart, setQuestionStart] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The split between the panes on desktop, remembered per browser (50/50 until read).
  const savedSplit = useSyncExternalStore(noSubscribe, readSplit, () => 50);
  const [dragSplit, setSplit] = useState<number | null>(null);
  const split = dragSplit ?? savedSplit;
  const panes = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  // The question timer ticks while a question is open.
  useEffect(() => {
    if (run?.phase !== "answering") return;
    const timer = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(timer);
  }, [run?.phase, run?.index]);


  const reloadProgress = useCallback(() => {
    fetch("/api/lessons/progress", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setLessons(data))
      .catch(() => {});
  }, [setLessons]);

  const start = (single?: string) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const problems = single ? [createFamilyProblem(lesson, single)] : createQuantLessonProblems(lesson);
    setRun({
      problems,
      index: 0,
      phase: "answering",
      wrongTries: 0,
      lastWrong: "",
      attempts: problems.map((problem) => ({ problem, result: null, firstTry: false, seconds: null })),
      single,
    });
    setFinished(null);
    setInput("");
    setReviewIndex(0);
    setMobileTab("practice");
    shownAt.current = performance.now();
    setQuestionStart(shownAt.current);
    setNow(shownAt.current);
    captureAnalyticsEvent(ANALYTICS_EVENTS.quantLessonStarted, { lesson_id: lesson.id, topic: lesson.topic, signed_in: signedIn });
  };

  const startPuzzle = (puzzleId: string) => {
    const puzzle = lesson.puzzles.find((p) => p.id === puzzleId);
    if (!puzzle) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    const problem = { ...puzzle.problem, family: `puzzle:${puzzle.id}` };
    setRun({ problems: [problem], index: 0, phase: "answering", wrongTries: 0, lastWrong: "", attempts: [{ problem, result: null, firstTry: false, seconds: null }], puzzle: puzzle.id });
    setFinished(null);
    setInput("");
    setReviewIndex(0);
    setMobileTab("practice");
    shownAt.current = performance.now();
    setQuestionStart(shownAt.current);
    setNow(shownAt.current);
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
    captureAnalyticsEvent(ANALYTICS_EVENTS.quantLessonCompleted, { lesson_id: lesson.id, topic: lesson.topic, solo_first_try: soloFirstTry, mastered, signed_in: signedIn });
    if (signedIn) {
      fetch("/api/lessons/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id, ...result }) })
        .then(() => reloadProgress())
        .catch(() => {});
    }
  };

  const advance = (current: Run) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    // A puzzle: on to the lesson's next puzzle, or back to the start when it's the last.
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
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const record = (current: Run, result: "right" | "missed"): Run => {
    const seconds = (performance.now() - shownAt.current) / 1000;
    const family = current.problems[current.index].family;
    const clean = result === "right" && current.wrongTries === 0 && !current.hinted;
    if (current.puzzle) markPuzzle(current.puzzle, clean);
    else if (family) markType(lesson.id, family, clean);
    const attempts = current.attempts.map((a, i) => (i === current.index ? { ...a, result, firstTry: clean, seconds } : a));
    return { ...current, attempts, phase: result };
  };

  const markRight = (current: Run) => {
    const next = record(current, "right");
    setRun(next);
    setReviewIndex(current.index);
    // A set moves on by itself; one type waits, so the walkthrough can be read.
    if (!current.single && !current.puzzle) advanceTimer.current = setTimeout(() => advance(next), RIGHT_PAUSE_MS);
  };

  const reveal = () => {
    if (!run || run.phase !== "answering") return;
    setRun(record(run, "missed"));
    setReviewIndex(run.index);
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
      setReviewIndex(run.index);
    } else {
      setRun({ ...run, wrongTries, lastWrong: input });
      inputRef.current?.select();
    }
  };

  const nextPuzzleLabel = (puzzleId: string) =>
    lesson.puzzles.findIndex((p) => p.id === puzzleId) + 1 < lesson.puzzles.length ? "Next puzzle" : "Done";

  const openWalkthrough = (index: number) => {
    setReviewIndex(index);
    setLeftTab("walkthrough");
    setMobileTab("walkthrough");
  };

  const startDrag = (event: React.PointerEvent) => {
    const box = panes.current?.getBoundingClientRect();
    if (!box) return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    const move = (e: PointerEvent) => setSplit(Math.min(70, Math.max(30, ((e.clientX - box.left) / box.width) * 100)));
    const up = (e: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      try {
        localStorage.setItem("quant-split", String(Math.round(Math.min(70, Math.max(30, ((e.clientX - box.left) / box.width) * 100)))));
      } catch {}
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // The questions you can review: answered ones in this run, or all of the finished one.
  const attempts = run?.attempts ?? finished?.attempts ?? [];
  const reviewable = attempts.map((a, i) => ({ ...a, i })).filter((a) => a.result !== null);
  const reviewing = reviewable.find((a) => a.i === reviewIndex) ?? reviewable.at(-1) ?? null;

  // ── Left pane: lesson / walkthrough ──
  const walkthroughBody = (
    <div className="px-5 py-6 sm:px-6">
      {reviewing ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Question">
            {reviewable.map((a) => (
              <button
                key={a.i}
                type="button"
                onClick={() => setReviewIndex(a.i)}
                aria-pressed={a.i === reviewing.i}
                className={cn(
                  "grid size-9 place-items-center rounded-full text-[14px] font-semibold tabular-nums transition-colors",
                  a.i === reviewing.i ? "bg-foreground text-background" : "bg-control hover:bg-control-hover",
                  a.i !== reviewing.i && (a.result === "right" ? "text-success" : "text-destructive"),
                )}
              >
                {a.i + 1}
              </button>
            ))}
          </div>
          <p className="text-[17px] leading-7">{reviewing.problem.prompt}</p>
          <Walkthrough key={reviewing.problem.key} problem={reviewing.problem} startWithAll={reviewing.result === "missed"} />
        </div>
      ) : (
        <div className="grid place-items-center gap-3 px-4 py-16 text-center">
          <StepIcon name="idea" />
          <p className="text-[17px] font-semibold">Solutions show up here</p>
          <p className="max-w-xs text-[15px] leading-6 text-muted-foreground">
            Answer a practice question, or show its answer, to see it worked out step by step.
          </p>
          {!run && !lessonLocked && (
            <Button variant="secondary" onClick={() => start()} className="mt-2">
              Start practice
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // ── Left pane: the lesson's question types, each practisable on its own ──
  const questionsBody = (
    <div className="space-y-4 px-5 py-6 sm:px-6">
      <div>
        <p className="text-[19px] font-semibold tracking-tight">Question types</p>
        <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
          {lesson.families.length} kinds of question in this lesson. Practise any one on its own, with new numbers every time.
        </p>
      </div>
      <ol className="space-y-1.5">
        {lesson.families.map((family, index) => {
          const mark = typeMarks[family.id];
          const active = run?.single === family.id;
          return (
            <li key={family.id}>
              <button
                type="button"
                onClick={() => {
                  if (lessonLocked) {
                    setMobileTab("practice");
                    return;
                  }
                  start(family.id);
                }}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                  active ? "bg-secondary" : index % 2 === 0 ? "bg-secondary/60 hover:bg-control-hover" : "hover:bg-control-hover",
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
                  {lessonLocked ? <Lock aria-label="Pro" className="h-3.5 w-3.5" /> : active ? "Practising" : "Practise"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {lesson.puzzles.length > 0 && (
        <div className="space-y-3 pt-4">
          <div>
            <p className="text-[19px] font-semibold tracking-tight">Puzzles</p>
            <p className="mt-1 text-[15px] leading-6 text-muted-foreground">Classic one-off questions this lesson&apos;s method solves.</p>
          </div>
          <ol className="space-y-1.5">
            {lesson.puzzles.map((puzzle, index) => {
              const mark = puzzleMarks[puzzle.id];
              const active = run?.puzzle === puzzle.id;
              return (
                <li key={puzzle.id}>
                  <button
                    type="button"
                    onClick={() => (lessonLocked ? setMobileTab("practice") : startPuzzle(puzzle.id))}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                      active ? "bg-secondary" : index % 2 === 0 ? "bg-secondary/60 hover:bg-control-hover" : "hover:bg-control-hover",
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

  // ── Right pane: practice ──
  const saved = lessons?.progress[lesson.id];
  const problem = run ? run.problems[run.index] : null;
  // Only a scored set guides its first questions; one type or a puzzle shows steps on request.
  const guided = run ? !run.single && !run.puzzle && run.index < QUANT_GUIDED : false;
  const seconds = run && run.phase === "answering" ? Math.max(0, Math.floor((now - questionStart) / 1000)) : null;

  const practiceBody = lessonLocked ? (
    <div className="grid place-items-center gap-3 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-control">
        <Lock aria-hidden="true" className="h-5 w-5" />
      </span>
      <p className="text-[19px] font-semibold tracking-tight">Practice is part of Pro</p>
      <p className="max-w-sm text-[15px] leading-6 text-muted-foreground">
        The lesson and its worked example are open to everyone. Pro opens practice for all {QUANT_LESSONS.length} lessons.
      </p>
      <Link
        href={getUpgradeUrl({ feature: "quant", source: "quant_lesson" })}
        onClick={() => captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, { feature: "quant", surface: "quant_practice", action: "open_pricing", lesson_id: lesson.id })}
        className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-2")}
      >
        <Lock aria-hidden="true" className="h-4 w-4" />
        Unlock with Pro
      </Link>
    </div>
  ) : finished ? (
    <div className="space-y-6 px-5 py-6 sm:px-6">
      <div className="text-center">
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
      <ol className="space-y-1.5">
        {finished.attempts.map((a, i) => (
          <li key={a.problem.key}>
            <button type="button" onClick={() => openWalkthrough(i)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-control-hover">
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", a.result === "right" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                {a.result === "right" ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> : <X aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px]">{a.problem.prompt}</span>
              <span className="shrink-0 text-[13px] text-muted-foreground">Solution</span>
            </button>
          </li>
        ))}
      </ol>
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
          <Link href={getUpgradeUrl({ feature: "quant", source: "quant_results" })} className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}>
            <Lock aria-hidden="true" className="h-4 w-4" />
            Unlock the next lessons with Pro
          </Link>
        )}
        {!signedIn && (
          <p className="pt-1 text-center text-[15px] text-muted-foreground">
            <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/quant/${lesson.id}`)}`} className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </Link>{" "}
            to save your progress.
          </p>
        )}
      </div>
    </div>
  ) : run && problem ? (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 space-y-5 px-5 py-6 sm:px-6">
        {/* Question navigator: done ones in their result colour, the current one in ink. */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5" aria-label={run.single ? `Question ${run.index + 1}` : `Question ${run.index + 1} of ${run.problems.length}`}>
            {run.attempts.map((a, i) => (run.single && i < run.attempts.length - 8 ? null : (
              <span
                key={a.problem.key}
                className={cn(
                  "grid size-8 place-items-center rounded-full text-[13px] font-semibold tabular-nums",
                  i === run.index ? "bg-foreground text-background" : a.result === "right" ? "bg-success/15 text-success" : a.result === "missed" ? "bg-destructive/15 text-destructive" : "bg-control text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
            )))}
          </div>
          {seconds !== null && (
            <span className="flex shrink-0 items-center gap-1 text-[14px] tabular-nums text-muted-foreground">
              <Clock aria-hidden="true" className="h-3.5 w-3.5" />
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={problem.key} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={runEnter} className="space-y-5">
            {run.single || run.puzzle ? (
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-[13px] font-medium text-muted-foreground">
                  {run.puzzle
                    ? `Puzzle · ${lesson.puzzles.find((p) => p.id === run.puzzle)?.title}`
                    : `Practising · ${lesson.families.find((f) => f.id === run.single)?.title}`}
                </p>
                {!run.hinted && run.phase === "answering" && (
                  <Button variant="ghost" size="sm" onClick={() => setRun({ ...run, hinted: true })} className="shrink-0 text-muted-foreground">
                    <Lightbulb aria-hidden="true" />
                    Show the steps
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-[13px] font-medium text-muted-foreground">{guided ? "Guided · the steps are shown" : "On your own"}</p>
            )}
            <p data-problem className="text-[19px] leading-8">
              {problem.prompt}
            </p>
            {problem.visual && (
              <div className="rounded-[18px] bg-secondary px-3 py-4">
                <QuantFigure visual={problem.visual} />
              </div>
            )}
            {(guided || run.hinted) && (
              <ol aria-label="Steps" className="space-y-3 rounded-[18px] border border-border px-4 py-4">
                {problem.steps.map((step, i) => (
                  <HintStep key={i} step={step} hideResult={i === problem.steps.length - 1 && run.phase === "answering"} />
                ))}
              </ol>
            )}
          </motion.div>
        </AnimatePresence>

        <AnswerBox kind={problem.kind} value={input} onChange={changeInput} onSubmit={submit} disabled={run.phase !== "answering"} inputRef={inputRef} />
      </div>

      {/* The result console, as on a coding judge. */}
      <div className="sticky bottom-0 border-t border-border bg-background px-5 py-4 sm:px-6" role="status">
        {run.phase === "right" ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[17px] font-semibold text-success">Accepted</p>
              <p className="text-[14px] tabular-nums text-muted-foreground">
                {formatAnswer(problem.answer, problem.kind)} · {run.attempts[run.index].seconds?.toFixed(1)}s
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => openWalkthrough(run.index)}>
                Solution
              </Button>
              {(run.single || run.puzzle) && (
                <Button size="sm" onClick={() => advance(run)} autoFocus>
                  {run.puzzle ? nextPuzzleLabel(run.puzzle) : "Another one"}
                  <ChevronRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        ) : run.phase === "missed" ? (
          <div className="space-y-3">
            <div>
              <p className="text-[17px] font-semibold text-destructive">{run.lastWrong ? "Wrong answer" : "Answer shown"}</p>
              <p className="text-[14px] tabular-nums text-muted-foreground">
                {run.lastWrong && <>You entered {run.lastWrong}. </>}Expected {formatAnswer(problem.answer, problem.kind)}.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => openWalkthrough(run.index)} className="flex-1">
                See the solution
              </Button>
              <Button onClick={() => advance(run)} autoFocus className="flex-1">
                {run.puzzle ? nextPuzzleLabel(run.puzzle) : run.single ? "Another one" : run.index + 1 >= run.problems.length ? "Finish" : "Next question"}
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className={cn("text-[14px] leading-5", run.wrongTries > 0 ? "font-medium text-destructive" : "text-muted-foreground")}>
              {run.wrongTries > 0 ? `${run.lastWrong} isn't right. One more try.` : `Answer as ${ANSWER_HINTS[problem.kind]}. Right answers go through as you type.`}
            </p>
            <Button variant="ghost" size="sm" onClick={reveal} className="shrink-0 text-muted-foreground">
              Show answer
            </Button>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="space-y-6 px-5 py-6 sm:px-6">
      <div>
        <p className="text-[19px] font-semibold tracking-tight">Practice</p>
        <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
          {QUANT_GUIDED + QUANT_SOLO} questions. The first {QUANT_GUIDED} show the steps, then {QUANT_SOLO} on your own. Get {QUANT_MASTERY_FIRST_TRY} of
          those right first time, in under {lesson.targetSeconds}s each, to master it.
        </p>
      </div>
      {saved && (
        <p className={cn("text-[15px] font-medium", saved.mastered ? "text-success" : "text-muted-foreground")}>
          {saved.mastered ? "Mastered" : `Best so far: ${saved.bestFirstTry} of ${QUANT_SOLO}`}
        </p>
      )}
      <Button variant="brand" size="lg" onClick={() => start()} className="w-full">
        <Play aria-hidden="true" className="h-4 w-4 fill-current" />
        Start practice
      </Button>
    </div>
  );

  const leftTabs = [
    { id: "lesson" as const, label: "Lesson", icon: <BookOpen aria-hidden="true" className="h-4 w-4" /> },
    { id: "questions" as const, label: "Questions", icon: <ListChecks aria-hidden="true" className="h-4 w-4" /> },
    { id: "walkthrough" as const, label: "Solution", icon: <Lightbulb aria-hidden="true" className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col px-3 pb-3 md:h-[calc(100dvh-4rem)] md:px-4">
      {/* Top bar: back to the list, previous and next lessons, and where you are. */}
      <div className="flex h-14 shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <Link href="/quant" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2.5")}>
            <List aria-hidden="true" />
            <span className="hidden sm:inline">Lessons</span>
          </Link>
          <Link href={previous ? `/quant/${previous.id}` : "#"} aria-disabled={!previous} aria-label="Previous lesson" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2", !previous && "pointer-events-none opacity-40")}>
            <ChevronLeft aria-hidden="true" />
          </Link>
          <Link href={next ? `/quant/${next.id}` : "#"} aria-disabled={!next} aria-label="Next lesson" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2", !next && "pointer-events-none opacity-40")}>
            <ChevronRight aria-hidden="true" />
          </Link>
          <span className="ml-1 truncate text-[15px] font-medium">
            <span className="tabular-nums text-muted-foreground">{position + 1}.</span> {lesson.title}
          </span>
        </div>
        {run && (
          <Button variant="secondary" size="sm" onClick={() => setRun(null)} className="shrink-0">
            <span aria-hidden="true" className="size-2.5 rounded-[2px] bg-current" />
            Stop
          </Button>
        )}
      </div>

      {/* Phones: one pane at a time, picked by these tabs. */}
      <div className="sticky top-14 z-10 -mx-3 mb-3 border-b border-border bg-background/95 px-3 py-2 backdrop-blur md:hidden">
        <Tabs
          id="mobile"
          value={mobileTab}
          onChange={(tab) => {
            setMobileTab(tab);
            if (tab !== "practice") setLeftTab(tab);
          }}
          tabs={[leftTabs[0], leftTabs[1], { id: "practice" as const, label: "Practice", icon: <Play aria-hidden="true" className="h-4 w-4" /> }, leftTabs[2]]}
        />
      </div>

      {/* Desktop: lesson and practice side by side, with a draggable divider. */}
      <div ref={panes} className="min-h-0 flex-1 md:flex">
        <Pane
          style={{ "--split": `${split}%` } as CSSProperties}
          className={cn("min-w-0 shrink-0 md:w-[var(--split)]", mobileTab === "practice" && "max-md:hidden")}
          header={<Tabs id="left" value={leftTab} onChange={setLeftTab} tabs={leftTabs} />}>
          {leftTab === "lesson" ? <LessonReader lesson={lesson} onPractice={() => (run || lessonLocked ? setMobileTab("practice") : start())} /> : leftTab === "questions" ? questionsBody : walkthroughBody}
        </Pane>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panes"
          onPointerDown={startDrag}
          className="group hidden w-3 shrink-0 cursor-col-resize items-center justify-center md:flex"
        >
          <span className="h-10 w-1 rounded-full bg-border transition-colors group-hover:bg-muted-foreground" />
        </div>
        <Pane
          className={cn("min-w-0 flex-1", mobileTab !== "practice" && "max-md:hidden")}
          header={
            <span className="flex items-center gap-1.5 px-3 text-[14px] font-medium">
              <Play aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              Practice
            </span>
          }
        >
          {practiceBody}
        </Pane>
      </div>
    </div>
  );
}
