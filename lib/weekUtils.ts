/** ISO week number + year from a Date */
export function isoWeekOf(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;          // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day);  // shift to Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/** "YYYY-WW" string from year + week */
export function toWeekStr(year: number, week: number): string {
  return `${year}-${String(week).padStart(2, '0')}`;
}

/** Current week as "YYYY-WW" */
export function currentWeekStr(): string {
  const { week, year } = isoWeekOf(new Date());
  return toWeekStr(year, week);
}

/** Advance a "YYYY-WW" string by n weeks (handles year boundary) */
export function addWeeks(weekStr: string, n: number): string {
  const [y, w] = weekStr.split('-').map(Number);
  // Monday of ISO week y/w
  const jan4 = new Date(Date.UTC(y, 0, 4));      // Jan 4 is always in week 1
  const day4  = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (day4 - 1) + (w - 1) * 7 + n * 7);
  const { week, year } = isoWeekOf(monday);
  return toWeekStr(year, week);
}

/** Human-readable label: "שבוע 24 / 2026" */
export function weekLabel(weekStr: string): string {
  const [year, week] = weekStr.split('-');
  return `שבוע ${Number(week)} / ${year}`;
}

/** How many ISO weeks in a given year? (52 or 53) */
export function weeksInYear(year: number): number {
  const dec28 = new Date(Date.UTC(year, 11, 28));
  return isoWeekOf(dec28).week;
}

/** All week strings for a year */
export function allWeeksOfYear(year: number): string[] {
  const total = weeksInYear(year);
  return Array.from({ length: total }, (_, i) => toWeekStr(year, i + 1));
}

/** Monday and Sunday (as YYYY-MM-DD) bounding an ISO week string */
export function weekBounds(weekStr: string): { start: string; end: string } {
  const [y, w] = weekStr.split('-').map(Number);
  // Jan 4 is always in ISO week 1
  const jan4   = new Date(Date.UTC(y, 0, 4));
  const day4   = jan4.getUTCDay() || 7;          // Mon=1…Sun=7
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (day4 - 1) + (w - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday) };
}
