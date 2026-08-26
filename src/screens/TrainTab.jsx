import React, { useState, useEffect } from "react";
import {
  BookOpen, Trash2, HeartPulse, RotateCcw, X, ArrowUp, Plus, Repeat, Minus,
  Square, TrendingDown, Calculator, Check, Timer, Flame, ChevronDown, Search,
  Dumbbell, ChevronRight, Target, Activity, BedDouble, Play, PersonStanding,
  Crown, Award, Trophy, BarChart3, Sparkles, PencilLine
} from "lucide-react";
import { C } from "../theme.js";
import {
  findEx, progressionFor, suggestNext, restDefault, est1RM, exercisePainRisk,
  SET_PAIN, warmupSets, EXERCISES, MUSCLES, canDoWith, volumeStatus,
  VOL_TAG_COLOR, VOL_TAG_LABEL, liftE1RMSeries, SPORTS_LIBRARY, sportKcal,
  sportMuscleImpact, stepGoal, uid, detectPRs, recapFor, TEMPLATES,
  MOBILITY_ROUTINES
} from "../utils/vitaeCalc.js";

const HAPTIC_PATTERNS = { tap: 14, light: 10, select: 8, success: [30, 50, 30], complete: [30, 50, 50], strong: 40, error: [100, 50, 100] };
function buzz(kind = "tap") {
  try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 14); } catch (_) {}
}
import { Ring, SubTabs, EmptyState, btn, PerfectRecoveryCard } from "../components/ui.jsx";
import { RecoveryStrengthSection } from "./BodyTab.jsx";

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
  // Local state for weight/reps inputs — pre-filled from last session or progression hint
  const initW = (() => {
    if (ex.pendingW != null) return ex.pendingW;
    let last = "";
    workouts.forEach(wk => wk.exercises.forEach(e => { if (e.name === ex.name && e.sets?.length) { const s = e.sets[e.sets.length - 1]; last = String(s.w); } }));
    return last || (sug?.w != null ? String(sug.w) : "");
  })();
  const initR = ex.pendingR != null ? ex.pendingR : (sug?.reps != null ? String(sug.reps) : "");
  const [w, setW]       = useState(initW);
  const [reps, setReps] = useState(initR);
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

  // Ghost hint: single most-useful previous value shown near the input row.
  // Priority: (1) last completed set in this session, (2) same position in prev workout, (3) last set of prev workout.
  const ghostRef = (() => {
    if (ex.sets.length > 0) return ex.sets[ex.sets.length - 1]; // last completed set this session
    const samePosInPrev = prevSets?.[ex.sets.length]; // same 0-indexed position in previous workout
    if (samePosInPrev) return samePosInPrev;
    return prevSets?.length ? prevSets[prevSets.length - 1] : null; // any last set of previous workout
  })();
  const ghostW = ghostRef?.w ?? null;
  const ghostR = ghostRef?.reps ?? null;
  // Only show ghost if it adds info not already identical to both current inputs
  const showGhost = ghostW != null && !(String(ghostW) === w && String(ghostR) === reps);

  function log() {
    const W = parseFloat(w) || 0, R = parseInt(reps) || 0;
    if (R <= 0) return;
    onLogSet(exIdx, { w: W, reps: R, rir: null });
    onStartRest(ex.name);
    // Keep weight, clear reps for next set
    setReps("");
  }
  return (
    <div className="vitae-fade-up" style={{ background: C.cardSolid, borderRadius: 24, padding: "18px 16px", boxShadow: "0 2px 16px rgba(0,0,0,.28)", border: `1px solid ${C.line}`, marginBottom: 16, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.15 }}>{ex.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3, textTransform: "capitalize", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <span>{ex.group}{meta?.sec?.length ? ` · ${meta.sec.slice(0,2).join(", ")}` : ""}</span>
            {ex.sets.length > 0 && <span style={{ color: C.greenSoft, fontWeight: 600 }}>· {ex.sets.length} set{ex.sets.length !== 1 ? "s" : ""}</span>}
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
          <div style={{ background: c + "15", border: `1px solid ${c}55`, borderRadius: 10, padding: "9px 12px", marginTop: 10, fontSize: 12, color: C.inkSoft, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <HeartPulse size={14} color={c} style={{ flexShrink: 0, marginTop: 1 }} /> <span style={{ lineHeight: 1.5 }}>{risk.text}</span>
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
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {ex.sets.length > 5 && (
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", padding: "4px 0" }}>
              +{ex.sets.length - 5} earlier sets hidden
            </div>
          )}
          {ex.sets.slice(-5).map((s, i) => {
            const realIdx = ex.sets.length > 5 ? ex.sets.length - 5 + i : i;
            return (
            <div key={realIdx} className={realIdx === ex.sets.length - 1 ? "vitae-success-pulse" : ""} style={{ display: "flex", alignItems: "center", gap: 10, background: realIdx === ex.sets.length - 1 ? C.green + "20" : C.bg2, border: `1px solid ${realIdx === ex.sets.length - 1 ? C.green + "44" : C.line}`, borderRadius: 13, padding: "9px 11px" }}>
              {/* set number badge */}
              <div style={{ width: 24, height: 24, borderRadius: 7, background: realIdx === ex.sets.length - 1 ? C.green : C.card, display: "grid", placeItems: "center", flexShrink: 0, border: realIdx === ex.sets.length - 1 ? "none" : `1px solid ${C.line}` }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: realIdx === ex.sets.length - 1 ? "#fff" : C.muted, lineHeight: 1 }}>{realIdx + 1}</span>
              </div>
              <span style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 15, color: C.ink, flex: 1 }}>
                {s.w}<span style={{ color: C.muted, fontWeight: 400, fontFamily: "DM Sans", fontSize: 12 }}>{unit}</span>
                {" "}<span style={{ color: C.muted, fontFamily: "DM Sans", fontSize: 13 }}>×</span>{" "}
                {s.reps}<span style={{ color: C.muted, fontWeight: 400, fontFamily: "DM Sans", fontSize: 12 }}>r</span>
              </span>
              {advanced && (
                <button className="sprig-tap" onClick={() => onOpenRirPrompt && onOpenRirPrompt(exIdx, realIdx)} title="Set reps in reserve"
                  style={{ background: s.rir == null ? C.amber + "22" : "transparent", border: "none", cursor: "pointer", color: s.rir == null ? C.amber : C.muted, fontSize: 10.5, fontWeight: 700, borderRadius: 7, padding: "3px 7px" }}>
                  {s.rir == null ? "RIR?" : `@${s.rir}`}
                </button>
              )}
              {advanced && <span style={{ fontSize: 10.5, color: C.greenSoft, fontWeight: 600, whiteSpace: "nowrap" }}>{Math.round(est1RM(s.w, s.reps))}kg</span>}
              <button className="sprig-tap" onClick={() => onRemoveSet(exIdx, realIdx)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: "3px 4px", flexShrink: 0 }}><X size={12} /></button>
            </div>
            );
          })}
        </div>
      )}

      {sug && ex.sets.length === 0 && (() => {
        const action = sug.action || "add_w";
        const styleMap = {
          add_w:   { c: C.greenSoft, ic: <ArrowUp size={12} /> },
          add_rep: { c: C.greenSoft, ic: <Plus size={12} /> },
          repeat:  { c: C.amber,     ic: <Repeat size={12} /> },
          back_off:{ c: C.amber,     ic: <Minus size={12} /> },
          hold:    { c: C.amber,     ic: <Square size={12} /> },
          deload:  { c: C.coral,     ic: <TrendingDown size={12} /> },
        };
        const sty = styleMap[action] || styleMap.add_w;
        const text = sug.text || sug.note;
        const isPush = action === "add_w" || action === "add_rep";
        const summaryLabel = sug.prevW != null
          ? `${sug.prevW}${unit} × ${sug.prevReps} → ${sug.w}${unit} × ${sug.reps}`
          : (text || "Progression hint");
        return (
          <details style={{ marginTop: 10 }} open={false}>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: 7, padding: "8px 10px", background: isPush ? C.green + "0d" : C.bg2, borderRadius: 10, border: `1px solid ${isPush ? C.green + "22" : C.line}` }}>
              <span style={{ marginTop: 0 }}>{sty.ic}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: sty.c, flex: 1 }}>{summaryLabel}</span>
              <ChevronDown size={13} color={C.muted} />
            </summary>
            <div style={{ background: isPush ? C.green + "0a" : C.bg, borderRadius: "0 0 10px 10px", padding: "10px 12px", border: `1px solid ${isPush ? C.green + "22" : C.line}`, borderTop: "none", fontSize: 11.5, color: sty.c, lineHeight: 1.5 }}>
              {text}
            </div>
          </details>
        );
      })()}

      {!sug && ex.sets.length === 0 && (
        <div style={{ background: C.bg2, borderRadius: 10, padding: "9px 11px", marginTop: 10, border: `1px solid ${C.line}`, fontSize: 11.5, color: C.muted, lineHeight: 1.45 }}>
          Pick a weight you can do 8–12 reps with ~2 in reserve. Vitae will push you next session.
        </div>
      )}

      {/* input row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
        {/* Set number circle */}
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.bg2, border: `1px solid ${C.line}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, lineHeight: 1 }}>{setNo}</span>
        </div>
        {/* Weight input + ghost hint below */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <input
            type="text" inputMode="decimal" placeholder={unit}
            value={w}
            onChange={e => setW(e.target.value)}
            onFocus={e => { buzz("select"); e.target.select(); e.target.style.borderColor = C.lime; e.target.style.boxShadow = `0 0 0 2px ${C.lime}44`; }}
            onBlur={e => { e.target.style.borderColor = C.line; e.target.style.boxShadow = "none"; }}
            style={{ width: 66, textAlign: "center", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "12px 4px", fontFamily: "DM Sans", fontSize: 16, fontWeight: 700, background: C.bg, color: C.ink, outline: "none", WebkitAppearance: "none", transition: "border-color .15s, box-shadow .15s" }}
          />
          {showGhost && ghostW != null && (
            <span style={{ fontSize: 10.5, color: C.muted, opacity: 0.62, fontWeight: 600, lineHeight: 1, letterSpacing: 0.1 }}>{ghostW}{unit}</span>
          )}
        </div>
        <span style={{ color: C.muted, fontSize: 14, fontWeight: 600, flexShrink: 0, paddingBottom: showGhost ? 14 : 0 }}>×</span>
        {/* Reps input + ghost hint below */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <input
            type="text" inputMode="numeric" placeholder="reps"
            value={reps}
            onChange={e => setReps(e.target.value.replace(/[^0-9]/g, ""))}
            onFocus={e => { buzz("select"); e.target.select(); e.target.style.borderColor = C.lime; e.target.style.boxShadow = `0 0 0 2px ${C.lime}44`; }}
            onBlur={e => { e.target.style.borderColor = C.line; e.target.style.boxShadow = "none"; }}
            style={{ width: 62, textAlign: "center", border: `1.5px solid ${C.line}`, borderRadius: 12, padding: "12px 4px", fontFamily: "DM Sans", fontSize: 16, fontWeight: 700, background: C.bg, color: C.ink, outline: "none", WebkitAppearance: "none", transition: "border-color .15s, box-shadow .15s" }}
          />
          {showGhost && ghostR != null && (
            <span style={{ fontSize: 10.5, color: C.muted, opacity: 0.62, fontWeight: 600, lineHeight: 1, letterSpacing: 0.1 }}>{ghostR}r</span>
          )}
        </div>
        {meta?.bar && (
          <button className="sprig-tap" onClick={() => setShowPlate((s) => !s)} title="Plate calculator" style={{ background: showPlate ? C.green : C.bg2, border: "none", cursor: "pointer", width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", color: showPlate ? "#fff" : C.inkSoft, flexShrink: 0 }}><Calculator size={17} /></button>
        )}
        <button className="sprig-tap sprig-cta" onClick={log} style={{ flex: 1, background: C.green, color: "#fff", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 800, boxShadow: `0 6px 18px ${C.green}50`, letterSpacing: -0.3, transition: "box-shadow .15s" }}><Check size={16} /> Log set</button>
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, fontSize: 12, color: C.muted, flexWrap: "wrap" }}>
        <Timer size={13} color={C.muted} /> <span>Rest <b style={{ color: C.inkSoft }}>{fmtClock(restSecs)}</b></span>
        <button className="sprig-tap" onClick={() => setEditRest((s) => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: C.greenSoft, fontSize: 11.5, fontWeight: 700, padding: 0, marginLeft: 2 }}>edit</button>
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
          <span className="sprig-eyebrow" style={{ letterSpacing: .2 }}>Pain during</span>
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

/* ── Movement & Sports Panel (Train → third subtab) ─────────────────── */
const SPORT_CATS = [
  { id: "popular", label: "Popular",           emoji: "⭐" },
  { id: "cardio",  label: "Cardio / Endurance",emoji: "🏃" },
  { id: "team",    label: "Team sports",        emoji: "⚽" },
  { id: "combat",  label: "Combat",             emoji: "🥊" },
  { id: "gym",     label: "Gym / Conditioning", emoji: "💪" },
  { id: "other",   label: "Other",              emoji: "🏄" },
];
const POPULAR_SPORT_IDS = ["walking","running","cycling","football","boxing","bjj","swimming","basketball","padel","yoga"];

function MovementSportsPanel({ daily, onDaily, profile }) {
  const sessions    = Array.isArray(daily?.sportSessions) ? daily.sportSessions : [];
  const steps       = daily?.steps || 0;
  const legacyMin   = daily?.cardioMin || 0;   // old cardio data — show but don't duplicate
  const stepGoal2   = stepGoal(profile);
  const wt          = profile?.weight || 70;
  const stepGoalVal = stepGoal2 || 8000;

  // mode: null | "log" | "steps"
  const [mode, setMode]           = useState(null);
  const [cat, setCat]             = useState("popular");
  const [actId, setActId]         = useState(null);
  const [durationMin, setDuration]= useState(45);
  const [intensity, setIntensity] = useState("moderate");
  const [stepsEdit, setStepsEdit] = useState("");
  const [searching, setSearching] = useState("");
  const [stepsInline, setStepsInline] = useState(false);
  const [stepsInlineVal, setStepsInlineVal] = useState("");

  const activity = SPORTS_LIBRARY.find(s => s.id === actId);
  const estKcal  = activity ? sportKcal(activity, durationMin, intensity, wt) : 0;
  const impact   = activity ? sportMuscleImpact(activity, durationMin, intensity) : {};
  const impactEntries = Object.entries(impact).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const impactLabel = (pct) => pct >= 55 ? "High" : pct >= 30 ? "Moderate" : "Light";
  const impactColor = (pct) => pct >= 55 ? C.coral : pct >= 30 ? C.amber : C.greenSoft;
  const muscleNameMap = Object.fromEntries(MUSCLES.map(([k, n]) => [k, n]));

  const totalSportKcal  = sessions.reduce((a, s) => a + (s.estimatedCalories || 0), 0);
  const totalSportMin   = sessions.reduce((a, s) => a + (s.durationMin || 0), 0);
  const totalActiveMin  = totalSportMin + legacyMin;

  const filteredActivities = SPORTS_LIBRARY.filter(s => {
    if (searching) return s.name.toLowerCase().includes(searching.toLowerCase());
    if (cat === "popular") return POPULAR_SPORT_IDS.includes(s.id);
    return s.cat === cat;
  });

  const saveActivity = () => {
    if (!activity || !durationMin) return;
    const newSess = {
      id: uid(), ts: Date.now(),
      date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD for cross-day log filtering
      sportId: activity.id, sportName: activity.name, emoji: activity.emoji,
      durationMin: Number(durationMin), intensity,
      estimatedCalories: estKcal, muscleImpact: impact, bodyWeightKg: wt,
    };
    onDaily({ sportSessions: [...sessions, newSess] });
    buzz("light");
    setMode(null); setActId(null); setCat("popular"); setDuration(45); setIntensity("moderate");
  };

  const removeActivity = (id) => { onDaily({ sportSessions: sessions.filter(s => s.id !== id) }); buzz("light"); };

  const saveSteps = () => {
    const v = parseInt(stepsEdit, 10);
    if (Number.isFinite(v) && v >= 0) { onDaily({ steps: v }); buzz("light"); }
    setStepsEdit(""); setMode(null);
  };

  const saveStepsInline = () => {
    const v = parseInt(stepsInlineVal, 10);
    if (Number.isFinite(v) && v >= 0) { onDaily({ steps: v }); buzz("light"); }
    setStepsInlineVal(""); setStepsInline(false);
  };

  // ── default view (mode === null) ──────────────────────────────────────
  if (!mode) return (
    <div className="sprig-rise">
      {/* Movement today — hero card */}
      <div style={{ background: C.heroGrad1, borderRadius: 20, padding: "16px 18px", color: "#fff", boxShadow: C.shadow, marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .6, textTransform: "uppercase", opacity: .65, marginBottom: 10 }}>Movement today</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
          {[
            { label: "Steps",       value: steps > 0 ? steps.toLocaleString() : "–", sub: steps > 0 ? `/ ${stepGoalVal.toLocaleString()}` : "not logged" },
            { label: "Active min",  value: totalActiveMin > 0 ? `${totalActiveMin}` : "–", sub: totalActiveMin > 0 ? "min" : "" },
            { label: "Est. kcal",   value: totalSportKcal > 0 ? `~${totalSportKcal}` : "–", sub: totalSportKcal > 0 ? "kcal" : "" },
          ].map(({ label, value, sub }) => (
            <div key={label}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</div>
              {sub ? <div style={{ fontSize: 10, opacity: .65, marginTop: 2 }}>{sub}</div> : null}
              <div style={{ fontSize: 9.5, opacity: .55, marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4 }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Steps progress bar */}
        {steps > 0 && (
          <div style={{ height: 3, background: "rgba(255,255,255,.18)", borderRadius: 9 }}>
            <div style={{ height: "100%", borderRadius: 9, background: "#fff", opacity: steps >= stepGoalVal ? 1 : 0.75, width: `${Math.min(100, Math.round(steps / stepGoalVal * 100))}%`, transition: "width .3s" }} />
          </div>
        )}
      </div>

      {/* Steps quick-actions card */}
      <div style={{ background: C.card, borderRadius: 16, padding: "12px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: stepsInline ? 10 : 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: C.green + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Activity size={15} color={C.greenSoft} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>
              {steps > 0 ? `${steps.toLocaleString()} steps` : "Steps"}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted }}>
              {steps > 0 ? `${Math.round(steps / stepGoalVal * 100)}% of goal` : `Goal: ${stepGoalVal.toLocaleString()}`}
            </div>
          </div>
          {!stepsInline && (
            <div style={{ display: "flex", gap: 5 }}>
              <button className="sprig-tap" onClick={() => { onDaily({ steps: steps + 500 }); buzz("light"); }}
                style={{ ...btn(C.bg2, C.green), padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>+500</button>
              <button className="sprig-tap" onClick={() => { onDaily({ steps: steps + 1000 }); buzz("light"); }}
                style={{ ...btn(C.bg2, C.green), padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>+1k</button>
              <button className="sprig-tap" onClick={() => { setStepsInlineVal(String(steps || "")); setStepsInline(true); }}
                style={{ ...btn(C.bg2, C.inkSoft), padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>Set</button>
            </div>
          )}
        </div>
        {stepsInline && (
          <div style={{ display: "flex", gap: 7 }}>
            <input type="number" inputMode="numeric" min="0" autoFocus value={stepsInlineVal}
              onChange={(e) => setStepsInlineVal(e.target.value)} placeholder="Steps today"
              style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 11px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
            <button className="sprig-tap" onClick={saveStepsInline}
              style={{ ...btn(C.green, "#fff"), padding: "8px 14px", fontSize: 12 }}>Save</button>
            <button className="sprig-tap" onClick={() => { setStepsInline(false); setStepsInlineVal(""); }}
              style={{ ...btn(C.bg2, C.inkSoft), padding: "8px 11px", fontSize: 12 }}>✕</button>
          </div>
        )}
      </div>

      {/* Today's activities */}
      {(sessions.length > 0 || legacyMin > 0) && (
        <div style={{ background: C.card, borderRadius: 16, padding: "12px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10 }}>
          <div className="sprig-eyebrow" style={{ marginBottom: 10 }}>Today's activities</div>
          {sessions.map((s, idx) => {
            const topMuscles = s.muscleImpact
              ? Object.entries(s.muscleImpact).sort((a, b) => b[1] - a[1]).slice(0, 3)
              : [];
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingTop: idx > 0 ? 10 : 0, marginTop: idx > 0 ? 10 : 0, borderTop: idx > 0 ? `1px solid ${C.line}` : "none" }}>
                <span style={{ fontSize: 20, lineHeight: 1, marginTop: 1 }}>{s.emoji || "🏃"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{s.sportName}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
                    {s.durationMin}m · {s.intensity} · <span style={{ color: C.amber, fontWeight: 600 }}>~{s.estimatedCalories} kcal est.</span>
                  </div>
                  {topMuscles.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
                      {topMuscles.map(([k, v]) => (
                        <span key={k} style={{ background: impactColor(v) + "15", border: `1px solid ${impactColor(v)}40`, borderRadius: 6, padding: "2px 7px", fontSize: 10.5, fontWeight: 600, color: impactColor(v) }}>
                          {muscleNameMap[k] || k} {impactLabel(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button className="sprig-tap" onClick={() => removeActivity(s.id)}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: "4px 2px", flexShrink: 0 }}>
                  <X size={13} />
                </button>
              </div>
            );
          })}
          {/* Legacy cardio data — read-only, show if no sport sessions cover it */}
          {legacyMin > 0 && sessions.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: sessions.length > 0 ? 10 : 0, marginTop: sessions.length > 0 ? 10 : 0, borderTop: sessions.length > 0 ? `1px solid ${C.line}` : "none" }}>
              <span style={{ fontSize: 20 }}>🏃</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Cardio</div>
                <div style={{ fontSize: 11.5, color: C.muted }}>{legacyMin} min · Legacy log</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log activity CTA */}
      <button className="sprig-tap" onClick={() => setMode("log")}
        style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "14px 0", fontSize: 14, fontWeight: 700, boxShadow: `0 4px 14px ${C.lime}33`, marginBottom: 4 }}>
        <Plus size={15} /> Log activity
      </button>

      {sessions.length === 0 && legacyMin === 0 && steps === 0 && (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
          Track steps or log a sport.<br />Activities affect your movement score and muscle recovery.
        </div>
      )}

      <div style={{ height: 4 }} />
    </div>
  );

  // ── activity picker / logger (mode === "log") ─────────────────────────
  if (mode === "log") return (
    <div className="sprig-rise">
      <div style={{ background: C.card, borderRadius: 18, padding: "14px 14px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          {actId ? (
            <button className="sprig-tap" onClick={() => { setActId(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, padding: "4px 0" }}>← Back</button>
          ) : null}
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, flex: 1 }}>
            {actId ? activity.name : "Log activity"}
          </div>
          <button className="sprig-tap" onClick={() => { setMode(null); setActId(null); setCat("popular"); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><X size={15} /></button>
        </div>

        {!actId ? (<>
          {/* Search */}
          <input value={searching} onChange={(e) => { setSearching(e.target.value); }}
            placeholder="Search activity…"
            style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box", marginBottom: 10 }} />
          {/* Category chips */}
          {!searching && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
              {SPORT_CATS.map(c => (
                <button key={c.id} className="sprig-tap" onClick={() => setCat(c.id)}
                  style={{ ...btn(cat === c.id ? C.green : C.bg2, cat === c.id ? "#fff" : C.muted), padding: "5px 11px", fontSize: 11.5, fontWeight: 600, borderRadius: 9, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          )}
          {/* Activity list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: 300, overflowY: "auto" }}>
            {filteredActivities.length === 0 && (
              <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "16px 0" }}>No activities found</div>
            )}
            {filteredActivities.map((s) => {
              const kcalPer = Math.round(s.met.moderate * wt / 60);
              return (
                <button key={s.id} className="sprig-tap" onClick={() => { setActId(s.id); setSearching(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", padding: "9px 6px", borderRadius: 10, textAlign: "left", fontFamily: "DM Sans" }}>
                  <span style={{ fontSize: 20, lineHeight: 1, width: 28, textAlign: "center", flexShrink: 0 }}>{s.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{s.name}</div>
                    <div style={{ fontSize: 10.5, color: C.muted }}>~{kcalPer} kcal/min est.</div>
                  </div>
                  <ChevronRight size={13} color={C.muted} style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </>) : (<>
          {/* Duration */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 7 }}>Duration (minutes)</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 7 }}>
              {[15, 30, 45, 60, 90].map(n => (
                <button key={n} className="sprig-tap" onClick={() => setDuration(n)}
                  style={{ ...btn(durationMin === n ? C.green : C.bg2, durationMin === n ? "#fff" : C.muted), flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 700 }}>{n}</button>
              ))}
            </div>
            <input type="number" inputMode="numeric" min="1" value={durationMin}
              onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 12px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
          </div>
          {/* Intensity */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 7 }}>Intensity</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["easy","Easy 😊"],["moderate","Moderate 💪"],["hard","Hard 🔥"]].map(([k, lbl]) => (
                <button key={k} className="sprig-tap" onClick={() => setIntensity(k)}
                  style={{ ...btn(intensity === k ? C.green : C.bg2, intensity === k ? "#fff" : C.muted), flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 600 }}>{lbl}</button>
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="vitae-scale-in" style={{ background: C.bg, borderRadius: 13, padding: "13px 14px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: impactEntries.length > 0 ? 11 : 0 }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>{activity.emoji}</span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{activity.name} · {durationMin}m · {intensity}</div>
                <div style={{ fontSize: 12.5, color: C.amber, fontWeight: 700, marginTop: 2 }}>~{estKcal} kcal estimated</div>
              </div>
            </div>
            {impactEntries.length > 0 && (
              <>
                <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>Recovery impact</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {impactEntries.map(([k, v]) => (
                    <span key={k} style={{ background: impactColor(v) + "18", border: `1px solid ${impactColor(v)}40`, borderRadius: 6, padding: "3px 8px", fontSize: 10.5, fontWeight: 600, color: impactColor(v) }}>
                      {muscleNameMap[k] || k} · {impactLabel(v)}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>Estimates only. Affects muscle recovery display.</div>
              </>
            )}
          </div>
          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="sprig-tap" onClick={() => setActId(null)}
              style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "12px 0", fontSize: 13 }}>← Back</button>
            <button className="sprig-tap" onClick={saveActivity}
              style={{ ...btn(C.lime, "#0A1F12"), flex: 2, padding: "12px 0", fontSize: 14, fontWeight: 700 }}>
              <Check size={15} /> Save activity
            </button>
          </div>
        </>)}
      </div>
      <div style={{ height: 4 }} />
    </div>
  );

  // ── steps setter (fallback separate view, kept for deep-set use) ──────
  return (
    <div className="sprig-rise">
      <div style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Set steps</div>
        <input type="number" inputMode="numeric" min="0" autoFocus value={stepsEdit}
          onChange={(e) => setStepsEdit(e.target.value)} placeholder="Steps today"
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "11px 13px", fontSize: 15, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box", marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 8 }}>
          {[1000, 2500, 5000, 7500, 10000].map((n) => (
            <button key={n} className="sprig-tap" onClick={() => setStepsEdit(String(n))}
              style={{ ...btn(C.bg2, C.muted), flex: 1, padding: "6px 0", fontSize: 11, fontWeight: 700 }}>{(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button className="sprig-tap" onClick={() => { setMode(null); setStepsEdit(""); }}
            style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0", fontSize: 13 }}>Cancel</button>
          <button className="sprig-tap" onClick={saveSteps}
            style={{ ...btn(C.green, "#fff"), flex: 2, padding: "10px 0", fontSize: 13 }}>Save</button>
        </div>
      </div>
      <div style={{ height: 4 }} />
    </div>
  );
}


function TrainTab({ workouts, active, profile, trainInfo, advanced, sub = "training", onSub, routines, onSaveRoutine, onDeleteRoutine, onUseTemplate, onStart, onAddExercise, onLogSet, onSetRir, onOpenRirPrompt, onRemoveSet, onRemoveExercise, onFinish, onCancel, onSaveRest, onSetExercisePain, onGoBody, onGoHealth, onStartRest, restActive, moveInfo, daily, onDaily, onAddCardio, sleepInfo, rirPref, recoveryInfo }) {
  const unit = profile.unit || "kg";
  const [picker, setPicker] = useState(false);
  const [builder, setBuilder] = useState(null); // null | {} (new) | routine (edit)
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMobility, setShowMobility] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);
  const normSub = sub === "analytics" ? "recovery" : (sub === "training" || sub === "movement" || sub === "recovery" ? sub : "training");

  // ACTIVE WORKOUT
  if (active) {
    const elapsedSec = Math.floor((Date.now() - active.startTs) / 1000);
    const totalSets = active.exercises.reduce((a, e) => a + e.sets.length, 0);
    return (
      <div className="sprig-rise">
        <div style={{ position: "sticky", top: 0, zIndex: 110, background: C.cardSolid, border: `1px solid ${C.green}44`, borderRadius: 22, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 28px rgba(0,0,0,.36)", marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 2 }}>
              {active.routineName || "New Workout"}
            </div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 32, fontWeight: 700, color: C.lime, lineHeight: 1, letterSpacing: -1 }}>
              {fmtClock(elapsedSec)}
            </div>
            {totalSets > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{totalSets} set{totalSets !== 1 ? "s" : ""} logged</div>}
          </div>
          <button className="sprig-tap" onClick={onCancel} style={{ background: "transparent", border: `1px solid ${C.line}`, cursor: "pointer", padding: "9px 13px", borderRadius: 11, fontSize: 12, fontWeight: 600, color: C.muted, fontFamily: "DM Sans" }}>Cancel</button>
          <button className="sprig-tap" onClick={onFinish} style={{ ...btn(C.green, "#fff"), padding: "11px 20px", fontSize: 14, fontWeight: 800, boxShadow: `0 4px 16px ${C.green}66`, letterSpacing: -0.2 }}><Check size={16} /> Finish</button>
        </div>

        {/* (Rest timer now renders at the app-frame level so it tracks scroll — see SprigApp.) */}

        {active.exercises.map((ex, i) => (
          <ExerciseCard key={i} ex={ex} exIdx={i} workouts={workouts} unit={unit} customRests={trainInfo.customRests} advanced={advanced}
            sleepReadiness={trainInfo.sleepReadiness} daily={trainInfo.daily}
            painLevel={trainInfo.pain?.level} painLocations={trainInfo.pain?.locations} repRangePref={profile.repRange} intensityStyle={rirPref?.intensityStyle}
            onLogSet={onLogSet} onSetRir={onSetRir} onOpenRirPrompt={onOpenRirPrompt} onRemoveSet={onRemoveSet} onRemoveEx={onRemoveExercise} onSaveRest={onSaveRest} onStartRest={onStartRest}
            onSetExercisePain={onSetExercisePain}
            />
        ))}

        {picker
          ? <ExercisePicker equipment={profile?.equipment} onPick={(n) => { onAddExercise(n); setPicker(false); }} onClose={() => setPicker(false)} onCustom={(n, g) => { EXERCISES.push({ name: n, group: g, sec: [], type: "accessory", bar: false, cue: "Move through a full range of motion with control." }); onAddExercise(n); setPicker(false); }} />
          : <button className="sprig-tap" onClick={() => setPicker(true)} style={{ width: "100%", padding: "16px 0", background: C.cardSolid, border: `1.5px dashed ${C.green}66`, borderRadius: 18, cursor: "pointer", color: C.greenSoft, fontSize: 15, fontWeight: 700, fontFamily: "DM Sans", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: C.shadow }}><Plus size={18} color={C.greenSoft} /> Add exercise</button>}
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
      <SubTabs tabs={[["training", "Training"], ["movement", "Movement"], ["recovery", "Recovery"]]} active={normSub} onChange={onSub} />
      {normSub === "training" && (<>
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
                ⚕️ Sharp pain, swelling, or pain lasting 2+ weeks → see a doctor or physiotherapist. Vitae isn't medical advice.
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
              <div className="sprig-eyebrow" style={{ opacity: .75 }}>Suggested for today</div>
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
        <button className="sprig-tap" onClick={() => onStart()} style={{ ...btn(C.lime, "#0A1F12"), flex: 1, padding: "17px 0", fontSize: 16, fontWeight: 700, boxShadow: `0 6px 18px ${C.lime}33` }}>
          <Play size={18} /> Start workout
        </button>
        <button className="sprig-tap" onClick={() => setBuilder({})} style={{ ...btn(C.card, C.ink), padding: "17px 16px", fontSize: 13, border: `1px solid ${C.line}`, boxShadow: C.shadow, whiteSpace: "nowrap" }}>
          <Plus size={16} /> Routine
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

      {/* readiness — canonical score matches Today & Volume Recovery */}
      {(() => {
        const rScore  = recoveryInfo?.score  ?? trainInfo.bodyReadiness;
        const rLabel  = recoveryInfo?.label  ?? (rScore >= 70 ? "Ready" : rScore >= 45 ? "Moderate" : "Low");
        const rAction = recoveryInfo?.bestAction ?? (rScore >= 70 ? "Push hard" : rScore >= 45 ? "Train moderate" : "Light / recover");
        const rColor  = rScore >= 70 ? C.leaf : rScore >= 45 ? C.amber : C.coralSoft;
        const muscleLine = trainInfo.freshMuscles.length
          ? `Fresh: ${trainInfo.freshMuscles.slice(0, 3).join(", ")}`
          : trainInfo.readyMuscles.length
            ? "Most muscles still recovering"
            : "Log a workout to see muscle freshness";
        return (
          <div style={{ width: "100%", textAlign: "left", marginTop: 14, background: C.heroGrad1, borderRadius: 18, padding: 16, color: "#fff", display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow }}>
            <Ring value={rScore} max={100} size={64} stroke={8} label={rScore} sub="ready" color={rColor} track="rgba(255,255,255,.15)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, opacity: .8 }}>Recovery</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700 }}>{rLabel}</div>
              <div style={{ fontSize: 11.5, opacity: .85, marginTop: 2 }}>{rAction}</div>
              <div style={{ fontSize: 11, opacity: .65, marginTop: 3 }}>{muscleLine}</div>
            </div>
          </div>
        );
      })()}

      {trainInfo.deload.suggest && (
        <div style={{ marginTop: 10, background: "#fdeee8", borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <TrendingDown size={18} color={C.coral} style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "#9a3d22", lineHeight: 1.45 }}>
            <b>Consider a deload week.</b> {trainInfo.deload.reasons.join(" · ")}. Drop volume ~40% for a week and let everything supercompensate.
          </div>
        </div>
      )}

      {/* recent workout history preview */}
      </>)}

      {normSub === "recovery" && (<>
      {recoveryInfo && <PerfectRecoveryCard recoveryInfo={recoveryInfo} compact={false} />}
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

      {normSub === "movement" && (
        <MovementSportsPanel daily={daily} onDaily={onDaily} profile={profile} />
      )}


      {normSub === "training" && (<>
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
                      <div className="sprig-eyebrow" style={{ color: C.lime, marginBottom: 2 }}>Kudos earned</div>
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
        <EmptyState icon={<Dumbbell size={20} color={C.greenSoft} />} title="Start your first workout"
          text="Start a workout to track strength, volume, and progressive overload. Suggestions kick in after your first session."
          actionLabel="Start workout" onAction={onStart} />
      )}
      </>)}
      <div style={{ height: 6 }} />
    </div>
  );
}

export default TrainTab;
