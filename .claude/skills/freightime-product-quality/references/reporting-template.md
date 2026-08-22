# Reporting Template

Every invocation of this skill ends with a report. Use plain confirmation
lines ("X changed: no" / "X changed: yes — <what>") so a reader can scan
for anything unexpected, matching the style used throughout this
project's PR reports.

## AUDIT_ONLY report shape

- **Mode:** AUDIT_ONLY
- **Scope reviewed:** what pages/flows/viewports were actually examined.
- **Findings:** numbered list; for each — what's wrong, why (functional
  motion job missing / accessibility gap / RTL issue / responsive issue /
  privacy concern), and a suggested fix that stays inside the safety
  gates in `protected-behavior.md`.
- **Out-of-scope items noticed:** anything that would require touching
  protected behavior — named but explicitly not actioned.
- **Code changed:** no
- **Tests run:** none (or state what was run for verification only)

## IMPLEMENT_AUTHORIZED report shape

- **Mode:** IMPLEMENT_AUTHORIZED
- **Approved findings implemented:** the exact list the user approved —
  nothing beyond it.
- **Branch:** name of the branch created.
- **Matrix changed:** no
- **Regulatory content changed:** no
- **Professional outcomes changed:** no
- **Question logic changed:** no
- **Quantity behavior changed:** no
- **Hero changed:** no
- **Calculators changed:** no
- **Backend changed:** no
- **Runtime dependencies added:** no
- **Data transmission/storage/tracking/analytics/external-AI added:** no
- **Motion safeguards:** confirm functional-job justification, reduced-motion
  handling, and no banned pattern for every animation touched.
- **Accessibility/RTL/responsive checks:** which items from
  `accessibility-checklist.md` were verified.
- **Playwright browser acceptance:** viewports, scenarios, and checks
  actually run per `browser-acceptance.md` — never claim more than ran.
- **Frontend tests:** `node --test` result (e.g. "931/931" — use the
  actual observed count, never assume a prior session's number still
  holds without re-running).
- **Backend tests:** confirmation the backend repo is unchanged and its
  own test count is unaffected (re-verify, don't assume).
- **CI:** status once the PR is opened.
- **Pull Request:** link, left open.
- **PR merged:** no — requires separate, explicit authorization.
- **Production deployment performed:** no.
- **Exact product-owner review action required:** what the product owner
  still needs to review/approve before merge.

## Field-name discipline

If the invoking task specifies exact field labels to return (as some
tasks do), use those exact labels verbatim instead of the shape above —
this template exists to make sure nothing required gets omitted, not to
override an explicit reporting format the user already gave.
