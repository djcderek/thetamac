import assert from "node:assert/strict";
import test from "node:test";
import { dayKey, lastMonthKeys, monthKey, monthName, monthStartDay, queryStartFor, weekdayName } from "./local-days";
import { localDayNumber } from "./streak";

const LA = "America/Los_Angeles";

test("an evening in Los Angeles lands on that day, not the next UTC day", () => {
  const evening = new Date("2026-10-23T04:30:00Z"); // Thu Oct 22, 9:30pm PDT
  const day = localDayNumber(evening, LA);
  assert.equal(dayKey(day), "2026-10-22");
  assert.equal(weekdayName(day), "Thu");
  assert.equal(dayKey(localDayNumber(evening, "UTC")), "2026-10-23");
});

test("the query start is before local midnight everywhere", () => {
  const day = localDayNumber(new Date("2026-10-22T12:00:00Z"), "UTC");
  for (const timeZone of ["Pacific/Kiritimati", "Asia/Tokyo", "UTC", LA, "Pacific/Pago_Pago"]) {
    // The first moment of that local date, found by stepping back from local noon.
    let first = new Date(day * 86_400_000 + 12 * 3_600_000);
    while (localDayNumber(new Date(first.getTime() - 60_000), timeZone) >= day) first = new Date(first.getTime() - 60_000);
    assert.ok(queryStartFor(day) <= first, timeZone);
  }
});

test("months run oldest first and cross the year", () => {
  const day = localDayNumber(new Date("2026-02-14T12:00:00Z"), "UTC");
  assert.equal(monthKey(day), "2026-02");
  assert.deepEqual(lastMonthKeys(day, 4), ["2025-11", "2025-12", "2026-01", "2026-02"]);
  assert.equal(lastMonthKeys(day, 12)[0], "2025-03");
  assert.equal(dayKey(monthStartDay("2025-03")), "2025-03-01");
  assert.equal(monthName("2025-12"), "Dec");
});
