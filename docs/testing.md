# Testing

Read this when: writing or running tests, verifying a change in the browser, or listing device checks for a native change.

The reference app is the TestFlight iOS build. Tests run on local source; the Vercel site is never a test target.

## Which source is under test

Before reporting any verification, state what was tested:

```bash
git rev-parse --short HEAD && git branch --show-current && git status --short
```

To compare with the current TestFlight build, open its Codemagic build page (Vitae iOS → build → branch + commit), or ask the owner for the commit. If HEAD, uncommitted files or the branch differ from that build, say so. The local `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` don't identify a build; Codemagic sets the build number at build time.

## Two tiers

| Tier | Tool | Covers | Does not cover |
|------|------|--------|----------------|
| Browser | Vitest, Playwright on local Vite | Pure logic, rendering, navigation, IndexedDB, web flows | Anything calling a Capacitor plugin. On web those calls are no-ops or take the `isNativePlatform() === false` path. |
| Native | TestFlight on a real iPhone (owner) | Plugins, permissions, background behaviour, haptics, layout in WKWebView | — |

A passing Playwright run never verifies native behaviour. Don't claim it does.

## Commands

```bash
node scripts/validate-screens.js   # syntax of src/screens/* + missing imports in screens, components, App.jsx (also runs after Edit/Write)
npm run build                      # catches bad imports / missing exports, and App.jsx + components syntax
npm test                           # Vitest unit tests (tests/unit/)
npm run test:watch                 # Vitest watch mode
npm run test:e2e                   # Playwright E2E (tests/e2e/)
npm run test:e2e:ui                # Playwright UI mode
```

`validate-screens.js` checks syntax for `src/screens/` only. Its missing-import check also covers `src/components/` and `src/App.jsx`: any capitalized name used as a JSX tag or value (an icon like `<Sparkles />`) must be imported or defined. `npm run build` does **not** catch this; a missing icon import builds fine and crashes the app at render. For changes in `App.jsx`, `components/` or `utils/`, run `npm run build` too.

ESLint is not a quality gate: `npx eslint src` reports pre-existing `react-hooks/purity` errors in `TodayTab.jsx`.

## Unit tests — Vitest

- Config: `vitest.config.js` (Node environment, `tests/unit/**/*.test.{js,jsx}`, globals on).
- Current file: `tests/unit/vitaeCalc.test.js` (24 tests).
- Target: pure functions in `src/utils/vitaeCalc.js`. Priorities: `todayStr`, `tsToMin`/`circMean` (cross-midnight), `dayTotals` (empty/null logs), `sleepDebtMin`, `waterGoal`, `scoreSleep`/`dailyScores` boundaries, `getDailyTruth` day boundary.
- Grep the export's signature before writing a test; don't read all of vitaeCalc.js.

## E2E — Playwright Test

- Config: `playwright.config.js` — Chromium, `baseURL http://localhost:5175`, starts `npm run dev -- --mode test --port 5175` (reuses a running server).
- `--mode test` loads `.env.test` (tracked), which sets the Supabase URL/anon key so the auth gate is active; the smoke tests seed a fake session and a minimal profile to skip login and onboarding.
- Current file: `tests/e2e/smoke.spec.js` (6 tests): tabs render, auth screen fields, Quick Log sheet, storage isolation.
- Port 5175 avoids clashing with a normal dev server on 5173/5174.

## Interactive browser checks

Use the project skill `/playwright-cli` (`.claude/skills/playwright-cli/`) for exploratory checks and screenshots, against the local dev server only (`npm run dev`, or the 5175 test server). Never against the Vercel URL. Screenshots and snapshots land in the repo root and `.playwright-cli/` (both gitignored).

## Not for unit tests

UI rendering (use E2E / playwright-cli), IndexedDB I/O, HealthKit / Health Connect (device only), `/api/analyze` (curl or Playwright request mocking).

## Native checklist (real device, TestFlight)

For a change that touches native behaviour, put the matching rows in the handoff and mark them "not verified on device" until the owner confirms them. Include only the rows the change touches.

- **Apple Health** (`healthService.js`): the permission prompt appears on enable; steps, energy, weight, sleep, resting HR, HRV and workouts come through (workouts the user deletes stay deleted after the next sync); denying permission doesn't break the app. Sleep tab: last night and naps arrive without manual logging, the Apple Health row shows the night count and "Sync now" works, a deleted synced night stays deleted, and an alarm estimate for a night is replaced once Health has that night.
- **Sleep widget + morning notification** (`ios/App/SleepWidget`, `SleepBackgroundSync.swift`): Codemagic signs both targets; the "Vitae Sleep" widget can be added to the Home and Lock Screen and shows last night after a night with **only the iPhone** (no watch) **without opening Vitae** (estimated nights show "~"); one "Last night: …" notification arrives after waking (Background App Refresh on) and none for older nights; turning off Sleep → Alarm → Morning sleep summary stops it.
- **Phone-only sleep** (`PhoneSleepEstimator.swift`, `phoneSleepNights`): the Motion & Fitness prompt appears with the Health prompt; after a night with the phone on the nightstand, the Sleep tab shows the night as "Phone" with plausible bed/wake times; denying Motion still estimates from steps; Apple Health time-in-bed (if on) replaces the estimate; an edited estimate is never overwritten.
- **Local notifications and alarms** (`notifications.js`, SleepTab and Me alarms): the permission prompt appears; a notification fires on time while the app is backgrounded and while the phone is locked; tapping it opens the right screen.
- **Push**: a token is registered in `device_tokens` for that user, and a test push is received.
- **Haptics**: felt on device via the `buzz` in `App.jsx`. Screen-local `buzz()` uses web vibration and does nothing on iOS.
- **Camera** (food scan): the permission prompt appears, a photo is captured, and the scan returns a result.
- **OAuth** (`@capacitor/browser`): sign-in returns to the app through `com.pauwelsaldo.vitae://`.
- **AI from the app** (`src/apiClient.js`): a food photo scan and a coach question get real AI answers (not the offline coach) on TestFlight; after the monthly limit the paywall opens.
- **Cloud sync** (`src/cloudSync.js`): sign in on a second device → "Sync paused" instead of overwriting; "Use cloud data" and "Keep this phone" both work; progress photos stay on each device.
- **Layout**: safe areas, keyboard inset on sheets, and Portal overlays, checked on a notched iPhone.
- **Android / Health Connect**: on an Android device, only when it's touched.
