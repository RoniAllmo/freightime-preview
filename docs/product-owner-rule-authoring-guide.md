# Product-Owner Rule Authoring Guide

This document is an operational engineering record and not a legal opinion, binding classification, or import approval.

Purpose: a mechanical, step-by-step guide for the FreighTime product owner to fill in one of the 5 product-owner authoring scaffolds with real, verified regulatory evidence, and for a future engineering session to safely wire a completed scaffold into the live matcher. **This guide contains zero regulatory content of its own** — no claims, no triggers, no exclusions, no Hebrew wording for any product category. It only explains the mechanics of the intake format that already exists in this codebase (`js/import-readiness/regulatory-signals/evidence-package.js` — see `docs/evidence-package-schema.md` for the full schema reference this guide builds on).

## 1. Which 5 files to edit

| # | Category | File (relative to repo root) |
|---|---|---|
| 1 | Cosmetics and toiletries | `js/import-readiness/regulatory-signals/evidence-packages/cosmetics-and-toiletries.evidence.js` |
| 2 | Electrical products | `js/import-readiness/regulatory-signals/evidence-packages/electrical-products.evidence.js` |
| 3 | Polymer / polymer-coated food-contact products | `js/import-readiness/regulatory-signals/evidence-packages/polymer-food-contact.evidence.js` |
| 4 | Glass food-contact products | `js/import-readiness/regulatory-signals/evidence-packages/glass-food-contact-vessel.evidence.js` |
| 5 | Vehicle and transportation products | `js/import-readiness/regulatory-signals/evidence-packages/vehicle-installed-product.evidence.js` |

Each file exports one `Object.freeze({...})` package object. Edit **only** the field values inside that object — do not rename the exported constant, do not change the file's `import` lines, do not touch the header comment block's instructional text (it documents this same process for the next person who opens the file).

## 2. Which fields are mandatory (must be filled in before activation)

The 19 fields defined in `EVIDENCE_PACKAGE_REQUIRED_FIELDS` (`evidence-package.js`) — full reference in `docs/evidence-package-schema.md` §3. Summary:

`ruleId`, `publicCategory`, `triggerPhrases`, `confirmationQuestions`, `activationConditions`, `exclusions` (may stay an empty array — see §9 below), `publicHebrewWording` (`{identification, implication}`), `verificationItems` (1–3 items), `primaryVerificationProfessional`, `professionalReason`, `officialSourceTitle`, `issuingAuthority`, `exactSourceUrl`, `tariffOrStandardReference`, `verificationDate`, `reviewDueDate`, `reviewerStatus`, `activeOrDisabledStatus`, `publicLimitationWording`.

Plus the 5 authoring-scaffold extras (`AUTHORING_SCAFFOLD_EXTRA_FIELDS`, added on top of the base schema for these 5 files specifically):

`authorityType` (leave exactly `'product_owner'` — do not change), `productOwnerAuthored` (boolean — see §5), `lastProductOwnerReview` (ISO date string or `null`), `internalName` (already filled in — a mechanical label, not regulatory content), `changeNotes` (array — free-form log entries about what changed and when, for your own record-keeping).

## 3. Which fields may stay empty until content is ready

Every one of the 19 required fields starts as an explicit empty placeholder (`''`, `[]`, or the appropriate empty object shape) and **must stay empty** until you have read the primary official source yourself and are ready to enter verified content. `exclusions` specifically may stay a permanently empty array if, after review, you genuinely find no exclusion conditions apply — an honestly-documented "none identified" is a legitimate final state, not an incomplete one (this mirrors the existing 5 `rules-registry.js` candidates). `changeNotes` may also stay empty indefinitely; it exists for your convenience, not as a validation requirement.

## 4. Which statuses are public vs. non-public

From `RULE_STATUS` in `js/import-readiness/regulatory-signals/rule-status.js`:

| Status | Public output? |
|---|---|
| `draft` | No |
| `source_verified` | No |
| `professional_review_required` | No |
| `expired` | No |
| `disabled` | No |
| `approved_for_pilot` | **Yes — the only public status** |

All 5 scaffolds start pinned to `RULE_STATUS.DISABLED` (`activeOrDisabledStatus`). The **only** status that can ever produce a public result is `RULE_STATUS.APPROVED_FOR_PILOT`, and only when every other gate condition (§6) also holds.

## 5. How to set `productOwnerAuthored` to `true`

`productOwnerAuthored` starts `false` on every scaffold. Change it to `true` only once you — the product owner — have personally entered real, verified content into every required field (not before, and never as a placeholder gesture). This is a separate, explicit marker from `activeOrDisabledStatus`: a scaffold can be `productOwnerAuthored: true` while still pinned `disabled`, so you can finish authoring and review your own work before deciding to activate it. `validateAuthoringScaffoldReadyForReview()` (see §7) will refuse to treat a scaffold as content-complete while this stays `false`, no matter what else is filled in.

## 6. How to move a rule to the active/approved status after direct content entry

1. Fill in all 19 required fields with real, verified content, reading the primary official source directly (see `docs/regulatory-signals-pilot.md` §2 for why a secondhand summary is not enough).
2. Set `productOwnerAuthored: true` and `lastProductOwnerReview` to today's date.
3. Run `validateEvidencePackage(<PACKAGE>)` — confirm `{ valid: true }` (§7 below has the exact command).
4. Run `validateAuthoringScaffoldReadyForReview(<PACKAGE>)` — confirm `{ valid: true }`.
5. Only then, as a deliberate final step **by itself** (not bundled with any other edit), change `activeOrDisabledStatus` from `RULE_STATUS.DISABLED` to `RULE_STATUS.APPROVED_FOR_PILOT` (import it from `../rule-status.js`, already imported in every scaffold file as `RULE_STATUS`).
6. Wiring the now-approved package into the live matcher output is a **follow-up engineering task**, not part of authoring — `getEligiblePilotRuleShapes()` in `evidence-packages/index.js` will automatically include it once (and only once) it clears every gate; no other file needs to change for it to become eligible, but a human engineering review of the change before merge is still expected practice for this codebase.

## 7. Exact validation command to run

From the repo root, in a Node REPL or a short throwaway script:

```js
import { validateEvidencePackage, validateAuthoringScaffoldReadyForReview } from './js/import-readiness/regulatory-signals/evidence-package.js';
import { COSMETICS_AND_TOILETRIES_EVIDENCE } from './js/import-readiness/regulatory-signals/evidence-packages/cosmetics-and-toiletries.evidence.js';

console.log(validateEvidencePackage(COSMETICS_AND_TOILETRIES_EVIDENCE));
console.log(validateAuthoringScaffoldReadyForReview(COSMETICS_AND_TOILETRIES_EVIDENCE));
```

Swap the import for whichever of the 5 scaffold files/constants you are working on. Both calls must print `{ valid: true, errors: [] }` before you touch `activeOrDisabledStatus`.

## 8. Exact test command to run

```
node --test tests/readiness/*.test.js tests/import-readiness/*.test.js
```

This is the exact command CI runs (`.github/workflows/frontend-ci.yml`). It covers, among everything else in this codebase, `tests/import-readiness/product-owner-scaffolds.test.js` (existence, inactive-by-default, and rejection coverage for these 5 files) and `tests/import-readiness/evidence-package-intake.test.js` (the base schema/gate). Run this after every edit to a scaffold file — a scaffold that still fails validation is expected to fail these tests too (they assert the placeholder state on purpose) until you've completed §6.

## 9. How exclusions prevent false matches (mechanically)

`exclusions` is a list of `{questionId, equals}` condition objects. When a rule is evaluated, the matcher checks whether the user's actual questionnaire answer for `questionId` equals `equals` for **any** entry in the list (`some`, not `every`) — if so, the rule is excluded from the result even if its `activationConditions` also matched. This lets a genuinely-triggered category be suppressed for a documented edge case (e.g. a sub-type the rule should not cover) without deleting or complicating the trigger logic itself. An empty `exclusions` array simply means no such edge case has been identified — the field always exists so that state is visible and intentional rather than an oversight.

## 10. How multiple signals can coexist (mechanically)

Each candidate rule/package is evaluated independently against the same set of questionnaire answers. The matcher (`matcher.js`) collects every rule whose `activationConditions` all held and whose `exclusions` did not, across the full registry (existing `rules-registry.js` candidates plus anything `getEligiblePilotRuleShapes()` returns), and returns them together as a list of signal cards. There is no "only one category can match" restriction — a product genuinely described as, say, both glass and vehicle-installed could in principle surface both cards, each independently gated by its own evidence and its own `isPubliclyEligible()` check.

## 11. How documents get deduplicated (mechanically)

Recommended/verification items surfaced across multiple matched signals are combined and de-duplicated by `js/import-readiness/multi-signal-presentation.js` before display — an identical item string appearing under two different matched rules is shown once, not twice, so the user sees one clean combined checklist rather than a category-by-category repeat. Ordering after dedup follows each item's associated `priority`/`operationalImpactPriority` value (lower number first; `99` is this codebase's existing "not yet ranked" sentinel — see that field's use in `rules-registry.js` and in `toRuleShape()`'s `pkg.operationalImpactPriority ?? 99` default).

## 12. How changing an earlier answer clears stale signals (mechanically)

The matcher is a pure function of the current answer set — it does not cache or carry forward a previous evaluation. Every time the questionnaire's answers change, `matchRegulatorySignals()` (or the higher-level `evaluateRegulatorySignals()` in `regulatory-signals/index.js`) is re-run from scratch against the new answer object, so a signal that depended on an answer the user has since changed simply does not appear in the new result — there is no separate "clear" step to remember; staleness is structurally impossible because nothing is retained between evaluations.

## 13. How to preview a rule locally (dev-server instructions)

This is a static, build-free site — no bundler, no dev server framework. To preview:

1. From the repo root, serve the directory with any static file server, e.g. `python3 -m http.server 8000` or `npx serve .`.
2. Open `http://localhost:8000/index.html` (or whichever page hosts the questionnaire flow) in a browser.
3. Because a scaffold only produces output once `activeOrDisabledStatus` is `RULE_STATUS.APPROVED_FOR_PILOT` (§4/§6), you will not see anything from an in-progress scaffold in the live UI until that final step. To preview matcher behavior **before** flipping the live status, use the Node test runner instead: write a small temporary script (never commit it) that imports `matchRegulatorySignals` and your in-progress package's `toRuleShape()` output directly, the same way `tests/import-readiness/evidence-package-intake.test.js` (tests 12–13) already does for a synthetic example — this lets you see exactly what a card would look like without ever exposing it publicly.

## Appendix: Hebrew field-heading authoring template (labels only)

For your own convenience while filling in the Hebrew content fields, here is the familiar field-heading layout — **labels only, nothing filled in**. This is not code and is not read by any validator; it exists purely so you have a clear, familiar entry template while editing the actual field values in the scaffold files themselves.

```
שם האיתות לציבור:
כיוון הבדיקה שיוצג:
למה האיתות הופיע:
תנאי הפעלה:
תנאי החרגה:
שאלות המשך:
מסמכים שכדאי להשיג:
פעולות מומלצות:
גורם מקצועי ראשי:
גורם מקצועי תומך:
רמת עדיפות:
הסתייגות קצרה:
```

Do not fill these in inside this document — enter the corresponding content directly into the relevant field of the scaffold file you are working on (§1/§2 above map each heading to its code-level field: e.g. "שם האיתות לציבור" → `publicHebrewWording.identification`, "כיוון הבדיקה שיוצג" / "למה האיתות הופיע" → `publicHebrewWording.implication`, "תנאי הפעלה" → `activationConditions`/`triggerPhrases`, "תנאי החרגה" → `exclusions`, "שאלות המשך" → `confirmationQuestions`, "מסמכים שכדאי להשיג" / "פעולות מומלצות" → `verificationItems`, "גורם מקצועי ראשי" → `primaryVerificationProfessional`, "גורם מקצועי תומך" → not currently a distinct field on this schema — record it in `professionalReason` or `changeNotes` if needed, "רמת עדיפות" → `operationalImpactPriority` once wired via `toRuleShape()`, "הסתייגות קצרה" → `publicLimitationWording`).

## 14. How to return completed files for mechanical validation/integration

Tell the engineering session/agent:

- Which of the 5 files you finished (by path — see §1's table).
- That you have already run the exact validation command in §7 for each and it returned `{ valid: true }`.
- Whether you also flipped `activeOrDisabledStatus` to `RULE_STATUS.APPROVED_FOR_PILOT` yourself, or want that done as part of the same follow-up.
- That the engineering session should: run the full test command in §8, confirm nothing else in the repo changed unexpectedly, confirm `docs/regulatory-signal-candidates-remain-disabled` / `evidence-package-intake` / `product-owner-scaffolds` test files still pass (they will, since none of them assert against your specific new content — they only assert the *mechanism*), and then open a normal, reviewable pull request for the change. The engineering session should **not** invent, adjust, or "improve" any wording you supplied — only validate structure and wire the plumbing.
