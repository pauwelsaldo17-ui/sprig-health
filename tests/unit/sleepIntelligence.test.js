/**
 * Wearable-free sleep intelligence: learned schedule, regularity, trends, goal progress,
 * morning check-in and the sleep-aware day boundary. See docs/sleep-intelligence.md.
 * Run: npm test
 */
import { describe, test, expect } from 'vitest';
import {
  sleepPattern, expectedNight, sleepRegularity, sleepTrends, sleepGoalProgress, likelySleepPeriod,
  sprigDateFor, circSdMin, circSigned, recommend, hmToMin,
} from '../../src/utils/vitaeCalc.js';

const D = 864e5;
const at = (date, hm) => new Date(`${date}T${hm}:00`).getTime();
const addDays = (date, n) => { const d = new Date(date + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
// a main sleep that ends on `wakeDate` at `wake`, started at `bed` (the evening before if later than wake)
const night = (wakeDate, bed, wake, extra = {}) => {
  const bedDate = hmToMin(bed) > hmToMin(wake) ? addDays(wakeDate, -1) : wakeDate;
  const bedtime = at(bedDate, bed), waketime = at(wakeDate, wake);
  return { id: `n_${wakeDate}`, date: wakeDate, bedtime, waketime, durationMin: Math.round((waketime - bedtime) / 60000) - 10, source: 'health_sync', ...extra };
};
const TODAY = '2026-10-24'; // Saturday
const NOW = at(TODAY, '09:30');
// 4 weeks: work days 23:30→07:00, weekends 01:00→09:30
const fourWeeks = Array.from({ length: 28 }, (_, i) => {
  const d = addDays(TODAY, -(28 - i) + 1);
  const dow = new Date(d + 'T12:00:00').getDay();
  return dow === 0 || dow === 6 ? night(d, '01:00', '09:30') : night(d, '23:30', '07:00');
}).filter((l) => l.waketime <= NOW);

describe('circular helpers', () => {
  test('spread across midnight is small, signed difference wraps', () => {
    expect(circSdMin([1430, 10, 1435, 5])).toBeLessThan(15);
    expect(circSigned(30, 1410)).toBe(60);
    expect(circSigned(1410, 30)).toBe(-60);
  });
});

describe('learned schedule', () => {
  const p = sleepPattern(fourWeeks, { nowTs: NOW });
  test('work and free days are learned separately', () => {
    expect(p.confidence).toBe('high');
    expect(p.work.bedMin).toBe(hmToMin('23:30'));
    expect(p.work.wakeMin).toBe(hmToMin('07:00'));
    expect(p.free.wakeMin).toBe(hmToMin('09:30'));
    expect(p.socialJetlagMin).toBe(120); // mid-sleep 03:15 vs 05:15
    expect(p.daySleeper).toBe(false);
  });

  test('expected night follows the weekday of waking', () => {
    expect(expectedNight(p, '2026-10-26').basis).toBe('work');   // Monday
    expect(expectedNight(p, '2026-10-25').wakeMin).toBe(hmToMin('09:30')); // Sunday
  });

  test('too few nights → low confidence, no expectations', () => {
    const few = sleepPattern(fourWeeks.slice(-3), { nowTs: NOW });
    expect(few.confidence).toBe('low');
    expect(expectedNight(few, TODAY)).toBeNull();
  });

  test('night-shift worker is recognised as a day sleeper', () => {
    const shifts = Array.from({ length: 10 }, (_, i) => night(addDays(TODAY, -i), '08:00', '15:00'));
    expect(sleepPattern(shifts, { nowTs: at(TODAY, '20:00') }).daySleeper).toBe(true);
  });

  test('naps and ignored mis-starts never shape the schedule', () => {
    const noisy = [...fourWeeks, { ...night(TODAY, '14:00', '15:00'), nap: true }, { ...night(addDays(TODAY, -1), '03:00', '03:10'), ignoredFromScore: true }];
    expect(sleepPattern(noisy, { nowTs: at(TODAY, '16:00') }).nights).toBe(fourWeeks.length);
  });

  test('suggested bedtime aims for tomorrow\'s learned wake time', () => {
    const r = recommend(fourWeeks, { age: 30 }, 0, { pattern: p, wakeDate: '2026-10-25' }); // Sunday
    expect(r.recWake).toBe(hmToMin('09:30'));
    const w = recommend(fourWeeks, { age: 30 }, 0, { pattern: p, wakeDate: '2026-10-26' }); // Monday
    expect(w.recWake).toBe(hmToMin('07:00'));
  });
});

describe('regularity (SRI)', () => {
  test('identical nights are perfectly regular', () => {
    const same = Array.from({ length: 10 }, (_, i) => night(addDays(TODAY, -i), '23:00', '07:00'));
    const r = sleepRegularity(same, { nowTs: NOW });
    expect(r.sri).toBe(100);
    expect(r.label).toBe('Very regular');
    expect(r.bedSdMin).toBe(0);
  });

  test('a shifting schedule scores lower', () => {
    const wobbly = Array.from({ length: 10 }, (_, i) => i % 2 ? night(addDays(TODAY, -i), '21:30', '05:30') : night(addDays(TODAY, -i), '02:00', '10:00'));
    const r = sleepRegularity(wobbly, { nowTs: at(TODAY, '11:00') });
    expect(r.sri).toBeLessThan(50);
  });

  test('missing nights are skipped, not counted as awake', () => {
    const gappy = [0, 1, 2, 3, 6, 7].map((i) => night(addDays(TODAY, -i), '23:00', '07:00'));
    const r = sleepRegularity(gappy, { nowTs: NOW });
    expect(r.pairs).toBe(4);
    expect(r.sri).toBe(100);
  });

  test('not enough consecutive nights → unknown', () => {
    expect(sleepRegularity([night(TODAY, '23:00', '07:00')], { nowTs: NOW }).sri).toBeNull();
  });
});

describe('trends and goal progress', () => {
  test('last week vs the month', () => {
    const month = Array.from({ length: 28 }, (_, i) => i < 7 ? night(addDays(TODAY, -i), '00:30', '07:00') : night(addDays(TODAY, -i), '23:00', '07:00'));
    const t = sleepTrends(month, { nowTs: NOW });
    expect(t.bedShiftMin).toBeGreaterThan(0);          // later bedtimes lately
    expect(t.durationDeltaMin).toBeLessThan(0);        // and shorter nights
  });

  test('goal progress counts met nights and the current streak; naps add to the day', () => {
    const week = [
      night(addDays(TODAY, -3), '23:00', '06:00'),        // 6h50 — short
      night(addDays(TODAY, -2), '23:00', '07:30'),
      night(addDays(TODAY, -1), '23:00', '06:30'),
      { ...night(addDays(TODAY, -1), '14:00', '15:00'), nap: true, id: 'nap' }, // + nap → met
      night(TODAY, '23:00', '07:20'),
    ];
    const g = sleepGoalProgress(week, { nowTs: NOW, needMin: 465 });
    expect(g.nights).toBe(4);
    expect(g.metNights).toBe(3);
    expect(g.streak).toBe(3);
  });
});

describe('morning check-in', () => {
  const p = sleepPattern(fourWeeks.slice(0, -1), { nowTs: NOW });
  const history = fourWeeks.slice(0, -1); // last night missing

  test('Apple Health or own log for last night → nothing to ask', () => {
    expect(likelySleepPeriod({ logs: fourWeeks, pattern: p, nowTs: NOW })).toBeNull();
    const own = [...history, night(TODAY, '01:00', '09:00', { source: 'manual' })];
    expect(likelySleepPeriod({ logs: own, pattern: p, nowTs: NOW })).toBeNull();
  });

  test('phone estimate → confirm it; confirmed or edited → nothing', () => {
    const est = night(TODAY, '01:10', '09:05', { source: 'phone_estimate' });
    const c = likelySleepPeriod({ logs: [...history, est], pattern: p, nowTs: NOW });
    expect(c.kind).toBe('confirm');
    expect(c.log.id).toBe(est.id);
    expect(likelySleepPeriod({ logs: [...history, { ...est, userConfirmed: true }], pattern: p, nowTs: NOW })).toBeNull();
    expect(likelySleepPeriod({ logs: [...history, { ...est, edited: true }], pattern: p, nowTs: NOW })).toBeNull();
  });

  test('nothing recorded → suggest the usual schedule for that weekday, after its wake time', () => {
    const s = likelySleepPeriod({ logs: history, pattern: p, nowTs: NOW }); // Saturday 09:30
    expect(s.kind).toBe('suggest');
    expect(s.basis).toBe('free');
    expect(s.wakeTs).toBe(at(TODAY, '09:30'));
    expect(s.bedTs).toBe(at(TODAY, '01:00'));
    expect(likelySleepPeriod({ logs: history, pattern: p, nowTs: at(TODAY, '08:00') })).toBeNull(); // not up yet by habit
  });

  test('never invents a night without a learned pattern', () => {
    expect(likelySleepPeriod({ logs: [], pattern: sleepPattern([], { nowTs: NOW }), nowTs: NOW })).toBeNull();
  });

  test('a logged sleep in that window blocks the guess', () => {
    const napOverlap = [...history, { id: 'x', bedtime: at(TODAY, '03:00'), waketime: at(TODAY, '05:00'), durationMin: 120, nap: true }];
    expect(likelySleepPeriod({ logs: napOverlap, pattern: p, nowTs: NOW })).toBeNull();
  });
});

describe('Sprig day boundary', () => {
  const mainAt = (bedTs, wakeTs) => ({ bedtime: bedTs, waketime: wakeTs, durationMin: (wakeTs - bedTs) / 60000 });

  test('normal sleeper: day starts at wake; late night still belongs to it', () => {
    const l = mainAt(at('2026-10-23', '23:30'), at(TODAY, '07:00'));
    expect(sprigDateFor(at(TODAY, '06:30'), mainAt(at('2026-10-22', '23:30'), at('2026-10-23', '07:00')))).toBe(TODAY); // not synced yet → 04:00 rule
    expect(sprigDateFor(at(TODAY, '07:05'), l)).toBe(TODAY);
    expect(sprigDateFor(at('2026-10-25', '01:30'), l)).toBe(TODAY);   // after midnight, before sleeping
  });

  test('no sleep logged yet → 04:00 fallback', () => {
    expect(sprigDateFor(at(TODAY, '03:59'), null)).toBe('2026-10-23');
    expect(sprigDateFor(at(TODAY, '04:01'), null)).toBe(TODAY);
  });

  test('late riser waking at noon still starts the day at wake', () => {
    expect(sprigDateFor(at(TODAY, '12:30'), mainAt(at(TODAY, '03:00'), at(TODAY, '12:00')))).toBe(TODAY);
  });

  test('night shift: no reset at 04:00 in the middle of the shift', () => {
    const slept = mainAt(at(TODAY, '08:00'), at(TODAY, '15:00'));
    expect(sprigDateFor(at('2026-10-25', '05:00'), slept, 'after-wake', { daySleeper: true })).toBe(TODAY);
    expect(sprigDateFor(at('2026-10-25', '05:00'), slept, 'after-wake', { daySleeper: false })).toBe('2026-10-25');
  });

  test('naps and short sleeps never move the day; midnight mode is plain calendar', () => {
    expect(sprigDateFor(at(TODAY, '16:00'), { ...mainAt(at(TODAY, '14:00'), at(TODAY, '15:30')), nap: true })).toBe(TODAY);
    expect(sprigDateFor(at('2026-10-25', '02:00'), mainAt(at(TODAY, '20:00'), at(TODAY, '21:00')))).toBe(TODAY);
    expect(sprigDateFor(at('2026-10-25', '02:00'), null, 'midnight')).toBe('2026-10-25');
  });
});
