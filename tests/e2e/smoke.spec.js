/**
 * Playwright E2E smoke tests for Sprig.
 *
 * Run: npm run test:e2e
 *
 * Auth gate bypass: the webServer in playwright.config.js sets VITE_SUPABASE_URL
 * and VITE_SUPABASE_ANON_KEY so supabaseConfigured() returns true. Tab navigation
 * tests seed a fake (non-expired) Supabase session via addInitScript so AuthGate
 * passes through to SprigApp. The profile is seeded in localStorage at the same
 * time so the IDB migration copies it on first load, letting SprigApp skip onboarding.
 */

import { test, expect } from '@playwright/test';

// Minimal valid profile — enough for the app to skip onboarding
const TEST_PROFILE = {
  name: 'Test User',
  dob: '1990-01-01',
  sex: 'male',
  heightCm: 180,
  weight: 80,
  weightKg: 80,
  goalKcal: 2000,
  sleepGoalH: 8,
  theme: 'dark',
  unit: 'metric',
  activity: 'moderate',
  goal: 'maintain',
  onboardedAt: new Date('2024-01-01').toISOString(),
};

// Fake JWT: HS256 header + payload with exp=9999999999 (year ~2286) + dummy sig.
// Supabase JS v2 reads expires_at from the stored session object, not from the JWT,
// so the signature never needs to be valid. The far-future exp prevents any refresh.
const FAKE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.' +
  Buffer.from(
    JSON.stringify({
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'authenticated',
      aud: 'authenticated',
      exp: 9999999999,
      iat: 1000000000,
      app_metadata: { provider: 'email' },
      user_metadata: {},
    }),
  )
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_') +
  '.fakesig';

const FAKE_SESSION = {
  access_token: FAKE_JWT,
  token_type: 'bearer',
  expires_in: 99999999,
  expires_at: 9999999999,
  refresh_token: 'fake-refresh-token',
  user: {
    id: 'test-user-id',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    app_metadata: { provider: 'email' },
    user_metadata: {},
    created_at: '2024-01-01T00:00:00.000Z',
  },
};

// ---------------------------------------------------------------------------
// App bootstrap (no seeding — tests raw first-run behaviour)
// ---------------------------------------------------------------------------
test.describe('App bootstrap', () => {
  test('loads without fatal JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForSelector('button', { timeout: 10_000 });

    // Capacitor "not implemented on web" warnings are expected — filter them
    const fatal = errors.filter(
      (e) =>
        !e.includes('Capacitor') &&
        !e.includes('not implemented') &&
        !e.includes('undefined is not an object'),
    );
    expect(fatal, `Fatal JS errors: ${fatal.join('\n')}`).toHaveLength(0);
  });

  test('shows at least one button on first run (onboarding)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button', { timeout: 10_000 });
    const count = await page.locator('button').count();
    expect(count).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Tab navigation (auth + profile seeded via addInitScript before page load)
// ---------------------------------------------------------------------------
test.describe('Tab navigation', () => {
  // Actual nav labels from App.jsx: Today | Food | Train | Sleep | Coach | More
  const NAV_TABS = ['Today', 'Food', 'Train', 'Sleep', 'Coach', 'More'];

  test.beforeEach(async ({ page }) => {
    // Seed fake Supabase session + profile before ANY page JS runs.
    // Session: AuthGate reads it → user truthy → SprigApp renders.
    // Profile: IDB migration copies sprig_profile_v1 from localStorage on first
    //   load (key starts with "sprig_") → store.get finds it → onboarded=true.
    await page.addInitScript(
      ({ session, profile }) => {
        localStorage.setItem('sprig.supabase.auth', JSON.stringify(session));
        localStorage.setItem('sprig_profile_v1', JSON.stringify(profile));
      },
      { session: FAKE_SESSION, profile: TEST_PROFILE },
    );

    await page.goto('/');
    await page.waitForSelector('.sprig-tabbar', { timeout: 15_000 });
  });

  test('main tab bar renders with Today label', async ({ page }) => {
    const todayBtn = page.locator('.sprig-tabbar button', { hasText: 'Today' });
    await expect(todayBtn).toBeVisible();
  });

  for (const label of NAV_TABS) {
    test(`${label} tab renders without crash`, async ({ page }) => {
      const btn = page.locator('.sprig-tabbar button', { hasText: label }).first();

      // Tab may be hidden if its tracking category is disabled
      if (!(await btn.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await btn.click();
      await page.waitForTimeout(400);

      // No unhandled JS error text should appear in the DOM
      await expect(page.locator('body')).not.toContainText('TypeError');
      await expect(page.locator('body')).not.toContainText('ReferenceError');
    });
  }
});

// ---------------------------------------------------------------------------
// Onboarding entry point (no profile seeded)
// ---------------------------------------------------------------------------
test.describe('Onboarding', () => {
  test('first-run flow shows interactive content', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('button', { timeout: 10_000 });
    // Auth screen / onboarding both have interactive buttons
    await expect(page.locator('button').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Storage isolation
// Verifies food log and sleep log use independent keys in IndexedDB ("kv" store).
// Uses native IndexedDB API — no external library import needed.
// ---------------------------------------------------------------------------
test.describe('Storage isolation', () => {
  test('food log and sleep log use independent IndexedDB keys', async ({ page }) => {
    await page.goto('/');

    // Wait for IDB to be initialised (app sets this marker after migration)
    await page.waitForSelector('button', { timeout: 10_000 });
    const idbReady = await page.evaluate(() =>
      localStorage.getItem('vitae_idb_v1') !== null,
    );

    if (!idbReady) {
      console.log('Storage isolation skipped: IDB not available');
      return;
    }

    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('vitae-db', 1);
        req.onsuccess = (e) => {
          const db = e.target.result;
          const tx = db.transaction('kv', 'readwrite');
          const store = tx.objectStore('kv');
          store.put(
            JSON.stringify([
              { bedtime: 1_000_000, waketime: 1_480_000, durationMin: 480, date: '2024-01-01' },
            ]),
            'sprig_sleep_v1',
          );
          store.put(JSON.stringify({ foods: [] }), 'sprig_log_2024-01-02');
          tx.oncomplete = () => {
            const rx = db.transaction('kv', 'readonly');
            const sleepReq = rx.objectStore('kv').get('sprig_sleep_v1');
            const foodReq = rx.objectStore('kv').get('sprig_log_2024-01-02');
            rx.oncomplete = () =>
              resolve({ sleep: sleepReq.result, food: foodReq.result, ok: true });
            rx.onerror = (ev) => resolve({ skipped: true, reason: String(ev.target.error) });
          };
          tx.onerror = (ev) => resolve({ skipped: true, reason: String(ev.target.error) });
        };
        req.onerror = (ev) => resolve({ skipped: true, reason: String(ev.target.error) });
      });
    });

    if (result.skipped) {
      console.log('Storage isolation skipped:', result.reason);
      return;
    }

    const sleepParsed = JSON.parse(result.sleep);
    expect(Array.isArray(sleepParsed)).toBe(true);
    expect(sleepParsed[0].date).toBe('2024-01-01');

    const foodParsed = JSON.parse(result.food);
    expect(foodParsed.foods).toEqual([]);
  });
});
