"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChartTooltip } from "@/components/ui/chart";
import { QuantReviewRow, WeekDots, compareToBaseline, describeDaily } from "@/components/training/today-card";
import { getUpgradeUrl } from "@/lib/upgrade";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import { captureAnalyticsEvent } from "@/lib/analytics-client";
import type { DailySummary } from "@/components/training/training-types";

// Day numbers are days since the epoch for the player's local date.
function dayLabel(day: number, format: Intl.DateTimeFormatOptions) {
  return new Date(day * 86_400_000).toLocaleDateString(undefined, { ...format, timeZone: "UTC" });
}

/**
 * Today on the dashboard: the streak and the week, what today's session holds (or that it's
 * done), and, for Pro, average time across recent daily sessions.
 */
export function TodayDashboardCard({ daily }: { daily: DailySummary }) {
  const { locked, doneToday, streak, week, counts, history, trend, quantDue } = daily;
  const parts = describeDaily(counts);
  const comparison = trend ? compareToBaseline(trend.latestSeconds, trend.baselineSeconds) : null;
  const chart = history.map((session) => ({
    day: dayLabel(session.day, { weekday: "short" }),
    date: dayLabel(session.day, { month: "short", day: "numeric" }),
    seconds: session.averageSeconds,
  }));

  let status: string;
  if (locked) {
    status = parts ? `Yours would have ${parts.replace(/ · /g, ", ")}.` : "Built each day from your misses, lessons and slow spots.";
  } else if (doneToday) {
    status = "Done for today. Come back tomorrow to keep it going.";
  } else {
    status = parts ? `Ready: ${parts}, plus a mix.` : "Ready: a 20-problem mix to start.";
  }

  const action = locked ? (
    <Link
      href={getUpgradeUrl({ feature: "daily", source: "dashboard_today" })}
      onClick={() =>
        captureAnalyticsEvent(ANALYTICS_EVENTS.upgradeCtaClicked, {
          feature: "daily",
          surface: "dashboard",
          action: "open_pricing",
          daily_review_count: counts.review,
          daily_weak_count: counts.weak,
        })
      }
      className={cn(buttonVariants({ size: "sm" }), "min-h-10")}
    >
      Unlock Today
    </Link>
  ) : (
    <Link
      href="/?daily=1"
      className={cn(buttonVariants({ variant: doneToday ? "secondary" : "default", size: "sm" }), "min-h-10")}
    >
      {doneToday ? "Go again" : "Start today"}
    </Link>
  );

  return (
    <section
      aria-labelledby="dashboard-today-heading"
      className={cn(
        "grid gap-6 rounded-[26px] bg-secondary p-5 sm:p-6",
        !locked && "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="dashboard-today-heading" className="flex items-center gap-1.5 text-lg font-semibold tracking-tight">
              Today
              {locked && <span className="rounded-full bg-background px-1.5 text-[11px] font-semibold leading-4">Pro</span>}
            </h2>
            <p className="mt-0.5 text-[15px] leading-6 text-muted-foreground">{status}</p>
          </div>
          {!locked && (
            <p className="flex shrink-0 items-center gap-1 text-[15px] font-semibold tabular-nums">
              <Flame aria-hidden="true" className={cn("h-4 w-4", streak > 0 ? "text-brand" : "text-muted-foreground")} />
              {streak} {streak === 1 ? "day" : "days"}
            </p>
          )}
        </div>
        {quantDue > 0 && <QuantReviewRow count={quantDue} />}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-4">
          {!locked && <WeekDots week={week} />}
          {action}
        </div>
      </div>

      {!locked && (
        <div className="flex min-w-0 flex-col rounded-2xl bg-background p-4">
          <p className="text-[13px] text-muted-foreground">Average time per problem</p>
          <p className="text-[17px] font-semibold tracking-tight">
            {comparison ?? (trend ? "About the same as your first days" : chart.length ? `${chart.at(-1)!.seconds.toFixed(1)}s last time` : "No sessions yet")}
          </p>
          <div className="mt-2 h-[96px]">
            {chart.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="todaySpeedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="currentColor" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" hide />
                  <YAxis hide domain={[0, "auto"]} />
                  <Tooltip
                    content={(props) => (
                      <ChartTooltip
                        active={props.active}
                        label={props.payload?.[0]?.payload?.date}
                        payload={props.payload?.map((item) => ({ value: Number(item.value) }))}
                        formatValue={(value) => `${Number(value).toFixed(1)}s`}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="seconds"
                    stroke="currentColor"
                    strokeWidth={2}
                    fill="url(#todaySpeedGradient)"
                    className="text-foreground"
                    dot={false}
                    activeDot={{ r: 4, fill: "var(--foreground)", stroke: "var(--background)", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="pt-6 text-[13px] text-muted-foreground">Your speed shows here after a couple of days.</p>
            )}
          </div>
          {chart.length >= 2 && <p className="mt-1 text-[12px] text-muted-foreground">Lower is faster · last {chart.length} sessions</p>}
        </div>
      )}
    </section>
  );
}
