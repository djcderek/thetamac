import assert from "node:assert/strict";
import test from "node:test";

// trial-usage reads env (and the db) at import; these are only the pure parts.
process.env.AUTH_SECRET ??= "test-secret";
process.env.DATABASE_URL ??= "postgresql://localhost:5432/test";

test("aliases of one inbox normalize to the same email", async () => {
  const { normalizeEmail } = await import("./trial-usage");
  assert.equal(normalizeEmail(" Derek.Chan+trial@GMail.com "), "derekchan@gmail.com");
  assert.equal(normalizeEmail("derekchan@googlemail.com"), "derekchan@gmail.com");
  assert.equal(normalizeEmail("first.last+news@example.com"), "first.last@example.com");
  assert.equal(normalizeEmail("not-an-email"), "not-an-email");
});

test("the key is the same for aliases, differs by inbox and by secret, and hides the address", async () => {
  const { emailKey } = await import("./trial-usage");
  const key = emailKey("derek.chan@gmail.com", "secret");
  assert.equal(emailKey("DerekChan+2@gmail.com", "secret"), key);
  assert.notEqual(emailKey("someone@gmail.com", "secret"), key);
  assert.notEqual(emailKey("derek.chan@gmail.com", "other"), key);
  assert.match(key, /^[0-9a-f]{64}$/);
});
