"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_RATINGS, MOCK_TOTAL } from "@/lib/quant/mock";
import { TOPIC_WINDOW, topicTrends, type MockTopics } from "@/lib/quant/mock-progress";

type Mock = { id: string; score: number; createdAt: string; topics: MockTopics };

const WIDTH = 320;
const HEIGHT = 120;
const TOP = 10;
const BOTTOM = 108;
const PASS = MOCK_RATINGS.find((r) => r.label === "Pass")!.min;

const yOf = (score: number) => BOTTOM - (score / MOCK_TOTAL) * (BOTTOM - TOP);
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * Mock scores over time, in the dashboard chart's style (ink line, soft ink fill, ringed
 * dots), with the Pass mark for reference; then each unit across recent mocks, weakest first.
 * Shown once there are two mocks to compare.
 */
export function MockProgress({ history }: { history: Mock[] }) {
  const reduceMotion = useReducedMotion();
  const fill = useId();
  if (history.length < 2) return null;

  // Oldest to newest, left to right.
  const mocks = [...history].reverse();
  const xOf = (i: number) => (mocks.length === 1 ? WIDTH / 2 : 6 + (i / (mocks.length - 1)) * (WIDTH - 12));
  const line = mocks.map((m, i) => `${i ? "L" : "M"}${xOf(i).toFixed(1)},${yOf(m.score).toFixed(1)}`).join(" ");
  const area = `${line} L${xOf(mocks.length - 1).toFixed(1)},${BOTTOM} L${xOf(0).toFixed(1)},${BOTTOM} Z`;
  const latest = mocks[mocks.length - 1];
  const first = mocks[0];
  const best = Math.max(...mocks.map((m) => m.score));
  const change = latest.score - first.score;
  const topics = topicTrends(history);

  return (
    <section aria-labelledby="mock-progress-heading" className="mt-10 space-y-3">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="mock-progress-heading" className="text-[15px] font-semibold">
          Your progress
        </h2>
        <p className="text-[14px] tabular-nums text-muted-foreground">
          {change === 0 ? "Same as your first mock" : `${change > 0 ? "+" : "−"}${Math.abs(change)} since your first mock`}
        </p>
      </div>

      <div className="rounded-[22px] bg-secondary p-5">
        <div className="flex items-baseline gap-5 tabular-nums">
          <p>
            <span className="text-[13px] text-muted-foreground">Latest </span>
            <span className="text-[19px] font-semibold">{latest.score}</span>
          </p>
          <p>
            <span className="text-[13px] text-muted-foreground">Best </span>
            <span className="text-[19px] font-semibold">{best}</span>
          </p>
        </div>

        <div className="relative mt-3 text-foreground">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="block h-32 w-full overflow-visible sm:h-36" role="img" aria-label={`Mock scores from ${first.score} to ${latest.score} over ${mocks.length} mocks`}>
            <defs>
              <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="currentColor" stopOpacity={0.22} />
                <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
              {/* The line and fill wipe in from the left (a drawn-on path miscounts its length
                  with non-scaling strokes). */}
              <clipPath id={`${fill}-reveal`}>
                <motion.rect x={-4} y={-8} height={HEIGHT + 16} initial={reduceMotion ? false : { width: 0 }} animate={{ width: WIDTH + 8 }} transition={{ type: "spring", bounce: 0, duration: 0.9 }} />
              </clipPath>
            </defs>
            {/* The Pass mark, for reference. */}
            <line x1={0} x2={WIDTH} y1={yOf(PASS)} y2={yOf(PASS)} stroke="currentColor" strokeOpacity={0.18} strokeWidth={1} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
            <line x1={0} x2={WIDTH} y1={BOTTOM} y2={BOTTOM} stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <g clipPath={`url(#${fill}-reveal)`}>
              <path d={area} fill={`url(#${fill})`} />
              <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>
          {/* Dots and labels as elements over the chart, so they keep their size at any width. */}
          {mocks.map((m, i) => {
            const last = i === mocks.length - 1;
            return (
              <motion.span
                key={m.id}
                aria-hidden="true"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.15 + (i / mocks.length) * 0.6, duration: 0.2 }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                  last ? "size-3 border-secondary bg-foreground" : "size-2 border-foreground bg-secondary",
                )}
                style={{ left: `${(xOf(i) / WIDTH) * 100}%`, top: `${(yOf(m.score) / HEIGHT) * 100}%` }}
              />
            );
          })}
          <span aria-hidden="true" className="absolute right-0 -translate-y-full pb-0.5 text-[11px] text-muted-foreground" style={{ top: `${(yOf(PASS) / HEIGHT) * 100}%` }}>
            Pass
          </span>
        </div>
        <div className="mt-1.5 flex justify-between text-[12px] tabular-nums text-muted-foreground" aria-hidden="true">
          <span>{dateLabel(first.createdAt)}</span>
          <span>{dateLabel(latest.createdAt)}</span>
        </div>
      </div>

      {topics.length > 0 && (
        <div className="space-y-2">
          <p className="px-1 text-[13px] text-muted-foreground">
            By topic · your last {Math.min(TOPIC_WINDOW, history.length)} mocks
          </p>
          <ul className="divide-y divide-border rounded-[22px] bg-secondary px-5">
            {topics.map((t) => (
              <li key={t.topic} className="flex items-center justify-between gap-4 py-3 text-[15px]">
                <span className="min-w-0 truncate">
                  <span className="tabular-nums text-muted-foreground">{t.number}</span> {t.title}
                </span>
                <span className="flex shrink-0 items-center gap-3 tabular-nums">
                  {t.trend === "up" ? (
                    <ArrowUpRight aria-label="Better in your latest mock" className="size-4 text-success" />
                  ) : t.trend === "down" ? (
                    <ArrowDownRight aria-label="Worse in your latest mock" className="size-4 text-destructive" />
                  ) : null}
                  <span className="h-1.5 w-16 overflow-hidden rounded-full bg-control" aria-hidden="true">
                    <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${(t.right / t.total) * 100}%` }} />
                  </span>
                  <span className="w-[4.5rem] whitespace-nowrap text-right font-medium">
                    {t.right} of {t.total}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
