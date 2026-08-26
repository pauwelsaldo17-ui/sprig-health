import React, { useState, useEffect } from "react";
import {
  Activity, AlarmClock, BedDouble, Check, Coffee, Dumbbell, EyeOff, Flame,
  Mic, Moon, MoonStar, PencilLine, Sun, Trash2, Volume2, Zap
} from "lucide-react";
import { C } from "../theme.js";
import {
  minToHM, minToLabel, durLabel, recommend, alcoholLevel, energyCurve,
  minToHm, hmToMin, ALCOHOL_LEVELS, smartWake, sleepDebtLabel
} from "../utils/vitaeCalc.js";
import { btn, Btn, Legend, SubTabs, EmptyState } from "../components/ui.jsx";

function StageBar({ stages, advanced }) {
  if (!stages || (stages.deep == null && stages.rem == null && stages.light == null)) return null;
  const deep = stages.deep || 0, rem = stages.rem || 0, light = stages.light || 0;
  const total = deep + rem + light || 1;
  const seg = [["Deep", deep, "#3E5C8A"], ["REM", rem, "#7A6FB0"], ["Light", light, "#A9C3D9"]];
  return (
    <div>
      <div style={{ display: "flex", height: 14, borderRadius: 99, overflow: "hidden", marginBottom: advanced ? 8 : 0 }}>
        {seg.map(([n, v, c]) => <div key={n} style={{ width: (v / total) * 100 + "%", background: c }} title={`${n} ${v}m`} />)}
      </div>
      {advanced && (
        <div style={{ display: "flex", gap: 14 }}>
          {seg.map(([n, v, c]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.inkSoft }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: c }} /> {n} {durLabel(v)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SleepTab({ sleepLogs, sleepInfo, alarm, onSaveAlarm, sub = "sleep", onSub, session, micState, onStart, onEnd, onManual, onRemove, onToggleIgnore, onMarkNap, onEditLog, profile, advanced, daily, onDaily, recoveryRec }) {
  const { debtMin, lastSleep, rec, need } = sleepInfo;
  const [showManual, setShowManual] = useState(false);
  const [bed, setBed] = useState("23:00");
  const [wake, setWake] = useState("07:00");
  const [qual, setQual] = useState(70);
  const [editId, setEditId] = useState(null); // sleep log id being edited
  const [editBed, setEditBed] = useState("23:00");
  const [editWake, setEditWake] = useState("07:00");
  const [dismissShortBanner, setDismissShortBanner] = useState(false);
  const { wakeMin, cycles } = smartWake(Date.now() - 6 * 3600000, hmToMin(alarm.latest), alarm.window);
  const elapsed = session ? Math.round((Date.now() - session.bedTs) / 60000) : 0;

  function submitManual() {
    const today = new Date(); const [bh, bm] = bed.split(":").map(Number); const [wh, wm] = wake.split(":").map(Number);
    const wakeD = new Date(today); wakeD.setHours(wh, wm, 0, 0);
    const bedD = new Date(today); bedD.setHours(bh, bm, 0, 0);
    if (bh >= 12) bedD.setDate(bedD.getDate() - 1); // last night
    onManual({ bedTs: bedD.getTime(), wakeTs: wakeD.getTime(), restlessness: 100 - qual, source: "manual" });
    setShowManual(false);
  }

  // live session view
  if (session) {
    return (
      <div className="sprig-rise" style={{ textAlign: "center", padding: "20px 6px" }}>
        <div style={{ background: C.heroGrad2, borderRadius: 24, padding: "34px 20px", color: "#fff" }}>
          <MoonStar size={40} color="#BFD0FF" />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, marginTop: 14 }}>Sleep mode on</div>
          <div style={{ fontSize: 13, opacity: .8, marginTop: 6 }}>Asleep for {durLabel(elapsed)}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, background: "rgba(255,255,255,.12)", padding: "6px 12px", borderRadius: 99 }}>
              {micState === "on" ? <><Mic size={12} style={{ verticalAlign: -1 }} /> Sensing movement</> : <><MicOff size={12} style={{ verticalAlign: -1 }} /> Cycle model</>}
            </span>
            <span style={{ fontSize: 12, background: "rgba(255,255,255,.12)", padding: "6px 12px", borderRadius: 99 }}>
              <AlarmClock size={12} style={{ verticalAlign: -1 }} /> by {alarm.latest}
            </span>
          </div>
          <div style={{ fontSize: 11.5, opacity: .7, marginTop: 18, lineHeight: 1.5, maxWidth: 280, margin: "18px auto 0" }}>
            Keep the app open with your phone charging on the nightstand. I'll wake you in a light phase inside your window.
          </div>
        </div>
        <button className="sprig-tap" onClick={onEnd} style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "16px 0", marginTop: 16, fontSize: 15.5, fontWeight: 700, boxShadow: `0 6px 18px ${C.lime}33` }}>
          <Sun size={17} /> Wake up — end &amp; score
        </button>
      </div>
    );
  }

  return (
    <div className="sprig-rise">
      <SubTabs tabs={[["sleep", "Sleep"], ["alarm", "Alarm & Routine"]]} active={sub} onChange={onSub} />

      {/* Primary sleep actions — visible in BOTH subtabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
        <button className="sprig-tap" onClick={() => onStart(true)} style={{ ...btn(C.lime, "#0A1F12"), flex: 2, padding: "15px 0", flexDirection: "column", gap: 3, boxShadow: `0 6px 18px ${C.lime}33` }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 15, fontWeight: 700 }}><Moon size={17} /> Start sleep &amp; smart alarm</span>
          <span style={{ fontSize: 11, opacity: .8, fontWeight: 600 }}>wakes you by {alarm.latest}</span>
        </button>
        <button className="sprig-tap" onClick={() => setShowManual((s) => !s)} style={{ ...btn(C.card, C.ink), flex: 1, padding: "15px 0", border: `1px solid ${C.line}`, flexDirection: "column", gap: 4, boxShadow: C.shadow }}>
          <PencilLine size={17} /><span style={{ fontSize: 11.5 }}>Log past night</span>
        </button>
      </div>
      {micState === "denied" && (
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, marginBottom: 4, lineHeight: 1.45 }}>
          Movement sensing needs mic access (often blocked in this preview) — no problem, the smart alarm still uses the sleep-cycle model.
        </div>
      )}
      {showManual && (
        <div className="sprig-pop" style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, margin: "12px 0" }}>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ flex: 1, fontSize: 12, color: C.inkSoft }}>Fell asleep
              <input type="time" value={bed} onChange={(e) => setBed(e.target.value)} style={{ width: "100%", marginTop: 5, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 10px", fontFamily: "DM Sans", fontSize: 14, background: C.bg }} /></label>
            <label style={{ flex: 1, fontSize: 12, color: C.inkSoft }}>Woke up
              <input type="time" value={wake} onChange={(e) => setWake(e.target.value)} style={{ width: "100%", marginTop: 5, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 10px", fontFamily: "DM Sans", fontSize: 14, background: C.bg }} /></label>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.inkSoft }}><span>How rested?</span><span style={{ fontWeight: 700, color: C.green }}>{qual}%</span></div>
            <input type="range" min="10" max="100" value={qual} onChange={(e) => setQual(+e.target.value)} style={{ width: "100%", marginTop: 6, accentColor: C.green }} />
          </div>
          <button className="sprig-tap" onClick={submitManual} style={{ ...btn(C.green, "#fff"), width: "100%", padding: "12px 0", marginTop: 14 }}><Check size={16} /> Save sleep</button>
        </div>
      )}

      {sub === "sleep" && (<>
      {/* sleep debt hero — only shown when there's real logged data */}
      {(sleepLogs?.length ?? 0) === 0 && (
        <div style={{ background: C.card, borderRadius: 20, padding: "22px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12, textAlign: "center" }}>
          <MoonStar size={32} color={C.greenSoft} style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 6 }}>No sleep logged yet</div>
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55, maxWidth: 260, margin: "0 auto" }}>
            Start a sleep session above and Vitae will track your sleep debt, cycles, and best wake time.
          </div>
        </div>
      )}
      {(sleepLogs?.length ?? 0) > 0 && <div style={{ background: C.heroGrad1, borderRadius: 24, padding: "20px 18px", color: "#fff", boxShadow: C.shadow, marginTop: 12 }}>
        {/* eyebrow */}
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: .6, opacity: .65, textTransform: "uppercase", marginBottom: 12 }}>Sleep · 14-night average</div>
        {/* main stat row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{debtMin < 30 ? "~0" : durLabel(debtMin)}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 5, opacity: .9 }}>debt · {sleepDebtLabel(debtMin).label}</div>
            <div style={{ fontSize: 11.5, opacity: .75, marginTop: 4, lineHeight: 1.5 }}>
              {debtMin < 30 ? "Well rested — keep it up 🌿" : debtMin < 90 ? "One early night clears it." : debtMin < 180 ? "A few early nights will help." : "Prioritize sleep this week."}
            </div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(255,255,255,.10)", borderRadius: 14, padding: "10px 14px", flexShrink: 0, marginLeft: 12 }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }}>{durLabel(need)}</div>
            <div style={{ fontSize: 10, opacity: .7, fontWeight: 600, letterSpacing: .3, marginTop: 2 }}>NEED / NIGHT</div>
          </div>
        </div>
        {/* timing chips */}
        <div style={{ display: "flex", gap: 7, marginTop: 14, borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 14 }}>
          {[
            { icon: <BedDouble size={12} />, label: "Bed", value: minToLabel(rec.recBed) },
            { icon: <Sun size={12} />, label: "Wake", value: minToLabel(rec.recWake) },
            { icon: <Coffee size={12} />, label: "Caffeine off", value: minToLabel(rec.caffeineCutoff) },
          ].map((chip) => (
            <div key={chip.label} style={{ flex: 1, background: "rgba(255,255,255,.08)", borderRadius: 12, padding: "9px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 9, opacity: .65, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, fontWeight: 600, letterSpacing: .3, marginBottom: 4, textTransform: "uppercase" }}>{chip.icon} {chip.label}</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700 }}>{chip.value}</div>
            </div>
          ))}
        </div>
      </div>}

      {(sleepLogs?.length ?? 0) > 0 && <>
      {/* Your energy today — modeled from sleep + check-in + meals */}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600, margin: "18px 2px 8px", display: "flex", alignItems: "center", gap: 7 }}><Zap size={16} color={C.lime} /> Your energy today</div>
      <EnergyCurveCard sleepInfo={sleepInfo} />

      {/* recovery recommendation */}
      {recoveryRec && (() => {
        const lvl = recoveryRec.level;
        const stl = lvl === "hard"   ? { bg: "#3E7B5333", bd: C.greenSoft, ic: <Dumbbell size={17} color={C.greenSoft} /> }
                  : lvl === "normal" ? { bg: "#3E7B531a", bd: C.greenSoft, ic: <Dumbbell size={17} color={C.greenSoft} /> }
                  : lvl === "light"  ? { bg: "#D9A23C26", bd: C.amber,     ic: <Activity size={17} color={C.amber} /> }
                  :                    { bg: "#E0714A26", bd: C.coral,     ic: <BedDouble size={17} color={C.coral} /> };
        return (
          <div style={{ background: C.card, borderRadius: 16, padding: 14, marginTop: 12, border: `1px solid ${stl.bd}55`, display: "flex", gap: 12, alignItems: "center", boxShadow: C.shadow }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: stl.bg, display: "grid", placeItems: "center", flexShrink: 0 }}>{stl.ic}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: .3, fontWeight: 600 }}>TRAINING ADVICE</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, textTransform: "capitalize" }}>{lvl === "hard" ? "Train hard" : lvl === "normal" ? "Train normal" : lvl === "light" ? "Train light" : "Rest"}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>{recoveryRec.text}</div>
            </div>
          </div>
        );
      })()}
      </>}
      </>)}

      {sub === "alarm" && (<>
      {/* last night detail */}
      {lastSleep && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: C.muted }}>{minToLabel(tsToMin(lastSleep.bedtime))} → {minToLabel(tsToMin(lastSleep.waketime))}</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700 }}>{durLabel(lastSleep.durationMin)} slept</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <Ring value={lastSleep.score} max={100} size={68} stroke={8} label={lastSleep.score} sub="score"
                color={lastSleep.score >= 80 ? C.greenSoft : lastSleep.score >= 60 ? C.amber : C.coral} />
            </div>
          </div>
          <StageBar stages={lastSleep.stages} advanced={advanced} />
          {sleepInfo.breakdown?.mainReason && (
            <div style={{ background: C.bg, borderRadius: 12, padding: "11px 12px", marginTop: 13, lineHeight: 1.5 }}>
              <div className="sprig-eyebrow">Main issue</div>
              <div style={{ fontSize: 13, color: C.ink, marginTop: 2 }}>{sleepInfo.breakdown.mainReason.charAt(0).toUpperCase() + sleepInfo.breakdown.mainReason.slice(1)}.</div>
              {sleepInfo.breakdown.fix && (
                <>
                  <div className="sprig-eyebrow" style={{ marginTop: 8 }}>Fix tonight</div>
                  <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginTop: 2 }}>{sleepInfo.breakdown.fix}</div>
                </>
              )}
            </div>
          )}
          {!sleepInfo.breakdown?.mainReason && (
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 13, background: C.bg, borderRadius: 12, padding: "10px 12px", lineHeight: 1.5 }}>
              💡 {sleepTip(lastSleep, debtMin, need)}
            </div>
          )}
        </div>
      )}

      {/* alcohol tracker — affects tonight's sleep + tomorrow's recovery */}
      {daily && onDaily && (() => {
        const cur = alcoholLevel(daily.alcohol || 0);
        const impact = ALCOHOL_LEVELS[cur];
        const setLvl = (key) => onDaily({ alcohol: ALCOHOL_LEVELS[key].units });
        return (
          <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>
                <Flame size={15} color={C.coral} /> Alcohol today
              </div>
              <span style={{ fontSize: 11.5, color: C.muted }}>affects tonight's sleep + tomorrow's recovery</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(ALCOHOL_LEVELS).map(([key, lvl]) => {
                const on = cur === key;
                return (
                  <button key={key} className="sprig-tap" onClick={() => setLvl(key)}
                    style={{ flex: 1, border: "none", cursor: "pointer", padding: "9px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans",
                      background: on ? lvl.color : C.bg2, color: on ? "#fff" : C.muted }}>{lvl.label}</button>
                );
              })}
            </div>
            {cur !== "none" && (
              <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 10, lineHeight: 1.5, background: C.bg, borderRadius: 10, padding: "9px 11px" }}>
                {impact.next}
              </div>
            )}
          </div>
        );
      })()}

      {/* smart alarm settings */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}><AlarmClock size={16} color={C.greenSoft} /> Wake-up alarm</div>

        {/* mode selector */}
        <div className="sprig-eyebrow" style={{ marginBottom: 6 }}>Alarm mode</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {[
            ["smart", "Smart alarm window", "Wakes you during light sleep before your latest time"],
            ["fixed", "Fixed wake time", "Always rings at your set time"],
            ["duration", "After sleep duration", "Rings once you've slept a set number of hours"],
          ].map(([k, lbl, sub]) => {
            const on = (alarm.mode || "smart") === k;
            return (
              <button key={k} className="sprig-tap" onClick={() => onSaveAlarm({ ...alarm, mode: k })}
                style={{ background: on ? C.green + "11" : C.bg, border: `1px solid ${on ? C.green : C.line}`, borderRadius: 11, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", fontFamily: "DM Sans" }}>
                <div style={{ width: 16, height: 16, borderRadius: 99, border: `2px solid ${on ? C.green : C.muted}`, display: "grid", placeItems: "center", flexShrink: 0 }}>{on && <div style={{ width: 7, height: 7, borderRadius: 99, background: C.green }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{lbl}</div>
                  <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {(alarm.mode || "smart") !== "duration" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontSize: 13, color: C.inkSoft }}>{(alarm.mode || "smart") === "fixed" ? "Wake time" : "Latest wake time"}</span>
            <input type="time" value={alarm.latest} onChange={(e) => onSaveAlarm({ ...alarm, latest: e.target.value })} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "7px 10px", fontFamily: "DM Sans", fontSize: 14, background: C.bg }} />
          </div>
        )}

        {(alarm.mode || "smart") === "duration" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontSize: 13, color: C.inkSoft }}>Sleep duration</span>
            <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
              {[6, 7, 7.5, 8, 8.5, 9].map((h) => (
                <button key={h} onClick={() => onSaveAlarm({ ...alarm, durationH: h })} className="sprig-tap"
                  style={{ border: "none", cursor: "pointer", padding: "6px 9px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: (alarm.durationH || 8) === h ? C.card : "transparent", color: (alarm.durationH || 8) === h ? C.green : C.muted }}>{h}h</button>
              ))}
            </div>
          </div>
        )}

        {(alarm.mode || "smart") !== "fixed" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ fontSize: 13, color: C.inkSoft }}>{(alarm.mode || "smart") === "duration" ? "Light-wake window" : "Wake window"}</span>
            <div style={{ display: "flex", gap: 5, background: C.bg2, padding: 3, borderRadius: 11 }}>
              {[0, 15, 30, 45].map((w) => (
                <button key={w} onClick={() => onSaveAlarm({ ...alarm, window: w })} className="sprig-tap"
                  style={{ border: "none", cursor: "pointer", padding: "6px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: alarm.window === w ? C.card : "transparent", color: alarm.window === w ? C.green : C.muted }}>{w === 0 ? "Off" : w + "m"}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8, lineHeight: 1.45 }}>
          {(alarm.mode || "smart") === "duration"
            ? `Wake after ${alarm.durationH || 8}h is based on when you started sleep, not a fixed clock time${(alarm.window || 0) > 0 ? ` — within a ${alarm.window}-min light-wake window` : ""}.`
            : (alarm.mode || "smart") === "fixed"
              ? `Rings at ${alarm.latest}, once you've slept at least 3 hours.`
              : `Wakes you at the end of a sleep cycle between ${minToLabel(hmToMin(alarm.latest) - alarm.window)} and ${alarm.latest} so you rise during light sleep.`}
        </div>
        <div style={{ fontSize: 10.5, color: C.amber, marginTop: 8, lineHeight: 1.45 }}>
          Phone alarms require the app to stay open. For a guaranteed alarm, also set your phone's built-in alarm.
        </div>
        <button className="sprig-tap" onClick={() => { try { playAlarmTone(profile?.alarmSound || "bells", profile?.alarmVolume ?? 0.7); } catch (_) {} }}
          style={{ marginTop: 10, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 9, padding: "8px 14px", fontSize: 12, fontWeight: 600, color: C.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Volume2 size={13} /> Test alarm sound
        </button>
      </div>
      </>)}

      {sub === "sleep" && (<>
      {/* history — Recent sleep logs with edit / delete / ignore (Fix 3) */}
      {sleepLogs.length === 0 && (
        <EmptyState icon={<Moon size={20} color={C.greenSoft} />} title="No sleep logged yet"
          text="Add sleep manually or use the sleep session timer to track duration, quality, and debt." />
      )}
      {sleepLogs.length >= 1 && (
        <>
          <div style={{ margin: "18px 2px 8px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>Recent sleep logs</div>

          {/* short-sleep banner: latest log looks accidental and isn't already ignored */}
          {(() => {
            const latest = [...sleepLogs].sort((a, b) => a.waketime - b.waketime)[sleepLogs.length - 1];
            if (!latest || dismissShortBanner) return null;
            if ((latest.durationMin || 0) >= 20 || latest.ignoredFromScore) return null;
            return (
              <div style={{ background: C.isDark ? "#2a200a" : "#fdf6e9", border: `1px solid ${C.amber}66`, borderRadius: 12, padding: "11px 13px", marginBottom: 10, fontSize: 12, color: C.inkSoft, lineHeight: 1.5 }}>
                <b style={{ color: C.amber }}>This sleep looks unusually short</b> ({durLabel(latest.durationMin)}). It's excluded from your score and debt — was it intentional?
                <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
                  <button className="sprig-tap" onClick={() => { onRemove(latest.id); setDismissShortBanner(true); }}
                    style={{ flex: 1, background: C.bg2, color: C.muted, border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 0", fontSize: 11.5, fontWeight: 600 }}>Discard</button>
                  <button className="sprig-tap" onClick={() => { onMarkNap && onMarkNap(latest.id); setDismissShortBanner(true); }}
                    style={{ flex: 1, background: C.amber + "22", color: C.amber, border: `1px solid ${C.amber}44`, cursor: "pointer", borderRadius: 9, padding: "8px 0", fontSize: 11.5, fontWeight: 700 }}>Save as nap</button>
                  <button className="sprig-tap" onClick={() => { setEditId(latest.id); setEditBed(minToHm(tsToMin(latest.bedtime))); setEditWake(minToHm(tsToMin(latest.waketime))); setDismissShortBanner(true); }}
                    style={{ flex: 1, background: C.bg2, color: C.inkSoft, border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 0", fontSize: 11.5, fontWeight: 600 }}>Edit</button>
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...sleepLogs].reverse().slice(0, 8).map((l) => {
              const ignored = !!l.ignoredFromScore;
              const editing = editId === l.id;
              return (
                <div key={l.id} style={{ background: C.card, borderRadius: 13, padding: "10px 13px", boxShadow: C.shadow, border: `1px solid ${ignored ? C.line : C.line}`, opacity: ignored ? 0.6 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, textAlign: "center" }}>
                      <div style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: ignored ? C.muted : (l.score >= 80 ? C.greenSoft : l.score >= 60 ? C.amber : C.coral) }}>{l.score}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{durLabel(l.durationMin)} {l.short && <span style={{ fontSize: 10, color: C.amber, fontWeight: 600 }}>· short</span>}{ignored && <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}> · ignored</span>}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{new Date(l.waketime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
                    </div>
                    {onToggleIgnore && (
                      <button className="sprig-tap" onClick={() => onToggleIgnore(l.id)} title={ignored ? "Count toward score" : "Ignore from score"}
                        style={{ background: "none", border: "none", cursor: "pointer", color: ignored ? C.muted : C.greenSoft, padding: 4 }}>
                        {ignored ? <EyeOff size={15} /> : <Check size={15} />}
                      </button>
                    )}
                    {onEditLog && (
                      <button className="sprig-tap" onClick={() => { setEditId(editing ? null : l.id); setEditBed(minToHm(tsToMin(l.bedtime))); setEditWake(minToHm(tsToMin(l.waketime))); }} title="Edit times"
                        style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
                        <PencilLine size={14} />
                      </button>
                    )}
                    <button className="sprig-tap" onClick={() => onRemove(l.id)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                  {editing && onEditLog && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                      <label style={{ fontSize: 11, color: C.muted }}>Bed</label>
                      <input type="time" value={editBed} onChange={(e) => setEditBed(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 7px", fontSize: 13, fontFamily: "DM Sans" }} />
                      <label style={{ fontSize: 11, color: C.muted }}>Wake</label>
                      <input type="time" value={editWake} onChange={(e) => setEditWake(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 7px", fontSize: 13, fontFamily: "DM Sans" }} />
                      <button className="sprig-tap" onClick={() => {
                        // build new timestamps anchored on the existing log's wake date
                        const baseWake = new Date(l.waketime);
                        const [wh, wm] = editWake.split(":").map(Number);
                        const wakeTs = new Date(baseWake.getFullYear(), baseWake.getMonth(), baseWake.getDate(), wh, wm).getTime();
                        const [bh, bm] = editBed.split(":").map(Number);
                        let bedDate = new Date(wakeTs); bedDate.setHours(bh, bm, 0, 0);
                        // if bed time is "after" wake time on the clock, it was the previous evening
                        if (bedDate.getTime() >= wakeTs) bedDate.setDate(bedDate.getDate() - 1);
                        onEditLog(l.id, bedDate.getTime(), wakeTs);
                        setEditId(null);
                      }} style={{ marginLeft: "auto", background: C.green, color: "#fff", border: "none", cursor: "pointer", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>Save</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      </>)}
      <div style={{ height: 6 }} />
    </div>
  );
}
function sleepTip(log, debtMin, need) {
  if (log.durationMin < need - 60) return "Short night. Aim to be in bed 30–60 min earlier tonight to start clearing the deficit.";
  if (log.restlessness > 55) return "Restless sleep — a cooler, darker room and no screens before bed can deepen it.";
  if (log.stages?.deep != null && log.stages.deep < log.durationMin * 0.13) return "Deep sleep ran low. Avoid late caffeine and alcohol, and keep a steady bedtime.";
  if (debtMin > 240) return "Good night, but you're still in debt — a few consistent early nights will reset your energy.";
  return "Solid, restorative night. Keep your wake time consistent to lock in the rhythm.";
}

/* ---------------- Energy tab (Rise-style timeline) -------------- */
// Energy-today curve graph — extracted so it can render in both the Sleep tab and Energy tab.
// Reads everything from sleepInfo; shows a calm empty state when there isn't enough data yet.
function EnergyCurveCard({ sleepInfo }) {
  const { curve, gym, mealMarks, rec, wakeMin, todayBed } = sleepInfo;
  // tick every 2 min so the "Now" marker advances while the app is open
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 120000); return () => clearInterval(id); }, []);
  if (!curve || !curve.length) {
    return (
      <div style={{ background: C.card, borderRadius: 20, padding: "24px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}`, textAlign: "center" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: C.greenSoft + "22", display: "grid", placeItems: "center", margin: "0 auto 10px" }}><Zap size={19} color={C.greenSoft} /></div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>Energy curve appears after sleep and check-in data.</div>
      </div>
    );
  }
  // ---- Centered window: Now sits in the middle; past energy on the left, predicted on the right.
  const W = 380, H = 150, padL = 8, padR = 8, top = 12, bot = 22;
  const DAY = 1440, HALF = 480;                 // ±8 hours → 16h visible span
  const nowMin = tsToMin(Date.now());           // minutes since midnight (0..1440)
  const lo = nowMin - HALF, hi = nowMin + HALF;  // absolute-minute domain (may be <0 or >1440)
  const x = (m) => padL + ((m - lo) / (hi - lo)) * (W - padL - padR);
  const y = (e) => top + (1 - Math.max(0, Math.min(100, e)) / 100) * (H - top - bot);
  const wrap = (m) => ((m % DAY) + DAY) % DAY;
  // For a wrapped minute-of-day value, return the copy (…-1day, same, +1day) that lands in [lo,hi].
  const inWin = (mod) => {
    for (const off of [-DAY, 0, DAY]) { const v = mod + off; if (v >= lo - 1 && v <= hi + 1) return v; }
    return null;
  };

  const bedM = wrap(rec?.recBed ?? todayBed ?? 1380);
  const wakeM = wrap(rec?.recWake ?? wakeMin ?? 420);
  const SLEEP_E = 8;
  const inSleep = (mod) => (bedM > wakeM ? (mod >= bedM || mod < wakeM) : (mod >= bedM && mod < wakeM));

  // Build the energy curve across the visible window by sampling every 10 min of absolute time.
  // Awake minutes read the modeled curve (nearest sample); sleep minutes sit flat-low.
  const awake = curve.map((p) => ({ min: wrap(p.min), e: p.e })).sort((a, b) => a.min - b.min);
  const sampleAwake = (mod) => {
    if (!awake.length) return 40;
    let best = awake[0], bd = 1e9;
    for (const p of awake) { const d = Math.min(Math.abs(p.min - mod), DAY - Math.abs(p.min - mod)); if (d < bd) { bd = d; best = p; } }
    return best.e;
  };
  const pts = [];
  for (let m = lo; m <= hi; m += 10) { const mod = wrap(m); pts.push({ m, e: inSleep(mod) ? SLEEP_E : sampleAwake(mod) }); }
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.m).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${x(pts[pts.length - 1].m).toFixed(1)},${H - bot} L${x(pts[0].m).toFixed(1)},${H - bot} Z` : "";

  // Sleep band rect(s) visible in the window
  const sleepRects = [];
  for (const off of [-DAY, 0, DAY]) {
    let a = bedM + off, b = (bedM > wakeM ? wakeM + DAY : wakeM) + off;
    const ca = Math.max(a, lo), cb = Math.min(b, hi);
    if (cb > ca) sleepRects.push([ca, cb]);
  }
  const nowX = x(nowMin); // == horizontal center by construction

  // Hourly ticks at clean clock hours inside the window
  const ticks = [];
  const firstHour = Math.ceil(lo / 120) * 120;     // every 2h
  for (let m = firstHour; m <= hi; m += 120) ticks.push(m);
  const tickLabel = (m) => `${String(wrap(Math.round(m / 60) * 60) / 60 % 24).padStart(2, "0")}:00`;

  return (
    <div style={{ background: C.card, borderRadius: 20, padding: "14px 12px 8px", boxShadow: C.shadow, border: `1px solid ${C.line}`, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.leaf} stopOpacity={C.isDark ? "0.45" : "0.30"} />
            <stop offset="100%" stopColor={C.leaf} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* faint "past" shade left of Now */}
        <rect x={padL} y={top} width={Math.max(0, nowX - padL)} height={H - top - bot} fill={C.ink} opacity={C.isDark ? "0.06" : "0.03"} />
        {/* recommended sleep band */}
        {sleepRects.map(([a, b], i) => (
          <rect key={"sl" + i} x={x(a)} y={top} width={Math.max(0, x(b) - x(a))} height={H - top - bot} fill="#6C7BE0" opacity={C.isDark ? "0.16" : "0.12"} />
        ))}
        {/* hour gridlines */}
        {ticks.map((m, i) => <line key={"g" + i} x1={x(m)} y1={top} x2={x(m)} y2={H - bot} stroke={C.line} strokeWidth="1" />)}
        {/* gym window if it falls in view */}
        {gym && (() => { const gs = inWin(wrap(gym.start)), ge = inWin(wrap(gym.end)); return gs != null && ge != null ? <rect x={x(gs)} y={top} width={Math.max(2, x(ge) - x(gs))} height={H - top - bot} fill={C.green} opacity="0.10" rx="4" /> : null; })()}
        {area && <path d={area} fill="url(#eg)" />}
        {line && <path d={line} fill="none" stroke={C.leaf} strokeWidth="2.4" strokeLinejoin="round" />}
        {(mealMarks || []).map((mk, i) => { const mx = inWin(wrap(mk.min)); return mx == null ? null : (
          <g key={i}>
            <line x1={x(mx)} y1={top} x2={x(mx)} y2={H - bot} stroke={C.amber} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
            <circle cx={x(mx)} cy={H - bot} r="3.5" fill={C.amber} />
          </g>
        ); })}
        {/* sleep label if a band is wide enough */}
        {sleepRects.map(([a, b], i) => (x(b) - x(a) > 36 ? <text key={"st" + i} x={(x(a) + x(b)) / 2} y={top + 12} fontSize="9" fill="#8E9BEA" textAnchor="middle" fontFamily="DM Sans" fontWeight="700">Sleep</text> : null))}
        {/* NOW marker — centered */}
        <line x1={nowX} y1={top - 4} x2={nowX} y2={H - bot} stroke={C.coral} strokeWidth="1.8" />
        <circle cx={nowX} cy={top - 4} r="3" fill={C.coral} />
        <text x={nowX} y={top - 7} fontSize="9" fill={C.coral} textAnchor="middle" fontFamily="DM Sans" fontWeight="700">Now</text>
        {/* hour labels */}
        {ticks.map((m, i) => (
          <text key={"t" + i} x={Math.min(W - 12, Math.max(12, x(m)))} y={H - 6} fontSize="9" fill={C.muted} textAnchor="middle" fontFamily="DM Sans">{tickLabel(m)}</text>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 14, padding: "4px 6px 2px", flexWrap: "wrap" }}>
        <Legend c={C.leaf} label="Energy" />
        <Legend c="#8E9BEA" label={`Sleep ${minToLabel(bedM)}–${minToLabel(wakeM)}`} />
        <Legend c={C.amber} label="Meals" />
        {gym && <Legend c={C.green} label="Gym" faded />}
        <Legend c={C.coral} label="Now" />
      </div>
    </div>
  );
}

function EnergyTab({ sleepInfo, entries, t }) {
  const { curve, gym, wakeMin, todayBed, rec, debtMin, mealMarks } = sleepInfo;
  if (!curve.length) return <div style={{ padding: 30, textAlign: "center", color: C.muted }}>Log some sleep to build your energy schedule.</div>;

  const W = 380, H = 150, padL = 6, padR = 6, top = 12, bot = 22;
  const minX = curve[0].min, maxX = curve[curve.length - 1].min;
  const x = (m) => padL + ((m - minX) / (maxX - minX)) * (W - padL - padR);
  const y = (e) => top + (1 - e / 100) * (H - top - bot);
  const line = curve.map((p, i) => `${i ? "L" : "M"}${x(p.min).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ");
  const area = `${line} L${x(maxX).toFixed(1)},${H - bot} L${x(minX).toFixed(1)},${H - bot} Z`;
  const nowMin = tsToMin(Date.now());
  const showNow = nowMin >= minX % DAYMIN && nowMin <= maxX;

  // build the day's plan list
  const peak = curve.reduce((a, p) => (p.e > a.e ? p : a), curve[0]);
  const dip = curve.filter((p) => p.min > wakeMin + 240 && p.min < wakeMin + 540).reduce((a, p) => (p.e < a.e ? p : a), curve[Math.floor(curve.length / 2)] || curve[0]);
  const plan = [
    { min: wakeMin, icon: <Sun size={15} />, c: C.amber, label: "Wake up", sub: "get daylight + protein to kill grogginess" },
    { min: peak.min, icon: <Zap size={15} />, c: C.greenSoft, label: "Peak focus", sub: `energy ${peak.e}/100 — do your hardest work` },
    ...(gym ? [{ min: gym.start, icon: <Dumbbell size={15} />, c: C.green, label: "Best gym window", sub: `${minToLabel(gym.start)}–${minToLabel(gym.end)} · fueled & high energy` }] : []),
    { min: dip.min, icon: <Coffee size={15} />, c: C.coral, label: "Afternoon dip", sub: "light task, walk, or short coffee — not a nap" },
    { min: rec.blueCutoff, icon: <EyeOff size={15} />, c: "#6E83D6", label: "Stop blue light", sub: "dim screens to let melatonin rise" },
    { min: rec.recBed, icon: <Moon size={15} />, c: "#7A6FB0", label: "Bedtime", sub: debtMin > 60 ? "earlier tonight to clear sleep debt" : "consistent bedtime keeps energy steady" },
  ].sort((a, b) => a.min - b.min);

  return (
    <div className="sprig-rise">
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600, margin: "2px 2px 2px" }}>Your energy today</div>
      <div style={{ fontSize: 12, color: C.muted, margin: "0 2px 14px" }}>
        Modeled from your sleep, {durLabel(debtMin)} debt, and {mealMarks.length} logged meal{mealMarks.length === 1 ? "" : "s"}.
      </div>

      {/* energy curve */}
      <EnergyCurveCard sleepInfo={sleepInfo} />

      {/* gym recommendation */}
      {gym && (
        <div style={{ background: "linear-gradient(135deg," + C.green + "," + C.greenSoft + ")", borderRadius: 18, padding: 16, color: "#fff", marginTop: 14, display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", flexShrink: 0 }}><Dumbbell size={21} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, opacity: .85 }}>Best time to train</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }}>{minToLabel(gym.start)} – {minToLabel(gym.end)}</div>
            <div style={{ fontSize: 11.5, opacity: .9, marginTop: 2 }}>
              {mealMarks.some((m) => (gym.start - m.min) / 60 > 1 && (gym.start - m.min) / 60 < 3.5 && m.carbs > 20)
                ? "Well-fueled from your carbs + peak energy." : "Highest energy + late-afternoon performance peak."}
            </div>
          </div>
        </div>
      )}

      {/* day plan timeline */}
      <div style={{ margin: "18px 2px 10px", fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 600 }}>Today's schedule</div>
      <div style={{ position: "relative", paddingLeft: 8 }}>
        <div style={{ position: "absolute", left: 19, top: 8, bottom: 8, width: 2, background: C.line }} />
        {plan.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 14, position: "relative" }}>
            <div style={{ width: 24, height: 24, borderRadius: 99, background: p.c, color: "#fff", display: "grid", placeItems: "center", flexShrink: 0, zIndex: 1, boxShadow: C.shadow }}>{p.icon}</div>
            <div style={{ flex: 1, paddingTop: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</span>
                <span style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>{minToLabel(p.min)}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{p.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* logged meals on timeline */}
      {mealMarks.length > 0 && (
        <>
          <div style={{ margin: "8px 2px 8px", fontSize: 12.5, fontWeight: 600, color: C.muted }}>Meals you logged today</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {[...mealMarks].sort((a, b) => a.min - b.min).map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: C.card, borderRadius: 12, padding: "9px 13px", border: `1px solid ${C.line}` }}>
                <span style={{ fontSize: 12.5, color: C.amber, fontWeight: 700, width: 64 }}>{minToLabel(m.min)}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                <span style={{ fontSize: 11.5, color: C.muted }}>{Math.round(m.carbs)}g carbs</span>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ height: 6 }} />
    </div>
  );
}

export { EnergyTab };
export default SleepTab;
