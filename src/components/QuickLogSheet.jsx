// src/components/QuickLogSheet.jsx
// Premium wizard-style Quick Log — 3 steps + done screen.
// Step-by-step: Training → Food → Sleep/Recovery → Save.
// Binary picks auto-advance; multi-choice needs a "Next" tap.

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Check, ChevronRight, Dumbbell,
  Flame, Moon, Droplets, X, Zap,
} from "lucide-react";
import { C } from "../theme.js";

/* ─── portal ────────────────────────────────────────────────────── */
function Portal({ children }) {
  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(children, document.body);
}

/* ─── haptics ───────────────────────────────────────────────────── */
const HAPTIC_PATTERNS = { tap: 12, success: [16, 40, 16], select: 8 };
function buzz(kind = "tap") {
  try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 12); } catch (_) {}
}

/* ─── domain palette ────────────────────────────────────────────── */
const SLEEP_CLR = "#8B7CF7";
const NUTR_CLR  = "#FB923C";
const MOVE_CLR  = "#52C878";

/* ─── TRAIN_TYPES ───────────────────────────────────────────────── */
const TRAIN_TYPES = [
  ["upper",     "Upper",     MOVE_CLR],
  ["lower",     "Lower",     MOVE_CLR],
  ["push",      "Push",      MOVE_CLR],
  ["pull",      "Pull",      MOVE_CLR],
  ["legs",      "Legs",      MOVE_CLR],
  ["full_body", "Full body", MOVE_CLR],
  ["cardio",    "Cardio",    C.amber],
  ["sport",     "Sport",     C.amber],
  ["custom",    "Custom",    C.muted],
];

/* ─── ProgressBar ───────────────────────────────────────────────── */
function ProgressBar({ step, total, color }) {
  return (
    <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= step ? color : C.line,
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

/* ─── BigChoice — full-width answer button ──────────────────────── */
function BigChoice({ label, emoji, chosen, color, onClick, sub }) {
  return (
    <button
      className="sprig-tap"
      onClick={onClick}
      style={{
        width: "100%",
        background: chosen ? color : C.bg2,
        border: chosen ? "none" : `1.5px solid ${C.line}`,
        borderRadius: 16,
        padding: "17px 18px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        fontFamily: "DM Sans",
        transition: "background 0.15s, transform 0.1s",
      }}
    >
      {emoji && (
        <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      )}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 15.5, fontWeight: 700,
            color: chosen ? "#fff" : C.ink,
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 11.5,
              color: chosen ? "rgba(255,255,255,.7)" : C.muted,
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {chosen && <Check size={18} color="#fff" />}
    </button>
  );
}

/* ─── ChipGroup — wrap of small tap chips ───────────────────────── */
function ChipGroup({ label, options, value, onPick, color }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 12, fontWeight: 700, color: C.muted,
          marginBottom: 8, letterSpacing: .3,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(([k, lbl, clr]) => {
          const active = value === k;
          const c = clr || color;
          return (
            <button
              key={k}
              className="sprig-tap"
              onClick={() => { onPick(active ? null : k); buzz("select"); }}
              style={{
                background: active ? c : C.card,
                color: active ? "#fff" : C.inkSoft,
                border: active ? "none" : `1px solid ${C.line}`,
                borderRadius: 10,
                padding: "8px 13px",
                fontSize: 13, fontWeight: 600,
                cursor: "pointer",
                fontFamily: "DM Sans",
                transition: "background 0.15s",
              }}
            >
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── StepHeader ────────────────────────────────────────────────── */
function StepHeader({ icon, title, subtitle, color, onClose }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div
          style={{
            width: 42, height: 42, borderRadius: 13,
            background: color + "22",
            display: "grid", placeItems: "center",
          }}
        >
          {icon}
        </div>
        <button
          className="sprig-tap"
          onClick={onClose}
          style={{
            background: C.bg2, border: "none", cursor: "pointer",
            width: 32, height: 32, borderRadius: 9,
            display: "grid", placeItems: "center", color: C.muted,
          }}
        >
          <X size={15} />
        </button>
      </div>
      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 22, fontWeight: 700,
          color: C.ink, lineHeight: 1.25,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

/* ─── NextBtn ───────────────────────────────────────────────────── */
function NextBtn({ onNext, label = "Next", color = MOVE_CLR }) {
  return (
    <button
      className="sprig-tap"
      onClick={onNext}
      style={{
        width: "100%",
        background: color,
        border: "none",
        cursor: "pointer",
        borderRadius: 16,
        padding: "16px 0",
        color: "#fff",
        fontSize: 15.5,
        fontWeight: 800,
        fontFamily: "DM Sans",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 20,
        letterSpacing: -.2,
      }}
    >
      {label} <ChevronRight size={17} />
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QUICK LOG SHEET
═══════════════════════════════════════════════════════════════════ */
export function QuickLogSheet({ profile, quickLog, date, onSave, onClose, tp = {} }) {
  const prev = quickLog || {};

  /* ── state ── */
  const [step, setStep] = useState(0);

  // Training
  const [trainedToday,       setTrainedToday]       = useState(prev.trainedToday ?? null);
  const [trainingType,       setTrainingType]        = useState(prev.trainingType || null);
  const [trainingIntensity,  setTrainingIntensity]   = useState(prev.trainingIntensity || null);

  // Nutrition
  const [hitProtein,   setHitProtein]   = useState(prev.hitProtein ?? null);
  const [hitCalories,  setHitCalories]  = useState(prev.hitCalories ?? null);
  const [ateHealthy,   setAteHealthy]   = useState(prev.ateHealthy ?? null);

  // Recovery
  const [enoughSleep,      setEnoughSleep]      = useState(prev.enoughSleep ?? null);
  const [hitWater,         setHitWater]         = useState(prev.hitWater ?? null);
  const [noAlcohol,        setNoAlcohol]        = useState(prev.noAlcohol ?? null);
  const [enoughMovement,   setEnoughMovement]   = useState(prev.enoughMovement ?? null);
  const [supplementsTaken, setSupplementsTaken] = useState(prev.supplementsTaken ?? null);

  /* ── build visible steps based on trackingPrefs ── */
  const steps = [];
  if (tp.training !== false) steps.push("training");
  if (tp.nutrition !== false) steps.push("nutrition");
  steps.push("recovery"); // always show
  steps.push("done");

  const totalSteps = steps.length - 1; // "done" doesn't count as progress step
  const currentKey = steps[step];

  /* ── auto-advance helper ── */
  function advance() {
    buzz("tap");
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  /* ── save ── */
  function submit() {
    const toBool = (v) => v === true ? true : v === false ? false : v === "true" ? true : v === "false" ? false : null;
    const ql = {
      date,
      trainedToday: trainedToday === true || trainedToday === "yes",
      trainingType: (trainedToday === true || trainedToday === "yes") ? (trainingType || "full_body") : null,
      trainingIntensity: (trainedToday === true || trainedToday === "yes") ? (trainingIntensity || "normal") : null,
      trainedMuscles: null,
      hitCalories:      toBool(hitCalories),
      hitProtein:       toBool(hitProtein),
      hitWater:         toBool(hitWater),
      ateHealthy:       toBool(ateHealthy),
      enoughMovement:   toBool(enoughMovement),
      enoughSleep:      toBool(enoughSleep),
      noAlcohol:        toBool(noAlcohol),
      supplementsTaken: toBool(supplementsTaken),
      source: "quick_log",
      confidence: "estimated",
      updatedAt: Date.now(),
    };
    buzz("success");
    onSave(ql);
  }

  /* ── STEP: TRAINING ── */
  function StepTraining() {
    return (
      <>
        <StepHeader
          icon={<Dumbbell size={20} color={MOVE_CLR} />}
          title="Did you train today?"
          subtitle="Tap one — it takes 2 seconds"
          color={MOVE_CLR}
          onClose={onClose}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <BigChoice
            emoji="🏋️"
            label="Yes, I trained"
            color={MOVE_CLR}
            chosen={trainedToday === true}
            onClick={() => {
              setTrainedToday(true);
              buzz("select");
              // Don't auto-advance — show type/intensity below
            }}
          />
          <BigChoice
            emoji="😴"
            label="Rest day"
            sub="No training today"
            color={C.coral}
            chosen={trainedToday === false}
            onClick={() => {
              setTrainedToday(false);
              buzz("select");
              setTimeout(advance, 280);
            }}
          />
        </div>

        {trainedToday === true && (
          <>
            <ChipGroup
              label="What did you train?"
              options={TRAIN_TYPES}
              value={trainingType}
              onPick={setTrainingType}
              color={MOVE_CLR}
            />
            <ChipGroup
              label="Intensity"
              options={[
                ["easy",   "Easy 🟡",   C.amber],
                ["normal", "Normal 🟢", MOVE_CLR],
                ["hard",   "Hard 🔴",   C.coral],
              ]}
              value={trainingIntensity}
              onPick={setTrainingIntensity}
              color={MOVE_CLR}
            />
            <NextBtn onNext={advance} color={MOVE_CLR} />
          </>
        )}
      </>
    );
  }

  /* ── STEP: NUTRITION ── */
  function StepNutrition() {
    return (
      <>
        <StepHeader
          icon={<Flame size={20} color={NUTR_CLR} />}
          title="How was your eating today?"
          color={NUTR_CLR}
          onClose={onClose}
        />

        {/* Protein */}
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .3 }}>
          Protein goal (~{Math.round((profile?.weight || 70) * 1.8)}g)
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["true","Hit it ✅", MOVE_CLR], ["false","Missed ❌", C.coral], ["null","Not sure", C.muted]].map(([k, lbl, clr]) => (
            <button
              key={k}
              className="sprig-tap"
              onClick={() => { setHitProtein(k); buzz("select"); }}
              style={{
                flex: 1, padding: "13px 6px", borderRadius: 12,
                background: hitProtein === k ? clr : C.bg2,
                border: hitProtein === k ? "none" : `1px solid ${C.line}`,
                color: hitProtein === k ? "#fff" : C.inkSoft,
                fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                fontFamily: "DM Sans",
              }}
            >{lbl}</button>
          ))}
        </div>

        {/* Calories / eating quality */}
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .3 }}>
          Overall eating
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
          <BigChoice emoji="🥗" label="Light / under" sub="Ate less than usual" color={C.amber} chosen={hitCalories === "false"} onClick={() => { setHitCalories("false"); setAteHealthy("true"); buzz("select"); setTimeout(advance, 300); }} />
          <BigChoice emoji="✅" label="On track" sub="Balanced, hit my targets" color={NUTR_CLR} chosen={hitCalories === "true" && ateHealthy === "true"} onClick={() => { setHitCalories("true"); setAteHealthy("true"); buzz("select"); setTimeout(advance, 300); }} />
          <BigChoice emoji="🍕" label="Over / indulgent" sub="More than planned" color={C.coral} chosen={hitCalories === "true" && ateHealthy === "false"} onClick={() => { setHitCalories("true"); setAteHealthy("false"); buzz("select"); setTimeout(advance, 300); }} />
        </div>

        {!hitProtein && (
          <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", marginTop: 10 }}>
            Answer protein above, then tap your eating category to continue
          </div>
        )}
        {hitProtein && (hitCalories === null || hitCalories === undefined) && (
          <div style={{ fontSize: 11.5, color: NUTR_CLR, textAlign: "center", marginTop: 10, fontWeight: 600 }}>
            ✓ Protein logged — now tap your eating category
          </div>
        )}
      </>
    );
  }

  /* ── STEP: SLEEP & RECOVERY ── */
  function StepRecovery() {
    const recovAnswered = [enoughSleep, hitWater].filter((v) => v !== null).length;
    return (
      <>
        <StepHeader
          icon={<Moon size={20} color={SLEEP_CLR} />}
          title="Recovery check"
          subtitle="Sleep, water, and extras"
          color={SLEEP_CLR}
          onClose={onClose}
        />

        {/* Sleep */}
        {tp.sleep !== false && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .3 }}>Sleep last night</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["false","😵 Poor","< 6h", C.coral], ["null","😐 Okay","~6–7h", C.amber], ["true","😌 Good","7h+", SLEEP_CLR]].map(([k, lbl, sub, clr]) => (
                <button
                  key={k}
                  className="sprig-tap"
                  onClick={() => { setEnoughSleep(k); buzz("select"); }}
                  style={{
                    flex: 1, padding: "13px 6px", borderRadius: 12,
                    background: enoughSleep === k ? clr : C.bg2,
                    border: enoughSleep === k ? "none" : `1px solid ${C.line}`,
                    color: enoughSleep === k ? "#fff" : C.inkSoft,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    fontFamily: "DM Sans", textAlign: "center",
                  }}
                >
                  <div>{lbl}</div>
                  <div style={{ fontSize: 10.5, opacity: .75, marginTop: 2, fontWeight: 500 }}>{sub}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Water */}
        {tp.water !== false && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .3 }}>Water</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["true","💧 Hit goal", "#5B9BD5"], ["false","😬 Not enough", C.coral]].map(([k, lbl, clr]) => (
                <button
                  key={k}
                  className="sprig-tap"
                  onClick={() => { setHitWater(k); buzz("select"); }}
                  style={{
                    flex: 1, padding: "13px 6px", borderRadius: 12,
                    background: hitWater === k ? clr : C.bg2,
                    border: hitWater === k ? "none" : `1px solid ${C.line}`,
                    color: hitWater === k ? "#fff" : C.inkSoft,
                    fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                    fontFamily: "DM Sans",
                  }}
                >{lbl}</button>
              ))}
            </div>
          </>
        )}

        {/* Movement (if training was skipped/disabled) */}
        {tp.training === false && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .3 }}>Movement</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[["true","Enough 🚶", MOVE_CLR], ["false","Low 😴", C.coral]].map(([k, lbl, clr]) => (
                <button
                  key={k}
                  className="sprig-tap"
                  onClick={() => { setEnoughMovement(k); buzz("select"); }}
                  style={{
                    flex: 1, padding: "13px 6px", borderRadius: 12,
                    background: enoughMovement === k ? clr : C.bg2,
                    border: enoughMovement === k ? "none" : `1px solid ${C.line}`,
                    color: enoughMovement === k ? "#fff" : C.inkSoft,
                    fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                    fontFamily: "DM Sans",
                  }}
                >{lbl}</button>
              ))}
            </div>
          </>
        )}

        {/* Alcohol — optional */}
        {tp.alcohol !== false && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: .3 }}>Alcohol</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
              {[["true","None 🌿", MOVE_CLR], ["false","Some 🍷", C.amber]].map(([k, lbl, clr]) => (
                <button
                  key={k}
                  className="sprig-tap"
                  onClick={() => { setNoAlcohol(k); buzz("select"); }}
                  style={{
                    flex: 1, padding: "11px 6px", borderRadius: 12,
                    background: noAlcohol === k ? clr : C.bg2,
                    border: noAlcohol === k ? "none" : `1px solid ${C.line}`,
                    color: noAlcohol === k ? "#fff" : C.inkSoft,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                    fontFamily: "DM Sans",
                  }}
                >{lbl}</button>
              ))}
            </div>
          </>
        )}

        <NextBtn onNext={advance} label="Almost done" color={SLEEP_CLR} />
      </>
    );
  }

  /* ── STEP: DONE ── */
  function StepDone() {
    const lines = [
      trainedToday === true && `🏋️ Trained${trainingType ? ` — ${TRAIN_TYPES.find(t => t[0] === trainingType)?.[1] || trainingType}` : ""}${trainingIntensity ? ` (${trainingIntensity})` : ""}`,
      trainedToday === false && "😴 Rest day",
      hitProtein === "true" && "✅ Hit protein",
      hitProtein === "false" && "❌ Missed protein",
      hitCalories === "true" && ateHealthy === "true" && "✅ Eating on track",
      hitCalories === "false" && "🥗 Ate light",
      hitCalories === "true" && ateHealthy === "false" && "🍕 Over on food",
      enoughSleep === "true" && "😌 Good sleep",
      enoughSleep === "false" && "😵 Poor sleep",
      hitWater === "true" && "💧 Hit water goal",
      hitWater === "false" && "😬 Low on water",
      noAlcohol === "true" && "🌿 No alcohol",
      noAlcohol === "false" && "🍷 Some alcohol",
    ].filter(Boolean);

    return (
      <>
        {/* Done header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>⚡</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.ink }}>
            Day logged
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Quick estimate saved — exact logs always win.
          </div>
        </div>

        {/* Summary */}
        {lines.length > 0 && (
          <div
            style={{
              background: C.bg2,
              borderRadius: 16,
              padding: "14px 16px",
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            {lines.map((l, i) => (
              <div key={i} style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.4 }}>
                {l}
              </div>
            ))}
          </div>
        )}

        {/* Save CTA */}
        <button
          className="sprig-tap"
          onClick={submit}
          style={{
            width: "100%",
            background: `linear-gradient(135deg, #C7FF3D 0%, #85D93B 100%)`,
            border: "none",
            cursor: "pointer",
            borderRadius: 18,
            padding: "18px 0",
            color: "#0A1F12",
            fontSize: 16,
            fontWeight: 800,
            fontFamily: "DM Sans",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            boxShadow: "0 8px 28px rgba(199,255,61,0.30)",
            letterSpacing: -.3,
          }}
        >
          <Check size={19} /> Save my day
        </button>

        <button
          className="sprig-tap"
          onClick={() => setStep(0)}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.muted,
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: "DM Sans",
            marginTop: 12,
            padding: "6px 0",
          }}
        >
          ← Edit answers
        </button>
      </>
    );
  }

  /* ── render ── */
  const stepColor =
    currentKey === "training" ? MOVE_CLR
    : currentKey === "nutrition" ? NUTR_CLR
    : currentKey === "recovery" ? SLEEP_CLR
    : C.lime;

  return (
    <Portal>
      <div
        className="sprig-dim"
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.62)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          display: "grid",
          placeItems: "flex-end center",
          zIndex: 3000,
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="sprig-sheet"
          style={{
            width: "100%",
            maxWidth: 440,
            background: C.cardSolid,
            border: `1px solid rgba(255,255,255,0.10)`,
            borderRadius: "24px 24px 0 0",
            padding: "20px 18px",
            paddingBottom: `calc(28px + env(safe-area-inset-bottom, 0px))`,
            maxHeight: "92vh",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            boxShadow: "0 -12px 50px rgba(0,0,0,.60)",
          }}
        >
          {/* drag handle */}
          <div style={{ width: 36, height: 4, borderRadius: 99, background: C.line, margin: "0 auto 18px" }} />

          {/* progress bar (not on done screen) */}
          {currentKey !== "done" && (
            <ProgressBar
              step={step}
              total={totalSteps}
              color={stepColor}
            />
          )}

          {/* step content */}
          {currentKey === "training"  && <StepTraining  />}
          {currentKey === "nutrition" && <StepNutrition />}
          {currentKey === "recovery"  && <StepRecovery  />}
          {currentKey === "done"      && <StepDone      />}
        </div>
      </div>
    </Portal>
  );
}

export default QuickLogSheet;
