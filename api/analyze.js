// /api/analyze.js
//
// Vercel serverless function. The Sprig app POSTs here and we forward the request to the
// Anthropic Messages API using the ANTHROPIC_API_KEY env var. The app never sees the key.
//
// Security (roadmap 0.1):
//   • Callers must send a valid Supabase session: `Authorization: Bearer <access token>`.
//   • Browser origins are allow-listed (the iOS/Android app and our own web deployments).
//   • Free-tier limits are enforced here, per user and month, in Postgres (public.ai_usage via
//     consume_ai_quota / refund_ai_quota). Premium is verified with RevenueCat when
//     REVENUECAT_SECRET_KEY is set (app user ID = Supabase user ID).
//   • There is no free-form prompt/system mode any more: the coach prompt is built here.
//   • Logs carry kind/mode/sizes only, never health data or tokens.
//
// Env (Vercel): ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_URL (or SUPABASE_URL),
//   VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY), optional REVENUECAT_SECRET_KEY,
//   optional EXTRA_ALLOWED_ORIGINS (comma-separated).
//
// Request bodies:
//   { kind: "nutrition", mode: "photo|label|text|supplement|supp-label", text?, image?: { media, data }, refine? }
//   { mode: "nutrition", description }                      → food items from a description
//   { kind: "coach", question, context, localTime: "HH:MM" } → { text }
// Errors: 401 no/invalid session · 403 origin · 402 { error: "quota", kind, limit } · 4xx/5xx otherwise.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MODEL = "claude-sonnet-4-6";

// Monthly limits per kind. Free numbers match the app's paywall (5 coach questions, 10 scans);
// food_text covers text descriptions and photo refinements; premium caps only stop abuse.
const LIMITS = {
  free: { coach: 5, scan: 10, food_text: 60 },
  premium: { coach: 300, scan: 300, food_text: 600 },
};
const MAX_IMAGE_CHARS = 2_500_000;   // ~1.8 MB JPEG as base64 (app sends ≤1100 px)
const MAX_TEXT = 4000;
const MAX_QUESTION = 1000;
const MAX_CONTEXT = 30000;

// Capacitor app origins + local dev + our Vercel deployments.
const ORIGIN_PATTERNS = [
  /^capacitor:\/\/localhost$/,
  /^ionic:\/\/localhost$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/sprig-health\.vercel\.app$/,
  /^https:\/\/sprig-health-[a-z0-9-]+-aldo-s-projects13\.vercel\.app$/,
];
function originAllowed(origin) {
  if (!origin) return true; // non-browser callers still need a valid session
  const extra = (process.env.EXTRA_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return extra.includes(origin) || ORIGIN_PATTERNS.some((re) => re.test(origin));
}

// JSON schema we want the model to return for nutrition analysis.
const SCHEMA_PROMPT = `Return ONLY a JSON object with this exact shape, no commentary, no markdown:
{
  "name": string (short label, e.g. "Greek yogurt with banana"),
  "serving": string (e.g. "1 bowl (~250g)"),
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "micros": {
    "vit_a_pct": number, "vit_c_pct": number, "vit_d_pct": number, "vit_e_pct": number,
    "vit_k_pct": number, "vit_b1_pct": number, "vit_b2_pct": number, "vit_b3_pct": number,
    "vit_b6_pct": number, "vit_b9_pct": number, "vit_b12_pct": number,
    "calcium_pct": number, "iron_pct": number, "magnesium_pct": number, "zinc_pct": number,
    "potassium_pct": number, "sodium_pct": number, "selenium_pct": number, "iodine_pct": number
  },
  "omega3": "low" | "med" | "high" | null
}
All percent values are integer percent of an average adult daily value (0–500). Use 0 if unknown.`;

function instructionFor(mode, text) {
  if (mode === "supp-label") {
    return "Read this dietary SUPPLEMENT label (vitamins/minerals/protein/omega/etc). Use the per-serving 'Supplement Facts' values. For each nutrient, convert the listed amount into integer percent of an average adult daily value. Set macros (calories/protein/carbs/fat) to the values on the label, usually near 0 unless it's protein/meal powder. " + SCHEMA_PROMPT;
  }
  if (mode === "supplement") {
    return `This is a dietary SUPPLEMENT the user takes: "${text || ""}". Estimate the nutrients ONE serving/dose contributes, converting each into integer percent of an average adult daily value. Macros are usually ~0 unless it's a protein or meal-replacement powder. ` + SCHEMA_PROMPT;
  }
  if (mode === "label") {
    return "Read the nutrition label / packaged product in this image. Use the per-serving values printed if visible. " + SCHEMA_PROMPT;
  }
  if (mode === "photo") {
    return "Identify the food in this photo and estimate the nutrition of the visible portion." + (text ? ` The user adds: "${text}".` : "") + " " + SCHEMA_PROMPT;
  }
  // default: free-text meal description
  return `Estimate the nutrition of this meal described by the user: "${text || ""}". ` + SCHEMA_PROMPT;
}

// The coach system prompt lives on the server so callers can't repurpose the endpoint.
function coachSystem(localTime) {
  const t = /^\d{2}:\d{2}$/.test(localTime || "") ? localTime : null;
  const hour = t ? Number(t.slice(0, 2)) : null;
  const period = hour == null ? null : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `You are Vitae Coach, an elite evidence-based coach inside a phone-only health app (no wearables). Answer the user's question directly. Use the user's data only when relevant. Do not give a full audit unless asked. Do not use canned templates. Think like a real coach reviewing a client's data. Never invent exact numbers for anything marked quick_log, unknown, estimated or disabled — speak in estimates for those. Do not diagnose injuries or medical conditions; for sharp pain, swelling, suspected injury, or any serious/worsening symptom, recommend rest and seeing a doctor or physiotherapist instead of guessing a cause. Only answer health, fitness, nutrition, sleep, recovery and habit questions; politely decline anything else.` +
    (t ? ` Current local time: ${t} (${period}). Do NOT flag today's calories or protein as insufficient if the current time is before 14:00 — the user may not have eaten all meals yet. If before 14:00, base nutrition assessment on projected daily intake (current intake ÷ fraction of day elapsed × 24) rather than raw totals.` : "");
}

// Extract a JSON object from a potentially noisy model response.
function extractJSON(raw) {
  const s = String(raw || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (_) { return null; }
}

// Strip the data:image/...;base64, prefix if present, leaving raw base64.
function cleanBase64(data) {
  if (typeof data !== "string") return "";
  const i = data.indexOf("base64,");
  return i === -1 ? data : data.slice(i + 7);
}

async function isPremium(userId) {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return false;
  try {
    const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return false;
    const ent = (await r.json())?.subscriber?.entitlements?.premium;
    return !!ent && (!ent.expires_date || Date.parse(ent.expires_date) > Date.now());
  } catch (_) { return false; }
}

// Returns { ok: true, refund } or { ok: false, status, body }.
async function consumeQuota(admin, userId, kind) {
  const tier = (await isPremium(userId)) ? "premium" : "free";
  const limit = LIMITS[tier][kind];
  const { data, error } = await admin.rpc("consume_ai_quota", { p_user: userId, p_kind: kind, p_limit: limit });
  if (error) {
    // Quota migration not applied yet: keep the session + origin checks, but say so in the logs.
    if (error.code === "PGRST202" || error.code === "42883") {
      console.warn("[api/analyze] quota functions missing — run supabase/migrations/*_ai_usage_quota.sql");
      return { ok: true, refund: async () => {} };
    }
    console.error("[api/analyze] quota check failed:", error.code || error.message);
    return { ok: false, status: 503, body: { error: "Quota check unavailable" } };
  }
  if (data == null) return { ok: false, status: 402, body: { error: "quota", kind, limit, tier } };
  return { ok: true, refund: async () => { await admin.rpc("refund_ai_quota", { p_user: userId, p_kind: kind }).catch(() => {}); } };
}

async function callAnthropic(apiKey, payload) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify(payload),
  });
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && originAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (!originAllowed(origin)) { res.status(403).json({ error: "Origin not allowed" }); return; }
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !SUPABASE_URL || !SERVICE_KEY) {
    console.error("[api/analyze] server not configured (Anthropic/Supabase env missing)");
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  // ── Session check (Supabase JWT) ──
  const jwt = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) { res.status(401).json({ error: "Not authenticated" }); return; }
  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: authData, error: authErr } = await anon.auth.getUser(jwt);
  const user = authData?.user;
  if (authErr || !user) { res.status(401).json({ error: "Invalid session" }); return; }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};

  // ── Food items from a description (food search "AI log") ──
  if (body.mode === "nutrition" && typeof body.description === "string") {
    const description = body.description.slice(0, MAX_TEXT);
    if (!description.trim()) { res.status(400).json({ error: "Missing description" }); return; }
    const quota = await consumeQuota(admin, user.id, "food_text");
    if (!quota.ok) { res.status(quota.status).json(quota.body); return; }
    console.log("[api/analyze][nutrition-items] description=" + description.length + " bytes");
    let upstream;
    try {
      upstream = await callAnthropic(apiKey, {
        model: MODEL,
        max_tokens: 1500,
        system: "You are a precise nutrition extraction assistant. Given a plain-language description of food eaten, return a JSON array of food items with estimated nutritional values. Be specific about amounts. Use standard nutritional databases for estimates. Return ONLY valid JSON, no explanation.",
        messages: [{
          role: "user",
          content: [{
            type: "text",
            text: `Extract food items from this description and return a JSON array:\n\n"${description}"\n\nReturn ONLY a JSON array in this exact format, no markdown, no explanation:\n[{"name": "food name", "amount": "2 large", "calories": 182, "protein": 12, "carbs": 2, "fat": 14, "fiber": 0}, ...]`,
          }],
        }],
      });
    } catch (e) {
      await quota.refund();
      console.error("[api/analyze] nutrition-items: upstream connection failed");
      res.status(502).json({ error: "Upstream connection failed" });
      return;
    }
    if (!upstream.ok) {
      await quota.refund();
      console.error("[api/analyze] nutrition-items: Anthropic " + upstream.status);
      res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: "AI request failed" });
      return;
    }
    let itemsData;
    try { itemsData = await upstream.json(); } catch (_) { res.status(502).json({ error: "Bad upstream response" }); return; }
    const rawItems = (itemsData.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n");
    const s = String(rawItems || "").replace(/```json/gi, "").replace(/```/g, "").trim();
    const a = s.indexOf("["), b2 = s.lastIndexOf("]");
    let items = [];
    if (a !== -1 && b2 !== -1) { try { items = JSON.parse(s.slice(a, b2 + 1)); } catch (_) { items = []; } }
    res.status(200).json({ items });
    return;
  }

  // The old free-form text mode is gone; the coach has its own kind.
  if (body.kind === "text") { res.status(410).json({ error: "Use kind 'coach'" }); return; }

  let payload, quotaKind;
  if (body.kind === "coach") {
    const question = String(body.question || "").slice(0, MAX_QUESTION).trim();
    if (!question) { res.status(400).json({ error: "Missing question" }); return; }
    let context = "";
    try { context = JSON.stringify(body.context ?? null); } catch (_) { context = "null"; }
    if (context.length > MAX_CONTEXT) { res.status(413).json({ error: "Context too large" }); return; }
    quotaKind = "coach";
    console.log("[api/analyze][coach] question=" + question.length + " bytes, context=" + context.length + " bytes");
    payload = {
      model: MODEL,
      max_tokens: 1000,
      system: coachSystem(body.localTime),
      messages: [{
        role: "user",
        content: [{
          type: "text",
          text: `User question: "${question}"\n\nUser data (structured): ${context}\n\nAnswer the question. Use the data only where it actually helps. If todayWins exist and it feels natural, you may briefly acknowledge real progress ("kudos") before the main advice — but only when relevant, and never force it.`,
        }],
      }],
    };
  } else {
    const mode = String(body.mode || "text");
    if (!["photo", "label", "text", "supplement", "supp-label"].includes(mode)) { res.status(400).json({ error: "Unknown mode" }); return; }
    const text = typeof body.text === "string" ? body.text.slice(0, MAX_TEXT) : "";
    const image = body.image && typeof body.image === "object" ? body.image : null;
    const content = [];
    if (image && image.data) {
      const media = String(image.media || "image/jpeg");
      if (!/^image\/(jpeg|png|webp|gif)$/i.test(media)) { res.status(400).json({ error: "Unsupported image media type" }); return; }
      const data = cleanBase64(image.data);
      if (data.length > MAX_IMAGE_CHARS) { res.status(413).json({ error: "Image too large" }); return; }
      content.push({ type: "image", source: { type: "base64", media_type: media, data } });
    }
    if (!content.length && !text.trim()) { res.status(400).json({ error: "Missing image or text" }); return; }
    content.push({ type: "text", text: instructionFor(mode, text) });
    quotaKind = image && image.data && !body.refine ? "scan" : "food_text";
    console.log("[api/analyze][nutrition] mode=" + mode + ", hasImage=" + !!image + ", refine=" + !!body.refine);
    payload = {
      model: MODEL,
      max_tokens: 1000,
      system: "You are a precise nutrition estimation engine for a food-logging app. Always answer with the requested JSON only.",
      messages: [{ role: "user", content }],
    };
  }

  const quota = await consumeQuota(admin, user.id, quotaKind);
  if (!quota.ok) { res.status(quota.status).json(quota.body); return; }

  let upstream;
  try {
    upstream = await callAnthropic(apiKey, payload);
  } catch (e) {
    await quota.refund();
    console.error("[api/analyze] upstream connection failed (" + quotaKind + ")");
    res.status(502).json({ error: "Upstream connection failed" });
    return;
  }
  if (!upstream.ok) {
    await quota.refund();
    // Surface a short status code only — don't leak Anthropic's error body.
    console.error("[api/analyze] Anthropic " + upstream.status + " (" + quotaKind + ")");
    res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: "AI request failed" });
    return;
  }

  let data;
  try { data = await upstream.json(); } catch (_) {
    await quota.refund();
    res.status(502).json({ error: "Bad upstream response" });
    return;
  }
  const raw = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n");

  if (body.kind === "coach") {
    if (!raw) console.warn("[api/analyze] empty coach response");
    res.status(200).json({ text: raw });
    return;
  }
  // nutrition: parse JSON server-side so the app doesn't have to.
  const result = extractJSON(raw);
  if (!result) {
    console.error("[api/analyze] malformed nutrition JSON from model");
    res.status(502).json({ error: "AI returned malformed nutrition JSON" });
    return;
  }
  res.status(200).json({ result });
}
