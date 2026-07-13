import assert from "node:assert/strict";
import test from "node:test";

import { getSafeCallbackPath } from "./auth-callback";

test("keeps same-site callback paths", () => {
  assert.equal(
    getSafeCallbackPath("/settings?tab=profile#photo"),
    "/settings?tab=profile#photo"
  );
});

test("falls back for absolute and protocol-relative callbacks", () => {
  assert.equal(getSafeCallbackPath("https://example.com/account"), "/");
  assert.equal(getSafeCallbackPath("//example.com/account"), "/");
});

test("falls back for malformed or unsafe callback values", () => {
  assert.equal(getSafeCallbackPath("javascript:alert(1)"), "/");
  assert.equal(getSafeCallbackPath("/\\example.com"), "/");
  assert.equal(getSafeCallbackPath("/settings\nmalformed"), "/");
  assert.equal(getSafeCallbackPath(null), "/");
});
