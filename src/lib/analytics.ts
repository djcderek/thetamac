export const ANALYTICS_SCHEMA_VERSION = 1;
export const ANALYTICS_OPT_OUT_KEY = "thetamac-product-analytics-opt-out";

export const ANALYTICS_EVENTS = {
  accountCreated: "account_created",
  authFailed: "auth_failed",
  authStarted: "auth_started",
  authSucceeded: "auth_succeeded",
  billingPortalOpened: "billing_portal_opened",
  checkoutCancelled: "checkout_cancelled",
  checkoutCompleted: "checkout_completed",
  checkoutFailed: "checkout_failed",
  checkoutInitiated: "checkout_initiated",
  checkoutReturned: "checkout_returned",
  featureRequestSubmitted: "feature_request_submitted",
  leaderboardFilterChanged: "leaderboard_filter_changed",
  lessonCompleted: "lesson_completed",
  multiplayerCompleted: "multiplayer_completed",
  multiplayerJoined: "multiplayer_joined",
  mobileTrainingUpdateViewed: "mobile_training_update_viewed",
  mobileTrainingUpdateDismissed: "mobile_training_update_dismissed",
  premiumGateViewed: "premium_gate_viewed",
  quantDrillStarted: "quant_drill_started",
  quantLessonCompleted: "quant_lesson_completed",
  quantLessonRead: "quant_lesson_read",
  quantLessonStarted: "quant_lesson_started",
  quantLessonStepViewed: "quant_lesson_step_viewed",
  quantMockCompleted: "quant_mock_completed",
  quantMockStarted: "quant_mock_started",
  quantReviewCompleted: "quant_review_completed",
  quantReviewStarted: "quant_review_started",
  secondarySurfaceViewed: "secondary_surface_viewed",
  seoCtaClicked: "seo_cta_clicked",
  settingsSaved: "settings_saved",
  shopItemEquipped: "shop_item_equipped",
  shopItemPurchased: "shop_item_purchased",
  signupCtaClicked: "signup_cta_clicked",
  signupPromptViewed: "signup_prompt_viewed",
  subscriptionActivated: "subscription_activated",
  subscriptionCancelled: "subscription_cancelled",
  subscriptionExpired: "subscription_expired",
  subscriptionPaymentSucceeded: "subscription_payment_succeeded",
  subscriptionStatusChanged: "subscription_status_changed",
  trainingAbandoned: "training_abandoned",
  trainingCompleted: "training_completed",
  trainingFirstAnswered: "training_first_answered",
  trainingRestarted: "training_restarted",
  trainingSetupViewed: "training_setup_viewed",
  trainingStarted: "training_started",
  trialStarted: "trial_started",
  upgradeCtaClicked: "upgrade_cta_clicked",
  upgradePageViewed: "upgrade_page_viewed",
  userSignedOut: "user_signed_out",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type AnalyticsPropertyValue =
  | string
  | number
  | boolean
  | null
  | readonly (string | number | boolean)[];

export type AnalyticsProperties = Record<string, AnalyticsPropertyValue | undefined>;

const SENSITIVE_PROPERTY_NAMES = new Set([
  "access_token",
  "auth_token",
  "correct_answer",
  "email",
  "image",
  "name",
  "operand",
  "operands",
  "password",
  "profile_image",
  "refresh_token",
  "stripe_customer_id",
  "stripe_subscription_id",
  "submitted_answer",
  "token",
]);

function sanitizeValue(value: AnalyticsPropertyValue | undefined): AnalyticsPropertyValue | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.slice(0, 256);
  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => (typeof item === "string" ? item.slice(0, 128) : item));
  }
  return value;
}

export function sanitizeAnalyticsProperties(
  properties: AnalyticsProperties = {}
): Record<string, AnalyticsPropertyValue> {
  const sanitized: Record<string, AnalyticsPropertyValue> = {
    schema_version: ANALYTICS_SCHEMA_VERSION,
  };

  for (const [key, rawValue] of Object.entries(properties)) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey || SENSITIVE_PROPERTY_NAMES.has(normalizedKey)) continue;

    const value = sanitizeValue(rawValue);
    if (value !== undefined) sanitized[normalizedKey] = value;
  }

  return sanitized;
}

export function stripUrlQuery(value: string): string {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  const endIndexes = [queryIndex, hashIndex].filter((index) => index >= 0);
  const endIndex = endIndexes.length > 0 ? Math.min(...endIndexes) : value.length;
  return value.slice(0, endIndex);
}

export function isAnalyticsOptOutValue(value: string | null): boolean {
  return value === "true";
}

export function getAnalyticsInsertId(sourceId: string, suffix?: string): string {
  return suffix ? `${sourceId}:${suffix}` : sourceId;
}
