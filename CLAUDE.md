# Sprig / Vitae

Personal health tracker: sleep, nutrition, training, body, habits/mind and an AI coach. Marketed as **Vitae** (bundle ID `com.pauwelsaldo.vitae`). React SPA wrapped in Capacitor. **The TestFlight iOS app is the product.** Android is secondary. The Vercel deployment hosts `api/*` and a web build that may be outdated or failing. Never treat it as the reference version of the app.

## Product requirements — apply to every change

1. **Fast, minimal, Apple-like.** Press feedback 120 ms, entrances 200–260 ms, easing `cubic-bezier(.2,.8,.2,1)`. No spinners for data already in state — skeleton (`.sprig-skeleton`) or nothing. No visual noise.
2. **Minimal manual input.** Default to recent values and smart defaults; Quick Log fills the day in one tap; HealthKit / Health Connect fill steps, energy, weight, sleep, heart rate and workouts automatically. Nudge, never block on mandatory fields.
3. **AI coach is data-driven and direct.** Coach prompts include the user's actual logged sleep, training, nutrition and weight. Answers are concise: no filler, disclaimers, or restating the question. If the API fails, fall back to `localCoachAnswer` — never a dead end.
4. **Follow the user's real schedule.** "Today" rolls at the user's wake time (`getSprigDate` in `App.jsx`: after-wake default, 04:00 fallback), not midnight. Sleep logs store real timestamps; `date` is the wake date. Cross-midnight schedules are the normal case.
5. **Never lose user data.** No renaming, wiping or reshaping a stored key without a migration. Append/update logs by `id`. Removed features keep their data (hidden, not deleted).
6. **Secure auth and health data.** Secrets only server-side; Supabase rows scoped by `user_id` with RLS; never log tokens or raw health values.

Where the code currently diverges from these (account required when Supabase is configured; health permission asked at launch) is listed in `docs/decisions.md` → Open questions. Don't change either side without the owner.

## Stack and dependencies

| Area | Package / service |
|------|-------------------|
| UI | React 18, Vite 8 (Rolldown), plain JSX — no TypeScript |
| Native shell | Capacitor 8: app, browser, camera, haptics, local + push notifications |
| Health | `@capgo/capacitor-health`: HealthKit (iOS) and Health Connect (Android) through one plugin |
| Storage | `idb` → IndexedDB `vitae-db`, localStorage fallback |
| Auth / cloud backup | `@supabase/supabase-js` 2, PKCE, deep link `com.pauwelsaldo.vitae://` |
| Subscriptions | `@revenuecat/purchases-js` |
| Icons / charts | `lucide-react` 0.383, `recharts` 3 |
| AI | Vercel function `api/analyze.js` → Anthropic Messages API |
| Tests | Vitest 5, `@playwright/test` |
| CI / hosting | Codemagic → TestFlight (manual start, **reference build**) · Vercel (`api/` functions; its web build is not a reference) |

## Folders

```
src/App.jsx              Shell (~5.7k lines): AuthGate, SprigApp (all top-level state), `store`,
                         onboarding, sheets/overlays, nav, getSprigDate, cloud sync, paywall, global CSS
src/screens/             One file per tab/view. TodayTab.jsx (~4.2k lines) = most edited, most fragile
src/components/          ui.jsx (shared primitives), QuickLogSheet.jsx
src/utils/vitaeCalc.js   All health computation (~290 KB, ~220 exports) — grep exports, never read whole
src/theme.js             Mutable color singleton `C` + applyTheme()
src/supabaseClient.js    getSupabase() → client or null
src/healthService.js · notifications.js · revenueCatClient.js · hooks/useSupabaseAuth.js
src/src/App.jsx          LEGACY 989 KB copy — never edit, never import
api/                     analyze.js (AI proxy), delete-account.js (service-role, JWT-checked)
tests/unit, tests/e2e    Vitest, Playwright
scripts/validate-screens.js   Babel syntax check of src/screens/* + missing-import check
ios/, android/           Capacitor native projects
docs/                    Reference docs (see table at the bottom)
```
Root clutter (`dist*/`, `patch*.py`, `*.png`, `.playwright-cli/`, `vite.config.js.timestamp-*`) is gitignored — ignore it.

## Commands

```bash
npm run dev                        # Vite dev server (5173)
npm run build                      # production build → dist/; catches import errors in all files
node scripts/validate-screens.js   # syntax of src/screens/* + missing imports (also auto-runs after Edit/Write)
npm test                           # Vitest unit tests (tests/unit)
npm run test:e2e                   # Playwright E2E — port 5175, --mode test (.env.test)
npx cap sync ios && npx cap open ios   # after build, to run in Xcode
```
Before committing: validation hook clean + `npm run build` passes (+ `npm test` if `vitaeCalc.js` changed). ESLint exit code is not a gate (known `react-hooks/purity` errors in TodayTab).

## Testing and verification

1. **Know what you're testing.** Report `git rev-parse --short HEAD`, the branch and `git status`. To compare with the TestFlight build, get its commit from Codemagic (build page → branch + commit), or ask the owner. If they differ, say so; never assume they match.
2. **Browser tier.** Vitest plus Playwright run against the **local Vite dev server**: `npm run dev`, or `npm run test:e2e` on port 5175. Never test against the Vercel URL. This tier covers web-layer UI, state, storage and logic only.
3. **Native tier.** Playwright and the browser **do not** verify Apple Health, Health Connect, local or push notifications, alarms, haptics, camera, OAuth deep links or WKWebView/safe-area layout. For changes that touch these, list the real-device TestFlight checks from `docs/testing.md` → Native checklist, and mark them "not verified on device" until the owner confirms them.

## Architecture essentials

- **State:** all top-level state lives in `SprigApp` (`App.jsx`); screens receive data and callbacks via props.
- **Persist pattern:** `const persistFoo = async (next) => { setFoo(next); await store.set("sprig_foo_v1", JSON.stringify(next)); };` Read with `safeParse(raw, fallback, asArray|asObject)`.
- **Storage:** `store` (get/set/remove/list) wraps IndexedDB `vitae-db`/`kv`; all user data goes through it. Keys: `sprig_<name>_v1`, per-day `sprig_<name>_YYYY-MM-DD`. Migrations bump `DATA_VERSION` and are gated on `sprig_data_version_v1`.
- **Cloud:** optional. `getSupabase()` may return `null` — handle it everywhere. When configured, `AuthGate` requires sign-in. Sync is automatic but **versioned**: `syncToCloud` pushes all `sprig_*` keys (except progress photos) as one blob in `sprig_user_data` only when the cloud `rev` matches what this device last saw (`src/cloudSync.js`); otherwise it pauses and the user chooses. Restore needs user confirmation. Push tokens → `device_tokens`.
- **AI:** client calls `analyze()`/`analyzeCoach()` (vitaeCalc) → `src/apiClient.js` → `/api/analyze` (signed-in only; native builds use `https://sprig-health.vercel.app`). Free tier: 5 coach questions + 10 scans per month, enforced server-side, then `PaywallSheet` (RevenueCat premium lifts it).
- **Computation:** belongs in `vitaeCalc.js`; import it, don't duplicate math in screens. Circular time math: `tsToMin`, `circMean`, `circDiff`, `inWindow`.
- **Dates:** always `toLocaleDateString("en-CA")` → `YYYY-MM-DD`.

## Coding conventions

- **Surgical changes.** Touch only what the task needs: no unrelated refactors, renames, reformatting, or feature removal.
- **Inline styles only** (`style={{}}`); `className` only for global `.sprig-*` / `.vitae-*` / `.tab-enter` classes (defined in `FONTS` in `App.jsx`). No CSS modules, no Tailwind.
- **Colors from `C.*`** (`src/theme.js`); existing domain constants (`SLEEP_CLR`, `NUTR_CLR`…) are allowed, prefer `C.*` in new code.
- **Taps:** every interactive element gets `className="sprig-tap"` and `buzz("tap")` (use the `buzz` already in that file).
- **Buttons:** `fontFamily: "DM Sans"`; full-card buttons `textAlign: "left"`, `border: "none"`; never nest `<button>` in `<button>` — move the inner action to the outer `onClick` and show a `<ChevronRight>`.
- **Overlays** (sheets, modals, toasts) render through `Portal`; sheets with inputs use `useKeyboardInset()`.
- **Z-index for new code:** content 1 · sticky 100 · nav 1000 · floating CTA 1500 · rest timer 1600 · overlays 3000 · toasts 4000. Don't renumber existing values unless asked.

## Security (non-negotiable)

- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY`: Vercel env only — never `VITE_*`, frontend code, logs, docs or commits.
- Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_REVENUECAT_WEB_KEY` may reach the browser.
- Every Supabase user-data query filters by `user_id`; never mix users' data.
- Never print `.env*` contents; never put tokens in git remote URLs or commands.

## Git and release

- Branches `feat/*`, `fix/*`, `chore/*` → PR to `main`, squash-merge preferred. Never `--no-verify`.
- Codemagic builds are started manually by the owner at codemagic.io; Claude cannot trigger them. Pushing to `main` does not ship.
- Windows-mount git lock fix: `for f in .git/*.lock .git/objects/pack/*.lock; do [ -f "$f" ] && mv "$f" "${f}.stale"; done`

## Reference docs — read when relevant, not every session

| Read | When |
|------|------|
| `docs/product-requirements.md` | Planning features, changing user flows, coach/AI behavior, free tier |
| `docs/architecture.md` | New screens/state, storage, sync/auth, API routes, health, notifications, day boundary |
| `docs/data-model.md` | Any new/changed storage key, migration, export/sync, Supabase schema |
| `docs/ui-conventions.md` | Any visual change: tokens, classes, motion, haptics, z-index exceptions |
| `docs/testing.md` | Writing/running tests, browser verification, native (TestFlight) checklist |
| `docs/deployment.md` | Env vars, Vercel, Codemagic, native sync |
| `docs/decisions.md` | Before changing a foundation; log new foundational decisions there |
| `docs/claude-workflow.md` | Choosing agents/skills and which review to run |

`.claude/rules/ui.md` and `.claude/rules/data-safety.md` load automatically when matching files are opened. Reviewers: `sprig-qa-reviewer` (storage/dates/sync/secrets), `sprig-ui-reviewer` (UI standards). When a change makes a doc wrong, update the doc in the same change.

## Memory

This file and `docs/` are the shared, versioned source of truth. Claude Code's auto memory for this repo is machine-local (`%USERPROFILE%\.claude\projects\<repo>\memory\`, open with `/memory`); keep personal notes there and move anything the project depends on into `docs/`.
