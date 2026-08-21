# Product-Owner Rule Authoring Guide

This document is an operational engineering record and not a legal opinion, binding classification, or import approval.

Purpose: a mechanical, step-by-step guide for the FreighTime product owner to fill in one of the 5 pilot rules' public-facing content fields directly in `rules-registry.js`, and to move it from `expert_authored` to `expert_approved_for_pilot`. **This guide contains zero regulatory content of its own** — no claims, no triggers, no exclusions, no Hebrew wording for any product category. It only explains the mechanics of the single canonical rule registry that already exists in this codebase.

> This guide replaces an earlier, separate `evidence-package.js` schema/scaffold system (including an unrequested cosmetics-and-toiletries scaffold), which has been removed. There is now exactly **one** rule registry, **one** status field per rule, and **one** activation decision — see `docs/regulatory-signals-pilot.md` §16 for the full redesign record.

## 1. Which file to edit

Everything lives in one file:

```
js/import-readiness/regulatory-signals/rules-registry.js
```

It exports `REGULATORY_SIGNAL_RULES`, a frozen array of exactly 5 rule objects, in this order:

| # | Category | Rule `id` |
|---|---|---|
| 1 | Mains-connected electrical product | `mains-connected-electrical-product` |
| 2 | Plastic in direct food contact | `plastic-direct-food-contact` |
| 3 | Polymer coating in direct food contact | `polymer-coated-direct-food-contact` |
| 4 | Glass vessel in direct food/drink contact | `glass-food-contact-vessel` |
| 5 | Product intended for installation in a motor vehicle | `vehicle-installed-product` |

Each rule is an `Object.freeze({...})` literal inside that array. Edit only the field *values* for the rule you're working on — do not rename an `id`, do not touch the mechanical fields already implemented (see §2), and do not remove the top-of-file comment block (it documents this same process for the next person who opens the file).

## 2. What's already implemented (do not need to touch)

For every one of the 5 rules, this is already real, tested, live logic per the product owner's original specification — you do **not** need to write or edit any of this:

- `triggerPredicate(ctx)` / `exclusionPredicate(ctx)` — the exact activation/exclusion logic based on questionnaire answers.
- `followUpQuestionIds` — wired to the exact confirmation questions in `questions.js` (also already written per your original wording).
- Candidate free-text terms — already added to `keyword-hints.js`.
- `professionalCategory` / `secondaryProfessionalCategory` — already mapped to the correct entries in `professional-category-registry.js` (`TESTING_LABORATORY`, `CUSTOMS_CLASSIFIER`, `VEHICLE_TESTING_LAB`, etc.).
- `confidenceIfMatched`, `operationalImpactPriority` — already set to sensible defaults matching your specification.
- `internalNotes` — already documents the earlier (unverified, WebSearch-only) research history for context.

## 3. What you need to fill in

These five fields are the ones that assert something about what a product characteristic may require — they are the fields left **intentionally empty**, and they are the only thing standing between a rule and going live:

| Field | What it is | Currently |
|---|---|---|
| `publicTitle` | The rule's public status/category label shown on the signal card. | `''` |
| `primaryExplanation` | One identification sentence — "based on what was entered, ...". | `''` |
| `potentialImplication` | One implication sentence — "this characteristic may require...". | `''` |
| `verificationItems` | Up to 3 short items to verify (array of strings). | `[]` |
| `professionalReason` | One sentence on why the routed professional is relevant. | `''` |

Optional, only relevant if you also want to attach a real official source later (see §6):

`officialSources` (array of `{title, authority, url}`), which upgrades the rule from `expert_approved_for_pilot` to `official_source_supported` once genuinely complete — entirely optional, never required.

## 4. Which fields may stay empty

Everything in §3 must be filled in before the rule can go public — the gate checks every one of them (see §5). `officialSources` may stay a permanently empty array; it is optional supporting evidence, not a requirement.

## 5. Which statuses are public vs. non-public

From `RULE_STATUS` in `js/import-readiness/regulatory-signals/rule-status.js`:

| Status | Public output? |
|---|---|
| `expert_authored` | No |
| `review_due` | No (downgraded) |
| `disabled` | No |
| `expert_approved_for_pilot` | **Yes** |
| `official_source_supported` | **Yes** |

As of 2026-08-17, all 5 rules sit at `RULE_STATUS.EXPERT_APPROVED_FOR_PILOT` — the product owner supplied verbatim public content for each and deliberately approved all five for controlled pilot use. None is `official_source_supported`; none carries an `officialSources` entry. "Approved" always means *approved by the FreighTime product owner for presentation as a professional direction for checking* — never government-approved, never legally certified.

## 6. Exact lifecycle: from empty scaffold to `EXPERT_APPROVED_FOR_PILOT`

1. Open `rules-registry.js`, find the rule by `id` (§1's table).
2. Fill in the 5 fields from §3 with your own reviewed, professional wording — hedged, directional language only (see the approved/forbidden wording lists in `docs/regulatory-signals-pilot.md` §9 and the product-owner's original task instructions). Keep `verificationItems` to at most 3 items.
3. Set `verifiedDate` to today's date (`'YYYY-MM-DD'`) and `reviewDueDate` to 6 months later — or leave `reviewDueDate` for `computeReviewDueDate(verifiedDate)` (exported from `rule-status.js`) to compute for you.
4. Run the validation command in §7 and confirm the rule clears `isPubliclyEligible()`.
5. Only then, as a deliberate final step, change `status` from `RULE_STATUS.EXPERT_AUTHORED` to `RULE_STATUS.EXPERT_APPROVED_FOR_PILOT`.
6. Run the test command in §8 and confirm the full suite still passes. `tests/import-readiness/regulatory-signal-candidates-remain-disabled.test.js` currently asserts the registry has exactly the 5 already-approved rule ids, all `expert_approved_for_pilot`, none `official_source_supported` — adding a 6th rule (this guide's scenario) requires extending that test's `EXPECTED_IDS` list and rule count assertion to include the new rule's id and its own status, not narrowing an "all still pending" assertion (that transition already happened, on 2026-08-17).
7. Open a normal, reviewable pull request for the change.

## 7. Exact validation command to run

From the repo root, in a Node REPL or a short throwaway script:

```js
import { isPubliclyEligible } from './js/import-readiness/regulatory-signals/rule-status.js';
import { findRuleById } from './js/import-readiness/regulatory-signals/rules-registry.js';

const rule = findRuleById('glass-food-contact-vessel'); // swap for whichever rule you're working on
console.log(isPubliclyEligible(rule)); // must print true before you rely on the rule going live
```

## 8. Exact test command to run

```
node --test
```

Run with no path arguments, from the repository root. This is the exact command CI runs (`.github/workflows/frontend-ci.yml`) — Node's own recursive test-file discovery, which finds every maintained test file anywhere under `tests/` (including `tests/import-readiness/regulatory-signals/`, where most of this rule's own unit tests live) rather than a manually maintained partial glob. It also picks up `tests/import-readiness/regulatory-signal-candidates-remain-disabled.test.js`, the top-level safety-boundary test — run this after every edit.

## 9. How exclusions prevent false matches (mechanically)

`exclusionPredicate(ctx)` is a pure function of the current answer map. The matcher checks `triggerPredicate(ctx)` first; if it's true, it then checks `exclusionPredicate(ctx)` — if that's also true, the rule is suppressed even though it triggered. For all 5 rules today, the single/multi-question confirmation flow already encodes every documented exclusion case as a "no" answer to the relevant question, so `exclusionPredicate` is currently `() => false` for all 5 — you generally do not need to add separate exclusion logic unless you introduce a new edge case that a plain "no" answer can't represent.

## 10. How multiple signals can coexist (mechanically)

Each rule is evaluated independently against the same answer set. The matcher (`matcher.js`) collects every rule that triggers and isn't excluded, sorts by `operationalImpactPriority` (lower number first), and returns up to 3 as primary signals with any remainder available via `extraSignalCount`. A product genuinely matching more than one rule (e.g. an electric appliance with a food-contact polymer part) can surface multiple cards.

## 11. How documents get deduplicated (mechanically)

`js/import-readiness/multi-signal-presentation.js` combines and de-duplicates verification/document items across multiple matched signals before display — an identical item string appearing under two different matched rules is shown once.

## 12. How changing an earlier answer clears stale signals (mechanically)

The matcher is a pure function of the current answer set with no cache — every time an answer changes, `evaluateRegulatorySignals()` re-evaluates from scratch, so a signal that depended on a now-changed answer simply stops appearing. There is no separate "clear" step.

## 13. How to preview a rule locally

This is a static, build-free site. Serve the directory (`python3 -m http.server 8000` or similar) and open `index.html`. A rule only produces visible output once its status is `expert_approved_for_pilot` (or `official_source_supported`) *and* its content fields are filled — until then, use a small throwaway Node script that calls `matchRegulatorySignals()` directly with your in-progress rule and synthetic answers, the same way the test suite does.

## 14. How to return completed content for mechanical validation/integration

Tell the engineering session/agent:

- Which rule(s) you finished, by `id`.
- That you ran the §7 validation command and it printed `true`.
- Whether you already flipped `status` to `expert_approved_for_pilot` yourself, or want that done as part of the same follow-up.
- The engineering session should then: run the §8 test command, update `regulatory-signal-candidates-remain-disabled.test.js` to reflect the newly-approved rule (narrowing its "all 5 stay expert_authored" assertion), confirm nothing else changed unexpectedly, and open a normal reviewable pull request. It should **not** invent, adjust, or "improve" any wording you supplied — only validate structure and wire the plumbing.

## Appendix: Hebrew field-heading authoring template (labels only)

```
שם האיתות לציבור:            (→ publicTitle)
כיוון הבדיקה שיוצג:           (→ primaryExplanation / potentialImplication)
למה האיתות הופיע:             (→ primaryExplanation)
מסמכים שכדאי להשיג:           (→ verificationItems)
גורם מקצועי ראשי:             (→ professionalCategory, already mapped)
סיבת ההפניה לגורם המקצועי:    (→ professionalReason)
```

Do not fill these in inside this document — enter the corresponding content directly into the relevant field of `rules-registry.js`.
