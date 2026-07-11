import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { AsciiMorph } from "./ascii-morph";
import { CornerBrackets } from "./corner-frame";

export function DotField({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("dot-field", className)} {...props} />;
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
    <header className={cn("relative overflow-hidden border-b border-border bg-background", className)}>
      <div className="bayer-fade-l pointer-events-none absolute -right-4 top-1/2 hidden -translate-y-1/2 opacity-45 lg:block">
        <AsciiMorph shapes={["theta"]} animate={false} className="w-56" />
      </div>
      <div className="relative flex min-h-32 items-center justify-between gap-6 px-5 py-7 md:px-8">
        <div className="max-w-2xl">
          {eyebrow && <SectionLabel className="mb-2 text-brand">{eyebrow}</SectionLabel>}
          <h1 className="font-serif text-3xl font-normal tracking-tight md:text-4xl">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

// Ledger stat: a strong top rule, a label, and a bare tabular numeral. No box.
export function MetricTile({ label, value, detail, className }: { label: string; value: ReactNode; detail?: ReactNode; className?: string }) {
  return (
    <div className={cn("border-t-2 border-foreground/80 pt-3", className)}>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-2 font-mono text-3xl font-semibold tracking-tight">{value}</div>
      {detail && <div className="mt-1.5 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

export function BrandedEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center border-y border-border py-10 text-center">
      <div className="relative mb-3 px-5 py-2.5">
        <CornerBrackets size={10} />
        <DitherIllustration className="w-20" />
      </div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
