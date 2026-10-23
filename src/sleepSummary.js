// Bridge to the native SleepSummary plugin (ios/App/App/SleepSummaryPlugin.swift).
// Hands sleep need, debt and the morning-notification setting to the widget and the native
// background sync through the App Group. No-op on web and Android.
import { registerPlugin } from "@capacitor/core";

const SleepSummary = registerPlugin("SleepSummary");

let lastSent = "";

export async function pushSleepSummary({ needMin, debtMin, notify }) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.getPlatform() !== "ios") return;
    const payload = { needMin: Math.round(needMin || 480), debtMin: Math.round(debtMin || 0), notify: notify !== false };
    const key = JSON.stringify(payload);
    if (key === lastSent) return; // only when something changed
    await SleepSummary.update(payload);
    lastSent = key;
  } catch (e) {
    console.warn("[sleep-summary] update failed:", e?.message);
  }
}
