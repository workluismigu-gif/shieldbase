// Date string format expected: YYYY-MM-DD (HTML <input type="date">).
// `new Date("2026-04-21")` parses as UTC midnight, which then renders in the
// user's local timezone — west of UTC that becomes the previous day. These
// helpers parse the parts directly into a *local* date so what you typed is
// what you see.

function parseDateOnly(yyyyMmDd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(yyyyMmDd);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatDateOnly(yyyyMmDd: string | null | undefined): string {
  if (!yyyyMmDd) return "";
  const d = parseDateOnly(yyyyMmDd);
  return d ? d.toLocaleDateString() : yyyyMmDd;
}

// Returns true if the date-only string is strictly before today (local).
export function isPast(yyyyMmDd: string | null | undefined): boolean {
  if (!yyyyMmDd) return false;
  const d = parseDateOnly(yyyyMmDd);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

// Compact "Apr 7 → Apr 14, 2026" for ranges; same year collapsed.
export function formatDateRange(start?: string | null, end?: string | null): string {
  const a = start ? parseDateOnly(start) : null;
  const b = end ? parseDateOnly(end) : null;
  if (!a && !b) return "";
  const fmt = (d: Date, withYear: boolean) =>
    d.toLocaleDateString(undefined, withYear
      ? { month: "short", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" });
  if (a && b) {
    const sameYear = a.getFullYear() === b.getFullYear();
    return sameYear ? `${fmt(a, false)} → ${fmt(b, true)}` : `${fmt(a, true)} → ${fmt(b, true)}`;
  }
  return fmt((a ?? b) as Date, true);
}
