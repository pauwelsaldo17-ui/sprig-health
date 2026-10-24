# Technical decisions

Read this when: about to change one of these foundations, or wondering "why is it done this way?". Add a dated entry when a new foundational decision is made. Each entry records what the code shows; reasons come from code comments or the original CLAUDE.md.

| # | Decision | Why / evidence | Consequence for changes |
|---|----------|----------------|-------------------------|
| 1 | **Local-first storage in IndexedDB** (`vitae-db`), localStorage as fallback, one-time copy from localStorage (`vitae_idb_v1`) | Replaced the earlier localStorage-only storage; comment in `App.jsx` storage block | All user data goes through `store`; never assume localStorage holds the truth |
| 2 | **Cloud backup is automatic but versioned** (2026-10-24, owner chose the roadmap's recommendation): one JSON blob per user in `sprig_user_data`, pushed 3 s after changes **only if the cloud copy is still the revision this device last saw** (`rev`, `push_user_data`, `src/cloudSync.js`). Otherwise sync pauses and the user chooses "Use cloud data" or "Keep this phone". Progress photos never go to the cloud. | Earlier automatic last-writer-wins upload could overwrite newer data from another device | Never overwrite the cloud without a matching revision or an explicit user choice; restore always needs user confirmation |
| 3 | **AI calls go through a server proxy** (`api/analyze.js`) that requires a Supabase session, allow-lists origins, builds the coach prompt itself and enforces quotas server-side (2026-10-24) | Keeps `ANTHROPIC_API_KEY` off the client and the endpoint from being an open proxy | No direct Anthropic calls from frontend code; no `VITE_` secrets; no free-form prompt modes; call it through `src/apiClient.js` |
| 4 | **Rule-based fallback coach** (`localCoachAnswer`) | AI-first, fallback on real network/API failure; don't trust `navigator.onLine` on iOS (comment in `askCoach`) | Keep the fallback path working when changing coach code |
| 5 | **"Sprig day" rolls at wake time, not midnight** (`getSprigDate`) | Late-night logs belong to the previous day (comment above `getSprigDate`) | Never use plain `new Date()` date strings for "today" in logging flows |
| 6 | **Sleep stored as real timestamps**, `date` = wake date | Cross-midnight schedules are normal | Use circular-time helpers (`tsToMin`, `circMean`, `circDiff`, `inWindow`) |
| 7 | **All top-level state in `SprigApp`**, screens via props | Original architecture | New persisted state gets a `persistX` in `App.jsx` |
| 8 | **Computation centralised in `vitaeCalc.js`** | Avoid divergent math across screens | Import, don't duplicate |
| 9 | **Inline styles + mutable theme singleton `C`** | `theme.js` header: components re-read `C` on render without a context | No CSS modules / Tailwind; use `C.*` tokens |
| 10 | **Overlays rendered via `Portal` to `document.body`** | Fixes clipped/grey overlays inside the app frame on iOS Safari (comment above `Portal`) | New sheets/modals/toasts go through `Portal` |
| 11 | **Free tier limits + RevenueCat premium** (5 coach questions, 10 scans per month) | Enforced on the server (`LIMITS` in `api/analyze.js`, `public.ai_usage`); the client counters (`FREE_COACH_LIMIT`, `FREE_SCAN_LIMIT`) only drive the UI. Premium is verified with RevenueCat when `REVENUECAT_SECRET_KEY` is set | Changes to limits are product decisions for the owner; keep client and server numbers equal |
| 12 | **Screens split out of `App.jsx`**; old monolith kept at `src/src/App.jsx` | Legacy copy, not imported | Never edit or import `src/src/App.jsx` |
| 13 | **Codemagic builds are manual** | No `triggering` block in `codemagic.yaml` | Pushing to `main` does not ship to TestFlight |
| 14 | **TestFlight iOS build is the reference product** (2026-10-21) | Vercel's web build can lag behind or fail | Verify on local source; native behaviour only on device (`docs/testing.md` → Native checklist) |
| 17 | **Derived training intelligence** (2026-10-24, `docs/training-intelligence.md`): recovery = accumulated residual fatigue (sets × RIR, sleep), never a fixed timer; plateau = no new best in 3+ weeks after earlier progress; deloads need ≥ 4 weeks of history and 2 signals; load = session RPE × minutes; all derived from logged sets | Recovery ignored repeat sessions; deloads fired after 3 flat sessions; accessories at steady load looked stalled | No new stored keys for analytics; keep math in `vitaeCalc.js` with tests; calories always labelled as estimates |
| 16 | **Honest alarms via AlarmKit** (2026-10-24, `docs/sleep-intelligence.md`): system alarms on iOS 26+, labeled backup notifications before that; the smart window only while Vitae is open. **Day boundary** follows the latest main sleep at any hour and, for learned day sleepers, past midnight | The old in-app alarm stopped when the phone locked; night shifts reset mid-shift | Never promise an alarm the OS won't ring; keep day-boundary logic in `sprigDateFor` with tests |
| 15 | **Deterministic, phone-only energy budget** (2026-10-24, `docs/energy-budget.md`): maintenance = Mifflin × activity level, shifted by real average steps/training and a slow weight-trend calibration; exercise is net kcal and counted once; dynamic days are damped and average to the stable target | Old logic double-counted exercise and dropped the budget every morning | Never add Apple Health active energy on top of the target; keep calculations in `vitaeCalc.js` with tests; AI only explains |

## Open questions (owner to decide)

- Account required when Supabase is configured (`AuthGate`) vs. the "works fully offline, cloud optional" requirement.
- Health permissions requested on launch vs. "only when the user enables health sync".
- Domain color constants that don't follow light mode; SleepTab purple `#8B5CF6` vs `#8B7CF7` elsewhere.
- Duplicate local `buzz()` functions in screens (web vibration only) vs. the native-haptics `buzz` in `App.jsx`.
