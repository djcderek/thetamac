"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChartTooltip, ChartTooltipFrame } from "@/components/ui/chart";
import { BrandedEmptyState, PageHeader, SectionLabel } from "@/components/ui/visual-system";
import { heatClass, speedHeatClass } from "@/lib/heat";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Zap,
  Loader2,
  Grid3X3,
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

// Matrix cell data for a number combination
interface MatrixCell {
  attempts: number;
  correct: number;
  accuracy: number | null; // null if no attempts
  avgTime: number | null;
}

// 16x16 matrix for numbers 0-15
type CombinationMatrix = MatrixCell[][];

interface MatrixWithStats {
  matrix: CombinationMatrix;
  totalProblems: number;
  problemsInRange: number;
}

interface CombinationMatrices {
  addition: MatrixWithStats;
  subtraction: MatrixWithStats;
  multiplication: MatrixWithStats;
  division: MatrixWithStats;
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
  combinationMatrices: CombinationMatrices;
  matrixMaxNumber: number;
}

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
    <BrandedEmptyState
      title="No Data Yet"
      description="Start training to see your skills breakdown and performance analytics."
      action={
        <Link href="/">
          <Button>
            <Zap className="w-4 h-4 mr-2" />
            Start Training
          </Button>
        </Link>
      }
    />
  );
}

function NumberCombinationMatrix({ 
  matrix, 
  operation,
  operationSymbol,
  totalProblems,
  problemsInRange,
  maxNumber,
}: { 
  matrix: CombinationMatrix; 
  operation: string;
  operationSymbol: string;
  totalProblems: number;
  problemsInRange: number;
  maxNumber: number;
}) {
  const [viewMode, setViewMode] = useState<"accuracy" | "speed">("accuracy");
  const numbers = Array.from({ length: maxNumber + 1 }, (_, i) => i);
  
  // Check if there's any data in the matrix
  const hasAnyData = matrix.some(row => row.some(cell => cell.attempts > 0));
  const coveragePercent = totalProblems > 0 ? Math.round((problemsInRange / totalProblems) * 100) : 0;
  const problemsOutOfRange = totalProblems - problemsInRange;
  
  if (!hasAnyData) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Grid3X3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
        {totalProblems > 0 ? (
          <>
            <p className="text-sm">You&apos;ve done <span className="font-semibold text-foreground">{totalProblems}</span> {operation.toLowerCase()} problems,</p>
            <p className="text-sm">but none with both numbers between 0-{maxNumber}.</p>
            <p className="text-xs mt-2 text-muted-foreground/70">
              Try increasing the matrix size with the slider above, or practice with smaller numbers.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm">No {operation.toLowerCase()} problems attempted yet.</p>
            <p className="text-xs mt-1">Start practicing to see your performance matrix!</p>
          </>
        )}
      </div>
    );
  }

  // Calculate cell size based on matrix size
  const getCellSize = () => {
    if (maxNumber <= 15) return { size: "w-7 h-7", font: "text-[9px]", header: "text-[10px]" };
    if (maxNumber <= 20) return { size: "w-6 h-6", font: "text-[8px]", header: "text-[9px]" };
    if (maxNumber <= 30) return { size: "w-5 h-5", font: "text-[7px]", header: "text-[8px]" };
    return { size: "w-4 h-4", font: "text-[6px]", header: "text-[7px]" };
  };
  
  const cellStyle = getCellSize();
  const showValues = maxNumber <= 20; // Only show values in cells for smaller matrices

  return (
    <div className="space-y-4">
      {/* Coverage info banner */}
      {problemsOutOfRange > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-2">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              <span className="font-mono font-semibold text-foreground">{problemsInRange}</span> of{" "}
              <span className="font-mono font-semibold text-foreground">{totalProblems}</span> problems shown
              <span className="text-muted-foreground/70"> ({coveragePercent}% in 0-{maxNumber} range)</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground/70">
            {problemsOutOfRange} problem{problemsOutOfRange !== 1 ? "s" : ""} with larger numbers not shown
          </div>
        </div>
      )}

      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Second operand →</span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/80 p-[3px]">
          <button
            onClick={() => setViewMode("accuracy")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === "accuracy"
                ? "bg-card text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Accuracy
          </button>
          <button
            onClick={() => setViewMode("speed")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === "speed"
                ? "bg-card text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Speed
          </button>
        </div>
      </div>
      
      {/* Matrix */}
      <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
        <TooltipProvider delayDuration={100}>
          <div className="inline-block min-w-full">
            {/* Header row with second operand numbers */}
            <div className="flex sticky top-0 bg-card z-10">
              {/* Empty corner cell */}
              <div className={`${cellStyle.size} shrink-0`} />
              {/* Column headers */}
              {numbers.map(num => (
                <div 
                  key={`header-${num}`} 
                  className={`${cellStyle.size} flex items-center justify-center ${cellStyle.header} font-mono text-muted-foreground shrink-0`}
                >
                  {num}
                </div>
              ))}
            </div>
            
            {/* Matrix rows */}
            {numbers.map((rowNum, rowIndex) => (
              <div key={`row-${rowNum}`} className="flex">
                {/* Row header (first operand) */}
                <div className={`${cellStyle.size} flex items-center justify-center ${cellStyle.header} font-mono text-muted-foreground shrink-0 sticky left-0 bg-card z-10`}>
                  {rowNum}
                </div>
                
                {/* Matrix cells */}
                {numbers.map((colNum, colIndex) => {
                  const cell = matrix[rowIndex]?.[colIndex] || { attempts: 0, correct: 0, accuracy: null, avgTime: null };
                  const hasAttempts = cell.attempts > 0;

                  const bgClass = !hasAttempts
                    ? heatClass(null)
                    : viewMode === "accuracy"
                      ? heatClass(cell.accuracy)
                      : speedHeatClass(cell.avgTime);

                  return (
                    <UITooltip key={`cell-${rowNum}-${colNum}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`${cellStyle.size} flex items-center justify-center ${cellStyle.font} font-mono rounded-[2px] m-[0.5px] cursor-default transition-all hover:scale-125 hover:z-20 shrink-0 ${bgClass} ${
                            hasAttempts ? "font-medium" : "text-muted-foreground/50"
                          }`}
                        >
                          {showValues && hasAttempts ? (
                            viewMode === "accuracy" ? cell.accuracy : (cell.avgTime?.toFixed(1) || "")
                          ) : ""}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="font-mono font-semibold mb-1">
                          {rowNum} {operationSymbol} {colNum}
                        </div>
                        {hasAttempts ? (
                          <div className="space-y-0.5 text-background/70">
                            <div>Accuracy: <span className="font-medium text-background">{cell.accuracy}%</span></div>
                            <div>Avg Time: <span className="font-medium text-background">{cell.avgTime?.toFixed(2)}s</span></div>
                            <div>Attempts: <span className="font-medium text-background">{cell.attempts}</span> ({cell.correct} correct)</div>
                          </div>
                        ) : (
                          <div className="text-background/70">No attempts yet</div>
                        )}
                      </TooltipContent>
                    </UITooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>First operand ↓</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-xs">
          {viewMode === "accuracy" ? (
            <>
              <span className="editorial-label normal-case tracking-normal">needs work</span>
              <div className="w-3 h-3 rounded-[2px] bg-brand/55" />
              <div className="w-3 h-3 rounded-[2px] bg-brand/30" />
              <span aria-hidden="true" className="mx-1 text-muted-foreground">·</span>
              <div className="w-3 h-3 rounded-[2px] bg-foreground/12" />
              <div className="w-3 h-3 rounded-[2px] bg-foreground/25" />
              <div className="w-3 h-3 rounded-[2px] bg-foreground/45" />
              <div className="w-3 h-3 rounded-[2px] bg-foreground/65" />
              <div className="w-3 h-3 rounded-[2px] bg-foreground/85" />
              <span className="editorial-label normal-case tracking-normal">mastered</span>
            </>
          ) : (
            <>
              <span className="editorial-label normal-case tracking-normal">slow</span>
              <div className="w-3 h-3 rounded-[2px] bg-brand/55" />
              <div className="w-3 h-3 rounded-[2px] bg-brand/30" />
              <span aria-hidden="true" className="mx-1 text-muted-foreground">·</span>
              <div className="w-3 h-3 rounded-[2px] bg-foreground/40" />
              <div className="w-3 h-3 rounded-[2px] bg-foreground/65" />
              <div className="w-3 h-3 rounded-[2px] bg-foreground/85" />
              <span className="editorial-label normal-case tracking-normal">fast</span>
            </>
          )}
          <div className="ml-2 w-3 h-3 rounded-[2px] border border-border/60" />
          <span className="text-muted-foreground">No data</span>
        </div>
      </div>
    </div>
  );
}

export function SkillsDashboard() {
  const [data, setData] = useState<SkillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPerformanceScore, setShowPerformanceScore] = useState(false);
  const [matrixSize, setMatrixSize] = useState(15);
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Fetch skills data with optional matrix size
  const fetchSkillsData = useCallback(async (maxNumber: number = 15, isInitial: boolean = true) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setMatrixLoading(true);
      }
      
      const response = await fetch(`/api/user/skills?maxNumber=${maxNumber}`);
      if (!response.ok) {
        throw new Error("Failed to fetch skills data");
      }
      const skillsData = await response.json();
      setData(skillsData);
    } catch (err) {
      console.error("Error fetching skills data:", err);
      if (isInitial) {
        setError("Failed to load skills data");
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setMatrixLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchSkillsData(matrixSize, true);
  }, [fetchSkillsData, matrixSize]);
  
  // Debounced matrix size change handler
  const handleMatrixSizeChange = (newSize: number) => {
    setMatrixSize(newSize);
  };
  
  // Fetch new data when slider is released
  const handleMatrixSizeCommit = (newSize: number) => {
    if (newSize !== data?.matrixMaxNumber) {
      fetchSkillsData(newSize, false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <PageHeader
          eyebrow="Stats"
          title="Skills Breakdown"
          action={
            <Button variant="ghost" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Dashboard
              </Link>
            </Button>
          }
        />
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
      <PageHeader
        eyebrow="Stats"
        title="Skills Breakdown"
        description="Detailed analysis of your skills by operation type"
        action={
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Dashboard
            </Link>
          </Button>
        }
      />

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
                    <div className="flex items-center gap-1 rounded-full border border-border bg-muted/80 p-[3px]">
                      <button
                        onClick={() => setShowPerformanceScore(false)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          !showPerformanceScore
                            ? "bg-card text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Accuracy
                      </button>
                      <button
                        onClick={() => setShowPerformanceScore(true)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          showPerformanceScore
                            ? "bg-card text-foreground"
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
                            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} 
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <ChartTooltipFrame label={payload[0].payload.skill}>
                                    <p className="font-mono text-sm font-semibold">{payload[0].value}%</p>
                                  </ChartTooltipFrame>
                                );
                              }
                              return null;
                            }}
                          />
                          <Radar
                            name="Accuracy"
                            dataKey="value"
                            stroke="var(--foreground)"
                            fill="var(--foreground)"
                            fillOpacity={0.15}
                            strokeWidth={2.5}
                            dot={{ 
                              r: 4, 
                              fill: "var(--background)", 
                              stroke: "var(--foreground)", 
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
                            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} 
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                  <ChartTooltipFrame label={d.skill}>
                                    <p className="font-mono text-sm font-semibold">{d.score}/100</p>
                                    <div className="mt-1 space-y-0.5 text-xs text-background/70">
                                      <p>Accuracy: {d.accuracy}%</p>
                                      <p>Speed: {d.speed}%</p>
                                    </div>
                                  </ChartTooltipFrame>
                                );
                              }
                              return null;
                            }}
                          />
                          <Radar
                            name="Score"
                            dataKey="score"
                            stroke="var(--foreground)"
                            fill="var(--foreground)"
                            fillOpacity={0.15}
                            strokeWidth={2.5}
                            dot={{ 
                              r: 4, 
                              fill: "var(--background)", 
                              stroke: "var(--foreground)", 
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
                        <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                        <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} width={90} />
                        <Tooltip content={<ChartTooltip formatValue={(v) => `${v}%`} />} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} />
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
                                  <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                                  <Tooltip content={<ChartTooltip formatValue={(v) => `${v}%`} />} />
                                  <Line 
                                    type="monotone" 
                                    dataKey="accuracy" 
                                    stroke="currentColor" 
                                    strokeWidth={2} 
                                    className="text-foreground" 
                                    dot={{ r: 4, fill: "var(--background)", stroke: "currentColor", strokeWidth: 2 }}
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

            {/* Number Combination Matrix */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    <CardTitle className="text-sm font-medium">Number Combination Matrix (0-{matrixSize})</CardTitle>
                  </div>
                  {matrixLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  See your accuracy and speed for every combination of numbers
                </p>
                
                {/* Matrix Size Slider */}
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium">Matrix Size</label>
                    <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded-[3px]">0 – {matrixSize}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">5</span>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={5}
                      value={matrixSize}
                      onChange={(e) => handleMatrixSizeChange(parseInt(e.target.value))}
                      onMouseUp={(e) => handleMatrixSizeCommit(parseInt((e.target as HTMLInputElement).value))}
                      onTouchEnd={(e) => handleMatrixSizeCommit(parseInt((e.target as HTMLInputElement).value))}
                      className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-foreground
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
                        [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                        [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 
                        [&::-moz-range-thumb]:border-background"
                    />
                    <span className="text-xs text-muted-foreground w-6">50</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground/60">Times tables</span>
                    <span className="text-[10px] text-muted-foreground/60">Advanced</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="multiplication" className="w-full">
                  <TabsList className="mb-4 w-full justify-start">
                    <TabsTrigger value="addition" className="text-xs">Addition</TabsTrigger>
                    <TabsTrigger value="subtraction" className="text-xs">Subtraction</TabsTrigger>
                    <TabsTrigger value="multiplication" className="text-xs">Multiplication</TabsTrigger>
                    <TabsTrigger value="division" className="text-xs">Division</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="addition">
                    <NumberCombinationMatrix 
                      matrix={data?.combinationMatrices.addition?.matrix || []} 
                      operation="Addition"
                      operationSymbol="+"
                      totalProblems={data?.combinationMatrices.addition?.totalProblems || 0}
                      problemsInRange={data?.combinationMatrices.addition?.problemsInRange || 0}
                      maxNumber={data?.matrixMaxNumber || 15}
                    />
                  </TabsContent>
                  
                  <TabsContent value="subtraction">
                    <NumberCombinationMatrix 
                      matrix={data?.combinationMatrices.subtraction?.matrix || []} 
                      operation="Subtraction"
                      operationSymbol="−"
                      totalProblems={data?.combinationMatrices.subtraction?.totalProblems || 0}
                      problemsInRange={data?.combinationMatrices.subtraction?.problemsInRange || 0}
                      maxNumber={data?.matrixMaxNumber || 15}
                    />
                  </TabsContent>
                  
                  <TabsContent value="multiplication">
                    <NumberCombinationMatrix 
                      matrix={data?.combinationMatrices.multiplication?.matrix || []} 
                      operation="Multiplication"
                      operationSymbol="×"
                      totalProblems={data?.combinationMatrices.multiplication?.totalProblems || 0}
                      problemsInRange={data?.combinationMatrices.multiplication?.problemsInRange || 0}
                      maxNumber={data?.matrixMaxNumber || 15}
                    />
                  </TabsContent>
                  
                  <TabsContent value="division">
                    <NumberCombinationMatrix 
                      matrix={data?.combinationMatrices.division?.matrix || []} 
                      operation="Division"
                      operationSymbol="÷"
                      totalProblems={data?.combinationMatrices.division?.totalProblems || 0}
                      problemsInRange={data?.combinationMatrices.division?.problemsInRange || 0}
                      maxNumber={data?.matrixMaxNumber || 15}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Detailed Breakdown Section */}
            <div className="border-t-2 border-foreground pt-3">
              <SectionLabel>Detailed Breakdown</SectionLabel>
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
                      <div key={item.type} className="border-t border-border pt-3">
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
                        <XAxis dataKey="range" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip content={<ChartTooltip formatValue={(v) => `${v}%`} />} cursor={{ fill: "var(--secondary)", opacity: 0.5 }} />
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
                  <div>
                    {data.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
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
                            <Link href="/">
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

