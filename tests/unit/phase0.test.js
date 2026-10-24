/**
 * Roadmap Phase 0: versioned cloud sync plan + API URL resolution.
 * Run: npm test
 */
import { describe, test, expect } from 'vitest';
import { cloudPushPlan, cloudBlob, CLOUD_EXCLUDED_KEYS, cloudRevKey } from '../../src/cloudSync.js';
import { apiUrl } from '../../src/apiClient.js';

describe('cloudPushPlan — never overwrite another device silently', () => {
  test('no cloud row yet → first backup', () => {
    expect(cloudPushPlan({ knownRev: null, hadSyncedBefore: false, cloud: { exists: false } })).toEqual({ action: 'push', expectedRev: 0 });
  });

  test('this device knows the revision → push against it (the server re-checks)', () => {
    expect(cloudPushPlan({ knownRev: 7, hadSyncedBefore: true, cloud: { exists: true, rev: 7 } })).toEqual({ action: 'push', expectedRev: 7 });
    // even if the cloud moved on, the server refuses rev 7 and the app shows the conflict
    expect(cloudPushPlan({ knownRev: 7, hadSyncedBefore: true, cloud: { exists: true, rev: 9 } })).toEqual({ action: 'push', expectedRev: 7 });
  });

  test('upgrading on the device that made the legacy backup → adopt revision 0', () => {
    expect(cloudPushPlan({ knownRev: null, hadSyncedBefore: true, cloud: { exists: true, rev: 0 } })).toEqual({ action: 'push', expectedRev: 0 });
  });

  test('new phone or reinstall with a cloud backup → conflict, user decides', () => {
    expect(cloudPushPlan({ knownRev: null, hadSyncedBefore: false, cloud: { exists: true, rev: 0 } })).toEqual({ action: 'conflict' });
    expect(cloudPushPlan({ knownRev: null, hadSyncedBefore: true, cloud: { exists: true, rev: 4 } })).toEqual({ action: 'conflict' });
  });
});

describe('cloudBlob', () => {
  test('keeps sprig_* keys and leaves progress photos on the device', () => {
    const blob = cloudBlob({ sprig_sleep_v1: '[]', sprig_progress_photos_v1: '[{"dataUrl":"…"}]', other: 'x' });
    expect(blob).toEqual({ sprig_sleep_v1: '[]' });
    expect(CLOUD_EXCLUDED_KEYS).toContain('sprig_progress_photos_v1');
    expect(cloudRevKey('u1')).toBe('sprig_cloud_rev_u1');
  });
});

describe('apiUrl', () => {
  test('web build calls its own origin (relative path)', () => {
    expect(apiUrl('/api/analyze')).toBe('/api/analyze');
  });
});
