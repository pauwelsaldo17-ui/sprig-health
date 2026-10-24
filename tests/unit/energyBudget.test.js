/**
 * Energy budget: maintenance, net exercise energy, dedupe, dynamic budget, macros, calibration.
 * See docs/energy-budget.md. Run: npm test
 */
import { describe, test, expect } from 'vitest';
import {
  computeTargets, bmrMifflin, netStepKcal, strengthEnergy, exerciseEnergy, dedupeExercise,
  exerciseByDay, dayNeatKcal, activityAverages, maintenanceEstimate, goalAdjustment, calorieFloor,
  macroTargets, dayMacros, dailyBudget, wakingDayFraction, weightSlopePerDay, calibrateMaintenance,
  todayActivityEnergy, workoutAdjustment, sportSessionFromHealthWorkout, ENERGY,
} from '../../src/utils/vitaeCalc.js';

const P = { sex: 'male', age: 30, weight: 80, height: 180, activity: 'moderate', goal: 'maintain', experience: 'intermediate' };
const H = 36e5, M = 60000;
const T0 = new Date('2026-10-24T18:00:00').getTime();
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toLocaleDateString('en-CA'); };
const TODAY = '2026-10-24';
const days = (n, fn) => Array.from({ length: n }, (_, i) => fn(addDays(TODAY, -(n - i)), i));
const liftSet = (w, reps, rir) => ({ w, reps, rir });
const lift = (over = {}) => ({
  id: 'w1', date: TODAY, ts: T0, durationMin: 60, source: 'manual',
  exercises: [
    { name: 'Squat', sets: Array(5).fill(liftSet(100, 5, 2)) },
    { name: 'Bench', sets: Array(5).fill(liftSet(80, 8, 2)) },
    { name: 'Row', sets: Array(4).fill(liftSet(70, 10, 2)) },
  ],
  ...over,
});
const run = (over = {}) => ({ id: 'r1', ts: T0, durationMin: 30, sportId: 'running', intensity: 'moderate', source: 'manual', ...over });

describe('baseline maintenance', () => {
  test('without history the prior is unchanged: Mifflin × activity factor', () => {
    const bmr = bmrMifflin(P); // 10*80 + 6.25*180 - 150 + 5
    expect(bmr).toBe(1780);
    const t = computeTargets(P);
    expect(t.maintenance).toBe(Math.round(1780 * 1.55));
    expect(t.calories).toBe(Math.round(1780 * 1.55 / 10) * 10);
  });

  test('missing profile values fall back to the old defaults', () => {
    expect(computeTargets({}).calories).toBe(computeTargets({ sex: 'male', age: 18, weight: 72, height: 178, activity: 'moderate', goal: 'maintain' }).calories);
  });

  test('no step or exercise history → no shift (missing data is not zero activity)', () => {
    const avg = activityAverages({ activityDays: [], exercise: {}, today: TODAY, firstDate: null, profile: P });
    expect(maintenanceEstimate(P, { averages: avg }).kcal).toBeCloseTo(1780 * 1.55, 5);
  });

  test('real average steps above what the level assumes raise maintenance; shrunk while history is short', () => {
    const rows = (n) => days(n, (date) => ({ date, steps: 12000 }));
    const full = maintenanceEstimate(P, { averages: activityAverages({ activityDays: rows(28), exercise: {}, today: TODAY, firstDate: null, profile: P }) });
    const half = maintenanceEstimate(P, { averages: activityAverages({ activityDays: rows(7), exercise: {}, today: TODAY, firstDate: null, profile: P }) });
    const extra = netStepKcal(12000, P) - netStepKcal(7000, P);
    expect(full.neatDelta).toBeCloseTo(extra, 5);
    expect(half.neatDelta).toBeCloseTo(extra / 2, 5);
  });

  test('phone-left-at-home days (<300 steps) and absurd days are ignored, not averaged in', () => {
    const rows = [...days(20, (date) => ({ date, steps: 8000 })), { date: addDays(TODAY, -1), steps: 40 }, { date: addDays(TODAY, -2), steps: 90000 }];
    const avg = activityAverages({ activityDays: rows, exercise: {}, today: TODAY, firstDate: null, profile: P });
    expect(avg.avgSteps).toBe(8000);
  });

  test('one unusual day cannot move the stable target much', () => {
    const rows = days(28, (date, i) => ({ date, steps: i === 27 ? 40000 : 7000 }));
    const t0 = computeTargets(P, { averages: activityAverages({ activityDays: days(28, (date) => ({ date, steps: 7000 })), exercise: {}, today: TODAY, firstDate: null, profile: P }) });
    const t1 = computeTargets(P, { averages: activityAverages({ activityDays: rows, exercise: {}, today: TODAY, firstDate: null, profile: P }) });
    expect(t1.calories - t0.calories).toBeLessThanOrEqual(60);
  });

  test('stable target uses previous days only — logging today changes nothing in it', () => {
    const exercise = { [TODAY]: { kcal: 900, sessions: [{}] }, [addDays(TODAY, -1)]: { kcal: 280, sessions: [{}] } };
    const a = activityAverages({ activityDays: [], exercise, today: TODAY, firstDate: addDays(TODAY, -30), profile: P });
    expect(a.exerciseDays).toBe(28);
    expect(a.avgExercise).toBeCloseTo(280 / 28, 5);
  });

  test('no exercise ever logged = unknown: the activity level keeps its assumption', () => {
    const a = activityAverages({ activityDays: [], exercise: {}, today: TODAY, firstDate: addDays(TODAY, -60), profile: P });
    expect(a.avgExercise).toBeNull();
    expect(maintenanceEstimate(P, { averages: a }).exerciseDelta).toBe(0);
  });
});

describe('exercise energy (net of rest, with ranges)', () => {
  test('sport: (MET − 1) × kg × h, ±25 %', () => {
    const e = exerciseEnergy(run(), P);
    expect(e.kcal).toBe(Math.round((9.8 - 1) * 80 * 0.5));
    expect(e.low).toBe(Math.round(e.kcal * 0.75));
    expect(e.high).toBe(Math.round(e.kcal * 1.25));
  });

  test('strength: modes off / conservative / normal pick the range', () => {
    const off = exerciseEnergy(lift(), P, { workoutCalorieMode: 'off' });
    const cons = exerciseEnergy(lift(), P, { workoutCalorieMode: 'conservative' });
    const norm = exerciseEnergy(lift(), P, { workoutCalorieMode: 'normal' });
    expect(off.kcal).toBe(0);
    expect(cons.kcal).toBeLessThan(norm.kcal);
    expect(norm.kcal).toBeGreaterThan(100);
    expect(norm.kcal).toBeLessThan(450); // an hour of lifting is not 600 kcal
  });

  test('strength: denser, harder, heavier sessions score a higher MET', () => {
    const easy = strengthEnergy(lift({ durationMin: 75 }), P);
    const hard = strengthEnergy(lift({ durationMin: 35, exercises: [{ sets: Array(16).fill(liftSet(120, 8, 0)) }] }), P);
    expect(hard.met).toBeGreaterThan(easy.met);
    expect(hard.intensity).toBe('hard');
  });

  test('strength duration falls back to ~2.5 min per set', () => {
    expect(strengthEnergy(lift({ durationMin: 0 }), P).min).toBe(14 * 2.5);
  });

  test('Apple Health workout uses its active energy (already net) and is capped to plausible', () => {
    const hk = { id: 'h1', ts: T0, endTs: T0 + 30 * M, durationMin: 30, sportId: 'running', source: 'health_sync', healthKcal: 310 };
    expect(exerciseEnergy(hk, P).kcal).toBe(310);
    const absurd = exerciseEnergy({ ...hk, healthKcal: 5000 }, P);
    expect(absurd.kcal).toBe(Math.round((ENERGY.MAX_MET - 1) * 80 * 0.5));
  });

  test('Health import keeps Apple energy separately as healthKcal', () => {
    const s = sportSessionFromHealthWorkout({ startDate: new Date(T0).toISOString(), endDate: new Date(T0 + 30 * M).toISOString(), workoutType: 'running', totalEnergyBurned: 300 }, 80);
    expect(s.healthKcal).toBe(300);
  });
});

describe('never double-count', () => {
  test('a lift and a "gym" sport session over the same hour count once (lift wins)', () => {
    const items = [exerciseEnergy(lift(), P), exerciseEnergy({ id: 's1', ts: T0 - 5 * M, durationMin: 60, sportId: 'circuit', source: 'manual' }, P)];
    const { kept, dropped } = dedupeExercise(items);
    expect(kept.map((k) => k.id)).toEqual(['w1']);
    expect(dropped[0].duplicateOf).toBe('w1');
  });

  test('an Apple Health workout overlapping an app-logged run is dropped', () => {
    const hk = { id: 'h1', ts: T0 - 30 * M, endTs: T0, durationMin: 30, sportId: 'running', source: 'health_sync', healthKcal: 280 };
    const { kept } = dedupeExercise([exerciseEnergy(hk, P), exerciseEnergy(run(), P)]);
    expect(kept).toHaveLength(1);
    expect(kept[0].source).toBe('manual');
  });

  test('separate sessions on the same day both count; same id twice counts once', () => {
    const morning = run({ id: 'r0', ts: T0 - 8 * H });
    const byDay = exerciseByDay({ workouts: [lift()], sportSessionsLog: [morning], daily: { sportSessions: [morning] }, date: TODAY, profile: P });
    expect(byDay[TODAY].sessions).toHaveLength(2);
  });

  test('steps taken during a run are exercise, not NEAT', () => {
    const ex = exerciseByDay({ workouts: [], sportSessionsLog: [], daily: { sportSessions: [run()] }, date: TODAY, profile: P })[TODAY];
    expect(ex.stepsInSessions).toBe(160 * 30);
    const act = todayActivityEnergy({ daily: { steps: 10000 }, exerciseToday: ex, profile: P });
    expect(act.neatKcal).toBe(Math.round(netStepKcal(10000 - 4800, P)));
    expect(act.exerciseKcal).toBe(ex.kcal);
  });

  test('Apple Health active energy is never added', () => {
    const a = todayActivityEnergy({ daily: { steps: 8000 }, exerciseToday: null, profile: P });
    const b = todayActivityEnergy({ daily: { steps: 8000, activeKcal: 900 }, exerciseToday: null, profile: P });
    expect(b).toEqual(a);
  });

  test('Health distance replaces the stride estimate and scales with steps outside workouts', () => {
    expect(dayNeatKcal({ steps: 10000, distanceM: 8000 }, P)).toBeCloseTo(0.5 * 80 * 8, 5);
    expect(dayNeatKcal({ steps: 10000, distanceM: 8000, stepsInSessions: 5000 }, P)).toBeCloseTo(0.5 * 80 * 4, 5);
  });

  test('workoutAdjustment (Today card) uses the same net estimate', () => {
    const adj = workoutAdjustment({ workouts: [lift()], profile: P, date: TODAY });
    expect(adj.kcal).toBe(exerciseEnergy(lift(), P).kcal);
    expect(workoutAdjustment({ workouts: [lift()], profile: { ...P, workoutCalorieMode: 'off' }, date: TODAY })).toBeNull();
  });
});

describe('goals and macros', () => {
  test('changing the goal changes only the goal adjustment, not maintenance', () => {
    const goals = ['lose', 'maintain', 'gain'].map((goal) => computeTargets({ ...P, goal }));
    expect(new Set(goals.map((t) => t.maintenance)).size).toBe(1);
    expect(goals[0].calories).toBeLessThan(goals[1].calories);
    expect(goals[2].calories).toBeGreaterThan(goals[1].calories);
  });

  test('cut ≈ 0.5 % body weight a week, bulk smaller for advanced lifters', () => {
    expect(goalAdjustment({ ...P, goal: 'lose' }, 2700)).toBe(-440);
    expect(goalAdjustment({ ...P, goal: 'gain', experience: 'beginner' }, 2700)).toBeGreaterThan(goalAdjustment({ ...P, goal: 'gain', experience: 'advanced' }, 2700));
  });

  test('target never drops below BMR / sex floor', () => {
    const small = { sex: 'female', age: 60, weight: 48, height: 152, activity: 'sedentary', goal: 'lose' };
    const t = computeTargets(small);
    expect(t.calories).toBeGreaterThanOrEqual(calorieFloor(small));
  });

  test('macros add up to the calories (±10 kcal rounding)', () => {
    for (const goal of ['lose', 'maintain', 'gain']) {
      const t = computeTargets({ ...P, goal });
      expect(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.calories)).toBeLessThanOrEqual(10);
    }
  });

  test('protein uses a BMI-27 reference weight; general health gets less', () => {
    const heavy = macroTargets({ ...P, weight: 130, goal: 'lose' }, 2500);
    expect(heavy.protein).toBe(Math.round(27 * 1.8 ** 2 * 2.0));
    expect(macroTargets({ ...P, intent: 'health' }, 2500).protein).toBeLessThan(macroTargets(P, 2500).protein);
  });

  test('extra calories on an active day go to carbs; protein stays', () => {
    const t = computeTargets(P);
    const d = dayMacros(t, t.calories + 400, P);
    expect(d.protein).toBe(t.protein);
    expect(d.fat).toBe(t.fat);
    expect(d.carbs).toBe(t.carbs + 100);
  });
});

describe('daily budget', () => {
  const t = computeTargets(P);
  const avg = t.energy.avgNeat + t.energy.avgExercise;

  test('stable mode never moves', () => {
    const b = dailyBudget({ profile: { ...P, calorieMode: 'stable' }, targets: t, neatKcal: 500, exerciseKcal: 600 });
    expect(b.calories).toBe(t.calories);
    expect(b.delta).toBe(0);
  });

  test('morning with nothing done yet: budget ≈ stable (no morning penalty)', () => {
    const b = dailyBudget({ profile: P, targets: t, neatKcal: 0, exerciseKcal: 0, dayFraction: 0.1 });
    expect(Math.abs(b.delta)).toBeLessThanOrEqual(10);
  });

  test('a big extra workout raises the budget, but damped and capped', () => {
    const b = dailyBudget({ profile: P, targets: t, neatKcal: t.energy.avgNeat, exerciseKcal: t.energy.avgExercise + 400, dayFraction: 0.6 });
    expect(b.delta).toBe(300); // 0.75 × 400
    expect(b.text).toMatch(/higher today/);
    const cut = dailyBudget({ profile: { ...P, goal: 'lose' }, targets: computeTargets({ ...P, goal: 'lose' }), neatKcal: t.energy.avgNeat, exerciseKcal: t.energy.avgExercise + 400, dayFraction: 0.6 });
    expect(cut.delta).toBe(200); // 0.5 × 400 keeps the deficit
    const huge = dailyBudget({ profile: P, targets: t, neatKcal: 0, exerciseKcal: 5000, dayFraction: 1 });
    expect(huge.delta).toBe(ENERGY.DYN_MAX_UP);
  });

  test('a quiet day lowers the budget only by bedtime', () => {
    const noon = dailyBudget({ profile: P, targets: t, neatKcal: avg * 0.2, exerciseKcal: 0, dayFraction: 0.4 });
    const bed = dailyBudget({ profile: P, targets: t, neatKcal: avg * 0.2, exerciseKcal: 0, dayFraction: 1 });
    expect(bed.delta).toBeLessThan(noon.delta);
    expect(bed.delta).toBe(Math.round(-0.8 * avg * 0.75 / 10) * 10);
  });

  test('over a typical week the dynamic targets average to the stable target', () => {
    // 3 training days, 4 rest days whose mean equals what the target includes
    const ex = [2, 0, 2, 0, 2, 0, 1].map((k) => k * t.energy.avgExercise * 7 / 7);
    const scale = t.energy.avgExercise * 7 / ex.reduce((a, v) => a + v, 0);
    const deltas = ex.map((e) => dailyBudget({ profile: P, targets: t, neatKcal: t.energy.avgNeat, exerciseKcal: e * scale, dayFraction: 1 }).delta);
    const mean = deltas.reduce((a, v) => a + v, 0) / 7;
    expect(Math.abs(mean)).toBeLessThanOrEqual(10);
  });

  test('budget macros stay consistent with the budget calories', () => {
    const b = dailyBudget({ profile: P, targets: t, neatKcal: avg + 300, exerciseKcal: 0, dayFraction: 1 });
    expect(Math.abs(b.protein * 4 + b.carbs * 4 + b.fat * 9 - b.calories)).toBeLessThanOrEqual(10);
    expect(b.protein).toBe(t.protein);
  });

  test('waking-day fraction', () => {
    expect(wakingDayFraction(T0, null)).toBe(0);
    expect(wakingDayFraction(T0 + 8 * H, T0)).toBe(0.5);
    expect(wakingDayFraction(T0 + 20 * H, T0)).toBe(1);
  });
});

describe('calibration from weight and intake', () => {
  const bmr = bmrMifflin(P);
  const model = computeTargets(P).maintenance;
  const hist = (kcal, n = 14) => days(n, (date) => ({ date, calories: kcal }));
  const weights = (perWeek, n = 21) => days(n, (date, i) => ({ date, kg: 80 + (perWeek / 7) * i })).filter((_, i) => i % 3 === 0);

  test('needs enough complete days and weigh-ins', () => {
    expect(calibrateMaintenance({ history: hist(2500, 5), weights: weights(0), today: TODAY, modelKcal: model, targetKcal: model, bmr }).status).toBe('insufficient');
    expect(calibrateMaintenance({ history: hist(2500), weights: weights(0).slice(0, 2), today: TODAY, modelKcal: model, targetKcal: model, bmr }).status).toBe('insufficient');
  });

  test('incomplete log days are ignored', () => {
    const h = [...hist(2500), ...days(10, (date) => ({ date, calories: 400 }))];
    const r = calibrateMaintenance({ history: h, weights: weights(0), today: TODAY, modelKcal: model, targetKcal: model, bmr });
    expect(r.days).toBe(14);
  });

  test('observed maintenance = intake − slope × 7700; moves slowly toward it', () => {
    // eating 2300 and losing 0.2 kg/week → maintenance ≈ 2300 + 220 = 2520
    const r = calibrateMaintenance({ history: hist(2300), weights: weights(-0.2), today: TODAY, modelKcal: model, targetKcal: model, bmr });
    expect(r.status).toBe('updated');
    expect(r.observed).toBeGreaterThan(2490);
    expect(r.observed).toBeLessThan(2550);
    expect(r.offset).toBe(-60); // first step capped at 60 kcal
    // later days converge, never past the estimate
    let prev = r;
    for (let i = 1; i <= 40; i++) prev = calibrateMaintenance({ history: hist(2300), weights: weights(-0.2), today: addDays(TODAY, 0) + '', modelKcal: model, targetKcal: model, bmr, prev: { ...prev, date: 'x' + i } });
    expect(prev.offset).toBeCloseTo(r.target, -1);
  });

  test('runs once per day', () => {
    const r = calibrateMaintenance({ history: hist(2300), weights: weights(-0.2), today: TODAY, modelKcal: model, targetKcal: model, bmr, prev: { offset: 0, date: TODAY } });
    expect(r.status).toBe('same-day');
    expect(r.offset).toBe(0);
  });

  test('implausible results are rejected', () => {
    const r = calibrateMaintenance({ history: hist(900), weights: weights(1.5), today: TODAY, modelKcal: model, targetKcal: 900, bmr });
    expect(r.status).toBe('unreliable');
  });

  test('calibration shifts the stable target; total offset is bounded', () => {
    expect(computeTargets(P, { calibrationOffset: -150 }).maintenance).toBe(model - 150);
    expect(computeTargets(P, { calibrationOffset: -5000 }).energy.calibration).toBe(-Math.max(500, 1780 * 1.55 * 0.2));
  });

  test('weight slope', () => {
    expect(weightSlopePerDay([{ date: '2026-10-01', kg: 80 }, { date: '2026-10-11', kg: 79 }])).toBeCloseTo(-0.1, 5);
  });
});

// Same chain App.jsx runs every render: exercise per day → averages → stable targets → today's budget.
function pipeline({ profile, workouts = [], sportSessionsLog = [], daily = {}, activityDays = [], calibrationOffset = 0, dayFraction = 1, firstDate = addDays(TODAY, -60) }) {
  const exercise = exerciseByDay({ workouts, sportSessionsLog, daily, date: TODAY, profile });
  const averages = activityAverages({ activityDays, exercise, today: TODAY, firstDate, profile });
  const targets = computeTargets(profile, { averages, calibrationOffset });
  const act = todayActivityEnergy({ daily, exerciseToday: exercise[TODAY], profile });
  return { targets, act, budget: dailyBudget({ profile, targets, neatKcal: act.neatKcal, exerciseKcal: act.exerciseKcal, dayFraction }) };
}

describe('scenarios (full pipeline)', () => {
  // 4 weeks: ~8k steps a day, lifting Mon/Wed/Fri at 18:00
  const history = days(28, (date) => ({ date, steps: 8000 }));
  const pastLifts = days(28, (date, i) => i % 7 === 0 || i % 7 === 2 || i % 7 === 4
    ? lift({ id: 'w' + i, date, ts: new Date(date + 'T18:00:00').getTime() }) : null).filter(Boolean);
  const base = { profile: P, workouts: pastLifts, activityDays: history, daily: { steps: 8000 } };

  test('logging today\'s workout raises today\'s budget only, by a damped share of its estimate', () => {
    const before = pipeline(base);
    const after = pipeline({ ...base, workouts: [...pastLifts, lift({ id: 'today' })] });
    expect(after.targets.calories).toBe(before.targets.calories);           // stable target untouched
    const est = exerciseEnergy(lift(), P).kcal;
    expect(after.budget.calories - before.budget.calories).toBeGreaterThan(0);
    expect(after.budget.calories - before.budget.calories).toBeLessThanOrEqual(Math.ceil(est * 0.75 / 10) * 10);
    expect(after.budget.protein).toBe(before.budget.protein);
  });

  test('importing the same workout from Apple Health changes nothing', () => {
    const withLift = pipeline({ ...base, workouts: [...pastLifts, lift({ id: 'today' })] });
    const hk = { id: 'health_workout_x', ts: T0 - 58 * M, endTs: T0 - M, durationMin: 57, sportId: 'crosstraining', source: 'health_sync', healthKcal: 420 };
    const both = pipeline({ ...base, workouts: [...pastLifts, lift({ id: 'today' })], daily: { steps: 8000, sportSessions: [hk] } });
    expect(both.budget.calories).toBe(withLift.budget.calories);
    expect(both.act.duplicates).toBe(1);
  });

  test('a separate Apple Health walk the same day does add (but its steps leave NEAT)', () => {
    const walk = { id: 'health_workout_w', ts: T0 - 5 * H, endTs: T0 - 4 * H, durationMin: 60, sportId: 'walking', source: 'health_sync', healthKcal: 180 };
    const a = pipeline({ ...base, daily: { steps: 14000 } });
    const b = pipeline({ ...base, daily: { steps: 14000, sportSessions: [walk] } });
    expect(b.act.neatKcal).toBeLessThan(a.act.neatKcal);
    expect(b.act.exerciseKcal).toBe(180);
    // walk energy replaces part of the step energy: the total rises less than the walk's 180 kcal
    expect((b.act.neatKcal + b.act.exerciseKcal) - (a.act.neatKcal + a.act.exerciseKcal)).toBeLessThan(180);
  });

  test('changing the goal keeps maintenance and today\'s activity; only goal kcal and macros move', () => {
    const goals = ['lose', 'maintain', 'gain'].map((goal) => pipeline({ ...base, profile: { ...P, goal } }));
    expect(new Set(goals.map((g) => g.targets.maintenance)).size).toBe(1);
    expect(new Set(goals.map((g) => g.act.neatKcal + g.act.exerciseKcal)).size).toBe(1);
    goals.forEach((g) => expect(Math.abs(g.budget.protein * 4 + g.budget.carbs * 4 + g.budget.fat * 9 - g.budget.calories)).toBeLessThanOrEqual(10));
  });

  test('switching to a fixed budget returns exactly the stable target', () => {
    const r = pipeline({ ...base, profile: { ...P, calorieMode: 'stable' }, workouts: [...pastLifts, lift({ id: 'today' })], daily: { steps: 20000 } });
    expect(r.budget.calories).toBe(r.targets.calories);
  });

  test('a week with missing step data and no workouts still gives a sane target', () => {
    const r = pipeline({ profile: P, activityDays: days(7, (date, i) => ({ date, steps: i % 2 ? 0 : 6000 })), daily: {} , dayFraction: 0.3 });
    expect(r.targets.calories).toBeGreaterThan(computeTargets(P).calories - 150);
    expect(r.targets.calories).toBeLessThan(computeTargets(P).calories + 150);
    expect(Math.abs(r.budget.delta)).toBeLessThanOrEqual(30);
  });

  test('the logged training pattern replaces the level\'s assumption once there is history', () => {
    const r = pipeline(base);
    const avgEx = (pastLifts.length * exerciseEnergy(lift(), P).kcal) / 28;
    expect(r.targets.energy.avgExercise).toBeCloseTo(avgEx, 0);
  });
});
