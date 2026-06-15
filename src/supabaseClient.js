// src/supabaseClient.js
//
// Lazy Supabase client. If VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY isn't set
// (e.g. for users running locally without Supabase configured, or older deploys),
// `getSupabase()` returns null and the rest of the app skips cloud features but
// keeps working off localStorage. This way adding accounts is fully additive.
//
// To enable accounts on Vercel:
//   1. Create a Supabase project at https://supabase.com
//   2. Vercel → Settings → Environment Variables, add:
//        VITE_SUPABASE_URL       = https://<project-ref>.supabase.co
//        VITE_SUPABASE_ANON_KEY  = <the anon/public key, NOT the service role key>
//      Both are safe to expose in frontend code.
//   3. Run the SQL from README.md ("Cloud sync schema") in Supabase → SQL Editor.
//   4. Redeploy.
//
// Anything sensitive (the service_role key) MUST NEVER appear here or in any
// VITE_* variable. VITE_* vars are bundled into the public JS.

import { createClient } from "@supabase/supabase-js";

let _client = null;
let _checked = false;

export function getSupabase() {
  if (_checked) return _client;
  _checked = true;
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      // Not configured — return null. The app keeps working off localStorage.
      console.info("[sprig] Supabase not configured (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY missing). Account features disabled.");
      return null;
    }
    _client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // sessionStorage keeps the session if the user closes the tab; storage key is namespaced.
        storageKey: "sprig.supabase.auth",
      },
    });
    return _client;
  } catch (e) {
    console.error("[sprig] Failed to init Supabase:", e?.message || e);
    return null;
  }
}

export function supabaseConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
