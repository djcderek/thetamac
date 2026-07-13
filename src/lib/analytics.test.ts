import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYTICS_EVENTS,
  ANALYTICS_SCHEMA_VERSION,
  getAnalyticsInsertId,
  isAnalyticsOptOutValue,
  sanitizeAnalyticsProperties,
  stripUrlQuery,
} from "./analytics";

test("analytics event names are unique", () => {
  const eventNames = Object.values(ANALYTICS_EVENTS);
  assert.equal(new Set(eventNames).size, eventNames.length);
});

test("analytics properties include a schema version and remove sensitive fields", () => {
  const properties = sanitizeAnalyticsProperties({
    surface: "training",
    total_solved: 12,
    operations: ["+", "×"],
    email: "person@example.com",
    name: "Person",
    submitted_answer: 42,
    correct_answer: 41,
    stripe_customer_id: "cus_secret",
  });

  assert.deepEqual(properties, {
    schema_version: ANALYTICS_SCHEMA_VERSION,
    surface: "training",
    total_solved: 12,
    operations: ["+", "×"],
  });
});

test("analytics properties discard non-finite numbers and cap large values", () => {
  const properties = sanitizeAnalyticsProperties({
    invalid: Number.NaN,
    long_text: "a".repeat(400),
    long_array: Array.from({ length: 30 }, (_, index) => index),
  });

  assert.equal(properties.invalid, undefined);
  assert.equal((properties.long_text as string).length, 256);
  assert.equal((properties.long_array as readonly number[]).length, 20);
});

test("replay URL sanitization removes queries and fragments", () => {
  assert.equal(stripUrlQuery("https://thetamac.com/auth/callback?code=secret#step"), "https://thetamac.com/auth/callback");
  assert.equal(stripUrlQuery("/training?pack=sensitive"), "/training");
  assert.equal(stripUrlQuery("/dashboard#activity"), "/dashboard");
});

test("analytics opt-out only treats the explicit true value as opted out", () => {
  assert.equal(isAnalyticsOptOutValue("true"), true);
  assert.equal(isAnalyticsOptOutValue("false"), false);
  assert.equal(isAnalyticsOptOutValue(null), false);
});

test("authoritative source events receive stable deduplication IDs", () => {
  assert.equal(getAnalyticsInsertId("evt_123"), "evt_123");
  assert.equal(getAnalyticsInsertId("evt_123", "status"), "evt_123:status");
});
