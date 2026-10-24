"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Lock, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { QUANT_LESSONS, QUANT_TOPICS, generateFromFamily, isFreeQuantLesson, type QuantLesson, type QuantProblem } from "@/lib/quant/lessons";
import type { QuantFamily, QuantTopic } from "@/lib/quant/lessons";
import { useQuantProgress } from "@/components/quant/quant-list";
import { QuantQuestion } from "@/components/quant/quant-question";
import { markType } from "@/components/quant/type-progress";
import { trackQuantUpgradeClick } from "@/components/quant/quant-analytics";
import { recordQuantAttempt } from "@/components/quant/quant-attempts";

/** Question types that can't come up again straight away. */
const RECENT = 4;

type Draw = { lesson: QuantLesson; family: QuantFamily; problem: QuantProblem };

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
  const { locked, signedIn } = useQuantProgress();
  const [unit, setUnit] = useState<QuantTopic | null>(null);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [tally, setTally] = useState({ right: 0, done: 0 });
  const recent = useRef<string[]>([]);
  const seen = useRef(new Set<string>());

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
  };

  // The first question, and a fresh one whenever the pool changes (a unit picked, Pro loaded).
  useEffect(() => {
    next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool]);

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
              href={getUpgradeUrl({ feature: "quant", source: "quant_shuffle", next: "/quant/shuffle" })}
              onClick={() => trackQuantUpgradeClick("quant_shuffle", { unit: topic.id })}
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

      {draw && (
        <div className="mt-5">
          <QuantQuestion
            key={draw.problem.key}
            lesson={draw.lesson}
            typeTitle={draw.family.title}
            problem={draw.problem}
            label={`Question ${tally.done + 1}`}
            aside={
              <Button variant="ghost" size="sm" onClick={next} className="shrink-0 text-muted-foreground">
                <Shuffle aria-hidden="true" />
                Skip
              </Button>
            }
            onFinish={({ result, clean, seconds }) => {
              setTally((t) => ({ right: t.right + (result === "right" ? 1 : 0), done: t.done + 1 }));
              markType(draw.lesson.id, draw.family.id, clean);
              if (signedIn) recordQuantAttempt({ lessonId: draw.lesson.id, family: draw.family.id, correct: clean, seconds });
            }}
            onNext={next}
          />
        </div>
      )}

      {locked && (
        <p className="mt-5 px-1 text-[15px] leading-6 text-muted-foreground">
          Free covers the two Foundations units.{" "}
          <Link
            href={getUpgradeUrl({ feature: "quant", source: "quant_shuffle", next: "/quant/shuffle" })}
            onClick={() => trackQuantUpgradeClick("quant_shuffle", { unit: "all" })}
            className="font-medium text-foreground underline-offset-2 hover:underline">
            Pro adds all {QUANT_LESSONS.length} lessons
          </Link>
          .
        </p>
      )}
    </div>
  );
}
