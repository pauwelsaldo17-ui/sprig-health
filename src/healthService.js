// Health platform integration — Apple HealthKit (iOS) + Health Connect (Android)
// via @capgo/capacitor-health (Capacitor 8, Swift Package Manager).
// Gracefully no-ops when permissions are not granted or the platform is unsupported.
// Never log raw health values or tokens — only error messages.

import { Health } from "@capgo/capacitor-health";
import { healthSleepSessions, stepActiveIntervals } from "./utils/vitaeCalc.js";
import { getMotionActive } from "./sleepSummary.js";

const READ_TYPES = [
  "steps", "calories", "basalCalories", "weight", "sleep",
  "restingHeartRate", "heartRateVariability", "workouts",
];

async function isNative() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch { return false; }
}

async function platform() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.getPlatform(); // "ios" | "android" | "web"
  } catch { return "web"; }
}

const iso = (ts) => new Date(ts).toISOString();
const dayKey = (ts) => new Date(ts).toLocaleDateString("en-CA");

// Local-midnight start `days` days ago, so day buckets line up with local calendar days.
function startOfDayAgo(days) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - days);
  return d.getTime();
}

// Daily totals/averages via HealthKit statistics queries (de-duplicates iPhone + Watch).
async function readDaily(dataType, days, aggregation) {
  const byDay = {};
  try {
    const res = await Health.queryAggregated({
      dataType, bucket: "day", aggregation,
      startDate: iso(startOfDayAgo(days - 1)), endDate: iso(Date.now()),
    });
    for (const b of res.samples || []) {
      const v = b.values?.[aggregation] ?? b.value;
      if (Number.isFinite(v) && v > 0) byDay[dayKey(Date.parse(b.startDate))] = v;
    }
  } catch (e) { console.warn(`[health] ${dataType} read failed:`, e?.message); }
  return byDay;
}

async function readSamples(dataType, days, limit) {
  try {
    const res = await Health.readSamples({
      dataType, startDate: iso(Date.now() - days * 864e5), endDate: iso(Date.now()), limit, ascending: true,
    });
    return res.samples || [];
  } catch (e) { console.warn(`[health] ${dataType} read failed:`, e?.message); return []; }
}

// Per-day sum/average computed from raw samples — for types Health Connect can't aggregate
// (HRV, basal calories). HealthKit HRV is SDNN in ms.
async function readDailyFromSamples(dataType, days, mode, limit = 2000) {
  const acc = {};
  for (const s of await readSamples(dataType, days, limit)) {
    if (!Number.isFinite(s.value)) continue;
    const d = dayKey(Date.parse(s.startDate));
    (acc[d] = acc[d] || []).push(s.value);
  }
  const out = {};
  Object.entries(acc).forEach(([d, v]) => {
    const sum = v.reduce((a, b) => a + b, 0);
    out[d] = mode === "sum" ? sum : sum / v.length;
  });
  return out;
}

async function readWeights(days) {
  const byDay = {};
  for (const s of await readSamples("weight", days, 200)) {
    const kg = s.value;
    const d = dayKey(Date.parse(s.startDate));
    if (kg > 20 && kg < 500) byDay[d] = { date: d, kg: +kg.toFixed(2) };
  }
  return Object.values(byDay); // latest per day (samples ascending)
}

// Returns { sessions, samples (count), error } — the counts feed the Sleep tab's sync status
// so "no sleep in Apple Health" and "read failed" can be told apart.
async function readSleep(days) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    // A night can have a few hundred stage segments per source; allow ~150 per day, 5000 minimum.
    const res = await Health.readSamples({
      dataType: "sleep", startDate: iso(Date.now() - days * 864e5), endDate: iso(Date.now()), limit: Math.max(5000, days * 150), ascending: true,
    });
    const samples = res.samples || [];
    return { sessions: healthSleepSessions(samples).map((s) => ({ ...s, timezone: tz })), samples: samples.length, error: false };
  } catch (e) {
    console.warn("[health] sleep read failed:", e?.message);
    return { sessions: [], samples: 0, error: true };
  }
}

async function readWorkouts(days) {
  try {
    const res = await Health.queryWorkouts({
      startDate: iso(Date.now() - days * 864e5), endDate: iso(Date.now()), limit: 200, ascending: true,
    });
    return res.workouts || [];
  } catch (e) { console.warn("[health] workouts read failed:", e?.message); return []; }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function isHealthAvailable() {
  if (!(await isNative())) return false;
  const p = await platform();
  if (p !== "ios" && p !== "android") return false;
  try { return !!(await Health.isAvailable()).available; } catch { return false; }
}

export async function requestHealthPermissions() {
  if (!(await isHealthAvailable())) return false;
  try {
    // HealthKit never reveals read denials; Health Connect does. Either way, reads of
    // denied types just come back empty, so the app keeps working.
    await Health.requestAuthorization({ read: READ_TYPES, write: [] });
    return true;
  } catch (e) { console.warn("[health] permission error:", e?.message); return false; }
}

// steps / activeKcal / basalKcal / restingHr / hrv: { "YYYY-MM-DD": number } (calendar days)
// weights: [{ date, kg }] · sleep: [{ bedTs, wakeTs, asleepMin, awakeMin, stages, nap, timezone }]
// workouts: raw plugin workouts (mapped to sport sessions in App.jsx)
// stepActive / motionActive: [{ s, e }] ms intervals when the phone moved (for the phone estimate)
// meta: { sleepSamples, sleepError, motionStatus } — counts/status only, for the Sleep tab
// sleepDays: how far back to read sleep (see sleepBackfillDays) so nights are never missed.
export async function syncHealthData({ sleepDays = 14 } = {}) {
  const result = { steps: null, activeKcal: {}, basalKcal: {}, weights: [], sleep: [], restingHr: {}, hrv: {}, workouts: [], stepActive: [], motionActive: [], meta: {} };
  if (!(await isHealthAvailable())) return result;
  try {
    const sl = await readSleep(sleepDays);
    result.sleep = sl.sessions;
    result.meta = { sleepSamples: sl.samples, sleepError: sl.error };
    // Phone-only sleep (no wearable): when the phone moved — step samples + Core Motion history.
    // Times only; App.jsx turns the still gaps into nights (phoneSleepNights).
    result.stepActive = stepActiveIntervals(await readSamples("steps", Math.max(14, sleepDays), Math.max(20000, sleepDays * 400)));
    const motion = await getMotionActive(7);
    result.motionActive = motion.active;
    result.meta.motionStatus = motion.status;
    result.steps = await readDaily("steps", 7, "sum");
    result.activeKcal = await readDaily("calories", 7, "sum");
    result.basalKcal = await readDaily("basalCalories", 7, "sum");
    if (!Object.keys(result.basalKcal).length) result.basalKcal = await readDailyFromSamples("basalCalories", 7, "sum", 5000);
    result.restingHr = await readDaily("restingHeartRate", 14, "average");
    result.hrv = await readDailyFromSamples("heartRateVariability", 14, "average");
    result.weights = await readWeights(30);
    result.workouts = await readWorkouts(14);
  } catch (e) {
    console.warn("[health] sync error:", e?.message);
  }
  return result;
}
