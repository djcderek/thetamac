export type UpgradeFeature = "analytics" | "coins" | "review";

export function getUpgradeUrl({
  feature,
  source,
}: {
  feature?: UpgradeFeature;
  source?: string;
}) {
  const params = new URLSearchParams();
  if (feature) params.set("feature", feature);
  if (source) params.set("source", source);

  const qs = params.toString();
  return `/upgrade${qs ? `?${qs}` : ""}`;
}
