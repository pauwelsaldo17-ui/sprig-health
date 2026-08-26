import React, { useState } from "react";
import { ChevronRight, Dumbbell, Flame, Moon, Search, Sparkles, Square, Target, Zap } from "lucide-react";
import { C } from "../theme.js";

function CoachCard({ icon, color, title, summary, bullets, accent, onOpen, openLabel }) {
  const [open, setOpen] = useState(false);
  const shown = open ? bullets : bullets.slice(0, 3);
  return (
    <div style={{ background: C.card, borderRadius: 20, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 10, overflow: "hidden" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 16px" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: color + "1f", display: "grid", placeItems: "center", flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 16.5, fontWeight: 700, color: C.ink }}>{title}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{summary}</div>
        </div>
        {onOpen && <button className="sprig-tap" onClick={onOpen} style={{ background: "none", border: "none", cursor: "pointer", color, fontSize: 11.5, fontWeight: 700, padding: "4px 0", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>{openLabel} <ChevronRight size={13} /></button>}
      </div>
      {/* bullets */}
      {bullets?.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.line}`, padding: "12px 16px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
          {shown.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ width: 20, height: 20, borderRadius: 6, background: i === 0 ? color : C.bg2, color: i === 0 ? "#fff" : color, fontSize: 10.5, fontWeight: 700, display: "grid", placeItems: "center", flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.5 }}>{b}</span>
            </div>
          ))}
          {bullets.length > 3 && (
            <button className="sprig-tap" onClick={() => setOpen((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 11.5, fontWeight: 600, padding: "2px 0", textAlign: "left" }}>
              {open ? "Show less" : `+${bullets.length - 3} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CoachTab({ coach, advanced, moveInfo, timeline, plateaus, patterns, onGoTrain, onGoMeals, onGoSleep, onGoHealth, onAsk }) {
  const recColor = coach.recovery.level === "hard" || coach.recovery.level === "normal" ? C.greenSoft
    : coach.recovery.level === "light" ? C.amber : C.coral;
  const diag = moveInfo?.diagnosis;
  return (
    <div className="sprig-rise">
      <div style={{ margin: "4px 2px 18px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: -.3 }}>Your coach</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>Clear actions from your data — no fluff. More you log, sharper the advice.</div>
      </div>

      {onAsk && (
        <button className="sprig-tap" onClick={onAsk}
          style={{ width: "100%", background: C.lime, border: "none", cursor: "pointer", borderRadius: 16, padding: "16px 16px", color: "#0A1F12", display: "flex", alignItems: "center", gap: 12, marginBottom: 16, boxShadow: `0 8px 24px ${C.lime}40` }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(0,0,0,.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Sparkles size={20} color="#0A1F12" />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: -.2 }}>Ask coach</div>
            <div style={{ fontSize: 11.5, opacity: .65, marginTop: 2 }}>Training, food, sleep, recovery — anything</div>
          </div>
          <ChevronRight size={17} />
        </button>
      )}

      {/* WHY AM I NOT PROGRESSING — headline diagnostic */}
      {diag && (diag.enough ? (
        <div style={{ background: C.heroGrad1, borderRadius: 20, padding: 18, color: "#fff", boxShadow: C.shadow, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: .75, letterSpacing: .3, marginBottom: 8 }}>
            <Search size={14} color="#E7DCC6" /> Why am I not progressing?
          </div>
          {diag.bottleneck ? (
            <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{diag.bottleneck.title}</div>
              <div style={{ fontSize: 12.5, opacity: .9, marginTop: 6, lineHeight: 1.5 }}>{diag.bottleneck.detail}</div>
              <div style={{ background: "rgba(255,255,255,.12)", borderRadius: 11, padding: "10px 12px", marginTop: 11 }}>
                <span style={{ fontSize: 11, opacity: .8, fontWeight: 600 }}>Try this: </span>
                <span style={{ fontSize: 12.5 }}>{diag.bottleneck.fix}</span>
              </div>
              {diag.good.length > 0 && (
                <div style={{ fontSize: 11.5, opacity: .8, marginTop: 10 }}>✓ Going well: {diag.good.join(", ")}.</div>
              )}
              {advanced && diag.others.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: "pointer", listStyle: "none", fontSize: 11, opacity: .75, fontWeight: 600 }}>▾ Other factors</summary>
                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 5 }}>
                    {diag.others.map((o, i) => (
                      <div key={i} style={{ fontSize: 11.5, opacity: .85, lineHeight: 1.45 }}>• <b>{o.title}:</b> {o.fix}</div>
                    ))}
                  </div>
                </details>
              )}
            </>
          ) : (
            <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700 }}>No clear bottleneck 🌿</div>
              <div style={{ fontSize: 12.5, opacity: .9, marginTop: 6, lineHeight: 1.5 }}>{diag.summary} {diag.good.length ? `Going well: ${diag.good.join(", ")}.` : ""}</div>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "14px 16px", marginBottom: 12, fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>
          <b style={{ color: C.inkSoft }}>Why am I not progressing?</b><br />{diag.summary}
        </div>
      ))}

      <CoachCard icon={<Zap size={19} color={C.green} />} color={C.green}
        title="Daily coach" summary={coach.daily.summary} bullets={coach.daily.bullets} />

      <CoachCard icon={<Dumbbell size={19} color="#3E7B53" />} color="#3E7B53"
        title="Training coach" summary={coach.training.summary} bullets={coach.training.bullets}
        onOpen={onGoTrain} openLabel="Open Train" />

      <CoachCard icon={<Flame size={19} color={C.amber} />} color={C.amber}
        title="Nutrition coach" summary={coach.nutrition.summary} bullets={coach.nutrition.bullets}
        onOpen={onGoMeals} openLabel="Log food" />

      <CoachCard icon={<Moon size={19} color={recColor} />} color={recColor}
        title="Recovery coach" summary={coach.recovery.summary} bullets={coach.recovery.bullets}
        onOpen={onGoSleep} openLabel="Open Sleep" />

      {/* GOAL TIMELINE */}
      {Boolean(timeline?.weight || (timeline?.strength && timeline.strength.length)) && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>
            <Target size={15} color={C.greenSoft} /> Goal timeline
          </div>
          {timeline.weight && (
            <div style={{ background: C.bg, borderRadius: 11, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                <span className="sprig-eyebrow" style={{ fontSize: 12 }}>Weight</span>
                <span style={{ fontSize: 11.5, color: timeline.weight.color, fontWeight: 700 }}>{timeline.weight.status}</span>
              </div>
              <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
                {timeline.weight.current}kg → {timeline.weight.target}kg
                <span style={{ color: C.muted }}> ({timeline.weight.kgLeft > 0 ? "+" : ""}{timeline.weight.kgLeft}kg left)</span>
              </div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>
                Pace: {timeline.weight.rate > 0 ? "+" : ""}{timeline.weight.rate} kg/week
                {timeline.weight.weeksAtPace && timeline.weight.weeksAtPace > 0 && ` · ~${timeline.weight.weeksAtPace}w at this pace`}
              </div>
            </div>
          )}
          {timeline.strength?.length > 0 && (
            <div style={{ background: C.bg, borderRadius: 11, padding: "10px 12px" }}>
              <div className="sprig-eyebrow" style={{ fontSize: 12, marginBottom: 6 }}>Strength</div>
              {timeline.strength.map((s) => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.ink, marginTop: 3 }}>
                  <span>{s.name.replace("Barbell ", "")}</span>
                  <span><b>{s.e1}kg</b> e1RM <span style={{ color: s.perMonth > 0 ? C.greenSoft : C.muted }}>({s.perMonth > 0 ? "+" : ""}{s.perMonth}/mo)</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLATEAUS */}
      {plateaus?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>
            <Square size={14} color={C.amber} /> Plateaus detected
          </div>
          {plateaus.map((p, i) => (
            <div key={i} style={{ background: C.bg, borderRadius: 11, padding: "10px 12px", marginTop: i ? 8 : 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.4 }}>{p.title}</div>
              <div className="sprig-eyebrow" style={{ marginTop: 6 }}>Possible reasons</div>
              <ul style={{ margin: "4px 0 0", padding: "0 0 0 18px", fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55 }}>
                {p.reasons.map((r, j) => <li key={j}>{r}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* PATTERN DETECTION */}
      {patterns?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>
            <Search size={14} color="#7A6FB0" /> Patterns in your data
          </div>
          {patterns.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <span style={{ fontSize: 14, lineHeight: 1.3 }}>{p.kind === "alcohol_sleep" ? "🍷" : p.kind === "steps_mood" ? "🚶" : p.kind === "pain_exercise" ? "⚠️" : "🔎"}</span>
              <div style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>{p.text}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 4, lineHeight: 1.5, padding: "0 14px" }}>
        These recommendations are rule-based and run instantly on your device — no AI calls, no waiting. The more you log, the sharper they get. 🌿
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}

export default CoachTab;
