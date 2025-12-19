"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { MobileNumpad } from "@/components/ui/mobile-numpad";
import {
  RotateCcw,
  Play,
  Square,
  Timer,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Lightbulb,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  CornerDownLeft,
  Wand2,
  AlertCircle,
  Target,
  Circle,
  Copy,
  Divide,
  LayoutGrid,
  Shuffle,
} from "lucide-react";
import Link from "next/link";
import { TRAINING_SKILLS, SkillId } from "@/lib/training-skills";
import { useIsMobileDevice } from "@/hooks/use-is-mobile-device";
import { DEFAULT_TIMED_TRAINING_SETTINGS } from "@/lib/training-settings";

type Operation = "+" | "-" | "×" | "÷";
type Difficulty = "easy" | "medium" | "hard" | "expert";
type GameMode = "timed" | "practice" | "learning";
type SubmitMode = "manual" | "auto";

type ScoreBucket = {
  from: number;
  to: number;
  count: number;
};

type ScoreDistribution = {
  percentile: number | null;
  bucket: string | null;
  total: number | null;
  score: number | null;
  buckets: ScoreBucket[];
  maxCount: number;
  userBucketIndex: number | null;
};

interface Problem {
  a: number;
  b: number;
  operation: Operation;
  answer: number;
}

interface OperationRange {
  min: number;
  max: number;
}

interface MathTip {
  title: string;
  description: string;
  steps: string[];
  technique: string;
}

type OperationRanges = Record<Operation, OperationRange>;

interface DifficultySettings {
  label: string;
  addSubMax: number;
  mulTableMax: number;
  mulWideMax: number;
  timeLimit: number;
  description: string;
}

const difficultyConfig: Record<Difficulty, DifficultySettings> = {
  easy: { 
    label: "Easy",
    addSubMax: 20, 
    mulTableMax: 10,
    mulWideMax: 10,
    timeLimit: 12,
    description: "Numbers 1-20 for +/−, 1-10 for ×/÷"
  },
  medium: { 
    label: "Medium",
    addSubMax: 100, 
    mulTableMax: 12,
    mulWideMax: 100,
    timeLimit: 10,
    description: "Add/Sub 2-100 • × 2-12 × 2-100 • ÷ dividend ≤100, divisors 2-12 (no 1s/0)"
  },
  hard: { 
    label: "Hard",
    addSubMax: 150, 
    mulTableMax: 15,
    mulWideMax: 150,
    timeLimit: 8,
    description: "Add/Sub 3-150 • × 3-15 × 3-150 • ÷ dividend ≤150, divisors 2-15 (no 1s/0)"
  },
  expert: { 
    label: "Expert",
    addSubMax: 200, 
    mulTableMax: 20,
    mulWideMax: 200,
    timeLimit: 6,
    description: "Add/Sub 4-200 • × 4-20 × 4-200 • ÷ dividend ≤200, divisors 3-20 (no 1s/0)"
  },
};

const difficultyGuardrails: Record<
  Difficulty,
  { minOperand: number; minDifference: number; minDivisor: number; minQuotient: number }
> = {
  easy: { minOperand: 1, minDifference: 0, minDivisor: 1, minQuotient: 1 },
  medium: { minOperand: 2, minDifference: 1, minDivisor: 2, minQuotient: 2 },
  hard: { minOperand: 3, minDifference: 1, minDivisor: 2, minQuotient: 2 },
  expert: { minOperand: 4, minDifference: 1, minDivisor: 3, minQuotient: 3 },
};

const defaultRanges: OperationRanges = {
  "+": { min: 1, max: 100 },
  "-": { min: 1, max: 100 },
  "×": { min: 1, max: 12 },
  "÷": { min: 1, max: 12 },
};

function getPresetRanges(difficulty: Difficulty): OperationRanges {
  const config = difficultyConfig[difficulty];
  const guardrails = difficultyGuardrails[difficulty];
  return {
    "+": { min: guardrails.minOperand, max: config.addSubMax },
    "-": { min: guardrails.minOperand, max: config.addSubMax },
    "×": { min: guardrails.minOperand, max: config.mulWideMax },
    "÷": { min: guardrails.minDivisor, max: config.mulWideMax },
  };
}

const timedModeLimits = [60, 120, 180, 300];
const practiceTimerOptions = [5, 8, 10, 12, 15, 20, 30];

// ============================================
// MENTAL MATH TIPS SYSTEM
// Inspired by Arthur Benjamin's "Secrets of Mental Math"
// ============================================

function getAdditionTip(a: number, b: number): MathTip {
  const answer = a + b;
  
  // Check for complements of 10
  if (a % 10 + b % 10 === 10 && a >= 10 && b >= 10) {
    const tensA = Math.floor(a / 10);
    const tensB = Math.floor(b / 10);
    return {
      title: "Complements of 10",
      technique: "When ones digits add to 10, carry becomes automatic",
      description: `Notice that ${a % 10} + ${b % 10} = 10. This means the ones digit is 0 and you carry 1.`,
      steps: [
        `Ones: ${a % 10} + ${b % 10} = 10 → write 0, carry 1`,
        `Tens: ${tensA} + ${tensB} + 1 (carry) = ${tensA + tensB + 1}`,
        `Answer: ${answer}`,
      ],
    };
  }

  // Round and adjust
  const nearestTenB = Math.round(b / 10) * 10;
  const adjustment = nearestTenB - b;
  if (Math.abs(adjustment) <= 3 && Math.abs(adjustment) > 0 && b >= 10) {
    return {
      title: "Round and Adjust",
      technique: "Round one number to make addition easier, then adjust",
      description: `Round ${b} to ${nearestTenB} for easier math, then ${adjustment > 0 ? "subtract" : "add"} ${Math.abs(adjustment)}.`,
      steps: [
        `Round: ${b} → ${nearestTenB} (${adjustment > 0 ? "+" : ""}${adjustment})`,
        `Add rounded: ${a} + ${nearestTenB} = ${a + nearestTenB}`,
        `Adjust: ${a + nearestTenB} ${adjustment > 0 ? "-" : "+"} ${Math.abs(adjustment)} = ${answer}`,
      ],
    };
  }

  // Left-to-right addition (for larger numbers)
  if (a >= 10 || b >= 10) {
    // Handle 3-digit numbers
    if (a >= 100 || b >= 100) {
      const hundredsA = Math.floor(a / 100) * 100;
      const tensA = Math.floor((a % 100) / 10) * 10;
      const onesA = a % 10;
      const hundredsB = Math.floor(b / 100) * 100;
      const tensB = Math.floor((b % 100) / 10) * 10;
      const onesB = b % 10;
      return {
        title: "Left-to-Right Addition",
        technique: "Start with hundreds, then tens, then ones—like reading!",
        description: "Add from the largest column first. This gives you the big picture immediately.",
        steps: [
          `Add hundreds: ${hundredsA} + ${hundredsB} = ${hundredsA + hundredsB}`,
          `Add tens to total: ${hundredsA + hundredsB} + ${tensA + tensB} = ${hundredsA + hundredsB + tensA + tensB}`,
          `Add ones to total: ${hundredsA + hundredsB + tensA + tensB} + ${onesA + onesB} = ${answer}`,
        ],
      };
    }
    
    // 2-digit numbers
    const tensA = Math.floor(a / 10) * 10;
    const onesA = a % 10;
    const tensB = Math.floor(b / 10) * 10;
    const onesB = b % 10;
    return {
      title: "Left-to-Right Addition",
      technique: "Add tens first, then add ones to that total",
      description: "Unlike school math, adding left-to-right is faster because you get the big picture first.",
      steps: [
        `Add tens: ${tensA} + ${tensB} = ${tensA + tensB}`,
        `Add ones to total: ${tensA + tensB} + ${onesA} + ${onesB} = ${answer}`,
      ],
    };
  }

  // Simple addition for small numbers
  return {
    title: "Basic Addition",
    technique: "For small numbers, direct computation is fastest",
    description: "When both numbers are small, just add directly—speed comes with memorization.",
    steps: [
      `Simply add: ${a} + ${b} = ${answer}`,
    ],
  };
}

function getSubtractionTip(a: number, b: number): MathTip {
  const answer = a - b;

  // Subtraction by Complements - for messy numbers close to round numbers
  const nearestHundred = Math.round(b / 100) * 100;
  const hundredDiff = nearestHundred - b;
  if (nearestHundred > 0 && Math.abs(hundredDiff) <= 15 && Math.abs(hundredDiff) > 0 && b >= 50) {
    return {
      title: "Subtraction by Complements",
      technique: "Subtract the nearest easy number, then add back the difference",
      description: `Instead of subtracting ${b}, subtract ${nearestHundred} (easier!), then add back ${Math.abs(hundredDiff)}.`,
      steps: [
        `Find easy number: ${nearestHundred} is close to ${b}`,
        `Subtract easy number: ${a} - ${nearestHundred} = ${a - nearestHundred}`,
        `Add back difference: ${a - nearestHundred} + ${Math.abs(hundredDiff)} = ${answer}`,
      ],
    };
  }

  // Round and adjust for smaller numbers
  const nearestTenB = Math.round(b / 10) * 10;
  const adjustment = nearestTenB - b;
  if (Math.abs(adjustment) <= 3 && Math.abs(adjustment) > 0 && b >= 10 && b < 50) {
    return {
      title: "Round and Adjust",
      technique: "Round the subtracted number, then compensate",
      description: `Round ${b} to ${nearestTenB}, subtract, then ${adjustment > 0 ? "add" : "subtract"} ${Math.abs(adjustment)}.`,
      steps: [
        `Round: ${b} → ${nearestTenB} (difference: ${Math.abs(adjustment)})`,
        `Subtract rounded: ${a} - ${nearestTenB} = ${a - nearestTenB}`,
        `Adjust: ${a - nearestTenB} ${adjustment > 0 ? "+" : "-"} ${Math.abs(adjustment)} = ${answer}`,
      ],
    };
  }

  // The "Split" Subtraction - subtract tens then ones
  if (a >= 10 && b >= 10) {
    const tensB = Math.floor(b / 10) * 10;
    const onesB = b % 10;
    
    return {
      title: "The Split Subtraction",
      technique: "Subtract the tens digit first, then subtract the ones digit",
      description: `Break ${b} into ${tensB} and ${onesB}. Subtract each part step by step.`,
      steps: [
        `Subtract tens: ${a} - ${tensB} = ${a - tensB}`,
        `Subtract ones: ${a - tensB} - ${onesB} = ${answer}`,
      ],
    };
  }

  // Add-up method (think: what do I add to b to get a?)
  if (b > 5 && a - b < 15) {
    return {
      title: "Add-Up Method",
      technique: "Instead of subtracting, think: 'What do I add to get there?'",
      description: `Think: "${b} + ? = ${a}" This is often easier than subtraction.`,
      steps: [
        `From ${b}, how far to ${a}?`,
        `${b} + ${answer} = ${a}`,
        `Answer: ${answer}`,
      ],
    };
  }

  // Simple subtraction
  return {
    title: "Basic Subtraction",
    technique: "For simple cases, direct computation works well",
    description: "Practice makes this automatic—visualize the number line.",
    steps: [
      `Calculate: ${a} - ${b} = ${answer}`,
    ],
  };
}

function getMultiplicationTip(a: number, b: number): MathTip {
  const answer = a * b;
  
  // Multiplying by 11
  if (b === 11 && a >= 10 && a <= 99) {
    const tens = Math.floor(a / 10);
    const ones = a % 10;
    const middle = tens + ones;
    if (middle < 10) {
      return {
        title: "The 11 Trick",
        technique: "Separate the digits, add them together, put the sum in the middle",
        description: `For ${a} × 11: split into ${tens} and ${ones}, add to get ${middle}, place in middle.`,
        steps: [
          `Split ${a} into digits: ${tens} and ${ones}`,
          `Add them: ${tens} + ${ones} = ${middle}`,
          `Put sum in middle: ${tens}${middle}${ones} = ${answer}`,
        ],
      };
    } else {
      return {
        title: "The 11 Trick (with carry)",
        technique: "Add digits in middle; if ≥10, carry the 1 to the left digit",
        description: `The middle sum ${middle} is ≥10, so we carry the 1.`,
        steps: [
          `Split ${a}: ${tens} and ${ones}`,
          `Middle: ${tens} + ${ones} = ${middle} (≥10, so carry 1)`,
          `Result: ${tens + 1}${middle % 10}${ones} = ${answer}`,
        ],
      };
    }
  }
  
  if (a === 11 && b >= 10 && b <= 99) {
    const tens = Math.floor(b / 10);
    const ones = b % 10;
    const middle = tens + ones;
    if (middle < 10) {
      return {
        title: "The 11 Trick",
        technique: "Separate the digits, add them together, put the sum in the middle",
        description: `For ${b} × 11: split into ${tens} and ${ones}, add to get ${middle}, place in middle.`,
        steps: [
          `Split ${b} into digits: ${tens} and ${ones}`,
          `Add them: ${tens} + ${ones} = ${middle}`,
          `Put sum in middle: ${tens}${middle}${ones} = ${answer}`,
        ],
      };
    }
  }

  // Squaring numbers ending in 5
  if (a === b && a % 10 === 5 && a >= 15) {
    const tens = Math.floor(a / 10);
    return {
      title: "Squaring Numbers Ending in 5",
      technique: "Multiply tens digit by (tens digit + 1), then append 25",
      description: `For ${a}²: ${tens} × ${tens + 1} = ${tens * (tens + 1)}, then put 25 at the end.`,
      steps: [
        `Take the tens digit: ${tens}`,
        `Multiply by next number: ${tens} × ${tens + 1} = ${tens * (tens + 1)}`,
        `Append 25: ${tens * (tens + 1)}25 = ${answer}`,
      ],
    };
  }

  // Squaring numbers ending in 1
  if (a === b && a % 10 === 1 && a >= 11) {
    const roundDown = a - 1; // nearest number ending in 0
    const roundDownSquared = roundDown * roundDown;
    return {
      title: "Squaring Numbers Ending in 1",
      technique: "Square the nearest round number, add it, then add the original",
      description: `For ${a}²: square ${roundDown}, add ${roundDown}, then add ${a}.`,
      steps: [
        `Square nearest 10: ${roundDown}² = ${roundDownSquared}`,
        `Add the round number: ${roundDownSquared} + ${roundDown} = ${roundDownSquared + roundDown}`,
        `Add original: ${roundDownSquared + roundDown} + ${a} = ${answer}`,
      ],
    };
  }

  // Squaring any 2-digit number (The Duplex/Distance Method)
  if (a === b && a >= 10 && a <= 99) {
    const nearestTen = Math.round(a / 10) * 10;
    // Actually: (a - d)(a + d) + d² = a² - d² + d² = a²
    // So: round to nearest 10, adjust other factor opposite, multiply, add distance²
    const baseFactor = nearestTen;
    const distanceFromBase = a - baseFactor;
    const otherNum = a + distanceFromBase; // if a=23, base=20, dist=3, other=26
    // Wait, let me reconsider: For 23², we want 20 × 26 + 3² = 520 + 9 = 529
    // baseFactor = 20, a = 23, distanceFromBase = 3, otherNum = 26
    if (Math.abs(distanceFromBase) > 0 && Math.abs(distanceFromBase) <= 5) {
      return {
        title: "The Duplex Method",
        technique: "Round to nearest 10, adjust other factor opposite direction, multiply, add distance²",
        description: `Round ${a} to ${baseFactor}. Move the other factor to ${otherNum}. Multiply, then add ${Math.abs(distanceFromBase)}².`,
        steps: [
          `Round ${a} to ${baseFactor} (distance: ${Math.abs(distanceFromBase)})`,
          `Adjust opposite: ${a} + ${Math.abs(distanceFromBase)} = ${otherNum}`,
          `Multiply: ${baseFactor} × ${otherNum} = ${baseFactor * otherNum}`,
          `Add distance²: ${baseFactor * otherNum} + ${distanceFromBase * distanceFromBase} = ${answer}`,
        ],
      };
    }
  }

  // Multiplying numbers "close together" (same tens digit or close)
  const tensA = Math.floor(a / 10) * 10;
  const tensB = Math.floor(b / 10) * 10;
  if (tensA === tensB && tensA >= 10 && a !== b) {
    const base = tensA;
    const onesA = a % 10;
    const onesB = b % 10;
    // Method: (base + onesA)(base + onesB) = base² + base(onesA + onesB) + onesA × onesB
    // Or: Add ones of second to first, multiply by base, add product of ones
    // 23 × 27: (23 + 7) × 20 + 3 × 7 = 30 × 20 + 21 = 600 + 21 = 621
    const step1 = a + onesB; // add ones of b to a
    const step2 = step1 * base; // multiply by base
    const step3 = onesA * onesB; // product of ones
    return {
      title: "Numbers Close Together",
      technique: "Add the ones digit of one number to the other, multiply by the base, add product of ones",
      description: `Both numbers share base ${base}. Add ${onesB} to ${a}, multiply by ${base}, add ${onesA} × ${onesB}.`,
      steps: [
        `Add ones of ${b} to ${a}: ${a} + ${onesB} = ${step1}`,
        `Multiply by base ${base}: ${step1} × ${base} = ${step2}`,
        `Add product of ones: ${onesA} × ${onesB} = ${step3}`,
        `Total: ${step2} + ${step3} = ${answer}`,
      ],
    };
  }

  // Multiplying by 5
  if (b === 5 || a === 5) {
    const other = b === 5 ? a : b;
    const half = other / 2;
    return {
      title: "Multiply by 5",
      technique: "Cut the number in half, then multiply by 10",
      description: `${other} × 5 = (${other} ÷ 2) × 10 = ${half} × 10 = ${answer}`,
      steps: [
        `Halve the number: ${other} ÷ 2 = ${half}`,
        `Multiply by 10: ${half} × 10 = ${answer}`,
      ],
    };
  }

  // Multiplying by 9
  if (b === 9 || a === 9) {
    const other = b === 9 ? a : b;
    return {
      title: "Multiply by 9",
      technique: "Multiply by 10, then subtract the original number",
      description: `${other} × 9 = (${other} × 10) - ${other} = ${other * 10} - ${other}`,
      steps: [
        `Multiply by 10: ${other} × 10 = ${other * 10}`,
        `Subtract original: ${other * 10} - ${other} = ${answer}`,
      ],
    };
  }
  
  // Multiplying by 4
  if (b === 4 || a === 4) {
    const other = b === 4 ? a : b;
    return {
      title: "Multiply by 4",
      technique: "Double the number, then double it again",
      description: `${other} × 4 = double(double(${other}))`,
      steps: [
        `First double: ${other} × 2 = ${other * 2}`,
        `Double again: ${other * 2} × 2 = ${answer}`,
      ],
    };
  }

  // Distributive property (breaking apart)
  if (a >= 10 || b >= 10) {
    const larger = Math.max(a, b);
    const smaller = Math.min(a, b);
    const tens = Math.floor(larger / 10) * 10;
    const ones = larger % 10;
    
    if (ones > 0) {
      return {
        title: "Break Apart (Distributive)",
        technique: "Split one number into tens and ones, multiply separately",
        description: `${smaller} × ${larger} = ${smaller} × ${tens} + ${smaller} × ${ones}`,
        steps: [
          `Break ${larger} into ${tens} + ${ones}`,
          `${smaller} × ${tens} = ${smaller * tens}`,
          `${smaller} × ${ones} = ${smaller * ones}`,
          `Add: ${smaller * tens} + ${smaller * ones} = ${answer}`,
        ],
      };
    }
  }

  // Basic multiplication
  return {
    title: "Basic Multiplication",
    technique: "Use your times tables—memorization is key!",
    description: `${a} × ${b} = ${answer}. Practice until these become instant recall.`,
    steps: [
      `${a} × ${b} = ${answer}`,
    ],
  };
}

function getDivisionTip(a: number, b: number): MathTip {
  const answer = a / b;

  // Dividing by 5
  if (b === 5) {
    return {
      title: "Divide by 5",
      technique: "Multiply by 2, then divide by 10 (move decimal left)",
      description: `${a} ÷ 5 = (${a} × 2) ÷ 10 = ${a * 2} ÷ 10 = ${answer}`,
      steps: [
        `Double the number: ${a} × 2 = ${a * 2}`,
        `Divide by 10: ${a * 2} ÷ 10 = ${answer}`,
      ],
    };
  }

  // Dividing by 4
  if (b === 4) {
    return {
      title: "Divide by 4",
      technique: "Halve the number twice",
      description: `${a} ÷ 4 = (${a} ÷ 2) ÷ 2`,
      steps: [
        `First half: ${a} ÷ 2 = ${a / 2}`,
        `Second half: ${a / 2} ÷ 2 = ${answer}`,
      ],
    };
  }

  // Dividing by 9
  if (b === 9) {
    return {
      title: "Divide by 9",
      technique: "Think of the inverse multiplication using the ×9 trick",
      description: `Think: "What × 9 = ${a}?" Check: ${answer} × 9 = ${answer} × 10 - ${answer} = ${a}`,
      steps: [
        `Think: ? × 9 = ${a}`,
        `Verify: ${answer} × 10 = ${answer * 10}`,
        `Subtract: ${answer * 10} - ${answer} = ${a} ✓`,
      ],
    };
  }

  // Factor method
  if (b >= 6 && b <= 12) {
    return {
      title: "Inverse Multiplication",
      technique: "Think of division as finding the missing factor",
      description: `Think: "${b} × ? = ${a}". If you know ${b} × ${answer} = ${a}, you have your answer!`,
      steps: [
        `Reframe: ${b} × ? = ${a}`,
        `From times tables: ${b} × ${answer} = ${a}`,
        `Answer: ${answer}`,
      ],
    };
  }

  // Basic division
  return {
    title: "Basic Division",
    technique: "Use multiplication facts in reverse",
    description: `${a} ÷ ${b} = ${answer}. Think: "${b} × ${answer} = ${a}"`,
    steps: [
      `${a} ÷ ${b} = ${answer}`,
    ],
  };
}

function getTipForProblem(problem: Problem): MathTip {
  switch (problem.operation) {
    case "+":
      return getAdditionTip(problem.a, problem.b);
    case "-":
      return getSubtractionTip(problem.a, problem.b);
    case "×":
      return getMultiplicationTip(problem.a, problem.b);
    case "÷":
      return getDivisionTip(problem.a, problem.b);
    default:
      return {
        title: "Basic Calculation",
        technique: "Standard arithmetic",
        description: "Calculate step by step.",
        steps: [`${problem.a} ${problem.operation} ${problem.b} = ${problem.answer}`],
      };
  }
}

// ============================================

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function randomInt(min: number, max: number): number {
  const adjustedMin = Math.min(min, max);
  const adjustedMax = Math.max(min, max);
  return Math.floor(Math.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin;
}

function generateProblem(
  operation: Operation,
  difficulty: Difficulty,
  useAdvanced: boolean,
  ranges: OperationRanges
): Problem {
  let a: number, b: number, answer: number;

  if (useAdvanced) {
    const range = ranges[operation];
    const min = Math.min(range.min, range.max);
    const max = Math.max(range.min, range.max);

    switch (operation) {
      case "+":
        a = randomInt(min, max);
        b = randomInt(min, max);
        answer = a + b;
        break;
      case "-":
        a = randomInt(min, max);
        b = randomInt(min, max);
        if (b > a) [a, b] = [b, a]; // ensure non-negative answers
        answer = a - b;
        break;
      case "×":
        a = randomInt(min, max);
        b = randomInt(min, max);
        answer = a * b;
        break;
      case "÷": {
        // Keep BOTH displayed numbers (dividend 'a' and divisor 'b') within [min,max],
        // while ensuring an integer quotient.
        const guardrails = difficultyGuardrails[difficulty];
        const divisorMin = Math.max(min, guardrails.minDivisor);
        const divisorMax = Math.max(divisorMin, max);
        const quotientMin = Math.max(1, guardrails.minQuotient);

        // Try a few times to find a valid (a,b) within range.
        for (let i = 0; i < 200; i++) {
          b = randomInt(divisorMin, divisorMax);
          const minQuotForA = Math.ceil(min / b);
          const answerMin = Math.max(quotientMin, minQuotForA);
          const answerMax = Math.floor(max / b);
          if (answerMin > answerMax) continue;
          answer = randomInt(answerMin, answerMax);
          a = b * answer;
          // a will be within [min,max] by construction
          return { a, b, operation, answer };
        }

        // Fallback: smallest valid division in range
        b = divisorMin;
        answer = Math.max(quotientMin, 1);
        a = b * answer;
        // If this overshoots max (very tight ranges), clamp answer down
        if (a > max) {
          answer = Math.max(1, Math.floor(max / b));
          a = b * answer;
        }
        break;
      }
      default:
        a = 1;
        b = 1;
        answer = 2;
    }
  } else {
    const config = difficultyConfig[difficulty];
    const guardrails = difficultyGuardrails[difficulty];
    const addSubMin = guardrails.minOperand;
    const mulDivMin = guardrails.minOperand;
    const addSubMax = Math.max(addSubMin, config.addSubMax);
    const mulTableMax = Math.max(mulDivMin, config.mulTableMax);
    const mulWideMax = Math.max(mulDivMin, config.mulWideMax);

    switch (operation) {
      case "+":
        a = randomInt(addSubMin, addSubMax);
        b = randomInt(addSubMin, addSubMax);
        answer = a + b;
        break;
      case "-": {
        const minDifference = guardrails.minDifference;
        a = randomInt(addSubMin + minDifference, addSubMax);
        const maxForB = Math.max(addSubMin, a - minDifference);
        b = randomInt(addSubMin, maxForB);
        if (b > a) [a, b] = [b, a];
        answer = a - b;
        break;
      }
      case "×": {
        const small = randomInt(mulDivMin, mulTableMax);
        const wide = randomInt(mulDivMin, mulWideMax);
        // Randomize order so operands don't feel patterned
        if (Math.random() < 0.5) {
          a = small;
          b = wide;
        } else {
          a = wide;
          b = small;
        }
        answer = a * b;
        break;
      }
      case "÷": {
        const divisorMin = guardrails.minDivisor;
        const quotientMin = guardrails.minQuotient;
        const divisorMax = Math.max(divisorMin, mulTableMax);
        const quotientMax = Math.max(quotientMin, mulWideMax);
        // Keep BOTH displayed numbers (dividend 'a' and divisor 'b') within the
        // difficulty's max number range (mulWideMax), while ensuring an integer quotient.
        for (let i = 0; i < 200; i++) {
          b = randomInt(divisorMin, divisorMax);
          const answerMax = Math.min(quotientMax, Math.floor(mulWideMax / b));
          const answerMin = Math.max(quotientMin, 1);
          if (answerMin > answerMax) continue;
          answer = randomInt(answerMin, answerMax);
          a = b * answer;
          return { a, b, operation, answer };
        }

        // Fallback: smallest valid division (still within bounds)
        b = divisorMin;
        answer = Math.max(quotientMin, 1);
        a = b * answer;
        if (a > mulWideMax) {
          answer = Math.max(1, Math.floor(mulWideMax / b));
          a = b * answer;
        }
        break;
      }
      default:
        a = 1;
        b = 1;
        answer = 2;
    }
  }

  return { a, b, operation, answer };
}

export default function TrainingPage() {
  const { data: authSession } = useSession();
  
  const [selectedOperations, setSelectedOperations] = useState<Operation[]>(["+", "-", "×", "÷"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [gameMode, setGameMode] = useState<GameMode>("timed");
  const [timedModeLimit, setTimedModeLimit] = useState(120);
  const [practiceTimerLimit, setPracticeTimerLimit] = useState(10);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [submitMode, setSubmitMode] = useState<SubmitMode>("auto");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customRangesTouched, setCustomRangesTouched] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [operationRanges, setOperationRanges] = useState<OperationRanges>(defaultRanges);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [overallTimeLeft, setOverallTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [avgTime, setAvgTime] = useState(0);
  const [, setTimes] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [guestId, setGuestId] = useState<string | null>(null);
  const guestSubmittedRef = useRef(false);
  const sessionPromiseRef = useRef<Promise<string | null> | null>(null);
  const [scorePercentile, setScorePercentile] = useState<ScoreDistribution | null>(null);
  
  // Learning mode state
  const [showTip, setShowTip] = useState(true);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [tipExpanded, setTipExpanded] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<SkillId | null>(null);
  
  // Session tracking for database persistence
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const bestStreakRef = useRef<number>(0);
  
  // Operation queue for even distribution
  const operationQueueRef = useRef<Operation[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerAndProblemRef = useRef<HTMLDivElement>(null);
  const isMobileDevice = useIsMobileDevice();
  const useCustomKeypad = isMobileDevice;
  const showCustomKeypad = useCustomKeypad && isPlaying && !!problem && !(gameMode === "learning" && hasAnswered);
  const answerInputDisabled = !isPlaying || !problem || hasAnswered;

  // On mobile, keep the timer + question card in view when the custom keypad is open / problem changes.
  useEffect(() => {
    if (!showCustomKeypad) return;
    const node = timerAndProblemRef.current;
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
  }, [showCustomKeypad, problem?.a, problem?.b, problem?.operation]);

  // Load user settings on mount
  useEffect(() => {
    if (!authSession?.user || settingsLoaded) return;
    
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          
          // Apply default timer setting (convert "10s" -> 10)
          if (data.settings?.defaultTimer) {
            const timerValue = parseInt(data.settings.defaultTimer.replace("s", ""));
            if (!isNaN(timerValue) && practiceTimerOptions.includes(timerValue)) {
              setPracticeTimerLimit(timerValue);
            }
          }
          
          // Apply default difficulty setting (convert "Medium" -> "medium")
          if (data.settings?.defaultDifficulty) {
            const diffValue = data.settings.defaultDifficulty.toLowerCase() as Difficulty;
            if (["easy", "medium", "hard", "expert"].includes(diffValue)) {
              setDifficulty(diffValue);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load user settings:", error);
      } finally {
        setSettingsLoaded(true);
      }
    }
    
    loadSettings();
  }, [authSession?.user, settingsLoaded]);
  
  // Get next operation from queue, refilling with shuffled operations when empty
  const getNextOperation = useCallback(() => {
    if (operationQueueRef.current.length === 0) {
      operationQueueRef.current = shuffleArray([...selectedOperations]);
    }
    return operationQueueRef.current.shift()!;
  }, [selectedOperations]);

  const operations: { op: Operation; label: string }[] = [
    { op: "+", label: "Add" },
    { op: "-", label: "Subtract" },
    { op: "×", label: "Multiply" },
    { op: "÷", label: "Divide" },
  ];

  const toggleOperation = (op: Operation) => {
    setSelectedOperations((prev) => {
      if (prev.includes(op)) {
        if (prev.length === 1) return prev; // Must have at least one
        return prev.filter((o) => o !== op);
      }
      return [...prev, op];
    });
  };

  const updateRange = (op: Operation, field: "min" | "max", value: number) => {
    setCustomRangesTouched(true);
    setOperationRanges((prev) => ({
      ...prev,
      [op]: { ...prev[op], [field]: value },
    }));
  };

  const startNewProblem = useCallback(() => {
    // If a specific skill is selected in learning mode, use that generator
    if (gameMode === "learning" && selectedSkill) {
      const skill = TRAINING_SKILLS.find(s => s.id === selectedSkill);
      if (skill) {
        const presetRanges = getPresetRanges(difficulty);
        const effectiveRange = showAdvanced ? operationRanges[skill.operation] : presetRanges[skill.operation];
        const newProblem = skill.generateProblem({ range: effectiveRange });
        setProblem(newProblem);
        setUserAnswer("");
        setIsCorrect(null);
        setHasAnswered(false);
        setStartTime(Date.now());
        inputRef.current?.focus();
        return;
      }
    }

    const nextOperation = getNextOperation();
    const newProblem = generateProblem(nextOperation, difficulty, showAdvanced, operationRanges);
    setProblem(newProblem);
    setUserAnswer("");
    setIsCorrect(null);
    setHasAnswered(false);
    if (gameMode === "practice") {
      setTimeLeft(practiceTimerLimit);
    }
    setStartTime(Date.now());
    inputRef.current?.focus();
  }, [getNextOperation, difficulty, gameMode, showAdvanced, operationRanges, selectedSkill, practiceTimerLimit]);

  // When advanced ranges are shown for the first time (or before the user edits),
  // prefill with the preset for the current difficulty.
  useEffect(() => {
    if (!showAdvanced) return;
    if (customRangesTouched) return;
    setOperationRanges(getPresetRanges(difficulty));
  }, [showAdvanced, difficulty, customRangesTouched]);

  const ensureGuestId = async () => {
    if (authSession?.user) return;
    if (guestId) return;
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem("guestLeaderboardId");
    if (existing) {
      setGuestId(existing);
      return;
    }
    const randomId = crypto.randomUUID();
    localStorage.setItem("guestLeaderboardId", randomId);
    setGuestId(randomId);
  };

  const startTraining = async () => {
    await ensureGuestId();
    // Reset operation queue for fresh even distribution
    operationQueueRef.current = shuffleArray([...selectedOperations]);
    
    setIsPlaying(true);
    setIsGameOver(false);
    setStreak(0);
    setTotalSolved(0);
    setTotalCorrect(0);
    setTimes([]);
    setAvgTime(0);
    setShowTip(true);
    setTipExpanded(true);
    bestStreakRef.current = 0;
    sessionStartTimeRef.current = Date.now();
    
    if (gameMode === "timed") {
      setOverallTimeLeft(timedModeLimit);
    }
    
    // Create session in database if user is logged in
    if (authSession?.user) {
      sessionPromiseRef.current = (async () => {
        try {
          const response = await fetch("/api/training/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              gameMode,
              difficulty,
              operations: selectedOperations,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setSessionId(data.sessionId);
            return data.sessionId as string;
          }
        } catch (error) {
          console.error("Failed to create session:", error);
        }
        return null;
      })();
    }
    
    guestSubmittedRef.current = false;
    setScorePercentile(null);
    
    startNewProblem();
  };

  // Record a problem attempt to the database
  const recordAttempt = useCallback(
    async (problem: Problem, userAnswerNum: number | null, correct: boolean, timeTaken: number) => {
      if (!authSession?.user) return;
      
      try {
        await fetch("/api/training/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            operandA: problem.a,
            operandB: problem.b,
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
    },
    [authSession?.user, sessionId]
  );

  const isDefaultTimedConfig = () =>
    gameMode === DEFAULT_TIMED_TRAINING_SETTINGS.gameMode &&
    difficulty === DEFAULT_TIMED_TRAINING_SETTINGS.difficulty &&
    !showAdvanced &&
    timedModeLimit === 120 &&
    selectedOperations.length === DEFAULT_TIMED_TRAINING_SETTINGS.operations.length &&
    selectedOperations.every((op) => DEFAULT_TIMED_TRAINING_SETTINGS.operations.includes(op));

  const submitGuestScore = async (solved: number, correct: number, bestStreak: number, avgTimeVal: number) => {
    if (guestSubmittedRef.current) return;
    if (!guestId) return;
    if (!isDefaultTimedConfig()) return;
    guestSubmittedRef.current = true;

    try {
      await fetch("/api/leaderboard/training/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          displayName: "Guest",
          totalProblems: solved,
          correctAnswers: correct,
          averageTime: avgTimeVal,
          bestStreak,
          gameMode,
          difficulty,
          operations: selectedOperations,
          timedModeLimit,
          showAdvanced,
        }),
      });
    } catch (error) {
      console.error("Failed to submit guest score:", error);
    }
  };

  // End the training session and save to database or guest leaderboard
  const endSession = async (solved: number, correct: number, bestStreak: number, avgTimeVal: number) => {
    if (authSession?.user) {
      let finalSessionId = sessionId;
      if (!finalSessionId && sessionPromiseRef.current) {
        finalSessionId = await sessionPromiseRef.current;
      }
      if (!finalSessionId) return;

      const duration = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
      
      try {
        await fetch("/api/training/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: finalSessionId,
            totalProblems: solved,
            correctAnswers: correct,
            duration,
            averageTime: avgTimeVal,
            bestStreak,
          }),
        });
      } catch (error) {
        console.error("Failed to end session:", error);
      }
      
      setSessionId(null);
      sessionPromiseRef.current = null;
    } else if (!authSession?.user) {
      await submitGuestScore(solved, correct, bestStreak, avgTimeVal);
    }

    if (gameMode === "timed" && isDefaultTimedConfig()) {
      const scoreForDistribution = correct;
      try {
        const res = await fetch("/api/leaderboard/training/distribution");
        if (res.ok) {
          const data = await res.json();
          const buckets: ScoreBucket[] = data.buckets || [];
          const total: number = data.total || 0;
          const maxCount = buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0);

          if (!total || buckets.length === 0) {
            setScorePercentile({
              percentile: null,
              bucket: null,
              total,
              score: scoreForDistribution,
              buckets,
              maxCount,
              userBucketIndex: null,
            });
          } else {
            let cumulative = 0;
            let bucketLabel: string | null = null;
            let userBucketIndex: number | null = null;

            for (let i = 0; i < buckets.length; i++) {
              const b = buckets[i];
              if (scoreForDistribution > b.to) {
                cumulative += b.count;
                continue;
              }

              if (scoreForDistribution >= b.from) {
                bucketLabel = `${b.from}-${b.to}`;
                userBucketIndex = i;
                cumulative += b.count;
                break;
              }

              // Score is below the first bucket; place marker at the start
              if (i === 0) {
                userBucketIndex = 0;
                bucketLabel = `${b.from}-${b.to}`;
              }
              break;
            }

            if (userBucketIndex === null && buckets.length > 0) {
              userBucketIndex = buckets.length - 1;
              bucketLabel = `${buckets[buckets.length - 1].from}-${buckets[buckets.length - 1].to}`;
              cumulative = total;
            }

            const percentile = Math.min(
              100,
              total ? Math.round((cumulative / total) * 1000) / 10 : 0
            );
            setScorePercentile({
              percentile,
              bucket: bucketLabel,
              total,
              score: scoreForDistribution,
              buckets,
              maxCount,
              userBucketIndex,
            });
          }
        }
      } catch (error) {
        console.error("Failed to compute percentile", error);
      }
    }
  };

  const stopTraining = async () => {
    // Save session before stopping if we have data
    if (totalSolved > 0) {
      await endSession(totalSolved, totalCorrect, bestStreakRef.current, avgTime);
    }
    
    setIsPlaying(false);
    setProblem(null);
    setIsGameOver(false);
    setHasAnswered(false);
  };

  const submitCurrentAnswer = () => {
    if (!problem || !isPlaying || hasAnswered) return;

    const answerNum = parseInt(userAnswer);
    if (isNaN(answerNum)) return;
    const correct = answerNum === problem.answer;
    
    // In auto-submit mode, correct answers are handled by the effect
    // Incorrect answers just clear the input (no tracking)
    if (submitMode === "auto") {
      if (correct) return; // Already handled by effect
      // Wrong answer - just clear and let them try again
      setUserAnswer("");
      setIsCorrect(false);
      setTimeout(() => setIsCorrect(null), 300);
      return;
    }
    
    const timeTaken = (Date.now() - startTime) / 1000;

    if (gameMode === "learning") {
      // Learning mode: show solution breakdown after answering
      setIsCorrect(correct);
      setHasAnswered(true);
      setTotalSolved((prev) => prev + 1);
      
      // Record attempt to database
      recordAttempt(problem, answerNum, correct, timeTaken);
      
      if (correct) {
        setTotalCorrect((prev) => prev + 1);
        setStreak((prev) => {
          const newStreak = prev + 1;
          if (newStreak > bestStreakRef.current) {
            bestStreakRef.current = newStreak;
          }
          return newStreak;
        });
        setTimes((prev) => {
          const newTimes = [...prev, timeTaken];
          setAvgTime(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
          return newTimes;
        });
      } else {
        setStreak(0);
      }
      // Don't auto-advance - let user study the solution
    } else if (gameMode === "timed") {
      // Timed mode: track all attempts for accuracy
      setIsCorrect(correct);
      setTotalSolved((prev) => prev + 1);
      
      // Record attempt to database
      recordAttempt(problem, answerNum, correct, timeTaken);
      
      if (correct) {
        setTotalCorrect((prev) => prev + 1);
        setStreak((prev) => {
          const newStreak = prev + 1;
          if (newStreak > bestStreakRef.current) {
            bestStreakRef.current = newStreak;
          }
          return newStreak;
        });
        setTimes((prev) => {
          const newTimes = [...prev, timeTaken];
          setAvgTime(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
          return newTimes;
        });
        
        setTimeout(() => {
          startNewProblem();
        }, 200);
      } else {
        // Wrong answer in Timed mode: reset streak, clear input, try again
        setStreak(0);
        setUserAnswer("");
        setTimeout(() => setIsCorrect(null), 300);
      }
    } else {
      // Practice mode: original behavior
      setIsCorrect(correct);
      setTotalSolved((prev) => prev + 1);
      
      // Record attempt to database
      recordAttempt(problem, answerNum, correct, timeTaken);

      if (correct) {
        setTotalCorrect((prev) => prev + 1);
        setStreak((prev) => {
          const newStreak = prev + 1;
          if (newStreak > bestStreakRef.current) {
            bestStreakRef.current = newStreak;
          }
          return newStreak;
        });
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
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCurrentAnswer();
  };

  // Practice mode per-question timer
  useEffect(() => {
    if (!isPlaying || gameMode !== "practice" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsCorrect(false);
          setStreak(0);
          setTotalSolved((p) => p + 1);
          
          // Record timeout as incorrect attempt
          if (problem) {
            const timeTaken = practiceTimerLimit;
            recordAttempt(problem, null, false, timeTaken);
          }
          
          setTimeout(() => startNewProblem(), 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameMode, timeLeft, startNewProblem, problem, difficulty]);

  // Timed mode overall timer
  useEffect(() => {
    if (!isPlaying || gameMode !== "timed" || overallTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setOverallTimeLeft((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, gameMode, overallTimeLeft]);

  // End session when game is over (timed mode)
  useEffect(() => {
    if (isGameOver && totalSolved > 0) {
      endSession(totalSolved, totalCorrect, bestStreakRef.current, avgTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver]);

  // Auto-submit when correct answer is typed
  useEffect(() => {
    if (!isPlaying || !problem || submitMode !== "auto" || hasAnswered) return;
    
    const answerNum = parseInt(userAnswer);
    if (!isNaN(answerNum) && answerNum === problem.answer) {
      // Correct answer typed - auto submit
      const timeTaken = (Date.now() - startTime) / 1000;
      
      setIsCorrect(true);
      setTotalSolved((prev) => prev + 1);
      setTotalCorrect((prev) => prev + 1);
      setStreak((prev) => {
        const newStreak = prev + 1;
        if (newStreak > bestStreakRef.current) {
          bestStreakRef.current = newStreak;
        }
        return newStreak;
      });
      setTimes((prev) => {
        const newTimes = [...prev, timeTaken];
        setAvgTime(newTimes.reduce((a, b) => a + b, 0) / newTimes.length);
        return newTimes;
      });
      
      // Record attempt to database (only correct attempts in auto mode)
      if (authSession?.user && sessionId) {
        recordAttempt(problem, answerNum, true, timeTaken);
      }
      
      if (gameMode === "learning") {
        setHasAnswered(true);
      } else {
        setTimeout(() => {
          startNewProblem();
        }, 200);
      }
    }
  }, [userAnswer, problem, isPlaying, submitMode, hasAnswered, startTime, gameMode, authSession, sessionId, startNewProblem, recordAttempt]);

  const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentTip = problem ? getTipForProblem(problem) : null;
  const currentConfig = difficultyConfig[difficulty];

  // Persist a guest id locally for leaderboard submissions
  useEffect(() => {
    if (guestId) return;
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem("guestLeaderboardId");
    if (existing) {
      setGuestId(existing);
      return;
    }
    const randomId = crypto.randomUUID();
    localStorage.setItem("guestLeaderboardId", randomId);
    setGuestId(randomId);
  }, [guestId]);

  // Get difficulty badge color
  const getDifficultyColor = (d: Difficulty) => {
    switch (d) {
      case "easy": return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "medium": return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "hard": return "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "expert": return "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30";
    }
  };

  const ScoreDistributionCard = ({
    data,
    heading,
    scoreLabel,
  }: {
    data: ScoreDistribution;
    heading: string;
    scoreLabel: string;
  }) => {
    const hasBuckets = data.buckets.length > 0 && data.maxCount > 0;

    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{heading}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl">
              {data.percentile !== null ? `${data.percentile}th percentile` : "Not enough data yet"}
            </p>
          </div>
          {typeof data.total === "number" ? (
            <div className="shrink-0 rounded-md border border-border bg-background/50 px-2 py-1 text-xs font-mono text-muted-foreground">
              n={data.total}
            </div>
          ) : null}
        </div>

        <div className="mt-2 text-sm text-muted-foreground">
          {scoreLabel}{" "}
          <span className="font-mono tabular-nums text-foreground">
            {typeof data.score === "number" ? data.score : "—"}
          </span>{" "}
          {data.bucket ? <span className="text-muted-foreground">(bucket {data.bucket})</span> : null}
        </div>

        {hasBuckets ? (
          <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
            <div className="flex gap-2 overflow-x-auto px-2 pb-2">
              {data.buckets.map((bucket, idx) => {
                const isUserBucket = idx === data.userBucketIndex;
                const heightPct = data.maxCount
                  ? Math.max(4, Math.round((bucket.count / data.maxCount) * 100))
                  : 4;

                return (
                  <div
                    key={`${bucket.from}-${bucket.to}`}
                    className="flex w-[44px] flex-none flex-col items-center"
                    title={`${bucket.count} runs scored between ${bucket.from}–${bucket.to}`}
                  >
                    <div className="flex h-28 w-full items-end sm:h-36">
                      <div
                        className={[
                          "w-full min-h-[3px] rounded-md transition-[height,background-color] duration-300",
                          isUserBucket
                            ? "bg-blue-600 shadow-sm dark:bg-blue-500"
                            : "bg-muted-foreground/25 dark:bg-muted-foreground/35",
                          isUserBucket
                            ? "ring-2 ring-blue-500/40 ring-offset-2 ring-offset-background"
                            : "",
                        ].join(" ")}
                        style={{ height: `${heightPct}%` }}
                        aria-label={`${bucket.count} runs scored between ${bucket.from}–${bucket.to}${
                          isUserBucket ? ", you are here" : ""
                        }`}
                      />
                    </div>

                    <span
                      className={[
                        "mt-2 text-[11px] font-mono tabular-nums leading-none",
                        isUserBucket
                          ? "font-semibold text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {bucket.count}
                    </span>
                    <span
                      className={[
                        "mt-1 text-center text-[11px] leading-tight",
                        isUserBucket
                          ? "font-semibold text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {bucket.from}–{bucket.to}
                    </span>
                    {isUserBucket ? (
                      <span className="mt-1 text-[11px] font-semibold leading-none text-blue-600 dark:text-blue-400">
                        You
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-muted-foreground">
              Distribution of best single-session scores (default timed settings)
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-background/30 p-3 text-sm text-muted-foreground">
            Distribution will appear once enough runs have been recorded.
          </div>
        )}
      </div>
    );
  };

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

      <div className={`p-4 md:p-6 ${showCustomKeypad ? "pb-[calc(env(safe-area-inset-bottom,0.5rem)+340px)]" : ""}`}>
        <div className="max-w-2xl mx-auto">
          {/* Game Over Screen for Timed Mode */}
          {isGameOver && (
            <Card>
              <CardContent className="p-4 md:p-8">
                <div className="text-center space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Time&apos;s Up!</h2>
                    <p className="text-muted-foreground">Great session!</p>
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border mt-2 ${getDifficultyColor(difficulty)}`}>
                      {currentConfig.label} difficulty
                    </div>
                  </div>
                  
                  <div className={`grid grid-cols-1 gap-4 ${submitMode === "manual" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-4xl font-mono font-bold">{totalSolved}</p>
                      <p className="text-sm text-muted-foreground">Problems Solved</p>
                    </div>
                    {submitMode === "manual" && (
                      <div className="p-4 rounded-lg bg-secondary/50">
                        <p className="text-4xl font-mono font-bold">{accuracy}%</p>
                        <p className="text-sm text-muted-foreground">Accuracy</p>
                      </div>
                    )}
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-4xl font-mono font-bold">{bestStreakRef.current}</p>
                      <p className="text-sm text-muted-foreground">Best Streak</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-4xl font-mono font-bold">{avgTime > 0 ? avgTime.toFixed(1) : "0"}s</p>
                      <p className="text-sm text-muted-foreground">Avg Time</p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button onClick={startTraining} size="lg">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                    <Button variant="outline" onClick={stopTraining} size="lg">
                      Change Settings
                    </Button>
                  </div>

                  {scorePercentile && (
                    <div className="max-w-2xl mx-auto">
                      <ScoreDistributionCard
                        data={scorePercentile}
                        heading="Your placement"
                        scoreLabel="Best score this run:"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {!isPlaying && !isGameOver ? (
            <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="space-y-6">
                    {scorePercentile && gameMode === "timed" && isDefaultTimedConfig() && (
                      <div className="max-w-2xl">
                        <ScoreDistributionCard
                          data={scorePercentile}
                          heading="Your placement (last run)"
                          scoreLabel="Best score:"
                        />
                      </div>
                    )}

                    {/* Game Mode Selection */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">Game Mode</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => setGameMode("timed")}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          gameMode === "timed"
                            ? "border-foreground bg-secondary"
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-4 h-4" />
                          <span className="font-medium">Timed</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Race the clock
                        </span>
                      </button>
                      <button
                        onClick={() => setGameMode("practice")}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          gameMode === "practice"
                            ? "border-foreground bg-secondary"
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Timer className="w-4 h-4" />
                          <span className="font-medium">Practice</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Per-question timer
                        </span>
                      </button>
                      <button
                        onClick={() => setGameMode("learning")}
                        className={`p-4 rounded-lg border text-left transition-colors ${
                          gameMode === "learning"
                            ? "border-foreground bg-secondary"
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <GraduationCap className="w-4 h-4" />
                          <span className="font-medium">Learning</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Tips & tricks
                        </span>
                      </button>
                      <Link href="/training/weak-points" className="block">
                        <div className="p-4 rounded-lg border border-border bg-secondary/30 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40 h-full">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-primary" />
                            <span className="font-medium">Weak Points</span>
                            <span className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary font-semibold">PRO</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Target problem areas
                          </span>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Learning Mode Description */}
                  {gameMode === "learning" && (
                    <div className="p-4 rounded-lg bg-linear-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                          <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                            Learn Mental Math Secrets
                          </h3>
                          <p className="text-sm text-amber-800/80 dark:text-amber-200/80">
                            Get expert tips and proven techniques. See step-by-step breakdowns for every problem!
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          Choose a Focus:
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Mixed Practice Option */}
                          <button
                            onClick={() => setSelectedSkill(null)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              selectedSkill === null
                                ? "bg-background border-amber-500 ring-1 ring-amber-500 shadow-sm"
                                : "bg-background/50 border-transparent hover:bg-background hover:border-amber-500/30"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`p-1.5 rounded-md ${selectedSkill === null ? "bg-amber-100 text-amber-700" : "bg-secondary text-muted-foreground"}`}>
                                <Shuffle className="w-4 h-4" />
                              </div>
                              <span className={`font-medium ${selectedSkill === null ? "text-foreground" : "text-muted-foreground"}`}>
                                Mixed Practice
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-9">
                              Random problems with tips as you go
                            </p>
                          </button>

                          {/* Skill Options */}
                          {TRAINING_SKILLS.map((skill) => {
                            // Dynamic icon mapping
                            const Icon = skill.iconName === "Zap" ? Zap : 
                                         skill.iconName === "Circle" ? Circle :
                                         skill.iconName === "Box" ? Square :
                                         skill.iconName === "Copy" ? Copy :
                                         skill.iconName === "Divide" ? Divide : LayoutGrid;

                            return (
                              <button
                                key={skill.id}
                                onClick={() => setSelectedSkill(skill.id)}
                                className={`relative p-3 rounded-lg border text-left transition-all ${
                                  selectedSkill === skill.id
                                    ? "bg-background border-amber-500 ring-1 ring-amber-500 shadow-sm"
                                    : "bg-background/50 border-transparent hover:bg-background hover:border-amber-500/30"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`p-1.5 rounded-md ${
                                    selectedSkill === skill.id 
                                      ? "bg-amber-100 text-amber-700" 
                                      : "bg-secondary text-muted-foreground"
                                  }`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <span className={`font-medium ${
                                    selectedSkill === skill.id 
                                      ? "text-foreground" 
                                      : "text-muted-foreground"
                                  }`}>
                                    {skill.name}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground pl-9 truncate">
                                  {skill.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary of settings - clickable to expand */}
                  {(!selectedSkill || gameMode !== "learning") && (
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="w-full p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Settings className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-foreground">Settings: </span>
                            {showAdvanced ? (
                              <span>Custom ranges • </span>
                            ) : (
                              <span className="capitalize">{difficulty} difficulty • </span>
                            )}
                            {gameMode === "timed" && <span>{formatTime(timedModeLimit)} session • </span>}
                            {gameMode === "practice" && <span>{practiceTimerLimit}s per question • </span>}
                            {gameMode === "learning" && <span>No time limit • </span>}
                            <span>{submitMode === "auto" ? "Auto-submit" : "Press Enter"} • </span>
                            <span>{selectedOperations.join(" ")}</span>
                          </div>
                        </div>
                        {showSettings ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </button>
                  )}

                  {/* Collapsible Settings Section */}
                  {showSettings && (!selectedSkill || gameMode !== "learning") && (
                    <div className="space-y-6 p-4 rounded-lg border border-border bg-secondary/20">
                      {/* Operation Selection - Multi-select */}
                      <div>
                        <label className="text-sm font-medium mb-3 block">
                          Operations <span className="text-muted-foreground font-normal">(select multiple)</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {operations.map(({ op, label }) => (
                            <button
                              key={op}
                              onClick={() => toggleOperation(op)}
                              className={`p-4 rounded-lg border text-center transition-colors ${
                                selectedOperations.includes(op)
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

                      {/* Difficulty Selection - Always visible, shows what it affects */}
                      {!showAdvanced && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium">Difficulty</label>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              Affects number range
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(["easy", "medium", "hard", "expert"] as Difficulty[]).map((d) => {
                              const config = difficultyConfig[d];
                              return (
                                <button
                                  key={d}
                                  onClick={() => setDifficulty(d)}
                                  className={`py-3 px-3 rounded-lg border text-center transition-colors ${
                                    difficulty === d
                                      ? `border-2 ${getDifficultyColor(d)}`
                                      : "border-border hover:bg-secondary/50"
                                  }`}
                                >
                                  <span className={`text-sm font-medium capitalize block ${difficulty === d ? "" : ""}`}>
                                    {d}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                                    +/− ≤{config.addSubMax}, × ≤{config.mulWideMax} (tables ≤{config.mulTableMax})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Advanced Settings */}
                      <div>
                        <button
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Custom Ranges
                          {showAdvanced ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>

                        {showAdvanced && (
                          <div className="mt-4 space-y-4 p-4 rounded-lg border border-border bg-secondary/30">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                Custom ranges override difficulty presets
                              </p>
                              <button
                                onClick={() => {
                                  setShowAdvanced(false);
                                  setCustomRangesTouched(false);
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Use difficulty presets instead
                              </button>
                            </div>
                            {operations.map(({ op, label }) => (
                              <div key={op} className="flex items-center gap-3">
                                <span className="w-20 text-sm font-medium">{label}</span>
                                <div className="flex items-center gap-2 flex-1">
                                  <Input
                                    type="number"
                                    value={operationRanges[op].min}
                                    onChange={(e) => updateRange(op, "min", parseInt(e.target.value) || 1)}
                                    className="w-20 h-8 text-center text-sm"
                                    min={1}
                                  />
                                  <span className="text-muted-foreground">to</span>
                                  <Input
                                    type="number"
                                    value={operationRanges[op].max}
                                    onChange={(e) => updateRange(op, "max", parseInt(e.target.value) || 1)}
                                    className="w-20 h-8 text-center text-sm"
                                    min={1}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Timed Mode Time Selection */}
                      {gameMode === "timed" && (
                        <div>
                          <label className="text-sm font-medium mb-3 block">Session Duration</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {timedModeLimits.map((time) => (
                              <button
                                key={time}
                                onClick={() => setTimedModeLimit(time)}
                                className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                                  timedModeLimit === time
                                    ? "border-foreground bg-secondary font-medium"
                                    : "border-border hover:bg-secondary/50"
                                }`}
                              >
                                {formatTime(time)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Practice Mode Timer Selection */}
                      {gameMode === "practice" && (
                        <div>
                          <label className="text-sm font-medium mb-3 block">Time Per Question</label>
                          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                            {practiceTimerOptions.map((time) => (
                              <button
                                key={time}
                                onClick={() => setPracticeTimerLimit(time)}
                                className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                                  practiceTimerLimit === time
                                    ? "border-foreground bg-secondary font-medium"
                                    : "border-border hover:bg-secondary/50"
                                }`}
                              >
                                {time}s
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Submission Mode Selection */}
                      <div>
                        <label className="text-sm font-medium mb-3 block">Answer Submission</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setSubmitMode("manual")}
                            className={`p-4 rounded-lg border text-left transition-colors ${
                              submitMode === "manual"
                                ? "border-foreground bg-secondary"
                                : "border-border hover:bg-secondary/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <CornerDownLeft className="w-4 h-4" />
                              <span className="font-medium">Press Enter</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Submit with Enter key
                            </span>
                          </button>
                          <button
                            onClick={() => setSubmitMode("auto")}
                            className={`p-4 rounded-lg border text-left transition-colors ${
                              submitMode === "auto"
                                ? "border-foreground bg-secondary"
                                : "border-border hover:bg-secondary/50"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Wand2 className="w-4 h-4" />
                              <span className="font-medium">Auto-submit</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              Submit when correct
                            </span>
                          </button>
                        </div>
                        {submitMode === "auto" && (
                          <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              <p className="text-xs text-amber-800 dark:text-amber-200">
                                <span className="font-medium">Note:</span> Accuracy is not recorded in auto-submit mode. Switch to Press Enter to track accuracy.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Start Button */}
                  <Button onClick={startTraining} className="w-full" size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Start Training
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isPlaying && (
            <div className="space-y-4 sm:space-y-6">
              {/* Header with difficulty badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {gameMode === "learning" ? (
                    <>
                      <GraduationCap className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">Learning Mode</span>
                    </>
                  ) : gameMode === "timed" ? (
                    <>
                      <Zap className="w-4 h-4" />
                      <span className="text-sm font-medium">Timed Mode</span>
                    </>
                  ) : (
                    <>
                      <Timer className="w-4 h-4" />
                      <span className="text-sm font-medium">Practice Mode</span>
                    </>
                  )}
                  {!showAdvanced && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getDifficultyColor(difficulty)}`}>
                      {currentConfig.label}
                    </span>
                  )}
                </div>
                {gameMode === "learning" && (
                  <button
                    onClick={() => setShowTip(!showTip)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showTip ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showTip ? "Hide Tips" : "Show Tips"}
                  </button>
                )}
              </div>

              {/* Timer - Only for timed and practice modes */}
              <div ref={timerAndProblemRef} className="space-y-2 scroll-mt-4">
                {gameMode === "practice" ? (
                  <>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Time remaining</span>
                      <span className="font-mono">{timeLeft}s</span>
                    </div>
                    <Progress
                      value={(timeLeft / practiceTimerLimit) * 100}
                      className="h-1"
                    />
                  </>
                ) : gameMode === "timed" ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Time remaining</span>
                      <span className={`font-mono text-lg font-semibold ${overallTimeLeft <= 10 ? "text-destructive" : ""}`}>
                        {formatTime(overallTimeLeft)}
                      </span>
                    </div>
                    <Progress
                      value={(overallTimeLeft / timedModeLimit) * 100}
                      className="h-2"
                    />
                  </>
                ) : (
                  // Learning mode - show number ranges info
                  <div className="text-xs text-muted-foreground text-center">
                    Take your time — no timer in learning mode
                  </div>
                )}
              </div>

              {/* Tip Card - Before problem in Learning mode */}
              {gameMode === "learning" && showTip && currentTip && !hasAnswered && (
                <Card className="border-amber-500/30 bg-linear-to-br from-amber-500/5 to-orange-500/5">
                  <CardContent className="p-4">
                    <button
                      onClick={() => setTipExpanded(!tipExpanded)}
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-amber-900 dark:text-amber-100">
                          {currentTip.title}
                        </span>
                      </div>
                      {tipExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    
                    {tipExpanded && (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-start gap-2 text-sm">
                          <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <p className="text-amber-800 dark:text-amber-200 font-medium">
                            {currentTip.technique}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          {currentTip.description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Problem Display */}
              <Card className={`transition-colors ${
                isCorrect === true ? "border-success" : isCorrect === false ? "border-destructive" : ""
              }`}>
                <CardContent className="p-6 sm:p-12">
                  {problem && (
                    <div className="text-center">
                      <div className="text-4xl sm:text-6xl font-mono font-semibold tracking-wide mb-5 sm:mb-8">
                        {problem.a} {problem.operation} {problem.b}
                      </div>

                      <form onSubmit={handleSubmit}>
                        {useCustomKeypad ? (
                          <div
                            role="textbox"
                            aria-label="Answer"
                            aria-readonly="true"
                            className={`h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono max-w-[200px] mx-auto rounded-md border border-input bg-background px-3 flex items-center justify-center ${
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
                            disabled={gameMode === "learning" && hasAnswered}
                          />
                        )}
                      </form>

                      {isCorrect === false && gameMode === "practice" && (
                        <p className="text-sm text-muted-foreground mt-4">
                          Answer: <span className="font-mono font-medium text-foreground">{problem.answer}</span>
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Solution Breakdown - After answering in Learning mode */}
              {gameMode === "learning" && hasAnswered && currentTip && (
                <Card className={`${isCorrect ? "border-success/50 bg-success/5" : "border-destructive/50 bg-destructive/5"}`}>
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      {/* Result header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isCorrect ? (
                            <>
                              <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                                <span className="text-success text-sm">✓</span>
                              </div>
                              <span className="font-medium text-success">Correct!</span>
                            </>
                          ) : (
                            <>
                              <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                                <span className="text-destructive text-sm">✗</span>
                              </div>
                              <span className="font-medium text-destructive">
                                Incorrect — Answer: <span className="font-mono">{problem?.answer}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Step-by-step breakdown */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                          Step-by-Step: {currentTip.title}
                        </h4>
                        <div className="space-y-2 pl-6">
                          {currentTip.steps.map((step, index) => (
                            <div key={index} className="flex items-start gap-2 text-sm">
                              <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs font-medium shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-mono text-muted-foreground">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Next button */}
                      <Button onClick={startNewProblem} className="w-full mt-2">
                        Next Problem
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <div className={`grid gap-4 ${
                submitMode === "auto" 
                  ? "grid-cols-2 sm:grid-cols-3" 
                  : gameMode === "learning" 
                    ? "grid-cols-3" 
                    : "grid-cols-2 sm:grid-cols-4"
              }`}>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-mono font-semibold">{totalSolved}</p>
                  <p className="text-xs text-muted-foreground">Solved</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-mono font-semibold">{streak}</p>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                {submitMode === "manual" && (
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <p className="text-2xl font-mono font-semibold">{accuracy}%</p>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                  </div>
                )}
                {gameMode !== "learning" && (
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <p className="text-2xl font-mono font-semibold">{avgTime > 0 ? avgTime.toFixed(1) : "0"}s</p>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                  </div>
                )}
              </div>

              {/* Auto-submit indicator */}
              {submitMode === "auto" && (
                <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <Wand2 className="w-3 h-3" />
                  Auto-submit enabled • Accuracy only tracked in Press Enter mode
                </div>
              )}

              {/* Controls */}
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={stopTraining}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
                {!hasAnswered && (
                  <Button variant="outline" onClick={startNewProblem}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Skip
                  </Button>
                )}
              </div>
            </div>
          )}
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
