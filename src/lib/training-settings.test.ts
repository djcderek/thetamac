import assert from "node:assert/strict";
import test from "node:test";
import {
  GUEST_TRAINING_SETTINGS_KEY,
  readGuestTrainingSettings,
  writeGuestTrainingSettings,
  type GuestTrainingSettings,
} from "./training-settings";

const preferences: GuestTrainingSettings = {
  gameMode: "learning",
  difficulty: "hard",
  selectedOperations: ["×", "÷"],
  timedModeLimit: 60,
  practiceTimerLimit: 20,
  submitMode: "manual",
  showAdvanced: true,
  customRangesTouched: true,
  operationRanges: {
    "+": { min: 3, max: 150 }, "-": { min: 3, max: 150 },
    "×": { min: 5, max: 50 }, "÷": { min: 2, max: 100 },
  },
  selectedSkill: "div-5",
};

test("guest preferences survive a new storage reader, including custom ranges and manual submission", () => {
  const data = new Map<string, string>();
  writeGuestTrainingSettings({ setItem: (key, value) => { data.set(key, value); } }, preferences);
  assert.deepEqual(readGuestTrainingSettings({ getItem: (key) => data.get(key) ?? null }), preferences);
});

test("missing, malformed or incompatible preferences use current defaults", () => {
  for (const value of [null, "not-json", "null", "[]", "{}", JSON.stringify({ ...preferences, submitMode: "unknown" })]) {
    assert.equal(readGuestTrainingSettings({ getItem: () => value }), null);
  }
});

test("invalid saved operations, timers, ranges and techniques are rejected", () => {
  for (const patch of [
    { selectedOperations: [] }, { selectedOperations: ["+", "+"] },
    { selectedOperations: ["%"] }, { timedModeLimit: 1 },
    { practiceTimerLimit: -1 }, { selectedSkill: "not-a-skill" },
    { operationRanges: { ...preferences.operationRanges, "+": { min: -1, max: 10 } } },
    { operationRanges: { ...preferences.operationRanges, "×": { min: 1, max: 1e100 } } },
  ]) {
    const saved = JSON.stringify({ ...preferences, ...patch });
    assert.equal(readGuestTrainingSettings({ getItem: () => saved }), null);
  }
});

test("storage restrictions cannot prevent training and invalid data cannot overwrite a valid preference", () => {
  assert.equal(readGuestTrainingSettings({ getItem: () => { throw new Error("blocked"); } }), null);
  assert.doesNotThrow(() => writeGuestTrainingSettings({ setItem: () => { throw new Error("full"); } }, preferences));
  const data = new Map([[GUEST_TRAINING_SETTINGS_KEY, JSON.stringify(preferences)]]);
  const invalid = { ...preferences, timedModeLimit: 0 };
  writeGuestTrainingSettings({ setItem: (key, value) => { data.set(key, value); } }, invalid);
  assert.deepEqual(readGuestTrainingSettings({ getItem: (key) => data.get(key) ?? null }), preferences);
});

test("only training preferences are persisted", () => {
  let stored = "";
  writeGuestTrainingSettings({ setItem: (_key, value) => { stored = value; } }, {
    ...preferences, email: "not-to-be-persisted", answers: [123],
  } as GuestTrainingSettings);
  assert.deepEqual(JSON.parse(stored), preferences);
});
