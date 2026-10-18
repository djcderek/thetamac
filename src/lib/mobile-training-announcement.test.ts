import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCT_SURVEY_ACTIVITY_KEY } from "./product-surveys";
import {
  MOBILE_TRAINING_ANNOUNCEMENT_KEY,
  MOBILE_TRAINING_RELEASE_AT,
  claimMobileTrainingAnnouncement,
  isPreMobileReleaseAccount,
} from "./mobile-training-announcement";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

test("only accounts created before the mobile release are returning accounts", () => {
  assert.equal(isPreMobileReleaseAccount(new Date(MOBILE_TRAINING_RELEASE_AT - 1)), true);
  for (const createdAt of [new Date(MOBILE_TRAINING_RELEASE_AT), new Date(MOBILE_TRAINING_RELEASE_AT + 1), "invalid"]) {
    assert.equal(isPreMobileReleaseAccount(createdAt), false);
  }
});

test("desktop setup does not consume the announcement; first mobile setup does, even without dismissal", () => {
  const saved = storage();
  assert.equal(claimMobileTrainingAnnouncement(saved, { mobileSetup: false, returningAccount: true }), false);
  assert.equal(saved.getItem(MOBILE_TRAINING_ANNOUNCEMENT_KEY), null);
  assert.equal(claimMobileTrainingAnnouncement(saved, { mobileSetup: true, returningAccount: true }), true);
  assert.equal(claimMobileTrainingAnnouncement(saved, { mobileSetup: true, returningAccount: true }), false);
});

test("new visitors remain ineligible on subsequent visits", () => {
  const saved = storage();
  saved.setItem(PRODUCT_SURVEY_ACTIVITY_KEY, JSON.stringify({ trainingCompleted: [MOBILE_TRAINING_RELEASE_AT + 1] }));
  for (let visit = 0; visit < 3; visit++) {
    assert.equal(claimMobileTrainingAnnouncement(saved, { mobileSetup: true, returningAccount: false }), false);
  }
  assert.equal(saved.getItem(MOBILE_TRAINING_ANNOUNCEMENT_KEY), null);
});

test("guests with training history before the release are eligible once", () => {
  for (const field of ["trainingCompleted", "trainingAbandoned"]) {
    const saved = storage();
    saved.setItem(PRODUCT_SURVEY_ACTIVITY_KEY, JSON.stringify({ [field]: [MOBILE_TRAINING_RELEASE_AT - 1] }));
    assert.equal(claimMobileTrainingAnnouncement(saved, { mobileSetup: true, returningAccount: false }), true);
    assert.equal(claimMobileTrainingAnnouncement(saved, { mobileSetup: true, returningAccount: false }), false);
  }
});

test("unrelated, corrupt and invalid history cannot qualify a new visitor", () => {
  for (const value of ["broken", "null", "[]", "{}", JSON.stringify({ upgradePageViewed: [1] }),
    JSON.stringify({ trainingCompleted: ["1", -1, null, MOBILE_TRAINING_RELEASE_AT] })]) {
    const saved = storage();
    saved.setItem(PRODUCT_SURVEY_ACTIVITY_KEY, value);
    assert.equal(claimMobileTrainingAnnouncement(saved, { mobileSetup: true, returningAccount: false }), false);
  }
});

test("unavailable storage skips the banner instead of repeatedly announcing it", () => {
  const options = { mobileSetup: true, returningAccount: true };
  assert.equal(claimMobileTrainingAnnouncement({
    getItem: () => { throw new Error("blocked"); }, setItem: () => {},
  }, options), false);
  assert.equal(claimMobileTrainingAnnouncement({
    getItem: () => null, setItem: () => { throw new Error("quota"); },
  }, options), false);
});
