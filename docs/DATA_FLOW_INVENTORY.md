# Data-Flow Inventory (Verified 2026-08-16)

Category legend used throughout: **(A)** user-provided information,
**(B)** technical info generated automatically, **(C)** info processed
only in-browser, **(D)** info transmitted to FreighTime infrastructure,
**(E)** info transmitted to third parties, **(F)** info retained after
session, **(G)** info that may exist in hosting/infrastructure logs
(acknowledged but not independently inspectable from this repository).

Method: static code review (grep across `index.html` and every `js/`
file) plus a live Playwright/Chromium run against the site served locally
(`python3 -m http.server`), recording every network request, console
message, cookie, and browser-storage key. See
`docs/ACCESSIBILITY_TEST_REPORT.md` for the same run's accessibility
findings.

## Import-readiness questionnaire (A, C)

- User-provided free-text answers (product description, HS code guess,
  quantity, value, etc.) and multiple-choice selections. **(A)**
- All processed by `js/import-readiness/*.js` entirely client-side. No
  `fetch`, `XMLHttpRequest`, `sendBeacon`, or `WebSocket` call exists
  anywhere in `js/import-readiness/`. **(C)**
- No `localStorage`, `sessionStorage`, or `indexedDB` write exists in
  `js/import-readiness/` (grep-verified; also asserted by the existing
  `tests/readiness/professional-routing-quality-gate.test.js` and the new
  test in this change). **(F: none observed)**
- No answer is ever concatenated into a URL, `location.hash`,
  `location.search`, or `URLSearchParams` (grep-verified; pre-existing
  test 9 in `professional-routing-quality-gate.test.js` already covers
  this and remains green). **(D/E: none observed for this flow)**

## Operational calculators (C) — restored on a dedicated tools page

The CBM and air-chargeable-weight calculators
(`js/tools/cbm-calculator.js`, `js/tools/air-chargeable-weight-calculator.js`,
`js/tools/tools-controller.js`) were removed from the homepage on
2026-08-16, then restored the same day by a product-owner correction: the
original removal was broader than intended. They are back, unchanged in
formula/validation/reset/result-wording behavior, but relocated to a
standalone page, `tools.html`, reached from a Header nav item ("כלים")
and two Footer links ("מחשבון CBM", "מחשבון משקל לחיוב אווירי") — they are
**not** wired into `index.html`'s homepage body/scrolling journey, and
`index.html` does not import the controller module.

- User-provided dimensions, quantities, gross weight, and volumetric
  divisor. **(A)**
- All processed by `js/tools/*.js` entirely client-side. No `fetch`,
  `XMLHttpRequest`, `sendBeacon`, or `WebSocket` call exists anywhere in
  `js/tools/` (grep-verified; also asserted by
  `tests/tools/tools-controller.test.js` and
  `tests/tools/tools-page.test.js`). **(C)**
- No `localStorage`, `sessionStorage`, `indexedDB`, or cookie write
  exists in `js/tools/` or `tools.html` (grep-verified). **(F: none
  observed)**
- No calculator input or result is ever concatenated into a URL,
  `location.hash`, `location.search`, `URLSearchParams`, or
  `history.pushState`/`replaceState` (grep-verified). The only URL
  fragments the tools page reads are the Footer's own static
  `#cbm`/`#chargeable-weight` deep links, used only to select which
  panel is shown — never to carry calculator data. **(D/E: none
  observed)**
- No `console.log`/`console.info`/`console.warn`/`console.error` of a
  calculator input or result exists anywhere in `js/tools/`.

## Contact section (A — but not currently collected or transmitted anywhere)

- The public contact section no longer contains a form. It shows an
  honest, static pre-launch message ("אפשרות לפנייה מקצועית תתווסף לפני
  השקת השירות לציבור") because no approved real contact channel exists
  yet. **(A: none collected — nothing is entered or transmitted.)**
- This corrects a previous defect where the section displayed raw
  compliance placeholders (e.g. `[להשלמה לפני פרסום: מספר טלפון]`) next to
  an inactive demo form in a way that could be mistaken for a real
  working contact method. The underlying compliance blockers themselves
  are unchanged and remain fully documented in
  `docs/PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md` and in the legal draft
  pages' own placeholders — this only changes what the public homepage
  displays.

## Third-party requests (E)

Live Playwright run of `index.html` recorded exactly one third-party
(non-same-origin) request:

- `https://fonts.googleapis.com/css2?family=Rubik:wght@500;600;700&family=Assistant:wght@400;500;600;700&display=swap`
  — Google Fonts stylesheet, pre-existing (not added by this change).
  Loading a remote stylesheet exposes the visitor's IP address and
  request metadata to Google, per Google's own privacy policy. This is
  the only third-party service identified anywhere on the site. **(E)**

No analytics script, tracking pixel, ad script, CDN-hosted JS library,
embedded iframe, or remote image was found in `index.html` or any file
under `js/`.

## Browser storage and cookies (B/F)

- Live Playwright check of `document.cookie` equivalent (via
  `context.cookies()`) after a full page load: **empty array**.
- Live Playwright check of `localStorage`/`sessionStorage` keys after a
  full page load: **both empty**.
- No Service Worker registration and no Cache Storage usage found in
  `index.html` or `js/`.

## Console and error output (B)

- The only console message observed during the live run was a
  `net::ERR_CONNECTION_RESET` for the Google Fonts request, caused by the
  sandboxed test environment having no outbound internet access — not a
  defect in the site itself. No application code logs assessment answers,
  contact-form input, or any other user-provided value to the console
  (grep-verified: no `console.log`/`console.error` calls reference
  questionnaire or contact-form variables anywhere in `js/` or the inline
  scripts).

## Hosting/infrastructure-level metadata (G — acknowledged, not verifiable from here)

This repository is a static site. Whatever host ultimately serves it
(the repository's own `.github/workflows/frontend-ci.yml` only runs
tests/syntax-checks — it does not itself deploy anywhere; no
Pages-deploy workflow or `CNAME` file exists in this repository as of
this audit) will very likely keep its own server/access logs containing
visitor IP addresses, timestamps, and requested paths, as essentially all
web hosts do. **This inventory cannot inspect those logs and does not
claim they contain zero data.** Any privacy-policy statement claiming
"we collect nothing" must be read as scoped to the FreighTime application
code that was actually audited here — not as a claim about the hosting
platform's own infrastructure-level logging.

## Existing privacy-adjacent claims verified against this inventory

`index.html` states (Hero area): "חינם · ללא הרשמה · המידע אינו נשמר"
(free, no signup, information is not saved). This statement was checked
against this inventory and is **consistent with verified behavior** for
the questionnaire (no transmission, no storage observed) — it was left
unchanged. It should not, however,
be read as a claim about hosting-level metadata (see the (G) section
above), which the new privacy-policy draft states explicitly and which
these short on-page claims do not contradict since they only describe the
audited application behavior.
