# Legal Content Status

| Page | Status | What it is | What it is NOT |
|---|---|---|---|
| `accessibility-statement.html` | **Draft** — visibly labeled with the required draft notice | An honest description of what accessibility testing was actually performed (automated + source review, no screen reader, no certified auditor), what was fixed, and known limitations | Not a certified accessibility audit result; not proof of legal compliance; does not claim an appointed accessibility coordinator |
| `privacy-policy.html` | **Draft** — visibly labeled with the required draft notice | A description of verified data-flow behavior (see `docs/DATA_FLOW_INVENTORY.md`) with explicit placeholders for unresolved operator/contact identity | Not a legally reviewed final privacy policy; does not claim a registered database exists or that a DPO is appointed |
| `terms-of-use.html` | **Draft** — visibly labeled with the required draft notice, plus per-clause `[נדרשת בדיקה משפטית לפני פרסום]` markers on the reliance and governing-law clauses | A structurally complete terms-of-use draft covering the required topics, with measured (not absolute) liability language | Not final terms; the reliance/liability and governing-law clauses explicitly require legal review before publication as final |

Every draft page:

- Carries the exact required Hebrew draft notice at the top.
- Uses only the approved bracketed placeholder format for missing
  real-world details (`[להשלמה לפני פרסום: ...]` /
  `[נדרשת בדיקה משפטית לפני פרסום]`).
- Is listed, with every individual placeholder, in
  `docs/PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md`.
- Was written as original text informed by the principles in
  `docs/SOURCE_REGISTER.md` — no text was copied from any other site's
  privacy policy, terms of use, or accessibility statement.

## Sign-off required before any of these three pages can be presented as
final, non-draft content

1. Product owner supplies every missing real-world detail listed in
   `docs/PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md`.
2. Legal counsel reviews the reliance/liability clause and the governing-
   law/jurisdiction clause in `terms-of-use.html`, and reviews the full
   set of three pages generally.
3. A professional accessibility review (ideally including genuine screen-
   reader testing, which this pass explicitly could not perform) replaces
   or confirms the accessibility-statement's self-reported testing scope.
4. The commercial-relationship question (row 9 of the pre-publication
   checklist) is answered definitively, one way or the other, and the
   terms-of-use page updated to state the real answer instead of the
   placeholder.
5. Once all rows in the pre-publication checklist have real completion
   evidence, the draft banners can be removed and the informational
   placeholder-detector test (test 22 in
   `tests/readiness/israeli-compliance-readiness.test.js`) should be
   updated/replaced by the release-blocking CI gate described at the
   bottom of `docs/PRE_PUBLICATION_COMPLIANCE_CHECKLIST.md`.
