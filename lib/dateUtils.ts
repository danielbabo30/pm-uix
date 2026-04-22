// Work days: Sunday(0) through Thursday(4) — Friday(5) and Saturday(6) are off
export function isWorkDay(date: Date): boolean {
  return date.getDay() <= 4;
}

/**
 * Format a Date to a local YYYY-MM-DD string.
 * Uses local getters (not toISOString which is UTC) so it's
 * timezone-safe even on Israel servers (UTC+2/+3).
 */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns a Set of YYYY-MM-DD strings for all work days in [start, end] inclusive.
 * Uses T12:00:00 (noon) to avoid DST / UTC-offset edge cases.
 */
export function getWorkDaySet(start: string, end: string): Set<string> {
  const days = new Set<string>();
  const cur  = new Date(start + 'T12:00:00');
  const last = new Date(end   + 'T12:00:00');
  while (cur <= last) {
    if (isWorkDay(cur)) days.add(toLocalDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Count work days in [start, end] inclusive */
export function countWorkDays(start: string, end: string): number {
  return getWorkDaySet(start, end).size;
}

/** Days from a list of date-ranges that fall inside [sprintStart, sprintEnd] and are work days */
export function countDaysOffInSprint(
  ranges: Array<{ start_date: string; end_date: string }>,
  sprintStart: string,
  sprintEnd: string,
): number {
  const sprintDays = getWorkDaySet(sprintStart, sprintEnd);
  const off = new Set<string>();
  for (const r of ranges) {
    const cur  = new Date(r.start_date + 'T12:00:00');
    const last = new Date(r.end_date   + 'T12:00:00');
    while (cur <= last) {
      const d = toLocalDateStr(cur);
      if (sprintDays.has(d)) off.add(d);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return off.size;
}

/**
 * Count work-days off during a sprint, merging multiple range groups into a
 * single union so overlapping days (e.g. general holiday + personal vacation
 * on the same date) are counted only once.
 */
export function countCombinedDaysOff(
  rangeGroups: Array<Array<{ start_date: string; end_date: string }>>,
  sprintStart: string,
  sprintEnd: string,
): number {
  const sprintDays = getWorkDaySet(sprintStart, sprintEnd);
  const off = new Set<string>();
  for (const ranges of rangeGroups) {
    for (const r of ranges) {
      const cur  = new Date(r.start_date + 'T12:00:00');
      const last = new Date(r.end_date   + 'T12:00:00');
      while (cur <= last) {
        const d = toLocalDateStr(cur);
        if (sprintDays.has(d)) off.add(d);
        cur.setDate(cur.getDate() + 1);
      }
    }
  }
  return off.size;
}

/** Format YYYY-MM-DD → DD/MM/YYYY for display */
export function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

/**
 * Format an ISO timestamp string for display in Israel timezone (Asia/Jerusalem).
 * Returns e.g. "16/04/2026 · 14:35"
 */
export function fmtTimestamp(raw: string | null | undefined): string {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const fmt = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    // Intl formats as "16.4.2026, 14:35" in he-IL — convert to DD/MM/YYYY · HH:MM
    return fmt.replace(/(\d+)\.(\d+)\.(\d+),\s*/, (_, d2, m2, y2) =>
      `${d2.padStart(2, '0')}/${m2.padStart(2, '0')}/${y2} · `
    );
  } catch {
    return raw;
  }
}
