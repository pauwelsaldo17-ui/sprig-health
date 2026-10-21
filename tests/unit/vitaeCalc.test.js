/**
 * Unit tests for src/utils/vitaeCalc.js pure functions.
 * Run: npm test  (or npx vitest run)
 */

import { describe, test, expect } from 'vitest';
import {
  todayStr,
  circMean,
  tsToMin,
  sleepDebtMin,
  waterGoal,
  dayTotals,
} from '../../src/utils/vitaeCalc.js';

// ---------------------------------------------------------------------------
// todayStr
// ---------------------------------------------------------------------------
describe('todayStr', () => {
  test('returns YYYY-MM-DD format', () => {
    const result = todayStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('accepts a Date argument', () => {
    const d = new Date('2024-03-15T12:00:00Z');
    expect(todayStr(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// tsToMin — converts Unix ms timestamp to minutes-since-midnight
// ---------------------------------------------------------------------------
describe('tsToMin', () => {
  test('noon = 720 minutes', () => {
    const noon = new Date('2024-01-15T12:00:00').getTime();
    expect(tsToMin(noon)).toBe(720);
  });

  test('midnight = 0', () => {
    const midnight = new Date('2024-01-15T00:00:00').getTime();
    expect(tsToMin(midnight)).toBe(0);
  });

  test('11:30pm = 1410 minutes', () => {
    const late = new Date('2024-01-15T23:30:00').getTime();
    expect(tsToMin(late)).toBe(1410);
  });
});

// ---------------------------------------------------------------------------
// circMean — circular mean for cross-midnight schedules
// ---------------------------------------------------------------------------
describe('circMean', () => {
  test('averages two times on same side of midnight', () => {
    // 22:00 and 23:00 → expect ~22:30 (1350 min)
    const result = circMean([22 * 60, 23 * 60]);
    expect(result).toBeCloseTo(22.5 * 60, 0);
  });

  test('handles cross-midnight correctly', () => {
    // 23:00 and 01:00 — naive mean would be noon, circular mean should be ~midnight
    const result = circMean([23 * 60, 1 * 60]);
    const normalised = ((result % 1440) + 1440) % 1440;
    // Midnight = 0 min; allow 30 min tolerance (numDigits -1 → within 5)
    expect(normalised).toBeCloseTo(0, -1);
  });

  test('returns null for empty array', () => {
    expect(circMean([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// waterGoal
// Signature: waterGoal(profile) — reads profile.weight (kg), ignores activityLevel.
// Returns ml rounded to nearest 250, clamped to [2000, 4000].
// ---------------------------------------------------------------------------
describe('waterGoal', () => {
  test('returns a positive number in ml', () => {
    const goal = waterGoal({ weight: 75 });
    expect(typeof goal).toBe('number');
    expect(goal).toBeGreaterThan(1000);
    expect(goal).toBeLessThan(6000);
  });

  test('heavier person has higher goal', () => {
    // 60kg → 2000ml (min-clamped), 100kg → 3500ml
    const light = waterGoal({ weight: 60 });
    const heavy = waterGoal({ weight: 100 });
    expect(heavy).toBeGreaterThan(light);
  });

  test('defaults to 72kg when weight is missing', () => {
    const goal = waterGoal({});
    expect(goal).toBe(waterGoal({ weight: 72 }));
  });

  test('upper-clamps at 4000ml', () => {
    expect(waterGoal({ weight: 200 })).toBe(4000);
  });

  test('lower-clamps at 2000ml', () => {
    expect(waterGoal({ weight: 10 })).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// dayTotals — sums an array of food log entries.
// Signature: dayTotals(entries: Array) — NOT {foods: [...]}.
// Entry fields: calories, protein_g, carbs_g, fat_g (+ mult defaults to 1).
// Result fields: calories, protein, carbs, fat.
// ---------------------------------------------------------------------------
describe('dayTotals', () => {
  const sampleEntries = [
    { calories: 300, protein_g: 20, carbs_g: 30, fat_g: 10 },
    { calories: 200, protein_g: 15, carbs_g: 20, fat_g: 7 },
  ];

  test('sums calories correctly', () => {
    expect(dayTotals(sampleEntries).calories).toBe(500);
  });

  test('sums protein correctly', () => {
    expect(dayTotals(sampleEntries).protein).toBe(35);
  });

  test('sums carbs correctly', () => {
    expect(dayTotals(sampleEntries).carbs).toBe(50);
  });

  test('handles empty array', () => {
    const totals = dayTotals([]);
    expect(totals.calories).toBe(0);
    expect(totals.protein).toBe(0);
  });

  test('respects mult multiplier', () => {
    const totals = dayTotals([{ calories: 100, protein_g: 10, mult: 2 }]);
    expect(totals.calories).toBe(200);
    expect(totals.protein).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// sleepDebtMin — Rise-style 14-night weighted sleep debt.
// Signature: sleepDebtMin(logs: Array, needMin: number, nowTs?: number).
// Logs are grouped by wake date; naps add to their day; missing nights are skipped.
// ---------------------------------------------------------------------------
describe('sleepDebtMin', () => {
  const needMin = 8 * 60; // 480 min = 8h
  const NOW = new Date('2026-10-21T12:00:00').getTime();
  // a log that ended `daysAgo` days before NOW at 07:00
  const night = (daysAgo, durationMin, extra = {}) => {
    const wake = new Date('2026-10-21T07:00:00').getTime() - daysAgo * 864e5;
    return { bedtime: wake - durationMin * 60000, waketime: wake, durationMin, date: new Date(wake).toLocaleDateString('en-CA'), ...extra };
  };
  const nights = (n, dur) => Array.from({ length: n }, (_, i) => night(n - 1 - i, dur));

  test('returns zero for empty log', () => {
    expect(sleepDebtMin([], needMin, NOW)).toBe(0);
  });

  test('zero debt when consistently meeting sleep need', () => {
    expect(sleepDebtMin(nights(14, 480), needMin, NOW)).toBe(0);
  });

  test('14 nights 1 h short ≈ 14 h of debt', () => {
    expect(sleepDebtMin(nights(14, 420), needMin, NOW)).toBe(14 * 60);
  });

  test('last night weighs 15%: one short night last night beats one short night 10 days ago', () => {
    const base = nights(14, 480);
    const lastShort = base.map((l, i) => (i === 13 ? night(0, 240) : l));
    const oldShort = base.map((l, i) => (i === 3 ? night(10, 240) : l));
    expect(sleepDebtMin(lastShort, needMin, NOW)).toBeGreaterThan(sleepDebtMin(oldShort, needMin, NOW));
  });

  test('long nights pay debt down', () => {
    const shortWeek = [...nights(14, 480).slice(0, 7).map((l, i) => night(13 - i, 300)), ...nights(7, 480)];
    const recovered = [...shortWeek.slice(0, 7), ...nights(7, 600)];
    expect(sleepDebtMin(recovered, needMin, NOW)).toBeLessThan(sleepDebtMin(shortWeek, needMin, NOW));
  });

  test('naps count toward the day they end on', () => {
    const withoutNap = [night(0, 360)];
    const withNap = [night(0, 360), { ...night(0, 60), waketime: NOW - 36e5, bedtime: NOW - 2 * 36e5, nap: true, ignoredFromScore: true }];
    expect(sleepDebtMin(withNap, needMin, NOW)).toBe(sleepDebtMin(withoutNap, needMin, NOW) - 60);
  });

  test('missing nights do not create debt', () => {
    expect(sleepDebtMin([night(0, 480), night(5, 480)], needMin, NOW)).toBe(0);
  });

  test('ignores mis-starts (< 20 min) and logs older than 14 days', () => {
    expect(sleepDebtMin([night(0, 10), night(20, 120)], needMin, NOW)).toBe(0);
  });
});
