"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { runEnter } from "@/lib/motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import type { DailySummary } from "@/components/training/training-types";

/** "6 to review · 3 lesson checks · 9 weak spots", leaving out empty parts. */
export function describeDaily({ review, lesson, weak }: DailySummary["counts"]) {
  return [
    review > 0 && `${review} to review`,
    lesson > 0 && `${lesson} lesson ${lesson === 1 ? "check" : "checks"}`,
    weak > 0 && `${weak} weak ${weak === 1 ? "spot" : "spots"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "0.4s faster than your first days" (or slower); null when it's about the same. */
export function compareToBaseline(today: number, baseline: number) {
  const difference = Math.round((baseline - today) * 10) / 10;
  if (Math.abs(difference) < 0.1) return null;
  return `${Math.abs(difference).toFixed(1)}s ${difference > 0 ? "faster" : "slower"} than your first days`;
}

/** Seven dots for the last week, today last; each fills in once that day's session is done. */
export function WeekDots({ week, className }: { week: boolean[]; className?: string }) {
  const reduceMotion = useReducedMotion();
  const today = new Date();
  return (
    <ol aria-label="Last 7 days" className={cn("flex items-center gap-1.5", className)}>
      {week.map((done, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (week.length - 1 - index));
        const isToday = index === week.length - 1;
        const label = date.toLocaleDateString(undefined, { weekday: "long" });
        return (
          <li key={index} className="flex flex-col items-center gap-1" aria-label={`${label}: ${done ? "done" : "not done"}`}>
            <motion.span
              initial={reduceMotion || !done || !isToday ? false : { scale: 0.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.5, delay: 0.2 }}
              className={cn(
                "block size-3 rounded-full",
                done ? "bg-foreground" : "bg-control",
                isToday && !done && "ring-2 ring-inset ring-foreground/25",
              )}
            />
            <span aria-hidden="true" className={cn("text-[11px] leading-none", isToday ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {date.toLocaleDateString(undefined, { weekday: "narrow" })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Quant question types due in review, as a second row of Today that opens /quant/review. */
export function QuantReviewRow({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-background py-2 pl-4 pr-2">
      <p className="min-w-0 text-[15px] font-medium leading-5">
        Quant review · {count} question {count === 1 ? "type" : "types"}
      </p>
      <Link href="/quant/review" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "min-h-10 shrink-0")}>
        Review
      </Link>
    </div>
  );
}

/**
 * The next lesson in the quant mock plan, as another row of Today. The href is built here rather
 * than with planStepHref, which would bring the whole quant course into the training page.
 */
export function QuantPlanRow({ plan }: { plan: NonNullable<DailySummary["quantPlan"]> }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-background py-2 pl-4 pr-2">
      <div className="min-w-0">
        <p className="truncate text-[15px] font-medium leading-5">{plan.title}</p>
        <p className="text-[13px] tabular-nums text-muted-foreground">
          Quant plan · {plan.done} of {plan.total} done
        </p>
      </div>
      <Link
        href={`/quant/${plan.lessonId}${plan.read ? "?step=practice" : ""}`}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "min-h-10 shrink-0")}
      >
        {plan.read ? "Practise" : "Start"}
      </Link>
    </div>
  );
}

/**
 * Today's session, above the training setup. Pro starts it; free accounts see what theirs
 * would hold and where to unlock it.
 */
export function TodayCard({ daily, onStart }: { daily: DailySummary; onStart: () => void }) {
  const { locked, doneToday, streak, week, counts, quantDue, quantPlan } = daily;
  const parts = describeDaily(counts);

  let detail: string;
  if (locked) {
    detail = parts ? `Yours would have ${parts.replace(/ · /g, ", ")}` : "Built each day from your misses, lessons and slow spots";
  } else if (doneToday) {
    detail = "Done for today. Back tomorrow to keep it going.";
  } else {
    detail = parts ? `${parts}, plus a mix` : "A 20-problem mix to start. It learns from what you play.";
  }

  return (
    <motion.section
      aria-labelledby="today-heading"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={runEnter}
      className="space-y-4 rounded-[26px] bg-secondary p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="today-heading" className="flex items-center gap-1.5 text-[17px] font-semibold tracking-tight">
            Today
            {locked && (
              <span className="rounded-full bg-background px-1.5 text-[11px] font-semibold leading-4">Pro</span>
            )}
          </h2>
          <p className="mt-0.5 text-[15px] text-muted-foreground">Your five minutes, built from your own play</p>
        </div>
        {!locked && streak > 0 && (
          <p className="flex shrink-0 items-center gap-1 text-[15px] font-semibold tabular-nums">
            <Flame aria-hidden="true" className="h-4 w-4 text-brand" />
            {streak} {streak === 1 ? "day" : "days"}
          </p>
        )}
      </div>

      {!locked && <WeekDots week={week} />}

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-background py-2 pl-4 pr-2">
        <p className="min-w-0 text-[15px] font-medium leading-5">{detail}</p>
        {locked ? (
          <Link
            href={getUpgradeUrl({ feature: "daily", source: "today_card" })}
            onClick={() =>
              captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
                feature: "daily",
                surface: "training_setup",
                action: "open_pricing",
                daily_review_count: counts.review,
                daily_weak_count: counts.weak,
              })
            }
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "min-h-10 shrink-0")}
          >
            Unlock
          </Link>
        ) : (
          <Button size="sm" variant={doneToday ? "secondary" : "default"} onClick={onStart} className="min-h-10 shrink-0">
            {doneToday ? "Go again" : "Start"}
          </Button>
        )}
      </div>

      {quantPlan && <QuantPlanRow plan={quantPlan} />}
      {quantDue > 0 && <QuantReviewRow count={quantDue} />}
    </motion.section>
  );
}
