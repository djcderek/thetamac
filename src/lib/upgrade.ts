export type UpgradeFeature = "analytics" | "coins" | "review" | "lessons" | "daily" | "quant";

/**
 * A path on this site to come back to after upgrading, or null. Only same-site paths pass,
 * so the link can't be used to send someone elsewhere.
 */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 300) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

export function getUpgradeUrl({
  feature,
  source,
  next,
}: {
  feature?: UpgradeFeature;
  source?: string;
  /** Where to send the player once Pro is active, e.g. the lesson they were in. */
  next?: string;
}) {
  const params = new URLSearchParams();
  if (feature) params.set("feature", feature);
  if (source) params.set("source", source);
  const back = safeNextPath(next);
  if (back) params.set("next", back);

  const qs = params.toString();
  return `/upgrade${qs ? `?${qs}` : ""}`;
}
