// Streaks count calendar days in the player's time zone. Server midnight (or UTC) split one
// local evening into two days or merged two evenings into one, breaking streaks.

export function resolveTimeZone(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "UTC";
  }
}

/** Days since the epoch for the calendar date `date` falls on in `timeZone`. */
export function localDayNumber(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86_400_000);
}

/** The streak after completing a session `now`, given the previous completed session. */
export function getNextStreak({
  currentStreak,
  lastCompletedAt,
  now,
  timeZone,
}: {
  currentStreak: number;
  lastCompletedAt: Date | null;
  now: Date;
  timeZone: string;
}): number {
  if (!lastCompletedAt) return 1;
  const daysSince = localDayNumber(now, timeZone) - localDayNumber(lastCompletedAt, timeZone);
  if (daysSince <= 0) return Math.max(1, currentStreak);
  if (daysSince === 1) return currentStreak + 1;
  return 1;
}

/** The streak to show: it lapses to 0 once a full local day passes without a session. */
export function getDisplayedStreak({
  currentStreak,
  lastCompletedAt,
  now,
  timeZone,
}: {
  currentStreak: number;
  lastCompletedAt: Date | null;
  now: Date;
  timeZone: string;
}): number {
  if (!lastCompletedAt) return 0;
  const daysSince = localDayNumber(now, timeZone) - localDayNumber(lastCompletedAt, timeZone);
  return daysSince <= 1 ? currentStreak : 0;
}
