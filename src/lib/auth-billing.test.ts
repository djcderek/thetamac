import assert from "node:assert/strict";
import test from "node:test";

import {
  BILLING_METADATA_REFRESH_INTERVAL_MS,
  shouldRefreshBillingMetadata,
} from "./auth-billing";

test("refreshes billing metadata on initial sign-in", () => {
  assert.equal(
    shouldRefreshBillingMetadata({
      isInitialSignIn: true,
      checkedAt: 10_000,
      now: 10_001,
    }),
    true
  );
});

test("refreshes billing metadata on an explicit session update", () => {
  assert.equal(
    shouldRefreshBillingMetadata({
      isInitialSignIn: false,
      trigger: "update",
      checkedAt: 10_000,
      now: 10_001,
    }),
    true
  );
});

test("refreshes legacy tokens without a timestamp", () => {
  assert.equal(
    shouldRefreshBillingMetadata({ isInitialSignIn: false, now: 10_000 }),
    true
  );
});

test("skips ordinary session refreshes inside the interval", () => {
  assert.equal(
    shouldRefreshBillingMetadata({
      isInitialSignIn: false,
      checkedAt: 10_000,
      now: 10_000 + BILLING_METADATA_REFRESH_INTERVAL_MS - 1,
    }),
    false
  );
});

test("refreshes ordinary sessions when the interval has elapsed", () => {
  assert.equal(
    shouldRefreshBillingMetadata({
      isInitialSignIn: false,
      checkedAt: 10_000,
      now: 10_000 + BILLING_METADATA_REFRESH_INTERVAL_MS,
    }),
    true
  );
});
