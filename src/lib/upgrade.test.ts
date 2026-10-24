import { test } from "node:test";
import assert from "node:assert/strict";
import { getUpgradeUrl, safeNextPath } from "./upgrade";

test("only same-site paths are kept as the place to return to", () => {
  assert.equal(safeNextPath("/quant/bayes-rule?step=practice"), "/quant/bayes-rule?step=practice");
  assert.equal(safeNextPath("https://example.com"), null);
  assert.equal(safeNextPath("//example.com/x"), null);
  assert.equal(safeNextPath("/\\example.com"), null);
  assert.equal(safeNextPath("quant"), null);
  assert.equal(safeNextPath(undefined), null);
});

test("the upgrade link carries where to come back to", () => {
  assert.equal(
    getUpgradeUrl({ feature: "quant", source: "quant_lesson", next: "/quant/bayes-rule?step=practice" }),
    "/upgrade?feature=quant&source=quant_lesson&next=%2Fquant%2Fbayes-rule%3Fstep%3Dpractice",
  );
  assert.equal(getUpgradeUrl({ feature: "quant", next: "https://evil.test" }), "/upgrade?feature=quant");
});
