export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date string
  readingTime: string;
}

/**
 * Canonical list of blog posts.
 * Used by the blog index page and sitemap generator.
 * Add new posts at the top (newest first).
 */
export const blogPosts: BlogPost[] = [
  {
    slug: "mental-math-interview-drills",
    title: "Mental Math for Interviews: A 10-Minute Daily Routine",
    description:
      "Build speed and confidence for finance, consulting, and tech interviews with a focused daily mental math practice routine.",
    date: "2025-11-12",
    readingTime: "7 min read",
  },
  {
    slug: "fast-multiplication-techniques",
    title: "Fast Multiplication Without a Calculator: Techniques & Drills",
    description:
      "Learn the 11 trick, squaring shortcuts, and distributive strategies to multiply large numbers in your head quickly.",
    date: "2025-10-02",
    readingTime: "9 min read",
  },
  {
    slug: "timed-arithmetic-drills",
    title: "Timed Arithmetic Drills: How to Measure and Improve Speed",
    description:
      "Use timed drills effectively to track your mental math progress and systematically get faster at addition, subtraction, multiplication, and division.",
    date: "2025-08-19",
    readingTime: "6 min read",
  },
];

