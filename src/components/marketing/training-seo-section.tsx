"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { TRAINING_SEO_FAQ } from "@/content/training-faq";

export function TrainingSeoSection() {
  const [showAllFaq, setShowAllFaq] = useState(false);
  const visibleFaq = showAllFaq ? TRAINING_SEO_FAQ : TRAINING_SEO_FAQ.slice(0, 3);

  return (
    <section className="mt-8 pb-12">
      <div className="px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          {/* Soft divider */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              About thetamac
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Intro - visually smaller, SEO-friendly H1 */}
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h1 className="text-lg md:text-xl font-medium text-foreground mb-2">
              Mental math training for fast arithmetic practice
            </h1>
            <p className="text-sm text-muted-foreground">
              Build speed and accuracy with daily drills. Useful for school, everyday calculations,
              and fast-paced work like finance and consulting interviews.
            </p>
          </div>

          {/* Compact feature highlights */}
          <div className="grid gap-6 sm:grid-cols-3 mb-10">
            <div className="text-center">
              <p className="text-sm font-medium mb-1">Timed drills</p>
              <p className="text-xs text-muted-foreground">
                Sprint sessions for speed under pressure
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1">Learning mode</p>
              <p className="text-xs text-muted-foreground">
                Step-by-step explanations and techniques
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium mb-1">Competitive modes</p>
              <p className="text-xs text-muted-foreground">
                Duels, racing, and global leaderboards
              </p>
            </div>
          </div>

          {/* Quick tips row */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4 mb-10">
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <p className="font-medium mb-1">How it works</p>
                <ol className="text-muted-foreground text-xs space-y-0.5 list-decimal pl-4">
                  <li>Pick a mode above (Timed, Practice, or Learning)</li>
                  <li>Choose operations and difficulty</li>
                  <li>Train for a few minutes daily</li>
                </ol>
              </div>
              <div>
                <p className="font-medium mb-1">Interview prep routine</p>
                <ul className="text-muted-foreground text-xs space-y-0.5 list-disc pl-4">
                  <li>2 min warm-up (Medium, +/−)</li>
                  <li>5 min timed (Medium→Hard, all ops)</li>
                  <li>3 min review in Learning mode</li>
                </ul>
              </div>
            </div>
          </div>

          {/* FAQ - collapsible */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium">Frequently asked questions</h2>
              <Link
                href="/blog"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Read guides →
              </Link>
            </div>
            <div className="space-y-2">
              {visibleFaq.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-lg border border-border bg-card"
                >
                  <summary className="flex cursor-pointer items-center justify-between p-3 text-sm font-medium">
                    {item.question}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-3 pb-3 text-sm text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
            {!showAllFaq && TRAINING_SEO_FAQ.length > 3 && (
              <button
                onClick={() => setShowAllFaq(true)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Show {TRAINING_SEO_FAQ.length - 3} more questions
              </button>
            )}
          </div>

          {/* Footer links */}
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <Link href="/interview-math" className="hover:text-foreground transition-colors">
              Interview Prep Guides
            </Link>
            <Link href="/leaderboard" className="hover:text-foreground transition-colors">
              Leaderboards
            </Link>
            <Link href="/multiplayer" className="hover:text-foreground transition-colors">
              Multiplayer
            </Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/training/weak-points" className="hover:text-foreground transition-colors">
              Weak Points (Pro)
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
