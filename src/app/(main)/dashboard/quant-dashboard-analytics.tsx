"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip } from "@/components/ui/chart";
import { BrandedEmptyState, MetricTile, SectionLabel } from "@/components/ui/visual-system";
import { buttonVariants } from "@/components/ui/button";

type QuantAnalytics = {
  mastered: number;
  read: number;
  total: number;
  answered: number;
  firstTry: number;
  units: { id: string; number: number; title: string; right: number; total: number }[];
  mocks: {
    count: number;
    history: { score: number; at: string }[];
    latest: { score: number; rating: string } | null;
    best: number | null;
    pass: number;
  };
};

const percent = (right: number, total: number) => (total ? Math.round((right / total) * 100) : null);
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * The quant course in numbers, for Pro accounts that have started it: lessons mastered,
 * questions answered and right first time, mock scores over time, and accuracy by unit. Drawn
 * like the mental math cards above it. Nothing shows on the free plan.
 */
export function QuantDashboardAnalytics() {
  const { data: session } = useSession();
  const pro = Boolean(session?.user?.isPremium);
  const [data, setData] = useState<QuantAnalytics | null>(null);

  useEffect(() => {
    if (!pro) return;
    fetch("/api/quant/analytics", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: QuantAnalytics | null) => body && setData(body))
      .catch(() => {});
  }, [pro]);

  if (!pro || !data || (data.answered === 0 && data.read === 0 && data.mocks.count === 0)) return null;
  const accuracy = percent(data.firstTry, data.answered);
  const chart = data.mocks.history.map((mock) => ({ day: dateLabel(mock.at), score: mock.score }));
  const tried = data.units.filter((unit) => unit.total > 0);
  const weakest = tried.length > 1 ? [...tried].sort((a, b) => a.right / a.total - b.right / b.total)[0] : null;

  return (
    <section aria-labelledby="quant-analytics-heading" className="space-y-3">
      <h2 id="quant-analytics-heading" className="px-1 pt-2 text-[17px] font-semibold tracking-[-0.01em]">
        Quant
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Lessons mastered" value={`${data.mastered}/${data.total}`} detail={`${data.read} read`} />
        <MetricTile label="Questions answered" value={data.answered.toLocaleString()} detail="Practice, drills and review" />
        <MetricTile label="First-try accuracy" value={accuracy === null ? "—" : `${accuracy}%`} detail="Right without the steps" />
        <MetricTile
          label="Latest mock"
          value={data.mocks.latest ? data.mocks.latest.score : "—"}
          detail={data.mocks.latest ? `${data.mocks.latest.rating} · best ${data.mocks.best}` : "No mock yet"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Mock scores */}
        <Card className="flex flex-col lg:col-span-8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <SectionLabel className="mb-1">{data.mocks.count > chart.length ? `Last ${chart.length} mocks` : "Every mock"}</SectionLabel>
                <CardTitle className="text-lg tracking-tight">Mock scores</CardTitle>
              </div>
              <Link href="/quant/mock" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                Mock test →
              </Link>
            </div>
          </CardHeader>
          {/* The chart takes whatever height the units card sets. */}
          <CardContent className="flex flex-1 flex-col">
            <div className="h-[260px] lg:h-auto lg:min-h-[260px] lg:flex-1">
              {chart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 5, right: 36, bottom: 5, left: -20 }}>
                    <defs>
                      <linearGradient id="mockGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="currentColor" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                    <ReferenceLine
                      y={data.mocks.pass}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                      label={{ value: "Pass", position: "right", fill: "var(--muted-foreground)", fontSize: 12 }}
                    />
                    <Tooltip content={<ChartTooltip formatValue={(v) => `${v}`} />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="currentColor"
                      strokeWidth={2}
                      fill="url(#mockGradient)"
                      className="text-foreground"
                      dot={{ r: 3, fill: "var(--background)", stroke: "currentColor", strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: "var(--foreground)", stroke: "var(--background)", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <BrandedEmptyState
                  title="No mocks yet"
                  description="A 20-minute test across the course, scored out of 100."
                  action={
                    <Link href="/quant/mock" className={buttonVariants({ size: "sm" })}>
                      Take a mock
                    </Link>
                  }
                />
              )}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <p className="text-xs text-muted-foreground">
                Mocks: <span className="font-mono font-medium text-foreground">{data.mocks.count}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Best: <span className="font-mono font-medium text-foreground">{data.mocks.best ?? "--"}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Accuracy by unit */}
        <Link href="/quant" className="block lg:col-span-4">
          <Card className="h-full cursor-pointer transition-colors hover:bg-accent">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel className="mb-1">Right first time</SectionLabel>
                  <CardTitle className="text-lg tracking-tight">Units</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Lessons →</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {data.units.map((unit) => {
                  const value = percent(unit.right, unit.total);
                  return (
                    <div key={unit.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate text-muted-foreground">{unit.title}</span>
                        <span className="font-mono font-medium">{value === null ? "--" : `${value}%`}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-background">
                        <div className="h-full rounded-full bg-foreground transition-all duration-300" style={{ width: `${value ?? 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">Weakest</span>
                  <span className="truncate font-semibold">
                    {weakest ? `${weakest.title} ${percent(weakest.right, weakest.total)}%` : "--"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  );
}
