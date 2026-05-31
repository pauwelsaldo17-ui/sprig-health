import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera, ScanLine, PencilLine, Home, BookMarked, TrendingUp, User,
  Plus, Check, X, Loader2, Sparkles, Trash2, Minus, RotateCcw, Flame, Pill,
  Moon, Sun, BedDouble, AlarmClock, Dumbbell, EyeOff, Zap, Clock, Coffee,
  Activity, MoonStar, ChevronRight, Mic, MicOff,
  Timer, Trophy, Medal, BarChart3, ChevronLeft, ChevronDown, Award, Crown,
  Target, BookOpen, Calculator, Repeat, Gauge, Play, PersonStanding, Square,
  ArrowUp, HeartPulse, Search, TrendingDown
} from "lucide-react";

/* ----------------------------------------------------------------
   SPRIG — a free, AI-powered nutrition tracker
   Photo / label / text logging · remembers described meals ·
   macros + micronutrients · functional health scores
-----------------------------------------------------------------*/

const C = {
  bg: "#F6F1E7",
  bg2: "#EFE8D9",
  card: "#FFFDF8",
  ink: "#1C2B22",
  inkSoft: "#4A5B50",
  muted: "#8A968C",
  line: "#E4DCCB",
  green: "#23543A",
  greenSoft: "#3E7B53",
  leaf: "#6BAE78",
  coral: "#E0714A",
  coralSoft: "#F0A07F",
  amber: "#D9A23C",
  shadow: "0 1px 0 rgba(0,0,0,.02), 0 8px 24px rgba(28,43,34,.06)",
};

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes rise { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
@keyframes pop { 0%{transform:scale(.96);opacity:0;} 100%{transform:scale(1);opacity:1;} }
.sprig-rise { animation: rise .35s cubic-bezier(.2,.7,.2,1) both; }
.sprig-pop { animation: pop .25s cubic-bezier(.2,.7,.2,1) both; }
.sprig-tap { transition: transform .12s ease, background .15s ease, box-shadow .15s ease; -webkit-tap-highlight-color: transparent; }
.sprig-tap:active { transform: scale(.97); }
.sprig-scroll::-webkit-scrollbar{width:0;height:0;}
/* Mobile / PWA baseline — prevents horizontal scroll, honors iOS safe areas, lets the app fill the screen on phones */
html, body, #root { margin: 0; padding: 0; min-height: 100%; background: #F6F1E7; overscroll-behavior: none; }
body { -webkit-text-size-adjust: 100%; }
.sprig-app-frame {
  max-width: 440px;
  margin: 0 auto;
  min-height: 100vh;
  min-height: 100dvh;
  padding-bottom: env(safe-area-inset-bottom, 0);
  padding-top: env(safe-area-inset-top, 0);
  position: relative;
}
.sprig-bottom-pad { height: calc(env(safe-area-inset-bottom, 0px) + 8px); }
/* On phones, drop the rounded outer corners — the "app" should fill the whole screen */
@media (max-width: 480px) {
  .sprig-app-frame { border-radius: 0 !important; box-shadow: none !important; }
}
input, textarea, select, button { font-family: inherit; font-size: 16px; }
/* Bottom sheets/toasts need the inset baked in so they don't sit under the home indicator */
.sprig-bottom-toast { bottom: calc(76px + env(safe-area-inset-bottom, 0px)) !important; }
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
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------- data version + safe parsing -------------- */
const DATA_VERSION = 2; // bump when schema needs migration

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
const DEFAULT_ALARM = { latest: "07:00", window: 30, enabled: true };
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
function calorieAdjustment({ daily, profile, targets, trainedToday }) {
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
  let delta = stepDelta + cardioK;
  delta = Math.round(delta / 10) * 10;
  if (steps === 0 && !cardioK) return null;
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
  return { delta, stepDelta, cardioK, adjustedTargetCalories, adjMaintenance: adjustedTargetCalories, text };
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
    MICRO_KEYS.forEach(([k]) => (t.micros[k] += (e.micros?.[k] || 0) * m));
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
  const microVals = MICRO_KEYS.map(([k]) => Math.min(100, (e.micros?.[k] || 0) * m));
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
  const recent = logs.slice(-14);
  let debt = 0;
  recent.forEach((l) => { debt += needMin - l.durationMin; });
  return Math.max(0, Math.min(40 * 60, debt));
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
function ranking(workouts, profile, mode) { // mode: 'relative' | 'absolute'
  const bw = profile.weight || 80, sf = sexFactor(profile.sex), abw = avgBW(profile.sex);
  const out = {};
  MUSCLES.forEach(([k]) => {
    const liftKey = MUSCLE_LIFT[k] || MUSCLE_LIFT_FB[k];
    if (!liftKey) { out[k] = { hasData: false, liftKey: null }; return; }
    const e1 = bestE1RMForLift(workouts, liftKey);
    if (!e1) { out[k] = { hasData: false, liftKey }; return; }
    const anchors = STD[liftKey].map((r) => r * sf);
    const pct = Math.max(1, Math.min(99.9, mode === "relative" ? pctFromAnchors(e1 / bw, anchors) : pctFromAnchors(e1 / abw, anchors)));
    out[k] = { hasData: true, pct: Math.round(pct), tier: tierFor(pct), e1: Math.round(e1), liftKey };
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
  if (rir >= 3) { w += inc; note = "had reps in reserve — add weight"; }
  else if (rir === 2) { reps = top.reps + 1; note = "one more rep, then add weight next time"; }
  else if (rir === 1) { note = "hold weight, nail the same reps clean"; }
  else { w = Math.round((top.w * 0.95) * 2) / 2; note = "you hit failure — small back-off to recover"; }
  return { w: Math.round(w * 2) / 2, reps, prevW: top.w, prevReps: top.reps, prevRir: top.rir, note };
}
function exLastBest(workouts, exName) {
  let best = 0, bestSet = null;
  workouts.forEach((w) => w.exercises.forEach((ex) => { if (ex.name === exName) ex.sets.forEach((s) => { const e = est1RM(s.w, s.reps); if (e > best) { best = e; bestSet = s; } }); }));
  return { best, bestSet };
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
function progressionFor(workouts, exName, daily, sleepReadiness) {
  const sets = [];
  workouts.forEach((w) => w.exercises.forEach((ex) => { if (ex.name === exName) ex.sets.forEach((s) => sets.push({ ...s, ts: w.ts })); }));
  if (sets.length === 0) return null;
  const last = sets[sets.length - 1];
  const meta = findEx(exName);
  const heavy = meta?.type === "compound" && meta?.bar;
  const stalls = stallingLifts(workouts).includes(exName);
  // recovery / sleep guardrail
  if (sleepReadiness < 45) return { action: "hold", text: "Hold weight — sleep readiness is low today.", w: last.w, reps: last.reps };
  if ((daily?.checkin?.pain) === "serious") return { action: "hold", text: "Hold weight — pain logged today.", w: last.w, reps: last.reps };
  if (stalls) return { action: "deload", text: "Stalled for 3 sessions — drop ~10% for a week, then build back up.", w: +(last.w * 0.9).toFixed(1), reps: last.reps };
  if (last.rir == null || last.rir >= 3) return { action: "add_w", text: "Last set felt easy — add weight.", w: +(last.w + (heavy ? 2.5 : 1.25)).toFixed(2), reps: last.reps };
  if (last.rir === 2) return { action: "add_rep", text: "One more rep this session, then add weight next time.", w: last.w, reps: last.reps + 1 };
  if (last.rir === 1) return { action: "repeat", text: "Repeat the same weight — close to your limit.", w: last.w, reps: last.reps };
  return { action: "back_off", text: "Hit failure last time — repeat or back off slightly.", w: last.w, reps: Math.max(1, last.reps - 1) };
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
  // nutrition: protein + calorie proximity + fiber
  const protP = targets.protein ? Math.min(1, t.protein / targets.protein) : 0;
  const calRatio = targets.calories ? t.calories / targets.calories : 0;
  const calScore = calRatio === 0 ? 0 : calRatio <= 1 ? 60 + calRatio * 40 : Math.max(50, 100 - (calRatio - 1) * 120);
  const fiberP = targets.fiber ? Math.min(1, t.fiber / targets.fiber) : 0;
  const nutrition = clamp100(protP * 55 + (calScore / 100) * 30 + fiberP * 15);

  // sleep: last night score adjusted for debt; null if no data
  const sleep = sleepInfo.lastSleep
    ? clamp100(sleepInfo.lastSleep.score - sleepInfo.debtMin / 36)
    : null;

  // training/recovery readiness
  const training = clamp100(trainInfo.bodyReadiness);

  // movement: steps + (a workout today counts)
  const stepP = Math.min(1, (daily.steps || 0) / STEPS_TARGET);
  const movement = clamp100(stepP * 80 + (trainedToday ? 20 : 0));

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
  const resp = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "text", prompt, system }),
  });
  if (!resp.ok) throw new Error("AI proxy " + resp.status);
  const data = await resp.json();
  return (data.text || "").trim();
}

/* ---------------- local (offline) coach engine — used when the AI API isn't reachable -------------- */
// Pattern-matches the user's question and assembles a structured answer from their data summary.
function localCoachAnswer(question, ctx, profile, targets) {
  const q = (question || "").toLowerCase();
  const lines = [];
  const goal = profile?.goal || "maintain";
  const calGap = (ctx?.calAvg != null && targets?.calories) ? Math.round(ctx.calAvg - targets.calories) : null;
  const proteinGap = (ctx?.protAvg != null && targets?.protein) ? Math.round(targets.protein - ctx.protAvg) : null;
  const sleepHr = ctx?.sleepAvg != null ? +(ctx.sleepAvg / 60).toFixed(1) : null;
  const sleepShort = sleepHr != null && sleepHr < 7;

  const hasData = ctx?.calAvg != null || ctx?.weeklyWk > 0 || ctx?.weightRate != null;
  if (!hasData) {
    return "I don't have enough of your data to answer yet. Log a few days of food, a couple of workouts, and weigh in 2–3 mornings — then ask again and I can be specific.";
  }

  // Topic detection
  const askingStall = /(stall|stuck|plateau|not going up|not improving|not progress)/.test(q);
  const askingMuscle = /(gain|build|muscle|bigger|grow|mass)/.test(q);
  const askingFat = /(fat|cut|lose|weight loss|leaner)/.test(q);
  const askingCut = /(cut|bulk|maintain|surplus|deficit|recomp)/.test(q);
  const askingSleep = /(sleep|tired|fatigue|recover|rested)/.test(q);
  const askingWeek = /(this week|improve|focus|priority|next week)/.test(q);

  // Common diagnosis path
  const why = [];
  if (calGap != null) {
    if (goal === "gain" && calGap < -150) why.push(`You're eating ~${Math.abs(calGap)} kcal under your gain target — not enough fuel for new tissue.`);
    if (goal === "lose" && calGap > 150) why.push(`You're eating ~${calGap} kcal over your cut target — the deficit is too small.`);
  }
  if (proteinGap != null && proteinGap > 20) why.push(`Protein is averaging ~${proteinGap}g below target — protein synthesis is capped without it.`);
  if (sleepShort) why.push(`Sleep is averaging ${sleepHr}h — under-recovery dulls strength and recovery.`);
  if (ctx?.weeklyWk != null && ctx.weeklyWk < 3) why.push(`Only ${ctx.weeklyWk} workout${ctx.weeklyWk === 1 ? "" : "s"} this week — frequency is the lever here.`);
  if (ctx?.stalls?.length) why.push(`Stalled lifts: ${ctx.stalls.slice(0, 2).join(", ")}. Deload that lift ~10% then rebuild.`);
  if (ctx?.painActive) why.push("Active pain is likely capping intensity — train around it and the rest will come back.");
  if (ctx?.weightRate != null && goal === "gain" && ctx.weightRate < 0.05) why.push(`Bodyweight is flat (${ctx.weightRate > 0 ? "+" : ""}${ctx.weightRate} kg/wk) — no surplus is landing.`);
  if (ctx?.weightRate != null && goal === "lose" && ctx.weightRate > -0.1) why.push(`Bodyweight isn't dropping (${ctx.weightRate > 0 ? "+" : ""}${ctx.weightRate} kg/wk) — the deficit is too small or NEAT dropped.`);

  // What's going well
  const good = [];
  if (ctx?.weeklyWk >= 3) good.push("training is consistent");
  if (proteinGap != null && proteinGap <= 5) good.push("protein is on point");
  if (sleepHr != null && sleepHr >= 7) good.push("sleep is solid");

  if (askingStall || askingMuscle || askingFat || askingCut) {
    if (askingStall && !why.length) {
      lines.push("Nothing obvious is blocking you in the data I can see. Stalls of 1–3 weeks happen even when everything is right.");
      lines.push("Three things to try: log a working set on video to check form, swap the stalled lift for a close variant for 2 weeks, and make sure you're sleeping 7+ hours.");
    } else if (why.length) {
      lines.push(`Most likely cause: ${why[0]}`);
      if (why.length > 1) lines.push(`Also working against you: ${why.slice(1, 3).join(" ")}`);
      // suggested fix
      if (calGap != null && goal === "gain" && calGap < -150) lines.push(`Action: add ${Math.min(300, Math.abs(calGap))} kcal/day this week and recheck weight in 7 days.`);
      else if (calGap != null && goal === "lose" && calGap > 150) lines.push(`Action: trim ${Math.min(200, calGap)} kcal/day or add 2–3k steps. Recheck in 7 days.`);
      else if (proteinGap != null && proteinGap > 20) lines.push(`Action: add a ${Math.round(proteinGap)}g protein source per day (e.g. a shake or 100g extra chicken).`);
      else if (sleepShort) lines.push(`Action: bed 30 min earlier most nights this week.`);
      else if (ctx?.stalls?.length) lines.push(`Action: deload ${ctx.stalls[0]} ~10% and add a rep before adding weight back.`);
    } else {
      lines.push("The fundamentals look fine. Be patient — strength and weight changes show in 2–4 week windows, not day to day.");
    }
    if (good.length) lines.push(`Going well: ${good.join(", ")}.`);
    return lines.join("\n\n");
  }

  if (askingSleep) {
    if (sleepHr == null) return "I don't have sleep data yet. Log a few nights and I can tell you what to adjust.";
    if (sleepShort) lines.push(`Your average is ${sleepHr}h — that's under what your body needs for full recovery.`);
    else lines.push(`Your average sleep is ${sleepHr}h — that's in the right range.`);
    lines.push("To improve quality without changing duration: cut caffeine 8h before bed, keep the room cool and dark, and aim for a consistent bedtime (±30 min).");
    if (ctx?.weightRate != null && goal === "gain" && sleepShort) lines.push("Sleep matters more on a bulk than people think — most muscle growth happens overnight.");
    return lines.join("\n\n");
  }

  if (askingWeek) {
    const priorities = [];
    if (calGap != null && Math.abs(calGap) > 150) priorities.push(calGap < 0 ? "eat closer to your calorie target" : "tighten your calorie target");
    if (proteinGap != null && proteinGap > 20) priorities.push("hit your protein target more days");
    if (sleepShort) priorities.push("get 30 minutes more sleep most nights");
    if (ctx?.weeklyWk < 3) priorities.push("get to 3+ workouts this week");
    if (ctx?.painActive) priorities.push("train around your pain and rest the area");
    if (!priorities.length) return "Keep doing what you're doing. Consistency over time beats any single tweak.";
    lines.push(`Pick one: ${priorities[0]}.`);
    if (priorities.length > 1) lines.push(`Next priorities if you have room: ${priorities.slice(1, 3).join(", then ")}.`);
    lines.push("Don't try to fix everything at once — one focused change per week sticks better.");
    return lines.join("\n\n");
  }

  // Generic fallback
  if (why.length) {
    lines.push(`Looking at your data, the standout issue is: ${why[0]}`);
    lines.push(why.length > 1 ? `Other contributing factors: ${why.slice(1, 3).join(" ")}` : "");
    if (good.length) lines.push(`What's working: ${good.join(", ")}.`);
  } else {
    lines.push("Your data looks balanced. Be specific — ask me about a particular lift, day, or goal and I can pinpoint better.");
  }
  return lines.filter(Boolean).join("\n\n");
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

/* ---------------- result / edit card -------------- */
function ResultCard({ result, onAdd, onCancel, mode, isSupp }) {
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
          <Check size={16} /> {isSupp ? "Add to my stack" : <>Add to today{mode === "text" ? " · save meal" : ""}</>}
        </button>
      </div>
    </div>
  );
}

/* ---------------- main app -------------- */
const DEFAULT_PROFILE = { sex: "male", age: 18, weight: 72, height: 178, activity: "active", goal: "gain", experience: "beginner", focus: "gym", mode: "simple" };

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

function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ intent: null, sex: null, age: "", height: "", weight: "", activity: null, experience: null, focus: null, unit: "kg" });
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));

  const steps = [
    { key: "intent",    title: "What's your main goal?",      sub: "We'll tune everything around this." },
    { key: "sex",       title: "Sex",                          sub: "Used to estimate your calorie needs." },
    { key: "stats",     title: "A few basics",                 sub: "Age, height, and weight — for accurate targets." },
    { key: "activity",  title: "How active are you?",          sub: "Day-to-day movement and training." },
    { key: "experience",title: "Training experience",          sub: "So strength grades and progression fit you." },
    { key: "focus",     title: "Main focus",                   sub: "What you care about most right now." },
  ];
  const cur = steps[step];
  const last = step === steps.length - 1;

  const canNext = () => {
    switch (cur.key) {
      case "intent": return !!p.intent;
      case "sex": return !!p.sex;
      case "stats": return p.age && p.height && p.weight;
      case "activity": return !!p.activity;
      case "experience": return !!p.experience;
      case "focus": return !!p.focus;
      default: return true;
    }
  };
  const finish = async () => {
    const g = ONB_GOALS.find((x) => x.id === p.intent);
    await onDone({
      sex: p.sex, age: +p.age, height: +p.height, weight: +p.weight,
      activity: p.activity, goal: g.goal, intent: p.intent,
      experience: p.experience, focus: p.focus, unit: p.unit, mode: "simple",
    });
  };

  const Opt = ({ on, onClick, children, sub }) => (
    <button className="sprig-tap" onClick={onClick}
      style={{ width: "100%", textAlign: "left", border: `1.5px solid ${on ? C.green : C.line}`, background: on ? C.green + "0d" : C.card, cursor: "pointer",
        borderRadius: 14, padding: "14px 16px", fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 12, boxShadow: on ? "none" : C.shadow }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: C.ink }}>{children}</div>
        {sub && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ width: 22, height: 22, borderRadius: 99, border: `2px solid ${on ? C.green : C.line}`, background: on ? C.green : "transparent", display: "grid", placeItems: "center", flexShrink: 0 }}>
        {on && <Check size={13} color="#fff" />}
      </div>
    </button>
  );

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
          <div style={{ marginLeft: "auto", fontSize: 11.5, color: C.muted }}>{step + 1} of {steps.length}</div>
        </div>
        {/* progress */}
        <div style={{ display: "flex", gap: 4 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? C.green : C.bg2, transition: "background .3s" }} />
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

          {cur.key === "focus" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ONB_FOCUS.map(([k, lbl, emoji]) => (
                <Opt key={k} on={p.focus === k} onClick={() => set("focus", k)}>{emoji}  {lbl}</Opt>
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
          style={{ ...btn(canNext() ? C.green : C.bg2, canNext() ? "#fff" : C.muted), flex: 1, padding: "14px 0", fontSize: 15 }}>
          {last ? "Start using Sprig" : "Continue"} {!last && <ChevronRight size={17} />}
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
  const [quickOpen, setQuickOpen] = useState(false);
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
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [resultMode, setResultMode] = useState("photo");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [composer, setComposer] = useState(null); // 'text' | 'supp' | null
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
  // pain logs: structured entries beyond the daily check-in
  const [painLogs, setPainLogs] = useState([]);              // [{id, ts, date, level, location, type, note, exercise, status}]
  // mind & habits
  const [habitConfig, setHabitConfig] = useState(null);     // {custom:[{id,label}], hidden:[ids]} — null until loaded
  const [habitDone, setHabitDone] = useState({});           // manual completion: { "<date>": [habitId,...] }
  const [focusSessions, setFocusSessions] = useState([]);   // [{id, ts, date, minutes, label}]
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
  const date = todayStr();

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
        const rm = await store.get("sprig_reminders_v1");
        const pp = await store.get("sprig_progress_photos_v1");

        // Parse everything with safe defaults — any corrupt key falls back to default
        const profileParsed = safeParse(p, null, asObject);
        if (profileParsed) { setProfile(migrateProfile(profileParsed, DEFAULT_PROFILE)); setOnboarded(true); }
        setLibrary(safeParse(lib, [], asArray));
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
        setPainLogs(safeParse(pn, [], asArray));
        setHabitConfig(migrateHabitCfg(safeParse(hc, null)));
        setHabitDone(safeParse(hd, {}, asObject));
        setFocusSessions(safeParse(fs, [], asArray));
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
      const statics = ["sprig_profile_v1", "sprig_meals_v1", "sprig_history_v1", "sprig_supps_v1", "sprig_sleep_v1", "sprig_alarm_v1", "sprig_workouts_v1", "sprig_rests_v1", "sprig_routines_v1", "sprig_weightseries_v1", "sprig_measure_v1", "sprig_photos_v1", "sprig_health_v1", "sprig_pain_v1", "sprig_habitcfg_v1", "sprig_habitdone_v1", "sprig_focus_v1"];
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
  const persistDaily = useCallback(async (patch) => {
    const next = { ...daily, ...patch };
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
  const setCheckin = (k, v) => persistDaily({ checkin: { ...daily.checkin, [k]: v } });

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
    // Skip the network entirely if we know we're offline — the rule-based coach is always available.
    if (!online) return localCoachAnswer(question, ctx, profile, targets);
    const summary = JSON.stringify({
      goal: profile?.goal, weight: profile?.weight, recentCalAvg: ctx?.calAvg, proteinAvg: ctx?.protAvg,
      avgSleepMin: ctx?.sleepAvg, weeklyWorkouts: ctx?.weeklyWk, stalledLifts: ctx?.stalls, painActive: ctx?.painActive,
      weightTrendKgPerWeek: ctx?.weightRate,
    });
    const prompt = `Reply in 3–5 short paragraphs. Be direct, specific, and kind. No medical advice, no diagnosis. If data is thin, say so. User's question: "${question}". Their data summary: ${summary}.`;
    try {
      const r = await analyzeText({ prompt });
      if (r && r.trim()) return r;
    } catch (e) { /* fall through to local engine */ }
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
      micros: Object.fromEntries(MICRO_KEYS.map(([k]) => [k, Math.round((r.micros?.[k] || 0) * m)])),
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
  const saveAlarm = async (a) => { setAlarm(a); await store.set("sprig_alarm_v1", JSON.stringify(a)); };

  function saveSleepLog({ bedTs, wakeTs, restlessness, source }) {
    const durationMin = Math.max(0, Math.round((wakeTs - bedTs) / 60000));
    const need = sleepNeedMin(profile.age);
    const usualBed = circMean(sleepLogs.slice(-7).map((l) => tsToMin(l.bedtime)));
    const log = {
      id: uid(), date: new Date(wakeTs).toLocaleDateString("en-CA"),
      bedtime: bedTs, waketime: wakeTs, durationMin,
      restlessness: Math.round(restlessness ?? 30),
      stages: estimateStages(durationMin, restlessness ?? 30),
      score: scoreSleep({ durationMin, restlessness: restlessness ?? 30, bedMin: tsToMin(bedTs) }, need, usualBed),
      source: source || "manual",
    };
    const next = [...sleepLogs.filter((l) => l.date !== log.date), log].sort((a, b) => a.waketime - b.waketime).slice(-30);
    persistSleep(next);
    return log;
  }
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
    const ac = ensureAudio(); if (!ac) return;
    const gain = ac.createGain(); gain.gain.value = 0; gain.connect(ac.destination);
    const o1 = ac.createOscillator(); o1.type = "sine"; o1.frequency.value = 523.25;
    const o2 = ac.createOscillator(); o2.type = "sine"; o2.frequency.value = 659.25;
    o1.connect(gain); o2.connect(gain); o1.start(); o2.start();
    // gentle pulsing swell
    let up = true;
    const pulse = setInterval(() => {
      const now = ac.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(up ? 0.22 : 0.02, now + 0.9);
      up = !up;
    }, 950);
    gain.gain.linearRampToValueAtTime(0.18, ac.currentTime + 1.2);
    alarmRef.current = { o1, o2, gain, pulse };
  }
  function stopAlarmSound() {
    const a = alarmRef.current; if (!a) return;
    clearInterval(a.pulse);
    try { a.o1.stop(); a.o2.stop(); } catch (e) {}
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
        const { wakeMin } = smartWake(cur.bedTs, hmToMin(alarm.latest), alarm.window);
        const latest = hmToMin(alarm.latest);
        const asleepMin = (Date.now() - cur.bedTs) / 60000;
        // ring at predicted light phase within window, or at latest fallback; require >=3h asleep
        if (asleepMin > 180 && (circDiff(nowMin, wakeMin) <= 1 || circDiff(nowMin, latest) <= 1)) {
          triggerWake();
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
  }
  function addWoExercise(name) {
    const meta = findEx(name);
    persistActive({ ...activeWorkout, exercises: [...activeWorkout.exercises, { name, group: meta?.group, sets: [] }] });
  }
  function woLogSet(exIdx, set) {
    const ex = activeWorkout.exercises.map((e, i) => i === exIdx ? { ...e, sets: [...e.sets, { ...set, ts: Date.now() }] } : e);
    persistActive({ ...activeWorkout, exercises: ex });
  }
  function woRemoveSet(exIdx, setIdx) {
    const ex = activeWorkout.exercises.map((e, i) => i === exIdx ? { ...e, sets: e.sets.filter((_, j) => j !== setIdx) } : e);
    persistActive({ ...activeWorkout, exercises: ex });
  }
  function woRemoveExercise(exIdx) {
    persistActive({ ...activeWorkout, exercises: activeWorkout.exercises.filter((_, i) => i !== exIdx) });
  }
  function finishWorkout() {
    const done = (activeWorkout?.exercises || []).filter((e) => e.sets.length);
    if (done.length) {
      const w = { id: uid(), date: todayStr(), ts: Date.now(), durationMin: Math.max(1, Math.round((Date.now() - activeWorkout.startTs) / 60000)), exercises: done };
      persistWorkouts([...workouts, w].slice(-300));
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
  }
  function cancelWorkout() { persistActive(null); }
  function woSetExercisePain(exIdx, level) {
    const ex = activeWorkout.exercises.map((e, i) => i === exIdx ? { ...e, pain: level } : e);
    persistActive({ ...activeWorkout, exercises: ex });
  }

  async function runAnalysis(opts) {
    setError(""); setBusy(true); setComposer(null);
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
      micros: r.micros, omega3: r.omega3, mult: r.mult || 1, time: Date.now(),
    };
    persistEntries((prev) => [...prev, entry]);
    // remember text-described meals automatically
    if (resultMode === "text") {
      const exists = library.some((l) => l.name.toLowerCase() === r.name.toLowerCase());
      if (!exists) persistLibrary([{ ...entry, id: uid(), mult: 1 }, ...library].slice(0, 60));
    }
    setResult(null);
    setTab("today");
  }

  function logFromLibrary(meal) {
    const entry = { ...meal, id: uid(), mult: 1, time: Date.now() };
    persistEntries((prev) => [...prev, entry]);
    setTab("today");
  }
  function addManual(m) {
    const entry = {
      id: uid(), name: m.name || "Quick entry", serving: "manual",
      calories: +m.calories || 0, protein_g: +m.protein || 0, carbs_g: +m.carbs || 0,
      fat_g: +m.fat || 0, fiber_g: +m.fiber || 0, micros: {}, omega3: null, mult: 1, time: Date.now(),
    };
    persistEntries((prev) => [...prev, entry]);
    setComposer(null);
    setTab("today");
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
  const trainedToday = workouts.some((w) => new Date(w.ts).toLocaleDateString("en-CA") === date);
  const suggestion = suggestSplit({ workouts, recovery, volume, sleepReadiness, debtMin, daily, trainedToday, routines });
  trainInfo.suggestion = suggestion;
  const subScores = dailyScores({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile });
  const healthScore = dailyHealthScore(subScores);
  const actions = bestActions({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile });
  const dailyInfo = { daily, weightSeries, subScores, healthScore, actions, trainedToday };

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
  const mindInfo = {
    checkin: daily.checkin || {}, habits: habitsTodayState, consistency,
    focusToday, focusWeek, focusMinutesToday: focusToday.reduce((a, f) => a + f.minutes, 0),
    hiddenDefaults: (habitConfig?.hidden || []).map((id) => DEFAULT_HABITS.find((h) => h.id === id)).filter(Boolean),
  };

  // rule-based coach (no AI) — synthesizes everything above into 4 cards
  const coach2 = coachReport({ t, targets, sleepInfo, trainInfo, nutriInfo, dailyInfo, daily, profile, workouts });

  // weekly report (rule-based)
  const report = weeklyReport({ history, workouts, sleepLogs, weightSeries, daily, dailyHistory, painLogs, focusSessions, consistency, targets, profile, sleepInfo });

  // movement + dynamic calorie adjustment + progress diagnosis
  const movement = movementSummary({ daily, profile, trainedToday });
  const calAdjust = calorieAdjustment({ daily, profile, targets, trainedToday });
  const diagnosis = progressDiagnosis({ workouts, weightSeries, history, sleepLogs, sleepInfo, targets, profile, dailyHistory, painLogs, daily });
  const hydration = smartHydration({ daily, profile, sleepInfo, workouts, trainedToday });
  const sedentary = sedentaryNote(daily?.sedentary);
  const sport = sportAdvice({ profile, daily, sportLog: daily?.sportLog, painLogs });
  const moveInfo = { movement, calAdjust, diagnosis, hydration, sedentary, sport, stepGoal: stepGoal(profile) };
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
    return <Onboarding onDone={async (p) => { await saveProfile(p); setOnboarded(true); setTab("today"); }} />;
  }

  return (
    <div className="sprig-app-frame" style={{ background: C.bg, fontFamily: "DM Sans, sans-serif", color: C.ink, position: "relative", overflow: "hidden", borderRadius: 24 }}>
      <style>{FONTS}</style>

      {/* alarm ring overlay */}
      {ringing && (
        <div className="sprig-pop" style={{ position: "absolute", inset: 0, zIndex: 50, background: "linear-gradient(160deg,#1C2B22,#2C4636)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", padding: 30 }}>
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
          <button className="sprig-tap" onClick={() => { setTab("trends"); setResult(null); setComposer(null); }}
            title="Trends" aria-label="Trends" style={{ background: tab === "trends" ? C.green : C.bg2, color: tab === "trends" ? "#fff" : C.inkSoft, border: "none", cursor: "pointer", width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center" }}>
            <TrendingUp size={18} />
          </button>
          <button className="sprig-tap" onClick={() => { setTab("me"); setResult(null); setComposer(null); }}
            title="Me &amp; settings" aria-label="Me and settings" style={{ background: tab === "me" ? C.green : C.bg2, color: tab === "me" ? "#fff" : C.inkSoft, border: "none", cursor: "pointer", width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center" }}>
            <User size={18} />
          </button>
        </div>
      </div>

      <div className="sprig-scroll" style={{ height: 470, overflowY: "auto", padding: "8px 16px 18px" }}>
        {tab === "today" && (
          <TodayTab
            t={t} targets={targets} entries={entries} scores={scores} onRemove={removeEntry}
            library={library} onQuick={logFromLibrary} profile={profile}
            supps={supps} takenIds={takenIds} onToggleSupp={toggleTaken} onRemoveSupp={removeSupp}
            onAddSupp={() => { setComposer("supp"); setResult(null); }}
            sleepInfo={sleepInfo} trainInfo={trainInfo} advanced={advanced}
            dailyInfo={dailyInfo} nutriInfo={nutriInfo} healthInfo={healthInfo} mindInfo={mindInfo} moveInfo={moveInfo} onDaily={persistDaily} onAddEntry={addEntry} onCheckin={setCheckin} onQuickLog={() => setQuickOpen(true)}
            onStartWorkout={() => { startWorkout(); setTab("train"); }}
            onGoSleep={() => setTab("sleep")} onGoEnergy={() => setTab("energy")} onGoBody={() => setTab("body")} onGoHealth={() => setTab("health")} onGoMind={() => setTab("mind")}
          />
        )}
        {tab === "train" && (
          <TrainTab workouts={workouts} active={activeWorkout} profile={profile} trainInfo={trainInfo} advanced={advanced}
            routines={routines} onSaveRoutine={saveRoutine} onDeleteRoutine={deleteRoutine} onUseTemplate={useTemplate}
            onStart={startWorkout} onAddExercise={addWoExercise} onLogSet={woLogSet} onRemoveSet={woRemoveSet}
            onRemoveExercise={woRemoveExercise} onFinish={finishWorkout} onCancel={cancelWorkout}
            onSaveRest={saveRest} onSetExercisePain={woSetExercisePain} onGoBody={() => setTab("body")} onGoHealth={() => setTab("health")} />
        )}
        {tab === "body" && (
          <BodyTab workouts={workouts} profile={profile} trainInfo={trainInfo} sleepInfo={sleepInfo} advanced={advanced}
            weightSeries={weightSeries} measureSeries={measureSeries} photoLog={photoLog}
            onLogWeight={(kg) => persistDaily({ weight: kg })} onSaveMeasurement={saveMeasurement} onLogPhotoSet={logPhotoSet}
            onOpenPhotos={() => setPhotoOpen(true)} progressPhotosCount={progressPhotos.length} />
        )}
        {tab === "meals" && (
          <MealsTab library={library} onLog={logFromLibrary} onRemove={removeLibrary} onNew={() => { setTab("today"); setComposer("text"); }} />
        )}
        {tab === "sleep" && (
          <SleepTab sleepLogs={sleepLogs} sleepInfo={sleepInfo} alarm={alarm} onSaveAlarm={saveAlarm}
            session={session} micState={micState} onStart={startSession} onEnd={endSession}
            onManual={saveSleepLog} onRemove={removeSleep} profile={profile} advanced={advanced}
            daily={daily} onDaily={persistDaily} recoveryRec={trainInfo.recoveryRec} />
        )}
        {tab === "energy" && (
          <EnergyTab sleepInfo={sleepInfo} entries={entries} t={t} advanced={advanced} />
        )}
        {tab === "trends" && <TrendsTab history={history} targets={targets} t={t} scores={scores} sleepLogs={sleepLogs} sleepInfo={sleepInfo} advanced={advanced} report={report} profile={profile} achievements={achievements} timeline={timeline} />}
        {tab === "health" && <HealthTab healthInfo={healthInfo} advanced={advanced} onSave={saveHealth} safety={safetyInfo}
          pain={trainInfo.pain} onAddPain={addPainLog} onUpdatePain={updatePainLog} onRemovePain={removePainLog} />}
        {tab === "mind" && <MindTab mindInfo={mindInfo} advanced={advanced} checkin={daily.checkin || {}} onCheckin={setCheckin} profile={profile}
          onToggleHabit={toggleHabit} onAddHabit={addHabit} onRemoveHabit={removeHabit} onRestoreHabit={restoreHabit} onLogFocus={logFocus} />}
        {tab === "coach" && <CoachTab coach={coach2} advanced={advanced} moveInfo={moveInfo} timeline={timeline} plateaus={plateaus} patterns={patterns}
          onGoTrain={() => setTab("train")} onGoMeals={() => setTab("meals")} onGoSleep={() => setTab("sleep")} onGoHealth={() => setTab("health")} onAsk={() => setAskOpen(true)} />}
        {tab === "me" && <MeTab profile={profile} targets={targets} onSave={saveProfile} onGoHealth={() => setTab("health")} onGoMind={() => setTab("mind")}
          onExportJSON={exportJSON} onExportCSV={exportCSV} onImportJSON={importJSON} onResetData={resetAllData} onLoadDemo={loadDemoData}
          reminders={reminders} onSaveReminders={persistReminders} sleepInfo={sleepInfo} />}
      </div>

      {/* logging dock */}
      {tab === "today" && (
        <div style={{ padding: "0 16px 14px" }}>
          {error && <div style={{ background: "#fdeee8", color: C.coral, fontSize: 12, padding: "10px 12px", borderRadius: 12, marginBottom: 10 }}>{error}</div>}

          {busy && (
            <div className="sprig-rise" style={{ background: C.card, borderRadius: 18, padding: 16, display: "flex", alignItems: "center", gap: 10, boxShadow: C.shadow, marginBottom: 10 }}>
              <Loader2 size={18} color={C.green} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13.5, color: C.inkSoft }}>
                {resultMode === "supplement" || resultMode === "supp-label" ? "Reading your supplement…" : "Reading your food…"}
              </span>
            </div>
          )}

          {result && !busy && (
            <div style={{ marginBottom: 10 }}>
              <ResultCard
                result={result}
                mode={resultMode}
                isSupp={resultMode === "supplement" || resultMode === "supp-label"}
                onAdd={(resultMode === "supplement" || resultMode === "supp-label") ? addSupplement : addEntry}
                onCancel={() => setResult(null)}
              />
            </div>
          )}

          {composer === "supp" && !busy && !result && (
            <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, marginBottom: 10, border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.greenSoft, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Pill size={14} /> New supplement
              </div>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
                placeholder="e.g. Vitamin D3 2000 IU + magnesium glycinate 400mg, or omega-3 fish oil 1000mg"
                style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontFamily: "DM Sans", fontSize: 14, color: C.ink, minHeight: 52, lineHeight: 1.45 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="sprig-tap" onClick={() => { setComposer(null); setDraft(""); }} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "11px 0" }}>Cancel</button>
                <button className="sprig-tap" onClick={() => suppLabelRef.current?.click()} style={{ ...btn(C.bg2, C.ink), flex: 1, padding: "11px 0" }}><ScanLine size={15} /> Scan</button>
                <button className="sprig-tap" disabled={!draft.trim()} onClick={() => { runAnalysis({ text: draft, mode: "supplement" }); setDraft(""); }}
                  style={{ ...btn(draft.trim() ? C.green : C.bg2, draft.trim() ? "#fff" : C.muted), flex: 1.6, padding: "11px 0" }}>
                  <Sparkles size={15} /> Add
                </button>
              </div>
            </div>
          )}

          {composer === "text" && !busy && !result && (
            <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, marginBottom: 10, border: `1px solid ${C.line}` }}>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
                placeholder="e.g. two eggs, a slice of sourdough, half an avocado and a flat white"
                style={{ width: "100%", border: "none", outline: "none", resize: "none", background: "transparent", fontFamily: "DM Sans", fontSize: 14, color: C.ink, minHeight: 56, lineHeight: 1.45 }} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="sprig-tap" onClick={() => { setComposer(null); setDraft(""); }} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "11px 0" }}>Cancel</button>
                <button className="sprig-tap" disabled={!draft.trim()} onClick={() => { runAnalysis({ text: draft, mode: "text" }); setDraft(""); }}
                  style={{ ...btn(draft.trim() ? C.green : C.bg2, draft.trim() ? "#fff" : C.muted), flex: 2, padding: "11px 0" }}>
                  <Sparkles size={15} /> Analyze
                </button>
              </div>
            </div>
          )}

          {composer === "manual" && !busy && !result && (
            <ManualEntry onAdd={addManual} onCancel={() => setComposer(null)} />
          )}

          {!result && (
            <div style={{ display: "flex", gap: 8 }}>
              <DockBtn icon={<Camera size={19} />} label="Snap food" onClick={() => fileRef.current?.click()} primary />
              <DockBtn icon={<ScanLine size={19} />} label="Scan label" onClick={() => labelRef.current?.click()} />
              <DockBtn icon={<PencilLine size={19} />} label="Describe" onClick={() => setComposer("text")} />
              <DockBtn icon={<Calculator size={19} />} label="Manual" onClick={() => setComposer("manual")} />
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e, "photo")} style={{ display: "none" }} />
          <input ref={labelRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e, "label")} style={{ display: "none" }} />
          <input ref={suppLabelRef} type="file" accept="image/*" capture="environment" onChange={(e) => onFile(e, "supp-label")} style={{ display: "none" }} />
        </div>
      )}

      {/* tab bar */}
      <div style={{ display: "flex", borderTop: `1px solid ${C.line}`, background: C.card, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[["today", Home, "Today"], ["coach", Sparkles, "Coach"], ["train", Dumbbell, "Train"], ["body", PersonStanding, "Body"], ["sleep", Moon, "Sleep"]].map(([k, Ic, lbl]) => (
          <button key={k} onClick={() => { setTab(k); setResult(null); setComposer(null); setError(""); }}
            style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "11px 0 14px", minHeight: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: tab === k ? C.green : C.muted }}>
            <Ic size={20} strokeWidth={tab === k ? 2.4 : 2} />
            <span style={{ fontSize: 10.5, fontWeight: tab === k ? 700 : 500 }}>{lbl}</span>
          </button>
        ))}
      </div>

      {quickOpen && <QuickLogSheet ci={daily.checkin || {}} daily={{ ...daily, trainedToday }} sleepInfo={sleepInfo} profile={profile}
        painActive={trainInfo.pain?.level !== "none"} onCheckin={setCheckin} onDaily={persistDaily}
        onClose={() => setQuickOpen(false)} />}

      {searchOpen && (() => {
        const results = searchAll({ q: searchQ, library, workouts, history, supps, painLogs, weightSeries, sleepLogs, healthSeries, focusSessions });
        const jumpTo = (r) => {
          setSearchOpen(false);
          if (r.kind === "exercise" || r.kind === "workout") setTab("train");
          else if (r.kind === "food") setTab("meals");
          else if (r.kind === "supp") setTab("today");
          else if (r.kind === "pain" || r.kind === "health") setTab("health");
          else if (r.kind === "weight") setTab("body");
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
        const weeklyWk = workouts.filter((w) => Date.now() - w.ts <= 7 * 864e5).length;
        const stalls = (typeof stallingLifts === "function") ? stallingLifts(workouts) : [];
        const ws = [...(weightSeries || [])].sort((a, b) => a.date.localeCompare(b.date));
        let weightRate = null;
        if (ws.length >= 2) {
          const first = ws[Math.max(0, ws.length - 14)], lastW = ws[ws.length - 1];
          const days = Math.max(1, (new Date(lastW.date) - new Date(first.date)) / 864e5);
          weightRate = +(((lastW.kg - first.kg) / days) * 7).toFixed(2);
        }
        const ctx = { calAvg, protAvg, sleepAvg, weeklyWk, stalls, painActive: trainInfo.pain?.level !== "none", weightRate };
        return <AskCoachSheet onClose={() => setAskOpen(false)} context={ctx} online={online} runAnalysis={(q) => askCoach(q, ctx)} />;
      })()}

      {photoOpen && <PhotoSheet onClose={() => setPhotoOpen(false)} photos={progressPhotos} onAdd={addProgressPhoto} onRemove={removeProgressPhoto} />}

      {/* storage write-error banner — appears when persistence is failing (quota, rate limit, etc.) */}
      {writeError && Date.now() - writeError.ts < 30000 && (
        <div style={{ position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", background: writeError.quota ? C.coral : C.amber, color: "#fff", padding: "9px 14px", borderRadius: 11, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 6px 20px rgba(0,0,0,.18)", fontSize: 12, fontFamily: "DM Sans", zIndex: 70, maxWidth: 380 }}>
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

      {/* undo toast — appears after a delete and gives a few seconds to bring it back */}
      {undoItem && (
        <div className="sprig-bottom-toast" style={{ position: "fixed", bottom: 76, left: "50%", transform: "translateX(-50%)", background: C.ink, color: "#fff", padding: "11px 16px", borderRadius: 99, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 6px 20px rgba(0,0,0,.25)", fontSize: 12.5, fontFamily: "DM Sans", zIndex: 60 }}>
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

function ManualEntry({ onAdd, onCancel }) {
  const [f, setF] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const ok = (f.calories || f.protein || f.carbs || f.fat);
  const Field = ({ k, label, suffix }) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <input value={f[k]} onChange={(e) => set(k, e.target.value)} inputMode="decimal" placeholder="0"
        style={{ width: "100%", textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 4px", fontFamily: "DM Sans", fontSize: 15, fontWeight: 600, background: C.bg, color: C.ink }} />
    </div>
  );
  return (
    <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, marginBottom: 10, border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.greenSoft, marginBottom: 9, display: "flex", alignItems: "center", gap: 6 }}>
        <Calculator size={14} /> Manual entry — no AI, just numbers
      </div>
      <input value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus placeholder="Name (optional)"
        style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 11px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink, marginBottom: 9 }} />
      <div style={{ display: "flex", gap: 7 }}>
        <Field k="calories" label="Calories" />
        <Field k="protein" label="Protein g" />
        <Field k="carbs" label="Carbs g" />
        <Field k="fat" label="Fat g" />
        <Field k="fiber" label="Fiber g" />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
        <button className="sprig-tap" onClick={onCancel} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "11px 0" }}>Cancel</button>
        <button className="sprig-tap" disabled={!ok} onClick={() => onAdd(f)}
          style={{ ...btn(ok ? C.green : C.bg2, ok ? "#fff" : C.muted), flex: 2, padding: "11px 0" }}><Plus size={15} /> Add to today</button>
      </div>
    </div>
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
function TodayTab({ t, targets, entries, scores, onRemove, library, onQuick, profile, supps, takenIds, onToggleSupp, onRemoveSupp, onAddSupp, sleepInfo, trainInfo, advanced, dailyInfo, nutriInfo, healthInfo, mindInfo, moveInfo, onDaily, onAddEntry, onCheckin, onQuickLog, onStartWorkout, onGoSleep, onGoEnergy, onGoBody, onGoHealth, onGoMind }) {
  const [simpleToday, setSimpleToday] = useState(true);
  const takenCount = supps.filter((s) => takenIds.includes(s.id)).length;
  const { lastSleep, debtMin, rec, gym } = sleepInfo;
  const { daily, weightSeries, subScores, healthScore, actions } = dailyInfo;
  const nowMin = tsToMin(Date.now());
  const ci = daily.checkin || {};
  const [showCheckin, setShowCheckin] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  // weight trend
  const wSorted = [...weightSeries].sort((a, b) => a.date.localeCompare(b.date));
  const curW = daily.weight ?? (wSorted.length ? wSorted[wSorted.length - 1].kg : null);
  const weekAgo = wSorted.find((s) => (Date.now() - new Date(s.date).getTime()) <= 8 * 864e5);
  const wChange = curW != null && weekAgo ? +(curW - weekAgo.kg).toFixed(1) : null;
  const SUB_LABELS = [["nutrition", "Nutrition", "🥗"], ["sleep", "Sleep", "😴"], ["training", "Recovery", "💪"], ["movement", "Movement", "🏃"], ["mind", "Mind", "🧠"], ["habits", "Habits", "✅"]];

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
      {/* DAILY HEALTH SCORE */}
      <div style={{ background: "linear-gradient(150deg,#2C4636,#1C2B22)", borderRadius: 22, padding: 18, color: "#fff", boxShadow: C.shadow }}>
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
        {/* sub-score chips */}
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", listStyle: "none", fontSize: 11.5, opacity: .8, fontWeight: 600 }}>▾ Score breakdown</summary>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
            {SUB_LABELS.map(([k, lbl, emo]) => (
              <div key={k} style={{ background: "rgba(255,255,255,.08)", borderRadius: 11, padding: "9px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 14 }}>{emo}</div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginTop: 1 }}>{subScores[k] == null ? "–" : subScores[k]}</div>
                <div style={{ fontSize: 9.5, opacity: .7 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* BEST ACTION TODAY */}
      {actions.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, marginBottom: 11, display: "flex", alignItems: "center", gap: 7 }}>
            <Sparkles size={16} color={C.greenSoft} /> Best actions today
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {actions.slice(0, advanced ? 6 : 3).map((a, i) => (
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

      {/* DAILY CHECK-IN */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
        <button className="sprig-tap" onClick={() => setShowCheckin((s) => !s)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 8, fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, color: C.ink }}>
          <HeartPulse size={16} color={C.greenSoft} />
          <span style={{ flex: 1, textAlign: "left" }}>Daily check-in</span>
          {!showCheckin && (
            <span style={{ fontFamily: "DM Sans", fontSize: 11.5, color: C.muted, fontWeight: 500 }}>
              {[ci.energy, ci.mood].filter(Boolean).length ? "tap to edit" : "30 seconds"}
            </span>
          )}
          <ChevronRight size={17} color={C.muted} style={{ transform: showCheckin ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </button>
        {/* Quick Log Day shortcut */}
        {onQuickLog && !showCheckin && (
          <button className="sprig-tap" onClick={onQuickLog}
            style={{ width: "100%", marginTop: 10, background: C.green + "0d", border: `1px dashed ${C.green}66`, cursor: "pointer", borderRadius: 11, padding: "9px 12px", display: "flex", alignItems: "center", gap: 9, color: C.green, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans" }}>
            <Zap size={14} /> <span>Lazy day? Quick log in 20 seconds</span>
            <ChevronRight size={14} style={{ marginLeft: "auto" }} />
          </button>
        )}
        {showCheckin ? (
          <div style={{ marginTop: 8 }}>
            <CheckinRow label="Energy" value={ci.energy} onPick={(v) => onCheckin("energy", v)} opts={[["low", "Low"], ["normal", "Normal"], ["high", "High"]]} />
            <CheckinRow label="Mood" value={ci.mood} onPick={(v) => onCheckin("mood", v)} opts={[["bad", "Bad", C.coral], ["okay", "Okay", C.amber], ["good", "Good", C.greenSoft]]} />
            <CheckinRow label="Focus" value={ci.focus} onPick={(v) => onCheckin("focus", v)} opts={[["low", "Low", C.coral], ["normal", "Normal", C.amber], ["high", "High", C.greenSoft]]} />
            <CheckinRow label="Stress" value={ci.stress} onPick={(v) => onCheckin("stress", v)} opts={[["low", "Low", C.greenSoft], ["medium", "Med", C.amber], ["high", "High", C.coral]]} />
            <CheckinRow label="Pain" value={ci.pain} onPick={(v) => onCheckin("pain", v)} opts={[["none", "None", C.greenSoft], ["mild", "Mild", C.amber], ["moderate", "Mod", "#E0714A"], ["serious", "Serious", C.coral]]} />
            <CheckinRow label="Sick" value={ci.sick} onPick={(v) => onCheckin("sick", v)} opts={[["no", "No", C.greenSoft], ["yes", "Yes", C.coral]]} />
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .3, marginBottom: 5 }}>NOTE FOR TODAY</div>
              <textarea value={ci.note || ""} onChange={(e) => onCheckin("note", e.target.value)} placeholder="e.g. Felt weak today, only slept 5h. Elbow pain during skull crushers."
                style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", fontFamily: "DM Sans", fontSize: 12.5, background: C.bg, color: C.ink, minHeight: 50, resize: "vertical", lineHeight: 1.5 }} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 7, marginTop: 11, flexWrap: "wrap" }}>
            {[["Energy", ci.energy], ["Mood", ci.mood], ["Stress", ci.stress], ["Pain", ci.pain], ["Sick", ci.sick === "yes" ? "yes" : null]].map(([lbl, v]) => (
              <span key={lbl} style={{ fontSize: 11.5, background: C.bg2, borderRadius: 8, padding: "5px 10px", color: v ? C.inkSoft : C.muted, fontWeight: v ? 600 : 400, textTransform: "capitalize" }}>{lbl}{v ? `: ${v}` : ""}</span>
            ))}
          </div>
        )}
      </div>

      {/* QUICK LOG DAY card (one-tap binary log) */}
      <QuickDayCard daily={daily} onDaily={onDaily} />

      {/* SUGGESTED NEXT WORKOUT (from routine pattern history) */}
      <NextWorkoutCard suggestion={moveInfo?.nextWorkout} onStart={onStartWorkout} />

      {/* MEAL SHORTCUTS: same as yesterday / frequent / by time */}
      <MealShortcutsCard shortcuts={moveInfo?.mealShortcuts} onLog={(e) => onAddEntry && onAddEntry({ ...e, ts: Date.now() })} />

      {/* TONIGHT PLAN: caffeine + blue cutoffs + bedtime */}
      <TonightPlanCard plan={moveInfo?.tonight} />

      {/* CALORIE TARGET RECOMMENDATION from weight trend */}
      <CalorieTrendCard rec={moveInfo?.calorieTrend} />

      {/* QUICK TRACKERS: water, steps, weight */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Stepper icon={<Coffee size={13} />} label="Water" value={daily.water} suffix="ml" step={250} onChange={(v) => onDaily({ water: v })} color="#5B9BD5" goal={nutriInfo.waterGoal} />
        <Stepper icon={<Activity size={13} />} label="Steps" value={daily.steps} suffix="" step={500} onChange={(v) => onDaily({ steps: v })} color={C.greenSoft} goal={moveInfo?.stepGoal} />
      </div>
      {/* steps quick-add row */}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        {[1000, 2500, 5000].map((n) => (
          <button key={n} className="sprig-tap" onClick={() => onDaily({ steps: (daily.steps || 0) + n, activitySource: "manual" })}
            style={{ flex: 1, background: C.bg2, border: "none", cursor: "pointer", borderRadius: 9, padding: "7px 0", fontSize: 11.5, fontWeight: 600, color: C.inkSoft, fontFamily: "DM Sans" }}>
            +{n >= 1000 ? `${n / 1000}k` : n}
          </button>
        ))}
      </div>
      <details style={{ marginTop: 6 }}>
        <summary style={{ cursor: "pointer", listStyle: "none", fontSize: 10.5, color: C.muted, padding: "4px 6px", display: "flex", alignItems: "center", gap: 5 }}>
          <ChevronRight size={11} /> Auto step tracking?
        </summary>
        <div style={{ fontSize: 10.5, color: C.muted, padding: "5px 8px 0", lineHeight: 1.55 }}>
          Automatic step tracking needs Apple Health, Health Connect, Google Fit, Fitbit, Garmin, or a native mobile app. For now, enter steps manually or import them.
          <div style={{ marginTop: 5 }}>Current source: <b style={{ color: C.inkSoft }}>{daily.activitySource || "manual"}</b></div>
        </div>
      </details>

      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "stretch" }}>
        <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 11px", boxShadow: C.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.amber, fontSize: 11, fontWeight: 600 }}><User size={13} /> Bodyweight</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
            <input value={weightInput} onChange={(e) => setWeightInput(e.target.value)} inputMode="decimal" placeholder={curW != null ? String(curW) : "kg"}
              style={{ width: 54, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "6px 4px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg }} />
            <button className="sprig-tap" disabled={!weightInput} onClick={() => { onDaily({ weight: parseFloat(weightInput) }); setWeightInput(""); }}
              style={{ ...btn(weightInput ? C.green : C.bg2, weightInput ? "#fff" : C.muted), padding: "7px 11px", fontSize: 12.5 }}>Log</button>
            {wChange != null && <span style={{ fontSize: 11.5, color: wChange > 0 ? C.amber : C.greenSoft, fontWeight: 600, marginLeft: "auto" }}>{wChange > 0 ? "+" : ""}{wChange}kg/wk</span>}
          </div>
        </div>
      </div>

      {/* CARDIO sessions quick log */}
      <CardioCard daily={daily} profile={profile} onDaily={onDaily} />

      {/* ALCOHOL / DRINKS quick log */}
      <DrinksCard daily={daily} onDaily={onDaily} onAddEntry={onAddEntry} />

      {!simpleToday && <>
      {/* MOVEMENT card */}
      {moveInfo?.movement && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>
            <Activity size={15} color={C.greenSoft} /> Movement today
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700 }}>
              {moveInfo.movement.steps.toLocaleString()} <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>/ {moveInfo.movement.goal.toLocaleString()}</span>
            </div>
            <span style={{ fontSize: 12, color: moveInfo.movement.pct >= 100 ? C.greenSoft : C.muted, fontWeight: 600 }}>{moveInfo.movement.pct}%{moveInfo.movement.kcal ? ` · ~${moveInfo.movement.kcal} kcal` : ""}</span>
          </div>
          <div style={{ height: 7, background: C.bg2, borderRadius: 99 }}>
            <div style={{ width: Math.min(100, moveInfo.movement.pct) + "%", height: "100%", background: moveInfo.movement.pct >= 100 ? C.greenSoft : C.green, borderRadius: 99, transition: "width .5s" }} />
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 9, lineHeight: 1.5 }}>{moveInfo.movement.note}</div>
          {/* dynamic calorie adjustment */}
          {moveInfo.calAdjust && Math.abs(moveInfo.calAdjust.delta) >= 150 && (
            <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}`, lineHeight: 1.5, display: "flex", gap: 7 }}>
              <Flame size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} /><span>{moveInfo.calAdjust.text}</span>
            </div>
          )}
          {/* sedentary line */}
          {moveInfo.sedentary && (
            <div style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5, display: "flex", gap: 7, color: moveInfo.sedentary.color }}>
              <Clock size={13} style={{ flexShrink: 0, marginTop: 1 }} /><span>{moveInfo.sedentary.text}</span>
            </div>
          )}
          {/* electrolyte hint */}
          {moveInfo.hydration?.needsElectrolytes && (
            <div style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5, display: "flex", gap: 7, color: "#5B9BD5" }}>
              <Coffee size={13} style={{ flexShrink: 0, marginTop: 1 }} /><span>Long or heavy-sweat session — consider electrolytes (sodium + potassium) with your water.</span>
            </div>
          )}
        </div>
      )}

      {/* sport-specific quick log (when a sport is set) */}
      {profile?.sport && profile.sport !== "gym" && profile.sport !== "health" && (() => {
        const fields = sportFields(profile.sport);
        if (!fields.length) return null;
        const log = daily.sportLog || {};
        return (
          <div style={{ background: C.card, borderRadius: 14, padding: 13, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: C.inkSoft, fontWeight: 600, marginBottom: 9 }}>
              <Dumbbell size={13} color={C.greenSoft} /> {SPORTS.find(([k]) => k === profile.sport)?.[1] || "Sport"} today
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {fields.filter((f) => f.opts.length).map((f) => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 92, fontSize: 11.5, color: C.muted, fontWeight: 600 }}>{f.label}</div>
                  <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
                    {f.opts.filter(([k]) => k).map(([k, lbl, color]) => (
                      <button key={k + lbl} className="sprig-tap"
                        onClick={() => onDaily({ sportLog: { ...log, [f.id]: k } })}
                        style={{ flex: 1, border: "none", cursor: "pointer", padding: "6px 0", borderRadius: 7, fontSize: 11, fontWeight: 600, fontFamily: "DM Sans", background: log[f.id] === k ? (color || C.green) : C.bg2, color: log[f.id] === k ? "#fff" : C.muted }}>{lbl}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* advanced: sedentary minutes + sweat level */}
      {advanced && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "stretch" }}>
          <Stepper icon={<Clock size={13} />} label="Sitting" value={daily.sedentary || 0} suffix="m" step={30} onChange={(v) => onDaily({ sedentary: v })} color="#9C6B4A" />
          <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 11px", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#5B9BD5", fontSize: 11, fontWeight: 600 }}><Coffee size={13} /> Sweat</div>
            <div style={{ display: "flex", gap: 3, marginTop: 7 }}>
              {[["low", "Low"], ["normal", "Nrm"], ["heavy", "Heavy"]].map(([k, lbl]) => (
                <button key={k} className="sprig-tap" onClick={() => onDaily({ sweat: k })}
                  style={{ flex: 1, border: "none", cursor: "pointer", padding: "5px 0", borderRadius: 7, fontSize: 10.5, fontWeight: 600, fontFamily: "DM Sans", background: (daily.sweat || "normal") === k ? "#5B9BD5" : C.bg2, color: (daily.sweat || "normal") === k ? "#fff" : C.muted }}>{lbl}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* caffeine + alcohol (advanced) */}
      {advanced && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <Stepper icon={<Coffee size={13} />} label="Caffeine" value={daily.caffeine} suffix="mg" step={50} onChange={(v) => onDaily({ caffeine: v })} color="#9C6B4A" />
          <Stepper icon={<Flame size={13} />} label="Alcohol" value={daily.alcohol} suffix="u" step={1} onChange={(v) => onDaily({ alcohol: v })} color={C.coral} />
        </div>
      )}

      {/* Apple Health (honest, ready-to-wire) */}
      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: "pointer", listStyle: "none", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", boxShadow: C.shadow, display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: C.ink, fontFamily: "DM Sans" }}>
          <HeartPulse size={16} color={C.coral} />
          <span style={{ flex: 1 }}>Connect Apple Health</span>
          <ChevronRight size={16} color={C.muted} />
        </summary>
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginTop: 8, boxShadow: C.shadow }}>
          <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.55 }}>
            Automatic sync (steps, calories burned, heart rate, sleep) needs the Sprig <b>iOS app</b> — Apple Health can't be read from inside a web view. The version you're using is the web preview.
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.55, marginTop: 8 }}>
            Until then, tap your steps and cardio above and everything else works the same. When the native app ships, today's numbers will fill in automatically each morning.
          </div>
        </div>
      </details>
      </>}

      {/* NUTRITION card */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "18px 2px 10px" }}>Nutrition</div>
      <div style={{ background: C.card, borderRadius: 22, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {(() => {
          const adjTarget = moveInfo?.calAdjust?.adjustedTargetCalories || targets.calories;
          const delta = moveInfo?.calAdjust?.delta || 0;
          const leftLabel = Math.max(0, adjTarget - t.calories);
          return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <Ring value={t.calories} max={adjTarget} label={leftLabel} sub="kcal left"
                  color={t.calories > adjTarget ? C.coral : C.green} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                  <MacroBar name="Protein" val={t.protein} max={targets.protein} color={C.green} />
                  <MacroBar name="Carbs" val={t.carbs} max={targets.carbs} color={C.amber} />
                  <MacroBar name="Fat" val={t.fat} max={targets.fat} color={C.coral} />
                  <MacroBar name="Fiber" val={t.fiber} max={targets.fiber} color={C.leaf} />
                </div>
              </div>
              {delta !== 0 && (
                <details style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                  <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>
                    <span>Movement-adjusted target: <b style={{ color: C.ink }}>{adjTarget} kcal</b></span>
                    <ChevronDown size={12} color={C.muted} />
                  </summary>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Base target</span><span>{targets.calories} kcal</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span>Movement adjustment</span><span style={{ color: delta > 0 ? C.greenSoft : C.amber }}>{delta > 0 ? "+" : ""}{delta} kcal</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px dashed ${C.line}`, marginTop: 5, paddingTop: 5, color: C.inkSoft, fontWeight: 600 }}><span>Adjusted target</span><span>{adjTarget} kcal</span></div>
                    <div style={{ marginTop: 8, fontSize: 10.5, color: C.muted, lineHeight: 1.5, fontStyle: "italic" }}>
                      Calories burned are estimates. Use your weight trend over time to adjust targets.
                    </div>
                  </div>
                </details>
              )}
            </>
          );
        })()}

        {/* diet quality score */}
        {t.calories > 0 && (
          <div style={{ marginTop: 14, paddingTop: 13, borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>Diet quality</span>
              <span style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: nutriInfo.dietQ.score >= 70 ? C.greenSoft : nutriInfo.dietQ.score >= 50 ? C.amber : C.coral }}>{nutriInfo.dietQ.score}<span style={{ fontSize: 11, color: C.muted }}>/100</span></span>
            </div>
            <div style={{ height: 6, background: C.bg2, borderRadius: 99 }}>
              <div style={{ width: nutriInfo.dietQ.score + "%", height: "100%", background: nutriInfo.dietQ.score >= 70 ? C.greenSoft : nutriInfo.dietQ.score >= 50 ? C.amber : C.coral, borderRadius: 99, transition: "width .6s" }} />
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>
              {nutriInfo.dietQ.advice.length ? `To improve: ${nutriInfo.dietQ.advice.join(", ")}.` : "Well-balanced day — keep it up. 🌿"}
            </div>
          </div>
        )}
      </div>

      {/* bulk / cut / maintenance coach */}
      {nutriInfo.coach.lines.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, marginBottom: 9, display: "flex", alignItems: "center", gap: 7 }}>
            <Target size={15} color={C.greenSoft} /> {targets.goal === "gain" ? "Lean bulk" : targets.goal === "lose" ? "Cut" : "Maintenance"} coach
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {nutriInfo.coach.lines.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: l.tone === "good" ? C.greenSoft : C.amber, flexShrink: 0, marginTop: 6 }} />
                {l.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {!simpleToday && <>
      {/* missing nutrients */}
      {nutriInfo.missing.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, marginBottom: 11, display: "flex", alignItems: "center", gap: 7 }}>
            <Flame size={15} color={C.amber} /> Top to top up today
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

      {/* evening cues: blue-light + caffeine cutoffs */}
      <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
        <div style={{ flex: 1, background: "linear-gradient(135deg,#27384d,#2e2a4d)", borderRadius: 18, padding: "12px 14px", color: "#fff", display: "flex", alignItems: "center", gap: 10, boxShadow: C.shadow }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <EyeOff size={17} color="#BFD0FF" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, opacity: .75, letterSpacing: .3 }}>NO BLUE LIGHT AFTER</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{minToLabel(rec.blueCutoff)}</div>
          </div>
        </div>
        <div style={{ flex: 1, background: "linear-gradient(135deg,#4a3a2e,#3a2a22)", borderRadius: 18, padding: "12px 14px", color: "#fff", display: "flex", alignItems: "center", gap: 10, boxShadow: C.shadow }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Coffee size={17} color="#E7DCC6" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, opacity: .75, letterSpacing: .3 }}>NO CAFFEINE AFTER</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{minToLabel(rec.caffeineCutoff)}</div>
          </div>
        </div>
      </div>
      {debtMin > 60 && (
        <div style={{ fontSize: 11.5, color: C.muted, margin: "6px 4px 0", lineHeight: 1.5 }}>
          Both pulled earlier tonight — you're carrying {durLabel(debtMin)} of sleep debt.
        </div>
      )}
      </>}

      {/* sleep + gym quick snapshot */}
      <div style={{ display: "flex", gap: 9, marginTop: 10 }}>
        <button className="sprig-tap" onClick={onGoSleep} style={{ flex: 1, textAlign: "left", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 14px", cursor: "pointer", boxShadow: C.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#7A6FB0", fontSize: 11.5, fontWeight: 600 }}><Moon size={14} /> Last night</div>
          {lastSleep ? (
            <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, marginTop: 4 }}>{durLabel(lastSleep.durationMin)}</div>
              <div style={{ fontSize: 11.5, color: C.muted }}>score {lastSleep.score} · debt {durLabel(debtMin)}</div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>Log last night →</div>
          )}
        </button>
        <button className="sprig-tap" onClick={onGoEnergy} style={{ flex: 1, textAlign: "left", background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 14px", cursor: "pointer", boxShadow: C.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.greenSoft, fontSize: 11.5, fontWeight: 600 }}><Dumbbell size={14} /> Best gym window</div>
          {gym ? (
            <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, marginTop: 4 }}>{minToLabel(gym.start)}</div>
              <div style={{ fontSize: 11.5, color: C.muted }}>peak energy {gym.avg}/100</div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>See your day →</div>
          )}
        </button>
      </div>

      {!simpleToday && <>
      {/* BODY snapshot */}
      <button className="sprig-tap" onClick={onGoBody} style={{ width: "100%", textAlign: "left", marginTop: 10, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 15px", cursor: "pointer", boxShadow: C.shadow, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: C.amber + "20", display: "grid", placeItems: "center", flexShrink: 0 }}><User size={18} color={C.amber} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: C.amber }}>Body</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>
            {curW != null ? `${curW} kg` : "Log your weight"}{wChange != null ? ` · ${wChange > 0 ? "+" : ""}${wChange} kg this week` : ""}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
            {wSorted.length < 2 ? "Weigh in a few mornings to see your trend" : "Tip: snap a progress photo weekly, same light"}
          </div>
        </div>
        <ChevronRight size={18} color={C.muted} />
      </button>

      {/* HEALTH card — surfaces summary or a "log your first vitals" nudge */}
      {(() => {
        const radar = healthInfo?.radar || [];
        const flagged = radar.filter((r) => r.tag === "elevated" || r.tag === "high");
        const hasAnyData = Object.keys(healthInfo?.latest || {}).filter((k) => k !== "blood").length > 0 || (healthInfo?.latest?.blood && Object.keys(healthInfo.latest.blood).length);
        return (
          <button className="sprig-tap" onClick={onGoHealth} style={{ width: "100%", textAlign: "left", marginTop: 10, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 15px", cursor: "pointer", boxShadow: C.shadow, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: (flagged.length ? C.coral : C.greenSoft) + "22", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <HeartPulse size={18} color={flagged.length ? C.coral : C.greenSoft} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: flagged.length ? C.coral : C.greenSoft }}>Health markers</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>
                {!hasAnyData ? "Log blood pressure & resting HR" :
                  flagged.length ? `${flagged.length} item${flagged.length > 1 ? "s" : ""} to watch` :
                  "Long-term markers look good"}
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
                {!hasAnyData ? "Two simple readings a month tracks long-term risk."
                  : flagged.length ? flagged.slice(0, 2).map((r) => r.label.toLowerCase()).join(", ")
                  : "Sleep, movement, BP all in range."}
              </div>
            </div>
            <ChevronRight size={18} color={C.muted} />
          </button>
        );
      })()}

      {/* HABITS snapshot */}
      {mindInfo && (() => {
        const done = mindInfo.habits.filter((h) => h.done).length;
        const total = mindInfo.habits.length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        return (
          <button className="sprig-tap" onClick={onGoMind} style={{ width: "100%", textAlign: "left", marginTop: 10, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "13px 15px", cursor: "pointer", boxShadow: C.shadow, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: C.greenSoft + "22", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Sparkles size={18} color={C.greenSoft} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: C.greenSoft }}>Mind &amp; habits</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{done}/{total} habits today · {mindInfo.consistency.pct}% this week</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
                {mindInfo.focusMinutesToday > 0 ? `${mindInfo.focusMinutesToday} min focused today` : "Check in, tick habits, start a focus session"}
              </div>
            </div>
            <div style={{ position: "relative", width: 38, height: 38, flexShrink: 0 }}>
              <Ring value={pct} max={100} size={38} stroke={5} label={null} color={pct >= 70 ? C.greenSoft : pct >= 40 ? C.amber : C.coral} />
            </div>
          </button>
        );
      })()}
      </>}

      {/* training readiness (syncs sleep + muscle recovery) */}
      <button className="sprig-tap" onClick={onGoBody} style={{ width: "100%", textAlign: "left", marginTop: 10, background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: "14px 16px", cursor: "pointer", boxShadow: C.shadow, display: "flex", alignItems: "center", gap: 14 }}>
        <Ring value={trainInfo.bodyReadiness} max={100} size={62} stroke={8} label={trainInfo.bodyReadiness} sub="ready"
          color={trainInfo.bodyReadiness >= 70 ? C.greenSoft : trainInfo.bodyReadiness >= 45 ? C.amber : C.coral} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.greenSoft, fontSize: 11.5, fontWeight: 600 }}><Gauge size={14} /> Training readiness</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 3 }}>
            {trainInfo.bodyReadiness >= 70 ? "Greenlight — push hard today" : trainInfo.bodyReadiness >= 45 ? "Moderate — train smart" : "Low — go light or recover"}
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
            {trainInfo.freshMuscles.length ? `Fresh: ${trainInfo.freshMuscles.slice(0, 3).join(", ")}` : "Recovery in progress"}
          </div>
        </div>
        <ChevronRight size={18} color={C.muted} />
      </button>

      {trainInfo.deload.suggest && (
        <div style={{ marginTop: 10, background: "#fdeee8", borderRadius: 14, padding: "11px 14px", display: "flex", gap: 10, alignItems: "center" }}>
          <TrendingDown size={18} color={C.coral} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: "#9a3d22", lineHeight: 1.4 }}>
            <b>Deload week suggested.</b> {trainInfo.deload.reasons.join(" · ")}.
          </div>
        </div>
      )}

      {!simpleToday && <>
      {/* supplement stack */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 2px 10px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
          <Pill size={16} color={C.greenSoft} /> Daily stack
          {supps.length > 0 && <span style={{ fontFamily: "DM Sans", fontSize: 12, color: C.muted, fontWeight: 500 }}>· {takenCount}/{supps.length} taken</span>}
        </div>
        <button className="sprig-tap" onClick={onAddSupp} style={{ ...btn(C.bg2, C.green), padding: "7px 12px", fontSize: 12.5, borderRadius: 11 }}><Plus size={15} /> Add</button>
      </div>
      {supps.length === 0 ? (
        <button className="sprig-tap" onClick={onAddSupp}
          style={{ width: "100%", background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 14px", cursor: "pointer",
            color: C.muted, fontSize: 13, fontFamily: "DM Sans", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green + "14", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Pill size={17} color={C.greenSoft} />
          </div>
          <span>Add the supplements you take — describe them once or scan the label, then just tick them off each day.</span>
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {supps.map((s) => {
            const on = takenIds.includes(s.id);
            return (
              <div key={s.id} className="sprig-tap" onClick={() => onToggleSupp(s.id)}
                style={{ background: on ? C.green + "0d" : C.card, borderRadius: 14, padding: "11px 13px", cursor: "pointer",
                  boxShadow: C.shadow, border: `1px solid ${on ? C.leaf + "66" : C.line}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center",
                  background: on ? C.green : "transparent", border: on ? "none" : `2px solid ${C.line}`, transition: "all .15s ease" }}>
                  {on && <Check size={16} color="#fff" strokeWidth={3} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: on ? C.green : C.ink, textDecoration: on ? "none" : "none" }}>{s.name}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.serving}</div>
                </div>
                <button className="sprig-tap" onClick={(e) => { e.stopPropagation(); onRemoveSupp(s.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, flexShrink: 0 }}><Trash2 size={15} /></button>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 2 }}>
            Ticked supplements feed your micronutrients &amp; functional scores above.
          </div>
        </div>
      )}

      {/* functional health */}
      <div style={{ margin: "18px 2px 10px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>Functional health today</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {scores.map((s) => (
          <div key={s.key} style={{ background: C.card, borderRadius: 16, padding: "12px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13 }}>{s.emoji}</span>
              <span style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: s.color }}>{s.score}</span>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: C.inkSoft, margin: "4px 0 7px" }}>{s.label}</div>
            <div style={{ height: 5, background: C.bg2, borderRadius: 99 }}>
              <div style={{ width: s.score + "%", height: "100%", background: s.color, borderRadius: 99, transition: "width .6s ease" }} />
            </div>
          </div>
        ))}
      </div>

      {/* micros (advanced only) */}
      {advanced && (
      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: "pointer", listStyle: "none", fontSize: 13, fontWeight: 600, color: C.greenSoft, padding: "6px 2px" }}>
          ▾ Vitamins &amp; minerals ({MICRO_KEYS.filter(([k]) => t.micros[k] >= 100).length}/14 at 100%)
        </summary>
        <div style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: C.shadow, marginTop: 6, border: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
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
      </details>
      )}

      {/* quick re-log */}
      {library.length > 0 && (
        <>
          <div style={{ margin: "18px 2px 8px", fontSize: 12.5, fontWeight: 600, color: C.muted }}>Quick add from your meals</div>
          <div className="sprig-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {library.slice(0, 8).map((m) => (
              <button key={m.id} className="sprig-tap" onClick={() => onQuick(m)}
                style={{ flexShrink: 0, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "9px 13px", cursor: "pointer", textAlign: "left", boxShadow: C.shadow }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                <div style={{ fontSize: 11, color: C.coral, marginTop: 2 }}>{m.calories} kcal · +</div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* today's entries */}
      <div style={{ margin: "18px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>
        Logged today {entries.length > 0 && <span style={{ fontSize: 12, color: C.muted, fontFamily: "DM Sans" }}>· {entries.length}</span>}
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "26px 0" }}>
          Nothing yet — snap, scan, or describe a meal below 👇
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[...entries].reverse().map((e) => {
            const ms = mealScore(e, targets);
            const msCol = ms ? (ms.score >= 70 ? C.greenSoft : ms.score >= 45 ? C.amber : C.coral) : C.muted;
            return (
              <div key={e.id} style={{ background: C.card, borderRadius: 14, padding: "12px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {ms && (
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: msCol + "1f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700, color: msCol, lineHeight: 1 }}>{ms.score}</span>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}{e.mult !== 1 && <span style={{ color: C.muted, fontWeight: 500 }}> ×{e.mult}</span>}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                      {e.time ? minToLabel(tsToMin(e.time)) + " · " : ""}P {Math.round(e.protein_g * e.mult)} · C {Math.round(e.carbs_g * e.mult)} · F {Math.round(e.fat_g * e.mult)} g
                    </div>
                  </div>
                  <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 16 }}>{Math.round(e.calories * e.mult)}</div>
                  <button className="sprig-tap" onClick={() => onRemove(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={15} /></button>
                </div>
                {advanced && ms && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8, paddingLeft: 50 }}>{ms.note}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </>}

      {/* Show more / Show less toggle */}
      <button className="sprig-tap" onClick={() => setSimpleToday((s) => !s)}
        style={{ width: "100%", background: "none", border: `1px dashed ${C.line}`, cursor: "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: "DM Sans", marginTop: 14 }}>
        {simpleToday ? <>Show more on Today <ChevronDown size={13} /></> : <>Show less <ChevronDown size={13} style={{ transform: "rotate(180deg)" }} /></>}
      </button>

      <div style={{ height: 6 }} />
    </div>
  );
}

/* ---------------- Meals (library) tab -------------- */
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
  const total = stages.deep + stages.rem + stages.light || 1;
  const seg = [["Deep", stages.deep, "#3E5C8A"], ["REM", stages.rem, "#7A6FB0"], ["Light", stages.light, "#A9C3D9"]];
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

function SleepTab({ sleepLogs, sleepInfo, alarm, onSaveAlarm, session, micState, onStart, onEnd, onManual, onRemove, profile, advanced, daily, onDaily, recoveryRec }) {
  const { debtMin, lastSleep, rec, need } = sleepInfo;
  const [showManual, setShowManual] = useState(false);
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  const [qual, setQual] = useState(70);
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
        <div style={{ background: "linear-gradient(160deg,#1C2B22,#2C4636)", borderRadius: 24, padding: "34px 20px", color: "#fff" }}>
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
        <button className="sprig-tap" onClick={onEnd} style={{ ...btn(C.coral, "#fff"), width: "100%", padding: "15px 0", marginTop: 16 }}>
          <Sun size={17} /> I'm awake — end &amp; score
        </button>
      </div>
    );
  }

  return (
    <div className="sprig-rise">
      {/* sleep debt hero */}
      <div style={{ background: "linear-gradient(150deg,#2C4636,#1C2B22)", borderRadius: 22, padding: 20, color: "#fff", boxShadow: C.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11.5, opacity: .75, letterSpacing: .3 }}>SLEEP DEBT · LAST 14 NIGHTS</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 34, fontWeight: 700, marginTop: 4 }}>{durLabel(debtMin)}</div>
            <div style={{ fontSize: 12, opacity: .8, marginTop: 2 }}>
              {debtMin < 60 ? "You're well rested 🌿" : debtMin < 300 ? "A bit behind — bank some early nights." : "High debt — prioritize sleep this week."}
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
      </div>

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

      {/* start session */}
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="sprig-tap" onClick={() => onStart(true)} style={{ ...btn(C.green, "#fff"), flex: 2, padding: "15px 0", flexDirection: "column", gap: 3 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 15 }}><Moon size={17} /> Start sleep &amp; smart alarm</span>
          <span style={{ fontSize: 11, opacity: .85, fontWeight: 500 }}>wakes you by {alarm.latest}</span>
        </button>
        <button className="sprig-tap" onClick={() => setShowManual((s) => !s)} style={{ ...btn(C.card, C.ink), flex: 1, padding: "15px 0", border: `1px solid ${C.line}`, flexDirection: "column", gap: 4, boxShadow: C.shadow }}>
          <PencilLine size={17} /><span style={{ fontSize: 11.5 }}>Log past night</span>
        </button>
      </div>

      {micState === "denied" && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
          Movement sensing needs mic access (often blocked in this preview) — no problem, the smart alarm still uses the sleep-cycle model.
        </div>
      )}

      {showManual && (
        <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
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
        <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}><AlarmClock size={16} color={C.greenSoft} /> Smart alarm</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
          <span style={{ fontSize: 13, color: C.inkSoft }}>Latest wake time</span>
          <input type="time" value={alarm.latest} onChange={(e) => onSaveAlarm({ ...alarm, latest: e.target.value })} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "7px 10px", fontFamily: "DM Sans", fontSize: 14, background: C.bg }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
          <span style={{ fontSize: 13, color: C.inkSoft }}>Wake window</span>
          <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
            {[15, 30, 45].map((w) => (
              <button key={w} onClick={() => onSaveAlarm({ ...alarm, window: w })} className="sprig-tap"
                style={{ border: "none", cursor: "pointer", padding: "6px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: alarm.window === w ? C.card : "transparent", color: alarm.window === w ? C.green : C.muted }}>{w}m</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
          Wakes you at the end of a sleep cycle between {minToLabel(hmToMin(alarm.latest) - alarm.window)} and {alarm.latest} so you rise during light sleep, not mid-dream.
        </div>
      </div>

      {/* history */}
      {sleepLogs.length > 1 && (
        <>
          <div style={{ margin: "18px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>Recent nights</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...sleepLogs].reverse().slice(0, 8).map((l) => (
              <div key={l.id} style={{ background: C.card, borderRadius: 13, padding: "10px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, textAlign: "center" }}>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: l.score >= 80 ? C.greenSoft : l.score >= 60 ? C.amber : C.coral }}>{l.score}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{durLabel(l.durationMin)}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{new Date(l.waketime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                </div>
                <button className="sprig-tap" onClick={() => onRemove(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ height: 6 }} />
    </div>
  );
}
function sleepTip(log, debtMin, need) {
  if (log.durationMin < need - 60) return "Short night. Aim to be in bed 30–60 min earlier tonight to start clearing the deficit.";
  if (log.restlessness > 55) return "Restless sleep — a cooler, darker room and no screens before bed can deepen it.";
  if (log.stages.deep < log.durationMin * 0.13) return "Deep sleep ran low. Avoid late caffeine and alcohol, and keep a steady bedtime.";
  if (debtMin > 240) return "Good night, but you're still in debt — a few consistent early nights will reset your energy.";
  return "Solid, restorative night. Keep your wake time consistent to lock in the rhythm.";
}

/* ---------------- Energy tab (Rise-style timeline) -------------- */
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
      <div style={{ background: C.card, borderRadius: 20, padding: "14px 12px 8px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.leaf} stopOpacity="0.45" />
              <stop offset="100%" stopColor={C.leaf} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {/* gym window highlight */}
          {gym && <rect x={x(gym.start)} y={top} width={x(gym.end) - x(gym.start)} height={H - top - bot} fill={C.green} opacity="0.08" rx="4" />}
          <path d={area} fill="url(#eg)" />
          <path d={line} fill="none" stroke={C.green} strokeWidth="2.4" strokeLinejoin="round" />
          {/* meal markers */}
          {mealMarks.map((m, i) => (
            <g key={i}>
              <line x1={x(m.min)} y1={top} x2={x(m.min)} y2={H - bot} stroke={C.amber} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
              <circle cx={x(m.min)} cy={H - bot} r="3.5" fill={C.amber} />
            </g>
          ))}
          {/* gym marker */}
          {gym && <g><circle cx={x(gym.start + 45)} cy={y(gym.avg)} r="5" fill={C.green} stroke="#fff" strokeWidth="2" /></g>}
          {/* now line */}
          {showNow && <line x1={x(nowMin)} y1={top} x2={x(nowMin)} y2={H - bot} stroke={C.coral} strokeWidth="1.5" />}
          {/* hour labels */}
          {curve.filter((p) => p.min % 180 === 0 || (p.min - minX) % 180 < 15).slice(0, 6).map((p, i) => (
            <text key={i} x={x(p.min)} y={H - 6} fontSize="9" fill={C.muted} textAnchor="middle" fontFamily="DM Sans">{minToLabel(p.min).replace(":00", "")}</text>
          ))}
        </svg>
        <div style={{ display: "flex", gap: 14, padding: "4px 6px 2px", flexWrap: "wrap" }}>
          <Legend c={C.green} label="Energy" />
          <Legend c={C.amber} label="Meals logged" />
          {gym && <Legend c={C.green} label="Gym window" faded />}
          {showNow && <Legend c={C.coral} label="Now" />}
        </div>
      </div>

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

/* ---------------- Me / profile tab -------------- */
function MeTab({ profile, targets, onSave, onGoHealth, onGoMind, onExportJSON, onExportCSV, onImportJSON, onResetData, onLoadDemo, reminders, onSaveReminders, sleepInfo }) {
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

      {/* display mode */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "20px 2px 10px" }}>Display</div>
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

      {/* health link */}
      {onGoHealth && (
        <>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "20px 2px 10px" }}>Health</div>
          <button className="sprig-tap" onClick={onGoHealth} style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, boxShadow: C.shadow, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: C.greenSoft + "22", display: "grid", placeItems: "center", flexShrink: 0 }}><HeartPulse size={18} color={C.greenSoft} /></div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Health markers</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Blood pressure, resting HR, symptoms, and optional blood work.</div>
            </div>
            <ChevronRight size={18} color={C.muted} />
          </button>
          {onGoMind && (
            <button className="sprig-tap" onClick={onGoMind} style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 16, boxShadow: C.shadow, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, marginTop: 9 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: C.greenSoft + "22", display: "grid", placeItems: "center", flexShrink: 0 }}><Sparkles size={18} color={C.greenSoft} /></div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Mind &amp; habits</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Mood &amp; focus check-in, habit tracker, focus timer.</div>
              </div>
              <ChevronRight size={18} color={C.muted} />
            </button>
          )}
        </>
      )}

      <button className="sprig-tap" onClick={() => { onSave(p); setSaved(true); }}
        style={{ ...btn(saved ? C.greenSoft : C.green, "#fff"), width: "100%", padding: "14px 0", marginTop: 16 }}>
        {saved ? <><Check size={16} /> Saved</> : "Save targets"}
      </button>

      {/* REMINDERS */}
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
          style={{ width: "100%", background: "linear-gradient(150deg,#3E7B53,#2C4636)", border: "none", cursor: "pointer", borderRadius: 14, padding: "12px 14px", color: "#fff", display: "flex", alignItems: "center", gap: 11, marginBottom: 12, boxShadow: C.shadow }}>
          <Sparkles size={17} color="#E7DCC6" />
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Ask the coach</div>
            <div style={{ fontSize: 11, opacity: .85, marginTop: 1 }}>Free-form questions about your data — uses AI</div>
          </div>
          <ChevronRight size={16} />
        </button>
      )}

      {/* WHY AM I NOT PROGRESSING — headline diagnostic */}
      {diag && (diag.enough ? (
        <div style={{ background: "linear-gradient(150deg,#2C4636,#1C2B22)", borderRadius: 20, padding: 18, color: "#fff", boxShadow: C.shadow, marginBottom: 12 }}>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,.55)", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ maxWidth: 440, margin: "60px auto 0", background: C.card, borderRadius: 18, padding: 14, maxHeight: "75vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 28px rgba(0,0,0,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Search size={17} color={C.muted} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus placeholder="Search foods, exercises, workouts, supplements, pain…"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontFamily: "DM Sans", fontSize: 14.5, color: C.ink }} />
          <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><X size={14} /></button>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,.55)", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ maxWidth: 440, margin: "40px auto 0", background: C.card, borderRadius: 20, padding: 16, boxShadow: "0 8px 28px rgba(0,0,0,.25)" }}>
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
function AskCoachSheet({ onClose, context, runAnalysis, online = true }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const ask = async (text) => {
    setBusy(true); setErr(""); setA(null);
    try {
      const reply = await runAnalysis(text, context);
      setA(reply);
    } catch (e) { setErr("Couldn't reach the coach. Try again in a moment."); }
    finally { setBusy(false); }
  };
  const presets = [
    "Why is my bench stalling?",
    "Why am I not gaining muscle?",
    "What should I improve this week?",
    "Should I cut, bulk, or maintain?",
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,.55)", zIndex: 60 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ maxWidth: 440, margin: "0 auto", position: "absolute", bottom: 0, left: 0, right: 0, background: C.card, borderRadius: "20px 20px 0 0", padding: "18px 18px 22px", paddingBottom: "calc(22px + env(safe-area-inset-bottom, 0px))", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Sparkles size={17} color={C.greenSoft} />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, flex: 1 }}>Ask the coach</div>
          <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><X size={14} /></button>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
          Free-form questions about your own data. Uses Claude in the Claude app; falls back to a local rule-based answer everywhere else.
          {!online && (
            <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", background: C.amber + "22", color: C.amber, borderRadius: 99, fontSize: 10.5, fontWeight: 600 }}>
              <Square size={10} /> Offline — using the local coach
            </div>
          )}
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
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink, minHeight: 60, resize: "vertical", lineHeight: 1.5 }} />
            <button className="sprig-tap" disabled={!q.trim()} onClick={() => ask(q)}
              style={{ ...btn(q.trim() ? C.green : C.bg2, q.trim() ? "#fff" : C.muted), width: "100%", padding: "12px 0", marginTop: 9 }}>
              <Sparkles size={14} /> Ask
            </button>
          </>
        )}
        {busy && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <Loader2 size={22} color={C.green} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Reading your data…</div>
          </div>
        )}
        {err && <div style={{ fontSize: 12, color: C.coral, marginTop: 12, padding: 11, background: "#fdeee8", borderRadius: 10, lineHeight: 1.5 }}>{err}</div>}
        {a && (
          <div className="sprig-pop">
            <div style={{ background: C.bg, borderRadius: 12, padding: 13, fontSize: 13, color: C.ink, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="sprig-tap" onClick={() => { setA(null); setQ(""); }} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0" }}>Ask another</button>
              <button className="sprig-tap" onClick={onClose} style={{ ...btn(C.green, "#fff"), flex: 1, padding: "10px 0" }}>Done</button>
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,.55)", zIndex: 60 }} onClick={onClose}>
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
  const trainedYes = (daily?.trainedToday) || false; // derived flag passed in via daily for simplicity
  const [trained, setTrained] = useState(trainedYes ? "yes" : null);
  const [protein, setProtein] = useState(null);
  const [slept, setSlept] = useState(null);
  const [walked, setWalked] = useState(null);
  const [pain, setPain] = useState(ci?.pain || null);
  const [w, setW] = useState("");

  const Q = ({ label, hint, value, opts, onPick }) => (
    <div style={{ background: C.bg, borderRadius: 13, padding: 13, marginBottom: 9 }}>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,.55)", display: "grid", placeItems: "flex-end center", zIndex: 50, padding: 0 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-pop"
        style={{ width: "100%", maxWidth: 440, background: C.card, borderRadius: "20px 20px 0 0", padding: "18px 18px 22px", paddingBottom: "calc(22px + env(safe-area-inset-bottom, 0px))", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 -8px 30px rgba(0,0,0,.18)" }}>
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

        <div style={{ background: C.bg, borderRadius: 13, padding: 13, marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>Weight today <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 400 }}>· optional</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input value={w} onChange={(e) => setW(e.target.value)} inputMode="decimal" placeholder={profile?.unit || "kg"}
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
    <div style={{ background: "linear-gradient(150deg,#2C4636,#1C2B22)", borderRadius: 20, padding: 18, color: "#fff", boxShadow: C.shadow }}>
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

function MindTab({ mindInfo, advanced, checkin, onCheckin, profile, onToggleHabit, onAddHabit, onRemoveHabit, onRestoreHabit, onLogFocus }) {
  const [adding, setAdding] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const [manage, setManage] = useState(false);
  const ci = checkin || {};
  const { habits, consistency, focusToday, focusWeek, focusMinutesToday, hiddenDefaults } = mindInfo;
  const doneCount = habits.filter((h) => h.done).length;

  return (
    <div className="sprig-rise">
      {/* DAILY CHECK-IN */}
      <div style={{ background: C.card, borderRadius: 20, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.inkSoft, fontWeight: 600, marginBottom: 6 }}>
          <Sparkles size={15} color={C.greenSoft} /> How are you today?
        </div>
        <CheckinRow label="Mood" value={ci.mood} onPick={(v) => onCheckin("mood", v)} opts={[["bad", "Bad", C.coral], ["okay", "Okay", C.amber], ["good", "Good", C.greenSoft]]} />
        <CheckinRow label="Energy" value={ci.energy} onPick={(v) => onCheckin("energy", v)} opts={[["low", "Low", C.coral], ["normal", "Normal", C.amber], ["high", "High", C.greenSoft]]} />
        <CheckinRow label="Focus" value={ci.focus} onPick={(v) => onCheckin("focus", v)} opts={[["low", "Low", C.coral], ["normal", "Normal", C.amber], ["high", "High", C.greenSoft]]} />
        <CheckinRow label="Stress" value={ci.stress} onPick={(v) => onCheckin("stress", v)} opts={[["low", "Low", C.greenSoft], ["medium", "Med", C.amber], ["high", "High", C.coral]]} />
        {advanced && <>
          <CheckinRow label="Motiv." value={ci.motivation} onPick={(v) => onCheckin("motivation", v)} opts={[["low", "Low", C.coral], ["normal", "Normal", C.amber], ["high", "High", C.greenSoft]]} />
          <CheckinRow label="Confid." value={ci.confidence} onPick={(v) => onCheckin("confidence", v)} opts={[["low", "Low", C.coral], ["normal", "Normal", C.amber], ["high", "High", C.greenSoft]]} />
        </>}
      </div>

      {/* WEEKLY CONSISTENCY */}
      <div style={{ background: "linear-gradient(150deg,#2C4636,#1C2B22)", borderRadius: 20, padding: 18, color: "#fff", boxShadow: C.shadow, marginTop: 12, display: "flex", alignItems: "center", gap: 16 }}>
        <Ring value={consistency.pct} max={100} size={78} stroke={9} label={consistency.pct + "%"} sub="this week"
          color={consistency.pct >= 70 ? C.leaf : consistency.pct >= 40 ? C.amber : C.coralSoft} track="rgba(255,255,255,.15)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, opacity: .75, letterSpacing: .3 }}>HABIT CONSISTENCY</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, marginTop: 1 }}>
            {consistency.pct >= 80 ? "Dialed in" : consistency.pct >= 55 ? "Solid week" : consistency.pct >= 30 ? "Building" : "Fresh start"}
          </div>
          {consistency.best && consistency.best.hits > 0 && (
            <div style={{ fontSize: 11.5, opacity: .85, marginTop: 5 }}>🏆 Best: {consistency.best.label} ({consistency.best.hits}/{consistency.best.total})</div>
          )}
          {consistency.weakest && consistency.weakest.hits < consistency.weakest.total && consistency.weakest.label !== consistency.best?.label && (
            <div style={{ fontSize: 11.5, opacity: .85, marginTop: 2 }}>📌 Work on: {consistency.weakest.label} ({consistency.weakest.hits}/{consistency.weakest.total})</div>
          )}
        </div>
      </div>

      {/* FOCUS TIMER */}
      <div style={{ marginTop: 12 }}><FocusTimer onLogFocus={onLogFocus} /></div>
      {(focusToday.length > 0 || focusWeek.length > 0) && (
        <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
          <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 13px", boxShadow: C.shadow }}>
            <div style={{ fontSize: 11, color: C.muted }}>Today</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700 }}>{focusMinutesToday} <span style={{ fontSize: 11, color: C.muted }}>min</span></div>
            <div style={{ fontSize: 10.5, color: C.muted }}>{focusToday.length} session{focusToday.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 13px", boxShadow: C.shadow }}>
            <div style={{ fontSize: 11, color: C.muted }}>This week</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700 }}>{Math.round(focusWeek.reduce((a, f) => a + f.minutes, 0) / 60 * 10) / 10} <span style={{ fontSize: 11, color: C.muted }}>h</span></div>
            <div style={{ fontSize: 10.5, color: C.muted }}>{focusWeek.length} session{focusWeek.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
      )}

      {/* HABITS */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "20px 2px 10px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>Today's habits <span style={{ fontSize: 12, color: C.muted, fontFamily: "DM Sans" }}>· {doneCount}/{habits.length}</span></div>
        <button className="sprig-tap" onClick={() => setManage((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: C.green, fontSize: 12, fontWeight: 600 }}>{manage ? "Done" : "Edit"}</button>
      </div>
      {/* Goal-based habit suggestions (only when active habit list is thin) */}
      {profile?.goal && habits.length < 3 && (() => {
        const sugg = suggestedHabitsFor(profile).filter((k) => !habits.some((h) => h.id === k || (h.label || "").toLowerCase() === (HABIT_META[k]?.name || "").toLowerCase()));
        if (!sugg.length) return null;
        return (
          <div style={{ background: C.greenSoft + "12", border: `1px solid ${C.greenSoft}55`, borderRadius: 13, padding: "11px 13px", marginBottom: 10 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: C.green, marginBottom: 6 }}>
              💡 Suggested for your goal ({profile.goal === "gain" ? "muscle gain" : profile.goal === "lose" ? "fat loss" : "maintain"})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {sugg.map((k) => {
                const meta = HABIT_META[k];
                if (!meta) return null;
                return (
                  <button key={k} className="sprig-tap" onClick={() => onAddHabit(meta.name)}
                    style={{ background: C.card, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 8, padding: "6px 10px", fontSize: 11.5, fontWeight: 600, fontFamily: "DM Sans", color: C.inkSoft }}>
                    + {meta.icon} {meta.name}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
              Tap to add. You can edit or remove any time.
            </div>
          </div>
        );
      })()}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {habits.map((h) => (
          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 11, background: h.done ? C.green + "0d" : C.card, border: `1px solid ${h.done ? C.leaf + "55" : C.line}`, borderRadius: 13, padding: "11px 13px", boxShadow: C.shadow }}>
            <button className="sprig-tap" disabled={h.auto} onClick={() => !h.auto && onToggleHabit(h.id)}
              style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, border: h.done ? "none" : `2px solid ${C.line}`, background: h.done ? C.green : "transparent", cursor: h.auto ? "default" : "pointer", display: "grid", placeItems: "center", color: "#fff" }}>
              {h.done && <Check size={15} />}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: h.done ? C.ink : C.inkSoft }}>{h.label}</div>
              {h.auto && <div style={{ fontSize: 10.5, color: C.muted }}>auto · {h.done ? "completed from your data" : "tracked automatically"}</div>}
            </div>
            {manage && <button className="sprig-tap" onClick={() => onRemoveHabit(h.id)} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>

      {/* add habit + restore hidden */}
      {manage && (
        <div style={{ marginTop: 10 }}>
          {adding ? (
            <div style={{ display: "flex", gap: 7 }}>
              <input value={newHabit} onChange={(e) => setNewHabit(e.target.value)} autoFocus placeholder="New habit (e.g. French, Skincare, Meditate)"
                style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink }} />
              <button className="sprig-tap" disabled={!newHabit.trim()} onClick={() => { onAddHabit(newHabit); setNewHabit(""); setAdding(false); }}
                style={{ ...btn(newHabit.trim() ? C.green : C.bg2, newHabit.trim() ? "#fff" : C.muted), padding: "10px 14px", fontSize: 13 }}>Add</button>
            </div>
          ) : (
            <button className="sprig-tap" onClick={() => setAdding(true)} style={{ width: "100%", background: C.card, border: `1px dashed ${C.line}`, borderRadius: 12, padding: "11px 0", cursor: "pointer", color: C.green, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans" }}>
              <Plus size={15} /> Add custom habit
            </button>
          )}
          {hiddenDefaults.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Removed — tap to restore:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {hiddenDefaults.map((h) => (
                  <button key={h.id} className="sprig-tap" onClick={() => onRestoreHabit(h.id)}
                    style={{ border: `1px solid ${C.line}`, background: C.bg2, cursor: "pointer", padding: "6px 11px", borderRadius: 8, fontSize: 12, color: C.inkSoft, fontFamily: "DM Sans" }}>+ {h.label}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 16, lineHeight: 1.5, padding: "0 12px" }}>
        Auto habits tick themselves from your water, protein, steps, workouts, and supplements. This is a wellbeing tracker, not a mental-health diagnosis — be kind to yourself. 🌿
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

function HealthTab({ healthInfo, advanced, onSave, safety, pain, onAddPain, onUpdatePain, onRemovePain }) {
  const latest = healthInfo?.latest || {};
  const radar = healthInfo?.radar || [];
  const series = healthInfo?.series || [];

  // local input state
  const [bpS, setBpS] = useState(latest.bpSys?.value != null ? String(latest.bpSys.value) : "");
  const [bpD, setBpD] = useState(latest.bpDia?.value != null ? String(latest.bpDia.value) : "");
  const [rhr, setRhr] = useState(latest.rhr?.value != null ? String(latest.rhr.value) : "");
  const [symptoms, setSymptoms] = useState(latest.symptoms?.value || "");
  const [showBlood, setShowBlood] = useState(false);
  const [bloodDraft, setBloodDraft] = useState({});
  const [painOpen, setPainOpen] = useState(false);
  const [editingPain, setEditingPain] = useState(null);

  const saveVitals = () => {
    const patch = {};
    if (bpS && bpD) { patch.bpSys = +bpS; patch.bpDia = +bpD; }
    if (rhr) patch.rhr = +rhr;
    if (symptoms.trim() !== (latest.symptoms?.value || "")) patch.symptoms = symptoms.trim();
    if (Object.keys(patch).length) onSave(patch);
  };
  const saveBlood = () => {
    const out = {};
    Object.entries(bloodDraft).forEach(([k, v]) => { const n = parseFloat(v); if (!isNaN(n)) out[k] = +n.toFixed(2); });
    if (Object.keys(out).length) { onSave({ blood: out }); setBloodDraft({}); setShowBlood(false); }
  };
  // recent BP trend for sparkline
  const bpSeries = series.filter((h) => h.bpSys != null && h.bpDia != null).slice(-14);

  // group radar by tag severity
  const ORDER = { high: 0, elevated: 1, moderate: 2, low: 3, unknown: 4 };
  const sortedRadar = [...radar].sort((a, b) => ORDER[a.tag] - ORDER[b.tag]);
  const flagged = sortedRadar.filter((r) => r.tag === "high" || r.tag === "elevated");

  return (
    <div className="sprig-rise">
      {/* RED-FLAG / URGENT banner */}
      {safety?.urgent && (
        <div style={{ background: "#C0392B", color: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: C.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14.5 }}>
            <HeartPulse size={18} /> {safety.hasCrisis ? "Please reach out for support now" : "This could be serious"}
          </div>
          <div style={{ fontSize: 12.5, opacity: .95, marginTop: 7, lineHeight: 1.5 }}>
            {safety.hasCrisis
              ? "If you're thinking about harming yourself, you're not alone and help is available right now. Contact a local crisis line or emergency services — in many countries you can call or text 988 (US), 112 (EU), or your local emergency number."
              : "Based on what you logged, consider urgent medical help — call your local emergency number or get to urgent care. Sprig can't assess symptoms; when in doubt, get checked."}
          </div>
          {!safety.hasCrisis && (safety.redFlags.length > 0 || safety.bpFlag) && (
            <div style={{ fontSize: 11.5, opacity: .9, marginTop: 8, background: "rgba(255,255,255,.14)", borderRadius: 9, padding: "8px 10px" }}>
              Flagged: {[...safety.redFlags.map((f) => f.text), safety.bpFlag?.text].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      )}

      {/* interaction flags */}
      {safety?.interactions?.length > 0 && (
        <div style={{ background: "#fdeee8", border: `1px solid ${C.coral}44`, borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 12.5, color: "#9a3d22", marginBottom: 6 }}>
            <Pill size={15} color={C.coral} /> Things to check
          </div>
          {safety.interactions.map((txt, i) => (
            <div key={i} style={{ fontSize: 11.5, color: "#9a3d22", lineHeight: 1.5, display: "flex", gap: 6, marginTop: i ? 5 : 0 }}>
              <span>•</span><span>{txt}</span>
            </div>
          ))}
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 7 }}>Not medical advice — Sprig flags combinations to ask a pharmacist or doctor about. It never recommends doses.</div>
        </div>
      )}

      {/* HERO: latest vitals */}
      <div style={{ background: C.card, borderRadius: 20, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 11 }}>
          <HeartPulse size={15} color={C.coral} /> Latest readings
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: C.bg, borderRadius: 12, padding: "11px 12px" }}>
            <div style={{ fontSize: 11, color: C.muted }}>Blood pressure</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              {latest.bpSys?.value != null && latest.bpDia?.value != null
                ? `${latest.bpSys.value}/${latest.bpDia.value}` : "—"}
              <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>mmHg</span>
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{latest.bpSys?.date || "Not logged"}</div>
          </div>
          <div style={{ background: C.bg, borderRadius: 12, padding: "11px 12px" }}>
            <div style={{ fontSize: 11, color: C.muted }}>Resting HR</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              {latest.rhr?.value != null ? latest.rhr.value : "—"}
              <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>bpm</span>
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{latest.rhr?.date || "Not logged"}</div>
          </div>
        </div>

        {/* BP sparkline */}
        {bpSeries.length >= 2 && (() => {
          const W = 320, H = 50, p = 4;
          const sysMax = Math.max(...bpSeries.map((s) => s.bpSys)), sysMin = Math.min(...bpSeries.map((s) => s.bpSys));
          const range = (sysMax - sysMin) || 1;
          const x = (i) => p + (i / (bpSeries.length - 1)) * (W - 2 * p);
          const y = (v) => p + (1 - (v - sysMin) / range) * (H - 2 * p);
          const path = bpSeries.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s.bpSys).toFixed(1)}`).join(" ");
          return (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Systolic trend</div>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 50, display: "block" }} preserveAspectRatio="none">
                <path d={path} fill="none" stroke={C.coral} strokeWidth="2.2" strokeLinejoin="round" />
                {bpSeries.map((s, i) => <circle key={i} cx={x(i)} cy={y(s.bpSys)} r="2" fill={C.coral} />)}
              </svg>
            </div>
          );
        })()}

        {/* inputs */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8 }}>Log today's reading</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: C.inkSoft, width: 28 }}>BP</span>
            <input value={bpS} onChange={(e) => setBpS(e.target.value)} inputMode="numeric" placeholder="120"
              style={{ width: 58, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 4px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg }} />
            <span style={{ color: C.muted }}>/</span>
            <input value={bpD} onChange={(e) => setBpD(e.target.value)} inputMode="numeric" placeholder="80"
              style={{ width: 58, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 4px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg }} />
            <span style={{ fontSize: 12, color: C.inkSoft, marginLeft: 10 }}>RHR</span>
            <input value={rhr} onChange={(e) => setRhr(e.target.value)} inputMode="numeric" placeholder="60"
              style={{ width: 58, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 4px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg }} />
            <button className="sprig-tap" onClick={saveVitals}
              style={{ ...btn(C.green, "#fff"), padding: "8px 12px", fontSize: 13 }}><Check size={14} /> Save</button>
          </div>
        </div>
      </div>

      {/* RISK RADAR */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 11 }}>
          <Activity size={15} color={C.greenSoft} /> Risk radar
        </div>
        {sortedRadar.length === 0 ? (
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
            Log a few days of sleep, food, and your first BP reading to see your long-term health picture.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {sortedRadar.map((r) => {
              const t = RISK_TAG[r.tag] || RISK_TAG.unknown;
              return (
                <div key={r.key} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: t.color, flexShrink: 0, marginTop: 6 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{r.label}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: t.color, textTransform: "uppercase", letterSpacing: .4 }}>{t.label}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{r.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {flagged.length > 0 && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${C.line}`, lineHeight: 1.5 }}>
            ⚕️ <b>Not a diagnosis.</b> If anything here stays elevated, talk it through with a doctor — Sprig tracks trends, not medical conclusions.
          </div>
        )}
      </div>

      {/* SYMPTOMS / NOTES */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
        <div style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 8 }}>Symptoms &amp; notes</div>
        <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Anything off? Headaches, joint pain, dizziness, fatigue patterns…"
          style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontFamily: "DM Sans", fontSize: 13, color: C.ink, background: C.bg, minHeight: 52, resize: "vertical", lineHeight: 1.45 }} />
        <button className="sprig-tap" onClick={() => onSave({ symptoms: symptoms.trim() })}
          style={{ ...btn(C.green, "#fff"), padding: "8px 14px", fontSize: 12.5, marginTop: 9 }}>Save notes</button>
      </div>

      {/* PAIN & INJURY */}
      {onAddPain && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>
              <HeartPulse size={15} color={C.coral} /> Pain &amp; injury
            </div>
            {!painOpen && !editingPain && (
              <button className="sprig-tap" onClick={() => setPainOpen(true)}
                style={{ ...btn(C.bg2, C.green), padding: "6px 11px", fontSize: 12, borderRadius: 10 }}>
                <Plus size={13} /> Log pain
              </button>
            )}
          </div>

          {/* form (new or edit) */}
          {(painOpen || editingPain) && (
            <PainLogForm initial={editingPain}
              onCancel={() => { setPainOpen(false); setEditingPain(null); }}
              onSave={(entry) => {
                if (editingPain) onUpdatePain(editingPain.id, entry);
                else onAddPain(entry);
                setPainOpen(false); setEditingPain(null);
              }} />
          )}

          {/* active pain — cards grouped per location */}
          {!painOpen && !editingPain && pain?.summary?.active?.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .3, marginBottom: 7 }}>ACTIVE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pain.summary.active.map((a) => {
                  const lvl = PAIN_LEVELS[a.latest.level] || PAIN_LEVELS.mild;
                  const locLabel = PAIN_LOCATIONS.find(([k]) => k === a.location)?.[1] || a.location;
                  const trendIcon = a.trend === "improving" ? "↘" : a.trend === "worsening" ? "↗" : "→";
                  const trendColor = a.trend === "improving" ? C.greenSoft : a.trend === "worsening" ? C.coral : C.muted;
                  return (
                    <div key={a.location} style={{ background: lvl.color + "12", border: `1px solid ${lvl.color}44`, borderRadius: 12, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: lvl.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{locLabel}</span>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: lvl.color, textTransform: "uppercase", letterSpacing: .3 }}>{lvl.label}</span>
                            {a.recurring && <span style={{ fontSize: 10, color: C.coral, fontWeight: 700, background: C.coral + "1a", padding: "2px 6px", borderRadius: 4 }}>RECURRING</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                            {a.daysActive} day{a.daysActive > 1 ? "s" : ""} active · <span style={{ color: trendColor, fontWeight: 600 }}>{trendIcon} {a.trend}</span>
                            {a.latest.exercise ? ` · ${a.latest.exercise}` : ""}
                          </div>
                          {a.latest.note && <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 4, lineHeight: 1.45 }}>{a.latest.note}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                          <button className="sprig-tap" onClick={() => setEditingPain(a.latest)} title="Update"
                            style={{ background: C.bg2, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: C.inkSoft }}><PencilLine size={13} /></button>
                          <button className="sprig-tap" onClick={() => onUpdatePain(a.latest.id, { status: "resolved" })} title="Mark resolved"
                            style={{ background: C.greenSoft + "22", border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: C.green }}><Check size={14} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* coach lines (training mods) */}
              {pain.coach?.lines?.length > 0 && (
                <div style={{ marginTop: 10, padding: "10px 12px", background: C.bg, borderRadius: 11 }}>
                  <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, letterSpacing: .3, marginBottom: 5 }}>TRAINING MODS</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {pain.coach.lines.map((l, i) => (
                      <li key={i} style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5, display: "flex", gap: 7, padding: "2px 0" }}>
                        <span style={{ color: C.greenSoft }}>•</span><span>{l}</span>
                      </li>
                    ))}
                  </ul>
                  {pain.coach.seekHelp && (
                    <div style={{ fontSize: 11, color: C.coral, marginTop: 7, lineHeight: 1.5, paddingTop: 7, borderTop: `1px dashed ${C.line}` }}>
                      ⚕️ Sharp pain, swelling, or pain lasting 2+ weeks → see a doctor or physiotherapist. Sprig isn't medical advice.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* recent history (advanced or when there's something to show) */}
          {!painOpen && !editingPain && pain?.summary?.history?.length > 0 && advanced && (
            <details style={{ marginTop: pain?.summary?.active?.length ? 12 : 4 }}>
              <summary style={{ cursor: "pointer", listStyle: "none", fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: .3, padding: "4px 0" }}>▾ RECENT HISTORY ({pain.summary.history.length})</summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {pain.summary.history.slice(0, 12).map((h) => {
                  const lvl = PAIN_LEVELS[h.level] || PAIN_LEVELS.mild;
                  const locLabel = PAIN_LOCATIONS.find(([k]) => k === h.location)?.[1] || h.location || "Other";
                  return (
                    <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", background: C.bg, borderRadius: 9, fontSize: 11.5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: lvl.color, flexShrink: 0 }} />
                      <span style={{ color: C.inkSoft, fontWeight: 600 }}>{locLabel}</span>
                      <span style={{ color: lvl.color, fontWeight: 600, textTransform: "uppercase", fontSize: 10 }}>{lvl.label}</span>
                      <span style={{ color: C.muted, fontSize: 10.5, marginLeft: "auto" }}>{h.date}{h.status === "resolved" ? " · resolved" : ""}</span>
                      <button className="sprig-tap" onClick={() => onRemovePain(h.id)} title="Delete"
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2 }}><Trash2 size={12} /></button>
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          {/* empty state */}
          {!painOpen && !editingPain && !pain?.summary?.active?.length && !pain?.summary?.history?.length && (
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              No pain logged. Track any nagging issues here so Sprig can suggest exercises to avoid and track whether things are improving.
            </div>
          )}
        </div>
      )}

      {/* SMOKING — quick pick */}
      {advanced && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
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
      )}

      {/* BLOOD WORK — advanced */}
      {advanced && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
              <Pill size={15} color="#7A6FB0" /> Blood work
            </div>
            <button className="sprig-tap" onClick={() => setShowBlood((s) => !s)} style={{ ...btn(C.bg2, C.green), padding: "6px 11px", fontSize: 12, borderRadius: 10 }}>
              {showBlood ? "Close" : (latest.blood && Object.keys(latest.blood).length ? "Update" : "Add results")}
            </button>
          </div>
          {/* current values */}
          {latest.blood && Object.keys(latest.blood).length > 0 && !showBlood && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 12px" }}>
              {BLOOD_MARKERS.filter((b) => latest.blood[b.key] != null).map((b) => {
                const v = latest.blood[b.key].value;
                const f = bloodFlag(b.key, v);
                const col = f?.tag === "ok" ? C.greenSoft : f?.tag ? (f.tag === "high" || f.tag === "above" ? C.coral : C.amber) : C.muted;
                return (
                  <div key={b.key} style={{ background: C.bg, borderRadius: 11, padding: "9px 11px" }}>
                    <div style={{ fontSize: 11, color: C.muted }}>{b.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 2 }}>
                      <span style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: C.ink }}>{v}</span>
                      <span style={{ fontSize: 10.5, color: C.muted }}>{b.unit}</span>
                      <span style={{ fontSize: 10, color: col, fontWeight: 700, marginLeft: "auto", textTransform: "uppercase" }}>{f?.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {(!latest.blood || !Object.keys(latest.blood).length) && !showBlood && (
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              Add lab results when you get a panel done. Optional — Sprig will flag any markers outside common reference ranges.
            </div>
          )}
          {/* form */}
          {showBlood && (
            <div className="sprig-pop" style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                Enter only the markers from your most recent panel. Leave blank to keep the previous value.
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 12px", maxHeight: 320, overflowY: "auto" }}>
                {BLOOD_MARKERS.map((b) => (
                  <div key={b.key}>
                    <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 3 }}>{b.label}<span style={{ marginLeft: 4 }}>· {b.unit}</span></div>
                    <input value={bloodDraft[b.key] ?? ""} onChange={(e) => setBloodDraft((x) => ({ ...x, [b.key]: e.target.value }))} inputMode="decimal"
                      placeholder={latest.blood?.[b.key]?.value != null ? String(latest.blood[b.key].value) : ""}
                      style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 9px", fontFamily: "DM Sans", fontSize: 13, fontWeight: 600, background: C.bg, color: C.ink }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
                <button className="sprig-tap" onClick={() => { setShowBlood(false); setBloodDraft({}); }} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0" }}>Cancel</button>
                <button className="sprig-tap" disabled={!Object.values(bloodDraft).some((v) => v && v !== "")} onClick={saveBlood}
                  style={{ ...btn(Object.values(bloodDraft).some((v) => v && v !== "") ? C.green : C.bg2, Object.values(bloodDraft).some((v) => v && v !== "") ? "#fff" : C.muted), flex: 2, padding: "10px 0" }}><Check size={15} /> Save results</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14, lineHeight: 1.5, padding: "0 12px" }}>
        ⚕️ Sprig isn't a medical app and doesn't diagnose. It tracks trends so you and your doctor can spot patterns.
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

function ExerciseCard({ ex, exIdx, workouts, unit, customRests, advanced, sleepReadiness, daily, painLevel, painLocations, onLogSet, onRemoveSet, onRemoveEx, onSaveRest, onStartRest, onSetExercisePain }) {
  const meta = findEx(ex.name);
  const prog = progressionFor(workouts, ex.name, daily, sleepReadiness);  // richer: action + text + suggested w/reps
  const sug = prog || suggestNext(workouts, ex.name);                     // fall back to lightweight hint
  const last = ex.sets[ex.sets.length - 1];
  const [w, setW] = useState(last ? String(last.w) : sug ? String(sug.w) : "");
  const [reps, setReps] = useState(last ? String(last.reps) : sug ? String(sug.reps) : "");
  const [rir, setRir] = useState(2);
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
    onLogSet(exIdx, { w: W, reps: R, rir });
    onStartRest(ex.name);
  }
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
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
              {advanced && <span style={{ fontSize: 11, color: C.muted }}>RIR {s.rir ?? "–"}</span>}
              {advanced && <span style={{ marginLeft: "auto", fontSize: 11, color: C.greenSoft }}><Term k="e1RM" /> {Math.round(est1RM(s.w, s.reps))}</span>}
              <button className="sprig-tap" onClick={() => onRemoveSet(exIdx, i)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 2, marginLeft: advanced ? 0 : "auto" }}><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {sug && ex.sets.length === 0 && (() => {
        // color & icon by action (prog hint), or default for legacy sug shape
        const action = sug.action || "add_w";
        const styleMap = {
          add_w:   { c: C.greenSoft, ic: <ArrowUp size={13} /> },
          add_rep: { c: C.greenSoft, ic: <Plus size={13} /> },
          repeat:  { c: C.amber,     ic: <Repeat size={13} /> },
          back_off:{ c: C.amber,     ic: <Minus size={13} /> },
          hold:    { c: C.muted,     ic: <Square size={13} /> },
          deload:  { c: C.coral,     ic: <TrendingDown size={13} /> },
        };
        const sty = styleMap[action] || styleMap.add_w;
        const text = sug.text || sug.note;
        return (
          <div style={{ fontSize: 11.5, color: sty.c, marginTop: 9, display: "flex", alignItems: "flex-start", gap: 6, lineHeight: 1.45 }}>
            <span style={{ marginTop: 1 }}>{sty.ic}</span>
            <span><b>{sug.w}{unit} × {sug.reps}</b> — {text}</span>
          </div>
        );
      })()}

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
        <button className="sprig-tap" onClick={log} style={{ ...btn(C.green, "#fff"), flex: 1, padding: "10px 0" }}><Plus size={16} /> Add set</button>
      </div>

      {/* effort / RIR */}
      <div style={{ fontSize: 10.5, color: C.muted, margin: "10px 2px 5px", fontWeight: 600, letterSpacing: .2 }}>
        {advanced ? <>REPS IN RESERVE <Term k="RIR" /></> : "HOW HARD WAS IT?"}
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {(advanced ? RIR_OPTS : EFFORT_OPTS).map(([v, lbl]) => (
          <button key={v} onClick={() => setRir(+v)} className="sprig-tap"
            style={{ flex: 1, border: "none", cursor: "pointer", padding: "7px 0", borderRadius: 9, fontSize: 11, fontWeight: 600, fontFamily: "DM Sans", background: rir === +v ? C.green : C.bg2, color: rir === +v ? "#fff" : C.muted }}>{lbl}</button>
        ))}
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

function TrainTab({ workouts, active, profile, trainInfo, advanced, routines, onSaveRoutine, onDeleteRoutine, onUseTemplate, onStart, onAddExercise, onLogSet, onRemoveSet, onRemoveExercise, onFinish, onCancel, onSaveRest, onSetExercisePain, onGoBody, onGoHealth }) {
  const unit = profile.unit || "kg";
  const [picker, setPicker] = useState(false);
  const [rest, setRest] = useState(null);
  const [builder, setBuilder] = useState(null); // null | {} (new) | routine (edit)
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMobility, setShowMobility] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);
  const restLeft = rest ? Math.max(0, Math.round((rest.end - Date.now()) / 1000)) : 0;
  function startRest(exName) { const meta = findEx(exName); const secs = trainInfo.customRests[exName] ?? restDefault(meta); setRest({ exName, end: Date.now() + secs * 1000 }); }

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

        {rest && restLeft > 0 && (
          <div className="sprig-pop" style={{ background: "#27384d", borderRadius: 14, padding: "11px 16px", color: "#fff", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <Timer size={18} color="#BFD0FF" />
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, opacity: .75 }}>REST · {rest.exName}</div><div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }}>{fmtClock(restLeft)}</div></div>
            <button className="sprig-tap" onClick={() => setRest({ ...rest, end: rest.end + 15000 })} style={{ ...btn("rgba(255,255,255,.15)", "#fff"), padding: "7px 10px", fontSize: 12 }}>+15s</button>
            <button className="sprig-tap" onClick={() => setRest(null)} style={{ ...btn("rgba(255,255,255,.15)", "#fff"), padding: "7px 10px", fontSize: 12 }}>Skip</button>
          </div>
        )}

        {active.exercises.map((ex, i) => (
          <ExerciseCard key={i} ex={ex} exIdx={i} workouts={workouts} unit={unit} customRests={trainInfo.customRests} advanced={advanced}
            sleepReadiness={trainInfo.sleepReadiness} daily={trainInfo.daily}
            painLevel={trainInfo.pain?.level} painLocations={trainInfo.pain?.locations}
            onLogSet={onLogSet} onRemoveSet={onRemoveSet} onRemoveEx={onRemoveExercise} onSaveRest={onSaveRest} onStartRest={startRest}
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
        <div style={{ background: "linear-gradient(150deg,#2C4636,#1C2B22)", borderRadius: 20, padding: 16, color: "#fff", boxShadow: C.shadow, marginBottom: 12 }}>
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
        <button className="sprig-tap" onClick={() => onStart()} style={{ ...btn(C.green, "#fff"), flex: 2, padding: "16px 0", fontSize: 15.5 }}>
          <Play size={18} /> Start workout
        </button>
        <button className="sprig-tap" onClick={() => setBuilder({})} style={{ ...btn(C.card, C.green), flex: 1, padding: "16px 0", fontSize: 13.5, border: `1px solid ${C.greenSoft}`, boxShadow: C.shadow }}>
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
      <button className="sprig-tap" onClick={onGoBody} style={{ width: "100%", textAlign: "left", marginTop: 14, background: "linear-gradient(150deg,#2C4636,#1C2B22)", borderRadius: 18, padding: 16, color: "#fff", display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow, border: "none", cursor: "pointer" }}>
        <Ring value={trainInfo.bodyReadiness} max={100} size={64} stroke={8} label={trainInfo.bodyReadiness} sub="ready" color={trainInfo.bodyReadiness >= 70 ? C.leaf : trainInfo.bodyReadiness >= 45 ? C.amber : C.coralSoft} track="rgba(255,255,255,.15)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, opacity: .8 }}>TODAY'S READINESS</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700 }}>
            {trainInfo.bodyReadiness >= 70 ? "Push hard" : trainInfo.bodyReadiness >= 45 ? "Train moderate" : "Light / recover"}
          </div>
          <div style={{ fontSize: 11.5, opacity: .85, marginTop: 2 }}>{trainInfo.freshMuscles.length ? `Fresh: ${trainInfo.freshMuscles.slice(0, 3).join(", ")}` : "Most muscles still recovering"} →</div>
        </div>
      </button>

      {trainInfo.deload.suggest && (
        <div style={{ marginTop: 10, background: "#fdeee8", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <TrendingDown size={18} color={C.coral} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "#9a3d22", lineHeight: 1.45 }}>
            <b>Consider a deload week.</b> {trainInfo.deload.reasons.join(" · ")}. Drop volume ~40% for a week and let everything supercompensate.
          </div>
        </div>
      )}

      <VolumeCoach volume={trainInfo.volume} advanced={advanced} />

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

      {/* history */}
      {workouts.length > 0 ? (
        <>
          <div style={{ margin: "18px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>History</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[...workouts].reverse().slice(0, 8).map((w) => {
              const sets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
              return (
                <div key={w.id} style={{ background: C.card, borderRadius: 13, padding: "11px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Dumbbell size={15} color={C.greenSoft} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{new Date(w.ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span style={{ fontSize: 11.5, color: C.muted }}>{w.durationMin}m · {sets} sets</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>{w.exercises.map((e) => e.name).join(" · ")}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "26px 10px", lineHeight: 1.5 }}>
          No workouts yet. Tap <b>Start workout</b>, add an exercise, and log your first set — progressive-overload suggestions kick in from session two.
        </div>
      )}
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

function BodyTab({ workouts, profile, trainInfo, sleepInfo, advanced, weightSeries, measureSeries, photoLog, onLogWeight, onSaveMeasurement, onLogPhotoSet, onOpenPhotos, progressPhotosCount }) {
  const [section, setSection] = useState("progress"); // progress | strength
  const [mode, setMode] = useState("recovery"); // recovery | grade
  const [gradeMode, setGradeMode] = useState("relative"); // relative (my weight) | absolute (everyone)
  const [sel, setSel] = useState(null);
  const [showMeasure, setShowMeasure] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const rec = trainInfo.recovery;
  const rank = ranking(workouts, profile, gradeMode);
  const wStats = weightStats(weightSeries);
  const verdict = weightVerdict(wStats, profile.goal);
  const reminder = photoReminder(photoLog);
  const measureCur = measurementStats(measureSeries);

  const NEUTRAL = "#D8D0BE";
  const colorOf = (k) => {
    if (mode === "recovery") return rec[k].lastTs ? recoveryColor(rec[k].fatigue) : NEUTRAL;
    return rank[k].hasData ? rank[k].tier.color : NEUTRAL;
  };
  const selData = sel ? { name: MUSCLES.find(([k]) => k === sel)[1], rec: rec[sel], rank: rank[sel] } : null;
  const verdictColor = verdict.tag === "good" ? C.greenSoft : verdict.tag === "fast" ? C.coral : verdict.tag === "slow" ? C.amber : C.amber;

  return (
    <div className="sprig-rise">
      {/* section toggle */}
      <div style={{ display: "flex", gap: 6, background: C.bg2, padding: 4, borderRadius: 13, marginBottom: 12 }}>
        {[["progress", "Progress", <Activity size={15} />], ["strength", "Recovery & strength", <Crown size={15} />]].map(([s, lbl, ic]) => (
          <button key={s} onClick={() => setSection(s)} className="sprig-tap"
            style={{ flex: 1, border: "none", cursor: "pointer", padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans",
              background: section === s ? C.card : "transparent", color: section === s ? C.green : C.muted,
              boxShadow: section === s ? C.shadow : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {ic}{lbl}
          </button>
        ))}
      </div>

      {section === "progress" && (
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
                        <span style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700 }}>{m.current}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>cm</span>
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

      {section === "strength" && (
        <>
      {/* readiness header */}
      <div style={{ background: "linear-gradient(150deg,#2C4636,#1C2B22)", borderRadius: 20, padding: 18, color: "#fff", display: "flex", alignItems: "center", gap: 16, boxShadow: C.shadow }}>
        <Ring value={trainInfo.bodyReadiness} max={100} size={76} stroke={9} label={trainInfo.bodyReadiness} sub="ready"
          color={trainInfo.bodyReadiness >= 70 ? C.leaf : trainInfo.bodyReadiness >= 45 ? C.amber : C.coralSoft} track="rgba(255,255,255,.15)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700 }}>
            {trainInfo.bodyReadiness >= 70 ? "Greenlight" : trainInfo.bodyReadiness >= 45 ? "Train smart" : "Recover"}
          </div>
          <div style={{ fontSize: 12, opacity: .85, marginTop: 3, lineHeight: 1.45 }}>
            Sleep readiness {trainInfo.sleepReadiness}/100{sleepInfo.debtMin > 60 ? ` · ${durLabel(sleepInfo.debtMin)} debt slows recovery` : ""}.
          </div>
        </div>
      </div>

      {/* mode toggle */}
      <div style={{ display: "flex", gap: 6, background: C.bg2, padding: 4, borderRadius: 13, marginTop: 14 }}>
        {[["recovery", "Recovery", <RotateCcw size={15} />], ["grade", "Strength grade", <Crown size={15} />]].map(([m, lbl, ic]) => (
          <button key={m} onClick={() => { setMode(m); setSel(null); }} className="sprig-tap"
            style={{ flex: 1, border: "none", cursor: "pointer", padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", background: mode === m ? C.card : "transparent", color: mode === m ? C.green : C.muted, boxShadow: mode === m ? C.shadow : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{ic}{lbl}</button>
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
        {/* legend */}
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
                ? <span style={{ fontSize: 12.5, fontWeight: 700, color: rank[k].tier.color }}>{rank[k].tier.name} · top {Math.max(1, Math.round(100 - rank[k].pct))}%</span>
                : <span style={{ fontSize: 12, color: C.muted }}>—</span>
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
        <div style={{ background: "#fdeee8", borderRadius: 14, padding: "12px 14px", marginTop: 12, fontSize: 12.5, color: "#9a3d22", lineHeight: 1.5, display: "flex", gap: 10 }}>
          <TrendingDown size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><b>Under-recovery signs:</b> {trainInfo.deload.stalls.join(", ")} {trainInfo.deload.stalls.length === 1 ? "has" : "have"} stalled. Combined with poor sleep, that's the cue to back off before you burn out.</div>
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14, lineHeight: 1.5, padding: "0 8px" }}>
        Grades are estimated from published strength standards (your best est. 1RM vs bodyweight), not a live user database. Recovery blends your training load with your sleep data.
      </div>
      <div style={{ height: 6 }} />
        </>
      )}
    </div>
  );
}
