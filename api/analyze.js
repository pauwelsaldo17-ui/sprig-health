const SCHEMA_PROMPT = `Return ONLY a single minified JSON object (no markdown, no commentary) with EXACTLY this shape:
{"name":string,"serving":string,"confidence":"high"|"medium"|"low","calories":int,"protein_g":number,"carbs_g":number,"fat_g":number,"fiber_g":number,"micros":{"vitamin_a":int,"vitamin_c":int,"vitamin_d":int,"vitamin_e":int,"vitamin_k":int,"b6":int,"b12":int,"folate":int,"calcium":int,"iron":int,"magnesium":int,"zinc":int,"potassium":int,"selenium":int},"omega3":"low"|"medium"|"high","note":string}
"name" max 5 words. Each micro value = integer percent of an average adult daily value contributed by THIS serving (can exceed 100). Estimate sensibly even with limited info.`;

function extractJSON(text) {
  let s = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

function buildInstruction({ text, mode }) {
  if (mode === "supp-label") {
    return "Read this dietary SUPPLEMENT label (vitamins/minerals/protein/omega/etc). Use the per-serving Supplement Facts values. For each nutrient, convert the listed amount into integer percent of an average adult daily value. Set macros to the values on the label, usually near 0 unless it is protein/meal powder. " + SCHEMA_PROMPT;
  }

  if (mode === "supplement") {
    return `This is a dietary SUPPLEMENT the user takes: "${text || ""}". Estimate the nutrients ONE serving/dose contributes, converting each into integer percent of an average adult daily value. Macros are usually ~0 unless it is a protein or meal-replacement powder. ` + SCHEMA_PROMPT;
  }

  if (mode === "label") {
    return "Read the nutrition label / packaged product in this image. Use the per-serving values printed if visible. " + SCHEMA_PROMPT;
  }

  if (mode === "photo") {
    return "Identify the food in this photo and estimate the nutrition of the visible portion. " + SCHEMA_PROMPT;
  }

  return `Estimate the nutrition of this meal described by the user: "${text || ""}". ` + SCHEMA_PROMPT;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });
    }

    const { text, image, mode } = req.body || {};

    const content = [];

    if (image?.data && image?.media) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.media,
          data: image.data,
        },
      });
    }

    content.push({
      type: "text",
      text: buildInstruction({ text, mode }),
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system:
          "You are a precise nutrition estimation engine for a food-logging app. Always answer with the requested JSON only.",
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return res.status(response.status).json({
        error: "Anthropic API error",
        status: response.status,
      });
    }

    const data = await response.json();
    const txt = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

      const parsed = extractJSON(txt);
      return res.status(200).json({ result: parsed });
  } catch (err) {
    console.error("/api/analyze error:", err);
    return res.status(500).json({
      error: "AI analysis failed",
    });
  }
}