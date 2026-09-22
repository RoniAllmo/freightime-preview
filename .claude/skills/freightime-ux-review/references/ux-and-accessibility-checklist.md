# UX and Accessibility Checklist — FreighTime UX Review

Quick-reference checklist. Full rules live in `SKILL.md`. This
checklist does not claim formal accessibility compliance (e.g. WCAG
conformance) — it only records what was actually reviewed, consistent
with `freightime-product-quality/references/accessibility-checklist.md`'s
own scope discipline.

## Scope and exact-SHA evidence
- [ ] Exact SHA recorded for every finding.
- [ ] Environment (local checkout vs. public) recorded.
- [ ] Viewport and language recorded for every finding.
- [ ] What was and was not tested is stated explicitly.

## Architecture discovery
- [ ] The actual current file/function responsible for the reviewed
      behavior was located and cited, not assumed from memory.
- [ ] The discovery is read-only — nothing was changed to perform it.

## Desktop
- [ ] Content priority is sensible at desktop width.
- [ ] No desktop-only critical action is missing on mobile.

## Mobile
- [ ] Touch targets are practical.
- [ ] No fixed/sticky element obscures a control or CTA.
- [ ] Orientation behavior reviewed where relevant.

## Responsive behavior
- [ ] Reviewed at the project's viewport set (375/1440 minimum; fuller
      set 320/375/430/768/1024/1440/1920 for layout-sensitive changes).
- [ ] No unexpected horizontal scroll (`scrollWidth` within viewport).

## RTL and mixed direction
- [ ] `dir="rtl"`/`lang="he"` correctness confirmed for the reviewed
      flow.
- [ ] Mixed Hebrew/English, numbers, identifiers, and punctuation
      render correctly.
- [ ] Icon direction and alignment correct for RTL.
- [ ] Logical vs. visual order correct.

## Content hierarchy
- [ ] Product-family suggestion, Information Needed, regulatory
      direction, professional routing, document readiness, limitation,
      and next action appear in a sensible, non-misleading order.

## Progressive disclosure
- [ ] Initial content stays focused.
- [ ] "Show all" remains available and is not hidden or removed.
- [ ] Generic input does not expose the full option set immediately.
- [ ] Collapsed content remains keyboard accessible.

## Empty and error states
- [ ] No input, generic input, no-confident-match, missing information,
      conflicting information, unavailable service, validation error,
      and unexpected failure states are distinguished, not conflated.
- [ ] No invented behavior for an undefined state.

## Keyboard
- [ ] Full flow reachable by keyboard alone.
- [ ] No keyboard trap.
- [ ] Activation works on every interactive control.

## Focus
- [ ] Visible focus indicator present.
- [ ] Focus placement correct after navigation, validation error,
      "Show all" expansion, and Back.
- [ ] No unexpected focus loss.

## ARIA
- [ ] Accessible names present and correct.
- [ ] `aria-expanded`/`hidden` correct for collapsed/expanded state.
- [ ] No duplicate `id` attributes.
- [ ] Live-region/status messaging present where a dynamic update
      occurs.

## Semantic HTML
- [ ] Buttons and links are not swapped or confused.
- [ ] Headings and landmarks used correctly.
- [ ] Native form controls used, not `div`s standing in for them.

## Forms
- [ ] No duplicate question for already-known information.
- [ ] No contradictory or stale state after a transition.

## State transitions
- [ ] Back behavior reviewed and cited to the actual code path.
- [ ] Reset behavior reviewed and cited to the actual code path.
- [ ] Re-entry of a prior answer reviewed (note: the current
      architecture does not have a separately named "Edit Answers"
      feature distinct from Back — re-verify at review time).
- [ ] Result recalculates correctly after a state change.

## Back/Reset/Edit/New Assessment
- [ ] Confirmed against the actual current functions found during
      architecture discovery, not assumed from a prior review.

## Show all
- [ ] Remains available in every affected state, including generic
      and ambiguous input.

## No auto-selection
- [ ] No proposed or observed behavior automatically selects a product
      family on the user's behalf.

## CTA
- [ ] Action and destination are clear.
- [ ] No duplicate competing primary CTAs.
- [ ] Disabled-state explanation present where applicable.

## External navigation
- [ ] Destination is disclosed before navigation.
- [ ] User control preserved (no forced/automatic navigation).

## Limitations and disclaimers
- [ ] Visible at the decision point.
- [ ] Understandable, not legalistic filler.
- [ ] Never implies a guaranteed classification, approval, or release.

## Overflow and text enlargement
- [ ] Long Hebrew/English text, mixed-direction strings, and long
      identifiers do not clip or break layout.
- [ ] Zoom/text-enlargement resilience reviewed.

## Microcopy
- [ ] Operational, concise, neutral, non-binding, consistent.
- [ ] No unnecessary legalistic wording.
- [ ] Recommended wording changes are not presented as new policy.

## Privacy
- [ ] Product/shipment text checked against URL, storage, cookies,
      network requests, analytics, and logs — or explicitly marked as
      missing evidence.
- [ ] Presentation-level privacy concerns separated from technical
      implementation concerns.

## Cross-Skill handoffs
- [ ] Regulatory/professional-routing/document-state findings handed
      off to `freightime-product-rule-authoring`.
- [ ] Family-matching-logic findings handed off to
      `freightime-family-suggestion-quality`.
- [ ] Validation-command selection left to
      `freightime-regression-validation`.
- [ ] Git/release actions left to `freightime-safe-git-workflow`.

## Implementation boundary
- [ ] The plan identifies layer/files/criteria only — it does not
      modify a file or authorize implementation, Push, PR, Merge, or
      Deployment.

## Validation sufficiency
- [ ] Suggested validation level is named only, not selected as a
      command.

## Reporting completeness
- [ ] Every finding is classified BLOCKING/NON-BLOCKING/OBSERVATION
      with exact location, evidence, impact, reproducibility, exact
      SHA, and minimum correction.
- [ ] No example is presented as the complete UX specification.
