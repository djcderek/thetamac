
export type Operation = "+" | "-" | "×" | "÷";

export interface Problem {
  a: number;
  b: number;
  operation: Operation;
  answer: number;
}

export type SkillId = "11-trick" | "complements-10" | "square-5" | "mult-4" | "div-5";

export interface MathSkill {
  id: SkillId;
  name: string;
  description: string;
  iconName: string; // passing icon name to render in component
  difficulty: "easy" | "medium" | "hard";
  generateProblem: () => Problem;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const TRAINING_SKILLS: MathSkill[] = [
  {
    id: "11-trick",
    name: "The 11 Trick",
    description: "Multiply any 2-digit number by 11 instantly",
    iconName: "Zap",
    difficulty: "easy",
    generateProblem: () => {
      const b = 11;
      const a = randomInt(10, 99);
      return { a, b, operation: "×", answer: a * b };
    },
  },
  {
    id: "complements-10",
    name: "Complements of 10",
    description: "Speed up addition when ones digits sum to 10",
    iconName: "Circle",
    difficulty: "easy",
    generateProblem: () => {
      const onesA = randomInt(1, 9);
      const onesB = 10 - onesA;
      const tensA = randomInt(1, 8);
      const tensB = randomInt(1, 8);
      
      const a = tensA * 10 + onesA;
      const b = tensB * 10 + onesB;
      
      return { a, b, operation: "+", answer: a + b };
    },
  },
  {
    id: "square-5",
    name: "Squaring Ends in 5",
    description: "Square any number ending in 5 in seconds",
    iconName: "Box",
    difficulty: "medium",
    generateProblem: () => {
      // 15, 25, ... 95. larger ones like 105 are possible too but let's stick to 2 digits for now
      const tens = randomInt(1, 9);
      const num = tens * 10 + 5;
      return { a: num, b: num, operation: "×", answer: num * num };
    },
  },
  {
    id: "mult-4",
    name: "Multiply by 4",
    description: "Double and double again technique",
    iconName: "Copy",
    difficulty: "easy",
    generateProblem: () => {
      const a = randomInt(12, 80); // Avoid single digits, they are too easy
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
    generateProblem: () => {
      // Answer should be something that results in a clean number or simple decimal?
      // The trick works for any number. Let's do integer answers for now to match app style?
      // "240 / 5 = 48" vs "24 / 5 = 4.8".
      // Existing app seems to handle integer answers mostly in generators?
      // Let's look at generateProblem in page.tsx:
      // `answer = Math.floor(...)` -> integer answers.
      // So we generate 'answer' then 'a'.
      const answer = randomInt(12, 150);
      const b = 5;
      const a = answer * b;
      return { a, b, operation: "÷", answer };
    },
  },
];

