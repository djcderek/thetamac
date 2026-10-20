"use client";

import type { HTMLAttributes, ReactNode } from "react";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { snapSpring } from "@/lib/motion";
import { AsciiMorph } from "./ascii-morph";

export function DotField({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("dot-field", className)} {...props} />;
}

// Option tiles: soft grey chips that fill with ink when selected (Kurb's Active/Resolved).
// With `slidingPill`, the ink fill is drawn by <SelectionPill> instead, so it can slide
// between the options of a group.
export function optionTileClass(selected: boolean, extra?: string, { slidingPill = false } = {}) {
  return cn(
    "rounded-2xl px-3 py-3 transition-colors duration-200",
    slidingPill && "relative isolate",
    selected
      ? slidingPill ? "bg-control text-background" : "bg-foreground text-background"
      : "bg-control hover:bg-control-hover",
    extra,
  );
}

/** The ink fill of the selected option; one per group (`group` = a unique layoutId). */
export function SelectionPill({ group, className }: { group: string; className?: string }) {
  return (
    <motion.span
      layoutId={group}
      // Animate only the hand-off between options, never page reflow.
      layoutDependency={group}
      transition={snapSpring}
      aria-hidden="true"
      className={cn("absolute inset-0 -z-10 rounded-2xl bg-foreground", className)}
    />
  );
}

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("editorial-label", className)} {...props} />;
}

// The brand figure — the logo's circle + arc drawn as a static field of digits.
export function DitherIllustration({ className }: { className?: string }) {
  return <AsciiMorph shapes={["theta"]} animate={false} className={cn("text-brand", className)} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    // Plain, type-led page header: no rule, ornament, or eyebrow color.
    <header className={cn("bg-background", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-10 pb-6 md:px-6 md:pt-14">
        <div className="max-w-2xl">
          {eyebrow && <SectionLabel className="mb-2">{eyebrow}</SectionLabel>}
          <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[44px]">{title}</h1>
          {description && <p className="mt-3 text-[15px] leading-6 text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

// Stat tile: a soft grey surface with a small label above a large tabular numeral.
export function MetricTile({ label, value, detail, className }: { label: string; value: ReactNode; detail?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[20px] bg-secondary px-4 py-4", className)}>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.03em] tabular-nums">{value}</div>
      {detail && <div className="mt-1 text-[13px] text-muted-foreground">{detail}</div>}
    </div>
  );
}

export function BrandedEmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    // Quiet empty state: a short title, one line of guidance, and at most one action.
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[20px] bg-secondary text-center",
        compact ? "h-full min-h-0 px-4 py-4" : "min-h-40 px-6 py-10",
      )}
    >
      <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
      <p
        className={cn(
          "max-w-sm text-muted-foreground",
          compact ? "mt-0.5 text-xs leading-5" : "mt-1 text-sm leading-6",
        )}
      >
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
