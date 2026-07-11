"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain,
  Flame,
  Target,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip,
} from "recharts";
import Link from "next/link";
import { BrandedEmptyState, MetricTile, PageHeader, SectionLabel } from "@/components/ui/visual-system";

interface UserStats {
  totalProblems: number;
  totalCorrect: number;
  accuracy: number;
  avgTime: number;
  currentStreak: number;
  longestStreak: number;
  rating: number;
  skills: Array<{ name: string; value: number; total: number }>;
  weakestSkill: { name: string; value: number; total: number } | null;
}

interface PerformanceData {
  data: Array<{ day: string; date: string; correct: number; total: number }>;
  summary: { totalCorrect: number; average: number; peak: { correct: number; day: string } | null; totalAttempts: number };
}

interface ActivityData {
  data: Array<{ day: string; date: string; problems: number }>;
  summary: { total: number; dailyAverage: number };
}

// Simple tooltip that matches the page aesthetic
const SimpleTooltip = ({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  suffix?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-md shadow-md px-3 py-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold font-mono">
          {payload[0].value}
          {suffix}
        </p>
      </div>
    );
  }
  return null;
};

export function DashboardClient() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, performanceRes, activityRes] = await Promise.all([
          fetch("/api/user/stats"),
          fetch("/api/user/performance"),
          fetch("/api/user/activity"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        if (performanceRes.ok) {
          const performanceData = await performanceRes.json();
          setPerformance(performanceData);
        }

        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivity(activityData);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
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

  // Fallback data for charts when no data exists
  const performanceData = performance?.data || [];
  const activityData = activity?.data || [];
  const skillsData = stats?.skills || [
    { name: "Addition", value: 0, total: 0 },
    { name: "Subtraction", value: 0, total: 0 },
    { name: "Multiplication", value: 0, total: 0 },
    { name: "Division", value: 0, total: 0 },
  ];

  const hasPerformanceData = performanceData.some((d) => d.correct > 0);
  const hasActivityData = activityData.some((d) => d.problems > 0);
  const hasSkillsData = skillsData.some((s) => s.total > 0);
  const overallAccuracy = hasSkillsData
    ? Math.round(
        (skillsData
          .filter((s) => s.total > 0)
          .reduce((a, b) => a + b.value, 0) /
          (skillsData.filter((s) => s.total > 0).length || 1)) *
          1
      )
    : null;

  return (
    <div className="min-h-screen">
      <PageHeader title="Dashboard" description="Track your mental math progress and find the next skill worth improving." />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Problems solved"
            value={(stats?.totalProblems || 0).toLocaleString()}
            detail="All recorded training attempts"
          />
          <MetricTile
            label="Current streak"
            value={`${stats?.currentStreak || 0} ${stats?.currentStreak === 1 ? "day" : "days"}`}
            detail={<span className="inline-flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-warning" />Best: {stats?.longestStreak || 0} days</span>}
          />
          <MetricTile
            label="Accuracy"
            value={`${stats?.accuracy || 0}%`}
            detail="Across every operation"
          />
          <MetricTile
            label="Average speed"
            value={stats?.avgTime ? `${stats.avgTime}s` : "—"}
            detail="Average response time"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Performance Chart */}
          <Link href="/stats/performance" className="lg:col-span-8 block">
            <Card className="h-full transition-all hover:border-brand/35 hover:shadow-md cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <SectionLabel className="mb-1 text-brand">Last 7 days</SectionLabel>
                    <CardTitle className="text-lg tracking-tight">Performance</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">Correct answers (Timed Mode) →</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[240px]">
                  {hasPerformanceData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={performanceData}
                        margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
                      >
                        <defs>
                          <linearGradient id="correctGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="currentColor" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="day"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 'auto']}
                        />
                        <Tooltip content={<SimpleTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="correct"
                          stroke="currentColor"
                          strokeWidth={2}
                          fill="url(#correctGradient)"
                          className="text-brand"
                          dot={{ r: 3, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }}
                          activeDot={{ r: 5, fill: "hsl(var(--foreground))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <BrandedEmptyState title="No performance data yet" description="Start a timed training session to see your progress take shape." />
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Total:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {performance?.summary.totalCorrect || 0}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Best day:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {performance?.summary.peak
                        ? `${performance.summary.peak.correct} (${performance.summary.peak.day})`
                        : "--"}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Skills */}
          <Link href="/stats/skills" className="lg:col-span-4 block">
            <Card className="h-full transition-all hover:border-brand/35 hover:shadow-md cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <SectionLabel className="mb-1 text-brand">Accuracy</SectionLabel>
                    <CardTitle className="text-lg tracking-tight">Skills</CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground">Accuracy by type →</p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {skillsData.map((skill) => (
                    <div key={skill.name} className="space-y-2 group cursor-default">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                          {skill.name}
                        </span>
                        <span className="font-medium font-mono">
                          {skill.total > 0 ? `${skill.value}%` : "--"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all duration-300"
                          style={{ width: `${skill.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Overall accuracy</span>
                    <span className="font-mono font-semibold">
                      {overallAccuracy !== null ? `${overallAccuracy}%` : "--"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Weekly Activity */}
          <Card className="lg:col-span-5 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel className="mb-1 text-brand">Rhythm</SectionLabel>
                  <CardTitle className="text-lg tracking-tight">This week</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Problems solved</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[160px]">
                {hasActivityData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} barGap={4}>
                      <XAxis
                        dataKey="day"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={<SimpleTooltip />}
                        cursor={{ fill: "hsl(var(--secondary))", opacity: 0.5 }}
                      />
                      <Bar
                        dataKey="problems"
                        fill="currentColor"
                        radius={[4, 4, 0, 0]}
                        className="text-brand"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <BrandedEmptyState title="No activity yet" description="Complete a few problems to begin your weekly rhythm." />
                )}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Total:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {activity?.summary.total || 0}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Daily avg:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {activity?.summary.dailyAverage || 0}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-7 flex flex-col overflow-hidden bg-foreground text-background border-foreground">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <SectionLabel className="mb-1 text-brand">Keep moving</SectionLabel>
                  <CardTitle className="text-lg tracking-tight">Quick start</CardTitle>
                </div>
                <p className="text-xs text-background/60">Jump into action</p>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                <Link href="/" className="block">
                  <div className="h-full p-4 rounded-[3px] border border-background/20 hover:border-brand hover:bg-background/5 transition-colors cursor-pointer group flex flex-col">
                    <Brain className="w-5 h-5 mb-3 text-brand" />
                    <p className="font-medium text-sm">Practice</p>
                    <p className="text-xs text-background/60 mt-1">Start a training session</p>
                  </div>
                </Link>
                <Link href="/multiplayer" className="block">
                  <div className="h-full p-4 rounded-[3px] border border-background/20 hover:border-brand hover:bg-background/5 transition-colors cursor-pointer group flex flex-col">
                    <Swords className="w-5 h-5 mb-3 text-brand" />
                    <p className="font-medium text-sm">1v1 Match</p>
                    <p className="text-xs text-background/60 mt-1">Challenge a player</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggestions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Weak Point Training - shows when user has a weak skill */}
              {stats?.weakestSkill && stats.weakestSkill.total > 0 && stats.weakestSkill.value < 90 && (
                <Link href="/training/weak-points" className="block">
                  <div className="flex items-center justify-between py-2 group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          Target Your Weak Spots
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Your {stats.weakestSkill.name.toLowerCase()} is at {stats.weakestSkill.value}%. Get personalized practice.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )}
              {stats?.weakestSkill && stats.weakestSkill.total > 0 ? (
                <Link href="/" className="block">
                  <div className="flex items-center justify-between py-2 group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <Flame className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Focus on {stats.weakestSkill.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Practice {stats.weakestSkill.name.toLowerCase()} to improve from {stats.weakestSkill.value}%.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ) : (
                <Link href="/" className="block">
                  <div className="flex items-center justify-between py-2 group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <Brain className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Start Practicing</p>
                        <p className="text-xs text-muted-foreground">
                          Begin your mental math journey with a training session.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )}
              {stats && stats.avgTime > 2 && (
                <Link href="/" className="block">
                  <div className="flex items-center justify-between py-2 group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Speed Training</p>
                        <p className="text-xs text-muted-foreground">
                          Your avg. time is {stats.avgTime}s. Aim for sub-2 second responses.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Swords(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" x2="19" y1="19" y2="13" />
      <line x1="16" x2="20" y1="16" y2="20" />
      <line x1="19" x2="21" y1="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" x2="9" y1="14" y2="18" />
      <line x1="7" x2="4" y1="17" y2="20" />
      <line x1="3" x2="5" y1="19" y2="21" />
    </svg>
  );
}
