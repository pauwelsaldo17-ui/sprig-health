// Smart local notifications — on-device, no server required.
// All scheduling is cancel-then-reschedule so each foreground open reflects
// the user's current state. Silently no-ops on web.

import { dayTotals, recommend, tonightPlan, sleepNeedMin, sleepDebtMin } from './utils/vitaeCalc.js';

const ID_NUTRITION = 1001;
const ID_WINDDOWN  = 1002;
const ID_WORKOUT   = 1003;
const WORKOUT_DEDUP_KEY = 'vitae_workout_notif_date';

async function getLocalNotifications() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return null;
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications;
  } catch { return null; }
}

// "HH:MM" → { h, m } or null
function parseHM(str) {
  if (typeof str !== 'string') return null;
  const [h, m] = str.split(':').map(Number);
  return (isNaN(h) || isNaN(m)) ? null : { h, m };
}

// Return a Date for today at h:m. If that moment is already past, return tomorrow.
function nextOccurrence(h, m) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

// ── Public: call once after the user authenticates ────────────────────────────

export async function requestNotificationPermissions() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.requestPermissions();
  } catch {}
}

// ── Public: call on mount + every foreground resume ───────────────────────────
// appState shape: { entries, workouts, sleepLogs, profile, targets,
//                  trackingPrefs, date, quickLog, trainedToday }

export async function scheduleSmartNotifications(appState) {
  if (!appState) return;
  const ln = await getLocalNotifications();
  if (!ln) return;

  const {
    entries = [],
    workouts = [],
    sleepLogs = [],
    profile,
    targets,
    date,
    quickLog,
    trainedToday,
  } = appState;

  await Promise.allSettled([
    nutritionReminder(ln, entries, targets),
    windDownReminder(ln, sleepLogs, profile),
    workoutNudge(ln, workouts, profile, date, quickLog, trainedToday),
  ]);
}

// ── 1. Nutrition reminder — 20:00 if < 1200 kcal logged ──────────────────────

async function nutritionReminder(ln, entries, targets) {
  try {
    const kcal = dayTotals(entries).calories;
    await ln.cancel({ notifications: [{ id: ID_NUTRITION }] }).catch(() => {});
    if (kcal >= 1200) return;
    await ln.schedule({
      notifications: [{
        id: ID_NUTRITION,
        title: 'Dinner check-in',
        body: "You haven't logged dinner yet — tap to log your meal.",
        schedule: { at: nextOccurrence(20, 0) },
        extra: null,
      }],
    });
  } catch {}
}

// ── 2. Wind-down reminder — 90 min before target bedtime ─────────────────────

async function windDownReminder(ln, sleepLogs, profile) {
  try {
    await ln.cancel({ notifications: [{ id: ID_WINDDOWN }] }).catch(() => {});
    if (!profile?.age) return;

    const need = sleepNeedMin(profile.age);
    const debt = sleepDebtMin(sleepLogs, need);
    const rec  = recommend(sleepLogs, profile, debt);
    const plan = tonightPlan({ sleepInfo: { rec, debtMin: debt } });
    if (!plan) return;

    const bed = parseHM(plan.targetBed);
    if (!bed) return;

    // Subtract 90 min, wrap around midnight
    const totalMin = ((bed.h * 60 + bed.m - 90) % 1440 + 1440) % 1440;
    const nh = Math.floor(totalMin / 60);
    const nm = totalMin % 60;

    await ln.schedule({
      notifications: [{
        id: ID_WINDDOWN,
        title: 'Wind-down time',
        body: `Screens off by ${plan.blueCutoff}, bed by ${plan.targetBed}.`,
        schedule: { at: nextOccurrence(nh, nm) },
        extra: null,
      }],
    });
  } catch {}
}

// ── 3. Workout nudge — once per day after 17:00 if no session logged ──────────

async function workoutNudge(ln, workouts, profile, date, quickLog, trainedToday) {
  try {
    const today = new Date().toLocaleDateString('en-CA');
    if (localStorage.getItem(WORKOUT_DEDUP_KEY) === today) return;

    // Skip for sedentary-loss goal (not expected to train)
    const goal     = profile?.goal;
    const activity = profile?.activity;
    if (goal === 'lose' && (!activity || activity === 'sedentary')) return;

    // Only prompt after 17:00
    if (new Date().getHours() < 17) return;

    // Already trained
    if (trainedToday) return;

    await ln.cancel({ notifications: [{ id: ID_WORKOUT }] }).catch(() => {});
    await ln.schedule({
      notifications: [{
        id: ID_WORKOUT,
        title: 'Still time for a workout',
        body: 'Still time for a session today 💪',
        schedule: { at: new Date(Date.now() + 3000) },
        extra: null,
      }],
    });

    localStorage.setItem(WORKOUT_DEDUP_KEY, today);
  } catch {}
}
