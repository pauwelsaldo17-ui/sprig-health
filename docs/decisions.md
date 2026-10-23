# Technical decisions

Read this when: about to change one of these foundations, or wondering "why is it done this way?". Add a dated entry when a new foundational decision is made. Each entry records what the code shows; reasons come from code comments or the original CLAUDE.md.

| # | Decision | Why / evidence | Consequence for changes |
|---|----------|----------------|-------------------------|
| 1 | **Local-first storage in IndexedDB** (`vitae-db`), localStorage as fallback, one-time copy from localStorage (`vitae_idb_v1`) | Replaced the earlier localStorage-only storage; comment in `App.jsx` storage block | All user data goes through `store`; never assume localStorage holds the truth |
| 2 | **Cloud is a manual backup, not live sync** (`syncToCloud` / `restoreFromCloud`, one JSON blob per user) | Avoid silently overwriting either side (original README) | Don't add background sync without an explicit decision; restore always needs user confirmation |
| 3 | **AI calls go through a server proxy** (`api/analyze.js`) | Keeps `ANTHROPIC_API_KEY` off the client | No direct Anthropic calls from frontend code; no `VITE_` secrets |
| 4 | **Rule-based fallback coach** (`localCoachAnswer`) | AI-first, fallback on real network/API failure; don't trust `navigator.onLine` on iOS (comment in `askCoach`) | Keep the fallback path working when changing coach code |
| 5 | **"Sprig day" rolls at wake time, not midnight** (`getSprigDate`) | Late-night logs belong to the previous day (comment above `getSprigDate`) | Never use plain `new Date()` date strings for "today" in logging flows |
| 6 | **Sleep stored as real timestamps**, `date` = wake date | Cross-midnight schedules are normal | Use circular-time helpers (`tsToMin`, `circMean`, `circDiff`, `inWindow`) |
| 7 | **All top-level state in `SprigApp`**, screens via props | Original architecture | New persisted state gets a `persistX` in `App.jsx` |
| 8 | **Computation centralised in `vitaeCalc.js`** | Avoid divergent math across screens | Import, don't duplicate |
| 9 | **Inline styles + mutable theme singleton `C`** | `theme.js` header: components re-read `C` on render without a context | No CSS modules / Tailwind; use `C.*` tokens |
| 10 | **Overlays rendered via `Portal` to `document.body`** | Fixes clipped/grey overlays inside the app frame on iOS Safari (comment above `Portal`) | New sheets/modals/toasts go through `Portal` |
| 11 | **Free tier limits + RevenueCat premium** (5 coach questions, 10 scans per month) | `FREE_COACH_LIMIT`, `FREE_SCAN_LIMIT`, `useSubscription` | Changes to limits are product decisions for the owner |
| 12 | **Screens split out of `App.jsx`**; old monolith kept at `src/src/App.jsx` | Legacy copy, not imported | Never edit or import `src/src/App.jsx` |
| 13 | **Codemagic builds are manual** | No `triggering` block in `codemagic.yaml` | Pushing to `main` does not ship to TestFlight |
| 14 | **TestFlight iOS build is the reference product** (2026-10-21) | Vercel's web build can lag behind or fail | Verify on local source; native behaviour only on device (`docs/testing.md` → Native checklist) |

## Open questions (owner to decide)

- Account required when Supabase is configured (`AuthGate`) vs. the "works fully offline, cloud optional" requirement.
- Health permissions requested on launch vs. "only when the user enables health sync".
- Domain color constants that don't follow light mode; SleepTab purple `#8B5CF6` vs `#8B7CF7` elsewhere.
- Duplicate local `buzz()` functions in screens (web vibration only) vs. the native-haptics `buzz` in `App.jsx`.
