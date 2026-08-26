import React, { useState } from "react";
import { HeartPulse, Activity, Check, Plus, PencilLine, Pill } from "lucide-react";
import { C } from "../theme.js";
import { PAIN_LEVELS, PAIN_LOCATIONS, PAIN_TYPES, RISK_TAG } from "../utils/vitaeCalc.js";
import { btn } from "../components/ui.jsx";

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
      <div className="sprig-eyebrow" style={{ marginBottom: 8 }}>Level</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {Object.entries(PAIN_LEVELS).filter(([k]) => k !== "none").map(([k, lvl]) => (
          <Chip key={k} on={level === k} color={lvl.color} onClick={() => setLevel(k)}>{lvl.label}</Chip>
        ))}
      </div>
      <div className="sprig-eyebrow" style={{ marginBottom: 8 }}>Location</div>
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
export function computeHealthReport({ history7, sleepLogs7, workouts7, daily, t, targets, profile, sleepInfo, trainInfo, moveInfo, nutriInfo, tp = {}, quickLog = null }) {
  const helping = [], hurting = [], improvements = [], continueDoing = [];
  const now7 = Date.now() - 7 * 864e5;
  const ql = quickLog || null;

  // data coverage — QL fills gaps where exact logs are absent
  const hasNutrition = (history7 || []).filter((h) => h.calories > 0).length >= 2
    || (ql?.hitProtein === true) || (ql?.hitCalories === true);
  const hasSleep = (sleepLogs7 || []).length >= 2 || (ql?.enoughSleep != null);
  const hasTraining = (workouts7 || []).length >= 1 || (ql?.trainedToday === true);
  const hasSteps = (daily?.steps || 0) > 0 || (moveInfo?.movement?.steps || 0) > 0 || (ql?.enoughMovement === true);
  const dataPoints = [hasNutrition, hasSleep, hasTraining, hasSteps].filter(Boolean).length;
  const confidence = dataPoints >= 3 ? "high" : dataPoints >= 2 ? "medium" : "low";

  // --- NUTRITION (weight 0.25) ---
  let nutScore = 50;
  if (tp.nutrition !== false && hasNutrition) {
    const loggedDays = (history7 || []).filter((h) => h.calories > 0);
    if (loggedDays.length > 0) {
      // exact food logs available — use real averages
      const avgCal  = loggedDays.reduce((a, h) => a + h.calories,        0) / loggedDays.length;
      const avgProt = loggedDays.reduce((a, h) => a + (h.protein  || 0), 0) / loggedDays.length;
      const avgFiber= loggedDays.reduce((a, h) => a + (h.fiber    || 0), 0) / loggedDays.length;
      const calTarget   = targets?.calories || 2000;
      const protTarget  = targets?.protein  || 150;
      const fiberTarget = targets?.fiber    || 25;
      const calDiff   = Math.abs(avgCal - calTarget) / calTarget;
      const calScore  = calDiff < 0.1 ? 90 : calDiff < 0.2 ? 75 : calDiff < 0.35 ? 60 : 40;
      const protRatio = avgProt / protTarget;
      const protScore = protRatio >= 0.95 ? 90 : protRatio >= 0.8 ? 75 : protRatio >= 0.6 ? 55 : 35;
      const fiberScore= avgFiber >= fiberTarget * 0.9 ? 90 : avgFiber >= fiberTarget * 0.6 ? 70 : 50;
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
    } else {
      // Quick Log only — no exact food logs; use estimated score, no fake averages
      nutScore = (ql?.hitProtein && ql?.hitCalories) ? 72 : (ql?.hitProtein || ql?.hitCalories) ? 65 : 55;
      if (ql?.hitProtein  === true)  helping.push("Protein target marked hit · Quick Log.");
      if (ql?.hitCalories === true)  helping.push("Calories on track · Quick Log.");
      else if (ql?.hitCalories === false) hurting.push("Calories marked as missed · Quick Log.");
      if (improvements.length < 3) improvements.push("Log meals in the Food tab for exact macros and a precise nutrition score.");
    }
  }

  // --- SLEEP (weight 0.25) ---
  let sleepScore = 50;
  if (tp.sleep !== false && hasSleep) {
    const valid   = (sleepLogs7 || []).filter((l) => !l.ignoredFromScore);
    const need    = sleepInfo?.need    || 480;
    const debtMin = sleepInfo?.debtMin || 0;
    if (valid.length > 0) {
      // exact sleep logs available
      const avgDur = valid.reduce((a, l) => a + l.durationMin, 0) / valid.length;
      const avgQ   = valid.reduce((a, l) => a + l.score,       0) / valid.length;
      sleepScore = Math.round(
        (avgDur >= need * 0.95 ? 90 : avgDur >= need * 0.85 ? 75 : avgDur >= need * 0.7 ? 55 : 35) * 0.4 +
        (avgQ   >= 80 ? 90 : avgQ >= 65 ? 75 : avgQ >= 50 ? 55 : 35) * 0.3 +
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
    } else {
      // Quick Log only — no exact sleep logs; no fake duration averages
      if (ql?.enoughSleep === true) {
        sleepScore = 72;
        helping.push("Slept enough · Quick Log.");
        continueDoing.push("Log sleep sessions for exact duration, debt, and recovery scores.");
      } else if (ql?.enoughSleep === false) {
        sleepScore = 38;
        hurting.push("Sleep marked as not enough · Quick Log.");
        if (improvements.length < 3) improvements.push("Try sleeping 30–45 min earlier tonight to reduce sleep debt.");
      }
    }
  }

  // --- TRAINING / CARDIO (weight 0.25) ---
  let trainScore = 50;
  const wkCount     = tp.training !== false ? Math.max((workouts7 || []).length, ql?.trainedToday === true ? 1 : 0) : 0;
  const exactSteps  = tp.movement !== false ? (daily?.steps || moveInfo?.movement?.steps || 0) : 0;
  const qlMovementOnly = !exactSteps && tp.movement !== false && (ql?.enoughMovement === true);
  const stepGoalVal = moveInfo?.stepGoal || 8000;
  const cardioMin   = tp.cardio !== false ? (daily?.cardioMin || 0) : 0;
  // stepRatio uses only real steps — never inject fake 8000 from QL
  const stepRatio   = exactSteps > 0 ? exactSteps / stepGoalVal : 0;
  if ((tp.training !== false || tp.movement !== false) && (wkCount > 0 || exactSteps > 0 || cardioMin > 0 || qlMovementOnly)) {
    const wkScore    = wkCount >= 4 ? 90 : wkCount >= 3 ? 80 : wkCount >= 2 ? 65 : wkCount >= 1 ? 50 : 30;
    // QL movement gets a medium-good step score (75) — covered but not measured
    const stepScore  = qlMovementOnly ? 75 : (stepRatio >= 1 ? 90 : stepRatio >= 0.7 ? 75 : stepRatio >= 0.4 ? 55 : 35);
    const cardioScore= cardioMin >= 30 ? 90 : cardioMin >= 15 ? 70 : cardioMin >= 5 ? 55 : 40;
    trainScore = Math.round(wkScore * 0.5 + stepScore * 0.3 + cardioScore * 0.2);
    if (wkCount >= 3) helping.push(`Trained ${wkCount} time${wkCount !== 1 ? "s" : ""} this week.`);
    else if (wkCount === 0 && !qlMovementOnly) {
      hurting.push("No strength training logged this week.");
      if (improvements.length < 3) improvements.push("Add one 30–45 min workout this week to maintain muscle and strength.");
    }
    if (qlMovementOnly) {
      helping.push("Movement goal marked done · Quick Log.");
    } else if (stepRatio >= 0.85) {
      helping.push(`Steps close to your ${(stepGoalVal / 1000).toFixed(0)}k goal.`);
    } else if (stepRatio < 0.4 && cardioMin < 10) {
      hurting.push("Cardio and steps are low this week.");
      if (improvements.length < 3) improvements.push("Add a 20–30 min walk or easy zone-2 cardio today.");
    }
    if (wkCount >= 3) continueDoing.push(`Keep training ${wkCount >= 4 ? "4–5" : "3–4"} times weekly.`);
    // overdoing check — only use exact sleep logs to avoid false alarms
    const sleepLogsValid = (sleepLogs7 || []).filter((l) => !l.ignoredFromScore);
    const avgSleepDur = sleepLogsValid.length > 0
      ? sleepLogsValid.reduce((a, l) => a + l.durationMin, 0) / sleepLogsValid.length
      : 0;
    if (wkCount >= 5 && avgSleepDur > 0 && avgSleepDur < 390) {
      hurting.push(`Trained hard ${wkCount} days while sleep averaged ${Math.round(avgSleepDur / 60)}h ${Math.round(avgSleepDur % 60)}m — consider a lighter session.`);
    }
    if (wkCount >= 3 && (trainInfo?.sleepReadiness || 70) < 50) {
      if (improvements.length < 3) improvements.push("Recovery is low — a lighter session or active rest today will help more than pushing through.");
    }
  }

  // --- ALCOHOL (weight 0.15) ---
  let alcScore = null; // null = disabled
  if (tp.alcohol !== false) {
  alcScore = 85;
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
  } // end alcohol guard

  // --- CONSISTENCY (weight 0.10) ---
  // QL contributions count as partial consistency credit (0.5 day) so users
  // who quick-log regularly don't get penalised for not having exact logs
  const loggedFoodDays = (history7 || []).filter((h) => h.calories > 0).length;
  const loggedSleepNights = (sleepLogs7 || []).filter((l) => !l.ignoredFromScore).length;
  const qlFoodCredit   = (!loggedFoodDays && (ql?.hitProtein || ql?.hitCalories)) ? 0.5 : 0;
  const qlSleepCredit  = (!loggedSleepNights && ql?.enoughSleep != null) ? 0.5 : 0;
  const consistScore = Math.round(((loggedFoodDays + qlFoodCredit) / 7) * 50 + ((loggedSleepNights + qlSleepCredit) / 7) * 50);

  // steps continue-doing
  if (stepRatio >= 0.85) continueDoing.push(`Keep steps above ${Math.round(stepGoalVal * 0.8 / 1000)}k.`);

  // --- WEIGHTED SCORE ---
  const cats = [];
  if (tp.nutrition !== false && hasNutrition) cats.push({ score: nutScore, w: 0.25 });
  if (tp.sleep !== false && hasSleep) cats.push({ score: sleepScore, w: 0.25 });
  if ((tp.training !== false || tp.movement !== false) && (wkCount > 0 || exactSteps > 0 || qlMovementOnly)) cats.push({ score: trainScore, w: 0.25 });
  if (alcScore !== null) cats.push({ score: alcScore, w: 0.15 });
  if ((tp.nutrition !== false && hasNutrition) || (tp.sleep !== false && hasSleep)) cats.push({ score: consistScore, w: 0.10 });
  const totalW = cats.reduce((a, c) => a + c.w, 0) || 1;
  const rawScore = Math.round(cats.reduce((a, c) => a + c.score * (c.w / totalW), 0));
  const minScore = confidence === "low" ? 42 : confidence === "medium" ? 38 : 30;
  const score = Math.max(minScore, Math.min(98, rawScore));

  const disabledCategories = ["nutrition","sleep","training","movement","cardio","alcohol","water","supplements"]
    .filter(k => tp[k] === false);

  // Per-category breakdown for transparency display
  const loggedFoodDaysCount = (history7 || []).filter((h) => h.calories > 0).length;
  const sleepLogsValidCount = (sleepLogs7 || []).filter((l) => !l.ignoredFromScore).length;
  const breakdown = [
    tp.nutrition === false
      ? { cat: "Nutrition", score: null, source: "disabled" }
      : !hasNutrition
      ? { cat: "Nutrition", score: null, source: "unknown" }
      : loggedFoodDaysCount > 0
      ? { cat: "Nutrition", score: nutScore, source: "exact" }
      : { cat: "Nutrition", score: nutScore, source: "quick_log" },
    tp.sleep === false
      ? { cat: "Sleep", score: null, source: "disabled" }
      : !hasSleep
      ? { cat: "Sleep", score: null, source: "unknown" }
      : sleepLogsValidCount > 0
      ? { cat: "Sleep", score: sleepScore, source: "exact" }
      : { cat: "Sleep", score: sleepScore, source: "quick_log" },
    (tp.training === false && tp.movement === false)
      ? { cat: "Training / Movement", score: null, source: "disabled" }
      : !(wkCount > 0 || exactSteps > 0 || cardioMin > 0 || qlMovementOnly)
      ? { cat: "Training / Movement", score: null, source: "unknown" }
      : ((workouts7 || []).length > 0 || exactSteps > 0 || cardioMin > 0)
      ? { cat: "Training / Movement", score: trainScore, source: "exact" }
      : { cat: "Training / Movement", score: trainScore, source: "quick_log" },
    tp.alcohol === false
      ? { cat: "Alcohol", score: null, source: "disabled" }
      : { cat: "Alcohol", score: alcScore ?? 85, source: "exact" },
  ];

  return {
    score, confidence,
    helping: helping.slice(0, 4),
    hurting: hurting.slice(0, 4),
    improvements: improvements.slice(0, 3),
    continueDoing: continueDoing.slice(0, 3),
    disabledCategories,
    breakdown,
  };
}

function HealthTab({ healthInfo, healthReport, advanced, onSave, safety, pain, onAddPain, onUpdatePain, onRemovePain }) {
  const hr = healthReport || {};
  const radar = healthInfo?.radar || [];
  const disabledCats = hr.disabledCategories || [];



  // --- Pain state ---
  const [painOpen, setPainOpen] = useState(false);
  const [editingPain, setEditingPain] = useState(null);







  const score = hr.score ?? null;
  const conf = hr.confidence || "low";
  const scoreColor = score == null ? C.muted : score >= 78 ? C.greenSoft : score >= 58 ? C.amber : C.coral;
  const scoreLabel = score == null ? "—" : score >= 78 ? "Good" : score >= 58 ? "Fair" : "Needs work";

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
                {disabledCats.length > 0 && <span style={{ marginLeft: 6, fontSize: 10.5, background: C.bg2, border: `1px solid ${C.line}`, padding: "2px 7px", borderRadius: 99 }}>{disabledCats.length} categor{disabledCats.length === 1 ? "y" : "ies"} off</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- SCORE BREAKDOWN ---- */}
      {(hr.breakdown?.length ?? 0) > 0 && score != null && (
        <div style={{ background: C.card, borderRadius: 18, padding: "13px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, letterSpacing: .3, marginBottom: 10, textTransform: "uppercase" }}>Score sources</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {hr.breakdown.map((b, i) => {
              const srcColor = b.source === "exact" ? C.greenSoft : b.source === "quick_log" ? C.amber : b.source === "disabled" ? C.muted : C.muted;
              const srcLabel = b.source === "exact" ? "Logged" : b.source === "quick_log" ? "Quick log" : b.source === "disabled" ? "Off" : "No data";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 12.5, color: b.source === "disabled" || b.source === "unknown" ? C.muted : C.inkSoft }}>{b.cat}</div>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: srcColor, background: srcColor + "18", border: `1px solid ${srcColor}33`, borderRadius: 99, padding: "2px 8px" }}>{srcLabel}</span>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: b.score == null ? C.muted : b.score >= 75 ? C.greenSoft : b.score >= 55 ? C.amber : C.coral, minWidth: 28, textAlign: "right" }}>
                    {b.score != null ? b.score : "—"}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
            {conf === "high" ? "High confidence — most categories have exact logged data." : conf === "medium" ? "Medium confidence — some categories estimated or missing." : "Low confidence — log food, sleep, or training for a fuller picture."}
          </div>
        </div>
      )}

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

      {/* ---- DISABLED CATEGORIES NOTE ---- */}
      {disabledCats.length > 0 && (
        <div style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 14, padding: "11px 14px", marginBottom: 12, fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          <b style={{ color: C.inkSoft }}>Not included: </b>
          {disabledCats.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(", ")} tracking is off.
          {" "}Enable in Settings → Tracking preferences.
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

      {/* ---- RISK RADAR ---- */}
      {sortedRadar.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
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
              Not a diagnosis. If anything stays elevated, talk with a doctor.
            </div>
          )}
        </div>
      )}

            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 6, lineHeight: 1.5, padding: "0 12px" }}>
        ⚕️ Vitae is not a medical app and does not diagnose. Always discuss abnormal results with a healthcare professional.
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}

export default HealthTab;
