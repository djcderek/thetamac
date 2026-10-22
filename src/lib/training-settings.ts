import { z } from "zod";
import { LESSON_IDS } from "./lessons";
import { PRACTICE_SET_SIZES } from "./practice-set";

export const DEFAULT_TIMED_TRAINING_SETTINGS = {
  gameMode: "timed",
  difficulty: "medium",
  operations: ["+", "-", "×", "÷"],
} as const;

export const GUEST_TRAINING_SETTINGS_KEY = "thetamac-guest-training-settings-v1";
export const TIMED_MODE_LIMITS = [60, 120, 180, 300];
// 0 turns the Practice question timer off (the default).
export const PRACTICE_TIMER_OPTIONS = [0, 5, 8, 10, 12, 15, 20, 30];

const operation = z.enum(["+", "-", "×", "÷"]);
const range = z.object({
  min: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  max: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

const guestTrainingSettingsSchema = z.object({
  gameMode: z.enum(["timed", "practice", "learning"]),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  selectedOperations: z.array(operation).min(1).max(4)
    .refine((values) => new Set(values).size === values.length),
  timedModeLimit: z.number().refine((value) => TIMED_MODE_LIMITS.includes(value)),
  practiceTimerLimit: z.number().refine((value) => PRACTICE_TIMER_OPTIONS.includes(value)),
  // Optional so settings saved before Practice sets existed still restore.
  practiceSetSize: z.number().refine((value) => (PRACTICE_SET_SIZES as readonly number[]).includes(value))
    .optional(),
  submitMode: z.enum(["manual", "auto"]),
  showAdvanced: z.boolean(),
  customRangesTouched: z.boolean(),
  operationRanges: z.object({ "+": range, "-": range, "×": range, "÷": range }),
  // The Learning lesson last picked; optional so older settings still restore.
  lessonId: z.enum(LESSON_IDS).optional(),
});

export type GuestTrainingSettings = z.infer<typeof guestTrainingSettingsSchema>;

export function readGuestTrainingSettings(
  storage: Pick<Storage, "getItem">,
): GuestTrainingSettings | null {
  try {
    const stored = storage.getItem(GUEST_TRAINING_SETTINGS_KEY);
    if (!stored) return null;
    const parsed = guestTrainingSettingsSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeGuestTrainingSettings(
  storage: Pick<Storage, "setItem">,
  settings: GuestTrainingSettings,
): void {
  try {
    const parsed = guestTrainingSettingsSchema.safeParse(settings);
    if (parsed.success) {
      storage.setItem(GUEST_TRAINING_SETTINGS_KEY, JSON.stringify(parsed.data));
    }
  } catch {
    // Private browsing or a full storage quota must not prevent training.
  }
}
