import type { Metadata } from "next";
import Link from "next/link";
import { TrainingCta } from "@/components/marketing/training-cta";
import { blogPosts } from "@/content/blog/posts";
import { formatBlogDate } from "@/lib/blog-seo";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips, techniques, and drills for faster mental math. Improve arithmetic speed for interviews, everyday calculations, and competitive training.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog | thetamac",
    description:
      "Tips, techniques, and drills for faster mental math.",
  },
};

const practicePaths = [
  {
    href: "/arithmetic-speed-test",
    title: "Arithmetic speed test",
    description: "Run a timed benchmark for addition, subtraction, multiplication, and division.",
  },
  {
    href: "/mental-math-practice",
    title: "Mental math practice",
    description: "Choose drills, learning mode, leaderboards, and progress tracking.",
  },
  {
    href: "/case-interview-math-practice",
    title: "Case interview math practice",
    description: "Practice percentages, market sizing, break-even math, and business arithmetic.",
  },
  {
    href: "/zetamac-alternative",
    title: "Zetamac alternative",
    description: "Try Zetamac-style timed arithmetic with more feedback and training modes.",
  },
];

const operationPaths = [
  { href: "/practice/addition", label: "Addition" },
  { href: "/practice/subtraction", label: "Subtraction" },
  { href: "/practice/multiplication", label: "Multiplication" },
  { href: "/practice/division", label: "Division" },
];

export default function BlogIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <header className="mb-12">
        <h1 className="font-serif text-4xl sm:text-5xl font-normal tracking-tight mb-3">
          Blog
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Techniques, drills, and insights to sharpen your mental math skills —
          whether you&apos;re prepping for interviews or just want to calculate faster.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          For interview-specific practice paths, see the{" "}
          <Link href="/interview-math" className="text-primary hover:underline">
            Interview Math Hub
          </Link>
          .
        </p>
      </header>

      <section className="mb-14" aria-labelledby="practice-paths">
        <h2
          id="practice-paths"
          className="text-2xl font-semibold tracking-tight mb-4"
        >
          Practice paths
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {practicePaths.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="border-t border-border px-1 py-4 transition-colors hover:bg-secondary/40"
            >
              <h3 className="font-semibold">{path.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {path.description}
              </p>
            </Link>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {operationPaths.map((path) => (
            <Link
              key={path.href}
              href={path.href}
              className="rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-secondary/40"
            >
              {path.label} drills
            </Link>
          ))}
        </div>
      </section>

      <div className="space-y-10">
        {blogPosts.map((post) => (
          <article key={post.slug} className="group">
            <Link href={`/blog/${post.slug}`} className="block">
              <time
                dateTime={post.date}
                className="text-sm text-muted-foreground"
              >
                {formatBlogDate(post.date)}
              </time>
              <h2 className="mt-1 text-xl font-semibold group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="mt-2 text-muted-foreground line-clamp-2">
                {post.description}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {post.readingTime}
              </p>
              {post.lastReviewed ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last reviewed: {formatBlogDate(post.lastReviewed)}
                </p>
              ) : null}
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-16 border-y border-border py-8 text-center">
        <p className="text-lg font-medium mb-2">Ready to practice?</p>
        <p className="text-muted-foreground mb-4">
          Put these techniques to work with timed drills and instant feedback.
        </p>
        <TrainingCta
          href="/?preset=arithmetic-speed-test&source=seo&page=/blog"
          preset="arithmetic-speed-test"
          sourcePage="/blog"
          label="Start Timed Drill"
          pageType="blog"
        />
      </div>
    </div>
  );
}
