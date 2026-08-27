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

const HK_READ = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierBodyMass",
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKCategoryTypeIdentifierSleepAnalysis",
];
const HK_WRITE = [
  "HKQuantityTypeIdentifierBodyMass",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
];

async function hkPlugin() {
  const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
  return CapacitorHealthkit;
}

async function requestAppleHealth() {
  const hk = await hkPlugin();
  await hk.requestAuthorization({ all: [], read: HK_READ, write: HK_WRITE });
  return true;
}

async function readAppleHealthSteps(days = 7) {
  const hk = await hkPlugin();
  const end = new Date(); const start = new Date(end - days * 864e5);
  const res = await hk.queryHKitSampleType({
    sampleName: "stepCount",
    startDate: start.toISOString(), endDate: end.toISOString(), limit: 0,
  });
  // Sum by calendar day
  const byDay = {};
  (res.resultData || []).forEach((s) => {
    const d = s.startDate?.slice(0, 10);
    if (d) byDay[d] = (byDay[d] || 0) + (s.quantity || 0);
  });
  return byDay; // { "YYYY-MM-DD": steps }
}

async function readAppleHealthWeight(days = 30) {
  const hk = await hkPlugin();
  const end = new Date(); const start = new Date(end - days * 864e5);
  const res = await hk.queryHKitSampleType({
    sampleName: "bodyMass",
    startDate: start.toISOString(), endDate: end.toISOString(), limit: 30,
  });
  return (res.resultData || []).map((s) => ({
    date: s.startDate?.slice(0, 10),
    kg: s.quantity, // HealthKit stores in kg
  })).filter((s) => s.date && s.kg);
}

async function readAppleHealthSleep(days = 14) {
  const hk = await hkPlugin();
  const end = new Date(); const start = new Date(end - days * 864e5);
  const res = await hk.queryHKitSampleType({
    sampleName: "sleepAnalysis",
    startDate: start.toISOString(), endDate: end.toISOString(), limit: 0,
  });
  return (res.resultData || []).map((s) => ({
    bedTs: new Date(s.startDate).getTime(),
    wakeTs: new Date(s.endDate).getTime(),
    durationMin: Math.round((new Date(s.endDate) - new Date(s.startDate)) / 60000),
    source: "apple_health",
  })).filter((s) => s.durationMin > 60);
}

// ── Android Health Connect ────────────────────────────────────────────────────

const HC_READ = ["Steps", "Weight", "SleepSession", "ActiveCaloriesBurned", "HeartRate"];
const HC_WRITE = ["Weight", "ActiveCaloriesBurned"];

async function hcPlugin() {
  const { HealthConnect } = await import("capacitor-health-connect");
  return HealthConnect;
}

async function requestAndroidHealth() {
  const hc = await hcPlugin();
  await hc.requestHealthPermissions({ read: HC_READ, write: HC_WRITE });
  return true;
}

async function readAndroidSteps(days = 7) {
  const hc = await hcPlugin();
  const end = new Date(); const start = new Date(end - days * 864e5);
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
    }
  } catch (e) {
    console.warn("[health] sync error:", e?.message);
  }
  return result;
}
