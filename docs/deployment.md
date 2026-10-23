# Deployment and environment

Read this when: shipping a build, changing env vars, debugging the AI proxy on Vercel, or doing git operations on the Windows-mounted repo.

## Environments and variables

Names only. Never write values into the repo or docs.

| Variable | Where | Exposed to browser? |
|----------|-------|---------------------|
| `ANTHROPIC_API_KEY` | Vercel env (serverless only) | **No** — never prefix with `VITE_` |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env (`api/delete-account.js`) | **No** |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Vercel, Codemagic, `.env.local`, `.env.test` | Yes (anon key only) |
| `VITE_REVENUECAT_WEB_KEY` | build env | Yes (public SDK key) |

`.env*` files are gitignored except `.env.test` (test Supabase project, used by Playwright).

## Web (Vercel)

- Vercel builds the Vite app and serves `api/*.js` as serverless functions.
- The Vercel web build may be outdated or failing and is not the reference app. Use it only for `api/*` checks (the curl example below). Don't use it for UI verification.
- After changing env vars in Vercel, redeploy — new vars don't apply to the current build.
- Quick check of the AI proxy:
  ```bash
  curl -X POST https://<deployment>/api/analyze -H "Content-Type: application/json" \
    -d '{"kind":"nutrition","mode":"text","text":"two scrambled eggs"}'
  ```
  `{"error":"ANTHROPIC_API_KEY is not configured on the server"}` → set the var and redeploy. A 404 means the `api/` folder isn't deployed (check Vercel → Settings → Root Directory is the repo root).

## iOS (Codemagic → TestFlight)

- Workflow `ios-workflow` ("Vitae iOS") in `codemagic.yaml`: `npm install --legacy-peer-deps` → writes Supabase vars to `.env` → `npm run build` → `npx cap sync ios` → signing → build → upload to TestFlight.
- **No automatic trigger is configured.** The owner starts builds manually at codemagic.io. Claude cannot trigger them.
- The TestFlight build is the reference product. To find a build's source, open its Codemagic build page, which shows the branch and commit. The local `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` don't identify a build (`$BUILD_NUMBER` is set at build time).

## Local native

```bash
npm run build && npx cap sync ios   # copy web build into the Xcode project
npx cap open ios                    # open Xcode
```
Android: `npx cap sync android`. Bundle/app ID `com.pauwelsaldo.vitae`, app name "Vitae", `webDir: dist`.

## Git

- Branches: `feat/*`, `fix/*`, `chore/*`; PRs target `main`, squash-merge preferred.
- Never `--no-verify`.
- Never put a token in a remote URL, command or file. Use the system credential manager.
- Windows mount lock workaround (stale `.lock` files after an interrupted git command):
  ```bash
  for f in .git/*.lock .git/objects/pack/*.lock; do [ -f "$f" ] && mv "$f" "${f}.stale" 2>/dev/null; done
  ```
