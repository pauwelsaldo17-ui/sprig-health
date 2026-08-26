// /api/delete-account.js
// Vercel serverless function — deletes a user's Supabase account and all their data.
// Called server-side because user deletion requires the service-role key.
//
// Setup:
//   Vercel → Settings → Environment Variables → add:
//     SUPABASE_SERVICE_ROLE_KEY = <service-role key from Supabase → Settings → API>
//
// Security: verifies the caller is authenticated (valid JWT) before deleting.
// The userId in the body must match the JWT subject — you can't delete someone else.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("[delete-account] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  // Verify caller via their JWT (sent in Authorization header).
  const authHeader = req.headers.authorization || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) { res.status(401).json({ error: "Not authenticated" }); return; }

  const anonClient = createClient(
    SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
  );
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(jwt);
  if (authErr || !user) { res.status(401).json({ error: "Invalid session" }); return; }

  // Verify the userId in the body matches the authenticated user.
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  if (body?.userId && body.userId !== user.id) {
    res.status(403).json({ error: "User ID mismatch" });
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete app data first (RLS is off for service role — clean all rows).
  try {
    await admin.from("sprig_user_data").delete().eq("user_id", user.id);
    await admin.from("device_tokens").delete().eq("user_id", user.id);
  } catch (e) {
    console.warn("[delete-account] data cleanup partial failure:", e?.message);
    // Continue — still delete the auth account.
  }

  // Delete the auth account.
  const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    console.error("[delete-account] deleteUser failed:", deleteErr.message);
    res.status(500).json({ error: "Failed to delete account: " + deleteErr.message });
    return;
  }

  console.log("[delete-account] deleted user:", user.id);
  res.status(200).json({ ok: true });
}
