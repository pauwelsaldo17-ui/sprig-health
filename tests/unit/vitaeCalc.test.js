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
// sleepDebtMin — cumulative decaying sleep debt.
// Signature: sleepDebtMin(logs: Array, needMin: number).
// Log entries need durationMin (minutes). Entries with durationMin < 20 are filtered.
// ---------------------------------------------------------------------------
describe('sleepDebtMin', () => {
  const needMin = 8 * 60; // 480 min = 8h

  test('returns zero for empty log', () => {
    expect(sleepDebtMin([], needMin)).toBe(0);
  });

  test('zero debt when consistently meeting sleep goal', () => {
    const logs = [
      { durationMin: 480 },
      { durationMin: 480 },
    ];
    // On-target nights chip away at any prior debt; starting at 0 → stays 0
    expect(sleepDebtMin(logs, needMin)).toBe(0);
  });

  test('positive debt when undersleeping', () => {
    const logs = [
      { durationMin: 240 }, // 4h — well below goal
      { durationMin: 240 },
      { durationMin: 240 },
    ];
    expect(sleepDebtMin(logs, needMin)).toBeGreaterThan(0);
  });

  test('debt decays with subsequent good sleep', () => {
    const shortLogs = Array(7).fill({ durationMin: 240 });
    const debtAfterShort = sleepDebtMin(shortLogs, needMin);
    const recovery = [...shortLogs, ...Array(7).fill({ durationMin: 600 })];
    const debtAfterRecovery = sleepDebtMin(recovery, needMin);
    expect(debtAfterRecovery).toBeLessThan(debtAfterShort);
  });

  test('ignores nap entries', () => {
    const logs = [{ durationMin: 240, nap: true }];
    // Nap entries are filtered — like empty log
    expect(sleepDebtMin(logs, needMin)).toBe(0);
  });

  test('ignores very short sessions (< 20 min)', () => {
    const logs = [{ durationMin: 10 }];
    expect(sleepDebtMin(logs, needMin)).toBe(0);
  });
});
