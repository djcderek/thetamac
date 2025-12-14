"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Target,
  Loader2,
  Brain,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
} from "recharts";
import Link from "next/link";

interface WeeklyDataPoint {
  day: string;
  date: string;
  correct: number;
  total: number;
  accuracy: number | null;
  speed: number | null;
}

interface MonthlyDataPoint {
  week: string;
  correct: number;
  total: number;
  accuracy: number | null;
  speed: number | null;
}

interface YearlyDataPoint {
  month: string;
  monthKey: string;
  correct: number;
  total: number;
  accuracy: number | null;
}

interface WeeklySummary {
  totalCorrect: number;
  totalProblems: number;
  average: number;
  avgAccuracy: number;
  avgSpeed: number;
  improvement: number;
  peak: { correct: number; day: string } | null;
  totalAttempts: number;
}

interface MonthlySummary {
  totalCorrect: number;
  totalProblems: number;
  avgAccuracy: number;
  avgSpeed: number;
  totalAttempts: number;
}

interface YearlySummary {
  totalCorrect: number;
  totalProblems: number;
  avgAccuracy: number;
  totalAttempts: number;
}

interface WeeklyPerformance {
  data: WeeklyDataPoint[];
  summary: WeeklySummary;
}

interface MonthlyPerformance {
  data: MonthlyDataPoint[];
  summary: MonthlySummary;
}

interface YearlyPerformance {
  data: YearlyDataPoint[];
  summary: YearlySummary;
}

const SimpleTooltip = ({ 
  active, 
  payload, 
  label,
}: { 
  active?: boolean; 
  payload?: Array<{ value: number; dataKey: string; color: string }>; 
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-md shadow-md px-3 py-2">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-mono">
            <span className="text-muted-foreground">{entry.dataKey}: </span>
            <span className="font-semibold">
              {entry.dataKey === "accuracy" ? `${entry.value}%` : 
               entry.dataKey === "speed" ? `${entry.value}s` : 
               entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const EmptyState = ({ message, submessage }: { message: string; submessage: string }) => (
  <div className="h-full flex items-center justify-center text-muted-foreground">
    <div className="text-center">
      <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
      <p className="text-xs mt-1">{submessage}</p>
    </div>
  </div>
);

export function PerformanceDashboard() {
  const [weeklyData, setWeeklyData] = useState<WeeklyPerformance | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyPerformance | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [weeklyRes, monthlyRes, yearlyRes] = await Promise.all([
          fetch("/api/user/performance?range=weekly"),
          fetch("/api/user/performance?range=monthly"),
          fetch("/api/user/performance?range=yearly"),
        ]);

        if (weeklyRes.ok) {
          const data = await weeklyRes.json();
          setWeeklyData(data);
        }

        if (monthlyRes.ok) {
          const data = await monthlyRes.json();
          setMonthlyData(data);
        }

        if (yearlyRes.ok) {
          const data = await yearlyRes.json();
          setYearlyData(data);
        }
      } catch (error) {
        console.error("Error fetching performance data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasWeeklyData = weeklyData?.data.some((d) => d.total > 0) ?? false;
  const hasMonthlyData = monthlyData?.data.some((d) => d.total > 0) ?? false;
  const hasYearlyData = yearlyData?.data.some((d) => d.total > 0) ?? false;

  // Calculate dynamic domains for charts
  const weeklyMaxCorrect = Math.max(...(weeklyData?.data.map((d) => d.correct) ?? [0]), 10);
  const weeklyMaxSpeed = Math.max(...(weeklyData?.data.map((d) => d.speed ?? 0) ?? [0]), 5);
  const monthlyMaxAccuracy = 100;
  const yearlyMaxAccuracy = 100;

  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-lg font-semibold">Performance Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of your timed mode performance
          </p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Accuracy</p>
                  <p className="text-xl font-semibold font-mono">
                    {weeklyData?.summary.avgAccuracy ?? 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Speed</p>
                  <p className="text-xl font-semibold font-mono">
                    {weeklyData?.summary.avgSpeed ? `${weeklyData.summary.avgSpeed}s` : "--"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  {(weeklyData?.summary.improvement ?? 0) >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Improvement</p>
                  <p className="text-xl font-semibold font-mono">
                    {weeklyData?.summary.improvement !== undefined 
                      ? `${weeklyData.summary.improvement >= 0 ? "+" : ""}${weeklyData.summary.improvement}%`
                      : "--"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Best Day</p>
                  <p className="text-xl font-semibold">
                    {weeklyData?.summary.peak?.day ?? "--"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts */}
        <Tabs defaultValue="weekly" className="space-y-6">
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Correct Answers Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Correct Answers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px]">
                    {hasWeeklyData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weeklyData?.data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <defs>
                            <linearGradient id="correctGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, weeklyMaxCorrect]} />
                          <Tooltip content={<SimpleTooltip />} />
                          <Area type="monotone" dataKey="correct" stroke="currentColor" strokeWidth={2} fill="url(#correctGradient)" className="text-foreground" dot={{ r: 3, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState message="No data yet" submessage="Complete timed training sessions to see your progress" />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Speed Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Response Speed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px]">
                    {hasWeeklyData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyData?.data.map(d => ({ ...d, speed: d.speed ?? 0 }))} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                          <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, weeklyMaxSpeed]} tickFormatter={(v) => `${v}s`} reversed />
                          <Tooltip content={<SimpleTooltip />} />
                          <Line type="monotone" dataKey="speed" stroke="currentColor" strokeWidth={2} className="text-foreground" dot={{ r: 3, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyState message="No data yet" submessage="Complete timed training sessions to see your speed" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Lower is better</p>
                </CardContent>
              </Card>
            </div>

            {/* Problems Solved */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  {hasWeeklyData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData?.data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip content={<SimpleTooltip />} cursor={{ fill: "hsl(var(--secondary))", opacity: 0.5 }} />
                        <Bar dataKey="total" fill="currentColor" radius={[4, 4, 0, 0]} className="text-foreground" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No data yet" submessage="Complete timed training sessions to track your progress" />
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Total: <span className="font-mono font-medium text-foreground">{weeklyData?.summary.totalProblems ?? 0}</span></span>
                  <span>Daily avg: <span className="font-mono font-medium text-foreground">{weeklyData?.summary.totalProblems ? Math.round(weeklyData.summary.totalProblems / 7) : 0}</span></span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Progress (Accuracy)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {hasMonthlyData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData?.data.map(d => ({ ...d, accuracy: d.accuracy ?? 0 }))} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <defs>
                          <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, monthlyMaxAccuracy]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<SimpleTooltip />} />
                        <Area type="monotone" dataKey="accuracy" stroke="currentColor" strokeWidth={2} fill="url(#monthlyGradient)" className="text-foreground" dot={{ r: 4, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} connectNulls />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No data yet" submessage="Complete more training sessions to see monthly trends" />
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Total problems: <span className="font-mono font-medium text-foreground">{monthlyData?.summary.totalProblems ?? 0}</span></span>
                  <span>Avg accuracy: <span className="font-mono font-medium text-foreground">{monthlyData?.summary.avgAccuracy ?? 0}%</span></span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yearly" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Yearly Progress (Accuracy)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {hasYearlyData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={yearlyData?.data.map(d => ({ ...d, accuracy: d.accuracy ?? 0 }))} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <defs>
                          <linearGradient id="yearlyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, yearlyMaxAccuracy]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<SimpleTooltip />} />
                        <Area type="monotone" dataKey="accuracy" stroke="currentColor" strokeWidth={2} fill="url(#yearlyGradient)" className="text-foreground" dot={{ r: 3, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} connectNulls />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No data yet" submessage="Complete more training sessions to see yearly trends" />
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Total problems: <span className="font-mono font-medium text-foreground">{yearlyData?.summary.totalProblems ?? 0}</span></span>
                  <span>Avg accuracy: <span className="font-mono font-medium text-foreground">{yearlyData?.summary.avgAccuracy ?? 0}%</span></span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Insights */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyData && weeklyData.summary.totalProblems > 0 ? (
                <>
                  {weeklyData.summary.improvement > 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <TrendingUp className="w-4 h-4 mt-0.5 text-success" />
                      <div>
                        <p className="text-sm font-medium">Performance is improving</p>
                        <p className="text-xs text-muted-foreground">
                          Your correct answers increased by {weeklyData.summary.improvement}% from the first half to second half of this week.
                        </p>
                      </div>
                    </div>
                  )}
                  {weeklyData.summary.improvement < 0 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <TrendingDown className="w-4 h-4 mt-0.5 text-destructive" />
                      <div>
                        <p className="text-sm font-medium">Keep practicing!</p>
                        <p className="text-xs text-muted-foreground">
                          Your performance dipped this week. Regular practice helps maintain your skills.
                        </p>
                      </div>
                    </div>
                  )}
                  {weeklyData.summary.avgSpeed > 0 && weeklyData.summary.avgSpeed < 3 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Clock className="w-4 h-4 mt-0.5 text-success" />
                      <div>
                        <p className="text-sm font-medium">Great response time!</p>
                        <p className="text-xs text-muted-foreground">
                          Your average speed of {weeklyData.summary.avgSpeed}s is excellent. Keep it up!
                        </p>
                      </div>
                    </div>
                  )}
                  {weeklyData.summary.avgSpeed >= 3 && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Clock className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Room for speed improvement</p>
                        <p className="text-xs text-muted-foreground">
                          Your average speed is {weeklyData.summary.avgSpeed}s. Try to aim for under 2 seconds per problem.
                        </p>
                      </div>
                    </div>
                  )}
                  {weeklyData.summary.peak && (
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                      <Calendar className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Peak performance on {weeklyData.summary.peak.day}</p>
                        <p className="text-xs text-muted-foreground">
                          You got {weeklyData.summary.peak.correct} correct answers on {weeklyData.summary.peak.day}. Great work!
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                  <Brain className="w-4 h-4 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Start training to see insights</p>
                    <p className="text-xs text-muted-foreground">
                      Complete some timed training sessions to generate personalized insights about your performance.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
