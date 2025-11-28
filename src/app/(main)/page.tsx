"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Flame,
  Target,
  TrendingUp,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
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

const performanceData = [
  { day: "Mon", score: 72 },
  { day: "Tue", score: 78 },
  { day: "Wed", score: 85 },
  { day: "Thu", score: 82 },
  { day: "Fri", score: 91 },
  { day: "Sat", score: 88 },
  { day: "Sun", score: 94 },
];

const weeklyActivity = [
  { day: "M", problems: 45 },
  { day: "T", problems: 52 },
  { day: "W", problems: 61 },
  { day: "T", problems: 48 },
  { day: "F", problems: 67 },
  { day: "S", problems: 55 },
  { day: "S", problems: 72 },
];

const skillsData = [
  { name: "Addition", value: 92 },
  { name: "Subtraction", value: 87 },
  { name: "Multiplication", value: 78 },
  { name: "Division", value: 65 },
];

// Simple tooltip that matches the page aesthetic
const SimpleTooltip = ({ 
  active, 
  payload, 
  label,
  suffix = ""
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
        <p className="text-sm font-semibold font-mono">{payload[0].value}{suffix}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Track your mental math progress
          </p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Problems Solved</p>
                  <p className="text-2xl font-semibold mt-1">12,847</p>
                </div>
                <div className="flex items-center text-sm text-success">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  12%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-semibold mt-1">156 days</p>
                </div>
                <Flame className="w-5 h-5 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-semibold mt-1">98.2%</p>
                </div>
                <div className="flex items-center text-sm text-success">
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  2.1%
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Speed</p>
                  <p className="text-2xl font-semibold mt-1">2.4s</p>
                </div>
                <div className="flex items-center text-sm text-success">
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                  0.3s
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Performance Chart */}
          <Link href="/stats/performance" className="lg:col-span-8 block">
            <Card className="h-full hover:bg-secondary/30 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <p className="text-xs text-muted-foreground">Accuracy this week →</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
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
                      domain={[60, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={<SimpleTooltip suffix="%" />} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="currentColor"
                      strokeWidth={2}
                      fill="url(#scoreGradient)"
                      className="text-foreground"
                      dot={{ r: 3, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: "hsl(var(--foreground))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Avg: <span className="font-mono font-medium text-foreground">84%</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Peak: <span className="font-mono font-medium text-foreground">94%</span> (Sun)
                </p>
              </div>
            </CardContent>
          </Card>
          </Link>

          {/* Skills */}
          <Link href="/stats/skills" className="lg:col-span-4 block">
            <Card className="h-full hover:bg-secondary/30 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Skills</CardTitle>
                <p className="text-xs text-muted-foreground">Accuracy by type →</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skillsData.map((skill) => (
                  <div key={skill.name} className="space-y-2 group cursor-default">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">{skill.name}</span>
                      <span className="font-medium font-mono">{skill.value}%</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground rounded-full transition-all duration-300"
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
                    {Math.round(skillsData.reduce((a, b) => a + b.value, 0) / skillsData.length)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          </Link>

          {/* Weekly Activity */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <p className="text-xs text-muted-foreground">Problems solved</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyActivity} barGap={4}>
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
                      className="text-foreground"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Total: <span className="font-mono font-medium text-foreground">{weeklyActivity.reduce((a, b) => a + b.problems, 0)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Daily avg: <span className="font-mono font-medium text-foreground">{Math.round(weeklyActivity.reduce((a, b) => a + b.problems, 0) / 7)}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-7 flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Quick Start</CardTitle>
                <p className="text-xs text-muted-foreground">Jump into action</p>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <Link href="/training" className="block">
                  <div className="h-full p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer group flex flex-col">
                    <Brain className="w-5 h-5 mb-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <p className="font-medium text-sm">Practice</p>
                    <p className="text-xs text-muted-foreground mt-1">Start a training session</p>
                  </div>
                </Link>
                <Link href="/training" className="block">
                  <div className="h-full p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer group flex flex-col">
                    <Target className="w-5 h-5 mb-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <p className="font-medium text-sm">Daily Challenge</p>
                    <p className="text-xs text-muted-foreground mt-1">Complete for bonus XP</p>
                  </div>
                </Link>
                <Link href="/multiplayer" className="block">
                  <div className="h-full p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors cursor-pointer group flex flex-col">
                    <Swords className="w-5 h-5 mb-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <p className="font-medium text-sm">1v1 Match</p>
                    <p className="text-xs text-muted-foreground mt-1">Challenge a player</p>
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
              <div className="flex items-center justify-between py-2 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Target className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Focus on Division</p>
                    <p className="text-xs text-muted-foreground">Your division accuracy is 65%. Try the Division module.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex items-center justify-between py-2 group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Speed Training</p>
                    <p className="text-xs text-muted-foreground">Your avg. time is 2.4s. Aim for sub-2 second responses.</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
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
