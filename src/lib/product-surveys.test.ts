import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_SURVEY_COOLDOWN_MS,
  PRODUCT_SURVEY_NAMES,
  PRODUCT_SURVEY_PENDING_TTL_MS,
  EMPTY_PRODUCT_SURVEY_ACTIVITY,
  getEligibleProductSurveyNames,
  isProductSurveyCooldownActive,
  isProductSurveyPending,
  parseSurveyTimestamp,
  readProductSurveyActivity,
  recordProductSurveyActivityEvent,
  selectProductSurvey,
  shouldAttemptProductSurvey,
  shouldCaptureCheckoutCancellation,
} from "./product-surveys";

test("training surveys follow the configured priority and ignore unknown surveys", () => {
  const selected = selectProductSurvey(
    [
      { id: "unknown", name: "Unknown survey" },
      { id: "feature", name: PRODUCT_SURVEY_NAMES.nextFeature },
      { id: "friction", name: PRODUCT_SURVEY_NAMES.trainingFriction },
      { id: "goal", name: PRODUCT_SURVEY_NAMES.trainingGoal },
    ],
    "training"
  );

  assert.deepEqual(selected, {
    id: "goal",
    name: PRODUCT_SURVEY_NAMES.trainingGoal,
  });
  assert.equal(
    selectProductSurvey([{ id: "unknown", name: "Unknown survey" }], "training"),
    null
  );
});

test("upgrade surfaces only select the upgrade-friction survey", () => {
  assert.deepEqual(
    selectProductSurvey(
      [
        { id: "goal", name: PRODUCT_SURVEY_NAMES.trainingGoal },
        { id: "upgrade", name: PRODUCT_SURVEY_NAMES.upgradeFriction },
      ],
      "upgrade"
    ),
    { id: "upgrade", name: PRODUCT_SURVEY_NAMES.upgradeFriction }
  );
});

test("survey cooldown lasts 14 days and unlocks at the boundary", () => {
  const now = 1_800_000_000_000;
  assert.equal(
    isProductSurveyCooldownActive(now, now - PRODUCT_SURVEY_COOLDOWN_MS + 1),
    true
  );
  assert.equal(
    isProductSurveyCooldownActive(now, now - PRODUCT_SURVEY_COOLDOWN_MS),
    false
  );
});

test("pending survey attempts expire after ten seconds", () => {
  const now = 1_800_000_000_000;
  assert.equal(
    isProductSurveyPending(now, now - PRODUCT_SURVEY_PENDING_TTL_MS + 1),
    true
  );
  assert.equal(
    isProductSurveyPending(now, now - PRODUCT_SURVEY_PENDING_TTL_MS),
    false
  );
});

test("survey attempts respect opt-out, safe-surface, cooldown, and pending locks", () => {
  const base = {
    enabled: true,
    optedOut: false,
    now: 100_000,
    lastShownAt: null,
    pendingAt: null,
  };

  assert.equal(shouldAttemptProductSurvey(base), true);
  assert.equal(shouldAttemptProductSurvey({ ...base, enabled: false }), false);
  assert.equal(shouldAttemptProductSurvey({ ...base, optedOut: true }), false);
  assert.equal(shouldAttemptProductSurvey({ ...base, lastShownAt: 99_999 }), false);
  assert.equal(shouldAttemptProductSurvey({ ...base, pendingAt: 99_999 }), false);
});

test("invalid stored timestamps are ignored", () => {
  assert.equal(parseSurveyTimestamp(null), null);
  assert.equal(parseSurveyTimestamp("not-a-number"), null);
  assert.equal(parseSurveyTimestamp("-1"), null);
  assert.equal(parseSurveyTimestamp("123"), 123);
});

test("checkout cancellation is captured once", () => {
  assert.equal(shouldCaptureCheckoutCancellation(false, false), false);
  assert.equal(shouldCaptureCheckoutCancellation(true, false), true);
  assert.equal(shouldCaptureCheckoutCancellation(true, true), false);
});

test("training survey eligibility follows the configured activity thresholds", () => {
  const now = 1_800_000_000_000;
  const day = 24 * 60 * 60 * 1000;
  const eligible = getEligibleProductSurveyNames(
    "training",
    {
      ...EMPTY_PRODUCT_SURVEY_ACTIVITY,
      trainingCompleted: [now - day, now - 2 * day],
      freeTrainingCompleted: [
        now - day,
        now - 2 * day,
        now - 3 * day,
        now - 4 * day,
        now - 5 * day,
      ],
      trainingAbandoned: [now - day, now - 2 * day],
    },
    now
  );

  assert.deepEqual(
    [...eligible],
    [
      PRODUCT_SURVEY_NAMES.trainingGoal,
      PRODUCT_SURVEY_NAMES.trainingFriction,
      PRODUCT_SURVEY_NAMES.nextFeature,
    ]
  );
});

test("upgrade survey eligibility supports cancellation or repeated no-checkout views", () => {
  const now = 1_800_000_000_000;
  const activity = {
    ...EMPTY_PRODUCT_SURVEY_ACTIVITY,
    upgradePageViewed: [now - 1_000, now - 2_000],
  };
  assert.equal(
    getEligibleProductSurveyNames("upgrade", activity, now).has(
      PRODUCT_SURVEY_NAMES.upgradeFriction
    ),
    true
  );
  assert.equal(
    getEligibleProductSurveyNames(
      "upgrade",
      { ...activity, checkoutInitiated: [now - 500] },
      now
    ).has(PRODUCT_SURVEY_NAMES.upgradeFriction),
    false
  );
  assert.equal(
    getEligibleProductSurveyNames(
      "upgrade",
      {
        ...activity,
        checkoutInitiated: [now - 500],
        checkoutCancelled: [now - 100],
      },
      now
    ).has(PRODUCT_SURVEY_NAMES.upgradeFriction),
    true
  );
});

test("survey activity recording is privacy-safe, pruned, and resilient", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const now = 1_800_000_000_000;

  recordProductSurveyActivityEvent(
    storage,
    "training_completed",
    { plan: "free", answer: "must-not-be-stored" },
    now
  );
  const activity = readProductSurveyActivity(storage, now);
  assert.deepEqual(activity.trainingCompleted, [now]);
  assert.deepEqual(activity.freeTrainingCompleted, [now]);
  assert.equal(values.values().next().value?.includes("must-not-be-stored"), false);

  values.set("thetamac-product-survey-activity-v1", "not-json");
  assert.deepEqual(
    readProductSurveyActivity(storage, now),
    EMPTY_PRODUCT_SURVEY_ACTIVITY
  );
});
