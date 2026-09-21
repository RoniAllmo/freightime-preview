---
name: freightime-family-suggestion-quality
description: Assess and plan improvements to the quality of FreighTime's free-text-to-product-family suggestions — matching safety, collision risk, false-positive/false-negative risk, whole-product-vs-part distinction, negation handling, Hebrew/English normalization, generic-input fallback, and cumulative-family behavior. Use when reviewing, questioning, or proposing a change to how a free-text product description maps to suggested product families, or when investigating a suspected family-suggestion bug, collision, or unsafe match. Produces an analysis and implementation plan only — never changes identifyProductFamily, aliases, the product-family matrix, regulatory results, or professional routing, and never performs Git operations or selects validation commands.
---

# FreighTime Family Suggestion Quality

## Purpose

Evaluate and plan the quality of FreighTime's free-text-to-product-family
suggestion behavior — the layer that turns a user's typed product
description into an initial set of suggested product families. This
skill produces a structured assessment and implementation plan; it
never edits `identifyProductFamily`, aliases, the product-family
matrix, regulatory results, professional routing, or document state
itself.

## Non-goals

This skill does **not**:
- change product code, aliases, or the regulatory matrix;
- determine or alter a regulatory result, professional routing, or
  document requirement (hand off to `freightime-product-rule-authoring`);
- perform any Git or GitHub operation;
- select validation commands or a test suite;
- conduct a general UX/accessibility/privacy review outside the
  family-suggestion surface;
- authorize implementation, push, merge, or deployment. **An
  implementation plan produced by this skill is not permission to
  change code.**

## Ownership boundaries

- `freightime-safe-git-workflow` owns branch/commit/push/PR/merge/CI/
  Pages/cleanup — this skill never performs a Git operation.
- `freightime-regression-validation` owns validation-level and test-
  command selection — this skill only *names* the required validation
  level in its output; it does not decide the actual commands.
- `freightime-product-quality` owns general UX/accessibility/privacy/
  browser-acceptance review — this skill owns only the quality of the
  family-suggestion matching/presentation behavior itself.
- `freightime-product-rule-authoring` owns any new or changed
  professional rule, regulatory direction, professional routing, or
  document-state behavior — this skill must hand off to it rather than
  silently deciding a regulatory consequence itself.

This skill contains no copy of the regulatory matrix, no cached alias
list, and no professional-taxonomy data of its own. Every architectural
fact it relies on must be re-confirmed from the live repository at use
time, not assumed from this document.

## Required handoffs

1. Git, branch, push, PR, merge, and branch-deletion operations →
   `freightime-safe-git-workflow`.
2. Validation level and test-command selection →
   `freightime-regression-validation`.
3. General UX, accessibility, privacy, and browser-acceptance review →
   `freightime-product-quality`.
4. Any new or changed professional rule, regulatory outcome, follow-up
   question, professional routing, or document-state behavior →
   `freightime-product-rule-authoring`. This skill must never silently
   add a regulatory consequence itself — it only flags that one may be
   needed and defers the decision.

## Known / Missing / Conflicting workflow

Before assessing family-suggestion quality or proposing a plan,
produce exactly these three sections (mirrors
`freightime-product-rule-authoring`'s intake discipline):

**A. Known** — facts explicitly given in the request (input text,
expected/prohibited families, reproduction steps), or read directly
from an authoritative project source at use time (cite the file).

**B. Missing** — information that genuinely changes the assessed
outcome (e.g. which family the product owner intends as primary,
whether a mentioned characteristic should be cumulative or exclusive).
Do not list information that does not change the result.

**C. Conflicting** — a request that conflicts with an existing family
default, an existing test's documented expectation, an existing
negation rule, or a previously stored product-owner decision.

**If a critical conflict or missing product-owner decision exists:
stop before producing an implementation plan.** Report the exact
conflict or missing decision and request only the smallest necessary
clarification. Never ask a question whose answer already exists in the
project or the current conversation.

## Read-only architecture discovery requirements

Before relying on any module name or behavior, re-confirm it against
the live repository — do not use a cached list as fact. At minimum,
locate and cite:

- the canonical family list (matrix module);
- the function that receives free-text input and returns suggested
  families;
- alias/keyword/token/prefix/normalization/matching logic;
- Hebrew and English normalization;
- singular/plural and inflection handling, if present;
- explicit-negation handling;
- complete-product-vs-part/accessory/component/raw-material handling;
- material/use/purpose/domain-context handling;
- domestic-vs-commercial/industrial context;
- electrical/wireless/battery/medical/baby/vehicle/food-contact/
  animal-origin/plant-origin signal handling;
- generic-input fallback behavior;
- "Show all" / full-list-access behavior;
- any ranking or ordering of suggested families;
- whether any layer auto-selects a family;
- existing tests and fixtures already covering family suggestions.

This is read-only discovery. Do not fix or change any of it as part of
using this skill — only cite what exists and where.

## Family-suggestion quality principles

A free-text description initially shows only relevant product
families; the full family list always remains available through
"Show all"; the system never auto-selects a family; a family must
never activate solely because of a broad material, a broad property,
or an unrelated contextual mention; explicit negation must never act
as a positive signal; complete products and their parts/accessories
must remain distinguishable; one example must never silently become a
family-wide rule; presentation logic must never independently encode a
regulatory outcome; identification logic must never independently
change professional routing or document requirements; any discovered
regulatory consequence is handed off, never silently added.

Examples used anywhere in this skill (including its own illustrative
inputs and its evaluation scenarios) are illustrative acceptance
cases, not an exhaustive alias list, a family definition, or
authorization to expand one example into a family-wide rule.

## Whole-product vs. part/accessory gate

Before accepting that an input should suggest a given family, confirm
whether the input describes the complete product or a part, spare
part, accessory, component, raw material, packaging, or ingredient.
A part/accessory/component of a family must never automatically
resolve to that family's complete-product result unless the
product-owner-approved rule explicitly says so. Examples: a drone
accessory is not a complete drone; a motorcycle accessory is not a
complete motorcycle; a machine spare part is not a complete machine.

## Negation gate

An explicit negation ("without battery," "no battery," "non-electric,"
"without wireless capability," "not intended for babies," and Hebrew
equivalents) must never be treated as, or silently converted into, a
positive signal for the negated characteristic. Any proposed
positive-signal change must be checked against existing negation
handling before being accepted.

## Alias and normalization safety gate

Before accepting or proposing any new/changed term: require safe
whole-word/phrase behavior; Hebrew and English boundary review;
singular/plural review; prefix/inflection review; negative/exclusion
context review; material-alone and characteristic-alone false-positive
review. Never accept plain substring matching. Never accept a term
that is only a broad material, adjective, or generic property without
meaningful product context.

## Collision-protection gate

Check every proposed or reviewed term against: cross-family alias
collision, internal-word collision, common-word collision, partial-
token collision, Hebrew-prefix collision, singular/plural collision,
and transliteration collision where relevant. See
`references/collision-and-isolation-checklist.md` for the full list.

## Cross-family isolation gate

A signal that is contextually relevant to one family (vehicle,
medical, baby, plant, animal, food-contact, electrical, wireless,
battery, sport-vs-occupational) must not leak into an unrelated
family's suggestion set merely because the word appears in the input.
Examples: a dog leash is not animal-origin or animal food; a cream
with plant extract is not an agricultural product; a textile with a
flower print does not activate a plant-product family; an ordinary
product used in a vehicle does not become a vehicle part.

## Generic-fallback gate

Generic inputs (e.g. "product," "item," "equipment," "part," and the
Hebrew equivalents מוצר / ציוד / חלק / פריט) must initially show only
"other general product," "not sure," a neutral request for a more
precise description, and access to the complete family list — never
the full family list automatically, and never an auto-selected family.

## No-auto-selection gate

No proposed change may cause a family to be automatically selected on
the user's behalf. Suggestions surface possibilities; selection always
remains a user action.

## "Show all" preservation gate

Any proposed change must confirm the full family list remains
reachable through "Show all" (or the project's current equivalent
control) in every affected state, including generic-input and
ambiguous-input states.

## Cumulative-family gate

Support cumulative suggestions when independent characteristics
justify them, without erasing the product's primary identity: a toy
remains a toy even if electrical or wireless; a medical product
remains medical even if electrical; a product part must not
automatically become the complete product merely because an additional
characteristic is present. State explicitly, for any proposed change,
which family is primary and which are additional/cumulative.

## Hebrew and English coverage

Every assessment and every proposed test case must consider both
Hebrew and English input, including generic terms in both languages,
negation phrasing in both languages, and normalization behavior for
both (see the normalization module identified during architecture
discovery).

## Required evidence

Every proposed change must name: the exact input; the expected
suggested families; the families that must not be suggested; the
reason; the affected code surface(s); the required targeted validation
(name only); and the exact SHA the assessment was performed against.

## Required structured output

When invoked, produce a structured assessment containing at least:

1. Request summary
2. Exact input examples
3. Known information
4. Missing information
5. Conflicting information
6. Current behavior, if verified
7. Expected suggested families
8. Families that must not be suggested
9. Primary family identity
10. Additional cumulative families, if relevant
11. Complete-product vs. part/accessory status
12. Positive signals
13. Negative signals
14. Explicit negations
15. Language and normalization considerations
16. Collision risks
17. Cross-family isolation risks
18. Generic-fallback impact
19. "Show all" impact
20. Auto-selection impact
21. Affected responsibility layer
22. Candidate implementation surfaces
23. Surfaces that must remain unchanged
24. Regulatory-rule impact
25. Professional-routing impact
26. Document-state impact
27. Required handoffs
28. Positive test examples
29. Negative test examples
30. Boundary test examples
31. Negation test examples
32. Ambiguity test examples
33. Hebrew test examples
34. English test examples
35. Cross-family isolation tests
36. Required validation level (name only —
    `freightime-regression-validation` selects the actual commands)
37. Exact stop conditions (if triggered)
38. Implementation plan (if not stopped)
39. Non-goals
40. Product Owner decisions required, if any

**This output is an analysis and implementation plan only. It is never
permission to change code, push, merge, or deploy.**

## Stop conditions

Stop and report instead of producing an implementation plan when:

1. A new professional rule is required but not yet approved by the
   Product Owner.
2. Two approved rules conflict and precedence is not established.
3. The requested behavior would alter a regulatory result without
   `freightime-product-rule-authoring` review.
4. The requested behavior would alter professional routing without
   `freightime-product-rule-authoring` review.
5. The requested behavior would alter document requirements without
   `freightime-product-rule-authoring` review.
6. The requested behavior relies on unsafe substring matching.
7. The request does not distinguish a complete product from a part or
   accessory where the distinction changes the result.
8. An explicit negation conflicts with a proposed positive signal.
9. The current architecture or source of truth cannot be identified.
10. The request expands beyond family-suggestion quality into
    unrelated product work.
11. A required Product Owner decision is missing.
12. Repository or Git preflight is unsafe.

When stopping: state the exact conflict or missing decision; ask only
the smallest necessary question; do not invent a rule; do not modify
code.

## References

- `references/family-suggestion-review-template.md` — reusable intake
  and review template aligned field-for-field with the required output
  above.
- `references/collision-and-isolation-checklist.md` — quick-reference
  collision and cross-family-leakage checks.
- `evaluations/scenarios.md` — the 34 required scenario evaluations
  used to validate this skill's rules before first use.
