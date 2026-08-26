import React, { useState } from "react";
import { BookMarked, Check, ChevronDown, Coffee, Flame, PencilLine, Pill, Plus, Search, Target, Trash2, Zap } from "lucide-react";
import { C } from "../theme.js";
import { pct, waterGoal, mealScore, MICRO_KEYS } from "../utils/vitaeCalc.js";
import { btn, Btn, SubTabs, EmptyState, MacroBar, Ring, useKeyboardInset } from "../components/ui.jsx";

const MEAL_TAGS = ["breakfast", "lunch", "dinner", "snack", "pre-workout", "post-workout"];

function FavoriteFormSheet({ form, setForm, isNew, onClose, onSubmit }) {
  const kb = useKeyboardInset();
  const nameOk = (form.name || "").trim().length > 0;
  const numOk = (v) => v === "" || (Number.isFinite(+v) && +v >= 0);
  const fieldsOk = ["calories", "protein", "carbs", "fat", "fiber"].every((k) => numOk(form[k]));
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
          {[["calories", "kcal"], ["protein", "P (g)"], ["carbs", "C (g)"], ["fat", "F (g)"]].map(([k, lbl]) => (
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
        {!fieldsOk && <div style={{ fontSize: 11, color: C.coral, margin: "2px 0 8px" }}>Calories and macros must be numbers of 0 or more.</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="sprig-tap" onClick={onClose} style={{ flex: 1, ...btn(C.bg2, C.inkSoft), padding: "12px 0", fontSize: 13 }}>Cancel</button>
          <button className="sprig-tap" disabled={!valid} onClick={() => valid && onSubmit()}
            style={{ flex: 1, ...btn(valid ? C.green : C.bg2, valid ? "#fff" : C.muted), padding: "12px 0", fontSize: 13, opacity: valid ? 1 : .7 }}>{isNew ? "Save favorite" : "Save changes"}</button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function NutritionTab({ t, targets, entries, onRemove, profile, advanced, sub = "meals", onSub, nutriInfo, moveInfo, sleepInfo, daily, onDaily, onAddEntry,
  supps, takenIds, onToggleSupp, onRemoveSupp, onAddSupp, library, onQuick, entriesHistory,
  favoriteMeals, onSaveFavorite, onReplaceFavorite, onUpdateFavorite, onRemoveFavorite, onAddFavorite, onNewFood, onSnapFood, onScanLabel, onDescribe, onManual,
  onOpenCreateFavorite, onOpenEditFavorite, onFavoriteDuplicate, onOpenLogSheet, flashEntryId, dt = null }) {
  const [showMicros, setShowMicros] = useState(advanced);
  const [showAllFood, setShowAllFood] = useState(false);
  const [showSupps, setShowSupps] = useState(advanced || (supps?.length || 0) <= 4);
  const [favSearch, setFavSearch] = useState("");
  const [favSort, setFavSort] = useState("most"); // most | recent — default to most-used so top meals are one-tap
  const takenCount = supps.filter((s) => takenIds.includes(s.id)).length;
  const adjTarget = moveInfo?.calAdjust?.adjustedTargetCalories || targets.calories;
  const delta = moveInfo?.calAdjust?.delta || 0;
  const leftLabel = Math.max(0, adjTarget - t.calories);

  // favorites: filter + sort
  const favs = (favoriteMeals || [])
    .filter((f) => !favSearch || f.name.toLowerCase().includes(favSearch.toLowerCase()) || (f.tags || []).some((tg) => tg.includes(favSearch.toLowerCase())))
    .sort((a, b) => favSort === "most" ? (b.useCount || 0) - (a.useCount || 0) : (b.lastUsedTs || b.createdTs || 0) - (a.lastUsedTs || a.createdTs || 0));

  const sectionTitle = (txt) => (
    <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 700, margin: "22px 0 11px", letterSpacing: -.25, color: C.ink, display: "flex", alignItems: "center" }}>
      {txt}
    </div>
  );

  return (
    <div className="sprig-rise">
      <SubTabs tabs={[["nutrition", "Nutrition"], ["meals", "Meals"]]} active={sub} onChange={onSub} />

      {sub === "nutrition" && onOpenLogSheet && (
        <button className="sprig-tap" onClick={onOpenLogSheet}
          style={{ width: "100%", background: C.lime, border: "none", cursor: "pointer", borderRadius: 16, padding: "13px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, fontFamily: "DM Sans", boxSizing: "border-box", boxShadow: `0 4px 16px ${C.lime}40` }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(0,0,0,.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Plus size={18} color="#0A1F12" />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0A1F12", lineHeight: 1 }}>Log food</div>
            <div style={{ fontSize: 11.5, color: "#0A1F12", opacity: .7, marginTop: 3 }}>Snap, scan, describe, or add manually</div>
          </div>
        </button>
      )}

      {sub === "nutrition" && (<>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 700, margin: "6px 2px 3px", letterSpacing: -.3, color: C.ink }}>Nutrition</div>
      <div style={{ fontSize: 12.5, color: C.muted, margin: "0 2px 10px", lineHeight: 1.5 }}>Calories, macros, hydration, vitamins, and your supplement stack.</div>

      {/* Source banner — Quick Log or unknown */}
      {dt?.nutrition?.source === "quick_log" && (
        <div style={{ background: C.greenSoft + "12", border: `1px solid ${C.greenSoft}30`, borderRadius: 16, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.greenSoft + "20", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Zap size={16} color={C.greenSoft} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.greenSoft }}>Quick Log recorded</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Log meals below for exact macros and calorie tracking.</div>
          </div>
        </div>
      )}
      {(!dt || dt?.nutrition?.source === "unknown") && (
        <div style={{ background: C.bg2, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.bg2, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Flame size={16} color={C.muted} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft }}>No food logged yet</div>
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Log your first meal or use Quick Log to mark your nutrition status.</div>
          </div>
        </div>
      )}

      {/* DAILY TARGET — MacroFactor style */}
      {sectionTitle("Daily target")}
      <div style={{ background: C.card, borderRadius: 22, padding: 18, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        {/* calorie ring + stat strip — hidden when only Quick Log (no exact calories) */}
        {dt?.nutrition?.source === "quick_log" && t.calories === 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, background: C.bg2, borderRadius: 14, padding: "13px 14px" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: C.greenSoft + "20", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Zap size={20} color={C.greenSoft} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{dt.nutrition.proteinOk ? "Protein hit · " : ""}{dt.nutrition.calOk ? "Calories on track" : "Nutrition logged"}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>Log meals below to see exact calories and macros.</div>
            </div>
          </div>
        ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
          <Ring value={t.calories} max={adjTarget} label={leftLabel} sub="kcal left" color={t.calories > adjTarget ? C.coral : C.green} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              {[["Eaten", t.calories, C.ink], ["Target", adjTarget, C.inkSoft], ["Left", Math.max(0, adjTarget - t.calories), leftLabel > 0 ? C.greenSoft : C.coral]].map(([l, v, c]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, marginTop: 3, letterSpacing: .3 }}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
        {/* macro bars — hidden when only Quick Log (all zeros = fake data) */}
        {!(dt?.nutrition?.source === "quick_log" && t.calories === 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 11, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
          <MacroBar name="Protein" val={t.protein} max={targets.protein} color={C.green} />
          <MacroBar name="Carbs" val={t.carbs} max={targets.carbs} color={C.amber} />
          <MacroBar name="Fat" val={t.fat} max={targets.fat} color={C.coral} />
          <MacroBar name="Fiber" val={t.fiber} max={targets.fiber} color={C.leaf} />
        </div>
        )}
        {delta !== 0 && (
          <details style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
            <summary style={{ cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: C.inkSoft, fontWeight: 600 }}>
              <span>Adjusted for movement: <b style={{ color: C.ink }}>{adjTarget} kcal</b></span>
              <ChevronDown size={12} color={C.muted} />
            </summary>
            <div style={{ marginTop: 8, fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Base target</span><span>{targets.calories} kcal</span></div>
              {moveInfo?.calAdjust?.stepDelta != null && <div style={{ display: "flex", justifyContent: "space-between" }}><span>Steps / cardio</span><span>{(moveInfo.calAdjust.stepDelta + (moveInfo.calAdjust.cardioK || 0)) >= 0 ? "+" : ""}{moveInfo.calAdjust.stepDelta + (moveInfo.calAdjust.cardioK || 0)} kcal</span></div>}
              {moveInfo?.calAdjust?.workoutK ? <div style={{ display: "flex", justifyContent: "space-between" }}><span>Workout</span><span>+{moveInfo.calAdjust.workoutK} kcal</span></div> : null}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px dashed ${C.line}`, marginTop: 5, paddingTop: 5, color: C.inkSoft, fontWeight: 600 }}><span>Adjusted target</span><span>{adjTarget} kcal</span></div>
              <div style={{ marginTop: 8, fontSize: 10.5, fontStyle: "italic" }}>Calories burned are estimates — use your weight trend to fine-tune.</div>
            </div>
          </details>
        )}
        {/* diet quality */}
        {t.calories > 0 && !nutriInfo.dietQ.noData && nutriInfo.dietQ.score != null && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft }}>Diet quality</span>
              <span style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 700, color: nutriInfo.dietQ.score >= 70 ? C.greenSoft : nutriInfo.dietQ.score >= 50 ? C.amber : C.coral }}>{nutriInfo.dietQ.score}<span style={{ fontSize: 11, color: C.muted }}>/100</span></span>
            </div>
            <div style={{ height: 6, background: C.bg2, borderRadius: 99 }}>
              <div style={{ width: nutriInfo.dietQ.score + "%", height: "100%", background: nutriInfo.dietQ.score >= 70 ? C.greenSoft : nutriInfo.dietQ.score >= 50 ? C.amber : C.coral, borderRadius: 99, transition: "width .6s" }} />
            </div>
            {nutriInfo.dietQ.whyText && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 7, lineHeight: 1.5 }}>{nutriInfo.dietQ.whyText}</div>}
            {nutriInfo.dietQ.advice?.length > 0 && <div style={{ fontSize: 11, color: C.muted, marginTop: 5, opacity: 0.8 }}>To improve: {nutriInfo.dietQ.advice.slice(0, 3).join(", ")}.</div>}
          </div>
        )}
      </div>

      {/* bulk/cut/maintenance coach */}
      {nutriInfo.coach?.lines?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, marginBottom: 9, display: "flex", alignItems: "center", gap: 7 }}>
            <Target size={15} color={C.greenSoft} /> {targets.goal === "gain" ? "Lean bulk" : targets.goal === "lose" ? "Cut" : "Maintenance"} coach
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {nutriInfo.coach.lines.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: C.inkSoft, lineHeight: 1.4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: l.tone === "good" ? C.greenSoft : C.amber, flexShrink: 0, marginTop: 6 }} />{l.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TOP UP TODAY */}
      {nutriInfo.missing?.length > 0 && (
        <div style={{ background: C.card, borderRadius: 18, padding: 16, boxShadow: C.shadow, border: `1px solid ${C.line}`, marginTop: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: C.inkSoft, marginBottom: 11, display: "flex", alignItems: "center", gap: 7 }}>
            <Flame size={15} color={C.amber} /> Top up today
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {nutriInfo.missing.map((mi) => (
              <div key={mi.key}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{mi.label}</span>
                  <span style={{ fontSize: 11.5, color: mi.pct < 40 ? C.coral : C.amber, fontWeight: 600 }}>{mi.pct}%</span>
                </div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>Try: {mi.food}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* FOOD LOGGED TODAY */}
      {sectionTitle("Food logged today")}
      {entries.length === 0 ? (
        <EmptyState icon={<Flame size={20} color={C.greenSoft} />} title="No meals logged"
          text="Snap a photo, scan a label, or describe your meal — AI estimates nutrition instantly."
          actionLabel="Log your first meal" onAction={onNewFood} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(() => { const sorted = [...entries].sort((a, b) => (b.time || 0) - (a.time || 0)); return (showAllFood ? sorted : sorted.slice(0, 4)); })().map((e) => {
            const ms = mealScore(e, targets);
            const msCol = ms ? (ms.score >= 70 ? C.greenSoft : ms.score >= 45 ? C.amber : C.coral) : C.muted;
            return (
              <div key={e.id} ref={flashEntryId === e.id ? (el) => { if (el) setTimeout(() => { try { el.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (_) {} }, 80); } : undefined} className={flashEntryId === e.id ? "entry-flash" : ""} style={{ background: C.card, borderRadius: 14, padding: "12px 14px", boxShadow: C.shadow, border: `1px solid ${flashEntryId === e.id ? C.lime : C.line}`, transition: "border-color .4s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {ms && (
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: msCol + "1f", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 700, color: msCol, lineHeight: 1 }}>{ms.score}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}{e.mult !== 1 && <span style={{ color: C.muted, fontWeight: 500 }}> ×{e.mult}</span>}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{e.time ? minToLabel(tsToMin(e.time)) + " · " : ""}P {Math.round(e.protein_g * e.mult)} · C {Math.round(e.carbs_g * e.mult)} · F {Math.round(e.fat_g * e.mult)} g</div>
                  </div>
                  <div style={{ fontFamily: "Fraunces, serif", fontWeight: 700, fontSize: 16 }}>{Math.round(e.calories * e.mult)}</div>
                  <button className="sprig-tap" title="Save as favorite" onClick={() => onSaveFavorite(e, { onDuplicate: (fav, existing) => onFavoriteDuplicate && onFavoriteDuplicate(e, existing) })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.amber, padding: 4 }}><BookMarked size={15} /></button>
                  <button className="sprig-tap" onClick={() => onRemove(e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={15} /></button>
                </div>
                {advanced && ms && <div style={{ fontSize: 11, color: C.muted, marginTop: 8, paddingLeft: 50 }}>{ms.note}</div>}
              </div>
            );
          })}
          {entries.length > 4 && (
            <button className="sprig-tap" onClick={() => setShowAllFood((s) => !s)}
              style={{ background: C.bg2, border: "none", cursor: "pointer", color: C.greenSoft, fontSize: 12.5, fontWeight: 600, fontFamily: "DM Sans", borderRadius: 12, padding: "10px 0", marginTop: 2 }}>
              {showAllFood ? "Show less" : `View all ${entries.length} meals`}
            </button>
          )}
        </div>
      )}

      {/* HYDRATION & DRINKS */}
      {sectionTitle("Hydration & drinks")}
      <div style={{ background: C.card, borderRadius: 18, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
        <Stepper icon={<Coffee size={13} />} label="Water" value={daily.water || 0} suffix="ml" step={250} onChange={(v) => onDaily({ water: v })} color="#5B9BD5" goal={nutriInfo.waterGoal} />
        {nutriInfo.needsElectrolytes && <div style={{ fontSize: 11, color: C.amber, marginTop: 8 }}>Add electrolytes — you've sweated a lot today.</div>}
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>Goal {Math.round(nutriInfo.waterGoal)} ml · {Math.round(((daily.water || 0) / nutriInfo.waterGoal) * 100)}% today</div>
      </div>
      <div style={{ marginTop: 10 }}>
        <DrinksCard daily={daily} onDaily={onDaily} onAddEntry={onAddEntry} />
      </div>
      {(daily.alcohol_g || 0) > 0 && (
        <div style={{ fontSize: 11.5, color: C.amber, margin: "8px 4px 0", lineHeight: 1.5 }}>
          Alcohol today counts toward calories and nudges your recovery and sleep guidance.
        </div>
      )}
      </>)}

      {sub === "meals" && (<>
      {/* FAVORITE MEALS */}
      {sectionTitle("Favorite meals")}
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
          <span>Save meals you eat often as favorites, then add them to today with one tap. Tap any logged meal's star, or create one here.</span>
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

      {/* SAVE FAVORITES */}
      {sectionTitle("Save favorites")}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
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
      </>)}

      {sub === "nutrition" && (<>
      {/* SUPPLEMENTS */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 2px 10px" }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
          <Pill size={16} color={C.greenSoft} /> Daily stack
          {supps.length > 0 && <span style={{ fontFamily: "DM Sans", fontSize: 12, color: C.muted, fontWeight: 500 }}>· {takenCount}/{supps.length}</span>}
        </div>
        <button className="sprig-tap" onClick={onAddSupp} style={{ ...btn(C.bg2, C.green), padding: "7px 12px", fontSize: 12.5, borderRadius: 11 }}><Plus size={15} /> Add</button>
      </div>
      {supps.length === 0 ? (
        <button className="sprig-tap" onClick={onAddSupp}
          style={{ width: "100%", background: C.card, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "16px 14px", cursor: "pointer", color: C.muted, fontSize: 13, fontFamily: "DM Sans", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.green + "14", display: "grid", placeItems: "center", flexShrink: 0 }}><Pill size={17} color={C.greenSoft} /></div>
          <span>Add the supplements you take — describe them once or scan the label, then tick them off each day.</span>
        </button>
      ) : (
        <>
          {!showSupps && (
            <button className="sprig-tap" onClick={() => setShowSupps(true)} style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontSize: 13, color: C.inkSoft, fontFamily: "DM Sans", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{takenCount}/{supps.length} taken today</span><span style={{ color: C.greenSoft, fontWeight: 600 }}>Show stack ▾</span>
            </button>
          )}
          {showSupps && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {supps.map((s) => {
                const on = takenIds.includes(s.id);
                return (
                  <div key={s.id} className="sprig-tap" onClick={() => onToggleSupp(s.id)}
                    style={{ background: on ? C.green + "0d" : C.card, borderRadius: 14, padding: "11px 13px", cursor: "pointer", boxShadow: C.shadow, border: `1px solid ${on ? C.leaf + "66" : C.line}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center", background: on ? C.green : "transparent", border: on ? "none" : `2px solid ${C.line}` }}>
                      {on && <Check size={16} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: on ? C.green : C.ink }}>{s.name}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.serving}</div>
                    </div>
                    <button className="sprig-tap" onClick={(e) => { e.stopPropagation(); onRemoveSupp(s.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, flexShrink: 0 }}><Trash2 size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* VITAMINS & MINERALS */}
      {sectionTitle("Vitamins & minerals")}
      {(() => {
        const anyMicros = MICRO_KEYS.some(([k]) => (t.micros[k] || 0) > 0);
        if (!anyMicros) {
          return <EmptyState icon={<Pill size={20} color={C.greenSoft} />} title="No vitamin data yet"
            text="Log meals with AI or labels to see vitamins and minerals." />;
        }
        return (
          <>
            <button className="sprig-tap" onClick={() => setShowMicros((s) => !s)}
              style={{ width: "100%", background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", fontSize: 13, color: C.inkSoft, fontFamily: "DM Sans", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{MICRO_KEYS.filter(([k]) => t.micros[k] >= 100).length}/{MICRO_KEYS.length} at 100%</span>
              <span style={{ color: C.greenSoft, fontWeight: 600 }}>{showMicros ? "Hide ▴" : "Show vitamins & minerals ▾"}</span>
            </button>
            {showMicros && (
              <div style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: C.shadow, marginTop: 8, border: `1px solid ${C.line}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                {MICRO_KEYS.map(([k, lbl]) => {
                  const v = Math.min(150, t.micros[k]); const full = t.micros[k] >= 100;
                  return (
                    <div key={k}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                        <span style={{ color: C.inkSoft }}>{lbl}</span>
                        <span style={{ color: full ? C.greenSoft : C.muted, fontWeight: full ? 700 : 500 }}>{t.micros[k]}%</span>
                      </div>
                      <div style={{ height: 5, background: C.bg2, borderRadius: 99 }}>
                        <div style={{ width: Math.min(100, v) + "%", height: "100%", background: full ? C.greenSoft : C.leaf, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        );
      })()}
      </>)}

      <div style={{ height: 6 }} />

    </div>
  );
}
function MealsTab({ library, onLog, onRemove, onNew }) {
  return (
    <div className="sprig-rise">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "4px 2px 12px" }}>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 19, fontWeight: 600 }}>My Meals</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Described once, remembered forever. Tap to log instantly.</div>
        </div>
      </div>
      {library.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <BookMarked size={30} color={C.line} />
          <div style={{ color: C.muted, fontSize: 13.5, marginTop: 12, lineHeight: 1.5 }}>
            No saved meals yet. Describe a meal on the Today tab and it gets saved here automatically.
          </div>
          <button className="sprig-tap" onClick={onNew} style={{ ...btn(C.green, "#fff"), padding: "11px 18px", marginTop: 16 }}><PencilLine size={15} /> Describe a meal</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {library.map((m) => (
            <div key={m.id} style={{ background: C.card, borderRadius: 16, padding: 14, boxShadow: C.shadow, border: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{m.serving}</div>
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 5 }}>
                    <b style={{ color: C.coral }}>{m.calories}</b> kcal · P {Math.round(m.protein_g)} · C {Math.round(m.carbs_g)} · F {Math.round(m.fat_g)}
                  </div>
                </div>
                <button className="sprig-tap" onClick={() => onLog(m)} style={{ ...btn(C.green, "#fff"), width: 42, height: 42, borderRadius: 12 }}><Plus size={20} /></button>
                <button className="sprig-tap" onClick={() => onRemove(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { MealsTab };
export default NutritionTab;
