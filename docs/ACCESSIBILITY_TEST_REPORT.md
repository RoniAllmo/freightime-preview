# Accessibility Test Report (2026-08-16)

> **Historical note (2026-08-16, later changes):** the operational
> calculators referenced below ("calculators", "tool tabs", "calculator
> inputs") were removed from the homepage in a subsequent change the same
> day, then restored the same day on a dedicated `tools.html` page by a
> further product-owner correction. This section is preserved as a
> historical record of the run that produced it against the then-current
> homepage; it does not describe the current homepage body (which is now
> calculator-free) or the new `tools.html` page. See the "Restore
> calculators as dedicated tools" PR description and the addendum at the
> end of this document for the current-state accessibility validation of
> `tools.html`, and `docs/DATA_FLOW_INVENTORY.md` for the current
> calculator data-flow record.

## Test environment

- Browser: Chromium (Playwright-driven headless build, `chromium-1194`)
- Viewports tested: 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920px width
- Pages tested: `index.html`, `accessibility-statement.html`,
  `privacy-policy.html`, `terms-of-use.html`
- Assistive technology: **none genuinely installed in this environment.**
  No screen reader (NVDA/JAWS/VoiceOver or a Linux equivalent such as
  Orca) was found available to run. **Screen-reader testing was NOT
  performed.** What was performed instead: automated inspection of the
  accessibility tree via Playwright's `ariaSnapshot()` API and manual
  review of ARIA attributes, roles, and labels in the source markup. This
  is explicitly not equivalent to human screen-reader testing and must
  not be represented as such.
- Method per check: automated (Playwright script) unless noted "manual
  source review."

## Scope

Builds on, and does not repeat, the professional-referral-specific
accessibility work already completed in PR #25
(`tests/readiness/professional-routing-quality-gate.test.js`). This pass
covers the whole site: Hero, header/nav, trust strip, assessment
questionnaire, results, calculators, contact section, and the three new
legal pages and footer links added in this change.

## Checks performed and results

| Check | Method | Result |
|---|---|---|
| Semantic landmarks (header/nav/main/footer) present on every page | Automated (ariaSnapshot) | Pass — `banner`, `navigation`, `main`, `contentinfo` present on index.html; `main`/`contentinfo` present on the 3 legal pages |
| `lang`/`dir` correctness | Manual source review | Pass — every page declares `lang="he" dir="rtl"` |
| Heading hierarchy (no skipped levels, single H1) | Automated (regex over headings) | Pass on all 4 pages; index.html: H1 → H2 → H3 nested correctly, no level skips |
| Skip link present and functional | Automated (Playwright: first Tab focuses skip link; Enter/href resolves to `#main`) | Pass on all 4 pages |
| Keyboard-only navigation, 80-tab trail on index.html | Automated (Playwright keyboard simulation) | Pass — 0 instances of lost focus (`document.activeElement` null) across 80 Tab presses; encountered nav links, CTA buttons, tool tabs, form inputs, calculator inputs, service-card links, contact form fields, footer legal links in a sane DOM order |
| Keyboard activation of new footer legal links | Automated (focus + Enter) | Pass — focusing `footer a[href="accessibility-statement.html"]` and pressing Enter navigated to the correct page |
| Duplicate `id` attributes | Automated (regex across index.html and all 3 legal pages) | Pass — none found |
| `aria-controls` / `aria-labelledby` references resolve to real ids | Automated (regex, extended to legal pages) | Pass |
| Decorative icon accessible-name pollution | Automated (ariaSnapshot showed 3 unlabeled `img` roles for the service-card SVGs) | **Defect found and fixed** — see below |
| Focus visibility (`:focus-visible` ring not disabled anywhere new) | Manual source review + reuse of existing pattern | Pass — new pages import the same `:focus-visible{ box-shadow:var(--focus-ring) }` token pattern |
| `prefers-reduced-motion` respected | Automated (Playwright `reducedMotion: 'reduce'` context + `matchMedia` check) | Pass — media query still resolves true and the existing global reduced-motion CSS block is unmodified |
| Horizontal overflow at 10 viewport widths × 4 pages (40 combinations) | Automated (`scrollWidth > clientWidth` check) | Pass — 0 overflow found in any combination |
| Zoom reflow at 200% | Automated (CSS `zoom` property simulation at 1280px viewport) | Pass — no overflow detected |
| Zoom reflow at 400% | Automated (CSS `zoom` property simulation at 1280px viewport) | **Overflow detected — see limitation below** |
| Cookies/browser storage after page load (all 4 pages) | Automated (Playwright `context.cookies()`, `localStorage`/`sessionStorage` key enumeration) | Pass — 0 cookies, 0 storage keys on every page |
| Touch targets ≥44px on primary actions | Manual source review + reuse of existing `.btn`/`.btn-text` conventions | Pass on pre-existing controls; footer legal links given `min-height:44px` in this change |
| Console errors during load | Automated (console listener) | The only error observed was the test harness's own deliberate blocking of the external Google Fonts request (`net::ERR_FAILED`), not an application defect |

## Defects found and fixed

1. **Unlabeled decorative icons surfaced to assistive technology.** The
   three "מסלולי שירות מקצועי" service-card SVG icons had no
   `aria-hidden` attribute, unlike the header's brand mark and hamburger
   icon which already use `aria-hidden="true"` correctly. This meant
   assistive technology could announce three unlabeled "image" elements
   with no accessible name. **Fixed** by adding
   `aria-hidden="true" focusable="false"` to all three, matching the
   codebase's own existing pattern (no new convention invented).

2. **Contact-form status message not announced to assistive technology.**
   The success/status `<span>` (`#cfSuccess`) becomes visible via a
   `style.display` toggle but had no `aria-live`/`role` wiring, so
   screen-reader users would not hear it automatically. **Fixed** by
   adding `role="status" aria-live="polite"`, matching the existing
   `aria-live="polite"` pattern already used elsewhere on the page (e.g.
   `#readinessStepIndicator`, tool result panels).

## Unresolved limitations

- **No human screen-reader testing was performed** (see Test environment
  above). This is the single most important limitation of this report.
- **400% zoom overflow**: simulating browser zoom via the CSS `zoom`
  property (not a real browser "Ctrl/Cmd +" zoom) scaled all content
  uniformly without triggering the page's responsive breakpoints the way
  a real browser zoom / a narrower device viewport would. The resulting
  overflow at simulated 400% therefore may be a test-methodology
  artifact rather than a genuine WCAG 1.4.10 (Reflow) failure — real
  browser zoom typically re-triggers CSS media queries the way a
  narrower physical viewport does, and the site already passes
  overflow checks down to a genuine 320px viewport with no zoom. This
  needs verification with real browser zoom (not simulated) before being
  treated as a confirmed defect either way.
- **No numeric color-contrast measurement** was performed (e.g. exact
  contrast ratios for every text/background combination). The color
  tokens in `DESIGN_SYSTEM_V1.md` appear to target AA contrast by
  design, but this was not independently measured pixel-by-pixel in this
  pass.
- **No physical accessibility testing** (this is a web-only, no
  physical-location product; not applicable).

## Addendum (2026-08-16): tools.html restoration validation

Following the product-owner correction restoring the CBM and air
chargeable-weight calculators on a dedicated `tools.html` page (Header +
Footer links, homepage body stays calculator-free), a fresh
Playwright/Chromium pass validated `index.html` and `tools.html`
together:

| Check | Method | Result |
|---|---|---|
| No horizontal overflow at 320/375/430/768/1024/1440/1920px, both pages | Automated (`scrollWidth` vs `clientWidth`) | Pass — 0 overflow in any of the 14 combinations |
| Homepage has no calculator section/heading/`#tools`/inputs | Automated (DOM query + text search) | Pass |
| Header "כלים" link present, correct text, navigates to `tools.html` | Automated (click + URL assertion) | Pass |
| Mobile menu mirrors the "כלים" link | Automated (toggle + query) | Pass |
| Footer links to `tools.html#cbm` and `tools.html#chargeable-weight` | Automated (DOM query) | Pass |
| Hero H1, assessment-reveal-on-CTA, and the honest contact pre-launch message are all unchanged | Automated (text/state assertions) | Pass |
| `tools.html` H1 is exactly "כלים ומחשבונים" | Automated | Pass |
| CBM valid calculation (120×80×100cm ×1 → 0.96 CBM) and a decimal-dimension case | Automated (fill + click + read result) | Pass |
| CBM invalid input shows an accessible error; reset clears fields and hides result | Automated | Pass |
| Keyboard-only: Tab reaches the air-weight tab button, Enter opens its panel, Tab continues into `#cbmLength` with a visible `:focus-visible` ring (verified via `el.matches(':focus-visible')` and a real Chromium keyboard-Tab trail — not a programmatic `.focus()` call, which does not reliably trigger `:focus-visible` in Chromium and produced one false-negative during scripting that was independently re-verified) | Automated (Playwright keyboard simulation) | Pass |
| Air chargeable-weight: volumetric-dominant case (40kg actual, 120×80×100cm → 160kg volumetric, controlling factor "המשקל הנפחי") and gross-weight-dominant case (500kg actual, 30×30×30cm → controlling factor "המשקל בפועל") | Automated | Pass |
| Air chargeable-weight invalid input shows an accessible error; reset clears fields | Automated | Pass |
| `aria-live="polite"` on both result containers, `role="alert" aria-live="assertive"` on both error containers | Automated | Pass |
| No duplicate ids on `tools.html` | Automated (regex/DOM query) | Pass |
| `tools.html` is `lang="he" dir="rtl"` | Automated | Pass |
| Working link back to `index.html#readiness`; working footer links to all three legal pages | Automated | Pass |
| No network request carries a calculator value; no URL mutation with calculator values; `localStorage`/`sessionStorage` empty and no cookies after full calculator use | Automated (request-log inspection + storage read) | Pass |
| Zero console errors during the full interaction flow | Automated | Pass, **with one caveat**: Google Fonts (`fonts.googleapis.com`) requests fail with `net::ERR_CONNECTION_RESET` in this sandboxed test environment (no outbound access to that host) on **every** page, including the pre-existing `index.html`, `accessibility-statement.html`, etc. — this is a test-environment network restriction, not a regression introduced by this change, and the page already degrades gracefully to the system font stack when the webfont fails to load. |
| `#cbm` and `#chargeable-weight` Footer deep links correctly select/reveal the matching panel and tab on load | Automated (goto with hash + DOM query) | Pass |

Scope of this addendum: `index.html` (Header/Footer additions only, rest
of the homepage unchanged) and the new `tools.html` page. It does not
repeat the full whole-site pass already documented above; see that
section's "Known limitations" (no human screen-reader testing, no
numeric contrast measurement) which apply equally to `tools.html`.
