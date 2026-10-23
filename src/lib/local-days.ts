/**
 * Chart buckets on the player's own calendar. Grouping by UTC day put a Los Angeles evening
 * on the next day's bar, so the charts disagreed with the streak, which uses local days.
 * Days are numbered as in localDayNumber (streak.ts): days since the epoch.
 */

const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-22" for a day number. */
export function dayKey(day: number) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function weekdayName(day: number) {
  return WEEKDAYS[new Date(day * DAY_MS).getUTCDay()];
}

/** "2026-10" for the month a day number falls in. */
export function monthKey(day: number) {
  return dayKey(day).slice(0, 7);
}

export function monthName(key: string) {
  return MONTHS[Number(key.slice(5, 7)) - 1];
}

/** The last `count` month keys, oldest first, ending with the month `today` is in. */
export function lastMonthKeys(today: number, count: number) {
  const date = new Date(today * DAY_MS);
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - (count - 1 - index), 1));
    return month.toISOString().slice(0, 7);
  });
}

/**
 * A moment safely before local midnight of `day` in any time zone, for a database `gte`.
 * Rows from the extra hours are then dropped by bucketing on the local day.
 */
export function queryStartFor(day: number) {
  return new Date((day - 1) * DAY_MS);
}

/** The day number of the first of a "2026-10" month key. */
export function monthStartDay(key: string) {
  return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, 1) / DAY_MS;
}
