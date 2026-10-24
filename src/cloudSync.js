// Versioned cloud backup (roadmap 0.2). Pure helpers — the network calls live in App.jsx.
//
// The cloud row has a revision (`rev`). A device remembers the revision it last pushed or
// restored and may only overwrite that exact revision (server: public.push_user_data). If
// another device has pushed since, the push is refused and the user chooses: restore the
// cloud copy, or keep this phone's data. Nothing is ever overwritten silently.

// Keys that never go into the cloud blob: full-size progress photos (device-only).
export const CLOUD_EXCLUDED_KEYS = ["sprig_progress_photos_v1"];

export const cloudRevKey = (userId) => `sprig_cloud_rev_${userId}`;

// What to do before an automatic push.
//   knownRev:        revision this device last pushed/restored for this user (null = never)
//   hadSyncedBefore: this device synced with an app version before revisions existed
//   cloud:           { exists, rev } from a metadata read of the user's row
// → { action: "push", expectedRev } | { action: "conflict" }
export function cloudPushPlan({ knownRev, hadSyncedBefore, cloud }) {
  if (!cloud || !cloud.exists) return { action: "push", expectedRev: 0 };   // first backup
  if (Number.isFinite(knownRev)) return { action: "push", expectedRev: knownRev }; // server re-checks
  // Upgrading from the old app on the device that owns a legacy (rev 0) backup: adopt it.
  if (hadSyncedBefore && (cloud.rev || 0) === 0) return { action: "push", expectedRev: 0 };
  // New device / reinstall / another device's data in the cloud: never overwrite automatically.
  return { action: "conflict" };
}

// Collect the blob from a { key: value } snapshot, without excluded keys.
export function cloudBlob(all) {
  const out = {};
  Object.keys(all || {}).forEach((k) => {
    if (k.startsWith("sprig_") && !CLOUD_EXCLUDED_KEYS.includes(k)) out[k] = all[k];
  });
  return out;
}
