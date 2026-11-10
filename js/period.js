// Budget periods. A period is "your month": by default the calendar month,
// or a billing cycle that starts on a chosen day (e.g. the 10th to the 9th,
// matching a credit card statement).
//
// A period is identified by the "YYYY-MM" of the month it STARTS in, so
// key "2026-11" with a start day of 10 means Nov 10 to Dec 9.
// Start days past the end of a short month land on its last day
// (a 31st start runs from Feb 28 in February).

const pad = (n) => String(n).padStart(2, '0');
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const lastDay = (y, m) => new Date(y, m, 0).getDate(); // m is 1-based

export function normalizeStartDay(day) {
  const n = Math.round(Number(day));
  return Number.isFinite(n) && n >= 1 && n <= 31 ? n : 1;
}

export function shiftKey(key, by) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** First day of the period, as a Date. */
export function periodStart(key, startDay = 1) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, Math.min(normalizeStartDay(startDay), lastDay(y, m)));
}

/** Last day of the period (the day before the next one starts), as a Date. */
export function periodEnd(key, startDay = 1) {
  const next = periodStart(shiftKey(key, 1), startDay);
  return new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1);
}

/** Which period an ISO date ("YYYY-MM-DD") belongs to. */
export function periodOf(iso, startDay = 1) {
  const key = iso.slice(0, 7);
  return iso >= isoOf(periodStart(key, startDay)) ? key : shiftKey(key, -1);
}

/** Every date in the period, as ISO strings. */
export function periodDates(key, startDay = 1) {
  const out = [];
  const end = isoOf(periodEnd(key, startDay));
  const d = periodStart(key, startDay);
  for (let iso = isoOf(d); iso <= end; d.setDate(d.getDate() + 1), iso = isoOf(d)) out.push(iso);
  return out;
}

export const periodLength = (key, startDay = 1) => periodDates(key, startDay).length;

/** 1-based day number of `iso` within its period (1 = first day). */
export function dayInPeriod(iso, key, startDay = 1) {
  const start = periodStart(key, startDay);
  return Math.round((parse(iso) - start) / 864e5) + 1;
}

/**
 * Human label. Calendar months read "November" (or "November 2025" for
 * another year); cycles read "Nov 10 – Dec 9".
 * @param {'long'|'short'} style short gives "Nov" / "Nov 10"
 */
export function periodLabel(key, startDay = 1, style = 'long', now = new Date(), locale = undefined) {
  const s = periodStart(key, startDay);
  const sameYear = s.getFullYear() === now.getFullYear();
  if (normalizeStartDay(startDay) === 1) {
    return s.toLocaleDateString(locale, { month: style, year: sameYear ? undefined : 'numeric' });
  }
  const e = periodEnd(key, startDay);
  const fmt = (d, withYear) => d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: withYear ? 'numeric' : undefined });
  if (style === 'short') return fmt(s, false);
  return `${fmt(s, !sameYear && s.getFullYear() !== e.getFullYear())} – ${fmt(e, !sameYear)}`;
}
