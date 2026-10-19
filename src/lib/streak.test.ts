import assert from "node:assert/strict";
import test from "node:test";
import { getDisplayedStreak, getNextStreak, localDayNumber, resolveTimeZone } from "./streak";

const LA = "America/Los_Angeles";

test("consecutive local evenings extend the streak even across UTC midnight", () => {
  // 8pm and next-day 9pm in Los Angeles are 03:00 and 04:00 UTC on later UTC dates.
  const monday = new Date("2026-10-20T03:00:00Z"); // Mon Oct 19, 8pm PDT
  const tuesday = new Date("2026-10-21T04:00:00Z"); // Tue Oct 20, 9pm PDT
  assert.equal(getNextStreak({ currentStreak: 3, lastCompletedAt: monday, now: tuesday, timeZone: LA }), 4);
});

test("two sessions on the same local day keep the streak", () => {
  const morning = new Date("2026-10-20T16:00:00Z"); // 9am PDT
  const lateNight = new Date("2026-10-21T06:30:00Z"); // 11:30pm PDT same day
  assert.equal(getNextStreak({ currentStreak: 5, lastCompletedAt: morning, now: lateNight, timeZone: LA }), 5);
});

test("a missed local day resets the streak and lapses the displayed value", () => {
  const sunday = new Date("2026-10-18T20:00:00Z");
  const wednesday = new Date("2026-10-21T20:00:00Z");
  assert.equal(getNextStreak({ currentStreak: 12, lastCompletedAt: sunday, now: wednesday, timeZone: LA }), 1);
  assert.equal(getDisplayedStreak({ currentStreak: 12, lastCompletedAt: sunday, now: wednesday, timeZone: LA }), 0);
  assert.equal(getDisplayedStreak({ currentStreak: 12, lastCompletedAt: new Date("2026-10-20T20:00:00Z"), now: wednesday, timeZone: LA }), 12);
});

test("first session starts a streak of 1; no sessions shows 0", () => {
  assert.equal(getNextStreak({ currentStreak: 0, lastCompletedAt: null, now: new Date(), timeZone: "UTC" }), 1);
  assert.equal(getDisplayedStreak({ currentStreak: 0, lastCompletedAt: null, now: new Date(), timeZone: "UTC" }), 0);
});

test("invalid time zones fall back to UTC", () => {
  assert.equal(resolveTimeZone("Not/AZone"), "UTC");
  assert.equal(resolveTimeZone(undefined), "UTC");
  assert.equal(resolveTimeZone(LA), LA);
  assert.equal(localDayNumber(new Date("1970-01-02T00:00:00Z"), "UTC"), 1);
});
