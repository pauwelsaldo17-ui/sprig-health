---
paths:
  - "src/screens/**/*.jsx"
  - "src/components/**/*.jsx"
  - "src/App.jsx"
  - "src/theme.js"
---

# Sprig UI rules (auto-loaded for UI files)

Full reference: `docs/ui-conventions.md`. Read it before adding new visual patterns, colors, animations or overlays.

- Inline `style={{}}` only. `className` only for the global `.sprig-*` / `.vitae-*` / `.tab-enter` classes.
- Colors from `C.*` (`src/theme.js`). Existing domain constants (`SLEEP_CLR`…) are allowed; prefer `C.*` in new code.
- Every tappable element: `className="sprig-tap"` + `buzz("tap")` (use the `buzz` already defined in that file).
- Every `<button>`: `fontFamily: "DM Sans"`. Full-card buttons: `textAlign: "left"`, `border: "none"`. Never nest buttons.
- Motion: press ≤ 120 ms, entrances 200–260 ms, `cubic-bezier(.2,.8,.2,1)`. No spinners for data already in state; use `.sprig-skeleton`.
- New overlays/sheets/toasts render through `Portal`; sheets with inputs use `useKeyboardInset()`.
- New z-index values follow the scale: 1 · 100 · 1000 · 1500 · 1600 · 3000 · 4000. Don't renumber existing ones unless asked.
- Don't re-implement calculations in screens; import from `src/utils/vitaeCalc.js`.
