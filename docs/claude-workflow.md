# Claude workflow: agents, skills and review routing

Read this when: choosing a sub-agent or skill, or deciding which review to run before committing.

Project-level tools in this repo: the agents in `.claude/agents/`, the `playwright-cli` skill in `.claude/skills/`, the validation hook in `.claude/settings.local.json`, and the Supabase MCP server. The other skills below come from the owner's global Claude Code setup; if one isn't available in a session, skip it and work directly.

## Plan → implement → review → commit

1. **Plan** (multi-screen features or new storage keys): decide which keys are added or changed first (`docs/data-model.md`). Use `/feature-dev` to explore/architect, `/jmo:interview` if the ask is ambiguous.
2. **Implement**: smallest change that does the job. Keep `TodayTab.jsx` edits focused.
3. **Validate**: watch the `[validate]` output from the hook; run `npm run build`; run `npm test` when `vitaeCalc.js` changed. Run `npm run test:e2e` for UI changes. For native-touching changes, add the native checklist (`docs/testing.md`) to the handoff.
4. **Review**:
   - storage, dates, sync, auth, secrets → `sprig-qa-reviewer`
   - UI elements in screens/components → `sprig-ui-reviewer`
   - general bugs → `/code-review` (low/medium effort is usually enough); security → `/security-review`
5. **Commit** on a `feat/`, `fix/` or `chore/` branch. Builds to TestFlight are started manually by the owner.

## Tool table

| Task | Tool |
|------|------|
| Plan a non-trivial feature | `/feature-dev` |
| Understand an existing feature | `feature-dev:code-explorer` |
| Clarify requirements | `/jmo:interview` |
| Library docs (React, Supabase, Capacitor…) | Context7 MCP |
| Small targeted UI improvement | `/jmo:better-ui` |
| Visual design direction | `/frontend-design` |
| Simplify recently changed code | `/simplify` |
| Sprig data-safety review | `sprig-qa-reviewer` |
| Sprig UI-standards review | `sprig-ui-reviewer` |
| Browser automation / screenshots | `/playwright-cli` |
| Verify a web-layer change | Playwright on local dev server (`npm run test:e2e`, `/playwright-cli`) |
| Verify a native change | TestFlight native checklist in `docs/testing.md` (owner runs on device) |
| Supabase schema / data | `/supabase` (Supabase MCP) |
| Vercel deploys, env vars, logs | Vercel MCP tools |
