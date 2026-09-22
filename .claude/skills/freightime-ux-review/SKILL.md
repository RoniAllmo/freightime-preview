---
name: freightime-ux-review
description: Perform structured, evidence-based, read-only UX review and bounded implementation planning for FreighTime's questionnaire and result screens — desktop and mobile, RTL/Hebrew and LTR/English, progressive disclosure, focus/keyboard/ARIA, form-state transitions (Back/Reset), result hierarchy, CTA clarity, disclaimer visibility, overflow/zoom resilience, microcopy, and privacy presentation. Use when asked to review, assess, or investigate FreighTime's UX quality on an exact SHA, across viewports, or across Hebrew/English. Never implements a change itself, never performs a Git operation, never selects validation commands, and never decides a regulatory, professional-routing, or document-state outcome — it hands those off.
---

# FreighTime UX Review

## Purpose

Produce a structured, evidence-based UX review and a bounded
implementation plan for FreighTime's questionnaire and result-screen
behavior — across desktop and mobile, Hebrew RTL and English LTR. This
skill gathers evidence, classifies findings, and prepares a plan; it
never edits CSS/HTML/JS, never implements a fix, and never releases
anything itself.

**Review-first, read-only by default.** A finding is only as good as
its evidence — every finding must be tied to an exact SHA, an exact
environment, an exact viewport, and an exact language, per the
Exact-SHA rule below.

## Non-goals and authority boundaries

This skill does **not** authorize:
- product, CSS, HTML, or JavaScript changes;
- product-family matrix changes;
- alias or normalization changes;
- regulatory decisions;
- professional-routing decisions;
- document-state decisions;
- Push, PR creation, Merge, Deployment, branch deletion, or GitHub
  settings changes.

**A review or an implementation plan produced by this skill is never
permission to change code, push, merge, or deploy.** Implementation,
when separately authorized, is carried out through the normal
authorized workflow (which may include `freightime-product-quality`'s
`IMPLEMENT_AUTHORIZED` mode) — never by this skill itself.

## Relationship to `freightime-product-quality`

`freightime-product-quality` is FreighTime's single safe entry point
for auditing **and** (only when explicitly authorized) implementing
UX/motion/accessibility/RTL/responsive/privacy work, using its own
Playwright browser-acceptance procedure. This skill does not replace
or duplicate it.

This skill is the structured, evidence-disciplined **review and
planning** layer: exact-SHA evidence hierarchy, Known/Missing/
Conflicting separation, per-finding classification, and a bounded
implementation plan — modeled on the same rigor
`freightime-product-rule-authoring` applies to product rules, but
applied to UX findings instead. When a review under this skill
justifies a browser check, it reuses `freightime-product-quality`'s
own `references/browser-acceptance.md` (viewports, console/privacy
capture rules) and `references/accessibility-checklist.md` rather than
inventing a second procedure. When implementation is later authorized,
that implementation is carried out under `freightime-product-quality`
(or the applicable dev workflow), not by this skill.

## Ownership boundaries

- `freightime-safe-git-workflow` owns branch/commit/push/PR/merge/CI/
  Pages/cleanup — this skill never performs a Git operation.
- `freightime-regression-validation` owns validation-level and test-
  command selection, and evidence-reuse rules — this skill only names
  a suggested validation level; it does not select commands.
- `freightime-product-quality` owns general UX/accessibility/privacy
  audit-and-implement work and the Playwright browser-acceptance
  mechanics — this skill owns structured review discipline and
  implementation planning for UX findings, and reuses that skill's
  execution references rather than duplicating them.
- `freightime-product-rule-authoring` owns any new or changed
  regulatory rule, professional routing, or document-state behavior —
  this skill must hand off to it rather than deciding a professional
  or regulatory consequence itself, even when a UX finding surfaces
  one.
- `freightime-family-suggestion-quality` owns free-text-to-family
  matching-logic quality — this skill reviews how a family suggestion
  is *presented*, not how it is *matched*; a matching-logic question is
  handed off.

This skill contains no cached architecture facts of its own beyond
what it discovers at use time. Re-confirm every file, function, and
behavior against the live repository before citing it as evidence —
do not use a prior review's findings as current fact.

## Required inputs

Gather only what is not already discoverable from the repository or
existing evidence:

- target flow, route, or screen;
- intended user task;
- language(s) to review;
- viewport(s) to review;
- exact SHA;
- screenshots or browser evidence, if any already exist;
- the relevant product requirement, if one is known;
- a known limitation or prior finding, if any;
- expected vs. actual behavior, if a defect is already suspected.

Do not ask for a SHA, file path, or behavior that can be read directly
from the repository — read it instead.

## Known / Missing / Conflicting workflow

Before producing findings or a plan, separate:

**A. Known** — facts explicitly given in the request, or read directly
from the repository/browser on the exact SHA (cite file, line, or
screenshot).

**B. Missing** — evidence needed to reach a conclusion that does not
yet exist (e.g. no browser evidence for a claimed interaction, no
viewport specified).

**C. Conflicting** — a claimed behavior that conflicts with directly
observed repository or browser evidence, or two pieces of evidence
that disagree.

Never treat an assumption, a reviewer preference, or a single
unverified screenshot as a known fact.

## Evidence hierarchy

Prefer, in this order:

1. An approved Product Owner requirement.
2. Current repository behavior directly read on the exact SHA.
3. Browser evidence gathered on the exact SHA.
4. Existing automated test evidence.
5. Current implementation structure (inferred from code, not run).
6. A reviewer recommendation — explicitly labeled as a recommendation,
   never as an approved requirement.

A reviewer preference never outranks directly observed evidence, and
must never be reported as an approved requirement.

## Exact-SHA rule

Every product or browser finding must state: exact SHA; environment
(local checkout or public); viewport; language; the exact path or
flow exercised; and explicitly what was and was not tested. A finding
with no exact SHA is not a finding — it is, at most, a flagged gap
requiring evidence.

## Review modes (select only what the task justifies)

- **Static review** — direct source inspection, no browser.
- **Targeted browser review** — a specific flow/viewport/language, via
  `freightime-product-quality`'s browser-acceptance procedure.
- **Screenshot review** — evidence already captured; must state
  viewport, language, and local-vs-public origin, or be treated as
  Missing evidence.
- **Responsive review** — the same flow across the project's viewport
  set (see `freightime-product-quality/references/browser-acceptance.md`).
- **Keyboard review** — tab order, activation, focus, no traps.
- **Accessibility review** — structure/semantics/ARIA, explicitly
  scoped to what was actually reviewed (see §"ARIA and semantic
  review").
- **Privacy presentation review** — what appears in the UI vs. what
  requires a technical (URL/storage/network) check.
- **Implementation-plan review** — producing the bounded plan itself,
  once findings exist.

Do not select a mode the task does not justify; do not run a broad
mode "to be thorough" when a narrow one already answers the question.

## Desktop and mobile review

Review: responsive behavior at the project's viewport set; content
priority at each size; CTA visibility without excess scrolling; touch-
target practicality on mobile; viewport overflow; sticky/fixed-element
behavior and whether it obscures content or controls; orientation
where relevant; and parity of every critical action (submit, expand,
back, reset) between desktop and mobile — a critical action must not
silently disappear or become unreachable on one form factor.

## RTL and bilingual review

Review: directionality (the page is Hebrew RTL by default —
`<html lang="he" dir="rtl">`); correct handling of mixed Hebrew/English
content; numbers; identifiers and tracking numbers; code-like values;
punctuation; icon direction; alignment; logical vs. visual order; and
truncation/wrapping behavior for long bidirectional strings.

## Progressive disclosure

Confirm: initial content stays focused and relevant; advanced/full
options remain discoverable; "Show all" (the project's expand control)
remains available; generic input does not expose the full option set
immediately; collapsed content is never permanently inaccessible; and
collapsed/expandable content remains keyboard accessible (correct
`aria-expanded`/`hidden` state, not only mouse-operable).

## Empty, insufficient, unavailable, and error states

Distinguish, and never invent behavior for a state that is not
actually defined in the repository: no input; generic input; no
confident family suggestion; missing information; conflicting
information; an unavailable external service; a validation error; and
an unexpected application failure. Report which of these states was
actually exercised, and which remain unverified.

## Focus and keyboard behavior

Review: logical tab order; visible focus indicator; focus placement
after navigation; focus after a validation error; focus after
expanding "Show all"; focus after returning to a prior step (Back);
keyboard activation of every interactive control; absence of keyboard
traps; absence of unexpected focus loss; and whether a dynamic update
is announced where relevant (e.g. an `aria-live` region). Cite the
actual focus-management code path found during architecture discovery
rather than assuming one exists.

## ARIA and semantic review

Review: accessible names; labels and descriptions; heading structure;
landmarks; correct button-vs-link semantics; `aria-expanded`/`hidden`
correctness for collapsed/expanded state; selected/invalid state;
live-region and status messaging; duplicate `id` attributes; and
whether hidden content is genuinely non-focusable. **This skill must
never claim standards compliance (e.g. WCAG conformance) from a static
review alone** — state explicitly that only what was directly
inspected or browser-tested was verified, consistent with
`freightime-product-quality/references/accessibility-checklist.md`'s
own scope discipline.

## Form and state-management review

Review: duplicate questions; a question re-asked for already-known
information; contradictory state; stale state; Back behavior; Reset
behavior; re-entry of a prior answer (the current architecture does
not have a separately named "Edit Answers" feature distinct from Back
— re-verify this at review time rather than assuming one exists);
language switching if present; result recalculation after a state
change; and any accidental data persistence across a reset.

## Result hierarchy

Review the separation and ordering of: product-family suggestions;
Information Needed; regulatory direction; professional routing;
document readiness; limitations; the next action; and external links.
**UX presentation must never visually transform advisory, non-binding
guidance into what reads as a binding decision** — this is a
presentation concern this skill can flag, but resolving an actual
regulatory-wording question is handed off to
`freightime-product-rule-authoring`.

## CTA quality

Review: clarity of the action; clarity of the destination; whether a
disabled state is explained; absence of duplicate competing primary
CTAs; disclosure before external navigation; and preservation of user
control (no forced or automatic navigation).

## Limitation and disclaimer quality

Confirm limitations: are visible at the point a decision is made, not
buried; are understandable; never falsely guarantee classification,
approval, legality, or release; do not overwhelm the primary task; and
are not hidden only in a remote or otherwise inaccessible location.

## Overflow and resilience

Review: long Hebrew text; long English text; mixed-direction strings;
long product descriptions; long identifiers/tracking numbers; browser
zoom; text enlargement; narrow screens; wrapping; clipping; horizontal
scrolling (`document.documentElement.scrollWidth` should not exceed
the viewport, per `freightime-product-quality`'s own browser-acceptance
check); and fixed-height containers that could clip content.

## Microcopy

Review whether wording is operational, concise, neutral, non-binding,
consistent, action-oriented, understandable to import users, free of
unnecessary legalistic wording, and clear about uncertainty. This
skill may recommend wording but **must never create new professional
policy** — a wording change that could alter regulatory or
professional meaning is handed off to
`freightime-product-rule-authoring`.

## Privacy by design

Review whether product descriptions or shipment information could
appear in: URLs; `localStorage`/`sessionStorage`; cookies; network
requests; analytics; logs; or external-navigation parameters. Cite the
actual current evidence (e.g. an in-code comment or a direct browser
network/storage capture) rather than assuming privacy behavior.
Distinguish clearly between: privacy evidence directly observed;
missing evidence; a presentation-level concern (e.g. unclear wording
about what is/isn't transmitted); and a technical implementation
concern requiring `freightime-product-quality`'s own privacy-validation
procedure.

## Finding classification

Every finding must be classified **BLOCKING**, **NON-BLOCKING**, or
**OBSERVATION**, and must include: exact location; evidence; affected
user task; impact; reproducibility; exact SHA; minimum recommended
correction; and whether implementation is authorized (it is not,
unless a separate, explicit authorization exists).

## Defect classification

Distinguish: a product defect; a UX requirement gap; a test defect; a
harness defect; an environment limitation; an evidence gap; or a
reviewer preference. Never report a reviewer preference as a defect.

## Handoffs

1. A regulatory rule, professional routing, document state, or a new
   follow-up question → `freightime-product-rule-authoring`.
2. Free-text family-matching logic (as opposed to how a suggestion is
   presented) → `freightime-family-suggestion-quality`.
3. Test selection and evidence reuse → `freightime-regression-validation`.
4. Git, Push, PR, Merge, Deployment, or branch handling →
   `freightime-safe-git-workflow`.
5. General product-quality, privacy-implementation, or browser-
   acceptance execution outside pure UX review → `freightime-product-quality`.

## Stop conditions

Stop and report instead of continuing when: the exact SHA is unknown;
the target flow is ambiguous; evidence conflicts and cannot be
resolved from the repository; a required professional decision is
missing; the requested action would exceed this skill's authorization;
the task attempts to combine review with unapproved implementation;
browser evidence is claimed but not actually available; a reviewer
preference is being treated as an approved requirement; scope expands
beyond the requested flow; or a proposed change could alter regulatory
or professional meaning.

## Required output

Produce a structured report containing: scope; exact SHA; environments
and viewports; languages; flows reviewed; evidence used; evidence not
available; findings; accessibility findings; RTL findings; mobile
findings; privacy findings; implementation plan; validation
recommendation (name only); handoffs; blockers; and actions not
authorized.

## Implementation-plan boundary

The plan may identify: the affected layer; likely files; intended
behavior; acceptance criteria; targeted validation (name only); and
regression risks. **The plan must not**: modify a file; prescribe
unverified professional behavior; authorize implementation; authorize
release; or combine unrelated fixes into a single task.

## Example boundary

Examples used anywhere in this skill (including its own illustrative
cases and its evaluation scenarios) are illustrative and
non-exhaustive. They are not the complete FreighTime UX specification.
One screenshot or one viewport is not proof of cross-platform quality.
One observed defect does not authorize a broad redesign. One microcopy
example does not create product policy.

## References

- `references/ux-review-template.md` — reusable structured report
  template aligned field-for-field with the required output above.
- `references/ux-and-accessibility-checklist.md` — quick-reference
  review checklist covering desktop, mobile, RTL, accessibility,
  state management, and privacy presentation.
- `evaluations/scenarios.md` — the 48 required scenario evaluations
  used to validate this skill's rules before first use.
