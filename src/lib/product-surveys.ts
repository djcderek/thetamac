export const PRODUCT_SURVEY_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
export const PRODUCT_SURVEY_PENDING_TTL_MS = 10 * 1000;

export const PRODUCT_SURVEY_LAST_SHOWN_KEY =
  "thetamac-product-survey-last-shown-at";
export const PRODUCT_SURVEY_PENDING_KEY =
  "thetamac-product-survey-pending-at";

export const PRODUCT_SURVEY_NAMES = {
  trainingGoal: "Training goal",
  trainingFriction: "Training friction",
  nextFeature: "Next feature",
  upgradeFriction: "Upgrade friction",
} as const;

export type ProductSurveySurface = "training" | "upgrade";

export interface ProductSurveyCandidate {
  id: string;
  name: string;
}

const SURVEY_PRIORITY: Record<ProductSurveySurface, readonly string[]> = {
  training: [
    PRODUCT_SURVEY_NAMES.trainingGoal,
    PRODUCT_SURVEY_NAMES.trainingFriction,
    PRODUCT_SURVEY_NAMES.nextFeature,
  ],
  upgrade: [PRODUCT_SURVEY_NAMES.upgradeFriction],
};

export function parseSurveyTimestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function isProductSurveyCooldownActive(
  now: number,
  lastShownAt: number | null
): boolean {
  return lastShownAt !== null && now - lastShownAt < PRODUCT_SURVEY_COOLDOWN_MS;
}

export function isProductSurveyPending(
  now: number,
  pendingAt: number | null
): boolean {
  return pendingAt !== null && now - pendingAt < PRODUCT_SURVEY_PENDING_TTL_MS;
}

export function shouldAttemptProductSurvey({
  enabled,
  optedOut,
  now,
  lastShownAt,
  pendingAt,
}: {
  enabled: boolean;
  optedOut: boolean;
  now: number;
  lastShownAt: number | null;
  pendingAt: number | null;
}): boolean {
  return (
    enabled &&
    !optedOut &&
    !isProductSurveyCooldownActive(now, lastShownAt) &&
    !isProductSurveyPending(now, pendingAt)
  );
}

export function selectProductSurvey(
  candidates: readonly ProductSurveyCandidate[],
  surface: ProductSurveySurface
): ProductSurveyCandidate | null {
  const byName = new Map(candidates.map((candidate) => [candidate.name, candidate]));
  for (const name of SURVEY_PRIORITY[surface]) {
    const candidate = byName.get(name);
    if (candidate) return candidate;
  }
  return null;
}

export function shouldCaptureCheckoutCancellation(
  cancelled: boolean,
  alreadyCaptured: boolean
): boolean {
  return cancelled && !alreadyCaptured;
}
