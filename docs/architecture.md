# Architecture

Read this when: adding a screen or component, moving state, touching storage/sync/auth, the API routes, health or notification integrations, or anything that depends on "what day is it".

## Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + Vite 8, plain JSX (no TypeScript) |
| Mobile shell | Capacitor 8 — iOS primary (`ios/`), Android secondary (`android/`) |
| Icons / charts | lucide-react 0.383 / Recharts 3 |
| Local storage | IndexedDB (`idb`) with localStorage fallback |
| Auth + cloud backup | Supabase (`@supabase/supabase-js` 2), PKCE, deep link `com.pauwelsaldo.vitae://` |
| Subscriptions | RevenueCat (`@revenuecat/purchases-js`) |
| Health data | `@capgo/capacitor-health`: HealthKit (iOS) and Health Connect (Android) |
| Notifications | `@capacitor/local-notifications`, `@capacitor/push-notifications` |
| Haptics | `@capacitor/haptics`, Web Vibration API fallback |
| AI | Vercel serverless `api/analyze.js` → Anthropic Messages API |
| Web hosting | Vercel · iOS builds: Codemagic → TestFlight |

## Folder map

```
src/
  main.jsx               React entry
  App.jsx                App shell (~5.7k lines): AuthGate, SprigApp (all top-level state),
                         storage, onboarding, sheets/overlays, nav, cloud sync, paywall
  theme.js               Mutable theme singleton C + applyTheme()
  supabaseClient.js      Lazy client; getSupabase() returns null when unconfigured
  healthService.js       HealthKit / Health Connect: availability, permissions, syncHealthData()
  notifications.js       Local reminders (nutrition, wind-down, workout nudge)
  revenueCatClient.js    rcConfigured, hasPremium, getOfferings, purchasePackage
  hooks/useSupabaseAuth.js  Session + deep-link code exchange
  screens/*.jsx          One file per tab/view (TodayTab ~4.2k lines, most edited)
  components/ui.jsx      Shared UI primitives (Ring, MacroBar, Btn, Badge…)
  components/QuickLogSheet.jsx
  utils/vitaeCalc.js     All health computation (~290 KB, ~220 exports)
  src/App.jsx            LEGACY 989 KB copy — never edit, never import
api/
  analyze.js             AI proxy (nutrition photo/label/text/supplement, free-text coach)
  delete-account.js      Deletes auth user + rows (service-role key, JWT-verified)
scripts/validate-screens.js  Babel parse of src/screens/* (also run by the PostToolUse hook)
tests/unit, tests/e2e    Vitest / Playwright (see docs/testing.md)
```

Untracked clutter in the repo root (ignored by `.gitignore`, safe to ignore): `dist*/`, `patch*.py`, `*.png` screenshots, `.playwright-cli/`, `vite.config.js.timestamp-*`, stray files `cd` and `npm`.

## State flow

- All top-level state lives in `SprigApp` (`App.jsx`). Screens are mostly presentational and receive data + callbacks via props.
- Persist pattern: `const persistFoo = async (next) => { setFoo(next); await store.set("sprig_foo_v1", JSON.stringify(next)); };`
- On start, `SprigApp` loads every key via `store.get`, parses with `safeParse` + `asArray`/`asObject`, runs migrations (`migrateDaily`, `migrateHabitsV1toV2`, `migrateTrackingPrefs`…), then stamps `sprig_data_version_v1`.
- Computation belongs in `vitaeCalc.js`; screens import from it instead of re-implementing math.

## Storage layer

`store` in `App.jsx` wraps IndexedDB database `vitae-db` (version 1, object store `kv`). On first run it copies every `sprig_*` key from localStorage into IndexedDB and sets the `vitae_idb_v1` flag. If IndexedDB is unavailable, it falls back to localStorage. API: `get`, `set`, `remove`/`delete`, `list(prefix)`.

Some small flags bypass `store` and use localStorage directly (theme, nudges, counters). Full key list and rules: `docs/data-model.md`.

## Cloud backup (Supabase)

- `getSupabase()` returns `null` if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing; every call site must handle `null`.
- When configured, `AuthGate` shows `AuthScreen` until the user is signed in.
- Sync is **manual**: `syncToCloud()` uploads every `sprig_*` key from `store.list("sprig_")` as one JSON blob to `sprig_user_data` (one row per user); `restoreFromCloud()` writes the blob back through `store.set` after the user confirms. No background sync.
- Push tokens are upserted into `device_tokens`.
- `api/delete-account.js` deletes `sprig_user_data` and `device_tokens` rows and the auth user.
- The comment above `collectSprigLocalData` in `App.jsx` still says "localStorage"; the code uses `store` (IndexedDB).

## AI proxy (`api/analyze.js`)

- Request: `{ kind: "nutrition", mode: "photo|label|text|supplement|supp-label", text?, image? }` or `{ kind: "text", prompt, system? }`.
- Response: `{ result, raw? }` for nutrition, `{ text }` for text.
- Model is set in the file (`claude-sonnet-4-6` at the time of writing). Key: `ANTHROPIC_API_KEY` (Vercel env only).
- Client side: `analyze()` / `analyzeText()` in `vitaeCalc.js`. Coach falls back to `localCoachAnswer` on failure.

## Health sync

`healthService.js` exposes `isHealthAvailable`, `requestHealthPermissions`, `syncHealthData` (steps, active and basal energy 7 d; resting HR, HRV and workouts 14 d; weight 30 d; sleep since the last successful sleep read + 2 days via `sleepBackfillDays`: 14 d minimum, 120 d on first connect, 365 d max — so nights are never missed however long the app stays closed). `App.jsx` merges the result with `mergeHealthSleep`, `mergeHealthMetrics` and `sportSessionFromHealthWorkout` from `vitaeCalc.js`. `App.jsx` runs an initial sync once data has loaded and again on app foreground; `MeTab.jsx` has the manual connect button and the Sleep tab has "Sync now" (`syncHealthNow`, shown only where HealthKit/Health Connect exists). `applyHealthSync` merges sleep first and isolates each block (sleep, daily counters/workouts, heart metrics) in its own try, so one bad record type never blocks the rest. A Health night replaces an unedited app *estimate* for that night; the estimate stays in storage hidden (`discarded` + `supersededBy`). Last-sync info lives in localStorage: `sprig_health_sync_ts`, `sprig_health_connected`, and `sprig_health_status_v1` (counts only, never values: sleep samples read, nights/naps found, how many were kept as your own log).

The Sleep tab (`SleepTab.jsx`) is Rise-style with four sub-tabs: **Today** (sleep debt + energy now, the energy timetable, readiness), **Sleep debt** (`sleepDebtNights` 14-night chart, tonight's target from `recommend`, last night, recent nights with nap/ignore/delete), **Habits** (`sleepHabits`: light, caffeine, nap, training, meal, alcohol, dim lights, bed — timed to today's wake and bedtime) and **Alarm** (alarm, wind-down, morning routine, sounds).

## The "Sprig day" (date boundary)

`getSprigDate(now, latestSleepLog, mode)` in `App.jsx` decides which calendar day "today" is:

- `"after-wake"` (default): the day rolls at this morning's wake time if the latest main sleep log woke today between 03:00 and 11:00 and lasted ≥ 180 min; otherwise at 04:00.
- `"fixed-4am"`: always rolls at 04:00. `"midnight"`: plain calendar date.
- Anything before the boundary belongs to the previous day (a 01:30 drink counts for the night before).

Sleep math uses circular-time helpers from `vitaeCalc.js`: `tsToMin`, `circMean`, `circDiff`, `inWindow`. `getDailyTruth()` builds the authoritative "today" data object from the logs.

## vitaeCalc.js — where to look

Grep for exports instead of reading the file. Main groups:

- Dates/units: `todayStr`, `convW`, `convL`, `minToHM`, `hmToMin`
- Targets & nutrition: `computeTargets`, `dayTotals`, `nutritionCoach`, `dietQuality`, `missingNutrients`, `waterGoal`, `smartHydration`
- Sleep: `sleepNeedMin`, `scoreSleep`, `sleepDebtMin`, `estimateStages`, `smartWake`, `energyCurve`, `bestGymWindow`
- Training: `muscleRecovery`, `deloadAdvice`, `est1RM`, `detectPRs`, `suggestNext`, `volumeStatus`, `progressionFor`
- Habits: `getHabitStatus`, `computeHabitStreak`, `migrateHabitsV1toV2`
- Scores & insights: `dailyScores`, `dailyHealthScore`, `getDailyTruth`, `bestActions`, `coachReport`, `weeklyReport`, `detectAchievements`, `plateauDetection`, `patternDetection`
- AI: `analyze`, `analyzeText`, `localCoachAnswer`, `SCHEMA_PROMPT`
