/**
 * Formats a placement percentile (share of runs at or below the score) for display:
 * "Top 1%" at the very top, otherwise an ordinal like "21st percentile".
 */
export function formatPlacement(percentile: number | null): string {
  if (percentile === null) return "Not enough data yet";
  const rounded = Math.round(percentile);
  if (rounded >= 99) return "Top 1%";
  return `${withOrdinalSuffix(Math.max(1, rounded))} percentile`;
}

function withOrdinalSuffix(value: number): string {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[value % 10] ?? "th";
  return `${value}${suffix}`;
}

/** The placement as one line for the top of the results: "72nd percentile", or for a stopped run "On pace for the 72nd percentile". */
export function placementLine(percentile: number, basis: "score" | "pace" = "score"): string {
  const placement = formatPlacement(percentile);
  if (basis === "score") return placement;
  return placement === "Top 1%" ? "On pace for the top 1%" : `On pace for the ${placement}`;
}
