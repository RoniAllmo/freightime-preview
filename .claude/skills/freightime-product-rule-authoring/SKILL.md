---
name: freightime-product-rule-authoring
description: Convert a product-owner-approved professional rule into a precise, reviewable, testable FreighTime implementation specification — rule intake, known/missing/conflict analysis, precedence, presentation-vs-regulation separation, alias safety, follow-up-question gating, professional-routing gating, and regulatory-wording safeguards. Use when adding or changing a product rule, regulatory direction, product subtype, exception, family alias, professional referral, CTA behavior, or follow-up question, or when reviewing whether a proposed rule conflicts with existing rules. Does not perform Git operations, does not select validation commands, and does not determine Israeli import law independently — the product owner is the sole professional authority.
---

# FreighTime Product Rule Authoring

## Purpose

Turn an approved product-owner rule into a structured, reviewable
implementation plan — never an automatic implementation, never an
invented regulatory requirement, never a broadened scope. This skill
produces the specification; it does not touch application code, does
not run Git operations, and does not choose test commands.

**Boundaries:**
- `freightime-safe-git-workflow` owns branch/commit/push/PR/merge/CI/
  Pages/cleanup — this skill never performs a Git operation.
- `freightime-regression-validation` owns validation-level and test-
  command selection — this skill only *names* the required validation
  level in its output (see Implementation Plan Output §23); it does
  not decide the actual commands.
- `freightime-product-quality` owns UX/accessibility/privacy quality
  standards — this skill owns the *rule content and its safe
  translation into implementation surfaces*, not UX polish.

This skill contains no copy of the regulatory matrix and no cached
regulatory facts of its own. Every fact it uses must be either
explicitly stated by the product owner in the current task, or read
directly from an authoritative project source at the time of use.

## Source-of-truth principle

**The product owner is the sole professional authority for
project-specific rules.** Claude must not:
- infer an unapproved regulatory rule from general knowledge;
- substitute general internet knowledge for a product-owner decision;
- expand a rule beyond its approved scope;
- treat one example as the entire rule;
- alter approved wording merely for technical convenience;
- pick a regulator when the approved rule is ambiguous;
- convert a "possible direction" into a final legal conclusion.

Every statement in the output must be labeled as exactly one of:

1. **Product-owner-approved fact** — stated explicitly in this task or
   a prior authorized decision.
2. **Existing project behavior** — read directly from an authoritative
   module at use time.
3. **Implementation inference** — a technical consequence Claude
   derived, never a new regulatory fact.
4. **Missing professional decision** — not yet decided by the product
   owner, and it changes the outcome.
5. **Presentation-only behavior** — affects only initial suggestions,
   never the regulatory result.
6. **Final-result behavior** — affects the regulatory signal, wording,
   or professional routing.

## Project architecture (confirmed at time of authoring, re-verify per task — do not cache as fact)

- **Authoritative regulatory data:** `product-family-matrix.js`
  (generated, frozen — never hand-edited by this skill's output).
- **Real identification:** `product-family-identification.js` (matrix
  alias matching, `FAMILY_NEGATIVE_TERMS`).
- **Presentation-only suggestion:** `family-material-disclosure.js`,
  `product-family-concept-coverage.js` — never consulted by
  identification or result construction.
- **Explicit-selection mapping:** `product-family-selection-mapping.js`
  (checkbox ↔ matrix row, `CANDIDATE_SET_SCOPED_HINTS`).
- **Approved presentation overlay (not matrix, not alias, not
  signal):** `product-family-guidance.js` — a small, explicitly
  authorized set of family-keyed notes.
- **Signal deduplication across rule modules:**
  `product-family-reconciliation.js`.
- **Final-result construction:** `product-family-result.js` (pure,
  DOM-free — the authoritative "what does the user see" surface).
- **Professional taxonomy and CTA:** `professional-category-registry.js`
  (canonical professional IDs, roles, disclaimer categories — never
  invent an inline professional identity).
- **Documents:** `document-readiness.js` (suggestions),
  `document-dedup.js` (the one, centralized dedup decision point).
- **Questions:** `layered-question-model.js`.

Re-confirm this list against the live repository before relying on it
for a specific task — module names and boundaries can change over
time; this skill's own text is not the source of truth for that.

## Rule intake

Structure every proposed rule into these fields before analysis. Do
not require an irrelevant field; do require every field that changes
the outcome.

1. Rule name
2. Product family
3. Product concept or subtype
4. Main product vs. part / accessory / component / raw material / packaging
5. Intended use
6. User or destination (domestic / commercial / industrial / medical /
   baby / animal / human consumption / pharmaceutical production)
7. Relevant material or composition
8. Characteristic: electrical, wireless, motorized, pressurized,
   food-contact, medical, protective, animal-origin, plant-origin, other
9. Main regulatory direction
10. Additional regulatory direction
11. No-positive-direction outcome, where approved
12. Existing exception
13. Newly approved exception
14. Information required to distinguish outcomes
15. Whether a follow-up question is allowed
16. Whether the product owner explicitly prohibited an additional
    question for this family
17. Positive examples
18. Negative examples
19. Boundary examples
20. Approved wording
21. Professional referral
22. CTA behavior
23. Documents or evidence needed
24. Urgency or cost-exposure implications, when relevant

## Known / Missing / Conflicting

Produce exactly these three sections before any implementation plan:

**A. Known** — only facts explicitly approved by the product owner, or
already present in an authoritative project source (cite the module).

**B. Missing** — information that genuinely changes the professional
outcome. Do not list information that is irrelevant to the result.

**C. Conflicting** — a proposed rule that conflicts with an existing
family default, another subtype, a family-level rule, a
professional-routing rule, a presentation alias, a follow-up-question
policy, or a previously stored product-owner decision.

**If a critical conflict exists: stop before producing an
implementation plan.** Report the exact conflict and request only the
smallest necessary product-owner decision to resolve it. Never ask a
question whose answer already exists in the project or the current
conversation.

## Precedence

State explicit precedence for every rule with more than one matching
condition. Default order (use only when the affected area has no
existing, more specific authoritative precedence — preserve that
precedence instead when one exists):

1. Explicit product-subtype rule
2. Explicit product-purpose rule
3. Explicit material/composition/configuration rule
4. Explicit regulatory exception
5. Approved characteristic-based rule
6. Product-family default
7. Generic fallback
8. Information Needed, when the outcome cannot be determined safely

The implementation plan must state which rule wins when more than one
matches, and why.

## Multiple regulatory directions

Support cumulative directions when independent characteristics justify
them (e.g. main product approval + additional wireless approval +
additional pressure-container approval). Never suppress the main
product family because an additional characteristic exists. Never
apply an additional direction when that characteristic is explicitly
negated in the description. Never merge distinct approved directions
into vague wording ("approval may be required") when the approved
rules already distinguish them — state each direction separately.

## No-authorization outcome

When the approved result is "no positive regulatory requirement":
never invent a regulator to fill the gap; never convert the result
into Information Needed unless a genuine missing distinction exists;
preserve cautious operational wording; never present "no positive
requirement identified" as a legal guarantee; keep any existing
professional-verification disclaimer intact.

## Presentation vs. regulation (hard separation)

- **Presentation layer:** initial family suggestions, aliases, concept
  terms, positive/negative contexts, visible options, never an
  automatic selection.
- **Canonical product identification:** the authoritative family/matrix
  resolution.
- **Regulatory result:** signals, wording, additional directions,
  Information Needed, no-positive outcome.
- **Professional routing:** professional ID, priority, primary/
  supporting role, CTA.

**A presentation-only request must never change a final regulatory
result. A regulatory change must never be implemented only through a
presentation hint.** State explicitly, in every implementation plan,
which of these four surfaces the rule touches — and confirm the others
are unaffected.

## Alias and product-term safety

Before adding an alias or concept term, require: safe whole-word/
phrase behavior; Hebrew and English boundary review where relevant;
singular/plural review where relevant; prefix handling where relevant;
negative/exclusion context; complete-product-vs-part/accessory
distinction; cross-family collision review; internal-word collision
review; material-alone false-positive review; characteristic-alone
false-positive review. Never use plain substring matching. Never add a
term that is only a broad material, adjective, or use, unless combined
with meaningful context. Keep every example an example — never a
hardcoded complete input sentence in production logic.

This skill decides whether an approved professional rule requires a
product-term or alias-related implementation change at all. Once that
question is in scope, detailed assessment of the matching behavior
itself — normalization, substring safety, collisions, negation,
generic fallback, family relevance, complete-product-vs-part
distinction, "Show all," or automatic-selection behavior — defers to
`freightime-family-suggestion-quality`. That skill must not create or
change professional or regulatory policy; if a task touches both the
professional-rule content and the matching behavior, keep the two
concerns separate and preserve whichever Product Owner approval each
one requires.

## Follow-up question gate

Add a question only when **all** of these hold: the answer can change
the regulatory or professional result; the information is not already
known; it cannot be safely inferred from the supplied description; the
question is not already asked elsewhere; it will not create
contradictory state; the product owner has not prohibited an
additional question for this family; it has a clear answer-to-result
mapping; Edit Answers/Reset/Back/New Assessment can preserve or clear
it correctly. If any condition fails, do not add the question — prefer
using existing product description and characteristics when the
product owner has approved that approach.

## Professional-routing gate

When a rule affects professional routing, require: canonical
professional ID; visible title; main or supporting role; priority;
covered category IDs; CTA destination and label; deduplication
behavior; fallback behavior; confirmation the professional is not
already supplied by another rule. Never introduce an inline
professional identity — use the canonical taxonomy
(`professional-category-registry.js`). Never change professional
routing unless the product-owner rule explicitly requires it.

## Document-state gate

If the rule affects document preparation, identify: required document;
recommended document; already-available document source;
deduplication behavior; whether the question is already asked; whether
the document changes the result or only supports verification. Never
create a second document-state source — route through the existing
centralized dedup point.

## Regulatory-wording safeguards

Use concepts such as: initial direction, recommended check, verify
against official and current sources, professional review, information
needed. Never represent the system as issuing binding customs
classification, an import permit, legal advice, authority approval, or
a guaranteed release decision. Never rewrite approved wording merely
to sound stronger.

## Implementation plan output

Produce exactly this structure (a plan, not implementation permission
— this skill never authorizes merge or deployment):

1. Approved rule summary
2. Scope
3. Out-of-scope items
4. Known facts
5. Missing decisions
6. Conflicts found
7. Rule precedence
8. Existing source of truth
9. Files likely affected
10. Files that must not change
11. Presentation impact
12. Identification impact
13. Regulatory-result impact
14. Professional-routing impact
15. Question impact
16. Document impact
17. Positive cases
18. Negative cases
19. Boundary cases
20. Existing behavior that must remain unchanged
21. Required targeted tests
22. Required integration checks
23. Required release validation level (name the level only —
    `freightime-regression-validation` selects the actual commands)
24. Rollback expectation
25. Exact product-owner decision still required, if any

## Stop conditions

Stop and report instead of producing an implementation plan when: a
critical conflict exists (§ Known/Missing/Conflicting); the approved
rule is genuinely insufficient to choose a regulator or outcome; the
task would require inferring an unapproved regulatory fact; the task
would require merging or broadening two distinct product categories
with different regulatory outcomes; or the task asks this skill to
perform a Git operation or select validation commands (redirect to the
owning skill instead).

## References

- `references/rule-template.md` — reusable intake template for a new
  rule request.
- `references/conflict-checklist.md` — quick-reference conflict areas
  to check before implementation.
- `evaluations/scenarios.md` — the 16 required scenario evaluations
  used to validate this skill's rules before first use.
