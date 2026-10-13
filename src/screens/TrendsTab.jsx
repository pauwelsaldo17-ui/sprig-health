import React from "react";
import { Activity, BarChart3, Coffee, Dumbbell, Flame, Moon, Sparkles, Trophy, User, TrendingUp } from "lucide-react";
import { C } from "../theme.js";
import { durLabel } from "../utils/vitaeCalc.js";
import { Legend, EmptyState } from "../components/ui.jsx";

const TRENDS_CLR = "#38BDF8";

function ReportStat({ label, value, sub, icon, color }) {
  return (
    <div style={{ background: C.bg, borderRadius: 12, padding: "11px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: color || C.greenSoft, fontSize: 11, fontWeight: 600 }}>{icon} {label}</div>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, marginTop: 4, color: C.ink }}>{value}</div>
      <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{sub}</div>
    </div>
  );
}
function ReportLine({ emoji, label, text, color }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.3 }}>{emoji}</span>
      <div>
        <div style={{ fontSize: 10.5, color: color, fontWeight: 700, letterSpacing: .3, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 13, color: C.ink, marginTop: 1, lineHeight: 1.45 }}>{text}</div>
      </div>
    </div>
  );
}

function TrendsTab({ history, targets, t, scores, sleepLogs, sleepInfo, advanced, report, profile, achievements, timeline, onGoToday }) {
  const days = history.slice(-7);
  const maxC = Math.max(targets.calories, ...days.map((d) => d.calories), 1);
  const avg = days.length ? Math.round(days.reduce((a, d) => a + d.calories, 0) / days.length) : 0;
  const unit = profile?.unit || "kg";
  const R = report || {};
  const stepDays = history.slice(-7).filter((d) => d.steps > 0);
  const maxSteps = stepDays.length > 0 ? Math.max(...stepDays.map((d) => d.steps)) : 0;
  return (
    <div className="sprig-rise">
      {/* ── Domain header ── */}
      <div style={{ margin: "4px 2px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: `${TRENDS_CLR}22`, border: `1px solid ${TRENDS_CLR}33`, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <TrendingUp size={20} color={TRENDS_CLR} />
        </div>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: -.3, lineHeight: 1.1 }}>Trends</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>Your last 7 days at a glance.</div>
        </div>
      </div>

      {/* WEEKLY REPORT */}
      {R.hasData ? (
        <div style={{ background: C.card, borderRadius: 20, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <BarChart3 size={17} color={TRENDS_CLR} />
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700 }}>Weekly report</div>
          </div>

          {/* stat grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <ReportStat label="Training" value={`${R.training.count} workout${R.training.count !== 1 ? "s" : ""}`} sub={R.training.totalSets ? `${R.training.totalSets} sets` : "—"} icon={<Dumbbell size={13} />} color="#3E7B53" />
            <ReportStat label="Sleep" value={R.sleep.avgMin != null ? durLabel(R.sleep.avgMin) : "—"} sub={R.sleep.avgScore != null ? `score ${R.sleep.avgScore}` : `${R.sleep.nights} nights`} icon={<Moon size={13} />} color="#7A6FB0" />
            <ReportStat label="Avg calories" value={R.nutrition.avgCal != null ? `${R.nutrition.avgCal}` : "—"} sub={R.nutrition.foodDays ? `${R.nutrition.foodDays} days logged` : "no food logged"} icon={<Flame size={13} />} color={C.amber} />
            <ReportStat label="Avg protein" value={R.nutrition.avgProt != null ? `${R.nutrition.avgProt}g` : "—"} sub={`hit ${R.nutrition.proteinHitDays}/7 days`} icon={<Flame size={13} />} color={C.green} />
            {R.weight.current != null && (
              <ReportStat label="Weight" value={`${R.weight.current} ${unit}`} sub={R.weight.rate != null ? `${R.weight.rate > 0 ? "+" : ""}${R.weight.rate} ${unit}/wk` : "trend forming"} icon={<User size={13} />} color={C.amber} />
            )}
            {R.nutrition.avgSteps != null && (
              <ReportStat label="Avg steps" value={`${R.nutrition.avgSteps}`} sub="per day" icon={<Activity size={13} />} color={C.greenSoft} />
            )}
            {R.nutrition.avgWater != null && (
              <ReportStat label="Avg water" value={`${(R.nutrition.avgWater / 1000).toFixed(1)}L`} sub="per day" icon={<Coffee size={13} />} color="#5B9BD5" />
            )}
            {R.mind.consistency != null && (
              <ReportStat label="Habits" value={`${R.mind.consistency}%`} sub="consistency" icon={<Sparkles size={13} />} color={C.greenSoft} />
            )}
          </div>

          {/* top muscles */}
          {R.training.topMuscles.length > 0 && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 12, lineHeight: 1.5 }}>
              <b style={{ color: C.inkSoft }}>Most-trained:</b> {R.training.topMuscles.map((m) => `${m.name} (${m.sets})`).join(" · ")}
            </div>
          )}
          {/* PRs */}
          {R.training.prs.length > 0 && (
            <div style={{ fontSize: 11.5, color: TRENDS_CLR, marginTop: 6, lineHeight: 1.5, fontWeight: 600 }}>
              🏆 {R.training.prs.length} PR{R.training.prs.length > 1 ? "s" : ""}: {R.training.prs.slice(0, 3).map((p) => p.name).join(", ")}
            </div>
          )}
          {/* pain / stress */}
          {(R.pain.count > 0 || R.mind.stressHigh > 0) && (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
              {R.pain.count > 0 ? `Pain logged ${R.pain.count}×` : ""}{R.pain.count > 0 && R.mind.stressHigh > 0 ? " · " : ""}{R.mind.stressHigh > 0 ? `${R.mind.stressHigh} high-stress day${R.mind.stressHigh > 1 ? "s" : ""}` : ""}
            </div>
          )}

          {/* win / bottleneck / next */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 10 }}>
            {R.win && (
              <ReportLine emoji="🌟" label="Best win" text={R.win} color={TRENDS_CLR} />
            )}
            {R.bottleneck && (
              <ReportLine emoji="🚧" label="Biggest bottleneck" text={R.bottleneck} color={C.amber} />
            )}
            <ReportLine emoji="🎯" label="Next week" text={R.nextWeek} color={TRENDS_CLR} />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <EmptyState icon={<BarChart3 size={20} color={TRENDS_CLR} />}
            title="No weekly report yet"
            text="Log food, sleep, and workouts across a few days and your personalised weekly report builds automatically."
            actionLabel="Start logging" onAction={onGoToday} />
        </div>
      )}

      {/* GOAL TIMELINE */}
      {(timeline?.weight || timeline?.strength?.length > 0) && (
        <div style={{ background: C.card, borderRadius: 20, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <TrendingUp size={17} color={TRENDS_CLR} />
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700 }}>Goal progress</div>
          </div>

          {/* Weight goal */}
          {timeline.weight && (() => {
            const w = timeline.weight;
            const kgAbs = Math.abs(w.kgLeft);
            return (
              <div style={{ marginBottom: timeline.strength?.length > 0 ? 16 : 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: w.color, background: w.color + "18", border: `1px solid ${w.color}44`, borderRadius: 20, padding: "4px 11px", alignSelf: "flex-start" }}>{w.status}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{w.current} <span style={{ fontSize: 13, fontWeight: 400 }}>{unit}</span></div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>goal {w.target} {unit}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 0 }}>
                  {[
                    { label: "Left", value: `${kgAbs} ${unit}` },
                    { label: "Pace", value: `${w.rate > 0 ? "+" : ""}${w.rate}/wk` },
                    ...(w.weeksAtPace != null && w.weeksAtPace > 0 ? [{ label: "ETA", value: `~${w.weeksAtPace}w` }] : []),
                    { label: "Ideal", value: `${w.ideal > 0 ? "+" : ""}${w.ideal}/wk` },
                  ].map(({ label, value }, i, arr) => (
                    <div key={label} style={{ flex: 1, textAlign: "center", ...(i < arr.length - 1 ? { borderRight: `1px solid ${C.line}` } : {}) }}>
                      <div style={{ fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 3 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Strength e1RM trend */}
          {timeline.strength?.length > 0 && (
            <div style={{ ...(timeline.weight ? { paddingTop: 14, borderTop: `1px solid ${C.line}` } : {}) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Dumbbell size={13} color={C.inkSoft} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Strength e1RM trend</span>
              </div>
              {timeline.strength.map((s) => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: C.inkSoft }}>{s.name.replace("Barbell ", "")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 700, color: C.ink }}>{s.e1} {unit}</span>
                    <span style={{ fontSize: 11, color: s.perMonth >= 0 ? C.greenSoft : C.coral, fontWeight: 600 }}>{s.perMonth >= 0 ? "+" : ""}{s.perMonth}/mo</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACHIEVEMENTS */}
      {achievements?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, margin: "0 2px 10px" }}>
            <Trophy size={15} color={C.amber} /> Achievements
            <span style={{ fontFamily: "DM Sans", fontSize: 11.5, color: C.muted, fontWeight: 400 }}>· {achievements.length} earned</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {achievements.map((a) => (
              <div key={a.id} style={{ background: C.card, border: `1px solid ${C.amber}33`, borderRadius: 16, padding: "14px 13px", boxShadow: C.shadow, display: "flex", gap: 11, alignItems: "flex-start" }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: C.amber + "18", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{a.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{a.title}</div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3, lineHeight: 1.45 }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, margin: "2px 2px 8px" }}>Daily calories</div>
      <div style={{ fontSize: 11.5, color: C.muted, margin: "0 2px 10px" }}>avg {avg} kcal/day</div>

      <div style={{ background: C.card, borderRadius: 18, padding: "18px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {days.length === 0 ? (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>Log a few days to see your trend here.</div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 130 }}>
            {days.map((d) => {
              const h = Math.max(6, (d.calories / maxC) * 110);
              const over = d.calories > targets.calories;
              return (
                <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 9.5, color: C.muted }}>{d.calories}</div>
                  <div style={{ width: "100%", height: h, background: over ? C.coralSoft : C.leaf, borderRadius: 7, transition: "height .5s ease" }} />
                  <div style={{ fontSize: 10, color: C.muted }}>{new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 8, fontSize: 11, color: C.muted, textAlign: "center" }}>
          target {targets.calories} kcal
        </div>
      </div>

      <div style={{ margin: "16px 2px 8px", fontSize: 13, fontWeight: 600, color: C.inkSoft }}>Today's functional balance</div>
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 11 }}>
        {scores.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 92, fontSize: 12, color: C.inkSoft }}>{s.emoji} {s.label}</span>
            <div style={{ flex: 1, height: 7, background: C.bg2, borderRadius: 99 }}>
              <div style={{ width: s.score + "%", height: "100%", background: s.color, borderRadius: 99 }} />
            </div>
            <span style={{ width: 28, textAlign: "right", fontSize: 12, fontWeight: 700, color: s.color }}>{s.score}</span>
          </div>
        ))}
      </div>

      {/* step trend */}
      {stepDays.length > 0 && (
        <>
          <div style={{ margin: "16px 2px 8px", fontSize: 13, fontWeight: 600, color: C.inkSoft, display: "flex", alignItems: "center", gap: 6 }}>
            <Activity size={14} color={C.greenSoft} /> Steps · last 7 days
          </div>
          <div style={{ background: C.card, borderRadius: 18, padding: "18px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
              {history.slice(-7).map((d) => {
                const h = d.steps > 0 ? Math.max(8, (d.steps / Math.max(maxSteps, 1)) * 100) : 0;
                const ok = d.steps >= (targets.steps || 8000);
                return (
                  <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    {d.steps > 0 && <div style={{ fontSize: 9, color: C.muted }}>{d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps}</div>}
                    <div style={{ width: "100%", height: h || 4, background: h > 0 ? (ok ? C.greenSoft : C.amber) : C.line, borderRadius: 7, opacity: h > 0 ? 1 : 0.4 }} />
                    <div style={{ fontSize: 10, color: C.muted }}>{new Date(d.date).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 8, fontSize: 11, color: C.muted, textAlign: "center" }}>
              goal {(targets.steps || 8000).toLocaleString()} steps/day
            </div>
          </div>
        </>
      )}

      {/* sleep trend */}
      {sleepLogs && sleepLogs.length > 0 && (
        <>
          <div style={{ margin: "18px 2px 8px", fontSize: 13, fontWeight: 600, color: C.inkSoft, display: "flex", alignItems: "center", gap: 6 }}>
            <Moon size={14} color="#7A6FB0" /> Sleep · last {Math.min(7, sleepLogs.length)} nights
          </div>
          <div style={{ background: C.card, borderRadius: 18, padding: "16px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            {(() => {
              const sd = sleepLogs.slice(-7);
              const maxH = Math.max(sleepInfo.need + 60, ...sd.map((l) => l.durationMin), 1);
              return (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                  {sd.map((l) => {
                    const h = Math.max(8, (l.durationMin / maxH) * 100);
                    const ok = l.durationMin >= sleepInfo.need - 30;
                    return (
                      <div key={l.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                        <div style={{ fontSize: 9, color: C.muted }}>{(l.durationMin / 60).toFixed(1)}h</div>
                        <div style={{ width: "100%", height: h, background: ok ? "#7A6FB0" : C.coralSoft, borderRadius: 7 }} />
                        <div style={{ fontSize: 9.5, color: C.muted }}>{new Date(l.waketime).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 8, fontSize: 11, color: C.muted, textAlign: "center" }}>
              need {durLabel(sleepInfo.need)} · current debt {durLabel(sleepInfo.debtMin)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TrendsTab;
