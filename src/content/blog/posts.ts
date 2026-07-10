export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date string
  readingTime: string;
  primaryKeyword?: string;
  targetIntent?: "informational" | "commercial";
  lastReviewed?: string; // ISO date string
  conversionGoal?: "start-training" | "create-account";
}

/**
 * Canonical list of blog posts.
 * Used by the blog index page and sitemap generator.
 * Add new posts at the top (newest first).
 */
export const blogPosts: BlogPost[] = [
  {
    slug: "case-interview-math-questions",
    title: "Case Interview Math Questions: 15 Fast-Solve Patterns",
    description:
      "Practice common case interview math question types with fast mental frameworks, worked solutions, and a timed drill workflow.",
    date: "2026-03-05",
    readingTime: "8 min read",
    primaryKeyword: "case interview math questions",
    targetIntent: "informational",
    lastReviewed: "2026-03-05",
    conversionGoal: "start-training",
  },
  {
    slug: "rule-of-72-cagr-interview-math",
    title: "Rule of 72 and CAGR Interview Math: Fast Methods That Hold Up",
    description:
      "Use Rule of 72, doubling/halving heuristics, and quick CAGR approximations to answer growth questions faster in finance and consulting interviews.",
    date: "2026-03-05",
    readingTime: "10 min read",
    primaryKeyword: "rule of 72 interview math",
    targetIntent: "informational",
    lastReviewed: "2026-03-05",
    conversionGoal: "start-training",
  },
  {
    slug: "break-even-contribution-margin-interview-math",
    title: "Break-Even and Contribution Margin Interview Math: Fast Solve Guide",
    description:
      "Master break-even, contribution margin, and target-profit interview questions with quick setup rules and worked examples.",
    date: "2026-03-05",
    readingTime: "11 min read",
    primaryKeyword: "break-even interview math",
    targetIntent: "informational",
    lastReviewed: "2026-03-05",
    conversionGoal: "start-training",
  },
  {
    slug: "market-sizing-examples-answers",
    title: "Market Sizing Examples With Answers: Interview Math Walkthroughs",
    description:
      "Practice market sizing interview questions with complete worked answers, assumption frameworks, and sanity-check steps.",
    date: "2026-03-05",
    readingTime: "11 min read",
    primaryKeyword: "market sizing examples",
    targetIntent: "informational",
    lastReviewed: "2026-07-10",
    conversionGoal: "start-training",
  },
  {
    slug: "mental-math-interview-drills",
    title: "Mental Math for Interviews: A 10-Minute Daily Routine",
    description:
      "Build speed and confidence for finance, consulting, and tech interviews with a focused daily mental math practice routine.",
    date: "2025-11-12",
    readingTime: "7 min read",
    primaryKeyword: "mental math for interviews",
    targetIntent: "informational",
    lastReviewed: "2026-07-10",
    conversionGoal: "start-training",
  },
  {
    slug: "fast-multiplication-techniques",
    title: "Fast Multiplication Without a Calculator: Techniques & Drills",
    description:
      "Learn the 11 trick, squaring shortcuts, and distributive strategies to multiply large numbers in your head quickly.",
    date: "2025-10-02",
    readingTime: "9 min read",
    primaryKeyword: "fast multiplication without calculator",
    targetIntent: "informational",
    lastReviewed: "2026-07-10",
    conversionGoal: "start-training",
  },
  {
    slug: "timed-arithmetic-drills",
    title: "Timed Arithmetic Drills: How to Measure and Improve Speed",
    description:
      "Use timed drills effectively to track your mental math progress and systematically get faster at addition, subtraction, multiplication, and division.",
    date: "2025-08-19",
    readingTime: "6 min read",
    primaryKeyword: "timed arithmetic drills",
    targetIntent: "informational",
    lastReviewed: "2026-03-05",
    conversionGoal: "start-training",
  },
];
