# Validation Matrix — FreighTime Regression Validation

Quick lookup only. Full rules and rationale live in `SKILL.md`.

## A. Documentation or governance only
- Level: 0
- Targeted checks: changed-file scope, `git diff --check`, working tree
- Browser: not required
- Full suite: not required
- Backend: not touched (no check needed)
- CI: standard check on the PR (no special requirement)
- Pages: not applicable
- Escalate to: Level 1+ if runtime/workflow files also changed

## B. Presentation-only CSS or static markup
- Level: 1
- Targeted checks: focused visual/computed-style check, `git diff --check`
- Browser: bounded, only if visual behavior matters (375px + 1440px)
- Full suite: not required
- Backend: read-only confirmation only
- CI: required before publish
- Pages: after merge only, if production content changed
- Escalate to: Level 2 if responsive layout, focus visibility,
  hidden-state behavior, interactive markup, or accessibility
  semantics change

## C. Interactive UI or state
- Level: 2
- Targeted checks: direct unit tests + lifecycle checks for the
  affected transition
- Browser: required, real visible controls, smallest representative
  scenario set
- Full suite: once, before publish, if production logic changed
  materially
- Backend: read-only confirmation only
- CI: required, green on exact head before merge
- Pages: after merge only, if production content changed
- Escalate to: Level 3 before merge if the change is significant

## D. Shared JavaScript helper (normalization/matching/dedup/routing/state commit/result construction)
- Level: 2
- Targeted checks: tests across every direct consumer
- Browser: required if user-visible behavior changed
- Full suite: once, before publish (shared helper = material change)
- Backend: read-only confirmation only
- CI: required, green on exact head before merge
- Pages: after merge only, if production content changed
- Escalate to: Level 3 before merge

## E. Product or professional routing (family resolution, result routing, professional selection, CTA target, document suggestions)
- Level: 2 during development
- Targeted checks: positive, negative, collision, cross-family tests
- Browser: required
- Full suite: once, before publish
- Backend: read-only confirmation only
- CI: required, green on exact head before merge
- Pages: after merge only, if production content changed
- Escalate to: **Level 3 required before merge** (not optional)

## F. Privacy or data-flow change (URL, storage, network, analytics, free-text handling)
- Level: 2
- Targeted checks: explicit privacy validation (URL/storage/network
  inspection) — see SKILL.md Privacy validation scope
- Browser: required to actually observe network/storage/URL behavior
- Full suite: once, before publish, if production logic changed
- Backend: read-only confirmation only, unless the data flow crosses
  into the backend
- CI: required, green on exact head before merge
- Pages: after merge only, if production content changed
- Escalate to: Level 3 before merge if the change is significant

## G. Workflow, CI, deployment, or dependency change
- Level: 2 or 3, depending on impact
- Targeted checks: verify the workflow/config change behaves as
  intended; never install/update a dependency merely to validate
- Browser: only if it affects rendered behavior
- Full suite: required before publish
- Backend: not touched unless the change is backend-specific
- CI: required, and is itself often the subject of the change
- Pages: after merge only, if the change affects deployment
- Escalate to: Level 3 for anything touching the merge/deploy path
  itself

## H. Backend change
- Use the backend repository's own validation guidance.
- Do not assume frontend validation is sufficient.
- Do not make backend changes as part of frontend validation.
- Frontend-side check: confirm backend HEAD/tree remain as expected
  after the backend task, read-only, from the frontend task's
  perspective.
