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
