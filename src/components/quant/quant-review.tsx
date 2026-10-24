"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Check, ChevronLeft, RotateCcw, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter } from "@/lib/motion";
import { buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { createFamilyProblem, getQuantLesson, getQuantPuzzle, type QuantLesson, type QuantProblem } from "@/lib/quant/lessons";
import { useSession } from "next-auth/react";
import { QuantQuestion } from "@/components/quant/quant-question";
import { markPuzzle, markType } from "@/components/quant/type-progress";
import { recordQuantAttempt } from "@/components/quant/quant-attempts";

type DueType = { lessonId: string; family: string; title: string; misses: number };
export type QuantReviewSummary = {
  locked: boolean;
  dueCount: number;
  waitingCount: number;
  nextDueAt: string | null;
  due: DueType[];
  example: DueType | null;
};
type Item = DueType & { lesson: QuantLesson; problem: QuantProblem };

const PUZZLE = "puzzle:";

/** A fresh question of a missed type; a missed puzzle comes back as itself. */
function itemFor(entry: DueType): Item | null {
  const lesson = getQuantLesson(entry.lessonId);
  if (!lesson) return null;
  if (entry.family.startsWith(PUZZLE)) {
    const puzzle = getQuantPuzzle(entry.family.slice(PUZZLE.length));
    return puzzle ? { ...entry, lesson, problem: puzzle.problem } : null;
  }
  return { ...entry, lesson, problem: createFamilyProblem(lesson, entry.family) };
}

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 md:px-6 md:pt-10">
      <Link href="/quant" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 px-2.5")}>
        <ChevronLeft aria-hidden="true" />
        Lessons
      </Link>
      <header className="mt-4 px-1">
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em]">Review</h1>
        <p className="mt-2 text-[17px] leading-7 text-muted-foreground">
          Question types you’ve missed, back with new numbers. A type clears once you get it right on a later day, then again three days after.
        </p>
      </header>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[22px] bg-secondary p-5 sm:p-6">{children}</div>;
}

/**
 * Quant review (Pro): one fresh question for each missed question type, most-missed first.
 * Each answer is saved, so the schedule moves on. Free accounts see what's waiting.
 */
export function QuantReview() {
  const reduceMotion = useReducedMotion();
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const [summary, setSummary] = useState<QuantReviewSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  useEffect(() => {
    if (!signedIn) return;
    fetch("/api/quant/review", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: QuantReviewSummary) => {
        setSummary(data);
        setItems(data.due.map(itemFor).filter((item): item is Item => item !== null));
      })
      .catch(() => setFailed(true));
  }, [signedIn]);

  if (status === "loading") return <Shell>{null}</Shell>;
  if (!signedIn) {
    return (
      <Shell>
        <Panel>
          <p className="text-[17px] font-semibold">Sign in to keep a review</p>
          <p className="mt-1 text-[15px] leading-6 text-muted-foreground">Questions you miss in lessons and shuffle are saved to your account, so they can come back here.</p>
          <Link href="/auth/signin" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
            Sign in
          </Link>
        </Panel>
      </Shell>
    );
  }
  if (failed) {
    return (
      <Shell>
        <Panel>
          <p className="text-[15px] text-muted-foreground">Review didn’t load. Try again in a moment.</p>
        </Panel>
      </Shell>
    );
  }
  if (!summary) return <Shell>{null}</Shell>;

  if (summary.locked) {
    return (
      <Shell>
        <Panel>
          <p className="flex items-center gap-1.5 text-[17px] font-semibold">
            {summary.dueCount > 0 ? `${summary.dueCount} question ${summary.dueCount === 1 ? "type" : "types"} to review` : "Nothing to review yet"}
            <span className="rounded-full bg-background px-1.5 text-[11px] font-semibold leading-4">Pro</span>
          </p>
          <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
            {summary.example
              ? `${summary.dueCount === 1 ? "" : "Including "}“${summary.example.title}”, missed ${summary.example.misses === 1 ? "once" : `${summary.example.misses} times`}. Pro brings ${summary.dueCount === 1 ? "it" : "each one"} back with new numbers until it sticks.`
              : "Your misses are saved as you practise. Pro brings each one back with new numbers until it sticks."}
          </p>
          <Link href={getUpgradeUrl({ feature: "review", source: "quant_review", next: "/quant/review" })} className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
            Unlock review
          </Link>
        </Panel>
      </Shell>
    );
  }

  const finished = items.length > 0 && index >= items.length;
  if (!items.length || finished) {
    const right = results.filter(Boolean).length;
    return (
      <Shell>
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={runEnter}>
          <Panel>
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              <Check aria-hidden="true" className="size-5 text-success" strokeWidth={2.5} />
              {finished ? `Reviewed ${items.length}. ${right} right first time.` : "All caught up"}
            </p>
            <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
              {finished
                ? "Types you got right come back for a check in three days. The rest stay until you get them."
                : summary.waitingCount > 0 && summary.nextDueAt
                  ? `${summary.waitingCount} ${summary.waitingCount === 1 ? "type comes" : "types come"} back for a check on ${dateLabel(summary.nextDueAt)}.`
                  : "Nothing is due. Questions you miss in lessons and shuffle show up here."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/quant/shuffle" className={buttonVariants({ size: "sm" })}>
                <Shuffle aria-hidden="true" />
                Shuffle questions
              </Link>
              {finished && (
                <button type="button" onClick={() => window.location.reload()} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                  <RotateCcw aria-hidden="true" />
                  Check again
                </button>
              )}
            </div>
          </Panel>
        </motion.div>
      </Shell>
    );
  }

  const item = items[index];
  return (
    <Shell>
      {/* Where you are in the set: done ones in their result colour. */}
      <div className="mb-4 flex flex-wrap gap-1.5" aria-label={`Review ${index + 1} of ${items.length}`}>
        {items.map((entry, i) => (
          <span
            key={`${entry.lessonId}/${entry.family}`}
            className={cn(
              "h-1.5 w-6 rounded-full transition-colors duration-300",
              i === index ? "bg-foreground" : i < index ? (results[i] ? "bg-success" : "bg-destructive") : "bg-control",
            )}
          />
        ))}
      </div>
      <QuantQuestion
        key={`${item.lessonId}/${item.family}`}
        lesson={item.lesson}
        typeTitle={item.title}
        problem={item.problem}
        label={`Review ${index + 1} of ${items.length} · missed ${item.misses === 1 ? "once" : `${item.misses} times`}`}
        nextLabel={index + 1 >= items.length ? "Finish" : "Next"}
        onFinish={({ clean, seconds }) => {
          setResults((r) => [...r, clean]);
          if (item.family.startsWith(PUZZLE)) markPuzzle(item.family.slice(PUZZLE.length), clean);
          else markType(item.lessonId, item.family, clean);
          recordQuantAttempt({ lessonId: item.lessonId, family: item.family, correct: clean, seconds });
        }}
        onNext={() => setIndex((i) => i + 1)}
      />
    </Shell>
  );
}
