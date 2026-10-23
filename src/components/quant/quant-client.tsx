"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { settleSpring } from "@/lib/motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import {
  QUANT_GUIDED,
  QUANT_LESSONS,
  QUANT_SOLO,
  createQuantLessonProblems,
  getQuantLesson,
  isFreeQuantLesson,
  isQuantLessonMastered,
  type QuantLesson,
  type QuantLessonId,
  type QuantProblem,
} from "@/lib/quant/lessons";
import { isRightAnswer } from "@/lib/quant/rational";
import type { LessonsSummary } from "@/components/training/training-types";
import { QuantLessonDetail, QuantLessonList } from "@/components/quant/quant-picker";
import { QuantRun, type QuantPhase } from "@/components/quant/quant-run";
import { QuantResult, type QuantOutcome } from "@/components/quant/quant-result";

/** How long a right answer stays on screen (with its exact form) before the next problem. */
const RIGHT_PAUSE_MS = 700;
/** Wrong submits before the answer is shown. */
const WRONG_TRIES = 2;

type Run = {
  lesson: QuantLesson;
  problems: QuantProblem[];
  index: number;
  phase: QuantPhase;
  wrongTries: number;
  feedbackKey: number;
  soloFirstTry: number;
  soloTimes: number[];
  misses: QuantProblem[];
};

export function QuantClient() {
  const { data: authSession, status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  // The open lesson lives in the URL (?lesson=), so links, reloads and the back button all work.
  const openLesson = getQuantLesson(searchParams.get("lesson") ?? "") ?? null;
  const [lessons, setLessons] = useState<LessonsSummary | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [outcome, setOutcome] = useState<QuantOutcome | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // The list comes back scrolled where it was left (by our arrow or the browser's back); other screens open at the top.
  const listScroll = useRef(0);
  const showingList = useRef(false);
  const pushedDetail = useRef(false);
  const shownAtRef = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signedIn = authStatus === "authenticated";
  // Pro lessons are open to Pro accounts (the session's plan until progress arrives).
  const locked = lessons ? lessons.locked : !authSession?.user?.isPremium;
  const isLocked = (id: QuantLessonId) => locked && !isFreeQuantLesson(id);

  const loadProgress = useCallback(() => {
    fetch("/api/lessons/progress", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: LessonsSummary | null) => data && setLessons(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (signedIn) loadProgress();
  }, [signedIn, loadProgress]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  useEffect(() => {
    showingList.current = !run && !outcome && !openLesson;
  });

  const select = (id: QuantLessonId) => {
    listScroll.current = window.scrollY;
    pushedDetail.current = true;
    window.history.pushState(null, "", `/quant?lesson=${id}`);
  };

  const showList = () => {
    // Undo our own push so the back button doesn't return to the lesson; a deep link just swaps the URL.
    if (pushedDetail.current) {
      pushedDetail.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", "/quant");
    }
  };

  const start = (target: QuantLesson) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (target.id !== openLesson?.id) window.history.replaceState(null, "", `/quant?lesson=${target.id}`);
    setOutcome(null);
    setInput("");
    setRun({
      lesson: target,
      problems: createQuantLessonProblems(target),
      index: 0,
      phase: "answering",
      wrongTries: 0,
      feedbackKey: 0,
      soloFirstTry: 0,
      soloTimes: [],
      misses: [],
    });
    shownAtRef.current = performance.now();
    captureAnalyticsEvent(ANALYTICS_EVENTS.quantLessonStarted, { lesson_id: target.id, topic: target.topic, signed_in: signedIn });
  };

  const finish = useCallback(
    (done: Run) => {
      const soloAverageSeconds = done.soloTimes.length
        ? done.soloTimes.reduce((sum, t) => sum + t, 0) / done.soloTimes.length
        : null;
      const result = { soloCount: QUANT_SOLO, soloFirstTry: done.soloFirstTry, soloAverageSeconds };
      const mastered = isQuantLessonMastered(done.lesson, result);
      const wasMastered = !!lessons?.progress[done.lesson.id]?.mastered;
      const nextLesson = QUANT_LESSONS[QUANT_LESSONS.indexOf(done.lesson) + 1] ?? null;
      setOutcome({
        lessonId: done.lesson.id,
        title: done.lesson.title,
        soloFirstTry: done.soloFirstTry,
        soloAverageSeconds,
        targetSeconds: done.lesson.targetSeconds,
        mastered: mastered || wasMastered,
        newlyMastered: mastered && !wasMastered,
        next: nextLesson
          ? { id: nextLesson.id, title: nextLesson.title, locked: locked && !isFreeQuantLesson(nextLesson.id) }
          : null,
        misses: done.misses,
        guest: !signedIn,
      });
      setRun(null);
      captureAnalyticsEvent(ANALYTICS_EVENTS.quantLessonCompleted, {
        lesson_id: done.lesson.id,
        topic: done.lesson.topic,
        solo_first_try: done.soloFirstTry,
        mastered,
        signed_in: signedIn,
      });
      if (signedIn) {
        fetch("/api/lessons/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: done.lesson.id, ...result }),
        })
          .then(() => loadProgress())
          .catch(() => {});
      }
    },
    [lessons, locked, signedIn, loadProgress],
  );

  const advance = useCallback(
    (current: Run) => {
      if (current.index + 1 >= current.problems.length) {
        finish(current);
        return;
      }
      setInput("");
      setRun({ ...current, index: current.index + 1, phase: "answering", wrongTries: 0, feedbackKey: 0 });
      shownAtRef.current = performance.now();
      // A long miss panel can scroll the counter and Stop out of view; each problem starts at the top.
      if (window.scrollY > 0) window.scrollTo({ top: 0 });
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [finish],
  );

  const markRight = (current: Run) => {
    const seconds = (performance.now() - shownAtRef.current) / 1000;
    const clean = current.wrongTries === 0;
    const solo = current.index >= QUANT_GUIDED;
    const next: Run = {
      ...current,
      phase: "right",
      soloFirstTry: current.soloFirstTry + (clean && solo ? 1 : 0),
      soloTimes: clean && solo ? [...current.soloTimes, seconds] : current.soloTimes,
      misses: clean ? current.misses : [...current.misses, current.problems[current.index]],
    };
    setRun(next);
    advanceTimer.current = setTimeout(() => advance(next), RIGHT_PAUSE_MS);
  };

  const reveal = () => {
    if (!run || run.phase !== "answering") return;
    setRun({ ...run, phase: "missed", misses: [...run.misses, run.problems[run.index]] });
  };

  const changeInput = (value: string) => {
    setInput(value);
    // Right answers go through as soon as they're typed; wrong ones wait for Check.
    if (run?.phase === "answering" && isRightAnswer(value, run.problems[run.index].answer, run.problems[run.index].kind)) {
      markRight(run);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!run || run.phase !== "answering" || !input.trim()) return;
    const problem = run.problems[run.index];
    if (isRightAnswer(input, problem.answer, problem.kind)) {
      markRight(run);
      return;
    }
    const wrongTries = run.wrongTries + 1;
    if (wrongTries >= WRONG_TRIES) {
      setRun({ ...run, wrongTries, phase: "missed", misses: [...run.misses, problem] });
    } else {
      setRun({ ...run, wrongTries, feedbackKey: run.feedbackKey + 1 });
      inputRef.current?.select();
    }
  };

  const stop = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setRun(null);
  };

  // List and lesson slide like pages: a lesson comes in from the right and goes back the way it came.
  const page = (direction: 1 | -1) => ({
    initial: reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 * direction },
    animate: { opacity: 1, x: 0 },
    exit: reduceMotion
      ? { opacity: 0, transition: { duration: 0.12 } }
      : { opacity: 0, x: 16 * direction, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] as const } },
    transition: settleSpring,
  });

  const upgradeLink = (surface: string, lessonId: string | undefined, children: ReactNode, className: string) => (
    <Link
      href={getUpgradeUrl({ feature: "quant", source: surface })}
      onClick={() =>
        captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
          feature: "quant",
          surface,
          action: "open_pricing",
          ...(lessonId ? { lesson_id: lessonId } : {}),
        })
      }
      className={className}
    >
      {children}
    </Link>
  );

  const primary = cn(buttonVariants({ variant: "brand", size: "lg" }), "w-full shrink-0 sm:w-auto sm:px-9");

  return (
    <AnimatePresence mode="wait" initial={false} onExitComplete={() => {
        // The arriving screen mounts after this; scroll once it has height.
        const top = showingList.current ? listScroll.current : 0;
        requestAnimationFrame(() => window.scrollTo({ top }));
      }}>
      {run ? (
        <QuantRun
          key="run"
          lesson={run.lesson}
          problem={run.problems[run.index]}
          index={run.index}
          total={run.problems.length}
          guided={run.index < QUANT_GUIDED}
          phase={run.phase}
          wrongTries={run.wrongTries}
          feedbackKey={run.feedbackKey}
          input={input}
          setInput={changeInput}
          inputRef={inputRef}
          onSubmit={submit}
          onReveal={reveal}
          onContinue={() => advance(run)}
          onStop={stop}
        />
      ) : outcome ? (
        <QuantResult
          key="result"
          outcome={outcome}
          onNext={() => outcome.next && start(getQuantLesson(outcome.next.id)!)}
          onAgain={() => start(getQuantLesson(outcome.lessonId)!)}
          onAllLessons={() => {
            listScroll.current = 0;
            pushedDetail.current = false;
            window.history.replaceState(null, "", "/quant");
            setOutcome(null);
          }}
        />
      ) : openLesson ? (
        <motion.div key={`lesson-${openLesson.id}`} {...page(1)} className="mx-auto max-w-2xl px-4 pt-6 pb-16 md:px-6 md:pt-10">
          <QuantLessonDetail
            lesson={openLesson}
            progress={lessons?.progress[openLesson.id]}
            onBack={showList}
            action={
              isLocked(openLesson.id) ? (
                upgradeLink(
                  "quant_lesson",
                  openLesson.id,
                  <>
                    <Lock aria-hidden="true" className="h-4 w-4" />
                    Unlock with Pro
                  </>,
                  primary,
                )
              ) : (
                <Button onClick={() => start(openLesson)} variant="brand" size="lg" className={primary}>
                  Start lesson
                </Button>
              )
            }
            note={
              isLocked(openLesson.id)
                ? "The first lesson in each topic is free. Pro opens all 13."
                : `${QUANT_GUIDED} with the working, then ${QUANT_SOLO} on your own. Fractions, decimals and percentages all count.`
            }
          />
        </motion.div>
      ) : (
        <motion.div key="list" {...page(-1)} className="mx-auto max-w-2xl px-4 pt-10 pb-16 md:px-6 md:pt-14">
          <header className="mb-10 px-1">
            <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[44px]">Quant</h1>
            <p className="mt-3 text-[17px] leading-7 text-muted-foreground">
              Probability, expected value and bet sizing, one idea at a time.
            </p>
          </header>
          <QuantLessonList
            onSelect={select}
            lessons={lessons}
            locked={locked}
            footer={
              locked && (
                <p className="px-1 text-[15px] leading-6 text-muted-foreground">
                  The first lesson in each topic is free.{" "}
                  {upgradeLink(
                    "quant_list",
                    undefined,
                    "Get Pro for all 13",
                    "font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground",
                  )}
                </p>
              )
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
