// src/screens/NutritionTab.jsx  — MacroFactor-inspired rebuild 2026-08-31
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  BookMarked, ChevronDown, ChevronLeft, ChevronRight, Check,
  Coffee, Flame, Pill, Plus, Search, Trash2, X, Zap, TrendingUp,
  Minus, Sparkles, PencilLine, Moon, Target, Droplets
} from "lucide-react";
import { C } from "../theme.js";
import { pct, MICRO_KEYS, uid, DRINK_PRESETS, minToLabel, tsToMin, todayStr, dayTotals } from "../utils/vitaeCalc.js";
import { btn, SubTabs, EmptyState, useKeyboardInset, Portal, scrollIntoViewOnFocus, MacroBar } from "../components/ui.jsx";

// ── Haptics ──────────────────────────────────────────────────────────────────
const HAPTIC = { tap: 14, light: 10, select: 8, success: [30, 50, 30], error: [100, 50, 100] };
function buzz(kind = "tap") { try { navigator.vibrate?.(HAPTIC[kind] ?? 14); } catch (_) {} }

// ── Formatting ───────────────────────────────────────────────────────────────
const fmtCal  = (n) => Math.round(n || 0).toLocaleString();
const fmtMacro = (n) => { const r = Math.round((n || 0) * 10) / 10; return r % 1 === 0 ? String(r) : r.toFixed(1); };

// ── Date helpers ─────────────────────────────────────────────────────────────
function addDays(dateStr, d) {
  const dt = new Date(dateStr); dt.setDate(dt.getDate() + d);
  return dt.toLocaleDateString("en-CA");
}
function isToday(dateStr) { return dateStr === todayStr(); }
function formatHeaderDate(dateStr) {
  const d = new Date(dateStr);
  const days   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const label  = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
  if (isToday(dateStr)) return `Today, ${label}`;
  const diff = Math.round((Date.now() - d.getTime()) / 86400000);
  return diff === 1 ? `Yesterday, ${label}` : label;
}

// ── Macro colors ─────────────────────────────────────────────────────────────
const MC = { protein: "#4A9EDB", carbs: "#F5A623", fat: "#9B6BBE", fiber: "#52B788" };

// ── SECTION A: Swipeable Nutrition Banner ─────────────────────────────────────
function NutritionBanner({ t, targets, adjTarget }) {
  const [view, setView] = useState("eaten"); // 'eaten' | 'remaining'
  const startXRef = useRef(null);

  const remainCals = Math.round(adjTarget - (t.calories || 0));
  const remainP = Math.round(targets.protein - (t.protein || 0));
  const remainC = Math.round(targets.carbs - (t.carbs || 0));
  const remainF = Math.round(targets.fat - (t.fat || 0));

  const calColor = view === "remaining"
    ? (remainCals < 0 ? C.coral : remainCals < adjTarget * 0.1 ? C.amber : C.greenSoft)
    : C.ink;

  const handlePointerDown = (e) => { startXRef.current = e.clientX; };
  const handlePointerUp   = (e) => {
    if (startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    startXRef.current = null;
    if (Math.abs(dx) > 40) {
      setView((v) => v === "eaten" ? "remaining" : "eaten");
      buzz("select");
    }
  };

  const MacroPill = ({ label, val, color }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 60 }}>
      <span style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{val}</span>
      <span style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>{label}</span>
    </div>
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={() => { setView((v) => v === "eaten" ? "remaining" : "eaten"); buzz("select"); }}
      style={{
        background: C.card, borderRadius: 22, padding: "20px 18px 16px",
        boxShadow: C.shadow, border: `1px solid ${C.line}`,
        cursor: "pointer", userSelect: "none", WebkitUserSelect: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {view === "eaten" ? "Eaten today" : "Remaining"}
        </span>
        <span style={{ fontSize: 11, color: C.muted }}>Tap to toggle</span>
      </div>

      <div style={{ textAlign: "center", margin: "8px 0 14px" }}>
        <span style={{ fontFamily: "Fraunces, serif", fontSize: 42, fontWeight: 700, color: calColor, lineHeight: 1, transition: "color .2s" }}>
          {view === "eaten" ? fmtCal(t.calories) : fmtCal(Math.abs(remainCals))}
        </span>
        <span style={{ fontSize: 14, color: C.muted, marginLeft: 6 }}>
          {view === "eaten" ? "kcal" : (remainCals < 0 ? "kcal over" : "kcal left")}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
        {view === "eaten" ? (
          <>
            <MacroPill label="Protein" val={`${fmtMacro(t.protein)}g`} color={MC.protein} />
            <MacroPill label="Carbs"   val={`${fmtMacro(t.carbs)}g`}   color={MC.carbs} />
            <MacroPill label="Fat"     val={`${fmtMacro(t.fat)}g`}     color={MC.fat} />
          </>
        ) : (
          <>
            <MacroPill label="Protein" val={`${remainP > 0 ? "" : "-"}${Math.abs(remainP)}g`} color={remainP > 0 ? MC.protein : C.coral} />
            <MacroPill label="Carbs"   val={`${remainC > 0 ? "" : "-"}${Math.abs(remainC)}g`} color={remainC > 0 ? MC.carbs : C.coral} />
            <MacroPill label="Fat"     val={`${remainF > 0 ? "" : "-"}${Math.abs(remainF)}g`} color={remainF > 0 ? MC.fat : C.coral} />
          </>
        )}
      </div>

      {/* dot indicator */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
        {["eaten","remaining"].map((v) => (
          <div key={v} style={{ width: v === view ? 16 : 6, height: 6, borderRadius: 99, background: v === view ? C.greenSoft : C.line, transition: "all .2s ease" }} />
        ))}
      </div>
    </div>
  );
}

// ── SECTION B: Macro Progress Bars ───────────────────────────────────────────
function MacroProgressBars({ t, targets }) {
  const bars = [
    { label: "Protein", val: t.protein || 0, max: targets.protein, color: MC.protein, unit: "g" },
    { label: "Carbs",   val: t.carbs   || 0, max: targets.carbs,   color: MC.carbs,   unit: "g" },
    { label: "Fat",     val: t.fat     || 0, max: targets.fat,     color: MC.fat,     unit: "g" },
  ];
  const hasFiber = (t.fiber || 0) > 0 || targets.fiber > 0;
  if (hasFiber) bars.push({ label: "Fiber", val: t.fiber || 0, max: targets.fiber || 30, color: MC.fiber, unit: "g" });

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bars.map(({ label, val, max, color, unit }) => {
          const over = val > max && max > 0;
          const p = max > 0 ? Math.min(100, (val / max) * 100) : 0;
          return (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: over ? C.coral : C.muted }}>
                  <b style={{ color: over ? C.coral : C.ink }}>{fmtMacro(val)}</b>
                  <span style={{ opacity: 0.6 }}> / {max}{unit}</span>
                </span>
              </div>
              <div style={{ height: 8, background: C.bg2, borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  width: `${p}%`, height: "100%",
                  background: over ? C.coral : color,
                  borderRadius: 99, transition: "width .5s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SECTION C: Time-Aware Projection ─────────────────────────────────────────
function ProjectionCard({ t, adjTarget }) {
  const now = new Date();
  const hour = now.getHours();
  const min  = now.getMinutes();
  if (hour >= 20) return null;

  const hoursSince6 = Math.max(0, hour - 6 + min / 60);
  const cals = t.calories || 0;

  let content;
  if (hoursSince6 < 1 || (hour < 10 && cals < 300)) {
    content = { text: "Early in the day — keep going 💪", color: C.muted, icon: "🌅" };
  } else {
    const projected = Math.round(cals / (hoursSince6 / 16));
    const diff = projected - adjTarget;
    const icon = diff > 100 ? "📈" : diff < -100 ? "📉" : "✅";
    const color = diff > 200 ? C.coral : diff > 100 ? C.amber : diff < -200 ? C.amber : C.greenSoft;
    content = { text: `On track for ~${fmtCal(projected)} kcal today`, color, icon };
  }

  return (
    <div style={{ background: C.bg2, borderRadius: 14, padding: "10px 14px", marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 16 }}>{content.icon}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: content.color, flex: 1 }}>{content.text}</span>
    </div>
  );
}

// ── SECTION D: Swipeable Food Entry Row ───────────────────────────────────────
function FoodEntryRow({ entry, onRemove, isToday: isT, flashId }) {
  const [tx, setTx]   = useState(0);
  const [open, setOpen] = useState(false);
  const startRef = useRef(null);
  const isFlash = flashId === entry.id;

  const handlePD = (e) => { startRef.current = e.clientX; };
  const handlePM = (e) => {
    if (startRef.current === null) return;
    const dx = Math.min(0, e.clientX - startRef.current);
    setTx(Math.max(-80, dx));
  };
  const handlePU = () => {
    if (tx < -50) { setOpen(true); setTx(-80); }
    else { setTx(0); setOpen(false); }
    startRef.current = null;
  };

  const kcal = Math.round((entry.calories || 0) * (entry.mult || 1));
  const p = fmtMacro((entry.protein_g || 0) * (entry.mult || 1));
  const c = fmtMacro((entry.carbs_g   || 0) * (entry.mult || 1));
  const f = fmtMacro((entry.fat_g     || 0) * (entry.mult || 1));

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}>
      {/* Red delete background */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
        background: C.coral, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: "0 12px 12px 0",
      }}>
        <Trash2 size={18} color="#fff" />
      </div>
      {/* Content row */}
      <div
        onPointerDown={handlePD}
        onPointerMove={handlePM}
        onPointerUp={handlePU}
        onPointerLeave={handlePU}
        className={isFlash ? "entry-flash" : ""}
        style={{
          position: "relative", background: C.card,
          border: `1px solid ${isFlash ? C.lime : C.line}`,
          borderRadius: 12, padding: "10px 12px",
          transform: `translateX(${tx}px)`,
          transition: tx === 0 || tx === -80 ? "transform .2s ease" : "none",
          touchAction: "pan-y",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.name}{entry.mult !== 1 && <span style={{ color: C.muted, fontWeight: 400 }}> ×{entry.mult}</span>}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {entry.serving && <span>{entry.serving} · </span>}
              <span style={{ color: MC.protein }}>P {p}g</span>
              {" "}<span style={{ color: MC.carbs }}>C {c}g</span>
              {" "}<span style={{ color: MC.fat }}>F {f}g</span>
            </div>
          </div>
          <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 16, color: C.ink, flexShrink: 0 }}>
            {fmtCal(kcal)}
          </div>
          {isT && !open && (
            <button className="sprig-tap" onClick={() => { setOpen(true); setTx(-80); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, flexShrink: 0 }}>
              <Trash2 size={14} />
            </button>
          )}
          {open && (
            <button className="sprig-tap" onClick={() => { onRemove(entry.id); buzz("light"); }}
              style={{ ...btn(C.coral, "#fff"), padding: "6px 10px", fontSize: 12, flexShrink: 0 }}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SECTION E: Food Search Sheet ─────────────────────────────────────────────
const UNITS = ["g", "oz", "ml", "cup", "piece", "serving"];
const UNIT_TO_G = { g: 1, oz: 28.35, ml: 1, cup: 240, piece: 1, serving: 1 };

function FoodSearchSheet({ open, onClose, onAdd, entriesHistory, activeMeal }) {
  const [tab, setTab]         = useState("search");
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [servingAmt, setServingAmt] = useState("100");
  const [servingUnit, setServingUnit] = useState("g");
  const [addedIds, setAddedIds] = useState(new Set());

  const [aiText, setAiText]   = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiItems, setAiItems] = useState([]);
  const [aiConfirmed, setAiConfirmed] = useState(new Set());

  const searchRef = useRef(null);
  const kb = useKeyboardInset();

  useEffect(() => {
    if (open) { setTab("search"); setQuery(""); setResults([]); setSelected(null); setAiItems([]); setAddedIds(new Set()); }
  }, [open]);

  useEffect(() => {
    if (open && tab === "search") setTimeout(() => searchRef.current?.focus(), 300);
  }, [open, tab]);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q.trim())}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,nutriments,serving_size,brands,serving_quantity`;
      const r = await fetch(url);
      const d = await r.json();
      setResults((d.products || []).filter((p) => p.product_name && p.nutriments?.["energy-kcal_100g"] != null).slice(0, 12));
    } catch (_) { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const addOFF = (product) => {
    const g = (() => {
      const amt = parseFloat(servingAmt) || 100;
      if (servingUnit === "g" || servingUnit === "ml") return amt;
      if (servingUnit === "oz") return amt * 28.35;
      if (servingUnit === "cup") return amt * 240;
      if (servingUnit === "serving") return amt * (parseFloat(product.serving_quantity) || 100);
      if (servingUnit === "piece") return amt * (parseFloat(product.serving_quantity) || 100);
      return amt;
    })();
    const n = product.nutriments || {};
    const factor = g / 100;
    onAdd({
      name: product.product_name + (product.brands ? ` (${product.brands.split(",")[0].trim()})` : ""),
      serving: `${Math.round(g)}g`,
      calories: Math.round((n["energy-kcal_100g"] || 0) * factor),
      protein_g: +((n["proteins_100g"] || 0) * factor).toFixed(1),
      carbs_g:   +((n["carbohydrates_100g"] || 0) * factor).toFixed(1),
      fat_g:     +((n["fat_100g"] || 0) * factor).toFixed(1),
      fiber_g:   +((n["fiber_100g"] || 0) * factor).toFixed(1),
      micros: {
        sodium_mg: n["sodium_100g"] ? +((n["sodium_100g"] * 1000) * factor).toFixed(0) : null,
        calcium_mg: n["calcium_100g"] ? +((n["calcium_100g"] * 1000) * factor).toFixed(0) : null,
        iron_mg: n["iron_100g"] ? +((n["iron_100g"] * 1000) * factor).toFixed(1) : null,
      },
      omega3: null, mult: 1,
    }, activeMeal);
    setAddedIds((prev) => new Set([...prev, product.id || product.product_name]));
    buzz("success");
  };

  const addRecentEntry = (e) => {
    onAdd({ name: e.name, serving: e.serving, calories: e.calories, protein_g: e.protein_g, carbs_g: e.carbs_g, fat_g: e.fat_g, fiber_g: e.fiber_g, micros: e.micros || {}, omega3: e.omega3, mult: e.mult || 1 }, activeMeal);
    buzz("success");
  };

  const doAiAnalyze = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiItems([]);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "nutrition", description: aiText.trim() }),
      });
      if (!r.ok) throw new Error("API error " + r.status);
      const d = await r.json();
      if (d.items && Array.isArray(d.items)) setAiItems(d.items);
      else throw new Error("No items returned");
    } catch (_) {
      setAiItems([]);
    } finally {
      setAiLoading(false);
    }
  };

  const addAiItem = (item, idx) => {
    onAdd({
      name: item.name, serving: item.amount || "1 serving",
      calories: Math.round(item.calories || 0),
      protein_g: +(item.protein || 0).toFixed(1),
      carbs_g:   +(item.carbs   || 0).toFixed(1),
      fat_g:     +(item.fat     || 0).toFixed(1),
      fiber_g:   +(item.fiber   || 0).toFixed(1),
      micros: {}, omega3: null, mult: 1,
    }, activeMeal);
    setAiConfirmed((prev) => new Set([...prev, idx]));
    buzz("success");
  };

  // Recent: last 20 unique food names from history (most recent first)
  const recentEntries = (() => {
    const seen = new Set(); const out = [];
    for (const e of [...(entriesHistory || [])].reverse()) {
      const key = (e.name || "").toLowerCase().trim();
      if (!seen.has(key)) { seen.add(key); out.push(e); if (out.length >= 20) break; }
    }
    return out;
  })();

  // Frequent: top 10 by count
  const frequentEntries = (() => {
    const counts = {};
    for (const e of entriesHistory || []) {
      const key = (e.name || "").toLowerCase().trim();
      if (!counts[key]) counts[key] = { entry: e, n: 0 };
      counts[key].n++;
    }
    return Object.values(counts).sort((a, b) => b.n - a.n).slice(0, 10).map((x) => x.entry);
  })();

  if (!open) return null;
  return (
    <Portal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={(e) => e.stopPropagation()} className="sprig-bottom-sheet sprig-sheet"
          style={{ width: "100%", maxWidth: 500, background: C.cardSolid, borderRadius: "22px 22px 0 0",
            paddingBottom: `calc(12px + env(safe-area-inset-bottom,0px) + ${kb}px)`,
            maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 30px rgba(0,0,0,.4)" }}>

          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: C.line }} />
          </div>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", padding: "8px 16px 10px" }}>
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, flex: 1, color: C.ink }}>Add food</span>
            <button className="sprig-tap" onClick={onClose} style={{ background: C.bg2, border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center" }}>
              <X size={16} color={C.muted} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, background: C.bg2, margin: "0 14px 12px", borderRadius: 12, padding: 3 }}>
            {[["search","Search"],["recent","Recent"],["frequent","Frequent"],["ai","AI Log"]].map(([k,l]) => (
              <button key={k} className="sprig-tap" onClick={() => setTab(k)}
                style={{ flex: 1, border: "none", cursor: "pointer", padding: "8px 4px", borderRadius: 10, fontSize: 11.5, fontWeight: 700, fontFamily: "DM Sans",
                  background: tab === k ? C.card : "transparent",
                  color: tab === k ? C.greenSoft : C.muted,
                  boxShadow: tab === k ? "0 1px 4px rgba(0,0,0,.18)" : "none" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "0 14px" }}>

            {/* SEARCH TAB */}
            {tab === "search" && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 13, padding: "10px 12px", marginBottom: 12 }}>
                  <Search size={16} color={C.muted} />
                  <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search foods, brands…"
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, fontFamily: "DM Sans", color: C.ink }} />
                  {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0 }}><X size={14} /></button>}
                </div>
                {loading && <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 13 }}>Searching…</div>}
                {!loading && results.length === 0 && query.length > 1 && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 13 }}>No results. Try a different term.</div>
                )}
                {results.map((p) => {
                  const isSelected = selected?.product_name === p.product_name;
                  const isAdded = addedIds.has(p.id || p.product_name);
                  const servG = isSelected ? (() => {
                    const amt = parseFloat(servingAmt) || 100;
                    if (servingUnit === "g" || servingUnit === "ml") return amt;
                    if (servingUnit === "oz") return amt * 28.35;
                    if (servingUnit === "cup") return amt * 240;
                    if (servingUnit === "serving" || servingUnit === "piece") return amt * (parseFloat(p.serving_quantity) || 100);
                    return amt;
                  })() : 100;
                  const kcalPer = p.nutriments?.["energy-kcal_100g"] || 0;
                  const kcalDisplay = isSelected ? Math.round(kcalPer * servG / 100) : Math.round(kcalPer);

                  return (
                    <div key={p.product_name + (p.brands || "")} style={{ background: isSelected ? C.bg2 : "transparent", borderRadius: 13, padding: "10px 12px", marginBottom: 6, border: `1px solid ${isSelected ? C.line : "transparent"}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }} onClick={() => { setSelected(isSelected ? null : p); setServingAmt("100"); setServingUnit("g"); }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.product_name}</div>
                          <div style={{ fontSize: 11.5, color: C.muted }}>{p.brands ? `${p.brands.split(",")[0].trim()} · ` : ""}{Math.round(kcalPer)} kcal/100g</div>
                        </div>
                        {isAdded ? (
                          <div style={{ width: 32, height: 32, borderRadius: 99, background: C.greenSoft + "20", display: "grid", placeItems: "center", flexShrink: 0 }}>
                            <Check size={16} color={C.greenSoft} />
                          </div>
                        ) : (
                          <button className="sprig-tap" onClick={() => { setSelected(p); setServingAmt(p.serving_quantity ? String(Math.round(parseFloat(p.serving_quantity))) : "100"); setServingUnit("g"); }}
                            style={{ ...btn(C.bg2, C.greenSoft), padding: "7px 10px", fontSize: 12, flexShrink: 0 }}>
                            <Plus size={13} />
                          </button>
                        )}
                      </div>
                      {isSelected && !isAdded && (
                        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="number" inputMode="decimal" min="1" value={servingAmt}
                            onChange={(e) => setServingAmt(e.target.value)}
                            style={{ width: 72, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
                          <select value={servingUnit} onChange={(e) => setServingUnit(e.target.value)}
                            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", fontSize: 13, fontFamily: "DM Sans", color: C.ink }}>
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, flexShrink: 0 }}>{fmtCal(kcalDisplay)} kcal</span>
                          <button className="sprig-tap" onClick={() => addOFF(p)}
                            style={{ ...btn(C.green, "#fff"), padding: "8px 14px", fontSize: 13, flexShrink: 0 }}>
                            Add
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* RECENT TAB */}
            {tab === "recent" && (
              <div>
                {recentEntries.length === 0 ? (
                  <EmptyState icon={<Search size={20} color={C.greenSoft} />} title="No recent foods" text="Foods you log will appear here." />
                ) : recentEntries.map((e, i) => (
                  <div key={e.id + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted }}>{e.serving} · {Math.round(e.calories)} kcal</div>
                    </div>
                    <button className="sprig-tap" onClick={() => addRecentEntry(e)}
                      style={{ ...btn(C.bg2, C.greenSoft), padding: "7px 10px", fontSize: 12, flexShrink: 0 }}>
                      <Plus size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* FREQUENT TAB */}
            {tab === "frequent" && (
              <div>
                {frequentEntries.length === 0 ? (
                  <EmptyState icon={<Search size={20} color={C.greenSoft} />} title="No frequent foods" text="Foods you log often will appear here." />
                ) : frequentEntries.map((e, i) => (
                  <div key={e.id + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", borderBottom: `1px solid ${C.line}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted }}>{e.serving} · {Math.round(e.calories)} kcal</div>
                    </div>
                    <button className="sprig-tap" onClick={() => addRecentEntry(e)}
                      style={{ ...btn(C.bg2, C.greenSoft), padding: "7px 10px", fontSize: 12, flexShrink: 0 }}>
                      <Plus size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* AI LOG TAB */}
            {tab === "ai" && (
              <div>
                <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                  Describe what you ate in plain language and AI will estimate the nutrition.
                </div>
                <textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  onFocus={scrollIntoViewOnFocus}
                  placeholder="e.g. 2 scrambled eggs with toast and a coffee with milk"
                  rows={3}
                  style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 13, padding: "12px 14px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
                />
                <button className="sprig-tap" onClick={doAiAnalyze} disabled={!aiText.trim() || aiLoading}
                  style={{ ...btn(aiText.trim() && !aiLoading ? C.green : C.bg2, aiText.trim() && !aiLoading ? "#fff" : C.muted), width: "100%", padding: "12px 0", fontSize: 14, marginTop: 10 }}>
                  {aiLoading ? <><span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: 99, animation: "spin 1s linear infinite", marginRight: 8 }} />Analysing…</> : <><Sparkles size={15} /> Analyse</>}
                </button>
                {aiItems.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.inkSoft, marginBottom: 8, letterSpacing: 0.3, textTransform: "uppercase" }}>Parsed items</div>
                    {aiItems.map((item, i) => {
                      const confirmed = aiConfirmed.has(i);
                      return (
                        <div key={i} style={{ background: confirmed ? C.green + "12" : C.bg2, borderRadius: 13, padding: "10px 12px", marginBottom: 8, border: `1px solid ${confirmed ? C.leaf + "40" : C.line}` }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{item.name}</div>
                              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{item.amount} · {Math.round(item.calories || 0)} kcal</div>
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                                <span style={{ color: MC.protein }}>P {fmtMacro(item.protein)}g</span>
                                {" "}<span style={{ color: MC.carbs }}>C {fmtMacro(item.carbs)}g</span>
                                {" "}<span style={{ color: MC.fat }}>F {fmtMacro(item.fat)}g</span>
                              </div>
                            </div>
                            {confirmed ? (
                              <div style={{ width: 30, height: 30, borderRadius: 99, background: C.greenSoft + "20", display: "grid", placeItems: "center" }}>
                                <Check size={16} color={C.greenSoft} />
                              </div>
                            ) : (
                              <button className="sprig-tap" onClick={() => addAiItem(item, i)}
                                style={{ ...btn(C.green, "#fff"), padding: "7px 12px", fontSize: 12, flexShrink: 0 }}>
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                      Review and edit each item before adding. AI estimates may not be exact.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Done button */}
          <div style={{ padding: "10px 14px 0" }}>
            <button className="sprig-tap" onClick={onClose}
              style={{ ...btn(C.bg2, C.inkSoft), width: "100%", padding: "13px 0", fontSize: 14 }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── SECTION F: Water Tracker ──────────────────────────────────────────────────
function WaterCard({ daily, onDaily, waterGoalMl }) {
  const ml = daily.water || 0;
  const goal = waterGoalMl || 2500;
  const pct = Math.min(100, (ml / goal) * 100);
  const litres = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}ml`;
  const longPressRef = useRef(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");

  const addWater = (delta) => {
    onDaily({ water: Math.max(0, ml + delta) });
    buzz("tap");
  };
  const handlePlusLong = () => { longPressRef.current = setTimeout(() => setCustomOpen(true), 500); };
  const handlePlusRelease = () => { clearTimeout(longPressRef.current); };

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Droplets size={18} color="#5B9BD5" />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{litres(ml)}</span>
            <span style={{ fontSize: 11.5, color: C.muted }}>/ {litres(goal)}</span>
          </div>
          <div style={{ height: 7, background: C.bg2, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#5B9BD5", borderRadius: 99, transition: "width .4s ease" }} />
          </div>
        </div>
        <button className="sprig-tap" onClick={() => addWater(-250)}
          style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: C.bg2, cursor: "pointer", display: "grid", placeItems: "center", color: C.inkSoft }}>
          <Minus size={14} />
        </button>
        <button className="sprig-tap"
          onPointerDown={handlePlusLong}
          onPointerUp={() => { handlePlusRelease(); addWater(250); }}
          onPointerLeave={handlePlusRelease}
          style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#5B9BD5", cursor: "pointer", display: "grid", placeItems: "center" }}>
          <Plus size={14} color="#fff" />
        </button>
      </div>
      {customOpen && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" inputMode="numeric" value={customVal} onChange={(e) => setCustomVal(e.target.value)} placeholder="ml"
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 10, padding: "8px 10px", fontSize: 14, fontFamily: "DM Sans", color: C.ink }} />
          <button className="sprig-tap" onClick={() => { addWater(parseInt(customVal) || 0); setCustomVal(""); setCustomOpen(false); }}
            style={{ ...btn(C.green, "#fff"), padding: "8px 14px", fontSize: 13 }}>Add</button>
          <button className="sprig-tap" onClick={() => setCustomOpen(false)}
            style={{ ...btn(C.bg2, C.muted), padding: "8px 10px", fontSize: 13 }}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ── Drinks Card (original, unchanged) ────────────────────────────────────────
const MEAL_TAGS = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];

function DrinksCard({ daily, onDaily, onAddEntry }) {
  const [open, setOpen] = React.useState(false);
  const drinks = Array.isArray(daily?.alcoholDrinks) ? daily.alcoholDrinks : [];
  const totalG = drinks.reduce((a, d) => a + (d.alcohol_g || 0), 0);
  const totalKcal = drinks.reduce((a, d) => a + (d.kcal || 0), 0);
  const heavy = totalG >= 30;
  const moderate = totalG >= 15 && totalG < 30;
  const log = (preset) => {
    const next = [...drinks, { id: uid(), ts: Date.now(), ...preset }];
    onDaily({ alcoholDrinks: next, alcohol_g: next.reduce((a, d) => a + (d.alcohol_g || 0), 0), alcohol: next.length });
    buzz("light");
    if (onAddEntry) onAddEntry({ name: preset.name, calories: preset.kcal, protein_g: 0, carbs_g: preset.carbs || 0, fat_g: 0, fiber_g: 0, alcohol_g: preset.alcohol_g || 0, mult: 1, time: Date.now() });
  };
  const removeDrink = (id) => {
    const next = drinks.filter((d) => d.id !== id);
    onDaily({ alcoholDrinks: next, alcohol_g: next.reduce((a, d) => a + (d.alcohol_g || 0), 0), alcohol: next.length });
  };
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: "12px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <span style={{ fontSize: 14 }}>🍷</span>
        <div style={{ flex: 1, fontSize: 12, color: C.inkSoft, fontWeight: 600 }}>Drinks today</div>
        {drinks.length > 0 && <span style={{ fontSize: 11.5, color: heavy ? C.coral : moderate ? C.amber : C.muted, fontWeight: 600 }}>{totalG}g · {totalKcal} kcal</span>}
      </div>
      {drinks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
          {drinks.map((d) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.ink, padding: "5px 0" }}>
              <span style={{ flex: 1 }}>{d.name}</span>
              <span style={{ color: C.muted, fontSize: 11.5 }}>{d.kcal} kcal</span>
              <button className="sprig-tap" onClick={() => removeDrink(d.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.muted, padding: 2 }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {!open ? (
        <button className="sprig-tap" onClick={() => setOpen(true)} style={{ width: "100%", background: C.bg2, border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 0", fontSize: 12, fontWeight: 600, color: C.coral, fontFamily: "DM Sans" }}>
          <Plus size={12} /> Log a drink
        </button>
      ) : (
        <div style={{ background: C.bg, borderRadius: 11, padding: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {DRINK_PRESETS.map((p) => (
              <button key={p.id} className="sprig-tap" onClick={() => log(p)}
                style={{ background: C.card, border: `1px solid ${C.line}`, cursor: "pointer", borderRadius: 9, padding: "8px 11px", display: "flex", alignItems: "center", gap: 8, fontFamily: "DM Sans" }}>
                <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, color: C.ink, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{p.kcal} kcal · {p.alcohol_g}g</span>
              </button>
            ))}
          </div>
          <button className="sprig-tap" onClick={() => setOpen(false)} style={{ ...btn(C.bg2, C.inkSoft), width: "100%", padding: "8px 0", fontSize: 12, marginTop: 8 }}>Done</button>
        </div>
      )}
      {(moderate || heavy) && (
        <div style={{ marginTop: 8, padding: "8px 10px", background: heavy ? "#fdeee8" : "#fdf6e9", borderRadius: 9, fontSize: 11.5, color: heavy ? C.coral : C.amber, lineHeight: 1.5, display: "flex", gap: 7 }}>
          <Moon size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Alcohol calories counted. Recovery and sleep may be worse tonight.</span>
        </div>
      )}
    </div>
  );
}

// ── FavoriteFormSheet (original, unchanged) ───────────────────────────────────
function FavoriteFormSheet({ form, setForm, isNew, onClose, onSubmit }) {
  const kb = useKeyboardInset();
  const nameOk = (form.name || "").trim().length > 0;
  const numOk = (v) => v === "" || (Number.isFinite(+v) && +v >= 0);
  const fieldsOk = ["calories","protein","carbs","fat","fiber"].every((k) => numOk(form[k]));
  const valid = nameOk && fieldsOk;
  return (
    <Portal>
    <div onClick={onClose} className="sprig-dim" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 }}>
      <div onClick={(e) => e.stopPropagation()} className="sprig-sheet sprig-bottom-sheet"
        style={{ width: "100%", maxWidth: 440, background: C.cardSolid, borderRadius: "20px 20px 0 0", padding: "20px 18px", paddingBottom: `calc(20px + env(safe-area-inset-bottom, 0px) + ${kb}px)`, maxHeight: "88%", overflowY: "auto", WebkitOverflowScrolling: "touch", boxShadow: "0 -8px 30px rgba(0,0,0,.35)" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 12 }}>{isNew ? "New favorite meal" : "Edit favorite"}</div>
        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>Name</div>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onFocus={scrollIntoViewOnFocus} placeholder="e.g. Chicken rice bowl"
          style={{ width: "100%", background: C.bg, border: `1px solid ${nameOk || form.name === "" ? C.line : C.coral}`, borderRadius: 11, padding: "10px 12px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, marginBottom: 8, boxSizing: "border-box" }} />
        <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 4 }}>Serving</div>
        <input value={form.serving} onChange={(e) => setForm({ ...form, serving: e.target.value })} onFocus={scrollIntoViewOnFocus} placeholder="e.g. 1 bowl"
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 12px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, marginBottom: 8, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {[["calories","kcal"],["protein","P (g)"],["carbs","C (g)"],["fat","F (g)"]].map(([k, lbl]) => (
            <div key={k} style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 3 }}>{lbl}</div>
              <input type="number" inputMode="decimal" min="0" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} onFocus={scrollIntoViewOnFocus}
                style={{ width: "100%", background: C.bg, border: `1px solid ${numOk(form[k]) ? C.line : C.coral}`, borderRadius: 10, padding: "8px 9px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        <div style={{ width: "33%", marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 3 }}>Fiber (g)</div>
          <input type="number" inputMode="decimal" min="0" value={form.fiber} onChange={(e) => setForm({ ...form, fiber: e.target.value })} onFocus={scrollIntoViewOnFocus}
            style={{ width: "100%", background: C.bg, border: `1px solid ${numOk(form.fiber) ? C.line : C.coral}`, borderRadius: 10, padding: "8px 9px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
        </div>
        <div style={{ fontSize: 10.5, color: C.muted, margin: "4px 0 6px" }}>Tag (optional)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {MEAL_TAGS.map((tg) => {
            const on = (form.tags || []).includes(tg);
            return (
              <button key={tg} className="sprig-tap" onClick={() => setForm({ ...form, tags: on ? form.tags.filter((x) => x !== tg) : [...(form.tags || []), tg] })}
                style={{ background: on ? C.green : C.bg, color: on ? "#fff" : C.inkSoft, border: `1px solid ${on ? C.green : C.line}`, borderRadius: 99, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans" }}>{tg}</button>
            );
          })}
        </div>
        {!nameOk && <div style={{ fontSize: 11, color: C.coral, margin: "2px 0 8px" }}>A meal name is required.</div>}
        {!fieldsOk && <div style={{ fontSize: 11, color: C.coral, margin: "2px 0 8px" }}>Calories and macros must be numbers ≥ 0.</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="sprig-tap" onClick={onClose} style={{ flex: 1, ...btn(C.bg2, C.inkSoft), padding: "12px 0", fontSize: 13 }}>Cancel</button>
          <button className="sprig-tap" disabled={!valid} onClick={() => valid && onSubmit()}
            style={{ flex: 1, ...btn(valid ? C.green : C.bg2, valid ? "#fff" : C.muted), padding: "12px 0", fontSize: 13, opacity: valid ? 1 : .7 }}>
            {isNew ? "Save favorite" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

// ── Main NutritionTab ─────────────────────────────────────────────────────────
function NutritionTab({
  t, targets, entries, onRemove, profile, advanced, sub = "meals", onSub, nutriInfo, moveInfo, sleepInfo,
  daily, onDaily, onAddEntry,
  supps = [], takenIds = [], onToggleSupp, onRemoveSupp, onAddSupp,
  library = [], onQuick, entriesHistory = [],
  favoriteMeals = [], onSaveFavorite, onReplaceFavorite, onUpdateFavorite, onRemoveFavorite, onAddFavorite, onNewFood,
  onSnapFood, onScanLabel, onDescribe, onManual,
  onOpenCreateFavorite, onOpenEditFavorite, onFavoriteDuplicate, onOpenLogSheet, flashEntryId, dt = null,
}) {
  const [showMicros, setShowMicros] = useState(advanced);
  const [favSearch,  setFavSearch]  = useState("");
  const [favSort,    setFavSort]    = useState("most");
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [viewDateStr, setViewDateStr] = useState(todayStr);

  const takenCount = supps.filter((s) => takenIds.includes(s.id)).length;
  const allLogged  = supps.length > 0 && takenCount === supps.length;
  const adjTarget  = moveInfo?.calAdjust?.adjustedTargetCalories || targets.calories;

  const isViewingToday = isToday(viewDateStr);
  const viewEntries = isViewingToday
    ? (entries || [])
    : (entriesHistory || []).filter((e) => e.date === viewDateStr);
  const viewT = isViewingToday ? t : dayTotals(viewEntries);

  // Sorted food log — newest first (consistent with original app ordering)
  const sortedEntries = [...viewEntries].sort((a, b) => (b.time || 0) - (a.time || 0));

  const handleAddFood = (r) => {
    onAddEntry({ ...r, time: Date.now() });
  };

  const favs = (favoriteMeals || [])
    .filter((f) => !favSearch || f.name.toLowerCase().includes(favSearch.toLowerCase()) || (f.tags || []).some((tg) => tg.includes(favSearch.toLowerCase())))
    .sort((a, b) => favSort === "most" ? (b.useCount || 0) - (a.useCount || 0) : (b.lastUsedTs || b.createdTs || 0) - (a.lastUsedTs || a.createdTs || 0));

  return (
    <div className="sprig-rise">
      <SubTabs tabs={[["nutrition","Nutrition"],["meals","Meals"]]} active={sub} onChange={onSub} />

      {/* ── NUTRITION SUB ── */}
      {sub === "nutrition" && (
        <>
          {/* Date navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button className="sprig-tap" onClick={() => setViewDateStr((d) => addDays(d, -1))}
              style={{ width: 34, height: 34, borderRadius: 10, background: C.bg2, border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}>
              <ChevronLeft size={18} color={C.inkSoft} />
            </button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: -0.3 }}>
                {formatHeaderDate(viewDateStr)}
              </div>
              {!isViewingToday && (
                <button className="sprig-tap" onClick={() => setViewDateStr(todayStr())}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.greenSoft, fontSize: 11.5, fontWeight: 600, fontFamily: "DM Sans", marginTop: 2 }}>
                  Back to today
                </button>
              )}
            </div>
            <button className="sprig-tap" onClick={() => setViewDateStr((d) => { const n = addDays(d, 1); return n <= todayStr() ? n : d; })}
              style={{ width: 34, height: 34, borderRadius: 10, background: C.bg2, border: "none", cursor: "pointer", display: "grid", placeItems: "center", opacity: viewDateStr >= todayStr() ? 0.3 : 1 }}>
              <ChevronRight size={18} color={C.inkSoft} />
            </button>
          </div>

          {!isViewingToday && (
            <div style={{ background: C.amber + "18", border: `1px solid ${C.amber}44`, borderRadius: 12, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: C.amber, fontWeight: 600 }}>
              Past day — read only
            </div>
          )}

          {/* SECTION A: Banner */}
          <NutritionBanner t={viewT} targets={targets} adjTarget={adjTarget} />

          {/* SECTION B: Macro bars */}
          <MacroProgressBars t={viewT} targets={targets} />

          {/* SECTION C: Projection */}
          {isViewingToday && <ProjectionCard t={viewT} adjTarget={adjTarget} />}

          {/* SECTION D: Unified food log */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 10px" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, letterSpacing: -0.25, color: C.ink }}>
              Today's Food
            </div>
            {isViewingToday && (
              <button className="sprig-tap" onClick={() => { setSheetOpen(true); buzz("tap"); }}
                style={{ ...btn(C.green, "#fff"), padding: "8px 14px", fontSize: 13 }}>
                <Plus size={14} /> Add
              </button>
            )}
          </div>
          {sortedEntries.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, boxShadow: C.shadow, padding: "28px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: C.muted }}>Nothing logged yet — tap + to add food</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sortedEntries.map((e) => (
                <FoodEntryRow key={e.id} entry={e} onRemove={onRemove} isToday={isViewingToday} flashId={flashEntryId} />
              ))}
            </div>
          )}

          {/* SECTION F: Water */}
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, margin: "22px 2px 10px", letterSpacing: -0.25, color: C.ink }}>
            Hydration
          </div>
          {isViewingToday ? (
            <WaterCard daily={daily} onDaily={onDaily} waterGoalMl={nutriInfo?.waterGoal || 2500} />
          ) : (
            <div style={{ background: C.card, borderRadius: 14, padding: "13px 15px", border: `1px solid ${C.line}`, color: C.muted, fontSize: 12.5 }}>
              Water data is only tracked for today.
            </div>
          )}
          {isViewingToday && <DrinksCard daily={daily} onDaily={onDaily} onAddEntry={onAddEntry} />}

          {/* Supplements */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 10px" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, letterSpacing: -0.25, display: "flex", alignItems: "center", gap: 7, color: C.ink }}>
              <Pill size={18} color={C.greenSoft} /> Daily stack
              {supps.length > 0 && <span style={{ fontFamily: "DM Sans", fontSize: 12, color: C.muted, fontWeight: 500 }}>· {takenCount}/{supps.length}</span>}
            </div>
            <button className="sprig-tap" onClick={onAddSupp} style={{ ...btn(C.bg2, C.greenSoft), padding: "7px 12px", fontSize: 12.5, borderRadius: 11 }}><Plus size={14} /> Add</button>
          </div>
          {supps.length === 0 ? (
            <button className="sprig-tap" onClick={onAddSupp}
              style={{ width: "100%", background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 14px", cursor: "pointer", color: C.muted, fontSize: 13, fontFamily: "DM Sans", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green + "14", display: "grid", placeItems: "center", flexShrink: 0 }}><Pill size={17} color={C.greenSoft} /></div>
              <span>Add the supplements you take — tick them off each day to count their nutrients.</span>
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: "hidden" }}>
              {/* Log all / all logged banner */}
              {allLogged ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.green + "12", borderBottom: `1px solid ${C.line}` }}>
                  <Check size={14} color={C.greenSoft} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.greenSoft }}>All supplements logged today</span>
                </div>
              ) : (
                <button className="sprig-tap"
                  onClick={() => supps.forEach((s) => { if (!takenIds.includes(s.id)) onToggleSupp(s.id); })}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "none", border: "none", borderBottom: `1px solid ${C.line}`, cursor: "pointer", fontFamily: "DM Sans", width: "100%", textAlign: "left" }}>
                  <Check size={14} color={C.muted} />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: C.greenSoft }}>Log all {supps.length} supplements</span>
                  <span style={{ fontSize: 11.5, color: C.muted, marginLeft: "auto" }}>{supps.length - takenCount} remaining</span>
                </button>
              )}
              {/* Supplement rows */}
              {supps.map((s, i) => {
                const taken = takenIds.includes(s.id);
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < supps.length - 1 ? `1px solid ${C.line}` : "none", background: taken ? C.green + "08" : "transparent" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{s.name}</div>
                      {s.serving && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{s.serving}</div>}
                    </div>
                    <button className="sprig-tap" onClick={() => { onToggleSupp(s.id); buzz("light"); }}
                      style={{ ...btn(taken ? C.green : C.bg2, taken ? "#fff" : C.inkSoft), padding: "7px 13px", fontSize: 12.5, flexShrink: 0, borderRadius: 10 }}>
                      {taken ? <><Check size={13} /> Logged</> : "Log"}
                    </button>
                    <button className="sprig-tap" onClick={() => onRemoveSupp(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, flexShrink: 0 }}><Trash2 size={14} /></button>
                  </div>
                );
              })}
              {/* Quick add at bottom */}
              <button className="sprig-tap" onClick={onAddSupp}
                style={{ width: "100%", background: "none", border: "none", borderTop: `1px solid ${C.line}`, cursor: "pointer", padding: "11px 14px", fontSize: 12.5, fontWeight: 700, color: C.greenSoft, fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Quick add supplement
              </button>
            </div>
          )}

          {/* Vitamins */}
          {(() => {
            const anyMicros = MICRO_KEYS.some(([k]) => (viewT.micros?.[k] || 0) > 0);
            if (!anyMicros) return null;
            return (
              <div style={{ marginTop: 12 }}>
                <button className="sprig-tap" onClick={() => setShowMicros((s) => !s)}
                  style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontSize: 13, color: C.inkSoft, fontFamily: "DM Sans", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{MICRO_KEYS.filter(([k]) => (viewT.micros?.[k] || 0) >= 100).length}/{MICRO_KEYS.length} vitamins at 100%</span>
                  <span style={{ color: C.greenSoft, fontWeight: 600 }}>{showMicros ? "Hide ▴" : "Show vitamins & minerals ▾"}</span>
                </button>
                {showMicros && (
                  <div style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: C.shadow, marginTop: 8, border: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                    {MICRO_KEYS.map(([k, lbl]) => {
                      const v = Math.min(150, viewT.micros?.[k] || 0);
                      const full = (viewT.micros?.[k] || 0) >= 100;
                      return (
                        <div key={k}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                            <span style={{ color: C.inkSoft }}>{lbl}</span>
                            <span style={{ color: full ? C.greenSoft : C.muted, fontWeight: full ? 700 : 500 }}>{viewT.micros?.[k] || 0}%</span>
                          </div>
                          <div style={{ height: 5, background: C.bg2, borderRadius: 99 }}>
                            <div style={{ width: `${Math.min(100, v)}%`, height: "100%", background: full ? C.greenSoft : C.leaf, borderRadius: 99 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ height: 16 }} />
        </>
      )}

      {/* ── MEALS SUB ── */}
      {sub === "meals" && (
        <>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, margin: "6px 2px 10px", letterSpacing: -0.25, color: C.ink }}>Favorite meals</div>
          {(favoriteMeals?.length || 0) > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, background: C.card, border: `1px solid ${C.line}`, borderRadius: 11, padding: "7px 11px" }}>
                <Search size={14} color={C.muted} />
                <input value={favSearch} onChange={(e) => setFavSearch(e.target.value)} placeholder="Search favorites"
                  style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "DM Sans", color: C.ink }} />
              </div>
              <button className="sprig-tap" onClick={() => setFavSort((s) => s === "recent" ? "most" : "recent")}
                style={{ ...btn(C.bg2, C.inkSoft), padding: "8px 11px", fontSize: 11.5, whiteSpace: "nowrap" }}>
                {favSort === "recent" ? "Recent" : "Most used"}
              </button>
            </div>
          )}
          {(favoriteMeals?.length || 0) === 0 ? (
            <button className="sprig-tap" onClick={onOpenCreateFavorite}
              style={{ width: "100%", background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 14px", cursor: "pointer", color: C.muted, fontSize: 13, fontFamily: "DM Sans", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green + "14", display: "grid", placeItems: "center", flexShrink: 0 }}><BookMarked size={17} color={C.greenSoft} /></div>
              <span>Save meals you eat often as favorites — one-tap add anytime.</span>
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {favs.map((f) => (
                <div key={f.id} style={{ background: C.card, borderRadius: 14, padding: "11px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{f.calories} kcal · P{f.protein_g} C{f.carbs_g} F{f.fat_g}{f.useCount ? ` · used ${f.useCount}×` : ""}</div>
                    {(f.tags || []).length > 0 && <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>{f.tags.map((tg) => <span key={tg} style={{ fontSize: 9.5, color: C.greenSoft, background: C.green + "14", borderRadius: 99, padding: "2px 7px" }}>{tg}</span>)}</div>}
                  </div>
                  <button className="sprig-tap" onClick={() => onOpenEditFavorite(f)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><PencilLine size={14} /></button>
                  <button className="sprig-tap" onClick={() => onRemoveFavorite(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={14} /></button>
                  <button className="sprig-tap" onClick={() => onAddFavorite(f.id)} style={{ ...btn(C.green, "#fff"), padding: "8px 12px", fontSize: 12, whiteSpace: "nowrap" }}><Plus size={13} /> Add</button>
                </div>
              ))}
              {favs.length === 0 && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "12px 0" }}>No favorites match "{favSearch}".</div>}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14, marginBottom: 8 }}>
            <button className="sprig-tap" onClick={onOpenCreateFavorite} style={{ ...btn(C.bg2, C.green), padding: "10px 14px", fontSize: 13 }}><BookMarked size={15} /> Save new favorite</button>
          </div>
          {library?.length > 0 && (
            <>
              <div style={{ margin: "8px 2px 8px", fontSize: 12.5, fontWeight: 600, color: C.muted }}>Saved meals</div>
              <div className="sprig-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {library.slice(0, 10).map((m) => (
                  <button key={m.id} className="sprig-tap" onClick={() => onQuick(m)}
                    style={{ flexShrink: 0, background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "9px 13px", cursor: "pointer", textAlign: "left", boxShadow: C.shadow }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink, maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: C.coral, marginTop: 2 }}>{m.calories} kcal · +</div>
                  </button>
                ))}
              </div>
            </>
          )}
          <div style={{ height: 16 }} />
        </>
      )}

      {/* Food search sheet */}
      <FoodSearchSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdd={handleAddFood}
        entriesHistory={entriesHistory}
        activeMeal={null}
      />
    </div>
  );
}

// ── MealsTab helpers ─────────────────────────────────────────────────────────
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; }
}
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {} }

function mealQuality(items = []) {
  const cal  = items.reduce((s, i) => s + (i.calories || 0), 0);
  const p    = items.reduce((s, i) => s + (i.protein_g || 0), 0);
  const carbs = items.reduce((s, i) => s + (i.carbs_g || 0), 0);
  const fat  = items.reduce((s, i) => s + (i.fat_g || 0), 0);
  const fatPct = cal > 0 ? (fat * 9 / cal) * 100 : 0;
  if (p >= 20 && carbs <= p * 3 && fatPct < 40) return { label: "Balanced",    color: "#52B788", bg: "#52B78820" };
  if (p < 20)                                    return { label: "Low protein", color: "#E06B5D", bg: "#E06B5D20" };
  return                                                 { label: "High carb",  color: "#F5A623", bg: "#F5A62320" };
}

function sumItems(items = [], mult = 1) {
  return {
    calories:  Math.round(items.reduce((s, i) => s + (i.calories  || 0), 0) * mult),
    protein_g: +((items.reduce((s, i) => s + (i.protein_g || 0), 0)) * mult).toFixed(1),
    carbs_g:   +((items.reduce((s, i) => s + (i.carbs_g   || 0), 0)) * mult).toFixed(1),
    fat_g:     +((items.reduce((s, i) => s + (i.fat_g     || 0), 0)) * mult).toFixed(1),
    fiber_g:   +((items.reduce((s, i) => s + (i.fiber_g   || 0), 0)) * mult).toFixed(1),
  };
}

function relDate(ts) {
  if (!ts) return null;
  const diff = Math.floor((Date.now() - ts) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 7)  return `${diff} days ago`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getMonday(offsetWeeks = 0) {
  const now = new Date();
  const d = now.getDay();
  const diff = d === 0 ? -6 : 1 - d;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff + offsetWeeks * 7);
  mon.setHours(0, 0, 0, 0);
  return mon.toLocaleDateString("en-CA");
}
function shiftDate(dateStr, n) {
  const d = new Date(dateStr); d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}
const planKey = (ws, di, mt) => `${ws}_${di}_${mt}`;

const MULTS       = [0.5, 1, 1.5, 2];
const MEAL_TYPES  = ["breakfast", "lunch", "dinner"];
const MEAL_LABELS = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const DAY_LABELS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EMOJIS      = ["🍽️","🥣","🥗","🍳","🥘","🌮","🍜","🥙","🍱","🥩","🍗","🥦","🍚","🍞","🥚","🧆","🫕","🥒","🍣","🥡"];

function MealsTab({ library = [], onLog, onRemove, onNew, entries = [], onAddEntry, entriesHistory = [] }) {
  const [section, setSection] = useState("saved");
  const toastTimer = useRef(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 2400); };

  // ── Saved Meals ────────────────────────────────────────────────────────────
  const [savedMeals, setSavedMeals]   = useState(() => lsGet("sprig_saved_meals_v1", []));
  const [mealSearch, setMealSearch]   = useState("");
  const [detailMeal, setDetailMeal]   = useState(null);
  const [servingMeal, setServingMeal] = useState(null);
  const [servingMult, setServingMult] = useState(1);
  const [saveDayOpen, setSaveDayOpen] = useState(false);
  const [saveDayName, setSaveDayName] = useState("");
  const [mealBldrOpen, setMealBldrOpen] = useState(false);
  const [editMealId,   setEditMealId]   = useState(null);
  const [bldrName,     setBldrName]     = useState("");
  const [bldrEmoji,    setBldrEmoji]    = useState("🍽️");
  const [bldrItems,    setBldrItems]    = useState([]);
  const [bldrSheet,    setBldrSheet]    = useState(false);

  const persistSaved = (next) => { setSavedMeals(next); lsSet("sprig_saved_meals_v1", next); };

  const openMealBldr = (meal = null) => {
    setEditMealId(meal?.id || null);
    setBldrName(meal?.name || "");
    setBldrEmoji(meal?.emoji || "🍽️");
    setBldrItems(meal?.items || []);
    setMealBldrOpen(true);
  };

  const saveMealBldr = () => {
    const meal = { id: editMealId || uid(), name: bldrName.trim() || "Untitled meal", emoji: bldrEmoji, items: bldrItems, createdAt: Date.now(), lastLogged: null };
    persistSaved(editMealId ? savedMeals.map((m) => (m.id === editMealId ? meal : m)) : [meal, ...savedMeals]);
    setMealBldrOpen(false);
    showToast(`✓ ${meal.name} saved`);
  };

  const logSavedMeal = (meal, mult) => {
    const totals = meal.items?.length ? sumItems(meal.items, mult) : { calories: Math.round((meal.calories || 0) * mult), protein_g: +((meal.protein_g || 0) * mult).toFixed(1), carbs_g: +((meal.carbs_g || 0) * mult).toFixed(1), fat_g: +((meal.fat_g || 0) * mult).toFixed(1), fiber_g: +((meal.fiber_g || 0) * mult).toFixed(1) };
    onAddEntry({ name: meal.name, serving: mult === 1 ? "1 serving" : `${mult}× serving`, ...totals, micros: {}, omega3: null, mult: 1 });
    if (meal.id && savedMeals.some((m) => m.id === meal.id)) persistSaved(savedMeals.map((m) => m.id === meal.id ? { ...m, lastLogged: Date.now() } : m));
  };

  const saveDayAsMeal = () => {
    if (!entries.length) return;
    const items = entries.map((e) => ({ name: e.name, amount: e.serving || "1 serving", calories: Math.round((e.calories || 0) * (e.mult || 1)), protein_g: +((e.protein_g || 0) * (e.mult || 1)).toFixed(1), carbs_g: +((e.carbs_g || 0) * (e.mult || 1)).toFixed(1), fat_g: +((e.fat_g || 0) * (e.mult || 1)).toFixed(1), fiber_g: +((e.fiber_g || 0) * (e.mult || 1)).toFixed(1) }));
    const name = saveDayName.trim() || "Today's meals";
    persistSaved([{ id: uid(), name, emoji: "📅", items, createdAt: Date.now(), lastLogged: null }, ...savedMeals]);
    setSaveDayOpen(false); setSaveDayName(""); showToast(`✓ "${name}" saved`);
  };

  const filteredMeals = savedMeals.filter((m) => !mealSearch || m.name.toLowerCase().includes(mealSearch.toLowerCase()));

  // ── Recipes ────────────────────────────────────────────────────────────────
  const [recipes,        setRecipes]        = useState(() => lsGet("sprig_recipes_v1", []));
  const [recBldrOpen,    setRecBldrOpen]    = useState(false);
  const [editRecipeId,   setEditRecipeId]   = useState(null);
  const [rName,          setRName]          = useState("");
  const [rEmoji,         setREmoji]         = useState("🥘");
  const [rServings,      setRServings]      = useState(4);
  const [rIngredients,   setRIngredients]   = useState([]);
  const [rFoodSheet,     setRFoodSheet]     = useState(false);
  const [aiRecOpen,      setAiRecOpen]      = useState(false);
  const [aiRecText,      setAiRecText]      = useState("");
  const [aiRecLoading,   setAiRecLoading]   = useState(false);

  const persistRecipes = (next) => { setRecipes(next); lsSet("sprig_recipes_v1", next); };

  const openRecBldr = (rec = null) => {
    setEditRecipeId(rec?.id || null); setRName(rec?.name || ""); setREmoji(rec?.emoji || "🥘");
    setRServings(rec?.servings || 4); setRIngredients(rec?.ingredients || []);
    setRecBldrOpen(true);
  };

  const saveRecipe = () => {
    const rec = { id: editRecipeId || uid(), name: rName.trim() || "Untitled recipe", emoji: rEmoji, servings: Math.max(1, rServings), ingredients: rIngredients, createdAt: Date.now() };
    persistRecipes(editRecipeId ? recipes.map((r) => (r.id === editRecipeId ? rec : r)) : [rec, ...recipes]);
    setRecBldrOpen(false); showToast(`✓ ${rec.name} saved`);
    return rec;
  };

  const logRecipe = (rec) => {
    const mult = 1 / Math.max(1, rec.servings);
    const totals = sumItems(rec.ingredients || [], mult);
    onAddEntry({ name: rec.name, serving: "1 serving", ...totals, micros: {}, omega3: null, mult: 1 });
  };

  const doAiRecipe = async () => {
    if (!aiRecText.trim()) return;
    setAiRecLoading(true);
    try {
      const r = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "nutrition", description: aiRecText.trim() }) });
      const d = await r.json();
      if (d.items?.length) {
        setRIngredients(d.items.map((i) => ({ name: i.name, amount: i.amount || "1 serving", calories: Math.round(i.calories || 0), protein_g: +(i.protein || 0).toFixed(1), carbs_g: +(i.carbs || 0).toFixed(1), fat_g: +(i.fat || 0).toFixed(1), fiber_g: +(i.fiber || 0).toFixed(1) })));
        setRName(aiRecText.split(":")[0].trim().slice(0, 40));
        setAiRecOpen(false); setRecBldrOpen(true);
      }
    } catch (_) {}
    setAiRecLoading(false);
  };

  const rPerServing = sumItems(rIngredients, 1 / Math.max(1, rServings));
  const rTotal      = sumItems(rIngredients);

  // ── Meal Plan ──────────────────────────────────────────────────────────────
  const [plan,       setPlan]       = useState(() => lsGet("sprig_meal_plan_v1", {}));
  const [weekOffset, setWeekOffset] = useState(0);
  const [assignCell, setAssignCell] = useState(null);

  const persistPlan = (next) => { setPlan(next); lsSet("sprig_meal_plan_v1", next); };
  const weekStart = getMonday(weekOffset);

  const assignMeal = (src) => {
    if (!assignCell) return;
    const key = planKey(weekStart, assignCell.dayIdx, assignCell.mealType);
    persistPlan({ ...plan, [key]: { type: src.type, id: src.id, name: src.name, calories: src.calories } });
    setAssignCell(null);
  };
  const clearCell = (dayIdx, mt) => {
    const next = { ...plan }; delete next[planKey(weekStart, dayIdx, mt)]; persistPlan(next);
  };
  const copyLastWeek = () => {
    const lws = getMonday(weekOffset - 1); const added = {};
    DAY_LABELS.forEach((_, di) => MEAL_TYPES.forEach((mt) => { const sk = planKey(lws, di, mt); if (plan[sk]) added[planKey(weekStart, di, mt)] = plan[sk]; }));
    if (!Object.keys(added).length) { showToast("No last week plan to copy"); return; }
    persistPlan({ ...plan, ...added }); showToast("Last week's plan copied");
  };

  const planAvgCal = (() => {
    let total = 0, days = 0;
    DAY_LABELS.forEach((_, di) => {
      let day = 0;
      MEAL_TYPES.forEach((mt) => { day += plan[planKey(weekStart, di, mt)]?.calories || 0; });
      if (day > 0) { total += day; days++; }
    });
    return days > 0 ? Math.round(total / days) : null;
  })();

  const allSources = [
    ...savedMeals.map((m) => ({ type: "saved",   id: m.id, name: m.name, emoji: m.emoji || "🍽️", calories: sumItems(m.items || []).calories })),
    ...recipes.map((r)     => ({ type: "recipe",  id: r.id, name: r.name, emoji: r.emoji || "🥘", calories: sumItems(r.ingredients || [], 1 / Math.max(1, r.servings)).calories })),
    ...library.map((m)     => ({ type: "library", id: m.id, name: m.name, emoji: "🍴",             calories: m.calories || 0 })),
  ];

  // ── Sheet helper ───────────────────────────────────────────────────────────
  const Sheet = ({ open, onClose, children, maxH = "90vh" }) => !open ? null : (
    <Portal>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, background: C.cardSolid, borderRadius: "22px 22px 0 0", padding: "18px 18px 40px", maxHeight: maxH, overflowY: "auto", WebkitOverflowScrolling: "touch", boxShadow: "0 -8px 30px rgba(0,0,0,.4)" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: C.line }} />
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );

  return (
    <div className="sprig-rise" style={{ position: "relative" }}>

      {/* ── Pill toggle ──────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 3, background: C.bg2, borderRadius: 14, padding: 4, marginBottom: 16 }}>
        {[["saved","Saved Meals"],["recipes","Recipes"],["plan","Meal Plan"]].map(([k, l]) => (
          <button key={k} className="sprig-tap" onClick={() => { setSection(k); buzz("select"); }}
            style={{ flex: 1, border: "none", cursor: "pointer", padding: "9px 4px", borderRadius: 11, fontSize: 12, fontWeight: 700, fontFamily: "DM Sans", background: section === k ? C.card : "transparent", color: section === k ? C.greenSoft : C.muted, boxShadow: section === k ? "0 1px 6px rgba(0,0,0,.18)" : "none", transition: "all .15s" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ════════════════════ SAVED MEALS ════════════════════════════════ */}
      {section === "saved" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="sprig-tap" onClick={() => { setSaveDayName(""); setSaveDayOpen(true); }} disabled={!entries.length}
              style={{ ...btn(C.bg2, C.inkSoft), padding: "9px 12px", fontSize: 12, flex: 1, opacity: entries.length ? 1 : 0.4 }}>
              <Plus size={13} /> Save today's log
            </button>
            <button className="sprig-tap" onClick={() => openMealBldr(null)}
              style={{ ...btn(C.green, "#fff"), padding: "9px 14px", fontSize: 12 }}>
              <Plus size={13} /> New meal
            </button>
          </div>

          {savedMeals.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "9px 12px", marginBottom: 12 }}>
              <Search size={14} color={C.muted} />
              <input value={mealSearch} onChange={(e) => setMealSearch(e.target.value)} placeholder="Search saved meals…"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 13, fontFamily: "DM Sans", color: C.ink }} />
              {mealSearch && <button onClick={() => setMealSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0 }}><X size={13} /></button>}
            </div>
          )}

          {savedMeals.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: "32px 20px", textAlign: "center", boxShadow: C.shadow }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🍽️</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, marginBottom: 6 }}>No saved meals yet</div>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>Log a full day and save it as a meal template, or create a new meal manually.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredMeals.map((meal) => {
                const totals  = sumItems(meal.items || []);
                const quality = mealQuality(meal.items || []);
                return (
                  <div key={meal.id} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px 10px", cursor: "pointer" }} onClick={() => setDetailMeal(meal)}>
                      <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{meal.emoji || "🍽️"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meal.name}</div>
                        <div style={{ fontSize: 12, color: C.muted }}><b style={{ color: C.ink }}>{fmtCal(totals.calories)}</b> kcal · P {fmtMacro(totals.protein_g)}g C {fmtMacro(totals.carbs_g)}g F {fmtMacro(totals.fat_g)}g</div>
                        {meal.lastLogged && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Last logged {relDate(meal.lastLogged)}</div>}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: quality.bg, color: quality.color, flexShrink: 0 }}>{quality.label}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", padding: "7px 10px", borderTop: `1px solid ${C.line}`, gap: 4 }}>
                      <button className="sprig-tap" onClick={() => openMealBldr(meal)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: "4px 6px", fontSize: 11.5, fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 4 }}><PencilLine size={12} /> Edit</button>
                      <button className="sprig-tap" onClick={() => { persistSaved([{ ...meal, id: uid(), name: meal.name + " (copy)", createdAt: Date.now() }, ...savedMeals]); showToast("Duplicated"); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: "4px 6px", fontSize: 11.5, fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 4 }}><BookMarked size={12} /> Copy</button>
                      <button className="sprig-tap" onClick={() => persistSaved(savedMeals.filter((m) => m.id !== meal.id))} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: "4px 6px", fontSize: 11.5, fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={12} /> Delete</button>
                      <div style={{ flex: 1 }} />
                      <button className="sprig-tap" onClick={() => { setServingMeal(meal); setServingMult(1); buzz("tap"); }}
                        style={{ ...btn(C.green, "#fff"), padding: "7px 13px", fontSize: 12.5 }}>Log now →</button>
                    </div>
                  </div>
                );
              })}
              {filteredMeals.length === 0 && mealSearch && <div style={{ textAlign: "center", padding: "16px 0", color: C.muted, fontSize: 12.5 }}>No meals match "{mealSearch}"</div>}
            </div>
          )}

          {library.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", margin: "20px 2px 10px" }}>From AI log</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {library.map((m) => (
                  <div key={m.id} style={{ background: C.card, borderRadius: 14, padding: "12px 13px", boxShadow: C.shadow, border: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{m.calories} kcal · P{Math.round(m.protein_g || 0)} C{Math.round(m.carbs_g || 0)} F{Math.round(m.fat_g || 0)}</div>
                    </div>
                    <button className="sprig-tap" onClick={() => { if (onLog) onLog(m); }} style={{ ...btn(C.green, "#fff"), padding: "8px 12px", fontSize: 12 }}><Plus size={13} /> Log</button>
                    <button className="sprig-tap" onClick={() => { if (onRemove) onRemove(m.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ════════════════════ RECIPES ════════════════════════════════════ */}
      {section === "recipes" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button className="sprig-tap" onClick={() => { setAiRecText(""); setAiRecOpen(true); }}
              style={{ ...btn(C.bg2, C.inkSoft), padding: "9px 12px", fontSize: 12, flex: 1 }}>
              <Sparkles size={13} /> Describe a recipe
            </button>
            <button className="sprig-tap" onClick={() => openRecBldr(null)}
              style={{ ...btn(C.green, "#fff"), padding: "9px 14px", fontSize: 12 }}>
              <Plus size={13} /> New recipe
            </button>
          </div>

          {recipes.length === 0 ? (
            <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.line}`, padding: "32px 20px", textAlign: "center", boxShadow: C.shadow }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🥘</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, marginBottom: 6 }}>No recipes yet</div>
              <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>Build your first recipe or describe one with AI.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recipes.map((rec) => {
                const perServ = sumItems(rec.ingredients || [], 1 / Math.max(1, rec.servings));
                return (
                  <div key={rec.id} style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.line}`, boxShadow: C.shadow, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 14px 10px" }}>
                      <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{rec.emoji || "🥘"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rec.name}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{rec.servings} servings · <b style={{ color: C.ink }}>{fmtCal(perServ.calories)}</b> kcal/serving</div>
                        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>P {fmtMacro(perServ.protein_g)}g C {fmtMacro(perServ.carbs_g)}g F {fmtMacro(perServ.fat_g)}g</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", padding: "7px 10px", borderTop: `1px solid ${C.line}`, gap: 4 }}>
                      <button className="sprig-tap" onClick={() => openRecBldr(rec)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: "4px 6px", fontSize: 11.5, fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 4 }}><PencilLine size={12} /> Edit</button>
                      <button className="sprig-tap" onClick={() => persistRecipes(recipes.filter((r) => r.id !== rec.id))} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: "4px 6px", fontSize: 11.5, fontFamily: "DM Sans", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={12} /> Delete</button>
                      <div style={{ flex: 1 }} />
                      <button className="sprig-tap" onClick={() => logRecipe(rec)} style={{ ...btn(C.green, "#fff"), padding: "7px 13px", fontSize: 12.5 }}>Cook & log 1 serving</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ════════════════════ MEAL PLAN ══════════════════════════════════ */}
      {section === "plan" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button className="sprig-tap" onClick={() => setWeekOffset((w) => w - 1)} style={{ width: 34, height: 34, borderRadius: 10, background: C.bg2, border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}><ChevronLeft size={18} color={C.inkSoft} /></button>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 700, color: C.ink }}>
              {weekOffset === 0 ? "This week" : weekOffset === -1 ? "Last week" : weekOffset === 1 ? "Next week" : `Wk of ${new Date(weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
            </div>
            <button className="sprig-tap" onClick={() => setWeekOffset((w) => w + 1)} style={{ width: 34, height: 34, borderRadius: 10, background: C.bg2, border: "none", cursor: "pointer", display: "grid", placeItems: "center" }}><ChevronRight size={18} color={C.inkSoft} /></button>
          </div>

          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "62px repeat(7, 1fr)", minWidth: 520, gap: 3 }}>
              <div />
              {DAY_LABELS.map((d, i) => {
                const isT = shiftDate(weekStart, i) === todayStr();
                return (
                  <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: isT ? C.greenSoft : C.muted, padding: "3px 0" }}>
                    {d}
                    {isT && <div style={{ width: 4, height: 4, borderRadius: 99, background: C.greenSoft, margin: "2px auto 0" }} />}
                  </div>
                );
              })}
              {MEAL_TYPES.map((mt) => (
                <React.Fragment key={mt}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: 9.5, fontWeight: 700, color: C.muted, letterSpacing: 0.2, paddingRight: 5, textTransform: "uppercase" }}>{MEAL_LABELS[mt].slice(0, 5)}</div>
                  {DAY_LABELS.map((_, di) => {
                    const slot = plan[planKey(weekStart, di, mt)];
                    return (
                      <button key={di} className="sprig-tap"
                        onClick={() => { slot ? clearCell(di, mt) : setAssignCell({ dayIdx: di, mealType: mt }); buzz("tap"); }}
                        style={{ background: slot ? C.green + "14" : C.bg2, border: `1px solid ${slot ? C.green + "44" : C.line}`, borderRadius: 8, cursor: "pointer", minHeight: 52, padding: "4px 3px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        {slot ? (
                          <>
                            <div style={{ fontSize: 8.5, fontWeight: 700, color: C.ink, lineHeight: 1.2, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", padding: "0 2px" }}>{slot.name}</div>
                            <div style={{ fontSize: 8, color: C.muted }}>{slot.calories} kcal</div>
                          </>
                        ) : (
                          <span style={{ fontSize: 14, color: C.line, lineHeight: 1 }}>+</span>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button className="sprig-tap" onClick={copyLastWeek} style={{ ...btn(C.bg2, C.inkSoft), padding: "9px 12px", fontSize: 12, flex: 1 }}>Copy last week</button>
          </div>

          {planAvgCal ? (
            <div style={{ background: C.card, borderRadius: 14, padding: "11px 14px", border: `1px solid ${C.line}`, fontSize: 12.5, color: C.muted, textAlign: "center" }}>
              Daily average: <b style={{ color: C.ink }}>{fmtCal(planAvgCal)} kcal</b>
            </div>
          ) : (
            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.line}`, padding: "20px", textAlign: "center", fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
              Plan your week — tap any cell to assign a meal or recipe
            </div>
          )}
        </>
      )}

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <Portal>
          <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff", borderRadius: 99, padding: "10px 18px", fontSize: 13, fontWeight: 600, fontFamily: "DM Sans", boxShadow: "0 4px 20px rgba(0,0,0,.4)", zIndex: 9999, whiteSpace: "nowrap", pointerEvents: "none" }}>
            {toast}
          </div>
        </Portal>
      )}

      {/* ── Save today's log sheet ────────────────────────────────────────── */}
      <Sheet open={saveDayOpen} onClose={() => setSaveDayOpen(false)}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 4, color: C.ink }}>Save today's food log</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}>{entries.length} items · {fmtCal(entries.reduce((s, e) => s + (e.calories || 0) * (e.mult || 1), 0))} kcal</div>
        <input value={saveDayName} onChange={(e) => setSaveDayName(e.target.value)} placeholder="Meal template name…"
          style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 13px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, marginBottom: 12, boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="sprig-tap" onClick={() => setSaveDayOpen(false)} style={{ flex: 1, ...btn(C.bg2, C.inkSoft), padding: "12px 0", fontSize: 13 }}>Cancel</button>
          <button className="sprig-tap" onClick={saveDayAsMeal} style={{ flex: 1, ...btn(C.green, "#fff"), padding: "12px 0", fontSize: 13 }}>Save meal</button>
        </div>
      </Sheet>

      {/* ── Serving multiplier sheet ──────────────────────────────────────── */}
      <Sheet open={!!servingMeal} onClose={() => setServingMeal(null)} maxH="60vh">
        {servingMeal && (() => {
          const totals = sumItems(servingMeal.items || [], servingMult);
          return (
            <>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 4, color: C.ink }}>Log "{servingMeal.name}"</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}>Choose serving size</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {MULTS.map((m) => (
                  <button key={m} className="sprig-tap" onClick={() => { setServingMult(m); buzz("select"); }}
                    style={{ flex: 1, ...btn(servingMult === m ? C.green : C.bg2, servingMult === m ? "#fff" : C.inkSoft), padding: "11px 0", fontSize: 14 }}>
                    {m}×
                  </button>
                ))}
              </div>
              <div style={{ background: C.bg2, borderRadius: 12, padding: "11px 14px", marginBottom: 16, fontSize: 12.5, color: C.muted }}>
                <b style={{ color: C.ink }}>{fmtCal(totals.calories)} kcal</b> · P {fmtMacro(totals.protein_g)}g C {fmtMacro(totals.carbs_g)}g F {fmtMacro(totals.fat_g)}g
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="sprig-tap" onClick={() => setServingMeal(null)} style={{ flex: 1, ...btn(C.bg2, C.inkSoft), padding: "12px 0", fontSize: 13 }}>Cancel</button>
                <button className="sprig-tap" onClick={() => { logSavedMeal(servingMeal, servingMult); setServingMeal(null); }} style={{ flex: 1, ...btn(C.green, "#fff"), padding: "12px 0", fontSize: 13 }}>
                  <Check size={15} /> Add to today
                </button>
              </div>
            </>
          );
        })()}
      </Sheet>

      {/* ── Meal detail sheet ─────────────────────────────────────────────── */}
      <Sheet open={!!detailMeal} onClose={() => setDetailMeal(null)}>
        {detailMeal && (() => {
          const totals  = sumItems(detailMeal.items || []);
          const quality = mealQuality(detailMeal.items || []);
          return (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 34 }}>{detailMeal.emoji || "🍽️"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 700, color: C.ink }}>{detailMeal.name}</div>
                  {detailMeal.lastLogged && <div style={{ fontSize: 12, color: C.muted }}>Last logged {relDate(detailMeal.lastLogged)}</div>}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: quality.bg, color: quality.color }}>{quality.label}</div>
              </div>
              {(detailMeal.items || []).length > 0 && (
                <>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 7 }}>Ingredients</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 14 }}>
                    {detailMeal.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", background: C.bg2, borderRadius: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{item.name}</div>
                          {item.amount && <div style={{ fontSize: 11, color: C.muted }}>{item.amount}</div>}
                        </div>
                        <div style={{ fontSize: 11.5, color: C.muted, textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: C.ink }}>{fmtCal(item.calories)} kcal</div>
                          <div>P{fmtMacro(item.protein_g)} C{fmtMacro(item.carbs_g)} F{fmtMacro(item.fat_g)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ background: C.bg2, borderRadius: 13, padding: "12px 14px", marginBottom: 16 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>Total nutrition</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 0" }}>
                  {[["Calories", `${fmtCal(totals.calories)} kcal`], ["Protein", `${fmtMacro(totals.protein_g)}g`], ["Carbs", `${fmtMacro(totals.carbs_g)}g`], ["Fat", `${fmtMacro(totals.fat_g)}g`], ["Fiber", `${fmtMacro(totals.fiber_g)}g`]].map(([lbl, val]) => (
                    <div key={lbl}><div style={{ fontSize: 10.5, color: C.muted }}>{lbl}</div><div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{val}</div></div>
                  ))}
                </div>
              </div>
              <button className="sprig-tap" onClick={() => { setDetailMeal(null); setServingMeal(detailMeal); setServingMult(1); }}
                style={{ ...btn(C.green, "#fff"), width: "100%", padding: "13px 0", fontSize: 14 }}>
                <Plus size={15} /> Log this meal
              </button>
            </>
          );
        })()}
      </Sheet>

      {/* ── Meal builder sheet ────────────────────────────────────────────── */}
      <Sheet open={mealBldrOpen} onClose={() => setMealBldrOpen(false)}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 14, color: C.ink }}>{editMealId ? "Edit meal" : "New meal"}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <select value={bldrEmoji} onChange={(e) => setBldrEmoji(e.target.value)}
            style={{ width: 52, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, fontSize: 22, padding: "5px 2px", textAlign: "center" }}>
            {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input value={bldrName} onChange={(e) => setBldrName(e.target.value)} placeholder="Meal name…"
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 13px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 7 }}>Ingredients</div>
        {bldrItems.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12.5, textAlign: "center", padding: "10px 0 8px" }}>No items yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
            {bldrItems.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg2, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{item.amount} · {fmtCal(item.calories)} kcal</div>
                </div>
                <button onClick={() => setBldrItems((it) => it.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}
        {bldrItems.length > 0 && (
          <div style={{ background: C.bg2, borderRadius: 11, padding: "9px 12px", marginBottom: 10, fontSize: 12, color: C.muted }}>
            Total: <b style={{ color: C.ink }}>{fmtCal(sumItems(bldrItems).calories)} kcal</b> · P {fmtMacro(sumItems(bldrItems).protein_g)}g C {fmtMacro(sumItems(bldrItems).carbs_g)}g F {fmtMacro(sumItems(bldrItems).fat_g)}g
          </div>
        )}
        <button className="sprig-tap" onClick={() => setBldrSheet(true)}
          style={{ ...btn(C.bg2, C.greenSoft), width: "100%", padding: "10px 0", fontSize: 13, marginBottom: 14 }}>
          <Plus size={14} /> Add food item
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="sprig-tap" onClick={() => setMealBldrOpen(false)} style={{ flex: 1, ...btn(C.bg2, C.inkSoft), padding: "12px 0", fontSize: 13 }}>Cancel</button>
          <button className="sprig-tap" disabled={!bldrName.trim()} onClick={saveMealBldr}
            style={{ flex: 1, ...btn(bldrName.trim() ? C.green : C.bg2, bldrName.trim() ? "#fff" : C.muted), padding: "12px 0", fontSize: 13, opacity: bldrName.trim() ? 1 : 0.6 }}>
            Save meal
          </button>
        </div>
      </Sheet>
      <FoodSearchSheet open={bldrSheet} onClose={() => setBldrSheet(false)} entriesHistory={entriesHistory} activeMeal={null}
        onAdd={(item) => setBldrItems((prev) => [...prev, { name: item.name, amount: item.serving || "1 serving", calories: item.calories || 0, protein_g: item.protein_g || 0, carbs_g: item.carbs_g || 0, fat_g: item.fat_g || 0, fiber_g: item.fiber_g || 0 }])} />

      {/* ── Recipe builder sheet ─────────────────────────────────────────── */}
      <Sheet open={recBldrOpen} onClose={() => setRecBldrOpen(false)}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 14, color: C.ink }}>{editRecipeId ? "Edit recipe" : "New recipe"}</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <select value={rEmoji} onChange={(e) => setREmoji(e.target.value)}
            style={{ width: 52, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, fontSize: 22, padding: "5px 2px", textAlign: "center" }}>
            {EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Recipe name…"
            style={{ flex: 1, background: C.bg, border: `1px solid ${C.line}`, borderRadius: 11, padding: "10px 13px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 12.5, color: C.inkSoft, fontWeight: 600 }}>Servings</span>
          <button onClick={() => setRServings((s) => Math.max(1, s - 1))} style={{ width: 30, height: 30, borderRadius: 99, background: C.bg2, border: `1px solid ${C.line}`, cursor: "pointer", display: "grid", placeItems: "center" }}><Minus size={13} color={C.inkSoft} /></button>
          <span style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 700, color: C.ink, minWidth: 26, textAlign: "center" }}>{rServings}</span>
          <button onClick={() => setRServings((s) => s + 1)} style={{ width: 30, height: 30, borderRadius: 99, background: C.bg2, border: `1px solid ${C.line}`, cursor: "pointer", display: "grid", placeItems: "center" }}><Plus size={13} color={C.inkSoft} /></button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, letterSpacing: 0.4, textTransform: "uppercase" }}>Ingredients</div>
          <button className="sprig-tap" onClick={() => setRFoodSheet(true)} style={{ ...btn(C.bg2, C.greenSoft), padding: "6px 10px", fontSize: 11.5 }}><Plus size={12} /> Add</button>
        </div>
        {rIngredients.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12.5, textAlign: "center", padding: "10px 0 8px" }}>No ingredients yet</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
            {rIngredients.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg2, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{item.amount} · {fmtCal(item.calories)} kcal</div>
                </div>
                <button onClick={() => setRIngredients((it) => it.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}
        {rIngredients.length > 0 && (
          <div style={{ background: C.bg2, borderRadius: 11, padding: "9px 12px", marginBottom: 12, fontSize: 12, color: C.muted }}>
            <div>Total: <b style={{ color: C.ink }}>{fmtCal(rTotal.calories)} kcal</b></div>
            <div>Per serving: <b style={{ color: C.ink }}>{fmtCal(rPerServing.calories)} kcal</b> · P {fmtMacro(rPerServing.protein_g)}g C {fmtMacro(rPerServing.carbs_g)}g F {fmtMacro(rPerServing.fat_g)}g</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginBottom: rIngredients.length ? 8 : 0 }}>
          <button className="sprig-tap" onClick={() => setRecBldrOpen(false)} style={{ flex: 1, ...btn(C.bg2, C.inkSoft), padding: "12px 0", fontSize: 13 }}>Cancel</button>
          <button className="sprig-tap" disabled={!rName.trim()} onClick={saveRecipe}
            style={{ flex: 1, ...btn(rName.trim() ? C.green : C.bg2, rName.trim() ? "#fff" : C.muted), padding: "12px 0", fontSize: 13, opacity: rName.trim() ? 1 : 0.6 }}>
            Save recipe
          </button>
        </div>
        {rIngredients.length > 0 && (
          <button className="sprig-tap" onClick={() => { const rec = saveRecipe(); logRecipe(rec); }}
            style={{ ...btn(C.bg2, C.greenSoft), width: "100%", padding: "11px 0", fontSize: 13 }}>
            Save & log 1 serving now
          </button>
        )}
      </Sheet>
      <FoodSearchSheet open={rFoodSheet} onClose={() => setRFoodSheet(false)} entriesHistory={entriesHistory} activeMeal={null}
        onAdd={(item) => setRIngredients((prev) => [...prev, { name: item.name, amount: item.serving || "1 serving", calories: item.calories || 0, protein_g: item.protein_g || 0, carbs_g: item.carbs_g || 0, fat_g: item.fat_g || 0, fiber_g: item.fiber_g || 0 }])} />

      {/* ── AI recipe import sheet ────────────────────────────────────────── */}
      <Sheet open={aiRecOpen} onClose={() => setAiRecOpen(false)} maxH="65vh">
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 4, color: C.ink }}>Describe a recipe</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>AI will estimate ingredients and nutrition from your description.</div>
        <textarea value={aiRecText} onChange={(e) => setAiRecText(e.target.value)}
          placeholder="e.g. Pasta bolognese: 250g beef mince, 100g pasta, tomato sauce, parmesan"
          rows={4} style={{ width: "100%", background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 13px", fontSize: 14, fontFamily: "DM Sans", color: C.ink, resize: "none", boxSizing: "border-box", lineHeight: 1.5, marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="sprig-tap" onClick={() => setAiRecOpen(false)} style={{ flex: 1, ...btn(C.bg2, C.inkSoft), padding: "12px 0", fontSize: 13 }}>Cancel</button>
          <button className="sprig-tap" disabled={!aiRecText.trim() || aiRecLoading} onClick={doAiRecipe}
            style={{ flex: 1, ...btn(aiRecText.trim() && !aiRecLoading ? C.green : C.bg2, aiRecText.trim() && !aiRecLoading ? "#fff" : C.muted), padding: "12px 0", fontSize: 13, opacity: aiRecText.trim() && !aiRecLoading ? 1 : 0.6 }}>
            {aiRecLoading ? "Analysing…" : <><Sparkles size={14} /> Build recipe</>}
          </button>
        </div>
      </Sheet>

      {/* ── Meal plan assign sheet ────────────────────────────────────────── */}
      <Sheet open={!!assignCell} onClose={() => setAssignCell(null)} maxH="70vh">
        {assignCell && (
          <>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, marginBottom: 4, color: C.ink }}>
              {MEAL_LABELS[assignCell.mealType]} · {DAY_LABELS[assignCell.dayIdx]}
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 14 }}>Pick a meal or recipe</div>
            {allSources.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>No saved meals or recipes yet</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {allSources.map((src) => (
                  <button key={src.type + src.id} className="sprig-tap" onClick={() => { assignMeal(src); buzz("select"); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 13px", cursor: "pointer", fontFamily: "DM Sans", textAlign: "left", width: "100%" }}>
                    <span style={{ fontSize: 20 }}>{src.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{src.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted }}>{fmtCal(src.calories)} kcal · {src.type}</div>
                    </div>
                    <ChevronRight size={14} color={C.muted} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Sheet>

      <div style={{ height: 16 }} />
    </div>
  );
}

export { MealsTab, FavoriteFormSheet };
export default NutritionTab;
