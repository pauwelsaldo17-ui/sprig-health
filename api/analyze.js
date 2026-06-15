// /api/analyze.js
//
// Vercel serverless function. The Sprig frontend POSTs here and we forward the
// request to the Anthropic Messages API using the ANTHROPIC_API_KEY env var.
// The frontend NEVER sees the API key.
//
// Setup (one-time, before deploying):
//   1. In the Vercel dashboard, open your Sprig project.
//   2. Settings → Environment Variables → add:
//        Name:  ANTHROPIC_API_KEY
//        Value: sk-ant-...   (your real Anthropic API key)
//        Environments: Production, Preview, Development (whichever you want)
//   3. Redeploy. Vercel will inject this into the serverless runtime only —
//      the value is never sent to the browser.
//
// Request body shape (from the frontend):
//   { kind: "nutrition", mode: "photo|label|text|supplement|supp-label",
//     text?: string, image?: { media: string, data: string (base64) } }
//   { kind: "text", prompt: string, system?: string }
//
// Response shape:
//   nutrition → { result: <parsed JSON>, raw?: <string> }
//   text      → { text: <string> }
//
// Anything goes wrong → 4xx/5xx with a short message in the body. The frontend
// shows a friendly fallback and lets the user log manually.

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
    return "Identify the food in this photo and estimate the nutrition of the visible portion. " + SCHEMA_PROMPT;
  }
  // default: free-text meal description
  return `Estimate the nutrition of this meal described by the user: "${text || ""}". ` + SCHEMA_PROMPT;
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

export default async function handler(req, res) {
  // CORS — same-origin in production, but allow OPTIONS preflight just in case.
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Don't leak details, but help the developer notice the missing env var.
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured on the server" });
    return;
  }

  // Vercel parses JSON automatically for serverless functions, but be defensive.
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  body = body || {};

  const kind = body.kind === "text" ? "text" : "nutrition";

  // Per spec: one clear log line per request, tagged by kind, easy to grep in Vercel function logs.
  if (kind === "text") {
    console.log("[api/analyze][text] request");
  } else {
    console.log("[api/analyze][nutrition] request");
  }

  // Build the messages payload depending on the kind.
  let payload;
  if (kind === "text") {
    const prompt = String(body.prompt || "").slice(0, 8000);
    const system = String(body.system || "You are Sprig Coach, a helpful general coach inside a health app. Answer the user's question directly. Use the user's data only when it actually helps. Keep replies clear, evidence-based, and practical. No medical advice.");
    if (!prompt) {
      console.error("[api/analyze] error: text mode missing prompt");
      res.status(400).json({ error: "Missing prompt" });
      return;
    }
    console.log("[api/analyze][text] prompt=" + prompt.length + " bytes, system=" + system.length + " bytes");
    payload = {
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    };
  } else {
    const mode = String(body.mode || "text");
    const text = typeof body.text === "string" ? body.text.slice(0, 4000) : "";
    const image = body.image && typeof body.image === "object" ? body.image : null;
    const content = [];
    if (image && image.data) {
      const media = String(image.media || "image/jpeg");
      if (!/^image\/(jpeg|png|webp|gif)$/i.test(media)) {
        res.status(400).json({ error: "Unsupported image media type" });
        return;
      }
      content.push({
        type: "image",
        source: { type: "base64", media_type: media, data: cleanBase64(image.data) },
      });
    }
    content.push({ type: "text", text: instructionFor(mode, text) });
    console.log("[api/analyze][nutrition] mode=" + mode + ", hasImage=" + !!image);
    payload = {
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: "You are a precise nutrition estimation engine for a food-logging app. Always answer with the requested JSON only.",
      messages: [{ role: "user", content }],
    };
  }

  // Forward to Anthropic with the server-side key.
  let upstream;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("[api/analyze] error: upstream connection failed (" + kind + "):", e?.message || e);
    res.status(502).json({ error: "Upstream connection failed" });
    return;
  }

  if (!upstream.ok) {
    // Surface a short status code only — don't leak Anthropic's error body to the browser.
    const detail = await upstream.text().catch(() => "");
    console.error("[api/analyze] error: Anthropic " + upstream.status + " (" + kind + "): " + detail.slice(0, 300));
    res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: "AI request failed" });
    return;
  }

  let data;
  try { data = await upstream.json(); } catch (_) {
    console.error("[api/analyze] error: bad upstream JSON (" + kind + ")");
    res.status(502).json({ error: "Bad upstream response" });
    return;
  }

  const raw = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n");

  if (kind === "text") {
    if (!raw) console.warn("[api/analyze] error: empty text response from Anthropic; data=", JSON.stringify(data).slice(0, 300));
    res.status(200).json({ text: raw });
    return;
  }
  // nutrition: parse JSON server-side so the frontend doesn't have to.
  const result = extractJSON(raw);
  if (!result) {
    console.error("[api/analyze] error: malformed nutrition JSON from model");
    res.status(502).json({ error: "AI returned malformed nutrition JSON", raw });
    return;
  }
  res.status(200).json({ result, raw });
}
