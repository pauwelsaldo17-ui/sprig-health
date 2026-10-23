# Product requirements

Read this when: planning a feature, changing a user-facing flow, writing coach/AI prompts, or deciding whether a change fits Sprig.

Sprig is marketed as **Vitae** (bundle ID `com.pauwelsaldo.vitae`): a personal health tracker for sleep, nutrition, training, body, habits/mind and an AI coach. The TestFlight iOS app is the product; Android is secondary. The Vercel web build is not a reference (see `docs/testing.md`). The design target is Apple-level polish: fast, minimal, direct, no noise.

## Vision (owner, 2026-10-21)

- **One app instead of many.** Combine the best of dedicated apps for sleep, nutrition, workouts and other movement/sports, recovery, habits and simple overall health.
- **One coach that sees everything.** The integrated AI coach knows the user's sleep, food, movement, recovery and the rest, and gives personalised advice from that combined picture.
- **About 20 minutes a day, everything tracked.** Automate as much as possible from data the phone already collects (HealthKit / Health Connect). Every manual step should be as short as possible.
- **Missed days don't break the rhythm.** People will forget or be too busy to log. Quick Log gives a rough picture of the day, and nothing in the app should punish or derail on gaps.
- **Fits anyone's rhythm.** The app adapts to each user's own schedule, especially sleep. No fixed day or routine is assumed.

Use these as the test for new work: does it reduce effort, feed the coach better context, survive missed days, or adapt to the user's schedule?

## The six requirements (owner-defined, apply to every change)

1. **Fast, minimal, Apple-like interface**
   - Press feedback 120 ms, entrances 200–260 ms, easing `cubic-bezier(.2,.8,.2,1)`.
   - No spinners for data the app already has; show a skeleton (`.sprig-skeleton`) or nothing.
   - Every tappable element gets `.sprig-tap` + `buzz("tap")`. Details: `docs/ui-conventions.md`.
2. **Minimal manual input**
   - Default to recently used values, smart defaults and platform health data.
   - Quick Log fills the day from one tap where possible.
   - HealthKit / Health Connect sync steps, energy, weight, sleep, heart rate and workouts on launch and when the app returns to the foreground.
   - Nudge, don't demand: never block the user on mandatory fields.
3. **AI coach is direct and context-aware**
   - The coach uses the user's actual logged data (sleep, training, nutrition, weight) as context, not generic advice.
   - Answers are concise: no filler, no disclaimers, no repeating the question.
   - The API key never reaches the client (`api/analyze.js` proxies the call).
4. **Sleep and day tracking follow the user's schedule**
   - Sleep logs store real timestamps; the `date` field is the wake date.
   - The day does not reset at midnight; it rolls at the user's wake time (see `getSprigDate` in `docs/architecture.md`).
   - Cross-midnight schedules (e.g. 1 am bedtime) are the default case, not an edge case.
5. **Existing user data must be preserved**
   - Never rename a storage key or replace a log array without a migration. Rules: `docs/data-model.md`.
   - When a feature is removed, keep its data in storage (hidden, not deleted).
6. **Authentication and health data are secure**
   - Supabase rows are row-level-secured by `user_id`.
   - Secrets stay server-side. Rules: `CLAUDE.md` → Security.

## Feature surface (as implemented)

**Bottom nav** (`App.jsx`, `ALL_NAV`): Today · Food · Train · Sleep · Coach · More. Tabs whose tracking category is switched off are hidden; with more than 5 visible, Coach is folded out of the bar.

**Other views** reached from More / cards (tab ids in `App.jsx`): `body`, `trends`, `health`, `mind`, `energy`, `meals`, `progress`, `me`, `targets`, `settings`.

| Area | Main file |
|------|-----------|
| Daily dashboard, check-ins, insight cards that open the coach with context | `src/screens/TodayTab.jsx` |
| Food logging, macros, meal library, favorites, AI meal scan | `src/screens/NutritionTab.jsx` |
| Workouts, routines, rest timer, PRs | `src/screens/TrainTab.jsx` |
| Sleep logs, alarm, wind-down routine | `src/screens/SleepTab.jsx` |
| Body measurements, progress photos | `src/screens/BodyTab.jsx` |
| Health metrics, recovery, blood markers | `src/screens/HealthTab.jsx` |
| Habits, mindfulness, focus sessions | `src/screens/MindTab.jsx` |
| AI coach chat | `src/screens/CoachTab.jsx` |
| Trends | `src/screens/TrendsTab.jsx` |
| Profile, targets, settings, account, cloud sync, health connection | `src/screens/MeTab.jsx` |
| Login / sign-up | `src/screens/AuthScreen.jsx` |
| Data export (GDPR), privacy policy, terms | `GDPRScreen.jsx`, `PrivacyScreen.jsx`, `TermsScreen.jsx` |
| Quick daily log sheet | `src/components/QuickLogSheet.jsx` |

**Onboarding** lives in `App.jsx` (shown until `onboarded`). Focus areas chosen there seed the per-category tracking toggles (`migrateTrackingPrefs` in `vitaeCalc.js`).

**AI features** (via `/api/analyze`): meal photo, nutrition label, free-text meal, supplement, supplement label, and coach questions. If the API is unavailable, food analysis falls back to manual entry and the coach falls back to `localCoachAnswer` (rule-based, offline).

**Free tier vs premium** (RevenueCat, `useSubscription` in `App.jsx`): non-premium users get `FREE_COACH_LIMIT = 5` AI coach questions and `FREE_SCAN_LIMIT = 10` AI scans per calendar month; hitting a limit opens `PaywallSheet`. If RevenueCat isn't configured, the user is treated as non-premium.

## Where the code currently differs from the requirements

Recorded so nobody "fixes" one side by accident. Ask the owner before changing either.

- **Offline / optional account:** when Supabase env vars are set, `AuthGate` in `App.jsx` requires sign-in before the app opens. The app only runs without an account in builds without Supabase configured.
- **Health permissions:** requirement says ask only when the user enables health sync; the initial-sync effect in `App.jsx` calls `requestHealthPermissions()` on launch when health is available.
