"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "motion/react";
import { Check, ChevronRight, CircleDashed, Lock, Puzzle, RotateCcw, Search, Shuffle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { snapSpring } from "@/lib/motion";
import { buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import { QUANT_LESSONS, QUANT_PUZZLES, QUANT_TOPICS, isFreeQuantLesson, type QuantLesson, type QuantTopic } from "@/lib/quant/lessons";
import type { QuantDifficulty } from "@/lib/quant/build";
import type { LessonsSummary } from "@/components/training/training-types";
import { DifficultyLabel } from "@/components/quant/difficulty";
import { MockPlanRow } from "@/components/quant/mock-plan";
import type { MockPlan } from "@/lib/quant/plan";
import { MOCK_MINUTES, MOCK_QUESTIONS, mockRating } from "@/lib/quant/mock";

type Status = "solved" | "tried" | "todo";
const DIFFICULTIES: QuantDifficulty[] = ["Easy", "Medium", "Hard"];
const DIFFICULTY_BAR: Record<QuantDifficulty, string> = { Easy: "bg-success", Medium: "bg-warning", Hard: "bg-destructive" };

/** Lesson progress for signed-in players: mastery counts as solved. */
export function useQuantProgress() {
  const { data: session, status } = useSession();
  const [lessons, setLessons] = useState<LessonsSummary | null>(null);
  const signedIn = status === "authenticated";

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/lessons/progress", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: LessonsSummary | null) => data && setLessons(data))
      .catch(() => {});
  }, [signedIn]);

  // Pro lessons are open to Pro accounts (the session's plan until progress arrives).
  const locked = lessons ? lessons.locked : !session?.user?.isPremium;
  // Whether `locked` is settled: signed out, or the account's progress has arrived.
  const ready = status === "unauthenticated" || lessons !== null;
  return { lessons, setLessons, locked, signedIn, ready };
}

export function lessonStatus(lessons: LessonsSummary | null, id: string): Status {
  const progress = lessons?.progress[id];
  if (!progress) return "todo";
  return progress.mastered ? "solved" : "tried";
}

function StatusIcon({ status, locked }: { status: Status; locked: boolean }) {
  if (status === "solved") return <Check aria-label="Mastered" className="h-4 w-4 text-success" strokeWidth={2.5} />;
  if (status === "tried") return <CircleDashed aria-label="Tried" className="h-4 w-4 text-warning" />;
  if (locked) return <Lock aria-label="Pro" className="h-3.5 w-3.5 text-muted-foreground" />;
  return null;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 shrink-0 rounded-full px-3.5 text-[14px] font-medium transition-colors",
        active ? "bg-foreground text-background" : "bg-control text-foreground hover:bg-control-hover",
      )}
    >
      {children}
    </button>
  );
}

/** Solved out of all, as a ring, with a bar per difficulty. */
function ProgressCard({ lessons }: { lessons: LessonsSummary | null }) {
  const solved = QUANT_LESSONS.filter((l) => lessonStatus(lessons, l.id) === "solved");
  const share = solved.length / QUANT_LESSONS.length;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="rounded-[22px] bg-secondary p-5">
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
          <motion.circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="var(--success)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - share) }}
            transition={snapSpring}
          />
        </svg>
        <div>
          <p className="text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
            {solved.length}
            <span className="text-[17px] font-medium text-muted-foreground">/{QUANT_LESSONS.length}</span>
          </p>
          <p className="mt-1 text-[15px] text-muted-foreground">Mastered</p>
        </div>
      </div>
      <dl className="mt-5 space-y-3">
        {DIFFICULTIES.map((difficulty) => {
          const all = QUANT_LESSONS.filter((l) => l.difficulty === difficulty);
          const done = all.filter((l) => lessonStatus(lessons, l.id) === "solved").length;
          return (
            <div key={difficulty}>
              <div className="flex items-baseline justify-between text-[14px]">
                <dt>
                  <DifficultyLabel difficulty={difficulty} />
                </dt>
                <dd className="tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">{done}</span>/{all.length}
                </dd>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-control">
                <div className={cn("h-full rounded-full transition-[width] duration-500", DIFFICULTY_BAR[difficulty])} style={{ width: `${(done / all.length) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** The units in course order, by stage, with progress; picking one filters the list. */
function StudyPlan({
  lessons,
  locked,
  unit,
  setUnit,
}: {
  lessons: LessonsSummary | null;
  locked: boolean;
  unit: QuantTopic | null;
  setUnit: (unit: QuantTopic | null) => void;
}) {
  return (
    <nav aria-label="Units" className="rounded-[22px] bg-secondary p-2">
      <button
        type="button"
        onClick={() => setUnit(null)}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-[15px] font-medium transition-colors",
          unit === null ? "bg-background" : "hover:bg-control-hover",
        )}
      >
        All units
        <span className="text-[13px] tabular-nums text-muted-foreground">{QUANT_LESSONS.length}</span>
      </button>
      {QUANT_TOPICS.map((topic, index) => {
        const inUnit = QUANT_LESSONS.filter((l) => l.topic === topic.id);
        const done = inUnit.filter((l) => lessonStatus(lessons, l.id) === "solved").length;
        const startsStage = QUANT_TOPICS[index - 1]?.stage !== topic.stage;
        return (
          <div key={topic.id}>
            {startsStage && (
              <p className="px-3 pt-4 pb-1.5 text-[13px] font-medium text-muted-foreground">
                {topic.stage}
                {locked && <> · {topic.stage === "Foundations" ? "Free" : "Pro"}</>}
              </p>
            )}
            <button
              type="button"
              onClick={() => setUnit(unit === topic.id ? null : topic.id)}
              aria-pressed={unit === topic.id}
              className={cn(
                "w-full rounded-2xl px-3 py-2.5 text-left transition-colors",
                unit === topic.id ? "bg-background" : "hover:bg-control-hover",
              )}
            >
              <span className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="min-w-0 truncate font-medium">
                  <span className="mr-1.5 tabular-nums text-muted-foreground">{topic.number}</span>
                  {topic.title}
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                  {done}/{inUnit.length}
                </span>
              </span>
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-control">
                <span className="block h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${(done / inUnit.length) * 100}%` }} />
              </span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

type MockState = { latest: { score: number } | null; freeLeft: number | null; locked: boolean };

/**
 * The mock test, as its own row under the header: what it is, the last score, and the way in.
 * Signed out, or before the mocks load, it's the plain invitation.
 */
function MockRow({ mock }: { mock: MockState | null }) {
  const latest = mock?.latest ?? null;
  const detail = mock?.locked
    ? "Your free mock is used. Pro has unlimited mocks."
    : mock?.freeLeft
      ? "Questions from across the course, scored out of 100. Your first one is free."
      : "Questions from across the course, scored out of 100.";
  return (
    <section aria-label="Mock test" className="flex flex-col gap-3 rounded-[22px] bg-secondary px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] tabular-nums text-muted-foreground">
          Mock test · {MOCK_QUESTIONS} questions · {MOCK_MINUTES} min
        </p>
        <p className="mt-0.5 text-[17px] font-semibold tracking-[-0.01em]">
          {latest ? `Last score ${latest.score}, ${mockRating(latest.score).label}` : "See how you’d do in a first round"}
        </p>
        <p className="mt-0.5 text-[14px] leading-5 text-muted-foreground">{detail}</p>
      </div>
      <Link
        href="/quant/mock"
        className={cn(buttonVariants({ variant: mock?.locked ? "secondary" : "default", size: "sm" }), "min-h-10 w-full shrink-0 sm:w-auto", mock?.locked && "bg-background")}
      >
        <Timer aria-hidden="true" />
        {mock?.locked ? "Your results" : latest ? "Take another" : "Take a mock"}
      </Link>
    </section>
  );
}

function UpgradeCard() {
  return (
    <div className="rounded-[22px] bg-secondary p-5">
      <p className="text-[17px] font-semibold tracking-tight">Foundations are free</p>
      <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
        Pro opens all {QUANT_LESSONS.length} lessons, from conditional probability to random walks.
      </p>
      <Link
        href={getUpgradeUrl({ feature: "quant", source: "quant_list", next: "/quant" })}
        onClick={() =>
          captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, { feature: "quant", surface: "quant_list", action: "open_pricing" })
        }
        className={cn(buttonVariants({ variant: "brand" }), "mt-4 w-full")}
      >
        Get Pro
      </Link>
    </div>
  );
}

/** The course as a problem list: filter by unit, difficulty and status, or search by name. */
export function QuantList() {
  const { lessons, locked, signedIn } = useQuantProgress();
  // The player's mocks: the latest score for the mock row, and the plan it left, shown above
  // the list while it has steps left.
  const [plan, setPlan] = useState<MockPlan | null>(null);
  const [mock, setMock] = useState<MockState | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/quant/mocks", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { plan: MockPlan | null; history: { score: number }[]; freeLeft: number | null; locked: boolean } | null) => {
        if (!data) return;
        setPlan(data.plan);
        setMock({ latest: data.history[0] ?? null, freeLeft: data.freeLeft, locked: data.locked });
      })
      .catch(() => {});
  }, [signedIn]);
  // How many missed question types are due, for the Review button (signed-in players).
  const [reviewDue, setReviewDue] = useState<number | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/quant/review", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { dueCount: number } | null) => data && setReviewDue(data.dueCount))
      .catch(() => {});
  }, [signedIn]);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<QuantDifficulty | null>(null);
  const [status, setStatus] = useState<Status | "all">("all");
  const [unit, setUnit] = useState<QuantTopic | null>(null);

  const rows = useMemo(() => {
    const words = query.trim().toLowerCase();
    return QUANT_LESSONS.map((lesson, index) => ({ lesson, number: index + 1 })).filter(({ lesson }) => {
      if (unit && lesson.topic !== unit) return false;
      if (difficulty && lesson.difficulty !== difficulty) return false;
      const lessonState = lessonStatus(lessons, lesson.id);
      if (status === "solved" && lessonState !== "solved") return false;
      if (status === "todo" && lessonState === "solved") return false;
      if (words && !`${lesson.title} ${lesson.benefit}`.toLowerCase().includes(words)) return false;
      return true;
    });
  }, [query, difficulty, status, unit, lessons]);

  const unitOf = (lesson: QuantLesson) => QUANT_TOPICS.find((t) => t.id === lesson.topic)!;

  return (
    <div className="px-4 pt-8 pb-16 md:px-6 md:pt-12">
      <header className="mb-8 max-w-2xl px-1">
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[44px]">Quant</h1>
        <p className="mt-3 text-[17px] leading-7 text-muted-foreground">
          A step-by-step course in the probability and expected value asked in quant interviews.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {signedIn && (
            <Link href="/quant/review" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              <RotateCcw aria-hidden="true" />
              Review
              {!!reviewDue && (
                <span className="rounded-full bg-brand px-1.5 text-[12px] font-semibold leading-[18px] text-brand-foreground tabular-nums">{reviewDue}</span>
              )}
            </Link>
          )}
          <Link href="/quant/shuffle" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Shuffle aria-hidden="true" />
            Shuffle questions
          </Link>
          <Link href="/quant/puzzles" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Puzzle aria-hidden="true" />
            {QUANT_PUZZLES.length} classic puzzles
            <ChevronRight aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          <MockRow mock={mock} />
          {plan && <MockPlanRow plan={plan} pro={!locked} />}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          {/* On phones the progress sits above the list; on desktop it's in the sidebar. */}
          <div className="mb-6 lg:hidden">
            <ProgressCard lessons={lessons} />
          </div>

          <div className="flex flex-col gap-3">
            <label className="relative block">
              <span className="sr-only">Search lessons</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lessons"
                className="h-11 w-full rounded-full bg-secondary pl-10 pr-4 text-[15px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </label>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
              <Chip active={!difficulty} onClick={() => setDifficulty(null)}>
                All levels
              </Chip>
              {DIFFICULTIES.map((d) => (
                <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(difficulty === d ? null : d)}>
                  {d}
                </Chip>
              ))}
              <span aria-hidden="true" className="mx-1 w-px shrink-0 bg-border" />
              <Chip active={status === "todo"} onClick={() => setStatus(status === "todo" ? "all" : "todo")}>
                To do
              </Chip>
              <Chip active={status === "solved"} onClick={() => setStatus(status === "solved" ? "all" : "solved")}>
                Mastered
              </Chip>
            </div>
            {/* Units as chips on phones; the sidebar has them on desktop. */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
              <Chip active={!unit} onClick={() => setUnit(null)}>
                All units
              </Chip>
              {QUANT_TOPICS.map((topic) => (
                <Chip key={topic.id} active={unit === topic.id} onClick={() => setUnit(unit === topic.id ? null : topic.id)}>
                  {topic.number} {topic.title}
                </Chip>
              ))}
            </div>
          </div>

          <div role="table" aria-label="Lessons" className="mt-5">
            <div role="row" className="hidden grid-cols-[40px_minmax(0,1fr)_190px_80px] gap-3 px-3 pb-2 text-[13px] font-medium text-muted-foreground sm:grid">
              <span role="columnheader">Status</span>
              <span role="columnheader">Lesson</span>
              <span role="columnheader">Unit</span>
              <span role="columnheader">Level</span>
            </div>
            {rows.length === 0 && (
              <p className="rounded-[22px] bg-secondary px-5 py-8 text-center text-[15px] text-muted-foreground">No lessons match.</p>
            )}
            <div className="divide-y divide-border border-t border-border">
              {rows.map(({ lesson, number }) => {
                const topic = unitOf(lesson);
                const isLocked = locked && !isFreeQuantLesson(lesson.id);
                return (
                  <Link
                    key={lesson.id}
                    role="row"
                    href={`/quant/${lesson.id}`}
                    className={cn(
                      "grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3 px-3 py-3.5 transition-colors hover:bg-secondary sm:grid-cols-[40px_minmax(0,1fr)_190px_80px]",
                        )}
                  >
                    <span role="cell" className="grid place-items-center sm:place-items-start sm:pl-1">
                      <StatusIcon status={lessonStatus(lessons, lesson.id)} locked={isLocked} />
                    </span>
                    <span role="cell" className="min-w-0">
                      <span className="block truncate text-[15px] font-medium">
                        <span className="tabular-nums">{number}.</span> {lesson.title}
                      </span>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        {lesson.benefit}
                        <span className="hidden sm:inline"> · {lesson.families.length} question types</span>
                      </span>
                      {/* Phones fold the unit and level into the row. */}
                      <span className="mt-0.5 block text-[13px] sm:hidden">
                        <DifficultyLabel difficulty={lesson.difficulty} />
                        <span className="text-muted-foreground">
                          {" "}
                          · {topic.title} · {lesson.families.length} types
                        </span>
                      </span>
                    </span>
                    <span role="cell" className="hidden truncate text-[14px] text-muted-foreground sm:block">
                      {topic.title}
                    </span>
                    <span role="cell" className="hidden text-[14px] sm:block">
                      <DifficultyLabel difficulty={lesson.difficulty} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="hidden space-y-4 lg:sticky lg:top-24 lg:block">
          <ProgressCard lessons={lessons} />
          <StudyPlan lessons={lessons} locked={locked} unit={unit} setUnit={setUnit} />
          {locked && <UpgradeCard />}
        </aside>
        {locked && (
          <div className="lg:hidden">
            <UpgradeCard />
          </div>
        )}
      </div>
    </div>
  );
}
