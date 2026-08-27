import React, { useState } from "react";
import { Activity, Check, ChevronRight, Droplets, Dumbbell, Flame, Moon, Plus, Repeat, Zap } from "lucide-react";
import { C } from "../theme.js";
import { stepGoal, ACTIVITY_SOURCES, mealShortcuts, tonightPlan, durLabel, scoreVerdict } from "../utils/vitaeCalc.js";
import { btn, Btn, Ring, Badge, TodayWinsCard, PerfectRecoveryCard, ScoreDonut, ACTION_ICON } from "../components/ui.jsx";

const HAPTIC_PATTERNS = { tap: 14, light: 10, select: 8, success: [30, 50, 30], complete: [30, 50, 50], strong: 40, error: [100, 50, 100] };
function buzz(kind = "tap") {
  try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 14); } catch (_) {}
}

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
          <div className="sprig-eyebrow" style={{ marginBottom: 4 }}>Same as yesterday</div>
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
        <div className="sprig-eyebrow">Suggested today</div>
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


// Inline badge showing data source — Quick logged / Estimated / null (no badge)
function SrcPill({ source }) {
  if (!source || source === "exact" || source === "disabled") return null;
  const MAP = {
    quick_log: { color: C.greenSoft, label: "Quick log" },
    estimated: { color: C.amber,     label: "Estimated" },
    unknown:   { color: C.muted,     label: "No data" },
  };
  const m = MAP[source];
  if (!m) return null;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: m.color, background: m.color + "18", border: `1px solid ${m.color}30`, borderRadius: 5, padding: "1px 5px", letterSpacing: .4, verticalAlign: "middle", textTransform: "uppercase", display: "inline-block" }}>
      {m.label}
    </span>
  );
}

function TodaySummaryCard({ icon, accent = C.greenSoft, title, value, sub, note, children, actions }) {
  return (
    <div style={{ background: C.card, borderRadius: 20, padding: 15, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, letterSpacing: .1, lineHeight: 1 }}>{title}</span>
      </div>
      {value != null && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: typeof value === "string" && value.length > 6 ? 19 : 24, fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</span>
          {sub && <span style={{ fontSize: 12, color: C.muted }}>{sub}</span>}
        </div>
      )}
      {note && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, lineHeight: 1.45 }}>{note}</div>}
      {children}
      {actions && <div style={{ display: "flex", gap: 7, marginTop: 10 }}>{actions}</div>}
    </div>
  );
}
// Small pill button used for "View in X" and inline quick-actions on Today cards.
function TodayChip({ label, onClick, primary }) {
  return (
    <button className="sprig-tap" onClick={onClick}
      style={{ background: primary ? C.green : C.bg2, color: primary ? "#fff" : C.inkSoft, border: "none", cursor: "pointer", borderRadius: 10, padding: "8px 13px", fontSize: 12, fontWeight: 700, fontFamily: "DM Sans", display: "inline-flex", alignItems: "center", gap: 5,
        boxShadow: primary ? `0 3px 10px ${C.green}44` : "none" }}>
      {label}
    </button>
  );
}

function TodayStatusRow({ icon, label, value, accent, onTap, actionLabel, onAction, last }) {
  return (
    <div className="sprig-tap" onClick={onTap}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: accent + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4, lineHeight: 1 }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      </div>
      {actionLabel && onAction ? (
        <button className="sprig-tap" onClick={(e) => { e.stopPropagation(); onAction(); }}
          style={{ background: accent + "1A", border: `1px solid ${accent}33`, borderRadius: 8, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, color: accent, cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap", flexShrink: 0 }}>
          {actionLabel}
        </button>
      ) : (
        <ChevronRight size={14} color={C.muted} style={{ flexShrink: 0, opacity: .4 }} />
      )}
    </div>
  );
}

function TodayTab({ t, targets, entries, scores, onRemove, library, onQuick, profile, supps, takenIds, onToggleSupp, onRemoveSupp, onAddSupp, sleepInfo, trainInfo, advanced, dailyInfo, nutriInfo, healthInfo, mindInfo, moveInfo, onDaily, onAddEntry, onCheckin, onQuickLog, onStartWorkout, onGoSleep, onGoEnergy, onGoBody, onGoHealth, onGoMind, onGoNutrition, onGoTrain, wins, onKudos, onViewAllWins, recoveryInfo, quickLog, tp = {}, dt = null, onToast, loggedDays = 0, onGoSettings }) {
  const { lastSleep } = sleepInfo;
  const { daily, subScores, healthScore, actions } = dailyInfo;
  const [stepsEditing, setStepsEditing] = useState(false);
  const [stepsInput, setStepsInput] = useState("");

  const adjTarget = moveInfo?.calAdjust?.adjustedTargetCalories || targets.calories;
  const dtNutrSrc  = dt?.nutrition?.source  || null;
  const dtSleepSrc = dt?.sleep?.source      || null;
  const dtTrainSrc = dt?.training?.source   || null;
  const dtWaterSrc = dt?.water?.source      || null;
  const dtMoveSrc  = dt?.movement?.source   || null;

  const steps = daily.steps || 0;
  const waterMl = daily.water || 0;
  const waterGoal = nutriInfo.waterGoal || 2600;
  const litres = (ml) => (ml / 1000).toFixed(1) + "L";

  return (
    <div className="sprig-rise">

      {/* 1 — DAILY STATUS CARD */}
      <div style={{ background: C.heroGrad1, borderRadius: 24, padding: "20px 18px 18px", color: "#fff", boxShadow: C.shadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, opacity: .7 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: .6, textTransform: "uppercase" }}>Today</div>
          <div style={{ fontSize: 10.5, fontWeight: 600 }}>{new Date().toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <ScoreDonut score={healthScore} size={90} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{scoreVerdict(healthScore)}</div>
            <div style={{ fontSize: 12.5, opacity: .85, marginTop: 6, lineHeight: 1.5, fontWeight: 500 }}>
              {actions[0] ? actions[0].text : "Log food, sleep, or a workout to sharpen your score."}
            </div>
          </div>
        </div>
      </div>

      {/* 2 — BEST ACTIONS (max 2) */}
      {actions.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
          {actions.slice(0, 2).map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12,
              paddingTop: i > 0 ? 11 : 0, marginTop: i > 0 ? 11 : 0,
              borderTop: i > 0 ? `1px solid ${C.line}` : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 11,
                background: i === 0 ? C.green : C.bg2,
                color: i === 0 ? "#fff" : C.greenSoft,
                display: "grid", placeItems: "center", flexShrink: 0 }}>
                {ACTION_ICON[a.icon] || <Check size={16} />}
              </div>
              <span style={{ fontSize: i === 0 ? 13.5 : 12.5, color: i === 0 ? C.ink : C.inkSoft, lineHeight: 1.4, fontWeight: i === 0 ? 600 : 400 }}>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 3 — SCORE GRID — hidden until 3 days logged to avoid showing all-dash state */}
      {loggedDays >= 3 && (() => {
        const chips = [
          tp.recovery  !== false && { label: "Recovery",  v: subScores.training,  accent: C.limeSoft },
          tp.nutrition !== false && { label: "Nutrition", v: subScores.nutrition, accent: C.lime },
          tp.sleep     !== false && { label: "Sleep",     v: subScores.sleep,     accent: "#9B87D0" },
          (tp.movement !== false || tp.training !== false) && { label: "Movement", v: subScores.movement, accent: C.leaf },
        ].filter(Boolean);
        if (!chips.length) return null;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            {chips.map((ch, ci) => {
              const score = ch.v == null ? null : Math.round(ch.v);
              const color = score == null ? C.muted : score >= 70 ? ch.accent : score >= 45 ? C.amber : C.coral;
              return (
                <div key={ch.label} className="vitae-scale-in" style={{ animationDelay: `${ci * 45}ms`, background: C.bg2, borderRadius: 12, padding: "8px 10px", textAlign: "center" }}>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color, lineHeight: 1 }}>{score == null ? "–" : score}</div>
                  <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 600, marginTop: 3, letterSpacing: .3, textTransform: "uppercase" }}>{ch.label}</div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* 4 — QUICK CONTROLS: water +1 glass + steps +500/+1000/Set */}
      {(tp.water !== false || tp.movement !== false) && (() => {
        const waterMl2  = daily.water || 0;
        const waterGoal2 = nutriInfo.waterGoal || 2600;
        const steps2    = daily.steps || 0;
        const stepGoal2 = stepGoal(profile);
        const dtWaterSrc2 = dt?.water?.source || null;
        const dtMoveSrc2  = dt?.movement?.source || null;
        return (
          <div style={{ background: C.card, borderRadius: 18, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10, overflow: "hidden" }}>
            {tp.water !== false && (
              <div style={{ padding: "12px 14px", borderBottom: tp.movement !== false ? `1px solid ${C.line}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "#5B9BD51A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Droplets size={14} color="#5B9BD5" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Water</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
                      {dtWaterSrc2 === "quick_log" && waterMl2 === 0 ? "Goal hit · Quick logged"
                        : waterMl2 > 0 ? `${(waterMl2/1000).toFixed(1)}L / ${(waterGoal2/1000).toFixed(1)}L`
                        : `0 / ${(waterGoal2/1000).toFixed(1)}L`}
                    </div>
                  </div>
                  <button className="sprig-tap"
                    onClick={() => { onDaily({ water: waterMl2 + 250 }); buzz("light"); if (onToast) onToast("Added 250ml water ✓"); }}
                    style={{ background: "#5B9BD51A", border: `1px solid #5B9BD533`, borderRadius: 9, padding: "7px 12px", fontSize: 12, fontWeight: 700, color: "#5B9BD5", cursor: "pointer", fontFamily: "DM Sans", whiteSpace: "nowrap", flexShrink: 0 }}>
                    +1 glass <span style={{ fontSize: 10, opacity: .7 }}>250ml</span>
                  </button>
                </div>
                {waterMl2 > 0 && (
                  <div style={{ height: 4, background: C.bg2, borderRadius: 9 }}>
                    <div style={{ height: "100%", borderRadius: 9, background: waterMl2 >= waterGoal2 ? "#5B9BD5" : "#5B9BD5AA", width: `${Math.min(100, Math.round(waterMl2/waterGoal2*100))}%`, transition: "width .3s" }} />
                  </div>
                )}
              </div>
            )}
            {tp.movement !== false && (
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: stepsEditing ? 8 : 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: C.green + "1A", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Activity size={14} color={C.greenSoft} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>Steps</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
                      {dtMoveSrc2 === "quick_log" && steps2 === 0 ? "Movement covered · Quick logged"
                        : steps2 > 0 ? `${steps2.toLocaleString()} / ${stepGoal2.toLocaleString()}`
                        : `0 / ${stepGoal2.toLocaleString()}`}
                    </div>
                  </div>
                </div>
                {steps2 > 0 && !stepsEditing && (
                  <div style={{ height: 4, background: C.bg2, borderRadius: 9, marginBottom: 8 }}>
                    <div style={{ height: "100%", borderRadius: 9, background: steps2 >= stepGoal2 ? C.greenSoft : C.green + "AA", width: `${Math.min(100, Math.round(steps2/stepGoal2*100))}%`, transition: "width .3s" }} />
                  </div>
                )}
                {!stepsEditing ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="sprig-tap" onClick={() => { onDaily({ steps: steps2 + 500 }); buzz("light"); }}
                      style={{ ...btn(C.bg2, C.green), flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700 }}>+500</button>
                    <button className="sprig-tap" onClick={() => { onDaily({ steps: steps2 + 1000 }); buzz("light"); }}
                      style={{ ...btn(C.bg2, C.green), flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700 }}>+1,000</button>
                    <button className="sprig-tap" onClick={() => { setStepsInput(String(steps2 || "")); setStepsEditing(true); }}
                      style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700 }}>Set</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input type="number" inputMode="numeric" min="0" autoFocus value={stepsInput}
                      onChange={(e) => setStepsInput(e.target.value)}
                      placeholder="Steps today"
                      style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
                    <button className="sprig-tap" onClick={() => {
                      const v = parseInt(stepsInput, 10);
                      if (Number.isFinite(v) && v >= 0) { onDaily({ steps: v }); buzz("light"); }
                      setStepsEditing(false); setStepsInput("");
                    }} style={{ ...btn(C.green, "#fff"), padding: "8px 14px", fontSize: 12 }}>Save</button>
                    <button className="sprig-tap" onClick={() => { setStepsEditing(false); setStepsInput(""); }}
                      style={{ ...btn(C.bg2, C.inkSoft), padding: "8px 12px", fontSize: 12 }}>✕</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* 4 — QUICK LOG — only shown if needed */}
      {quickLog ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg2, borderRadius: 12, padding: "10px 14px", marginTop: 10 }}>
          <Zap size={13} color={C.greenSoft} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.muted, flex: 1 }}>Quick logged today</span>
          {onQuickLog && (
            <button className="sprig-tap" onClick={onQuickLog}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.greenSoft, fontFamily: "DM Sans", fontWeight: 600, padding: "2px 0" }}>
              Edit →
            </button>
          )}
        </div>
      ) : onQuickLog && !(dt?.nutrition?.source === "exact" && dt?.sleep?.source === "exact" && dt?.training?.source === "exact") ? (
        <button className="sprig-tap" onClick={onQuickLog}
          style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "14px 16px", fontSize: 14, fontWeight: 700, marginTop: 12, boxShadow: `0 4px 16px ${C.lime}33` }}>
          <Zap size={15} /> Quick log the day
          <ChevronRight size={15} style={{ marginLeft: "auto", opacity: .7 }} />
        </button>
      ) : null}

      {/* 5 — WINS */}
      {wins && <div style={{ marginTop: 12 }}><TodayWinsCard wins={wins} onKudos={onKudos} onViewAll={onViewAllWins} /></div>}

      {/* 6 — COMPACT STATUS SUMMARY */}
      <div style={{ background: C.card, borderRadius: 18, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12, overflow: "hidden" }}>
        {tp.nutrition !== false && (
          <TodayStatusRow
            icon={<Flame size={14} color={C.amber} />}
            label="Food"
            accent={t.calories > adjTarget ? C.coral : dtNutrSrc ? C.greenSoft : C.muted}
            value={dtNutrSrc === "quick_log"
              ? (dt?.nutrition?.proteinOk ? "Protein hit" : "Logged")
              : t.calories > 0 ? `${t.calories} kcal · ${t.protein}g protein`
              : "Nothing logged yet"}
            actionLabel={!dtNutrSrc && t.calories === 0 ? "+ Log food" : null}
            onTap={onGoNutrition} onAction={onGoNutrition}
          />
        )}
        {tp.sleep !== false && (
          <TodayStatusRow
            icon={<Moon size={14} color="#9B87D0" />}
            label="Sleep"
            accent={dtSleepSrc ? "#9B87D0" : C.muted}
            value={dtSleepSrc === "quick_log" ? "Rested" : lastSleep ? durLabel(lastSleep.durationMin) : "Not logged"}
            actionLabel={!dtSleepSrc ? "Log sleep" : null}
            onTap={onGoSleep} onAction={onGoSleep}
          />
        )}
        {(tp.movement !== false || tp.training !== false) && (
          <TodayStatusRow
            icon={<Activity size={14} color={C.greenSoft} />}
            label="Movement"
            accent={dtMoveSrc || dtTrainSrc ? C.greenSoft : C.muted}
            value={dtMoveSrc === "quick_log" ? "Active" : dtTrainSrc === "exact" ? "Trained today" : steps > 0 ? `${steps.toLocaleString()} steps` : "Nothing yet"}
            actionLabel={!dtMoveSrc && !dtTrainSrc ? "Train" : null}
            onTap={onGoTrain} onAction={onGoTrain}
            last
          />
        )}
        {tp.nutrition === false && tp.sleep === false && tp.movement === false && tp.water === false && (
          <div style={{ padding: "16px", textAlign: "center", color: C.muted, fontSize: 12.5 }}>All categories disabled. Enable tracking in Settings.</div>
        )}
      </div>

      {/* ADVANCED MODE NUDGE — shown 7-30 days in, simple mode only */}
      {!advanced && loggedDays >= 7 && loggedDays < 30 && (
        <div className="sprig-rise" style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green + "1a", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Zap size={17} color={C.green} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>Advanced mode available</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>You've logged {loggedDays} days — unlock deeper analytics and extra tracking panels.</div>
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
