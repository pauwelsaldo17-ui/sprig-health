# Sprig / Vitae — CLAUDE.md

Authoritative guide for AI-assisted development on this codebase. Read before making any changes.

---

## What This App Is

**Sprig** (marketed as **Vitae**, bundle ID `com.pauwelsaldo.vitae`) is a personal health-tracking iOS/Android app built as a React SPA wrapped in Capacitor 8. It covers sleep, nutrition, training, body measurements, habits, and an AI coach. The design target is Apple-level polish — fast, minimal, direct, no noise.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + Vite 8 (JSX, no TypeScript) |
| Mobile shell | Capacitor 8 (iOS primary, Android secondary) |
| Icons | lucide-react 0.383 |
| Charts | Recharts 3 |
| Storage | IndexedDB via `idb` + localStorage fallback |
| Auth + sync | Supabase (`@supabase/supabase-js` 2) — optional, additive |
| Subscriptions | RevenueCat (`@revenuecat/purchases-js`) |
| Health data | HealthKit (`@perfood/capacitor-healthkit`) on iOS; Health Connect (`capacitor-health-connect`) on Android |
| Push | `@capacitor/push-notifications` |
| AI backend | Vercel serverless (`/api/analyze.js`) → Anthropic API |
| CI/CD | Codemagic → TestFlight |
| Web deploy | Vercel |

---

## Folder Structure

```
/
├── src/
│   ├── App.jsx              ← Main app shell; all top-level state lives here
│   ├── main.jsx             ← React entry point
│   ├── theme.js             ← Mutable theme singleton C + applyTheme()
│   ├── supabaseClient.js    ← Lazy Supabase client (returns null if unconfigured)
│   ├── healthService.js     ← HealthKit + Health Connect integration
│   ├── notifications.js     ← Push notification scheduling
│   ├── revenueCatClient.js  ← In-app purchases
│   ├── screens/
│   │   ├── TodayTab.jsx     ← Daily summary dashboard (~4100 lines) ← most-edited file
│   │   ├── NutritionTab.jsx ← Food logging + macro tracking
│   │   ├── SleepTab.jsx     ← Sleep logging + analysis
│   │   ├── TrainTab.jsx     ← Workout tracking
│   │   ├── BodyTab.jsx      ← Body measurements + progress photos
│   │   ├── HealthTab.jsx    ← Health metrics, recovery, blood markers
│   │   ├── MindTab.jsx      ← Habits + mindfulness
│   │   ├── CoachTab.jsx     ← AI coach chat
│   │   ├── TrendsTab.jsx    ← Data trends
│   │   ├── MeTab.jsx        ← Profile + settings
│   │   └── AuthScreen.jsx   ← Login / sign-up
│   ├── components/
│   │   ├── ui.jsx           ← Shared components: Ring, MacroBar, btn, Btn, Badge, etc.
│   │   └── QuickLogSheet.jsx ← Bottom sheet for quick daily log
│   ├── hooks/
│   │   └── useSupabaseAuth.js
│   └── utils/
│       └── vitaeCalc.js     ← All health computation (~291KB). Never edit lightly.
├── api/
│   ├── analyze.js           ← Vercel serverless: food photo/text → Anthropic API
│   └── delete-account.js    ← Account deletion endpoint
├── public/
├── ios/                     ← Capacitor iOS project (Xcode)
├── android/                 ← Capacitor Android project
├── index.html
├── vite.config.js
├── capacitor.config.json
├── codemagic.yaml           ← CI/CD: builds + uploads to TestFlight
└── package.json
```

> `src/src/App.jsx` (989KB) is a legacy file — do not edit it. The active file is `src/App.jsx`.

---

## Available Commands

```bash
npm run dev        # Vite dev server (localhost)
npm run build      # Production build → dist/
npm run preview    # Preview the dist/ build

npx cap sync ios   # Sync web build to Xcode after build
npx cap open ios   # Open Xcode
```

Codemagic handles the TestFlight build automatically on push to `main`. **You cannot trigger a Codemagic build from the terminal** — the user must log into codemagic.io to start one.

---

## Storage Layer (Critical — Never Break)

### Primary: IndexedDB (`vitae-db` v1) via `idb`
All reads/writes go through the `store` object in `App.jsx`. On first launch, existing `sprig_*` keys are migrated from localStorage automatically.

### Key Storage Entries
All keys are prefixed `sprig_`:

| Key | Contents |
|-----|----------|
| `sprig_profile_v1` | User profile, goals, units, theme |
| `sprig_log_{YYYY-MM-DD}` | Daily food/water/step log |
| `sprig_history_v1` | Historical daily summaries |
| `sprig_sleep_v1` | Sleep log array (timestamps, not midnight-anchored) |
| `sprig_alarm_v1` | Wake alarm settings |
| `sprig_workouts_v1` | Workout sessions |
| `sprig_routines_v1` | Saved workout routines |
| `sprig_meals_v1` | Custom food library |
| `sprig_favorite_meals_v1` | Pinned meals |
| `sprig_supps_v1` | Supplement list |
| `sprig_habits_v2` | Habit definitions + completions |
| `sprig_photos_v1` | Progress photo metadata |
| `sprig_tracking_preferences_v1` | Per-panel on/off toggles |
| `sprig_data_version_v1` | Migration version sentinel |

**CRITICAL: Never wipe or restructure stored data without a migration.** The user's logs are irreplaceable. Always write additive updates; use sentinel keys for one-time migrations.

### Supabase Sync
Optional cloud sync. `getSupabase()` returns `null` when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set — the app works fully offline in that case. Do not make cloud sync mandatory.

---

## Date Handling

- Date strings are always `YYYY-MM-DD` (`en-CA` locale: `new Date().toLocaleDateString("en-CA")`).
- **Sleep is never midnight-anchored.** Each sleep log stores real timestamps (`bedtime`/`waketime` as Unix ms). The `date` field is the wake date, not the bed date. Computations use `circMean`, `tsToMin`, etc. from `vitaeCalc.js` to handle cross-midnight schedules correctly.
- **Day boundaries follow the user's actual schedule.** Quick-log and nutrition logs reset based on the user's wake time, not at 00:00. When in doubt, look at how `getDailyTruth()` in `vitaeCalc.js` determines the active date.

---

## Theme System

`src/theme.js` exports a mutable singleton `C` (current colors). All components read `C.x` at render time. Call `applyTheme("dark"|"light")` to switch; it mutates `C` in-place.

```js
import { C } from "../theme.js";
// In JSX: style={{ color: C.ink, background: C.card }}
```

**Do not hardcode colors.** Always use `C.*` tokens.

### Domain Color Constants (defined per-screen, not in theme.js)

These are module-level constants in `TodayTab.jsx` and referenced across other screens:

```js
const SLEEP_CLR = "#8B7CF7";   // sleep / mind (purple)
const NUTR_CLR  = "#FB923C";   // nutrition / calories (orange)
const WATER_CLR = "#5B9BD5";   // water (blue)
const RECOV_CLR = "#4FC3F7";   // recovery / habits (light blue)
const SUPP_CLR  = "#52C878";   // supplements (green, same as C.greenSoft)
const MIND_CLR  = "#A78BFA";   // mindfulness (soft purple)
```

---

## CSS / Animation Classes

These are defined in `App.jsx`'s `FONTS` constant and injected as a `<style>` tag:

| Class | Behavior |
|-------|----------|
| `.sprig-tap` | Press feedback: scale(0.975) + brightness(1.08) at 120ms, GPU composited. Apply to **every** interactive element. |
| `.sprig-rise` | Entrance: fade + slide up 8px, 200ms |
| `.sprig-pop` | Entrance: scale from 0.96, 220ms |
| `.sprig-sheet` | Bottom sheet: slide up 18px, 260ms |
| `.sprig-dim` | Overlay: fade in, 200ms |
| `.sprig-cta` | CTA button: flex centered, DM Sans bold, no border |
| `.sprig-scroll` | Scroll area: momentum scrolling, hidden scrollbar |
| `.sprig-skeleton` | Loading shimmer animation |
| `.tab-enter` | Tab switch: fade + slide 5px, 200ms |

**Z-index scale:** content 1 → sticky headers 100 → nav 1000 → floating CTAs 1500 → rest timer 1600 → overlays/modals 3000 → toasts 4000.

---

## Haptics

```js
buzz("tap")      // 12ms — standard tap
buzz("light")    // 8ms  — subtle feedback
buzz("success")  // 10+60+20ms — completion double-pulse
buzz("medium")   // 18ms — heavier action
```

`buzz()` is a module-level function in `App.jsx`; it's imported into child components via props or accessed directly in the same file. Always add `buzz("tap")` to interactive elements.

---

## Coding Conventions

### JSX Style
- **Inline styles everywhere** — no CSS modules, no Tailwind utility classes. Only use `className` for animation classes (`.sprig-tap`, `.sprig-pop`, etc.) and the layout shell classes.
- `fontFamily: "DM Sans"` must be set on every `<button>` element (browsers default to system font).
- `textAlign: "left"` must be set on full-card `<button>` elements.
- `border: "none"` must be set on `<button>` elements that replace divs.

### Nested Buttons Rule
HTML forbids `<button>` inside `<button>`. When converting a `<div>` card to a `<button>`:
1. Remove any inner `<button>` elements.
2. Move their action to the outer button's `onClick`.
3. Replace the inner button visually with a `<ChevronRight>` affordance.

### State Management
- All top-level state lives in `App.jsx` (`SprigApp` component).
- Screens receive data and callbacks via props.
- Persist pattern: `persistFoo = async (next) => { setFoo(next); await store.set("sprig_foo_v1", JSON.stringify(next)); }`.

### Validation Rule (Before Every Push)
Always Babel-validate `TodayTab.jsx` before deploying:
```bash
node -e "var fs=require('fs'),p=require('@babel/parser');var s=fs.readFileSync('src/screens/TodayTab.jsx','utf8');try{p.parse(s,{sourceType:'module',plugins:['jsx']});console.log('BABEL OK');}catch(e){console.log('ERR',e.message,e.loc?.line);}"
```
Push only if result is `BABEL OK`.

### Date Format
Always `en-CA`: `new Date().toLocaleDateString("en-CA")` → `"YYYY-MM-DD"`.

---

## Security Rules (Non-Negotiable)

1. **`ANTHROPIC_API_KEY`** — Vercel env only. Never in `VITE_*`. Never in frontend code.
2. **Supabase service role key** — Must never appear in any `VITE_*` variable or frontend code. Only the **anon/public key** goes in `VITE_SUPABASE_ANON_KEY`.
3. **`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`** — safe to expose in browser bundle.
4. Auth uses **PKCE flow** via Supabase. Sessions persisted under `sprig.supabase.auth`.
5. All health data is user-specific. Never mix users' data. Cloud rows must be filtered by `user_id`.
6. Never log raw health values or auth tokens to the console in production.

---

## Product Requirements

These requirements must be respected in every code change:

### 1. Fast, Minimal, Apple-Like Interface
- Animations at 120ms for press, 200–260ms for entrances. Never slower.
- Use `cubic-bezier(.2,.8,.2,1)` (Apple spring easing) for all motion.
- No loading spinners for data the app already has. Show skeleton or nothing.
- Every tappable element gets `.sprig-tap` + `buzz("tap")`.

### 2. Minimal Manual Input
- Default to the most recently used values, smart defaults, and platform health data.
- Quick Log fills the day from one tap whenever possible.
- Apple HealthKit / Health Connect auto-syncs steps, weight, and sleep silently on launch.
- Nudge, don't demand — suggest actions, never block the user on mandatory fields.

### 3. AI Coach Is Direct and Context-Aware
- The `/api/analyze.js` function never exposes the API key to the client.
- The AI coach in `CoachTab.jsx` must use the user's actual logged data (sleep, training, nutrition, weight) as context — not generic advice.
- Coach answers must be concise and direct. No filler, no disclaimers, no repetition of the question.

### 4. Sleep and Day Tracking Follow the User's Schedule
- Sleep logs use timestamps, not date strings. The wake date is the `date` field.
- Never reset daily data at midnight. Use the user's actual wake time to determine the new day.
- Cross-midnight schedules (e.g., 1am bedtime) are the default use case, not an edge case.
- `circMean`, `tsToMin`, `inWindow` in `vitaeCalc.js` handle circular-time arithmetic correctly — use them.

### 5. Existing User Data Must Be Preserved
- Never change a storage key name without a migration sentinel.
- Never replace an array of logs; always append or update by ID.
- `sprig_data_version_v1` controls one-time migration runs.
- When removing a feature, keep its data in storage (hidden, not deleted).

### 6. Authentication and Health Data Must Be Secure
- User data in Supabase is row-level-secured by `user_id`.
- Health permissions are requested only when the user first enables health sync.
- The app works fully offline — cloud sync is an enhancement, not a dependency.
- `supabaseClient.js` returns `null` gracefully; all code must handle `null` from `getSupabase()`.

---

## Deployment Flow

```
Edit src/ → Babel validate → Python patch script (device_bash) →
git commit + push → Codemagic (user triggers in codemagic.io) → TestFlight
```

**Git push URL format:**
```
https://pauwelsaldo17-ui:{PAT}@github.com/pauwelsaldo17-ui/sprig-health.git main
```

**Git lock workaround** (Windows NTFS mount):
```bash
for f in .git/*.lock .git/objects/pack/*.lock; do [ -f "$f" ] && mv "$f" "${f}.stale" 2>/dev/null; done
```

**Commit attribution:**
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011VshEKwSaAfdo9QQ3Rf5nr
```

---

## vitaeCalc.js — Key Exports

`src/utils/vitaeCalc.js` (~291KB) is the computation engine. Key exports:

- `todayStr(d?)` — returns `YYYY-MM-DD` string
- `getDailyTruth({...})` — computes the authoritative "today's" data
- `dailyScores(...)` / `dailyHealthScore(...)` — health score calculations
- `sleepNeedMin(...)` / `scoreSleep(...)` / `sleepDebtMin(...)` — sleep analysis
- `muscleRecovery(...)` / `deloadAdvice(...)` — training recovery
- `nutritionCoach(...)` / `dietQuality(...)` / `dayTotals(...)` — nutrition
- `detectAchievements(...)` / `weeklyReport(...)` / `coachReport(...)` — insights
- `analyze(...)` / `analyzeText(...)` — calls `/api/analyze` (Anthropic)
- `estimateStages(...)` / `circMean(...)` / `tsToMin(...)` — sleep math
- `smartHydration(...)` / `waterGoal(...)` — hydration
- `plateauDetection(...)` / `patternDetection(...)` — trend analysis

**Do not duplicate logic from vitaeCalc.js in screen files.** Import and call the exported functions.
