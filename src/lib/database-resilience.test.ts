import assert from "node:assert/strict";
import test from "node:test";

import {
  DATABASE_READ_RETRY_DELAY_MS,
  executeWithTransientReadRetry,
  getDatabaseErrorSummary,
  isRetryableReadOperation,
  isTransientDatabaseError,
} from "./database-resilience";

test("retries a transient read once and returns the recovered result", async () => {
  let calls = 0;
  const delays: number[] = [];
  const logs: unknown[] = [];

  const result = await executeWithTransientReadRetry({
    model: "User",
    operation: "findUnique",
    query: async () => {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error("connection closed"), { code: "P1017" });
      }
      return "recovered";
    },
    delay: async (milliseconds) => {
      delays.push(milliseconds);
    },
    logRetry: (event) => logs.push(event),
  });

  assert.equal(result, "recovered");
  assert.equal(calls, 2);
  assert.deepEqual(delays, [DATABASE_READ_RETRY_DELAY_MS]);
  assert.deepEqual(logs, [
    { model: "User", operation: "findUnique", code: "P1017", attempt: 1 },
  ]);
});

test("does not retry a non-transient read failure", async () => {
  let calls = 0;
  const expected = new Error("invalid query");

  await assert.rejects(
    executeWithTransientReadRetry({
      operation: "findMany",
      query: async () => {
        calls += 1;
        throw expected;
      },
      delay: async () => undefined,
      logRetry: () => assert.fail("should not log a retry"),
    }),
    expected
  );
  assert.equal(calls, 1);
});

test("propagates the second failure after one retry", async () => {
  let calls = 0;
  const finalFailure = Object.assign(new Error("connection closed again"), {
    code: "P1017",
  });

  await assert.rejects(
    executeWithTransientReadRetry({
      operation: "count",
      query: async () => {
        calls += 1;
        if (calls === 1) {
          throw Object.assign(new Error("connection closed"), { code: "P1017" });
        }
        throw finalFailure;
      },
      delay: async () => undefined,
      logRetry: () => undefined,
    }),
    finalFailure
  );
  assert.equal(calls, 2);
});

test("never retries write operations", async () => {
  let calls = 0;
  const failure = Object.assign(new Error("connection closed"), { code: "P1017" });

  await assert.rejects(
    executeWithTransientReadRetry({
      operation: "update",
      query: async () => {
        calls += 1;
        throw failure;
      },
      delay: async () => undefined,
      logRetry: () => assert.fail("writes must not be retried"),
    }),
    failure
  );
  assert.equal(calls, 1);
  assert.equal(isRetryableReadOperation("update"), false);
  assert.equal(isRetryableReadOperation("findFirst"), true);
});

test("classifies supported transient error shapes", () => {
  assert.equal(isTransientDatabaseError({ code: "P1001" }), true);
  assert.equal(
    isTransientDatabaseError(new Error("Database connection timed out")),
    true
  );
  assert.equal(
    isTransientDatabaseError(new Error("Database connection is unreachable")),
    true
  );
  assert.equal(
    isTransientDatabaseError(
      new Error("Can't reach database server at `database.example:5432`")
    ),
    true
  );
  assert.deepEqual(getDatabaseErrorSummary(new Error("secret connection details")), {
    code: "UNKNOWN",
    transient: false,
  });
});

test("retry logging contains only sanitized fields", async () => {
  const events: Record<string, unknown>[] = [];
  let calls = 0;

  await executeWithTransientReadRetry({
    model: "Account",
    operation: "findFirst",
    query: async () => {
      calls += 1;
      if (calls === 1) {
        throw Object.assign(new Error("password=do-not-log connection closed"), {
          code: "P1017",
          query: "SELECT * FROM Account",
        });
      }
      return null;
    },
    delay: async () => undefined,
    logRetry: (event) => events.push(event),
  });

  assert.deepEqual(Object.keys(events[0]).sort(), [
    "attempt",
    "code",
    "model",
    "operation",
  ]);
  assert.doesNotMatch(JSON.stringify(events[0]), /password|SELECT/);
});
