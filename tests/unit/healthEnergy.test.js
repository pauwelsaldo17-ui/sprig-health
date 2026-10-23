/**
 * Unit tests for the Apple Health merge helpers and the two-process energy model in vitaeCalc.js.
 * Run: npm test
 */

import { describe, test, expect } from 'vitest';
import {
  healthSleepSessions,
  mergeHealthSleep,
  mergeHealthMetrics,
  sportSessionFromHealthWorkout,
  circadianAnchor,
  sleepPressure,
  energyCurve,
  energyZones,
  bestGymWindow,
  DAYMIN,
  sleepDebtNights,
  sleepHabits,
  recommend,
} from '../../src/utils/vitaeCalc.js';

const H = 36e5;
const at = (s) => new Date(s).getTime();
const iso = (s) => new Date(s).toISOString();
const seg = (start, end, sleepState, sourceId = 'watch') => ({ startDate: iso(start), endDate: iso(end), sleepState, sourceId });

// Main sleep logs (sprig_sleep_v1 shape) for `n` nights ending on `endDay` (YYYY-MM-DD).
function sleepHistory({ n = 7, endDay = '2026-10-21', bedH = 23, wakeH = 7 }) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const wake = at(`${endDay}T00:00:00`) - i * 24 * H + wakeH * H;
    const span = ((wakeH - bedH + 24) % 24) * H;
    out.push({ id: `n${i}`, bedtime: wake - span, waketime: wake, durationMin: span / 60000, date: new Date(wake).toLocaleDateString('en-CA'), source: 'manual' });
  }
  return out;
}
const dayStart = (d) => at(`${d}T00:00:00`);
const peakMin = (curve, lo, hi) => curve.filter((p) => p.min >= lo && p.min <= hi).reduce((a, p) => (p.e > a.e ? p : a));

// ---------------------------------------------------------------------------
describe('healthSleepSessions', () => {
  test('iOS stage segments become one session with real bed/wake times and stage minutes', () => {
    const s = healthSleepSessions([
      seg('2026-10-20T23:10:00', '2026-10-21T01:00:00', 'light'),
      seg('2026-10-21T01:00:00', '2026-10-21T02:00:00', 'deep'),
      seg('2026-10-21T02:00:00', '2026-10-21T02:20:00', 'awake'),
      seg('2026-10-21T02:20:00', '2026-10-21T04:00:00', 'rem'),
      seg('2026-10-21T04:00:00', '2026-10-21T06:50:00', 'light'),
    ]);
    expect(s).toHaveLength(1);
    expect(s[0].bedTs).toBe(at('2026-10-20T23:10:00'));
    expect(s[0].wakeTs).toBe(at('2026-10-21T06:50:00'));
    expect(s[0].asleepMin).toBe(7 * 60 + 40 - 20);
    expect(s[0].awakeMin).toBe(20);
    expect(s[0].stages).toEqual({ deep: 60, rem: 100, light: 280 });
    expect(s[0].nap).toBe(false);
  });

  test('overlapping iPhone + Watch samples are not double-counted', () => {
    const s = healthSleepSessions([
      seg('2026-10-20T23:00:00', '2026-10-21T07:00:00', 'asleep', 'phone'),
      seg('2026-10-20T23:30:00', '2026-10-21T06:30:00', 'light', 'watch'),
    ]);
    expect(s).toHaveLength(1);
    expect(s[0].asleepMin).toBe(480);
  });

  test('an afternoon nap is kept and flagged; tiny fragments are dropped', () => {
    const s = healthSleepSessions([
      seg('2026-10-20T23:00:00', '2026-10-21T07:00:00', 'asleep'),
      seg('2026-10-21T14:00:00', '2026-10-21T14:25:00', 'asleep'),
      seg('2026-10-21T18:00:00', '2026-10-21T18:05:00', 'asleep'),
    ]);
    expect(s).toHaveLength(2);
    expect(s[1].nap).toBe(true);
    expect(s[1].asleepMin).toBe(25);
  });

  test('Android session with a stages array', () => {
    const s = healthSleepSessions([{
      startDate: iso('2026-10-21T02:00:00'), endDate: iso('2026-10-21T09:00:00'),
      stages: [
        { startDate: iso('2026-10-21T02:00:00'), endDate: iso('2026-10-21T05:00:00'), stage: 'light' },
        { startDate: iso('2026-10-21T05:00:00'), endDate: iso('2026-10-21T09:00:00'), stage: 'deep' },
      ],
    }]);
    expect(s[0].asleepMin).toBe(420);
    expect(s[0].stages.deep).toBe(240);
  });

  test('falls back to in-bed time when there is no asleep data', () => {
    const s = healthSleepSessions([seg('2026-10-20T23:00:00', '2026-10-21T06:00:00', 'inBed', 'phone')]);
    expect(s).toHaveLength(1);
    expect(s[0].asleepMin).toBe(420);
  });
});

// ---------------------------------------------------------------------------
describe('mergeHealthSleep — never loses user data', () => {
  const session = (bed, wake, extra = {}) => ({ bedTs: at(bed), wakeTs: at(wake), asleepMin: (at(wake) - at(bed)) / 60000, awakeMin: 0, stages: null, nap: false, ...extra });

  test('adds a new health night with real stages and a computed score', () => {
    const next = mergeHealthSleep([], [session('2026-10-20T23:00:00', '2026-10-21T07:00:00', { stages: { deep: 90, rem: 100, light: 290 } })])?.logs;
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: `health_${at('2026-10-20T23:00:00')}`, date: '2026-10-21', durationMin: 480, source: 'health_sync', stagesFromHealth: true });
    expect(next[0].score).toBeGreaterThan(0);
  });

  test('a manual log for the same night wins', () => {
    const manual = { id: 'm1', bedtime: at('2026-10-20T23:30:00'), waketime: at('2026-10-21T07:15:00'), durationMin: 465, date: '2026-10-21', source: 'manual' };
    expect(mergeHealthSleep([manual], [session('2026-10-20T23:00:00', '2026-10-21T07:00:00')])).toBeNull();
  });

  test('updates an unedited health log in place but never an edited one', () => {
    const old = { id: 'health_1', bedtime: at('2026-10-20T23:00:00'), waketime: at('2026-10-21T06:00:00'), durationMin: 420, date: '2026-10-21', source: 'health_sync', ignoredFromScore: true };
    const s = session('2026-10-20T23:00:00', '2026-10-21T07:00:00');
    const next = mergeHealthSleep([old], [s])?.logs;
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: 'health_1', durationMin: 480, ignoredFromScore: true });
    expect(mergeHealthSleep([{ ...old, edited: true }], [s])).toBeNull();
  });

  test('deleted health logs (tombstones) are not re-added', () => {
    const s = session('2026-10-20T23:00:00', '2026-10-21T07:00:00');
    const tomb = { id: `health_${s.bedTs}`, bedtime: s.bedTs, waketime: s.wakeTs, discarded: true };
    expect(mergeHealthSleep([], [s], { tombstones: [tomb] })).toBeNull();
  });

  test('naps are added with the existing nap flags and keep the main night', () => {
    const night = session('2026-10-20T23:00:00', '2026-10-21T07:00:00');
    const nap = session('2026-10-21T14:00:00', '2026-10-21T14:25:00', { nap: true });
    const next = mergeHealthSleep([], [night, nap])?.logs;
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ nap: true, ignoredFromScore: true, date: '2026-10-21' });
  });
});

// ---------------------------------------------------------------------------
describe('mergeHealthMetrics', () => {
  test('fills rhr/hrv for empty days, keeps manual values, and is idempotent', () => {
    const series = [{ date: '2026-10-20', rhr: 70, bpSys: 120 }];
    const next = mergeHealthMetrics(series, { restingHr: { '2026-10-20': 55.4, '2026-10-21': 56.6 }, hrv: { '2026-10-21': 48.2 } });
    expect(next.find((h) => h.date === '2026-10-20')).toEqual({ date: '2026-10-20', rhr: 70, bpSys: 120 });
    expect(next.find((h) => h.date === '2026-10-21')).toMatchObject({ rhr: 57, rhrSource: 'health_sync', hrv: 48 });
    expect(mergeHealthMetrics(next, { restingHr: { '2026-10-21': 56.6 }, hrv: { '2026-10-21': 48.2 } })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('sportSessionFromHealthWorkout', () => {
  test('maps a run onto the sports library with a stable id', () => {
    const s = sportSessionFromHealthWorkout({ workoutType: 'running', duration: 1800, totalEnergyBurned: 310.4, startDate: iso('2026-10-21T18:00:00'), endDate: iso('2026-10-21T18:30:00'), platformId: 'ABC' }, 70);
    expect(s).toMatchObject({ id: 'health_workout_ABC', sportId: 'running', durationMin: 30, estimatedCalories: 310, source: 'health_sync' });
    expect(Object.keys(s.muscleImpact).length).toBeGreaterThan(0);
  });

  test('drops very short or invalid workouts', () => {
    expect(sportSessionFromHealthWorkout({ workoutType: 'walking', duration: 120, startDate: iso('2026-10-21T18:00:00'), endDate: iso('2026-10-21T18:02:00') })).toBeNull();
    expect(sportSessionFromHealthWorkout({ workoutType: 'walking' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('circadianAnchor', () => {
  test('finds the habitual rhythm across midnight', () => {
    const a = circadianAnchor(sleepHistory({ bedH: 23, wakeH: 7 }), at('2026-10-21T12:00:00'));
    expect(a.wakeMin).toBe(7 * 60);
    expect(a.bedMin).toBe(23 * 60);
  });

  test('ignores naps', () => {
    const logs = [...sleepHistory({}), { bedtime: at('2026-10-21T10:00:00'), waketime: at('2026-10-21T10:30:00'), durationMin: 30, nap: true }];
    expect(circadianAnchor(logs, at('2026-10-21T12:00:00')).wakeMin).toBe(7 * 60);
  });

  test('null without sleep history', () => {
    expect(circadianAnchor([], Date.now())).toBeNull();
  });
});

describe('sleepPressure', () => {
  test('rises through the day and is lower after a nap', () => {
    const logs = sleepHistory({});
    const morning = sleepPressure(logs, at('2026-10-21T08:00:00'));
    const evening = sleepPressure(logs, at('2026-10-21T21:00:00'));
    expect(evening).toBeGreaterThan(morning);
    const nap = { bedtime: at('2026-10-21T14:00:00'), waketime: at('2026-10-21T14:30:00'), durationMin: 30, nap: true };
    expect(sleepPressure([...logs, nap], at('2026-10-21T16:00:00'))).toBeLessThan(sleepPressure(logs, at('2026-10-21T16:00:00')));
  });
});

// ---------------------------------------------------------------------------
describe('energyCurve (two-process model)', () => {
  const NOW = at('2026-10-21T12:00:00');
  const day = '2026-10-21';

  test('day sleeper: grogginess at wake, morning peak, afternoon dip, evening peak', () => {
    const logs = sleepHistory({ bedH: 23, wakeH: 7 });
    const curve = energyCurve({ wakeMin: 420, bedMin: 1380, debtMin: 0, meals: [], logs, nowTs: NOW, dayStartTs: dayStart(day) });
    const e = (m) => curve.find((p) => p.min === m).e;
    expect(e(420)).toBeLessThan(e(600));          // 07:00 groggy < 10:00
    expect(e(900)).toBeLessThan(e(600));          // 15:00 dip < morning peak
    expect(e(900)).toBeLessThan(e(1170));         // 15:00 dip < 19:30 evening peak
    expect(e(1380)).toBeLessThan(e(1170));        // falls toward bedtime
    const p = peakMin(curve, 480, 780);
    expect(p.min).toBeGreaterThanOrEqual(510);    // morning peak 08:30–11:30
    expect(p.min).toBeLessThanOrEqual(690);
  });

  test('night-shift sleeper: the same shape shifts with their wake time', () => {
    const logs = sleepHistory({ bedH: 7, wakeH: 15 });
    const curve = energyCurve({ wakeMin: 900, bedMin: 420, debtMin: 0, meals: [], logs, nowTs: at('2026-10-21T16:00:00'), dayStartTs: dayStart(day) });
    expect(curve[0].min).toBe(900);
    expect(curve[curve.length - 1].min).toBe(420 + DAYMIN); // runs past midnight
    const p = peakMin(curve, 960, 1260);                    // peak 8 h later than the day sleeper
    expect(p.min).toBeGreaterThanOrEqual(510 + 480);
    expect(p.min).toBeLessThanOrEqual(690 + 480);
  });

  test('sleep debt lowers and flattens the curve', () => {
    const logs = sleepHistory({});
    const args = { wakeMin: 420, bedMin: 1380, meals: [], logs, nowTs: NOW, dayStartTs: dayStart(day) };
    const fresh = energyCurve({ ...args, debtMin: 0 });
    const tired = energyCurve({ ...args, debtMin: 8 * 60 });
    const range = (c) => Math.max(...c.map((p) => p.e)) - Math.min(...c.filter((p) => p.min > 480).map((p) => p.e));
    expect(Math.max(...tired.map((p) => p.e))).toBeLessThan(Math.max(...fresh.map((p) => p.e)));
    expect(range(tired)).toBeLessThan(range(fresh));
  });

  test('a nap brings grogginess, then more energy later in the evening', () => {
    const logs = sleepHistory({});
    const nap = { bedtime: at('2026-10-21T14:00:00'), waketime: at('2026-10-21T14:25:00'), durationMin: 25, nap: true };
    const args = { wakeMin: 420, bedMin: 1380, debtMin: 0, meals: [], nowTs: at('2026-10-21T15:00:00'), dayStartTs: dayStart(day) };
    const without = energyCurve({ ...args, logs });
    const withNap = energyCurve({ ...args, logs: [...logs, nap] });
    const e = (c, m) => c.find((p) => p.min === m).e;
    expect(e(withNap, 870)).toBeLessThan(e(without, 870));  // 14:30 groggy right after
    expect(e(withNap, 1200)).toBeGreaterThan(e(without, 1200)); // 20:00 fresher
  });

  test('falls back to the generic curve without sleep history', () => {
    const curve = energyCurve({ wakeMin: 420, bedMin: 1380, debtMin: 0, meals: [], logs: [], dayStartTs: dayStart(day) });
    expect(curve.length).toBeGreaterThan(10);
    expect(curve[0].min).toBe(420);
  });
});

describe('energyZones', () => {
  test('ordered, non-overlapping windows that follow the schedule', () => {
    const logs = sleepHistory({});
    const curve = energyCurve({ wakeMin: 420, bedMin: 1380, debtMin: 0, meals: [], logs, nowTs: at('2026-10-21T12:00:00'), dayStartTs: dayStart('2026-10-21') });
    const zones = energyZones(curve, { wakeMin: 420, bedMin: 1380 });
    const kinds = zones.map((z) => z.kind);
    expect(kinds).toEqual(['grogginess', 'peak', 'dip', 'peak2', 'winddown', 'melatonin']);
    for (let i = 1; i < zones.length; i++) expect(zones[i].start).toBeGreaterThanOrEqual(zones[i - 1].end);
    const dip = zones.find((z) => z.kind === 'dip');
    expect(dip.start).toBeGreaterThanOrEqual(12 * 60);
    expect(dip.end).toBeLessThanOrEqual(17 * 60);
    expect(zones.find((z) => z.kind === 'melatonin').start).toBe(1380 - 45);
  });

  test('empty for a missing curve', () => {
    expect(energyZones([], { wakeMin: 420 })).toEqual([]);
  });
});

describe('bestGymWindow', () => {
  test('follows the wake time instead of a fixed clock hour', () => {
    const day = energyCurve({ wakeMin: 420, bedMin: 1380, debtMin: 0, meals: [], logs: sleepHistory({}), nowTs: at('2026-10-21T12:00:00'), dayStartTs: dayStart('2026-10-21') });
    const night = energyCurve({ wakeMin: 900, bedMin: 420, debtMin: 0, meals: [], logs: sleepHistory({ bedH: 7, wakeH: 15 }), nowTs: at('2026-10-21T16:00:00'), dayStartTs: dayStart('2026-10-21') });
    const g1 = bestGymWindow(day, [], 420, 1380);
    const g2 = bestGymWindow(night, [], 900, 420 + DAYMIN);
    expect(Math.abs((g2.start - 900) - (g1.start - 420))).toBeLessThanOrEqual(60);
  });
});

// ---------------------------------------------------------------------------
describe('mergeHealthSleep — Health replaces the app\'s own estimates', () => {
  const session = (bed, wake) => ({ bedTs: at(bed), wakeTs: at(wake), asleepMin: (at(wake) - at(bed)) / 60000, awakeMin: 0, stages: null, nap: false });

  test('an unedited estimate for the night is superseded (returned, not deleted)', () => {
    const est = { id: 'e1', bedtime: at('2026-10-20T23:00:00'), waketime: at('2026-10-21T07:00:00'), durationMin: 480, date: '2026-10-21', source: 'estimate' };
    const res = mergeHealthSleep([est], [session('2026-10-20T23:40:00', '2026-10-21T06:50:00')]);
    expect(res.logs).toHaveLength(1);
    expect(res.logs[0].source).toBe('health_sync');
    expect(res.superseded).toEqual([expect.objectContaining({ id: 'e1', discarded: true, supersededBy: res.logs[0].id })]);
  });

  test('an edited estimate is the user\'s and is kept', () => {
    const est = { id: 'e1', bedtime: at('2026-10-20T23:00:00'), waketime: at('2026-10-21T07:00:00'), durationMin: 480, date: '2026-10-21', source: 'estimate', edited: true };
    expect(mergeHealthSleep([est], [session('2026-10-20T23:40:00', '2026-10-21T06:50:00')])).toBeNull();
  });

  test('superseded estimates are not treated as deletions', () => {
    const tomb = { id: 'e1', bedtime: at('2026-10-20T23:00:00'), waketime: at('2026-10-21T07:00:00'), discarded: true, supersededBy: 'health_x' };
    expect(mergeHealthSleep([], [session('2026-10-20T23:40:00', '2026-10-21T06:50:00')], { tombstones: [tomb] }).logs).toHaveLength(1);
  });
});

describe('sleepDebtNights', () => {
  test('14 days oldest → newest with naps split out and gaps marked missing', () => {
    const NOW = at('2026-10-21T12:00:00');
    const logs = [
      { bedtime: at('2026-10-20T23:00:00'), waketime: at('2026-10-21T06:00:00'), durationMin: 420, date: '2026-10-21', source: 'health_sync' },
      { bedtime: at('2026-10-21T10:00:00'), waketime: at('2026-10-21T10:30:00'), durationMin: 30, date: '2026-10-21', nap: true, ignoredFromScore: true },
      { bedtime: at('2026-10-18T23:00:00'), waketime: at('2026-10-19T07:00:00'), durationMin: 480, date: '2026-10-19' },
    ];
    const n = sleepDebtNights(logs, 480, NOW);
    expect(n).toHaveLength(14);
    expect(n[13]).toMatchObject({ date: '2026-10-21', mainMin: 420, napMin: 30, totalMin: 450, shortMin: 30, fromHealth: true, missing: false });
    expect(n[12]).toMatchObject({ date: '2026-10-20', missing: true, shortMin: 0 });
    expect(n[11]).toMatchObject({ date: '2026-10-19', shortMin: 0 });
  });
});

describe('sleepHabits', () => {
  const logs = sleepHistory({});
  const curve = energyCurve({ wakeMin: 420, bedMin: 1380, debtMin: 0, meals: [], logs, nowTs: at('2026-10-21T12:00:00'), dayStartTs: dayStart('2026-10-21') });
  const zones = energyZones(curve, { wakeMin: 420, bedMin: 1380 });
  const gym = bestGymWindow(curve, [], 420, 1380);
  const rec = recommend(logs, { age: 30 }, 0);

  test('timed to the day in order, light first and bed last', () => {
    const h = sleepHabits({ wakeMin: 420, bedMin: 1380, zones, rec, gym, debtMin: 0 });
    expect(h[0]).toMatchObject({ key: 'light', start: 420, end: 480 });
    expect(h[h.length - 1].key).toBe('bed');
    expect(h.find((x) => x.key === 'meal').start).toBe(1380 - 180);
    for (let i = 1; i < h.length; i++) expect(h[i].start).toBeGreaterThanOrEqual(h[i - 1].start);
    expect(h.some((x) => x.key === 'nap')).toBe(false); // no debt → no nap
  });

  test('suggests a nap in the dip only when carrying debt', () => {
    const h = sleepHabits({ wakeMin: 420, bedMin: 1380, zones, rec, gym, debtMin: 180 });
    const nap = h.find((x) => x.key === 'nap');
    expect(nap.start).toBe(zones.find((z) => z.kind === 'dip').start);
    expect(nap.end - nap.start).toBeLessThanOrEqual(30);
  });

  test('night-shift day: habits run past midnight on the curve axis', () => {
    const h = sleepHabits({ wakeMin: 900, bedMin: 420, zones: [], rec: { caffeineCutoff: 1380 }, gym: null, debtMin: 0 });
    expect(h.find((x) => x.key === 'bed').start).toBe(420 + DAYMIN - 45);
    expect(h.find((x) => x.key === 'caffeine').start).toBe(1380);
  });
});
