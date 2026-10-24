import React from "react";
import { Check, MoonStar, PencilLine } from "lucide-react";
import { C } from "../theme.js";
import { minToLabel, durLabel, tsToMin } from "../utils/vitaeCalc.js";

const _HAPTIC = { tap: 14, success: [30, 50, 30] };
function buzz(kind = "tap") {
  try { navigator.vibrate?.(_HAPTIC[kind] ?? 14); } catch (_) {}
}

// Morning check-in (docs/sleep-intelligence.md): one card when last night is only an estimate
// (phone motion / usual schedule). "Looks right" confirms it; "Adjust" opens the editor.
// checkin: likelySleepPeriod() result. compact: the smaller Today-tab version.
export default function SleepCheckIn({ checkin, onConfirm, onAdjust, compact = false }) {
  if (!checkin) return null;
  const span = Math.round((checkin.wakeTs - checkin.bedTs) / 60000);
  const mins = checkin.durationMin || span;
  const range = `${minToLabel(tsToMin(checkin.bedTs))} → ${minToLabel(tsToMin(checkin.wakeTs))}`;
  const title = checkin.kind === "confirm" ? "Last night, from your iPhone" : "Did you sleep about this?";
  return (
    <div className="sprig-pop" style={{ background: C.card, borderRadius: compact ? 16 : 20, padding: compact ? "12px 14px" : "16px 18px", boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <MoonStar size={15} color={C.lime} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{title}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: compact ? 18 : 21, fontWeight: 700, color: C.ink }}>~{durLabel(mins)}</span>
        <span style={{ fontSize: 12.5, color: C.inkSoft }}>{range}</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{checkin.reason}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="sprig-tap" onClick={() => { buzz("success"); onConfirm?.(checkin); }}
          style={{ flex: 1, background: C.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Check size={14} /> Looks right
        </button>
        <button className="sprig-tap" onClick={() => { buzz("tap"); onAdjust?.(checkin); }}
          style={{ flex: 1, background: C.bg2, color: C.inkSoft, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <PencilLine size={14} /> Adjust
        </button>
      </div>
    </div>
  );
}
