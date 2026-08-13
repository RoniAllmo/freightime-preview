# FreighTime Design System v1

This document describes the visual design system introduced by the
2026-08 product redesign. It governs **how the product looks and
behaves visually**; it does not change any result-computation logic
(see `IMPORT_READINESS_V1.md` for that). All tokens live as CSS custom
properties inside the single `<style>` block of `index.html` (no build
step, no separate CSS file, zero new dependencies).

**Update (product-owner acceptance correction):** direct product-owner
review of the merged redesign surfaced five fixes, applied on top of
this design system without a second visual redesign: (1) the Hero and
the `#readiness` section were consolidated into a single continuous
assessment-entry point (the old duplicate lower "start" block is gone
-- see §3 and §8); (2) the Hero headline and supporting copy were
replaced with an explicit output promise; (3) a dedicated
professional-referral component was added inside the result (see §3);
(4) the public tracking/identifier-validation utility was removed in
full -- FreighTime does not return real operational tracking data, so
a validate-only utility was not public-value-worthy on its own; every
"tracking" reference below describes **removed, historical**
functionality, kept in this document only so future contributors
understand what not to reintroduce (see §8); (5) a dedicated mobile
pass was applied to the sections this correction touched (see §5).

## 1. Design principles

1. **One coherent product, not a set of independently designed
   sections.** Every section reuses the same tokens, radii, button
   system, and card system.
2. **Calm and operational, not a marketing brochure.** No stock
   photography, no decorative motion, no inflated claims.
3. **The product interaction comes first, and there is exactly one
   entry point.** The route-entry choice lives only in the Hero; no
   other section repeats it as a second "beginning." The import-type
   choice must be reachable without significant scrolling on common
   desktop widths — it is not buried under a tall decorative Hero.
4. **Action teal is scarce.** It is reserved for primary CTAs,
   selected states, the progress bar, and success confirmation — never
   used decoratively (e.g. never as a section-tag color paired with
   ocean-blue for secondary emphasis; `--teal-strong` is the only
   exception, used for hover states of teal elements themselves and
   for the trust-strip checkmark icon, which is itself a factual
   confirmation, not decoration).
5. **Honesty over polish.** Every visible claim (trust strip,
   professional-service cards) must be literally true today — no
   fabricated volume/provider/response-time claims.

## 2. Token system

All tokens are defined once on `:root` inside `index.html` (see the
`/* FreighTime Design System v1 — tokens */` comment block at the top
of the `<style>` element, roughly lines 13–95).

### Brand colors
| Token | Value | Use |
|---|---|---|
| `--navy` | `#0B2E4E` | Primary brand / trust / serious content, most headings |
| `--ink` | `#071B2E` | Darkest surface (footer, hero base) |
| `--ocean` | `#1E6FA8` | Secondary blue — informational and secondary controls (professional-referral CTA, secondary CTA text) |
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
- `--radius-surface` (22px): large surfaces (hero entry card)
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
Large, obviously-clickable cards used for the single Hero entry point
(the only place they appear -- see §8). Exactly two cards: "אני מתכנן
יבוא" and "יש לי משלוח בדרך ונתקלתי בבעיה". Each has an icon, a title,
a one-line subtitle, and **exactly one** directional affordance (the
`.cc-arrow` element) -- the icon itself must never also be a direction
chevron, since that would be a second, redundant directional
indicator. Hover raises and adds a shadow; the primary option
(`.is-primary`) gets a teal border/tint. ≥44px touch target.

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
single-sentence panel — not a large blue legal block. Rendered field
order: route context → urgency (when present) → primary recommendation
→ reason → professional-referral block → preparation checklist →
secondary CTA (when present) → edit/copy actions → collapsed
`<details>` → disclaimer (last).

### Professional-referral block (`.ir-professional-referral`)
A single, visually distinct tinted card (`--surface-tint` background,
ocean-tinted border) positioned right after the primary recommendation
+ reason and before the preparation checklist -- never buried below
it, never inside the collapsed `<details>`. Always answers three
things concretely, never with a vague fallback phrase ("מומלץ לפנות
לגורם מקצועי" and similar are explicitly banned):
- **WHO** (`.ir-professional-type`): a named professional type, e.g.
  "מסווג מכס או מומחה רגולציה".
- **WHY** (`.ir-professional-reason`): one concrete sentence.
- **WHAT TO CLICK** (`.ir-professional-cta`): one dedicated,
  full-width, action-verb CTA (e.g. "לתיאום בדיקת סיווג ורגולציה")
  that navigates to `#contact` -- never more than one professional/CTA
  pairing per result, and the CTA never appends assessment answers to
  the URL. See `IMPORT_READINESS_V1.md` §"Professional referral" for
  the full per-scenario mapping table.

## 4. States

- **Selected**: teal border + tinted background (choice cards, radio
  cards, active tools-tab).
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
  cards, steps, contact, footer), 768px (a **dedicated mobile-density
  pass** -- see below, not just "does the desktop layout fit"), 600px
  (narrow-viewport structural rules: stacked calculator fields,
  full-width primary actions, single-column footer), and 380px
  (extra-narrow stacking for the Hero benefit group and route cards).
- The mobile nav menu (`#mobileMenu`) replaces the inline nav links
  under 900px, toggled by a 44×44px button with `aria-expanded`. The
  header contact action (`.nav-actions .btn-ghost-onDark`) is hidden
  under 900px in favor of the contact link already present inside the
  mobile menu, so mobile never shows two competing header controls.
- **Mobile density is a deliberate pass, not a reused desktop layout**:
  the 768px block gives the Hero, header, and route cards their own
  spacing values (`--sp-8`/`--sp-7` section padding, smaller card
  padding/icon size, wider `entry-actions` gap) instead of reusing the
  desktop `--sp-10`/`--sp-9` values verbatim. The 600px block gives the
  questionnaire, result, calculators, contact, and footer their own
  stacking rules (full-width primary buttons, single-column contact
  and footer, no nested-border padding waste).
- No fixed pixel widths inside any narrow-viewport media-query rule
  that could overflow a 320px viewport (enforced by a test).
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
  name, contact fields).
- No duplicate `id` attributes anywhere in the document (enforced by a
  test).

## 7. Privacy notes

- No network request ever contains user-entered values (the only
  external request is the static Google Fonts stylesheet, already
  present before the redesign).
- No `localStorage`/`sessionStorage`/`document.cookie` writes anywhere.
- No analytics, no tracking pixels, no third-party scripts.
- The contact form is a local-only demo (explicitly labeled as such)
  and never transmits its contents anywhere.
- **Contact-action behavior**: every CTA on the page -- including the
  professional-referral CTA and the result's other CTAs -- is a plain
  `<a href="#contact">` in-page anchor. None of them append assessment
  answers (or any other user-entered text) to the URL, none auto-send
  email, and none claim a submission occurred unless the local-only
  contact form's own explicit "✓ הפנייה נקלטה" demo confirmation is
  shown after the user submits it themselves.

## 8. Explicit anti-patterns (do not reintroduce)

- **Do not reintroduce a second assessment-entry surface ("dual
  start").** The route-entry choice cards exist in exactly one place
  (the Hero). A later section may summarize *how the flow works* (the
  three approved "how it works" steps), but must never repeat the
  Hero's heading, explanation, or route-selection cards as a second
  "beginning" -- this was a real defect found and fixed by product-owner
  review (2026-08 acceptance correction) and must not come back.
- Do not use `--teal`/`--teal-strong` for decorative labels, tags, or
  anything that is not a primary CTA, a selected state, the progress
  bar, or a success confirmation.
- Do not add a login/account control anywhere.
- Do not restore any previously removed section or claim: the public
  tracking/identifier-validation utility (container, AWB, postal,
  courier detection and its search UI), Smart Tracking Import,
  pasted-tracking-text analysis, a sea-transit calculator, standalone
  container/AWB validator tools, an AI chat widget, "500+ customs
  brokers"/provider-network claims, live-tracking claims,
  non-functional document-download buttons, marketplace UI.
- Do not fall back to a vague professional-referral phrase ("מומלץ
  לפנות לגורם מקצועי", "המשך עם איש מקצוע", "גורם מקצועי מומלץ") --
  always name a concrete professional type and a concrete CTA verb.
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
- Do not reuse desktop spacing values verbatim for mobile where they
  are too generous (hero) or too cramped (card gaps, touch targets) --
  give mobile its own values instead (§5).
