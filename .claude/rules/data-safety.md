---
paths:
  - "src/App.jsx"
  - "src/utils/**/*.js"
  - "src/*.js"
  - "src/hooks/**/*.js"
  - "api/**/*.js"
  - "tests/**/*.js"
---

# Sprig data-safety rules (auto-loaded for state, storage, sync and API files)

Full references: `docs/data-model.md` (keys, migrations, Supabase) and `docs/architecture.md` (storage layer, sync, day boundary).

- All user data goes through `store` (IndexedDB `vitae-db`). New keys: `sprig_<name>_v1`; persist via a `persistX` function.
- Never rename, wipe or reshape a stored key without a migration gated on `sprig_data_version_v1` / `DATA_VERSION`. Append or update logs by `id`.
- Dates: `toLocaleDateString("en-CA")` → `YYYY-MM-DD`. "Today" for logging comes from `getSprigDate` (rolls at wake time), not midnight.
- Sleep logs: Unix-ms `bedtime`/`waketime`; `date` = wake date. Use `tsToMin`, `circMean`, `circDiff`, `inWindow` for time math.
- `getSupabase()` can return `null`; handle it at every call site. Every Supabase query on user data filters by `user_id`.
- Secrets: `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` live only in serverless env. Never in `VITE_*`, frontend code, logs, docs or commits.
- Never log raw health values or auth tokens.
- Grep `vitaeCalc.js` for exports; don't read the whole 290 KB file.
