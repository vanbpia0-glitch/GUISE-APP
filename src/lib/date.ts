const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Monday-start week, matching the mockups' M T W T F S S layout. */
export function startOfWeek(d: Date): Date {
  const c = startOfDay(d);
  const day = c.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day;
  c.setDate(c.getDate() + diff);
  return c;
}

export function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start.getTime() + 6 * DAY_MS);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isWithin(d: Date, start: Date, end: Date): boolean {
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

export function quarterOf(d: Date): number {
  return Math.floor(d.getMonth() / 3) + 1;
}

/** "2026-Q3" style label for the quarter containing d. */
export function quarterLabel(d: Date): string {
  return `${d.getFullYear()}-Q${quarterOf(d)}`;
}

/** Inclusive [start, end] Date range for a "YYYY-Qn" label. */
export function quarterDateRange(label: string): { start: Date; end: Date } {
  const [yearStr, qStr] = label.split('-Q');
  const year = Number(yearStr);
  const q = Number(qStr);
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1, 0, 0, 0, 0);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
  return { start, end };
}

/** How far through [start, end] `now` is, clamped to [0, 1]. */
export function elapsedFraction(start: Date, end: Date, now: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  const elapsed = now.getTime() - start.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function weekdayLabel(d: Date): string {
  return WEEKDAY_LABELS[d.getDay()];
}

export function formatDateLong(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}
