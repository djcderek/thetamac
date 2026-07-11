// Accuracy heat ramp in the "numbers as ink" language: mastery prints in
// increasing ink density; weakness flags in the single brand accent so the
// eye lands on what needs training. No third hue, dark mode inherits.
export function heatClass(accuracy: number | null | undefined): string {
  if (accuracy == null) return "border border-border/60";
  if (accuracy >= 95) return "bg-foreground/85 text-background";
  if (accuracy >= 85) return "bg-foreground/65 text-background";
  if (accuracy >= 75) return "bg-foreground/45 text-foreground";
  if (accuracy >= 65) return "bg-foreground/25 text-foreground";
  if (accuracy >= 50) return "bg-foreground/12 text-foreground";
  if (accuracy >= 25) return "bg-brand/30 text-foreground";
  return "bg-brand/55 text-brand-foreground";
}

// Same principle for speed: fast answers print in ink, slow ones flag in brand.
export function speedHeatClass(avgTime: number | null | undefined): string {
  if (avgTime == null) return "border border-border/60";
  if (avgTime <= 1) return "bg-foreground/85 text-background";
  if (avgTime <= 2) return "bg-foreground/65 text-background";
  if (avgTime <= 3) return "bg-foreground/40 text-foreground";
  if (avgTime <= 5) return "bg-brand/30 text-foreground";
  return "bg-brand/55 text-brand-foreground";
}

// Legend steps, strongest first, for rendering the two ramp strips.
export const HEAT_LEGEND = {
  mastered: ["bg-foreground/85", "bg-foreground/65", "bg-foreground/45", "bg-foreground/25", "bg-foreground/12"],
  needsWork: ["bg-brand/30", "bg-brand/55"],
} as const;
