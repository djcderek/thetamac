import { PRODUCT_SURVEY_ACTIVITY_KEY } from "./product-surveys";

// Only people who knew the app before this release need a change announcement.
export const MOBILE_TRAINING_RELEASE_AT = Date.parse("2026-10-18T00:00:00Z");
export const MOBILE_TRAINING_ANNOUNCEMENT_KEY = "thetamac-mobile-training-2026-10-seen";

type AnnouncementStorage = Pick<Storage, "getItem" | "setItem">;

export function isPreMobileReleaseAccount(createdAt: Date | string): boolean {
  const timestamp = new Date(createdAt).getTime();
  return Number.isFinite(timestamp) && timestamp >= 0 && timestamp < MOBILE_TRAINING_RELEASE_AT;
}

function hasPreviousTraining(storage: AnnouncementStorage): boolean {
  try {
    const activity = JSON.parse(storage.getItem(PRODUCT_SURVEY_ACTIVITY_KEY) ?? "null");
    return [activity?.trainingCompleted, activity?.trainingAbandoned].some(
      (timestamps) => Array.isArray(timestamps) && timestamps.some(
        (timestamp: unknown) => typeof timestamp === "number" && Number.isFinite(timestamp) &&
          timestamp >= 0 && timestamp < MOBILE_TRAINING_RELEASE_AT,
      ),
    );
  } catch {
    return false;
  }
}

/** Consume on first mobile setup view, rather than showing again until dismissed. */
export function claimMobileTrainingAnnouncement(
  storage: AnnouncementStorage,
  { mobileSetup, returningAccount }: { mobileSetup: boolean; returningAccount: boolean },
): boolean {
  if (!mobileSetup) return false;
  try {
    if (storage.getItem(MOBILE_TRAINING_ANNOUNCEMENT_KEY) !== null) return false;
    if (!returningAccount && !hasPreviousTraining(storage)) return false;
    storage.setItem(MOBILE_TRAINING_ANNOUNCEMENT_KEY, "1");
    return true;
  } catch {
    // If the once-only preference cannot be saved, skip the announcement.
    return false;
  }
}
