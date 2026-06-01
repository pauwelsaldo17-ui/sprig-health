# Sprig

A free, single-file React health-tracking app — nutrition, training, sleep, recovery.

## Project shape

```
.
├── sprig.jsx               # The entire app — one React component
├── index.html              # Vite entry HTML, with viewport, manifest, theme-color, iOS PWA tags
├── api/
│   ├── analyze.js          # Vercel serverless function — proxies AI requests, holds the API key
│   └── ping.js             # Diagnostic route — JSON if api/ is deployed, 404 if not
├── public/
│   ├── manifest.json       # PWA manifest (name, theme, icons, display: standalone)
│   └── icon.svg            # App icon (see "Production icons" below)
├── src/
│   ├── main.jsx            # Mounts <Sprig /> into #root
│   └── supabaseClient.js   # Lazy Supabase client (optional cloud sync — see "Cloud sync")
├── package.json            # Vite + React 18 + lucide-react + @supabase/supabase-js
├── vite.config.js
└── vercel.json
```

## Local dev

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and Sprig should load. The dev server hot-reloads as you edit `sprig.jsx`.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel, import the repo. Vercel auto-detects Vite — no configuration needed.
3. Wait for the first build to finish.
4. Open the Vercel URL on your phone.
5. In Safari (iOS) or Chrome (Android), choose **Add to Home Screen**. Sprig will install as a standalone app.

## AI analysis setup (REQUIRED for Snap-food / Coach AI / label scan)

Sprig's AI features (photo food analysis, label scan, free-text meal description, supplement label, Ask the Coach) run through a serverless function at `api/analyze.js`. The Anthropic API key lives only on the server. **The frontend never sees it.**

Set up the key:

1. In the Vercel dashboard, open your Sprig project.
2. **Settings → Environment Variables**, add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your Anthropic key (starts with `sk-ant-...`)
   - **Environments:** Production (and Preview/Development if you want them too)
3. **Redeploy** — Vercel does not apply new env vars to the current build.

**Do not use `VITE_ANTHROPIC_API_KEY` or any name with the `VITE_` prefix** — anything `VITE_*` is bundled into the browser and would expose your key publicly.

If the env var is missing, the AI features fail gracefully:

- Snap food / label scan / text meal: shows *"AI analysis is unavailable. You can still add this manually."* and the manual entry form.
- Ask the Coach: falls back to the local rule-based coach which works without any network.
- Everything non-AI keeps working.

To test the proxy directly:

```bash
curl -X POST https://your-sprig.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"kind":"nutrition","mode":"text","text":"two scrambled eggs"}'
```

If it returns JSON with a `result` field, the proxy is working. If it returns `{"error":"ANTHROPIC_API_KEY is not configured on the server"}`, set the env var and redeploy.

## Troubleshooting: "AI proxy 404" in Ask Coach

If Ask Coach falls back to the offline message with `Debug: AI proxy 404`, your Vercel deployment is **not serving the `api/` folder**. The frontend is reaching Vercel fine, but `/api/analyze` doesn't exist on the deployed build.

Check, in order:

1. **Is `api/analyze.js` in your GitHub repo?** Open the repo on github.com and confirm the file is there at the root. If not, you need to `git add api/ && git commit && git push`.
2. **Visit `https://your-app.vercel.app/api/ping` in a browser.** If you get JSON like `{"ok":true,"route":"/api/ping",...}`, the api folder is deployed and the problem is specific to `/api/analyze`. If you get a 404, the api folder isn't being deployed at all (continue with steps 3–5).
3. **Vercel project's Root Directory.** Vercel dashboard → your project → Settings → General → "Root Directory". This should be empty or `.` (the repo root). If it's set to `src/` or another subfolder, Vercel won't see the `api/` folder.
4. **Check the latest build's "Functions" output.** Vercel dashboard → Deployments → click the latest → look for a "Functions" or "Serverless Functions" section. You should see `api/analyze` listed. If the section is empty, the api folder isn't being detected.
5. **Trigger a fresh deploy.** Sometimes Vercel caches the previous build's function manifest. From the dashboard, click on the latest deployment → ⋯ menu → "Redeploy", and **uncheck** "Use existing Build Cache."

The included `vercel.json` declares the build command and output directory, which helps Vercel pick up the project shape consistently. `api/ping.js` is a tiny diagnostic route — it returns JSON if the api folder is being served, and 404 if not.

## How storage works

Sprig uses a three-tier storage helper, top to bottom:

1. **`window.storage`** — used when running inside the Claude artifact runtime.
2. **`localStorage`** — used in every normal browser environment, including Vercel deployments, PWAs on iOS, and Add-to-Home-Screen on Android. **This is the tier that persists across refreshes, browser restarts, and app reopens.**
3. **In-memory** — last-resort fallback for SSR, tests, and private browsing where `localStorage` throws.

Any time a write fails (quota exceeded, localStorage disabled, etc.), an amber banner appears at the top of the app warning the user.

All storage keys use the prefix `sprig_*` and are listed in `Me → Data & privacy`.

## Test checklist

After making changes, run through this checklist:

### Local desktop

```bash
npm run dev
```

1. Complete onboarding (goal, sex, stats, activity, experience, focus).
2. On Today: log water, log steps, log weight, log cardio, log a drink, log a food entry.
3. **Refresh the page.** All data should still be there.
4. Close the tab, reopen `http://localhost:5173`. Data should still be there.
5. Open Me → Data & privacy. Confirm the "Storage in use" line reads **browser localStorage**.
6. Click **Export full backup (JSON)**. A `.json` file should download.
7. Click **Delete everything** → confirm. Onboarding should reappear.
8. Click **Import a backup** and pick the JSON file. Data should reappear after reload.

### Build + deploy

```bash
npm run build
```

Then push to GitHub and wait for the Vercel redeploy.

### On your phone

1. Open the Vercel URL in Safari (iOS) or Chrome (Android).
2. Tap **Share → Add to Home Screen**. Name it Sprig.
3. Open Sprig from the home screen — it should open full-screen without browser chrome.
4. The bottom tab bar should sit above the iOS home indicator (safe-area handled).
5. Log some data, force-quit the app, reopen — data should still be there.
6. Confirm there's no horizontal scrolling on any tab.

## Cloud sync with Supabase (optional)

Sprig now supports optional email/password accounts via Supabase. When a user signs in, they can manually push their `sprig_*` localStorage data into their account, and restore it on another device. **Cloud sync is fully additive** — if Supabase env vars aren't set, the Account section doesn't render and the app keeps working exactly as before off localStorage.

### Setup

1. Create a free Supabase project at https://supabase.com.
2. In Vercel → Settings → Environment Variables, add for Production + Preview:
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = the **anon** / public key (Settings → API → Project API keys)

   Both are safe to expose in the frontend bundle. **Never** put the `service_role` key in a `VITE_*` variable — anything `VITE_*` is bundled into public JS.
3. Run the SQL below in Supabase → SQL Editor.
4. Redeploy on Vercel.

### Cloud sync schema (run in Supabase → SQL Editor)

```sql
-- One row per user; app_data is the full sprig_* keyset as JSON.
create table if not exists public.sprig_user_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  app_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security so each user can only read/write their own row.
alter table public.sprig_user_data enable row level security;

create policy "users can read their own row"
  on public.sprig_user_data for select
  using (auth.uid() = user_id);

create policy "users can insert their own row"
  on public.sprig_user_data for insert
  with check (auth.uid() = user_id);

create policy "users can update their own row"
  on public.sprig_user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own row"
  on public.sprig_user_data for delete
  using (auth.uid() = user_id);
```

### How it works

- **Create account / log in** — happens in Me → Account, using Supabase email/password auth.
- **Sync now** — collects every `sprig_*` key from localStorage and upserts the JSON blob into `sprig_user_data` for the current user.
- **Restore from cloud** — fetches the user's row and writes every key back into localStorage, then reloads the app. Requires confirmation first.
- **First-login prompt** — once per account per device, after sign-in Sprig asks: *Upload this device, Restore cloud data, or Decide later*.
- **No automatic background sync.** Sync is manual on purpose; we don't want to silently overwrite either side. Automatic background sync can come later.
- **Offline** — when offline or not logged in, the app works exactly as it did before. Localstorage is always the source of truth on this device.

### Testing checklist

1. `npm install && npm run dev` — Account section appears in Me only if Supabase env vars are set in `.env.local`.
2. **Create account:** enter email + password, click Create account. (Supabase may send a confirmation email depending on project settings.)
3. **Sync data:** click Sync now. Sprig pushes your `sprig_*` keys to the cloud. Confirm via Supabase dashboard → Table Editor → `sprig_user_data` — there should be one row for your user.
4. **Refresh the page** — you stay logged in, data is unchanged.
5. **Log out** — back to anonymous state. Local data is still on this device.
6. **Log in again** — first-login prompt shouldn't appear (it's been seen for this user on this device). You can still tap Sync now or Restore.
7. **Restore data:** on a different browser or after clearing localStorage, log in, tap Restore from cloud, confirm. The app reloads with the cloud data.
8. **On phone:** install the Vercel-deployed PWA, log in, restore. You should see all your data from your other device.
9. **On another browser:** open the Vercel URL in a different browser, log in with the same credentials, restore. Same data should appear.

### Security notes

- Only the anon key is in the frontend bundle. RLS policies enforce that each user can only see their own row.
- Email confirmation is controlled in Supabase → Authentication → Providers → Email. For a quick test, you can disable email confirmation; for production, leave it on.
- Passwords are handled by Supabase. We never see them in the frontend after submission.

## Production icons

The included `public/icon.svg` is a stylized leaf used as the default app icon. Most modern browsers and iOS 16.4+ accept SVG manifest icons, but for the broadest device coverage you should also generate PNG variants:

- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `icon-512-maskable.png` (512×512, with safe area for adaptive icons)

Drop them into `public/` and add them to `manifest.json` alongside the SVG entry.

You can generate these from `icon.svg` using any image tool (Sketch, Figma, or `npx pwa-asset-generator public/icon.svg public/`).

## What persists, what doesn't

| Persists across refresh / reopen | Stays in this session only |
| -------------------------------- | -------------------------- |
| Profile, food entries, workouts, sleep logs, weight & measurements, supplements, habits, focus sessions, pain logs, health markers, progress photos, reminders | Active AI analysis in progress, timer rings, alarm playback |

If a user clears their browser data, uninstalls the PWA, or switches devices, Sprig data is **lost**. That's why the in-app warning explicitly tells users to export a backup regularly. There is no cloud sync — Sprig is local-first by design.
