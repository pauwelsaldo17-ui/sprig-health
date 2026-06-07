import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Camera, ScanLine, PencilLine, Home, BookMarked, TrendingUp, User,
  Plus, Check, X, Loader2, Sparkles, Trash2, Minus, RotateCcw, Flame, Pill,
  Moon, Sun, BedDouble, AlarmClock, Dumbbell, EyeOff, Zap, Clock, Coffee,
  Activity, MoonStar, ChevronRight, Mic, MicOff,
  Timer, Trophy, Medal, BarChart3, ChevronLeft, ChevronDown, Award, Crown,
  Target, BookOpen, Calculator, Repeat, Gauge, Play, PersonStanding, Square,
  ArrowUp, HeartPulse, Search, TrendingDown,
  Cloud, CloudUpload, CloudDownload, LogOut, LogIn, Mail, SlidersHorizontal, Volume2,
  Archive, Bell
} from "lucide-react";
import { getSupabase, supabaseConfigured } from "./supabaseClient.js";

/* ----------------------------------------------------------------
   SPRIG — a free, AI-powered nutrition tracker
   Photo / label / text logging · remembers described meals ·
   macros + micronutrients · functional health scores
-----------------------------------------------------------------*/

// ---- Theme tokens. Two palettes; `C` is a live object whose keys are swapped in place by
// applyTheme() so the ~1200 `C.x` references across the app re-read new values on re-render. ----
const THEMES = {
  dark: {
    bg: "#07140F",
    bg2: "rgba(255,255,255,0.06)",
    card: "rgba(255,255,255,0.07)",
    cardSolid: "#13261D",
    ink: "#F4F7F2",
    inkSoft: "rgba(244,247,242,0.72)",
    muted: "rgba(244,247,242,0.52)",
    line: "rgba(255,255,255,0.08)",
    green: "#3E9D63",
    greenSoft: "#52C878",
    leaf: "#74CE8A",
    lime: "#C7FF3D",
    limeSoft: "#A7F04B",
    coral: "#FF6B5F",
    coralSoft: "#FF9B92",
    amber: "#F5A623",
    shadow: "0 1px 2px rgba(0,0,0,.18), 0 10px 30px rgba(0,0,0,.28)",
    navBg: "rgba(7,20,15,0.82)",
    pageBg: "radial-gradient(120% 60% at 50% -10%, #123524 0%, rgba(18,53,36,0) 55%), linear-gradient(180deg, #0B1A13 0%, #07140F 60%)",
    heroGrad1: "linear-gradient(150deg,#1C5237,#0E2C1E)",
    heroGrad2: "linear-gradient(160deg,#0E2C1E,#1C5237)",
    isDark: true,
  },
  light: {
    bg: "#F4F6F2",
    bg2: "#ECEFEA",
    card: "#FFFFFF",
    cardSolid: "#FFFFFF",
    ink: "#101612",
    inkSoft: "#3C4A41",
    muted: "#7C8780",
    line: "rgba(16,22,18,0.10)",
    green: "#2C8E54",
    greenSoft: "#34A862",
    leaf: "#4FB374",
    lime: "#5BBF3A",       // lime is illegible on white; use a readable green-lime in light mode
    limeSoft: "#6FC94E",
    coral: "#E0533F",
    coralSoft: "#E88670",
    amber: "#C8861E",
    shadow: "0 1px 2px rgba(16,22,18,.04), 0 6px 18px rgba(16,22,18,.06)",
    navBg: "rgba(255,255,255,0.92)",
    pageBg: "radial-gradient(120% 60% at 50% -10%, #E8F1E9 0%, rgba(232,241,233,0) 55%), linear-gradient(180deg, #F7F8F5 0%, #F1F4EF 60%)",
    heroGrad1: "linear-gradient(150deg,#2C8E54,#1C6B3D)",
    heroGrad2: "linear-gradient(160deg,#1C6B3D,#2C8E54)",
    isDark: false,
  },
};

// Live theme object — every component reads C.x at render time, so swapping these keys re-themes the app.
const C = { ...THEMES.dark };
function applyTheme(mode) {
  const t = THEMES[mode] || THEMES.dark;
  Object.keys(C).forEach((k) => { delete C[k]; });
  Object.assign(C, t);
  try {
    document.documentElement.style.background = t.bg;
    document.body.style.background = t.bg;
    document.body.style.color = t.ink;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.isDark ? "#07140F" : "#F4F6F2");
  } catch (_) {}
}
// initialize from storage as early as possible (before first render)
try {
  const saved = (typeof window !== "undefined") && window.localStorage ? window.localStorage.getItem("sprig_theme_v1") : null;
  if (saved === "light" || saved === "dark") applyTheme(saved);
} catch (_) {}

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
/* ── New Record achievement toast ── */
@keyframes recordToastIn {
  0%   { opacity:0; transform:translateX(-50%) translateY(-18px) scale(.88); }
  62%  { opacity:1; transform:translateX(-50%) translateY(2px)   scale(1.04); }
  100% { opacity:1; transform:translateX(-50%) translateY(0)     scale(1); }
}
@keyframes recordToastOut {
  0%   { opacity:1; transform:translateX(-50%) translateY(0)     scale(1); }
  100% { opacity:0; transform:translateX(-50%) translateY(-10px) scale(.96); }
}
@keyframes recordIconPop {
  0%   { transform:scale(.5) rotate(-12deg); opacity:.4; }
  58%  { transform:scale(1.24) rotate(5deg); opacity:1; }
  100% { transform:scale(1)   rotate(0deg); opacity:1; }
}
@keyframes recordGlowPulse {
  0%,100% { box-shadow:0 0 0 0 rgba(199,255,61,0), 0 10px 32px rgba(0,0,0,.35); }
  45%     { box-shadow:0 0 28px 5px rgba(199,255,61,.42), 0 10px 32px rgba(0,0,0,.35); }
}
@keyframes recordBgBloom {
  0%   { opacity:0; transform:translateX(-50%) scale(.6); }
  40%  { opacity:1; transform:translateX(-50%) scale(1); }
  100% { opacity:0; transform:translateX(-50%) scale(1.4); }
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
.record-toast      { animation: recordToastIn .44s cubic-bezier(.2,.9,.2,1) both, recordGlowPulse 2.1s ease-in-out .38s 1; }
.record-toast-exit { animation: recordToastOut .28s cubic-bezier(.5,0,1,1) both !important; }
.record-icon       { animation: recordIconPop .54s cubic-bezier(.2,.9,.2,1) .10s both; }
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
.sprig-tap:disabled, .sprig-tap[disabled] { transform: none !important; filter: none !important; will-change: auto; }
.sprig-scroll::-webkit-scrollbar{width:0;height:0;}
/* iOS momentum scrolling + native rubber-band (don't block overscroll on the scroll area) */
.sprig-scroll { -webkit-overflow-scrolling: touch; overscroll-behavior-y: auto; scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  .sprig-rise, .sprig-pop, .sprig-pop-centered, .sprig-sheet, .sprig-dim, .sprig-toast-anim, .tab-enter { animation-duration: .01ms !important; }
  .record-toast, .record-toast-exit, .record-icon { animation-duration: .01ms !important; }
  .sprig-tap { will-change: auto; }
  .sprig-tap:active { transform: none; filter: none; }
  .sprig-scroll { scroll-behavior: auto; }
}
:root {
  --bottom-nav-height: 88px;
  --floating-cta-height: 72px;
  /* z-index scale — nav 1000, floating CTA 1200, rest timer 1300, overlays 3000, medal 3500 */
  --z-nav: 1000;
  --z-cta: 1200;
  --z-timer: 1300;
  --z-overlay: 3000;
  --z-modal: 3000;
  --z-medal: 3500;
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
  padding-bottom: calc(var(--bottom-nav-height) + var(--floating-cta-height) + env(safe-area-inset-bottom, 0px) + 96px) !important;
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
.sprig-bottom-sheet { padding-bottom: calc(22px + env(safe-area-inset-bottom, 0px)) !important; }
`;

/* ---------------- storage (artifact → localStorage → memory) -------------- */
const mem = {};

const store = {
  async get(key) {
    try {
      if (typeof window !== "undefined" && window.storage?.get) {
        const r = await window.storage.get(key, false);
        if (r?.value != null) return r.value;
      }
    } catch (e) {}

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const value = window.localStorage.getItem(key);
        if (value != null) return value;
      }
    } catch (e) {}

    return key in mem ? mem[key] : null;
  },

  async set(key, value) {
    try {
      if (typeof window !== "undefined" && window.storage?.set) {
        await window.storage.set(key, value, false);
        return;
      }
    } catch (e) {}

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {}

    mem[key] = value;
  },

  async remove(key) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}

    try {
      delete mem[key];
    } catch (e) {}
  },

  // --- compatibility shims so existing callers don't crash ---
  // Alias: parts of the app call store.delete (older API name)
  async delete(key) { return this.remove(key); },

  // Used for export / reset to walk all sprig_* keys
  async list(prefix) {
    const out = new Set();
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && (!prefix || k.startsWith(prefix))) out.add(k);
        }
      }
    } catch (e) {}
    Object.keys(mem).forEach((k) => { if (!prefix || k.startsWith(prefix)) out.add(k); });
    return Array.from(out);
  },

  // No-op write-error subscription so existing callers don't crash.
  // (We dropped the active toast — if you want it back, see git history.)
  onWriteError(fn) { return () => {}; },
};
const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

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

const uid = () => Math.random().toString(36).slice(2, 10);

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
const ALARM_SOUNDS = [
  { id: "bells",   label: "Soft bells" },
  { id: "beep",    label: "Digital beep" },
  { id: "chime",   label: "Morning chime" },
  { id: "deep",    label: "Deep alarm" },
  { id: "vibrate", label: "Silent vibration only" },
];
// ---- Haptics: module-level so any component can buzz, gated by a flag SprigApp keeps in sync
// with the user's Haptics setting. Patterns are short and consistent across the app. ----
let HAPTICS_ON = true;
const HAPTIC_PATTERNS = {
  tap: 12, light: 18, success: [16, 40, 16], strong: 35, select: 10,
  complete: [24, 60, 24], finish: [40, 80, 40, 80, 40], alarm: [400, 200, 400, 200, 400], error: [60, 40, 60],
};
function buzz(kind = "tap") {
  if (!HAPTICS_ON) return;
  try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 14); } catch (_) {}
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
function safeParse(raw, fallback, validator) {
  if (raw == null) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (validator) {
      const v = validator(parsed);
      return v == null ? fallback : v;
    }
    return parsed;
  } catch (_) {
    return fallback;
  }
}
const asArray = (v) => (Array.isArray(v) ? v : null);
const asObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);

// Safe-default factories — used both at state init and when storage is missing/corrupt
const DEFAULT_DAILY = {
  water: 0, steps: 0, weight: null, caffeine: 0,
  alcohol: 0, alcohol_g: 0,
  cardioMin: 0, cardioKcal: 0, cardioSessions: [],
  alcoholDrinks: [],
  activitySource: "manual",
  sedentary: 0, sweat: "normal",
  sportLog: {}, checkin: {},
};
const DEFAULT_ALARM = { latest: "07:00", window: 30, enabled: true, mode: "smart", durationH: 8 };
const DEFAULT_HABIT_CFG = { custom: [], hidden: [] };
const DEFAULT_REMINDERS = {
  weightAM: false, water: false, supps: false, sleepRoutine: false,
  caffeineCutoff: false, progressPhoto: false, workout: false, weeklyReview: false,
};

// Migrate any older daily/profile/etc record up to the current schema.
// Adds missing keys with safe defaults; doesn't drop existing keys.
function migrateDaily(d)    { return { ...DEFAULT_DAILY, ...(asObject(d) || {}) }; }
function migrateAlarm(a)    { return { ...DEFAULT_ALARM, ...(asObject(a) || {}) }; }
function migrateHabitCfg(c) { return { ...DEFAULT_HABIT_CFG, ...(asObject(c) || {}) }; }
function migrateReminders(r){ return { ...DEFAULT_REMINDERS, ...(asObject(r) || {}) }; }
function migrateProfile(p, defaultProfile) {
  const base = defaultProfile || {};
  return { ...base, ...(asObject(p) || {}) };
}

/* ---------------- nutrition math -------------- */
function computeTargets(p) {
  const { sex, age, weight, height, activity, goal } = p;
  const bmr =
    sex === "female"
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5;
  const af = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[activity] || 1.375;
  let cals = bmr * af;
  if (goal === "lose") cals -= 450;
  if (goal === "gain") cals += 350;
  cals = Math.round(cals / 10) * 10;
  const proteinFactor = goal === "lose" ? 2.0 : goal === "gain" ? 1.9 : 1.7;
  const protein = Math.round(weight * proteinFactor);
  const fat = Math.round((cals * 0.27) / 9);
  const carbs = Math.max(0, Math.round((cals - protein * 4 - fat * 9) / 4));
  return { calories: cals, protein, carbs, fat, fiber: 30 };
}

/* ---------------- movement + dynamic calorie adjustment -------------- */
// step goal scales a little with goal: cuts benefit from more NEAT
function stepGoal(profile) {
  if (profile?.goal === "lose") return 10000;
  if (profile?.goal === "gain") return 7000;
  return 8000;
}
// estimate calories burned walking (rough: ~0.04 kcal per step per kg / 70)
function stepsKcal(steps, weightKg) {
  if (!steps) return 0;
  return Math.round(steps * 0.045 * ((weightKg || 70) / 70));
}
// today's movement summary + a practical nudge
function movementSummary({ daily, profile, trainedToday }) {
  const steps = daily?.steps || 0;
  const goal = stepGoal(profile);
  const cardioMin = daily?.cardioMin || 0;
  const pct = Math.min(100, Math.round((steps / goal) * 100));
  const kcal = stepsKcal(steps, profile?.weight);
  let note;
  if (steps === 0 && cardioMin === 0) note = "No movement logged yet — even a short walk counts.";
  else if (steps >= goal) note = `Goal hit — ${steps.toLocaleString()} steps. Nice and active today.`;
  else if (steps >= goal * 0.6) note = trainedToday ? "Solid — you trained and you're moving well." : `Good, but a 15-min walk after dinner would top you off.`;
  else if (trainedToday) note = "You trained, but NEAT is low — a short walk aids recovery and fat loss.";
  else note = "Low movement so far — a 20-minute walk lifts energy, mood, and recovery.";
  return { steps, goal, pct, cardioMin, kcal, note };
}
// adjust today's calorie guidance based on actual movement vs the activity baseline
// the profile's activity factor already assumes a baseline; big step days add on top.
// cardio kcal/min by intensity (rough, body-weight scaled at 70kg base)
const CARDIO_INTENSITY = { easy: 5, moderate: 8, hard: 11 };
const CARDIO_TYPES = [
  ["walking",  "Walking",  "🚶"],
  ["running",  "Running",  "🏃"],
  ["cycling",  "Cycling",  "🚴"],
  ["football", "Football", "⚽"],
  ["boxing",   "Boxing",   "🥊"],
  ["other",    "Other",    "💨"],
];
// alcohol drink presets — alcohol_g is what feeds recovery logic
const DRINK_PRESETS = [
  { id: "beer250",    name: "Beer 250ml",            kcal: 105, carbs: 8,  alcohol_g: 10 },
  { id: "beer330",    name: "Beer 330ml",            kcal: 145, carbs: 11, alcohol_g: 13 },
  { id: "beer500",    name: "Beer 500ml",            kcal: 220, carbs: 16, alcohol_g: 20 },
  { id: "beerStrong", name: "Strong beer 330ml",     kcal: 230, carbs: 18, alcohol_g: 22 },
  { id: "wine150",    name: "Wine 150ml",            kcal: 120, carbs: 4,  alcohol_g: 14 },
  { id: "shot40",     name: "Spirits shot 40ml",     kcal: 95,  carbs: 0,  alcohol_g: 13 },
  { id: "cocktail",   name: "Cocktail",              kcal: 250, carbs: 25, alcohol_g: 14 },
];

function cardioKcal(minutes, intensity, weightKg) {
  const perMin = CARDIO_INTENSITY[intensity] || CARDIO_INTENSITY.moderate;
  return Math.round((minutes || 0) * perMin * ((weightKg || 70) / 70));
}
/* Strength-workout calorie adjustment (separate from steps + cardio).
   Lifting burn is famously over-estimated by fitness trackers; this engine
   stays conservative on purpose and exposes an Off / Conservative / Normal
   user setting (`profile.workoutCalorieMode`).

   Intensity is bucketed from session duration + total working sets + RIR / failure
   signals. We deliberately do NOT use weights × reps × body weight formulas —
   those over-estimate badly for hypertrophy work.

   Returns null when no strength workout is logged today or the mode is "off"
   (so the Today card simply doesn't show the row). */
function workoutAdjustment({ workouts, profile, date }) {
  const mode = profile?.workoutCalorieMode || "conservative";
  if (mode === "off") return null;
  const todayKey = date || todayStr();
  const todays = (workouts || []).filter((w) => {
    const d = w.date || (w.ts ? new Date(w.ts).toLocaleDateString("en-CA") : null);
    return d === todayKey;
  });
  if (!todays.length) return null;

  // Aggregate signal across all of today's sessions.
  let totalMin = 0, totalSets = 0, totalEx = 0, hardSets = 0;
  todays.forEach((w) => {
    totalMin += +w.durationMin || 0;
    (w.exercises || []).forEach((ex) => {
      totalEx += 1;
      const sets = ex.sets || [];
      totalSets += sets.length;
      // A "hard" set: RIR <= 1 or marked as failure, or reps logged below 5 with weight (heavy single/double)
      sets.forEach((s) => {
        const rir = (typeof s.rir === "number") ? s.rir : null;
        if (rir != null && rir <= 1) hardSets += 1;
        else if (s.failure === true) hardSets += 1;
      });
    });
  });

  // Bucket: easy / normal / hard
  // Heuristics:
  //   - hard:   ≥45 min AND (≥18 sets OR ≥6 hard sets OR ≥6 exercises)
  //   - easy:   <30 min OR <8 sets total
  //   - normal: everything in between
  let intensity = "normal";
  if (totalMin >= 45 && (totalSets >= 18 || hardSets >= 6 || totalEx >= 6)) intensity = "hard";
  else if (totalMin < 30 || totalSets < 8) intensity = "easy";

  // kcal table — spec literal values; do not change without re-thinking the over-estimation risk.
  const TABLE = {
    conservative: { easy: 100, normal: 150, hard: 200 },
    normal:       { easy: 150, normal: 250, hard: 350 },
  };
  const kcal = TABLE[mode]?.[intensity] ?? 0;
  return { kcal, intensity, mode, sessions: todays.length, totalMin, totalSets };
}

function calorieAdjustment({ daily, profile, targets, trainedToday, workoutAdj }) {
  const steps = daily?.steps || 0;
  // baseline steps per the spec (sedentary 3k / light 5k / moderate 7k / active 9k)
  const baseSteps = { sedentary: 3000, light: 5000, moderate: 7000, active: 9000 }[profile?.activity] || 6000;
  const extraSteps = steps - baseSteps;
  // step delta — only the difference from baseline counts (don't double-count daily activity factor)
  const stepDelta = Math.round(extraSteps * 0.045 * ((profile?.weight || 70) / 70));
  // cardio sessions — sum kcal from each session by intensity
  const sessions = Array.isArray(daily?.cardioSessions) ? daily.cardioSessions : [];
  let cardioK = 0;
  if (sessions.length) {
    cardioK = sessions.reduce((a, s) => a + cardioKcal(s.minutes, s.intensity, profile?.weight), 0);
  } else if (daily?.cardioMin) {
    // legacy fallback if user logged minutes without sessions
    cardioK = cardioKcal(daily.cardioMin, "moderate", profile?.weight);
  }
  // strength-workout adjustment (separate from cardio; lifting doesn't appear in cardioSessions)
  const workoutK = workoutAdj?.kcal || 0;
  let delta = stepDelta + cardioK + workoutK;
  delta = Math.round(delta / 10) * 10;
  // Show nothing only when there's literally no signal — steps, cardio, AND no workout adjustment.
  if (steps === 0 && !cardioK && !workoutK) return null;
  const adjustedTargetCalories = (targets?.calories || 0) + delta;
  let text;
  if (delta >= 150) {
    text = profile?.goal === "lose"
      ? `You moved a lot today — burned ~${delta} extra kcal. You can eat a bit more and still lose.`
      : `Big movement day (~${delta} extra kcal out). Eating ${Math.round(delta * 0.7 / 10) * 10}–${delta} kcal more today is fine.`;
  } else if (delta <= -150) {
    text = profile?.goal === "lose"
      ? `Low movement today — your burn is ~${Math.abs(delta)} kcal under usual. Keep the deficit tighter or add a walk.`
      : `Quiet day (~${Math.abs(delta)} kcal under usual). No need to force extra food.`;
  } else {
    text = "Movement's about average for you today — stick to your normal target.";
  }
  return { delta, stepDelta, cardioK, workoutK, adjustedTargetCalories, adjMaintenance: adjustedTargetCalories, text };
}

/* ---------------- sedentary time -------------- */
function sedentaryNote(min) {
  if (min == null || min === 0) return null;
  if (min < 240) return { tag: "low",      color: "#6BAE78", text: `${Math.round(min / 60 * 10) / 10}h sitting today — moving well.` };
  if (min < 480) return { tag: "moderate", color: "#D9A23C", text: `${Math.round(min / 60 * 10) / 10}h sitting today — try a 5-min stand break each hour.` };
  return                  { tag: "high",   color: "#E0714A", text: `${Math.round(min / 60 * 10) / 10}h sitting today — long stretches hurt circulation. Stand and walk 2 min every hour.` };
}

/* ---------------- smart hydration (electrolytes, sweat, training-day uplift) -------------- */
const SWEAT_LEVELS = [["low", "Cool / low sweat"], ["normal", "Normal sweat"], ["heavy", "Heavy sweat / hot"]];
function smartHydration({ daily, profile, sleepInfo, workouts, trainedToday }) {
  const base = waterGoal(profile);
  const sweat = daily?.sweat || "normal";
  let goal = base;
  if (trainedToday) goal += sweat === "heavy" ? 1200 : sweat === "low" ? 400 : 700;
  if ((daily?.caffeine || 0) >= 200) goal += 250;
  if ((daily?.alcohol || 0) >= 1) goal += 350 * (daily.alcohol || 0);
  // active session length (most recent today)
  const todays = (workouts || []).filter((w) => new Date(w.ts).toLocaleDateString("en-CA") === todayStr());
  const longest = todays.reduce((m, w) => Math.max(m, w.durationMin || 0), 0);
  const needsElectrolytes = (trainedToday && (sweat === "heavy" || longest > 75)) || (daily?.cardioMin || 0) > 60;
  const water = daily?.water || 0;
  const pct = Math.min(100, Math.round((water / goal) * 100));
  let note;
  if (water >= goal) note = "Hydration on point.";
  else if (trainedToday) note = `You trained today — aim for ${Math.round((goal - water) / 100) * 100}ml more.`;
  else note = `${Math.round((goal - water) / 100) * 100}ml to go.`;
  return { goal, water, pct, note, needsElectrolytes, sweat, longest };
}

/* ---------------- sport modes -------------- */
const SPORTS = [
  ["gym",     "Gym / lifting"],
  ["running", "Running"],
  ["football","Football / soccer"],
  ["fight",   "Boxing / kickboxing"],
  ["sports",  "Other sport"],
  ["health",  "General health"],
];
// extra tracking fields by sport — light, optional
function sportFields(sport) {
  if (sport === "football") return [
    { id: "matchDay",   label: "Match day?",       opts: [["yes", "Yes", "#E0714A"], ["no", "No", "#A89E89"]] },
    { id: "sprintLoad", label: "Sprint/run load",  opts: [["low", "Low", "#6BAE78"], ["med", "Med", "#D9A23C"], ["high", "High", "#E0714A"]] },
  ];
  if (sport === "fight") return [
    { id: "sparred",  label: "Sparred today?",   opts: [["yes", "Yes", "#E0714A"], ["no", "No", "#A89E89"]] },
    { id: "rounds",   label: "Rounds",           opts: [["1-3", "1–3", "#6BAE78"], ["4-6", "4–6", "#D9A23C"], ["7+", "7+", "#E0714A"]] },
    { id: "headSym",  label: "Head/neck symptoms", opts: [["none", "None", "#6BAE78"], ["mild", "Mild", "#D9A23C"], ["yes", "Yes — rest", "#C0392B"], ["none", ""]] },
  ];
  if (sport === "running") return [
    { id: "runKm",  label: "Run distance",  opts: [["<5", "<5km", "#6BAE78"], ["5-10", "5–10km", "#D9A23C"], ["10+", "10km+", "#E0714A"]] },
  ];
  return [];
}
function sportAdvice({ profile, daily, sportLog, painLogs }) {
  const s = profile?.sport || profile?.focus;
  const advice = [];
  if (s === "football") {
    if (sportLog?.matchDay === "yes" || sportLog?.sprintLoad === "high") advice.push("Match-day or sprint-heavy load — skip heavy lower-body work today.");
    if ((painLogs || []).some((p) => p.status === "active" && ["knee", "ankle", "hamstring"].includes(p.location))) advice.push("Active leg pain — protect knees/ankles; light gym work above the waist only.");
  } else if (s === "fight") {
    if (sportLog?.sparred === "yes") advice.push("You sparred today — skip max-effort lifts; recovery and food are king tonight.");
    if (sportLog?.headSym === "yes" || sportLog?.headSym === "mild") advice.push("Head/neck symptoms — REST. See a doctor for anything beyond a brief stinger.");
    if (sportLog?.rounds === "7+") advice.push("High round count — energy demand is huge. Hydrate and front-load protein.");
  } else if (s === "running") {
    if (sportLog?.runKm === "10+") advice.push("Long run — refuel within 60 min (carbs + protein) and walk easy tomorrow.");
  }
  return advice;
}

/* ---------------- mobility routines -------------- */
const MOBILITY_ROUTINES = [
  { id: "morning",   title: "Morning mobility",        minutes: 5,  area: "full body", steps: ["Cat-cow ×8", "Hip-flexor lunge stretch — 30s/side", "Thoracic rotations — 8/side", "Arm circles — 10 each way", "Standing forward fold — 30s"] },
  { id: "pre_gym",   title: "Pre-gym warm-up",         minutes: 8,  area: "full body", steps: ["5 min easy bike or skipping", "Band pull-aparts ×15", "World's greatest stretch — 5/side", "Bodyweight squats ×10", "Push-ups ×8"] },
  { id: "shoulders", title: "Shoulder health",         minutes: 7,  area: "shoulders", steps: ["Wall slides ×10", "Band external rotations — 12/side", "Sleeper stretch — 30s/side", "Doorway pec stretch — 30s/side", "Scapular push-ups ×10"] },
  { id: "hips",      title: "Hip mobility",            minutes: 8,  area: "hips",      steps: ["90/90 hip switches — 8/side", "Frog stretch — 45s", "Couch stretch — 45s/side", "Adductor rock-backs ×8/side", "Glute bridges ×12"] },
  { id: "back",      title: "Lower-back relief",       minutes: 6,  area: "lower back",steps: ["Cat-cow ×10", "Child's pose — 45s", "Knees-to-chest — 30s", "Pelvic tilts ×12", "Bird-dog — 8/side"] },
];

/* ---------------- achievements -------------- */
function detectAchievements({ workouts, weightSeries, sleepLogs, history, focusSessions, dailyHistory, painLogs }) {
  const out = [];
  const add = (id, icon, title, desc, ts) => out.push({ id, icon, title, desc, ts: ts || Date.now() });
  // training milestones
  if ((workouts || []).length >= 1) add("first_workout", "💪", "First workout logged", "You started — the hardest part.", workouts[0].ts);
  if ((workouts || []).length >= 10) add("10_workouts", "🏋️", "10 workouts logged", "Habit forming.");
  if ((workouts || []).length >= 50) add("50_workouts", "🏆", "50 workouts", "Real consistency.");
  // PRs
  const prs = (typeof detectPRs === "function") ? detectPRs(workouts || []) : [];
  if (prs.length >= 1) add("first_pr", "🥇", "First PR", `${prs[0].name} — your first recorded personal record.`, prs[0].ts);
  if (prs.length >= 5) add("5_prs", "🎖️", "5 PRs banked", "Numbers don't lie — you're getting stronger.");
  // 4 workouts in one week
  const now = Date.now();
  const wk = (workouts || []).filter((w) => w.ts >= now - 7 * 864e5).length;
  if (wk >= 4) add("4_wk", "🔥", "4 workouts in a week", "Big week.");
  // weight tracking
  if ((weightSeries || []).length >= 14) add("14_weigh", "📊", "30 days of weight tracking", "Real signal beats day-to-day noise.");
  // sleep
  const last3 = (sleepLogs || []).slice(-3);
  if (last3.length === 3 && last3.every((l) => l.durationMin >= 480)) add("8h_3", "🌙", "3 nights of 8h+ sleep", "Your body is thanking you.");
  // protein streak
  const days7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toLocaleDateString("en-CA"); });
  const proteinDays = (history || []).filter((h) => days7.includes(h.date) && h.protein >= 100).length;
  if (proteinDays >= 7) add("7d_protein", "🥩", "7-day protein streak", "Eat. Lift. Repeat.");
  // first 10k steps
  const high = (dailyHistory || []).find((d) => (d.steps || 0) >= 10000);
  if (high) add("first_10k", "🚶", "First 10k-step day", `On ${high.date} — keep moving.`);
  // pain-free week
  const recentPain = (painLogs || []).filter((p) => p.ts >= now - 7 * 864e5).length;
  if ((workouts || []).length >= 3 && recentPain === 0 && wk >= 2) add("pain_free", "🌿", "Pain-free training week", "Smart loading pays off.");
  // focus hours
  const wkFocus = (focusSessions || []).filter((f) => days7.includes(f.date)).reduce((a, f) => a + f.minutes, 0);
  if (wkFocus >= 300) add("5h_focus", "🎯", "5+ focus hours this week", "Deep work is rare.");
  return out;
}

/* ---------------- goal timeline -------------- */
// "Goal: gain 4kg in 6 months · Current pace +0.2kg/wk · On track"
function goalTimeline({ profile, weightSeries, workouts, targets }) {
  const out = { weight: null, strength: null };
  // weight goal — derive from profile.goal and starting weight
  const ws = [...(weightSeries || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (ws.length >= 2 && profile?.goal && profile.goal !== "maintain") {
    const recent = ws.filter((s) => Date.now() - new Date(s.date).getTime() <= 30 * 864e5);
    if (recent.length >= 2) {
      const first = recent[0], last = recent[recent.length - 1];
      const days = Math.max(1, (new Date(last.date) - new Date(first.date)) / 864e5);
      const rate = ((last.kg - first.kg) / days) * 7; // kg/week
      // ideal pace from goal
      const ideal = profile.goal === "gain" ? 0.25 : profile.goal === "lose" ? -0.5 : 0;
      const target = profile.goalTarget != null ? profile.goalTarget
        : (profile.goal === "gain" ? Math.round((first.kg + 4) * 10) / 10 : Math.round((first.kg - 5) * 10) / 10);
      const kgLeft = target - last.kg;
      const weeksAtPace = rate !== 0 ? kgLeft / rate : null;
      // status
      let status, color;
      if (profile.goal === "gain") {
        if (rate >= 0.15 && rate <= 0.45) { status = "On track"; color = "#6BAE78"; }
        else if (rate < 0.05) { status = "Stalled"; color = "#E0714A"; }
        else if (rate > 0.45) { status = "Too fast — may be adding fat"; color = "#D9A23C"; }
        else { status = "Slow but moving"; color = "#D9A23C"; }
      } else if (profile.goal === "lose") {
        if (rate <= -0.3 && rate >= -0.9) { status = "On track"; color = "#6BAE78"; }
        else if (rate > -0.1) { status = "Stalled"; color = "#E0714A"; }
        else if (rate < -0.9) { status = "Too fast — risks muscle loss"; color = "#D9A23C"; }
        else { status = "Slow but moving"; color = "#D9A23C"; }
      }
      out.weight = { current: last.kg, target, kgLeft: Math.round(kgLeft * 10) / 10, rate: Math.round(rate * 100) / 100, ideal, weeksAtPace: weeksAtPace ? Math.round(weeksAtPace) : null, status, color };
    }
  }
  // strength goal — for primary lifts
  if ((workouts || []).length >= 4) {
    const lifts = ["Barbell Bench Press", "Barbell Squat", "Deadlift"];
    const series = lifts.map((name) => {
      const points = (typeof liftE1RMSeries === "function") ? liftE1RMSeries(workouts, name) : [];
      if (points.length < 2) return null;
      const recent = points.slice(-8);
      const first = recent[0], last = recent[recent.length - 1];
      const months = Math.max(0.5, (last.ts - first.ts) / (30 * 864e5));
      const perMonth = Math.round(((last.e1 - first.e1) / months) * 10) / 10;
      return { name, e1: Math.round(last.e1), perMonth };
    }).filter(Boolean);
    if (series.length) out.strength = series;
  }
  return out;
}

/* ---------------- plateau detection -------------- */
// flags long-running stalls in weight, strength, or sleep — with possible reasons
function plateauDetection({ workouts, weightSeries, sleepLogs, history, targets, sleepInfo }) {
  const out = [];
  const now = Date.now();
  // weight plateau (3+ weeks flat ±0.5kg)
  const ws = [...(weightSeries || [])].sort((a, b) => a.date.localeCompare(b.date));
  const recent4w = ws.filter((s) => now - new Date(s.date).getTime() <= 28 * 864e5);
  if (recent4w.length >= 5) {
    const min = Math.min(...recent4w.map((s) => s.kg));
    const max = Math.max(...recent4w.map((s) => s.kg));
    if (max - min <= 0.6) {
      const avgCal = (history || []).filter((h) => now - new Date(h.date).getTime() <= 21 * 864e5)
        .map((h) => h.calories).filter((v) => v > 0);
      const reasons = ["Calorie target may not match real intake","Sleep or stress affecting body comp","Sodium/water shifts hiding real change"];
      if (avgCal.length && targets?.calories) {
        const a = avgCal.reduce((s, x) => s + x, 0) / avgCal.length;
        if (Math.abs(a - targets.calories) > 200) reasons.unshift(`Average calories (${Math.round(a)}) vs target (${targets.calories}) is the likely culprit`);
      }
      out.push({ kind: "weight", title: "Weight has been flat for 4+ weeks", reasons });
    }
  }
  // strength plateau via stallingLifts
  const stalls = (typeof stallingLifts === "function") ? stallingLifts(workouts || []) : [];
  if (stalls.length) out.push({
    kind: "strength",
    title: `${stalls[0]} hasn't moved in 3+ sessions`,
    reasons: ["Calories too low to support new tissue", "Sleep under 7h dulling neural drive", "Volume too high — fatigue masking strength", "Form drift — film a working set and check"],
  });
  // sleep plateau (consistently under-recovered)
  const recentSleep = (sleepLogs || []).filter((l) => l.bedtime >= now - 14 * 864e5);
  if (recentSleep.length >= 5) {
    const need = sleepInfo?.need || 480;
    const avg = recentSleep.reduce((s, l) => s + l.durationMin, 0) / recentSleep.length;
    if (avg < need - 30) out.push({
      kind: "sleep",
      title: `Sleep stuck at ~${(typeof durLabel === "function") ? durLabel(Math.round(avg)) : Math.round(avg) + "m"}`,
      reasons: ["Bedtime drifting late", "Caffeine after your cutoff time", "Alcohol on weekends", "Screens in the last hour"],
    });
  }
  return out;
}

/* ---------------- pattern detection -------------- */
// Looks for correlations like "sleep score is X lower on alcohol days"
function patternDetection({ sleepLogs, dailyHistory, workouts, painLogs, history }) {
  const out = [];
  const byDate = {};
  (dailyHistory || []).forEach((d) => (byDate[d.date] = { ...byDate[d.date], ...d }));
  (sleepLogs || []).forEach((l) => { const d = l.date || new Date(l.bedtime).toLocaleDateString("en-CA"); byDate[d] = { ...byDate[d], sleepScore: l.score, durationMin: l.durationMin }; });
  // group by date
  const rows = Object.entries(byDate).map(([date, r]) => ({ date, ...r }));
  if (rows.length < 6) return out;
  // alcohol → sleep score
  const withAlc = rows.filter((r) => (r.alcohol || 0) > 0 && r.sleepScore != null);
  const withoutAlc = rows.filter((r) => (r.alcohol || 0) === 0 && r.sleepScore != null);
  if (withAlc.length >= 2 && withoutAlc.length >= 3) {
    const a = withAlc.reduce((s, r) => s + r.sleepScore, 0) / withAlc.length;
    const b = withoutAlc.reduce((s, r) => s + r.sleepScore, 0) / withoutAlc.length;
    const diff = Math.round(b - a);
    if (diff >= 8) out.push({ kind: "alcohol_sleep", strength: diff, text: `Sleep score is ${diff} points lower on days you drank alcohol.` });
  }
  // low-step → bad mood
  const moodVal = { bad: 1, okay: 2, good: 3 };
  const stepMood = rows.filter((r) => r.steps != null && r.mood);
  if (stepMood.length >= 5) {
    const low = stepMood.filter((r) => r.steps < 5000);
    const high = stepMood.filter((r) => r.steps >= 8000);
    if (low.length >= 2 && high.length >= 2) {
      const lm = low.reduce((s, r) => s + (moodVal[r.mood] || 2), 0) / low.length;
      const hm = high.reduce((s, r) => s + (moodVal[r.mood] || 2), 0) / high.length;
      if (hm - lm >= 0.4) out.push({ kind: "steps_mood", text: "Mood is better on higher-step days — movement is doing real work." });
    }
  }
  // pain by exercise — find recurring triggers
  const byEx = {};
  (painLogs || []).forEach((p) => { if (p.exercise) (byEx[p.exercise] = byEx[p.exercise] || []).push(p); });
  Object.entries(byEx).forEach(([ex, list]) => {
    if (list.length >= 2) {
      const loc = list[0].location || "area";
      out.push({ kind: "pain_exercise", text: `${loc.replace("_", " ")} pain appeared ${list.length} times around ${ex}. Worth swapping the exercise or fixing form.` });
    }
  });
  // caffeine late → sleep
  // (skipped without timestamps on caffeine intake)
  return out;
}

/* ---------------- demo / seed data -------------- */
async function seedDemoData(store) {
  const now = Date.now();
  const todayD = (off) => new Date(now - off * 864e5).toLocaleDateString("en-CA");
  // profile
  const profile = { sex: "male", age: 22, height: 180, weight: 76, activity: "moderate", goal: "gain", experience: "intermediate", focus: "gym", unit: "kg", mode: "advanced", sport: "" };
  await store.set("sprig_profile_v1", JSON.stringify(profile));
  // 14 days of food history
  const hist = Array.from({ length: 14 }, (_, i) => {
    const v = i % 7;
    return { date: todayD(13 - i), calories: 2700 + (v - 3) * 80, protein: 145 + (v - 3) * 6, carbs: 280, fat: 80, fiber: 24 + (v % 4) };
  });
  await store.set("sprig_history_v1", JSON.stringify(hist));
  // 10 workouts
  const exes = [
    ["Barbell Bench Press", "chest"], ["Barbell Squat", "quads"], ["Deadlift", "back"],
    ["Overhead Press", "shoulders"], ["Barbell Row", "back"], ["Barbell Curl", "biceps"],
  ];
  const workouts = Array.from({ length: 10 }, (_, i) => {
    const [name, group] = exes[i % exes.length];
    const baseW = name === "Deadlift" ? 100 : name === "Barbell Squat" ? 85 : name === "Barbell Bench Press" ? 70 : name === "Overhead Press" ? 45 : 50;
    return {
      id: "demo_" + i, ts: now - (13 - i * 1.3) * 864e5, date: todayD(Math.round(13 - i * 1.3)), durationMin: 50 + (i % 3) * 5,
      exercises: [{ name, group, sets: [{ w: baseW + Math.floor(i / 3) * 2.5, reps: 8, rir: 2 }, { w: baseW + Math.floor(i / 3) * 2.5, reps: 7, rir: 1 }, { w: baseW + Math.floor(i / 3) * 2.5, reps: 6, rir: 0 }] }],
    };
  });
  await store.set("sprig_workouts_v1", JSON.stringify(workouts));
  // sleep logs (7 nights)
  const sleep = Array.from({ length: 7 }, (_, i) => {
    const wake = new Date(now - (6 - i) * 864e5); wake.setHours(7, 15, 0, 0);
    const durH = 6.5 + (i % 3) * 0.5 + (i === 4 ? -1 : 0);  // one short night
    const bed = new Date(wake.getTime() - durH * 36e5);
    return { id: "ds" + i, date: todayD(6 - i), bedtime: bed.getTime(), waketime: wake.getTime(), durationMin: Math.round(durH * 60), score: 70 + (i % 3) * 5 - (i === 4 ? 15 : 0), stages: { deep: 65 + (i % 3) * 5, rem: 95 + (i % 3) * 5, light: 250 } };
  });
  await store.set("sprig_sleep_v1", JSON.stringify(sleep));
  // weight series — slow gain
  const weight = Array.from({ length: 14 }, (_, i) => ({ date: todayD(13 - i), kg: Math.round((75.4 + i * 0.06) * 10) / 10 }));
  await store.set("sprig_weightseries_v1", JSON.stringify(weight));
  // pain log
  await store.set("sprig_pain_v1", JSON.stringify([
    { id: "dp1", ts: now - 9 * 864e5, date: todayD(9), level: "mild", location: "shoulder", type: "dull", exercise: "Overhead Press", note: "noticed it on press day", status: "active" },
  ]));
  // habits done — past 3 days
  const habitDone = {};
  for (let i = 0; i < 5; i++) habitDone[todayD(i)] = ["study", "reading", "stretch"].slice(0, 3 - (i % 2));
  await store.set("sprig_habitdone_v1", JSON.stringify(habitDone));
  // focus
  await store.set("sprig_focus_v1", JSON.stringify(Array.from({ length: 6 }, (_, i) => ({ id: "df" + i, ts: now - i * 864e5, date: todayD(i), minutes: [50, 90, 25, 50, 25][i % 5], label: ["Deep work", "Study", "French"][i % 3] }))));
  // measurement
  await store.set("sprig_measure_v1", JSON.stringify([
    { date: todayD(7), waist: 81, chest: 100, arms: 36 }, { date: todayD(0), waist: 81, chest: 101, arms: 36.5 },
  ]));
  // daily for today
  await store.set("sprig_daily_" + todayD(0), JSON.stringify({ water: 1800, steps: 7200, weight: 76.0, caffeine: 200, alcohol: 0, cardioMin: 0, sedentary: 360, sweat: "normal", sportLog: {}, checkin: { energy: "normal", mood: "good", focus: "high", stress: "low", pain: "none", sick: "no" } }));
}

/* ---------------- unit conversion helpers -------------- */
const KG_TO_LB = 2.20462, CM_TO_IN = 0.393701;
function convW(kg, unit) { return unit === "lb" ? Math.round(kg * KG_TO_LB * 10) / 10 : Math.round(kg * 10) / 10; }
function convL(cm, unit) { return unit === "in" ? Math.round(cm * CM_TO_IN * 10) / 10 : Math.round(cm); }
function lbToKg(lb) { return Math.round((lb / KG_TO_LB) * 10) / 10; }
function inToCm(inches) { return Math.round(inches / CM_TO_IN); }

/* ---------------- equipment-aware exercise filter -------------- */
const EQUIPMENT = [
  ["full",  "Full gym"], ["basic", "Basic gym"], ["dumbbells", "Home dumbbells"],
  ["bands", "Resistance bands"], ["bodyweight", "Bodyweight only"], ["none", "No equipment"],
];
// returns whether an exercise is doable with the given equipment
function canDoWith(meta, equipment) {
  if (!equipment || equipment === "full" || equipment === "basic") return true;
  const name = (meta?.name || "").toLowerCase();
  if (equipment === "dumbbells") return name.includes("dumbbell") || name.includes("db") || name.includes("push-up") || name.includes("pull-up") || name.includes("plank") || name.includes("lunge");
  if (equipment === "bodyweight" || equipment === "none") return !name.includes("barbell") && !name.includes("dumbbell") && !name.includes("cable") && !name.includes("machine") && !name.includes("smith") && !name.includes("leg press") && !name.includes("ez ");
  if (equipment === "bands") return name.includes("band") || name.includes("push-up") || name.includes("pull-up") || name.includes("plank");
  return true;
}

/* ---------------- meal shortcuts: same as yesterday, by time of day, frequent -------------- */
// `allEntries` is the full historical entry log; each needs `ts` and `name`.
function mealShortcuts({ allEntries, todayEntries }) {
  const now = Date.now();
  const yest = todayStr(new Date(now - 864e5));
  const loggedNames = new Set((todayEntries || []).map((e) => (e.name || "").toLowerCase()));

  const slotOf = (ts) => {
    const h = new Date(ts).getHours();
    if (h < 11) return "breakfast";
    if (h < 16) return "lunch";
    return "dinner";
  };
  const ent = Array.isArray(allEntries) ? allEntries : [];
  const yestEnt = ent.filter((e) => e.date === yest || (e.ts && todayStr(new Date(e.ts)) === yest));

  const yestBySlot = { breakfast: [], lunch: [], dinner: [] };
  yestEnt.forEach((e) => { if (e.ts) yestBySlot[slotOf(e.ts)].push(e); });

  const cutoff = now - 30 * 864e5;
  const counts = {};
  ent.forEach((e) => {
    if (e.ts && e.ts >= cutoff && e.name) {
      const k = e.name.toLowerCase();
      counts[k] = counts[k] || { name: e.name, n: 0, lastTs: 0, sample: e };
      counts[k].n += 1;
      counts[k].lastTs = Math.max(counts[k].lastTs, e.ts);
    }
  });
  const frequent = Object.values(counts).filter((c) => c.n >= 3 && !loggedNames.has(c.name.toLowerCase()))
    .sort((a, b) => b.n - a.n).slice(0, 4);

  const currentSlot = slotOf(now);
  const slotSugg = (yestBySlot[currentSlot] || [])
    .filter((e) => !loggedNames.has((e.name || "").toLowerCase())).slice(0, 4);

  const sameAsYesterday = yestEnt.filter((e) => !loggedNames.has((e.name || "").toLowerCase()));
  const hasYesterday = sameAsYesterday.length >= 2;

  return { currentSlot, slotSugg, frequent, sameAsYesterday, hasYesterday };
}

/* ---------------- next workout suggestion from routine pattern -------------- */
// Detects "Push → Pull → Legs" style splits from recent workouts; picks the next in rotation.
function nextWorkoutSuggestion({ workouts, trainInfo }) {
  const recent = (workouts || []).slice().sort((a, b) => b.ts - a.ts).slice(0, 12);
  if (recent.length < 3) return null;
  const sessionLabel = (w) => {
    if (w.routineName) return w.routineName;
    const groups = (w.exercises || []).map((e) => e.group);
    const tally = {};
    groups.forEach((g) => { tally[g] = (tally[g] || 0) + 1; });
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    if (!top) return null;
    const [g] = top;
    if (["chest", "shoulders", "triceps"].includes(g)) return "Push";
    if (["back", "biceps", "lats"].includes(g)) return "Pull";
    if (["quads", "hamstrings", "glutes", "calves"].includes(g)) return "Legs";
    return g.charAt(0).toUpperCase() + g.slice(1);
  };
  const labels = recent.map(sessionLabel).filter(Boolean);
  if (labels.length < 3) return null;
  let best = null;
  for (let cycle = 2; cycle <= 5; cycle++) {
    if (labels.length < cycle + 1) continue;
    let matches = 0, total = 0;
    for (let i = cycle; i < labels.length; i++) {
      total += 1;
      if (labels[i] === labels[i - cycle]) matches += 1;
    }
    const score = total ? matches / total : 0;
    if (score >= 0.5 && (!best || score > best.score)) best = { cycle, score };
  }
  if (!best) return null;
  const cycleLabels = labels.slice(0, best.cycle);
  const set = Array.from(new Set(cycleLabels));
  if (!set.length) return null;
  const lastSeen = {};
  set.forEach((lbl) => { lastSeen[lbl] = recent.find((w) => sessionLabel(w) === lbl)?.ts || 0; });
  const next = set.sort((a, b) => lastSeen[a] - lastSeen[b])[0];
  let reason = `Last session was ${labels[0]}.`;
  const rec = trainInfo?.recoveryRec?.level;
  if (rec === "rest") reason += " Recovery says rest — keep it light.";
  else if (rec === "light") reason += " Recovery is moderate today.";
  return { suggested: next, reason, confidence: best.score };
}

/* ---------------- calorie target recommendation from weight trend -------------- */
function calorieTrendRecommendation({ profile, weightSeries, history, targets }) {
  if (!profile?.goal || profile.goal === "maintain") return null;
  const ws = [...(weightSeries || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (ws.length < 5) return null;
  const recent = ws.slice(-14);
  const first = recent[0], last = recent[recent.length - 1];
  const days = Math.max(1, (new Date(last.date) - new Date(first.date)) / 864e5);
  if (days < 10) return null;
  const rate = ((last.kg - first.kg) / days) * 7;
  const bw = last.kg || profile.weight || 70;
  const cutoff = new Date(Date.now() - 21 * 864e5).toLocaleDateString("en-CA");
  const recHist = (history || []).filter((h) => h.date >= cutoff && (h.calories || 0) > 800);
  const avgCal = recHist.length ? Math.round(recHist.reduce((s, h) => s + h.calories, 0) / recHist.length) : null;
  let suggestedDelta = 0, rationale = null;
  if (profile.goal === "gain") {
    if (rate < 0.05) { suggestedDelta = 150; rationale = `Weight is flat (${rate.toFixed(2)}kg/wk) — surplus is too small.`; }
    else if (rate > 0.45) { suggestedDelta = -100; rationale = `Weight is climbing fast (+${rate.toFixed(2)}kg/wk) — likely adding extra fat.`; }
    else return { onTrack: true, rate, message: `On track: +${rate.toFixed(2)}kg/wk is in the 0.1–0.3kg/wk lean-bulk range.` };
  } else if (profile.goal === "lose") {
    const pctPerWeek = (rate / bw) * 100;
    if (pctPerWeek > -0.2) { suggestedDelta = -150; rationale = `Weight loss is slow (${pctPerWeek.toFixed(2)}%/wk) — bigger deficit or more steps.`; }
    else if (pctPerWeek < -0.9) { suggestedDelta = 150; rationale = `Weight is dropping fast (${pctPerWeek.toFixed(2)}%/wk) — risks muscle loss.`; }
    else return { onTrack: true, rate, message: `On track: ${pctPerWeek.toFixed(2)}%/wk is in the 0.3–0.7%/wk range.` };
  }
  const currentTarget = targets?.calories || 0;
  const suggestedTarget = currentTarget + suggestedDelta;
  return { onTrack: false, rate, rationale, currentTarget, suggestedTarget, suggestedDelta, avgCal, days: Math.round(days) };
}

/* ---------------- goal-based habit suggestions -------------- */
const GOAL_HABITS = {
  gain:     ["protein", "workout", "sleep8", "water", "steps"],
  lose:     ["calories", "protein", "steps", "workout", "sleep8"],
  maintain: ["workout", "protein", "sleep8", "steps", "water"],
};
const FOCUS_HABITS = {
  sleep:  ["caffeine_cutoff", "blue_cutoff", "bedtime", "morning_light"],
  health: ["steps", "sleep8", "water", "veggies"],
  gym:    ["protein", "workout", "sleep8", "water"],
  cardio: ["steps", "cardio", "sleep8", "water"],
  sports: ["workout", "protein", "sleep8", "mobility"],
  transform: ["calories", "protein", "workout", "steps", "sleep8"],
};
const HABIT_META = {
  protein:        { name: "Hit protein target",     icon: "🥩" },
  workout:        { name: "Train today",            icon: "🏋️" },
  sleep8:         { name: "Sleep 8h",                icon: "🌙" },
  water:          { name: "Drink water target",     icon: "💧" },
  steps:          { name: "Hit steps target",       icon: "🚶" },
  calories:       { name: "Calories on target",     icon: "🎯" },
  cardio:         { name: "Get some cardio",        icon: "🏃" },
  veggies:        { name: "Eat vegetables",         icon: "🥦" },
  mobility:       { name: "Mobility routine",       icon: "🧘" },
  caffeine_cutoff:{ name: "Caffeine cutoff hit",    icon: "☕" },
  blue_cutoff:    { name: "Screens off before bed", icon: "📵" },
  bedtime:        { name: "Hit target bedtime",     icon: "🛏️" },
  morning_light:  { name: "Morning sunlight",       icon: "☀️" },
};
function suggestedHabitsFor(profile) {
  const fromGoal = GOAL_HABITS[profile?.goal] || [];
  const fromFocus = FOCUS_HABITS[profile?.focus] || [];
  const seen = new Set();
  return [...fromGoal, ...fromFocus].filter((k) => { if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
}

/* ---------------- "Tonight plan" — one card with caffeine, blue, bed, wake -------------- */
function tonightPlan({ sleepInfo }) {
  const rec = sleepInfo?.rec;
  if (!rec) return null;
  const fmt = (min) => {
    const m = ((min % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  };
  return {
    caffeineCutoff: fmt(rec.caffeineCutoff),
    blueCutoff: fmt(rec.blueCutoff),
    targetBed: fmt(rec.recBed),
    targetWake: fmt(rec.recWake),
    debtMin: sleepInfo.debtMin || 0,
    payDown: rec.payDown,
  };
}

/* ---------------- activity sources catalog -------------- */
const ACTIVITY_SOURCES = [
  { id: "manual",         name: "Manual entry",        active: true,  note: "Type or use the +1k / +2.5k / +5k quick buttons." },
  { id: "apple_health",   name: "Apple Health",        active: false, note: "Requires native iOS app." },
  { id: "health_connect", name: "Google Health Connect", active: false, note: "Requires native Android app." },
  { id: "google_fit",     name: "Google Fit",          active: false, note: "Requires API integration." },
  { id: "garmin",         name: "Garmin",              active: false, note: "Requires API integration." },
  { id: "fitbit",         name: "Fitbit",              active: false, note: "Requires API integration." },
];

/* ---------------- global search -------------- */
// Indexes everything searchable in the app and returns ranked matches.
function searchAll({ q, library, workouts, history, supps, painLogs, weightSeries, sleepLogs, healthSeries, focusSessions }) {
  const needle = q.trim().toLowerCase();
  if (!needle || needle.length < 2) return [];
  const out = [];
  const push = (kind, label, sub, ts, payload, score) => out.push({ kind, label, sub, ts: ts || 0, payload, score });
  const matches = (s) => s && s.toLowerCase().includes(needle);
  // foods (library)
  (library || []).forEach((m) => {
    if (matches(m.name)) push("food", m.name, `Saved meal · ${Math.round(m.calories || 0)} kcal · ${Math.round(m.protein_g || 0)}g protein`, m.ts || 0, m, 8);
  });
  // exercises (catalog)
  (typeof EXERCISES !== "undefined" ? EXERCISES : []).forEach((e) => {
    if (matches(e.name) || matches(e.group)) push("exercise", e.name, `Exercise · ${e.group}`, 0, e, 5);
  });
  // workout history per exercise
  const lastSeen = {};
  (workouts || []).forEach((w) => w.exercises.forEach((ex) => {
    if (matches(ex.name)) {
      if (!lastSeen[ex.name] || lastSeen[ex.name].ts < w.ts) {
        const best = (ex.sets || []).reduce((b, s) => (s.w > (b?.w || 0) ? s : b), null);
        lastSeen[ex.name] = { ts: w.ts, sub: best ? `Last: ${best.w}kg × ${best.reps}` : "history" };
      }
    }
  }));
  Object.entries(lastSeen).forEach(([name, info]) => push("workout", name, `Workout history · ${info.sub}`, info.ts, { name }, 7));
  // supplements
  (supps || []).forEach((s) => { if (matches(s.name)) push("supp", s.name, `Supplement · ${s.dose || ""} ${s.unit || ""}`.trim(), 0, s, 6); });
  // pain logs (location + exercise + note)
  (painLogs || []).forEach((p) => {
    if (matches(p.location) || matches(p.exercise) || matches(p.note) || matches(p.type)) {
      push("pain", `${p.location || "pain"} pain`, `${p.level} · ${p.date}${p.exercise ? " · " + p.exercise : ""}`, p.ts, p, 6);
    }
  });
  // bodyweight
  if (matches("weight") || matches("kg") || matches("bw") || matches("bodyweight")) {
    const last = (weightSeries || []).slice(-1)[0];
    if (last) push("weight", `${last.kg}kg`, `Bodyweight · ${last.date}`, new Date(last.date).getTime(), last, 4);
  }
  // sleep
  if (matches("sleep") || matches("bed") || matches("nap")) {
    const last = (sleepLogs || []).slice(-1)[0];
    if (last) push("sleep", `Sleep ${last.score || ""}`.trim(), `${Math.round(last.durationMin/60*10)/10}h · ${last.date}`, last.bedtime, last, 4);
  }
  // health markers
  (healthSeries || []).slice(-3).forEach((h) => {
    if (matches("bp") || matches("blood pressure") || matches("rhr") || matches("heart rate")) {
      push("health", `BP ${h.bpSys || "?"}/${h.bpDia || "?"}`, `Health markers · ${h.date}`, new Date(h.date).getTime(), h, 4);
    }
    if (h.symptoms && matches(h.symptoms)) push("health", "Symptom note", `${h.symptoms.slice(0, 50)}… · ${h.date}`, new Date(h.date).getTime(), h, 5);
  });
  // focus sessions
  if (matches("focus") || matches("deep work") || (focusSessions || []).some((f) => matches(f.label))) {
    (focusSessions || []).slice(-5).forEach((f) => {
      if (matches(f.label) || matches("focus") || matches("deep work")) push("focus", f.label || "Focus", `${f.minutes} min · ${f.date}`, f.ts, f, 3);
    });
  }
  // notes from history
  (history || []).forEach((h) => { if (matches(h.note)) push("note", `Day note`, `${h.note?.slice(0, 60)}… · ${h.date}`, new Date(h.date).getTime(), h, 5); });
  // dedupe by kind+label
  const seen = new Set(), uniq = [];
  out.sort((a, b) => (b.score - a.score) || (b.ts - a.ts));
  out.forEach((r) => { const k = r.kind + "|" + r.label; if (!seen.has(k)) { seen.add(k); uniq.push(r); } });
  return uniq.slice(0, 20);
}

/* ---------------- calendar day summary -------------- */
// returns icons for a given date based on what was logged
function calendarDay({ date, workouts, weightSeries, sleepLogs, history, painLogs, dailyHistory, targets }) {
  const icons = [];
  if ((workouts || []).some((w) => (w.date || new Date(w.ts).toLocaleDateString("en-CA")) === date)) icons.push({ k: "gym", emoji: "💪", color: "#3E7B53" });
  const h = (history || []).find((x) => x.date === date);
  if (h && targets?.protein && h.protein >= targets.protein * 0.9) icons.push({ k: "protein", emoji: "🥩", color: "#6BAE78" });
  const slp = (sleepLogs || []).find((l) => l.date === date);
  if (slp && slp.durationMin >= 420 && slp.score >= 70) icons.push({ k: "sleep", emoji: "🌙", color: "#7A6FB0" });
  if ((weightSeries || []).some((s) => s.date === date)) icons.push({ k: "weight", emoji: "⚖️", color: "#D9A23C" });
  if ((painLogs || []).some((p) => p.date === date)) icons.push({ k: "pain", emoji: "⚠️", color: "#E0714A" });
  const dh = (dailyHistory || []).find((d) => d.date === date);
  if (dh?.alcohol > 0) icons.push({ k: "alcohol", emoji: "🍷", color: "#C0392B" });
  if (dh?.steps >= 8000) icons.push({ k: "steps", emoji: "🚶", color: "#6BAE78" });
  return icons;
}

/* ---------------- "why am I not progressing?" diagnostic engine -------------- */
// Checks the whole system and returns the single biggest bottleneck + supporting reads.
function progressDiagnosis({ workouts, weightSeries, history, sleepLogs, sleepInfo, targets, profile, dailyHistory, painLogs, daily }) {
  const now = Date.now();
  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const goal = profile?.goal || "maintain";

  // --- gather signals over ~14 days ---
  const recentFood = (history || []).filter((h) => new Date(h.date).getTime() >= now - 14 * 864e5);
  const avgCal = avg(recentFood.map((h) => h.calories).filter((v) => v > 0));
  const avgProt = avg(recentFood.map((h) => h.protein).filter((v) => v > 0));
  const wkWorkouts = (workouts || []).filter((w) => w.ts >= now - 7 * 864e5).length;
  const last14Sleep = (sleepLogs || []).filter((l) => l.bedtime >= now - 14 * 864e5);
  const avgSleep = avg(last14Sleep.map((l) => l.durationMin));
  const stalls = stallingLifts(workouts || []);
  const e1rmUp = (workouts || []).length >= 4; // has enough data to judge progression
  // bodyweight trend over 14d
  const ws = [...(weightSeries || [])].sort((a, b) => a.date.localeCompare(b.date));
  const recentW = ws.filter((s) => new Date(s.date).getTime() >= now - 16 * 864e5);
  let wRate = null, wStaleDays = null;
  if (recentW.length >= 2) {
    const first = recentW[0], lastW = recentW[recentW.length - 1];
    const days = Math.max(1, (new Date(lastW.date) - new Date(first.date)) / 864e5);
    wRate = ((lastW.kg - first.kg) / days) * 7; // kg/wk
    wStaleDays = Math.round((now - new Date(lastW.date).getTime()) / 864e5);
  }
  const avgSteps = avgRecent(dailyHistory || [], 7, (d) => d.steps);
  const avgAlc = avgRecent(dailyHistory || [], 7, (d) => d.alcohol);
  const recentPain = (painLogs || []).filter((p) => p.ts >= now - 14 * 864e5 && p.status === "active").length;
  const trainingDaysSpan = (workouts || []).length >= 2 ? (workouts[workouts.length - 1].ts - workouts[0].ts) / 864e5 : 0;
  const consistent = wkWorkouts >= 2;

  // not enough data?
  if (!recentFood.length && !wkWorkouts && !recentW.length) {
    return { enough: false, summary: "Log food, workouts, and a few weigh-ins for about a week and I'll pinpoint what's holding you back." };
  }

  // --- score candidate bottlenecks (higher = more likely the issue) ---
  const cand = [];
  // calories vs goal
  if (avgCal != null) {
    if (goal === "gain" && avgCal < targets.calories - 150) cand.push({ score: 9, key: "calories", title: "Calories too low", detail: `You're averaging ${Math.round(avgCal)} kcal vs a ${targets.calories} target. Muscle gain needs a surplus.`, fix: `Add ${Math.round((targets.calories - avgCal) / 10) * 10}–${Math.round((targets.calories - avgCal + 200) / 10) * 10} kcal/day.` });
    if (goal === "lose" && avgCal > targets.calories + 150) cand.push({ score: 9, key: "calories", title: "Calories too high", detail: `Averaging ${Math.round(avgCal)} kcal vs a ${targets.calories} cut target — too much to lose steadily.`, fix: `Trim ${Math.round((avgCal - targets.calories) / 10) * 10} kcal/day or add steps.` });
  }
  // weight not moving toward goal
  if (wRate != null) {
    if (goal === "gain" && wRate < 0.05) cand.push({ score: 8, key: "weight_flat", title: "Weight isn't rising", detail: `Bodyweight is flat (${wRate > 0 ? "+" : ""}${wRate.toFixed(2)} kg/wk) over two weeks — no surplus is landing.`, fix: "Add 150–250 kcal/day and recheck in 10 days." });
    if (goal === "lose" && wRate > -0.05) cand.push({ score: 8, key: "weight_flat", title: "Weight isn't dropping", detail: `Bodyweight is flat over two weeks — the deficit isn't big enough.`, fix: "Cut 150–200 kcal/day or add 2–3k steps." });
  }
  // protein
  if (avgProt != null && targets.protein && avgProt < targets.protein * 0.8) cand.push({ score: 7, key: "protein", title: "Protein too low", detail: `Averaging ${Math.round(avgProt)}g vs ${targets.protein}g target — limits muscle repair.`, fix: `Add ~${Math.round(targets.protein - avgProt)}g/day (a shake or extra meat/eggs).` });
  // sleep
  if (avgSleep != null && sleepInfo?.need && avgSleep < sleepInfo.need - 45) cand.push({ score: 7, key: "sleep", title: "Not enough sleep", detail: `Averaging ${durLabel(Math.round(avgSleep))} — under-recovery blunts gains and recovery.`, fix: "Aim 30–45 min earlier most nights." });
  // training volume / consistency
  if (wkWorkouts < 2) cand.push({ score: 8, key: "consistency", title: "Training inconsistent", detail: `Only ${wkWorkouts} session${wkWorkouts !== 1 ? "s" : ""} in the last week — not enough stimulus to progress.`, fix: "Aim for 3–4 sessions/week, even short ones." });
  // stalled lifts (progression)
  if (stalls.length >= 2) cand.push({ score: 6, key: "stall", title: "Lifts have stalled", detail: `${stalls.slice(0, 2).join(", ")} haven't moved in 3 sessions.`, fix: "Deload that lift ~10%, then rebuild — or add a rep before adding weight." });
  // alcohol
  if (avgAlc != null && avgAlc >= 1) cand.push({ score: 5, key: "alcohol", title: "Alcohol is a factor", detail: `~${avgAlc} drinks/day average dents sleep, recovery, and protein synthesis.`, fix: "Cut back on training-week drinking and watch recovery improve." });
  // pain
  if (recentPain >= 1) cand.push({ score: 5, key: "pain", title: "Pain is limiting you", detail: `Active pain logged recently — likely capping intensity on key lifts.`, fix: "Train around it, rest the area, and see a physio if it lingers." });
  // movement (mainly for cuts)
  if (goal === "lose" && avgSteps != null && avgSteps < 5000) cand.push({ score: 6, key: "movement", title: "Low daily movement", detail: `~${Math.round(avgSteps)} steps/day — NEAT is a big lever for fat loss.`, fix: "Build toward 8–10k steps/day." });

  cand.sort((a, b) => b.score - a.score);

  // positives worth affirming
  const good = [];
  if (consistent && wkWorkouts >= 3) good.push("training is consistent");
  if (avgProt != null && targets.protein && avgProt >= targets.protein * 0.9) good.push("protein is on point");
  if (avgSleep != null && sleepInfo?.need && avgSleep >= sleepInfo.need - 30) good.push("sleep is solid");

  const top = cand[0];
  return {
    enough: true,
    bottleneck: top || null,
    others: cand.slice(1, 3),
    good,
    summary: top
      ? `Main bottleneck: ${top.title.toLowerCase()}.`
      : "No obvious bottleneck — the fundamentals look good. Keep being consistent and give it time.",
  };
}

const MICRO_KEYS = [
  ["vitamin_a", "Vitamin A"], ["vitamin_c", "Vitamin C"], ["vitamin_d", "Vitamin D"],
  ["vitamin_e", "Vitamin E"], ["vitamin_k", "Vitamin K"], ["b6", "Vitamin B6"],
  ["b12", "Vitamin B12"], ["folate", "Folate"], ["calcium", "Calcium"],
  ["iron", "Iron"], ["magnesium", "Magnesium"], ["zinc", "Zinc"],
  ["potassium", "Potassium"], ["selenium", "Selenium"],
];

// Map every historical / AI micro key format onto the canonical UI keys above.
// The AI proxy returns `vit_a_pct`, `vit_b12_pct`, `vit_b9_pct`, `calcium_pct`, …; older
// data used `vitamin_a`, `b12`, `folate`, `calcium`; some used bare `vit_a`. This accepts
// all of them and returns an object keyed by the canonical MICRO_KEYS. Safe on missing/null.
const MICRO_ALIASES = {
  vitamin_a: ["vitamin_a", "vit_a", "vit_a_pct", "vita", "a"],
  vitamin_c: ["vitamin_c", "vit_c", "vit_c_pct", "vitc", "c"],
  vitamin_d: ["vitamin_d", "vit_d", "vit_d_pct", "vitd", "d"],
  vitamin_e: ["vitamin_e", "vit_e", "vit_e_pct", "vite", "e"],
  vitamin_k: ["vitamin_k", "vit_k", "vit_k_pct", "vitk", "k"],
  b6:        ["b6", "vitamin_b6", "vit_b6", "vit_b6_pct"],
  b12:       ["b12", "vitamin_b12", "vit_b12", "vit_b12_pct"],
  folate:    ["folate", "b9", "vitamin_b9", "vit_b9", "vit_b9_pct", "folate_pct"],
  calcium:   ["calcium", "calcium_pct", "ca"],
  iron:      ["iron", "iron_pct", "fe"],
  magnesium: ["magnesium", "magnesium_pct", "mg"],
  zinc:      ["zinc", "zinc_pct", "zn"],
  potassium: ["potassium", "potassium_pct", "k_potassium"],
  selenium:  ["selenium", "selenium_pct", "se"],
};
function normalizeMicros(micros) {
  const out = {};
  if (!micros || typeof micros !== "object") {
    MICRO_KEYS.forEach(([k]) => (out[k] = 0));
    return out;
  }
  // case-insensitive lookup map of the incoming object
  const lower = {};
  for (const key of Object.keys(micros)) {
    const v = micros[key];
    if (typeof v === "number" && isFinite(v)) lower[key.toLowerCase()] = v;
  }
  MICRO_KEYS.forEach(([canon]) => {
    let val = 0;
    for (const alias of MICRO_ALIASES[canon]) {
      if (lower[alias] != null) { val = lower[alias]; break; }
    }
    out[canon] = Math.max(0, Math.round(val));
  });
  return out;
}

const omegaNum = (v) => ({ low: 20, medium: 55, high: 90 }[v] ?? 0);

function dayTotals(entries) {
  const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, alcohol_g: 0, micros: {}, omega3: 0, oCount: 0 };
  MICRO_KEYS.forEach(([k]) => (t.micros[k] = 0));
  entries.forEach((e) => {
    const m = e.mult || 1;
    t.calories += (e.calories || 0) * m;
    t.protein += (e.protein_g || 0) * m;
    t.carbs += (e.carbs_g || 0) * m;
    t.fat += (e.fat_g || 0) * m;
    t.fiber += (e.fiber_g || 0) * m;
    t.alcohol_g += (e.alcohol_g || 0) * m;
    const em = normalizeMicros(e.micros);
    MICRO_KEYS.forEach(([k]) => (t.micros[k] += (em[k] || 0) * m));
    if (e.omega3) { t.omega3 += omegaNum(e.omega3); t.oCount += 1; }
  });
  t.omega3 = t.oCount ? t.omega3 / t.oCount : 0;
  Object.keys(t).forEach((k) => { if (typeof t[k] === "number") t[k] = Math.round(t[k]); });
  return t;
}

const FUNCS = [
  { key: "mind", label: "Sharp Mind", emoji: "🧠", color: "#6E83D6",
    parts: (t) => [t.micros.b12, t.micros.folate, t.micros.iron, t.micros.vitamin_e, t.omega3] },
  { key: "body", label: "Strong Body", emoji: "💪", color: C.green,
    parts: (t, tg) => [pct(t.protein, tg.protein), t.micros.magnesium, t.micros.vitamin_d, t.micros.potassium] },
  { key: "energy", label: "Steady Energy", emoji: "⚡", color: C.amber,
    parts: (t) => [t.micros.iron, t.micros.b12, t.micros.folate, t.micros.b6, t.micros.magnesium] },
  { key: "rest", label: "Deep Rest", emoji: "🌙", color: "#7A6FB0",
    parts: (t) => [t.micros.magnesium, t.micros.potassium, t.micros.calcium] },
  { key: "defense", label: "Defense", emoji: "🛡️", color: C.coral,
    parts: (t) => [t.micros.vitamin_c, t.micros.vitamin_d, t.micros.zinc, t.micros.vitamin_a, t.micros.selenium] },
  { key: "frame", label: "Framework", emoji: "🦴", color: "#9C9486",
    parts: (t) => [t.micros.calcium, t.micros.vitamin_d, t.micros.vitamin_k, t.micros.magnesium] },
  { key: "glow", label: "Glow", emoji: "✨", color: "#D98AA8",
    parts: (t) => [t.micros.vitamin_c, t.micros.vitamin_e, t.micros.vitamin_a, t.micros.zinc] },
];
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
function funcScores(t, tg) {
  return FUNCS.map((f) => {
    const arr = f.parts(t, tg).map((v) => Math.min(100, Math.max(0, v || 0)));
    const score = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    return { ...f, score };
  });
}

/* ---------------- nutrition coaching engine -------------- */
// common food sources to fix a low nutrient
const FOOD_SOURCES = {
  protein: "eggs, chicken, Greek yogurt, beef, lentils",
  fiber: "oats, beans, berries, whole grains, broccoli",
  vitamin_a: "sweet potato, carrots, spinach, eggs",
  vitamin_c: "oranges, kiwi, peppers, strawberries",
  vitamin_d: "salmon, egg yolks, fortified milk, sunlight",
  vitamin_e: "almonds, sunflower seeds, avocado",
  vitamin_k: "kale, spinach, broccoli",
  b6: "chicken, salmon, potatoes, bananas",
  b12: "beef, eggs, dairy, fish",
  folate: "lentils, spinach, asparagus, beans",
  calcium: "yogurt, milk, cheese, tofu",
  iron: "red meat, lentils, spinach, pumpkin seeds",
  magnesium: "dark chocolate, nuts, spinach, beans",
  zinc: "beef, pumpkin seeds, chickpeas, cashews",
  potassium: "potatoes, bananas, yogurt, beans",
  selenium: "brazil nuts, tuna, eggs",
};
const NUTRI_LABEL = Object.fromEntries([...MICRO_KEYS, ["protein", "Protein"], ["fiber", "Fiber"]]);

// daily water goal from bodyweight (~35 ml/kg, sane bounds)
function waterGoal(profile) {
  const kg = profile?.weight || 72;
  return Math.round(Math.max(2000, Math.min(4000, kg * 35)) / 250) * 250;
}

// per-meal quality score (0-100) from a single entry's macros/micros
function mealScore(e, targets) {
  const m = e.mult || 1;
  const cal = (e.calories || 0) * m;
  const protein = (e.protein_g || 0) * m;
  const fiber = (e.fiber_g || 0) * m;
  if (cal <= 0) return null;
  // protein density: g per 100 kcal (≥10 is excellent)
  const protDensity = Math.min(1, (protein / (cal / 100)) / 10);
  // fiber density: g per 100 kcal (≥1.4 is great)
  const fibDensity = Math.min(1, (fiber / (cal / 100)) / 1.4);
  // micronutrient richness: avg of this meal's micros (already %DV-ish per serving)
  const microVals = MICRO_KEYS.map(([k]) => Math.min(100, (normalizeMicros(e.micros)[k] || 0) * m));
  const microAvg = microVals.length ? microVals.reduce((a, b) => a + b, 0) / microVals.length : 0;
  const omega = e.omega3 ? omegaNum(e.omega3) : 0;
  let score = protDensity * 38 + fibDensity * 24 + (microAvg / 100) * 28 + (omega / 100) * 10;
  const score100 = Math.max(0, Math.min(100, Math.round(score)));
  // one short explanation
  const good = [], weak = [];
  if (protDensity > 0.6) good.push("high protein"); else if (protDensity < 0.3) weak.push("protein");
  if (fibDensity > 0.55) good.push("good fiber"); else if (fibDensity < 0.25) weak.push("fiber");
  if (microAvg > 35) good.push("rich in micros"); else if (microAvg < 12) weak.push("micronutrients");
  if (omega >= 70) good.push("good omega-3"); else if (e.omega3 === "low") weak.push("omega-3");
  let note;
  if (score100 < 40) {
    note = weak.length ? `Low in ${weak.slice(0, 2).join(" & ")}.` : "Light on nutrients for the calories.";
  } else {
    note = good.length ? good.join(", ").replace(/^./, (c) => c.toUpperCase()) + "." : "Balanced.";
    if (weak.length) note += ` Low in ${weak[0]}.`;
  }
  return { score: score100, note };
}

// daily diet quality (0-100) + simple advice
function dietQuality(t, targets, daily, profile) {
  const protP = targets.protein ? Math.min(1, t.protein / targets.protein) : 0;
  const fibP = targets.fiber ? Math.min(1, t.fiber / targets.fiber) : 0;
  const microCov = MICRO_KEYS.filter(([k]) => t.micros[k] >= 70).length / MICRO_KEYS.length;
  const waterP = Math.min(1, (daily?.water || 0) / waterGoal(profile));
  // whole-food estimate: fiber-per-calorie as a proxy for unprocessed eating
  const wholeFood = t.calories ? Math.min(1, (t.fiber / (t.calories / 1000)) / 14) : 0;
  const score = Math.round(protP * 30 + fibP * 20 + microCov * 25 + wholeFood * 15 + waterP * 10);
  const advice = [];
  if (protP < 0.8) advice.push("add protein");
  if (fibP < 0.7) advice.push("add fiber");
  if (microCov < 0.5) advice.push("more fruit & veg");
  if (waterP < 0.6) advice.push("drink more water");
  if ((daily?.alcohol || 0) >= 2) advice.push("ease off alcohol");
  return { score: Math.max(0, Math.min(100, score)), advice };
}

// top low micronutrients today, with food suggestions
function missingNutrients(t, targets) {
  const items = [];
  if (targets.protein && t.protein < targets.protein * 0.8)
    items.push({ key: "protein", label: "Protein", pct: Math.round(pct(t.protein, targets.protein)), food: FOOD_SOURCES.protein });
  if (targets.fiber && t.fiber < targets.fiber * 0.7)
    items.push({ key: "fiber", label: "Fiber", pct: Math.round(pct(t.fiber, targets.fiber)), food: FOOD_SOURCES.fiber });
  MICRO_KEYS.forEach(([k, lbl]) => { if ((t.micros[k] || 0) < 70) items.push({ key: k, label: lbl, pct: t.micros[k] || 0, food: FOOD_SOURCES[k] }); });
  return items.sort((a, b) => a.pct - b.pct).slice(0, 3);
}

// lean-bulk / cut / maintenance coach from calories + weight trend
function nutritionCoach(t, targets, profile, weightSeries) {
  const goal = profile?.goal || "maintain";
  const calDiff = Math.round(t.calories - targets.calories);     // today vs target
  const proteinOk = t.protein >= targets.protein * 0.9;
  // weekly weight rate
  const ws = [...(weightSeries || [])].sort((a, b) => a.date.localeCompare(b.date));
  let rate = null; // kg/week
  if (ws.length >= 2) {
    const first = ws[0], last = ws[ws.length - 1];
    const days = Math.max(1, (new Date(last.date) - new Date(first.date)) / 864e5);
    rate = +(((last.kg - first.kg) / days) * 7).toFixed(2);
  }
  const kg = profile?.weight || 72;
  const lines = [];
  // calorie status vs goal
  if (t.calories > 0) {
    if (goal === "gain") {
      if (calDiff < -150) lines.push({ tone: "warn", text: `Under your bulk target by ${Math.abs(calDiff)} kcal — eat more to grow.` });
      else if (calDiff > 400) lines.push({ tone: "warn", text: `${calDiff} kcal over target — trim a little to keep the bulk lean.` });
      else lines.push({ tone: "good", text: "Calories on track for a lean bulk." });
    } else if (goal === "lose") {
      if (calDiff > 150) lines.push({ tone: "warn", text: `${calDiff} kcal over your cut target — tighten up to keep losing.` });
      else lines.push({ tone: "good", text: "Calories on track for your cut." });
    } else {
      if (Math.abs(calDiff) <= 200) lines.push({ tone: "good", text: "Calories about right for maintenance." });
      else lines.push({ tone: "warn", text: `${calDiff > 0 ? calDiff + " kcal over" : Math.abs(calDiff) + " kcal under"} maintenance.` });
    }
    if (!proteinOk) lines.push({ tone: "warn", text: `Protein's a bit low for ${goal === "lose" ? "preserving muscle" : "muscle gain"} — aim for ${targets.protein}g.` });
  }
  // weight-rate feedback
  if (rate != null) {
    const pctPerWk = (rate / kg) * 100;
    if (goal === "gain") {
      if (rate <= 0.02) lines.push({ tone: "warn", text: "Weight is flat — add ~150 kcal/day to keep gaining." });
      else if (pctPerWk > 0.7) lines.push({ tone: "warn", text: `Gaining fast (${rate > 0 ? "+" : ""}${rate} kg/wk) — slow it to stay lean.` });
      else lines.push({ tone: "good", text: `Gaining ${rate > 0 ? "+" : ""}${rate} kg/wk — a good lean-bulk pace.` });
    } else if (goal === "lose") {
      if (rate >= -0.02) lines.push({ tone: "warn", text: "Weight is stable — drop ~150 kcal/day to start losing." });
      else if (pctPerWk < -1.2) lines.push({ tone: "warn", text: `Losing fast (${rate} kg/wk) — eat a little more to protect muscle.` });
      else lines.push({ tone: "good", text: `Losing ${rate} kg/wk — a healthy rate.` });
    } else {
      if (Math.abs(pctPerWk) > 0.5) lines.push({ tone: "warn", text: `Weight is ${rate > 0 ? "rising" : "dropping"} (${rate > 0 ? "+" : ""}${rate} kg/wk) for a maintenance goal.` });
    }
  }
  return { lines, rate, calDiff };
}

/* ---------------- body composition engine -------------- */
const MEASURE_KEYS = [
  ["waist", "Waist"], ["chest", "Chest"], ["shoulders", "Shoulders"],
  ["arms", "Arms"], ["thighs", "Thighs"], ["calves", "Calves"], ["neck", "Neck"],
];
const PHOTO_KINDS = [["front", "Front"], ["side", "Side"], ["back", "Back"]];

// rolling stats from a weight series: current, 7-day avg, weekly rate (kg/wk), %bw/wk
function weightStats(series) {
  const ws = [...(series || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!ws.length) return { current: null, avg7: null, rate: null, pctRate: null, latestDate: null };
  const now = Date.now();
  const last7 = ws.filter((s) => now - new Date(s.date).getTime() <= 7 * 864e5);
  const avg7 = last7.length ? +(last7.reduce((a, s) => a + s.kg, 0) / last7.length).toFixed(2) : null;
  const current = ws[ws.length - 1].kg;
  // weekly rate from earliest-to-latest within the last 28 days (more stable than first→last of all time)
  const window = ws.filter((s) => now - new Date(s.date).getTime() <= 28 * 864e5);
  let rate = null, pctRate = null;
  if (window.length >= 2) {
    const first = window[0], last = window[window.length - 1];
    const days = Math.max(1, (new Date(last.date) - new Date(first.date)) / 864e5);
    rate = +(((last.kg - first.kg) / days) * 7).toFixed(2);
    pctRate = +(((rate / current) * 100).toFixed(2));
  }
  return { current, avg7, rate, pctRate, latestDate: ws[ws.length - 1].date };
}

// verdict + advice tied to goal
function weightVerdict(stats, goal) {
  if (stats.rate == null) return { tag: "more", text: "Log a few mornings in a row to see your trend." };
  const r = stats.rate, p = stats.pctRate;
  if (goal === "gain") {
    if (r <= 0.02) return { tag: "slow", text: "Weight is flat — add ~150 kcal/day to start gaining." };
    if (p > 0.7) return { tag: "fast", text: `Gaining ${r > 0 ? "+" : ""}${r} kg/wk (${p}%/wk) — too fast for a lean bulk. Trim 100–150 kcal.` };
    if (r >= 0.1 && r <= 0.35) return { tag: "good", text: `+${r} kg/wk — textbook lean-bulk pace.` };
    return { tag: "ok", text: `+${r} kg/wk — fine, aim for 0.1–0.3 kg/wk to stay lean.` };
  }
  if (goal === "lose") {
    if (r >= -0.02) return { tag: "slow", text: "Weight is stable — drop ~150 kcal/day or add 1–2k steps." };
    if (p < -1.2) return { tag: "fast", text: `Losing ${r} kg/wk (${p}%/wk) — too fast. Eat ~150 kcal more to protect muscle.` };
    if (p <= -0.3) return { tag: "good", text: `${r} kg/wk (${p}%/wk) — a healthy, muscle-sparing rate.` };
    return { tag: "ok", text: `${r} kg/wk — a bit slow; tighten calories or steps.` };
  }
  // maintain
  if (Math.abs(p) <= 0.3) return { tag: "good", text: `Stable (${r > 0 ? "+" : ""}${r} kg/wk) — maintenance on lock.` };
  return { tag: "ok", text: `${r > 0 ? "Drifting up" : "Drifting down"} (${r} kg/wk) — small calorie tweak will fix it.` };
}

// photo reminder: how overdue (in days), with an every-2-weeks default
function photoReminder(photoLog, everyDays = 14) {
  const last = (photoLog || []).slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return { due: true, daysSince: null, missing: PHOTO_KINDS.map(([k]) => k), text: "Take your first set of progress photos." };
  const daysSince = Math.floor((Date.now() - new Date(last.date).getTime()) / 864e5);
  const missing = PHOTO_KINDS.map(([k]) => k).filter((k) => !last.kinds.includes(k));
  if (daysSince >= everyDays) return { due: true, daysSince, missing: PHOTO_KINDS.map(([k]) => k), text: `${daysSince} days since your last photo set — time for a new one.` };
  if (missing.length && daysSince <= 2) return { due: true, daysSince, missing, text: `You're missing the ${missing.join(" & ")} angle${missing.length > 1 ? "s" : ""} from today's set.` };
  return { due: false, daysSince, missing, text: `Photos taken ${daysSince === 0 ? "today" : daysSince + " days ago"} — next set in ${Math.max(1, everyDays - daysSince)} days.` };
}

// latest measurement + change since 30d ago
function measurementStats(series) {
  const ms = [...(series || [])].sort((a, b) => a.date.localeCompare(b.date));
  if (!ms.length) return {};
  const latest = ms[ms.length - 1];
  const cutoff = Date.now() - 30 * 864e5;
  const earlier = ms.filter((m) => new Date(m.date).getTime() <= cutoff).slice(-1)[0] || ms[0];
  const out = {};
  MEASURE_KEYS.forEach(([k]) => {
    const cur = latest[k]; const prev = earlier[k];
    if (cur != null) out[k] = { current: cur, change: prev != null && prev !== cur ? +(cur - prev).toFixed(1) : null, date: latest.date };
  });
  return out;
}

/* ---------------- health markers + risk radar (NOT medical advice) -------------- */
// blood-work reference ranges (typical adult lab ranges; broad enough to avoid false alarms)
const BLOOD_MARKERS = [
  { key: "vitD",       label: "Vitamin D",       unit: "ng/mL",  ok: [30, 80],   high: 100, low: 20,  better: "high" },
  { key: "b12",        label: "Vitamin B12",     unit: "pg/mL",  ok: [400, 900], high: 1200, low: 300, better: "high" },
  { key: "ferritin",   label: "Ferritin",        unit: "ng/mL",  ok: [30, 300],  high: 400, low: 20,  better: "high" },
  { key: "hba1c",      label: "HbA1c",           unit: "%",      ok: [4.5, 5.6], high: 6.4, low: 4,   better: "low" },
  { key: "glucose",    label: "Fasting glucose", unit: "mg/dL",  ok: [70, 99],   high: 125, low: 60,  better: "low" },
  { key: "ldl",        label: "LDL cholesterol", unit: "mg/dL",  ok: [0, 100],   high: 160, low: null,better: "low" },
  { key: "hdl",        label: "HDL cholesterol", unit: "mg/dL",  ok: [40, 80],   high: null,low: 35,  better: "high" },
  { key: "trig",       label: "Triglycerides",   unit: "mg/dL",  ok: [0, 150],   high: 200, low: null,better: "low" },
  { key: "crp",        label: "CRP",             unit: "mg/L",   ok: [0, 3],     high: 10,  low: null,better: "low" },
  { key: "testo",      label: "Testosterone",    unit: "ng/dL",  ok: [400, 900], high: null,low: 300, better: "high" },
  { key: "tsh",        label: "TSH (thyroid)",   unit: "mIU/L",  ok: [0.5, 4],   high: 5,   low: 0.3, better: "mid" },
  { key: "alt",        label: "ALT (liver)",     unit: "U/L",    ok: [7, 45],    high: 60,  low: null,better: "low" },
  { key: "creat",      label: "Creatinine",      unit: "mg/dL",  ok: [0.7, 1.3], high: 1.4, low: 0.5, better: "mid" },
];
const BLOOD_LABEL = Object.fromEntries(BLOOD_MARKERS.map((b) => [b.key, b.label]));

function latestHealth(healthSeries) {
  if (!healthSeries?.length) return {};
  // most-recent value per field (so a one-off blood test from 3 months ago still shows)
  const out = { blood: {} };
  [...healthSeries].sort((a, b) => a.date.localeCompare(b.date)).forEach((h) => {
    ["bpSys", "bpDia", "rhr", "smoking", "symptoms"].forEach((k) => { if (h[k] != null && h[k] !== "") out[k] = { value: h[k], date: h.date }; });
    if (h.blood) Object.keys(h.blood).forEach((k) => { if (h.blood[k] != null) out.blood[k] = { value: h.blood[k], date: h.date }; });
  });
  return out;
}

function bloodFlag(key, value) {
  const m = BLOOD_MARKERS.find((b) => b.key === key); if (!m || value == null) return null;
  if (m.high != null && value > m.high) return { tag: "high", label: "High" };
  if (m.low != null && value < m.low) return { tag: "low", label: "Low" };
  if (value < m.ok[0]) return { tag: "below", label: "Below range" };
  if (value > m.ok[1]) return { tag: "above", label: "Above range" };
  return { tag: "ok", label: "In range" };
}

// average over the last N days from a date-keyed series, given a getter
function avgRecent(series, days, get) {
  if (!series?.length) return null;
  const cutoff = Date.now() - days * 864e5;
  const vals = series.filter((s) => new Date(s.date).getTime() >= cutoff).map(get).filter((v) => v != null && !isNaN(v));
  return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
}

// risk radar — NEVER diagnostic. Each category returns {tag: low/moderate/elevated/high, text}
function healthRiskRadar({ healthSeries, sleepLogs, sleepInfo, t, targets, daily, dailyHistory, weightSeries, measureSeries, workouts, profile }) {
  const latest = latestHealth(healthSeries);
  const cats = [];

  // SLEEP — debt + average duration
  const last7 = (sleepLogs || []).slice(-7);
  const avgSleep = last7.length ? last7.reduce((a, l) => a + l.durationMin, 0) / last7.length : null;
  if (avgSleep != null) {
    if (sleepInfo.debtMin > 360 || avgSleep < sleepInfo.need - 90) cats.push({ key: "sleep", label: "Sleep", tag: "elevated", text: "Chronic short sleep is one of the strongest long-term health risks. Aim to add 30–60 min/night." });
    else if (sleepInfo.debtMin > 180) cats.push({ key: "sleep", label: "Sleep", tag: "moderate", text: "Building some debt. A few earlier nights this week will reset it." });
    else cats.push({ key: "sleep", label: "Sleep", tag: "low", text: "Sleep is in a good range." });
  } else cats.push({ key: "sleep", label: "Sleep", tag: "unknown", text: "Log a few nights to track sleep health." });

  // MOVEMENT — steps + weekly workouts
  const avgSteps = avgRecent(dailyHistory || [], 7, (d) => d.steps);
  const weeklyWorkouts = (workouts || []).filter((w) => Date.now() - w.ts <= 7 * 864e5).length;
  if (avgSteps == null && weeklyWorkouts === 0) cats.push({ key: "movement", label: "Movement", tag: "unknown", text: "Log steps or a workout to track activity." });
  else if ((avgSteps == null || avgSteps < 4000) && weeklyWorkouts === 0) cats.push({ key: "movement", label: "Movement", tag: "elevated", text: "Very sedentary. Two short walks + one workout per week makes a real long-term difference." });
  else if ((avgSteps || 0) < 6000 && weeklyWorkouts < 2) cats.push({ key: "movement", label: "Movement", tag: "moderate", text: "Movement is light. Aim for 7k+ steps and 2–3 workouts/week." });
  else cats.push({ key: "movement", label: "Movement", tag: "low", text: "Activity is in a good range." });

  // NUTRITION — protein and fiber over last 7 days from history
  const protAvg = avgRecent(dailyHistory || [], 7, (d) => d.protein);
  const calAvg = avgRecent(dailyHistory || [], 7, (d) => d.calories);
  if (protAvg == null) cats.push({ key: "nutrition", label: "Nutrition", tag: "unknown", text: "Log a few days of food to track nutrition risk." });
  else if (protAvg < targets.protein * 0.6) cats.push({ key: "nutrition", label: "Nutrition", tag: "elevated", text: `Average protein (${Math.round(protAvg)}g) is well under target — risks muscle loss over time.` });
  else if (protAvg < targets.protein * 0.85) cats.push({ key: "nutrition", label: "Nutrition", tag: "moderate", text: `Average protein (${Math.round(protAvg)}g) is a bit low for your target.` });
  else cats.push({ key: "nutrition", label: "Nutrition", tag: "low", text: `Protein on track (${Math.round(protAvg)}g avg).` });

  // BLOOD PRESSURE — based on latest reading (categories per AHA guidance, conservative)
  if (latest.bpSys?.value != null && latest.bpDia?.value != null) {
    const s = latest.bpSys.value, d = latest.bpDia.value;
    let tag, text;
    if (s >= 140 || d >= 90)       { tag = "high",     text = `Reading ${s}/${d}. If this stays elevated, consider checking with a doctor.`; }
    else if (s >= 130 || d >= 80)  { tag = "elevated", text = `Reading ${s}/${d}. Watch trend — sleep, salt, alcohol and stress all matter.`; }
    else if (s >= 120)             { tag = "moderate", text = `Reading ${s}/${d}. Borderline-normal — sleep and steps tend to lower it.`; }
    else                            { tag = "low",      text = `Reading ${s}/${d} — in a healthy range.`; }
    cats.push({ key: "bp", label: "Blood pressure", tag, text });
  } else cats.push({ key: "bp", label: "Blood pressure", tag: "unknown", text: "Log a blood-pressure reading to track this." });

  // RESTING HEART RATE — trend or single reading
  if (latest.rhr?.value != null) {
    const r = latest.rhr.value;
    let tag, text;
    if (r >= 90)      { tag = "elevated", text = `RHR ${r}. Consistently high RHR is worth flagging if it persists.`; }
    else if (r >= 80) { tag = "moderate", text = `RHR ${r}. A bit elevated — sleep, alcohol and cardio all affect it.`; }
    else if (r >= 60) { tag = "low",      text = `RHR ${r} — in a healthy range.`; }
    else              { tag = "low",      text = `RHR ${r} — well-conditioned.`; }
    cats.push({ key: "rhr", label: "Resting HR", tag, text });
  }

  // ALCOHOL — weekly average
  const avgAlc = avgRecent(dailyHistory || [], 7, (d) => d.alcohol);
  if (avgAlc == null || avgAlc === 0) cats.push({ key: "alcohol", label: "Alcohol", tag: "low", text: "No alcohol logged — kindest thing to long-term health." });
  else if (avgAlc < 0.5) cats.push({ key: "alcohol", label: "Alcohol", tag: "low", text: `Light intake (~${avgAlc} drinks/day average).` });
  else if (avgAlc < 1.5) cats.push({ key: "alcohol", label: "Alcohol", tag: "moderate", text: `Around ${avgAlc} drinks/day — moderate. Cuts into sleep and recovery.` });
  else cats.push({ key: "alcohol", label: "Alcohol", tag: "elevated", text: `Around ${avgAlc} drinks/day on average — that's elevated long-term risk.` });

  // STRESS — from daily check-in over the last 14 days (if logged)
  const stressVals = (dailyHistory || []).slice(-14).map((d) => d.stress).filter(Boolean);
  if (stressVals.length >= 3) {
    const highCount = stressVals.filter((s) => s === "high").length;
    if (highCount / stressVals.length > 0.5) cats.push({ key: "stress", label: "Stress", tag: "elevated", text: "Frequent high stress — chronic stress raises BP, hurts sleep and recovery." });
    else if (highCount > 0) cats.push({ key: "stress", label: "Stress", tag: "moderate", text: "Some high-stress days. Breath work, walks, and sleep all help." });
    else cats.push({ key: "stress", label: "Stress", tag: "low", text: "Stress generally low — good." });
  }

  // BODY COMPOSITION — waist-to-height (best simple metric)
  const latestM = [...(measureSeries || [])].sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0];
  const waist = latestM?.waist; const height = profile?.height;
  if (waist && height) {
    const ratio = waist / height;
    let tag, text;
    if (ratio > 0.6)       { tag = "elevated", text = `Waist-to-height ${ratio.toFixed(2)} is elevated. Worth tracking month-to-month.`; }
    else if (ratio > 0.55) { tag = "moderate", text = `Waist-to-height ${ratio.toFixed(2)} is borderline.`; }
    else                    { tag = "low",      text = `Waist-to-height ${ratio.toFixed(2)} is in a healthy range.`; }
    cats.push({ key: "body", label: "Body composition", tag, text });
  }

  // SMOKING / VAPING — anything > "no" is a flag
  if (latest.smoking?.value && latest.smoking.value !== "no") {
    cats.push({ key: "smoke", label: "Smoking / vaping", tag: "high", text: "Quitting is the single biggest long-term health win. Many free programs and apps can help." });
  }

  // BLOOD-WORK out-of-range markers (advanced)
  if (latest.blood && Object.keys(latest.blood).length) {
    const outs = [];
    Object.entries(latest.blood).forEach(([k, { value }]) => {
      const f = bloodFlag(k, value);
      if (f && f.tag !== "ok") outs.push(`${BLOOD_LABEL[k] || k} ${f.label.toLowerCase()}`);
    });
    if (outs.length) cats.push({ key: "blood", label: "Blood markers", tag: outs.length > 2 ? "elevated" : "moderate", text: `${outs.slice(0, 3).join(", ")}. Discuss with your doctor.` });
  }

  return cats;
}
const RISK_TAG = {
  low:      { color: "#6BAE78", label: "Healthy",  dot: "🌿" },
  moderate: { color: "#D9A23C", label: "Watch",    dot: "•" },
  elevated: { color: "#E0714A", label: "Elevated", dot: "•" },
  high:     { color: "#C0392B", label: "High",     dot: "•" },
  unknown:  { color: "#A89E89", label: "No data",  dot: "·" },
};

/* ---------------- safety: red-flag symptoms + interaction flags (NOT medical advice) -------------- */
// Phrases that warrant "consider urgent medical help". Matched against symptom text + check-ins.
const RED_FLAGS = [
  { re: /\bchest pain|chest tight|pressure in (my )?chest|crushing chest/i, text: "Chest pain or pressure" },
  { re: /can'?t breathe|trouble breathing|short(ness)? of breath|gasping/i, text: "Trouble breathing" },
  { re: /faint(ed|ing)?|passed out|black(ed|ing) out|collaps/i, text: "Fainting or blacking out" },
  { re: /worst headache|sudden (severe )?headache|thunderclap/i, text: "Sudden severe headache" },
  { re: /slurred speech|face droop|one side.*(numb|weak)|can'?t move (my )?(arm|leg|face)/i, text: "Possible stroke signs" },
  { re: /coughing up blood|vomiting blood|blood in (my )?stool|black stool/i, text: "Bleeding signs" },
  { re: /severe swelling|swollen.*(hot|red)|calf.*(swollen|hot)/i, text: "Severe or hot swelling" },
  { re: /hit my head|head injury|knocked out|concuss/i, text: "Head injury symptoms" },
  { re: /sharp.*(tear|pop|snap)|heard a pop|can'?t (bear|put) weight/i, text: "Possible acute injury" },
  { re: /suicid|kill myself|end (it|my life)|don'?t want to (be alive|live)/i, text: "Thoughts of self-harm", crisis: true },
];
function redFlagScan(text) {
  if (!text) return [];
  return RED_FLAGS.filter((f) => f.re.test(text));
}
// blood pressure red flag (hypertensive crisis range)
function bpRedFlag(sys, dia) {
  if (sys == null || dia == null) return null;
  if (sys >= 180 || dia >= 120) return { text: `Very high blood pressure (${sys}/${dia})` };
  return null;
}

// supplement/medication interaction flags. Cautious, non-diagnostic; flags combinations to check, never dosing.
const INTERACTION_RULES = [
  { a: ["alcohol"], b: ["acetaminophen", "paracetamol", "tylenol", "painkiller", "ibuprofen", "advil", "naproxen", "nsaid", "aspirin"], note: "Alcohol with painkillers (paracetamol or NSAIDs) raises the risk of liver or stomach harm. Check the label or ask a pharmacist." },
  { a: ["ibuprofen", "advil", "naproxen", "nsaid", "aspirin"], b: ["creatine"], note: "Heavy NSAID use plus creatine can stress the kidneys when hydration is low — drink plenty of water." },
  { a: ["caffeine", "pre-workout", "pre workout"], b: ["caffeine", "pre-workout", "pre workout"], note: "Stacking multiple caffeine sources (coffee + pre-workout + energy drink) adds up fast — watch total dose and timing." },
  { a: ["fish oil", "omega", "omega-3", "vitamin e", "ginkgo", "garlic"], b: ["aspirin", "blood thinner", "warfarin"], note: "Fish oil/vitamin E with blood thinners or aspirin can increase bleeding risk. Mention your supplements to your doctor." },
  { a: ["st john", "st. john"], b: ["medication", "antidepressant", "birth control", "ssri"], note: "St. John's Wort interferes with many medications. Check with a pharmacist before combining." },
  { a: ["melatonin"], b: ["alcohol"], note: "Melatonin plus alcohol can worsen grogginess and disrupt sleep architecture." },
];
// scan supps (array of {name}), daily caffeine/alcohol, and free-text meds note for combinations
function interactionFlags({ supps, daily, medsNote }) {
  const tokens = [];
  (supps || []).forEach((s) => tokens.push((s.name || "").toLowerCase()));
  if (medsNote) tokens.push(medsNote.toLowerCase());
  if ((daily?.alcohol || 0) > 0) tokens.push("alcohol");
  if ((daily?.caffeine || 0) >= 200) tokens.push("caffeine");
  const blob = tokens.join(" | ");
  const hits = [];
  INTERACTION_RULES.forEach((r) => {
    const hasA = r.a.some((kw) => blob.includes(kw));
    const hasB = r.b.some((kw) => blob.includes(kw));
    // for same-list rules (caffeine stacking) require 2+ distinct sources
    if (r.a === r.b) {
      const count = r.a.filter((kw) => blob.includes(kw)).length + (tokens.filter((t) => t.includes("caffeine")).length > 1 ? 1 : 0);
      if (count >= 2) hits.push(r.note);
    } else if (hasA && hasB) hits.push(r.note);
  });
  return [...new Set(hits)];
}

/* ---------------- pain & injury engine -------------- */
const PAIN_LOCATIONS = [
  ["shoulder", "Shoulder"], ["elbow", "Elbow"], ["wrist", "Wrist/hand"],
  ["lower_back", "Lower back"], ["upper_back", "Upper back"], ["neck", "Neck"],
  ["hip", "Hip"], ["knee", "Knee"], ["ankle", "Ankle/foot"], ["other", "Other"],
];
const PAIN_TYPES = [
  ["sharp",    "Sharp"],
  ["dull",     "Dull / ache"],
  ["burning",  "Burning"],
  ["tight",    "Tight"],
  ["sore",     "Muscle sore"],
  ["pinching", "Pinching"],
];
const PAIN_LEVELS = {
  none:     { color: "#6BAE78", label: "None",     hit: 0 },
  mild:     { color: "#D9A23C", label: "Mild",     hit: 8 },
  moderate: { color: "#E0714A", label: "Moderate", hit: 20 },
  serious:  { color: "#C0392B", label: "Serious",  hit: 35 },
};
const SET_PAIN = {
  none:    { color: "#6BAE78", label: "No pain" },
  mild:    { color: "#D9A23C", label: "Mild" },
  painful: { color: "#E0714A", label: "Painful" },
  stop:    { color: "#C0392B", label: "Stop" },
};

// which body parts each muscle group "loads" — used to suggest avoiding exercises
const LOADS_PART = {
  chest:      ["shoulder", "wrist", "elbow"],
  shoulders:  ["shoulder", "wrist", "neck"],
  triceps:    ["elbow", "shoulder", "wrist"],
  back:       ["shoulder", "elbow", "lower_back", "wrist"],
  biceps:     ["elbow", "shoulder", "wrist"],
  traps:      ["neck", "shoulder", "upper_back"],
  forearms:   ["wrist", "elbow"],
  abs:        ["lower_back", "neck"],
  lower_back: ["lower_back", "hip"],
  glutes:     ["hip", "lower_back"],
  quads:      ["knee", "hip", "lower_back"],
  hamstrings: ["lower_back", "knee", "hip"],
  calves:     ["ankle", "knee"],
};

// safety modifications per body part (when pain is mild/moderate)
const PAIN_MODS = {
  shoulder:   ["Use a neutral grip on presses (dumbbells > barbell).", "Avoid behind-the-neck and wide-grip presses.", "Limit overhead range to pain-free.", "Skip dips and bench until pain settles."],
  elbow:      ["Switch barbell curls for EZ-bar or hammer.", "Avoid skullcrushers and heavy overhead triceps.", "Lighter loads, higher reps (12–20)."],
  wrist:      ["Use wrist wraps on heavy pressing.", "Neutral grip > pronated.", "Avoid push-ups / dips on flat hands; use parallettes or DBs."],
  lower_back: ["Skip deadlifts and bent-over rows today.", "Use chest-supported rows or machines.", "No spinal loading — leg press > squat."],
  upper_back: ["Avoid heavy shrugs and barbell rows.", "Cable rows with light weight, focus on form."],
  neck:       ["Skip heavy shrugs.", "Avoid neck-loading positions (front squat rack, plate-loaded squats).", "Mobility and gentle stretching."],
  hip:        ["Avoid deep squats and lunges in painful ranges.", "Hip-friendly: leg press, machine hack squat."],
  knee:       ["Avoid lockout-heavy quad work and deep lunges.", "Tempo squats, leg curls, and step-ups in pain-free range."],
  ankle:      ["Skip jumping, sprinting, and barbell calves on a step.", "Seated calf raises only."],
  other:      ["Train pain-free movements; lighter loads on anything that aggravates the area."],
};

function painLevelOf(daily, painLogs) {
  // prefer most-recent active pain log; fall back to today's check-in
  const active = painLogs?.filter((p) => p.status === "active").slice(-1)[0];
  if (active) return active.level;
  return daily?.checkin?.pain || "none";
}

// summary: active sites, days since worst, improving/recurring flags
function painSummary(painLogs) {
  if (!painLogs?.length) return { active: [], history: [], note: null };
  // group active logs by location
  const active = [];
  const byLoc = {};
  painLogs.forEach((p) => { (byLoc[p.location || "other"] = byLoc[p.location || "other"] || []).push(p); });
  Object.entries(byLoc).forEach(([loc, list]) => {
    const sorted = list.slice().sort((a, b) => a.ts - b.ts);
    const latest = sorted[sorted.length - 1];
    if (latest.status === "active") {
      // improving = latest level lower than earliest of this episode
      const first = sorted[0];
      const order = { none: 0, mild: 1, moderate: 2, serious: 3 };
      let trend = "steady";
      if (order[latest.level] < order[first.level]) trend = "improving";
      else if (order[latest.level] > order[first.level]) trend = "worsening";
      const daysActive = Math.max(1, Math.round((Date.now() - first.ts) / 864e5));
      const recurring = sorted.length >= 3 && daysActive >= 14;
      active.push({ location: loc, latest, first, trend, daysActive, count: sorted.length, recurring });
    }
  });
  return { active, history: painLogs.slice(-30).reverse() };
}

// training advice for today's pain state — combines location + level
function painAdvice(painLevel, painLocations) {
  const out = { tone: "good", lines: [], avoidGroups: [], seekHelp: false };
  if (!painLevel || painLevel === "none") {
    out.lines.push("No pain logged — train normally.");
    return out;
  }
  if (painLevel === "serious") {
    out.tone = "bad";
    out.lines.push("Rest from loading the painful area today.");
    out.lines.push("Sharp, swelling, or pain lasting >2 weeks → see a doctor or physiotherapist.");
    out.seekHelp = true;
  } else if (painLevel === "moderate") {
    out.tone = "warn";
    out.lines.push("Train other muscles, but skip exercises that load the painful area.");
  } else {
    out.tone = "watch";
    out.lines.push("Train cautiously — stop immediately if pain sharpens.");
  }
  // group avoidance from locations
  const locs = Array.isArray(painLocations) && painLocations.length ? painLocations : (painLocations ? [painLocations] : []);
  const avoid = new Set();
  Object.entries(LOADS_PART).forEach(([group, parts]) => {
    if (parts.some((p) => locs.includes(p))) avoid.add(group);
  });
  out.avoidGroups = Array.from(avoid);
  // pull location-specific mods
  const mods = new Set();
  locs.forEach((l) => (PAIN_MODS[l] || []).forEach((m) => mods.add(m)));
  out.lines.push(...Array.from(mods).slice(0, 3));
  return out;
}

// is a given exercise risky for current pain? returns null or {reason}
function exercisePainRisk(exName, painLevel, painLocations) {
  if (!painLevel || painLevel === "none" || !painLocations?.length) return null;
  const meta = findEx(exName); if (!meta) return null;
  const groups = [meta.group, ...(meta.sec || [])];
  const risky = groups.some((g) => (LOADS_PART[g] || []).some((p) => painLocations.includes(p)));
  if (!risky) return null;
  if (painLevel === "serious") return { tone: "bad", text: "Skip this — loads a painful area." };
  if (painLevel === "moderate") return { tone: "warn", text: "Loads a painful area — choose an alternative." };
  return { tone: "watch", text: "May aggravate the painful area — stay in pain-free range." };
}

/* ---------------- mind & habits engine -------------- */
// default habits. `auto` = derive completion from existing tracked data; otherwise manual toggle.
/* ---- Habits V2 engine ---- */
const HABIT_CATEGORIES = [
  { id: "health",       label: "Health" },
  { id: "training",     label: "Training" },
  { id: "nutrition",    label: "Nutrition" },
  { id: "sleep",        label: "Sleep" },
  { id: "mind",         label: "Mind" },
  { id: "productivity", label: "Productivity" },
  { id: "custom",       label: "Custom" },
];
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysLabel(days) {
  if (!days || !days.length) return "Custom";
  if (days.length === 7) return "Daily";
  const s = [...days].sort((a, b) => a - b);
  if (JSON.stringify(s) === "[1,2,3,4,5]") return "Weekdays";
  if (JSON.stringify(s) === "[0,6]") return "Weekends";
  if (JSON.stringify(s) === "[1,3,5]") return "Mon/Wed/Fri";
  if (JSON.stringify(s) === "[2,4]") return "Tue/Thu";
  return s.map((d) => DAY_NAMES_SHORT[d]).join(", ");
}

// Monday-of-week as period key for all weekly frequency types
function habitWeekKey(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toLocaleDateString("en-CA") + "-W";
}

function habitPeriodKey(frequencyType, dateStr) {
  if (!frequencyType || frequencyType === "daily") return dateStr;
  if (frequencyType === "monthly") return dateStr.slice(0, 7);
  return habitWeekKey(dateStr); // weekly_x, specific_days, weekly
}

function getHabitStatus(habit, completions, today) {
  const ft = habit.frequencyType || "daily";
  const pk = habitPeriodKey(ft, today);
  const dow = new Date(today + "T12:00:00").getDay();
  const periodComps = (completions || []).filter((c) => c.habitId === habit.id && c.periodKey === pk);
  const todayComps  = (completions || []).filter((c) => c.habitId === habit.id && c.sprigDate === today);
  switch (ft) {
    case "daily":
      return { isDue: true, isComplete: todayComps.length >= 1, progress: todayComps.length, target: 1, periodKey: pk, freqLabel: "Daily" };
    case "weekly_x": {
      const target = habit.weeklyTarget || 3;
      return { isDue: periodComps.length < target, isComplete: periodComps.length >= target, progress: periodComps.length, target, periodKey: pk, freqLabel: `${target}× / week` };
    }
    case "specific_days": {
      const days = habit.specificDays || [];
      return { isDue: days.includes(dow), isComplete: todayComps.length >= 1, progress: todayComps.length, target: 1, periodKey: pk, freqLabel: daysLabel(days) };
    }
    case "weekly":
      return { isDue: periodComps.length < 1, isComplete: periodComps.length >= 1, progress: periodComps.length, target: 1, periodKey: pk, freqLabel: "Weekly" };
    case "monthly":
      return { isDue: periodComps.length < 1, isComplete: periodComps.length >= 1, progress: periodComps.length, target: 1, periodKey: pk, freqLabel: "Monthly" };
    default:
      return { isDue: true, isComplete: todayComps.length >= 1, progress: todayComps.length, target: 1, periodKey: pk, freqLabel: "Daily" };
  }
}

function computeHabitStreak(habit, completions, today) {
  const ft = habit.frequencyType || "daily";
  if (ft === "daily") {
    let streak = 0;
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - i);
      const ds = d.toLocaleDateString("en-CA");
      const done = (completions || []).some((c) => c.habitId === habit.id && c.sprigDate === ds);
      if (done) streak++; else if (i > 0) break;
    }
    return streak;
  }
  let streak = 0;
  const currentPk = habitPeriodKey(ft, today);
  for (let i = 1; i <= 52; i++) {
    const d = new Date(today + "T12:00:00");
    if (ft === "monthly") d.setMonth(d.getMonth() - i); else d.setDate(d.getDate() - i * 7);
    const pk = habitPeriodKey(ft, d.toLocaleDateString("en-CA"));
    if (pk === currentPk) continue;
    const comps = (completions || []).filter((c) => c.habitId === habit.id && c.periodKey === pk);
    const target = ft === "weekly_x" ? (habit.weeklyTarget || 3) : 1;
    if (comps.length >= target) streak++; else break;
  }
  return streak;
}

function computeHabitConsistencyV2(habits2, completions, today) {
  const active = (habits2 || []).filter((h) => !h.archived);
  if (!active.length) return { pct: null, label: "No habits yet", details: [] };
  const details = active.map((habit) => {
    const ft = habit.frequencyType || "daily";
    let hits = 0, total = 0;
    const currentPk = habitPeriodKey(ft, today);
    if (ft === "daily") {
      for (let i = 1; i <= 14; i++) {
        const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - i);
        const ds = d.toLocaleDateString("en-CA");
        total++;
        if ((completions || []).some((c) => c.habitId === habit.id && c.sprigDate === ds)) hits++;
      }
    } else if (ft === "weekly_x" || ft === "specific_days" || ft === "weekly") {
      for (let w = 1; w <= 4; w++) {
        const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - w * 7);
        const pk = habitPeriodKey(ft, d.toLocaleDateString("en-CA"));
        if (pk === currentPk) continue;
        total++;
        const comps = (completions || []).filter((c) => c.habitId === habit.id && c.periodKey === pk);
        const target = ft === "weekly_x" ? (habit.weeklyTarget || 3) : 1;
        if (comps.length >= target) hits++;
      }
    } else if (ft === "monthly") {
      for (let m = 1; m <= 4; m++) {
        const d = new Date(today + "T12:00:00"); d.setMonth(d.getMonth() - m);
        const pk = d.toLocaleDateString("en-CA").slice(0, 7);
        if (pk === currentPk) continue;
        total++;
        if ((completions || []).some((c) => c.habitId === habit.id && c.periodKey === pk)) hits++;
      }
    }
    const rate = total > 0 ? hits / total : null;
    return { habit, hits, total, rate };
  });
  const scored = details.filter((d) => d.rate !== null);
  const pct = scored.length ? Math.round(scored.reduce((a, d) => a + d.rate, 0) / scored.length * 100) : null;
  const label = pct === null ? "Building…" : pct >= 90 ? "Excellent" : pct >= 75 ? "Strong" : pct >= 50 ? "Building" : "Needs attention";
  return { pct, label, details };
}

function migrateHabitsV1toV2(habitConfig, habitDone) {
  const habits2 = [];
  const nonAuto = [
    { id: "sleep_time", label: "Sleep on time", category: "sleep" },
    { id: "stretch",    label: "Stretching",    category: "training" },
    { id: "study",      label: "Studying",      category: "mind" },
    { id: "reading",    label: "Reading",       category: "mind" },
  ];
  const hidden = new Set(habitConfig?.hidden || []);
  nonAuto.forEach((d) => {
    if (!hidden.has(d.id)) habits2.push({ id: d.id, name: d.label, category: d.category, frequencyType: "daily", weeklyTarget: null, specificDays: null, reminderEnabled: false, reminderTime: null, createdAt: Date.now(), archived: false, autoHabit: false, notes: "" });
  });
  (habitConfig?.custom || []).forEach((c) => {
    habits2.push({ id: c.id, name: c.label || c.name || "Habit", category: "custom", frequencyType: "daily", weeklyTarget: null, specificDays: null, reminderEnabled: false, reminderTime: null, createdAt: Date.now(), archived: false, autoHabit: false, notes: "" });
  });
  const completions = [];
  const seen = new Set();
  Object.entries(habitDone || {}).forEach(([dateStr, ids]) => {
    (ids || []).forEach((id) => {
      if (!habits2.find((h) => h.id === id)) return;
      const cid = id + "_" + dateStr; if (seen.has(cid)) return; seen.add(cid);
      completions.push({ id: "m_" + Math.random().toString(36).slice(2, 10), habitId: id, completedAt: new Date(dateStr + "T12:00:00").getTime(), sprigDate: dateStr, periodKey: dateStr, notes: "" });
    });
  });
  return { habits2, completions };
}

const DEFAULT_HABITS = [
  { id: "water",      label: "Water",        auto: true,  icon: "water" },
  { id: "protein",    label: "Protein",      auto: true,  icon: "protein" },
  { id: "steps",      label: "Steps",        auto: true,  icon: "steps" },
  { id: "gym",        label: "Gym",          auto: true,  icon: "gym" },
  { id: "supps",      label: "Supplements",  auto: true,  icon: "supp" },
  { id: "sleep_time", label: "Sleep on time",auto: false, icon: "sleep" },
  { id: "stretch",    label: "Stretching",   auto: false, icon: "stretch" },
  { id: "study",      label: "Studying",     auto: false, icon: "study" },
  { id: "reading",    label: "Reading",      auto: false, icon: "read" },
];

// did an auto habit complete on a given day's data?
function habitAutoDone(id, ctx) {
  const { t, targets, daily, waterGoalMl, trainedToday, supps, takenIds } = ctx;
  switch (id) {
    case "water":   return (daily.water || 0) >= waterGoalMl * 0.9;
    case "protein": return targets.protein ? t.protein >= targets.protein * 0.9 : false;
    case "steps":   return (daily.steps || 0) >= STEPS_TARGET * 0.9;
    case "gym":     return !!trainedToday;
    case "supps":   return supps?.length ? supps.every((s) => takenIds?.includes(s.id)) : false;
    default: return false;
  }
}

// assemble the active habit list (defaults minus hidden, plus custom)
function activeHabits(habitConfig) {
  const hidden = new Set(habitConfig?.hidden || []);
  const base = DEFAULT_HABITS.filter((h) => !hidden.has(h.id));
  const custom = (habitConfig?.custom || []).map((c) => ({ ...c, auto: false, icon: "custom" }));
  return [...base, ...custom];
}

// today's completion state for each habit
function habitsToday(habits, ctx, habitDone, date) {
  const manual = new Set(habitDone[date] || []);
  return habits.map((h) => ({
    ...h,
    done: h.auto ? habitAutoDone(h.id, ctx) : manual.has(h.id),
  }));
}

// weekly consistency: % of (habits × days) completed, plus best & weakest
// For past days we only reliably know protein & gym (from history); other auto-habits
// are only scored for *today*, so they aren't counted against past days they can't be verified.
function habitConsistency(habits, ctxByDate, habitDone, dates, today) {
  const VERIFIABLE_PAST = new Set(["protein", "gym"]); // derivable from stored history
  const perHabit = {};
  habits.forEach((h) => (perHabit[h.id] = { label: h.label, hits: 0, total: 0 }));
  let totalHits = 0, totalCells = 0;
  dates.forEach((d) => {
    const manual = new Set(habitDone[d] || []);
    const isToday = d === today;
    habits.forEach((h) => {
      // skip auto habits on past days we can't verify (avoids false "missed")
      if (h.auto && !isToday && !VERIFIABLE_PAST.has(h.id)) return;
      perHabit[h.id].total++; totalCells++;
      let done = false;
      if (h.auto) { const ctx = ctxByDate[d]; done = ctx ? habitAutoDone(h.id, ctx) : false; }
      else done = manual.has(h.id);
      if (done) { perHabit[h.id].hits++; totalHits++; }
    });
  });
  const pct = totalCells ? Math.round((totalHits / totalCells) * 100) : 0;
  // rank by completion rate (hits/total) so habits with fewer scoreable days compare fairly
  const ranked = Object.values(perHabit).filter((h) => h.total > 0)
    .sort((a, b) => (b.hits / b.total) - (a.hits / a.total) || b.hits - a.hits);
  const best = ranked.length && ranked[0].hits > 0 ? ranked[0] : null;
  const weakest = ranked.length ? ranked[ranked.length - 1] : null;
  return { pct, best, weakest, perHabit };
}

const FOCUS_PRESETS = [25, 50, 90];

/* ---------------- sleep + energy engine -------------- */
const DAYMIN = 1440;
const tsToMin = (ts) => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
const hmToMin = (s) => { const [h, m] = String(s).split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const minToHM = (m) => { m = ((Math.round(m) % DAYMIN) + DAYMIN) % DAYMIN; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
function minToLabel(m) {
  m = ((Math.round(m) % DAYMIN) + DAYMIN) % DAYMIN;
  let h = Math.floor(m / 60); const mm = m % 60; const ap = h < 12 ? "AM" : "PM";
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}:${String(mm).padStart(2, "0")} ${ap}`;
}
// 24h "HH:MM" for <input type="time"> values
function minToHm(m) {
  m = ((Math.round(m) % DAYMIN) + DAYMIN) % DAYMIN;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
const durLabel = (mins) => `${Math.floor(Math.abs(mins) / 60)}h ${String(Math.round(Math.abs(mins) % 60)).padStart(2, "0")}m`;

function sleepNeedMin(age) {
  if (!age) return 480;
  if (age <= 13) return 570; if (age <= 17) return 525; if (age <= 25) return 480; if (age <= 64) return 465; return 450;
}
function circMean(mins) {
  if (!mins.length) return null;
  let x = 0, y = 0;
  mins.forEach((m) => { const a = (m / DAYMIN) * 2 * Math.PI; x += Math.cos(a); y += Math.sin(a); });
  let ang = Math.atan2(y, x); if (ang < 0) ang += 2 * Math.PI;
  return Math.round((ang / (2 * Math.PI)) * DAYMIN);
}
const circDiff = (a, b) => { const d = Math.abs(a - b) % DAYMIN; return Math.min(d, DAYMIN - d); };
function inWindow(t, start, end) { // wrap-aware
  t = (t + DAYMIN) % DAYMIN; start = (start + DAYMIN) % DAYMIN; end = (end + DAYMIN) % DAYMIN;
  return start <= end ? (t >= start && t <= end) : (t >= start || t <= end);
}

function estimateStages(durationMin, restlessness = 30) {
  const r = Math.min(100, Math.max(0, restlessness));
  const deepPct = Math.max(0.08, 0.21 - r / 600);
  const remPct = Math.max(0.10, 0.23 - r / 900);
  const deep = Math.round(durationMin * deepPct);
  const rem = Math.round(durationMin * remPct);
  const light = Math.max(0, durationMin - deep - rem);
  return { deep, rem, light };
}
function scoreSleep({ durationMin, restlessness = 30, bedMin }, needMin, usualBedMin) {
  const ratio = durationMin / needMin;
  const durScore = ratio >= 1 ? Math.max(70, 100 - Math.max(0, durationMin - needMin - 45) / 6) : ratio * 100;
  const restScore = 100 - Math.min(65, restlessness);
  let consist = 90;
  if (usualBedMin != null) consist = 100 - Math.min(160, circDiff(bedMin, usualBedMin)) / 2;
  return Math.round(Math.max(0, Math.min(100, durScore * 0.5 + restScore * 0.3 + consist * 0.2)));
}
function sleepDebtMin(logs, needMin) {
  // Weighted, decaying sleep-debt model — debt is NOT a permanent unpaid balance.
  // Recent nights matter most, old shortfalls fade, and nights at/above need pay debt down.
  // Process the last 14 valid nights oldest → newest as a running balance:
  //   • each new night, the prior balance decays (older debt fades ~15%/night)
  //   • a short night adds its shortage; a long night subtracts its surplus (pays debt down)
  // Ignore accidental/short/explicitly-ignored sessions so a mis-start can't create debt.
  const recent = (logs || [])
    .filter((l) => !l.ignoredFromScore && !l.discarded && (l.durationMin || 0) >= 20 && !l.nap)
    .slice(-14);
  if (recent.length === 0) return 0;
  const DECAY = 0.8;          // each night, ~20% of accumulated debt fades
  const PAYDOWN = 1.2;        // surplus sleep pays debt down a bit faster than shortage builds it
  const ONTARGET_PAY = 20;    // a night that simply meets need still chips ~20 min off old debt
  let bal = 0;
  recent.forEach((l) => {
    bal *= DECAY;                                   // yesterday's debt fades
    const delta = needMin - (l.durationMin || 0);   // >0 short, <0 surplus
    if (delta > 0) bal += delta;                    // short night adds shortage
    else if (delta < 0) bal += delta * PAYDOWN;      // good night actively pays down (surplus)
    else bal -= ONTARGET_PAY;                         // exactly on target still helps recovery
    if (bal < 0) bal = 0;                            // can't bank negative debt
  });
  return Math.max(0, Math.min(40 * 60, Math.round(bal)));
}
// Friendly label + tone for a sleep-debt amount in minutes.
function sleepDebtLabel(debtMin) {
  if (debtMin < 30) return { label: "Recovered", tone: "success" };
  if (debtMin < 90) return { label: "Mild debt", tone: "neutral" };
  if (debtMin < 180) return { label: "Moderate debt", tone: "warning" };
  return { label: "High debt", tone: "danger" };
}

// Decide whether to nudge an end-of-day quick log. Fires only when ALL hold:
//   • it's within ~90 min before (or just past) the recommended bedtime
//   • the user hasn't logged anything for a few hours (stale)
//   • their most important daily goals aren't met yet
// We never reduce the health score for not logging — this is a gentle prompt, nothing more.
function bedtimeReminder({ nowTs, recBedMin, lastLogTs, t, targets, daily, waterGoalMl, trainedToday }) {
  if (recBedMin == null) return null;
  const nowMin = tsToMin(nowTs);
  // circular minutes-until-bed (handle wrap past midnight); treat the window as 90 min before bed
  let toBed = (recBedMin - nowMin + 1440) % 1440;
  if (toBed > 720) toBed -= 1440; // allow "just past bedtime" (negative up to -12h)
  const nearBed = toBed <= 90 && toBed >= -90;
  if (!nearBed) return null;

  // stale: nothing logged in 4h+ (lastLogTs is the most recent of any log we track)
  const hoursSinceLog = lastLogTs ? (nowTs - lastLogTs) / 3600000 : 99;
  const stale = hoursSinceLog >= 4;
  if (!stale) return null;

  // key goals — the few that matter most for a daily picture
  const missing = [];
  if ((t?.calories || 0) < (targets?.calories || 0) * 0.6) missing.push("food");
  if ((daily?.water || 0) < (waterGoalMl || 2500) * 0.6) missing.push("water");
  if (!daily?.checkin || !daily.checkin.mood) missing.push("check-in");
  if ((daily?.steps || 0) === 0 && !trainedToday && (daily?.cardioMin || 0) === 0) missing.push("movement");
  if (missing.length < 2) return null; // most things already logged → no need to nudge

  return { missing: missing.slice(0, 3), nearBed: true };
}
function recommend(logs, profile, debtMin) {
  const need = sleepNeedMin(profile.age);
  const recent = logs.slice(-7);
  const wakeMins = recent.map((l) => tsToMin(l.waketime));
  const bedMins = recent.map((l) => tsToMin(l.bedtime));
  const recWake = circMean(wakeMins) ?? 420;
  const usualBed = circMean(bedMins) ?? (recWake - need + DAYMIN) % DAYMIN;
  const payDown = Math.min(90, debtMin * 0.4);
  const recBed = (recWake - need - payDown + DAYMIN) % DAYMIN;
  const blueCutoff = (recBed - 90 - Math.min(45, debtMin / 3) + DAYMIN) % DAYMIN;
  // caffeine cutoff: 8h before recommended bedtime; pull earlier if debt is high
  const caffeineCutoff = (recBed - 480 - Math.min(60, debtMin / 6) + DAYMIN) % DAYMIN;
  return { need, recWake, recBed, blueCutoff, caffeineCutoff, usualBed, payDown };
}

// figure out WHY a sleep score is what it is + one fix for tonight
function sleepScoreBreakdown(log, need, rec, logs) {
  if (!log) return null;
  const debtMins = need - log.durationMin;                       // minutes short of need
  const restlessness = log.restlessness ?? 30;
  // consistency: distance from usual bedtime over last 7 nights
  const others = (logs || []).slice(0, -1).slice(-7);
  const usualBed = others.length ? circMean(others.map((l) => tsToMin(l.bedtime))) : null;
  const bedJitter = usualBed != null ? circDiff(tsToMin(log.bedtime), usualBed) : 0;
  const reasons = [];
  if (debtMins > 30) reasons.push({ key: "short", weight: debtMins / 60, text: `slept ${durLabel(debtMins)} less than your need` });
  if (restlessness > 45) reasons.push({ key: "restless", weight: (restlessness - 30) / 25, text: `restless sleep (${restlessness}% movement)` });
  if (bedJitter > 45) reasons.push({ key: "inconsistent", weight: bedJitter / 45, text: `bedtime drifted by ${bedJitter} min from your usual` });
  if (log.stages?.deep < log.durationMin * 0.13) reasons.push({ key: "shallow", weight: 0.5, text: "deep sleep ran low" });
  reasons.sort((a, b) => b.weight - a.weight);
  const top = reasons[0];
  // one practical fix for tonight
  let fix = null;
  if (top?.key === "short" || top?.key === "shallow") {
    const earlier = Math.min(60, Math.max(15, Math.round(debtMins / 5) * 5));
    fix = `Bed ${earlier} min earlier tonight (${minToLabel(rec.recBed)}).`;
  } else if (top?.key === "restless") {
    fix = "Cool, dark room. No caffeine after the cutoff, no alcohol tonight.";
  } else if (top?.key === "inconsistent") {
    fix = `Lock bedtime at ${minToLabel(rec.recBed)} for a few nights — your rhythm will stabilize.`;
  } else if (log.score < 90) {
    fix = `Keep wake time steady at ${minToLabel(rec.recWake)} — consistency lifts every score.`;
  }
  return { mainReason: top?.text || null, fix };
}

// alcohol units → impact descriptions (units = ~standard drinks: beer, 150ml wine, 30ml spirit)
const ALCOHOL_LEVELS = {
  none:     { units: 0, label: "None",     color: "#6BAE78", recoveryHit: 0,  next: "No impact." },
  light:    { units: 1, label: "Light",    color: "#D9A23C", recoveryHit: 8,  next: "Mild effect: ~5–10% less deep sleep, slightly lower HRV." },
  moderate: { units: 3, label: "Moderate", color: "#E0714A", recoveryHit: 18, next: "Real impact: fragmented sleep, blunted muscle protein synthesis, lower readiness tomorrow." },
  heavy:    { units: 5, label: "Heavy",    color: "#C0392B", recoveryHit: 30, next: "Big impact: deep sleep drops ~30%, recovery and lifts will suffer for 24–48h." },
};
function alcoholLevel(units) {
  if (!units || units <= 0) return "none";
  if (units < 2) return "light";
  if (units < 4) return "moderate";
  return "heavy";
}
function alcoholImpact(units) {
  return ALCOHOL_LEVELS[alcoholLevel(units)];
}

// unified recovery recommendation: train hard / normal / light / rest
function recoveryRecommendation({ lastSleep, debtMin, daily, sleepReadiness, painLevel }) {
  const ci = daily?.checkin || {};
  const pain = painLevel || ci.pain;
  if (ci.sick === "yes") return { level: "rest", text: "Rest today — sick day. Hydrate and protein up." };
  if (pain === "serious") return { level: "rest", text: "Rest from loading the painful area. Light cardio is fine." };
  const score = lastSleep?.score ?? 70;
  const alcoholHit = alcoholImpact(daily?.alcohol || 0).recoveryHit;
  const painHit = pain === "moderate" ? 15 : pain === "mild" ? 5 : 0;
  // adjusted readiness blends sleep score, sleep debt, alcohol, and pain
  const adj = score - debtMin / 30 - alcoholHit - painHit;
  if (pain === "moderate" && adj >= 55) return { level: "light", text: "Train light — work around the painful area; lower load, higher reps." };
  if (adj >= 75) return { level: "hard",   text: "Train hard — sleep, debt, and recovery all in the green." };
  if (adj >= 55) return { level: "normal", text: pain === "mild" ? "Train normal — stay in pain-free range." : "Train normal — leave 1–2 reps in reserve." };
  if (adj >= 35) return { level: "light",  text: "Light session — sub-failure work, technique, lower volume." };
  return { level: "rest", text: "Rest or active recovery — walk, mobility, no hard sets today." };
}

// figure out WHY a sleep score is what it is + one fix for tonight (helper end)
const gauss = (x, mu, sig) => Math.exp(-((x - mu) ** 2) / (2 * sig * sig));
function energyCurve({ wakeMin, bedMin, debtMin, meals }) {
  const pts = []; const debtH = debtMin / 60;
  const end = bedMin > wakeMin ? bedMin : bedMin + DAYMIN;
  for (let t = wakeMin; t <= end; t += 15) {
    const h = (((t % DAYMIN) + DAYMIN) % DAYMIN) / 60;
    const awake = (t - wakeMin) / 60;
    let e = 52;
    e += gauss(h, 10.5, 2.3) * 28;
    e -= gauss(h, 15, 2.1) * 20;
    e += gauss(h, 18.3, 2.2) * 16;
    e -= Math.max(0, h - 21) * 5;
    e -= awake * 1.1;
    if (awake < 1) e -= (1 - awake) * 30;           // sleep inertia / grogginess
    e -= debtH * 2.2;
    e -= gauss(h, 15, 2.1) * debtH * 1.6;            // debt deepens afternoon crash
    (meals || []).forEach((m) => {
      const dt = (t - m.min) / 60; if (dt < -0.2 || dt > 3.5) return;
      const carbsN = Math.min(1.6, (m.carbs || 0) / 55);
      const sizeN = Math.min(1.6, (m.cal || 0) / 650);
      e += gauss(dt, 0.4, 0.28) * 10 * carbsN;        // glucose lift
      e -= gauss(dt, 1.5, 0.7) * 15 * (carbsN * 0.6 + sizeN * 0.6); // postprandial dip
    });
    pts.push({ min: t, e: Math.max(3, Math.min(100, Math.round(e))) });
  }
  return pts;
}
function bestGymWindow(curve, meals, wakeMin, bedMin) {
  const winLen = 90; let best = null;
  const lo = wakeMin + 120, hi = (bedMin > wakeMin ? bedMin : bedMin + DAYMIN) - 150;
  for (let s = lo; s + winLen <= hi; s += 15) {
    const seg = curve.filter((p) => p.min >= s && p.min <= s + winLen);
    if (!seg.length) continue;
    const avg = seg.reduce((a, p) => a + p.e, 0) / seg.length;
    const h = (((s + winLen / 2) % DAYMIN) + DAYMIN) % DAYMIN / 60;
    let sc = avg + gauss(h, 17, 2.6) * 10;            // late-afternoon performance peak
    (meals || []).forEach((m) => {
      const gap = (s - m.min) / 60;
      if (gap > 1 && gap < 3.5) sc += Math.min(9, (m.carbs || 0) / 11); // fueled
      if (gap > -0.4 && gap < 1) sc -= 9;             // mid-digestion, avoid
    });
    if (!best || sc > best.sc) best = { start: s, end: s + winLen, sc, avg: Math.round(avg) };
  }
  return best;
}
function smartWake(bedTs, latestWakeMin, windowMin) {
  const bedMin = tsToMin(bedTs);
  const start = (latestWakeMin - windowMin + DAYMIN) % DAYMIN;
  let best = null, bestN = 0;
  for (let n = 3; n <= 7; n++) {
    const wk = (bedMin + 15 + n * 90) % DAYMIN;
    if (inWindow(wk, start, latestWakeMin)) { best = wk; bestN = n; }
  }
  return { wakeMin: best != null ? best : latestWakeMin, cycles: best != null ? bestN : null };
}

/* ---------------- training engine -------------- */
const MUSCLES = [
  ["chest", "Chest"], ["back", "Back"], ["traps", "Traps"], ["shoulders", "Shoulders"],
  ["biceps", "Biceps"], ["triceps", "Triceps"], ["forearms", "Forearms"], ["abs", "Abs"],
  ["lower_back", "Lower back"], ["glutes", "Glutes"], ["quads", "Quads"],
  ["hamstrings", "Hamstrings"], ["calves", "Calves"],
];
const RECOVER_BASE = { chest: 54, back: 60, traps: 40, shoulders: 44, biceps: 40, triceps: 42, forearms: 30, abs: 30, lower_back: 60, glutes: 60, quads: 64, hamstrings: 60, calves: 36 };

const EXERCISES = [
  // ---------- CHEST ----------
  { name: "Barbell Bench Press", group: "chest", sec: ["triceps", "shoulders"], type: "compound", bar: true, lift: "bench", cue: "Lower to mid-chest, elbows ~45°. Full stretch at the bottom, drive up — no bouncing." },
  { name: "Barbell Wide-Grip Bench Press", group: "chest", sec: ["shoulders"], type: "compound", bar: true, cue: "Slightly wider grip biases the chest; control the stretch, don't flare elbows past 75°." },
  { name: "Barbell Incline Bench Press", group: "chest", sec: ["shoulders", "triceps"], type: "compound", bar: true, cue: "30–45° bench, bar to upper chest, full stretch then press up and slightly back." },
  { name: "Barbell Decline Bench Press", group: "chest", sec: ["triceps"], type: "compound", bar: true, cue: "Lower-chest focus; touch low on the chest, full lockout at the top." },
  { name: "Dumbbell Bench Press", group: "chest", sec: ["triceps", "shoulders"], type: "compound", bar: false, cue: "Let the dumbbells sink for a deep stretch, press to a slight arc over the chest." },
  { name: "Incline Dumbbell Press", group: "chest", sec: ["shoulders", "triceps"], type: "compound", bar: false, cue: "Let the dumbbells sink for a deep chest stretch, press up to a slight inward arc." },
  { name: "Decline Dumbbell Press", group: "chest", sec: ["triceps"], type: "compound", bar: false, cue: "Deep stretch at the bottom, squeeze the lower chest at the top." },
  { name: "Machine Chest Press", group: "chest", sec: ["triceps", "shoulders"], type: "compound", bar: false, cue: "Full stretch back, press to a strong contraction — great for pushing close to failure safely." },
  { name: "Machine Incline Press", group: "chest", sec: ["shoulders"], type: "compound", bar: false, cue: "Upper-chest angle; let the handles travel back for a full stretch each rep." },
  { name: "Smith Machine Bench Press", group: "chest", sec: ["triceps", "shoulders"], type: "compound", bar: false, cue: "Fixed bar path lets you push hard; still control the stretch at the bottom." },
  { name: "Smith Machine Incline Press", group: "chest", sec: ["shoulders"], type: "compound", bar: false, cue: "Upper chest with a stable path; touch high on the chest, full lockout." },
  { name: "Pec Deck Fly", group: "chest", sec: [], type: "accessory", bar: false, cue: "Open wide for a deep chest stretch, squeeze hands together, slow return." },
  { name: "Machine Fly", group: "chest", sec: [], type: "accessory", bar: false, cue: "Big stretch at the back, hard squeeze in front, keep a slight elbow bend." },
  { name: "Cable Crossover", group: "chest", sec: [], type: "accessory", bar: false, cue: "Let arms travel back for a full stretch, cross slightly at the front, control it." },
  { name: "Cable Low-to-High Fly", group: "chest", sec: [], type: "accessory", bar: false, cue: "Drive from low to high to hit the upper chest, squeeze at the top." },
  { name: "Cable High-to-Low Fly", group: "chest", sec: [], type: "accessory", bar: false, cue: "Pull from high to low for the lower chest, full stretch each rep." },
  { name: "Dumbbell Fly", group: "chest", sec: [], type: "accessory", bar: false, cue: "Wide arc with a deep stretch, slight elbow bend, squeeze at the top." },
  { name: "Incline Dumbbell Fly", group: "chest", sec: [], type: "accessory", bar: false, cue: "Stretch the upper chest wide, bring the dumbbells together over the collarbone." },
  { name: "Dumbbell Pullover", group: "chest", sec: ["back"], type: "accessory", bar: false, cue: "Deep stretch overhead, pull the dumbbell over with the chest, big range." },
  { name: "Push-Up", group: "chest", sec: ["triceps", "shoulders"], type: "accessory", bar: false, cue: "Chest to the floor (full ROM), full lockout, squeeze at the top." },
  { name: "Incline Push-Up", group: "chest", sec: ["triceps"], type: "accessory", bar: false, cue: "Hands elevated, full range, controlled — easier scaling of the push-up." },
  { name: "Decline Push-Up", group: "chest", sec: ["shoulders", "triceps"], type: "accessory", bar: false, cue: "Feet elevated for upper-chest emphasis; chest to floor each rep." },
  { name: "Chest Dip", group: "chest", sec: ["triceps", "shoulders"], type: "compound", bar: false, cue: "Lean forward, sink for a deep chest stretch, press to lockout." },
  { name: "Weighted Chest Dip", group: "chest", sec: ["triceps"], type: "compound", bar: false, cue: "Add load once bodyweight is easy; control the deep stretch, don't bottom out painfully." },

  // ---------- BACK ----------
  { name: "Deadlift", group: "back", sec: ["glutes", "hamstrings", "lower_back"], type: "compound", bar: true, lift: "deadlift", cue: "Brace hard, push the floor away, neutral spine top to bottom." },
  { name: "Barbell Row", group: "back", sec: ["biceps", "traps"], type: "compound", bar: true, lift: "row", cue: "Hinge ~45°, pull to the lower ribs, full stretch at the bottom, squeeze the lats." },
  { name: "Pendlay Row", group: "back", sec: ["traps", "biceps"], type: "compound", bar: true, lift: "row", cue: "Bar from the floor each rep, explosive pull to the ribs, strict torso." },
  { name: "T-Bar Row", group: "back", sec: ["biceps", "traps"], type: "compound", bar: false, cue: "Chest up, pull the handle to your stomach, full stretch at the bottom." },
  { name: "Seated Cable Row", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Let the weight stretch the lats forward, pull to the navel, squeeze." },
  { name: "Seated Cable Row Close-Grip", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Neutral grip, drive elbows back and down, big stretch each rep." },
  { name: "Machine Row", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Chest on the pad, pull the elbows back, full stretch on the return." },
  { name: "Chest-Supported Row", group: "back", sec: ["biceps", "traps"], type: "compound", bar: false, cue: "Pad takes the lower back out; pure rowing — full stretch, hard squeeze." },
  { name: "Dumbbell One-Arm Row", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Long stretch at the bottom, drive the elbow to the hip, don't twist." },
  { name: "Meadows Row", group: "back", sec: ["biceps", "traps"], type: "compound", bar: false, cue: "Landmine bar, stagger stance, big stretch and a powerful one-arm pull." },
  { name: "Inverted Row", group: "back", sec: ["biceps"], type: "accessory", bar: false, cue: "Body straight, pull the chest to the bar, full arm extension at the bottom." },
  { name: "Lat Pulldown", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Full stretch overhead, pull elbows down to your sides, control the negative." },
  { name: "Wide-Grip Lat Pulldown", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Wide grip, lead with the elbows, pull to the upper chest for lat width." },
  { name: "Close-Grip Lat Pulldown", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Neutral close grip, full overhead stretch, drive elbows to the ribs." },
  { name: "Reverse-Grip Lat Pulldown", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Underhand grip hits lower lats and biceps; pull to the chest, squeeze." },
  { name: "Pull-Up", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Dead hang at the bottom for full ROM, chin over the bar at the top." },
  { name: "Chin-Up", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Underhand grip, full hang, pull the chest to the bar — heavy biceps involvement." },
  { name: "Weighted Pull-Up", group: "back", sec: ["biceps"], type: "compound", bar: false, cue: "Add a belt once bodyweight is easy; full dead hang, controlled negative." },
  { name: "Straight-Arm Pulldown", group: "back", sec: [], type: "accessory", bar: false, cue: "Arms long, sweep the bar down with the lats, big overhead stretch." },
  { name: "Rack Pull", group: "back", sec: ["traps", "lower_back"], type: "compound", bar: true, cue: "Pins below the knee; overload the top half, drive hips through, squeeze." },

  // ---------- LOWER BACK ----------
  { name: "Back Extension", group: "lower_back", sec: ["glutes", "hamstrings"], type: "accessory", bar: false, cue: "Round and extend through the full range, squeeze glutes at the top, no hyperextending." },
  { name: "Good Morning", group: "hamstrings", sec: ["lower_back", "glutes"], type: "compound", bar: true, lift: "deadlift", cue: "Soft knees, hinge the hips back for a deep hamstring stretch, flat back." },
  { name: "Hyperextension", group: "lower_back", sec: ["glutes"], type: "accessory", bar: false, cue: "Controlled bend and extend, squeeze at the top — don't crank into hyperextension." },
  { name: "Superman", group: "lower_back", sec: ["glutes"], type: "accessory", bar: false, cue: "Lift chest and legs together, brief squeeze, slow lower." },

  // ---------- SHOULDERS ----------
  { name: "Overhead Press", group: "shoulders", sec: ["triceps"], type: "compound", bar: true, lift: "ohp", cue: "Press to a full overhead lockout, ribs down, glutes tight." },
  { name: "Seated Barbell Shoulder Press", group: "shoulders", sec: ["triceps"], type: "compound", bar: true, lift: "ohp", cue: "Back supported, press to full lockout, lower to the chin line." },
  { name: "Dumbbell Shoulder Press", group: "shoulders", sec: ["triceps"], type: "compound", bar: false, cue: "Lower to ear level for a full stretch, press straight up and slightly in." },
  { name: "Seated Dumbbell Shoulder Press", group: "shoulders", sec: ["triceps"], type: "compound", bar: false, cue: "Supported torso, deep stretch at the bottom, full lockout overhead." },
  { name: "Arnold Press", group: "shoulders", sec: ["triceps"], type: "compound", bar: false, cue: "Rotate from palms-in to palms-out as you press — hits all three delt heads." },
  { name: "Machine Shoulder Press", group: "shoulders", sec: ["triceps"], type: "compound", bar: false, cue: "Stable path lets you push hard; full stretch at the bottom, lockout up top." },
  { name: "Push Press", group: "shoulders", sec: ["triceps", "quads"], type: "compound", bar: true, lift: "ohp", cue: "Small leg dip drives the bar up; use it to overload the lockout." },
  { name: "Landmine Press", group: "shoulders", sec: ["triceps", "chest"], type: "compound", bar: false, cue: "Press the bar up and forward on an arc, shoulder-friendly, full extension." },
  { name: "Dumbbell Lateral Raise", group: "shoulders", sec: [], type: "accessory", bar: false, cue: "Lead with the elbows to shoulder height, slow controlled lower." },
  { name: "Lateral Raise", group: "shoulders", sec: [], type: "accessory", bar: false, cue: "Lead with the elbows to shoulder height, slow controlled lower." },
  { name: "Cable Lateral Raise", group: "shoulders", sec: [], type: "accessory", bar: false, cue: "Constant tension across the range; raise to shoulder height, resist the lower." },
  { name: "Machine Lateral Raise", group: "shoulders", sec: [], type: "accessory", bar: false, cue: "Pads on the forearms, drive elbows up and out, controlled negative." },
  { name: "Dumbbell Front Raise", group: "shoulders", sec: [], type: "accessory", bar: false, cue: "Raise to eye level, no swinging, lower under control." },
  { name: "Cable Front Raise", group: "shoulders", sec: [], type: "accessory", bar: false, cue: "Constant tension; raise to shoulder height, slow return." },
  { name: "Face Pull", group: "shoulders", sec: ["traps"], type: "accessory", bar: false, cue: "Pull to the face and rotate out — great for rear delts and shoulder health." },
  { name: "Reverse Pec Deck", group: "shoulders", sec: [], type: "accessory", bar: false, cue: "Squeeze the rear delts back, slight elbow bend, control the return." },
  { name: "Dumbbell Reverse Fly", group: "shoulders", sec: [], type: "accessory", bar: false, cue: "Hinge over, raise the dumbbells wide, squeeze the rear delts, no momentum." },
  { name: "Cable Rear Delt Fly", group: "shoulders", sec: [], type: "accessory", bar: false, cue: "Cross cables, pull wide and back, constant tension on the rear delts." },
  { name: "Barbell Upright Row", group: "shoulders", sec: ["traps"], type: "compound", bar: true, cue: "Pull to mid-chest, elbows lead and stay high, don't shrug excessively." },
  { name: "Dumbbell Upright Row", group: "shoulders", sec: ["traps"], type: "accessory", bar: false, cue: "Elbows lead up and out to chest height, control the lower." },

  // ---------- TRAPS ----------
  { name: "Barbell Shrug", group: "traps", sec: [], type: "accessory", bar: true, cue: "Shrug straight up, pause at the top, full range down." },
  { name: "Dumbbell Shrug", group: "traps", sec: [], type: "accessory", bar: false, cue: "Shrug up and slightly back, hold the squeeze, full stretch down." },
  { name: "Smith Machine Shrug", group: "traps", sec: [], type: "accessory", bar: false, cue: "Stable path, heavy shrugs straight up, pause at the top." },
  { name: "Cable Shrug", group: "traps", sec: [], type: "accessory", bar: false, cue: "Constant tension; shrug straight up, slow controlled lower." },
  { name: "Farmer's Walk", group: "traps", sec: ["forearms", "abs"], type: "compound", bar: false, cue: "Heavy carry, tall posture, braced core — builds traps, grip and stability." },

  // ---------- BICEPS ----------
  { name: "Barbell Curl", group: "biceps", sec: ["forearms"], type: "accessory", bar: true, lift: "curl", cue: "Full extension at the bottom, no swinging, hard squeeze up top." },
  { name: "EZ-Bar Curl", group: "biceps", sec: ["forearms"], type: "accessory", bar: false, lift: "curl", cue: "Angled grip is wrist-friendly; full stretch at the bottom, strict curl." },
  { name: "Dumbbell Curl", group: "biceps", sec: ["forearms"], type: "accessory", bar: false, cue: "Full extension, supinate as you curl, squeeze hard at the top." },
  { name: "Alternating Dumbbell Curl", group: "biceps", sec: ["forearms"], type: "accessory", bar: false, cue: "One arm at a time, full range, no body swing." },
  { name: "Cable Curl", group: "biceps", sec: [], type: "accessory", bar: false, cue: "Constant tension through the whole range; full stretch, hard squeeze." },
  { name: "Incline Dumbbell Curl", group: "biceps", sec: [], type: "accessory", bar: false, cue: "Arms behind the body for a deep biceps stretch — that stretch drives growth." },
  { name: "Cable Bayesian Curl", group: "biceps", sec: [], type: "accessory", bar: false, cue: "Cable behind you, arm stretched back; curl with a huge stretch under tension." },
  { name: "Preacher Curl", group: "biceps", sec: [], type: "accessory", bar: false, cue: "Arms locked on the pad, full extension at the bottom — don't bounce out of the stretch." },
  { name: "Spider Curl", group: "biceps", sec: [], type: "accessory", bar: false, cue: "Chest on incline, arms hanging, strict curls with constant tension." },
  { name: "Concentration Curl", group: "biceps", sec: [], type: "accessory", bar: false, cue: "Elbow braced on the thigh, slow strict curl, peak squeeze." },
  { name: "Hammer Curl", group: "biceps", sec: ["forearms"], type: "accessory", bar: false, cue: "Neutral grip, full range, hits the brachialis and forearm." },
  { name: "Cable Hammer Curl", group: "biceps", sec: ["forearms"], type: "accessory", bar: false, cue: "Rope, neutral grip, constant tension, full extension each rep." },
  { name: "Drag Curl", group: "biceps", sec: [], type: "accessory", bar: false, cue: "Drag the bar up the body, elbows back — keeps tension on the biceps peak." },

  // ---------- TRICEPS ----------
  { name: "Close-Grip Bench Press", group: "triceps", sec: ["chest", "shoulders"], type: "compound", bar: true, lift: "bench", cue: "Shoulder-width grip, elbows tucked, full lockout — heavy triceps builder." },
  { name: "Triceps Pushdown", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Elbows pinned, full lockout, control on the way back up." },
  { name: "Rope Pushdown", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Spread the rope at the bottom for a hard contraction, elbows fixed." },
  { name: "V-Bar Pushdown", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Elbows locked at the sides, full extension, slow return." },
  { name: "Reverse-Grip Pushdown", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Underhand grip biases the medial head; full lockout, controlled." },
  { name: "Overhead Rope Extension", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Arms overhead for a deep long-head stretch, extend fully, slow back." },
  { name: "Dumbbell Overhead Extension", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Lower behind the head for a full stretch, extend to lockout." },
  { name: "EZ-Bar Overhead Extension", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Deep stretch behind the head, full extension — great for the long head." },
  { name: "Skullcrusher", group: "triceps", sec: [], type: "accessory", bar: true, cue: "Lower behind the head for a full triceps stretch, extend to lockout." },
  { name: "Dumbbell Skullcrusher", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Neutral grip is elbow-friendly; deep stretch, full extension." },
  { name: "Dip", group: "triceps", sec: ["chest", "shoulders"], type: "compound", bar: false, cue: "Stay upright for triceps focus, sink to a comfortable stretch, full lockout." },
  { name: "Weighted Dip", group: "triceps", sec: ["chest"], type: "compound", bar: false, cue: "Add load when bodyweight is easy; upright torso, controlled depth, lockout." },
  { name: "Bench Dip", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Hands on the bench, dip to 90°, press to lockout — don't go too deep on the shoulders." },
  { name: "Diamond Push-Up", group: "triceps", sec: ["chest"], type: "accessory", bar: false, cue: "Hands together under the chest, full range, elbows close to the body." },
  { name: "Machine Triceps Extension", group: "triceps", sec: [], type: "accessory", bar: false, cue: "Fixed path; full extension and a controlled stretch back, push near failure." },

  // ---------- FOREARMS ----------
  { name: "Wrist Curl", group: "forearms", sec: [], type: "accessory", bar: true, cue: "Full flexion and extension through the wrist, slow and controlled." },
  { name: "Dumbbell Wrist Curl", group: "forearms", sec: [], type: "accessory", bar: false, cue: "Let the dumbbell roll to the fingertips, curl up fully, slow lower." },
  { name: "Reverse Wrist Curl", group: "forearms", sec: [], type: "accessory", bar: false, cue: "Palms down, lift the back of the hand, full controlled range — light weight." },
  { name: "Reverse Barbell Curl", group: "forearms", sec: ["biceps"], type: "accessory", bar: true, cue: "Overhand grip, full curl — hammers the brachialis and forearm extensors." },
  { name: "Wrist Roller", group: "forearms", sec: [], type: "accessory", bar: false, cue: "Roll the weight up and down with the wrists, slow and controlled both ways." },
  { name: "Dead Hang", group: "forearms", sec: [], type: "accessory", bar: false, cue: "Hang from the bar, shoulders active, build grip endurance — time under tension." },
  { name: "Plate Pinch", group: "forearms", sec: [], type: "accessory", bar: false, cue: "Pinch plates together and hold; brutal grip work — track the hold time." },

  // ---------- ABS ----------
  { name: "Plank", group: "abs", sec: ["lower_back"], type: "accessory", bar: false, cue: "Neutral spine, brace the abs, don't let the hips sag." },
  { name: "Hanging Leg Raise", group: "abs", sec: [], type: "accessory", bar: false, cue: "Raise with control through a full range, no swinging." },
  { name: "Hanging Knee Raise", group: "abs", sec: [], type: "accessory", bar: false, cue: "Curl the knees up toward the chest, control the lower, no swing." },
  { name: "Cable Crunch", group: "abs", sec: [], type: "accessory", bar: false, cue: "Crunch the ribs toward the hips with the abs, not the arms; full contraction." },
  { name: "Crunch", group: "abs", sec: [], type: "accessory", bar: false, cue: "Curl the spine, squeeze the abs, slow lower — don't yank the neck." },
  { name: "Decline Sit-Up", group: "abs", sec: [], type: "accessory", bar: false, cue: "Full range on the decline, control the descent, add load to progress." },
  { name: "Reverse Crunch", group: "abs", sec: [], type: "accessory", bar: false, cue: "Curl the hips off the floor toward the ribs, control the lower — lower-ab focus." },
  { name: "Russian Twist", group: "abs", sec: [], type: "accessory", bar: false, cue: "Rotate fully side to side, brace the core, controlled tempo." },
  { name: "Cable Woodchopper", group: "abs", sec: [], type: "accessory", bar: false, cue: "Rotate through the torso high-to-low, brace hard, control the return." },
  { name: "Bicycle Crunch", group: "abs", sec: [], type: "accessory", bar: false, cue: "Opposite elbow to knee, full rotation, slow and deliberate." },
  { name: "Ab Wheel Rollout", group: "abs", sec: ["lower_back"], type: "accessory", bar: false, cue: "Brace hard, roll out as far as you can keep a flat back, pull back with the abs." },
  { name: "Side Plank", group: "abs", sec: [], type: "accessory", bar: false, cue: "Stack the hips, brace the obliques, hold a straight line — track the time." },
  { name: "Hollow Body Hold", group: "abs", sec: [], type: "accessory", bar: false, cue: "Lower back pressed down, arms and legs extended, hold the brace." },
  { name: "Pallof Press", group: "abs", sec: [], type: "accessory", bar: false, cue: "Anti-rotation: press the handle straight out and resist the twist, slow." },

  // ---------- QUADS ----------
  { name: "Barbell Squat", group: "quads", sec: ["glutes", "hamstrings"], type: "compound", bar: true, lift: "squat", cue: "Sit to at least parallel for full range. Brace, drive through mid-foot." },
  { name: "High-Bar Squat", group: "quads", sec: ["glutes"], type: "compound", bar: true, lift: "squat", cue: "Bar high on the traps, upright torso, deep knee bend for quad focus." },
  { name: "Low-Bar Squat", group: "quads", sec: ["glutes", "hamstrings"], type: "compound", bar: true, lift: "squat", cue: "Bar lower on the rear delts, more hip drive, hit at least parallel." },
  { name: "Front Squat", group: "quads", sec: ["glutes"], type: "compound", bar: true, lift: "squat", cue: "Elbows high, upright torso, sit straight down — heavy quad emphasis." },
  { name: "Goblet Squat", group: "quads", sec: ["glutes"], type: "compound", bar: false, cue: "Hold a dumbbell at the chest, sit deep between the knees, stay tall." },
  { name: "Hack Squat", group: "quads", sec: ["glutes"], type: "compound", bar: false, cue: "Deep knee bend on the sled, full range, don't let the heels lift." },
  { name: "Smith Machine Squat", group: "quads", sec: ["glutes"], type: "compound", bar: false, cue: "Feet slightly forward, sit deep, controlled — stable path for quad focus." },
  { name: "Leg Press", group: "quads", sec: ["glutes"], type: "compound", bar: false, cue: "Lower until knees near chest for a full stretch — don't let the lower back round." },
  { name: "Leg Extension", group: "quads", sec: [], type: "accessory", bar: false, cue: "Full extension with a hard quad squeeze, slow controlled lower." },
  { name: "Bulgarian Split Squat", group: "quads", sec: ["glutes"], type: "compound", bar: false, cue: "Rear foot elevated, drop straight down for a deep stretch, drive through the front heel." },
  { name: "Walking Lunge", group: "quads", sec: ["glutes"], type: "compound", bar: false, cue: "Long steps, knee tracks the toes, full depth each stride." },
  { name: "Reverse Lunge", group: "quads", sec: ["glutes"], type: "compound", bar: false, cue: "Step back and drop the knee, drive through the front heel — knee-friendly." },
  { name: "Dumbbell Lunge", group: "quads", sec: ["glutes"], type: "compound", bar: false, cue: "Dumbbells at the sides, controlled lunge to depth, push back up tall." },
  { name: "Step-Up", group: "quads", sec: ["glutes"], type: "compound", bar: false, cue: "Drive through the top foot, full extension, control the way down." },
  { name: "Sissy Squat", group: "quads", sec: [], type: "accessory", bar: false, cue: "Lean back on the knees for a deep quad stretch — advanced, control it." },

  // ---------- HAMSTRINGS ----------
  { name: "Romanian Deadlift", group: "hamstrings", sec: ["glutes", "lower_back"], type: "compound", bar: true, lift: "deadlift", cue: "Push hips back, feel the hamstring stretch, bar stays close to the legs." },
  { name: "Dumbbell Romanian Deadlift", group: "hamstrings", sec: ["glutes"], type: "compound", bar: false, cue: "Hinge the hips back, dumbbells close, deep hamstring stretch, squeeze up." },
  { name: "Stiff-Leg Deadlift", group: "hamstrings", sec: ["glutes", "lower_back"], type: "compound", bar: true, lift: "deadlift", cue: "Minimal knee bend, hinge for max hamstring stretch, flat back." },
  { name: "Single-Leg Romanian Deadlift", group: "hamstrings", sec: ["glutes"], type: "accessory", bar: false, cue: "Balance on one leg, hinge with a flat back, deep stretch, drive up." },
  { name: "Leg Curl", group: "hamstrings", sec: [], type: "accessory", bar: false, cue: "Full stretch at the start, curl all the way, slow eccentric." },
  { name: "Seated Leg Curl", group: "hamstrings", sec: [], type: "accessory", bar: false, cue: "Hips fixed, curl fully under the seat, control the stretch — strong hamstring builder." },
  { name: "Lying Leg Curl", group: "hamstrings", sec: [], type: "accessory", bar: false, cue: "Curl the heels to the glutes, full squeeze, slow controlled return." },
  { name: "Nordic Hamstring Curl", group: "hamstrings", sec: [], type: "accessory", bar: false, cue: "Lower slowly under control as far as possible, brutal eccentric — anchor the feet." },
  { name: "Glute-Ham Raise", group: "hamstrings", sec: ["glutes"], type: "accessory", bar: false, cue: "Lower under control, pull yourself back up with the hamstrings, full range." },

  // ---------- GLUTES ----------
  { name: "Hip Thrust", group: "glutes", sec: ["hamstrings"], type: "compound", bar: true, cue: "Full hip extension at the top, ribs down, squeeze the glutes hard." },
  { name: "Dumbbell Hip Thrust", group: "glutes", sec: ["hamstrings"], type: "accessory", bar: false, cue: "Dumbbell on the hips, drive to full extension, hold the squeeze." },
  { name: "Glute Bridge", group: "glutes", sec: ["hamstrings"], type: "accessory", bar: false, cue: "Press through the heels to full hip extension, squeeze hard at the top." },
  { name: "Cable Glute Kickback", group: "glutes", sec: [], type: "accessory", bar: false, cue: "Drive the leg back with the glute, full extension, no lower-back arch." },
  { name: "Machine Hip Abduction", group: "glutes", sec: [], type: "accessory", bar: false, cue: "Push the knees out against the pads, squeeze the glute medius, slow return." },
  { name: "Cable Pull-Through", group: "glutes", sec: ["hamstrings"], type: "accessory", bar: false, cue: "Hinge back through the legs, then snap the hips forward — glute-driven, not lower back." },
  { name: "Sumo Deadlift", group: "glutes", sec: ["hamstrings", "back", "quads"], type: "compound", bar: true, lift: "deadlift", cue: "Wide stance, grip inside the knees, push the floor away with the hips." },
  { name: "Kettlebell Swing", group: "glutes", sec: ["hamstrings"], type: "compound", bar: false, cue: "Hip-hinge snap, not a squat; explosive glute drive, float to chest height." },

  // ---------- CALVES ----------
  { name: "Calf Raise", group: "calves", sec: [], type: "accessory", bar: false, cue: "Drop the heel for a deep stretch, rise onto the ball of the foot, pause at the top." },
  { name: "Standing Calf Raise", group: "calves", sec: [], type: "accessory", bar: false, cue: "Full stretch at the bottom, rise to a high contraction, pause each rep." },
  { name: "Seated Calf Raise", group: "calves", sec: [], type: "accessory", bar: false, cue: "Bent knee targets the soleus; deep stretch, slow full-range reps." },
  { name: "Leg Press Calf Raise", group: "calves", sec: [], type: "accessory", bar: false, cue: "Push through the balls of the feet, full stretch and squeeze on the sled." },
  { name: "Donkey Calf Raise", group: "calves", sec: [], type: "accessory", bar: false, cue: "Hinged hips put the calves on a deep stretch; full range, pause at the top." },
  { name: "Tibialis Raise", group: "calves", sec: [], type: "accessory", bar: false, cue: "Pull the toes up toward the shins, full range — balances the lower leg." },

  // ---------- OLYMPIC / FULL BODY ----------
  { name: "Power Clean", group: "back", sec: ["traps", "quads", "glutes", "shoulders"], type: "compound", bar: true, cue: "Explosive triple extension, pull under the bar, catch on the shoulders — technique first." },
  { name: "Clean and Jerk", group: "quads", sec: ["shoulders", "back", "glutes"], type: "compound", bar: true, cue: "Clean to the shoulders, dip and drive overhead — heavy on skill, start light." },
  { name: "Snatch", group: "back", sec: ["shoulders", "quads", "glutes"], type: "compound", bar: true, cue: "One explosive pull from floor to overhead — the most technical lift, coach it." },
  { name: "Thruster", group: "quads", sec: ["shoulders", "glutes", "triceps"], type: "compound", bar: true, cue: "Front squat into an overhead press in one motion, drive with the legs." },
  { name: "Overhead Squat", group: "quads", sec: ["shoulders", "glutes"], type: "compound", bar: true, cue: "Bar locked overhead, squat deep with an upright torso — demands mobility." },
  { name: "Sled Push", group: "quads", sec: ["glutes", "calves"], type: "compound", bar: false, cue: "Low body angle, powerful strides, drive the sled — great conditioning." },
  { name: "Burpee", group: "abs", sec: ["chest", "quads"], type: "accessory", bar: false, cue: "Chest to floor, explode up to a jump — full-body conditioning." },
  { name: "Turkish Get-Up", group: "abs", sec: ["shoulders", "glutes"], type: "compound", bar: false, cue: "Weight locked overhead, move slowly through each step — control beats speed." },
  { name: "Muscle-Up", group: "back", sec: ["chest", "triceps", "biceps"], type: "compound", bar: false, cue: "Explosive pull, transition over the bar, press out — advanced bodyweight skill." },
];
const findEx = (name) => EXERCISES.find((e) => e.name === name);
const restDefault = (ex) => (ex?.type === "compound" ? 180 : 75);
const est1RM = (w, reps) => (reps <= 0 ? 0 : w * (1 + reps / 30));
const bestSetOf = (sets) => sets.reduce((b, s) => (est1RM(s.w, s.reps) > est1RM(b.w, b.reps) ? s : b), sets[0]);

function weeklyVolume(workouts) {
  const since = Date.now() - 7 * 864e5;
  const vol = {}; const direct = {}; const indirect = {};
  MUSCLES.forEach(([k]) => { vol[k] = 0; direct[k] = 0; indirect[k] = 0; });
  workouts.filter((w) => w.ts >= since).forEach((w) => {
    w.exercises.forEach((ex) => {
      const meta = findEx(ex.name); const n = ex.sets.length;
      const prim = ex.group || meta?.group;
      if (prim) { vol[prim] = (vol[prim] || 0) + n; direct[prim] = (direct[prim] || 0) + n; }
      (meta?.sec || []).forEach((s) => { vol[s] = (vol[s] || 0) + n * 0.5; indirect[s] = (indirect[s] || 0) + n * 0.5; });
    });
  });
  Object.keys(vol).forEach((k) => { vol[k] = Math.round(vol[k] * 10) / 10; direct[k] = Math.round(direct[k] * 10) / 10; indirect[k] = Math.round(indirect[k] * 10) / 10; });
  vol.direct = direct; vol.indirect = indirect;
  return vol;
}
function muscleRecovery(workouts, readiness) {
  const out = {};
  const factor = readiness >= 75 ? 0.85 : readiness >= 55 ? 1 : readiness >= 35 ? 1.15 : 1.3;
  MUSCLES.forEach(([k]) => {
    let lastTs = 0, setCount = 0;
    workouts.forEach((w) => {
      let c = 0;
      w.exercises.forEach((ex) => {
        const meta = findEx(ex.name); const prim = ex.group || meta?.group;
        if (prim === k) c += ex.sets.length;
        if ((meta?.sec || []).includes(k)) c += ex.sets.length * 0.5;
      });
      if (c > 0 && w.ts > lastTs) { lastTs = w.ts; setCount = c; }
    });
    if (!lastTs) { out[k] = { recovered: true, remaining: 0, fatigue: 0, lastTs: null, setCount: 0, full: RECOVER_BASE[k] }; return; }
    const full = (RECOVER_BASE[k] + Math.min(40, setCount * 4)) * factor;
    const since = (Date.now() - lastTs) / 36e5;
    const remaining = Math.max(0, full - since);
    out[k] = { recovered: remaining <= 0, remaining: Math.round(remaining), fatigue: Math.round(Math.min(100, (remaining / full) * 100)), lastTs, setCount: Math.round(setCount), full: Math.round(full) };
  });
  return out;
}
// strength standards (male ratio = est1RM / bodyweight) at [beginner, novice, intermediate, advanced, elite]
const STD = {
  bench: [0.5, 0.75, 1.0, 1.5, 2.0], squat: [0.75, 1.25, 1.5, 2.25, 2.75],
  deadlift: [1.0, 1.5, 2.0, 2.5, 3.0], ohp: [0.35, 0.55, 0.7, 0.95, 1.2],
  row: [0.5, 0.75, 1.0, 1.4, 1.75], curl: [0.2, 0.35, 0.5, 0.7, 0.95],
};
const STD_PCT = [10, 30, 55, 85, 97];
const sexFactor = (sex) => (sex === "female" ? 0.74 : 1);
const avgBW = (sex) => (sex === "female" ? 65 : 80);
const MUSCLE_LIFT = { chest: "bench", quads: "squat", hamstrings: "deadlift", glutes: "deadlift", back: "row", shoulders: "ohp", biceps: "curl" };
const MUSCLE_LIFT_FB = { triceps: "bench", traps: "deadlift", forearms: "row", abs: "squat", calves: "squat", lower_back: "deadlift" };
const TIERS = [
  { name: "Bronze", min: 0, color: "#B0763D" }, { name: "Silver", min: 25, color: "#98A2AD" },
  { name: "Gold", min: 50, color: "#D9A23C" }, { name: "Champion", min: 75, color: "#7A6FB0" },
  { name: "Elite", min: 93, color: "#E0714A" },
];
const tierFor = (pct) => [...TIERS].reverse().find((tt) => pct >= tt.min) || TIERS[0];
function pctFromAnchors(val, a) {
  if (val <= a[0]) return Math.max(1, (val / a[0]) * STD_PCT[0]);
  for (let i = 0; i < a.length - 1; i++) {
    if (val <= a[i + 1]) { const f = (val - a[i]) / (a[i + 1] - a[i]); return STD_PCT[i] + f * (STD_PCT[i + 1] - STD_PCT[i]); }
  }
  return Math.min(99.9, STD_PCT[STD_PCT.length - 1] + (val / a[a.length - 1] - 1) * 30);
}
function bestE1RMForLift(workouts, liftKey) {
  let best = 0;
  workouts.forEach((w) => w.exercises.forEach((ex) => {
    if (findEx(ex.name)?.lift === liftKey) ex.sets.forEach((s) => (best = Math.max(best, est1RM(s.w, s.reps))));
  }));
  return best;
}

// Resolve an exercise's primary muscle group — works for DB exercises, custom names, and
// logged exercises (which store their own `group`). Used so strength grades aren't limited
// to the handful of `.lift`-tagged barbell lifts.
function getMuscleGroupForExercise(ex) {
  if (!ex) return null;
  // 1) exact match in the exercise DB
  const meta = findEx(ex.name);
  if (meta?.group) return meta.group;
  // 2) keyword inference from the name (covers custom / misspelled names)
  const n = (ex.name || "").toLowerCase();
  const KW = [
    ["back",       /(\brow\b|pulldown|pull-?up|chin-?up|\blat\b|pullover|deadlift|pull ?down)/],
    ["chest",      /(bench|chest|\bpec\b|\bfly\b|\bdip\b|push-?up)/],
    ["shoulders",  /(shoulder|\bohp\b|overhead press|lateral raise|\bdelt|arnold|upright row|face pull)/],
    ["triceps",    /(triceps|pushdown|push-?down|skull|overhead extension|kickback|close-?grip bench)/],
    ["biceps",     /(curl|biceps)/],
    ["quads",      /(squat|leg press|hack|leg extension|lunge|split squat|step-?up)/],
    ["hamstrings", /(rdl|romanian|leg curl|hamstring|good ?morning|nordic)/],
    ["glutes",     /(glute|hip thrust|hip bridge)/],
    ["calves",     /(calf|calves)/],
    ["traps",      /(shrug|\btrap)/],
    ["abs",        /(\babs?\b|crunch|plank|leg raise|sit-?up|rollout)/],
    ["forearms",   /(wrist|forearm|\bgrip\b)/],
  ];
  for (const [g, re] of KW) if (re.test(n)) return g;
  // 3) fall back to the group stored on the logged exercise
  return ex.group || null;
}

// Best e1RM for a muscle: prefer the accurate `.lift`-tagged barbell lift; if the user only
// logged machine/accessory work for that muscle, fall back to the best compound for the group.
function bestE1RMForMuscle(workouts, muscleKey, liftKey) {
  let tagged = 0, fallback = 0;
  (workouts || []).forEach((w) => (w.exercises || []).forEach((ex) => {
    const meta = findEx(ex.name);
    const grp = getMuscleGroupForExercise(ex);
    (ex.sets || []).forEach((s) => {
      const e = est1RM(s.w, s.reps);
      if (!e) return;
      if (liftKey && meta?.lift === liftKey) tagged = Math.max(tagged, e);
      else if (grp === muscleKey) fallback = Math.max(fallback, e); // any logged exercise for this muscle
    });
  }));
  return { tagged, fallback };
}

function ranking(workouts, profile, mode) { // mode: 'relative' | 'absolute'
  const bw = profile.weight || 80, sf = sexFactor(profile.sex), abw = avgBW(profile.sex);
  const out = {};
  MUSCLES.forEach(([k]) => {
    const liftKey = MUSCLE_LIFT[k] || MUSCLE_LIFT_FB[k];
    if (!liftKey) { out[k] = { hasData: false, liftKey: null }; return; }
    const { tagged, fallback } = bestE1RMForMuscle(workouts, k, liftKey);
    // Prefer the accurate tagged barbell lift; otherwise estimate from group-matched compounds.
    let e1 = tagged, estimated = false;
    if (!e1 && fallback) {
      // Discount machine/accessory e1RM (~0.78) so they don't over-grade vs barbell standards.
      e1 = fallback * 0.78;
      estimated = true;
    }
    if (!e1) { out[k] = { hasData: false, liftKey }; return; }
    const anchors = STD[liftKey].map((r) => r * sf);
    let pct = Math.max(1, Math.min(99.9, mode === "relative" ? pctFromAnchors(e1 / bw, anchors) : pctFromAnchors(e1 / abw, anchors)));
    // Estimated grades are capped below Elite — we don't want a machine PR to read "Elite".
    if (estimated) pct = Math.min(pct, 90);
    out[k] = { hasData: true, pct: Math.round(pct), tier: tierFor(pct), e1: Math.round(e1), liftKey, estimated };
  });
  return out;
}
function suggestNext(workouts, exName) {
  let last = null, lastTs = 0;
  workouts.forEach((w) => w.exercises.forEach((ex) => { if (ex.name === exName && w.ts > lastTs) { lastTs = w.ts; last = ex; } }));
  if (!last || !last.sets.length) return null;
  const top = bestSetOf(last.sets); const meta = findEx(exName);
  const inc = meta?.type === "compound" ? (meta.bar ? 2.5 : 2) : 1.25;
  const rir = top.rir ?? 2;
  let w = top.w, reps = top.reps, note = "";
  if (rir >= 3) { w += inc; note = `Easy last time — add ${inc}kg and hold ${top.reps} reps.`; }
  else if (rir === 2) { reps = top.reps + 1; note = `Beat last time — aim for ${top.reps + 1} reps at ${top.w}kg.`; }
  else if (rir === 1) { note = `Close to your limit — match ${top.reps} reps. If it moves clean, try one more.`; }
  else { w = Math.round((top.w * 0.95) * 2) / 2; note = `Hit failure last time — drop ~5% and build back. Quality over grinding.`; }
  return { w: Math.round(w * 2) / 2, reps, prevW: top.w, prevReps: top.reps, prevRir: top.rir, note };
}
function exLastBest(workouts, exName) {
  let best = 0, bestSet = null;
  workouts.forEach((w) => w.exercises.forEach((ex) => { if (ex.name === exName) ex.sets.forEach((s) => { const e = est1RM(s.w, s.reps); if (e > best) { best = e; bestSet = s; } }); }));
  return { best, bestSet };
}
// Detect whether a just-logged set is a personal record vs all prior history for that exercise.
// Returns { kind, label, subLabel } for the strongest PR type, or null.
// Priority: e1RM > weight > reps (at same weight) > single-set volume > session volume.
// `activeExSets` = sets already logged THIS session for this exercise (for session-volume PR).
function detectSetPR(workouts, exName, W, R, activeExSets) {
  if (!(W > 0) || !(R > 0)) return null;
  let maxE1 = 0, maxW = 0, maxVol = 0;
  // repsAtW: map weight → max reps seen historically (for per-weight rep PR detection)
  const repsAtW = {};
  // maxSessionVol: highest total volume for this exercise across any prior session
  let maxSessionVol = 0;
  workouts.forEach((wk) => {
    let sessionExVol = 0;
    wk.exercises.forEach((ex) => {
      if (ex.name !== exName) return;
      ex.sets.forEach((s) => {
        const sw = s.w || 0, sr = s.reps || 0;
        maxE1 = Math.max(maxE1, est1RM(sw, sr));
        maxW = Math.max(maxW, sw);
        maxVol = Math.max(maxVol, sw * sr);
        if (sw > 0) repsAtW[sw] = Math.max(repsAtW[sw] || 0, sr);
        sessionExVol += sw * sr;
      });
    });
    maxSessionVol = Math.max(maxSessionVol, sessionExVol);
  });
  if (maxE1 === 0 && maxW === 0) return null; // first ever lift — not a "record"

  const thisE1 = est1RM(W, R);
  const thisVol = W * R;

  // 1. e1RM PR — overall strength record (highest priority)
  if (thisE1 > maxE1 * 1.001) {
    const delta = maxE1 > 0 ? ` ↑ ${Math.round(thisE1 - maxE1)} kg` : "";
    return { kind: "e1rm", label: "New 1RM Record", subLabel: `${Math.round(thisE1)} kg e1RM${delta}` };
  }
  // 2. Weight PR — heaviest ever loaded
  if (W > maxW) {
    const delta = maxW > 0 ? ` (+${+(W - maxW).toFixed(1)} kg)` : "";
    return { kind: "weight", label: "Weight PR", subLabel: `${W} kg × ${R}${delta}` };
  }
  // 3. Rep PR at this exact weight
  const prevRepsAtW = repsAtW[W] || 0;
  if (R > prevRepsAtW) {
    const delta = prevRepsAtW > 0 ? ` (+${R - prevRepsAtW} rep${R - prevRepsAtW > 1 ? "s" : ""})` : "";
    return { kind: "reps", label: "Rep PR", subLabel: `${W} kg × ${R}${delta}` };
  }
  // 4. Single-set volume PR
  if (thisVol > maxVol * 1.001) {
    return { kind: "volume", label: "Set Volume PR", subLabel: `${thisVol} kg · ${W}kg × ${R}` };
  }
  // 5. Session volume PR
  if (activeExSets && activeExSets.length > 0) {
    const prevSetsVol = activeExSets.reduce((acc, s) => acc + (s.w || 0) * (s.reps || 0), 0);
    const newSessionVol = prevSetsVol + thisVol;
    if (newSessionVol > maxSessionVol * 1.001) {
      return { kind: "session-volume", label: "Session Volume PR", subLabel: `${Math.round(newSessionVol)} kg total` };
    }
  }
  return null;
}
// Compute a workout recap on the fly. `priorWorkouts` are the sessions BEFORE this one
// (used to detect records/overloads). Works for old workouts with no stored recap.
function recapFor(workout, priorWorkouts) {
  const exercises = workout.exercises || [];
  let totalVolume = 0, totalSets = 0, records = 0;
  const recordLifts = [];
  exercises.forEach((ex) => {
    const priorBest = exLastBest(priorWorkouts, ex.name).best || 0;
    let sessionBestE1 = 0;
    ex.sets.forEach((s) => {
      totalSets += 1;
      totalVolume += (s.w || 0) * (s.reps || 0);
      const e = est1RM(s.w, s.reps);
      if (e > sessionBestE1) sessionBestE1 = e;
    });
    // a record = this session's best e1RM for the exercise beats everything prior
    if (priorBest > 0 && sessionBestE1 > priorBest * 1.001) {
      records += 1;
      recordLifts.push({ name: ex.name, e1RM: Math.round(sessionBestE1), prev: Math.round(priorBest) });
    } else if (priorBest === 0 && sessionBestE1 > 0) {
      // first-ever time doing this exercise — counts as a new e1RM, not an "overload"
      recordLifts.push({ name: ex.name, e1RM: Math.round(sessionBestE1), prev: 0, firstTime: true });
    }
  });
  return {
    totalVolume: Math.round(totalVolume),
    totalSets,
    exercises,
    exerciseCount: exercises.length,
    durationMin: workout.durationMin || 0,
    records,
    recordLifts: recordLifts.slice(0, 6),
  };
}

// ---- WINS ENGINE ---------------------------------------------------------
// Detects meaningful, data-backed wins (not points). Each win has a stable `type`
// used for per-day dedupe so the same achievement is never recorded twice in a day.
function makeWin(type, title, detail, source) {
  return { id: "win_" + Math.random().toString(36).slice(2, 9), type, title, detail, source, createdAt: new Date().toISOString(), kudoed: false };
}
// Merge new wins into a day's existing list, skipping any whose `type` already exists that day.
function mergeWins(existingForDay, candidates) {
  const seen = new Set((existingForDay || []).map((w) => w.type));
  const added = [];
  for (const c of candidates) { if (!seen.has(c.type)) { seen.add(c.type); added.push(c); } }
  return { merged: [...(existingForDay || []), ...added], added };
}
// Daily nutrition/movement wins from the day's snapshot. Pure — returns candidate wins.
function detectDayWins({ t, daily, targets, sleepInfo, profile }) {
  const out = [];
  if (t && targets) {
    if (targets.protein && t.protein >= targets.protein) out.push(makeWin("protein_goal", "Protein goal reached", `${Math.round(t.protein)}g protein logged today.`, "nutrition"));
    if (targets.calories && t.calories > 0 && t.calories >= targets.calories * 0.85 && t.calories <= targets.calories * 1.10) out.push(makeWin("calories_on_target", "Calories on target", "You landed in your calorie range today.", "nutrition"));
    if (targets.fiber && t.fiber >= targets.fiber) out.push(makeWin("fiber_goal", "Fiber goal reached", `${Math.round(t.fiber)}g fiber today.`, "nutrition"));
  }
  if (daily) {
    const waterGoal = (sleepInfo && sleepInfo.waterGoal) || (profile?.weight ? Math.round(profile.weight * 35) : 2500);
    if ((daily.water || 0) >= waterGoal && waterGoal > 0) out.push(makeWin("water_goal", "Hydration goal reached", "You hit your water target today.", "nutrition"));
    const stepGoal = profile?.stepGoal || 8000;
    if ((daily.steps || 0) >= stepGoal) out.push(makeWin("step_goal", "Step goal reached", `${(daily.steps || 0).toLocaleString()} steps today.`, "movement"));
    if ((daily.cardioMin || 0) >= 15) out.push(makeWin("cardio_done", "Cardio completed", `${daily.cardioMin} min of cardio logged.`, "movement"));
    if (daily.checkin && (daily.checkin.mood || daily.checkin.energy || daily.checkin.stress)) out.push(makeWin("checkin_done", "Daily check-in completed", "You checked in with how you feel today.", "mind"));
  }
  return out;
}
// Sleep wins computed when a night is logged.
function detectSleepWins({ log, sleepInfo, profile }) {
  const out = [];
  if (!log) return out;
  const need = (profile?.sleepNeedMin) || 480;
  if ((log.durationMin || 0) >= need) out.push(makeWin("sleep_need", "Sleep target reached", `You slept ${Math.floor(log.durationMin / 60)}h ${log.durationMin % 60}m — at or above your need.`, "sleep"));
  if (sleepInfo && sleepInfo.debtTrend === "down") out.push(makeWin("sleep_debt_down", "Sleep debt reduced", "Your sleep debt is trending down.", "sleep"));
  if ((log.score || 0) >= 80) out.push(makeWin("sleep_quality", "Great night's sleep", `Sleep score ${log.score}.`, "sleep"));
  return out;
}
// Workout wins from a finished workout's recap.
function detectWorkoutWins(recap) {
  const out = [];
  out.push(makeWin("workout_done", "Workout completed", `${recap.exerciseCount} exercises · ${recap.totalSets} sets · ${recap.totalVolume.toLocaleString()} kg.`, "workout"));
  (recap.recordLifts || []).forEach((r) => {
    const slug = r.name.toLowerCase().replace(/\s+/g, "_").slice(0, 24);
    if (r.firstTime) out.push(makeWin("first_" + slug, "New exercise logged", `${r.name}: first e1RM ${r.e1RM} kg.`, "workout"));
    else out.push(makeWin("pr_" + slug, "New best", `${r.name}: e1RM ${r.e1RM} kg (was ${r.prev}).`, "workout"));
  });
  return out;
}

function plateLoad(target, bar = 20) {
  let each = (target - bar) / 2; if (each <= 0) return [];
  const avail = [25, 20, 15, 10, 5, 2.5, 1.25]; const res = [];
  avail.forEach((p) => { while (each >= p - 1e-9) { res.push(p); each = +(each - p).toFixed(3); } });
  return res;
}

// generate ramp-up warm-up sets toward a working weight (compound lifts get more ramp)
function warmupSets(workingWeight, meta, unit = "kg") {
  const w = +workingWeight;
  if (!w || w <= 0) return { sets: [], mobility: [] };
  const minInc = unit === "lb" ? 5 : 2.5;
  const roundTo = (x) => Math.max(minInc, Math.round(x / minInc) * minInc);
  const isCompound = meta?.type === "compound";
  const isBarbell = meta?.bar;
  // bodyweight / very light: no real ramp needed
  if (w < (unit === "lb" ? 40 : 20)) {
    return { sets: [{ w: 0, reps: 10, note: "light/bodyweight warm-up" }], mobility: mobilityFor(meta) };
  }
  // percentages of working weight, fewer reps as we climb
  const scheme = isCompound
    ? [[0.4, 8], [0.6, 5], [0.8, 3], [0.9, 1]]
    : [[0.5, 10], [0.7, 5], [0.85, 3]];
  const bar = isBarbell ? (unit === "lb" ? 45 : 20) : 0;
  const sets = scheme
    .map(([pct, reps]) => ({ w: isBarbell ? Math.max(bar, roundTo(w * pct)) : roundTo(w * pct), reps }))
    // drop dupes / sets at/above working weight
    .filter((s, i, arr) => s.w < w && (i === 0 || s.w !== arr[i - 1].w));
  return { sets, working: w, mobility: mobilityFor(meta) };
}
// quick mobility prep per muscle group
const MOBILITY_PREP = {
  chest:     ["band pull-aparts ×15", "light push-ups ×10"],
  shoulders: ["band pull-aparts ×15", "arm circles ×10 each way"],
  triceps:   ["band pushdowns ×15"],
  back:      ["scap pull-ups ×8", "cat-cow ×8"],
  biceps:    ["light band curls ×15"],
  traps:     ["shrug rolls ×10"],
  quads:     ["bodyweight squats ×10", "leg swings ×10 each"],
  hamstrings:["leg swings ×10 each", "good-mornings (empty bar) ×10"],
  glutes:    ["glute bridges ×12", "monster walks ×10"],
  calves:    ["ankle circles ×10", "calf raises ×15"],
  lower_back:["cat-cow ×8", "bird-dog ×8 each"],
  abs:       ["dead bug ×8 each"],
  forearms:  ["wrist circles ×10"],
};
function mobilityFor(meta) {
  if (!meta) return [];
  return MOBILITY_PREP[meta.group] || [];
}

function recoveryColor(fatigue) {
  // 0 = recovered (green), 50 = amber, 100 = red
  const stops = fatigue <= 50
    ? [[107, 174, 120], [217, 162, 60], fatigue / 50]
    : [[217, 162, 60], [224, 113, 74], (fatigue - 50) / 50];
  const [a, b, f] = stops;
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function liftE1RMSeries(workouts, exName) {
  const out = [];
  workouts.forEach((w) => {
    let best = 0;
    w.exercises.forEach((ex) => { if (ex.name === exName) ex.sets.forEach((s) => (best = Math.max(best, est1RM(s.w, s.reps)))); });
    if (best > 0) out.push({ ts: w.ts, e1: best });
  });
  return out;
}
function stallingLifts(workouts) {
  const stalls = [];
  ["bench", "squat", "deadlift", "ohp", "row"].forEach((lk) => {
    const ex = EXERCISES.find((e) => e.lift === lk);
    if (!ex) return;
    const ser = liftE1RMSeries(workouts, ex.name);
    if (ser.length >= 3) {
      const last3 = ser.slice(-3);
      if (last3[2].e1 <= last3[0].e1 * 1.005) stalls.push(ex.name);
    }
  });
  return stalls;
}
function deloadAdvice(workouts, debtMin, recovery) {
  const stalls = stallingLifts(workouts);
  const fatigued = MUSCLES.filter(([k]) => recovery[k].fatigue > 70).length;
  const reasons = [];
  if (stalls.length >= 2) reasons.push(`${stalls.length} main lifts have stalled`);
  if (debtMin > 300) reasons.push(`high sleep debt (${durLabel(debtMin)})`);
  if (fatigued >= 6) reasons.push("most muscle groups are under-recovered");
  return { suggest: reasons.length >= 2, reasons, stalls };
}
function detectPRs(workouts) {
  // running best e1RM per exercise; a workout sets a PR when it beats prior best
  const best = {}; const prs = [];
  workouts.forEach((w) => {
    w.exercises.forEach((ex) => {
      let top = 0, topSet = null;
      ex.sets.forEach((s) => { const e = est1RM(s.w, s.reps); if (e > top) { top = e; topSet = s; } });
      if (top > (best[ex.name] || 0) + 0.01) {
        const prev = best[ex.name] || 0;
        best[ex.name] = top;
        if (prev > 0) prs.push({ name: ex.name, e1: Math.round(top), w: topSet.w, reps: topSet.reps, ts: w.ts });
      }
    });
  });
  return prs.reverse(); // most recent first
}

/* ---------------- training coach: volume status, split suggestion, progression, templates -------------- */

// hypertrophy targets per muscle (weekly hard sets, lower–upper)
const VOLUME_TARGETS = {
  chest: [10, 20], back: [12, 22], traps: [6, 16], shoulders: [10, 20],
  biceps: [8, 18], triceps: [8, 18], forearms: [4, 12], abs: [6, 16],
  lower_back: [4, 12], glutes: [8, 18], quads: [10, 20], hamstrings: [8, 18], calves: [8, 16],
};
// muscles split by movement family
const PUSH_M = ["chest", "shoulders", "triceps"];
const PULL_M = ["back", "biceps", "traps", "forearms"];
const LEG_M  = ["quads", "hamstrings", "glutes", "calves"];
const UPPER_M = [...PUSH_M, ...PULL_M];

function volumeStatus(setsThisWeek, key) {
  const [lo, hi] = VOLUME_TARGETS[key] || [10, 20];
  if (setsThisWeek === 0) return { tag: "none", lo, hi };
  if (setsThisWeek < lo * 0.6) return { tag: "low", lo, hi };
  if (setsThisWeek < lo) return { tag: "under", lo, hi };
  if (setsThisWeek <= hi) return { tag: "good", lo, hi };
  if (setsThisWeek <= hi * 1.3) return { tag: "high", lo, hi };
  return { tag: "over", lo, hi };
}
const VOL_TAG_LABEL = { none: "untrained · −", low: "low ↓", under: "needs more ↓", good: "good ✓", high: "high ↑", over: "too much ↑↑" };
const VOL_TAG_COLOR = (tag) => tag === "good" ? "#6BAE78" : tag === "high" ? "#D9A23C" : tag === "over" ? "#E0714A" : tag === "none" ? "#A89E89" : "#D9A23C";

// suggest one of: rest, mobility, push, pull, legs, upper, lower, full
function suggestSplit({ workouts, recovery, volume, sleepReadiness, debtMin, daily, trainedToday, routines }) {
  const ci = daily?.checkin || {};
  // hard overrides
  if (ci.sick === "yes") return { type: "rest", label: "Rest day", reason: "You marked yourself sick today." };
  if (ci.pain === "serious") return { type: "rest", label: "Rest day", reason: "Serious pain logged — let it settle." };
  if (trainedToday) return { type: "mobility", label: "Mobility / walk", reason: "You've trained today. A walk and mobility will speed recovery." };
  if (debtMin > 360 || sleepReadiness < 40)
    return { type: "mobility", label: "Mobility / light cardio", reason: `Sleep readiness is low (${sleepReadiness}/100) — easy day today.` };

  // mean fatigue across groups
  const fat = (keys) => keys.reduce((a, k) => a + (recovery[k]?.fatigue || 0), 0) / keys.length;
  const undertrained = (keys) => keys.reduce((a, k) => a + Math.max(0, (VOLUME_TARGETS[k][0] - (volume[k] || 0))), 0);

  // score each option: lower is better. Penalize fatigued muscles in the group; reward groups that are under target.
  // Normalize by group size so a 4-muscle "legs" isn't compared unfairly to an 11-muscle "full body".
  const opts = [
    { type: "push",  label: "Push day",  muscles: PUSH_M },
    { type: "pull",  label: "Pull day",  muscles: PULL_M },
    { type: "legs",  label: "Leg day",   muscles: LEG_M  },
    { type: "upper", label: "Upper",     muscles: UPPER_M },
    { type: "lower", label: "Lower",     muscles: LEG_M  },
    { type: "full",  label: "Full body", muscles: [...UPPER_M, ...LEG_M] },
  ];
  let best = null;
  opts.forEach((o) => {
    const meanFat = fat(o.muscles);                                          // 0-100 avg fatigue across the group
    // per-muscle deficit, capped at the lower target to avoid runaway sums
    const meanDef = o.muscles.reduce((a, k) => {
      const lo = VOLUME_TARGETS[k][0];
      return a + Math.min(lo, Math.max(0, lo - (volume[k] || 0)));
    }, 0) / o.muscles.length;
    // fatigue dominates; deficit is a tiebreaker
    const score = meanFat * 1.5 - meanDef * 1.5;
    if (!best || score < best.score) best = { ...o, score, fat: meanFat, deficit: meanDef };
  });

  // if everything is roughly fatigued, suggest a light upper (least demanding)
  if (best.fat > 70) return { type: "light_upper", label: "Light upper", reason: "Most muscles are still recovering — keep it light." };

  // assemble human reason: name fresh and recovering groups
  const fresh = best.muscles.filter((k) => (recovery[k]?.fatigue || 0) < 35);
  const tired = best.muscles.filter((k) => (recovery[k]?.fatigue || 0) > 60);
  const groupName = (k) => MUSCLES.find(([m]) => m === k)?.[1] || k;
  const reasonParts = [];
  if (fresh.length) reasonParts.push(`${fresh.map(groupName).slice(0, 3).join(", ")} ${fresh.length === 1 ? "is" : "are"} recovered`);
  if (tired.length) reasonParts.push(`${tired.map(groupName).slice(0, 3).join(", ")} still fatigued`);
  if (best.deficit > 4) reasonParts.push("and below target volume");
  const reason = reasonParts.length ? reasonParts.join(", ") + "." : "Best balance of recovered muscles and weekly volume.";

  // try to find a matching saved routine
  const routineMatch = (routines || []).find((r) => {
    const set = new Set(r.exercises.map((n) => findEx(n)?.group).filter(Boolean));
    const target = new Set(best.muscles);
    let overlap = 0; set.forEach((g) => { if (target.has(g)) overlap++; });
    return overlap / Math.max(1, set.size) > 0.6;
  });
  return { ...best, reason, routine: routineMatch || null };
}

// progression decision per exercise
function progressionFor(workouts, exName, daily, sleepReadiness, prefRange, intensityStyle) {
  // gather this exercise's history, most recent session's best set as the reference
  const byTs = {};
  workouts.forEach((w) => w.exercises.forEach((ex) => { if (ex.name === exName) { (byTs[w.ts] = byTs[w.ts] || []).push(...ex.sets); } }));
  const tsKeys = Object.keys(byTs).map(Number).sort((a, b) => a - b);
  if (tsKeys.length === 0) return null;
  const lastSets = byTs[tsKeys[tsKeys.length - 1]];
  // reference = the heaviest/best set of last session for this exercise
  const last = lastSets.reduce((b, s) => (est1RM(s.w, s.reps) > est1RM(b.w, b.reps) ? s : b), lastSets[0]);
  const meta = findEx(exName);
  const bar = !!meta?.bar;
  const compound = meta?.type === "compound";
  const isDumbbell = /dumbbell|db\b/i.test(exName);
  // weight increment by equipment: barbells/cables/machines +2.5kg, dumbbells jump ~2kg/pair, small isolation +1.25
  const inc = isDumbbell ? 2 : (bar || compound) ? 2.5 : 1.25;
  // Rep range: the user's preferred range wins (set on first workout, editable in settings);
  // otherwise fall back to an equipment-appropriate default.
  const validPref = Array.isArray(prefRange) && prefRange.length === 2 && prefRange[0] > 0 && prefRange[1] >= prefRange[0];
  const repRange = validPref ? [prefRange[0], prefRange[1]] : (compound ? [5, 8] : bar ? [6, 10] : [8, 12]);
  const [, repTop] = repRange;
  const stalls = stallingLifts(workouts).includes(exName);
  const prevW = last.w, prevReps = last.reps, prevRir = last.rir;
  const base = { prevW, prevReps, prevRir };

  // ---- caution branches: only when genuinely warranted (kept rare) ----
  if (daily?.deloadMode) return { ...base, action: "deload", w: +(prevW * 0.9).toFixed(1), reps: prevReps, text: "Deload week — drop ~10%, move smooth, own the pattern." };
  if (stalls) return { ...base, action: "deload", w: +(prevW * 0.9).toFixed(1), reps: prevReps, text: "Stalled 3 sessions — reset ~10% this week. You'll blast past your old best on the way back up." };
  if ((daily?.checkin?.pain) === "serious") return { ...base, action: "hold", w: prevW, reps: prevReps, text: `Pain logged — match ${prevW}kg × ${prevReps} and stop early if it flares.` };
  if (sleepReadiness < 40) return { ...base, action: "hold", w: prevW, reps: prevReps, text: `Recovery is low — match ${prevW}kg × ${prevReps}. Push only if it feels great.` };

  // ---- default: beat last time ----
  // Hit/exceeded top of rep range → add weight, reset to bottom.
  if (prevReps >= repTop) {
    return { ...base, action: "add_w", w: +(prevW + inc).toFixed(2), reps: repRange[0], text: `${prevReps} reps last time — load +${inc}kg and go for ${repRange[0]}+.` };
  }
  // RIR-driven progression
  if (prevRir == null) {
    return { ...base, action: "add_rep", w: prevW, reps: prevReps + 1, text: `Push for ${prevReps + 1} reps — beat last time at ${prevW}kg.` };
  }
  if (prevRir >= 3) {
    return { ...base, action: "add_w", w: +(prevW + inc).toFixed(2), reps: prevReps, text: `${prevRir}+ reps in reserve — load +${inc}kg and hold ${prevReps}.` };
  }
  // Intensity-style aware logic
  if (intensityStyle === "leave_reps") {
    if (prevRir >= 2) return { ...base, action: "repeat", w: prevW, reps: prevReps, text: `${prevRir} RIR — hold ${prevW}kg × ${prevReps} and add a rep when it feels right.` };
    return { ...base, action: "repeat", w: prevW, reps: prevReps, text: `Match ${prevW}kg × ${prevReps} — stay in control.` };
  }
  if (intensityStyle === "failure" || intensityStyle === "close_to_failure") {
    if (prevRir === 0) return { ...base, action: "add_rep", w: prevW, reps: prevReps + 1, text: `Went to failure — push for ${prevReps + 1}, or add ${inc}kg if ${prevReps} moves fast.` };
    if (prevRir === 1) return { ...base, action: "add_w", w: +(prevW + inc).toFixed(2), reps: prevReps, text: `1 RIR — add ${inc}kg and drive ${prevReps} reps.` };
    return { ...base, action: "add_rep", w: prevW, reps: prevReps + 1, text: `${prevRir} RIR — push for ${prevReps + 1} today.` };
  }
  // Default balanced behavior
  if (prevRir === 2) {
    return { ...base, action: "add_rep", w: prevW, reps: prevReps + 1, text: `2 in reserve — go for ${prevReps + 1} reps at ${prevW}kg.` };
  }
  if (prevRir === 1) {
    return { ...base, action: "add_rep", w: prevW, reps: prevReps + 1, text: `1 RIR — push for ${prevReps + 1} today.` };
  }
  // prevRir === 0 (failure): match with stretch target
  return { ...base, action: "repeat", w: prevW, reps: prevReps, text: `Went to failure — match ${prevW}kg × ${prevReps}. Sneak a rep if it moves clean.` };
}

// workout templates (seed routines a user can save with one tap)
const TEMPLATES = [
  { id: "fb3", name: "Full Body 3×/wk", desc: "3 short full-body sessions — best for beginners or busy weeks.",
    days: [{ name: "Full A", exercises: ["Barbell Squat", "Barbell Bench Press", "Barbell Row", "Overhead Press", "Plank"] }] },
  { id: "ul4", name: "Upper / Lower 4×/wk", desc: "Two upper days, two lower days — balanced strength + size.",
    days: [
      { name: "Upper", exercises: ["Barbell Bench Press", "Barbell Row", "Overhead Press", "Lat Pulldown", "Dumbbell Curl", "Triceps Pushdown"] },
      { name: "Lower", exercises: ["Barbell Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise", "Plank"] },
    ] },
  { id: "ppl", name: "Push / Pull / Legs", desc: "Classic hypertrophy split — 3 or 6 days a week.",
    days: [
      { name: "Push", exercises: ["Barbell Bench Press", "Incline Dumbbell Press", "Overhead Press", "Lateral Raise", "Triceps Pushdown", "Overhead Rope Extension"] },
      { name: "Pull", exercises: ["Deadlift", "Pull-Up", "Barbell Row", "Lat Pulldown", "Face Pull", "Barbell Curl"] },
      { name: "Legs", exercises: ["Barbell Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise", "Hanging Leg Raise"] },
    ] },
  { id: "ppl_ul", name: "PPL + Upper / Lower", desc: "5-day split for serious lifters — extra upper and lower work.",
    days: [
      { name: "Push", exercises: ["Barbell Bench Press", "Overhead Press", "Incline Dumbbell Press", "Lateral Raise", "Triceps Pushdown"] },
      { name: "Pull", exercises: ["Deadlift", "Pull-Up", "Barbell Row", "Face Pull", "Barbell Curl"] },
      { name: "Legs", exercises: ["Barbell Squat", "Romanian Deadlift", "Leg Press", "Calf Raise"] },
      { name: "Upper", exercises: ["Incline Dumbbell Press", "Lat Pulldown", "Lateral Raise", "Hammer Curl", "Rope Pushdown"] },
      { name: "Lower", exercises: ["Front Squat", "Leg Curl", "Bulgarian Split Squat", "Calf Raise"] },
    ] },
  { id: "athletic", name: "Athletic Hybrid", desc: "Strength + power + conditioning for sport.",
    days: [
      { name: "Power", exercises: ["Power Clean", "Barbell Squat", "Push Press", "Pull-Up", "Plank"] },
      { name: "Upper Strength", exercises: ["Barbell Bench Press", "Barbell Row", "Overhead Press", "Dip"] },
      { name: "Lower Strength", exercises: ["Deadlift", "Bulgarian Split Squat", "Romanian Deadlift", "Calf Raise"] },
    ] },
  { id: "strength", name: "Strength Focus", desc: "Big compounds, lower reps — for raw strength.",
    days: [
      { name: "Squat / Press", exercises: ["Barbell Squat", "Overhead Press", "Romanian Deadlift", "Pull-Up"] },
      { name: "Bench / Deadlift", exercises: ["Barbell Bench Press", "Deadlift", "Barbell Row", "Close-Grip Bench Press"] },
    ] },
  { id: "aesthetic", name: "Aesthetic Upper Focus", desc: "Bigger chest, back, shoulders, arms — the V-taper plan.",
    days: [
      { name: "Chest + Triceps", exercises: ["Barbell Incline Bench Press", "Dumbbell Bench Press", "Cable Crossover", "Overhead Rope Extension", "Rope Pushdown"] },
      { name: "Back + Biceps", exercises: ["Pull-Up", "Barbell Row", "Lat Pulldown", "Incline Dumbbell Curl", "Hammer Curl"] },
      { name: "Shoulders + Arms", exercises: ["Overhead Press", "Lateral Raise", "Cable Lateral Raise", "Barbell Curl", "Skullcrusher", "Face Pull"] },
      { name: "Legs", exercises: ["Barbell Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"] },
    ] },
];

/* ---------------- Daily Health Score + best action -------------- */
const clamp100 = (x) => Math.max(0, Math.min(100, Math.round(x)));
const WATER_TARGET = 2500;   // ml
const STEPS_TARGET = 8000;

// six 0-100 sub-scores from whatever data exists today
function dailyScores({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile }) {
  // nutrition: protein + calorie proximity + fiber — null until the user logs any food today,
  // so an empty log isn't scored as a near-zero (we don't punish "not logged" as "bad").
  const ateToday = (t.calories || 0) > 0 || (t.protein || 0) > 0;
  const protP = targets.protein ? Math.min(1, t.protein / targets.protein) : 0;
  const calRatio = targets.calories ? t.calories / targets.calories : 0;
  const calScore = calRatio === 0 ? 0 : calRatio <= 1 ? 60 + calRatio * 40 : Math.max(50, 100 - (calRatio - 1) * 120);
  const fiberP = targets.fiber ? Math.min(1, t.fiber / targets.fiber) : 0;
  const nutrition = ateToday ? clamp100(protP * 55 + (calScore / 100) * 30 + fiberP * 15) : null;

  // sleep: last night score adjusted for debt; null if no data
  const sleep = sleepInfo.lastSleep
    ? clamp100(sleepInfo.lastSleep.score - sleepInfo.debtMin / 36)
    : null;

  // training/recovery readiness
  const training = clamp100(trainInfo.bodyReadiness);

  // movement: steps + (a workout today counts) — null until there's any movement signal
  const movedToday = (daily.steps || 0) > 0 || trainedToday || (daily.cardioMin || 0) > 0;
  const stepP = Math.min(1, (daily.steps || 0) / STEPS_TARGET);
  const movement = movedToday ? clamp100(stepP * 80 + (trainedToday ? 20 : 0)) : null;

  // mind/mood from check-in (energy, mood, stress); null until any logged
  const ci = daily.checkin || {};
  const moodMap = { bad: 20, okay: 60, good: 100 };
  const energyMap = { low: 25, normal: 65, high: 100 };
  const stressMap = { low: 100, medium: 60, high: 25 };
  const mindParts = [];
  if (ci.mood) mindParts.push(moodMap[ci.mood]);
  if (ci.energy) mindParts.push(energyMap[ci.energy]);
  if (ci.stress) mindParts.push(stressMap[ci.stress]);
  const mind = mindParts.length ? clamp100(mindParts.reduce((a, b) => a + b, 0) / mindParts.length) : null;

  // health habits: water, low alcohol, hydration, not sick
  const waterP = Math.min(1, (daily.water || 0) / waterGoal(profile));
  let habits = 55 + waterP * 35;
  if ((daily.alcohol || 0) > 0) habits -= Math.min(35, daily.alcohol * 12);
  if (ci.sick === "yes") habits -= 30;
  habits = clamp100(habits);

  return { nutrition, sleep, training, movement, mind, habits };
}
function dailyHealthScore(s) {
  // weight only the sub-scores that have data
  const w = { nutrition: 0.25, sleep: 0.22, training: 0.20, movement: 0.13, mind: 0.10, habits: 0.10 };
  let sum = 0, wsum = 0;
  Object.keys(w).forEach((k) => { if (s[k] != null) { sum += s[k] * w[k]; wsum += w[k]; } });
  return wsum ? Math.round(sum / wsum) : 0;
}

// Fair, explainable functional-health score. Missing data is "unknown" (excluded from the
// denominator), never scored as zero. Weighted across available categories, with a confidence
// label and the top reasons it's low. Health markers only count if the user logged them.
function functionalHealth({ subScores, sleepInfo, trainInfo, daily, healthInfo, profile, targets, t, trainedToday }) {
  const ci = (daily && daily.checkin) || {};
  // Category scores — each null when there's no valid data for it.
  const sleep = subScores.sleep;                       // null until a sleep log exists
  // nutrition + hydration combined (only count if the user actually logged food/water today)
  const ateToday = (t?.calories || 0) > 0;
  const drankToday = (daily?.water || 0) > 0;
  let nutHydParts = [], nutHydW = 0;
  if (ateToday) { nutHydParts.push(subScores.nutrition); nutHydW += 0.7; }
  if (drankToday || ateToday) { nutHydParts.push(subScores.habits); nutHydW += 0.3; }
  const nutrition = nutHydParts.length ? clamp100(nutHydParts.reduce((a, b, i) => a + b * (i === 0 && ateToday ? 0.7 : 0.3), 0) / nutHydW) : null;
  // movement: only if any steps/cardio/workout logged today
  const movedToday = (daily?.steps || 0) > 0 || (daily?.cardioMin || 0) > 0 || trainedToday;
  const movement = movedToday ? subScores.movement : null;
  // mind: null until a check-in field is logged (subScores.mind already null-safe)
  const mind = subScores.mind;
  // health markers: only if the user logged BP / resting HR / recent symptoms
  const hasMarkers = !!(healthInfo && (healthInfo.latest?.bp || healthInfo.latest?.rhr || (healthInfo.latest?.symptoms && healthInfo.latest.symptoms.length)));
  let markers = null;
  if (hasMarkers) {
    let mk = 80;
    const bp = healthInfo.latest.bp;
    if (bp && (bp.sys >= 140 || bp.dia >= 90)) mk -= 30;
    else if (bp && (bp.sys >= 130 || bp.dia >= 85)) mk -= 12;
    if (healthInfo.latest.rhr && healthInfo.latest.rhr > 80) mk -= 15;
    if (healthInfo.latest.symptoms && healthInfo.latest.symptoms.length) mk -= Math.min(30, healthInfo.latest.symptoms.length * 12);
    markers = clamp100(mk);
  }

  // Spec weights — redistribute missing categories' weight across what's available.
  const cats = [
    { key: "sleep", label: "Sleep & recovery", score: sleep, w: 0.25 },
    { key: "nutrition", label: "Nutrition & hydration", score: nutrition, w: 0.25 },
    { key: "movement", label: "Movement", score: movement, w: 0.20 },
    { key: "mind", label: "Mind & check-in", score: mind, w: 0.15 },
    { key: "markers", label: "Health markers", score: markers, w: 0.15 },
  ];
  const present = cats.filter((c) => c.score != null);
  const wsum = present.reduce((a, c) => a + c.w, 0);
  const score = wsum ? Math.round(present.reduce((a, c) => a + c.score * c.w, 0) / wsum) : null;

  // Confidence from how much of the total weighted picture we actually have data for.
  const totalW = cats.reduce((a, c) => a + c.w, 0);
  const coverage = totalW ? wsum / totalW : 0;
  let confidence;
  if (coverage >= 0.7) confidence = "High";
  else if (coverage >= 0.45) confidence = "Medium";
  else confidence = "Low";

  // Top reasons it's not higher (only from categories that have data).
  const reasons = [];
  if (sleep != null && sleep < 60) reasons.push("Sleep is low");
  if ((daily?.alcohol || 0) > 0) reasons.push("Alcohol logged");
  if (ateToday && subScores.nutrition < 55) reasons.push("Calories or protein off target");
  if (drankToday === false && ateToday) reasons.push("Hydration not logged");
  else if (drankToday && (daily.water || 0) < waterGoal(profile) * 0.5) reasons.push("Hydration low");
  if (movedToday && movement != null && movement < 50) reasons.push("Steps low");
  if (ci.pain === "serious" || ci.pain === "moderate") reasons.push("Pain active");
  if (ci.stress === "high") reasons.push("Stress high");
  if (markers != null && markers < 60) reasons.push("Health markers flagged");

  const enough = present.length >= 2;
  return {
    score, confidence, reasons: reasons.slice(0, 3), enough,
    categories: cats, presentCount: present.length,
  };
}
function scoreVerdict(score) {
  if (score >= 85) return "Excellent day";
  if (score >= 70) return "Good day";
  if (score >= 55) return "Decent day";
  if (score >= 40) return "Below par";
  return "Take it easy";
}
// rule-based "best action today" — returns ordered list, most important first
function bestActions({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile }) {
  const out = [];
  const ci = daily.checkin || {};
  const proteinLeft = Math.max(0, Math.round(targets.protein - t.protein));
  const calLeft = Math.round(targets.calories - t.calories);

  // health overrides first
  if (ci.sick === "yes") out.push({ icon: "rest", text: "You marked yourself sick — rest today. Hydrate, eat enough protein, skip training." });
  if (ci.pain === "serious") out.push({ icon: "pain", text: "Serious pain logged — avoid loading it. Train around it or take a rest day." });

  // training recommendation (only if not already covered by sick)
  if (ci.sick !== "yes") {
    const r = trainInfo.bodyReadiness;
    if (trainedToday) {
      out.push({ icon: "done", text: "You've trained today — focus on protein, a walk, and an early night to recover." });
    } else if (r >= 70) {
      const fresh = trainInfo.freshMuscles.slice(0, 2).join(" & ");
      out.push({ icon: "train", text: `Train hard today.${fresh ? ` ${fresh} ${trainInfo.freshMuscles.length > 1 ? "are" : "is"} fresh.` : ""}` });
    } else if (r >= 45) {
      out.push({ icon: "train", text: "Do a moderate workout — leave 1–2 reps in reserve, avoid going to failure." });
    } else {
      out.push({ icon: "rest", text: "Recovery is low. Do light mobility or a walk instead of a hard session." });
    }
  }

  // nutrition nudges
  if (proteinLeft >= 25) out.push({ icon: "protein", text: `Eat ${proteinLeft}g more protein to hit your target.` });
  if (calLeft < -200) out.push({ icon: "food", text: `You're ${Math.abs(calLeft)} kcal over — lighter dinner or a walk evens it out.` });
  else if (calLeft > 400 && targets.goal !== "lose") out.push({ icon: "food", text: `${calLeft} kcal left — add a solid meal to fuel growth.` });

  // movement
  if ((daily.steps || 0) > 0 && daily.steps < STEPS_TARGET / 2 && !trainedToday)
    out.push({ icon: "walk", text: "Steps are low — a 20-minute walk lifts energy and recovery." });

  // hydration
  if ((daily.water || 0) < waterGoal(profile) * 0.4) out.push({ icon: "water", text: "Drink some water — you're well under your daily target." });

  // sleep tonight
  if (sleepInfo.debtMin > 90) {
    const mins = Math.min(90, Math.round(sleepInfo.debtMin / 3 / 5) * 5);
    out.push({ icon: "sleep", text: `Sleep ${mins} min earlier tonight to chip away at your sleep debt.` });
  }

  return out;
}

/* ---------------- rule-based AI-free coach -------------- */
// assembles 4 coach cards from existing derivations. No API calls — fast & free.
function coachReport({ t, targets, sleepInfo, trainInfo, nutriInfo, dailyInfo, daily, profile, workouts }) {
  const muscleName = (k) => (MUSCLES.find(([m]) => m === k) || [k, k])[1];

  // ---- DAILY COACH: top 3 actions ----
  const daily3 = (dailyInfo.actions || []).slice(0, 3).map((a) => a.text);
  const dailySummary = dailyInfo.actions[0]
    ? `Today's score is ${dailyInfo.healthScore}/100 — ${scoreVerdict(dailyInfo.healthScore).toLowerCase()}.`
    : "Log a little through the day and I'll sharpen your plan.";

  // ---- TRAINING COACH ----
  const sug = trainInfo.suggestion;
  const vol = trainInfo.volume;
  const volRows = MUSCLES.map(([k, n]) => ({ k, n, v: vol[k] || 0, st: volumeStatus(vol[k] || 0, k) }));
  const lowMuscles = volRows.filter((r) => r.st.tag === "low" || r.st.tag === "under" || (r.st.tag === "none" && r.v === 0 && ["chest", "back", "quads", "shoulders"].includes(r.k))).map((r) => r.n);
  const overMuscles = volRows.filter((r) => r.st.tag === "over").map((r) => r.n);
  const stalls = stallingLifts(workouts);
  const trainBullets = [];
  if (sug) trainBullets.push(`${sug.label}: ${sug.reason}`);
  if (lowMuscles.length) trainBullets.push(`Add volume to ${lowMuscles.slice(0, 3).join(", ")}.`);
  if (overMuscles.length) trainBullets.push(`Ease off ${overMuscles.join(", ")} — likely junk volume.`);
  if (stalls.length) trainBullets.push(`Stalled: ${stalls.slice(0, 2).join(", ")}. Deload that lift ~10% then rebuild.`);
  if (trainInfo.deload?.suggest) trainBullets.push(`Deload week suggested — ${trainInfo.deload.reasons[0]}.`);
  // sport-specific bullets (folded in if profile.sport set and daily.sportLog has data)
  if (trainInfo.sportAdvice?.length) trainBullets.push(...trainInfo.sportAdvice);
  if (!trainBullets.length) trainBullets.push("Volume and recovery look balanced — keep progressing.");
  const trainSummary = sug ? `Best session today: ${sug.label}.` : "Train based on what's recovered.";

  // ---- NUTRITION COACH ----
  const proteinLeft = Math.max(0, Math.round(targets.protein - t.protein));
  const calLeft = Math.round(targets.calories - t.calories);
  const nutriBullets = [];
  if (t.calories === 0) nutriBullets.push("Nothing logged yet — add your first meal to start tracking.");
  else {
    if (proteinLeft >= 20) nutriBullets.push(`Protein: ${Math.round(t.protein)}/${targets.protein}g — eat ${proteinLeft}g more.`);
    else nutriBullets.push(`Protein on track (${Math.round(t.protein)}/${targets.protein}g).`);
    if (Math.abs(calLeft) > 250) nutriBullets.push(calLeft > 0 ? `${calLeft} kcal left for your ${targets.goal === "lose" ? "cut" : targets.goal === "gain" ? "bulk" : "day"}.` : `${Math.abs(calLeft)} kcal over — lighter dinner or a walk.`);
    if (t.fiber < targets.fiber * 0.7) nutriBullets.push(`Fiber low (${Math.round(t.fiber)}/${targets.fiber}g) — add fruit, veg, or oats.`);
  }
  if (nutriInfo.missing?.length) {
    const top = nutriInfo.missing[0];
    nutriBullets.push(`Lowest: ${top.label} (${top.pct}%) — try ${top.food.split(",").slice(0, 2).join(",")}.`);
  }
  if ((daily.water || 0) < nutriInfo.waterGoal * 0.5) nutriBullets.push("Hydration's behind — drink a glass now.");
  const nutriSummary = nutriInfo.coach?.lines?.[0]?.text || (t.calories ? `Diet quality ${nutriInfo.dietQ.score}/100.` : "Track today's food for tailored advice.");

  // ---- RECOVERY COACH ----
  const rr = trainInfo.recoveryRec;
  const recBullets = [];
  if (sleepInfo.lastSleep) recBullets.push(`Last night: ${durLabel(sleepInfo.lastSleep.durationMin)}, score ${sleepInfo.lastSleep.score}.`);
  if (sleepInfo.debtMin > 90) recBullets.push(`Sleep debt ${durLabel(sleepInfo.debtMin)} — bed by ${minToLabel(sleepInfo.rec.recBed)} tonight.`);
  if ((daily.alcohol || 0) > 0) recBullets.push(`${alcoholImpact(daily.alcohol).label} alcohol logged — recovery takes a hit.`);
  if (trainInfo.pain?.level && trainInfo.pain.level !== "none") recBullets.push(`Pain active (${trainInfo.pain.level}) — ${trainInfo.pain.coach.lines[0]}`);
  const ci = daily.checkin || {};
  if (ci.stress === "high") recBullets.push("Stress high — a walk or breath work tonight helps sleep.");
  if (!recBullets.length) recBullets.push("Sleep, stress, and recovery markers look clear.");
  const recSummary = rr ? rr.text : "Recovery looks fine.";

  return {
    daily:    { summary: dailySummary, bullets: daily3.length ? daily3 : ["Check in and log a meal to get started."] },
    training: { summary: trainSummary, bullets: trainBullets, suggestion: sug },
    nutrition:{ summary: nutriSummary, bullets: nutriBullets },
    recovery: { summary: recSummary, bullets: recBullets, level: rr?.level },
  };
}

/* ---------------- weekly report (rule-based) -------------- */
function weeklyReport({ history, workouts, sleepLogs, weightSeries, daily, dailyHistory, painLogs, focusSessions, consistency, targets, profile, sleepInfo }) {
  const now = Date.now();
  const weekAgo = now - 7 * 864e5;
  const dates7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toLocaleDateString("en-CA"); });
  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  // training
  const wkWorkouts = workouts.filter((w) => w.ts >= weekAgo);
  const setsPerMuscle = {};
  MUSCLES.forEach(([k]) => (setsPerMuscle[k] = 0));
  let totalSets = 0;
  wkWorkouts.forEach((w) => w.exercises.forEach((ex) => {
    const meta = findEx(ex.name); const n = ex.sets.length; totalSets += n;
    const prim = ex.group || meta?.group;
    if (prim) setsPerMuscle[prim] = (setsPerMuscle[prim] || 0) + n;
    (meta?.sec || []).forEach((s) => (setsPerMuscle[s] = (setsPerMuscle[s] || 0) + n * 0.5));
  }));
  const topMuscles = Object.entries(setsPerMuscle).filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([k, v]) => ({ name: (MUSCLES.find(([m]) => m === k) || [k, k])[1], sets: Math.round(v * 10) / 10 }));
  const prs = detectPRs(workouts).filter((p) => p.ts >= weekAgo);

  // nutrition — use dailyHistory (has calories/protein) limited to last 7 days
  const foodDays = (history || []).filter((h) => dates7.includes(h.date));
  const avgCal = avg(foodDays.map((h) => h.calories).filter((v) => v > 0));
  const avgProt = avg(foodDays.map((h) => h.protein).filter((v) => v > 0));
  const proteinHitDays = foodDays.filter((h) => targets.protein && h.protein >= targets.protein * 0.9).length;
  const avgWater = avg((dailyHistory || []).filter((d) => dates7.includes(d.date) && d.water != null).map((d) => d.water));
  const avgSteps = avg((dailyHistory || []).filter((d) => dates7.includes(d.date) && d.steps != null).map((d) => d.steps));

  // sleep
  const wkSleep = (sleepLogs || []).filter((l) => l.bedtime >= weekAgo || dates7.includes(l.date));
  const avgSleepMin = avg(wkSleep.map((l) => l.durationMin));
  const avgSleepScore = avg(wkSleep.map((l) => l.score));
  // bedtime consistency: mean absolute deviation from the circular-mean bedtime (min)
  let bedConsistency = null;
  if (wkSleep.length >= 3) {
    const beds = wkSleep.map((l) => tsToMin(l.bedtime));
    const angles = beds.map((b) => (b / DAYMIN) * 2 * Math.PI);
    const mx = angles.reduce((a, t) => a + Math.cos(t), 0) / angles.length;
    const my = angles.reduce((a, t) => a + Math.sin(t), 0) / angles.length;
    const meanAngle = Math.atan2(my, mx);
    const meanMin = ((meanAngle / (2 * Math.PI)) * DAYMIN + DAYMIN) % DAYMIN;
    // average shortest-arc distance from the mean bedtime
    const mad = beds.reduce((a, b) => a + circDiff(b, meanMin), 0) / beds.length;
    bedConsistency = Math.round(mad);
  }

  // weight trend
  const wStats = weightStats(weightSeries);

  // pain & mood
  const wkPain = (painLogs || []).filter((p) => p.ts >= weekAgo);
  const moodVals = (dailyHistory || []).filter((d) => dates7.includes(d.date)).map((d) => d.mood).filter(Boolean);
  const stressVals = (dailyHistory || []).filter((d) => dates7.includes(d.date)).map((d) => d.stress).filter(Boolean);
  const moodMap = { bad: 1, okay: 2, good: 3 };
  const avgMood = moodVals.length ? avg(moodVals.map((m) => moodMap[m] || 2)) : null;

  // focus
  const wkFocus = (focusSessions || []).filter((f) => dates7.includes(f.date));
  const focusMin = wkFocus.reduce((a, f) => a + f.minutes, 0);

  // ---- derive best win + bottleneck + one change ----
  const wins = [];
  if (prs.length) wins.push({ score: 10, text: `New PR: ${prs[0].name} (${prs[0].w}${profile.unit || "kg"} × ${prs[0].reps})` });
  if (wkWorkouts.length >= 4) wins.push({ score: 8, text: `${wkWorkouts.length} workouts completed — strong week of training` });
  if (proteinHitDays >= 6) wins.push({ score: 7, text: `Protein hit ${proteinHitDays}/7 days` });
  if (consistency?.pct >= 80) wins.push({ score: 7, text: `${consistency.pct}% habit consistency` });
  if (avgSleepScore >= 80) wins.push({ score: 6, text: `Great sleep — ${Math.round(avgSleepScore)} average score` });
  if (wStats.rate != null && profile.goal === "gain" && wStats.rate >= 0.1 && wStats.rate <= 0.35) wins.push({ score: 6, text: `Lean-bulk weight gain on point (+${wStats.rate} kg/wk)` });
  wins.sort((a, b) => b.score - a.score);

  const bottlenecks = [];
  if (bedConsistency != null && bedConsistency > 60) bottlenecks.push({ score: 9, key: "sleep_consistency", text: `Sleep consistency — bedtime swings ±${bedConsistency} min`, fix: `Lock bedtime near ${sleepInfo?.rec ? minToLabel(sleepInfo.rec.recBed) : "a fixed time"} every night.` });
  if (avgSleepMin != null && avgSleepMin < (sleepInfo?.need || 480) - 45) bottlenecks.push({ score: 8, key: "sleep_short", text: `Short sleep — averaging ${durLabel(Math.round(avgSleepMin))}`, fix: "Sleep 30 min earlier most nights this week." });
  if (avgProt != null && targets.protein && avgProt < targets.protein * 0.85) bottlenecks.push({ score: 8, key: "protein", text: `Protein under target (${Math.round(avgProt)}g avg)`, fix: `Add ~${Math.round(targets.protein - avgProt)}g protein/day.` });
  if (wkWorkouts.length < 3) bottlenecks.push({ score: 7, key: "training", text: `Only ${wkWorkouts.length} workout${wkWorkouts.length !== 1 ? "s" : ""} this week`, fix: "Aim for 3–4 sessions next week." });
  if (wkPain.length >= 3) bottlenecks.push({ score: 7, key: "pain", text: `Pain logged ${wkPain.length}× this week`, fix: "Train around it and rest the area; see a physio if it persists." });
  if (avgSteps != null && avgSteps < 5000) bottlenecks.push({ score: 5, key: "steps", text: `Low movement (${Math.round(avgSteps)} steps/day)`, fix: "Add a daily 20-min walk." });
  bottlenecks.sort((a, b) => b.score - a.score);

  // one recommended change (from top bottleneck, else maintain)
  let nextWeek;
  const top = bottlenecks[0];
  if (top) nextWeek = top.fix;
  else if (profile.goal === "gain" && avgCal) nextWeek = "Keep calories where they are and keep progressing — it's working.";
  else if (profile.goal === "lose" && avgCal) nextWeek = "Hold the deficit and keep steps up — steady as she goes.";
  else nextWeek = "Keep the routine steady — consistency is doing the work.";

  return {
    hasData: wkWorkouts.length > 0 || foodDays.length > 0 || wkSleep.length > 0,
    training: { count: wkWorkouts.length, totalSets: Math.round(totalSets), topMuscles, prs },
    nutrition: { avgCal: avgCal != null ? Math.round(avgCal) : null, avgProt: avgProt != null ? Math.round(avgProt) : null, proteinHitDays, foodDays: foodDays.length, avgWater: avgWater != null ? Math.round(avgWater) : null, avgSteps: avgSteps != null ? Math.round(avgSteps) : null },
    sleep: { avgMin: avgSleepMin != null ? Math.round(avgSleepMin) : null, avgScore: avgSleepScore != null ? Math.round(avgSleepScore) : null, nights: wkSleep.length, bedConsistency },
    weight: wStats,
    mind: { avgMood, moodDays: moodVals.length, stressHigh: stressVals.filter((s) => s === "high").length, focusMin, consistency: consistency?.pct ?? null },
    pain: { count: wkPain.length },
    win: wins[0]?.text || null,
    bottleneck: top?.text || null,
    nextWeek,
  };
}

/* ---------------- AI analysis via Claude (free in artifacts) -------------- */
const SCHEMA_PROMPT = `Return ONLY a single minified JSON object (no markdown, no commentary) with EXACTLY this shape:
{"name":string,"serving":string,"confidence":"high"|"medium"|"low","calories":int,"protein_g":number,"carbs_g":number,"fat_g":number,"fiber_g":number,"micros":{"vitamin_a":int,"vitamin_c":int,"vitamin_d":int,"vitamin_e":int,"vitamin_k":int,"b6":int,"b12":int,"folate":int,"calcium":int,"iron":int,"magnesium":int,"zinc":int,"potassium":int,"selenium":int},"omega3":"low"|"medium"|"high","note":string}
"name" max 5 words. Each micro value = integer percent of an average adult daily value contributed by THIS serving (can exceed 100). Estimate sensibly even with limited info.`;

async function resizeImage(file, max = 1100) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  return await new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      if (w > max || h > max) { const s = max / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      cv.getContext("2d").drawImage(img, 0, 0, w, h);
      const out = cv.toDataURL("image/jpeg", 0.82);
      res({ data: out.split(",")[1], media: "image/jpeg" });
    };
    img.onerror = () => res(null);
    img.src = dataUrl;
  });
}

function extractJSON(text) {
  let s = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

async function analyze({ text, image, mode }) {
  // Calls the Sprig serverless proxy at /api/analyze, which holds the Anthropic key.
  // The frontend never sees the API key — see api/analyze.js for the server side.
  const resp = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "nutrition", mode, text, image }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error("AI proxy " + resp.status + (body ? ": " + body.slice(0, 120) : ""));
  }
  const data = await resp.json();
  // The proxy returns { result: <parsed JSON>, raw?: <string> }.
  // Fall back to parsing raw text if the proxy didn't parse for us.
  if (data.result && typeof data.result === "object") return data.result;
  if (typeof data.raw === "string") return extractJSON(data.raw);
  throw new Error("AI proxy returned no result");
}

// free-form text reply for the Ask Coach feature
async function analyzeText({ prompt, system }) {
  // Same proxy, different mode. Returns plain text.
  // We log everything to the console here because Ask Coach failures are otherwise invisible —
  // open DevTools (Safari Develop menu on iOS, or eruda on phone) to see what actually went wrong.
  let resp;
  try {
    resp = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "text", prompt, system }),
    });
  } catch (e) {
    console.error("[sprig] analyzeText: fetch threw —", e?.message || e);
    throw new Error("Network error talking to /api/analyze: " + (e?.message || e));
  }
  // Read body once as text so we can both inspect it and parse it as JSON if possible.
  const bodyText = await resp.text().catch(() => "");
  if (!resp.ok) {
    console.error("[sprig] analyzeText: HTTP " + resp.status + " from /api/analyze. Body:", bodyText.slice(0, 500));
    let serverError = null;
    try { serverError = JSON.parse(bodyText)?.error; } catch (_) {}
    throw new Error("AI proxy " + resp.status + (serverError ? ": " + serverError : ""));
  }
  let data;
  try { data = JSON.parse(bodyText); } catch (e) {
    console.error("[sprig] analyzeText: response was not JSON. Body:", bodyText.slice(0, 500));
    throw new Error("AI proxy returned non-JSON response");
  }
  console.log("[sprig] analyzeText: OK, got " + (data.text?.length || 0) + " chars");
  return (data.text || "").trim();
}

/* ---------------- local (offline) coach engine — used when the AI API isn't reachable -------------- */
// Pattern-matches the user's question and assembles a structured answer from their data summary.
function localCoachAnswer(question, ctx, profile, targets) {
  // Minimal offline / AI-failure fallback. The AI handles every real coaching question;
  // this engine covers only the cases we can answer cleanly from data + simple math.
  const q = (question || "").toLowerCase();
  const goal = profile?.goal || "maintain";

  // 1) Should I train today?
  if (/(should i (train|lift|work ?out|go to the gym|exercise)|train today|gym today|skip (the )?gym|rest day)/.test(q)) {
    if (ctx?.painActive) return "Train, but train around the pain. Skip exercises that load the painful area, drop intensity ~25%, and stop any set that makes pain worse.";
    const sleepHr = ctx?.sleepAvg != null ? +(ctx.sleepAvg / 60).toFixed(1) : null;
    if (sleepHr != null && sleepHr < 6) return `You averaged ${sleepHr}h sleep. You can still train, but expect ~10% less. Hit your main lift, drop a working set, keep RIR 2–3 — no grinding reps.`;
    if (ctx?.weeklyWk != null && ctx.weeklyWk >= 5) return `You've trained ${ctx.weeklyWk} times this week. A rest day is fine — recovery is where gains compound. Walk, eat well, sleep early.`;
    return "Nothing in your data is flagging caution today. Train normally.";
  }

  // 2) Recovery score / muscle readiness explanation
  if (/(recovery score|why.*recovery|recovery (low|red|amber|yellow|green)|why is my recovery|what does recovery mean)/.test(q)) {
    return "Your recovery score blends three things: how recently you trained each muscle (volume × days), how much you've slept vs. your need, and any active pain flags. Red/amber means at least one of those is depressed — usually low sleep, very recent heavy session, or pain. Green means the system thinks you can push the lift.";
  }

  // 3) Calorie / maintenance math
  if (/(maintenance|tdee|how many calories|calorie target|calorie need|kcal target)/.test(q)) {
    if (targets?.calories) {
      const t = targets.calories;
      const goalNote = goal === "gain" ? `Your gain target is ${t} kcal — that's maintenance + ~300 kcal surplus.`
                     : goal === "lose" ? `Your cut target is ${t} kcal — that's maintenance − ~400 kcal deficit.`
                     : `Your maintenance target is ${t} kcal.`;
      const main = goal === "maintain" ? t : (goal === "gain" ? t - 300 : t + 400);
      return goalNote + "\nApprox maintenance: ~" + main + " kcal/day. (Estimated from your sex/age/weight/height/activity using Mifflin-St Jeor.)";
    }
    return "I need your profile (sex, age, weight, height, activity) to compute calories. Finish onboarding and ask again.";
  }

  // 4) Otherwise: be honest. The AI is the right tool for everything else.
  return "AI coaching is unavailable right now. You can still ask about whether to train today, your recovery score, or your calorie target — I can answer those from your data. Try the full coach again in a moment.";
}

/* ---------------- small UI bits -------------- */
/* ---------------- beginner glossary + tooltip chip -------------- */
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

function Ring({ value, max, size = 132, stroke = 13, color = C.green, track = C.bg2, label, sub }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.min(1, max > 0 ? value / max : 0);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - p)}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 30, fontWeight: 600, color: C.ink, lineHeight: 1 }}>{label}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3, letterSpacing: .3 }}>{sub}</div>
      </div>
    </div>
  );
}

function MacroBar({ name, val, max, color }) {
  const p = Math.min(100, max > 0 ? (val / max) * 100 : 0);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>{name}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{Math.round(val)}/{max}g</span>
      </div>
      <div style={{ height: 7, background: C.bg2, borderRadius: 99 }}>
        <div style={{ width: p + "%", height: "100%", background: color, borderRadius: 99, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

function btn(bg, fg) {
  return { background: bg, color: fg, border: "none", borderRadius: 14, fontFamily: "DM Sans, sans-serif",
    fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 };
}

/* ============== Design system primitives ==============
   Small, consistent building blocks so screens stop looking hand-rolled.
   All use the existing C tokens, so adopting them is purely visual. */

// Standard button with four premium variants. Replaces ad-hoc btn() calls where consistency matters.
function Btn({ variant = "primary", onClick, disabled, full, size = "md", children, style = {} }) {
  const V = {
    primary:   { background: C.green, color: "#fff", border: "none" },
    secondary: { background: C.bg2, color: C.ink, border: `1px solid ${C.line}` },
    ghost:     { background: "transparent", color: C.inkSoft, border: "none" },
    danger:    { background: "transparent", color: C.coral, border: `1px solid ${C.coral}55` },
  }[variant] || {};
  const pad = size === "sm" ? "8px 12px" : size === "lg" ? "14px 20px" : "11px 16px";
  const fs = size === "sm" ? 12.5 : size === "lg" ? 15 : 13.5;
  return (
    <button className="sprig-tap" onClick={onClick} disabled={disabled}
      style={{ ...V, borderRadius: 12, fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: fs, padding: pad,
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, ...style }}>
      {children}
    </button>
  );
}

// Status pill. tone: success | warning | danger | neutral
function Badge({ tone = "neutral", children, style = {} }) {
  const T = {
    success: { bg: C.greenSoft + "1a", fg: C.greenSoft },
    warning: { bg: C.amber + "1f", fg: C.amber },
    danger:  { bg: C.coral + "1a", fg: C.coral },
    neutral: { bg: C.bg2, fg: C.inkSoft },
  }[tone] || { bg: C.bg2, fg: C.inkSoft };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: T.bg, color: T.fg,
      borderRadius: 99, padding: "3px 9px", fontSize: 11, fontWeight: 700, letterSpacing: .2, ...style }}>
      {children}
    </span>
  );
}

// Clean section header with optional right action ("View all", etc.)
function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 10px" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, color: C.ink }}>{title}</div>
      {action && (
        <button className="sprig-tap" onClick={onAction}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.greenSoft, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", display: "inline-flex", alignItems: "center", gap: 3 }}>
          {action}
        </button>
      )}
    </div>
  );
}

// Premium empty state — calm, helpful, with an action.
function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, boxShadow: C.shadow, padding: "28px 20px", textAlign: "center" }}>
      {icon && <div style={{ width: 44, height: 44, borderRadius: 13, background: C.green + "12", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>{icon}</div>}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, color: C.ink }}>{title}</div>
      {text && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6, lineHeight: 1.5, maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>{text}</div>}
      {actionLabel && onAction && (
        <div style={{ marginTop: 16 }}><Btn variant="primary" onClick={onAction} size="md">{actionLabel}</Btn></div>
      )}
    </div>
  );
}

// Consistent progress bar.
function ProgressBar({ pct, color = C.green, height = 6 }) {
  return (
    <div style={{ height, background: C.bg2, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: Math.max(0, Math.min(100, pct)) + "%", height: "100%", background: color, borderRadius: 99, transition: "width .5s ease" }} />
    </div>
  );
}

// Standard surface: glass card — consistent radius / padding / soft shadow / blur. Use for any card-like block.
function PremiumCard({ children, accent, onClick, style = {}, pad = 18 }) {
  const base = {
    background: C.card, borderRadius: 22, padding: pad, boxShadow: C.shadow,
    border: `1px solid ${C.line}`, ...(accent ? { borderLeft: `3px solid ${accent}` } : {}), ...style,
  };
  if (onClick) return <button className="sprig-tap sprig-glass" onClick={onClick} style={{ ...base, width: "100%", textAlign: "left", cursor: "pointer", display: "block" }}>{children}</button>;
  return <div className="sprig-glass" style={base}>{children}</div>;
}

// Kiwi-style glass card alias — translucent dark surface, blur, soft border, large radius.
function GlassCard({ children, onClick, style = {}, pad = 18, radius = 24 }) {
  return <PremiumCard onClick={onClick} pad={pad} style={{ borderRadius: radius, ...style }}>{children}</PremiumCard>;
}

// Circular progress ring with a center value + label. Used for calories, macros, vitamins, scores, etc.
function RingMetric({ value, max, label, icon, accent = C.lime, size = 76, stroke = 7, center, sub, track = "rgba(255,255,255,0.10)" }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - pct);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset .6s cubic-bezier(.22,.7,.25,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          {icon && !center && <span style={{ color: accent, display: "inline-flex" }}>{icon}</span>}
          {center != null && <span style={{ fontFamily: "Fraunces, serif", fontSize: size > 90 ? 24 : 16, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{center}</span>}
          {sub && <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600 }}>{sub}</span>}
        </div>
      </div>
      {label && <span style={{ fontSize: 11, color: C.inkSoft, fontWeight: 600, textAlign: "center" }}>{label}</span>}
    </div>
  );
}

// Metric tile: label, big number, subtext, optional progress + action.
function MetricCard({ icon, label, value, unit, sub, pct, accent = C.lime, action }) {
  return (
    <PremiumCard>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        {icon && <span style={{ color: accent, display: "inline-flex" }}>{icon}</span>}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>{label}</span>
        {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sub}</div>}
      {pct != null && <div style={{ marginTop: 10 }}><ProgressBar pct={pct} color={accent} /></div>}
    </PremiumCard>
  );
}

// Large, confident page title (Apple-style), with optional subtitle + right action.
function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", margin: "4px 2px 16px" }}>
      <div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 27, fontWeight: 700, color: C.ink, letterSpacing: -.3, lineHeight: 1.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

// Top-of-page segmented control for splitting a tab into subtabs (Food, Train, Sleep).
function SubTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 4, borderRadius: 13, marginBottom: 14 }}>
      {tabs.map(([key, label]) => {
        const on = active === key;
        return (
          <button key={key} className="sprig-tap" onClick={() => onChange(key)}
            style={{ flex: 1, minWidth: 0, border: "none", cursor: "pointer", padding: "9px 6px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans",
              background: on ? C.card : "transparent", color: on ? C.lime : C.muted, boxShadow: on ? C.shadow : "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Wins / Kudos ---------------- */
// Maps a win source to a small line icon, keeping the system visually consistent.
function winIconFor(source) {
  if (source === "workout") return Dumbbell;
  if (source === "nutrition") return Flame;
  if (source === "movement") return Activity;
  if (source === "sleep") return Moon;
  if (source === "mind") return Sparkles;
  return Award;
}
// Small premium Kudos pill — muted until tapped, lime when kudoed. Personal acknowledgement, not social.
function KudosButton({ kudoed, onKudos }) {
  return (
    <button className="sprig-tap" onClick={kudoed ? undefined : onKudos} disabled={kudoed} aria-label={kudoed ? "Kudoed" : "Give kudos"}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${kudoed ? C.lime : C.line}`, cursor: kudoed ? "default" : "pointer",
        background: kudoed ? C.lime + "1f" : "transparent", color: kudoed ? C.lime : C.muted, borderRadius: 99, padding: "5px 11px", fontSize: 11.5, fontWeight: 700, fontFamily: "DM Sans", flexShrink: 0 }}>
      {kudoed ? <Check size={13} /> : <Award size={13} />} {kudoed ? "Kudoed" : "Kudos"}
    </button>
  );
}
// One win line: icon + title/detail + Kudos pill.
function WinRow({ win, onKudos, compact }) {
  const Ic = winIconFor(win.source);
  return (
    <div className={win.kudoed ? "" : "sprig-rise"} style={{ display: "flex", alignItems: "center", gap: 10, padding: compact ? "7px 0" : "9px 0" }}>
      <div style={{ width: 28, height: 28, borderRadius: 9, background: C.lime + "1a", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Ic size={15} color={C.lime} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{win.title}</div>
        {!compact && win.detail && <div style={{ fontSize: 11, color: C.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{win.detail}</div>}
      </div>
      <KudosButton kudoed={win.kudoed} onKudos={() => onKudos(win.id)} />
    </div>
  );
}
// Compact Today's Wins card — top 3 wins + count, calm empty state.
function TodayWinsCard({ wins, onKudos, onViewAll }) {
  const list = wins || [];
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: list.length ? 6 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Award size={16} color={C.lime} />
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, color: C.ink }}>Today's wins</span>
        </div>
        {list.length > 0 && <span style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: C.lime }}>{list.length}</span>}
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>Complete one small action to earn your first win today.</div>
      ) : (
        <>
          <div>
            {list.slice(0, 3).map((w) => <WinRow key={w.id} win={w} onKudos={onKudos} compact />)}
          </div>
          {list.length > 3 && (
            <button className="sprig-tap" onClick={onViewAll} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.lime, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", padding: "6px 0 0" }}>
              View all {list.length} wins →
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- result / edit card -------------- */
function ResultCard({ result, onAdd, onCancel, mode, isSupp, favoriteMode }) {
  const [r, setR] = useState({ ...result, mult: 1 });
  const setMult = (d) => setR((x) => ({ ...x, mult: Math.max(0.25, Math.round((x.mult + d) * 4) / 4) }));
  const m = r.mult;
  const conf = { high: C.greenSoft, medium: C.amber, low: C.coral }[r.confidence] || C.muted;
  const topMicros = MICRO_KEYS
    .map(([k, lbl]) => [lbl, Math.round((r.micros?.[k] || 0) * m)])
    .filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return (
    <div className="sprig-pop" style={{ background: C.card, borderRadius: 22, padding: 20, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
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

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="sprig-tap" onClick={onCancel} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "13px 0" }}><X size={16} /> Discard</button>
        <button className="sprig-tap" onClick={() => onAdd(r)} style={{ ...btn(C.green, "#fff"), flex: 2, padding: "13px 0" }}>
          <Check size={16} /> {favoriteMode ? "Review & save favorite" : isSupp ? "Add to my stack" : <>Add to today{mode === "text" ? " · save meal" : ""}</>}
        </button>
      </div>
    </div>
  );
}

/* ---------------- main app -------------- */
const DEFAULT_PROFILE = { sex: "male", age: 18, weight: 72, height: 178, activity: "active", goal: "gain", experience: "beginner", focus: "gym", mode: "simple", workoutCalorieMode: "conservative", dayResetMode: "after-wake", restTimerSound: true, restTimerVibrate: true, restTimerSoundChoice: "beep", alarmSound: "bells", alarmVolume: 0.7, devMode: false };

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
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>Sprig couldn't load your data this time.</div>
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
            <RotateCcw size={14} /> Reload Sprig
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
          Clearing wipes only Sprig's data on this device. Your exported backup file is unaffected.
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
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>A part of Sprig hit an unexpected error. Your data is safe.</div>
              </div>
            </div>
            <div style={{ background: C.bg, borderRadius: 11, padding: 11, fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55, marginBottom: 14 }}>
              Try reloading. If the same error keeps appearing, you can wipe local data from <b>Me → Data &amp; privacy</b> after reloading.
              {this.state.error?.message && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", listStyle: "none", fontSize: 10.5, color: C.muted, fontWeight: 600 }}>Technical details</summary>
                  <code style={{ display: "block", fontSize: 10, color: C.muted, marginTop: 5, wordBreak: "break-word", fontFamily: "monospace" }}>{this.state.error.message}</code>
                </details>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="sprig-tap" onClick={this.reload}
                style={{ background: C.green, color: "#fff", border: "none", cursor: "pointer", borderRadius: 11, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans" }}>
                <RotateCcw size={14} /> Reload Sprig
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

function Onboarding({ onDone, supabaseReady }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ intent: null, sex: null, age: "", height: "", weight: "", activity: null, experience: null, focus: null, focusAreas: [], unit: "kg" });
  const [firstAction, setFirstAction] = useState(null);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const toggleArea = (k) => setP((x) => {
    const has = (x.focusAreas || []).includes(k);
    let next = has ? x.focusAreas.filter((a) => a !== k) : [...(x.focusAreas || []), k];
    if (k === "all") next = has ? [] : ["all"]; else next = next.filter((a) => a !== "all");
    return { ...x, focusAreas: next };
  });

  // Step 0 is a full-screen welcome; the rest are one-question screens.
  const steps = [
    { key: "welcome" },
    { key: "intent",    title: "What are you working toward?",  sub: "We'll tune everything around this." },
    { key: "focusAreas",title: "What should Sprig help with?",  sub: "Pick as many as you like." },
    { key: "sex",       title: "Sex",                          sub: "Used to estimate your calorie needs." },
    { key: "stats",     title: "A few basics",                 sub: "Age, height, and weight — for accurate targets." },
    { key: "activity",  title: "How active are you?",          sub: "Day-to-day movement and training." },
    { key: "experience",title: "Training experience",          sub: "So strength grades and progression fit you." },
    { key: "account",   title: "Save your progress",           sub: "Back up your data and restore it on a new phone." },
    { key: "firstAction",title: "Start with one small action",  sub: "The fastest way to see Sprig work." },
  ];
  const cur = steps[step];
  const last = step === steps.length - 1;
  const qIndex = step;                       // for the progress bar (welcome included)

  const FOCUS_AREAS = [
    ["nutrition", "Nutrition", Flame], ["training", "Training", Dumbbell], ["sleep", "Sleep", Moon],
    ["recovery", "Recovery", HeartPulse], ["habits", "Habits", Repeat], ["all", "All of it", Sparkles],
  ];
  const FIRST_ACTIONS = [
    ["food", "Log food", Flame], ["workout", "Start a workout", Dumbbell],
    ["sleep", "Add last night's sleep", Moon], ["coach", "Ask the coach", Sparkles],
  ];

  const canNext = () => {
    switch (cur.key) {
      case "welcome": return true;
      case "intent": return !!p.intent;
      case "focusAreas": return (p.focusAreas || []).length > 0;
      case "sex": return !!p.sex;
      case "stats": return p.age && p.height && p.weight;
      case "activity": return !!p.activity;
      case "experience": return !!p.experience;
      case "account": return true;       // account is optional
      case "firstAction": return true;   // can skip
      default: return true;
    }
  };
  const finish = async (action) => {
    const g = ONB_GOALS.find((x) => x.id === p.intent);
    const areas = (p.focusAreas || []);
    // keep single `focus` for back-compat (first non-"all" area maps loosely), plus store the full set
    const focusMap = { nutrition: "health", training: "gym", sleep: "health", recovery: "health", habits: "health" };
    const focus = areas.includes("training") ? "gym" : areas.includes("nutrition") ? "health" : (focusMap[areas[0]] || "health");
    await onDone({
      sex: p.sex, age: +p.age, height: +p.height, weight: +p.weight,
      activity: p.activity, goal: g.goal, intent: p.intent,
      experience: p.experience, focus, focusAreas: areas, unit: p.unit, mode: "simple",
      onboardedAt: new Date().toISOString(),
    }, action || firstAction);
  };

  const Opt = ({ on, onClick, children, sub, multi }) => (
    <button className="sprig-tap" onClick={onClick}
      style={{ width: "100%", textAlign: "left", border: `1.5px solid ${on ? C.green : C.line}`, background: on ? C.green + "0d" : C.card, cursor: "pointer",
        borderRadius: 14, padding: "14px 16px", fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 12, boxShadow: on ? "none" : C.shadow }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{children}</div>
        {sub && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ width: 22, height: 22, borderRadius: multi ? 7 : 99, border: `2px solid ${on ? C.green : C.line}`, background: on ? C.green : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
        {on && <Check size={13} color="#fff" />}
      </div>
    </button>
  );

  // ---- WELCOME (full-screen) ----
  if (cur.key === "welcome") {
    const previews = [
      [Flame, "Know what to eat today"],
      [Dumbbell, "Train with progressive overload"],
      [Moon, "Improve sleep and recovery"],
      [Award, "Track wins and real progress"],
      [Sparkles, "Ask an AI coach that knows your data"],
    ];
    return (
      <div className="sprig-app-frame" style={{ background: C.pageBg, fontFamily: "DM Sans, sans-serif", color: C.ink, display: "flex", flexDirection: "column" }}>
        <style>{FONTS}</style>
        <div className="sprig-rise" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: C.green, display: "grid", placeItems: "center", margin: "0 auto 20px", boxShadow: `0 8px 24px ${C.green}55` }}>
            <Sparkles size={30} color="#fff" />
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 38, fontWeight: 700, letterSpacing: -.5 }}>Sprig</div>
          <div style={{ fontSize: 15, color: C.inkSoft, marginTop: 8, lineHeight: 1.5, maxWidth: 300, marginInline: "auto" }}>
            Your daily coach for food, training, sleep, and recovery.
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: "18px 18px 14px", margin: "28px auto 0", maxWidth: 340, textAlign: "left", boxShadow: C.shadow }}>
            {previews.map(([Ic, txt], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0" }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: C.lime + "1a", display: "grid", placeItems: "center", flexShrink: 0 }}><Ic size={16} color={C.lime} /></div>
                <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 500 }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "12px 24px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="sprig-tap" onClick={() => setStep(1)}
            style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "16px 0", fontSize: 16, fontWeight: 700, boxShadow: `0 6px 18px ${C.lime}44` }}>
            Get started
          </button>
          <button className="sprig-tap" onClick={() => setStep(1)}
            style={{ width: "100%", background: "transparent", border: "none", cursor: "pointer", color: C.muted, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", padding: "8px 0" }}>
            I already have an account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sprig-app-frame" style={{ background: C.bg, fontFamily: "DM Sans, sans-serif", color: C.ink, borderRadius: 24, display: "flex", flexDirection: "column" }}>
      <style>{FONTS}</style>
      {/* header */}
      <div style={{ padding: "22px 20px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, background: C.green, display: "grid", placeItems: "center" }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }}>Sprig</div>
          <div style={{ marginLeft: "auto", fontSize: 11.5, color: C.muted }}>{qIndex} of {steps.length - 1}</div>
        </div>
        {/* progress */}
        <div style={{ display: "flex", gap: 4 }}>
          {steps.slice(1).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: (i + 1) <= step ? C.green : C.bg2, transition: "background .3s" }} />
          ))}
        </div>
      </div>

      {/* body */}
      <div className="sprig-scroll" style={{ flex: 1, overflowY: "auto", padding: "16px 20px 8px" }}>
        <div key={step} className="sprig-rise">
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 23, fontWeight: 700, lineHeight: 1.2 }}>{cur.title}</div>
          <div style={{ fontSize: 12.5, color: C.muted, margin: "4px 0 18px" }}>{cur.sub}</div>

          {cur.key === "intent" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ONB_GOALS.map((g) => (
                <Opt key={g.id} on={p.intent === g.id} onClick={() => set("intent", g.id)}>{g.emoji}  {g.label}</Opt>
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
              {[["male", "Male"], ["female", "Female"]].map(([k, lbl]) => (
                <Opt key={k} on={p.sex === k} onClick={() => set("sex", k)}>{lbl}</Opt>
              ))}
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.5, padding: "0 4px" }}>
                Used only to estimate your metabolic rate (the Mifflin-St Jeor formula needs it). You can change it anytime.
              </div>
            </div>
          )}

          {cur.key === "stats" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Age</div>
                <input value={p.age} onChange={(e) => set("age", e.target.value)} inputMode="numeric" placeholder="18" autoFocus
                  style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 14px", fontFamily: "DM Sans", fontSize: 16, fontWeight: 600, background: C.card, color: C.ink }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Height (cm)</div>
                <input value={p.height} onChange={(e) => set("height", e.target.value)} inputMode="numeric" placeholder="178"
                  style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 14px", fontFamily: "DM Sans", fontSize: 16, fontWeight: 600, background: C.card, color: C.ink }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Weight (kg)</div>
                <input value={p.weight} onChange={(e) => set("weight", e.target.value)} inputMode="decimal" placeholder="72"
                  style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 14px", fontFamily: "DM Sans", fontSize: 16, fontWeight: 600, background: C.card, color: C.ink }} />
              </div>
            </div>
          )}

          {cur.key === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ONB_ACTIVITY.map(([k, lbl, sub]) => (
                <Opt key={k} on={p.activity === k} onClick={() => set("activity", k)} sub={sub}>{lbl}</Opt>
              ))}
            </div>
          )}

          {cur.key === "experience" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ONB_EXP.map(([k, lbl, sub]) => (
                <Opt key={k} on={p.experience === k} onClick={() => set("experience", k)} sub={sub}>{lbl}</Opt>
              ))}
            </div>
          )}

          {cur.key === "account" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, boxShadow: C.shadow, marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green + "1a", display: "grid", placeItems: "center" }}><Cloud size={18} color={C.greenSoft} /></div>
                  <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>An account backs up your data so you can restore it on a new phone. Your logs stay private to you.</div>
                </div>
              </div>
              {supabaseReady ? (
                <>
                  <Opt on={false} onClick={() => finish()}><span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><LogIn size={16} color={C.greenSoft} /> Create account</span></Opt>
                  <Opt on={false} onClick={() => finish()}><span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><User size={16} color={C.greenSoft} /> Log in</span></Opt>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.5, padding: "0 4px" }}>
                    You can set this up now in the next step, or anytime from Settings → Account.
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, padding: "4px 4px 0" }}>
                  Cloud backup isn't configured in this build — your data saves on this device. You can export a backup anytime from Settings.
                </div>
              )}
            </div>
          )}

          {cur.key === "firstAction" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {FIRST_ACTIONS.map(([k, lbl, Ic]) => (
                <Opt key={k} on={firstAction === k} onClick={() => setFirstAction(k)}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}><Ic size={16} color={C.greenSoft} /> {lbl}</span>
                </Opt>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* footer nav */}
      <div style={{ padding: "12px 20px 22px", display: "flex", gap: 10, borderTop: `1px solid ${C.line}` }}>
        {step > 0 && (
          <button className="sprig-tap" onClick={() => setStep((s) => s - 1)}
            style={{ ...btn(C.bg2, C.inkSoft), padding: "14px 18px" }}><ChevronLeft size={17} /></button>
        )}
        <button className="sprig-tap" disabled={!canNext()} onClick={() => last ? finish() : setStep((s) => s + 1)}
          style={{ ...btn(canNext() ? C.lime : C.bg2, canNext() ? "#0A1F12" : C.muted), flex: 1, padding: "14px 0", fontSize: 15, fontWeight: 700 }}>
          {cur.key === "account" ? "Continue without account" : cur.key === "firstAction" ? (firstAction ? "Start" : "Skip for now") : "Continue"} {!last && <ChevronRight size={17} />}
        </button>
      </div>
    </div>
  );
}

export default function SprigRoot() {
  return <ErrorBoundary><SprigApp /></ErrorBoundary>;
}

function SprigApp() {
  const [tab, setTab] = useState("today");
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
  const [foodSub, setFoodSub] = useState("meals");   // meals | nutrition
  const [trainSub, setTrainSub] = useState("training"); // training | analytics
  const [sleepSub, setSleepSub] = useState("sleep");  // sleep | alarm
  const [quickOpen, setQuickOpen] = useState(false);
  const [winsOpen, setWinsOpen] = useState(false);
  const [foodOverlayMode, setFoodOverlayMode] = useState(null); // null | "menu" | "text" | "manual" | "supp"
  const [recapView, setRecapView] = useState(null); // { recap, ts } shown after finishing a workout
  // recordToast: { kind, label, subLabel, exName, phase: "entering"|"visible"|"exiting" }
  // Phase flow: entering (entrance anim) → visible (idle) → exiting (exit anim) → null
  const [recordToast, setRecordToast] = useState(null);
  const recordToastTimers = useRef([]); // pending setTimeout ids — cleared on new PR
  const recordToastPriorityRef = useRef(0); // PR_PRIORITY value of the currently shown toast
  const [flashEntryId, setFlashEntryId] = useState(null); // briefly highlight a newly-logged meal
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [calOpen, setCalOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
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
  const [error, setError] = useState("");
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
  // AI-extracted bloodwork logs: [{id, date, markers:[{name,value,unit,range,status,summary,lifestyle}], summary, actions}]
  const [bloodworkLogs, setBloodworkLogs] = useState([]);
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
        const bwl = await store.get("sprig_bloodwork_v1");
        const pn = await store.get("sprig_pain_v1");
        const hc = await store.get("sprig_habitcfg_v1");
        const hd = await store.get("sprig_habitdone_v1");
        const fs = await store.get("sprig_focus_v1");
        const hb2raw = await store.get("sprig_habits_v2");
        const hc2raw = await store.get("sprig_habit_completions_v2");
        const wns = await store.get("sprig_wins_v1");
        const rm = await store.get("sprig_reminders_v1");
        const pp = await store.get("sprig_progress_photos_v1");

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
        setActiveWorkout(safeParse(aw, null, (v) => (v === null ? null : asObject(v))));
        setCustomRests(safeParse(cr, {}, asObject));
        setRoutines(safeParse(rt, [], asArray));
        setDaily(migrateDaily(safeParse(dy, null)));
        setWeightSeries(safeParse(ws, [], asArray));
        setMeasureSeries(safeParse(ms, [], asArray));
        setPhotoLog(safeParse(ph, [], asArray));
        setHealthSeries(safeParse(hl, [], asArray));
        setBloodworkLogs(safeParse(bwl, [], asArray));
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
    setFoodSub("meals");
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
    if (src === "snap") { setFoodOverlayMode(null); setTimeout(() => fileRef.current?.click(), 0); }
    else if (src === "scan") { setFoodOverlayMode(null); setTimeout(() => labelRef.current?.click(), 0); }
    else if (src === "describe") { setFoodOverlayMode("text"); }
  }
  function openEditFavorite(f) { setFavEditing(f.id); setFavForm({ name: f.name, serving: f.serving, calories: f.calories, protein: f.protein_g, carbs: f.carbs_g, fat: f.fat_g, fiber: f.fiber_g, tags: f.tags || [] }); }
  function closeFavForm() { setFavForm(null); setFavEditing(null); }
  const saveProfile = async (p) => {
    setProfile(p);
    const json = JSON.stringify(p);
    try { console.log("[sprig] saveProfile → writing sprig_profile_v1"); } catch (_) {}
    await store.set("sprig_profile_v1", json);
    // Verify the write actually landed (this is the diagnostic the user asked for).
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const back = window.localStorage.getItem("sprig_profile_v1");
        console.log("[sprig] saveProfile verify: localStorage.getItem('sprig_profile_v1') =", back ? "OK (" + back.length + " bytes)" : "NULL — write did not persist!");
      }
    } catch (e) { console.warn("[sprig] verify read failed:", e); }
  };

  // ---- data export / import / reset ----
  async function gatherAllData() {
    // collect every sprig_* key (handles date-keyed logs too)
    let keys = await store.list("sprig_");
    if (!keys.length) {
      // fallback: known static keys + recent date-keyed ones
      const statics = ["sprig_profile_v1", "sprig_meals_v1", "sprig_favorite_meals_v1", "sprig_history_v1", "sprig_supps_v1", "sprig_sleep_v1", "sprig_alarm_v1", "sprig_workouts_v1", "sprig_rests_v1", "sprig_routines_v1", "sprig_weightseries_v1", "sprig_measure_v1", "sprig_photos_v1", "sprig_health_v1", "sprig_bloodwork_v1", "sprig_pain_v1", "sprig_habitcfg_v1", "sprig_habitdone_v1", "sprig_habits_v2", "sprig_habit_completions_v2", "sprig_focus_v1", "sprig_coach_notes_v1", "sprig_wins_v1"];
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
    const blob = { app: "Sprig", version: 1, exportedAt: new Date().toISOString(), data };
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
      setWriteError({ key: "import", msg: "That file isn't valid JSON. Pick a backup file exported from Sprig.", quota: false, ts: Date.now() });
      return;
    }
    if (!parsed || typeof parsed !== "object") {
      setWriteError({ key: "import", msg: "That file doesn't look like a Sprig backup.", quota: false, ts: Date.now() });
      return;
    }
    const data = parsed.data || parsed;
    let wrote = 0;
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith("sprig_")) { await store.set(k, v); wrote += 1; }
    }
    if (wrote === 0) {
      setWriteError({ key: "import", msg: "No Sprig data found in that file.", quota: false, ts: Date.now() });
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
    // keep a 60-day weight series for the trend
    if (patch.weight != null) {
      const raw = await store.get("sprig_weightseries_v1");
      const series = safeParse(raw, [], asArray);
      const others = series.filter((s) => s.date !== date);
      const ns = [...others, { date, kg: patch.weight }].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
      await store.set("sprig_weightseries_v1", JSON.stringify(ns));
      setWeightSeries(ns);
    }
  }, [daily, date]);
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

  const persistBloodwork = async (next) => { setBloodworkLogs(next); await store.set("sprig_bloodwork_v1", JSON.stringify(next)); };
  const saveBloodworkEntry = (entry) => persistBloodwork([entry, ...bloodworkLogs].slice(0, 20));
  const deleteBloodworkEntry = (id) => persistBloodwork(bloodworkLogs.filter((b) => b.id !== id));

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
    const h = { id: "h_" + uid(), name: (def.name || "").trim() || "Habit", category: def.category || "custom", frequencyType: def.frequencyType || "daily", weeklyTarget: def.weeklyTarget || null, specificDays: def.specificDays || null, reminderEnabled: !!def.reminderEnabled, reminderTime: def.reminderTime || null, createdAt: Date.now(), archived: false, autoHabit: false, notes: def.notes || "" };
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
  async function askCoach(question, ctx) {
    // AI-FIRST. Every real coaching question goes to the model with the user's full structured context.
    // The model decides what's relevant — no more pre-routing by topic or canned templates.
    // localCoachAnswer is reserved for actual API failure + a few simple math/explainer cases.
    //
    // IMPORTANT: we do NOT short-circuit on navigator.onLine here. iOS Safari (and PWAs on iOS in
    // particular) frequently report onLine === false even when connectivity is fine, which would
    // wrongly send every question to the local fallback. Better to actually try the network and
    // fall back on a real error.

    const system = "You are Sprig Coach, an elite evidence-based coach. Answer the user's question directly. Use the user's data only when relevant. Do not give a full audit unless asked. Do not use canned templates. Think like a real coach reviewing a client's data.";

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
      averages14d: {
        calories: ctx?.calAvg ?? null,
        protein_g: ctx?.protAvg ?? null,
      },
      sleep: {
        lastNightHr: sleepLastHr,
        avg7dHr: sleepAvgHr,
        debtMin: ctx?.sleepDebt ?? null,
      },
      bodyWeight: {
        currentKg: profile?.weight ?? null,
        trendKgPerWeek: ctx?.weightRate ?? null,
      },
      training: {
        workoutsThisWeek: ctx?.weeklyWk ?? null,
        stalledLifts: ctx?.stalls || [],
        muscleRecovery: ctx?.muscleRecovery || null,
        trainedToday: ctx?.trainedToday ?? null,
      },
      flags: {
        painActive: !!ctx?.painActive,
        painNotes: ctx?.painNotes || null,
      },
      supplements: ctx?.supplements || null,
      healthReport: healthReport ? { score: healthReport.score, confidence: healthReport.confidence, hurting: healthReport.hurting, improvements: healthReport.improvements } : null,
      bloodwork: bloodworkLogs?.length ? bloodworkLogs[0] : null,
      habits: consistencyV2 ? {
        consistencyPct: consistencyV2.pct,
        activeCount: (habits2 || []).filter((h) => !h.archived).length,
        details: (consistencyV2.details || []).slice(0, 8).map((d) => ({ name: d.habit.name, freq: d.habit.frequencyType, rate: d.rate !== null ? Math.round(d.rate * 100) + "%" : "new" })),
      } : null,
      todayWins: ctx?.todayWins && ctx.todayWins.length ? ctx.todayWins : null,
    };

    const prompt = `User question: "${question}"\n\nUser data (structured): ${JSON.stringify(coachingContext)}\n\nAnswer the question. Use the data only where it actually helps. If todayWins exist and it feels natural, you may briefly acknowledge real progress ("kudos") before the main advice — but only when relevant, and never force it.`;

    let aiError = null;
    try {
      const r = await analyzeText({ prompt, system });
      if (r && r.trim()) return r;
      console.warn("[sprig] askCoach: AI returned empty response");
      aiError = "AI returned an empty response";
    } catch (e) {
      console.error("[sprig] askCoach: AI failed —", e?.message || e);
      aiError = e?.message || String(e);
    }

    // AI failed → minimal local engine. Normal users see a calm message; developers (devMode)
    // also see the underlying error so they can diagnose. Raw HTTP/API errors never reach end users.
    const localAnswer = localCoachAnswer(question, ctx, profile, targets);
    if (profile?.devMode) return localAnswer + "\n\n_Debug: " + aiError + "_";
    return localAnswer;
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
    persistActive({ ...activeWorkout, exercises: [...activeWorkout.exercises, { name, group: meta?.group, sets: [] }] });
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
          // Custom haptic: two-pulse pattern that reads as "achievement" not just "complete"
          try { navigator.vibrate?.([18, 30, 18]); } catch (_) {}
          // Phase 1 — entering (entrance animation plays)
          setRecordToast({ ...pr, exName, phase: "entering" });
          // Phase 2 — visible (entrance done, idle)
          const t1 = setTimeout(() =>
            setRecordToast(t => t && t.phase === "entering" ? { ...t, phase: "visible" } : t),
            440); // matches recordToastIn duration
          // Phase 3 — exiting (exit animation plays, ~2s after fully visible)
          const t2 = setTimeout(() =>
            setRecordToast(t => t ? { ...t, phase: "exiting" } : t),
            440 + 2000);
          // Phase 4 — unmount (after exit anim completes)
          const t3 = setTimeout(() => {
            setRecordToast(null);
            recordToastPriorityRef.current = 0;
          }, 440 + 2000 + 300);
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
  function cancelWorkout() { persistActive(null); }
  function woSetExercisePain(exIdx, level) {
    const ex = activeWorkout.exercises.map((e, i) => i === exIdx ? { ...e, pain: level } : e);
    persistActive({ ...activeWorkout, exercises: ex });
  }

  async function runAnalysis(opts) {
    setError(""); setBusy(true); setFoodOverlayMode(null);
    try {
      const res = await analyze(opts);
      setResult(res); setResultMode(opts.mode);
    } catch (e) {
      setError("AI analysis is unavailable. You can still add this manually.");
    } finally { setBusy(false); }
  }

  async function onFile(e, mode) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setError(""); setBusy(true);
    try {
      const img = await resizeImage(f);
      await runAnalysis({ image: img, mode });
    } catch { setBusy(false); setError("Couldn't read that image."); }
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
      recordWins(detectDayWins({ t: nextT, daily, targets, sleepInfo: { waterGoal: profile?.weight ? Math.round(profile.weight * 35) : 2500 }, profile }), date);
    } catch (_) {}
    // remember text-described meals automatically
    if (resultMode === "text") {
      const exists = library.some((l) => l.name.toLowerCase() === r.name.toLowerCase());
      if (!exists) persistLibrary([{ ...entry, id: uid(), mult: 1 }, ...library].slice(0, 60));
    }
    setResult(null);
    setTab("nutrition");
    setFoodSub("meals");   // land on the Meals subtab where the new entry is listed
    setFlashEntryId(entry.id); setTimeout(() => setFlashEntryId((id) => (id === entry.id ? null : id)), 2200);
    logged("Meal added", "light");
  }

  function logFromLibrary(meal) {
    const entry = { ...meal, id: uid(), mult: 1, time: Date.now() };
    persistEntries((prev) => [...prev, entry]);
    setTab("nutrition");
    setFoodSub("meals");
    setFlashEntryId(entry.id); setTimeout(() => setFlashEntryId((id) => (id === entry.id ? null : id)), 2200);
    logged("Meal added", "light");
  }
  function addManual(m) {
    const entry = {
      id: uid(), name: m.name || "Quick entry", serving: "manual",
      calories: +m.calories || 0, protein_g: +m.protein || 0, carbs_g: +m.carbs || 0,
      fat_g: +m.fat || 0, fiber_g: +m.fiber || 0, micros: {}, omega3: null, mult: 1, time: Date.now(),
    };
    const commit = () => { persistEntries((prev) => [...prev, entry]); setFoodOverlayMode(null); setTab("nutrition"); setFoodSub("meals"); setFlashEntryId(entry.id); setTimeout(() => setFlashEntryId((id) => (id === entry.id ? null : id)), 2200); logged("Meal added", "light"); };
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
    const cands = detectDayWins({ t, daily, targets, sleepInfo: { waterGoal: profile?.weight ? Math.round(profile.weight * 35) : 2500 }, profile });
    if (cands.length) recordWins(cands, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.protein, t.calories, t.fiber, daily?.water, daily?.steps, daily?.cardioMin, daily?.checkin, ready, date]);

  // ---- training derivations (synced to sleep + yesterday's alcohol) ----
  const alcHit = alcoholImpact(daily?.alcohol || 0).recoveryHit;
  const sleepReadiness = lastSleep
    ? Math.max(20, Math.min(100, Math.round(lastSleep.score - debtMin / 30 - alcHit)))
    : Math.max(30, Math.round(82 - debtMin / 30 - alcHit));
  const recovery = muscleRecovery(workouts, sleepReadiness);
  const volume = weeklyVolume(workouts);
  const muscleReadyAvg = MUSCLES.reduce((a, [k]) => a + (100 - recovery[k].fatigue), 0) / MUSCLES.length;
  const bodyReadiness = Math.round(muscleReadyAvg * 0.6 + sleepReadiness * 0.4);
  const readyMuscles = MUSCLES.filter(([k]) => recovery[k].recovered && recovery[k].lastTs).map(([, n]) => n);
  const freshMuscles = MUSCLES.filter(([k]) => recovery[k].fatigue < 30).map(([, n]) => n);
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
  const healthReport = computeHealthReport({
    history7: (history || []).filter((h) => Date.now() - new Date(h.date).getTime() < 7 * 864e5),
    sleepLogs7: (sleepLogs || []).filter((l) => !l.ignoredFromScore && l.waketime > Date.now() - 7 * 864e5),
    workouts7: (workouts || []).filter((w) => w.ts > Date.now() - 7 * 864e5),
    daily, t, targets, profile, sleepInfo, trainInfo, moveInfo, nutriInfo,
  });

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
  const trainedToday = workouts.some((w) => (w.date || getSprigDate(w.ts, latestSleepLog, profile?.dayResetMode || "after-wake")) === date);
  const suggestion = suggestSplit({ workouts, recovery, volume, sleepReadiness, debtMin, daily, trainedToday, routines });
  trainInfo.suggestion = suggestion;
  const subScores = dailyScores({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile });
  const healthScore = dailyHealthScore(subScores);
  const funcHealth = functionalHealth({ subScores, sleepInfo, trainInfo, daily, healthInfo, profile, targets, t, trainedToday });
  const actions = bestActions({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile });
  const dailyInfo = { daily, weightSeries, subScores, healthScore, funcHealth, actions, trainedToday };

  // End-of-day quick-log nudge (gentle; never affects the score).
  const lastLogTs = Math.max(
    0,
    ...(entries || []).map((e) => e.time || e.ts || 0),
    daily?.lastTouchTs || 0,
    ...(sleepLogs || []).map((l) => l.ts || 0),
  ) || null;
  const bedNudge = bedtimeReminder({
    nowTs: Date.now(), recBedMin: sleepInfo?.rec?.recBed, lastLogTs,
    t, targets, daily, waterGoalMl: waterGoal(profile), trainedToday,
  });

  // nutrition coaching
  const dietQ = dietQuality(t, targets, daily, profile);
  const missing = missingNutrients(t, targets);
  const coach = nutritionCoach(t, targets, profile, weightSeries);
  const nutriInfo = { dietQ, missing, coach, waterGoal: waterGoal(profile) };

  // ---- mind & habits ----
  const waterGoalMl = waterGoal(profile);
  const habits = activeHabits(habitConfig);
  // ctx for auto-habit detection (today)
  const habitCtxToday = { t, targets, daily, waterGoalMl, trainedToday, supps, takenIds };
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
    if (d === date) ctxByDate[d] = habitCtxToday;
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
  const mindInfo = {
    checkin: daily.checkin || {}, habits: habitsTodayState, consistency,
    focusToday, focusWeek, focusMinutesToday: focusToday.reduce((a, f) => a + f.minutes, 0),
    hiddenDefaults: (habitConfig?.hidden || []).map((id) => DEFAULT_HABITS.find((h) => h.id === id)).filter(Boolean),
    // V2
    habits2, habitCompletions, habitStatusMap, consistencyV2,
  };

  // rule-based coach (no AI) — synthesizes everything above into 4 cards
  const coach2 = coachReport({ t, targets, sleepInfo, trainInfo, nutriInfo, dailyInfo, daily, profile, workouts });

  // weekly report (rule-based)
  const report = weeklyReport({ history, workouts, sleepLogs, weightSeries, daily, dailyHistory, painLogs, focusSessions, consistency, targets, profile, sleepInfo });

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
  // overwrite nutriInfo.waterGoal to use the smart-hydration goal so it's consistent everywhere
  nutriInfo.waterGoal = hydration.goal;
  nutriInfo.needsElectrolytes = hydration.needsElectrolytes;
  // achievements
  const achievements = detectAchievements({ workouts, weightSeries, sleepLogs, history, focusSessions, dailyHistory, painLogs });
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
      setOnboarded(true);
      // route to the chosen first action (premium "first successful action" moment)
      if (action === "food") { setTab("nutrition"); setFoodOverlayMode("menu"); }
      else if (action === "workout") { setTab("train"); }
      else if (action === "sleep") { setTab("sleep"); setSleepSub("alarm"); }
      else if (action === "coach") { setTab("coach"); setAskOpen(true); }
      else setTab("today");
      setTimeout(() => { try { showToast("Nice — Sprig is ready", "success"); haptic("success"); } catch (_) {} }, 400);
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
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1 }}>Sprig</div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>fuel &amp; rest, the lazy way</div>
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
            dailyInfo={dailyInfo} nutriInfo={nutriInfo} healthInfo={healthInfo} mindInfo={mindInfo} moveInfo={moveInfo} onDaily={persistDaily} onAddEntry={addEntry} onCheckin={setCheckin} onQuickLog={() => setQuickOpen(true)}
            onStartWorkout={() => { startWorkout(); setTab("train"); }}
            onGoSleep={() => setTab("sleep")} onGoEnergy={() => setTab("energy")} onGoBody={() => setTab("progress")} onGoHealth={() => setTab("health")} onGoMind={() => setTab("mind")}
            onGoNutrition={() => setTab("nutrition")} onGoTrain={() => setTab("train")}
            wins={(profile?.showWins === false) ? null : (wins[date] || [])} onKudos={(id) => kudoWin(id, date)} onViewAllWins={() => setWinsOpen(true)}
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
            onSnapFood={() => { setResult(null); fileRef.current?.click(); }}
            onScanLabel={() => { setResult(null); labelRef.current?.click(); }}
            onDescribe={() => { setFoodOverlayMode("text"); setResult(null); }}
            onManual={() => { setFoodOverlayMode("manual"); setResult(null); }}
            onOpenCreateFavorite={openFavoriteChooser} onOpenEditFavorite={openEditFavorite}
            onFavoriteDuplicate={(form, existing) => setFavDup({ form, existing })}
            onOpenLogSheet={() => setFoodOverlayMode("menu")} flashEntryId={flashEntryId} />
        )}
        {tab === "train" && (
          <TrainTab workouts={workouts} active={activeWorkout} profile={profile} trainInfo={trainInfo} advanced={advanced}
            sub={trainSub} onSub={setTrainSub}
            routines={routines} onSaveRoutine={saveRoutine} onDeleteRoutine={deleteRoutine} onUseTemplate={useTemplate}
            onStart={startWorkout} onAddExercise={addWoExercise} onLogSet={woLogSet} onSetRir={woSetRir} onOpenRirPrompt={(exIdx, setIdx) => setRirPrompt({ exIdx, setIdx })} onRemoveSet={woRemoveSet}
            onRemoveExercise={woRemoveExercise} onFinish={finishWorkout} onCancel={cancelWorkout}
            onSaveRest={saveRest} onSetExercisePain={woSetExercisePain} onGoBody={() => setTab("progress")} onGoHealth={() => setTab("health")}
            onStartRest={startRest} restActive={!!rest}
            moveInfo={moveInfo} daily={daily} onDaily={persistDaily} sleepInfo={sleepInfo} rirPref={rirPref} />
        )}
        {(tab === "progress" || tab === "body" || tab === "trends") && (
          <>
            <BodyTab workouts={workouts} profile={profile} trainInfo={trainInfo} sleepInfo={sleepInfo} advanced={advanced}
              weightSeries={weightSeries} measureSeries={measureSeries} photoLog={photoLog}
              onLogWeight={(kg) => persistDaily({ weight: kg })} onSaveMeasurement={saveMeasurement} onLogPhotoSet={logPhotoSet}
              onOpenPhotos={() => setPhotoOpen(true)} progressPhotosCount={progressPhotos.length} />
            <TrendsTab history={history} targets={targets} t={t} scores={scores} sleepLogs={sleepLogs} sleepInfo={sleepInfo} advanced={advanced} report={report} profile={profile} achievements={achievements} timeline={timeline} />
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
          pain={trainInfo.pain} onAddPain={addPainLog} onUpdatePain={updatePainLog} onRemovePain={removePainLog}
          bloodwork={bloodworkLogs} onSaveBloodwork={saveBloodworkEntry} onDeleteBloodwork={deleteBloodworkEntry} />}
        {tab === "mind" && <MindTab mindInfo={mindInfo} advanced={advanced} profile={profile} today={date}
          onToggleHabit2={(id) => toggleHabit2(id, date)} onAddHabit2={addHabit2} onEditHabit2={editHabit2}
          onArchiveHabit2={archiveHabit2} onRestoreHabit2={restoreHabit2} onDeleteHabit2={deleteHabit2}
          onUndoCompletion={undoHabitCompletion} />}
        {tab === "coach" && <CoachTab coach={coach2} advanced={advanced} moveInfo={moveInfo} timeline={timeline} plateaus={plateaus} patterns={patterns}
          onGoTrain={() => setTab("train")} onGoMeals={() => setTab("nutrition")} onGoSleep={() => setTab("sleep")} onGoHealth={() => setTab("health")} onAsk={() => setAskOpen(true)} />}
        {(tab === "more" || tab === "me") && <MoreTab onGoTargets={() => setTab("targets")} onGoHealth={() => setTab("health")} onGoMind={() => setTab("mind")} onGoProgress={() => setTab("progress")} />}
        {tab === "targets" && <MeTab view="targets" onBack={() => setTab("more")} profile={profile} targets={targets} onSave={saveProfile}
          onExportJSON={exportJSON} onExportCSV={exportCSV} onImportJSON={importJSON} onResetData={resetAllData} onLoadDemo={loadDemoData}
          reminders={reminders} onSaveReminders={persistReminders} sleepInfo={sleepInfo} />}
        {tab === "settings" && <MeTab view="settings" onBack={() => setTab("today")} profile={profile} targets={targets} onSave={saveProfile}
          themeMode={themeMode} onSetTheme={setTheme}
          onExportJSON={exportJSON} onExportCSV={exportCSV} onImportJSON={importJSON} onResetData={resetAllData} onLoadDemo={loadDemoData}
          reminders={reminders} onSaveReminders={persistReminders} sleepInfo={sleepInfo}
          onResetOnboarding={() => { setTab("today"); setOnboarded(false); }} />}
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
          <div className="sprig-dim" onClick={() => { if (!busy) { setFoodOverlayMode(null); setResult(null); setFavoriteMode(false); setError(""); setDraft(""); } }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000,
              paddingBottom: kb }}>
            <div onClick={(e) => e.stopPropagation()} className="sprig-sheet"
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
                      [() => { setResult(null); setFoodOverlayMode(null); setTimeout(() => fileRef.current?.click(), 50); }, Camera, "Snap food", "Photo → AI estimate"],
                      [() => { setResult(null); setFoodOverlayMode(null); setTimeout(() => labelRef.current?.click(), 50); }, ScanLine, "Scan label", "Nutrition label → AI"],
                      [() => { setResult(null); setDraft(""); setFoodOverlayMode("text"); }, PencilLine, "Describe", "Type it, AI estimates"],
                      [() => { setResult(null); setFoodOverlayMode("manual"); }, Calculator, "Manual", "Enter values yourself"],
                    ].map(([fn, Ic, title, subt]) => (
                      <button key={title} className="sprig-tap" onClick={fn}
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
                    {error && <div style={{ background: "#fdeee8", color: C.coral, fontSize: 12, padding: "10px 12px", borderRadius: 12, marginBottom: 10 }}>{error}</div>}

                    {busy && (
                      <div className="sprig-rise" style={{ background: C.card, borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 10, boxShadow: C.shadow, marginBottom: 14 }}>
                        <Loader2 size={18} color={C.green} style={{ animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: 13.5, color: C.inkSoft }}>
                          {resultMode === "supplement" || resultMode === "supp-label" ? "Reading your supplement…" : "Reading your food…"}
                        </span>
                      </div>
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
                          onCancel={() => { setResult(null); setFavoriteMode(false); }}
                        />
                      </div>
                    )}

                    {foodOverlayMode === "supp" && !busy && !result && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.greenSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                          <Pill size={14} /> New supplement
                        </div>
                        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus onFocus={scrollIntoViewOnFocus}
                          placeholder="e.g. Vitamin D3 2000 IU + magnesium glycinate 400mg, or omega-3 fish oil 1000mg"
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
                  </div>

                  {/* Sticky footer — always visible above keyboard */}
                  {!busy && !result && (foodOverlayMode === "text" || foodOverlayMode === "supp") && (
                    <div style={{ position: "sticky", bottom: 0, background: C.isDark ? "#102018" : "#FFFFFF", borderTop: `1px solid ${C.line}`, padding: "12px 18px", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)", display: "flex", gap: 8, flexShrink: 0 }}>
                      <button className="sprig-tap" onClick={() => { setFoodOverlayMode(null); setDraft(""); setFavoriteMode(false); }} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "13px 0" }}>Cancel</button>
                      {foodOverlayMode === "supp" && (
                        <button className="sprig-tap" onClick={() => suppLabelRef.current?.click()} style={{ ...btn(C.bg2, C.ink), flex: 1, padding: "13px 0" }}><ScanLine size={15} /> Scan</button>
                      )}
                      <button className="sprig-tap" disabled={!draft.trim()} onClick={() => { runAnalysis({ text: draft, mode: foodOverlayMode === "supp" ? "supplement" : "text" }); setDraft(""); }}
                        style={{ ...btn(draft.trim() ? C.lime : C.bg2, draft.trim() ? "#0A1F12" : C.muted), flex: 1.8, padding: "13px 0", fontWeight: 700 }}>
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

      {/* tab bar — portaled to document.body so it is never clipped by the app-frame's
          overflow:hidden / border-radius stacking context on iOS Safari. */}
      <Portal>
      <div className="sprig-tabbar sprig-glass" style={{ display: "flex", borderTop: `1px solid ${C.line}`, background: C.navBg, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[["today", Home, "Today"], ["nutrition", Flame, "Food"], ["train", Dumbbell, "Train"], ["sleep", Moon, "Sleep"], ["coach", Sparkles, "Coach"], ["more", User, "More"]].map(([k, Ic, lbl]) => (
          <button key={k} onClick={() => { setTab(k); setResult(null); setFoodOverlayMode(null); setError(""); setFavoriteMode(false); }}
            style={{ flex: 1, minWidth: 0, background: "none", border: "none", cursor: "pointer", padding: "10px 4px 13px", minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab === k ? C.lime : C.muted }}>
            <Ic size={20} strokeWidth={tab === k ? 2.4 : 2} />
            <span style={{ fontSize: 10, fontWeight: tab === k ? 700 : 500, whiteSpace: "nowrap" }}>{lbl}</span>
          </button>
        ))}
      </div>
      </Portal>

      {/* Floating "+ Log food" — page-level, centered above the bottom nav, only on the Food tab.
          Stays visible while the Food list scrolls; never sits inside the scrolled content. */}
      {tab === "nutrition" && !foodOverlayMode && !busy && !result && !activeWorkout && (
        <Portal>
          <button className="sprig-tap" onClick={() => setFoodOverlayMode("menu")}
            style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 14px)", zIndex: 1500, ...btn(C.lime, "#0A1F12"), padding: "13px 22px", fontSize: 15, fontWeight: 700, borderRadius: 99, boxShadow: `0 8px 24px ${C.lime}55, 0 2px 8px rgba(0,0,0,.25)`, display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
            <Plus size={18} /> Log food
          </button>
        </Portal>
      )}

      {/* ── New Record achievement toast ──
          Phase-based: entering → visible → exiting → unmounted.
          Portaled to body so it's never clipped by overflow:hidden ancestors.
          z-index 4000 puts it above every overlay including the rest timer (1600). */}
      {recordToast && (
        <Portal>
          {/* Subtle lime bloom behind the toast — fades in with the card, fades out on exit */}
          <div style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 64px)",
            left: "50%",
            zIndex: 3999,
            width: 260,
            height: 56,
            borderRadius: 99,
            background: `radial-gradient(ellipse at 50% 50%, ${C.lime}2A 0%, transparent 72%)`,
            pointerEvents: "none",
            animation: recordToast.phase === "exiting"
              ? "recordToastOut .28s cubic-bezier(.5,0,1,1) both"
              : "recordBgBloom .7s ease-out both",
            transform: "translateX(-50%)",
          }} />
          {/* Toast card */}
          <div
            className={`record-toast${recordToast.phase === "exiting" ? " record-toast-exit" : ""}`}
            style={{
              position: "fixed",
              top: "calc(env(safe-area-inset-top, 0px) + 64px)",
              left: "50%",
              zIndex: 4000,
              // Dark glass card — matches Vitae dark forest aesthetic
              background: C.isDark
                ? "rgba(14, 36, 20, 0.95)"
                : "rgba(255, 255, 255, 0.97)",
              border: `1.5px solid ${C.lime}`,
              borderRadius: 20,
              padding: "11px 18px 11px 11px",
              display: "flex",
              alignItems: "center",
              gap: 11,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              maxWidth: "min(92vw, 420px)",
              minWidth: 210,
              cursor: "default",
              pointerEvents: "none",
              // transform is managed entirely by the CSS animation — do NOT set it here
              // or it will fight with translateX(-50%) in the keyframes
            }}
          >
            {/* Medal icon — has its own pop animation */}
            <div className="record-icon" style={{
              width: 38,
              height: 38,
              borderRadius: 99,
              background: `radial-gradient(circle at 50% 32%, ${C.lime}, ${C.green})`,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              boxShadow: `0 0 14px ${C.lime}55`,
            }}>
              <Medal size={18} color="#0A1F12" />
            </div>
            {/* Text block */}
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
              <span style={{
                fontSize: 14,
                fontWeight: 700,
                color: C.ink,
                lineHeight: 1.2,
                letterSpacing: "-0.015em",
              }}>
                New Record
              </span>
              <span style={{
                fontSize: 11.5,
                color: C.muted,
                marginTop: 2.5,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {recordToast.exName} · {recordToast.label}
              </span>
              {recordToast.subLabel && (
                <span style={{
                  fontSize: 10.5,
                  color: C.greenSoft,
                  fontWeight: 600,
                  marginTop: 1.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {recordToast.subLabel}
                </span>
              )}
            </div>
          </div>
        </Portal>
      )}

      {/* Floating rest timer — portaled to document.body + fixed so it stays pinned above the
          tab bar no matter how far the user scrolls the exercise list (frame has overflow:hidden
          + transformed ancestors that would otherwise clip an absolute/fixed child). */}
      {activeWorkout && rest && (restLeft > 0 || restDone) && (
        <Portal>
        <div className="sprig-pop-centered" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", width: "min(92vw, 430px)", bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 14px)", background: restDone && restLeft <= 0 ? C.green : "#27384d", borderRadius: 16, padding: "10px 14px", color: "#fff", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 30px rgba(0,0,0,.32)", zIndex: 1600 }}>
          <Timer size={18} color={restDone && restLeft <= 0 ? "#fff" : "#BFD0FF"} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, opacity: .75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {restLeft <= 0 ? "REST COMPLETE" : `REST · ${rest.exName}`}
            </div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700 }}>{restLeft <= 0 ? "Go!" : fmtClock(restLeft)}</div>
          </div>
          {restLeft > 0 && (
            <>
              <button className="sprig-tap" onClick={() => (rest.paused ? resumeRest() : pauseRest())} aria-label={rest.paused ? "Resume" : "Pause"}
                style={{ ...btn("rgba(255,255,255,.15)", "#fff"), padding: "7px 9px", fontSize: 12 }}>
                {rest.paused ? <Play size={13} /> : <span style={{ fontWeight: 700, letterSpacing: 1 }}>II</span>}
              </button>
              <button className="sprig-tap" onClick={() => addRest(30000)} style={{ ...btn("rgba(255,255,255,.15)", "#fff"), padding: "7px 9px", fontSize: 12 }}>+30s</button>
            </>
          )}
          <button className="sprig-tap" onClick={skipRest} style={{ ...btn("rgba(255,255,255,.15)", "#fff"), padding: "7px 9px", fontSize: 12 }}>{restLeft <= 0 ? "Done" : "Skip"}</button>
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

      {quickOpen && <QuickLogSheet ci={daily.checkin || {}} daily={{ ...daily, trainedToday }} sleepInfo={sleepInfo} profile={profile}
        painActive={trainInfo.pain?.level !== "none"} onCheckin={setCheckin} onDaily={persistDaily}
        onClose={() => setQuickOpen(false)} />}

      {/* All of today's wins */}
      {winsOpen && (
        <Portal>
        <div onClick={() => setWinsOpen(false)} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
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
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.lime, letterSpacing: .5, marginBottom: 8 }}>NEW BESTS</div>
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
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: .5, marginBottom: 8 }}>EXERCISES</div>
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
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.lime, letterSpacing: .5, marginBottom: 6 }}>KUDOS EARNED</div>
                  {dayWins.map((w) => <WinRow key={w.id} win={w} onKudos={(id) => kudoWin(id, date)} />)}
                </div>
              )}
              {/* action buttons */}
              <div style={{ display: "flex", gap: 8, padding: "12px 0 2px" }}>
                <button className="sprig-tap" onClick={() => { setRecapView(null); setTab("train"); setTrainSub("analytics"); }}
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
        <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,.5)", zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div className="sprig-sheet sprig-bottom-sheet"
            style={{ width: "100%", maxWidth: 440, background: C.cardSolid, borderRadius: "20px 20px 0 0", padding: "22px 18px", paddingBottom: "calc(22px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -8px 30px rgba(0,0,0,.25)" }}>

            {/* Step 1 — rep range */}
            {rrpStep === "rep_range" && <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, textAlign: "center", color: C.ink }}>What rep range do you train in?</div>
              <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", marginTop: 6, marginBottom: 18, lineHeight: 1.5 }}>
                Sprig uses this to guide progressive overload. You can change it anytime in Settings.
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
                After each set, Sprig can ask how many reps you had left — this makes overload suggestions more accurate.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { val: "always",    title: "After every set",    sub: "Most accurate — great for serious tracking" },
                  { val: "hard_sets", title: "On working sets only", sub: "Skip warmups, ask on heavier sets" },
                  { val: "off",       title: "Don't ask",          sub: "Sprig will use rep count alone" },
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
                Sprig uses this to calibrate when to push harder vs. when to hold steady.
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
        <div onClick={() => setFavChooser(false)} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
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
        <div onClick={() => setFavDup(null)} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 24 }}>
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
        <div style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", background: writeError.quota ? C.coral : C.amber, color: "#fff", padding: "9px 14px", borderRadius: 11, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 6px 20px rgba(0,0,0,.18)", fontSize: 12, fontFamily: "DM Sans", zIndex: 4000, maxWidth: 380 }}>
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
      )}

      {/* mistake-detection confirmation (Fix 9) */}
      {pendingConfirm && (
        <div onClick={() => setPendingConfirm(null)} className="sprig-dim"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 340, background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: 18, padding: 20, boxShadow: "0 18px 45px rgba(0,0,0,.45)" }}>
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
      )}

      {/* undo toast — appears after a delete and gives a few seconds to bring it back */}
      {undoItem && (
        <div className="sprig-bottom-toast sprig-toast-anim" style={{ position: "fixed", bottom: 76, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", padding: "11px 16px", borderRadius: 99, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 6px 20px rgba(0,0,0,.25)", fontSize: 12.5, fontFamily: "DM Sans", zIndex: 4000 }}>
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
      )}

      {/* calm success/info toast */}
      {toast && !undoItem && (
        <div className="sprig-bottom-toast sprig-toast-anim" style={{ position: "fixed", bottom: 76, left: "50%", transform: "translateX(-50%)", background: toast.tone === "error" ? C.coral : C.ink, color: "#fff", padding: "10px 16px", borderRadius: 99, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 6px 20px rgba(0,0,0,.22)", fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", zIndex: 4000 }}>
          {toast.tone !== "error" && <Check size={14} color={C.leaf} />}
          <span>{toast.text}</span>
        </div>
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

/* ---------------- Today: command-center helpers -------------- */
function ScoreDonut({ score, size = 92 }) {
  const col = score >= 70 ? C.greenSoft : score >= 50 ? C.amber : C.coral;
  const r = (size - 14) / 2, circ = 2 * Math.PI * r, off = circ * (1 - score / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .7s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9.5, opacity: .7 }}>/ 100</span>
      </div>
    </div>
  );
}
const ACTION_ICON = {
  train: <Dumbbell size={16} />, rest: <BedDouble size={16} />, pain: <HeartPulse size={16} />,
  protein: <Flame size={16} />, food: <Flame size={16} />, walk: <Activity size={16} />,
  water: <Coffee size={16} />, sleep: <Moon size={16} />, done: <Check size={16} />,
};
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
/* ---------------- cardio session quick-log card -------------- */
function CardioCard({ daily, profile, onDaily }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("walking");
  const [minutes, setMinutes] = useState(20);
  const [intensity, setIntensity] = useState("moderate");
  const sessions = Array.isArray(daily?.cardioSessions) ? daily.cardioSessions : [];
  const totalMin = sessions.reduce((a, s) => a + (s.minutes || 0), 0);
  const totalKcal = sessions.reduce((a, s) => a + cardioKcal(s.minutes, s.intensity, profile?.weight), 0);

  const add = () => {
    if (!minutes || minutes < 1) return;
    const sess = { id: uid(), ts: Date.now(), type, minutes, intensity };
    const next = [...sessions, sess];
    const sumMin = next.reduce((a, s) => a + (s.minutes || 0), 0);
    const sumKcal = next.reduce((a, s) => a + cardioKcal(s.minutes, s.intensity, profile?.weight), 0);
    onDaily({ cardioSessions: next, cardioMin: sumMin, cardioKcal: sumKcal });
    setOpen(false);
    setMinutes(20);
  };
  const removeSess = (id) => {
    const next = sessions.filter((s) => s.id !== id);
    const sumMin = next.reduce((a, s) => a + (s.minutes || 0), 0);
    const sumKcal = next.reduce((a, s) => a + cardioKcal(s.minutes, s.intensity, profile?.weight), 0);
    onDaily({ cardioSessions: next, cardioMin: sumMin, cardioKcal: sumKcal });
  };
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: "12px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Activity size={14} color="#5B9BD5" />
        <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Cardio today</div>
        {sessions.length > 0 && <span style={{ fontSize: 11.5, color: C.muted }}>{totalMin}m · ~{totalKcal} kcal</span>}
      </div>
      {sessions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {sessions.map((s) => {
            const meta = CARDIO_TYPES.find(([k]) => k === s.type) || ["other", "Other", "💨"];
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.ink, padding: "5px 0" }}>
                <span style={{ fontSize: 14 }}>{meta[2]}</span>
                <span style={{ flex: 1 }}>{meta[1]} · {s.minutes}m · <span style={{ color: C.muted }}>{s.intensity}</span></span>
                <span style={{ color: C.muted, fontSize: 11.5 }}>~{cardioKcal(s.minutes, s.intensity, profile?.weight)} kcal</span>
                <button className="sprig-tap" onClick={() => removeSess(s.id)} aria-label="Remove" style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: 2 }}><X size={12} /></button>
              </div>
            );
          })}
        </div>
      )}
      {!open ? (
        <button className="sprig-tap" onClick={() => setOpen(true)} style={{ width: "100%", background: C.bg2, border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 0", fontSize: 12, fontWeight: 600, color: "#5B9BD5", fontFamily: "DM Sans" }}>
          <Plus size={12} /> Add cardio session
        </button>
      ) : (
        <div style={{ background: C.bg, borderRadius: 11, padding: 10 }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {CARDIO_TYPES.map(([k, lbl, emoji]) => (
              <button key={k} className="sprig-tap" onClick={() => setType(k)} style={{ flex: "1 0 28%", border: "none", cursor: "pointer", padding: "6px 4px", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: "DM Sans", background: type === k ? "#5B9BD5" : C.bg2, color: type === k ? "#fff" : C.muted }}>
                {emoji} {lbl}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, width: 60 }}>Minutes</span>
            <input value={minutes} onChange={(e) => setMinutes(parseInt(e.target.value) || 0)} inputMode="numeric"
              style={{ flex: 1, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 4px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg }} />
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 9 }}>
            {[["easy", "Easy"], ["moderate", "Moderate"], ["hard", "Hard"]].map(([k, lbl]) => (
              <button key={k} className="sprig-tap" onClick={() => setIntensity(k)} style={{ flex: 1, border: "none", cursor: "pointer", padding: "6px 0", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: "DM Sans", background: intensity === k ? C.green : C.bg2, color: intensity === k ? "#fff" : C.muted }}>{lbl}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="sprig-tap" onClick={() => setOpen(false)} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "8px 0", fontSize: 12 }}>Cancel</button>
            <button className="sprig-tap" onClick={add} style={{ ...btn(C.green, "#fff"), flex: 1, padding: "8px 0", fontSize: 12 }}>Save</button>
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6, lineHeight: 1.5, textAlign: "center" }}>
            ~{cardioKcal(minutes, intensity, profile?.weight)} kcal estimated. Calories burned are estimates.
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- shared Movement & Cardio card (Today + Train) -------------- */
// Reuses daily.steps + CardioCard so Today and Train edit the exact same data via onDaily (Sprig day).
function MovementCard({ daily, profile, onDaily, compact }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const steps = daily.steps || 0;
  const goal = stepGoal(profile);
  const cardioMin = daily.cardioMin || 0;
  const cardioK = daily.cardioKcal || 0;
  const bump = (n) => { onDaily({ steps: Math.max(0, steps + n) }); buzz("light"); };
  const saveEdit = () => { const v = parseInt(draft, 10); if (Number.isFinite(v) && v >= 0) { onDaily({ steps: v }); buzz("light"); } setEditing(false); setDraft(""); };
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Activity size={16} color={C.greenSoft} />
        <div style={{ flex: 1, fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600 }}>Movement &amp; cardio</div>
        <span style={{ fontSize: 11.5, color: C.muted }}>{steps.toLocaleString()} / {goal.toLocaleString()}</span>
      </div>
      <ProgressBar pct={Math.round((steps / goal) * 100)} color={steps >= goal ? C.greenSoft : C.green} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11.5, color: C.inkSoft }}>
        <span>{steps >= goal ? "Step goal hit 🏃" : `${Math.max(0, goal - steps).toLocaleString()} to goal`}</span>
        {cardioMin > 0 && <span>{cardioMin} min cardio · ~{cardioK} kcal</span>}
      </div>
      {/* quick step actions */}
      {!editing ? (
        <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
          <button className="sprig-tap" onClick={() => bump(1000)} style={{ ...btn(C.bg2, C.green), padding: "9px 13px", fontSize: 12.5 }}><Plus size={13} /> 1k steps</button>
          <button className="sprig-tap" onClick={() => bump(2500)} style={{ ...btn(C.bg2, C.green), padding: "9px 13px", fontSize: 12.5 }}><Plus size={13} /> 2.5k steps</button>
          <button className="sprig-tap" onClick={() => { setDraft(String(steps)); setEditing(true); }} style={{ ...btn(C.bg2, C.inkSoft), padding: "9px 13px", fontSize: 12.5 }}><PencilLine size={13} /> Edit steps</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
          <input type="number" inputMode="numeric" min="0" value={draft} autoFocus onChange={(e) => setDraft(e.target.value)} placeholder="Steps today"
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
          <button className="sprig-tap" onClick={saveEdit} style={{ ...btn(C.green, "#fff"), padding: "9px 15px", fontSize: 12.5 }}>Save</button>
          <button className="sprig-tap" onClick={() => { setEditing(false); setDraft(""); }} style={{ ...btn(C.bg2, C.inkSoft), padding: "9px 13px", fontSize: 12.5 }}>Cancel</button>
        </div>
      )}
      {/* full cardio logger (reused) */}
      <div style={{ marginTop: 4 }}>
        <CardioCard daily={daily} profile={profile} onDaily={onDaily} />
      </div>
      {!compact && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 9, lineHeight: 1.5 }}>
          Steps and cardio feed your daily calorie adjustment and recovery.
        </div>
      )}
    </div>
  );
}

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
function MealShortcutsCard({ shortcuts, onLog }) {
  if (!shortcuts) return null;
  const { currentSlot, slotSugg, frequent, sameAsYesterday, hasYesterday } = shortcuts;
  const slotLabel = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner" }[currentSlot];
  if (!hasYesterday && !slotSugg.length && !frequent.length) return null;
  const Pill = ({ entry, sub }) => (
    <button className="sprig-tap" onClick={() => onLog(entry)}
      style={{ background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 9, padding: "8px 11px", display: "flex", alignItems: "center", gap: 7, fontFamily: "DM Sans" }}>
      <Plus size={11} color={C.green} />
      <span style={{ flex: 1, textAlign: "left", fontSize: 12, color: C.ink, fontWeight: 600 }}>{entry.name}</span>
      <span style={{ fontSize: 10.5, color: C.muted }}>{sub || `${Math.round(entry.calories || 0)} kcal`}</span>
    </button>
  );
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: "12px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <Repeat size={13} color={C.greenSoft} />
        <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Quick add from history</div>
      </div>
      {hasYesterday && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, letterSpacing: .3, marginBottom: 4 }}>SAME AS YESTERDAY</div>
          <button className="sprig-tap" onClick={() => sameAsYesterday.forEach(onLog)}
            style={{ width: "100%", background: C.greenSoft + "22", border: `1px solid ${C.greenSoft}55`, cursor: "pointer", borderRadius: 9, padding: "8px 11px", fontSize: 12, fontWeight: 600, color: C.green, fontFamily: "DM Sans" }}>
            Log all {sameAsYesterday.length} meals from yesterday
          </button>
        </div>
      )}
      {slotSugg.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, letterSpacing: .3, marginBottom: 4 }}>YESTERDAY'S {slotLabel.toUpperCase()}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {slotSugg.map((e, i) => <Pill key={i} entry={e} />)}
          </div>
        </div>
      )}
      {frequent.length > 0 && (
        <div>
          <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, letterSpacing: .3, marginBottom: 4 }}>FREQUENT (30 DAYS)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {frequent.map((f, i) => <Pill key={i} entry={f.sample} sub={`${f.n}× · ${Math.round(f.sample.calories || 0)} kcal`} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Next workout suggestion card -------------- */
function NextWorkoutCard({ suggestion, onStart }) {
  if (!suggestion) return null;
  return (
    <button className="sprig-tap" onClick={onStart}
      style={{ width: "100%", textAlign: "left", background: C.card, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 16, padding: "13px 15px", boxShadow: C.shadow, marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: C.green + "1a", display: "grid", placeItems: "center" }}>
        <Dumbbell size={18} color={C.green} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .3 }}>SUGGESTED TODAY</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginTop: 1 }}>{suggestion.suggested}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{suggestion.reason}</div>
      </div>
      <ChevronRight size={16} color={C.muted} />
    </button>
  );
}

/* ---------------- Tonight plan card -------------- */
function TonightPlanCard({ plan }) {
  if (!plan) return null;
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: "13px 15px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <Moon size={14} color="#7A6FB0" />
        <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Tonight</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: C.bg, borderRadius: 9, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>☕ STOP CAFFEINE</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 1 }}>{plan.caffeineCutoff}</div>
        </div>
        <div style={{ background: C.bg, borderRadius: 9, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>📵 SCREENS OFF</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 1 }}>{plan.blueCutoff}</div>
        </div>
        <div style={{ background: C.bg, borderRadius: 9, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>🛏️ BED BY</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 1 }}>{plan.targetBed}</div>
        </div>
        <div style={{ background: C.bg, borderRadius: 9, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>⏰ WAKE</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 1 }}>{plan.targetWake}</div>
        </div>
      </div>
      {plan.debtMin > 30 && (
        <div style={{ fontSize: 11, color: "#7A6FB0", marginTop: 7, lineHeight: 1.5 }}>
          You're carrying ~{Math.round(plan.debtMin / 60 * 10) / 10}h sleep debt. Bed early tonight beats sleeping in.
        </div>
      )}
    </div>
  );
}

/* ---------------- Calorie trend recommendation card -------------- */
function CalorieTrendCard({ rec, onAdjust }) {
  if (!rec) return null;
  if (rec.onTrack) {
    return (
      <div style={{ background: C.greenSoft + "12", border: `1px solid ${C.greenSoft}55`, borderRadius: 14, padding: "11px 13px", marginTop: 8, fontSize: 12, color: C.green, lineHeight: 1.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Check size={13} style={{ flexShrink: 0, marginTop: 2 }} />
        <div><b>Calories on track.</b> {rec.message}</div>
      </div>
    );
  }
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: "12px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <Flame size={13} color={C.amber} />
        <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Adjust calorie target?</div>
      </div>
      <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.55 }}>{rec.rationale}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.muted, marginTop: 7, paddingTop: 7, borderTop: `1px solid ${C.line}` }}>
        <span>Current target</span><span><b>{rec.currentTarget} kcal</b></span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.inkSoft, marginTop: 3 }}>
        <span>Suggested target</span><span style={{ color: rec.suggestedDelta > 0 ? C.greenSoft : C.amber, fontWeight: 700 }}>{rec.suggestedTarget} kcal ({rec.suggestedDelta > 0 ? "+" : ""}{rec.suggestedDelta})</span>
      </div>
      {onAdjust && (
        <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
          <button className="sprig-tap" onClick={() => onAdjust(rec.suggestedTarget)} style={{ ...btn(C.green, "#fff"), flex: 1, padding: "8px 0", fontSize: 12 }}>Apply suggestion</button>
        </div>
      )}
      <div style={{ fontSize: 10, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
        Based on the last {rec.days} days. Weight trend is the source of truth — adjust gradually.
      </div>
    </div>
  );
}

/* ---------------- Activity Sources settings section -------------- */
function ActivitySourcesSection({ profile, onSetSource }) {
  const current = profile?.activitySourcePreference || "manual";
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 7 }}>
        <Activity size={13} color={C.greenSoft} /> Activity sources
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {ACTIVITY_SOURCES.map((s) => {
          const sel = current === s.id;
          return (
            <button key={s.id} className="sprig-tap" disabled={!s.active} onClick={() => s.active && onSetSource(s.id)}
              style={{ background: sel ? C.green + "15" : C.bg, border: `1px solid ${sel ? C.green : C.line}`, cursor: s.active ? "pointer" : "not-allowed", borderRadius: 11, padding: "10px 12px", textAlign: "left", fontFamily: "DM Sans", opacity: s.active ? 1 : 0.55 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, flex: 1 }}>{s.name}</span>
                {sel && <Check size={13} color={C.green} />}
                {!s.active && <span style={{ fontSize: 10, color: C.muted, padding: "2px 6px", background: C.bg2, borderRadius: 4 }}>SOON</span>}
              </div>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>{s.note}</div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.muted, marginTop: 6, lineHeight: 1.5, fontStyle: "italic" }}>
        Manual now. Auto-sync later via a native mobile app.
      </div>
    </div>
  );
}

/* ---------------- Today tab -------------- */
// Compact dashboard card used across Today. Title, big value, one-line note, optional actions.
function TodaySummaryCard({ icon, accent = C.greenSoft, title, value, sub, note, children, actions }) {
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 15, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft, letterSpacing: .2 }}>{title}</span>
      </div>
      {value != null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</span>
          {sub && <span style={{ fontSize: 12.5, color: C.muted }}>{sub}</span>}
        </div>
      )}
      {note && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6, lineHeight: 1.45 }}>{note}</div>}
      {children}
      {actions && <div style={{ display: "flex", gap: 7, marginTop: 11 }}>{actions}</div>}
    </div>
  );
}
// Small pill button used for "View in X" and inline quick-actions on Today cards.
function TodayChip({ label, onClick, primary }) {
  return (
    <button className="sprig-tap" onClick={onClick}
      style={{ background: primary ? C.green : C.bg2, color: primary ? "#fff" : C.inkSoft, border: "none", cursor: "pointer", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", display: "inline-flex", alignItems: "center", gap: 5 }}>
      {label}
    </button>
  );
}

function TodayTab({ t, targets, entries, scores, onRemove, library, onQuick, profile, supps, takenIds, onToggleSupp, onRemoveSupp, onAddSupp, sleepInfo, trainInfo, advanced, dailyInfo, nutriInfo, healthInfo, mindInfo, moveInfo, onDaily, onAddEntry, onCheckin, onQuickLog, onStartWorkout, onGoSleep, onGoEnergy, onGoBody, onGoHealth, onGoMind, onGoNutrition, onGoTrain, wins, onKudos, onViewAllWins }) {
  const { lastSleep, debtMin, rec, gym } = sleepInfo;
  const { daily, subScores, healthScore, actions, funcHealth } = dailyInfo;
  const [showDrinks, setShowDrinks] = useState(false);
  const [showMovement, setShowMovement] = useState(false);

  // ---- derived mini-card values ----
  const adjTarget = moveInfo?.calAdjust?.adjustedTargetCalories || targets.calories;
  const kcalLeft = Math.max(0, adjTarget - t.calories);
  const proteinLeft = Math.max(0, targets.protein - t.protein);

  const stepGoalV = moveInfo?.stepGoal || 8000;
  const steps = daily.steps || 0;
  const cardioMin = daily.cardioMin || 0;

  const drinks = Array.isArray(daily?.alcoholDrinks) ? daily.alcoholDrinks : [];
  const drinkKcal = drinks.reduce((a, d) => a + (d.kcal || 0), 0);
  const alcoholG = daily.alcohol_g || 0;

  const waterMl = daily.water || 0;
  const waterGoal = nutriInfo.waterGoal || 2600;
  const waterLeft = Math.max(0, waterGoal - waterMl);

  const readiness = trainInfo?.recoveryRec || { level: "normal", text: "Log sleep to tune today's readiness." };
  const readyLabel = { hard: "Ready", normal: "Good", light: "Take it easy", rest: "Rest" }[readiness.level] || "Good";
  const readyColor = { hard: C.greenSoft, normal: C.greenSoft, light: C.amber, rest: C.coral }[readiness.level] || C.greenSoft;

  // functional health: lowest of the functional scores, plus how many are strong
  const fhAvg = scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : null;
  const fhLow = scores.length ? scores.slice().sort((a, b) => a.score - b.score)[0] : null;

  const litres = (ml) => (ml / 1000).toFixed(1) + "L";

  return (
    <div className="sprig-rise">
      {/* personalized focus badge */}
      {profile?.focus && (() => {
        const FB = {
          gym: { text: "Focus: build muscle", emoji: "🏋️" },
          cardio: { text: "Focus: cardio & endurance", emoji: "🏃" },
          sports: { text: "Focus: sport performance", emoji: "⚽" },
          health: { text: "Focus: general health", emoji: "🌿" },
          transform: { text: "Focus: body transformation", emoji: "✨" },
        }[profile.focus];
        if (!FB) return null;
        return (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.bg2, padding: "5px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, color: C.inkSoft, marginBottom: 10 }}>
            <span>{FB.emoji}</span><span>{FB.text}</span>
          </div>
        );
      })()}

      {/* 1 — DAILY HEALTH SCORE */}
      <div style={{ background: C.heroGrad1, borderRadius: 22, padding: 18, color: "#fff", boxShadow: C.shadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ScoreDonut score={healthScore} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: .7, letterSpacing: .3 }}>TODAY'S HEALTH SCORE</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, marginTop: 1 }}>{scoreVerdict(healthScore)}</div>
            <div style={{ fontSize: 11.5, opacity: .85, marginTop: 4, lineHeight: 1.45 }}>
              {actions[0] ? actions[0].text : "Log a little through the day and your score sharpens up."}
            </div>
          </div>
        </div>
      </div>

      {/* horizontal score rings — Kiwi-style dashboard summary of each system */}
      {(() => {
        const rings = [
          { label: "Nutrition", v: subScores.nutrition, ic: <Flame size={15} />, accent: C.lime },
          { label: "Sleep", v: subScores.sleep, ic: <Moon size={15} />, accent: C.greenSoft },
          { label: "Movement", v: subScores.movement, ic: <Activity size={15} />, accent: C.leaf },
          { label: "Recovery", v: subScores.training, ic: <Gauge size={15} />, accent: C.limeSoft },
          { label: "Mind", v: subScores.mind, ic: <BookOpen size={15} />, accent: C.greenSoft },
        ];
        return (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "14px 2px 4px", marginTop: 2 }} className="sprig-scroll">
            {rings.map((rg) => (
              <div key={rg.label} style={{ flex: "0 0 auto" }}>
                <RingMetric value={rg.v == null ? 0 : rg.v} max={100} size={64} stroke={6}
                  accent={rg.v == null ? "rgba(255,255,255,0.18)" : rg.accent}
                  icon={rg.ic} center={rg.v == null ? "–" : Math.round(rg.v)} label={rg.label} />
              </div>
            ))}
          </div>
        );
      })()}

      {/* 2 — BEST ACTIONS (max 3, one sentence each) */}
      {actions.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, marginBottom: 11, display: "flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={16} color={C.greenSoft} /> Best actions today
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {actions.slice(0, 3).map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: i === 0 ? C.green : C.bg2, color: i === 0 ? "#fff" : C.greenSoft, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {ACTION_ICON[a.icon] || <Check size={16} />}
                </div>
                <span style={{ fontSize: 13, color: C.ink, lineHeight: 1.4, fontWeight: i === 0 ? 600 : 400 }}>{a.text}</span>
              </div>
            ))}
          </div>
          {!trainInfo.deload.suggest && actions[0] && actions[0].icon === "train" && (
            <button className="sprig-tap" onClick={onStartWorkout} style={{ ...btn(C.green, "#fff"), width: "100%", padding: "11px 0", marginTop: 13, fontSize: 14 }}>
              <Play size={15} /> Start workout
            </button>
          )}
        </div>
      )}

      {/* 3 — PRIMARY CTA: Quick log the day */}
      {onQuickLog && (
        <div style={{ marginTop: 12 }}>
          <button className="sprig-tap" onClick={onQuickLog}
            style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "15px 16px", fontSize: 15, fontWeight: 700, boxShadow: `0 6px 18px ${C.lime}33` }}>
            <Zap size={17} /> Quick log the day
            <ChevronRight size={17} style={{ marginLeft: "auto" }} />
          </button>
        </div>
      )}

      {/* Today's wins — compact recognition card */}
      {wins && <TodayWinsCard wins={wins} onKudos={onKudos} onViewAll={onViewAllWins} />}

      {/* mini cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        {/* 4 — NUTRITION mini */}
        <TodaySummaryCard
          icon={<Flame size={15} color={C.amber} />} accent={t.calories > adjTarget ? C.coral : C.green}
          title="Nutrition" value={kcalLeft} sub="kcal left"
          note={t.calories > adjTarget ? `${t.calories - adjTarget} over target.` : `${proteinLeft}g protein to go.`}
          actions={<>
            {onAddEntry && <TodayChip label="+ Food" primary onClick={onGoNutrition} />}
            <TodayChip label="Nutrition" onClick={onGoNutrition} />
          </>}
        >
          <div style={{ marginTop: 8 }}>
            <div style={{ height: 6, background: C.bg2, borderRadius: 99 }}>
              <div style={{ width: Math.min(100, Math.round((t.calories / adjTarget) * 100)) + "%", height: "100%", background: t.calories > adjTarget ? C.coral : C.green, borderRadius: 99, transition: "width .5s" }} />
            </div>
          </div>
        </TodaySummaryCard>

        {/* Water mini */}
        <TodaySummaryCard
          icon={<Coffee size={15} color="#5B9BD5" />} accent="#5B9BD5"
          title="Water" value={litres(waterMl)} sub={"/ " + litres(waterGoal)}
          note={waterLeft > 0 ? `About ${litres(waterLeft)} more today.` : "Hydration goal hit. 💧"}
          actions={<>
            <TodayChip label="+250ml" primary onClick={() => onDaily({ water: waterMl + 250 })} />
            <TodayChip label="Nutrition" onClick={onGoNutrition} />
          </>}
        />

        {/* 5 — MOVEMENT mini (steps + cardio) */}
        <TodaySummaryCard
          icon={<Activity size={15} color={C.greenSoft} />} accent={C.greenSoft}
          title="Movement" value={steps.toLocaleString()} sub={"/ " + stepGoalV.toLocaleString() + " steps"}
          note={cardioMin > 0 ? `${cardioMin} min cardio logged.` : (steps >= stepGoalV ? "Step goal hit. 🏃" : `${Math.max(0, stepGoalV - steps).toLocaleString()} steps to goal.`)}
          actions={<>
            <TodayChip label={showMovement ? "Hide" : "Add"} primary onClick={() => setShowMovement((s) => !s)} />
            <TodayChip label="Train" onClick={onGoTrain} />
          </>}
        />

        {/* 6 — DRINKS mini */}
        <TodaySummaryCard
          icon={<span style={{ fontSize: 15 }}>🍷</span>} accent={alcoholG >= 30 ? C.coral : alcoholG >= 15 ? C.amber : C.inkSoft}
          title="Drinks today" value={drinks.length} sub={drinks.length === 1 ? "drink" : "drinks"}
          note={drinks.length ? `${alcoholG}g alcohol · ${drinkKcal} kcal.` : "No drinks logged."}
          actions={<>
            <TodayChip label={showDrinks ? "Hide" : "Add drink"} primary onClick={() => setShowDrinks((s) => !s)} />
            <TodayChip label="Nutrition" onClick={onGoNutrition} />
          </>}
        />
      </div>

      {/* expandable real loggers (reuse the same components as Nutrition/Train) */}
      {showMovement && (
        <div style={{ marginTop: 10 }}>
          <MovementCard daily={daily} profile={profile} onDaily={onDaily} compact />
        </div>
      )}
      {showDrinks && (
        <div style={{ marginTop: 10 }}>
          <DrinksCard daily={daily} onDaily={onDaily} onAddEntry={onAddEntry} />
        </div>
      )}

      {/* 7 — SLEEP mini (full width) */}
      <div style={{ marginTop: 10 }}>
        <TodaySummaryCard
          icon={<Moon size={15} color="#7A6FB0" />} accent="#7A6FB0"
          title="Sleep" value={lastSleep ? durLabel(lastSleep.durationMin) : "—"} sub={lastSleep ? `score ${lastSleep.score}` : "no log yet"}
          note={rec ? `Caffeine cutoff ${minToLabel(rec.caffeineCutoff)} · blue light ${minToLabel(rec.blueCutoff)}.` : "Log last night to see your cutoffs."}
          actions={<>
            {!lastSleep && <TodayChip label="Log sleep" primary onClick={onGoSleep} />}
            <TodayChip label="Sleep" onClick={onGoSleep} />
          </>}
        />
      </div>

      {/* 8 — TRAINING mini: readiness + gym window */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <TodaySummaryCard
          icon={<Gauge size={15} color={readyColor} />} accent={readyColor}
          title="Training readiness" value={readyLabel}
          note={readiness.text}
          actions={<TodayChip label="Train" onClick={onGoTrain} />}
        />
        <TodaySummaryCard
          icon={<Dumbbell size={15} color={C.greenSoft} />} accent={C.greenSoft}
          title="Best gym window" value={gym ? minToLabel(gym.start) : "—"} sub={gym ? `energy ${gym.avg}/100` : ""}
          note={gym ? "Your predicted peak-energy window." : "See your full energy curve."}
          actions={<TodayChip label="Energy" onClick={onGoEnergy} />}
        />
      </div>

      {/* 9 — FUNCTIONAL HEALTH mini (fair, confidence-aware) */}
      <div style={{ marginTop: 10 }}>
        {!funcHealth.enough ? (
          <TodaySummaryCard
            icon={<HeartPulse size={15} color={C.muted} />} accent={C.muted}
            title="Functional health" value="—"
            note="Not enough data yet — log sleep, a check-in, water, steps, and food for a score."
            actions={<TodayChip label="Health" onClick={onGoHealth} />}
          />
        ) : (
          <TodaySummaryCard
            icon={<HeartPulse size={15} color={C.greenSoft} />} accent={funcHealth.score >= 70 ? C.greenSoft : funcHealth.score >= 50 ? C.amber : C.coral}
            title="Functional health" value={funcHealth.score} sub="/ 100"
            note={funcHealth.reasons.length ? funcHealth.reasons.slice(0, 2).join(" · ") + "." : "Your tracked areas look healthy today."}
            actions={<TodayChip label="Health" onClick={onGoHealth} />}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: funcHealth.confidence === "High" ? C.greenSoft : funcHealth.confidence === "Medium" ? C.amber : C.muted, background: C.bg2, borderRadius: 99, padding: "3px 9px" }}>
                {funcHealth.confidence} confidence
              </span>
              {funcHealth.categories.filter((c) => c.score != null).map((c) => (
                <div key={c.key} title={c.label} style={{ display: "flex", alignItems: "center", gap: 4, background: C.bg2, borderRadius: 99, padding: "3px 9px" }}>
                  <span style={{ fontSize: 10, color: C.muted }}>{c.label.split(" ")[0]}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: c.score >= 60 ? C.greenSoft : c.score >= 40 ? C.amber : C.coral }}>{c.score}</span>
                </div>
              ))}
            </div>
          </TodaySummaryCard>
        )}
      </div>

      <div style={{ height: 6 }} />
    </div>
  );
}

/* ---------------- Nutrition tab -------------- */
const MEAL_TAGS = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];

// Frame-level favorite create/edit sheet (with validation), so it's never clipped by the scroll area.
function FavoriteFormSheet({ form, setForm, isNew, onClose, onSubmit }) {
  const kb = useKeyboardInset();
  const nameOk = (form.name || "").trim().length > 0;
  const numOk = (v) => v === "" || (Number.isFinite(+v) && +v >= 0);
  const fieldsOk = ["calories", "protein", "carbs", "fat", "fiber"].every((k) => numOk(form[k]));
  const valid = nameOk && fieldsOk;
  return (
    <Portal>
    <div onClick={onClose} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-sheet sprig-bottom-sheet"
        style={{ width: "100%", maxWidth: 440, background: C.cardSolid, borderRadius: "20px 20px 0 0", padding: "20px 18px", paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px) + ${kb}px)`, maxHeight: "88%", overflowY: "auto", WebkitOverflowScrolling: "touch", boxShadow: "0 -8px 30px rgba(0,0,0,.35)" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 12 }}>{isNew ? "New favorite meal" : "Edit favorite"}</div>
        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>Name</div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onFocus={scrollIntoViewOnFocus} placeholder="e.g. Chicken rice bowl"
          style={{ width: "100%", background: C.bg, border: `1px solid ${nameOk || form.name === "" ? C.line : C.coral}`, borderRadius: 11, padding: "10px 12px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, marginBottom: 8, boxSizing: "border-box" }} />
        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>Serving</div>
        <input value={form.serving} onChange={(e) => setForm({ ...form, serving: e.target.value })} onFocus={scrollIntoViewOnFocus} placeholder="e.g. 1 bowl"
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, marginBottom: 8, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {[["calories", "kcal"], ["protein", "P (g)"], ["carbs", "C (g)"], ["fat", "F (g)"]].map(([k, lbl]) => (
            <div key={k} style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 3 }}>{lbl}</div>
              <input type="number" inputMode="decimal" min="0" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} onFocus={scrollIntoViewOnFocus}
                style={{ width: "100%", background: C.bg, border: `1px solid ${numOk(form[k]) ? C.line : C.coral}`, borderRadius: 10, padding: "8px 9px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        <div style={{ width: "33%", marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 3 }}>Fiber (g)</div>
          <input type="number" inputMode="decimal" min="0" value={form.fiber} onChange={(e) => setForm({ ...form, fiber: e.target.value })} onFocus={scrollIntoViewOnFocus}
            style={{ width: "100%", background: C.bg, border: `1px solid ${numOk(form.fiber) ? C.line : C.coral}`, borderRadius: 10, padding: "8px 9px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, margin: "4px 0 6px" }}>Tag (optional)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {MEAL_TAGS.map((tg) => {
            const on = (form.tags || []).includes(tg);
            return (
              <button key={tg} className="sprig-tap" onClick={() => setForm({ ...form, tags: on ? form.tags.filter((x) => x !== tg) : [...(form.tags || []), tg] })}
                style={{ background: on ? C.green : C.bg, color: on ? "#fff" : C.inkSoft, border: `1px solid ${on ? C.green : C.line}`, borderRadius: 99, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans" }}>{tg}</button>
            );
          })}
        </div>
        {!nameOk && <div style={{ fontSize: 11, color: C.coral, margin: "2px 0 8px" }}>A meal name is required.</div>}
        {!fieldsOk && <div style={{ fontSize: 11, color: C.coral, margin: "2px 0 8px" }}>Calories and macros must be numbers of 0 or more.</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="sprig-tap" onClick={onClose} style={{ flex: 1, ...btn(C.bg2, C.inkSoft), padding: "12px 0", fontSize: 13 }}>Cancel</button>
          <button className="sprig-tap" disabled={!valid} onClick={() => valid && onSubmit()}
            style={{ flex: 1, ...btn(valid ? C.green : C.bg2, valid ? "#fff" : C.muted), padding: "12px 0", fontSize: 13, opacity: valid ? 1 : .7 }}>{isNew ? "Save favorite" : "Save changes"}</button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function NutritionTab({ t, targets, entries, onRemove, profile, advanced, sub = "meals", onSub, nutriInfo, moveInfo, sleepInfo, daily, onDaily, onAddEntry,
  supps, takenIds, onToggleSupp, onRemoveSupp, onAddSupp, library, onQuick, entriesHistory,
  favoriteMeals, onSaveFavorite, onReplaceFavorite, onUpdateFavorite, onRemoveFavorite, onAddFavorite, onNewFood, onSnapFood, onScanLabel, onDescribe, onManual,
  onOpenCreateFavorite, onOpenEditFavorite, onFavoriteDuplicate, onOpenLogSheet, flashEntryId }) {
  const [showMicros, setShowMicros] = useState(advanced);
  const [showAllFood, setShowAllFood] = useState(false);
  const [showSupps, setShowSupps] = useState(advanced || (supps?.length || 0) <= 4);
  const [favSearch, setFavSearch] = useState("");
  const [favSort, setFavSort] = useState("most"); // most | recent — default to most-used so top meals are one-tap
  const takenCount = supps.filter((s) => takenIds.includes(s.id)).length;
  const adjTarget = moveInfo?.calAdjust?.adjustedTargetCalories || targets.calories;
  const delta = moveInfo?.calAdjust?.delta || 0;
  const leftLabel = Math.max(0, adjTarget - t.calories);

  // favorites: filter + sort
  const favs = (favoriteMeals || [])
    .filter((f) => !favSearch || f.name.toLowerCase().includes(favSearch.toLowerCase()) || (f.tags || []).some((tg) => tg.includes(favSearch.toLowerCase())))
    .sort((a, b) => favSort === "most" ? (b.useCount || 0) - (a.useCount || 0) : (b.lastUsedTs || b.createdTs || 0) - (a.lastUsedTs || a.createdTs || 0));

  const sectionTitle = (txt) => <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, margin: "22px 2px 10px" }}>{txt}</div>;

  return (
    <div className="sprig-rise">
      <SubTabs tabs={[["meals", "Meals"], ["nutrition", "Nutrition"]]} active={sub} onChange={onSub} />

      {/* Log food floating CTA is rendered at the app-frame level (GlobalFloatingLayer via Portal).
          Do NOT render a sticky/inline button here — it would scroll away and conflict. */}

      {sub === "nutrition" && (<>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: "4px 2px 2px" }}>Nutrition</div>
      <div style={{ fontSize: 12, color: C.muted, margin: "0 2px 8px" }}>Calories, macros, hydration, vitamins, and your supplement stack.</div>

      {/* DAILY TARGET */}
      {sectionTitle("Daily target")}
      <div style={{ background: C.card, borderRadius: 22, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Ring value={t.calories} max={adjTarget} label={leftLabel} sub="kcal left" color={t.calories > adjTarget ? C.coral : C.green} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
            <MacroBar name="Protein" val={t.protein} max={targets.protein} color={C.green} />
            <MacroBar name="Carbs" val={t.carbs} max={targets.carbs} color={C.amber} />
            <MacroBar name="Fat" val={t.fat} max={targets.fat} color={C.coral} />
            <MacroBar name="Fiber" val={t.fiber} max={targets.fiber} color={C.leaf} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.inkSoft }}>
          <span>Eaten <b style={{ color: C.ink }}>{t.calories}</b></span>
          <span>Target <b style={{ color: C.ink }}>{adjTarget}</b></span>
          <span>Left <b style={{ color: leftLabel > 0 ? C.greenSoft : C.coral }}>{Math.max(0, adjTarget - t.calories)}</b></span>
        </div>
        {delta !== 0 && (
          <details style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>
              <span>Adjusted for movement: <b style={{ color: C.ink }}>{adjTarget} kcal</b></span>
              <ChevronDown size={12} color={C.muted} />
            </summary>
            <div style={{ marginTop: 8, fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Base target</span><span>{targets.calories} kcal</span></div>
              {moveInfo?.calAdjust?.stepDelta != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Steps / cardio</span><span>{(moveInfo.calAdjust.stepDelta + (moveInfo.calAdjust.cardioK || 0)) >= 0 ? "+" : ""}{moveInfo.calAdjust.stepDelta + (moveInfo.calAdjust.cardioK || 0)} kcal</span></div>}
              {moveInfo?.calAdjust?.workoutK ? <div style={{ display: "flex", justifyContent: "space-between" }}><span>Workout</span><span>+{moveInfo.calAdjust.workoutK} kcal</span></div> : null}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px dashed ${C.line}`, marginTop: 5, paddingTop: 5, color: C.inkSoft, fontWeight: 600 }}><span>Adjusted target</span><span>{adjTarget} kcal</span></div>
              <div style={{ marginTop: 8, fontSize: 10.5, fontStyle: "italic" }}>Calories burned are estimates — use your weight trend to fine-tune.</div>
            </div>
          </details>
        )}
        {/* diet quality */}
        {t.calories > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>Diet quality</span>
              <span style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: nutriInfo.dietQ.score >= 70 ? C.greenSoft : nutriInfo.dietQ.score >= 50 ? C.amber : C.coral }}>{nutriInfo.dietQ.score}<span style={{ fontSize: 11, color: C.muted }}>/100</span></span>
            </div>
            <div style={{ height: 6, background: C.bg2, borderRadius: 99 }}>
              <div style={{ width: nutriInfo.dietQ.score + "%", height: "100%", background: nutriInfo.dietQ.score >= 70 ? C.greenSoft : nutriInfo.dietQ.score >= 50 ? C.amber : C.coral, borderRadius: 99, transition: "width .6s" }} />
            </div>
            {nutriInfo.dietQ.advice?.length > 0 && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>To improve: {nutriInfo.dietQ.advice.join(", ")}.</div>}
          </div>
        )}
      </div>

      {/* bulk/cut/maintenance coach */}
      {nutriInfo.coach?.lines?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, marginBottom: 9, display: "flex", alignItems: "center", gap: 7 }}>
            <Target size={15} color={C.greenSoft} /> {targets.goal === "gain" ? "Lean bulk" : targets.goal === "lose" ? "Cut" : "Maintenance"} coach
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {nutriInfo.coach.lines.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: l.tone === "good" ? C.greenSoft : C.amber, flexShrink: 0, marginTop: 6 }} />{l.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP UP TODAY */}
      {nutriInfo.missing?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, marginBottom: 11, display: "flex", alignItems: "center", gap: 7 }}>
            <Flame size={15} color={C.amber} /> Top up today
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {nutriInfo.missing.map((mi) => (
              <div key={mi.key}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{mi.label}</span>
                  <span style={{ fontSize: 11.5, color: mi.pct < 40 ? C.coral : C.amber, fontWeight: 600 }}>{mi.pct}%</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Try: {mi.food}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      </>)}

      {sub === "meals" && (<>
      {/* QUICK ADD */}
      {sectionTitle("Quick add")}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <button className="sprig-tap" onClick={onOpenCreateFavorite} style={{ ...btn(C.bg2, C.green), padding: "10px 14px", fontSize: 13 }}><BookMarked size={15} /> New favorite</button>
      </div>
      {library?.length > 0 && (
        <>
          <div style={{ margin: "8px 2px 8px", fontSize: 12.5, fontWeight: 600, color: C.muted }}>From your saved meals</div>
          <div className="sprig-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {library.slice(0, 10).map((m) => (
              <button key={m.id} className="sprig-tap" onClick={() => onQuick(m)}
                style={{ flexShrink: 0, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "9px 13px", cursor: "pointer", textAlign: "left", boxShadow: C.shadow }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                <div style={{ fontSize: 11, color: C.coral, marginTop: 2 }}>{m.calories} kcal · +</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* FAVORITE MEALS */}
      {sectionTitle("Favorite meals")}
      {(favoriteMeals?.length || 0) > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, background: C.card, border: `1px solid ${C.line}`, borderRadius: 11, padding: "7px 11px" }}>
            <Search size={14} color={C.muted} />
            <input value={favSearch} onChange={(e) => setFavSearch(e.target.value)} placeholder="Search favorites"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "DM Sans", color: C.ink }} />
          </div>
          <button className="sprig-tap" onClick={() => setFavSort((s) => s === "recent" ? "most" : "recent")}
            style={{ ...btn(C.bg2, C.inkSoft), padding: "8px 11px", fontSize: 11.5, whiteSpace: "nowrap" }}>
            {favSort === "recent" ? "Recent" : "Most used"}
          </button>
        </div>
      )}
      {(favoriteMeals?.length || 0) === 0 ? (
        <button className="sprig-tap" onClick={onOpenCreateFavorite}
          style={{ width: "100%", background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 14px", cursor: "pointer", color: C.muted, fontSize: 13, fontFamily: "DM Sans", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green + "14", display: "grid", placeItems: "center", flexShrink: 0 }}><BookMarked size={17} color={C.greenSoft} /></div>
          <span>Save meals you eat often as favorites, then add them to today with one tap. Tap any logged meal's star, or create one here.</span>
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {favs.map((f) => (
            <div key={f.id} style={{ background: C.card, borderRadius: 14, padding: "11px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{f.calories} kcal · P{f.protein_g} C{f.carbs_g} F{f.fat_g}{f.useCount ? ` · used ${f.useCount}×` : ""}</div>
                {(f.tags || []).length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>{f.tags.map((tg) => <span key={tg} style={{ fontSize: 9.5, color: C.greenSoft, background: C.green + "14", borderRadius: 99, padding: "2px 7px" }}>{tg}</span>)}</div>}
              </div>
              <button className="sprig-tap" onClick={() => onOpenEditFavorite(f)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><PencilLine size={14} /></button>
              <button className="sprig-tap" onClick={() => onRemoveFavorite(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={14} /></button>
              <button className="sprig-tap" onClick={() => onAddFavorite(f.id)} style={{ ...btn(C.green, "#fff"), padding: "8px 12px", fontSize: 12, whiteSpace: "nowrap" }}><Plus size={13} /> Add</button>
            </div>
          ))}
          {favs.length === 0 && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "12px 0" }}>No favorites match "{favSearch}".</div>}
        </div>
      )}

      {/* HYDRATION & DRINKS */}
      {sectionTitle("Hydration & drinks")}
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <Stepper icon={<Coffee size={13} />} label="Water" value={daily.water || 0} suffix="ml" step={250} onChange={(v) => onDaily({ water: v })} color="#5B9BD5" goal={nutriInfo.waterGoal} />
        {nutriInfo.needsElectrolytes && <div style={{ fontSize: 11, color: C.amber, marginTop: 8 }}>Add electrolytes — you've sweated a lot today.</div>}
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>Goal {Math.round(nutriInfo.waterGoal)} ml · {Math.round(((daily.water || 0) / nutriInfo.waterGoal) * 100)}% today</div>
      </div>
      <div style={{ marginTop: 10 }}>
        <DrinksCard daily={daily} onDaily={onDaily} onAddEntry={onAddEntry} />
      </div>
      {(daily.alcohol_g || 0) > 0 && (
        <div style={{ fontSize: 11.5, color: C.amber, margin: "8px 4px 0", lineHeight: 1.5 }}>
          Alcohol today counts toward calories and nudges your recovery and sleep guidance.
        </div>
      )}
      </>)}

      {sub === "nutrition" && (<>
      {/* SUPPLEMENTS */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 10px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
          <Pill size={16} color={C.greenSoft} /> Daily stack
          {supps.length > 0 && <span style={{ fontFamily: "DM Sans", fontSize: 12, color: C.muted, fontWeight: 500 }}>· {takenCount}/{supps.length}</span>}
        </div>
        <button className="sprig-tap" onClick={onAddSupp} style={{ ...btn(C.bg2, C.green), padding: "7px 12px", fontSize: 12.5, borderRadius: 11 }}><Plus size={15} /> Add</button>
      </div>
      {supps.length === 0 ? (
        <button className="sprig-tap" onClick={onAddSupp}
          style={{ width: "100%", background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 14px", cursor: "pointer", color: C.muted, fontSize: 13, fontFamily: "DM Sans", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green + "14", display: "grid", placeItems: "center", flexShrink: 0 }}><Pill size={17} color={C.greenSoft} /></div>
          <span>Add the supplements you take — describe them once or scan the label, then tick them off each day.</span>
        </button>
      ) : (
        <>
          {!showSupps && (
            <button className="sprig-tap" onClick={() => setShowSupps(true)} style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontSize: 13, color: C.inkSoft, fontFamily: "DM Sans", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{takenCount}/{supps.length} taken today</span><span style={{ color: C.greenSoft, fontWeight: 600 }}>Show stack ▾</span>
            </button>
          )}
          {showSupps && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {supps.map((s) => {
                const on = takenIds.includes(s.id);
                return (
                  <div key={s.id} className="sprig-tap" onClick={() => onToggleSupp(s.id)}
                    style={{ background: on ? C.green + "0d" : C.card, borderRadius: 14, padding: "11px 13px", cursor: "pointer", boxShadow: C.shadow, border: `1px solid ${on ? C.leaf + "66" : C.line}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center", background: on ? C.green : "transparent", border: on ? "none" : `2px solid ${C.line}` }}>
                      {on && <Check size={16} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: on ? C.green : C.ink }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.serving}</div>
                    </div>
                    <button className="sprig-tap" onClick={(e) => { e.stopPropagation(); onRemoveSupp(s.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, flexShrink: 0 }}><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VITAMINS & MINERALS */}
      {sectionTitle("Vitamins & minerals")}
      {(() => {
        const anyMicros = MICRO_KEYS.some(([k]) => (t.micros[k] || 0) > 0);
        if (!anyMicros) {
          return <EmptyState icon={<Pill size={20} color={C.greenSoft} />} title="No vitamin data yet"
            text="Log meals with AI or labels to see vitamins and minerals." />;
        }
        return (
          <>
            <button className="sprig-tap" onClick={() => setShowMicros((s) => !s)}
              style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontSize: 13, color: C.inkSoft, fontFamily: "DM Sans", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{MICRO_KEYS.filter(([k]) => t.micros[k] >= 100).length}/{MICRO_KEYS.length} at 100%</span>
              <span style={{ color: C.greenSoft, fontWeight: 600 }}>{showMicros ? "Hide ▴" : "Show vitamins & minerals ▾"}</span>
            </button>
            {showMicros && (
              <div style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: C.shadow, marginTop: 8, border: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                {MICRO_KEYS.map(([k, lbl]) => {
                  const v = Math.min(150, t.micros[k]); const full = t.micros[k] >= 100;
                  return (
                    <div key={k}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                        <span style={{ color: C.inkSoft }}>{lbl}</span>
                        <span style={{ color: full ? C.greenSoft : C.muted, fontWeight: full ? 700 : 500 }}>{t.micros[k]}%</span>
                      </div>
                      <div style={{ height: 5, background: C.bg2, borderRadius: 99 }}>
                        <div style={{ width: Math.min(100, v) + "%", height: "100%", background: full ? C.greenSoft : C.leaf, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
      </>)}

      {sub === "meals" && (<>
      {/* FOOD TODAY */}
      {sectionTitle("Food logged today")}
      {entries.length === 0 ? (
        <EmptyState icon={<Flame size={20} color={C.greenSoft} />} title="No meals yet"
          text="Log with Snap, Scan, Describe, or add a favorite." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(() => { const sorted = [...entries].sort((a, b) => (b.time || 0) - (a.time || 0)); return (showAllFood ? sorted : sorted.slice(0, 4)); })().map((e) => {
            const ms = mealScore(e, targets);
            const msCol = ms ? (ms.score >= 70 ? C.greenSoft : ms.score >= 45 ? C.amber : C.coral) : C.muted;
            return (
              <div key={e.id} ref={flashEntryId === e.id ? (el) => { if (el) setTimeout(() => { try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) {} }, 80); } : undefined} className={flashEntryId === e.id ? "entry-flash" : ""} style={{ background: C.card, borderRadius: 14, padding: "12px 14px", boxShadow: C.shadow, border: `1px solid ${flashEntryId === e.id ? C.lime : C.line}`, transition: "border-color .4s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {ms && (
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: msCol + "1f", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700, color: msCol, lineHeight: 1 }}>{ms.score}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}{e.mult !== 1 && <span style={{ color: C.muted, fontWeight: 500 }}> ×{e.mult}</span>}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{e.time ? minToLabel(tsToMin(e.time)) + " · " : ""}P {Math.round(e.protein_g * e.mult)} · C {Math.round(e.carbs_g * e.mult)} · F {Math.round(e.fat_g * e.mult)} g</div>
                  </div>
                  <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 16 }}>{Math.round(e.calories * e.mult)}</div>
                  <button className="sprig-tap" title="Save as favorite" onClick={() => onSaveFavorite(e, { onDuplicate: (fav, existing) => onFavoriteDuplicate && onFavoriteDuplicate(e, existing) })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.amber, padding: 4 }}><BookMarked size={15} /></button>
                  <button className="sprig-tap" onClick={() => onRemove(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={15} /></button>
                </div>
                {advanced && ms && <div style={{ fontSize: 11, color: C.muted, marginTop: 8, paddingLeft: 50 }}>{ms.note}</div>}
              </div>
            );
          })}
          {entries.length > 4 && (
            <button className="sprig-tap" onClick={() => setShowAllFood((s) => !s)}
              style={{ background: C.bg2, border: "none", cursor: "pointer", color: C.greenSoft, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", borderRadius: 12, padding: "10px 0", marginTop: 2 }}>
              {showAllFood ? "Show less" : `View all ${entries.length} meals`}
            </button>
          )}
        </div>
      )}
      </>)}

      <div style={{ height: 6 }} />

    </div>
  );
}
function MealsTab({ library, onLog, onRemove, onNew }) {
  return (
    <div className="sprig-rise">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 2px 12px" }}>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600 }}>My Meals</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Described once, remembered forever. Tap to log instantly.</div>
        </div>
      </div>
      {library.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <BookMarked size={30} color={C.line} />
          <div style={{ color: C.muted, fontSize: 13.5, marginTop: 12, lineHeight: 1.5 }}>
            No saved meals yet. Describe a meal on the Today tab and it gets saved here automatically.
          </div>
          <button className="sprig-tap" onClick={onNew} style={{ ...btn(C.green, "#fff"), padding: "11px 18px", marginTop: 16 }}><PencilLine size={15} /> Describe a meal</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {library.map((m) => (
            <div key={m.id} style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{m.serving}</div>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 5 }}>
                    <b style={{ color: C.coral }}>{m.calories}</b> kcal · P {Math.round(m.protein_g)} · C {Math.round(m.carbs_g)} · F {Math.round(m.fat_g)}
                  </div>
                </div>
                <button className="sprig-tap" onClick={() => onLog(m)} style={{ ...btn(C.green, "#fff"), width: 42, height: 42, borderRadius: 12 }}><Plus size={20} /></button>
                <button className="sprig-tap" onClick={() => onRemove(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Sleep tab -------------- */
function StageBar({ stages, advanced }) {
  if (!stages || (stages.deep == null && stages.rem == null && stages.light == null)) return null;
  const deep = stages.deep || 0, rem = stages.rem || 0, light = stages.light || 0;
  const total = deep + rem + light || 1;
  const seg = [["Deep", deep, "#3E5C8A"], ["REM", rem, "#7A6FB0"], ["Light", light, "#A9C3D9"]];
  return (
    <div>
      <div style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", marginBottom: advanced ? 8 : 0 }}>
        {seg.map(([n, v, c]) => <div key={n} style={{ width: (v / total) * 100 + "%", background: c }} title={`${n} ${v}m`} />)}
      </div>
      {advanced && (
        <div style={{ display: "flex", gap: 14 }}>
          {seg.map(([n, v, c]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.inkSoft }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} /> {n} {durLabel(v)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SleepTab({ sleepLogs, sleepInfo, alarm, onSaveAlarm, sub = "sleep", onSub, session, micState, onStart, onEnd, onManual, onRemove, onToggleIgnore, onMarkNap, onEditLog, profile, advanced, daily, onDaily, recoveryRec }) {
  const { debtMin, lastSleep, rec, need } = sleepInfo;
  const [showManual, setShowManual] = useState(false);
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  const [qual, setQual] = useState(70);
  const [editId, setEditId] = useState(null); // sleep log id being edited
  const [editBed, setEditBed] = useState("23:00");
  const [editWake, setEditWake] = useState("07:00");
  const [dismissShortBanner, setDismissShortBanner] = useState(false);
  const { wakeMin, cycles } = smartWake(Date.now() - 6 * 3600000, hmToMin(alarm.latest), alarm.window);
  const elapsed = session ? Math.round((Date.now() - session.bedTs) / 60000) : 0;

  function submitManual() {
    const today = new Date(); const [bh, bm] = bed.split(":").map(Number); const [wh, wm] = wake.split(":").map(Number);
    const wakeD = new Date(today); wakeD.setHours(wh, wm, 0, 0);
    const bedD = new Date(today); bedD.setHours(bh, bm, 0, 0);
    if (bh >= 12) bedD.setDate(bedD.getDate() - 1); // last night
    onManual({ bedTs: bedD.getTime(), wakeTs: wakeD.getTime(), restlessness: 100 - qual, source: "manual" });
    setShowManual(false);
  }

  // live session view
  if (session) {
    return (
      <div className="sprig-rise" style={{ textAlign: "center", padding: "20px 6px" }}>
        <div style={{ background: C.heroGrad2, borderRadius: 24, padding: "34px 20px", color: "#fff" }}>
          <MoonStar size={40} color="#BFD0FF" />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, marginTop: 14 }}>Sleep mode on</div>
          <div style={{ fontSize: 13, opacity: .8, marginTop: 6 }}>Asleep for {durLabel(elapsed)}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, background: "rgba(255,255,255,.12)", padding: "6px 12px", borderRadius: 99 }}>
              {micState === "on" ? <><Mic size={12} style={{ verticalAlign: -1 }} /> Sensing movement</> : <><MicOff size={12} style={{ verticalAlign: -1 }} /> Cycle model</>}
            </span>
            <span style={{ fontSize: 12, background: "rgba(255,255,255,.12)", padding: "6px 12px", borderRadius: 99 }}>
              <AlarmClock size={12} style={{ verticalAlign: -1 }} /> by {alarm.latest}
            </span>
          </div>
          <div style={{ fontSize: 11.5, opacity: .7, marginTop: 18, lineHeight: 1.5, maxWidth: 280, margin: "18px auto 0" }}>
            Keep the app open with your phone charging on the nightstand. I'll wake you in a light phase inside your window.
          </div>
        </div>
        <button className="sprig-tap" onClick={onEnd} style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "16px 0", marginTop: 16, fontSize: 15.5, fontWeight: 700, boxShadow: `0 6px 18px ${C.lime}33` }}>
          <Sun size={17} /> Wake up — end &amp; score
        </button>
      </div>
    );
  }

  return (
    <div className="sprig-rise">
      <SubTabs tabs={[["sleep", "Sleep"], ["alarm", "Alarm & Routine"]]} active={sub} onChange={onSub} />

      {/* Primary sleep actions — visible in BOTH subtabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
        <button className="sprig-tap" onClick={() => onStart(true)} style={{ ...btn(C.lime, "#0A1F12"), flex: 2, padding: "15px 0", flexDirection: "column", gap: 3, boxShadow: `0 6px 18px ${C.lime}33` }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 15, fontWeight: 700 }}><Moon size={17} /> Start sleep &amp; smart alarm</span>
          <span style={{ fontSize: 11, opacity: .8, fontWeight: 600 }}>wakes you by {alarm.latest}</span>
        </button>
        <button className="sprig-tap" onClick={() => setShowManual((s) => !s)} style={{ ...btn(C.card, C.ink), flex: 1, padding: "15px 0", border: `1px solid ${C.line}`, flexDirection: "column", gap: 4, boxShadow: C.shadow }}>
          <PencilLine size={17} /><span style={{ fontSize: 11.5 }}>Log past night</span>
        </button>
      </div>
      {micState === "denied" && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, marginBottom: 4, lineHeight: 1.45 }}>
          Movement sensing needs mic access (often blocked in this preview) — no problem, the smart alarm still uses the sleep-cycle model.
        </div>
      )}
      {showManual && (
        <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, margin: "12px 0" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ flex: 1, fontSize: 12, color: C.inkSoft }}>Fell asleep
              <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} style={{ width: "100%", marginTop: 5, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 10px", fontFamily: "DM Sans", fontSize: 14, background: C.bg }} /></label>
            <label style={{ flex: 1, fontSize: 12, color: C.inkSoft }}>Woke up
              <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} style={{ width: "100%", marginTop: 5, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 10px", fontFamily: "DM Sans", fontSize: 14, background: C.bg }} /></label>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.inkSoft }}><span>How rested?</span><span style={{ fontWeight: 700, color: C.green }}>{qual}%</span></div>
            <input type="range" min="10" max="100" value={qual} onChange={(e) => setQual(+e.target.value)} style={{ width: "100%", marginTop: 6, accentColor: C.green }} />
          </div>
          <button className="sprig-tap" onClick={submitManual} style={{ ...btn(C.green, "#fff"), width: "100%", padding: "12px 0", marginTop: 14 }}><Check size={16} /> Save sleep</button>
        </div>
      )}

      {sub === "sleep" && (<>
      {/* sleep debt hero */}
      <div style={{ background: C.heroGrad1, borderRadius: 22, padding: 20, color: "#fff", boxShadow: C.shadow, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11.5, opacity: .75, letterSpacing: .3 }}>SLEEP DEBT · WEIGHTED, LAST 14 NIGHTS</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
              <span style={{ fontFamily: "Fraunces, serif", fontSize: 34, fontWeight: 700 }}>{debtMin < 30 ? "~0" : durLabel(debtMin)}</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, opacity: .9 }}>{sleepDebtLabel(debtMin).label}</span>
            </div>
            <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>
              {debtMin < 30 ? "You're well rested 🌿" : debtMin < 90 ? "Slightly behind — one early night clears it." : debtMin < 180 ? "A bit behind — bank a couple of early nights." : "High debt — prioritize sleep this week."}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11.5, opacity: .75 }}>NEED</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700 }}>{durLabel(need)}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 90px", background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, opacity: .75, display: "flex", alignItems: "center", gap: 4 }}><BedDouble size={12} /> BEDTIME</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginTop: 2 }}>{minToLabel(rec.recBed)}</div>
          </div>
          <div style={{ flex: "1 1 90px", background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, opacity: .75, display: "flex", alignItems: "center", gap: 4 }}><Sun size={12} /> WAKE</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginTop: 2 }}>{minToLabel(rec.recWake)}</div>
          </div>
          <div style={{ flex: "1 1 90px", background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 10.5, opacity: .75, display: "flex", alignItems: "center", gap: 4 }}><Coffee size={12} /> NO CAFFEINE AFTER</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginTop: 2 }}>{minToLabel(rec.caffeineCutoff)}</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, opacity: .65, marginTop: 14, lineHeight: 1.5 }}>
          Sleep debt is weighted toward recent nights. Good nights reduce old debt — it isn't a permanent balance.
        </div>
      </div>

      {/* Your energy today — modeled from sleep + check-in + meals */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "18px 2px 8px", display: "flex", alignItems: "center", gap: 7 }}><Zap size={16} color={C.lime} /> Your energy today</div>
      <EnergyCurveCard sleepInfo={sleepInfo} />

      {/* recovery recommendation */}
      {recoveryRec && (() => {
        const lvl = recoveryRec.level;
        const stl = lvl === "hard"   ? { bg: "#3E7B5333", bd: C.greenSoft, ic: <Dumbbell size={17} color={C.greenSoft} /> }
                  : lvl === "normal" ? { bg: "#3E7B531a", bd: C.greenSoft, ic: <Dumbbell size={17} color={C.greenSoft} /> }
                  : lvl === "light"  ? { bg: "#D9A23C26", bd: C.amber,     ic: <Activity size={17} color={C.amber} /> }
                  :                    { bg: "#E0714A26", bd: C.coral,     ic: <BedDouble size={17} color={C.coral} /> };
        return (
          <div style={{ background: C.card, borderRadius: 16, padding: 14, marginTop: 12, border: `1px solid ${stl.bd}55`, display: "flex", gap: 12, alignItems: "center", boxShadow: C.shadow }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: stl.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>{stl.ic}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: .3, fontWeight: 600 }}>RECOVERY · TODAY</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, textTransform: "capitalize" }}>{lvl === "hard" ? "Train hard" : lvl === "normal" ? "Train normal" : lvl === "light" ? "Train light" : "Rest"}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>{recoveryRec.text}</div>
            </div>
          </div>
        );
      })()}
      </>)}

      {sub === "alarm" && (<>
      {/* last night detail */}
      {lastSleep && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted }}>{minToLabel(tsToMin(lastSleep.bedtime))} → {minToLabel(tsToMin(lastSleep.waketime))}</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700 }}>{durLabel(lastSleep.durationMin)} slept</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <Ring value={lastSleep.score} max={100} size={68} stroke={8} label={lastSleep.score} sub="score"
                color={lastSleep.score >= 80 ? C.greenSoft : lastSleep.score >= 60 ? C.amber : C.coral} />
            </div>
          </div>
          <StageBar stages={lastSleep.stages} advanced={advanced} />
          {sleepInfo.breakdown?.mainReason && (
            <div style={{ background: C.bg, borderRadius: 12, padding: "11px 12px", marginTop: 13, lineHeight: 1.5 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .3 }}>MAIN ISSUE</div>
              <div style={{ fontSize: 13, color: C.ink, marginTop: 2 }}>{sleepInfo.breakdown.mainReason.charAt(0).toUpperCase() + sleepInfo.breakdown.mainReason.slice(1)}.</div>
              {sleepInfo.breakdown.fix && (
                <>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .3, marginTop: 8 }}>FIX TONIGHT</div>
                  <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginTop: 2 }}>{sleepInfo.breakdown.fix}</div>
                </>
              )}
            </div>
          )}
          {!sleepInfo.breakdown?.mainReason && (
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 13, background: C.bg, borderRadius: 12, padding: "10px 12px", lineHeight: 1.5 }}>
              💡 {sleepTip(lastSleep, debtMin, need)}
            </div>
          )}
        </div>
      )}

      {/* alcohol tracker — affects tonight's sleep + tomorrow's recovery */}
      {daily && onDaily && (() => {
        const cur = alcoholLevel(daily.alcohol || 0);
        const impact = ALCOHOL_LEVELS[cur];
        const setLvl = (key) => onDaily({ alcohol: ALCOHOL_LEVELS[key].units });
        return (
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
                <Flame size={15} color={C.coral} /> Alcohol today
              </div>
              <span style={{ fontSize: 11.5, color: C.muted }}>affects tonight's sleep + tomorrow's recovery</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(ALCOHOL_LEVELS).map(([key, lvl]) => {
                const on = cur === key;
                return (
                  <button key={key} className="sprig-tap" onClick={() => setLvl(key)}
                    style={{ flex: 1, border: "none", cursor: "pointer", padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans",
                      background: on ? lvl.color : C.bg2, color: on ? "#fff" : C.muted }}>{lvl.label}</button>
                );
              })}
            </div>
            {cur !== "none" && (
              <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 10, lineHeight: 1.5, background: C.bg, borderRadius: 10, padding: "9px 11px" }}>
                {impact.next}
              </div>
            )}
          </div>
        );
      })()}

      {/* smart alarm settings */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}><AlarmClock size={16} color={C.greenSoft} /> Wake-up alarm</div>

        {/* mode selector */}
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6 }}>ALARM MODE</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {[
            ["smart", "Smart alarm window", "Wakes you during light sleep before your latest time"],
            ["fixed", "Fixed wake time", "Always rings at your set time"],
            ["duration", "After sleep duration", "Rings once you've slept a set number of hours"],
          ].map(([k, lbl, sub]) => {
            const on = (alarm.mode || "smart") === k;
            return (
              <button key={k} className="sprig-tap" onClick={() => onSaveAlarm({ ...alarm, mode: k })}
                style={{ background: on ? C.green + "11" : C.bg, border: `1px solid ${on ? C.green : C.line}`, borderRadius: 11, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "DM Sans" }}>
                <div style={{ width: 16, height: 16, borderRadius: 99, border: `2px solid ${on ? C.green : C.muted}`, display: "grid", placeItems: "center", flexShrink: 0 }}>{on && <div style={{ width: 7, height: 7, borderRadius: 99, background: C.green }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {(alarm.mode || "smart") !== "duration" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontSize: 13, color: C.inkSoft }}>{(alarm.mode || "smart") === "fixed" ? "Wake time" : "Latest wake time"}</span>
            <input type="time" value={alarm.latest} onChange={(e) => onSaveAlarm({ ...alarm, latest: e.target.value })} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "7px 10px", fontFamily: "DM Sans", fontSize: 14, background: C.bg }} />
          </div>
        )}

        {(alarm.mode || "smart") === "duration" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontSize: 13, color: C.inkSoft }}>Sleep duration</span>
            <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
              {[6, 7, 7.5, 8, 8.5, 9].map((h) => (
                <button key={h} onClick={() => onSaveAlarm({ ...alarm, durationH: h })} className="sprig-tap"
                  style={{ border: "none", cursor: "pointer", padding: "6px 9px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: (alarm.durationH || 8) === h ? C.card : "transparent", color: (alarm.durationH || 8) === h ? C.green : C.muted }}>{h}h</button>
              ))}
            </div>
          </div>
        )}

        {(alarm.mode || "smart") !== "fixed" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontSize: 13, color: C.inkSoft }}>{(alarm.mode || "smart") === "duration" ? "Light-wake window" : "Wake window"}</span>
            <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
              {[0, 15, 30, 45].map((w) => (
                <button key={w} onClick={() => onSaveAlarm({ ...alarm, window: w })} className="sprig-tap"
                  style={{ border: "none", cursor: "pointer", padding: "6px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: alarm.window === w ? C.card : "transparent", color: alarm.window === w ? C.green : C.muted }}>{w === 0 ? "Off" : w + "m"}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
          {(alarm.mode || "smart") === "duration"
            ? `Wake after ${alarm.durationH || 8}h is based on when you started sleep, not a fixed clock time${(alarm.window || 0) > 0 ? ` — within a ${alarm.window}-min light-wake window` : ""}.`
            : (alarm.mode || "smart") === "fixed"
              ? `Rings at ${alarm.latest}, once you've slept at least 3 hours.`
              : `Wakes you at the end of a sleep cycle between ${minToLabel(hmToMin(alarm.latest) - alarm.window)} and ${alarm.latest} so you rise during light sleep.`}
        </div>
        <div style={{ fontSize: 10.5, color: C.amber, marginTop: 8, lineHeight: 1.45 }}>
          Phone alarms require the app to stay open. For a guaranteed alarm, also set your phone's built-in alarm.
        </div>
        <button className="sprig-tap" onClick={() => { try { playAlarmTone(profile?.alarmSound || "bells", profile?.alarmVolume ?? 0.7); } catch (_) {} }}
          style={{ marginTop: 10, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 600, color: C.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Volume2 size={13} /> Test alarm sound
        </button>
      </div>
      </>)}

      {sub === "sleep" && (<>
      {/* history — Recent sleep logs with edit / delete / ignore (Fix 3) */}
      {sleepLogs.length >= 1 && (
        <>
          <div style={{ margin: "18px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>Recent sleep logs</div>

          {/* short-sleep banner: latest log looks accidental and isn't already ignored */}
          {(() => {
            const latest = [...sleepLogs].sort((a, b) => a.waketime - b.waketime)[sleepLogs.length - 1];
            if (!latest || dismissShortBanner) return null;
            if ((latest.durationMin || 0) >= 20 || latest.ignoredFromScore) return null;
            return (
              <div style={{ background: C.isDark ? "#2a200a" : "#fdf6e9", border: `1px solid ${C.amber}66`, borderRadius: 12, padding: "11px 13px", marginBottom: 10, fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
                <b style={{ color: C.amber }}>This sleep looks unusually short</b> ({durLabel(latest.durationMin)}). It's excluded from your score and debt — was it intentional?
                <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                  <button className="sprig-tap" onClick={() => { onRemove(latest.id); setDismissShortBanner(true); }}
                    style={{ flex: 1, background: C.bg2, color: C.muted, border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 0", fontSize: 11.5, fontWeight: 600 }}>Discard</button>
                  <button className="sprig-tap" onClick={() => { onMarkNap && onMarkNap(latest.id); setDismissShortBanner(true); }}
                    style={{ flex: 1, background: C.amber + "22", color: C.amber, border: `1px solid ${C.amber}44`, cursor: "pointer", borderRadius: 9, padding: "8px 0", fontSize: 11.5, fontWeight: 700 }}>Save as nap</button>
                  <button className="sprig-tap" onClick={() => { setEditId(latest.id); setEditBed(minToHm(tsToMin(latest.bedtime))); setEditWake(minToHm(tsToMin(latest.waketime))); setDismissShortBanner(true); }}
                    style={{ flex: 1, background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 0", fontSize: 11.5, fontWeight: 600 }}>Edit</button>
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...sleepLogs].reverse().slice(0, 8).map((l) => {
              const ignored = !!l.ignoredFromScore;
              const editing = editId === l.id;
              return (
                <div key={l.id} style={{ background: C.card, borderRadius: 13, padding: "10px 13px", boxShadow: C.shadow, border: `1px solid ${ignored ? C.line : C.line}`, opacity: ignored ? 0.6 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, textAlign: "center" }}>
                      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: ignored ? C.muted : (l.score >= 80 ? C.greenSoft : l.score >= 60 ? C.amber : C.coral) }}>{l.score}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{durLabel(l.durationMin)} {l.short && <span style={{ fontSize: 10, color: C.amber, fontWeight: 600 }}>· short</span>}{ignored && <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}> · ignored</span>}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{new Date(l.waketime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                    </div>
                    {onToggleIgnore && (
                      <button className="sprig-tap" onClick={() => onToggleIgnore(l.id)} title={ignored ? "Count toward score" : "Ignore from score"}
                        style={{ background: "none", border: "none", cursor: "pointer", color: ignored ? C.muted : C.greenSoft, padding: 4 }}>
                        {ignored ? <EyeOff size={15} /> : <Check size={15} />}
                      </button>
                    )}
                    {onEditLog && (
                      <button className="sprig-tap" onClick={() => { setEditId(editing ? null : l.id); setEditBed(minToHm(tsToMin(l.bedtime))); setEditWake(minToHm(tsToMin(l.waketime))); }} title="Edit times"
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
                        <PencilLine size={14} />
                      </button>
                    )}
                    <button className="sprig-tap" onClick={() => onRemove(l.id)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                  {editing && onEditLog && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                      <label style={{ fontSize: 11, color: C.muted }}>Bed</label>
                      <input type="time" value={editBed} onChange={(e) => setEditBed(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 7px", fontSize: 13, fontFamily: "DM Sans" }} />
                      <label style={{ fontSize: 11, color: C.muted }}>Wake</label>
                      <input type="time" value={editWake} onChange={(e) => setEditWake(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 7px", fontSize: 13, fontFamily: "DM Sans" }} />
                      <button className="sprig-tap" onClick={() => {
                        // build new timestamps anchored on the existing log's wake date
                        const baseWake = new Date(l.waketime);
                        const [wh, wm] = editWake.split(":").map(Number);
                        const wakeTs = new Date(baseWake.getFullYear(), baseWake.getMonth(), baseWake.getDate(), wh, wm).getTime();
                        const [bh, bm] = editBed.split(":").map(Number);
                        let bedDate = new Date(wakeTs); bedDate.setHours(bh, bm, 0, 0);
                        // if bed time is "after" wake time on the clock, it was the previous evening
                        if (bedDate.getTime() >= wakeTs) bedDate.setDate(bedDate.getDate() - 1);
                        onEditLog(l.id, bedDate.getTime(), wakeTs);
                        setEditId(null);
                      }} style={{ marginLeft: "auto", background: C.green, color: "#fff", border: "none", cursor: "pointer", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>Save</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      </>)}
      <div style={{ height: 6 }} />
    </div>
  );
}
function sleepTip(log, debtMin, need) {
  if (log.durationMin < need - 60) return "Short night. Aim to be in bed 30–60 min earlier tonight to start clearing the deficit.";
  if (log.restlessness > 55) return "Restless sleep — a cooler, darker room and no screens before bed can deepen it.";
  if (log.stages?.deep != null && log.stages.deep < log.durationMin * 0.13) return "Deep sleep ran low. Avoid late caffeine and alcohol, and keep a steady bedtime.";
  if (debtMin > 240) return "Good night, but you're still in debt — a few consistent early nights will reset your energy.";
  return "Solid, restorative night. Keep your wake time consistent to lock in the rhythm.";
}

/* ---------------- Energy tab (Rise-style timeline) -------------- */
// Energy-today curve graph — extracted so it can render in both the Sleep tab and Energy tab.
// Reads everything from sleepInfo; shows a calm empty state when there isn't enough data yet.
function EnergyCurveCard({ sleepInfo }) {
  const { curve, gym, mealMarks, rec, wakeMin, todayBed } = sleepInfo;
  // tick every 2 min so the "Now" marker advances while the app is open
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 120000); return () => clearInterval(id); }, []);
  if (!curve || !curve.length) {
    return (
      <div style={{ background: C.card, borderRadius: 20, padding: "24px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}`, textAlign: "center" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: C.greenSoft + "22", display: "grid", placeItems: "center", margin: "0 auto 10px" }}><Zap size={19} color={C.greenSoft} /></div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>Energy curve appears after sleep and check-in data.</div>
      </div>
    );
  }
  // ---- Centered window: Now sits in the middle; past energy on the left, predicted on the right.
  const W = 380, H = 150, padL = 8, padR = 8, top = 12, bot = 22;
  const DAY = 1440, HALF = 480;                 // ±8 hours → 16h visible span
  const nowMin = tsToMin(Date.now());           // minutes since midnight (0..1440)
  const lo = nowMin - HALF, hi = nowMin + HALF;  // absolute-minute domain (may be <0 or >1440)
  const x = (m) => padL + ((m - lo) / (hi - lo)) * (W - padL - padR);
  const y = (e) => top + (1 - Math.max(0, Math.min(100, e)) / 100) * (H - top - bot);
  const wrap = (m) => ((m % DAY) + DAY) % DAY;
  // For a wrapped minute-of-day value, return the copy (…-1day, same, +1day) that lands in [lo,hi].
  const inWin = (mod) => {
    for (const off of [-DAY, 0, DAY]) { const v = mod + off; if (v >= lo - 1 && v <= hi + 1) return v; }
    return null;
  };

  const bedM = wrap(rec?.recBed ?? todayBed ?? 1380);
  const wakeM = wrap(rec?.recWake ?? wakeMin ?? 420);
  const SLEEP_E = 8;
  const inSleep = (mod) => (bedM > wakeM ? (mod >= bedM || mod < wakeM) : (mod >= bedM && mod < wakeM));

  // Build the energy curve across the visible window by sampling every 10 min of absolute time.
  // Awake minutes read the modeled curve (nearest sample); sleep minutes sit flat-low.
  const awake = curve.map((p) => ({ min: wrap(p.min), e: p.e })).sort((a, b) => a.min - b.min);
  const sampleAwake = (mod) => {
    if (!awake.length) return 40;
    let best = awake[0], bd = 1e9;
    for (const p of awake) { const d = Math.min(Math.abs(p.min - mod), DAY - Math.abs(p.min - mod)); if (d < bd) { bd = d; best = p; } }
    return best.e;
  };
  const pts = [];
  for (let m = lo; m <= hi; m += 10) { const mod = wrap(m); pts.push({ m, e: inSleep(mod) ? SLEEP_E : sampleAwake(mod) }); }
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.m).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${x(pts[pts.length - 1].m).toFixed(1)},${H - bot} L${x(pts[0].m).toFixed(1)},${H - bot} Z` : "";

  // Sleep band rect(s) visible in the window
  const sleepRects = [];
  for (const off of [-DAY, 0, DAY]) {
    let a = bedM + off, b = (bedM > wakeM ? wakeM + DAY : wakeM) + off;
    const ca = Math.max(a, lo), cb = Math.min(b, hi);
    if (cb > ca) sleepRects.push([ca, cb]);
  }
  const nowX = x(nowMin); // == horizontal center by construction

  // Hourly ticks at clean clock hours inside the window
  const ticks = [];
  const firstHour = Math.ceil(lo / 120) * 120;     // every 2h
  for (let m = firstHour; m <= hi; m += 120) ticks.push(m);
  const tickLabel = (m) => `${String(wrap(Math.round(m / 60) * 60) / 60 % 24).padStart(2, "0")}:00`;

  return (
    <div style={{ background: C.card, borderRadius: 20, padding: "14px 12px 8px", boxShadow: C.shadow, border: `1px solid ${C.line}`, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.leaf} stopOpacity={C.isDark ? "0.45" : "0.30"} />
            <stop offset="100%" stopColor={C.leaf} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* faint "past" shade left of Now */}
        <rect x={padL} y={top} width={Math.max(0, nowX - padL)} height={H - top - bot} fill={C.ink} opacity={C.isDark ? "0.06" : "0.03"} />
        {/* recommended sleep band */}
        {sleepRects.map(([a, b], i) => (
          <rect key={"sl" + i} x={x(a)} y={top} width={Math.max(0, x(b) - x(a))} height={H - top - bot} fill="#6C7BE0" opacity={C.isDark ? "0.16" : "0.12"} />
        ))}
        {/* hour gridlines */}
        {ticks.map((m, i) => <line key={"g" + i} x1={x(m)} y1={top} x2={x(m)} y2={H - bot} stroke={C.line} strokeWidth="1" />)}
        {/* gym window if it falls in view */}
        {gym && (() => { const gs = inWin(wrap(gym.start)), ge = inWin(wrap(gym.end)); return gs != null && ge != null ? <rect x={x(gs)} y={top} width={Math.max(2, x(ge) - x(gs))} height={H - top - bot} fill={C.green} opacity="0.10" rx="4" /> : null; })()}
        {area && <path d={area} fill="url(#eg)" />}
        {line && <path d={line} fill="none" stroke={C.leaf} strokeWidth="2.4" strokeLinejoin="round" />}
        {(mealMarks || []).map((mk, i) => { const mx = inWin(wrap(mk.min)); return mx == null ? null : (
          <g key={i}>
            <line x1={x(mx)} y1={top} x2={x(mx)} y2={H - bot} stroke={C.amber} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
            <circle cx={x(mx)} cy={H - bot} r="3.5" fill={C.amber} />
          </g>
        ); })}
        {/* sleep label if a band is wide enough */}
        {sleepRects.map(([a, b], i) => (x(b) - x(a) > 36 ? <text key={"st" + i} x={(x(a) + x(b)) / 2} y={top + 12} fontSize="9" fill="#8E9BEA" textAnchor="middle" fontFamily="DM Sans" fontWeight="700">Sleep</text> : null))}
        {/* NOW marker — centered */}
        <line x1={nowX} y1={top - 4} x2={nowX} y2={H - bot} stroke={C.coral} strokeWidth="1.8" />
        <circle cx={nowX} cy={top - 4} r="3" fill={C.coral} />
        <text x={nowX} y={top - 7} fontSize="9" fill={C.coral} textAnchor="middle" fontFamily="DM Sans" fontWeight="700">Now</text>
        {/* hour labels */}
        {ticks.map((m, i) => (
          <text key={"t" + i} x={Math.min(W - 12, Math.max(12, x(m)))} y={H - 6} fontSize="9" fill={C.muted} textAnchor="middle" fontFamily="DM Sans">{tickLabel(m)}</text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, padding: "4px 6px 2px", flexWrap: "wrap" }}>
        <Legend c={C.leaf} label="Energy" />
        <Legend c="#8E9BEA" label={`Sleep ${minToLabel(bedM)}–${minToLabel(wakeM)}`} />
        <Legend c={C.amber} label="Meals" />
        {gym && <Legend c={C.green} label="Gym" faded />}
        <Legend c={C.coral} label="Now" />
      </div>
    </div>
  );
}

function EnergyTab({ sleepInfo, entries, t }) {
  const { curve, gym, wakeMin, todayBed, rec, debtMin, mealMarks } = sleepInfo;
  if (!curve.length) return <div style={{ padding: 30, textAlign: "center", color: C.muted }}>Log some sleep to build your energy schedule.</div>;

  const W = 380, H = 150, padL = 6, padR = 6, top = 12, bot = 22;
  const minX = curve[0].min, maxX = curve[curve.length - 1].min;
  const x = (m) => padL + ((m - minX) / (maxX - minX)) * (W - padL - padR);
  const y = (e) => top + (1 - e / 100) * (H - top - bot);
  const line = curve.map((p, i) => `${i ? "L" : "M"}${x(p.min).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ");
  const area = `${line} L${x(maxX).toFixed(1)},${H - bot} L${x(minX).toFixed(1)},${H - bot} Z`;
  const nowMin = tsToMin(Date.now());
  const showNow = nowMin >= minX % DAYMIN && nowMin <= maxX;

  // build the day's plan list
  const peak = curve.reduce((a, p) => (p.e > a.e ? p : a), curve[0]);
  const dip = curve.filter((p) => p.min > wakeMin + 240 && p.min < wakeMin + 540).reduce((a, p) => (p.e < a.e ? p : a), curve[Math.floor(curve.length / 2)] || curve[0]);
  const plan = [
    { min: wakeMin, icon: <Sun size={15} />, c: C.amber, label: "Wake up", sub: "get daylight + protein to kill grogginess" },
    { min: peak.min, icon: <Zap size={15} />, c: C.greenSoft, label: "Peak focus", sub: `energy ${peak.e}/100 — do your hardest work` },
    ...(gym ? [{ min: gym.start, icon: <Dumbbell size={15} />, c: C.green, label: "Best gym window", sub: `${minToLabel(gym.start)}–${minToLabel(gym.end)} · fueled & high energy` }] : []),
    { min: dip.min, icon: <Coffee size={15} />, c: C.coral, label: "Afternoon dip", sub: "light task, walk, or short coffee — not a nap" },
    { min: rec.blueCutoff, icon: <EyeOff size={15} />, c: "#6E83D6", label: "Stop blue light", sub: "dim screens to let melatonin rise" },
    { min: rec.recBed, icon: <Moon size={15} />, c: "#7A6FB0", label: "Bedtime", sub: debtMin > 60 ? "earlier tonight to clear sleep debt" : "consistent bedtime keeps energy steady" },
  ].sort((a, b) => a.min - b.min);

  return (
    <div className="sprig-rise">
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: "2px 2px 2px" }}>Your energy today</div>
      <div style={{ fontSize: 12, color: C.muted, margin: "0 2px 14px" }}>
        Modeled from your sleep, {durLabel(debtMin)} debt, and {mealMarks.length} logged meal{mealMarks.length === 1 ? "" : "s"}.
      </div>

      {/* energy curve */}
      <EnergyCurveCard sleepInfo={sleepInfo} />

      {/* gym recommendation */}
      {gym && (
        <div style={{ background: "linear-gradient(135deg," + C.green + "," + C.greenSoft + ")", borderRadius: 18, padding: 16, color: "#fff", marginTop: 14, display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", flexShrink: 0 }}><Dumbbell size={21} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, opacity: .85 }}>BEST TIME TO TRAIN</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }}>{minToLabel(gym.start)} – {minToLabel(gym.end)}</div>
            <div style={{ fontSize: 11.5, opacity: .9, marginTop: 2 }}>
              {mealMarks.some((m) => (gym.start - m.min) / 60 > 1 && (gym.start - m.min) / 60 < 3.5 && m.carbs > 20)
                ? "Well-fueled from your carbs + peak energy." : "Highest energy + late-afternoon performance peak."}
            </div>
          </div>
        </div>
      )}

      {/* day plan timeline */}
      <div style={{ margin: "18px 2px 10px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>Today's schedule</div>
      <div style={{ position: "relative", paddingLeft: 8 }}>
        <div style={{ position: "absolute", left: 19, top: 8, bottom: 8, width: 2, background: C.line }} />
        {plan.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 14, position: "relative" }}>
            <div style={{ width: 24, height: 24, borderRadius: 99, background: p.c, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0, zIndex: 1, boxShadow: C.shadow }}>{p.icon}</div>
            <div style={{ flex: 1, paddingTop: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</span>
                <span style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>{minToLabel(p.min)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{p.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* logged meals on timeline */}
      {mealMarks.length > 0 && (
        <>
          <div style={{ margin: "8px 2px 8px", fontSize: 12.5, fontWeight: 600, color: C.muted }}>Meals you logged today</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[...mealMarks].sort((a, b) => a.min - b.min).map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, borderRadius: 12, padding: "9px 13px", border: `1px solid ${C.line}` }}>
                <span style={{ fontSize: 12.5, color: C.amber, fontWeight: 700, width: 64 }}>{minToLabel(m.min)}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                <span style={{ fontSize: 11.5, color: C.muted }}>{Math.round(m.carbs)}g carbs</span>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ height: 6 }} />
    </div>
  );
}
function Legend({ c, label, faded }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
    <span style={{ width: 10, height: 10, borderRadius: 3, background: c, opacity: faded ? 0.25 : 1 }} /> {label}
  </span>;
}

/* ---------------- Trends tab -------------- */
function ReportStat({ label, value, sub, icon, color }) {
  return (
    <div style={{ background: C.bg, borderRadius: 12, padding: "11px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: color || C.greenSoft, fontSize: 11, fontWeight: 600 }}>{icon} {label}</div>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, marginTop: 4, color: C.ink }}>{value}</div>
      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{sub}</div>
    </div>
  );
}
function ReportLine({ emoji, label, text, color }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.3 }}>{emoji}</span>
      <div>
        <div style={{ fontSize: 10.5, color: color, fontWeight: 700, letterSpacing: .3, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 13, color: C.ink, marginTop: 1, lineHeight: 1.45 }}>{text}</div>
      </div>
    </div>
  );
}

function TrendsTab({ history, targets, t, scores, sleepLogs, sleepInfo, advanced, report, profile, achievements }) {
  const days = history.slice(-7);
  const maxC = Math.max(targets.calories, ...days.map((d) => d.calories), 1);
  const avg = days.length ? Math.round(days.reduce((a, d) => a + d.calories, 0) / days.length) : 0;
  const unit = profile?.unit || "kg";
  const R = report || {};
  return (
    <div className="sprig-rise">
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: "4px 2px 4px" }}>Trends</div>
      <div style={{ fontSize: 12, color: C.muted, margin: "0 2px 14px" }}>Your last 7 days at a glance.</div>

      {/* WEEKLY REPORT */}
      {R.hasData ? (
        <div style={{ background: C.card, borderRadius: 20, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <BarChart3 size={17} color={C.greenSoft} />
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700 }}>Weekly report</div>
          </div>

          {/* stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <ReportStat label="Training" value={`${R.training.count} workout${R.training.count !== 1 ? "s" : ""}`} sub={R.training.totalSets ? `${R.training.totalSets} sets` : "—"} icon={<Dumbbell size={13} />} color="#3E7B53" />
            <ReportStat label="Sleep" value={R.sleep.avgMin != null ? durLabel(R.sleep.avgMin) : "—"} sub={R.sleep.avgScore != null ? `score ${R.sleep.avgScore}` : `${R.sleep.nights} nights`} icon={<Moon size={13} />} color="#7A6FB0" />
            <ReportStat label="Avg calories" value={R.nutrition.avgCal != null ? `${R.nutrition.avgCal}` : "—"} sub={R.nutrition.foodDays ? `${R.nutrition.foodDays} days logged` : "no food logged"} icon={<Flame size={13} />} color={C.amber} />
            <ReportStat label="Avg protein" value={R.nutrition.avgProt != null ? `${R.nutrition.avgProt}g` : "—"} sub={`hit ${R.nutrition.proteinHitDays}/7 days`} icon={<Flame size={13} />} color={C.green} />
            {R.weight.current != null && (
              <ReportStat label="Weight" value={`${R.weight.current} ${unit}`} sub={R.weight.rate != null ? `${R.weight.rate > 0 ? "+" : ""}${R.weight.rate} ${unit}/wk` : "trend forming"} icon={<User size={13} />} color={C.amber} />
            )}
            {R.nutrition.avgSteps != null && (
              <ReportStat label="Avg steps" value={`${R.nutrition.avgSteps}`} sub="per day" icon={<Activity size={13} />} color={C.greenSoft} />
            )}
            {R.nutrition.avgWater != null && (
              <ReportStat label="Avg water" value={`${(R.nutrition.avgWater / 1000).toFixed(1)}L`} sub="per day" icon={<Coffee size={13} />} color="#5B9BD5" />
            )}
            {R.mind.consistency != null && (
              <ReportStat label="Habits" value={`${R.mind.consistency}%`} sub="consistency" icon={<Sparkles size={13} />} color={C.greenSoft} />
            )}
          </div>

          {/* top muscles */}
          {R.training.topMuscles.length > 0 && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
              <b style={{ color: C.inkSoft }}>Most-trained:</b> {R.training.topMuscles.map((m) => `${m.name} (${m.sets})`).join(" · ")}
            </div>
          )}
          {/* PRs */}
          {R.training.prs.length > 0 && (
            <div style={{ fontSize: 11.5, color: C.greenSoft, marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>
              🏆 {R.training.prs.length} PR{R.training.prs.length > 1 ? "s" : ""}: {R.training.prs.slice(0, 3).map((p) => p.name).join(", ")}
            </div>
          )}
          {/* pain / stress */}
          {(R.pain.count > 0 || R.mind.stressHigh > 0) && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
              {R.pain.count > 0 ? `Pain logged ${R.pain.count}×` : ""}{R.pain.count > 0 && R.mind.stressHigh > 0 ? " · " : ""}{R.mind.stressHigh > 0 ? `${R.mind.stressHigh} high-stress day${R.mind.stressHigh > 1 ? "s" : ""}` : ""}
            </div>
          )}

          {/* win / bottleneck / next */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 10 }}>
            {R.win && (
              <ReportLine emoji="🌟" label="Best win" text={R.win} color={C.greenSoft} />
            )}
            {R.bottleneck && (
              <ReportLine emoji="🚧" label="Biggest bottleneck" text={R.bottleneck} color={C.amber} />
            )}
            <ReportLine emoji="🎯" label="Next week" text={R.nextWeek} color={C.green} />
          </div>
        </div>
      ) : (
        <div style={{ background: C.card, borderRadius: 18, padding: "22px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 14, textAlign: "center" }}>
          <BarChart3 size={26} color={C.line} style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>Log workouts, food, and sleep through the week — your weekly report builds automatically.</div>
        </div>
      )}

      {/* ACHIEVEMENTS */}
      {achievements?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, margin: "0 2px 8px" }}>
            <Trophy size={15} color={C.amber} /> Achievements <span style={{ fontFamily: "DM Sans", fontSize: 11.5, color: C.muted, fontWeight: 400 }}>· {achievements.length}</span>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "thin", msOverflowStyle: "none" }} className="sprig-scroll">
            {achievements.map((a) => (
              <div key={a.id} style={{ flexShrink: 0, width: 138, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 12px", boxShadow: C.shadow }}>
                <div style={{ fontSize: 22, lineHeight: 1 }}>{a.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginTop: 6, lineHeight: 1.3 }}>{a.title}</div>
                <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, margin: "2px 2px 8px" }}>Daily calories</div>
      <div style={{ fontSize: 11.5, color: C.muted, margin: "0 2px 10px" }}>avg {avg} kcal/day</div>

      <div style={{ background: C.card, borderRadius: 18, padding: "18px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {days.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>Log a few days to see your trend here.</div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130 }}>
            {days.map((d) => {
              const h = Math.max(6, (d.calories / maxC) * 110);
              const over = d.calories > targets.calories;
              return (
                <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 9.5, color: C.muted }}>{d.calories}</div>
                  <div style={{ width: "100%", height: h, background: over ? C.coralSoft : C.leaf, borderRadius: 7, transition: "height .5s ease" }} />
                  <div style={{ fontSize: 10, color: C.muted }}>{new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 8, fontSize: 11, color: C.muted, textAlign: "center" }}>
          target {targets.calories} kcal
        </div>
      </div>

      <div style={{ margin: "16px 2px 8px", fontSize: 13, fontWeight: 600, color: C.inkSoft }}>Today's functional balance</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 11 }}>
        {scores.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 92, fontSize: 12, color: C.inkSoft }}>{s.emoji} {s.label}</span>
            <div style={{ flex: 1, height: 7, background: C.bg2, borderRadius: 99 }}>
              <div style={{ width: s.score + "%", height: "100%", background: s.color, borderRadius: 99 }} />
            </div>
            <span style={{ width: 28, textAlign: "right", fontSize: 12, fontWeight: 700, color: s.color }}>{s.score}</span>
          </div>
        ))}
      </div>

      {/* sleep trend */}
      {sleepLogs && sleepLogs.length > 0 && (
        <>
          <div style={{ margin: "18px 2px 8px", fontSize: 13, fontWeight: 600, color: C.inkSoft, display: "flex", alignItems: "center", gap: 6 }}>
            <Moon size={14} color="#7A6FB0" /> Sleep · last {Math.min(7, sleepLogs.length)} nights
          </div>
          <div style={{ background: C.card, borderRadius: 18, padding: "16px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            {(() => {
              const sd = sleepLogs.slice(-7);
              const maxH = Math.max(sleepInfo.need + 60, ...sd.map((l) => l.durationMin), 1);
              return (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                  {sd.map((l) => {
                    const h = Math.max(8, (l.durationMin / maxH) * 100);
                    const ok = l.durationMin >= sleepInfo.need - 30;
                    return (
                      <div key={l.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <div style={{ fontSize: 9, color: C.muted }}>{(l.durationMin / 60).toFixed(1)}h</div>
                        <div style={{ width: "100%", height: h, background: ok ? "#7A6FB0" : C.coralSoft, borderRadius: 7 }} />
                        <div style={{ fontSize: 9.5, color: C.muted }}>{new Date(l.waketime).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 8, fontSize: 11, color: C.muted, textAlign: "center" }}>
              need {durLabel(sleepInfo.need)} · current debt {durLabel(sleepInfo.debtMin)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= CLOUD SYNC (optional, additive) =================
   Sprig keeps all data in localStorage. When the user signs in with Supabase,
   they can manually push (syncToCloud) or pull (restoreFromCloud) the entire
   sprig_* keyset. Auth/cloud is fully optional — if Supabase env vars aren't
   set, getSupabase() returns null and these helpers degrade gracefully. */

// Walk localStorage and return every key prefixed `sprig_` as an object.
// Returns {} on any failure (private browsing throws on access, etc.).
function collectSprigLocalData() {
  const out = {};
  try {
    if (typeof window === "undefined" || !window.localStorage) return out;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("sprig_")) {
        try { out[k] = window.localStorage.getItem(k); } catch (_) { /* skip bad key */ }
      }
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
  const data = collectSprigLocalData();
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
        window.localStorage.setItem(k, incoming[k]);
      }
    }
    window.localStorage.setItem("sprig_last_synced_at", new Date().toISOString());
  } catch (e) {
    console.error("[sprig] restoreFromCloud write failed:", e);
    return { ok: false, error: "Couldn't write to local storage." };
  }
  return { ok: true, count: keys.length, updatedAt: data.updated_at };
}

// React hook: keeps the current Supabase session in state. Returns { user, loading, supabase }.
// If Supabase isn't configured, returns { user: null, loading: false, supabase: null }.
function useSupabaseAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(supabaseConfigured());
  const supabase = getSupabase();
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data?.session?.user || null);
      setLoading(false);
    }).catch((e) => { console.warn("[sprig] getSession failed:", e); if (mounted) setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user || null);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, [supabase]);
  return { user, loading, supabase };
}

/* ---------------- AccountSection (rendered inside MeTab) -------------- */
function AccountSection() {
  const { user, loading, supabase } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, text }
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [showFirstChoice, setShowFirstChoice] = useState(false);
  const [lastSynced, setLastSynced] = useState(() => {
    try { return window.localStorage.getItem("sprig_last_synced_at"); } catch (_) { return null; }
  });

  // After login/signup, prompt once: upload this device, restore cloud, or decide later.
  useEffect(() => {
    if (!user) return;
    try {
      const seen = window.localStorage.getItem("sprig_first_login_prompted_" + user.id);
      if (!seen) setShowFirstChoice(true);
    } catch (_) {}
  }, [user]);
  const dismissFirstChoice = () => {
    setShowFirstChoice(false);
    if (user) {
      try { window.localStorage.setItem("sprig_first_login_prompted_" + user.id, "1"); } catch (_) {}
    }
  };

  // Don't render anything if Supabase isn't configured — keeps existing builds untouched.
  if (!supabase) return null;

  const note = (ok, text) => setMsg({ ok, text });

  async function handleSignUp() {
    if (!email || !password) return note(false, "Email and password required.");
    if (password.length < 6) return note(false, "Password must be at least 6 characters.");
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) return note(false, error.message);
    // Supabase may or may not require email confirmation depending on project settings.
    note(true, "Account created. Check your email if confirmation is required, then log in.");
    setPassword("");
  }
  async function handleSignIn() {
    if (!email || !password) return note(false, "Email and password required.");
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) return note(false, error.message);
    note(true, "Signed in.");
    setEmail(""); setPassword("");
  }
  async function handleSignOut() {
    // Guard: if the user has never synced, warn before losing local data
    if (!lastSynced && !confirmSignOut) { setConfirmSignOut(true); return; }
    setConfirmSignOut(false);
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.signOut();
    setBusy(false);
    if (error) return note(false, error.message);
    note(true, "Signed out.");
  }
  async function handleSync() {
    setBusy(true); setMsg(null);
    const r = await syncToCloud();
    setBusy(false);
    if (!r.ok) { buzz("error"); return note(false, r.error); }
    setLastSynced(new Date().toISOString());
    buzz("success");
    note(true, "Synced " + r.count + " keys to your account.");
  }
  async function handleRestore() {
    setConfirmRestore(false);
    setBusy(true); setMsg(null);
    const r = await restoreFromCloud();
    setBusy(false);
    if (!r.ok) return note(false, r.error);
    note(true, "Restored " + r.count + " keys. Reloading…");
    setTimeout(() => { try { window.location.reload(); } catch (_) {} }, 800);
  }

  return (
    <>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Account</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 12 }}>
          <Cloud size={15} color={C.greenSoft} style={{ flexShrink: 0 }} />
          <span>Data is saved locally on this device. When logged in, you can sync a backup to your account and restore it on a new phone.</span>
        </div>

        {loading && <div style={{ fontSize: 12, color: C.muted }}>Checking session…</div>}

        {!loading && !user && (
          <>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>
              Your data is currently saved on this device. Create an account to sync it.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              <input
                type="email" inputMode="email" autoComplete="email" placeholder="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, outline: "none" }}
              />
              <input
                type="password" autoComplete="new-password" placeholder="password (min 6 chars)"
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, outline: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="sprig-tap" onClick={handleSignUp} disabled={busy}
                style={{ flex: 1, background: C.green, color: "#fff", border: "none", cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                <Plus size={14} /> Create account
              </button>
              <button className="sprig-tap" onClick={handleSignIn} disabled={busy}
                style={{ flex: 1, background: C.bg2, color: C.green, border: "none", cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                <LogIn size={14} /> Log in
              </button>
            </div>
          </>
        )}

        {!loading && user && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", background: C.bg, borderRadius: 11, marginBottom: 10 }}>
              <Mail size={14} color={C.muted} />
              <span style={{ flex: 1, fontSize: 12.5, color: C.ink, wordBreak: "break-all" }}>{user.email}</span>
            </div>
            {lastSynced && (
              <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 10 }}>
                Last synced: {new Date(lastSynced).toLocaleString()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="sprig-tap" onClick={handleSync} disabled={busy}
                style={{ background: C.green, color: "#fff", border: "none", cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                <CloudUpload size={14} /> Sync now
              </button>
              {!confirmRestore ? (
                <button className="sprig-tap" onClick={() => setConfirmRestore(true)} disabled={busy}
                  style={{ background: C.bg2, color: C.green, border: "none", cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "11px 0", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                  <CloudDownload size={14} /> Restore from cloud
                </button>
              ) : (
                <div style={{ background: "#fdf6e9", border: `1px solid ${C.amber}55`, borderRadius: 11, padding: 11 }}>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8, lineHeight: 1.45 }}>
                    Restore will overwrite this device's local Vitae data.
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="sprig-tap" onClick={() => setConfirmRestore(false)} style={{ flex: 1, background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                    <button className="sprig-tap" onClick={handleRestore} style={{ flex: 1, background: C.amber, color: "#fff", border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 700 }}>Yes, restore</button>
                  </div>
                </div>
              )}
              {confirmSignOut ? (
                <div style={{ background: C.isDark ? "#2a200a" : "#fdf6e9", border: `1px solid ${C.amber}55`, borderRadius: 11, padding: 11 }}>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8, lineHeight: 1.45 }}>
                    Your data hasn't been synced. Log out and lose unsynced changes?
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="sprig-tap" onClick={() => setConfirmSignOut(false)} style={{ flex: 1, background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 600 }}>Cancel</button>
                    <button className="sprig-tap" onClick={handleSignOut} style={{ flex: 1, background: C.coral, color: "#fff", border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 700 }}>Log out anyway</button>
                  </div>
                </div>
              ) : (
                <button className="sprig-tap" onClick={handleSignOut} disabled={busy}
                  style={{ background: "transparent", color: C.muted, border: `1px solid ${C.line}`, cursor: busy ? "default" : "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", opacity: busy ? 0.6 : 1 }}>
                  <LogOut size={13} /> Log out
                </button>
              )}
            </div>
          </>
        )}

        {msg && (
          <div style={{ marginTop: 11, fontSize: 11.5, color: msg.ok ? C.greenSoft : C.coral, background: (msg.ok ? C.greenSoft : C.coral) + "11", border: `1px solid ${(msg.ok ? C.greenSoft : C.coral)}55`, borderRadius: 9, padding: "8px 10px", lineHeight: 1.45 }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* First-login choice prompt — shown once per account on this device. */}
      {showFirstChoice && user && (
        <div onClick={dismissFirstChoice} className="sprig-dim"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
          <div onClick={(e) => e.stopPropagation()} className="sprig-sheet sprig-bottom-sheet"
            style={{ width: "100%", maxWidth: 440, background: C.cardSolid, borderRadius: "20px 20px 0 0", padding: "20px 18px 22px", boxShadow: "0 -8px 30px rgba(0,0,0,.18)" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Welcome!</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 14, lineHeight: 1.5 }}>
              Do you want to <b>sync this device's data</b> to your account, or <b>restore existing cloud data</b> onto this device?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="sprig-tap" onClick={() => { dismissFirstChoice(); handleSync(); }}
                style={{ background: C.green, color: "#fff", border: "none", cursor: "pointer", borderRadius: 11, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans" }}>
                <CloudUpload size={14} /> Upload this device
              </button>
              <button className="sprig-tap" onClick={() => { dismissFirstChoice(); setConfirmRestore(true); }}
                style={{ background: C.bg2, color: C.green, border: "none", cursor: "pointer", borderRadius: 11, padding: "12px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans" }}>
                <CloudDownload size={14} /> Restore cloud data
              </button>
              <button className="sprig-tap" onClick={dismissFirstChoice}
                style={{ background: "transparent", color: C.muted, border: "none", cursor: "pointer", padding: "9px 0", fontSize: 12, fontFamily: "DM Sans" }}>
                Decide later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Me / profile tab -------------- */
// More tab — extra main app pages only (NOT settings). Compact stacked links.
function MoreTab({ onGoTargets, onGoHealth, onGoMind, onGoProgress }) {
  const items = [
    ["Your targets", <Target size={18} color={C.lime} />, onGoTargets],
    ["Health markers", <HeartPulse size={18} color={C.greenSoft} />, onGoHealth],
    ["Mind & Habits", <Sparkles size={18} color={C.greenSoft} />, onGoMind],
    ["Progress", <TrendingUp size={18} color={C.greenSoft} />, onGoProgress],
  ];
  return (
    <div className="sprig-rise">
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, margin: "4px 2px 14px", letterSpacing: -0.3 }}>More</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {items.map(([title, icon, onClick]) => (
          <button key={title} className="sprig-tap" onClick={onClick}
            style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "15px 16px", boxShadow: C.shadow, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: C.bg2, display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>
            <span style={{ flex: 1, textAlign: "left", fontSize: 14.5, fontWeight: 600, color: C.ink }}>{title}</span>
            <ChevronRight size={18} color={C.muted} />
          </button>
        ))}
      </div>
    </div>
  );
}

function MeTab({ view = "settings", onBack, profile, targets, onSave, themeMode = "dark", onSetTheme, onExportJSON, onExportCSV, onImportJSON, onResetData, onLoadDemo, reminders, onSaveReminders, sleepInfo, onResetOnboarding }) {
  const [confirmResetOnb, setConfirmResetOnb] = useState(false);
  const importRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [p, setP] = useState(profile);
  const [saved, setSaved] = useState(false);
  const set = (k, v) => { setP((x) => ({ ...x, [k]: v })); setSaved(false); };
  const live = computeTargets(p);
  const Row = ({ label, children }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 13.5, color: C.inkSoft }}>{label}</span>{children}
    </div>
  );
  const Seg = ({ k, opts }) => (
    <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
      {opts.map(([v, lbl]) => (
        <button key={v} onClick={() => set(k, v)} className="sprig-tap"
          style={{ border: "none", cursor: "pointer", padding: "6px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans",
            background: p[k] === v ? C.card : "transparent", color: p[k] === v ? C.green : C.muted, boxShadow: p[k] === v ? C.shadow : "none" }}>{lbl}</button>
      ))}
    </div>
  );
  const Num = ({ k, suffix }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="number" value={p[k]} onChange={(e) => set(k, +e.target.value)}
        style={{ width: 58, textAlign: "right", border: `1px solid ${C.line}`, borderRadius: 9, padding: "6px 8px", fontFamily: "DM Sans", fontSize: 14, color: C.ink, background: C.card, outline: "none" }} />
      <span style={{ fontSize: 12, color: C.muted, width: 22 }}>{suffix}</span>
    </div>
  );
  return (
    <div className="sprig-rise">
      {onBack && (
        <button className="sprig-tap" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: "none", cursor: "pointer", color: C.inkSoft, fontSize: 13.5, fontWeight: 600, fontFamily: "DM Sans", padding: "2px 2px 10px", margin: 0 }}>
          <ChevronLeft size={17} /> {view === "settings" ? "Back" : "More"}
        </button>
      )}
      {view === "settings" && <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, margin: "0 2px 14px", letterSpacing: -0.3 }}>Settings</div>}
      {view === "targets" && (<>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: "4px 2px 12px" }}>Your targets</div>

      <div style={{ background: C.green, borderRadius: 18, padding: 16, color: "#fff", display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        {[["Calories", live.calories], ["Protein", live.protein + "g"], ["Carbs", live.carbs + "g"], ["Fat", live.fat + "g"]].map(([l, v]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700 }}>{v}</div>
            <div style={{ fontSize: 10.5, opacity: .8, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.card, borderRadius: 18, padding: "4px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <Row label="Goal"><Seg k="goal" opts={[["lose", "Cut"], ["maintain", "Maintain"], ["gain", "Bulk"]]} /></Row>
        <Row label="Sex"><Seg k="sex" opts={[["male", "M"], ["female", "F"]]} /></Row>
        <Row label="Activity"><Seg k="activity" opts={[["light", "Light"], ["moderate", "Mod"], ["active", "High"]]} /></Row>
        <Row label="Age"><Num k="age" suffix="yr" /></Row>
        <Row label="Weight"><Num k="weight" suffix="kg" /></Row>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 13.5, color: C.inkSoft }}>Height</span><Num k="height" suffix="cm" />
        </div>
        <Row label="Experience"><Seg k="experience" opts={[["beginner", "Beg"], ["intermediate", "Int"], ["advanced", "Adv"]]} /></Row>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}>
          <span style={{ fontSize: 13.5, color: C.inkSoft }}>Focus</span>
          <Seg k="focus" opts={[["gym", "Gym"], ["cardio", "Cardio"], ["sports", "Sport"], ["health", "Health"]]} />
        </div>
      </div>

      {/* advanced profile (optional, collapsed) */}
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 8, fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, padding: "2px 2px 10px" }}>
          <Calculator size={15} color={C.greenSoft} /> Advanced profile <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 400, fontFamily: "DM Sans", marginLeft: "auto" }}>optional ▾</span>
        </summary>
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
            All optional — fill in what's useful. These refine your coaching but aren't needed to use Sprig.
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Sport</div>
            <select value={p.sport || ""} onChange={(e) => set("sport", e.target.value)}
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink }}>
              <option value="">— None / general —</option>
              {SPORTS.map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
            </select>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Adds sport-specific tracking on Today and tailors training recommendations.</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Food preferences &amp; allergies</div>
            <textarea value={p.foodPrefs || ""} onChange={(e) => set("foodPrefs", e.target.value)} placeholder="e.g. vegetarian, lactose-free, no shellfish…"
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink, minHeight: 44, resize: "vertical", lineHeight: 1.45 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Equipment available</div>
            <select value={p.equipment || "full"} onChange={(e) => set("equipment", e.target.value)}
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink }}>
              {EQUIPMENT.map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
            </select>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Exercises that need missing equipment are hidden from the picker.</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Dietary preferences</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {[["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["halal", "Halal"], ["kosher", "Kosher"], ["pescatarian", "Pescatarian"], ["lactose_free", "Lactose-free"], ["gluten_free", "Gluten-free"]].map(([k, lbl]) => {
                const on = (p.diet || []).includes(k);
                return (
                  <button key={k} className="sprig-tap" onClick={() => set("diet", on ? (p.diet || []).filter((x) => x !== k) : [...(p.diet || []), k])}
                    style={{ border: "none", cursor: "pointer", padding: "6px 11px", borderRadius: 8, fontSize: 11.5, fontWeight: 600, fontFamily: "DM Sans", background: on ? C.green : C.bg2, color: on ? "#fff" : C.muted }}>{lbl}</button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Allergies &amp; dislikes</div>
            <textarea value={p.allergies || ""} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. peanuts, shellfish, no mushrooms…"
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink, minHeight: 44, resize: "vertical", lineHeight: 1.45 }} />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Weight unit</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[["kg", "kg"], ["lb", "lb"]].map(([k, lbl]) => (
                  <button key={k} className="sprig-tap" onClick={() => set("unit", k)}
                    style={{ flex: 1, border: "none", cursor: "pointer", padding: "8px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", background: (p.unit || "kg") === k ? C.green : C.bg2, color: (p.unit || "kg") === k ? "#fff" : C.muted }}>{lbl}</button>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Length unit</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[["cm", "cm"], ["in", "in"]].map(([k, lbl]) => (
                  <button key={k} className="sprig-tap" onClick={() => set("lengthUnit", k)}
                    style={{ flex: 1, border: "none", cursor: "pointer", padding: "8px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", background: (p.lengthUnit || "cm") === k ? C.green : C.bg2, color: (p.lengthUnit || "cm") === k ? "#fff" : C.muted }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Usual bedtime</div>
              <input type="time" value={p.usualBed || ""} onChange={(e) => set("usualBed", e.target.value)}
                style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>Usual wake</div>
              <input type="time" value={p.usualWake || ""} onChange={(e) => set("usualWake", e.target.value)}
                style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
            Injuries, supplements, training splits, and blood markers each have their own dedicated section — find them in Health, Today (supplement stack), Train (routines &amp; templates), and Health → Blood work.
          </div>
        </div>
      </details>

      <button className="sprig-tap" onClick={() => { onSave(p); setSaved(true); }}
        style={{ ...btn(saved ? C.greenSoft : C.green, "#fff"), width: "100%", padding: "14px 0", marginTop: 16 }}>
        {saved ? <><Check size={16} /> Saved</> : "Save targets"}
      </button>
      </>)}

      {view === "settings" && (<>
      {/* display mode */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "4px 2px 10px" }}>Display</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Gauge size={16} color={C.greenSoft} />
            <span style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600 }}>Detail level</span>
          </div>
          <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
            {[["simple", "Simple"], ["advanced", "Advanced"]].map(([v, lbl]) => {
              const on = (p.mode || "simple") === v;
              return (
                <button key={v} className="sprig-tap" onClick={() => { const np = { ...p, mode: v }; setP(np); onSave(np); }}
                  style={{ border: "none", cursor: "pointer", padding: "7px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans",
                    background: on ? C.card : "transparent", color: on ? C.green : C.muted, boxShadow: on ? C.shadow : "none" }}>{lbl}</button>
              );
            })}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          {(p.mode || "simple") === "simple"
            ? "Clean view: the numbers that matter day to day. Detailed breakdowns — micronutrients, muscle-by-muscle recovery, sleep stages, RIR and charts — stay tucked away."
            : "Full view: every metric is shown — micronutrient percentages, per-muscle recovery hours, sleep stages, RIR, estimated 1RMs and trend charts."}
        </div>
      </div>

      {/* APPEARANCE — Dark / Light theme */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Appearance</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Moon size={16} color={C.greenSoft} />
            <span style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600 }}>Theme</span>
          </div>
          <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
            {[["dark", "Dark", Moon], ["light", "Light", Sun]].map(([v, lbl, Ic]) => {
              const on = themeMode === v;
              return (
                <button key={v} className="sprig-tap" onClick={() => onSetTheme && onSetTheme(v)}
                  style={{ border: "none", cursor: "pointer", padding: "7px 13px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 6,
                    background: on ? C.card : "transparent", color: on ? C.green : C.muted, boxShadow: on ? C.shadow : "none" }}><Ic size={14} /> {lbl}</button>
              );
            })}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          {themeMode === "dark" ? "Kiwi dark — deep forest green with glass cards." : "Light — clean white background with dark text. The green accent stays."}
        </div>
        {/* Haptics on/off */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={16} color={C.greenSoft} />
            <span style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600 }}>Haptics</span>
          </div>
          <button className="sprig-tap" onClick={() => { const on = p.haptics === false; const np = { ...p, haptics: on }; setP(np); onSave(np); if (on) buzz("light"); }}
            style={{ position: "relative", width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: p.haptics === false ? C.bg2 : C.green, transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: p.haptics === false ? 3 : 21, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s" }} />
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          Subtle vibration when you log, complete a set, or finish a rest timer. Only on supported devices.
        </div>
        {/* Show wins on/off */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={16} color={C.lime} />
            <span style={{ fontSize: 13.5, color: C.inkSoft, fontWeight: 600 }}>Show wins</span>
          </div>
          <button className="sprig-tap" onClick={() => { const on = p.showWins === false; const np = { ...p, showWins: on }; setP(np); onSave(np); if (on) buzz("light"); }}
            style={{ position: "relative", width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: p.showWins === false ? C.bg2 : C.green, transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: p.showWins === false ? 3 : 21, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s" }} />
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          Quiet recognition for real progress — protein hits, PRs, sleep, consistency. Kudos are personal, never social. Workout records stay in history either way.
        </div>
      </div>

      {/* WORKOUT CALORIE ADJUSTMENT — Off / Conservative / Normal */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Workout calorie adjustment</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          How much extra to eat after a strength workout. Conservative is recommended — lifting burns less than fitness apps usually claim. Steps and cardio are tracked separately and don't change with this setting.
        </div>
        {(() => {
          const cur = profile?.workoutCalorieMode || "conservative";
          const OPTS = [
            ["off",          "Off",          "+0 kcal"],
            ["conservative", "Conservative", "+100 / +150 / +200"],
            ["normal",       "Normal",       "+150 / +250 / +350"],
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {OPTS.map(([k, lbl, sub]) => {
                const active = cur === k;
                return (
                  <button key={k} className="sprig-tap"
                    onClick={() => onSave({ ...profile, workoutCalorieMode: k })}
                    style={{ background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "DM Sans" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 99, border: `2px solid ${active ? C.green : C.muted}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {active && <div style={{ width: 7, height: 7, borderRadius: 99, background: C.green }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>easy / normal / hard session → {sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* PREFERRED REP RANGE */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Training rep range</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          Drives progressive-overload suggestions. When you hit the top of your range, Sprig advises adding a little weight.
        </div>
        {(() => {
          const cur = profile?.repRange || null;
          const OPTS = [[[5, 8], "5–8", "Strength"], [[8, 10], "8–10", "Strength + size"], [[10, 12], "10–12", "Hypertrophy"], [[12, 15], "12–15", "Endurance"]];
          return (
            <div style={{ display: "flex", gap: 7 }}>
              {OPTS.map(([range, lbl, sub]) => {
                const active = cur && cur[0] === range[0] && cur[1] === range[1];
                return (
                  <button key={lbl} className="sprig-tap" onClick={() => onSave({ ...profile, repRange: range, repRangeAsked: true })}
                    style={{ flex: 1, background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 4px", cursor: "pointer", textAlign: "center", fontFamily: "DM Sans" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: active ? C.green : C.ink }}>{lbl}</div>
                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>{sub}</div>
                  </button>
                );
              })}
            </div>
          );
        })()}
        {!profile?.repRange && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 9 }}>Currently using smart per-exercise defaults. Pick a range to standardize it.</div>}
      </div>

      {/* RIR TRACKING */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Reps in reserve (RIR)</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          After each set, Sprig can ask how close to failure you were. This sharpens progression suggestions.
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Ask after sets</div>
        {(() => {
          const cur = rirPref?.trackRir || "always";
          const OPTS = [
            ["always",    "Every set",         "Most accurate"],
            ["hard_sets", "Working sets only", "Skip warmups"],
            ["off",       "Never",             "Rep count only"],
          ];
          return (
            <div style={{ display: "flex", gap: 7, marginBottom: 14 }}>
              {OPTS.map(([k, lbl, sub]) => {
                const active = cur === k;
                return (
                  <button key={k} className="sprig-tap" onClick={() => { const next = { ...(rirPref || {}), trackRir: k }; saveRirPref(next); }}
                    style={{ flex: 1, background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 4px", cursor: "pointer", textAlign: "center", fontFamily: "DM Sans" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: active ? C.green : C.ink }}>{lbl}</div>
                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>{sub}</div>
                  </button>
                );
              })}
            </div>
          );
        })()}
        <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Intensity style</div>
        {(() => {
          const cur = rirPref?.intensityStyle || "balanced";
          const OPTS = [
            ["failure",          "To failure",    "Maximum effort every set"],
            ["close_to_failure", "Near failure",  "0–1 RIR, very hard"],
            ["balanced",         "Balanced",      "1–2 RIR, strong but controlled"],
            ["leave_reps",       "Leave reps",    "2–3 RIR, technique-first"],
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {OPTS.map(([k, lbl, sub]) => {
                const active = cur === k;
                return (
                  <button key={k} className="sprig-tap" onClick={() => { const next = { ...(rirPref || {}), intensityStyle: k }; saveRirPref(next); }}
                    style={{ background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "DM Sans" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 99, border: `2px solid ${active ? C.green : C.muted}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {active && <div style={{ width: 7, height: 7, borderRadius: 99, background: C.green }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* DAY RESET MODE */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Day reset</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          When your tracking day rolls over. Late-night food and drinks before the reset count toward the previous day.
        </div>
        {(() => {
          const cur = profile?.dayResetMode || "after-wake";
          const OPTS = [
            ["after-wake", "After wake-up / 04:00 fallback", "Resets when you wake, else 4 AM"],
            ["fixed-4am",  "Fixed 04:00",                    "Always resets at 4 AM"],
            ["midnight",   "Midnight",                       "Classic calendar day"],
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {OPTS.map(([k, lbl, sub]) => {
                const active = cur === k;
                return (
                  <button key={k} className="sprig-tap" onClick={() => onSave({ ...profile, dayResetMode: k })}
                    style={{ background: active ? C.green + "11" : C.bg, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 11, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "DM Sans" }}>
                    <div style={{ width: 16, height: 16, borderRadius: 99, border: `2px solid ${active ? C.green : C.muted}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {active && <div style={{ width: 7, height: 7, borderRadius: 99, background: C.green }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* TIMERS & ALARM SOUND */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Timers &amp; alarm</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {/* rest timer toggles */}
        {[["restTimerSound", "Rest timer sound"], ["restTimerVibrate", "Rest timer vibration"]].map(([k, lbl]) => {
          const on = profile?.[k] !== false;
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 2px" }}>
              <span style={{ flex: 1, fontSize: 13, color: C.ink }}>{lbl}</span>
              <button className="sprig-tap" onClick={() => onSave({ ...profile, [k]: !on })}
                style={{ width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: on ? C.green : C.bg2, position: "relative", transition: "background .2s" }}>
                <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
              </button>
            </div>
          );
        })}
        {/* rest timer sound choice */}
        <div style={{ fontSize: 11.5, color: C.muted, margin: "10px 2px 6px" }}>Rest timer sound</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {ALARM_SOUNDS.map((s) => {
            const active = (profile?.restTimerSoundChoice || "beep") === s.id;
            return (
              <button key={s.id} className="sprig-tap"
                onClick={() => { onSave({ ...profile, restTimerSoundChoice: s.id }); playAlarmTone(s.id, profile?.alarmVolume ?? 0.7); }}
                style={{ background: active ? C.green : C.bg, color: active ? "#fff" : C.inkSoft, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 99, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans" }}>
                {s.label}
              </button>
            );
          })}
        </div>

        <div style={{ height: 1, background: C.line, margin: "12px 0" }} />

        {/* alarm sound choice */}
        <div style={{ fontSize: 11.5, color: C.muted, margin: "0 2px 6px" }}>Alarm sound</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {ALARM_SOUNDS.map((s) => {
            const active = (profile?.alarmSound || "bells") === s.id;
            return (
              <button key={s.id} className="sprig-tap"
                onClick={() => { onSave({ ...profile, alarmSound: s.id }); playAlarmTone(s.id, profile?.alarmVolume ?? 0.7); }}
                style={{ background: active ? C.green : C.bg, color: active ? "#fff" : C.inkSoft, border: `1px solid ${active ? C.green : C.line}`, borderRadius: 99, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans" }}>
                {s.label}
              </button>
            );
          })}
        </div>

        {/* alarm volume */}
        <div style={{ fontSize: 11.5, color: C.muted, margin: "0 2px 6px" }}>Alarm volume · {Math.round((profile?.alarmVolume ?? 0.7) * 100)}%</div>
        <input type="range" min="0" max="100" value={Math.round((profile?.alarmVolume ?? 0.7) * 100)}
          onChange={(e) => onSave({ ...profile, alarmVolume: (+e.target.value) / 100 })}
          style={{ width: "100%", accentColor: C.green }} />

        {/* test button */}
        <button className="sprig-tap" onClick={() => playAlarmTone(profile?.alarmSound || "bells", profile?.alarmVolume ?? 0.7)}
          style={{ ...btn(C.bg2, C.green), width: "100%", padding: "11px 0", marginTop: 12, fontSize: 13, fontWeight: 700 }}>
          <Play size={14} /> Test alarm sound
        </button>
        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 1.5, textAlign: "center" }}>
          Tap Test sound once to enable alarm audio (browsers require a tap first). Background alarms while the app is closed aren't reliable in a browser — keep Sprig open for the smart alarm.
        </div>
      </div>

      {/* DEVELOPER */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Developer</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 2px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: C.ink }}>Developer mode</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Shows technical error details (e.g. AI/API codes). Off for everyday use.</div>
          </div>
          <button className="sprig-tap" onClick={() => onSave({ ...profile, devMode: !profile?.devMode })}
            style={{ width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: profile?.devMode ? C.green : C.bg2, position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: profile?.devMode ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
          </button>
        </div>
        {/* Reset onboarding — re-runs the setup flow without deleting any logged data */}
        {onResetOnboarding && (
          <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}>
            {!confirmResetOnb ? (
              <button className="sprig-tap" onClick={() => setConfirmResetOnb(true)}
                style={{ width: "100%", background: "transparent", border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 12, padding: "11px 0", color: C.inkSoft, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <RotateCcw size={14} /> Reset onboarding
              </button>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>This will show the setup flow again. Your logged data will not be deleted.</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="sprig-tap" onClick={() => setConfirmResetOnb(false)} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 13 }}>Cancel</button>
                  <button className="sprig-tap" onClick={() => { setConfirmResetOnb(false); onResetOnboarding(); }} style={{ ...btn(C.green, "#fff"), flex: 1, padding: "10px 0", fontSize: 13 }}>Show setup</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {reminders && onSaveReminders && (
        <>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Reminders</div>
          <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
              Pick which reminders you want — Sprig will know to send them. Notifications fire in the iOS app, not the web preview, so for now this saves your preferences.
            </div>
            {(() => {
              const caffeineCut = sleepInfo?.rec?.caffeineCutoff != null ? minToLabel(sleepInfo.rec.caffeineCutoff) : "~14:30";
              const sleepRoutine = sleepInfo?.rec?.recBed != null ? minToLabel(sleepInfo.rec.recBed - 30) : "~21:30";
              const ROWS = [
                ["weightAM",       "Log weight",          "Daily at 8:00 AM"],
                ["water",          "Drink water",         "Every 2 hours during the day"],
                ["supps",          "Take supplements",    "Daily at 9:00 AM"],
                ["sleepRoutine",   "Sleep routine",       `${sleepRoutine}, 30 min before bed`],
                ["caffeineCutoff", "Stop caffeine",       caffeineCut],
                ["progressPhoto",  "Progress photo",      "Every 2 weeks"],
                ["workout",        "Workout reminder",    "Daily, based on your schedule"],
                ["weeklyReview",   "Weekly review",       "Sundays at 7:00 PM"],
              ];
              return ROWS.map(([k, lbl, when]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 4px", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{when}</div>
                  </div>
                  <button className="sprig-tap" onClick={() => onSaveReminders({ ...reminders, [k]: !reminders[k] })}
                    style={{ border: "none", cursor: "pointer", width: 44, height: 26, borderRadius: 99, background: reminders[k] ? C.green : C.bg2, position: "relative", transition: "background .2s" }}>
                    <span style={{ position: "absolute", top: 3, left: reminders[k] ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.15)", transition: "left .2s" }} />
                  </button>
                </div>
              ));
            })()}
          </div>
        </>
      )}

      {/* ACTIVITY SOURCES */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Activity sources</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <ActivitySourcesSection profile={profile} onSetSource={(id) => onSave({ ...profile, activitySourcePreference: id })} />
      </div>

      {/* ACCOUNT (optional cloud sync) */}
      <AccountSection />

      {/* DATA & PRIVACY */}
      {onExportJSON && (
        <>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "22px 2px 10px" }}>Data &amp; privacy</div>
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: C.inkSoft, lineHeight: 1.5, marginBottom: 10 }}>
              <EyeOff size={15} color={C.greenSoft} style={{ flexShrink: 0 }} />
              <span>Your data is stored <b>only on this device</b> unless you export it. Nothing is uploaded to a server. Food and supplement photos are analyzed in the moment and never saved.</span>
            </div>
            {/* explicit data-loss warning + storage tier indicator */}
            <div style={{ background: "#fdf6e9", border: `1px solid ${C.amber}55`, borderRadius: 11, padding: "10px 12px", marginBottom: 12, fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55 }}>
              <b style={{ color: C.amber }}>Heads up:</b> Sprig stores your data locally on this device.
              If you clear browser data, switch browsers, or uninstall the app, that data may be lost.
              <b> Export a backup regularly</b> — even once a month is enough to feel safe.
              <div style={{ marginTop: 6, fontSize: 10.5, color: C.muted }}>
                Storage in use: <b style={{ color: C.inkSoft }}>browser localStorage</b>
              </div>
              <div style={{ marginTop: 4, fontSize: 10.5, color: C.muted }}>
                Profile saved: <b style={{ color: (() => {
                  try {
                    if (typeof window !== "undefined" && window.localStorage) {
                      return window.localStorage.getItem("sprig_profile_v1") != null ? C.greenSoft : C.coral;
                    }
                  } catch (_) {}
                  return C.coral;
                })() }}>{(() => {
                  try {
                    if (typeof window !== "undefined" && window.localStorage) {
                      return window.localStorage.getItem("sprig_profile_v1") != null ? "yes" : "no";
                    }
                  } catch (_) {}
                  return "no (localStorage not available)";
                })()}</b>
              </div>
              <div style={{ marginTop: 4, fontSize: 10.5, color: C.muted }}>
                Sprig keys in storage: <b style={{ color: C.inkSoft }}>{(() => {
                  try {
                    if (typeof window !== "undefined" && window.localStorage) {
                      let n = 0;
                      for (let i = 0; i < window.localStorage.length; i++) {
                        const k = window.localStorage.key(i);
                        if (k && k.startsWith("sprig_")) n++;
                      }
                      return n;
                    }
                  } catch (_) {}
                  return 0;
                })()}</b>
              </div>
            </div>
            {/* export */}
            <button className="sprig-tap" onClick={onExportJSON} style={{ ...btn(C.bg2, C.green), width: "100%", padding: "12px 0", marginBottom: 8 }}>
              <BarChart3 size={15} /> Export full backup (JSON)
            </button>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button className="sprig-tap" onClick={() => onExportCSV("workouts")} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 12 }}>Workouts CSV</button>
              <button className="sprig-tap" onClick={() => onExportCSV("weight")} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 12 }}>Weight CSV</button>
              <button className="sprig-tap" onClick={() => onExportCSV("nutrition")} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 12 }}>Food CSV</button>
            </div>
            {/* import */}
            <input ref={importRef} type="file" accept="application/json" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportJSON(f); }} />
            <button className="sprig-tap" onClick={() => importRef.current?.click()} style={{ ...btn(C.bg2, C.inkSoft), width: "100%", padding: "11px 0", fontSize: 13, marginBottom: 8 }}>
              <Plus size={14} /> Import a backup
            </button>
            {/* demo */}
            {onLoadDemo && (
              <button className="sprig-tap" onClick={onLoadDemo} style={{ width: "100%", background: "none", border: `1px dashed ${C.line}`, cursor: "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12.5, fontWeight: 600, color: C.greenSoft, fontFamily: "DM Sans", marginBottom: 6 }}>
                <Sparkles size={13} /> Load demo data (14 days)
              </button>
            )}
            {/* reset */}
            {!confirmReset ? (
              <button className="sprig-tap" onClick={() => setConfirmReset(true)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: C.coral, fontSize: 12.5, fontWeight: 600, padding: "8px 0", fontFamily: "DM Sans" }}>
                <Trash2 size={13} /> Reset all data
              </button>
            ) : (
              <div style={{ background: "#fdeee8", borderRadius: 12, padding: 12, marginTop: 4 }}>
                <div style={{ fontSize: 12, color: "#9a3d22", lineHeight: 1.5, marginBottom: 9 }}>This permanently deletes everything on this device. Export a backup first if you want to keep it. This can't be undone.</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="sprig-tap" onClick={() => setConfirmReset(false)} style={{ ...btn(C.card, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 13 }}>Cancel</button>
                  <button className="sprig-tap" onClick={onResetData} style={{ ...btn(C.coral, "#fff"), flex: 1, padding: "10px 0", fontSize: 13 }}>Delete everything</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14, lineHeight: 1.5, padding: "0 10px" }}>
        Targets use the Mifflin–St Jeor formula. Everything is stored on your device only. Estimates are approximate — great for awareness, not medical precision.
      </div>
      </>)}
    </div>
  );
}

/* ================= COACH TAB ================= */
function CoachCard({ icon, color, title, summary, bullets, accent, onOpen, openLabel }) {
  const [open, setOpen] = useState(false);
  const shown = open ? bullets : bullets.slice(0, 3);
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: color + "1f", display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1, lineHeight: 1.4 }}>{summary}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {shown.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: i === 0 ? color : C.bg2, color: i === 0 ? "#fff" : color, fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
            <span style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.45 }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center" }}>
        {bullets.length > 3 && (
          <button className="sprig-tap" onClick={() => setOpen((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 11.5, fontWeight: 600, padding: 0 }}>
            {open ? "Show less" : `+${bullets.length - 3} more`}
          </button>
        )}
        {onOpen && <button className="sprig-tap" onClick={onOpen} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color, fontSize: 12, fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 3 }}>{openLabel} <ChevronRight size={14} /></button>}
      </div>
    </div>
  );
}

function CoachTab({ coach, advanced, moveInfo, timeline, plateaus, patterns, onGoTrain, onGoMeals, onGoSleep, onGoHealth, onAsk }) {
  const recColor = coach.recovery.level === "hard" || coach.recovery.level === "normal" ? C.greenSoft
    : coach.recovery.level === "light" ? C.amber : C.coral;
  const diag = moveInfo?.diagnosis;
  return (
    <div className="sprig-rise">
      <div style={{ margin: "4px 2px 14px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={19} color={C.greenSoft} /> Your coach
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Clear actions from your data — no fluff, updates as you log.</div>
      </div>

      {onAsk && (
        <button className="sprig-tap" onClick={onAsk}
          style={{ width: "100%", background: C.lime, border: "none", cursor: "pointer", borderRadius: 14, padding: "15px 16px", color: "#0A1F12", display: "flex", alignItems: "center", gap: 11, marginBottom: 12, boxShadow: `0 6px 18px ${C.lime}33` }}>
          <Sparkles size={18} color="#0A1F12" />
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Ask coach</div>
            <div style={{ fontSize: 11, opacity: .7, marginTop: 1 }}>Anything about training, food, sleep, or recovery</div>
          </div>
          <ChevronRight size={17} />
        </button>
      )}

      {/* WHY AM I NOT PROGRESSING — headline diagnostic */}
      {diag && (diag.enough ? (
        <div style={{ background: C.heroGrad1, borderRadius: 20, padding: 18, color: "#fff", boxShadow: C.shadow, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: .75, letterSpacing: .3, marginBottom: 8 }}>
            <Search size={14} color="#E7DCC6" /> WHY AM I NOT PROGRESSING?
          </div>
          {diag.bottleneck ? (
            <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{diag.bottleneck.title}</div>
              <div style={{ fontSize: 12.5, opacity: .9, marginTop: 6, lineHeight: 1.5 }}>{diag.bottleneck.detail}</div>
              <div style={{ background: "rgba(255,255,255,.12)", borderRadius: 11, padding: "10px 12px", marginTop: 11 }}>
                <span style={{ fontSize: 11, opacity: .8, fontWeight: 600 }}>DO THIS: </span>
                <span style={{ fontSize: 12.5 }}>{diag.bottleneck.fix}</span>
              </div>
              {diag.good.length > 0 && (
                <div style={{ fontSize: 11.5, opacity: .8, marginTop: 10 }}>✓ Going well: {diag.good.join(", ")}.</div>
              )}
              {advanced && diag.others.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", listStyle: "none", fontSize: 11, opacity: .75, fontWeight: 600 }}>▾ Other factors</summary>
                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
                    {diag.others.map((o, i) => (
                      <div key={i} style={{ fontSize: 11.5, opacity: .85, lineHeight: 1.45 }}>• <b>{o.title}:</b> {o.fix}</div>
                    ))}
                  </div>
                </details>
              )}
            </>
          ) : (
            <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700 }}>No clear bottleneck 🌿</div>
              <div style={{ fontSize: 12.5, opacity: .9, marginTop: 6, lineHeight: 1.5 }}>{diag.summary} {diag.good.length ? `Going well: ${diag.good.join(", ")}.` : ""}</div>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "14px 16px", marginBottom: 12, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
          <b style={{ color: C.inkSoft }}>Why am I not progressing?</b><br />{diag.summary}
        </div>
      ))}

      <CoachCard icon={<Zap size={19} color={C.green} />} color={C.green}
        title="Daily coach" summary={coach.daily.summary} bullets={coach.daily.bullets} />

      <CoachCard icon={<Dumbbell size={19} color="#3E7B53" />} color="#3E7B53"
        title="Training coach" summary={coach.training.summary} bullets={coach.training.bullets}
        onOpen={onGoTrain} openLabel="Open Train" />

      <CoachCard icon={<Flame size={19} color={C.amber} />} color={C.amber}
        title="Nutrition coach" summary={coach.nutrition.summary} bullets={coach.nutrition.bullets}
        onOpen={onGoMeals} openLabel="Log food" />

      <CoachCard icon={<Moon size={19} color={recColor} />} color={recColor}
        title="Recovery coach" summary={coach.recovery.summary} bullets={coach.recovery.bullets}
        onOpen={onGoSleep} openLabel="Open Sleep" />

      {/* GOAL TIMELINE */}
      {Boolean(timeline?.weight || (timeline?.strength && timeline.strength.length)) && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>
            <Target size={15} color={C.greenSoft} /> Goal timeline
          </div>
          {timeline.weight && (
            <div style={{ background: C.bg, borderRadius: 11, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>WEIGHT</span>
                <span style={{ fontSize: 11.5, color: timeline.weight.color, fontWeight: 700 }}>{timeline.weight.status}</span>
              </div>
              <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
                {timeline.weight.current}kg → {timeline.weight.target}kg
                <span style={{ color: C.muted }}> ({timeline.weight.kgLeft > 0 ? "+" : ""}{timeline.weight.kgLeft}kg left)</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                Pace: {timeline.weight.rate > 0 ? "+" : ""}{timeline.weight.rate} kg/week
                {timeline.weight.weeksAtPace && timeline.weight.weeksAtPace > 0 && ` · ~${timeline.weight.weeksAtPace}w at this pace`}
              </div>
            </div>
          )}
          {timeline.strength?.length > 0 && (
            <div style={{ background: C.bg, borderRadius: 11, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>STRENGTH</div>
              {timeline.strength.map((s) => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.ink, marginTop: 3 }}>
                  <span>{s.name.replace("Barbell ", "")}</span>
                  <span><b>{s.e1}kg</b> e1RM <span style={{ color: s.perMonth > 0 ? C.greenSoft : C.muted }}>({s.perMonth > 0 ? "+" : ""}{s.perMonth}/mo)</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLATEAUS */}
      {plateaus?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>
            <Square size={14} color={C.amber} /> Plateaus detected
          </div>
          {plateaus.map((p, i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 11, padding: "10px 12px", marginTop: i ? 8 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.4 }}>{p.title}</div>
              <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginTop: 6, letterSpacing: .3 }}>POSSIBLE REASONS</div>
              <ul style={{ margin: "4px 0 0", padding: "0 0 0 18px", fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55 }}>
                {p.reasons.map((r, j) => <li key={j}>{r}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* PATTERN DETECTION */}
      {patterns?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>
            <Search size={14} color="#7A6FB0" /> Patterns in your data
          </div>
          {patterns.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <span style={{ fontSize: 14, lineHeight: 1.3 }}>{p.kind === "alcohol_sleep" ? "🍷" : p.kind === "steps_mood" ? "🚶" : p.kind === "pain_exercise" ? "⚠️" : "🔎"}</span>
              <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>{p.text}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 4, lineHeight: 1.5, padding: "0 14px" }}>
        These recommendations are rule-based and run instantly on your device — no AI calls, no waiting. The more you log, the sharper they get. 🌿
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}

/* ================= HEALTH TAB ================= */
/* ================= SEARCH ================= */
function SearchSheet({ onClose, onJump, results, query, setQuery }) {
  const kindIcon = (k) => ({ food: "🥗", exercise: "🏋️", workout: "📈", supp: "💊", pain: "⚠️", weight: "⚖️", sleep: "🌙", health: "❤️", focus: "🎯", note: "📝" })[k] || "•";
  return (
    <Portal>
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 3000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ maxWidth: 440, margin: "60px auto 0", background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, maxHeight: "75vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 18px 45px rgba(0,0,0,.45)" }}>
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
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 3000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ maxWidth: 440, margin: "40px auto 0", background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, boxShadow: "0 18px 45px rgba(0,0,0,.45)" }}>
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
  );
}

/* ================= ASK COACH (AI) ================= */
function AskCoachSheet({ onClose, context, runAnalysis, online = true, onSaveNote }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);
  // Does the coach have real data to work with? Drives the "Using your data" vs "General answer" badge.
  const hasData = !!(context && (context.today || context.averages14d || context.training || context.sleep || context.profile));
  const ask = async (text) => {
    setBusy(true); setErr(""); setA(null); setSaved(false);
    try {
      const reply = await runAnalysis(text, context);
      setA(reply);
    } catch (e) { setErr("AI is unavailable right now. Try again later."); }
    finally { setBusy(false); }
  };
  const presets = [
    "Why is my bench stalling?",
    "Why am I not gaining muscle?",
    "What should I improve this week?",
    "Should I cut, bulk, or maintain?",
  ];
  return (
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,.55)", zIndex: 3000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-sheet sprig-bottom-sheet"
        style={{ maxWidth: 440, margin: "0 auto", position: "absolute", bottom: 0, left: 0, right: 0, background: C.cardSolid, borderRadius: "20px 20px 0 0", padding: "18px 18px 22px", paddingBottom: "calc(22px + env(safe-area-inset-bottom, 0px))", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Sparkles size={17} color={C.greenSoft} />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, flex: 1 }}>Ask the coach</div>
          <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><X size={14} /></button>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
          Ask anything. I'll answer directly and use your health data only when it helps.
        </div>

        {!a && !busy && (
          <>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .3, marginBottom: 7 }}>QUICK QUESTIONS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
              {presets.map((p) => (
                <button key={p} className="sprig-tap" onClick={() => { setQ(p); ask(p); }}
                  style={{ background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 11, padding: "10px 12px", textAlign: "left", fontFamily: "DM Sans", fontSize: 13, color: C.inkSoft }}>
                  {p}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .3, marginBottom: 7 }}>OR ASK YOUR OWN</div>
            <textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. why is my recovery worse this week?"
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "12px 13px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink, minHeight: 64, resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }} />
            <button className="sprig-tap" disabled={!q.trim()} onClick={() => ask(q)}
              style={{ ...btn(q.trim() ? C.green : C.bg2, q.trim() ? "#fff" : C.muted), width: "100%", padding: "13px 0", marginTop: 9 }}>
              <Sparkles size={14} /> Ask
            </button>
          </>
        )}
        {busy && (
          <div style={{ textAlign: "center", padding: "34px 0" }}>
            <Loader2 size={22} color={C.green} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 12, fontWeight: 600 }}>Thinking with your latest data…</div>
          </div>
        )}
        {err && <div style={{ fontSize: 12.5, color: C.coral, marginTop: 12, padding: 12, background: "#fdeee8", borderRadius: 11, lineHeight: 1.5 }}>{err}</div>}
        {a && (
          <div className="sprig-pop">
            <div style={{ marginBottom: 9 }}>
              <Badge tone={hasData ? "success" : "neutral"}>{hasData ? "Using your data" : "General answer"}</Badge>
            </div>
            <div style={{ background: C.bg, borderRadius: 13, padding: 15, fontSize: 13.5, color: C.ink, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{a}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
              <Btn variant="secondary" full onClick={() => { setA(null); setQ(""); setSaved(false); }}>Ask another</Btn>
              {onSaveNote && <Btn variant="secondary" full onClick={() => { onSaveNote(q || "Coach", a); setSaved(true); }}>{saved ? "Saved ✓" : "Save note"}</Btn>}
              <Btn variant="primary" full onClick={onClose}>Done</Btn>
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginTop: 9, lineHeight: 1.5 }}>
              The coach uses your logged data. Not medical advice.
            </div>
          </div>
        )}
      </div>
    </div>
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
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,.55)", zIndex: 3000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ maxWidth: 440, margin: "30px auto 0", background: C.card, borderRadius: 20, padding: 16, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 28px rgba(0,0,0,.25)" }}>
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
  );
}

/* ================= QUICK LOG SHEET ================= */
function QuickLogSheet({ ci, daily, sleepInfo, profile, painActive, onCheckin, onDaily, onClose, onOpenWeight, onStartWorkout }) {
  const kb = useKeyboardInset();
  const trainedYes = (daily?.trainedToday) || false; // derived flag passed in via daily for simplicity
  const [trained, setTrained] = useState(trainedYes ? "yes" : null);
  const [protein, setProtein] = useState(null);
  const [slept, setSlept] = useState(null);
  const [walked, setWalked] = useState(null);
  const [pain, setPain] = useState(ci?.pain || null);
  const [w, setW] = useState("");

  const Q = ({ label, hint, value, opts, onPick }) => (
    <div style={{ background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", borderRadius: 13, padding: 13, marginBottom: 9 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>{label}</div>
      {hint && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{hint}</div>}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {opts.map(([k, lbl, color]) => (
          <button key={k} className="sprig-tap" onClick={() => onPick(k)}
            style={{ flex: 1, border: "none", cursor: "pointer", padding: "9px 0", borderRadius: 9, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: value === k ? (color || C.green) : C.bg2, color: value === k ? "#fff" : C.muted }}>{lbl}</button>
        ))}
      </div>
    </div>
  );

  const submit = () => {
    // store quick-log answers into the check-in object + bump the daily fields where useful
    const ciPatch = {};
    if (pain) ciPatch.pain = pain;
    if (slept) ciPatch.sleptEnough = slept;
    if (trained) ciPatch.quickTrained = trained;
    if (protein) ciPatch.quickProtein = protein;
    if (walked) ciPatch.quickWalked = walked;
    Object.entries(ciPatch).forEach(([k, v]) => onCheckin(k, v));
    if (w) onDaily({ weight: parseFloat(w) });
    onClose();
  };

  return (
    <Portal>
    <div className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", display: "grid", placeItems: "flex-end center", zIndex: 3000, padding: 0 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-sheet"
        style={{ width: "100%", maxWidth: 440, background: C.isDark ? "#1E3828" : "#FFFFFF", border: `1px solid ${C.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`, borderRadius: "20px 20px 0 0", padding: "18px 18px 22px", paddingBottom: `calc(22px + env(safe-area-inset-bottom, 0px) + ${kb}px)`, maxHeight: "88vh", overflowY: "auto", WebkitOverflowScrolling: "touch", boxShadow: "0 -12px 40px rgba(0,0,0,.55)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Zap size={17} color={C.green} />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700 }}>Quick Log Day</div>
          <button className="sprig-tap" onClick={onClose} style={{ marginLeft: "auto", background: C.bg2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><X size={15} /></button>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>Five quick questions. Not perfect — just enough to stay consistent.</div>

        <Q label="Did you train today?" value={trained} onPick={setTrained}
          opts={[["yes", "Yes", C.greenSoft], ["light", "Light/walk", C.amber], ["no", "Rest day", C.bg2]]} />
        <Q label="Hit your protein?" hint={`Roughly ${Math.round((profile?.weight || 70) * 1.8)}g+`} value={protein} onPick={setProtein}
          opts={[["yes", "Yes", C.greenSoft], ["close", "Close", C.amber], ["no", "Missed it", C.coral]]} />
        <Q label="Slept enough last night?" hint="At least 7 hours" value={slept} onPick={setSlept}
          opts={[["yes", "Yes", C.greenSoft], ["short", "A bit short", C.amber], ["bad", "Bad sleep", C.coral]]} />
        <Q label="Walked enough?" hint="Around 8k+ steps or 20 min walking" value={walked} onPick={setWalked}
          opts={[["yes", "Yes", C.greenSoft], ["meh", "Some", C.amber], ["no", "Sat all day", C.coral]]} />
        <Q label="Any pain?" value={pain} onPick={setPain}
          opts={[["none", "None", C.greenSoft], ["mild", "Mild", C.amber], ["moderate", "Mod", "#E0714A"], ["serious", "Serious", C.coral]]} />

        <div style={{ background: C.isDark ? "rgba(255,255,255,0.06)" : "#F4F6F2", borderRadius: 13, padding: 13, marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>Weight today <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 400 }}>· optional</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input value={w} onChange={(e) => setW(e.target.value)} onFocus={scrollIntoViewOnFocus} inputMode="decimal" placeholder={profile?.unit || "kg"}
              style={{ width: 80, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "9px 4px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.card, color: C.ink }} />
            <span style={{ fontSize: 11.5, color: C.muted }}>{profile?.unit || "kg"}</span>
          </div>
        </div>

        <button className="sprig-tap" onClick={submit} style={{ ...btn(C.green, "#fff"), width: "100%", padding: "13px 0", fontSize: 14.5 }}>
          <Check size={16} /> Save and close
        </button>
        <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          For days you don't want to log every meal. Sprig still gets the signal that matters.
        </div>
      </div>
    </div>
    </Portal>
  );
}

function FocusTimer({ onLogFocus }) {
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(null); // seconds left, null = idle
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("");
  const tickRef = useRef(null);

  useEffect(() => {
    if (running && remaining > 0) {
      tickRef.current = setTimeout(() => setRemaining((s) => s - 1), 1000);
    } else if (running && remaining === 0) {
      setRunning(false);
      onLogFocus(minutes, label.trim() || "Deep work");
      setRemaining(null);
    }
    return () => clearTimeout(tickRef.current);
  }, [running, remaining]);

  const start = () => { setRemaining(minutes * 60); setRunning(true); };
  const cancel = () => { setRunning(false); setRemaining(null); clearTimeout(tickRef.current); };
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const completeNow = () => { setRunning(false); setRemaining(null); onLogFocus(minutes, label.trim() || "Deep work"); };

  return (
    <div style={{ background: C.heroGrad1, borderRadius: 20, padding: 18, color: "#fff", boxShadow: C.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, opacity: .85, fontWeight: 600, marginBottom: 12 }}>
        <Timer size={15} color="#E7DCC6" /> Focus session
      </div>
      {remaining == null ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {FOCUS_PRESETS.map((m) => (
              <button key={m} className="sprig-tap" onClick={() => setMinutes(m)}
                style={{ flex: 1, border: "none", cursor: "pointer", padding: "12px 0", borderRadius: 12, fontFamily: "DM Sans", fontWeight: 700, fontSize: 14,
                  background: minutes === m ? "#fff" : "rgba(255,255,255,.12)", color: minutes === m ? C.green : "#fff" }}>
                {m}<span style={{ fontSize: 10, fontWeight: 500 }}> min</span>
              </button>
            ))}
          </div>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What are you focusing on? (optional)"
            style={{ width: "100%", border: "none", borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: "rgba(255,255,255,.12)", color: "#fff", marginBottom: 12, outline: "none" }} />
          <button className="sprig-tap" onClick={start} style={{ ...btn("#fff", C.green), width: "100%", padding: "13px 0", fontSize: 15 }}>
            <Play size={16} /> Start {minutes} min
          </button>
        </>
      ) : (
        <>
          <div style={{ textAlign: "center", fontFamily: "Fraunces, serif", fontSize: 52, fontWeight: 700, letterSpacing: 1, margin: "8px 0" }}>{fmt(remaining)}</div>
          {label.trim() && <div style={{ textAlign: "center", fontSize: 12.5, opacity: .8, marginBottom: 12 }}>{label.trim()}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="sprig-tap" onClick={cancel} style={{ ...btn("rgba(255,255,255,.14)", "#fff"), flex: 1, padding: "12px 0" }}>Cancel</button>
            <button className="sprig-tap" onClick={() => setRunning((r) => !r)} style={{ ...btn("rgba(255,255,255,.14)", "#fff"), flex: 1, padding: "12px 0" }}>{running ? "Pause" : "Resume"}</button>
            <button className="sprig-tap" onClick={completeNow} style={{ ...btn("#fff", C.green), flex: 1, padding: "12px 0" }}><Check size={15} /> Done</button>
          </div>
        </>
      )}
    </div>
  );
}

function AddHabitForm({ onSave, onCancel, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "custom");
  const [freqType, setFreqType] = useState(initial?.frequencyType || "daily");
  const [weeklyTarget, setWeeklyTarget] = useState(initial?.weeklyTarget || 3);
  const [specificDays, setSpecificDays] = useState(initial?.specificDays || []);
  const [reminderOn, setReminderOn] = useState(initial?.reminderEnabled || false);
  const [reminderTime, setReminderTime] = useState(initial?.reminderTime || "09:00");
  const [notes, setNotes] = useState(initial?.notes || "");

  const toggleDay = (d) => setSpecificDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b));
  const valid = name.trim().length > 0;

  const FreqBtn = ({ id, label }) => (
    <button className="sprig-tap" onClick={() => setFreqType(id)}
      style={{ flex: 1, border: "none", cursor: "pointer", padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans",
        background: freqType === id ? C.green : C.bg2, color: freqType === id ? "#fff" : C.muted }}>{label}</button>
  );
  const CatBtn = ({ id, label }) => (
    <button className="sprig-tap" onClick={() => setCategory(id)}
      style={{ border: "none", cursor: "pointer", padding: "7px 11px", borderRadius: 9, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans",
        background: category === id ? C.green : C.bg2, color: category === id ? "#fff" : C.muted }}>{label}</button>
  );

  return (
    <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 16, border: `1px solid ${C.line}`, boxShadow: C.shadow }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 13 }}>{initial ? "Edit habit" : "Add habit"}</div>

      <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Stretch hips, Read 10 pages, Take creatine"
        style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "11px 13px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink, marginBottom: 12 }} />

      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>CATEGORY</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 13 }}>
        {HABIT_CATEGORIES.map((c) => <CatBtn key={c.id} id={c.id} label={c.label} />)}
      </div>

      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontWeight: 600 }}>FREQUENCY</div>
      <div style={{ display: "flex", gap: 5, marginBottom: freqType === "weekly_x" || freqType === "specific_days" ? 10 : 13 }}>
        <FreqBtn id="daily"         label="Daily" />
        <FreqBtn id="weekly_x"      label="X / week" />
        <FreqBtn id="specific_days" label="Specific days" />
        <FreqBtn id="weekly"        label="Weekly" />
        <FreqBtn id="monthly"       label="Monthly" />
      </div>

      {freqType === "weekly_x" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
          <span style={{ fontSize: 12.5, color: C.inkSoft }}>Times per week:</span>
          {[1,2,3,4,5,6,7].map((n) => (
            <button key={n} className="sprig-tap" onClick={() => setWeeklyTarget(n)}
              style={{ width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: "DM Sans",
                background: weeklyTarget === n ? C.green : C.bg2, color: weeklyTarget === n ? "#fff" : C.muted }}>{n}</button>
          ))}
        </div>
      )}

      {freqType === "specific_days" && (
        <div style={{ display: "flex", gap: 5, marginBottom: 13 }}>
          {DAY_NAMES_SHORT.map((d, i) => (
            <button key={i} className="sprig-tap" onClick={() => toggleDay(i)}
              style={{ flex: 1, border: "none", cursor: "pointer", padding: "8px 0", borderRadius: 9, fontSize: 11.5, fontWeight: 700, fontFamily: "DM Sans",
                background: specificDays.includes(i) ? C.green : C.bg2, color: specificDays.includes(i) ? "#fff" : C.muted }}>{d}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: reminderOn ? 8 : 13 }}>
        <span style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>Reminder</span>
        <button className="sprig-tap" onClick={() => setReminderOn((v) => !v)}
          style={{ width: 40, height: 22, borderRadius: 99, border: "none", cursor: "pointer", position: "relative",
            background: reminderOn ? C.green : C.bg2, transition: "background .2s" }}>
          <span style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: 99, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
            left: reminderOn ? 21 : 3, transition: "left .2s" }} />
        </button>
      </div>
      {reminderOn && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)}
            style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink }} />
          <span style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>In-app reminder (push notifications require device permission)</span>
        </div>
      )}

      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes — optional (e.g. context, target, reason)"
        style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink, minHeight: 44, resize: "vertical", lineHeight: 1.4, marginBottom: 12 }} />

      <div style={{ display: "flex", gap: 8 }}>
        <button className="sprig-tap" onClick={onCancel} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "11px 0" }}>Cancel</button>
        <button className="sprig-tap" disabled={!valid} onClick={() => valid && onSave({ name, category, frequencyType: freqType, weeklyTarget: freqType === "weekly_x" ? weeklyTarget : null, specificDays: freqType === "specific_days" ? specificDays : null, reminderEnabled: reminderOn, reminderTime: reminderOn ? reminderTime : null, notes })}
          style={{ ...btn(valid ? C.green : C.bg2, valid ? "#fff" : C.muted), flex: 2, padding: "11px 0" }}>
          <Check size={14} /> {initial ? "Save changes" : "Add habit"}
        </button>
      </div>
    </div>
  );
}

function MindTab({ mindInfo, advanced, profile, today, onToggleHabit2, onAddHabit2, onEditHabit2, onArchiveHabit2, onRestoreHabit2, onDeleteHabit2, onUndoCompletion }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [manageMode, setManageMode] = useState(false);

  const { habits2 = [], habitCompletions = [], habitStatusMap = {}, consistencyV2 } = mindInfo;
  const active = habits2.filter((h) => !h.archived);
  const archived = habits2.filter((h) => h.archived);
  const cv2 = consistencyV2 || { pct: null, label: "No habits yet", details: [] };

  // Group active habits by frequency bucket
  const dailyHabits    = active.filter((h) => h.frequencyType === "daily" || !h.frequencyType);
  const specificDaysH  = active.filter((h) => h.frequencyType === "specific_days");
  const weeklyXHabits  = active.filter((h) => h.frequencyType === "weekly_x");
  const weeklyHabits   = active.filter((h) => h.frequencyType === "weekly");
  const monthlyHabits  = active.filter((h) => h.frequencyType === "monthly");

  // Due today
  const dueToday = active.filter((h) => { const s = habitStatusMap[h.id]; return s && s.isDue && !s.isComplete; });
  const doneToday = active.filter((h) => { const s = habitStatusMap[h.id]; return s && s.isComplete; }).length;
  const totalDueToday = active.filter((h) => { const s = habitStatusMap[h.id]; return s && s.isDue; }).length;

  // This week / this period (non-daily)
  const periodHabits = [...specificDaysH, ...weeklyXHabits, ...weeklyHabits, ...monthlyHabits];

  const scoreColor = cv2.pct == null ? C.muted : cv2.pct >= 75 ? C.greenSoft : cv2.pct >= 50 ? C.amber : C.coral;

  const handleSaveForm = (def) => {
    if (editingHabit) { onEditHabit2(editingHabit.id, def); setEditingHabit(null); }
    else { onAddHabit2(def); setShowAddForm(false); }
  };
  const handleCancelForm = () => { setShowAddForm(false); setEditingHabit(null); };

  // Habit row for Due Today
  const DueTodayRow = ({ habit }) => {
    const status = habitStatusMap[habit.id] || {};
    const streak = computeHabitStreak(habit, habitCompletions, today);
    return (
      <div className="sprig-tap" onClick={() => onToggleHabit2(habit.id)}
        style={{ display: "flex", alignItems: "center", gap: 11, background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "12px 14px", boxShadow: C.shadow, cursor: "pointer" }}>
        <div style={{ width: 26, height: 26, borderRadius: 99, border: `2px solid ${C.line}`, background: "transparent", display: "grid", placeItems: "center", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{habit.name}</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
            {status.freqLabel || "Daily"}{streak > 1 ? <span style={{ color: C.amber, marginLeft: 6 }}>🔥 {streak}</span> : null}
          </div>
        </div>
        {habit.reminderEnabled && <Bell size={13} color={C.muted} />}
      </div>
    );
  };

  // Habit row for All Habits list
  const HabitRow = ({ habit }) => {
    const status = habitStatusMap[habit.id] || {};
    const streak = computeHabitStreak(habit, habitCompletions, today);
    const ft = habit.frequencyType || "daily";
    const isDaily = ft === "daily" || ft === "specific_days";
    const canComplete = status.isDue && !status.isComplete;
    const canUndo = status.progress > 0;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 11, background: status.isComplete ? C.green + "0d" : C.card, border: `1px solid ${status.isComplete ? C.leaf + "55" : C.line}`, borderRadius: 13, padding: "11px 13px", boxShadow: C.shadow }}>
        {/* Complete button */}
        <button className="sprig-tap"
          onClick={() => { if (isDaily) onToggleHabit2(habit.id); else if (canComplete) onToggleHabit2(habit.id); else if (canUndo) onUndoCompletion(habit.id, status.periodKey); }}
          style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, border: status.isComplete ? "none" : `2px solid ${C.line}`, background: status.isComplete ? C.green : "transparent", cursor: "pointer", display: "grid", placeItems: "center", color: "#fff" }}>
          {status.isComplete && <Check size={14} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: status.isComplete ? C.ink : C.inkSoft }}>{habit.name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
            {status.freqLabel || "Daily"}
            {ft === "weekly_x" && <span style={{ marginLeft: 5 }}>{status.progress}/{status.target} this week</span>}
            {ft === "monthly"  && <span style={{ marginLeft: 5 }}>{status.progress}/{status.target} this month</span>}
            {streak > 1 && <span style={{ color: C.amber, marginLeft: 6 }}>🔥 {streak}</span>}
            {habit.category && habit.category !== "custom" && <span style={{ marginLeft: 6, color: C.muted, fontSize: 10 }}>· {habit.category}</span>}
          </div>
        </div>
        {habit.reminderEnabled && <Bell size={13} color={C.muted} style={{ flexShrink: 0 }} />}
        {manageMode && (
          <div style={{ display: "flex", gap: 4 }}>
            <button className="sprig-tap" onClick={() => { setEditingHabit(habit); setShowAddForm(false); }}
              style={{ background: C.bg2, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center" }}><PencilLine size={13} /></button>
            <button className="sprig-tap" onClick={() => onArchiveHabit2(habit.id)}
              style={{ background: C.bg2, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><Archive size={14} /></button>
          </div>
        )}
      </div>
    );
  };

  // Period progress row (for weekly/monthly habits in "This Period" section)
  const PeriodRow = ({ habit }) => {
    const status = habitStatusMap[habit.id] || {};
    const ft = habit.frequencyType || "daily";
    const progressPct = status.target > 0 ? Math.min(1, status.progress / status.target) : 0;
    const label = ft === "monthly"
      ? `${status.progress}/${status.target} this month`
      : ft === "weekly_x"
      ? `${status.progress}/${status.target} this week`
      : ft === "weekly"
      ? `${status.progress > 0 ? "Done" : "Pending"} this week`
      : `${status.progress}/${status.target}`;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: C.inkSoft }}>{habit.name}</span>
            <span style={{ fontSize: 11, color: C.muted }}>{status.freqLabel}</span>
          </div>
          <div style={{ marginTop: 5, height: 5, borderRadius: 99, background: C.bg2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct * 100}%`, background: status.isComplete ? C.green : C.amber, borderRadius: 99, transition: "width .3s" }} />
          </div>
          <div style={{ fontSize: 11, color: status.isComplete ? C.greenSoft : C.muted, marginTop: 3 }}>{label}</div>
        </div>
        {!status.isComplete && status.isDue && (
          <button className="sprig-tap" onClick={() => onToggleHabit2(habit.id)}
            style={{ ...btn(C.green, "#fff"), padding: "7px 11px", borderRadius: 10, fontSize: 12, flexShrink: 0 }}>
            {ft === "weekly_x" ? "+ Log" : "Mark done"}
          </button>
        )}
        {status.isComplete && <Check size={17} color={C.greenSoft} style={{ flexShrink: 0 }} />}
      </div>
    );
  };

  return (
    <div className="sprig-rise">
      {/* ---- HEADER ---- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 2px 14px" }}>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>Habits</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>
            {active.length === 0 ? "Add habits to start tracking." : `${active.length} habit${active.length !== 1 ? "s" : ""} · tap to manage`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {!showAddForm && !editingHabit && (
            <button className="sprig-tap" onClick={() => { setManageMode((s) => !s); setShowAddForm(false); setEditingHabit(null); }}
              style={{ ...btn(manageMode ? C.green : C.bg2, manageMode ? "#fff" : C.inkSoft), padding: "8px 12px", fontSize: 12 }}>
              {manageMode ? "Done" : "Edit"}
            </button>
          )}
          {!showAddForm && !editingHabit && (
            <button className="sprig-tap" onClick={() => { setShowAddForm(true); setManageMode(false); }}
              style={{ ...btn(C.green, "#fff"), padding: "8px 12px", fontSize: 12 }}>
              <Plus size={14} /> Add
            </button>
          )}
        </div>
      </div>

      {/* ---- ADD / EDIT FORM ---- */}
      {(showAddForm || editingHabit) && (
        <div style={{ marginBottom: 14 }}>
          <AddHabitForm initial={editingHabit} onSave={handleSaveForm} onCancel={handleCancelForm} />
        </div>
      )}

      {/* ---- CONSISTENCY SCORE ---- */}
      {active.length > 0 && (
        <div style={{ background: C.heroGrad1, borderRadius: 20, padding: 18, color: "#fff", boxShadow: C.shadow, marginBottom: 12, display: "flex", alignItems: "center", gap: 18 }}>
          {cv2.pct !== null ? (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <svg width="76" height="76" viewBox="0 0 76 76">
                <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="8" />
                <circle cx="38" cy="38" r="30" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeDasharray={`${cv2.pct / 100 * 188} 188`} strokeLinecap="round"
                  transform="rotate(-90 38 38)" style={{ transition: "stroke-dasharray .6s" }} />
                <text x="38" y="43" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="18" fontWeight="700" fill="#fff">{cv2.pct}%</text>
              </svg>
            </div>
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: 99, border: "3px solid rgba(255,255,255,.25)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Activity size={24} color="rgba(255,255,255,.6)" />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: .75, letterSpacing: .4, textTransform: "uppercase" }}>Consistency</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, marginTop: 2, lineHeight: 1 }}>{cv2.label}</div>
            {totalDueToday > 0 && (
              <div style={{ fontSize: 12, opacity: .85, marginTop: 6 }}>
                {doneToday === totalDueToday ? `All ${totalDueToday} due today ✓` : `${doneToday}/${totalDueToday} due today done`}
              </div>
            )}
            {cv2.pct !== null && (
              <div style={{ fontSize: 11, opacity: .7, marginTop: 3 }}>
                {cv2.pct >= 90 ? "Outstanding — keep going." : cv2.pct >= 75 ? "Solid work — stay consistent." : cv2.pct >= 50 ? "Building the habit — every day counts." : "Small steps. Pick one habit and nail it today."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- DUE TODAY ---- */}
      {active.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: .3, textTransform: "uppercase", marginBottom: 8 }}>Due today</div>
          {dueToday.length === 0 ? (
            <div style={{ background: C.green + "18", border: `1px solid ${C.leaf + "55"}`, borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "center", gap: 9 }}>
              <Check size={18} color={C.greenSoft} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.greenSoft }}>All done for today</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Come back tomorrow. 🌿</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {dueToday.map((h) => <DueTodayRow key={h.id} habit={h} />)}
            </div>
          )}
        </div>
      )}

      {/* ---- THIS PERIOD (weekly + monthly habits) ---- */}
      {periodHabits.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: .3, textTransform: "uppercase", marginBottom: 4 }}>This period</div>
          {periodHabits.map((h, i) => <PeriodRow key={h.id} habit={h} />)}
        </div>
      )}

      {/* ---- ALL HABITS ---- */}
      {active.length === 0 && !showAddForm && (
        <div style={{ textAlign: "center", padding: "32px 16px", color: C.muted }}>
          <Activity size={32} color={C.muted} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.inkSoft, marginBottom: 6 }}>No habits yet</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>Add habits like "Take creatine", "Read 10 pages", or "Stretch hips" to start tracking consistency.</div>
          <button className="sprig-tap" onClick={() => setShowAddForm(true)} style={{ ...btn(C.green, "#fff"), padding: "11px 20px", marginTop: 14, fontSize: 13 }}>
            <Plus size={14} /> Add first habit
          </button>
        </div>
      )}

      {active.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: .3, textTransform: "uppercase" }}>All habits</div>
          </div>

          {/* Daily */}
          {dailyHabits.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600 }}>Daily</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dailyHabits.map((h) => <HabitRow key={h.id} habit={h} />)}
              </div>
            </div>
          )}

          {/* Specific days */}
          {specificDaysH.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600 }}>Specific days</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {specificDaysH.map((h) => <HabitRow key={h.id} habit={h} />)}
              </div>
            </div>
          )}

          {/* X times/week */}
          {weeklyXHabits.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600 }}>X times / week</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {weeklyXHabits.map((h) => <HabitRow key={h.id} habit={h} />)}
              </div>
            </div>
          )}

          {/* Weekly */}
          {weeklyHabits.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600 }}>Weekly</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {weeklyHabits.map((h) => <HabitRow key={h.id} habit={h} />)}
              </div>
            </div>
          )}

          {/* Monthly */}
          {monthlyHabits.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600 }}>Monthly</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {monthlyHabits.map((h) => <HabitRow key={h.id} habit={h} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- ARCHIVED ---- */}
      {archived.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <button className="sprig-tap" onClick={() => setShowArchived((s) => !s)}
            style={{ width: "100%", background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, color: C.muted, fontFamily: "DM Sans" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Archive size={14} /> Archived ({archived.length})</span>
            <ChevronDown size={14} style={{ transform: showArchived ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {showArchived && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 7 }}>
              {archived.map((h) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 13px", opacity: .65 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{h.frequencyType || "daily"}</div>
                  </div>
                  <button className="sprig-tap" onClick={() => onRestoreHabit2(h.id)} style={{ ...btn(C.bg2, C.green), padding: "6px 11px", fontSize: 12 }}>Restore</button>
                  <button className="sprig-tap" onClick={() => onDeleteHabit2(h.id)} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 1.5, padding: "0 12px" }}>
        Vitae tracks what you log — consistency builds over time. Be kind to yourself. 🌿
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}


function PainLogForm({ initial, onSave, onCancel }) {
  const [level, setLevel] = useState(initial?.level || "mild");
  const [location, setLocation] = useState(initial?.location || "shoulder");
  const [type, setType] = useState(initial?.type || "");
  const [exercise, setExercise] = useState(initial?.exercise || "");
  const [note, setNote] = useState(initial?.note || "");
  const submit = () => onSave({ level, location, type: type || null, exercise: exercise || null, note: note.trim() });
  const Chip = ({ on, color, onClick, children }) => (
    <button className="sprig-tap" onClick={onClick}
      style={{ border: "none", cursor: "pointer", padding: "7px 11px", borderRadius: 9, fontSize: 11.5, fontWeight: 600, fontFamily: "DM Sans",
        background: on ? color : C.bg2, color: on ? "#fff" : C.muted }}>{children}</button>
  );
  return (
    <div className="sprig-pop" style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600 }}>LEVEL</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {Object.entries(PAIN_LEVELS).filter(([k]) => k !== "none").map(([k, lvl]) => (
          <Chip key={k} on={level === k} color={lvl.color} onClick={() => setLevel(k)}>{lvl.label}</Chip>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600 }}>LOCATION</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {PAIN_LOCATIONS.map(([k, lbl]) => (
          <Chip key={k} on={location === k} color={C.greenSoft} onClick={() => setLocation(k)}>{lbl}</Chip>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, fontWeight: 600 }}>TYPE (optional)</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {PAIN_TYPES.map(([k, lbl]) => (
          <Chip key={k} on={type === k} color="#7A6FB0" onClick={() => setType(type === k ? "" : k)}>{lbl}</Chip>
        ))}
      </div>
      <input value={exercise} onChange={(e) => setExercise(e.target.value)} placeholder="Movement that hurts (optional, e.g. overhead press)"
        style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink, marginBottom: 9 }} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes (optional) — when it started, what triggers it…"
        style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink, minHeight: 46, resize: "vertical", lineHeight: 1.45 }} />
      <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
        <button className="sprig-tap" onClick={onCancel} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0" }}>Cancel</button>
        <button className="sprig-tap" onClick={submit} style={{ ...btn(C.green, "#fff"), flex: 2, padding: "10px 0" }}><Check size={15} /> Log pain</button>
      </div>
    </div>
  );
}

/* ---- Health Report engine ---- */
function computeHealthReport({ history7, sleepLogs7, workouts7, daily, t, targets, profile, sleepInfo, trainInfo, moveInfo, nutriInfo }) {
  const helping = [], hurting = [], improvements = [], continueDoing = [];
  const now7 = Date.now() - 7 * 864e5;

  // data coverage
  const hasNutrition = (history7 || []).filter((h) => h.calories > 0).length >= 2;
  const hasSleep = (sleepLogs7 || []).length >= 2;
  const hasTraining = (workouts7 || []).length >= 1;
  const hasSteps = (daily?.steps || 0) > 0 || (moveInfo?.movement?.steps || 0) > 0;
  const dataPoints = [hasNutrition, hasSleep, hasTraining, hasSteps].filter(Boolean).length;
  const confidence = dataPoints >= 3 ? "high" : dataPoints >= 2 ? "medium" : "low";

  // --- NUTRITION (weight 0.25) ---
  let nutScore = 50;
  if (hasNutrition) {
    const loggedDays = (history7 || []).filter((h) => h.calories > 0);
    const avgCal = loggedDays.reduce((a, h) => a + h.calories, 0) / loggedDays.length;
    const avgProt = loggedDays.reduce((a, h) => a + (h.protein || 0), 0) / loggedDays.length;
    const avgFiber = loggedDays.reduce((a, h) => a + (h.fiber || 0), 0) / loggedDays.length;
    const calTarget = targets?.calories || 2000;
    const protTarget = targets?.protein || 150;
    const fiberTarget = targets?.fiber || 25;
    const calDiff = Math.abs(avgCal - calTarget) / calTarget;
    const calScore = calDiff < 0.1 ? 90 : calDiff < 0.2 ? 75 : calDiff < 0.35 ? 60 : 40;
    const protRatio = avgProt / protTarget;
    const protScore = protRatio >= 0.95 ? 90 : protRatio >= 0.8 ? 75 : protRatio >= 0.6 ? 55 : 35;
    const fiberScore = avgFiber >= fiberTarget * 0.9 ? 90 : avgFiber >= fiberTarget * 0.6 ? 70 : 50;
    nutScore = Math.round((calScore + protScore + fiberScore) / 3);
    if (protRatio >= 0.9) helping.push(`Protein has been consistent (avg ${Math.round(avgProt)}g).`);
    else if (protRatio < 0.65) {
      hurting.push(`Protein averaged ${Math.round(avgProt)}g — below your ${protTarget}g target.`);
      if (improvements.length < 3) improvements.push(`Aim for ${protTarget}g protein today. Add eggs, Greek yogurt, or a lean protein source.`);
    }
    if (avgFiber < fiberTarget * 0.6) {
      hurting.push("Fiber is below target most days.");
      if (improvements.length < 3) improvements.push("Add a high-fiber food today — beans, lentils, oats, or extra vegetables.");
    } else if (avgFiber >= fiberTarget * 0.85) {
      helping.push("Fiber intake is solid.");
    }
    if (calDiff > 0.3) {
      if (avgCal > calTarget) hurting.push(`Calories averaged ${Math.round(avgCal - calTarget)} above target this week.`);
      else hurting.push(`Calories averaged ${Math.round(calTarget - avgCal)} below target this week.`);
    }
    if (protRatio >= 0.9 && avgFiber >= fiberTarget * 0.8 && calDiff <= 0.15) continueDoing.push("Keep protein and fiber consistent.");
  }

  // --- SLEEP (weight 0.25) ---
  let sleepScore = 50;
  if (hasSleep) {
    const valid = (sleepLogs7 || []).filter((l) => !l.ignoredFromScore);
    const need = sleepInfo?.need || 480;
    const debtMin = sleepInfo?.debtMin || 0;
    const avgDur = valid.reduce((a, l) => a + l.durationMin, 0) / Math.max(1, valid.length);
    const avgQ = valid.reduce((a, l) => a + l.score, 0) / Math.max(1, valid.length);
    sleepScore = Math.round(
      (avgDur >= need * 0.95 ? 90 : avgDur >= need * 0.85 ? 75 : avgDur >= need * 0.7 ? 55 : 35) * 0.4 +
      (avgQ >= 80 ? 90 : avgQ >= 65 ? 75 : avgQ >= 50 ? 55 : 35) * 0.3 +
      (debtMin < 30 ? 90 : debtMin < 60 ? 75 : debtMin < 120 ? 55 : 35) * 0.3
    );
    const durH = (avgDur / 60).toFixed(1);
    if (avgDur >= need * 0.9) helping.push(`Sleep averaging ${durH}h — close to your ${(need / 60).toFixed(0)}h need.`);
    else {
      hurting.push(`Sleep averaging ${durH}h — below your ${(need / 60).toFixed(0)}h need.`);
      if (improvements.length < 3) improvements.push("Sleep 30–45 min earlier to reduce sleep debt.");
    }
    if (debtMin > 90) hurting.push(`Sleep debt is around ${Math.round(debtMin / 60 * 10) / 10}h — earlier bedtimes help.`);
    else if (debtMin < 30 && avgDur >= need * 0.9) continueDoing.push("Keep your sleep schedule consistent.");
  }

  // --- TRAINING / CARDIO (weight 0.25) ---
  let trainScore = 50;
  const wkCount = (workouts7 || []).length;
  const steps = daily?.steps || moveInfo?.movement?.steps || 0;
  const stepGoalVal = moveInfo?.stepGoal || 8000;
  const cardioMin = daily?.cardioMin || 0;
  const stepRatio = steps / stepGoalVal;
  if (wkCount > 0 || steps > 0 || cardioMin > 0) {
    const wkScore = wkCount >= 4 ? 90 : wkCount >= 3 ? 80 : wkCount >= 2 ? 65 : wkCount >= 1 ? 50 : 30;
    const stepScore = stepRatio >= 1 ? 90 : stepRatio >= 0.7 ? 75 : stepRatio >= 0.4 ? 55 : 35;
    const cardioScore = cardioMin >= 30 ? 90 : cardioMin >= 15 ? 70 : cardioMin >= 5 ? 55 : 40;
    trainScore = Math.round(wkScore * 0.5 + stepScore * 0.3 + cardioScore * 0.2);
    if (wkCount >= 3) helping.push(`Trained ${wkCount} time${wkCount !== 1 ? "s" : ""} this week.`);
    else if (wkCount === 0) {
      hurting.push("No strength training logged this week.");
      if (improvements.length < 3) improvements.push("Add one 30–45 min workout this week to maintain muscle and strength.");
    }
    if (stepRatio >= 0.85) helping.push(`Steps close to your ${(stepGoalVal / 1000).toFixed(0)}k goal.`);
    else if (stepRatio < 0.4 && cardioMin < 10) {
      hurting.push("Cardio and steps are low this week.");
      if (improvements.length < 3) improvements.push("Add a 20–30 min walk or easy zone-2 cardio today.");
    }
    if (wkCount >= 3) continueDoing.push(`Keep training ${wkCount >= 4 ? "4–5" : "3–4"} times weekly.`);
    // overdoing check
    const avgSleepDur = hasSleep
      ? (sleepLogs7 || []).filter((l) => !l.ignoredFromScore).reduce((a, l) => a + l.durationMin, 0) / Math.max(1, (sleepLogs7 || []).filter((l) => !l.ignoredFromScore).length)
      : 0;
    if (wkCount >= 5 && avgSleepDur > 0 && avgSleepDur < 390) {
      hurting.push(`Trained hard ${wkCount} days while sleep averaged ${Math.round(avgSleepDur / 60)}h ${Math.round(avgSleepDur % 60)}m — consider a lighter session.`);
    }
    if (wkCount >= 3 && (trainInfo?.sleepReadiness || 70) < 50) {
      if (improvements.length < 3) improvements.push("Recovery is low — a lighter session or active rest today will help more than pushing through.");
    }
  }

  // --- ALCOHOL (weight 0.15) ---
  let alcScore = 85;
  const alcToday = daily?.alcohol || 0;
  const alcHistory = (history7 || []).map((h) => h.alcohol || 0);
  const weekAlc = alcHistory.reduce((a, b) => a + b, 0) + (alcHistory.length === 0 ? alcToday : 0);
  const avgAlc = alcHistory.length > 0 ? weekAlc / alcHistory.length : alcToday;
  if (avgAlc <= 0.3) helping.push("Alcohol intake is low.");
  else if (avgAlc <= 1) alcScore = 75;
  else if (avgAlc <= 2) { alcScore = 55; hurting.push("Alcohol reduced recovery on some days this week."); }
  else {
    alcScore = 35;
    hurting.push(`Alcohol was high this week (~${Math.round(weekAlc)} drinks) — this reduces sleep quality and recovery.`);
    if (improvements.length < 3) improvements.push("Keep alcohol at 0–1 drinks tonight — alcohol close to sleep significantly reduces recovery.");
  }

  // --- CONSISTENCY (weight 0.10) ---
  const loggedFoodDays = (history7 || []).filter((h) => h.calories > 0).length;
  const loggedSleepNights = (sleepLogs7 || []).filter((l) => !l.ignoredFromScore).length;
  const consistScore = Math.round((loggedFoodDays / 7) * 50 + (loggedSleepNights / 7) * 50);

  // steps continue-doing
  if (stepRatio >= 0.85) continueDoing.push(`Keep steps above ${Math.round(stepGoalVal * 0.8 / 1000)}k.`);

  // --- WEIGHTED SCORE ---
  const cats = [];
  if (hasNutrition) cats.push({ score: nutScore, w: 0.25 });
  if (hasSleep) cats.push({ score: sleepScore, w: 0.25 });
  if (wkCount > 0 || steps > 0) cats.push({ score: trainScore, w: 0.25 });
  cats.push({ score: alcScore, w: 0.15 });
  if (hasNutrition || hasSleep) cats.push({ score: consistScore, w: 0.10 });
  const totalW = cats.reduce((a, c) => a + c.w, 0) || 1;
  const rawScore = Math.round(cats.reduce((a, c) => a + c.score * (c.w / totalW), 0));
  const minScore = confidence === "low" ? 42 : confidence === "medium" ? 38 : 30;
  const score = Math.max(minScore, Math.min(98, rawScore));

  return {
    score, confidence,
    helping: helping.slice(0, 4),
    hurting: hurting.slice(0, 4),
    improvements: improvements.slice(0, 3),
    continueDoing: continueDoing.slice(0, 3),
  };
}

function HealthTab({ healthInfo, healthReport, bloodwork, onSaveBloodwork, onDeleteBloodwork, advanced, onSave, safety, pain, onAddPain, onUpdatePain, onRemovePain }) {
  const hr = healthReport || {};
  const latest = healthInfo?.latest || {};
  const radar = healthInfo?.radar || [];

  // --- Advanced panel state (BP, symptoms, etc.) ---
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bpS, setBpS] = useState(latest.bpSys?.value != null ? String(latest.bpSys.value) : "");
  const [bpD, setBpD] = useState(latest.bpDia?.value != null ? String(latest.bpDia.value) : "");
  const [rhr, setRhr] = useState(latest.rhr?.value != null ? String(latest.rhr.value) : "");
  const [symptoms, setSymptoms] = useState(latest.symptoms?.value || "");
  const [showBlood, setShowBlood] = useState(false);
  const [bloodDraft, setBloodDraft] = useState({});

  // --- Pain state ---
  const [painOpen, setPainOpen] = useState(false);
  const [editingPain, setEditingPain] = useState(null);

  // --- Bloodwork AI extraction ---
  const [bwMode, setBwMode] = useState(null); // null | "describe" | "view"
  const [bwText, setBwText] = useState("");
  const [bwBusy, setBwBusy] = useState(false);
  const [bwErr, setBwErr] = useState("");

  const saveVitals = () => {
    const patch = {};
    if (bpS && bpD) { patch.bpSys = +bpS; patch.bpDia = +bpD; }
    if (rhr) patch.rhr = +rhr;
    if (symptoms.trim() !== (latest.symptoms?.value || "")) patch.symptoms = symptoms.trim();
    if (Object.keys(patch).length) onSave(patch);
  };
  const saveBloodManual = () => {
    const out = {};
    Object.entries(bloodDraft).forEach(([k, v]) => { const n = parseFloat(v); if (!isNaN(n)) out[k] = +n.toFixed(2); });
    if (Object.keys(out).length) { onSave({ blood: out }); setBloodDraft({}); setShowBlood(false); }
  };

  async function extractBloodwork() {
    if (!bwText.trim()) return;
    setBwBusy(true); setBwErr("");
    try {
      const system = `You are a health assistant. Extract blood test markers from the user's input. Return ONLY valid JSON: {"markers":[{"name":"...","value":"...","unit":"...","range":"...","status":"low|normal|high|unknown","summary":"plain one-sentence explanation","lifestyle":"one lifestyle tip"}],"summary":"2–3 sentence plain summary","actions":["...","..."]}. Never diagnose. For abnormal values say "worth discussing with a doctor". Keep language cautious.`;
      const raw = await analyzeText({ prompt: `Extract health markers from this bloodwork report: "${bwText}"`, system });
      let parsed = null;
      try { const m = raw.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch (_) {}
      if (parsed?.markers?.length) {
        const entry = { id: uid(), date: new Date().toLocaleDateString("en-CA"), ...parsed };
        onSaveBloodwork(entry);
        setBwMode(null); setBwText("");
      } else {
        setBwErr("Could not extract markers. Try pasting clearer values, e.g. 'Vitamin D: 22 ng/mL, HbA1c: 5.4%'.");
      }
    } catch (_) {
      setBwErr("AI unavailable right now. Try again later.");
    }
    setBwBusy(false);
  }

  const score = hr.score ?? null;
  const conf = hr.confidence || "low";
  const scoreColor = score == null ? C.muted : score >= 78 ? C.greenSoft : score >= 58 ? C.amber : C.coral;
  const scoreLabel = score == null ? "—" : score >= 78 ? "Good" : score >= 58 ? "Fair" : "Needs work";
  const latestBw = (bloodwork || []).slice().sort((a, b) => b.date.localeCompare(a.date))[0];

  // radar severity helper
  const ORDER = { high: 0, elevated: 1, moderate: 2, low: 3, unknown: 4 };
  const sortedRadar = [...radar].sort((a, b) => (ORDER[a.tag] ?? 4) - (ORDER[b.tag] ?? 4));
  const flagged = sortedRadar.filter((r) => r.tag === "high" || r.tag === "elevated");

  return (
    <div className="sprig-rise">
      {/* ---- Safety banners (always visible) ---- */}
      {safety?.urgent && (
        <div style={{ background: "#C0392B", color: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: C.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14.5 }}>
            <HeartPulse size={18} /> {safety.hasCrisis ? "Please reach out for support now" : "This could be serious"}
          </div>
          <div style={{ fontSize: 12.5, opacity: .95, marginTop: 7, lineHeight: 1.5 }}>
            {safety.hasCrisis
              ? "If you're thinking about harming yourself, you're not alone and help is available right now. Contact a local crisis line or emergency services."
              : "Based on what you logged, consider urgent medical help. Vitae can't assess symptoms — when in doubt, get checked."}
          </div>
          {!safety.hasCrisis && (safety.redFlags?.length > 0 || safety.bpFlag) && (
            <div style={{ fontSize: 11.5, opacity: .9, marginTop: 8, background: "rgba(255,255,255,.14)", borderRadius: 9, padding: "8px 10px" }}>
              Flagged: {[...safety.redFlags.map((f) => f.text), safety.bpFlag?.text].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      )}
      {safety?.interactions?.length > 0 && (
        <div style={{ background: C.isDark ? "#2a1a0a" : "#fdeee8", border: `1px solid ${C.coral}44`, borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 12.5, color: C.coral, marginBottom: 6 }}>
            <Pill size={15} color={C.coral} /> Things to check
          </div>
          {safety.interactions.map((txt, i) => (
            <div key={i} style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5, display: "flex", gap: 6, marginTop: i ? 5 : 0 }}>
              <span>•</span><span>{txt}</span>
            </div>
          ))}
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 7 }}>Not medical advice — flags combinations to ask a pharmacist or doctor about.</div>
        </div>
      )}

      <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: "4px 2px 2px" }}>Health</div>
      <div style={{ fontSize: 11.5, color: C.muted, margin: "0 2px 14px", lineHeight: 1.5 }}>A summary of your health based on what you've logged.</div>

      {/* ---- HEALTH SCORE ---- */}
      <div style={{ background: C.card, borderRadius: 20, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
        {score == null ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <Activity size={28} color={C.muted} style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: C.inkSoft }}>Health Report</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
              Log food, sleep, movement, and training for a personalised health report.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* Score ring */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke={C.bg2} strokeWidth="9" />
                <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="9"
                  strokeDasharray={`${score / 100 * 201} 201`} strokeLinecap="round"
                  transform="rotate(-90 40 40)" style={{ transition: "stroke-dasharray .6s" }} />
                <text x="40" y="44" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="19" fontWeight="700" fill={scoreColor}>{score}</text>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{scoreLabel}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>
                {conf === "high" ? "Based on food, sleep, training & movement." : conf === "medium" ? "Log more data for a fuller picture." : "Limited data — log food, sleep, or training."}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- WHAT'S HELPING ---- */}
      {(hr.helping?.length ?? 0) > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: C.greenSoft, letterSpacing: .3, marginBottom: 10, textTransform: "uppercase" }}>
            <Check size={13} color={C.greenSoft} /> What's helping
          </div>
          {hr.helping.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: C.inkSoft, lineHeight: 1.45, marginTop: i ? 8 : 0 }}>
              <span style={{ color: C.greenSoft, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>{item}
            </div>
          ))}
        </div>
      )}

      {/* ---- WHAT'S HURTING ---- */}
      {(hr.hurting?.length ?? 0) > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: C.amber, letterSpacing: .3, marginBottom: 10, textTransform: "uppercase" }}>
            <Activity size={13} color={C.amber} /> What's hurting
          </div>
          {hr.hurting.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: C.inkSoft, lineHeight: 1.45, marginTop: i ? 8 : 0 }}>
              <span style={{ color: C.amber, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>↓</span>{item}
            </div>
          ))}
        </div>
      )}

      {/* ---- TOP IMPROVEMENTS ---- */}
      {(hr.improvements?.length ?? 0) > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: .3, marginBottom: 10, textTransform: "uppercase" }}>Top improvements</div>
          {hr.improvements.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderTop: i > 0 ? `1px solid ${C.line}` : "none" }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, background: C.green + "22", color: C.green, fontWeight: 700, fontSize: 12, display: "grid", placeItems: "center", flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.45, flex: 1 }}>{item}</span>
            </div>
          ))}
        </div>
      )}

      {/* ---- CONTINUE DOING ---- */}
      {(hr.continueDoing?.length ?? 0) > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, letterSpacing: .3, marginBottom: 10, textTransform: "uppercase" }}>Continue doing</div>
          {hr.continueDoing.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: C.inkSoft, lineHeight: 1.45, marginTop: i ? 7 : 0 }}>
              <span style={{ color: C.green, fontWeight: 700, flexShrink: 0 }}>→</span>{item}
            </div>
          ))}
        </div>
      )}

      {/* ---- PAIN & INJURY ---- */}
      {onAddPain && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>
              <HeartPulse size={15} color={C.coral} /> Pain &amp; injury
            </div>
            {!painOpen && !editingPain && (
              <button className="sprig-tap" onClick={() => setPainOpen(true)} style={{ ...btn(C.bg2, C.green), padding: "6px 11px", fontSize: 12, borderRadius: 10 }}>
                <Plus size={13} /> Log pain
              </button>
            )}
          </div>
          {(painOpen || editingPain) && (
            <PainLogForm initial={editingPain}
              onCancel={() => { setPainOpen(false); setEditingPain(null); }}
              onSave={(entry) => { if (editingPain) onUpdatePain(editingPain.id, entry); else onAddPain(entry); setPainOpen(false); setEditingPain(null); }} />
          )}
          {!painOpen && !editingPain && pain?.summary?.active?.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pain.summary.active.map((a) => {
                const lvl = PAIN_LEVELS[a.latest.level] || PAIN_LEVELS.mild;
                const locLabel = PAIN_LOCATIONS.find(([k]) => k === a.location)?.[1] || a.location;
                const trendColor = a.trend === "improving" ? C.greenSoft : a.trend === "worsening" ? C.coral : C.muted;
                return (
                  <div key={a.location} style={{ background: lvl.color + "12", border: `1px solid ${lvl.color}44`, borderRadius: 12, padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: lvl.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{locLabel}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: lvl.color, textTransform: "uppercase" }}>{lvl.label}</span>
                          {a.recurring && <span style={{ fontSize: 10, color: C.coral, fontWeight: 700, background: C.coral + "1a", padding: "2px 6px", borderRadius: 4 }}>RECURRING</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                          {a.daysActive}d active · <span style={{ color: trendColor, fontWeight: 600 }}>{a.trend === "improving" ? "↘" : a.trend === "worsening" ? "↗" : "→"} {a.trend}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5 }}>
                        <button className="sprig-tap" onClick={() => setEditingPain(a.latest)} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center" }}><PencilLine size={13} /></button>
                        <button className="sprig-tap" onClick={() => onUpdatePain(a.latest.id, { status: "resolved" })} style={{ background: C.greenSoft + "22", border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: C.green }}><Check size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {pain?.coach?.lines?.length > 0 && !painOpen && !editingPain && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: C.bg, borderRadius: 11 }}>
              {pain.coach.lines.map((l, i) => (
                <div key={i} style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5, display: "flex", gap: 7, padding: "2px 0" }}>
                  <span style={{ color: C.greenSoft }}>•</span><span>{l}</span>
                </div>
              ))}
              {pain.coach.seekHelp && (
                <div style={{ fontSize: 11, color: C.coral, marginTop: 7, lineHeight: 1.5, borderTop: `1px dashed ${C.line}`, paddingTop: 7 }}>
                  ⚕️ Sharp pain, swelling, or pain lasting 2+ weeks → see a doctor or physio.
                </div>
              )}
            </div>
          )}
          {!painOpen && !editingPain && !pain?.summary?.active?.length && (
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>No active pain logged. Track issues here so Vitae can suggest training modifications.</div>
          )}
        </div>
      )}

      {/* ---- BLOODWORK ---- */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
            <Pill size={15} color="#7A6FB0" /> Bloodwork
          </div>
          {bwMode === null && (
            <button className="sprig-tap" onClick={() => { setBwMode("describe"); setBwErr(""); setBwText(""); }}
              style={{ ...btn(C.bg2, "#7A6FB0"), padding: "6px 11px", fontSize: 12, borderRadius: 10 }}>
              <Plus size={13} /> Import results
            </button>
          )}
        </div>

        {/* AI extraction form */}
        {bwMode === "describe" && (
          <div className="sprig-pop">
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
              Paste your lab values (e.g. "Vitamin D: 22 ng/mL, HbA1c: 5.4%, Ferritin: 18 ng/mL"). Vitae will extract and explain each marker.
            </div>
            <textarea value={bwText} onChange={(e) => setBwText(e.target.value)}
              placeholder="Paste bloodwork values here…"
              style={{ width: "100%", minHeight: 80, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, color: C.ink, background: C.bg, resize: "vertical", lineHeight: 1.45 }} />
            {bwErr && <div style={{ fontSize: 11.5, color: C.coral, marginTop: 6 }}>{bwErr}</div>}
            <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
              <button className="sprig-tap" onClick={() => { setBwMode(null); setBwText(""); setBwErr(""); }}
                style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0" }}>Cancel</button>
              <button className="sprig-tap" disabled={bwBusy || !bwText.trim()} onClick={extractBloodwork}
                style={{ ...btn(bwText.trim() && !bwBusy ? "#7A6FB0" : C.bg2, bwText.trim() && !bwBusy ? "#fff" : C.muted), flex: 2, padding: "10px 0", fontSize: 13 }}>
                {bwBusy ? <><Loader2 size={14} className="sprig-spin" /> Extracting…</> : <><Sparkles size={14} /> Extract with AI</>}
              </button>
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 10, lineHeight: 1.5, borderTop: `1px dashed ${C.line}`, paddingTop: 8 }}>
              ⚕️ <b>Vitae is not medical advice.</b> Bloodwork interpretation can be wrong. Always discuss abnormal results with a healthcare professional.
            </div>
          </div>
        )}

        {/* Latest bloodwork result */}
        {latestBw && bwMode === null && (
          <div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Latest · {latestBw.date}</div>
            {latestBw.markers?.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", marginBottom: 10 }}>
                {latestBw.markers.slice(0, 8).map((m, i) => {
                  const statusColor = m.status === "normal" ? C.greenSoft : m.status === "low" ? C.amber : m.status === "high" ? C.coral : C.muted;
                  return (
                    <div key={i} style={{ background: C.bg, borderRadius: 11, padding: "9px 11px" }}>
                      <div style={{ fontSize: 11, color: C.muted }}>{m.name}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 2 }}>
                        <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700, color: C.ink }}>{m.value}</span>
                        <span style={{ fontSize: 10, color: C.muted }}>{m.unit}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: statusColor, marginLeft: "auto", textTransform: "uppercase" }}>{m.status}</span>
                      </div>
                      {m.range && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>ref {m.range}</div>}
                    </div>
                  );
                })}
              </div>
            )}
            {latestBw.summary && <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 8 }}>{latestBw.summary}</div>}
            {latestBw.actions?.length > 0 && (
              <div style={{ padding: "10px 12px", background: C.bg, borderRadius: 11, marginBottom: 8 }}>
                {latestBw.actions.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5, display: "flex", gap: 7, marginTop: i ? 5 : 0 }}>
                    <span style={{ color: C.greenSoft }}>→</span><span>{a}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 7 }}>
              <button className="sprig-tap" onClick={() => { setBwMode("describe"); setBwText(""); setBwErr(""); }}
                style={{ ...btn(C.bg2, "#7A6FB0"), flex: 1, padding: "8px 0", fontSize: 12 }}><Plus size={12} /> New results</button>
              {onDeleteBloodwork && (
                <button className="sprig-tap" onClick={() => onDeleteBloodwork(latestBw.id)}
                  style={{ ...btn(C.bg2, C.muted), padding: "8px 12px", fontSize: 12, borderRadius: 10 }}><Trash2 size={13} /></button>
              )}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              ⚕️ <b>Not medical advice.</b> Discuss abnormal markers with a healthcare professional.
            </div>
          </div>
        )}
        {!latestBw && bwMode === null && (
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
            Import blood test results and Vitae will explain each marker in plain language and suggest lifestyle actions.
          </div>
        )}
      </div>

      {/* ---- ADVANCED (collapsed) ---- */}
      <button className="sprig-tap" onClick={() => setShowAdvanced((s) => !s)}
        style={{ width: "100%", background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, fontWeight: 600, color: C.inkSoft, fontFamily: "DM Sans", marginBottom: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><SlidersHorizontal size={14} color={C.muted} /> Advanced health data</span>
        <ChevronDown size={15} color={C.muted} style={{ transform: showAdvanced ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>

      {showAdvanced && (
        <>
          {/* Blood pressure / RHR */}
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 11 }}>
              <HeartPulse size={15} color={C.coral} /> Vitals
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div style={{ background: C.bg, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: C.muted }}>Blood pressure</div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                  {latest.bpSys?.value != null ? `${latest.bpSys.value}/${latest.bpDia?.value}` : "—"}<span style={{ fontSize: 10, color: C.muted, marginLeft: 3 }}>mmHg</span>
                </div>
              </div>
              <div style={{ background: C.bg, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: C.muted }}>Resting HR</div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, marginTop: 2 }}>
                  {latest.rhr?.value != null ? latest.rhr.value : "—"}<span style={{ fontSize: 10, color: C.muted, marginLeft: 3 }}>bpm</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: C.muted }}>BP</span>
              <input value={bpS} onChange={(e) => setBpS(e.target.value)} inputMode="numeric" placeholder="120" style={{ width: 54, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 4px", fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, background: C.bg }} />
              <span style={{ color: C.muted }}>/</span>
              <input value={bpD} onChange={(e) => setBpD(e.target.value)} inputMode="numeric" placeholder="80" style={{ width: 54, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 4px", fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, background: C.bg }} />
              <span style={{ fontSize: 11.5, color: C.muted, marginLeft: 6 }}>RHR</span>
              <input value={rhr} onChange={(e) => setRhr(e.target.value)} inputMode="numeric" placeholder="60" style={{ width: 54, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 4px", fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, background: C.bg }} />
              <button className="sprig-tap" onClick={saveVitals} style={{ ...btn(C.green, "#fff"), padding: "7px 12px", fontSize: 12 }}><Check size={13} /> Save</button>
            </div>
          </div>

          {/* Symptoms & notes */}
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 8 }}>Symptoms &amp; notes</div>
            <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Anything off? Headaches, joint pain, fatigue patterns…"
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, color: C.ink, background: C.bg, minHeight: 52, resize: "vertical", lineHeight: 1.45 }} />
            <button className="sprig-tap" onClick={() => onSave({ symptoms: symptoms.trim() })}
              style={{ ...btn(C.green, "#fff"), padding: "8px 14px", fontSize: 12, marginTop: 8 }}>Save notes</button>
          </div>

          {/* Smoking */}
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>Smoking / vaping</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["no", "None"], ["vape", "Vape"], ["light", "Light"], ["regular", "Regular"]].map(([k, lbl]) => {
                const on = latest.smoking?.value === k || (!latest.smoking && k === "no");
                return (
                  <button key={k} className="sprig-tap" onClick={() => onSave({ smoking: k })}
                    style={{ flex: 1, border: "none", cursor: "pointer", padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans",
                      background: on ? (k === "no" ? C.greenSoft : C.coral) : C.bg2, color: on ? "#fff" : C.muted }}>{lbl}</button>
                );
              })}
            </div>
          </div>

          {/* Risk radar */}
          {sortedRadar.length > 0 && (
            <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 11 }}>
                <Activity size={15} color={C.greenSoft} /> Risk radar
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {sortedRadar.map((r) => {
                  const t = RISK_TAG[r.tag] || RISK_TAG.unknown;
                  return (
                    <div key={r.key} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 99, background: t.color, flexShrink: 0, marginTop: 6 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: t.color, textTransform: "uppercase", letterSpacing: .4 }}>{t.label}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{r.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {flagged.length > 0 && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 12, borderTop: `1px dashed ${C.line}`, paddingTop: 10, lineHeight: 1.5 }}>
                  ⚕️ <b>Not a diagnosis.</b> If anything stays elevated, talk with a doctor.
                </div>
              )}
            </div>
          )}

          {/* Manual blood work entry */}
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                <Pill size={15} color="#7A6FB0" /> Manual lab entry
              </div>
              <button className="sprig-tap" onClick={() => setShowBlood((s) => !s)} style={{ ...btn(C.bg2, C.green), padding: "6px 11px", fontSize: 12, borderRadius: 10 }}>
                {showBlood ? "Close" : "Enter values"}
              </button>
            </div>
            {showBlood && (
              <div className="sprig-pop">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 12px", maxHeight: 280, overflowY: "auto" }}>
                  {BLOOD_MARKERS.map((b) => (
                    <div key={b.key}>
                      <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 3 }}>{b.label} · {b.unit}</div>
                      <input value={bloodDraft[b.key] ?? ""} onChange={(e) => setBloodDraft((x) => ({ ...x, [b.key]: e.target.value }))} inputMode="decimal"
                        placeholder={latest.blood?.[b.key]?.value != null ? String(latest.blood[b.key].value) : ""}
                        style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 9px", fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, background: C.bg, color: C.ink }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                  <button className="sprig-tap" onClick={() => { setShowBlood(false); setBloodDraft({}); }} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "9px 0" }}>Cancel</button>
                  <button className="sprig-tap" disabled={!Object.values(bloodDraft).some((v) => v && v !== "")} onClick={saveBloodManual}
                    style={{ ...btn(Object.values(bloodDraft).some((v) => v && v !== "") ? C.green : C.bg2, Object.values(bloodDraft).some((v) => v && v !== "") ? "#fff" : C.muted), flex: 2, padding: "9px 0" }}>
                    <Check size={14} /> Save results
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 6, lineHeight: 1.5, padding: "0 12px" }}>
        ⚕️ Vitae is not a medical app and does not diagnose. Always discuss abnormal results with a healthcare professional.
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}
/* ================= TRAIN TAB ================= */
const fmtClock = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const RIR_OPTS = [["0", "0 · failure"], ["1", "1 left"], ["2", "2 left"], ["3", "3+ left"]];
const EFFORT_OPTS = [["3", "Easy"], ["2", "Moderate"], ["1", "Hard"], ["0", "All-out"]];

function PlateView({ target, unit }) {
  const bar = unit === "lb" ? 45 : 20;
  const plates = unit === "lb" ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
  const colors = { 25: "#C0392B", 20: "#2C6FBB", 15: "#D9A23C", 10: "#3E7B53", 5: "#7A6FB0", 2.5: "#9C9486", 1.25: "#B0763D", 45: "#C0392B", 35: "#2C6FBB" };
  let each = (target - bar) / 2; const res = [];
  if (each > 0) plates.forEach((p) => { while (each >= p - 1e-9) { res.push(p); each = +(each - p).toFixed(3); } });
  if (target <= bar) return <div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>Just the bar ({bar}{unit}).</div>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", padding: "8px 0" }}>
      <span style={{ fontSize: 11.5, color: C.muted, marginRight: 4 }}>Per side:</span>
      {res.length === 0 ? <span style={{ fontSize: 12, color: C.muted }}>—</span> : res.map((p, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: colors[p] || C.muted, padding: "3px 7px", borderRadius: 6 }}>{p}</span>
      ))}
    </div>
  );
}

function ExerciseCard({ ex, exIdx, workouts, unit, customRests, advanced, sleepReadiness, daily, painLevel, painLocations, repRangePref, intensityStyle, onLogSet, onSetRir, onOpenRirPrompt, onRemoveSet, onRemoveEx, onSaveRest, onStartRest, onSetExercisePain }) {
  const meta = findEx(ex.name);
  const prog = progressionFor(workouts, ex.name, daily, sleepReadiness, repRangePref, intensityStyle);  // richer: action + text + suggested w/reps
  const sug = prog || suggestNext(workouts, ex.name);                     // fall back to lightweight hint
  const last = ex.sets[ex.sets.length - 1];
  const [w, setW] = useState(last ? String(last.w) : sug ? String(sug.w) : "");
  const [reps, setReps] = useState(last ? String(last.reps) : sug ? String(sug.reps) : "");
  const [showCue, setShowCue] = useState(false);
  const [showPlate, setShowPlate] = useState(false);
  const [editRest, setEditRest] = useState(false);
  const restSecs = customRests[ex.name] ?? restDefault(meta);
  const setNo = ex.sets.length + 1;

  // last session's sets for this exercise (the "do it again next week" reference)
  const prevSets = (() => {
    let found = null, ts = 0;
    workouts.forEach((wk) => wk.exercises.forEach((e) => { if (e.name === ex.name && wk.ts > ts && e.sets.length) { ts = wk.ts; found = e.sets; } }));
    return found;
  })();

  function log() {
    const W = parseFloat(w) || 0, R = parseInt(reps) || 0;
    if (R <= 0) return;
    // PR detection + the new-record medal are handled at the app-frame level in woLogSet.
    // Log the set; the RIR prompt is opened at the app-frame level by the parent's woLogSet.
    onLogSet(exIdx, { w: W, reps: R, rir: null });
    onStartRest(ex.name);
  }
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{ex.name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1, textTransform: "capitalize" }}>
            {ex.group}{meta?.sec?.length ? ` · ${meta.sec.join(", ")}` : ""}{ex.sets.length ? ` · ${ex.sets.length} set${ex.sets.length > 1 ? "s" : ""} done` : ""}
          </div>
        </div>
        <button className="sprig-tap" onClick={() => setShowCue((s) => !s)} title="Form cue" style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center", color: C.greenSoft }}><BookOpen size={15} /></button>
        <button className="sprig-tap" onClick={() => onRemoveEx(exIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={15} /></button>
      </div>

      {showCue && meta?.cue && (
        <div style={{ fontSize: 12, color: C.inkSoft, background: C.bg, borderRadius: 11, padding: "10px 12px", marginTop: 10, lineHeight: 1.5 }}>
          <b style={{ color: C.greenSoft }}>Form &amp; full ROM:</b> {meta.cue}
        </div>
      )}

      {/* pain risk banner */}
      {(() => {
        const risk = exercisePainRisk(ex.name, painLevel, painLocations);
        if (!risk) return null;
        const c = risk.tone === "bad" ? C.coral : risk.tone === "warn" ? "#E0714A" : C.amber;
        return (
          <div style={{ background: c + "12", border: `1px solid ${c}44`, borderRadius: 10, padding: "8px 11px", marginTop: 10, fontSize: 12, color: C.inkSoft, display: "flex", gap: 7, alignItems: "center" }}>
            <HeartPulse size={14} color={c} style={{ flexShrink: 0 }} /> <span>{risk.text}</span>
          </div>
        );
      })()}

      {prevSets && ex.sets.length === 0 && (
        <div style={{ fontSize: 11, color: C.muted, marginTop: 9, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <RotateCcw size={12} /> Last time:
          {prevSets.map((s, i) => <span key={i} style={{ background: C.bg2, borderRadius: 6, padding: "2px 6px", fontWeight: 600, color: C.inkSoft }}>{s.w}×{s.reps}</span>)}
        </div>
      )}

      {/* logged sets */}
      {ex.sets.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
          {ex.sets.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, background: C.bg, borderRadius: 9, padding: "7px 11px" }}>
              <span style={{ width: 36, color: C.muted, fontSize: 11 }}>Set {i + 1}</span>
              <span style={{ fontWeight: 600 }}>{s.w}{unit} × {s.reps}</span>
              {advanced && (
                <button className="sprig-tap" onClick={() => onOpenRirPrompt && onOpenRirPrompt(exIdx, i)} title="Set reps in reserve"
                  style={{ background: s.rir == null ? C.amber + "22" : "transparent", border: "none", cursor: "pointer", color: s.rir == null ? C.amber : C.muted, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "2px 6px" }}>
                  {s.rir == null ? "+ RIR" : `RIR ${s.rir}`}
                </button>
              )}
              {advanced && <span style={{ marginLeft: "auto", fontSize: 11, color: C.greenSoft }}><Term k="e1RM" /> {Math.round(est1RM(s.w, s.reps))}</span>}
              <button className="sprig-tap" onClick={() => onRemoveSet(exIdx, i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2, marginLeft: advanced ? 0 : "auto" }}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {sug && ex.sets.length === 0 && (() => {
        const action = sug.action || "add_w";
        const styleMap = {
          add_w:   { c: C.greenSoft, ic: <ArrowUp size={13} /> },
          add_rep: { c: C.greenSoft, ic: <Plus size={13} /> },
          repeat:  { c: C.amber,     ic: <Repeat size={13} /> },
          back_off:{ c: C.amber,     ic: <Minus size={13} /> },
          hold:    { c: C.amber,     ic: <Square size={13} /> },
          deload:  { c: C.coral,     ic: <TrendingDown size={13} /> },
        };
        const sty = styleMap[action] || styleMap.add_w;
        const text = sug.text || sug.note;
        const isPush = action === "add_w" || action === "add_rep";
        return (
          <div style={{ background: isPush ? C.green + "0d" : C.bg, borderRadius: 12, padding: "10px 12px", marginTop: 9, border: `1px solid ${isPush ? C.green + "33" : C.line}` }}>
            {sug.prevW != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: C.muted }}>Last: <b style={{ color: C.inkSoft }}>{sug.prevW}{unit} × {sug.prevReps}</b></span>
                <ChevronRight size={13} color={C.muted} />
                <span style={{ color: sty.c, fontWeight: 700 }}>Target: {sug.w}{unit} × {sug.reps}</span>
              </div>
            )}
            <div style={{ fontSize: 11.5, color: sty.c, display: "flex", alignItems: "flex-start", gap: 6, lineHeight: 1.45 }}>
              <span style={{ marginTop: 1 }}>{sty.ic}</span><span>{text}</span>
            </div>
          </div>
        );
      })()}

      {!sug && ex.sets.length === 0 && (
        <div style={{ background: C.bg, borderRadius: 12, padding: "10px 12px", marginTop: 9, border: `1px solid ${C.line}`, fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>
          Start conservative — pick a weight you can do for 8–12 reps with about 2 in reserve. Next time, Sprig pushes you to beat it.
        </div>
      )}

      {/* input row */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: C.muted, width: 34, fontWeight: 600 }}>Set {setNo}</span>
        <input value={w} onChange={(e) => setW(e.target.value)} inputMode="decimal" placeholder={unit}
          style={{ width: 52, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 4px", fontFamily: "DM Sans", fontSize: 15, fontWeight: 600, background: C.bg }} />
        <span style={{ color: C.muted, fontSize: 13 }}>×</span>
        <input value={reps} onChange={(e) => setReps(e.target.value)} inputMode="numeric" placeholder="reps"
          style={{ width: 52, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 4px", fontFamily: "DM Sans", fontSize: 15, fontWeight: 600, background: C.bg }} />
        {meta?.bar && (
          <button className="sprig-tap" onClick={() => setShowPlate((s) => !s)} title="Plate calculator" style={{ background: showPlate ? C.green : C.bg2, border: "none", cursor: "pointer", width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center", color: showPlate ? "#fff" : C.inkSoft }}><Calculator size={16} /></button>
        )}
        <button className="sprig-tap" onClick={log} style={{ ...btn(C.green, "#fff"), flex: 1, padding: "10px 0" }}><Plus size={16} /> Complete set</button>
      </div>

      {showPlate && meta?.bar && <PlateView target={parseFloat(w) || 0} unit={unit} />}

      {/* WARM-UP — only when there's a working weight + no sets logged yet */}
      {(() => {
        const target = parseFloat(w) || prevSets?.bestSet?.w || 0;
        if (!target || ex.sets.length > 0) return null;
        const wu = warmupSets(target, meta, unit);
        if (!wu.sets.length && !wu.mobility.length) return null;
        return (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: C.greenSoft, fontWeight: 600, padding: "2px 0" }}>
              <Flame size={13} /> Warm-up for {target}{unit} <ChevronDown size={12} />
            </summary>
            <div style={{ background: C.bg, borderRadius: 10, padding: "10px 12px", marginTop: 6, fontSize: 12 }}>
              {wu.sets.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {wu.sets.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, color: C.inkSoft }}>
                      <span style={{ fontSize: 10.5, color: C.muted, width: 18 }}>{i + 1}.</span>
                      <span style={{ fontWeight: 600 }}>{s.w === 0 ? "Empty bar / bodyweight" : `${s.w}${unit}`}</span>
                      <span style={{ color: C.muted, fontSize: 11.5 }}>× {s.reps}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", alignItems: "center", gap: 9, color: C.green, marginTop: 4, fontWeight: 700 }}>
                    <span style={{ fontSize: 10.5, width: 18 }}>→</span>
                    <span>Working: {target}{unit}</span>
                  </div>
                </div>
              )}
              {wu.mobility.length > 0 && (
                <div style={{ marginTop: 9, paddingTop: 9, borderTop: `1px dashed ${C.line}`, fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                  <b style={{ color: C.inkSoft, fontWeight: 600 }}>Prep:</b> {wu.mobility.join(" · ")}
                </div>
              )}
            </div>
          </details>
        );
      })()}

      {/* rest pref */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9, fontSize: 11.5, color: C.muted, flexWrap: "wrap" }}>
        <Timer size={13} /> Rest {fmtClock(restSecs)}
        <button className="sprig-tap" onClick={() => setEditRest((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: C.greenSoft, fontSize: 11.5, fontWeight: 600, padding: 0, marginLeft: 2 }}>edit</button>
        {editRest && (
          <span style={{ display: "flex", gap: 4, marginLeft: 4, flexWrap: "wrap" }}>
            {[45, 60, 90, 120, 180, 240].map((s) => (
              <button key={s} onClick={() => { onSaveRest(ex.name, s); setEditRest(false); }} className="sprig-tap"
                style={{ border: "none", cursor: "pointer", padding: "4px 7px", borderRadius: 7, fontSize: 10.5, fontWeight: 600, fontFamily: "DM Sans", background: restSecs === s ? C.green : C.bg2, color: restSecs === s ? "#fff" : C.inkSoft }}>{fmtClock(s)}</button>
            ))}
          </span>
        )}
      </div>

      {/* per-exercise pain marker */}
      {onSetExercisePain && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, letterSpacing: .2 }}>PAIN DURING</span>
          {Object.entries(SET_PAIN).map(([key, val]) => {
            const on = (ex.pain || "none") === key;
            return (
              <button key={key} className="sprig-tap" onClick={() => onSetExercisePain(exIdx, key)}
                style={{ border: "none", cursor: "pointer", padding: "4px 9px", borderRadius: 7, fontSize: 11, fontWeight: 600, fontFamily: "DM Sans",
                  background: on ? val.color : C.bg2, color: on ? "#fff" : C.muted }}>{val.label}</button>
            );
          })}
        </div>
      )}

      {/* RIR prompt now renders at the app-frame level (see SprigApp) so it's never clipped. */}
    </div>
  );
}

function ExercisePicker({ onPick, onClose, onCustom, equipment }) {
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState("");
  const [grp, setGrp] = useState("chest");
  const [filter, setFilter] = useState("all");
  const list = EXERCISES.filter((e) =>
    (filter === "all" || e.group === filter) &&
    canDoWith(e, equipment) &&
    (e.name.toLowerCase().includes(q.toLowerCase()) || e.group.includes(q.toLowerCase())));
  const byGroup = {};
  list.forEach((e) => { (byGroup[e.group] = byGroup[e.group] || []).push(e); });
  const groupName = (k) => (MUSCLES.find(([m]) => m === k) || [k, k])[1];
  return (
    <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Search size={16} color={C.muted} />
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder="Search exercises…"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "DM Sans", fontSize: 14, color: C.ink }} />
        <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: C.inkSoft }}><X size={15} /></button>
      </div>
      {/* group filter chips */}
      <div className="sprig-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 6 }}>
        {[["all", "All"], ...MUSCLES].map(([k, n]) => (
          <button key={k} onClick={() => setFilter(k)} className="sprig-tap"
            style={{ flexShrink: 0, border: "none", cursor: "pointer", padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: filter === k ? C.green : C.bg2, color: filter === k ? "#fff" : C.inkSoft }}>{n}</button>
        ))}
      </div>
      <div className="sprig-scroll" style={{ maxHeight: 250, overflowY: "auto" }}>
        {Object.keys(byGroup).map((g) => (
          <div key={g} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4, margin: "4px 2px" }}>{groupName(g)}</div>
            {byGroup[g].map((e) => (
              <button key={e.name} className="sprig-tap" onClick={() => onPick(e.name)}
                style={{ width: "100%", textAlign: "left", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", cursor: "pointer", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, marginTop: 1 }}>{e.cue}</div>
                </div>
                <Plus size={17} color={C.greenSoft} />
              </button>
            ))}
          </div>
        ))}
        {list.length === 0 && <div style={{ fontSize: 12.5, color: C.muted, textAlign: "center", padding: "12px 0" }}>No matches. Add it as a custom exercise below.</div>}
        {/* custom */}
        <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 10, marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>Add your own</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Exercise name"
              style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", fontFamily: "DM Sans", fontSize: 13, background: C.bg }} />
            <select value={grp} onChange={(e) => setGrp(e.target.value)} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px", fontFamily: "DM Sans", fontSize: 12.5, background: C.bg }}>
              {MUSCLES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <button className="sprig-tap" disabled={!custom.trim()} onClick={() => { onCustom(custom.trim(), grp); setCustom(""); }}
              style={{ ...btn(custom.trim() ? C.green : C.bg2, custom.trim() ? "#fff" : C.muted), padding: "0 12px" }}><Plus size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* routine builder: name + multi-select from the library, saved for reuse */
function RoutineBuilder({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [picked, setPicked] = useState(initial?.exercises || []);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [custom, setCustom] = useState("");
  const [cgrp, setCgrp] = useState("chest");
  const groupName = (k) => (MUSCLES.find(([m]) => m === k) || [k, k])[1];
  const list = EXERCISES.filter((e) =>
    (filter === "all" || e.group === filter) &&
    (e.name.toLowerCase().includes(q.toLowerCase()) || e.group.includes(q.toLowerCase())));
  const byGroup = {};
  list.forEach((e) => { (byGroup[e.group] = byGroup[e.group] || []).push(e); });
  const toggle = (n) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  const move = (i, dir) => setPicked((p) => { const a = [...p]; const j = i + dir; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });
  function addCustom() {
    const n = custom.trim(); if (!n) return;
    if (!findEx(n)) EXERCISES.push({ name: n, group: cgrp, sec: [], type: "accessory", bar: false, cue: "Move through a full range of motion with control." });
    if (!picked.includes(n)) setPicked((p) => [...p, n]);
    setCustom("");
  }
  return (
    <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Dumbbell size={17} color={C.green} />
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Routine name (e.g. Push Day)"
          style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg }} />
        <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.inkSoft }}><X size={15} /></button>
      </div>

      {/* selected list */}
      {picked.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>In this routine · {picked.length}</div>
          {picked.map((n, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 8, background: C.green + "12", borderRadius: 10, padding: "8px 11px", marginBottom: 5 }}>
              <span style={{ width: 16, fontSize: 11, color: C.muted }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{n}</span>
              <button className="sprig-tap" onClick={() => move(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? C.line : C.muted, padding: 2, transform: "rotate(-90deg)" }}><ChevronRight size={15} /></button>
              <button className="sprig-tap" onClick={() => move(i, 1)} disabled={i === picked.length - 1} style={{ background: "none", border: "none", cursor: i === picked.length - 1 ? "default" : "pointer", color: i === picked.length - 1 ? C.line : C.muted, padding: 2, transform: "rotate(90deg)" }}><ChevronRight size={15} /></button>
              <button className="sprig-tap" onClick={() => toggle(n)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2 }}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* search + filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Search size={15} color={C.muted} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add exercises…"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "DM Sans", fontSize: 13.5, color: C.ink }} />
      </div>
      <div className="sprig-scroll" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 4 }}>
        {[["all", "All"], ...MUSCLES].map(([k, n]) => (
          <button key={k} onClick={() => setFilter(k)} className="sprig-tap"
            style={{ flexShrink: 0, border: "none", cursor: "pointer", padding: "5px 11px", borderRadius: 99, fontSize: 11.5, fontWeight: 600, fontFamily: "DM Sans", background: filter === k ? C.green : C.bg2, color: filter === k ? "#fff" : C.inkSoft }}>{n}</button>
        ))}
      </div>
      <div className="sprig-scroll" style={{ maxHeight: 220, overflowY: "auto" }}>
        {Object.keys(byGroup).map((g) => (
          <div key={g} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4, margin: "3px 2px" }}>{groupName(g)}</div>
            {byGroup[g].map((e) => {
              const on = picked.includes(e.name);
              return (
                <button key={e.name} className="sprig-tap" onClick={() => toggle(e.name)}
                  style={{ width: "100%", textAlign: "left", background: on ? C.green + "14" : C.bg, border: `1px solid ${on ? C.greenSoft : C.line}`, borderRadius: 10, padding: "9px 11px", cursor: "pointer", marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{e.name}</span>
                  {on ? <Check size={16} color={C.green} /> : <Plus size={16} color={C.muted} />}
                </button>
              );
            })}
          </div>
        ))}
        <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 8, marginTop: 2 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Custom exercise"
              style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 9px", fontFamily: "DM Sans", fontSize: 12.5, background: C.bg }} />
            <select value={cgrp} onChange={(e) => setCgrp(e.target.value)} style={{ border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px", fontFamily: "DM Sans", fontSize: 12, background: C.bg }}>
              {MUSCLES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <button className="sprig-tap" disabled={!custom.trim()} onClick={addCustom} style={{ ...btn(custom.trim() ? C.green : C.bg2, custom.trim() ? "#fff" : C.muted), padding: "0 11px" }}><Plus size={15} /></button>
          </div>
        </div>
      </div>

      <button className="sprig-tap" disabled={!name.trim() || picked.length === 0}
        onClick={() => onSave({ ...(initial || {}), name: name.trim(), exercises: picked })}
        style={{ ...btn(name.trim() && picked.length ? C.green : C.bg2, name.trim() && picked.length ? "#fff" : C.muted), width: "100%", padding: "13px 0", marginTop: 12 }}>
        <Check size={16} /> {initial?.id ? "Update routine" : "Save routine"}
      </button>
    </div>
  );
}

function VolumeCoach({ volume, advanced }) {
  const rows = MUSCLES.map(([k, n]) => {
    const v = volume[k] || 0;
    const st = volumeStatus(v, k);
    return { k, n, v, st, direct: volume.direct?.[k] || 0, indirect: volume.indirect?.[k] || 0 };
  });
  const trained = rows.filter((r) => r.v > 0);
  if (!trained.length) return null;
  // simple mode: only show muscles you've actually trained, sorted by volume desc
  // advanced: show every muscle, sorted by status priority then alpha
  const orderTag = { over: 0, low: 1, under: 2, none: 3, high: 4, good: 5 };
  const display = advanced
    ? [...rows].sort((a, b) => (orderTag[a.st.tag] - orderTag[b.st.tag]) || a.n.localeCompare(b.n))
    : trained.sort((a, b) => b.v - a.v);

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}><Target size={16} color={C.greenSoft} /> Weekly volume</div>
      <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 12 }}>
        {advanced ? "Hard sets per muscle vs the growth target. Direct sets count 1×, indirect ½×." : "How each trained muscle is doing this week."}
      </div>
      {display.map((r) => {
        const col = VOL_TAG_COLOR(r.st.tag);
        return (
          <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
            <span style={{ width: 78, fontSize: 12, color: C.inkSoft }}>{r.n}</span>
            <div style={{ flex: 1, height: 8, background: C.bg2, borderRadius: 99, position: "relative" }}>
              <div style={{ width: Math.min(100, (r.v / r.st.hi) * 100) + "%", height: "100%", background: col, borderRadius: 99 }} />
              {/* low and high marks */}
              <div style={{ position: "absolute", left: ((r.st.lo / r.st.hi) * 100) + "%", top: -2, bottom: -2, width: 1, background: C.line }} />
            </div>
            {advanced ? (
              <span style={{ width: 76, textAlign: "right", fontSize: 11.5, fontWeight: 700, color: col }}>{r.v} <span style={{ color: C.muted, fontWeight: 500 }}>/{r.st.lo}–{r.st.hi}</span></span>
            ) : (
              <span style={{ width: 76, textAlign: "right", fontSize: 11.5, fontWeight: 700, color: col, textTransform: "capitalize" }}>{VOL_TAG_LABEL[r.st.tag]}</span>
            )}
          </div>
        );
      })}
      {/* call out weak points */}
      {(() => {
        const weak = rows.filter((r) => r.st.tag === "low" || r.st.tag === "under" || r.st.tag === "none").map((r) => r.n);
        const over = rows.filter((r) => r.st.tag === "over").map((r) => r.n);
        if (!weak.length && !over.length) return null;
        return (
          <div style={{ borderTop: `1px dashed ${C.line}`, paddingTop: 10, marginTop: 6, fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
            {weak.length > 0 && <div>📈 <b>Add volume:</b> {weak.slice(0, 4).join(", ")}{weak.length > 4 ? "…" : ""}</div>}
            {over.length > 0 && <div style={{ marginTop: 3 }}>⚠️ <b>Ease off:</b> {over.join(", ")} — likely junk volume.</div>}
          </div>
        );
      })()}
    </div>
  );
}

function LiftTrend({ workouts, exName }) {
  const ser = liftE1RMSeries(workouts, exName);
  if (ser.length < 2) return null;
  const W = 300, H = 54, p = 4;
  const max = Math.max(...ser.map((s) => s.e1)), min = Math.min(...ser.map((s) => s.e1));
  const x = (i) => p + (i / (ser.length - 1)) * (W - 2 * p);
  const y = (e) => p + (1 - (e - min) / (max - min || 1)) * (H - 2 * p);
  const path = ser.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s.e1).toFixed(1)}`).join(" ");
  const up = ser[ser.length - 1].e1 >= ser[0].e1;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, borderRadius: 13, padding: "10px 13px", border: `1px solid ${C.line}`, marginBottom: 7 }}>
      <div style={{ width: 96 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exName}</div>
        <div style={{ fontSize: 11, color: up ? C.greenSoft : C.coral, fontWeight: 600 }}>{Math.round(ser[ser.length - 1].e1)} e1RM {up ? "↑" : "↓"}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ flex: 1, height: 40 }} preserveAspectRatio="none">
        <path d={path} fill="none" stroke={up ? C.green : C.coral} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {ser.map((s, i) => <circle key={i} cx={x(i)} cy={y(s.e1)} r="2.2" fill={up ? C.green : C.coral} />)}
      </svg>
    </div>
  );
}

function TrainTab({ workouts, active, profile, trainInfo, advanced, sub = "training", onSub, routines, onSaveRoutine, onDeleteRoutine, onUseTemplate, onStart, onAddExercise, onLogSet, onSetRir, onOpenRirPrompt, onRemoveSet, onRemoveExercise, onFinish, onCancel, onSaveRest, onSetExercisePain, onGoBody, onGoHealth, onStartRest, restActive, moveInfo, daily, onDaily, onAddCardio, sleepInfo, rirPref }) {
  const unit = profile.unit || "kg";
  const [picker, setPicker] = useState(false);
  const [builder, setBuilder] = useState(null); // null | {} (new) | routine (edit)
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMobility, setShowMobility] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);

  // ACTIVE WORKOUT
  if (active) {
    const elapsed = Math.round((Date.now() - active.startTs) / 60000);
    const totalSets = active.exercises.reduce((a, e) => a + e.sets.length, 0);
    return (
      <div className="sprig-rise">
        <div style={{ position: "sticky", top: 0, zIndex: 5, background: C.green, borderRadius: 16, padding: "12px 16px", color: "#fff", display: "flex", alignItems: "center", gap: 12, boxShadow: C.shadow, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: .8 }}>{active.routineName ? active.routineName.toUpperCase() : "WORKOUT IN PROGRESS"}</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }}>{elapsed} min · {totalSets} sets</div>
          </div>
          <button className="sprig-tap" onClick={onCancel} style={{ ...btn("rgba(255,255,255,.15)", "#fff"), padding: "9px 12px", fontSize: 12.5 }}>Cancel</button>
          <button className="sprig-tap" onClick={onFinish} style={{ ...btn("#fff", C.green), padding: "9px 14px", fontSize: 12.5 }}><Check size={15} /> Finish</button>
        </div>

        {/* (Rest timer now renders at the app-frame level so it tracks scroll — see SprigApp.) */}

        {active.exercises.map((ex, i) => (
          <ExerciseCard key={i} ex={ex} exIdx={i} workouts={workouts} unit={unit} customRests={trainInfo.customRests} advanced={advanced}
            sleepReadiness={trainInfo.sleepReadiness} daily={trainInfo.daily}
            painLevel={trainInfo.pain?.level} painLocations={trainInfo.pain?.locations} repRangePref={profile.repRange} intensityStyle={rirPref?.intensityStyle}
            onLogSet={onLogSet} onSetRir={onSetRir} onOpenRirPrompt={onOpenRirPrompt} onRemoveSet={onRemoveSet} onRemoveEx={onRemoveExercise} onSaveRest={onSaveRest} onStartRest={onStartRest}
            onSetExercisePain={onSetExercisePain} />
        ))}

        {picker
          ? <ExercisePicker equipment={profile?.equipment} onPick={(n) => { onAddExercise(n); setPicker(false); }} onClose={() => setPicker(false)} onCustom={(n, g) => { EXERCISES.push({ name: n, group: g, sec: [], type: "accessory", bar: false, cue: "Move through a full range of motion with control." }); onAddExercise(n); setPicker(false); }} />
          : <button className="sprig-tap" onClick={() => setPicker(true)} style={{ ...btn(C.card, C.green), width: "100%", padding: "14px 0", border: `1px dashed ${C.greenSoft}`, boxShadow: C.shadow }}><Plus size={18} /> Add exercise</button>}
        <div style={{ height: 8 }} />
      </div>
    );
  }

  // DASHBOARD
  const prs = detectPRs(workouts).slice(0, 4);
  const standardLifts = ["Barbell Bench Press", "Barbell Squat", "Deadlift", "Overhead Press", "Barbell Row"].filter((n) => liftE1RMSeries(workouts, n).length >= 2);
  const sug = trainInfo.suggestion;
  const SUG_ICON = { rest: BedDouble, mobility: Activity, push: Dumbbell, pull: Dumbbell, legs: Dumbbell, upper: Dumbbell, lower: Dumbbell, full: Dumbbell, light_upper: Dumbbell };
  const SugIcon = SUG_ICON[sug?.type] || Dumbbell;
  const startSuggested = () => {
    if (!sug) return onStart();
    if (sug.routine) return onStart(sug.routine);                          // matched a saved routine
    if (sug.type === "rest" || sug.type === "mobility") return;             // no workout to start
    onStart();                                                              // open empty workout to add
  };
  return (
    <div className="sprig-rise">
      <SubTabs tabs={[["training", "Training & Cardio"], ["analytics", "Volume & Recovery"]]} active={sub} onChange={onSub} />
      {sub === "training" && (<>
      {/* PAIN COACH — only when active pain logged */}
      {trainInfo.pain && trainInfo.pain.level !== "none" && (() => {
        const lvl = trainInfo.pain.level;
        const c = lvl === "serious" ? C.coral : lvl === "moderate" ? "#E0714A" : C.amber;
        const heading = lvl === "serious" ? "Rest the painful area" : lvl === "moderate" ? "Train around pain" : "Train with caution";
        return (
          <div style={{ background: c + "12", border: `1px solid ${c}55`, borderRadius: 16, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: c + "26", display: "grid", placeItems: "center" }}>
                <HeartPulse size={17} color={c} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: c, fontWeight: 700, letterSpacing: .3 }}>PAIN ACTIVE · {lvl.toUpperCase()}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{heading}</div>
              </div>
              <button className="sprig-tap" onClick={onGoHealth} style={{ background: "transparent", border: "none", cursor: "pointer", color: c, fontSize: 11.5, fontWeight: 600, padding: 4 }}>Manage →</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {trainInfo.pain.coach.lines.slice(0, 3).map((line, i) => (
                <div key={i} style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5, display: "flex", gap: 7 }}>
                  <span style={{ color: c, marginTop: 1 }}>•</span><span>{line}</span>
                </div>
              ))}
            </div>
            {trainInfo.pain.coach.seekHelp && (
              <div style={{ fontSize: 11, color: c, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${c}33`, lineHeight: 1.5 }}>
                ⚕️ Sharp pain, swelling, or pain lasting 2+ weeks → see a doctor or physiotherapist. Sprig isn't medical advice.
              </div>
            )}
          </div>
        );
      })()}

      {/* SUGGESTED WORKOUT */}
      {sug && (
        <div style={{ background: C.heroGrad1, borderRadius: 20, padding: 16, color: "#fff", boxShadow: C.shadow, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: "rgba(255,255,255,.14)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <SugIcon size={22} color="#E7DCC6" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, opacity: .75, letterSpacing: .3 }}>SUGGESTED FOR TODAY</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 21, fontWeight: 700, lineHeight: 1.1 }}>{sug.label}</div>
              <div style={{ fontSize: 12, opacity: .85, marginTop: 4, lineHeight: 1.45 }}>{sug.reason}</div>
            </div>
          </div>
          {sug.routine && (
            <div style={{ fontSize: 11.5, opacity: .8, marginTop: 10, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.12)" }}>
              Matches your routine: <b>{sug.routine.name}</b>
            </div>
          )}
          {sug.type !== "rest" && sug.type !== "mobility" && (
            <button className="sprig-tap" onClick={startSuggested} style={{ ...btn("#fff", C.green), width: "100%", padding: "11px 0", marginTop: 12, fontSize: 14 }}>
              <Play size={15} /> {sug.routine ? `Start ${sug.routine.name}` : `Start ${sug.label.toLowerCase()}`}
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 9 }}>
        <button className="sprig-tap" onClick={() => onStart()} style={{ ...btn(C.lime, "#0A1F12"), flex: 2, padding: "17px 0", fontSize: 16, fontWeight: 700, boxShadow: `0 6px 18px ${C.lime}33` }}>
          <Play size={18} /> Start workout
        </button>
        <button className="sprig-tap" onClick={() => setBuilder({})} style={{ ...btn(C.card, C.ink), flex: 1, padding: "17px 0", fontSize: 13.5, border: `1px solid ${C.line}`, boxShadow: C.shadow }}>
          <Plus size={17} /> Routine
        </button>
      </div>

      {builder && (
        <RoutineBuilder initial={builder.id ? builder : null}
          onSave={(r) => { onSaveRoutine(r); setBuilder(null); }} onClose={() => setBuilder(null)} />
      )}

      {/* saved routines */}
      {routines.length > 0 && !builder && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 2px 8px" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>My routines</div>
            <span style={{ fontSize: 11.5, color: C.muted }}>{routines.length}/10</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {routines.map((r) => (
              <div key={r.id} style={{ background: C.card, borderRadius: 15, padding: "13px 15px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{r.name}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.exercises.length} exercises · {r.exercises.slice(0, 3).join(", ")}{r.exercises.length > 3 ? "…" : ""}
                    </div>
                  </div>
                  <button className="sprig-tap" onClick={() => setBuilder(r)} title="Edit" style={{ background: C.bg2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", color: C.inkSoft }}><PencilLine size={15} /></button>
                  <button className="sprig-tap" onClick={() => onDeleteRoutine(r.id)} title="Delete" style={{ background: C.bg2, border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center", color: C.muted }}><Trash2 size={15} /></button>
                  <button className="sprig-tap" onClick={() => onStart(r)} style={{ ...btn(C.green, "#fff"), padding: "9px 14px", fontSize: 13 }}><Play size={14} /> Start</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {routines.length === 0 && !builder && (
        <button className="sprig-tap" onClick={() => setBuilder({})} style={{ width: "100%", marginTop: 12, background: C.card, border: `1px dashed ${C.line}`, borderRadius: 15, padding: "15px 14px", cursor: "pointer", color: C.muted, fontSize: 13, fontFamily: "DM Sans", textAlign: "left", display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green + "14", display: "grid", placeItems: "center", flexShrink: 0 }}><Plus size={18} color={C.green} /></div>
          <span>Build a routine (e.g. Push / Pull / Legs) once, then repeat it each week with one tap.</span>
        </button>
      )}

      {/* mobility routines */}
      <div style={{ marginTop: 12 }}>
        <button className="sprig-tap" onClick={() => setShowMobility((s) => !s)} style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 15, padding: "12px 14px", cursor: "pointer", boxShadow: C.shadow, display: "flex", alignItems: "center", gap: 10 }}>
          <PersonStanding size={17} color={C.greenSoft} />
          <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 600, color: C.ink, fontFamily: "DM Sans" }}>Mobility routines</span>
          <ChevronRight size={17} color={C.muted} style={{ transform: showMobility ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </button>
        {showMobility && (
          <div className="sprig-pop" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {MOBILITY_ROUTINES.map((r) => (
              <details key={r.id} style={{ background: C.card, borderRadius: 14, padding: "11px 13px", border: `1px solid ${C.line}`, boxShadow: C.shadow }}>
                <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{r.minutes} min · {r.area}</div>
                  </div>
                  <ChevronDown size={14} color={C.muted} />
                </summary>
                <ol style={{ margin: "9px 0 0", padding: "0 0 0 18px", fontSize: 12, color: C.inkSoft, lineHeight: 1.65 }}>
                  {r.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* templates */}
      {routines.length < 10 && (
        <div style={{ marginTop: 12 }}>
          <button className="sprig-tap" onClick={() => setShowTemplates((s) => !s)} style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 15, padding: "12px 14px", cursor: "pointer", boxShadow: C.shadow, display: "flex", alignItems: "center", gap: 10 }}>
            <BookOpen size={17} color={C.greenSoft} />
            <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 600, color: C.ink, fontFamily: "DM Sans" }}>Start from a template</span>
            <ChevronRight size={17} color={C.muted} style={{ transform: showTemplates ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          </button>
          {showTemplates && (
            <div className="sprig-pop" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {TEMPLATES.map((tmpl) => (
                <div key={tmpl.id} style={{ background: C.card, borderRadius: 14, padding: "12px 14px", border: `1px solid ${C.line}`, boxShadow: C.shadow }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{tmpl.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{tmpl.desc}</div>
                    </div>
                    <button className="sprig-tap" onClick={() => { onUseTemplate(tmpl); setShowTemplates(false); }} style={{ ...btn(C.green, "#fff"), padding: "8px 12px", fontSize: 12.5 }}><Plus size={14} /> Use</button>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>
                    Days: {tmpl.days.map((d) => d.name).join(" · ")}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", padding: "4px 8px", lineHeight: 1.5 }}>
                Templates save each day as a routine you can edit, reorder, and start with one tap.
              </div>
            </div>
          )}
        </div>
      )}

      {/* readiness */}
      <div style={{ width: "100%", textAlign: "left", marginTop: 14, background: C.heroGrad1, borderRadius: 18, padding: 16, color: "#fff", display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow }}>
        <Ring value={trainInfo.bodyReadiness} max={100} size={64} stroke={8} label={trainInfo.bodyReadiness} sub="ready" color={trainInfo.bodyReadiness >= 70 ? C.leaf : trainInfo.bodyReadiness >= 45 ? C.amber : C.coralSoft} track="rgba(255,255,255,.15)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, opacity: .8 }}>TODAY'S READINESS</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700 }}>
            {trainInfo.bodyReadiness >= 70 ? "Push hard" : trainInfo.bodyReadiness >= 45 ? "Train moderate" : "Light / recover"}
          </div>
          <div style={{ fontSize: 11.5, opacity: .85, marginTop: 2 }}>{trainInfo.freshMuscles.length ? `Fresh: ${trainInfo.freshMuscles.slice(0, 3).join(", ")}` : "Most muscles still recovering"}</div>
        </div>
      </div>

      {trainInfo.deload.suggest && (
        <div style={{ marginTop: 10, background: "#fdeee8", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <TrendingDown size={18} color={C.coral} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "#9a3d22", lineHeight: 1.45 }}>
            <b>Consider a deload week.</b> {trainInfo.deload.reasons.join(" · ")}. Drop volume ~40% for a week and let everything supercompensate.
          </div>
        </div>
      )}

      {/* Movement & Cardio — directly under readiness (same data/functions as Today, edits via onDaily) */}
      {moveInfo && daily && onDaily && (
        <>
          <div style={{ margin: "18px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>Movement &amp; cardio</div>
          <MovementCard daily={daily} profile={profile} onDaily={onDaily} />
        </>
      )}

      {/* recent workout history preview */}
      </>)}

      {sub === "analytics" && (<>
      <VolumeCoach volume={trainInfo.volume} advanced={advanced} />

      {/* Recovery & strength — moved here from Progress; lives with the rest of training */}
      <div style={{ margin: "20px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><Crown size={16} color={C.lime} /> Recovery &amp; strength</div>
      <RecoveryStrengthSection workouts={workouts} profile={profile} trainInfo={trainInfo} sleepInfo={sleepInfo} advanced={advanced} />

      {/* PRs */}
      {prs.length > 0 && (
        <>
          <div style={{ margin: "18px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><Trophy size={16} color={C.amber} /> Recent PRs</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {prs.map((p, i) => (
              <div key={i} style={{ background: C.card, borderRadius: 13, padding: "10px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
                <Trophy size={16} color={C.amber} />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 12.5, color: C.greenSoft, fontWeight: 700 }}>{p.w}{unit}×{p.reps}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* progress (advanced only) */}
      {advanced && standardLifts.length > 0 && (
        <>
          <div style={{ margin: "18px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><BarChart3 size={16} color={C.greenSoft} /> Strength trend</div>
          {standardLifts.map((n) => <LiftTrend key={n} workouts={workouts} exName={n} />)}
        </>
      )}
      </>)}

      {sub === "training" && (<>
      {/* history — recent workouts preview */}
      {workouts.length > 0 ? (
        <>
          <div style={{ margin: "18px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>History</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[...workouts].reverse().slice(0, 8).map((w, idx, arr) => {
              const sets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
              // prior workouts = everything chronologically before this one
              const prior = workouts.filter((x) => x.ts < w.ts);
              const recap = recapFor(w, prior);
              const winCount = 1 + (recap.recordLifts ? recap.recordLifts.length : 0); // workout_done + records/firsts
              return (
                <details key={w.id} style={{ background: C.card, borderRadius: 13, padding: "11px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
                  <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 8 }}>
                    <Dumbbell size={15} color={C.greenSoft} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{new Date(w.ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: C.lime + "1a", color: C.lime, borderRadius: 99, padding: "2px 8px", fontSize: 10.5, fontWeight: 700 }}><Award size={11} /> {winCount}</span>
                    <span style={{ fontSize: 11.5, color: C.muted }}>{w.durationMin}m · {sets} sets</span>
                    <ChevronDown size={13} color={C.muted} />
                  </summary>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7 }}>{w.exercises.map((e) => e.name).join(" · ")}</div>
                  {/* recap */}
                  <div style={{ display: "flex", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 30%", background: C.bg, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: C.ink }}>{recap.totalVolume.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>kg volume</div>
                    </div>
                    <div style={{ flex: "1 1 30%", background: C.bg, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: C.ink }}>{recap.totalSets}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>sets</div>
                    </div>
                    <div style={{ flex: "1 1 30%", background: C.bg, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: recap.records > 0 ? C.greenSoft : C.ink }}>{recap.records}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>records</div>
                    </div>
                  </div>
                  {recap.records > 0 ? (
                    <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.lime, letterSpacing: .3, marginBottom: 2 }}>KUDOS EARNED</div>
                      {recap.recordLifts.filter((r) => !r.firstTime).map((r) => (
                        <div key={r.name} style={{ fontSize: 11.5, color: C.inkSoft, display: "flex", alignItems: "center", gap: 6 }}>
                          <Sparkles size={11} color={C.greenSoft} /> {r.name}: new e1RM <b>{r.e1RM}{unit}</b> {r.prev > 0 && <span style={{ color: C.muted }}>(was {r.prev})</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginTop: 9, fontSize: 11.5, color: C.muted, fontStyle: "italic" }}>Solid session — consistency logged.</div>
                  )}
                </details>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "26px 10px", lineHeight: 1.5 }}>
          No workouts yet. Tap <b>Start workout</b>, add an exercise, and log your first set — progressive-overload suggestions kick in from session two.
        </div>
      )}
      </>)}
      <div style={{ height: 6 }} />
    </div>
  );
}

/* ================= BODY TAB ================= */
function MeasurementForm({ current, onSave, onClose }) {
  const init = {}; MEASURE_KEYS.forEach(([k]) => (init[k] = current[k]?.current != null ? String(current[k].current) : ""));
  const [v, setV] = useState(init);
  const set = (k, val) => setV((x) => ({ ...x, [k]: val }));
  const dirty = MEASURE_KEYS.some(([k]) => {
    const cur = current[k]?.current; const nv = v[k] === "" ? null : parseFloat(v[k]);
    return nv != null && nv !== cur;
  });
  function submit() {
    const out = {};
    MEASURE_KEYS.forEach(([k]) => { const n = parseFloat(v[k]); if (!isNaN(n)) out[k] = +n.toFixed(1); });
    onSave(out);
  }
  return (
    <div className="sprig-pop" style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 9 }}>All in cm. Tape relaxed, same spot each time (e.g. waist at navel, arm flexed at peak).</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 12px" }}>
        {MEASURE_KEYS.map(([k, lbl]) => (
          <div key={k}>
            <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 3 }}>{lbl}</div>
            <input value={v[k]} onChange={(e) => set(k, e.target.value)} inputMode="decimal" placeholder="cm"
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg, color: C.ink }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
        <button className="sprig-tap" onClick={onClose} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0" }}>Cancel</button>
        <button className="sprig-tap" disabled={!dirty} onClick={submit}
          style={{ ...btn(dirty ? C.green : C.bg2, dirty ? "#fff" : C.muted), flex: 2, padding: "10px 0" }}><Check size={15} /> Save</button>
      </div>
    </div>
  );
}

function Mu({ k, type, cx, cy, rx, ry, d, colorOf, selected, onPick }) {
  const common = { fill: colorOf(k), stroke: selected === k ? C.ink : "rgba(255,255,255,.85)", strokeWidth: selected === k ? 2.4 : 1.3, onClick: () => onPick(k), style: { cursor: "pointer", transition: "fill .45s ease" } };
  return type === "path" ? <path d={d} {...common} /> : <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...common} />;
}
function BodyFigure({ colorOf, selected, onPick }) {
  const sil = C.bg2, skin = "#E7DCC6";
  const figure = (cx, side) => (
    <g key={side}>
      {/* silhouette */}
      <circle cx={cx} cy={24} r={11} fill={skin} />
      <rect x={cx - 20} y={40} width={40} height={58} rx={13} fill={sil} />
      <rect x={cx - 33} y={46} width={11} height={50} rx={5} fill={sil} />
      <rect x={cx + 22} y={46} width={11} height={50} rx={5} fill={sil} />
      <rect x={cx - 18} y={96} width={36} height={18} rx={8} fill={sil} />
      <rect x={cx - 17} y={112} width={16} height={72} rx={7} fill={sil} />
      <rect x={cx + 1} y={112} width={16} height={72} rx={7} fill={sil} />
      <text x={cx} y={200} fontSize="10" fill={C.muted} textAnchor="middle" fontFamily="DM Sans" fontWeight="600">{side === "f" ? "FRONT" : "BACK"}</text>
    </g>
  );
  const cxF = 92, cxB = 268;
  return (
    <svg viewBox="0 0 360 210" style={{ width: "100%", height: "auto", display: "block" }}>
      {figure(cxF, "f")}
      {figure(cxB, "b")}
      {/* FRONT muscles */}
      <Mu k="shoulders" cx={cxF - 21} cy={47} rx={9} ry={7} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="shoulders" cx={cxF + 21} cy={47} rx={9} ry={7} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="chest" cx={cxF - 10} cy={59} rx={11} ry={9} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="chest" cx={cxF + 10} cy={59} rx={11} ry={9} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="abs" type="path" d={`M${cxF - 9} 72 h18 a5 5 0 0 1 5 5 v20 a6 6 0 0 1 -6 6 h-16 a6 6 0 0 1 -6 -6 v-20 a5 5 0 0 1 5 -5 z`} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="biceps" cx={cxF - 27} cy={66} rx={6} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="biceps" cx={cxF + 27} cy={66} rx={6} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="forearms" cx={cxF - 28} cy={90} rx={5} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="forearms" cx={cxF + 28} cy={90} rx={5} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="quads" cx={cxF - 8} cy={130} rx={8} ry={22} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="quads" cx={cxF + 8} cy={130} rx={8} ry={22} colorOf={colorOf} selected={selected} onPick={onPick} />
      {/* BACK muscles */}
      <Mu k="traps" cx={cxB} cy={48} rx={15} ry={8} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="shoulders" cx={cxB - 21} cy={49} rx={8} ry={6} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="shoulders" cx={cxB + 21} cy={49} rx={8} ry={6} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="back" cx={cxB - 9} cy={70} rx={10} ry={15} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="back" cx={cxB + 9} cy={70} rx={10} ry={15} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="triceps" cx={cxB - 27} cy={66} rx={6} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="triceps" cx={cxB + 27} cy={66} rx={6} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="lower_back" cx={cxB} cy={90} rx={10} ry={7} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="glutes" cx={cxB - 9} cy={112} rx={10} ry={10} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="glutes" cx={cxB + 9} cy={112} rx={10} ry={10} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="hamstrings" cx={cxB - 8} cy={142} rx={8} ry={20} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="hamstrings" cx={cxB + 8} cy={142} rx={8} ry={20} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="calves" cx={cxB - 8} cy={176} rx={7} ry={14} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="calves" cx={cxB + 8} cy={176} rx={7} ry={14} colorOf={colorOf} selected={selected} onPick={onPick} />
    </svg>
  );
}

// Recovery + strength grades — extracted so it can live in the Train tab (was in Progress).
// Owns its own mode/gradeMode/selection state; reads training + sleep data via props.
function RecoveryStrengthSection({ workouts, profile, trainInfo, sleepInfo, advanced }) {
  const [mode, setMode] = useState("recovery"); // recovery | grade
  const [gradeMode, setGradeMode] = useState("relative"); // relative | absolute
  const [sel, setSel] = useState(null);
  const rec = trainInfo.recovery;
  const rank = ranking(workouts, profile, gradeMode);
  const NEUTRAL = "rgba(255,255,255,0.18)"; // dark-theme "no data" muscle fill
  const colorOf = (k) => {
    if (mode === "recovery") return rec[k].lastTs ? recoveryColor(rec[k].fatigue) : NEUTRAL;
    return rank[k].hasData ? rank[k].tier.color : NEUTRAL;
  };
  const selData = sel ? { name: MUSCLES.find(([k]) => k === sel)[1], rec: rec[sel], rank: rank[sel] } : null;
  return (
    <>
      {/* mode toggle */}
      <div style={{ display: "flex", gap: 6, background: C.bg2, padding: 4, borderRadius: 13, marginTop: 14 }}>
        {[["recovery", "Recovery", <RotateCcw size={15} />], ["grade", "Strength grade", <Crown size={15} />]].map(([m, lbl, ic]) => (
          <button key={m} onClick={() => { setMode(m); setSel(null); }} className="sprig-tap"
            style={{ flex: 1, border: "none", cursor: "pointer", padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", background: mode === m ? C.card : "transparent", color: mode === m ? C.lime : C.muted, boxShadow: mode === m ? C.shadow : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{ic}{lbl}</button>
        ))}
      </div>

      {mode === "grade" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[["relative", "My weight class"], ["absolute", "vs Everyone"]].map(([m, lbl]) => (
            <button key={m} onClick={() => setGradeMode(m)} className="sprig-tap"
              style={{ flex: 1, border: `1px solid ${gradeMode === m ? C.green : C.line}`, cursor: "pointer", padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: gradeMode === m ? C.green : C.card, color: gradeMode === m ? "#fff" : C.inkSoft }}>{lbl}</button>
          ))}
        </div>
      )}

      {/* body figure */}
      <div style={{ background: C.card, borderRadius: 20, padding: "16px 10px 10px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
        <BodyFigure colorOf={colorOf} selected={sel} onPick={setSel} />
        {mode === "recovery" ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 4 }}>
            <Legend c={recoveryColor(5)} label="Recovered" />
            <Legend c={recoveryColor(55)} label="Recovering" />
            <Legend c={recoveryColor(95)} label="Fatigued" />
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 9, marginTop: 4, flexWrap: "wrap" }}>
            {TIERS.map((tt) => <Legend key={tt.name} c={tt.color} label={tt.name} />)}
          </div>
        )}
      </div>

      {/* selected detail */}
      {selData && (
        <div className="sprig-pop" style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{selData.name}</div>
          {mode === "recovery" ? (
            selData.rec.lastTs ? (
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
                {selData.rec.recovered
                  ? <span style={{ color: C.greenSoft, fontWeight: 600 }}>Fully recovered — ready to train.</span>
                  : <>~<b style={{ color: recoveryColor(selData.rec.fatigue) }}>{selData.rec.remaining}h</b> until fully recovered{advanced ? ` (${selData.rec.fatigue}% fatigued)` : ""}.</>}
                {advanced && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Last hit with {selData.rec.setCount} sets · {Math.round((Date.now() - selData.rec.lastTs) / 36e5)}h ago.</div>}
              </div>
            ) : <div style={{ fontSize: 13, color: C.muted }}>Not trained recently — fully fresh.</div>
          ) : (
            selData.rank.hasData ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: selData.rank.tier.color }}>{selData.rank.tier.name}</span>
                  <span style={{ fontSize: 12.5, color: C.muted }}>top {Math.max(1, Math.round(100 - selData.rank.pct))}% {gradeMode === "relative" ? "at your bodyweight" : "of everyone"}</span>
                </div>
                {advanced && <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>Best est. 1RM on {MUSCLE_LIFT[sel] || MUSCLE_LIFT_FB[sel]}: {selData.rank.e1}{profile.unit || "kg"}.</div>}
              </div>
            ) : <div style={{ fontSize: 13, color: C.muted }}>Log a {MUSCLE_LIFT[sel] || MUSCLE_LIFT_FB[sel] || "main"} lift to get a grade here.</div>
          )}
        </div>
      )}

      {!advanced && !selData && (
        <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          Tap any muscle to see {mode === "recovery" ? "how recovered it is" : "its strength grade"}.
        </div>
      )}

      {/* full list (advanced only) */}
      {advanced && (<>
      <div style={{ margin: "16px 2px 8px", fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
        {mode === "recovery" ? "Recovery by muscle" : `Strength grade · ${gradeMode === "relative" ? "your weight class" : "vs everyone"}`}
      </div>
      <div style={{ background: C.card, borderRadius: 16, padding: "6px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {MUSCLES.map(([k, n], i) => (
          <div key={k} onClick={() => setSel(k)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < MUSCLES.length - 1 ? `1px solid ${C.line}` : "none", cursor: "pointer" }}>
            <span style={{ width: 11, height: 11, borderRadius: 4, background: colorOf(k), flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: C.inkSoft }}>{n}</span>
            {mode === "recovery" ? (
              <span style={{ fontSize: 12.5, fontWeight: 600, color: rec[k].lastTs ? (rec[k].recovered ? C.greenSoft : recoveryColor(rec[k].fatigue)) : C.muted }}>
                {!rec[k].lastTs ? "fresh" : rec[k].recovered ? "ready" : `${rec[k].remaining}h left`}
              </span>
            ) : (
              rank[k].hasData
                ? <span style={{ fontSize: 12.5, fontWeight: 700, color: rank[k].tier.color }}>{rank[k].estimated ? "~" : ""}{rank[k].tier.name} · top {Math.max(1, Math.round(100 - rank[k].pct))}%</span>
                : <span style={{ fontSize: 11, color: C.muted }}>Not enough data yet</span>
            )}
          </div>
        ))}
      </div>
      </>)}

      {/* weak points / advice */}
      {mode === "grade" && (() => {
        const graded = MUSCLES.filter(([k]) => rank[k].hasData).sort((a, b) => rank[a[0]].pct - rank[b[0]].pct);
        if (!graded.length) return null;
        const weak = graded[0];
        return (
          <div style={{ background: C.bg, borderRadius: 14, padding: "12px 14px", marginTop: 12, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
            <b style={{ color: C.coral }}>Weak point:</b> {weak[1]} ({rank[weak[0]].tier.name}). Add a couple of hard sets here each week to bring it up toward your strongest groups.
          </div>
        );
      })()}

      {mode === "recovery" && trainInfo.deload.stalls.length > 0 && (
        <div style={{ background: "rgba(255,107,95,0.12)", borderRadius: 14, padding: "12px 14px", marginTop: 12, fontSize: 12.5, color: C.coralSoft, lineHeight: 1.5, display: "flex", gap: 10 }}>
          <TrendingDown size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><b>Under-recovery signs:</b> {trainInfo.deload.stalls.join(", ")} {trainInfo.deload.stalls.length === 1 ? "has" : "have"} stalled. Combined with poor sleep, that's the cue to back off before you burn out.</div>
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14, lineHeight: 1.5, padding: "0 8px" }}>
        Grades are estimated from published strength standards (your best est. 1RM vs bodyweight), not a live user database. Recovery blends your training load with your sleep data.
      </div>
    </>
  );
}

function BodyTab({ workouts, profile, trainInfo, sleepInfo, advanced, weightSeries, measureSeries, photoLog, onLogWeight, onSaveMeasurement, onLogPhotoSet, onOpenPhotos, progressPhotosCount }) {
  const [showMeasure, setShowMeasure] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const measureCur = measurementStats(measureSeries);
  const wStats = weightStats(weightSeries);
  const verdict = weightVerdict(wStats, profile.goal);
  const reminder = photoReminder(photoLog);
  const verdictColor = verdict.tag === "good" ? C.greenSoft : verdict.tag === "fast" ? C.coral : verdict.tag === "slow" ? C.amber : C.amber;

  return (
    <div className="sprig-rise">
      {(
        <></>
      )}
      {(
        <>
          {/* WEIGHT card */}
          <div style={{ background: C.card, borderRadius: 20, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>
              <User size={15} color={C.amber} /> Weight
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 32, fontWeight: 700, lineHeight: 1, color: C.ink }}>
                  {wStats.current != null ? `${wStats.current}` : "—"}
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}> kg</span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Latest{wStats.latestDate ? ` · ${wStats.latestDate}` : ""}</div>
              </div>
              {wStats.avg7 != null && (
                <div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: C.inkSoft }}>{wStats.avg7} <span style={{ fontSize: 11, color: C.muted }}>kg</span></div>
                  <div style={{ fontSize: 11, color: C.muted }}>7-day avg</div>
                </div>
              )}
              {wStats.rate != null && (
                <div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: verdictColor }}>{wStats.rate > 0 ? "+" : ""}{wStats.rate} <span style={{ fontSize: 11, color: C.muted }}>kg/wk</span></div>
                  <div style={{ fontSize: 11, color: C.muted }}>Trend {wStats.pctRate != null ? `(${wStats.pctRate > 0 ? "+" : ""}${wStats.pctRate}%/wk)` : ""}</div>
                </div>
              )}
            </div>
            {wStats.current == null && (
              <div style={{ background: C.bg, borderRadius: 11, padding: "11px 13px", marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                No weight logged yet. Weigh in 3–7 mornings (after the bathroom, before food) and a real trend appears here — daily numbers wobble, the average tells the truth.
              </div>
            )}
            {/* sparkline */}
            {weightSeries.length >= 2 && (() => {
              const ws = [...weightSeries].sort((a, b) => a.date.localeCompare(b.date)).slice(-21);
              const W = 320, H = 50, p = 4;
              const max = Math.max(...ws.map((s) => s.kg)), min = Math.min(...ws.map((s) => s.kg));
              const range = max - min || 1;
              const x = (i) => p + (i / (ws.length - 1)) * (W - 2 * p);
              const y = (kg) => p + (1 - (kg - min) / range) * (H - 2 * p);
              const path = ws.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s.kg).toFixed(1)}`).join(" ");
              return (
                <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 50, display: "block", marginTop: 12 }} preserveAspectRatio="none">
                  <path d={path} fill="none" stroke={C.amber} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
                  {ws.map((s, i) => <circle key={i} cx={x(i)} cy={y(s.kg)} r="2" fill={C.amber} />)}
                </svg>
              );
            })()}
            {/* goal verdict */}
            <div style={{ fontSize: 12, color: verdictColor, marginTop: 10, lineHeight: 1.5, fontWeight: 500 }}>
              {profile.goal === "gain" ? "🌿 Lean bulk: " : profile.goal === "lose" ? "🔥 Cut: " : "⚖️ Maintain: "}{verdict.text}
            </div>
            {/* weigh-in */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 12, color: C.muted }}>Weigh in</span>
              <input value={weightInput} onChange={(e) => setWeightInput(e.target.value)} inputMode="decimal" placeholder={wStats.current != null ? String(wStats.current) : "kg"}
                style={{ width: 70, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 4px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg, color: C.ink }} />
              <button className="sprig-tap" disabled={!weightInput} onClick={() => { onLogWeight(parseFloat(weightInput)); setWeightInput(""); }}
                style={{ ...btn(weightInput ? C.green : C.bg2, weightInput ? "#fff" : C.muted), padding: "8px 14px", fontSize: 13 }}><Check size={14} /> Save</button>
              <span style={{ fontSize: 10.5, color: C.muted, marginLeft: "auto" }}>Best: same time, after waking, same clothes</span>
            </div>
          </div>

          {/* MEASUREMENTS */}
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                <Target size={15} color={C.greenSoft} /> Body measurements
              </div>
              <button className="sprig-tap" onClick={() => setShowMeasure((s) => !s)} style={{ ...btn(C.bg2, C.green), padding: "6px 11px", fontSize: 12, borderRadius: 10 }}>
                {showMeasure ? "Close" : (Object.keys(measureCur).length ? "Update" : "Add")}
              </button>
            </div>
            {Object.keys(measureCur).length === 0 && !showMeasure && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 9, lineHeight: 1.5 }}>
                Track waist, chest, shoulders, arms, thighs, calves, and neck monthly — measurements reveal recomposition that the scale hides.
              </div>
            )}
            {Object.keys(measureCur).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px", marginTop: 12 }}>
                {MEASURE_KEYS.map(([k, lbl]) => {
                  const m = measureCur[k]; if (!m) return null;
                  const upCol = m.change == null ? C.muted : m.change > 0 ? C.greenSoft : C.coral;
                  return (
                    <div key={k} style={{ background: C.bg, borderRadius: 11, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: C.muted }}>{lbl}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
                        {m.change != null && <span style={{ fontSize: 11, color: upCol, fontWeight: 600, marginLeft: "auto" }}>{m.change > 0 ? "+" : ""}{m.change}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {showMeasure && (
              <MeasurementForm current={measureCur} onSave={(m) => { onSaveMeasurement(m); setShowMeasure(false); }} onClose={() => setShowMeasure(false)} />
            )}
          </div>

          {/* PROGRESS PHOTOS */}
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>
              <Camera size={15} color="#7A6FB0" /> Progress photos
            </div>
            <div style={{ fontSize: 12, color: reminder.due ? C.coral : C.muted, marginTop: 7, lineHeight: 1.5, fontWeight: reminder.due ? 600 : 400 }}>
              {reminder.text}
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
              {PHOTO_KINDS.map(([k, lbl]) => {
                const lastSet = photoLog.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
                const tookToday = lastSet && lastSet.date === new Date().toLocaleDateString("en-CA") && lastSet.kinds.includes(k);
                return (
                  <button key={k} className="sprig-tap" onClick={() => onLogPhotoSet([k])}
                    style={{ flex: 1, border: `1px solid ${tookToday ? C.greenSoft : C.line}`, background: tookToday ? C.green + "14" : C.bg, padding: "11px 0", borderRadius: 11, cursor: "pointer", fontFamily: "DM Sans", color: C.ink }}>
                    {tookToday ? <Check size={16} color={C.green} /> : <Plus size={16} color={C.muted} />}
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{lbl}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
              Same light, same pose, same time of day. Photos stay on your device — tap to mark each angle as taken.
            </div>
            {onOpenPhotos && (
              <button className="sprig-tap" onClick={onOpenPhotos}
                style={{ width: "100%", background: C.bg2, border: "none", cursor: "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12.5, fontWeight: 600, color: C.green, fontFamily: "DM Sans", marginTop: 10 }}>
                <Camera size={13} /> Store &amp; compare photos {progressPhotosCount ? `· ${progressPhotosCount}` : ""}
              </button>
            )}
          </div>

          {/* tiny strength-to-bw badge if data exists */}
          {wStats.current && workouts.length > 0 && (() => {
            const benchBest = bestE1RMForLift(workouts, "bench");
            if (benchBest <= 0) return null;
            const ratio = +(benchBest / wStats.current).toFixed(2);
            return (
              <div style={{ background: C.card, borderRadius: 14, padding: "12px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <Trophy size={16} color={C.amber} />
                <div style={{ flex: 1, fontSize: 12.5, color: C.inkSoft }}>
                  <b>Bench × bodyweight:</b> {ratio}× — {ratio >= 1.5 ? "advanced" : ratio >= 1.2 ? "intermediate" : ratio >= 0.9 ? "novice" : "beginner"}.
                </div>
              </div>
            );
          })()}
          <div style={{ height: 10 }} />
        </>
      )}

    </div>
  );
}
