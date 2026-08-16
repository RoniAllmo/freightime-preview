# Pre-Publication Compliance Checklist

Status: **DRAFT — informational, not release-blocking yet.**

This document lists every unresolved placeholder introduced by the Israeli
compliance-readiness pass (accessibility statement, privacy policy, terms of
use, contact section). Every row must be resolved — and this document
updated with real evidence — before the site is presented publicly as
final, non-draft content.

Nothing here was invented. Every `[להשלמה לפני פרסום: ...]` /
`[נדרשת בדיקה משפטית לפני פרסום]` token is a verified gap, not a guess.

## How to find every occurrence

```bash
grep -rn '\[להשלמה לפני פרסום:\|\[נדרשת בדיקה משפטית לפני פרסום\]' \
  index.html accessibility-statement.html privacy-policy.html terms-of-use.html
```

`tests/readiness/israeli-compliance-readiness.test.js` (test 22) asserts
that unresolved placeholders currently exist — this is intentional and
informational while the legal content is in draft. **It is not wired as a
release-blocking CI gate.**

## Registry

| # | Placeholder token | Affected page/file | Required owner | Reason required | Category | Blocking? | Completion evidence | Replacement date | Reviewer |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `[להשלמה לפני פרסום: שם מפעיל האתר]` | privacy-policy.html, terms-of-use.html, accessibility-statement.html | Product owner | Legal operator/registered business name not verified | Missing business info | Yes | | | |
| 2 | `[להשלמה לפני פרסום: מספר חברה או עוסק, אם רלוונטי]` | privacy-policy.html | Product owner | Company/dealer number not verified | Missing business info | Yes | | | |
| 3 | `[להשלמה לפני פרסום: כתובת עסקית]` | privacy-policy.html | Product owner | Registered business address not verified | Missing business info | Yes | | | |
| 4 | `[להשלמה לפני פרסום: כתובת דוא"ל מאושרת]` | index.html (contact section), privacy-policy.html, accessibility-statement.html, terms-of-use.html | Product owner | No approved public/privacy contact email exists | Missing business info | Yes | | | |
| 5 | `[להשלמה לפני פרסום: מספר טלפון]` | index.html (contact section), accessibility-statement.html | Product owner | No verified telephone number exists | Missing business info | Yes | | | |
| 6 | `[להשלמה לפני פרסום: שעות פעילות]` | index.html (contact section) | Product owner | Support hours not verified | Missing business info | Yes | | | |
| 7 | `[להשלמה לפני פרסום: פרטי איש קשר לנגישות]` | accessibility-statement.html | Product owner / accessibility professional | No accessibility coordinator has been appointed | Missing business info / legal-operational | Yes | | | |
| 8 | `[להשלמה לפני פרסום: פרטי בעל השליטה במידע]` | privacy-policy.html | Product owner / legal counsel | No privacy contact / data controller identified; no DPO appointed | Missing business info | Yes | | | |
| 9 | `[להשלמה לפני פרסום: יש לאשר האם קיימים קשרים מסחריים, עמלות או הסכמי הפניה עם נותני שירות]` | terms-of-use.html | Product owner | Commercial-referral relationships with professional-category providers not verified either way | Legal-operational | Yes | | | |
| 10 | `[להשלמה לפני פרסום: אימות רישיון וזכות שימוש בתמונת ה-Hero]` | terms-of-use.html | Product owner / legal counsel | Hero image (`assets/images/hero-port.jpg`) has known repository provenance (extracted from commit `bed1397`) but unknown original external source and unknown license terms | Intellectual property / legal review | Yes | | | |
| 11 | `[נדרשת בדיקה משפטית לפני פרסום]` (limitation-of-reliance clause) | terms-of-use.html | Legal counsel | Reliance/liability language needs professional review to confirm it does not overreach beyond mandatory consumer-protection rights | Legal review | Yes | | | |
| 12 | `[נדרשת בדיקה משפטית לפני פרסום]` (governing law / jurisdiction clause) | terms-of-use.html | Legal counsel | Governing law and jurisdiction not determined | Legal review | Yes | | | |

## Additional finding outside this change's scope

`legacy/static-preview/freightime-original-preview.html` (a pre-existing
archived design-reference snapshot from commit `aea361d`, not part of the
live site and not linked from `index.html` or any served page) still
contains the same fabricated-looking phone number and email that were
found and corrected in the live contact section of `index.html` in this
change. It was left untouched because editing archived/legacy reference
material was outside this task's authorized scope. Flagged here so a
product owner can decide whether to update, delete, or explicitly mark
that legacy file as non-representative before any wider publication.

## Non-blocking findings tracked separately (not placeholders, but related gaps)

- No accessibility coordinator has been appointed (see row 7). Do not treat
  the placeholder's presence as evidence that appointment is imminent or
  planned by a specific date.
- No screen-reader (NVDA/JAWS/VoiceOver) testing has been performed. See
  `docs/ACCESSIBILITY_TEST_REPORT.md`.
- Hosting/infrastructure-level server logs (e.g. GitHub Pages access logs)
  cannot be inspected from this repository. Their existence must not be
  assumed to be zero. See `docs/DATA_FLOW_INVENTORY.md`.

## Future CI-gate wiring (not implemented yet)

Once real operator/contact/legal details are approved and filled in, the
same grep pattern above should be wired into `.github/workflows/frontend-ci.yml`
as a release-blocking step, e.g.:

```yaml
- name: Fail if unresolved compliance placeholders remain (post-launch gate only)
  run: |
    if grep -rn '\[להשלמה לפני פרסום:\|\[נדרשת בדיקה משפטית לפני פרסום\]' \
        index.html accessibility-statement.html privacy-policy.html terms-of-use.html; then
      echo "Unresolved pre-publication compliance placeholders found." >&2
      exit 1
    fi
```

This step is intentionally **not** added yet, because placeholders are
currently expected to exist. Adding it now would permanently fail CI. Add
it only once every row above has real completion evidence and a reviewer
sign-off.

## Sign-off

No row in this table has been resolved as of the date this document was
created. This checklist itself does not constitute legal or accessibility
sign-off — it is a tracking tool for a product owner and reviewing
professionals.

Last updated: 2026-08-16 (draft).
