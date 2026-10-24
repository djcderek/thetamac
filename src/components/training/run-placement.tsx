"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { settleSpring } from "@/lib/motion";
import type { ScoreDistribution } from "@/components/training/training-types";
import { NormalCurve } from "@/components/training/normal-curve";
import { MIN_PACE_SECONDS, MIN_PACE_ANSWERS } from "@/lib/run-placement";

function ordinal(value: number): string {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  return `${value}${{ 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th"}`;
}

/**
 * Where the run ranks, at the centre of the results: the percentile counting up, the
 * settings it's compared on, and a bell curve with the share of runs it beats shaded in.
 * When a comparison isn't available, explain why instead of silently hiding it.
 */
export function RunPlacement({ data }: { data: ScoreDistribution }) {
  if (data.percentile !== null) {
    return <PlacedRun data={{ ...data, percentile: data.percentile }} />;
  }
  const custom = data.unavailableReason === "custom_ranges";
  const short = data.unavailableReason === "too_short";
  return (
    <section aria-label="Placement" className="mt-6 rounded-[26px] bg-secondary px-5 py-5 sm:px-7">
      <p className="text-[15px] font-medium">{custom ? "Custom-range placement unavailable" : short ? "A little more time for a pace estimate" : "Not enough comparable runs yet"}</p>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
        {custom
          ? "Custom number ranges vary between runs, so we can’t give them a comparable percentile yet."
          : short
            ? `Play for at least ${MIN_PACE_SECONDS} seconds and answer ${MIN_PACE_ANSWERS} problems correctly for an estimated pace placement.`
            : `There aren’t enough runs on ${data.setupLabel} to compare with yet.`}
      </p>
    </section>
  );
}

function PlacedRun({ data }: { data: ScoreDistribution & { percentile: number } }) {
  const reduceMotion = useReducedMotion();
  const target = Math.max(0, Math.min(99, Math.round(data.percentile)));
  const top = data.percentile >= 99;
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
  const historical = data.comparison === "historical";

  return (
    <motion.section
      aria-label="Placement"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={settleSpring}
      className="mt-6 rounded-[26px] bg-secondary px-5 pb-4 pt-5 sm:px-7"
    >
      <p className="text-[13px] font-medium text-muted-foreground">{pace ? "Estimated pace placement" : historical ? "Estimated percentile" : "Your placement"}</p>
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
        Compared with runs on <span className="text-foreground">{data.setupLabel}</span>
      </p>

      {/* The percentile as area under a bell curve: the shaded part is the share of runs beaten. */}
      <div className="mx-auto mt-6 max-w-md">
        <NormalCurve percentile={data.percentile} />
      </div>
    </motion.section>
  );
}
