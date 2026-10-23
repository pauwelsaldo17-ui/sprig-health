# UI conventions

Read this when: adding or changing anything visible in `src/screens/`, `src/components/` or the UI parts of `src/App.jsx`. The short checklist is auto-loaded from `.claude/rules/ui.md`; this file is the full reference.

Design target: Apple-level polish — fast, minimal, direct, no noise.

## Styling

- **Inline styles everywhere** (`style={{ … }}`). No CSS modules, no Tailwind.
- `className` only for the global classes below (animation, tap feedback, layout shell).
- Global CSS lives in the `FONTS` string in `App.jsx`, injected as a `<style>` tag. Font: DM Sans.

## Colors

`src/theme.js` exports a mutable singleton `C`; read `C.x` at render time. `applyTheme("dark"|"light")` mutates it in place. Never hardcode a color that has a token.

| Token group | Tokens |
|-------------|--------|
| Backgrounds | `bg`, `bg2`, `card`, `cardSolid`, `pageBg`, `heroGrad1`, `heroGrad2`, `navBg` |
| Text | `ink`, `inkSoft`, `muted` |
| Lines / effects | `line`, `shadow` |
| Brand greens | `green`, `greenSoft`, `leaf`, `lime`, `limeSoft` |
| Domain accents | `purple` (sleep/mind), `blue` (recovery), `waterBlue` (water), `orange` (nutrition) |
| Status | `coral`, `coralSoft`, `amber` |
| Mode flag | `isDark` |

**Domain color constants** are declared locally in several files (not in `theme.js`):

| Constant | Value | Declared in |
|----------|-------|-------------|
| `SLEEP_CLR` | `#8B7CF7` | TodayTab, CoachTab, QuickLogSheet — **SleepTab uses `#8B5CF6`** |
| `NUTR_CLR` | `#FB923C` | TodayTab, CoachTab, NutritionTab, QuickLogSheet |
| `WATER_CLR` | `#5B9BD5` | TodayTab |
| `RECOV_CLR` | `#4FC3F7` | TodayTab, CoachTab |
| `SUPP_CLR` | `#52C878` | inside one TodayTab block |
| `MIND_CLR` | `#A78BFA` | TodayTab, MindTab |

Using these constants is allowed. They equal the **dark** values of `C.purple`, `C.orange`, `C.waterBlue`, `C.blue`, `C.greenSoft`, so they don't adapt to light mode. Prefer the `C.*` token in new code. Known inconsistency (not yet fixed): the SleepTab purple.

## Global classes

| Class | Behavior |
|-------|----------|
| `.sprig-tap` | Press feedback: `scale(.975)` + `brightness(1.08)`, 120 ms, GPU-composited. On every interactive element. |
| `.sprig-rise` | Entrance: fade + rise, 200 ms |
| `.sprig-pop` / `.sprig-pop-centered` | Entrance: scale-in, 220 ms / 180 ms |
| `.sprig-sheet` | Bottom sheet slide-up, 260 ms |
| `.sprig-dim` | Overlay fade-in, 200 ms |
| `.sprig-toast-anim` | Toast in, 220 ms |
| `.sprig-skeleton` | Loading shimmer |
| `.tab-enter` | Tab switch, 200 ms |
| `.sprig-cta` | CTA button base (flex, DM Sans 700, radius 14, no border) |
| `.sprig-scroll` | Momentum scroll area |
| `.vitae-fade-up` (260 ms), `.vitae-scale-in` (200 ms), `.vitae-sheet-enter` (310 ms), `.vitae-success-pulse` (380 ms), `.vitae-stagger-1…5` (60–300 ms delay) | Newer animation set |
| Layout shell | `.sprig-app-frame`, `.sprig-content`, `.sprig-content-cta`, `.sprig-tabbar`, `.sprig-glass`, `.sprig-bottom-pad`, `.sprig-bottom-sheet`, `.sprig-bottom-toast`, `.sprig-surface`, `.sprig-hero-label`, `.sprig-eyebrow`, `.sprig-nav-item` |

## Motion

- Press feedback ≤ 120 ms; entrances 200–260 ms; easing `cubic-bezier(.2,.8,.2,1)`.
- Existing exceptions (leave unless asked): `.vitae-sheet-enter` 310 ms, `.vitae-success-pulse` 380 ms, the `.vitae-*` easing `cubic-bezier(.22,.7,.25,1)`.
- No spinners for data already in state; use `.sprig-skeleton` or render nothing.

## Haptics

`buzz(kind)` triggers feedback; call `buzz("tap")` on every tap. Kinds in `App.jsx` (`HAPTIC_PATTERNS`): `tap`, `light`, `select`, `success`, `complete`, `finish`, `strong`, `error`, `alarm`.

- `App.jsx`'s `buzz` uses Capacitor Haptics natively, Web Vibration on web, and respects the profile `haptics` setting.
- Most screens/components define their **own local `buzz()`** using `navigator.vibrate` only. Use the one already in the file you're editing; don't add a new copy.

## Buttons

- Every `<button>` sets `fontFamily: "DM Sans"` (browsers default to the system font).
- Full-card buttons replacing a `<div>` set `textAlign: "left"` and `border: "none"`.
- Never nest `<button>` in `<button>`. When converting a card to a button: remove inner buttons, move their action to the outer `onClick`, show a `<ChevronRight>` affordance instead.

## Overlays and keyboard

- Sheets, modals, toasts and the tab bar render through `Portal` (`createPortal` to `document.body`) so they escape the app frame's `overflow: hidden` / transforms.
- Bottom sheets with inputs use `useKeyboardInset()` (`visualViewport`) to stay above the iOS keyboard.

## Z-index

Target scale for **new** code:

| Layer | z-index |
|-------|---------|
| Content | 1 |
| Sticky headers | 100 |
| Bottom nav | 1000 |
| Floating CTAs | 1500 |
| Rest timer | 1600 |
| Overlays / modals | 3000 |
| Toasts | 4000 |

Existing values outside the scale (known; don't flag or "fix" unless the task is about layering): 2, 10 (sticky headers in GDPR/Privacy/Terms), 30, 50, 110 (TrainTab sticky header), 200/201 and 300/301 (NutritionTab sheets), 2800, 3200, 3500/3501 (App sheets), 4500, 9999.
