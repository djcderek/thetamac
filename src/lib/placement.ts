/**
 * Formats a placement percentile (share of runs at or below the score) for display:
 * "Top 1%" and "Bottom 1%" at the ends, otherwise an ordinal like "21st percentile".
 */
export function formatPlacement(percentile: number | null): string {
  if (percentile === null) return "Not enough data yet";
  const rounded = Math.round(percentile);
  if (rounded >= 99) return "Top 1%";
  if (rounded <= 1) return "Bottom 1%";
  return `${withOrdinalSuffix(rounded)} percentile`;
}

function withOrdinalSuffix(value: number): string {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th";
  return `${value}${suffix}`;
}
