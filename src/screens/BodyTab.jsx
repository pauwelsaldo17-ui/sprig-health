import React, { useState } from "react";
import { Check, Camera, Ruler, User, Trophy, Plus, RotateCcw, Crown, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, ComposedChart, Dot } from "recharts";
import { C } from "../theme.js";
import {
  MEASURE_KEYS, PHOTO_KINDS, measurementStats, weightStats, weightVerdict,
  photoReminder, bestE1RMForLift, MUSCLES, recoveryColor, ranking, TIERS,
  MUSCLE_LIFT, MUSCLE_LIFT_FB
} from "../utils/vitaeCalc.js";
import { btn, Legend } from "../components/ui.jsx";

function MeasurementForm({ current, onSave, onClose }) {
  const init = {}; MEASURE_KEYS.forEach(([k]) => (init[k] = current[k]?.current != null ? String(current[k].current) : ""));
  const [v, setV] = useState(init);
  const set = (k, val) => setV((x) => ({ ...x, [k]: val }));
  const dirty = MEASURE_KEYS.some(([k]) => {
    const cur = current[k]?.current; const nv = v[k] === "" ? null : parseFloat(v[k]);
    return nv != null && nv !== cur;
  });
  function submit() {
    const out = {};
    MEASURE_KEYS.forEach(([k]) => { const n = parseFloat(v[k]); if (!isNaN(n)) out[k] = +n.toFixed(1); });
    onSave(out);
  }
  return (
    <div className="sprig-pop" style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 9 }}>All in cm. Tape relaxed, same spot each time (e.g. waist at navel, arm flexed at peak).</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 12px" }}>
        {MEASURE_KEYS.map(([k, lbl]) => (
          <div key={k}>
            <div style={{ fontSize: 11, color: C.inkSoft, marginBottom: 3 }}>{lbl}</div>
            <input value={v[k]} onChange={(e) => set(k, e.target.value)} inputMode="decimal" placeholder="cm"
              style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 10px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg, color: C.ink }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
        <button className="sprig-tap" onClick={onClose} style={{ ...btn(C.bg2, C.inkSoft), flex: 1, padding: "10px 0" }}>Cancel</button>
        <button className="sprig-tap" disabled={!dirty} onClick={submit}
          style={{ ...btn(dirty ? C.green : C.bg2, dirty ? "#fff" : C.muted), flex: 2, padding: "10px 0" }}><Check size={15} /> Save</button>
      </div>
    </div>
  );
}

function Mu({ k, type, cx, cy, rx, ry, d, colorOf, selected, onPick }) {
  const common = { fill: colorOf(k), stroke: selected === k ? C.ink : "rgba(255,255,255,.85)", strokeWidth: selected === k ? 2.4 : 1.3, onClick: () => onPick(k), style: { cursor: "pointer", transition: "fill .45s ease" } };
  return type === "path" ? <path d={d} {...common} /> : <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...common} />;
}

function BodyFigure({ colorOf, selected, onPick }) {
  const sil = C.bg2, skin = "#E7DCC6";
  const figure = (cx, side) => (
    <g key={side}>
      <circle cx={cx} cy={24} r={11} fill={skin} />
      <rect x={cx - 20} y={40} width={40} height={58} rx={13} fill={sil} />
      <rect x={cx - 33} y={46} width={11} height={50} rx={5} fill={sil} />
      <rect x={cx + 22} y={46} width={11} height={50} rx={5} fill={sil} />
      <rect x={cx - 18} y={96} width={36} height={18} rx={8} fill={sil} />
      <rect x={cx - 17} y={112} width={16} height={72} rx={7} fill={sil} />
      <rect x={cx + 1} y={112} width={16} height={72} rx={7} fill={sil} />
      <text x={cx} y={200} fontSize="10" fill={C.muted} textAnchor="middle" fontFamily="DM Sans" fontWeight="600">{side === "f" ? "FRONT" : "BACK"}</text>
    </g>
  );
  const cxF = 92, cxB = 268;
  return (
    <svg viewBox="0 0 360 210" style={{ width: "100%", height: "auto", display: "block" }}>
      {figure(cxF, "f")}
      {figure(cxB, "b")}
      <Mu k="shoulders" cx={cxF - 21} cy={47} rx={9} ry={7} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="shoulders" cx={cxF + 21} cy={47} rx={9} ry={7} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="chest" cx={cxF - 10} cy={59} rx={11} ry={9} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="chest" cx={cxF + 10} cy={59} rx={11} ry={9} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="abs" type="path" d={`M${cxF - 9} 72 h18 a5 5 0 0 1 5 5 v20 a6 6 0 0 1 -6 6 h-16 a6 6 0 0 1 -6 -6 v-20 a5 5 0 0 1 5 -5 z`} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="biceps" cx={cxF - 27} cy={66} rx={6} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="biceps" cx={cxF + 27} cy={66} rx={6} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="forearms" cx={cxF - 28} cy={90} rx={5} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="forearms" cx={cxF + 28} cy={90} rx={5} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="quads" cx={cxF - 8} cy={130} rx={8} ry={22} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="quads" cx={cxF + 8} cy={130} rx={8} ry={22} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="traps" cx={cxB} cy={48} rx={15} ry={8} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="shoulders" cx={cxB - 21} cy={49} rx={8} ry={6} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="shoulders" cx={cxB + 21} cy={49} rx={8} ry={6} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="back" cx={cxB - 9} cy={70} rx={10} ry={15} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="back" cx={cxB + 9} cy={70} rx={10} ry={15} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="triceps" cx={cxB - 27} cy={66} rx={6} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="triceps" cx={cxB + 27} cy={66} rx={6} ry={12} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="lower_back" cx={cxB} cy={90} rx={10} ry={7} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="glutes" cx={cxB - 9} cy={112} rx={10} ry={10} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="glutes" cx={cxB + 9} cy={112} rx={10} ry={10} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="hamstrings" cx={cxB - 8} cy={142} rx={8} ry={20} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="hamstrings" cx={cxB + 8} cy={142} rx={8} ry={20} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="calves" cx={cxB - 8} cy={176} rx={7} ry={14} colorOf={colorOf} selected={selected} onPick={onPick} />
      <Mu k="calves" cx={cxB + 8} cy={176} rx={7} ry={14} colorOf={colorOf} selected={selected} onPick={onPick} />
    </svg>
  );
}

export function RecoveryStrengthSection({ workouts, profile, trainInfo, sleepInfo, advanced }) {
  const [mode, setMode] = useState("recovery");
  const [gradeMode, setGradeMode] = useState("relative");
  const [sel, setSel] = useState(null);
  const rec = trainInfo.recovery;
  const rank = ranking(workouts, profile, gradeMode);
  const NEUTRAL = "rgba(255,255,255,0.18)";
  const colorOf = (k) => {
    if (mode === "recovery") return rec[k].lastTs ? recoveryColor(rec[k].fatigue) : NEUTRAL;
    return rank[k].hasData ? rank[k].tier.color : NEUTRAL;
  };
  const selData = sel ? { name: MUSCLES.find(([k]) => k === sel)[1], rec: rec[sel], rank: rank[sel] } : null;
  return (
    <>
      <div style={{ display: "flex", gap: 6, background: C.bg2, padding: 4, borderRadius: 13, marginTop: 14 }}>
        {[["recovery", "Recovery", <RotateCcw size={15} />], ["grade", "Strength grade", <Crown size={15} />]].map(([m, lbl, ic]) => (
          <button key={m} onClick={() => { setMode(m); setSel(null); }} className="sprig-tap"
            style={{ flex: 1, border: "none", cursor: "pointer", padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", background: mode === m ? C.card : "transparent", color: mode === m ? C.lime : C.muted, boxShadow: mode === m ? C.shadow : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{ic}{lbl}</button>
        ))}
      </div>

      {mode === "grade" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[["relative", "My weight class"], ["absolute", "vs Everyone"]].map(([m, lbl]) => (
            <button key={m} onClick={() => setGradeMode(m)} className="sprig-tap"
              style={{ flex: 1, border: `1px solid ${gradeMode === m ? C.green : C.line}`, cursor: "pointer", padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: gradeMode === m ? C.green : C.card, color: gradeMode === m ? "#fff" : C.inkSoft }}>{lbl}</button>
          ))}
        </div>
      )}

      <div style={{ background: C.card, borderRadius: 20, padding: "16px 10px 10px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
        <BodyFigure colorOf={colorOf} selected={sel} onPick={setSel} />
        {mode === "recovery" ? (
          <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 4 }}>
            <Legend c={recoveryColor(5)} label="Recovered" />
            <Legend c={recoveryColor(55)} label="Recovering" />
            <Legend c={recoveryColor(95)} label="Fatigued" />
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "center", gap: 9, marginTop: 4, flexWrap: "wrap" }}>
            {TIERS.map((tt) => <Legend key={tt.name} c={tt.color} label={tt.name} />)}
          </div>
        )}
      </div>

      {selData && (
        <div className="sprig-pop" style={{ background: C.card, borderRadius: 16, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{selData.name}</div>
          {mode === "recovery" ? (
            selData.rec.lastTs ? (
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.6 }}>
                {selData.rec.recovered
                  ? <span style={{ color: C.greenSoft, fontWeight: 600 }}>Fully recovered — ready to train.</span>
                  : <>~<b style={{ color: recoveryColor(selData.rec.fatigue) }}>{selData.rec.remaining}h</b> until fully recovered{advanced ? ` (${selData.rec.fatigue}% fatigued)` : ""}.</>}
                {selData.rec.sportSource && (
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>
                    {selData.rec.sportStacked ? "Workout + sport: " : "Estimated from sport: "}
                    <b style={{ color: C.amber }}>{(selData.rec.sportNames || [selData.rec.sportName]).filter(Boolean).join(" + ") || "sport activity"}</b>
                  </div>
                )}
                {selData.rec.quickLogged && !selData.rec.sportSource && (
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>Estimated from Quick Log</div>
                )}
                {advanced && !selData.rec.sportSource && !selData.rec.quickLogged && (
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Last hit with {selData.rec.setCount} sets · {Math.round((Date.now() - selData.rec.lastTs) / 36e5)}h ago.</div>
                )}
              </div>
            ) : <div style={{ fontSize: 13, color: C.muted }}>Not trained recently — fully fresh.</div>
          ) : (
            selData.rank.hasData ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: selData.rank.tier.color }}>{selData.rank.tier.name}</span>
                  <span style={{ fontSize: 12.5, color: C.muted }}>top {Math.max(1, Math.round(100 - selData.rank.pct))}% {gradeMode === "relative" ? "at your bodyweight" : "of everyone"}</span>
                </div>
                {advanced && <div style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>Best est. 1RM on {MUSCLE_LIFT[sel] || MUSCLE_LIFT_FB[sel]}: {selData.rank.e1}{profile.unit || "kg"}.</div>}
              </div>
            ) : <div style={{ fontSize: 13, color: C.muted }}>Log a {MUSCLE_LIFT[sel] || MUSCLE_LIFT_FB[sel] || "main"} lift to get a grade here.</div>
          )}
        </div>
      )}

      {!advanced && !selData && (
        <div style={{ fontSize: 11.5, color: C.muted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          Tap any muscle to see {mode === "recovery" ? "how recovered it is" : "its strength grade"}.
        </div>
      )}

      {advanced && (<>
      <div style={{ margin: "16px 2px 8px", fontSize: 13, fontWeight: 600, color: C.inkSoft }}>
        {mode === "recovery" ? "Recovery by muscle" : `Strength grade · ${gradeMode === "relative" ? "your weight class" : "vs everyone"}`}
      </div>
      <div style={{ background: C.card, borderRadius: 16, padding: "6px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {MUSCLES.map(([k, n], i) => (
          <div key={k} onClick={() => setSel(k)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < MUSCLES.length - 1 ? `1px solid ${C.line}` : "none", cursor: "pointer" }}>
            <span style={{ width: 11, height: 11, borderRadius: 4, background: colorOf(k), flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: C.inkSoft }}>{n}</span>
            {mode === "recovery" ? (
              <span style={{ fontSize: 12.5, fontWeight: 600, color: rec[k].lastTs ? (rec[k].recovered ? C.greenSoft : recoveryColor(rec[k].fatigue)) : C.muted }}>
                {!rec[k].lastTs ? "Not trained" : rec[k].recovered ? "Ready" : `${rec[k].remaining}h left`}
              </span>
            ) : (
              rank[k].hasData
                ? <span style={{ fontSize: 12.5, fontWeight: 700, color: rank[k].tier.color }}>{rank[k].estimated ? "~" : ""}{rank[k].tier.name} · top {Math.max(1, Math.round(100 - rank[k].pct))}%</span>
                : <span style={{ fontSize: 11, color: C.muted }}>Not enough data yet</span>
            )}
          </div>
        ))}
      </div>
      </>)}

      {mode === "grade" && (() => {
        const graded = MUSCLES.filter(([k]) => rank[k].hasData).sort((a, b) => rank[a[0]].pct - rank[b[0]].pct);
        if (!graded.length) return null;
        const weak = graded[0];
        return (
          <div style={{ background: C.bg, borderRadius: 14, padding: "12px 14px", marginTop: 12, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
            <b style={{ color: C.coral }}>Weak point:</b> {weak[1]} ({rank[weak[0]].tier.name}). Add a couple of hard sets here each week to bring it up toward your strongest groups.
          </div>
        );
      })()}

      {mode === "recovery" && trainInfo.deload.stalls.length > 0 && (
        <div style={{ background: "rgba(255,107,95,0.12)", borderRadius: 14, padding: "12px 14px", marginTop: 12, fontSize: 12.5, color: C.coralSoft, lineHeight: 1.5, display: "flex", gap: 10 }}>
          <TrendingDown size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><b>Under-recovery signs:</b> {trainInfo.deload.stalls.join(", ")} {trainInfo.deload.stalls.length === 1 ? "has" : "have"} stalled. Combined with poor sleep, that's the cue to back off before you burn out.</div>
        </div>
      )}

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 14, lineHeight: 1.5, padding: "0 8px" }}>
        Grades are estimated from published strength standards (your best est. 1RM vs bodyweight), not a live user database. Recovery blends your training load with your sleep data.
      </div>
    </>
  );
}

function BodyTab({ workouts, profile, trainInfo, sleepInfo, advanced, weightSeries, measureSeries, photoLog, onLogWeight, onSaveMeasurement, onLogPhotoSet, onOpenPhotos, progressPhotosCount }) {
  const [showMeasure, setShowMeasure] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const measureCur = measurementStats(measureSeries);
  const wStats = weightStats(weightSeries);
  const verdict = weightVerdict(wStats, profile.goal);
  const reminder = photoReminder(photoLog);
  const verdictColor = verdict.tag === "good" ? C.greenSoft : verdict.tag === "fast" ? C.coral : verdict.tag === "slow" ? C.amber : C.amber;

  return (
    <div className="sprig-rise">
      {(
        <></>
      )}
      {(
        <>
          <div style={{ background: C.card, borderRadius: 20, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600, marginBottom: 10 }}>
              <User size={15} color={C.amber} /> Weight
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 32, fontWeight: 700, lineHeight: 1, color: C.ink }}>
                  {wStats.current != null ? `${wStats.current}` : "—"}
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}> {profile?.unit || "kg"}</span>
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Latest{wStats.latestDate ? ` · ${wStats.latestDate}` : ""}</div>
              </div>
              {wStats.avg7 != null && (
                <div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: C.inkSoft }}>{wStats.avg7} <span style={{ fontSize: 11, color: C.muted }}>{profile?.unit || "kg"}</span></div>
                  <div style={{ fontSize: 11, color: C.muted }}>7-day avg</div>
                </div>
              )}
              {wStats.rate != null && (
                <div>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: verdictColor }}>{wStats.rate > 0 ? "+" : ""}{wStats.rate} <span style={{ fontSize: 11, color: C.muted }}>{profile?.unit || "kg"}/wk</span></div>
                  <div style={{ fontSize: 11, color: C.muted }}>Trend {wStats.pctRate != null ? `(${wStats.pctRate > 0 ? "+" : ""}${wStats.pctRate}%/wk)` : ""}</div>
                </div>
              )}
            </div>
            {wStats.current == null && (
              <div style={{ background: C.bg, borderRadius: 11, padding: "11px 13px", marginTop: 10, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                No weight logged yet. Weigh in 3–7 mornings (after the bathroom, before food) and a real trend appears here — daily numbers wobble, the average tells the truth.
              </div>
            )}
            {weightSeries.length >= 2 && (() => {
              const unit = profile?.unit || "kg";
              const ws = [...weightSeries].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
              // build 7-day moving average
              const chartData = ws.map((s, i) => {
                const window = ws.slice(Math.max(0, i - 3), i + 4);
                const avg = +(window.reduce((sum, w) => sum + w.kg, 0) / window.length).toFixed(2);
                const label = new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return { date: label, weight: s.kg, avg };
              });
              const allKg = ws.map((s) => s.kg);
              const minKg = Math.min(...allKg), maxKg = Math.max(...allKg);
              const pad = Math.max(0.5, (maxKg - minKg) * 0.25);
              const domain = [+(minKg - pad).toFixed(1), +(maxKg + pad).toFixed(1)];
              const trendUp = ws.length >= 2 && ws[ws.length - 1].kg > ws[0].kg;
              const lineColor = profile?.goal === "gain" ? (trendUp ? C.greenSoft : C.coral) : profile?.goal === "lose" ? (trendUp ? C.coral : C.greenSoft) : C.amber;
              return (
                <div style={{ marginTop: 14, marginLeft: -8 }}>
                  <ResponsiveContainer width="100%" height={140}>
                    <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.muted, fontFamily: "DM Sans" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis domain={domain} tick={{ fontSize: 9, fill: C.muted, fontFamily: "DM Sans" }} tickLine={false} axisLine={false} width={32} tickFormatter={(v) => `${v}`} />
                      <Tooltip contentStyle={{ background: C.cardSolid, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 12, fontFamily: "DM Sans", color: C.ink }}
                        formatter={(v, name) => [`${v} ${unit}`, name === "avg" ? "7-day avg" : "Weight"]}
                        labelStyle={{ color: C.muted, fontSize: 11 }} />
                      {/* moving average area fill */}
                      <Area type="monotone" dataKey="avg" fill={lineColor + "18"} stroke="none" />
                      {/* daily weight line */}
                      <Line type="monotone" dataKey="weight" stroke={lineColor} strokeWidth={2} dot={{ r: 2.5, fill: lineColor, strokeWidth: 0 }} activeDot={{ r: 4, fill: lineColor }} connectNulls />
                      {/* moving average line */}
                      <Line type="monotone" dataKey="avg" stroke={lineColor} strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 4, fontSize: 10, color: C.muted }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 14, height: 2, background: lineColor, display: "inline-block", borderRadius: 1 }} /> Daily</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 14, height: 2, background: lineColor, display: "inline-block", borderRadius: 1, opacity: .6 }} /> 7-day avg</span>
                  </div>
                </div>
              );
            })()}
            <div style={{ fontSize: 12, color: verdictColor, marginTop: 10, lineHeight: 1.5, fontWeight: 500 }}>
              {profile.goal === "gain" ? "🌿 Lean bulk: " : profile.goal === "lose" ? "🔥 Cut: " : "⚖️ Maintain: "}{verdict.text}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 12, color: C.muted }}>Weigh in</span>
              <input value={weightInput} onChange={(e) => setWeightInput(e.target.value)} inputMode="decimal" placeholder={wStats.current != null ? String(wStats.current) : "kg"}
                style={{ width: 70, textAlign: "center", border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 4px", fontFamily: "DM Sans", fontSize: 14, fontWeight: 600, background: C.bg, color: C.ink }} />
              <button className="sprig-tap" disabled={!weightInput} onClick={() => { onLogWeight(parseFloat(weightInput)); setWeightInput(""); }}
                style={{ ...btn(weightInput ? C.green : C.bg2, weightInput ? "#fff" : C.muted), padding: "8px 14px", fontSize: 13 }}><Check size={14} /> Save</button>
              <span style={{ fontSize: 10.5, color: C.muted, marginLeft: "auto" }}>Best: same time, after waking, same clothes</span>
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Ruler size={15} color={C.greenSoft} /> Measurements</span>
              <button className="sprig-tap" onClick={() => setShowMeasure((x) => !x)}
                style={{ background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 9, padding: "5px 11px", fontSize: 11.5, fontWeight: 600, color: C.green, cursor: "pointer", fontFamily: "DM Sans" }}>
                {showMeasure ? "Cancel" : "Log"}
              </button>
            </div>
            {Object.keys(measureCur).length === 0 && !showMeasure && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 9, lineHeight: 1.5 }}>
                Track waist, chest, shoulders, arms, thighs, calves, and neck monthly — measurements reveal recomposition that the scale hides.
              </div>
            )}
            {Object.keys(measureCur).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px", marginTop: 12 }}>
                {MEASURE_KEYS.map(([k, lbl]) => {
                  const m = measureCur[k]; if (!m) return null;
                  const upCol = m.change == null ? C.muted : m.change > 0 ? C.greenSoft : C.coral;
                  return (
                    <div key={k} style={{ background: C.bg, borderRadius: 11, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: C.muted }}>{lbl}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
                        {m.change != null && <span style={{ fontSize: 11, color: upCol, fontWeight: 600, marginLeft: "auto" }}>{m.change > 0 ? "+" : ""}{m.change}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {showMeasure && (
              <MeasurementForm current={measureCur} onSave={(m) => { onSaveMeasurement(m); setShowMeasure(false); }} onClose={() => setShowMeasure(false)} />
            )}
          </div>

          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>
              <Camera size={15} color="#7A6FB0" /> Progress photos
            </div>
            <div style={{ fontSize: 12, color: reminder.due ? C.coral : C.muted, marginTop: 7, lineHeight: 1.5, fontWeight: reminder.due ? 600 : 400 }}>
              {reminder.text}
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
              {PHOTO_KINDS.map(([k, lbl]) => {
                const lastSet = photoLog.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
                const tookToday = lastSet && lastSet.date === new Date().toLocaleDateString("en-CA") && lastSet.kinds.includes(k);
                return (
                  <button key={k} className="sprig-tap" onClick={() => onLogPhotoSet([k])}
                    style={{ flex: 1, border: `1px solid ${tookToday ? C.greenSoft : C.line}`, background: tookToday ? C.green + "14" : C.bg, padding: "11px 0", borderRadius: 11, cursor: "pointer", fontFamily: "DM Sans", color: C.ink }}>
                    {tookToday ? <Check size={16} color={C.green} /> : <Plus size={16} color={C.muted} />}
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{lbl}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
              Same light, same pose, same time of day. Photos stay on your device — tap to mark each angle as taken.
            </div>
            {onOpenPhotos && (
              <button className="sprig-tap" onClick={onOpenPhotos}
                style={{ width: "100%", background: C.bg2, border: "none", cursor: "pointer", borderRadius: 11, padding: "10px 0", fontSize: 12.5, fontWeight: 600, color: C.green, fontFamily: "DM Sans", marginTop: 10 }}>
                <Camera size={13} /> Store &amp; compare photos {progressPhotosCount ? `· ${progressPhotosCount}` : ""}
              </button>
            )}
          </div>

          {wStats.current && workouts.length > 0 && (() => {
            const benchBest = bestE1RMForLift(workouts, "bench");
            if (benchBest <= 0) return null;
            const ratio = +(benchBest / wStats.current).toFixed(2);
            return (
              <div style={{ background: C.card, borderRadius: 14, padding: "12px 14px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <Trophy size={16} color={C.amber} />
                <div style={{ flex: 1, fontSize: 12.5, color: C.inkSoft }}>
                  <b>Bench × bodyweight:</b> {ratio}× — {ratio >= 1.5 ? "advanced" : ratio >= 1.2 ? "intermediate" : ratio >= 0.9 ? "novice" : "beginner"}.
                </div>
              </div>
            );
          })()}
          <div style={{ height: 10 }} />
        </>
      )}
    </div>
  );
}

export default BodyTab;
