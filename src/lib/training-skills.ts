
export type Operation = "+" | "-" | "×" | "÷";

export interface Problem {
  a: number;
  b: number;
  operation: Operation;
  answer: number;
}

export type SkillId = "11-trick" | "complements-10" | "square-5" | "mult-4" | "div-5";

export interface NumberRange {
  min: number;
  max: number;
}

export interface GenerateProblemOptions {
  range?: NumberRange;
}

export interface MathSkill {
  id: SkillId;
  name: string;
  description: string;
  iconName: string; // passing icon name to render in component
  difficulty: "easy" | "medium" | "hard";
  operation: Operation;
  generateProblem: (options?: GenerateProblemOptions) => Problem;
}

function randomInt(min: number, max: number): number {
  const adjustedMin = Math.min(min, max);
  const adjustedMax = Math.max(min, max);
  return Math.floor(Math.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin;
}

function normalizeRange(range: NumberRange | undefined, fallback: NumberRange): NumberRange {
  if (!range) return fallback;
  return {
    min: Math.min(range.min, range.max),
    max: Math.max(range.min, range.max),
  };
}

export const TRAINING_SKILLS: MathSkill[] = [
  {
    id: "11-trick",
    name: "The 11 Trick",
    description: "Multiply any 2-digit number by 11 instantly",
    iconName: "Zap",
    difficulty: "easy",
    operation: "×",
    generateProblem: (options) => {
      const b = 11;
      const range = normalizeRange(options?.range, { min: 10, max: 99 });
      const a = randomInt(range.min, range.max);
      return { a, b, operation: "×", answer: a * b };
    },
  },
  {
    id: "complements-10",
    name: "Complements of 10",
    description: "Speed up addition when ones digits sum to 10",
    iconName: "Circle",
    difficulty: "easy",
    operation: "+",
    generateProblem: (options) => {
      const range = normalizeRange(options?.range, { min: 10, max: 99 });

      // Try to generate two numbers in-range whose ones digits sum to 10.
      for (let attempt = 0; attempt < 200; attempt++) {
        const onesA = randomInt(1, 9);
        const onesB = 10 - onesA;

        const tensAMin = Math.ceil((range.min - onesA) / 10);
        const tensAMax = Math.floor((range.max - onesA) / 10);
        const tensBMin = Math.ceil((range.min - onesB) / 10);
        const tensBMax = Math.floor((range.max - onesB) / 10);

        if (tensAMin > tensAMax || tensBMin > tensBMax) continue;

        const tensA = randomInt(tensAMin, tensAMax);
        const tensB = randomInt(tensBMin, tensBMax);

        const a = tensA * 10 + onesA;
        const b = tensB * 10 + onesB;

        if (a >= range.min && a <= range.max && b >= range.min && b <= range.max) {
          return { a, b, operation: "+", answer: a + b };
        }
      }

      // Fallback to original 2-digit generation.
      // (Still keep operands inside the requested range.)
      const a = randomInt(range.min, range.max);
      const b = randomInt(range.min, range.max);
      return { a, b, operation: "+", answer: a + b };
    },
  },
  {
    id: "square-5",
    name: "Squaring Ends in 5",
    description: "Square any number ending in 5 in seconds",
    iconName: "Box",
    difficulty: "medium",
    operation: "×",
    generateProblem: (options) => {
      const range = normalizeRange(options?.range, { min: 15, max: 95 });

      // Generate a number ending in 5 within the range: num = 10*t + 5
      const tMin = Math.ceil((range.min - 5) / 10);
      const tMax = Math.floor((range.max - 5) / 10);
      if (tMin <= tMax) {
        const tens = randomInt(tMin, tMax);
        const num = tens * 10 + 5;
        return { a: num, b: num, operation: "×", answer: num * num };
      }

      // Fallback to 2-digit numbers ending in 5.
      // (Still keep operands inside the requested range.)
      const num = randomInt(range.min, range.max);
      return { a: num, b: num, operation: "×", answer: num * num };
    },
  },
  {
    id: "mult-4",
    name: "Multiply by 4",
    description: "Double and double again technique",
    iconName: "Copy",
    difficulty: "easy",
    operation: "×",
    generateProblem: (options) => {
      const range = normalizeRange(options?.range, { min: 12, max: 80 });
      // Avoid single digits if possible
      const preferMin = Math.max(12, range.min);
      const a = preferMin <= range.max ? randomInt(preferMin, range.max) : randomInt(range.min, range.max);
      const b = 4;
      // Randomize order? Usually trick works best if we think "x 4"
      return { a, b, operation: "×", answer: a * b };
    },
  },
  {
    id: "div-5",
    name: "Divide by 5",
    description: "Double and divide by 10",
    iconName: "Divide", // Will map to a lucide icon
    difficulty: "medium",
    operation: "÷",
    generateProblem: (options) => {
      const b = 5;

      // If a range is provided, interpret it as the displayed dividend range (a),
      // choosing a multiple of 5 so the answer stays integer.
      if (options?.range) {
        const range = normalizeRange(options.range, { min: 60, max: 750 });
        const kMin = Math.ceil(range.min / b);
        const kMax = Math.floor(range.max / b);
        if (kMin <= kMax) {
          const answer = randomInt(kMin, kMax);
          const a = answer * b;
          return { a, b, operation: "÷", answer };
        }
      }

      // Fallback: keep integer answers in a reasonable band.
      const answer = randomInt(12, 150);
      const a = answer * b;
      return { a, b, operation: "÷", answer };
    },
  },
];

