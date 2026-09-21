# Scenario Evaluations — freightime-product-rule-authoring

Static, non-destructive walkthrough of the 16 required scenarios
against the rules in `SKILL.md`. No application code, test, or
regulatory data was changed to produce this file.

## 1. Product owner gives a complete, unambiguous rule
Known: family, subtype, direction, wording all stated.
Missing: none.
Conflict: none found.
Precedence: single matching rule, no ordering needed.
Implementation impact: identification + regulatory-result surfaces.
Validation level: Level 2 (regulatory-result category).
Prohibited: requesting clarification that isn't needed.
Result: **PASS** — implementation specification producible without
further clarification.

## 2. Product owner gives one product example but intends a family-wide rule
Known: the stated example and the stated intended scope.
Missing: none, if scope was stated; otherwise scope is Missing.
Conflict: none.
Precedence: family-level rule, not example-level.
Implementation impact: the example becomes a **positive example**
field, never a hardcoded sentence in the alias/term list.
Validation level: Level 2.
Prohibited: hardcoding the example sentence as the matching rule.
Result: **PASS**

## 3. Proposed rule conflicts with an existing family default
Known: proposed rule content.
Missing: none.
Conflict: **yes** — existing family default.
Precedence: cannot be resolved automatically.
Implementation impact: **stopped before implementation.**
Validation level: not applicable until resolved.
Prohibited: silently overriding the existing default.
Result: **PASS** — conflict reported, precedence decision requested.

## 4. Rule adds an additional wireless approval
Known: main product direction (unchanged), new wireless direction.
Missing: none.
Conflict: none, if genuinely additive.
Precedence: main direction and additional direction are independent,
both stated.
Implementation impact: regulatory-result surface, cumulative
directions.
Validation level: Level 2.
Prohibited: suppressing the main direction; merging both into vague
wording.
Result: **PASS** — main direction preserved, wireless direction added
cumulatively.

## 5. Rule contains an explicit negation
Known: the characteristic is explicitly negated in the description.
Missing: none.
Conflict: none.
Precedence: negation excludes the additional-direction trigger for
that characteristic.
Implementation impact: presentation and regulatory-result surfaces
must both respect the negation (mirrors the existing negation
mechanism already used in presentation suggestions).
Validation level: Level 2.
Prohibited: applying the additional direction anyway.
Result: **PASS**

## 6. Product part vs. complete product
Known: part/accessory status explicitly distinguished.
Missing: none, if both cases are stated; otherwise the missing case is
Missing.
Conflict: none.
Precedence: complete-product rule and part/accessory rule are separate,
independent entries.
Implementation impact: separate positive case (complete product) and
negative case (part/accessory does not trigger the complete-product
result).
Validation level: Level 2.
Prohibited: one shared rule that accidentally matches both.
Result: **PASS**

## 7. Baby-product override
Known: dedicated baby context stated.
Missing: none.
Conflict: potential — broad textile/furniture fallback could shadow it.
Precedence: baby-context rule must be checked **before** the broad
fallback (explicit precedence statement required).
Implementation impact: identification + regulatory-result surfaces.
Validation level: Level 2.
Prohibited: letting the broad fallback match first.
Result: **PASS**

## 8. Sports protection vs. occupational PPE
Known: context (sports vs. workplace) stated.
Missing: none, if both contexts are distinguished in the rule.
Conflict: existing sports-vs-PPE boundary must be preserved, not
redefined.
Precedence: context-specific rule over generic PPE default.
Implementation impact: regulatory-result surface, context distinction
preserved per existing product-owner rule.
Validation level: Level 2.
Prohibited: collapsing both contexts into one PPE outcome.
Result: **PASS**

## 9. Domestic electrical vs. industrial electrical
Known: intended-use context stated.
Missing: intended use, if not stated — this is outcome-changing and
must be captured before implementation.
Conflict: none, if the two contexts are kept separate.
Precedence: intended-use context first, generic electrical rule
second.
Implementation impact: rule-intake field 6 (user/destination) is
mandatory here.
Validation level: Level 2.
Prohibited: implementing before the intended-use distinction is
captured.
Result: **PASS**

## 10. Food-contact material rule
Known: material and contact purpose, if both stated.
Missing: coating/material detail, if only "food contact" is stated
generically — material, coating, and contact purpose must be captured
together per rule-intake fields 7 and 8.
Conflict: existing food-contact material rows (plastic/glass/ceramic/
metal) must not be silently merged.
Precedence: material-specific rule over generic food-contact fallback.
Implementation impact: identification + regulatory-result surfaces.
Validation level: Level 2.
Prohibited: a single generic "food contact" rule that loses the
material distinction.
Result: **PASS**

## 11. Medicines vs. medical devices
Known: product concept (medicine vs. device) stated.
Missing: none, if the concept is unambiguous.
Conflict: existing medicines/medical-device boundary must be
preserved, not merged.
Precedence: explicit product-concept rule, not a shared fallback.
Implementation impact: identification + regulatory-result +
professional-routing surfaces (different regulators).
Validation level: Level 3 before merge (distinct regulators, high
consequence).
Prohibited: one shared "health product" rule collapsing both.
Result: **PASS**

## 12. Cosmetic vs. perfume
Known: the approved exception distinguishing the two.
Missing: none.
Conflict: none, if the exception is applied exactly as approved.
Precedence: the specific approved exception over the general cosmetics
default.
Implementation impact: presentation + regulatory-result surfaces,
narrowly scoped to the approved exception.
Validation level: Level 2.
Prohibited: broadening the exception beyond what was approved.
Result: **PASS**

## 13. Animal-origin processed vs. unprocessed product
Known: product form, if stated.
Missing: processing status and intended product form — outcome-
changing, must be captured (rule-intake field 14).
Conflict: none, if both forms are distinguished.
Precedence: processing-status-specific rule over a generic
animal-origin default.
Implementation impact: regulatory-result surface.
Validation level: Level 2.
Prohibited: implementing before processing status is known.
Result: **PASS**

## 14. Proposed alias is a broad material word
Known: the proposed bare term.
Missing: none — the term itself is the problem.
Conflict: material-alone false-positive risk (Alias safety section).
Precedence: not applicable — rejected before precedence matters.
Implementation impact: **rejected** unless combined with meaningful
product context (compound phrase).
Validation level: not applicable until a compound term is proposed.
Prohibited: adding the bare material word as a positive term anywhere.
Result: **PASS**

## 15. Proposed follow-up question duplicates an existing document or answer
Known: the proposed question and its target information.
Missing: none — the duplication itself is the finding.
Conflict: duplicate-question / document-duplication check (Follow-up
question gate condition 4).
Precedence: not applicable.
Implementation impact: **rejected** — question not added.
Validation level: not applicable.
Prohibited: adding a second path to the same information.
Result: **PASS**

## 16. Product-owner information is insufficient to choose a regulator
Known: whatever partial information was given.
Missing: the specific fact needed to choose between regulators —
named exactly, not vaguely.
Conflict: none — this is a Missing-information case, not a Conflict
case.
Precedence: not applicable — Information Needed until resolved (tier 8
of the default precedence).
Implementation impact: **stopped.** No regulator is guessed.
Validation level: not applicable until resolved.
Prohibited: selecting a regulator by inference or general knowledge.
Result: **PASS** — stop, report the exact missing decision, no guess.

## Summary

16/16 scenarios map cleanly onto an explicit rule in `SKILL.md`. Four
scenarios (#3, #14, #15, #16) correctly terminate before an
implementation plan is produced, demonstrating the stop conditions
work as intended rather than always producing output. No gap requiring
a rule change was identified during this static review.
