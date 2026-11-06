import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectMonth, budgetStatus, crossedThresholds, typicalMonth, forecastReady } from '../js/forecast.js';

test('projects linearly once there is no history', () => {
  assert.equal(Math.round(projectMonth({ spent: 1000, dayNum: 10, nDays: 30 })), 3000);
});

test('leans on the typical month early in the month', () => {
  // Day 2 with a big first purchase: pure pace would say 15,000.
  const p = projectMonth({ spent: 1000, dayNum: 2, nDays: 30, typical: 3000 });
  assert.ok(p > 3000 && p < 6000, `got ${p}`);
});

test('uses the current pace fully after two weeks', () => {
  const p = projectMonth({ spent: 2000, dayNum: 15, nDays: 30, typical: 900 });
  assert.equal(Math.round(p), 4000);
});

test('a finished month projects to what was spent', () => {
  assert.equal(projectMonth({ spent: 1234, dayNum: 30, nDays: 30, typical: 5000 }), 1234);
});

test('forecast needs history or a few days of data', () => {
  assert.equal(forecastReady({ dayNum: 2, spent: 50 }), false);
  assert.equal(forecastReady({ dayNum: 2, spent: 50, typical: 900 }), true);
  assert.equal(forecastReady({ dayNum: 6, spent: 50 }), true);
  assert.equal(forecastReady({ dayNum: 6, spent: 0 }), false);
});

test('budget status', () => {
  assert.equal(budgetStatus({ spent: 100, limit: 0 }), 'none');
  assert.equal(budgetStatus({ spent: 100, limit: 400 }), 'ok');
  assert.equal(budgetStatus({ spent: 330, limit: 400 }), 'warn');
  assert.equal(budgetStatus({ spent: 200, limit: 400, projected: 520 }), 'warn');
  assert.equal(budgetStatus({ spent: 410, limit: 400 }), 'over');
});

test('reports thresholds crossed by new expenses', () => {
  const limits = { dining: 400, groceries: 600, fuel: 200 };
  const before = { dining: 300, groceries: 590, fuel: 100 };
  const after = { dining: 330, groceries: 650, fuel: 120 };
  const r = crossedThresholds(before, after, limits);
  assert.deepEqual(r.map((x) => [x.id, x.level]), [['groceries', 'over'], ['dining', 'near']]);
  assert.equal(crossedThresholds(after, after, limits).length, 0);
});

test('typical month skips the partial first month', () => {
  const totals = { '2026-07': 200, '2026-08': 2000, '2026-09': 2400, '2026-10': 2600, '2026-11': 500 };
  assert.equal(typicalMonth(totals, '2026-11', '2026-07'), (2000 + 2400 + 2600) / 3);
  assert.equal(typicalMonth(totals, '2026-08', '2026-07'), 0);
});
