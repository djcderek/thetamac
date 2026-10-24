import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { QUANT_LESSONS } from "@/lib/quant/lessons";
import { cn } from "@/lib/utils";

/** A short pointer from the arithmetic pages to the quant course, for readers heading to trading interviews. */
export function QuantCourseLink({ className }: { className?: string }) {
  return (
    <aside className={cn("rounded-[22px] bg-secondary p-5 sm:p-6", className)}>
      <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Interviewing for a trading or quant role?</h2>
      <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
        Those interviews add probability and expected value questions to the mental math. The quant course covers them in {QUANT_LESSONS.length} lessons, from
        counting to continuous probability, with a worked solution for every question.
      </p>
      <Link href="/quant-interview-prep" className="mt-3 inline-flex items-center gap-1 text-[15px] font-medium underline-offset-4 hover:underline">
        See the quant course
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </Link>
    </aside>
  );
}
