# Scenario Evaluations — freightime-regression-validation

Static, non-destructive walkthrough of the 14 required scenarios
against the rules in `SKILL.md`. No test suite, browser script, push,
merge, or deployment was executed to produce this file.

## 1. Documentation-only correction
Level: 0
Required checks: changed-file scope, `git diff --check`, working-tree status
Prohibited: frontend suite, browser check
Escalation condition: a runtime or workflow file also changed
Result: **PASS**

## 2. New project Skill
Level: 0
Required checks: file-structure validation (frontmatter, referenced
paths exist), `git diff --check`, working-tree status
Prohibited: frontend suite (a Skill has no executable runtime behavior)
Escalation condition: the Skill instructs executable runtime changes
Result: **PASS**

## 3. One static CSS property changed
Level: 1
Required checks: focused visual/computed-style check, direct syntax
check if JS touched, `git diff --check`
Prohibited: automatic full-suite run
Escalation condition: responsive layout, focus visibility, hidden-state,
interactive markup, or accessibility semantics affected
Result: **PASS**

## 4. Hidden-state CSS changed
Level: 2 (escalated from B's Level-1 default per the trigger above)
Required checks: DOM state assertions, keyboard reachability, bounded
browser check (375px + 1440px)
Prohibited: skipping the escalation just because the edit "looks like
CSS only"
Escalation condition already met — this scenario is the trigger case
Result: **PASS**

## 5. One product-family alias added
Level: 2 during development
Required checks: positive match, negative/boundary match, collision
check against neighboring families, cross-family isolation test
Prohibited: skipping Level 3 before merge
Escalation condition: **Level 3 required before merge** (category E)
Result: **PASS**

## 6. Shared text-normalization helper changed
Level: 2
Required checks: tests across every direct consumer of the helper
Escalation condition: full suite run once before publication (shared
helper = material production change, category D)
Result: **PASS**

## 7. Duplicate document question removed
Level: 2
Required checks: state-lifecycle tests, Edit Answers, Reset, result-
document construction tests (interactive/state category C)
Prohibited: treating this as a Level-1 "small edit"
Result: **PASS**

## 8. Result disclaimer styling changed only
Level: 1 or 2, decided by actual DOM/accessibility impact — pure visual
restyle with no structural/ARIA/focus change stays Level 1; any change
to hidden/visible state, heading structure, or focus order escalates to
Level 2
Result: **PASS** (rule correctly conditional, not a fixed level)

## 9. Professional-routing logic changed
Level: 2 during development, Level 3 before merge (category E)
Required checks: routing tests for each affected professional/CTA
outcome, cross-route isolation
Result: **PASS**

## 10. Backend unchanged during frontend-only work
Required checks: backend HEAD + working-tree status, read-only
Prohibited: rerunning the backend suite when SHA/tree are unchanged
from the last verified state
Result: **PASS**

## 11. Browser script reports failure due to wrong selector
Required action: classify as harness defect (not product defect) before
touching any product code; fix only the harness; rerun only the
affected scenario once
Prohibited: changing product code before independent reproduction;
omitting the failure from the report
Result: **PASS**

## 12. Complete frontend suite already passed on exact unchanged SHA
Required action: reuse that evidence (cite the run and SHA)
Prohibited: rerunning without a specific reason (failure, correction,
different SHA, or environment change)
Result: **PASS**

## 13. CI is green but Pages is pending
Required action: report Pages as pending; do not claim deployment
complete; apply the bounded-wait policy (one check, one ≤3-minute wait,
one more check, then report pending and stop)
Prohibited: conflating "CI green" with "deployed"
Result: **PASS**

## 14. Public Pages access blocked by sandbox
Required action: verify the deployment workflow run and its exact SHA;
report the sandbox network restriction as a separate environment
limitation, not a product/deployment failure; a local smoke check on
the same SHA may be cited as supporting evidence only, never as public-
site proof
Result: **PASS**

## Summary

14/14 scenarios map cleanly onto an explicit rule in `SKILL.md`,
including the two conditional cases (#4 and #8) where the correct level
depends on the actual impact rather than a fixed category. No gap
requiring a rule change was identified during this static review.
