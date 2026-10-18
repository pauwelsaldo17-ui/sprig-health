import React, { useState } from "react";
import {
  Activity, Check, ChevronRight, Droplets, Dumbbell,
  Flame, Heart, Moon, Pill, Plus, Repeat, Scale, TrendingUp, Zap,
} from "lucide-react";
import { C } from "../theme.js";
import {
  stepGoal, ACTIVITY_SOURCES, durLabel, scoreVerdict, uid, todayStr, MUSCLES, RISK_TAG, BLOOD_MARKERS,
  ALCOHOL_LEVELS, alcoholLevel, interactionFlags, volumeStatus, VOL_TAG_COLOR,
  weightStats, weightVerdict, mealScore, photoReminder,
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
function BentoCard({ icon, color, label, main, sub, sub2, pct, onTap, cta, empty, active, extra }) {
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
        {pct != null && <MiniArc pct={pct} color={color} size={36} strokeWidth={3.5} />}
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
        {extra}
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
function QA({ icon, label, color, onClick, done = false, partial = false, val }) {
  const dotClr = done ? C.greenSoft : C.amber;
  return (
    <button className="sprig-tap" onClick={onClick}
      style={{
        flex: 1,
        background: done ? color + "22" : color + "18",
        border: `1px solid ${done ? color + "55" : partial ? color + "44" : color + "33"}`,
        borderRadius: 18, padding: "13px 6px",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: done ? 3 : 6,
        cursor: "pointer", fontFamily: "DM Sans",
        position: "relative",
        transition: "background .2s, border-color .2s",
      }}>
      {/* ── status dot — top-right corner ── */}
      {(done || partial) && (
        <div style={{
          position: "absolute", top: 7, right: 8,
          width: 8, height: 8, borderRadius: "50%",
          background: dotClr,
          boxShadow: `0 0 5px ${dotClr}88`,
        }} />
      )}
      <div style={{
        width: 34, height: 34, borderRadius: 11,
        background: done ? color + "38" : color + "28",
        display: "grid", placeItems: "center",
        transition: "background .2s",
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: 11.5, fontWeight: 700,
        color: done ? color : C.ink,
        transition: "color .2s",
      }}>{label}</span>
      {val && (
        <span style={{
          fontSize: 9, fontWeight: 700, color: done ? color + "CC" : C.muted,
          lineHeight: 1, marginTop: -2, maxWidth: "90%",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{val}</span>
      )}
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

function NextWorkoutCard({ suggestion, splitLabel, splitReason, splitRoutine, onStart }) {
  // At least one of suggestion or splitLabel must be present
  if (!suggestion && !splitLabel) return null;
  const title = suggestion?.suggested || splitLabel;
  const subtitle = splitLabel && suggestion?.suggested && splitLabel !== suggestion.suggested
    ? splitLabel : null;
  const confidence = suggestion?.confidence;
  const hasRoutine = !!splitRoutine?.name;
  const exCount = splitRoutine?.exercises?.length || 0;
  // Card border glows green if a saved routine matches
  const borderColor = hasRoutine ? C.green + "60" : C.line;
  return (
    <button className="sprig-tap" onClick={onStart}
      style={{
        width: "100%", textAlign: "left", background: C.card,
        border: `1px solid ${borderColor}`, cursor: "pointer", borderRadius: 16,
        padding: "13px 15px", boxShadow: C.shadow, marginTop: 8,
        display: "flex", alignItems: "center", gap: 12,
      }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: C.green + "1a", display: "grid", placeItems: "center" }}>
        <Dumbbell size={18} color={C.green} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase" }}>Suggested today</div>
          {confidence != null && (
            <div style={{ fontSize: 9, color: C.muted, fontWeight: 600, opacity: 0.7 }}>
              ⟳ {Math.round(confidence * 100)}% pattern
            </div>
          )}
        </div>
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
        {hasRoutine && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5, marginTop: 6,
            background: C.green + "14", borderRadius: 7, padding: "4px 8px",
          }}>
            <span style={{ fontSize: 10, flexShrink: 0 }}>📋</span>
            <span style={{ fontSize: 10.5, color: C.green, fontWeight: 700, lineHeight: 1.3 }}>
              "{splitRoutine.name}" ready{exCount > 0 ? ` · ${exCount} exercises` : ""} — tap to load
            </span>
          </div>
        )}
      </div>
      <ChevronRight size={16} color={C.muted} />
    </button>
  );
}

function TonightPlanCard({ plan, onGoSleep }) {
  if (!plan) return null;
  const items = [
    { icon: "☕", label: "Stop caffeine", value: plan.caffeineCutoff },
    { icon: "📵", label: "Screens off",   value: plan.blueCutoff },
    { icon: "🛏️", label: "Bed by",        value: plan.targetBed },
    { icon: "⏰", label: "Wake",           value: plan.targetWake },
  ].filter(({ value }) => value != null && value !== "");
  if (!items.length && !(plan.debtMin > 30)) return null;
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: "13px 15px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8 }}>
      <button className="sprig-tap" onClick={() => { onGoSleep?.(); buzz("tap"); }}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, marginBottom: 9, background: "none", border: "none", padding: 0, cursor: onGoSleep ? "pointer" : "default", fontFamily: "DM Sans", textAlign: "left" }}>
        <Moon size={14} color={SLEEP_CLR} />
        <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Tonight's plan</div>
        {onGoSleep && <ChevronRight size={12} color={C.muted} />}
      </button>
      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {items.map(({ icon, label, value }) => (
            <div key={label} style={{ background: C.bg, borderRadius: 9, padding: "8px 10px" }}>
              <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, letterSpacing: .3, textTransform: "uppercase" }}>{icon} {label}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 2 }}>{value}</div>
            </div>
          ))}
        </div>
      )}
      {plan.debtMin > 30 && (
        onGoSleep ? (
          <button className="sprig-tap" onClick={() => { onGoSleep(); buzz("tap"); }}
            style={{ width: "100%", marginTop: 8, background: SLEEP_CLR + "12", border: `1px solid ${SLEEP_CLR}33`, borderRadius: 9, padding: "6px 10px", cursor: "pointer", fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 6, textAlign: "left" }}>
            <span style={{ fontSize: 11, color: SLEEP_CLR, lineHeight: 1.5, flex: 1 }}>
              ~{Math.round(plan.debtMin / 60 * 10) / 10}h sleep debt — early night beats sleeping in
            </span>
            <ChevronRight size={11} color={SLEEP_CLR} style={{ flexShrink: 0 }} />
          </button>
        ) : (
          <div style={{ fontSize: 11, color: SLEEP_CLR, marginTop: 7, lineHeight: 1.5 }}>
            You're carrying ~{Math.round(plan.debtMin / 60 * 10) / 10}h sleep debt. Early night beats sleeping in.
          </div>
        )
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
  const [editing, setEditing] = useState(false);
  const ci = checkin || {};
  const allDone = CI_ROWS.every(({ key }) => ci[key]);
  if (allDone && !editing) {
    /* ── emoji maps for compact display ── */
    const moodEmoji   = { bad: "😔", okay: "😐", good: "😊" };
    const energyEmoji = { low: "🪫", normal: "⚡", high: "🔥" };
    const stressEmoji = { low: "😌", medium: "😤", high: "😰" };
    /* ── contextual response based on combination ── */
    const m = ci.mood, e = ci.energy, s = ci.stress;
    let insight = null;
    if (m === "good" && e === "high" && s === "low")    insight = { text: "Peak state — great time to tackle something big.", icon: "⚡", clr: C.greenSoft };
    else if (m === "good" && s === "low")               insight = { text: "Great headspace today! Keep the momentum going.", icon: "🌟", clr: C.greenSoft };
    else if (m === "bad" && s === "high")               insight = { text: "Tough combo. A short walk or 5-min breathing break genuinely helps.", icon: "💆", clr: C.coral };
    else if (m === "bad" && e === "low")                insight = { text: "Rest and recovery mode — be kind to yourself today.", icon: "🛌", clr: C.amber };
    else if (e === "high" && s === "high")              insight = { text: "Wired but stressed — channel it into a workout if you can.", icon: "😤", clr: C.amber };
    else if (e === "low" && s === "low" && m !== "bad") insight = { text: "Low energy today — hydrate, eat something good, rest if needed.", icon: "🌿", clr: C.muted };
    else if (s === "high")                              insight = { text: "High stress — even 10 minutes of movement or breathing helps.", icon: "😤", clr: C.amber };
    else if (m === "okay" && e === "normal")            insight = { text: "Steady day — keep the routine going.", icon: "📊", clr: C.muted };
    else if (m === "good" && e === "low")               insight = { text: "Good mindset despite low energy — light movement can help.", icon: "🌿", clr: C.greenSoft };
    else if (m === "bad" && e === "high")               insight = { text: "High energy, low mood — a workout might actually help shift it.", icon: "💪", clr: C.amber };
    else if (m === "okay" && e === "high")              insight = { text: "Good energy today — put it to use!", icon: "🔥", clr: C.greenSoft };
    else if (m === "good")                              insight = { text: "Great mindset today — keep that momentum.", icon: "🌟", clr: C.greenSoft };
    else if (m === "bad")                               insight = { text: "Difficult day — take it one step at a time.", icon: "🛌", clr: C.amber };
    else                                                insight = { text: "Consistency is what builds results — keep going.", icon: "📊", clr: C.muted };
    return (
      <div style={{ background: MIND_CLR + "0D", border: `1px solid ${MIND_CLR}2A`, borderRadius: 14, padding: "10px 13px", marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: insight ? 6 : 0 }}>
          <span style={{ fontSize: 14 }}>✅</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: MIND_CLR, letterSpacing: 0.3 }}>Check-in done</span>
          <div style={{ display: "flex", gap: 5, marginLeft: "auto", alignItems: "center" }}>
            {[
              { emoji: moodEmoji[m], label: m },
              { emoji: energyEmoji[e], label: e },
              { emoji: stressEmoji[s], label: s },
            ].map(({ emoji, label }) => (
              <span key={label} style={{ fontSize: 11, background: C.bg2, borderRadius: 6, padding: "2px 7px", display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 13 }}>{emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.inkSoft, textTransform: "capitalize" }}>{label}</span>
              </span>
            ))}
            <button className="sprig-tap" onClick={() => setEditing(true)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, color: C.muted, padding: "2px 4px", fontFamily: "DM Sans", flexShrink: 0 }}>
              Edit
            </button>
          </div>
        </div>
        {insight && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, background: insight.clr + "0C", borderRadius: 9, padding: "6px 9px" }}>
            <span style={{ fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>{insight.icon}</span>
            <span style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>{insight.text}</span>
          </div>
        )}
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
      {editing && (
        <button className="sprig-tap" onClick={() => setEditing(false)}
          style={{ width: "100%", marginTop: 4, background: MIND_CLR + "18", border: `1px solid ${MIND_CLR}44`, borderRadius: 10, padding: "8px 0", fontSize: 12, fontWeight: 700, color: MIND_CLR, cursor: "pointer", fontFamily: "DM Sans" }}>
          Save changes ✓
        </button>
      )}
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
  patterns = [], plateaus = [], timeline = null,
  weekReport = null,
  photoLog = [],
  safetyInfo = null,
  achievements = [],
  measureStats = null,
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
    : subScores.sleep != null
      ? Math.min(100, subScores.sleep)
      : null;

  const calPct    = adjTarget > 0 ? Math.min(120, Math.round((t.calories || 0) / adjTarget * 100)) : null;
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

  /* ── "perfect day" check — all active goals hit ────────────────── */
  const perfectDayGoals = [
    // Calories: within ±15% of adjusted target
    adjTarget > 0 && t.calories > 0 && t.calories >= adjTarget * 0.85 && t.calories <= adjTarget * 1.15,
    // Protein: ≥90% of goal (only if goal set)
    (targets.protein || 0) > 0 ? (t.protein || 0) >= targets.protein * 0.9 : null,
    // Water: ≥90% of goal
    waterGoal > 0 ? (waterMl >= waterGoal * 0.9 || dtWaterSrc === "quick_log") : null,
    // Steps: ≥90% of step goal
    sGoal > 0 ? steps >= sGoal * 0.9 : null,
    // Sleep: at least 6h logged
    lastSleep?.durationMin ? lastSleep.durationMin >= 360 : (dtSleepSrc ? true : null),
  ].filter(v => v !== null);          // only evaluate goals with data
  const goalHitCount = perfectDayGoals.filter(Boolean).length;
  const goalTotal    = perfectDayGoals.length;
  const perfectDay   = goalTotal >= 3 && goalHitCount === goalTotal;

  /* ── habit completion summary for QA badge ───────────────────── */
  const habitQA = (() => {
    if (!mindInfo || !onGoMind) return { done: false, partial: false, val: undefined };
    const { habits2 = [], habitStatusMap = {}, autoToday = {} } = mindInfo;
    const dueToday = habits2
      .filter(h => !h.archived && (!h.frequency || h.frequency === "daily"))
      .filter(h => (habitStatusMap[h.id] || {}).isDue !== false);
    if (!dueToday.length) return { done: false, partial: false, val: undefined };
    const isAutoMet = (h) => !!(h.autoType && autoToday[h.id]?.met);
    const doneCount = dueToday.filter(h => (habitStatusMap[h.id] || {}).isComplete || isAutoMet(h)).length;
    const allDone = doneCount >= dueToday.length;
    return {
      done:    allDone,
      partial: !allDone && doneCount > 0,
      val:     `${doneCount}/${dueToday.length}`,
    };
  })();

  /* ── render ───────────────────────────────────────────────────── */
  return (
    <div className="sprig-rise">

      {/* ══ 0. CRITICAL HEALTH ALERTS — redFlags + bp crisis (safetyInfo) ══ */}
      {safetyInfo?.urgent && (() => {
        if (safetyInfo.hasCrisis) {
          return (
            <div style={{
              background: "#C0392B18", border: "1.5px solid #C0392B55",
              borderRadius: 14, padding: "12px 14px", marginBottom: 10,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#C0392B", marginBottom: 5 }}>
                ⚠️ We noticed something in your health notes
              </div>
              <div style={{ fontSize: 12, color: "#C0392B", lineHeight: 1.55, marginBottom: 8 }}>
                If you're having thoughts of harming yourself, please reach out — you don't have to face this alone.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href="tel:988" style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "#C0392B", borderRadius: 8, padding: "5px 12px", textDecoration: "none" }}>
                  Call 988 (Lifeline)
                </a>
                <a href="sms:741741" style={{ fontSize: 11, fontWeight: 800, color: "#C0392B", background: "#C0392B18", borderRadius: 8, padding: "5px 12px", textDecoration: "none" }}>
                  Text HOME to 741741
                </a>
              </div>
            </div>
          );
        }
        const allFlags = [
          ...(safetyInfo.redFlags || []).map(f => f.text),
          ...(safetyInfo.bpFlag ? [safetyInfo.bpFlag.text] : []),
        ];
        if (!allFlags.length) return null;
        return (
          <div style={{
            background: "#E0714A10", border: "1px solid #E0714A44",
            borderRadius: 14, padding: "10px 14px", marginBottom: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#E0714A", marginBottom: 4 }}>
              ⚠️ Health check — logged from your notes
            </div>
            {allFlags.map((t, i) => (
              <div key={i} style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>
                • {t}
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>
              If these are ongoing symptoms, please speak with a healthcare professional.
            </div>
          </div>
        );
      })()}

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
        {(loggedDays >= 3 || perfectDay) && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
            {loggedDays >= 3 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.65)", background: "rgba(255,255,255,.1)", padding: "3px 11px", borderRadius: 99, letterSpacing: .3, display: "inline-flex", alignItems: "center", gap: 5 }}>
                {loggedDays >= 30 ? "🔥" : "🌿"} {loggedDays} days logged
              </span>
            )}
            {/* Dynamic goals badge — shows progress, turns into 🌟 when all hit */}
            {goalTotal >= 2 && goalHitCount > 0 && (
              perfectDay ? (
                <span className="sprig-pop" style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "rgba(79,195,127,0.30)", padding: "3px 11px", borderRadius: 99, letterSpacing: .3, display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid rgba(79,195,127,0.35)" }}>
                  🌟 Perfect day!
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.70)", background: "rgba(255,255,255,.10)", padding: "3px 11px", borderRadius: 99, letterSpacing: .3, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  ✓ {goalHitCount}/{goalTotal} goals
                </span>
              )
            )}
          </div>
        )}

        {/* AI insight — tappable, navigates to relevant tab */}
        {actions.length > 0 && (() => {
          const icon = actions[0].icon;
          const navFn = { train: onGoTrain, food: onGoNutrition, protein: onGoNutrition, sleep: onGoSleep, walk: onGoTrain, pain: onGoHealth, rest: onGoHealth || onGoBody, log: onGoNutrition }[icon];
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
              const navFn2 = { train: onGoTrain, food: onGoNutrition, protein: onGoNutrition, sleep: onGoSleep, walk: onGoTrain, pain: onGoHealth, rest: onGoHealth || onGoBody, log: onGoNutrition }[a.icon];
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
            const grade = ({
              Sleep:     v >= 85 ? "Restful"  : v >= 70 ? "Good"   : v >= 50 ? "Light"  : "Poor",
              Nutrition: v >= 85 ? "On track"  : v >= 70 ? "Good"   : v >= 50 ? "Fair"   : "Low",
              Movement:  v >= 85 ? "Active"    : v >= 70 ? "Good"   : v >= 50 ? "Fair"   : "Low",
              Recovery:  v >= 85 ? "Peak"      : v >= 70 ? "Rested" : v >= 50 ? "Fair"   : "Tired",
            })[ch.label] ?? (v >= 85 ? "Great" : v >= 70 ? "Good" : v >= 50 ? "Fair" : "Low");
            const navFn = { Sleep: onGoSleep, Nutrition: onGoNutrition, Movement: onGoTrain, Recovery: onGoHealth || onGoBody }[ch.label];
            return (
              <button key={ch.label} className="sprig-tap" onClick={() => navFn?.()}
                style={{
                  background: C.card, borderRadius: 14, padding: "9px 6px 8px",
                  textAlign: "center", border: `1px solid ${C.line}`,
                  cursor: navFn ? "pointer" : "default",
                  fontFamily: "DM Sans", width: "100%",
                }}>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: clr, lineHeight: 1 }}>
                  {v}
                </div>
                <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: .4, textTransform: "uppercase", marginTop: 3 }}>
                  {ch.label}
                </div>
                {/* grade label */}
                <div style={{ fontSize: 8.5, fontWeight: 800, color: clr, marginTop: 3, marginBottom: 4, lineHeight: 1 }}>
                  {grade}
                </div>
                {/* proportional progress bar — replaces static 38% decoration */}
                <div style={{ height: 3, borderRadius: 99, background: clr + "22", width: "88%", margin: "0 auto", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(4, v)}%`, height: "100%", background: clr, borderRadius: 99, transition: "width .7s cubic-bezier(.34,1.56,.64,1)" }} />
                </div>
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
              <span style={{ fontSize: 11, color: C.inkSoft, lineHeight: 1.4, flex: 1 }}>{funcHealth.reasons.slice(0, 3).join(" · ")}</span>
            </>
          ) : healthScore >= 80 ? (
            <span style={{ fontSize: 11, color: C.greenSoft, lineHeight: 1, flex: 1, fontWeight: 600 }}>
              {healthScore >= 90 ? "🌟 Outstanding day" : "✓ Everything looks great"}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: C.muted, lineHeight: 1, flex: 1 }}>Keep logging to improve</span>
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
          <QA icon={<Flame size={17} color={NUTR_CLR} />} label="Food" color={NUTR_CLR} onClick={onGoNutrition}
            done={!!dtNutrSrc && (t.calories > 100 || dtNutrSrc === "quick_log")}
            partial={!!dtNutrSrc && t.calories <= 100 && dtNutrSrc !== "quick_log"}
            val={t.calories > 0 ? `${Math.round(t.calories).toLocaleString()} kcal` : dtNutrSrc ? "Logged" : undefined}
          />
        )}
        {(tp.movement !== false || tp.training !== false) && (
          <QA icon={<Dumbbell size={17} color={C.greenSoft} />} label="Train" color={C.greenSoft} onClick={onGoTrain}
            done={!!dtTrainSrc}
            val={steps > 0
              ? `${steps.toLocaleString()} steps`
              : dtTrainSrc === "exact" && moveInfo?.workoutAdj?.totalMin > 0
                ? `${moveInfo.workoutAdj.totalMin}min`
                : dtTrainSrc
                  ? "Logged"
                  : undefined}
          />
        )}
        {tp.sleep !== false && (
          <QA icon={<Moon size={17} color={SLEEP_CLR} />} label="Sleep" color={SLEEP_CLR} onClick={onGoSleep}
            done={!!dtSleepSrc}
            val={sleepDur || (dtSleepSrc && subScores?.sleep != null ? `${Math.round(subScores.sleep)} pts` : dtSleepSrc ? "Logged" : undefined)}
          />
        )}
        {onGoMind && (
          <QA icon={<Heart size={17} color={RECOV_CLR} />} label="Habits" color={RECOV_CLR} onClick={onGoMind}
            done={habitQA.done}
            partial={habitQA.partial}
            val={habitQA.val}
          />
        )}
      </div>

      {/* ══ 3b. HABIT PROGRESS STRIP ════════════════════════════ */}
      {onGoMind && mindInfo && (() => {
        const { habits2 = [], habitStatusMap = {}, autoToday = {}, consistencyV2, focusMinutesToday = 0, focusWeek = [], habitStreakBest = null } = mindInfo;
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
        // weakest habit from full consistency history — surfaces the one most worth focusing on
        const details    = consistencyV2?.details || [];
        const weakest    = !allDone ? (details
          .filter(d => d.rate !== null && d.rate < 0.6 && d.total >= 3)
          .sort((a, b) => a.rate - b.rate)[0] || null) : null;
        const MAX_CHIPS  = 5;
        if (allDone) {
          /* ── ALL HABITS DONE — celebration layout ── */
          return (
            <button className="sprig-tap sprig-pop" onClick={() => { onGoMind(); buzz("tap"); }}
              style={{
                width: "100%", background: C.card, border: `1px solid ${C.greenSoft}55`,
                borderRadius: 12, padding: "10px 13px", display: "flex", flexDirection: "column", gap: 6,
                marginTop: 8, cursor: "pointer", textAlign: "left",
              }}>
              {/* celebration header */}
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>🎯</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.greenSoft }}>
                    All {dueToday.length} habit{dueToday.length !== 1 ? "s" : ""} done today!
                  </div>
                  {consPct != null && (
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>
                      {consPct}% consistency{habitStreakBest ? ` · 🔥 ${habitStreakBest.streak}d streak` : ""}
                    </div>
                  )}
                </div>
                <ChevronRight size={12} color={C.greenSoft} style={{ flexShrink: 0 }} />
              </div>
              {/* compact done-chip row */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {dueToday.slice(0, MAX_CHIPS).map((h) => {
                  const chipName = h.name.length > 14 ? h.name.slice(0, 13) + "…" : h.name;
                  return (
                    <span key={h.id} style={{
                      fontSize: 9.5, fontWeight: 700, lineHeight: 1.5, flexShrink: 0,
                      color: C.greenSoft, background: C.greenSoft + "14",
                      border: `1px solid ${C.greenSoft}33`, borderRadius: 6, padding: "2px 7px",
                    }}>
                      ✓ {chipName}
                    </span>
                  );
                })}
                {dueToday.length > MAX_CHIPS && (
                  <span style={{ fontSize: 9.5, color: C.greenSoft, fontWeight: 600, flexShrink: 0 }}>
                    +{dueToday.length - MAX_CHIPS} more ✓
                  </span>
                )}
              </div>
            </button>
          );
        }
        return (
          <button className="sprig-tap" onClick={() => { onGoMind(); buzz("tap"); }}
            style={{
              width: "100%", background: C.card, border: `1px solid ${C.line}`,
              borderRadius: 12, padding: "9px 13px", display: "flex", flexDirection: "column", gap: 5,
              marginTop: 8, cursor: "pointer", textAlign: "left",
            }}>
            {/* top row: named habit chips + count col + chevron */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
              {/* named chips — user knows exactly which habits are done vs pending */}
              <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap", alignItems: "center" }}>
                {dueToday.slice(0, MAX_CHIPS).map((h) => {
                  const done = (habitStatusMap[h.id] || {}).isComplete || isAutoMet(h);
                  const chipName = h.name.length > 12 ? h.name.slice(0, 11) + "…" : h.name;
                  return (
                    <span key={h.id} style={{
                      fontSize: 9.5, fontWeight: 700, lineHeight: 1.5, flexShrink: 0,
                      color: done ? C.greenSoft : C.muted,
                      background: done ? C.greenSoft + "18" : C.line + "55",
                      border: `1px solid ${done ? C.greenSoft + "44" : C.line + "88"}`,
                      borderRadius: 6, padding: "2px 7px",
                    }}>
                      {done ? "✓ " : ""}{chipName}
                    </span>
                  );
                })}
                {dueToday.length > MAX_CHIPS && (
                  <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600, flexShrink: 0 }}>
                    +{dueToday.length - MAX_CHIPS} more
                  </span>
                )}
              </div>
              {/* count + consistency summary */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 1 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft }}>
                  {doneCount}/{dueToday.length}
                </span>
                {consLabel && consPct != null && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: consClr }}>
                    {consPct}% avg
                  </span>
                )}
                {focusMinutesToday >= 10 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: RECOV_CLR }}>
                    🎯 {focusMinutesToday}m
                  </span>
                )}
                {weekFocusMin >= 60 && focusMinutesToday < 10 && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: RECOV_CLR }}>
                    📅 {Math.round(weekFocusMin / 60 * 10) / 10}h/wk
                  </span>
                )}
                {habitStreakBest && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: C.amber }}>
                    🔥 {habitStreakBest.streak}d
                  </span>
                )}
              </div>
              <ChevronRight size={12} color={C.muted} style={{ flexShrink: 0 }} />
            </div>
            {/* weakest habit nudge — tells the user exactly what to prioritise */}
            {weakest && (
              <div style={{ fontSize: 9.5, fontWeight: 600, color: weakest.rate < 0.4 ? C.coral : C.amber, paddingLeft: 1 }}>
                📉 Struggling: {weakest.habit.name} ({Math.round(weakest.rate * 100)}% lately) — tap to work on it
              </div>
            )}
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
        /* ── All-domains celebration — show when nothing is missing or partial ── */
        const allDomainsLogged = unlogged.length === 0 && partial.length === 0 && done.length >= 2;
        if (allDomainsLogged) {
          return (
            <div className="sprig-pop" style={{
              display: "flex", alignItems: "center", gap: 10,
              background: C.greenSoft + "0F", border: `1px solid ${C.greenSoft}44`,
              borderRadius: 14, padding: "10px 13px", marginTop: 8,
            }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>🎉</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.greenSoft }}>All logged today!</div>
                <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 1 }}>
                  {done.map(d => `${d.icon} ${d.label}`).join(" · ")}
                </div>
              </div>
            </div>
          );
        }
        /* nav map for each domain key */
        const domainNav = {
          sleep:      onGoSleep,
          nutrition:  onGoNutrition,
          movement:   onGoTrain,
          training:   onGoTrain,
        };
        return (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginTop: 8, marginBottom: -2 }}>
            {done.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: C.greenSoft, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0, lineHeight: 1.6 }}>
                ✓ Done:
              </span>
            )}
            {done.map(d => {
              const navFn = domainNav[d.k];
              return navFn ? (
                <button key={d.k} className="sprig-tap"
                  onClick={() => { navFn(); buzz("tap"); }}
                  style={{
                    fontSize: 10, fontWeight: 700, color: C.greenSoft,
                    background: C.greenSoft + "14", border: `1px solid ${C.greenSoft}33`,
                    borderRadius: 7, padding: "3px 8px", lineHeight: 1,
                    cursor: "pointer", fontFamily: "DM Sans",
                    display: "inline-flex", alignItems: "center", gap: 3,
                  }}>
                  {d.icon} {d.label}
                </button>
              ) : (
                <span key={d.k} style={{
                  fontSize: 10, fontWeight: 700, color: C.greenSoft,
                  background: C.greenSoft + "14", border: `1px solid ${C.greenSoft}33`,
                  borderRadius: 7, padding: "3px 8px", lineHeight: 1,
                }}>
                  {d.icon} {d.label}
                </span>
              );
            })}
            {partial.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0, lineHeight: 1.6, marginLeft: done.length > 0 ? 2 : 0 }}>
                {done.length > 0 ? "Partial:" : "In progress:"}
              </span>
            )}
            {partial.map(d => {
              const navFn = domainNav[d.k];
              return navFn ? (
                <button key={d.k} className="sprig-tap"
                  onClick={() => { navFn(); buzz("tap"); }}
                  style={{
                    fontSize: 10, fontWeight: 700, color: C.amber,
                    background: C.amber + "10", border: `1px solid ${C.amber}44`,
                    borderRadius: 7, padding: "3px 8px", lineHeight: 1,
                    cursor: "pointer", fontFamily: "DM Sans",
                    display: "inline-flex", alignItems: "center", gap: 3,
                  }}>
                  {d.icon} {d.label} <ChevronRight size={9} color={C.amber} />
                </button>
              ) : (
                <span key={d.k} style={{
                  fontSize: 10, fontWeight: 700, color: C.amber,
                  background: C.amber + "10", border: `1px solid ${C.amber}33`,
                  borderRadius: 7, padding: "3px 8px", lineHeight: 1,
                }}>
                  {d.icon} {d.label}
                </span>
              );
            })}
            {unlogged.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0, lineHeight: 1.6, marginLeft: (done.length > 0 || partial.length > 0) ? 2 : 0 }}>
                Log:
              </span>
            )}
            {unlogged.map(d => {
              const navFn = domainNav[d.k];
              return navFn ? (
                <button key={d.k} className="sprig-tap"
                  onClick={() => { navFn(); buzz("tap"); }}
                  style={{
                    fontSize: 10, fontWeight: 700, color: C.inkSoft,
                    background: C.card, border: `1px dashed ${C.amber}66`,
                    borderRadius: 7, padding: "3px 8px", lineHeight: 1,
                    cursor: "pointer", fontFamily: "DM Sans",
                    display: "inline-flex", alignItems: "center", gap: 3,
                  }}>
                  {d.icon} {d.label} <ChevronRight size={9} color={C.amber} />
                </button>
              ) : (
                <span key={d.k} style={{
                  fontSize: 10, fontWeight: 600, color: C.muted,
                  background: C.muted + "0A", border: `1px dashed ${C.muted}44`,
                  borderRadius: 7, padding: "3px 8px", lineHeight: 1,
                }}>
                  {d.icon} {d.label}
                </span>
              );
            })}
          </div>
        );
      })()}

      {/* ══ 3d. BEST ACTIONS — overflow actions beyond hero's first 4 ═══════════════ */}
      {(dailyInfo?.actions?.length || 0) > 4 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {dailyInfo.actions.slice(4).map((a, i) => {
            const iconMap = {
              rest: "😴", pain: "⚠️", done: "✅", train: "💪",
              protein: "🥩", food: "🍽️", walk: "🚶", water: "💧",
              sleep: "🌙", log: "📝",
            };
            const clrMap = {
              rest: RECOV_CLR, pain: C.coral, done: C.greenSoft, train: C.greenSoft,
              protein: NUTR_CLR, food: NUTR_CLR, walk: C.greenSoft, water: WATER_CLR,
              sleep: SLEEP_CLR, log: C.muted,
            };
            const ic  = iconMap[a.icon] || "⚡";
            const clr = clrMap[a.icon] || C.muted;
            const navFn = {
              train: onGoTrain, food: onGoNutrition, protein: onGoNutrition,
              sleep: onGoSleep, walk: onGoTrain, pain: onGoHealth,
              rest: onGoHealth || onGoBody, log: onGoNutrition,
            }[a.icon];
            const inner = (
              <>
                <span style={{ fontSize: 15, lineHeight: 1.25, flexShrink: 0, marginTop: 1 }}>{ic}</span>
                <span style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, flex: 1 }}>{a.text}</span>
                {navFn && <ChevronRight size={13} color={C.muted} style={{ flexShrink: 0, marginTop: 3 }} />}
              </>
            );
            return navFn ? (
              <button key={i} className="sprig-tap sprig-pop" onClick={() => { navFn(); buzz("tap"); }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  background: clr + "0B", border: `1px solid ${clr}28`,
                  borderRadius: 14, padding: "10px 13px",
                  cursor: "pointer", fontFamily: "DM Sans", textAlign: "left", width: "100%",
                }}>
                {inner}
              </button>
            ) : (
              <div key={i} className="sprig-pop" style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: clr + "0B", border: `1px solid ${clr}28`,
                borderRadius: 14, padding: "10px 13px",
              }}>
                {inner}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ 3e. PLATEAU ALERTS — weight / strength / sleep stalls (plateauDetection) ═══ */}
      {plateaus?.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {plateaus.map((p, i) => (
            <div key={i} className="sprig-pop" style={{
              background: C.amber + "0B", border: `1px solid ${C.amber}30`,
              borderRadius: 14, padding: "10px 13px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13, lineHeight: 1 }}>📊</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Plateau detected
                </span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 4 }}>{p.title}</div>
              {p.reasons?.slice(0, 2).map((r, j) => (
                <div key={j} style={{ display: "flex", gap: 5, marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: C.amber, flexShrink: 0, marginTop: 1 }}>·</span>
                  <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{r}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ══ 3f. GOAL TIMELINE — weight goal + strength progress (goalTimeline) ══════ */}
      {timeline && (timeline.weight || timeline.strength?.length > 0) && (() => {
        const w = timeline.weight;
        const str = (timeline.strength || []).slice(0, 2);
        const wClr = w?.color || C.greenSoft;
        return (
          <div className="sprig-pop" style={{
            background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 16, padding: "11px 14px", marginTop: 8,
            boxShadow: C.shadow,
          }}>
            {/* header */}
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 7 }}>
              🎯 Goal progress
            </div>
            {/* weight goal row */}
            {w && (
              onGoBody ? (
                <button className="sprig-tap" onClick={() => { onGoBody(); buzz("tap"); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, marginBottom: str.length ? 7 : 0, background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "DM Sans", textAlign: "left" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
                      {w.kgLeft > 0 ? `${w.kgLeft} kg to go` : w.kgLeft < 0 ? `${Math.abs(w.kgLeft)} kg past target` : "Target reached!"}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {w.rate > 0 ? "+" : ""}{w.rate} kg/wk
                      {w.weeksAtPace ? ` · ~${w.weeksAtPace}w at this pace` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: wClr, background: wClr + "18", borderRadius: 8, padding: "3px 9px" }}>
                      {w.status}
                    </div>
                    <ChevronRight size={11} color={C.muted} />
                  </div>
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: str.length ? 7 : 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
                      {w.kgLeft > 0 ? `${w.kgLeft} kg to go` : w.kgLeft < 0 ? `${Math.abs(w.kgLeft)} kg past target` : "Target reached!"}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {w.rate > 0 ? "+" : ""}{w.rate} kg/wk
                      {w.weeksAtPace ? ` · ~${w.weeksAtPace}w at this pace` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: wClr, background: wClr + "18", borderRadius: 8, padding: "3px 9px", flexShrink: 0 }}>
                    {w.status}
                  </div>
                </div>
              )
            )}
            {/* strength gains row */}
            {str.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {str.map((s) => (
                  onGoTrain ? (
                    <button key={s.name} className="sprig-tap" onClick={() => { onGoTrain(); buzz("tap"); }}
                      style={{ background: C.bg2, borderRadius: 9, padding: "5px 10px", flex: "1 1 auto", border: "none", cursor: "pointer", fontFamily: "DM Sans", textAlign: "left" }}>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        {s.name.replace("Barbell ", "")} <ChevronRight size={9} color={C.muted} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.greenSoft, marginTop: 1 }}>
                        {s.perMonth > 0 ? "+" : ""}{s.perMonth} kg/mo
                      </div>
                      <div style={{ fontSize: 9.5, color: C.muted }}>e1RM {s.e1} kg</div>
                    </button>
                  ) : (
                    <div key={s.name} style={{
                      background: C.bg2, borderRadius: 9, padding: "5px 10px", flex: "1 1 auto",
                    }}>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{s.name.replace("Barbell ", "")}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.greenSoft, marginTop: 1 }}>
                        {s.perMonth > 0 ? "+" : ""}{s.perMonth} kg/mo
                      </div>
                      <div style={{ fontSize: 9.5, color: C.muted }}>e1RM {s.e1} kg</div>
                    </div>
                  )
                ))}
              </div>
            )}
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
                ? subScores.sleep != null
                  ? (subScores.sleep >= 80
                      ? `Great sleep · ${Math.round(subScores.sleep)}`
                      : subScores.sleep >= 60
                        ? `Fair sleep · ${Math.round(subScores.sleep)}`
                        : `Poor sleep · ${Math.round(subScores.sleep)}`)
                  : "Duration logged"
                : dtSleepSrc === "quick_log"
                  ? (subScores?.sleep != null ? `Quick logged · ${Math.round(subScores.sleep)}` : "Quick logged")
                  : null
            }
            sub2={
              !dtSleepSrc
                ? "Not logged yet"
                : (lastSleep?.bedtime && lastSleep?.waketime)
                  ? `${minToTimeStr(new Date(lastSleep.bedtime).getHours() * 60 + new Date(lastSleep.bedtime).getMinutes())} → ${minToTimeStr(new Date(lastSleep.waketime).getHours() * 60 + new Date(lastSleep.waketime).getMinutes())}`
                  : null
            }
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
                ? `${Math.round(t.calories).toLocaleString()} kcal`
                : dtNutrSrc === "quick_log"
                  ? "Logged"
                  : "—"
            }
            sub={t.calories > 0
              ? (targets.protein > 0 && (t.protein || 0) >= targets.protein * 0.9
                ? `Protein ✓ ${Math.round(t.protein || 0)}g`
                : targets.protein > 0
                  ? `${Math.round(t.protein || 0)} / ${targets.protein}g protein`
                  : adjTarget > 0
                    ? `${Math.round(t.calories / adjTarget * 100)}% of goal`
                    : (t.protein || 0) > 0
                      ? `${Math.round(t.protein)}g protein`
                      : null)
              : dtNutrSrc === "quick_log"
                ? "Quick logged"
                : null}
            sub2={
              adjTarget > 0 && t.calories > adjTarget
                ? `+${Math.round(t.calories - adjTarget)} kcal over`
                : adjTarget > 0 && t.calories >= adjTarget * 0.85
                  ? "Calorie goal hit! ✓"
                  : adjTarget > 0 && t.calories > 0
                    ? `${Math.round(adjTarget - t.calories)} kcal left`
                    : adjTarget > 0 && t.calories === 0
                      ? `Goal: ${adjTarget.toLocaleString()} kcal`
                      : targets.fiber > 0 && (t.fiber || 0) > 0
                        ? `${Math.round(t.fiber)} / ${targets.fiber}g fiber`
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
              steps > 0
                ? steps.toLocaleString()
                : dtMoveSrc === "quick_log"
                  ? "Active"
                  : dtTrainSrc
                    ? "Trained"
                    : "—"
            }
            sub={
              steps > 0
                ? dtTrainSrc === "exact" && moveInfo?.workoutAdj?.kcal > 0
                  ? `${movePct}% steps · +${moveInfo.workoutAdj.kcal} kcal`
                  : steps >= sGoal && sGoal > 0
                    ? moveInfo?.movement?.kcal > 0
                      ? `~${moveInfo.movement.kcal} kcal burned`
                      : steps > sGoal
                        ? `+${(steps - sGoal).toLocaleString()} over goal`
                        : "Goal complete"
                    : dtMoveSrc === "quick_log"
                      ? `Active · ${movePct}% of goal`
                      : `${movePct}% · goal ${sGoal.toLocaleString()}`
                : dtTrainSrc === "exact"
                  ? moveInfo?.workoutAdj?.kcal > 0
                    ? `+${moveInfo.workoutAdj.kcal} kcal burned`
                    : "Workout logged ✓"
                  : dtTrainSrc === "quick_log"
                    ? "Quick trained ✓"
                    : dtMoveSrc === "quick_log"
                      ? "Activity logged"
                      : null
            }
            sub2={
              steps >= sGoal && sGoal > 0
                ? "Step goal hit! 🏆"
                : sGoal > 0 && steps > 0 && (sGoal - steps) <= 3000
                  ? `${(sGoal - steps).toLocaleString()} steps to goal`
                  : dtTrainSrc === "exact" && moveInfo?.workoutAdj?.totalMin > 0
                    ? `${moveInfo.workoutAdj.totalMin}min${moveInfo.workoutAdj.intensity ? ` · ${moveInfo.workoutAdj.intensity}` : ""}`
                    : steps > 0 && moveInfo?.movement?.kcal > 0
                      ? `~${moveInfo.movement.kcal} kcal from steps`
                      : null
            }
            pct={movePct}
            onTap={onGoTrain}
            cta={!dtMoveSrc && !dtTrainSrc && steps === 0 ? "Log workout" : null}
            empty={!dtMoveSrc && !dtTrainSrc && steps === 0}
            active={!!(dtMoveSrc || steps > 0 || dtTrainSrc)}
          />
        )}

        {/* Recovery */}
        {tp.recovery !== false && (
          <BentoCard
            icon={<Heart size={15} color={RECOV_CLR} />}
            color={RECOV_CLR}
            label="Recovery"
            main={recovScore != null ? String(recovScore) : "—"}
            sub={recovScore != null
              ? (recovScore >= 85 ? "Excellent recovery"
                : recovScore >= 70 ? "Well rested"
                : recovScore >= 55 ? "Moderate recovery"
                : recovScore >= 40 ? "Under-recovered"
                : "Rest needed")
              : null}
            sub2={
              recovScore != null && recovScore < 50
                ? "Rest recommended"
                : recovScore != null && recovScore >= 80
                  ? "Peak condition"
                  : recovScore != null && (trainInfo?.readyMuscles?.length > 0 || trainInfo?.freshMuscles?.length > 0)
                    ? `${(trainInfo?.readyMuscles || trainInfo?.freshMuscles || []).length} muscles ready`
                    : recovScore != null && recoveryInfo?.bestAction
                      ? recoveryInfo.bestAction
                      : recovScore != null && recoveryInfo?.label
                        ? recoveryInfo.label
                        : recovScore != null
                          ? recovScore >= 65 ? "Light training OK" : "Ease into today"
                          : null
            }
            extra={(() => {
              if (recovScore == null || recovScore < 55) return null;
              const muscles = trainInfo?.readyMuscles?.length > 0
                ? trainInfo.readyMuscles
                : trainInfo?.freshMuscles?.length > 0
                  ? trainInfo.freshMuscles
                  : null;
              if (!muscles?.length) return null;
              return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                  {muscles.slice(0, 3).map(name => (
                    <span key={name} style={{
                      fontSize: 9, fontWeight: 700, color: RECOV_CLR,
                      background: RECOV_CLR + "18", border: `1px solid ${RECOV_CLR}30`,
                      borderRadius: 4, padding: "2px 6px", lineHeight: 1.5,
                    }}>
                      {name}
                    </span>
                  ))}
                  {muscles.length > 3 && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: C.muted, padding: "2px 2px", lineHeight: 1.5 }}>
                      +{muscles.length - 3}
                    </span>
                  )}
                </div>
              );
            })()}
            pct={recovScore}
            onTap={onGoHealth || onGoBody}
            cta={recovScore == null ? "Log sleep + training" : null}
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

      {/* ══ 4c1b. BEDTIME WINDOW — shows 3pm→2am; countdown when within 90 min ════ */}
      {tp.sleep !== false && sleepInfo.rec?.recBed != null && (() => {
        const h = new Date().getHours();
        if (h >= 3 && h < 15) return null;            // hide 3am→3pm, show 3pm→2:59am
        const rec = sleepInfo.rec;
        const nowMin = h * 60 + new Date().getMinutes();
        const bedMin  = ((rec.recBed         % 1440) + 1440) % 1440;
        const cafCutMin = rec.caffeineCutoff != null ? ((rec.caffeineCutoff % 1440) + 1440) % 1440 : null;
        const cafInFuture = cafCutMin != null && ((cafCutMin - nowMin + 1440) % 1440) < 720;
        const minsToBed   = ((bedMin - nowMin + 1440) % 1440);
        const imminent    = minsToBed <= 90;           // within 90 min of bedtime
        const bedStr = minToTimeStr(rec.recBed);
        const cafStr = cafCutMin != null ? minToTimeStr(rec.caffeineCutoff) : null;
        const clr = imminent ? C.coral : SLEEP_CLR;
        const countdownLabel = minsToBed < 60
          ? `${minsToBed}m`
          : `${Math.floor(minsToBed / 60)}h ${minsToBed % 60}m`;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: clr + "0D", border: `1px solid ${clr}33`, borderRadius: 14, padding: "9px 13px", marginTop: 8 }}>
            <Moon size={14} color={clr} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              {imminent ? (
                <span style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.4 }}>
                  <strong style={{ color: clr }}>Bed in {countdownLabel}</strong> — wind down now
                </span>
              ) : (
                <span style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.4 }}>
                  Target bedtime tonight: <strong style={{ color: SLEEP_CLR }}>{bedStr}</strong>
                  {rec.payDown > 0 && ` (inc. ${Math.round(rec.payDown)}min debt paydown)`}
                </span>
              )}
              {cafInFuture && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  Last caffeine by {cafStr} for best sleep
                </div>
              )}
            </div>
            {imminent && (
              <span style={{ fontSize: 10, fontWeight: 800, color: clr, background: clr + "18", borderRadius: 5, padding: "3px 7px", flexShrink: 0, whiteSpace: "nowrap" }}>
                {bedStr}
              </span>
            )}
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
          <button className="sprig-pop sprig-tap" onClick={() => { onGoSleep?.(); buzz("tap"); }}
            style={{
              width: "100%", display: "flex", alignItems: "flex-start", gap: 9,
              background: clr + "0E", border: `1px solid ${clr}2A`,
              borderRadius: 14, padding: "9px 13px", marginTop: 8,
              cursor: onGoSleep ? "pointer" : "default",
              fontFamily: "DM Sans", textAlign: "left",
            }}>
            <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.5 }}>🍺</span>
            <div style={{ flex: 1, minWidth: 0 }}>
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
            {onGoSleep && <ChevronRight size={13} color={C.muted} style={{ flexShrink: 0, marginTop: 2 }} />}
          </button>
        );
      })()}

      {/* ══ 4c2. RECOVERY LIMITERS — why the recovery score is below peak ════ */}
      {recoveryInfo?.limiters?.length > 0 && (recoveryInfo.score ?? 100) < 80 && (() => {
        const recNavFn = onGoHealth || onGoBody;
        return (
          <button className="sprig-tap" onClick={() => { recNavFn?.(); buzz("tap"); }}
            style={{ width: "100%", background: RECOV_CLR + "0E", border: `1px solid ${RECOV_CLR}2A`, borderRadius: 14, padding: "10px 14px", marginTop: 8, cursor: recNavFn ? "pointer" : "default", fontFamily: "DM Sans", textAlign: "left" }}>
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
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                {recoveryInfo.bestAction && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: recoveryInfo.score >= 70 ? C.greenSoft : recoveryInfo.score >= 45 ? C.amber : C.coral }}>
                    → {recoveryInfo.bestAction}
                  </span>
                )}
                {recNavFn && <ChevronRight size={11} color={C.muted} />}
              </div>
            </div>
            {recoveryInfo.limiters.map((l, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, ...(i > 0 ? { marginTop: 4 } : {}) }}>
                <span style={{ fontSize: 11, color: RECOV_CLR, flexShrink: 0, lineHeight: 1.45, fontWeight: 700 }}>·</span>
                <span style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>{l}</span>
              </div>
            ))}
          </button>
        );
      })()}

      {/* ══ 4c2b. RECOVERY HELPERS — what's going right (shown when score is high) ════ */}
      {recoveryInfo?.helpers?.length > 0 && (recoveryInfo.score ?? 0) >= 80 && (() => {
        const helperNavFn = onGoHealth || onGoBody;
        return (
          <button className="sprig-pop sprig-tap" onClick={() => { helperNavFn?.(); buzz("tap"); }}
            style={{ width: "100%", background: C.greenSoft + "12", border: `1px solid ${C.greenSoft}2A`, borderRadius: 14, padding: "10px 14px", marginTop: 8, cursor: helperNavFn ? "pointer" : "default", fontFamily: "DM Sans", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: C.greenSoft, textTransform: "uppercase", letterSpacing: 0.4 }}>What's working</span>
              {recoveryInfo.confidence === "High" && (
                <span style={{ fontSize: 9, fontWeight: 700, color: C.greenSoft, background: C.greenSoft + "18", borderRadius: 5, padding: "2px 6px", letterSpacing: 0.3, textTransform: "uppercase" }}>
                  High confidence
                </span>
              )}
              {recoveryInfo.label && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.greenSoft, background: C.greenSoft + "18", borderRadius: 6, padding: "1px 7px" }}>
                  {recoveryInfo.label}
                </span>
              )}
              {helperNavFn && <ChevronRight size={11} color={C.greenSoft} style={{ marginLeft: "auto", flexShrink: 0 }} />}
            </div>
            {recoveryInfo.helpers.slice(0, 3).map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, ...(i > 0 ? { marginTop: 4 } : {}) }}>
                <span style={{ fontSize: 11, color: C.greenSoft, flexShrink: 0, lineHeight: 1.45, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>{h}</span>
              </div>
            ))}
          </button>
        );
      })()}

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
          {onGoTrain && (
            <button className="sprig-tap" onClick={() => { onGoTrain(); buzz("tap"); }}
              style={{ marginTop: 9, width: "100%", background: C.amber + "18", border: `1px solid ${C.amber}44`, borderRadius: 9, padding: "7px 0", fontSize: 11.5, fontWeight: 700, color: C.amber, cursor: "pointer", fontFamily: "DM Sans", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              Adjust training plan <ChevronRight size={12} color={C.amber} />
            </button>
          )}
        </div>
      )}

      {/* ══ 4c3c. SOFT DELOAD HINT — progress stall detected, less severe than full deload card ════ */}
      {tp.training !== false && trainInfo?.deload?.suggest && !recoveryInfo?.recoveryWeek && trainInfo.deload.reasons?.length > 0 && (
        <button className="sprig-pop sprig-tap" onClick={() => { onGoTrain?.(); buzz("tap"); }}
          style={{
            width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
            background: C.amber + "0A", border: `1px solid ${C.amber}2E`,
            borderRadius: 14, padding: "10px 14px", marginTop: 8,
            cursor: onGoTrain ? "pointer" : "default", fontFamily: "DM Sans", textAlign: "left",
          }}>
          <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.7 }}>📉</span>
          <div style={{ flex: 1, minWidth: 0 }}>
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
          {onGoTrain && <ChevronRight size={12} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />}
        </button>
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
          <button className="sprig-pop sprig-tap" onClick={() => { onGoTrain?.(); buzz("tap"); }}
            style={{
              width: "100%", display: "flex", alignItems: "flex-start", gap: 10,
              background: clr + "0E", border: `1px solid ${clr}2A`,
              borderRadius: 14, padding: "10px 14px", marginTop: 8,
              cursor: onGoTrain ? "pointer" : "default",
              fontFamily: "DM Sans", textAlign: "left",
            }}>
            <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.6 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: clr, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>
                {title}
              </div>
              <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.45 }}>
                {rec.text}
              </div>
            </div>
            {onGoTrain && <ChevronRight size={13} color={C.muted} style={{ flexShrink: 0, marginTop: 2 }} />}
          </button>
        );
      })()}

      {/* ══ 4c4. ACTIVE RECOVERY SUGGESTION ══════════════════════════ */}
      {recoveryInfo?.suggestActiveRecovery && !recoveryInfo?.recoveryWeek && (
        <button className="sprig-pop sprig-tap" onClick={() => { (onGoTrain || onStartWorkout)?.(); buzz("tap"); }}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, background: RECOV_CLR + "0D", border: `1px solid ${RECOV_CLR}33`, borderRadius: 14, padding: "10px 14px", marginTop: 8, cursor: (onGoTrain || onStartWorkout) ? "pointer" : "default", fontFamily: "DM Sans", textAlign: "left" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: RECOV_CLR + "22", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Activity size={14} color={RECOV_CLR} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: RECOV_CLR, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>Active recovery day</div>
            <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.4 }}>Skip lifting — a walk or easy mobility session will help you bounce back faster.</div>
          </div>
          {(onGoTrain || onStartWorkout) && <ChevronRight size={13} color={C.muted} style={{ flexShrink: 0 }} />}
        </button>
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
              const readyIn = remainH > 0 && remainH < 72
                ? `~${Math.round(remainH)}h`
                : remainH >= 72
                  ? `~${Math.round(remainH / 24)}d`
                  : null;
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

      {/* ══ 4c8. STRENGTH RANKING — relative strength vs same-sex population (ranking()) ═══ */}
      {tp.training !== false && trainInfo?.ranking && (() => {
        const PRIMARY = [
          { key: "chest",      label: "Bench",    icon: "🏋️" },
          { key: "quads",      label: "Squat",    icon: "🦵" },
          { key: "hamstrings", label: "Deadlift", icon: "💪" },
        ];
        const tiles = PRIMARY.map(p => {
          const r = trainInfo.ranking[p.key];
          return r?.hasData ? { ...p, ...r } : null;
        }).filter(Boolean);
        if (tiles.length === 0) return null;
        return (
          <div className="sprig-pop" style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.line}`, padding: "12px 14px", marginTop: 8, boxShadow: C.shadow }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 9 }}>
              🏆 Strength level
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {tiles.map(tile => {
                const clr = tile.tier.color;
                const topPct = Math.round(100 - tile.pct);
                return (
                  <div key={tile.key} style={{ flex: 1, background: clr + "10", border: `1px solid ${clr}30`, borderRadius: 11, padding: "8px 9px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, lineHeight: 1 }}>{tile.icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, lineHeight: 1 }}>{tile.label}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, fontFamily: "Fraunces, serif", lineHeight: 1.1 }}>
                      {tile.e1}<span style={{ fontSize: 9, fontWeight: 600, color: C.muted, marginLeft: 1 }}>kg</span>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: clr + "22", borderRadius: 5, padding: "2px 6px", marginTop: 4 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: clr }}>{tile.tier.name}</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 3, fontWeight: 600 }}>
                      Top {topPct}%{tile.estimated ? " ~" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 8, lineHeight: 1.4, textAlign: "center" }}>
              Relative to bodyweight · same-sex population
            </div>
          </div>
        );
      })()}

      {/* ══ 4c9. RECENT PRs — last 3 personal records from detectPRs() ══ */}
      {tp.training !== false && trainInfo?.recentPRs?.length > 0 && (() => {
        const prs = trainInfo.recentPRs;
        const now = Date.now();
        const ageLabel = (ts) => {
          const days = Math.floor((now - ts) / 86400000);
          if (days === 0) return "today";
          if (days === 1) return "yesterday";
          if (days < 7) return `${days}d ago`;
          if (days < 30) return `${Math.floor(days / 7)}w ago`;
          return `${Math.floor(days / 30)}mo ago`;
        };
        return (
          <div className="sprig-pop" style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.line}`, padding: "12px 14px", marginTop: 8, boxShadow: C.shadow }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 9 }}>
              🎖️ Recent PRs
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {prs.map((pr, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: C.amber + "18", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 13, lineHeight: 1 }}>🏋️</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pr.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.3, marginTop: 1 }}>
                      {pr.w}kg × {pr.reps} rep{pr.reps !== 1 ? "s" : ""} · 1RM ~{pr.e1}kg
                    </div>
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: C.amber, background: C.amber + "18", borderRadius: 5, padding: "2px 6px", flexShrink: 0 }}>
                    {ageLabel(pr.ts)}
                  </div>
                </div>
              ))}
            </div>
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
          <button className="sprig-pop sprig-tap" onClick={() => { onGoNutrition?.(); buzz("tap"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, background: C.card, borderRadius: 14, padding: "10px 14px", border: `1px solid ${C.green}33`, marginTop: 8, boxShadow: C.shadow, cursor: "pointer", fontFamily: "DM Sans", textAlign: "left" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.green + "18", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <TrendingUp size={14} color={C.greenSoft} />
            </div>
            <span style={{ fontSize: 12.5, color: C.inkSoft, flex: 1, lineHeight: 1.4 }}>{ct.message}</span>
            <ChevronRight size={13} color={C.muted} style={{ flexShrink: 0 }} />
          </button>
        );
        return (
          <button className="sprig-pop sprig-tap" onClick={() => { onGoNutrition?.(); buzz("tap"); }} style={{ width: "100%", background: C.card, borderRadius: 14, padding: "12px 14px", border: `1px solid ${C.amber}33`, marginTop: 8, boxShadow: C.shadow, cursor: "pointer", fontFamily: "DM Sans", textAlign: "left" }}>
            <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.2 }}>⚖️</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.4 }}>Weight trend</div>
                  <ChevronRight size={12} color={C.muted} />
                </div>
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
          </button>
        );
      })()}

      {/* ══ 4d1b. PROTEIN REMAINING NUDGE — shown when under 90% of protein goal ══ */}
      {tp.nutrition !== false && t.calories > 100 && (targets.protein || 0) > 0 && (t.protein || 0) < targets.protein * 0.9 && (() => {
        const needed  = Math.round(targets.protein - (t.protein || 0));
        const pctHit  = Math.round((t.protein || 0) / targets.protein * 100);
        const clr     = pctHit < 50 ? C.coral : C.amber;
        return (
          <button className="sprig-tap" onClick={() => { onGoNutrition?.(); buzz("tap"); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, background: clr + "0E", border: `1px solid ${clr}28`, borderRadius: 12, padding: "8px 12px", marginTop: 8, cursor: "pointer", fontFamily: "DM Sans", textAlign: "left" }}>
            <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>💪</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: clr }}>{needed}g protein still needed</span>
              <span style={{ fontSize: 11, color: C.inkSoft }}> · {Math.round(t.protein || 0)}g / {targets.protein}g today</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: clr, background: clr + "18", borderRadius: 5, padding: "3px 7px" }}>{pctHit}%</span>
              <ChevronRight size={12} color={clr} />
            </div>
          </button>
        );
      })()}

      {/* ══ 4d1c. MACRO SNAPSHOT — compact full macro picture at a glance ══ */}
      {tp.nutrition !== false && t.calories > 50 && (t.carbs > 0 || t.fat > 0 || t.fiber > 0) && (() => {
        // Estimate carb/fat targets from calorie goal when not explicitly set
        // Remaining calories after protein → 65% carbs / 35% fat (standard balanced split)
        const estCarbTarget = (() => {
          if (!(targets.calories > 0)) return 0;
          const protCal = (targets.protein || 0) * 4;
          const rem = Math.max(0, targets.calories - protCal);
          return rem > 0 ? Math.round(rem * 0.65 / 4) : 0;
        })();
        const estFatTarget = (() => {
          if (!(targets.calories > 0)) return 0;
          const protCal = (targets.protein || 0) * 4;
          const rem = Math.max(0, targets.calories - protCal);
          return rem > 0 ? Math.round(rem * 0.35 / 9) : 0;
        })();
        const macros = [
          { key: "cal",     label: "Cal",     value: Math.round(t.calories || 0), target: targets.calories || 0, unit: "kcal", clr: NUTR_CLR,    est: false },
          { key: "protein", label: "Protein", value: Math.round(t.protein  || 0), target: targets.protein  || 0, unit: "g",    clr: C.coral,     est: false },
          { key: "carbs",   label: "Carbs",   value: Math.round(t.carbs    || 0), target: estCarbTarget,          unit: "g",    clr: C.amber,     est: estCarbTarget > 0 },
          { key: "fat",     label: "Fat",     value: Math.round(t.fat      || 0), target: estFatTarget,           unit: "g",    clr: C.muted,     est: estFatTarget > 0  },
          { key: "fiber",   label: "Fiber",   value: Math.round(t.fiber    || 0), target: targets.fiber    || 0, unit: "g",    clr: C.greenSoft, est: false },
        ];
        return (
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${NUTR_CLR}22`, padding: "11px 13px", marginTop: 8, boxShadow: C.shadow }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 9 }}>Macros today</div>
            <div style={{ display: "flex", gap: 4 }}>
              {macros.map(({ key, label, value, target, unit, clr, est }) => {
                const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : -1;
                const overGoal = target > 0 && value > target * 1.15; // 15% grace on estimated targets
                const barClr = overGoal ? C.coral : clr;
                return (
                  <div key={key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" }}>{label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: overGoal ? C.coral : clr, lineHeight: 1.1 }}>{value}</div>
                    <div style={{ fontSize: 8.5, color: C.muted, lineHeight: 1 }}>
                      {target > 0 ? `${est ? "~" : "/ "}${target}` : unit}
                    </div>
                    {target > 0 && (
                      <>
                        <div style={{ width: "100%", height: 3, background: clr + "22", borderRadius: 99, marginTop: 3, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: barClr, borderRadius: 99, transition: "width .6s cubic-bezier(.34,1.56,.64,1)" }} />
                        </div>
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: overGoal ? C.coral : (pct >= 85 ? C.greenSoft : C.muted) }}>{pct}%</div>
                      </>
                    )}
                  </div>
                );
              })}
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
              {dq?.advice?.length > 0 && !dq.noData && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  {dq.advice.slice(0, 3).map((tip, i) => (
                    <span key={i} style={{
                      fontSize: 9.5, fontWeight: 700, color: NUTR_CLR,
                      background: NUTR_CLR + "12", borderRadius: 5, padding: "2px 7px",
                    }}>
                      + {tip}
                    </span>
                  ))}
                </div>
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
        const topClr  = top.score >= 65 ? C.greenSoft : top.score >= 40 ? C.amber : C.coral;
        const gapClr  = gap.score < 40 ? C.coral : gap.score < 65 ? C.amber : C.greenSoft;
        const gapLabel = gap.score < 40 ? "Critical gap" : gap.score < 65 ? "Needs fuel" : "All on track";
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
              <div style={{ flex: 1, background: topClr + "10", borderRadius: 10, padding: "6px 10px" }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: topClr, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>Top fuel</div>
                <div style={{ fontSize: 11, color: C.inkSoft }}>{top.emoji} {top.label} · {top.score}</div>
              </div>
              <div style={{ flex: 1, background: gapClr + "10", borderRadius: 10, padding: "6px 10px" }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: gapClr, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>{gapLabel}</div>
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
        if (!scored.length) return null;

        const avgScore = Math.round(scored.reduce((s, e) => s + e.score, 0) / scored.length);
        const avgClr   = avgScore >= 65 ? C.greenSoft : avgScore >= 40 ? C.amber : C.coral;
        const show     = scored.slice(0, 5);     // max 5 entries
        const avgLabel = scored.length === 1 ? "score" : "avg";

        return (
          <div className="sprig-pop" style={{ background: C.card, borderRadius: 16, border: `1px solid ${NUTR_CLR}22`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>🥗</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: NUTR_CLR, textTransform: "uppercase", letterSpacing: 0.5 }}>Food quality</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 9.5, color: C.muted }}>{avgLabel}</span>
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
              onGoTrain ? (
                <button className="sprig-tap" onClick={() => { onGoTrain(); buzz("tap"); }}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "DM Sans", textAlign: "left", marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 10.5, color: C.amber, lineHeight: 1.4 }}>⚡ Not hit this week: {neglected.map(m => m.label).join(" · ")}</span>
                  <ChevronRight size={10} color={C.amber} style={{ flexShrink: 0 }} />
                </button>
              ) : (
                <div style={{ fontSize: 10.5, color: C.amber, marginTop: 4, lineHeight: 1.4 }}>
                  ⚡ Not hit this week: {neglected.map(m => m.label).join(" · ")}
                </div>
              )
            )}
            {(() => {
              const over = items.filter(m => volumeStatus(m.sets, m.key).tag === "over");
              if (!over.length) return null;
              return onGoTrain ? (
                <button className="sprig-tap" onClick={() => { onGoTrain(); buzz("tap"); }}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "DM Sans", textAlign: "left", marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 10.5, color: C.coral, lineHeight: 1.4 }}>⚠ Too many sets: {over.map(m => m.label).join(" · ")} — trim junk volume</span>
                  <ChevronRight size={10} color={C.coral} style={{ flexShrink: 0 }} />
                </button>
              ) : (
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
                {onStartWorkout && (
                  <button className="sprig-tap" onClick={() => { onStartWorkout(); buzz("medium"); }}
                    style={{ marginLeft: "auto", background: C.greenSoft + "18", border: `1px solid ${C.greenSoft}33`, borderRadius: 7, padding: "3px 10px", fontSize: 10, fontWeight: 800, color: C.greenSoft, cursor: "pointer", fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                    Train <ChevronRight size={9} color={C.greenSoft} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ 4a. TONIGHT PLAN CARD (evening, 20:00+) ════════════════════ */}
      {tp.sleep !== false && moveInfo?.tonight && (() => {
        const h = new Date().getHours();
        if (h < 20) return null;
        return <TonightPlanCard plan={moveInfo.tonight} onGoSleep={onGoSleep} />;
      })()}

      {/* ══ 4ab. NEXT WORKOUT SUGGESTION (no workout today) ════════════ */}
      {tp.training !== false && !dtTrainSrc && trainInfo?.suggestion?.type !== "rest" && (moveInfo?.nextWorkout || trainInfo?.suggestion?.label) && (
        <NextWorkoutCard
          suggestion={moveInfo?.nextWorkout || null}
          splitLabel={trainInfo?.suggestion?.label || null}
          splitReason={trainInfo?.suggestion?.reason || null}
          splitRoutine={trainInfo?.suggestion?.routine || null}
          onStart={() => { onStartWorkout?.(trainInfo?.suggestion?.routine || null); buzz("tap"); }}
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
          <button className="sprig-tap" onClick={() => { (onGoTrain || onStartWorkout)?.(); buzz("tap"); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              background: C.greenSoft + "0D", border: `1px solid ${C.greenSoft}2A`,
              borderRadius: 14, padding: "9px 14px", marginTop: 8,
              cursor: (onGoTrain || onStartWorkout) ? "pointer" : "default",
              fontFamily: "DM Sans", textAlign: "left",
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
            {(onGoTrain || onStartWorkout) && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, background: C.greenSoft + "18", border: `1px solid ${C.greenSoft}33`, borderRadius: 7, padding: "4px 9px", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: C.greenSoft }}>Train</span>
                <ChevronRight size={9} color={C.greenSoft} />
              </div>
            )}
          </button>
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
      {tp.water !== false && (() => {
        const waterGoalHit = (waterGoal > 0 && waterMl >= waterGoal) || dtWaterSrc === "quick_log";
        const PER_GLASS    = 250;
        const totalGlasses = Math.min(10, Math.round(waterGoal / PER_GLASS));
        const doneGlasses  = Math.min(totalGlasses, Math.floor(waterMl / PER_GLASS));
        const remaining    = Math.max(0, totalGlasses - doneGlasses);
        return (
          <div style={{
            background: C.card, borderRadius: 18,
            border: `1px solid ${waterGoalHit ? WATER_CLR + "44" : C.line}`, marginTop: 8,
            padding: "12px 14px", boxShadow: C.shadow,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (waterMl > 0 || waterGoalHit) ? 9 : waterGoal > 0 ? 6 : 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: WATER_CLR + (waterGoalHit ? "28" : "1A"), display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Droplets size={15} color={WATER_CLR} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Water</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: waterGoalHit ? WATER_CLR : C.ink }}>
                  {waterGoalHit
                    ? (dtWaterSrc === "quick_log" && waterMl === 0 ? "Goal hit · Quick logged" : `${(waterMl / 1000).toFixed(1)}L — hydrated ✓`)
                    : waterMl === 0
                      ? waterGoal > 0
                        ? `Goal: ${(waterGoal / 1000).toFixed(1)}L today`
                        : "Log water today"
                      : waterGoal > 0
                        ? `${(waterMl / 1000).toFixed(1)}L / ${(waterGoal / 1000).toFixed(1)}L`
                        : `${(waterMl / 1000).toFixed(1)}L today`}
                </div>
              </div>
              {/* Buttons: hide when goal is already hit; show small +more otherwise */}
              {waterGoalHit ? (
                <button className="sprig-tap"
                  onClick={() => { onDaily({ water: waterMl + 250 }); buzz("light"); if (onToast) onToast("Added 250ml ✓"); }}
                  style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 11px", fontSize: 11, fontWeight: 700, color: C.inkSoft, cursor: "pointer", fontFamily: "DM Sans", flexShrink: 0 }}>
                  +more
                </button>
              ) : (
                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  <button className="sprig-tap"
                    onClick={() => { onDaily({ water: waterMl + 250 }); buzz("light"); if (onToast) onToast("Added 250ml water ✓"); }}
                    style={{ background: WATER_CLR + "1A", border: `1px solid ${WATER_CLR}33`, borderRadius: 9, padding: "8px 10px", fontSize: 12, fontWeight: 700, color: WATER_CLR, cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap" }}>
                    +250
                  </button>
                  {waterGoal - waterMl <= 750 ? (
                    /* ── "Hit goal" shortcut — replaces +500 when within 750ml ── */
                    <button className="sprig-tap"
                      onClick={() => { onDaily({ water: waterGoal }); buzz("success"); if (onToast) onToast("Hydration goal hit! 💧"); }}
                      style={{ background: WATER_CLR + "28", border: `1px solid ${WATER_CLR}55`, borderRadius: 9, padding: "8px 10px", fontSize: 11, fontWeight: 800, color: WATER_CLR, cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap" }}>
                      💧 +{waterGoal - waterMl}ml
                    </button>
                  ) : (
                    <button className="sprig-tap"
                      onClick={() => { onDaily({ water: waterMl + 500 }); buzz("light"); if (onToast) onToast("Added 500ml water ✓"); }}
                      style={{ background: WATER_CLR + "28", border: `1px solid ${WATER_CLR}55`, borderRadius: 9, padding: "8px 10px", fontSize: 12, fontWeight: 700, color: WATER_CLR, cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap" }}>
                      +500
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Progress bar */}
            {waterMl > 0 && !waterGoalHit && waterGoal > 0 && (
              <div style={{ height: 5, background: C.bg2, borderRadius: 9, marginBottom: 8 }}>
                <div style={{
                  height: "100%", borderRadius: 9, background: WATER_CLR + "AA",
                  width: `${Math.min(100, Math.round(waterMl / waterGoal * 100))}%`,
                  transition: "width .4s",
                }} />
              </div>
            )}
            {/* Goal achieved celebration row */}
            {waterGoalHit && (
              <div className="sprig-pop" style={{ display: "flex", alignItems: "center", gap: 8, background: WATER_CLR + "12", border: `1px solid ${WATER_CLR}33`, borderRadius: 10, padding: "8px 11px", marginBottom: 0 }}>
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>💧</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: WATER_CLR }}>Hydration goal reached!</div>
                  <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 1 }}>
                    {dtWaterSrc === "quick_log" && waterMl === 0
                      ? "Quick logged ✓"
                      : totalGlasses > 0
                        ? `${totalGlasses} glass${totalGlasses !== 1 ? "es" : ""} · ${(waterMl / 1000).toFixed(1)}L today`
                        : `${(waterMl / 1000).toFixed(1)}L today`}
                  </div>
                </div>
              </div>
            )}
            {/* Glass counter — only shown when not yet at goal */}
            {waterGoal > 0 && !waterGoalHit && (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ display: "flex", gap: 3, flex: 1, flexWrap: "wrap" }}>
                  {Array.from({ length: totalGlasses }).map((_, i) => (
                    <div key={i} style={{
                      width: 13, height: 17, borderRadius: 3, flexShrink: 0,
                      background: i < doneGlasses ? WATER_CLR : WATER_CLR + "22",
                      border: `1.5px solid ${i < doneGlasses ? WATER_CLR + "99" : WATER_CLR + "28"}`,
                      transition: "background .3s, border-color .3s",
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, flexShrink: 0 }}>
                  {remaining} glass{remaining !== 1 ? "es" : ""} to go
                </span>
              </div>
            )}
            {/* Smart hydration note */}
            {moveInfo?.hydration?.note && waterMl > 0 && !waterGoalHit && (
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.4 }}>
                {moveInfo.hydration.note}
              </div>
            )}
            {/* Electrolytes warning */}
            {nutriInfo?.needsElectrolytes && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                <span style={{ fontSize: 12, lineHeight: 1 }}>⚡</span>
                <span style={{ fontSize: 11.5, color: C.amber, lineHeight: 1.4 }}>Add electrolytes — you've sweated a lot today.</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ 6. STEPS STRIP ═══════════════════════════════════════ */}
      {tp.movement !== false && dtMoveSrc !== "quick_log" && (
        <div style={{
          background: C.card, borderRadius: 18,
          border: `1px solid ${C.line}`, marginTop: 8,
          padding: "12px 14px", boxShadow: C.shadow,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (steps > 0 || stepsEditing) ? 9 : 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: C.green + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Activity size={15} color={C.greenSoft} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Steps</div>
              <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0 6px" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                  {steps > 0
                    ? `${steps.toLocaleString()} / ${sGoal.toLocaleString()}`
                    : `Goal: ${sGoal.toLocaleString()} steps`}
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
            steps >= sGoal ? (
              /* ── Goal achieved — celebrate, hide clutter buttons ── */
              <div className="sprig-pop" style={{ display: "flex", alignItems: "center", gap: 10, background: C.greenSoft + "12", border: `1px solid ${C.greenSoft}33`, borderRadius: 12, padding: "10px 13px" }}>
                <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.greenSoft }}>Step goal crushed!</div>
                  <div style={{ fontSize: 11, color: C.inkSoft, marginTop: 1 }}>
                    {steps.toLocaleString()} steps{moveInfo?.movement?.kcal > 0 ? ` · ~${moveInfo.movement.kcal} kcal burned` : ""}
                  </div>
                </div>
                <button className="sprig-tap" onClick={() => { setStepsInput(String(steps || "")); setStepsEditing(true); }}
                  style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 11px", fontSize: 11, fontWeight: 700, color: C.inkSoft, cursor: "pointer", fontFamily: "DM Sans", flexShrink: 0 }}>
                  Edit
                </button>
              </div>
            ) : (
              /* ── Still working toward goal — show add buttons ── */
              <div style={{ display: "flex", gap: 6 }}>
                <button className="sprig-tap" onClick={() => { onDaily({ steps: steps + 1000 }); buzz("light"); }}
                  style={{ ...btn(C.bg2, C.green), flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700 }}>+1K</button>
                <button className="sprig-tap" onClick={() => { onDaily({ steps: steps + 2000 }); buzz("light"); }}
                  style={{ ...btn(C.bg2, C.green), flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700 }}>+2K</button>
                {sGoal - steps > 0 && sGoal - steps <= 3000 ? (
                  /* ── "Hit goal" shortcut — replaces +5K when within reach ── */
                  <button className="sprig-tap"
                    onClick={() => { onDaily({ steps: sGoal }); buzz("success"); if (onToast) onToast("Step goal hit! 🏆"); }}
                    style={{ ...btn(C.greenSoft + "22", C.greenSoft), flex: 2, padding: "9px 0", fontSize: 12, fontWeight: 800, border: `1px solid ${C.greenSoft}44` }}>
                    🏆 +{(sGoal - steps).toLocaleString()}
                  </button>
                ) : (
                  <button className="sprig-tap" onClick={() => { onDaily({ steps: steps + 5000 }); buzz("light"); }}
                    style={{ ...btn(C.bg2, C.greenSoft), flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700 }}>+5K</button>
                )}
                <button className="sprig-tap" onClick={() => { setStepsInput(String(steps || "")); setStepsEditing(true); }}
                  style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 700 }}>Set</button>
              </div>
            )
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

      {/* ══ 6.4. PROGRESS PHOTO NUDGE — reminds every 14 days ══════ */}
      {tp.body !== false && onGoBody && (() => {
        const nudge = photoReminder(photoLog);
        if (!nudge.due) return null;
        return (
          <div className="sprig-pop" style={{
            display: "flex", alignItems: "center", gap: 10,
            background: C.coral + "08", border: `1px solid ${C.coral}25`,
            borderRadius: 14, padding: "10px 14px", marginTop: 8,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>📸</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.coral, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>
                Progress photos
              </div>
              <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.4 }}>
                {nudge.text}
              </div>
            </div>
            <button onClick={onGoBody} style={{
              border: "none", cursor: "pointer", flexShrink: 0,
              background: C.coral + "18", color: C.coral,
              fontSize: 10.5, fontWeight: 800, borderRadius: 8, padding: "5px 10px",
            }}>
              Log →
            </button>
          </div>
        );
      })()}

      {/* ══ 6.45. BODY MEASUREMENTS CHANGE — measurementStats() ══════════ */}
      {tp.body !== false && measureStats && (() => {
        const MEASURE_LABEL = { waist: "Waist", chest: "Chest", shoulders: "Shoulders", arms: "Arms", thighs: "Thighs", calves: "Calves", neck: "Neck" };
        const entries = Object.entries(measureStats).filter(([, v]) => v?.current != null);
        if (!entries.length) return null;
        const withChange = entries.filter(([, v]) => v.change != null && Math.abs(v.change) >= 0.5);
        const shown = withChange.length ? withChange.slice(0, 4) : entries.slice(0, 4);
        return (
          <div className="sprig-pop" style={{
            background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 16, padding: "11px 14px", marginTop: 8, boxShadow: C.shadow,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                📏 Body measurements
              </div>
              {onGoBody && (
                <button onClick={onGoBody} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, color: C.muted, padding: 0 }}>
                  Update →
                </button>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 10px" }}>
              {shown.map(([k, v]) => {
                const delta = v.change;
                const isGood = delta !== null && ((k === "waist" || k === "thighs" || k === "neck") ? delta < 0 : delta > 0);
                const isBad  = delta !== null && ((k === "waist" || k === "thighs" || k === "neck") ? delta > 0 : delta < 0);
                const deltaColor = isGood ? C.greenSoft : isBad ? C.coral : C.muted;
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 9.5, color: C.muted, marginBottom: 1 }}>{MEASURE_LABEL[k] || k}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, lineHeight: 1 }}>
                        {v.current}<span style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>cm</span>
                        {delta !== null && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: deltaColor, marginLeft: 5 }}>
                            {delta > 0 ? "+" : ""}{delta}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ══ 6.5. SUPPLEMENT STRIP ════════════════════════════════════ */}
      {supps && supps.length > 0 && (() => {
        const taken    = supps.filter(s => takenIds.includes(s.id));
        const allTaken = taken.length === supps.length;
        const SUPP_CLR = "#52C878";
        return (
          <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${allTaken ? SUPP_CLR + "44" : C.line}`, marginTop: 8, padding: "12px 14px", boxShadow: C.shadow }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: allTaken ? SUPP_CLR + "28" : SUPP_CLR + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Pill size={15} color={SUPP_CLR} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Daily Stack</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: allTaken ? SUPP_CLR : C.ink }}>
                  {allTaken ? "All taken today ✓" : `${taken.length} / ${supps.length} taken`}
                </div>
              </div>
              {!allTaken && (
                <button className="sprig-tap"
                  onClick={() => { supps.forEach(s => { if (!takenIds.includes(s.id)) onToggleSupp?.(s.id); }); buzz("light"); if (onToast) onToast(`All ${supps.length} supplements logged ✓`); }}
                  style={{ background: SUPP_CLR + "18", border: `1px solid ${SUPP_CLR}44`, borderRadius: 9, padding: "7px 12px", fontSize: 12, fontWeight: 700, color: SUPP_CLR, cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap", flexShrink: 0 }}>
                  Log all
                </button>
              )}
            </div>
            {/* Celebration card when all taken */}
            {allTaken && (
              <div className="sprig-pop" style={{
                display: "flex", alignItems: "center", gap: 8,
                background: SUPP_CLR + "12", border: `1px solid ${SUPP_CLR}33`,
                borderRadius: 10, padding: "8px 11px", marginBottom: 8,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>💊</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: SUPP_CLR }}>Daily stack complete!</div>
                  <div style={{ fontSize: 10.5, color: C.inkSoft, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {supps.map(s => s.name).join(" · ")}
                  </div>
                </div>
              </div>
            )}
            {/* Individual supplement chips — tap to toggle each one */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {supps.map((s) => {
                const isTaken = takenIds.includes(s.id);
                const chipName = (s.name || "").length > 14 ? (s.name || "").slice(0, 13) + "…" : (s.name || "Supplement");
                const doseLabel = s.dose ? ` ${s.dose}${s.unit || ""}` : "";
                return (
                  <button key={s.id} className="sprig-tap"
                    onClick={() => { onToggleSupp?.(s.id); buzz(isTaken ? "tap" : "light"); if (onToast && !isTaken) onToast(`${s.name} ✓`); }}
                    style={{
                      background: isTaken ? SUPP_CLR + "1A" : C.bg2,
                      border: `1.5px solid ${isTaken ? SUPP_CLR + "55" : C.line}`,
                      borderRadius: 10, padding: "6px 11px",
                      display: "flex", alignItems: "center", gap: 5,
                      cursor: "pointer", fontFamily: "DM Sans",
                      transition: "background .15s, border-color .15s",
                    }}>
                    <span style={{ fontSize: 12, lineHeight: 1 }}>{isTaken ? "✅" : "⬜"}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: isTaken ? SUPP_CLR : C.inkSoft }}>
                      {chipName}{doseLabel && <span style={{ fontWeight: 500, color: C.muted }}>{doseLabel}</span>}
                    </span>
                  </button>
                );
              })}
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

      {/* ══ 8b. PATTERN INSIGHTS — behavioral correlations (patternDetection) ══ */}
      {patterns?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, paddingLeft: 2 }}>
            💡 Your patterns
          </div>
          {patterns.map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              background: C.card, border: `1px solid ${C.line}`,
              borderRadius: 12, padding: "9px 12px",
              marginBottom: i < patterns.length - 1 ? 6 : 0,
            }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                {p.kind === "alcohol_sleep" ? "🍷" : p.kind === "steps_mood" ? "🚶" : p.kind === "pain_exercise" ? "⚠️" : "🔍"}
              </span>
              <span style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.5 }}>{p.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* ══ 8c. WEEKLY WRAP — stats strip + top win + priority for next 7 days ══ */}
      {weekReport?.hasData && (() => {
        const dayOfWeek = new Date().getDay(); // 0=Sun, show from Wednesday onward
        const enoughWeek = dayOfWeek >= 3 || dayOfWeek === 0; // Wed-Sat or Sunday
        if (!enoughWeek) return null;
        if (!weekReport.win && !weekReport.nextWeek) return null;
        const { training, sleep, nutrition, mind } = weekReport;
        // Build stats strip: only show what we actually have data for
        const stats = [];
        if (tp.training !== false && training?.count > 0) stats.push({ label: `${training.count} workout${training.count !== 1 ? "s" : ""}`, icon: "🏋️" });
        if (tp.sleep !== false && sleep?.avgMin) {
          const h = Math.floor(sleep.avgMin / 60), m = Math.round(sleep.avgMin % 60);
          stats.push({ label: `${h}h${m > 0 ? m + "m" : ""} sleep avg`, icon: "🌙" });
        }
        if (tp.nutrition !== false && nutrition?.proteinHitDays > 0) stats.push({ label: `Protein ${nutrition.proteinHitDays}/${nutrition.foodDays || 7}d`, icon: "💪" });
        if (tp.nutrition !== false && nutrition?.avgSteps > 0) stats.push({ label: `${Math.round((nutrition.avgSteps || 0) / 100) * 100} steps/day`, icon: "👟" });
        if (tp.mind !== false && mind?.avgMood != null) {
          const moodEmoji = mind.avgMood >= 2.5 ? "😊" : mind.avgMood >= 1.8 ? "😐" : "😔";
          const moodLabel = mind.avgMood >= 2.5 ? "Good mood" : mind.avgMood >= 1.8 ? "Mixed mood" : "Low mood";
          stats.push({ label: moodLabel, icon: moodEmoji });
        }
        if (tp.mind !== false && mind?.focusMin >= 60) stats.push({ label: `${Math.round(mind.focusMin / 60)}h focus`, icon: "🎯" });
        if (tp.sleep !== false && sleep?.bedConsistency != null) {
          const bc = sleep.bedConsistency;
          const bcColor = bc <= 20 ? C.greenSoft : bc <= 45 ? C.amber : C.coral;
          stats.push({ label: `Bedtime ±${bc}min`, icon: "⏰", color: bcColor });
        }
        if (tp.sleep !== false && sleep?.avgScore != null) {
          const sc = sleep.avgScore;
          const scColor = sc >= 75 ? C.greenSoft : sc >= 55 ? C.amber : C.coral;
          stats.push({ label: `Sleep ${sc}/100`, icon: "💤", color: scColor });
        }
        // Sleep nights tracked — shows tracking completeness (e.g. "5/7 nights")
        if (tp.sleep !== false && sleep?.nights != null && sleep.nights > 0 && sleep.nights < 7) {
          const nColor = sleep.nights >= 5 ? C.greenSoft : sleep.nights >= 3 ? C.amber : C.coral;
          stats.push({ label: `${sleep.nights}/7 nights tracked`, icon: "📋", color: nColor });
        }
        if (tp.nutrition !== false && nutrition?.avgCal != null) {
          stats.push({ label: `${nutrition.avgCal} kcal/day`, icon: "🍽️" });
        }
        if (weekReport.pain?.count > 0) {
          stats.push({ label: `Pain logged ${weekReport.pain.count}×`, icon: "🩹", color: C.coral });
        }
        // Protein avg — crucial for muscle building / fat loss
        if (tp.nutrition !== false && nutrition?.avgProt != null) {
          stats.push({ label: `${nutrition.avgProt}g protein/day`, icon: "🥩" });
        }
        // Water avg
        if (tp.nutrition !== false && nutrition?.avgWater != null && nutrition.avgWater > 0) {
          const liters = (nutrition.avgWater / 1000).toFixed(1);
          stats.push({ label: `${liters}L water/day`, icon: "💧" });
        }
        // Total sets (training volume)
        if (tp.training !== false && training?.totalSets > 0) {
          stats.push({ label: `${training.totalSets} sets`, icon: "📊" });
        }
        // Weekly PRs — highlight chip if any
        if (tp.training !== false && training?.prs?.length > 0) {
          const prCount = training.prs.length;
          stats.push({ label: `${prCount} new PR${prCount > 1 ? "s" : ""}!`, icon: "🏆", color: C.greenSoft });
        }
        // High-stress days
        if (tp.mind !== false && mind?.stressHigh >= 2) {
          const stressColor = mind.stressHigh >= 4 ? C.coral : C.amber;
          stats.push({ label: `${mind.stressHigh} high-stress days`, icon: "😤", color: stressColor });
        }
        // Habit consistency this week
        if (tp.mind !== false && mind?.consistency != null) {
          const cPct = Math.round(mind.consistency);
          const cColor = cPct >= 80 ? C.greenSoft : cPct >= 55 ? C.amber : C.coral;
          stats.push({ label: `${cPct}% habits`, icon: "✅", color: cColor });
        }
        // Weight trend vs goal
        if (weekReport.weight?.rate != null) {
          const wr = weekReport.weight.rate;
          const goal = profile?.goal || "maintain";
          const isGoodRate = (goal === "gain" && wr >= 0.08 && wr <= 0.4) || (goal === "lose" && wr <= -0.1 && wr >= -0.6) || (goal === "maintain" && Math.abs(wr) <= 0.2);
          const isBadRate = (goal === "gain" && wr < 0) || (goal === "lose" && wr >= 0) || (goal === "maintain" && Math.abs(wr) > 0.4);
          const wColor = isGoodRate ? C.greenSoft : isBadRate ? C.coral : C.amber;
          const sign = wr > 0 ? "+" : "";
          stats.push({ label: `${sign}${wr} kg/wk`, icon: "⚖️", color: wColor });
        }
        const topMuscles = training?.topMuscles?.slice(0, 4) || [];
        return (
          <div className="sprig-pop" style={{
            background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 16, padding: "12px 14px", marginTop: 12, boxShadow: C.shadow,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>
              📅 This week
            </div>
            {/* Stats chips row */}
            {stats.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: topMuscles.length ? 7 : 10 }}>
                {stats.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: s.color ? s.color + "15" : C.bg2, borderRadius: 8, padding: "3px 9px" }}>
                    <span style={{ fontSize: 11, lineHeight: 1 }}>{s.icon}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: s.color || C.inkSoft }}>{s.label}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Top muscles trained this week */}
            {topMuscles.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 700 }}>Trained:</span>
                {topMuscles.map((m, i) => (
                  <span key={i} style={{ fontSize: 9.5, color: C.inkSoft, fontWeight: 600 }}>
                    {m.name}{i < topMuscles.length - 1 ? " ·" : ""}
                  </span>
                ))}
              </div>
            )}
            {weekReport.win && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: weekReport.nextWeek ? 8 : 0 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: C.greenSoft + "18", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 11, lineHeight: 1 }}>🏆</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: C.greenSoft, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>Top win</div>
                  <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.45 }}>{weekReport.win}</div>
                </div>
              </div>
            )}
            {weekReport.nextWeek && (
              <div style={{ paddingTop: (weekReport.win || stats.length > 0) ? 8 : 0, borderTop: (weekReport.win || stats.length > 0) ? `1px solid ${C.line}` : "none" }}>
                {weekReport.bottleneck && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: C.coral + "18", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                      <span style={{ fontSize: 11, lineHeight: 1 }}>⚡</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: C.coral, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>Top issue</div>
                      <div style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.4 }}>{weekReport.bottleneck}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: C.amber + "18", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 11, lineHeight: 1 }}>🎯</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>Next 7 days</div>
                    <div style={{ fontSize: 12, color: C.inkSoft, lineHeight: 1.45 }}>{weekReport.nextWeek}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ══ 8d. ACHIEVEMENTS — recent milestones from detectAchievements() ══ */}
      {achievements?.length > 0 && (() => {
        // Show most-recently unlocked achievements (last 7 days get highlighted, rest shown dimmer)
        const now = Date.now();
        const weekMs = 7 * 864e5;
        const recent = achievements.filter((a) => a.ts && (now - a.ts) < weekMs);
        // Always show at least 3 total; prioritize recent ones first
        const older = achievements.filter((a) => !a.ts || (now - a.ts) >= weekMs);
        const shown = [...recent, ...older].slice(0, 4);
        if (!shown.length) return null;
        return (
          <div className="sprig-pop" style={{
            background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 16, padding: "12px 14px", marginTop: 12, boxShadow: C.shadow,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                🏅 Milestones
              </div>
              {onViewAllWins && achievements.length > 0 && (
                <button className="sprig-tap" onClick={() => { onViewAllWins(); buzz("tap"); }}
                  style={{ background: "none", border: "none", fontSize: 10, fontWeight: 700, color: C.greenSoft, cursor: "pointer", fontFamily: "DM Sans", padding: "2px 0", display: "flex", alignItems: "center", gap: 2 }}>
                  View all <ChevronRight size={10} color={C.greenSoft} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {shown.map((a, i) => {
                const isNew = a.ts && (now - a.ts) < weekMs;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: isNew ? C.greenSoft + "15" : C.bg2,
                    border: isNew ? `1px solid ${C.greenSoft}30` : `1px solid transparent`,
                    borderRadius: 10, padding: "5px 10px",
                  }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{a.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: isNew ? C.greenSoft : C.inkSoft, lineHeight: 1.2 }}>{a.title}</div>
                      {isNew && <div style={{ fontSize: 9.5, color: C.greenSoft, fontWeight: 700 }}>NEW</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {achievements.length > 4 && (
              onViewAllWins ? (
                <button className="sprig-tap" onClick={() => { onViewAllWins(); buzz("tap"); }}
                  style={{ width: "100%", marginTop: 8, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 9, padding: "6px 0", fontSize: 10.5, fontWeight: 700, color: C.inkSoft, cursor: "pointer", fontFamily: "DM Sans", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  +{achievements.length - 4} more milestone{achievements.length - 4 !== 1 ? "s" : ""}
                  <ChevronRight size={10} color={C.inkSoft} />
                </button>
              ) : (
                <div style={{ fontSize: 10, color: C.muted, marginTop: 6, textAlign: "center" }}>
                  +{achievements.length - 4} more milestone{achievements.length - 4 !== 1 ? "s" : ""}
                </div>
              )
            )}
          </div>
        );
      })()}

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
