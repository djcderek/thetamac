"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AsciiMorph } from "@/components/ui/ascii-morph";
import { cn } from "@/lib/utils";

export function TrainingHeader({ active = false }: { active?: boolean }) {
  return (
    <header className={cn("relative overflow-hidden border-b border-border bg-background", active && "sr-only md:not-sr-only")}>
      <div className="bayer-fade-l pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 opacity-45 lg:block">
        <AsciiMorph shapes={["theta"]} animate={false} className="w-56" />
      </div>
      <div className="relative flex min-h-32 items-center justify-between gap-6 px-5 py-6 md:px-8">
        <div className="max-w-2xl">
        <h1 className="font-serif text-3xl font-normal tracking-tight md:text-4xl">Mental Math Training</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Practice arithmetic speed and accuracy at your own pace.
        </p>

        <details className="group mt-3 max-w-2xl">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-card/85 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors marker:content-none hover:border-brand/50 hover:text-foreground">
            About this trainer
            <ChevronDown
              aria-hidden="true"
              className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            />
          </summary>

          <div className="mt-3 border-l-2 border-border pl-4 py-1 text-sm text-muted-foreground">
            <h2 className="mb-1.5 font-medium text-foreground">
              Build faster, more accurate mental math
            </h2>
            <p className="leading-6">
              Train addition, subtraction, multiplication, and division with customizable timed
              drills, focused practice, and step-by-step learning. Choose a difficulty, adjust the
              number ranges, and use short daily sessions to improve speed without sacrificing
              accuracy.
            </p>
            <p className="mt-2 leading-6">
              Track your progress over time or test your skills through leaderboards, multiplayer
              duels, and racing modes.
            </p>
            <Link
              href="/mental-math-practice"
              className="mt-3 inline-flex font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
            >
              Learn how to structure your practice →
            </Link>
          </div>
        </details>
        </div>
      </div>
    </header>
  );
}
