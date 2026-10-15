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

**Update (image-led Hero correction, 2026-08):** a second, narrower
product-owner review found that the Hero produced by the acceptance
correction above still read as two competing halves -- a headline on
one side, a large white route-selection card on the other -- rather
than one designed composition, and that its headline wrapped awkwardly
across multiple lines. This was corrected without touching anything
outside the Hero: the split two-column layout and the white
`.choice-card` route-selection card are gone; the Hero is now one
unified, image-led composition over a real port/crane/container-ship
photograph (restored from this product's own pre-redesign asset, not a
new or externally sourced image) with a controlled dark overlay, a
short one-line headline, a two-sentence supporting promise, one
visually dominant primary CTA, one visually subdued secondary action,
and a single compact trust line. See the fully rewritten §3 (Hero) and
§8 (Hero anti-patterns) below; §2's `--radius-surface` token and the
former `.hero-entry`/`.choice-card`/`.hero-benefits`/`.trust-strip`
classes they describe no longer exist in the page and must not be
reintroduced.

**Update (globe Hero redesign, 2026-10, product-owner decision):** the
product owner replaced the image-led Hero with a new composition. The
port photograph is no longer shown (the file
`assets/images/hero-port.jpg` stays in the repository, unused). The
Hero is now: a rotating globe with a plane flying a fixed route (Tel
Aviv - Madrid - New York - Los Angeles - Tokyo - Mumbai - Tel Aviv);
about three seconds in, five illustrative importer questions, styled as
generic social posts with comment and like counts, slide in from the
right and peek over the globe's right edge; an answer line then appears
above the CTAs. The approved eyebrow, headline, supporting sentence,
CTAs and trust line are unchanged. This deliberately supersedes the
earlier "one column, image-led, no two-column layout, no new runtime
dependency, text entrance is the only Hero motion" rules: the new
two-column layout pairs the copy with the globe, never with a white
route-selection card, and the globe uses three small vendored map
libraries plus Natural Earth land data, all local files (no CDN, no
runtime fetch). See §3 (Hero), §2 (Motion), §5 and §8.

## 1. Design principles

1. **One coherent product, not a set of independently designed
   sections.** Every section reuses the same tokens, radii, button
   system, and card system.
2. **Calm and operational, not a marketing brochure.** No decorative
   motion beyond the Hero's one-time, restrained text entrance, no
   inflated claims. The Hero background photograph is the one
   deliberate exception to "no stock photography" -- see §3 (Hero) --
   because a real logistics/port image, treated with a controlled dark
   overlay, communicates the product's domain (international shipping
   to Israel) faster than an abstract gradient, provided it never
   competes with text legibility or turns the page into a marketing
   brochure (no video, no parallax, no rotating imagery).
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
   confirmation, not decoration). **Exception (product-owner decision,
   2026-10-13):** teal may also mark a map destination or geographic
   emphasis, such as the Hero globe's Tel Aviv destination dot.
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
| `--teal` / `--teal-strong` | `#12A594` / `#0E8A7C` | Action teal — **primary CTAs, selected states, progress bar, success confirmation only**; exception: map destination markers / geographic emphasis (product-owner decision 2026-10-13) |
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
- `--radius-surface` (22px): reserved for large surfaces; not
  currently used by the image-led Hero, which has no card of its own
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
state transitions, the progress-bar width transition, the `<details>`
disclosure marker rotation, and the Hero's one-time text entrance (see
below). A global `@media (prefers-reduced-motion: reduce)` block
neutralizes all transitions/animations to ~0ms.

**Hero text entrance animation** (`.hero-anim`, `@keyframes
hero-fade-up`): a restrained, one-time, CSS-only fade + 14px
translate-up, applied via staggered delay classes (`.hero-anim-1`
through `.hero-anim-5`, 0/90/220/340/430ms) to the eyebrow, headline,
supporting sentence, CTA row, and trust line in sequence -- total
sequence under 900ms, `animation-iteration-count` is the implicit
default of 1 (never `infinite`), runs once on page load, never re-runs
on scroll. No letter-by-letter, typewriter, text-scramble, or rotating-
message effect. The animation never blocks interaction: both CTAs are
real, immediately-clickable buttons throughout the sequence (opacity/
transform only, no `pointer-events` changes). A scoped
`@media (prefers-reduced-motion: reduce){ .hero-anim{ animation:none;
opacity:1; transform:none; } }` rule shows everything immediately,
fully formed, with no stagger, on top of the design system's existing
global reduced-motion block.

**Hero globe motion** (2026-10): the globe and plane animate on a
canvas with `requestAnimationFrame`, only while the Hero is on screen
(`IntersectionObserver`). The posts slide in once (CSS transitions),
the answer line fades in once, and the CTA pulse runs twice. The pause
button stops the globe. Under `prefers-reduced-motion: reduce`
(product-owner mobile correction, 2026-10: a still globe read as
broken on phones with that setting on) the globe keeps turning at about
a third of the normal speed, the posts and answer line appear with no
transition -- after the same 2.0s solo-globe wait as everyone else
(2026-10-15 fix: they used to appear at once, which skipped the
cinematic entrance on phones with Reduce Motion on; the wait counts real
elapsed time, not the slowed globe clock) -- and the CTA does not pulse. If the map libraries fail to load, the canvas is
hidden and the posts still appear.

### Focus
One consistent, accessible focus ring: `--focus-ring` (a teal glow +
1.5px teal outline), applied globally via `:focus-visible`.

## 3. Component patterns

### Buttons (`.btn`, `.tool-btn-primary`, `.tool-btn-secondary`, `.btn-text`)
One unified system: primary (teal, filled), secondary (tinted/outline,
ocean text), ghost-on-dark (header), and text-only (`.btn-text`,
underlined, used for tertiary actions like "Reset" and card links).
All buttons are ≥44px tall.

### Hero (`.hero`)
Two columns (product-owner precision pass, 2026-10-13, replacing the
centered globe-first sequence). `.hero-layout` is a CSS grid,
`minmax(0, 1fr) minmax(0, 1.1fr)`. The copy column comes first in the
DOM, so in RTL it is the right-hand column. Under 980px the grid
collapses to one column. **Mobile update (product-owner decision,
2026-10-14), replacing "first on screen, above the fold":** on narrow
screens at least 520px tall, the globe stage is shown first and fills
the viewport under the sticky header (`100vh`, then `100svh`), and the
action column starts exactly at the fold, as a translucent, blurred
panel. While scrolling, the stage stays sticky behind it and fades to a
25% watermark as the panel slides up over it: a CSS scroll-driven
animation (`view-timeline`), or `js/hero/hero-scroll.js` in browsers
without scroll timelines. Opacity only, never a transform, because
`hero-globe.js` sizes its canvas from `getBoundingClientRect()`. The DOM
order stays copy-first for screen readers and keyboards. A decorative
scroll hint ("גללו לחיפוש" over a chevron, `aria-hidden`, not
interactive) sits at the bottom of the stage, beside the pause button
and clear of the fourth post. It appears once the posts have landed,
bounces three times only (never infinitely), and fades out fully over
the first quarter of the scroll, on the same timeline or `--hero-recede`
value as the stage. Short
landscape phones (under 520px tall) keep the stacked layout. Desktop
is unchanged. Pinned by `tests/readiness/hero-mobile-cinematic.test.js`.

1. **Action column** (`.hero-copy`, right): eyebrow → `<h1>` →
   supporting sentence → answer line ("מכירים את השאלות האלה? כאן
   מתחילים לקבל עליהן תשובה.", fades in once the posts arrive) →
   **Composer** → secondary action → trust line.
   - **Composer** (`.hero-composer`): a labelled `<textarea>`
     (`#heroComposerInput`, max 200 characters; label and placeholder
     "איזה מוצר ברצונכם לייבא? פרטו את סוג המוצר או את נושא הבדיקה...",
     product-owner copy decision 2026-10-15) and the primary CTA
     `#readinessStartButton`, "בואו נבדוק" (`.btn .btn-primary .btn-lg`).
     Field and button share a row at 1200px and wider; below that they
     stack. The field shows two lines at every width, and three at 380px
     and below, so the full placeholder always fits (2026-10-15).
   - Behavior (`js/hero/hero-composer.js`, product-owner decision
     2026-10-13): clicking the CTA, or pressing Enter in the field, copies
     the trimmed text into the assessment's existing `#irProductName`
     field, then the CTA opens the assessment through its existing
     handler. An empty field just opens the assessment. The matching
     engine and controller are unchanged; the text never leaves the page
     and is not stored.
   - Secondary action `#readinessProblemShortcutButton` ("יש לי בעיה
     במשלוח קיים") is unchanged and does not read the Composer.
2. **Visual column** (`.hero-stage`, left): a square stage that clips its
   contents. The globe canvas (`js/hero/hero-globe.js`, Natural Earth
   1:110m, navy/ocean/sea-green) fills it; the plane, drawn 1.3x its
   original size, flies the fixed great-circle route Tel Aviv - Madrid -
   New York - Los Angeles - Tokyo - Mumbai - Tel Aviv. The current leg is
   drawn as a route line at flight altitude (dashed mint ahead, solid
   behind), and Tel Aviv is marked as the destination: a teal dot with a
   mint ring and the label "Tel Aviv · Israel".
3. **Illustrative posts:** four of the approved questions (the
   supplier-search post was removed as outside the product's scope).
   All four cards (ליטל מלמד, איציק עובדיה, אריק שאולוב, זיו ישראל) are
   fully visible inside the stage at every width (hotfix 2026-10-13: the
   earlier cut-off, masked fourth post read as a display bug; the
   `hero-post-partial` class stays in the markup but nothing styles it).
   Under 980px the stage is taller than it is wide (4:5, and 4:7 at 380px
   and below) with the globe square and centered, so the four smaller
   cards never overlap; at 380px and below the counts get their own line. Odd posts sit on the
   right and come in from the right; even ones sit on the left and come
   in from the left; they start 2.0s in (product-owner decision,
   2026-10-15: a longer solo-globe entrance), 0.3s apart, and are all in place
   1.4s later. Generic white cards, no social-network branding, a
   "דוגמאות להמחשה" note.

A 44px pause/play button (`.hero-globe-toggle`) sits in the globe column's
bottom-right corner at every width, clear of the fourth post (hotfix
2026-10-13; it used to be centered under the globe).
Sizing is content-driven, never `100vh`.

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

- Breakpoints: 980px (two-column layouts collapse to one column:
  cards, steps, contact, footer; the Hero becomes the scroll-driven
  "cinematic" layout on screens at least 520px tall -- globe first at
  full viewport height, the action column and Composer at the fold
  sliding up over it, see "Hero" above -- and stacks with the action
  column first on shorter ones), 768px (a
  **dedicated mobile-density pass** -- see below, not just "does the
  desktop layout fit"), 600px (narrow-viewport structural rules:
  stacked form fields, full-width primary actions, single-column
  footer), and 380px (slightly tighter Hero post padding only).
- The mobile nav menu (`#mobileMenu`) replaces the inline nav links
  under 900px, toggled by a 44×44px button with `aria-expanded`. The
  header contact action (`.nav-actions .btn-ghost-onDark`) is hidden
  under 900px in favor of the contact link already present inside the
  mobile menu, so mobile never shows two competing header controls.
- **Mobile density is a deliberate pass, not a reused desktop layout**:
  the 768px block gives the Hero its own `min-height` (content-driven,
  ~540px floor; only the 2026-10-14 cinematic globe stage uses a
  viewport height, `100svh`), a stacked full-width primary CTA
  (`#readinessStartButton{ width:100%; }`), and a centered secondary
  action, instead of reusing the desktop values verbatim. The 600px
  block gives the questionnaire, result, contact, and footer their own
  stacking rules (full-width primary buttons, single-column contact and
  footer, no nested-border padding waste).
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
- (The `role="tablist"` calculator tabs referenced in an earlier version
  of this doc no longer exist on the homepage — the operational
  calculators were removed from the homepage on 2026-08-16 and restored
  the same day on a dedicated `tools.html` page, which keeps the same
  `role="tablist"`/`role="tab"`/`role="tabpanel"` tab-bar pattern; see
  `docs/DATA_FLOW_INVENTORY.md`.)
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
  start").** The Hero's primary CTA and secondary action are the only
  assessment-entry controls on the page. A later section may summarize
  *how the flow works* (the three approved "how it works" steps), but
  must never repeat the Hero's heading, explanation, or entry controls
  as a second "beginning" -- this was a real defect found and fixed by
  product-owner review (2026-08 acceptance correction) and must not
  come back.
- **Do not reintroduce the split two-column Hero ("headline vs. a
  competing white form card").** A headline on one side and a large
  white `.hero-entry`/`.choice-card` route-selection block on the other
  read as two unrelated products. The 2026-10-13 Hero is two columns by
  product-owner decision: the action column (copy + Composer) and the
  globe column. The globe column never holds an entry form; the Hero's
  only entry controls stay the Composer CTA and the secondary action in
  `.hero-copy`.
- **Keep all four posts fully visible inside the globe column.** Do not
  cut a post off at the stage edge or fade it with a mask: product-owner
  review (hotfix 2026-10-13) found that it reads as a display bug. Do not add
  social-network logos, brand colors or names to them, and keep the
  "דוגמאות להמחשה" label.
- **Do not let the Hero headline wrap onto 3+ lines** (desktop: 1 line
  where space allows; anywhere else: at most 2 intentional lines). The
  approved headline ("לפני שמייבאים, בודקים.") is deliberately short
  for exactly this reason -- do not lengthen it back toward a
  multi-clause sentence.
- Do not use `--teal`/`--teal-strong` for decorative labels, tags, or
  anything that is not a primary CTA, a selected state, the progress
  bar, a success confirmation, or (the 2026-10-13 exception) a map
  destination marker / geographic emphasis such as the Hero globe's
  Tel Aviv dot.
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
- **Do not re-embed any Hero image as inline base64, or load Hero
  assets from another origin.** The globe's libraries and land data are
  local files in `assets/vendor/` (licenses in
  `assets/vendor/LICENSES.md`), loaded with `defer` so they never block
  the assessment; no CDN, no runtime fetch.
- Do not add rotating/typewriter/scrambling text effects, video,
  WebGL, autoplay media, or parallax to the Hero or anywhere else. The
  Hero's motion is limited to the one-time text entrance, the canvas
  globe (on screen only), the one-time post slide-in and answer-line
  fade, and the twice-run CTA pulse. Under `prefers-reduced-motion:
  reduce` the slide-in, fade and pulse are dropped and the globe slows
  to about a third of its speed, but the posts still wait the same 2.0s;
  the pause button stops it and shows the posts at once (§2).
- Do not size the Hero with `100vh` or otherwise let it become an
  oversized full-screen section -- it uses an intentional `min-height`
  per breakpoint (§3).
- Do not add a UI framework, icon font, animation library, or any new
  runtime dependency to satisfy a purely visual requirement — this is
  a zero-build, inline-styled page by design. The one exception is the
  Hero globe's vendored map code (d3-array, d3-geo, topojson-client)
  and land data, approved by the product owner in 2026-10; it is not a
  precedent for adding others.
- Do not let any control fall below a 44px touch target.
- Do not communicate state with color alone (status blocks always pair
  color with an icon and/or text).
- Do not reuse desktop spacing values verbatim for mobile where they
  are too generous (hero) or too cramped (card gaps, touch targets) --
  give mobile its own values instead (§5).
- **Hidden sections must not reserve layout height.** A section/container
  that is inactive must be hidden with a mechanism that actually
  collapses its box (the native `hidden` attribute, or a class that
  sets `display:none`) -- never `visibility:hidden` or `opacity:0`
  alone, which keep the element's full height in the document flow and
  leave an unexplained blank gap below whatever precedes it. This was a
  real defect found by product-owner review (2026-08 Hero-to-assessment
  transition fix): the `#readiness` section's own padding was left
  behind as an empty gap below the Hero because only its inner
  form/result were toggled this way, not the section wrapper itself.
  When a container's visibility is tied to a JS controller (as
  `#readiness` is), keep the *whole* container -- not only its inner
  pieces -- hidden/shown in lockstep with the controller's active
  state.
