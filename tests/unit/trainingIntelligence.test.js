/**
 * Training intelligence: stats, records, trend/plateau, load, recovery, prediction, rest,
 * warm-ups, consistency, templates, recap, coach summary. See docs/training-intelligence.md.
 * Run: npm test
 */
import { describe, test, expect } from 'vitest';
import {
  isWorkingSet, setStimulus, e1rmApplicable, muscleSetsOf, workoutStats, dropDuplicateSessions,
  exerciseSessions, exerciseRecords, plateauFor, exerciseTrend, plateauedExercises, trainingLoad,
  trainingConsistency, predictNextSets, restFor, warmGroupsFor, warmupSets, suggestTemplatesFromHistory,
  workoutRecap, trainingSummary, muscleRecovery, stallingLifts, deloadAdvice, progressionFor,
  weeklyVolume, findEx, localCoachAnswer,
} from '../../src/utils/vitaeCalc.js';

const H = 36e5, D = 864e5;
const NOW = new Date('2026-10-24T18:00:00').getTime();
const day = (ts) => new Date(ts).toLocaleDateString('en-CA');
let n = 0;
const wo = (daysAgo, exercises, over = {}) => {
  const ts = NOW - daysAgo * D;
  return { id: 'w' + (n++), date: day(ts), ts, durationMin: 60, exercises, ...over };
};
const ex = (name, sets) => ({ name, group: findEx(name)?.group, sets: sets.map(([w, reps, rir]) => ({ w, reps, rir: rir ?? null })) });
const bench = (w, reps = 8, k = 3, rir) => ex('Barbell Bench Press', Array.from({ length: k }, () => [w, reps, rir]));
const squat = (w, reps = 5, k = 3) => ex('Barbell Squat', Array.from({ length: k }, () => [w, reps]));

describe('set classification', () => {
  test('warm-ups and undone sets do not count', () => {
    expect(isWorkingSet({ w: 60, reps: 5 })).toBe(true);
    expect(isWorkingSet({ w: 40, reps: 5, warmup: true })).toBe(false);
    expect(isWorkingSet({ w: 60, reps: 5, done: false })).toBe(false);
    expect(isWorkingSet({ w: 60, reps: 0 })).toBe(false);
  });
  test('RIR stimulus weights', () => {
    expect(setStimulus({ w: 60, reps: 8, rir: 0 })).toBe(1.15);
    expect(setStimulus({ w: 60, reps: 8, rir: 2 })).toBe(1);
    expect(setStimulus({ w: 60, reps: 8, rir: null })).toBe(1);
    expect(setStimulus({ w: 60, reps: 8, rir: 5 })).toBe(0.6);
  });
  test('e1RM only applies to loaded sets ≤ 12 reps', () => {
    expect(e1rmApplicable({ w: 60, reps: 12 })).toBe(true);
    expect(e1rmApplicable({ w: 60, reps: 15 })).toBe(false);
    expect(e1rmApplicable({ w: 0, reps: 10 })).toBe(false);
  });
});

describe('workout stats and muscle contribution', () => {
  test('totals, duration and secondary muscles at 0.5', () => {
    const w = wo(0, [bench(80, 8, 3), ex('Barbell Bench Press', [[40, 8]]).sets && { ...ex('Barbell Bench Press', [[40, 8]]), sets: [{ w: 40, reps: 8, warmup: true }] }]);
    const st = workoutStats(w);
    expect(st.sets).toBe(3);
    expect(st.reps).toBe(24);
    expect(st.volume).toBe(80 * 8 * 3);
    expect(st.durationMin).toBe(60);
    expect(st.muscles.chest).toBe(3);
    expect(st.muscles.triceps).toBe(1.5);
  });
  test('duration falls back to set timestamps, then ~2.5 min per set', () => {
    const t0 = NOW - H;
    const w1 = { ts: NOW, exercises: [{ name: 'Barbell Squat', sets: [{ w: 100, reps: 5, ts: t0 }, { w: 100, reps: 5, ts: t0 + 30 * 60000 }] }] };
    expect(workoutStats(w1).durationMin).toBe(32);
    const w2 = { ts: NOW, exercises: [squat(100, 5, 6)] };
    expect(workoutStats(w2).durationMin).toBe(15);
  });
  test('weekly volume ignores warm-up sets', () => {
    const w = wo(1, [{ name: 'Barbell Squat', group: 'quads', sets: [{ w: 60, reps: 5, warmup: true }, { w: 100, reps: 5 }, { w: 100, reps: 5 }] }]);
    expect(weeklyVolume([w], NOW).quads).toBe(2);
  });
});

describe('records and history', () => {
  const hist = [wo(14, [bench(80, 8)]), wo(7, [bench(82.5, 8)]), wo(3, [ex('Barbell Bench Press', [[85, 5], [70, 12]])])];
  test('sessions in time order with top set and perf', () => {
    const s = exerciseSessions(hist, 'Barbell Bench Press');
    expect(s.map((x) => x.top.w)).toEqual([80, 82.5, 85]);
    expect(s[2].volume).toBe(85 * 5 + 70 * 12);
  });
  test('records by type', () => {
    const r = exerciseRecords(hist, 'Barbell Bench Press');
    expect(r.weight.value).toBe(85);
    expect(r.repsAt[70].value).toBe(12);
    expect(Math.round(r.e1rm.value)).toBe(Math.round(Math.max(82.5 * (1 + 8 / 30), 85 * (1 + 5 / 30), 70 * 1.4)));
    expect(r.sessions).toBe(3);
  });
});

describe('trend and plateau', () => {
  const progressing = [10, 8, 6, 4, 2, 0].map((wk, i) => wo(wk * 7 / 2 + 1, [bench(70 + i * 2.5)]));
  test('progressing lift: positive slope, no plateau', () => {
    const t = exerciseTrend(progressing, 'Barbell Bench Press', NOW);
    expect(t.status).toBe('progressing');
    expect(t.slopePctWk).toBeGreaterThan(1);
    expect(plateauFor(progressing, 'Barbell Bench Press', NOW)).toBeNull();
  });
  test('plateau needs ≥ 5 sessions over ≥ 3 weeks and no new best in 3 weeks', () => {
    const flat = [35, 28, 21, 15, 8, 2].map((d, i) => wo(d, [bench(i < 2 ? 75 + i * 2.5 : 80)]));
    const p = plateauFor(flat, 'Barbell Bench Press', NOW);
    expect(p?.kind).toBe('plateau');
    expect(stallingLifts(flat, NOW)).toContain('Barbell Bench Press');
    // three flat sessions in one week are NOT a plateau
    const short = [6, 4, 2].map((d) => wo(d, [bench(80)]));
    expect(plateauFor(short, 'Barbell Bench Press', NOW)).toBeNull();
    expect(stallingLifts(short, NOW)).toEqual([]);
  });
  test('regression: last 3 sessions average < 95 % of best', () => {
    const drop = [35, 28, 21, 9, 5, 1].map((d, i) => wo(d, [bench(i < 3 ? 80 + i * 2.5 : 72.5)]));
    expect(plateauFor(drop, 'Barbell Bench Press', NOW)?.kind).toBe('regressing');
  });
  test('an accessory kept at a steady load is maintaining, not a plateau', () => {
    const steady = [42, 35, 28, 21, 15, 8, 2].map((d) => wo(d, [ex('Lateral Raise', [[10, 12], [10, 12]])]));
    expect(plateauFor(steady, 'Lateral Raise', NOW)).toBeNull();
    expect(exerciseTrend(steady, 'Lateral Raise', NOW).status).toBe('maintaining');
  });
  test('plateauedExercises only looks at exercises trained in the last 3 weeks', () => {
    const old = [80, 70, 60, 50, 40, 30].map((d) => wo(d, [bench(80)]));
    expect(plateauedExercises(old, NOW)).toEqual([]);
  });
});

describe('progression does not spiral into repeated deloads', () => {
  test('plateau → one reset, then normal progression from the lighter weight', () => {
    const flat = [42, 35, 28, 21, 15, 8, 2].map((d, i) => wo(d, [bench(i < 2 ? 75 + i * 2.5 : 80, 8, 3, 1)]));
    const p1 = progressionFor(flat, 'Barbell Bench Press', {}, 70, null, null, NOW);
    expect(p1.action).toBe('deload');
    expect(p1.w).toBe(72);
    const afterReset = [...flat, wo(0.5, [bench(72, 8, 3, 2)])];
    const p2 = progressionFor(afterReset, 'Barbell Bench Press', {}, 70, null, null, NOW);
    expect(p2.action).not.toBe('deload');
    // a milder, user-chosen reset (−6 %) also counts as building back up
    const mild = [...flat, wo(0.5, [bench(75, 8, 3, 2)])];
    expect(progressionFor(mild, 'Barbell Bench Press', {}, 70, null, null, NOW).action).not.toBe('deload');
  });
});

describe('training load', () => {
  test('sRPE load, acute vs chronic ratio and zone', () => {
    const steady = Array.from({ length: 12 }, (_, i) => wo(27 - i * 2.4, [squat(100)], { durationMin: 60 }));
    const l = trainingLoad({ workouts: steady, now: NOW });
    expect(l.ratio).toBeGreaterThan(0.8);
    expect(l.ratio).toBeLessThanOrEqual(1.3);
    expect(l.zone).toBe('steady');
    // RIR 0 sets → RPE 10 → 60 × 10
    const hard = workoutStats(wo(0, [squat(100, 5, 3)].map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, rir: 0 })) }))));
    expect(hard.rpe).toBe(10);
  });
  test('spike when the last week doubles', () => {
    const base = Array.from({ length: 8 }, (_, i) => wo(27 - i * 3, [squat(100)], { durationMin: 45 }));
    const spike = [...base, ...[6, 5, 4, 3, 2, 1, 0.5].map((d) => wo(d, [squat(100)], { durationMin: 90 }))];
    expect(trainingLoad({ workouts: spike, now: NOW }).zone).toBe('spike');
  });
  test('no ratio with < 21 days of history', () => {
    expect(trainingLoad({ workouts: [wo(3, [squat(100)])], now: NOW }).ratio).toBeNull();
  });
  test('imported Health strength workout overlapping a Sprig workout is ignored', () => {
    const w = wo(1, [squat(100)], { durationMin: 60 });
    const health = { id: 'h1', source: 'health_sync', ts: w.ts - 58 * 60000, endTs: w.ts + 2 * 60000, durationMin: 60, intensity: 'moderate', sportId: 'circuit' };
    const run = { id: 'h2', source: 'health_sync', ts: w.ts + 5 * H, endTs: w.ts + 5.5 * H, durationMin: 30, intensity: 'moderate', sportId: 'running' };
    expect(dropDuplicateSessions([health, run], [w]).map((s) => s.id)).toEqual(['h2']);
    const l = trainingLoad({ workouts: [w], sportSessions: [health, run], now: NOW });
    expect(l.acute).toBe(60 * 7.5 + 30 * 5);
  });
});

describe('recovery model', () => {
  const R = (ws, opts = {}) => muscleRecovery(ws, 70, null, {}, opts.sport || [], { now: opts.now || NOW });
  test('fresh session → fatigued, not recovered; recovers within days, not a fixed timer', () => {
    const w = wo(0, [bench(80, 8, 4)]);
    w.ts = NOW - 1 * H;
    const r = R([w]);
    expect(r.chest.recovered).toBe(false);
    expect(r.chest.fatigue).toBeGreaterThan(40);
    expect(r.chest.remaining).toBeGreaterThan(12);
    const later = R([w], { now: NOW + 4 * D });
    expect(later.chest.recovered).toBe(true);
    expect(later.chest.fatigue).toBeLessThan(20);
  });
  test('two sessions accumulate: more fatigue than the latest alone', () => {
    const a = wo(1, [bench(80, 8, 5)]), b = wo(0, [bench(80, 8, 5)]);
    b.ts = NOW - 2 * H;
    expect(R([a, b]).chest.fatigue).toBeGreaterThan(R([b]).chest.fatigue);
    expect(R([a, b]).chest.remaining).toBeGreaterThan(R([b]).chest.remaining);
  });
  test('more sets and lower RIR mean longer recovery', () => {
    const light = wo(0, [bench(80, 8, 2, 3)]), heavy = wo(0, [bench(80, 8, 6, 0)]);
    light.ts = heavy.ts = NOW - 2 * H;
    expect(R([heavy]).chest.remaining).toBeGreaterThan(R([light]).chest.remaining);
  });
  test('poor sleep stretches recovery', () => {
    const w = wo(0, [bench(80, 8, 4)]); w.ts = NOW - 2 * H;
    const good = muscleRecovery([w], 90, null, {}, [], { now: NOW });
    const poor = muscleRecovery([w], 30, null, {}, [], { now: NOW });
    expect(poor.chest.remaining).toBeGreaterThan(good.chest.remaining);
  });
  test('Health duplicate of a Sprig workout adds no sport fatigue', () => {
    const w = wo(0, [squat(100)], { durationMin: 60 }); w.ts = NOW - 2 * H;
    const dup = { id: 'h', source: 'health_sync', ts: w.ts - 60 * 60000, endTs: w.ts, durationMin: 60, sportId: 'circuit', sportName: 'Circuit', intensity: 'moderate' };
    expect(R([w], { sport: [dup] }).quads.sportStacked).toBe(false);
  });
  test('tracking off keeps the old shape', () => {
    expect(muscleRecovery([], 70, null, { training: false }).chest.trackingOff).toBe(true);
  });
});

describe('deload advice needs meaningful trends', () => {
  test('never for < 4 weeks of history', () => {
    const ws = [10, 8, 6, 4, 2].map((d) => wo(d, [bench(80), squat(100)]));
    const rec = muscleRecovery(ws, 70, null, {}, [], { now: NOW });
    expect(deloadAdvice(ws, 600, rec, { now: NOW }).suggest).toBe(false);
  });
  test('two stalled lifts + high sleep debt → suggest', () => {
    const ws = [42, 35, 28, 21, 15, 8, 2].map((d, i) => wo(d, [bench(i < 2 ? 75 + i * 2.5 : 80), squat(i < 2 ? 95 + i * 2.5 : 100)]));
    const rec = muscleRecovery(ws, 70, null, {}, [], { now: NOW });
    const a = deloadAdvice(ws, 400, rec, { now: NOW });
    expect(a.stalls.length).toBe(2);
    expect(a.suggest).toBe(true);
  });
});

describe('prediction and prefill', () => {
  test('predicted sets follow the progression target and keep back-off ratios', () => {
    const last = wo(3, [ex('Barbell Bench Press', [[80, 8, 3], [80, 8, 3], [70, 10, 2]])]);
    const p = predictNextSets([last], 'Barbell Bench Press', { sleepReadiness: 80, now: NOW });
    expect(p.action).toBe('add_w');
    // 8 reps = top of the compound 5–8 range → add load, back to the bottom of the range
    expect(p.sets[0]).toEqual({ w: 82.5, reps: 5 });
    expect(p.sets[1]).toEqual({ w: 82.5, reps: 5 });
    expect(p.sets[2].w).toBe(72);
    expect(p.sets[2].reps).toBe(10);
  });
  test('no history → null', () => {
    expect(predictNextSets([], 'Barbell Bench Press')).toBeNull();
  });
});

describe('rest suggestions', () => {
  const comp = findEx('Barbell Squat'), iso = findEx('Lateral Raise');
  test('by exercise type, reps and RIR', () => {
    expect(restFor(comp, { reps: 5 }).secs).toBe(210);
    expect(restFor(comp, { reps: 8 }).secs).toBe(150);
    expect(restFor(comp, { reps: 8, rir: 0 }).secs).toBe(180);
    expect(restFor(iso, { reps: 12 }).secs).toBe(75);
    expect(restFor(iso, { reps: 12, rir: 3 }).secs).toBe(60);
  });
  test('custom rest always wins', () => {
    expect(restFor(comp, { reps: 5 }, 120)).toEqual({ secs: 120, auto: false });
  });
});

describe('warm-ups', () => {
  test('first exercise of a group gets the full ramp; later ones a short ramp or none', () => {
    const benchMeta = findEx('Barbell Bench Press'), flyMeta = findEx('Cable Crossover') || { group: 'chest', type: 'isolation' };
    expect(warmupSets(100, benchMeta).sets.length).toBe(4);
    const active = [ex('Barbell Bench Press', [[100, 5]]), { name: 'Incline Dumbbell Press', sets: [] }, { name: 'Cable Crossover', sets: [] }];
    const warm = warmGroupsFor(active, 1);
    expect(warm.has('chest')).toBe(true);
    expect(warmupSets(40, findEx('Incline Dumbbell Press'), 'kg', { warmGroups: warm }).sets.length).toBe(2);
    expect(warmupSets(20, flyMeta, 'kg', { warmGroups: warmGroupsFor(active, 2) }).sets.length).toBe(0);
  });
});

describe('consistency and adherence', () => {
  test('target from usual weeks, adherence and streak', () => {
    const ws = [];
    for (let wk = 1; wk <= 6; wk++) [0, 2, 4].forEach((d) => ws.push(wo(wk * 7 + d - 2, [squat(100)])));
    const c = trainingConsistency({ workouts: ws, now: NOW });
    expect(c.target).toBe(3);
    expect(c.adherencePct).toBeGreaterThanOrEqual(90);
    expect(c.streakWeeks).toBeGreaterThanOrEqual(4);
    expect(c.muscleFrequency.quads).toBeGreaterThan(2);
  });
  test('empty history', () => {
    expect(trainingConsistency({ workouts: [], now: NOW }).adherencePct).toBeNull();
  });
});

describe('templates from history', () => {
  test('recurring unsaved session is offered; one covered by a routine is not', () => {
    const push = () => [bench(80), ex('Overhead Press', [[50, 8]]), ex('Lateral Raise', [[10, 12]])];
    const ws = [20, 13, 6].map((d) => wo(d, push()));
    const s = suggestTemplatesFromHistory({ workouts: ws, routines: [], now: NOW });
    expect(s.length).toBe(1);
    expect(s[0].exercises).toEqual(['Barbell Bench Press', 'Overhead Press', 'Lateral Raise']);
    expect(s[0].count).toBe(3);
    const covered = suggestTemplatesFromHistory({ workouts: ws, routines: [{ name: 'Push', exercises: ['Barbell Bench Press', 'Overhead Press', 'Lateral Raise'] }], now: NOW });
    expect(covered).toEqual([]);
  });
});

describe('recap and coach summary', () => {
  const P = { sex: 'male', age: 30, weight: 80, height: 180, workoutCalorieMode: 'normal' };
  test('recap adds calories (range), muscles, typed records and change vs last time', () => {
    const prior = [wo(7, [bench(80, 8)])];
    const w = wo(0, [bench(82.5, 8)]);
    const r = workoutRecap(w, prior, { profile: P, now: NOW });
    expect(r.totalSets).toBe(3);
    expect(r.records).toBe(1);
    expect(r.kcal.kcal).toBeGreaterThan(0);
    expect(r.kcal.low).toBeLessThan(r.kcal.high);
    expect(r.muscles[0].key).toBe('chest');
    expect(r.prs[0].kind).toBe('e1rm');
    expect(r.changes[0].pct).toBeGreaterThan(0);
    expect(r.insights.length).toBeGreaterThan(0);
  });
  test('calories off → no estimate', () => {
    const r = workoutRecap(wo(0, [bench(80)]), [], { profile: { ...P, workoutCalorieMode: 'off' }, now: NOW });
    expect(r.kcal).toBeNull();
  });
  test('summary is numbers-only and feeds the local coach fallback', () => {
    const ws = [35, 28, 21, 15, 8, 2].map((d, i) => wo(d, [bench(i < 2 ? 75 + i * 2.5 : 80)]));
    const s = trainingSummary({ workouts: ws, now: NOW });
    expect(s.plateaus[0].exercise).toBe('Barbell Bench Press');
    expect(s.lastWorkout.sets).toBe(3);
    expect(localCoachAnswer('why am I stuck on bench?', { trainingSummary: s })).toMatch(/Stalled: Barbell Bench Press/);
    expect(trainingSummary({ workouts: [], now: NOW })).toBeNull();
  });
});

describe('muscleSetsOf', () => {
  test('weighted by RIR when asked', () => {
    const w = wo(0, [bench(80, 8, 2, 0)]);
    expect(muscleSetsOf(w).chest).toBe(2);
    expect(muscleSetsOf(w, { weighted: true }).chest).toBeCloseTo(2.3);
  });
});
