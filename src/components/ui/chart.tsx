import type { ReactNode } from "react";

// Single source of truth for recharts chrome colors. Tokens are OKLCH custom
// properties, which SVG paint accepts directly — never wrap them in hsl().
export const chartColors = {
  axis: "var(--muted-foreground)",
  grid: "var(--border)",
  cursor: "var(--secondary)",
  ink: "var(--foreground)",
  paper: "var(--background)",
  brand: "var(--brand)",
} as const;

export const axisDefaults = {
  stroke: chartColors.axis,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

// The plate every chart tooltip prints on: ink, hard corners, no shadow.
export function ChartTooltipFrame({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <div className="ink-panel rounded-[3px] px-3 py-2">
      {label != null && (
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-background/60">{label}</p>
      )}
      <div className="mt-0.5 space-y-0.5">{children}</div>
    </div>
  );
}

interface TooltipEntry {
  value: number | string;
  dataKey?: string | number;
  name?: string;
  payload?: Record<string, unknown>;
}

// Drop-in recharts `content` for the common case: label + one line per series.
// `formatValue` maps a series entry to its display string (units, %, s, …).
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  showSeriesName = false,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: ReactNode;
  formatValue?: (value: number | string, dataKey?: string) => string;
  showSeriesName?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <ChartTooltipFrame label={label}>
      {payload.map((entry, index) => {
        const key = entry.dataKey != null ? String(entry.dataKey) : undefined;
        const display = formatValue ? formatValue(entry.value, key) : String(entry.value);
        return (
          <p key={index} className="font-mono text-sm font-semibold">
            {showSeriesName && (key || entry.name) && (
              <span className="font-normal text-background/60">{entry.name ?? key}: </span>
            )}
            {display}
          </p>
        );
      })}
    </ChartTooltipFrame>
  );
}
