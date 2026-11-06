// Month-end forecasts and budget status. Pure functions, unit-tested in Node.

/**
 * Project what a month will total by its last day.
 * Early in the month a few purchases say little, so the daily rate is blended
 * with your typical month (when there is history) and leans fully on the
 * current pace after two weeks.
 * @param {{spent:number, dayNum:number, nDays:number, typical?:number}} p
 */
export function projectMonth({ spent, dayNum, nDays, typical = 0 }) {
  const s = Math.max(0, spent);
  if (dayNum >= nDays) return s;
  const day = Math.max(1, dayNum);
  const currentRate = s / day;
  let rate = currentRate;
  if (typical > 0) {
    const w = Math.min(1, day / 14);
    rate = w * currentRate + (1 - w) * (typical / nDays);
  }
  return Math.max(s, s + rate * (nDays - day));
}

/** Is a forecast meaningful yet? Needs history, or a few days of this month. */
export function forecastReady({ dayNum, typical = 0, spent }) {
  return spent > 0 && (typical > 0 || dayNum >= 5);
}

/**
 * Budget state for a category or the whole month.
 * 'over'  already above the limit
 * 'warn'  used 80% or more, or on pace to go over
 * 'ok'    otherwise
 */
export function budgetStatus({ spent, limit, projected = null }) {
  if (!(limit > 0)) return 'none';
  if (spent > limit) return 'over';
  if (spent >= 0.8 * limit || (projected != null && projected > limit * 1.02)) return 'warn';
  return 'ok';
}

/**
 * Which budget thresholds were crossed by adding expenses.
 * Returns the most important crossing per category: 'over' (100%) or 'near' (80%).
 * @param {Record<string, number>} before category -> spent before
 * @param {Record<string, number>} after  category -> spent after
 * @param {Record<string, number>} limits category -> limit
 */
export function crossedThresholds(before, after, limits) {
  const out = [];
  for (const [id, limit] of Object.entries(limits)) {
    if (!(limit > 0)) continue;
    const b = before[id] || 0;
    const a = after[id] || 0;
    if (a <= b) continue;
    if (b <= limit && a > limit) out.push({ id, level: 'over', spent: a, limit });
    else if (b < 0.8 * limit && a >= 0.8 * limit) out.push({ id, level: 'near', spent: a, limit });
  }
  return out.sort((x, y) => (x.level === y.level ? y.spent / y.limit - x.spent / x.limit : x.level === 'over' ? -1 : 1));
}

/**
 * Typical monthly spend from complete months before `monthKey`
 * (months after the first month you have data for, up to `lookback`).
 * @param {Record<string, number>} totalsByMonth "YYYY-MM" -> total
 */
export function typicalMonth(totalsByMonth, monthKey, firstMonth, lookback = 3) {
  const keys = Object.keys(totalsByMonth).filter((k) => k < monthKey && k > firstMonth).sort().slice(-lookback);
  if (!keys.length) return 0;
  return keys.reduce((a, k) => a + Math.max(0, totalsByMonth[k]), 0) / keys.length;
}
