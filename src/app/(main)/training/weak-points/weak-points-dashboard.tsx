"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Target,
  Zap,
  Clock,
  TrendingDown,
  AlertTriangle,
  Play,
  Loader2,
  Brain,
  RefreshCw,
  Flame,
  CheckCircle2,
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
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors">
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
    if (accuracy >= 80) return "bg-success/20 text-success border-success/30";
    if (accuracy >= 60) return "bg-warning/20 text-warning border-warning/30";
    return "bg-destructive/20 text-destructive border-destructive/30";
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xl font-mono">
              {weakness.operationSymbol}
            </div>
            <div>
              <h3 className="font-semibold">{weakness.operation}</h3>
              <p className="text-xs text-muted-foreground">{weakness.totalAttempts} problems solved</p>
            </div>
          </div>
          <Badge className={getAccuracyColor(weakness.accuracy)}>
            {weakness.accuracy}%
          </Badge>
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
    <Card className="col-span-full">
      <CardContent className="py-16 text-center">
        <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No Data to Analyze Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Start practicing to build up your problem history. We need at least a few training sessions to identify your weak points.
        </p>
        <Link href="/training">
          <Button size="lg">
            <Play className="w-4 h-4 mr-2" />
            Start Training
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function GoodJobState() {
  return (
    <Card className="col-span-full border-success/30 bg-success/5">
      <CardContent className="py-12 text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-success" />
        <h3 className="text-xl font-semibold mb-2">Great Work!</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          You're performing well across all operations! Keep practicing to maintain your skills and tackle harder problems.
        </p>
        <Link href="/training">
          <Button size="lg">
            <Flame className="w-4 h-4 mr-2" />
            Keep Practicing
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function WeakPointsDashboard() {
  const [data, setData] = useState<WeakPointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
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
        <div className="border-b border-border">
          <div className="px-4 md:px-6 py-4">
            <Link href="/training" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Training
            </Link>
            <h1 className="text-lg font-semibold">Weak Point Training</h1>
          </div>
        </div>
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
  // Check for weak points in any category: problems with <100% accuracy, improvement areas, or operations below 90%
  const hasWeakPoints = hasData && (
    data.topWeakProblems.length > 0 || 
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
      <div className="border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <Link href="/training" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Training
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">Weak Point Training</h1>
              <p className="text-sm text-muted-foreground">
                Personalized practice based on your problem areas
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {!hasData ? (
          <EmptyState />
        ) : !hasWeakPoints ? (
          <GoodJobState />
        ) : (
          <>
            {/* Training Pack CTA */}
            {hasTrainingPack && (
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Target className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">Your Custom Training Pack</h2>
                        <p className="text-sm text-muted-foreground">
                          {data.trainingPack.problems.length} problems targeting your weak areas
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {data.trainingPack.focusAreas.map((area) => (
                            <Badge key={area} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          <span className="text-xs text-muted-foreground">
                            ~{data.trainingPack.estimatedTime} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/training/focused?pack=${trainingPackParam}`}>
                      <Button size="lg" className="w-full md:w-auto">
                        <Play className="w-4 h-4 mr-2" />
                        Start Focused Training
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Overall Accuracy</p>
                      <p className="text-xl font-semibold font-mono">{data.overallAccuracy}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Problems Analyzed</p>
                      <p className="text-xl font-semibold font-mono">{data.totalAttempts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Weak Spots Found</p>
                      <p className="text-xl font-semibold font-mono">{data.topWeakProblems.length}</p>
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
                      <p className="text-xs text-muted-foreground">Slow Problems</p>
                      <p className="text-xl font-semibold font-mono">{data.slowestProblems.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  <div className="space-y-3">
                    {data.improvementAreas.map((area, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          area.priority === "high"
                            ? "border-destructive/30 bg-destructive/5"
                            : area.priority === "medium"
                            ? "border-warning/30 bg-warning/5"
                            : "border-border bg-secondary/30"
                        }`}
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
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            area.priority === "high"
                              ? "border-destructive/50 text-destructive"
                              : area.priority === "medium"
                              ? "border-warning/50 text-warning"
                              : ""
                          }`}
                        >
                          {area.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Operations Breakdown */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                By Operation
              </h2>
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
                      <div className="space-y-2">
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
                      <div className="space-y-2">
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
                      <div className="space-y-2">
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
                  <Button size="lg" className="gap-2">
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

