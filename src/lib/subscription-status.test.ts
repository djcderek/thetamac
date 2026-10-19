import assert from "node:assert/strict";
import test from "node:test";
import { decideSubscriptionSync, isTrialEligible, subscriptionNeedsAttention } from "./subscription-status";

test("trial eligibility requires no trial, bonus, or subscription history", () => {
  assert.equal(isTrialEligible(null), true);
  assert.equal(isTrialEligible({}), true);
  assert.equal(isTrialEligible({ proTrialUsed: true }), false);
  assert.equal(isTrialEligible({ proSignupCreditGranted: true }), false);
  assert.equal(isTrialEligible({ stripeSubscriptionId: "sub_1" }), false);
  assert.equal(isTrialEligible({ subscriptionStatus: "canceled" }), false);
});

test("the current subscription is applied while live and replaced when it ends", () => {
  assert.equal(
    decideSubscriptionSync({ currentSubscriptionId: "sub_a", incomingSubscriptionId: "sub_a", incomingStatus: "active" }),
    "apply"
  );
  assert.equal(
    decideSubscriptionSync({ currentSubscriptionId: "sub_a", incomingSubscriptionId: "sub_a", incomingStatus: "canceled" }),
    "find-replacement"
  );
  assert.equal(
    decideSubscriptionSync({ currentSubscriptionId: null, incomingSubscriptionId: "sub_a", incomingStatus: "trialing" }),
    "apply"
  );
});

test("another subscription ending never downgrades the user", () => {
  assert.equal(
    decideSubscriptionSync({ currentSubscriptionId: "sub_b", incomingSubscriptionId: "sub_a", incomingStatus: "canceled" }),
    "ignore"
  );
  assert.equal(
    decideSubscriptionSync({ currentSubscriptionId: "sub_b", incomingSubscriptionId: "sub_a", incomingStatus: "incomplete_expired" }),
    "ignore"
  );
});

test("a different live subscription takes over", () => {
  assert.equal(
    decideSubscriptionSync({ currentSubscriptionId: "sub_old", incomingSubscriptionId: "sub_new", incomingStatus: "active" }),
    "apply"
  );
});

test("unpaid, incomplete and paused subscriptions need the billing portal", () => {
  for (const status of ["unpaid", "incomplete", "paused"]) {
    assert.equal(subscriptionNeedsAttention(status), true, status);
  }
  for (const status of ["active", "trialing", "past_due", "canceled", "incomplete_expired", null]) {
    assert.equal(subscriptionNeedsAttention(status), false, String(status));
  }
});
