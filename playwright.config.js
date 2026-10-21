import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // --mode test tells Vite to load .env.test, which sets VITE_SUPABASE_URL and
    // VITE_SUPABASE_ANON_KEY so supabaseConfigured() returns true in the bundle.
    // Port 5175 avoids conflicts with the user's regular dev server on 5173/5174.
    command: 'npm run dev -- --mode test --port 5175',
    url: 'http://localhost:5175',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
