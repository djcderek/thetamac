import assert from "node:assert/strict";
import test from "node:test";
import { getCached } from "./server-cache";

test("cached values are reused until they expire", async () => {
  let loads = 0;
  const load = async () => ++loads;
  assert.equal(await getCached("test:reuse", 60, load), 1);
  assert.equal(await getCached("test:reuse", 60, load), 1);
  assert.equal(loads, 1);
});

test("concurrent misses share a single load", async () => {
  let loads = 0;
  const load = () => new Promise<number>((resolve) => setTimeout(() => resolve(++loads), 20));
  const values = await Promise.all([1, 2, 3].map(() => getCached("test:dedupe", 60, load)));
  assert.deepEqual(values, [1, 1, 1]);
  assert.equal(loads, 1);
});

test("expired values are reloaded", async () => {
  let loads = 0;
  const load = async () => ++loads;
  await getCached("test:expiry", 0.05, load);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(await getCached("test:expiry", 0.05, load), 2);
});

test("a failed load is not cached", async () => {
  await assert.rejects(getCached("test:failure", 60, async () => { throw new Error("db down"); }));
  assert.equal(await getCached("test:failure", 60, async () => "ok"), "ok");
});
