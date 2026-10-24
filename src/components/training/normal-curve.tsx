"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { normalPdf, normalQuantile } from "@/lib/normal";
import { cn } from "@/lib/utils";

const WIDTH = 320;
const HEIGHT = 96;
const BASE = 92;
const PEAK = 80;
const Z_RANGE = 3.1;
const STEPS = 96;

const xOf = (z: number) => ((z + Z_RANGE) / (2 * Z_RANGE)) * WIDTH;
const yOf = (z: number) => BASE - (normalPdf(z) / normalPdf(0)) * PEAK;

// The bell, left to right, as an outline and as the area under it.
const points = Array.from({ length: STEPS + 1 }, (_, i) => -Z_RANGE + (2 * Z_RANGE * i) / STEPS);
const outline = points.map((z, i) => `${i ? "L" : "M"}${xOf(z).toFixed(2)},${yOf(z).toFixed(2)}`).join(" ");
const area = `${outline} L${WIDTH},${BASE} L0,${BASE} Z`;

/**
 * A standard normal curve in the app's chart style (ink line, soft ink fill, as on the
 * dashboard), filled in up to where the run sits: the share of runs it beats. Past that the
 * line goes faint and unfilled.
 */
export function NormalCurve({
  percentile,
  surface = "secondary",
  className,
}: {
  percentile: number;
  /** The surface it sits on, so the marker's ring matches it. */
  surface?: "secondary" | "background";
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const id = useId();
  // Kept off the very ends, so the top and bottom of the curve still show a little either side.
  const z = Math.max(-Z_RANGE + 0.08, Math.min(Z_RANGE - 0.08, normalQuantile(Math.min(0.999, Math.max(0.001, percentile / 100)))));
  const x = xOf(z);
  const y = yOf(z);
  const sweep = { type: "spring" as const, bounce: 0, duration: 0.9, delay: 0.15 };

  return (
    <div className={cn("relative text-foreground", className)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`Bell curve filled in up to this run: better than ${Math.round(percentile)}% of runs`}>
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="currentColor" stopOpacity={0.22} />
            <stop offset="95%" stopColor="currentColor" stopOpacity={0.02} />
          </linearGradient>
          <clipPath id={`${id}-beaten`}>
            <motion.rect x={0} y={-8} height={HEIGHT + 16} initial={reduceMotion ? false : { width: 0 }} animate={{ width: x }} transition={sweep} />
          </clipPath>
        </defs>
        {/* The whole curve, faint; then the runs beaten, filled and in full ink. */}
        <path d={outline} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={2} strokeLinecap="round" />
        <g clipPath={`url(#${id}-beaten)`}>
          <path d={area} fill={`url(#${id}-fill)`} />
          <path d={outline} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </g>
        <line x1={0} x2={WIDTH} y1={BASE} y2={BASE} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
        <motion.g initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : 0.9, duration: 0.2 }}>
          <line x1={x} x2={x} y1={y} y2={BASE} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} strokeDasharray="2 3" />
          <circle cx={x} cy={y} r={5} fill="var(--foreground)" stroke={`var(--${surface})`} strokeWidth={2} />
        </motion.g>
      </svg>
      {/* "You" over the marker, as type rather than SVG text so it stays crisp at any size. */}
      <motion.span
        aria-hidden="true"
        initial={reduceMotion ? false : { opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.9, duration: 0.2 }}
        className="absolute -translate-x-1/2 -translate-y-full pb-2 text-[12px] font-semibold"
        style={{ left: `${(x / WIDTH) * 100}%`, top: `${(y / HEIGHT) * 100}%` }}
      >
        You
      </motion.span>
    </div>
  );
}
