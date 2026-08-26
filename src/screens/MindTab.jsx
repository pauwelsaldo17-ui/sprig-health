import React, { useState, useEffect, useRef } from "react";
import { Timer, Play, Check, Activity, Archive, Bell, ChevronDown, PencilLine, Plus, Sparkles, Trash2 } from "lucide-react";
import { C } from "../theme.js";
import { FOCUS_PRESETS, HABIT_CATEGORIES, DAY_NAMES_SHORT, HABIT_SUGGESTIONS, computeHabitStreak } from "../utils/vitaeCalc.js";
import { btn } from "../components/ui.jsx";

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

      <div className="sprig-eyebrow" style={{ marginBottom: 6 }}>Category</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 13 }}>
        {HABIT_CATEGORIES.map((c) => <CatBtn key={c.id} id={c.id} label={c.label} />)}
      </div>

      <div className="sprig-eyebrow" style={{ marginBottom: 6 }}>Frequency</div>
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

function MindTab({ mindInfo, advanced, profile, today, onToggleHabit2, onAddHabit2, onEditHabit2, onArchiveHabit2, onRestoreHabit2, onDeleteHabit2, onUndoCompletion, tp = {} }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { habits2 = [], habitCompletions = [], habitStatusMap = {}, consistencyV2, autoToday = {} } = mindInfo;
  const active = habits2.filter((h) => !h.archived);
  const archived = habits2.filter((h) => h.archived);
  const cv2 = consistencyV2 || { pct: null, label: "No habits yet", details: [] };
  const scoreColor = cv2.pct == null ? C.muted : cv2.pct >= 75 ? C.greenSoft : cv2.pct >= 50 ? C.amber : C.coral;

  // Section split
  const isAutoMet = (h) => !!(h.autoType && autoToday[h.id]?.met);
  const isDaily = (h) => { const ft = h.frequencyType || "daily"; return ft === "daily" || ft === "specific_days"; };
  const isPeriodic = (h) => { const ft = h.frequencyType || "daily"; return ft === "weekly_x" || ft === "weekly" || ft === "monthly"; };

  const dueToday    = active.filter((h) => { const s = habitStatusMap[h.id] || {}; return isDaily(h) && s.isDue && !s.isComplete && !isAutoMet(h); });
  const autoCompletedToday = active.filter((h) => isAutoMet(h) && !(habitStatusMap[h.id]?.isComplete));
  const manuallyDone = active.filter((h) => { const s = habitStatusMap[h.id] || {}; return isDaily(h) && s.isComplete && !isAutoMet(h); });
  const thisPeriod   = active.filter((h) => isPeriodic(h));

  const totalActionable = dueToday.length + autoCompletedToday.length + manuallyDone.length;
  const totalDone = manuallyDone.length + autoCompletedToday.length;

  // Suggestions — filter out ones user already tracks
  const existingNames = new Set(habits2.map((h) => h.name.toLowerCase()));
  const suggestions = HABIT_SUGGESTIONS.filter((s) => {
    if (existingNames.has(s.name.toLowerCase())) return false;
    // Don't suggest habits for disabled tracking categories
    const cat = s.category || "";
    if (cat === "nutrition" && tp.nutrition === false) return false;
    if (cat === "sleep" && tp.sleep === false) return false;
    if ((cat === "training" || cat === "fitness") && tp.training === false) return false;
    if (cat === "health" && tp.health === false) return false;
    return true;
  });

  const handleSaveForm = (def) => {
    if (editingHabit) { onEditHabit2(editingHabit.id, def); setEditingHabit(null); }
    else { onAddHabit2(def); setShowAddForm(false); }
  };
  const handleCancelForm = () => { setShowAddForm(false); setEditingHabit(null); };

  const handleAddSuggestion = (sug) => {
    onAddHabit2({ name: sug.name, category: sug.category || "custom", frequencyType: sug.frequencyType || "daily", weeklyTarget: sug.weeklyTarget || null, specificDays: null, reminderEnabled: false, reminderTime: null, notes: "", autoType: sug.autoType || null });
  };

  // Compact row for "All habits" manage section
  const ManageRow = ({ habit }) => {
    const status = habitStatusMap[habit.id] || {};
    const autoMet = isAutoMet(habit);
    const streak = computeHabitStreak(habit, habitCompletions, today);
    const dot = (status.isComplete || autoMet) ? C.green : status.isDue ? C.amber : C.bg2;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${C.line}` }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: dot, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft }}>{habit.name}</span>
          <span style={{ fontSize: 11, color: C.muted }}>{status.freqLabel || "Daily"}</span>
          {streak > 1 && <span style={{ fontSize: 11, color: C.amber }}>🔥 {streak}</span>}
          {habit.autoType && <span style={{ fontSize: 10, color: C.greenSoft, background: C.green + "18", padding: "1px 5px", borderRadius: 4 }}>Auto</span>}
        </div>
        {manageMode && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button className="sprig-tap" onClick={() => { setEditingHabit(habit); setShowAddForm(false); setManageMode(false); }}
              style={{ background: C.bg2, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center" }}><PencilLine size={13} /></button>
            <button className="sprig-tap" onClick={() => onArchiveHabit2(habit.id)}
              style={{ background: C.bg2, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", color: C.muted }}><Archive size={14} /></button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sprig-rise">
      {/* ---- HEADER ---- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 2px 14px" }}>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, lineHeight: 1, letterSpacing: -.3 }}>Habits</div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
            {active.length === 0 ? "Build habits that stick." : `${active.length} active habit${active.length !== 1 ? "s" : ""}`}
          </div>
        </div>
        {!showAddForm && !editingHabit && (
          <button className="sprig-tap" onClick={() => { setShowAddForm(true); setManageMode(false); }}
            style={{ ...btn(C.green, "#fff"), padding: "8px 14px", fontSize: 12 }}>
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      {/* ---- ADD / EDIT FORM ---- */}
      {(showAddForm || editingHabit) && (
        <div style={{ marginBottom: 14 }}>
          <AddHabitForm initial={editingHabit} onSave={handleSaveForm} onCancel={handleCancelForm} />
        </div>
      )}

      {/* ---- EMPTY STATE with suggestions ---- */}
      {active.length === 0 && !showAddForm && (
        <div>
          <div style={{ textAlign: "center", padding: "16px 8px 14px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.inkSoft, marginBottom: 5 }}>Start building consistency</div>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>Tap any suggestion to add it, or create your own.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
            {suggestions.slice(0, 12).map((sug, i) => (
              <button key={i} className="sprig-tap" onClick={() => handleAddSuggestion(sug)}
                style={{ display: "flex", alignItems: "center", gap: 11, background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "11px 14px", boxShadow: C.shadow, cursor: "pointer", fontFamily: "DM Sans", textAlign: "left", width: "100%" }}>
                <span style={{ width: 26, height: 26, borderRadius: 99, border: `2px dashed ${C.line}`, display: "grid", placeItems: "center", flexShrink: 0, color: C.muted }}><Plus size={13} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.inkSoft }}>{sug.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                    {sug.category} · {sug.frequencyType === "weekly_x" ? `${sug.weeklyTarget}× / week` : sug.frequencyType === "weekly" ? "Weekly" : sug.frequencyType === "monthly" ? "Monthly" : "Daily"}
                    {sug.autoType && <span style={{ marginLeft: 5, color: C.greenSoft, fontWeight: 600 }}>· Auto</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button className="sprig-tap" onClick={() => setShowAddForm(true)}
            style={{ ...btn(C.bg2, C.inkSoft), width: "100%", padding: "11px 0", fontSize: 13 }}>
            <Plus size={14} /> Create custom habit
          </button>
        </div>
      )}

      {/* ---- CONSISTENCY SCORE ---- */}
      {active.length > 0 && (
        <div style={{ background: C.heroGrad1, borderRadius: 20, padding: 18, color: "#fff", boxShadow: C.shadow, marginBottom: 14, display: "flex", alignItems: "center", gap: 18 }}>
          {cv2.pct !== null ? (
            <div style={{ flexShrink: 0 }}>
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="7" />
                <circle cx="36" cy="36" r="28" fill="none" stroke={scoreColor} strokeWidth="7"
                  strokeDasharray={`${cv2.pct / 100 * 176} 176`} strokeLinecap="round"
                  transform="rotate(-90 36 36)" style={{ transition: "stroke-dasharray .6s" }} />
                <text x="36" y="41" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="16" fontWeight="700" fill="#fff">{cv2.pct}%</text>
              </svg>
            </div>
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 99, border: "3px solid rgba(255,255,255,.25)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Activity size={22} color="rgba(255,255,255,.6)" />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, opacity: .75, letterSpacing: .4, textTransform: "uppercase" }}>Consistency</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, marginTop: 1, lineHeight: 1.1 }}>{cv2.label}</div>
            {totalActionable > 0 && (
              <div style={{ fontSize: 11.5, opacity: .85, marginTop: 5 }}>
                {totalDone >= totalActionable ? "All habits done today ✓" : `${totalDone} / ${totalActionable} done today`}
              </div>
            )}
            {cv2.pct !== null && (
              <div style={{ fontSize: 11, opacity: .7, marginTop: 2 }}>
                {cv2.pct >= 90 ? "Outstanding — keep going." : cv2.pct >= 75 ? "Solid work. Stay consistent." : cv2.pct >= 50 ? "Building momentum — every day counts." : "Pick one habit and nail it today."}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- DUE TODAY ---- */}
      {dueToday.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, letterSpacing: .3, textTransform: "uppercase", marginBottom: 8 }}>Due today</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {dueToday.map((h) => {
              const status = habitStatusMap[h.id] || {};
              const streak = computeHabitStreak(h, habitCompletions, today);
              return (
                <button key={h.id} className="sprig-tap" onClick={() => onToggleHabit2(h.id)}
                  style={{ display: "flex", alignItems: "center", gap: 11, background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "12px 14px", boxShadow: C.shadow, cursor: "pointer", fontFamily: "DM Sans", textAlign: "left", width: "100%" }}>
                  <span style={{ width: 26, height: 26, borderRadius: 99, border: `2px solid ${C.line}`, display: "grid", placeItems: "center", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{h.name}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
                      {status.freqLabel || "Daily"}{streak > 1 ? <span style={{ color: C.amber, marginLeft: 6 }}>🔥 {streak}</span> : null}
                    </div>
                  </div>
                  {h.reminderEnabled && <Bell size={13} color={C.muted} style={{ flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- AUTO-COMPLETED ---- */}
      {autoCompletedToday.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, letterSpacing: .3, textTransform: "uppercase", marginBottom: 8 }}>Auto-completed</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {autoCompletedToday.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 11, background: C.green + "0d", border: `1px solid ${C.leaf}44`, borderRadius: 13, padding: "11px 14px" }}>
                <span style={{ width: 26, height: 26, borderRadius: 99, background: C.green, display: "grid", placeItems: "center", flexShrink: 0, color: "#fff" }}><Check size={14} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                    <span style={{ color: C.greenSoft, fontWeight: 600 }}>Auto</span>
                    {autoToday[h.id]?.reason ? ` · ${autoToday[h.id].reason}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- THIS WEEK / PERIOD ---- */}
      {thisPeriod.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: "13px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, letterSpacing: .3, textTransform: "uppercase", marginBottom: 8 }}>This week</div>
          {thisPeriod.map((h, i) => {
            const status = habitStatusMap[h.id] || {};
            const ft = h.frequencyType || "daily";
            const pct = status.target > 0 ? Math.min(1, status.progress / status.target) : 0;
            const label = ft === "monthly"
              ? `${status.progress}/${status.target} this month`
              : ft === "weekly" ? (status.progress > 0 ? "Done this week" : "Due this week")
              : `${status.progress} / ${status.target} this week`;
            return (
              <div key={h.id} style={{ paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0, borderTop: i > 0 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.inkSoft }}>{h.name}</span>
                      <span style={{ fontSize: 11, color: status.isComplete ? C.greenSoft : C.muted, marginLeft: 8 }}>{label}</span>
                    </div>
                    {ft !== "weekly" && (
                      <div style={{ marginTop: 5, height: 4, borderRadius: 99, background: C.bg2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct * 100}%`, background: status.isComplete ? C.green : C.amber, borderRadius: 99, transition: "width .3s" }} />
                      </div>
                    )}
                  </div>
                  {status.isComplete
                    ? <Check size={16} color={C.greenSoft} style={{ flexShrink: 0 }} />
                    : status.isDue && <button className="sprig-tap" onClick={() => onToggleHabit2(h.id)}
                        style={{ ...btn(C.green, "#fff"), padding: "6px 11px", borderRadius: 9, fontSize: 12, flexShrink: 0 }}>
                        {ft === "weekly_x" ? "+ Log" : "Done"}
                      </button>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- DONE TODAY (manual completions) ---- */}
      {manuallyDone.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, letterSpacing: .3, textTransform: "uppercase", marginBottom: 8 }}>Done today</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {manuallyDone.map((h) => {
              const status = habitStatusMap[h.id] || {};
              const streak = computeHabitStreak(h, habitCompletions, today);
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 11, background: C.green + "0a", border: `1px solid ${C.leaf}33`, borderRadius: 13, padding: "10px 14px", opacity: .85 }}>
                  <button className="sprig-tap" onClick={() => onUndoCompletion(h.id, status.periodKey)}
                    style={{ width: 26, height: 26, borderRadius: 99, background: C.green, border: "none", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, color: "#fff" }}><Check size={14} /></button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, textDecoration: "line-through", textDecorationColor: C.green + "77" }}>{h.name}</div>
                    {streak > 1 && <div style={{ fontSize: 11, color: C.amber, marginTop: 1 }}>🔥 {streak}-day streak</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- SUGGESTED HABITS (when < 6 active) ---- */}
      {active.length > 0 && active.length < 6 && suggestions.length > 0 && !showAddForm && (
        <div style={{ marginBottom: 14 }}>
          <button className="sprig-tap" onClick={() => setShowSuggestions((s) => !s)}
            style={{ width: "100%", background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, fontWeight: 600, color: C.inkSoft, fontFamily: "DM Sans", marginBottom: showSuggestions ? 8 : 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><Sparkles size={13} color={C.greenSoft} /> Add more habits</span>
            <ChevronDown size={14} color={C.muted} style={{ transform: showSuggestions ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {showSuggestions && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {suggestions.slice(0, 8).map((sug, i) => (
                <button key={i} className="sprig-tap" onClick={() => handleAddSuggestion(sug)}
                  style={{ display: "flex", alignItems: "center", gap: 11, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 14px", cursor: "pointer", fontFamily: "DM Sans", textAlign: "left", width: "100%" }}>
                  <Plus size={14} color={C.greenSoft} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft }}>{sug.name}</span>
                    <span style={{ fontSize: 11, color: C.muted, marginLeft: 7 }}>{sug.category} · {sug.frequencyType === "weekly_x" ? `${sug.weeklyTarget}× / week` : sug.frequencyType || "Daily"}</span>
                    {sug.autoType && <span style={{ fontSize: 10, color: C.greenSoft, marginLeft: 6, background: C.green + "18", padding: "1px 5px", borderRadius: 4 }}>Auto</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- ALL HABITS (manage) ---- */}
      {active.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: "12px 14px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div className="sprig-eyebrow">All habits</div>
            <button className="sprig-tap" onClick={() => setManageMode((s) => !s)}
              style={{ ...btn(manageMode ? C.green : "transparent", manageMode ? "#fff" : C.muted), padding: "4px 10px", fontSize: 11.5, borderRadius: 8 }}>
              {manageMode ? "Done" : "Edit"}
            </button>
          </div>
          {active.map((h) => <ManageRow key={h.id} habit={h} />)}
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
        Consistency builds over time. 🌿
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}



export default MindTab;
