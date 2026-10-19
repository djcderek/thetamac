"use client";

import { useEffect, useState, useCallback, useRef, Suspense, startTransition } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MetricTile, SectionLabel, optionTileClass } from "@/components/ui/visual-system";
import { MobileNumpad } from "@/components/ui/mobile-numpad";
import { useIsMobileDevice } from "@/hooks/use-is-mobile-device";
import { ANALYTICS_EVENTS } from "@/lib/analytics";
import {
  captureAnalyticsEvent,
  clearAnalyticsSessionProperties,
  createAnalyticsId,
  registerAnalyticsSessionProperties,
} from "@/lib/analytics-client";
import {
  ArrowLeft,
  Target,
  RotateCcw,
  Play,
  LogIn,
  Loader2,
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

function FocusedHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border">
      <div className="px-5 py-6 md:px-8">
        <Link
          href="/training/weak-points"
          className="mb-2 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Weak Points
        </Link>
        <h1 className="font-semibold text-3xl tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

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
  const progressRef = useRef<HTMLDivElement>(null);
  const captureStatsRef = useRef({
    answeredCount: 0,
    correctCount: 0,
    times: [] as number[],
    bestStreak: 0,
    isRetryRound: false,
  });
  const trainingRunIdRef = useRef<string | null>(null);
  const trainingStartedAtRef = useRef(0);
  const firstAnswerTrackedRef = useRef(false);
  const activeRunRef = useRef(false);
  const trainingAuthStateRef = useRef<"authenticated" | "guest">("guest");
  const currentProblem = problems[currentIndex];

  const isMobileDevice = useIsMobileDevice();
  const useCustomKeypad = isMobileDevice;
  const showCustomKeypad = useCustomKeypad && isPlaying && !!currentProblem;
  const answerInputDisabled = !isPlaying || !currentProblem;

  useEffect(() => {
    return () => {
      if (!activeRunRef.current) return;
      activeRunRef.current = false;
      const stats = captureStatsRef.current;
      captureAnalyticsEvent(ANALYTICS_EVENTS.trainingAbandoned, {
        training_run_id: trainingRunIdRef.current ?? undefined,
        training_type: "focused",
        game_mode: "focused",
        surface: "focused_training",
        auth_state: trainingAuthStateRef.current,
        end_reason: "navigation",
        duration_seconds: Math.round((Date.now() - trainingStartedAtRef.current) / 1000),
        total_solved: stats.answeredCount,
        total_correct: stats.correctCount,
        avg_time_seconds:
          stats.times.length > 0
            ? stats.times.reduce((sum, value) => sum + value, 0) / stats.times.length
            : 0,
      });
      clearAnalyticsSessionProperties("training_run_id", "training_type", "game_mode");
    };
  }, []);

  // On mobile, keep the progress + question card in view when the custom keypad is open / problem changes.
  useEffect(() => {
    if (!showCustomKeypad) return;
    const node = progressRef.current;
    if (!node) return;

    const scroll = () => node.scrollIntoView({ behavior: "smooth", block: "start" });

    let timeout: number | undefined;
    const raf = requestAnimationFrame(() => {
      scroll();
      timeout = window.setTimeout(scroll, 60);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [showCustomKeypad, currentIndex]);
  const progress = problems.length > 0 ? ((currentIndex) / problems.length) * 100 : 0;
  const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;

  const startTraining = () => {
    const trainingRunId = createAnalyticsId();
    trainingRunIdRef.current = trainingRunId;
    trainingStartedAtRef.current = Date.now();
    firstAnswerTrackedRef.current = false;
    activeRunRef.current = true;
    trainingAuthStateRef.current = authSession?.user ? "authenticated" : "guest";
    registerAnalyticsSessionProperties({
      training_run_id: trainingRunId,
      training_type: "focused",
      game_mode: "focused",
    });
    captureAnalyticsEvent(ANALYTICS_EVENTS.trainingStarted, {
      training_run_id: trainingRunId,
      training_type: "focused",
      game_mode: "focused",
      problem_count: problems.length,
      submit_mode: submitMode,
      auth_state: authSession?.user ? "authenticated" : "guest",
      surface: "focused_training",
    });
    captureStatsRef.current = { answeredCount: 0, correctCount: 0, times: [], bestStreak: 0, isRetryRound: false };
    setIsPlaying(true);
    setIsComplete(false);
    setCurrentIndex(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setTimes([]);
    setMistakes([]);
    setIsRetryRound(false);
    setUserAnswer("");
    setIsCorrect(null);
    setStartTime(Date.now());
    inputRef.current?.focus();
  };

  const startRetryRound = () => {
    const previousRunId = trainingRunIdRef.current;
    const trainingRunId = createAnalyticsId();
    trainingRunIdRef.current = trainingRunId;
    trainingStartedAtRef.current = Date.now();
    firstAnswerTrackedRef.current = false;
    activeRunRef.current = true;
    trainingAuthStateRef.current = authSession?.user ? "authenticated" : "guest";
    captureAnalyticsEvent(ANALYTICS_EVENTS.trainingRestarted, {
      previous_training_run_id: previousRunId ?? undefined,
      training_run_id: trainingRunId,
      training_type: "focused",
      game_mode: "focused",
      surface: "focused_training",
    });
    registerAnalyticsSessionProperties({
      training_run_id: trainingRunId,
      training_type: "focused",
      game_mode: "focused",
    });
    captureStatsRef.current = { answeredCount: 0, correctCount: 0, times: [], bestStreak: 0, isRetryRound: true };
    setProblems(shuffleArray(mistakes));
    setMistakes([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setUserAnswer("");
    setIsCorrect(null);
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
      const s = captureStatsRef.current;
      captureAnalyticsEvent(ANALYTICS_EVENTS.trainingCompleted, {
        training_run_id: trainingRunIdRef.current ?? undefined,
        training_type: "focused",
        game_mode: "focused",
        surface: "focused_training",
        end_reason: "pack_finished",
        duration_seconds: Math.round((Date.now() - trainingStartedAtRef.current) / 1000),
        problem_count: problems.length,
        total_solved: s.answeredCount,
        total_correct: s.correctCount,
        correct_count: s.correctCount,
        accuracy: problems.length > 0 ? Math.round((s.correctCount / problems.length) * 100) : 0,
        avg_time_seconds: s.times.length > 0 ? Math.round((s.times.reduce((a, b) => a + b, 0) / s.times.length) * 100) / 100 : 0,
        best_streak: s.bestStreak,
        is_retry_round: s.isRetryRound,
      });
      activeRunRef.current = false;
      clearAnalyticsSessionProperties("training_run_id", "training_type", "game_mode");
    }
  }, [currentIndex, problems.length]);

  const recordAttempt = useCallback(async (
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
  }, [authSession?.user]);

  const submitCurrentAnswer = () => {
    if (!currentProblem || !isPlaying) return;

    const answerNum = parseInt(userAnswer);
    if (isNaN(answerNum)) return;

    if (!firstAnswerTrackedRef.current) {
      firstAnswerTrackedRef.current = true;
      captureAnalyticsEvent(ANALYTICS_EVENTS.trainingFirstAnswered, {
        training_run_id: trainingRunIdRef.current ?? undefined,
        training_type: "focused",
        game_mode: "focused",
        surface: "focused_training",
      });
    }

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
    captureStatsRef.current.answeredCount++;

    // Record attempt
    recordAttempt(currentProblem, answerNum, correct, timeTaken);

    if (correct) {
      captureStatsRef.current.correctCount++;
      captureStatsRef.current.times = [...captureStatsRef.current.times, timeTaken];
      setCorrectCount((prev) => prev + 1);
      setStreak((prev) => {
        const newStreak = prev + 1;
        if (newStreak > bestStreak) {
          captureStatsRef.current.bestStreak = newStreak;
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
      if (!firstAnswerTrackedRef.current) {
        firstAnswerTrackedRef.current = true;
        captureAnalyticsEvent(ANALYTICS_EVENTS.trainingFirstAnswered, {
          training_run_id: trainingRunIdRef.current ?? undefined,
          training_type: "focused",
          game_mode: "focused",
          surface: "focused_training",
        });
      }
      const timeTaken = (Date.now() - startTime) / 1000;

      captureStatsRef.current.answeredCount++;
      captureStatsRef.current.correctCount++;
      captureStatsRef.current.times = [...captureStatsRef.current.times, timeTaken];
      startTransition(() => {
        setIsCorrect(true);
        setCorrectCount((prev) => prev + 1);
        setStreak((prev) => {
          const newStreak = prev + 1;
          if (newStreak > bestStreak) {
            captureStatsRef.current.bestStreak = newStreak;
            setBestStreak(newStreak);
          }
          return newStreak;
        });
        setTimes((prev) => [...prev, timeTaken]);
      });

      recordAttempt(currentProblem, answerNum, true, timeTaken);

      setTimeout(() => {
        nextProblem();
      }, 200);
    }
  }, [userAnswer, isPlaying, currentProblem, submitMode, isCorrect, startTime, bestStreak, recordAttempt, nextProblem]);

  // currentIndex stays on the last problem at completion, and the current problem counts as
  // answered once it has feedback, so dividing by currentIndex alone overstated accuracy.
  const answeredCount = isComplete ? problems.length : currentIndex + (isCorrect !== null ? 1 : 0);
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  if (problems.length === 0) {
    return (
      <div className="min-h-screen">
        <FocusedHeader title="Focused Training" />
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
        <FocusedHeader title={isRetryRound ? "Retry Round Complete" : "Training Complete"} />
        <div className="p-4 md:p-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 text-center">

              <h2 className="font-semibold text-3xl tracking-tight mb-2">
                {accuracy >= 80 ? "Great Work!" : accuracy >= 60 ? "Good Progress!" : "Keep Practicing!"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {isRetryRound
                  ? "You've reviewed your mistakes."
                  : "You've completed your focused training session."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-left">
                <MetricTile label="Correct" value={`${correctCount}/${problems.length}`} />
                <MetricTile label="Accuracy" value={`${accuracy}%`} />
                <MetricTile label="Best streak" value={bestStreak} />
                <MetricTile label="Avg time" value={`${avgTime > 0 ? avgTime.toFixed(1) : "0"}s`} />
              </div>

              {!authSession?.user && (
                <div className="rounded-2xl border border-border p-4 text-left mb-8">
                  <p className="text-sm font-semibold">Save your progress</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sign in (or create an account) to keep track of your scores and improvement over time.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Link href="/auth/signin?callbackUrl=%2Fdashboard">
                      <Button variant="outline" className="w-full sm:w-auto">
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign in
                      </Button>
                    </Link>
                    <Link href="/auth/signup?callbackUrl=%2Fdashboard">
                      <Button className="w-full sm:w-auto">
                        <LogIn className="w-4 h-4 mr-2" />
                        Create account
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

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
        <FocusedHeader title="Focused Training" description="Practice your weak areas" />
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
                  className="w-full p-3 rounded-2xl border border-border hover:border-foreground/50 transition-colors text-left mb-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Settings className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        <span className="font-medium text-foreground">Settings: </span>
                        {submitMode === "auto" ? "Auto-submit" : "Press Enter to submit"}
                      </span>
                    </div>
                    {showSettings ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </button>

                {/* Collapsible Settings Section */}
                {showSettings && (
                  <div className="mb-6 rounded-[22px] bg-secondary p-5 text-left">
                    <SectionLabel className="mb-3">Submission mode</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSubmitMode("manual")}
                        className={optionTileClass(submitMode === "manual", "text-center")}
                      >
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <CornerDownLeft className="w-4 h-4" />
                          <span className="font-medium text-sm">Press Enter</span>
                        </div>
                        <span className={`text-xs block ${submitMode === "manual" ? "text-background/70" : "text-muted-foreground"}`}>
                          Submit with Enter key
                        </span>
                      </button>
                      <button
                        onClick={() => setSubmitMode("auto")}
                        className={optionTileClass(submitMode === "auto", "text-center")}
                      >
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Wand2 className="w-4 h-4" />
                          <span className="font-medium text-sm">Auto-submit</span>
                        </div>
                        <span className={`text-xs block ${submitMode === "auto" ? "text-background/70" : "text-muted-foreground"}`}>
                          Submit when correct
                        </span>
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
        <div className="px-5 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <SectionLabel className="text-foreground">
              {isRetryRound ? "Retry Round" : "Focused Training"}
            </SectionLabel>
            <div className="font-mono text-sm tabular-nums text-muted-foreground">
              {currentIndex + 1} / {problems.length}
            </div>
          </div>
        </div>
      </div>

      <div className={`p-4 md:p-6 ${showCustomKeypad ? "pb-[calc(env(safe-area-inset-bottom,0.5rem)+340px)]" : ""}`}>
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
          {/* Progress */}
          <div ref={progressRef} className="scroll-mt-4">
            <Progress value={progress} className="h-2" />
          </div>

          {/* Problem */}
          {currentProblem && (
            <Card className={`transition-colors ${
              isCorrect === true ? "border-success" : isCorrect === false ? "border-destructive" : ""
            }`}>
              <CardContent className="p-6 sm:p-12">
                <div className="text-center">
                  <div className="text-4xl sm:text-6xl font-mono font-semibold tracking-wide mb-5 sm:mb-8">
                    {currentProblem.operandA} {operationSymbols[currentProblem.operation] || currentProblem.operation} {currentProblem.operandB}
                  </div>

                  <form onSubmit={handleSubmit}>
                    {useCustomKeypad ? (
                      <div
                        role="textbox"
                        aria-label="Answer"
                        aria-readonly="true"
                        className={`h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono max-w-[200px] mx-auto rounded-2xl border border-input bg-background px-3 flex items-center justify-center ${
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
                        className="h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono max-w-[200px] mx-auto"
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricTile label="Correct" value={correctCount} />
            <MetricTile label="Streak" value={streak} />
            <MetricTile label="Accuracy" value={`${accuracy}%`} />
            <MetricTile label="Avg time" value={`${avgTime > 0 ? avgTime.toFixed(1) : "0"}s`} />
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

export function FocusedTrainingClient() {
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
