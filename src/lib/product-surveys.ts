export const PRODUCT_SURVEY_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
export const PRODUCT_SURVEY_PENDING_TTL_MS = 10 * 1000;

export const PRODUCT_SURVEY_LAST_SHOWN_KEY =
  "thetamac-product-survey-last-shown-at";
export const PRODUCT_SURVEY_PENDING_KEY =
  "thetamac-product-survey-pending-at";
export const PRODUCT_SURVEY_ACTIVITY_KEY =
  "thetamac-product-survey-activity-v1";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVITY_AGE_MS = 30 * DAY_MS;

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

export interface ProductSurveyActivity {
  trainingCompleted: number[];
  freeTrainingCompleted: number[];
  trainingAbandoned: number[];
  upgradePageViewed: number[];
  checkoutCancelled: number[];
  checkoutInitiated: number[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const EMPTY_PRODUCT_SURVEY_ACTIVITY: ProductSurveyActivity = {
  trainingCompleted: [],
  freeTrainingCompleted: [],
  trainingAbandoned: [],
  upgradePageViewed: [],
  checkoutCancelled: [],
  checkoutInitiated: [],
};

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
  surface: ProductSurveySurface,
  eligibleNames?: ReadonlySet<string>
): ProductSurveyCandidate | null {
  const byName = new Map(candidates.map((candidate) => [candidate.name, candidate]));
  for (const name of SURVEY_PRIORITY[surface]) {
    if (eligibleNames && !eligibleNames.has(name)) continue;
    const candidate = byName.get(name);
    if (candidate) return candidate;
  }
  return null;
}

function sanitizeTimestamps(value: unknown, now: number): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (timestamp): timestamp is number =>
      typeof timestamp === "number" &&
      Number.isFinite(timestamp) &&
      timestamp >= 0 &&
      timestamp <= now &&
      now - timestamp <= MAX_ACTIVITY_AGE_MS
  );
}

export function readProductSurveyActivity(
  storage: Pick<StorageLike, "getItem">,
  now = Date.now()
): ProductSurveyActivity {
  try {
    const stored = storage.getItem(PRODUCT_SURVEY_ACTIVITY_KEY);
    if (!stored) return { ...EMPTY_PRODUCT_SURVEY_ACTIVITY };
    const parsed = JSON.parse(stored) as Partial<ProductSurveyActivity>;
    return {
      trainingCompleted: sanitizeTimestamps(parsed.trainingCompleted, now),
      freeTrainingCompleted: sanitizeTimestamps(
        parsed.freeTrainingCompleted,
        now
      ),
      trainingAbandoned: sanitizeTimestamps(parsed.trainingAbandoned, now),
      upgradePageViewed: sanitizeTimestamps(parsed.upgradePageViewed, now),
      checkoutCancelled: sanitizeTimestamps(parsed.checkoutCancelled, now),
      checkoutInitiated: sanitizeTimestamps(parsed.checkoutInitiated, now),
    };
  } catch {
    return { ...EMPTY_PRODUCT_SURVEY_ACTIVITY };
  }
}

export function recordProductSurveyActivityEvent(
  storage: StorageLike,
  event: string,
  properties: Record<string, unknown>,
  now = Date.now()
): void {
  const activity = readProductSurveyActivity(storage, now);
  let target: number[] | null = null;

  switch (event) {
    case "training_completed":
      activity.trainingCompleted.push(now);
      if (properties.plan === "free") {
        activity.freeTrainingCompleted.push(now);
      }
      break;
    case "training_abandoned":
      target = activity.trainingAbandoned;
      break;
    case "upgrade_page_viewed":
      target = activity.upgradePageViewed;
      break;
    case "checkout_cancelled":
      target = activity.checkoutCancelled;
      break;
    case "checkout_initiated":
      target = activity.checkoutInitiated;
      break;
    default:
      return;
  }

  target?.push(now);
  try {
    storage.setItem(PRODUCT_SURVEY_ACTIVITY_KEY, JSON.stringify(activity));
  } catch {
    // Product research state must never interrupt an application workflow.
  }
}

function countSince(timestamps: readonly number[], now: number, age: number) {
  return timestamps.filter((timestamp) => now - timestamp <= age).length;
}

export function getEligibleProductSurveyNames(
  surface: ProductSurveySurface,
  activity: ProductSurveyActivity,
  now = Date.now()
): ReadonlySet<string> {
  const eligible = new Set<string>();

  if (surface === "training") {
    if (countSince(activity.trainingCompleted, now, 7 * DAY_MS) >= 2) {
      eligible.add(PRODUCT_SURVEY_NAMES.trainingGoal);
    }
    if (countSince(activity.trainingAbandoned, now, 14 * DAY_MS) >= 2) {
      eligible.add(PRODUCT_SURVEY_NAMES.trainingFriction);
    }
    if (countSince(activity.freeTrainingCompleted, now, 30 * DAY_MS) >= 5) {
      eligible.add(PRODUCT_SURVEY_NAMES.nextFeature);
    }
  } else {
    const recentlyCancelled =
      countSince(activity.checkoutCancelled, now, 7 * DAY_MS) >= 1;
    const repeatedUpgradeViews =
      countSince(activity.upgradePageViewed, now, 14 * DAY_MS) >= 2;
    const recentlyStartedCheckout =
      countSince(activity.checkoutInitiated, now, 7 * DAY_MS) >= 1;
    if (
      recentlyCancelled ||
      (repeatedUpgradeViews && !recentlyStartedCheckout)
    ) {
      eligible.add(PRODUCT_SURVEY_NAMES.upgradeFriction);
    }
  }

  return eligible;
}

export function shouldCaptureCheckoutCancellation(
  cancelled: boolean,
  alreadyCaptured: boolean
): boolean {
  return cancelled && !alreadyCaptured;
}
