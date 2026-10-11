import React, { useState } from "react";
import {
  Activity, Check, ChevronRight, Droplets, Dumbbell,
  Flame, Heart, Moon, Pill, Plus, Repeat, Scale, Zap,
} from "lucide-react";
import { C } from "../theme.js";
import {
  stepGoal, ACTIVITY_SOURCES, durLabel, scoreVerdict, uid, todayStr,
} from "../utils/vitaeCalc.js";
import {
  btn, Btn, Ring, Badge, TodayWinsCard, ScoreDonut, ACTION_ICON,
} from "../components/ui.jsx";

/* ─── constants ──────────────────────────────────────────────────── */
const HAPTIC_PATTERNS = {
  tap: 14, light: 10, select: 8,
  success: [30, 50, 30], complete: [30, 50, 50],
  strong: 40, error: [100, 50, 100],
};
function buzz(kind = "tap") {
  try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 14); } catch (_) {}
}

/* ─── palette for bento cards ────────────────────────────────────── */
const SLEEP_CLR  = "#8B7CF7";
const NUTR_CLR   = "#FB923C";
const WATER_CLR  = "#5B9BD5";
const RECOV_CLR  = "#4FC3F7";

/* ─── utilities ──────────────────────────────────────────────────── */
function getGreeting(profile) {
  const h = new Date().getHours();
  const base = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.name?.trim().split(/\s+/)[0];
  return firstName ? `${base}, ${firstName}` : base;
}

/* ─── MiniArc ────────────────────────────────────────────────────── */
function MiniArc({ pct = 0, color = C.greenSoft, size = 38, strokeWidth = 4 }) {
  const r   = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const p   = Math.min(100, Math.max(0, pct || 0));
  const dash = (p / 100) * circ;
  const cx  = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color + "28"} strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.34,1.56,0.64,1)" }} />
    </svg>
  );
}

/* ─── BentoCard ──────────────────────────────────────────────────── */
function BentoCard({ icon, color, label, main, sub, sub2, pct, onTap, cta, empty, active }) {
  return (
    <button className="sprig-tap" onClick={onTap}
      style={{
        background: active ? color + "0F" : C.card,
        border: `1px solid ${active ? color + "33" : C.line}`,
        borderRadius: 20, padding: "14px 13px",
        textAlign: "left", cursor: "pointer", fontFamily: "DM Sans",
        width: "100%", display: "flex", flexDirection: "column",
        gap: 8, boxShadow: C.shadow, minHeight: 118,
      }}>
      {/* header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: 30, height: 30, borderRadius: 10,
          background: color + "22", display: "grid", placeItems: "center",
        }}>
          {icon}
        </div>
        {pct !== undefined && <MiniArc pct={pct} color={color} size={36} strokeWidth={3.5} />}
      </div>
      {/* body */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .5, marginBottom: 3 }}>
          {label}
        </div>
        <div style={{
          fontSize: empty ? 13 : 20,
          fontFamily: "Fraunces, serif", fontWeight: 700,
          color: empty ? C.muted : C.ink, lineHeight: 1.1,
        }}>
          {main}
        </div>
        {sub  && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3, lineHeight: 1.3 }}>{sub}</div>}
        {sub2 && <div style={{ fontSize: 11.5, color, fontWeight: 600, marginTop: 2 }}>{sub2}</div>}
      </div>
      {/* cta */}
      {cta && (
        <div style={{ fontSize: 11, color, fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>
          {cta} <ChevronRight size={10} />
        </div>
      )}
    </button>
  );
}

/* ─── QuickAction button ─────────────────────────────────────────── */
function QA({ icon, label, color, onClick }) {
  return (
    <button className="sprig-tap" onClick={onClick}
      style={{
        flex: 1, background: color + "18", border: `1px solid ${color}33`,
        borderRadius: 18, padding: "13px 6px",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 6,
        cursor: "pointer", fontFamily: "DM Sans",
      }}>
      <div style={{
        width: 34, height: 34, borderRadius: 11,
        background: color + "28", display: "grid", placeItems: "center",
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>{label}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LEGACY HELPER COMPONENTS
   (kept for backward-compat — some may be referenced via App.jsx)
═══════════════════════════════════════════════════════════════════ */

function MealShortcutsCard({ shortcuts, onLog }) {
  if (!shortcuts) return null;
  const { currentSlot, slotSugg, frequent, sameAsYesterday, hasYesterday } = shortcuts;
  const slotLabel = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner" }[currentSlot];
  if (!hasYesterday && !slotSugg.length && !frequent.length) return null;
  const Pill = ({ entry, sub }) => (
    <button className="sprig-tap" onClick={() => onLog(entry)}
      style={{
        background: C.bg, border: `1px solid ${C.line}`, cursor: "pointer",
        borderRadius: 9, padding: "8px 11px",
        display: "flex", alignItems: "center", gap: 7, fontFamily: "DM Sans",
      }}>
      <Plus size={11} color={C.green} />
      <span style={{ flex: 1, textAlign: "left", fontSize: 12, color: C.ink, fontWeight: 600 }}>{entry.name}</span>
      <span style={{ fontSize: 10.5, color: C.muted }}>{sub || `${Math.round(entry.calories || 0)} kcal`}</span>
    </button>
  );
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: "12px 13px",
      boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <Repeat size={13} color={C.greenSoft} />
        <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Quick add from history</div>
      </div>
      {hasYesterday && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase", marginBottom: 4 }}>Same as yesterday</div>
          <button className="sprig-tap" onClick={() => sameAsYesterday.forEach(onLog)}
            style={{ width: "100%", background: C.greenSoft + "22", border: `1px solid ${C.greenSoft}55`, cursor: "pointer", borderRadius: 9, padding: "8px 11px", fontSize: 12, fontWeight: 600, color: C.green, fontFamily: "DM Sans" }}>
            Log all {sameAsYesterday.length} meals from yesterday
          </button>
        </div>
      )}
      {slotSugg.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: .3, textTransform: "uppercase", marginBottom: 4 }}>Yesterday's {slotLabel}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {slotSugg.map((e, i) => <Pill key={i} entry={e} />)}
          </div>
        </div>
      )}
      {frequent.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: .3, textTransform: "uppercase", marginBottom: 4 }}>Frequent (30 days)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {frequent.map((f, i) => <Pill key={i} entry={f.sample} sub={`${f.n}× · ${Math.round(f.sample.calories || 0)} kcal`} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function NextWorkoutCard({ suggestion, onStart }) {
  if (!suggestion) return null;
  return (
    <button className="sprig-tap" onClick={onStart}
      style={{
        width: "100%", textAlign: "left", background: C.card,
        border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 16,
        padding: "13px 15px", boxShadow: C.shadow, marginTop: 8,
        display: "flex", alignItems: "center", gap: 12,
      }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: C.green + "1a", display: "grid", placeItems: "center" }}>
        <Dumbbell size={18} color={C.green} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase", marginBottom: 2 }}>Suggested today</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{suggestion.suggested}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{suggestion.reason}</div>
      </div>
      <ChevronRight size={16} color={C.muted} />
    </button>
  );
}

function TonightPlanCard({ plan }) {
  if (!plan) return null;
  const items = [
    { icon: "☕", label: "Stop caffeine", value: plan.caffeineCutoff },
    { icon: "📵", label: "Screens off",   value: plan.blueCutoff },
    { icon: "🛏️", label: "Bed by",        value: plan.targetBed },
    { icon: "⏰", label: "Wake",           value: plan.targetWake },
  ];
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: "13px 15px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <Moon size={14} color={SLEEP_CLR} />
        <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Tonight's plan</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {items.map(({ icon, label, value }) => (
          <div key={label} style={{ background: C.bg, borderRadius: 9, padding: "8px 10px" }}>
            <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, letterSpacing: .3, textTransform: "uppercase" }}>{icon} {label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>
      {plan.debtMin > 30 && (
        <div style={{ fontSize: 11, color: SLEEP_CLR, marginTop: 7, lineHeight: 1.5 }}>
          You're carrying ~{Math.round(plan.debtMin / 60 * 10) / 10}h sleep debt. Early night beats sleeping in.
        </div>
      )}
    </div>
  );
}

function CalorieTrendCard({ rec, onAdjust }) {
  if (!rec) return null;
  if (rec.onTrack) {
    return (
      <div style={{
        background: C.greenSoft + "12", border: `1px solid ${C.greenSoft}55`,
        borderRadius: 14, padding: "11px 13px", marginTop: 8,
        fontSize: 12, color: C.green, lineHeight: 1.5,
        display: "flex", gap: 8, alignItems: "flex-start",
      }}>
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
        <span>Suggested</span>
        <span style={{ color: rec.suggestedDelta > 0 ? C.greenSoft : C.amber, fontWeight: 700 }}>
          {rec.suggestedTarget} kcal ({rec.suggestedDelta > 0 ? "+" : ""}{rec.suggestedDelta})
        </span>
      </div>
      {onAdjust && (
        <div style={{ marginTop: 9 }}>
          <button className="sprig-tap" onClick={() => onAdjust(rec.suggestedTarget)}
            style={{ ...btn(C.green, "#fff"), width: "100%", padding: "9px 0", fontSize: 12 }}>
            Apply suggestion
          </button>
        </div>
      )}
      <div style={{ fontSize: 10, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
        Based on the last {rec.days} days. Weight trend is the source of truth.
      </div>
    </div>
  );
}

export function ActivitySourcesSection({ profile, onSetSource }) {
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
            <button key={s.id} className="sprig-tap" disabled={!s.active}
              onClick={() => s.active && onSetSource(s.id)}
              style={{
                background: sel ? C.green + "15" : C.bg,
                border: `1px solid ${sel ? C.green : C.line}`,
                cursor: s.active ? "pointer" : "not-allowed",
                borderRadius: 11, padding: "10px 12px",
                textAlign: "left", fontFamily: "DM Sans",
                opacity: s.active ? 1 : 0.55,
              }}>
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
    </div>
  );
}

export function SrcPill({ source }) {
  if (!source || source === "exact" || source === "disabled") return null;
  const MAP = {
    quick_log: { color: C.greenSoft, label: "Quick log" },
    estimated:  { color: C.amber,     label: "Estimated" },
    unknown:    { color: C.muted,     label: "No data" },
  };
  const m = MAP[source];
  if (!m) return null;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, color: m.color,
      background: m.color + "18", border: `1px solid ${m.color}30`,
      borderRadius: 5, padding: "1px 5px", letterSpacing: .4,
      verticalAlign: "middle", textTransform: "uppercase", display: "inline-block",
    }}>
      {m.label}
    </span>
  );
}

/* ─── Daily Check-In Strip ──────────────────────────────────────── */
const MIND_CLR = "#A78BFA";
const CI_ROWS = [
  { key: "mood",   label: "Mood",   opts: [["bad","😔","Bad"], ["okay","😐","OK"], ["good","😊","Good"]] },
  { key: "energy", label: "Energy", opts: [["low","🪫","Low"], ["normal","⚡","Normal"], ["high","🔥","High"]] },
  { key: "stress", label: "Stress", opts: [["low","😌","Low"], ["medium","😤","Medium"], ["high","😰","High"]] },
];

function DailyCheckinStrip({ checkin, onCheckin }) {
  const ci = checkin || {};
  const allDone = CI_ROWS.every(({ key }) => ci[key]);
  if (allDone) {
    return (
      <div style={{ background: MIND_CLR + "12", border: `1px solid ${MIND_CLR}33`, borderRadius: 14, padding: "9px 13px", marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 14 }}>✅</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: MIND_CLR }}>Check-in done —</span>
        <span style={{ fontSize: 11.5, color: C.muted }}>Mood: <b>{ci.mood}</b> · Energy: <b>{ci.energy}</b> · Stress: <b>{ci.stress}</b></span>
      </div>
    );
  }
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: "12px 13px", marginTop: 8, boxShadow: C.shadow, border: `1px solid ${MIND_CLR}33` }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: MIND_CLR, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>How are you feeling?</div>
      {CI_ROWS.map(({ key, label, opts }) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, width: 46, flexShrink: 0 }}>{label}</div>
          <div style={{ display: "flex", gap: 5, flex: 1 }}>
            {opts.map(([val, emoji, text]) => {
              const sel = ci[key] === val;
              return (
                <button key={val} className="sprig-tap"
                  onClick={() => { onCheckin(key, val); buzz("tap"); }}
                  style={{ flex: 1, background: sel ? MIND_CLR : C.bg2, border: `1px solid ${sel ? MIND_CLR : C.line}`, borderRadius: 10, padding: "7px 2px", cursor: "pointer", fontFamily: "DM Sans", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, transition: "background .15s, border-color .15s" }}>
                  <span style={{ fontSize: 15 }}>{emoji}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: sel ? "#fff" : C.muted }}>{text}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════ */
function TodayTab({
  t, targets, entries, scores, onRemove, library, onQuick, profile, supps,
  takenIds, onToggleSupp, onRemoveSupp, onAddSupp,
  sleepInfo, trainInfo, advanced, dailyInfo, nutriInfo, healthInfo,
  mindInfo, moveInfo,
  onDaily, onAddEntry, onCheckin, onQuickLog, onStartWorkout,
  onGoSleep, onGoEnergy, onGoBody, onGoHealth, onGoMind,
  onGoNutrition, onGoTrain,
  wins, onKudos, onViewAllWins,
  recoveryInfo, quickLog, tp = {}, dt = null,
  onToast, loggedDays = 0, onGoSettings, onQuickSleep,
}) {
  const { lastSleep }                         = sleepInfo;
  const { daily, subScores, healthScore, actions, weightSeries: wSeries = [] } = dailyInfo;
  const [stepsEditing, setStepsEditing]       = useState(false);
  const [stepsInput,   setStepsInput]         = useState("");
  const [quickSleepDone, setQuickSleepDone]   = useState(false);
  const [weightInput,   setWeightInput]         = useState("");
  const [weightEditing, setWeightEditing]       = useState(false);

  /* ── derived data ─────────────────────────────────────────────── */
  const adjTarget  = moveInfo?.calAdjust?.adjustedTargetCalories || targets.calories;
  const dtNutrSrc  = dt?.nutrition?.source  || null;
  const dtSleepSrc = dt?.sleep?.source      || null;
  const dtTrainSrc = dt?.training?.source   || null;
  const dtWaterSrc = dt?.water?.source      || null;
  const dtMoveSrc  = dt?.movement?.source   || null;

  const steps      = daily.steps || 0;
  const waterMl    = daily.water || 0;
  const waterGoal  = nutriInfo.waterGoal || 2600;
  const sGoal      = stepGoal(profile);

  /* ── card data ────────────────────────────────────────────────── */
  const sleepDur  = lastSleep?.durationMin ? durLabel(lastSleep.durationMin) : null;
  const sleepPct  = lastSleep?.durationMin
    ? Math.min(100, Math.round(lastSleep.durationMin / (8 * 60) * 100))
    : Math.min(100, subScores.sleep || 0);

  const calPct    = adjTarget > 0 ? Math.min(120, Math.round((t.calories || 0) / adjTarget * 100)) : 0;
  const movePct   = sGoal > 0 ? Math.min(100, Math.round(steps / sGoal * 100)) : 0;
  const recovScore = subScores.training != null ? Math.round(subScores.training) : null;

  /* ── score chips for hero ─────────────────────────────────────── */
  const scoreChips = [
    { label: "Sleep",     v: subScores.sleep,     color: SLEEP_CLR },
    { label: "Nutrition", v: subScores.nutrition,  color: NUTR_CLR },
    { label: "Movement",  v: subScores.movement,  color: C.greenSoft },
    { label: "Recovery",  v: subScores.training,  color: RECOV_CLR },
  ].filter(ch => tp[ch.label.toLowerCase()] !== false && ch.v != null);

  const allLogged = dtNutrSrc === "exact" && !!dtSleepSrc && !!dtTrainSrc;

  /* ── render ───────────────────────────────────────────────────── */
  return (
    <div className="sprig-rise">

      {/* ══ 1. HERO ══════════════════════════════════════════════ */}
      <div style={{
        background: C.heroGrad1,
        borderRadius: 26, padding: "22px 18px 18px",
        boxShadow: C.shadow, position: "relative", overflow: "hidden",
      }}>
        {/* decorative circles */}
        <div style={{ position: "absolute", top: -45, right: -45, width: 170, height: 170, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -55, left: -35, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.025)", pointerEvents: "none" }} />

        {/* date + score */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.50)", letterSpacing: .3 }}>
              {new Date().toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 4, letterSpacing: -.4 }}>
              {getGreeting(profile)}
            </div>
          </div>
          <ScoreDonut score={healthScore} size={76} />
        </div>

        {/* ── logged-days badge ── */}
        {loggedDays >= 3 && (
          <div style={{ display: "flex", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.65)", background: "rgba(255,255,255,.1)", padding: "3px 11px", borderRadius: 99, letterSpacing: .3, display: "inline-flex", alignItems: "center", gap: 5 }}>
              {loggedDays >= 30 ? "🔥" : "🌿"} {loggedDays} days logged
            </span>
          </div>
        )}

        {/* AI insight — tappable, navigates to relevant tab */}
        {actions.length > 0 && (() => {
          const icon = actions[0].icon;
          const navFn = { train: onGoTrain, food: onGoNutrition, protein: onGoNutrition, sleep: onGoSleep, walk: onGoTrain, pain: onGoHealth }[icon];
          return navFn ? (
            <button className="sprig-tap" onClick={() => { navFn(); buzz("tap"); }}
              style={{ width: "100%", background: "rgba(255,255,255,0.09)", borderRadius: 14, padding: "11px 13px", display: "flex", alignItems: "flex-start", gap: 9, border: "none", cursor: "pointer", textAlign: "left" }}>
              <Zap size={13} color={C.lime} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.5, fontWeight: 500, flex: 1 }}>
                {actions[0].text}
              </span>
              <ChevronRight size={14} color="rgba(255,255,255,0.40)" style={{ flexShrink: 0, marginTop: 2 }} />
            </button>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.09)", borderRadius: 14, padding: "11px 13px", display: "flex", alignItems: "flex-start", gap: 9 }}>
              <Zap size={13} color={C.lime} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.88)", lineHeight: 1.5, fontWeight: 500 }}>
                {actions[0].text}
              </span>
            </div>
          );
        })()}
      </div>

      {/* ══ 2. SCORE CHIPS ═══════════════════════════════════════ */}
      {loggedDays >= 1 && scoreChips.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${scoreChips.length}, 1fr)`,
          gap: 6, marginTop: 8,
        }}>
          {scoreChips.map((ch) => {
            const v   = Math.round(ch.v);
            const clr = v >= 70 ? ch.color : v >= 45 ? C.amber : C.coral;
            const navFn = { Sleep: onGoSleep, Nutrition: onGoNutrition, Movement: onGoTrain, Recovery: onGoHealth || onGoBody }[ch.label];
            return (
              <button key={ch.label} className="sprig-tap" onClick={() => navFn?.()}
                style={{
                  background: C.card, borderRadius: 14, padding: "9px 6px 7px",
                  textAlign: "center", border: `1px solid ${C.line}`,
                  cursor: navFn ? "pointer" : "default",
                  fontFamily: "DM Sans", width: "100%",
                }}>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: clr, lineHeight: 1 }}>
                  {v}
                </div>
                <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase", marginTop: 3, marginBottom: 5 }}>
                  {ch.label}
                </div>
                <div style={{ height: 2, borderRadius: 99, background: clr, width: "38%", margin: "0 auto", opacity: 0.55 }} />
              </button>
            );
          })}
        </div>
      )}

      {/* ══ 3. QUICK ACTIONS ═════════════════════════════════════ */}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {tp.nutrition !== false && (
          <QA icon={<Flame size={17} color={NUTR_CLR} />} label="Food" color={NUTR_CLR} onClick={onGoNutrition} />
        )}
        {(tp.movement !== false || tp.training !== false) && (
          <QA icon={<Dumbbell size={17} color={C.greenSoft} />} label="Train" color={C.greenSoft} onClick={onGoTrain} />
        )}
        {tp.sleep !== false && (
          <QA icon={<Moon size={17} color={SLEEP_CLR} />} label="Sleep" color={SLEEP_CLR} onClick={onGoSleep} />
        )}
        {onGoMind && (
          <QA icon={<Heart size={17} color={RECOV_CLR} />} label="Habits" color={RECOV_CLR} onClick={onGoMind} />
        )}
      </div>

      {/* ══ 4. BENTO 2 × 2 ═══════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>

        {/* Sleep */}
        {tp.sleep !== false && (
          <BentoCard
            icon={<Moon size={15} color={SLEEP_CLR} />}
            color={SLEEP_CLR}
            label="Sleep"
            main={
              sleepDur
                ? sleepDur
                : dtSleepSrc === "quick_log"
                  ? "Rested"
                  : "—"
            }
            sub={
              sleepDur
                ? `Score ${Math.round(subScores.sleep || 0)}`
                : dtSleepSrc === "quick_log"
                  ? "Quick logged"
                  : null
            }
            sub2={!dtSleepSrc ? "Not logged yet" : null}
            pct={sleepPct}
            onTap={onGoSleep}
            cta={!dtSleepSrc ? "Log tonight's sleep" : null}
            empty={!sleepDur && dtSleepSrc !== "quick_log"}
            active={!!(sleepDur || dtSleepSrc === "quick_log")}
          />
        )}

        {/* Nutrition */}
        {tp.nutrition !== false && (
          <BentoCard
            icon={<Flame size={15} color={NUTR_CLR} />}
            color={NUTR_CLR}
            label="Nutrition"
            main={
              t.calories > 0
                ? `${t.calories} kcal`
                : dtNutrSrc === "quick_log"
                  ? "Logged"
                  : "—"
            }
            sub={t.calories > 0 ? `${Math.round(t.protein || 0)}g protein` : null}
            sub2={
              t.calories > adjTarget
                ? "Over goal"
                : t.calories > 0 && adjTarget > 0
                  ? `${adjTarget - t.calories} left`
                  : null
            }
            pct={calPct}
            onTap={onGoNutrition}
            cta={!dtNutrSrc && t.calories === 0 ? "Log your meals" : null}
            empty={t.calories === 0 && !dtNutrSrc}
            active={t.calories > 0 || dtNutrSrc === "quick_log"}
          />
        )}

        {/* Movement */}
        {(tp.movement !== false || tp.training !== false) && (
          <BentoCard
            icon={<Activity size={15} color={C.greenSoft} />}
            color={C.greenSoft}
            label="Movement"
            main={
              dtMoveSrc === "quick_log"
                ? "Active"
                : steps > 0
                  ? steps.toLocaleString()
                  : dtTrainSrc === "exact"
                    ? "Trained"
                    : "—"
            }
            sub={
              steps > 0 && dtMoveSrc !== "quick_log"
                ? `${movePct}% · goal ${sGoal.toLocaleString()}`
                : dtTrainSrc === "exact" && steps === 0
                  ? "Workout logged ✓"
                  : null
            }
            sub2={null}
            pct={movePct}
            onTap={onGoTrain}
            cta={!dtMoveSrc && !dtTrainSrc && steps === 0 ? "Log workout" : null}
            empty={!dtMoveSrc && !dtTrainSrc && steps === 0}
            active={!!(dtMoveSrc || steps > 0 || dtTrainSrc === "exact")}
          />
        )}

        {/* Recovery */}
        {tp.recovery !== false && (
          <BentoCard
            icon={<Heart size={15} color={RECOV_CLR} />}
            color={RECOV_CLR}
            label="Recovery"
            main={recovScore != null ? String(recovScore) : "—"}
            sub={recovScore != null ? scoreVerdict(recovScore) : null}
            sub2={
              recovScore != null && recovScore < 50
                ? "Rest recommended"
                : recovScore != null && recovScore >= 80
                  ? "Peak condition"
                  : null
            }
            pct={recovScore}
            onTap={onGoHealth || onGoBody}
            empty={recovScore == null}
            active={recovScore != null}
          />
        )}
      </div>

      {/* ══ 4a. TONIGHT PLAN CARD (evening, 20:00+) ════════════════════ */}
      {tp.sleep !== false && moveInfo?.tonight && (() => {
        const h = new Date().getHours();
        if (h < 20) return null;
        return <TonightPlanCard plan={moveInfo.tonight} />;
      })()}

      {/* ══ 4ab. NEXT WORKOUT SUGGESTION (no workout today) ════════════ */}
      {tp.training !== false && !dtTrainSrc && moveInfo?.nextWorkout && trainInfo?.suggestion?.type !== "rest" && (
        <NextWorkoutCard
          suggestion={moveInfo.nextWorkout}
          onStart={() => { onStartWorkout?.(); buzz("tap"); }}
        />
      )}

      {/* ══ 4b. QUICK SLEEP STRIP (morning, no sleep logged yet) ═════ */}
      {tp.sleep !== false && !quickSleepDone && !sleepDur && !dtSleepSrc && onQuickSleep && (() => {
        const h = new Date().getHours();
        if (h < 5 || h >= 11) return null;
        const DURATIONS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];
        return (
          <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${SLEEP_CLR}44`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: SLEEP_CLR + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Moon size={15} color={SLEEP_CLR} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Quick sleep log</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>How long did you sleep?</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
              {DURATIONS.map((hrs) => (
                <button key={hrs} className="sprig-tap"
                  onClick={() => {
                    const now = Date.now();
                    onQuickSleep({ bedTs: now - hrs * 3600000, wakeTs: now, restlessness: 25, source: "quick_today" });
                    buzz("success");
                    setQuickSleepDone(true);
                    if (onToast) onToast(`Sleep logged: ${hrs}h ✓`);
                  }}
                  style={{ flexShrink: 0, background: SLEEP_CLR + "14", border: `1px solid ${SLEEP_CLR}33`, borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontFamily: "DM Sans", fontSize: 13, fontWeight: 700, color: SLEEP_CLR, whiteSpace: "nowrap" }}>
                  {hrs}h
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ══ 4c. MEAL SHORTCUTS (when food log is near empty) ═══════════ */}
      {tp.nutrition !== false && t.calories < 300 && moveInfo?.mealShortcuts && (() => {
        const sc = moveInfo.mealShortcuts;
        if (!sc.hasYesterday && !sc.slotSugg?.length && !sc.frequent?.length) return null;
        return (
          <MealShortcutsCard
            shortcuts={sc}
            onLog={(entry) => {
              onAddEntry({ ...entry, id: uid(), date: todayStr(), time: Date.now() });
              buzz("success");
              if (onToast) onToast(`${entry.name} added ✓`);
            }}
          />
        );
      })()}

      {/* ══ 5. WATER STRIP ═══════════════════════════════════════ */}
      {tp.water !== false && (
        <div style={{
          background: C.card, borderRadius: 18,
          border: `1px solid ${C.line}`, marginTop: 8,
          padding: "12px 14px", boxShadow: C.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: waterMl > 0 ? 9 : 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: WATER_CLR + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Droplets size={15} color={WATER_CLR} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Water</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                {dtWaterSrc === "quick_log" && waterMl === 0
                  ? "Goal hit · Quick logged"
                  : `${(waterMl / 1000).toFixed(1)}L / ${(waterGoal / 1000).toFixed(1)}L`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              <button className="sprig-tap"
                onClick={() => {
                  onDaily({ water: waterMl + 250 });
                  buzz("light");
                  if (onToast) onToast("Added 250ml water ✓");
                }}
                style={{
                  background: WATER_CLR + "1A", border: `1px solid ${WATER_CLR}33`,
                  borderRadius: 9, padding: "8px 10px",
                  fontSize: 12, fontWeight: 700, color: WATER_CLR,
                  cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap",
                }}>
                +250
              </button>
              <button className="sprig-tap"
                onClick={() => {
                  onDaily({ water: waterMl + 500 });
                  buzz("light");
                  if (onToast) onToast("Added 500ml water ✓");
                }}
                style={{
                  background: WATER_CLR + "28", border: `1px solid ${WATER_CLR}55`,
                  borderRadius: 9, padding: "8px 10px",
                  fontSize: 12, fontWeight: 700, color: WATER_CLR,
                  cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap",
                }}>
                +500
              </button>
            </div>
          </div>
          {waterMl > 0 && (
            <div style={{ height: 5, background: C.bg2, borderRadius: 9 }}>
              <div style={{
                height: "100%", borderRadius: 9,
                background: waterMl >= waterGoal ? WATER_CLR : WATER_CLR + "AA",
                width: `${Math.min(100, Math.round(waterMl / waterGoal * 100))}%`,
                transition: "width .4s",
              }} />
            </div>
          )}
        </div>
      )}

      {/* ══ 6. STEPS STRIP ═══════════════════════════════════════ */}
      {tp.movement !== false && dtMoveSrc !== "quick_log" && (
        <div style={{
          background: C.card, borderRadius: 18,
          border: `1px solid ${C.line}`, marginTop: 8,
          padding: "12px 14px", boxShadow: C.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (steps > 0 || stepsEditing) ? 9 : 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: C.green + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Activity size={15} color={C.greenSoft} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Steps</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                {steps > 0
                  ? `${steps.toLocaleString()} / ${sGoal.toLocaleString()}`
                  : `0 / ${sGoal.toLocaleString()}`}
              </div>
            </div>
          </div>
          {steps > 0 && !stepsEditing && (
            <div style={{ height: 5, background: C.bg2, borderRadius: 9, marginBottom: 9 }}>
              <div style={{
                height: "100%", borderRadius: 9,
                background: steps >= sGoal ? C.greenSoft : C.green + "AA",
                width: `${Math.min(100, movePct)}%`, transition: "width .4s",
              }} />
            </div>
          )}
          {!stepsEditing ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button className="sprig-tap" onClick={() => { onDaily({ steps: steps + 1000 }); buzz("light"); }}
                style={{ ...btn(C.bg2, C.green), flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700 }}>+1K</button>
              <button className="sprig-tap" onClick={() => { onDaily({ steps: steps + 2000 }); buzz("light"); }}
                style={{ ...btn(C.bg2, C.green), flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700 }}>+2K</button>
              <button className="sprig-tap" onClick={() => { onDaily({ steps: steps + 5000 }); buzz("light"); }}
                style={{ ...btn(C.bg2, C.greenSoft), flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700 }}>+5K</button>
              <button className="sprig-tap" onClick={() => { setStepsInput(String(steps || "")); setStepsEditing(true); }}
                style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700 }}>Set</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number" inputMode="numeric" min="0" autoFocus
                value={stepsInput} onChange={(e) => setStepsInput(e.target.value)}
                placeholder="Steps today"
                style={{
                  flex: 1, background: C.bg, border: `1px solid ${C.line}`,
                  borderRadius: 10, padding: "9px 10px",
                  fontSize: 14, fontFamily: "DM Sans", color: C.ink,
                }}
              />
              <button className="sprig-tap" onClick={() => {
                const v = parseInt(stepsInput, 10);
                if (Number.isFinite(v) && v >= 0) { onDaily({ steps: v }); buzz("light"); }
                setStepsEditing(false); setStepsInput("");
              }} style={{ ...btn(C.green, "#fff"), padding: "9px 14px", fontSize: 12 }}>Save</button>
              <button className="sprig-tap" onClick={() => { setStepsEditing(false); setStepsInput(""); }}
                style={{ ...btn(C.bg2, C.inkSoft), padding: "9px 12px", fontSize: 12 }}>✕</button>
            </div>
          )}
        </div>
      )}

      {/* ══ 6.2. WEIGHT STRIP (if not yet logged today) ════════════════ */}
      {tp.body !== false && !daily.weight && !weightEditing && (() => {
        const sorted = [...wSeries].sort((a, b) => a.date > b.date ? 1 : -1);
        const lastKg = sorted[sorted.length - 1]?.kg ?? null;
        const unit   = profile?.unit || "kg";
        const presets = lastKg
          ? [-1, -0.5, 0, 0.5, 1].map(d => Math.round((lastKg + d) * 10) / 10)
          : null;
        const WEIGHT_CLR = "#4FC3F7";
        return (
          <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: presets ? 10 : 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: WEIGHT_CLR + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Scale size={15} color={WEIGHT_CLR} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Weight</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                  {lastKg ? `Last: ${lastKg}${unit}` : "Log today's weight"}
                </div>
              </div>
              <button className="sprig-tap" onClick={() => setWeightEditing(true)}
                style={{ background: WEIGHT_CLR + "1A", border: `1px solid ${WEIGHT_CLR}33`, borderRadius: 9, padding: "7px 12px", fontSize: 12, fontWeight: 700, color: WEIGHT_CLR, cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap", flexShrink: 0 }}>
                {lastKg ? "Other" : "Enter"}
              </button>
            </div>
            {presets && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
                {presets.map((kg) => (
                  <button key={kg} className="sprig-tap"
                    onClick={() => { onDaily({ weight: kg }); buzz("success"); if (onToast) onToast(`Weight logged: ${kg}${unit} ✓`); }}
                    style={{ flexShrink: 0, background: kg === lastKg ? WEIGHT_CLR + "28" : WEIGHT_CLR + "14", border: `1px solid ${kg === lastKg ? WEIGHT_CLR + "55" : WEIGHT_CLR + "33"}`, borderRadius: 10, padding: "9px 14px", cursor: "pointer", fontFamily: "DM Sans", fontSize: 13, fontWeight: 700, color: kg === lastKg ? WEIGHT_CLR : C.ink, whiteSpace: "nowrap" }}>
                    {kg}{unit}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}
      {tp.body !== false && !daily.weight && weightEditing && (() => {
        const WEIGHT_CLR = "#4FC3F7";
        const unit       = profile?.unit || "kg";
        return (
          <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: WEIGHT_CLR + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Scale size={15} color={WEIGHT_CLR} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Weight</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Enter today's weight</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number" inputMode="decimal" min="20" max="300" step="0.1" autoFocus
                value={weightInput} onChange={(e) => setWeightInput(e.target.value)}
                placeholder={`kg`}
                style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 10px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, outline: "none" }}
              />
              <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: C.muted, flexShrink: 0 }}>{unit}</span>
              <button className="sprig-tap" onClick={() => {
                const v = parseFloat(weightInput);
                if (Number.isFinite(v) && v > 20 && v < 400) {
                  onDaily({ weight: v });
                  buzz("success");
                  if (onToast) onToast(`Weight logged: ${v}${unit} ✓`);
                }
                setWeightEditing(false); setWeightInput("");
              }} style={{ background: WEIGHT_CLR + "22", border: `1px solid ${WEIGHT_CLR}44`, borderRadius: 10, padding: "9px 14px", fontSize: 12, fontWeight: 700, color: WEIGHT_CLR, cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap" }}>Save</button>
              <button className="sprig-tap" onClick={() => { setWeightEditing(false); setWeightInput(""); }}
                style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px", fontSize: 12, fontWeight: 700, color: C.inkSoft, cursor: "pointer", fontFamily: "DM Sans" }}>✕</button>
            </div>
          </div>
        );
      })()}

      {/* ══ 6.5. SUPPLEMENT STRIP ════════════════════════════════════ */}
      {supps && supps.length > 0 && (() => {
        const taken = supps.filter(s => takenIds.includes(s.id));
        const allTaken = taken.length === supps.length;
        const SUPP_CLR = "#52C878";
        return (
          <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${allTaken ? SUPP_CLR + "44" : C.line}`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: allTaken ? SUPP_CLR + "28" : SUPP_CLR + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Pill size={15} color={SUPP_CLR} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Daily Stack</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: allTaken ? SUPP_CLR : C.ink }}>
                  {allTaken ? "All taken today ✓" : `${taken.length} / ${supps.length} taken`}
                </div>
              </div>
              {!allTaken ? (
                <button className="sprig-tap" onClick={() => { supps.forEach(s => { if (!takenIds.includes(s.id)) onToggleSupp?.(s.id); }); buzz("light"); if (onToast) onToast(`All ${supps.length} supplements logged ✓`); }}
                  style={{ background: SUPP_CLR + "18", border: `1px solid ${SUPP_CLR}44`, borderRadius: 9, padding: "7px 12px", fontSize: 12, fontWeight: 700, color: SUPP_CLR, cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap", flexShrink: 0 }}>
                  Log all
                </button>
              ) : (
                <Check size={16} color={SUPP_CLR} />
              )}
            </div>
          </div>
        );
      })()}

      {/* ══ 6.7. DAILY CHECK-IN ══════════════════════════════════ */}
      {tp.mind !== false && onCheckin && (
        <DailyCheckinStrip checkin={daily.checkin} onCheckin={onCheckin} />
      )}

      {/* ══ 7. QUICK LOG ═════════════════════════════════════════ */}
      {quickLog ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: C.bg2, borderRadius: 14,
          padding: "11px 14px", marginTop: 10,
        }}>
          <Zap size={13} color={C.greenSoft} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.muted, flex: 1 }}>Quick logged today</span>
          {onQuickLog && (
            <button className="sprig-tap" onClick={onQuickLog}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.greenSoft, fontFamily: "DM Sans", fontWeight: 600 }}>
              Edit →
            </button>
          )}
        </div>
      ) : onQuickLog && !allLogged ? (
        <button className="sprig-tap" onClick={onQuickLog}
          style={{
            ...btn(C.lime, "#0A1F12"), width: "100%",
            padding: "15px 16px", fontSize: 14, fontWeight: 700,
            marginTop: 12, boxShadow: `0 4px 18px ${C.lime}33`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
          <Zap size={15} />
          Quick log the day
          <ChevronRight size={15} style={{ marginLeft: "auto", opacity: .7 }} />
        </button>
      ) : null}

      {/* ══ 8. WINS ══════════════════════════════════════════════ */}
      {wins && (
        <div style={{ marginTop: 12 }}>
          <TodayWinsCard wins={wins} onKudos={onKudos} onViewAll={onViewAllWins} />
        </div>
      )}

      {/* ══ 9. ADVANCED MODE NUDGE ═══════════════════════════════ */}
      {!advanced && loggedDays >= 7 && loggedDays < 30 && (
        <div className="sprig-rise" style={{
          background: C.card, borderRadius: 18, padding: "14px 16px",
          boxShadow: C.shadow, border: `1px solid ${C.line}`,
          marginTop: 12, display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green + "1a", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Zap size={17} color={C.green} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Advanced mode available</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>
              You've logged {loggedDays} days — unlock deeper analytics and extra tracking panels.
            </div>
          </div>
          <button className="sprig-tap" onClick={onGoSettings}
            style={{ background: C.green + "18", border: `1px solid ${C.green}44`, borderRadius: 9, padding: "7px 13px", fontSize: 11.5, fontWeight: 700, color: C.green, cursor: "pointer", fontFamily: "DM Sans", flexShrink: 0 }}>
            Explore
          </button>
        </div>
      )}

      <div style={{ height: 6 }} />
    </div>
  );
}

export default TodayTab;
