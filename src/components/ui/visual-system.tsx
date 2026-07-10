import { useId, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DotField({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn("dot-field", className)} {...props} />;
}

export function SectionLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("editorial-label", className)} {...props} />;
}

export function DitherIllustration({ className }: { className?: string }) {
  const dots = Array.from({ length: 88 }, (_, index) => {
    const column = index % 11;
    const row = Math.floor(index / 11);
    const centerDistance = Math.abs(column - 5) + Math.abs(row - 3.5);
    const visible = (column * 7 + row * 5) % 9 > centerDistance * 0.65;
    return visible ? (
      <circle key={index} cx={8 + column * 8} cy={8 + row * 8} r={centerDistance < 3 ? 2.2 : 1.45} />
    ) : null;
  });

  return (
    <svg
      viewBox="0 0 96 72"
      aria-hidden="true"
      className={cn("text-brand", className)}
      fill="currentColor"
    >
      {dots}
      <circle cx="48" cy="38" r="25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M24 42Q48 20 72 42" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function OrbitalMotif({ className }: { className?: string }) {
  const patternId = `orbital-dots-${useId().replace(/:/g, "")}`;

  return (
    <svg
      viewBox="0 0 280 180"
      aria-hidden="true"
      className={cn("text-border", className)}
      fill="none"
    >
      <defs>
        <pattern id={patternId} width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.15" fill="currentColor" />
        </pattern>
      </defs>
      <g stroke="currentColor" strokeWidth="1.25">
        <rect x="-28" y="8" width="118" height="68" rx="24" fill={`url(#${patternId})`} />
        <rect x="190" y="8" width="118" height="68" rx="24" fill={`url(#${patternId})`} />
        <rect x="81" y="48" width="118" height="86" rx="28" fill={`url(#${patternId})`} />
        <rect x="-28" y="114" width="118" height="68" rx="24" fill={`url(#${patternId})`} />
        <rect x="190" y="114" width="118" height="68" rx="24" fill={`url(#${patternId})`} />
      </g>
    </svg>
  );
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
      <OrbitalMotif className="pointer-events-none absolute -right-10 top-1/2 hidden h-44 w-72 -translate-y-1/2 opacity-60 lg:block" />
      <div className="relative flex min-h-32 items-center justify-between gap-6 px-5 py-7 md:px-8">
        <div className="max-w-2xl">
          {eyebrow && <SectionLabel className="mb-2 text-brand">{eyebrow}</SectionLabel>}
          <h1 className="text-2xl font-semibold tracking-[-0.035em] md:text-3xl">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function MetricTile({ label, value, detail, className }: { label: string; value: ReactNode; detail?: ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm before:absolute before:inset-x-5 before:top-0 before:h-0.5 before:bg-brand", className)}>
      <div>
        <SectionLabel>{label}</SectionLabel>
        <div className="mt-3 font-mono text-2xl font-semibold tracking-tight">{value}</div>
        {detail && <div className="mt-2 text-xs text-muted-foreground">{detail}</div>}
      </div>
    </div>
  );
}

export function BrandedEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/15 p-4 text-center">
      <div className="dot-field mb-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-1">
        <DitherIllustration className="h-12 w-20" />
      </div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
