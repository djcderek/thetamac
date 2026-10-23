"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "motion/react";
import { Lock, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { settleSpring } from "@/lib/motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/visual-system";
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
import { QuantIntro, QuantLessonList } from "@/components/quant/quant-picker";
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
  firstTry: number;
  soloFirstTry: number;
  soloTimes: number[];
  misses: QuantProblem[];
};

export function QuantClient() {
  const { data: authSession, status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<QuantLessonId>(() => {
    const fromUrl = getQuantLesson(searchParams.get("lesson") ?? "");
    return fromUrl?.id ?? QUANT_LESSONS[0].id;
  });
  const [lessons, setLessons] = useState<LessonsSummary | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [outcome, setOutcome] = useState<QuantOutcome | null>(null);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const shownAtRef = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signedIn = authStatus === "authenticated";
  // Pro lessons are open to Pro accounts (the session's plan until progress arrives).
  const locked = lessons ? lessons.locked : !authSession?.user?.isPremium;
  const lesson = getQuantLesson(selected)!;
  const lessonLocked = locked && !isFreeQuantLesson(lesson.id);

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

  const select = (id: QuantLessonId) => {
    setSelected(id);
    // The lesson is linkable, so a shared or returning link opens on it.
    window.history.replaceState(null, "", `/quant?lesson=${id}`);
    // On phones the intro is above the list: bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      introRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const start = (target: QuantLesson = lesson) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setSelected(target.id);
    setOutcome(null);
    setInput("");
    setRun({
      lesson: target,
      problems: createQuantLessonProblems(target),
      index: 0,
      phase: "answering",
      wrongTries: 0,
      feedbackKey: 0,
      firstTry: 0,
      soloFirstTry: 0,
      soloTimes: [],
      misses: [],
    });
    shownAtRef.current = performance.now();
    window.scrollTo({ top: 0 });
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
      window.scrollTo({ top: 0 });
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
      firstTry: current.firstTry + (clean ? 1 : 0),
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

  return (
    <AnimatePresence mode="wait" initial={false}>
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
          firstTry={run.firstTry}
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
          onAllLessons={() => setOutcome(null)}
        />
      ) : (
        <motion.div
          key="pick"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
          transition={settleSpring}
          className="pb-16"
        >
          <PageHeader
            eyebrow="Quant"
            title="Probability and expected value"
            description="The maths trading interviews and card rooms ask about: chances, what a game is worth, and how much to bet. Each lesson works one idea through, then hands it to you."
          />
          <div className="grid gap-8 px-4 md:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
            <div ref={introRef} className="scroll-mt-20 space-y-4 lg:sticky lg:top-24">
              <div className="space-y-4 rounded-[26px] bg-secondary p-4 sm:p-5">
                <QuantIntro lesson={lesson} locked={lessonLocked} progress={lessons?.progress[lesson.id]} />
                {lessonLocked ? (
                  <Link
                    href={getUpgradeUrl({ feature: "quant", source: "quant_lesson" })}
                    onClick={() =>
                      captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
                        feature: "quant",
                        surface: "quant_intro",
                        action: "open_pricing",
                        lesson_id: lesson.id,
                      })
                    }
                    className={cn(buttonVariants({ variant: "brand", size: "lg" }), "h-14 w-full text-[17px]")}
                  >
                    <Lock aria-hidden="true" className="h-4 w-4" />
                    Unlock this lesson with Pro
                  </Link>
                ) : (
                  <Button onClick={() => start()} variant="brand" size="lg" className="h-14 w-full text-[17px]">
                    Start lesson
                    <Play aria-hidden="true" className="h-4 w-4 fill-current" />
                  </Button>
                )}
              </div>
              <p className="px-1 text-[13px] leading-5 text-muted-foreground">
                {QUANT_GUIDED} problems with the working, then {QUANT_SOLO} on your own. Type answers as a fraction, a
                decimal or a percentage; decimals count to three figures.
              </p>
            </div>
            <QuantLessonList selected={selected} onSelect={select} lessons={lessons} locked={locked} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
