"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { MobileNumpad } from "@/components/ui/mobile-numpad";
import { TRAINING_SKILLS, type SkillId } from "@/lib/training-skills";
import { useIsMobileDevice } from "@/hooks/use-is-mobile-device";
import {
  DEFAULT_TIMED_TRAINING_SETTINGS,
  TIMED_MODE_LIMITS,
  PRACTICE_TIMER_OPTIONS,
  readGuestTrainingSettings,
  writeGuestTrainingSettings,
  type GuestTrainingSettings,
} from "@/lib/training-settings";
import { getTrainingPreset } from "@/lib/training-presets";
import { ANALYTICS_EVENTS, type AnalyticsProperties } from "@/lib/analytics";
import {
  captureAnalyticsEvent,
  clearAnalyticsSessionProperties,
  createAnalyticsId,
  registerAnalyticsSessionProperties,
} from "@/lib/analytics-client";
import type {
  Difficulty,
  DifficultySettings,
  GameMode,
  MathTip,
  Operation,
  OperationRanges,
  Problem,
  ScoreBucket,
  ScoreDistribution,
  SubmitMode,
} from "@/components/training/training-types";
import { TrainingHeader } from "@/components/training/training-header";
import { TrainingSetup } from "@/components/training/training-setup";
import { TrainingRun } from "@/components/training/training-run";
import { TrainingGameOver } from "@/components/training/training-game-over";
import { ProductSurveyController } from "@/components/analytics/product-survey-controller";
import { MobileTrainingAnnouncement } from "@/components/training/mobile-training-announcement";

const difficultyConfig: Record<Difficulty, DifficultySettings> = {
  easy: {
    label: "Easy",
    addSubMax: 20,
    mulTableMax: 10,
    mulWideMax: 10,
    timeLimit: 12,
    description: "Numbers 1-20 for +/−, 1-10 for ×/÷",
  },
  medium: {
    label: "Medium",
    addSubMax: 100,
    mulTableMax: 12,
    mulWideMax: 100,
    timeLimit: 10,
    description:
      "Add/Sub 2-100 • × 2-12 × 2-100 • ÷ dividend ≤100, divisors 2-12 (no 1s/0)",
  },
  hard: {
    label: "Hard",
    addSubMax: 150,
    mulTableMax: 15,
    mulWideMax: 150,
    timeLimit: 8,
    description:
      "Add/Sub 3-150 • × 3-15 × 3-150 • ÷ dividend ≤150, divisors 2-15 (no 1s/0)",
  },
  expert: {
    label: "Expert",
    addSubMax: 200,
    mulTableMax: 20,
    mulWideMax: 200,
    timeLimit: 6,
    description:
      "Add/Sub 4-200 • × 4-20 × 4-200 • ÷ dividend ≤200, divisors 3-20 (no 1s/0)",
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

const timedModeLimits = TIMED_MODE_LIMITS;
const practiceTimerOptions = PRACTICE_TIMER_OPTIONS;

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
          `Add tens to total: ${hundredsA + hundredsB} + ${tensA + tensB} = ${
            hundredsA + hundredsB + tensA + tensB
          }`,
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
      description:
        "Unlike school math, adding left-to-right is faster because you get the big picture first.",
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
    steps: [`Simply add: ${a} + ${b} = ${answer}`],
  };
}

function getSubtractionTip(a: number, b: number): MathTip {
  const answer = a - b;

  // Subtraction by Complements - for messy numbers close to round numbers
  const nearestHundred = Math.round(b / 100) * 100;
  const hundredDiff = nearestHundred - b;
  if (
    nearestHundred > 0 &&
    Math.abs(hundredDiff) <= 15 &&
    Math.abs(hundredDiff) > 0 &&
    b >= 50
  ) {
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
      description: `Round ${b} to ${nearestTenB}, subtract, then ${
        adjustment > 0 ? "add" : "subtract"
      } ${Math.abs(adjustment)}.`,
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
      steps: [`From ${b}, how far to ${a}?`, `${b} + ${answer} = ${a}`, `Answer: ${answer}`],
    };
  }

  // Simple subtraction
  return {
    title: "Basic Subtraction",
    technique: "For simple cases, direct computation works well",
    description: "Practice makes this automatic—visualize the number line.",
    steps: [`Calculate: ${a} - ${b} = ${answer}`],
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
    const baseFactor = nearestTen;
    const distanceFromBase = a - baseFactor;
    const otherNum = a + distanceFromBase; // if a=23, base=20, dist=3, other=26
    if (Math.abs(distanceFromBase) > 0 && Math.abs(distanceFromBase) <= 5) {
      return {
        title: "The Duplex Method",
        technique:
          "Round to nearest 10, adjust other factor opposite direction, multiply, add distance²",
        description: `Round ${a} to ${baseFactor}. Move the other factor to ${otherNum}. Multiply, then add ${Math.abs(
          distanceFromBase
        )}².`,
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
    const step1 = a + onesB; // add ones of b to a
    const step2 = step1 * base; // multiply by base
    const step3 = onesA * onesB; // product of ones
    return {
      title: "Numbers Close Together",
      technique:
        "Add the ones digit of one number to the other, multiply by the base, add product of ones",
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
      steps: [`Halve the number: ${other} ÷ 2 = ${half}`, `Multiply by 10: ${half} × 10 = ${answer}`],
    };
  }

  // Multiplying by 9
  if (b === 9 || a === 9) {
    const other = b === 9 ? a : b;
    return {
      title: "Multiply by 9",
      technique: "Multiply by 10, then subtract the original number",
      description: `${other} × 9 = (${other} × 10) - ${other} = ${other * 10} - ${other}`,
      steps: [`Multiply by 10: ${other} × 10 = ${other * 10}`, `Subtract original: ${other * 10} - ${other} = ${answer}`],
    };
  }

  // Multiplying by 4
  if (b === 4 || a === 4) {
    const other = b === 4 ? a : b;
    return {
      title: "Multiply by 4",
      technique: "Double the number, then double it again",
      description: `${other} × 4 = double(double(${other}))`,
      steps: [`First double: ${other} × 2 = ${other * 2}`, `Double again: ${other * 2} × 2 = ${answer}`],
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
    steps: [`${a} × ${b} = ${answer}`],
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
      steps: [`Double the number: ${a} × 2 = ${a * 2}`, `Divide by 10: ${a * 2} ÷ 10 = ${answer}`],
    };
  }

  // Dividing by 4
  if (b === 4) {
    return {
      title: "Divide by 4",
      technique: "Halve the number twice",
      description: `${a} ÷ 4 = (${a} ÷ 2) ÷ 2`,
      steps: [`First half: ${a} ÷ 2 = ${a / 2}`, `Second half: ${a / 2} ÷ 2 = ${answer}`],
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
      steps: [`Reframe: ${b} × ? = ${a}`, `From times tables: ${b} × ${answer} = ${a}`, `Answer: ${answer}`],
    };
  }

  // Basic division
  return {
    title: "Basic Division",
    technique: "Use multiplication facts in reverse",
    description: `${a} ÷ ${b} = ${answer}. Think: "${b} × ${answer} = ${a}"`,
    steps: [`${a} ÷ ${b} = ${answer}`],
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
  const { data: authSession, status: authStatus } = useSession();
  const searchParams = useSearchParams();
  const activePreset = getTrainingPreset(searchParams.get("preset"));
  const seoSource = searchParams.get("source") || undefined;
  const seoLandingPath = searchParams.get("page") || "/";

  const [selectedOperations, setSelectedOperations] = useState<Operation[]>(["+", "-", "×", "÷"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [gameMode, setGameMode] = useState<GameMode>("timed");
  const [timedModeLimit, setTimedModeLimit] = useState(120);
  const [practiceTimerLimit, setPracticeTimerLimit] = useState(10);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [returningAccount, setReturningAccount] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const restoredGuestSettingsRef = useRef<GuestTrainingSettings | null>(null);
  const [submitMode, setSubmitMode] = useState<SubmitMode>("auto");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customRangesTouched, setCustomRangesTouched] = useState(false);
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
  const guestSubmittedRef = useRef(false);
  const guestCookieReadyRef = useRef(false);
  const sessionPromiseRef = useRef<Promise<string | null> | null>(null);
  const presetAppliedRef = useRef<string | null>(null);
  const firstAnswerTrackedRef = useRef(false);
  const completionTrackedRef = useRef(false);
  const setupViewedTrackedRef = useRef(false);
  const activeRunRef = useRef(false);
  const trainingRunIdRef = useRef<string | null>(null);
  const trainingTelemetryRef = useRef<AnalyticsProperties>({});
  const runResultsRef = useRef({ totalSolved: 0, totalCorrect: 0, avgTime: 0 });
  const [scorePercentile, setScorePercentile] = useState<ScoreDistribution | null>(null);

  // Learning mode state
  const [showTip, setShowTip] = useState(true);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [tipExpanded, setTipExpanded] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<SkillId | null>(null);

  // Animation feedback state - key increments to re-trigger animations
  const [feedbackKey, setFeedbackKey] = useState(0);

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
  const showCustomKeypad =
    useCustomKeypad && isPlaying && !!problem && !(gameMode === "learning" && hasAnswered);
  const answerInputDisabled = !isPlaying || !problem || hasAnswered;

  // Restore after hydration, before saving defaults or enabling Start.
  useEffect(() => {
    let saved: GuestTrainingSettings | null = null;
    try {
      saved = readGuestTrainingSettings(window.localStorage);
    } catch {
      // Accessing localStorage itself can be blocked by browser policy.
    }
    restoredGuestSettingsRef.current = saved;
    if (saved) {
      setGameMode(saved.gameMode);
      setDifficulty(saved.difficulty);
      setSelectedOperations(saved.selectedOperations);
      setTimedModeLimit(saved.timedModeLimit);
      setPracticeTimerLimit(saved.practiceTimerLimit);
      setSubmitMode(saved.submitMode);
      setShowAdvanced(saved.showAdvanced);
      setCustomRangesTouched(saved.customRangesTouched);
      setOperationRanges(saved.operationRanges);
      setSelectedSkill(saved.selectedSkill);
    }
    setPreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!preferencesReady || !activePreset || presetAppliedRef.current === activePreset.id) return;

    setGameMode(activePreset.gameMode);
    setDifficulty(activePreset.difficulty);
    setSelectedOperations(activePreset.operations);
    setTimedModeLimit(activePreset.timedModeLimit);
    setSelectedSkill(activePreset.selectedSkill ?? null);
    setShowAdvanced(false);
    setCustomRangesTouched(false);
    presetAppliedRef.current = activePreset.id;
  }, [activePreset, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady || authStatus !== "unauthenticated") return;
    try {
      writeGuestTrainingSettings(window.localStorage, {
        gameMode, difficulty, selectedOperations, timedModeLimit, practiceTimerLimit,
        submitMode, showAdvanced, customRangesTouched, operationRanges, selectedSkill,
      });
    } catch {
      // Training still works when browser storage is unavailable.
    }
  }, [preferencesReady, authStatus, gameMode, difficulty, selectedOperations,
    timedModeLimit, practiceTimerLimit, submitMode, showAdvanced,
    customRangesTouched, operationRanges, selectedSkill]);

  // Reset setup's scroll position after focus moves into a mobile run.
  useEffect(() => {
    if (!isPlaying || (!useCustomKeypad && !window.matchMedia("(max-width: 767px)").matches)) return;
    const node = timerAndProblemRef.current;
    if (!node) return;

    const scroll = () => node.scrollIntoView({ behavior: "instant", block: "start" });

    let timeout: number | undefined;
    const raf = requestAnimationFrame(() => {
      scroll();
      timeout = window.setTimeout(scroll, 60);
    });

    return () => {
      cancelAnimationFrame(raf);
      if (timeout) window.clearTimeout(timeout);
    };
  }, [isPlaying, useCustomKeypad, showCustomKeypad, feedbackKey, problem?.a, problem?.b, problem?.operation]);

  // Load user settings on mount
  useEffect(() => {
    if (!preferencesReady || !authSession?.user || settingsLoaded) return;

    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setReturningAccount(data.announcements?.mobileTrainingUpdate === true);

          if (typeof data.settings?.autoAdvance === "boolean") {
            setAutoAdvance(data.settings.autoAdvance);
          }

          // Presets intentionally override difficulty and timer defaults.
          if (!activePreset && !restoredGuestSettingsRef.current && data.settings?.defaultTimer) {
            const timerValue = parseInt(data.settings.defaultTimer.replace("s", ""));
            if (!isNaN(timerValue) && practiceTimerOptions.includes(timerValue)) {
              setPracticeTimerLimit(timerValue);
            }
          }

          // Apply default difficulty setting (convert "Medium" -> "medium")
          if (!activePreset && !restoredGuestSettingsRef.current && data.settings?.defaultDifficulty) {
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
  }, [authSession?.user, settingsLoaded, activePreset, preferencesReady]);

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
      const skill = TRAINING_SKILLS.find((s) => s.id === selectedSkill);
      if (skill) {
        const presetRanges = getPresetRanges(difficulty);
        const effectiveRange = showAdvanced
          ? operationRanges[skill.operation]
          : presetRanges[skill.operation];
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
  }, [
    getNextOperation,
    difficulty,
    gameMode,
    showAdvanced,
    operationRanges,
    selectedSkill,
    practiceTimerLimit,
  ]);

  const handleSkipProblem = useCallback(() => {
    // In learning + practice, skipping should break the current streak.
    // (Timed mode skip is hidden, but keep this safe/explicit anyway.)
    setStreak(0);
    startNewProblem();
  }, [startNewProblem]);

  // When advanced ranges are shown for the first time (or before the user edits),
  // prefill with the preset for the current difficulty.
  useEffect(() => {
    if (!showAdvanced) return;
    if (customRangesTouched) return;
    setOperationRanges(getPresetRanges(difficulty));
  }, [showAdvanced, difficulty, customRangesTouched]);

  const ensureGuestCookie = async () => {
    if (authSession?.user) return;
    if (guestCookieReadyRef.current) return;

    try {
      const response = await fetch("/api/auth/guest-token", {
        method: "GET",
        cache: "no-store",
      });
      if (response.ok) {
        guestCookieReadyRef.current = true;
      }
    } catch (error) {
      console.error("Failed to initialize guest identity:", error);
    }
  };

  const getTrainingTelemetryProperties = useCallback((): AnalyticsProperties => ({
    surface: activePreset?.id ? "seo_training_preset" : "training",
    entry_source: seoSource ?? "direct",
    landing_path: seoLandingPath,
    preset: activePreset?.id,
    auth_state: authSession?.user ? "authenticated" : "guest",
    plan: authSession?.user?.isPremium ? "premium" : "free",
    training_run_id: trainingRunIdRef.current ?? undefined,
    training_type: "standard",
    game_mode: gameMode,
    difficulty,
    operations: selectedOperations,
    timed_mode_limit: timedModeLimit,
    practice_timer_limit: practiceTimerLimit,
    auto_advance: autoAdvance,
    submit_mode: submitMode,
    show_advanced: showAdvanced,
  }), [
    activePreset?.id,
    authSession?.user,
    seoLandingPath,
    seoSource,
    gameMode,
    difficulty,
    selectedOperations,
    timedModeLimit,
    practiceTimerLimit,
    autoAdvance,
    submitMode,
    showAdvanced,
  ]);

  useEffect(() => {
    trainingTelemetryRef.current = getTrainingTelemetryProperties();
  }, [getTrainingTelemetryProperties]);

  useEffect(() => {
    runResultsRef.current = { totalSolved, totalCorrect, avgTime };
  }, [totalSolved, totalCorrect, avgTime]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (setupViewedTrackedRef.current) return;
    setupViewedTrackedRef.current = true;
    captureAnalyticsEvent(ANALYTICS_EVENTS.trainingSetupViewed, {
      surface: activePreset?.id ? "seo_training_preset" : "training",
      entry_source: seoSource ?? "direct",
      landing_path: seoLandingPath,
      preset: activePreset?.id,
      auth_state: authSession?.user ? "authenticated" : "guest",
      training_type: "standard",
    });
  }, [activePreset?.id, authSession?.user, authStatus, seoLandingPath, seoSource]);

  useEffect(() => {
    const captureNavigationAbandonment = () => {
      if (!activeRunRef.current || completionTrackedRef.current) return;
      completionTrackedRef.current = true;
      const results = runResultsRef.current;
      captureAnalyticsEvent(ANALYTICS_EVENTS.trainingAbandoned, {
        ...trainingTelemetryRef.current,
        end_reason: "navigation",
        total_solved: results.totalSolved,
        total_correct: results.totalCorrect,
        avg_time_seconds: results.avgTime,
      });
      activeRunRef.current = false;
      clearAnalyticsSessionProperties("training_run_id", "training_type", "game_mode");
    };

    window.addEventListener("pagehide", captureNavigationAbandonment);
    return () => {
      window.removeEventListener("pagehide", captureNavigationAbandonment);
      captureNavigationAbandonment();
    };
  }, []);

  const trackFirstAnswer = useCallback(() => {
    if (firstAnswerTrackedRef.current) return;
    firstAnswerTrackedRef.current = true;
    captureAnalyticsEvent(
      ANALYTICS_EVENTS.trainingFirstAnswered,
      getTrainingTelemetryProperties()
    );
  }, [getTrainingTelemetryProperties]);

  const startTraining = async () => {
    if (!preferencesReady) return;
    if (!authSession?.user) {
      await ensureGuestCookie();
      if (!guestCookieReadyRef.current) {
        return;
      }
    }
    const isRestart = isGameOver;
    const previousRunId = trainingRunIdRef.current;
    const trainingRunId = createAnalyticsId();
    trainingRunIdRef.current = trainingRunId;

    if (isRestart) {
      captureAnalyticsEvent(ANALYTICS_EVENTS.trainingRestarted, {
        ...getTrainingTelemetryProperties(),
        previous_training_run_id: previousRunId ?? undefined,
        training_run_id: trainingRunId,
      });
    }

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
    firstAnswerTrackedRef.current = false;
    completionTrackedRef.current = false;
    activeRunRef.current = true;

    const startProperties = {
      ...getTrainingTelemetryProperties(),
      training_run_id: trainingRunId,
    };
    trainingTelemetryRef.current = startProperties;
    registerAnalyticsSessionProperties({
      training_run_id: trainingRunId,
      training_type: "standard",
      game_mode: gameMode,
    });
    captureAnalyticsEvent(ANALYTICS_EVENTS.trainingStarted, startProperties);

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
    if (!isDefaultTimedConfig()) return;

    await ensureGuestCookie();
    if (!guestCookieReadyRef.current) return;

    guestSubmittedRef.current = true;

    try {
      await fetch("/api/leaderboard/training/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
  const endSession = async (
    solved: number,
    correct: number,
    bestStreak: number,
    avgTimeVal: number,
    outcome: "completed" | "abandoned" = "completed",
    endReason: "timer_finished" | "manual_stop" | "error" = "timer_finished"
  ) => {
    if (!completionTrackedRef.current) {
      completionTrackedRef.current = true;
      activeRunRef.current = false;
      captureAnalyticsEvent(
        outcome === "completed"
          ? ANALYTICS_EVENTS.trainingCompleted
          : ANALYTICS_EVENTS.trainingAbandoned,
        {
        ...getTrainingTelemetryProperties(),
        end_reason: endReason,
        duration_seconds: Math.round((Date.now() - sessionStartTimeRef.current) / 1000),
        total_solved: solved,
        total_correct: correct,
        accuracy: solved > 0 ? Math.round((correct / solved) * 100) : 0,
        best_streak: bestStreak,
        avg_time_seconds: avgTimeVal,
      });
      clearAnalyticsSessionProperties("training_run_id", "training_type", "game_mode");
    }

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
      return;
    }
    if (!authSession?.user) {
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

            const percentile = Math.min(100, total ? Math.round((cumulative / total) * 1000) / 10 : 0);
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
      await endSession(
        totalSolved,
        totalCorrect,
        bestStreakRef.current,
        avgTime,
        "abandoned",
        "manual_stop"
      );
    } else if (activeRunRef.current && !completionTrackedRef.current) {
      completionTrackedRef.current = true;
      activeRunRef.current = false;
      captureAnalyticsEvent(ANALYTICS_EVENTS.trainingAbandoned, {
        ...getTrainingTelemetryProperties(),
        end_reason: "manual_stop",
        total_solved: 0,
        total_correct: 0,
      });
      clearAnalyticsSessionProperties("training_run_id", "training_type", "game_mode");
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
    trackFirstAnswer();

    // In auto-submit mode, correct answers are handled by the effect
    // Incorrect answers just clear the input (no tracking)
    if (submitMode === "auto") {
      if (correct) return; // Already handled by effect
      // Wrong answer - just clear and let them try again
      setUserAnswer("");
      setIsCorrect(false);
      setFeedbackKey((k) => k + 1);
      setTimeout(() => setIsCorrect(null), 300);
      return;
    }

    const timeTaken = (Date.now() - startTime) / 1000;

    if (gameMode === "learning") {
      // Learning mode: show solution breakdown after answering
      setIsCorrect(correct);
      setFeedbackKey((k) => k + 1);
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
      setFeedbackKey((k) => k + 1);
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

        if (autoAdvance) {
          setTimeout(() => {
            startNewProblem();
          }, 200);
        } else {
          setHasAnswered(true);
        }
      } else {
        // Wrong answer in Timed mode: reset streak, clear input, try again
        setStreak(0);
        setUserAnswer("");
        setTimeout(() => setIsCorrect(null), 300);
      }
    } else {
      // Practice mode: original behavior
      setIsCorrect(correct);
      setFeedbackKey((k) => k + 1);
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

      if (autoAdvance) {
        setTimeout(() => {
          startNewProblem();
        }, 600);
      } else {
        setHasAnswered(true);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCurrentAnswer();
  };

  // Practice mode per-question timer
  useEffect(() => {
    if (!isPlaying || gameMode !== "practice" || timeLeft <= 0 || hasAnswered) return;

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

          if (autoAdvance) {
            setTimeout(() => startNewProblem(), 600);
          } else {
            setHasAnswered(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, gameMode, timeLeft, startNewProblem, problem, difficulty, autoAdvance, hasAnswered]);

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
    } else if (isGameOver && activeRunRef.current && !completionTrackedRef.current) {
      completionTrackedRef.current = true;
      activeRunRef.current = false;
      captureAnalyticsEvent(ANALYTICS_EVENTS.trainingAbandoned, {
        ...getTrainingTelemetryProperties(),
        end_reason: "zero_answer_timeout",
        duration_seconds: Math.round((Date.now() - sessionStartTimeRef.current) / 1000),
        total_solved: 0,
        total_correct: 0,
      });
      clearAnalyticsSessionProperties("training_run_id", "training_type", "game_mode");
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
      trackFirstAnswer();

      setIsCorrect(true);
      setFeedbackKey((k) => k + 1);
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
      } else if (autoAdvance) {
        setTimeout(() => {
          startNewProblem();
        }, 200);
      } else {
        setHasAnswered(true);
      }
    }
  }, [
    userAnswer,
    problem,
    isPlaying,
    submitMode,
    hasAnswered,
    startTime,
    gameMode,
    authSession,
    sessionId,
    startNewProblem,
    recordAttempt,
    trackFirstAnswer,
    autoAdvance,
  ]);

  const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentTip = problem ? getTipForProblem(problem) : null;
  const currentConfig = difficultyConfig[difficulty];
  const containerWidthClass = isPlaying ? "max-w-3xl" : isGameOver ? "max-w-3xl" : "max-w-5xl";

  // Difficulty reads as inked text in a semantic tone — no tinted pills.
  const getDifficultyColor = (d: Difficulty) => {
    switch (d) {
      case "easy":
        return "text-success";
      case "medium":
        return "text-warning";
      case "hard":
        return "text-brand";
      case "expert":
        return "text-destructive";
    }
  };

  return (
    <div className="min-h-screen">
      <TrainingHeader active={isPlaying} />

      <div className={`${isPlaying ? "p-3 md:p-6" : "p-4 md:p-6"} ${showCustomKeypad ? "pb-[calc(env(safe-area-inset-bottom,0.5rem)+300px)]" : ""}`}>
        <div className={`${containerWidthClass} mx-auto`}>
          {!isPlaying && !isGameOver && (
            <MobileTrainingAnnouncement
              ready={preferencesReady && authStatus !== "loading" &&
                (authStatus === "unauthenticated" || settingsLoaded)}
              returningAccount={returningAccount}
            />
          )}
          {isGameOver ? (
            <TrainingGameOver
              difficultyLabel={currentConfig.label}
              difficultyBadgeClassName={getDifficultyColor(difficulty)}
              totalSolved={totalSolved}
              accuracy={accuracy}
              avgTimeSeconds={avgTime}
              bestStreak={bestStreakRef.current}
              showAccuracyCard={submitMode === "manual"}
              showBestStreakCard={gameMode !== "timed"}
              onPlayAgain={startTraining}
              onChangeSettings={stopTraining}
              scorePercentile={scorePercentile}
              showAuthCallout={!authSession?.user}
              trainingRunId={trainingRunIdRef.current}
            />
          ) : !isPlaying ? (
            <TrainingSetup
              scorePercentile={scorePercentile}
              showLastRunPlacementCard={!!scorePercentile && gameMode === "timed" && isDefaultTimedConfig()}
              gameMode={gameMode}
              setGameMode={setGameMode}
              selectedSkill={selectedSkill}
              setSelectedSkill={setSelectedSkill}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
              setCustomRangesTouched={setCustomRangesTouched}
              operationRanges={operationRanges}
              updateRange={updateRange}
              operations={operations}
              selectedOperations={selectedOperations}
              toggleOperation={toggleOperation}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              difficultyConfig={difficultyConfig}
              timedModeLimits={timedModeLimits}
              timedModeLimit={timedModeLimit}
              setTimedModeLimit={setTimedModeLimit}
              practiceTimerOptions={practiceTimerOptions}
              practiceTimerLimit={practiceTimerLimit}
              setPracticeTimerLimit={setPracticeTimerLimit}
              submitMode={submitMode}
              setSubmitMode={setSubmitMode}
              formatTime={formatTime}
              startTraining={startTraining}
              preferencesReady={preferencesReady}
            />
          ) : (
            <TrainingRun
              gameMode={gameMode}
              submitMode={submitMode}
              showAdvanced={showAdvanced}
              difficultyLabel={currentConfig.label}
              difficultyBadgeClassName={getDifficultyColor(difficulty)}
              showTip={showTip}
              setShowTip={setShowTip}
              tipExpanded={tipExpanded}
              setTipExpanded={setTipExpanded}
              currentTip={currentTip}
              hasAnswered={hasAnswered}
              totalSolved={totalSolved}
              streak={streak}
              accuracy={accuracy}
              avgTimeSeconds={avgTime}
              timeLeft={timeLeft}
              practiceTimerLimit={practiceTimerLimit}
              overallTimeLeft={overallTimeLeft}
              timedModeLimit={timedModeLimit}
              formatTime={formatTime}
              timerAndProblemRef={timerAndProblemRef}
              feedbackKey={feedbackKey}
              isCorrect={isCorrect}
              problem={problem}
              useCustomKeypad={useCustomKeypad}
              answerInputDisabled={answerInputDisabled}
              userAnswer={userAnswer}
              setUserAnswer={setUserAnswer}
              inputRef={inputRef}
              onSubmit={handleSubmit}
              onStop={stopTraining}
              onSkip={handleSkipProblem}
              onNextProblem={startNewProblem}
            />
          )}
          {isGameOver && !isPlaying && (
            <ProductSurveyController surface="training" enabled inline />
          )}
        </div>
      </div>

      {showCustomKeypad && (
        <MobileNumpad value={userAnswer} setValue={setUserAnswer} disabled={answerInputDisabled} onDone={submitCurrentAnswer} doneLabel={submitMode === "manual" ? "Submit" : "Done"} />
      )}
    </div>
  );
}
