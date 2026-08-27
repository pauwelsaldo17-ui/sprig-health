import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Camera, ScanLine, PencilLine, Home, BookMarked, TrendingUp, User,
  Plus, Check, X, Loader2, Sparkles, Trash2, Minus, RotateCcw, Flame, Pill,
  Moon, Sun, BedDouble, AlarmClock, Dumbbell, EyeOff, Zap, Clock, Coffee,
  Activity, MoonStar, ChevronRight, Mic, MicOff,
  Timer, Trophy, Medal, BarChart3, ChevronLeft, ChevronDown, Award, Crown,
  Target, BookOpen, Calculator, Repeat, Gauge, Pause, Play, PersonStanding, Square,
  ArrowUp, HeartPulse, Search, TrendingDown,
  Cloud, CloudUpload, CloudDownload, LogOut, LogIn, Mail, SlidersHorizontal, Volume2,
  Archive, Bell, Ruler, Settings, Droplets, AlertCircle, WifiOff, Barcode
} from "lucide-react";
import { openDB } from "idb";
import { getSupabase, supabaseConfigured } from "./supabaseClient.js";
import { rcConfigured, hasPremium, getOfferings, purchasePackage } from "./revenueCatClient.js";
import AuthScreen from "./screens/AuthScreen.jsx";
import GDPRScreen from "./screens/GDPRScreen.jsx";
import PrivacyScreen from "./screens/PrivacyScreen.jsx";
import TermsScreen from "./screens/TermsScreen.jsx";
import TrainTab from "./screens/TrainTab.jsx";
import BodyTab from "./screens/BodyTab.jsx";
import HealthTab, { computeHealthReport } from "./screens/HealthTab.jsx";
import MindTab from "./screens/MindTab.jsx";
import CoachTab from "./screens/CoachTab.jsx";
import MeTab, { MoreTab } from "./screens/MeTab.jsx";
import TrendsTab from "./screens/TrendsTab.jsx";
import SleepTab, { EnergyTab } from "./screens/SleepTab.jsx";
import NutritionTab, { MealsTab } from "./screens/NutritionTab.jsx";
import TodayTab from "./screens/TodayTab.jsx";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth.js";
import { C, THEMES, applyTheme } from "./theme.js";
import { Ring, MacroBar, btn, Btn, Badge, SectionHeader, EmptyState, ProgressBar, PremiumCard, GlassCard, cardStyle, solidCardStyle, sectionTitleStyle, eyebrowStyle, iconButtonStyle, pillStyle, SourceLabel, RingMetric, MetricCard, PageHeader, SubTabs, winIconFor, KudosButton, WinRow, TodayWinsCard, Legend, PerfectRecoveryCard } from "./components/ui.jsx";

// initialize theme from storage as early as possible (before first render)
try {
  const saved = (typeof window !== "undefined") && window.localStorage ? window.localStorage.getItem("sprig_theme_v1") : null;
  if (saved === "light" || saved === "dark") applyTheme(saved);
} catch (_) {}

// Register for native push notifications via Capacitor (no-op on web).
// Called once after the user is logged in. Stores the FCM/APNs token in Supabase
// so the backend can target this device. Safe to call multiple times.
async function registerPushNotifications(supabaseClient, userId) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== "granted") return;
    await PushNotifications.register();
    PushNotifications.addListener("registration", async (token) => {
      if (!supabaseClient || !userId) return;
      try {
        await supabaseClient.from("device_tokens").upsert(
          { user_id: userId, token: token.value, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
          { onConflict: "token" }
        );
      } catch (_) {}
    });
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.info("[sprig] push received:", notification.title);
    });
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.info("[sprig] push tapped:", action.notification.title);
    });
  } catch (_) {}
}

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes rise { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
@keyframes pop { 0%{transform:scale(.96);opacity:0;} 100%{transform:scale(1);opacity:1;} }
@keyframes popCentered { from{opacity:0;transform:translateX(-50%) scale(.96);} to{opacity:1;transform:translateX(-50%) scale(1);} }
@keyframes sheetUp { from { transform: translateY(18px); opacity:.6; } to { transform: translateY(0); opacity:1; } }
@keyframes dimIn { from { opacity:0; } to { opacity:1; } }
@keyframes toastUp { from { opacity:0; transform: translate(-50%, 10px); } to { opacity:1; transform: translate(-50%, 0); } }
@keyframes pulse { 0%,100%{opacity:.45;} 50%{opacity:1;} }
/* ── New Record banner — calm, premium, Hevy-style ── */
@keyframes recordToastIn {
  from { opacity:0; transform:translateY(-10px) scale(.98); }
  to   { opacity:1; transform:translateY(0)     scale(1); }
}
@keyframes recordToastOut {
  from { opacity:1; transform:translateY(0)    scale(1); }
  to   { opacity:0; transform:translateY(-6px) scale(.99); }
}
/* Food entry flash — border-glow pulse for the newly-logged meal row */
@keyframes entryFlash {
  0%   { box-shadow: 0 0 0 2px rgba(199,255,61,.85), 0 2px 12px rgba(199,255,61,.25); }
  55%  { box-shadow: 0 0 0 3px rgba(199,255,61,.55), 0 4px 20px rgba(199,255,61,.18); }
  100% { box-shadow: 0 0 0 0 rgba(199,255,61,0), 0 2px 8px rgba(0,0,0,.08); }
}
.entry-flash { animation: entryFlash 2s cubic-bezier(.4,0,.6,1) both; }
/* Apple-ish easing used consistently across the app */
.sprig-rise { animation: rise .2s cubic-bezier(.2,.8,.2,1) both; }
.sprig-pop { animation: pop .22s cubic-bezier(.2,.8,.2,1) both; }
.sprig-pop-centered { animation: popCentered .18s cubic-bezier(.2,.8,.2,1) both; }
.sprig-sheet { animation: sheetUp .26s cubic-bezier(.2,.8,.2,1) both; }
.sprig-dim { animation: dimIn .2s ease both; }
.record-toast      { animation: recordToastIn .25s cubic-bezier(.2,.8,.2,1) both; }
.record-toast-exit { animation: recordToastOut .20s cubic-bezier(.6,0,1,.8) both !important; }
.sprig-toast-anim { animation: toastUp .22s cubic-bezier(.2,.8,.2,1) both; }
.sprig-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.10) 37%, rgba(255,255,255,0.04) 63%); background-size: 400% 100%; animation: pulse 1.2s ease-in-out infinite; border-radius: 12px; }
/* Tab-switch fade+slide — keyed wrapper re-mounts on each tab change */
@keyframes tabSlideIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
.tab-enter { animation: tabSlideIn 200ms cubic-bezier(.2,.8,.2,1) both; }
/* ── Press feedback (Apple-level) ──────────────────────────────────────────
   120ms matches the Human Interface Guidelines' "immediate" window.
   will-change promotes to a GPU compositing layer so the scale is sub-frame.
   Scale 0.975 + brightness 1.08 is Apple's visual language for tap confirmation.
   ────────────────────────────────────────────────────────────────────────── */
.sprig-tap {
  transition:
    transform 120ms cubic-bezier(.2,.8,.2,1),
    background .18s ease,
    box-shadow .18s ease,
    opacity 120ms cubic-bezier(.2,.8,.2,1),
    filter 120ms cubic-bezier(.2,.8,.2,1);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  will-change: transform;          /* GPU composite layer — eliminates paint on press */
}
.sprig-tap:active { transform: scale(.975); filter: brightness(1.08); }
.sprig-cta { display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; border-radius: 14px; border: none; cursor: pointer; font-family: "DM Sans", sans-serif; }
.sprig-tap:disabled, .sprig-tap[disabled] { transform: none !important; filter: none !important; will-change: auto; opacity: 0.45; }
/* Input number spinners hidden */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { -moz-appearance: textfield; }
.sprig-scroll::-webkit-scrollbar{width:0;height:0;}
/* iOS momentum scrolling + native rubber-band (don't block overscroll on the scroll area) */
.sprig-scroll { -webkit-overflow-scrolling: touch; overscroll-behavior-y: auto; scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  .sprig-rise, .sprig-pop, .sprig-pop-centered, .sprig-sheet, .sprig-dim, .sprig-toast-anim, .tab-enter,
  .vitae-fade-up, .vitae-scale-in, .vitae-sheet-enter, .vitae-success-pulse { animation-duration: .01ms !important; }
  .record-toast, .record-toast-exit { animation-duration: .01ms !important; }
  .vitae-stagger-1,.vitae-stagger-2,.vitae-stagger-3,.vitae-stagger-4,.vitae-stagger-5 { animation-delay: 0ms !important; }
  .sprig-tap { will-change: auto; }
  .sprig-tap:active { transform: none; filter: none; }
  .sprig-scroll { scroll-behavior: auto; }
}
:root {
  --bottom-nav-height: 88px;
  --floating-cta-height: 72px;
  /* ── Type scale ─────────────────────────────────────────── */
  --text-2xs: 10px;
  --text-xs: 11px;
  --text-sm: 13px;
  --text-md: 14px;
  --text-base: 15px;
  --text-lg: 17px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  /* ── Spacing scale ──────────────────────────────────────── */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 20px;
  --sp-6: 24px;
  --sp-8: 32px;
  --sp-10: 40px;
  --sp-12: 48px;
  /* ── Layer system ──────────────────────────────────────────
     Main content:       1
     Sticky headers:     100
     Bottom nav:         1000   (--z-nav)
     Floating CTAs:      1500   (--z-cta)
     Rest timer:         1600   (--z-timer)
     Bottom sheets/
       modals/overlays:  3000   (--z-overlay / --z-modal)
     Toasts / PRs:       4000   (--z-toast)
     Debug / emergency:  5000
  ─────────────────────────────────────────────────────── */
  --z-nav: 1000;
  --z-cta: 1500;
  --z-timer: 1600;
  --z-overlay: 3000;
  --z-modal: 3000;
  --z-toast: 4000;
}
/* ── Apple-level layout foundation ──────────────────────────────────────────
   Fills the viewport, enables native scrolling, and layers the shell correctly.
   Z-index scale: content 1 · nav 1000 · floating 1500 · overlays 3000 · toasts 4000
   ──────────────────────────────────────────────────────────────────────────── */
html, body, #root {
  width: 100%;
  margin: 0;
  padding: 0;
  min-height: 100%;
  background: #07140F;
  overscroll-behavior-y: auto;
  /* prevent horizontal bounce / rubber-band on the root */
  overflow-x: hidden;
}
body { -webkit-text-size-adjust: 100%; color: #F4F7F2; }
/* App shell — centered 440px column that fills the screen.
   overflow:hidden constrains the scroll child so flex:1 gives it a real height,
   enabling overflow-y:auto to actually scroll. */
.sprig-app-frame {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  min-height: 100vh;
  min-height: 100dvh;
  padding-top: env(safe-area-inset-top, 0px);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;        /* constrains scroll child height so flex:1 produces real clipping */
}
/* Main scroll area — fills remaining height, scrolls natively, never hides last card.
   overflow-y/x are here in CSS so they don't need to be repeated inline everywhere. */
.sprig-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: auto;
  /* padding-bottom keeps the last card above the fixed nav + home-indicator gap */
  padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 72px);
}
/* Extra room when a floating CTA (Log Food) or rest timer is also visible */
.sprig-content-cta {
  padding-bottom: calc(var(--bottom-nav-height) + var(--floating-cta-height) + env(safe-area-inset-bottom, 0px) + 120px) !important;
}
/* Bottom nav — fixed to the real bottom of the viewport, centered in the 440px frame.
   Portaled to <body> so it never sits inside an overflow:hidden ancestor. */
.sprig-tabbar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
  z-index: var(--z-nav);
  padding-bottom: max(env(safe-area-inset-bottom, 0px), 8px) !important;
}
.sprig-glass { -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); }
.sprig-bottom-pad { height: calc(env(safe-area-inset-bottom, 0px) + 8px); }
/* On phones fill the whole screen — no rounded outer frame */
@media (max-width: 480px) {
  .sprig-app-frame { border-radius: 0 !important; box-shadow: none !important; }
}
input, textarea, select, button { font-family: inherit; font-size: 16px; }
input, textarea, select { color: #F4F7F2; }
input::placeholder, textarea::placeholder { color: rgba(244,247,242,0.4); }
/* Bottom-anchored toasts sit above the nav, overlays, and record animation */
.sprig-bottom-toast {
  bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 8px) !important;
  z-index: var(--z-toast) !important;
}
/* Bottom sheets respect the home-indicator gap */
.sprig-bottom-sheet {
  padding-bottom: calc(22px + env(safe-area-inset-bottom, 0px)) !important;
  max-height: 90dvh !important;
  max-height: 90vh !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
}
/* Premium global polish */
.sprig-rise > * { animation-fill-mode: both; }
.sprig-tap:active:not(:disabled) {
  transform: scale(0.972);
  transition: transform 0.08s cubic-bezier(0.22, 0.7, 0.25, 1);
}
/* Smooth scrollbar on desktop */
.sprig-content::-webkit-scrollbar { width: 3px; }
.sprig-content::-webkit-scrollbar-track { background: transparent; }
.sprig-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 99px; }
/* Hero gradient text */
.sprig-hero-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  opacity: 0.65;
  color: #fff;
}
/* Eyebrow / overline label — used as a tight uppercase section label above headers */
.sprig-eyebrow {
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px;
  text-transform: uppercase; color: rgba(244,247,242,0.52);
  font-family: "DM Sans", sans-serif; display: block; margin-bottom: 4px;
}
/* Input focus ring — subtle green outline instead of browser default */
body.modal-open { overflow: hidden !important; touch-action: none; }
input:focus, textarea:focus, select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(62,157,99,0.40);
  border-color: rgba(62,157,99,0.70) !important;
}
/* Disabled button — visually muted, no pointer */
button:disabled { opacity: 0.45; cursor: default !important; }
/* Tab bar item press state */
.sprig-nav-item:active { opacity: 0.65; transform: scale(0.94); transition: transform 90ms, opacity 90ms; }
/* PremiumCard / GlassCard consistent surface */
.sprig-surface {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 22px;
  box-shadow: 0 1px 2px rgba(0,0,0,.18), 0 10px 30px rgba(0,0,0,.28);
}
/* ── Vitae motion language ──────────────────────────────────────────────────
   A small shared set of semantic animation classes that complement sprig-*.
   Use on standalone mounted elements — sheets, result cards, action items.
   Pair with vitae-stagger-N for grouped cascades.
   ──────────────────────────────────────────────────────────────────────────── */
@keyframes vitaeFadeUp {
  from { opacity:0; transform: translateY(14px); }
  to   { opacity:1; transform: translateY(0); }
}
@keyframes vitaeScaleIn {
  from { opacity:0; transform: scale(.97) translateY(6px); }
  to   { opacity:1; transform: scale(1)   translateY(0); }
}
@keyframes vitaeSheetEnter {
  from { opacity:.42; transform: translateY(30px); }
  to   { opacity:1;   transform: translateY(0); }
}
@keyframes vitaeSuccessPulse {
  0%   { transform: scale(1); }
  38%  { transform: scale(1.016); }
  100% { transform: scale(1); }
}
.vitae-fade-up       { animation: vitaeFadeUp      260ms cubic-bezier(.22,.7,.25,1) both; }
.vitae-scale-in      { animation: vitaeScaleIn     200ms cubic-bezier(.22,.7,.25,1) both; }
.vitae-sheet-enter   { animation: vitaeSheetEnter  310ms cubic-bezier(.22,.7,.25,1) both; }
.vitae-success-pulse { animation: vitaeSuccessPulse 380ms cubic-bezier(.22,.7,.25,1) both; }
/* Stagger delay utilities — pair with any vitae-* or sprig-* animation class */
.vitae-stagger-1 { animation-delay:  60ms; }
.vitae-stagger-2 { animation-delay: 120ms; }
.vitae-stagger-3 { animation-delay: 180ms; }
.vitae-stagger-4 { animation-delay: 240ms; }
.vitae-stagger-5 { animation-delay: 300ms; }
`;

/* ---------------- storage (IndexedDB → localStorage fallback) -------------- */
// Opens IndexedDB once, migrates existing localStorage sprig_* data on the first run,
// then all reads/writes go through IndexedDB. Falls back to localStorage if IDB
// isn't available (private browsing in some browsers, very old WebViews).
const _db = (async () => {
  try {
    const db = await openDB("vitae-db", 1, {
      upgrade(d) { if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv"); },
    });
    if (typeof window !== "undefined" && window.localStorage &&
        !window.localStorage.getItem("vitae_idb_v1")) {
      const tx = db.transaction("kv", "readwrite");
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k?.startsWith("sprig_")) {
          const v = window.localStorage.getItem(k);
          if (v != null) tx.store.put(v, k);
        }
      }
      await tx.done;
      window.localStorage.setItem("vitae_idb_v1", "1");
    }
    return db;
  } catch (_) { return null; }
})();

const store = {
  async get(key) {
    const db = await _db;
    if (db) {
      const v = await db.get("kv", key);
      if (v != null) return v;
    }
    try { return window.localStorage?.getItem(key) ?? null; } catch { return null; }
  },
  async set(key, value) {
    const db = await _db;
    if (db) { await db.put("kv", value, key); return; }
    try { window.localStorage?.setItem(key, value); } catch {}
  },
  async remove(key) {
    const db = await _db;
    if (db) await db.delete("kv", key);
    try { window.localStorage?.removeItem(key); } catch {}
  },
  async delete(key) { return this.remove(key); },
  async list(prefix) {
    const out = new Set();
    const db = await _db;
    if (db) {
      const keys = await db.getAllKeys("kv");
      keys.forEach((k) => { if (!prefix || k.startsWith(prefix)) out.add(k); });
    } else {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (!prefix || k.startsWith(prefix))) out.add(k);
        }
      } catch {}
    }
    return Array.from(out);
  },
  onWriteError(fn) { return () => {}; },
};
import { todayStr, uid, safeParse, asArray, asObject, DEFAULT_DAILY, DEFAULT_ALARM, DEFAULT_HABIT_CFG, DEFAULT_REMINDERS, migrateDaily, migrateAlarm, migrateHabitCfg, migrateReminders, migrateProfile, computeTargets, stepGoal, stepsKcal, movementSummary, CARDIO_INTENSITY, SPORTS_LIBRARY, sportKcal, sportMuscleImpact, DRINK_PRESETS, cardioKcal, workoutAdjustment, calorieAdjustment, sedentaryNote, SWEAT_LEVELS, smartHydration, SPORTS, sportFields, sportAdvice, MOBILITY_ROUTINES, detectAchievements, goalTimeline, plateauDetection, patternDetection, seedDemoData, KG_TO_LB, CM_TO_IN, convW, convL, lbToKg, inToCm, EQUIPMENT, canDoWith, mealShortcuts, nextWorkoutSuggestion, calorieTrendRecommendation, GOAL_HABITS, FOCUS_HABITS, HABIT_META, suggestedHabitsFor, tonightPlan, ACTIVITY_SOURCES, searchAll, calendarDay, progressDiagnosis, MICRO_KEYS, MICRO_ALIASES, omegaNum, normalizeMicros, dayTotals, FUNCS, pct, funcScores, FOOD_SOURCES, NUTRI_LABEL, waterGoal, mealScore, dietQuality, missingNutrients, nutritionCoach, MEASURE_KEYS, PHOTO_KINDS, weightStats, weightVerdict, photoReminder, measurementStats, BLOOD_MARKERS, BLOOD_LABEL, latestHealth, bloodFlag, avgRecent, healthRiskRadar, RISK_TAG, RED_FLAGS, redFlagScan, bpRedFlag, INTERACTION_RULES, interactionFlags, PAIN_LOCATIONS, PAIN_TYPES, PAIN_LEVELS, SET_PAIN, LOADS_PART, PAIN_MODS, painLevelOf, painSummary, painAdvice, exercisePainRisk, HABIT_CATEGORIES, HABIT_SUGGESTIONS, DAY_NAMES_SHORT, daysLabel, habitWeekKey, habitPeriodKey, getHabitStatus, computeHabitStreak, computeHabitConsistencyV2, computeAutoHabitToday, migrateHabitsV1toV2, DEFAULT_HABITS, habitAutoDone, activeHabits, habitsToday, habitConsistency, FOCUS_PRESETS, DAYMIN, tsToMin, hmToMin, minToHM, minToLabel, minToHm, durLabel, circDiff, sleepNeedMin, circMean, inWindow, estimateStages, scoreSleep, sleepDebtMin, sleepDebtLabel, bedtimeReminder, recommend, sleepScoreBreakdown, ALCOHOL_LEVELS, alcoholLevel, alcoholImpact, recoveryRecommendation, calculatePerfectRecovery, gauss, energyCurve, bestGymWindow, smartWake, MUSCLES, RECOVER_BASE, EXERCISES, findEx, restDefault, est1RM, bestSetOf, weeklyVolume, applyQuickLogMuscles, SPORT_ID_ALIASES, SPORT_FALLBACK_IMPACTS, findSportDefinition, resolveSessionMuscleImpact, normalizeMovementSessionsForMuscleRecovery, muscleRecovery, STD, STD_PCT, sexFactor, avgBW, MUSCLE_LIFT, MUSCLE_LIFT_FB, TIERS, tierFor, pctFromAnchors, bestE1RMForLift, getMuscleGroupForExercise, bestE1RMForMuscle, ranking, suggestNext, exLastBest, detectSetPR, recapFor, makeWin, mergeWins, detectDayWins, detectSleepWins, detectWorkoutWins, plateLoad, warmupSets, MOBILITY_PREP, mobilityFor, recoveryColor, liftE1RMSeries, stallingLifts, deloadAdvice, detectPRs, VOLUME_TARGETS, PUSH_M, PULL_M, LEG_M, UPPER_M, volumeStatus, VOL_TAG_LABEL, VOL_TAG_COLOR, suggestSplit, progressionFor, TEMPLATES, clamp100, WATER_TARGET, STEPS_TARGET, DEFAULT_TRACKING_PREFS, migrateTrackingPrefs, dailyScores, dailyHealthScore, functionalHealth, scoreVerdict, getDailyTruth, bestActions, coachReport, weeklyReport, SCHEMA_PROMPT, resizeImage, extractJSON, analyze, analyzeText, localCoachAnswer } from "./utils/vitaeCalc.js";

/* ---------------- Sprig "day" boundary --------------
   A calendar day rolls at 00:00, which is wrong for late-night eating/drinking:
   a beer at 01:30 after a Friday night out should count as Friday. A "Sprig day"
   rolls over in the morning instead — at the user's wake time if we have a recent
   morning sleep log, otherwise at a 04:00 fallback.

   getSprigDate(now, latestSleepLog, mode):
     - mode "midnight"  → plain calendar date (old behaviour)
     - mode "fixed-4am" → always roll at 04:00
     - mode "after-wake" (default) → roll at this morning's wake time if a main
       sleep log woke up today in the morning window, else 04:00.
   Anything before the boundary counts as the previous calendar day. */
function getSprigDate(now = Date.now(), latestSleepLog = null, mode = "after-wake") {
  const d = new Date(now);
  const dayOf = (dt) => new Date(dt).toLocaleDateString("en-CA");
  if (mode === "midnight") return dayOf(d);

  let boundaryMin = 4 * 60; // 04:00 fallback
  if (mode === "after-wake" && latestSleepLog && latestSleepLog.waketime) {
    const wake = new Date(latestSleepLog.waketime);
    const sameCalDay = dayOf(wake) === dayOf(d);
    const wokeAlready = latestSleepLog.waketime <= now;
    const wMin = wake.getHours() * 60 + wake.getMinutes();
    const morningWindow = wMin >= 3 * 60 && wMin <= 11 * 60; // ignore naps that "wake" midday
    const longEnough = (latestSleepLog.durationMin || 0) >= 180; // ignore short naps as the day reset
    if (sameCalDay && wokeAlready && morningWindow && longEnough) boundaryMin = wMin;
  }
  const nowMin = d.getHours() * 60 + d.getMinutes();
  if (nowMin < boundaryMin) {
    const y = new Date(d);
    y.setDate(y.getDate() - 1);
    return dayOf(y);
  }
  return dayOf(d);
}


// Renders children into document.body so overlays (sheets, modals) escape the app frame's
// overflow:hidden / flex / transform context — fixes "grey screen, no content" on overlays.
function Portal({ children }) {
  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(children, document.body);
}

// Tracks the on-screen keyboard height via the visualViewport API so bottom sheets can lift
// their content above the keyboard (keeps inputs + save buttons visible while typing on iOS).
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onChange = () => {
      // gap between layout viewport bottom and visual viewport bottom ≈ keyboard height
      const gap = Math.max(0, (window.innerHeight || 0) - (vv.height + vv.offsetTop));
      setInset(gap > 90 ? Math.round(gap) : 0); // ignore tiny URL-bar shifts
    };
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    onChange();
    return () => { vv.removeEventListener("resize", onChange); vv.removeEventListener("scroll", onChange); };
  }, []);
  return inset;
}

// On focus, scroll the focused input into view so the keyboard never covers it.
const scrollIntoViewOnFocus = (e) => {
  try { setTimeout(() => { e.target && e.target.scrollIntoView && e.target.scrollIntoView({ block: "center", behavior: "smooth" }); }, 250); } catch (_) {}
};

/* ---------------- data version + safe parsing -------------- */
const DATA_VERSION = 2; // bump when schema needs migration

/* ---------------- alarm / timer sounds (Web Audio, no asset files) --------------
   Synthesizes a handful of distinct tones so we don't ship audio files and it
   works offline. Browsers require a user gesture before audio can play, so the
   UI prompts the user to tap "Test sound" once to unlock it. */
let _audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!_audioCtx) _audioCtx = new AC();
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  } catch (_) { return null; }
}
// ---- Haptics: module-level so any component can buzz, gated by a flag SprigApp keeps in sync
// with the user's Haptics setting. Patterns are short and consistent across the app. ----
let HAPTICS_ON = true;
const HAPTIC_PATTERNS = {
  tap: 12, light: 18, success: [16, 40, 16], strong: 35, select: 10,
  complete: [24, 60, 24], finish: [40, 80, 40, 80, 40], alarm: [400, 200, 400, 200, 400], error: [60, 40, 60],
};
// Lazy-import Capacitor Haptics so the web bundle never fails to parse if the plugin is absent.
let _CapHaptics = null;
async function _getCapHaptics() {
  if (_CapHaptics) return _CapHaptics;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    _CapHaptics = { Haptics, ImpactStyle };
  } catch (_) { _CapHaptics = null; }
  return _CapHaptics;
}
function buzz(kind = "tap") {
  if (!HAPTICS_ON) return;
  // Try native Capacitor Haptics first (iOS / Android). Falls back to Web Vibration API.
  _getCapHaptics().then((cap) => {
    if (!cap) { try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 14); } catch (_) {} return; }
    const { Haptics, ImpactStyle } = cap;
    try {
      if (kind === "success" || kind === "complete" || kind === "finish") {
        Haptics.notification({ type: "SUCCESS" }).catch(() => {});
      } else if (kind === "error") {
        Haptics.notification({ type: "ERROR" }).catch(() => {});
      } else if (kind === "strong") {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      } else if (kind === "light" || kind === "select") {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      } else {
        Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
    } catch (_) { try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 14); } catch (__) {} }
  }).catch(() => { try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 14); } catch (_) {} });
}
/* ================= LOCAL NOTIFICATIONS ================= */
async function scheduleLocalNotifications(prefs = {}) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;
    // Cancel all previously scheduled Vitae reminders (IDs 101–103)
    const pending = await LocalNotifications.getPending();
    const vitaeNotifs = pending.notifications.filter((n) => n.id >= 101 && n.id <= 103);
    if (vitaeNotifs.length) await LocalNotifications.cancel({ notifications: vitaeNotifs });
    const toSchedule = [];
    if (prefs.notifHydration !== false) {
      toSchedule.push({
        id: 101, title: "Hydration check 💧",
        body: "Have you had enough water today?",
        schedule: { every: "day", on: { hour: 10, minute: 0 } },
        sound: null, attachments: null, actionTypeId: "", extra: null,
      });
    }
    if (prefs.notifMeal !== false) {
      toSchedule.push({
        id: 102, title: "Log your lunch 🍽️",
        body: "What did you eat? Log it while it's fresh.",
        schedule: { every: "day", on: { hour: 13, minute: 0 } },
        sound: null, attachments: null, actionTypeId: "", extra: null,
      });
    }
    if (prefs.notifWorkout !== false) {
      toSchedule.push({
        id: 103, title: "Training time 💪",
        body: "Have you moved today? Log a workout or your steps.",
        schedule: { every: "day", on: { hour: 18, minute: 30 } },
        sound: null, attachments: null, actionTypeId: "", extra: null,
      });
    }
    if (toSchedule.length) await LocalNotifications.schedule({ notifications: toSchedule });
  } catch (e) { console.warn("[vitae] scheduleLocalNotifications:", e); }
}

// Premium 2-note confirmation chime — A4 warm impact then B5 resonance, ~450ms total.
function playRecordSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const vol = 0.11;
    // Note 1 — warm impact: A4 (440 Hz), triangle, short decay
    const o1 = ctx.createOscillator(), g1 = ctx.createGain();
    o1.type = "triangle"; o1.frequency.value = 440;
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(vol * 0.75, t + 0.010);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
    o1.connect(g1); g1.connect(ctx.destination);
    o1.start(t); o1.stop(t + 0.20);
    // Note 2 — clean confirmation: B5 (988 Hz), sine, longer sustain
    const o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = "sine"; o2.frequency.value = 880;
    g2.gain.setValueAtTime(0, t + 0.13);
    g2.gain.linearRampToValueAtTime(vol, t + 0.155);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.46);
    o2.connect(g2); g2.connect(ctx.destination);
    o2.start(t + 0.13); o2.stop(t + 0.48);
  } catch (_) {}
}
// Play one "ring" of the chosen sound at the given volume (0–1). Returns approx duration in ms.
function playAlarmTone(kind = "bells", volume = 0.7) {
  if (kind === "vibrate") {
    try { navigator.vibrate?.([200, 120, 200]); } catch (_) {}
    return 600;
  }
  const ctx = getAudioCtx();
  if (!ctx) return 0;
  const vol = Math.max(0, Math.min(1, volume == null ? 0.7 : volume));
  const now = ctx.currentTime;
  const SEQ = {
    bells: [[880, 0, 0.4], [1108, 0.16, 0.5], [1318, 0.32, 0.6]],
    beep:  [[1000, 0, 0.12], [1000, 0.2, 0.12], [1000, 0.4, 0.12]],
    chime: [[523, 0, 0.5], [659, 0.22, 0.5], [784, 0.44, 0.7]],
    deep:  [[170, 0, 0.7], [130, 0.06, 0.7]],
  }[kind] || [[880, 0, 0.4]];
  const wave = kind === "deep" ? "sawtooth" : (kind === "beep" ? "square" : "sine");
  let end = 0;
  SEQ.forEach(([f, t, d]) => {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.linearRampToValueAtTime(vol, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + t); o.stop(now + t + d + 0.05);
      end = Math.max(end, t + d);
    } catch (_) {}
  });
  return Math.round(end * 1000) + 100;
}


// Parse a JSON value from storage with a fallback. Never throws.
// `validator(parsed)` returns the value to use, or null to fall back to default.
const GLOSSARY = {
  RIR: "Reps in reserve — how many more reps you could've done. RIR 2 means you stopped ~2 reps shy of failure.",
  RPE: "Rate of perceived exertion (1–10). RPE 8 ≈ 2 reps left in the tank.",
  "e1RM": "Estimated one-rep max — the most you could lift once, calculated from your weight × reps. Lets you compare sets at different rep counts.",
  "1RM": "One-rep max — the heaviest weight you can lift for a single rep.",
  Volume: "Total hard sets per muscle per week. 10–20 sets is a typical growth range.",
  NEAT: "Non-exercise activity — steps, fidgeting, walking. A big, underrated driver of daily calories burned.",
  Macros: "Protein, carbs, and fat — the three nutrients that make up your calories.",
  Fiber: "Indigestible plant carbs. Aids digestion, fullness, and gut health; aim ~30g/day.",
  "Sleep debt": "Accumulated shortfall vs your sleep need. Pays down with extra sleep over several nights.",
  "Sleep score": "A 0–100 estimate of last night's quality from duration, stages, and restlessness.",
  Readiness: "A daily estimate of how recovered you are, blending sleep, debt, alcohol, and pain.",
  Deload: "A planned easy week (less weight/volume) so your body supercompensates and you come back stronger.",
  Progression: "Gradually adding weight or reps over time — the core driver of getting stronger.",
  Recomposition: "Losing fat and gaining muscle at the same time — common for beginners and returners.",
  Maintenance: "The calorie intake that keeps your weight stable.",
  HRV: "Heart-rate variability — beat-to-beat variation. Higher than your normal usually signals better recovery.",
  RHR: "Resting heart rate. Lower generally means better cardiovascular fitness; a spike can signal fatigue or illness.",
};
function Term({ k, children }) {
  const [open, setOpen] = useState(false);
  const def = GLOSSARY[k];
  if (!def) return <>{children || k}</>;
  return (
    <span style={{ position: "relative", display: "inline" }}>
      <span>{children || k}</span>
      <button className="sprig-tap" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ display: "inline-grid", placeItems: "center", width: 14, height: 14, borderRadius: 99, border: "none", background: C.bg2, color: C.muted, fontSize: 9, fontWeight: 700, cursor: "pointer", marginLeft: 3, verticalAlign: "middle", lineHeight: 1, fontFamily: "DM Sans" }}>?</button>
      {open && (
        <span onClick={() => setOpen(false)} style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 30, width: 210, background: C.ink, color: "#fff", fontSize: 11, lineHeight: 1.5, fontWeight: 400, padding: "9px 11px", borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,.25)", fontFamily: "DM Sans" }}>
          <b style={{ display: "block", marginBottom: 2 }}>{k}</b>{def}
        </span>
      )}
    </span>
  );
}


/* ---------------- result / edit card -------------- */
function ResultCard({ result, onAdd, onCancel, mode, isSupp, favoriteMode, onRefine }) {
  const [r, setR] = useState({ ...result, mult: 1 });
  const [showRefine, setShowRefine] = useState(false);
  const [refineDraft, setRefineDraft] = useState("");
  const [refineError, setRefineError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const openEdit = () => {
    const m0 = r.mult;
    setEditDraft({
      name: r.name || '',
      serving: r.serving || '',
      calories: String(Math.round(r.calories * m0)),
      protein_g: String(parseFloat((r.protein_g * m0).toFixed(1))),
      carbs_g: String(parseFloat((r.carbs_g * m0).toFixed(1))),
      fat_g: String(parseFloat(((r.fat_g || 0) * m0).toFixed(1))),
    });
    setEditing(true);
  };
  const applyEdit = () => {
    const pf = (v, def = 0) => { const n = parseFloat(v); return (isNaN(n) || n < 0) ? def : n; };
    setR((prev) => ({
      ...prev,
      name: editDraft.name.trim() || prev.name,
      serving: editDraft.serving || prev.serving,
      calories: pf(editDraft.calories),
      protein_g: pf(editDraft.protein_g),
      carbs_g: pf(editDraft.carbs_g),
      fat_g: pf(editDraft.fat_g),
      mult: 1,
    }));
    setEditing(false);
    setEditDraft(null);
  };
  const setMult = (d) => setR((x) => ({ ...x, mult: Math.max(0.25, Math.round((x.mult + d) * 4) / 4) }));
  const m = r.mult;
  const conf = { high: C.greenSoft, medium: C.amber, low: C.coral }[r.confidence] || C.muted;
  const topMicros = MICRO_KEYS
    .map(([k, lbl]) => [lbl, Math.round((r.micros?.[k] || 0) * m)])
    .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const handleRefineSubmit = () => {
    if (!refineDraft.trim()) { setRefineError("Describe what to change."); return; }
    setRefineError("");
    if (onRefine) onRefine(refineDraft.trim());
  };
  return (
    <div className="vitae-scale-in" style={{ background: C.card, borderRadius: 22, padding: 20, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 600, color: C.ink, display: "flex", alignItems: "center", gap: 7 }}>
            {isSupp && <Pill size={17} color={C.greenSoft} />}{r.name}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{r.serving}</div>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: conf, background: conf + "1f", padding: "4px 9px", borderRadius: 99, textTransform: "uppercase", letterSpacing: .5 }}>{r.confidence}</span>
      </div>

      {(!isSupp || r.calories > 0) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0", padding: "12px 14px", background: C.bg, borderRadius: 14 }}>
          <Flame size={18} color={C.coral} />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 700, color: C.ink }}>{Math.round(r.calories * m)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>kcal</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <button className="sprig-tap" onClick={() => setMult(-0.25)} style={{ ...btn(C.bg2, C.ink), width: 30, height: 30, borderRadius: 10 }}><Minus size={15} /></button>
            <span style={{ minWidth: 42, textAlign: "center", fontWeight: 700, color: C.ink }}>×{m}</span>
            <button className="sprig-tap" onClick={() => setMult(0.25)} style={{ ...btn(C.bg2, C.ink), width: 30, height: 30, borderRadius: 10 }}><Plus size={15} /></button>
          </div>
        </div>
      )}

      {isSupp ? (
        <div style={{ marginTop: r.calories > 0 ? 0 : 14 }}>
          {!(r.calories > 0) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: C.muted, marginRight: "auto" }}>doses</span>
              <button className="sprig-tap" onClick={() => setMult(-0.25)} style={{ ...btn(C.bg2, C.ink), width: 30, height: 30, borderRadius: 10 }}><Minus size={15} /></button>
              <span style={{ minWidth: 42, textAlign: "center", fontWeight: 700, color: C.ink }}>×{m}</span>
              <button className="sprig-tap" onClick={() => setMult(0.25)} style={{ ...btn(C.bg2, C.ink), width: 30, height: 30, borderRadius: 10 }}><Plus size={15} /></button>
            </div>
          )}
          {topMicros.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {topMicros.map(([lbl, v]) => (
                <span key={lbl} style={{ fontSize: 11.5, fontWeight: 600, color: C.greenSoft, background: C.green + "14", padding: "5px 10px", borderRadius: 99 }}>
                  {lbl} +{v}%
                </span>
              ))}
              {(r.protein_g * m) >= 1 && (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: C.green, background: C.green + "14", padding: "5px 10px", borderRadius: 99 }}>
                  Protein +{Math.round(r.protein_g * m)}g
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: C.muted }}>No standard vitamins/minerals detected — it'll still be saved to your stack.</div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 14 }}>
          <MacroBar name="Protein" val={r.protein_g * m} max={Math.max(1, Math.round(r.protein_g * m))} color={C.green} />
          <MacroBar name="Carbs" val={r.carbs_g * m} max={Math.max(1, Math.round(r.carbs_g * m))} color={C.amber} />
          <MacroBar name="Fat" val={r.fat_g * m} max={Math.max(1, Math.round(r.fat_g * m))} color={C.coral} />
        </div>
      )}
      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 12, fontStyle: "italic" }}>{r.note}</div>

      {!isSupp && !editing && (
        <button className="sprig-tap" onClick={openEdit}
          style={{ width: "100%", background: "transparent", border: `1px dashed ${C.line}`, borderRadius: 11, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
          <PencilLine size={13} color={C.muted} /> Edit values
        </button>
      )}
      {!isSupp && editing && editDraft && (
        <div style={{ background: C.bg, borderRadius: 14, padding: 14, border: `1px solid ${C.line}`, marginTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <PencilLine size={13} color={C.greenSoft} /> Edit values
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Meal name</div>
            <input type="text" value={editDraft.name}
              onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
              style={{ width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 9, padding: "9px 11px", fontSize: 14, color: C.ink, background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", fontFamily: "DM Sans", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Portion / serving</div>
            <input type="text" value={editDraft.serving}
              onChange={(e) => setEditDraft((d) => ({ ...d, serving: e.target.value }))}
              style={{ width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 9, padding: "9px 11px", fontSize: 14, color: C.ink, background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", fontFamily: "DM Sans", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: 600 }}>Calories (kcal)</div>
            <input type="number" inputMode="numeric" min="0" value={editDraft.calories}
              onChange={(e) => setEditDraft((d) => ({ ...d, calories: e.target.value }))}
              style={{ width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 9, padding: "9px 11px", fontSize: 14, color: C.ink, background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", fontFamily: "DM Sans", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {[["Protein (g)", "protein_g", C.green], ["Carbs (g)", "carbs_g", C.amber], ["Fat (g)", "fat_g", C.coral]].map(([label, key, color]) => (
              <div key={key} style={{ flex: 1 }}>
                <div style={{ fontSize: 10.5, color, marginBottom: 4, fontWeight: 700 }}>{label}</div>
                <input type="number" inputMode="decimal" min="0" step="0.1" value={editDraft[key]}
                  onChange={(e) => setEditDraft((d) => ({ ...d, [key]: e.target.value }))}
                  style={{ width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 9, padding: "8px 8px", fontSize: 13, color: C.ink, background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", fontFamily: "DM Sans", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="sprig-tap" onClick={() => { setEditing(false); setEditDraft(null); }}
              style={{ ...btn(C.bg2, C.muted), flex: 1, padding: "10px 0", fontSize: 12.5 }}>Cancel</button>
            <button className="sprig-tap" onClick={applyEdit}
              style={{ ...btn(C.green, "#fff"), flex: 2, padding: "10px 0", fontSize: 12.5, fontWeight: 700 }}>
              <Check size={13} /> Apply
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="sprig-tap" onClick={onCancel} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "13px 0" }}><X size={16} /> Discard</button>
        <button className="sprig-tap" onClick={() => onAdd(r)} style={{ ...btn(C.green, "#fff"), flex: 2, padding: "13px 0" }}>
          <Check size={16} /> {favoriteMode ? "Review & save favorite" : isSupp ? "Add to my stack" : <>Add to today{mode === "text" ? " · save meal" : ""}</>}
        </button>
      </div>

      {onRefine && !isSupp && (
        <div style={{ marginTop: 10 }}>
          {!showRefine ? (
            <button className="sprig-tap" onClick={() => setShowRefine(true)}
              style={{ width: "100%", background: "transparent", border: `1px dashed ${C.line}`, borderRadius: 11, padding: "9px 14px", fontSize: 12.5, fontWeight: 600, color: C.muted, cursor: "pointer", fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 7 }}>
              <PencilLine size={13} color={C.muted} /> Correct this meal
            </button>
          ) : (
            <div style={{ background: C.bg, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
                <PencilLine size={13} color={C.greenSoft} /> Correct the AI result
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 9, lineHeight: 1.5 }}>
                Describe what's different — e.g. "3 eggs not 2", "250g pasta", "remove the cheese", "chicken thigh not breast"
              </div>
              <textarea value={refineDraft} onChange={(e) => setRefineDraft(e.target.value)}
                placeholder="Describe the correction…"
                autoFocus
                style={{ width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", outline: "none", resize: "none", background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", fontFamily: "DM Sans", fontSize: 14, color: C.ink, minHeight: 72, lineHeight: 1.45, boxSizing: "border-box" }} />
              {refineError && <div style={{ fontSize: 11.5, color: C.coral, marginTop: 5 }}>{refineError}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="sprig-tap" onClick={() => { setShowRefine(false); setRefineDraft(""); setRefineError(""); }}
                  style={{ ...btn(C.bg2, C.muted), flex: 1, padding: "10px 0", fontSize: 12.5 }}>Cancel</button>
                <button className="sprig-tap" onClick={handleRefineSubmit}
                  disabled={!refineDraft.trim()}
                  style={{ ...btn(refineDraft.trim() ? C.lime : C.bg2, refineDraft.trim() ? "#0A1F12" : C.muted), flex: 2, padding: "10px 0", fontSize: 12.5, fontWeight: 700, opacity: refineDraft.trim() ? 1 : 0.5 }}>
                  <Sparkles size={13} /> Re-analyse
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- main app -------------- */
const DEFAULT_PROFILE = { sex: "male", age: 18, weight: 72, height: 178, activity: "active", goal: "gain", experience: "beginner", focus: "gym", mode: "simple", workoutCalorieMode: "conservative", dayResetMode: "after-wake", restTimerSound: true, restTimerVibrate: true, restTimerSoundChoice: "beep", alarmSound: "bells", alarmVolume: 0.7, devMode: false };

/* ================= AI LOADING CARD ================= */
const AI_FOOD_MSGS = ["Analyzing your meal…", "Identifying ingredients…", "Calculating nutrition…"];
const AI_SUPP_MSGS = ["Reading your supplement…", "Looking up nutrients…", "Building your breakdown…"];
function AiLoadingCard({ isSupp, image }) {
  const msgs = isSupp ? AI_SUPP_MSGS : AI_FOOD_MSGS;
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0); // 0=capture, 1=analyze, 2=confirm
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % msgs.length), 1700);
    return () => clearInterval(t);
  }, [msgs.length]);
  useEffect(() => {
    // Simulate progress through the 3-step flow
    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const STEPS = [
    { label: "Photo received", done: step >= 1 },
    { label: "Analysing ingredients", done: step >= 2 },
    { label: "Building nutrition facts", done: false },
  ];

  return (
    <div className="sprig-rise" style={{ background: C.card, borderRadius: 18, padding: "16px 18px", boxShadow: C.shadow, marginBottom: 14 }}>
      {/* Scanning progress bar */}
      <div style={{ height: 3, background: C.bg2, borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
        <div className="sprig-skeleton" style={{ height: "100%", borderRadius: 99 }} />
      </div>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        {/* Thumbnail if we have a captured image */}
        {image && (
          <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", flexShrink: 0, border: `1px solid ${C.line}`, position: "relative" }}>
            <img src={image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.35)" }}>
              <Loader2 size={20} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
            </div>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Status message */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            {!image && <div style={{ width: 32, height: 32, borderRadius: 9, background: C.green + "1a", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Loader2 size={16} color={C.green} style={{ animation: "spin 1s linear infinite" }} />
            </div>}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{msgs[idx]}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Usually 2–4 seconds</div>
            </div>
          </div>

          {/* 3-step flow */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center",
                  background: s.done ? C.green : (step === i ? C.green + "30" : C.bg2),
                  border: step === i && !s.done ? `1.5px solid ${C.green}` : "none" }}>
                  {s.done
                    ? <Check size={11} color="#fff" strokeWidth={3} />
                    : step === i && <Loader2 size={10} color={C.green} style={{ animation: "spin 1s linear infinite" }} />}
                </div>
                <span style={{ fontSize: 12, color: s.done ? C.greenSoft : step === i ? C.inkSoft : C.muted, fontWeight: s.done || step === i ? 600 : 400 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dots progress */}
      <div style={{ display: "flex", gap: 5, marginTop: 14, justifyContent: "center" }}>
        {msgs.map((_, i) => (
          <div key={i} style={{ height: 5, borderRadius: 99, background: i === idx ? C.green : C.bg2, width: i === idx ? 20 : 6, transition: "all 0.35s ease" }} />
        ))}
      </div>
    </div>
  );
}

/* ================= SAFE MODE CARD ================= */
// Shown when storage loading throws — gives the user a way to recover without losing their data.
function SafeModeCard({ error, onExport, onReset, onDemo, onRetry }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: 20, fontFamily: "DM Sans" }}>
      <div style={{ maxWidth: 440, margin: "30px auto 0", background: C.card, borderRadius: 20, padding: 22, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: C.amber + "22", display: "grid", placeItems: "center" }}>
            <Square size={18} color={C.amber} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: C.ink }}>Safe Mode</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>Vitae couldn't load your data this time.</div>
          </div>
        </div>
        <div style={{ background: C.bg, borderRadius: 11, padding: 11, fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55, marginBottom: 14 }}>
          Your data is probably still safe — this is usually a one-off glitch. Try reloading first. If that fails, you can export a backup before clearing anything.
          {error?.message && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer", listStyle: "none", fontSize: 10.5, color: C.muted, fontWeight: 600 }}>Technical details</summary>
              <code style={{ display: "block", fontSize: 10, color: C.muted, marginTop: 5, wordBreak: "break-word", fontFamily: "monospace" }}>{error.message}</code>
            </details>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="sprig-tap" onClick={onRetry}
            style={{ background: C.green, color: "#fff", border: "none", cursor: "pointer", borderRadius: 11, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans" }}>
            <RotateCcw size={14} /> Reload Vitae
          </button>
          <button className="sprig-tap" onClick={onExport}
            style={{ background: C.bg2, color: C.green, border: "none", cursor: "pointer", borderRadius: 11, padding: "12px 0", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans" }}>
            <BarChart3 size={14} /> Export backup (JSON)
          </button>
          <button className="sprig-tap" onClick={onDemo}
            style={{ background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 11, padding: "12px 0", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans" }}>
            <Sparkles size={14} /> Load demo data (14 days)
          </button>
          {!confirming ? (
            <button className="sprig-tap" onClick={() => setConfirming(true)}
              style={{ background: "transparent", color: C.coral, border: `1px solid ${C.coral}55`, cursor: "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans" }}>
              <Trash2 size={13} /> Clear all local data
            </button>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="sprig-tap" onClick={() => setConfirming(false)} style={{ flex: 1, background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12, fontWeight: 600 }}>Cancel</button>
              <button className="sprig-tap" onClick={onReset} style={{ flex: 1, background: C.coral, color: "#fff", border: "none", cursor: "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12, fontWeight: 700 }}>Yes, clear it all</button>
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 10, lineHeight: 1.5, textAlign: "center", fontStyle: "italic" }}>
          Clearing wipes only Vitae's data on this device. Your exported backup file is unaffected.
        </div>
      </div>
    </div>
  );
}

/* ================= ERROR BOUNDARY ================= */
// React class — wraps the app so a render-time throw shows a recovery screen instead of a blank page.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    try { console.error("Sprig render error:", error, info); } catch (_) { /* ignore */ }
  }
  reset = () => this.setState({ error: null });
  reload = () => { try { window.location?.reload?.(); } catch (_) { this.reset(); } };
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: C.bg, minHeight: "100vh", padding: 20, fontFamily: "DM Sans" }}>
          <div style={{ maxWidth: 440, margin: "30px auto 0", background: C.card, borderRadius: 20, padding: 22, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: C.coral + "22", display: "grid", placeItems: "center" }}>
                <X size={18} color={C.coral} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: C.ink }}>Something broke</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>A part of Vitae hit an unexpected error. Your data is safe.</div>
              </div>
            </div>
            <div style={{ background: C.bg, borderRadius: 11, padding: 11, fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55, marginBottom: 14 }}>
              Try reloading. If the same error keeps appearing, you can wipe local data from <b>Me → Data &amp; privacy</b> after reloading.
              {this.state.error?.message && (
                <div style={{ marginTop: 8, background: C.bg2, borderRadius: 8, padding: 8 }}>
                  <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Error:</div>
                  <code style={{ display: "block", fontSize: 10, color: C.coral, wordBreak: "break-all", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{this.state.error.message}</code>
                  {this.state.error?.stack && <code style={{ display: "block", fontSize: 9, color: C.muted, wordBreak: "break-all", fontFamily: "monospace", whiteSpace: "pre-wrap", marginTop: 6, maxHeight: 160, overflow: "auto" }}>{this.state.error.stack}</code>}
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="sprig-tap" onClick={this.reload}
                style={{ background: C.green, color: "#fff", border: "none", cursor: "pointer", borderRadius: 11, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans" }}>
                <RotateCcw size={14} /> Reload Vitae
              </button>
              <button className="sprig-tap" onClick={this.reset}
                style={{ background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 11, padding: "11px 0", fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans" }}>
                Try again without reloading
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ================= ONBOARDING ================= */
const ONB_GOALS = [
  { id: "lose", label: "Lose fat", emoji: "🔥", goal: "lose" },
  { id: "gain", label: "Gain muscle", emoji: "💪", goal: "gain" },
  { id: "maintain", label: "Maintain", emoji: "⚖️", goal: "maintain" },
  { id: "health", label: "Improve health", emoji: "🌿", goal: "maintain" },
  { id: "performance", label: "Improve performance", emoji: "⚡", goal: "maintain" },
];
const ONB_ACTIVITY = [
  ["sedentary", "Sedentary", "desk job, little exercise"],
  ["light", "Light", "1–2 workouts/week"],
  ["moderate", "Moderate", "3–4 workouts/week"],
  ["active", "Very active", "5+ workouts/week"],
];
const ONB_EXP = [["beginner", "Beginner", "< 1 year"], ["intermediate", "Intermediate", "1–3 years"], ["advanced", "Advanced", "3+ years"]];
const ONB_FOCUS = [
  ["gym", "Gym / lifting", "🏋️"], ["cardio", "Running / cardio", "🏃"],
  ["sports", "Sports", "⚽"], ["health", "General health", "🌿"], ["transform", "Body transformation", "✨"],
];

// ---- Onboarding mini card components ----
function MiniNutritionCard() {
  return (
    <div style={{ width: "100%", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 11, color: "rgba(244,247,242,0.55)", letterSpacing: .6, fontFamily: "DM Sans" }}>TODAY'S CALORIES</div>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 54, fontWeight: 700, color: "#F4F7F2", lineHeight: 1 }}>1,840</div>
      <div style={{ display: "flex", gap: 20 }}>
        {[["Protein","142g"],["Carbs","198g"],["Fat","61g"]].map(([lbl,val]) => (
          <div key={lbl} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F4F7F2" }}>{val}</div>
            <div style={{ fontSize: 10.5, color: "rgba(244,247,242,0.45)", marginTop: 2 }}>{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function MiniCoachCard() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ background: "rgba(244,247,242,0.1)", borderRadius: 12, padding: "9px 12px" }}>
        <div style={{ fontSize: 10.5, color: "rgba(244,247,242,0.45)", marginBottom: 3 }}>You</div>
        <div style={{ fontSize: 13, color: "#F4F7F2", lineHeight: 1.45 }}>{"Why aren't I losing weight even though I eat less?"}</div>
      </div>
      <div style={{ background: "rgba(244,247,242,0.16)", borderRadius: 12, padding: "9px 12px" }}>
        <div style={{ fontSize: 10.5, color: "rgba(244,247,242,0.45)", marginBottom: 3 }}>Vitae</div>
        <div style={{ fontSize: 12.5, color: "#F4F7F2", lineHeight: 1.45 }}>{"Your 7-day average is 2,340 kcal — above your 2,100 target. Sleep deprivation is also raising cortisol."}</div>
      </div>
    </div>
  );
}
function MiniProgressCard() {
  const bars = [45, 60, 52, 78, 65, 90, 72];
  const days = ["M","T","W","T","F","S","S"];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 10.5, color: "rgba(244,247,242,0.45)", letterSpacing: .5 }}>WEEKLY STREAK</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 32, fontWeight: 700, color: "#F4F7F2", lineHeight: 1.1 }}>7 days</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(199,255,61,0.15)", borderRadius: 20, padding: "5px 10px" }}>
          <Trophy size={11} color="#C7FF3D" />
          <span style={{ fontSize: 11.5, color: "#C7FF3D", fontWeight: 700 }}>New record</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ width: "100%", height: 40 * h / 100, background: i === 6 ? "#C7FF3D" : "rgba(244,247,242,0.22)", borderRadius: 4, minHeight: 4 }} />
            <div style={{ fontSize: 9, color: "rgba(244,247,242,0.35)" }}>{days[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function MiniTabTourCard() {
  const tabs = [
    { icon: "🍽️", label: "Today", sub: "Meals & macros" },
    { icon: "💪", label: "Train", sub: "Workouts & strength" },
    { icon: "🌙", label: "Health", sub: "Sleep & recovery" },
    { icon: "📊", label: "Trends", sub: "Your weekly report" },
    { icon: "✨", label: "Coach", sub: "AI insights" },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 7 }}>
      {tabs.map((tab) => (
        <div key={tab.label} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(244,247,242,0.1)", borderRadius: 10, padding: "7px 11px" }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{tab.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#F4F7F2" }}>{tab.label}</div>
            <div style={{ fontSize: 10.5, color: "rgba(244,247,242,0.45)", marginTop: 1 }}>{tab.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function DrumPicker({ values, value, onChange }) {
  const ITEM_H = 44;
  const initIdx = Math.max(0, values.indexOf(value));
  const [localIdx, setLocalIdx] = useState(initIdx);
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = initIdx * ITEM_H;
  }, []);
  const handleScroll = () => {
    if (!ref.current) return;
    const idx = Math.max(0, Math.min(Math.round(ref.current.scrollTop / ITEM_H), values.length - 1));
    if (idx !== localIdx) { setLocalIdx(idx); onChange(String(values[idx])); }
  };
  return (
    <div style={{ position: "relative", height: ITEM_H * 3, overflow: "hidden", borderRadius: 14, border: `1.5px solid ${C.line}`, background: C.card }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2,
        background: `linear-gradient(${C.card}f2 0%, transparent 33%, transparent 67%, ${C.card}f2 100%)` }} />
      <div style={{ position: "absolute", top: ITEM_H, left: 0, right: 0, height: ITEM_H,
        borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, pointerEvents: "none", zIndex: 1 }} />
      <div ref={ref} onScroll={handleScroll}
        style={{ height: "100%", overflowY: "scroll", scrollSnapType: "y mandatory",
          scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
        <div style={{ height: ITEM_H }} />
        {values.map((v, i) => (
          <div key={v} style={{ height: ITEM_H, scrollSnapAlign: "start",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "DM Sans", fontSize: i === localIdx ? 22 : 16,
            fontWeight: i === localIdx ? 700 : 400,
            color: i === localIdx ? C.ink : C.muted }}>
            {v}
          </div>
        ))}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  );
}
function onbInputStyle(C) {
  return {
    width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12,
    padding: "14px 16px", fontFamily: "DM Sans", fontSize: 16, fontWeight: 600,
    background: C.card, color: C.ink, boxSizing: "border-box", outline: "none",
  };
}

function Onboarding({ onDone, supabaseReady }) {
  const [phase, setPhase] = useState("splash"); // "splash" | "carousel" | "questions"
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ intent: null, sex: null, age: "25", height: "175", weight: "70", activity: null, experience: null, focus: null, focusAreas: [], unit: "kg" });
  const [firstAction, setFirstAction] = useState(null);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const toggleArea = (k) => setP((x) => {
    const has = (x.focusAreas || []).includes(k);
    let next = has ? x.focusAreas.filter((a) => a !== k) : [...(x.focusAreas || []), k];
    if (k === "all") next = has ? [] : ["all"]; else next = next.filter((a) => a !== "all");
    return { ...x, focusAreas: next };
  });

  useEffect(() => {
    if (phase !== "splash") return;
    const t = setTimeout(() => setPhase("carousel"), 1200);
    return () => clearTimeout(t);
  }, [phase]);

  const CAROUSEL_SLIDES = [
    { headline: "Every bite, every rep,\nevery night.", sub: "One place for food, training, sleep, and recovery.", card: <MiniNutritionCard /> },
    { headline: "Your AI coach\nknows your body.", sub: "Ask anything. It answers from your actual data.", card: <MiniCoachCard /> },
    { headline: "Know your numbers.\nOwn your progress.", sub: "Macros, strength, sleep — all in one dashboard.", card: <MiniProgressCard /> },
    { headline: "Five tabs.\nEverything you need.", sub: "Each tab is a focused tool — nothing hidden, nothing buried.", card: <MiniTabTourCard /> },
  ];

  const QUESTION_STEPS = [
    { key: "intent",      title: "What are you working toward?",  sub: "We'll tune everything around this." },
    { key: "focusAreas",  title: "What should Vitae help with?",  sub: "Pick as many as you like." },
    { key: "_inter1",     type: "interstitial", headline: "Great choices.", body: "Small habits, consistently applied, are how real transformation works." },
    { key: "sex",         title: "A little about you",            sub: "Used only to estimate your calorie targets. You can change it anytime." },
    { key: "stats",       title: "A few basics",                  sub: "Age, height, and weight — for accurate targets." },
    { key: "activity",    title: "How active are you?",           sub: "Day-to-day movement, not counting dedicated workouts." },
    { key: "experience",  title: "Training experience",           sub: "So strength grades and progression fit you." },
    { key: "_inter2",     type: "interstitial", headline: "You're set up.", body: "Your data is synced to your account automatically. Now let's pick your first move." },
    { key: "firstAction", title: "Start with one small action",   sub: "The fastest way to see Vitae work." },
  ];

  const FOCUS_AREAS = [
    ["nutrition","Nutrition",Flame], ["training","Training",Dumbbell], ["sleep","Sleep",Moon],
    ["recovery","Recovery",HeartPulse], ["habits","Habits",Repeat], ["all","All of it",Sparkles],
  ];
  const FIRST_ACTIONS = [
    ["food","Log food",Flame], ["workout","Start a workout",Dumbbell],
    ["sleep","Add last night's sleep",Moon], ["coach","Ask the coach",Sparkles],
  ];

  const cur = QUESTION_STEPS[step];
  const isInterstitial = cur?.type === "interstitial";
  const totalSteps = QUESTION_STEPS.length;
  const nonInterSteps = QUESTION_STEPS.filter((s) => s.type !== "interstitial");
  const currentQIdx = nonInterSteps.findIndex((s) => s.key === cur?.key);
  const isLastStep = step === totalSteps - 1;

  const canNext = () => {
    if (isInterstitial) return true;
    switch (cur?.key) {
      case "intent": return !!p.intent;
      case "focusAreas": return (p.focusAreas || []).length > 0;
      case "sex": return !!p.sex;
      case "stats": return !!(p.age && p.height && p.weight);
      case "activity": return !!p.activity;
      case "experience": return !!p.experience;
      case "account": return true;
      case "firstAction": return true;
      default: return true;
    }
  };

  const finish = async (action) => {
    const g = ONB_GOALS.find((x) => x.id === p.intent);
    const areas = (p.focusAreas || []);
    const focusMap = { nutrition: "health", training: "gym", sleep: "health", recovery: "health", habits: "health" };
    const focus = areas.includes("training") ? "gym" : areas.includes("nutrition") ? "health" : (focusMap[areas[0]] || "health");
    await onDone({
      sex: p.sex, age: +p.age, height: +p.height, weight: +p.weight,
      activity: p.activity, goal: g?.goal || "maintain", intent: p.intent,
      experience: p.experience, focus, focusAreas: areas, unit: p.unit, mode: "simple",
      onboardedAt: new Date().toISOString(),
    }, action || firstAction);
    scheduleLocalNotifications({});
  };

  const goNext = () => { setStep((s) => s + 1); };
  const advanceTimer = useRef(null);
  const autoAdvance = (key, val) => {
    set(key, val);
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(goNext, 300);
  };
  const goBack = () => {
    if (step === 0) { setPhase("carousel"); return; }
    setStep((s) => s - 1);
  };

  const Opt = ({ on, onClick, children, sub, multi }) => (
    <button className="sprig-tap" onClick={onClick}
      style={{ width: "100%", textAlign: "left", border: `1.5px solid ${on ? C.green : C.line}`,
        background: on ? C.green + "0d" : C.card, cursor: "pointer", borderRadius: 14,
        padding: "14px 16px", fontFamily: "DM Sans", display: "flex", alignItems: "center",
        gap: 12, boxShadow: on ? "none" : C.shadow, transition: "all .15s ease" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{children}</div>
        {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ width: 22, height: 22, borderRadius: multi ? 7 : 99,
        border: `2px solid ${on ? C.green : C.line}`, background: on ? C.green : "transparent",
        display: "grid", placeItems: "center", flexShrink: 0, transition: "all .15s ease" }}>
        {on && <Check size={13} color="#fff" strokeWidth={3} />}
      </div>
    </button>
  );

  // ---- SPLASH ----
  if (phase === "splash") {
    return (
      <div className="sprig-app-frame" onClick={() => setPhase("carousel")}
        style={{ background: C.pageBg, fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <style>{FONTS}</style>
        <div className="sprig-pop" style={{ textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: C.green, display: "grid", placeItems: "center", margin: "0 auto 18px", boxShadow: `0 12px 32px ${C.green}66` }}>
            <Sparkles size={34} color="#fff" />
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 44, fontWeight: 700, color: C.ink, letterSpacing: -1 }}>Vitae</div>
        </div>
      </div>
    );
  }

  // ---- CAROUSEL ----
  if (phase === "carousel") {
    const slide = CAROUSEL_SLIDES[carouselIdx];
    const isLastSlide = carouselIdx === CAROUSEL_SLIDES.length - 1;
    return (
      <div className="sprig-app-frame" style={{ background: C.pageBg, fontFamily: "DM Sans, sans-serif", color: C.ink, display: "flex", flexDirection: "column" }}>
        <style>{FONTS}</style>
        <div style={{ textAlign: "center", padding: "32px 24px 0" }}>
          <div style={{ fontSize: 11.5, color: C.muted, letterSpacing: .5, textTransform: "uppercase", fontWeight: 600 }}>Welcome to</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 30, fontWeight: 700, letterSpacing: -0.5, color: C.ink, marginTop: 2 }}>Vitae</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 24px" }}>
          <div key={carouselIdx} className="sprig-rise" style={{ width: "100%", maxWidth: 340, background: C.card, border: `1px solid ${C.line}`, borderRadius: 24, overflow: "hidden", boxShadow: C.shadow }}>
            <div style={{ background: C.heroGrad1, height: 210, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 22px" }}>
              {slide.card}
            </div>
          </div>
          <div key={`h${carouselIdx}`} className="sprig-rise" style={{ textAlign: "center", marginTop: 24, padding: "0 8px" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 700, lineHeight: 1.2, color: C.ink, whiteSpace: "pre-line" }}>{slide.headline}</div>
            <div style={{ fontSize: 14, color: C.inkSoft, marginTop: 8, lineHeight: 1.55 }}>{slide.sub}</div>
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 22 }}>
            {CAROUSEL_SLIDES.map((_, i) => (
              <button key={i} onClick={() => setCarouselIdx(i)} style={{ padding: 0, background: "none", border: "none", cursor: "pointer" }}>
                <div style={{ width: i === carouselIdx ? 22 : 7, height: 7, borderRadius: 99, background: i === carouselIdx ? C.green : C.line, transition: "all .25s ease" }} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "8px 24px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="sprig-tap" onClick={() => isLastSlide ? setPhase("questions") : setCarouselIdx((i) => i + 1)}
            style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "17px 0", fontSize: 16, fontWeight: 700, boxShadow: `0 6px 20px ${C.lime}44` }}>
            {isLastSlide ? "Set up Vitae" : "Next"}
          </button>
        </div>
      </div>
    );
  }

  // ---- INTERSTITIAL ----
  if (isInterstitial) {
    const stepsBefore = QUESTION_STEPS.slice(0, step).filter((s) => s.type !== "interstitial").length;
    return (
      <div className="sprig-app-frame" style={{ background: C.heroGrad1, fontFamily: "DM Sans, sans-serif", display: "flex", flexDirection: "column" }}>
        <style>{FONTS}</style>
        <div style={{ padding: "22px 20px 0" }}>
          <div style={{ display: "flex", gap: 3 }}>
            {nonInterSteps.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < stepsBefore ? "rgba(244,247,242,0.9)" : "rgba(244,247,242,0.2)", transition: "background .3s" }} />
            ))}
          </div>
        </div>
        <div className="sprig-rise" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "0 24px 24px" }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 38, fontWeight: 700, lineHeight: 1.1, color: "#F4F7F2", marginBottom: 12 }}>{cur.headline}</div>
          <div style={{ fontSize: 15, color: "rgba(244,247,242,0.7)", lineHeight: 1.6 }}>{cur.body}</div>
        </div>
        <div style={{ padding: "0 24px", paddingBottom: "max(32px, env(safe-area-inset-bottom, 32px))", display: "flex", gap: 10 }}>
          <button className="sprig-tap" onClick={goBack}
            style={{ width: 52, height: 52, borderRadius: 26, background: "rgba(244,247,242,0.12)", border: "1.5px solid rgba(244,247,242,0.2)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <ChevronLeft size={20} color="#F4F7F2" />
          </button>
          <button className="sprig-tap" onClick={goNext}
            style={{ flex: 1, background: "rgba(244,247,242,0.15)", color: "#F4F7F2", border: "1.5px solid rgba(244,247,242,0.3)", borderRadius: 14, padding: "15px 0", fontSize: 15.5, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            Continue <ChevronRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  // ---- QUESTION SCREEN ----
  return (
    <div className="sprig-app-frame" style={{ background: C.bg, fontFamily: "DM Sans, sans-serif", color: C.ink, display: "flex", flexDirection: "column" }}>
      <style>{FONTS}</style>
      {/* header */}
      <div style={{ padding: "20px 20px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: C.green, display: "grid", placeItems: "center" }}>
            <Sparkles size={15} color="#fff" />
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: C.ink }}>Vitae</div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: C.muted, fontWeight: 500 }}>
            {currentQIdx + 1} of {nonInterSteps.length}
          </div>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {nonInterSteps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= currentQIdx ? C.green : C.bg2, transition: "background .3s" }} />
          ))}
        </div>
      </div>

      {/* body */}
      <div className="sprig-scroll" style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px" }}>
        <div key={step} className="sprig-rise">
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, lineHeight: 1.2, color: C.ink, marginBottom: 4 }}>{cur.title}</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.5 }}>{cur.sub}</div>

          {cur.key === "intent" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ONB_GOALS.map((g) => (
                <Opt key={g.id} on={p.intent === g.id} onClick={() => autoAdvance("intent", g.id)}>{g.emoji}  {g.label}</Opt>
              ))}
            </div>
          )}

          {cur.key === "focusAreas" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {FOCUS_AREAS.map(([k, lbl, Ic]) => (
                <Opt key={k} multi on={(p.focusAreas || []).includes(k)} onClick={() => toggleArea(k)}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Ic size={16} color={C.greenSoft} /> {lbl}</span>
                </Opt>
              ))}
            </div>
          )}

          {cur.key === "sex" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {[["male","Male"],["female","Female"]].map(([k,lbl]) => (
                <Opt key={k} on={p.sex === k} onClick={() => autoAdvance("sex", k)}>{lbl}</Opt>
              ))}
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5, padding: "0 4px" }}>
                Used only to estimate your metabolic rate. You can change it anytime from Settings.
              </div>
            </div>
          )}

          {cur.key === "stats" && (() => {
            const AGE_V = Array.from({ length: 88 }, (_, i) => String(i + 13));
            const HEIGHT_V = p.unit === "kg"
              ? Array.from({ length: 151 }, (_, i) => String(i + 100))
              : Array.from({ length: 49 }, (_, i) => String(i + 48));
            const WEIGHT_V = p.unit === "kg"
              ? Array.from({ length: 171 }, (_, i) => String(i + 30))
              : Array.from({ length: 335 }, (_, i) => String(i + 66));
            const switchUnit = (u) => {
              if (u === p.unit) return;
              if (u === "lb") {
                set("height", String(Math.round(+p.height / 2.54)));
                set("weight", String(Math.round(+p.weight * 2.205)));
              } else {
                set("height", String(Math.round(+p.height * 2.54)));
                set("weight", String(Math.round(+p.weight / 2.205)));
              }
              set("unit", u);
            };
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ display: "flex", background: C.bg2, borderRadius: 10, padding: 3, gap: 2 }}>
                    {[["kg","Metric"],["lb","Imperial"]].map(([u, lbl]) => (
                      <button key={u} className="sprig-tap" onClick={() => switchUnit(u)}
                        style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontFamily: "DM Sans",
                          background: p.unit === u ? C.green : "transparent", color: p.unit === u ? "#fff" : C.muted, transition: "all .15s ease" }}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, letterSpacing: .3, textTransform: "uppercase" }}>Age</div>
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.ink }}>{p.age} <span style={{ fontSize: 13, fontFamily: "DM Sans", fontWeight: 500, color: C.muted }}>yrs</span></div>
                  </div>
                  <DrumPicker key="age" values={AGE_V} value={p.age} onChange={(v) => set("age", v)} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, letterSpacing: .3, textTransform: "uppercase" }}>Height</div>
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.ink }}>{p.height} <span style={{ fontSize: 13, fontFamily: "DM Sans", fontWeight: 500, color: C.muted }}>{p.unit === "kg" ? "cm" : "in"}</span></div>
                  </div>
                  <DrumPicker key={`height-${p.unit}`} values={HEIGHT_V} value={p.height} onChange={(v) => set("height", v)} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <div style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, letterSpacing: .3, textTransform: "uppercase" }}>Weight</div>
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.ink }}>{p.weight} <span style={{ fontSize: 13, fontFamily: "DM Sans", fontWeight: 500, color: C.muted }}>{p.unit === "kg" ? "kg" : "lb"}</span></div>
                  </div>
                  <DrumPicker key={`weight-${p.unit}`} values={WEIGHT_V} value={p.weight} onChange={(v) => set("weight", v)} />
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{"It's ok to estimate — you can update this anytime."}</div>
                </div>
              </div>
            );
          })()}

          {cur.key === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ONB_ACTIVITY.map(([k,lbl,sub]) => (
                <Opt key={k} on={p.activity === k} onClick={() => autoAdvance("activity", k)} sub={sub}>{lbl}</Opt>
              ))}
            </div>
          )}

          {cur.key === "experience" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ONB_EXP.map(([k,lbl,sub]) => (
                <Opt key={k} on={p.experience === k} onClick={() => autoAdvance("experience", k)} sub={sub}>{lbl}</Opt>
              ))}
            </div>
          )}

          {cur.key === "firstAction" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {FIRST_ACTIONS.map(([k,lbl,Ic]) => (
                <Opt key={k} on={firstAction === k} onClick={() => setFirstAction(k)}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Ic size={16} color={C.greenSoft} /> {lbl}</span>
                </Opt>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* footer */}
      <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.line}`, display: "flex", gap: 10, paddingBottom: "max(20px, env(safe-area-inset-bottom, 20px))" }}>
        <button className="sprig-tap" onClick={goBack}
          style={{ width: 52, height: 52, borderRadius: 26, background: C.bg2, border: "none", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <ChevronLeft size={20} color={C.inkSoft} />
        </button>
        <button className="sprig-tap" disabled={!canNext()}
          onClick={() => isLastStep ? finish() : goNext()}
          style={{ ...btn(canNext() ? C.lime : C.bg2, canNext() ? "#0A1F12" : C.muted), flex: 1, padding: "15px 0", fontSize: 15, fontWeight: 700 }}>
          {cur.key === "firstAction" ? (firstAction ? "Start Vitae" : "Skip for now") : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>Continue <ChevronRight size={17} /></span>}
        </button>
      </div>
    </div>
  );
}

// ---- Forgot-to-log detection (pure, no side effects) ----
function detectLoggingGap({ date, entries, workouts, sleepLogs, quickLog, trackingPrefs, dayStatus, logGapSnoozes }) {
  // Already handled for today
  const status = (dayStatus || {})[date];
  if (status === "logged" || status === "nothing" || status === "dismissed") return { show: false };
  // Snoozed?
  const snooze = (logGapSnoozes || []).find((s) => s.date === date);
  if (snooze && snooze.snoozedUntil > Date.now()) return { show: false };
  if (snooze && (snooze.count || 0) >= 2) return { show: false };
  // Only prompt after 16:00
  if (new Date().getHours() < 16) return { show: false };
  // If quick log exists, no prompt needed
  if (quickLog) return { show: false };
  const tp = trackingPrefs || {};
  const hasFood = (entries || []).some((e) => (e.date || "") === date && (e.calories || 0) > 0);
  const hasWorkout = (workouts || []).some((w) => (w.date || "") === date);
  const hasSleep = (sleepLogs || []).some((l) => (l.date || "") === date);
  const missing = [];
  if (tp.nutrition !== false && !hasFood) missing.push("nutrition");
  if (tp.training !== false && !hasWorkout) missing.push("training");
  if (tp.sleep !== false && !hasSleep) missing.push("sleep");
  if (missing.length === 0) return { show: false };
  return { show: true, date, missing };
}

// ---- Forgot-to-log bottom sheet ----
function ForgotToLogPrompt({ missing = [], onQuickLog, onNothingDay, onSnooze, onDismiss }) {
  const label = missing.length === 1 ? missing[0] : missing.length === 2
    ? missing.join(" or ") : missing.slice(0, -1).join(", ") + ", or " + missing[missing.length - 1];
  return (
    <Portal>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 2800, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div style={{ background: C.card, borderRadius: "22px 22px 0 0", padding: "18px 20px 36px", width: "100%", maxWidth: 480, boxShadow: "0 -4px 40px rgba(0,0,0,0.3)" }}>
          <div style={{ width: 36, height: 4, background: C.line, borderRadius: 2, margin: "0 auto 16px", opacity: 0.5 }} />
          <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Fraunces, serif", marginBottom: 5 }}>Anything to log?</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>
            No {label} logged yet today. Want to update your day?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <button className="sprig-tap" onClick={onQuickLog}
              style={{ background: C.green, color: "#fff", border: "none", borderRadius: 14, padding: "14px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans" }}>
              Quick Log Day
            </button>
            <button className="sprig-tap" onClick={onNothingDay}
              style={{ background: C.bg2, color: C.inkSoft, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans" }}>
              Nothing to log — quiet day
            </button>
            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
              <button className="sprig-tap" onClick={onSnooze}
                style={{ flex: 1, background: "transparent", color: C.muted, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "10px", fontFamily: "DM Sans" }}>
                Remind me later
              </button>
              <button className="sprig-tap" onClick={onDismiss}
                style={{ flex: 1, background: "transparent", color: C.muted, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "10px", fontFamily: "DM Sans" }}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Hook: checks the user's subscription status via RevenueCat.
// Returns { isPremium, loading, refresh }.
function useSubscription(userId) {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(rcConfigured());
  const check = useCallback(async () => {
    if (!rcConfigured()) { setLoading(false); return; }
    setLoading(true);
    const result = await hasPremium(userId);
    setIsPremium(result);
    setLoading(false);
  }, [userId]);
  useEffect(() => { check(); }, [check]);
  return { isPremium, loading, refresh: check };
}

/* -------- PaywallSheet — shown when a free-tier limit is hit -------- */
function PaywallSheet({ onClose, userId }) {
  const [offerings, setOfferings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getOfferings(userId).then(setOfferings);
  }, [userId]);

  const pkg = offerings?.current?.availablePackages?.[0];

  async function handlePurchase() {
    if (!pkg) return;
    setBusy(true); setMsg(null);
    const r = await purchasePackage(pkg, userId);
    setBusy(false);
    if (r.ok) { onClose(true); return; }
    if (r.error !== "cancelled") setMsg(r.error);
  }

  const price = pkg?.webBillingProduct?.currentPrice?.formattedPrice ?? "€4.99/mo";

  return (
    <Portal>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 3200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        onClick={onClose}>
        <div className="sprig-rise" onClick={(e) => e.stopPropagation()}
          style={{ background: C.card, borderRadius: "22px 22px 0 0", padding: "20px 22px 44px", width: "100%", maxWidth: 480, boxShadow: "0 -4px 40px rgba(0,0,0,0.3)" }}>
          <div style={{ width: 36, height: 4, background: C.line, borderRadius: 2, margin: "0 auto 22px", opacity: 0.5 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "linear-gradient(135deg,#c7ff3d,#a8f020)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Crown size={24} style={{ color: "#1a1a1a" }} />
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "Fraunces, serif" }}>Vitae Premium</div>
              <div style={{ fontSize: 13, color: C.inkSoft }}>{price} · cancel anytime</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
            {[
              ["Unlimited AI food scans", "Free tier: 10/month"],
              ["AI coach — unlimited questions", "Free tier: 5/month"],
              ["Cloud sync + multi-device", "Automatic, always on"],
              ["Full history & analytics", "Unlimited entries"],
            ].map(([feat, note]) => (
              <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Check size={15} style={{ color: C.lime, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{feat}</div>
                  <div style={{ fontSize: 11.5, color: C.muted }}>{note}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="sprig-tap" onClick={handlePurchase} disabled={busy || !pkg}
            style={{ width: "100%", background: C.lime, color: "#1a1a1a", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 15, fontWeight: 800, cursor: busy || !pkg ? "default" : "pointer", fontFamily: "DM Sans", opacity: busy || !pkg ? 0.7 : 1, marginBottom: 10 }}>
            {busy ? "Processing…" : pkg ? `Subscribe for ${price}` : "Loading…"}
          </button>
          <button className="sprig-tap" onClick={() => onClose(false)}
            style={{ width: "100%", background: "transparent", color: C.muted, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "DM Sans", padding: "8px 0" }}>
            Maybe later
          </button>
          {msg && <div style={{ marginTop: 10, fontSize: 12, color: C.coral, textAlign: "center" }}>{msg}</div>}
          {!rcConfigured() && (
            <div style={{ marginTop: 12, fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.4 }}>
              Subscriptions not yet configured — set VITE_REVENUECAT_WEB_KEY to enable.
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

function AccountNudgeSheet({ onSignUp, onSnooze, onDismiss }) {
  return (
    <Portal>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 2800, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div className="sprig-rise" style={{ background: C.card, borderRadius: "22px 22px 0 0", padding: "18px 20px 40px", width: "100%", maxWidth: 480, boxShadow: "0 -4px 40px rgba(0,0,0,0.3)" }}>
          <div style={{ width: 36, height: 4, background: C.line, borderRadius: 2, margin: "0 auto 20px", opacity: 0.5 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: C.green + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <CloudUpload size={22} style={{ color: C.green }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Fraunces, serif", lineHeight: 1.2 }}>Back up your data</div>
          </div>
          <div style={{ fontSize: 14, color: C.inkSoft, marginBottom: 24, lineHeight: 1.55 }}>
            Your logs only exist on this device. If you clear the app or switch phones, everything is gone. A free account keeps your data safe automatically.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="sprig-tap" onClick={onSignUp}
              style={{ background: C.green, color: "#fff", border: "none", borderRadius: 14, padding: "15px 18px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans" }}>
              Create free account
            </button>
            <button className="sprig-tap" onClick={onSnooze}
              style={{ background: C.bg2, color: C.inkSoft, border: `1px solid ${C.line}`, borderRadius: 14, padding: "13px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans" }}>
              Remind me in 3 days
            </button>
            <button className="sprig-tap" onClick={onDismiss}
              style={{ background: "transparent", color: C.muted, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "10px", fontFamily: "DM Sans" }}>
              Don't show again
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function AuthGate() {
  const { user, loading } = useSupabaseAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center",
        background: C.isDark
          ? "linear-gradient(180deg,#0B1A13 0%,#07140F 100%)"
          : "linear-gradient(180deg,#F7F8F5 0%,#F1F4EF 100%)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <div style={{ fontSize: 13, color: C.muted, fontFamily: "DM Sans, system-ui" }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;
  return <SprigApp />;
}

export default function SprigRoot() {
  return <ErrorBoundary><AuthGate /></ErrorBoundary>;
}

function SprigApp() {
  const [tab, setTab] = useState("today");
  const [trackingPrefs, setTrackingPrefs] = useState({ ...DEFAULT_TRACKING_PREFS }); // sprig_tracking_preferences_v1 — declared here to avoid TDZ in useEffect below
  // Guard: redirect off tabs whose tracking category gets disabled
  useEffect(() => {
    const TAB_KEY = { nutrition: "nutrition", train: "training", sleep: "sleep", coach: "coach", progress: "progress", health: "health", mind: "habits" };
    const key = TAB_KEY[tab];
    if (key && trackingPrefs[key] === false) setTab("today");
  }, [trackingPrefs]); // eslint-disable-line react-hooks/exhaustive-deps

  const [themeMode, setThemeMode] = useState(() => {
    try { const s = localStorage.getItem("sprig_theme_v1"); return s === "light" ? "light" : "dark"; } catch (_) { return "dark"; }
  });
  // Apply theme on mount + whenever it changes (mutates the live C object, then re-renders).
  useEffect(() => { applyTheme(themeMode); }, [themeMode]);
  const setTheme = useCallback((mode) => {
    const m = mode === "light" ? "light" : "dark";
    applyTheme(m);
    setThemeMode(m);
    try { localStorage.setItem("sprig_theme_v1", m); } catch (_) {}
    // persist through the same store used for sprig_* keys so it syncs to Supabase
    try { store.set && store.set("sprig_theme_v1", m); } catch (_) {}
  }, []);
  const [foodSub, setFoodSub] = useState("nutrition");   // nutrition | meals
  const [trainSub, setTrainSub] = useState("training"); // training | movement | recovery
  const [sleepSub, setSleepSub] = useState("sleep");  // sleep | alarm
  const [quickOpen, setQuickOpen] = useState(false);
  const [winsOpen, setWinsOpen] = useState(false);
  const [foodOverlayMode, setFoodOverlayMode] = useState(null); // null | "menu" | "text" | "manual" | "supp" | "search"
  const [offQuery, setOffQuery] = useState("");
  const [offResults, setOffResults] = useState([]);
  const [offSearching, setOffSearching] = useState(false);
  const [offSelected, setOffSelected] = useState(null); // selected product from OFF
  const [offServing, setOffServing] = useState("100");   // serving amount in grams
  const offQueryRef = useRef("");
  const offDebounceRef = useRef(null);
  const [recapView, setRecapView] = useState(null); // { recap, ts } shown after finishing a workout
  // recordToast: { kind, label, exName, phase: "entering"|"visible"|"exiting" }
  // keypadFocus: { exIdx, field: "w"|"reps" } — which exercise field the custom keypad is editing
  // Phase flow: entering (entrance anim) → visible (idle) → exiting (exit anim) → null
  const [recordToast, setRecordToast] = useState(null);
  const recordToastTimers = useRef([]); // pending setTimeout ids — cleared on new PR
  const recordToastPriorityRef = useRef(0); // PR_PRIORITY value of the currently shown toast
  const [flashEntryId, setFlashEntryId] = useState(null); // briefly highlight a newly-logged meal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [achievementCelebration, setAchievementCelebration] = useState(null); // {icon, title, desc} | null
  const [photoOpen, setPhotoOpen] = useState(false);
  const [progressPhotos, setProgressPhotos] = useState([]);
  const [reminders, setReminders] = useState({ ...DEFAULT_REMINDERS });
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null); // {message, stack} when storage load fails
  const [writeError, setWriteError] = useState(null); // { count, lastKey, lastTs } when storage writes fail
  const [onboarded, setOnboarded] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [entries, setEntries] = useState([]);
  const [entriesHistory, setEntriesHistory] = useState([]); // last 7 days of food entries for shortcuts
  const [library, setLibrary] = useState([]);
  const [favoriteMeals, setFavoriteMeals] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [resultMode, setResultMode] = useState("photo");
  const [capturedImage, setCapturedImage] = useState(null); // base64 image kept for "Correct this meal" re-analysis
  const [error, setError] = useState("");
  const [lastAnalysisOpts, setLastAnalysisOpts] = useState(null);
  const [draft, setDraft] = useState("");
  // foodOverlayMode above replaces composer + logSheet
  const [favoriteMode, setFavoriteMode] = useState(false); // when true, an AI/photo/text result is saved as a favorite (not logged to today)
  const [supps, setSupps] = useState([]);       // saved supplement stack
  const [takenIds, setTakenIds] = useState([]); // supplement ids taken today
  const [sleepLogs, setSleepLogs] = useState([]);
  const [alarm, setAlarm] = useState({ ...DEFAULT_ALARM });
  const [session, setSession] = useState(null); // {bedTs, restSamples, micOn}
  const [ringing, setRinging] = useState(false);
  const [micState, setMicState] = useState("idle"); // idle | on | denied
  const [workouts, setWorkouts] = useState([]);
  const [sportSessionsLog, setSportSessionsLog] = useState([]); // flat log: all sport sessions across days
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [customRests, setCustomRests] = useState({});
  const [routines, setRoutines] = useState([]);
  // daily extras: water (ml), steps, weight (kg), caffeine (mg), alcohol (units), checkin {energy,mood,stress,pain,sick}
  const [daily, setDaily] = useState({ ...DEFAULT_DAILY });
  const [weightSeries, setWeightSeries] = useState([]);
  const [measureSeries, setMeasureSeries] = useState([]);   // [{date, waist, chest, shoulders, arms, thighs, calves, neck}]
  const [photoLog, setPhotoLog] = useState([]);              // [{date, kinds:['front','side','back']}]
  // health markers: vitals + blood work + symptoms, date-keyed series
  const [healthSeries, setHealthSeries] = useState([]);      // [{date, bpSys, bpDia, rhr, smoking, blood:{...}, symptoms:'...'}]

  // pain logs: structured entries beyond the daily check-in
  const [painLogs, setPainLogs] = useState([]);              // [{id, ts, date, level, location, type, note, exercise, status}]
  // mind & habits
  const [habitConfig, setHabitConfig] = useState(null);     // {custom:[{id,label}], hidden:[ids]} — null until loaded
  const [habitDone, setHabitDone] = useState({});           // manual completion: { "<date>": [habitId,...] }
  const [focusSessions, setFocusSessions] = useState([]);   // [{id, ts, date, minutes, label}]
  // Habits V2
  const [habits2, setHabits2] = useState([]);               // [{id, name, category, frequencyType, ...}]
  const [habitCompletions, setHabitCompletions] = useState([]); // [{id, habitId, completedAt, sprigDate, periodKey}]
  const [wins, setWins] = useState({});                     // { "<date>": [ {id,type,title,detail,source,createdAt,kudoed} ] }
  const [quickDayLogs, setQuickDayLogs] = useState([]);     // [{date, trainedToday, trainingType, ...}]
  const [dayStatus, setDayStatus] = useState({});           // { [date]: "logged"|"nothing"|"dismissed" }
  const [logGapSnoozes, setLogGapSnoozes] = useState([]);   // [{ date, snoozedUntil }]
  // Track keyboard inset at app level so food overlay can adjust its max-height.
  const kb = useKeyboardInset();
  // Ref for the "Describe food" textarea — lets us delay-focus after the sheet animation
  // settles, avoiding the iOS race where autoFocus fires before the keyboard is ready.
  const describeRef = useRef(null);
  useEffect(() => {
    if (foodOverlayMode !== "text") return;
    const t = setTimeout(() => {
      try { describeRef.current?.focus(); } catch (_) {}
    }, 320);
    return () => clearTimeout(t);
  }, [foodOverlayMode]);
  const fileRef = useRef(null);
  const labelRef = useRef(null);
  const suppLabelRef = useRef(null);
  const audioRef = useRef(null);   // AudioContext
  const alarmRef = useRef(null);   // alarm oscillator nodes
  const micRef = useRef(null);     // {stream, analyser, raf}
  const sessionRef = useRef(null); // mirror of session for intervals
  const tickRef = useRef(null);
  const entriesRef = useRef([]); // mirrors `entries` so persistEntries always sees the latest value
  useEffect(() => { entriesRef.current = entries; }, [entries]);
  // The "current day" Sprig logs against — a Sprig day, not a calendar day (see getSprigDate).
  // Late-night food/drink before the morning boundary counts toward the previous day.
  const latestSleepLog = sleepLogs.length ? sleepLogs[sleepLogs.length - 1] : null;
  const date = getSprigDate(Date.now(), latestSleepLog, profile?.dayResetMode || "after-wake");

  const targets = computeTargets(profile);

  // load
  useEffect(() => {
    (async () => {
      try {
        // Read the data version first; if missing, we're either fresh or pre-v2
        const verRaw = await store.get("sprig_data_version_v1");
        const ver = verRaw ? safeParse(verRaw, 0) : 0;
        // Read all keys (each one is independent — one bad key shouldn't kill the load)
        const p = await store.get("sprig_profile_v1");
        const lib = await store.get("sprig_meals_v1");
        const favm = await store.get("sprig_favorite_meals_v1");
        const log = await store.get("sprig_log_" + date);
        const hist = await store.get("sprig_history_v1");
        const sp = await store.get("sprig_supps_v1");
        const tk = await store.get("sprig_supptaken_" + date);
        const sl = await store.get("sprig_sleep_v1");
        const al = await store.get("sprig_alarm_v1");
        const wk = await store.get("sprig_workouts_v1");
        const aw = await store.get("sprig_active_workout_v1");
        const cr = await store.get("sprig_rests_v1");
        const rt = await store.get("sprig_routines_v1");
        const dy = await store.get("sprig_daily_" + date);
        const ws = await store.get("sprig_weightseries_v1");
        const ms = await store.get("sprig_measure_v1");
        const ph = await store.get("sprig_photos_v1");
        const hl = await store.get("sprig_health_v1");
        const pn = await store.get("sprig_pain_v1");
        const hc = await store.get("sprig_habitcfg_v1");
        const hd = await store.get("sprig_habitdone_v1");
        const fs = await store.get("sprig_focus_v1");
        const hb2raw = await store.get("sprig_habits_v2");
        const hc2raw = await store.get("sprig_habit_completions_v2");
        const wns = await store.get("sprig_wins_v1");
        const rm = await store.get("sprig_reminders_v1");
        const pp = await store.get("sprig_progress_photos_v1");
        const qdl = await store.get("sprig_quick_day_logs_v1");
        const tpRaw = await store.get("sprig_tracking_preferences_v1");

        // Parse everything with safe defaults — any corrupt key falls back to default
        const profileParsed = safeParse(p, null, asObject);
        if (profileParsed) { setProfile(migrateProfile(profileParsed, DEFAULT_PROFILE)); setOnboarded(true); }
        setLibrary(safeParse(lib, [], asArray));
        setFavoriteMeals(safeParse(favm, [], asArray));
        setEntries(safeParse(log, [], asArray));
        setHistory(safeParse(hist, [], asArray));
        setSupps(safeParse(sp, [], asArray));
        setTakenIds(safeParse(tk, [], asArray));
        setSleepLogs(safeParse(sl, [], asArray));
        setAlarm(migrateAlarm(safeParse(al, null)));
        setWorkouts(safeParse(wk, [], asArray));
        const ssl = await store.get("sprig_sport_sessions_v1");
        setSportSessionsLog(safeParse(ssl, [], asArray));
        setActiveWorkout(safeParse(aw, null, (v) => (v === null ? null : asObject(v))));
        setCustomRests(safeParse(cr, {}, asObject));
        setRoutines(safeParse(rt, [], asArray));
        setDaily(migrateDaily(safeParse(dy, null)));
        setWeightSeries(safeParse(ws, [], asArray));
        setMeasureSeries(safeParse(ms, [], asArray));
        setPhotoLog(safeParse(ph, [], asArray));
        setHealthSeries(safeParse(hl, [], asArray));
        setPainLogs(safeParse(pn, [], asArray));
        setHabitConfig(migrateHabitCfg(safeParse(hc, null)));
        setHabitDone(safeParse(hd, {}, asObject));
        setFocusSessions(safeParse(fs, [], asArray));
        // Load V2 habits — migrate from V1 if V2 is empty
        let parsedH2 = safeParse(hb2raw, [], asArray);
        let parsedHC2 = safeParse(hc2raw, [], asArray);
        if (!parsedH2.length) {
          const v1Cfg = safeParse(hc, null, asObject);
          const v1Done = safeParse(hd, {}, asObject);
          if (v1Cfg || Object.keys(v1Done).length) {
            const migrated = migrateHabitsV1toV2(v1Cfg, v1Done);
            parsedH2 = migrated.habits2;
            parsedHC2 = migrated.completions.length ? migrated.completions : parsedHC2;
            if (parsedH2.length) {
              await store.set("sprig_habits_v2", JSON.stringify(parsedH2));
              if (parsedHC2.length) await store.set("sprig_habit_completions_v2", JSON.stringify(parsedHC2));
            }
          }
        }
        setHabits2(parsedH2);
        setHabitCompletions(parsedHC2);
        setWins(safeParse(wns, {}, asObject));
        setProgressPhotos(safeParse(pp, [], asArray));
        setQuickDayLogs(safeParse(qdl, [], asArray));
        const dsRaw = await store.get("sprig_day_status_v1");
        const lgsRaw = await store.get("sprig_log_gap_snoozes_v1");
        setDayStatus(safeParse(dsRaw, {}, asObject));
        setLogGapSnoozes(safeParse(lgsRaw, [], asArray));
        // Tracking prefs — migrate from onboarding focusAreas if not yet explicitly saved
        const tpParsed = safeParse(tpRaw, null, asObject);
        const onbFocusAreas = profileParsed?.focusAreas || [];
        setTrackingPrefs(migrateTrackingPrefs(onbFocusAreas, tpParsed));
        setReminders((prev) => ({ ...prev, ...migrateReminders(safeParse(rm, null)) }));

        // Load last 7 days of food entries for the meal-shortcuts engine
        const eh = [];
        for (let i = 1; i <= 7; i++) {
          const dd = new Date(); dd.setDate(dd.getDate() - i);
          const ds = dd.toLocaleDateString("en-CA");
          const ent = await store.get("sprig_log_" + ds);
          const parsed = safeParse(ent, [], asArray);
          parsed.forEach((e) => eh.push({ ...e, date: ds }));
        }
        setEntriesHistory(eh);

        // If we just migrated forward, stamp the new version
        if (ver < DATA_VERSION) {
          try { await store.set("sprig_data_version_v1", JSON.stringify(DATA_VERSION)); } catch (_) { /* non-fatal */ }
        }
        setReady(true);
      } catch (err) {
        // Catastrophic load failure (storage API broken, quota error, etc.) → Safe Mode
        console.error("Sprig load error:", err);
        setLoadError({ message: err?.message || String(err), stack: err?.stack });
        setReady(true); // still render — Safe Mode card will show
      }
    })();
  }, []);

  // Subscribe to storage write failures so we can surface a banner.
  // The store falls back to in-memory on failure, so data isn't lost mid-session — but the user should know.
  useEffect(() => {
    return store.onWriteError((key) => {
      setWriteError((prev) => ({
        count: (prev?.count || 0) + 1,
        lastKey: key,
        lastTs: Date.now(),
      }));
    });
  }, []);

  // Track online/offline so AI calls can fail fast with a clear message and the rule-based coach takes over.
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine !== false : true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Auto-sync: push to Supabase 3 s after any key data slice changes (debounced).
  const { user: cloudUser } = useSupabaseAuth();
  const { isPremium } = useSubscription(cloudUser?.id);
  const [paywallOpen, setPaywallOpen] = useState(false);
  // Register for push notifications once when the user first signs in.
  const pushRegisteredRef = useRef(false);
  useEffect(() => {
    if (!cloudUser || pushRegisteredRef.current) return;
    pushRegisteredRef.current = true;
    const supabase = getSupabase();
    registerPushNotifications(supabase, cloudUser.id);
  }, [cloudUser]);
  const [syncStatus, setSyncStatus] = useState("idle"); // "idle" | "syncing" | "synced" | "error"
  const syncTimerRef = useRef(null);
  const syncClearRef = useRef(null);
  useEffect(() => {
    if (!ready || !cloudUser) return;
    clearTimeout(syncTimerRef.current);
    clearTimeout(syncClearRef.current);
    setSyncStatus("syncing");
    syncTimerRef.current = setTimeout(async () => {
      const r = await syncToCloud();
      setSyncStatus(r.ok ? "synced" : "error");
      syncClearRef.current = setTimeout(() => setSyncStatus("idle"), 4000);
    }, 3000);
  }, [
    ready, cloudUser,
    entries, history, workouts, sleepLogs, daily, weightSeries,
    profile, supps, routines, habitCompletions, wins, painLogs,
    measureSeries, healthSeries, focusSessions, habits2, habitDone,
    sportSessionsLog, quickDayLogs, dayStatus,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Account nudge: prompt unauthenticated users to sign up after they have meaningful data.
  const [showAccountNudge, setShowAccountNudge] = useState(false);
  useEffect(() => {
    if (!ready || cloudUser || !supabaseConfigured()) return;
    try {
      const perm = localStorage.getItem("sprig_account_nudge_v1");
      if (perm === "dismissed") return;
      const snoozeUntil = localStorage.getItem("sprig_account_nudge_snooze");
      if (snoozeUntil && Date.now() < Number(snoozeUntil)) return;
    } catch (_) { return; }
    const hasData = entries.length >= 3 || workouts.length >= 1 || sleepLogs.length >= 1;
    if (hasData) setShowAccountNudge(true);
  }, [ready, cloudUser, entries.length, workouts.length, sleepLogs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistEntries = useCallback(async (nextOrUpdater) => {
    // Accept either an array or an updater fn. Reading from the ref avoids dropped writes when
    // two events fire before React commits — both callers see the freshest entries.
    const prev = entriesRef.current;
    const next = typeof nextOrUpdater === "function" ? nextOrUpdater(prev) : nextOrUpdater;
    entriesRef.current = next;
    setEntries(next);
    await store.set("sprig_log_" + date, JSON.stringify(next));
    const t = dayTotals(next);
    const others = (history || []).filter((h) => h.date !== date);
    const nh = [...others, { date, calories: t.calories, protein: t.protein, carbs: t.carbs, fat: t.fat }]
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    setHistory(nh);
    await store.set("sprig_history_v1", JSON.stringify(nh));
  }, [date, history]);

  const persistLibrary = async (next) => { setLibrary(next); await store.set("sprig_meals_v1", JSON.stringify(next)); };

  // ---- Favorite meals (sprig_favorite_meals_v1) ----
  const persistFavoriteMeals = async (next) => { setFavoriteMeals(next); await store.set("sprig_favorite_meals_v1", JSON.stringify(next)); };
  // Build a favorite record from a logged entry or a manual form.
  function makeFavorite(src) {
    return {
      id: uid(),
      name: (src.name || "Meal").trim(),
      serving: src.serving || "1 serving",
      calories: Math.round(+src.calories || 0),
      protein_g: Math.round(+(src.protein_g ?? src.protein) || 0),
      carbs_g: Math.round(+(src.carbs_g ?? src.carbs) || 0),
      fat_g: Math.round(+(src.fat_g ?? src.fat) || 0),
      fiber_g: Math.round(+(src.fiber_g ?? src.fiber) || 0),
      micros: src.micros && typeof src.micros === "object" ? normalizeMicros(src.micros) : {},
      omega3: src.omega3 ?? null,
      tags: Array.isArray(src.tags) ? src.tags : [],
      createdTs: Date.now(),
      lastUsedTs: null,
      useCount: 0,
    };
  }
  // Save a favorite. If a favorite with the same (case-insensitive) name exists, ask replace/copy.
  function saveFavoriteMeal(src, { onDuplicate } = {}) {
    const fav = makeFavorite(src);
    const existing = favoriteMeals.find((f) => f.name.toLowerCase() === fav.name.toLowerCase());
    if (existing && onDuplicate) { onDuplicate(fav, existing); return; }
    persistFavoriteMeals([fav, ...favoriteMeals]);
    logged("Favorite saved", "success");
    return fav;
  }
  function replaceFavoriteMeal(existingId, src) {
    const fav = makeFavorite(src);
    persistFavoriteMeals(favoriteMeals.map((f) => (f.id === existingId ? { ...fav, id: existingId, createdTs: f.createdTs, useCount: f.useCount, lastUsedTs: f.lastUsedTs } : f)));
  }
  function updateFavoriteMeal(id, patch) {
    persistFavoriteMeals(favoriteMeals.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function removeFavoriteMeal(id) {
    const f = favoriteMeals.find((x) => x.id === id);
    persistFavoriteMeals(favoriteMeals.filter((x) => x.id !== id));
    if (f) queueUndo("favorite", f, () => persistFavoriteMeals([f, ...favoriteMeals.filter((x) => x.id !== id)]));
  }
  // Add a favorite to today's food log — counts toward calories/macros/micros — and bump usage.
  function addFavoriteToToday(id) {
    const f = favoriteMeals.find((x) => x.id === id);
    if (!f) return;
    const entry = {
      id: uid(), name: f.name, serving: f.serving,
      calories: f.calories, protein_g: f.protein_g, carbs_g: f.carbs_g, fat_g: f.fat_g, fiber_g: f.fiber_g,
      micros: f.micros || {}, omega3: f.omega3 ?? null, mult: 1, time: Date.now(),
    };
    persistEntries((prev) => [...prev, entry]);
    persistFavoriteMeals(favoriteMeals.map((x) => (x.id === id ? { ...x, useCount: (x.useCount || 0) + 1, lastUsedTs: Date.now() } : x)));
    setFoodSub("nutrition");
    setFlashEntryId(entry.id); setTimeout(() => setFlashEntryId((eid) => (eid === entry.id ? null : eid)), 2200);
    logged("Meal added", "light");
  }
  // Favorite create/edit modal — rendered at the app-frame level (not inside the scrolled
  // Nutrition tab, where an overflow:hidden ancestor was clipping the fixed modal so taps did nothing).
  const [favForm, setFavForm] = useState(null);     // { ...fields } while creating/editing
  const [favEditing, setFavEditing] = useState(null); // "new" | favorite id
  const [favDup, setFavDup] = useState(null);        // { form, existing } duplicate-name prompt
  function openCreateFavorite() { setFavEditing("new"); setFavForm({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "", fiber: "", tags: [] }); }
  // Open the favorite form pre-filled from an analysis result (Snap/Scan/Describe), so the user
  // can review/edit name, serving, calories, macros before saving. Micros ride along on the form.
  function openFavoriteFromResult(r) {
    setFavEditing("new");
    setFavForm({
      name: r.name || "", serving: r.serving || "1 serving",
      calories: r.calories != null ? String(Math.round(r.calories)) : "",
      protein: r.protein_g != null ? String(Math.round(r.protein_g)) : "",
      carbs: r.carbs_g != null ? String(Math.round(r.carbs_g)) : "",
      fat: r.fat_g != null ? String(Math.round(r.fat_g)) : "",
      fiber: r.fiber_g != null ? String(Math.round(r.fiber_g)) : "",
      tags: [],
      micros: normalizeMicros(r.micros), omega3: r.omega3 ?? null,
    });
    setResult(null); setFavoriteMode(false);
  }
  // "New favorite" opens a small chooser (Snap / Scan / Describe / Manual), mirroring food logging.
  const [favChooser, setFavChooser] = useState(false);
  function openFavoriteChooser() { setFavChooser(true); }
  function chooseFavoriteSource(src) {
    setFavChooser(false);
    if (src === "manual") { openCreateFavorite(); return; }
    // route through the SAME analysis flows as normal logging, but flag favoriteMode so the
    // result is saved as a favorite rather than logged to today.
    setFavoriteMode(true); setResult(null);
    setTab("nutrition");
    if (src === "snap") { setFoodOverlayMode(null); setTimeout(() => captureNativePhoto("photo", fileRef), 0); }
    else if (src === "scan") { setFoodOverlayMode(null); setTimeout(() => labelRef.current?.click(), 0); }
    else if (src === "describe") { setFoodOverlayMode("text"); }
  }
  function openEditFavorite(f) { setFavEditing(f.id); setFavForm({ name: f.name, serving: f.serving, calories: f.calories, protein: f.protein_g, carbs: f.carbs_g, fat: f.fat_g, fiber: f.fiber_g, tags: f.tags || [] }); }
  function closeFavForm() { setFavForm(null); setFavEditing(null); }
  const saveProfile = async (p) => {
    setProfile(p);
    const json = JSON.stringify(p);
    await store.set("sprig_profile_v1", json);
    // Re-schedule notifications whenever profile changes (only if any notif pref exists)
    if (p.notifMeal != null || p.notifWorkout != null || p.notifHydration != null) {
      scheduleLocalNotifications(p);
    }
  };

  // ---- data export / import / reset ----
  async function gatherAllData() {
    // collect every sprig_* key (handles date-keyed logs too)
    let keys = await store.list("sprig_");
    if (!keys.length) {
      // fallback: known static keys + recent date-keyed ones
      const statics = ["sprig_profile_v1", "sprig_tracking_preferences_v1", "sprig_meals_v1", "sprig_favorite_meals_v1", "sprig_history_v1", "sprig_supps_v1", "sprig_sleep_v1", "sprig_alarm_v1", "sprig_workouts_v1", "sprig_rests_v1", "sprig_routines_v1", "sprig_weightseries_v1", "sprig_measure_v1", "sprig_photos_v1", "sprig_health_v1", "sprig_pain_v1", "sprig_habitcfg_v1", "sprig_habitdone_v1", "sprig_habits_v2", "sprig_habit_completions_v2", "sprig_focus_v1", "sprig_coach_notes_v1", "sprig_wins_v1"];
      const dated = [];
      for (let i = 0; i < 90; i++) { const dd = new Date(); dd.setDate(dd.getDate() - i); const ds = dd.toLocaleDateString("en-CA"); dated.push("sprig_log_" + ds, "sprig_daily_" + ds, "sprig_supptaken_" + ds); }
      keys = [...statics, ...dated];
    }
    const out = {};
    for (const k of keys) { const v = await store.get(k); if (v != null) out[k] = v; }
    return out;
  }
  async function exportJSON() {
    const data = await gatherAllData();
    // Include quick day logs in backup
    const qdlRaw = await store.get("sprig_quick_day_logs_v1");
    const qdlParsed = safeParse(qdlRaw, [], asArray);
    if (qdlParsed.length) data["sprig_quick_day_logs_v1"] = JSON.stringify(qdlParsed);
    const blob = { app: "Vitae", version: 1, exportedAt: new Date().toISOString(), data };
    downloadFile(`sprig-backup-${todayStr()}.json`, JSON.stringify(blob, null, 2), "application/json");
  }
  function exportCSV(kind) {
    let rows = [];
    if (kind === "workouts") {
      rows.push(["date", "exercise", "set", "weight", "reps", "rir"]);
      workouts.forEach((w) => w.exercises.forEach((ex) => ex.sets.forEach((s, i) => rows.push([w.date || new Date(w.ts).toLocaleDateString("en-CA"), ex.name, i + 1, s.w, s.reps, s.rir ?? ""]))));
    } else if (kind === "weight") {
      rows.push(["date", "kg"]); weightSeries.forEach((s) => rows.push([s.date, s.kg]));
    } else if (kind === "nutrition") {
      rows.push(["date", "calories", "protein_g"]); history.forEach((h) => rows.push([h.date, h.calories, h.protein]));
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    downloadFile(`sprig-${kind}-${todayStr()}.csv`, csv, "text/csv");
  }
  function downloadFile(name, content, type) {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { /* ignore in non-DOM env */ }
  }
  async function importJSON(file) {
    let parsed;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (e) {
      setWriteError({ key: "import", msg: "That file isn't valid JSON. Pick a backup file exported from Vitae.", quota: false, ts: Date.now() });
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      setWriteError({ key: "import", msg: "That file doesn't look like a Vitae backup.", quota: false, ts: Date.now() });
      return;
    }
    const data = parsed.data || parsed;
    let wrote = 0;
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith("sprig_")) { await store.set(k, v); wrote += 1; }
    }
    if (wrote === 0) {
      setWriteError({ key: "import", msg: "No Vitae data found in that file.", quota: false, ts: Date.now() });
      return;
    }
    window.location && window.location.reload ? window.location.reload() : null;
  }
  async function resetAllData() {
    const keys = await gatherAllData();
    for (const k of Object.keys(keys)) await store.delete(k);
    window.location && window.location.reload ? window.location.reload() : null;
  }
  async function loadDemoData() {
    await seedDemoData(store);
    if (window.location && window.location.reload) window.location.reload();
  }

  // Apply data synced from Apple Health / Google Health Connect
  function applyHealthSync(data) {
    if (!data) return;
    if (data.steps) {
      const today = new Date().toLocaleDateString("en-CA");
      const todaySteps = data.steps[today];
      if (todaySteps != null) {
        persistDaily({ steps: Math.max(daily?.steps || 0, todaySteps) });
      }
    }
    if (data.weights?.length) {
      const today = new Date().toLocaleDateString("en-CA");
      const todayWeight = data.weights.find((w) => w.date === today);
      // Merge historical weight points directly into the series
      const others = data.weights.filter((w) => w.date !== today);
      if (others.length) {
        const raw = [...weightSeries];
        others.forEach(({ date: d, kg }) => {
          if (!raw.find((w) => w.date === d)) raw.push({ date: d, kg });
        });
        const ns = raw.sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
        setWeightSeries(ns);
        store.set("sprig_weightseries_v1", JSON.stringify(ns)).catch(() => {});
      }
      if (todayWeight && !daily.weight) {
        persistDaily({ ...daily, weight: todayWeight.kg });
      }
    }
    if (data.sleep?.length) {
      const toAdd = data.sleep
        .map((log) => {
          const dur = Math.round((log.wakeTs - log.bedTs) / 60000);
          if (dur < 60 || dur > 660) return null;
          return { id: `health_${log.bedTs}`, bedTs: log.bedTs, wakeTs: log.wakeTs, durationMin: dur, score: 70, source: "health_sync" };
        })
        .filter(Boolean);
      if (toAdd.length) {
        const merged = [...sleepLogs.filter((l) => !toAdd.find((n) => n.id === l.id)), ...toAdd];
        persistSleep(merged);
      }
    }
  }

  // ── DEV TOOLS — hidden behind 5-tap on disclaimer in Settings ─────────────
  async function devSeedFullDay() {
    const today = new Date().toLocaleDateString("en-CA");
    // Add 3 food entries covering protein/calories/fiber targets
    const foods = [
      { id: uid(), name: "Chicken breast (200g)", serving: "200g", calories: 330, protein_g: 62, carbs_g: 0, fat_g: 7, fiber_g: 0, micros: {}, omega3: 0, mult: 1, time: Date.now() - 36e5 * 5 },
      { id: uid(), name: "Brown rice (150g)", serving: "150g", calories: 170, protein_g: 4, carbs_g: 36, fat_g: 1, fiber_g: 3, micros: {}, omega3: 0, mult: 1, time: Date.now() - 36e5 * 3 },
      { id: uid(), name: "Greek yogurt (200g)", serving: "200g", calories: 130, protein_g: 20, carbs_g: 8, fat_g: 2, fiber_g: 0, micros: {}, omega3: 0, mult: 1, time: Date.now() - 36e5 * 1 },
      { id: uid(), name: "Oats with banana", serving: "bowl", calories: 380, protein_g: 12, carbs_g: 70, fat_g: 6, fiber_g: 8, micros: {}, omega3: 0, mult: 1, time: Date.now() - 36e5 * 7 },
      { id: uid(), name: "Broccoli & egg stir-fry", serving: "plate", calories: 290, protein_g: 22, carbs_g: 14, fat_g: 14, fiber_g: 7, micros: {}, omega3: 0, mult: 1, time: Date.now() - 36e5 * 2 },
    ];
    await persistEntries((prev) => {
      const todayEntries = prev.filter((e) => { try { return new Date(e.time).toLocaleDateString("en-CA") !== today; } catch { return true; } });
      return [...todayEntries, ...foods];
    });
    // Add a sleep log for last night
    const wakeTs = Date.now() - 36e5 * 7;
    const sleepTs = wakeTs - 60 * 27000; // ~7.5h sleep
    const newSleep = { id: uid(), startTime: sleepTs, waketime: wakeTs, durationMin: 450, score: 82, bedtime: sleepTs, stages: {}, manual: true };
    await persistSleep([...sleepLogs.filter((l) => Math.abs(l.waketime - wakeTs) > 36e5 * 12), newSleep]);
    // Add a workout
    const newWorkout = { id: uid(), ts: Date.now() - 36e5 * 6, label: "Upper Body", exercises: [
      { name: "Bench Press", group: "chest", sets: [{ w: 80, reps: 8, rir: 2 }, { w: 80, reps: 8, rir: 2 }, { w: 75, reps: 10, rir: 1 }] },
      { name: "Barbell Row", group: "back", sets: [{ w: 70, reps: 8, rir: 2 }, { w: 70, reps: 8, rir: 2 }] },
      { name: "Overhead Press", group: "shoulders", sets: [{ w: 50, reps: 8, rir: 2 }, { w: 50, reps: 8, rir: 2 }] },
    ]};
    await persistWorkouts([...workouts.filter((w) => Math.abs(w.ts - newWorkout.ts) > 36e5 * 18), newWorkout]);
    // Daily: water + steps
    await persistDaily({ ...daily, water: 2400, steps: 8500, date: today });
    showToast("Full exact day seeded ✓", "success");
  }

  async function devSeedQuickLogDay() {
    const today = new Date().toLocaleDateString("en-CA");
    const ql = { date: today, hitProtein: true, hitCalories: true, enoughSleep: true, enoughMovement: true, trainedToday: true, trainType: "upper_body", noAlcohol: true, savedAt: Date.now() };
    await persistQuickDayLog(ql);
    showToast("Quick Log day seeded ✓", "success");
  }

  async function devClearToday() {
    const today = new Date().toLocaleDateString("en-CA");
    await persistEntries((prev) => prev.filter((e) => { try { return new Date(e.time).toLocaleDateString("en-CA") !== today; } catch { return true; } }));
    await persistQuickDayLog({ date: today, _cleared: true }); // minimal placeholder so QL is "empty"
    await persistDaily({ date: today });
    showToast("Today cleared ✓", "success");
  }
  // ── END DEV TOOLS ──────────────────────────────────────────────────────────

  // undo queue — recent deletes show a one-tap undo for ~6s
  const [undoItem, setUndoItem] = useState(null);
  function queueUndo(kind, data, restore) {
    setUndoItem({ kind, data, restore, ts: Date.now() });
    setTimeout(() => setUndoItem((u) => (u && Date.now() - u.ts >= 5500 ? null : u)), 6000);
  }
  // Calm success/info toast — "Saved", "Meal added", "Synced to cloud", etc.
  const [toast, setToast] = useState(null); // { text, tone, ts }
  function showToast(text, tone = "success") {
    const ts = Date.now();
    setToast({ text, tone, ts });
    setTimeout(() => setToast((tt) => (tt && tt.ts === ts ? null : tt)), 2600);
  }
  // Centralized haptics — respects the Haptics on/off setting (default on). Named patterns keep
  // the feedback consistent across the app (a light tap for logs, a double-buzz for completions, etc).
  function haptic(kind = "tap") { buzz(kind); }
  // keep the module-level flag in sync with the user's setting so child cards can buzz too
  useEffect(() => { HAPTICS_ON = profile?.haptics !== false; }, [profile?.haptics]);
  // Combined helper: tiny success toast + matching haptic, the standard "logged something" feedback.
  function logged(text, kind = "success") { showToast(text, "success"); haptic(kind); }
  // Mistake detection (Fix 9): for obviously-unusual values we ask "Save anyway?" rather than
  // blocking. pendingConfirm = { message, onConfirm } when a confirmation is showing.
  const [pendingConfirm, setPendingConfirm] = useState(null);
  function askConfirm(message, onConfirm) { setPendingConfirm({ message, onConfirm }); }
  // write-error toast — fires when a store.set silently fell back to memory-only.
  // The store keeps a subscription API and can have multiple listeners; we use it instead of
  // overwriting the hook directly so other code that subscribes (e.g. for telemetry) keeps working.
  useEffect(() => {
    const unsubscribe = store.onWriteError((key, err) => {
      try {
        const msg = err?.message || String(err);
        const quota = /quota|size|too large|5MB/i.test(msg);
        setWriteError({ key, msg, quota, ts: Date.now() });
      } catch (_) { /* ignore */ }
    });
    return unsubscribe;
  }, []);
  const persistSupps = async (next) => { setSupps(next); await store.set("sprig_supps_v1", JSON.stringify(next)); };
  const persistTaken = async (next) => { setTakenIds(next); await store.set("sprig_supptaken_" + date, JSON.stringify(next)); };

  // daily extras
  const writeDaily = useCallback(async (patch) => {
    const next = { ...daily, ...patch, lastTouchTs: Date.now() };
    setDaily(next);
    await store.set("sprig_daily_" + date, JSON.stringify(next));
    // Sync sport session additions/deletions to the cross-day flat log in one atomic pass.
    // Deletion is matched by ID against daily.sportSessions (before patch), NOT by date, so
    // timezone differences between the session's UTC date and the app's local date never cause
    // deleted sessions to linger in the log and ghost-fatigue Recovery by Muscle.
    if (patch.sportSessions && Array.isArray(patch.sportSessions)) {
      const existingIds = new Set(sportSessionsLog.map(s => s.id).filter(Boolean));
      const prevIds     = new Set((daily.sportSessions || []).map(s => s.id).filter(Boolean));
      const patchIds    = new Set(patch.sportSessions.map(s => s.id).filter(Boolean));
      const newOnes     = patch.sportSessions.filter(s => s.id && !existingIds.has(s.id));
      // Sessions that were in daily.sportSessions before this patch but are gone now — user deleted them
      const deletedIds  = new Set([...prevIds].filter(id => !patchIds.has(id)));
      if (newOnes.length || deletedIds.size) {
        const cutoff = Date.now() - 90 * 864e5;
        const nextLog = [
          ...sportSessionsLog.filter(s => (s.ts || 0) > cutoff && !(s.id && deletedIds.has(s.id))),
          ...newOnes,
        ];
        setSportSessionsLog(nextLog);
        await store.set("sprig_sport_sessions_v1", JSON.stringify(nextLog));
      }
    }
    // keep a 60-day weight series for the trend
    if (patch.weight != null) {
      const raw = await store.get("sprig_weightseries_v1");
      const series = safeParse(raw, [], asArray);
      const others = series.filter((s) => s.date !== date);
      const ns = [...others, { date, kg: patch.weight }].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
      await store.set("sprig_weightseries_v1", JSON.stringify(ns));
      setWeightSeries(ns);
    }
  }, [daily, date, sportSessionsLog, setSportSessionsLog]);
  // persistDaily wraps writeDaily with obvious-mistake checks (Fix 9). Unusual values prompt
  // "This looks unusual. Save anyway?" instead of being blocked.
  const persistDaily = useCallback(async (patch) => {
    let warn = null;
    if (patch.weight != null) {
      const lastW = [...(weightSeries || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0]?.kg;
      if (lastW != null && Math.abs(patch.weight - lastW) > 5) warn = `That's a ${Math.abs(Math.round((patch.weight - lastW) * 10) / 10)}${profile?.unit === "lb" ? "lb" : "kg"} change from your last weigh-in. Save anyway?`;
    }
    if (!warn && patch.water != null && patch.water - (daily?.water || 0) > 3000) warn = "That adds over 3,000 ml of water at once. Save anyway?";
    if (!warn && patch.steps != null && patch.steps > 50000) warn = "Over 50,000 steps is unusual. Save anyway?";
    if (!warn && patch.alcohol_g != null && patch.alcohol_g - (daily?.alcohol_g || 0) > 200) warn = "That's a very high amount of alcohol. Save anyway?";
    if (warn) { askConfirm(warn, () => writeDaily(patch)); return; }
    return writeDaily(patch);
  }, [daily, date, weightSeries, profile, writeDaily]);
  const setCheckin = (k, v) => writeDaily({ checkin: { ...daily.checkin, [k]: v } });

  // ---- WINS: record (dedupe by type per day) + kudos toggle ----
  const persistWins = useCallback(async (next) => { setWins(next); try { await store.set("sprig_wins_v1", JSON.stringify(next)); } catch (_) {} }, []);
  const recordWins = useCallback((candidates, forDate = date) => {
    if (!candidates || !candidates.length) return [];
    if (profile?.showWins === false) return [];
    const { merged, added } = mergeWins(wins[forDate] || [], candidates);
    if (!added.length) return [];
    persistWins({ ...wins, [forDate]: merged });
    return added;
  }, [wins, date, profile, persistWins]);
  const kudoWin = useCallback((winId, forDate = date) => {
    const dayWins = wins[forDate] || [];
    const idx = dayWins.findIndex((w) => w.id === winId);
    if (idx < 0) return;
    const w = dayWins[idx];
    if (w.kudoed) return;
    const next = { ...wins, [forDate]: dayWins.map((x) => (x.id === winId ? { ...x, kudoed: true } : x)) };
    persistWins(next);
    if (profile?.haptics !== false) buzz("success");
  }, [wins, date, profile, persistWins]);

  // body measurements + progress photos
  const saveMeasurement = async (entry) => {
    // entry: { waist?, chest?, ... } — merge into today's record
    const others = measureSeries.filter((m) => m.date !== date);
    const today = measureSeries.find((m) => m.date === date) || { date };
    const next = [...others, { ...today, ...entry }].sort((a, b) => a.date.localeCompare(b.date)).slice(-120);
    setMeasureSeries(next);
    await store.set("sprig_measure_v1", JSON.stringify(next));
  };
  const logPhotoSet = async (kinds) => {
    const others = photoLog.filter((p) => p.date !== date);
    const today = photoLog.find((p) => p.date === date) || { date, kinds: [] };
    const merged = Array.from(new Set([...today.kinds, ...kinds]));
    const next = [...others, { ...today, kinds: merged }].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
    setPhotoLog(next);
    await store.set("sprig_photos_v1", JSON.stringify(next));
  };

  // health markers: merge patch into today's record
  const saveHealth = async (patch) => {
    const others = healthSeries.filter((h) => h.date !== date);
    const today = healthSeries.find((h) => h.date === date) || { date };
    // deep-merge `blood` sub-object so partial blood-work updates don't wipe other values
    const blood = { ...(today.blood || {}), ...(patch.blood || {}) };
    const merged = { ...today, ...patch, blood };
    if (Object.keys(blood).length === 0) delete merged.blood;
    const next = [...others, merged].sort((a, b) => a.date.localeCompare(b.date)).slice(-180);
    setHealthSeries(next);
    await store.set("sprig_health_v1", JSON.stringify(next));
  };



  // pain logs
  const persistPain = async (next) => { setPainLogs(next); await store.set("sprig_pain_v1", JSON.stringify(next)); };
  function addPainLog(entry) {
    const log = { id: uid(), ts: Date.now(), date, status: "active", ...entry };
    const next = [...painLogs, log].slice(-200);
    persistPain(next);
    return log;
  }
  function updatePainLog(id, patch) {
    persistPain(painLogs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  const removePainLog = (id) => {
    const p = painLogs.find((x) => x.id === id);
    persistPain(painLogs.filter((x) => x.id !== id));
    if (p) queueUndo("pain", p, () => persistPain([...painLogs.filter((x) => x.id !== id), p]));
  };

  // habits
  const persistHabitCfg = async (next) => { setHabitConfig(next); await store.set("sprig_habitcfg_v1", JSON.stringify(next)); };
  const persistHabitDone = async (next) => { setHabitDone(next); await store.set("sprig_habitdone_v1", JSON.stringify(next)); };
  function toggleHabit(id) {
    const list = new Set(habitDone[date] || []);
    if (list.has(id)) list.delete(id); else list.add(id);
    persistHabitDone({ ...habitDone, [date]: Array.from(list) });
  }
  function addHabit(label) {
    const clean = label.trim(); if (!clean) return;
    const cfg = habitConfig || { custom: [], hidden: [] };
    persistHabitCfg({ ...cfg, custom: [...(cfg.custom || []), { id: "c_" + uid(), label: clean }] });
  }
  function removeHabit(id) {
    const cfg = habitConfig || { custom: [], hidden: [] };
    if (id.startsWith("c_")) persistHabitCfg({ ...cfg, custom: (cfg.custom || []).filter((c) => c.id !== id) });
    else persistHabitCfg({ ...cfg, hidden: Array.from(new Set([...(cfg.hidden || []), id])) });
  }
  function restoreHabit(id) {
    const cfg = habitConfig || { custom: [], hidden: [] };
    persistHabitCfg({ ...cfg, hidden: (cfg.hidden || []).filter((h) => h !== id) });
  }

  // Habits V2
  const persistHabits2 = async (next) => { setHabits2(next); await store.set("sprig_habits_v2", JSON.stringify(next)); };
  const persistHabitCompletions = async (next) => { setHabitCompletions(next); await store.set("sprig_habit_completions_v2", JSON.stringify(next)); };
  function toggleHabit2(habitId, dateStr) {
    const habit = habits2.find((h) => h.id === habitId);
    if (!habit) return;
    const pk = habitPeriodKey(habit.frequencyType || "daily", dateStr);
    const ft = habit.frequencyType || "daily";
    // For daily + specific_days: toggle today's completion; for others: add one completion per tap
    const existing = ft === "daily" || ft === "specific_days"
      ? habitCompletions.find((c) => c.habitId === habitId && c.sprigDate === dateStr)
      : null;
    if (existing) {
      persistHabitCompletions(habitCompletions.filter((c) => c.id !== existing.id));
    } else {
      persistHabitCompletions([...habitCompletions, { id: uid(), habitId, completedAt: Date.now(), sprigDate: dateStr, periodKey: pk, notes: "" }]);
      logged("Habit completed", "light");
    }
  }
  function addHabit2(def) {
    const h = { id: "h_" + uid(), name: (def.name || "").trim() || "Habit", category: def.category || "custom", frequencyType: def.frequencyType || "daily", weeklyTarget: def.weeklyTarget || null, specificDays: def.specificDays || null, reminderEnabled: !!def.reminderEnabled, reminderTime: def.reminderTime || null, createdAt: Date.now(), archived: false, autoHabit: false, autoType: def.autoType || null, notes: def.notes || "" };
    persistHabits2([...habits2, h]);
  }
  function editHabit2(id, patch) { persistHabits2(habits2.map((h) => h.id === id ? { ...h, ...patch } : h)); }
  function archiveHabit2(id) { persistHabits2(habits2.map((h) => h.id === id ? { ...h, archived: true } : h)); }
  function restoreHabit2(id) { persistHabits2(habits2.map((h) => h.id === id ? { ...h, archived: false } : h)); }
  function deleteHabit2(id) {
    persistHabits2(habits2.filter((h) => h.id !== id));
    persistHabitCompletions(habitCompletions.filter((c) => c.habitId !== id));
  }
  // Un-do a completion for weekly_x / weekly / monthly habits
  function undoHabitCompletion(habitId, periodKey) {
    const last = habitCompletions.filter((c) => c.habitId === habitId && c.periodKey === periodKey).slice(-1)[0];
    if (last) persistHabitCompletions(habitCompletions.filter((c) => c.id !== last.id));
  }

  // focus sessions
  const logFocus = async (minutes, label) => {
    const next = [...focusSessions, { id: uid(), ts: Date.now(), date, minutes, label: label || "Deep work" }].slice(-300);
    setFocusSessions(next);
    await store.set("sprig_focus_v1", JSON.stringify(next));
  };
  // Quick Day Log persist — upsert by date
  const persistQuickDayLog = async (ql) => {
    const next = [...quickDayLogs.filter((q) => q.date !== ql.date), ql].slice(-90);
    setQuickDayLogs(next);
    await store.set("sprig_quick_day_logs_v1", JSON.stringify(next));
  };

  const persistDayStatus = async (next) => {
    setDayStatus(next);
    try { await store.set("sprig_day_status_v1", JSON.stringify(next)); } catch (_) {}
  };
  const persistLogGapSnoozes = async (next) => {
    setLogGapSnoozes(next);
    try { await store.set("sprig_log_gap_snoozes_v1", JSON.stringify(next)); } catch (_) {}
  };

  const persistTrackingPrefs = async (next) => {
    const merged = { ...DEFAULT_TRACKING_PREFS, ...next, updatedAt: Date.now() };
    setTrackingPrefs(merged);
    try { await store.set("sprig_tracking_preferences_v1", JSON.stringify(merged)); } catch (_) {}
  };

  const persistReminders = async (next) => { setReminders(next); await store.set("sprig_reminders_v1", JSON.stringify(next)); };
  const addProgressPhoto = async (p) => {
    const next = [...progressPhotos, p].slice(-60);
    setProgressPhotos(next); await store.set("sprig_progress_photos_v1", JSON.stringify(next));
  };
  const removeProgressPhoto = async (id) => {
    const prev = progressPhotos.find((x) => x.id === id);
    const next = progressPhotos.filter((p) => p.id !== id);
    setProgressPhotos(next); await store.set("sprig_progress_photos_v1", JSON.stringify(next));
    if (prev) queueUndo("photo", prev, async () => { const restored = [...next, prev]; setProgressPhotos(restored); await store.set("sprig_progress_photos_v1", JSON.stringify(restored)); });
  };
  // ask-the-coach handler — sends user-facing context to the existing analyze() call
  // Free tier: 5 AI coach questions per calendar month.
  const FREE_COACH_LIMIT = 5;
  function getCoachCount() {
    try {
      const key = "sprig_coach_queries_" + new Date().toISOString().slice(0, 7);
      return parseInt(localStorage.getItem(key) || "0", 10);
    } catch (_) { return 0; }
  }
  function incrementCoachCount() {
    try {
      const key = "sprig_coach_queries_" + new Date().toISOString().slice(0, 7);
      localStorage.setItem(key, String(getCoachCount() + 1));
    } catch (_) {}
  }

  async function askCoach(question, ctx) {
    // Enforce free-tier coach limit for non-premium users.
    if (!isPremium && getCoachCount() >= FREE_COACH_LIMIT) {
      setPaywallOpen(true);
      return localCoachAnswer(question, ctx);
    }
    // AI-FIRST. Every real coaching question goes to the model with the user's full structured context.
    // The model decides what's relevant — no more pre-routing by topic or canned templates.
    // localCoachAnswer is reserved for actual API failure + a few simple math/explainer cases.
    //
    // IMPORTANT: we do NOT short-circuit on navigator.onLine here. iOS Safari (and PWAs on iOS in
    // particular) frequently report onLine === false even when connectivity is fine, which would
    // wrongly send every question to the local fallback. Better to actually try the network and
    // fall back on a real error.

    const system = "You are Vitae Coach, an elite evidence-based coach. Answer the user's question directly. Use the user's data only when relevant. Do not give a full audit unless asked. Do not use canned templates. Think like a real coach reviewing a client's data. Never invent exact numbers for anything marked quick_log, unknown, or disabled in dataQuality — speak in estimates for those. Do not diagnose injuries or medical conditions; for sharp pain, swelling, suspected injury, or any serious/worsening symptom, recommend rest and seeing a doctor or physiotherapist instead of guessing a cause.";

    // Structured coaching context. We hand the model the whole picture and let it choose what to use.
    // Keys are deliberately readable so the model interprets them correctly.
    const sleepLastHr = ctx?.sleepLastMin != null ? +(ctx.sleepLastMin / 60).toFixed(1) : null;
    const sleepAvgHr = ctx?.sleepAvg != null ? +(ctx.sleepAvg / 60).toFixed(1) : null;
    const coachingContext = {
      profile: profile ? {
        sex: profile.sex, age: profile.age,
        heightCm: profile.height, weightKg: profile.weight,
        activity: profile.activity, experience: profile.experience,
        focus: profile.focus, goal: profile.goal,
      } : null,
      targets: targets ? {
        calories: targets.calories, protein_g: targets.protein,
        carbs_g: targets.carbs, fat_g: targets.fat, fiber_g: targets.fiber,
      } : null,
      today: ctx?.today || null,
      averages14d: trackingPrefs.nutrition !== false ? {
        calories: ctx?.calAvg ?? null,
        protein_g: ctx?.protAvg ?? null,
      } : null,
      sleep: trackingPrefs.sleep !== false ? {
        lastNightHr: sleepLastHr,
        avg7dHr: sleepAvgHr,
        debtMin: ctx?.sleepDebt ?? null,
      } : null,
      bodyWeight: {
        currentKg: profile?.weight ?? null,
        trendKgPerWeek: ctx?.weightRate ?? null,
      },
      training: {
        workoutsThisWeek: ctx?.weeklyWk ?? null,
        stalledLifts: ctx?.stalls || [],
        muscleRecovery: ctx?.muscleRecovery || null,
        trainedToday: ctx?.trainedToday ?? null,
        sportSessionsToday: ctx?.today?.sportSessions || null,
      },
      flags: {
        painActive: !!ctx?.painActive,
        painNotes: ctx?.painNotes || null,
      },
      supplements: ctx?.supplements || null,
      healthReport: healthReport ? { score: healthReport.score, confidence: healthReport.confidence, hurting: healthReport.hurting, improvements: healthReport.improvements } : null,
      habits: consistencyV2 ? {
        consistencyPct: consistencyV2.pct,
        activeCount: (habits2 || []).filter((h) => !h.archived).length,
        details: (consistencyV2.details || []).slice(0, 8).map((d) => ({ name: d.habit.name, freq: d.habit.frequencyType, rate: d.rate !== null ? Math.round(d.rate * 100) + "%" : "new" })),
        autoCompleted: Object.entries(autoToday || {}).filter(([, v]) => v.met).length,
      } : null,
      recovery: recoveryInfo ? { score: recoveryInfo.score, label: recoveryInfo.label, bestAction: recoveryInfo.bestAction, loadLevel: recoveryInfo.loadLevel, limiters: recoveryInfo.limiters.slice(0,3), helpers: recoveryInfo.helpers.slice(0,3), confidence: recoveryInfo.confidence, sourceLines: recoveryInfo.sourceLines } : null,
      todayWins: ctx?.todayWins && ctx.todayWins.length ? ctx.todayWins : null,
      quickLog: ctx?.quickLog || null,
      // Data quality context — coach must not invent exact values from QL
      dataQuality: {
        disabledCategories: Object.entries(trackingPrefs).filter(([,v]) => v === false).map(([k]) => k),
        nutritionSource: dt?.nutrition?.source || "unknown",
        sleepSource:     dt?.sleep?.source     || "unknown",
        trainingSource:  dt?.training?.source  || "unknown",
        waterSource:     dt?.water?.source     || "unknown",
        movementSource:  dt?.movement?.source  || "unknown",
        overallConfidence: dt?.overall?.confidence || "low",
        note: "Sources: exact=logged in app, quick_log=Quick Log only (no exact grams/minutes), unknown=not logged, disabled=tracking off. Never invent exact numbers from quick_log.",
      },
    };

    const prompt = `User question: "${question}"\n\nUser data (structured): ${JSON.stringify(coachingContext)}\n\nAnswer the question. Use the data only where it actually helps. If todayWins exist and it feels natural, you may briefly acknowledge real progress ("kudos") before the main advice — but only when relevant, and never force it.`;

    let aiError = null;
    try {
      const r = await analyzeText({ prompt, system });
      if (r && r.trim()) { incrementCoachCount(); return r; }
      console.warn("[sprig] askCoach: AI returned empty response");
      aiError = "AI returned an empty response";
    } catch (e) {
      console.error("[sprig] askCoach: AI failed —", e?.message || e);
      aiError = e?.message || String(e);
    }

    // AI failed → minimal local engine. Raw HTTP/API errors never reach end users — "Advanced mode"
    // is a consumer-facing setting, not a hidden developer flag, so it must never leak debug text.
    void aiError;
    return localCoachAnswer(question, ctx, profile, targets);
  }

  function toggleTaken(id) {
    const next = takenIds.includes(id) ? takenIds.filter((x) => x !== id) : [...takenIds, id];
    persistTaken(next);
  }
  function removeSupp(id) {
    const s = supps.find((x) => x.id === id);
    const wasTaken = takenIds.includes(id);
    persistSupps(supps.filter((x) => x.id !== id));
    if (wasTaken) persistTaken(takenIds.filter((x) => x !== id));
    if (s) queueUndo("supp", s, () => {
      persistSupps([...supps.filter((x) => x.id !== id), s]);
      if (wasTaken) persistTaken([...takenIds.filter((x) => x !== id), id]);
    });
  }
  function addSupplement(r) {
    const m = r.mult || 1;
    const supp = {
      id: uid(), name: r.name, serving: r.serving,
      calories: Math.round((r.calories || 0) * m),
      protein_g: +(r.protein_g * m).toFixed(1), carbs_g: +(r.carbs_g * m).toFixed(1),
      fat_g: +(r.fat_g * m).toFixed(1), fiber_g: +(r.fiber_g * m).toFixed(1),
      micros: (() => { const nm = normalizeMicros(r.micros); return Object.fromEntries(MICRO_KEYS.map(([k]) => [k, Math.round((nm[k] || 0) * m)])); })(),
      omega3: r.omega3, mult: 1,
    };
    const next = [supp, ...supps].slice(0, 40);
    persistSupps(next);
    persistTaken([...takenIds, supp.id]); // taken today by default
    setResult(null);
    setTab("today");
  }

  /* ---- sleep ---- */
  const persistSleep = async (next) => { setSleepLogs(next); await store.set("sprig_sleep_v1", JSON.stringify(next)); };
  const saveAlarm = async (a) => { const wasOff = !alarm?.enabled; setAlarm(a); if (a?.enabled && wasOff) logged("Alarm set", "light"); await store.set("sprig_alarm_v1", JSON.stringify(a)); };

  function saveSleepLog({ bedTs, wakeTs, restlessness, source }) {
    const durationMin = Math.max(0, Math.round((wakeTs - bedTs) / 60000));
    const need = sleepNeedMin(profile.age);
    const usualBed = circMean(sleepLogs.slice(-7).map((l) => tsToMin(l.bedtime)));
    // Obvious-mistake protection: a session under 20 min is almost always an accidental
    // start/stop. Save it but flag it so it can't poison sleep score or debt. The user can
    // un-ignore or relabel it from Recent sleep logs.
    const isShort = durationMin < 20;
    const log = {
      id: uid(), date: new Date(wakeTs).toLocaleDateString("en-CA"),
      bedtime: bedTs, waketime: wakeTs, durationMin,
      restlessness: Math.round(restlessness ?? 30),
      stages: estimateStages(durationMin, restlessness ?? 30),
      score: scoreSleep({ durationMin, restlessness: restlessness ?? 30, bedMin: tsToMin(bedTs) }, need, usualBed),
      source: source || "manual",
      short: isShort,
      ignoredFromScore: isShort, // excluded from debt/score until the user confirms otherwise
    };
    const next = [...sleepLogs.filter((l) => l.date !== log.date), log].sort((a, b) => a.waketime - b.waketime).slice(-30);
    persistSleep(next);
    logged(isShort ? "Saved as a short nap" : "Sleep logged", "light");
    if (!isShort) {
      const newDebt = sleepDebtMin(next, need);
      const sleepCands = detectSleepWins({ log, sleepInfo: { debtTrend: newDebt < sleepDebtMin(sleepLogs, need) ? "down" : "flat" }, profile });
      recordWins(sleepCands, log.date);
    }
    return log;
  }
  // Toggle whether a sleep log counts toward score/debt (Fix 3).
  const toggleSleepIgnored = (id) => {
    persistSleep(sleepLogs.map((l) => (l.id === id ? { ...l, ignoredFromScore: !l.ignoredFromScore } : l)));
  };
  const markSleepNap = (id) => {
    persistSleep(sleepLogs.map((l) => l.id === id ? { ...l, nap: true, ignoredFromScore: true, short: true } : l));
    logged("Saved as nap", "light");
  };
  // Edit a sleep log's bed/wake times — recompute duration, stages, score, and re-flag short sessions.
  const editSleepLog = (id, bedTs, wakeTs) => {
    const need = sleepNeedMin(profile.age);
    const usualBed = circMean(sleepLogs.slice(-7).map((l) => tsToMin(l.bedtime)));
    persistSleep(sleepLogs.map((l) => {
      if (l.id !== id) return l;
      const durationMin = Math.max(0, Math.round((wakeTs - bedTs) / 60000));
      const isShort = durationMin < 20;
      return {
        ...l, bedtime: bedTs, waketime: wakeTs, durationMin,
        date: new Date(wakeTs).toLocaleDateString("en-CA"),
        stages: estimateStages(durationMin, l.restlessness ?? 30),
        score: scoreSleep({ durationMin, restlessness: l.restlessness ?? 30, bedMin: tsToMin(bedTs) }, need, usualBed),
        short: isShort,
        // editing a previously-short log to a real duration clears the auto-ignore
        ignoredFromScore: isShort ? l.ignoredFromScore : (l.short && l.ignoredFromScore ? false : l.ignoredFromScore),
      };
    }).sort((a, b) => a.waketime - b.waketime));
  };
  const removeSleep = (id) => {
    const s = sleepLogs.find((x) => x.id === id);
    persistSleep(sleepLogs.filter((x) => x.id !== id));
    if (s) queueUndo("sleep", s, () => persistSleep([...sleepLogs.filter((x) => x.id !== id), s]));
  };

  // ---- audio alarm ----
  function ensureAudio() {
    if (!audioRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioRef.current = new AC();
    }
    if (audioRef.current?.state === "suspended") audioRef.current.resume();
    return audioRef.current;
  }
  function startAlarmSound() {
    const kind = profile?.alarmSound || "bells";
    const vol = profile?.alarmVolume ?? 0.7;
    // Loop the chosen tone until the user stops it. playAlarmTone handles the "vibrate" (silent) case.
    try { playAlarmTone(kind, vol); } catch (_) {}
    try { navigator.vibrate?.([400, 200, 400, 200, 400]); } catch (_) {}
    const loop = setInterval(() => {
      try { playAlarmTone(kind, vol); } catch (_) {}
      if (kind === "vibrate") { try { navigator.vibrate?.([400, 200, 400]); } catch (_) {} }
    }, 2000);
    alarmRef.current = { loop };
  }
  function stopAlarmSound() {
    const a = alarmRef.current; if (!a) return;
    clearInterval(a.loop);
    try { navigator.vibrate?.(0); } catch (_) {}
    alarmRef.current = null;
  }

  // ---- microphone movement sensing (best-effort; needs app open + permission) ----
  async function startMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ac = ensureAudio();
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser(); analyser.fftSize = 1024;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let peak = 0;
      const loop = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / buf.length);
        peak = Math.max(peak, rms);
        micRef.current.peak = peak;
        micRef.current.raf = requestAnimationFrame(loop);
      };
      micRef.current = { stream, analyser, peak: 0, raf: 0 };
      loop();
      setMicState("on");
      return true;
    } catch (e) { setMicState("denied"); return false; }
  }
  function stopMic() {
    const m = micRef.current; if (!m) return;
    cancelAnimationFrame(m.raf);
    m.stream?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
  }

  // ---- live sleep session ----
  function startSession(withMic) {
    ensureAudio();
    const s = { bedTs: Date.now(), samples: [], micOn: false };
    sessionRef.current = s; setSession({ ...s });
    logged("Sleep started", "light");
    if (withMic) startMic().then((ok) => { s.micOn = ok; setSession({ ...sessionRef.current }); });
    // sample movement every 60s; check smart-alarm window each minute
    tickRef.current = setInterval(() => {
      const cur = sessionRef.current; if (!cur) return;
      if (micRef.current) {
        cur.samples.push(Math.min(100, Math.round(micRef.current.peak * 700)));
        micRef.current.peak = 0; // reset window peak
      }
      // smart alarm check
      if (alarm.enabled) {
        const nowMin = tsToMin(Date.now());
        const asleepMin = (Date.now() - cur.bedTs) / 60000;
        const mode = alarm.mode || "smart";
        if (mode === "duration") {
          // Wake after a set sleep duration from when sleep started (default 8h).
          const targetMin = (alarm.durationH || 8) * 60;
          // If smart window is also wanted, allow a light-phase wake up to `window` min early,
          // but never before the target minus the window.
          const { wakeMin } = smartWake(cur.bedTs, tsToMin(cur.bedTs + targetMin * 60000), alarm.window || 0);
          if (asleepMin >= targetMin) triggerWake();
          else if ((alarm.window || 0) > 0 && asleepMin >= targetMin - (alarm.window) && circDiff(nowMin, wakeMin) <= 1) triggerWake();
        } else if (mode === "fixed") {
          const latest = hmToMin(alarm.latest);
          if (asleepMin > 180 && circDiff(nowMin, latest) <= 1) triggerWake();
        } else {
          // smart window (default, original behavior)
          const { wakeMin } = smartWake(cur.bedTs, hmToMin(alarm.latest), alarm.window);
          const latest = hmToMin(alarm.latest);
          if (asleepMin > 180 && (circDiff(nowMin, wakeMin) <= 1 || circDiff(nowMin, latest) <= 1)) triggerWake();
        }
      }
      setSession({ ...cur });
    }, 60000);
  }
  function triggerWake() {
    if (ringing) return;
    setRinging(true);
    startAlarmSound();
  }
  function endSession() {
    stopAlarmSound(); setRinging(false);
    clearInterval(tickRef.current); tickRef.current = null;
    const cur = sessionRef.current;
    stopMic(); setMicState("idle");
    if (cur) {
      const avgRest = cur.samples.length
        ? Math.min(100, Math.round(cur.samples.reduce((a, b) => a + b, 0) / cur.samples.length) + 12)
        : 28;
      saveSleepLog({ bedTs: cur.bedTs, wakeTs: Date.now(), restlessness: avgRest, source: cur.micOn ? "auto" : "session" });
    }
    sessionRef.current = null; setSession(null);
    setTab("sleep");
  }
  // cleanup on unmount
  useEffect(() => () => { stopAlarmSound(); stopMic(); clearInterval(tickRef.current); }, []);

  /* ---- training ---- */
  const persistWorkouts = async (next) => { setWorkouts(next); await store.set("sprig_workouts_v1", JSON.stringify(next)); };
  const persistActive = async (w) => { setActiveWorkout(w); await store.set("sprig_active_workout_v1", w ? JSON.stringify(w) : ""); };
  const saveRest = async (exName, secs) => { const next = { ...customRests, [exName]: secs }; setCustomRests(next); await store.set("sprig_rests_v1", JSON.stringify(next)); };
  const persistRoutines = async (next) => { setRoutines(next); await store.set("sprig_routines_v1", JSON.stringify(next)); };
  function saveRoutine(routine) {
    let next;
    if (routine.id) next = routines.map((r) => (r.id === routine.id ? routine : r));
    else next = [...routines, { ...routine, id: uid() }].slice(0, 10);
    persistRoutines(next);
  }
  function deleteRoutine(id) { persistRoutines(routines.filter((r) => r.id !== id)); }
  function useTemplate(tmpl) {
    // append each day as a routine, capped at 10 total
    const existing = new Set(routines.map((r) => r.name));
    const toAdd = tmpl.days.map((d) => ({ id: uid(), name: `${tmpl.name.split(" ")[0]} · ${d.name}`, exercises: d.exercises }))
      .filter((r) => !existing.has(r.name));
    const next = [...routines, ...toAdd].slice(0, 10);
    persistRoutines(next);
  }

  function startWorkout(routine) {
    const exercises = (routine?.exercises || []).map((name) => ({ name, group: findEx(name)?.group, sets: [] }));
    persistActive({ startTs: Date.now(), exercises, routineName: routine?.name || null });
    logged("Workout started", "light");
    // First workout ever (no preferred rep range chosen yet) → ask once. Never shown again.
    if (!profile.repRange && !profile.repRangeAsked) setRepRangePrompt(true);
  }
  const [repRangePrompt, setRepRangePrompt] = useState(false);
  const [rirPref, setRirPref] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sprig_rir_preference_v1") || "null"); } catch { return null; }
  });
  const [rrpStep, setRrpStep] = useState("rep_range"); // "rep_range" | "rir_tracking" | "intensity_style"
  const [rrpPending, setRrpPending] = useState({});    // accumulates selections across flow steps
  function saveRirPref(pref) {
    const full = { ...pref, createdAt: pref.createdAt || Date.now() };
    localStorage.setItem("sprig_rir_preference_v1", JSON.stringify(full));
    setRirPref(full);
  }
  const [bedNudgeDismissed, setBedNudgeDismissed] = useState(false);

  function addWoExercise(name) {
    const meta = findEx(name);
    // Pre-fill inputs from progression suggestion or last session
    const prog = progressionFor(workouts, name, daily, sleepReadiness, rirPref?.repRange, rirPref?.intensityStyle);
    const sug  = prog || suggestNext(workouts, name);
    let lastW = "", lastR = "";
    workouts.forEach(wk => wk.exercises.forEach(e => {
      if (e.name === name && e.sets?.length) { const s = e.sets[e.sets.length - 1]; lastW = String(s.w); lastR = String(s.reps); }
    }));
    const initW = lastW || (sug?.w != null ? String(sug.w) : "");
    const initR = lastR || (sug?.reps != null ? String(sug.reps) : "");
    persistActive({ ...activeWorkout, exercises: [...activeWorkout.exercises, { name, group: meta?.group, sets: [], pendingW: initW, pendingR: initR }] });
  }
  function woLogSet(exIdx, set) {
    const exName = activeWorkout.exercises[exIdx]?.name;
    // PR detection BEFORE we append the set (compare against all prior history).
    // Priority: e1RM=5 > weight=4 > reps=3 > volume=2 > session-volume=1.
    // If a higher-priority toast is already visible, the incoming lower-priority one is dropped.
    // Equal or higher priority replaces the current toast, resetting all timers.
    try {
      const PR_PRIORITY = { "e1rm": 5, "weight": 4, "reps": 3, "volume": 2, "session-volume": 1 };
      const activeExSets = activeWorkout.exercises[exIdx]?.sets || [];
      const pr = detectSetPR(workouts, exName, set.w, set.reps, activeExSets);
      if (pr) {
        const newPri = PR_PRIORITY[pr.kind] ?? 0;
        const curPri = recordToastPriorityRef.current;
        // Drop if a more important record is still animating in / visible
        if (curPri > newPri) { /* keep current */ } else {
          // Clear pending phase timers from any previous toast
          recordToastTimers.current.forEach(id => clearTimeout(id));
          recordToastTimers.current = [];
          recordToastPriorityRef.current = newPri;
          // Single restrained haptic + premium 2-note chime for new record
          buzz("light");
          if (profile?.restTimerSound !== false) { try { playRecordSound(); } catch (_) {} }
          // Phase 1 — entering (entrance animation plays, 440ms)
          setRecordToast({ ...pr, exName, phase: "entering" });
          // Phase 2 — visible (entrance done, 440ms enter + small buffer)
          const t1 = setTimeout(() =>
            setRecordToast(t => t && t.phase === "entering" ? { ...t, phase: "visible" } : t),
            470);
          // Phase 3 — exiting (exit animation plays, ~3.0s hold after fully visible)
          const t2 = setTimeout(() =>
            setRecordToast(t => t ? { ...t, phase: "exiting" } : t),
            470 + 3000);
          // Phase 4 — unmount (after 260ms exit anim completes)
          const t3 = setTimeout(() => {
            setRecordToast(null);
            recordToastPriorityRef.current = 0;
          }, 470 + 3000 + 270);
          recordToastTimers.current = [t1, t2, t3];
        }
      }
    } catch (_) {}
    const next = activeWorkout.exercises.map((e, i) => i === exIdx ? { ...e, sets: [...e.sets, { ...set, ts: Date.now() }] } : e);
    persistActive({ ...activeWorkout, exercises: next });
    buzz("complete"); // set completed
    // open the post-set RIR prompt — gated behind user's RIR tracking preference
    const _trackRir = rirPref?.trackRir || "always";
    if (_trackRir !== "off") {
      const setIdx = activeWorkout.exercises[exIdx].sets.length;
      if (_trackRir === "always") {
        setRirPrompt({ exIdx, setIdx });
      } else {
        // "hard_sets": only ask on sets that look like working sets (reps near the working range)
        const _repRange = profile?.repRange || [8, 12];
        const _threshold = Math.max(3, _repRange[0] - 2);
        if (set.reps >= _threshold) setRirPrompt({ exIdx, setIdx });
      }
    }
  }
  // Set a set's RIR after it's logged (used by the post-set RIR prompt + row editor).
  function woSetRir(exIdx, setIdx, rir) {
    const ex = activeWorkout.exercises.map((e, i) => i === exIdx
      ? { ...e, sets: e.sets.map((s, j) => (j === setIdx ? { ...s, rir } : s)) }
      : e);
    persistActive({ ...activeWorkout, exercises: ex });
  }
  const [rirPrompt, setRirPrompt] = useState(null); // { exIdx, setIdx } — frame-level RIR sheet
  function chooseRir(exIdx, setIdx, val) { woSetRir(exIdx, setIdx, val); setRirPrompt(null); buzz("select"); }
  // ── Body scroll lock ── must appear AFTER all state vars it references to avoid TDZ errors in production
  useEffect(() => {
    const open = !!(foodOverlayMode || quickOpen || winsOpen || recapView || favChooser || favDup || rirPrompt || repRangePrompt);
    if (open) { document.body.classList.add("modal-open"); }
    else { document.body.classList.remove("modal-open"); }
    return () => { document.body.classList.remove("modal-open"); };
  }, [foodOverlayMode, quickOpen, winsOpen, recapView, favChooser, favDup, rirPrompt, repRangePrompt]);

  // ---- Rest timer (lifted to app level so the floating UI tracks scroll reliably) ----
  const [rest, setRest] = useState(null);          // { exName, end, paused, remainingMs }
  const [restDone, setRestDone] = useState(false); // brief "rest over" flash
  const restFiredRef = useRef(false);
  const [, setRestTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setRestTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);
  const restLeft = rest ? (rest.paused ? Math.round(rest.remainingMs / 1000) : Math.max(0, Math.round((rest.end - Date.now()) / 1000))) : 0;
  useEffect(() => {
    if (!rest || rest.paused) { restFiredRef.current = false; return; }
    if (restLeft <= 0 && !restFiredRef.current) {
      restFiredRef.current = true;
      if (profile?.restTimerSound !== false) { try { playAlarmTone(profile?.restTimerSoundChoice || "beep", profile?.alarmVolume ?? 0.7); } catch (_) {} }
      if (profile?.restTimerVibrate !== false) buzz("finish");
      // auto-dismiss the "Go!" state after 4 seconds
      setTimeout(() => { try { setRestDone(false); setRest(null); } catch (_) {} }, 4000);
      showToast("Rest complete", "success");
      setRestDone(true);
      setTimeout(() => setRestDone(false), 4000);
    }
  }, [restLeft, rest, profile]);
  function startRest(exName) { const meta = findEx(exName); const secs = customRests[exName] ?? restDefault(meta); restFiredRef.current = false; setRestDone(false); setRest({ exName, end: Date.now() + secs * 1000, paused: false }); }
  function pauseRest() { setRest((r) => r && !r.paused ? { ...r, paused: true, remainingMs: Math.max(0, r.end - Date.now()) } : r); }
  function resumeRest() { setRest((r) => r && r.paused ? { ...r, paused: false, end: Date.now() + (r.remainingMs || 0) } : r); }
  function addRest(ms) { setRest((r) => { if (!r) return r; if (r.paused) return { ...r, remainingMs: (r.remainingMs || 0) + ms }; return { ...r, end: r.end + ms }; }); restFiredRef.current = false; }
  function skipRest() { setRest(null); setRestDone(false); }
  function woRemoveSet(exIdx, setIdx) {
    const ex = activeWorkout.exercises.map((e, i) => i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e);
    persistActive({ ...activeWorkout, exercises: ex });
  }
  function woRemoveExercise(exIdx) {
    persistActive({ ...activeWorkout, exercises: activeWorkout.exercises.filter((_, i) => i !== exIdx) });
  }
  function finishWorkout() {
    const done = (activeWorkout?.exercises || []).filter((e) => e.sets.length);
    let doneRecap = null;
    if (done.length) {
      const w = { id: uid(), date, ts: Date.now(), durationMin: Math.max(1, Math.round((Date.now() - activeWorkout.startTs) / 60000)), exercises: done };
      // recap vs all prior workouts → drives wins + history badges
      const recap = recapFor(w, workouts);
      doneRecap = recap;
      const winCands = detectWorkoutWins(recap);
      w.recap = recap;
      w.winCount = winCands.length;
      persistWorkouts([...workouts, w].slice(-300));
      recordWins(winCands, date);
      // capture any per-exercise pain markers as structured pain logs
      done.forEach((ex) => {
        if (ex.pain && ex.pain !== "none") {
          const meta = findEx(ex.name);
          const guessedLocation = LOADS_PART[meta?.group]?.[0] || "other";
          const level = ex.pain === "stop" ? "serious" : ex.pain === "painful" ? "moderate" : "mild";
          addPainLog({ level, location: guessedLocation, exercise: ex.name, note: ex.painNote || "", type: null });
        }
      });
    }
    persistActive(null);
    setTab("train");
    if (done.length) { logged("Workout saved", "finish"); setRecapView({ recap: doneRecap, ts: Date.now() }); }
  }
  function cancelWorkout() {
    const hasSets = (activeWorkout?.exercises || []).some((e) => e.sets.length > 0);
    if (hasSets) {
      if (!window.confirm("Discard workout? All sets will be lost.")) return;
    }
    persistActive(null);
  }
  function woSetExercisePain(exIdx, level) {
    const ex = activeWorkout.exercises.map((e, i) => i === exIdx ? { ...e, pain: level } : e);
    persistActive({ ...activeWorkout, exercises: ex });
  }

  // Free tier: 10 AI food scans per calendar month. Resets on the 1st.
  const FREE_SCAN_LIMIT = 10;
  function getScanCount() {
    try {
      const key = "sprig_ai_scans_" + new Date().toISOString().slice(0, 7);
      return parseInt(localStorage.getItem(key) || "0", 10);
    } catch (_) { return 0; }
  }
  function incrementScanCount() {
    try {
      const key = "sprig_ai_scans_" + new Date().toISOString().slice(0, 7);
      localStorage.setItem(key, String(getScanCount() + 1));
    } catch (_) {}
  }

  async function runAnalysis(opts) {
    // Enforce free-tier scan limit for non-premium users.
    if (!isPremium && getScanCount() >= FREE_SCAN_LIMIT) {
      setPaywallOpen(true);
      return;
    }
    setLastAnalysisOpts(opts);
    setError(""); setBusy(true); setFoodOverlayMode(null);
    try {
      const res = await analyze(opts);
      incrementScanCount();
      setResult(res); setResultMode(opts.mode);
    } catch (e) {
      setError("AI analysis is unavailable. You can still add this manually.");
    } finally { setBusy(false); }
  }

  async function refineWithDescription(correctionText) {
    if (!capturedImage && !result) return;
    setError(""); setBusy(true);
    try {
      const res = await analyze({ image: capturedImage, text: correctionText, mode: resultMode });
      setResult(res);
    } catch (e) {
      setError("Could not refine analysis. Try editing manually.");
    } finally { setBusy(false); }
  }

  async function onFile(e, mode) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setError(""); setBusy(true);
    try {
      const img = await resizeImage(f);
      setCapturedImage(img);
      await runAnalysis({ image: img, mode });
    } catch { setBusy(false); setError("Couldn't read that image."); }
  }

  // On native iOS/Android, use Capacitor Camera for a proper native picker.
  // On web, fall back to triggering the hidden file input.
  async function captureNativePhoto(mode, fallbackRef) {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) { fallbackRef?.current?.click(); return; }
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        quality: 82,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });
      if (!photo?.base64String) return;
      setError(""); setBusy(true);
      try {
        // Resize via canvas the same way resizeImage does.
        const dataUrl = `data:image/jpeg;base64,${photo.base64String}`;
        const img = await new Promise((res) => {
          const el = new Image();
          el.onload = () => {
            const max = 1100;
            let { width: w, height: h } = el;
            if (w > max || h > max) { const s = max / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
            const cv = document.createElement("canvas");
            cv.width = w; cv.height = h;
            cv.getContext("2d").drawImage(el, 0, 0, w, h);
            const out = cv.toDataURL("image/jpeg", 0.82);
            res({ data: out.split(",")[1], media: "image/jpeg" });
          };
          el.onerror = () => res(null);
          el.src = dataUrl;
        });
        if (!img) { setBusy(false); setError("Couldn't process that photo."); return; }
        setCapturedImage(img);
        await runAnalysis({ image: img, mode });
      } catch { setBusy(false); setError("Couldn't process that photo."); }
    } catch (e) {
      // User cancelled camera, or Capacitor not available — silently ignore.
      if (e?.message && !e.message.includes("cancel")) console.warn("[sprig] captureNativePhoto:", e.message);
    }
  }

  async function scanBarcode() {
    setError("");
    try {
      // Web fallback: prompt user to type or scan via camera
      setOffQuery(""); setOffResults([]); setOffSelected(null); setFoodOverlayMode("search");
    } catch (e) {
      if (e?.message && !e.message.includes("cancel")) setError("Barcode scan failed. Try searching instead.");
    }
  }

  async function lookupBarcode(barcode) {
    setBusy(true); setFoodOverlayMode("search");
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,nutriments,serving_size,serving_quantity`);
      const json = await res.json();
      if (json.status !== 1 || !json.product) { setBusy(false); setError("Product not found. Try searching manually."); return; }
      const p = json.product; const n = p.nutriments || {};
      const per = Number(p.serving_quantity) || 100;
      await runAnalysis({
        text: `${p.product_name}, serving ${p.serving_size || `${per}g`}, calories ${Math.round((n["energy-kcal_100g"] || 0) * per / 100)}, protein ${((n.proteins_100g || 0) * per / 100).toFixed(1)}g, carbs ${((n.carbohydrates_100g || 0) * per / 100).toFixed(1)}g, fat ${((n.fat_100g || 0) * per / 100).toFixed(1)}g, fiber ${((n.fiber_100g || 0) * per / 100).toFixed(1)}g`,
        mode: "text",
      });
    } catch { setBusy(false); setError("Couldn't look up that barcode."); }
  }

  function addEntry(r) {
    const entry = {
      id: uid(), name: r.name, serving: r.serving, calories: r.calories,
      protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g, fiber_g: r.fiber_g,
      micros: normalizeMicros(r.micros), omega3: r.omega3, mult: r.mult || 1, time: Date.now(),
    };
    persistEntries((prev) => [...prev, entry]);
    // detect nutrition wins right away from the new totals (doesn't wait on the reactive effect)
    try {
      const nextT = dayTotals([...entries, entry, ...takenSupps]);
      recordWins(detectDayWins({ t: nextT, daily, targets, sleepInfo: { waterGoal: profile?.weight ? Math.round(profile.weight * 35) : 2500 }, profile, quickLog }), date);
    } catch (_) {}
    // remember text-described meals automatically
    if (resultMode === "text") {
      const exists = library.some((l) => l.name.toLowerCase() === r.name.toLowerCase());
      if (!exists) persistLibrary([{ ...entry, id: uid(), mult: 1 }, ...library].slice(0, 60));
    }
    setResult(null);
    setTab("nutrition");
    setFoodSub("nutrition");
    setFlashEntryId(entry.id); setTimeout(() => setFlashEntryId((id) => (id === entry.id ? null : id)), 2200);
    logged("Meal added", "light");
  }

  function logFromLibrary(meal) {
    const entry = { ...meal, id: uid(), mult: 1, time: Date.now() };
    persistEntries((prev) => [...prev, entry]);
    setTab("nutrition");
    setFoodSub("nutrition");
    setFlashEntryId(entry.id); setTimeout(() => setFlashEntryId((id) => (id === entry.id ? null : id)), 2200);
    logged("Meal added", "light");
  }

  async function searchOpenFoodFacts(q) {
    if (!q.trim()) { setOffResults([]); return; }
    setOffSearching(true);
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q.trim())}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,nutriments,serving_size,brands`;
      const resp = await fetch(url);
      const data = await resp.json();
      const prods = (data.products || []).filter((p) => p.product_name && p.nutriments?.["energy-kcal_100g"] != null);
      setOffResults(prods.slice(0, 12));
    } catch (_) {
      setOffResults([]);
    } finally {
      setOffSearching(false);
    }
  }

  function addFromOFF(product, servingG) {
    const g = parseFloat(servingG) || 100;
    const n = product.nutriments || {};
    const factor = g / 100;
    const entry = {
      id: uid(),
      name: product.product_name + (product.brands ? ` (${product.brands.split(",")[0].trim()})` : ""),
      serving: `${g}g`,
      calories: Math.round((n["energy-kcal_100g"] || 0) * factor),
      protein_g: +((n["proteins_100g"] || 0) * factor).toFixed(1),
      carbs_g: +((n["carbohydrates_100g"] || 0) * factor).toFixed(1),
      fat_g: +((n["fat_100g"] || 0) * factor).toFixed(1),
      fiber_g: +((n["fiber_100g"] || 0) * factor).toFixed(1),
      micros: {
        sodium_mg: n["sodium_100g"] ? +((n["sodium_100g"] * 1000) * factor).toFixed(0) : null,
        calcium_mg: n["calcium_100g"] ? +((n["calcium_100g"] * 1000) * factor).toFixed(0) : null,
        iron_mg: n["iron_100g"] ? +((n["iron_100g"] * 1000) * factor).toFixed(1) : null,
      },
      omega3: null, mult: 1, time: Date.now(),
    };
    persistEntries((prev) => [...prev, entry]);
    setFoodOverlayMode(null);
    setOffQuery(""); setOffResults([]); setOffSelected(null); setOffServing("100");
    setTab("nutrition"); setFoodSub("nutrition");
    setFlashEntryId(entry.id); setTimeout(() => setFlashEntryId((id) => (id === entry.id ? null : id)), 2200);
    logged("Added from database", "light");
  }
  function addManual(m) {
    const entry = {
      id: uid(), name: m.name || "Quick entry", serving: "manual",
      calories: +m.calories || 0, protein_g: +m.protein || 0, carbs_g: +m.carbs || 0,
      fat_g: +m.fat || 0, fiber_g: +m.fiber || 0, micros: {}, omega3: null, mult: 1, time: Date.now(),
    };
    const commit = () => { persistEntries((prev) => [...prev, entry]); setFoodOverlayMode(null); setTab("nutrition"); setFoodSub("nutrition"); setFlashEntryId(entry.id); setTimeout(() => setFlashEntryId((id) => (id === entry.id ? null : id)), 2200); logged("Meal added", "light"); };
    if (entry.calories > 3000) { askConfirm(`${entry.calories} kcal for one item is unusually high. Save anyway?`, commit); return; }
    commit();
  }
  function removeEntry(id) {
    const ent = entries.find((e) => e.id === id); if (!ent) return;
    persistEntries((prev) => prev.filter((e) => e.id !== id));
    queueUndo("food", ent, () => persistEntries((prev) => [...prev, ent]));
  }
  function editEntry(id, patch) {
    persistEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function removeLibrary(id) {
    const m = library.find((l) => l.id === id);
    persistLibrary(library.filter((l) => l.id !== id));
    if (m) queueUndo("meal", m, () => persistLibrary([...library.filter((l) => l.id !== id), m]));
  }

  const takenSupps = supps.filter((s) => takenIds.includes(s.id)).map((s) => ({ ...s, mult: 1 }));
  const t = dayTotals([...entries, ...takenSupps]);
  const scores = funcScores(t, targets);

  // ---- sleep + energy derivations ----
  const need = sleepNeedMin(profile.age);
  const debtMin = sleepDebtMin(sleepLogs, need);
  const lastSleep = sleepLogs.length ? sleepLogs[sleepLogs.length - 1] : null;
  const rec = recommend(sleepLogs, profile, debtMin);
  const wakeMin = lastSleep && lastSleep.date === date ? tsToMin(lastSleep.waketime) : rec.recWake;
  const todayBed = rec.recBed;
  const mealMarks = entries.map((e) => ({
    min: tsToMin(e.time), name: e.name, cal: (e.calories || 0) * (e.mult || 1), carbs: (e.carbs_g || 0) * (e.mult || 1),
  }));
  const curve = energyCurve({ wakeMin, bedMin: todayBed > wakeMin ? todayBed : wakeMin + 600, debtMin, meals: mealMarks });
  const gym = bestGymWindow(curve, mealMarks, wakeMin, todayBed > wakeMin ? todayBed : wakeMin + 600);
  // last night's score breakdown (main reason + tonight's fix)
  const sleepBreakdown = sleepScoreBreakdown(lastSleep, need, rec, sleepLogs);
  const sleepInfo = { need, debtMin, lastSleep, rec, wakeMin, todayBed, curve, gym, mealMarks, breakdown: sleepBreakdown };

  // Detect daily nutrition/movement wins as the day's data crosses thresholds.
  // recordWins dedupes by type per day, so re-running on every change is safe (no spam).
  useEffect(() => {
    if (profile?.showWins === false) return;
    if (!ready) return;
    const cands = detectDayWins({ t, daily, targets, sleepInfo: { waterGoal: profile?.weight ? Math.round(profile.weight * 35) : 2500 }, profile, quickLog });
    if (cands.length) recordWins(cands, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.protein, t.calories, t.fiber, daily?.water, daily?.steps, daily?.cardioMin, daily?.checkin, ready, date]);

  // Today's Quick Log entry — declared here (before training derivations) to avoid TDZ
  const quickLog = quickDayLogs.find((q) => q.date === date) || null;

  // ---- training derivations (synced to sleep + yesterday's alcohol) ----
  const alcHit = alcoholImpact(daily?.alcohol || 0).recoveryHit;
  const sleepReadiness = lastSleep
    ? Math.max(20, Math.min(100, Math.round(lastSleep.score - debtMin / 30 - alcHit)))
    : Math.max(30, Math.round(82 - debtMin / 30 - alcHit));
  // Combine today's sport sessions with the cross-day log (filtered to 48h window)
  // Normalise ALL movement/sport sources (new sportSessions + legacy cardioSessions + cross-day log)
  // into one unified list before muscle recovery is calculated.
  const allSportSessions = normalizeMovementSessionsForMuscleRecovery({
    daily,
    sportSessionsLog,
    date,
  });
  const recovery = muscleRecovery(workouts, sleepReadiness, quickLog, trackingPrefs, allSportSessions);
  const volume = weeklyVolume(workouts);
  // When training tracking is off, every muscle has fatigue=0 (trackingOff state) which would
  // inflate muscleReadyAvg to 100. Guard: if training is off, bodyReadiness = sleepReadiness only.
  const muscleReadyAvg = trackingPrefs.training === false
    ? sleepReadiness
    : MUSCLES.reduce((a, [k]) => a + (100 - (recovery[k]?.fatigue || 0)), 0) / MUSCLES.length;
  const bodyReadiness = trackingPrefs.training === false
    ? sleepReadiness
    : Math.round(muscleReadyAvg * 0.6 + sleepReadiness * 0.4);
  const readyMuscles = MUSCLES.filter(([k]) => recovery[k]?.recovered && recovery[k]?.lastTs).map(([, n]) => n);
  const freshMuscles = MUSCLES.filter(([k]) => (recovery[k]?.fatigue ?? 0) < 30 && recovery[k]?.hasData !== false && !recovery[k]?.trackingOff).map(([, n]) => n);
  const deload = deloadAdvice(workouts, debtMin, recovery);
  const trainInfo = { recovery, volume, sleepReadiness, bodyReadiness, readyMuscles, freshMuscles, deload, customRests, daily };

  // pain state — derived from structured logs (fallback to daily check-in)
  const painSum = painSummary(painLogs);
  const activePainLocations = painSum.active.map((a) => a.location);
  const activePainLevel = painSum.active.length
    ? (["serious", "moderate", "mild", "none"].find((lvl) => painSum.active.some((a) => a.latest.level === lvl)) || "none")
    : (daily?.checkin?.pain || "none");
  const painCoach = painAdvice(activePainLevel, activePainLocations);

  const recRec = recoveryRecommendation({ lastSleep, debtMin, daily, sleepReadiness, painLevel: activePainLevel });
  trainInfo.recoveryRec = recRec;
  trainInfo.pain = { level: activePainLevel, locations: activePainLocations, coach: painCoach, summary: painSum, logs: painLogs };
  trainInfo.sportAdvice = sportAdvice({ profile, daily, sportLog: daily?.sportLog, painLogs });

  // synthesized daily history for the health radar
  // - past days: from `history` (calories/protein); today augmented with daily-tracked extras
  const dailyHistory = (() => {
    const arr = (history || []).map((h) => ({ ...h }));
    // ensure today is represented even if nothing logged yet
    const todayIdx = arr.findIndex((h) => h.date === date);
    const todayRow = { date, calories: t.calories, protein: t.protein, steps: daily.steps, alcohol: daily.alcohol, stress: daily.checkin?.stress };
    if (todayIdx >= 0) arr[todayIdx] = { ...arr[todayIdx], ...todayRow };
    else arr.push(todayRow);
    return arr;
  })();
  const healthInfo = {
    series: healthSeries,
    latest: latestHealth(healthSeries),
    radar: healthRiskRadar({ healthSeries, sleepLogs, sleepInfo, t, targets, daily, dailyHistory, weightSeries, measureSeries, workouts, profile }),
  };
  // ---- safety: red flags + interaction warnings ----
  const _latestH = healthInfo.latest;
  const _symptomText = _latestH.symptoms?.value || "";
  const _medsNote = profile.medsNote || "";
  const redFlags = redFlagScan(_symptomText + " " + _medsNote);
  const _bpFlag = bpRedFlag(_latestH.bpSys?.value, _latestH.bpDia?.value);
  const interactions = interactionFlags({ supps, daily, medsNote: _medsNote });
  const safetyInfo = {
    redFlags,
    bpFlag: _bpFlag,
    hasCrisis: redFlags.some((f) => f.crisis),
    interactions,
    urgent: redFlags.length > 0 || !!_bpFlag,
  };

  const advanced = profile.mode === "advanced";

  // ---- daily command center derivations ----
  // trainedToday: exact workout OR quick log says trained
  const trainedToday = workouts.some((w) => (w.date || getSprigDate(w.ts, latestSleepLog, profile?.dayResetMode || "after-wake")) === date) || (quickLog?.trainedToday === true);
  const suggestion = suggestSplit({ workouts, recovery, volume, sleepReadiness, debtMin, daily, trainedToday, routines });
  trainInfo.suggestion = suggestion;
  // nutrition coaching (hoisted here so recoveryInfo can use nutriInfo.waterGoal)
  const dietQ = dietQuality(t, targets, daily, profile);
  const missing = missingNutrients(t, targets);
  const coach = nutritionCoach(t, targets, profile, weightSeries);
  const nutriInfo = { dietQ, missing, coach, waterGoal: waterGoal(profile) };

  // ── Canonical recovery — single source of truth for ALL displays ──────────
  // useMemo so the heavy muscle+scoring calculation doesn't re-run on every
  // rest-timer tick (setInterval every second) or UI state change (toast, tab).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recoveryInfo = useMemo(() => calculatePerfectRecovery({ sleepInfo, trainInfo, nutriInfo, daily, targets, t, workouts, quickLog, tp: trackingPrefs }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workouts, entries, sleepLogs, daily, date, quickLog, trackingPrefs, profile]); // raw state deps — stable across UI ticks

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const subScores = useMemo(() => dailyScores({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile, quickLog, tp: trackingPrefs, recoveryInfo }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recoveryInfo, entries, daily, date, workouts, sleepLogs, quickLog, trackingPrefs, profile]);
  const healthScore = dailyHealthScore(subScores);
  const funcHealth = functionalHealth({ subScores, sleepInfo, trainInfo, daily, healthInfo, profile, targets, t, trainedToday });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const actions = useMemo(() => bestActions({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile, quickLog, tp: trackingPrefs, recoveryInfo }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recoveryInfo, entries, daily, date, workouts, sleepLogs, quickLog, trackingPrefs, profile]);
  const dailyInfo = { daily, weightSeries, subScores, healthScore, funcHealth, actions, trainedToday };

  // Days with any meaningful data logged — used for progressive disclosure gating.
  const loggedDays = useMemo(
    () => history.filter((d) => d.calories > 0 || d.steps > 0 || d.water > 0).length,
    [history]
  );

  // End-of-day quick-log nudge (gentle; never affects the score).
  const lastLogTs = Math.max(
    0,
    ...(entries || []).map((e) => e.time || e.ts || 0),
    daily?.lastTouchTs || 0,
    ...(sleepLogs || []).map((l) => l.ts || 0),
  ) || null;
  const bedNudge = bedtimeReminder({
    nowTs: Date.now(), recBedMin: sleepInfo?.rec?.recBed, lastLogTs,
    t, targets, daily, waterGoalMl: waterGoal(profile), trainedToday, tp: trackingPrefs,
  });
  const logGap = detectLoggingGap({ date, entries, workouts, sleepLogs, quickLog, trackingPrefs, dayStatus, logGapSnoozes });

  // ---- mind & habits ----
  const waterGoalMl = waterGoal(profile);
  const habits = activeHabits(habitConfig);
  // ctx for auto-habit detection (today)
  const habitCtxToday = { t, targets, daily, waterGoalMl, trainedToday, supps, takenIds, quickLog, tp: trackingPrefs };
  const habitsTodayState = habitsToday(habits, habitCtxToday, habitDone, date);
  // build last-7-days ctx for the consistency score
  const last7Dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toLocaleDateString("en-CA");
  });
  const ctxByDate = {};
  last7Dates.forEach((d) => {
    const hrow = (history || []).find((h) => h.date === d);
    const wkOnDay = workouts.some((w) => new Date(w.ts).toLocaleDateString("en-CA") === d);
    // for past days we only have food history + workout; daily extras only for today
    if (d === date) ctxByDate[d] = habitCtxToday; // includes quickLog
    else ctxByDate[d] = {
      t: { protein: hrow?.protein || 0, calories: hrow?.calories || 0 }, targets,
      daily: { water: 0, steps: 0 }, waterGoalMl, trainedToday: wkOnDay, supps: [], takenIds: [],
    };
  });
  const consistency = habitConsistency(habits, ctxByDate, habitDone, last7Dates, date);
  const focusToday = focusSessions.filter((f) => f.date === date);
  const focusWeek = focusSessions.filter((f) => last7Dates.includes(f.date));
  // V2 habit data
  const habitStatusMap = {};
  (habits2 || []).filter((h) => !h.archived).forEach((h) => {
    habitStatusMap[h.id] = getHabitStatus(h, habitCompletions, date);
  });
  const consistencyV2 = computeHabitConsistencyV2(habits2, habitCompletions, date);
  // mindInfo assembled below after moveInfo is defined
  // recoveryInfo assembled below too

  // Central daily truth — single source of truth for all tabs (must be before coach2)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyTruth = useMemo(() => {
    const dt = getDailyTruth({ date, tp: trackingPrefs, t, daily, quickLog, workouts, sleepInfo, targets, profile, supps, takenIds });
    // Inject canonical recovery score so coach context and any dt consumer gets the real number
    if (dt.recovery && trackingPrefs.recovery !== false) {
      dt.recovery.score      = recoveryInfo.score;
      dt.recovery.label      = recoveryInfo.label;
      dt.recovery.bestAction = recoveryInfo.bestAction;
      dt.recovery.confidence = recoveryInfo.confidence;
      dt.recovery.loadLevel  = recoveryInfo.loadLevel;
    }
    return dt;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoveryInfo, entries, daily, date, quickLog, workouts, sleepLogs, trackingPrefs, profile, supps, takenIds]);
  const dt = dailyTruth;

  // rule-based coach (no AI) — synthesizes everything above into 4 cards
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const coach2 = useMemo(() => coachReport({ t, targets, sleepInfo, trainInfo, nutriInfo, dailyInfo, daily, profile, workouts, quickLog, tp: trackingPrefs, dt: dailyTruth }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dailyTruth, entries, daily, date, workouts, sleepLogs, quickLog, trackingPrefs, profile]);

  // weekly report (rule-based)
  const report = weeklyReport({ history, workouts, sleepLogs, weightSeries, daily, dailyHistory, painLogs, focusSessions, consistency, targets, profile, sleepInfo, tp: trackingPrefs });

  // movement + dynamic calorie adjustment + progress diagnosis
  const movement = movementSummary({ daily, profile, trainedToday });
  const workoutAdj = workoutAdjustment({ workouts, profile, date });
  const calAdjust = calorieAdjustment({ daily, profile, targets, trainedToday, workoutAdj });
  const diagnosis = progressDiagnosis({ workouts, weightSeries, history, sleepLogs, sleepInfo, targets, profile, dailyHistory, painLogs, daily });
  const hydration = smartHydration({ daily, profile, sleepInfo, workouts, trainedToday });
  const sedentary = sedentaryNote(daily?.sedentary);
  const sport = sportAdvice({ profile, daily, sportLog: daily?.sportLog, painLogs });
  const moveInfo = { movement, calAdjust, workoutAdj, diagnosis, hydration, sedentary, sport, stepGoal: stepGoal(profile) };
  // attach the new derived helpers
  moveInfo.nextWorkout = nextWorkoutSuggestion({ workouts, trainInfo });
  moveInfo.mealShortcuts = mealShortcuts({ allEntries: entriesHistory, todayEntries: entries });
  moveInfo.tonight = tonightPlan({ sleepInfo });
  moveInfo.calorieTrend = calorieTrendRecommendation({ profile, weightSeries, history, targets });
  moveInfo.trainedToday = trainedToday; // needed by computeAutoHabitToday workout autoType
  // Auto-habit completion (needs moveInfo)
  const autoToday = computeAutoHabitToday(habits2, { nutriInfo, moveInfo, sleepInfo, daily, targets, supps, takenIds, quickLog, tp: trackingPrefs });
  // (recoveryInfo computed above, before bestActions — canonical single source of truth)
  const mindInfo = {
    checkin: daily.checkin || {}, habits: habitsTodayState, consistency,
    focusToday, focusWeek, focusMinutesToday: focusToday.reduce((a, f) => a + f.minutes, 0),
    hiddenDefaults: (habitConfig?.hidden || []).map((id) => DEFAULT_HABITS.find((h) => h.id === id)).filter(Boolean),
    // V2
    habits2, habitCompletions, habitStatusMap, consistencyV2, autoToday,
  };
  // overwrite nutriInfo.waterGoal to use the smart-hydration goal so it's consistent everywhere
  nutriInfo.waterGoal = hydration.goal;
  nutriInfo.needsElectrolytes = hydration.needsElectrolytes;
  // health report — memoized so it doesn't recalculate on every rest-timer tick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const healthReport = useMemo(() => computeHealthReport({
    history7: (history || []).filter((h) => Date.now() - new Date(h.date).getTime() < 7 * 864e5),
    sleepLogs7: (sleepLogs || []).filter((l) => !l.ignoredFromScore && l.waketime > Date.now() - 7 * 864e5),
    workouts7: (workouts || []).filter((w) => w.ts > Date.now() - 7 * 864e5),
    daily, t, targets, profile, sleepInfo, trainInfo, moveInfo, nutriInfo, tp: trackingPrefs, quickLog,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [history, sleepLogs, workouts, entries, daily, date, quickLog, trackingPrefs, profile]);
  // achievements — detect newly unlocked ones and celebrate them
  const achievements = detectAchievements({ workouts, weightSeries, sleepLogs, history, focusSessions, dailyHistory, painLogs });
  useEffect(() => {
    if (!achievements?.length || !ready) return;
    try {
      const seen = new Set(JSON.parse(window.localStorage.getItem("sprig_seen_achievements_v1") || "[]"));
      const newOnes = achievements.filter((a) => !seen.has(a.id));
      if (newOnes.length === 0) return;
      // Mark all as seen immediately so we only celebrate each achievement once
      newOnes.forEach((a) => seen.add(a.id));
      window.localStorage.setItem("sprig_seen_achievements_v1", JSON.stringify([...seen]));
      // Show the first new achievement (queue the rest silently)
      const first = newOnes[0];
      setAchievementCelebration({ icon: first.icon, title: first.title, desc: first.desc });
      buzz("success");
    } catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [achievements?.length, ready]);
  const timeline = goalTimeline({ profile, weightSeries, workouts, targets });
  const plateaus = plateauDetection({ workouts, weightSeries, sleepLogs, history, targets, sleepInfo });
  const patterns = patternDetection({ sleepLogs, dailyHistory, workouts, painLogs, history });

  if (!ready) {
    return <div style={{ background: C.bg, minHeight: 520, display: "grid", placeItems: "center" }}>
      <Loader2 size={26} color={C.green} style={{ animation: "spin 1s linear infinite" }} />
    </div>;
  }

  if (loadError) {
    return <SafeModeCard error={loadError}
      onExport={async () => { try { await exportJSON(); } catch (e) { console.error("export failed:", e); } }}
      onReset={async () => { try { await resetAllData(); } catch (e) { console.error("reset failed:", e); } }}
      onDemo={async () => { try { await loadDemoData(); } catch (e) { console.error("demo failed:", e); } }}
      onRetry={() => { setLoadError(null); setReady(false); window.location && window.location.reload && window.location.reload(); }}
    />;
  }

  if (!onboarded) {
    return <Onboarding supabaseReady={supabaseConfigured()} onDone={async (p, action) => {
      await saveProfile(p);
      // Save tracking prefs derived from focusAreas chosen in onboarding
      await persistTrackingPrefs(migrateTrackingPrefs(p.focusAreas || [], null));
      setOnboarded(true);
      // route to the chosen first action (premium "first successful action" moment)
      if (action === "food") { setTab("nutrition"); setFoodOverlayMode("menu"); }
      else if (action === "workout") { setTab("train"); }
      else if (action === "sleep") { setTab("sleep"); setSleepSub("alarm"); }
      else if (action === "coach") { setTab("coach"); setAskOpen(true); }
      else setTab("today");
      setTimeout(() => { try { showToast("Nice — Vitae is ready", "success"); haptic("success"); } catch (_) {} }, 400);
    }} />;
  }

  return (
    <div className="sprig-app-frame" style={{ background: C.pageBg, fontFamily: "DM Sans, sans-serif", color: C.ink }}>
      <style>{FONTS}</style>

      {/* alarm ring overlay */}
      {ringing && (
        <div className="sprig-pop" style={{ position: "absolute", inset: 0, zIndex: 50, background: C.heroGrad2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", padding: 30 }}>
          <Sun size={54} color={C.amber} style={{ animation: "pop .4s ease" }} />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 30, fontWeight: 700, marginTop: 18 }}>Good morning</div>
          <div style={{ fontSize: 13.5, opacity: .8, marginTop: 6, textAlign: "center", maxWidth: 260 }}>
            Woke you in a light phase to skip the grogginess. Tap to see how you slept.
          </div>
          <button className="sprig-tap" onClick={endSession} style={{ ...btn("#fff", C.green), padding: "15px 30px", marginTop: 26, fontSize: 16 }}>
            <Check size={18} /> Stop alarm &amp; save
          </button>
        </div>
      )}

      {/* header */}
      <div style={{ padding: "22px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: C.green, display: "grid", placeItems: "center" }}>
            <Sparkles size={17} color={C.leaf} />
          </div>
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1 }}>Vitae</div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1, letterSpacing: .1 }}>Training · nutrition · sleep · recovery</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="sprig-tap" onClick={() => { setSearchOpen(true); setSearchQ(""); }}
            title="Search" aria-label="Search" style={{ background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center" }}>
            <Search size={18} />
          </button>
          <button className="sprig-tap" onClick={() => setCalOpen(true)}
            title="Calendar" aria-label="Calendar" style={{ background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center" }}>
            <BarChart3 size={18} />
          </button>
          <button className="sprig-tap" onClick={() => { setTab("settings"); setResult(null); setFoodOverlayMode(null); }}
            title="Settings" aria-label="Settings" style={{ background: tab === "settings" ? C.green : C.bg2, color: tab === "settings" ? "#fff" : C.inkSoft, border: "none", cursor: "pointer", width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center" }}>
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className={`sprig-scroll sprig-content${(tab === "nutrition" || activeWorkout) ? " sprig-content-cta" : ""}`} style={{ overflowY: "auto", overflowX: "hidden", paddingTop: 8, paddingLeft: 16, paddingRight: 16 }}>
        {/* key=tab causes this div to remount on every tab change, triggering the tab-enter fade+slide */}
        <div key={tab} className="tab-enter">
        {tab === "today" && (
          <TodayTab
            t={t} targets={targets} entries={entries} scores={scores} onRemove={removeEntry}
            library={library} onQuick={logFromLibrary} profile={profile}
            supps={supps} takenIds={takenIds} onToggleSupp={toggleTaken} onRemoveSupp={removeSupp}
            onAddSupp={() => { setFoodOverlayMode("supp"); setResult(null); }}
            sleepInfo={sleepInfo} trainInfo={trainInfo} advanced={advanced}
            dailyInfo={dailyInfo} nutriInfo={nutriInfo} healthInfo={healthInfo} mindInfo={mindInfo} moveInfo={moveInfo} onDaily={persistDaily} onAddEntry={addEntry} onCheckin={setCheckin} onQuickLog={() => setQuickOpen(true)} quickLog={quickLog} tp={trackingPrefs}
            onStartWorkout={() => { startWorkout(); setTab("train"); }}
            onGoSleep={() => setTab("sleep")} onGoEnergy={() => setTab("energy")} onGoBody={() => setTab("progress")} onGoHealth={() => setTab("health")} onGoMind={() => setTab("mind")}
            onGoNutrition={() => setTab("nutrition")} onGoTrain={() => setTab("train")}
            recoveryInfo={recoveryInfo} dt={dailyTruth} onToast={showToast}
            wins={(profile?.showWins === false) ? null : (wins[date] || [])} onKudos={(id) => kudoWin(id, date)} onViewAllWins={() => setWinsOpen(true)}
            loggedDays={loggedDays} onGoSettings={() => setTab("settings")}
          />
        )}
        {tab === "nutrition" && (
          <NutritionTab t={t} targets={targets} entries={entries} onRemove={removeEntry} profile={profile} advanced={advanced}
            sub={foodSub} onSub={setFoodSub}
            nutriInfo={nutriInfo} moveInfo={moveInfo} sleepInfo={sleepInfo} daily={daily} onDaily={persistDaily} onAddEntry={addEntry}
            supps={supps} takenIds={takenIds} onToggleSupp={toggleTaken} onRemoveSupp={removeSupp} onAddSupp={() => { setFoodOverlayMode("supp"); setResult(null); }}
            library={library} onQuick={logFromLibrary} entriesHistory={entriesHistory}
            favoriteMeals={favoriteMeals} onSaveFavorite={saveFavoriteMeal} onReplaceFavorite={replaceFavoriteMeal}
            onUpdateFavorite={updateFavoriteMeal} onRemoveFavorite={removeFavoriteMeal} onAddFavorite={addFavoriteToToday}
            onNewFood={() => { setFoodOverlayMode("text"); setResult(null); }}
            onSnapFood={() => { setResult(null); captureNativePhoto("photo", fileRef); }}
            onScanLabel={() => { setResult(null); labelRef.current?.click(); }}
            onDescribe={() => { setFoodOverlayMode("text"); setResult(null); }}
            onManual={() => { setFoodOverlayMode("manual"); setResult(null); }}
            onOpenCreateFavorite={openFavoriteChooser} onOpenEditFavorite={openEditFavorite}
            onFavoriteDuplicate={(form, existing) => setFavDup({ form, existing })}
            onOpenLogSheet={() => setFoodOverlayMode("menu")} flashEntryId={flashEntryId} dt={dt} />
        )}
        {tab === "train" && (
          <TrainTab workouts={workouts} active={activeWorkout} profile={profile} trainInfo={trainInfo} advanced={advanced}
            sub={trainSub} onSub={setTrainSub}
            routines={routines} onSaveRoutine={saveRoutine} onDeleteRoutine={deleteRoutine} onUseTemplate={useTemplate}
            onStart={startWorkout} onAddExercise={addWoExercise} onLogSet={woLogSet} onSetRir={woSetRir} onOpenRirPrompt={(exIdx, setIdx) => setRirPrompt({ exIdx, setIdx })} onRemoveSet={woRemoveSet}
            onRemoveExercise={woRemoveExercise} onFinish={finishWorkout} onCancel={cancelWorkout}
            onSaveRest={saveRest} onSetExercisePain={woSetExercisePain} onGoBody={() => setTab("progress")} onGoHealth={() => setTab("health")}
            onStartRest={startRest} restActive={!!rest}
            moveInfo={moveInfo} daily={daily} onDaily={persistDaily} sleepInfo={sleepInfo} rirPref={rirPref}
            recoveryInfo={recoveryInfo} />
        )}
        {(tab === "progress" || tab === "body" || tab === "trends") && (
          <>
            <BodyTab workouts={workouts} profile={profile} trainInfo={trainInfo} sleepInfo={sleepInfo} advanced={advanced}
              weightSeries={weightSeries} measureSeries={measureSeries} photoLog={photoLog}
              onLogWeight={(kg) => persistDaily({ weight: kg })} onSaveMeasurement={saveMeasurement} onLogPhotoSet={logPhotoSet}
              onOpenPhotos={() => setPhotoOpen(true)} progressPhotosCount={progressPhotos.length} />
            <TrendsTab history={history} targets={targets} t={t} scores={scores} sleepLogs={sleepLogs} sleepInfo={sleepInfo} advanced={advanced} report={report} profile={profile} achievements={achievements} timeline={timeline} onGoToday={() => setTab("today")} />
          </>
        )}
        {tab === "meals" && (
          <MealsTab library={library} onLog={logFromLibrary} onRemove={removeLibrary} onNew={() => { setTab("today"); setFoodOverlayMode("text"); }} />
        )}
        {tab === "sleep" && (
          <SleepTab sleepLogs={sleepLogs} sleepInfo={sleepInfo} alarm={alarm} onSaveAlarm={saveAlarm}
            sub={sleepSub} onSub={setSleepSub}
            session={session} micState={micState} onStart={startSession} onEnd={endSession}
            onManual={saveSleepLog} onRemove={removeSleep} onToggleIgnore={toggleSleepIgnored} onMarkNap={markSleepNap} onEditLog={editSleepLog} profile={profile} advanced={advanced}
            daily={daily} onDaily={persistDaily} recoveryRec={trainInfo.recoveryRec} />
        )}
        {tab === "energy" && (
          <EnergyTab sleepInfo={sleepInfo} entries={entries} t={t} advanced={advanced} />
        )}
        {tab === "health" && <HealthTab healthInfo={healthInfo} healthReport={healthReport} advanced={advanced} onSave={saveHealth} safety={safetyInfo}
          pain={trainInfo.pain} onAddPain={addPainLog} onUpdatePain={updatePainLog} onRemovePain={removePainLog} />}
        {tab === "mind" && <MindTab mindInfo={mindInfo} advanced={advanced} profile={profile} today={date}
          onToggleHabit2={(id) => toggleHabit2(id, date)} onAddHabit2={addHabit2} onEditHabit2={editHabit2}
          onArchiveHabit2={archiveHabit2} onRestoreHabit2={restoreHabit2} onDeleteHabit2={deleteHabit2}
          onUndoCompletion={undoHabitCompletion} tp={trackingPrefs} />}
        {tab === "coach" && <CoachTab coach={coach2} advanced={advanced} moveInfo={moveInfo} timeline={timeline} plateaus={plateaus} patterns={patterns}
          onGoTrain={() => setTab("train")} onGoMeals={() => setTab("nutrition")} onGoSleep={() => setTab("sleep")} onGoHealth={() => setTab("health")} onAsk={() => setAskOpen(true)} />}
        {(tab === "more" || tab === "me") && <MoreTab onGoTargets={() => setTab("targets")} onGoHealth={() => setTab("health")} onGoMind={() => setTab("mind")} onGoProgress={() => setTab("progress")} onGoSettings={() => setTab("settings")} onGoCoach={() => setTab("coach")} trackingPrefs={trackingPrefs} onToggleTracking={(k, v) => persistTrackingPrefs({ ...trackingPrefs, [k]: v })} />}
        {tab === "targets" && <MeTab view="targets" onBack={() => setTab("more")} profile={profile} targets={targets} onSave={saveProfile}
          onExportJSON={exportJSON} onExportCSV={exportCSV} onImportJSON={importJSON} onResetData={resetAllData} onLoadDemo={loadDemoData}
          reminders={reminders} onSaveReminders={persistReminders} sleepInfo={sleepInfo}
          rirPref={rirPref} onSaveRirPref={saveRirPref} user={cloudUser} />}
        {tab === "settings" && <MeTab view="settings" onBack={() => setTab("more")} profile={profile} targets={targets} onSave={saveProfile}
          themeMode={themeMode} onSetTheme={setTheme}
          onExportJSON={exportJSON} onExportCSV={exportCSV} onImportJSON={importJSON} onResetData={resetAllData} onLoadDemo={loadDemoData}
          reminders={reminders} onSaveReminders={persistReminders} sleepInfo={sleepInfo}
          onResetOnboarding={() => { setTab("today"); setOnboarded(false); }}
          rirPref={rirPref} onSaveRirPref={saveRirPref}
          trackingPrefs={trackingPrefs} onSaveTrackingPrefs={persistTrackingPrefs}
          onDevSeedFull={devSeedFullDay} onDevSeedQL={devSeedQuickLogDay} onDevClearToday={devClearToday}
          user={cloudUser} onHealthSync={applyHealthSync} />}
        </div>{/* /tab-enter */}
      </div>

      {/* logging dock — file inputs stay mounted on the Nutrition tab; the composer/result/busy
          states render inside a portaled OVERLAY (above nav, solid sheet, sticky footer) so the
          Analyze/Save button is never hidden by the keyboard or bottom nav. */}
      {tab === "nutrition" && (
        <>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e, "photo")} style={{ display: "none" }} />
          <input ref={labelRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e, "label")} style={{ display: "none" }} />
          <input ref={suppLabelRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e, "supp-label")} style={{ display: "none" }} />
        </>
      )}

      {/* Food logging overlay — unified single sheet: menu → text/manual/supp → loading → result.
          No close/reopen gap: mode switches happen inside the same Portal+sheet DOM node. */}
      {(foodOverlayMode || busy || result) && (
        <Portal>
          <div className="sprig-dim" onClick={() => { if (!busy) { setFoodOverlayMode(null); setResult(null); setCapturedImage(null); setFavoriteMode(false); setError(""); setDraft(""); } }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
            <div onClick={(e) => e.stopPropagation()} className="vitae-sheet-enter"
              style={{ width: "100%", maxWidth: 440, background: C.isDark ? "#102018" : "#FFFFFF", border: `1px solid ${C.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)"}`, borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column",
                maxHeight: `calc(100dvh - env(safe-area-inset-top, 0px) - 20px)`,
                boxShadow: "0 -12px 40px rgba(0,0,0,.55)" }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: C.line, margin: "10px auto 4px", flexShrink: 0 }} />

              {/* ── MENU MODE ── */}
              {foodOverlayMode === "menu" && !busy && !result && (
                <div style={{ padding: "4px 18px 24px", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 2, textAlign: "center" }}>Log food</div>
                  <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14, textAlign: "center" }}>How do you want to add it?</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      [() => { setResult(null); setFoodOverlayMode(null); setTimeout(() => captureNativePhoto("photo", fileRef), 50); }, Camera, "Snap food", "Photo → AI estimate"],
                      [() => { setResult(null); setFoodOverlayMode(null); setTimeout(() => labelRef.current?.click(), 50); }, ScanLine, "Scan label", "Nutrition label → AI"],
                      [() => { setResult(null); scanBarcode(); }, Barcode, "Scan barcode", "UPC/EAN → product lookup"],
                      [() => { setResult(null); setDraft(""); setFoodOverlayMode("text"); }, PencilLine, "Describe", "Type it, AI estimates"],
                      [() => { setResult(null); setOffQuery(""); setOffResults([]); setOffSelected(null); setFoodOverlayMode("search"); }, Search, "Search database", "Open Food Facts"],
                      [() => { setResult(null); setFoodOverlayMode("manual"); }, Calculator, "Manual", "Enter values yourself"],
                    ].map(([fn, Ic, title, subt], mi) => (
                      <button key={title} className={`sprig-tap vitae-scale-in vitae-stagger-${mi + 1}`} onClick={fn}
                        style={{ background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 14, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 5, textAlign: "left", fontFamily: "DM Sans" }}>
                        <Ic size={18} color={C.lime} />
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{title}</span>
                        <span style={{ fontSize: 10.5, color: C.muted }}>{subt}</span>
                      </button>
                    ))}
                  </div>
                  <button className="sprig-tap" onClick={() => setFoodOverlayMode(null)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", marginTop: 14, padding: "6px 0" }}>Cancel</button>
                </div>
              )}

              {/* ── COMPOSE / RESULT MODE ── */}
              {(foodOverlayMode !== "menu") && (
                <>
                  <div className="sprig-scroll" style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "8px 18px 0", flex: 1 }}>
                    {error && (
                      <div className="sprig-rise" style={{ background: C.coral + "12", border: `1px solid ${C.coral}44`, borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.coral + "20", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                            <AlertCircle size={15} color={C.coral} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.coral, lineHeight: 1.4 }}>{error}</div>
                            {lastAnalysisOpts && (
                              <button className="sprig-tap" onClick={() => runAnalysis(lastAnalysisOpts)}
                                style={{ background: C.coral + "18", border: `1px solid ${C.coral}44`, borderRadius: 8, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, color: C.coral, cursor: "pointer", fontFamily: "DM Sans", marginTop: 8 }}>
                                Try again
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {busy && (
                      <AiLoadingCard isSupp={resultMode === "supplement" || resultMode === "supp-label"} image={(resultMode === "photo" || resultMode === "label") ? capturedImage : null} />
                    )}

                    {result && !busy && (
                      <div style={{ marginBottom: 14 }}>
                        {favoriteMode && (
                          <div style={{ fontSize: 11.5, color: C.greenSoft, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                            <BookMarked size={13} /> Saving as a favorite — review & edit next
                          </div>
                        )}
                        <ResultCard
                          result={result}
                          mode={resultMode}
                          isSupp={resultMode === "supplement" || resultMode === "supp-label"}
                          favoriteMode={favoriteMode}
                          onAdd={favoriteMode
                            ? openFavoriteFromResult
                            : ((resultMode === "supplement" || resultMode === "supp-label") ? addSupplement : addEntry)}
                          onCancel={() => { setResult(null); setCapturedImage(null); setFavoriteMode(false); }}
                          onRefine={(resultMode === "photo" || resultMode === "label") ? refineWithDescription : null}
                        />
                      </div>
                    )}

                    {foodOverlayMode === "supp" && !busy && !result && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.greenSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                          <Pill size={14} /> New supplement
                        </div>
                        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus onFocus={scrollIntoViewOnFocus}
                          placeholder="e.g. Vitamin D3 2000 IU, magnesium glycinate 400mg, omega-3 fish oil"
                          style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, outline: "none", resize: "none", background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", fontFamily: "DM Sans", fontSize: 14, color: C.ink, minHeight: 80, lineHeight: 1.45, boxSizing: "border-box" }} />
                      </div>
                    )}

                    {foodOverlayMode === "text" && !busy && !result && (
                      <div style={{ display: "flex", flexDirection: "column", marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.greenSoft, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                          <PencilLine size={14} /> Describe your food
                        </div>
                        <textarea ref={describeRef} value={draft} onChange={(e) => setDraft(e.target.value)}
                          onFocus={() => setTimeout(() => { try { describeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) {} }, 100)}
                          placeholder="e.g. two eggs, a slice of sourdough, half an avocado and a flat white"
                          style={{ width: "100%", border: `1.5px solid ${C.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`, borderRadius: 14, padding: 14, outline: "none", resize: "none", background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", fontFamily: "DM Sans", fontSize: 15, color: C.ink, minHeight: 130, lineHeight: 1.55, boxSizing: "border-box" }} />
                      </div>
                    )}

                    {foodOverlayMode === "manual" && !busy && !result && (
                      <ManualEntry onAdd={addManual} onCancel={() => setFoodOverlayMode(null)} embedded />
                    )}

                    {foodOverlayMode === "search" && !busy && !result && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <Search size={15} color={C.greenSoft} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.greenSoft }}>Open Food Facts database</span>
                        </div>
                        <div style={{ position: "relative" }}>
                          <input
                            autoFocus
                            value={offQuery}
                            placeholder="Search any food or brand…"
                            onChange={(e) => {
                              const q = e.target.value;
                              setOffQuery(q);
                              setOffSelected(null);
                              offQueryRef.current = q;
                              clearTimeout(offDebounceRef.current);
                              offDebounceRef.current = setTimeout(() => {
                                if (offQueryRef.current === q) searchOpenFoodFacts(q);
                              }, 500);
                            }}
                            style={{ width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "12px 14px 12px 38px", fontFamily: "DM Sans", fontSize: 14, background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", color: C.ink, outline: "none", boxSizing: "border-box" }}
                          />
                          <Search size={15} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                          {offSearching && <Loader2 size={15} color={C.green} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", animation: "spin 1s linear infinite" }} />}
                        </div>

                        {offSelected ? (
                          <div style={{ background: C.card, borderRadius: 14, padding: 14, border: `1px solid ${C.line}` }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{offSelected.product_name}</div>
                            {offSelected.brands && <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>{offSelected.brands.split(",")[0].trim()}</div>}
                            <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 4 }}>Per 100g: {Math.round(offSelected.nutriments?.["energy-kcal_100g"] || 0)} kcal · {(offSelected.nutriments?.["proteins_100g"] || 0).toFixed(1)}g P · {(offSelected.nutriments?.["carbohydrates_100g"] || 0).toFixed(1)}g C · {(offSelected.nutriments?.["fat_100g"] || 0).toFixed(1)}g F</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                              <span style={{ fontSize: 12.5, color: C.inkSoft }}>Serving</span>
                              <input type="number" value={offServing} onChange={(e) => setOffServing(e.target.value)} inputMode="decimal"
                                style={{ width: 70, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 4px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg, color: C.ink, outline: "none" }} />
                              <span style={{ fontSize: 12.5, color: C.inkSoft }}>g</span>
                              <span style={{ flex: 1, textAlign: "right", fontSize: 13, fontWeight: 700, color: C.lime }}>
                                {Math.round((offSelected.nutriments?.["energy-kcal_100g"] || 0) * (parseFloat(offServing) || 100) / 100)} kcal
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                              <button className="sprig-tap" onClick={() => setOffSelected(null)} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "11px 0", fontSize: 13 }}>← Back</button>
                              <button className="sprig-tap" onClick={() => addFromOFF(offSelected, offServing)} style={{ ...btn(C.lime, "#0A1F12"), flex: 1.8, padding: "11px 0", fontSize: 13, fontWeight: 700 }}><Plus size={14} /> Add meal</button>
                            </div>
                          </div>
                        ) : offResults.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {offResults.map((p, i) => (
                              <button key={i} className="sprig-tap" onClick={() => { setOffSelected(p); setOffServing(p.serving_size ? String(parseFloat(p.serving_size) || 100) : "100"); }}
                                style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "11px 14px", textAlign: "left", cursor: "pointer", width: "100%", fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.product_name}</div>
                                  {p.brands && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{p.brands.split(",")[0].trim()}</div>}
                                </div>
                                <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, flexShrink: 0 }}>
                                  {Math.round(p.nutriments?.["energy-kcal_100g"] || 0)} kcal/100g
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : offQuery.length > 1 && !offSearching ? (
                          <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>No results for "{offQuery}"</div>
                        ) : !offQuery ? (
                          <div style={{ textAlign: "center", color: C.muted, fontSize: 12.5, padding: "16px 0", lineHeight: 1.6 }}>
                            Search 3M+ products from Open Food Facts —<br />a free, crowd-sourced food database.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Sticky footer — always visible above keyboard */}
                  {!busy && !result && foodOverlayMode === "search" && (
                    <div style={{ position: "sticky", bottom: 0, background: C.isDark ? "#102018" : "#FFFFFF", borderTop: `1px solid ${C.line}`, padding: "12px 18px", paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 12px)`, flexShrink: 0 }}>
                      <button className="sprig-tap" onClick={() => { setFoodOverlayMode(null); setOffQuery(""); setOffResults([]); setOffSelected(null); }} style={{ ...btn(C.bg2, C.inkSoft), width: "100%", padding: "13px 0" }}>Cancel</button>
                    </div>
                  )}
                  {!busy && !result && (foodOverlayMode === "text" || foodOverlayMode === "supp") && (
                    <div style={{ position: "sticky", bottom: 0, background: C.isDark ? "#102018" : "#FFFFFF", borderTop: `1px solid ${C.line}`, padding: "12px 18px", paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${kb}px + 12px)`, display: "flex", gap: 8, flexShrink: 0 }}>
                      <button className="sprig-tap" onClick={() => { setFoodOverlayMode(null); setDraft(""); setFavoriteMode(false); }} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "13px 0" }}>Cancel</button>
                      {foodOverlayMode === "supp" && (
                        <button className="sprig-tap" onClick={() => suppLabelRef.current?.click()} style={{ ...btn(C.bg2, C.ink), flex: 1, padding: "13px 0" }}><ScanLine size={15} /> Scan</button>
                      )}
                      <button className="sprig-tap" disabled={!draft.trim()} onClick={() => { runAnalysis({ text: draft, mode: foodOverlayMode === "supp" ? "supplement" : "text" }); setDraft(""); }}
                        style={{ ...btn(draft.trim() ? C.lime : C.bg2, draft.trim() ? "#0A1F12" : C.muted), flex: 1.8, padding: "13px 0", fontWeight: 700, opacity: draft.trim() ? 1 : 0.45, transition: "opacity .15s, background .15s" }}>
                        <Sparkles size={15} /> {foodOverlayMode === "supp" ? "Add" : "Analyze"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* Premium paywall — shown when a free-tier limit is hit */}
      {paywallOpen && (
        <PaywallSheet
          userId={cloudUser?.id}
          onClose={(purchased) => {
            setPaywallOpen(false);
            if (purchased) logged("Welcome to Premium!", "success");
          }}
        />
      )}

      {/* Account nudge — shown once user has meaningful data but no account */}
      {showAccountNudge && (
        <AccountNudgeSheet
          onSignUp={() => { setShowAccountNudge(false); setTab("more"); }}
          onSnooze={() => {
            setShowAccountNudge(false);
            try { localStorage.setItem("sprig_account_nudge_snooze", String(Date.now() + 3 * 24 * 60 * 60 * 1000)); } catch (_) {}
          }}
          onDismiss={() => {
            setShowAccountNudge(false);
            try { localStorage.setItem("sprig_account_nudge_v1", "dismissed"); } catch (_) {}
          }}
        />
      )}

      {/* Achievement unlock celebration modal */}
      {achievementCelebration && (
        <Portal>
          <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.70)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 4500, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }} onClick={() => setAchievementCelebration(null)}>
            <div className="sprig-pop" onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 360, background: C.cardSolid, borderRadius: 28, padding: "36px 28px 30px", textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,.55)", border: `1px solid ${C.amber}44`, position: "relative", overflow: "hidden" }}>
              {/* Gold glow behind icon */}
              <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 180, height: 180, borderRadius: "50%", background: C.amber + "20", filter: "blur(40px)", pointerEvents: "none" }} />
              {/* Icon */}
              <div style={{ width: 88, height: 88, borderRadius: 26, background: C.amber + "22", border: `2px solid ${C.amber}55`, display: "grid", placeItems: "center", margin: "0 auto 18px", position: "relative" }}>
                <span style={{ fontSize: 46, lineHeight: 1 }}>{achievementCelebration.icon}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 }}>Achievement unlocked</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, color: C.ink, lineHeight: 1.2, marginBottom: 10 }}>{achievementCelebration.title}</div>
              <div style={{ fontSize: 14, color: C.inkSoft, lineHeight: 1.6, marginBottom: 26 }}>{achievementCelebration.desc}</div>
              <button className="sprig-tap" onClick={() => setAchievementCelebration(null)}
                style={{ background: C.amber, color: "#fff", border: "none", cursor: "pointer", borderRadius: 14, padding: "14px 32px", fontSize: 15, fontWeight: 700, fontFamily: "DM Sans" }}>
                Claim it 🎉
              </button>
            </div>
          </div>
        </Portal>
      )}

      {/* Offline indicator — persistent pill at top-right when there is no network */}
      {!online && (
        <Portal>
          <div style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 10px)",
            right: 14,
            zIndex: 3501,
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: C.isDark ? "#1a120a" : "#fff8f4",
            border: `1px solid ${C.amber}66`,
            borderRadius: 99,
            padding: "4px 10px 4px 8px",
            boxShadow: "0 2px 12px rgba(0,0,0,.18)",
            pointerEvents: "none",
          }}>
            <WifiOff size={12} style={{ color: C.amber }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.amber }}>Offline</span>
          </div>
        </Portal>
      )}

      {/* Cloud sync status badge — top-right, only visible when active */}
      {cloudUser && syncStatus !== "idle" && online && (
        <Portal>
          <div style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 10px)",
            right: 14,
            zIndex: 3500,
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: C.cardSolid,
            border: `1px solid ${C.line}`,
            borderRadius: 99,
            padding: "4px 10px 4px 8px",
            boxShadow: "0 2px 12px rgba(0,0,0,.18)",
            pointerEvents: "none",
          }}>
            {syncStatus === "syncing" && (
              <>
                <CloudUpload size={13} style={{ color: C.lime, animation: "spin 1.2s linear infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.inkSoft }}>Saving…</span>
              </>
            )}
            {syncStatus === "synced" && (
              <>
                <Cloud size={13} style={{ color: C.lime }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.inkSoft }}>Saved</span>
              </>
            )}
            {syncStatus === "error" && (
              <>
                <CloudUpload size={13} style={{ color: "#ef4444" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444" }}>Sync failed</span>
              </>
            )}
          </div>
        </Portal>
      )}

      {/* tab bar — portaled to document.body so it is never clipped by the app-frame's
          overflow:hidden / border-radius stacking context on iOS Safari. */}
      <Portal>
      <div className="sprig-tabbar sprig-glass" style={{ display: "flex", borderTop: `1px solid ${C.line}`, background: C.navBg, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {((() => {
          const ALL_NAV = [
            ["today",     Home,     "Today",  null],
            ["nutrition", Flame,    "Food",   "nutrition"],
            ["train",     Dumbbell, "Train",  "training"],
            ["sleep",     Moon,     "Sleep",  "sleep"],
            ["coach",     Sparkles, "Coach",  "coach"],
            ["more",      User,     "More",   null],
          ];
          // Cap at 5 visible tabs. "More" is always last, "Coach" is the first to get folded in.
          const visible = ALL_NAV.filter(([,,,key]) => !key || trackingPrefs[key] !== false);
          return visible.length > 5 ? visible.filter(([k]) => k !== "coach") : visible;
        })()).map(([k, Ic, lbl]) => (
          <button key={k} onClick={() => {
            setTab(k);
            setResult(null);
            setFoodOverlayMode(null);
            setError("");
            setFavoriteMode(false);
            buzz("tap");
            try { document.querySelector(".sprig-content")?.scrollTo({ top: 0 }); } catch (_) {}
          }}
            style={{ flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", padding: "10px 4px 13px", minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab === k ? C.lime : C.muted, WebkitTapHighlightColor: "transparent" }}>
            <Ic size={20} strokeWidth={tab === k ? 2.4 : 2} />
            <span style={{ fontSize: 10, fontWeight: tab === k ? 700 : 500, whiteSpace: "nowrap" }}>{lbl}</span>
            {tab === k && <span style={{ width: 4, height: 4, borderRadius: 99, background: C.lime, display: "block" }} />}
          </button>
        ))}
      </div>
      </Portal>

      {/* Log food CTA moved inline — see NutritionTab. One CTA per view, no floating duplicate. */}

      {/* ── New Record achievement toast ──
          Phase-based: entering → visible → exiting → unmounted.
          Portaled to body so it's never clipped by overflow:hidden ancestors.
          z-index 4000 puts it above every overlay including the rest timer (1600). */}
      {recordToast && (
        <Portal>
          {/* Outer centering wrapper — translateX(-50%) only, never animated */}
          <div style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 14px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 4000,
            pointerEvents: "none",
          }}>
            {/* Inner banner — calm slide+fade only, no bounce, no glow burst */}
            <div
              className={`record-toast${recordToast.phase === "exiting" ? " record-toast-exit" : ""}`}
              style={{
                background: C.isDark ? "rgba(9,22,14,0.96)" : "rgba(255,255,255,0.97)",
                border: `1px solid ${C.lime}55`,
                borderRadius: 16,
                padding: "10px 16px 10px 10px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
                boxShadow: "0 4px 20px rgba(0,0,0,.32)",
                maxWidth: "min(92vw, 360px)",
                minWidth: 200,
                cursor: "default",
              }}
            >
              {/* Small medal icon — no animation, just a quiet indicator */}
              <div style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background: C.green + "28",
                border: `1px solid ${C.lime}44`,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}>
                <Medal size={14} color={C.lime} />
              </div>
              {/* Text block — exercise name + record line */}
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.2, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recordToast.exName}</span>
                <span style={{ fontSize: 11.5, color: C.lime, fontWeight: 600, lineHeight: 1.3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.92 }}>{recordToast.label}</span>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Floating rest timer — portaled to document.body + fixed so it stays pinned above the
          tab bar no matter how far the user scrolls the exercise list (frame has overflow:hidden
          + transformed ancestors that would otherwise clip an absolute/fixed child). */}
      {activeWorkout && rest && (restLeft > 0 || restDone) && (
        <Portal>
          <div className="sprig-pop-centered" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", width: "min(92vw, 430px)", bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 12px)", background: restDone && restLeft <= 0 ? C.green : C.cardSolid, borderRadius: 20, padding: "12px 16px", color: "#fff", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 40px rgba(0,0,0,.44)", border: `1px solid ${restDone && restLeft <= 0 ? C.green : C.green + "44"}`, zIndex: 1600 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: restDone && restLeft <= 0 ? "rgba(255,255,255,.2)" : C.green + "22", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Timer size={18} color={restDone && restLeft <= 0 ? "#fff" : C.greenSoft} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: restDone && restLeft <= 0 ? "rgba(255,255,255,.8)" : C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
                {restLeft <= 0 ? "Ready to go!" : rest.exName}
              </div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: restDone && restLeft <= 0 ? "#fff" : C.lime, lineHeight: 1 }}>{restLeft <= 0 ? "Go!" : fmtClock(restLeft)}</div>
            </div>
            {restLeft > 0 && (
              <>
                <button className="sprig-tap" onClick={() => (rest.paused ? resumeRest() : pauseRest())} aria-label={rest.paused ? "Resume" : "Pause"}
                  style={{ background: C.bg2, border: `1px solid ${C.line}`, cursor: "pointer", width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center", color: C.inkSoft }}>
                  {rest.paused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button className="sprig-tap" onClick={() => addRest(30000)} style={{ background: C.bg2, border: `1px solid ${C.line}`, cursor: "pointer", padding: "0 10px", height: 36, borderRadius: 10, fontSize: 12, fontWeight: 700, color: C.inkSoft, fontFamily: "DM Sans" }}>+30s</button>
              </>
            )}
            <button className="sprig-tap" onClick={skipRest} style={{ background: C.green, border: "none", cursor: "pointer", padding: "0 14px", height: 36, borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "DM Sans" }}>{restLeft <= 0 ? "Go" : "Skip"}</button>
          </div>
        </Portal>
      )}



      {/* End-of-day quick-log nudge — gentle, dismissible, never affects the score. Hidden during
          an active workout (rest timer owns that space) and on the Today tab (quick log is right there). */}
      {bedNudge && !bedNudgeDismissed && !activeWorkout && tab !== "today" && !quickOpen && (
        <Portal>
        <div className="sprig-pop-centered" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", width: "min(92vw, 416px)", bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 14px)", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 8px 30px rgba(0,0,0,.18)", zIndex: 1500 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "#7A6FB022", display: "grid", placeItems: "center", flexShrink: 0 }}><Moon size={17} color="#7A6FB0" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Wind-down check-in</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Bedtime soon — log your {bedNudge.missing.join(", ")} before you wrap up.</div>
          </div>
          <button className="sprig-tap" onClick={() => { setQuickOpen(true); setBedNudgeDismissed(true); }} style={{ ...btn(C.green, "#fff"), padding: "8px 13px", fontSize: 12.5, flexShrink: 0 }}>Quick log</button>
          <button className="sprig-tap" onClick={() => setBedNudgeDismissed(true)} aria-label="Dismiss" style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: 4, flexShrink: 0 }}><X size={15} /></button>
        </div>
        </Portal>
      )}

      {logGap.show && !quickOpen && (
        <ForgotToLogPrompt
          missing={logGap.missing}
          onQuickLog={() => { setQuickOpen(true); }}
          onNothingDay={() => persistDayStatus({ ...dayStatus, [date]: "nothing" })}
          onSnooze={() => { const existing = (logGapSnoozes || []).find((s) => s.date === date); persistLogGapSnoozes([...(logGapSnoozes || []).filter((s) => s.date !== date), { date, snoozedUntil: Date.now() + 2 * 60 * 60 * 1000, count: (existing?.count || 0) + 1 }]); }}
          onDismiss={() => persistDayStatus({ ...dayStatus, [date]: "dismissed" })}
        />
      )}

      {quickOpen && <QuickLogSheet
        profile={profile}
        quickLog={quickLog}
        date={date}
        tp={trackingPrefs}
        onSave={async (ql) => {
          await persistQuickDayLog(ql);
          // Auto-complete matching V1 habits
          const hdNow = { ...(habitDone || {}) };
          const todayList = new Set(hdNow[date] || []);
          if (ql.hitProtein) todayList.add("protein");
          if (ql.hitWater) todayList.add("water");
          if (ql.enoughMovement) todayList.add("steps");
          if (ql.trainedToday) todayList.add("gym");
          if (ql.supplementsTaken) todayList.add("supps");
          if (todayList.size !== (hdNow[date] || []).length) {
            persistHabitDone({ ...hdNow, [date]: Array.from(todayList) });
          }
          await persistDayStatus({ ...dayStatus, [date]: "logged" });
          // Fire wins immediately after QL save (QL not in useEffect deps due to declaration order)
          try {
            const wCands = detectDayWins({ t, daily, targets, sleepInfo: { waterGoal: profile?.weight ? Math.round(profile.weight * 35) : 2500 }, profile, quickLog: ql });
            if (wCands.length) recordWins(wCands, date);
          } catch (_) {}
          setQuickOpen(false);
          logged("Day quick logged ⚡", "success");
        }}
        onClose={() => setQuickOpen(false)} />}

      {/* All of today's wins */}
      {winsOpen && (
        <Portal>
        <div onClick={() => setWinsOpen(false)} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
          <div onClick={(e) => e.stopPropagation()} className="sprig-sheet sprig-bottom-sheet"
            style={{ width: "100%", maxWidth: 440, background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: "20px 20px 0 0", padding: "12px 18px 20px", boxShadow: "0 -8px 30px rgba(0,0,0,.35)", maxHeight: "75vh", overflowY: "auto" }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: C.line, margin: "0 auto 14px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Award size={18} color={C.lime} />
              <span style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: C.ink }}>Today's wins</span>
            </div>
            {(wins[date] || []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: C.muted, padding: "10px 0" }}>No wins yet today.</div>
            ) : (
              (wins[date] || []).map((w) => <WinRow key={w.id} win={w} onKudos={(id) => kudoWin(id, date)} />)
            )}
            <button className="sprig-tap" onClick={() => setWinsOpen(false)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", marginTop: 12, padding: "6px 0" }}>Done</button>
          </div>
        </div>
        </Portal>
      )}

      {/* Workout recap — premium post-finish summary + kudos earned */}
      {recapView && (() => {
        const r = recapView.recap;
        const dayWins = (wins[date] || []).filter((w) => w.source === "workout");
        const trueRecords = (r.recordLifts || []).filter((rl) => !rl.firstTime && rl.prev > 0);
        const motivatingMsg = (() => {
          const recs = r.records || 0;
          const vol = r.totalVolume || 0;
          const sets = r.totalSets || 0;
          if (recs >= 3) return `Strong session — ${recs} new records and ${vol.toLocaleString()} kg lifted.`;
          if (recs >= 2) return `Solid session — ${recs} new bests today.`;
          if (recs === 1) return `New record set. ${vol.toLocaleString()} kg lifted.`;
          if (sets >= 15) return `High volume day — ${sets} sets and ${vol.toLocaleString()} kg lifted.`;
          if (sets >= 8) return `Solid session — consistency is the game.`;
          return "Consistency counts. Keep showing up.";
        })();
        return (
          <Portal>
          <div onClick={() => setRecapView(null)} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
            <div onClick={(e) => e.stopPropagation()} className="sprig-sheet sprig-bottom-sheet"
              style={{ width: "100%", maxWidth: 440, background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: "20px 20px 0 0", padding: "12px 18px 0", boxShadow: "0 -8px 30px rgba(0,0,0,.5)", maxHeight: "82vh", overflowY: "auto" }}>
              <div style={{ width: 36, height: 4, borderRadius: 99, background: C.line, margin: "0 auto 16px" }} />
              <div style={{ textAlign: "center", marginBottom: 10 }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${C.lime}2a, ${C.green}22)`, border: `1.5px solid ${C.lime}44`, display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                  <Dumbbell size={24} color={C.lime} />
                </div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.ink }}>Workout complete</div>
                <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 5, lineHeight: 1.4 }}>{motivatingMsg}</div>
              </div>
              {/* stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6, marginBottom: 16, marginTop: 14 }}>
                {[
                  [r.durationMin + "m", "Duration"],
                  [r.totalSets, "Sets"],
                  [r.totalVolume >= 1000 ? (r.totalVolume / 1000).toFixed(1) + "t" : r.totalVolume.toLocaleString(), "Volume"],
                  [r.records > 0 ? r.records : "—", "Records"],
                ].map(([v, l], i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: 12, padding: "11px 6px", textAlign: "center" }}>
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: (l === "Records" && r.records > 0) ? C.lime : C.ink }}>{v}</div>
                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
              {/* New records — each lift with e1RM delta */}
              {trueRecords.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="sprig-eyebrow" style={{ color: C.lime, marginBottom: 8 }}>New bests</div>
                  {trueRecords.map((rl) => (
                    <div key={rl.name} style={{ display: "flex", alignItems: "center", gap: 10, background: C.lime + "0f", border: `1px solid ${C.lime}33`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 10, background: `radial-gradient(circle, ${C.lime}, ${C.green})`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        <Medal size={14} color="#0A1F12" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rl.name}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                          e1RM {rl.e1RM} kg <span style={{ color: C.greenSoft, fontWeight: 600 }}>↑ {rl.e1RM - rl.prev} kg from {rl.prev}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Exercise list */}
              {(r.exercises || []).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="sprig-eyebrow" style={{ marginBottom: 8 }}>Exercises</div>
                  {(r.exercises || []).slice(0, 7).map((ex, i) => {
                    const bestSet = (ex.sets || []).reduce((b, s) => (est1RM(s.w, s.reps) > est1RM(b.w, b.reps) ? s : b), ex.sets?.[0] || { w: 0, reps: 0 });
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ex.name}</span>
                        <span style={{ fontSize: 11.5, color: C.muted, flexShrink: 0 }}>{ex.sets?.length ?? 0} sets</span>
                        {bestSet.w > 0 && <span style={{ fontSize: 11, color: C.inkSoft, flexShrink: 0 }}>{bestSet.w}kg×{bestSet.reps}</span>}
                      </div>
                    );
                  })}
                  {(r.exercises || []).length > 7 && <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>+{r.exercises.length - 7} more</div>}
                </div>
              )}
              {/* kudos earned */}
              {dayWins.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div className="sprig-eyebrow" style={{ color: C.lime, marginBottom: 6 }}>Kudos earned</div>
                  {dayWins.map((w) => <WinRow key={w.id} win={w} onKudos={(id) => kudoWin(id, date)} />)}
                </div>
              )}
              {/* action buttons */}
              <div style={{ display: "flex", gap: 8, padding: "12px 0 2px" }}>
                <button className="sprig-tap" onClick={() => { setRecapView(null); setTab("train"); setTrainSub("recovery"); }}
                  style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "13px 0", fontWeight: 600 }}>View history</button>
                <button className="sprig-tap" onClick={() => setRecapView(null)}
                  style={{ ...btn(C.lime, "#0A1F12"), flex: 1.8, padding: "13px 0", fontWeight: 700 }}>Done</button>
              </div>
            </div>
          </div>
          </Portal>
        );
      })()}

      {searchOpen && (() => {
        const results = searchAll({ q: searchQ, library, workouts, history, supps, painLogs, weightSeries, sleepLogs, healthSeries, focusSessions });
        const jumpTo = (r) => {
          setSearchOpen(false);
          if (r.kind === "exercise" || r.kind === "workout") setTab("train");
          else if (r.kind === "food") setTab("nutrition");
          else if (r.kind === "supp") setTab("nutrition");
          else if (r.kind === "pain" || r.kind === "health") setTab("health");
          else if (r.kind === "weight") setTab("progress");
          else if (r.kind === "sleep") setTab("sleep");
          else if (r.kind === "focus") setTab("mind");
        };
        return <SearchSheet onClose={() => setSearchOpen(false)} onJump={jumpTo} results={results} query={searchQ} setQuery={setSearchQ} />;
      })()}

      {calOpen && <CalendarSheet onClose={() => setCalOpen(false)}
        getDayIcons={(date) => calendarDay({ date, workouts, weightSeries, sleepLogs, history, painLogs, dailyHistory, targets })} />}

      {askOpen && (() => {
        const calAvg = history.length ? Math.round(history.slice(-14).reduce((a, h) => a + h.calories, 0) / Math.min(14, history.length)) : null;
        const protAvg = history.length ? Math.round(history.slice(-14).reduce((a, h) => a + h.protein, 0) / Math.min(14, history.length)) : null;
        const sleepAvg = sleepLogs.length ? Math.round(sleepLogs.slice(-7).reduce((a, l) => a + l.durationMin, 0) / Math.min(7, sleepLogs.length)) : null;
        const sleepLastMin = sleepLogs.length ? sleepLogs[sleepLogs.length - 1].durationMin : null;
        const weeklyWk = workouts.filter((w) => Date.now() - w.ts <= 7 * 864e5).length;
        const stalls = (typeof stallingLifts === "function") ? stallingLifts(workouts) : [];
        const ws = [...(weightSeries || [])].sort((a, b) => a.date.localeCompare(b.date));
        let weightRate = null;
        if (ws.length >= 2) {
          const first = ws[Math.max(0, ws.length - 14)], lastW = ws[ws.length - 1];
          const days = Math.max(1, (new Date(lastW.date) - new Date(first.date)) / 864e5);
          weightRate = +(((lastW.kg - first.kg) / days) * 7).toFixed(2);
        }
        // Today's numbers — useful for "I have 800 kcal left, what should I eat?" style questions
        const todayTotals = dayTotals(entries || []);
        const todayCtx = {
          calories: todayTotals.calories, protein_g: todayTotals.protein,
          carbs_g: todayTotals.carbs, fat_g: todayTotals.fat, fiber_g: todayTotals.fiber,
          waterMl: daily?.water ?? 0, steps: daily?.steps ?? 0,
          cardioMin: daily?.cardioMin ?? 0, cardioKcal: daily?.cardioKcal ?? 0,
          alcohol_g: daily?.alcohol_g ?? 0, caffeineMg: daily?.caffeine ?? 0,
          weightKg: daily?.weight ?? null,
          sportSessions: (Array.isArray(daily?.sportSessions) && daily.sportSessions.length)
            ? daily.sportSessions.map((s) => ({ name: s.sportName, durationMin: s.durationMin, intensity: s.intensity, estimatedKcal: s.estimatedCalories }))
            : undefined,
        };
        // Muscle recovery map (top 5 most-fatigued, abbreviated for the model)
        const muscleRecoveryList = MUSCLES.map(([k, n]) => ({ muscle: n, fatigue: Math.round(trainInfo.recovery[k]?.fatigue || 0) }))
          .sort((a, b) => b.fatigue - a.fatigue).slice(0, 5);
        // Supplements taken today
        const suppsTodayList = (supps || []).filter((s) => takenIds.includes(s.id)).map((s) => s.name);
        const ctx = {
          calAvg, protAvg, sleepAvg, sleepLastMin,
          sleepDebt: sleepInfo?.debtMin ?? null,
          weeklyWk, stalls,
          painActive: activePainLevel !== "none",
          painNotes: activePainLocations.length ? `${activePainLevel} at ${activePainLocations.join(", ")}` : null,
          weightRate,
          today: todayCtx,
          muscleRecovery: muscleRecoveryList,
          trainedToday: !!trainedToday,
          supplements: suppsTodayList.length ? suppsTodayList : null,
          todayWins: (profile?.showWins === false) ? null : ((wins[date] || []).map((w) => w.title)),
          quickLog: quickLog ? {
            trainedToday: trackingPrefs.training !== false ? quickLog.trainedToday : undefined,
            trainingType: trackingPrefs.training !== false ? quickLog.trainingType : undefined,
            trainingIntensity: trackingPrefs.training !== false ? quickLog.trainingIntensity : undefined,
            hitCalories: trackingPrefs.nutrition !== false ? quickLog.hitCalories : undefined,
            hitProtein: trackingPrefs.nutrition !== false ? quickLog.hitProtein : undefined,
            hitWater: trackingPrefs.water !== false ? quickLog.hitWater : undefined,
            enoughSleep: trackingPrefs.sleep !== false ? quickLog.enoughSleep : undefined,
            enoughMovement: trackingPrefs.movement !== false ? quickLog.enoughMovement : undefined,
            noAlcohol: trackingPrefs.alcohol !== false ? quickLog.noAlcohol : undefined,
            supplementsTaken: trackingPrefs.supplements !== false ? quickLog.supplementsTaken : undefined,
            source: "quick_log",
            confidence: "estimated",
          } : null,
        };
        return <AskCoachSheet onClose={() => setAskOpen(false)} context={ctx} online={online} runAnalysis={(q) => askCoach(q, ctx)}
          onSaveNote={async (question, answer) => {
            try {
              const raw = await store.get("sprig_coach_notes_v1");
              const notes = safeParse(raw, [], asArray);
              await store.set("sprig_coach_notes_v1", JSON.stringify([{ id: uid(), ts: Date.now(), question, answer }, ...notes].slice(0, 100)));
              showToast("Note saved");
            } catch (_) { showToast("Couldn't save note", "error"); }
          }} />;
      })()}

      {photoOpen && <PhotoSheet onClose={() => setPhotoOpen(false)} photos={progressPhotos} onAdd={addProgressPhoto} onRemove={removeProgressPhoto} />}

      {/* Favorite meal create/edit — frame-level so it's never clipped by the scroll container */}
      {/* First-workout rep-range preference — asked once, stored on the profile, editable in settings */}
      {repRangePrompt && (
        <Portal>
        <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div className="sprig-sheet sprig-bottom-sheet"
            style={{ width: "100%", maxWidth: 440, background: C.cardSolid, borderRadius: "20px 20px 0 0", padding: "22px 18px", paddingBottom: "calc(22px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -12px 40px rgba(0,0,0,.5)" }}>

            {/* Step 1 — rep range */}
            {rrpStep === "rep_range" && <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, textAlign: "center", color: C.ink }}>What rep range do you train in?</div>
              <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 6, marginBottom: 18, lineHeight: 1.5 }}>
                Vitae uses this to guide progressive overload. You can change it anytime in Settings.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { range: [5, 8],   title: "5–8 reps",   sub: "Strength focus — heavier loads" },
                  { range: [8, 10],  title: "8–10 reps",  sub: "Strength + size balance" },
                  { range: [10, 12], title: "10–12 reps", sub: "Hypertrophy — muscle growth" },
                  { range: [12, 15], title: "12–15 reps", sub: "Endurance & higher volume" },
                ].map((opt) => (
                  <button key={opt.title} className="sprig-tap"
                    onClick={() => {
                      saveProfile({ ...profile, repRange: opt.range, repRangeAsked: true });
                      setRrpPending({ repRange: opt.range });
                      setRrpStep("rir_tracking");
                    }}
                    style={{ background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 13, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "DM Sans" }}>
                    <Dumbbell size={17} color={C.greenSoft} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{opt.title}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{opt.sub}</div>
                    </div>
                    <ChevronRight size={16} color={C.muted} />
                  </button>
                ))}
              </div>
              <button className="sprig-tap" onClick={() => { saveProfile({ ...profile, repRangeAsked: true }); setRepRangePrompt(false); setRrpStep("rep_range"); setRrpPending({}); }}
                style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", marginTop: 14, padding: "6px 0" }}>Skip — use smart defaults</button>
            </>}

            {/* Step 2 — RIR tracking preference */}
            {rrpStep === "rir_tracking" && <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, textAlign: "center", color: C.ink }}>Track reps in reserve?</div>
              <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 6, marginBottom: 18, lineHeight: 1.5 }}>
                After each set, Vitae can ask how many reps you had left — this makes overload suggestions more accurate.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { val: "always",    title: "After every set",    sub: "Most accurate — great for serious tracking" },
                  { val: "hard_sets", title: "On working sets only", sub: "Skip warmups, ask on heavier sets" },
                  { val: "off",       title: "Don't ask",          sub: "Vitae will use rep count alone" },
                ].map((opt) => (
                  <button key={opt.val} className="sprig-tap"
                    onClick={() => {
                      const pending = { ...rrpPending, trackRir: opt.val };
                      setRrpPending(pending);
                      if (opt.val === "off") {
                        saveRirPref({ trackRir: "off", intensityStyle: "balanced" });
                        setRepRangePrompt(false); setRrpStep("rep_range"); setRrpPending({});
                      } else {
                        setRrpStep("intensity_style");
                      }
                    }}
                    style={{ background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 13, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "DM Sans" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{opt.title}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{opt.sub}</div>
                    </div>
                    <ChevronRight size={16} color={C.muted} />
                  </button>
                ))}
              </div>
              <button className="sprig-tap" onClick={() => { saveRirPref({ trackRir: "always", intensityStyle: "balanced" }); setRepRangePrompt(false); setRrpStep("rep_range"); setRrpPending({}); }}
                style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", marginTop: 14, padding: "6px 0" }}>Skip — use defaults</button>
            </>}

            {/* Step 3 — intensity style */}
            {rrpStep === "intensity_style" && <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, textAlign: "center", color: C.ink }}>How hard do you push?</div>
              <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 6, marginBottom: 18, lineHeight: 1.5 }}>
                Vitae uses this to calibrate when to push harder vs. when to hold steady.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { val: "failure",          title: "To failure",         sub: "You push every working set to your absolute limit" },
                  { val: "close_to_failure", title: "Close to failure",   sub: "0–1 reps in reserve — very hard but not always all-out" },
                  { val: "balanced",         title: "Balanced effort",    sub: "1–2 RIR — hard sets with something left in the tank" },
                  { val: "leave_reps",       title: "Leave reps behind",  sub: "2–3+ RIR — controlled, technique-focused training" },
                ].map((opt) => (
                  <button key={opt.val} className="sprig-tap"
                    onClick={() => {
                      saveRirPref({ ...rrpPending, intensityStyle: opt.val });
                      setRepRangePrompt(false); setRrpStep("rep_range"); setRrpPending({});
                    }}
                    style={{ background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 13, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "DM Sans" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{opt.title}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{opt.sub}</div>
                    </div>
                    <ChevronRight size={16} color={C.muted} />
                  </button>
                ))}
              </div>
              <button className="sprig-tap" onClick={() => { saveRirPref({ ...rrpPending, intensityStyle: "balanced" }); setRepRangePrompt(false); setRrpStep("rep_range"); setRrpPending({}); }}
                style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", marginTop: 14, padding: "6px 0" }}>Skip — use balanced</button>
            </>}

          </div>
        </div>
        </Portal>
      )}

      {/* Post-set RIR sheet — frame-level (was clipped by overflow:hidden when nested in the workout list) */}
      {rirPrompt && activeWorkout && (() => {
        const ex = activeWorkout.exercises[rirPrompt.exIdx];
        const s = ex?.sets?.[rirPrompt.setIdx];
        return (
          <Portal>
          <div onClick={() => setRirPrompt(null)} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={(e) => e.stopPropagation()} className="sprig-sheet sprig-bottom-sheet"
              style={{ width: "100%", maxWidth: 440, background: C.cardSolid, borderRadius: "20px 20px 0 0", padding: "20px 18px", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -8px 30px rgba(0,0,0,.25)" }}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, textAlign: "center", color: C.ink }}>How many reps in reserve?</div>
              <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 4, marginBottom: 16 }}>
                How hard was that set?{s ? ` · ${ex.name} ${s.w}${profile.unit || "kg"} × ${s.reps}` : ""}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                {[["0", "0", "Failure"], ["1", "1", "Hard"], ["2", "2", "Solid"], ["3", "3+", "Easy"]].map(([val, big, lbl]) => (
                  <button key={val} className="sprig-tap" onClick={() => chooseRir(rirPrompt.exIdx, rirPrompt.setIdx, +val)}
                    style={{
                      background: C.bg2,
                      border: `1.5px solid ${C.line}`,
                      cursor: "pointer", borderRadius: 14, padding: "14px 0",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 3, fontFamily: "DM Sans",
                    }}>
                    <span style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.inkSoft }}>{big}</span>
                    <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>{lbl}</span>
                  </button>
                ))}
              </div>
              <button className="sprig-tap" onClick={() => setRirPrompt(null)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", marginTop: 14, padding: "6px 0" }}>Skip</button>
            </div>
          </div>
          </Portal>
        );
      })()}

      {/* logSheet merged into unified foodOverlayMode overlay above */}

      {/* Favorite-source chooser — same 4 methods as food logging, but result is saved as a favorite */}
      {favChooser && (
        <Portal>
        <div onClick={() => setFavChooser(false)} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.58)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
          <div onClick={(e) => e.stopPropagation()} className="sprig-sheet sprig-bottom-sheet"
            style={{ width: "100%", maxWidth: 440, background: C.cardSolid, borderRadius: "20px 20px 0 0", padding: "20px 18px", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -8px 30px rgba(0,0,0,.2)" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>New favorite meal</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}>Create it the same way you log food — we'll save the result as a favorite to reuse.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                ["snap", <Camera size={18} />, "Snap food", "Photo → AI estimate"],
                ["scan", <ScanLine size={18} />, "Scan label", "Nutrition label → AI"],
                ["describe", <PencilLine size={18} />, "Describe", "Type it, AI estimates"],
                ["manual", <Plus size={18} />, "Manual", "Enter values yourself"],
              ].map(([src, ic, title, sub]) => (
                <button key={src} className="sprig-tap" onClick={() => chooseFavoriteSource(src)}
                  style={{ background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 14, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 5, textAlign: "left", fontFamily: "DM Sans" }}>
                  <span style={{ color: C.greenSoft }}>{ic}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{title}</span>
                  <span style={{ fontSize: 10.5, color: C.muted }}>{sub}</span>
                </button>
              ))}
            </div>
            <button className="sprig-tap" onClick={() => setFavChooser(false)} style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", marginTop: 14, padding: "6px 0" }}>Cancel</button>
          </div>
        </div>
        </Portal>
      )}

      {favForm && (
        <FavoriteFormSheet form={favForm} setForm={setFavForm} isNew={favEditing === "new"} onClose={closeFavForm}
          onSubmit={() => {
            const f = favForm;
            if (!f || !f.name.trim()) return;
            if (favEditing === "new") {
              saveFavoriteMeal(f, { onDuplicate: (fav, existing) => setFavDup({ form: f, existing }) });
            } else {
              updateFavoriteMeal(favEditing, {
                name: f.name.trim(), serving: f.serving || "1 serving",
                calories: Math.max(0, Math.round(+f.calories || 0)), protein_g: Math.max(0, Math.round(+f.protein || 0)),
                carbs_g: Math.max(0, Math.round(+f.carbs || 0)), fat_g: Math.max(0, Math.round(+f.fat || 0)), fiber_g: Math.max(0, Math.round(+f.fiber || 0)),
                tags: f.tags || [],
              });
              showToast("Favorite updated");
            }
            closeFavForm();
          }} />
      )}
      {favDup && (
        <Portal>
        <div onClick={() => setFavDup(null)} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.58)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} className="sprig-pop" style={{ width: "100%", maxWidth: 340, background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: 18, padding: 20, boxShadow: "0 18px 45px rgba(0,0,0,.45)" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Favorite already exists</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 16 }}>You already have a favorite called "{favDup.existing.name}". Replace it, or save a copy?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="sprig-tap" onClick={() => { replaceFavoriteMeal(favDup.existing.id, favDup.form); showToast("Favorite updated"); setFavDup(null); closeFavForm(); }} style={{ ...btn(C.green, "#fff"), padding: "11px 0", fontSize: 13 }}>Replace existing</button>
              <button className="sprig-tap" onClick={() => { saveFavoriteMeal({ ...favDup.form, name: favDup.form.name + " (copy)" }); setFavDup(null); closeFavForm(); }} style={{ ...btn(C.bg2, C.green), padding: "11px 0", fontSize: 13 }}>Save as copy</button>
              <button className="sprig-tap" onClick={() => setFavDup(null)} style={{ background: "transparent", color: C.muted, border: "none", cursor: "pointer", padding: "8px 0", fontSize: 12 }}>Cancel</button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* storage write-error banner — appears when persistence is failing (quota, rate limit, etc.) */}
      {writeError && Date.now() - writeError.ts < 30000 && (
        <Portal>
        <div style={{ position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 12px)", left: "50%", transform: "translateX(-50%)", background: writeError.quota ? C.coral : C.amber, color: "#fff", padding: "9px 14px", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 24px rgba(0,0,0,.38)", fontSize: 12, fontFamily: "DM Sans", zIndex: 4000, maxWidth: 400, border: "1px solid rgba(255,255,255,0.18)" }}>
          <Square size={13} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, lineHeight: 1.4 }}>
            {writeError.quota
              ? "Storage is full — old data won't save. Export a backup and clear demo/test data."
              : writeError.key === "import"
                ? writeError.msg
                : "Saving to device failed — your data is held in memory only. Export a backup soon."}
          </span>
          <button className="sprig-tap" onClick={() => setWriteError(null)} aria-label="Dismiss"
            style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer", padding: 0, opacity: 0.8 }}>
            <X size={14} />
          </button>
        </div>
        </Portal>
      )}

      {/* mistake-detection confirmation */}
      {pendingConfirm && (
        <Portal>
        <div onClick={() => setPendingConfirm(null)} className="sprig-dim"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.58)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
            style={{ width: "100%", maxWidth: 340, background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: 18, padding: 20, boxShadow: "0 18px 45px rgba(0,0,0,.55)" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 6 }}>This looks unusual</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 16 }}>{pendingConfirm.message}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sprig-tap" onClick={() => setPendingConfirm(null)}
                style={{ flex: 1, background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans" }}>Cancel</button>
              <button className="sprig-tap" onClick={() => { const fn = pendingConfirm.onConfirm; setPendingConfirm(null); fn && fn(); }}
                style={{ flex: 1, background: C.green, color: "#fff", border: "none", cursor: "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans" }}>Save anyway</button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* undo toast — appears after a delete and gives a few seconds to bring it back */}
      {undoItem && (
        <Portal>
        <div className="sprig-bottom-toast sprig-toast-anim" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", background: C.cardSolid, color: C.ink, padding: "11px 16px", borderRadius: 99, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 8px 24px rgba(0,0,0,.45)", border: `1px solid ${C.line}`, fontSize: 12.5, fontFamily: "DM Sans", zIndex: 4000, whiteSpace: "nowrap" }}>
          <span>{(() => {
            const k = undoItem.kind, d = undoItem.data;
            if (k === "food") return `Removed “${d?.name || "entry"}”`;
            if (k === "meal") return `Removed “${d?.name || "saved meal"}”`;
            if (k === "supp") return `Removed “${d?.name || "supplement"}”`;
            if (k === "sleep") return "Removed sleep log";
            if (k === "pain") return "Removed pain log";
            if (k === "photo") return "Removed photo";
            return "Removed";
          })()}</span>
          <button className="sprig-tap" onClick={() => { undoItem.restore && undoItem.restore(); setUndoItem(null); }} style={{ background: "transparent", color: C.greenSoft, border: "none", fontWeight: 700, cursor: "pointer", padding: 0 }}><RotateCcw size={13} /> Undo</button>
        </div>
        </Portal>
      )}

      {/* calm success/info toast */}
      {toast && !undoItem && (
        <Portal>
        <div className="sprig-bottom-toast sprig-toast-anim" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", background: toast.tone === "error" ? C.coral : C.cardSolid, color: toast.tone === "error" ? "#fff" : C.ink, padding: "10px 16px", borderRadius: 99, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 24px rgba(0,0,0,.45)", border: `1px solid ${toast.tone === "error" ? "transparent" : C.line}`, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", zIndex: 4000, whiteSpace: "nowrap" }}>
          {toast.tone !== "error" && <Check size={14} color={C.leaf} />}
          <span>{toast.text}</span>
        </div>
        </Portal>
      )}
    </div>
  );
}

function DockBtn({ icon, label, onClick, primary }) {
  return (
    <button className="sprig-tap" onClick={onClick}
      style={{ flex: 1, padding: "14px 0", borderRadius: 16, border: primary ? "none" : `1px solid ${C.line}`,
        background: primary ? C.green : C.card, color: primary ? "#fff" : C.ink, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6, boxShadow: C.shadow, fontFamily: "DM Sans" }}>
      {icon}<span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

function ManualEntry({ onAdd, onCancel, embedded }) {
  const [f, setF] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const ok = (f.calories || f.protein || f.carbs || f.fat);
  // Fields inlined (not a nested component) so they don't remount + lose focus on each keystroke.
  const fieldStyle = { width: "100%", textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 4px", fontFamily: "DM Sans", fontSize: 15, fontWeight: 600, background: C.bg, color: C.ink, boxSizing: "border-box" };
  const inner = (
    <>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.greenSoft, marginBottom: 9, display: "flex", alignItems: "center", gap: 6 }}>
        <Calculator size={14} /> Manual entry — no AI, just numbers
      </div>
      <input value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus onFocus={scrollIntoViewOnFocus} placeholder="Name (optional)"
        style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink, marginBottom: 9, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: 7 }}>
        {[["calories", "Calories"], ["protein", "Protein g"], ["carbs", "Carbs g"], ["fat", "Fat g"], ["fiber", "Fiber g"]].map(([k, label]) => (
          <div key={k} style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
            <input value={f[k]} onChange={(e) => set(k, e.target.value)} onFocus={scrollIntoViewOnFocus} inputMode="decimal" placeholder="0" style={fieldStyle} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
        <button className="sprig-tap" onClick={onCancel} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "11px 0" }}>Cancel</button>
        <button className="sprig-tap" disabled={!ok} onClick={() => onAdd(f)}
          style={{ ...btn(ok ? C.lime : C.bg2, ok ? "#0A1F12" : C.muted), flex: 2, padding: "11px 0", fontWeight: 700 }}><Plus size={15} /> Add to today</button>
      </div>
    </>
  );
  if (embedded) return <div style={{ marginBottom: 8 }}>{inner}</div>;
  return (
    <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, marginBottom: 10, border: `1px solid ${C.line}` }}>{inner}</div>
  );
}

function CheckinRow({ label, value, opts, onPick }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0" }}>
      <span style={{ width: 56, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>{label}</span>
      <div style={{ display: "flex", gap: 5, flex: 1 }}>
        {opts.map(([v, lbl, col]) => {
          const on = value === v;
          return (
            <button key={v} className="sprig-tap" onClick={() => onPick(v)}
              style={{ flex: 1, border: "none", cursor: "pointer", padding: "7px 0", borderRadius: 9, fontSize: 11.5, fontWeight: 600, fontFamily: "DM Sans",
                background: on ? (col || C.green) : C.bg2, color: on ? "#fff" : C.muted }}>{lbl}</button>
          );
        })}
      </div>
    </div>
  );
}
function Stepper({ icon, label, value, suffix, step, onChange, color, goal }) {
  const reached = goal && value >= goal;
  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 11px", boxShadow: C.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: color || C.greenSoft, fontSize: 11, fontWeight: 600 }}>{icon} {label}{goal ? <span style={{ marginLeft: "auto", color: reached ? C.greenSoft : C.muted, fontWeight: 600 }}>{reached ? "✓" : `/${goal >= 1000 ? (goal / 1000) + "L" : goal}`}</span> : null}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
        <button className="sprig-tap" onClick={() => onChange(Math.max(0, value - step))} style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: C.bg2, color: C.inkSoft, cursor: "pointer", display: "grid", placeItems: "center" }}><Minus size={14} /></button>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700 }}>{value}{suffix}</span>
        <button className="sprig-tap" onClick={() => onChange(value + step)} style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: C.green, color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}><Plus size={14} /></button>
      </div>
      {goal ? <div style={{ height: 4, background: C.bg2, borderRadius: 99, marginTop: 8 }}><div style={{ width: Math.min(100, (value / goal) * 100) + "%", height: "100%", background: color || C.greenSoft, borderRadius: 99, transition: "width .4s" }} /></div> : null}
    </div>
  );
}

/* ---------------- Today tab -------------- */

/* ---------------- alcohol / drinks quick-log card -------------- */
function DrinksCard({ daily, onDaily, onAddEntry }) {
  const [open, setOpen] = useState(false);
  const drinks = Array.isArray(daily?.alcoholDrinks) ? daily.alcoholDrinks : [];
  const totalG = drinks.reduce((a, d) => a + (d.alcohol_g || 0), 0);
  const totalKcal = drinks.reduce((a, d) => a + (d.kcal || 0), 0);
  const heavy = totalG >= 30;
  const moderate = totalG >= 15 && totalG < 30;

  const log = (preset) => {
    const next = [...drinks, { id: uid(), ts: Date.now(), ...preset }];
    onDaily({ alcoholDrinks: next, alcohol_g: next.reduce((a, d) => a + (d.alcohol_g || 0), 0), alcohol: next.length });
    buzz("light");
    // also push as a nutrition entry so calories count in dayTotals
    if (onAddEntry) onAddEntry({
      name: preset.name,
      calories: preset.kcal, protein_g: 0, carbs_g: preset.carbs || 0, fat_g: 0, fiber_g: 0,
      alcohol_g: preset.alcohol_g || 0,
      mult: 1, ts: Date.now(),
    });
  };
  const removeDrink = (id) => {
    const target = drinks.find((d) => d.id === id);
    const next = drinks.filter((d) => d.id !== id);
    onDaily({ alcoholDrinks: next, alcohol_g: next.reduce((a, d) => a + (d.alcohol_g || 0), 0), alcohol: next.length });
    // note: matching nutrition entry is NOT auto-removed — user can remove from entry list if desired
  };

  return (
    <div style={{ background: C.card, borderRadius: 14, padding: "12px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <span style={{ fontSize: 14 }}>🍷</span>
        <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Drinks today</div>
        {drinks.length > 0 && <span style={{ fontSize: 11.5, color: heavy ? C.coral : moderate ? C.amber : C.muted, fontWeight: 600 }}>{totalG}g · {totalKcal} kcal</span>}
      </div>
      {drinks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {drinks.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.ink, padding: "5px 0" }}>
              <span style={{ flex: 1 }}>{d.name}</span>
              <span style={{ color: C.muted, fontSize: 11.5 }}>{d.kcal} kcal</span>
              <button className="sprig-tap" onClick={() => removeDrink(d.id)} aria-label="Remove" style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: 2 }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {!open ? (
        <button className="sprig-tap" onClick={() => setOpen(true)} style={{ width: "100%", background: C.bg2, border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 0", fontSize: 12, fontWeight: 600, color: C.coral, fontFamily: "DM Sans" }}>
          <Plus size={12} /> Log a drink
        </button>
      ) : (
        <div style={{ background: C.bg, borderRadius: 11, padding: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {DRINK_PRESETS.map((p) => (
              <button key={p.id} className="sprig-tap" onClick={() => { log(p); }}
                style={{ background: C.card, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 9, padding: "8px 11px", display: "flex", alignItems: "center", gap: 8, fontFamily: "DM Sans" }}>
                <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, color: C.ink, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{p.kcal} kcal · {p.alcohol_g}g</span>
              </button>
            ))}
          </div>
          <button className="sprig-tap" onClick={() => setOpen(false)} style={{ ...btn(C.bg2, C.inkSoft), width: "100%", padding: "8px 0", fontSize: 12, marginTop: 8 }}>Done</button>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>
            Calories count toward today's total. Adjust your weight trend over time.
          </div>
        </div>
      )}
      {(moderate || heavy) && (
        <div style={{ marginTop: 8, padding: "8px 10px", background: heavy ? "#fdeee8" : "#fdf6e9", borderRadius: 9, fontSize: 11.5, color: heavy ? C.coral : C.amber, lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
          <Moon size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Alcohol calories are counted. Recovery and sleep may be worse tonight.</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- Quick Log Day — 6 binary questions on Today -------------- */
function QuickDayCard({ daily, onDaily }) {
  const qd = daily?.quickDay || {};
  const set = (key, value) => onDaily({ quickDay: { ...qd, [key]: value, ts: Date.now() } });
  // small pill-row component
  const Row = ({ label, k, opts }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: "0 0 78px", fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, display: "flex", gap: 4 }}>
        {opts.map(([v, lbl, color]) => (
          <button key={v} className="sprig-tap" onClick={() => set(k, v)}
            style={{ flex: 1, border: "none", cursor: "pointer", padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, fontFamily: "DM Sans", background: qd[k] === v ? (color || C.green) : C.bg2, color: qd[k] === v ? "#fff" : C.muted }}>{lbl}</button>
        ))}
      </div>
    </div>
  );
  const answered = Object.keys(qd).filter((k) => k !== "ts").length;
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "14px 15px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Zap size={14} color={C.greenSoft} />
        <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: C.ink, fontFamily: "Fraunces, serif" }}>Quick Log Day</div>
        <span style={{ fontSize: 10.5, color: C.muted }}>{answered}/6</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <Row label="Trained?"  k="trained"  opts={[["yes", "Yes", C.greenSoft], ["no", "No", C.muted]]} />
        <Row label="Protein"   k="protein"  opts={[["hit", "Hit", C.greenSoft], ["missed", "Missed", C.amber]]} />
        <Row label="Sleep"     k="sleep"    opts={[["enough", "Enough", C.greenSoft], ["short", "Not enough", C.amber]]} />
        <Row label="Steps"     k="steps"    opts={[["hit", "Hit", C.greenSoft], ["missed", "Missed", C.amber]]} />
        <Row label="Pain"      k="pain"     opts={[["none", "None", C.greenSoft], ["mild", "Mild", C.amber], ["bad", "Bad", C.coral]]} />
        <Row label="Alcohol"   k="alcohol"  opts={[["none", "None", C.greenSoft], ["light", "Light", C.amber], ["mod", "Mod", "#D9682C"], ["heavy", "Heavy", C.coral]]} />
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 8, lineHeight: 1.5, textAlign: "center" }}>
        Lazy day? Just tap. Feeds into your score and coach.
      </div>
    </div>
  );
}

/* ---------------- Meal shortcuts (same as yesterday / time-of-day / frequent) -------------- */

/* ---------------- Nutrition tab -------------- */
const MEAL_TAGS = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];

// Frame-level favorite create/edit sheet (with validation), so it's never clipped by the scroll area.

/* ---------------- Sleep tab -------------- */

/* ---------------- Trends tab -------------- */

/* ================= CLOUD SYNC (optional, additive) =================
   Sprig keeps all data in localStorage. When the user signs in with Supabase,
   they can manually push (syncToCloud) or pull (restoreFromCloud) the entire
   sprig_* keyset. Auth/cloud is fully optional — if Supabase env vars aren't
   set, getSupabase() returns null and these helpers degrade gracefully. */

// Walk the store and return every key prefixed `sprig_` as an object.
async function collectSprigLocalData() {
  const out = {};
  try {
    const keys = await store.list("sprig_");
    for (const k of keys) {
      const v = await store.get(k);
      if (v != null) out[k] = v;
    }
  } catch (e) { console.warn("[sprig] collectSprigLocalData failed:", e); }
  return out;
}

// Push the current device's sprig_* keys into the user's row in sprig_user_data.
// Returns { ok: true, count } or { ok: false, error }.
async function syncToCloud() {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Cloud sync isn't configured for this build." };
  const { data: sess } = await supabase.auth.getSession();
  const user = sess?.session?.user;
  if (!user) return { ok: false, error: "You're not logged in." };
  const data = await collectSprigLocalData();
  const count = Object.keys(data).length;
  if (count === 0) return { ok: false, error: "Nothing local to sync." };
  const { error } = await supabase
    .from("sprig_user_data")
    .upsert(
      { user_id: user.id, app_data: data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) {
    console.error("[sprig] syncToCloud upsert failed:", error);
    return { ok: false, error: error.message || "Sync failed" };
  }
  try { window.localStorage.setItem("sprig_last_synced_at", new Date().toISOString()); } catch (_) {}
  return { ok: true, count };
}

// Pull the user's row, write every sprig_* key back to localStorage, then reload.
// CALLER MUST CONFIRM with the user before invoking (it overwrites local data).
async function restoreFromCloud() {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: "Cloud sync isn't configured for this build." };
  const { data: sess } = await supabase.auth.getSession();
  const user = sess?.session?.user;
  if (!user) return { ok: false, error: "You're not logged in." };
  const { data, error } = await supabase
    .from("sprig_user_data")
    .select("app_data, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[sprig] restoreFromCloud fetch failed:", error);
    return { ok: false, error: error.message || "Restore failed" };
  }
  if (!data || !data.app_data) return { ok: false, error: "No cloud backup found yet." };
  const incoming = data.app_data;
  const keys = Object.keys(incoming);
  if (keys.length === 0) return { ok: false, error: "Cloud backup is empty." };
  try {
    for (const k of keys) {
      if (k.startsWith("sprig_") && typeof incoming[k] === "string") {
        await store.set(k, incoming[k]);
      }
    }
    try { window.localStorage.setItem("sprig_last_synced_at", new Date().toISOString()); } catch (_) {}
  } catch (e) {
    console.error("[sprig] restoreFromCloud write failed:", e);
    return { ok: false, error: "Couldn't write to storage." };
  }
  return { ok: true, count: keys.length, updatedAt: data.updated_at };
}

// useSupabaseAuth — imported from hooks/useSupabaseAuth.js at the top of this file.

/* ---------------- AccountSection (rendered inside MeTab) -------------- */

/* ================= COACH TAB ================= */

/* ================= HEALTH TAB ================= */
/* ================= SEARCH ================= */
function SearchSheet({ onClose, onJump, results, query, setQuery }) {
  const kindIcon = (k) => ({ food: "🥗", exercise: "🏋️", workout: "📈", supp: "💊", pain: "⚠️", weight: "⚖️", sleep: "🌙", health: "❤️", focus: "🎯", note: "📝" })[k] || "•";
  return (
    <Portal>
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 3000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ width: "100%", maxWidth: 440, margin: "60px auto 0", background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, maxHeight: "75vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 18px 45px rgba(0,0,0,.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, background: C.bg2, borderRadius: 12, padding: "8px 11px" }}>
          <Search size={17} color={C.muted} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Search foods, exercises, workouts, supplements, pain…"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontFamily: "DM Sans", fontSize: 14.5, color: C.ink }} />
          <button className="sprig-tap" onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted, flexShrink: 0 }}><X size={14} /></button>
        </div>
        <div className="sprig-scroll" style={{ flex: 1, overflowY: "auto", borderTop: `1px solid ${C.line}`, paddingTop: 8 }}>
          {!query.trim() && (
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "30px 16px", lineHeight: 1.6 }}>
              Search anything you've logged — past workouts, meals, supplements, pain notes, even symptoms.
            </div>
          )}
          {query.trim().length >= 2 && results.length === 0 && (
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "20px 16px" }}>No matches.</div>
          )}
          {results.map((r, i) => (
            <button key={i} className="sprig-tap" onClick={() => onJump(r)}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "10px 8px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 11, fontFamily: "DM Sans" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{kindIcon(r.kind)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{r.sub}</div>
              </div>
              <ChevronRight size={14} color={C.muted} />
            </button>
          ))}
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ================= CALENDAR ================= */
function CalendarSheet({ onClose, getDayIcons }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const monthName = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const first = new Date(cursor); first.setDate(1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const todayStr = new Date().toLocaleDateString("en-CA");
  const dateStr = (d) => `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return (
    <Portal>
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", zIndex: 3000, padding: "0 16px", display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ width: "100%", maxWidth: 440, marginTop: 40, background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, boxShadow: "0 18px 45px rgba(0,0,0,.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <BarChart3 size={17} color={C.greenSoft} />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, flex: 1 }}>Calendar</div>
          <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><X size={14} /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <button className="sprig-tap" onClick={() => setCursor((c) => { const n = new Date(c); n.setMonth(n.getMonth() - 1); return n; })} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.inkSoft }}><ChevronLeft size={14} /></button>
          <div style={{ flex: 1, textAlign: "center", fontSize: 13.5, fontWeight: 600, fontFamily: "Fraunces, serif" }}>{monthName}</div>
          <button className="sprig-tap" onClick={() => setCursor((c) => { const n = new Date(c); n.setMonth(n.getMonth() + 1); return n; })} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.inkSoft }}><ChevronRight size={14} /></button>
        </div>
        {/* weekday header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6, fontSize: 10, color: C.muted, fontWeight: 600 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <div key={i} style={{ textAlign: "center" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const ds = dateStr(d);
            const icons = getDayIcons(ds);
            const isToday = ds === todayStr;
            return (
              <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: isToday ? C.green + "22" : C.bg, border: isToday ? `1.5px solid ${C.green}` : `1px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: 3 }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, color: isToday ? C.green : C.inkSoft }}>{d}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center", marginTop: 2, fontSize: 8 }}>
                  {icons.slice(0, 4).map((ic, j) => <span key={j} title={ic.k}>{ic.emoji}</span>)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap", gap: 7, fontSize: 10.5, color: C.muted }}>
          <span>💪 gym</span><span>🥩 protein</span><span>🌙 sleep</span><span>⚖️ weight</span><span>🚶 steps</span><span>⚠️ pain</span><span>🍷 alcohol</span>
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ================= ASK COACH (AI) ================= */
function AskCoachSheet({ onClose, context, runAnalysis, online = true, onSaveNote }) {
  const kb = useKeyboardInset();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [messages, setMessages] = useState([]); // {role:"user"|"assistant", text:string}[]
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const hasData = !!(context && (context.today || context.averages14d || context.training || context.sleep || context.profile));
  const hasConversation = messages.length > 0;

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      try { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); } catch (_) {}
    }, 80);
  }, []);

  const ask = async (text) => {
    if (!text.trim() || busy) return;
    const userMsg = { role: "user", text: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setQ("");
    setErr("");
    setBusy(true);
    scrollToBottom();
    try {
      const reply = await runAnalysis(text.trim(), context);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      setErr("AI is unavailable right now. Try again later.");
    } finally {
      setBusy(false);
      scrollToBottom();
    }
  };

  const PRESETS = [
    "What should I focus on this week?",
    "Am I recovering well enough to train hard?",
    "How can I improve my sleep quality?",
    "Should I cut, bulk, or maintain right now?",
  ];

  const FOLLOW_UPS = [
    "Can you be more specific?",
    "What should I do tomorrow?",
    "How long will this take to see results?",
    "What's the biggest mistake people make with this?",
  ];

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <Portal>
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 3000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-sheet"
        style={{ maxWidth: 440, margin: "0 auto", position: "absolute", bottom: 0, left: 0, right: 0, background: C.cardSolid, borderRadius: "20px 20px 0 0", display: "flex", flexDirection: "column", maxHeight: "92dvh", paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${kb}px)`, boxShadow: "0 -8px 30px rgba(0,0,0,.35)" }}>

        {/* Header */}
        <div style={{ padding: "18px 18px 12px", flexShrink: 0, borderBottom: hasConversation ? `1px solid ${C.line}` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green + "20", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Sparkles size={17} color={C.greenSoft} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, lineHeight: 1.1 }}>Coach</div>
              {hasData && <div style={{ fontSize: 10.5, color: C.greenSoft, fontWeight: 600, marginTop: 1 }}>Using your health data</div>}
            </div>
            {hasConversation && (
              <button className="sprig-tap" onClick={() => { setMessages([]); setErr(""); }} style={{ background: C.bg2, border: "none", cursor: "pointer", borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 600, color: C.muted, fontFamily: "DM Sans" }}>New chat</button>
            )}
            <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><X size={14} /></button>
          </div>
        </div>

        {/* Conversation area */}
        <div ref={scrollRef} className="sprig-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Starter state — quick questions */}
          {!hasConversation && !busy && (
            <div className="sprig-rise">
              <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                Ask anything. I answer directly using your logged health data.
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .4, textTransform: "uppercase", marginBottom: 8 }}>Quick questions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {PRESETS.map((p) => (
                  <button key={p} className="sprig-tap" onClick={() => ask(p)}
                    style={{ background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 11, padding: "10px 12px", textAlign: "left", fontFamily: "DM Sans", fontSize: 13, color: C.inkSoft }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message history */}
          {messages.map((msg, i) => (
            <div key={i} className="sprig-rise" style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 2 }}>
              {msg.role === "user" ? (
                <div style={{ background: C.green, borderRadius: "16px 16px 4px 16px", padding: "10px 14px", maxWidth: "82%", fontSize: 14, fontWeight: 500, color: "#fff", lineHeight: 1.5 }}>
                  {msg.text}
                </div>
              ) : (
                <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: "4px 16px 16px 16px", padding: "12px 14px", maxWidth: "92%", fontSize: 13.5, color: C.ink, lineHeight: 1.65, whiteSpace: "pre-wrap", boxShadow: C.shadow }}>
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {busy && (
            <div className="sprig-rise" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: "4px 16px 16px 16px", padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, boxShadow: C.shadow }}>
                <Loader2 size={14} color={C.green} style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: C.inkSoft, fontWeight: 500 }}>Thinking with your data…</span>
              </div>
            </div>
          )}

          {/* Error */}
          {err && <div style={{ fontSize: 12.5, color: C.coral, padding: 12, background: C.coral + "12", border: `1px solid ${C.coral}44`, borderRadius: 11, lineHeight: 1.5 }}>{err}</div>}

          {/* Follow-up suggestions after a response */}
          {lastAssistantMsg && !busy && (
            <div className="sprig-rise">
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .4, textTransform: "uppercase", marginBottom: 8 }}>Follow-up</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {FOLLOW_UPS.map((p) => (
                  <button key={p} className="sprig-tap" onClick={() => ask(p)}
                    style={{ background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 11, padding: "8px 12px", textAlign: "left", fontFamily: "DM Sans", fontSize: 12.5, color: C.inkSoft }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ height: 8 }} />
        </div>

        {/* Input bar */}
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${C.line}`, background: C.cardSolid, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q); } }}
              placeholder="Ask anything about your health…"
              style={{ flex: 1, border: `1.5px solid ${C.line}`, borderRadius: 14, padding: "10px 13px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink, resize: "none", lineHeight: 1.5, minHeight: 42, maxHeight: 120, outline: "none", boxSizing: "border-box" }}
              rows={1} />
            <button className="sprig-tap" disabled={!q.trim() || busy} onClick={() => ask(q)}
              style={{ width: 42, height: 42, borderRadius: 12, background: q.trim() && !busy ? C.green : C.bg2, border: "none", cursor: q.trim() && !busy ? "pointer" : "default", display: "grid", placeItems: "center", flexShrink: 0, transition: "background .2s" }}>
              <Sparkles size={17} color={q.trim() && !busy ? "#fff" : C.muted} />
            </button>
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginTop: 7, lineHeight: 1.4 }}>
            Uses your logged data · Not medical advice
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ================= PROGRESS PHOTOS ================= */
function PhotoSheet({ onClose, photos, onAdd, onRemove }) {
  const inputRef = useRef(null);
  const [view, setView] = useState("grid"); // grid | compare
  const [picked, setPicked] = useState([]);
  async function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onAdd({ id: uid(), ts: Date.now(), date: new Date().toLocaleDateString("en-CA"), dataUrl: reader.result });
    reader.readAsDataURL(file);
  }
  const togglePick = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2));
  const comparePics = photos.filter((p) => picked.includes(p.id)).sort((a, b) => a.ts - b.ts);

  return (
    <Portal>
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 3000, padding: "0 16px", display: "flex", flexDirection: "column", alignItems: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ width: "100%", maxWidth: 440, marginTop: 30, background: C.cardSolid, borderRadius: 20, padding: 16, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 18px 45px rgba(0,0,0,.55)", border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Camera size={17} color={C.greenSoft} />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, flex: 1 }}>Progress photos</div>
          <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><X size={14} /></button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button className="sprig-tap" onClick={() => setView("grid")} style={{ flex: 1, border: "none", cursor: "pointer", padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: view === "grid" ? C.green : C.bg2, color: view === "grid" ? "#fff" : C.muted }}>All ({photos.length})</button>
          <button className="sprig-tap" onClick={() => setView("compare")} style={{ flex: 1, border: "none", cursor: "pointer", padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: view === "compare" ? C.green : C.bg2, color: view === "compare" ? "#fff" : C.muted }}>Compare ({picked.length}/2)</button>
        </div>
        <div className="sprig-scroll" style={{ flex: 1, overflowY: "auto" }}>
          {view === "grid" ? (
            <>
              <input ref={inputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
              <button className="sprig-tap" onClick={() => inputRef.current?.click()} style={{ width: "100%", background: C.green + "0d", border: `1.5px dashed ${C.green}66`, cursor: "pointer", borderRadius: 12, padding: "14px 0", color: C.green, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", marginBottom: 10 }}>
                <Plus size={14} /> Add photo
              </button>
              {photos.length === 0 ? (
                <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "20px 16px", lineHeight: 1.5 }}>
                  No photos yet. Take one in similar lighting, posture, and clothing every 2 weeks for a real comparison.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  {photos.slice().sort((a, b) => b.ts - a.ts).map((p) => (
                    <div key={p.id} style={{ position: "relative", aspectRatio: "3/4", borderRadius: 9, overflow: "hidden", background: C.bg2, border: picked.includes(p.id) ? `2px solid ${C.green}` : "none" }}>
                      <img src={p.dataUrl} alt={p.date} onClick={() => togglePick(p.id)} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }} />
                      <div style={{ position: "absolute", bottom: 4, left: 4, right: 4, fontSize: 9, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.6)", fontWeight: 600 }}>{p.date}</div>
                      <button className="sprig-tap" onClick={() => onRemove(p.id)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,.55)", border: "none", cursor: "pointer", width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", color: "#fff" }}><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              )}
              {photos.length > 0 && (
                <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
                  Tap a photo to mark it for comparison. Pick two and switch to Compare.
                </div>
              )}
            </>
          ) : (
            <>
              {comparePics.length < 2 ? (
                <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "30px 16px", lineHeight: 1.5 }}>
                  Pick two photos from the All tab to compare them side-by-side here.
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {comparePics.map((p) => (
                      <div key={p.id} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginBottom: 4 }}>{p.date}</div>
                        <div style={{ aspectRatio: "3/4", borderRadius: 11, overflow: "hidden", background: C.bg2 }}>
                          <img src={p.dataUrl} alt={p.date} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const days = Math.round((comparePics[1].ts - comparePics[0].ts) / 864e5);
                    return <div style={{ textAlign: "center", fontSize: 12, color: C.inkSoft, marginTop: 10, fontWeight: 600 }}>{days} day{days !== 1 ? "s" : ""} apart</div>;
                  })()}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

/* ================= QUICK LOG SHEET ================= */
function QuickLogSheet({ profile, quickLog, date, onSave, onClose, tp = {} }) {
  const kb = useKeyboardInset();
  const prev = quickLog || {};
  // ── Training ──
  const [trainedToday, setTrainedToday] = useState(prev.trainedToday ?? null);
  const [trainingType, setTrainingType]     = useState(prev.trainingType || null);
  const [trainingIntensity, setTrainingIntensity] = useState(prev.trainingIntensity || null);
  // ── Nutrition ──
  const [hitProtein, setHitProtein]     = useState(prev.hitProtein ?? null);
  const [hitCalories, setHitCalories]   = useState(prev.hitCalories ?? null);
  const [ateHealthy, setAteHealthy]     = useState(prev.ateHealthy ?? null);
  // ── Recovery ──
  const [enoughSleep, setEnoughSleep]   = useState(prev.enoughSleep ?? null);
  const [enoughMovement, setEnoughMovement] = useState(prev.enoughMovement ?? null);
  const [hitWater, setHitWater]         = useState(prev.hitWater ?? null);
  const [noAlcohol, setNoAlcohol]       = useState(prev.noAlcohol ?? null);
  const [supplementsTaken, setSupplementsTaken] = useState(prev.supplementsTaken ?? null);

  // ── Question block component ──
  const Q = ({ label, hint, value, opts, onPick, small }) => (
    <div style={{ background: C.bg2, borderRadius: 12, padding: "11px 12px", marginBottom: 8 }}>
      <div style={{ fontSize: small ? 12 : 12.5, fontWeight: 600, color: C.ink }}>{label}</div>
      {hint && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{hint}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
        {opts.map(([k, lbl, color]) => (
          <button key={k} className="sprig-tap" onClick={() => onPick(value === k ? null : k)}
            style={{ flex: 1, minWidth: 60, cursor: "pointer", padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans",
              background: value === k ? (color || C.green) : C.card,
              color: value === k ? "#fff" : C.muted,
              border: value === k ? "none" : `1px solid ${C.line}` }}>{lbl}</button>
        ))}
      </div>
    </div>
  );

  const TRAIN_TYPES = [
    ["upper","Upper",C.green], ["lower","Lower",C.green], ["push","Push",C.green],
    ["pull","Pull",C.green], ["legs","Legs",C.green], ["full_body","Full body",C.green],
    ["cardio","Cardio",C.amber], ["sport","Sport",C.amber], ["custom","Custom",C.muted],
  ];

  const submit = () => {
    // Convert string keys ("true"/"false"/"null") back to booleans/null
    const toBool = (v) => v === "true" ? true : v === "false" ? false : null;
    const ql = {
      date,
      trainedToday: trainedToday === "yes" || trainedToday === true,
      trainingType: (trainedToday === "yes" || trainedToday === true) ? (trainingType || "full_body") : null,
      trainingIntensity: (trainedToday === "yes" || trainedToday === true) ? (trainingIntensity || "normal") : null,
      trainedMuscles: null,
      hitCalories: toBool(hitCalories),
      hitProtein: toBool(hitProtein),
      hitWater: toBool(hitWater),
      ateHealthy: toBool(ateHealthy),
      enoughMovement: toBool(enoughMovement),
      enoughSleep: toBool(enoughSleep),
      noAlcohol: toBool(noAlcohol),
      supplementsTaken: toBool(supplementsTaken),
      source: "quick_log",
      confidence: "estimated",
      updatedAt: Date.now(),
    };
    buzz("success");
    onSave(ql);
  };

  const answered = [
    tp.training !== false ? trainedToday : undefined,
    tp.nutrition !== false ? hitProtein : undefined,
    tp.nutrition !== false ? hitCalories : undefined,
    tp.sleep !== false ? enoughSleep : undefined,
    enoughMovement,
    tp.water !== false ? hitWater : undefined,
    tp.alcohol !== false ? noAlcohol : undefined,
    tp.supplements !== false ? supplementsTaken : undefined,
  ].filter((v) => v !== null && v !== undefined).length;

  return (
    <Portal>
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "grid", placeItems: "flex-end center", zIndex: 3000, padding: 0 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-sheet"
        style={{ width: "100%", maxWidth: 440, background: C.cardSolid, border: `1px solid rgba(255,255,255,0.10)`, borderRadius: "20px 20px 0 0", padding: "18px 16px 20px", paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px) + ${kb}px)`, maxHeight: "90vh", overflowY: "auto", WebkitOverflowScrolling: "touch", boxShadow: "0 -12px 40px rgba(0,0,0,.55)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Zap size={17} color={C.lime} />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: C.ink, flex: 1 }}>Quick Log Day</div>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{answered}/8</span>
          <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted, marginLeft: 4 }}><X size={14} /></button>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>20–40 seconds. Tap your answers — no typing needed.</div>

        {/* ── TRAINING ── */}
        {tp.training !== false && <>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.green, letterSpacing: .4, marginBottom: 6, marginTop: 2 }}>Training</div>
        <Q label="Did you train today?" value={trainedToday} onPick={(v) => setTrainedToday(v === true ? null : v === "yes" ? true : v === "no" ? false : v)}
          opts={[["yes", "Yes", C.greenSoft], ["no", "Rest day", C.coral]]} />

        {(trainedToday === true || trainedToday === "yes") && (
          <>
            <Q label="Intensity" value={trainingIntensity} onPick={setTrainingIntensity}
              opts={[["easy","Easy",C.amber],["normal","Normal",C.green],["hard","Hard","#E05C4A"]]} />
            <div style={{ background: C.bg2, borderRadius: 12, padding: "11px 12px", marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, marginBottom: 8 }}>What did you train?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {TRAIN_TYPES.map(([k, lbl, color]) => (
                  <button key={k} className="sprig-tap" onClick={() => setTrainingType(trainingType === k ? null : k)}
                    style={{ border: trainingType === k ? "none" : `1px solid ${C.line}`, cursor: "pointer", padding: "7px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans",
                      background: trainingType === k ? color : C.card,
                      color: trainingType === k ? "#fff" : C.muted }}>{lbl}</button>
                ))}
              </div>
            </div>
          </>
        )}

        </>}
        {/* ── NUTRITION ── */}
        {tp.nutrition !== false && <>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, letterSpacing: .4, marginBottom: 6, marginTop: 6 }}>Nutrition</div>
        <Q label="Hit protein?" hint={`~${Math.round((profile?.weight || 70) * 1.8)}g target`} value={hitProtein}
          onPick={(v) => setHitProtein(v === hitProtein ? null : v)}
          opts={[["true", "Yes", C.greenSoft], ["false", "No", C.coral], ["null", "Not sure", C.muted]]} />
        <Q label="Hit calories?" value={hitCalories}
          onPick={(v) => setHitCalories(v === hitCalories ? null : v)}
          opts={[["true", "Yes", C.greenSoft], ["false", "No", C.coral], ["null", "Not sure", C.muted]]} />
        <Q label="Ate mostly healthy?" value={ateHealthy}
          onPick={(v) => setAteHealthy(v === ateHealthy ? null : v)}
          opts={[["true", "Yes", C.greenSoft], ["false", "No", C.coral], ["null", "Mixed", C.muted]]} />

        </>}
        {/* ── RECOVERY ── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.greenSoft, letterSpacing: .4, marginBottom: 6, marginTop: 6 }}>Recovery</div>
        {tp.sleep !== false && <Q label="Slept enough?" hint="~7–9h" value={enoughSleep}
          onPick={(v) => setEnoughSleep(v === enoughSleep ? null : v)}
          opts={[["true", "Yes", C.greenSoft], ["false", "No", C.coral], ["null", "Not sure", C.muted]]} />}
        <Q label="Enough movement?" hint="Steps, walk, or training" value={enoughMovement}
          onPick={(v) => setEnoughMovement(v === enoughMovement ? null : v)}
          opts={[["true", "Yes", C.greenSoft], ["false", "No", C.coral], ["null", "Partly", C.muted]]} />
        {tp.water !== false && <Q label="Drank enough water?" value={hitWater}
          onPick={(v) => setHitWater(v === hitWater ? null : v)}
          opts={[["true", "Yes", C.greenSoft], ["false", "No", C.coral], ["null", "Not sure", C.muted]]} />}
        {tp.alcohol !== false && <Q label="Alcohol?" value={noAlcohol}
          onPick={(v) => setNoAlcohol(v === noAlcohol ? null : v)}
          opts={[["true", "None", C.greenSoft], ["false", "Some", C.amber], ["null", "Not sure", C.muted]]} />}
        {tp.supplements !== false && <Q label="Supplements taken?" value={supplementsTaken}
          onPick={(v) => setSupplementsTaken(v === supplementsTaken ? null : v)}
          opts={[["true", "Yes", C.greenSoft], ["false", "No", C.coral], ["null", "Not sure", C.muted]]} />}

        {/* Save */}
        <div style={{ marginTop: 4 }}>
          <button className="sprig-tap" onClick={submit}
            style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "14px 0", fontSize: 14.5 }}>
            <Check size={16} /> Save day
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginTop: 9, lineHeight: 1.5 }}>
          Estimated — exact logs always take priority. Tap an answer again to clear it.
        </div>
      </div>
    </div>
    </Portal>
  );
}

