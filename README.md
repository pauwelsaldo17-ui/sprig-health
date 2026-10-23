# Sprig (Vitae)

Personal health tracker — sleep, nutrition, training, body, habits and an AI coach. React + Vite app wrapped in Capacitor for iOS (primary) and Android; web build on Vercel. Published as **Vitae** (`com.pauwelsaldo.vitae`).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright, port 5175)
```

Optional local env in `.env.local` (never commit it): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_REVENUECAT_WEB_KEY`. Server-only keys (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) belong in Vercel env vars only.

## Documentation

| Topic | File |
|-------|------|
| What the app must do | [docs/product-requirements.md](docs/product-requirements.md) |
| How it's built | [docs/architecture.md](docs/architecture.md) |
| Stored data, migrations, Supabase schema | [docs/data-model.md](docs/data-model.md) |
| Design system | [docs/ui-conventions.md](docs/ui-conventions.md) |
| Tests | [docs/testing.md](docs/testing.md) |
| Env vars, Vercel, Codemagic/TestFlight | [docs/deployment.md](docs/deployment.md) |
| Why things are the way they are | [docs/decisions.md](docs/decisions.md) |
| Working with Claude Code | [CLAUDE.md](CLAUDE.md), [docs/claude-workflow.md](docs/claude-workflow.md) |
