# Privacy & Tracking Audit (2026-08-16)

Summary of Phase 9 (consumer transactions / marketing / cookies) and
Phase 11 (basic frontend security) findings. See
`docs/DATA_FLOW_INVENTORY.md` for the full technical trace.

## Cookies and storage

- **Cookies found: none.** Verified live via Playwright (`context.cookies()`
  returned an empty array on `index.html` and all three new legal pages).
- **Browser storage found: none.** `localStorage` and `sessionStorage`
  both empty on every page tested. No `localStorage`/`sessionStorage`/
  `indexedDB` reference exists in any `.js` file in the repository (grep-
  verified).
- **Classification:** N/A — there is nothing to classify as strictly-
  necessary/preference/analytics/advertising because no cookie or storage
  item exists.
- **Decision:** No cookie-consent banner added. Adding one for a site with
  zero cookies/tracking would itself be misleading UI. If nonessential
  tracking is ever added later, a consent mechanism must be built before
  it ships, not after.

## Analytics / tracking pixels / marketing

- **Analytics found: none.** No `gtag`, Google Analytics, GTM, Meta
  Pixel, Hotjar, Mixpanel, Segment, or similar reference anywhere in
  `index.html` or `js/` (grep-verified; also asserted by
  `tests/readiness/israeli-compliance-readiness.test.js`, test 17).
- **Tracking pixels found: none.**
- **Newsletter / SMS / WhatsApp / email marketing consent: none exists.**
  No signup form, no consent checkbox, no marketing list integration.
- **Remarketing / marketing pixels: none.**
- **Decision:** No marketing/consent system added — none is needed
  because no such feature exists. Should one be added in the future, it
  requires its own consent/sender-ID/unsubscribe audit before going live
  (see "Future requirements" below).

## Consumer transactions

- The site does not sell anything, does not display a price, does not
  accept payment, does not create a paid booking, and does not promise a
  specific delivery timing. It is a free self-check tool. **Verified —
  this is not implemented, not partially implemented, and no UI implies
  otherwise.** (Note: the operational calculators mentioned elsewhere in
  this audit were removed from the homepage on 2026-08-16 and restored the
  same day on a dedicated `tools.html` page, per product-owner correction —
  they remain local-only, client-side-only, with no data flow of their
  own; see `docs/DATA_FLOW_INVENTORY.md`.)
- **Decision:** No cancellation/refund flow added (none is applicable).
  A forward-looking "future-sale-readiness checklist" is documented below
  instead of any implemented transaction UI.

## Future-sale-readiness checklist (documentation only — not implemented)

If FreighTime ever begins selling a paid service, displaying a price, or
accepting payment, the following must exist **before** launch, in
addition to everything else in this compliance pass:

- [ ] Verified operator identity (replacing every current placeholder)
- [ ] Full, itemized service description
- [ ] Full price disclosure including all mandatory taxes/fees
- [ ] Clear payment terms
- [ ] Clear delivery/turnaround timing commitments
- [ ] Cancellation rights disclosure (per Israeli Consumer Protection Law)
- [ ] Refund terms
- [ ] A retained transaction record mechanism for the consumer
- [ ] Real, verified support contact details
- [ ] An accessible cancellation method (not buried, not requiring
      unreasonable steps)
- [ ] A privacy notice specifically covering payment-data handling
- [ ] Clear separation between marketing communications and required
      transactional communications, with an unsubscribe path for the
      former

None of this is implemented in this change. If a transacting flow is
ever found to already exist unexpectedly, work must stop and it must be
reported as a blocker rather than patched ad hoc — this audit confirmed
no such flow currently exists.

## Basic frontend security findings (Phase 11)

| Area | Finding |
|---|---|
| HTTPS | Cannot be enforced from a static repository; this is a hosting-layer concern. Documented as a hosting-level action item, not fixed here. |
| Mixed content | No `http://` resource references found; the only external resource (Google Fonts) is loaded over `https://`. |
| `target="_blank"` + `rel` | No `target="_blank"` link exists anywhere in `index.html` or the three new legal pages (grep-verified), so there is no `rel="noopener noreferrer"` gap to fix. |
| CSP feasibility | A repository-level `<meta http-equiv="Content-Security-Policy">` tag was considered but **not added**, because a `<meta>`-based CSP cannot set `frame-ancestors` or several other directives reliably, and this repo could not verify from within this session whether GitHub Pages (or whatever the actual host is) would need any adjustment for it to behave as expected. Documented as a hosting-level gap rather than guessed at. |
| Referrer-Policy / Permissions-Policy | Cannot be set via response headers from a static repository without knowing the actual hosting configuration; documented as a hosting-level action item. |
| Exposed secrets | Grep across the full repository for API-key/token-shaped strings found none. |
| Source maps | None present; there is no build step. |
| Dependency risk | The site remains framework-free with zero runtime dependencies (confirmed: no `package.json` dependency list exists at the repo root; the scratch-only Playwright install used for this audit's testing was never added to any tracked file and was removed after use). |
| Console logging of sensitive data | None found — no questionnaire answer, contact-form input, or other user-provided value is ever passed to `console.log`/`console.error` (grep-verified). |
| Clipboard behavior | Not modified in this change; out of scope for this pass beyond confirming no new clipboard write was introduced. |
| URL leakage | No questionnaire answer or contact-form value is ever concatenated into a URL/hash/query string anywhere in the codebase (grep-verified; extends the pre-existing assertion in `tests/readiness/professional-routing-quality-gate.test.js`). |

No security certification is claimed anywhere in this repository as a
result of this audit.
