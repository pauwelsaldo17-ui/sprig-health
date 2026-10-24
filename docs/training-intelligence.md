# Training intelligence: automatic workout analytics and recommendations

Phone-only by design: no heart rate, no wearable. The user logs exercises, weight × reps and
(optionally) RIR; everything else is derived. All math is deterministic and lives in
`src/utils/vitaeCalc.js`, section "training intelligence"; screens only render it and the AI
coach only receives the result.

## Audit of the existing training features (2026-10-24)

Already present and kept (behavior unchanged unless listed under "Problems"):

| Feature | Where |
|---|---|
| Exercise library (`EXERCISES`: group, `sec`, compound/isolation, barbell, main-lift key) | vitaeCalc |
| e1RM (Epley `est1RM`), per-set PR toast (e1RM > weight > reps > set volume > session volume) | `detectSetPR`, App `woLogSet` |
| Progression per exercise (rep range, RIR, intensity style, pain/sleep caution) | `progressionFor`, `suggestNext` |
| Warm-up ramp + plate calculator + mobility prep | `warmupSets`, `PlateView` |
| Rest timer (app-level, auto-starts on "Log set", per-exercise custom rest `sprig_rests_v1`) | App `startRest` |
| Quick RIR sheet after each set (`sprig_rir_preference_v1`: always / hard sets / off) | App `rirPrompt` |
| Weekly sets per muscle (primary 1, secondary 0.5) vs hypertrophy targets | `weeklyVolume`, `volumeStatus`, `VolumeCoach` |
| Muscle recovery map, split suggestion, deload banner | `muscleRecovery`, `suggestSplit`, `deloadAdvice` |
| Routines, 7 seed templates, "repeat last workout" | TrainTab |
| Recap sheet + wins after finishing | `recapFor`, `detectWorkoutWins`, App `recapView` |
| Net strength energy (MET 3.5–6 from density/effort/load), Health dedupe, dynamic calorie target | `strengthEnergy`, `dedupeExercise`, `dailyBudget` (docs/energy-budget.md) |
| "Complete workout" habit auto-completes from `trainedToday` | `computeAutoHabitToday` |

Problems found:

| # | Problem | Effect |
|---|---|---|
| 1 | Recovery uses only the **most recent** session per muscle and a **linear timer** (`RECOVER_BASE + 4 h/set`). Two hard chest days in a row look the same as one; RIR is ignored | "Recovered" after a fixed number of hours regardless of accumulated work |
| 2 | Apple Health strength workouts (`traditionalStrengthTraining` → "circuit") overlapping a Sprig workout feed recovery as a second session | Imported workouts double-count fatigue (energy already dedupes) |
| 3 | `stallingLifts` = last 3 sessions flat, only for 5 barbell lifts; `progressionFor` then prescribes a 10 % deload | Deloads on noise (3 sessions can be one bad week); accessories never checked |
| 4 | `deloadAdvice` mixes stalls, sleep debt, and fatigue but has no training-load or history-length gate | Can fire for a beginner after two weeks |
| 5 | New exercise prefill = **last weight logged** (the last, often lightest back-off set), not the progression target; after a set the reps field is cleared | More typing every set; the recommendation isn't what's prefilled |
| 6 | No training load, frequency/adherence, multi-week trend, plateau per exercise, history view per exercise, template-from-history | Items 8–10, 13, 18, 19 of the brief missing |
| 7 | Rest = 180 s compound / 75 s isolation, never adapts to reps or effort | Item 16/17 minimal |
| 8 | Recap shows duration/sets/volume/records only: no calories, muscles, progress vs last time, insights | Item 20 thin |
| 9 | Coach context has `workoutsThisWeek`, `stalledLifts`, top-5 fatigue only | Coach can't talk about load, trends or volume |
| 10 | Warm-ups ramp fully for every exercise, even the third chest exercise | Unnecessary warm-up sets |

## Model

### Working sets
A set counts toward volume, load and records when `done !== false`, `warmup !== true` and
`reps > 0`. (No warm-up flag exists in stored data today; the guard is for future logging.)
Effort from RIR: `rir ≤ 4` or `null` = hard set. Stimulus weight per set:
RIR 0 → 1.15, 1 → 1.05, 2 → 1.0, 3 → 0.85, ≥ 4 → 0.6, unknown → 1.0.

### Muscle contribution
Primary group 1 set, each secondary 0.5 set (existing convention, `MUSCLES` keys).

### e1RM and records
Epley (`est1RM`), unchanged so existing PRs stay identical. Only "applicable" when weight > 0
and reps ≤ 12 (higher reps over-estimate); bodyweight exercises get rep records instead.
Records per exercise: best e1RM, heaviest weight, most reps at each weight, best set volume,
best session volume, each with its date.

### Training load (sRPE, Foster 2001)
Session load = minutes × session RPE. Strength RPE = 10 − mean working-set RIR (clamped 5–10,
unknown → 7.5); minutes from the log, else 2.5 min/set. Sport/cardio: minutes × {easy 3,
moderate 5, hard 7}. Health workouts overlapping a Sprig workout ≥ 50 % are dropped (same rule
as `dedupeExercise`).
Acute = last 7 days; chronic = last 28 days ÷ 4. Ratio shown only with ≥ 21 days of history:
< 0.8 "lighter than usual", 0.8–1.3 "steady", 1.3–1.5 "high", > 1.5 "spike".

### Recovery (replaces the timer inside `muscleRecovery`, same output shape)
Per muscle, every session in the last 10 days leaves residual fatigue
`S × e^(−h/τ)`, where `S` = stimulus-weighted sets for that muscle and
`τ = RECOVER_BASE[m] / 2.3 × sleepFactor` (sleep readiness 0.85–1.3, existing factor).
Residuals **accumulate** across sessions. Fatigue % = `100 × (1 − e^(−F/6))`.
"Recovered" = fatigue < 20 %, never "time since last session ≥ N h"; `remaining` = hours
until that threshold. If the muscle's main exercise dropped ≥ 5 % e1RM vs its previous three
sessions, `F × 1.2` (`perfDrop` flag). Sport-session fatigue logic is kept, minus duplicates.
Labelled "approximate" in the UI.

### Trend, plateau, deload
- Trend per exercise: least-squares slope of session-best e1RM over the last 8 weeks, as %/week;
  4-week and 12-week change of the best e1RM.
- Plateau: ≥ 5 sessions over ≥ 21 days, ≥ 3 sessions in the last 21 days, the exercise had
  progressed earlier (best before the window ≥ 2.5 % above its first session), and no session in
  those 21 days beats the earlier best by > 1 %. An accessory kept at a steady load on purpose is
  "maintaining", not stalled. Regressing: last 3 sessions average < 95 % of the best.
  `stallingLifts` now returns these exercises (all exercises, not just 5).
- `progressionFor` prescribes the ~10 % reset only while the last session is still ≥ 97 % of
  the best. After any lighter session (a reset, or the user's own lighter choice) it progresses
  normally again, so resets never stack.
- Deload suggestion needs ≥ 4 weeks of history and ≥ 2 of: ≥ 2 exercises plateaued/regressing,
  load spike (ratio > 1.5) or ≥ 6 straight weeks without a lighter week (< 60 % of chronic)
  while performance stalls, sleep debt > 5 h, ≥ 6 muscles > 70 % fatigued.

### Prediction and prefill
`predictNextSets`: last session's working sets scaled to the progression target (top set from
`progressionFor`, back-off sets keep their ratio to the top set; reps follow the target on the
top-weight sets). The exercise card prefills set *n* with predicted set *n*; after logging, the
next predicted set is prefilled. Every value stays editable; the "Last time" row and ghost hints
stay.

### Rest
`restFor(meta, set)`: compound ≤ 5 reps 210 s, ≤ 10 reps 150 s, else 120 s; isolation ≤ 8
reps 90 s, else 75 s; abs 60 s; RIR 0 +30 s, RIR ≥ 3 −15 s; clamp 45–300, rounded to 15 s.
A custom rest (`sprig_rests_v1`) always wins. The timer auto-starts on "Log set" (unchanged);
when RIR is entered afterwards the running timer shifts by the difference.

### Warm-ups
Unchanged ramp for the first exercise of a muscle group. When that group (primary or secondary)
already has working sets in this session: compounds get two ramp sets (60 %×5, 85 %×2),
isolations none.

### Frequency, consistency, adherence
Sessions/week (4- and 12-week), per-muscle frequency (weeks average of sessions with ≥ 2 sets).
Target sessions/week = median of the last 8 weeks that had any session (min 2, max 6).
Adherence = Σ min(done, target) ÷ (target × 4) over the last 4 complete weeks. Streak =
consecutive complete weeks at target.

### Calories
`exerciseEnergy` (net, range, honours `workoutCalorieMode`). Always shown as "≈ X kcal
(estimate, Y–Z)". No heart rate used or required.

### Templates from history
Workouts in the last 8 weeks grouped by exercise overlap (Jaccard ≥ 0.6); groups with ≥ 2
sessions that no saved routine already covers are offered as "Your usual sessions" with
one-tap Start or Save as routine. Order = most recent session's order.

### Recap
`workoutRecap` = `recapFor` (all existing fields kept) + reps, hard sets, muscles worked,
calories estimate, typed records (e1RM / weight / reps), per-exercise change vs last time,
and up to 3 insights (weekly volume status, plateau or trend, load).

## Cross-feature effects when a workout ends

| Effect | How |
|---|---|
| Training statistics, recovery model, load | Derived from `workouts` in render; nothing extra stored |
| Energy + nutrition target | Existing: `exerciseByDay` → `dailyBudget` (dynamic mode moves today's target) |
| Coach | `coachingContext.training` gains `trainingSummary` (frequency, adherence, load, trends, plateaus, under-target muscles, last workout) |
| Habits | Existing: "Complete workout" auto-completes from `trainedToday` |
| Recap | Richer recap stored on the workout (`w.recap`, additive fields) |
| Double counting | Health strength sessions overlapping a Sprig workout are ignored for recovery, load and frequency; energy already dedupes |

## Data
No new storage keys and no migration: all new values are derived. `w.recap` gains optional
fields; older workouts without them render as before. Finished workouts now keep
`routineName` when started from a routine (it was dropped before, so "Repeat last workout"
never appeared). `sprig_rests_v1` may hold `null` for an exercise = automatic rest.

Also fixed: the Apple Health import treated a Sprig workout's `ts` as its start, but it is the
end time, so a Health strength workout recorded during the session wasn't recognised as a
duplicate on import.

## Performance
The app re-renders every second while a rest timer runs. Consistency, load, plateaus and
history templates are memoized in `App.jsx` (`trainingIQ`); `deloadAdvice` reuses them.
~11 ms per render for 300 workouts on desktop Node before memoizing.

## UI (no new popups or forms)
- Exercise card: predicted-set prefill, "3 × 80 kg × 8" plan line in the existing progression
  row, a collapsed "History" row (last sessions, records, trend), "auto" rest label.
- Training sub-tab: "Your usual sessions" from history.
- Recovery sub-tab: "Training insights" card (consistency, load, progress, plateaus) above the
  existing volume coach; recovery labelled "approximate".
- Recap sheet: calories estimate, muscles worked, vs last time, insights.
