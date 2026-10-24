"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { normalPdf, normalQuantile } from "@/lib/normal";

const WIDTH = 320;
const HEIGHT = 112;
const BASE = 100;
const PEAK = 84;
const Z_RANGE = 3.2;
const STEPS = 96;

const xOf = (z: number) => ((z + Z_RANGE) / (2 * Z_RANGE)) * WIDTH;
const yOf = (z: number) => BASE - (normalPdf(z) / normalPdf(0)) * PEAK;

// The bell, left to right, as an outline and as the area under it.
const points = Array.from({ length: STEPS + 1 }, (_, i) => -Z_RANGE + (2 * Z_RANGE * i) / STEPS);
const outline = points.map((z, i) => `${i ? "L" : "M"}${xOf(z).toFixed(2)},${yOf(z).toFixed(2)}`).join(" ");
const area = `${outline} L${WIDTH},${BASE} L0,${BASE} Z`;

/**
 * A standard normal curve with the share of runs this one beats shaded in, up to where the
 * run sits. It's the percentile drawn as area: at the 84th percentile, the shading covers
 * everything left of one standard deviation above the mean.
 */
export function NormalCurve({ percentile, className }: { percentile: number; className?: string }) {
  const reduceMotion = useReducedMotion();
  const clip = useId();
  // Kept off the very ends, so even the top and bottom of the curve show a sliver either side.
  const z = Math.max(-Z_RANGE + 0.05, Math.min(Z_RANGE - 0.05, normalQuantile(Math.min(0.999, Math.max(0.001, percentile / 100)))));
  const x = xOf(z);
  const y = yOf(z);
  const shade = { ...{ type: "spring" as const, bounce: 0, duration: 0.9 }, delay: 0.15 };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={className}
      role="img"
      aria-label={`Bell curve with the ${Math.round(percentile)}% of runs this one beats shaded`}
    >
      <defs>
        <clipPath id={clip}>
          <motion.rect x={0} y={0} height={HEIGHT} initial={reduceMotion ? false : { width: 0 }} animate={{ width: x }} transition={shade} />
        </clipPath>
      </defs>
      {/* Everyone's runs, then the ones this run beats in brand. */}
      <path d={area} className="fill-foreground/[0.07]" />
      <path d={area} clipPath={`url(#${clip})`} className="fill-brand/85" />
      <path d={outline} fill="none" className="stroke-foreground/25" strokeWidth={1.5} />
      <line x1={0} x2={WIDTH} y1={BASE} y2={BASE} className="stroke-foreground/15" strokeWidth={1} />
      {/* This run. */}
      <motion.g initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : 0.85, duration: 0.25 }}>
        <line x1={x} x2={x} y1={BASE} y2={y} className="stroke-foreground" strokeWidth={1.5} />
        <circle cx={x} cy={y} r={4} className="fill-foreground stroke-secondary" strokeWidth={2} />
      </motion.g>
    </svg>
  );
}
