// Calls to Sprig's own server functions (Vercel `api/*`).
// Inside the native app the page origin is capacitor://localhost, so a relative "/api/..."
// never reaches Vercel: native builds use the production API host instead.
// Every call carries the user's Supabase session — /api/analyze rejects anonymous requests.
import { Capacitor } from "@capacitor/core";
import { getSupabase } from "./supabaseClient.js";

const PROD_API = "https://sprig-health.vercel.app";

export function apiUrl(path) {
  const override = import.meta.env?.VITE_API_BASE;
  if (override) return override.replace(/\/$/, "") + path;
  let native = false;
  try { native = Capacitor.isNativePlatform(); } catch (_) { native = false; }
  return native ? PROD_API + path : path;
}

// Error carrying the HTTP status so callers can tell "quota reached" (402) from "offline".
export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function authHeader() {
  const sb = getSupabase();
  if (!sb) return {};
  try {
    const { data } = await sb.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (_) { return {}; }
}

// POST JSON to /api/analyze; resolves to the parsed JSON body or throws ApiError.
export async function postAnalyze(body) {
  let resp;
  try {
    resp = await fetch(apiUrl("/api/analyze"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ApiError(0, "Network error: " + (e?.message || e));
  }
  const text = await resp.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }
  if (!resp.ok) throw new ApiError(resp.status, "AI proxy " + resp.status + (data?.error ? ": " + data.error : ""), data);
  if (!data) throw new ApiError(resp.status, "AI proxy returned non-JSON response");
  return data;
}
