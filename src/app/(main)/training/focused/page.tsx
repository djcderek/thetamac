"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MobileNumpad } from "@/components/ui/mobile-numpad";
import { useIsMobileDevice } from "@/hooks/use-is-mobile-device";
import {
  ArrowLeft,
  Target,
  RotateCcw,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
  Clock,
  Flame,
  Settings,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  Wand2,
} from "lucide-react";

interface Problem {
  operandA: number;
  operandB: number;
  operation: string;
  answer: number;
}

type SubmitMode = "manual" | "auto";

const operationSymbols: Record<string, string> = {
  "+": "+",
  "-": "−",
  "×": "×",
  "÷": "÷",
};

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateAnswer(a: number, b: number, operation: string): number {
  switch (operation) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return a / b;
    default:
      return 0;
  }
}

function FocusedTrainingSession({ packParam }: { packParam: string | null }) {
  const { data: authSession } = useSession();

  // Parse problems from URL on mount
  const [problems, setProblems] = useState<Problem[]>(() => {
    if (packParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(packParam));
        const problemsWithAnswers: Problem[] = parsed.map(
          (p: { operandA: number; operandB: number; operation: string }) => ({
            ...p,
            answer: calculateAnswer(p.operandA, p.operandB, p.operation),
          })
        );
        return shuffleArray(problemsWithAnswers);
      } catch (e) {
        console.error("Failed to parse training pack:", e);
      }
    }
    return [];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [submitMode, setSubmitMode] = useState<SubmitMode>("manual");

  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(0);

  // Mistakes to retry
  const [mistakes, setMistakes] = useState<Problem[]>([]);
  const [isRetryRound, setIsRetryRound] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentProblem = problems[currentIndex];

  const isMobileDevice = useIsMobileDevice();
  const useCustomKeypad = isMobileDevice;
  const showCustomKeypad = useCustomKeypad && isPlaying && !!currentProblem;
  const answerInputDisabled = !isPlaying || !currentProblem;
  const progress = problems.length > 0 ? ((currentIndex) / problems.length) * 100 : 0;
  const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

  const startTraining = () => {
    setIsPlaying(true);
    setIsComplete(false);
    setCurrentIndex(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setTimes([]);
    setMistakes([]);
    setIsRetryRound(false);
    setStartTime(Date.now());
    inputRef.current?.focus();
  };

  const startRetryRound = () => {
    setProblems(shuffleArray(mistakes));
    setMistakes([]);
    setCurrentIndex(0);
    setIsRetryRound(true);
    setIsComplete(false);
    setIsPlaying(true);
    setStartTime(Date.now());
    inputRef.current?.focus();
  };

  const nextProblem = useCallback(() => {
    if (currentIndex < problems.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserAnswer("");
      setIsCorrect(null);
      setStartTime(Date.now());
      inputRef.current?.focus();
    } else {
      // Session complete
      setIsPlaying(false);
      setIsComplete(true);
    }
  }, [currentIndex, problems.length]);

  const recordAttempt = async (
    problem: Problem,
    userAnswerNum: number | null,
    correct: boolean,
    timeTaken: number
  ) => {
    if (!authSession?.user) return;

    try {
      await fetch("/api/training/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operandA: problem.operandA,
          operandB: problem.operandB,
          operation: problem.operation,
          correctAnswer: problem.answer,
          userAnswer: userAnswerNum,
          isCorrect: correct,
          timeTaken,
        }),
      });
    } catch (error) {
      console.error("Failed to record attempt:", error);
    }
  };

  const submitCurrentAnswer = () => {
    if (!currentProblem || !isPlaying) return;

    const answerNum = parseInt(userAnswer);
    if (isNaN(answerNum)) return;

    const correct = answerNum === currentProblem.answer;
    const timeTaken = (Date.now() - startTime) / 1000;

    // In auto mode, correct answers are handled by the effect
    // Incorrect answers just clear the input (no tracking)
    if (submitMode === "auto") {
      if (correct) return;
      setUserAnswer("");
      setIsCorrect(false);
      setTimeout(() => setIsCorrect(null), 300);
      return;
    }

    setIsCorrect(correct);

    // Record attempt
    recordAttempt(currentProblem, answerNum, correct, timeTaken);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        return newStreak;
      });
      setTimes((prev) => [...prev, timeTaken]);
    } else {
      setStreak(0);
      // Add to mistakes for retry
      setMistakes((prev) => {
        const exists = prev.some(
          (p) =>
            p.operandA === currentProblem.operandA &&
            p.operandB === currentProblem.operandB &&
            p.operation === currentProblem.operation
        );
        if (!exists) {
          return [...prev, currentProblem];
        }
        return prev;
      });
    }

    setTimeout(() => {
      nextProblem();
    }, correct ? 200 : 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCurrentAnswer();
  };

  // Auto-submit when correct answer is typed
  useEffect(() => {
    if (!isPlaying || !currentProblem || submitMode !== "auto" || isCorrect !== null) return;

    const answerNum = parseInt(userAnswer);
    if (!isNaN(answerNum) && answerNum === currentProblem.answer) {
      const timeTaken = (Date.now() - startTime) / 1000;

      setIsCorrect(true);
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) {
          setBestStreak(newStreak);
        }
        return newStreak;
      });
      setTimes((prev) => [...prev, timeTaken]);

      recordAttempt(currentProblem, answerNum, true, timeTaken);

      setTimeout(() => {
        nextProblem();
      }, 200);
    }
  }, [userAnswer, isPlaying, currentProblem, submitMode, isCorrect, startTime, bestStreak, recordAttempt, nextProblem]);

  const accuracy = problems.length > 0 ? Math.round((correctCount / Math.max(currentIndex, 1)) * 100) : 0;

  if (problems.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <Link href="/training/weak-points" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Weak Points
            </Link>
            <h1 className="text-lg font-semibold">Focused Training</h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Training Pack</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate a training pack from your weak points analysis first.
              </p>
              <Link href="/training/weak-points">
                <Button>Go to Weak Points</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Complete screen
  if (isComplete) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <Link href="/training/weak-points" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Weak Points
            </Link>
            <h1 className="text-lg font-semibold">
              {isRetryRound ? "Retry Round Complete!" : "Training Complete!"}
            </h1>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                accuracy >= 80 ? "bg-success/20" : accuracy >= 60 ? "bg-warning/20" : "bg-secondary"
              }`}>
                {accuracy >= 80 ? (
                  <Trophy className="w-10 h-10 text-success" />
                ) : accuracy >= 60 ? (
                  <Target className="w-10 h-10 text-warning" />
                ) : (
                  <Target className="w-10 h-10 text-muted-foreground" />
                )}
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {accuracy >= 80 ? "Great Work!" : accuracy >= 60 ? "Good Progress!" : "Keep Practicing!"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isRetryRound
                  ? "You've reviewed your mistakes."
                  : "You've completed your focused training session."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-3xl font-mono font-bold">{correctCount}/{problems.length}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-3xl font-mono font-bold">{accuracy}%</p>
                  <p className="text-xs text-muted-foreground">Accuracy</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-3xl font-mono font-bold">{bestStreak}</p>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/50">
                  <p className="text-3xl font-mono font-bold">{avgTime > 0 ? avgTime.toFixed(1) : "0"}s</p>
                  <p className="text-xs text-muted-foreground">Avg Time</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {mistakes.length > 0 && !isRetryRound && (
                  <Button onClick={startRetryRound} size="lg" variant="default">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retry Mistakes ({mistakes.length})
                  </Button>
                )}
                <Button onClick={startTraining} size="lg" variant={mistakes.length > 0 ? "outline" : "default"}>
                  <Play className="w-4 h-4 mr-2" />
                  {isRetryRound ? "Practice Again" : "Restart Session"}
                </Button>
                <Link href="/training/weak-points">
                  <Button variant="outline" size="lg">
                    Back to Analysis
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pre-start screen
  if (!isPlaying) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <Link href="/training/weak-points" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Weak Points
            </Link>
            <h1 className="text-lg font-semibold">Focused Training</h1>
            <p className="text-sm text-muted-foreground">
              Practice your weak areas
            </p>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <div className="max-w-lg mx-auto space-y-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h2 className="text-xl font-semibold mb-2">Ready to Practice?</h2>
                <p className="text-muted-foreground mb-6">
                  You have <span className="font-semibold text-foreground">{problems.length} problems</span> to work through.
                  These are specifically chosen based on your weak areas.
                </p>

                {/* Settings summary - clickable to expand */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors text-left mb-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Settings className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>
                        <span className="font-medium text-foreground">Settings: </span>
                        {submitMode === "auto" ? "Auto-submit" : "Press Enter to submit"}
                      </span>
                    </div>
                    {showSettings ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </button>

                {/* Collapsible Settings Section */}
                {showSettings && (
                  <div className="mb-6 p-4 rounded-lg border border-border bg-secondary/20 text-left">
                    <label className="text-sm font-medium mb-3 block">Submission Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSubmitMode("manual")}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          submitMode === "manual"
                            ? "border-foreground bg-secondary"
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <CornerDownLeft className="w-4 h-4" />
                          <span className="font-medium text-sm">Press Enter</span>
                        </div>
                        <span className="text-xs text-muted-foreground block">Submit with Enter key</span>
                      </button>
                      <button
                        onClick={() => setSubmitMode("auto")}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          submitMode === "auto"
                            ? "border-foreground bg-secondary"
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Wand2 className="w-4 h-4" />
                          <span className="font-medium text-sm">Auto-submit</span>
                        </div>
                        <span className="text-xs text-muted-foreground block">Submit when correct</span>
                      </button>
                    </div>
                  </div>
                )}

                <Button onClick={startTraining} size="lg" className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Start Training
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Playing screen
  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">
                {isRetryRound ? "Retry Round" : "Focused Training"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentIndex + 1} / {problems.length}
            </div>
          </div>
        </div>
      </div>

      <div className={`p-4 md:p-6 ${showCustomKeypad ? "pb-[calc(env(safe-area-inset-bottom,0.5rem)+260px)]" : ""}`}>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress */}
          <div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Problem */}
          {currentProblem && (
            <Card className={`transition-colors ${
              isCorrect === true ? "border-success" : isCorrect === false ? "border-destructive" : ""
            }`}>
              <CardContent className="p-12">
                <div className="text-center">
                  <div className="text-6xl font-mono font-semibold tracking-wide mb-8">
                    {currentProblem.operandA} {operationSymbols[currentProblem.operation] || currentProblem.operation} {currentProblem.operandB}
                  </div>

                  <form onSubmit={handleSubmit}>
                    {useCustomKeypad ? (
                      <div
                        role="textbox"
                        aria-label="Answer"
                        aria-readonly="true"
                        className={`h-14 text-center text-2xl font-mono max-w-[200px] mx-auto rounded-md border border-input bg-background px-3 flex items-center justify-center ${
                          answerInputDisabled ? "opacity-50" : ""
                        }`}
                      >
                        {userAnswer.length > 0 ? userAnswer : "?"}
                      </div>
                    ) : (
                      <Input
                        ref={inputRef}
                        type="number"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value.replace(/[^0-9\-]/g, ""))}
                        placeholder="?"
                        className="h-14 text-center text-2xl font-mono max-w-[200px] mx-auto"
                        autoFocus
                      />
                    )}
                  </form>

                  {isCorrect === false && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Answer: <span className="font-mono font-medium text-foreground">{currentProblem.answer}</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-2xl font-mono font-semibold">{correctCount}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-2xl font-mono font-semibold">{streak}</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-2xl font-mono font-semibold">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/50">
              <p className="text-2xl font-mono font-semibold">{avgTime > 0 ? avgTime.toFixed(1) : "0"}s</p>
              <p className="text-xs text-muted-foreground">Avg Time</p>
            </div>
          </div>

          {/* Skip button */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={nextProblem}>
              Skip
            </Button>
          </div>
        </div>
      </div>

      {showCustomKeypad && (
        <MobileNumpad
          value={userAnswer}
          setValue={setUserAnswer}
          disabled={answerInputDisabled}
          onDone={submitCurrentAnswer}
        />
      )}
    </div>
  );
}

function FocusedTrainingContent() {
  const searchParams = useSearchParams();
  const packParam = searchParams.get("pack");
  return <FocusedTrainingSession key={packParam} packParam={packParam} />;
}

export default function FocusedTrainingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FocusedTrainingContent />
    </Suspense>
  );
}


