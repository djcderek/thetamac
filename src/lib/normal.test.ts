import assert from "node:assert/strict";
import test from "node:test";
import { normalPdf, normalQuantile } from "./normal";

const close = (a: number, b: number, tolerance = 1e-4) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);

test("the quantile matches standard z-scores", () => {
  close(normalQuantile(0.5), 0);
  close(normalQuantile(0.8413447), 1);
  close(normalQuantile(0.1586553), -1);
  close(normalQuantile(0.9772499), 2);
  close(normalQuantile(0.975), 1.959964);
  close(normalQuantile(0.01), -2.326348);
  assert.equal(normalQuantile(0), -Infinity);
  assert.equal(normalQuantile(1), Infinity);
});

test("the density peaks at the mean and is symmetric", () => {
  close(normalPdf(0), 0.3989423);
  close(normalPdf(1.5), normalPdf(-1.5), 1e-12);
});
