# FreighTime Design System v1

This document describes the visual design system introduced by the
2026-08 product redesign. It governs **how the product looks and
behaves visually**; it does not change any result-computation logic
(see `IMPORT_READINESS_V1.md` for that). All tokens live as CSS custom
properties inside the single `<style>` block of `index.html` (no build
step, no separate CSS file, zero new dependencies).

## 1. Design principles

1. **One coherent product, not a set of independently designed
   sections.** Every section reuses the same tokens, radii, button
   system, and card system.
2. **Calm and operational, not a marketing brochure.** No stock
   photography, no decorative motion, no inflated claims.
3. **The product interaction comes first.** The import-type choice
   must be reachable without significant scrolling on common desktop
   widths — it is not buried under a tall decorative Hero.
4. **Action teal is scarce.** It is reserved for primary CTAs,
   selected states, the progress bar, and success confirmation — never
   used decoratively (e.g. never as a section-tag color paired with
   ocean-blue for secondary emphasis; `--teal-strong` is the only
   exception, used for hover states of teal elements themselves and
   for the trust-strip checkmark icon, which is itself a factual
   confirmation, not decoration).
5. **Honesty over polish.** Every visible claim (trust strip,
   professional-service cards, tracking-utility copy) must be literally
   true today — no fabricated volume/provider/response-time claims.

## 2. Token system

All tokens are defined once on `:root` inside `index.html` (see the
`/* FreighTime Design System v1 — tokens */` comment block at the top
of the `<style>` element, roughly lines 13–95).

### Brand colors
| Token | Value | Use |
|---|---|---|
| `--navy` | `#0B2E4E` | Primary brand / trust / serious content, most headings |
| `--ink` | `#071B2E` | Darkest surface (footer, hero base) |
| `--ocean` | `#1E6FA8` | Secondary blue — informational and secondary controls (tracking search button, secondary CTA text) |
| `--teal` / `--teal-strong` | `#12A594` / `#0E8A7C` | Action teal — **primary CTAs, selected states, progress bar, success confirmation only** |
| `--sand` / `--surface-sand` | `#F6F1E9` | Warm neutral surface variation (trust strip, how-it-works background) |
| `--white` / `--surface` | `#FFFFFF` | Primary surface |

### Text / border / status
`--text-primary`, `--text-secondary`, `--text-onDark`,
`--text-onDark-secondary`, `--line`, `--line-strong`, `--surface-tint`.
Status colors (`--status-error-*`, `--status-warning-*`,
`--status-info-*`, `--status-success-*`) are always paired with an
icon or explicit text label in markup — never color alone.

### Spacing scale
4px base: `--sp-1` (4px) through `--sp-11` (96px).

### Radii (small family — three sizes only)
- `--radius-control` (10px): buttons, inputs, tabs
- `--radius-card` (16px): cards, panels, result blocks
- `--radius-surface` (22px): large surfaces (hero entry card, tracking utility card)
- `--radius-pill` (999px): pills/badges/progress track

### Shadows (restrained)
`--shadow-sm`, `--shadow-card`, `--shadow-elevated` — soft, low-opacity,
never the heavy multi-layer "SaaS template" shadow.

### Content widths / control heights
`--width-page` (1200px), `--width-narrow` (760px), `--width-question`
(680px, the assessment/result reading width); `--h-control` (46px),
`--h-control-lg` (52px) — both comfortably above the 44px touch-target
minimum.

### Typography scale (four sizes, reuses the existing font stack)
`Rubik` for headings/buttons, `Assistant` for body text (both already
loaded — no new fonts added).
- `--fs-hero`: `clamp(2.25rem, 1.6rem + 2.6vw, 3.6rem)`
- `--fs-section-title`: `clamp(1.6rem, 1.35rem + 1vw, 2.35rem)`
- `--fs-card-title`: 1.25rem
- `--fs-body` / `--fs-body-lg` / `--fs-helper`

### Motion
`--dur` (160ms), `--dur-slow` (260ms), `--ease`
(`cubic-bezier(.4,0,.2,1)`). Used only for: hover elevation, selected-
state transitions, the progress-bar width transition, and the
`<details>` disclosure marker rotation. A global
`@media (prefers-reduced-motion: reduce)` block neutralizes all
transitions/animations to ~0ms.

### Focus
One consistent, accessible focus ring: `--focus-ring` (a teal glow +
1.5px teal outline), applied globally via `:focus-visible`.

## 3. Component patterns

### Buttons (`.btn`, `.tool-btn-primary`, `.tool-btn-secondary`, `.btn-text`)
One unified system: primary (teal, filled), secondary (tinted/outline,
ocean text), ghost-on-dark (header), and text-only (`.btn-text`,
underlined, used for tertiary actions like "Reset" and card links).
All buttons are ≥44px tall.

### Choice cards (`.choice-card`)
Large, obviously-clickable cards used for the Hero entry and the
assessment intro (replacing the old two small text-only actions).
Each has an icon, a title, a one-line subtitle, and a directional
arrow. Hover raises and adds a shadow; the primary option
(`.is-primary`) gets a teal border/tint.

### Radio/checkbox choice cards inside the questionnaire (`.ir-radio-row label`)
Each option is a full-width, ≥44px tall card with a visible border
that turns teal and gets a tinted background when the radio/checkbox
inside it is `:checked` (via `:has()`), and gets the focus ring when
the input receives keyboard focus.

### Cards (`.card`)
Used for the professional-service paths section. Consistent radius,
border, padding, and hover elevation.

### Result (`#readinessResult`)
A `.readiness-card` with a 4px teal top border to make the primary
recommendation the unmistakable visual focal point. Preparation items
render as a checklist (custom check-mark bullets), not a table. The
`<details>` secondary-info region uses a native disclosure triangle
that rotates on open. The visible disclaimer is a small, muted,
single-sentence panel — not a large blue legal block.

## 4. States

- **Selected**: teal border + tinted background (choice cards, radio
  cards, active tracking-tab, active tools-tab).
- **Hover**: subtle `translateY(-1px)`–`translateY(-4px)` + soft
  shadow; color darkens by one step (teal → teal-strong, ocean → its
  hover shade).
- **Focus**: the shared `--focus-ring` on every interactive element via
  `:focus-visible` (never removes `outline` without replacing it).
- **Disabled**: 50% opacity + `cursor:not-allowed` (`.btn[disabled]`).
- **Error**: status-error background + border + text, always with a
  text message (never a bare red border).

## 5. Responsive rules

- Breakpoints: 980px (two-column layouts collapse to one column: hero,
  cards, steps, contact, footer) and 600px (tighter page padding,
  stacked search/tool rows, stacked nav actions in the assessment).
- The mobile nav menu (`#mobileMenu`) replaces the inline nav links
  under 900px, toggled by a 44×44px button with `aria-expanded`.
- No fixed pixel widths on any container above 320px; all layout uses
  `%`, `fr`, `clamp()`, or `flex-wrap`.
- Verified with no horizontal overflow at 320/360/375/390/430/768/
  1024/1280/1440/1920px (see PR description for the full matrix).

## 6. Accessibility notes

- Native semantics first: one `<main>`, one `<header>`/`<nav>`, real
  `<fieldset>`/`<legend>` per question group, `<label for>` on every
  form control, native `<details>`/`<summary>`.
- `aria-live="polite"` on the step indicator and result container
  (unchanged from the pre-redesign implementation); `role="alert"
  aria-live="assertive"` on validation errors.
- `role="tablist"`/`aria-selected`/`aria-controls` kept on the
  calculator tabs (a real ARIA tablist, not reinvented).
- The mobile-menu toggle correctly flips `aria-expanded` and closes the
  menu (without trapping focus) when a link is activated.
- `dir="auto"` is set on every freeform/mixed-language input (product
  name, contact fields, tracking input).
- No duplicate `id` attributes anywhere in the document (enforced by a
  test).

## 7. Privacy notes

- No network request ever contains user-entered values (the only
  external requests are the static Google Fonts stylesheet, already
  present before the redesign, and official carrier tracking links the
  user explicitly opens in a new tab).
- No `localStorage`/`sessionStorage`/`document.cookie` writes anywhere.
- No analytics, no tracking pixels, no third-party scripts.
- The contact form is a local-only demo (explicitly labeled as such)
  and never transmits its contents anywhere.

## 8. Explicit anti-patterns (do not reintroduce)

- Do not use `--teal`/`--teal-strong` for decorative labels, tags, or
  anything that is not a primary CTA, a selected state, the progress
  bar, or a success confirmation.
- Do not add a login/account control anywhere.
- Do not restore any previously removed section or claim: Smart
  Tracking Import, pasted-tracking-text analysis, a sea-transit
  calculator, standalone container/AWB validator tools, an AI chat
  widget, "500+ customs brokers"/provider-network claims, live-tracking
  claims, non-functional document-download buttons, marketplace UI.
- Do not reintroduce the large embedded base64 hero photograph or any
  other full-bleed decorative background image — the hero background is
  a CSS gradient by design (compact, zero asset weight, no layout
  shift).
- Do not add a UI framework, icon font, animation library, or any new
  runtime dependency to satisfy a purely visual requirement — this is
  a zero-build, zero-dependency, inline-styled page by design.
- Do not let any control fall below a 44px touch target.
- Do not communicate state with color alone (status blocks always pair
  color with an icon and/or text).
