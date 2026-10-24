"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { settleSpring } from "@/lib/motion";
import type { ScoreDistribution } from "@/components/training/training-types";

function ordinal(value: number): string {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  return `${value}${{ 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th"}`;
}

/**
 * Where the run ranks, at the centre of the results: the percentile counting up, what it
 * means in words, and the curve of everyone's runs on the same settings with this one
 * marked. Only shown when there's a placement; without one the results go without.
 */
export function RunPlacement({ data }: { data: ScoreDistribution & { percentile: number } }) {
  const reduceMotion = useReducedMotion();
  const target = Math.max(1, Math.min(99, Math.round(data.percentile)));
  const top = Math.round(data.percentile) >= 99;
  const [shown, setShown] = useState(reduceMotion ? target : 1);

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(1, target, {
      duration: 0.9,
      delay: 0.15,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [target, reduceMotion]);

  const pace = data.basis === "pace";
  const better = Math.round(data.percentile);
  const buckets = data.buckets;
  const first = buckets[0];
  const last = buckets[buckets.length - 1];

  return (
    <motion.section
      aria-label="Placement"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={settleSpring}
      className="mt-6 rounded-[26px] bg-secondary px-5 pb-4 pt-5 sm:px-7"
    >
      <p className="text-[13px] font-medium text-muted-foreground">{pace ? "On pace for" : "Your placement"}</p>
      <p className="mt-1 text-[48px] font-semibold leading-none tracking-[-0.045em] tabular-nums sm:text-[56px]">
        {top ? (
          "Top 1%"
        ) : (
          <>
            {ordinal(reduceMotion ? target : shown)}
            <span className="ml-2 text-[22px] font-medium tracking-[-0.02em] text-muted-foreground sm:text-[24px]">percentile</span>
          </>
        )}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[15px] leading-6 text-muted-foreground">
        {pace ? "At this pace, better than" : "Better than"} {better}% of runs on <span className="whitespace-nowrap text-foreground">{data.setupLabel}</span>
      </p>

      {buckets.length > 1 && data.maxCount > 0 && (
        <div className="mt-5">
          {/* Everyone's runs on these settings; this run's bar in brand. */}
          <div className="flex h-20 items-end gap-px sm:gap-[3px]" aria-hidden="true">
            {buckets.map((bucket, i) => {
              const mine = i === data.userBucketIndex;
              const height = bucket.count === 0 && !mine ? 0 : Math.max(6, Math.round((bucket.count / data.maxCount) * 100));
              return (
                <motion.span
                  key={bucket.from}
                  className={mine ? "flex-1 rounded-[2px] bg-brand" : "flex-1 rounded-[2px] bg-muted-foreground/25 dark:bg-muted-foreground/35"}
                  initial={reduceMotion ? false : { height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ ...settleSpring, delay: 0.1 + (i / buckets.length) * 0.35 }}
                />
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-muted-foreground" aria-hidden="true">
            <span>{first.from}</span>
            <span>{last.to}</span>
          </div>
        </div>
      )}
      <p className="mt-3 text-[12px] tabular-nums text-muted-foreground">
        {pace ? `Your pace over the full time: ${data.score}` : `Your score: ${data.score}`} · {data.total} runs from {data.players} players
      </p>
    </motion.section>
  );
}
