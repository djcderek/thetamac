"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Zap,
  Loader2,
  LogIn,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import Link from "next/link";

interface SkillOverview {
  name: string;
  operation: string;
  accuracy: number;
  speed: number;
  problems: number;
  trend: "up" | "down" | "same";
}

interface WeeklyData {
  week: string;
  accuracy: number | null;
}

interface NumberRangeData {
  range: string;
  accuracy: number;
  problems: number;
}

interface DigitLengthData {
  type: string;
  accuracy: number;
  speed: number;
  count: number;
}

interface TroubleSpot {
  problem: string;
  yourAnswer: string;
  correct: string;
  times: number;
}

interface Recommendation {
  type: "focus" | "speed" | "praise";
  skill: string;
  message: string;
}

interface RadarData {
  skill: string;
  value: number;
}

interface SkillsData {
  skillsOverview: SkillOverview[];
  weeklyProgress: {
    addition: WeeklyData[];
    subtraction: WeeklyData[];
    multiplication: WeeklyData[];
    division: WeeklyData[];
  };
  numberRangeData: NumberRangeData[];
  digitLengthData: DigitLengthData[];
  troubleSpots: TroubleSpot[];
  recommendations: Recommendation[];
  radarData: RadarData[];
}

const SimpleTooltip = ({ 
  active, 
  payload, 
  label,
}: { 
  active?: boolean; 
  payload?: Array<{ value: number; dataKey: string }>; 
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-md shadow-md px-3 py-2">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-mono">
            <span className="font-semibold">{entry.value}%</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function SkillCard({ skill }: { skill: SkillOverview }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold">{skill.name}</h3>
            <p className="text-xs text-muted-foreground">{skill.problems.toLocaleString()} problems solved</p>
          </div>
          {skill.trend === "up" && <TrendingUp className="w-4 h-4 text-success" />}
          {skill.trend === "down" && <TrendingDown className="w-4 h-4 text-destructive" />}
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Accuracy</span>
              <span className="font-mono font-medium">{skill.accuracy}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all duration-500"
                style={{ width: `${skill.accuracy}%` }}
              />
            </div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Speed</span>
            <span className="font-mono font-medium">{skill.speed}s</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="col-span-full">
      <CardContent className="py-12 text-center">
        <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start training to see your skills breakdown and performance analytics.
        </p>
        <Link href="/training">
          <Button>
            <Zap className="w-4 h-4 mr-2" />
            Start Training
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function SkillsPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<SkillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPerformanceScore, setShowPerformanceScore] = useState(false);

  useEffect(() => {
    async function fetchSkillsData() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/user/skills");
        if (!response.ok) {
          throw new Error("Failed to fetch skills data");
        }
        const skillsData = await response.json();
        setData(skillsData);
      } catch (err) {
        console.error("Error fetching skills data:", err);
        setError("Failed to load skills data");
      } finally {
        setLoading(false);
      }
    }

    if (status !== "loading") {
      fetchSkillsData();
    }
  }, [session, status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-border">
          <div className="px-4 md:px-6 py-4">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-lg font-semibold">Skills Breakdown</h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <LogIn className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to view your detailed skills breakdown and performance analytics.
              </p>
              <Link href="/auth/signin">
                <Button>Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-border">
          <div className="px-4 md:px-6 py-4">
            <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-lg font-semibold">Skills Breakdown</h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalProblems = data?.skillsOverview.reduce((sum, s) => sum + s.problems, 0) || 0;
  const hasData = totalProblems > 0;

  // Calculate trend text for each operation
  const getTrendText = (weeklyData: WeeklyData[]) => {
    const validWeeks = weeklyData.filter(w => w.accuracy !== null);
    if (validWeeks.length < 2) return null;
    
    const firstValid = validWeeks[0].accuracy!;
    const lastValid = validWeeks[validWeeks.length - 1].accuracy!;
    const change = lastValid - firstValid;
    
    return {
      change,
      text: change >= 0 ? `+${change}%` : `${change}%`,
      isPositive: change >= 0,
    };
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-lg font-semibold">Skills Breakdown</h1>
          <p className="text-sm text-muted-foreground">
            Detailed analysis of your skills by operation type
          </p>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Skill Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data?.skillsOverview.map((skill) => (
                <SkillCard key={skill.name} skill={skill} />
              ))}
            </div>

            {/* Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Radar Chart with Toggle */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Skills Overview</CardTitle>
                    <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg">
                      <button
                        onClick={() => setShowPerformanceScore(false)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          !showPerformanceScore 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Accuracy
                      </button>
                      <button
                        onClick={() => setShowPerformanceScore(true)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          showPerformanceScore 
                            ? "bg-background text-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Performance
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {!showPerformanceScore ? (
                        <RadarChart data={data?.radarData || []}>
                          <PolarGrid 
                            stroke="currentColor"
                            className="text-border"
                            gridType="polygon"
                          />
                          <PolarAngleAxis 
                            dataKey="skill" 
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-popover border border-border rounded-md shadow-md px-3 py-2">
                                    <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.skill}</p>
                                    <p className="text-sm font-mono font-semibold">{payload[0].value}%</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Radar
                            name="Accuracy"
                            dataKey="value"
                            stroke="hsl(var(--foreground))"
                            fill="hsl(var(--foreground))"
                            fillOpacity={0.15}
                            strokeWidth={2.5}
                            dot={{ 
                              r: 4, 
                              fill: "hsl(var(--background))", 
                              stroke: "hsl(var(--foreground))", 
                              strokeWidth: 2 
                            }}
                          />
                        </RadarChart>
                      ) : (
                        <RadarChart data={data?.skillsOverview.map((skill) => {
                          const speedScore = Math.max(0, Math.min(100, ((5 - skill.speed) / 4.5) * 100));
                          const weightedScore = skill.problems > 0 
                            ? Math.round(skill.accuracy * 0.7 + speedScore * 0.3)
                            : 0;
                          return {
                            skill: skill.name,
                            score: weightedScore,
                            accuracy: skill.accuracy,
                            speed: Math.round(speedScore),
                          };
                        }) || []}>
                          <PolarGrid 
                            stroke="currentColor"
                            className="text-border"
                            gridType="polygon"
                          />
                          <PolarAngleAxis 
                            dataKey="skill" 
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                          />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                  <div className="bg-popover border border-border rounded-md shadow-md px-3 py-2">
                                    <p className="text-xs font-medium mb-1">{d.skill}</p>
                                    <p className="text-sm font-mono font-semibold">{d.score}/100</p>
                                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                      <p>Accuracy: {d.accuracy}%</p>
                                      <p>Speed: {d.speed}%</p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke="hsl(var(--foreground))"
                            fill="hsl(var(--foreground))"
                            fillOpacity={0.15}
                            strokeWidth={2.5}
                            dot={{ 
                              r: 4, 
                              fill: "hsl(var(--background))", 
                              stroke: "hsl(var(--foreground))", 
                              strokeWidth: 2 
                            }}
                          />
                        </RadarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  {showPerformanceScore && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      70% accuracy + 30% speed (0.5s=100%, 5s=0%)
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Comparison Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Accuracy Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data?.skillsOverview || []} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={90} />
                        <Tooltip content={<SimpleTooltip />} cursor={{ fill: "hsl(var(--secondary))", opacity: 0.5 }} />
                        <Bar dataKey="accuracy" fill="currentColor" radius={[0, 4, 4, 0]} className="text-foreground" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trends by Skill */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Progress Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="addition">
                  <TabsList className="mb-4">
                    <TabsTrigger value="addition">Addition</TabsTrigger>
                    <TabsTrigger value="subtraction">Subtraction</TabsTrigger>
                    <TabsTrigger value="multiplication">Multiplication</TabsTrigger>
                    <TabsTrigger value="division">Division</TabsTrigger>
                  </TabsList>

                  {(["addition", "subtraction", "multiplication", "division"] as const).map((op) => {
                    const weeklyData = data?.weeklyProgress[op] || [];
                    const validData = weeklyData.filter(w => w.accuracy !== null);
                    const trend = getTrendText(weeklyData);
                    
                    return (
                      <TabsContent key={op} value={op}>
                        {validData.length === 0 ? (
                          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                            No data for this operation in the last 4 weeks
                          </div>
                        ) : (
                          <>
                            <div className="h-[200px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weeklyData}>
                                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                  <Tooltip content={<SimpleTooltip />} />
                                  <Line 
                                    type="monotone" 
                                    dataKey="accuracy" 
                                    stroke="currentColor" 
                                    strokeWidth={2} 
                                    className="text-foreground" 
                                    dot={{ r: 4, fill: "hsl(var(--background))", stroke: "currentColor", strokeWidth: 2 }}
                                    connectNulls
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            {trend && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                {trend.isPositive ? (
                                  <TrendingUp className="w-3 h-3 text-success" />
                                ) : (
                                  <TrendingDown className="w-3 h-3 text-destructive" />
                                )}
                                {trend.text} over the last 4 weeks
                              </p>
                            )}
                          </>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>

            {/* Detailed Breakdown Section */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Detailed Breakdown</h2>
            </div>

            {/* Digit Length Performance */}
            {data?.digitLengthData && data.digitLengthData.some(d => d.count > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Performance by Digit Length</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data.digitLengthData.filter(d => d.count > 0).map((item) => (
                      <div key={item.type} className="p-4 rounded-lg border border-border">
                        <p className="text-sm font-medium mb-3">{item.type}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Accuracy</span>
                            <span className="font-mono font-medium">{item.accuracy}%</span>
                          </div>
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground rounded-full transition-all duration-500"
                              style={{ width: `${item.accuracy}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground pt-1">
                            <span>{item.speed}s avg</span>
                            <span>{item.count.toLocaleString()} solved</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Number Range Performance */}
            {data?.numberRangeData && data.numberRangeData.some(d => d.problems > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Performance by Number Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.numberRangeData.filter(d => d.problems > 0)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                        <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<SimpleTooltip />} cursor={{ fill: "hsl(var(--secondary))", opacity: 0.5 }} />
                        <Bar dataKey="accuracy" fill="currentColor" radius={[4, 4, 0, 0]} className="text-foreground" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4 text-xs text-muted-foreground">
                    {data.numberRangeData.filter(d => d.problems > 0).map((item) => (
                      <div key={item.range} className="text-center">
                        <span className="font-mono text-foreground">{item.problems.toLocaleString()}</span>
                        <span className="block">{item.range}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trouble Spots */}
            {data?.troubleSpots && data.troubleSpots.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Common Mistakes</CardTitle>
                    <p className="text-xs text-muted-foreground">Problems you miss most often</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[400px]">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Problem</th>
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Your Answer</th>
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground">Correct</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground">Times Missed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.troubleSpots.map((item, i) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="py-3 font-mono font-medium">{item.problem}</td>
                            <td className="py-3 font-mono text-destructive">{item.yourAnswer}</td>
                            <td className="py-3 font-mono text-success">{item.correct}</td>
                            <td className="py-3 text-right text-sm text-muted-foreground">{item.times}×</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Tip: Focus on these specific problems during your next practice session.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {data?.recommendations && data.recommendations.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                        {rec.type === "focus" && <Target className="w-4 h-4 mt-0.5 text-destructive" />}
                        {rec.type === "speed" && <Clock className="w-4 h-4 mt-0.5" />}
                        {rec.type === "praise" && <TrendingUp className="w-4 h-4 mt-0.5 text-success" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {rec.type === "focus" && `Focus on ${rec.skill}`}
                            {rec.type === "speed" && `Improve ${rec.skill} Speed`}
                            {rec.type === "praise" && `Great progress on ${rec.skill}!`}
                          </p>
                          <p className="text-xs text-muted-foreground">{rec.message}</p>
                          {rec.type === "focus" && (
                            <Link href="/training">
                              <Button size="sm" className="mt-2">
                                <Zap className="w-3 h-3 mr-1" />
                                Practice {rec.skill}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
