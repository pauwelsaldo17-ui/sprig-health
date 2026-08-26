// todayStr and uid are also defined in App.jsx — kept here for self-contained import
export const todayStr = (d) => (d instanceof Date ? d : new Date()).toLocaleDateString("en-CA");
export const uid = () => Math.random().toString(36).slice(2, 10);

export function safeParse(raw, fallback, validator) {
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
export const asArray = (v) => (Array.isArray(v) ? v : null);
export const asObject = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : null);

// Safe-default factories — used both at state init and when storage is missing/corrupt
export const DEFAULT_DAILY = {
  water: 0, steps: 0, weight: null, caffeine: 0,
  alcohol: 0, alcohol_g: 0,
  cardioMin: 0, cardioKcal: 0, cardioSessions: [],
  alcoholDrinks: [],
  activitySource: "manual",
  sedentary: 0, sweat: "normal",
  sportLog: {}, checkin: {},
};
export const DEFAULT_ALARM = { latest: "07:00", window: 30, enabled: true, mode: "smart", durationH: 8 };
export const DEFAULT_HABIT_CFG = { custom: [], hidden: [] };
export const DEFAULT_REMINDERS = {
  weightAM: false, water: false, supps: false, sleepRoutine: false,
  caffeineCutoff: false, progressPhoto: false, workout: false, weeklyReview: false,
};

// Migrate any older daily/profile/etc record up to the current schema.
// Adds missing keys with safe defaults; doesn't drop existing keys.
export function migrateDaily(d)    { return { ...DEFAULT_DAILY, ...(asObject(d) || {}) }; }
export function migrateAlarm(a)    { return { ...DEFAULT_ALARM, ...(asObject(a) || {}) }; }
export function migrateHabitCfg(c) { return { ...DEFAULT_HABIT_CFG, ...(asObject(c) || {}) }; }
export function migrateReminders(r){ return { ...DEFAULT_REMINDERS, ...(asObject(r) || {}) }; }
export function migrateProfile(p, defaultProfile) {
  const base = defaultProfile || {};
  return { ...base, ...(asObject(p) || {}) };
}

/* ---------------- nutrition math -------------- */
export function computeTargets(p) {
  const w   = (typeof p?.weight === "number" && isFinite(p.weight)  && p.weight  > 0) ? p.weight  : 72;
  const h   = (typeof p?.height === "number" && isFinite(p.height)  && p.height  > 0) ? p.height  : 178;
  const age = (typeof p?.age    === "number" && isFinite(p.age)     && p.age     > 0) ? p.age     : 18;
  const sex      = p?.sex      || "male";
  const activity = p?.activity || "moderate";
  const goal     = p?.goal     || "maintain";
  const bmr =
    sex === "female"
      ? 10 * w + 6.25 * h - 5 * age - 161
      : 10 * w + 6.25 * h - 5 * age + 5;
  const af = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[activity] || 1.375;
  let cals = bmr * af;
  if (goal === "lose") cals -= 450;
  if (goal === "gain") cals += 350;
  cals = Math.round(cals / 10) * 10;
  const proteinFactor = goal === "lose" ? 2.0 : goal === "gain" ? 1.9 : 1.7;
  const protein = Math.round(w * proteinFactor);
  const fat = Math.round((cals * 0.27) / 9);
  const carbs = Math.max(0, Math.round((cals - protein * 4 - fat * 9) / 4));
  return { calories: cals, protein, carbs, fat, fiber: 30 };
}

/* ---------------- movement + dynamic calorie adjustment -------------- */
// step goal scales a little with goal: cuts benefit from more NEAT
export function stepGoal(profile) {
  if (profile?.goal === "lose") return 10000;
  if (profile?.goal === "gain") return 7000;
  return 8000;
}
// estimate calories burned walking (rough: ~0.04 kcal per step per kg / 70)
export function stepsKcal(steps, weightKg) {
  if (!steps) return 0;
  return Math.round(steps * 0.045 * ((weightKg || 70) / 70));
}
// today's movement summary + a practical nudge
export function movementSummary({ daily, profile, trainedToday }) {
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
export const CARDIO_INTENSITY = { easy: 5, moderate: 8, hard: 11 };

// ── Sports library — MET values (easy/moderate/hard) + per-muscle impact (0=none 1=light 2=moderate 3=high) ──
export const SPORTS_LIBRARY = [
  // ---- TEAM SPORTS ----
  { id:"football",    name:"Football / Soccer", emoji:"⚽", cat:"team",
    met:{easy:5,moderate:7,hard:10},
    muscles:{quads:3,hamstrings:3,glutes:2,calves:3,abs:2,lower_back:1} },
  { id:"basketball",  name:"Basketball",        emoji:"🏀", cat:"team",
    met:{easy:4.5,moderate:6,hard:8},
    muscles:{quads:3,calves:3,glutes:2,hamstrings:2,shoulders:1,abs:2} },
  { id:"tennis",      name:"Tennis",            emoji:"🎾", cat:"team",
    met:{easy:4,moderate:6,hard:8},
    muscles:{shoulders:2,forearms:2,calves:2,quads:2,abs:2,back:1} },
  { id:"padel",       name:"Padel",             emoji:"🏓", cat:"team",
    met:{easy:4,moderate:5.5,hard:7.5},
    muscles:{shoulders:2,forearms:2,calves:2,quads:2,abs:2} },
  { id:"volleyball",  name:"Volleyball",        emoji:"🏐", cat:"team",
    met:{easy:3,moderate:4.5,hard:6},
    muscles:{shoulders:2,calves:2,quads:2,abs:1,back:1} },
  { id:"rugby",       name:"Rugby",             emoji:"🏉", cat:"team",
    met:{easy:6,moderate:8,hard:11},
    muscles:{quads:3,hamstrings:2,glutes:2,shoulders:2,chest:1,abs:2,back:2} },
  { id:"handball",    name:"Handball",          emoji:"🤾", cat:"team",
    met:{easy:5,moderate:7,hard:9},
    muscles:{shoulders:2,quads:2,calves:2,abs:2,forearms:1} },
  { id:"hockey",      name:"Hockey",            emoji:"🏒", cat:"team",
    met:{easy:5,moderate:7,hard:9},
    muscles:{quads:3,glutes:2,hamstrings:2,calves:2,abs:2,back:1} },
  { id:"badminton",   name:"Badminton",         emoji:"🏸", cat:"team",
    met:{easy:3.5,moderate:5.5,hard:7.5},
    muscles:{shoulders:2,forearms:2,quads:2,calves:2,abs:1} },
  // ---- COMBAT SPORTS ----
  { id:"boxing",      name:"Boxing",            emoji:"🥊", cat:"combat",
    met:{easy:6,moderate:9,hard:12},
    muscles:{shoulders:3,chest:2,triceps:2,back:2,biceps:1,abs:3,calves:2} },
  { id:"kickboxing",  name:"Kickboxing",        emoji:"🥊", cat:"combat",
    met:{easy:6,moderate:9,hard:12},
    muscles:{shoulders:3,quads:2,calves:2,abs:3,chest:2,triceps:1} },
  { id:"muay_thai",   name:"Muay Thai",         emoji:"🥋", cat:"combat",
    met:{easy:6,moderate:9,hard:12},
    muscles:{shoulders:3,quads:2,calves:2,abs:3,chest:2,triceps:1,hamstrings:1} },
  { id:"mma",         name:"MMA",               emoji:"🥋", cat:"combat",
    met:{easy:6,moderate:9,hard:13},
    muscles:{back:3,shoulders:3,chest:2,biceps:2,abs:3,quads:2,hamstrings:2,glutes:1} },
  { id:"wrestling",   name:"Wrestling",         emoji:"🤼", cat:"combat",
    met:{easy:5,moderate:8,hard:11},
    muscles:{back:3,biceps:3,shoulders:3,chest:2,abs:3,glutes:2,hamstrings:2,quads:2} },
  { id:"bjj",         name:"BJJ",               emoji:"🥋", cat:"combat",
    met:{easy:5,moderate:8,hard:11},
    muscles:{back:3,biceps:3,shoulders:3,chest:2,abs:3,glutes:2,hamstrings:2,quads:2,forearms:2} },
  { id:"judo",        name:"Judo",              emoji:"🥋", cat:"combat",
    met:{easy:4.5,moderate:7,hard:10},
    muscles:{back:3,shoulders:3,biceps:2,forearms:2,abs:2,glutes:1,quads:1} },
  // ---- CARDIO / ENDURANCE ----
  { id:"running",     name:"Running",           emoji:"🏃", cat:"cardio",
    met:{easy:7,moderate:9.8,hard:12},
    muscles:{quads:3,hamstrings:2,glutes:2,calves:3,abs:1} },
  { id:"jogging",     name:"Jogging",           emoji:"🏃", cat:"cardio",
    met:{easy:5,moderate:7,hard:9},
    muscles:{quads:2,hamstrings:2,glutes:2,calves:2,abs:1} },
  { id:"sprints",     name:"Sprint intervals",  emoji:"⚡", cat:"cardio",
    met:{easy:9,moderate:12,hard:15},
    muscles:{quads:3,hamstrings:3,glutes:3,calves:3,abs:2} },
  { id:"walking",     name:"Walking",           emoji:"🚶", cat:"cardio",
    met:{easy:2.8,moderate:3.5,hard:4.3},
    muscles:{quads:1,hamstrings:1,glutes:1,calves:1} },
  { id:"hiking",      name:"Hiking",            emoji:"🥾", cat:"cardio",
    met:{easy:4,moderate:5.5,hard:7},
    muscles:{quads:2,glutes:2,hamstrings:2,calves:2,lower_back:1} },
  { id:"cycling",     name:"Cycling",           emoji:"🚴", cat:"cardio",
    met:{easy:4,moderate:7,hard:10},
    muscles:{quads:3,glutes:2,calves:2,hamstrings:2,abs:1} },
  { id:"stationary_bike", name:"Stationary bike", emoji:"🚴", cat:"cardio",
    met:{easy:4,moderate:7,hard:10},
    muscles:{quads:3,glutes:2,calves:2,hamstrings:2,abs:1} },
  { id:"swimming",    name:"Swimming",          emoji:"🏊", cat:"cardio",
    met:{easy:5,moderate:7,hard:10},
    muscles:{back:3,shoulders:3,chest:2,triceps:2,abs:2,quads:1,hamstrings:1} },
  { id:"rowing",      name:"Rowing",            emoji:"🚣", cat:"cardio",
    met:{easy:4.5,moderate:7,hard:9},
    muscles:{back:3,biceps:2,shoulders:2,abs:2,quads:2,glutes:2,hamstrings:2} },
  { id:"elliptical",  name:"Elliptical",        emoji:"🏃", cat:"cardio",
    met:{easy:4,moderate:5.5,hard:7.5},
    muscles:{quads:2,glutes:2,hamstrings:1,calves:1,abs:1} },
  { id:"stairmaster", name:"Stairmaster",       emoji:"🪜", cat:"cardio",
    met:{easy:5,moderate:7,hard:9},
    muscles:{quads:3,glutes:3,calves:3,hamstrings:2,abs:1} },
  { id:"jumprope",    name:"Jump rope",         emoji:"⚡", cat:"cardio",
    met:{easy:8,moderate:11,hard:14},
    muscles:{calves:3,quads:2,shoulders:1,abs:2} },
  // ---- GYM / CONDITIONING ----
  { id:"hiit",        name:"HIIT",              emoji:"🔥", cat:"gym",
    met:{easy:7,moderate:9,hard:12},
    muscles:{quads:2,glutes:2,abs:3,shoulders:2,chest:1,calves:2} },
  { id:"circuit",     name:"Circuit training",  emoji:"🔄", cat:"gym",
    met:{easy:6,moderate:8,hard:10},
    muscles:{quads:2,chest:2,back:2,shoulders:2,abs:2,calves:1} },
  { id:"crosstraining", name:"Cross-training",  emoji:"💪", cat:"gym",
    met:{easy:6,moderate:8,hard:10},
    muscles:{quads:2,back:2,shoulders:2,abs:2,chest:1} },
  { id:"bodyweight",  name:"Bodyweight training",emoji:"💪", cat:"gym",
    met:{easy:4,moderate:6,hard:8},
    muscles:{chest:2,triceps:2,quads:2,shoulders:2,abs:2,back:1} },
  { id:"mobility",    name:"Mobility",          emoji:"🧘", cat:"gym",
    met:{easy:2,moderate:2.5,hard:3},
    muscles:{abs:1,lower_back:1,glutes:1,shoulders:1} },
  { id:"stretching",  name:"Stretching",        emoji:"🧘", cat:"gym",
    met:{easy:1.5,moderate:2,hard:2.5},
    muscles:{} },
  { id:"yoga",        name:"Yoga",              emoji:"🧘", cat:"gym",
    met:{easy:2.5,moderate:3,hard:4},
    muscles:{abs:1,lower_back:1,glutes:1,shoulders:1,back:1} },
  { id:"pilates",     name:"Pilates",           emoji:"🧘", cat:"gym",
    met:{easy:3,moderate:4,hard:5},
    muscles:{abs:2,lower_back:2,glutes:1,back:1} },
  // ---- OTHER ----
  { id:"climbing",    name:"Climbing",          emoji:"🧗", cat:"other",
    met:{easy:6,moderate:8,hard:11},
    muscles:{back:3,biceps:3,forearms:3,shoulders:2,abs:2,quads:1} },
  { id:"skiing",      name:"Skiing",            emoji:"⛷", cat:"other",
    met:{easy:5,moderate:7,hard:9},
    muscles:{quads:3,glutes:2,hamstrings:2,abs:2,calves:2} },
  { id:"skating",     name:"Skating",           emoji:"⛸", cat:"other",
    met:{easy:5,moderate:7,hard:9},
    muscles:{quads:2,glutes:2,calves:2,abs:1,hamstrings:1} },
  { id:"dancing",     name:"Dancing",           emoji:"💃", cat:"other",
    met:{easy:3,moderate:5,hard:7},
    muscles:{quads:1,calves:2,abs:1,glutes:1} },
];

/** Calorie estimate: MET × bodyWeightKg × durationHours */
export function sportKcal(sport, durationMin, intensity, weightKg) {
  if (!sport || !durationMin) return 0;
  const met = sport.met?.[intensity] ?? sport.met?.moderate ?? 5;
  const wt = weightKg || 70;
  return Math.round(met * wt * (durationMin / 60));
}

/** Per-muscle fatigue contribution (0–85%) from a sport session.
 *  Impact levels: 1=light→20%, 2=moderate→45%, 3=high→70%.
 *  Scaled by intensity and duration (60min base). */
export function sportMuscleImpact(sport, durationMin, intensity) {
  if (!sport?.muscles) return {};
  const iF = {easy:0.65, moderate:1.0, hard:1.35}[intensity] || 1.0;
  const dF = Math.min(2.0, (durationMin || 60) / 60);
  const BASE = {1:20, 2:45, 3:70};
  const result = {};
  Object.entries(sport.muscles).forEach(([k, level]) => {
    if (!level) return;
    result[k] = Math.min(85, Math.round((BASE[level] || 0) * iF * dF));
  });
  return result;
}
// alcohol drink presets — alcohol_g is what feeds recovery logic
export const DRINK_PRESETS = [
  { id: "beer250",    name: "Beer 250ml",            kcal: 105, carbs: 8,  alcohol_g: 10 },
  { id: "beer330",    name: "Beer 330ml",            kcal: 145, carbs: 11, alcohol_g: 13 },
  { id: "beer500",    name: "Beer 500ml",            kcal: 220, carbs: 16, alcohol_g: 20 },
  { id: "beerStrong", name: "Strong beer 330ml",     kcal: 230, carbs: 18, alcohol_g: 22 },
  { id: "wine150",    name: "Wine 150ml",            kcal: 120, carbs: 4,  alcohol_g: 14 },
  { id: "shot40",     name: "Spirits shot 40ml",     kcal: 95,  carbs: 0,  alcohol_g: 13 },
  { id: "cocktail",   name: "Cocktail",              kcal: 250, carbs: 25, alcohol_g: 14 },
];

export function cardioKcal(minutes, intensity, weightKg) {
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
export function workoutAdjustment({ workouts, profile, date }) {
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

export function calorieAdjustment({ daily, profile, targets, trainedToday, workoutAdj }) {
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
  // sport sessions
  const sportK = (Array.isArray(daily?.sportSessions) ? daily.sportSessions : [])
    .reduce((a, s) => a + (s.estimatedCalories || 0), 0);
  let delta = stepDelta + cardioK + workoutK + sportK;
  delta = Math.round(delta / 10) * 10;
  // Show nothing only when there's literally no signal — steps, cardio, AND no workout adjustment.
  if (steps === 0 && !cardioK && !workoutK && !sportK) return null;
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
export function sedentaryNote(min) {
  if (min == null || min === 0) return null;
  if (min < 240) return { tag: "low",      color: "#6BAE78", text: `${Math.round(min / 60 * 10) / 10}h sitting today — moving well.` };
  if (min < 480) return { tag: "moderate", color: "#D9A23C", text: `${Math.round(min / 60 * 10) / 10}h sitting today — try a 5-min stand break each hour.` };
  return                  { tag: "high",   color: "#E0714A", text: `${Math.round(min / 60 * 10) / 10}h sitting today — long stretches hurt circulation. Stand and walk 2 min every hour.` };
}

/* ---------------- smart hydration (electrolytes, sweat, training-day uplift) -------------- */
export const SWEAT_LEVELS = [["low", "Cool / low sweat"], ["normal", "Normal sweat"], ["heavy", "Heavy sweat / hot"]];
export function smartHydration({ daily, profile, sleepInfo, workouts, trainedToday }) {
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
export const SPORTS = [
  ["gym",     "Gym / lifting"],
  ["running", "Running"],
  ["football","Football / soccer"],
  ["fight",   "Boxing / kickboxing"],
  ["sports",  "Other sport"],
  ["health",  "General health"],
];
// extra tracking fields by sport — light, optional
export function sportFields(sport) {
  if (sport === "football") return [
    { id: "matchDay",   label: "Match day?",       opts: [["yes", "Yes", "#E0714A"], ["no", "No", "#A89E89"]] },
    { id: "sprintLoad", label: "Sprint/run load",  opts: [["low", "Low", "#6BAE78"], ["med", "Med", "#D9A23C"], ["high", "High", "#E0714A"]] },
  ];
  if (sport === "fight") return [
    { id: "sparred",  label: "Sparred today?",   opts: [["yes", "Yes", "#E0714A"], ["no", "No", "#A89E89"]] },
    { id: "rounds",   label: "Rounds",           opts: [["1-3", "1–3", "#6BAE78"], ["4-6", "4–6", "#D9A23C"], ["7+", "7+", "#E0714A"]] },
    { id: "headSym",  label: "Head/neck symptoms", opts: [["none", "None", "#6BAE78"], ["mild", "Mild", "#D9A23C"], ["yes", "Yes — rest", "#C0392B"]] },
  ];
  if (sport === "running") return [
    { id: "runKm",  label: "Run distance",  opts: [["<5", "<5km", "#6BAE78"], ["5-10", "5–10km", "#D9A23C"], ["10+", "10km+", "#E0714A"]] },
  ];
  return [];
}
export function sportAdvice({ profile, daily, sportLog, painLogs }) {
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
export const MOBILITY_ROUTINES = [
  { id: "morning",   title: "Morning mobility",        minutes: 5,  area: "full body", steps: ["Cat-cow ×8", "Hip-flexor lunge stretch — 30s/side", "Thoracic rotations — 8/side", "Arm circles — 10 each way", "Standing forward fold — 30s"] },
  { id: "pre_gym",   title: "Pre-gym warm-up",         minutes: 8,  area: "full body", steps: ["5 min easy bike or skipping", "Band pull-aparts ×15", "World's greatest stretch — 5/side", "Bodyweight squats ×10", "Push-ups ×8"] },
  { id: "shoulders", title: "Shoulder health",         minutes: 7,  area: "shoulders", steps: ["Wall slides ×10", "Band external rotations — 12/side", "Sleeper stretch — 30s/side", "Doorway pec stretch — 30s/side", "Scapular push-ups ×10"] },
  { id: "hips",      title: "Hip mobility",            minutes: 8,  area: "hips",      steps: ["90/90 hip switches — 8/side", "Frog stretch — 45s", "Couch stretch — 45s/side", "Adductor rock-backs ×8/side", "Glute bridges ×12"] },
  { id: "back",      title: "Lower-back relief",       minutes: 6,  area: "lower back",steps: ["Cat-cow ×10", "Child's pose — 45s", "Knees-to-chest — 30s", "Pelvic tilts ×12", "Bird-dog — 8/side"] },
];

/* ---------------- achievements -------------- */
export function detectAchievements({ workouts, weightSeries, sleepLogs, history, focusSessions, dailyHistory, painLogs }) {
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
export function goalTimeline({ profile, weightSeries, workouts, targets }) {
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
export function plateauDetection({ workouts, weightSeries, sleepLogs, history, targets, sleepInfo }) {
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
export function patternDetection({ sleepLogs, dailyHistory, workouts, painLogs, history }) {
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
export async function seedDemoData(store) {
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
export const KG_TO_LB = 2.20462, CM_TO_IN = 0.393701;
export function convW(kg, unit) { return unit === "lb" ? Math.round(kg * KG_TO_LB * 10) / 10 : Math.round(kg * 10) / 10; }
export function convL(cm, unit) { return unit === "in" ? Math.round(cm * CM_TO_IN * 10) / 10 : Math.round(cm); }
export function lbToKg(lb) { return Math.round((lb / KG_TO_LB) * 10) / 10; }
export function inToCm(inches) { return Math.round(inches / CM_TO_IN); }

/* ---------------- equipment-aware exercise filter -------------- */
export const EQUIPMENT = [
  ["full",  "Full gym"], ["basic", "Basic gym"], ["dumbbells", "Home dumbbells"],
  ["bands", "Resistance bands"], ["bodyweight", "Bodyweight only"], ["none", "No equipment"],
];
// returns whether an exercise is doable with the given equipment
export function canDoWith(meta, equipment) {
  if (!equipment || equipment === "full" || equipment === "basic") return true;
  const name = (meta?.name || "").toLowerCase();
  if (equipment === "dumbbells") return name.includes("dumbbell") || name.includes("db") || name.includes("push-up") || name.includes("pull-up") || name.includes("plank") || name.includes("lunge");
  if (equipment === "bodyweight" || equipment === "none") return !name.includes("barbell") && !name.includes("dumbbell") && !name.includes("cable") && !name.includes("machine") && !name.includes("smith") && !name.includes("leg press") && !name.includes("ez ");
  if (equipment === "bands") return name.includes("band") || name.includes("push-up") || name.includes("pull-up") || name.includes("plank");
  return true;
}

/* ---------------- meal shortcuts: same as yesterday, by time of day, frequent -------------- */
// `allEntries` is the full historical entry log; each needs `ts` and `name`.
export function mealShortcuts({ allEntries, todayEntries }) {
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
export function nextWorkoutSuggestion({ workouts, trainInfo }) {
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
export function calorieTrendRecommendation({ profile, weightSeries, history, targets }) {
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
export const GOAL_HABITS = {
  gain:     ["protein", "workout", "sleep8", "water", "steps"],
  lose:     ["calories", "protein", "steps", "workout", "sleep8"],
  maintain: ["workout", "protein", "sleep8", "steps", "water"],
};
export const FOCUS_HABITS = {
  sleep:  ["caffeine_cutoff", "blue_cutoff", "bedtime", "morning_light"],
  health: ["steps", "sleep8", "water", "veggies"],
  gym:    ["protein", "workout", "sleep8", "water"],
  cardio: ["steps", "cardio", "sleep8", "water"],
  sports: ["workout", "protein", "sleep8", "mobility"],
  transform: ["calories", "protein", "workout", "steps", "sleep8"],
};
export const HABIT_META = {
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
export function suggestedHabitsFor(profile) {
  const fromGoal = GOAL_HABITS[profile?.goal] || [];
  const fromFocus = FOCUS_HABITS[profile?.focus] || [];
  const seen = new Set();
  return [...fromGoal, ...fromFocus].filter((k) => { if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 6);
}

/* ---------------- "Tonight plan" — one card with caffeine, blue, bed, wake -------------- */
export function tonightPlan({ sleepInfo }) {
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
export const ACTIVITY_SOURCES = [
  { id: "manual",         name: "Manual entry",        active: true,  note: "Type or use the +1k / +2.5k / +5k quick buttons." },
  { id: "apple_health",   name: "Apple Health",        active: false, note: "Requires native iOS app." },
  { id: "health_connect", name: "Google Health Connect", active: false, note: "Requires native Android app." },
  { id: "google_fit",     name: "Google Fit",          active: false, note: "Requires API integration." },
  { id: "garmin",         name: "Garmin",              active: false, note: "Requires API integration." },
  { id: "fitbit",         name: "Fitbit",              active: false, note: "Requires API integration." },
];

/* ---------------- global search -------------- */
// Indexes everything searchable in the app and returns ranked matches.
export function searchAll({ q, library, workouts, history, supps, painLogs, weightSeries, sleepLogs, healthSeries, focusSessions }) {
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
export function calendarDay({ date, workouts, weightSeries, sleepLogs, history, painLogs, dailyHistory, targets }) {
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
export function progressDiagnosis({ workouts, weightSeries, history, sleepLogs, sleepInfo, targets, profile, dailyHistory, painLogs, daily }) {
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

export const MICRO_KEYS = [
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
export const MICRO_ALIASES = {
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
export function normalizeMicros(micros) {
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

export const omegaNum = (v) => ({ low: 20, medium: 55, high: 90 }[v] ?? 0);

export function dayTotals(entries) {
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

export const FUNCS = [
  { key: "mind", label: "Sharp Mind", emoji: "🧠", color: "#6E83D6",
    parts: (t) => [t.micros.b12, t.micros.folate, t.micros.iron, t.micros.vitamin_e, t.omega3] },
  { key: "body", label: "Strong Body", emoji: "💪", color: "#3E9D63",
    parts: (t, tg) => [pct(t.protein, tg.protein), t.micros.magnesium, t.micros.vitamin_d, t.micros.potassium] },
  { key: "energy", label: "Steady Energy", emoji: "⚡", color: "#F5A623",
    parts: (t) => [t.micros.iron, t.micros.b12, t.micros.folate, t.micros.b6, t.micros.magnesium] },
  { key: "rest", label: "Deep Rest", emoji: "🌙", color: "#7A6FB0",
    parts: (t) => [t.micros.magnesium, t.micros.potassium, t.micros.calcium] },
  { key: "defense", label: "Defense", emoji: "🛡️", color: "#FF6B5F",
    parts: (t) => [t.micros.vitamin_c, t.micros.vitamin_d, t.micros.zinc, t.micros.vitamin_a, t.micros.selenium] },
  { key: "frame", label: "Framework", emoji: "🦴", color: "#9C9486",
    parts: (t) => [t.micros.calcium, t.micros.vitamin_d, t.micros.vitamin_k, t.micros.magnesium] },
  { key: "glow", label: "Glow", emoji: "✨", color: "#D98AA8",
    parts: (t) => [t.micros.vitamin_c, t.micros.vitamin_e, t.micros.vitamin_a, t.micros.zinc] },
];
export const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
export function funcScores(t, tg) {
  return FUNCS.map((f) => {
    const arr = f.parts(t, tg).map((v) => Math.min(100, Math.max(0, v || 0)));
    const score = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    return { ...f, score };
  });
}

/* ---------------- nutrition coaching engine -------------- */
// common food sources to fix a low nutrient
export const FOOD_SOURCES = {
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
export const NUTRI_LABEL = Object.fromEntries([...MICRO_KEYS, ["protein", "Protein"], ["fiber", "Fiber"]]);

// daily water goal from bodyweight (~35 ml/kg, sane bounds)
export function waterGoal(profile) {
  const kg = profile?.weight || 72;
  return Math.round(Math.max(2000, Math.min(4000, kg * 35)) / 250) * 250;
}

// per-meal quality score (0-100) from a single entry's macros/micros
export function mealScore(e, targets) {
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

// daily diet quality (0-100) — judges what has been eaten, not how much of the day's target is covered.
// Returns { score: number|null, noData: bool, advice: string[], whyText: string|null }
export function dietQuality(t, targets, daily, profile) {
  // Not enough food logged yet — neutral, not a bad score
  if (!t || t.calories < 150) {
    return { score: null, noData: true, advice: [], whyText: null };
  }

  const cal = t.calories;
  const positives = [];
  const negatives = [];

  // 1. Fiber density (g / 1000 kcal) — best proxy for minimally processed eating
  //    Whole foods: ~10–15 g/1000 kcal; ultra-processed: often <4 g/1000 kcal
  const fiberDensity = (t.fiber / cal) * 1000;
  const fiberScore = Math.min(1, fiberDensity / 12);
  if (fiberScore >= 0.65) positives.push("high fibre / whole foods");
  else if (fiberScore < 0.25) negatives.push("low fibre — likely refined/processed food");

  // 2. Protein fraction of calories (protein kcal as % of total kcal)
  //    Quality whole-food meals naturally score 20-35%; empty-calorie foods score <10%
  const proteinFrac = (t.protein * 4) / cal;
  const proteinScore = Math.min(1, proteinFrac / 0.25);
  if (proteinScore >= 0.65) positives.push("good protein density");
  else if (proteinScore < 0.25) negatives.push("very low protein");

  // 3. Micronutrient variety — any micro data > 5% indicates whole/nutrient-dense food was eaten
  const microPresent = MICRO_KEYS.filter(([k]) => (t.micros[k] || 0) > 5).length;
  const microScore = Math.min(1, microPresent / 4); // 4+ distinct micros = full score
  if (microPresent >= 4) positives.push("varied micronutrients");
  else if (microPresent === 0) negatives.push("no vitamins/minerals detected");

  // 4. Alcohol penalty (from daily check-in)
  const alcohol = daily?.alcohol || 0;
  let alcoholPenalty = 0;
  if (alcohol >= 3) { alcoholPenalty = 22; negatives.push("significant alcohol"); }
  else if (alcohol >= 2) { alcoholPenalty = 14; negatives.push("alcohol"); }
  else if (alcohol >= 1) { alcoholPenalty = 6; }

  // 5. High net-carb ratio with low fibre → crude proxy for sugary/refined food
  //    Net carbs = total carbs − fibre. If >60% of calories come from net carbs AND fibre is low,
  //    it strongly suggests high-sugar or ultra-processed foods.
  const netCarbs = Math.max(0, t.carbs - t.fiber);
  const netCarbFrac = (netCarbs * 4) / cal;
  let carbPenalty = 0;
  if (netCarbFrac > 0.60 && fiberScore < 0.30) {
    carbPenalty = 18;
    negatives.push("most calories from refined carbs / added sugar");
  } else if (netCarbFrac > 0.52 && fiberScore < 0.20) {
    carbPenalty = 10;
    negatives.push("high refined carbs");
  }

  // ── Compose score (0–100) ──
  // Weights: fibre 35 + protein 30 + micros 25 = 90; penalties applied on top
  const raw = fiberScore * 35 + proteinScore * 30 + microScore * 25;
  const score = Math.max(0, Math.min(100, Math.round(raw - alcoholPenalty - carbPenalty)));

  // "Why" explanation: biggest positive + biggest negative driver
  let whyText = null;
  if (positives.length > 0 && negatives.length > 0) {
    whyText = `Good: ${positives[0]}. Needs work: ${negatives[0]}.`;
  } else if (positives.length > 0) {
    whyText = `Good: ${positives.slice(0, 2).join(", ")}.`;
  } else if (negatives.length > 0) {
    whyText = `Needs work: ${negatives[0]}.`;
  }

  const advice = [];
  if (fiberScore < 0.55) advice.push("add fibre (veg, legumes, whole grains)");
  if (proteinScore < 0.50) advice.push("add quality protein");
  if (microPresent < 3) advice.push("more fruit & veg for vitamins");
  if (alcohol >= 1) advice.push("reduce alcohol");
  if (carbPenalty > 0) advice.push("swap refined carbs for whole-food sources");

  return { score, noData: false, advice, whyText };
}

// top low micronutrients today, with food suggestions
export function missingNutrients(t, targets) {
  const items = [];
  if (targets.protein && t.protein < targets.protein * 0.8)
    items.push({ key: "protein", label: "Protein", pct: Math.round(pct(t.protein, targets.protein)), food: FOOD_SOURCES.protein });
  if (targets.fiber && t.fiber < targets.fiber * 0.7)
    items.push({ key: "fiber", label: "Fiber", pct: Math.round(pct(t.fiber, targets.fiber)), food: FOOD_SOURCES.fiber });
  MICRO_KEYS.forEach(([k, lbl]) => { if ((t.micros[k] || 0) < 70) items.push({ key: k, label: lbl, pct: t.micros[k] || 0, food: FOOD_SOURCES[k] }); });
  return items.sort((a, b) => a.pct - b.pct).slice(0, 3);
}

// lean-bulk / cut / maintenance coach from calories + weight trend
export function nutritionCoach(t, targets, profile, weightSeries) {
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
export const MEASURE_KEYS = [
  ["waist", "Waist"], ["chest", "Chest"], ["shoulders", "Shoulders"],
  ["arms", "Arms"], ["thighs", "Thighs"], ["calves", "Calves"], ["neck", "Neck"],
];
export const PHOTO_KINDS = [["front", "Front"], ["side", "Side"], ["back", "Back"]];

// rolling stats from a weight series: current, 7-day avg, weekly rate (kg/wk), %bw/wk
export function weightStats(series) {
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
export function weightVerdict(stats, goal) {
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
export function photoReminder(photoLog, everyDays = 14) {
  const last = (photoLog || []).slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!last) return { due: true, daysSince: null, missing: PHOTO_KINDS.map(([k]) => k), text: "Take your first set of progress photos." };
  const daysSince = Math.floor((Date.now() - new Date(last.date).getTime()) / 864e5);
  const missing = PHOTO_KINDS.map(([k]) => k).filter((k) => !last.kinds.includes(k));
  if (daysSince >= everyDays) return { due: true, daysSince, missing: PHOTO_KINDS.map(([k]) => k), text: `${daysSince} days since your last photo set — time for a new one.` };
  if (missing.length && daysSince <= 2) return { due: true, daysSince, missing, text: `You're missing the ${missing.join(" & ")} angle${missing.length > 1 ? "s" : ""} from today's set.` };
  return { due: false, daysSince, missing, text: `Photos taken ${daysSince === 0 ? "today" : daysSince + " days ago"} — next set in ${Math.max(1, everyDays - daysSince)} days.` };
}

// latest measurement + change since 30d ago
export function measurementStats(series) {
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
export const BLOOD_MARKERS = [
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
export const BLOOD_LABEL = Object.fromEntries(BLOOD_MARKERS.map((b) => [b.key, b.label]));

export function latestHealth(healthSeries) {
  if (!healthSeries?.length) return {};
  // most-recent value per field (so a one-off blood test from 3 months ago still shows)
  const out = { blood: {} };
  [...healthSeries].sort((a, b) => a.date.localeCompare(b.date)).forEach((h) => {
    ["bpSys", "bpDia", "rhr", "smoking", "symptoms"].forEach((k) => { if (h[k] != null && h[k] !== "") out[k] = { value: h[k], date: h.date }; });
    if (h.blood) Object.keys(h.blood).forEach((k) => { if (h.blood[k] != null) out.blood[k] = { value: h.blood[k], date: h.date }; });
  });
  return out;
}

export function bloodFlag(key, value) {
  const m = BLOOD_MARKERS.find((b) => b.key === key); if (!m || value == null) return null;
  if (m.high != null && value > m.high) return { tag: "high", label: "High" };
  if (m.low != null && value < m.low) return { tag: "low", label: "Low" };
  if (value < m.ok[0]) return { tag: "below", label: "Below range" };
  if (value > m.ok[1]) return { tag: "above", label: "Above range" };
  return { tag: "ok", label: "In range" };
}

// average over the last N days from a date-keyed series, given a getter
export function avgRecent(series, days, get) {
  if (!series?.length) return null;
  const cutoff = Date.now() - days * 864e5;
  const vals = series.filter((s) => new Date(s.date).getTime() >= cutoff).map(get).filter((v) => v != null && !isNaN(v));
  return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
}

// risk radar — NEVER diagnostic. Each category returns {tag: low/moderate/elevated/high, text}
export function healthRiskRadar({ healthSeries, sleepLogs, sleepInfo, t, targets, daily, dailyHistory, weightSeries, measureSeries, workouts, profile }) {
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
export const RISK_TAG = {
  low:      { color: "#6BAE78", label: "Healthy",  dot: "🌿" },
  moderate: { color: "#D9A23C", label: "Watch",    dot: "•" },
  elevated: { color: "#E0714A", label: "Elevated", dot: "•" },
  high:     { color: "#C0392B", label: "High",     dot: "•" },
  unknown:  { color: "#A89E89", label: "Not logged",  dot: "·" },
};

/* ---------------- safety: red-flag symptoms + interaction flags (NOT medical advice) -------------- */
// Phrases that warrant "consider urgent medical help". Matched against symptom text + check-ins.
export const RED_FLAGS = [
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
export function redFlagScan(text) {
  if (!text) return [];
  return RED_FLAGS.filter((f) => f.re.test(text));
}
// blood pressure red flag (hypertensive crisis range)
export function bpRedFlag(sys, dia) {
  if (sys == null || dia == null) return null;
  if (sys >= 180 || dia >= 120) return { text: `Very high blood pressure (${sys}/${dia})` };
  return null;
}

// supplement/medication interaction flags. Cautious, non-diagnostic; flags combinations to check, never dosing.
export const INTERACTION_RULES = [
  { a: ["alcohol"], b: ["acetaminophen", "paracetamol", "tylenol", "painkiller", "ibuprofen", "advil", "naproxen", "nsaid", "aspirin"], note: "Alcohol with painkillers (paracetamol or NSAIDs) raises the risk of liver or stomach harm. Check the label or ask a pharmacist." },
  { a: ["ibuprofen", "advil", "naproxen", "nsaid", "aspirin"], b: ["creatine"], note: "Heavy NSAID use plus creatine can stress the kidneys when hydration is low — drink plenty of water." },
  { a: ["caffeine", "pre-workout", "pre workout"], b: ["caffeine", "pre-workout", "pre workout"], note: "Stacking multiple caffeine sources (coffee + pre-workout + energy drink) adds up fast — watch total dose and timing." },
  { a: ["fish oil", "omega", "omega-3", "vitamin e", "ginkgo", "garlic"], b: ["aspirin", "blood thinner", "warfarin"], note: "Fish oil/vitamin E with blood thinners or aspirin can increase bleeding risk. Mention your supplements to your doctor." },
  { a: ["st john", "st. john"], b: ["medication", "antidepressant", "birth control", "ssri"], note: "St. John's Wort interferes with many medications. Check with a pharmacist before combining." },
  { a: ["melatonin"], b: ["alcohol"], note: "Melatonin plus alcohol can worsen grogginess and disrupt sleep architecture." },
];
// scan supps (array of {name}), daily caffeine/alcohol, and free-text meds note for combinations
export function interactionFlags({ supps, daily, medsNote }) {
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
export const PAIN_LOCATIONS = [
  ["shoulder", "Shoulder"], ["elbow", "Elbow"], ["wrist", "Wrist/hand"],
  ["lower_back", "Lower back"], ["upper_back", "Upper back"], ["neck", "Neck"],
  ["hip", "Hip"], ["knee", "Knee"], ["ankle", "Ankle/foot"], ["other", "Other"],
];
export const PAIN_TYPES = [
  ["sharp",    "Sharp"],
  ["dull",     "Dull / ache"],
  ["burning",  "Burning"],
  ["tight",    "Tight"],
  ["sore",     "Muscle sore"],
  ["pinching", "Pinching"],
];
export const PAIN_LEVELS = {
  none:     { color: "#6BAE78", label: "None",     hit: 0 },
  mild:     { color: "#D9A23C", label: "Mild",     hit: 8 },
  moderate: { color: "#E0714A", label: "Moderate", hit: 20 },
  serious:  { color: "#C0392B", label: "Serious",  hit: 35 },
};
export const SET_PAIN = {
  none:    { color: "#6BAE78", label: "No pain" },
  mild:    { color: "#D9A23C", label: "Mild" },
  painful: { color: "#E0714A", label: "Painful" },
  stop:    { color: "#C0392B", label: "Stop" },
};

// which body parts each muscle group "loads" — used to suggest avoiding exercises
export const LOADS_PART = {
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
export const PAIN_MODS = {
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

export function painLevelOf(daily, painLogs) {
  // prefer most-recent active pain log; fall back to today's check-in
  const active = painLogs?.filter((p) => p.status === "active").slice(-1)[0];
  if (active) return active.level;
  return daily?.checkin?.pain || "none";
}

// summary: active sites, days since worst, improving/recurring flags
export function painSummary(painLogs) {
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
export function painAdvice(painLevel, painLocations) {
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
export function exercisePainRisk(exName, painLevel, painLocations) {
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
export const HABIT_CATEGORIES = [
  { id: "health",       label: "Health" },
  { id: "training",     label: "Training" },
  { id: "nutrition",    label: "Nutrition" },
  { id: "sleep",        label: "Sleep" },
  { id: "mind",         label: "Mind" },
  { id: "productivity", label: "Productivity" },
  { id: "custom",       label: "Custom" },
];
export const HABIT_SUGGESTIONS = [
  // Health
  { name: "Drink enough water",       category: "health",       frequencyType: "daily",    weeklyTarget: null, autoType: "water" },
  { name: "Take supplements",         category: "health",       frequencyType: "daily",    weeklyTarget: null, autoType: "supplements" },
  { name: "No alcohol today",         category: "health",       frequencyType: "daily",    weeklyTarget: null, autoType: "no_alcohol" },
  { name: "Take progress photos",     category: "health",       frequencyType: "monthly",  weeklyTarget: null, autoType: null },
  // Sleep
  { name: "Sleep enough",             category: "sleep",        frequencyType: "daily",    weeklyTarget: null, autoType: "sleep" },
  { name: "No phone before bed",      category: "sleep",        frequencyType: "daily",    weeklyTarget: null, autoType: null },
  // Training
  { name: "Complete workout",         category: "training",     frequencyType: "daily",    weeklyTarget: null, autoType: "workout" },
  { name: "Hit daily steps",          category: "training",     frequencyType: "daily",    weeklyTarget: null, autoType: "steps" },
  { name: "Do cardio",                category: "training",     frequencyType: "weekly_x", weeklyTarget: 3,    autoType: null },
  { name: "Stretch or mobility",      category: "training",     frequencyType: "daily",    weeklyTarget: null, autoType: null },
  // Nutrition
  { name: "Hit protein target",       category: "nutrition",    frequencyType: "daily",    weeklyTarget: null, autoType: "protein" },
  { name: "Stay near calorie target", category: "nutrition",    frequencyType: "daily",    weeklyTarget: null, autoType: "calories" },
  { name: "Eat fruit or vegetables",  category: "nutrition",    frequencyType: "daily",    weeklyTarget: null, autoType: null },
  // Mind / Productivity
  { name: "Read 10 pages",            category: "mind",         frequencyType: "daily",    weeklyTarget: null, autoType: null },
  { name: "Study 30 minutes",         category: "mind",         frequencyType: "daily",    weeklyTarget: null, autoType: null },
  { name: "Plan tomorrow",            category: "productivity", frequencyType: "daily",    weeklyTarget: null, autoType: null },
  { name: "Review goals",             category: "mind",         frequencyType: "weekly",   weeklyTarget: null, autoType: null },
];
export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function daysLabel(days) {
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
export function habitWeekKey(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toLocaleDateString("en-CA") + "-W";
}

export function habitPeriodKey(frequencyType, dateStr) {
  if (!frequencyType || frequencyType === "daily") return dateStr;
  if (frequencyType === "monthly") return dateStr.slice(0, 7);
  return habitWeekKey(dateStr); // weekly_x, specific_days, weekly
}

export function getHabitStatus(habit, completions, today) {
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

export function computeHabitStreak(habit, completions, today) {
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
  if (ft === "specific_days") {
    // Count consecutive completions on scheduled days — skip non-scheduled days
    const days = habit.specificDays || [];
    if (!days.length) return 0;
    let streak = 0;
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - i);
      const dow = d.getDay();
      if (!days.includes(dow)) continue; // not a scheduled day — skip
      const ds = d.toLocaleDateString("en-CA");
      const done = (completions || []).some((c) => c.habitId === habit.id && c.sprigDate === ds);
      if (done) streak++;
      else if (i > 0) break; // missed a scheduled day → streak ends (today not yet done is OK)
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

export function computeHabitConsistencyV2(habits2, completions, today) {
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

// Returns { [habitId]: { met: bool, reason: string } } for auto-type habits
export function computeAutoHabitToday(habits2, { nutriInfo, moveInfo, sleepInfo, daily, targets, supps, takenIds, quickLog, tp = {} } = {}) {
  const result = {};
  const d = daily || {};
  const tgt = targets || {};
  const ql = quickLog || null;
  for (const h of (habits2 || [])) {
    if (!h.autoType || h.archived) continue;
    let met = false;
    let reason = "";
    switch (h.autoType) {
      case "protein": {
        if (tp.nutrition === false) { reason = "Nutrition tracking off"; break; }
        const p = nutriInfo?.dietQ?.protein;
        const pt = tgt.protein;
        if (p != null && pt > 0) {
          met = p >= pt * 0.9;
          reason = met ? `${Math.round(p)}g logged` : `${Math.round(p)}/${pt}g`;
        } else if (ql?.hitProtein === true) {
          met = true; reason = "Marked hit · Quick Log";
        } else reason = "Not logged";
        break;
      }
      case "calories": {
        if (tp.nutrition === false) { reason = "Nutrition tracking off"; break; }
        const kcal = nutriInfo?.dietQ?.kcal;
        const ct = tgt.calories;
        if (kcal != null && ct > 0) {
          const pct = Math.abs(kcal - ct) / ct;
          met = pct < 0.15;
          reason = `${Math.round(kcal)} kcal`;
        } else if (ql?.hitCalories === true) {
          met = true; reason = "Marked on target · Quick Log";
        } else reason = "Not logged";
        break;
      }
      case "water": {
        if (tp.water === false) { reason = "Water tracking off"; break; }
        const w = d.water || 0;
        const wg = nutriInfo?.waterGoal || 2000;
        if (wg > 0 && w >= wg) {
          met = true; reason = `${Math.round(w / 100) / 10}L reached`;
        } else if (w > 0) {
          met = false; reason = `${Math.round(w / 100) / 10}L of ${Math.round(wg / 100) / 10}L`;
        } else if (ql?.hitWater === true) {
          met = true; reason = "Marked hit · Quick Log";
        } else {
          reason = `${Math.round(w / 100) / 10}L of ${Math.round(wg / 100) / 10}L`;
        }
        break;
      }
      case "no_alcohol": {
        if (tp.alcohol === false) { reason = "Alcohol tracking off"; break; }
        const alc = d.alcohol ?? null;
        if (alc != null && alc > 0) {
          met = false; reason = `${alc} drink${alc !== 1 ? "s" : ""} logged`;
        } else if (ql?.noAlcohol === true) {
          met = true; reason = "No alcohol · Quick Log";
        } else if (ql?.noAlcohol === false) {
          met = false; reason = "Alcohol consumed · Quick Log";
        } else {
          // Do not assume no alcohol without explicit data or QL confirmation
          met = false; reason = "Not confirmed yet";
        }
        break;
      }
      case "supplements": {
        if (tp.supplements === false) { reason = "Supplements tracking off"; break; }
        if (supps?.length) {
          met = supps.every((s) => (takenIds || []).includes(s.id));
          const taken = (takenIds || []).filter((id) => supps.some((s) => s.id === id)).length;
          if (!met && ql?.supplementsTaken === true) { met = true; reason = "Marked taken · Quick Log"; }
          else reason = met ? "All taken" : `${taken}/${supps.length} taken`;
        } else if (ql?.supplementsTaken === true) {
          met = true; reason = "Marked taken · Quick Log";
        } else reason = "No supplements set";
        break;
      }
      case "workout": {
        if (tp.training === false) { reason = "Training tracking off"; break; }
        if (moveInfo?.trainedToday) {
          met = true; reason = "Workout logged";
        } else if (ql?.trainedToday === true) {
          met = true; reason = "Trained · Quick Log";
        } else {
          met = false; reason = "No workout logged yet";
        }
        break;
      }
      case "steps": {
        if (tp.movement === false) { reason = "Movement tracking off"; break; }
        const steps = d.steps || 0;
        const sg = moveInfo?.stepGoal || tgt.steps || 8000;
        if (sg > 0 && steps >= sg) {
          met = true; reason = `${steps.toLocaleString()} steps`;
        } else if (steps > 0) {
          met = false; reason = `${steps.toLocaleString()} / ${sg.toLocaleString()}`;
        } else if (ql?.enoughMovement === true) {
          met = true; reason = "Movement marked done · Quick Log";
        } else {
          met = false; reason = `${steps.toLocaleString()} / ${sg.toLocaleString()}`;
        }
        break;
      }
      case "sleep": {
        if (tp.sleep === false) { reason = "Sleep tracking off"; break; }
        const dur = sleepInfo?.lastSleep?.durationMin;
        const need = sleepInfo?.need || 420;
        if (dur != null) {
          met = dur >= need * 0.85;
          const hrs = (min) => `${Math.floor(min / 60)}h ${min % 60}m`;
          reason = met ? `${hrs(dur)} slept` : `${hrs(dur)} (need ~${hrs(need)})`;
        } else if (ql?.enoughSleep === true) {
          met = true; reason = "Slept enough · Quick Log";
        } else reason = "No sleep data";
        break;
      }
      default: break;
    }
    result[h.id] = { met, reason };
  }
  return result;
}

export function migrateHabitsV1toV2(habitConfig, habitDone) {
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

export const DEFAULT_HABITS = [
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
export function habitAutoDone(id, ctx) {
  const { t, targets, daily, waterGoalMl, trainedToday, supps, takenIds, quickLog, tp = {} } = ctx;
  const ql = quickLog || null;
  switch (id) {
    case "water":
      if (tp.water === false) return false;
      if ((daily.water || 0) >= waterGoalMl * 0.9) return true;
      return ql?.hitWater === true; // quick log fallback
    case "protein":
      if (tp.nutrition === false) return false;
      if (targets.protein && t.protein >= targets.protein * 0.9) return true;
      return ql?.hitProtein === true;
    case "steps":
      if (tp.movement === false) return false;
      if ((daily.steps || 0) >= STEPS_TARGET * 0.9) return true;
      return ql?.enoughMovement === true;
    case "gym":
      if (tp.training === false) return false;
      return !!(trainedToday || ql?.trainedToday);
    case "supps":
      if (tp.supplements === false) return false;
      if (supps?.length && supps.every((s) => takenIds?.includes(s.id))) return true;
      return ql?.supplementsTaken === true;
    default: return false;
  }
}

// assemble the active habit list (defaults minus hidden, plus custom)
export function activeHabits(habitConfig) {
  const hidden = new Set(habitConfig?.hidden || []);
  const base = DEFAULT_HABITS.filter((h) => !hidden.has(h.id));
  const custom = (habitConfig?.custom || []).map((c) => ({ ...c, auto: false, icon: "custom" }));
  return [...base, ...custom];
}

// today's completion state for each habit
export function habitsToday(habits, ctx, habitDone, date) {
  const manual = new Set(habitDone[date] || []);
  return habits.map((h) => ({
    ...h,
    done: h.auto ? habitAutoDone(h.id, ctx) : manual.has(h.id),
  }));
}

// weekly consistency: % of (habits × days) completed, plus best & weakest
// For past days we only reliably know protein & gym (from history); other auto-habits
// are only scored for *today*, so they aren't counted against past days they can't be verified.
export function habitConsistency(habits, ctxByDate, habitDone, dates, today) {
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

export const FOCUS_PRESETS = [25, 50, 90];

/* ---------------- sleep + energy engine -------------- */
export const DAYMIN = 1440;
export const tsToMin = (ts) => { const d = new Date(ts); return d.getHours() * 60 + d.getMinutes(); };
export const hmToMin = (s) => { const [h, m] = String(s).split(":").map(Number); return (h || 0) * 60 + (m || 0); };
export const minToHM = (m) => { m = ((Math.round(m) % DAYMIN) + DAYMIN) % DAYMIN; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
export function minToLabel(m) {
  m = ((Math.round(m) % DAYMIN) + DAYMIN) % DAYMIN;
  let h = Math.floor(m / 60); const mm = m % 60; const ap = h < 12 ? "AM" : "PM";
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}:${String(mm).padStart(2, "0")} ${ap}`;
}
// 24h "HH:MM" for <input type="time"> values
export function minToHm(m) {
  m = ((Math.round(m) % DAYMIN) + DAYMIN) % DAYMIN;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
export const durLabel = (mins) => `${Math.floor(Math.abs(mins) / 60)}h ${String(Math.round(Math.abs(mins) % 60)).padStart(2, "0")}m`;

export function sleepNeedMin(age) {
  if (!age) return 480;
  if (age <= 13) return 570; if (age <= 17) return 525; if (age <= 25) return 480; if (age <= 64) return 465; return 450;
}
export function circMean(mins) {
  if (!mins.length) return null;
  let x = 0, y = 0;
  mins.forEach((m) => { const a = (m / DAYMIN) * 2 * Math.PI; x += Math.cos(a); y += Math.sin(a); });
  let ang = Math.atan2(y, x); if (ang < 0) ang += 2 * Math.PI;
  return Math.round((ang / (2 * Math.PI)) * DAYMIN);
}
export const circDiff = (a, b) => { const d = Math.abs(a - b) % DAYMIN; return Math.min(d, DAYMIN - d); };
export function inWindow(t, start, end) { // wrap-aware
  t = (t + DAYMIN) % DAYMIN; start = (start + DAYMIN) % DAYMIN; end = (end + DAYMIN) % DAYMIN;
  return start <= end ? (t >= start && t <= end) : (t >= start || t <= end);
}

export function estimateStages(durationMin, restlessness = 30) {
  const r = Math.min(100, Math.max(0, restlessness));
  const deepPct = Math.max(0.08, 0.21 - r / 600);
  const remPct = Math.max(0.10, 0.23 - r / 900);
  const deep = Math.round(durationMin * deepPct);
  const rem = Math.round(durationMin * remPct);
  const light = Math.max(0, durationMin - deep - rem);
  return { deep, rem, light };
}
export function scoreSleep({ durationMin, restlessness = 30, bedMin }, needMin, usualBedMin) {
  const ratio = durationMin / needMin;
  const durScore = ratio >= 1 ? Math.max(70, 100 - Math.max(0, durationMin - needMin - 45) / 6) : ratio * 100;
  const restScore = 100 - Math.min(65, restlessness);
  let consist = 90;
  if (usualBedMin != null) consist = 100 - Math.min(160, circDiff(bedMin, usualBedMin)) / 2;
  return Math.round(Math.max(0, Math.min(100, durScore * 0.5 + restScore * 0.3 + consist * 0.2)));
}
export function sleepDebtMin(logs, needMin) {
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
export function sleepDebtLabel(debtMin) {
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
export function bedtimeReminder({ nowTs, recBedMin, lastLogTs, t, targets, daily, waterGoalMl, trainedToday, tp = {} }) {
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

  // key goals — only suggest logging for enabled categories
  const missing = [];
  if (tp.nutrition !== false && (t?.calories || 0) < (targets?.calories || 0) * 0.6) missing.push("food");
  if (tp.water !== false && (daily?.water || 0) < (waterGoalMl || 2500) * 0.6) missing.push("water");
  if (!daily?.checkin || !daily.checkin.mood) missing.push("check-in");
  if (tp.movement !== false && (daily?.steps || 0) === 0 && !trainedToday && (daily?.cardioMin || 0) === 0) missing.push("movement");
  if (missing.length < 2) return null; // most things already logged → no need to nudge

  return { missing: missing.slice(0, 3), nearBed: true };
}
export function recommend(logs, profile, debtMin) {
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
export function sleepScoreBreakdown(log, need, rec, logs) {
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
export const ALCOHOL_LEVELS = {
  none:     { units: 0, label: "None",     color: "#6BAE78", recoveryHit: 0,  next: "No impact." },
  light:    { units: 1, label: "Light",    color: "#D9A23C", recoveryHit: 8,  next: "Mild effect: ~5–10% less deep sleep, slightly lower HRV." },
  moderate: { units: 3, label: "Moderate", color: "#E0714A", recoveryHit: 18, next: "Real impact: fragmented sleep, blunted muscle protein synthesis, lower readiness tomorrow." },
  heavy:    { units: 5, label: "Heavy",    color: "#C0392B", recoveryHit: 30, next: "Big impact: deep sleep drops ~30%, recovery and lifts will suffer for 24–48h." },
};
export function alcoholLevel(units) {
  if (!units || units <= 0) return "none";
  if (units < 2) return "light";
  if (units < 4) return "moderate";
  return "heavy";
}
export function alcoholImpact(units) {
  return ALCOHOL_LEVELS[alcoholLevel(units)];
}

// unified recovery recommendation: train hard / normal / light / rest
export function recoveryRecommendation({ lastSleep, debtMin, daily, sleepReadiness, painLevel }) {
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

// ---- Perfect Recovery System ----
export function calculatePerfectRecovery({ sleepInfo, trainInfo, nutriInfo, daily, targets, t, workouts, quickLog, tp = {} }) {
  let score = 75;
  const limiters = [];
  const helpers = [];
  let dataPoints = 0;
  const ql = quickLog || null;
  let qlEstimated = false; // track if we used quick log to fill any gap
  // Hoisted so checklist/muscleStatus sections can read them regardless of which guard branch ran
  let protein = 0, pTarget = 0, calories = 0, cTarget = 0;
  let water = 0, wGoal = 2000;
  let alcohol = 0;
  let recovery = {};

  // === SLEEP ===
  const lastSleep = sleepInfo?.lastSleep;
  const debtMin = sleepInfo?.debtMin || 0;
  const need = sleepInfo?.need || 420;
  if (tp.sleep === false) {
    // Sleep tracking off — skip penalty
    helpers.push("Sleep tracking is off");
  } else if (lastSleep?.durationMin) {
    dataPoints += 2;
    const deficit = need - lastSleep.durationMin;
    if (deficit > 90)       { score -= 14; limiters.push(`Sleep was ${(deficit/60).toFixed(1)}h below your need`); }
    else if (deficit > 45)  { score -= 7;  limiters.push("Sleep was below your need last night"); }
    else if (deficit > 15)  { score -= 3; }
    else                    { score += 5;  helpers.push("Sleep covered your need last night"); }
  } else if (ql?.enoughSleep === true) {
    // Quick Log says slept enough — treat as okay, mild confidence boost
    score += 2; helpers.push("Sleep marked as enough (Quick Log)");
    dataPoints += 1; qlEstimated = true;
  } else if (ql?.enoughSleep === false) {
    score -= 5; limiters.push("Sleep marked as not enough (Quick Log)");
    dataPoints += 1; qlEstimated = true;
  } // unknown sleep — confidence lowered via dataPoints, no score penalty

  if (tp.sleep !== false) {
    if (debtMin > 120)        { score -= 9;  limiters.push(`${(debtMin/60).toFixed(1)}h sleep debt accumulating`); }
    else if (debtMin > 60)    { score -= 5;  limiters.push(`Sleep debt elevated (${Math.round(debtMin)} min)`); }
    else if (debtMin < 20 && lastSleep?.durationMin) { score += 3; helpers.push("Sleep debt is low"); }
  }

  // === TRAINING LOAD ===
  // Hoist so steps/loadLevel/rwReasons/suggestActiveRecovery can read them even when training disabled
  let totalWeekSets = 0, consecRun = 0, failSets = 0;
  if (tp.training === false) {
    helpers.push("Training tracking is off");
  } else {
  recovery = trainInfo?.recovery || {};
  const volume = trainInfo?.volume || {};
  const highFat = MUSCLES.filter(([k]) => (recovery[k]?.fatigue||0) >= 70).map(([,n]) => n);
  const veryHighFat = MUSCLES.filter(([k]) => (recovery[k]?.fatigue||0) >= 90).map(([,n]) => n);

  // Identify sport-sourced fatigue for targeted messaging
  const sportFatigued = MUSCLES.filter(([k]) => recovery[k]?.sportSource && (recovery[k]?.fatigue||0) >= 35);
  const sportFatiguedHard = MUSCLES.filter(([k]) => recovery[k]?.sportSource && (recovery[k]?.fatigue||0) >= 65);
  const sportNames = [...new Set(sportFatigued.flatMap(([k]) => recovery[k]?.sportNames || [recovery[k]?.sportName].filter(Boolean)))];

  if (veryHighFat.length >= 3)    { score -= 12; limiters.push(`${veryHighFat.slice(0,2).join(", ")} severely fatigued`); }
  else if (highFat.length >= 3)   { score -= 7;  limiters.push(`Multiple muscles still recovering (${highFat.slice(0,2).join(", ")})`); }
  else if (highFat.length >= 1)   { score -= 3; }

  // Sport-specific limiters/helpers
  if (sportFatiguedHard.length >= 3 && sportNames.length) {
    limiters.push(`${sportNames[0]} added significant muscle load — lower-body or upper-body may be fatigued`);
  } else if (sportFatiguedHard.length >= 1 && sportNames.length) {
    const mNames = sportFatiguedHard.slice(0,2).map(([,n]) => n).join(" & ");
    limiters.push(`${sportNames[0]} load on ${mNames}`);
  } else if (sportFatigued.length >= 1 && sportNames.length) {
    helpers.push(`${sportNames[0]} movement — light muscle activation`);
  }

  if (veryHighFat.length === 0 && highFat.length === 0 && MUSCLES.some(([k]) => recovery[k]?.lastTs)) {
    score += 5; helpers.push("Muscles are mostly recovered"); dataPoints++;
  }

  totalWeekSets = MUSCLES.reduce((a,[k]) => a + (volume[k]||0), 0);
  if (totalWeekSets > 120)        { score -= 12; limiters.push(`Very high weekly training volume (${Math.round(totalWeekSets)} sets)`); }
  else if (totalWeekSets > 80)    { score -= 6;  limiters.push(`High weekly volume (${Math.round(totalWeekSets)} sets this week)`); }
  else if (totalWeekSets > 0 && totalWeekSets < 25) { score += 3; helpers.push("Training load is light this week"); }
  if (totalWeekSets > 0) dataPoints++;

  // Consecutive training days
  const nowTs = Date.now();
  const trainedDaysAgo = [1,2,3,4,5].map(d =>
    (workouts||[]).some(w => w.ts >= nowTs - d*864e5 && w.ts < nowTs - (d-1)*864e5)
  );
  const consec = trainedDaysAgo.slice(0,5).reduce((a,v,i,arr) => {
    if (i === 0) return v ? 1 : 0;
    return (arr[i] && arr[i-1]) ? a+1 : a;
  }, 0);
  consecRun = (() => { let c=0; for (let i=0;i<trainedDaysAgo.length;i++) { if(trainedDaysAgo[i]) c++; else break; } return c; })();
  if (consecRun >= 4)             { score -= 12; limiters.push(`Trained ${consecRun} days in a row — rest is due`); dataPoints++; }
  else if (consecRun >= 3)        { score -= 6;  limiters.push("3 consecutive training days"); dataPoints++; }
  const hadRecentRest = trainedDaysAgo.slice(0,3).some(d => !d);
  if (hadRecentRest && totalWeekSets > 20) { score += 3; helpers.push("Had a rest day recently"); }

  // RIR / failure sets in last 3 days
  const recentWos = (workouts||[]).filter(w => w.ts >= nowTs - 3*864e5);
  failSets = 0;
  recentWos.forEach(w => w.exercises?.forEach(ex => ex.sets?.forEach(s => { if (s.rir != null && s.rir <= 1) failSets++; })));
  if (failSets >= 6)              { score -= 7;  limiters.push(`${failSets} near-failure sets in last 3 days`); }
  else if (failSets >= 3)         { score -= 3; }
  } // end training guard

  // === NUTRITION ===
  if (tp.nutrition === false) {
    helpers.push("Nutrition tracking is off");
  } else {
  protein = t?.protein || 0;
  calories = t?.calories || 0;
  pTarget = targets?.protein || 0;
  cTarget = targets?.calories || 0;

  if (pTarget > 0) {
    if (protein >= pTarget * 0.9) {
      dataPoints++; score += 5; helpers.push(`Protein target hit (${Math.round(protein)}g)`);
    } else if (protein > 0) {
      dataPoints++;
      if (protein >= pTarget * 0.7) { score -= 2; }
      else if (protein < pTarget * 0.5) { score -= 8; limiters.push(`Protein very low (${Math.round(protein)}/${Math.round(pTarget)}g)`); }
      else { score -= 4; limiters.push(`Protein below target (${Math.round(protein)}/${Math.round(pTarget)}g)`); }
    } else if (ql?.hitProtein === true) {
      // No food logged but Quick Log says protein was hit
      score += 3; helpers.push("Protein target marked hit (Quick Log)");
      dataPoints++; qlEstimated = true;
    } else if (ql?.hitProtein === false) {
      score -= 4; limiters.push("Protein marked as missed (Quick Log)");
      dataPoints++; qlEstimated = true;
    }
    // else: no data, no penalty
  }

  if (cTarget > 0) {
    if (calories > 0) {
      dataPoints++;
      const cPct = calories / cTarget;
      if (cPct < 0.75 && totalWeekSets > 40) { score -= 8; limiters.push(`Calories low during heavy training (${Math.round(calories)}/${Math.round(cTarget)} kcal)`); }
      else if (cPct >= 0.85 && cPct <= 1.2)  { score += 3; helpers.push("Calories on target"); }
    } else if (ql?.hitCalories === true) {
      score += 2; helpers.push("Calories marked on target (Quick Log)");
      dataPoints++; qlEstimated = true;
    } else if (ql?.hitCalories === false) {
      score -= 3; qlEstimated = true;
    }
  }

  } // end nutrition guard

  // === WATER — own tp.water guard, separate from nutrition ===
  if (tp.water !== false) {
  water = daily?.water || 0;
  wGoal = nutriInfo?.waterGoal || 2000;
  if (wGoal > 0 && water > 0) {
    dataPoints++;
    if (water >= wGoal)               { score += 5; helpers.push("Water goal reached"); }
    else if (water >= wGoal * 0.7)    { score -= 2; }
    else                              { score -= 5; limiters.push(`Water low (${(water/1000).toFixed(1)}L / ${(wGoal/1000).toFixed(1)}L)`); }
  } else if (wGoal > 0) {
    if (ql?.hitWater === true) {
      score += 2; helpers.push("Water goal marked hit (Quick Log)");
      dataPoints++; qlEstimated = true;
    }
    // no water data and no QL → lower confidence only, no penalty
  }
  } // end water guard

  // === ALCOHOL — own tp.alcohol guard, separate from nutrition ===
  if (tp.alcohol !== false) {
  alcohol = daily?.alcohol || 0;
  if (alcohol > 0) {
    dataPoints++;
    score -= Math.min(14, alcohol * 4);
    limiters.push(`${alcohol} drink${alcohol!==1?"s":""} logged — reduces sleep quality and recovery`);
  } else if (ql?.noAlcohol === true) {
    helpers.push("No alcohol · Quick Log"); dataPoints++; qlEstimated = true;
  } else if (daily && Object.keys(daily).some(k => k !== "checkin" && k !== "alcohol" && daily[k])) {
    // Only note "no alcohol" if other daily data is present (avoids false assumption on empty day)
    helpers.push("No alcohol logged"); dataPoints++;
  }
  } // end alcohol guard

  // === STEPS ===
  const steps = daily?.steps || 0;
  if (steps > 0) {
    dataPoints++;
    if (steps >= 5000 && steps <= 13000)    { score += 3; helpers.push(`Steps in healthy range (${steps.toLocaleString()})`); }
    else if (steps > 20000 && totalWeekSets > 40) { score -= 5; limiters.push(`Very high steps on a heavy training week (${steps.toLocaleString()})`); }
  }

  // === PAIN ===
  const painLevel = trainInfo?.pain?.level || "none";
  if (painLevel === "serious")   { score -= 15; limiters.push("Serious pain logged — prioritise rest"); }
  else if (painLevel === "moderate") { score -= 8; limiters.push("Moderate pain active — train around it"); }
  else if (painLevel === "mild") { score -= 3; }

  // === CLAMP ===
  score = Math.max(5, Math.min(100, Math.round(score)));

  // === LABEL & BEST ACTION ===
  let label, bestAction, trainingAdj;
  if (score >= 85)      { label = "Ready";    bestAction = "Push progression";          trainingAdj = "Aim for +1 rep or small weight increase. Normal volume. Hard sets allowed."; }
  else if (score >= 70) { label = "Good";     bestAction = "Train normally";            trainingAdj = "Progress if warm-ups feel good. Normal volume. Skip extra junk volume."; }
  else if (score >= 55) { label = "Moderate"; bestAction = "Train, avoid failure";      trainingAdj = "Match last session or small progression. Keep 1–3 RIR. No extra failure sets."; }
  else if (score >= 40) { label = "Low";      bestAction = "Reduce volume";             trainingAdj = "Reduce sets by 20–40%. Keep technique sharp. Avoid PR chasing today."; }
  else                  { label = "Very Low"; bestAction = "Active recovery or rest";   trainingAdj = "Walking, mobility, easy cardio. Focus on food, water, and sleep. No overload."; }

  // === LOAD LEVEL ===
  const loadLevel = totalWeekSets > 120 ? "Excessive load" : totalWeekSets > 70 ? "High load" : totalWeekSets > 25 ? "Balanced load" : "Low load";

  // === CONFIDENCE ===
  // Quick Log data counts as slightly less reliable — cap at "Medium" if we used estimates
  const confidence = qlEstimated
    ? (dataPoints >= 6 ? "Medium" : "Low")
    : (dataPoints >= 6 ? "High" : dataPoints >= 3 ? "Medium" : "Low");

  // === CHECKLIST (max 5) ===
  const checklist = [];
  if (pTarget > 0) checklist.push({ label: `Hit protein target (${Math.round(pTarget)}g)`, done: protein >= pTarget * 0.9 });
  if (wGoal > 0)   checklist.push({ label: `Drink ${(wGoal/1000).toFixed(1)}L of water`, done: water >= wGoal });
  checklist.push({ label: "Avoid alcohol tonight", done: alcohol === 0 });
  checklist.push({ label: "Get enough sleep tonight", done: false });
  if (score < 70)  checklist.push({ label: score < 40 ? "Take a rest or active recovery day" : "Keep sets away from failure (1–3 RIR)", done: false });
  else if (steps < 5000) checklist.push({ label: "Do a 20–30 min easy walk", done: steps >= 5000 });

  // === RECOVERY WEEK ===
  const rwReasons = [];
  if (totalWeekSets > 100) rwReasons.push("very high weekly volume");
  if (consecRun >= 4) rwReasons.push("4+ consecutive training days");
  if (debtMin > 120) rwReasons.push("significant sleep debt");
  if (failSets >= 8) rwReasons.push("many near-failure sets");
  if (painLevel === "serious" || painLevel === "moderate") rwReasons.push("active pain");
  const recoveryWeek = rwReasons.length >= 3;

  // === MUSCLE STATUS ===
  const muscleStatus = {};
  const _trainingOff = tp.training === false;
  MUSCLES.forEach(([k,n]) => {
    if (_trainingOff) {
      muscleStatus[k] = { name: n, fatigue: 0, status: "Training tracking off", color: "#A89E89", quickLogged: false, hasData: false, trackingOff: true };
      return;
    }
    const f = recovery[k]?.fatigue || 0;
    const isQL = !!(recovery[k]?.quickLogged);
    const isSport = !!(recovery[k]?.sportSource);
    const sportName = recovery[k]?.sportName || null;
    const sportNames = recovery[k]?.sportNames || (sportName ? [sportName] : []);
    const noData = recovery[k]?.hasData === false;
    const isSportStacked = !!(recovery[k]?.sportStacked);
    const status = noData ? "No workout logged"
      : isQL ? "Estimated from Quick Log"
      : isSport
        ? (f >= 75 ? "Very fatigued" : f >= 50 ? "Fatigued" : f >= 25 ? "Worked" : "Light impact")
        : f >= 80 ? "Very fatigued" : f >= 55 ? "Fatigued" : f >= 25 ? "Ready" : "Fresh";
    const color = noData ? "#A89E89"
      : isQL ? (f >= 55 ? "#F4A261" : "#74C69D")
      : isSport ? (f >= 75 ? "#E0714A" : f >= 50 ? "#F4A261" : f >= 25 ? "#D4A843" : "#74C69D")
      : f >= 80 ? "#E0714A" : f >= 55 ? "#F4A261" : f >= 25 ? "#74C69D" : "#52B788";
    const sourceLabel = isSportStacked ? "workout + sport"
      : isSport ? (sportNames && sportNames.length > 1 ? sportNames.join(" + ") : sportName || "sport")
      : null;
    muscleStatus[k] = { name: n, fatigue: f, status, color, quickLogged: isQL, sportSource: isSport, sportStacked: isSportStacked, sportName, sportNames, sourceLabel, hasData: !noData, trackingOff: false };
  });

  const suggestActiveRecovery = score < 55 && painLevel !== "serious" && totalWeekSets > 20;

  // Build a human-readable source explanation for the UI
  const sourceLines = [];
  if (tp.sleep === false)       sourceLines.push("Sleep tracking off — not included");
  else if (lastSleep?.durationMin) sourceLines.push("Sleep: from sleep log");
  else if (ql?.enoughSleep != null) sourceLines.push("Sleep: estimated from Quick Log");
  else                          sourceLines.push("Sleep: not logged today");
  if (tp.training === false)    sourceLines.push("Training tracking off — not included");
  else if (totalWeekSets > 0)   sourceLines.push("Training: from workout history");
  else if (ql?.trainedToday)    sourceLines.push("Training: estimated from Quick Log");
  else                          sourceLines.push("Training: no workout logged");
  if (tp.nutrition === false)   sourceLines.push("Nutrition tracking off — not included");
  else if ((t?.protein||0) > 0) sourceLines.push("Nutrition: from food log");
  else if (ql?.hitProtein != null) sourceLines.push("Nutrition: estimated from Quick Log");
  else                          sourceLines.push("Nutrition: not logged today");
  if (dataPoints === 0)         sourceLines.push("No data logged yet — confidence is low");

  return {
    score, label, loadLevel, bestAction, trainingAdj,
    limiters: limiters.slice(0,4), helpers: helpers.slice(0,4),
    checklist: checklist.slice(0,5),
    confidence, recoveryWeek, rwReasons, muscleStatus, suggestActiveRecovery,
    sourceLines,
  };
}

// figure out WHY a sleep score is what it is + one fix for tonight (helper end)
export const gauss = (x, mu, sig) => Math.exp(-((x - mu) ** 2) / (2 * sig * sig));
export function energyCurve({ wakeMin, bedMin, debtMin, meals }) {
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
export function bestGymWindow(curve, meals, wakeMin, bedMin) {
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
export function smartWake(bedTs, latestWakeMin, windowMin) {
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
export const MUSCLES = [
  ["chest", "Chest"], ["back", "Back"], ["traps", "Traps"], ["shoulders", "Shoulders"],
  ["biceps", "Biceps"], ["triceps", "Triceps"], ["forearms", "Forearms"], ["abs", "Abs"],
  ["lower_back", "Lower back"], ["glutes", "Glutes"], ["quads", "Quads"],
  ["hamstrings", "Hamstrings"], ["calves", "Calves"],
];
export const RECOVER_BASE = { chest: 54, back: 60, traps: 40, shoulders: 44, biceps: 40, triceps: 42, forearms: 30, abs: 30, lower_back: 60, glutes: 60, quads: 64, hamstrings: 60, calves: 36 };

export const EXERCISES = [
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
export const findEx = (name) => EXERCISES.find((e) => e.name === name);
export const restDefault = (ex) => (ex?.type === "compound" ? 180 : 75);
export const est1RM = (w, reps) => (reps <= 0 ? 0 : w * (1 + reps / 30));
export const bestSetOf = (sets) => sets.reduce((b, s) => (est1RM(s.w, s.reps) > est1RM(b.w, b.reps) ? s : b), sets[0]);

export function weeklyVolume(workouts) {
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
// Quick-log muscle estimates — maps trainingType → muscle keys with estimated fatigue
export function applyQuickLogMuscles(ql) {
  if (!ql?.trainedToday) return {};
  const type = ql.trainingType || "full_body";
  const intensity = ql.trainingIntensity || "normal";
  const fat = intensity === "hard" ? 72 : intensity === "easy" ? 35 : 55;
  const MAP = {
    upper:     ["chest","back","shoulders","biceps","triceps"],
    push:      ["chest","shoulders","triceps"],
    pull:      ["back","biceps"],
    lower:     ["quads","hamstrings","glutes","calves"],
    legs:      ["quads","hamstrings","glutes","calves"],
    full_body: ["chest","back","shoulders","biceps","triceps","quads","hamstrings","glutes","calves"],
    cardio:    [],
    sport:     ["quads","hamstrings","glutes","calves"],
    custom:    [],
  };
  const muscles = MAP[type] || MAP.full_body;
  const result = {};
  muscles.forEach((k) => { result[k] = { fatigue: fat, quickLogged: true }; });
  return result;
}

// ── Sport-name normalizer aliases (legacy CARDIO_TYPES ids → SPORTS_LIBRARY ids) ──
export const SPORT_ID_ALIASES = {
  "football": "football",
  "running":  "running",
  "cycling":  "cycling",
  "boxing":   "boxing",
  "walking":  "walking",
  "jogging":  "jogging",
  "soccer":   "football",
  "bjj":      "bjj",
  "jiu jitsu":           "bjj",
  "brazilian jiu-jitsu": "bjj",
  "muay thai":   "muay_thai",
  "kickboxing":  "kickboxing",
  "mma":         "mma",
  "wrestling":   "wrestling",
  "swimming":    "swimming",
  "basketball":  "basketball",
  "yoga":        "yoga",
  "pilates":     "pilates",
  "rowing":      "rowing",
  "elliptical":  "elliptical",
  "stationary bike": "stationary_bike",
  "stationary_bike": "stationary_bike",
  "hiking":    "hiking",
  "climbing":  "climbing",
  "hiit":      "hiit",
};

// Fallback muscle impacts (numeric %, 0-85) for sessions with no SPORTS_LIBRARY match.
// Used when sportId + sportName resolution both fail.
export const SPORT_FALLBACK_IMPACTS = {
  football: { quads:70, hamstrings:70, glutes:45, calves:70, abs:45 },
  soccer:   { quads:70, hamstrings:70, glutes:45, calves:70, abs:45 },
  running:  { quads:45, hamstrings:45, glutes:45, calves:70, abs:20 },
  jogging:  { quads:30, hamstrings:30, glutes:30, calves:45, abs:20 },
  cycling:  { quads:70, glutes:45, calves:45, hamstrings:45, abs:20 },
  boxing:   { shoulders:70, abs:70, chest:45, triceps:45, back:45, calves:45 },
  kickboxing: { shoulders:70, abs:70, quads:45, hamstrings:45, glutes:45, calves:70, triceps:45 },
  muay_thai:  { shoulders:70, abs:70, quads:45, hamstrings:45, glutes:45, calves:70, triceps:45 },
  bjj:      { back:70, biceps:70, shoulders:70, abs:70, glutes:45, hamstrings:45, quads:45 },
  wrestling:{ back:70, biceps:70, shoulders:70, abs:70, glutes:45, hamstrings:45, quads:45 },
  judo:     { back:70, shoulders:70, biceps:45, abs:45, glutes:20, quads:20 },
  mma:      { back:70, shoulders:70, chest:45, biceps:45, abs:70, quads:45, hamstrings:45 },
  swimming: { back:70, shoulders:70, chest:45, triceps:45, abs:45, quads:20, hamstrings:20 },
  basketball:{ quads:70, calves:70, glutes:45, hamstrings:45, abs:45 },
  yoga:     { abs:20, shoulders:20, glutes:20, hamstrings:20, quads:20 },
  mobility: { abs:20, shoulders:20, glutes:20 },
  stretching:{ abs:20, shoulders:20, glutes:20 },
  walking:  { quads:20, hamstrings:20, glutes:20, calves:20 },
  hiking:   { quads:45, glutes:45, hamstrings:45, calves:45 },
  rowing:   { back:70, biceps:45, shoulders:45, abs:45, quads:45, glutes:45, hamstrings:45 },
  hiit:     { quads:45, glutes:45, abs:70, shoulders:45, chest:20, calves:45 },
  climbing: { back:70, biceps:70, forearms:70, shoulders:45, abs:45, quads:20 },
  sprints:  { quads:70, hamstrings:70, glutes:70, calves:70, abs:45 },
  elliptical:{ quads:45, glutes:45, hamstrings:20, calves:20, abs:20 },
};

/**
 * Find a SPORTS_LIBRARY entry for a session.
 * Tries: sportId → exact name → normalised name → alias map → null.
 */
export function findSportDefinition(session) {
  // 1. Direct sportId match
  if (session.sportId) {
    const byId = SPORTS_LIBRARY.find(s => s.id === session.sportId);
    if (byId) return byId;
  }
  // 2. Legacy CARDIO_TYPES type field (walking, running, football, …)
  if (session.type) {
    const byType = SPORTS_LIBRARY.find(s => s.id === session.type);
    if (byType) return byType;
  }
  // 3. sportName exact (case-insensitive)
  const rawName = (session.sportName || session.type || "").toLowerCase().trim();
  if (rawName) {
    const byName = SPORTS_LIBRARY.find(s => s.name.toLowerCase() === rawName);
    if (byName) return byName;
    // 4. Alias map
    const aliasId = SPORT_ID_ALIASES[rawName];
    if (aliasId) {
      const byAlias = SPORTS_LIBRARY.find(s => s.id === aliasId);
      if (byAlias) return byAlias;
    }
    // 5. Partial match (begins with)
    const byPartial = SPORTS_LIBRARY.find(s => rawName.includes(s.id) || s.id.includes(rawName));
    if (byPartial) return byPartial;
  }
  return null;
}

/**
 * Resolve muscle impact (numeric % values, 0-85) for any sport/cardio session.
 * Priority: saved muscleImpact → SPORTS_LIBRARY lookup → SPORT_FALLBACK_IMPACTS → null
 */
export function resolveSessionMuscleImpact(session) {
  // Already have numeric impact saved → use it directly
  if (session.muscleImpact && typeof session.muscleImpact === "object" &&
      Object.keys(session.muscleImpact).length > 0) {
    return session.muscleImpact;
  }
  // Try SPORTS_LIBRARY
  const sportDef = findSportDefinition(session);
  if (sportDef) {
    return sportMuscleImpact(sportDef, session.durationMin || session.minutes || 30, session.intensity || "moderate");
  }
  // Fallback impact table
  const key = (session.sportId || session.type || "").toLowerCase();
  const rawName = (session.sportName || session.type || "").toLowerCase().trim();
  const fallback = SPORT_FALLBACK_IMPACTS[key] || SPORT_FALLBACK_IMPACTS[rawName] ||
    SPORT_FALLBACK_IMPACTS[SPORT_ID_ALIASES[rawName]] || null;
  if (fallback) {
    // Scale fallback by intensity
    const iF = { easy: 0.65, moderate: 1.0, hard: 1.35 }[session.intensity] || 1.0;
    const dMin = session.durationMin || session.minutes || 30;
    const dF = Math.min(2.0, dMin / 60);
    const scaled = {};
    Object.entries(fallback).forEach(([k, v]) => {
      scaled[k] = Math.min(85, Math.round(v * iF * dF));
    });
    return scaled;
  }
  return null;
}

/**
 * Combine today's sportSessions, legacy cardioSessions, and past-day sportSessionsLog
 * into one normalised list for muscleRecovery.
 *
 * Normalised session shape guaranteed:
 *   { id, ts, date, sportId, sportName, durationMin, intensity, muscleImpact }
 */
export function normalizeMovementSessionsForMuscleRecovery({ daily, sportSessionsLog, date }) {
  const seen = new Set();
  const out = [];

  function add(sess) {
    const key = sess.id || `${sess.date||""}|${sess.sportName||sess.type||""}|${sess.durationMin||sess.minutes||""}|${sess.intensity||""}`;
    if (seen.has(key)) return;
    seen.add(key);
    const impact = resolveSessionMuscleImpact(sess);
    if (!impact || Object.keys(impact).length === 0) return; // no muscle data, skip
    out.push({
      ...sess,
      sportId:    sess.sportId   || sess.type  || null,
      sportName:  sess.sportName || sess.type  || "Activity",
      durationMin: sess.durationMin || sess.minutes || 30,
      ts:         sess.ts        || Date.now(),
      muscleImpact: impact,
    });
  }

  // 1. Today's new-format sport sessions
  (Array.isArray(daily?.sportSessions) ? daily.sportSessions : []).forEach(add);

  // 2. Legacy cardio sessions (CardioCard — { id, ts, type, minutes, intensity })
  (Array.isArray(daily?.cardioSessions) ? daily.cardioSessions : []).forEach(cs => {
    add({ ...cs, sportName: cs.type, durationMin: cs.minutes });
  });

  // 3. Cross-day sport session log (sessions from yesterday/day before, within 48 h)
  const cutoff = Date.now() - 48 * 36e5;
  (Array.isArray(sportSessionsLog) ? sportSessionsLog : [])
    .filter(s => (s.ts || 0) > cutoff && s.date !== date)
    .forEach(add);

  return out;
}

export function muscleRecovery(workouts, readiness, quickLog, tp = {}, sportSessions = []) {
  if (tp.training === false) {
    const out = {};
    MUSCLES.forEach(([k]) => { out[k] = { recovered: false, remaining: 0, fatigue: 0, lastTs: null, setCount: 0, full: RECOVER_BASE[k], trackingOff: true, hasData: false }; });
    return out;
  }
  const out = {};
  const factor = readiness >= 75 ? 0.85 : readiness >= 55 ? 1 : readiness >= 35 ? 1.15 : 1.3;
  const qlMuscles = applyQuickLogMuscles(quickLog);

  // Pre-compute sport fatigue from ALL recent sport sessions (today + past days, within 48h)
  // muscle → {fatigue, ts, sportName, sportNames[]}
  const sportFatigue = {};
  sportSessions.forEach((ss) => {
    const ts = ss.ts || Date.now();
    const since = (Date.now() - ts) / 36e5;
    if (since > 48) return; // only sessions within 48h matter
    // Use the normalised muscle impact (resolveSessionMuscleImpact covers saved impact + library + fallback)
    const rawImpact = resolveSessionMuscleImpact(ss);
    if (!rawImpact || Object.keys(rawImpact).length === 0) return;
    const full = 48;
    Object.entries(rawImpact).forEach(([k, basePct]) => {
      // Linear decay: at time 0 → full impact; at 48h → 0
      const remaining = Math.max(0, full * (basePct / 100) - since);
      const decayed = Math.round((remaining / full) * 100);
      if (decayed <= 0) return;
      if (!sportFatigue[k] || decayed > sportFatigue[k].fatigue) {
        sportFatigue[k] = {
          fatigue: decayed,
          ts,
          sportName: ss.sportName || ss.sportId || "Sport",
          sportNames: [ss.sportName || ss.sportId || "Sport"],
        };
      } else if (sportFatigue[k] && !sportFatigue[k].sportNames.includes(ss.sportName)) {
        // Multiple sports hitting the same muscle — accumulate (capped)
        sportFatigue[k].fatigue = Math.min(98, sportFatigue[k].fatigue + Math.round(decayed * 0.3));
        sportFatigue[k].sportNames.push(ss.sportName || ss.sportId || "Sport");
      }
    });
  });

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
    if (!lastTs) {
      // No gym workout for this muscle — fall back to sport estimate, then QL
      if (sportFatigue[k] && sportFatigue[k].fatigue > 0) {
        const sf = sportFatigue[k];
        const recHours = Math.round(sf.fatigue * 0.48); // hours until fully recovered
        out[k] = {
          recovered: false,
          remaining: recHours,
          fatigue: sf.fatigue,
          lastTs: sf.ts,
          setCount: 0,
          full: 48,
          sportSource: true,
          sportName: sf.sportName,
          sportNames: sf.sportNames,
          hasData: true,
        };
      } else if (qlMuscles[k]) {
        const qf = qlMuscles[k].fatigue;
        out[k] = { recovered: false, remaining: 24, fatigue: qf, lastTs: Date.now(), setCount: 0, full: 48, quickLogged: true, hasData: true };
      } else {
        out[k] = { recovered: true, remaining: 0, fatigue: 0, lastTs: null, setCount: 0, full: RECOVER_BASE[k], hasData: false };
      }
      return;
    }
    const full = (RECOVER_BASE[k] + Math.min(40, setCount * 4)) * factor;
    const since = (Date.now() - lastTs) / 36e5;
    const remaining = Math.max(0, full - since);
    let baseFatigue = Math.round(Math.min(100, (remaining / full) * 100));
    // Gym is recovered — sport is now the sole fatigue source, use it directly
    if (remaining <= 0 && sportFatigue[k] && sportFatigue[k].fatigue > 0) {
      const sf = sportFatigue[k];
      out[k] = {
        recovered: false,
        remaining: Math.round(sf.fatigue * 0.48),
        fatigue: sf.fatigue,
        lastTs: sf.ts,
        setCount: Math.round(setCount),
        full: 48,
        sportSource: true,
        sportStacked: true,
        sportName: sf.sportName,
        sportNames: sf.sportNames,
        hasData: true,
      };
      return;
    }
    // Gym still active — stack sport additively at 50% (capped at 98)
    if (sportFatigue[k] && sportFatigue[k].fatigue > 0) {
      baseFatigue = Math.min(98, baseFatigue + Math.round(sportFatigue[k].fatigue * 0.5));
    }
    const _hasSport = !!(sportFatigue[k] && sportFatigue[k].fatigue > 0);
    out[k] = {
      recovered: remaining <= 0,
      remaining: Math.round(remaining),
      fatigue: baseFatigue,
      lastTs,
      setCount: Math.round(setCount),
      full: Math.round(full),
      sportStacked: _hasSport,
      sportSource: _hasSport, // gym + sport: mark as sport-influenced so status uses sport labels
      sportName: sportFatigue[k]?.sportName,
      sportNames: sportFatigue[k]?.sportNames,
    };
  });
  return out;
}
// strength standards (male ratio = est1RM / bodyweight) at [beginner, novice, intermediate, advanced, elite]
export const STD = {
  bench: [0.5, 0.75, 1.0, 1.5, 2.0], squat: [0.75, 1.25, 1.5, 2.25, 2.75],
  deadlift: [1.0, 1.5, 2.0, 2.5, 3.0], ohp: [0.35, 0.55, 0.7, 0.95, 1.2],
  row: [0.5, 0.75, 1.0, 1.4, 1.75], curl: [0.2, 0.35, 0.5, 0.7, 0.95],
};
export const STD_PCT = [10, 30, 55, 85, 97];
export const sexFactor = (sex) => (sex === "female" ? 0.74 : 1);
export const avgBW = (sex) => (sex === "female" ? 65 : 80);
export const MUSCLE_LIFT = { chest: "bench", quads: "squat", hamstrings: "deadlift", glutes: "deadlift", back: "row", shoulders: "ohp", biceps: "curl" };
export const MUSCLE_LIFT_FB = { triceps: "bench", traps: "deadlift", forearms: "row", abs: "squat", calves: "squat", lower_back: "deadlift" };
export const TIERS = [
  { name: "Bronze", min: 0, color: "#B0763D" }, { name: "Silver", min: 25, color: "#98A2AD" },
  { name: "Gold", min: 50, color: "#D9A23C" }, { name: "Champion", min: 75, color: "#7A6FB0" },
  { name: "Elite", min: 93, color: "#E0714A" },
];
export const tierFor = (pct) => [...TIERS].reverse().find((tt) => pct >= tt.min) || TIERS[0];
export function pctFromAnchors(val, a) {
  if (val <= a[0]) return Math.max(1, (val / a[0]) * STD_PCT[0]);
  for (let i = 0; i < a.length - 1; i++) {
    if (val <= a[i + 1]) { const f = (val - a[i]) / (a[i + 1] - a[i]); return STD_PCT[i] + f * (STD_PCT[i + 1] - STD_PCT[i]); }
  }
  return Math.min(99.9, STD_PCT[STD_PCT.length - 1] + (val / a[a.length - 1] - 1) * 30);
}
export function bestE1RMForLift(workouts, liftKey) {
  let best = 0;
  workouts.forEach((w) => w.exercises.forEach((ex) => {
    if (findEx(ex.name)?.lift === liftKey) ex.sets.forEach((s) => (best = Math.max(best, est1RM(s.w, s.reps))));
  }));
  return best;
}

// Resolve an exercise's primary muscle group — works for DB exercises, custom names, and
// logged exercises (which store their own `group`). Used so strength grades aren't limited
// to the handful of `.lift`-tagged barbell lifts.
export function getMuscleGroupForExercise(ex) {
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
export function bestE1RMForMuscle(workouts, muscleKey, liftKey) {
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

export function ranking(workouts, profile, mode) { // mode: 'relative' | 'absolute'
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
export function suggestNext(workouts, exName) {
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
export function exLastBest(workouts, exName) {
  let best = 0, bestSet = null;
  workouts.forEach((w) => w.exercises.forEach((ex) => { if (ex.name === exName) ex.sets.forEach((s) => { const e = est1RM(s.w, s.reps); if (e > best) { best = e; bestSet = s; } }); }));
  return { best, bestSet };
}
// Detect whether a just-logged set is a personal record vs all prior history for that exercise.
// Returns { kind, label, subLabel } for the strongest PR type, or null.
// Priority: e1RM > weight > reps (at same weight) > single-set volume > session volume.
// `activeExSets` = sets already logged THIS session for this exercise (for session-volume PR).
export function detectSetPR(workouts, exName, W, R, activeExSets) {
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
    const delta = maxE1 > 0 ? ` ↑${Math.round(thisE1 - maxE1)}` : "";
    return { kind: "e1rm", label: `Best 1RM · ${Math.round(thisE1)} kg${delta}` };
  }
  // 2. Weight PR — heaviest ever loaded
  if (W > maxW) {
    return { kind: "weight", label: `Weight PR · ${W} kg × ${R}` };
  }
  // 3. Rep PR at this exact weight
  const prevRepsAtW = repsAtW[W] || 0;
  if (R > prevRepsAtW) {
    return { kind: "reps", label: `Rep PR · ${R} reps at ${W} kg` };
  }
  // 4. Single-set volume PR
  if (thisVol > maxVol * 1.001) {
    return { kind: "volume", label: `Set Volume PR · ${Math.round(thisVol)} kg` };
  }
  // 5. Session volume PR
  if (activeExSets && activeExSets.length > 0) {
    const prevSetsVol = activeExSets.reduce((acc, s) => acc + (s.w || 0) * (s.reps || 0), 0);
    const newSessionVol = prevSetsVol + thisVol;
    if (newSessionVol > maxSessionVol * 1.001) {
      return { kind: "session-volume", label: `Volume PR · ${Math.round(newSessionVol)} kg` };
    }
  }
  return null;
}
// Compute a workout recap on the fly. `priorWorkouts` are the sessions BEFORE this one
// (used to detect records/overloads). Works for old workouts with no stored recap.
export function recapFor(workout, priorWorkouts) {
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
export function makeWin(type, title, detail, source) {
  return { id: "win_" + Math.random().toString(36).slice(2, 9), type, title, detail, source, createdAt: new Date().toISOString(), kudoed: false };
}
// Merge new wins into a day's existing list, skipping any whose `type` already exists that day.
export function mergeWins(existingForDay, candidates) {
  const seen = new Set((existingForDay || []).map((w) => w.type));
  const added = [];
  for (const c of candidates) { if (!seen.has(c.type)) { seen.add(c.type); added.push(c); } }
  return { merged: [...(existingForDay || []), ...added], added };
}
// Daily nutrition/movement wins from the day's snapshot. Pure — returns candidate wins.
export function detectDayWins({ t, daily, targets, sleepInfo, profile, quickLog }) {
  const out = [];
  const ql = quickLog || null;
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
  // Quick Log wins — only fire when no exact data covers the same category
  if (ql) {
    const hasExactProtein = t && (t.protein || 0) >= (targets?.protein || 1);
    const hasExactWater = daily && (daily.water || 0) > 0;
    const hasExactSteps = daily && (daily.steps || 0) > 0;
    const hasExactCalories = t && (t.calories || 0) > 0;
    if (!hasExactProtein && ql.hitProtein === true)
      out.push(makeWin("ql_protein", "Protein target hit", "Protein goal marked hit via Quick Log.", "nutrition"));
    if (!hasExactCalories && ql.hitCalories === true)
      out.push(makeWin("ql_calories", "Calories on track", "Calorie target marked on track via Quick Log.", "nutrition"));
    if (!hasExactWater && ql.hitWater === true)
      out.push(makeWin("ql_water", "Hydration covered", "Water goal marked hit via Quick Log.", "nutrition"));
    if (!hasExactSteps && ql.enoughMovement === true)
      out.push(makeWin("ql_movement", "Movement done", "Movement marked enough via Quick Log.", "movement"));
    if (ql.trainedToday === true)
      out.push(makeWin("ql_trained", "Training done", ql.trainingType ? `${ql.trainingType.replace(/_/g, " ")} session logged.` : "Training logged via Quick Log.", "movement"));
    if (ql.enoughSleep === true)
      out.push(makeWin("ql_sleep", "Rested well", "Slept enough logged via Quick Log.", "sleep"));
    if (ql.noAlcohol === true)
      out.push(makeWin("ql_no_alcohol", "Alcohol-free day", "No alcohol today — good for recovery.", "nutrition"));
  }
  return out;
}
// Sleep wins computed when a night is logged.
export function detectSleepWins({ log, sleepInfo, profile }) {
  const out = [];
  if (!log) return out;
  const need = (profile?.sleepNeedMin) || 480;
  if ((log.durationMin || 0) >= need) out.push(makeWin("sleep_need", "Sleep target reached", `You slept ${Math.floor(log.durationMin / 60)}h ${log.durationMin % 60}m — at or above your need.`, "sleep"));
  if (sleepInfo && sleepInfo.debtTrend === "down") out.push(makeWin("sleep_debt_down", "Sleep debt reduced", "Your sleep debt is trending down.", "sleep"));
  if ((log.score || 0) >= 80) out.push(makeWin("sleep_quality", "Great night's sleep", `Sleep score ${log.score}.`, "sleep"));
  return out;
}
// Workout wins from a finished workout's recap.
export function detectWorkoutWins(recap) {
  const out = [];
  out.push(makeWin("workout_done", "Workout completed", `${recap.exerciseCount} exercises · ${recap.totalSets} sets · ${recap.totalVolume.toLocaleString()} kg.`, "workout"));
  (recap.recordLifts || []).forEach((r) => {
    const slug = r.name.toLowerCase().replace(/\s+/g, "_").slice(0, 24);
    if (r.firstTime) out.push(makeWin("first_" + slug, "New exercise logged", `${r.name}: first e1RM ${r.e1RM} kg.`, "workout"));
    else out.push(makeWin("pr_" + slug, "New best", `${r.name}: e1RM ${r.e1RM} kg (was ${r.prev}).`, "workout"));
  });
  return out;
}

export function plateLoad(target, bar = 20) {
  let each = (target - bar) / 2; if (each <= 0) return [];
  const avail = [25, 20, 15, 10, 5, 2.5, 1.25]; const res = [];
  avail.forEach((p) => { while (each >= p - 1e-9) { res.push(p); each = +(each - p).toFixed(3); } });
  return res;
}

// generate ramp-up warm-up sets toward a working weight (compound lifts get more ramp)
export function warmupSets(workingWeight, meta, unit = "kg") {
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
export const MOBILITY_PREP = {
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
export function mobilityFor(meta) {
  if (!meta) return [];
  return MOBILITY_PREP[meta.group] || [];
}

export function recoveryColor(fatigue) {
  // 0 = recovered (green), 50 = amber, 100 = red
  const stops = fatigue <= 50
    ? [[107, 174, 120], [217, 162, 60], fatigue / 50]
    : [[217, 162, 60], [224, 113, 74], (fatigue - 50) / 50];
  const [a, b, f] = stops;
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
export function liftE1RMSeries(workouts, exName) {
  const out = [];
  workouts.forEach((w) => {
    let best = 0;
    w.exercises.forEach((ex) => { if (ex.name === exName) ex.sets.forEach((s) => (best = Math.max(best, est1RM(s.w, s.reps)))); });
    if (best > 0) out.push({ ts: w.ts, e1: best });
  });
  return out;
}
export function stallingLifts(workouts) {
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
export function deloadAdvice(workouts, debtMin, recovery) {
  const stalls = stallingLifts(workouts);
  const fatigued = MUSCLES.filter(([k]) => recovery[k].fatigue > 70).length;
  const reasons = [];
  if (stalls.length >= 2) reasons.push(`${stalls.length} main lifts have stalled`);
  if (debtMin > 300) reasons.push(`high sleep debt (${durLabel(debtMin)})`);
  if (fatigued >= 6) reasons.push("most muscle groups are under-recovered");
  return { suggest: reasons.length >= 2, reasons, stalls };
}
export function detectPRs(workouts) {
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
export const VOLUME_TARGETS = {
  chest: [10, 20], back: [12, 22], traps: [6, 16], shoulders: [10, 20],
  biceps: [8, 18], triceps: [8, 18], forearms: [4, 12], abs: [6, 16],
  lower_back: [4, 12], glutes: [8, 18], quads: [10, 20], hamstrings: [8, 18], calves: [8, 16],
};
// muscles split by movement family
export const PUSH_M = ["chest", "shoulders", "triceps"];
export const PULL_M = ["back", "biceps", "traps", "forearms"];
export const LEG_M  = ["quads", "hamstrings", "glutes", "calves"];
export const UPPER_M = [...PUSH_M, ...PULL_M];

export function volumeStatus(setsThisWeek, key) {
  const [lo, hi] = VOLUME_TARGETS[key] || [10, 20];
  if (setsThisWeek === 0) return { tag: "none", lo, hi };
  if (setsThisWeek < lo * 0.6) return { tag: "low", lo, hi };
  if (setsThisWeek < lo) return { tag: "under", lo, hi };
  if (setsThisWeek <= hi) return { tag: "good", lo, hi };
  if (setsThisWeek <= hi * 1.3) return { tag: "high", lo, hi };
  return { tag: "over", lo, hi };
}
export const VOL_TAG_LABEL = { none: "untrained · −", low: "low ↓", under: "needs more ↓", good: "good ✓", high: "high ↑", over: "too much ↑↑" };
export const VOL_TAG_COLOR = (tag) => tag === "good" ? "#6BAE78" : tag === "high" ? "#D9A23C" : tag === "over" ? "#E0714A" : tag === "none" ? "#A89E89" : "#D9A23C";

// suggest one of: rest, mobility, push, pull, legs, upper, lower, full
export function suggestSplit({ workouts, recovery, volume, sleepReadiness, debtMin, daily, trainedToday, routines }) {
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
export function progressionFor(workouts, exName, daily, sleepReadiness, prefRange, intensityStyle) {
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
export const TEMPLATES = [
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
export const clamp100 = (x) => Math.max(0, Math.min(100, Math.round(x)));
export const WATER_TARGET = 2500;   // ml
export const STEPS_TARGET = 8000;

// ─── Tracking Preferences ───────────────────────────────────────────────────
// Central registry. Disabling = hidden/inactive, NOT data-deleted.
export const DEFAULT_TRACKING_PREFS = {
  nutrition: true, training: true, sleep: true, habits: true,
  recovery: true, health: true, coach: true, progress: true,
  water: true, supplements: true, alcohol: true, movement: true, cardio: true,
};
// Migrate onboarding focusAreas → tracking prefs (runs once on first load).
export function migrateTrackingPrefs(focusAreas, existing) {
  if (existing && typeof existing === "object" && "nutrition" in existing && "training" in existing) {
    // Already set — merge any missing keys with defaults
    return { ...DEFAULT_TRACKING_PREFS, ...existing };
  }
  const fa = Array.isArray(focusAreas) ? focusAreas : [];
  if (!fa.length || fa.includes("all")) return { ...DEFAULT_TRACKING_PREFS, updatedAt: Date.now() };
  // User chose specific areas in onboarding — disable categories not selected
  const has = (k) => fa.includes(k);
  return {
    nutrition:   has("nutrition"),
    training:    has("training"),
    sleep:       has("sleep"),
    habits:      has("habits"),
    recovery:    has("recovery") || has("training"),
    health:      true,  // not in onboarding choices → default on
    coach:       true,
    progress:    true,
    water:       has("nutrition"),
    supplements: has("nutrition"),
    alcohol:     has("nutrition"),
    movement:    has("training"),
    cardio:      has("training"),
    updatedAt:   Date.now(),
  };
}

// six 0-100 sub-scores from whatever data exists today
export function dailyScores({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile, quickLog, tp = {}, recoveryInfo = null }) {
  const ql = quickLog || null;
  const effectivelyTrained = trainedToday || (ql?.trainedToday === true);
  const effectivelyMoved = (daily.steps || 0) > 0 || effectivelyTrained || (daily.cardioMin || 0) > 0 || (ql?.enoughMovement === true);

  // nutrition: protein + calorie proximity + fiber — null until the user logs any food today,
  // so an empty log isn't scored as a near-zero (we don't punish "not logged" as "bad").
  const ateToday = (t.calories || 0) > 0 || (t.protein || 0) > 0;
  const qlNutrition = !ateToday && (ql?.hitProtein === true || ql?.hitCalories === true);
  const protP = targets.protein ? Math.min(1, t.protein / targets.protein) : 0;
  const calRatio = targets.calories ? t.calories / targets.calories : 0;
  const calScore = calRatio === 0 ? 0 : calRatio <= 1 ? 60 + calRatio * 40 : Math.max(50, 100 - (calRatio - 1) * 120);
  const fiberP = targets.fiber ? Math.min(1, t.fiber / targets.fiber) : 0;
  // If exact food logged: use it. If quick log says hit: give estimated 80. Otherwise null.
  const nutritionRaw = ateToday ? clamp100(protP * 55 + (calScore / 100) * 30 + fiberP * 15) : qlNutrition ? 78 : null;
  const nutrition = tp.nutrition === false ? null : nutritionRaw;

  // sleep: last night score adjusted for debt; null if no data; quickLog fallback
  const sleepRaw = sleepInfo.lastSleep
    ? clamp100(sleepInfo.lastSleep.score - sleepInfo.debtMin / 36)
    : (ql?.enoughSleep === true ? 72 : ql?.enoughSleep === false ? 42 : null);
  const sleep = tp.sleep === false ? null : sleepRaw;

  // training/recovery readiness — null when training is disabled
  const training = tp.training === false ? null : clamp100(recoveryInfo?.score ?? trainInfo.bodyReadiness);  // canonical recovery score

  // movement: steps + workout + quickLog — null only when no signal at all
  const stepP = Math.min(1, (daily.steps || 0) / STEPS_TARGET);
  const hasExactMovement = (daily.steps || 0) > 0 || (daily.cardioMin || 0) > 0;
  // When QL covers movement (no exact steps/cardio), use honest estimate rather than
  // calculating from stepP=0 which produces a misleadingly low score like 20.
  const qlMovementCovered = !hasExactMovement && (ql?.enoughMovement === true || ql?.trainedToday === true);
  const movementRaw = effectivelyMoved
    ? qlMovementCovered
      ? (ql?.enoughMovement === true ? 82 : 72)   // QL estimate — honest, not fake-exact
      : clamp100(stepP * 80 + (effectivelyTrained ? 20 : 0))  // exact data path
    : null;
  const movement = tp.movement === false ? null : movementRaw;

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
  // water only counts toward habits if water tracking is enabled
  let habits = tp.water !== false ? 55 + waterP * 35 : 70;
  // alcohol only penalises if alcohol tracking is enabled
  if (tp.alcohol !== false && (daily.alcohol || 0) > 0) habits -= Math.min(35, daily.alcohol * 12);
  if (ci.sick === "yes") habits -= 30;
  habits = clamp100(habits);

  return { nutrition, sleep, training, movement, mind, habits };
}
export function dailyHealthScore(s) {
  // weight only the sub-scores that have data
  const w = { nutrition: 0.25, sleep: 0.22, training: 0.20, movement: 0.13, mind: 0.10, habits: 0.10 };
  let sum = 0, wsum = 0;
  Object.keys(w).forEach((k) => { if (s[k] != null) { sum += s[k] * w[k]; wsum += w[k]; } });
  return wsum ? Math.round(sum / wsum) : 0;
}

// Fair, explainable functional-health score. Missing data is "unknown" (excluded from the
// denominator), never scored as zero. Weighted across available categories, with a confidence
// label and the top reasons it's low. Health markers only count if the user logged them.
export function functionalHealth({ subScores, sleepInfo, trainInfo, daily, healthInfo, profile, targets, t, trainedToday }) {
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
export function scoreVerdict(score) {
  if (score >= 85) return "Excellent day";
  if (score >= 70) return "Good day";
  if (score >= 55) return "Decent day";
  if (score >= 40) return "Below par";
  return "Take it easy";
}
// ─── Central Daily Truth ──────────────────────────────────────────────────────
// Single source of truth for "what did the user do today?" with consistent
// source attribution: exact > quick_log > estimated > unknown > disabled.
// Never invents exact numbers from Quick Log. Never marks missing as failed.
// Call once per render; pass the result (dt) to all screens as a prop.
export function getDailyTruth({
  date, tp = {}, t, daily, quickLog, workouts, sleepInfo,
  targets, profile, supps, takenIds,
}) {
  const ql  = quickLog || null;
  const wGoal = waterGoal(profile);

  // helpers
  const mk = (status, source, confidence, extra = {}) =>
    ({ status, source, confidence, ...extra });
  const dis = (extra = {}) => mk("disabled",  "disabled", "disabled", extra);
  const unk = (extra = {}) => mk("unknown",   "unknown",  "low",      extra);

  // ── NUTRITION ──────────────────────────────────────────────────────────
  let nutrition;
  if (tp.nutrition === false) {
    nutrition = dis();
  } else {
    const ateToday   = (t?.calories || 0) > 0 || (t?.protein || 0) > 0;
    const qlProtein  = ql?.hitProtein  === true;
    const qlCalories = ql?.hitCalories === true;
    if (ateToday) {
      const pTarget   = targets?.protein  || 0;
      const cTarget   = targets?.calories || 0;
      const proteinOk = pTarget ? t.protein  >= pTarget * 0.9 : null;
      const calOk     = cTarget ? Math.abs(t.calories / cTarget - 1) <= 0.15 : null;
      const gapG      = pTarget ? Math.max(0, Math.round(pTarget - t.protein)) : 0;
      nutrition = mk(
        (proteinOk === false || calOk === false) ? "partial" : "completed",
        "exact", "high",
        { protein: Math.round(t.protein), calories: Math.round(t.calories),
          proteinOk, calOk,
          label: proteinOk || !pTarget
            ? "Nutrition on track"
            : `${gapG}g protein remaining`,
        }
      );
    } else if (qlProtein || qlCalories) {
      nutrition = mk("completed", "quick_log", "medium", {
        protein: null, calories: null,   // never invent grams from QL
        proteinOk: qlProtein, calOk: qlCalories,
        label: qlProtein ? "Protein hit"
             : qlCalories ? "Calories OK"
             : "Nutrition OK",
      });
    } else {
      nutrition = unk({ label: "No food logged yet" });
    }
  }

  // ── TRAINING ───────────────────────────────────────────────────────────
  let training;
  if (tp.training === false) {
    training = dis();
  } else {
    const exactTrained = !!(workouts?.some(w => w.date === date));
    const qlTrained    = ql?.trainedToday === true;
    const sportSess    = Array.isArray(daily?.sportSessions) ? daily.sportSessions : [];
    const sportTrained = sportSess.length > 0;
    const hardSport    = sportSess.some(s => s.intensity === "hard");
    const sportLabel   = sportSess.length === 1
      ? sportSess[0].sportName
      : `${sportSess.length} activities`;
    if (exactTrained) {
      training = mk("completed", "exact", "high", {
        trainedToday: true,
        sportSessions: sportSess,
        sportLoad: hardSport ? "high" : sportTrained ? "moderate" : null,
      });
    } else if (sportTrained) {
      // Sport session counts as activity — not a gym workout but real physical load
      training = mk("completed", "sport", "medium", {
        trainedToday: false, activityToday: true,
        sportSessions: sportSess,
        sportLoad: hardSport ? "high" : "moderate",
        label: `${sportLabel} logged`,
      });
    } else if (qlTrained) {
      const tt = ql.trainingType || null;
      training = mk("completed", "quick_log", "medium", {
        trainedToday: true, trainingType: tt,
        intensity: ql.trainingIntensity || null,
        label: tt ? `${tt.replace("_"," ")[0].toUpperCase() + tt.replace("_"," ").slice(1)} session` : "Trained today",
      });
    } else {
      training = unk({ trainedToday: false, label: "No workout logged today" });
    }
  }

  // ── SLEEP ──────────────────────────────────────────────────────────────
  let sleep;
  if (tp.sleep === false) {
    sleep = dis();
  } else {
    const ls = sleepInfo?.lastSleep;
    const qlSleep = ql?.enoughSleep;
    if (ls) {
      sleep = mk(ls.score >= 65 ? "completed" : "partial", "exact", "high", {
        duration: ls.durationMin, score: ls.score,
        debtMin: sleepInfo?.debtMin || 0,
        label: `${(ls.durationMin / 60).toFixed(1)}h sleep · score ${ls.score}`,
      });
    } else if (qlSleep === true) {
      sleep = mk("completed", "quick_log", "medium", {
        sleptEnough: true, debtMin: sleepInfo?.debtMin || 0,
        label: "Sleep OK",
      });
    } else if (qlSleep === false) {
      sleep = mk("partial", "quick_log", "medium", {
        sleptEnough: false, label: "Sleep was short",
      });
    } else {
      sleep = unk({ debtMin: sleepInfo?.debtMin || 0, label: "No sleep data yet" });
    }
  }

  // ── WATER ──────────────────────────────────────────────────────────────
  let water;
  if (tp.water === false) {
    water = dis();
  } else {
    const amount = daily?.water || 0;
    const qlWater = ql?.hitWater;
    if (amount > 0) {
      water = mk(amount >= wGoal ? "completed" : "partial", "exact", "high",
        { amount, goal: wGoal,
          label: `${(amount/1000).toFixed(1)}L / ${(wGoal/1000).toFixed(1)}L` });
    } else if (qlWater === true) {
      water = mk("completed", "quick_log", "medium", { label: "Hydration OK" });
    } else {
      water = unk({ goal: wGoal, label: "No water logged" });
    }
  }

  // ── MOVEMENT ───────────────────────────────────────────────────────────
  let movement;
  if (tp.movement === false) {
    movement = dis();
  } else {
    const steps    = daily?.steps     || 0;
    const cMin     = daily?.cardioMin || 0;
    const sportSess = Array.isArray(daily?.sportSessions) ? daily.sportSessions : [];
    const sportMin  = sportSess.reduce((a, s) => a + (s.durationMin || 0), 0);
    const sportKcalTotal = sportSess.reduce((a, s) => a + (s.estimatedCalories || 0), 0);
    const qlMove   = ql?.enoughMovement;
    const trained  = training.status === "completed";
    const hasMovement = steps > 0 || cMin > 0 || sportMin > 0;
    if (hasMovement) {
      movement = mk(steps >= STEPS_TARGET || cMin >= 20 || sportMin >= 20 || trained ? "completed" : "partial",
        "exact", "high", { steps, cardioMin: cMin, sportMin, sportKcal: sportKcalTotal, sportSessions: sportSess });
    } else if (qlMove === true) {
      movement = mk("completed", "quick_log", "medium", { label: "Movement OK" });
    } else if (trained) {
      movement = mk("completed", "estimated", "medium",
        { trainedToday: true, label: "Trained today — movement covered" });
    } else {
      movement = unk({ steps: 0, label: "No movement logged" });
    }
  }

  // ── ALCOHOL ────────────────────────────────────────────────────────────
  let alcohol;
  if (tp.alcohol === false) {
    alcohol = dis();
  } else {
    const amt      = daily?.alcohol;
    const qlNoAlc  = ql?.noAlcohol;
    // Only treat as "logged" if some other daily data also exists (avoids treating
    // default 0 as "explicitly logged no alcohol")
    const hasDailyData = daily && Object.keys(daily).some(k => k !== "checkin" && k !== "alcohol" && daily[k]);
    if (typeof amt === "number" && hasDailyData) {
      alcohol = mk(amt === 0 ? "completed" : "partial", "exact", "high",
        { amount: amt,
          label: amt === 0 ? "No alcohol" : `${amt} drink${amt!==1?"s":""} logged` });
    } else if (qlNoAlc === true) {
      alcohol = mk("completed", "quick_log", "medium",
        { noAlcohol: true, label: "No alcohol" });
    } else if (qlNoAlc === false) {
      alcohol = mk("partial", "quick_log", "medium",
        { noAlcohol: false, label: "Alcohol consumed" });
    } else {
      alcohol = unk({ label: "Alcohol not logged" });
    }
  }

  // ── SUPPLEMENTS ────────────────────────────────────────────────────────
  let supplements;
  const hasSupps = Array.isArray(supps) && supps.length > 0;
  if (tp.supplements === false || !hasSupps) {
    supplements = dis();
  } else {
    const allTaken = supps.every(s => takenIds?.includes(s.id));
    const qlSupps  = ql?.supplementsTaken;
    if (Array.isArray(takenIds) && takenIds.length > 0) {
      supplements = mk(allTaken ? "completed" : "partial", "exact", "high",
        { taken: takenIds.length, total: supps.length });
    } else if (qlSupps === true) {
      supplements = mk("completed", "quick_log", "medium",
        { label: "Supplements taken" });
    } else {
      supplements = unk({ label: "Supplements not logged" });
    }
  }

  // ── RECOVERY (confidence only — score computed by calculatePerfectRecovery) ─
  let recovery;
  if (tp.recovery === false) {
    recovery = dis();
  } else {
    const sig = [
      sleep.source    === "exact" || sleep.source    === "quick_log",
      training.source === "exact" || training.source === "quick_log",
      nutrition.source=== "exact" || nutrition.source=== "quick_log",
    ].filter(Boolean).length;
    recovery = mk(
      sig >= 1 ? "partial" : "unknown",
      sig >= 1 ? "estimated" : "unknown",
      sig >= 2 ? "high" : sig === 1 ? "medium" : "low",
      { dataSignals: sig }
    );
  }

  // ── HABITS ─────────────────────────────────────────────────────────────
  const habits = tp.habits === false
    ? dis()
    : unk(); // filled in by caller after habitsToday is computed

  // ── OVERALL ────────────────────────────────────────────────────────────
  const domains = { nutrition, training, sleep, water, movement, alcohol, supplements };
  const completedAreas   = Object.entries(domains).filter(([,v])=>v.status==="completed").map(([k])=>k);
  const partialAreas     = Object.entries(domains).filter(([,v])=>v.status==="partial").map(([k])=>k);
  const missingButEnabled= Object.entries(domains).filter(([,v])=>v.status==="unknown").map(([k])=>k);
  const exactCount = Object.values(domains).filter(v=>v.source==="exact").length;
  const qlCount    = Object.values(domains).filter(v=>v.source==="quick_log").length;
  const overallConf= exactCount >= 3 ? "high" : exactCount + qlCount >= 2 ? "medium" : "low";

  return {
    date,
    nutrition, training, sleep, water, movement, alcohol, supplements,
    recovery, habits,
    overall: {
      confidence: overallConf,
      completedAreas,
      partialAreas,
      missingButEnabled,
      topActions: [], // filled by caller from bestActions output
    },
  };
}

// rule-based "best action today" — returns ordered list, most important first
export function bestActions({ t, targets, sleepInfo, trainInfo, daily, trainedToday, profile, quickLog, tp = {}, recoveryInfo = null }) {
  const out = [];
  const ci = daily.checkin || {};
  const ql = quickLog || null;
  // qlProteinHit: only relevant when no exact food logged; exact data takes priority
  const hasExactProtein = (t?.protein || 0) > 0;
  const qlProteinHit = !hasExactProtein && ql?.hitProtein === true;
  const qlTrainedToday = ql?.trainedToday === true;
  const qlEnoughSleep = ql?.enoughSleep === true;
  const qlEnoughMovement = ql?.enoughMovement === true;
  const effectivelyTrained = trainedToday || qlTrainedToday;
  const proteinLeft = Math.max(0, Math.round(targets.protein - t.protein));
  const calLeft = Math.round(targets.calories - t.calories);

  // health overrides first
  if (ci.sick === "yes") out.push({ icon: "rest", text: "You marked yourself sick — rest today. Hydrate, eat enough protein, skip training." });
  if (ci.pain === "serious") out.push({ icon: "pain", text: "Serious pain logged — avoid loading it. Train around it or take a rest day." });

  // training recommendation (only if not already covered by sick + tracking enabled)
  if (ci.sick !== "yes" && tp.training !== false) {
    const r = recoveryInfo?.score ?? trainInfo.bodyReadiness;  // canonical recovery score
    if (effectivelyTrained) {
      // Build context-aware recovery suggestions — skip what Quick Log already covered
      const qlProteinOk = ql?.hitProtein === true;
      const qlMoveOk = ql?.enoughMovement === true;
      const qlSleepOk = ql?.enoughSleep === true;
      const proteinNeeded = !qlProteinOk && (proteinLeft || 0) >= 25;
      const walkNeeded = !qlMoveOk && (daily.steps || 0) < STEPS_TARGET * 0.6;
      const sleepNeeded = !qlSleepOk;
      const remaining = [
        proteinNeeded && "hit your protein",
        walkNeeded && "a short walk",
        sleepNeeded && "an early night",
      ].filter(Boolean);
      const src = trainedToday ? "" : " (Quick Log)";
      const msg = remaining.length
        ? `Trained today${src} — ${remaining.join(", ")} will complete your recovery basics.`
        : `Trained today${src}. Wind down early to lock in your gains.`;
      out.push({ icon: "done", text: msg });
    } else if (r >= 70) {
      const fresh = trainInfo.freshMuscles.slice(0, 2).join(" & ");
      out.push({ icon: "train", text: `Train hard today.${fresh ? ` ${fresh} ${trainInfo.freshMuscles.length > 1 ? "are" : "is"} fresh.` : ""}` });
    } else if (r >= 45) {
      out.push({ icon: "train", text: "Do a moderate workout — leave 1–2 reps in reserve, avoid going to failure." });
    } else {
      out.push({ icon: "rest", text: "Recovery is low. Do light mobility or a walk instead of a hard session." });
    }
  }

  // nutrition nudges — only when tracking enabled
  if (tp.nutrition !== false) {
    if (!qlProteinHit && proteinLeft >= 25) out.push({ icon: "protein", text: `Eat ${proteinLeft}g more protein to hit your target.` });
    if (calLeft < -200) out.push({ icon: "food", text: `You're ${Math.abs(calLeft)} kcal over — lighter dinner or a walk evens it out.` });
    else if (calLeft > 400 && targets.goal !== "lose" && !ql?.hitCalories) out.push({ icon: "food", text: `${calLeft} kcal left — add a solid meal to fuel growth.` });
  }

  // movement — only when tracking enabled
  if (tp.movement !== false && !qlEnoughMovement && !effectivelyTrained) {
    const s = daily?.steps || 0;
    if (s > 0 && s < STEPS_TARGET / 2)
      out.push({ icon: "walk", text: "Steps are low — a 20-minute walk lifts energy and recovery." });
    // if steps === 0 and no movement confirmed, skip (covered by late-day Quick Log prompt below)
  }

  // hydration — only when water tracking enabled
  if (tp.water !== false && (daily.water || 0) < waterGoal(profile) * 0.4 && !ql?.hitWater) out.push({ icon: "water", text: "Drink some water — you're well under your daily target." });

  // sleep tonight — only when sleep tracking enabled
  if (tp.sleep !== false && sleepInfo.debtMin > 90 && !qlEnoughSleep) {
    const mins = Math.min(90, Math.round(sleepInfo.debtMin / 3 / 5) * 5);
    out.push({ icon: "sleep", text: `Sleep ${mins} min earlier tonight to chip away at your sleep debt.` });
  }

  // If quick log covered everything, suggest something still useful
  if (qlTrainedToday && qlProteinHit && qlEnoughMovement && out.length <= 1) {
    out.push({ icon: "done", text: "Looking solid today. Wind down early for best recovery." });
  }

  // Late in the day with many unknowns → nudge Quick Log
  const nowHour = new Date().getHours();
  const unknownCount = [
    tp.training !== false && !effectivelyTrained,
    tp.nutrition !== false && !t?.calories && !qlProteinHit,
    tp.sleep    !== false && !sleepInfo?.lastSleep && !qlEnoughSleep,
    tp.water    !== false && !(daily?.water > 0) && !ql?.hitWater,
  ].filter(Boolean).length;
  if (nowHour >= 19 && unknownCount >= 2 && out.length === 0) {
    out.push({ icon: "log", text: "End of day — Quick Log what happened to keep your stats accurate." });
  }

  return out.slice(0, 4);
}

/* ---------------- rule-based AI-free coach -------------- */
// assembles 4 coach cards from existing derivations. No API calls — fast & free.
export function coachReport({ t, targets, sleepInfo, trainInfo, nutriInfo, dailyInfo, daily, profile, workouts, quickLog, tp = {}, dt = null }) {
  const muscleName = (k) => (MUSCLES.find(([m]) => m === k) || [k, k])[1];
  const ql = quickLog || null;
  const dtN = dt?.nutrition;   // daily truth for nutrition
  const dtT = dt?.training;    // daily truth for training
  const dtS = dt?.sleep;       // daily truth for sleep
  const dtW = dt?.water;       // daily truth for water
  const dtA = dt?.alcohol;     // daily truth for alcohol

  // ---- DAILY COACH: top 3 actions ----
  const daily3 = (dailyInfo.actions || []).slice(0, 3).map((a) => a.text);
  const allTrackingOff = tp.training === false && tp.nutrition === false && tp.sleep === false && tp.movement === false;
  const dailySummary = dailyInfo.actions[0]
    ? `Today's score is ${dailyInfo.healthScore}/100 — ${scoreVerdict(dailyInfo.healthScore).toLowerCase()}.`
    : allTrackingOff ? "Tracking is off — turn it back on anytime in Tracking preferences."
    : "Log a little through the day and I'll sharpen your plan.";

  // ---- TRAINING COACH ----
  const sug = trainInfo.suggestion;
  const vol = trainInfo.volume;
  const volRows = MUSCLES.map(([k, n]) => ({ k, n, v: vol[k] || 0, st: volumeStatus(vol[k] || 0, k) }));
  const lowMuscles = volRows.filter((r) => r.st.tag === "low" || r.st.tag === "under" || (r.st.tag === "none" && r.v === 0 && ["chest", "back", "quads", "shoulders"].includes(r.k))).map((r) => r.n);
  const overMuscles = volRows.filter((r) => r.st.tag === "over").map((r) => r.n);
  const stalls = stallingLifts(workouts);
  const trainBullets = [];
  if (tp.training === false) {
    trainBullets.push("Training tracking is off. Enable it from More → Tracking preferences to see training advice.");
  } else {
    if (dtT?.source === "sport") {
      const ss = dtT.sportSessions || [];
      const names = [...new Set(ss.map(s => s.sportName))].slice(0, 2).join(" + ");
      const load = dtT.sportLoad === "hard" ? "high" : dtT.sportLoad || "moderate";
      trainBullets.push(`${names || "Sport"} logged today — ${load} physical load. Muscles affected by this activity are shown in recovery.`);
    } else if (dtT?.source === "quick_log") {
      trainBullets.push(`Trained today via Quick Log (${dtT.label || "type unknown"}) — exact data not logged.`);
    } else if (dtT?.source === "exact") {
      const ss = dtT.sportSessions;
      if (ss?.length) {
        const names = [...new Set(ss.map(s => s.sportName))].slice(0, 2).join(" + ");
        trainBullets.push(`Gym workout + ${names} today — combined muscle load, check recovery before training the same muscles.`);
      } else {
        trainBullets.push("Exact workout logged today.");
      }
    }
    if (sug) trainBullets.push(`${sug.label}: ${sug.reason}`);
    if (lowMuscles.length) trainBullets.push(`Add volume to ${lowMuscles.slice(0, 3).join(", ")}.`);
    if (overMuscles.length) trainBullets.push(`Ease off ${overMuscles.join(", ")} — likely junk volume.`);
    if (stalls.length) trainBullets.push(`Stalled: ${stalls.slice(0, 2).join(", ")}. Deload that lift ~10% then rebuild.`);
    if (trainInfo.deload?.suggest) trainBullets.push(`Deload week suggested — ${trainInfo.deload.reasons[0]}.`);
    if (trainInfo.sportAdvice?.length) trainBullets.push(...trainInfo.sportAdvice);
    if (!trainBullets.length) trainBullets.push("Volume and recovery look balanced — keep progressing.");
  }
  const trainSummary = tp.training === false ? "Training tracking is off."
    : sug ? `Best session today: ${sug.label}.` : "Train based on what's recovered.";

  // ---- NUTRITION COACH ----
  const nutriBullets = [];
  if (tp.nutrition === false) {
    nutriBullets.push("You're not tracking nutrition right now. Start tracking from More → Tracking preferences if you want nutrition advice.");
  } else if (dtN?.source === "exact") {
    const proteinLeft = Math.max(0, Math.round(targets.protein - t.protein));
    const calLeft = Math.round(targets.calories - t.calories);
    if (proteinLeft >= 20) nutriBullets.push(`Protein: ${Math.round(t.protein)}/${targets.protein}g — eat ${proteinLeft}g more.`);
    else nutriBullets.push(`Protein on track (${Math.round(t.protein)}/${targets.protein}g).`);
    if (Math.abs(calLeft) > 250) nutriBullets.push(calLeft > 0 ? `${calLeft} kcal left for your ${targets.goal === "lose" ? "cut" : targets.goal === "gain" ? "bulk" : "day"}.` : `${Math.abs(calLeft)} kcal over — lighter dinner or a walk.`);
    if (t.fiber < targets.fiber * 0.7) nutriBullets.push(`Fiber low (${Math.round(t.fiber)}/${targets.fiber}g) — add fruit, veg, or oats.`);
    if (nutriInfo.missing?.length) { const top = nutriInfo.missing[0]; nutriBullets.push(`Lowest: ${top.label} (${top.pct}%) — try ${top.food.split(",").slice(0, 2).join(",")}.`); }
  } else if (dtN?.source === "quick_log") {
    nutriBullets.push(ql?.hitProtein === true ? "Protein target hit · Quick Log. Log meals for exact gram tracking." : "Nutrition marked via Quick Log — no exact data available.");
    if (ql?.hitCalories === true) nutriBullets.push("Calories on track · Quick Log.");
    else if (ql?.hitCalories === false) nutriBullets.push(`Calories marked low today. Log a meal to track precisely.`);
  } else {
    nutriBullets.push("No food logged yet today. Add your first meal or use Quick Log to mark nutrition status.");
  }
  // water note regardless of nutrition source
  if (tp.water !== false) {
    if (dtW?.source === "quick_log") { /* QL covered it — no nudge */ }
    else if ((daily.water || 0) < nutriInfo.waterGoal * 0.5) nutriBullets.push("Hydration is behind — drink a glass now.");
  }
  const nutriSummary = tp.nutrition === false ? "Nutrition tracking is off."
    : dtN?.source === "exact" ? (nutriInfo.coach?.lines?.[0]?.text || (t.calories && nutriInfo.dietQ.score != null ? `Diet quality ${nutriInfo.dietQ.score}/100.` : "Track today's food for tailored advice."))
    : dtN?.source === "quick_log" ? "Nutrition status from Quick Log — no exact data."
    : "No nutrition data logged today.";

  // ---- RECOVERY COACH ----
  const rr = trainInfo.recoveryRec;
  const recBullets = [];
  if (tp.sleep !== false) {
    if (dtS?.source === "exact" && sleepInfo.lastSleep) recBullets.push(`Last night: ${durLabel(sleepInfo.lastSleep.durationMin)}, score ${sleepInfo.lastSleep.score}.`);
    else if (dtS?.source === "quick_log") recBullets.push(ql?.enoughSleep === true ? "Slept enough · Quick Log." : "Sleep was insufficient · Quick Log.");
    if (sleepInfo.debtMin > 90) recBullets.push(`Sleep debt ${durLabel(sleepInfo.debtMin)} — bed by ${minToLabel(sleepInfo.rec?.recBed || 1380)} tonight.`);
  }
  if (tp.alcohol !== false) {
    if (dtA?.source === "exact" && (daily.alcohol || 0) > 0) recBullets.push(`${alcoholImpact(daily.alcohol).label} alcohol logged — recovery takes a hit.`);
    else if (dtA?.source === "quick_log" && ql?.noAlcohol === false) recBullets.push("Alcohol consumed today · Quick Log.");
  }
  if (trainInfo.pain?.level && trainInfo.pain.level !== "none") recBullets.push(`Pain active (${trainInfo.pain.level}) — ${trainInfo.pain.coach?.lines?.[0] || "train around it"}`);
  const ci = daily.checkin || {};
  if (ci.stress === "high") recBullets.push("Stress high — a walk or breath work tonight helps sleep.");
  if (!recBullets.length) recBullets.push(tp.sleep === false ? "Sleep tracking is off — recovery insight is limited." : "Sleep, stress, and recovery markers look clear.");
  const recSummary = tp.sleep === false ? "Sleep tracking is off." : rr ? rr.text : "Recovery looks fine.";

  return {
    daily:    { summary: dailySummary, bullets: daily3.length ? daily3 : ["Check in and log a meal to get started."] },
    training: { summary: trainSummary, bullets: trainBullets, suggestion: sug },
    nutrition:{ summary: nutriSummary, bullets: nutriBullets },
    recovery: { summary: recSummary, bullets: recBullets, level: rr?.level },
  };
}

/* ---------------- weekly report (rule-based) -------------- */
export function weeklyReport({ history, workouts, sleepLogs, weightSeries, daily, dailyHistory, painLogs, focusSessions, consistency, targets, profile, sleepInfo, tp = {} }) {
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
  if (tp.sleep !== false && bedConsistency != null && bedConsistency > 60) bottlenecks.push({ score: 9, key: "sleep_consistency", text: `Sleep consistency — bedtime swings ±${bedConsistency} min`, fix: `Lock bedtime near ${sleepInfo?.rec ? minToLabel(sleepInfo.rec.recBed) : "a fixed time"} every night.` });
  if (tp.sleep !== false && avgSleepMin != null && avgSleepMin < (sleepInfo?.need || 480) - 45) bottlenecks.push({ score: 8, key: "sleep_short", text: `Short sleep — averaging ${durLabel(Math.round(avgSleepMin))}`, fix: "Sleep 30 min earlier most nights this week." });
  if (tp.nutrition !== false && avgProt != null && targets.protein && avgProt < targets.protein * 0.85) bottlenecks.push({ score: 8, key: "protein", text: `Protein under target (${Math.round(avgProt)}g avg)`, fix: `Add ~${Math.round(targets.protein - avgProt)}g protein/day.` });
  if (tp.training !== false && wkWorkouts.length < 3) bottlenecks.push({ score: 7, key: "training", text: `Only ${wkWorkouts.length} workout${wkWorkouts.length !== 1 ? "s" : ""} this week`, fix: "Aim for 3–4 sessions next week." });
  if (wkPain.length >= 3) bottlenecks.push({ score: 7, key: "pain", text: `Pain logged ${wkPain.length}× this week`, fix: "Train around it and rest the area; see a physio if it persists." });
  if (tp.movement !== false && avgSteps != null && avgSteps < 5000) bottlenecks.push({ score: 5, key: "steps", text: `Low movement (${Math.round(avgSteps)} steps/day)`, fix: "Add a daily 20-min walk." });
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
export const SCHEMA_PROMPT = `Return ONLY a single minified JSON object (no markdown, no commentary) with EXACTLY this shape:
{"name":string,"serving":string,"confidence":"high"|"medium"|"low","calories":int,"protein_g":number,"carbs_g":number,"fat_g":number,"fiber_g":number,"micros":{"vitamin_a":int,"vitamin_c":int,"vitamin_d":int,"vitamin_e":int,"vitamin_k":int,"b6":int,"b12":int,"folate":int,"calcium":int,"iron":int,"magnesium":int,"zinc":int,"potassium":int,"selenium":int},"omega3":"low"|"medium"|"high","note":string}
"name" max 5 words. Each micro value = integer percent of an average adult daily value contributed by THIS serving (can exceed 100). Estimate sensibly even with limited info.`;

export async function resizeImage(file, max = 1100) {
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

export function extractJSON(text) {
  let s = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

export async function analyze({ text, image, mode }) {
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
export async function analyzeText({ prompt, system }) {
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
  return (data.text || "").trim();
}

/* ---------------- local (offline) coach engine — used when the AI API isn't reachable -------------- */
// Pattern-matches the user's question and assembles a structured answer from their data summary.
export function localCoachAnswer(question, ctx, profile, targets) {
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
