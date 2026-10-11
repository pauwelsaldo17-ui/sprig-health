// src/theme.js
// Shared live theme singleton. Every component reads C.x at render time.
// applyTheme() mutates C in-place so all components re-read new values on
// their next render without needing a React context re-render.

export const THEMES = {
  dark: {
    // ── backgrounds ────────────────────────────────────────────
    bg:          "#060D09",
    bg2:         "rgba(255,255,255,0.065)",
    card:        "rgba(255,255,255,0.075)",
    cardSolid:   "#111A15",

    // ── text ───────────────────────────────────────────────────
    ink:         "#F4F7F2",
    inkSoft:     "rgba(244,247,242,0.78)",
    muted:       "rgba(244,247,242,0.52)",

    // ── borders ────────────────────────────────────────────────
    line:        "rgba(255,255,255,0.09)",

    // ── brand greens ───────────────────────────────────────────
    green:       "#3E9D63",
    greenSoft:   "#52C878",
    leaf:        "#74CE8A",
    lime:        "#C7FF3D",
    limeSoft:    "#A7F04B",

    // ── domain accents ─────────────────────────────────────────
    purple:      "#8B7CF7",   // sleep / mind
    blue:        "#4FC3F7",   // recovery / water accent
    waterBlue:   "#5B9BD5",   // water
    orange:      "#FB923C",   // nutrition / calories

    // ── status ─────────────────────────────────────────────────
    coral:       "#FF6B5F",
    coralSoft:   "#FF9B92",
    amber:       "#F5A623",

    // ── effects ────────────────────────────────────────────────
    shadow:      "0 1px 3px rgba(0,0,0,.22), 0 12px 32px rgba(0,0,0,.30)",
    navBg:       "rgba(6,13,9,0.88)",

    // ── page background ────────────────────────────────────────
    pageBg:      "radial-gradient(130% 65% at 50% -10%, #0F2E1C 0%, rgba(12,26,18,0) 55%), linear-gradient(180deg, #0B1C13 0%, #060D09 65%)",

    // ── hero gradients ─────────────────────────────────────────
    heroGrad1:   "linear-gradient(148deg, #1A5038 0%, #0D2B1C 100%)",
    heroGrad2:   "linear-gradient(158deg, #0D2B1C 0%, #1A5038 100%)",

    isDark: true,
  },

  light: {
    bg:          "#F3F6F1",
    bg2:         "#EAEDE8",
    card:        "#FFFFFF",
    cardSolid:   "#FFFFFF",

    ink:         "#101612",
    inkSoft:     "#3A4840",
    muted:       "#687870",

    line:        "rgba(16,22,18,0.10)",

    green:       "#2C8E54",
    greenSoft:   "#34A862",
    leaf:        "#4FB374",
    lime:        "#5BBF3A",
    limeSoft:    "#6FC94E",

    purple:      "#6C5CE7",
    blue:        "#0891B2",
    waterBlue:   "#2563EB",
    orange:      "#EA6C1A",

    coral:       "#E0533F",
    coralSoft:   "#E88670",
    amber:       "#C8861E",

    shadow:      "0 1px 2px rgba(16,22,18,.04), 0 6px 18px rgba(16,22,18,.07)",
    navBg:       "rgba(255,255,255,0.94)",

    pageBg:      "radial-gradient(120% 60% at 50% -10%, #E8F1E9 0%, rgba(232,241,233,0) 55%), linear-gradient(180deg, #F7F8F5 0%, #F1F4EF 60%)",
    heroGrad1:   "linear-gradient(148deg, #2C8E54 0%, #1C6B3D 100%)",
    heroGrad2:   "linear-gradient(158deg, #1C6B3D 0%, #2C8E54 100%)",

    isDark: false,
  },
};

export const C = { ...THEMES.dark };

export function applyTheme(mode) {
  const t = THEMES[mode] || THEMES.dark;
  Object.keys(C).forEach((k) => { delete C[k]; });
  Object.assign(C, t);
  try {
    document.documentElement.style.background = t.bg;
    document.body.style.background = t.bg;
    document.body.style.color = t.ink;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t.isDark ? "#060D09" : "#F3F6F1");
  } catch (_) {}
}
