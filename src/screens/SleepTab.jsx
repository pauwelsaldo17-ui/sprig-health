import React, { useState, useEffect, useRef } from "react";
import {
  AlarmClock, ArrowDown, ArrowUp, Check, ChevronDown,
  Coffee, EyeOff, Mic, MicOff, Moon, MoonStar, Pause, PencilLine,
  Play, Plus, SkipForward, Sun, Trash2,
  Volume2, Zap, Music, Wind
} from "lucide-react";
import { C } from "../theme.js";
import {
  minToLabel, durLabel, circMean, circDiff, minToHm, hmToMin,
  smartWake, sleepDebtLabel, tsToMin, DAYMIN, uid
} from "../utils/vitaeCalc.js";
import { btn, Btn, Legend, SubTabs, EmptyState, Ring } from "../components/ui.jsx";

// ─── Audio ───────────────────────────────────────────────────────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!_audioCtx) _audioCtx = new AC();
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return _audioCtx;
  } catch (_) { return null; }
}

function playChime(volume = 0.4) {
  const ctx = getAudioCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  [[523, 0], [659, 0.18], [784, 0.36]].forEach(([f, t]) => {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.linearRampToValueAtTime(volume, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.5);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + t); o.stop(now + t + 0.6);
    } catch (_) {}
  });
}

function playAlarmTone(kind = "bells", volume = 0.7) {
  if (kind === "vibrate") { try { navigator.vibrate?.([200, 120, 200]); } catch (_) {} return 600; }
  const ctx = getAudioCtx(); if (!ctx) return 0;
  const vol = Math.max(0, Math.min(1, volume ?? 0.7));
  const now = ctx.currentTime;
  const SEQ = {
    bells: [[880, 0, 0.4], [1108, 0.16, 0.5], [1318, 0.32, 0.6]],
    beep: [[1000, 0, 0.12], [1000, 0.2, 0.12], [1000, 0.4, 0.12]],
    chime: [[523, 0, 0.5], [659, 0.22, 0.5], [784, 0.44, 0.7]],
    deep: [[170, 0, 0.7], [130, 0.06, 0.7]],
  }[kind] || [[880, 0, 0.4]];
  const wave = kind === "deep" ? "sawtooth" : kind === "beep" ? "square" : "sine";
  let end = 0;
  SEQ.forEach(([f, t, d]) => {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = wave; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.linearRampToValueAtTime(vol, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + t); o.stop(now + t + d + 0.05);
      end = Math.max(end, t + d);
    } catch (_) {}
  });
  return Math.round(end * 1000) + 100;
}

// ─── Sleep Sound Generator ────────────────────────────────────────────────────
let _noiseSource = null, _noiseGain = null;

function stopNoise() {
  try { _noiseSource?.stop(); } catch (_) {}
  _noiseSource = null; _noiseGain = null;
}

function startNoise(type, volume = 0.5) {
  stopNoise();
  const ctx = getAudioCtx(); if (!ctx) return false;
  try {
    const bufSize = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);

    if (type === "white") {
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === "brown") {
      let last = 0;
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    } else if (type === "rain") {
      for (let i = 0; i < bufSize; i++) {
        const lfo = Math.sin(i / (ctx.sampleRate / 3)) * 0.4 + 0.6;
        data[i] = (Math.random() * 2 - 1) * lfo;
      }
    } else if (type === "ocean") {
      let last = 0;
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.015 * w) / 1.015;
        const wave = Math.sin(i / (ctx.sampleRate / 0.1)) * 0.5 + 0.5;
        data[i] = last * 4 * wave;
      }
    } else {
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    // Low-pass filter for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = type === "white" ? 8000 : type === "brown" ? 400 : type === "ocean" ? 600 : 3000;
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start();
    _noiseSource = src; _noiseGain = gain;
    return true;
  } catch (_) { return false; }
}

function setNoiseVolume(vol) {
  if (_noiseGain) _noiseGain.gain.value = Math.max(0, Math.min(1, vol));
}

// ─── Score Computation ────────────────────────────────────────────────────────
function calcSleepScore(log, allLogs, need) {
  if (!log || !need) return null;

  // Duration pillar
  const durationScore = Math.min(100, Math.round((log.durationMin / need) * 100));

  // Routine pillar — consistency vs last 7 nights
  const prev = allLogs.filter(l => l.id !== log.id && !l.ignoredFromScore && !l.nap).slice(-7);
  const avgBed = circMean(prev.map(l => tsToMin(l.bedtime)));
  const avgWake = circMean(prev.map(l => tsToMin(l.waketime)));
  const devScore = (dev) => dev <= 15 ? 100 : dev <= 30 ? 85 : dev <= 60 ? 60 : 30;
  const bedScore = avgBed != null ? devScore(circDiff(tsToMin(log.bedtime), avgBed)) : 85;
  const wakeScore = avgWake != null ? devScore(circDiff(tsToMin(log.waketime), avgWake)) : 85;
  const routineScore = Math.round((bedScore + wakeScore) / 2);

  // Quality pillar — derived from restlessness
  const r = log.restlessness ?? 30;
  const qualityScore = Math.max(0, Math.min(100, 100 - r));

  const overall = Math.round(0.4 * durationScore + 0.3 * routineScore + 0.3 * qualityScore);
  const grade = overall >= 90 ? "Excellent" : overall >= 80 ? "Good" : overall >= 65 ? "Fair" : "Poor";
  const gradeColor = overall >= 80 ? C.greenSoft : overall >= 65 ? C.amber : C.coral;

  return { durationScore, routineScore, qualityScore, overall, grade, gradeColor };
}

// ─── Local storage helpers ────────────────────────────────────────────────────
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
}

const DEFAULT_ROUTINE = [
  { id: "r1", emoji: "🛏", label: "Wake up & stretch", duration_min: 5 },
  { id: "r2", emoji: "🚿", label: "Shower", duration_min: 10 },
  { id: "r3", emoji: "☕", label: "Breakfast", duration_min: 15 },
  { id: "r4", emoji: "👗", label: "Get ready", duration_min: 15 },
];

// ─── Sleep Score Card ─────────────────────────────────────────────────────────
function SleepScoreCard({ log, allLogs, need }) {
  const score = calcSleepScore(log, allLogs, need);
  if (!log) {
    return (
      <div style={{ background: C.heroGrad1, borderRadius: 24, padding: "22px 18px", color: "#fff", boxShadow: C.shadow }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: .6, opacity: .65, textTransform: "uppercase", marginBottom: 10 }}>Sleep Score · Last night</div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, opacity: .7 }}>No data yet</div>
        <div style={{ fontSize: 12.5, opacity: .65, marginTop: 6 }}>Log a night's sleep to see your score.</div>
      </div>
    );
  }
  const dots = Array.from({ length: 10 }, (_, i) => i < Math.round(score.overall / 10));
  return (
    <div style={{ background: C.heroGrad1, borderRadius: 24, padding: "20px 18px", color: "#fff", boxShadow: C.shadow }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: .6, opacity: .65, textTransform: "uppercase" }}>Sleep Score</div>
        <div style={{ fontSize: 10.5, opacity: .65, fontWeight: 600 }}>Last night</div>
      </div>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 52, fontWeight: 700, lineHeight: 1 }}>{score.overall}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 8 }}>
          {dots.map((filled, i) => (
            <span key={i} style={{ fontSize: 16, opacity: filled ? 1 : 0.3 }}>●</span>
          ))}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, color: score.gradeColor }}>{score.grade}</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 18, borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 14 }}>
        {[
          { icon: "🕐", label: "Duration", val: score.durationScore },
          { icon: "🔄", label: "Routine", val: score.routineScore },
          { icon: "✨", label: "Quality", val: score.qualityScore },
        ].map(p => (
          <div key={p.label} style={{ flex: 1, textAlign: "center", background: "rgba(255,255,255,.08)", borderRadius: 12, padding: "10px 6px" }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{p.icon}</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700 }}>{p.val}</div>
            <div style={{ fontSize: 9.5, opacity: .65, fontWeight: 600, marginTop: 2 }}>{p.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sleep Debt Card ──────────────────────────────────────────────────────────
function SleepDebtCard({ debtMin, need, logs }) {
  const hasDebt = debtMin >= 30;
  const debtH = Math.floor(debtMin / 60), debtM = debtMin % 60;
  const weekNeed = need * 7;
  const weekSlept = (logs || [])
    .filter(l => !l.ignoredFromScore && !l.nap && l.waketime > Date.now() - 7 * 864e5)
    .reduce((s, l) => s + (l.durationMin || 0), 0);
  const pct = weekNeed > 0 ? Math.min(100, Math.round((weekSlept / weekNeed) * 100)) : 0;
  const debtColor = !hasDebt ? C.greenSoft : debtMin < 180 ? C.amber : C.coral;

  let suggestion = null;
  if (hasDebt) {
    const nights = debtMin <= 120 ? 3 : debtMin <= 240 ? 4 : debtMin <= 360 ? 5 : 7;
    const extra = Math.round(debtMin / nights / 5) * 5;
    suggestion = `Sleep ${extra} min extra for the next ${nights} nights`;
  }

  return (
    <div style={{ background: C.card, borderRadius: 20, padding: "16px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 18 }}>😴</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Sleep Debt</span>
        </div>
        <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600 }}>This week</span>
      </div>

      {!hasDebt ? (
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: C.greenSoft }}>
          You're well rested — no sleep debt 🎉
        </div>
      ) : (
        <>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: debtColor }}>
            You're <span style={{ fontSize: 22 }}>{debtH > 0 ? `${debtH}h ` : ""}{debtM}min</span> in debt
          </div>
          <div style={{ margin: "12px 0 8px" }}>
            <div style={{ display: "flex", height: 10, background: C.bg2, borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: pct + "%", background: debtColor, borderRadius: 99, transition: "width .6s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, textAlign: "right" }}>{pct}% of weekly need</div>
          </div>
          {suggestion && (
            <div style={{ fontSize: 13, color: C.inkSoft, background: C.bg2, borderRadius: 10, padding: "9px 12px", lineHeight: 1.45 }}>
              💡 Pay it back: {suggestion}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Energy Schedule Card ─────────────────────────────────────────────────────
function EnergyScheduleCard({ sleepInfo }) {
  const { curve, rec, wakeMin, todayBed } = sleepInfo;
  const [tooltip, setTooltip] = useState(null);
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 60000); return () => clearInterval(id); }, []);

  if (!curve || !curve.length) {
    return (
      <div style={{ background: C.card, borderRadius: 20, padding: "22px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}`, textAlign: "center" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: C.lime + "22", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
          <Zap size={19} color={C.lime} />
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>Energy curve appears after sleep data is logged.</div>
      </div>
    );
  }

  const W = 360, H = 130, padL = 6, padR = 6, top = 14, bot = 22;
  const nowMin = tsToMin(Date.now());
  const visStart = Math.min(curve[0].min, nowMin - 60);
  const visEnd = Math.max(curve[curve.length - 1].min, nowMin + 60);
  const xRange = Math.max(1, visEnd - visStart);
  const x = (m) => padL + ((m - visStart) / xRange) * (W - padL - padR);
  const y = (e) => top + (1 - Math.max(0, Math.min(100, e)) / 100) * (H - top - bot);

  const linePath = curve.map((p, i) => `${i ? "L" : "M"}${x(p.min).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ");
  const areaPath = curve.length
    ? `${linePath} L${x(curve[curve.length - 1].min).toFixed(1)},${H - bot} L${x(curve[0].min).toFixed(1)},${H - bot} Z`
    : "";

  // Find peak, dip, winddown for chips
  const peak = curve.reduce((a, p) => p.e > a.e ? p : a, curve[0]);
  const midCurve = curve.filter(p => p.min > wakeMin + 240 && p.min < wakeMin + 600);
  const dip = midCurve.length ? midCurve.reduce((a, p) => p.e < a.e ? p : a, midCurve[0]) : null;
  const winddown = curve.filter(p => p.min > wakeMin + 540).find(p => p.e < 45);

  const ZONE_LABELS = {
    peak: { label: "Best for focus & workouts", color: C.greenSoft },
    dip: { label: "Best for light tasks & rest", color: C.amber },
    wind: { label: "Best for winding down", color: "#6C7BE0" },
  };

  const nowX = curve.some(p => p.min >= nowMin) ? x(nowMin) : null;

  // Hour ticks every 2h
  const ticks = [];
  const firstTick = Math.ceil(visStart / 120) * 120;
  for (let m = firstTick; m <= visEnd; m += 120) ticks.push(m);

  return (
    <div style={{ background: C.card, borderRadius: 20, overflow: "hidden", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ padding: "14px 14px 0" }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: .5, textTransform: "uppercase", marginBottom: 8 }}>Energy Today</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", display: "block" }}>
        <defs>
          <linearGradient id="eg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.leaf} stopOpacity={C.isDark ? "0.4" : "0.25"} />
            <stop offset="100%" stopColor={C.leaf} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Hour grid lines */}
        {ticks.map((m, i) => <line key={i} x1={x(m)} y1={top} x2={x(m)} y2={H - bot} stroke={C.line} strokeWidth="1" />)}
        {/* Past shading */}
        {nowX && <rect x={padL} y={top} width={Math.max(0, nowX - padL)} height={H - top - bot} fill={C.ink} opacity={C.isDark ? "0.06" : "0.03"} />}
        {/* Area fill + line */}
        {areaPath && <path d={areaPath} fill="url(#eg2)" />}
        {linePath && <path d={linePath} fill="none" stroke={C.leaf} strokeWidth="2.4" strokeLinejoin="round" />}
        {/* NOW marker */}
        {nowX && (
          <>
            <line x1={nowX} y1={top - 4} x2={nowX} y2={H - bot} stroke={C.coral} strokeWidth="1.8" />
            <circle cx={nowX} cy={top - 4} r="3" fill={C.coral} />
            <text x={nowX} y={top - 7} fontSize="9" fill={C.coral} textAnchor="middle" fontFamily="DM Sans" fontWeight="700">Now</text>
          </>
        )}
        {/* Hour labels */}
        {ticks.map((m, i) => {
          const mod = ((m % DAYMIN) + DAYMIN) % DAYMIN;
          const hh = Math.floor(mod / 60) % 12 || 12;
          const ap = Math.floor(mod / 60) < 12 ? "AM" : "PM";
          return (
            <text key={i} x={Math.min(W - 14, Math.max(14, x(m)))} y={H - 6}
              fontSize="9" fill={C.muted} textAnchor="middle" fontFamily="DM Sans">
              {hh}{ap}
            </text>
          );
        })}
      </svg>

      {/* Insight chips */}
      <div style={{ display: "flex", gap: 6, padding: "10px 12px", flexWrap: "wrap" }}>
        {peak && (
          <button className="sprig-tap" onClick={() => setTooltip(t => t === "peak" ? null : "peak")}
            style={{ display: "flex", alignItems: "center", gap: 4, background: C.greenSoft + "18", color: C.greenSoft, border: "none", cursor: "pointer", borderRadius: 99, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, fontFamily: "DM Sans" }}>
            ⚡ Peak {minToLabel(peak.min)}
          </button>
        )}
        {dip && (
          <button className="sprig-tap" onClick={() => setTooltip(t => t === "dip" ? null : "dip")}
            style={{ display: "flex", alignItems: "center", gap: 4, background: C.amber + "1f", color: C.amber, border: "none", cursor: "pointer", borderRadius: 99, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, fontFamily: "DM Sans" }}>
            😴 Dip {minToLabel(dip.min)}
          </button>
        )}
        {winddown && (
          <button className="sprig-tap" onClick={() => setTooltip(t => t === "wind" ? null : "wind")}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "#6C7BE022", color: "#8E9BEA", border: "none", cursor: "pointer", borderRadius: 99, padding: "5px 10px", fontSize: 11.5, fontWeight: 700, fontFamily: "DM Sans" }}>
            🌙 Wind down {minToLabel(winddown.min)}
          </button>
        )}
      </div>
      {tooltip && (
        <div style={{ margin: "0 12px 12px", background: C.bg2, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.45 }}>
          {ZONE_LABELS[tooltip].label}
        </div>
      )}
    </div>
  );
}

// ─── Last Night Summary ───────────────────────────────────────────────────────
function LastNightSummary({ log, allLogs, need, onEdit, onRemove }) {
  const score = calcSleepScore(log, allLogs, need);
  const bedLabel = minToLabel(tsToMin(log.bedtime));
  const wakeLabel = minToLabel(tsToMin(log.waketime));
  return (
    <div style={{ background: C.card, borderRadius: 20, padding: "16px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .4, textTransform: "uppercase", marginBottom: 4 }}>Last night</div>
          <div style={{ fontSize: 13, color: C.inkSoft }}>{bedLabel} → {wakeLabel}</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: C.ink, marginTop: 2 }}>{durLabel(log.durationMin)}</div>
        </div>
        {score && (
          <div style={{ textAlign: "center", background: C.bg2, borderRadius: 14, padding: "10px 14px" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, color: score.gradeColor }}>{score.overall}</div>
            <div style={{ fontSize: 9.5, color: C.muted, fontWeight: 700, letterSpacing: .3, marginTop: 1 }}>SCORE</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
        {[
          { icon: "😴", label: "Fell asleep", val: bedLabel },
          { icon: "☀️", label: "Woke up", val: wakeLabel },
          { icon: "💤", label: "Naps", val: "—" },
        ].map(c => (
          <div key={c.label} style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 16 }}>{c.icon}</div>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 3, marginBottom: 2 }}>{c.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft }}>{c.val}</div>
          </div>
        ))}
      </div>
      {log.is_estimate && (
        <div style={{ marginTop: 10, fontSize: 11.5, color: C.amber, background: C.amber + "1a", borderRadius: 8, padding: "6px 10px" }}>
          ~ Estimated from alarm
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="sprig-tap" onClick={onEdit}
          style={{ flex: 1, background: C.bg2, border: "none", borderRadius: 10, padding: "9px 0", fontSize: 12, fontWeight: 600, color: C.inkSoft, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <PencilLine size={13} /> Edit log
        </button>
        <button className="sprig-tap" onClick={onRemove}
          style={{ background: C.bg2, border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12, color: C.muted, cursor: "pointer" }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Smart Estimate Card ──────────────────────────────────────────────────────
function SmartEstimateCard({ alarm, sleepLogs, onConfirm }) {
  const avgBedMin = sleepLogs.length
    ? (circMean(sleepLogs.slice(-7).map(l => tsToMin(l.bedtime))) ?? hmToMin("23:00"))
    : hmToMin("23:00");
  const wakeMin = hmToMin(alarm?.latest || "07:00");
  let durMin = ((wakeMin - avgBedMin) + DAYMIN) % DAYMIN;
  if (durMin > 12 * 60) durMin = 8 * 60; // fallback if nonsensical

  const bedLabel = minToLabel(avgBedMin);
  const wakeLabel = minToLabel(wakeMin);

  function confirmEstimate() {
    const now = new Date();
    const [wh, wm] = (alarm?.latest || "07:00").split(":").map(Number);
    const wakeDate = new Date(now); wakeDate.setHours(wh, wm, 0, 0);
    if (wakeDate > now) wakeDate.setDate(wakeDate.getDate() - 1);
    const bedDate = new Date(wakeDate);
    const bedH = Math.floor(avgBedMin / 60), bedM = avgBedMin % 60;
    bedDate.setHours(bedH, bedM, 0, 0);
    if (bedDate >= wakeDate) bedDate.setDate(bedDate.getDate() - 1);
    onConfirm({ bedTs: bedDate.getTime(), wakeTs: wakeDate.getTime(), restlessness: 30, source: "estimate" });
  }

  return (
    <div style={{ background: C.card, borderRadius: 20, padding: "16px 18px", boxShadow: C.shadow, border: `1px solid ${C.amber}55` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>🌅</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Sleep estimate from alarm</span>
      </div>
      <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55 }}>
        Alarm set for <b>{wakeLabel}</b> — assuming <b>{bedLabel}</b> bedtime based on your average.
      </div>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: C.greenSoft, margin: "10px 0" }}>
        ~{durLabel(durMin)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="sprig-tap" onClick={confirmEstimate}
          style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Check size={14} /> Confirm estimate
        </button>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.4 }}>
        Estimates show with a ~ prefix and can be edited anytime.
      </div>
    </div>
  );
}

// ─── 7-Day History Bar Chart ──────────────────────────────────────────────────
function SleepHistoryChart({ sleepLogs, need }) {
  const [selected, setSelected] = useState(null);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("en-CA");
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const log = [...sleepLogs].reverse().find(l => l.date === dateStr && !l.nap);
    days.push({ date: dateStr, day: dayName, log, dur: log?.durationMin || 0 });
  }

  const maxDur = Math.max(need * 1.1, ...days.map(d => d.dur), 1);
  const barColor = (dur) => dur >= need ? C.greenSoft : dur >= need - 60 ? C.amber : C.coral;

  return (
    <div style={{ background: C.card, borderRadius: 20, padding: "16px 16px 12px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .4, textTransform: "uppercase", marginBottom: 12 }}>7-day history</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, position: "relative" }}>
        {/* Sleep need reference line */}
        <div style={{ position: "absolute", bottom: (need / maxDur) * 80, left: 0, right: 0, borderTop: `1.5px dashed ${C.inkSoft}`, opacity: 0.3, pointerEvents: "none" }} />
        {days.map((d, i) => {
          const h = d.dur > 0 ? Math.max(4, (d.dur / maxDur) * 80) : 4;
          const isSelected = selected === i;
          return (
            <button key={d.date} className="sprig-tap" onClick={() => setSelected(isSelected ? null : i)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <div style={{
                width: "100%", height: h, borderRadius: "5px 5px 2px 2px",
                background: d.dur > 0 ? barColor(d.dur) : C.bg2,
                opacity: isSelected ? 1 : 0.85,
                boxShadow: isSelected ? `0 0 0 2px ${C.card}, 0 0 0 3px ${barColor(d.dur)}` : "none",
                transition: "height .3s ease",
                alignSelf: "flex-end",
              }} />
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        {days.map((d, i) => (
          <div key={d.date} style={{ flex: 1, textAlign: "center", fontSize: 10, color: selected === i ? C.ink : C.muted, fontWeight: selected === i ? 700 : 400 }}>{d.day}</div>
        ))}
      </div>
      {selected != null && days[selected] && (
        <div className="sprig-pop" style={{ marginTop: 10, background: C.bg2, borderRadius: 10, padding: "9px 12px" }}>
          {days[selected].log ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{durLabel(days[selected].dur)}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{days[selected].day} · {new Date(days[selected].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
              {days[selected].log.score != null && (
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: days[selected].log.score >= 80 ? C.greenSoft : days[selected].log.score >= 65 ? C.amber : C.coral }}>
                  {days[selected].log.score}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: C.muted }}>No sleep logged this day.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sleep Log Form ───────────────────────────────────────────────────────────
const QUALITY_OPTIONS = [
  { val: 1, emoji: "😴", label: "Poor", restlessness: 80 },
  { val: 2, emoji: "😐", label: "OK", restlessness: 55 },
  { val: 3, emoji: "😊", label: "Good", restlessness: 30 },
  { val: 4, emoji: "🤩", label: "Great", restlessness: 10 },
];
const WAKEUP_OPTIONS = [0, 1, 2, "3+"];

function SleepLogForm({ onSave, alarm, defaultBed, defaultWake }) {
  const [bed, setBed] = useState(defaultBed || "23:00");
  const [wake, setWake] = useState(defaultWake || alarm?.latest || "07:00");
  const [quality, setQuality] = useState(3);
  const [wakeUps, setWakeUps] = useState(0);
  const [notes, setNotes] = useState("");
  const [nightOffset, setNightOffset] = useState(0);

  function getDurMin() {
    const [bh, bm] = bed.split(":").map(Number), [wh, wm] = wake.split(":").map(Number);
    let d = (wh * 60 + wm) - (bh * 60 + bm);
    if (d <= 0) d += 1440;
    return d;
  }

  function submit() {
    const [wh, wm] = wake.split(":").map(Number);
    const wakeD = new Date(); wakeD.setDate(wakeD.getDate() + nightOffset); wakeD.setHours(wh, wm, 0, 0);
    const [bh, bm] = bed.split(":").map(Number);
    const bedD = new Date(wakeD);
    if (bh > wh || (bh === wh && bm > wm)) bedD.setDate(bedD.getDate() - 1);
    bedD.setHours(bh, bm, 0, 0);

    const qOpt = QUALITY_OPTIONS.find(q => q.val === quality) || QUALITY_OPTIONS[2];
    const wuExtra = typeof wakeUps === "number" ? wakeUps * 10 : 30;
    const badNotes = /restless|bad|nightmare|awful|terrible/i.test(notes);
    const restlessness = Math.min(100, qOpt.restlessness + wuExtra + (badNotes ? 10 : 0));

    onSave({ bedTs: bedD.getTime(), wakeTs: wakeD.getTime(), restlessness, source: "manual" });
    setBed("23:00"); setWake(alarm?.latest || "07:00"); setQuality(3); setWakeUps(0); setNotes(""); setNightOffset(0);
  }

  const durMin = getDurMin();
  const durH = (durMin / 60).toFixed(1);
  const nights = ["Last night", "2 nights ago", "3 nights ago"];

  return (
    <div style={{ background: C.card, borderRadius: 20, padding: "16px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .4, textTransform: "uppercase", marginBottom: 12 }}>Log sleep</div>

      {/* Night selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {nights.map((label, i) => (
          <button key={i} className="sprig-tap" onClick={() => setNightOffset(-i)}
            style={{ flex: 1, border: "none", cursor: "pointer", padding: "7px 4px", borderRadius: 9, fontSize: 11, fontWeight: 600, fontFamily: "DM Sans", background: nightOffset === -i ? C.green : C.bg2, color: nightOffset === -i ? "#fff" : C.muted }}>
            {label}
          </button>
        ))}
      </div>

      {/* Time pickers */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 14 }}>
        <label style={{ flex: 1, fontSize: 12, color: C.inkSoft }}>
          Fell asleep
          <input type="time" value={bed} onChange={e => setBed(e.target.value)}
            style={{ width: "100%", marginTop: 5, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 10px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink }} />
        </label>
        <label style={{ flex: 1, fontSize: 12, color: C.inkSoft }}>
          Woke up
          <input type="time" value={wake} onChange={e => setWake(e.target.value)}
            style={{ width: "100%", marginTop: 5, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 10px", fontFamily: "DM Sans", fontSize: 14, background: C.bg, color: C.ink }} />
        </label>
        <div style={{ textAlign: "center", paddingBottom: 2 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, color: durMin >= 420 ? C.greenSoft : durMin >= 300 ? C.amber : C.coral }}>{durH}h</div>
          <div style={{ fontSize: 10, color: C.muted }}>duration</div>
        </div>
      </div>

      {/* Quality */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, marginBottom: 7 }}>Quality</div>
        <div style={{ display: "flex", gap: 6 }}>
          {QUALITY_OPTIONS.map(q => (
            <button key={q.val} className="sprig-tap" onClick={() => setQuality(q.val)}
              style={{ flex: 1, border: `1px solid ${quality === q.val ? C.green : C.line}`, background: quality === q.val ? C.green + "1a" : C.bg2, color: quality === q.val ? C.greenSoft : C.muted, cursor: "pointer", borderRadius: 10, padding: "8px 0", fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 18 }}>{q.emoji}</span>
              <span style={{ fontSize: 10 }}>{q.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wake-ups */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, marginBottom: 7 }}>Wake-ups during the night</div>
        <div style={{ display: "flex", gap: 6 }}>
          {WAKEUP_OPTIONS.map(w => (
            <button key={w} className="sprig-tap" onClick={() => setWakeUps(w)}
              style={{ flex: 1, border: `1px solid ${wakeUps === w ? C.amber : C.line}`, background: wakeUps === w ? C.amber + "1a" : C.bg2, color: wakeUps === w ? C.amber : C.muted, cursor: "pointer", borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, fontFamily: "DM Sans" }}>
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional) — e.g. 'felt restless', 'slept great'"
        style={{ width: "100%", border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 10px", fontFamily: "DM Sans", fontSize: 13, background: C.bg, color: C.ink, resize: "none", height: 60, boxSizing: "border-box" }} />

      <button className="sprig-tap" onClick={submit}
        style={{ ...btn(C.green, "#fff"), width: "100%", padding: "13px 0", marginTop: 12, fontSize: 14, fontWeight: 700, boxShadow: `0 6px 18px ${C.green}33` }}>
        <Check size={16} /> Save {durH}h sleep
      </button>
    </div>
  );
}

// ─── Routine Timer ────────────────────────────────────────────────────────────
function RoutineTimer({ steps, onClose }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [secs, setSecs] = useState((steps[0]?.duration_min || 5) * 60);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const stepIdxRef = useRef(0);

  useEffect(() => { stepIdxRef.current = stepIdx; }, [stepIdx]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          const nextIdx = stepIdxRef.current + 1;
          if (nextIdx < steps.length) {
            playChime(0.5);
            setStepIdx(nextIdx);
            return (steps[nextIdx].duration_min || 5) * 60;
          } else {
            playChime(0.7);
            setRunning(false);
            setDone(true);
            return 0;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, steps]);

  const cur = steps[stepIdx] || steps[0];
  const total = (cur?.duration_min || 5) * 60;
  const prog = total > 0 ? (total - secs) / total : 0;
  const r = 52, circ = 2 * Math.PI * r;

  function skip() {
    const next = stepIdx + 1;
    if (next < steps.length) {
      setStepIdx(next);
      setSecs((steps[next]?.duration_min || 5) * 60);
    } else {
      setDone(true); setRunning(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: C.isDark ? "#07140FEE" : "#F4F6F2EE", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {/* Progress dots */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: 99, background: i < stepIdx ? C.green : i === stepIdx ? C.greenSoft : C.bg2, transition: "background .3s" }} />
        ))}
      </div>

      {!done ? (
        <>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{cur?.emoji}</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 700, color: C.ink, textAlign: "center", marginBottom: 6 }}>{cur?.label}</div>
          <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 32 }}>Step {stepIdx + 1} of {steps.length}</div>

          {/* Countdown ring */}
          <div style={{ position: "relative", width: 120, height: 120, marginBottom: 32 }}>
            <svg width={120} height={120} style={{ transform: "rotate(-90deg)" }}>
              <circle cx={60} cy={60} r={r} fill="none" stroke={C.bg2} strokeWidth={10} />
              <circle cx={60} cy={60} r={r} fill="none" stroke={C.greenSoft} strokeWidth={10}
                strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * prog}
                style={{ transition: "stroke-dashoffset 1s linear" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700, color: C.ink }}>
                {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button className="sprig-tap" onClick={() => setRunning(r => !r)}
              style={{ width: 56, height: 56, borderRadius: 99, background: C.bg2, border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
              {running ? <Pause size={22} color={C.ink} /> : <Play size={22} color={C.ink} />}
            </button>
            <button className="sprig-tap" onClick={skip}
              style={{ width: 56, height: 56, borderRadius: 99, background: C.green, border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <SkipForward size={22} color="#fff" />
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 700, color: C.ink, textAlign: "center", marginBottom: 8 }}>Routine complete!</div>
          <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 32 }}>
            Great start to the day.
          </div>
        </>
      )}

      <button className="sprig-tap" onClick={onClose}
        style={{ marginTop: 16, background: "none", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 24px", fontSize: 13.5, fontWeight: 600, color: C.inkSoft, cursor: "pointer" }}>
        {done ? "Close" : "Exit routine"}
      </button>
    </div>
  );
}

// ─── Morning Routine Card ─────────────────────────────────────────────────────
const EMOJI_OPTIONS = ["🛏","🚿","☕","👗","🏃","🧘","📚","🥗","💊","🧴","🪥","🐕","🚗","🎯","🌅","💪"];

function MorningRoutineCard({ routine, onSaveRoutine, alarm }) {
  const [timerOpen, setTimerOpen] = useState(false);
  const [editing, setEditing] = useState(null); // id or "new"
  const [editEmoji, setEditEmoji] = useState("🚿");
  const [editLabel, setEditLabel] = useState("");
  const [editDur, setEditDur] = useState(10);
  const [showEmojis, setShowEmojis] = useState(false);

  const total = routine.reduce((s, r) => s + (r.duration_min || 0), 0);
  const wakeMin = hmToMin(alarm?.latest || "07:00");
  const outBy = minToLabel((wakeMin + total) % DAYMIN);

  function startEdit(step) {
    setEditing(step.id);
    setEditEmoji(step.emoji); setEditLabel(step.label); setEditDur(step.duration_min);
    setShowEmojis(false);
  }

  function saveEdit() {
    if (editing === "new") {
      onSaveRoutine([...routine, { id: uid(), emoji: editEmoji, label: editLabel || "Step", duration_min: Math.max(1, editDur) }]);
    } else {
      onSaveRoutine(routine.map(s => s.id === editing ? { ...s, emoji: editEmoji, label: editLabel, duration_min: Math.max(1, editDur) } : s));
    }
    setEditing(null); setShowEmojis(false);
  }

  function removeStep(id) { onSaveRoutine(routine.filter(s => s.id !== id)); }
  function moveUp(idx) { if (idx === 0) return; const a = [...routine]; [a[idx-1],a[idx]] = [a[idx],a[idx-1]]; onSaveRoutine(a); }
  function moveDown(idx) { if (idx === routine.length-1) return; const a = [...routine]; [a[idx],a[idx+1]] = [a[idx+1],a[idx]]; onSaveRoutine(a); }

  return (
    <>
      {timerOpen && <RoutineTimer steps={routine} onClose={() => setTimerOpen(false)} />}
      <div style={{ background: C.card, borderRadius: 20, padding: "16px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>My Morning Routine</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            ⏱ {total} min · Out by {outBy}
          </div>
        </div>

        {routine.map((step, idx) => (
          <div key={step.id}>
            {editing === step.id ? (
              <div className="sprig-pop" style={{ background: C.bg2, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button className="sprig-tap" onClick={() => setShowEmojis(s => !s)}
                    style={{ fontSize: 22, background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>
                    {editEmoji}
                  </button>
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Step name"
                    style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, fontFamily: "DM Sans", background: C.bg, color: C.ink }} />
                  <input type="number" value={editDur} onChange={e => setEditDur(+e.target.value)} min="1" max="120"
                    style={{ width: 60, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: "DM Sans", background: C.bg, color: C.ink, textAlign: "center" }} />
                  <span style={{ fontSize: 11, color: C.muted, alignSelf: "center" }}>min</span>
                </div>
                {showEmojis && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                    {EMOJI_OPTIONS.map(e => (
                      <button key={e} className="sprig-tap" onClick={() => { setEditEmoji(e); setShowEmojis(false); }}
                        style={{ fontSize: 20, background: editEmoji === e ? C.green + "22" : "none", border: "none", cursor: "pointer", borderRadius: 6, padding: 4 }}>{e}</button>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="sprig-tap" onClick={saveEdit}
                    style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Save</button>
                  <button className="sprig-tap" onClick={() => setEditing(null)}
                    style={{ background: C.bg2, color: C.muted, border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button className="sprig-tap" onClick={() => moveUp(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: C.muted }}>
                    <ArrowUp size={11} />
                  </button>
                  <button className="sprig-tap" onClick={() => moveDown(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: C.muted }}>
                    <ArrowDown size={11} />
                  </button>
                </div>
                <span style={{ fontSize: 20 }}>{step.emoji}</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: C.ink }}>{step.label}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{step.duration_min} min</span>
                <button className="sprig-tap" onClick={() => startEdit(step)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
                  <PencilLine size={13} />
                </button>
                <button className="sprig-tap" onClick={() => removeStep(step.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}

        {editing === "new" ? (
          <div className="sprig-pop" style={{ background: C.bg2, borderRadius: 12, padding: 12, marginTop: 8 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button className="sprig-tap" onClick={() => setShowEmojis(s => !s)}
                style={{ fontSize: 22, background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>
                {editEmoji}
              </button>
              <input value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Step name"
                style={{ flex: 1, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, fontFamily: "DM Sans", background: C.bg, color: C.ink }} />
              <input type="number" value={editDur} onChange={e => setEditDur(+e.target.value)} min="1"
                style={{ width: 60, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: "DM Sans", background: C.bg, color: C.ink, textAlign: "center" }} />
              <span style={{ fontSize: 11, color: C.muted, alignSelf: "center" }}>min</span>
            </div>
            {showEmojis && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} className="sprig-tap" onClick={() => { setEditEmoji(e); setShowEmojis(false); }}
                    style={{ fontSize: 20, background: editEmoji === e ? C.green + "22" : "none", border: "none", cursor: "pointer", borderRadius: 6, padding: 4 }}>{e}</button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <button className="sprig-tap" onClick={saveEdit}
                style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Add step</button>
              <button className="sprig-tap" onClick={() => setEditing(null)}
                style={{ background: C.bg2, color: C.muted, border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="sprig-tap" onClick={() => { setEditing("new"); setEditEmoji("🚿"); setEditLabel(""); setEditDur(10); setShowEmojis(false); }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${C.line}`, color: C.muted, cursor: "pointer", padding: "10px 0", width: "100%", marginTop: 4, borderRadius: 10, justifyContent: "center", fontSize: 13, fontFamily: "DM Sans" }}>
            <Plus size={14} /> Add step
          </button>
        )}

        {routine.length > 0 && (
          <button className="sprig-tap" onClick={() => setTimerOpen(true)}
            style={{ ...btn(C.green, "#fff"), width: "100%", padding: "13px 0", marginTop: 14, fontSize: 14, fontWeight: 700, boxShadow: `0 6px 18px ${C.green}33` }}>
            <Play size={16} /> Start routine
          </button>
        )}
      </div>
    </>
  );
}

// ─── Wind-Down Card ───────────────────────────────────────────────────────────
function WindDownCard({ alarm, need, winddownEnabled, onToggle }) {
  const wakeMin = hmToMin(alarm?.latest || "07:00");
  const bedMin = ((wakeMin - need - 15) + DAYMIN) % DAYMIN;
  const windMin = (bedMin - 30 + DAYMIN) % DAYMIN;
  return (
    <div style={{ background: C.card, borderRadius: 20, padding: "16px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#3B3F7022", display: "grid", placeItems: "center" }}>
            <Moon size={18} color="#8E9BEA" />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>Wind-down reminder</div>
            <div style={{ fontSize: 12, color: C.muted }}>Tonight at {minToLabel(windMin)}</div>
          </div>
        </div>
        <button className="sprig-tap" onClick={onToggle}
          style={{ width: 44, height: 26, borderRadius: 99, background: winddownEnabled ? C.green : C.bg2, border: "none", cursor: "pointer", position: "relative", transition: "background .2s" }}>
          <div style={{ position: "absolute", top: 3, left: winddownEnabled ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
        </button>
      </div>
      <div style={{ marginTop: 12, background: C.bg2, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
        "30 min before your smart bedtime" — Go to bed by <b>{minToLabel(bedMin)}</b> to get your {(need / 60).toFixed(1)}h sleep need
      </div>
    </div>
  );
}

// ─── Alarm Card ───────────────────────────────────────────────────────────────
const SOUND_OPTIONS = [
  { id: "bells", icon: "🌅", label: "Sunrise" },
  { id: "chime", icon: "🎵", label: "Chime" },
  { id: "beep", icon: "📳", label: "Beep" },
  { id: "deep", icon: "🌊", label: "Deep" },
  { id: "vibrate", icon: "📳", label: "Vibrate" },
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKENDS = [0, 6];

function AlarmCard({ alarm, onSaveAlarm, profile }) {
  const [showSound, setShowSound] = useState(false);
  const [vol, setVol] = useState(profile?.alarmVolume ?? 0.7);
  const { wakeMin, cycles } = smartWake(Date.now() - 6 * 3600000, hmToMin(alarm.latest), alarm.window || 30);
  const windowStart = alarm.window > 0 ? minToLabel(hmToMin(alarm.latest) - alarm.window) : null;

  return (
    <div style={{ background: C.card, borderRadius: 20, overflow: "hidden", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      {/* Header */}
      <div style={{ background: C.heroGrad2, padding: "20px 18px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
            <AlarmClock size={17} /> Smart Alarm
          </div>
          <button className="sprig-tap" onClick={() => onSaveAlarm({ ...alarm, enabled: !alarm.enabled })}
            style={{ width: 44, height: 26, borderRadius: 99, background: alarm.enabled ? C.lime : "rgba(255,255,255,.2)", border: "none", cursor: "pointer", position: "relative", transition: "background .2s" }}>
            <div style={{ position: "absolute", top: 3, left: alarm.enabled ? 21 : 3, width: 20, height: 20, borderRadius: 99, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.3)" }} />
          </button>
        </div>
        <div style={{ textAlign: "center" }}>
          <input type="time" value={alarm.latest} onChange={e => onSaveAlarm({ ...alarm, latest: e.target.value })}
            style={{ fontFamily: "Fraunces, serif", fontSize: 44, fontWeight: 700, color: "#fff", background: "transparent", border: "none", textAlign: "center", width: "100%", cursor: "pointer" }} />
          {windowStart && (
            <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>
              Smart window: {windowStart} – {alarm.latest}
            </div>
          )}
          <div style={{ fontSize: 11.5, opacity: .65, marginTop: 4 }}>Wakes you at your lightest sleep</div>
        </div>
      </div>

      {/* Wake window */}
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: C.inkSoft }}>Wake window</span>
          <div style={{ display: "flex", gap: 4, background: C.bg2, padding: 3, borderRadius: 10 }}>
            {[0, 15, 30, 45].map(w => (
              <button key={w} className="sprig-tap" onClick={() => onSaveAlarm({ ...alarm, window: w })}
                style={{ border: "none", cursor: "pointer", padding: "5px 9px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, fontFamily: "DM Sans", background: alarm.window === w ? C.card : "transparent", color: alarm.window === w ? C.green : C.muted }}>
                {w === 0 ? "Off" : `${w}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Days */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          {DAY_LABELS.map((d, i) => {
            const on = (alarm.days || WEEKDAYS).includes(i);
            return (
              <button key={i} className="sprig-tap" onClick={() => {
                const cur = alarm.days || WEEKDAYS;
                onSaveAlarm({ ...alarm, days: on ? cur.filter(x => x !== i) : [...cur, i].sort() });
              }} style={{ width: 34, height: 34, borderRadius: 99, border: `1px solid ${on ? C.green : C.line}`, background: on ? C.green : C.bg2, color: on ? "#fff" : C.muted, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "DM Sans" }}>
                {d}
              </button>
            );
          })}
        </div>

        {/* Sound picker toggle */}
        <button className="sprig-tap" onClick={() => setShowSound(s => !s)}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: C.bg2, border: "none", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.inkSoft, fontWeight: 600 }}>
            <Volume2 size={14} /> Sound: {SOUND_OPTIONS.find(s => s.id === (profile?.alarmSound || "bells"))?.label}
          </div>
          <ChevronDown size={14} color={C.muted} style={{ transform: showSound ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>

        {showSound && (
          <div className="sprig-pop" style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {SOUND_OPTIONS.map(s => (
                <button key={s.id} className="sprig-tap"
                  onClick={() => { playAlarmTone(s.id, vol); }}
                  style={{ flex: 1, minWidth: 60, background: (profile?.alarmSound || "bells") === s.id ? C.green + "1a" : C.bg2, border: `1px solid ${(profile?.alarmSound || "bells") === s.id ? C.green : C.line}`, borderRadius: 10, padding: "8px 4px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <span style={{ fontSize: 10.5, color: C.inkSoft, fontWeight: 600 }}>{s.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Volume2 size={13} color={C.muted} />
              <input type="range" min="0" max="1" step="0.05" value={vol}
                onChange={e => { setVol(+e.target.value); setNoiseVolume(+e.target.value); }}
                style={{ flex: 1, accentColor: C.green }} />
            </div>
          </div>
        )}

        <div style={{ fontSize: 11, color: C.amber, marginTop: 10, lineHeight: 1.45 }}>
          For a reliable wakeup, also set a backup alarm in your phone's Clock app.
        </div>
      </div>
    </div>
  );
}

// ─── Sleep Sounds Card ────────────────────────────────────────────────────────
const SOUND_PRESETS = [
  { id: "rain", icon: "🌧", label: "Rain" },
  { id: "ocean", icon: "🌊", label: "Ocean" },
  { id: "white", icon: "⬜", label: "White" },
  { id: "brown", icon: "🟤", label: "Brown" },
];
const TIMER_OPTIONS = [15, 30, 60, 90, 0]; // 0 = off/unlimited

function SleepSoundsCard() {
  const [active, setActive] = useState(null); // sound id
  const [vol, setVol] = useState(0.4);
  const [timer, setTimer] = useState(30); // minutes
  const [remaining, setRemaining] = useState(null); // seconds
  const timerRef = useRef(null);

  function play(id) {
    if (active === id) { stopNoise(); setActive(null); setRemaining(null); clearInterval(timerRef.current); return; }
    stopNoise();
    const ok = startNoise(id, vol);
    if (!ok) return;
    setActive(id);
    if (timer > 0) {
      let secs = timer * 60;
      setRemaining(secs);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        secs--;
        setRemaining(secs);
        if (secs <= 0) { stopNoise(); setActive(null); setRemaining(null); clearInterval(timerRef.current); }
      }, 1000);
    } else {
      setRemaining(null);
    }
  }

  useEffect(() => {
    if (_noiseGain) setNoiseVolume(vol);
  }, [vol]);

  useEffect(() => { return () => { stopNoise(); clearInterval(timerRef.current); }; }, []);

  const remainingLabel = remaining != null ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : null;

  return (
    <div style={{ background: C.card, borderRadius: 20, padding: "16px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Music size={16} color={C.inkSoft} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Sleep Sounds</span>
        </div>
        {active && (
          <span style={{ fontSize: 11.5, color: C.greenSoft, fontWeight: 600 }}>
            Playing {remainingLabel ? `· ${remainingLabel}` : ""}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {SOUND_PRESETS.map(s => (
          <button key={s.id} className="sprig-tap" onClick={() => play(s.id)}
            style={{ flex: 1, background: active === s.id ? C.green : C.bg2, border: `1px solid ${active === s.id ? C.green : C.line}`, borderRadius: 12, padding: "10px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: active === s.id ? "#fff" : C.muted, fontFamily: "DM Sans" }}>{s.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Volume2 size={13} color={C.muted} />
        <input type="range" min="0" max="1" step="0.05" value={vol}
          onChange={e => setVol(+e.target.value)}
          style={{ flex: 1, accentColor: C.green }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Timer:</span>
        {TIMER_OPTIONS.map(t => (
          <button key={t} className="sprig-tap" onClick={() => setTimer(t)}
            style={{ border: "none", cursor: "pointer", padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", background: timer === t ? C.green : C.bg2, color: timer === t ? "#fff" : C.muted }}>
            {t === 0 ? "∞" : `${t}m`}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main SleepTab ────────────────────────────────────────────────────────────
function SleepTab({ sleepLogs, sleepInfo, alarm, onSaveAlarm, sub = "sleep", onSub, session, micState, onStart, onEnd, onManual, onRemove, onToggleIgnore, onMarkNap, onEditLog, profile, advanced, daily, onDaily, recoveryRec }) {
  const { debtMin, lastSleep, rec, need } = sleepInfo;

  // Local state for morning routine and wind-down
  const [routine, setRoutine] = useState(() => lsGet("sprig_routine_v1", DEFAULT_ROUTINE));
  const [winddownEnabled, setWinddownEnabled] = useState(() => lsGet("sprig_winddown_v1", false));
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState(null); // log object being edited
  const [editBed, setEditBed] = useState("23:00");
  const [editWake, setEditWake] = useState("07:00");
  const [histSelected, setHistSelected] = useState(null);

  function saveRoutine(steps) { setRoutine(steps); lsSet("sprig_routine_v1", steps); }
  function toggleWinddown() { const v = !winddownEnabled; setWinddownEnabled(v); lsSet("sprig_winddown_v1", v); }

  // Check if we have a recent log (within last 20h) to decide whether to show estimate
  const hasRecentLog = lastSleep && (Date.now() - lastSleep.waketime) < 20 * 3600000;

  // Live session view
  if (session) {
    const elapsed = Math.round((Date.now() - session.bedTs) / 60000);
    const { wakeMin: smartWakeMin } = smartWake(session.bedTs, hmToMin(alarm.latest), alarm.window || 30);
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
            Keep the app open with your phone charging on the nightstand.
          </div>
        </div>
        <button className="sprig-tap" onClick={onEnd}
          style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "16px 0", marginTop: 16, fontSize: 15.5, fontWeight: 700, boxShadow: `0 6px 18px ${C.lime}33` }}>
          <Sun size={17} /> Wake up — end &amp; score
        </button>
      </div>
    );
  }

  return (
    <div className="sprig-rise">
      <SubTabs tabs={[["sleep", "Sleep"], ["alarm", "Alarm & Routine"]]} active={sub} onChange={onSub} />

      {/* ── SLEEP SUB-TAB ─────────────────────────────────── */}
      {sub === "sleep" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* A. Sleep Score Card */}
          <SleepScoreCard log={lastSleep} allLogs={sleepLogs} need={need} />

          {/* B. Sleep Debt Card */}
          <SleepDebtCard debtMin={debtMin} need={need} logs={sleepLogs} />

          {/* C. Energy Schedule */}
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, margin: "4px 2px 8px", display: "flex", alignItems: "center", gap: 7 }}>
              <Zap size={15} color={C.lime} /> Energy today
            </div>
            <EnergyScheduleCard sleepInfo={sleepInfo} />
          </div>

          {/* D. Last Night Summary */}
          {lastSleep && !editingLog && (
            <LastNightSummary
              log={lastSleep} allLogs={sleepLogs} need={need}
              onEdit={() => { setEditingLog(lastSleep); setEditBed(minToHm(tsToMin(lastSleep.bedtime))); setEditWake(minToHm(tsToMin(lastSleep.waketime))); }}
              onRemove={() => onRemove(lastSleep.id)}
            />
          )}

          {/* Inline edit panel */}
          {editingLog && (
            <div className="sprig-pop" style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: .4 }}>Edit last night</div>
              <div style={{ display: "flex", gap: 10 }}>
                <label style={{ flex: 1, fontSize: 12, color: C.inkSoft }}>Bed
                  <input type="time" value={editBed} onChange={e => setEditBed(e.target.value)}
                    style={{ width: "100%", marginTop: 4, border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 8px", fontSize: 13, background: C.bg, color: C.ink, fontFamily: "DM Sans" }} /></label>
                <label style={{ flex: 1, fontSize: 12, color: C.inkSoft }}>Wake
                  <input type="time" value={editWake} onChange={e => setEditWake(e.target.value)}
                    style={{ width: "100%", marginTop: 4, border: `1px solid ${C.line}`, borderRadius: 8, padding: "7px 8px", fontSize: 13, background: C.bg, color: C.ink, fontFamily: "DM Sans" }} /></label>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="sprig-tap" onClick={() => {
                  const baseWake = new Date(editingLog.waketime);
                  const [wh, wm] = editWake.split(":").map(Number);
                  const wakeTs = new Date(baseWake.getFullYear(), baseWake.getMonth(), baseWake.getDate(), wh, wm).getTime();
                  const [bh, bm] = editBed.split(":").map(Number);
                  let bedDate = new Date(wakeTs); bedDate.setHours(bh, bm, 0, 0);
                  if (bedDate.getTime() >= wakeTs) bedDate.setDate(bedDate.getDate() - 1);
                  onEditLog(editingLog.id, bedDate.getTime(), wakeTs);
                  setEditingLog(null);
                }} style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 9, padding: "9px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button className="sprig-tap" onClick={() => setEditingLog(null)}
                  style={{ background: C.bg2, color: C.muted, border: "none", borderRadius: 9, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* E. Smart Estimate (when no recent log) */}
          {!hasRecentLog && alarm?.enabled && (
            <SmartEstimateCard alarm={alarm} sleepLogs={sleepLogs} onConfirm={onManual} />
          )}

          {/* F. 7-Day History */}
          <SleepHistoryChart sleepLogs={sleepLogs} need={need} />

          {/* G. Sleep Log Form */}
          <div>
            <button className="sprig-tap" onClick={() => setShowLogForm(s => !s)}
              style={{ ...btn(showLogForm ? C.bg2 : C.card, showLogForm ? C.muted : C.inkSoft), width: "100%", padding: "13px 0", border: `1px solid ${C.line}`, boxShadow: C.shadow, fontSize: 13.5, fontWeight: 600 }}>
              <PencilLine size={15} /> {showLogForm ? "Hide log form" : "Log a night's sleep"}
            </button>
            {showLogForm && (
              <div className="sprig-pop" style={{ marginTop: 8 }}>
                <SleepLogForm onSave={(d) => { onManual(d); setShowLogForm(false); }} alarm={alarm} />
              </div>
            )}
          </div>

          {/* Also start sleep session */}
          <button className="sprig-tap" onClick={() => onStart(true)}
            style={{ ...btn(C.lime, "#0A1F12"), width: "100%", padding: "15px 0", flexDirection: "column", gap: 3, boxShadow: `0 6px 18px ${C.lime}33`, borderRadius: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 15, fontWeight: 700 }}>
              <Moon size={17} /> Start sleep tracking
            </span>
            <span style={{ fontSize: 11, opacity: .8, fontWeight: 600 }}>Smart alarm wakes you by {alarm.latest}</span>
          </button>

          <div style={{ height: 8 }} />
        </div>
      )}

      {/* ── ALARM & ROUTINE SUB-TAB ───────────────────────── */}
      {sub === "alarm" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* A. Smart Alarm */}
          <AlarmCard alarm={alarm} onSaveAlarm={onSaveAlarm} profile={profile} />

          {/* B. Wind-Down Reminder */}
          <WindDownCard alarm={alarm} need={need} winddownEnabled={winddownEnabled} onToggle={toggleWinddown} />

          {/* C. Morning Routine */}
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, margin: "4px 2px 8px" }}>
              Morning Routine
            </div>
            <MorningRoutineCard routine={routine} onSaveRoutine={saveRoutine} alarm={alarm} />
          </div>

          {/* D. Sleep Sounds */}
          <div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, margin: "4px 2px 8px" }}>
              Sleep Sounds
            </div>
            <SleepSoundsCard />
          </div>

          <div style={{ height: 8 }} />
        </div>
      )}
    </div>
  );
}

// ─── EnergyCurveCard (kept for EnergyTab) ────────────────────────────────────
function EnergyCurveCard({ sleepInfo }) {
  const { curve, gym, mealMarks, rec, wakeMin, todayBed } = sleepInfo;
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
  const W = 380, H = 150, padL = 8, padR = 8, top = 12, bot = 22;
  const DAY = 1440, HALF = 480;
  const nowMin = tsToMin(Date.now());
  const lo = nowMin - HALF, hi = nowMin + HALF;
  const x = (m) => padL + ((m - lo) / (hi - lo)) * (W - padL - padR);
  const y = (e) => top + (1 - Math.max(0, Math.min(100, e)) / 100) * (H - top - bot);
  const wrap = (m) => ((m % DAY) + DAY) % DAY;
  const inWin = (mod) => { for (const off of [-DAY, 0, DAY]) { const v = mod + off; if (v >= lo - 1 && v <= hi + 1) return v; } return null; };
  const bedM = wrap(rec?.recBed ?? todayBed ?? 1380);
  const wakeM = wrap(rec?.recWake ?? wakeMin ?? 420);
  const SLEEP_E = 8;
  const inSleep = (mod) => (bedM > wakeM ? (mod >= bedM || mod < wakeM) : (mod >= bedM && mod < wakeM));
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
  const sleepRects = [];
  for (const off of [-DAY, 0, DAY]) {
    let a = bedM + off, b = (bedM > wakeM ? wakeM + DAY : wakeM) + off;
    const ca = Math.max(a, lo), cb = Math.min(b, hi);
    if (cb > ca) sleepRects.push([ca, cb]);
  }
  const nowX = x(nowMin);
  const ticks = [];
  const firstHour = Math.ceil(lo / 120) * 120;
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
        <rect x={padL} y={top} width={Math.max(0, nowX - padL)} height={H - top - bot} fill={C.ink} opacity={C.isDark ? "0.06" : "0.03"} />
        {sleepRects.map(([a, b], i) => (
          <rect key={"sl" + i} x={x(a)} y={top} width={Math.max(0, x(b) - x(a))} height={H - top - bot} fill="#6C7BE0" opacity={C.isDark ? "0.16" : "0.12"} />
        ))}
        {ticks.map((m, i) => <line key={"g" + i} x1={x(m)} y1={top} x2={x(m)} y2={H - bot} stroke={C.line} strokeWidth="1" />)}
        {gym && (() => { const gs = inWin(wrap(gym.start)), ge = inWin(wrap(gym.end)); return gs != null && ge != null ? <rect x={x(gs)} y={top} width={Math.max(2, x(ge) - x(gs))} height={H - top - bot} fill={C.green} opacity="0.10" rx="4" /> : null; })()}
        {area && <path d={area} fill="url(#eg)" />}
        {line && <path d={line} fill="none" stroke={C.leaf} strokeWidth="2.4" strokeLinejoin="round" />}
        {(mealMarks || []).map((mk, i) => { const mx = inWin(wrap(mk.min)); return mx == null ? null : (
          <g key={i}>
            <line x1={x(mx)} y1={top} x2={x(mx)} y2={H - bot} stroke={C.amber} strokeWidth="1" strokeDasharray="2 3" opacity="0.6" />
            <circle cx={x(mx)} cy={H - bot} r="3.5" fill={C.amber} />
          </g>
        ); })}
        {sleepRects.map(([a, b], i) => (x(b) - x(a) > 36 ? <text key={"st" + i} x={(x(a) + x(b)) / 2} y={top + 12} fontSize="9" fill="#8E9BEA" textAnchor="middle" fontFamily="DM Sans" fontWeight="700">Sleep</text> : null))}
        <line x1={nowX} y1={top - 4} x2={nowX} y2={H - bot} stroke={C.coral} strokeWidth="1.8" />
        <circle cx={nowX} cy={top - 4} r="3" fill={C.coral} />
        <text x={nowX} y={top - 7} fontSize="9" fill={C.coral} textAnchor="middle" fontFamily="DM Sans" fontWeight="700">Now</text>
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

// ─── EnergyTab (named export — unchanged interface) ───────────────────────────
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

  const peak = curve.reduce((a, p) => (p.e > a.e ? p : a), curve[0]);
  const dip = curve.filter((p) => p.min > wakeMin + 240 && p.min < wakeMin + 540).reduce((a, p) => (p.e < a.e ? p : a), curve[Math.floor(curve.length / 2)] || curve[0]);
  const plan = [
    { min: wakeMin, icon: <Sun size={15} />, c: C.amber, label: "Wake up", sub: "get daylight + protein to kill grogginess" },
    { min: peak.min, icon: <Zap size={15} />, c: C.greenSoft, label: "Peak focus", sub: `energy ${peak.e}/100 — do your hardest work` },
    ...(gym ? [{ min: gym.start, icon: <Wind size={15} />, c: C.green, label: "Best workout window", sub: `${minToLabel(gym.start)}–${minToLabel(gym.end)} · fueled & high energy` }] : []),
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
      <EnergyCurveCard sleepInfo={sleepInfo} />
      {gym && (
        <div style={{ background: "linear-gradient(135deg," + C.green + "," + C.greenSoft + ")", borderRadius: 18, padding: 16, color: "#fff", marginTop: 14, display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center", flexShrink: 0 }}><Wind size={21} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, opacity: .85 }}>Best time to train</div>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700 }}>{minToLabel(gym.start)} – {minToLabel(gym.end)}</div>
          </div>
        </div>
      )}
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
