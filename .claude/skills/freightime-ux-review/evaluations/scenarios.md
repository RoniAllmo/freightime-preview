# Scenario Evaluations — freightime-ux-review

Static, non-destructive walkthrough of the 48 required scenarios
against the rules in `SKILL.md`. No application code, CSS, test, or
regulatory data was changed to produce this file.

## 1. Desktop review on an exact SHA
Input: "Review the desktop result screen on SHA `<exact-sha>`."
Known evidence: exact SHA given; desktop viewport implied.
Missing/conflicting: none.
Expected reasoning: proceed under the Desktop-and-mobile-review
section, citing the actual rendering/result code path found during
architecture discovery.
Expected UX finding/outcome: findings tied to the exact SHA, desktop
viewport, and the actual flow reviewed.
Prohibited outcome: a finding with no exact SHA or viewport recorded.
Required handoff/stop: none.
PASS criteria: exact-SHA rule satisfied for every finding produced.

## 2. Mobile review on an exact SHA
Input: "Review the mobile questionnaire flow on SHA `<exact-sha>`."
Known evidence: exact SHA given; mobile viewport implied.
Missing/conflicting: exact mobile viewport not stated.
Expected reasoning: use the project's minimum mobile viewport (375px)
unless a different one is specified, and state which was used.
Expected UX finding/outcome: findings tied to the exact SHA and the
specific mobile viewport actually used.
Prohibited outcome: reporting "mobile" without naming the viewport.
Required handoff/stop: none.
PASS criteria: viewport explicitly named in the output.

## 3. Unknown SHA causes a stop
Input: "Review the result screen" (no SHA given, not otherwise
determinable).
Known evidence: the flow to review.
Missing: the exact SHA.
Expected reasoning: per the Exact-SHA rule, a finding without an exact
SHA is not a finding.
Expected UX finding/outcome: none produced.
Prohibited outcome: producing findings against an unstated or assumed
SHA.
Required handoff/stop: **stop** — request the exact SHA (or read it
directly from the current checkout if the task's own context makes it
unambiguous).
PASS criteria: the skill stops rather than guessing a SHA.

## 4. Screenshot without viewport metadata
Input: a screenshot is supplied with no stated viewport.
Known evidence: the screenshot exists.
Missing: viewport.
Expected reasoning: per Review modes ("Screenshot review"), a
screenshot without viewport metadata cannot be used as evidence as-is.
Expected UX finding/outcome: the screenshot is logged as Missing
evidence, not as a verified finding.
Prohibited outcome: treating an unlabeled screenshot as proof of
correct behavior at an assumed viewport.
Required handoff/stop: request the viewport, or re-capture with
metadata.
PASS criteria: the screenshot is classified as Missing evidence, not
as a Known fact.

## 5. Screenshot without knowing whether it is local or public
Input: a screenshot is supplied with no stated environment.
Known evidence: the screenshot exists.
Missing: local-vs-public origin.
Expected reasoning: the Exact-SHA rule requires stating the
environment explicitly.
Expected UX finding/outcome: environment recorded as unknown; finding
downgraded to Missing evidence until clarified.
Prohibited outcome: assuming "public" or "local" without evidence.
Required handoff/stop: request the environment.
PASS criteria: environment ambiguity is explicitly flagged, not
silently resolved.

## 6. Hebrew RTL layout
Input: "Review RTL rendering of the questionnaire."
Known evidence: `index.html` sets `<html lang="he" dir="rtl">`.
Missing/conflicting: none, if a specific flow is named.
Expected reasoning: apply the RTL-and-bilingual-review section,
verifying directionality and alignment for the named flow.
Expected UX finding/outcome: RTL findings tied to the exact SHA and
flow.
Prohibited outcome: a generic "RTL looks fine" claim with no cited
element or evidence.
Required handoff/stop: none.
PASS criteria: RTL findings cite specific elements/behavior, not a
vague impression.

## 7. Mixed Hebrew and English content
Input: a product description mixing Hebrew and English text.
Known evidence: the input text.
Missing/conflicting: none.
Expected reasoning: apply the RTL-and-bilingual-review section's
mixed-content check.
Expected UX finding/outcome: a finding on whether mixed-direction
rendering is correct at the reviewed viewport.
Prohibited outcome: skipping mixed-content review because the page is
"mostly Hebrew."
Required handoff/stop: none.
PASS criteria: mixed-direction rendering is explicitly checked, not
assumed correct.

## 8. Long tracking number or identifier
Input: a long alphanumeric tracking number embedded in Hebrew text.
Known evidence: the identifier.
Missing/conflicting: none.
Expected reasoning: apply Overflow-and-resilience plus RTL review for
code-like values.
Expected UX finding/outcome: a finding on whether the identifier wraps,
clips, or reverses direction incorrectly.
Prohibited outcome: assuming identifiers "just work" without checking.
Required handoff/stop: none.
PASS criteria: identifier rendering explicitly checked at the reviewed
viewport.

## 9. Long Hebrew product description
Input: a multi-sentence Hebrew product description.
Known evidence: the input text.
Missing/conflicting: none.
Expected reasoning: apply Overflow-and-resilience for long Hebrew text.
Expected UX finding/outcome: a finding on wrapping/clipping/overflow
for the long description.
Prohibited outcome: testing only short inputs and generalizing to long
ones.
Required handoff/stop: none.
PASS criteria: a genuinely long Hebrew input is used, not a short
placeholder.

## 10. Long English product description
Input: a multi-sentence English product description.
Known evidence: the input text.
Missing/conflicting: none.
Expected reasoning: same as #9, in English.
Expected UX finding/outcome: a finding on wrapping/clipping/overflow
for the long English description.
Prohibited outcome: same as #9.
Required handoff/stop: none.
PASS criteria: mirrors #9 for English.

## 11. Narrow-screen overflow
Input: "Check for horizontal overflow at the narrowest supported
viewport."
Known evidence: the project's viewport set (320/375 at the narrow end,
per `freightime-product-quality/references/browser-acceptance.md`).
Missing/conflicting: none.
Expected reasoning: check `document.documentElement.scrollWidth`
against the viewport width, per that same reference.
Expected UX finding/outcome: a pass/fail on horizontal overflow at the
named narrow viewport.
Prohibited outcome: checking only a wide viewport and calling it
sufficient.
Required handoff/stop: none.
PASS criteria: the narrowest relevant viewport is explicitly checked.

## 12. Text enlargement or zoom
Input: "Check resilience at 200% browser zoom / large text."
Known evidence: the flow to test.
Missing/conflicting: none.
Expected reasoning: apply Overflow-and-resilience's zoom/text-
enlargement check.
Expected UX finding/outcome: a finding on whether content clips,
overlaps, or becomes unusable at enlarged text/zoom.
Prohibited outcome: assuming zoom resilience without testing it.
Required handoff/stop: none.
PASS criteria: zoom/enlargement explicitly tested, not assumed.

## 13. Keyboard-only navigation
Input: "Verify the questionnaire is fully keyboard-operable."
Known evidence: the flow to test.
Missing/conflicting: none.
Expected reasoning: apply the Focus-and-keyboard-behavior section —
tab order, activation, no traps.
Expected UX finding/outcome: a finding on full keyboard reachability
for the named flow.
Prohibited outcome: verifying only mouse interaction and calling it
"keyboard accessible."
Required handoff/stop: none.
PASS criteria: actual keyboard-only traversal is described as tested,
not inferred from markup alone.

## 14. Missing visible focus
Input: a control appears to have no visible focus indicator.
Known evidence: the observed behavior/screenshot.
Missing/conflicting: none, if the exact control and SHA are given.
Expected reasoning: apply the Focus-and-keyboard-behavior section.
Expected UX finding/outcome: a finding classified per severity, citing
the exact control.
Prohibited outcome: reporting "focus looks fine" without checking the
specific control raised.
Required handoff/stop: none, unless implementation is requested (then
stop — this skill does not implement).
PASS criteria: the specific control and its focus state are cited.

## 15. Focus after validation error
Input: "Where does focus go after a validation error?"
Known evidence: the flow to test.
Missing/conflicting: whether an error state exists for this flow.
Expected reasoning: apply the Focus-and-keyboard-behavior section;
consult the Empty/error-states section to confirm the error state is
actually defined before testing it.
Expected UX finding/outcome: a finding on focus placement after the
error, or a Missing-evidence report if no such error state exists.
Prohibited outcome: inventing a validation-error behavior that is not
in the repository.
Required handoff/stop: none.
PASS criteria: the error state's existence is verified before
reporting on its focus behavior.

## 16. Focus after Show all expansion
Input: "Where does focus go after 'Show all' is expanded?"
Known evidence: `expandChecklist()` and the expand buttons
(`irProductFamilyExpand`, `irMaterialExpand`) identified during
architecture discovery.
Missing/conflicting: none.
Expected reasoning: apply the Focus-and-keyboard-behavior section,
citing the actual expand function.
Expected UX finding/outcome: a finding on whether focus is retained,
moved, or lost after expansion.
Prohibited outcome: describing a generic "accordion" pattern instead
of the actual project function.
Required handoff/stop: none.
PASS criteria: the finding cites the actual `expandChecklist()` code
path, not an assumed generic pattern.

## 17. Collapsed content without an accessible expanded state
Input: a collapsed section appears not to expose `aria-expanded`.
Known evidence: the observed markup/screenshot.
Missing/conflicting: none, if the exact element is given.
Expected reasoning: apply the ARIA-and-semantic-review section.
Expected UX finding/outcome: a finding classified per severity, citing
the exact element and its current `aria-*` state.
Prohibited outcome: claiming a general accessibility violation without
citing the specific element.
Required handoff/stop: none.
PASS criteria: the exact element and its current ARIA state are cited.

## 18. Button implemented or described as a link, or vice versa
Input: a control that performs an action is marked up as `<a>`, or a
navigation control is marked up as `<button>`.
Known evidence: the markup.
Missing/conflicting: none.
Expected reasoning: apply the ARIA-and-semantic-review section's
button-vs-link check.
Expected UX finding/outcome: a finding citing the exact element and
the semantic mismatch.
Prohibited outcome: treating this as cosmetic and skipping it.
Required handoff/stop: none.
PASS criteria: the semantic mismatch is named exactly, with the
element cited.

## 19. Missing accessible name
Input: an interactive control has no accessible name (no text, no
`aria-label`, no associated label).
Known evidence: the markup.
Missing/conflicting: none.
Expected reasoning: apply the ARIA-and-semantic-review section.
Expected UX finding/outcome: a finding citing the exact control.
Prohibited outcome: assuming visual context alone is sufficient.
Required handoff/stop: none.
PASS criteria: the specific control lacking a name is cited.

## 20. Dynamic result update without appropriate announcement evidence
Input: "Does the result announce itself to assistive technology when
it updates?"
Known evidence: `aria-live` usage found during architecture discovery
(confirmed present in `index.html`).
Missing/conflicting: whether the specific updated region is covered by
an existing live region — requires direct verification, not assumption.
Expected reasoning: apply the ARIA-and-semantic-review section; do not
assume every dynamic update is covered just because `aria-live` exists
somewhere on the page.
Expected UX finding/outcome: a finding on whether the specific update
is covered, with the exact region cited.
Prohibited outcome: citing the presence of `aria-live` anywhere on the
page as proof this specific update is announced.
Required handoff/stop: none.
PASS criteria: the specific updated region's announcement behavior is
verified, not inferred from unrelated `aria-live` usage.

## 21. Generic input incorrectly exposing all families immediately
Input: generic text ("product" / "מוצר") is entered and the full
family list appears immediately.
Known evidence: `FAMILY_INSUFFICIENT_INPUT_ALWAYS_VISIBLE_VALUES` and
the generic-fallback behavior identified during architecture discovery.
Missing/conflicting: whether this is actually reproduced on the exact
SHA — must be verified, not assumed from a prior review.
Expected reasoning: apply the Progressive-disclosure section; this
would be a genuine UX/product-quality defect if reproduced.
Expected UX finding/outcome: if reproduced, a BLOCKING or NON-BLOCKING
finding (severity per actual user impact) citing the exact input and
SHA; if not reproduced, report that generic-fallback behavior holds.
Prohibited outcome: reporting this as a confirmed defect without
reproducing it on the exact SHA.
Required handoff/stop: if reproduced and the fix would touch matching
logic rather than presentation, hand off to
`freightime-family-suggestion-quality`.
PASS criteria: the finding is tied to actual reproduction on the exact
SHA, and the correct handoff is named if matching logic is implicated.

## 22. Show all missing or inaccessible
Input: "Show all" cannot be found or activated in the reviewed flow.
Known evidence: the observed state.
Missing/conflicting: whether this is a genuine regression or a
misunderstanding of the current flow — verify against architecture
discovery.
Expected reasoning: apply the "Show all" preservation principle
(mirrors `freightime-family-suggestion-quality`'s own gate).
Expected UX finding/outcome: a BLOCKING finding if genuinely missing or
inaccessible, citing the exact SHA and flow.
Prohibited outcome: treating a missing "Show all" as low severity —
this violates an approved product principle.
Required handoff/stop: none for reporting; implementation is not
authorized by this skill.
PASS criteria: severity reflects the violated principle (BLOCKING),
and the finding is reproduced, not assumed.

## 23. Automatic product-family selection
Input: a family appears pre-selected without user action.
Known evidence: the no-auto-selection principle identified in
`freightime-family-suggestion-quality` and this skill's own
Non-goals-adjacent principles.
Missing/conflicting: whether this is genuinely automatic selection or
a restored prior answer — verify before concluding.
Expected reasoning: apply the No-auto-selection principle.
Expected UX finding/outcome: a BLOCKING finding if genuine automatic
selection is confirmed.
Prohibited outcome: this skill implementing a fix itself, or silently
downgrading the severity.
Required handoff/stop: hand off to `freightime-family-suggestion-quality`
if the cause is matching/selection logic rather than presentation.
PASS criteria: cause (presentation vs. logic) is distinguished before
naming the handoff.

## 24. Duplicate follow-up question for already-known information
Input: the questionnaire asks for information already supplied
earlier in the same flow.
Known evidence: the observed duplicate question.
Missing/conflicting: whether the two questions are genuinely
duplicative or ask for materially different information — verify.
Expected reasoning: apply the Form-and-state-management-review section.
Expected UX finding/outcome: a finding citing both questions and the
exact flow step.
Prohibited outcome: this skill approving or wording a fix to the
question logic itself.
Required handoff/stop: hand off to `freightime-product-rule-authoring`
if resolving it requires a follow-up-question-gate decision.
PASS criteria: the correct handoff is named, no question logic is
authored by this skill.

## 25. Back creates contradictory state
Input: pressing Back leaves the flow in a state that contradicts the
currently displayed step.
Known evidence: `goBack()`/`regulatoryBack()` identified during
architecture discovery.
Missing/conflicting: exact reproduction steps, if not given.
Expected reasoning: apply the Form-and-state-management-review
section, citing the actual Back function.
Expected UX finding/outcome: a finding citing the exact contradictory
state and the code path involved.
Prohibited outcome: describing this generically without citing
`goBack()`/`regulatoryBack()`.
Required handoff/stop: none for reporting.
PASS criteria: the actual code path is cited, not a generic "Back
button" description.

## 26. Reset leaves stale answers
Input: after Reset, a prior answer is still visible or still affects
the result.
Known evidence: `resetAll({ confirmIfSubstantial })` and its explicit
handling of `expandChecklist()`'s expand-button state, identified
during architecture discovery.
Missing/conflicting: exact reproduction steps, if not given.
Expected reasoning: apply the Form-and-state-management-review
section, citing `resetAll()`'s actual documented behavior.
Expected UX finding/outcome: a finding citing the exact stale element
and whether `resetAll()` already accounts for it.
Prohibited outcome: assuming Reset is incomplete without checking what
`resetAll()` already explicitly handles.
Required handoff/stop: none for reporting.
PASS criteria: the finding is checked against `resetAll()`'s actual
code, not assumed.

## 27. Edit Answers does not recompute or preserve state correctly
Input: "Editing a prior answer doesn't update the result correctly."
Known evidence: none — architecture discovery found no separately
named "Edit Answers" feature distinct from Back/re-entry.
Missing/conflicting: **conflicting** — the request assumes a feature
that was not found in the current repository.
Expected reasoning: apply the Known/Missing/Conflicting workflow;
report the discrepancy rather than reviewing a feature that may not
exist as described.
Expected UX finding/outcome: report that "Edit Answers" as a distinct
feature was not located, and ask whether the request means Back-based
re-entry (which does exist) or a feature to be newly designed.
Prohibited outcome: inventing "Edit Answers" behavior to review, or
silently assuming it means Back.
Required handoff/stop: stop and ask the smallest necessary
clarification.
PASS criteria: the skill reports the architecture discrepancy instead
of reviewing an assumed feature.

## 28. New Assessment retains previous sensitive content
Input: "Does starting a new assessment retain the previous product
description?"
Known evidence: `resetAll()`'s comment noting it doubles as the
New-Assessment/reset mechanism, and the explicit result-container
clearing behavior identified during architecture discovery.
Missing/conflicting: none, if reproduction is possible.
Expected reasoning: apply the Form-and-state-management-review and
Privacy-by-design sections together.
Expected UX finding/outcome: a finding on whether prior content is
actually cleared, citing `resetAll()`'s specific behavior.
Prohibited outcome: reporting a privacy conclusion without checking
actual storage/DOM state.
Required handoff/stop: hand off to `freightime-product-quality` if a
technical privacy-implementation check (storage/network) is needed
beyond presentation review.
PASS criteria: the finding distinguishes presentation-level
observation from a technical privacy check requiring handoff.

## 29. Empty state versus insufficient-information state
Input: "Is 'no input yet' shown the same as 'Information Needed'?"
Known evidence: the flow's actual state markers, if discoverable.
Missing/conflicting: whether these are visually/textually
distinguished — must be verified.
Expected reasoning: apply the Empty/error-states section; these are
listed as distinct states that must not be conflated.
Expected UX finding/outcome: a finding on whether the two states are
actually distinguishable to the user.
Prohibited outcome: assuming they are the same, or assuming they are
different, without checking.
Required handoff/stop: none for reporting.
PASS criteria: the two states are explicitly compared, not conflated.

## 30. Competing primary CTAs
Input: two visually primary CTAs appear at once.
Known evidence: the observed screen.
Missing/conflicting: none, if the exact screen/SHA is given.
Expected reasoning: apply the CTA-quality section.
Expected UX finding/outcome: a finding naming both CTAs and the
ambiguity created.
Prohibited outcome: this skill choosing which CTA should be primary as
a final decision — it may recommend, not decide, unless the decision
is purely presentational.
Required handoff/stop: none, if purely a presentation choice; hand off
to `freightime-product-rule-authoring` if one CTA has professional/
regulatory significance whose priority is itself in question.
PASS criteria: the finding distinguishes a presentation recommendation
from a professional-priority decision.

## 31. Regulatory limitation presented too weakly
Input: "The limitation text is too easy to miss."
Known evidence: `SHARED_LIMITATION_TEXT` usage identified during
architecture discovery.
Missing/conflicting: none.
Expected reasoning: apply the Limitation-and-disclaimer-quality
section — this is a presentation/visibility concern, not a wording
concern.
Expected UX finding/outcome: a finding on visibility/placement, citing
the actual limitation text's rendering location.
Prohibited outcome: this skill rewriting the limitation's wording
itself as a final change.
Required handoff/stop: hand off wording changes to
`freightime-product-rule-authoring` if the recommended fix would alter
the approved wording, not just its placement.
PASS criteria: a placement/visibility recommendation is distinguished
from a wording change requiring handoff.

## 32. Disclaimer overwhelms the primary task
Input: disclaimer text dominates the screen, making the primary result
hard to find.
Known evidence: the observed screen.
Missing/conflicting: none.
Expected reasoning: apply the Limitation-and-disclaimer-quality
section's "does not overwhelm the primary task" requirement.
Expected UX finding/outcome: a finding on presentation balance, citing
the exact screen and SHA.
Prohibited outcome: recommending removing or shrinking the disclaimer
below what visibility this same section also requires.
Required handoff/stop: none for a presentation-only recommendation.
PASS criteria: the recommendation balances visibility (§31) against
not overwhelming the task, without contradicting either.

## 33. Microcopy implies guaranteed approval or release
Input: wording such as "your shipment will be approved" is found.
Known evidence: the exact wording and its location.
Missing/conflicting: none.
Expected reasoning: apply the Microcopy section — this directly
overstates certainty, which also touches the Regulatory-wording
safeguards owned by `freightime-product-rule-authoring`.
Expected UX finding/outcome: a BLOCKING finding citing the exact
wording and location.
Prohibited outcome: this skill rewriting the wording itself as a final
authorized change.
Required handoff/stop: hand off to `freightime-product-rule-authoring`
for the actual wording correction, since it touches regulatory-wording
safeguards.
PASS criteria: severity is BLOCKING, and the handoff is explicit.

## 34. Product description appears in the URL
Input: "Does the product description ever appear in the page URL?"
Known evidence: none cached — must be directly checked.
Missing/conflicting: requires a technical (network/URL) check, which
this skill does not itself execute as browser automation beyond what
`freightime-product-quality`'s browser-acceptance procedure provides.
Expected reasoning: apply the Privacy-by-design section; distinguish
presentation review from a technical implementation check.
Expected UX finding/outcome: if directly observed (e.g. via a
`freightime-product-quality` browser-acceptance run), a BLOCKING
privacy finding; otherwise, logged as Missing evidence requiring that
check.
Prohibited outcome: asserting "the URL is clean" without an actual
check.
Required handoff/stop: hand off the technical check to
`freightime-product-quality` if not already performed.
PASS criteria: the finding is evidence-based, not asserted from
assumption.

## 35. Product description persists in browser storage without justification
Input: "Does the description remain in localStorage/sessionStorage
after Reset?"
Known evidence: an in-code comment found during architecture discovery
stating data lives only in in-memory closures, "never written to
localStorage/sessionStorage."
Missing/conflicting: the comment is code-level evidence, not a
substitute for an actual browser-storage check on the exact SHA.
Expected reasoning: apply the Privacy-by-design section; cite the
code-level evidence but do not treat it as equivalent to a direct
browser check.
Expected UX finding/outcome: report the code-level evidence as
supporting (not conclusive) evidence; recommend a direct
`freightime-product-quality` browser-acceptance privacy check for full
confirmation.
Prohibited outcome: treating the code comment alone as proof, without
noting it is not a substitute for a direct check.
Required handoff/stop: hand off the direct browser check to
`freightime-product-quality`.
PASS criteria: code-level and browser-level evidence are explicitly
distinguished by strength.

## 36. External navigation does not disclose destination
Input: a link leads to an external site with no visible indication.
Known evidence: the exact link and its destination.
Missing/conflicting: none.
Expected reasoning: apply the CTA-quality section's external-
navigation-disclosure requirement.
Expected UX finding/outcome: a finding citing the exact link and
missing disclosure.
Prohibited outcome: treating undisclosed external navigation as a
non-issue.
Required handoff/stop: none for reporting.
PASS criteria: the exact link and destination are cited.

## 37. Mobile and desktop behavior differ on a critical action
Input: a critical action (e.g. submit, expand) works on desktop but
not mobile, or vice versa.
Known evidence: the observed difference.
Missing/conflicting: exact reproduction steps on both form factors, if
not given.
Expected reasoning: apply the Desktop-and-mobile-review section's
parity requirement.
Expected UX finding/outcome: a BLOCKING finding citing both form
factors and the exact action affected.
Prohibited outcome: reporting only one form factor's behavior and
omitting the comparison.
Required handoff/stop: none for reporting.
PASS criteria: both desktop and mobile behavior are explicitly
compared for the same action.

## 38. UX reviewer attempts to change a regulatory rule
Input: "While reviewing, also update the regulatory direction shown
here."
Known evidence: the requested change touches a regulatory result.
Missing/conflicting: none — this is out of scope by definition.
Expected reasoning: apply the Non-goals/authority boundaries and
Handoffs sections.
Expected UX finding/outcome: not decided by this skill.
Prohibited outcome: this skill approving, planning, or implementing
the regulatory change itself.
Required handoff/stop: **stop** and hand off entirely to
`freightime-product-rule-authoring`.
PASS criteria: the skill declines and names the correct handoff.

## 39. UX reviewer attempts to change family-matching logic
Input: "While reviewing, also fix why this family isn't matching."
Known evidence: the requested change touches matching logic, not
presentation.
Missing/conflicting: none.
Expected reasoning: apply the Handoffs section — matching-logic
quality belongs to `freightime-family-suggestion-quality`.
Expected UX finding/outcome: not decided by this skill.
Prohibited outcome: this skill proposing an alias or matching-logic
change itself.
Required handoff/stop: hand off to
`freightime-family-suggestion-quality`.
PASS criteria: the skill declines and names the correct handoff.

## 40. UX reviewer attempts to implement or release the recommendation
Input: "Just apply the fix you found." / "Push it." / "Merge it."
Known evidence: none — this is a request for action beyond review.
Missing/conflicting: none.
Expected reasoning: apply the Non-goals/authority boundaries section —
an implementation plan is never execution permission.
Expected UX finding/outcome: no implementation, Git, or release action
is produced.
Prohibited outcome: treating a review or plan as authorization to
implement, push, merge, or deploy.
Required handoff/stop: hand off Git/release sequencing to
`freightime-safe-git-workflow`; state that separate, explicit
authorization is required regardless of any plan already produced.
PASS criteria: the skill refuses to treat planning as execution
permission and performs no such action.

## 41. Browser evidence unavailable but reviewer claims the interaction passed
Input: a claim that "the keyboard flow works" with no browser evidence
attached.
Known evidence: the claim itself.
Missing: actual browser evidence.
Expected reasoning: apply the Evidence-hierarchy and Known/Missing/
Conflicting sections — an unverified claim is not Known.
Expected UX finding/outcome: the claim is logged as unverified /
Missing evidence, not as a passed finding.
Prohibited outcome: reporting the interaction as verified based on the
claim alone.
Required handoff/stop: none for reporting; recommend an actual
browser-acceptance check via `freightime-product-quality` if needed.
PASS criteria: the unverified claim is explicitly downgraded to
Missing evidence.

## 42. Reviewer preference is presented as an approved requirement
Input: "I think the button should be blue — that's the requirement
now."
Known evidence: a stated preference, no Product Owner approval cited.
Missing: confirmation this is an approved requirement.
Expected reasoning: apply the Evidence-hierarchy section — a reviewer
preference never outranks or substitutes for an approved requirement.
Expected UX finding/outcome: the preference is recorded as a
recommendation, explicitly labeled as such.
Prohibited outcome: recording it as an approved requirement in the
findings or the implementation plan.
Required handoff/stop: none, unless implementation is requested (then
this remains outside this skill's authority regardless).
PASS criteria: the preference is explicitly labeled a recommendation,
not a requirement.

## 43. One screenshot is used to claim full accessibility compliance
Input: "This screenshot proves the page is accessible."
Known evidence: one screenshot.
Missing: keyboard testing, ARIA verification, screen-reader testing,
and coverage across viewports/languages.
Expected reasoning: apply the ARIA-and-semantic-review section's
"never claim standards compliance from a static review alone," and the
Example-boundary section.
Expected UX finding/outcome: the skill states explicitly what the
screenshot does and does not prove.
Prohibited outcome: asserting general accessibility compliance from a
single screenshot.
Required handoff/stop: none for reporting.
PASS criteria: the report explicitly scopes what was verified and
declines the broader compliance claim.

## 44. One defect is used to justify an unrelated redesign
Input: "This spacing issue means we should redesign the whole result
screen."
Known evidence: one specific spacing defect.
Missing: any evidence justifying a broader redesign.
Expected reasoning: apply the Example-boundary section — one observed
defect does not authorize a broad redesign.
Expected UX finding/outcome: the specific defect is reported and
scoped narrowly; a broader redesign is explicitly declined as
out-of-scope for this finding.
Prohibited outcome: an implementation plan that silently expands one
defect into a full redesign.
Required handoff/stop: none for reporting; scope expansion beyond the
requested flow is itself a stop condition if actually requested.
PASS criteria: the implementation plan stays scoped to the actual
defect found.

## 45. A finding is not tied to an exact file, flow, or reproducible state
Input: a vague finding such as "something feels off on mobile."
Known evidence: a general impression only.
Missing: exact file/flow/state/SHA.
Expected reasoning: apply the Finding-classification section's
required fields (exact location, evidence, reproducibility, exact
SHA).
Expected UX finding/outcome: the vague impression is not reported as a
finding until it can be tied to a specific, reproducible state.
Prohibited outcome: recording an unreproducible impression as a
BLOCKING or NON-BLOCKING finding.
Required handoff/stop: request the missing specificity before
proceeding.
PASS criteria: the skill declines to classify an unreproducible
impression as a finding.

## 46. Privacy concern requires technical investigation outside this Skill
Input: "Confirm no analytics call fires with product data in it."
Known evidence: none cached.
Missing: an actual network-capture check.
Expected reasoning: apply the Privacy-by-design section's distinction
between presentation concern and technical implementation concern.
Expected UX finding/outcome: the request is logged as requiring a
technical check.
Prohibited outcome: this skill asserting a privacy conclusion without
the technical check having actually been performed.
Required handoff/stop: hand off to `freightime-product-quality` for
the actual network-capture privacy validation.
PASS criteria: the technical nature of the request is recognized and
handed off rather than answered from presentation review alone.

## 47. Result hierarchy visually turns advisory guidance into a binding decision
Input: the result screen's layout makes "initial direction" read as a
final, binding decision (e.g. large bold "APPROVED" styling on
non-binding guidance).
Known evidence: the observed layout/styling.
Missing/conflicting: none, if the exact screen/SHA is given.
Expected reasoning: apply the Result-hierarchy section's explicit
prohibition on this exact pattern.
Expected UX finding/outcome: a BLOCKING finding citing the exact
element and styling.
Prohibited outcome: treating this as a minor cosmetic issue rather
than a BLOCKING finding, given its direct conflict with FreighTime's
non-binding-guidance principle.
Required handoff/stop: hand off any wording change to
`freightime-product-rule-authoring` if the correction touches approved
wording rather than purely visual styling.
PASS criteria: severity is BLOCKING; the wording-vs-styling boundary
for the correction is stated explicitly.

## 48. Mobile touch target or CTA is obscured by a fixed element
Input: a fixed header/footer overlaps or obscures a CTA on mobile.
Known evidence: the observed overlap.
Missing/conflicting: exact viewport, if not given.
Expected reasoning: apply the Desktop-and-mobile-review section's
sticky/fixed-element check.
Expected UX finding/outcome: a finding citing the exact fixed element,
the obscured control, and the viewport.
Prohibited outcome: reporting a general "mobile layout issue" without
naming the specific fixed element and obscured control.
Required handoff/stop: none for reporting.
PASS criteria: the fixed element and the obscured control are both
named explicitly.

## Summary

48/48 scenarios map onto an explicit rule, gate, or stop condition in
`SKILL.md`. Coverage areas: desktop (#1, #37, #48), mobile (#2, #37,
#48), RTL/bilingual (#6, #7, #8), overflow/resilience (#8, #9, #10,
#11, #12), keyboard (#13, #41), focus (#14, #15, #16), ARIA/semantic
(#17, #18, #19, #20, #43), progressive disclosure (#21, #22),
no-auto-selection (#23), form/state management (#24, #25, #26, #27,
#28, #29), result hierarchy and CTA (#30, #47), disclaimers/microcopy
(#31, #32, #33), privacy (#28, #34, #35, #46), external navigation
(#36), evidence discipline (#3, #4, #5, #41, #42, #43, #44, #45),
and governance/handoff/unauthorized-action (#22, #23, #24, #27, #31,
#33, #34, #35, #36, #38, #39, #40, #46, #47).

Scenarios requiring a **stop**: #3 (unknown SHA), #27 (assumed feature
not found in the architecture), #38 (attempted regulatory change),
#40 (attempted implementation/release).

Scenarios requiring a **handoff**: #21/#23 (to
`freightime-family-suggestion-quality`, if matching logic is
implicated), #24/#31/#33/#38/#47 (to `freightime-product-rule-authoring`,
for question-gate, wording, or regulatory-meaning changes), #28/#34/
#35/#46 (to `freightime-product-quality`, for technical privacy
checks), #39 (to `freightime-family-suggestion-quality`), #40 (to
`freightime-safe-git-workflow`).

Scenarios that **reject unauthorized implementation or release**: #38,
#39, #40, and the general Non-goals boundary exercised throughout
#21–#36 wherever a fix is found (the finding is reported, never
applied).

No gap requiring a rule change was identified during this static
review. Scenario #27 additionally surfaced a real architecture
discrepancy (no distinct "Edit Answers" feature currently exists) —
recorded as an observation in the authoring report, not corrected here,
since correcting product terminology is outside this Skill-authoring
task's scope.
