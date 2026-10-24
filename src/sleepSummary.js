// Bridge to the native SleepSummary plugin (ios/App/App/SleepSummaryPlugin.swift).
// - pushSleepSummary: hands sleep need, debt, usual sleep midpoint and the morning-notification
//   setting to the widget and the native background sync (App Group).
// - Motion & Fitness: permission + Core Motion movement history for the phone-only estimate.
// Everything is a no-op off iOS.
import { registerPlugin } from "@capacitor/core";

const SleepSummary = registerPlugin("SleepSummary");

async function isIOS() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.getPlatform() === "ios";
  } catch { return false; }
}

let lastSent = "";

export async function pushSleepSummary({ needMin, debtMin, notify, usualMidMin }) {
  try {
    if (!(await isIOS())) return;
    const payload = { needMin: Math.round(needMin || 480), debtMin: Math.round(debtMin || 0), notify: notify !== false };
    if (Number.isFinite(usualMidMin)) payload.usualMidMin = Math.round(usualMidMin);
    const key = JSON.stringify(payload);
    if (key === lastSent) return; // only when something changed
    await SleepSummary.update(payload);
    lastSent = key;
  } catch (e) {
    console.warn("[sleep-summary] update failed:", e?.message);
  }
}

// "authorized" | "denied" | "restricted" | "notDetermined" | "unavailable"
export async function requestMotionPermission() {
  try {
    if (!(await isIOS())) return "unavailable";
    const res = await SleepSummary.requestMotion();
    return res?.status || "unavailable";
  } catch (e) {
    console.warn("[sleep-summary] motion permission failed:", e?.message);
    return "unavailable";
  }
}

// Movement intervals [{ s, e }] (ms) from Core Motion history (iOS keeps about a week).
export async function getMotionActive(days = 7) {
  try {
    if (!(await isIOS())) return { status: "unavailable", active: [] };
    const res = await SleepSummary.motionActive({ days });
    return { status: res?.status || "unavailable", active: Array.isArray(res?.active) ? res.active : [] };
  } catch (e) {
    console.warn("[sleep-summary] motion read failed:", e?.message);
    return { status: "unavailable", active: [] };
  }
}

// ── Wake-up alarm (docs/sleep-intelligence.md) ─────────────────────────────────
// iOS 26+: real system alarms through AlarmKit (ring with Vitae closed and the phone locked).
// Older iOS or no AlarmKit permission: a weekly backup notification at the same time — one
// sound, not an alarm — and the app says so. The in-app smart window still needs Vitae open.
// Returns "system" | "notification" | "off" | "none" (not iOS) | "failed".
const BACKUP_IDS = [130, 131, 132, 133, 134, 135, 136]; // one per weekday, 0 = Sunday

async function setBackupNotifications({ hour, minute, days, skipToday }) {
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: BACKUP_IDS.map((id) => ({ id })) }).catch(() => {});
    if (!days) return true;
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return false;
    const today = new Date().getDay();
    const notifications = days.filter((d) => d >= 0 && d <= 6 && !(skipToday && d === today)).map((d) => ({
      id: BACKUP_IDS[d], title: "Time to get up ☀️", body: "Your Vitae wake-up time.",
      schedule: { on: { weekday: d + 1, hour, minute }, allowWhileIdle: true },
    }));
    if (notifications.length) await LocalNotifications.schedule({ notifications });
    return true;
  } catch (e) {
    console.warn("[alarm] backup notification failed:", e?.message);
    return false;
  }
}

export async function syncWakeAlarm({ enabled, latest, days, skipToday = false }) {
  try {
    if (!(await isIOS())) return "none";
    const [hour, minute] = String(latest || "07:00").split(":").map(Number);
    const weekdays = Array.isArray(days) && days.length ? days : [1, 2, 3, 4, 5];
    if (!enabled) {
      await SleepSummary.cancelWakeAlarms().catch(() => {});
      await setBackupNotifications({ days: null });
      return "off";
    }
    let status = (await SleepSummary.alarmStatus().catch(() => null))?.status || "unsupported";
    if (status === "notDetermined") status = (await SleepSummary.requestAlarm().catch(() => null))?.status || status;
    if (status === "authorized") {
      const res = await SleepSummary.setWakeAlarms({ hour, minute, weekdays, skipToday });
      if ((res?.scheduled || 0) > 0 || (skipToday && weekdays.length === 1)) {
        await setBackupNotifications({ days: null });
        return "system";
      }
    }
    return (await setBackupNotifications({ hour, minute, days: weekdays, skipToday })) ? "notification" : "failed";
  } catch (e) {
    console.warn("[alarm] sync failed:", e?.message);
    return "failed";
  }
}
