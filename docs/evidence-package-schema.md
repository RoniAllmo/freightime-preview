# Evidence-Package Intake Format

This document is an operational engineering record and not a legal opinion, binding classification, or import approval.

## 1. What this is, and what it is not

This is the documented, validated intake format the product owner uses to supply a **reviewed regulatory evidence package** for one candidate rule at a time, going forward. It is infrastructure only:

- It does **not** contain any regulatory fact, claim, or Hebrew public-facing wording for any product category.
- It does **not** change the status of any of the 5 existing candidate rules in `rules-registry.js` -- all 5 remain exactly as disabled (`professional_review_required`) as they were before this format existed.
- It does **not** activate anything. The only package registered today (`glass-food-contact-vessel.evidence.js`) is an intentionally-empty placeholder pinned to `disabled`.

Code location: `js/import-readiness/regulatory-signals/evidence-package.js` (schema + validator + adapter + gate), `js/import-readiness/regulatory-signals/evidence-packages/` (per-candidate package files and the registry that lists them).

## 2. Relationship to the existing rule shape

This format formalizes and extends the field set the 5 existing candidates in `rules-registry.js` already use (see that file's own field-list comment) -- it is not a second, incompatible format. `toRuleShape()` adapts a validated, approved package into the exact object shape `matcher.js` already consumes, so an approved package is held to the **same** hard gate (`isPubliclyEligible()` in `rule-status.js`) the existing candidates already are. Nothing about the existing gate was weakened or duplicated with a parallel check.

## 3. The 19 required fields

Every evidence package must supply all 19 of these fields (see `EVIDENCE_PACKAGE_REQUIRED_FIELDS` in `evidence-package.js` for the authoritative list). Field name below is the object key used in code.

| # | Field (as specified) | Object key | Shape |
|---|---|---|---|
| 1 | rule ID | `ruleId` | non-empty string, e.g. `"RS-GLASS-FOOD-001"` |
| 2 | public category | `publicCategory` | non-empty string, matches the rule engine's `internalCategory` |
| 3 | trigger phrases | `triggerPhrases` | non-empty string[] -- loose keyword hints, same role as `keyword-hints.js` |
| 4 | confirmation questions | `confirmationQuestions` | non-empty array of `{questionId, legend}` |
| 5 | activation conditions | `activationConditions` | non-empty array of `{questionId, equals}` -- **all** must hold to trigger |
| 6 | exclusions | `exclusions` | array of `{questionId, equals}` -- **any** holding excludes the match. May be empty (an honestly-documented "none identified" is legitimate, matching the existing candidates' current state) but the field itself must exist |
| 7 | public Hebrew wording | `publicHebrewWording` | `{identification, implication}`, both non-empty |
| 8 | verification items | `verificationItems` | 1-3 non-empty strings |
| 9 | primary verification professional | `primaryVerificationProfessional` | non-empty string, must be a real key in `professional-category-registry.js` |
| 10 | professional reason | `professionalReason` | non-empty string |
| 11 | official source title | `officialSourceTitle` | non-empty string |
| 12 | issuing authority | `issuingAuthority` | non-empty string |
| 13 | exact source URL | `exactSourceUrl` | non-empty string, must start with `https://` |
| 14 | tariff, order, or standard reference | `tariffOrStandardReference` | non-empty string |
| 15 | verification date | `verificationDate` | valid ISO date string -- the date the source was actually read and confirmed |
| 16 | review-due date | `reviewDueDate` | valid ISO date string -- when this evidence must be re-verified |
| 17 | reviewer status | `reviewerStatus` | one of `REVIEWER_STATUS` (see §5) |
| 18 | active or disabled status | `activeOrDisabledStatus` | one of `RULE_STATUS` from `rule-status.js` (see §4) |
| 19 | public limitation wording | `publicLimitationWording` | non-empty string -- the safe, non-absolute limitation sentence shown with every card |

## 4. Validation / rejection logic

`validateEvidencePackage(pkg)` in `evidence-package.js` is a real, deterministic, testable function -- not a documentation convention. It returns:

- `{ valid: true, errors: [] }` when all 19 fields are present and well-formed, or
- `{ valid: false, errors: [...] }` naming every missing/invalid field, checked independently (no short-circuit on the first failure).

A package that fails validation can **never** reach `toRuleShape()` or the activation gate -- there is no code path that lets an invalid package become a rule the matcher can see. Individually tested rejection cases (`tests/import-readiness/evidence-package-intake.test.js`) include a package missing:

- an official source (title, authority, or URL) -- rejected
- a verification date -- rejected
- a review-due date -- rejected
- the exclusions field entirely (an empty array is fine; a missing field is not) -- rejected
- the professional-verification path (professional category or reason) -- rejected
- safe public limitation wording -- rejected

...and, exhaustively, every other one of the 19 fields, one at a time.

## 5. Reviewer status vs. activation status -- two independent axes

- `reviewerStatus` (`REVIEWER_STATUS`: `not_yet_reviewed` / `in_review` / `product_owner_reviewed` / `rejected`) tracks the human review workflow itself.
- `activeOrDisabledStatus` (`RULE_STATUS` from `rule-status.js`) tracks whether the rule may ever produce public output.

A package can be `product_owner_reviewed` and still be kept `disabled` -- reviewed does not automatically mean live. This lets a product owner review and record their findings before deciding to flip activation on as a separate, deliberate step.

## 6. The activation gate -- "approved for controlled pilot"

"Approved for controlled pilot" is **not** a new status. It is this codebase's existing `RULE_STATUS.APPROVED_FOR_PILOT` value (`'approved_for_pilot'`), already defined in `rule-status.js` and already the single value `isPubliclyEligible()` requires. The evidence-package format reuses it as-is.

`isEligibleForControlledPilot(pkg)` in `evidence-package.js` is the real code-level gate for this intake path:

1. `validateEvidencePackage(pkg)` must return `{valid: true}`.
2. `pkg.activeOrDisabledStatus` must be exactly `RULE_STATUS.APPROVED_FOR_PILOT`.
3. The adapted rule shape (`toRuleShape(pkg)`) must itself clear the existing, unmodified `isPubliclyEligible()` hard gate.

Everything else -- disabled, deprecated, `professional_review_required`, `draft`, `expired`, or simply invalid/incomplete -- produces **zero** public output. "Approved for controlled pilot" means the product owner has reviewed the package and is willing to let it go through the normal matcher/gate pipeline in a limited pilot; it is explicitly **not** a claim of government verification, legal certification, or final regulatory classification. That distinction is preserved in the public-facing limitation wording every card must carry (see §3, field 19) and in the existing collapsed-detail disclosure text in `matcher.js`.

## 7. Free text can only ever suggest a question

Exactly like the existing pattern in `keyword-hints.js`, a package's `triggerPhrases` can only ever be used to suggest which `confirmationQuestions` entry might be worth asking -- they can never themselves satisfy `activationConditions`. `activationConditions` and `exclusions` are evaluated only against confirmed closed-choice answers (`ctx.answers[questionId] === equals`), exactly like every existing candidate's `triggerPredicate`. This is verified for the new intake path by
`tests/import-readiness/evidence-package-intake.test.js` (test 15): a hinted category with no closed-choice "yes" answer -- or an explicit "unknown" answer -- produces zero signals, even for an otherwise fully approved package.

## 8. Current status of the 5 existing candidates

Unchanged by this format, and unchanged by this task:

| Rule ID | Status | Public output? |
|---|---|---|
| `RS-ELEC-001` | `professional_review_required` | No |
| `RS-PLASTIC-FOOD-001` | `professional_review_required` | No |
| `RS-POLYMER-COATING-001` | `professional_review_required` | No |
| `RS-GLASS-FOOD-001` | `professional_review_required` | No |
| `RS-VEHICLE-001` | `professional_review_required` | No |

`rules-registry.js` itself was not edited by this task -- its byte-for-byte content hash (asserted in `tests/import-readiness/regulatory-signal-candidates-remain-disabled.test.js`) is unchanged. This evidence-package format is a separate, additive intake mechanism that does not touch that file.

## 9. Where the next real evidence package goes

The product owner said the first real evidence package they will supply covers **glass-food-contact-vessel**. Its exact intake slot already exists at:

```
js/import-readiness/regulatory-signals/evidence-packages/glass-food-contact-vessel.evidence.js
```

That file today contains **only** an empty, schema-shaped template (`GLASS_FOOD_CONTACT_VESSEL_EVIDENCE`) with every one of the 19 fields present but explicitly empty/placeholder, and `activeOrDisabledStatus` pinned to `RULE_STATUS.DISABLED` so it cannot accidentally validate or activate. Its header comment documents the exact steps to fill it in, validate it, and -- as a separate, deliberate final step -- flip its status. No content has been invented for it as part of this task.

Once that file is genuinely filled in and passes `validateEvidencePackage()`, wiring it into the live matcher is a small **follow-up engineering task**: the package is already registered in `js/import-readiness/regulatory-signals/evidence-packages/index.js`, whose `getEligiblePilotRuleShapes()` will automatically include it once (and only once) it is both schema-valid and explicitly `approved_for_pilot`.

## 10. Tests

`tests/import-readiness/evidence-package-intake.test.js` (top-level path, CI-covered by `.github/workflows/frontend-ci.yml`'s non-recursive glob, same convention as `regulatory-signal-candidates-remain-disabled.test.js`) covers: full schema-field enumeration; a complete synthetic package passing; each individual required field's rejection; the activation gate (approved+valid produces output through the real matcher, unapproved-but-complete produces zero output); the free-text-suggestion-only rule; the glass-food-contact-vessel template's placeholder/disabled state; and regressions confirming the 5 real candidates remain untouched and that the evidence-packages registry produces zero eligible rule shapes today. All fixture data in that file is clearly synthetic (`EXAMPLE-TEST-RULE-001`, `test-trigger-only`), never real-sounding category content.
