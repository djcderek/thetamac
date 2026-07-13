import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_SURVEY_COOLDOWN_MS,
  PRODUCT_SURVEY_NAMES,
  PRODUCT_SURVEY_PENDING_TTL_MS,
  isProductSurveyCooldownActive,
  isProductSurveyPending,
  parseSurveyTimestamp,
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
