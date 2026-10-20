"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandedEmptyState, MetricTile, PageHeader } from "@/components/ui/visual-system";
import {
  ArrowLeft,
  Target,
  Zap,
  Clock,
  TrendingDown,
  AlertTriangle,
  Play,
  Loader2,
  RefreshCw,
  Flame,
} from "lucide-react";

interface ProblemStats {
  key: string;
  operandA: number;
  operandB: number;
  operation: string;
  attempts: number;
  correct: number;
  accuracy: number;
  avgTime: number;
  lastAttempt: string;
  commonWrongAnswers: { answer: number; count: number }[];
}

interface OperationWeakness {
  operation: string;
  operationSymbol: string;
  accuracy: number;
  avgTime: number;
  totalAttempts: number;
  weakestCombinations: ProblemStats[];
}

interface ImprovementArea {
  type: "accuracy" | "speed" | "consistency";
  operation: string;
  message: string;
  priority: "high" | "medium" | "low";
}

interface WeakPointsData {
  overallAccuracy: number;
  totalAttempts: number;
  operationWeaknesses: OperationWeakness[];
  topWeakProblems: ProblemStats[];
  slowestProblems: ProblemStats[];
  recentMistakes: ProblemStats[];
  improvementAreas: ImprovementArea[];
  trainingPack: {
    problems: { operandA: number; operandB: number; operation: string }[];
    focusAreas: string[];
    estimatedTime: number;
  };
}

const operationSymbols: Record<string, string> = {
  "+": "+",
  "-": "−",
  "×": "×",
  "÷": "÷",
};

function ProblemCard({ problem, showWrongAnswers = false }: { problem: ProblemStats; showWrongAnswers?: boolean }) {
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-success";
    if (accuracy >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="flex items-center justify-between border-t border-border py-3 transition-colors first:border-t-0 first:pt-0 hover:bg-secondary/30">
      <div className="flex items-center gap-4">
        <div className="text-lg font-mono font-semibold min-w-[100px]">
          {problem.operandA} {operationSymbols[problem.operation] || problem.operation} {problem.operandB}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {problem.attempts} attempts
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {problem.avgTime}s avg
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showWrongAnswers && problem.commonWrongAnswers.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Common mistake:{" "}
            <span className="font-mono text-destructive">
              {problem.commonWrongAnswers[0].answer}
            </span>
          </div>
        )}
        <div className={`font-mono font-semibold ${getAccuracyColor(problem.accuracy)}`}>
          {problem.accuracy}%
        </div>
      </div>
    </div>
  );
}

function OperationCard({ weakness }: { weakness: OperationWeakness }) {
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-success";
    if (accuracy >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-border font-mono text-xl">
              {weakness.operationSymbol}
            </div>
            <div>
              <h3 className="font-semibold">{weakness.operation}</h3>
              <p className="text-xs text-muted-foreground">{weakness.totalAttempts} problems solved</p>
            </div>
          </div>
          <span className={`font-mono text-sm font-semibold ${getAccuracyColor(weakness.accuracy)}`}>
            {weakness.accuracy}%
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Accuracy</span>
            </div>
            <Progress value={weakness.accuracy} className="h-2" />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Speed</span>
            <span className="font-mono">{weakness.avgTime}s</span>
          </div>

          {weakness.weakestCombinations.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Weakest combinations:</p>
              <div className="space-y-1">
                {weakness.weakestCombinations.slice(0, 3).map((combo) => (
                  <div key={combo.key} className="flex justify-between text-sm">
                    <span className="font-mono">
                      {combo.operandA} {operationSymbols[combo.operation]} {combo.operandB}
                    </span>
                    <span className="text-muted-foreground">{combo.accuracy}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <BrandedEmptyState
      title="No Data to Analyze Yet"
      description="Start practicing to build up your problem history. We need at least a few training sessions to identify your weak points."
      action={
        <Link href="/">
          <Button size="lg">
            <Play className="w-4 h-4 mr-2" />
            Start Training
          </Button>
        </Link>
      }
    />
  );
}

function GoodJobState() {
  return (
    <BrandedEmptyState
      title="Great Work!"
      description="You're performing well across all operations! Keep practicing to maintain your skills and tackle harder problems."
      action={
        <Link href="/">
          <Button size="lg">
            <Flame className="w-4 h-4 mr-2" />
            Keep Practicing
          </Button>
        </Link>
      }
    />
  );
}

export function WeakPointsDashboard() {
  const [data, setData] = useState<WeakPointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Clear the previous failure, or "Try Again" stays on the error screen after a success.
      setError(null);
      const response = await fetch("/api/user/weak-points");
      if (!response.ok) {
        throw new Error("Failed to fetch weak points data");
      }
      const weakPointsData = await response.json();
      setData(weakPointsData);
    } catch (err) {
      console.error("Error fetching weak points:", err);
      setError("Failed to load weak points analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Analyzing your performance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <PageHeader
          eyebrow="Training"
          title="Weak Point Training"
          action={
            <Button variant="ghost" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Training
              </Link>
            </Button>
          }
        />
        <div className="p-4 md:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchData}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasData = data && data.totalAttempts > 0;
  // Check for weak points in any category: problems with <100% accuracy, slow problems,
  // improvement areas, or operations below 90%
  const hasWeakPoints = hasData && (
    data.topWeakProblems.length > 0 ||
    data.slowestProblems.length > 0 ||
    data.recentMistakes.length > 0 ||
    data.improvementAreas.length > 0 ||
    data.operationWeaknesses.some(op => op.accuracy < 90)
  );
  const hasTrainingPack = hasData && data.trainingPack.problems.length > 0;

  // Encode training pack for URL
  const trainingPackParam = hasTrainingPack
    ? encodeURIComponent(JSON.stringify(data.trainingPack.problems))
    : "";

  return (
    <div className="min-h-screen">
      <PageHeader
        eyebrow="Training"
        title="Weak Point Training"
        description="Personalized practice based on your problem areas"
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Training
              </Link>
            </Button>
          </div>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {!hasData ? (
          <EmptyState />
        ) : !hasWeakPoints ? (
          <GoodJobState />
        ) : (
          <>
            {/* Training Pack CTA */}
            {hasTrainingPack && (
              <div className="rounded-[26px] bg-secondary p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">Training pack</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">Your custom training pack</h2>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                      {data.trainingPack.problems.length} problems targeting your weak areas
                    </p>
                    <p className="mt-2 text-[13px] text-muted-foreground">
                      {data.trainingPack.focusAreas.join(" · ")}
                      {" · "}~{data.trainingPack.estimatedTime} min
                    </p>
                  </div>
                  <Link href={`/training/focused?pack=${trainingPackParam}`}>
                    <Button variant="brand" size="lg" className="w-full md:w-auto">
                      <Play aria-hidden="true" className="fill-current" />
                      Start Focused Training
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricTile label="Overall accuracy" value={`${data.overallAccuracy}%`} />
              <MetricTile label="Problems analyzed" value={data.totalAttempts} />
              <MetricTile label="Weak spots found" value={data.topWeakProblems.length} />
              <MetricTile label="Slow problems" value={data.slowestProblems.length} />
            </div>

            {/* Improvement Areas */}
            {data.improvementAreas.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Priority Improvements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    {data.improvementAreas.map((area, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0"
                      >
                        {area.type === "accuracy" && (
                          <TrendingDown className={`w-4 h-4 mt-0.5 ${area.priority === "high" ? "text-destructive" : "text-warning"}`} />
                        )}
                        {area.type === "speed" && (
                          <Clock className={`w-4 h-4 mt-0.5 ${area.priority === "high" ? "text-destructive" : "text-warning"}`} />
                        )}
                        {area.type === "consistency" && (
                          <Target className={`w-4 h-4 mt-0.5 ${area.priority === "high" ? "text-destructive" : "text-warning"}`} />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{area.message}</p>
                        </div>
                        <span
                          className={`text-[13px] font-medium ${ area.priority === "high" ? "text-destructive" : area.priority === "medium" ? "text-warning" : "text-muted-foreground" }`}
                        >
                          {area.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Operations Breakdown */}
            <div>
              <h2 className="mb-3 px-1 text-[17px] font-semibold tracking-tight">By operation</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.operationWeaknesses.map((weakness) => (
                  <OperationCard key={weakness.operation} weakness={weakness} />
                ))}
              </div>
            </div>

            {/* Detailed Problems */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Problem Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="weak">
                  <TabsList className="mb-4">
                    <TabsTrigger value="weak">Lowest Accuracy</TabsTrigger>
                    <TabsTrigger value="slow">Slowest</TabsTrigger>
                    <TabsTrigger value="recent">Recent Mistakes</TabsTrigger>
                  </TabsList>

                  <TabsContent value="weak">
                    {data.topWeakProblems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No weak problems identified yet!</p>
                    ) : (
                      <div>
                        {data.topWeakProblems.map((problem) => (
                          <ProblemCard key={problem.key} problem={problem} showWrongAnswers />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="slow">
                    {data.slowestProblems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No slow problems identified yet!</p>
                    ) : (
                      <div>
                        {data.slowestProblems.map((problem) => (
                          <ProblemCard key={problem.key} problem={problem} />
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="recent">
                    {data.recentMistakes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No recent mistakes in the last 7 days!</p>
                    ) : (
                      <div>
                        {data.recentMistakes.map((problem) => (
                          <ProblemCard key={problem.key} problem={problem} showWrongAnswers />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Bottom CTA */}
            {hasTrainingPack && (
              <div className="flex justify-center pt-4">
                <Link href={`/training/focused?pack=${trainingPackParam}`}>
                  <Button variant="secondary" size="lg" className="gap-2">
                    <Target className="w-5 h-5" />
                    Start Focused Training ({data.trainingPack.problems.length} problems)
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

