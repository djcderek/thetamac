import assert from "node:assert/strict";
import test from "node:test";
import { createDeletedUserId, isDeletedUserId } from "./deleted-user";

test("tombstone IDs are unique and never mistaken for real user IDs", () => {
  const a = createDeletedUserId();
  const b = createDeletedUserId();
  assert.notEqual(a, b);
  assert.equal(isDeletedUserId(a), true);
  assert.equal(isDeletedUserId("cmvfhfz360000hffhxip96sri"), false);
  assert.equal(isDeletedUserId("7b7d74a6-8243-474c-8842-8ec843f19c5d"), false);
});
