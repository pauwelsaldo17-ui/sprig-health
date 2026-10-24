# Automation architecture and roadmap (phone-only)

Read this when: planning any new tracking, automation, AI or background feature, or deciding what to build next.

Status: **proposal for the owner, 2026-10-24.** Nothing here is implemented unless marked *exists*. Build it phase by phase; each phase keeps every working feature intact.

Goal (owner): the most convenient, comprehensive and intelligent **smartphone-only** health app. Maximum health insight, minimum effort. No wearables. Useful estimates over fake precision, always labelled. Missing data never breaks a day. Users control and can correct every automated change. Beautiful, minimal, fast. One coach that sees the whole picture.

---

## 1. What was audited

| | |
|---|---|
| Reference build | TestFlight **1.0 (50)**, Codemagic build #50, branch `feat/sleep-widget` @ `6077c36` (= `main` 169c752 + draft PR #7). PR #6 (`fix/sleep-backfill`) is **not** in this build. |
| Not a reference | The Vercel web build (only `api/*` matters there). |
| Size | `App.jsx` 5.8k lines, `TodayTab.jsx` 4.3k, `vitaeCalc.js` 5.2k lines / 239 exports, 14 screens. Production JS: one **2.2 MB** chunk + vendor chunks. |
| Tests | 69 Vitest unit tests (sleep, energy, debt, health merges, basics), 11 Playwright smoke tests. **No CI runs them**: PR checks are only the Vercel deploy and the Codemagic build. |

## 2. Audit findings

### 2.1 What exists and works (keep)

- **Nutrition**: AI photo / label / text / supplement analysis through `/api/analyze` → Claude; food library, favourites, meal shortcuts, micronutrients, diet quality, missing-nutrient hints, calorie/protein targets.
- **Training**: strength logging with sets/RIR, routines, templates, rest timer, e1RM, PRs, volume targets, stalls, deload advice, muscle recovery map; 40-sport library with METs and muscle impact; Quick Log training.
- **Sleep** (rebuilt this week): Rise-style Sleep tab (Today / Sleep debt / Habits / Alarm), two-process energy model, 14-night sleep debt, habit timetable, smart alarm, in-app sleep session, manual logs, naps.
- **Phone-only sleep** (PR #7): Apple Health iPhone "time in bed" first, else Vitae's motion+steps estimate (`phoneSleepNights`), morning notification + Lock/Home Screen widget via native background sync.
- **Apple Health** (`@capgo/capacitor-health`): steps, active/basal energy, weight, sleep, resting HR, HRV, workouts. Merges are additive, ranked, tombstoned (`mergeHealthSleep`, `mergeHealthMetrics`).
- **Habits v2** with auto-completion from data, **Mind** (focus sessions, check-in), **Body** (weight trend, measurements, progress photos), **Health** (blood markers, BP, pain, red-flag scan, interaction flags).
- **Day model with provenance**: `getDailyTruth()` already tags each category `exact | quick_log | unknown | disabled` with a confidence, and the coach is told not to invent numbers from estimates. This is the right foundation.
- **Coach**: structured context (profile, targets, today, 14-day averages, sleep, energy schedule, heart, training, recovery, habits, data quality), local rule-based fallback, free tier 5 questions / 10 scans per month.
- **Never lose data**: storage rules, migrations gated on `DATA_VERSION`, tombstones, undo.

### 2.2 Problems found (ordered by risk)

| # | Problem | Where | Risk |
|---|---------|-------|------|
| P1 | **`/api/analyze` is an open AI proxy.** No auth, `Access-Control-Allow-Origin` reflects any origin, `kind:"text"` accepts any `prompt` and `system`. Free-tier limits live only in the client (localStorage). Anyone can spend the Anthropic budget. | `api/analyze.js`, `App.jsx` (`FREE_COACH_LIMIT`, `FREE_SCAN_LIMIT`) | Cost, abuse |
| P2 | **Cloud "backup" is automatic last-writer-wins.** Docs say manual (decisions #2), but `App.jsx` uploads the whole `sprig_*` blob 3 s after any change. A second device, or a reinstall that hasn't restored yet, overwrites newer cloud data. | `App.jsx` auto-sync effect, `syncToCloud` | **Data loss across devices** |
| P3 | **Progress photos are full-size base64 inside that blob** (not resized; `reader.result`), up to 60, re-uploaded on every change. | `PhotoSheet`, `addProgressPhoto` | Battery, bandwidth, Supabase cost, sensitive images in a jsonb row |
| P4 | No tests in CI; Codemagic ships whatever builds. | `codemagic.yaml` | Regressions reach TestFlight |
| P5 | One 2.2 MB JS chunk; all derived data (energy curve, debt, recovery, insights) recomputed on every `SprigApp` render. | `vite.config.js`, `App.jsx` | Startup time, battery |
| P6 | Phone-only gaps: active energy usually doesn't exist without a watch (no fallback calc), resting HR/HRV/stages are watch-only, naps can't be detected. | `healthService.js` | Empty cards for phone-only users |
| P7 | Models are hard-coded `claude-sonnet-4-6` for every call, including simple extraction. No caching of identical requests. | `api/analyze.js` | Cost, latency |
| P8 | Remote push: App ID has Push Notifications **off** and no `aps-environment` entitlement, yet the app registers tokens. | Apple Developer, `App.entitlements` | Push silently never works |
| P9 | Health + Motion permissions are requested at launch (open question in `decisions.md`). | `App.jsx` initial sync | Prompt fatigue on first run |

## 3. What an iPhone alone can provide

| Source | Data | Phone-only? | Notes |
|---|---|---|---|
| Apple Health (iPhone) | Steps, walking + running distance, flights climbed | ✅ measured | Reliable when the phone is carried. |
| | Mobility: walking speed, step length, double-support %, asymmetry, **walking steadiness** | ✅ measured | Great long-term health signal, not used yet. |
| | Sleep "time in bed" | ✅ (needs Sleep Schedule + Track Time in Bed) | Phone-use based; read today. |
| | Active / resting energy | ❌ usually absent | **Calculate** from steps, pace, weight, BMR. |
| | Resting HR, HRV, SpO₂, sleep stages | ❌ watch only | Bonus when present, never required. |
| | Data from other apps: nutrition (MyFitnessPal…), workouts (Strava…), weight (smart scales), mindful minutes, cycle tracking, State of Mind | ✅ when user uses them | Import, never duplicate. |
| Core Motion | Activity history (walk/run/cycle/drive/still), ~7 days, readable without Vitae running | ✅ | Sleep estimate (exists), **workout detection**, sedentary streaks. |
| Camera | Food photos, nutrition labels (AI, exists); **barcodes** (missing); progress photos | ✅ | Barcode = free lookup, no AI call. |
| Calendar (EventKit, opt-in) | Busy blocks | ✅ | Schedule-aware energy/gym window. |
| Location (opt-in, coarse) | Time outdoors (daylight proxy), gym visits | ✅ | Privacy-heavy; later and opt-in only. |
| User in one tap | Confirm / correct, Quick Log, check-in mood | — | The confirmation layer. |
| Not available to apps | Phone-wide screen-use history, continuous sensors in background | — | Design around it. |

## 4. iOS background limits (design constraints)

- The web layer (React) is **suspended** in the background. Anything that must happen without opening the app is **Swift** and writes to the App Group.
- HealthKit background delivery: sleep `.immediate`, steps at most `.hourly`. Not guaranteed after a force-quit; needs Background App Refresh on.
- `BGAppRefreshTask`: a few short (~30 s) opportunistic runs per day. `BGProcessingTask`: when charging/idle.
- Core Motion and pedometer history can be **queried later**, so we compute after the fact instead of running sensors overnight (battery-friendly).
- Widgets only read prepared data. Interactive widgets (iOS 17 App Intents) can log quick actions without opening the app.

## 5. Automation opportunities

Mode: **Auto** = applied silently, labelled. **Estimate** = applied, labelled "estimated", one-tap fix. **Confirm** = proposed, needs a tap. Accuracy is a practical expectation, not a lab claim. Complexity: S < 1 day, M 1–3 days, L ~1 week, XL > 1 week.

| Opportunity | Exists | Improve / missing | Data | Accuracy & limits | Value | Cx | Mode |
|---|---|---|---|---|---|---|---|
| **Steps, distance, flights** | Steps ✅ | Distance + flights not read; no "moved today" trend card | Health | High when carried | Med | S | Auto |
| **Active energy (phone-only)** | Health value if present | **Calculate** from steps × stride × weight + pace, plus logged workouts | Health steps, profile | ±25% | High (calorie targets) | S | Estimate |
| **Sleep nights** | ✅ (PR #6, #7) | Device-verify; morning one-tap "Looks right / fix"; learn bedtime offset from user corrections | Health in-bed, Core Motion, steps | Wake ±15 min; bedtime runs early (phone put down) | Very high | M | Estimate → Confirm (one tap) |
| **Personal sleep need** | Age table | Learn from 14+ nights of free days (Rise-style) | Sleep history | Improves after ~2 weeks | High | M | Auto (shown, editable) |
| **Naps** | Manual | Can't detect reliably phone-only; offer "Did you nap?" when a still afternoon gap ≥ 20 min follows high debt | Core Motion | Low | Low | S | Confirm |
| **Workout detection** | Health workouts from other apps ✅ | Detect walk/run/cycle bouts ≥ 12 min from Core Motion; propose sport session with duration + estimated kcal | Core Motion, steps | Duration good; intensity estimated | High | M | Confirm |
| **Strength sessions** | Manual logging (rich) | Pre-fill next workout from routine + progression (exists in parts); auto-suggest at usual gym time | Workout history, energy model | n/a | Med | S | Confirm |
| **Sedentary nudges** | `sedentaryNote` | Native: long still daytime streak → gentle nudge (rate-limited) | Core Motion | Good | Med | M | Auto (opt-in) |
| **Nutrition from photos** | ✅ AI | Cheaper model, image hash cache, consistent downscale, portion confirmation chips | Camera, AI | ±20–30% kcal | Very high | M | Estimate → Confirm |
| **Barcode** | ❌ | Native barcode scan → Open Food Facts lookup, no AI call; AI only as fallback | Camera, OFF API | High for packaged food | High | M | Confirm |
| **Meal memory** | Library/favourites | Detect repeated meals at usual times → "Your usual breakfast?" one tap | Food history | High | Very high | S | Confirm |
| **Nutrition imports** | ❌ | Read dietary energy/macros other apps wrote to Health; dedupe by source | Health | As source | Med | S | Auto |
| **Hydration** | Manual + `smartHydration` | Count water from meals, weather/heat adjust, **interactive widget "+250 ml"** | Food, weather, widget | Estimate | Med | M | Auto/Estimate |
| **Weight** | Health ✅ | Trend smoothing exists; nudge weekly weigh-in only if no scale data | Health, manual | Measured | Med | S | Auto |
| **Mobility & steadiness** | ❌ | Read walking speed/steadiness; long-term trend + coach context | Health (iPhone) | Measured | Med (long-term health) | S | Auto |
| **Recovery / readiness** | ✅ (sleep, load, alcohol, pain) | Formal confidence; works phone-only; explain inputs | Day model | Directional | High | M | Auto (labelled) |
| **Energy schedule** | ✅ two-process | Calendar-aware gym window (opt-in) | Sleep, EventKit | Directional | Med | M | Auto |
| **Habits auto-complete** | ✅ partial | Extend to steps/sleep/meal/water automatically | Day model | As inputs | Med | S | Auto |
| **Day completeness** | Quick Log | Pre-fill Quick Log from all known data; never leave a day "useless" | Day model | — | High | S | Confirm |
| **Coach context** | ✅ large prompt | One cached "health picture" summary per day + weekly digest; fewer tokens | Day model | — | Very high | M | — |
| **Weekly AI review** | `weeklyReport` (rules) | One AI call per week, stored, reused by coach | Day model | — | High | M | Auto |
| **Mood / stress** | Check-in | One-tap emoji at evening summary; import State of Mind | Manual, Health | Self-report | Med | S | Confirm |
| **Daylight / outdoors** | ❌ | Opt-in coarse location time outdoors (later) | Location | Rough | Low–Med | L | Auto (opt-in) |
| **Cycle tracking** | ❌ | Read cycle data from Health to adjust energy/recovery copy | Health | As source | Med for some | S | Auto (opt-in) |

## 6. Unified automation architecture

```
 Sources (adapters)            Resolver (pure, vitaeCalc)           Day model            Uses
 ──────────────────           ─────────────────────────           ─────────            ────
 Apple Health  ─┐                                                  per Sprig day:
 Core Motion   ─┤  observations with   → rank + dedupe by id  →    metric =            Today / tabs
 Camera + AI   ─┤  source, method,       (own/confirmed >          { value, source,    Coach context
 Manual / QL   ─┤  confidence, ids       measured > calculated >     method,           Widget / notif
 Other apps    ─┘                        AI-estimated > default)     confidence }      Insights, habits
                                                                   + rollups (14 d)
 Native background (Swift):  HealthKit observers · BGAppRefresh · App Group snapshot · widgets · notifications
 AI (server):                authenticated, quota'd, cached, model per task
 Sync:                       per-key versioned merge, photos in private storage
```

**Principles**

1. **One record per real-world thing, with provenance.** Every stored item keeps `source`, `method` (`measured | calculated | estimated | confirmed`) and `confidence`. Additive optional fields on existing keys; no reshaping, so no migration risk. `mergeHealthSleep`'s ranking becomes the general rule for all synced data.
2. **Rank, don't overwrite.** User-entered or user-edited data always wins, then measured, then calculated, then AI estimates, then defaults. Lower-ranked items are superseded and kept hidden (`supersededBy`), never deleted. Deletions leave tombstones so automation never resurrects them.
3. **Compute once per day, not per render.** Derived day data (energy curve, debt, recovery, insights, coach summary) is memoized on its inputs and persisted as a small daily summary. That cuts CPU and battery and gives the coach and widget the same numbers.
4. **Native for background, JS for UI.** Background work only in Swift (observers, BGAppRefresh), writing compact snapshots to the App Group. JS reconciles when the app opens. Algorithms live in `vitaeCalc.js` with tests; a Swift port is allowed only for background-critical pieces (today: `phoneSleepNights`) and must share test vectors.
5. **AI as the last resort.** Rule-based and lookup first (barcode, meal memory, library). AI calls go through one authenticated endpoint with server-side quotas, an input-hash cache, and a model chosen per task (small/fast for extraction, larger for coaching).
6. **Ask little, ask once, ask in bulk.** One morning card ("Last night 7h 20m · Looks right / Fix") and one evening card (day summary + anything to confirm), plus notification actions. No scattered prompts. Every automation has an on/off in settings.
7. **Missing is a state, not an error.** Every metric can be `unknown`; scores adapt their weights and show confidence instead of failing (extends `getDailyTruth`).
8. **Privacy by default.** Health data stays on device unless cloud backup is on. Photos go to private storage or stay device-only. Never log values. Opt-in for location and calendar.

## 7. Roadmap

Each step lists **dependencies** and **acceptance criteria (AC)**. Earlier phases unblock later ones; inside a phase, steps can run in parallel unless a dependency says otherwise.

### Phase 0 — Safety and foundations (do first)

| Step | Depends on | Acceptance criteria |
|---|---|---|
| **0.1 Lock down `/api/analyze`**: require a Supabase JWT, allow only app origins, remove free-form `system`, cap payload size, enforce free-tier quota **server-side** (`ai_usage` table, RLS by `user_id`), log only kind/mode. | — | Request without token → 401. Free user's 6th coach question in a month → 402 from the server even with localStorage cleared. Photo scan, label scan, coach and local fallback still work in TestFlight. |
| **0.2 Make cloud sync safe**: version check before upload (refuse to overwrite a newer cloud copy from another device; ask the user), never auto-restore, exclude photos from the blob, resize photos on capture (≤ 1100 px JPEG). | — | Two-device test: older device can't overwrite newer cloud data. Blob ≤ 1 MB for a 3-month user. Existing photos still visible. No data lost on upgrade (migration only if a key changes). |
| **0.3 Ship the sleep work**: device-verify and merge PR #6 then PR #7. | 0.2 not required | Native checklist rows in `testing.md` pass on a phone-only iPhone (night appears without opening the app, widget + notification work). |
| **0.4 Tests gate builds**: run `validate-screens`, `npm test` and `npm run build` in a GitHub Action on every PR; Codemagic runs `npm test` before building. | — | A failing unit test blocks merge and the TestFlight build. |
| **0.5 Provenance everywhere**: standard `source / method / confidence` fields; one `<SourceBadge>` UI (Measured · Calculated · Estimated · Confirmed); `getDailyTruth` reads them. | 0.3 | Every Today metric shows its badge; unit tests for ranking; no stored key renamed. |
| **0.6 Push entitlement** (or remove token registration). | — | Either a test push arrives, or the app stops registering tokens. |

### Phase 1 — Phone-only core automation

| Step | Depends on | AC |
|---|---|---|
| **1.1 Morning confirm** card + notification actions "Looks right / Fix" for estimated nights; corrections tune a personal bedtime offset. | 0.3, 0.5 | One tap confirms (`method: confirmed`); after 5 corrections the estimate error drops (tracked in a test vector). |
| **1.2 Phone-only energy burn**: calculated active energy when Health has none. | 0.5 | Phone-only user sees "≈ 420 kcal · Calculated"; Watch users keep measured values. |
| **1.3 Background scheduler**: `BGAppRefreshTask` morning + evening, evening summary notification, bedtime nudge from the energy model. | 0.3 | Runs without opening the app; ≤ 2 notifications/day; respects toggles; no measurable battery drain in Settings › Battery after a week. |
| **1.4 Workout detection** from Core Motion bouts → proposed sessions. | 0.5, 1.3 | A 20-min walk/run appears as a suggestion with duration/kcal; accepting adds a sport session; dismissing never re-suggests. |
| **1.5 Learned sleep need** (Rise-style) replacing the age table once 14+ nights exist. | 0.3 | Need shown with "learned from your sleep"; debt and targets use it; user can override. |
| **1.6 Mobility + distance + flights** imported and trended. | 0.5 | Walking speed/steadiness trend visible in Health tab; coach context includes it. |

### Phase 2 — Nutrition with almost no effort

| Step | Depends on | AC |
|---|---|---|
| **2.1 Barcode scan** (native) + Open Food Facts; AI only if not found. | 0.1 | Packaged item logged in ≤ 2 taps, no AI call (verified in server logs). |
| **2.2 Meal memory**: "Your usual breakfast?" at the usual time. | 0.5 | Repeated meal appears as a one-tap suggestion after 3 repeats; never auto-logged. |
| **2.3 Cheaper, cached photo analysis**: per-task model, image-hash cache, portion chips. | 0.1 | Same photo twice → one AI call; median scan latency lower; accuracy unchanged on a 20-photo sample. |
| **2.4 Health nutrition import** (other apps) with dedupe. | 0.5 | MyFitnessPal entries appear once, labelled with their source. |
| **2.5 Hydration**: water from meals, heat adjustment, interactive widget "+250 ml". | 0.3 | Water logged from the Home Screen without opening the app. |

### Phase 3 — Intelligence

| Step | Depends on | AC |
|---|---|---|
| **3.1 Daily health-picture summary** (memoized, persisted) used by Today, coach, widget. | 0.5 | Coach prompt tokens −40% for the same answer quality; all three surfaces show identical numbers. |
| **3.2 Weekly AI review**: 1 call/week, stored, referenced by the coach. | 0.1, 3.1 | Exactly one call per user-week; visible in Trends. |
| **3.3 Recovery with confidence**, phone-only inputs. | 3.1 | Score + "based on: sleep (estimated), training (logged)…"; works with zero Health data. |
| **3.4 Calendar-aware energy schedule** (opt-in). | 3.1 | Gym window avoids busy blocks; off by default. |

### Phase 4 — Speed, control, polish

| Step | Depends on | AC |
|---|---|---|
| **4.1 Performance**: lazy-load tabs, memoize derived data, split vendor chunks. | 3.1 helps | Initial JS ≤ 800 KB; cold start on iPhone measured before/after; no feature removed. |
| **4.2 Automation settings + review inbox**: every automation toggleable; one list of recent automatic changes with undo. | 0.5 | Turning off an automation stops it; any automatic change can be undone. |
| **4.3 Interactive widgets / Live Activity** (rest timer, quick log). | 2.5 | Rest timer visible on Lock Screen. |

### Later / opt-in

Time outdoors (coarse location), cycle-aware recovery, State of Mind, Siri / Shortcuts ("log water"), Android parity via Health Connect.

## 8. Decisions needed from the owner

1. **Cloud sync model** (0.2): keep automatic upload with a version check (recommended), or go back to manual backup as `decisions.md` says?
2. **Photos**: device-only (simplest, most private), or private Supabase Storage for multi-device?
3. **Permissions timing** (P9): keep asking Health + Motion at launch, or ask during onboarding with a one-screen explanation (recommended)?
4. **AI budget**: server-side free tier stays 5 coach questions + 10 scans per month?
5. **Push**: enable remote push (Phase 0.6) or drop it until there's a use?

## 9. Out of scope / non-goals

Lab-grade accuracy claims, diagnosis, any wearable requirement, continuous background sensing, selling or sharing health data.
