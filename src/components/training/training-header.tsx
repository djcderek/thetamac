"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Type-led, centered hero (after Kurb's landing): one warm headline, a short line under it,
// and the longer explanation tucked behind a quiet disclosure. Hidden during a run so the
// problem has the screen, but kept for screen readers.
export function TrainingHeader({ active = false }: { active?: boolean }) {
  return (
    <header className={cn("bg-background", active && "sr-only")}>
      <div className="mx-auto max-w-2xl px-5 pt-12 pb-8 text-center md:pt-20 md:pb-10">
        {/* The h1 keeps the page's search keyword; the large line is display copy. */}
        <h1 className="text-[15px] font-medium text-muted-foreground">Mental math training</h1>
        <p className="mt-3 text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] text-balance text-foreground md:text-[60px]">
          Two minutes. <span className="text-brand">How many</span> can you solve?
        </p>
        <p className="mx-auto mt-4 max-w-md text-[17px] leading-7 text-muted-foreground">
          Timed mental math drills for interviews, school, and the fun of getting faster.
        </p>

        <details className="disclosure group mx-auto mt-5 max-w-xl text-left">
          <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors marker:content-none hover:text-foreground">
            About this trainer
            <ChevronDown
              aria-hidden="true"
              className="h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-180"
            />
          </summary>

          <div className="mt-3 rounded-[22px] bg-secondary px-5 py-4 text-[15px] text-muted-foreground">
            <h2 className="mb-1.5 font-semibold text-foreground">
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
            <p className="mt-2 leading-6">
              Preparing for a trading or quant interview? The{" "}
              <Link href="/quant-interview-prep" className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground">
                quant course
              </Link>{" "}
              teaches the probability and expected value those interviews ask.
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
    </header>
  );
}
