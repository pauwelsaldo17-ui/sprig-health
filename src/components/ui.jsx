import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Award, Moon, Activity, Sparkles, Dumbbell, Flame, ChevronRight, BedDouble, HeartPulse, Coffee, Minus, Plus } from "lucide-react";
import { C } from "../theme.js";
import { MUSCLES } from "../utils/vitaeCalc.js";

export const scrollIntoViewOnFocus = (e) => {
  try { setTimeout(() => { e.target && e.target.scrollIntoView && e.target.scrollIntoView({ block: "center", behavior: "smooth" }); }, 250); } catch (_) {}
};

export function Portal({ children }) {
  if (typeof document === "undefined" || !document.body) return null;
  return createPortal(children, document.body);
}

export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onChange = () => {
      const gap = Math.max(0, (window.innerHeight || 0) - (vv.height + vv.offsetTop));
      setInset(gap > 90 ? Math.round(gap) : 0);
    };
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    onChange();
    return () => { vv.removeEventListener("resize", onChange); vv.removeEventListener("scroll", onChange); };
  }, []);
  return inset;
}

export function Ring({ value, max, size = 132, stroke = 13, color = C.green, track = C.bg2, label, sub }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.min(1, max > 0 ? value / max : 0);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - p)}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 30, fontWeight: 600, color: C.ink, lineHeight: 1 }}>{label}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3, letterSpacing: .3 }}>{sub}</div>
      </div>
    </div>
  );
}

export function MacroBar({ name, val, max, color }) {
  const p = Math.min(100, max > 0 ? (val / max) * 100 : 0);
  const over = val > max && max > 0;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, letterSpacing: .2 }}>{name}</span>
        <span style={{ fontSize: 11.5, color: over ? C.coral : C.muted, fontWeight: over ? 700 : 400 }}>
          <b style={{ color: over ? C.coral : C.ink }}>{Math.round(val)}</b><span style={{ opacity: .6 }}>/{max}g</span>
        </span>
      </div>
      <div style={{ height: 8, background: C.bg2, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: p + "%", height: "100%", background: over ? C.coral : color, borderRadius: 99, transition: "width .5s ease" }} />
      </div>
    </div>
  );
}

export function btn(bg, fg) {
  return { background: bg, color: fg, border: "none", borderRadius: 14, fontFamily: "DM Sans, sans-serif",
    fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 };
}

export function Btn({ variant = "primary", onClick, disabled, full, size = "md", children, style = {} }) {
  const V = {
    primary:   { background: C.green, color: "#fff", border: "none" },
    secondary: { background: C.bg2, color: C.ink, border: `1px solid ${C.line}` },
    ghost:     { background: "transparent", color: C.inkSoft, border: "none" },
    danger:    { background: "transparent", color: C.coral, border: `1px solid ${C.coral}55` },
  }[variant] || {};
  const pad = size === "sm" ? "8px 12px" : size === "lg" ? "14px 20px" : "11px 16px";
  const fs = size === "sm" ? 12.5 : size === "lg" ? 15 : 13.5;
  return (
    <button className="sprig-tap" onClick={onClick} disabled={disabled}
      style={{ ...V, borderRadius: 12, fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: fs, padding: pad,
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, ...style }}>
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children, style = {} }) {
  const T = {
    success: { bg: C.greenSoft + "1a", fg: C.greenSoft },
    warning: { bg: C.amber + "1f", fg: C.amber },
    danger:  { bg: C.coral + "1a", fg: C.coral },
    neutral: { bg: C.bg2, fg: C.inkSoft },
  }[tone] || { bg: C.bg2, fg: C.inkSoft };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: T.bg, color: T.fg,
      borderRadius: 99, padding: "3px 9px", fontSize: 11, fontWeight: 700, letterSpacing: .2, ...style }}>
      {children}
    </span>
  );
}

export function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 10px" }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, color: C.ink }}>{title}</div>
      {action && (
        <button className="sprig-tap" onClick={onAction}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.greenSoft, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", display: "inline-flex", alignItems: "center", gap: 3 }}>
          {action}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.line}`, boxShadow: C.shadow, padding: "32px 20px", textAlign: "center" }}>
      {icon && <div style={{ width: 48, height: 48, borderRadius: 14, background: C.green + "14", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>{icon}</div>}
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: C.ink }}>{title}</div>
      {text && <div style={{ fontSize: 13, color: C.muted, marginTop: 7, lineHeight: 1.55, maxWidth: 285, marginLeft: "auto", marginRight: "auto" }}>{text}</div>}
      {actionLabel && onAction && (
        <div style={{ marginTop: 18 }}><Btn variant="primary" onClick={onAction} size="md">{actionLabel}</Btn></div>
      )}
    </div>
  );
}

export function ProgressBar({ pct, color = C.green, height = 6 }) {
  return (
    <div style={{ height, background: C.bg2, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: Math.max(0, Math.min(100, pct)) + "%", height: "100%", background: color, borderRadius: 99, transition: "width .5s ease" }} />
    </div>
  );
}

export function PremiumCard({ children, accent, onClick, style = {}, pad = 18 }) {
  const base = {
    background: C.card, borderRadius: 22, padding: pad, boxShadow: C.shadow,
    border: `1px solid ${C.line}`, ...(accent ? { borderLeft: `3px solid ${accent}` } : {}), ...style,
  };
  if (onClick) return <button className="sprig-tap sprig-glass" onClick={onClick} style={{ ...base, width: "100%", textAlign: "left", cursor: "pointer", display: "block" }}>{children}</button>;
  return <div className="sprig-glass" style={base}>{children}</div>;
}

export function GlassCard({ children, onClick, style = {}, pad = 18, radius = 24 }) {
  return <PremiumCard onClick={onClick} pad={pad} style={{ borderRadius: radius, ...style }}>{children}</PremiumCard>;
}

export function cardStyle(overrides = {}) {
  return { background: C.card, borderRadius: 22, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}`, ...overrides };
}
export function solidCardStyle(overrides = {}) {
  return { background: C.cardSolid, borderRadius: 22, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}`, ...overrides };
}
export function sectionTitleStyle(overrides = {}) {
  return { fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, color: C.ink, ...overrides };
}
export function eyebrowStyle(overrides = {}) {
  return { fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: C.muted, ...overrides };
}
export function iconButtonStyle(active = false, overrides = {}) {
  return { background: active ? C.green : C.bg2, color: active ? "#fff" : C.inkSoft, border: "none", cursor: "pointer", width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", ...overrides };
}
export function pillStyle(active = false, color = C.green, overrides = {}) {
  return { background: active ? color : C.bg2, color: active ? "#fff" : C.inkSoft, border: "none", cursor: "pointer", borderRadius: 99, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", ...overrides };
}

export function SourceLabel({ src }) {
  if (!src || src === "exact") return null;
  const MAP = {
    quick_log:  { label: "Quick log",  color: C.greenSoft },
    estimated:  { label: "Estimated",  color: C.amber },
    unknown:    { label: "Limited data", color: C.muted },
    disabled:   { label: "Off",         color: C.muted },
  };
  const s = MAP[src];
  if (!s) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.color + "1a", borderRadius: 6, padding: "2px 6px", letterSpacing: .3, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export function RingMetric({ value, max, label, icon, accent = C.lime, size = 76, stroke = 7, center, sub, track = "rgba(255,255,255,0.10)" }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - pct);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset .6s cubic-bezier(.22,.7,.25,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          {icon && !center && <span style={{ color: accent, display: "inline-flex" }}>{icon}</span>}
          {center != null && <span style={{ fontFamily: "Fraunces, serif", fontSize: size > 90 ? 24 : 16, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{center}</span>}
          {sub && <span style={{ fontSize: 9.5, color: C.muted, fontWeight: 600 }}>{sub}</span>}
        </div>
      </div>
      {label && <span style={{ fontSize: 11, color: C.inkSoft, fontWeight: 600, textAlign: "center" }}>{label}</span>}
    </div>
  );
}

export function MetricCard({ icon, label, value, unit, sub, pct, accent = C.lime, action }) {
  return (
    <PremiumCard>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        {icon && <span style={{ color: accent, display: "inline-flex" }}>{icon}</span>}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>{label}</span>
        {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{sub}</div>}
      {pct != null && <div style={{ marginTop: 10 }}><ProgressBar pct={pct} color={accent} /></div>}
    </PremiumCard>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", margin: "2px 0 16px" }}>
      <div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 700, color: C.ink, letterSpacing: -.4, lineHeight: 1.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 5 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function SubTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, background: C.bg2, padding: 4, borderRadius: 14, marginBottom: 14 }}>
      {tabs.map(([key, label]) => {
        const on = active === key;
        return (
          <button key={key} className="sprig-tap" onClick={() => onChange(key)}
            style={{ flex: 1, minWidth: 0, border: "none", cursor: "pointer", padding: "10px 6px", borderRadius: 11, fontSize: 12.5, fontWeight: on ? 700 : 600, fontFamily: "DM Sans",
              background: on ? C.card : "transparent", color: on ? C.lime : C.muted,
              boxShadow: on ? "0 1px 4px rgba(0,0,0,.22)" : "none",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "background .15s, color .15s" }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function winIconFor(source) {
  if (source === "workout") return Dumbbell;
  if (source === "nutrition") return Flame;
  if (source === "movement") return Activity;
  if (source === "sleep") return Moon;
  if (source === "mind") return Sparkles;
  return Award;
}

export function KudosButton({ kudoed, onKudos }) {
  return (
    <button className="sprig-tap" onClick={kudoed ? undefined : onKudos} disabled={kudoed} aria-label={kudoed ? "Kudoed" : "Give kudos"}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, border: `1px solid ${kudoed ? C.lime : C.line}`, cursor: kudoed ? "default" : "pointer",
        background: kudoed ? C.lime + "1f" : "transparent", color: kudoed ? C.lime : C.muted, borderRadius: 99, padding: "5px 11px", fontSize: 11.5, fontWeight: 700, fontFamily: "DM Sans", flexShrink: 0 }}>
      {kudoed ? <Check size={13} /> : <Award size={13} />} {kudoed ? "Kudoed" : "Kudos"}
    </button>
  );
}

export function WinRow({ win, onKudos, compact }) {
  const Ic = winIconFor(win.source);
  return (
    <div className={win.kudoed ? "" : "sprig-rise"} style={{ display: "flex", alignItems: "center", gap: 10, padding: compact ? "7px 0" : "9px 0" }}>
      <div style={{ width: 28, height: 28, borderRadius: 9, background: C.lime + "1a", display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Ic size={15} color={C.lime} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{win.title}</div>
        {!compact && win.detail && <div style={{ fontSize: 11, color: C.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{win.detail}</div>}
      </div>
      <KudosButton kudoed={win.kudoed} onKudos={() => onKudos(win.id)} />
    </div>
  );
}

export function TodayWinsCard({ wins, onKudos, onViewAll }) {
  const list = wins || [];
  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: list.length ? 6 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Award size={16} color={C.lime} />
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, color: C.ink }}>Today's wins</span>
        </div>
        {list.length > 0 && <span style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: C.lime }}>{list.length}</span>}
      </div>
      {list.length === 0 ? (
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 6 }}>Complete one small action to earn your first win today.</div>
      ) : (
        <>
          <div>
            {list.slice(0, 3).map((w) => <WinRow key={w.id} win={w} onKudos={onKudos} compact />)}
          </div>
          {list.length > 3 && (
            <button className="sprig-tap" onClick={onViewAll} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.lime, fontSize: 12, fontWeight: 600, fontFamily: "DM Sans", padding: "6px 0 0" }}>
              View all {list.length} wins →
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function Legend({ c, label, faded }) {
  return <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
    <span style={{ width: 10, height: 10, borderRadius: 3, background: c, opacity: faded ? 0.25 : 1 }} /> {label}
  </span>;
}

export function PerfectRecoveryCard({ recoveryInfo, compact = false, onGoTrain }) {
  const ri = recoveryInfo;
  if (!ri) return null;
  const scoreColor = ri.score >= 85 ? "#52B788" : ri.score >= 70 ? "#74C69D" : ri.score >= 55 ? "#F4A261" : ri.score >= 40 ? "#E07B3F" : "#E0574A";
  const [expanded, setExpanded] = useState(false);

  if (compact) {
    const readinessLabel = ri.score >= 80 ? "Fully recovered" : ri.score >= 65 ? "Mostly recovered" : ri.score >= 45 ? "Partly recovered" : "Under-recovered";
    return (
      <div className="sprig-tap" onClick={() => { if (onGoTrain) onGoTrain(); }}
        style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: "15px 16px", boxShadow: C.shadow, display: "flex", alignItems: "center", gap: 14, cursor: onGoTrain ? "pointer" : "default" }}>
        <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
          <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="30" cy="30" r="24" fill="none" stroke={C.bg2} strokeWidth="5.5" />
            <circle cx="30" cy="30" r="24" fill="none" stroke={scoreColor} strokeWidth="5.5"
              strokeDasharray={`${ri.score / 100 * 150.8} 150.8`} strokeLinecap="round"
              style={{ transition: "stroke-dasharray .5s" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{ri.score}</span>
            <span style={{ fontSize: 8, color: C.muted, fontWeight: 600, marginTop: 1 }}>/ 100</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .4, marginBottom: 3 }}>Recovery</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: scoreColor, lineHeight: 1.2 }}>{readinessLabel}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, background: C.bg2, borderRadius: 6, padding: "2px 7px" }}>{ri.confidence} conf.</span>
            {ri.limiters[0] && <span style={{ fontSize: 11, color: C.amber }}>· {ri.limiters[0]}</span>}
            {!ri.limiters[0] && ri.helpers[0] && <span style={{ fontSize: 11, color: scoreColor }}>· {ri.helpers[0]}</span>}
          </div>
          {ri.bestAction && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 5, fontWeight: 600 }}>{ri.bestAction}</div>}
        </div>
        {onGoTrain && <ChevronRight size={16} color={C.muted} style={{ flexShrink: 0 }} />}
      </div>
    );
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 20, padding: "16px 16px 14px", boxShadow: C.shadow, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <svg width="68" height="68" viewBox="0 0 68 68" style={{ flexShrink: 0 }}>
          <circle cx="34" cy="34" r="26" fill="none" stroke={C.bg2} strokeWidth="7" />
          <circle cx="34" cy="34" r="26" fill="none" stroke={scoreColor} strokeWidth="7"
            strokeDasharray={`${ri.score / 100 * 163.4} 163.4`} strokeLinecap="round"
            transform="rotate(-90 34 34)" style={{ transition: "stroke-dasharray .6s" }} />
          <text x="34" y="38" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="15" fontWeight="700" fill={scoreColor}>{ri.score}</text>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: C.ink }}>Perfect Recovery</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor, background: scoreColor + "18", padding: "2px 9px", borderRadius: 99 }}>{ri.label}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{ri.loadLevel} · {ri.confidence} confidence</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 5 }}>Best action: <span style={{ color: scoreColor }}>{ri.bestAction}</span></div>
        </div>
      </div>

      <div style={{ background: C.bg2, borderRadius: 12, padding: "10px 13px", marginBottom: 12, fontSize: 12.5, color: C.inkSoft, lineHeight: 1.5 }}>
        {ri.trainingAdj}
      </div>

      {(ri.limiters.length > 0 || ri.helpers.length > 0) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          {ri.limiters.length > 0 && (
            <div style={{ flex: 1 }}>
              <div className="sprig-eyebrow" style={{ marginBottom: 5 }}>Limiting</div>
              {ri.limiters.map((l, i) => (
                <div key={i} style={{ fontSize: 11.5, color: C.ink, marginBottom: 4, display: "flex", gap: 5, lineHeight: 1.4 }}>
                  <span style={{ color: "#E07B3F", marginTop: 1, flexShrink: 0 }}>▼</span><span>{l}</span>
                </div>
              ))}
            </div>
          )}
          {ri.helpers.length > 0 && (
            <div style={{ flex: 1 }}>
              <div className="sprig-eyebrow" style={{ marginBottom: 5 }}>Helping</div>
              {ri.helpers.map((h, i) => (
                <div key={i} style={{ fontSize: 11.5, color: C.ink, marginBottom: 4, display: "flex", gap: 5, lineHeight: 1.4 }}>
                  <span style={{ color: "#52B788", marginTop: 1, flexShrink: 0 }}>▲</span><span>{h}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 11, marginBottom: 10 }}>
        <div className="sprig-eyebrow" style={{ marginBottom: 7 }}>Today's checklist</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {ri.checklist.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: item.done ? C.muted : C.ink }}>
              <span style={{ marginTop: 1, flexShrink: 0, fontSize: 14, color: item.done ? "#52B788" : C.line }}>
                {item.done ? "✓" : "□"}
              </span>
              <span style={{ textDecoration: item.done ? "line-through" : "none", opacity: item.done ? 0.6 : 1, lineHeight: 1.4 }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {(() => {
        const allMuscles = MUSCLES.map(([k, n]) => ({ k, n, ...ri.muscleStatus[k] }));
        const isTrackingOff = allMuscles.every(m => m.trackingOff);
        if (isTrackingOff) return (
          <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
            <div className="sprig-eyebrow" style={{ marginBottom: 5 }}>Muscle recovery</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              Training tracking is off — enable in Settings → Tracking preferences to see muscle recovery.
            </div>
          </div>
        );
        const muscles = allMuscles.filter(m => m.fatigue > 0);
        if (!muscles.length) return (
          <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
            <div className="sprig-eyebrow" style={{ marginBottom: 5 }}>Muscle recovery</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              No training data logged — muscle status unknown. Log a workout or use Quick Log to update muscle fatigue.
            </div>
          </div>
        );
        const shown = expanded ? muscles : muscles.filter(m => m.fatigue >= 30);
        if (!shown.length) return null;
        return (
          <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
            <div className="sprig-eyebrow" style={{ marginBottom: 7 }}>Muscle recovery</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {shown.map(m => (
                <span key={m.k} style={{ fontSize: 11, fontWeight: 600, color: m.color, background: m.color + "18", padding: "3px 9px", borderRadius: 99, border: `1px solid ${m.color}44` }}>
                  {m.name}: {m.status}
                  {m.quickLogged
                    ? <span style={{ fontSize: 9, opacity: .7, marginLeft: 4 }}>· QL</span>
                    : m.sourceLabel
                      ? <span style={{ fontSize: 9, opacity: .75, marginLeft: 4 }}>· {m.sourceLabel}</span>
                      : null}
                </span>
              ))}
              {muscles.length > shown.length && (
                <button className="sprig-tap" onClick={() => setExpanded(true)}
                  style={{ fontSize: 11, color: C.muted, background: C.bg2, border: `1px solid ${C.line}`, padding: "3px 9px", borderRadius: 99, cursor: "pointer", fontFamily: "DM Sans" }}>
                  +{muscles.length - shown.length} more
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {ri.recoveryWeek && (
        <div style={{ background: "#E07B3F18", border: "1px solid #E07B3F44", borderRadius: 12, padding: "9px 12px", marginTop: 10, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
          <b style={{ color: "#E07B3F" }}>Recovery week suggested.</b> {ri.rwReasons.join(", ")}. Consider reducing volume by 30–50%, avoiding failure, and prioritising sleep and food.
        </div>
      )}

      {ri.suggestActiveRecovery && !ri.recoveryWeek && (
        <div style={{ background: C.bg2, borderRadius: 11, padding: "8px 12px", marginTop: 8, fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>
          💡 Active recovery suggestion: 20–40 min easy walk, light mobility, or easy bike. Keep it easy — if it turns into a workout, it is not recovery.
        </div>
      )}

      {ri.sourceLines?.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", listStyle: "none", fontSize: 11, color: C.muted, fontWeight: 600, fontFamily: "DM Sans" }}>▾ Data sources</summary>
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            {ri.sourceLines.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>· {l}</div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function ScoreDonut({ score, size = 92 }) {
  const col = score >= 70 ? C.greenSoft : score >= 50 ? C.amber : C.coral;
  const r = (size - 14) / 2, circ = 2 * Math.PI * r, off = circ * (1 - score / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .7s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9.5, opacity: .7 }}>/ 100</span>
      </div>
    </div>
  );
}

export const ACTION_ICON = {
  train: <Dumbbell size={16} />, rest: <BedDouble size={16} />, pain: <HeartPulse size={16} />,
  protein: <Flame size={16} />, food: <Flame size={16} />, walk: <Activity size={16} />,
  water: <Coffee size={16} />, sleep: <Moon size={16} />, done: <Check size={16} />,
};

export function Stepper({ icon, label, value, suffix, step, onChange, color, goal }) {
  const reached = goal && value >= goal;
  return (
    <div style={{ flex: 1, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "10px 11px", boxShadow: C.shadow }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, color: color || C.greenSoft, fontSize: 11, fontWeight: 600 }}>{icon} {label}{goal ? <span style={{ marginLeft: "auto", color: reached ? C.greenSoft : C.muted, fontWeight: 600 }}>{reached ? "✓" : `/${goal >= 1000 ? (goal / 1000) + "L" : goal}`}</span> : null}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
        <button className="sprig-tap" onClick={() => onChange(Math.max(0, value - step))} style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: C.bg2, color: C.inkSoft, cursor: "pointer", display: "grid", placeItems: "center" }}><Minus size={14} /></button>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700 }}>{value}{suffix}</span>
        <button className="sprig-tap" onClick={() => onChange(value + step)} style={{ width: 26, height: 26, borderRadius: 8, border: "none", background: C.green, color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}><Plus size={14} /></button>
      </div>
      {goal ? <div style={{ height: 4, background: C.bg2, borderRadius: 99, marginTop: 8 }}><div style={{ width: Math.min(100, (value / goal) * 100) + "%", height: "100%", background: color || C.greenSoft, borderRadius: 99, transition: "width .4s" }} /></div> : null}
    </div>
  );
}
