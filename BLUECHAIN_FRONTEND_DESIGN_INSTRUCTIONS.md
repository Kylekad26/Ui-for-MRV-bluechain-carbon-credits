# BlueChain Frontend Design Instructions

Source: extracted directly from `github.com/Kylekad26/Ui-for-MRV-bluechain-carbon-credits`
(9 real HTML pages inspected — `landing.html`, `login.html`, `signup.html`,
`index.html`, `identity.html`, `model-intelligence.html`, `markets.html`,
`news.html`, `verify.html`). This reference already implements the "pixel-art
ecosystem + serious climate-finance technology" visual language your original
brief asked for, including working REAL/MODELLED provenance badges and a
canvas-based pixel mangrove scene. Treat it as the authoritative style
reference for Antigravity — quote these exact values, don't approximate them.

This is a **style/placement instruction file**, not a new phase plan. Use it
to ground Phase 1 (design system) and every later UI phase in the earlier
BlueCarbon phase plan.

---

## 1. Color Tokens (exact hex, used identically across every page)

Declare these once as CSS custom properties (`:root`) for hand-written CSS
pages, and mirror them as literal Tailwind arbitrary values (`bg-[#0B1F17]`)
for Tailwind-CDN pages — the reference repo does both, so both are correct
depending on the page's stack. If you move to a proper Tailwind config (per
the earlier Next.js plan), promote these into `tailwind.config` theme colors
instead of arbitrary values.

```css
:root {
  --deep-forest: #07140F;   /* page background */
  --forest:      #0B1F17;   /* nav bar, card headers */
  --mangrove:    #123C2A;   /* card background, secondary buttons */
  --moss:        #4F7F3A;   /* borders at low opacity, secondary accents */
  --leaf:        #72A84A;   /* primary accent — links, primary buttons, active states */
  --water:       #173B52;   /* info panels, "REAL" data badges */
  --sky:         #79B8C8;   /* info text on water panels, stars/highlights */
  --earth:       #6A4E35;   /* used sparingly — earth/brown accent per original brief */
  --warm-white:  #F3F1E8;   /* primary text */
  --muted:       #8DA898;   /* secondary/muted text */
  --border:      rgba(114,168,74,0.15);   /* default hairline border, derived from --leaf */
  --card-bg:     rgba(18,60,42,0.35);     /* translucent card fill over background art */
  --err:         #e05454;   /* error states */
  --amber:       #f5a13d;   /* warning states */
  --red:         #ef4444;   /* alert/negative states (distinct from --err, used in markets/alerts) */
}
```

**Rules:**
- `--deep-forest` is always the page `background`, never a card.
- `--forest` is the nav/header surface.
- `--mangrove` is the default card surface; use `rgba(18,60,42,X)` (i.e.
  `--mangrove` at partial alpha) for surfaces layered over decorative art so
  the pixel scene shows through slightly (see `.form-bg` pattern below).
- `--leaf` is the *only* primary accent — used for: primary CTA buttons, the
  active nav-link underline, the pulsing "live" indicator dot, and the
  REAL-status color family. Do not introduce a second competing accent hue.
- `--sky`/`--water` form a secondary "informational" pairing, used
  specifically for satellite/data panels (see badge conventions in §5) —
  keep this pairing reserved for that meaning, don't reuse it decoratively.
- `--err`/`--red`/`--amber` are reserved for genuine error/warning/negative
  states only — never decorative.

---

## 2. Typography

```css
font-family: 'Inter', system-ui, sans-serif;          /* body text, UI chrome */
font-family: 'Space Grotesk', sans-serif;              /* headings, logo, page titles */
font-family: ui-monospace, 'Courier New', monospace;   /* addresses, hashes, scientific values */
```

Google Fonts import (identical across every page):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

**Usage rules:**
- Space Grotesk: logo wordmark, `<h1>`/page titles only, `font-weight: 700`,
  `letter-spacing: -0.02em` to `-0.03em`, tight `line-height: 1.05–1.1`.
- Inter: everything else — nav links, body copy, form labels, buttons.
- Monospace: any blockchain address, tx hash, scene ID, or raw scientific
  value (NDVI, tC/ha) that a technically literate user might want to
  copy/verify exactly.
- Logo wordmark pattern: `BLUE<span style="color:var(--leaf)">CHAIN</span>`
  — the accent color always falls on the second half of the wordmark, never
  the first.

**Type scale actually used in the reference:**
| Use | Size | Weight |
|---|---|---|
| Hero H1 | `clamp(2.5rem, 5vw, 4rem)` | 700 |
| Page title | `2rem` | 700 |
| Card/section heading | `1.2–1.25rem` | 700 |
| Body | `0.9375rem` (15px) | 400 |
| Nav links | `0.875rem` (14px) | 500 |
| Eyebrow/label | `0.75rem`, uppercase, `letter-spacing: 0.08–0.1em` | 600 |
| Micro badge text | `10px` | 600–700 |

---

## 3. Layout & Spacing

**Nav bar** — identical on every authenticated/internal page:
```html
<nav class="flex items-center justify-between px-6 py-4 bg-[#0B1F17] border-b border-[#123C2A] sticky top-0 z-50 shadow-sm">
```
- Height ≈ 64px total (via `py-4` + content), `padding: 0 48px` on
  hand-written-CSS pages / `px-6` on Tailwind pages — use 48px horizontal
  padding as the standard for wider marketing pages, 24px (`px-6`) for
  denser dashboard pages.
- `position: sticky; top: 0; z-index: 50` (or `100` on the landing page,
  where it floats over hero art) — nav must always stay pinned.
- `backdrop-filter: blur(12–16px)` with a semi-transparent forest
  background (`rgba(7,20,15,0.85–0.9)`) when it sits over content that
  scrolls beneath it (landing/marketing pages). Solid `bg-[#0B1F17]` is
  fine for dashboard pages with no content passing under the nav.
- Active nav link: `color: var(--leaf)` + `border-bottom: 2px solid
  var(--leaf)`, offset with a negative margin so the underline doesn't
  add to nav height (`margin-bottom: -17px` pattern in the reference —
  replicate the technique, adjust the value to your own nav height).

**Page header block** (used on markets/news/model-intelligence-style
internal pages):
```html
<div class="page-header" style="padding: 48px 48px 32px; border-bottom: 1px solid var(--border);">
  <div class="eyebrow">● SECTION LABEL</div>
  <h1 class="page-title">Page Title</h1>
  <p class="page-sub">One-line description, var(--muted)</p>
</div>
```

**Cards**: `background: var(--mangrove)` (or `bg-[#0B1F17]` for a slightly
darker card on a `--deep-forest` page), `border: 1px solid var(--mangrove
border, #123C2A)`, `border-radius: 12px` (`rounded-xl`), `padding: 20px`
(`p-5`), `box-shadow: shadow-lg` (subtle, not heavy).

**Grids**: dashboard cards use `grid grid-cols-1 lg:grid-cols-2 gap-6` at
the top level, with `grid grid-cols-2 md:grid-cols-4 gap-2` for dense
metric rows inside a card, and `grid grid-cols-2 gap-y-2` for label/value
pairs. Keep this two-tier grid pattern (outer 1–2 col, inner 2–4 col) — it's
used consistently across every internal page in the reference.

**Buttons**:
```css
/* primary */
padding: 8–14px 20–32px; background: var(--leaf); color: var(--deep-forest);
border: 1px solid var(--leaf); border-radius: 6–8px; font-weight: 600;
hover: background #85c058;

/* secondary / ghost */
padding: 8px 20px; background: var(--mangrove) or transparent;
border: 1px solid var(--border); color: var(--warm-white);
hover: border-color var(--leaf); color var(--leaf);
```
Note the primary button always uses **dark text on the light-green fill**
(`--deep-forest` text on `--leaf` background), not white — this is
consistent everywhere and should not be varied.

---

## 4. Pixel-Art System (three distinct techniques, use the right one per context)

The reference repo does NOT use pixel image assets. Everything is
generated in code, matching your original "prefer SVG/CSS/generated assets"
requirement exactly. There are three separate techniques for three separate
purposes — don't conflate them:

**a) Full pixel-art scenes (hero/login backgrounds)** — HTML5 `<canvas>`,
hand-drawn pixel mangrove forest, procedurally composed from small
functions (`px(gridX, gridY, color, alpha)` draws one 4×4px block;
`drawMangrove(cx, trunkTop, height, leafWidth, ...colors)` composes a full
tree from trunk + prop-roots + 5 layered canopy blocks). Used on
`landing.html` (full scene: sky/stars → water/ripples → ground → forest
walls) and `login.html` (smaller variant in the side panel). `image-rendering:
pixelated` on the canvas element is required to keep the blocks crisp at
any zoom. Reuse this exact function shape for any new large decorative
scene rather than reinventing pixel-drawing logic.

**b) Single decorative pixel-leaf motif (accent element, not a scene)** —
pure CSS, no canvas, no image:
```css
.pixel-leaf {
  width: 8px; height: 8px; background: var(--leaf);
  box-shadow: 8px 0 var(--leaf), 0 8px var(--leaf), 16px 8px var(--leaf), 8px 16px var(--leaf);
}
```
Placed absolutely, low opacity (`opacity-10` to `opacity-20`), scaled up
(`transform: scale(1.5–3)`) as background texture behind headers on
internal pages like `model-intelligence.html`. Use this — not the full
canvas scene — for lightweight decoration on data-dense dashboard pages
where a full animated scene would be distracting/heavy.

**c) Pixel border strip (branding accent, not decoration)** — a single 4px
strip at the very top of the page, pure CSS gradient, no canvas:
```css
.pixel-top {
  height: 4px;
  background: repeating-linear-gradient(90deg,
    #72A84A 0px, #72A84A 8px, transparent 8px, transparent 12px,
    #4F7F3A 12px, #4F7F3A 20px, transparent 20px, transparent 24px);
}
```
Placed as the very first element in `<body>`, above the nav. Cheap, always-on
branding touch — apply this to every internal page, not just marketing pages.

**Rule across all three**: pixel elements are always decorative accents
around real UI, never the UI itself. No pixel-art buttons, no pixel-art form
fields, no pixel-art data tables — matches the "underlying UX should remain
modern and professional" requirement.

**Performance**: canvas scenes (technique a) draw once on load via an IIFE,
not on a render loop — no animation cost. Floating-particle effects (small
`<div>`s with randomized CSS animations, seen on `landing.html`) are cheap
DOM elements, not canvas/WebGL — keep any ambient motion this lightweight.

---

## 5. Data-Provenance Badge System (the most important pattern to replicate exactly)

This is the reference repo's implementation of your REAL / SIMULATED /
MODEL OUTPUT / BLOCKCHAIN / FUTURE requirement, and it's done well — copy
this pattern precisely rather than designing a new one.

**Inline micro-badge** (sits directly next to the label it qualifies, not
in a separate legend):
```html
<span class="text-[#8DA898] flex items-center gap-1">
  Scene ID
  <span class="px-1 py-0.5 bg-[#173B52]/30 text-[#79B8C8] text-[10px] rounded border border-[#173B52]"
        title="Real satellite metadata">REAL</span>:
</span>
```
- REAL → water/sky color family (`bg-[#173B52]/30`, `text-[#79B8C8]`,
  `border-[#173B52]`) — reserve this pairing for genuinely real data only.
- SIMULATED/MODELLED → neutral mangrove/muted family (`bg-[#123C2A]`,
  `text-[#8DA898]` or `text-slate-300`, `border-[#4F7F3A]/30`) —
  deliberately less confident-looking than REAL, not alarming, just muted.
- Every badge carries a `title` tooltip stating exactly what it means in
  one sentence (e.g. `"NDVI simulated from scene metadata fallback"`) —
  never leave a badge unexplained.
- Badge text is short, uppercase, 10px, bold — `REAL`, `MODELLED`, not full
  sentences.

**Dynamic badge swapping** (when the same field can genuinely be either,
depending on backend data) — swap both the label text *and* the full
class string together, so color and label never get out of sync:
```js
if (ndviSource === "REAL") {
  badge.innerText = "REAL";
  badge.className = "px-1 py-0.5 bg-[#173B52]/30 text-[#79B8C8] text-[10px] rounded border border-[#173B52]";
  badge.title = "Extracted from real Sentinel-2 S3 COG pixels";
} else {
  badge.innerText = "MODELLED";
  badge.className = "px-1 py-0.5 bg-[#123C2A] text-[#8DA898] text-[10px] rounded border border-[#4F7F3A]/30";
  badge.title = "NDVI simulated from scene metadata fallback";
}
```
This is exactly the pattern to use for the Phase 5/12 honesty fixes in the
main implementation plan (Sepolia-network banner, mint mock-fallback,
NDVI real-vs-simulated).

**Full-width status banner** (used for a bigger claim, e.g. GMW
validation result, not a single field):
```html
<!-- success -->
<div class="flex items-center gap-2 text-[#72A84A] font-semibold text-sm px-3 py-2 bg-[#123C2A]/20 border border-[#4F7F3A]/30 rounded">✓ Inside validated mangrove zone</div>
<!-- failure/warning -->
<div class="bg-[#e05454]/10 border border-[#e05454]/30 text-[#e05454] p-3 rounded text-sm">⚠ Outside known mangrove boundary</div>
```

**"Not connected" API placeholders** (news/market panels): the reference's
`news.html`/`markets.html` currently render placeholder content styled
identically to real content, with no visible "NOT CONNECTED" tag in the
markup I found. **This is a gap versus your original requirement** — when
building these panels in the main phase plan, explicitly add a
`NOT CONNECTED` badge (reuse the MODELLED/muted badge styling from above)
to every news/market card sourced from placeholder data, rather than
following the reference repo's current (silent) treatment of these two
pages specifically.

---

## 6. Page-Specific Placement Notes

**Landing/login (`landing.html`, `login.html`, `signup.html`)**
- Two-column layout: `display:grid; grid-template-columns: 1fr 1fr` (login)
  or `1fr 1.2fr` (signup, giving the form slightly more room).
- Left column: pixel-art canvas + value-prop copy + footer. Right column:
  the actual form, centered, `max-width: 420px`.
- Landing page hero is full-viewport (`min-height:100vh`), two-column
  (content left, pixel canvas right), nav fixed on top with blur.
- `hero-eyebrow`: small pill above the H1 with a pulsing dot — "eyebrow +
  pulsing dot" is a signature motif of this design, reuse it for any
  "live"/"connected" status indicator elsewhere too (see web3-status in
  the dashboard nav, which reuses the same pulsing-dot idea).

**Dashboard (`index.html`)**
- Nav includes a live Web3 connection indicator (colored pulsing dot +
  label) — reuse this exact component for the NetworkBanner described in
  Phase 5 of the main plan, rather than building a separate banner design.
- Main content: two-column grid at the top level (map card left, estimate
  form + results card right on desktop; stacks on mobile via
  `grid-cols-1 lg:grid-cols-2`).
- Map is capped at `height: 400px` in the current reference — the main
  phase plan's Phase 4 instruction to make the map "significantly larger"
  than this still stands; treat 400px as the floor to exceed, not a target.
- Zone quick-jump buttons (`🌿 Core Zone` etc.) sit directly under the map
  as a `grid-cols-2 md:grid-cols-4` button row — good pattern to reuse for
  jumping between a user's own registered project sites.

**Internal tool pages (`model-intelligence.html`, `markets.html`,
`news.html`, `identity.html`)**
- All share the identical nav + `page-header` (`eyebrow` + `page-title` +
  `page-sub`) + `pixel-top` strip structure — treat this exact triplet as
  the mandatory shell for every new internal tab in the main phase plan
  (Monitoring, Certificates, Analytics, Organization, Settings, etc.), not
  just a suggestion.
- `model-intelligence.html` (functions as the Explainable AI tab) uses the
  `.pixel-leaf` decorative accents behind its hero copy and a `.data-line`
  animated horizontal divider (`background:#123C2A` line with a moving
  gradient sweep) between sections — reuse `.data-line` as the standard
  section divider on any data-heavy page instead of a plain `<hr>`.

**Public verification (`verify.html`)** — no nav/auth chrome, standalone
page matching the same color tokens; keep it visually branded but
lightweight since it's the one page a non-logged-in third party will see.

---

## 7. What This Reference Does NOT Yet Solve (carry these gaps into the phase plan)

- No Firebase auth — `auth.js`/`identity.html` use `sessionStorage`-based
  demo auth, not real Firebase. Phase 2 of the main implementation plan
  still needs to build real Firebase auth from scratch; reuse this
  reference only for visual styling of the login/signup forms, not the
  auth logic itself.
- News/market pages lack the explicit `NOT CONNECTED` badge called out in
  §5 above — add it when implementing those panels.
- No responsive breakpoint below `md:` verified for the two-column
  login/landing grids — test and adjust `grid-template-columns` to a
  single column under ~640px when implementing, since the reference's own
  media-query coverage wasn't confirmed exhaustive during this review.
