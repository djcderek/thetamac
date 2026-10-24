"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Clock, EyeOff, Flag, ListChecks, Lock, Play, RotateCcw, Target, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter, settleSpring } from "@/lib/motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { QUANT_TOPICS, getQuantLesson } from "@/lib/quant/lessons";
import { formatAnswer, isRightAnswer } from "@/lib/quant/rational";
import {
  MOCK_BLUEPRINT,
  MOCK_MINUTES,
  MOCK_POINTS,
  MOCK_QUESTIONS,
  MOCK_TOTAL,
  buildMock,
  mockRating,
  scoreMock,
  type MockQuestion,
} from "@/lib/quant/mock";
import { DifficultyLabel } from "@/components/quant/difficulty";
import { AnswerBox } from "@/components/quant/answer-box";
import { QuantFigure } from "@/components/quant/visuals";
import { Walkthrough } from "@/components/quant/walkthrough";
import { MathText } from "@/components/quant/math";
import { MockProgress } from "@/components/quant/mock-progress";
import { MockPlanCard } from "@/components/quant/mock-plan";
import { buildMockPlan, type MockPlan } from "@/lib/quant/plan";
import type { MockTopics } from "@/lib/quant/mock-progress";
import { trackQuantUpgradeClick, useQuantGateViewed } from "@/components/quant/quant-analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";

type Summary = {
  locked: boolean;
  pro: boolean;
  freeLeft: number | null;
  history: { id: string; score: number; correct: number; total: number; seconds: number; createdAt: string; topics: MockTopics }[];
  /** The plan from the latest mock. */
  plan: MockPlan | null;
  /** Lessons read, for a new mock's plan. */
  read: string[];
};

type Test = {
  questions: MockQuestion[];
  /** What's typed for each question; empty means not answered. */
  answers: string[];
  /** Seconds spent on each question so far. */
  spent: number[];
  flagged: boolean[];
  current: number;
  startedAt: number;
};

type Finished = { questions: MockQuestion[]; answers: string[]; spent: number[]; correct: boolean[]; seconds: number };

const LIMIT_SECONDS = MOCK_MINUTES * 60;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const RATING_TONE: Record<string, string> = {
  "Strong pass": "text-success",
  Pass: "text-success",
  Borderline: "text-warning",
  "Not yet": "text-destructive",
};

function Shell({ children, back = true }: { children: ReactNode; back?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 md:px-6 md:pt-10">
      {back && (
        <Link href="/quant" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 mb-4 px-2.5")}>
          <ChevronLeft aria-hidden="true" />
          Lessons
        </Link>
      )}
      {children}
    </div>
  );
}

function Rule({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-3 py-3 text-[15px] leading-6">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

/**
 * A timed mock test, like a first-round quant screen: questions from across the course, no
 * marking until the end, skip and come back at will. Scored out of 100 by difficulty, with a
 * rating, a breakdown by unit and every solution. Pro; a free account gets one to try.
 */
export function QuantMock() {
  const reduceMotion = useReducedMotion();
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);
  const [test, setTest] = useState<Test | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [save, setSave] = useState<"saving" | "saved" | "failed" | "locked" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState(0);
  const [openResult, setOpenResult] = useState<number | null>(null);
  const openedAt = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = () =>
    fetch("/api/quant/mocks", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: Summary) => setSummary(data))
      .catch(() => setFailed(true));

  useEffect(() => {
    if (signedIn) load();
  }, [signedIn]);

  // The clock, and a warning before leaving mid-test.
  useEffect(() => {
    if (!test) return;
    const tick = setInterval(() => setNow(performance.now()), 250);
    const leave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", leave);
    return () => {
      clearInterval(tick);
      window.removeEventListener("beforeunload", leave);
    };
  }, [test]);

  const elapsed = test ? Math.max(0, (now - test.startedAt) / 1000) : 0;
  const remaining = Math.max(0, LIMIT_SECONDS - elapsed);

  const start = () => {
    const questions = buildMock();
    const at = performance.now();
    openedAt.current = at;
    setNow(at);
    setTest({ questions, answers: questions.map(() => ""), spent: questions.map(() => 0), flagged: questions.map(() => false), current: 0, startedAt: at });
    setFinished(null);
    setSave(null);
    setConfirming(false);
    setOpenResult(null);
    window.scrollTo({ top: 0, behavior: "instant" });
    captureAnalyticsEvent(ANALYTICS_EVENTS.quantMockStarted, {
      plan: summary?.pro ? "premium" : "free",
      mock_number: (summary?.history.length ?? 0) + 1,
    });
  };

  /** The test with the time on the open question counted. */
  const banked = (t: Test): Test => {
    const at = performance.now();
    const spent = t.spent.map((s, i) => (i === t.current ? s + (at - openedAt.current) / 1000 : s));
    openedAt.current = at;
    return { ...t, spent };
  };

  const go = (index: number) => {
    if (!test) return;
    setConfirming(false);
    setTest({ ...banked(test), current: index });
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const finish = (t: Test, timedOut = false) => {
    const done = banked(t);
    const correct = done.questions.map((q, i) => done.answers[i].trim() !== "" && isRightAnswer(done.answers[i], q.problem.answer, q.problem.kind));
    const seconds = Math.min(LIMIT_SECONDS, (performance.now() - done.startedAt) / 1000);
    setFinished({ questions: done.questions, answers: done.answers, spent: done.spent, correct, seconds });
    const result = scoreMock(done.questions.map((q, i) => ({ lessonId: q.lessonId, family: q.family, correct: correct[i], seconds: done.spent[i] })));
    captureAnalyticsEvent(ANALYTICS_EVENTS.quantMockCompleted, {
      plan: summary?.pro ? "premium" : "free",
      mock_number: (summary?.history.length ?? 0) + 1,
      score: result?.score,
      rating: result ? mockRating(result.score).label : undefined,
      correct: result?.correct,
      answered: done.answers.filter((a) => a.trim()).length,
      flagged: done.flagged.filter(Boolean).length,
      seconds_used: Math.round(seconds),
      timed_out: timedOut,
    });
    setTest(null);
    setConfirming(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    setSave("saving");
    fetch("/api/quant/mocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seconds,
        questions: done.questions.map((q, i) => ({ lessonId: q.lessonId, family: q.family, correct: correct[i], seconds: Math.min(LIMIT_SECONDS, done.spent[i]) })),
      }),
    })
      .then((response) => {
        setSave(response.ok ? "saved" : response.status === 402 ? "locked" : "failed");
        return load();
      })
      .catch(() => setSave("failed"));
  };

  // Time's up: the test ends with what's been answered.
  const timeUp = !!test && remaining <= 0;
  useEffect(() => {
    if (timeUp && test) finish(test, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  useQuantGateViewed("quant_mock", !test && !finished && !!summary?.locked, signedIn, { mocks_taken: summary?.history.length ?? 0 });
  useQuantGateViewed("quant_mock_results", !!finished && !!summary && !summary.pro, signedIn);

  // ── Signed out, loading, locked ──
  if (status === "loading" || (signedIn && !summary && !failed)) return <Shell>{null}</Shell>;
  const intro = (
    <>
      <header className="px-1">
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em]">Mock test</h1>
        <p className="mt-2 text-[17px] leading-7 text-muted-foreground">
          A timed set from across the course, run like a first-round quant screen. You find out how you did at the end.
        </p>
      </header>
      <ul className="mt-6 divide-y divide-border rounded-[22px] bg-secondary px-5">
        <Rule icon={<ListChecks aria-hidden="true" className="size-[18px]" />}>
          {MOCK_QUESTIONS} questions from across the course: {MOCK_BLUEPRINT.Easy} easy, {MOCK_BLUEPRINT.Medium} medium and {MOCK_BLUEPRINT.Hard} hard. They’re
          written for the mock, so you won’t have seen them in practice.
        </Rule>
        <Rule icon={<Clock aria-hidden="true" className="size-[18px]" />}>{MOCK_MINUTES} minutes. The test ends when the time runs out.</Rule>
        <Rule icon={<EyeOff aria-hidden="true" className="size-[18px]" />}>No hints, and no marking until the end. Skip a question and come back to it whenever you like.</Rule>
        <Rule icon={<Target aria-hidden="true" className="size-[18px]" />}>
          Scored out of {MOCK_TOTAL}: easy questions are worth {MOCK_POINTS.Easy} points, medium {MOCK_POINTS.Medium} and hard {MOCK_POINTS.Hard}.
          Every miss goes into your review.
        </Rule>
      </ul>
    </>
  );

  if (!signedIn) {
    return (
      <Shell>
        {intro}
        <div className="mt-6 px-1">
          <Link href={`/auth/signin?callbackUrl=${encodeURIComponent("/quant/mock")}`} className={buttonVariants({ variant: "brand", size: "lg" })}>
            Sign in to take a mock
          </Link>
          <p className="mt-3 text-[15px] text-muted-foreground">Your first mock is free.</p>
        </div>
      </Shell>
    );
  }
  if (failed) {
    return (
      <Shell>
        <p className="rounded-[22px] bg-secondary px-5 py-6 text-[15px] text-muted-foreground">Mock tests didn’t load. Try again in a moment.</p>
      </Shell>
    );
  }

  // ── The test ──
  if (test) {
    const q = test.questions[test.current];
    const answered = test.answers.filter((a) => a.trim()).length;
    const unanswered = MOCK_QUESTIONS - answered;
    const last = test.current === MOCK_QUESTIONS - 1;
    const setAnswer = (value: string) => setTest({ ...test, answers: test.answers.map((a, i) => (i === test.current ? value : a)) });
    // Next: the following question, or the review prompt after the last.
    const submit = (event: FormEvent) => {
      event.preventDefault();
      if (last) setConfirming(true);
      else go(test.current + 1);
    };
    const low = remaining <= 120;

    return (
      <Shell back={false}>
        {/* The clock and the questions stay in view. */}
        <div className="sticky top-14 z-10 -mx-4 bg-background px-4 pb-3 pt-2 md:top-16 md:mx-0 md:px-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px] font-medium tabular-nums">
              Question {test.current + 1} <span className="text-muted-foreground">of {MOCK_QUESTIONS}</span>
            </p>
            <div className="flex items-center gap-2">
              <span
                role="timer"
                aria-label={`${clock(remaining)} left`}
                className={cn("flex h-9 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold tabular-nums transition-colors", low ? "bg-destructive/10 text-destructive" : "bg-control")}
              >
                <Clock aria-hidden="true" className="size-4" />
                {clock(remaining)}
              </span>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
                Finish
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Questions">
            {test.questions.map((question, i) => (
              <button
                key={question.problem.key}
                type="button"
                onClick={() => go(i)}
                aria-current={i === test.current ? "step" : undefined}
                aria-label={`Question ${i + 1}${test.answers[i].trim() ? ", answered" : ""}${test.flagged[i] ? ", flagged" : ""}`}
                className={cn(
                  "relative grid size-8 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors",
                  i === test.current ? "bg-foreground text-background" : test.answers[i].trim() ? "bg-control-hover text-foreground" : "border border-border text-muted-foreground hover:bg-secondary",
                )}
              >
                {i + 1}
                {test.flagged[i] && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-background bg-warning" />}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {confirming && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={settleSpring}
              className="overflow-hidden"
            >
              <div className="mb-4 mt-2 rounded-[20px] bg-secondary p-5" role="alertdialog" aria-label="Finish the test">
                <p className="text-[17px] font-semibold">{unanswered ? `${unanswered} ${unanswered === 1 ? "question" : "questions"} still blank` : "Hand it in?"}</p>
                <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
                  {unanswered ? "Blank questions score nothing. " : ""}You have {clock(remaining)} left. Once you finish, the answers are marked and can’t be changed.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="brand" onClick={() => finish(test)}>
                    Finish and see my score
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    Keep going
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="mt-2 rounded-[20px] border border-border bg-background px-5 py-6 sm:px-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={q.problem.key}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={runEnter}
              className="space-y-5"
            >
              <div className="flex items-center justify-between gap-3 text-[13px]">
                <p className="font-medium text-muted-foreground">
                  <DifficultyLabel difficulty={q.difficulty} /> · {q.points} points
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={test.flagged[test.current]}
                  onClick={() => setTest({ ...test, flagged: test.flagged.map((f, i) => (i === test.current ? !f : f)) })}
                  className={cn("-mr-2", test.flagged[test.current] ? "text-warning" : "text-muted-foreground")}
                >
                  <Flag aria-hidden="true" className={cn(test.flagged[test.current] && "fill-current")} />
                  {test.flagged[test.current] ? "Flagged" : "Flag for later"}
                </Button>
              </div>
              <p className="text-[19px] leading-8">
                <MathText text={q.problem.prompt} />
              </p>
              {q.problem.visual && (
                <div className="rounded-[18px] bg-secondary px-3 py-4">
                  <QuantFigure visual={q.problem.visual} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-5">
            <AnswerBox kind={q.problem.kind} value={test.answers[test.current]} onChange={setAnswer} onSubmit={submit} disabled={false} inputRef={inputRef} submitLabel={last ? "Review and finish" : "Next"} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={() => go(test.current - 1)} disabled={test.current === 0} className="text-muted-foreground">
              <ChevronLeft aria-hidden="true" />
              Previous
            </Button>
            <p className="text-[13px] tabular-nums text-muted-foreground">{answered} answered</p>
            <Button variant="ghost" size="sm" onClick={() => (last ? setConfirming(true) : go(test.current + 1))} className="text-muted-foreground">
              {last ? "Finish" : "Skip"}
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </section>
      </Shell>
    );
  }

  // ── How it went ──
  if (finished && summary) {
    const result = scoreMock(finished.questions.map((q, i) => ({ lessonId: q.lessonId, family: q.family, correct: finished.correct[i], seconds: finished.spent[i] })))!;
    const rating = mockRating(result.score);
    // The plan from this mock; nothing is right since yet, so it starts at the first lesson.
    const plan = buildMockPlan(
      { id: "latest", score: result.score, questions: finished.questions.map((q, i) => ({ lessonId: q.lessonId, correct: finished.correct[i] })) },
      new Map(),
      new Set(summary.read),
    );
    // On the free plan the plan's own button opens Pro when it has Pro lessons in it.
    const planUpgrade = !summary.pro && !!plan?.steps.some((step) => !step.free);

    return (
      <Shell>
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={runEnter} className="space-y-6">
          <div className="px-1 text-center">
            <p className="text-[15px] font-medium text-muted-foreground">Mock test</p>
            <p className="mt-1 text-[72px] font-semibold leading-none tracking-[-0.05em] tabular-nums">
              {result.score}
              <span className="text-[28px] text-muted-foreground">/{MOCK_TOTAL}</span>
            </p>
            <p className={cn("mt-3 text-[20px] font-semibold tracking-[-0.015em]", RATING_TONE[rating.label])}>{rating.label}</p>
            <p className="mx-auto mt-1 max-w-md text-[15px] leading-6 text-muted-foreground">{rating.note}</p>
          </div>

          <dl className="grid grid-cols-3 divide-x divide-border rounded-[18px] bg-secondary py-4 text-center">
            <div>
              <dt className="text-[13px] text-muted-foreground">Right</dt>
              <dd className="mt-0.5 text-[19px] font-semibold tabular-nums">
                {result.correct}/{result.total}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted-foreground">Time</dt>
              <dd className="mt-0.5 text-[19px] font-semibold tabular-nums">{clock(finished.seconds)}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted-foreground">Per question</dt>
              <dd className="mt-0.5 text-[19px] font-semibold tabular-nums">{clock(finished.seconds / MOCK_QUESTIONS)}</dd>
            </div>
          </dl>

          {/* By unit, so the weak topics are plain. */}
          <div className="space-y-3">
            <p className="px-1 text-[15px] font-semibold">By topic</p>
            <ul className="space-y-3 px-1">
              {result.byTopic.map((topic) => (
                <li key={topic.topic} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
                  <span className="truncate text-[15px]">
                    <span className="tabular-nums text-muted-foreground">{QUANT_TOPICS.find((t) => t.id === topic.topic)!.number}</span> {topic.title}
                  </span>
                  <span className="text-[14px] font-medium tabular-nums text-muted-foreground">
                    {topic.right} of {topic.total}
                  </span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-control">
                    <motion.span
                      className={cn("block h-full rounded-full", topic.right === topic.total ? "bg-success" : topic.right === 0 ? "bg-destructive" : "bg-warning")}
                      initial={reduceMotion ? false : { width: 0 }}
                      animate={{ width: `${(topic.right / topic.total) * 100}%` }}
                      transition={{ ...settleSpring, delay: 0.15 }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {plan && <MockPlanCard plan={plan} pro={summary.pro} upgrade={planUpgrade} />}

          <div className="space-y-2">
            {summary.pro ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="brand" size="lg" onClick={start}>
                  <RotateCcw aria-hidden="true" />
                  Take another mock
                </Button>
                {plan && (
                  <Link href="/quant/review" className={buttonVariants({ variant: "secondary", size: "lg" })}>
                    Review the misses
                  </Link>
                )}
              </div>
            ) : planUpgrade ? null : (
              <div className="rounded-[22px] bg-secondary p-5">
                <p className="text-[17px] font-semibold">Keep testing with Pro</p>
                <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
                  That was your free mock. Pro has unlimited mocks with fresh questions every time, and brings every miss back in review until it sticks.
                </p>
                <Link
                  href={getUpgradeUrl({ feature: "quant", source: "quant_mock_results", next: "/quant/mock" })}
                  onClick={() => trackQuantUpgradeClick("quant_mock_results", { score: result.score })}
                  className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-4")}
                >
                  <Lock aria-hidden="true" className="size-4" />
                  Unlock with Pro
                </Link>
              </div>
            )}
            <p className="px-1 text-[13px] text-muted-foreground" role="status">
              {save === "saving" ? "Saving…" : save === "saved" ? "Saved to your history." : save === "locked" ? "Not saved: mock tests are part of Pro." : save === "failed" ? "This mock couldn’t be saved." : ""}
            </p>
          </div>

          <div className="space-y-2">
            <p className="px-1 text-[15px] font-semibold">Your answers</p>
            <ol className="divide-y divide-border border-y border-border">
              {finished.questions.map((q, i) => {
                const right = finished.correct[i];
                const typed = finished.answers[i].trim();
                const open = openResult === i;
                return (
                  <li key={q.problem.key}>
                    <button type="button" onClick={() => setOpenResult(open ? null : i)} aria-expanded={open} className="flex w-full items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-secondary">
                      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", right ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive")}>
                        {right ? <Check aria-hidden="true" className="size-4" strokeWidth={2.5} /> : <X aria-hidden="true" className="size-4" strokeWidth={2.5} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{q.problem.prompt}</span>
                        <span className="block text-[13px] tabular-nums text-muted-foreground">
                          <DifficultyLabel difficulty={q.difficulty} /> · {right ? `+${q.points}` : "0"} · {typed ? `You: ${typed}` : "Blank"}
                          {!right && <> · Answer: {formatAnswer(q.problem.answer, q.problem.kind)}</>} · {clock(finished.spent[i])}
                        </span>
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
                          <div className="space-y-4 px-2 pb-6 pt-1">
                            <p className="text-[17px] leading-7">
                              <MathText text={q.problem.prompt} />
                            </p>
                            <Walkthrough problem={q.problem} startWithAll />
                            <Link href={`/quant/${q.lessonId}`} className="inline-block text-[14px] font-medium underline-offset-4 hover:underline">
                              From {getQuantLesson(q.lessonId)!.title}
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ol>
          </div>
        </motion.div>
      </Shell>
    );
  }

  // ── Before the test ──
  const s = summary!;
  const best = s.history.length ? Math.max(...s.history.map((h) => h.score)) : null;
  return (
    <Shell>
      {intro}
      <div className="mt-6 px-1">
        {s.locked ? (
          <>
            <Link
              href={getUpgradeUrl({ feature: "quant", source: "quant_mock", next: "/quant/mock" })}
              onClick={() => trackQuantUpgradeClick("quant_mock", { mocks_taken: s.history.length })}
              className={buttonVariants({ variant: "brand", size: "lg" })}
            >
              <Lock aria-hidden="true" className="size-4" />
              Unlock mock tests
            </Link>
            <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
              You’ve taken your free mock. Pro has unlimited mocks, with new questions every time{s.plan?.steps.some((step) => !step.free) ? ", and opens every lesson in your plan" : ""}.
            </p>
          </>
        ) : (
          <>
            <Button variant="brand" size="lg" onClick={start}>
              <Play aria-hidden="true" className="size-4 fill-current" />
              Start the {MOCK_MINUTES}-minute mock
            </Button>
            {!s.pro && <p className="mt-3 text-[15px] text-muted-foreground">Your first mock is free. Pro has unlimited mocks.</p>}
          </>
        )}
      </div>

      {s.plan && <MockPlanCard plan={s.plan} pro={s.pro} className="mt-10" />}

      <MockProgress history={s.history} />

      {s.history.length > 0 && (
        <div className="mt-10 space-y-2">
          <div className="flex items-baseline justify-between px-1">
            <p className="text-[15px] font-semibold">Your mocks</p>
            {best !== null && s.history.length < 2 && <p className="text-[14px] tabular-nums text-muted-foreground">Best {best}</p>}
          </div>
          <ol className="divide-y divide-border border-y border-border">
            {s.history.slice(0, 10).map((mock) => {
              const rating = mockRating(mock.score);
              return (
                <li key={mock.id} className="flex items-center justify-between gap-3 px-2 py-3 text-[15px]">
                  <span className="text-muted-foreground">{dateLabel(mock.createdAt)}</span>
                  <span className="flex items-center gap-4 tabular-nums">
                    <span className="text-muted-foreground">
                      {mock.correct}/{mock.total} · {clock(mock.seconds)}
                    </span>
                    <span className={cn("w-24 text-right font-medium", RATING_TONE[rating.label])}>{rating.label}</span>
                    <span className="w-8 text-right font-semibold">{mock.score}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Shell>
  );
}
