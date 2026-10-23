# Data model

Read this when: adding, renaming or reshaping any stored value, writing a migration, touching cloud sync / export / delete, or changing Supabase tables.

## Rules (non-negotiable)

1. User logs are irreplaceable. Never wipe, rename or restructure stored data without a migration.
2. New keys: `sprig_` prefix + version suffix (`_v1`, `_v2`…). Per-day keys use `sprig_<name>_YYYY-MM-DD`.
3. Read through `store.get` + `safeParse(raw, fallback, asArray|asObject)`; write through a `persistX` function that sets state, then `store.set(key, JSON.stringify(next))`.
4. Append or update log arrays by `id`; never replace the whole array with a fresh one.
5. One-time migrations: bump `DATA_VERSION` in `App.jsx` (currently `2`) and gate the migration on `sprig_data_version_v1`. A schema bump of a key (e.g. habits v1 → v2) keeps the old key in place.
6. Removed features keep their data (hidden in UI, not deleted).
7. Keys written straight to `localStorage` are not in IndexedDB, so `store.list("sprig_")` (used by cloud sync) won't see them when IndexedDB is available. Put user data in `store`, not raw localStorage.

## Where it lives

- **IndexedDB** `vitae-db` v1, object store `kv`, values are JSON strings. Accessed only via `store` in `App.jsx`.
- **localStorage**: fallback for `store`, plus the small flags listed below.
- **Supabase**: optional manual backup of all `sprig_*` keys (see bottom).

## Keys stored via `store` (user data)

| Key | Contents |
|-----|----------|
| `sprig_profile_v1` | Profile, goals, units, onboarding answers (`focusAreas`, `onboardedAt`) |
| `sprig_tracking_preferences_v1` | Per-category on/off toggles (`DEFAULT_TRACKING_PREFS` in vitaeCalc) |
| `sprig_data_version_v1` | Migration sentinel (`DATA_VERSION`) |
| `sprig_log_YYYY-MM-DD` | Food entries for that day |
| `sprig_daily_YYYY-MM-DD` | Daily counters (water, steps, etc.; `DEFAULT_DAILY`) |
| `sprig_supptaken_YYYY-MM-DD` | Supplements taken that day |
| `sprig_history_v1` | Daily calorie/macro summaries (last 14 days kept) |
| `sprig_meals_v1` | Custom food library |
| `sprig_favorite_meals_v1` | Favorite meals |
| `sprig_supps_v1` | Supplement list |
| `sprig_sleep_v1` | Sleep logs (shape below) |
| `sprig_alarm_v1` | Wake alarm settings |
| `sprig_workouts_v1` | Finished workout sessions |
| `sprig_active_workout_v1` | In-progress workout |
| `sprig_rests_v1` | Rest-timer data |
| `sprig_routines_v1` | Saved workout routines |
| `sprig_sport_sessions_v1` | Sport / cardio sessions |
| `sprig_weightseries_v1` | Weight series |
| `sprig_measure_v1` | Body measurements |
| `sprig_photos_v1` | Photo metadata (Body) |
| `sprig_progress_photos_v1` | Progress photos |
| `sprig_health_v1` | Health metrics / blood markers |
| `sprig_pain_v1` | Pain logs |
| `sprig_habitcfg_v1`, `sprig_habitdone_v1` | Habits v1 (kept for migration) |
| `sprig_habits_v2`, `sprig_habit_completions_v2` | Habits v2 definitions + completions |
| `sprig_focus_v1` | Focus sessions |
| `sprig_wins_v1` | Wins / PR records |
| `sprig_coach_notes_v1` | Saved coach Q&A (max 100) |
| `sprig_reminders_v1` | Reminder settings |
| `sprig_quick_day_logs_v1` | Quick Log entries |
| `sprig_day_status_v1` | Per-day status |
| `sprig_log_gap_snoozes_v1` | "Forgot to log" prompt snoozes |
| `sprig_theme_v1` | Theme (also mirrored in localStorage, read at boot) |

## Keys written directly to localStorage (device-only flags)

`vitae_idb_v1` (IDB migration done) · `sprig_theme_v1` · `sprig_health_connected` · `sprig_health_sync_ts` · `sprig_health_status_v1` (last Health sync summary, counts only) · `sprig_last_synced_at` · `sprig_first_login_prompted_<userId>` · `sprig_account_nudge_v1` · `sprig_account_nudge_snooze` · `sprig_coach_queries_YYYY-MM` · `sprig_ai_scans_YYYY-MM` (free-tier counters) · `sprig_seen_achievements_v1` · `sprig_rir_preference_v1` · `sprig_routine_v1`, `sprig_winddown_v1` (SleepTab wind-down) · `sprig.supabase.auth` (Supabase session).

**iOS App Group** `group.com.pauwelsaldo.vitae` (native `UserDefaults`, not in `store` or cloud backup): `sleep.lastNight` (asleep minutes + bed/wake, computed natively from Apple Health), `sleep.summary` (need, debt, notify flag pushed from JS), `sleep.notifiedWakeTs`. Derived data only; the source of truth stays in `sprig_sleep_v1`. Profile flag `sleepSummaryNotify` (default on) controls the morning notification.

## Shapes worth knowing

**Sleep log** (`sprig_sleep_v1` item):
```js
{ id, date /* wake date, YYYY-MM-DD */, bedtime /* Unix ms */, waketime /* Unix ms */,
  durationMin, score, restlessness, stages, source /* e.g. 'manual' */, timezone, ... }
```
Optional flags: `nap`, `ignoredFromScore`, `short`, `edited` (user changed times; Health sync won't overwrite), `stagesFromHealth`, `source_record_id`. Sources: `health_sync`, `manual`, `estimate` (from the alarm), `session`/`auto` (in-app tracker). Hidden-but-kept items stay in the same array with `discarded: true` and are filtered out at load: health logs the user deleted (pruned 30 days after wake) and estimates replaced by Health data (`supersededBy: <health log id>`, never pruned).
Dates are always `new Date(x).toLocaleDateString("en-CA")` → `YYYY-MM-DD`.

## Supabase

Tables used by the code: `sprig_user_data` (one row per user, `app_data` jsonb = all `sprig_*` keys) and `device_tokens` (push tokens). Every query filters by `user_id`.

Schema and row-level security for `sprig_user_data` (run in Supabase → SQL Editor):

```sql
create table if not exists public.sprig_user_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  app_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.sprig_user_data enable row level security;
create policy "users can read their own row"   on public.sprig_user_data for select using (auth.uid() = user_id);
create policy "users can insert their own row" on public.sprig_user_data for insert with check (auth.uid() = user_id);
create policy "users can update their own row" on public.sprig_user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete their own row" on public.sprig_user_data for delete using (auth.uid() = user_id);
```

The `device_tokens` schema is not in the repo; inspect it with the Supabase MCP / `/supabase` before changing it.
