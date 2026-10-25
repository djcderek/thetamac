"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getQuantLesson } from "@/lib/quant/lessons";

type QuantSummary = {
  started: boolean;
  next: { lessonId: string; step: "learn" | "practice" } | null;
  /** Set while `next` comes from the latest mock's plan. */
  plan: { done: number; total: number } | null;
  mastered: number;
  total: number;
  lastMock: { score: number; rating: string } | null;
};

/**
 * The quant course on the dashboard, in one row, for players who've started it: the lesson to
 * pick up (the next in their mock plan, while it has one), lessons mastered and the last mock.
 * Nothing shows for anyone who hasn't.
 */
export function QuantDashboardRow() {
  const [summary, setSummary] = useState<QuantSummary | null>(null);

  useEffect(() => {
    fetch("/api/quant/summary", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: QuantSummary | null) => data && setSummary(data))
      .catch(() => {});
  }, []);

  if (!summary?.started) return null;
  const lesson = summary.next ? getQuantLesson(summary.next.lessonId) : null;
  const details = [
    summary.plan ? `${summary.plan.done} of ${summary.plan.total} done in your plan` : `${summary.mastered} of ${summary.total} lessons mastered`,
    summary.lastMock ? `last mock ${summary.lastMock.score} (${summary.lastMock.rating})` : null,
  ].filter(Boolean);

  return (
    <section aria-label="Quant course" className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-secondary px-5 py-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-muted-foreground">Quant</p>
        <p className="truncate text-[17px] font-semibold tracking-[-0.01em]">
          {lesson
            ? summary.plan
              ? `Next in your plan: ${lesson.title}`
              : `${summary.next!.step === "practice" ? "Practise" : "Continue with"} ${lesson.title}`
            : "Every lesson mastered"}
        </p>
        <p className="text-[14px] text-muted-foreground">{details.join(" · ")}</p>
      </div>
      <Link
        href={lesson ? `/quant/${lesson.id}${summary.next!.step === "practice" ? "?step=practice" : ""}` : "/quant/mock"}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "min-h-10 shrink-0 bg-background")}
      >
        {lesson ? (summary.next!.step === "practice" ? "Practise" : summary.plan ? "Start" : "Continue") : "Take a mock"}
      </Link>
    </section>
  );
}
