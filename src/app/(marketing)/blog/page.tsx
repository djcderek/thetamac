import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/content/blog/posts";

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

export default function BlogIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <header className="mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
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

      <div className="space-y-10">
        {blogPosts.map((post) => (
          <article key={post.slug} className="group">
            <Link href={`/blog/${post.slug}`} className="block">
              <time
                dateTime={post.date}
                className="text-sm text-muted-foreground"
              >
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
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
                  Last reviewed: {new Date(post.lastReviewed).toLocaleDateString("en-US")}
                </p>
              ) : null}
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-16 rounded-xl border border-border bg-secondary/30 p-6 text-center">
        <p className="text-lg font-medium mb-2">Ready to practice?</p>
        <p className="text-muted-foreground mb-4">
          Put these techniques to work with timed drills and instant feedback.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Start Training
        </Link>
      </div>
    </div>
  );
}
