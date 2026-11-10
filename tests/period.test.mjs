import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodOf, periodStart, periodEnd, periodDates, periodLength, dayInPeriod, periodLabel, isoOf, normalizeStartDay } from '../js/period.js';

test('calendar months when the start day is 1', () => {
  assert.equal(periodOf('2026-11-01', 1), '2026-11');
  assert.equal(periodOf('2026-11-30', 1), '2026-11');
  assert.equal(periodLength('2026-02', 1), 28);
  assert.equal(isoOf(periodEnd('2026-12', 1)), '2026-12-31');
});

test('a cycle that starts on the 10th runs to the 9th of next month', () => {
  assert.equal(periodOf('2026-11-10', 10), '2026-11');
  assert.equal(periodOf('2026-11-09', 10), '2026-10');
  assert.equal(periodOf('2026-12-09', 10), '2026-11');
  assert.equal(periodOf('2026-12-10', 10), '2026-12');
  assert.equal(isoOf(periodStart('2026-11', 10)), '2026-11-10');
  assert.equal(isoOf(periodEnd('2026-11', 10)), '2026-12-09');
  assert.equal(periodLength('2026-11', 10), 30); // Nov 10..Nov 30 (21) + Dec 1..9 (9)
});

test('cycles cross the new year', () => {
  assert.equal(periodOf('2027-01-05', 10), '2026-12');
  assert.equal(isoOf(periodEnd('2026-12', 10)), '2027-01-09');
  const dates = periodDates('2026-12', 10);
  assert.equal(dates[0], '2026-12-10');
  assert.equal(dates[dates.length - 1], '2027-01-09');
  assert.equal(dates.length, 31);
});

test('late start days clamp to short months', () => {
  assert.equal(isoOf(periodStart('2026-02', 31)), '2026-02-28');
  assert.equal(isoOf(periodEnd('2026-01', 31)), '2026-02-27');
  assert.equal(periodOf('2026-02-28', 31), '2026-02');
  assert.equal(periodOf('2026-03-30', 31), '2026-02');
  assert.equal(periodOf('2026-03-31', 31), '2026-03');
});

test('day number within the period', () => {
  assert.equal(dayInPeriod('2026-11-10', '2026-11', 10), 1);
  assert.equal(dayInPeriod('2026-12-09', '2026-11', 10), 30);
  assert.equal(dayInPeriod('2026-11-04', '2026-11', 1), 4);
});

test('labels', () => {
  const now = new Date(2026, 10, 10);
  assert.equal(periodLabel('2026-11', 1, 'long', now, 'en-US'), 'November');
  assert.equal(periodLabel('2026-11', 10, 'long', now, 'en-US'), 'Nov 10 – Dec 9');
  assert.equal(periodLabel('2026-11', 10, 'short', now, 'en-US'), 'Nov 10');
});

test('start day input is sanitized', () => {
  assert.equal(normalizeStartDay('10'), 10);
  assert.equal(normalizeStartDay(0), 1);
  assert.equal(normalizeStartDay(45), 1);
  assert.equal(normalizeStartDay('abc'), 1);
});
