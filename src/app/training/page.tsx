"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  Flame,
  Target,
  Clock,
  Check,
  X,
  RotateCcw,
  Play,
  Square,
} from "lucide-react";

type Operation = "+" | "-" | "×" | "÷";
type Difficulty = "easy" | "medium" | "hard" | "expert";

interface Problem {
  a: number;
  b: number;
  operation: Operation;
  answer: number;
}

const difficultyConfig: Record<Difficulty, { maxNum: number; timeLimit: number }> = {
  easy: { maxNum: 12, timeLimit: 10 },
  medium: { maxNum: 25, timeLimit: 8 },
  hard: { maxNum: 50, timeLimit: 6 },
  expert: { maxNum: 100, timeLimit: 4 },
};

function generateProblem(operation: Operation, difficulty: Difficulty): Problem {
  const { maxNum } = difficultyConfig[difficulty];
  let a: number, b: number, answer: number;

  switch (operation) {
    case "+":
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * maxNum) + 1;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * maxNum) + 1;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case "×":
      a = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
      b = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
      answer = a * b;
      break;
    case "÷":
      b = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
      answer = Math.floor(Math.random() * Math.min(maxNum, 12)) + 1;
      a = b * answer;
      break;
    default:
      a = 1;
      b = 1;
      answer = 2;
  }

  return { a, b, operation, answer };
}

export default function TrainingPage() {
  const [selectedOperation, setSelectedOperation] = useState<Operation>("+");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [avgTime, setAvgTime] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  const operations: { op: Operation; label: string }[] = [
    { op: "+", label: "Add" },
    { op: "-", label: "Subtract" },
    { op: "×", label: "Multiply" },
    { op: "÷", label: "Divide" },
  ];

  const startNewProblem = useCallback(() => {
    const newProblem = generateProblem(selectedOperation, difficulty);
    setProblem(newProblem);
    setUserAnswer("");
    setIsCorrect(null);
    setTimeLeft(difficultyConfig[difficulty].timeLimit);
    setStartTime(Date.now());
    inputRef.current?.focus();
  }, [selectedOperation, difficulty]);

  const startTraining = () => {
    setIsPlaying(true);
    setStreak(0);
    setTotalSolved(0);
    setTotalCorrect(0);
    setTimes([]);
    setAvgTime(0);
    startNewProblem();
  };

  const stopTraining = () => {
    setIsPlaying(false);
    setProblem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problem || !isPlaying) return;

    const answerNum = parseInt(userAnswer);
    const correct = answerNum === problem.answer;
    const timeTaken = (Date.now() - startTime) / 1000;

    setIsCorrect(correct);
    setTotalSolved((prev) => prev + 1);

    if (correct) {
      setTotalCorrect((prev) => prev + 1);
      setStreak((prev) => prev + 1);
      setTimes((prev) => {
        const newTimes = [...prev, timeTaken];
        setAvgTime(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        return newTimes;
      });
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      startNewProblem();
    }, 600);
  };

  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsCorrect(false);
          setStreak(0);
          setTotalSolved((p) => p + 1);
          setTimeout(() => startNewProblem(), 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, startNewProblem]);

  const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

  return (
    <div className="min-h-screen">
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <h1 className="text-lg font-semibold">Training</h1>
          <p className="text-sm text-muted-foreground">
            Practice mental math at your own pace
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {!isPlaying ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Operation Selection */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Operation</label>
                    <div className="grid grid-cols-4 gap-2">
                      {operations.map(({ op, label }) => (
                        <button
                          key={op}
                          onClick={() => setSelectedOperation(op)}
                          className={`p-4 rounded-lg border text-center transition-colors ${
                            selectedOperation === op
                              ? "border-foreground bg-secondary"
                              : "border-border hover:bg-secondary/50"
                          }`}
                        >
                          <span className="text-2xl font-mono block mb-1">{op}</span>
                          <span className="text-xs text-muted-foreground">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty Selection */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Difficulty</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(["easy", "medium", "hard", "expert"] as Difficulty[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`py-2 px-3 rounded-lg border text-sm capitalize transition-colors ${
                            difficulty === d
                              ? "border-foreground bg-secondary font-medium"
                              : "border-border hover:bg-secondary/50"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Start Button */}
                  <Button onClick={startTraining} className="w-full" size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Start Training
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Timer */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Time remaining</span>
                <span className="font-mono">{timeLeft}s</span>
              </div>
              <Progress
                value={(timeLeft / difficultyConfig[difficulty].timeLimit) * 100}
                className="h-1"
              />

              {/* Problem Display */}
              <Card className={`transition-colors ${
                isCorrect === true ? "border-success" : isCorrect === false ? "border-destructive" : ""
              }`}>
                <CardContent className="p-12">
                  {problem && (
                    <div className="text-center">
                      <div className="text-6xl font-mono font-semibold tracking-wide mb-8">
                        {problem.a} {problem.operation} {problem.b}
                      </div>

                      <form onSubmit={handleSubmit}>
                        <Input
                          ref={inputRef}
                          type="number"
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="?"
                          className="h-14 text-center text-2xl font-mono max-w-[200px] mx-auto"
                          autoFocus
                        />
                      </form>

                      {isCorrect === false && (
                        <p className="text-sm text-muted-foreground mt-4">
                          Answer: <span className="font-mono font-medium text-foreground">{problem.answer}</span>
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-mono font-semibold">{totalSolved}</p>
                  <p className="text-xs text-muted-foreground">Problems</p>
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
                  <p className="text-2xl font-mono font-semibold">{avgTime.toFixed(1)}s</p>
                  <p className="text-xs text-muted-foreground">Avg Time</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={stopTraining}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
                <Button variant="outline" onClick={startNewProblem}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Skip
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
