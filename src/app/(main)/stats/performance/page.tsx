"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  Clock,
  Target,
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

const weeklyData = [
  { day: "Mon", accuracy: 72, speed: 3.2, problems: 45 },
  { day: "Tue", accuracy: 78, speed: 2.9, problems: 52 },
  { day: "Wed", accuracy: 85, speed: 2.7, problems: 61 },
  { day: "Thu", accuracy: 82, speed: 2.8, problems: 48 },
  { day: "Fri", accuracy: 91, speed: 2.4, problems: 67 },
  { day: "Sat", accuracy: 88, speed: 2.5, problems: 55 },
  { day: "Sun", accuracy: 94, speed: 2.3, problems: 72 },
];

const monthlyData = [
  { week: "Week 1", accuracy: 75, speed: 3.5, problems: 280 },
  { week: "Week 2", accuracy: 79, speed: 3.1, problems: 320 },
  { week: "Week 3", accuracy: 82, speed: 2.8, problems: 350 },
  { week: "Week 4", accuracy: 87, speed: 2.5, problems: 400 },
];

const yearlyData = [
  { month: "Jan", accuracy: 68, problems: 1200 },
  { month: "Feb", accuracy: 72, problems: 1400 },
  { month: "Mar", accuracy: 75, problems: 1350 },
  { month: "Apr", accuracy: 78, problems: 1600 },
  { month: "May", accuracy: 80, problems: 1450 },
  { month: "Jun", accuracy: 83, problems: 1700 },
  { month: "Jul", accuracy: 85, problems: 1550 },
  { month: "Aug", accuracy: 87, problems: 1800 },
  { month: "Sep", accuracy: 89, problems: 1650 },
  { month: "Oct", accuracy: 91, problems: 1900 },
  { month: "Nov", accuracy: 93, problems: 1750 },
  { month: "Dec", accuracy: 94, problems: 2000 },
];

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

export default function PerformancePage() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-lg font-semibold">Performance Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Detailed breakdown of your performance over time
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
                  <p className="text-xl font-semibold font-mono">84.3%</p>
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
                  <p className="text-xl font-semibold font-mono">2.7s</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Improvement</p>
                  <p className="text-xl font-semibold font-mono">+12%</p>
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
                  <p className="text-xl font-semibold">Sunday</p>
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
              {/* Accuracy Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Accuracy Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <defs>
                          <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[60, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<SimpleTooltip />} />
                        <Area type="monotone" dataKey="accuracy" stroke="currentColor" strokeWidth={2} fill="url(#accuracyGradient)" className="text-foreground" dot={{ r: 3, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
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
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[2, 4]} tickFormatter={(v) => `${v}s`} reversed />
                        <Tooltip content={<SimpleTooltip />} />
                        <Line type="monotone" dataKey="speed" stroke="currentColor" strokeWidth={2} className="text-foreground" dot={{ r: 3, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
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
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip content={<SimpleTooltip />} cursor={{ fill: "hsl(var(--secondary))", opacity: 0.5 }} />
                      <Bar dataKey="problems" fill="currentColor" radius={[4, 4, 0, 0]} className="text-foreground" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Total: <span className="font-mono font-medium text-foreground">400</span></span>
                  <span>Daily avg: <span className="font-mono font-medium text-foreground">57</span></span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <defs>
                        <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[70, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<SimpleTooltip />} />
                      <Area type="monotone" dataKey="accuracy" stroke="currentColor" strokeWidth={2} fill="url(#monthlyGradient)" className="text-foreground" dot={{ r: 4, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="yearly" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Yearly Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={yearlyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <defs>
                        <linearGradient id="yearlyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[60, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<SimpleTooltip />} />
                      <Area type="monotone" dataKey="accuracy" stroke="currentColor" strokeWidth={2} fill="url(#yearlyGradient)" className="text-foreground" dot={{ r: 3, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
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
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <TrendingUp className="w-4 h-4 mt-0.5 text-success" />
                <div>
                  <p className="text-sm font-medium">Accuracy is improving</p>
                  <p className="text-xs text-muted-foreground">Your accuracy has improved by 22% over the past week.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <Clock className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Getting faster</p>
                  <p className="text-xs text-muted-foreground">Average response time dropped from 3.2s to 2.3s this week.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <Calendar className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Peak performance on weekends</p>
                  <p className="text-xs text-muted-foreground">You perform best on Saturday and Sunday with 91% avg accuracy.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

