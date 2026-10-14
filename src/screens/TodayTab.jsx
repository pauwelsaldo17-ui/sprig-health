import React, { useState } from "react";
import {
  Activity, Check, ChevronRight, Droplets, Dumbbell,
  Flame, Heart, Moon, Pill, Plus, Repeat, Scale, TrendingUp, Zap,
} from "lucide-react";
import { C } from "../theme.js";
import {
  stepGoal, ACTIVITY_SOURCES, durLabel, scoreVerdict, uid, todayStr, MUSCLES, RISK_TAG, BLOOD_MARKERS,
  ALCOHOL_LEVELS, alcoholLevel, interactionFlags, volumeStatus, VOL_TAG_COLOR,
  weightStats, weightVerdict, mealScore,
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
function minToTimeStr(min) {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${period}`;
}
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

function NextWorkoutCard({ suggestion, splitLabel, splitReason, onStart }) {
  // At least one of suggestion or splitLabel must be present
  if (!suggestion && !splitLabel) return null;
  const title = suggestion?.suggested || splitLabel;
  const subtitle = splitLabel && suggestion?.suggested && splitLabel !== suggestion.suggested
    ? splitLabel : null;
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
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 11, fontWeight: 600, color: C.green, marginTop: 1 }}>{subtitle}</div>
        )}
        {suggestion?.reason && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{suggestion.reason}</div>
        )}
        {splitReason && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 5,
            marginTop: subtitle || suggestion?.reason ? 5 : 2,
            background: C.green + "0C", borderRadius: 7, padding: "4px 7px",
          }}>
            <span style={{ fontSize: 9, marginTop: 1, flexShrink: 0 }}>💪</span>
            <span style={{ fontSize: 10.5, color: C.inkSoft, lineHeight: 1.4 }}>{splitReason}</span>
          </div>
        )}
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
  const { daily, subScores, healthScore, funcHealth, actions, weightSeries: wSeries = [] } = dailyInfo;
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

        {/* ── Secondary actions — compact supporting nudges ── */}
        {actions.length > 1 && (
          <div style={{ marginTop: 7, display: "flex", flexDirection: "column", gap: 4 }}>
            {actions.slice(1, 4).map((a, i) => {
              const navFn2 = { train: onGoTrain, food: onGoNutrition, protein: onGoNutrition, sleep: onGoSleep, walk: onGoTrain, pain: onGoHealth }[a.icon];
              const iconEl = ACTION_ICON[a.icon];
              return navFn2 ? (
                <button key={i} className="sprig-tap" onClick={() => { navFn2(); buzz("tap"); }}
                  style={{ width: "100%", background: "rgba(255,255,255,0.055)", borderRadius: 10, padding: "7px 11px", display: "flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer", textAlign: "left" }}>
                  {iconEl && <span style={{ flexShrink: 0, opacity: 0.5, display: "flex", color: "rgba(255,255,255,0.7)" }}>{iconEl}</span>}
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", lineHeight: 1.4, flex: 1 }}>{a.text}</span>
                  <ChevronRight size={12} color="rgba(255,255,255,0.25)" style={{ flexShrink: 0 }} />
                </button>
              ) : (
                <div key={i} style={{ background: "rgba(255,255,255,0.055)", borderRadius: 10, padding: "7px 11px", display: "flex", alignItems: "center", gap: 8 }}>
                  {iconEl && <span style={{ flexShrink: 0, opacity: 0.5, display: "flex", color: "rgba(255,255,255,0.7)" }}>{iconEl}</span>}
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", lineHeight: 1.4 }}>{a.text}</span>
                </div>
              );
            })}
          </div>
        )}
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

      {/* ══ 2b. HEALTH SCORE REASONS + CONFIDENCE ══ */}
      {funcHealth?.enough && healthScore != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, paddingLeft: 2 }}>
          {funcHealth.reasons?.length > 0 && healthScore < 80 ? (
            <>
              <span style={{ fontSize: 11, color: C.muted, lineHeight: 1, flexShrink: 0 }}>Focus on:</span>
              <span style={{ fontSize: 11, color: C.inkSoft, lineHeight: 1, flex: 1 }}>{funcHealth.reasons.join(" · ")}</span>
            </>
          ) : (
            <span style={{ flex: 1 }} />
          )}
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", lineHeight: 1,
            color: funcHealth.confidence === "High" ? C.greenSoft : funcHealth.confidence === "Medium" ? C.amber : C.muted,
            background: funcHealth.confidence === "High" ? C.greenSoft + "15" : funcHealth.confidence === "Medium" ? C.amber + "15" : C.muted + "15",
            borderRadius: 5, padding: "2px 6px", flexShrink: 0,
          }}>
            {funcHealth.confidence}
          </span>
        </div>
      )}

      {/* ══ 2c. HEALTH CATEGORY BREAKDOWN ══ */}
      {funcHealth?.enough && funcHealth.categories?.some(c => c.score != null) && (
        <div style={{ display: "flex", gap: 5, marginTop: 7, overflowX: "auto" }}>
          {(() => {
            const CAT_CLR = { sleep: SLEEP_CLR, nutrition: NUTR_CLR, movement: C.greenSoft, mind: RECOV_CLR, markers: C.muted };
            const CAT_LBL = { sleep: "Sleep", nutrition: "Nutr.", movement: "Move", mind: "Mind", markers: "Vitals" };
            return funcHealth.categories
              .filter(c => c.score != null)
              .map((cat) => {
                const clr = cat.score >= 70 ? (CAT_CLR[cat.key] ?? C.muted) : cat.score >= 45 ? C.amber : C.coral;
                return (
                  <div key={cat.key} style={{
                    flex: "0 0 auto", background: C.card, border: `1px solid ${C.line}`,
                    borderRadius: 10, padding: "5px 9px 6px", textAlign: "center", minWidth: 50,
                  }}>
                    <div style={{ fontSize: 14, fontFamily: "Fraunces, serif", fontWeight: 700, color: clr, lineHeight: 1 }}>
                      {Math.round(cat.score)}
                    </div>
                    <div style={{ fontSize: 8.5, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 }}>
                      {CAT_LBL[cat.key] ?? cat.key}
                    </div>
                    <div style={{ height: 2, borderRadius: 99, background: clr, width: `${Math.max(15, cat.score)}%`, margin: "3px auto 0", opacity: 0.45 }} />
                  </div>
                );
              });
          })()}
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

      {/* ══ 3b. HABIT PROGRESS STRIP ════════════════════════════ */}
      {onGoMind && mindInfo && (() => {
        const { habits2 = [], habitStatusMap = {}, autoToday = {}, consistencyV2, focusMinutesToday = 0, focusWeek = [] } = mindInfo;
        const weekFocusMin = focusWeek.reduce((a, f) => a + (f.minutes || 0), 0);
        const active     = habits2.filter(h => !h.archived);
        const dailyH     = active.filter(h => !h.frequency || h.frequency === "daily");
        const dueToday   = dailyH.filter(h => (habitStatusMap[h.id] || {}).isDue !== false);
        if (dueToday.length === 0) return null;
        const isAutoMet  = (h) => !!(h.autoType && autoToday[h.id]?.met);
        const doneCount  = dueToday.filter(h => (habitStatusMap[h.id] || {}).isComplete || isAutoMet(h)).length;
        const allDone    = doneCount >= dueToday.length;
        const consPct    = consistencyV2?.pct;
        const consLabel  = consistencyV2?.label;
        const consClr    = consPct == null ? C.muted : consPct >= 85 ? C.greenSoft : consPct >= 65 ? C.amber : C.coral;
        return (
          <button className="sprig-tap" onClick={() => { onGoMind(); buzz("tap"); }}
            style={{
              width: "100%", background: C.card, border: `1px solid ${allDone ? C.greenSoft + "55" : C.line}`,
              borderRadius: 12, padding: "8px 13px", display: "flex", alignItems: "center", gap: 9,
              marginTop: 8, cursor: "pointer", textAlign: "left",
            }}>
            {/* completion dots */}
            <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap", alignItems: "center" }}>
              {dueToday.slice(0, 9).map((h) => {
                const done = (habitStatusMap[h.id] || {}).isComplete || isAutoMet(h);
                return <div key={h.id} style={{ width: 9, height: 9, borderRadius: "50%", background: done ? C.greenSoft : C.line + "AA", flexShrink: 0 }} />;
              })}
              {dueToday.length > 9 && <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600 }}>+{dueToday.length - 9}</span>}
            </div>
            {/* count + consistency */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 1 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: allDone ? C.greenSoft : C.inkSoft }}>
                {doneCount}/{dueToday.length} habits
              </span>
              {consLabel && consPct != null && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: consClr }}>
                  {consLabel} · {consPct}%
                </span>
              )}
              {focusMinutesToday >= 10 && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: RECOV_CLR }}>
                  🎯 {focusMinutesToday}min focus
                </span>
              )}
              {weekFocusMin >= 60 && focusMinutesToday < 10 && (
                <span style={{ fontSize: 9.5, fontWeight: 700, color: RECOV_CLR }}>
                  📅 {Math.round(weekFocusMin / 60 * 10) / 10}h focus/wk
                </span>
              )}
            </div>
            <ChevronRight size={12} color={allDone ? C.greenSoft : C.muted} style={{ flexShrink: 0 }} />
          </button>
        );
      })()}

      {/* ══ 3c. DAY DOMAIN PROGRESS — done / partial / still-to-log chips ════ */}
      {dt?.overall && (() => {
        const { completedAreas = [], partialAreas = [], missingButEnabled: missingKeys = [] } = dt.overall;
        const DOMAIN_META = [
          { k: "sleep",       icon: "🌙", label: "Sleep",    enabled: tp.sleep !== false },
          { k: "nutrition",   icon: "🥗", label: "Food",     enabled: tp.nutrition !== false },
          { k: "water",       icon: "💧", label: "Water",    enabled: tp.water !== false },
          { k: "movement",    icon: "🚶", label: "Steps",    enabled: tp.movement !== false },
          { k: "training",    icon: "💪", label: "Training", enabled: tp.training !== false },
          { k: "supplements", icon: "💊", label: "Supps",    enabled: tp.supplements !== false },
        ];
        const done     = DOMAIN_META.filter(d => d.enabled && completedAreas.includes(d.k));
        const partial  = DOMAIN_META.filter(d => d.enabled && partialAreas.includes(d.k));
        const unlogged = DOMAIN_META.filter(d => d.enabled && missingKeys.includes(d.k)).slice(0, 3);
        if (!done.length && !partial.length) return null;
        return (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginTop: 8, marginBottom: -2 }}>
            {done.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: C.greenSoft, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0, lineHeight: 1.6 }}>
                ✓ Done:
              </span>
            )}
            {done.map(d => (
              <span key={d.k} style={{
                fontSize: 10, fontWeight: 700, color: C.greenSoft,
                background: C.greenSoft + "14", border: `1px solid ${C.greenSoft}33`,
                borderRadius: 7, padding: "3px 8px", lineHeight: 1,
              }}>
                {d.icon} {d.label}
              </span>
            ))}
            {partial.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0, lineHeight: 1.6, marginLeft: done.length > 0 ? 2 : 0 }}>
                {done.length > 0 ? "Partial:" : "In progress:"}
              </span>
            )}
            {partial.map(d => (
              <span key={d.k} style={{
                fontSize: 10, fontWeight: 700, color: C.amber,
                background: C.amber + "10", border: `1px solid ${C.amber}33`,
                borderRadius: 7, padding: "3px 8px", lineHeight: 1,
              }}>
                {d.icon} {d.label}
              </span>
            ))}
            {unlogged.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0, lineHeight: 1.6, marginLeft: (done.length > 0 || partial.length > 0) ? 2 : 0 }}>
                Still:
              </span>
            )}
            {unlogged.map(d => (
              <span key={d.k} style={{
                fontSize: 10, fontWeight: 600, color: C.muted,
                background: C.muted + "0A", border: `1px dashed ${C.muted}44`,
                borderRadius: 7, padding: "3px 8px", lineHeight: 1,
              }}>
                {d.icon} {d.label}
              </span>
            ))}
          </div>
        );
      })()}

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

      {/* ══ 4c0_ec. ENERGY CURVE — full-day sparkline from wake to bed ════ */}
      {sleepInfo?.curve?.length > 5 && (() => {
        const curve = sleepInfo.curve;
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const minX = curve[0].min;
        const maxX = curve[curve.length - 1].min;
        const span = maxX - minX || 1;
        const W = 300, H = 52, PAD = 2;

        // Build SVG path
        const toX = (m) => PAD + ((m - minX) / span) * (W - PAD * 2);
        const toY = (e) => H - PAD - (e / 100) * (H - PAD * 2);

        const points = curve.map(p => ({ x: toX(p.min), y: toY(p.e), e: p.e }));
        const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        const areaD = `${pathD} L${points[points.length-1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`;

        // Now marker
        const nowClamped = Math.min(Math.max(nowMin, minX), maxX);
        const nowX = toX(nowClamped);
        const isPast = nowMin > maxX;
        // Find nearest curve point for current energy
        const nearest = curve.reduce((best, p) => Math.abs(p.min - nowMin) < Math.abs(best.min - nowMin) ? p : best, curve[0]);
        const nowE = nearest.e;
        const nowClr = nowE >= 65 ? C.greenSoft : nowE >= 40 ? C.amber : C.coral;

        // Wake time label
        const wakeH = Math.floor((minX % 1440) / 60);
        const wakeM = minX % 60;
        const wakeStr = `${wakeH}:${String(wakeM).padStart(2, "0")}`;
        const bedH = Math.floor((maxX % 1440) / 60);
        const bedM = maxX % 60;
        const bedStr = `${bedH}:${String(bedM).padStart(2, "0")}`;

        const nowHour = Math.floor((nowClamped % 1440) / 60);
        const nowMn = nowClamped % 60;
        const nowStr = `${nowHour}:${String(nowMn).padStart(2, "0")}`;

        return (
          <div className="sprig-pop" style={{ background: C.card, borderRadius: 16, border: `1px solid ${nowClr}22`, marginTop: 8, padding: "11px 13px", boxShadow: C.shadow }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, lineHeight: 1 }}>⚡</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: nowClr, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Energy today
                </span>
              </div>
              {!isPast && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: nowClr, animation: "pulse 1.8s ease-in-out infinite" }} />
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: nowClr, fontFamily: "Fraunces, serif" }}>{nowE}</span>
                  <span style={{ fontSize: 9.5, color: C.muted, marginLeft: 1 }}>now</span>
                </div>
              )}
            </div>

            {/* SVG Sparkline */}
            <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block", overflow: "visible" }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="ecFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={nowClr} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={nowClr} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path d={areaD} fill="url(#ecFill)" />
                {/* Line */}
                <path d={pathD} fill="none" stroke={nowClr} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
                {/* Past shade overlay */}
                {!isPast && (
                  <rect x={0} y={0} width={nowX} height={H} fill={C.line || "#E0E0E0"} opacity="0.18" />
                )}
                {/* Now marker line */}
                {!isPast && (
                  <>
                    <line x1={nowX} y1={0} x2={nowX} y2={H} stroke={nowClr} strokeWidth="1.2" strokeDasharray="3 2" opacity="0.7" />
                    <circle cx={nowX} cy={toY(nowE)} r="3.2" fill={nowClr} stroke={C.card} strokeWidth="1.5" />
                  </>
                )}
              </svg>
            </div>

            {/* Time labels */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600 }}>🌅 {wakeStr}</span>
              {!isPast && (
                <span style={{ fontSize: 9.5, color: nowClr, fontWeight: 700 }}>{nowStr}</span>
              )}
              <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600 }}>🌙 {bedStr}</span>
            </div>
          </div>
        );
      })()}

      {/* ══ 4c0b. SLEEP STAGES — deep / REM / light breakdown ═════════════ */}
      {tp.sleep !== false && lastSleep?.stages && (lastSleep.stages.deep || lastSleep.stages.rem) && (() => {
        const st = lastSleep.stages;
        const dur = lastSleep.durationMin || 0;
        const slots = [
          { key: "deep",  label: "Deep",  color: "#7C6FE0", icon: "🌊" },
          { key: "rem",   label: "REM",   color: "#C084FC", icon: "💭" },
          { key: "light", label: "Light", color: SLEEP_CLR, icon: "💤" },
        ].filter(s => st[s.key] > 0);
        if (!slots.length) return null;
        return (
          <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
            {slots.map(({ key, label, color, icon }) => {
              const mins = st[key];
              const h = Math.floor(mins / 60), m = mins % 60;
              const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
              const pct = dur > 0 ? Math.round(mins / dur * 100) : null;
              return (
                <div key={key} style={{
                  flex: 1, background: color + "12", border: `1px solid ${color}33`,
                  borderRadius: 10, padding: "7px 10px",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>
                    {icon} {label}
                  </div>
                  <div style={{ fontSize: 14, fontFamily: "Fraunces, serif", fontWeight: 700, color, lineHeight: 1 }}>
                    {timeStr}
                  </div>
                  {pct != null && (
                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>{pct}%</div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ══ 4c0. SLEEP SCORE BREAKDOWN — why last night was low + one fix ════ */}
      {tp.sleep !== false && sleepInfo.breakdown?.fix && sleepInfo.lastSleep && new Date().getHours() < 15 && (
        <div className="sprig-pop" style={{ display: "flex", alignItems: "flex-start", gap: 9, background: SLEEP_CLR + "0C", border: `1px solid ${SLEEP_CLR}33`, borderRadius: 14, padding: "10px 13px", marginTop: 8 }}>
          <Moon size={14} color={SLEEP_CLR} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            {sleepInfo.breakdown.mainReason && (
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 3, lineHeight: 1.4 }}>
                Last night: {sleepInfo.breakdown.mainReason}
              </div>
            )}
            <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.45, fontWeight: 600 }}>
              {sleepInfo.breakdown.fix}
            </div>
          </div>
        </div>
      )}

      {/* ══ 4c1. SLEEP DEBT BANNER — daytime nudge when debt is significant ══ */}
      {tp.sleep !== false && (sleepInfo.debtMin || 0) > 60 && new Date().getHours() < 20 && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: SLEEP_CLR + "0D", border: `1px solid ${SLEEP_CLR}33`, borderRadius: 14, padding: "9px 13px", marginTop: 8 }}>
          <Moon size={14} color={SLEEP_CLR} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.4, flex: 1 }}>
            {(sleepInfo.debtMin || 0) > 180
              ? `Carrying ~${Math.round((sleepInfo.debtMin / 60) * 10) / 10}h sleep debt — affects energy, mood and recovery.`
              : `~${Math.round((sleepInfo.debtMin / 60) * 10) / 10}h sleep debt building up — an earlier bedtime tonight will help.`}
          </span>
        </div>
      )}

      {/* ══ 4c1b. BEDTIME WINDOW — afternoon nudge showing target bedtime ════ */}
      {tp.sleep !== false && sleepInfo.rec?.recBed != null && (() => {
        const h = new Date().getHours();
        if (h < 15 || h >= 20) return null;
        const rec = sleepInfo.rec;
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const cafCutMin = ((rec.caffeineCutoff % 1440) + 1440) % 1440;
        const cafInFuture = ((cafCutMin - nowMin + 1440) % 1440) < 720;
        const bedStr = minToTimeStr(rec.recBed);
        const cafStr = minToTimeStr(rec.caffeineCutoff);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: SLEEP_CLR + "0D", border: `1px solid ${SLEEP_CLR}33`, borderRadius: 14, padding: "9px 13px", marginTop: 8 }}>
            <Moon size={14} color={SLEEP_CLR} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.4 }}>
                Target bedtime tonight: <strong style={{ color: SLEEP_CLR }}>{bedStr}</strong>
                {rec.payDown > 0 && ` (inc. ${Math.round(rec.payDown)}min debt paydown)`}
              </span>
              {cafInFuture && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  Last caffeine by {cafStr} for best sleep
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══ 4c1c. ALCOHOL IMPACT — tonight's drinks and sleep/recovery effect ═ */}
      {tp.sleep !== false && (daily?.alcohol || 0) >= 1 && (() => {
        const level = alcoholLevel(daily.alcohol);
        if (level === "none") return null;
        const info = ALCOHOL_LEVELS[level];
        const clr = info.color;
        return (
          <div className="sprig-pop" style={{
            display: "flex", alignItems: "flex-start", gap: 9,
            background: clr + "0E", border: `1px solid ${clr}2A`,
            borderRadius: 14, padding: "9px 13px", marginTop: 8,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.5 }}>🍺</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: clr, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {info.label} drinking tonight
                </span>
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>
                  {daily.alcohol} {daily.alcohol === 1 ? "drink" : "drinks"}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>{info.next}</div>
            </div>
          </div>
        );
      })()}

      {/* ══ 4c2. RECOVERY LIMITERS — why the recovery score is below peak ════ */}
      {recoveryInfo?.limiters?.length > 0 && (recoveryInfo.score ?? 100) < 80 && (
        <div style={{ background: RECOV_CLR + "0E", border: `1px solid ${RECOV_CLR}2A`, borderRadius: 14, padding: "10px 14px", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: RECOV_CLR, textTransform: "uppercase", letterSpacing: 0.4 }}>Affecting recovery</span>
            {recoveryInfo.confidence && (() => {
              const confClr = recoveryInfo.confidence === "High" ? C.greenSoft : recoveryInfo.confidence === "Medium" ? C.amber : C.muted;
              return (
                <span style={{ fontSize: 9, fontWeight: 700, color: confClr, background: confClr + "18", borderRadius: 5, padding: "2px 6px", letterSpacing: 0.3, textTransform: "uppercase" }}>
                  {recoveryInfo.confidence} confidence
                </span>
              );
            })()}
            {recoveryInfo.bestAction && (
              <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: recoveryInfo.score >= 70 ? C.greenSoft : recoveryInfo.score >= 45 ? C.amber : C.coral }}>
                → {recoveryInfo.bestAction}
              </span>
            )}
          </div>
          {recoveryInfo.limiters.map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, ...(i > 0 ? { marginTop: 4 } : {}) }}>
              <span style={{ fontSize: 11, color: RECOV_CLR, flexShrink: 0, lineHeight: 1.45, fontWeight: 700 }}>·</span>
              <span style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>{l}</span>
            </div>
          ))}
        </div>
      )}

      {/* ══ 4c2b. RECOVERY HELPERS — what's going right (shown when score is high) ════ */}
      {recoveryInfo?.helpers?.length > 0 && (recoveryInfo.score ?? 0) >= 80 && (
        <div className="sprig-pop" style={{ background: C.greenSoft + "12", border: `1px solid ${C.greenSoft}2A`, borderRadius: 14, padding: "10px 14px", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.greenSoft, textTransform: "uppercase", letterSpacing: 0.4 }}>What's working</span>
            {recoveryInfo.confidence === "High" && (
              <span style={{ fontSize: 9, fontWeight: 700, color: C.greenSoft, background: C.greenSoft + "18", borderRadius: 5, padding: "2px 6px", letterSpacing: 0.3, textTransform: "uppercase" }}>
                High confidence
              </span>
            )}
            {recoveryInfo.label && (
              <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 700, color: C.greenSoft, background: C.greenSoft + "18", borderRadius: 6, padding: "1px 7px" }}>
                {recoveryInfo.label}
              </span>
            )}
          </div>
          {recoveryInfo.helpers.slice(0, 3).map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, ...(i > 0 ? { marginTop: 4 } : {}) }}>
              <span style={{ fontSize: 11, color: C.greenSoft, flexShrink: 0, lineHeight: 1.45, fontWeight: 700 }}>✓</span>
              <span style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>{h}</span>
            </div>
          ))}
        </div>
      )}

      {/* ══ 4c3. RECOVERY WEEK WARNING — deload nudge ════════════════ */}
      {recoveryInfo?.recoveryWeek && (
        <div className="sprig-pop" style={{ background: C.amber + "10", border: `1px solid ${C.amber}44`, borderRadius: 14, padding: "10px 14px", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>🔄</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.4 }}>Deload week recommended</span>
          </div>
          {recoveryInfo.rwReasons?.length > 0 && (
            <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45, marginBottom: 4 }}>
              {recoveryInfo.rwReasons.join(" · ")}
            </div>
          )}
          {trainInfo?.deload?.reasons?.length > 0 && (
            <div style={{ fontSize: 11, color: C.amber, fontWeight: 600, lineHeight: 1.45, marginBottom: 4, opacity: 0.85 }}>
              {trainInfo.deload.reasons.join(" · ")}
            </div>
          )}
          {trainInfo?.deload?.stalls?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 5, marginTop: 2 }}>
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, alignSelf: "center" }}>Plateauing:</span>
              {trainInfo.deload.stalls.map(name => (
                <span key={name} style={{ fontSize: 10, fontWeight: 700, color: C.amber, background: C.amber + "18", borderRadius: 5, padding: "2px 8px" }}>
                  {name}
                </span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.45 }}>Reduce training volume by 40–50% this week and prioritise sleep and food.</div>
        </div>
      )}

      {/* ══ 4c3c. SOFT DELOAD HINT — progress stall detected, less severe than full deload card ════ */}
      {tp.training !== false && trainInfo?.deload?.suggest && !recoveryInfo?.recoveryWeek && trainInfo.deload.reasons?.length > 0 && (
        <div className="sprig-pop" style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          background: C.amber + "0A", border: `1px solid ${C.amber}2E`,
          borderRadius: 14, padding: "10px 14px", marginTop: 8,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.7 }}>📉</span>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>
              Deload starting to make sense
            </div>
            <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>
              {trainInfo.deload.reasons.join(" · ")}
            </div>
            {trainInfo.deload.stalls?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>
                <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 700 }}>Plateauing:</span>
                {trainInfo.deload.stalls.map(name => (
                  <span key={name} style={{ fontSize: 9.5, fontWeight: 700, color: C.amber, background: C.amber + "18", borderRadius: 5, padding: "2px 7px" }}>
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ 4c3b. RECOVERY RECOMMENDATION — today's intensity guidance ══ */}
      {tp.training !== false && trainInfo?.recoveryRec?.level && trainInfo.recoveryRec.level !== "normal" && !recoveryInfo?.recoveryWeek && (() => {
        const rec = trainInfo.recoveryRec;
        const isRest  = rec.level === "rest";
        const isLight = rec.level === "light";
        const clr   = isRest ? C.coral : isLight ? C.amber : C.greenSoft;
        const icon  = isRest ? "💤" : isLight ? "🌿" : "💪";
        const title = isRest ? "Rest day recommended" : isLight ? "Light training today" : "High intensity — go hard";
        return (
          <div className="sprig-pop" style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: clr + "0E", border: `1px solid ${clr}2A`,
            borderRadius: 14, padding: "10px 14px", marginTop: 8,
          }}>
            <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.6 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: clr, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>
                {title}
              </div>
              <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>
                {rec.text}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ 4c4. ACTIVE RECOVERY SUGGESTION ══════════════════════════ */}
      {recoveryInfo?.suggestActiveRecovery && !recoveryInfo?.recoveryWeek && (
        <div className="sprig-pop" style={{ display: "flex", alignItems: "center", gap: 9, background: RECOV_CLR + "0D", border: `1px solid ${RECOV_CLR}33`, borderRadius: 14, padding: "10px 14px", marginTop: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: RECOV_CLR + "22", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Activity size={14} color={RECOV_CLR} />
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: RECOV_CLR, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>Active recovery day</div>
            <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.4 }}>Skip lifting — a walk or easy mobility session will help you bounce back faster.</div>
          </div>
        </div>
      )}

      {/* ══ 4c5. RECOVERY CHECKLIST — daily recovery to-dos ══════════ */}
      {recoveryInfo?.checklist?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 14, padding: "10px 14px", marginTop: 8, border: `1px solid ${C.line}`, boxShadow: C.shadow }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>Recovery checklist</div>
          {recoveryInfo.checklist.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, ...(i > 0 ? { marginTop: 7 } : {}) }}>
              <div style={{
                width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                background: item.done ? C.green + "22" : C.bg2,
                border: `1.5px solid ${item.done ? C.greenSoft : C.line}`,
                display: "grid", placeItems: "center",
              }}>
                {item.done && <Check size={10} color={C.greenSoft} strokeWidth={2.5} />}
              </div>
              <span style={{ fontSize: 12, color: item.done ? C.muted : C.inkSoft, lineHeight: 1.4, textDecoration: item.done ? "line-through" : "none" }}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ══ 4c5b. MUSCLE FATIGUE STATUS ═════════════════════════════ */}
      {recoveryInfo?.muscleStatus && (() => {
        const tired = MUSCLES
          .map(([k]) => ({ k, ...recoveryInfo.muscleStatus[k] }))
          .filter(m => !m.trackingOff && m.fatigue >= 25)
          .sort((a, b) => b.fatigue - a.fatigue)
          .slice(0, 6);
        if (!tired.length) return null;
        return (
          <div style={{ marginTop: 8, display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
            {tired.map(m => {
              const remainH = trainInfo?.recovery?.[m.k]?.remaining || 0;
              const readyIn = remainH > 0 && remainH < 72 ? `~${Math.round(remainH)}h` : null;
              // sourceLabel: "from football", "workout + sport", "Quick Log" — never shown before
              const src = m.sourceLabel
                ? m.sourceLabel
                : m.quickLogged ? "Quick Log" : null;
              const srcIcon = m.sportSource && !m.sportStacked ? "⚽" : m.sportStacked ? "🏋️⚽" : m.quickLogged ? "⚡" : null;
              return (
                <div key={m.k} style={{
                  flex: "0 0 auto", background: m.color + "14",
                  border: `1px solid ${m.color}33`, borderRadius: 9, padding: "4px 10px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: m.color, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: m.color, opacity: 0.65, marginLeft: "auto" }}>
                      {m.fatigue}%
                    </div>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: m.color, marginTop: 1 }}>
                    {m.status}
                  </div>
                  {src && (
                    <div style={{ fontSize: 8, color: C.muted, marginTop: 2, fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>
                      {srcIcon && <span>{srcIcon}</span>}
                      <span style={{ textTransform: "capitalize" }}>{src}</span>
                    </div>
                  )}
                  {readyIn && (
                    <div style={{ fontSize: 8.5, color: C.muted, marginTop: src ? 1 : 1, fontWeight: 600 }}>
                      ready in {readyIn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ══ 4c6. TRAINING GUIDE — how to approach today's workout ════ */}
      {tp.training !== false && (recoveryInfo?.trainingAdj || recoveryInfo?.loadLevel) && (
        <div className="sprig-pop" style={{ display: "flex", alignItems: "flex-start", gap: 9, background: C.card, border: `1px solid ${RECOV_CLR}22`, borderRadius: 14, padding: "10px 14px", marginTop: 8, boxShadow: C.shadow }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: RECOV_CLR + "18", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
            <Dumbbell size={13} color={RECOV_CLR} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: RECOV_CLR, textTransform: "uppercase", letterSpacing: 0.4 }}>Training guide</div>
              {recoveryInfo?.loadLevel && (() => {
                const ll = recoveryInfo.loadLevel;
                const llClr = ll === "Excessive load" ? C.coral : ll === "High load" ? C.amber : ll === "Balanced load" ? C.greenSoft : RECOV_CLR;
                return (
                  <span style={{ marginLeft: "auto", fontSize: 9.5, fontWeight: 700, color: llClr, background: llClr + "1A", borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap" }}>
                    {ll}
                  </span>
                );
              })()}
            </div>
            {recoveryInfo?.trainingAdj && (
              <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.45 }}>{recoveryInfo.trainingAdj}</div>
            )}
          </div>
        </div>
      )}

      {/* ══ 4c6c. TRAINING READINESS — sleep + body readiness scores ════ */}
      {tp.training !== false && trainInfo?.sleepReadiness != null && trainInfo?.bodyReadiness != null && (trainInfo.sleepReadiness < 65 || trainInfo.bodyReadiness < 65) && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[
            { label: "Sleep readiness", val: trainInfo.sleepReadiness },
            { label: "Body readiness",  val: trainInfo.bodyReadiness },
          ].map(r => {
            const clr = r.val >= 70 ? C.greenSoft : r.val >= 50 ? C.amber : C.coral;
            return (
              <div key={r.label} style={{ flex: 1, background: clr + "10", border: `1px solid ${clr}28`, borderRadius: 10, padding: "7px 10px" }}>
                <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>
                  {r.label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                  <span style={{ fontSize: 15, fontFamily: "Fraunces, serif", fontWeight: 700, color: clr, lineHeight: 1 }}>{r.val}</span>
                  <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 500 }}>/100</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ 4c6d. FRESH MUSCLES — ready to hit hard today ══════════════ */}
      {tp.training !== false && !dtTrainSrc && trainInfo?.freshMuscles?.length > 0 && trainInfo?.recovery && (() => {
        // sort freshest (lowest fatigue) first, cap at 5
        const sorted = [...trainInfo.freshMuscles]
          .map(name => {
            const key = MUSCLES.find(([, n]) => n === name)?.[0] || "";
            const fatigue = key ? (trainInfo.recovery[key]?.fatigue ?? 0) : 0;
            return { name, fatigue };
          })
          .sort((a, b) => a.fatigue - b.fatigue)
          .slice(0, 5);
        if (!sorted.length) return null;
        return (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9.5, fontWeight: 800, color: C.greenSoft, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0 }}>
              🎯 Fresh today:
            </span>
            {sorted.map(({ name, fatigue }) => (
              <button key={name} className="sprig-tap"
                onClick={() => { onGoTrain?.(); buzz("tap"); }}
                style={{
                  background: C.greenSoft + "14", border: `1px solid ${C.greenSoft}33`,
                  borderRadius: 8, padding: "3px 9px",
                  fontSize: 10.5, fontWeight: 700, color: C.greenSoft,
                  cursor: "pointer", fontFamily: "DM Sans",
                }}>
                {name}{fatigue > 0 ? ` · ${fatigue}%` : ""}
              </button>
            ))}
          </div>
        );
      })()}

      {/* ══ 4c6b. PAIN ALERT — active pain + training modifications ════ */}
      {tp.training !== false && trainInfo?.pain?.level && trainInfo.pain.level !== "none" && trainInfo.pain.coach?.lines?.length > 0 && (() => {
        const { level, coach } = trainInfo.pain;
        const painClr = level === "serious" ? C.coral : C.amber;
        return (
          <div className="sprig-pop" style={{ background: painClr + "0E", border: `1px solid ${painClr}44`, borderRadius: 14, padding: "10px 14px", marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{level === "serious" ? "🚨" : "⚠️"}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: painClr, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {level === "serious" ? "Serious pain — rest today" : level === "moderate" ? "Moderate pain — modify" : "Mild pain — train with care"}
              </span>
              {trainInfo.pain.locations?.length > 0 && (
                <span style={{ marginLeft: "auto", fontSize: 10, color: painClr, fontWeight: 700, background: painClr + "18", borderRadius: 5, padding: "2px 7px", textTransform: "capitalize" }}>
                  {trainInfo.pain.locations.slice(0, 2).join(", ")}
                </span>
              )}
            </div>
            {coach.lines.slice(0, 3).map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginTop: i > 0 ? 4 : 0 }}>
                <span style={{ fontSize: 11, color: painClr, fontWeight: 800, flexShrink: 0, lineHeight: 1.6 }}>·</span>
                <span style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>{line}</span>
              </div>
            ))}
            {coach.avoidGroups?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, alignItems: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: painClr, textTransform: "uppercase", letterSpacing: 0.3, flexShrink: 0 }}>Avoid:</span>
                {coach.avoidGroups.map(g => {
                  const label = MUSCLES.find(([k]) => k === g)?.[1] || g;
                  return (
                    <span key={g} style={{
                      fontSize: 10, fontWeight: 700, color: painClr,
                      background: painClr + "18", border: `1px solid ${painClr}30`,
                      borderRadius: 5, padding: "2px 8px",
                    }}>{label}</span>
                  );
                })}
              </div>
            )}
            {coach.seekHelp && (
              <button className="sprig-tap" onClick={() => { onGoHealth?.(); buzz("tap"); }}
                style={{
                  marginTop: 10, width: "100%",
                  display: "flex", alignItems: "center", gap: 8,
                  background: painClr + "18", border: `1px solid ${painClr}44`,
                  borderRadius: 10, padding: "9px 12px", cursor: "pointer",
                  fontFamily: "DM Sans", textAlign: "left",
                }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>🏥</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: painClr, flex: 1 }}>
                  See a doctor or physiotherapist
                </span>
                <ChevronRight size={13} color={painClr} style={{ flexShrink: 0 }} />
              </button>
            )}
          </div>
        );
      })()}

      {/* ══ 4c6c. SPORT SESSION SUMMARY — what you did today (sport source, no gym) ════ */}
      {tp.training !== false && dt?.training?.source === "sport" && dt?.training?.sportSessions?.length > 0 && (() => {
        const sessions = dt.training.sportSessions;
        const totalKcal = sessions.reduce((sum, s) => sum + (s.estimatedCalories || 0), 0);
        const totalMin  = sessions.reduce((sum, s) => sum + (s.durationMin || 0), 0);
        const SPORT_SESS_CLR = "#6C8EF5";  // indigo-blue for sport activity

        function sportEmoji(name = "") {
          const n = name.toLowerCase();
          if (n.includes("football") || n.includes("soccer")) return "⚽";
          if (n.includes("fight") || n.includes("box") || n.includes("mma") || n.includes("kick") || n.includes("muay")) return "🥊";
          if (n.includes("run") || n.includes("jog")) return "🏃";
          if (n.includes("cycl") || n.includes("bike")) return "🚴";
          if (n.includes("swim")) return "🏊";
          if (n.includes("basket")) return "🏀";
          if (n.includes("tennis")) return "🎾";
          if (n.includes("volley")) return "🏐";
          if (n.includes("gym") || n.includes("lift") || n.includes("weight")) return "🏋️";
          if (n.includes("yoga") || n.includes("stretch")) return "🧘";
          if (n.includes("hike") || n.includes("walk")) return "🥾";
          return "🎯";
        }

        function intensityStyle(intensity = "") {
          const iv = intensity.toLowerCase();
          if (iv === "hard" || iv === "high") return { clr: C.coral,     label: "Hard" };
          if (iv === "moderate" || iv === "medium") return { clr: C.amber, label: "Moderate" };
          return { clr: C.greenSoft, label: "Easy" };
        }

        return (
          <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, border: `1px solid ${SPORT_SESS_CLR}28`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: SPORT_SESS_CLR + "1A", display: "grid", placeItems: "center", fontSize: 15, flexShrink: 0 }}>
                  🏅
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: SPORT_SESS_CLR, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Sport activity
                  </div>
                  <div style={{ fontSize: 9.5, color: C.muted, marginTop: 0.5 }}>
                    {sessions.length === 1 ? "1 session today" : `${sessions.length} sessions today`}
                  </div>
                </div>
              </div>
              {totalMin > 0 && (
                <div style={{ fontSize: 11, fontWeight: 700, color: SPORT_SESS_CLR, background: SPORT_SESS_CLR + "14", borderRadius: 8, padding: "3px 9px" }}>
                  {totalMin >= 60 ? `${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? ` ${totalMin % 60}m` : ""}` : `${totalMin}m`}
                </div>
              )}
            </div>

            {/* Session rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {sessions.map((sess, i) => {
                const ist = intensityStyle(sess.intensity);
                const emoji = sportEmoji(sess.sportName);
                const dur = sess.durationMin || 0;
                const kcal = sess.estimatedCalories || 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg2 || "#F7F7FA", borderRadius: 10, padding: "7px 10px" }}>
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.2, textTransform: "capitalize" }}>
                        {sess.sportName || "Activity"}
                      </div>
                      {dur > 0 && (
                        <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1.5 }}>
                          {dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ""}` : `${dur} min`}
                          {kcal > 0 ? ` · ~${kcal} kcal` : ""}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontSize: 9.5, fontWeight: 800, color: ist.clr,
                      background: ist.clr + "18", border: `1px solid ${ist.clr}30`,
                      borderRadius: 6, padding: "2px 7px", letterSpacing: 0.2, flexShrink: 0,
                    }}>
                      {ist.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals footer — only when multiple sessions or have kcal data */}
            {(totalKcal > 0 || sessions.length > 1) && (
              <div style={{ marginTop: 9, paddingTop: 8, borderTop: `1px solid ${C.line}`, display: "flex", gap: 8 }}>
                {totalKcal > 0 && (
                  <div style={{ flex: 1, background: C.coral + "0D", borderRadius: 9, padding: "5px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: C.coral, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 }}>Kcal burned</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: C.coral, fontFamily: "Fraunces, serif" }}>~{totalKcal}</div>
                  </div>
                )}
                {dt.training.sportLoad && (
                  <div style={{ flex: 1, background: SPORT_SESS_CLR + "0D", borderRadius: 9, padding: "5px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: SPORT_SESS_CLR, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 }}>Load</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: SPORT_SESS_CLR, fontFamily: "Fraunces, serif", textTransform: "capitalize" }}>{dt.training.sportLoad}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ 4c7. SPORT COACHING — context-specific coaching for football/fight/running ════ */}
      {tp.training !== false && trainInfo?.sportAdvice?.length > 0 && (() => {
        const SPORT_CLR = C.coral;
        const sport = profile?.sport || profile?.focus || "";
        const sportIcon = sport === "football" ? "⚽" : sport === "fight" ? "🥊" : sport === "running" ? "🏃" : "🎯";
        const sportLabel = sport === "football" ? "Football" : sport === "fight" ? "Combat sports" : sport === "running" ? "Running" : "Sport";
        return (
          <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, border: `1px solid ${SPORT_CLR}28`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: trainInfo.sportAdvice.length > 1 ? 8 : 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: SPORT_CLR + "1A", display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>
                {sportIcon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{sportLabel} coach</div>
                {trainInfo.sportAdvice.length === 1 && (
                  <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.45, marginTop: 1 }}>{trainInfo.sportAdvice[0]}</div>
                )}
              </div>
            </div>
            {trainInfo.sportAdvice.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {trainInfo.sportAdvice.map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 11, color: SPORT_CLR, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>→</span>
                    <span style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.45 }}>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ 4d0. WORKOUT CALORIE BOOST — strength training added to target ══ */}
      {tp.nutrition !== false && tp.training !== false && moveInfo?.workoutAdj?.kcal > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: C.greenSoft + "0D", border: `1px solid ${C.greenSoft}2A`,
          borderRadius: 12, padding: "7px 13px", marginTop: 8,
        }}>
          <Dumbbell size={12} color={C.greenSoft} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11.5, color: C.inkSoft, flex: 1, lineHeight: 1.4 }}>
            Workout added{" "}
            <strong style={{ color: C.greenSoft }}>+{moveInfo.workoutAdj.kcal} kcal</strong>{" "}
            to your target
            {moveInfo.workoutAdj.totalMin > 0 && (
              <span style={{ color: C.muted }}>{" "}· {moveInfo.workoutAdj.totalMin}min · {moveInfo.workoutAdj.intensity} intensity</span>
            )}
          </span>
        </div>
      )}

      {/* ══ 4d. CALORIE TREND — weight-rate vs goal nudge ════════════ */}
      {tp.nutrition !== false && moveInfo?.calorieTrend && (() => {
        const ct = moveInfo.calorieTrend;
        if (ct.onTrack) return (
          <div className="sprig-pop" style={{ display: "flex", alignItems: "center", gap: 9, background: C.card, borderRadius: 14, padding: "10px 14px", border: `1px solid ${C.green}33`, marginTop: 8, boxShadow: C.shadow }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.green + "18", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <TrendingUp size={14} color={C.greenSoft} />
            </div>
            <span style={{ fontSize: 12.5, color: C.inkSoft, flex: 1, lineHeight: 1.4 }}>{ct.message}</span>
          </div>
        );
        return (
          <div className="sprig-pop" style={{ background: C.card, borderRadius: 14, padding: "12px 14px", border: `1px solid ${C.amber}33`, marginTop: 8, boxShadow: C.shadow }}>
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.2 }}>⚖️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>Weight trend</div>
                <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.45 }}>{ct.rationale}</div>
                {ct.suggestedTarget > 0 && (
                  <div style={{ fontSize: 12, color: C.ink, fontWeight: 700, marginTop: 6, background: C.bg2, borderRadius: 8, padding: "5px 9px", display: "inline-block" }}>
                    Try {ct.suggestedTarget} kcal/day <span style={{ color: ct.suggestedDelta > 0 ? C.greenSoft : C.coral, fontWeight: 700 }}>({ct.suggestedDelta > 0 ? "+" : ""}{ct.suggestedDelta} kcal)</span>
                  </div>
                )}
                {(ct.avgCal != null || ct.days != null) && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 7, lineHeight: 1.4 }}>
                    Based on {ct.days} days{ct.avgCal != null ? ` · avg ${ct.avgCal} kcal/day` : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ 4d2. NUTRITION COACH — calorie/protein vs goal + diet quality ══ */}
      {tp.nutrition !== false && t.calories > 100 && nutriInfo?.coach?.lines?.length > 0 && (() => {
        const warns = nutriInfo.coach.lines.filter(l => l.tone === "warn");
        const goods = nutriInfo.coach.lines.filter(l => l.tone === "good");
        const allLines = [...warns, ...goods].slice(0, 3);
        if (!allLines.length) return null;
        const hasWarn = warns.length > 0;
        const accentClr = hasWarn ? NUTR_CLR : C.greenSoft;
        const dq = nutriInfo.dietQ;
        const dqScore = (!dq?.noData && dq?.score != null) ? dq.score : null;
        const dqClr = dqScore == null ? null : dqScore >= 70 ? C.greenSoft : dqScore >= 50 ? C.amber : C.coral;
        return (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 9, background: C.card, border: `1px solid ${accentClr}33`, borderRadius: 14, padding: "10px 14px", marginTop: 8, boxShadow: C.shadow }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: accentClr + "18", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Flame size={12} color={accentClr} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: accentClr, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {hasWarn ? "Nutrition check" : "Nutrition on track"}
                </div>
                {dqScore != null && (
                  <span style={{
                    marginLeft: "auto", fontSize: 9.5, fontWeight: 800, color: dqClr,
                    background: dqClr + "18", borderRadius: 5, padding: "2px 7px", flexShrink: 0,
                  }}>
                    Quality {dqScore}
                  </span>
                )}
              </div>
              {allLines.map((line, i) => (
                <div key={i} style={{ fontSize: 12, color: line.tone === "warn" ? NUTR_CLR : C.inkSoft, lineHeight: 1.45, marginTop: i > 0 ? 3 : 0 }}>
                  {allLines.length > 1 && <span style={{ fontWeight: 700 }}>{line.tone === "warn" ? "⚠ " : "✓ "}</span>}
                  {line.text}
                </div>
              ))}
              {dq?.whyText && !dq.noData && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{dq.whyText}</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ══ 4d2b. NUTRITION FUNCTIONS — 7 body domains powered by today's food ══ */}
      {tp.nutrition !== false && t.calories > 100 && scores?.some(s => s.score > 0) && (() => {
        const sorted = [...scores].sort((a, b) => b.score - a.score);
        const top = sorted[0];
        const gap = sorted[sorted.length - 1];
        return (
          <div className="sprig-pop" style={{ background: C.card, borderRadius: 16, border: `1px solid ${NUTR_CLR}22`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: NUTR_CLR, textTransform: "uppercase", letterSpacing: 0.5 }}>Body functions</div>
              <span style={{ fontSize: 9.5, color: C.muted }}>powered by today's food</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {scores.map(s => {
                const clr = s.score >= 70 ? C.greenSoft : s.score >= 40 ? C.amber : C.coral;
                return (
                  <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{s.emoji}</span>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: C.inkSoft, width: 90, flexShrink: 0 }}>{s.label}</div>
                    <div style={{ flex: 1, height: 5, background: C.line, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${s.score}%`, height: "100%", background: clr, borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: clr, width: 28, textAlign: "right", flexShrink: 0 }}>{s.score}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.line}`, display: "flex", gap: 8 }}>
              <div style={{ flex: 1, background: C.greenSoft + "10", borderRadius: 10, padding: "6px 10px" }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: C.greenSoft, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>Top fuel</div>
                <div style={{ fontSize: 11, color: C.inkSoft }}>{top.emoji} {top.label} · {top.score}</div>
              </div>
              <div style={{ flex: 1, background: C.coral + "10", borderRadius: 10, padding: "6px 10px" }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: C.coral, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>Needs fuel</div>
                <div style={{ fontSize: 11, color: C.inkSoft }}>{gap.emoji} {gap.label} · {gap.score}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ 4d3. MISSING NUTRIENTS — lowest tracked nutrients today ════════ */}
      {tp.nutrition !== false && t.calories > 100 && nutriInfo?.missing?.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>Low today</span>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {nutriInfo.missing.map(n => {
              const clr = n.pct < 40 ? C.coral : C.amber;
              // show first 3 food sources truncated
              const foods = n.food ? n.food.split(",").slice(0, 3).map(f => f.trim()).join(", ") : null;
              return (
                <div key={n.key} style={{ flex: "0 0 auto", background: clr + "10", border: `1px solid ${clr}33`, borderRadius: 10, padding: "6px 10px", minWidth: 90 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: foods ? 2 : 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: clr }}>{n.label}</span>
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{n.pct}%</span>
                  </div>
                  {foods && (
                    <div style={{ fontSize: 9.5, color: C.muted, lineHeight: 1.3 }}>try: {foods}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ 4d3b. MEAL QUALITY — per-food nutritional density scores ════ */}
      {tp.nutrition !== false && entries?.length > 0 && t.calories > 80 && (() => {
        const scored = entries
          .filter(e => (e.calories || 0) > 10)
          .map(e => {
            const s = mealScore(e, targets);
            if (!s) return null;
            return { name: e.name || e.label || "Food", score: s.score, note: s.note, calories: (e.calories || 0) * (e.mult || 1) };
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score);   // best first so user sees wins on top
        if (scored.length < 2) return null;      // need at least 2 to be informative

        const avgScore = Math.round(scored.reduce((s, e) => s + e.score, 0) / scored.length);
        const avgClr   = avgScore >= 65 ? C.greenSoft : avgScore >= 40 ? C.amber : C.coral;
        const show     = scored.slice(0, 5);     // max 5 entries

        return (
          <div className="sprig-pop" style={{ background: C.card, borderRadius: 16, border: `1px solid ${NUTR_CLR}22`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>🥗</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: NUTR_CLR, textTransform: "uppercase", letterSpacing: 0.5 }}>Food quality</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 9.5, color: C.muted }}>avg</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: avgClr, fontFamily: "Fraunces, serif" }}>{avgScore}</span>
              </div>
            </div>

            {/* Entry rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {show.map((item, i) => {
                const clr = item.score >= 65 ? C.greenSoft : item.score >= 40 ? C.amber : C.coral;
                const nameShort = item.name.length > 22 ? item.name.slice(0, 21) + "…" : item.name;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Score bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.ink, lineHeight: 1.2, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {nameShort}
                        </span>
                        <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>{Math.round(item.calories)} kcal</span>
                      </div>
                      <div style={{ height: 4, background: C.line, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${item.score}%`, height: "100%", background: clr, borderRadius: 2, transition: "width 0.5s ease" }} />
                      </div>
                      {item.note && (
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 1.3 }}>{item.note}</div>
                      )}
                    </div>
                    {/* Score badge */}
                    <div style={{
                      minWidth: 32, height: 32, borderRadius: 9,
                      background: clr + "18", border: `1px solid ${clr}33`,
                      display: "grid", placeItems: "center", flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: clr, fontFamily: "Fraunces, serif" }}>{item.score}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {scored.length > 5 && (
              <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 8 }}>
                + {scored.length - 5} more items
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ 4e. PROGRESS BOTTLENECK — why you're not progressing ════════ */}
      {moveInfo?.diagnosis?.enough && moveInfo.diagnosis.bottleneck && (
        <div className="sprig-pop" style={{ background: C.card, border: `1px solid ${C.amber}33`, borderRadius: 16, padding: "12px 14px", marginTop: 8, boxShadow: C.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: C.amber + "18", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Zap size={12} color={C.amber} />
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.5 }}>Main bottleneck</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 5, lineHeight: 1.3 }}>{moveInfo.diagnosis.bottleneck.title}</div>
          <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 6 }}>{moveInfo.diagnosis.bottleneck.detail}</div>
          <div style={{ background: C.amber + "10", border: `1px solid ${C.amber}33`, borderRadius: 10, padding: "7px 11px" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.amber }}>Fix: </span>
            <span style={{ fontSize: 11.5, color: C.inkSoft }}>{moveInfo.diagnosis.bottleneck.fix}</span>
          </div>
          {moveInfo.diagnosis.good?.length > 0 && (
            <div style={{ fontSize: 11, color: C.greenSoft, marginTop: 7, fontWeight: 600 }}>
              ✓ {moveInfo.diagnosis.good.join(" · ")}
            </div>
          )}
          {/* ── Secondary bottlenecks ── */}
          {moveInfo.diagnosis.others?.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 7, borderTop: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Also look at</div>
              {moveInfo.diagnosis.others.map((o, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: i > 0 ? 5 : 0 }}>
                  <span style={{ fontSize: 11, color: C.amber, fontWeight: 800, flexShrink: 0, lineHeight: 1.6 }}>·</span>
                  <div style={{ lineHeight: 1.45 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>{o.title}</span>
                    <span style={{ fontSize: 11, color: C.inkSoft }}> — {o.fix}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ 4e2. PROGRESS ON TRACK — no bottleneck found, positive summary ═══ */}
      {moveInfo?.diagnosis?.enough && !moveInfo.diagnosis.bottleneck && moveInfo.diagnosis.summary && (
        <div className="sprig-pop" style={{ background: C.greenSoft + "0D", border: `1px solid ${C.greenSoft}2A`, borderRadius: 16, padding: "10px 14px", marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: moveInfo.diagnosis.good?.length ? 4 : 0 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>✅</span>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.greenSoft, textTransform: "uppercase", letterSpacing: 0.4 }}>Progress on track</div>
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>{moveInfo.diagnosis.summary}</div>
          {moveInfo.diagnosis.good?.length > 0 && (
            <div style={{ fontSize: 11, color: C.greenSoft, marginTop: 5, fontWeight: 600 }}>
              ✓ {moveInfo.diagnosis.good.join(" · ")}
            </div>
          )}
        </div>
      )}

      {/* ══ 4f. HEALTH RADAR — elevated / high risk categories ════════ */}
      {healthInfo?.radar?.length > 0 && (() => {
        const alerts = healthInfo.radar.filter(c => c.tag === "elevated" || c.tag === "high");
        if (!alerts.length) return null;
        return (
          <div style={{ marginTop: 8, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}
            onClick={() => { onGoHealth?.(); buzz("tap"); }}>
            {alerts.map(cat => {
              const rt = RISK_TAG[cat.tag] || RISK_TAG.moderate;
              return (
                <div key={cat.key} style={{
                  flex: "0 0 auto", background: rt.color + "12",
                  border: `1px solid ${rt.color}33`, borderRadius: 10, padding: "6px 11px",
                  cursor: onGoHealth ? "pointer" : "default",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: rt.color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                    {rt.label}
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: rt.color }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: 10, color: C.inkSoft, marginTop: 2, maxWidth: 130, lineHeight: 1.35 }}>
                    {cat.text}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ══ 4g. VITALS STRIP — BP + RHR + out-of-range blood markers ═══ */}
      {healthInfo?.latest && (() => {
        const { bpSys, bpDia, rhr, blood = {} } = healthInfo.latest;
        const chips = [];
        if (bpSys?.value != null && bpDia?.value != null) {
          const sys = bpSys.value, dia = bpDia.value;
          const bpClr = sys < 120 && dia < 80 ? C.greenSoft : sys < 130 && dia < 80 ? C.amber : C.coral;
          chips.push({ label: "Blood pressure", val: `${sys}/${dia}`, unit: "mmHg", clr: bpClr });
        }
        if (rhr?.value != null) {
          const r = rhr.value;
          const rhrClr = r < 60 ? C.greenSoft : r <= 90 ? C.inkSoft : C.coral;
          chips.push({ label: "Resting HR", val: String(r), unit: "bpm", clr: rhrClr });
        }
        // out-of-range blood markers (flagged only, max 3 to keep strip compact)
        const bloodChips = [];
        for (const m of BLOOD_MARKERS) {
          if (!blood[m.key]?.value) continue;
          const v = blood[m.key].value;
          const [lo, hi] = m.ok;
          const isLow  = lo != null && v < lo;
          const isHigh = hi != null && v > hi;
          if (!isLow && !isHigh) continue;
          const bad = (isLow && m.better === "high") || (isHigh && m.better === "low");
          const clr = bad ? C.coral : C.amber;
          bloodChips.push({ label: m.label, val: String(v), unit: m.unit, clr, badge: isLow ? "↓" : "↑" });
        }
        bloodChips.slice(0, 3).forEach(c => chips.push(c));
        if (!chips.length) return null;
        return (
          <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto", paddingBottom: 2 }}
            onClick={() => { onGoHealth?.(); buzz("tap"); }}>
            {chips.map(c => (
              <div key={c.label} style={{
                flex: "0 0 auto", background: c.clr + "12",
                border: `1px solid ${c.clr}2A`, borderRadius: 10, padding: "7px 12px",
                cursor: onGoHealth ? "pointer" : "default",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.3 }}>
                    {c.label}
                  </span>
                  {c.badge && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: c.clr }}>{c.badge}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                  <span style={{ fontSize: 15, fontFamily: "Fraunces, serif", fontWeight: 700, color: c.clr }}>{c.val}</span>
                  <span style={{ fontSize: 10, color: C.muted }}>{c.unit}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ══ 4e. WEEKLY MUSCLE COVERAGE ═══════════════════════════════════ */}
      {tp.training !== false && trainInfo?.volume && (() => {
        const MUSCLE_LABEL = Object.fromEntries(MUSCLES);
        const MAJOR = ["chest", "back", "shoulders", "quads", "hamstrings", "glutes", "biceps", "triceps"];
        const MINOR = ["abs", "traps", "forearms", "calves", "lower_back"];
        const vol = trainInfo.volume;
        const totalSets = MAJOR.reduce((s, k) => s + (vol[k] || 0), 0);
        if (totalSets === 0) return null;
        const items = MAJOR
          .map(k => ({ key: k, label: MUSCLE_LABEL[k] || k, sets: vol[k] || 0 }))
          .sort((a, b) => b.sets - a.sets);
        const neglected = items.filter(m => m.sets === 0);
        const VOL_BADGE = { none: "—", low: "↓ low", under: "↓", good: "✓", high: "↑ high", over: "↑↑ too much" };
        const minorItems = MINOR
          .map(k => ({ key: k, label: MUSCLE_LABEL[k] || k.replace("_", " "), sets: vol[k] || 0 }))
          .filter(m => m.sets > 0)
          .sort((a, b) => b.sets - a.sets);
        return (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2, alignItems: "center" }}>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0 }}>
                Weekly sets
              </span>
              {items.map(m => {
                const vs = volumeStatus(m.sets, m.key);
                const clr = VOL_TAG_COLOR(vs.tag);
                return (
                  <div key={m.key} style={{
                    flex: "0 0 auto", background: clr + "14",
                    border: `1px solid ${clr}33`, borderRadius: 8, padding: "3px 9px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: clr, lineHeight: 1.15 }}>
                      {m.sets > 0 ? m.sets : "—"}
                    </div>
                    <div style={{ fontSize: 8.5, color: C.muted, fontWeight: 600, marginTop: 1 }}>
                      {m.label}
                    </div>
                    {vs.tag !== "none" && (
                      <div style={{ fontSize: 7.5, color: clr, fontWeight: 700, marginTop: 1, opacity: 0.8 }}>
                        {VOL_BADGE[vs.tag]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {minorItems.length > 0 && (
              <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2, marginTop: 5, alignItems: "center" }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0, opacity: 0.6 }}>
                  Accessory
                </span>
                {minorItems.map(m => (
                  <div key={m.key} style={{
                    flex: "0 0 auto", background: C.muted + "10",
                    border: `1px solid ${C.muted}28`, borderRadius: 8, padding: "3px 9px", textAlign: "center", opacity: 0.85,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.inkSoft, lineHeight: 1.15 }}>
                      {m.sets}
                    </div>
                    <div style={{ fontSize: 8.5, color: C.muted, fontWeight: 600, marginTop: 1 }}>
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {neglected.length >= 2 && (
              <div style={{ fontSize: 10.5, color: C.amber, marginTop: 4, lineHeight: 1.4 }}>
                ⚡ Not hit this week: {neglected.map(m => m.label).join(" · ")}
              </div>
            )}
            {(() => {
              const over = items.filter(m => volumeStatus(m.sets, m.key).tag === "over");
              if (!over.length) return null;
              return (
                <div style={{ fontSize: 10.5, color: C.coral, marginTop: 3, lineHeight: 1.4 }}>
                  ⚠ Too many sets: {over.map(m => m.label).join(" · ")} — trim junk volume
                </div>
              );
            })()}
            {trainInfo.readyMuscles?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: C.greenSoft, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0 }}>
                  Ready now:
                </span>
                {trainInfo.readyMuscles.map(name => (
                  <span key={name} style={{
                    fontSize: 10, fontWeight: 700, color: C.greenSoft,
                    background: C.greenSoft + "18", border: `1px solid ${C.greenSoft}30`,
                    borderRadius: 5, padding: "2px 8px",
                  }}>
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ 4a. TONIGHT PLAN CARD (evening, 20:00+) ════════════════════ */}
      {tp.sleep !== false && moveInfo?.tonight && (() => {
        const h = new Date().getHours();
        if (h < 20) return null;
        return <TonightPlanCard plan={moveInfo.tonight} />;
      })()}

      {/* ══ 4ab. NEXT WORKOUT SUGGESTION (no workout today) ════════════ */}
      {tp.training !== false && !dtTrainSrc && trainInfo?.suggestion?.type !== "rest" && (moveInfo?.nextWorkout || trainInfo?.suggestion?.label) && (
        <NextWorkoutCard
          suggestion={moveInfo?.nextWorkout || null}
          splitLabel={trainInfo?.suggestion?.label || null}
          splitReason={trainInfo?.suggestion?.reason || null}
          onStart={() => { onStartWorkout?.(); buzz("tap"); }}
        />
      )}

      {/* ══ 4ab2. BEST GYM WINDOW — optimal workout time today ════════ */}
      {tp.training !== false && !dtTrainSrc && sleepInfo?.gym && (() => {
        const gym = sleepInfo.gym;
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const endMin = ((gym.end % 1440) + 1440) % 1440;
        if (nowMin >= endMin) return null;
        const startStr = minToTimeStr(gym.start);
        const endStr   = minToTimeStr(gym.end);
        const quality  = gym.avg >= 75 ? "Peak energy" : gym.avg >= 55 ? "Good window" : "Best available";
        const qualityClr = gym.avg >= 75 ? C.greenSoft : gym.avg >= 55 ? C.amber : C.muted;
        return (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: C.greenSoft + "0D", border: `1px solid ${C.greenSoft}2A`,
            borderRadius: 14, padding: "9px 14px", marginTop: 8,
          }}>
            <Zap size={14} color={C.greenSoft} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: qualityClr, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 1 }}>
                {quality} to train
              </div>
              <div style={{ fontSize: 12, color: C.inkSoft }}>
                <strong style={{ color: C.ink }}>{startStr} – {endStr}</strong> · energy score {gym.avg}
              </div>
            </div>
          </div>
        );
      })()}

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
          {/* Smart hydration note — context-aware (e.g. "You trained today — aim for 400ml more") */}
          {moveInfo?.hydration?.note && waterMl > 0 && waterMl < waterGoal && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.4 }}>
              {moveInfo.hydration.note}
            </div>
          )}
          {/* Electrolytes warning — shown when sweat loss is high */}
          {nutriInfo?.needsElectrolytes && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 12, lineHeight: 1 }}>⚡</span>
              <span style={{ fontSize: 11.5, color: C.amber, lineHeight: 1.4 }}>Add electrolytes — you've sweated a lot today.</span>
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
              <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0 6px" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                  {steps > 0
                    ? `${steps.toLocaleString()} / ${sGoal.toLocaleString()}`
                    : `0 / ${sGoal.toLocaleString()}`}
                </span>
                {steps > 0 && moveInfo?.movement?.kcal > 0 && (
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>~{moveInfo.movement.kcal} kcal</span>
                )}
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
          {/* Movement note — contextual step motivation */}
          {moveInfo?.movement?.note && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 9, lineHeight: 1.4 }}>
              {moveInfo.movement.note}
            </div>
          )}
          {/* Calorie adjustment note — shown when walking/cardio meaningfully shifts calorie target */}
          {tp.nutrition !== false && t.calories > 0 && moveInfo?.calAdjust?.stepDelta > 100 && moveInfo.calAdjust.text && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 7, background: C.greenSoft + "0C", borderRadius: 9, padding: "6px 9px" }}>
              <TrendingUp size={11} color={C.greenSoft} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 11, color: C.inkSoft, lineHeight: 1.4 }}>{moveInfo.calAdjust.text}</span>
            </div>
          )}
          {/* Sedentary note — appears when sitting time is logged */}
          {moveInfo?.sedentary && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 9, borderTop: `1px solid ${C.line}`, paddingTop: 9 }}>
              <span style={{ fontSize: 13, lineHeight: 1, flexShrink: 0 }}>🪑</span>
              <span style={{ fontSize: 11.5, color: moveInfo.sedentary.color, lineHeight: 1.4 }}>{moveInfo.sedentary.text}</span>
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

      {/* ══ 6.3. WEIGHT TREND INSIGHT — only when enough data exists ════ */}
      {tp.body !== false && wSeries.length >= 3 && (() => {
        const WEIGHT_CLR = "#4FC3F7";
        const unit = profile?.unit || "kg";
        const goal = profile?.goal || "maintain";
        const ws = weightStats(wSeries);
        const verdict = weightVerdict(ws, goal);
        if (!ws.current) return null;
        const tagClr = verdict.tag === "good" ? C.greenSoft
          : verdict.tag === "fast" ? C.coral
          : verdict.tag === "slow" ? C.amber
          : C.inkSoft;
        const tagIcon = verdict.tag === "good" ? "✓" : verdict.tag === "fast" ? "↑↑" : verdict.tag === "slow" ? "→" : "~";
        return (
          <div className="sprig-pop" style={{
            background: C.card, borderRadius: 18,
            border: `1px solid ${tagClr}28`,
            marginTop: 8, padding: "12px 14px", boxShadow: C.shadow,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: WEIGHT_CLR + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <TrendingUp size={14} color={WEIGHT_CLR} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>Weight trend</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "Fraunces", color: C.ink }}>
                    {ws.current}{unit}
                  </span>
                  {ws.rate != null && (
                    <span style={{ fontSize: 11, color: C.muted }}>
                      {ws.rate > 0 ? "+" : ""}{ws.rate} kg/wk
                    </span>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 800, color: tagClr,
                background: tagClr + "18", border: `1px solid ${tagClr}33`,
                borderRadius: 7, padding: "3px 9px", flexShrink: 0,
              }}>
                {tagIcon} {verdict.tag === "good" ? "On track" : verdict.tag === "fast" ? "Too fast" : verdict.tag === "slow" ? "Too slow" : "Stable"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.45 }}>
              {verdict.text}
            </div>
            {ws.avg7 != null && ws.avg7 !== ws.current && (
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                7-day avg: {ws.avg7}{unit}
              </div>
            )}
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

      {/* ══ 6.6. SUPPLEMENT INTERACTION WARNINGS ════════════════ */}
      {(() => {
        if (!supps?.length && !daily.alcohol && !daily.caffeine) return null;
        const flags = interactionFlags({ supps, daily });
        if (!flags.length) return null;
        return (
          <div className="sprig-pop" style={{ marginTop: 8 }}>
            {flags.map((note, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 9,
                background: C.amber + "0E", border: `1px solid ${C.amber}30`,
                borderRadius: 13, padding: "9px 12px",
                marginTop: i > 0 ? 6 : 0,
              }}>
                <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1.5 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
                    Combination alert
                  </div>
                  <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>{note}</div>
                </div>
              </div>
            ))}
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
