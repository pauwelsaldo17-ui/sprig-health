// src/screens/CoachTab.jsx
// Premium AI Coach — the app's biggest differentiator.
// One clear priority + cross-domain synthesis + domain color identity.

import React, { useState } from "react";
import {
  Activity, Brain, ChevronRight, ChevronDown,
  Dumbbell, Flame, Heart, Lightbulb,
  Moon, Search, Sparkles, Square, Target, TrendingUp, Zap,
} from "lucide-react";
import { C } from "../theme.js";

const HAPTIC_PATTERNS = {
  tap: 14, light: 10, select: 8,
  success: [30, 50, 30], complete: [30, 50, 50],
  strong: 40, error: [100, 50, 100],
};
function buzz(kind = "tap") {
  try { navigator.vibrate?.(HAPTIC_PATTERNS[kind] ?? 14); } catch (_) {}
}

/* ─── domain palette ────────────────────────────────────────────── */
const COACH_CLR = "#C084FC";  // purple-pink — AI intelligence feel
const SLEEP_CLR = "#8B7CF7";
const NUTR_CLR  = "#FB923C";
const MOVE_CLR  = "#52C878";
const RECOV_CLR = "#4FC3F7";

/* ─── Ask Coach CTA ─────────────────────────────────────────────── */
function AskCoachCTA({ onAsk, coach, plateaus, patterns }) {
  if (!onAsk) return null;

  // Build context-aware quick question chips
  const chips = [];
  const recovLevel = coach?.recovery?.level;
  if (recovLevel === "rest" || recovLevel === "light") {
    chips.push("Am I recovering well enough to train today?");
  } else {
    chips.push("How hard should I train today?");
  }
  if (plateaus?.weight) {
    chips.push("Why has my weight stopped changing?");
  } else if (plateaus?.strength?.length) {
    chips.push("Why are my lifts stalling?");
  } else {
    chips.push("Am I eating right for my goal?");
  }
  chips.push("How can I improve my sleep quality?");

  return (
    <div style={{ marginBottom: 14 }}>
      <button
        className="sprig-tap"
        onClick={() => onAsk("")}
        style={{
          width: "100%",
          background: `linear-gradient(135deg, #B5FF47 0%, #7FD93E 100%)`,
          border: "none",
          cursor: "pointer",
          borderRadius: 20,
          padding: "17px 18px",
          color: "#0A1F12",
          display: "flex",
          alignItems: "center",
          gap: 13,
          boxShadow: `0 8px 28px rgba(181,255,71,0.35)`,
        }}
      >
        <div style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(0,0,0,.10)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Sparkles size={21} color="#0A1F12" />
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -.3 }}>Ask your coach</div>
          <div style={{ fontSize: 12, opacity: .65, marginTop: 2 }}>Sleep, food, training, recovery — anything</div>
        </div>
        <ChevronRight size={18} color="#0A1F12" />
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
        {chips.map((chip) => (
          <button key={chip} className="sprig-tap" onClick={() => onAsk(chip)}
            style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "9px 13px", textAlign: "left", fontFamily: "DM Sans", fontSize: 12.5, color: C.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>⚡</span>
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Priority Action — ONE bold CTA ───────────────────────────── */
function PriorityAction({ bullets, summary }) {
  const top = bullets?.[0];
  if (!top) return null;
  return (
    <div
      style={{
        background: C.card,
        border: `1.5px solid ${MOVE_CLR}44`,
        borderRadius: 20,
        padding: "16px 16px",
        marginBottom: 10,
        boxShadow: C.shadow,
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: 7,
          fontSize: 10.5, fontWeight: 700, color: MOVE_CLR,
          textTransform: "uppercase", letterSpacing: .8,
          marginBottom: 10,
        }}
      >
        <Target size={13} color={MOVE_CLR} /> Today's priority
      </div>
      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 18, fontWeight: 700,
          color: C.ink, lineHeight: 1.3,
        }}
      >
        {top}
      </div>
      {summary && (
        <div
          style={{
            fontSize: 12.5, color: C.muted,
            marginTop: 7, lineHeight: 1.5,
          }}
        >
          {summary}
        </div>
      )}
    </div>
  );
}

/* ─── Daily Briefing ────────────────────────────────────────────── */
function DailyBriefing({ coach }) {
  if (!coach?.daily) return null;
  const { summary, bullets } = coach.daily;
  return (
    <div
      style={{
        background: C.heroGrad1,
        borderRadius: 22,
        padding: "18px 18px 16px",
        marginBottom: 10,
        boxShadow: C.shadow,
        color: "#fff",
      }}
    >
      {/* eyebrow */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10.5, opacity: .85, letterSpacing: .5,
          marginBottom: 10,
          fontWeight: 700, textTransform: "uppercase",
        }}
      >
        <Sparkles size={13} color="#E9D5FF" /> Coach analysis
      </div>
      {/* summary */}
      <div
        style={{
          fontFamily: "Fraunces, serif",
          fontSize: 17, fontWeight: 700,
          lineHeight: 1.35, marginBottom: 10,
        }}
      >
        {summary || "Log a few more days for your personalized briefing."}
      </div>
      {/* top 2 bullets */}
      {bullets?.slice(0, 2).map((b, i) => (
        <div
          key={i}
          style={{
            display: "flex", alignItems: "flex-start", gap: 8,
            marginBottom: i < 1 ? 7 : 0,
          }}
        >
          <div
            style={{
              width: 20, height: 20, borderRadius: 6,
              background: "rgba(255,255,255,.15)",
              fontSize: 10, fontWeight: 700,
              display: "grid", placeItems: "center",
              flexShrink: 0, marginTop: 2,
            }}
          >
            {i + 1}
          </div>
          <span style={{ fontSize: 12.5, opacity: .9, lineHeight: 1.5 }}>{b}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Cross-Domain Insight ──────────────────────────────────────── */
function CrossDomainInsight({ patterns, advanced, onAsk }) {
  if (!patterns?.length) return null;
  const p = patterns[0];
  const emoji =
    p.kind === "alcohol_sleep" ? "🍷"
    : p.kind === "steps_mood"   ? "🚶"
    : p.kind === "pain_exercise"? "⚠️"
    : "🔗";
  const askQ =
    p.kind === "alcohol_sleep" ? "How is my alcohol intake affecting my sleep quality?"
    : p.kind === "steps_mood"   ? "How are my daily steps affecting my mood and energy?"
    : p.kind === "pain_exercise"? "How should I train given the pain pattern you detected?"
    : `Tell me more about this pattern: ${p.text}`;
  const Container = onAsk ? "button" : "div";
  const containerProps = onAsk ? {
    className: "sprig-tap",
    onClick: () => { onAsk(askQ); buzz("tap"); },
    style: {
      width: "100%", background: `${COACH_CLR}10`, border: `1px solid ${COACH_CLR}28`,
      borderRadius: 18, padding: "14px 15px", marginBottom: 10,
      display: "flex", gap: 11, alignItems: "flex-start",
      cursor: "pointer", fontFamily: "DM Sans", textAlign: "left",
    },
  } : {
    style: {
      background: `${COACH_CLR}10`, border: `1px solid ${COACH_CLR}28`,
      borderRadius: 18, padding: "14px 15px", marginBottom: 10,
      display: "flex", gap: 11, alignItems: "flex-start",
    },
  };
  return (
    <Container {...containerProps}>
      <span style={{ fontSize: 20, lineHeight: 1.2, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: COACH_CLR, textTransform: "uppercase", letterSpacing: .6, marginBottom: 5 }}>
          Pattern detected
        </div>
        <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>
          {p.text}
        </div>
        {advanced && patterns.length > 1 && (
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
            +{patterns.length - 1} more patterns in your data
          </div>
        )}
        {onAsk && (
          <div style={{ fontSize: 11, fontWeight: 700, color: COACH_CLR, marginTop: 8, display: "flex", alignItems: "center", gap: 3 }}>
            Ask about this <ChevronRight size={10} />
          </div>
        )}
      </div>
    </Container>
  );
}

/* ─── Progress Diagnostic ───────────────────────────────────────── */
function ProgressDiag({ moveInfo, onAsk }) {
  const diag = moveInfo?.diagnosis;
  if (!diag) return null;
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        padding: "14px 15px",
        marginBottom: 10,
        boxShadow: C.shadow,
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10.5, fontWeight: 700, color: C.muted,
          textTransform: "uppercase", letterSpacing: .6, marginBottom: 10,
        }}
      >
        <Search size={12} color={C.muted} /> Why am I not progressing?
      </div>
      {diag.enough ? (
        diag.bottleneck ? (
          <>
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 16, fontWeight: 700,
                color: C.ink, lineHeight: 1.3, marginBottom: 6,
              }}
            >
              {diag.bottleneck.title}
            </div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5, marginBottom: 8 }}>
              {diag.bottleneck.detail}
            </div>
            <div
              style={{
                background: `${MOVE_CLR}18`,
                border: `1px solid ${MOVE_CLR}35`,
                borderRadius: 11,
                padding: "9px 12px",
              }}
            >
              <span style={{ fontSize: 11, color: MOVE_CLR, fontWeight: 700 }}>Fix: </span>
              <span style={{ fontSize: 12.5, color: C.inkSoft }}>{diag.bottleneck.fix}</span>
            </div>
            {diag.good?.length > 0 && (
              <div style={{ fontSize: 11.5, color: MOVE_CLR, marginTop: 9 }}>
                ✓ {diag.good.join(" · ")}
              </div>
            )}
            {/* ── Secondary bottlenecks ── */}
            {diag.others?.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Also look at</div>
                {diag.others.map((o, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: i > 0 ? 7 : 0 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber, flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{o.title}</div>
                      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 2, lineHeight: 1.4 }}>{o.fix}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {onAsk && (
              <button className="sprig-tap" onClick={() => { onAsk(`${diag.bottleneck.title}: ${diag.bottleneck.fix} — give me a specific week-by-week plan.`); buzz("tap"); }}
                style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 5, background: MOVE_CLR + "12", border: `1px solid ${MOVE_CLR}33`, borderRadius: 9, padding: "6px 11px", cursor: "pointer", fontFamily: "DM Sans", fontSize: 12, fontWeight: 700, color: MOVE_CLR }}>
                <Sparkles size={12} color={MOVE_CLR} />
                Ask coach about this →
              </button>
            )}
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 16, fontWeight: 700,
                color: C.ink, marginBottom: 5,
              }}
            >
              No clear bottleneck 🌿
            </div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
              {diag.summary}{" "}
              {diag.good?.length ? `Going well: ${diag.good.join(", ")}.` : ""}
            </div>
          </>
        )
      ) : (
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
          <span style={{ color: C.inkSoft, fontWeight: 600 }}>Log more data</span> to see your progress analysis.
        </div>
      )}
    </div>
  );
}

/* ─── Domain Coach Card ─────────────────────────────────────────── */
function DomainCard({ icon, color, title, summary, bullets, onOpen, openLabel, onAsk }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? bullets : bullets?.slice(0, 2);
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 18,
        overflow: "hidden",
        marginBottom: 8,
        boxShadow: C.shadow,
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 15px",
        }}
      >
        <div
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: color + "1f",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "Fraunces, serif",
              fontSize: 15.5, fontWeight: 700, color: C.ink,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 12, color: C.muted,
              marginTop: 2, lineHeight: 1.35,
            }}
          >
            {summary}
          </div>
        </div>
        {/* open tab button */}
        {onOpen && (
          <button
            className="sprig-tap"
            onClick={onOpen}
            style={{
              background: color + "18",
              border: "none", cursor: "pointer",
              borderRadius: 10,
              padding: "6px 10px",
              color,
              fontSize: 11, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 2,
              flexShrink: 0,
            }}
          >
            {openLabel} <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* bullets */}
      {bullets?.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${C.line}`,
            padding: "11px 15px 13px",
            display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          {shown.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 19, height: 19, borderRadius: 6,
                  background: i === 0 ? color : C.bg2,
                  color: i === 0 ? "#fff" : color,
                  fontSize: 10, fontWeight: 700,
                  display: "grid", placeItems: "center",
                  flexShrink: 0, marginTop: 2,
                }}
              >
                {i + 1}
              </div>
              <span style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>{b}</span>
            </div>
          ))}
          {bullets.length > 2 && (
            <button
              className="sprig-tap"
              onClick={() => setExpanded((e) => !e)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: color,
                fontSize: 11.5, fontWeight: 700,
                padding: "2px 0", textAlign: "left",
                display: "flex", alignItems: "center", gap: 3,
              }}
            >
              {expanded ? "Show less" : `+${bullets.length - 2} more`}
              <ChevronDown
                size={13}
                style={{
                  transform: expanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>
          )}
        </div>
      )}
      {onAsk && summary && (
        <div style={{ borderTop: bullets?.length > 0 ? "none" : `1px solid ${C.line}`, padding: "0 15px 13px" }}>
          <button className="sprig-tap" onClick={() => { onAsk(`${title}: ${summary} — give me specific, actionable steps I can start today.`); buzz("tap"); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 7,
              background: color + "10", border: `1px solid ${color}30`,
              borderRadius: 9, padding: "7px 11px", cursor: "pointer",
              fontFamily: "DM Sans", textAlign: "left" }}>
            <Sparkles size={12} color={color} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color, flex: 1 }}>Dig deeper with coach →</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Goal Timeline ─────────────────────────────────────────────── */
function GoalTimeline({ timeline }) {
  if (!timeline?.weight && !timeline?.strength?.length) return null;
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        padding: "14px 15px",
        marginBottom: 8,
        boxShadow: C.shadow,
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 10.5, fontWeight: 700, color: C.muted,
          textTransform: "uppercase", letterSpacing: .6, marginBottom: 10,
        }}
      >
        <TrendingUp size={13} color={MOVE_CLR} /> Goal progress
      </div>

      {timeline.weight && (
        <div
          style={{
            background: C.bg,
            borderRadius: 11,
            padding: "10px 12px",
            marginBottom: timeline.strength?.length ? 8 : 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Weight</span>
            <span
              style={{
                fontSize: 11.5, fontWeight: 700,
                color: timeline.weight.color || MOVE_CLR,
              }}
            >
              {timeline.weight.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
            {timeline.weight.current}kg → {timeline.weight.target}kg{" "}
            <span style={{ color: C.muted }}>
              ({timeline.weight.kgLeft > 0 ? "+" : ""}
              {timeline.weight.kgLeft}kg left)
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>
            {timeline.weight.rate > 0 ? "+" : ""}
            {timeline.weight.rate} kg/wk
            {timeline.weight.weeksAtPace > 0 &&
              ` · ~${timeline.weight.weeksAtPace} weeks at this pace`}
          </div>
        </div>
      )}

      {timeline.strength?.length > 0 && (
        <div
          style={{ background: C.bg, borderRadius: 11, padding: "10px 12px" }}
        >
          <div
            style={{
              fontSize: 11.5, fontWeight: 700, color: C.muted,
              marginBottom: 7, textTransform: "uppercase",
              letterSpacing: .4, fontSize: 10,
            }}
          >
            Strength
          </div>
          {timeline.strength.map((s) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5, color: C.ink, marginTop: 5,
              }}
            >
              <span>{s.name.replace("Barbell ", "")}</span>
              <span>
                <b>{s.e1}kg</b>{" "}
                <span
                  style={{ color: s.perMonth > 0 ? MOVE_CLR : C.muted }}
                >
                  ({s.perMonth > 0 ? "+" : ""}
                  {s.perMonth}/mo)
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Plateaus ──────────────────────────────────────────────────── */
function PlateauSection({ plateaus }) {
  const [open, setOpen] = useState(false);
  if (!plateaus?.length) return null;
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 18,
        overflow: "hidden",
        marginBottom: 8,
        boxShadow: C.shadow,
      }}
    >
      <button
        className="sprig-tap"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "none", border: "none",
          cursor: "pointer",
          padding: "13px 15px",
          display: "flex", alignItems: "center", gap: 8,
          textAlign: "left",
        }}
      >
        <Square size={14} color={C.amber} />
        <span
          style={{
            flex: 1, fontSize: 13,
            fontWeight: 700, color: C.inkSoft,
          }}
        >
          Plateaus detected
          <span
            style={{
              marginLeft: 7, fontSize: 10.5,
              fontWeight: 700, color: C.amber,
              background: `${C.amber}20`,
              borderRadius: 6, padding: "2px 6px",
            }}
          >
            {plateaus.length}
          </span>
        </span>
        <ChevronDown
          size={15}
          color={C.muted}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open && (
        <div style={{ padding: "0 15px 14px" }}>
          {plateaus.map((p, i) => (
            <div
              key={i}
              style={{
                background: C.bg,
                borderRadius: 11,
                padding: "10px 12px",
                marginTop: i ? 7 : 0,
              }}
            >
              <div
                style={{
                  fontSize: 13, fontWeight: 700,
                  color: C.ink, lineHeight: 1.35,
                }}
              >
                {p.title}
              </div>
              <ul
                style={{
                  margin: "5px 0 0",
                  paddingLeft: 18,
                  fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55,
                }}
              >
                {p.reasons.map((r, j) => <li key={j}>{r}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Export ───────────────────────────────────────────────── */
function CoachTab({
  coach,
  advanced,
  moveInfo,
  timeline,
  plateaus,
  patterns,
  onGoTrain,
  onGoMeals,
  onGoSleep,
  onGoHealth,
  onAsk,
}) {
  /* derive recovery color from level */
  const recovLevel = coach?.recovery?.level;
  const recovColor =
    recovLevel === "hard" || recovLevel === "normal"
      ? MOVE_CLR
      : recovLevel === "light"
      ? C.amber
      : C.coral;

  return (
    <div className="sprig-rise">
      {/* ── page title */}
      <div style={{ margin: "4px 2px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: `linear-gradient(135deg, ${COACH_CLR}33 0%, ${SLEEP_CLR}22 100%)`, border: `1px solid ${COACH_CLR}33`, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Brain size={20} color={COACH_CLR} />
        </div>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: -.3, lineHeight: 1.1 }}>
            Your coach
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>
            More you log, sharper the advice.
          </div>
        </div>
      </div>

      {/* ── Ask Coach CTA */}
      <AskCoachCTA onAsk={onAsk} coach={coach} plateaus={plateaus} patterns={patterns} />

      {/* ── Today's Priority */}
      <PriorityAction
        bullets={coach?.daily?.bullets}
        summary={coach?.daily?.summary}
      />

      {/* ── Daily Briefing (from coach.daily, shows synthesis) */}
      <DailyBriefing coach={coach} />

      {/* ── Cross-domain pattern */}
      <CrossDomainInsight patterns={patterns} advanced={advanced} onAsk={onAsk} />

      {/* ── Domain cards */}
      {coach?.training && (
        <DomainCard
          icon={<Dumbbell size={18} color={MOVE_CLR} />}
          color={MOVE_CLR}
          title="Training"
          summary={coach.training.summary}
          bullets={coach.training.bullets}
          onOpen={onGoTrain}
          openLabel="Open"
          onAsk={onAsk}
        />
      )}
      {coach?.nutrition && (
        <DomainCard
          icon={<Flame size={18} color={NUTR_CLR} />}
          color={NUTR_CLR}
          title="Nutrition"
          summary={coach.nutrition.summary}
          bullets={coach.nutrition.bullets}
          onOpen={onGoMeals}
          openLabel="Log food"
          onAsk={onAsk}
        />
      )}
      {coach?.recovery && (
        <DomainCard
          icon={<Moon size={18} color={recovColor} />}
          color={recovColor}
          title="Recovery & Sleep"
          summary={coach.recovery.summary}
          bullets={coach.recovery.bullets}
          onOpen={onGoSleep}
          openLabel="Open"
          onAsk={onAsk}
        />
      )}

      {/* ── Progress diagnostic */}
      <ProgressDiag moveInfo={moveInfo} onAsk={onAsk} />

      {/* ── Goal timeline */}
      <GoalTimeline timeline={timeline} />

      {/* ── Plateaus (collapsible) */}
      <PlateauSection plateaus={plateaus} />

      {/* ── More patterns (advanced) */}
      {advanced && patterns?.length > 1 && (
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.line}`,
            borderRadius: 18,
            padding: "14px 15px",
            marginBottom: 8,
            boxShadow: C.shadow,
          }}
        >
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 10.5, fontWeight: 700, color: COACH_CLR,
              textTransform: "uppercase", letterSpacing: .6,
              marginBottom: 10,
            }}
          >
            <Search size={12} color={COACH_CLR} /> All patterns
          </div>
          {patterns.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: 8, alignItems: "flex-start",
                padding: i ? "8px 0 0" : "0",
                borderTop: i ? `1px solid ${C.line}` : "none",
                marginTop: i ? 0 : 0,
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1.3, flexShrink: 0 }}>
                {p.kind === "alcohol_sleep" ? "🍷"
                  : p.kind === "steps_mood" ? "🚶"
                  : p.kind === "pain_exercise" ? "⚠️"
                  : "🔎"}
              </span>
              <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
                {p.text}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 10 }} />
    </div>
  );
}

export default CoachTab;
