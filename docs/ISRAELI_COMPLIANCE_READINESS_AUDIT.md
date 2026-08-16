# Israeli Compliance-Readiness Audit (2026-08-16)

This is the top-level audit document for the compliance-readiness pass.
It indexes the other documents in `docs/` and summarizes scope,
methodology, and category discipline. **Nothing in this document, or in
any linked document, constitutes legal advice or a compliance
certification.**

## Category discipline used throughout

- **(A) Verified current fact** — directly observed via source-code
  review and/or a live Playwright/Chromium run against the site.
- **(B) Technical implementation detail** — how something is built,
  not a legal conclusion.
- **(C) Legal interpretation requiring professional review** — every
  legal-sounding statement in the draft pages falls here unless marked
  otherwise; none of it is a final legal position.
- **(D) Missing business information** — real-world facts about the
  operator that are genuinely unknown and represented only by the
  approved bracketed placeholder format.
- **(E) Future requirement, only activated by sales/marketing/data
  collection** — documented for readiness, not implemented, because the
  triggering feature does not currently exist.

## Documents in this set

| Document | Covers |
|---|---|
| `docs/ISRAELI_COMPLIANCE_READINESS_AUDIT.md` (this file) | Top-level index and methodology |
| `docs/SOURCE_REGISTER.md` | Official Israeli sources actually consulted, with URLs and access dates |
| `docs/DATA_FLOW_INVENTORY.md` | (A)/(B) — what data actually flows where, verified via code review + live browser run |
| `docs/ACCESSIBILITY_TEST_REPORT.md` | (A)/(B) — accessibility test environment, checks, defects found/fixed, unresolved limitations |
| `docs/PRIVACY_TRACKING_AUDIT.md` | (A) — cookies/storage/analytics/marketing/transaction findings, (E) future-sale-readiness checklist |
| `docs/PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md` | (D) — the full placeholder registry with owners and blocking status |

## Legal scope covered (principles referenced, not legal conclusions — (C) throughout)

- Privacy: Privacy Protection Law, 5741-1981 (חוק הגנת הפרטיות)
- Accessibility: Equal Rights for Persons with Disabilities Law,
  5758-1998, and the Equal Rights for Persons with Disabilities
  (Accessibility Accommodations for Service) Regulations, 5773-2013,
  informed by the principles of Israeli Standard 5568 (based on WCAG)
- Consumer protection: Consumer Protection Law, 5741-1981 (חוק הגנת
  הצרכן) — referenced only for the non-waiver clause in the terms-of-use
  draft and the future-sale-readiness checklist, since the site does not
  currently sell anything

See `docs/SOURCE_REGISTER.md` for the specific URLs consulted for each of
these.

## What this pass explicitly does NOT claim

- Full legal compliance with any Israeli law.
- Formal accessibility certification or an accessibility exemption.
- That a Data Protection Officer or accessibility coordinator has been
  appointed (neither has).
- That no commercial relationship exists between FreighTime and any
  professional-category service provider (unverified — see the
  placeholder in `terms-of-use.html` and row 9 of the pre-publication
  checklist).
- That zero data of any kind exists anywhere, including at the hosting/
  infrastructure layer (explicitly acknowledged as unverifiable — see
  `docs/DATA_FLOW_INVENTORY.md`'s hosting-metadata section).
- Any security certification.

## What this pass changed on the live site (becomes public after merge)

If this branch is merged to `main`, the following becomes publicly
reachable (this repository has no GitHub Pages deploy workflow of its
own — see `.github/workflows/frontend-ci.yml`, which only runs tests/
syntax-checks — so actual publication depends on however the hosting
platform is configured outside this repository; this is documented, not
assumed):

- Three new pages: `accessibility-statement.html`, `privacy-policy.html`,
  `terms-of-use.html` — each visibly labeled as a draft with the exact
  required notice, each containing explicit bracketed placeholders for
  every unresolved real-world detail.
- New footer links on `index.html` pointing to the three pages above.
- Corrected contact-section text (a pre-existing fabricated-looking phone
  number and email in the contact section were replaced with explicit
  bracketed placeholders; the demo form's previously misleading "we'll
  get back to you" success message corrected to state plainly that the
  channel is not active yet — see `git log` / the PR diff for the exact
  prior values that were removed).
- Three decorative service-card icons now correctly marked
  `aria-hidden="true"`.
- The contact-form status message now announced via `role="status"
  aria-live="polite"`.

This is intentional and expected: publishing clearly-labeled draft legal
content pending finalization is normal practice, not a security leak of
hidden content. No `noindex` meta tag was added to these pages; if one
is added later it should be understood purely as a search-engine hint,
never as an access-control mechanism.

## What this pass did NOT change

- The Hero image, its layout, and its visual presentation (audited for
  IP-license status only — see the placeholder in `terms-of-use.html`
  and row 10 of the pre-publication checklist).
- Professional-referral routing logic and CTAs (`href="#contact"`
  literal targets, category-only framing — unchanged, already covered by
  the pre-existing `tests/readiness/professional-routing-quality-gate.test.js`).
- The CBM and air-chargeable-weight calculators were removed entirely in
  a later change (2026-08-16, product-owner decision) — see
  `docs/DATA_FLOW_INVENTORY.md`. Not applicable to this earlier audit
  pass.
- The backend repository at `/home/user/freightime-tracking-api`
  (untouched, read-only re-verified — see the PR description for the
  before/after HEAD and test-count confirmation).
- No deployment was performed as part of this task.
