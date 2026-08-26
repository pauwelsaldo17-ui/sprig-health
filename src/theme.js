// src/theme.js
// Shared live theme singleton. Every component reads C.x at render time.
// applyTheme() mutates C in-place so all components re-read new values on
// their next render without needing a React context re-render.

export const THEMES = {
  dark: {
    bg: "#07140F",
    bg2: "rgba(255,255,255,0.06)",
    card: "rgba(255,255,255,0.07)",
    cardSolid: "#13261D",
    ink: "#F4F7F2",
    inkSoft: "rgba(244,247,242,0.72)",
    muted: "rgba(244,247,242,0.52)",
    line: "rgba(255,255,255,0.08)",
    green: "#3E9D63",
    greenSoft: "#52C878",
    leaf: "#74CE8A",
    lime: "#C7FF3D",
    limeSoft: "#A7F04B",
    coral: "#FF6B5F",
    coralSoft: "#FF9B92",
    amber: "#F5A623",
    shadow: "0 1px 2px rgba(0,0,0,.18), 0 10px 30px rgba(0,0,0,.28)",
    navBg: "rgba(7,20,15,0.82)",
    pageBg: "radial-gradient(120% 60% at 50% -10%, #123524 0%, rgba(18,53,36,0) 55%), linear-gradient(180deg, #0B1A13 0%, #07140F 60%)",
    heroGrad1: "linear-gradient(150deg,#1C5237,#0E2C1E)",
    heroGrad2: "linear-gradient(160deg,#0E2C1E,#1C5237)",
    isDark: true,
  },
  light: {
    bg: "#F4F6F2",
    bg2: "#ECEFEA",
    card: "#FFFFFF",
    cardSolid: "#FFFFFF",
    ink: "#101612",
    inkSoft: "#3C4A41",
    muted: "#596260",
    line: "rgba(16,22,18,0.10)",
    green: "#2C8E54",
    greenSoft: "#34A862",
    leaf: "#4FB374",
    lime: "#5BBF3A",
    limeSoft: "#6FC94E",
    coral: "#E0533F",
    coralSoft: "#E88670",
    amber: "#C8861E",
    shadow: "0 1px 2px rgba(16,22,18,.04), 0 6px 18px rgba(16,22,18,.06)",
    navBg: "rgba(255,255,255,0.92)",
    pageBg: "radial-gradient(120% 60% at 50% -10%, #E8F1E9 0%, rgba(232,241,233,0) 55%), linear-gradient(180deg, #F7F8F5 0%, #F1F4EF 60%)",
    heroGrad1: "linear-gradient(150deg,#2C8E54,#1C6B3D)",
    heroGrad2: "linear-gradient(160deg,#1C6B3D,#2C8E54)",
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
    if (meta) meta.setAttribute("content", t.isDark ? "#07140F" : "#F4F6F2");
  } catch (_) {}
}
