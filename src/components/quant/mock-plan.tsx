"use client";

import Link from "next/link";
import { Check, ChevronRight, Lock, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getUpgradeUrl } from "@/lib/upgrade";
import { PLAN_RIGHT, planDuration, planStepHref, type MockPlan, type MockPlanStep } from "@/lib/quant/plan";
import { trackQuantUpgradeClick } from "@/components/quant/quant-analytics";

const locked = (step: MockPlanStep, pro: boolean) => !pro && !step.free && !step.done;

function stepNote(step: MockPlanStep) {
  if (step.done) return "Done";
  if (step.right > 0) return `${step.right} of ${PLAN_RIGHT} right`;
  return `About ${step.minutes} min`;
}

/**
 * The plan from the latest mock: the lessons behind its misses, each ticked off after
 * PLAN_RIGHT right answers, then another mock. On the free plan the Pro lessons show a lock,
 * and `upgrade` adds the button that opens them, which comes back to the first one's practice.
 */
export function MockPlanCard({ plan, pro, upgrade = false, className }: { plan: MockPlan; pro: boolean; upgrade?: boolean; className?: string }) {
  const lockedSteps = plan.steps.filter((s) => locked(s, pro));
  const lockedCount = lockedSteps.length;
  const finished = plan.done === plan.steps.length;
  const lessons = plan.steps.length === 1 ? "lesson" : "lessons";

  return (
    <section aria-labelledby="mock-plan-heading" className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="mock-plan-heading" className="text-[15px] font-semibold">
          Your plan
        </h2>
        <p className="text-[14px] tabular-nums text-muted-foreground">
          {plan.done} of {plan.steps.length} done
        </p>
      </div>
      <p className="px-1 text-[15px] leading-6 text-muted-foreground">
        {finished
          ? "You’ve worked through every lesson behind your misses. Take another mock to see where you are now."
          : `The ${plan.steps.length} ${lessons} behind your misses, about ${planDuration(plan.minutesLeft)}${plan.done ? " left" : ""}. Get ${PLAN_RIGHT} questions right in each to tick it off, then take another mock${plan.goal ? ` and aim for a ${plan.goal.label}` : ""}.`}
      </p>

      <ol className="divide-y divide-border rounded-[22px] bg-secondary px-5">
        {plan.steps.map((step, i) => (
          <li key={step.lessonId}>
            <Link href={planStepHref(step)} className="group flex items-center gap-3 py-3">
              {step.done ? (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                  <Check aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-control text-[13px] font-medium tabular-nums text-muted-foreground">{i + 1}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[15px] font-medium underline-offset-4 group-hover:underline", step.done && "text-muted-foreground")}>{step.title}</span>
                <span className="block truncate text-[13px] tabular-nums text-muted-foreground">
                  {step.unit === step.title ? stepNote(step) : `${step.unit} · ${stepNote(step)}`}
                </span>
              </span>
              {locked(step, pro) ? (
                <Lock aria-label="Practice is part of Pro" className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              )}
            </Link>
          </li>
        ))}
        <li className="flex items-center gap-3 py-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-control text-muted-foreground">
            <Timer aria-hidden="true" className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Take another mock</span>
            <span className="block text-[13px] text-muted-foreground">{finished ? "Ready when you are" : "Once the lessons are done"}</span>
          </span>
        </li>
      </ol>

      {upgrade && lockedCount > 0 && (
        <div className="px-1 pt-1">
          <p className="text-[15px] leading-6 text-muted-foreground">
            {lockedCount === plan.steps.length ? "Practice for these lessons is" : `Practice for ${lockedCount} of these lessons is`} part of Pro, along with
            unlimited mocks.
          </p>
          <Link
            href={getUpgradeUrl({ feature: "quant", source: "quant_mock_plan", next: `/quant/${lockedSteps[0].lessonId}?step=practice` })}
            onClick={() => trackQuantUpgradeClick("quant_mock_plan", { score: plan.score, locked_steps: lockedCount })}
            className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-4")}
          >
            <Lock aria-hidden="true" className="size-4" />
            Unlock your plan
          </Link>
        </div>
      )}
    </section>
  );
}

/** The plan in one line for the Quant page: how far along, and the next lesson in it. */
export function MockPlanRow({ plan, pro }: { plan: MockPlan; pro: boolean }) {
  const next = plan.steps.find((s) => !s.done);
  return (
    <Link
      href={next ? planStepHref(next) : "/quant/mock"}
      className="group flex items-center gap-4 rounded-[22px] bg-secondary px-5 py-4 transition-colors hover:bg-control"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] tabular-nums text-muted-foreground">
          Your plan · {plan.done} of {plan.steps.length} done
        </span>
        <span className="mt-0.5 block truncate text-[15px] font-medium">{next ? `Next: ${next.title}` : "Take another mock"}</span>
      </span>
      {next && locked(next, pro) ? (
        <Lock aria-label="Practice is part of Pro" className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      )}
    </Link>
  );
}
