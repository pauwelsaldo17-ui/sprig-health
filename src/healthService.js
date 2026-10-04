// Health platform integration — Apple HealthKit (iOS) + Health Connect (Android)
// Gracefully no-ops when permissions are not granted or the platform is unsupported.

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

// ── Apple HealthKit (iOS) ─────────────────────────────────────────────────────
// Requires @perfood/capacitor-healthkit + HealthKit entitlements in Xcode.
// Until the iOS build has those entitlements these are safe stubs.

async function hkPlugin() {
  try {
    const mod = await import("@perfood/capacitor-healthkit");
    return mod.CapacitorHealthkit ?? mod.default ?? null;
  } catch { return null; }
}

async function requestAppleHealth() {
  const hk = await hkPlugin();
  if (!hk) return false;
  try {
    await hk.requestAuthorization({
      all: [],
      read: ["steps", "weight", "sleep_analysis"],
      write: [],
    });
    return true;
  } catch { return false; }
}

async function readAppleHealthSteps(days = 7) {
  const hk = await hkPlugin();
  if (!hk) return {};
  const byDay = {};
  const end = new Date();
  const start = new Date(end - days * 864e5);
  try {
    const res = await hk.queryHKitSampleType({
      sampleName: "stepCount",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 1000,
    });
    for (const r of res.resultData || []) {
      const d = new Date(r.startDate).toLocaleDateString("en-CA");
      byDay[d] = (byDay[d] || 0) + (r.value || 0);
    }
  } catch { /* permission not granted or unavailable */ }
  return byDay;
}

async function readAppleHealthWeight(days = 30) {
  const hk = await hkPlugin();
  if (!hk) return [];
  const results = [];
  const end = new Date();
  const start = new Date(end - days * 864e5);
  try {
    const res = await hk.queryHKitSampleType({
      sampleName: "bodyMass",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 100,
    });
    for (const r of res.resultData || []) {
      const d = new Date(r.startDate).toLocaleDateString("en-CA");
      // HealthKit returns bodyMass in kg
      results.push({ date: d, kg: +(r.value || 0).toFixed(2) });
    }
  } catch { /* permission not granted */ }
  // Latest value per day
  const byDay = {};
  for (const w of results) byDay[w.date] = w;
  return Object.values(byDay);
}

async function readAppleHealthSleep(days = 14) {
  const hk = await hkPlugin();
  if (!hk) return [];
  const results = [];
  const end = new Date();
  const start = new Date(end - days * 864e5);
  try {
    const res = await hk.queryHKitSampleType({
      sampleName: "sleepAnalysis",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 200,
    });
    // Merge overlapping asleep segments into sessions
    const asleep = (res.resultData || []).filter((r) => r.value === 1 || r.value === "ASLEEP");
    const sessions = mergeIntoSessions(asleep);
    for (const s of sessions) {
      results.push({
        bedTs: new Date(s.startDate).getTime(),
        wakeTs: new Date(s.endDate).getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  } catch { /* permission not granted */ }
  return results;
}

// Merge overlapping/adjacent sleep segments into single sessions (gap < 30 min ignored).
function mergeIntoSessions(segments) {
  if (!segments.length) return [];
  const sorted = [...segments].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const sessions = [{ startDate: sorted[0].startDate, endDate: sorted[0].endDate }];
  for (let i = 1; i < sorted.length; i++) {
    const last = sessions[sessions.length - 1];
    const gapMs = new Date(sorted[i].startDate) - new Date(last.endDate);
    if (gapMs < 30 * 60 * 1000) {
      // Extend the current session
      if (new Date(sorted[i].endDate) > new Date(last.endDate)) last.endDate = sorted[i].endDate;
    } else {
      sessions.push({ startDate: sorted[i].startDate, endDate: sorted[i].endDate });
    }
  }
  return sessions;
}

// ── Android Health Connect ────────────────────────────────────────────────────

const HC_READ = ["Steps", "Weight", "SleepSession", "ActiveCaloriesBurned", "HeartRate"];
const HC_WRITE = ["Weight", "ActiveCaloriesBurned"];

async function hcPlugin() {
  let HealthConnect = null;
  try {
    const mod = await import("capacitor-health-connect");
    HealthConnect = mod.HealthConnect ?? mod.default ?? null;
  } catch (_) {
    // Not available on web
  }
  return HealthConnect;
}

async function requestAndroidHealth() {
  const hc = await hcPlugin();
  if (!hc) return false;
  await hc.requestHealthPermissions({ read: HC_READ, write: HC_WRITE });
  return true;
}

async function readAndroidSteps(days = 7) {
  const hc = await hcPlugin();
  if (!hc) return {};
  const end = new Date();
  const start = new Date(end - days * 864e5);
  const byDay = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 864e5);
    const dayEnd = new Date(d.getTime() + 864e5);
    try {
      const res = await hc.readRecords({
        type: "Steps",
        timeRangeFilter: { operator: "between", startTime: d.toISOString(), endTime: dayEnd.toISOString() },
      });
      const total = (res.records || []).reduce((sum, r) => sum + (r.count || 0), 0);
      if (total > 0) byDay[d.toLocaleDateString("en-CA")] = total;
    } catch { /* skip day */ }
  }
  return byDay;
}

async function readAndroidWeight(days = 30) {
  const hc = await hcPlugin();
  if (!hc) return [];
  const end = new Date();
  const start = new Date(end - days * 864e5);
  const results = [];
  try {
    const res = await hc.readRecords({
      type: "Weight",
      timeRangeFilter: { operator: "between", startTime: start.toISOString(), endTime: end.toISOString() },
    });
    for (const r of res.records || []) {
      const d = new Date(r.time || r.startTime).toLocaleDateString("en-CA");
      const kg = r.weight?.inKilograms ?? r.weightKg ?? null;
      if (kg && kg > 20 && kg < 500) results.push({ date: d, kg: +kg.toFixed(2) });
    }
  } catch { /* permission not granted */ }
  // Latest per day
  const byDay = {};
  for (const w of results) byDay[w.date] = w;
  return Object.values(byDay);
}

async function readAndroidSleep(days = 14) {
  const hc = await hcPlugin();
  if (!hc) return [];
  const end = new Date();
  const start = new Date(end - days * 864e5);
  const results = [];
  try {
    const res = await hc.readRecords({
      type: "SleepSession",
      timeRangeFilter: { operator: "between", startTime: start.toISOString(), endTime: end.toISOString() },
    });
    for (const r of res.records || []) {
      results.push({
        bedTs: new Date(r.startTime).getTime(),
        wakeTs: new Date(r.endTime).getTime(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  } catch { /* permission not granted */ }
  return results;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function isHealthAvailable() {
  if (!(await isNative())) return false;
  const p = await platform();
  return p === "ios" || p === "android";
}

export async function requestHealthPermissions() {
  const p = await platform();
  if (p === "ios") return requestAppleHealth();
  if (p === "android") return requestAndroidHealth();
  return false;
}

export async function syncHealthData() {
  const p = await platform();
  const result = { steps: null, weights: [], sleep: [] };
  try {
    if (p === "ios") {
      result.steps = await readAppleHealthSteps(7);
      result.weights = await readAppleHealthWeight(30);
      result.sleep = await readAppleHealthSleep(14);
    } else if (p === "android") {
      result.steps = await readAndroidSteps(7);
      result.weights = await readAndroidWeight(30);
      result.sleep = await readAndroidSleep(14);
    }
  } catch (e) {
    console.warn("[health] sync error:", e?.message);
  }
  return result;
}
